# backend/services/chat_service.py
from db import chats_col
from bson import ObjectId
import datetime

async def save_chat_message(user_id: str, query: str, answer: str, metadata: dict | None = None):
    doc = {
        "user_id": user_id,
        "query": query,
        "answer": answer,
        "metadata": metadata or {},
        "created_at": datetime.datetime.utcnow()
    }
    res = await chats_col.insert_one(doc)
    return res.inserted_id

async def get_recent_messages(user_id: str, limit: int = 20):
    cursor = chats_col.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
    msgs = []
    async for d in cursor:
        msgs.append({
            "query": d.get("query"),
            "answer": d.get("answer"),
            "metadata": d.get("metadata", {}),
            "timestamp": d.get("created_at")
        })
    # newest-first -> return oldest-first
    return list(reversed(msgs))

async def clear_history(user_id: str):
    res = await chats_col.delete_many({"user_id": user_id})
    return res.deleted_count
