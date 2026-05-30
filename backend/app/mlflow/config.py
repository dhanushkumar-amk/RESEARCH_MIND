import os
import logging
from typing import Dict, Any
import mlflow
import mlflow.langchain
from app.core.config import settings

logger = logging.getLogger("researchmind")

def init_mlflow() -> None:
    """
    Initialize MLflow configuration, create experiments if they do not exist,
    and configure LangChain autologging.
    """
    tracking_uri = settings.mlflow_tracking_uri or "sqlite:///mlflow.db"
    try:
        mlflow.set_tracking_uri(tracking_uri)
        logger.info(f"[MLflow Config] Set tracking URI to: {tracking_uri}")
        
        # Determine environment
        env = "development" if settings.debug else "production"
        version = "1.0.0"  # App version
        
        default_tags = {
            "project": "researchmind",
            "environment": env,
            "version": version
        }
        
        # Initialize experiments
        experiments = [
            settings.mlflow_experiment_rag,
            settings.mlflow_experiment_agents
        ]
        
        for exp_name in experiments:
            exp = mlflow.get_experiment_by_name(exp_name)
            if exp is None:
                # If AWS S3 bucket is configured, use it as default artifact root
                artifact_location = f"s3://{settings.aws_s3_bucket}/{exp_name}" if settings.aws_s3_bucket else None
                try:
                    mlflow.create_experiment(
                        name=exp_name,
                        artifact_location=artifact_location,
                        tags=default_tags
                    )
                    logger.info(f"[MLflow Config] Created experiment: {exp_name} with artifact location: {artifact_location}")
                except Exception as ce_err:
                    # Fallback to local default store
                    mlflow.create_experiment(name=exp_name, tags=default_tags)
                    logger.info(f"[MLflow Config] Created experiment (local store fallback): {exp_name}. Error: {ce_err}")
            else:
                logger.info(f"[MLflow Config] Experiment '{exp_name}' already exists.")
                
        # Configure LangChain autologging
        # Disable in production if overhead is too high (i.e. debug=False)
        if settings.debug:
            mlflow.langchain.autolog(log_models=True)
            logger.info("[MLflow Config] Enabled LangChain autologging (development/debug mode)")
        else:
            logger.info("[MLflow Config] LangChain autologging disabled in production to avoid processing overhead")
            
    except Exception as e:
        logger.warning(f"[MLflow Config] Failed to initialize MLflow: {e}. Running in degraded state without MLflow.")

def get_default_tags() -> Dict[str, str]:
    """Return default tags for researchmind application."""
    env = "development" if settings.debug else "production"
    return {
        "project": "researchmind",
        "environment": env,
        "version": "1.0.0"
    }
