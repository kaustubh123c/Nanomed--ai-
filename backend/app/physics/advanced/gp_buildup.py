"""
G-P (Geometric Progression) exposure/energy-absorption buildup factor model.

Ported from Physics-AI's `physics/gp.py` + `physics/gp_repository.py` +
`physics/ebf.py` + `physics/eabf.py`. Purely local CSV data (ANSI/ANS-6.4.3
style coefficients) -- no network dependency either way.
"""

import csv
import math
from pathlib import Path
from typing import Dict, List

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "gp_parameters" / "ans643_gp_coefficients.csv"

_CACHE: List[Dict] | None = None


# ---------------------------------------------------------------------------
# G-P formula
# ---------------------------------------------------------------------------

def _calculate_k(penetration_mfp: float, a: float, c: float, xk: float, d: float) -> float:
    if not 0 <= penetration_mfp <= 40:
        raise ValueError("G-P buildup factors support penetration from 0 to 40 mfp.")
    if xk <= 0:
        raise ValueError("Xk must be greater than zero.")
    x = penetration_mfp
    t = math.tanh(-2.0)
    return c * (x ** a) + d * ((math.tanh(x / xk - 2.0) - t) / (1.0 - t))


def calculate_gp_buildup_factor(penetration_mfp: float, a: float, b: float, c: float, xk: float, d: float) -> float:
    if penetration_mfp == 0:
        return 1.0
    k = _calculate_k(penetration_mfp, a, c, xk, d)
    if abs(k - 1.0) < 1e-12:
        return 1.0 + (b - 1.0) * penetration_mfp
    return 1.0 + (b - 1.0) * ((k ** penetration_mfp - 1.0) / (k - 1.0))


def calculate_ebf(penetration: float, a: float, b: float, c: float, Xk: float, d: float) -> float:
    """Exposure buildup factor."""
    return calculate_gp_buildup_factor(penetration, a, b, c, Xk, d)


def calculate_eabf(penetration: float, a: float, b: float, c: float, Xk: float, d: float) -> float:
    """Energy-absorption buildup factor (same G-P formula, EABF-fitted coefficients)."""
    return calculate_gp_buildup_factor(penetration, a, b, c, Xk, d)


# ---------------------------------------------------------------------------
# Coefficient repository
# ---------------------------------------------------------------------------

def _load_coefficients(path: Path = DATA_FILE) -> List[Dict]:
    global _CACHE
    if _CACHE is not None:
        return _CACHE
    with open(path, encoding="utf-8", newline="") as f:
        _CACHE = [
            {**r, "Z": int(r["Z"]), "energy_MeV": float(r["energy_MeV"]),
             **{k: float(r[k]) for k in ("a", "b", "c", "Xk", "d")}}
            for r in csv.DictReader(f) if r["b"]
        ]
    return _CACHE


def _energy_interp(rows: List[Dict], energy: float) -> Dict:
    rows = sorted(rows, key=lambda r: r["energy_MeV"])
    if not rows or energy < rows[0]["energy_MeV"] or energy > rows[-1]["energy_MeV"]:
        raise ValueError("G-P EBF/EABF supports 0.015-15.000 MeV.")
    for r1, r2 in zip(rows, rows[1:]):
        if r1["energy_MeV"] <= energy <= r2["energy_MeV"]:
            if r1["energy_MeV"] == r2["energy_MeV"]:
                return r1
            f = (math.log(energy) - math.log(r1["energy_MeV"])) / (
                math.log(r2["energy_MeV"]) - math.log(r1["energy_MeV"])
            )
            return {k: r1[k] + f * (r2[k] - r1[k]) for k in ("a", "b", "c", "Xk", "d")}
    return rows[-1]


def get_gp_parameters(energy: float, z_eq: float, response: str, path: Path = DATA_FILE) -> Dict:
    if not 0.015 <= energy <= 15.0:
        raise ValueError("G-P EBF/EABF supports 0.015-15.000 MeV.")

    rows = [r for r in _load_coefficients(path) if r["response"].upper() == response.upper()]
    zs = sorted({r["Z"] for r in rows})
    lo = [z for z in zs if z <= z_eq]
    hi = [z for z in zs if z >= z_eq]
    if not lo or not hi:
        raise ValueError("Zeq is outside the available G-P reference range.")

    z1, z2 = lo[-1], hi[0]
    p1 = _energy_interp([r for r in rows if r["Z"] == z1], energy)
    if z1 == z2:
        return p1
    p2 = _energy_interp([r for r in rows if r["Z"] == z2], energy)
    l1, l2, le = math.log(z1), math.log(z2), math.log(z_eq)
    return {k: (p1[k] * (l2 - le) + p2[k] * (le - l1)) / (l2 - l1) for k in ("a", "b", "c", "Xk", "d")}
