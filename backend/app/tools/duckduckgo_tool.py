import logging
import asyncio
from typing import List
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from duckduckgo_search import DDGS

from app.tools.utils import with_timeout_and_retry

logger = logging.getLogger("researchmind.tools")

class DuckDuckGoSearchResult(BaseModel):
    title: str = Field(..., description="Title of the search result")
    url: str = Field(..., description="URL of the page")
    body: str = Field(..., description="Excerpt or snippet from the page")

def sync_ddg_search(query: str) -> List[DuckDuckGoSearchResult]:
    """Synchronous DuckDuckGo search running inside a thread pool."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))
            if not results:
                logger.info(f"[DuckDuckGo Tool] No results found for query '{query}'")
                return []
                
            output = []
            for r in results:
                output.append(
                    DuckDuckGoSearchResult(
                        title=r.get("title", "No Title"),
                        url=r.get("href", ""),
                        body=r.get("body", "")
                    )
                )
            return output
    except Exception as e:
        logger.error(f"[DuckDuckGo Tool] Search execution failed: {e}")
        return []

@tool
@with_timeout_and_retry(timeout_seconds=5.0, max_retries=1)
async def duckduckgo_search(query: str) -> List[DuckDuckGoSearchResult]:
    """
    Search web via DuckDuckGo for general information when other searches fail.
    Input should be a search query string.
    """
    return await asyncio.to_thread(sync_ddg_search, query)
