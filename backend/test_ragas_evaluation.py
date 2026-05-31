import asyncio
import os
import sys
import logging
from datetime import datetime, timezone
from unittest.mock import MagicMock, AsyncMock

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_ragas")

# Ensure app is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Pro tip: Mock missing vertexai modules before any RAGAS imports
import sys
from unittest.mock import MagicMock
sys.modules["langchain_community.chat_models.vertexai"] = MagicMock()
sys.modules["langchain_community.embeddings.vertexai"] = MagicMock()

# -------------------------------------------------------------
# MOCK DATABASE AND LLM
# -------------------------------------------------------------
from test_context_pipeline import MockDatabase

mock_db = MockDatabase()
import app.core.database
app.core.database.get_database = lambda: mock_db
app.core.database.connect_to_mongo = AsyncMock()
app.core.database.close_mongo_connection = AsyncMock()

# Mock ChatGroq to return mock RAGAS scores or text
class MockResponse:
    def __init__(self, content):
        self.content = content

class MockChatGroq:
    def __init__(self, *args, **kwargs):
        pass
    async def ainvoke(self, *args, **kwargs):
        # Return a simple mock answer for critic or metrics
        return MockResponse("This is a mock evaluated response.")

import langchain_groq
langchain_groq.ChatGroq = MockChatGroq

# Mock Ragas evaluate function to return expected scores directly
import ragas
def mock_evaluate(dataset, metrics, *args, **kwargs):
    logger.info(f"Mocking RAGAS evaluate call for metrics: {[m.name for m in metrics]}")
    # Return scores for faithfulness, answer_relevancy, context_precision
    return {
        "faithfulness": 0.90,
        "answer_relevancy": 0.85,
        "context_precision": 0.80,
        "context_recall": 0.75,
        "answer_correctness": 0.88
    }
ragas.evaluate = mock_evaluate



# Now import RAGAS Evaluator and Router
from app.evaluation.ragas_evaluator import RAGASEvaluator
from app.evaluation.scheduler import run_nightly_evaluation

async def run_tests():
    logger.info("Initializing mock database records...")
    
    session_id = "ragas_test_session_999"
    question = "What is ResearchMind's context engineering layer?"
    answer = "ResearchMind's context engineering layer manages token budgets and dynamic prompts."
    contexts = [
        "ResearchMind has a context engineering layer that dynamically fits prompt context into limits.",
        "It allocates system budget, history budget, context budget and query budget within 8000 tokens."
    ]

    try:
        # -------------------------------------------------------------
        # TEST 1: RAGASEvaluator manual evaluation
        # -------------------------------------------------------------
        logger.info("\n--- TEST 1: RAGASEvaluator ---")
        evaluator = RAGASEvaluator()
        
        result = await evaluator.evaluate_response(
            question=question,
            answer=answer,
            contexts=contexts,
            session_id=session_id,
            ground_truth="ResearchMind implements context engineering with a token budget manager and memory."
        )
        
        logger.info(f"Evaluation result: {result.model_dump()}")
        assert result.faithfulness == 0.90
        assert result.answer_relevance == 0.85
        assert result.context_relevance == 0.80
        assert result.composite_score == (0.90 * 0.35 + 0.85 * 0.35 + 0.80 * 0.30)
        assert result.quality_level == "excellent"
        assert not result.needs_disclaimer
        assert not result.needs_regeneration
        
        # Verify MongoDB persistence (sleep briefly to let the background create_task run)
        await asyncio.sleep(0.2)
        inserted_score = await mock_db.evaluation_scores.find_one({"session_id": session_id})
        logger.info(f"Saved DB score: {inserted_score}")
        assert inserted_score is not None
        assert inserted_score["quality_level"] == "excellent"

        # -------------------------------------------------------------
        # TEST 2: Nightly Evaluation Scheduler job
        # -------------------------------------------------------------
        logger.info("\n--- TEST 2: Nightly Evaluation Scheduler Job ---")
        # Ensure we have a score record in DB
        await run_nightly_evaluation()
        
        # Verify Daily report is created
        report = await mock_db.evaluation_reports.find_one({})
        logger.info(f"Generated Daily Report: {report}")
        assert report is not None
        assert report["total_evaluated"] == 1
        assert report["avg_composite"] == result.composite_score
        assert report["excellent_count"] == 1

        logger.info("\nRAGAS Evaluation tests completed successfully!")
    finally:
        # Cleanup mock database
        await mock_db.evaluation_scores.delete_many({})
        await mock_db.evaluation_reports.delete_many({})

if __name__ == "__main__":
    asyncio.run(run_tests())
