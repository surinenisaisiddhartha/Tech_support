# backend/models/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# Existing models (kept)
class UploadResponse(BaseModel):
    filename: str
    summary: str

class ChatRequest(BaseModel):
    query: str
    filter_mode: Optional[bool] = True 
    
class ChatResponse(BaseModel):
    answer: str

# Auth models
class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = Field(None, min_length=3, max_length=50)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserPublic(UserBase):
    id: str
    created_at: datetime

# Chat history models
class ChatMessage(BaseModel):
    query: str
    answer: str
    timestamp: datetime
    pdf_reference: Optional[str] = None
    page_number: Optional[int] = None
    metadata: Optional[dict] = None

class ChatHistory(BaseModel):
    user_id: str
    messages: List[ChatMessage]
