"""
Offline elemental photon-interaction components.

This is the default, zero-config data source for the advanced physics
engine. It reuses NanoMed AI's existing semi-empirical model
(`app.physics.engine`: exact Klein-Nishina Compton cross-section +
Z^4/E^3.1 photoelectric term) rather than requiring any external service.

To keep the richer Physics-AI derived quantities (Zeq, R) working the same
way regardless of data source, we expose per-element components in the same
shape NIST XCOM would return:

    {
        "coherent_cm2_g": ...,       # not modeled offline -> 0.0
        "incoherent_cm2_g": ...,     # Klein-Nishina Compton term
        "photoelectric_cm2_g": ...,  # semi-empirical photoelectric term
        "total_with_coherent_cm2_g": ...,
        "total_without_coherent_cm2_g": ...,
    }

Coherent (Rayleigh) scattering is not modeled by this offline approximation
-- it is a small correction at the therapeutic/diagnostic energies this
platform targets, so `total_with_coherent` and `total_without_coherent` are
equal here. Swap in the `mac_xcom` data source for published NIST values
that include it.
"""

from .elements import get_atomic_number, get_atomic_weight
from ..engine import klein_nishina_cross_section_cm2, mass_attenuation_coefficient

AVOGADRO = 6.02214076e23  # mol^-1


def get_elemental_components_offline(element: str, energy_mev: float) -> dict:
    """Offline elemental photon-interaction components at a given energy (MeV)."""
    if energy_mev <= 0:
        raise ValueError("Energy must be greater than zero.")

    z = get_atomic_number(element)
    a = get_atomic_weight(element)
    energy_kev = energy_mev * 1000.0

    total = mass_attenuation_coefficient(z, a, energy_kev)
    incoherent = AVOGADRO * (z / a) * klein_nishina_cross_section_cm2(energy_kev)
    photoelectric = max(total - incoherent, 0.0)

    return {
        "energy_MeV": energy_mev,
        "coherent_cm2_g": 0.0,
        "incoherent_cm2_g": incoherent,
        "photoelectric_cm2_g": photoelectric,
        "pair_nuclear_cm2_g": 0.0,
        "pair_electron_cm2_g": 0.0,
        "total_with_coherent_cm2_g": total,
        "total_without_coherent_cm2_g": total,
    }


def get_elemental_mac_offline(element: str, energy_mev: float) -> float:
    return get_elemental_components_offline(element, energy_mev)["total_with_coherent_cm2_g"]
