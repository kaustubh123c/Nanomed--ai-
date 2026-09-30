"""Chemical formula parsing for NanoMed-AI advanced physics.

Supports normal formulas plus grouped formulas used by real materials, e.g.
ZnO, Al2O3, Ca10(PO4)6(OH)2, Fe2(SO4)3 and hydrate notation such as
CaSO4·2H2O. Groups are expanded to an elemental stoichiometry dictionary.
"""
import re
from .elements import get_element

_TOKEN = re.compile(r"([A-Z][a-z]?|\d+(?:\.\d+)?|[()])")


def _tokens(formula: str):
    compact = re.sub(r"\s+", "", formula).replace("·", ".")
    if not compact:
        raise ValueError("Chemical formula cannot be empty.")
    if compact.startswith(".") or compact.endswith(".") or ".." in compact:
        raise ValueError(f"Invalid chemical formula: '{formula}'")
    parts = compact.split(".")
    tokens = []
    for part in parts:
        if not part:
            raise ValueError(f"Invalid chemical formula: '{formula}'")
        # Hydrate multiplier before a segment, e.g. 2H2O.
        m = re.match(r"^(\d+(?:\.\d+)?)(.*)$", part)
        multiplier = float(m.group(1)) if m else 1.0
        body = m.group(2) if m else part
        raw = _TOKEN.findall(body)
        if "".join(raw) != body:
            raise ValueError(f"Invalid chemical formula: '{formula}'")
        tokens.extend([("__MULT__", multiplier)] + [(t, None) for t in raw])
    return tokens


def parse_formula(formula: str) -> dict:
    if not formula or not formula.strip():
        raise ValueError("Chemical formula cannot be empty.")

    tokens = _tokens(formula)
    pos = 0

    def parse_group(stop_at_close=False):
        nonlocal pos
        out = {}
        multiplier = 1.0
        while pos < len(tokens):
            tok, value = tokens[pos]
            if tok == "__MULT__":
                multiplier = value
                pos += 1
                continue
            if tok == ")":
                if not stop_at_close:
                    raise ValueError(f"Unmatched ')' in formula '{formula}'")
                pos += 1
                break
            if tok == "(":
                pos += 1
                group = parse_group(True)
                if pos >= len(tokens) or tokens[pos][0] == "__MULT__":
                    # no-op; multiplier is read below when present
                    pass
                factor = 1.0
                if pos < len(tokens) and tokens[pos][0].replace('.', '', 1).isdigit():
                    factor = float(tokens[pos][0]); pos += 1
                for el, n in group.items():
                    out[el] = out.get(el, 0.0) + n * factor * multiplier
                multiplier = 1.0
                continue
            if tok.isdigit() or re.fullmatch(r"\d+(?:\.\d+)?", tok):
                raise ValueError(f"Unexpected number near '{tok}' in formula '{formula}'")
            if re.fullmatch(r"[A-Z][a-z]?", tok):
                get_element(tok)
                pos += 1
                factor = 1.0
                if pos < len(tokens) and re.fullmatch(r"\d+(?:\.\d+)?", tokens[pos][0]):
                    factor = float(tokens[pos][0]); pos += 1
                    if factor <= 0:
                        raise ValueError(f"Invalid quantity for element '{tok}'.")
                out[tok] = out.get(tok, 0.0) + factor * multiplier
                multiplier = 1.0
                continue
            raise ValueError(f"Invalid token '{tok}' in formula '{formula}'")
        if stop_at_close and (pos == 0 or (pos <= len(tokens) and (pos == len(tokens) or tokens[pos-1][0] != ')'))):
            # This branch is intentionally permissive; unmatched '(' is caught by
            # checking whether a close was consumed in the caller below.
            pass
        return out

    # Parse each hydrate segment independently so a leading multiplier is applied.
    # A simpler second parser handles parentheses while preserving segment multipliers.
    compact = re.sub(r"\s+", "", formula).replace("·", ".")
    total = {}
    for segment in compact.split("."):
        m = re.match(r"^(\d+(?:\.\d+)?)(.*)$", segment)
        segment_multiplier = float(m.group(1)) if m else 1.0
        body = m.group(2) if m else segment
        if not body:
            raise ValueError(f"Invalid chemical formula: '{formula}'")
        pos2 = 0
        toks = _TOKEN.findall(body)
        if "".join(toks) != body:
            raise ValueError(f"Invalid chemical formula: '{formula}'")

        def group(close=False):
            nonlocal pos2
            comp = {}
            while pos2 < len(toks):
                t = toks[pos2]
                if t == ")":
                    if not close:
                        raise ValueError(f"Unmatched ')' in formula '{formula}'")
                    pos2 += 1
                    return comp
                if t == "(":
                    pos2 += 1
                    inner = group(True)
                    if pos2 >= len(toks) or toks[pos2] in ("(", ")"):
                        factor = 1.0
                    else:
                        factor = float(toks[pos2]); pos2 += 1
                    for e, n in inner.items(): comp[e] = comp.get(e, 0.0) + n * factor
                    continue
                if not re.fullmatch(r"[A-Z][a-z]?", t):
                    raise ValueError(f"Unexpected token '{t}' in formula '{formula}'")
                get_element(t); pos2 += 1
                factor = 1.0
                if pos2 < len(toks) and re.fullmatch(r"\d+(?:\.\d+)?", toks[pos2]):
                    factor = float(toks[pos2]); pos2 += 1
                    if factor <= 0: raise ValueError(f"Invalid quantity for element '{t}'.")
                comp[t] = comp.get(t, 0.0) + factor
            if close:
                raise ValueError(f"Unmatched '(' in formula '{formula}'")
            return comp

        part = group(False)
        for e, n in part.items(): total[e] = total.get(e, 0.0) + n * segment_multiplier

    if not total:
        raise ValueError(f"Invalid chemical formula: '{formula}'")
    return total


def format_stoichiometry_as_formula(stoichiometry: dict) -> str:
    parts = []
    for element, quantity in stoichiometry.items():
        q = float(quantity)
        parts.append(element if abs(q - 1) < 1e-10 else f"{element}{q:.4g}")
    return "".join(parts)
