from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from models.schemas import ChatRequest
from routes.auth import get_current_user
from services.chat_service import save_chat_message, get_recent_messages
from services.rag_pipeline import (
    embed_query_and_search,
    build_rag_prompt,
    generate_answer_stream
)

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/ask")
async def ask(payload: ChatRequest, current_user=Depends(get_current_user)):
    question = payload.query.strip() if payload and payload.query else None
    if not question:
        return JSONResponse(status_code=400, content={"error": "Query cannot be empty."})

    # Retrieve relevant chunks
    chunks = embed_query_and_search(question, k=3)
    if not chunks:
        answer = "I'm sorry, I don't have information about that in my knowledge base."
        async def streamer():
            yield answer
            await save_chat_message(
                current_user["id"], question, answer,
                {"retrieved": []}
            )
        return StreamingResponse(streamer(), media_type="text/event-stream")

    # Build final RAG prompt with short conversation history
    recent_history = await get_recent_messages(current_user["id"], limit=4)
    prompt = build_rag_prompt(chunks, question, chat_history=recent_history)

    # Stream answer back to client
    async def streamer():
        full_text = ""
        for part in generate_answer_stream(prompt):
            full_text += part
            yield part
        await save_chat_message(
            current_user["id"], question, full_text,
            {"retrieved": chunks}
        )

    return StreamingResponse(streamer(), media_type="text/event-stream")
