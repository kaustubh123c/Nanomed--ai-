"""NanoMed chatbot configuration."""
PROJECT_NAME = "NanoMed"
VERSION = "1.0.0"

# Gemini model chain, tried in order. gemini-2.5-* models are retired by Google
# on 2026-10-16, so Gemini 3.x comes first. Override the first entry with
# GEMINI_MODEL in backend/.env. If every name fails with 404, llm.py asks the
# API which models this key can actually use and picks a Flash model.
import os
MODEL_NAME = os.getenv("GEMINI_MODEL", "").strip() or "gemini-3.5-flash"
FALLBACK_MODELS = ["gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"]
FALLBACK_MODEL_NAME = FALLBACK_MODELS[0]

TEMPERATURE = 0.3
MAX_OUTPUT_TOKENS = 2048

DEFAULT_RESPONSE = (
    "Sorry, I couldn't understand your request. "
    "Please try asking in a different way."
)
