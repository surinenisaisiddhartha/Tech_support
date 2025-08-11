# backend/db.py
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "chatbot_db")

_client = AsyncIOMotorClient(MONGO_URI)
db = _client[MONGO_DB]

# Collections
users_col = db["users"]
chats_col = db["chats"]
files_meta_col = db["files_meta"]   # optional; store uploaded file metadata
