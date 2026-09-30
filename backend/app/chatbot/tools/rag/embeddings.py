from sentence_transformers import SentenceTransformer

# Load embedding model (loads only once)
model = SentenceTransformer("all-MiniLM-L6-v2")


def create_embeddings(texts):
    """
    Convert list of text chunks into embeddings.
    """

    embeddings = model.encode(texts)

    return embeddings