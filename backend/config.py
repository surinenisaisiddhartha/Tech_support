from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

# Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Embedding and chunking configs
CHUNK_SIZE = 200          # words per chunk
CHUNK_OVERLAP = 20        # overlap in words
EMBEDDING_DIM = 384       # MiniLM vector size
