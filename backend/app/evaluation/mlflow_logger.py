import logging
import mlflow
from app.core.config import settings

logger = logging.getLogger("researchmind")

def log_evaluation_to_mlflow(params: dict, metrics: dict, tags: dict) -> None:
    """
    Log evaluation metrics and configuration parameters to MLflow server.
    This runs synchronously in a background thread to prevent blocking.
    Handles network errors gracefully if MLflow is not running.
    """
    tracking_uri = settings.mlflow_tracking_uri
    if not tracking_uri:
        logger.warning("[MLflow Logger] MLFLOW_TRACKING_URI is not set. Skipping MLflow logging.")
        return

    try:
        # Configure MLflow settings
        mlflow.set_tracking_uri(tracking_uri)
        mlflow.set_experiment(settings.mlflow_experiment)

        # Log metrics in a new active run
        with mlflow.start_run():
            logger.info(f"[MLflow Logger] Logging evaluation to MLflow experiment '{settings.mlflow_experiment}'...")
            
            # Log hyperparameters
            mlflow.log_params(params)
            
            # Log score metrics
            mlflow.log_metrics(metrics)
            
            # Log classification tags
            mlflow.log_tags(tags)
            
            logger.debug("[MLflow Logger] Successfully logged run metrics to MLflow.")
    except Exception as e:
        # 10-year experience tip: Fail-safe warning logging instead of crashing the client request
        logger.warning(f"[MLflow Logger] Failed to log evaluation to MLflow at '{tracking_uri}': {e}. Ensure the MLflow tracking server is running.")
