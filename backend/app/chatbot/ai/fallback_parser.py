"""
No-LLM fallback command parser.

If GEMINI_API_KEY isn't set (or the Gemini call fails for any reason), the
chatbot should still be able to *do* things — this module recognizes a
small set of structured natural-language patterns and extracts the same
argument shape the Gemini function-calling path would produce, so both
paths hand off to the exact same `actions.py` functions.

This intentionally favors "understands a clear command reliably" over
"understands anything" — for genuinely open-ended phrasing, the Gemini
path (when available) does the heavy lifting.
"""
from __future__ import annotations

import re
from typing import Optional


NUM = r"[-+]?\d*\.?\d+"


def _normalize(text: str) -> str:
    """Treat 'atomic_number: 27' the same as 'atomic number: 27'.

    Users very naturally type snake_case field labels (they match this
    app's own API field names, e.g. from docs or by habit), but all the
    label regexes below are written for space-separated natural language.
    Turning underscores-between-letters into spaces up front means both
    styles hit the same patterns, instead of silently extracting nothing.
    """
    return re.sub(r"(?<=[a-zA-Z])_(?=[a-zA-Z])", " ", text)


def _num(pattern: str, text: str) -> Optional[float]:
    m = re.search(pattern, text, re.IGNORECASE)
    if not m:
        return None
    try:
        return float(m.group(1))
    except (ValueError, IndexError):
        return None


def _kv(label_pattern: str, text: str) -> Optional[str]:
    """Grabs the value after a label like 'name: X' / 'name X' up to the next
    comma/label boundary."""
    m = re.search(label_pattern, text, re.IGNORECASE)
    if not m:
        return None
    return m.group(1).strip().strip(",").strip()


def parse_command(message: str) -> Optional[dict]:
    """Returns {"tool": name, "args": {...}} or None if nothing matched."""
    text = _normalize(message.strip())
    low = text.lower()

    # ---------------- list actions ----------------
    if re.search(r"\b(list|show|view)\b.*\bmaterials?\b", low):
        return {"tool": "list_materials", "args": {}}
    if re.search(r"\b(list|show|view)\b.*\bexperiments?\b", low):
        return {"tool": "list_experiments", "args": {}}

    # ---------------- delete material ----------------
    m = re.search(r"\bdelete\b.*\bmaterial\b\s*(?:named|called)?\s*[:\-]?\s*(.+)", low)
    if m:
        return {"tool": "delete_material", "args": {"name": m.group(1).strip()}}

    # ---------------- create material ----------------
    # NOTE: value extraction below runs against the *original-case* `text`
    # (with re.IGNORECASE on the label) so formulas like "CuO" and names
    # keep their natural capitalization instead of coming out lowercase.
    if re.search(r"\b(create|add|register|new)\b.*\bmaterial\b", low):
        name = (
            _kv(r"\b(?:called|named)\s+([a-z0-9 ()_/-]+?)(?:,|\bformula\b|\bdensity\b|\bwith\b|$)", text)
            or _kv(r"\b(?:material\s+name|^name)\s*[:\-]?\s*([a-z0-9 ()_/-]+?)(?:,|\bformula\b|\bdensity\b|\bz\b|\batomic\b|$)", text)
        )
        args = {
            "name": name,
            "formula": _kv(r"\bformula\s*[:\-]?\s*([a-z0-9]+)", text),
            "density": _num(rf"\bdensity\s*[:\-]?\s*({NUM})", low),
            "atomic_number": _num(rf"\b(?:atomic number|z)\s*[:\-]?\s*({NUM})", low),
            "atomic_mass": _num(rf"\b(?:atomic mass|molar mass|mass)\s*[:\-]?\s*({NUM})", low),
        }
        if args["name"]:
            args["name"] = args["name"].strip().title()
        return {"tool": "create_material", "args": {k: v for k, v in args.items() if v is not None}}

    # ---------------- create experiment ----------------
    if re.search(r"\b(create|log|add|new|run|start)\b.*\bexperiment\b", low) or re.search(
        r"\b(assign|create)\b.*\bwork\b", low
    ):
        args = {
            "experiment_name": (
                _kv(r"\bexperiment\s+(?:called|named)\s+([a-z0-9 _-]+?)(?:,|\busing\b|\bwith\b|\bmaterial\b|$)", text)
                or _kv(r"\bexperiment(?:\s+name\b)?\s*[:\-]?\s*([a-z0-9 _-]+?)(?:,|\busing\b|\bwith\b|\bmaterial\b|$)", text)
            ),
            "material": _kv(r"\b(?:material|using|with)\s*[:\-]?\s*([a-z0-9 ()_/-]+?)(?:,|\bdetector\b|\bat\b|\benergy\b|\bthickness\b|$)", text),
            "detector": _kv(r"\bdetector\s*[:\-]?\s*([a-z0-9() .-]+?)(?:,|\bat\b|\benergy\b|\bthickness\b|\bsource\b|$)", text),
            "gamma_source": _kv(r"\b(?:gamma\s*source|source)\s*[:\-]?\s*([a-z0-9()\-. ]+?)(?:,|\benergy\b|\bat\b|\bthickness\b|$)", text),
            "energy_kev": _num(rf"\benergy\s*[:\-]?\s*({NUM})\s*kev", low) or _num(rf"({NUM})\s*kev", low),
            "thickness_cm": _num(rf"\bthickness\s*[:\-]?\s*({NUM})\s*cm", low) or _num(rf"({NUM})\s*cm\b", low),
            "initial_counts": _num(rf"\b(?:initial\s*)?counts\s*[:\-]?\s*({NUM})", low),
        }
        if args["experiment_name"]:
            args["experiment_name"] = args["experiment_name"].strip().title()
        return {"tool": "create_experiment", "args": {k: v for k, v in args.items() if v is not None}}

    # ---------------- run simulation ----------------
    if re.search(r"\b(run|start|perform|simulate|calculate)\b.*\b(simulation|sim|attenuation|shielding)\b", low) or re.search(r"\bsimulate\b", low):
        args = {
            "material": _kv(r"\b(?:material|using|with)\s*[:\-]?\s*([a-z0-9 ()_/-]+?)(?:,|\bdetector\b|\benergy\b|\bthickness\b|$)", text),
            "detector": _kv(r"\bdetector\s*[:\-]?\s*([a-z0-9() .-]+?)(?:,|\benergy\b|\bthickness\b|$)", text),
            "gamma_source": _kv(r"\b(?:gamma\s*source|source)\s*[:\-]?\s*([a-z0-9()\-. ]+?)(?:,|\benergy\b|\bthickness\b|$)", text),
            "energy_kev": _num(rf"\benergy\s*[:\-]?\s*({NUM})\s*kev", low) or _num(rf"({NUM})\s*kev", low),
            "thickness_cm": _num(rf"\bthickness\s*[:\-]?\s*({NUM})\s*cm", low) or _num(rf"({NUM})\s*cm\b", low),
            "target_absorption_percent": _num(rf"(?:target|goal)\s*(?:absorption)?\s*[:\-]?\s*({NUM})\s*%", low) or _num(rf"({NUM})\s*%\s*(?:absorption|target)", low),
            "initial_counts": _num(rf"(?:initial\s*)?counts\s*[:\-]?\s*({NUM})", low),
        }
        return {"tool": "run_simulation", "args": {k: v for k, v in args.items() if v is not None}}

    # ---------------- recommend material / planner ----------------
    if re.search(r"\b(recommend|suggest|what material|which material|best material)\b", low):
        args = {
            "target_absorption_percent": _num(rf"({NUM})\s*%", low) or _num(rf"({NUM})\s*percent", low),
            "energy_kev": _num(rf"({NUM})\s*kev", low),
            "detector": _kv(r"\bdetector\s*[:\-]?\s*([a-z0-9() .-]+)", text),
        }
        return {"tool": "recommend_material", "args": {k: v for k, v in args.items() if v is not None}}

    return None


