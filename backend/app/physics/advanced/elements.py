"""
Elemental reference data (atomic number, atomic weight) for every element
used by the advanced physics engine (chemical formula parsing, Zeff/Zeq/Neff,
GP buildup factors, FNRCS).

Ported from the Physics-AI project's `material/elements.py`, adapted to load
from NanoMed AI's `app/data/elements.json`.
"""

import json
from pathlib import Path
from typing import Dict

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "elements.json"


def _load_elements() -> Dict:
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Element database not found: {DATA_FILE}")
    with open(DATA_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


ELEMENTS = _load_elements()


def get_element(symbol: str) -> Dict:
    """Look up an element's data by chemical symbol (e.g. 'Zn', 'Au')."""
    symbol = symbol.strip()
    normalized = symbol[:1].upper() + symbol[1:].lower() if symbol else symbol
    if normalized not in ELEMENTS:
        raise ValueError(f"Unknown element symbol: '{symbol}'")
    return ELEMENTS[normalized]


def get_atomic_number(symbol: str) -> int:
    return get_element(symbol)["atomic_number"]


def get_atomic_weight(symbol: str) -> float:
    return get_element(symbol)["atomic_weight"]
