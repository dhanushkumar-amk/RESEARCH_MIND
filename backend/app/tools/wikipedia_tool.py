import logging
import asyncio
from typing import List
from pydantic import BaseModel, Field
from langchain_core.tools import tool
import wikipediaapi

from app.tools.utils import with_timeout_and_retry

logger = logging.getLogger("researchmind.tools")

class WikipediaSearchResult(BaseModel):
    title: str = Field(..., description="Title of the Wikipedia page")
    summary: str = Field(..., description="Summary of the article (max 10 sentences)")
    url: str = Field(..., description="Full URL of the article")
    categories: List[str] = Field(default_factory=list, description="Categories associated with the article")

def sync_wikipedia_search(query: str) -> List[WikipediaSearchResult]:
    """Synchronous Wikipedia lookup run inside an executor thread."""
    wiki = wikipediaapi.Wikipedia(
        user_agent="ResearchMind/1.0 (contact@dhanushkumaramk.dev)",
        language="en"
    )
    page = wiki.page(query)
    if not page.exists():
        logger.info(f"[Wikipedia Tool] Page for '{query}' not found.")
        return []

    # Get categories list, removing the 'Category:' prefix
    categories = [cat.replace("Category:", "") for cat in page.categories.keys()]
    
    # Parse sentences (limit to 10 sentences roughly by splitting by period, or just return first 1000 characters of summary)
    summary_text = page.summary
    sentences = summary_text.split(". ")
    if len(sentences) > 10:
        summary_text = ". ".join(sentences[:10]) + "."

    return [
        WikipediaSearchResult(
            title=page.title,
            summary=summary_text,
            url=page.fullurl,
            categories=categories[:10]  # Limit to top 10 categories
        )
    ]

@tool
@with_timeout_and_retry(timeout_seconds=5.0, max_retries=1)
async def wikipedia_search(query: str) -> List[WikipediaSearchResult]:
    """
    Search Wikipedia for background knowledge, definitions, historical information.
    Input should be a search term page title string.
    """
    return await asyncio.to_thread(sync_wikipedia_search, query)
