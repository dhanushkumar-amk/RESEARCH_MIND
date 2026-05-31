import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query, HTTPException, Path

from app.core.database import get_database
from app.models.evaluation_schemas import (
    EvaluationResult, 
    ManualEvaluationInput, 
    ScoreRecord, 
    DailyEvaluationReport
)
from app.evaluation.ragas_evaluator import RAGASEvaluator

logger = logging.getLogger("researchmind")
router = APIRouter(prefix="/api/evaluation", tags=["RAG Evaluation"])

@router.get("/scores/{session_id}", response_model=List[Dict] if False else Any)
async def get_session_scores(
    session_id: str = Path(..., description="The session ID to query"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page")
):
    """
    Retrieve all evaluation scores for a specific session, paginated.
    """
    db = get_database()
    skip = (page - 1) * limit
    
    try:
        cursor = db.evaluation_scores.find({"session_id": session_id})\
                                      .sort("timestamp", -1)\
                                      .skip(skip)\
                                      .limit(limit)
        scores = await cursor.to_list(length=limit)
        # Convert _id Mongo ObjectId to string for Pydantic compatibility
        for score in scores:
            if "_id" in score:
                score["id"] = str(score["_id"])
                del score["_id"]
        return scores
    except Exception as e:
        logger.error(f"[EvaluationAPI] Error fetching session scores: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching scores.")

@router.get("/daily/{date}")
async def get_daily_report(
    date: str = Path(..., description="Date formatted as YYYY-MM-DD")
):
    """
    Retrieve the daily RAG evaluation report for a given date.
    """
    try:
        parsed_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
        
    db = get_database()
    start_of_day = datetime(parsed_date.year, parsed_date.month, parsed_date.day, tzinfo=timezone.utc)
    end_of_day = start_of_day + timedelta(days=1)
    
    try:
        report = await db.evaluation_reports.find_one({
            "date": {"$gte": start_of_day, "$lt": end_of_day}
        })
        if not report:
            raise HTTPException(status_code=404, detail=f"No daily evaluation report found for date: {date}")
            
        if "_id" in report:
            report["id"] = str(report["_id"])
            del report["_id"]
        return report
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[EvaluationAPI] Error fetching daily report: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching report.")

@router.get("/summary")
async def get_evaluation_summary():
    """
    Retrieve RAG performance summary for the last 7 days.
    Provides average scores per day, quality distribution, and trend analysis.
    """
    db = get_database()
    today = datetime.now(timezone.utc)
    start_date = datetime(today.year, today.month, today.day, tzinfo=timezone.utc) - timedelta(days=7)
    
    try:
        # Query last 7 days of daily reports
        cursor = db.evaluation_reports.find({"date": {"$gte": start_date}}).sort("date", 1)
        reports = await cursor.to_list(length=7)
        
        daily_trends = []
        total_excellent = 0
        total_good = 0
        total_acceptable = 0
        total_poor = 0
        
        for r in reports:
            daily_trends.append({
                "date": r["date"].strftime("%Y-%m-%d"),
                "avg_faithfulness": r.get("avg_faithfulness", 0.0),
                "avg_answer_relevance": r.get("avg_answer_relevance", 0.0),
                "avg_context_relevance": r.get("avg_context_relevance", 0.0),
                "avg_composite": r.get("avg_composite", 0.0)
            })
            total_excellent += r.get("excellent_count", 0)
            total_good += r.get("good_count", 0)
            total_acceptable += r.get("acceptable_count", 0)
            total_poor += r.get("poor_count", 0)
            
        # Determine trend based on composite scores
        trend = "stable"
        if len(daily_trends) >= 2:
            first_val = daily_trends[0]["avg_composite"]
            last_val = daily_trends[-1]["avg_composite"]
            diff = last_val - first_val
            if diff > 0.05:
                trend = "improving"
            elif diff < -0.05:
                trend = "declining"
                
        return {
            "period": "Last 7 Days",
            "daily_trends": daily_trends,
            "quality_distribution": {
                "excellent": total_excellent,
                "good": total_good,
                "acceptable": total_acceptable,
                "poor": total_poor
            },
            "trend": trend
        }
    except Exception as e:
        logger.error(f"[EvaluationAPI] Error generating evaluation summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error compiling summary.")

@router.get("/alerts")
async def get_quality_alerts(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page")
):
    """
    Retrieve paginated quality alerts, optionally filtered by date range.
    """
    db = get_database()
    skip = (page - 1) * limit
    
    query = {}
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            try:
                query["timestamp"]["$gte"] = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD.")
        if end_date:
            try:
                # Add 1 day to end_date to make range inclusive of the end day
                query["timestamp"]["$lt"] = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD.")
                
    try:
        cursor = db.quality_alerts.find(query)\
                                  .sort("timestamp", -1)\
                                  .skip(skip)\
                                  .limit(limit)
        alerts = await cursor.to_list(length=limit)
        for alert in alerts:
            if "_id" in alert:
                alert["id"] = str(alert["_id"])
                del alert["_id"]
        return alerts
    except Exception as e:
        logger.error(f"[EvaluationAPI] Error fetching quality alerts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching alerts.")

@router.post("/manual", response_model=EvaluationResult)
async def manual_evaluation(payload: ManualEvaluationInput):
    """
    Run manual RAGAS evaluation on question, answer, and context.
    Returns score results immediately.
    """
    evaluator = RAGASEvaluator()
    try:
        result = await evaluator.evaluate_response(
            question=payload.question,
            answer=payload.answer,
            contexts=payload.contexts,
            session_id="manual_test",
            ground_truth=payload.ground_truth
        )
        return result
    except Exception as e:
        logger.error(f"[EvaluationAPI] Error running manual evaluation: {e}")
        raise HTTPException(status_code=500, detail=f"Manual evaluation failed: {str(e)}")
