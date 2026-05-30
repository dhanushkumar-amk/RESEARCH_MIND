import asyncio
import os
import sys
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from unittest.mock import MagicMock, AsyncMock
from langchain_core.documents import Document

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_context")

# Ensure app is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# -------------------------------------------------------------
# IN-MEMORY MONGO MOCK
# -------------------------------------------------------------
class MockCursor:
    def __init__(self, data):
        self.data = data
    def sort(self, *args, **kwargs):
        return self
    def limit(self, *args, **kwargs):
        return self
    async def to_list(self, length=None):
        if length is not None:
            return self.data[:length]
        return self.data



class MockCollection:
    def __init__(self, name):
        self.name = name
        self.store = {} # _id -> doc
    async def find_one(self, query):
        for k, v in self.store.items():
            match = True
            for qk, qv in query.items():
                if v.get(qk) != qv:
                    match = False
                    break
            if match:
                return v
        return None
    async def update_one(self, query, update, upsert=False):
        doc = None
        for k, v in self.store.items():
            match = True
            for qk, qv in query.items():
                if v.get(qk) != qv:
                    match = False
                    break
            if match:
                doc = v
                break
        if not doc:
            if upsert:
                doc = {**query}
                self.store[str(len(self.store))] = doc
            else:
                return
        if "$set" in update:
            for uk, uv in update["$set"].items():
                doc[uk] = uv
    async def insert_one(self, doc):
        self.store[str(len(self.store))] = doc
    async def delete_one(self, query):
        to_del = None
        for k, v in self.store.items():
            match = True
            for qk, qv in query.items():
                if v.get(qk) != qv:
                    match = False
                    break
            if match:
                to_del = k
                break
        if to_del:
            del self.store[to_del]
    async def delete_many(self, query):
        to_del = []
        for k, v in self.store.items():
            match = True
            for qk, qv in query.items():
                if v.get(qk) != qv:
                    match = False
                    break
            if match:
                to_del.append(k)
        for k in to_del:
            del self.store[k]
    async def count_documents(self, query):
        count = 0
        for k, v in self.store.items():
            match = True
            for qk, qv in query.items():
                if v.get(qk) != qv:
                    match = False
                    break
            if match:
                count += 1
        return count
    def find(self, query):
        res = []
        for k, v in self.store.items():
            match = True
            for qk, qv in query.items():
                if v.get(qk) != qv:
                    match = False
                    break
            if match:
                res.append(v)
        return MockCursor(res)

class MockDatabase:
    def __init__(self):
        self.collections = {}
    def __getattr__(self, name):
        if name not in self.collections:
            self.collections[name] = MockCollection(name)
        return self.collections[name]
    def __getitem__(self, name):
        return getattr(self, name)

# Mock database module functions
mock_db = MockDatabase()
import app.core.database
app.core.database.get_database = lambda: mock_db
app.core.database.connect_to_mongo = AsyncMock()
app.core.database.close_mongo_connection = AsyncMock()

# -------------------------------------------------------------
# MOCK CHATLITELLM AND LANGSMITH
# -------------------------------------------------------------
class MockResponse:
    def __init__(self, content):
        self.content = content
        self.response_metadata = {"model_info": {"name": "mock-model"}}

import langchain_litellm
# Inject a mock ainvoke method that returns custom facts or summaries
async def mock_ainvoke(self, prompt, *args, **kwargs):
    prompt_str = str(prompt)
    print(f"DEBUG prompt content: {prompt_str}")
    if "extract entities" in prompt_str.lower() or "knowledge graph" in prompt_str.lower():
        return MockResponse('{"Microsoft": "Technology company founded by Bill Gates.", "Seattle": "City in Washington state."}')
    elif "summary" in prompt_str.lower():
        return MockResponse("This is a summary of the mock conversation.")
    return MockResponse("Mock generated response.")

langchain_litellm.ChatLiteLLM.ainvoke = mock_ainvoke

# Avoid LangChain's classic ConversationSummaryMemory real invocation by mocking it too
import langchain_classic.memory
langchain_classic.memory.ConversationSummaryMemory.predict_new_summary = MagicMock(return_value="This is a summary of previous conversation.")

# Mock LangSmith Client
import langsmith
langsmith.Client = MagicMock()

# Now import context modules
from app.context.token_budget import TokenBudgetManager
from app.context.summary_memory import SummaryMemory
from app.context.sliding_window import SlidingWindowMemory
from app.context.entity_memory import EntityMemory
from app.context.context_injector import ContextInjector
from app.context.assembler import ContextAssembler

