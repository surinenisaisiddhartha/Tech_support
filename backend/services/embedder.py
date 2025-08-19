import os
import json
import re
import uuid
from typing import List, Dict, Any

import numpy as np
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from config import EMBEDDING_DIM

# Load embedding model
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# Qdrant configuration via environment variables
QDRANT_URL = os.getenv("QDRANT_URL")  # e.g., https://xxxx-xxxx-xxxx.eu-central.aws.cloud.qdrant.io
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "techsupport_chunks")

# Initialize Qdrant client (cloud or local depending on URL)
qdrant: QdrantClient | None = None
if QDRANT_URL:
    qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
else:
    # Fallback to local Qdrant if URL is not provided (assumes docker/local service)
    qdrant = QdrantClient(host=os.getenv("QDRANT_HOST", "127.0.0.1"), port=int(os.getenv("QDRANT_PORT", "6333")))


def ensure_collection():
    """Ensure the target collection exists with correct vector size/schema."""
    assert qdrant is not None, "Qdrant client is not initialized. Set QDRANT_URL/QDRANT_HOST."
    existing = {c.name for c in qdrant.get_collections().collections}
    if QDRANT_COLLECTION not in existing:
        qdrant.recreate_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=qmodels.VectorParams(size=EMBEDDING_DIM, distance=qmodels.Distance.COSINE),
        )
    # Ensure payload index for domain filtering exists
    try:
        qdrant.create_payload_index(
            collection_name=QDRANT_COLLECTION,
            field_name="metadata.domain",
            field_schema=qmodels.PayloadSchemaType.KEYWORD,
        )
    except Exception:
        # Index might already exist; ignore
        pass


def page_texts_to_chunks(page_texts, pdf_name, domain="techsupport", chunk_size=200, overlap=50):
    """
    Takes [(page_number, text), ...] and converts into chunks with metadata.
    Returns: list of dicts with "text" and "metadata"
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
                    "domain": domain  # Store domain for filtering later
                }
            })
    return results


def embed_chunks_with_metadata(chunks_with_meta):
    """
    Embeds chunks (list of {"text":..., "metadata":...}) and stores them in Qdrant with payload.
    """
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


def embed_query_and_search(query, k=3, require_domain=None):
    """
    Embeds a query and searches top-k most similar chunks.
    Optionally filter by domain before searching.
    Returns: list of dicts ({"text":..., "metadata":...})
    """
    ensure_collection()

    # Always embed the query once
    query_vector = embedding_model.encode([query])[0].astype(float).tolist()

    # Build optional domain filter
    q_filter = None
    if require_domain:
        q_filter = qmodels.Filter(
            must=[qmodels.FieldCondition(key="metadata.domain", match=qmodels.MatchValue(value=require_domain))]
        )

    # Run vector search
    hits = qdrant.search(
        collection_name=QDRANT_COLLECTION,
        query_vector=query_vector,
        limit=k,
        query_filter=q_filter,
        with_payload=True,
    )

    results: List[Dict[str, Any]] = []
    for h in hits:
        payload = h.payload or {}
        text = payload.get("text", "")
        meta = payload.get("metadata", {}) if isinstance(payload.get("metadata", {}), dict) else {}
        if text:
            results.append({"text": text, "metadata": meta})

    # If no results and a domain was required, try without domain as a soft fallback
    if not results and require_domain:
        hits = qdrant.search(
            collection_name=QDRANT_COLLECTION,
            query_vector=query_vector,
            limit=k,
            with_payload=True,
        )
        for h in hits:
            payload = h.payload or {}
            text = payload.get("text", "")
            meta = payload.get("metadata", {}) if isinstance(payload.get("metadata", {}), dict) else {}
            if text:
                results.append({"text": text, "metadata": meta})

    return results
    
    
def save_vector_store():
    """Deprecated: No-op with Qdrant backend (kept for compatibility)."""
    return None


def load_vector_store():
    """Deprecated: No-op with Qdrant backend (kept for compatibility)."""
    return None
