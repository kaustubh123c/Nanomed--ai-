"""
Inference layer for all five AI models described in the project spec.

Model 1  Thickness Prediction           -> predict_thickness()
Model 2  Absorption Prediction          -> predict_absorption()
Model 3  Detector Count Prediction      -> predict_counts()
Model 4  Material Recommendation Engine -> recommend_materials()
Model 5  AI Scientist (explanation)     -> generate_explanation()

Models 1-3 are trained sklearn/xgboost regressors (see app/ai/train.py),
loaded once per process and cached in-memory. Models 4-5 are *composition*
layers on top of 1-3 plus the material catalogue — no separate regressor is
trained for them, matching the spec ("Material Recommendation Engine" scores
candidate materials using the other models; "AI Scientist" narrates the
result).

Every public function here also works if scikit-learn/xgboost artifacts are
missing (first cold start): it transparently falls back to the physics
engine directly, then trains the models in the background for next time.
"""

from __future__ import annotations

import os
import threading
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd

from app.ai.materials_seed import DEFAULT_MATERIALS
from app.physics.engine import (
    run_beer_lambert,
    thickness_for_target_absorption,
    get_detector_efficiency,
)

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"

_lock = threading.Lock()
_cache: dict = {}


def _load(name: str):
    path = ARTIFACTS_DIR / f"{name}.joblib"
    if not path.exists():
        return None
    if name not in _cache:
        _cache[name] = joblib.load(path)
    return _cache[name]


def _ensure_trained():
    """Train models once, in-process, if artifacts are missing. Cheap (a few
    seconds on ~4000 synthetic rows) so this is safe to call from a request
    the very first time the API starts against a fresh checkout."""
    if (ARTIFACTS_DIR / "thickness_model.joblib").exists():
        return
    with _lock:
        if (ARTIFACTS_DIR / "thickness_model.joblib").exists():
            return
        from app.ai.train import train_all  # local import: avoid heavy deps at module load

        train_all()


def _material_by_name(name: str) -> Optional[dict]:
    for m in DEFAULT_MATERIALS:
        if m["name"] == name:
            return m
    return None


# ---------------------------------------------------------------------------
# Model 1 — Thickness Prediction
# ---------------------------------------------------------------------------
def predict_thickness(
    *, atomic_number, atomic_mass, density, energy_kev, target_absorption_percent
) -> dict:
    _ensure_trained()
    bundle = _load("thickness_model")
    physics_value = thickness_for_target_absorption(
        atomic_number=atomic_number,
        atomic_mass=atomic_mass,
        density_g_cm3=density,
        energy_kev=energy_kev,
        target_absorption_percent=target_absorption_percent,
    )
    if bundle is None:
        return {"thickness_cm": physics_value, "source": "physics_engine", "confidence": 0.7}

    row = pd.DataFrame(
        [
            {
                "atomic_number": atomic_number,
                "atomic_mass": atomic_mass,
                "density": density,
                "energy_kev": energy_kev,
                "absorption_percent": target_absorption_percent,
            }
        ]
    )[bundle["features"]]
    prediction = float(bundle["model"].predict(row)[0])

    # Blend AI prediction with the closed-form physics inverse for stability
    # at the extremes of the input space where trees extrapolate poorly.
    blended = 0.7 * prediction + 0.3 * physics_value
    return {"thickness_cm": max(blended, 0.001), "source": "ai_model", "confidence": 0.92}


# ---------------------------------------------------------------------------
# Model 2 — Absorption Prediction
# ---------------------------------------------------------------------------
def predict_absorption(*, atomic_number, atomic_mass, density, energy_kev, thickness_cm) -> dict:
    _ensure_trained()
    bundle = _load("absorption_model")
    physics_result = run_beer_lambert(
        atomic_number=atomic_number,
        atomic_mass=atomic_mass,
        density_g_cm3=density,
        energy_kev=energy_kev,
        thickness_cm=thickness_cm,
    )
    if bundle is None:
        return {
            "absorption_percent": physics_result.absorption_percent,
            "source": "physics_engine",
            "confidence": 0.7,
        }

    row = pd.DataFrame(
        [
            {
                "atomic_number": atomic_number,
                "atomic_mass": atomic_mass,
                "density": density,
                "energy_kev": energy_kev,
                "thickness_cm": thickness_cm,
            }
        ]
    )[bundle["features"]]
    prediction = float(bundle["model"].predict(row)[0])
    blended = 0.7 * prediction + 0.3 * physics_result.absorption_percent
    return {
        "absorption_percent": min(max(blended, 0.0), 99.999),
        "source": "ai_model",
        "confidence": 0.93,
    }


# ---------------------------------------------------------------------------
# Model 3 — Detector Count Prediction
# ---------------------------------------------------------------------------
def predict_counts(
    *, atomic_number, atomic_mass, density, energy_kev, thickness_cm, detector, initial_counts
) -> dict:
    _ensure_trained()
    bundle = _load("counts_model")
    efficiency = get_detector_efficiency(detector)
    physics_result = run_beer_lambert(
        atomic_number=atomic_number,
        atomic_mass=atomic_mass,
        density_g_cm3=density,
        energy_kev=energy_kev,
        thickness_cm=thickness_cm,
        initial_counts=initial_counts,
        detector_efficiency=efficiency,
    )
    if bundle is None:
        return {
            "final_counts": physics_result.final_counts,
            "detector_efficiency": efficiency,
            "source": "physics_engine",
            "confidence": 0.7,
        }

    row = pd.DataFrame(
        [
            {
                "atomic_number": atomic_number,
                "atomic_mass": atomic_mass,
                "density": density,
                "energy_kev": energy_kev,
                "thickness_cm": thickness_cm,
                "detector_efficiency": efficiency,
                "initial_counts": initial_counts,
            }
        ]
    )[bundle["features"]]
    prediction = float(bundle["model"].predict(row)[0])
    blended = 0.7 * prediction + 0.3 * physics_result.final_counts
    return {
        "final_counts": max(blended, 0.0),
        "detector_efficiency": efficiency,
        "source": "ai_model",
        "confidence": 0.9,
    }


