import logging
from typing import List
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from tavily import AsyncTavilyClient

from app.core.config import settings
from app.tools.utils import with_timeout_and_retry

logger = logging.getLogger("researchmind.tools")

class TavilySearchResult(BaseModel):
    title: str = Field(..., description="Title of the search result")
    url: str = Field(..., description="URL of the source page")
    content: str = Field(..., description="Extract of content from the page")
    score: float = Field(..., description="Relevance score of the search result")

@tool
@with_timeout_and_retry(timeout_seconds=5.0, max_retries=1)
async def tavily_search(query: str) -> List[TavilySearchResult]:
    """
    Search real-time web for current information, news, and recent developments using Tavily.
    Input should be a search query string.
    """
    api_key = settings.tavily_api_key
    if not api_key or "your_tavily" in api_key:
        logger.warning("[Tavily Tool] Tavily API key is not configured.")
        return []

    client = AsyncTavilyClient(api_key=api_key)
    # Search with advanced depth and max results of 5
    response = await client.search(query=query, search_depth="advanced", max_results=5)
    results = response.get("results", [])

    output = []
    for r in results:
        output.append(
            TavilySearchResult(
                title=r.get("title", "No Title"),
                url=r.get("url", ""),
                content=r.get("content", ""),
                score=float(r.get("score", 0.0))
            )
        )
    return output
