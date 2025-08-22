import os
import re
import uuid
from typing import List, Dict, Any

import numpy as np
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from config import EMBEDDING_DIM

# =========================
# Load embedding model
# =========================
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# =========================
# Qdrant configuration
# =========================
QDRANT_URL = os.getenv("QDRANT_URL")  
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "techsupport_chunks")

# Init client
if QDRANT_URL:
    qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
else:
    qdrant = QdrantClient(
        host=os.getenv("QDRANT_HOST", "127.0.0.1"), 
        port=int(os.getenv("QDRANT_PORT", "6333"))
    )

# =========================
# Ensure Collection Exists
# =========================
def ensure_collection():
    assert qdrant is not None, "Qdrant client not initialized."
    existing = {c.name for c in qdrant.get_collections().collections}
    if QDRANT_COLLECTION not in existing:
        qdrant.recreate_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=qmodels.VectorParams(size=EMBEDDING_DIM, distance=qmodels.Distance.COSINE),
        )
    try:
        qdrant.create_payload_index(
            collection_name=QDRANT_COLLECTION,
            field_name="metadata.domain",
            field_schema=qmodels.PayloadSchemaType.KEYWORD,
        )
    except Exception:
        pass  # already exists


# =========================
# Chunk PDF pages
# =========================
def page_texts_to_chunks(page_texts, pdf_name, domain="techsupport", chunk_size=200, overlap=50, source_type="pdf"):
    """
    Convert [(page_number, text), ...] → chunks with metadata.
    Supports tagging OCR vs normal PDF text via `source_type`.
    """
    results = []
    for page_num, text in page_texts:
        words = text.split()
        for i in range(0, len(words), chunk_size - overlap):
            chunk_words = words[i:i + chunk_size]
            if not chunk_words:
                continue
            chunk_text = " ".join(chunk_words)
            results.append({
                "text": chunk_text,
                "metadata": {
                    "pdf_name": pdf_name,
                    "page_number": page_num,
                    "domain": domain,
                    "source_type": source_type  # tag as "pdf" or "ocr"
                }
            })
    return results

def web_text_to_chunks(text: str, url: str, title: str | None = None, domain: str = "techsupport", chunk_size: int = 200, overlap: int = 50):
    """Convert raw web page text → chunks with URL metadata.
    Metadata fields mirror PDF flow for consistency.
    """
    words = (text or "").split()
    results: List[Dict[str, Any]] = []
    page_counter = 1
    for i in range(0, len(words), chunk_size - overlap):
        chunk_words = words[i:i + chunk_size]
        if not chunk_words:
            continue
        chunk_text = " ".join(chunk_words)
        results.append({
            "text": chunk_text,
            "metadata": {
                "source": url,
                "title": title or None,
                "page_number": page_counter,  # pseudo pages for consistent UI
                "domain": domain,
                "source_type": "url"
            }
        })
        page_counter += 1
    return results


# =========================
# Embed Chunks + Store
# =========================
def embed_chunks_with_metadata(chunks_with_meta: List[Dict[str, Any]]):
    ensure_collection()
    texts = [c.get("text", "") for c in chunks_with_meta]
    vectors = embedding_model.encode(texts)

    points = []
    for vec, item in zip(vectors, chunks_with_meta):
        payload = {
            "text": item.get("text", ""),
            "metadata": item.get("metadata", {}),
        }
        points.append(
            qmodels.PointStruct(
                id=str(uuid.uuid4()),
                vector=np.asarray(vec, dtype=float).tolist(),
                payload=payload,
            )
        )

    qdrant.upsert(collection_name=QDRANT_COLLECTION, points=points)


# =========================
# Query Embedding + Search
# =========================
def embed_query_and_search(query: str, k: int = 3, require_domain: str = None, score_threshold: float = 0.6):
    """
    Search top-k chunks with similarity scores.
    Returns: list of dicts {"text":..., "metadata":..., "score":...}
    """
    ensure_collection()
    query_vector = embedding_model.encode([query])[0].astype(float).tolist()

    # Domain filtering disabled: always search across all documents
    q_filter = None

    hits = qdrant.search(
        collection_name=QDRANT_COLLECTION,
        query_vector=query_vector,
        limit=k,
        query_filter=q_filter,
        with_payload=True,
        with_vectors=False,
    )

    results: List[Dict[str, Any]] = []
    for h in hits:
        payload = h.payload or {}
        text = payload.get("text", "")
        meta = payload.get("metadata", {})
        score = h.score
        if text and score >= score_threshold:  # only return confident matches
            results.append({"text": text, "metadata": meta, "score": score})

    # fallback removed: no domain restrictions applied

    return results


# =========================
# Compatibility
# =========================
def save_vector_store():
    return None

def load_vector_store():
    return None
