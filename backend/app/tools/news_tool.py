import logging
from typing import List
import httpx
from pydantic import BaseModel, Field
from langchain_core.tools import tool

from app.core.config import settings
from app.tools.utils import with_timeout_and_retry
from app.tools.duckduckgo_tool import duckduckgo_search, DuckDuckGoSearchResult

logger = logging.getLogger("researchmind.tools")

class NewsSearchResult(BaseModel):
    title: str = Field(..., description="Title of the news article")
    description: str = Field(..., description="Description or abstract of the article")
    url: str = Field(..., description="URL link to the article page")
    source: str = Field(..., description="Source name of the news outlet")
    date: str = Field(..., description="Date of article publication (YYYY-MM-DD)")

async def fallback_ddg_search(query: str) -> List[NewsSearchResult]:
    """Fallback search using DuckDuckGo to match NewsSearchResult format."""
    try:
        ddg_results: List[DuckDuckGoSearchResult] = await duckduckgo_search.ainvoke(query)
        output = []
        for r in ddg_results:
            output.append(
                NewsSearchResult(
                    title=r.title,
                    description=r.body,
                    url=r.url,
                    source="DuckDuckGo Search",
                    date="Current"
                )
            )
        return output
    except Exception as e:
        logger.error(f"[News Tool] Fallback DuckDuckGo search failed: {e}")
        return []

@tool
@with_timeout_and_retry(timeout_seconds=5.0, max_retries=1)
async def news_search(query: str) -> List[NewsSearchResult]:
    """
    Search current news articles for recent events and developments.
    Input should be a search query string.
    """
    api_key = settings.newsapi_key
    if not api_key or "your_news_api" in api_key:
        logger.info("[News Tool] NewsAPI key not set. Falling back to DuckDuckGo Search.")
        return await fallback_ddg_search(query)

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "sortBy": "relevance",
        "language": "en",
        "pageSize": 5,
        "apiKey": api_key
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.get(url, params=params)
            if response.status_code != 200:
                logger.info(f"[News Tool] NewsAPI status {response.status_code}. Falling back to DuckDuckGo.")
                return await fallback_ddg_search(query)
                
            data = response.json()
            articles = data.get("articles", [])
            
            output = []
            for art in articles:
                title = art.get("title", "No Title")
                art_url = art.get("url", "")
                desc = art.get("description") or art.get("content") or "No description available."
                source = art.get("source", {}).get("name", "Unknown Source")
                published = art.get("publishedAt", "")
                
                # Format date string
                date_str = published[:10] if published and len(published) >= 10 else "Unknown Date"
                
                output.append(
                    NewsSearchResult(
                        title=title,
                        description=desc,
                        url=art_url,
                        source=source,
                        date=date_str
                    )
                )
            return output
    except Exception as e:
        logger.warning(f"[News Tool] NewsAPI exception: {e}. Falling back to DuckDuckGo.")
        return await fallback_ddg_search(query)
