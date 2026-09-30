"""Robust Gemini text generation for NanoMed.

Uses the Gemini REST generateContent endpoint directly so current Gemini
standard/auth keys work even when the installed Python SDK is old.  The
response is kept behind this wrapper so the rest of NanoMed does not care
which transport is used.
"""
import time
from typing import Optional

import requests

from app.chatbot.config import MODEL_NAME, FALLBACK_MODEL_NAME
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
    local = _local_answer(message)
    if local is not None:
        return local

    last_error: Optional[Exception] = None
    for model in (MODEL_NAME, FALLBACK_MODEL_NAME):
        for attempt in range(2):
            try:
                return _request_model(model, message)
            except Exception as exc:
                last_error = exc
                if not _is_retryable(exc) or attempt == 1:
                    break
                time.sleep(1.0)

    # Keep the UI friendly, but give the local developer enough information to
    # diagnose configuration/network problems in the terminal.
    if last_error:
        print(f"[NanoMed Gemini] {last_error}")
        text = str(last_error).lower()
        if "401" in text or "403" in text or "api key" in text or "permission" in text:
            return "Gemini rejected the API key or its permissions. Create a new Gemini API key in Google AI Studio and replace GEMINI_API_KEY in backend/.env."
        if "429" in text or "resource exhausted" in text or "high demand" in text:
            return "Gemini is temporarily busy or rate-limited. Please try again in a moment."
        if "timeout" in text or "connection" in text or "name or service" in text:
            return "NanoMed could not connect to Gemini. Check your internet connection and firewall, then try again."
    return "I couldn't reach Gemini right now. Please check the backend terminal for the Gemini error and try again."
