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
from app.api.routes.chat import router as chat_router, init_bm25_retriever
from app.api.routes.agents import router as agents_router
from app.api.routes.security import router as security_router
from app.evaluation.evaluation_api import router as evaluation_router
from app.api.routes.settings import router as settings_router
from app.core.config import settings
from app.core.database import close_mongo_connection, connect_to_mongo
from app.core.scheduler import start_scheduler, shutdown_scheduler

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.security.rate_limiter import limiter


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Establish MongoDB connection synchronously (very fast)
    await connect_to_mongo()
    
    start_scheduler()
    
    # Run heavy initialization and network tasks in the background for instant server startup
    async def run_startup_tasks():
        try:
            # Apply best configurations (includes network logs to LangSmith)
            from app.mlflow.manager import BestConfigManager
            await BestConfigManager.apply_best_config()
            
            # Pre-fetch chunks and build BM25 index (heavy database reads)
            await init_bm25_retriever()
            
            # Run tool registry health checks (external network HTTP requests to Tavily, ArXiv, GitHub etc.)
            from app.tools.tool_registry import run_tool_registry_health_checks
            await run_tool_registry_health_checks()
        except Exception as e:
            import logging
            logger = logging.getLogger("researchmind")
            logger.error(f"[Lifespan Startup] Error during background initialization: {e}", exc_info=True)
            
    asyncio.create_task(run_startup_tasks())
    
    yield
    shutdown_scheduler()
    await close_mongo_connection()



app = FastAPI(
    title=settings.app_name,
    description="Backend API for proprietary ResearchMind deep research agent workspace",
    version="1.0.0",
    lifespan=lifespan,
)

# Register slowapi
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

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
app.include_router(agents_router)
app.include_router(security_router)
app.include_router(evaluation_router)
app.include_router(settings_router)

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
