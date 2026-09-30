"""
Advanced physics engine — orchestration layer.

Runs the full material-shielding calculation pipeline (adapted from
Physics-AI's `services/calculation_service.py`) for a chemical formula:

    formula -> stoichiometry -> mass fractions -> elemental components
        -> MAC -> LAC -> HVL / TVL / MFP
        -> Zeff / Zeq / Neff / Ceff / ACS / ECS / RSE
        -> FNRCS (fast-neutron removal)
        -> EBF / EABF (G-P exposure / energy-absorption buildup factors)

Each quantity is computed independently and marked "calculated" or
"unavailable" (with a reason) rather than letting one missing dependency
abort the whole pipeline -- e.g. EBF/EABF only apply in the 0.015-15 MeV
G-P range, FNRCS needs elemental data for every constituent, etc.

`data_source` controls where elemental photon-interaction data comes from:
    "offline" (default) -- NanoMed's own zero-config Klein-Nishina +
        photoelectric model, no network required.
    "xcom" -- live NIST XCOM lookup, requires internet + requests/bs4.
"""

from typing import Dict, List, Optional

from . import components as components_module
from . import derived
from . import fnrcs as fnrcs_module
from . import gp_buildup
from . import mac_xcom
from .composition import (
    calculate_mass_fractions,
    calculate_mole_fractions,
    calculate_molar_mass,
    stoichiometry_from_mole_fractions,
    stoichiometry_from_weight_fractions,
)
from .elements import get_atomic_number, get_atomic_weight
from .energy_grid import get_selected_energy_grid
from .formula_parser import format_stoichiometry_as_formula, parse_formula

DEFAULT_DATA_SOURCE = "offline"
VALID_COMPOSITION_MODES = ("formula", "weight", "mole")


def resolve_stoichiometry(
    *,
    composition_mode: str = "formula",
    formula: Optional[str] = None,
    weight_fractions: Optional[Dict[str, float]] = None,
    mole_fractions: Optional[Dict[str, float]] = None,
) -> "tuple[Dict[str, float], str]":
    """Turn whichever composition input the user supplied into a stoichiometry
    dict plus a display formula string. Supports three input modes:

        "formula" -- a typed chemical formula, e.g. "Bi2O3" (default).
        "weight"  -- a {element: weight_fraction} dict, e.g. {"Zn": 0.8, "O": 0.2}.
        "mole"    -- a {element: mole_fraction} dict, e.g. {"Zn": 0.5, "O": 0.5}.
    """
    if composition_mode not in VALID_COMPOSITION_MODES:
        raise ValueError(f"composition_mode must be one of {VALID_COMPOSITION_MODES}")

    if composition_mode == "weight":
        if not weight_fractions:
            raise ValueError("weight_fractions is required when composition_mode is 'weight'.")
        stoichiometry = stoichiometry_from_weight_fractions(weight_fractions)
        display_formula = format_stoichiometry_as_formula(stoichiometry)
    elif composition_mode == "mole":
        if not mole_fractions:
            raise ValueError("mole_fractions is required when composition_mode is 'mole'.")
        stoichiometry = stoichiometry_from_mole_fractions(mole_fractions)
        display_formula = format_stoichiometry_as_formula(stoichiometry)
    else:
        if not formula or not formula.strip():
            raise ValueError("formula is required when composition_mode is 'formula'.")
        stoichiometry = parse_formula(formula)
        display_formula = formula

    return stoichiometry, display_formula


def _run(name, fn, *args, **kwargs):
    """Run one calculation without letting a missing dependency abort the rest."""
    try:
        return fn(*args, **kwargs), "calculated", None
    except (ValueError, KeyError, LookupError, ZeroDivisionError, RuntimeError) as exc:
        return None, "unavailable", f"{name} could not be calculated: {exc}"


