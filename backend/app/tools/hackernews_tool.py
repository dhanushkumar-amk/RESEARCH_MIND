import logging
import httpx
from typing import List
from pydantic import BaseModel, Field
from langchain_core.tools import tool

from app.tools.utils import with_timeout_and_retry

logger = logging.getLogger("researchmind.tools")

class HackerNewsSearchResult(BaseModel):
    title: str = Field(..., description="Title of the HackerNews post")
    url: str = Field(..., description="URL of the story or link page")
    points: int = Field(..., description="Upvote count/points of the post")
    comments: int = Field(..., description="Number of comments on the thread")
    date: str = Field(..., description="Date of post publication (YYYY-MM-DD)")

@tool
@with_timeout_and_retry(timeout_seconds=5.0, max_retries=1)
async def hackernews_search(query: str) -> List[HackerNewsSearchResult]:
    """
    Search HackerNews for tech discussions, developer opinions, and startup news.
    Input should be a search query string.
    """
    url = "https://hn.algolia.com/api/v1/search"
    params = {
        "query": query,
        "tags": "story",
        "hitsPerPage": 5
    }

    async with httpx.AsyncClient(timeout=4.0) as client:
        response = await client.get(url, params=params)
        if response.status_code != 200:
            logger.error(f"[HackerNews Tool] API status {response.status_code}")
            return []
            
        data = response.json()
        hits = data.get("hits", [])
        
        output = []
        for hit in hits:
            title = hit.get("title", "No Title")
            story_id = hit.get("objectID")
            story_url = hit.get("url") or f"https://news.ycombinator.com/item?id={story_id}"
            points = hit.get("points", 0)
            comments = hit.get("num_comments", 0)
            
            # Format published date
            created_at = hit.get("created_at")
            date_str = ""
            if created_at and len(created_at) >= 10:
                date_str = created_at[:10]
            else:
                date_str = "Unknown Date"
                
            output.append(
                HackerNewsSearchResult(
                    title=title,
                    url=story_url,
                    points=points,
                    comments=comments,
                    date=date_str
                )
            )
        return output
