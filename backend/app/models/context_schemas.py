from pydantic import BaseModel, Field
from typing import List, Dict, Any

class TokenBreakdown(BaseModel):
    system: int = Field(..., description="Tokens used for system prompt")
    history: int = Field(..., description="Tokens used for conversation history")
    context: int = Field(..., description="Tokens used for retrieved context chunks")
    query: int = Field(..., description="Tokens used for user query")
    total: int = Field(..., description="Total tokens used")

class ContextAssemblyOutput(BaseModel):
    system_prompt: str = Field(..., description="Dynamically assembled system prompt")
    history: List[Dict[str, Any]] = Field(..., description="Conversation history as a list of dicts with role and content")
    context: str = Field(..., description="Formatted context chunks")
    query: str = Field(..., description="User query (possibly enriched)")
    token_breakdown: TokenBreakdown = Field(..., description="Breakdown of tokens used by component")
