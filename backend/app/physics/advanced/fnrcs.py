"""
Fast Neutron Removal Cross Section (FNRCS).

Ported from Physics-AI's `physics/fnrcs.py` + `physics/fnrcs_repository.py`.
Purely local CSV data -- no network dependency either way.
"""

import csv
from pathlib import Path
from typing import Dict, List

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "fnrcs" / "elemental_fnrcs.csv"

_CACHE: Dict[str, Dict] | None = None


def _load_fnrcs_data(path: Path = DATA_FILE) -> Dict:
    global _CACHE
    if _CACHE is not None:
        return _CACHE

    data: Dict[str, Dict] = {}
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        headers = {h.strip().lower(): h for h in (reader.fieldnames or [])}
        required = {"element", "z", "fnrcs_mass_cm2_g"}
        missing = required - set(headers)
        if missing:
            raise ValueError(
                "FNRCS CSV is missing required columns: " + ", ".join(sorted(missing))
            )
        for row in reader:
            element = row[headers["element"]].strip()
            if not element:
                continue
            value = float(row[headers["fnrcs_mass_cm2_g"]])
            if value < 0:
                raise ValueError(f"FNRCS value for {element} cannot be negative.")
            data[element] = {"Z": int(row[headers["z"]]), "fnrcs_mass_cm2_g": value}

    _CACHE = data
    return data


def get_elemental_fnrcs(elements: List[str], path: Path = DATA_FILE) -> Dict[str, float]:
    database = _load_fnrcs_data(path)
    missing = [e for e in elements if e not in database]
    if missing:
        raise ValueError("FNRCS elemental data unavailable for: " + ", ".join(sorted(missing)))
    return {e: database[e]["fnrcs_mass_cm2_g"] for e in elements}


def calculate_fnrcs(
    density: float, mass_fractions: Dict[str, float], elemental_fnrcs: Dict[str, float]
) -> float:
    """Macroscopic FNRCS (cm^-1): density * sum(w_i * FNRCS_i)."""
    if density <= 0:
        raise ValueError("Density must be greater than zero.")
    if not mass_fractions:
        raise ValueError("Mass fractions cannot be empty.")
    if not elemental_fnrcs:
        raise ValueError("Elemental FNRCS data cannot be empty.")
    if abs(sum(mass_fractions.values()) - 1.0) > 1e-6:
        raise ValueError("Mass fractions must sum to 1.")

    missing = set(mass_fractions) - set(elemental_fnrcs)
    if missing:
        raise ValueError("Missing elemental FNRCS values for: " + ", ".join(sorted(missing)))

    mixture = sum(mass_fractions[e] * elemental_fnrcs[e] for e in mass_fractions)
    return density * mixture