# ---------------------------------------------------------------------------
# Slot-filling: extracting just the still-missing fields from a follow-up
# message, e.g. after asking "what's the density?" the user replies "19.3"
# or "density 19.3, Z 79".
# ---------------------------------------------------------------------------
NUMERIC_FIELDS = {
    "density", "atomic_number", "atomic_mass", "particle_size_nm",
    "energy_kev", "thickness_cm", "initial_counts", "temperature_c",
    "pressure_kpa", "target_absorption_percent",
}
TITLE_CASE_FIELDS = {"name", "experiment_name"}

FIELD_PATTERNS = {
    "name": r"(?:material\s+)?name\b\s*[:\-]?\s*([a-z0-9 ()_/-]+)",
    "formula": r"formula\s*[:\-]?\s*([a-z0-9]+)",
    "density": rf"density\s*[:\-]?\s*({NUM})",
    "atomic_number": rf"(?:atomic number|\bz\b)\s*[:\-]?\s*({NUM})",
    "atomic_mass": rf"(?:atomic mass|molar mass|\bmass\b)\s*[:\-]?\s*({NUM})",
    "particle_size_nm": rf"(?:particle size|size)\s*[:\-]?\s*({NUM})",
    "experiment_name": r"(?:experiment\s+name\b|\bname\b)\s*[:\-]?\s*([a-z0-9 _-]+)",
    "material": r"(?:material|using|with)\s*[:\-]?\s*([a-z0-9 ()_/-]+)",
    "detector": r"detector\s*[:\-]?\s*([a-z0-9() .-]+)",
    "gamma_source": r"(?:gamma\s*source|source)\s*[:\-]?\s*([a-z0-9()\-. ]+)",
    "energy_kev": rf"({NUM})\s*kev",
    "thickness_cm": rf"({NUM})\s*cm",
    "initial_counts": rf"counts\s*[:\-]?\s*({NUM})",
    "target_absorption_percent": rf"({NUM})\s*%",
}


def extract_missing(missing_fields: list[str], text: str) -> dict:
    """Best-effort extraction of just the requested fields from a follow-up
    reply. Falls back to treating the whole reply as the value when there's
    exactly one missing field and no label was used."""
    stripped = _normalize(text.strip())
    out: dict = {}

    for f in missing_fields:
        pattern = FIELD_PATTERNS.get(f)
        if not pattern:
            continue
        # Numeric fields never need case-sensitive matching; string fields
        # search the original-case text so values keep natural casing.
        haystack = stripped if f not in NUMERIC_FIELDS else stripped.lower()
        m = re.search(pattern, haystack, re.IGNORECASE)
        if not m:
            continue
        val = m.group(1).strip().strip(",")
        if not val:
            continue
        if f in NUMERIC_FIELDS:
            try:
                out[f] = float(val)
            except ValueError:
                continue
        else:
            out[f] = val.title() if f in TITLE_CASE_FIELDS else val

    if not out and len(missing_fields) == 1:
        f = missing_fields[0]
        if f in NUMERIC_FIELDS:
            m = re.search(NUM, stripped)
            if m:
                try:
                    out[f] = float(m.group(0))
                except ValueError:
                    pass
        elif text.strip():
            out[f] = text.strip().title() if f in TITLE_CASE_FIELDS else text.strip()

    return out
