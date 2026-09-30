from sentence_transformers import SentenceTransformer
from app.chatbot.tools.rag.vector_store import collection

# Load the same embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")


def retrieve_documents(query, n_results=3):
    """
    Retrieve the most relevant document chunks for a user query.
    """

    # Convert question into embedding
    query_embedding = model.encode(query)

    # Search the local vector store
    results = collection.query(
        query_embeddings=[query_embedding.tolist()],
        n_results=n_results
    )

    return results["documents"][0]