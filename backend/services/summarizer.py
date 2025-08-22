import google.generativeai as genai
from config import GEMINI_API_KEY

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# Load Gemini model
model = genai.GenerativeModel("gemini-2.0-flash")

def generate_summary(text):
    """
    Generates a concise and structured summary of the provided text.
    Automatically trims input if it's too long for the model's context.
    """
    # Limit input to a safe length (Gemini's context is ~30k tokens)
    input_text = text[:8000]

    prompt = """
    Your task is to create a clear, well-structured summary of the following content.
    
    Guidelines:
    1. Identify and extract the main points and key information
    2. Organize the summary in a logical flow
    3. Use bullet points for better readability
    4. Keep technical terms and domain-specific language intact
    5. Maintain a neutral, objective tone
    6. Omit unnecessary details, examples, and repetitions
    7. Preserve important data, statistics, and specific terminology
    
    Content to summarize:
    """
    
    try:
        response = model.generate_content(prompt + input_text)
        summary = response.text.strip()
        
        # Ensure the summary is not too verbose
        if len(summary.split()) > 500:
            summary = ' '.join(summary.split()[:500]) + '...'
            
        return summary
        
    except Exception as e:
        return f"Error generating summary: {str(e)}"