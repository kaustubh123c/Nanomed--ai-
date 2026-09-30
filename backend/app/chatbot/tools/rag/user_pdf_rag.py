"""Answer questions using only the chunks retrieved from the user's uploaded PDF.

Mirrors tools/rag/rag.py (which answers from the internal knowledge base) but the
retrieval is scoped to the current session's uploaded document, so internal
project knowledge and user PDFs never mix.
"""

from app.chatbot.ai.llm import ask_gemini
from app.chatbot.tools.rag.user_pdf_store import pdf_name, retrieve


def user_pdf_chat(conversation_id: str, question: str, history: str = "") -> tuple[str, list[str]]:
    """Answer from the session's uploaded PDF, with a graceful no-hit path."""
    matches = retrieve(conversation_id, question)

    if not matches:
        return (
            "I couldn't find anything about that in the PDF you uploaded. "
            "Try rephrasing, or ask about a topic the document actually covers."
        ), []

    name = pdf_name(conversation_id)

    context = "\n\n".join(
        f"[Excerpt {i + 1}]\n{match['text']}"
        for i, match in enumerate(matches)
    )

    prompt = f"""You are NamoMed, a careful document-analysis assistant.
Answer using ONLY the excerpts below, which come from the user's uploaded PDF
"{name}". Do not use outside knowledge and do not invent facts, numbers, or
citations that are not present in the excerpts. If the excerpts only partly
answer the question, say what is missing. Lead with a direct answer, then give
the supporting evidence.

Previous conversation:
{history}

Excerpts from the uploaded PDF:
{context}

Question: {question}

Answer in clear Markdown."""

    return ask_gemini(prompt), [f"Uploaded PDF: {name}"]
