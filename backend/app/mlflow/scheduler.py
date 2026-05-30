import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.core.config import settings
from app.core.database import get_database
from app.mlflow.runner import ExperimentRunner

logger = logging.getLogger("researchmind")

# Config variations to test weekly
RAG_VARIATIONS: List[Dict[str, Any]] = [
    {
        "chunk_size": 256,
        "chunk_overlap": 50,
        "k_value": 10,
        "reranker_top_n": 3,
        "embedding_model": "all-MiniLM-L6-v2",
        "reranker_model": "cross-encoder/ms-marco-MiniLM-L-6-v2",
        "hybrid_vector_weight": 0.5,
        "hybrid_bm25_weight": 0.5
    },
    {
        "chunk_size": 512,
        "chunk_overlap": 50,
        "k_value": 15,
        "reranker_top_n": 5,
        "embedding_model": "all-MiniLM-L6-v2",
        "reranker_model": "cross-encoder/ms-marco-MiniLM-L-6-v2",
        "hybrid_vector_weight": 0.6,
        "hybrid_bm25_weight": 0.4
    },
    {
        "chunk_size": 1024,
        "chunk_overlap": 100,
        "k_value": 20,
        "reranker_top_n": 7,
        "embedding_model": "all-MiniLM-L6-v2",
        "reranker_model": "cross-encoder/ms-marco-MiniLM-L-6-v2",
        "hybrid_vector_weight": 0.7,
        "hybrid_bm25_weight": 0.3
    },
    {
        "chunk_size": 512,
        "chunk_overlap": 50,
        "k_value": 10,
        "reranker_top_n": 5,
        "embedding_model": "all-MiniLM-L6-v2",
        "reranker_model": "cross-encoder/ms-marco-MiniLM-L-6-v2",
        "hybrid_vector_weight": 0.7,
        "hybrid_bm25_weight": 0.3
    },
    {
        "chunk_size": 256,
        "chunk_overlap": 50,
        "k_value": 15,
        "reranker_top_n": 5,
        "embedding_model": "all-MiniLM-L6-v2",
        "reranker_model": "cross-encoder/ms-marco-MiniLM-L-6-v2",
        "hybrid_vector_weight": 0.6,
        "hybrid_bm25_weight": 0.4
    }
]

AGENT_VARIATIONS: List[Dict[str, Any]] = [
    {
        "primary_model": "groq/llama-3.3-70b-versatile",
        "fallback_models": [
            "openrouter/meta-llama/llama-3.3-70b-instruct:free",
            "openrouter/deepseek/deepseek-r1:free"
        ],
        "temperature": 0.0,
        "max_tokens": 1000,
        "tools_used": ["tavily_search", "wikipedia_search", "arxiv_search"],
        "retry_count": 2
    },
    {
        "primary_model": "groq/llama-3.3-70b-versatile",
        "fallback_models": [
            "openrouter/meta-llama/llama-3.3-70b-instruct:free",
            "openrouter/deepseek/deepseek-r1:free"
        ],
        "temperature": 0.1,
        "max_tokens": 1000,
        "tools_used": ["tavily_search", "wikipedia_search", "arxiv_search", "pubmed_search"],
        "retry_count": 2
    },
    {
        "primary_model": "openrouter/meta-llama/llama-3.3-70b-instruct:free",
        "fallback_models": [
            "groq/llama-3.3-70b-versatile",
            "openrouter/deepseek/deepseek-r1:free"
        ],
        "temperature": 0.2,
        "max_tokens": 1000,
        "tools_used": ["tavily_search", "wikipedia_search", "arxiv_search", "github_search"],
        "retry_count": 2
    }
]

async def run_weekly_experiments() -> None:
    """
    Weekly experiment cron job run on Sunday at 3AM.
    Runs RAG experiments and Agent experiments, generates the weekly report,
    and updates MongoDB and LangSmith.
    """
    logger.info("[WeeklyScheduler] Starting scheduled weekly pipeline experiments...")
    db = get_database()
    
    try:
        # 1. Run RAG variations
        best_rag_config, best_rag_score, rag_all_results = await ExperimentRunner.run_rag_experiment(
            RAG_VARIATIONS
        )
        
        # 2. Run Agent variations
        best_agent_config, best_agent_score, agent_all_results = await ExperimentRunner.run_agent_experiment(
            AGENT_VARIATIONS
        )
        
        # 3. Assemble weekly report
        report = {
            "timestamp": datetime.now(timezone.utc),
            "rag_results": rag_all_results,
            "agent_results": agent_all_results,
            "best_rag_config": best_rag_config,
            "best_rag_score": float(best_rag_score),
            "best_agent_config": best_agent_config,
            "best_agent_score": float(best_agent_score)
        }
        
        # Save to MongoDB
        await db.weekly_reports.insert_one(report)
        logger.info("[WeeklyScheduler] Weekly report successfully generated and saved to MongoDB.")
        
        # 4. Log report metrics to LangSmith
        if settings.langchain_api_key:
            try:
                from langsmith import Client
                ls_client = Client(api_url="https://api.smith.langchain.com", api_key=settings.langchain_api_key)
                
                now = datetime.now(timezone.utc)
                ls_client.create_run(
                    name="Nightly Experiment Job Completed",
                    run_type="chain",
                    inputs={
                        "rag_configs_tested": len(RAG_VARIATIONS),
                        "agent_configs_tested": len(AGENT_VARIATIONS)
                    },
                    outputs={
                        "best_rag_config": best_rag_config,
                        "best_rag_score": best_rag_score,
                        "best_agent_config": best_agent_config,
                        "best_agent_score": best_agent_score
                    },
                    tags=["scheduler.nightly", "experiments.weekly"],
                    project_name=settings.langchain_project or "researchmind",
                    start_time=now,
                    end_time=now
                )
            except Exception as ls_err:
                logger.debug(f"[WeeklyScheduler] LangSmith logging failed: {ls_err}")
                
    except Exception as e:
        logger.error(f"[WeeklyScheduler] Error during weekly experiments run: {e}", exc_info=True)
