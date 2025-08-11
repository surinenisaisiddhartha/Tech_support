from config import CHUNK_SIZE, CHUNK_OVERLAP

def chunk_text(text):
    """
    Splits input text into chunks of CHUNK_SIZE words with CHUNK_OVERLAP.
    
    Returns:
        List of text chunks.
    """
    words = text.split()
    chunks = []

    for i in range(0, len(words), CHUNK_SIZE - CHUNK_OVERLAP):
        chunk = words[i:i + CHUNK_SIZE]
        chunks.append(" ".join(chunk))

        if i + CHUNK_SIZE >= len(words):
            break

    return chunks
