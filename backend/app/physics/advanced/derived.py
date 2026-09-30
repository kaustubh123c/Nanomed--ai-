"""
Derived radiation-shielding / material quantities.

Ported (and, for R/Zeq, adapted to be data-source agnostic) from Physics-AI's
`physics/{lac,hvl,tvl,mfp,zeff,zeq,neff,ceff,acs,ecs,rse,r}.py`.
"""

import math
from typing import Dict

from .components import get_element_components

AVOGADRO_NUMBER = 6.02214076e23
ELECTRON_CHARGE_C = 1.602176634e-19
ELECTRON_MASS_KG = 9.1093837139e-31
PLANCK_CONSTANT_J_S = 6.62607015e-34
BOLTZMANN_CONSTANT_J_K = 1.380649e-23


# ---------------------------------------------------------------------------
# LAC / HVL / TVL / MFP
# ---------------------------------------------------------------------------

def calculate_lac(mac: float, density: float) -> float:
    """LAC = MAC x density (cm^-1)."""
    if mac < 0:
        raise ValueError("MAC cannot be negative.")
    if density <= 0:
        raise ValueError("Density must be greater than zero.")
    return mac * density


def calculate_hvl(lac: float) -> float:
    if lac <= 0:
        raise ValueError("LAC must be greater than zero.")
    return math.log(2) / lac


def calculate_tvl(lac: float) -> float:
    if lac <= 0:
        raise ValueError("LAC must be greater than zero.")
    return math.log(10) / lac


def calculate_mfp(lac: float) -> float:
    if lac <= 0:
        raise ValueError("LAC must be greater than zero.")
    return 1.0 / lac


# ---------------------------------------------------------------------------
# Zeff (power-law mixture, no external data needed)
# ---------------------------------------------------------------------------

def calculate_zeff(
    mass_fractions: Dict[str, float],
    atomic_weights: Dict[str, float],
    atomic_numbers: Dict[str, int],
    exponent: float = 2.94,
) -> float:
    if not mass_fractions:
        raise ValueError("Mass fractions cannot be empty.")
    if exponent <= 0:
        raise ValueError("Exponent must be greater than zero.")

    numerator = 0.0
    denominator = 0.0
    for element, fraction in mass_fractions.items():
        if fraction < 0:
            raise ValueError(f"Mass fraction for '{element}' cannot be negative.")
        aw = atomic_weights[element]
        an = atomic_numbers[element]
        if aw <= 0 or an <= 0:
            raise ValueError(f"Invalid atomic data for '{element}'.")
        numerator += fraction * (an ** exponent) / aw
        denominator += fraction / aw

    if denominator <= 0:
        raise ValueError("Invalid denominator in Zeff calculation.")

    return (numerator / denominator) ** (1.0 / exponent)


# ---------------------------------------------------------------------------
# R (Compton/total ratio) and Zeq (energy-dependent equivalent Z)
# ---------------------------------------------------------------------------

def calculate_elemental_r(element: str, energy_mev: float, data_source: str = "offline") -> float:
    """R = (mu/rho)_Compton / (mu/rho)_Total for one element."""
    components = get_element_components(element, energy_mev, data_source)
    total = components["total_with_coherent_cm2_g"]
    if total <= 0:
        raise ValueError(f"Total attenuation for {element} must be greater than zero.")
    return components["incoherent_cm2_g"] / total


def calculate_material_r(
    mass_fractions: Dict[str, float], energy_mev: float, data_source: str = "offline"
) -> float:
    if not mass_fractions:
        raise ValueError("Mass fractions cannot be empty.")
    if abs(sum(mass_fractions.values()) - 1.0) > 1e-6:
        raise ValueError("Mass fractions must sum to 1.")

    elemental_r = {
        element: calculate_elemental_r(element, energy_mev, data_source) for element in mass_fractions
    }
    return sum(mass_fractions[e] * elemental_r[e] for e in mass_fractions)


