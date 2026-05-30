import logging
from datetime import datetime, timezone
import re
from langchain_core.runnables import RunnableConfig

from app.agents.state import AgentState
from app.core.database import get_database

logger = logging.getLogger("researchmind")

def extract_entities(text: str) -> list[str]:
    """Simple rule-based entity extractor (proper nouns, capitalized terms)."""
    # Find words starting with capital letters, excluding start of sentences
    candidates = re.findall(r'\b[A-Z][a-zA-Z0-9_]{2,}\b', text)
    # Deduplicate and filter common words
    ignored = {"The", "And", "For", "You", "Your", "This", "That", "With", "From", "Answer", "Question"}
    entities = list(set([c for c in candidates if c not in ignored]))
    return entities[:10]

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
        # 1. Insert user query to chat history
        user_turn = {
            "user_id": user_id,
            "session_id": session_id,
            "role": "user",
            "content": state["question"],
            "created_at": now
        }
        await db.chat_history.insert_one(user_turn)
        
        # 2. Insert assistant answer to chat history
        assistant_turn = {
            "user_id": user_id,
            "session_id": session_id,
            "role": "assistant",
            "content": state["answer"],
            "created_at": now
        }
        await db.chat_history.insert_one(assistant_turn)
        
        # 3. Extract entities from the interaction
        entities = extract_entities(state["question"] + " " + state["answer"])
        
        # 4. Save/update session metadata and last generated report
        session_metadata = {
            "user_id": user_id,
            "session_id": session_id,
            "last_question": state["question"],
            "last_answer": state["answer"],
            "quality_score": state.get("quality_score", 0.0),
            "entities": entities,
            "report": state.get("report"),
            "updated_at": now
        }
        
        await db.sessions.update_one(
            {"user_id": user_id, "session_id": session_id},
            {"$set": session_metadata},
            upsert=True
        )
        
        # 5. Fetch updated conversation history to return in the state
        history_cursor = db.chat_history.find(
            {"user_id": user_id, "session_id": session_id}
        ).sort("created_at", 1).limit(20)
        history_docs = await history_cursor.to_list(length=20)
        
        conversation_history = [
            {"role": h["role"], "content": h["content"], "created_at": str(h["created_at"])}
            for h in history_docs
        ]
        
        logger.info("[Memory Agent] Successfully saved conversation history and session metadata.")
        
        if queue:
            queue.put_nowait({
                "event": "agent_complete",
                "data": json.dumps({"agent": "memory", "status": "done"})
            })
            
        return {
            "conversation_history": conversation_history,
            "error": ""
        }
        
    except Exception as e:
        logger.error(f"[Memory Agent] Database operation failed: {e}", exc_info=True)
        return {
            "error": f"Memory Agent database failure: {str(e)}"
        }
