"""Robust Gemini text generation for NanoMed.

Uses the Gemini REST generateContent endpoint directly so current Gemini
standard/auth keys work even when the installed Python SDK is old.  The
response is kept behind this wrapper so the rest of NanoMed does not care
which transport is used.
"""
import time
from typing import Optional

import requests

from app.chatbot.config import MODEL_NAME, FALLBACK_MODELS
from app.core.config import settings

_client = None  # cached google-genai SDK client; reset by /chatbot/configure


def _get_api_key() -> str:
    key = settings.GEMINI_API_KEY.strip()
    if not key:
        raise ValueError(
            "GEMINI_API_KEY is not set. Add it to backend/.env to enable the AI chatbot."
        )
    return key


def _get_client():
    """Returns a cached google-genai SDK client, used only by the native
    Gemini function-calling path in app/chatbot/ai/agent.py (structured
    action detection). Plain text replies go through _request_model's raw
    REST call above instead, since that path is resilient to SDK version
    drift. Raises ValueError if no API key is configured."""
    global _client
    if _client is None:
        from google import genai

        _client = genai.Client(api_key=_get_api_key())
    return _client


def _local_answer(message: str) -> Optional[str]:
    text = message.strip().lower()
    greetings = {"hi", "hello", "hey", "hii", "helo", "good morning", "good evening", "good afternoon"}
    if text in greetings:
        return (
            "Hi! I'm the NanoMed AI Assistant. 👋\n\n"
            "I can help with radiation shielding, gamma-ray attenuation, materials, "
            "density, HVL, MFP, formulas, simulations, and the NanoMed dashboard."
        )
    if "what is density" in text or text in {"density", "define density"}:
        return (
            "Density is the mass of a material per unit volume.\n\n"
            "Formula: ρ = m / V\n\n"
            "where ρ is density, m is mass, and V is volume. "
            "Common material units are g/cm³ and kg/m³."
        )
    return None


_working_model: Optional[str] = None  # last model that answered successfully
_discovered: Optional[list] = None    # cached ListModels result


def _discover_models() -> list:
    """Ask the API which models this key may call (generateContent), Flash
    models first. Used only when every configured name returns 404."""
    global _discovered
    if _discovered is not None:
        return _discovered
    key = _get_api_key()
    resp = requests.get(
        "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
        headers={"x-goog-api-key": key},
        timeout=20,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Gemini ListModels HTTP {resp.status_code}: {resp.text[:300]}")
    names = []
    for m in resp.json().get("models", []):
        if "generateContent" not in m.get("supportedGenerationMethods", []):
            continue
        n = m.get("name", "").replace("models/", "")
        low = n.lower()
        if "flash" in low and not any(x in low for x in ("image", "tts", "live", "audio", "robotics", "computer", "embedding")):
            names.append(n)
    # stable names (no -preview/-exp) first, newest version first
    names.sort(key=lambda n: (("preview" in n or "exp" in n), n), reverse=False)
    names.sort(key=lambda n: n.split("-")[1] if n.startswith("gemini-") and len(n.split("-")) > 1 else "", reverse=True)
    _discovered = names
    return names


def active_model() -> str:
    """Model name for other modules (e.g. the function-calling agent)."""
    return _working_model or MODEL_NAME


def _request_model(model: str, message: str) -> str:
    key = _get_api_key()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": message}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 2048},
    }
    response = requests.post(
        url,
        headers={"x-goog-api-key": key, "Content-Type": "application/json"},
        json=payload,
        timeout=45,
    )
    if response.status_code >= 400:
        detail = response.text[:800]
        raise RuntimeError(f"Gemini HTTP {response.status_code}: {detail}")
    data = response.json()
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip()
    if not text:
        raise RuntimeError("Gemini returned an empty response")
    return text


def _is_retryable(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(x in text for x in ("429", "500", "502", "503", "504", "unavailable", "high demand", "resource exhausted", "timeout"))


def ask_gemini(message: str) -> str:
    global _working_model
    local = _local_answer(message)
    if local is not None:
        return local

    last_error: Optional[Exception] = None
    chain = []
    for m in [_working_model, MODEL_NAME, *FALLBACK_MODELS]:
        if m and m not in chain:
            chain.append(m)

    def _try(models):
        global _working_model
        nonlocal last_error
        saw_404 = False
        for model in models:
            for attempt in range(2):
                try:
                    out = _request_model(model, message)
                    _working_model = model
                    return out, saw_404
                except Exception as exc:
                    last_error = exc
                    if "HTTP 404" in str(exc) or "NOT_FOUND" in str(exc):
                        saw_404 = True
                        break  # model name not available to this key
                    if not _is_retryable(exc) or attempt == 1:
                        break
                    time.sleep(1.0)
        return None, saw_404

    out, saw_404 = _try(chain)
    if out is not None:
        return out
    if saw_404:
        # Configured names are unavailable (retired/renamed): discover a live one.
        try:
            extra = [m for m in _discover_models() if m not in chain][:4]
            out, _ = _try(extra)
            if out is not None:
                return out
        except Exception as exc:
            last_error = exc

    # Keep the UI friendly, but give the local developer enough information to
    # diagnose configuration/network problems in the terminal.
    if last_error:
        print(f"[NanoMed Gemini] {last_error}")
        text = str(last_error).lower()
        if "401" in text or "403" in text or "api key" in text or "permission" in text:
            return "Gemini rejected the API key or its permissions. Create a new Gemini API key in Google AI Studio and replace GEMINI_API_KEY in backend/.env."
        if "429" in text or "resource exhausted" in text or "high demand" in text:
            return "Gemini is temporarily busy or rate-limited. Please try again in a moment."
        if "404" in text or "not_found" in text:
            return "None of the configured Gemini models are available for this key. Set GEMINI_MODEL in backend/.env to a current model (for example gemini-3.5-flash) and restart the backend."
        if "timeout" in text or "connection" in text or "name or service" in text:
            return "NanoMed could not connect to Gemini. Check your internet connection and firewall, then try again."
    return "I couldn't reach Gemini right now. Please check the backend terminal for the Gemini error and try again."
