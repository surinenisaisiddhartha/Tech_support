import google.generativeai as genai
from services.embedder import embed_query_and_search
from config import GEMINI_API_KEY
import re


# Configure Gemini API
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    generation_model = genai.GenerativeModel("gemini-2.0-flash")
    classification_model = genai.GenerativeModel("gemini-2.0-flash")
else:
    generation_model = None
    classification_model = None

# =========================
# System Prompt
# =========================
SYSTEM_PROMPT = """
You are a Tech Support Assistant specialized in troubleshooting software and hardware issues. Your expertise covers:
- Software installation, configuration, and troubleshooting
- Hardware setup, diagnostics, and repair
- Network connectivity and security issues
- Operating system problems and solutions
- Device drivers and compatibility issues
- Performance optimization and maintenance

Guidelines:
1. Only answer queries related to tech support, troubleshooting, software, and hardware issues.
2. If the answer is not found in the provided documents, say: "I'm sorry, I don't have information about that specific issue in my tech support knowledge base."
3. Always cite the source in your answer: (Source: PDF_NAME, Page X).
4. For non-tech support queries, politely redirect: "I'm a tech support assistant. Please ask me about software, hardware, or troubleshooting issues."
5. For simple greetings like "hi", "hello", or "hey", respond with: "Hello! I'm your tech support assistant. How can I help you with any software or hardware issues today?"
6. Keep responses clear, concise, and professional.
7. Provide step-by-step solutions when possible.
"""

# =========================
# PDF Classification for Uploads
# =========================
def classify_pdf_is_techsupport(text: str) -> bool:
    """
    Classify a PDF document as tech support related or not.
    Used during PDF upload to ensure only tech support documents are accepted.
    """
    if classification_model is None:
        # If no classification model, allow upload (fallback behavior)
        return True
        
    if not text or not text.strip():
        return False
        
    # Use first 4000 characters for classification to stay within token limits
    snippet = text[:4000]
    
    prompt = f"""
Analyze the following document content and determine if it is related to tech support, troubleshooting, software, or hardware issues.

Tech support content includes:
- Software installation, configuration, troubleshooting guides
- Hardware setup, diagnostics, repair manuals
- Network connectivity and security documentation
- Operating system problems and solutions
- Device drivers and compatibility information
- Performance optimization and maintenance guides
- User manuals for software/hardware
- Technical documentation and FAQs

Document content:
{snippet}

Respond with only one word: "techsupport" if the document is related to tech support, or "other" if it is not.
"""
    
    try:
        response = classification_model.generate_content(prompt)
        result = (response.text or "").strip().lower()
        return result == "techsupport"
    except Exception as e:
        print(f" Error classifying PDF: {e}")
        # On error, allow upload (fallback behavior)
        return True

# =========================
# Build RAG Prompt
# =========================
def build_rag_prompt(chunks_with_meta, user_query, chat_history=None):
    """
    Builds prompt including chunk texts and their sources.
    """
    context_parts = []
    for chunk in chunks_with_meta:
        text = chunk.get("text", "")
        meta = chunk.get("metadata", {})
        pdf_name = meta.get("pdf_name", "Unknown.pdf")
        page_number = meta.get("page_number", "?")
        context_parts.append(f"{text}\n(Source: {pdf_name}, Page {page_number})")

    # If many chunks come from different docs, instruct the model to merge and cite
    doc_names = { (c.get("metadata", {}) or {}).get("pdf_name", "Unknown.pdf") for c in chunks_with_meta }
    multi_doc_note = "\n\nMultiple sources retrieved. When answering, cite each source with (Source: PDF_NAME, Page X)." if len(doc_names) > 1 else ""

    history_section = ""
    if chat_history:
        # Include last few user/assistant turns to help with follow-ups
        turns = []
        for h in chat_history[-4:]:
            if not isinstance(h, dict):
                continue
            # Support both 'query' and 'question' keys from history items
            q = h.get("query", h.get("question", ""))
            a = h.get("answer", "")
            turns.append(f"User: {q}\nAssistant: {a}")
        if turns:
            history_section = "\n\nRecent conversation (for context):\n" + "\n\n".join(turns)

    context = "\n\n".join(context_parts)
    return f"""
{SYSTEM_PROMPT}

Context:
{context}

Question:
{user_query}
{history_section}
{multi_doc_note}
"""

# =========================
# Main Answer Function
# =========================
def answer_query(user_query: str) -> str:
    """
    Performs:
    1. Vector search
    2. RAG prompt creation
    3. Gemini generation
    """
    try:
        # Step 1: Retrieve chunks with metadata
        chunks_with_meta = embed_query_and_search(user_query, k=3)
        if not chunks_with_meta:
            return "I'm sorry, I don't have information about that in my knowledge base."

        # Step 2: Build RAG prompt
        prompt = build_rag_prompt(chunks_with_meta, user_query)

        # Step 3: Generate with Gemini
        if generation_model is None:
            return "Model not configured. Please set GEMINI_API_KEY."
        resp = generation_model.generate_content(prompt)
        return (resp.text or "").strip()

    except Exception as e:
        return f"Error generating response: {e}"


def generate_answer_stream(prompt: str):
    """
    Streams Gemini response in chunks.
    """
    try:
        if generation_model is None:
            yield "[Model not configured. Please set GEMINI_API_KEY.]"
            return
        stream = generation_model.generate_content(
            prompt,
            stream=True
        )
        for chunk in stream:
            if chunk.candidates and chunk.candidates[0].content.parts:
                text_part = chunk.candidates[0].content.parts[0].text
                if text_part:
                    yield text_part
    except Exception as e:
        yield f"[Error streaming response: {e}]"


# =========================
# Extractive Fallback
# =========================
def extractive_answer_from_chunks(user_query: str, chunks_with_meta, max_sentences: int = 4) -> str:
    """
    Build a concise, extractive answer from retrieved chunk texts when generation is weak.
    Scores sentences by keyword overlap with the query (simple heuristic),
    then returns the top few as a coherent snippet.
    """
    if not chunks_with_meta:
        return ""

    def normalize(s: str) -> str:
        return re.sub(r"[^a-z0-9\s]", " ", (s or "").lower())

    q_tokens = [t for t in normalize(user_query).split() if len(t) >= 3]
    if not q_tokens:
        return ""

    # Split chunk texts into sentences and score
    candidates = []  # (score, sentence, meta)
    for c in chunks_with_meta:
        text = c.get("text", "") if isinstance(c, dict) else ""
        meta = c.get("metadata", {}) if isinstance(c, dict) else {}
        # Rough sentence split
        sentences = re.split(r"(?<=[\.!?])\s+", text)
        for s in sentences:
            s_norm = normalize(s)
            if len(s_norm) < 20:
                continue
            score = sum(1 for t in q_tokens if t in s_norm)
            if score > 0:
                candidates.append((score, s.strip(), meta))

    if not candidates:
        return ""

    # Sort by score (desc) and keep unique-ish sentences
    candidates.sort(key=lambda x: x[0], reverse=True)
    picked = []
    seen = set()
    for _, sent, _ in candidates:
        key = sent.lower()
        if key in seen:
            continue
        seen.add(key)
        picked.append(sent)
        if len(picked) >= max_sentences:
            break

    if not picked:
        return ""

    return "\n".join(f"- {s}" for s in picked)
