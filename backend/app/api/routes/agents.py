import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, conint
from bson import ObjectId

from app.dependencies.auth import get_current_user
from app.core.database import get_database
from app.agents.graph import compiled_graph

logger = logging.getLogger("researchmind")

router = APIRouter(prefix="/api/agents", tags=["Agents"])

# Global dictionary to track active running agent nodes per session
active_agents_status: Dict[str, str] = {}

# -------------------------------------------------------------
# PYDANTIC INPUT/OUTPUT SCHEMAS
# -------------------------------------------------------------
class ResearchRequest(BaseModel):
    question: str
    session_id: Optional[str] = "default"
    source_ids: Optional[List[str]] = None

class FeedbackRequest(BaseModel):
    session_id: str
    rating: conint(ge=1, le=5) # Restrict rating between 1 and 5
    comment: Optional[str] = None

# -------------------------------------------------------------
# ROUTE HANDLERS
# -------------------------------------------------------------

@router.post("/research")
async def run_research(
    request: ResearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    POST /api/agents/research
    Executes the full LangGraph multi-agent research workflow,
    yielding events via SSE streaming response.
    """
    query_text = request.question.strip()
    if not query_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Research question cannot be empty."
        )

    user_id = str(current_user["_id"])
    session_id = request.session_id

    async def event_generator():
        queue = asyncio.Queue()
        
        # Configure workflow execution context
        config = {
            "configurable": {
                "thread_id": session_id,
                "user_id": user_id,
                "queue": queue
            }
        }
        
        inputs = {
            "question": query_text,
            "session_id": session_id,
            "source_ids": request.source_ids or [],
            "retry_count": 0,
            "needs_retry": False
        }

        active_agents_status[session_id] = "starting"

        # Define background task to run the compiled graph
        async def execute_graph():
            try:
                await compiled_graph.ainvoke(inputs, config=config)
                # Final done event
                queue.put_nowait({
                    "event": "done",
                    "data": json.dumps({"status": "complete"})
                })
            except Exception as e:
                logger.error(f"[Agents Route] LangGraph execution failed: {e}", exc_info=True)
                queue.put_nowait({
                    "event": "error",
                    "data": json.dumps({"message": f"Graph workflow error: {str(e)}"})
                })
            finally:
                active_agents_status[session_id] = "idle"

        graph_task = asyncio.create_task(execute_graph())

        try:
            # Yield events from the queue as they are pushed by the agent nodes
            while True:
                event = await queue.get()
                
                # Intercept agent_start to update active status
                if event["event"] == "agent_start":
                    try:
                        agent_info = json.loads(event["data"])
                        active_agents_status[session_id] = agent_info.get("agent", "running")
                    except Exception:
                        pass
                
                yield f"event: {event['event']}\ndata: {event['data']}\n\n"
                
                if event["event"] in {"done", "error"}:
                    break
        except Exception as e:
            logger.warning(f"[Agents Route] Connection stream interrupted: {e}")
        finally:
            if not graph_task.done():
                graph_task.cancel()

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/status/{session_id}")
async def get_agent_status(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    GET /api/agents/status/{session_id}
    Returns the currently active executing agent node in the workflow.
    """
    status_state = active_agents_status.get(session_id, "idle")
    return {
        "session_id": session_id,
        "active_agent": status_state,
        "status": "running" if status_state != "idle" else "completed"
    }


@router.get("/report/{session_id}")
async def get_research_report(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    GET /api/agents/report/{session_id}
    Fetches the last generated research report for the session from MongoDB.
    """
    db = get_database()
    session = await db.sessions.find_one({
        "user_id": str(current_user["_id"]),
        "session_id": session_id
    })
    
    if not session or "report" not in session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No research report found for this session."
        )
        
    return session["report"]


@router.get("/history/{session_id}")
async def get_agent_history(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    GET /api/agents/history/{session_id}
    Returns the complete chat history list of the session.
    """
    db = get_database()
    cursor = db.chat_history.find({
        "user_id": str(current_user["_id"]),
        "session_id": session_id
    }).sort("created_at", 1)
    
    history_docs = await cursor.to_list(length=100)
    
    formatted = []
    for h in history_docs:
        formatted.append({
            "id": str(h["_id"]),
            "role": h["role"],
            "content": h["content"],
            "created_at": h["created_at"].isoformat() if isinstance(h["created_at"], datetime) else str(h["created_at"])
        })
    return formatted


@router.delete("/history/{session_id}")
async def clear_agent_history(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    DELETE /api/agents/history/{session_id}
    Deletes the conversation history and cached session details.
    """
    db = get_database()
    user_id = str(current_user["_id"])
    
    # Delete chat history logs
    await db.chat_history.delete_many({
        "user_id": user_id,
        "session_id": session_id
    })
    
    # Delete session metadata caches
    await db.sessions.delete_one({
        "user_id": user_id,
        "session_id": session_id
    })
    
    # Clear active status
    active_agents_status.pop(session_id, None)
    
    return {"message": "Session history and state cleared successfully."}


@router.post("/feedback")
async def save_agent_feedback(
    request: FeedbackRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    POST /api/agents/feedback
    Saves user feedback and rating metrics for the research session.
    """
    db = get_database()
    feedback_doc = {
        "user_id": str(current_user["_id"]),
        "session_id": request.session_id,
        "rating": request.rating,
        "comment": request.comment,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.feedbacks.insert_one(feedback_doc)
    return {"message": "Thank you! Your feedback has been registered."}
