import fitz  # PyMuPDF
from PIL import Image
import pytesseract
import io

def extract_text_from_pdf(file_path):
    """
    Extracts text from a PDF.
    Uses native text layer if available, otherwise falls back to OCR.
    Returns: full text string.
    """
    try:
        doc = fitz.open(file_path)
        text = ""

        for page in doc:
            page_text = page.get_text("text").strip()
            if page_text:
                # Normal PDF page (has a text layer)
                text += page_text + "\n"
            else:
                # Fallback to OCR for scanned page
                pix = page.get_pixmap()
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                ocr_text = pytesseract.image_to_string(img, lang="eng")
                text += ocr_text + "\n"

        return text.strip()
    
    except Exception as e:
        print(f"❌ Error reading PDF with OCR: {e}")
        return ""


def extract_text_by_page(file_path):
    """
    Extracts text page by page with OCR fallback.
    Returns: [(page_number, text), ...]
    """
    results = []
    try:
        doc = fitz.open(file_path)
        for page_num, page in enumerate(doc, start=1):
            page_text = page.get_text("text").strip()
            if not page_text:
                # OCR fallback
                pix = page.get_pixmap()
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                page_text = pytesseract.image_to_string(img, lang="eng").strip()

            results.append((page_num, page_text))
        return results
    except Exception as e:
        print(f"❌ Error reading PDF (page-wise OCR): {e}")
        return []
