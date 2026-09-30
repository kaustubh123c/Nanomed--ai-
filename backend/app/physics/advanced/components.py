"""
Data-source dispatcher: resolves per-element photon-interaction components
from either the offline model (default) or live NIST XCOM (opt-in), and
combines elemental MAC into a material MAC via mass-fraction mixing.
"""

from typing import Dict, List

from . import mac_offline, mac_xcom
from .elements import get_atomic_number

VALID_SOURCES = ("offline", "xcom")


def get_element_components(element: str, energy_mev: float, data_source: str = "offline") -> Dict:
    if data_source == "offline":
        return mac_offline.get_elemental_components_offline(element, energy_mev)
    if data_source == "xcom":
        z = get_atomic_number(element)
        return mac_xcom.get_xcom_components(element, energy_mev, atomic_number=z)
    raise ValueError(f"Unknown data_source '{data_source}'. Use one of {VALID_SOURCES}.")


def get_elemental_mac(
    elements: List[str], energy_mev: float, data_source: str = "offline"
) -> Dict[str, float]:
    return {
        element: get_element_components(element, energy_mev, data_source)["total_with_coherent_cm2_g"]
        for element in elements
    }


def calculate_material_mac(mass_fractions: Dict[str, float], elemental_mac: Dict[str, float]) -> float:
    """MAC_material = sum(w_i * MAC_i)."""
    if not mass_fractions:
        raise ValueError("Mass fractions cannot be empty.")
    if not elemental_mac:
        raise ValueError("Elemental MAC data cannot be empty.")

    total_fraction = sum(mass_fractions.values())
    if abs(total_fraction - 1.0) > 1e-6:
        raise ValueError("Mass fractions must sum to 1.")

    missing = set(mass_fractions) - set(elemental_mac)
    if missing:
        raise ValueError("Missing elemental MAC values for: " + ", ".join(sorted(missing)))

    return sum(mass_fractions[element] * elemental_mac[element] for element in mass_fractions)
