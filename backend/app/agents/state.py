from typing import TypedDict, List, Dict, Any
from langchain_core.documents import Document

class AgentState(TypedDict):
    question: str
    session_id: str
    source_ids: List[str]
    retrieved_chunks: List[Document]
    web_results: List[Document]
    reranked_chunks: List[Document]
    final_context: str
    answer: str
    sources: List[dict]
    quality_score: float
    needs_retry: bool
    retry_count: int
    conversation_history: List[dict]
    model_used: str
    token_count: int
    latency_ms: int
    error: str
    report: dict
