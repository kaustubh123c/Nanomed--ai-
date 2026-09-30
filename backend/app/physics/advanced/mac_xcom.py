"""
Optional live NIST XCOM data source.

Ported from Physics-AI's `services/data_service.py`. This queries NIST's
public XCOM photon cross-section database over the network on every call --
it is NOT bundled/offline data. It requires the `requests` and
`beautifulsoup4` packages and outbound internet access to
physics.nist.gov, and will raise a clear error if either is unavailable.

This is opt-in: set MAC_DATA_SOURCE=xcom (see app/core/config.py) to use it
as the default source, or pass data_source="xcom" per-request. The offline
model in `mac_offline.py` is used otherwise.

Performance note: a single element/energy lookup is a live network round
trip, so naively calling it once per element per energy (and, worse, once
per *quantity* that needs it -- MAC, R, Zeq each used to fetch separately)
made multi-energy sweeps and material comparisons very slow. This module
now (a) memoizes every (element, energy) result for the lifetime of the
process, and (b) exposes `warm_cache`, which fetches every energy for an
element in ONE batched request via `get_xcom_components_batch`. The service
layer calls `warm_cache` once per formula before running a sweep, cutting
what used to be dozens of sequential requests down to one per element.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Tuple

XCOM_URL = "https://physics.nist.gov/cgi-bin/Xcom/xcom3_1"
XCOM_TIMEOUT_SECONDS = 20  # fail fast instead of appearing to hang

_COMPONENT_CACHE: Dict[Tuple[str, float], Dict] = {}


def clear_cache() -> None:
    _COMPONENT_CACHE.clear()


def _require_dependencies():
    try:
        import requests  # noqa: F401
        from bs4 import BeautifulSoup  # noqa: F401
    except ImportError as exc:
        raise RuntimeError(
            "Live NIST XCOM mode requires the 'requests' and 'beautifulsoup4' "
            "packages. Install them, or use the default offline data source."
        ) from exc


def get_xcom_components(element: str, energy_mev: float, atomic_number: int) -> Dict:
    """Fetch XCOM photon-interaction components for one element at one energy.

    Cached: repeated calls for the same (element, energy) reuse the first
    result instead of making another network request.
    """
    cache_key = (element, round(float(energy_mev), 6))
    if cache_key in _COMPONENT_CACHE:
        return _COMPONENT_CACHE[cache_key]

    _require_dependencies()
    import requests
    from bs4 import BeautifulSoup

    if energy_mev < 0.001 or energy_mev > 100000:
        raise ValueError("XCOM energy must be between 0.001 and 100000 MeV.")

    payload = {
        "ZNum": str(atomic_number),
        "OutOpt": "PIC",
        "Output": "on",
        "NumAdd": "1",
        "Energies": f"{energy_mev:.4f}",
        "WindowXmin": "0.001",
        "WindowXmax": "100000",
        "ResizeFlag": "on",
        "Graph0": "on",
    }

    try:
        response = requests.post(
            XCOM_URL, data=payload, headers={"User-Agent": "NanoMed-AI/1.0"},
            timeout=XCOM_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError(
            f"Unable to reach NIST XCOM for '{element}' within {XCOM_TIMEOUT_SECONDS}s: {exc}"
        ) from exc

    html = response.text
    if "XCOM: Error" in html:
        raise RuntimeError("NIST XCOM rejected the request.")

    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")
    if not tables:
        raise RuntimeError("No data table found in XCOM response.")

    target_energy = float(energy_mev)

    for table in tables:
        for row in table.find_all("tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) < 9:
                continue
            values = [cell.get_text(" ", strip=True) for cell in cells]
            try:
                row_energy = float(values[1])
            except (ValueError, IndexError):
                continue
            if abs(row_energy - target_energy) > 1e-7:
                continue
            try:
                components = {
                    "energy_MeV": row_energy,
                    "coherent_cm2_g": float(values[2]),
                    "incoherent_cm2_g": float(values[3]),
                    "photoelectric_cm2_g": float(values[4]),
                    "pair_nuclear_cm2_g": float(values[5]),
                    "pair_electron_cm2_g": float(values[6]),
                    "total_with_coherent_cm2_g": float(values[7]),
                    "total_without_coherent_cm2_g": float(values[8]),
                }
            except (ValueError, IndexError) as exc:
                raise RuntimeError("Unable to parse XCOM interaction data.") from exc
            _COMPONENT_CACHE[cache_key] = components
            return components

    raise RuntimeError(f"Energy {energy_mev} MeV was not found in the XCOM data table.")


def get_xcom_components_batch(
    element: str, energies_mev: List[float], atomic_number: int
) -> Dict[float, Dict]:
    """Fetch XCOM components for one element across several energies in one request.

    Populates the same cache `get_xcom_components` reads from, so later
    single lookups for these (element, energy) pairs are free.
    """
    if not energies_mev:
        raise ValueError("At least one XCOM energy is required.")

    normalized = list(dict.fromkeys(float(e) for e in energies_mev))
    uncached = [e for e in normalized if (element, round(e, 6)) not in _COMPONENT_CACHE]

    if uncached:
        _require_dependencies()
        import requests
        from bs4 import BeautifulSoup

        for e in uncached:
            if e < 0.001 or e > 100000:
                raise ValueError("XCOM energy must be between 0.001 and 100000 MeV.")
        if len(uncached) > 100:
            raise ValueError("XCOM batch requests cannot contain more than 100 energies.")

        payload = {
            "ZNum": str(atomic_number),
            "OutOpt": "PIC",
            "Output": "on",
            "NumAdd": "1",
            "Energies": "\n".join(f"{e:.4f}" for e in uncached),
            "WindowXmin": "0.001",
            "WindowXmax": "100000",
            "ResizeFlag": "on",
            "Graph0": "on",
        }

        try:
            response = requests.post(
                XCOM_URL, data=payload, headers={"User-Agent": "NanoMed-AI/1.0"},
                timeout=XCOM_TIMEOUT_SECONDS * 2,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise RuntimeError(f"Unable to reach NIST XCOM for '{element}': {exc}") from exc

        html = response.text
        if "XCOM: Error" in html:
            raise RuntimeError("NIST XCOM rejected the batch request.")

        soup = BeautifulSoup(html, "html.parser")
        tables = soup.find_all("table")
        if not tables:
            raise RuntimeError("No data table found in the NIST XCOM batch response.")

        requested_lookup = {round(e, 4): e for e in uncached}

        for table in tables:
            for row in table.find_all("tr"):
                cells = row.find_all(["td", "th"])
                if len(cells) < 9:
                    continue
                values = [cell.get_text(" ", strip=True) for cell in cells]
                try:
                    row_energy = float(values[1])
                except (ValueError, IndexError):
                    continue
                energy_key = round(row_energy, 4)
                if energy_key not in requested_lookup:
                    continue
                try:
                    components = {
                        "energy_MeV": row_energy,
                        "coherent_cm2_g": float(values[2]),
                        "incoherent_cm2_g": float(values[3]),
                        "photoelectric_cm2_g": float(values[4]),
                        "pair_nuclear_cm2_g": float(values[5]),
                        "pair_electron_cm2_g": float(values[6]),
                        "total_with_coherent_cm2_g": float(values[7]),
                        "total_without_coherent_cm2_g": float(values[8]),
                    }
                except (ValueError, IndexError) as exc:
                    raise RuntimeError("Unable to parse NIST XCOM batch data.") from exc
                _COMPONENT_CACHE[(element, round(requested_lookup[energy_key], 6))] = components

        missing = [e for e in uncached if (element, round(e, 6)) not in _COMPONENT_CACHE]
        if missing:
            missing_text = ", ".join(f"{e:.4f}" for e in missing)
            raise RuntimeError(f"NIST XCOM did not return data for: {missing_text} MeV.")

    return {e: _COMPONENT_CACHE[(element, round(e, 6))] for e in normalized}


def warm_cache(elements: List[str], energies_mev: List[float], atomic_numbers: Dict[str, int]) -> None:
    """Pre-fetch every (element, energy) pair needed for a sweep, one batched
    request per element, so the rest of the pipeline hits the cache instead
    of making live requests one-by-one (and 3x-over, since MAC/R/Zeq each
    used to fetch the same data separately).

    Elements are fetched concurrently (not one after another) -- for a
    2-element compound like Bi2O3, that's the time of one slow NIST round
    trip instead of two stacked back-to-back.
    """
    unique_elements = list(dict.fromkeys(elements))
    if not unique_elements:
        return

    if len(unique_elements) == 1:
        get_xcom_components_batch(unique_elements[0], energies_mev, atomic_numbers[unique_elements[0]])
        return

    with ThreadPoolExecutor(max_workers=min(8, len(unique_elements))) as pool:
        futures = {
            pool.submit(get_xcom_components_batch, element, energies_mev, atomic_numbers[element]): element
            for element in unique_elements
        }
        errors = []
        for future in as_completed(futures):
            element = futures[future]
            try:
                future.result()
            except (ValueError, RuntimeError) as exc:
                errors.append(f"{element}: {exc}")
        if errors:
            raise RuntimeError("NIST XCOM lookup failed for: " + "; ".join(errors))

