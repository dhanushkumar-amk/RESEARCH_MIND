import logging
import time
from typing import List, Dict, Any
from langchain_core.documents import Document

from app.core.config import settings
from app.core.database import get_database
from app.models.context_schemas import ContextAssemblyOutput, TokenBreakdown
from app.context.token_budget import TokenBudgetManager
from app.context.sliding_window import SlidingWindowMemory
from app.context.context_injector import ContextInjector

logger = logging.getLogger("researchmind")

class ContextAssembler:
    def __init__(self):
        self.budget_manager = TokenBudgetManager()
        self.sliding_window = SlidingWindowMemory()
        self.injector = ContextInjector()

    async def assemble_context(
        self,
        question: str,
        session_id: str,
        chunks: List[Document],
        user_id: str
    ) -> ContextAssemblyOutput:
        """
        Assemble and optimize context for LLM generation.
        Returns a structured ContextAssemblyOutput model.
        """
        start_time = time.time()
        logger.info(f"[ContextAssembler] Starting context assembly for session {session_id}...")

        # Step 1: Count and validate query tokens
        query_budget = settings.token_budget_query
        query_tokens = self.budget_manager.count_tokens(question)
        if query_tokens > query_budget:
            logger.warning(f"[ContextAssembler] Query tokens ({query_tokens}) exceed budget ({query_budget}). Trimming...")
            question = self.budget_manager.trim_to_budget(question, query_budget)
            query_tokens = self.budget_manager.count_tokens(question)

        # Step 2: Build dynamic system prompt
        system_prompt = await self.injector.build_system_prompt(user_id, session_id, question)
        system_tokens = self.budget_manager.count_tokens(system_prompt)

        # Step 3: Get conversation history
        window_messages = await self.sliding_window.get_window(session_id)
        
        # Check for dropped message summaries in DB
        db = get_database()
        sw_record = await db.sliding_window_memory.find_one({"session_id": session_id})
        summary = sw_record.get("summary", "") if sw_record else ""

        history_list = []
        if summary:
            history_list.append({"role": "system", "content": f"Summary of older conversation: {summary}"})
        for msg in window_messages:
            history_list.append({"role": msg["role"], "content": msg["content"]})

        # Trim history list to fit 2400 token budget
        history_budget = settings.token_budget_history
        while self._count_history_list_tokens(history_list) > history_budget:
            if len(history_list) > 1:
                # If the first message is a summary, keep it and remove the next oldest turn
                if history_list[0]["role"] == "system":
                    if len(history_list) > 2:
                        history_list.pop(1)
                    else:
                        # Summary itself is too long, trim summary
                        history_list[0]["content"] = self.budget_manager.trim_to_budget(history_list[0]["content"], history_budget - 100)
                        break
                else:
                    history_list.pop(0)
            else:
                # Only one message left, trim it
                history_list[0]["content"] = self.budget_manager.trim_to_budget(history_list[0]["content"], history_budget)
                break

        history_tokens = self._count_history_list_tokens(history_list)

        # Step 4: Format retrieved chunks
        allocated_chunks = self.budget_manager.allocate_context(chunks)
        formatted_context = self.budget_manager.format_context(allocated_chunks)
        context_tokens = self.budget_manager.count_tokens(formatted_context)

        # Step 5: Validate total budget (under 8000 tokens)
        total_budget = settings.token_budget_total
        total_tokens = system_tokens + history_tokens + context_tokens + query_tokens

        if total_tokens > total_budget:
            logger.warning(f"[ContextAssembler] Total tokens ({total_tokens}) exceed budget ({total_budget}). Down-trimming context and history...")
            
            # Reduce context budget dynamically to fit
            allowed_context_tokens = total_budget - (system_tokens + history_tokens + query_tokens)
            if allowed_context_tokens < 1000:
                # If context budget is squeezed too much, trim history as well
                allowed_history_tokens = max(1000, history_budget - 500)
                while self._count_history_list_tokens(history_list) > allowed_history_tokens and len(history_list) > 1:
                    history_list.pop(1 if history_list[0]["role"] == "system" else 0)
                history_tokens = self._count_history_list_tokens(history_list)
                allowed_context_tokens = total_budget - (system_tokens + history_tokens + query_tokens)

            # Re-trim context text to dynamic limit
            formatted_context = self.budget_manager.trim_to_budget(formatted_context, max(0, allowed_context_tokens))
            context_tokens = self.budget_manager.count_tokens(formatted_context)
            total_tokens = system_tokens + history_tokens + context_tokens + query_tokens

        # Step 6: Assemble final output
        token_breakdown = TokenBreakdown(
            system=system_tokens,
            history=history_tokens,
            context=context_tokens,
            query=query_tokens,
            total=total_tokens
        )

        latency_ms = int((time.time() - start_time) * 1000)
        logger.info(f"[ContextAssembler] Assembled context in {latency_ms}ms. Total tokens: {total_tokens}")

        return ContextAssemblyOutput(
            system_prompt=system_prompt,
            history=history_list,
            context=formatted_context,
            query=question,
            token_breakdown=token_breakdown
        )

    def _count_history_list_tokens(self, history_list: List[Dict[str, Any]]) -> int:
        """Helper to count tokens in a history list of dicts."""
        history_str = "\n".join([f"{msg.get('role', 'user')}: {msg.get('content', '')}" for msg in history_list])
        return self.budget_manager.count_tokens(history_str)
