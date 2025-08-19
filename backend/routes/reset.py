from fastapi import APIRouter
from qdrant_client.http import models as qmodels
from services.embedder import qdrant, QDRANT_COLLECTION
from config import EMBEDDING_DIM

router = APIRouter()

@router.post("/reset")
def reset_vector_store():
    # Recreate the Qdrant collection with the correct vector params
    qdrant.recreate_collection(
        collection_name=QDRANT_COLLECTION,
        vectors_config=qmodels.VectorParams(size=EMBEDDING_DIM, distance=qmodels.Distance.COSINE),
    )
    return {"message": "Qdrant collection has been reset."}
