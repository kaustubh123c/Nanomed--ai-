"""
Stoichiometry -> molar mass / mass fraction calculations.

Ported from Physics-AI's `material/composition.py`.
"""

from typing import Dict

from .elements import get_element


def calculate_molar_mass(stoichiometry: Dict[str, float]) -> float:
    """Molar mass (g/mol) from elemental stoichiometry, e.g. {"Zn": 1, "O": 1}."""
    if not stoichiometry:
        raise ValueError("Stoichiometric composition cannot be empty.")

    molar_mass = 0.0
    for element, quantity in stoichiometry.items():
        quantity = float(quantity)
        if quantity <= 0:
            raise ValueError(f"Quantity for '{element}' must be greater than 0.")
        data = get_element(element)
        molar_mass += quantity * data["atomic_weight"]

    return molar_mass


def calculate_mass_fractions(stoichiometry: Dict[str, float]) -> Dict[str, float]:
    """Elemental mass fractions w_i = (n_i * A_i) / M."""
    molar_mass = calculate_molar_mass(stoichiometry)

    mass_fractions = {}
    for element, quantity in stoichiometry.items():
        data = get_element(element)
        elemental_mass = float(quantity) * data["atomic_weight"]
        mass_fractions[element] = elemental_mass / molar_mass

    return mass_fractions


def calculate_mole_fractions(stoichiometry: Dict[str, float]) -> Dict[str, float]:
    """Elemental mole fractions x_i = n_i / sum(n)."""
    if not stoichiometry:
        raise ValueError("Stoichiometric composition cannot be empty.")

    total = sum(float(q) for q in stoichiometry.values())
    if total <= 0:
        raise ValueError("Stoichiometric quantities must sum to more than 0.")

    return {element: float(quantity) / total for element, quantity in stoichiometry.items()}


def _normalize_fraction_input(fractions: Dict[str, float], label: str) -> Dict[str, float]:
    """Validate a user-supplied {element: fraction} dict (weight or mole fractions)."""
    if not fractions:
        raise ValueError(f"At least one element {label} is required.")

    cleaned: Dict[str, float] = {}
    for raw_symbol, raw_value in fractions.items():
        symbol = str(raw_symbol).strip()
        if not symbol:
            continue
        get_element(symbol)  # validates the element exists, raises ValueError otherwise
        value = float(raw_value)
        if value <= 0:
            raise ValueError(f"{label.capitalize()} for '{symbol}' must be greater than 0.")
        normalized_symbol = symbol[:1].upper() + symbol[1:].lower()
        cleaned[normalized_symbol] = cleaned.get(normalized_symbol, 0.0) + value

    if not cleaned:
        raise ValueError(f"At least one element {label} is required.")

    total = sum(cleaned.values())
    if total <= 0:
        raise ValueError(f"Element {label}s must sum to more than 0.")

    return cleaned


def stoichiometry_from_weight_fractions(weight_fractions: Dict[str, float]) -> Dict[str, float]:
    """Convert user-entered {element: weight_fraction} into relative mole quantities.

    n_i is proportional to w_i / A_i. Any input scale works (percentages,
    fractions summing to 1, arbitrary masses) since everything downstream is
    re-normalized (mass fractions, mole fractions) from these relative
    quantities.
    """
    cleaned = _normalize_fraction_input(weight_fractions, "weight fraction")

    stoichiometry = {}
    for element, weight in cleaned.items():
        atomic_weight = get_element(element)["atomic_weight"]
        stoichiometry[element] = weight / atomic_weight

    return stoichiometry


def stoichiometry_from_mole_fractions(mole_fractions: Dict[str, float]) -> Dict[str, float]:
    """Convert user-entered {element: mole_fraction} into relative mole quantities.

    Mole fractions already ARE relative mole quantities (n_i is proportional
    to x_i), so this just validates and normalizes the input.
    """
    return _normalize_fraction_input(mole_fractions, "mole fraction")
