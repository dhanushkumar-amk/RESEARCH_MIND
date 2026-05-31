import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any
from langchain_litellm import ChatLiteLLM

from app.core.config import settings
from app.core.database import get_database

logger = logging.getLogger("researchmind")

def extract_string_content(content) -> str:
    if isinstance(content, str):
        return content
    elif isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict):
                if "text" in part:
                    parts.append(part["text"])
                elif "content" in part:
                    parts.append(part["content"])
                else:
                    parts.append(str(part))
            else:
                parts.append(str(part))
        return "".join(parts)
    elif content is None:
        return ""
    else:
        return str(content)

class SlidingWindowMemory:
    def __init__(self):
        # Initialize LLM for summarizing dropped messages
        self.llm = ChatLiteLLM(
            model=settings.summary_llm,
            temperature=0.0,
            api_key=settings.groq_api_key,
            max_tokens=300
        )
        self.window_size = settings.sliding_window_size

    async def get_window(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Return the last 10 messages in the window (most recent last).
        """
        db = get_database()
        record = await db.sliding_window_memory.find_one({"session_id": session_id})
        if not record:
            return []
        
        messages = record.get("messages", [])
        return [{"role": m["role"], "content": m["content"]} for m in messages]

    async def add_to_window(self, session_id: str, message: Dict[str, Any]) -> None:
        """
        Add new message to window.
        If window exceeds window_size (10) — slide, summarize dropped messages,
        and append/merge to the existing summary.
        """
        db = get_database()
        now = datetime.now(timezone.utc)
        
        # Normalize message role
        role = message.get("role", "human")
        normalized_role = "human" if role.lower() in ("human", "user") else "assistant"
        content = message.get("content", "")
        
        new_message = {
            "role": normalized_role,
            "content": content,
            "created_at": now
        }

        # Fetch or initialize window memory record
        record = await db.sliding_window_memory.find_one({"session_id": session_id})
        if not record:
            record = {
                "session_id": session_id,
                "messages": [],
                "summary": "",
                "last_updated": now
            }

        record["messages"].append(new_message)
        
        # Check if we need to slide the window
        if len(record["messages"]) > self.window_size:
            # Determine which messages are dropping
            num_dropped = len(record["messages"]) - self.window_size
            dropped_messages = record["messages"][:num_dropped]
            record["messages"] = record["messages"][num_dropped:]
            
            # Summarize dropped messages and merge with existing summary
            existing_summary = record.get("summary", "")
            dropped_text = "\n".join([f"{m['role']}: {m['content']}" for m in dropped_messages])
            
            prompt = (
                f"You are a memory consolidation module. Update the existing summary of the conversation "
                f"by incorporating the new details from the dropped conversation turns.\n\n"
                f"Existing Summary:\n{existing_summary or 'No summary yet.'}\n\n"
                f"Dropped Turns:\n{dropped_text}\n\n"
                f"Write a revised, cohesive summary incorporating the new details. Keep the summary under 300 words. "
                f"Return only the summary. Do not include introductory phrases like 'Here is the summary:'."
            )
            
            logger.info(f"[SlidingWindowMemory] Window size exceeded. Summarizing {num_dropped} dropped messages...")
            try:
                response = await self.llm.ainvoke(prompt)
                new_summary = extract_string_content(response.content).strip()
                record["summary"] = new_summary
            except Exception as e:
                logger.error(f"[SlidingWindowMemory] Failed to summarize dropped messages: {e}", exc_info=True)
                # Keep existing summary as fallback

        record["last_updated"] = now
        
        # Save to MongoDB
        await db.sliding_window_memory.update_one(
            {"session_id": session_id},
            {"$set": record},
            upsert=True
        )

    async def get_full_context(self, session_id: str) -> str:
        """
        Return summary + recent window formatted as a readable conversation.
        """
        db = get_database()
        record = await db.sliding_window_memory.find_one({"session_id": session_id})
        if not record:
            return ""

        summary = record.get("summary", "").strip()
        messages = record.get("messages", [])
        
        parts = []
        if summary:
            parts.append(f"Summary of older conversation turns:\n{summary}\n")
            parts.append("Recent conversation turns:")
        
        for m in messages:
            role_label = "Human" if m["role"] == "human" else "Assistant"
            parts.append(f"{role_label}: {m['content']}")
            
        return "\n".join(parts).strip()

    async def clear_memory(self, session_id: str) -> None:
        """Clear sliding window records for session."""
        db = get_database()
        await db.sliding_window_memory.delete_one({"session_id": session_id})
        logger.info(f"[SlidingWindowMemory] Cleared sliding window memory for session {session_id}")
