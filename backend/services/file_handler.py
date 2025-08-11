import os
from fastapi import UploadFile

UPLOAD_DIR = "uploads"

# Ensure upload folder exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_uploaded_file(uploaded_file: UploadFile) -> str:
    """
    Saves uploaded file to uploads/ and returns full path.
    """
    file_path = os.path.join(UPLOAD_DIR, uploaded_file.filename)

    with open(file_path, "wb") as f:
        f.write(uploaded_file.file.read())

    return file_path
