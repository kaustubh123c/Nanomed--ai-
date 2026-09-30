import os
import re
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pypdf import PdfReader

from app.core.deps import get_current_user
from app.db.database import repository
from app.models.paper import ResearchPaperOut
from app.models.user import UserOut

router = APIRouter(prefix="/api/papers", tags=["Research Paper Analyzer"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "papers"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MATERIAL_KEYWORDS = [
    "gold nanoparticle", "AuNP", "bismuth oxide", "iron oxide", "Fe3O4",
    "silver nanoparticle", "AgNP", "gadolinium", "titanium dioxide", "TiO2",
    "zinc oxide", "ZnO", "tungsten", "platinum nanoparticle", "copper oxide",
    "cerium oxide", "barium sulfate", "nanomaterial", "nanoparticle",
]


def _extract_text(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _heuristic_extract(text: str, filename: str) -> dict:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    title = lines[0][:200] if lines else filename

    authors_match = re.search(r"(?im)^(?:authors?|by)\s*[:\-]?\s*(.+)$", text)
    authors = None
    if authors_match:
        authors = [a.strip() for a in re.split(r",| and ", authors_match.group(1)) if a.strip()][:8]

    materials_found = sorted(
        {kw for kw in MATERIAL_KEYWORDS if kw.lower() in text.lower()}, key=str.lower
    )

    size_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:nm|nanomet)", text, re.IGNORECASE)
    particle_size = f"{size_match.group(1)} nm" if size_match else None

    energy_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:keV|MeV)", text, re.IGNORECASE)
    energy = energy_match.group(0) if energy_match else None

    detector_match = re.search(
        r"(NaI\(Tl\)|HPGe|CdTe|Geiger[- ]?Muller|LaBr3|scintillation detector|germanium detector)",
        text,
        re.IGNORECASE,
    )
    detector = detector_match.group(0) if detector_match else None

    results_match = re.search(r"(?is)\bresults?\b[:\-]?\s*(.{0,600}?)(?:\n\s*\n|conclusion|discussion)", text)
    results = results_match.group(1).strip()[:600] if results_match else None

    conclusion_match = re.search(r"(?is)\bconclusion[s]?\b[:\-]?\s*(.{0,600})", text)
    conclusion = conclusion_match.group(1).strip()[:600] if conclusion_match else None

    return {
        "title": title,
        "authors": authors,
        "materials_mentioned": materials_found or None,
        "particle_size": particle_size,
        "energy": energy,
        "detector": detector,
        "results": results,
        "conclusion": conclusion,
    }


def _heuristic_summary(extracted: dict, text: str) -> str:
    parts = []
    if extracted.get("materials_mentioned"):
        parts.append(f"Studies {', '.join(extracted['materials_mentioned'][:4])}.")
    if extracted.get("energy"):
        parts.append(f"Gamma energy of interest: {extracted['energy']}.")
    if extracted.get("particle_size"):
        parts.append(f"Reported particle size: {extracted['particle_size']}.")
    if extracted.get("conclusion"):
        parts.append(f"Conclusion excerpt: {extracted['conclusion'][:220]}")
    if not parts:
        parts.append(text[:300].strip() + ("…" if len(text) > 300 else ""))
    return " ".join(parts)


def _maybe_llm_summary(text: str, extracted: dict) -> str | None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=350,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Summarize this gamma-ray/nanomaterial research paper in 4-5 sentences "
                        "for a radiation physics researcher. Focus on materials studied, method, "
                        "and key findings. Only use information present in the excerpt below.\n\n"
                        f"{text[:6000]}"
                    ),
                }
            ],
        )
        parts = [b.text for b in response.content if getattr(b, "type", None) == "text"]
        return "\n".join(parts).strip() or None
    except Exception:
        return None


@router.get("", response_model=list[ResearchPaperOut])
async def list_papers(current_user: UserOut = Depends(get_current_user)):
    docs = await repository.find("research_papers", {"owner_id": current_user.id})
    return [{**d, "id": d["_id"]} for d in docs]


@router.post("/upload", response_model=ResearchPaperOut)
async def upload_paper(file: UploadFile = File(...), current_user: UserOut = Depends(get_current_user)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    dest = UPLOAD_DIR / f"{int(datetime.now(timezone.utc).timestamp() * 1000)}-{file.filename}"
    content = await file.read()
    dest.write_bytes(content)

    try:
        text = _extract_text(dest)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not parse PDF: {exc}")

    extracted = _heuristic_extract(text, file.filename)
    summary = _maybe_llm_summary(text, extracted) or _heuristic_summary(extracted, text)

    doc = {
        "filename": file.filename,
        "owner_id": current_user.id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ai_summary": summary,
        **extracted,
    }
    created = await repository.insert_one("research_papers", doc)
    return {**created, "id": created["_id"]}


@router.delete("/{paper_id}", status_code=204)
async def delete_paper(paper_id: str, current_user: UserOut = Depends(get_current_user)):
    deleted = await repository.delete_one("research_papers", {"_id": paper_id, "owner_id": current_user.id})
    if not deleted:
        raise HTTPException(status_code=404, detail="Paper not found")