def calculate_shielding(
    *,
    formula: Optional[str] = None,
    density_g_cm3: float,
    thickness_cm: float,
    energy_mev: float,
    data_source: str = DEFAULT_DATA_SOURCE,
    composition_mode: str = "formula",
    weight_fractions: Optional[Dict[str, float]] = None,
    mole_fractions: Optional[Dict[str, float]] = None,
) -> Dict:
    """Full advanced-physics shielding calculation for one material/energy.

    The material composition can be supplied in one of three ways (see
    `composition_mode`): a typed chemical `formula` (default), a
    `weight_fractions` dict, or a `mole_fractions` dict.
    """
    if density_g_cm3 <= 0:
        raise ValueError("Density must be greater than zero.")
    if thickness_cm < 0:
        raise ValueError("Thickness cannot be negative.")
    if energy_mev <= 0:
        raise ValueError("Energy must be greater than zero.")

    stoichiometry, display_formula = resolve_stoichiometry(
        composition_mode=composition_mode,
        formula=formula,
        weight_fractions=weight_fractions,
        mole_fractions=mole_fractions,
    )
    mass_fractions = calculate_mass_fractions(stoichiometry)
    mole_fraction_result = calculate_mole_fractions(stoichiometry)
    molar_mass = calculate_molar_mass(stoichiometry)
    elements = list(mass_fractions.keys())
    atomic_weights = {e: get_atomic_weight(e) for e in elements}
    atomic_numbers = {e: get_atomic_number(e) for e in elements}

    result: Dict = {
        "formula": display_formula,
        "composition_mode": composition_mode,
        "energy_MeV": energy_mev,
        "density_g_cm3": density_g_cm3,
        "thickness_cm": thickness_cm,
        "data_source": data_source,
        "molar_mass_g_mol": molar_mass,
        "stoichiometry": stoichiometry,
        "mass_fractions": mass_fractions,
        "mole_fractions": mole_fraction_result,
        "atomic_numbers": atomic_numbers,
        "atomic_weights": atomic_weights,
        "availability": {},
    }

    def track(key, name, fn, *args, **kwargs):
        value, status, warning = _run(name, fn, *args, **kwargs)
        result[key] = value
        result[f"{key}_status"] = status
        result[f"{key}_warning"] = warning
        result["availability"][name] = {"status": status, "reason": warning}
        return value

    elemental_mac = track(
        "elemental_mac_cm2_g", "MAC",
        components_module.get_elemental_mac, elements, energy_mev, data_source,
    )
    mac = None
    if elemental_mac is not None:
        mac = track(
            "mac_cm2_g", "Material MAC",
            components_module.calculate_material_mac, mass_fractions, elemental_mac,
        )
    else:
        result["mac_cm2_g"] = None
        result["mac_cm2_g_status"] = "unavailable"
        result["mac_cm2_g_warning"] = result["elemental_mac_cm2_g_warning"]

    lac = None
    if mac is not None:
        lac = track("lac_cm1", "LAC", derived.calculate_lac, mac, density_g_cm3)

    if lac is not None:
        track("hvl_cm", "HVL", derived.calculate_hvl, lac)
        track("tvl_cm", "TVL", derived.calculate_tvl, lac)
        mfp = track("mfp_cm", "MFP", derived.calculate_mfp, lac)
    else:
        for k in ("hvl_cm", "tvl_cm", "mfp_cm"):
            result[k] = None
            result[f"{k}_status"] = "unavailable"
            result[f"{k}_warning"] = "Requires LAC."
        mfp = None

    track(
        "r", "R",
        derived.calculate_material_r, mass_fractions, energy_mev, data_source,
    )

    zeff = track("zeff", "Zeff", derived.calculate_zeff, mass_fractions, atomic_weights, atomic_numbers)
    zeq = track(
        "zeq", "Zeq",
        derived.calculate_zeq, mass_fractions, atomic_numbers, energy_mev, data_source,
    )
    neff = track("neff", "Neff", derived.calculate_neff, mass_fractions, atomic_weights, atomic_numbers)

    ceff = None
    if neff is not None:
        ceff = track("ceff_S_m", "Ceff", derived.calculate_ceff, neff, density_g_cm3, 300.0)
    else:
        result["ceff_S_m"] = None
        result["ceff_S_m_status"] = "unavailable"
        result["ceff_S_m_warning"] = "Requires Neff."

    if mac is not None:
        track("acs_cm2_atom", "ACS", derived.calculate_acs, mac, molar_mass)
    else:
        result["acs_cm2_atom"] = None
        result["acs_cm2_atom_status"] = "unavailable"
        result["acs_cm2_atom_warning"] = "Requires MAC."

    if mac is not None and neff is not None:
        track("ecs_cm2_electron", "ECS", derived.calculate_ecs, mac, neff)
    else:
        result["ecs_cm2_electron"] = None
        result["ecs_cm2_electron_status"] = "unavailable"
        result["ecs_cm2_electron_warning"] = "Requires MAC and Neff."

    if lac is not None:
        track("rse_percent", "RSE", derived.calculate_rse, lac, thickness_cm)
    else:
        result["rse_percent"] = None
        result["rse_percent_status"] = "unavailable"
        result["rse_percent_warning"] = "Requires LAC."

    def _fnrcs():
        elemental_fnrcs = fnrcs_module.get_elemental_fnrcs(elements)
        return fnrcs_module.calculate_fnrcs(density_g_cm3, mass_fractions, elemental_fnrcs)

    track("fnrcs_cm1", "FNRCS", _fnrcs)

    # EBF / EABF — need MFP, Zeq, and 0.015-15 MeV / <=40 mfp penetration.
    ebf = eabf = None
    ebf_status, ebf_warning = "unavailable", None
    if not (0.015 <= energy_mev <= 15.0):
        ebf_warning = (
            f"EBF/EABF are unavailable: energy ({energy_mev:.6f} MeV) is outside "
            "the supported G-P range of 0.015-15.000 MeV."
        )
    elif mfp is None or mfp <= 0:
        ebf_warning = "EBF/EABF are unavailable because MFP could not be calculated."
    elif zeq is None:
        ebf_warning = "EBF/EABF are unavailable because Zeq could not be calculated."
    else:
        penetration_mfp = thickness_cm / mfp
        if penetration_mfp > 40.0:
            ebf_warning = (
                f"EBF/EABF are unavailable: penetration is {penetration_mfp:.3f} mfp, "
                "exceeding the G-P limit of 40 mfp."
            )
        else:
            try:
                ebf_params = gp_buildup.get_gp_parameters(energy_mev, zeq, "EBF")
                eabf_params = gp_buildup.get_gp_parameters(energy_mev, zeq, "EABF")
                ebf = gp_buildup.calculate_ebf(penetration_mfp, **ebf_params)
                eabf = gp_buildup.calculate_eabf(penetration_mfp, **eabf_params)
                ebf_status = "calculated"
            except (ValueError, KeyError, LookupError, TypeError, ZeroDivisionError) as exc:
                ebf_warning = f"EBF/EABF could not be calculated: {exc}"

    result["ebf"] = ebf
    result["eabf"] = eabf
    result["ebf_eabf_status"] = ebf_status
    result["ebf_eabf_warning"] = ebf_warning
    result["availability"]["EBF"] = {"status": ebf_status, "reason": ebf_warning}
    result["availability"]["EABF"] = {"status": ebf_status, "reason": ebf_warning}

    return result


