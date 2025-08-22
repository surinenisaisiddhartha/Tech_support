import os
import io
import fitz  # PyMuPDF
import google.generativeai as genai
from PIL import Image
import pytesseract
from config import GEMINI_API_KEY

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel("gemini-2.0-flash")  # Multimodal model
else:
    gemini_model = None

# Configure Tesseract path on Windows if provided
TESSERACT_CMD = os.getenv("TESSERACT_CMD")
if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD


def _ocr_page(page, scale: float = 2.0, lang: str = "eng") -> str:
    """Render a PDF page to an image and run Tesseract OCR."""
    try:
        mat = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("png")
        with Image.open(io.BytesIO(img_bytes)) as im:
            text = pytesseract.image_to_string(im, lang=lang)
            return (text or "").strip()
    except Exception:
        return ""


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts text from a PDF.
    1. Try Gemini OCR (works on both scanned and digital PDFs).
    2. Fallback: PyMuPDF text extraction.
    """
    try:
        if gemini_model:
            with open(file_path, "rb") as f:
                pdf_bytes = f.read()

            response = gemini_model.generate_content(
                [
                    {
                        "mime_type": "application/pdf",
                        "data": pdf_bytes
                    },
                    "Extract all visible text from this PDF. Return plain text only."
                ]
            )
            if response.text:
                return response.text.strip()

        # --- fallback to PyMuPDF and OCR if needed ---
        doc = fitz.open(file_path)
        parts = []
        for page in doc:
            page_text = page.get_text("text") or ""
            # Heuristic: if low text density, try OCR
            plain = page_text.strip()
            alpha_chars = sum(ch.isalpha() for ch in plain)
            if len(plain) < 40 or (len(plain) > 0 and alpha_chars / max(1, len(plain)) < 0.25):
                ocr_txt = _ocr_page(page)
                if ocr_txt:
                    parts.append(ocr_txt)
                else:
                    parts.append(plain)
            else:
                parts.append(plain)
        return "\n".join(p for p in parts if p).strip()

    except Exception as e:
        print(f"❌ Error extracting PDF with Gemini OCR: {e}")
        return ""


def extract_text_by_page(file_path: str):
    """
    Extracts text page by page using Gemini OCR if available.
    Returns: [(page_number, text), ...]
    """
    results = []
    try:
        if gemini_model:
            with open(file_path, "rb") as f:
                pdf_bytes = f.read()

            response = gemini_model.generate_content(
                [
                    {
                        "mime_type": "application/pdf",
                        "data": pdf_bytes
                    },
                    "Extract text from this PDF page by page. Return output as:\nPage 1: ...\nPage 2: ..."
                ]
            )
            if response.text:
                # Simple parsing of Gemini output
                lines = response.text.splitlines()
                page_num = None
                page_text = []
                for line in lines:
                    if line.lower().startswith("page "):
                        if page_num and page_text:
                            results.append((page_num, " ".join(page_text).strip()))
                            page_text = []
                        try:
                            page_num = int(line.split()[1].replace(":", "").strip())
                        except:
                            page_num = None
                    else:
                        page_text.append(line)
                if page_num and page_text:
                    results.append((page_num, " ".join(page_text).strip()))
                return results

        # --- fallback: PyMuPDF text with OCR per page if needed ---
        doc = fitz.open(file_path)
        for page_num, page in enumerate(doc, start=1):
            page_text = (page.get_text("text") or "").strip()
            alpha_chars = sum(ch.isalpha() for ch in page_text)
            needs_ocr = len(page_text) < 40 or (len(page_text) > 0 and alpha_chars / max(1, len(page_text)) < 0.25)
            if needs_ocr:
                ocr_txt = _ocr_page(page)
                page_text = (ocr_txt or page_text).strip()
            results.append((page_num, page_text))
        return results

    except Exception as e:
        print(f"❌ Error extracting PDF (page-wise Gemini OCR): {e}")
        return []


def extract_text_by_page_with_meta(file_path: str):
    """
    Like extract_text_by_page, but also returns whether a page likely required OCR.
    Returns: list of dicts: {"page_number": int, "text": str, "source_type": "pdf"|"ocr"}
    """
    output = []
    try:
        # Try Gemini first (no reliable per-page OCR flag), fallback mirrors above logic
        if gemini_model:
            # Defer to page-wise function and mark as 'pdf' (text extracted by model) for simplicity
            pages = extract_text_by_page(file_path)
            for num, txt in pages:
                output.append({"page_number": num, "text": txt, "source_type": "pdf"})
            return output

        doc = fitz.open(file_path)
        for page_num, page in enumerate(doc, start=1):
            page_text = (page.get_text("text") or "").strip()
            alpha_chars = sum(ch.isalpha() for ch in page_text)
            needs_ocr = len(page_text) < 40 or (len(page_text) > 0 and alpha_chars / max(1, len(page_text)) < 0.25)
            if needs_ocr:
                ocr_txt = _ocr_page(page)
                txt = (ocr_txt or page_text).strip()
                src = "ocr" if ocr_txt else "pdf"
            else:
                txt = page_text
                src = "pdf"
            output.append({"page_number": page_num, "text": txt, "source_type": src})
        return output
    except Exception as e:
        print(f"❌ Error extracting PDF (page-wise with meta): {e}")
        return []
