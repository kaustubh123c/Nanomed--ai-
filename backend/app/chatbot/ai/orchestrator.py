from typing import Optional

from app.chatbot.ai import agent
from app.chatbot.ai.intent import detect_intent
from app.chatbot.ai.llm import ask_gemini
from app.chatbot.ai.memory import ANONYMOUS_KEY, save_message, get_history
from app.chatbot.ai.response import format_response
from app.chatbot.ai.knowledge import local_answer
from app.models.user import UserOut
from app.chatbot.tools.rag.user_pdf_store import has_pdf, pdf_name, delete_pdf, is_active, set_active
from app.chatbot.tools.rag.user_pdf_rag import user_pdf_chat


async def process_message(message: str, user: Optional[UserOut] = None, user_key: Optional[str] = None) -> str:
    # Logged-in users use their account id; anonymous browsers use the
    # browser session key so chat history and uploaded PDFs stay isolated.
    user_key = user.id if user is not None else (user_key or ANONYMOUS_KEY)

    # Save user message
    save_message(user_key, "User", message)

    # --------------------------------
    # USER-UPLOADED PDF / RAG
    # --------------------------------
    # If a PDF is active, use it when the query has a relevant match. This
    # keeps uploaded-paper answers grounded in the document while allowing
    # ordinary NanoMed questions to continue through the existing assistant.
    if has_pdf(user_key):
        try:
            pdf_answer, pdf_sources = user_pdf_chat(
                user_key,
                message,
                history="\n".join(
                    f"{item['role']}: {item['message']}"
                    for item in get_history(user_key)[:-1]
                ),
            )
            if pdf_sources:
                set_active(user_key, True)
                save_message(user_key, "Assistant", pdf_answer)
                return format_response(title="Uploaded PDF", content=pdf_answer)
        except Exception:
            # Do not break the main chatbot if PDF retrieval has a transient
            # embedding/vector error.
            pass

    # --------------------------------
    # ACTION LAYER — "create a material", "log an experiment", "recommend
    # a material for 90% absorption at 140 keV", etc. Takes priority over
    # plain Q&A so a command is executed rather than just discussed.
    # --------------------------------
    action_reply = await agent.handle(message, user, user_key)
    if action_reply is not None:
        save_message(user_key, "Assistant", action_reply)
        return format_response(title="Action", content=action_reply)

    # Detect intent for the remaining conversational paths
    intent = detect_intent(message)

    # --------------------------------
    # GREETING
    # --------------------------------
    if intent == "GREETING":
        prompt = f"""
You are NanoMed, a friendly AI assistant.

The user is greeting you.

Respond naturally and briefly.

User:
{message}

Answer:
"""
        ai_response = ask_gemini(prompt)

    # --------------------------------
    # KNOWLEDGE / FORMULA QUESTION
    # --------------------------------
    elif intent == "FORMULA_EXPLANATION":
        # Handle simple material/property questions deterministically first.
        # This avoids stale RAG chunks or action routing producing irrelevant
        # follow-up questions for straightforward queries.
        ai_response = local_answer(message)
        if ai_response is None:
            ai_response = ask_gemini(f"""
You are NanoMed, a scientific assistant for radiation shielding and nanomaterials.
Answer the user's question directly and accurately. If a material property
depends on physical form (for example anhydrous vs hydrated), state that
clearly. Do not ask the user to provide the material name when it is already
present in the question. Do not create or register a material unless the user
explicitly asks you to.

User question:
{message}

Answer in a concise, useful format with units where appropriate.
""")

    # --------------------------------
    # NORMAL CONVERSATION
    # --------------------------------
    else:
        prompt = f"""
You are NanoMed, an AI assistant.

Have a natural conversation with the user.

If the user asks a normal/general question,
answer helpfully using your general knowledge.

Do not say that information must come from
a knowledge base.

User:
{message}

Answer:
"""
        ai_response = ask_gemini(prompt)

    # Save AI response
    save_message(user_key, "Assistant", ai_response)

    # Format output
    return format_response(title=intent, content=ai_response)