def calculate_energy_sweep(
    *,
    formula: str,
    density_g_cm3: float,
    thickness_cm: float,
    energies_mev: Optional[List[float]] = None,
    data_source: str = DEFAULT_DATA_SOURCE,
) -> Dict:
    """Run `calculate_shielding` across the selected energy grid (or a custom list)."""
    energies = energies_mev if energies_mev is not None else get_selected_energy_grid()

    if data_source == "xcom":
        # One batched request per element up front, instead of each of MAC/R/Zeq
        # separately re-fetching every energy for every element as the sweep runs.
        stoichiometry = parse_formula(formula)
        elements = list(stoichiometry.keys())
        atomic_numbers = {e: get_atomic_number(e) for e in elements}
        try:
            mac_xcom.warm_cache(elements, energies, atomic_numbers)
        except (ValueError, RuntimeError):
            pass  # surfaced per-energy below via the normal calculated/unavailable path

    results = []
    for index, energy in enumerate(energies, start=1):
        try:
            calc = calculate_shielding(
                formula=formula,
                density_g_cm3=density_g_cm3,
                thickness_cm=thickness_cm,
                energy_mev=energy,
                data_source=data_source,
            )
            results.append({"index": index, "energy_MeV": energy, "status": "calculated",
                             "calculation": calc, "error": None})
        except (ValueError, KeyError, LookupError, ZeroDivisionError, RuntimeError) as exc:
            results.append({"index": index, "energy_MeV": energy, "status": "unavailable",
                             "calculation": None, "error": str(exc)})

    calculated_count = sum(1 for r in results if r["status"] == "calculated")
    return {
        "formula": formula,
        "data_source": data_source,
        "energy_count": len(energies),
        "calculated_count": calculated_count,
        "unavailable_count": len(results) - calculated_count,
        "results": results,
    }
