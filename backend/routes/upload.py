from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from models.schemas import UploadResponse, UrlIngestRequest, UrlIngestResponse
from services.file_handler import save_uploaded_file
from services.pdf_parser import extract_text_by_page
from services.embedder import page_texts_to_chunks, embed_chunks_with_metadata, web_text_to_chunks
from routes.auth import get_current_user
from fastapi import Depends
from services.summarizer import generate_summary
from services.web_scraper import fetch_and_extract

router = APIRouter()

@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...), current_user = Depends(get_current_user)):
    try:
        # 1. Validate file type
        if not file.filename.lower().endswith(".pdf"):
            return JSONResponse(status_code=400, content={"error": "Only PDF files are supported."})

        # 2. Save file locally
        file_path = save_uploaded_file(file)

        # 3. Extract text by page
        page_texts = extract_text_by_page(file_path)  # returns list of (page_number, text)

        if not any(text.strip() for _, text in page_texts):
            return JSONResponse(status_code=400, content={"error": "Uploaded PDF is empty or unreadable."})

        # 4. Build full text for summary
        full_text = " ".join(text for _, text in page_texts if text.strip())

        # 5. Generate summary from all text
        summary = generate_summary(full_text)

        # 6. Convert page texts to chunk dictionaries with metadata
        chunks_with_meta = page_texts_to_chunks(
            page_texts=page_texts,
            pdf_name=file.filename
        )

        # 7. Add chunks to FAISS & store metadata
        embed_chunks_with_metadata(chunks_with_meta)

        # 8. Return filename + summary
        return {"filename": file.filename, "summary": summary}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/upload/url", response_model=UrlIngestResponse)
async def upload_url(body: UrlIngestRequest, current_user = Depends(get_current_user)):
    """Ingest a web page by URL, extract main text, summarize, chunk and store in Qdrant."""
    try:
        url = body.url.strip()
        if not url:
            return JSONResponse(status_code=400, content={"error": "URL is required."})

        # 1) Fetch and extract readable text + title
        extracted = await fetch_and_extract(url)
        text = (extracted.get("text") or "").strip()
        title = extracted.get("title")

        if not text:
            return JSONResponse(status_code=400, content={"error": "Could not extract readable content from URL."})

        # 2) Summarize full text
        summary = generate_summary(text)

        # 3) Chunk like PDFs but with URL metadata
        chunks_with_meta = web_text_to_chunks(text=text, url=url, title=title)

        # 4) Embed + store
        embed_chunks_with_metadata(chunks_with_meta)

        # 5) Return response
        return UrlIngestResponse(url=url, title=title, summary=summary)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})