from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from models.schemas import UploadResponse
from services.file_handler import save_uploaded_file
from services.pdf_parser import extract_text_by_page
from services.embedder import page_texts_to_chunks, embed_chunks_with_metadata
from routes.auth import get_current_user
from fastapi import Depends
from services.rag_pipeline import classify_pdf_is_techsupport
from services.summarizer import generate_summary

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

        # 4. Validate PDF is tech support related
        full_text = " ".join(text for _, text in page_texts if text.strip())
        
        is_tech_support = classify_pdf_is_techsupport(full_text)
        if not is_tech_support:
            return JSONResponse(
                status_code=400, 
                content={
                    "error": "This PDF does not appear to be related to tech support, troubleshooting, software, or hardware issues. Please upload only tech support related documents.",
                    "type": "domain_validation_error"
                }
            )

        # 5. Generate summary from all text
        summary = generate_summary(full_text)

        # 6. Convert page texts to chunk dictionaries with metadata
        chunks_with_meta = page_texts_to_chunks(
            page_texts=page_texts,
            pdf_name=file.filename,
            domain="techsupport"  # ✅ Tag all uploaded PDFs as techsupport
        )

        # 7. Add chunks to FAISS & store metadata
        embed_chunks_with_metadata(chunks_with_meta)

        # 8. Return filename + summary
        return {"filename": file.filename, "summary": summary}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
