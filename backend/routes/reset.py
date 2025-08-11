from fastapi import APIRouter
from services.embedder import faiss_index, chunk_store, save_vector_store
import numpy as np

router = APIRouter()

@router.post("/reset")
def reset_vector_store():
    faiss_index.reset()
    chunk_store.clear()
    save_vector_store()
    return {"message": "Vector store has been reset."}
