import logging
import time
import asyncio
from datetime import datetime, timezone
from uuid import uuid4
from typing import List, Dict, Any, Optional
from datasets import Dataset

from app.core.config import settings
from app.core.database import get_database
from app.models.evaluation_schemas import EvaluationResult, ScoreRecord
from app.evaluation.metrics import get_ragas_metrics, get_ragas_llm_and_embeddings

logger = logging.getLogger("researchmind")

class RAGASEvaluator:
    def __init__(self):
        self.db = get_database()

    async def evaluate_response(
        self,
        question: str,
        answer: str,
        contexts: List[str],
        session_id: str = "manual",
        ground_truth: Optional[str] = None,
        model_used: str = "groq/llama-3.3-70b-versatile"
    ) -> EvaluationResult:
        """
        Run RAGAS evaluation on question, answer, and retrieved contexts.
        Returns a structured EvaluationResult and persists scores to MongoDB.
        """
        start_time = time.time()
        logger.info(f"[RAGASEvaluator] Starting RAGAS evaluation for session {session_id}...")

        # Step 1: Prepare RAGAS dataset
        data = {
            "question": [question],
            "answer": [answer],
            "contexts": [contexts],
            "reference": [ground_truth if ground_truth else question]
        }
        if ground_truth:
            data["ground_truth"] = [ground_truth]

        dataset = Dataset.from_dict(data)

        # Get configured metrics & wrapped models
        metrics = get_ragas_metrics()
        ragas_llm, ragas_embeddings = get_ragas_llm_and_embeddings()

        # Identify which metrics to run (core vs optional with ground truth)
        # faithfulness: index 0, answer_relevance: index 1, context_relevance: index 2,
        # context_recall: index 3, answer_correctness: index 4
        run_metrics = [metrics[0], metrics[1], metrics[2]]
        if ground_truth:
            run_metrics.append(metrics[3])
            run_metrics.append(metrics[4])

        # Step 2 & 3: Run metrics with 90s timeout using threadpool to prevent event loop blocking
        from ragas import evaluate
        try:
            logger.info(f"[RAGASEvaluator] Running {len(run_metrics)} RAGAS metrics in thread pool...")
            result_dict = await asyncio.wait_for(
                asyncio.to_thread(
                    evaluate,
                    dataset=dataset,
                    metrics=run_metrics,
                    llm=ragas_llm,
                    embeddings=ragas_embeddings
                ),
                timeout=90.0
            )
        except asyncio.TimeoutError:
            logger.error("[RAGASEvaluator] RAGAS evaluation timed out after 90 seconds.")
            # Graceful fallback: return zeroed out values if it times out
            result_dict = {}
        except Exception as e:
            logger.error(f"[RAGASEvaluator] RAGAS evaluation failed: {e}", exc_info=True)
            result_dict = {}

        # Safely extract score values with 0.0 defaults
        faithfulness_score = float(result_dict.get("faithfulness", 0.0))
        answer_relevance_score = float(result_dict.get("answer_relevancy", 0.0))
        context_relevance_score = float(result_dict.get("context_precision", 0.0))
        context_recall_score = float(result_dict.get("context_recall", 0.0)) if ground_truth else None
        answer_correctness_score = float(result_dict.get("answer_correctness", 0.0)) if ground_truth else None

        # Step 4: Calculate composite score
        composite_score = (
            faithfulness_score * 0.35 +
            answer_relevance_score * 0.35 +
            context_relevance_score * 0.30
        )

        # Step 5: Determine quality level
        if composite_score >= 0.80:
            quality_level = "excellent"
        elif composite_score >= 0.65:
            quality_level = "good"
        elif composite_score >= 0.50:
            quality_level = "acceptable"
        else:
            quality_level = "poor"

        # Determine warning and regeneration conditions based on thresholds
        needs_disclaimer = faithfulness_score < settings.ragas_faithfulness_threshold
        needs_regeneration = answer_relevance_score < settings.ragas_answer_relevance_threshold

        latency_ms = int((time.time() - start_time) * 1000)
        logger.info(f"[RAGASEvaluator] Evaluation finished in {latency_ms}ms. Composite score: {composite_score:.2f} ({quality_level})")

        # Step 6: Assemble final output Pydantic model
        eval_result = EvaluationResult(
            faithfulness=faithfulness_score,
            answer_relevance=answer_relevance_score,
            context_relevance=context_relevance_score,
            context_recall=context_recall_score,
            answer_correctness=answer_correctness_score,
            composite_score=composite_score,
            quality_level=quality_level,
            needs_disclaimer=needs_disclaimer,
            needs_regeneration=needs_regeneration,
            evaluation_latency_ms=latency_ms
        )

        # Persist score to MongoDB (runs in background to not block return path)
        flagged = composite_score < settings.ragas_composite_threshold
        flag_reason = ""
        if flagged:
            flag_reason = f"Composite score {composite_score:.2f} is below threshold {settings.ragas_composite_threshold}"
        elif needs_disclaimer:
            flag_reason = f"Faithfulness score {faithfulness_score:.2f} is below threshold {settings.ragas_faithfulness_threshold}"

        score_rec = ScoreRecord(
            id=str(uuid4()),
            session_id=session_id,
            question=question,
            answer=answer,
            faithfulness=faithfulness_score,
            answer_relevance=answer_relevance_score,
            context_relevance=context_relevance_score,
            composite_score=composite_score,
            quality_level=quality_level,
            model_used=model_used,
            latency_ms=latency_ms,
            timestamp=datetime.now(timezone.utc),
            flagged=flagged or needs_disclaimer,
            flag_reason=flag_reason
        )
        
        asyncio.create_task(self._persist_scores_to_db(score_rec))



        # Log LangSmith evaluation trace metrics
        self._log_to_langsmith_trace(eval_result, session_id, flagged or needs_disclaimer)

        return eval_result

    async def _persist_scores_to_db(self, record: ScoreRecord) -> None:
        """Helper to insert score record into MongoDB collection evaluation_scores."""
        try:
            await self.db.evaluation_scores.insert_one(record.model_dump())
            logger.debug(f"[RAGASEvaluator] Saved evaluation scores to MongoDB: {record.id}")
        except Exception as e:
            logger.error(f"[RAGASEvaluator] Failed to persist scores to MongoDB: {e}")

    def _log_to_langsmith_trace(self, eval_result: EvaluationResult, session_id: str, flagged: bool) -> None:
        """Helper to trace evaluations in LangSmith using LangChain settings."""
        if settings.langchain_api_key:
            try:
                from langsmith import Client
                ls_client = Client(api_url="https://api.smith.langchain.com", api_key=settings.langchain_api_key)
                
                tags = [
                    "evaluation.faithfulness",
                    "evaluation.answer_relevance",
                    "evaluation.context_relevance",
                    "evaluation.composite"
                ]
                if flagged:
                    tags.append("evaluation.flagged")
                if eval_result.needs_regeneration:
                    tags.append("evaluation.regenerated")

                now = datetime.now(timezone.utc)
                asyncio.create_task(
                    asyncio.to_thread(
                        ls_client.create_run,
                        name="RAGAS Evaluation Run",
                        run_type="llm",
                        inputs={"session_id": session_id},
                        outputs=eval_result.model_dump(),
                        tags=tags,
                        project_name=settings.langchain_project or "researchmind",
                        start_time=now,
                        end_time=now
                    )
                )
            except Exception as e:
                logger.debug(f"[RAGASEvaluator] LangSmith logging failed: {e}")
