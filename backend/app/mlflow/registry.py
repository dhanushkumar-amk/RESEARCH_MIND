import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import mlflow
import mlflow.pyfunc
from mlflow.client import MlflowClient
from app.core.config import settings
from app.mlflow.manager import BestConfigManager

logger = logging.getLogger("researchmind")

class ConfigModel(mlflow.pyfunc.PythonModel):
    """A custom MLflow PythonModel wrap for saving configuration dictionaries."""
    def __init__(self, config: Dict[str, Any]):
        self.config = config

    def predict(self, context, model_input):
        return self.config

def get_model_name(config_type: str) -> str:
    """Helper to map config type to model registry name."""
    if config_type == "rag":
        return settings.mlflow_experiment_rag  # 'researchmind-rag-config'
    elif config_type == "agent":
        return settings.mlflow_experiment_agents  # 'researchmind-agent-runs'
    return f"researchmind-{config_type}-config"

async def register_config_model(
    config_type: str, 
    run_id: str, 
    config: Dict[str, Any], 
    scores: Dict[str, float]
) -> Dict[str, Any]:
    """
    Register a configuration run in the MLflow Model Registry.
    Applies automatic promotion to Staging if the new composite score
    beats the current Production version by 5%.
    """
    model_name = get_model_name(config_type)
    tracking_uri = settings.mlflow_tracking_uri or "sqlite:///mlflow.db"
    
    result = {
        "model_name": model_name,
        "registered": False,
        "version": None,
        "promoted_to_staging": False,
        "message": ""
    }
    
    try:
        mlflow.set_tracking_uri(tracking_uri)
        client = MlflowClient()
        
        # 1. Log the model artifact (if not already logged inside active run context)
        # Note: Model logging requires run context or specific active run
        # If run_id is provided, we can register the model from it
        model_uri = f"runs:/{run_id}/model"
        
        logger.info(f"[Model Registry] Registering model '{model_name}' from URI: {model_uri}...")
        model_version = mlflow.register_model(model_uri, model_name)
        version_num = model_version.version
        
        result["registered"] = True
        result["version"] = version_num
        
        # 2. Add metrics and score metadata as tags on the model version
        composite_score = float(scores.get("composite_score", 0.0))
        faithfulness = float(scores.get("faithfulness", 0.0))
        answer_relevance = float(scores.get("answer_relevance", 0.0))
        context_relevance = float(scores.get("context_relevance", 0.0))
        
        client.set_model_version_tag(model_name, version_num, "composite_score", str(composite_score))
        client.set_model_version_tag(model_name, version_num, "faithfulness", str(faithfulness))
        client.set_model_version_tag(model_name, version_num, "answer_relevance", str(answer_relevance))
        client.set_model_version_tag(model_name, version_num, "context_relevance", str(context_relevance))
        client.set_model_version_tag(model_name, version_num, "registered_at", datetime.now(timezone.utc).isoformat())
        
        # Add description
        description = f"Best configuration for {config_type}. Composite score: {composite_score:.4f}"
        client.update_model_version(model_name, version_num, description=description)
        
        # 3. Check Auto Promotion Logic: beats Production by 5%
        latest_prod_versions = client.get_latest_versions(model_name, stages=["Production"])
        
        if not latest_prod_versions:
            # If no Production model exists, automatically promote this to Staging
            client.transition_model_version_stage(
                name=model_name,
                version=version_num,
                stage="Staging"
            )
            result["promoted_to_staging"] = True
            result["message"] = "No existing production version found. Promoted new version to Staging."
            logger.info(f"[Model Registry] Promoted {model_name} version {version_num} to Staging (first version).")
        else:
            prod_ver = latest_prod_versions[0]
            prod_score_str = prod_ver.tags.get("composite_score", "0.0")
            try:
                prod_score = float(prod_score_str)
            except ValueError:
                prod_score = 0.0
                
            threshold = prod_score * (1 + settings.experiment_improvement_threshold)
            logger.info(f"[Model Registry] Version comparison: New composite score: {composite_score:.4f} | Production threshold: {threshold:.4f} (Prod score: {prod_score:.4f})")
            
            if composite_score >= threshold:
                # Beats by 5%! Transition to Staging
                client.transition_model_version_stage(
                    name=model_name,
                    version=version_num,
                    stage="Staging"
                )
                result["promoted_to_staging"] = True
                result["message"] = f"Beats current production version ({prod_score:.4f}) by 5%. Automatically promoted to Staging."
                logger.info(f"[Model Registry] Promoted {model_name} version {version_num} to Staging.")
            else:
                result["message"] = f"Does not beat production version ({prod_score:.4f}) by 5% improvement threshold. Kept as candidate."
                
    except Exception as e:
        logger.warning(f"[Model Registry] Failed to register or promote model: {e}")
        result["message"] = f"Error during registration: {e}"
        
    return result

