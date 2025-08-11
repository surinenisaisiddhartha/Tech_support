# backend/services/user_service.py
from db import users_col
from auth import hash_password, verify_password
from bson import ObjectId
import datetime

async def create_user(email: str, password: str, username: str | None = None):
    existing = await users_col.find_one({"email": email})
    if existing:
        return None
    doc = {
        "email": email,
        "username": username or "",
        "password": hash_password(password),
        "created_at": datetime.datetime.utcnow(),
        "updated_at": datetime.datetime.utcnow(),
        "domain_filter": True  # default = strict tech-support mode
    }
    res = await users_col.insert_one(doc)
    user = await users_col.find_one({"_id": res.inserted_id})
    user["id"] = str(user["_id"])
    return user

async def authenticate_user(email: str, password: str):
    user = await users_col.find_one({"email": email})
    if not user:
        return None
    if not verify_password(password, user["password"]):
        return None
    user["id"] = str(user["_id"])
    return user

async def get_user_by_email(email: str):
    user = await users_col.find_one({"email": email})
    if not user:
        return None
    user["id"] = str(user["_id"])
    return user

async def get_user_by_id_str(id_str: str):
    try:
        oid = ObjectId(id_str)
    except Exception:
        return None
    user = await users_col.find_one({"_id": oid})
    if not user:
        return None
    user["id"] = str(user["_id"])
    return user

async def set_domain_filter(user_id: str, flag: bool):
    await users_col.update_one({"_id": ObjectId(user_id)}, {"$set": {"domain_filter": bool(flag), "updated_at": datetime.datetime.utcnow()}})
    u = await get_user_by_id_str(user_id)
    return u
