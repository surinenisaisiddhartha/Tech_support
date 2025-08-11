import faiss
import numpy as np
import os
import json
from sentence_transformers import SentenceTransformer
from config import EMBEDDING_DIM
import re

# Load embedding model
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# FAISS index
faiss_index = faiss.IndexFlatL2(EMBEDDING_DIM)

# Store for chunk metadata: [{"text": ..., "metadata": {...}}, ...]
chunk_store = []

# File paths
VECTOR_STORE_PATH = "data/vector_store.faiss"
CHUNK_STORE_PATH = "data/chunk_store.json"

# Ensure storage dir exists
os.makedirs("data", exist_ok=True)


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
                    "domain": domain  # ✅ Store domain for filtering later
                }
            })
    return results


def embed_chunks_with_metadata(chunks_with_meta):
    """
    Embeds chunks (list of {"text":..., "metadata":...}) and stores them in FAISS + local store.
    """
    global chunk_store

    vectors = embedding_model.encode([c["text"] for c in chunks_with_meta])
    faiss_index.add(np.array(vectors))
    chunk_store.extend(chunks_with_meta)
    save_vector_store()


def embed_query_and_search(query, k=3, require_domain=None):
    """
    Embeds a query and searches top-k most similar chunks.
    Optionally filter by domain before searching.
    Returns: list of dicts ({"text":..., "metadata":...})
    """
    # Load from disk if index empty
    if faiss_index.ntotal == 0:
        load_vector_store()

    # If there is still no data, return empty results gracefully
    if faiss_index.ntotal == 0 or not chunk_store:
        return []

    # If filtering by domain, select only relevant chunk indices
    if require_domain:
        # Guard against legacy/invalid chunk formats in persisted store
        filtered_indices = [
            idx for idx, chunk in enumerate(chunk_store)
            if isinstance(chunk, dict)
            and isinstance(chunk.get("metadata"), dict)
            and chunk.get("metadata", {}).get("domain") == require_domain
        ]

        if not filtered_indices:
            return []

        # Create temporary FAISS index for filtered chunks
        temp_index = faiss.IndexFlatL2(EMBEDDING_DIM)
        filtered_vectors = embedding_model.encode(
            [chunk_store[i].get("text", "") for i in filtered_indices]
        )
        temp_index.add(np.array(filtered_vectors))

        # Search only within filtered subset
        query_vector = embedding_model.encode([query])[0]
        D, I = temp_index.search(np.array([query_vector]), k)

        results = []
        for idx in I[0]:
            if 0 <= idx < len(filtered_indices):
                candidate = chunk_store[filtered_indices[idx]]
                if isinstance(candidate, dict):
                    results.append(candidate)
        if results:
            return results

        # Fallback: keyword match within filtered subset when vector search finds nothing
        def normalize_text(s: str) -> str:
            return re.sub(r"[^a-z0-9\s]", " ", (s or "").lower())

        def expand_tokens(tokens: list[str]) -> set[str]:
            expanded: set[str] = set()
            for t in tokens:
                if len(t) < 3:
                    continue
                expanded.add(t)
                # crude stemming
                for suffix in ("ing", "ed", "es", "s"):
                    if t.endswith(suffix) and len(t) - len(suffix) >= 3:
                        expanded.add(t[: -len(suffix)])
            return expanded

        q_norm = normalize_text(query)
        q_tokens = expand_tokens(q_norm.split())
        if not q_tokens:
            return []
        scored = []
        for i in filtered_indices:
            chunk = chunk_store[i]
            text = normalize_text(chunk.get("text", ""))
            meta = chunk.get("metadata", {})
            pdf_name = normalize_text(meta.get("pdf_name", ""))
            score = sum(1 for t in q_tokens if t in text or t in pdf_name)
            if score > 0:
                scored.append((score, i))
        scored.sort(reverse=True)
        return [chunk_store[i] for score, i in scored[:k]]

    # If no filtering → search in full index
    query_vector = embedding_model.encode([query])[0]
    D, I = faiss_index.search(np.array([query_vector]), k)

    results = []
    for idx in I[0]:
        if 0 <= idx < len(chunk_store):
            candidate = chunk_store[idx]
            if isinstance(candidate, dict):
                results.append(candidate)
    if results:
        return results

    # Fallback: keyword match across all chunks
    def normalize_text(s: str) -> str:
        return re.sub(r"[^a-z0-9\s]", " ", (s or "").lower())

    def expand_tokens(tokens: list[str]) -> set[str]:
        expanded: set[str] = set()
        for t in tokens:
            if len(t) < 3:
                continue
            expanded.add(t)
            for suffix in ("ing", "ed", "es", "s"):
                if t.endswith(suffix) and len(t) - len(suffix) >= 3:
                    expanded.add(t[: -len(suffix)])
        return expanded

    q_norm = normalize_text(query)
    q_tokens = expand_tokens(q_norm.split())
    if not q_tokens:
        return []
    scored = []
    for i, chunk in enumerate(chunk_store):
        if not isinstance(chunk, dict):
            continue
        text = normalize_text(chunk.get("text", ""))
        meta = chunk.get("metadata", {})
        pdf_name = normalize_text(meta.get("pdf_name", ""))
        score = sum(1 for t in q_tokens if t in text or t in pdf_name)
        if score > 0:
            scored.append((score, i))
    scored.sort(reverse=True)
    return [chunk_store[i] for score, i in scored[:k]]



def save_vector_store():
    """ Saves FAISS index + chunk store to disk. """
    faiss.write_index(faiss_index, VECTOR_STORE_PATH)
    with open(CHUNK_STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(chunk_store, f, ensure_ascii=False, indent=2)


def load_vector_store():
    """ Loads FAISS index + chunk store from disk. """
    global faiss_index, chunk_store

    if os.path.exists(VECTOR_STORE_PATH) and os.path.getsize(VECTOR_STORE_PATH) > 0:
        try:
            faiss_index = faiss.read_index(VECTOR_STORE_PATH)
            print("✅ FAISS index loaded.")
        except Exception as e:
            print(f"❌ Failed to load FAISS index: {e}")
            faiss_index = faiss.IndexFlatL2(EMBEDDING_DIM)
    else:
        print("⚠️ No FAISS index found, starting fresh.")

    if os.path.exists(CHUNK_STORE_PATH):
        try:
            with open(CHUNK_STORE_PATH, "r", encoding="utf-8") as f:
                loaded = json.load(f)
            # Normalize legacy formats: strings -> dict with minimal metadata
            normalized = []
            if isinstance(loaded, list):
                for item in loaded:
                    if isinstance(item, dict):
                        text_val = item.get("text", "") if isinstance(item.get("text"), str) else ""
                        metadata_val = item.get("metadata", {}) if isinstance(item.get("metadata"), dict) else {}
                        normalized.append({"text": text_val, "metadata": metadata_val})
                    elif isinstance(item, str):
                        normalized.append({"text": item, "metadata": {}})
            chunk_store = normalized
            print("✅ Chunk store loaded.")
        except Exception as e:
            print(f"❌ Failed to load chunk store: {e}")
            chunk_store = []
    else:
        print("⚠️ No chunk store found, starting fresh.")