async def promote_to_production(config_type: str, version: str) -> Dict[str, Any]:
    """
    Manually promote a model version from Staging to Production.
    Archives the currently running Production version, updates the active MongoDB
    best config, and applies it.
    """
    model_name = get_model_name(config_type)
    tracking_uri = settings.mlflow_tracking_uri or "sqlite:///mlflow.db"
    
    result = {
        "promoted": False,
        "message": ""
    }
    
    try:
        mlflow.set_tracking_uri(tracking_uri)
        client = MlflowClient()
        
        # 1. Fetch the details of the model version being promoted
        model_version_details = client.get_model_version(model_name, version)
        tags = model_version_details.tags or {}
        
        scores = {
            "composite_score": float(tags.get("composite_score", 0.0)),
            "faithfulness": float(tags.get("faithfulness", 0.0)),
            "answer_relevance": float(tags.get("answer_relevance", 0.0)),
            "context_relevance": float(tags.get("context_relevance", 0.0))
        }
        
        # Retrieve the parameters saved in the run metadata
        run = client.get_run(model_version_details.run_id)
        params = run.data.params
        
        # Convert params to proper typed values (chunk_size: int, etc.)
        config = {}
        if config_type == "rag":
            config = {
                "chunk_size": int(params.get("chunk_size", 512)),
                "chunk_overlap": int(params.get("chunk_overlap", 50)),
                "k_value": int(params.get("k_value", 10)),
                "reranker_top_n": int(params.get("reranker_top_n", 5)),
                "embedding_model": str(params.get("embedding_model", "all-MiniLM-L6-v2")),
                "reranker_model": str(params.get("reranker_model", "cross-encoder/ms-marco-MiniLM-L-6-v2")),
                "hybrid_vector_weight": float(params.get("hybrid_vector_weight", 0.6)),
                "hybrid_bm25_weight": float(params.get("hybrid_bm25_weight", 0.4))
            }
        elif config_type == "agent":
            config = {
                "primary_model": str(params.get("primary_model", "groq/llama-3.3-70b-versatile")),
                # Treat fallback models list as simple JSON list
                "fallback_models": list(eval(params.get("fallback_models", "[]"))),
                "temperature": float(params.get("temperature", 0.1)),
                "max_tokens": int(params.get("max_tokens", 1000)),
                "tools_used": list(eval(params.get("tools_used", "[]"))),
                "retry_count": int(params.get("retry_count", 2))
            }
            
        # 2. Transition current Production versions to Archived
        latest_prod = client.get_latest_versions(model_name, stages=["Production"])
        for prod_ver in latest_prod:
            if prod_ver.version != version:
                client.transition_model_version_stage(
                    name=model_name,
                    version=prod_ver.version,
                    stage="Archived"
                )
                logger.info(f"[Model Registry] Archived old production version: {prod_ver.version}")
                
        # 3. Transition selected version to Production
        client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage="Production"
        )
        
        # 4. Update and apply best config in MongoDB
        await BestConfigManager.update_best_config(
            config_type=config_type,
            config=config,
            scores=scores,
            mlflow_run_id=model_version_details.run_id
        )
        
        result["promoted"] = True
        result["message"] = f"Successfully promoted version {version} to Production and applied configuration."
        logger.info(f"[Model Registry] Successfully promoted {model_name} version {version} to Production.")
        
    except Exception as e:
        logger.error(f"[Model Registry] Failed manual promotion: {e}")
        result["message"] = f"Promotion failed: {e}"
        
    return result

async def rollback_production_model(config_type: str) -> Dict[str, Any]:
    """
    Rollback the configuration to the previously active Production version
    (the latest version in the Archived stage).
    """
    model_name = get_model_name(config_type)
    tracking_uri = settings.mlflow_tracking_uri or "sqlite:///mlflow.db"
    
    result = {
        "success": False,
        "message": ""
    }
    
    try:
        mlflow.set_tracking_uri(tracking_uri)
        client = MlflowClient()
        
        # 1. Find all versions
        all_versions = client.get_latest_versions(model_name, stages=["Archived"])
        if not all_versions:
            result["message"] = "No archived versions found to rollback to."
            return result
            
        # Sort by version number to get the latest archived version
        all_versions.sort(key=lambda v: int(v.version), reverse=True)
        rollback_target = all_versions[0]
        target_version = rollback_target.version
        
        # 2. Promote target to Production
        # This will auto-trigger archived transitions if we do it through promote_to_production
        res = await promote_to_production(config_type, target_version)
        
        if res["promoted"]:
            result["success"] = True
            result["message"] = f"Successfully rolled back to version {target_version}."
        else:
            result["message"] = f"Rollback failed during promotion step: {res['message']}"
            
    except Exception as e:
        logger.error(f"[Model Registry] Rollback failed: {e}")
        result["message"] = f"Rollback failed: {e}"
        
    return result
