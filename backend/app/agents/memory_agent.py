import logging
from datetime import datetime, timezone
import re
from langchain_core.runnables import RunnableConfig

from app.agents.state import AgentState
from app.core.database import get_database
from app.context.summary_memory import SummaryMemory
from app.context.sliding_window import SlidingWindowMemory
from app.context.entity_memory import EntityMemory

logger = logging.getLogger("researchmind")

async def memory_agent(state: AgentState, config: RunnableConfig) -> dict:
    """
    NODE 5: Memory Agent
    Saves the full conversation turn to MongoDB, stores session metadata
    and research report outputs, and updates conversation history.
    """
    logger.info("[Memory Agent] Persisting conversation state to MongoDB...")
    
    configurable = config.get("configurable", {})
    user_id = configurable.get("user_id")
    session_id = state.get("session_id", "default")
    queue = configurable.get("queue")
    
    if queue:
        import json
        queue.put_nowait({
            "event": "agent_start",
            "data": json.dumps({"agent": "memory", "status": "starting"})
        })
        
    if not user_id:
        logger.error("[Memory Agent] Missing user_id in config.")
        if queue:
            queue.put_nowait({
                "event": "agent_complete",
                "data": json.dumps({"agent": "memory", "status": "failed"})
            })
        return {"error": "Memory Agent failed: missing user_id."}
        
    db = get_database()
    now = datetime.now(timezone.utc)
    
    try:
        # Instantiate memory components
        summary_mem = SummaryMemory()
        sliding_mem = SlidingWindowMemory()
        entity_mem = EntityMemory()

        # 1. Save turns to SummaryMemory (auto-summarizing when needed)
        await summary_mem.add_message(session_id, "human", state["question"])
        await summary_mem.add_message(session_id, "assistant", state["answer"])

        # 2. Save turns to SlidingWindowMemory
        await sliding_mem.add_to_window(session_id, {"role": "human", "content": state["question"]})
        await sliding_mem.add_to_window(session_id, {"role": "assistant", "content": state["answer"]})

        # 3. Extract entities from the interaction and update entity store
        await entity_mem.extract_entities(session_id, state["question"] + " " + state["answer"])
        entities_dict = await entity_mem.get_entities(session_id)
        entities_list = list(entities_dict.keys())
        
        # 4. Save/update session metadata and last generated report (for compatibility)
        session_metadata = {
            "user_id": user_id,
            "session_id": session_id,
            "last_question": state["question"],
            "last_answer": state["answer"],
            "quality_score": state.get("quality_score", 0.0),
            "entities": entities_list,
            "report": state.get("report"),
            "updated_at": now
        }
        
        await db.sessions.update_one(
            {"user_id": user_id, "session_id": session_id},
            {"$set": session_metadata},
            upsert=True
        )
        
        # 5. Fetch updated conversation history to return in the state
        # Return history formatted as requested in SlidingWindowMemory
        history_docs = await sliding_mem.get_window(session_id)
        conversation_history = [
            {"role": h["role"], "content": h["content"], "created_at": str(now)}
            for h in history_docs
        ]
        
        logger.info("[Memory Agent] Successfully saved conversation history and session metadata.")
        
        if queue:
            queue.put_nowait({
                "event": "agent_complete",
                "data": json.dumps({"agent": "memory", "status": "done"})
            })
            
        return {
            "conversation_history": conversation_history
        }
        
    except Exception as e:
        logger.error(f"[Memory Agent] Database operation failed: {e}", exc_info=True)
        return {
            "error": f"Memory Agent database failure: {str(e)}"
        }
