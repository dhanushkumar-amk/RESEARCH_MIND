import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any
from langchain_litellm import ChatLiteLLM
from langchain_classic.memory import ConversationSummaryMemory
from langchain_core.messages import HumanMessage, AIMessage

from app.core.config import settings
from app.core.database import get_database
from app.context.token_budget import TokenBudgetManager

logger = logging.getLogger("researchmind")

class SummaryMemory:
    def __init__(self):
        # Initialize LLM for summarization
        self.llm = ChatLiteLLM(
            model=settings.summary_llm,
            temperature=0.0,
            api_key=settings.groq_api_key,
            max_tokens=500
        )
        self.memory_helper = ConversationSummaryMemory(llm=self.llm)
        self.budget_manager = TokenBudgetManager()
        # In-memory cache to store session history and summaries
        self._cache: Dict[str, Dict[str, Any]] = {}

    async def add_message(self, session_id: str, role: str, content: str) -> None:
        """
        Add human or AI message to memory.
        Store in MongoDB and update in-memory cache.
        Auto summarize when limit exceeded.
        """
        normalized_role = "human" if role.lower() in ("human", "user") else "assistant"
        db = get_database()
        now = datetime.now(timezone.utc)

        # Retrieve current conversation memory state
        record = await db.conversation_memory.find_one({"session_id": session_id})
        if not record:
            record = {
                "session_id": session_id,
                "messages": [],
                "summary": "",
                "total_tokens": 0,
                "last_updated": now,
                "message_count": 0
            }

        # Append the new message
        new_msg = {
            "role": normalized_role,
            "content": content,
            "created_at": now
        }
        record["messages"].append(new_msg)
        record["message_count"] = len(record["messages"])
        record["last_updated"] = now

        # Calculate total tokens for messages
        history_str = "\n".join([f"{m['role']}: {m['content']}" for m in record["messages"]])
        total_tokens = self.budget_manager.count_tokens(history_str)
        record["total_tokens"] = total_tokens

        # Check if conversation history exceeds limit (default 2400 tokens)
        if total_tokens > settings.token_budget_history:
            logger.info(f"[SummaryMemory] Tokens ({total_tokens}) exceed history budget ({settings.token_budget_history}). Summarizing...")
            
            # Convert to LangChain Messages
            lc_messages = []
            for m in record["messages"]:
                if m["role"] == "human":
                    lc_messages.append(HumanMessage(content=m["content"]))
                else:
                    lc_messages.append(AIMessage(content=m["content"]))

            # Execute summarization in a thread pool to avoid blocking event loop
            summary = await asyncio.to_thread(
                self.memory_helper.predict_new_summary,
                lc_messages,
                existing_summary=record.get("summary", "")
            )
            record["summary"] = summary

        # Persist to MongoDB
        await db.conversation_memory.update_one(
            {"session_id": session_id},
            {"$set": record},
            upsert=True
        )

        # Update cache
        self._cache[session_id] = {
            "messages": record["messages"],
            "summary": record.get("summary", "")
        }

    async def get_history(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Return conversation history.
        Format as list of dicts with role: human or assistant and content: message text.
        """
        if session_id in self._cache:
            messages = self._cache[session_id]["messages"]
        else:
            db = get_database()
            record = await db.conversation_memory.find_one({"session_id": session_id})
            if record:
                messages = record.get("messages", [])
                self._cache[session_id] = {
                    "messages": messages,
                    "summary": record.get("summary", "")
                }
            else:
                messages = []

        return [{"role": m["role"], "content": m["content"]} for m in messages]

    async def get_summary(self, session_id: str) -> str:
        """
        Return summarized history.
        Auto summarize if too long.
        """
        if session_id in self._cache:
            summary = self._cache[session_id]["summary"]
            messages = self._cache[session_id]["messages"]
        else:
            db = get_database()
            record = await db.conversation_memory.find_one({"session_id": session_id})
            if record:
                summary = record.get("summary", "")
                messages = record.get("messages", [])
                self._cache[session_id] = {
                    "messages": messages,
                    "summary": summary
                }
            else:
                summary = ""
                messages = []

        # If summary is missing but messages exist, or if total tokens exceed limit, summarize.
        history_str = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
        total_tokens = self.budget_manager.count_tokens(history_str)
        if (total_tokens > settings.token_budget_history or (not summary and messages)):
            logger.info(f"[SummaryMemory] Generating summary on-demand for session {session_id}...")
            lc_messages = []
            for m in messages:
                if m["role"] == "human":
                    lc_messages.append(HumanMessage(content=m["content"]))
                else:
                    lc_messages.append(AIMessage(content=m["content"]))

            summary = await asyncio.to_thread(
                self.memory_helper.predict_new_summary,
                lc_messages,
                existing_summary=summary
            )

            # Update DB and Cache
            db = get_database()
            await db.conversation_memory.update_one(
                {"session_id": session_id},
                {"$set": {"summary": summary, "last_updated": datetime.now(timezone.utc)}}
            )
            if session_id in self._cache:
                self._cache[session_id]["summary"] = summary

        return summary

    async def clear_memory(self, session_id: str) -> None:
        """Clear all messages, summaries, and records for the session."""
        db = get_database()
        await db.conversation_memory.delete_one({"session_id": session_id})
        if session_id in self._cache:
            del self._cache[session_id]
        logger.info(f"[SummaryMemory] Cleared memory for session {session_id}")
