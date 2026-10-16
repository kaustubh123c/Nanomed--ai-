from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Response
from pydantic import BaseModel, Field, model_validator

from app.chatbot.ai.orchestrator import process_message
from app.chatbot.config import MODEL_NAME
from app.chatbot.ai.memory import get_history, clear_history
from app.core.config import settings
from app.core.deps import get_optional_user
from app.models.user import UserOut
import uuid
import logging
from app.physics.advanced import service as physics_service
from app.physics.advanced.components import VALID_SOURCES

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    question: str
    answer: str


class ConfigureRequest(BaseModel):
    api_key: str


class MaterialComparisonItem(BaseModel):
    formula: str = Field(..., min_length=1, max_length=500)
    density_g_cm3: float = Field(..., gt=0)


class MaterialComparisonRequest(BaseModel):
    materials: list[MaterialComparisonItem] = Field(..., min_length=2, max_length=12)
    energy_MeV: float = Field(..., gt=0)
    thickness_cm: float = Field(..., ge=0)
    data_source: Optional[str] = None


@router.get("/status")
async def chatbot_status():
    """Return safe chatbot configuration status without exposing the secret key."""
    configured = bool(settings.GEMINI_API_KEY.strip())
    from app.chatbot.ai import llm
    return {
        "configured": configured,
        "provider": "Google Gemini",
        "model": llm.active_model(),
        "message": "Gemini API key loaded. Send a message to test it." if configured else "Gemini API key is missing. Add GEMINI_API_KEY to backend/.env.",
    }




@router.post("/configure")
async def configure_gemini(payload: ConfigureRequest, request: Request):
    """Configure Gemini for a local development/demo instance.

    This endpoint is intentionally localhost-only so a browser can configure
    the key without exposing a public server-side credential-management API.
    The key is written to the local backend .env and applied immediately.
    """
    host = request.client.host if request.client else ""
    if host not in {"127.0.0.1", "localhost", "::1"}:
        raise HTTPException(status_code=403, detail="Gemini setup is available only from the local machine.")

    key = payload.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="Gemini API key is required.")
    if len(key) < 20:
        raise HTTPException(status_code=400, detail="The Gemini API key looks too short. Check the key and try again.")

    from pathlib import Path
    env_path = Path(__file__).resolve().parents[2] / ".env"
    lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []
    found = False
    output = []
    for line in lines:
        if line.startswith("GEMINI_API_KEY="):
            output.append(f"GEMINI_API_KEY={key}")
            found = True
        else:
            output.append(line)
    if not found:
        output.append(f"GEMINI_API_KEY={key}")
    env_path.write_text("\n".join(output) + "\n", encoding="utf-8")

    settings.GEMINI_API_KEY = key

    # Reset the cached SDK client so the new key is used immediately.
    from app.chatbot.ai import llm
    llm._client = None

    return {"configured": True, "provider": "Google Gemini", "model": MODEL_NAME, "message": "Gemini API key configured successfully."}

def _chat_user_key(request: Request, current_user: Optional[UserOut]) -> str:
    if current_user is not None:
        return str(current_user.id)
    key = request.cookies.get("nanomed_chat_session")
    if not key:
        # One id per request: cached on request.state so every call in this
        # request (and the cookie we set) agree on the same session.
        key = getattr(request.state, "chat_session_id", None)
        if not key:
            key = uuid.uuid4().hex
            request.state.chat_session_id = key
    return f"session:{key}"


def _ensure_session_cookie(request: Request, response: Response, current_user: Optional[UserOut]) -> None:
    if current_user is None and not request.cookies.get("nanomed_chat_session"):
        sid = getattr(request.state, "chat_session_id", None)
        if sid:
            response.set_cookie("nanomed_chat_session", sid, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 30)


@router.post("/upload-pdf")
async def upload_pdf(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    current_user: Optional[UserOut] = Depends(get_optional_user),
):
    user_key = _chat_user_key(request, current_user)
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    if file.size is not None and file.size > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF must be 15 MB or smaller.")
    try:
        from app.chatbot.tools.rag.user_pdf_store import ingest_pdf
        result = ingest_pdf(user_key, file, file.filename)
    except Exception as exc:
        detail = str(exc) if str(exc) else "We couldn't process that PDF."
        raise HTTPException(status_code=400, detail=detail)
    _ensure_session_cookie(request, response, current_user)
    return {"ok": True, **result}


