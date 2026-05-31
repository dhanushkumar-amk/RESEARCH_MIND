from typing import TypedDict, List, Dict, Any, Annotated
from langchain_core.documents import Document

def merge_errors(old_val: str, new_val: str) -> str:
    """Reducer function to merge error strings from parallel graph nodes."""
    if not old_val:
        return new_val
    if not new_val:
        return old_val
    if old_val == new_val:
        return old_val
    return f"{old_val} | {new_val}"

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
    error: Annotated[str, merge_errors]
    report: dict

