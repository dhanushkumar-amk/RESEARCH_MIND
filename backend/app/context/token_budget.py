import re
import logging
from typing import List, Dict, Any, Tuple
import tiktoken
from langchain_core.documents import Document
from app.core.config import settings

logger = logging.getLogger("researchmind")

class TokenBudgetManager:
    def __init__(self):
        try:
            self.encoding = tiktoken.get_encoding("cl100k_base")
        except Exception:
            self.encoding = tiktoken.encoding_for_model("gpt-4")
        
        self.total_budget = settings.token_budget_total
        self.system_budget = settings.token_budget_system
        self.history_budget = settings.token_budget_history
        self.context_budget = settings.token_budget_context
        self.query_budget = settings.token_budget_query

    def count_tokens(self, text: str) -> int:
        """Count the number of tokens in the given text using tiktoken cl100k_base."""
        if not text:
            return 0
        return len(self.encoding.encode(text))

    def validate_budget(self, system: str, history: str | List[Dict[str, Any]], context: str, query: str) -> Dict[str, Any]:
        """
        Check if each section fits its allocation.
        Returns a detailed budget report per section.
        """
        # Convert history list of dicts to string if needed
        if isinstance(history, list):
            history_str = "\n".join([f"{msg.get('role', 'user')}: {msg.get('content', '')}" for msg in history])
        else:
            history_str = history

        system_tokens = self.count_tokens(system)
        history_tokens = self.count_tokens(history_str)
        context_tokens = self.count_tokens(context)
        query_tokens = self.count_tokens(query)
        total_tokens = system_tokens + history_tokens + context_tokens + query_tokens

        report = {
            "system": {
                "allocated": self.system_budget,
                "used": system_tokens,
                "valid": system_tokens <= self.system_budget
            },
            "history": {
                "allocated": self.history_budget,
                "used": history_tokens,
                "valid": history_tokens <= self.history_budget
            },
            "context": {
                "allocated": self.context_budget,
                "used": context_tokens,
                "valid": context_tokens <= self.context_budget
            },
            "query": {
                "allocated": self.query_budget,
                "used": query_tokens,
                "valid": query_tokens <= self.query_budget
            },
            "total": {
                "allocated": self.total_budget,
                "used": total_tokens,
                "valid": total_tokens <= self.total_budget
            }
        }
        return report

    def trim_to_budget(self, text: str, max_tokens: int) -> str:
        """
        Trim text to fit token limit.
        Never cut mid-sentence.
        """
        if self.count_tokens(text) <= max_tokens:
            return text

        # Split text into sentences using basic regex
        sentences = re.split(r'(?<=[.!?])\s+', text)
        trimmed_sentences = []
        
        for sentence in sentences:
            # Test joining with a space
            candidate = " ".join(trimmed_sentences + [sentence]).strip()
            if self.count_tokens(candidate) <= max_tokens:
                trimmed_sentences.append(sentence)
            else:
                break
        
        if not trimmed_sentences:
            # Fallback: if even a single sentence exceeds the budget,
            # trim by tokens directly and try to end at the last punctuation mark.
            tokens = self.encoding.encode(text)
            trimmed_tokens = tokens[:max_tokens]
            decoded = self.encoding.decode(trimmed_tokens)
            
            # Find the last sentence end in the decoded string
            match = re.search(r'.*[.!?]', decoded)
            if match:
                return match.group(0)
            return decoded

        return " ".join(trimmed_sentences).strip()

    def allocate_context(self, chunks: List[Document]) -> List[Document]:
        """
        Select chunks that fit the context token budget (default 3200).
        Prioritize higher scored chunks.
        """
        # Sort chunks descending by relevance score
        sorted_chunks = sorted(
            chunks,
            key=lambda d: d.metadata.get("relevance_score") or d.metadata.get("score") or 0.0,
            reverse=True
        )

        fitting_chunks = []
        for chunk in sorted_chunks:
            # We evaluate budget based on how chunks are formatted
            test_list = fitting_chunks + [chunk]
            formatted_test = self.format_context(test_list)
            if self.count_tokens(formatted_test) <= self.context_budget:
                fitting_chunks.append(chunk)
            else:
                # Since we sorted by priority, we can break or continue trying to fit smaller chunks.
                # Let's keep trying other chunks (greedy knapsack style) to maximize context budget utilization.
                continue

        return fitting_chunks

    def format_context(self, chunks: List[Document]) -> str:
        """
        Format chunks with source metadata (source name and page number).
        Clean readable format for LLM.
        Applies Lost-in-the-Middle reordering:
        - Place most relevant chunk at start
        - Place second most relevant chunk at end
        - Place rest in middle
        """
        if not chunks:
            return ""

        # Make sure they are sorted by score first to identify relevance hierarchy
        sorted_chunks = sorted(
            chunks,
            key=lambda d: d.metadata.get("relevance_score") or d.metadata.get("score") or 0.0,
            reverse=True
        )

        # Apply lost-in-the-middle reordering
        n = len(sorted_chunks)
        if n > 2:
            reordered = [sorted_chunks[0]] + sorted_chunks[2:] + [sorted_chunks[1]]
        else:
            reordered = sorted_chunks

        formatted_parts = []
        for doc in reordered:
            meta = doc.metadata
            # Get source name (filename, title, or source)
            filename = meta.get("filename") or meta.get("title") or meta.get("source") or "Unknown Source"
            page_num = meta.get("page_number") or meta.get("page") or 1
            formatted_parts.append(f"[Source: {filename}, Page: {page_num}]\n{doc.page_content.strip()}")

        return "\n\n".join(formatted_parts).strip()
