"""Session-isolated storage and retrieval for user-uploaded PDFs."""
from __future__ import annotations
import hashlib, json, re, shutil
from pathlib import Path
from threading import Lock
import numpy as np

from app.chatbot.tools.rag.embeddings import create_embeddings
from app.chatbot.tools.rag.loader import load_documents
from app.chatbot.tools.rag.splitter import split_documents

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads"
MAX_DISTANCE = 1.6
_registry: dict[str, dict[str, object]] = {}
_lock = Lock()

def _digest(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()

def _session_dir(key: str) -> Path:
    return UPLOAD_ROOT / _digest(key)[:32]

def _data_dir(key: str) -> Path:
    return _session_dir(key) / "vectors"

def _load(key: str):
    d = _data_dir(key)
    ef, df = d / "embeddings.npy", d / "documents.json"
    if not ef.exists() or not df.exists():
        return np.empty((0,0), dtype=np.float32), []
    try:
        return np.load(ef), json.loads(df.read_text(encoding="utf-8"))
    except Exception:
        return np.empty((0,0), dtype=np.float32), []

class UploadedPdfError(ValueError):
    pass

def has_pdf(key: str) -> bool:
    emb, docs = _load(key)
    return bool(docs) and emb.size > 0

def pdf_name(key: str) -> str:
    with _lock:
        return str(_registry.get(key, {}).get("name") or "your uploaded PDF")

def set_active(key: str, active: bool) -> None:
    with _lock:
        _registry.setdefault(key, {})["active"] = active

def is_active(key: str) -> bool:
    with _lock:
        return bool(_registry.get(key, {}).get("active"))

def ingest_pdf(key: str, upload_file, original_filename: str) -> dict:
    if not key:
        raise UploadedPdfError("Missing chat session.")
    raw = Path(original_filename or "").name
    name = re.sub(r"[^A-Za-z0-9._ -]+", "_", raw).strip(" .") or "upload.pdf"
    if not name.lower().endswith(".pdf"):
        raise UploadedPdfError("Only PDF files are supported.")

    session_dir = _session_dir(key)
    if session_dir.exists():
        shutil.rmtree(session_dir, ignore_errors=True)
    session_dir.mkdir(parents=True, exist_ok=True)
    incoming = session_dir / "incoming.pdf"
    try:
        with open(incoming, "wb") as out:
            shutil.copyfileobj(upload_file.file, out)
        if incoming.stat().st_size == 0:
            raise UploadedPdfError("That PDF is empty.")
        if incoming.stat().st_size > 15 * 1024 * 1024:
            raise UploadedPdfError("PDF must be 15 MB or smaller.")
        if b"%PDF-" not in incoming.read_bytes()[:1024]:
            raise UploadedPdfError("That file is not a valid PDF.")

        documents = load_documents(str(session_dir))
        chunks = split_documents(documents) if documents else []
        if not chunks:
            raise UploadedPdfError("We couldn't extract text from this PDF. It may be scanned or corrupted.")
        texts = [c.page_content for c in chunks]
        embeddings = np.asarray(create_embeddings(texts), dtype=np.float32)
        d = _data_dir(key); d.mkdir(parents=True, exist_ok=True)
        np.save(d / "embeddings.npy", embeddings)
        (d / "documents.json").write_text(json.dumps(
            [{"text": t, "source": name} for t in texts], ensure_ascii=False
        ), encoding="utf-8")
        with _lock:
            _registry[key] = {"name": name, "active": True}
        return {"filename": name, "chunks": len(texts)}
    except UploadedPdfError:
        raise
    except Exception as exc:
        raise UploadedPdfError("We couldn't process that PDF. Please try re-uploading it.") from exc
    finally:
        try: incoming.unlink()
        except Exception: pass

def retrieve(key: str, query: str, n_results: int = 4) -> list[dict]:
    emb, docs = _load(key)
    if not docs or emb.size == 0:
        return []
    q = np.asarray(create_embeddings([query])[0], dtype=np.float32)
    qn = np.linalg.norm(q) or 1.0
    dn = np.linalg.norm(emb, axis=1); dn[dn == 0] = 1.0
    sims = (emb @ q) / (dn * qn)
    indices = np.argsort(-sims)[:min(n_results, len(docs))]
    matches=[]
    for i in indices:
        distance=float(1.0-sims[i])
        if distance <= MAX_DISTANCE:
            item=docs[i]
            matches.append({"text": item["text"], "source": item.get("source") or pdf_name(key), "distance": distance})
    return matches

def delete_pdf(key: str) -> bool:
    existed = has_pdf(key)
    shutil.rmtree(_session_dir(key), ignore_errors=True)
    with _lock:
        _registry.pop(key, None)
    return existed
