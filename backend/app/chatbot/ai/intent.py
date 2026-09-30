import re

# Intent keywords
INTENTS = {
    "GREETING": [
        "hello",
        "hi",
        "hey",
        "good morning",
        "good evening",
    ],

    "GENERATE_REPORT": [
        "pdf",
        "report",
        "download report",
        "generate report",
    ],

    "FORMULA_EXPLANATION": [
        "formula",
        "density",
        "hvl",
        "mfp",
        "attenuation",
    ],

    "WEBSITE_HELP": [
        "website",
        "dashboard",
        "page",
        "login",
        "upload",
    ],

    "PREDICTION": [
        "predict",
        "prediction",
        "efficiency",
    ],
}


def detect_intent(user_message: str):
    """
    Detect user intent using keyword matching.
    """

    message = user_message.lower()

    for intent, keywords in INTENTS.items():

        for keyword in keywords:

            if re.search(rf"\b{re.escape(keyword)}\b", message):

                return intent

    return "UNKNOWN"