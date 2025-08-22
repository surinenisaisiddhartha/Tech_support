import google.generativeai as genai
from services.embedder import embed_query_and_search
from config import GEMINI_API_KEY
import re
from typing import List, Dict, Any, Optional

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    generation_model = genai.GenerativeModel("gemini-2.0-flash")
else:
    generation_model = None

# =========================
# System Prompt
# =========================
SYSTEM_PROMPT = """
You are a helpful AI assistant. Your goal is to provide accurate, helpful, and concise responses.

Guidelines:
1. Analyze the question's complexity and depth before answering
2. For factual questions, provide clear, well-structured answers
3. For complex questions, break down the response into logical sections
4. If the question is unclear, ask for clarification
5. When relevant, reference the source of your information
6. If you don't know the answer, say so rather than making up information
"""

# =========================
# Question Analysis
# =========================
def analyze_question(question: str) -> dict:
    """Analyze the question to determine its depth and type."""
    # Basic analysis - can be enhanced with more sophisticated NLP
    question = question.lower().strip()
    
    # Check question type
    question_type = "factual"
    if any(word in question for word in ["how", "why", "explain", "process"]):
        question_type = "explanatory"
    elif any(word in question for word in ["compare", "difference", "similar"]):
        question_type = "comparative"
    elif any(word in question for word in ["opinion", "think about"]):
        question_type = "opinion"
    
    # Estimate question depth (1-5 scale)
    word_count = len(question.split())
    depth = min(5, max(1, word_count // 5))  # Simple heuristic based on length
    
    return {
        "type": question_type,
        "depth": depth,
        "requires_context": depth > 2  # Deeper questions likely need more context
    }

# =========================
# Build RAG Prompt
# =========================
def build_rag_prompt(chunks_with_meta: List[Dict[str, Any]], user_query: str, chat_history: Optional[List] = None) -> str:
    """Build a prompt for the LLM with context and chat history."""
    # Analyze the question
    q_analysis = analyze_question(user_query)
    
    # Prepare context with sources
    context_parts = []
    for chunk in chunks_with_meta:
        text = chunk.get("text", "").strip()
        meta = chunk.get("metadata", {})
        source = meta.get("pdf_name", meta.get("source", "Document"))
        page = meta.get("page_number")
        
        # Format the source reference
        source_ref = f"({source}, Page {page})" if page else f"({source})"
        
        # Add the source reference to the text
        if text and not text.endswith(source_ref):
            text = f"{text} {source_ref}"
            
        context_parts.append(text)
    
    # Prepare chat history if available
    history_section = ""
    if chat_history:
        history_turns = []
        for h in chat_history[-4:]:  # Last 4 exchanges
            q = h.get("query", h.get("question", ""))
            a = h.get("answer", "")
            history_turns.append(f"User: {q}\nAssistant: {a}")
        if history_turns:
            history_section = "\n\nConversation History:\n" + "\n\n".join(history_turns)
    
    # Build the final prompt
    context = "\n\n".join(context_parts)
    return f"""{SYSTEM_PROMPT}

Question Analysis:
- Type: {q_analysis['type'].title()}
- Depth: {q_analysis['depth']}/5
- Context Needed: {'Yes' if q_analysis['requires_context'] else 'No'}

Context from Knowledge Base:
{context}

Current Question:
{user_query}
{history_section}

Instructions:
1. Consider the question's depth and type in your response
2. Use the provided context when relevant
3. The context includes source references in the format (filename, Page X)
4. Be concise but thorough based on the question's depth"""

# =========================
# Main Answer Function
# =========================
async def answer_query(user_query: str, score_threshold: float = 0.6, chat_history: Optional[List] = None) -> str:
    """
    Process a user query with RAG:
    1. Analyze the question
    2. Retrieve relevant context
    3. Generate a response using the LLM
    """
    try:
        # Step 1: Analyze the question
        q_analysis = analyze_question(user_query)
        
        # Step 2: Retrieve relevant context with dynamic k based on question depth
        k = min(10, 3 + q_analysis['depth'] * 2)  # More context for deeper questions
        chunks_with_meta = embed_query_and_search(
            user_query, 
            k=k,
            score_threshold=min(score_threshold, 0.3)
        )

        # Step 3: Build and send prompt to LLM
        if generation_model is None:
            return "Error: Model not configured. Please set GEMINI_API_KEY."
            
        prompt = build_rag_prompt(chunks_with_meta, user_query, chat_history)
        response = generation_model.generate_content(prompt)
        
        return (response.text or "I don't have enough information to answer that question.").strip()

    except Exception as e:
        return f"Error generating response: {str(e)}"

# =========================
# Streaming Answer
# =========================
async def generate_answer_stream(prompt: str):
    """Generate a streaming response from the LLM."""
    try:
        if generation_model is None:
            yield "Error: Model not configured. Please set GEMINI_API_KEY."
            return
            
        response = generation_model.generate_content(prompt, stream=True)
        for chunk in response:
            if hasattr(chunk, 'text') and chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"Error in streaming response: {str(e)}"

def extractive_answer_from_chunks(user_query: str, chunks_with_meta: List[Dict[str, Any]], max_sentences: int = 4) -> str:
    """Fallback: Build a concise answer directly from retrieved chunks."""
    if not chunks_with_meta:
        return "I couldn't find relevant information to answer your question."
        
    # Simple extractive QA - just return the most relevant chunk
    best_chunk = max(chunks_with_meta, key=lambda x: x.get('score', 0))
    return best_chunk.get('text', 'No relevant information found.')
