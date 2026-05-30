import logging
import asyncio
import json
import re
from datetime import datetime, timezone
from typing import Dict, Any
from langchain_litellm import ChatLiteLLM

from app.core.config import settings
from app.core.database import get_database

logger = logging.getLogger("researchmind")

class EntityMemory:
    def __init__(self):
        # Initialize LLM for entity extraction and fact updating
        self.llm = ChatLiteLLM(
            model=settings.summary_llm,
            temperature=0.0,
            api_key=settings.groq_api_key,
            max_tokens=600
        )

    async def extract_entities(self, session_id: str, text: str) -> None:
        """
        Extract entities from message, update entity store, and persist to MongoDB.
        Categories tracked: Person, Organization, Technology, Location, Date, Topic.
        """
        db = get_database()
        now = datetime.now(timezone.utc)

        # Get existing entities for the session
        record = await db.entity_memory.find_one({"session_id": session_id})
        existing_entities = record.get("entities", {}) if record else {}

        # If text is empty or too short, skip
        if not text or len(text.strip()) < 5:
            return

        prompt = (
            f"You are a Knowledge Graph assistant. Your job is to extract entities and facts from conversation turns.\n"
            f"Identify Person, Organization, Technology, Location, Date, or Topic names mentioned in the text.\n\n"
            f"Existing entity memory (entity name -> facts):\n{json.dumps(existing_entities, indent=2)}\n\n"
            f"New text:\n\"{text}\"\n\n"
            f"Task: Update the entity memory using the new text. For each entity, merge any new facts with the existing ones into a single, concise description. "
            f"Do not lose key facts, but keep descriptions under 2 sentences. "
            f"Return ONLY a valid JSON object matching the format {{'EntityName': 'Fact sentence about entity'}}. "
            f"Do not include markdown wrappers or conversational filler."
        )

        try:
            response = await self.llm.ainvoke(prompt)
            content = response.content.strip()
            # Clean markdown JSON block formatting if present
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            
            updated_entities = json.loads(content.strip())
            # Ensure it is a dictionary
            if not isinstance(updated_entities, dict):
                logger.warning(f"[EntityMemory] Extraction did not return a dict: {updated_entities}")
                updated_entities = existing_entities
        except Exception as e:
            logger.error(f"[EntityMemory] Failed to extract/update entities: {e}", exc_info=True)
            updated_entities = existing_entities

        # Persist updated entities in MongoDB
        await db.entity_memory.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "entities": updated_entities,
                    "last_updated": now
                }
            },
            upsert=True
        )

    async def get_entities(self, session_id: str) -> Dict[str, str]:
        """
        Return all entities for the session.
        Format: entity_name -> facts about it
        """
        db = get_database()
        record = await db.entity_memory.find_one({"session_id": session_id})
        if not record:
            return {}
        return record.get("entities", {})

    async def inject_entities(self, session_id: str, query: str) -> str:
        """
        Find relevant entities for current query in the entity store and inject them as additional context.
        Return enriched query.
        """
        entities = await self.get_entities(session_id)
        if not entities:
            return query

        relevant_injections = []
        for entity_name, facts in entities.items():
            # Check if entity name is mentioned in the query (case insensitive word match)
            pattern = re.compile(rf"\b{re.escape(entity_name)}\b", re.IGNORECASE)
            if pattern.search(query):
                relevant_injections.append(f"- {entity_name}: {facts}")

        if relevant_injections:
            enriched_query = (
                f"{query}\n\n"
                f"[Entity Context:\n"
                f"{chr(10).join(relevant_injections)}]"
            )
            logger.info(f"[EntityMemory] Injected {len(relevant_injections)} entities into the query.")
            return enriched_query

        return query

    async def clear_memory(self, session_id: str) -> None:
        """Clear all entity memory records for session."""
        db = get_database()
        await db.entity_memory.delete_one({"session_id": session_id})
        logger.info(f"[EntityMemory] Cleared entities for session {session_id}")
