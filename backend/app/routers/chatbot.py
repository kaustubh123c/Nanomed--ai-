from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Response
from pydantic import BaseModel

from app.chatbot.ai.orchestrator import process_message
from app.chatbot.config import MODEL_NAME
from app.chatbot.ai.memory import get_history, clear_history
from app.core.config import settings
from app.core.deps import get_optional_user
from app.models.user import UserOut
import uuid

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    question: str
    answer: str


class ConfigureRequest(BaseModel):
    api_key: str


@router.get("/status")
async def chatbot_status():
    """Return safe chatbot configuration status without exposing the secret key."""
    configured = bool(settings.GEMINI_API_KEY.strip())
    return {
        "configured": configured,
        "provider": "Google Gemini",
        "model": MODEL_NAME,
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
        return f"user:{current_user.id}"
    key = request.cookies.get("nanomed_chat_session")
    return f"session:{key}" if key else f"session:{uuid.uuid4().hex}"


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
    if current_user is None and not request.cookies.get("nanomed_chat_session"):
        # The ingest key was generated inside this request; expose it as a
        # browser-only cookie so later chat/status/remove calls use the same store.
        response.set_cookie("nanomed_chat_session", user_key.split(":", 1)[1], httponly=True, samesite="lax", max_age=60*60*24*30)
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
    current_user: Optional[UserOut] = Depends(get_optional_user),
):
    user_key = _chat_user_key(request, current_user)
    return {"messages": get_history(user_key)}


@router.delete("/history")
async def clear_chat_history(
    request: Request,
    current_user: Optional[UserOut] = Depends(get_optional_user),
):
    user_key = _chat_user_key(request, current_user)
    clear_history(user_key)
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

    try:
        answer = await process_message(
            question,
            current_user,
            user_key=_chat_user_key(request, current_user),
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="The AI service is temporarily unavailable. Please try again in a moment.",
        )

    if current_user is None and not request.cookies.get("nanomed_chat_session"):
        # Keep anonymous PDF/chat state isolated per browser.
        user_key = _chat_user_key(request, current_user)
        if user_key.startswith("session:"):
            response.set_cookie("nanomed_chat_session", user_key.split(":", 1)[1], httponly=True, samesite="lax", max_age=60*60*24*30)
    return ChatResponse(question=question, answer=answer)
