# backend/routes/auth.py
from fastapi import APIRouter, HTTPException, Depends, Header
from models.schemas import UserCreate, UserLogin
from services.user_service import create_user, authenticate_user, get_user_by_email, set_domain_filter
from auth import create_access_token, decode_access_token
from typing import Optional

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup")
async def signup(payload: UserCreate):
    user = await create_user(payload.email, payload.password, payload.username)
    if not user:
        raise HTTPException(status_code=400, detail="User already exists")
    token = create_access_token({"user_id": user["id"], "email": user["email"]})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user["id"], "email": user["email"], "username": user.get("username")}}

@router.post("/login")
async def login(payload: UserLogin):
    user = await authenticate_user(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"user_id": user["id"], "email": user["email"]})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user["id"], "email": user["email"], "username": user.get("username")}}

# Dependency for routes: get current user from Authorization header: "Bearer <token>"
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header format")
    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await get_user_by_email(payload.get("email"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

