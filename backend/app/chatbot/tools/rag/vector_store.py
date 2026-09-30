import json
import os
import numpy as np

# Lightweight local vector store.
# This replaces ChromaDB so the backend does not require the native
# chroma-hnswlib C++ extension on Windows.
_VECTOR_DB_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "vector_db"
)
_VECTOR_DB_PATH = os.path.abspath(_VECTOR_DB_PATH)

os.makedirs(_VECTOR_DB_PATH, exist_ok=True)

_EMBEDDINGS_FILE = os.path.join(_VECTOR_DB_PATH, "embeddings.npy")
_DOCUMENTS_FILE = os.path.join(_VECTOR_DB_PATH, "documents.json")


class LocalVectorCollection:
    """Small persistent cosine-similarity vector store.

    The public add/query interface intentionally mirrors the subset of
    ChromaDB used by this project, so the rest of the RAG code can remain
    unchanged.
    """

    def _load(self):
        if os.path.exists(_EMBEDDINGS_FILE) and os.path.exists(_DOCUMENTS_FILE):
            embeddings = np.load(_EMBEDDINGS_FILE)
            with open(_DOCUMENTS_FILE, "r", encoding="utf-8") as f:
                documents = json.load(f)
            return embeddings, documents

        return np.empty((0, 0), dtype=np.float32), []

    def add(self, ids, documents, embeddings):
        new_embeddings = np.asarray(embeddings, dtype=np.float32)
        if new_embeddings.ndim == 1:
            new_embeddings = new_embeddings.reshape(1, -1)

        old_embeddings, old_documents = self._load()

        # Avoid dimension mismatch if an old/incompatible store exists.
        if old_embeddings.size == 0:
            all_embeddings = new_embeddings
            all_documents = list(documents)
        elif old_embeddings.shape[1] != new_embeddings.shape[1]:
            all_embeddings = new_embeddings
            all_documents = list(documents)
        else:
            all_embeddings = np.vstack([old_embeddings, new_embeddings])
            all_documents = old_documents + list(documents)

        np.save(_EMBEDDINGS_FILE, all_embeddings)

        with open(_DOCUMENTS_FILE, "w", encoding="utf-8") as f:
            json.dump(all_documents, f, ensure_ascii=False, indent=2)

    def query(self, query_embeddings, n_results=3):
        query = np.asarray(query_embeddings, dtype=np.float32)
        if query.ndim == 1:
            query = query.reshape(1, -1)

        embeddings, documents = self._load()

        if len(documents) == 0 or embeddings.size == 0:
            return {"documents": [[]], "distances": [[]]}

        # Cosine similarity, equivalent to nearest-neighbour semantic search.
        query_norm = np.linalg.norm(query, axis=1, keepdims=True)
        doc_norm = np.linalg.norm(embeddings, axis=1, keepdims=True)

        query_norm[query_norm == 0] = 1.0
        doc_norm[doc_norm == 0] = 1.0

        normalized_query = query / query_norm
        normalized_docs = embeddings / doc_norm

        similarities = normalized_docs @ normalized_query[0]
        count = min(max(int(n_results), 1), len(documents))

        top_indices = np.argsort(-similarities)[:count]

        return {
            "documents": [[documents[i] for i in top_indices]],
            "distances": [[float(1.0 - similarities[i]) for i in top_indices]],
        }


collection = LocalVectorCollection()


def store_embeddings(chunks, embeddings):
    """Store text chunks and their embeddings in the local vector store."""
    documents = [chunk.page_content for chunk in chunks]

    if not documents:
        print("No documents to store.")
        return

    collection.add(
        ids=[str(i) for i in range(len(documents))],
        documents=documents,
        embeddings=np.asarray(embeddings, dtype=np.float32),
    )

    print(f"Stored {len(documents)} documents in the local vector store.")
