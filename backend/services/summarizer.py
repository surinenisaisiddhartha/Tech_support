import google.generativeai as genai
from config import GEMINI_API_KEY

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# Load Gemini model
model = genai.GenerativeModel("gemini-2.0-flash")

def generate_summary(text):
    """
    Generates a summary for the given document text using Gemini.
    Automatically trims input if it's too long and restricts to tech support domain.
    Does not summarize or answer queries from other domains.
    """
    # Gemini max input context is ~30k tokens (~15k words), keep safe
    input_text = text[:8000]

    prompt = f"""
    You are a Domain Tech Support Bot designed exclusively to assist with troubleshooting software and hardware FAQs.
    Summarize the following document in clear, concise bullet points, including only content related to:
    - Use Case: Troubleshoot software/hardware FAQs
    - Document Sources: Tech support documents, user manuals, knowledge bases
    Do not summarize or provide answers for any content unrelated to tech support (e.g., medical, general knowledge), even if present. If a query or document content pertains to another domain, respond with:
    'I am designed to assist only with tech support-related queries for software and hardware FAQs. Please upload a tech support document or ask a related question.'
    If no tech support-related content is found, return: 'No tech support-related information available for summarization.'

    Document:
    {input_text}
    """

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"❌ Error generating summary: {e}"