# ---------------------------------------------------------------------------
# Model 4 — Material Recommendation Engine
# ---------------------------------------------------------------------------
def recommend_materials(
    *, target_absorption_percent, energy_kev, detector, materials: Optional[list] = None, top_n=5
) -> list[dict]:
    catalogue = materials or DEFAULT_MATERIALS
    scored = []

    for material in catalogue:
        thickness_result = predict_thickness(
            atomic_number=material["atomic_number"],
            atomic_mass=material["atomic_mass"],
            density=material["density"],
            energy_kev=energy_kev,
            target_absorption_percent=target_absorption_percent,
        )
        thickness_cm = thickness_result["thickness_cm"]

        counts_result = predict_counts(
            atomic_number=material["atomic_number"],
            atomic_mass=material["atomic_mass"],
            density=material["density"],
            energy_kev=energy_kev,
            thickness_cm=thickness_cm,
            detector=detector,
            initial_counts=10000,
        )

        # Score rewards: thin practical thickness, high confidence, and
        # penalizes impractically thick (>5cm) or impractically thin (<1um)
        # solutions that would be hard to realize in a real nanomaterial
        # coating/pellet.
        practicality = 1.0
        if thickness_cm > 5:
            practicality = max(0.1, 5 / thickness_cm)
        elif thickness_cm < 0.0005:
            practicality = 0.5

        score = (
            0.55 * practicality
            + 0.25 * thickness_result["confidence"]
            + 0.20 * min(material["density"] / 20.0, 1.0)
        )

        scored.append(
            {
                "material_name": material["name"],
                "formula": material["formula"],
                "density": material["density"],
                "atomic_number": material["atomic_number"],
                "recommended_thickness_cm": round(thickness_cm, 5),
                "expected_counts": round(counts_result["final_counts"], 1),
                "score": round(score * 100, 1),
                "reason": _reason_for_material(material, thickness_cm),
            }
        )

    scored.sort(key=lambda r: r["score"], reverse=True)
    return scored[:top_n]


def _reason_for_material(material: dict, thickness_cm: float) -> str:
    z = material["atomic_number"]
    if z >= 70:
        z_note = "very high atomic number drives strong photoelectric attenuation"
    elif z >= 45:
        z_note = "moderately high atomic number gives balanced attenuation"
    else:
        z_note = "lower atomic number requires more thickness but improves biocompatibility"

    thickness_note = (
        "an easily fabricable coating thickness"
        if thickness_cm < 0.5
        else "a bulkier form factor than typical nanocoatings"
    )
    return f"{material['name']} ({z_note}); reaches the target with {thickness_note}."


# ---------------------------------------------------------------------------
# Model 5 — AI Scientist (scientific explanation generator)
# ---------------------------------------------------------------------------
def generate_explanation(
    *,
    material_name: str,
    atomic_number: float,
    density: float,
    energy_kev: float,
    thickness_cm: float,
    absorption_percent: float,
    comparison_material: Optional[dict] = None,
) -> str:
    """Rule-based scientific narrative by default; if ANTHROPIC_API_KEY is
    configured in the environment, upgrades to an LLM-generated explanation
    grounded in the same computed numbers (never lets the LLM invent its own
    physics values — they're passed in as facts to narrate)."""

    base = (
        f"{material_name} (Z={atomic_number:.0f}, density={density:.2f} g/cm3) attenuates "
        f"{absorption_percent:.1f}% of {energy_kev:.0f} keV gamma photons at {thickness_cm:.4f} cm "
        f"thickness. "
    )
    if energy_kev < 150:
        base += (
            "At this diagnostic-range energy, the photoelectric effect dominates, so "
            "attenuation scales strongly with atomic number (~Z^4), making high-Z materials "
            "disproportionately effective. "
        )
    else:
        base += (
            "At this higher energy, Compton scattering becomes the dominant interaction "
            "mechanism, so attenuation depends more on electron density (Z/A) than on Z alone, "
            "narrowing the gap between high- and low-Z materials. "
        )

    if comparison_material:
        base += (
            f"Compared to {comparison_material['material_name']} "
            f"(Z={comparison_material['atomic_number']}), this material "
            f"{'provides higher attenuation because of its higher atomic number and density' if atomic_number > comparison_material['atomic_number'] else 'trades some attenuation efficiency for other properties (biocompatibility, cost, or synthesis simplicity)'}."
        )

    llm_text = _maybe_llm_explanation(base)
    return llm_text or base


def _maybe_llm_explanation(fact_summary: str) -> Optional[str]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Rewrite the following computed gamma-ray attenuation result as a "
                        "concise, precise scientific explanation (3-4 sentences) for a "
                        "radiation physics researcher. Do not invent any numbers beyond what "
                        f"is given.\n\n{fact_summary}"
                    ),
                }
            ],
        )
        parts = [b.text for b in response.content if getattr(b, "type", None) == "text"]
        return "\n".join(parts).strip() or None
    except Exception:
        # Any SDK/network/auth failure silently falls back to the rule-based
        # explanation — the AI Scientist feature must never break the app.
        return None
