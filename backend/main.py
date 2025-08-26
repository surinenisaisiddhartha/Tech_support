from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routes import upload, chat, reset, delete_file
from services.embedder import load_vector_store
from routes.auth import router as auth_router
from routes.history import router as history_router
from routes.chat import router as chat_router

app = FastAPI()

# CORS
# Allow configuring CORS origins via env var (comma-separated), with local defaults
cors_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://192.168.0.50:3000, https://tech-support-backend.onrender.com")
origins = [o.strip() for o in cors_env.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load vector store on startup
@app.on_event("startup")
def startup_event():
    print("🔁 Loading vector store...")
    load_vector_store()
    print("✅ Vector store ready.")

# Routers
app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(reset.router)
app.include_router(delete_file.router)
app.include_router(auth_router)
app.include_router(history_router)
app.include_router(chat_router)