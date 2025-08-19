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
        greeting = "Hello! I'm your tech support assistant. How can I help you with any software or hardware issues today?"
        async def streamer_greet():
            yield greeting
            await save_chat_message(current_user["id"], question, greeting, {"type": "meta_greeting"})
        return StreamingResponse(streamer_greet(), media_type="text/event-stream")

    # Retrieve relevant chunks (restrict to techsupport domain to avoid legacy, non-cited data)
    chunks = embed_query_and_search(question, k=3, require_domain="techsupport")
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
        # Decide whether to append citations based on the model's response content
        try:
            allow_citations = True
            txt = (full_text or "").strip()
            lower_txt = txt.lower()
            non_answer_patterns = [
                "i'm sorry, i don't have information",
                "i'm sorry, i don't have information about that",
                "model not configured",
                "error streaming response",
                "i'm a tech support assistant",
                "i'm your tech support assistant",
                "hello! i'm your tech support assistant",
            ]
            # Detect greeting-like answers from the model (when the user didn't ask a greeting)
            greeting_like = False
            if re.fullmatch(r"\s*(hi|hello|hey)(\s+there)?[!.]*\s*", lower_txt):
                greeting_like = True

            non_answer = (
                not txt
                or len(txt) < 30
                or any(p in lower_txt for p in non_answer_patterns)
                or greeting_like
            )
            if non_answer:
                allow_citations = False

            if allow_citations:
                citations = []
                seen = set()
                for c in chunks:
                    meta = c.get("metadata", {}) if isinstance(c, dict) else {}
                    pdf_name = meta.get("pdf_name", "Unknown.pdf")
                    page_number = meta.get("page_number", "?")
                    key = (pdf_name, page_number)
                    if key not in seen:
                        seen.add(key)
                        citations.append(f"- {pdf_name}, Page {page_number}")
                if citations:
                    sources_block = "\n\nSources:\n" + "\n".join(citations)
                    full_text += sources_block
                    yield sources_block
            # If model output was weak, attempt an extractive fallback using retrieved chunks
            if non_answer:
                extracted = extractive_answer_from_chunks(question, chunks, max_sentences=5)
                if extracted:
                    # Build a concise extractive answer and then append citations
                    header = "Here's what I found related to your question:\n"
                    full_text = header + extracted
                    yield header
                    for line in extracted.splitlines():
                        yield line + "\n"
                    # Append citations for transparency
                    citations = []
                    seen = set()
                    for c in chunks:
                        meta = c.get("metadata", {}) if isinstance(c, dict) else {}
                        pdf_name = meta.get("pdf_name", "Unknown.pdf")
                        page_number = meta.get("page_number", "?")
                        key = (pdf_name, page_number)
                        if key not in seen:
                            seen.add(key)
                            citations.append(f"- {pdf_name}, Page {page_number}")
                    if citations:
                        sources_block = "\nSources:\n" + "\n".join(citations)
                        full_text += sources_block
                        yield sources_block
                else:
                    # Fallback informative message if extraction fails
                    fallback = "I found related sources but couldn't generate a direct answer. Please try rephrasing your question to be more specific (e.g., include device, OS, and the exact issue)."
                    full_text = fallback
                    yield fallback
        except Exception:
            # If anything goes wrong building citations, continue without blocking the response
            pass
        await save_chat_message(
            current_user["id"], question, full_text,
            {"retrieved": chunks}
        )

    return StreamingResponse(streamer(), media_type="text/event-stream")
