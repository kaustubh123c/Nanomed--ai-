"""Small deterministic knowledge layer for common NanoMed questions.

This keeps simple scientific questions from being misrouted to the action
agent or a stale RAG index.  It is intentionally conservative: when a value
is not known locally, the caller can fall back to Gemini.
"""
from __future__ import annotations

import csv
import re
from pathlib import Path
from typing import Optional


# Common reference values that are useful even when they are not in the
# project's nanomaterial CSV.  MgCl2 is included with an explicit note because
# its density depends on hydration state.
COMMON_MATERIALS = {
    "mgcl2": {
        "name": "Magnesium chloride (anhydrous)",
        "formula": "MgCl2",
        "density": 2.32,
        "note": "Anhydrous MgCl2. The hexahydrate (MgCl2·6H2O) has a different density.",
    },
    "magnesium chloride": {
        "name": "Magnesium chloride (anhydrous)",
        "formula": "MgCl2",
        "density": 2.32,
        "note": "Anhydrous MgCl2. The hexahydrate (MgCl2·6H2O) has a different density.",
    },
}


def _clean(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _csv_materials() -> list[dict]:
    path = Path(__file__).resolve().parents[4] / "dataset" / "materials.csv"
    if not path.exists():
        return []
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            return list(csv.DictReader(f))
    except Exception:
        return []


def find_material_reference(query: str) -> Optional[dict]:
    q = query.strip().lower()
    cq = _clean(q)
    if not cq:
        return None

    for key, value in COMMON_MATERIALS.items():
        if cq == _clean(key) or cq == _clean(value["formula"]):
            return value

    for row in _csv_materials():
        name = str(row.get("name", ""))
        formula = str(row.get("formula", ""))
        if cq in {_clean(name), _clean(formula)} or cq in _clean(name) or cq in _clean(formula):
            try:
                density = float(row.get("density", ""))
            except (TypeError, ValueError):
                continue
            return {
                "name": name,
                "formula": formula,
                "density": density,
                "note": "Value from the NanoMed materials reference dataset.",
            }
    return None


def local_answer(question: str) -> Optional[str]:
    text = question.strip()
    low = text.lower()

    if re.fullmatch(r"(hi|hello|hey|hii|helo|good morning|good afternoon|good evening)[!. ]*", low):
        return (
            "Hello! 👋 I'm your NanoMed AI Assistant. I can explain radiation shielding, "
            "material properties, gamma attenuation, formulas, and run NanoMed simulations."
        )

    # Density questions: "density of MgCl2", "what is the density of MgCl2?", etc.
    m = re.search(r"(?:what(?:'s| is)|give me|tell me)?\s*(?:the\s+)?density\s+of\s+(.+?)[?!.]*$", low)
    if m:
        ref = find_material_reference(m.group(1))
        if ref:
            return (
                f"**{ref['name']} ({ref['formula']})** has a density of approximately "
                f"**{ref['density']:g} g/cm³**.\n\n"
                f"{ref['note']}"
            )

    # Formula questions for a named/formula material.
    m = re.search(r"(?:what is|what's|give me|tell me)\s+(?:the\s+)?formula\s+of\s+(.+?)[?!.]*$", low)
    if m:
        ref = find_material_reference(m.group(1))
        if ref:
            return f"The chemical formula of **{ref['name']}** is **{ref['formula']}**."

    return None
