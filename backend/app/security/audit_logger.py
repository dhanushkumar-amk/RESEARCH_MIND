import logging
from datetime import datetime, timezone
import json
from uuid import uuid4
from langsmith import Client

from app.core.database import get_database
from app.core.config import settings
from app.models.security_schemas import SecurityLogEvent

logger = logging.getLogger("researchmind.security")

# Initialize LangSmith client if API key is present
ls_client = None
if settings.langchain_api_key:
    try:
        ls_client = Client(api_url="https://api.smith.langchain.com", api_key=settings.langchain_api_key)
    except Exception as e:
        logger.warning(f"[Audit Logger] Failed to initialize LangSmith client: {e}")

async def log_security_event(
    user_id: str,
    session_id: str,
    event_type: str,
    original_input: str,
    cleaned_input: str,
    severity: str,
    blocked: bool,
    ip_address: str,
    metadata: dict = None
) -> None:
    """
    Saves a security audit log to MongoDB, logs it to Python logging,
    and creates a corresponding trace in LangSmith with security tags.
    """
    if metadata is None:
        metadata = {}
        
    now = datetime.now(timezone.utc)
    
    # 1. Build and validate using Pydantic model
    try:
        event = SecurityLogEvent(
            id=uuid4(),
            user_id=user_id,
            session_id=session_id,
            event_type=event_type,
            original_input=original_input,
            cleaned_input=cleaned_input,
            severity=severity,
            blocked=blocked,
            timestamp=now,
            ip_address=ip_address,
            metadata=metadata
        )
    except Exception as parse_err:
        logger.error(f"[Audit Logger] Schema validation failed: {parse_err}")
        return

    # 2. Persist to MongoDB (fail-open logic: log but proceed on DB issues)
    try:
        db = get_database()
        event_dict = event.model_dump()
        # Convert UUID to string for BSON serialization
        event_dict["id"] = str(event_dict["id"])
        await db.security_logs.insert_one(event_dict)
        logger.info(f"[Audit Logger] Security event '{event_type}' logged successfully to MongoDB.")
    except Exception as db_err:
        logger.error(f"[Audit Logger] Failed to insert audit log into MongoDB: {db_err}")

    # 3. Print to Python logger with standard tags
    log_msg = (
        f"[SECURITY ALERT] [{event_type.upper()}] Severity: {severity} | "
        f"User: {user_id} | Session: {session_id} | Blocked: {blocked} | IP: {ip_address}"
    )
    if severity == "high" or blocked:
        logger.error(log_msg)
    else:
        logger.warning(log_msg)

    # 4. Log to LangSmith using LangSmith Client
    if ls_client:
        try:
            # Format tag names to match requested structure: e.g. "security.prompt_injection"
            tag_name = f"security.{event_type}"
            
            # Use run creator to post the log run
            await asyncio.to_thread(
                ls_client.create_run,
                name=f"Security Guard: {event_type}",
                run_type="chain",
                inputs={"original_input": original_input, "metadata": metadata},
                outputs={"cleaned_input": cleaned_input, "blocked": blocked, "severity": severity},
                tags=[tag_name],
                project_name=settings.langchain_project or "researchmind",
                start_time=now,
                end_time=now
            )
            logger.info(f"[Audit Logger] Event '{event_type}' traced in LangSmith with tag '{tag_name}'.")
        except Exception as ls_err:
            logger.debug(f"[Audit Logger] Failed to push trace to LangSmith: {ls_err}")

import asyncio
