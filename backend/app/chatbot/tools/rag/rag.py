from app.chatbot.tools.rag.retriever import retrieve_documents
from app.chatbot.ai.llm import ask_gemini


def rag_chat(question):
    """
    Retrieve relevant knowledge and ask Gemini using that context.
    """

    # Get relevant chunks
    documents = retrieve_documents(question)

    # Combine all retrieved chunks
    context = "\n\n".join(documents)

    # Create prompt
    prompt = f"""
You are NanoMed, an AI assistant.

Answer ONLY using the context below.

If the answer is not found in the context, say:
"I couldn't find that information in my knowledge base."

Context:
{context}

Question:
{question}

Answer:
"""

    return ask_gemini(prompt)