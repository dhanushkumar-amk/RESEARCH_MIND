import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from pydantic import BaseModel, Field

import mlflow
from mlflow.client import MlflowClient

from app.core.config import settings
from app.core.database import get_database
from app.dependencies.auth import get_current_user
from app.mlflow.manager import BestConfigManager
from app.mlflow.runner import ExperimentRunner

logger = logging.getLogger("researchmind")

router = APIRouter(prefix="/api/mlflow", tags=["MLflow Integration"])

# -------------------------------------------------------------
# PYDANTIC INPUT/OUTPUT SCHEMAS
# -------------------------------------------------------------
class RunExperimentRequest(BaseModel):
    config_type: str = Field(..., description="Configuration type: 'rag' or 'agent'")
    configs: List[Dict[str, Any]] = Field(..., min_items=1, description="List of configurations to evaluate")

class ExperimentResponse(BaseModel):
    experiment_id: str
    name: str
    artifact_location: str
    lifecycle_stage: str
    tags: Dict[str, str]

class RunResponse(BaseModel):
    run_id: str
    experiment_id: str
    status: str
    start_time: datetime
    end_time: Optional[datetime]
    params: Dict[str, str]
    metrics: Dict[str, float]

class CompareResponse(BaseModel):
    run_id_1: str
    run_id_2: str
    metrics_comparison: Dict[str, Dict[str, float]]
    params_comparison: Dict[str, Dict[str, str]]

# -------------------------------------------------------------
# ADMIN AUTHENTICATION DEPENDENCY
# -------------------------------------------------------------
async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify that current user is an admin or developer."""
    role = current_user.get("role", "").lower()
    is_admin = current_user.get("is_admin", False)
    if not is_admin and role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Admin privilege required."
        )
    return current_user

# -------------------------------------------------------------
# BACKGROUND TASK RUNNERS
# -------------------------------------------------------------
def run_rag_experiment_task(configs: List[Dict[str, Any]]) -> None:
    try:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(ExperimentRunner.run_rag_experiment(configs))
    except Exception as e:
        logger.error(f"[MLflow Endpoints] Background RAG experiment failed: {e}")

def run_agent_experiment_task(configs: List[Dict[str, Any]]) -> None:
    try:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(ExperimentRunner.run_agent_experiment(configs))
    except Exception as e:
        logger.error(f"[MLflow Endpoints] Background Agent experiment failed: {e}")

# -------------------------------------------------------------
# ENDPOINT ROUTERS
# -------------------------------------------------------------
@router.get("/experiments", response_model=List[ExperimentResponse])
async def list_experiments(
    name_filter: Optional[str] = Query(None, alias="name"),
    current_user: dict = Depends(get_current_user)
):
    """Return all experiments list, optionally filtered by name."""
    tracking_uri = settings.mlflow_tracking_uri or "sqlite:///mlflow.db"
    try:
        mlflow.set_tracking_uri(tracking_uri)
        client = MlflowClient()
        exps = client.search_experiments()
        
        result = []
        for exp in exps:
            if name_filter and name_filter.lower() not in exp.name.lower():
                continue
                
            result.append(ExperimentResponse(
                experiment_id=exp.experiment_id,
                name=exp.name,
                artifact_location=exp.artifact_location,
                lifecycle_stage=exp.lifecycle_stage,
                tags=dict(exp.tags or {})
            ))
        return result
    except Exception as e:
        logger.error(f"[MLflow Endpoints] Failed to fetch experiments: {e}")
        # Graceful fallback: return local default names
        return [
            ExperimentResponse(
                experiment_id="0",
                name=settings.mlflow_experiment_rag,
                artifact_location="./artifacts",
                lifecycle_stage="active",
                tags={"project": "researchmind"}
            ),
            ExperimentResponse(
                experiment_id="1",
                name=settings.mlflow_experiment_agents,
                artifact_location="./artifacts",
                lifecycle_stage="active",
                tags={"project": "researchmind"}
            )
        ]

@router.get("/runs/{experiment_id}", response_model=List[RunResponse])
async def list_runs(
    experiment_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Return runs for a given experiment ID (paginated)."""
    tracking_uri = settings.mlflow_tracking_uri or "sqlite:///mlflow.db"
    try:
        mlflow.set_tracking_uri(tracking_uri)
        client = MlflowClient()
        
        # Paginated fetch
        runs = client.search_runs(
            experiment_ids=[experiment_id],
            max_results=limit
        )
        
        # Apply offset manually since MLflow pagination uses page tokens
        paginated_runs = runs[offset : offset + limit]
        
        result = []
        for r in paginated_runs:
            start_time = datetime.fromtimestamp(r.info.start_time / 1000.0, tz=timezone.utc)
            end_time = (
                datetime.fromtimestamp(r.info.end_time / 1000.0, tz=timezone.utc)
                if r.info.end_time
                else None
            )
            
            result.append(RunResponse(
                run_id=r.info.run_id,
                experiment_id=r.info.experiment_id,
                status=r.info.status,
                start_time=start_time,
                end_time=end_time,
                params=dict(r.data.params or {}),
                metrics=dict(r.data.metrics or {})
            ))
        return result
    except Exception as e:
        logger.error(f"[MLflow Endpoints] Failed to fetch runs for {experiment_id}: {e}")
        return []

