import logging
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.database import get_database
from app.core.config import settings
from app.models.evaluation_schemas import DailyEvaluationReport

logger = logging.getLogger("researchmind")

# Global scheduler instance
scheduler = AsyncIOScheduler()

async def run_nightly_evaluation() -> None:
    """
    Nightly evaluation job run at 2AM.
    Aggregates the last 100 evaluations, checks thresholds,
    records daily stats, and triggers alerts in MongoDB.
    """
    logger.info("[EvaluationScheduler] Starting nightly evaluation analysis...")
    db = get_database()
    
    try:
        # Sample the last 100 evaluation scores
        cursor = db.evaluation_scores.find({}).sort("timestamp", -1).limit(settings.ragas_sample_size)
        scores = await cursor.to_list(length=settings.ragas_sample_size)
        
        total_evaluated = len(scores)
        if total_evaluated == 0:
            logger.info("[EvaluationScheduler] No conversation evaluations found to aggregate today.")
            return

        # Calculate averages and quality counts
        sum_faithfulness = 0.0
        sum_answer_relevance = 0.0
        sum_context_relevance = 0.0
        sum_composite = 0.0
        
        excellent_count = 0
        good_count = 0
        acceptable_count = 0
        poor_count = 0
        
        for record in scores:
            sum_faithfulness += record.get("faithfulness", 0.0)
            sum_answer_relevance += record.get("answer_relevance", 0.0)
            sum_context_relevance += record.get("context_relevance", 0.0)
            sum_composite += record.get("composite_score", 0.0)
            
            q_level = record.get("quality_level", "poor").lower()
            if q_level == "excellent":
                excellent_count += 1
            elif q_level == "good":
                good_count += 1
            elif q_level == "acceptable":
                acceptable_count += 1
            else:
                poor_count += 1

        avg_faithfulness = sum_faithfulness / total_evaluated
        avg_answer_relevance = sum_answer_relevance / total_evaluated
        avg_context_relevance = sum_context_relevance / total_evaluated
        avg_composite = sum_composite / total_evaluated

        # Check alert thresholds:
        # Faithfulness drops below 0.70
        # Answer Relevance drops below 0.65
        # Context Relevance drops below 0.55
        alerts = []
        if avg_faithfulness < 0.70:
            alerts.append(f"ALERT: Daily average Faithfulness is low: {avg_faithfulness:.2f} (Threshold: 0.70)")
        if avg_answer_relevance < 0.65:
            alerts.append(f"ALERT: Daily average Answer Relevance is low: {avg_answer_relevance:.2f} (Threshold: 0.65)")
        if avg_context_relevance < 0.55:
            alerts.append(f"ALERT: Daily average Context Relevance is low: {avg_context_relevance:.2f} (Threshold: 0.55)")

        # Create daily report document
        report = DailyEvaluationReport(
            date=datetime.now(timezone.utc),
            total_evaluated=total_evaluated,
            avg_faithfulness=avg_faithfulness,
            avg_answer_relevance=avg_answer_relevance,
            avg_context_relevance=avg_context_relevance,
            avg_composite=avg_composite,
            excellent_count=excellent_count,
            good_count=good_count,
            acceptable_count=acceptable_count,
            poor_count=poor_count,
            alerts=alerts
        )

        # Store Daily Report in MongoDB
        await db.evaluation_reports.insert_one(report.model_dump())
        logger.info(f"[EvaluationScheduler] Daily evaluation report successfully created for {total_evaluated} records.")

        # Persist alerts to a separate quality alerts collection if triggered
        if alerts:
            for alert_msg in alerts:
                alert_doc = {
                    "alert_message": alert_msg,
                    "avg_faithfulness": avg_faithfulness,
                    "avg_answer_relevance": avg_answer_relevance,
                    "avg_context_relevance": avg_context_relevance,
                    "timestamp": datetime.now(timezone.utc),
                    "resolved": False
                }
                await db.quality_alerts.insert_one(alert_doc)
                logger.warning(f"[EvaluationScheduler] Quality alert persisted: {alert_msg}")

            # Trace alert events to LangSmith if configured
            if settings.langchain_api_key:
                try:
                    from langsmith import Client
                    ls_client = Client(api_url="https://api.smith.langchain.com", api_key=settings.langchain_api_key)
                    ls_client.create_run(
                        name="RAG Quality Alert Triggered",
                        run_type="chain",
                        inputs={"alerts": alerts},
                        outputs={"average_composite": avg_composite},
                        tags=["evaluation.alert", "evaluation.threshold_breach"],
                        project_name=settings.langchain_project or "researchmind"
                    )
                except Exception as ls_err:
                    logger.debug(f"[EvaluationScheduler] LangSmith logging failed: {ls_err}")

    except Exception as e:
        logger.error(f"[EvaluationScheduler] Error running nightly evaluation: {e}", exc_info=True)

def start_scheduler() -> None:
    """Initialize and run evaluation scheduler cron job."""
    if not scheduler.running:
        scheduler.add_job(
            run_nightly_evaluation,
            "cron",
            hour=2,
            minute=0,
            id="nightly_evaluation_job",
            replace_existing=True
        )
        scheduler.start()
        logger.info("[EvaluationScheduler] APScheduler nightly evaluation job registered at 2:00 AM daily.")

def shutdown_scheduler() -> None:
    """Gracefully shutdown evaluation scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[EvaluationScheduler] APScheduler shut down.")
