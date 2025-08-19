# backend/routes/history.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from services.chat_service import get_recent_messages, clear_history
from routes.auth import get_current_user

router = APIRouter(prefix="/history", tags=["history"])

@router.get("/recent")
async def recent(current_user = Depends(get_current_user), limit: int = 20):
    try:
        msgs = await get_recent_messages(current_user["id"], limit=limit)
        # Ensure JSON-safe encoding for datetimes and any special types
        return {"messages": jsonable_encoder(msgs)}
    except Exception as e:
        import traceback
        print(f"❌ Error in /history/recent: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clear")
async def clear(current_user = Depends(get_current_user)):
    deleted = await clear_history(current_user["id"])
    return {"ok": True, "deleted": jsonable_encoder(deleted)}
