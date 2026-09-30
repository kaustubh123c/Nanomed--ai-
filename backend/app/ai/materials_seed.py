"""
Seed nanomaterial reference data.

Effective atomic number (Z_eff), atomic/molar mass, and density are
intrinsic material properties (per the project spec, these are NEVER
predicted by AI — they are looked up here and fed as *inputs* into the
physics engine and the AI models).

Values are representative literature figures for common radiotherapy /
diagnostic-imaging contrast and shielding nanomaterials. Swap or extend this
list freely; the Materials module also lets researchers add fully custom
entries through the UI, which are stored in the `materials` collection and
used the same way as these seed defaults.
"""

DEFAULT_MATERIALS = [
    {
        "name": "Gold Nanoparticles (AuNP)",
        "formula": "Au",
        "density": 19.30,
        "atomic_number": 79,
        "atomic_mass": 196.97,
        "particle_size_nm": 15,
        "crystal_structure": "FCC",
        "manufacturer": "Reference / Literature",
        "research_notes": "High-Z radiosensitizer; strong photoelectric enhancement at kV energies.",
    },
    {
        "name": "Bismuth Oxide Nanoparticles",
        "formula": "Bi2O3",
        "density": 8.90,
        "atomic_number": 83,
        "atomic_mass": 208.0,
        "particle_size_nm": 40,
        "crystal_structure": "Monoclinic",
        "manufacturer": "Reference / Literature",
        "research_notes": "Cost-effective high-Z alternative to gold for CT contrast and dose enhancement.",
    },
    {
        "name": "Iron Oxide Nanoparticles (Fe3O4)",
        "formula": "Fe3O4",
        "density": 5.20,
        "atomic_number": 26,
        "atomic_mass": 55.85,
        "particle_size_nm": 20,
        "crystal_structure": "Inverse Spinel",
        "manufacturer": "Reference / Literature",
        "research_notes": "Superparamagnetic; dual MRI contrast + moderate attenuation.",
    },
    {
        "name": "Silver Nanoparticles (AgNP)",
        "formula": "Ag",
        "density": 10.49,
        "atomic_number": 47,
        "atomic_mass": 107.87,
        "particle_size_nm": 25,
        "crystal_structure": "FCC",
        "manufacturer": "Reference / Literature",
        "research_notes": "Moderate-Z; antibacterial co-functionality of interest for combined studies.",
    },
    {
        "name": "Gadolinium Oxide Nanoparticles",
        "formula": "Gd2O3",
        "density": 7.41,
        "atomic_number": 64,
        "atomic_mass": 157.25,
        "particle_size_nm": 10,
        "crystal_structure": "Cubic",
        "manufacturer": "Reference / Literature",
        "research_notes": "Established MRI/radiotherapy dual agent, good biocompatibility profile.",
    },
    {
        "name": "Titanium Dioxide Nanoparticles",
        "formula": "TiO2",
        "density": 4.23,
        "atomic_number": 22,
        "atomic_mass": 47.87,
        "particle_size_nm": 30,
        "crystal_structure": "Anatase",
        "manufacturer": "Reference / Literature",
        "research_notes": "Photocatalytic; low-Z, limited attenuation but strong biocompatibility.",
    },
    {
        "name": "Zinc Oxide Nanoparticles",
        "formula": "ZnO",
        "density": 5.61,
        "atomic_number": 30,
        "atomic_mass": 65.38,
        "particle_size_nm": 35,
        "crystal_structure": "Wurtzite",
        "manufacturer": "Reference / Literature",
        "research_notes": "Low-cost, moderate attenuation; UV-responsive co-therapy candidate.",
    },
    {
        "name": "Tungsten Oxide Nanoparticles",
        "formula": "WO3",
        "density": 7.16,
        "atomic_number": 74,
        "atomic_mass": 183.84,
        "particle_size_nm": 28,
        "crystal_structure": "Monoclinic",
        "manufacturer": "Reference / Literature",
        "research_notes": "High-Z shielding-grade attenuation with lower toxicity concerns than lead.",
    },
    {
        "name": "Platinum Nanoparticles (PtNP)",
        "formula": "Pt",
        "density": 21.45,
        "atomic_number": 78,
        "atomic_mass": 195.08,
        "particle_size_nm": 12,
        "crystal_structure": "FCC",
        "manufacturer": "Reference / Literature",
        "research_notes": "High-Z radiosensitizer, chemotherapeutic synergy of interest (cisplatin analogues).",
    },
    {
        "name": "Copper Oxide Nanoparticles",
        "formula": "CuO",
        "density": 6.31,
        "atomic_number": 29,
        "atomic_mass": 63.55,
        "particle_size_nm": 22,
        "crystal_structure": "Monoclinic",
        "manufacturer": "Reference / Literature",
        "research_notes": "Low-cost moderate-Z candidate, redox-active in tumor microenvironment.",
    },
    {
        "name": "Cerium Oxide Nanoparticles",
        "formula": "CeO2",
        "density": 7.65,
        "atomic_number": 58,
        "atomic_mass": 140.12,
        "particle_size_nm": 18,
        "crystal_structure": "Fluorite",
        "manufacturer": "Reference / Literature",
        "research_notes": "Antioxidant (ROS-scavenging) nanozyme; radioprotective co-effects reported.",
    },
    {
        "name": "Barium Sulfate Nanoparticles",
        "formula": "BaSO4",
        "density": 4.50,
        "atomic_number": 56,
        "atomic_mass": 137.33,
        "particle_size_nm": 45,
        "crystal_structure": "Orthorhombic",
        "manufacturer": "Reference / Literature",
        "research_notes": "Classical radiopaque contrast agent, well-characterized safety profile.",
    },
]

DETECTORS = [
    "NaI(Tl) Scintillation Detector",
    "HPGe (High-Purity Germanium)",
    "CdTe Semiconductor Detector",
    "Geiger-Muller Counter",
    "Plastic Scintillator",
    "LaBr3(Ce) Scintillation Detector",
]

GAMMA_SOURCES = [
    {"name": "Tc-99m", "energy_kev": 140},
    {"name": "I-131", "energy_kev": 364},
    {"name": "Cs-137", "energy_kev": 662},
    {"name": "Co-60", "energy_kev": 1250},
    {"name": "Am-241", "energy_kev": 60},
    {"name": "Ba-133", "energy_kev": 356},
]
