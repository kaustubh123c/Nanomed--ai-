"""
Chatbot Actions
---------------
This is the layer that lets the chatbot actually *do* things in NanoMed AI
instead of only talking about them — "create a material", "log an
experiment", "recommend a material for 90% absorption", etc.

Design rules:
- Every action re-uses the exact same repository / physics / inference code
  the REST API routers use, so a chatbot-created material/experiment is
  indistinguishable from one created through the UI.
- The LLM (or the fallback parser) is only ever allowed to propose a
  *structured* function call with a fixed set of named arguments. It never
  writes directly to the database — every argument is validated with the
  same Pydantic models the routers use before anything is persisted. This
  keeps the agent from hallucinating fields or bypassing validation.
- Every action returns an ActionResult(success, message, data) so the
  orchestrator can turn it into a friendly chat reply without duplicating
  business logic.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

from app.ai.inference import generate_explanation, predict_absorption, predict_counts, predict_thickness, recommend_materials
from app.ai.materials_seed import DEFAULT_MATERIALS, DETECTORS, GAMMA_SOURCES
from app.db.database import repository
from app.models.experiment import ExperimentCreate
from app.models.material import MaterialCreate
from app.models.user import UserOut
from app.physics.engine import run_beer_lambert
from pydantic import ValidationError


@dataclass
class ActionResult:
    success: bool
    message: str
    data: Optional[Any] = field(default=None)


# ---------------------------------------------------------------------------
# Lookup helpers
# ---------------------------------------------------------------------------
async def _all_materials() -> list[dict]:
    """Seed catalogue + this account's custom materials, normalized to the
    same shape (with an `id`)."""
    seeded = [{"id": f"seed-{i}", **m} for i, m in enumerate(DEFAULT_MATERIALS)]
    custom = await repository.find("materials")
    custom_norm = [{"id": d["_id"], **{k: v for k, v in d.items() if k != "_id"}} for d in custom]
    return seeded + custom_norm


async def find_material(name_or_id: str) -> Optional[dict]:
    """Fuzzy-resolve a material by id, exact name, formula, or partial name
    match (case-insensitive) — so "gold" or "AuNP" both find "Gold
    Nanoparticles (AuNP)"."""
    if not name_or_id:
        return None
    materials = await _all_materials()

    for m in materials:
        if m["id"] == name_or_id:
            return m

    needle = name_or_id.strip().lower()
    for m in materials:
        if m["name"].lower() == needle or m["formula"].lower() == needle:
            return m
    for m in materials:
        if needle in m["name"].lower() or needle in m["formula"].lower():
            return m
    return None


def find_detector(name: str) -> Optional[str]:
    if not name:
        return None
    needle = name.strip().lower()
    for d in DETECTORS:
        label = d if isinstance(d, str) else d.get("name", "")
        if needle == label.lower() or needle in label.lower():
            return label
    return None


def find_gamma_source(name: str) -> Optional[str]:
    if not name:
        return None
    needle = name.strip().lower()
    for s in GAMMA_SOURCES:
        label = s if isinstance(s, str) else s.get("name", "")
        if needle == label.lower() or needle in label.lower():
            return label
    return None


# ---------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------
REQUIRED_MATERIAL_FIELDS = ["name", "formula", "density", "atomic_number", "atomic_mass"]


async def action_create_material(user: UserOut, args: dict) -> ActionResult:
    try:
        payload = MaterialCreate(
            name=args.get("name"),
            formula=args.get("formula"),
            density=args.get("density"),
            atomic_number=args.get("atomic_number"),
            atomic_mass=args.get("atomic_mass"),
            particle_size_nm=args.get("particle_size_nm"),
            crystal_structure=args.get("crystal_structure"),
            manufacturer=args.get("manufacturer"),
            research_notes=args.get("research_notes"),
        )
    except ValidationError as e:
        missing = [err["loc"][0] for err in e.errors() if err["type"] == "missing"]
        if missing:
            return ActionResult(
                False,
                "I can create that material, but I still need: " + ", ".join(str(m) for m in missing) +
                ". For example: density in g/cm³, atomic number (Z), and atomic mass (g/mol).",
            )
        return ActionResult(False, f"That material data isn't valid: {e.errors()[0]['msg']}")

    doc = {**payload.model_dump(), "owner_id": user.id}
    created = await repository.insert_one("materials", doc)
    return ActionResult(
        True,
        f"✅ Created material **{created['name']}** ({created['formula']}) — "
        f"density {created['density']} g/cm³, Z={created['atomic_number']}, "
        f"molar mass {created['atomic_mass']} g/mol.",
        {"id": created["_id"], **payload.model_dump()},
    )


async def action_list_materials(user: UserOut, args: dict) -> ActionResult:
    materials = await _all_materials()
    lines = [f"- {m['name']} ({m['formula']}), ρ={m['density']} g/cm³, Z={m['atomic_number']}" for m in materials[:20]]
    more = f"\n…and {len(materials) - 20} more." if len(materials) > 20 else ""
    return ActionResult(True, "Here are the materials in the catalogue:\n" + "\n".join(lines) + more, materials)


