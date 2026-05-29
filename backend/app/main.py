from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
import asyncio
import time

from app.api.routes.auth import router as auth_router
from app.api.routes.sources import router as sources_router
from app.api.routes.chat import router as chat_router
from app.core.config import settings
from app.core.database import close_mongo_connection, connect_to_mongo
from app.core.scheduler import start_scheduler, shutdown_scheduler


@asynccontextmanager
async def lifespan(_: FastAPI):
    await connect_to_mongo()
    start_scheduler()
    yield
    shutdown_scheduler()
    await close_mongo_connection()


app = FastAPI(
    title=settings.app_name,
    description="Backend API for proprietary ResearchMind deep research agent workspace",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware to allow connection from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(sources_router)
app.include_router(chat_router)

@app.get("/")
async def root():
    return {"message": "Welcome to ResearchMind Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ResearchMind Backend"}

@app.get("/report/{report_id}")
async def get_report(report_id: str):
    return {
        "id": report_id,
        "title": "Mock Synthesized Report",
        "content": "Sulfide-based solid electrolyte batteries show cell densities exceeding 500 Wh/kg as of pilot lines in Q1 2026.",
        "citations": ["Toyota Battery Corp Annual Report (Q2 2026)"],
        "grounding_rating": 98
    }



@app.get("/metrics")
async def get_metrics():
    return {
        "ragas_faithfulness": 0.96,
        "ragas_answer_relevance": 0.94,
        "ragas_context_relevance": 0.90,
        "cache_hit_rate": 0.42,
        "total_requests": 150
    }