def calculate_zeq(
    mass_fractions: Dict[str, float],
    atomic_numbers: Dict[str, int],
    energy_mev: float,
    data_source: str = "offline",
) -> float:
    """
    Energy-dependent equivalent atomic number, via log-interpolation of
    elemental Compton/total ratios (R) between the two bracketing Z values.
    """
    if energy_mev <= 0:
        raise ValueError("Energy must be greater than zero.")
    if not mass_fractions:
        raise ValueError("Mass fractions cannot be empty.")
    if set(mass_fractions) != set(atomic_numbers):
        raise ValueError("Mass fractions and atomic numbers must contain the same elements.")

    elemental_ratios = {
        element: calculate_elemental_r(element, energy_mev, data_source) for element in mass_fractions
    }
    material_ratio = sum(mass_fractions[e] * elemental_ratios[e] for e in mass_fractions)

    elements = sorted(mass_fractions, key=lambda e: atomic_numbers[e])

    for i in range(len(elements) - 1):
        e1, e2 = elements[i], elements[i + 1]
        z1, z2 = atomic_numbers[e1], atomic_numbers[e2]
        r1, r2 = elemental_ratios[e1], elemental_ratios[e2]
        if r1 == r2:
            continue
        if r1 > r2:
            e1, e2, z1, z2, r1, r2 = e2, e1, z2, z1, r2, r1
        if r1 <= material_ratio <= r2:
            denominator = math.log(r2) - math.log(r1)
            if denominator == 0:
                raise ValueError("Unable to calculate Zeq: elemental R values are identical.")
            fraction = (math.log(material_ratio) - math.log(r1)) / denominator
            return z1 + fraction * (z2 - z1)

    raise ValueError("Material R is outside the range of the available elemental R values.")


# ---------------------------------------------------------------------------
# Neff / Ceff / ACS / ECS / RSE
# ---------------------------------------------------------------------------

def calculate_neff(
    mass_fractions: Dict[str, float],
    atomic_weights: Dict[str, float],
    atomic_numbers: Dict[str, int],
) -> float:
    """Effective electron density (electrons/g): Neff = N_A * sum(f_i * Z_i / A_i)."""
    if not mass_fractions:
        raise ValueError("Mass fractions cannot be empty.")
    if abs(sum(mass_fractions.values()) - 1.0) > 1e-6:
        raise ValueError("Mass fractions must sum to 1.")

    numerator = 0.0
    for element, fraction in mass_fractions.items():
        aw = atomic_weights.get(element)
        an = atomic_numbers.get(element)
        if aw is None or an is None:
            raise ValueError(f"Missing atomic data for '{element}'.")
        if aw <= 0 or an <= 0:
            raise ValueError(f"Invalid atomic data for '{element}'.")
        numerator += fraction * an / aw

    return AVOGADRO_NUMBER * numerator


def calculate_ceff(neff: float, density: float, temperature_k: float = 300.0) -> float:
    """Effective conductivity (S/m), Phy-X/PSD formulation."""
    if neff <= 0:
        raise ValueError("Effective electron density must be greater than zero.")
    if density <= 0:
        raise ValueError("Density must be greater than zero.")
    if temperature_k <= 0:
        raise ValueError("Temperature must be greater than zero.")

    tau = PLANCK_CONSTANT_J_S / (2.0 * math.pi * BOLTZMANN_CONSTANT_J_K * temperature_k)
    return (neff * density * ELECTRON_CHARGE_C ** 2 * tau / ELECTRON_MASS_KG) * 1.0e3


def calculate_acs(mac: float, molar_mass: float) -> float:
    """Atomic cross section (cm^2/atom): ACS = MAC * M / N_A."""
    if mac < 0:
        raise ValueError("MAC cannot be negative.")
    if molar_mass <= 0:
        raise ValueError("Molar mass must be greater than zero.")
    return mac * molar_mass / AVOGADRO_NUMBER


def calculate_ecs(mac: float, neff: float) -> float:
    """Electronic cross section (cm^2/electron): ECS = MAC / Neff."""
    if mac < 0:
        raise ValueError("MAC cannot be negative.")
    if neff <= 0:
        raise ValueError("Neff must be greater than zero.")
    return mac / neff


def calculate_rse(lac: float, thickness_cm: float) -> float:
    """Radiation shielding efficiency (%): RSE = (1 - exp(-LAC*x)) * 100."""
    if lac < 0:
        raise ValueError("LAC cannot be negative.")
    if thickness_cm < 0:
        raise ValueError("Thickness cannot be negative.")
    transmission = math.exp(-lac * thickness_cm)
    return (1.0 - transmission) * 100.0
