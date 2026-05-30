import logging
import re
from datetime import datetime, timezone
from typing import List, Dict, Any
from bson import ObjectId

from app.core.config import settings
from app.core.database import get_database
from app.context.token_budget import TokenBudgetManager

logger = logging.getLogger("researchmind")

class ContextInjector:
    def __init__(self):
        self.budget_manager = TokenBudgetManager()
        self.base_prompt = (
            "You are ResearchMind, an advanced, production-grade AI research assistant.\n"
            "Your objective is to provide high-quality, scientifically sound, objective, "
            "and precise answers to the user's research queries based on the provided context.\n"
            "Always maintain academic integrity and cite sources when context is provided."
        )

    async def inject_user_context(self, user_id: str, session_id: str) -> str:
        """
        Retrieves user information, session start time, total queries this session,
        and preferred topics.
        """
        db = get_database()
        
        # 1. User Name and Preferred Topics
        user_name = "Researcher"
        preferred_topics = []
        try:
            user_obj_id = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
            user = await db.users.find_one({"_id": user_obj_id})
            if user:
                user_name = user.get("name", "Researcher")
                preferred_topics = user.get("preferred_topics", [])
        except Exception as e:
            logger.error(f"[ContextInjector] Error fetching user profile: {e}")

        # 2. Session start time
        session_start = "Unknown"
        try:
            session_doc = await db.sessions.find_one({"user_id": user_id, "session_id": session_id})
            if session_doc and "created_at" in session_doc:
                session_start = session_doc["created_at"].strftime("%Y-%m-%d %H:%M:%S UTC")
            else:
                # Fallback to last updated or current time
                now = datetime.now(timezone.utc)
                session_start = now.strftime("%Y-%m-%d %H:%M:%S UTC")
        except Exception as e:
            logger.error(f"[ContextInjector] Error fetching session metadata: {e}")

        # 3. Total queries in session
        total_queries = 0
        try:
            total_queries = await db.chat_history.count_documents({
                "user_id": user_id,
                "session_id": session_id,
                "role": "user"
            })
        except Exception as e:
            logger.error(f"[ContextInjector] Error counting session queries: {e}")

        user_context = (
            f"User Profile:\n"
            f"- Name: {user_name}\n"
            f"- Session Start: {session_start}\n"
            f"- Session Query Count: {total_queries}\n"
        )
        if preferred_topics:
            user_context += f"- Research Interests: {', '.join(preferred_topics)}\n"
            
        return user_context

    async def inject_temporal_context(self) -> str:
        """
        Retrieves current date, time, and day of the week with recent news awareness prompts.
        """
        now = datetime.now(timezone.utc)
        current_date_str = now.strftime("%A, %B %d, %Y")
        current_time_str = now.strftime("%H:%M:%S UTC")
        
        temporal_context = (
            f"Temporal Context:\n"
            f"- Current Date: {current_date_str}\n"
            f"- Current Time: {current_time_str}\n"
            f"- Temporal Constraint: You are aware of events up to {current_date_str}. Make sure to prioritize chronologically relevant facts.\n"
        )
        return temporal_context

    async def inject_source_context(self, user_id: str) -> str:
        """
        Retrieves details of documents uploaded by the user, library size, and last ingested document.
        """
        db = get_database()
        source_context = "Source Library Context: No documents uploaded yet.\n"
        
        try:
            # Query the user's uploaded sources
            cursor = db.sources.find({"user_id": user_id}).sort("created_at", -1)
            sources = await cursor.to_list(length=100)
            
            if sources:
                total_docs = len(sources)
                last_doc = sources[0].get("filename", "Unknown")
                doc_names = [s.get("filename", "Unknown") for s in sources[:5]]
                
                source_context = (
                    f"Source Library Context:\n"
                    f"- Total Documents in Library: {total_docs}\n"
                    f"- Last Ingested Document: {last_doc}\n"
                    f"- Sample Active Documents: {', '.join(doc_names)}\n"
                )
        except Exception as e:
            logger.error(f"[ContextInjector] Error fetching source library context: {e}")
            
        return source_context

    async def inject_entity_context(self, session_id: str, query: str) -> str:
        """
        Retrieves relevant entities and facts from entity memory to avoid repeated clarifications.
        """
        db = get_database()
        entity_context = ""
        
        try:
            record = await db.entity_memory.find_one({"session_id": session_id})
            if record:
                entities = record.get("entities", {})
                relevant_facts = []
                
                for entity_name, facts in entities.items():
                    # Check if entity is mentioned in the query
                    if re.search(rf"\b{re.escape(entity_name)}\b", query, re.IGNORECASE):
                        relevant_facts.append(f"- {entity_name}: {facts}")
                        
                if relevant_facts:
                    entity_context = "Active Entity Facts:\n" + "\n".join(relevant_facts) + "\n"
        except Exception as e:
            logger.error(f"[ContextInjector] Error fetching entity context: {e}")
            
        return entity_context

    async def build_system_prompt(self, user_id: str, session_id: str, query: str) -> str:
        """
        Build final system prompt dynamically by injecting all context sections.
        Format cleanly within the 1600 token budget.
        """
        import asyncio
        
        # Fetch user, temporal, and source contexts in parallel
        user_ctx, temp_ctx, src_ctx, ent_ctx = await asyncio.gather(
            self.inject_user_context(user_id, session_id),
            self.inject_temporal_context(),
            self.inject_source_context(user_id),
            self.inject_entity_context(session_id, query)
        )
        
        sections = [self.base_prompt]
        
        # Append contexts if they are not empty
        if user_ctx.strip():
            sections.append(user_ctx.strip())
        if temp_ctx.strip():
            sections.append(temp_ctx.strip())
        if src_ctx.strip():
            sections.append(src_ctx.strip())
        if ent_ctx.strip():
            sections.append(ent_ctx.strip())
            
        full_prompt = "\n\n=== CONTEXT INJECTIONS ===\n\n".join(sections)
        
        # Trim to budget (1600 tokens)
        trimmed_prompt = self.budget_manager.trim_to_budget(full_prompt, settings.token_budget_system)
        return trimmed_prompt
