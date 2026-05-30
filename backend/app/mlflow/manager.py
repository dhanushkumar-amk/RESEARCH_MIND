import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.database import get_database

logger = logging.getLogger("researchmind")

class BestConfigManager:
    # Class-level caches for currently applied configurations
    _applied_rag: Dict[str, Any] = {
        "chunk_size": 512,
        "chunk_overlap": 50,
        "k_value": 10,
        "reranker_top_n": 5,
        "embedding_model": "all-MiniLM-L6-v2",
        "reranker_model": "cross-encoder/ms-marco-MiniLM-L-6-v2",
        "hybrid_vector_weight": 0.6,
        "hybrid_bm25_weight": 0.4
    }
    
    _applied_agent: Dict[str, Any] = {
        "primary_model": "groq/llama-3.3-70b-versatile",
        "fallback_models": [
            "openrouter/meta-llama/llama-3.3-70b-instruct:free",
            "openrouter/deepseek/deepseek-r1:free",
            "openrouter/nvidia/nemotron-3-super-120b:free",
            "openrouter/qwen/qwen3-coder:free",
            "openrouter/mistralai/mistral-7b-instruct:free",
            "openrouter/microsoft/phi-3-medium-128k-instruct:free",
            "openrouter/meta-llama/llama-3.1-8b-instruct:free",
            "openrouter/openai/gpt-oss-120b:free",
            "openrouter/deepseek/deepseek-v4-flash:free",
            "gemini/gemini-1.5-flash"
        ],
        "temperature": 0.1,
        "max_tokens": 1000,
        "tools_used": [
            "tavily_search", "wikipedia_search", "arxiv_search", "pubmed_search",
            "hackernews_search", "duckduckgo_search", "youtube_transcript",
            "reddit_search", "github_search", "news_search"
        ],
        "retry_count": 2
    }

    @classmethod
    async def get_best_config(cls, config_type: str) -> Optional[Dict[str, Any]]:
        """Fetch the current best config from MongoDB."""
        try:
            db = get_database()
            return await db.best_configs.find_one({"config_type": config_type})
        except Exception as e:
            logger.error(f"[BestConfigManager] Error fetching best config: {e}")
            return None

    @classmethod
    async def update_best_config(
        cls, 
        config_type: str, 
        config: Dict[str, Any], 
        scores: Dict[str, float], 
        mlflow_run_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update best config in MongoDB, increment version, and log to LangSmith."""
        db = get_database()
        existing = await db.best_configs.find_one({"config_type": config_type})
        
        new_version = (existing.get("version", 0) + 1) if existing else 1
        
        record = {
            "config_type": config_type,
            "config": config,
            "composite_score": float(scores.get("composite_score", 0.0)),
            "faithfulness": float(scores.get("faithfulness", 0.0)),
            "answer_relevance": float(scores.get("answer_relevance", 0.0)),
            "context_relevance": float(scores.get("context_relevance", 0.0)),
            "mlflow_run_id": mlflow_run_id or "",
            "updated_at": datetime.now(timezone.utc),
            "version": new_version
        }
        
        await db.best_configs.update_one(
            {"config_type": config_type},
            {"$set": record},
            upsert=True
        )
        
        # Log to LangSmith
        if settings.langchain_api_key:
            try:
                from langsmith import Client
                ls_client = Client(api_url="https://api.smith.langchain.com", api_key=settings.langchain_api_key)
                
                now = datetime.now(timezone.utc)
                ls_client.create_run(
                    name=f"Update Best Config: {config_type}",
                    run_type="chain",
                    inputs={"config_type": config_type, "config": config},
                    outputs={"scores": scores, "version": new_version, "mlflow_run_id": mlflow_run_id},
                    tags=["config.update", f"config.{config_type}"],
                    project_name=settings.langchain_project or "researchmind",
                    start_time=now,
                    end_time=now
                )
            except Exception as ls_err:
                logger.debug(f"[BestConfigManager] LangSmith config trace failed: {ls_err}")
                
        # Also update class-level memory cache so the application uses it immediately
        if config_type == "rag":
            cls._applied_rag.update(config)
        elif config_type == "agent":
            cls._applied_agent.update(config)
            
        logger.info(f"[BestConfigManager] Updated best config for '{config_type}' to version {new_version}.")
        return record

    @classmethod
    async def apply_best_config(cls) -> None:
        """Load best config from MongoDB on startup and update in-memory configurations."""
        try:
            logger.info("[BestConfigManager] Loading best configurations from MongoDB...")
            
            rag_record = await cls.get_best_config("rag")
            if rag_record and "config" in rag_record:
                cls._applied_rag.update(rag_record["config"])
                logger.info(f"[BestConfigManager] Applied best RAG config: {cls._applied_rag}")
            else:
                logger.info("[BestConfigManager] No best RAG config found in MongoDB. Using default values.")
                
            agent_record = await cls.get_best_config("agent")
            if agent_record and "config" in agent_record:
                cls._applied_agent.update(agent_record["config"])
                logger.info(f"[BestConfigManager] Applied best Agent config: {cls._applied_agent}")
            else:
                logger.info("[BestConfigManager] No best Agent config found in MongoDB. Using default values.")
                
            # Log applied config to LangSmith
            if settings.langchain_api_key:
                try:
                    from langsmith import Client
                    ls_client = Client(api_url="https://api.smith.langchain.com", api_key=settings.langchain_api_key)
                    now = datetime.now(timezone.utc)
                    ls_client.create_run(
                        name="Apply Best Config on Startup",
                        run_type="chain",
                        inputs={"status": "initialization"},
                        outputs={
                            "applied_rag_config": cls._applied_rag,
                            "applied_agent_config": cls._applied_agent
                        },
                        tags=["config.startup"],
                        project_name=settings.langchain_project or "researchmind",
                        start_time=now,
                        end_time=now
                    )
                except Exception as ls_err:
                    logger.debug(f"[BestConfigManager] LangSmith startup trace failed: {ls_err}")
                    
        except Exception as e:
            logger.error(f"[BestConfigManager] Error during startup configuration load: {e}")

    @classmethod
    def get_applied_rag_config(cls) -> Dict[str, Any]:
        """Get currently active RAG configurations."""
        return cls._applied_rag

    @classmethod
    def get_applied_agent_config(cls) -> Dict[str, Any]:
        """Get currently active Agent configurations."""
        return cls._applied_agent