async def action_delete_material(user: UserOut, args: dict) -> ActionResult:
    name = args.get("name") or args.get("material") or args.get("material_id")
    material = await find_material(name) if name else None
    if not material:
        return ActionResult(False, f"I couldn't find a material matching \"{name}\".")
    if material["id"].startswith("seed-"):
        return ActionResult(False, f"\"{material['name']}\" is a built-in reference material and can't be deleted.")
    deleted = await repository.delete_one("materials", {"_id": material["id"]})
    if not deleted:
        return ActionResult(False, f"I couldn't delete \"{material['name']}\" — it may already be gone.")
    return ActionResult(True, f"🗑️ Deleted material **{material['name']}**.")


# ---------------------------------------------------------------------------
# Experiments
# ---------------------------------------------------------------------------
async def action_create_experiment(user: UserOut, args: dict) -> ActionResult:
    material_ref = args.get("material") or args.get("material_id") or args.get("material_name")
    material = await find_material(material_ref) if material_ref else None
    if not material:
        return ActionResult(
            False,
            f"I need a valid material to log this experiment against"
            + (f" — I couldn't find one matching \"{material_ref}\"." if material_ref else ", e.g. \"Gold Nanoparticles\"."),
        )

    detector = find_detector(args.get("detector", "")) or args.get("detector")
    gamma_source = find_gamma_source(args.get("gamma_source", "")) or args.get("gamma_source")

    try:
        payload = ExperimentCreate(
            experiment_name=args.get("experiment_name") or f"{material['name']} experiment",
            material_id=material["id"],
            detector=detector,
            gamma_source=gamma_source,
            energy_kev=args.get("energy_kev"),
            initial_counts=args.get("initial_counts", 10000),
            final_counts=args.get("final_counts"),
            thickness_cm=args.get("thickness_cm"),
            temperature_c=args.get("temperature_c"),
            pressure_kpa=args.get("pressure_kpa"),
            notes=args.get("notes"),
        )
    except ValidationError as e:
        missing = [err["loc"][0] for err in e.errors() if err["type"] == "missing"]
        if missing:
            return ActionResult(
                False,
                "I can log that experiment, but I still need: " + ", ".join(str(m) for m in missing) +
                " (detector, gamma source, energy in keV, and thickness in cm are all required).",
            )
        return ActionResult(False, f"That experiment data isn't valid: {e.errors()[0]['msg']}")

    from app.physics.engine import get_detector_efficiency

    physics = run_beer_lambert(
        atomic_number=material["atomic_number"],
        atomic_mass=material["atomic_mass"],
        density_g_cm3=material["density"],
        energy_kev=payload.energy_kev,
        thickness_cm=payload.thickness_cm,
        initial_counts=payload.initial_counts,
        detector_efficiency=get_detector_efficiency(detector),
    )

    doc = {
        **payload.model_dump(),
        "owner_id": user.id,
        "material_name": material["name"],
        "final_counts": payload.final_counts or physics.final_counts,
        "absorption_percent": physics.absorption_percent,
        "linear_attenuation_coeff": physics.linear_attenuation_coefficient,
        "mass_attenuation_coeff": physics.mass_attenuation_coefficient,
        "atomic_number": material["atomic_number"],
        "atomic_mass": material["atomic_mass"],
        "density": material["density"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    created = await repository.insert_one("experiments", doc)
    return ActionResult(
        True,
        f"✅ Logged experiment **{created['experiment_name']}** using {material['name']} "
        f"({payload.thickness_cm} cm @ {payload.energy_kev} keV) — "
        f"predicted absorption {physics.absorption_percent:.2f}%.",
        {"id": created["_id"], **doc},
    )


async def action_list_experiments(user: UserOut, args: dict) -> ActionResult:
    docs = await repository.find("experiments")
    if not docs:
        return ActionResult(True, "You don't have any logged experiments yet.")
    lines = [
        f"- {d['experiment_name']} — {d.get('material_name', d.get('material_id'))}, "
        f"{d.get('thickness_cm')} cm @ {d.get('energy_kev')} keV, "
        f"absorption {d.get('absorption_percent', 0):.1f}%"
        for d in docs[-15:]
    ]
    return ActionResult(True, "Recent experiments:\n" + "\n".join(lines), docs)


# ---------------------------------------------------------------------------
# Simulation
# ---------------------------------------------------------------------------
async def action_run_simulation(user: Optional[UserOut], args: dict) -> ActionResult:
    material_ref = args.get("material") or args.get("material_id") or args.get("material_name")
    material = await find_material(material_ref) if material_ref else None
    if not material:
        return ActionResult(False, f'I could not find a material matching "{material_ref}".')

    detector = find_detector(args.get("detector", "")) or args.get("detector")
    gamma_source = find_gamma_source(args.get("gamma_source", "")) or args.get("gamma_source")
    energy = args.get("energy_kev")
    thickness = args.get("thickness_cm")
    if not detector or not gamma_source or energy is None or thickness is None:
        missing = []
        if not detector: missing.append("detector")
        if not gamma_source: missing.append("gamma source")
        if energy is None: missing.append("gamma energy in keV")
        if thickness is None: missing.append("thickness in cm")
        return ActionResult(False, "To run the simulation I still need: " + ", ".join(missing) + ".")

    initial_counts = float(args.get("initial_counts", 10000))
    target = float(args.get("target_absorption_percent", 70))
    physics = run_beer_lambert(
        atomic_number=material["atomic_number"],
        atomic_mass=material["atomic_mass"],
        density_g_cm3=material["density"],
        energy_kev=float(energy),
        thickness_cm=float(thickness),
        initial_counts=initial_counts,
    )
    detector_efficiency = 0.75
    for d in DETECTORS:
        label = d if isinstance(d, str) else d.get("name", "")
        if label == detector:
            from app.physics.engine import get_detector_efficiency
            detector_efficiency = get_detector_efficiency(detector)
            break

    final_counts = initial_counts * physics.transmission * detector_efficiency
    near_target = abs(physics.absorption_percent - target) < 5
    message = (
        f"🧪 Simulation complete for **{material['name']}**.\n\n"
        f"• Energy: {float(energy):g} keV\n"
        f"• Thickness: {float(thickness):g} cm\n"
        f"• Detector: {detector}\n"
        f"• Absorption: **{physics.absorption_percent:.2f}%**\n"
        f"• Transmission: **{physics.transmission * 100:.2f}%**\n"
        f"• Final detector counts: **{final_counts:.1f}**\n"
        f"• Linear attenuation coefficient: **{physics.linear_attenuation_coefficient:.5f} cm⁻¹**\n"
        f"• HVL: **{physics.half_value_layer_cm:.5f} cm**\n\n"
        + (f"🎯 This is close to your {target:g}% target." if near_target else f"Your target was {target:g}% absorption.")
    )
    history_doc = {
        "owner_id": user.id if user else None,
        "material_id": material["id"],
        "material_name": material["name"],
        "detector": detector,
        "gamma_source": gamma_source,
        "energy_kev": float(energy),
        "thickness_cm": float(thickness),
        "absorption_percent": physics.absorption_percent,
        "final_counts": final_counts,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if user:
        await repository.insert_one("simulation_history", history_doc)
    return ActionResult(True, message, {**history_doc, "transmission_percent": physics.transmission * 100})


# ---------------------------------------------------------------------------
# AI Planner (Material recommendation)
# ---------------------------------------------------------------------------
async def action_recommend_material(user: UserOut, args: dict) -> ActionResult:
    target = args.get("target_absorption_percent")
    energy = args.get("energy_kev")
    detector = find_detector(args.get("detector", "")) or args.get("detector") or (
        DETECTORS[0] if isinstance(DETECTORS[0], str) else DETECTORS[0].get("name")
    )

    if target is None or energy is None:
        missing = []
        if target is None:
            missing.append("target absorption % (e.g. \"90% absorption\")")
        if energy is None:
            missing.append("gamma energy in keV (e.g. \"at 140 keV\")")
        return ActionResult(False, "To recommend a material I need: " + " and ".join(missing) + ".")

    ranked = recommend_materials(target_absorption_percent=target, energy_kev=energy, detector=detector, top_n=5)
    top = ranked[0]
    top_material = next((m for m in DEFAULT_MATERIALS if m["name"] == top["material_name"]), DEFAULT_MATERIALS[0])
    explanation = generate_explanation(
        material_name=top_material["name"],
        atomic_number=top_material["atomic_number"],
        density=top_material["density"],
        energy_kev=energy,
        thickness_cm=top["recommended_thickness_cm"],
        absorption_percent=target,
        comparison_material=ranked[1] if len(ranked) > 1 else None,
    )

    prediction_doc = {
        "owner_id": user.id,
        "type": "planner",
        "request": {"target_absorption_percent": target, "energy_kev": energy, "detector": detector},
        "response": {"recommended_material": top["material_name"], "alternatives": ranked},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await repository.insert_one("predictions", prediction_doc)

    alt_lines = "\n".join(
        f"  {i+1}. {r['material_name']} — {r['recommended_thickness_cm']} cm, score {r['score']}"
        for i, r in enumerate(ranked)
    )
    message = (
        f"🎯 For {target}% absorption at {energy} keV, I recommend **{top['material_name']}** "
        f"at {top['recommended_thickness_cm']} cm thickness.\n\n{explanation}\n\nTop candidates:\n{alt_lines}"
    )
    return ActionResult(True, message, {"recommended": top, "alternatives": ranked})


# ---------------------------------------------------------------------------
# Registry — used by both the Gemini function-calling agent and the
# no-API-key fallback parser, so the two stay in sync automatically.
# ---------------------------------------------------------------------------
ACTIONS = {
    "create_material": action_create_material,
    "list_materials": action_list_materials,
    "delete_material": action_delete_material,
    "create_experiment": action_create_experiment,
    "list_experiments": action_list_experiments,
    "recommend_material": action_recommend_material,
    "run_simulation": action_run_simulation,
}