@router.get("/pdf-status")
async def pdf_status(
    request: Request,
    current_user: Optional[UserOut] = Depends(get_optional_user),
):
    user_key = _chat_user_key(request, current_user)
    from app.chatbot.tools.rag.user_pdf_store import has_pdf, pdf_name
    return {"uploaded": has_pdf(user_key), "filename": pdf_name(user_key) if has_pdf(user_key) else None}


@router.delete("/pdf")
async def remove_pdf(
    request: Request,
    current_user: Optional[UserOut] = Depends(get_optional_user),
):
    user_key = _chat_user_key(request, current_user)
    from app.chatbot.tools.rag.user_pdf_store import delete_pdf
    return {"ok": True, "removed": delete_pdf(user_key)}


@router.get("/history")
async def chat_history(
    request: Request,
    response: Response,
    current_user: Optional[UserOut] = Depends(get_optional_user),
):
    user_key = _chat_user_key(request, current_user)
    _ensure_session_cookie(request, response, current_user)
    return {"messages": get_history(user_key)}


@router.delete("/history")
async def clear_chat_history(
    request: Request,
    current_user: Optional[UserOut] = Depends(get_optional_user),
):
    user_key = _chat_user_key(request, current_user)
    clear_history(user_key)
    from app.chatbot.ai import memory
    memory.clear_pending(user_key)
    return {"ok": True}


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    request: Request,
    response: Response,
    current_user: Optional[UserOut] = Depends(get_optional_user),
):
    question = payload.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    user_key = _chat_user_key(request, current_user)
    _ensure_session_cookie(request, response, current_user)
    try:
        answer = await process_message(question, current_user, user_key=user_key)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception:
        logger.exception("NanoMed chatbot request failed")
        raise HTTPException(
            status_code=503,
            detail="The AI service is temporarily unavailable. Check the backend terminal for the underlying error, then try again.",
        )

    return ChatResponse(question=question, answer=answer)


@router.delete("/chat")
async def clear_chat_endpoint(
    request: Request,
    current_user: Optional[UserOut] = Depends(get_optional_user),
):
    """Compatibility endpoint used by the chatbot's New Chat control."""
    user_key = _chat_user_key(request, current_user)
    clear_history(user_key)
    from app.chatbot.ai import memory
    memory.clear_pending(user_key)
    return {"ok": True}


@router.post("/compare-materials")
async def compare_materials(payload: MaterialComparisonRequest):
    """Run real physics calculations for several materials using the same
    shielding engine as the advanced calculator; this does not rely on LLM text."""
    source = payload.data_source or settings.MAC_DATA_SOURCE
    if source not in VALID_SOURCES:
        raise HTTPException(status_code=400, detail=f"data_source must be one of {list(VALID_SOURCES)}")

    results = []
    for material in payload.materials:
        try:
            calc = physics_service.calculate_shielding(
                formula=material.formula,
                density_g_cm3=material.density_g_cm3,
                thickness_cm=payload.thickness_cm,
                energy_mev=payload.energy_MeV,
                data_source=source,
            )
            results.append({
                "formula": material.formula,
                "density_g_cm3": material.density_g_cm3,
                "energy_MeV": payload.energy_MeV,
                "thickness_cm": payload.thickness_cm,
                "data_source": source,
                "mac_cm2_g": calc.get("mac_cm2_g"),
                "lac_cm1": calc.get("lac_cm1"),
                "hvl_cm": calc.get("hvl_cm"),
                "tvl_cm": calc.get("tvl_cm"),
                "mfp_cm": calc.get("mfp_cm"),
                "rse_percent": calc.get("rse_percent"),
                "zeff": calc.get("zeff"),
                "status": "calculated" if calc.get("lac_cm1") is not None else "partial",
                "warnings": [
                    v.get("reason") for v in calc.get("availability", {}).values()
                    if isinstance(v, dict) and v.get("reason")
                ],
            })
        except (ValueError, KeyError, LookupError, ZeroDivisionError, RuntimeError) as exc:
            results.append({
                "formula": material.formula,
                "density_g_cm3": material.density_g_cm3,
                "status": "unavailable",
                "error": str(exc),
            })

    results.sort(key=lambda item: item.get("rse_percent") if item.get("rse_percent") is not None else -1, reverse=True)
    return {
        "energy_MeV": payload.energy_MeV,
        "thickness_cm": payload.thickness_cm,
        "data_source": source,
        "results": results,
        "note": "Ranking is based on calculated RSE at the specified energy and thickness. Verify model/data-source assumptions and validate critical designs independently.",
    }
