import asyncio
import os
import sys
import logging
from unittest.mock import AsyncMock, MagicMock

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_mlflow")

# Ensure app is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Mock vertexai modules for safety
sys.modules["langchain_community.chat_models.vertexai"] = MagicMock()
sys.modules["langchain_community.embeddings.vertexai"] = MagicMock()

async def run_tests():
    logger.info("Verifying MLflow module imports...")
    try:
        from app.mlflow.config import init_mlflow
        from app.mlflow.manager import BestConfigManager
        from app.mlflow.runner import ExperimentRunner
        from app.mlflow.registry import register_config_model, promote_to_production, rollback_production_model
        from app.mlflow.scheduler import run_weekly_experiments
        from app.mlflow.endpoints import router as mlflow_router
        
        logger.info("✓ All MLflow module imports successful!")
    except Exception as e:
        logger.error(f"✗ Import failed: {e}", exc_info=True)
        sys.exit(1)
        
    # Verify BestConfigManager cached properties
    logger.info("Verifying BestConfigManager active configurations...")
    rag_cfg = BestConfigManager.get_applied_rag_config()
    agent_cfg = BestConfigManager.get_applied_agent_config()
    logger.info(f"Active RAG config: {rag_cfg}")
    logger.info(f"Active Agent config: {agent_cfg}")
    
    assert rag_cfg["chunk_size"] == 512
    assert agent_cfg["temperature"] == 0.1
    logger.info("✓ BestConfigManager caching works as expected.")
    
    logger.info("MLflow Integration test completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_tests())