async def run_tests():
    logger.info("Initializing mock database...")
    db = app.core.database.get_database()
    
    session_id = "test_session_12345"
    user_id = "60c72b2f9b1d8b2d88c88f12"
    
    # Initialize mock user
    from bson import ObjectId
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"name": "Test User", "preferred_topics": ["AI", "Quantum Computing"]}},
        upsert=True
    )
    
    # Initialize mock library docs
    await db.sources.insert_one({"user_id": user_id, "filename": "doc1.pdf", "created_at": datetime.now(timezone.utc)})
    
    try:
        # -------------------------------------------------------------
        # TEST 1: TokenBudgetManager
        # -------------------------------------------------------------
        logger.info("\n--- TEST 1: TokenBudgetManager ---")
        budget_mgr = TokenBudgetManager()
        
        sample_text = "This is a simple sentence. This is another sentence that has more words."
        tokens = budget_mgr.count_tokens(sample_text)
        logger.info(f"Tokens in sample text: {tokens}")
        assert tokens > 0, "Token count should be greater than zero."
        
        # Test sentence-aware trimming
        trimmed = budget_mgr.trim_to_budget(sample_text, 10)
        logger.info(f"Trimmed (max 10 tokens): '{trimmed}'")
        assert budget_mgr.count_tokens(trimmed) <= 10, "Trimmed text must be <= 10 tokens"
        assert trimmed.endswith(".") or len(trimmed) > 0
        
        # Test context allocation
        chunks = [
            Document(page_content="Content of chunk 1", metadata={"relevance_score": 9.5, "filename": "doc1.pdf", "page_number": 1}),
            Document(page_content="Content of chunk 2", metadata={"relevance_score": 5.0, "filename": "doc2.pdf", "page_number": 10}),
            Document(page_content="Content of chunk 3", metadata={"relevance_score": 8.0, "filename": "doc3.pdf", "page_number": 3})
        ]
        allocated = budget_mgr.allocate_context(chunks)
        logger.info(f"Allocated {len(allocated)} chunks out of {len(chunks)}.")
        assert len(allocated) == 3, "All small chunks should fit in context budget."
        
        formatted = budget_mgr.format_context(allocated)
        logger.info(f"Formatted context:\n{formatted}")
        assert "[Source: doc1.pdf, Page: 1]" in formatted
        # Verify Lost-in-the-Middle order: doc1 (9.5) first, doc3 (8.0) last, doc2 (5.0) in the middle.
        lines = formatted.split("\n")
        assert "doc1.pdf" in lines[0]
        assert "doc3.pdf" in lines[-1] or "doc3.pdf" in lines[-2]
        
        # -------------------------------------------------------------
        # TEST 2: SummaryMemory
        # -------------------------------------------------------------
        logger.info("\n--- TEST 2: SummaryMemory ---")
        summary_mem = SummaryMemory()
        await summary_mem.clear_memory(session_id)
        
        await summary_mem.add_message(session_id, "human", "What is quantum computing?")
        await summary_mem.add_message(session_id, "assistant", "Quantum computing uses quantum mechanics.")
        
        history = await summary_mem.get_history(session_id)
        logger.info(f"History: {history}")
        assert len(history) == 2, "History should have 2 messages."
        assert history[0]["role"] == "human"
        assert history[1]["role"] == "assistant"
        
        summary = await summary_mem.get_summary(session_id)
        logger.info(f"Summary: '{summary}'")
        
        # -------------------------------------------------------------
        # TEST 3: SlidingWindowMemory
        # -------------------------------------------------------------
        logger.info("\n--- TEST 3: SlidingWindowMemory ---")
        sliding_mem = SlidingWindowMemory()
        await sliding_mem.clear_memory(session_id)
        
        # Add 12 turns (24 messages) to exceed window size of 10
        for i in range(12):
            await sliding_mem.add_to_window(session_id, {"role": "human", "content": f"Query {i}"})
            await sliding_mem.add_to_window(session_id, {"role": "assistant", "content": f"Response {i}"})
            
        window = await sliding_mem.get_window(session_id)
        logger.info(f"Sliding window size (expected 10): {len(window)}")
        assert len(window) <= 10, "Window should be sliced to max 10 messages"
        
        # Force a summary entry in DB for the test
        await db.sliding_window_memory.update_one(
            {"session_id": session_id},
            {"$set": {"summary": "This is a summary of older turns."}}
        )
        
        full_ctx = await sliding_mem.get_full_context(session_id)
        logger.info(f"Sliding window full context:\n{full_ctx}")
        assert "Summary of older conversation turns" in full_ctx
        
        # -------------------------------------------------------------
        # TEST 4: EntityMemory
        # -------------------------------------------------------------
        logger.info("\n--- TEST 4: EntityMemory ---")
        entity_mem = EntityMemory()
        await entity_mem.clear_memory(session_id)
        
        await entity_mem.extract_entities(session_id, "Bill Gates founded Microsoft in Seattle.")
        entities = await entity_mem.get_entities(session_id)
        logger.info(f"Extracted entities: {entities}")
        assert "Microsoft" in entities, "Should extract Microsoft from prompt mock response"
        
        # Test injection
        enriched = await entity_mem.inject_entities(session_id, "Tell me about Microsoft's history.")
        logger.info(f"Enriched query: {enriched}")
        assert "Entity Context" in enriched
        assert "Microsoft" in enriched
        
        # -------------------------------------------------------------
        # TEST 5: ContextInjector & ContextAssembler
        # -------------------------------------------------------------
        logger.info("\n--- TEST 5: ContextAssembler ---")
        assembler = ContextAssembler()
        
        output = await assembler.assemble_context(
            question="Tell me about Microsoft.",
            session_id=session_id,
            chunks=chunks,
            user_id=user_id
        )
        
        logger.info("\n=== FINAL CONTEXT ASSEMBLY OUTPUT ===")
        logger.info(f"System Prompt:\n{output.system_prompt}")
        logger.info(f"History (list): {output.history}")
        logger.info(f"Context:\n{output.context}")
        logger.info(f"Query: {output.query}")
        logger.info(f"Token Breakdown: {output.token_breakdown}")
        
        from app.core.config import settings
        assert output.token_breakdown.total <= settings.token_budget_total, "Total tokens must be under total budget"
        logger.info("\nAll tests completed successfully!")
        
    finally:
        logger.info("Cleaning up mock database records...")
        await db.users.delete_one({"_id": ObjectId(user_id)})
        await db.conversation_memory.delete_many({"session_id": session_id})
        await db.sliding_window_memory.delete_many({"session_id": session_id})
        await db.entity_memory.delete_many({"session_id": session_id})

if __name__ == "__main__":
    asyncio.run(run_tests())
