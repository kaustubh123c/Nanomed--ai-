"""NanoMed chatbot configuration."""
PROJECT_NAME = "NanoMed"
VERSION = "1.0.0"

# Stable Gemini model suitable for the installed google-genai SDK.
MODEL_NAME = "gemini-2.5-flash"
FALLBACK_MODEL_NAME = "gemini-2.5-flash-lite"

TEMPERATURE = 0.3
MAX_OUTPUT_TOKENS = 2048

DEFAULT_RESPONSE = (
    "Sorry, I couldn't understand your request. "
    "Please try asking in a different way."
)
