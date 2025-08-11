from fastapi import APIRouter, HTTPException
import os

router = APIRouter()

UPLOAD_FOLDER = "uploads"

@router.delete("/delete/{filename}")
def delete_file(filename: str):
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        os.remove(filepath)
        return {"success": True, "message": f"{filename} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
