"""
NanoMed AI — Gamma-Ray Interaction Physics Engine
====================================================

Implements the Beer-Lambert attenuation law and the derived quantities used
throughout the platform (Sim Lab, AI planner, report generator):

    I = I0 * exp(-mu * x)

where `mu` is the linear attenuation coefficient (cm^-1), obtained from the
mass attenuation coefficient `mu/rho` (cm^2/g) and the material density
`rho` (g/cm^3).

Mass attenuation coefficient model
-----------------------------------
Real research tools should source mu/rho from tabulated data (NIST XCOM /
NIST XAAMDI). This engine ships with a physically-motivated two-term
semi-empirical model so the platform works standalone with zero external
data files, calibrated so that its values sit in the right ballpark for
common shielding/contrast materials (photoelectric term dominates below
~150 keV, Compton/incoherent scattering dominates above it):

    mu/rho(E) = A_photo * Z^4.0 / (A_mass * E_keV^3.1)      [photoelectric]
              + N_A * (Z / A_mass) * sigma_KN(E)             [Compton]

`sigma_KN` is the exact Klein-Nishina cross-section per electron. This is
the same approximation family used in nanomedicine dosimetry teaching
tools. It is intentionally exposed behind `AttenuationProvider` so a
production deployment can swap in tabulated NIST data without touching any
downstream code (Sim Lab, AI models, report generator all call
`get_mass_attenuation_coefficient` only).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

AVOGADRO = 6.02214076e23  # mol^-1
ELECTRON_REST_ENERGY_KEV = 511.0
CLASSICAL_ELECTRON_RADIUS_CM = 2.8179403262e-13

# Calibration constant for the photoelectric term, chosen so the model
# reproduces literature mu/rho for lead at 100 keV (~5.55 cm^2/g) to within
# the same order of magnitude across the 30-500 keV therapeutic/diagnostic
# range used by this platform.
_PHOTOELECTRIC_K = 39.4


def klein_nishina_cross_section_cm2(energy_kev: float) -> float:
    """Klein-Nishina cross-section per electron (cm^2), exact formula."""
    alpha = energy_kev / ELECTRON_REST_ENERGY_KEV
    if alpha <= 0:
        return 0.0
    re2 = CLASSICAL_ELECTRON_RADIUS_CM ** 2
    term1 = (1 + alpha) / alpha ** 2
    term2 = (2 * (1 + alpha)) / (1 + 2 * alpha) - math.log(1 + 2 * alpha) / alpha
    term3 = math.log(1 + 2 * alpha) / (2 * alpha)
    term4 = (1 + 3 * alpha) / (1 + 2 * alpha) ** 2
    sigma = 2 * math.pi * re2 * (term1 * term2 + term3 - term4)
    return max(sigma, 0.0)


def mass_attenuation_coefficient(
    atomic_number: float, atomic_mass: float, energy_kev: float
) -> float:
    """Estimate mu/rho (cm^2/g) for an effective single-element material."""
    if energy_kev <= 0 or atomic_mass <= 0:
        raise ValueError("energy_kev and atomic_mass must be positive")

    photoelectric = _PHOTOELECTRIC_K * (atomic_number ** 4.0) / (
        atomic_mass * (energy_kev ** 3.1)
    )
    sigma_kn = klein_nishina_cross_section_cm2(energy_kev)
    compton = AVOGADRO * (atomic_number / atomic_mass) * sigma_kn

    return photoelectric + compton


@dataclass
class AttenuationResult:
    linear_attenuation_coefficient: float  # cm^-1
    mass_attenuation_coefficient: float  # cm^2/g
    transmission: float  # fraction 0-1
    absorption_percent: float  # %
    half_value_layer_cm: float
    mean_free_path_cm: float
    final_counts: float


def run_beer_lambert(
    *,
    atomic_number: float,
    atomic_mass: float,
    density_g_cm3: float,
    energy_kev: float,
    thickness_cm: float,
    initial_counts: float = 10000.0,
    detector_efficiency: float = 1.0,
) -> AttenuationResult:
    """Full Beer-Lambert calculation for one experiment / sim-lab run."""
    mu_rho = mass_attenuation_coefficient(atomic_number, atomic_mass, energy_kev)
    mu = mu_rho * density_g_cm3  # linear attenuation coefficient, cm^-1

    transmission = math.exp(-mu * thickness_cm)
    absorption_percent = (1 - transmission) * 100
    hvl = math.log(2) / mu if mu > 0 else float("inf")
    mfp = 1 / mu if mu > 0 else float("inf")
    final_counts = initial_counts * transmission * detector_efficiency

    return AttenuationResult(
        linear_attenuation_coefficient=mu,
        mass_attenuation_coefficient=mu_rho,
        transmission=transmission,
        absorption_percent=absorption_percent,
        half_value_layer_cm=hvl,
        mean_free_path_cm=mfp,
        final_counts=final_counts,
    )


def thickness_for_target_absorption(
    *,
    atomic_number: float,
    atomic_mass: float,
    density_g_cm3: float,
    energy_kev: float,
    target_absorption_percent: float,
) -> float:
    """Invert Beer-Lambert: solve for thickness given a target absorption %."""
    if not (0 < target_absorption_percent < 100):
        raise ValueError("target_absorption_percent must be between 0 and 100")

    mu_rho = mass_attenuation_coefficient(atomic_number, atomic_mass, energy_kev)
    mu = mu_rho * density_g_cm3
    if mu <= 0:
        return float("inf")

    target_transmission = 1 - (target_absorption_percent / 100)
    thickness_cm = -math.log(target_transmission) / mu
    return thickness_cm


def density_from_mass_volume(mass_g: float, volume_cm3: float) -> float:
    """Simple density formula: rho = m / V (g/cm^3)."""
    if mass_g <= 0:
        raise ValueError("mass_g must be positive")
    if volume_cm3 <= 0:
        raise ValueError("volume_cm3 must be positive")
    return mass_g / volume_cm3


def thickness_from_intensities(
    initial_intensity: float, final_intensity: float, mu: float
) -> float:
    """Invert Beer-Lambert directly from a known linear attenuation
    coefficient (mu): x = -ln(I / I0) / mu.

    Unlike `thickness_for_target_absorption`, this does not require a
    material's atomic number/mass — it works from mu the way the standalone
    Shielding Calculator (Tab 1) already reports it, so a researcher can
    plug in a measured or previously-computed mu directly.
    """
    if initial_intensity <= 0 or final_intensity <= 0:
        raise ValueError("initial_intensity and final_intensity must be positive")
    if final_intensity >= initial_intensity:
        raise ValueError("final_intensity must be less than initial_intensity")
    if mu <= 0:
        raise ValueError("mu must be positive")

    return -math.log(final_intensity / initial_intensity) / mu


DETECTOR_EFFICIENCY = {
    "NaI(Tl) Scintillation Detector": 0.92,
    "HPGe (High-Purity Germanium)": 0.55,
    "CdTe Semiconductor Detector": 0.75,
    "Geiger-Muller Counter": 0.40,
    "Plastic Scintillator": 0.65,
    "LaBr3(Ce) Scintillation Detector": 0.88,
}


def get_detector_efficiency(detector_name: Optional[str]) -> float:
    return DETECTOR_EFFICIENCY.get(detector_name, 0.75)
