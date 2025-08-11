import fitz  # PyMuPDF

def extract_text_from_pdf(file_path):
    """
    Extracts and returns full text from a PDF file.
    (Legacy function – kept for compatibility if needed elsewhere.)
    """
    try:
        doc = fitz.open(file_path)
        text = ""

        for page in doc:
            text += page.get_text()

        return text.strip()
    
    except Exception as e:
        print(f"❌ Error reading PDF: {e}")
        return ""


def extract_text_by_page(file_path):
    """
    Extracts text from a PDF file and returns a list of tuples:
    [
        (page_number, text),
        ...
    ]
    Page numbers are 1-based.
    """
    results = []
    try:
        doc = fitz.open(file_path)
        for page_num, page in enumerate(doc, start=1):
            page_text = page.get_text().strip()
            results.append((page_num, page_text))
        return results
    except Exception as e:
        print(f"❌ Error reading PDF (page-wise): {e}")
        return []
