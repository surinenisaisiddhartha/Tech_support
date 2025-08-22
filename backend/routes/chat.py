from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from models.schemas import ChatRequest
from routes.auth import get_current_user
from services.chat_service import save_chat_message, get_recent_messages
from services.rag_pipeline import (
    embed_query_and_search,
    build_rag_prompt,
    generate_answer_stream,
    extractive_answer_from_chunks
)
import re

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/ask")
async def ask(payload: ChatRequest, current_user=Depends(get_current_user)):
    question = payload.query.strip() if payload and payload.query else None
    if not question:
        return JSONResponse(status_code=400, content={"error": "Query cannot be empty."})

    # --- Special handling: user asks about their previous question ---
    prev_q_patterns = [
        r"what\s+was\s+my\s+previous\s+question\??",
        r"what\s+is\s+my\s+previous\s+question\??",
        r"my\s+last\s+question\??",
        r"what\s+did\s+i\s+ask\s+before\??",
        r"what\s+was\s+the\s+last\s+thing\s+i\s+asked\??",
        r"previous\s+question\??",
    ]
    normalized = question.lower().strip()
    if any(re.fullmatch(p, normalized) for p in prev_q_patterns):
        recent = await get_recent_messages(current_user["id"], limit=1)
        if not recent:
            answer = "You haven't asked anything yet."
        else:
            last_q = recent[-1].get("question") or recent[-1].get("query") or "(unavailable)"
            answer = f"Your previous question was: \"{last_q}\"."

        async def streamer_prev():
            yield answer
            await save_chat_message(current_user["id"], question, answer, {"type": "meta_previous_question"})
        return StreamingResponse(streamer_prev(), media_type="text/event-stream")

    # --- Special handling: simple greetings -> bypass retrieval & citations ---
    greeting_patterns = [
        r"hi\s*",
        r"hello\s*",
        r"hey\s*",
        r"hi there\s*",
        r"hello there\s*",
    ]
    if any(re.fullmatch(p, normalized) for p in greeting_patterns):
        greeting = "Hello! How can I help you today?"
        async def streamer_greet():
            yield greeting
            await save_chat_message(current_user["id"], question, greeting, {"type": "meta_greeting"})
        return StreamingResponse(streamer_greet(), media_type="text/event-stream")

    # Retrieve relevant chunks with a slightly lower threshold and higher k to improve recall
    chunks = embed_query_and_search(question, k=8, score_threshold=0.3)
    if not chunks:
        answer = "I couldn't find relevant information to answer your question."
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
        async for part in generate_answer_stream(prompt):
            full_text += part
            yield part
            
        try:
            txt = (full_text or "").strip()
            lower_txt = txt.lower()
            non_answer_patterns = [
                "i'm sorry, i don't have information",
                "i couldn't find relevant information",
                "model not configured",
                "error streaming response"
            ]
            
            non_answer = (
                not txt
                or len(txt) < 30
                or any(p in lower_txt for p in non_answer_patterns)
            )
            
            if non_answer:
                # Skip saving if it's a non-answer
                return
                
        except Exception as e:
            print(f"Error in streamer: {e}")
            return
            
        # Save the chat message with the full context
        await save_chat_message(
            current_user["id"], 
            question, 
            full_text,
            {"retrieved": [
                {
                    "page_content": c.get("page_content", ""), 
                    "metadata": c.get("metadata", {})
                } for c in chunks
            ]} if chunks else {"retrieved": []}
        )
        
    return StreamingResponse(streamer(), media_type="text/event-stream")