@router.get("/best-config/{config_type}")
async def get_best_config(
    config_type: str,
    current_user: dict = Depends(get_current_user)
):
    """Return current best config stored in MongoDB."""
    if config_type not in ["rag", "agent"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid config_type. Allowed types: 'rag', 'agent'."
        )
        
    best = await BestConfigManager.get_best_config(config_type)
    if not best:
        # Fallback to the active default memory configs
        if config_type == "rag":
            return {"config_type": "rag", "config": BestConfigManager.get_applied_rag_config(), "version": 0}
        else:
            return {"config_type": "agent", "config": BestConfigManager.get_applied_agent_config(), "version": 0}
            
    # Serialize ObjectId if present
    if "_id" in best:
        best["id"] = str(best["_id"])
        del best["_id"]
        
    return best

@router.post("/run-experiment")
async def run_manual_experiment(
    payload: RunExperimentRequest,
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(get_admin_user)
):
    """Trigger manual experiment run in background (Admin only)."""
    config_type = payload.config_type.lower()
    if config_type not in ["rag", "agent"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid config_type. Must be 'rag' or 'agent'."
        )
        
    tracking_uri = settings.mlflow_tracking_uri or "sqlite:///mlflow.db"
    mlflow.set_tracking_uri(tracking_uri)
    
    exp_name = settings.mlflow_experiment_rag if config_type == "rag" else settings.mlflow_experiment_agents
    exp = mlflow.get_experiment_by_name(exp_name)
    experiment_id = exp.experiment_id if exp else "unknown"
    
    if config_type == "rag":
        background_tasks.add_task(run_rag_experiment_task, payload.configs)
    else:
        background_tasks.add_task(run_agent_experiment_task, payload.configs)
        
    return {
        "experiment_id": experiment_id,
        "status": "started",
        "message": f"Manual experiment run for '{config_type}' successfully triggered in background."
    }

@router.get("/compare", response_model=CompareResponse)
async def compare_runs(
    run_id_1: str = Query(..., description="First MLflow run ID"),
    run_id_2: str = Query(..., description="Second MLflow run ID"),
    current_user: dict = Depends(get_current_user)
):
    """Compare two MLflow runs side by side."""
    tracking_uri = settings.mlflow_tracking_uri or "sqlite:///mlflow.db"
    try:
        mlflow.set_tracking_uri(tracking_uri)
        client = MlflowClient()
        
        run1 = client.get_run(run_id_1)
        run2 = client.get_run(run_id_2)
        
        metrics1 = run1.data.metrics or {}
        metrics2 = run2.data.metrics or {}
        params1 = run1.data.params or {}
        params2 = run2.data.params or {}
        
        # Merge all metric keys
        all_metrics_keys = set(metrics1.keys()).union(metrics2.keys())
        metrics_comparison = {}
        for k in all_metrics_keys:
            metrics_comparison[k] = {
                "run_1": float(metrics1.get(k, 0.0)),
                "run_2": float(metrics2.get(k, 0.0))
            }
            
        # Merge all param keys
        all_params_keys = set(params1.keys()).union(params2.keys())
        params_comparison = {}
        for k in all_params_keys:
            params_comparison[k] = {
                "run_1": str(params1.get(k, "")),
                "run_2": str(params2.get(k, ""))
            }
            
        return CompareResponse(
            run_id_1=run_id_1,
            run_id_2=run_id_2,
            metrics_comparison=metrics_comparison,
            params_comparison=params_comparison
        )
    except Exception as e:
        logger.error(f"[MLflow Endpoints] Failed to compare runs {run_id_1} and {run_id_2}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not compare runs: {e}"
        )

@router.get("/weekly-report")
async def get_weekly_report(
    current_user: dict = Depends(get_current_user)
):
    """Return the last weekly experiment report generated by the scheduler."""
    db = get_database()
    report = await db.weekly_reports.find_one({}, sort=[("timestamp", -1)])
    if not report:
        return {
            "timestamp": datetime.now(timezone.utc),
            "message": "No weekly experiment report has been generated yet.",
            "best_rag_config": BestConfigManager.get_applied_rag_config(),
            "best_agent_config": BestConfigManager.get_applied_agent_config()
        }
        
    if "_id" in report:
        report["id"] = str(report["_id"])
        del report["_id"]
        
    return report
