import logging
import asyncio
from typing import List
import httpx
import praw
from pydantic import BaseModel, Field
from langchain_core.tools import tool

from app.core.config import settings
from app.tools.utils import with_timeout_and_retry

logger = logging.getLogger("researchmind.tools")

class RedditSearchResult(BaseModel):
    title: str = Field(..., description="Title of the Reddit post")
    content: str = Field(..., description="Selftext/content of the post")
    url: str = Field(..., description="URL link of the thread")
    subreddit: str = Field(..., description="Subreddit name (e.g. r/Python)")
    score: int = Field(..., description="Upvote score of the post")

def sync_reddit_praw_search(query: str) -> List[RedditSearchResult]:
    """Synchronous Reddit search using PRAW inside thread pool."""
    client_id = settings.reddit_client_id
    client_secret = settings.reddit_client_secret
    user_agent = settings.reddit_user_agent or "ResearchMind/1.0"
    
    if not client_id or not client_secret or "your_reddit" in client_id:
        # Silently fail so we trigger HTTPX fallback
        raise ValueError("Missing PRAW credentials.")
        
    reddit = praw.Reddit(
        client_id=client_id,
        client_secret=client_secret,
        user_agent=user_agent
    )
    reddit.read_only = True
    
    # Sort by relevance, time filter: year
    submissions = reddit.subreddit("all").search(query, sort="relevance", time_filter="year", limit=5)
    
    output = []
    for sub in submissions:
        content = sub.selftext
        if len(content) > 500:
            content = content[:500] + "..."
        output.append(
            RedditSearchResult(
                title=sub.title,
                content=content or "[Link post]",
                url=f"https://www.reddit.com{sub.permalink}",
                subreddit=f"r/{sub.subreddit.display_name}",
                score=sub.score
            )
        )
    return output

async def async_reddit_public_search(query: str) -> List[RedditSearchResult]:
    """Asynchronous Reddit search utilizing the public JSON endpoint as a fallback."""
    url = "https://www.reddit.com/search.json"
    headers = {"User-Agent": settings.reddit_user_agent or "ResearchMind/1.0"}
    params = {"q": query, "limit": 5, "type": "link", "t": "year"}
    
    async with httpx.AsyncClient(timeout=4.0) as client:
        response = await client.get(url, params=params, headers=headers)
        if response.status_code != 200:
            logger.error(f"[Reddit Tool] Public fallback failed: status {response.status_code}")
            return []
            
        data = response.json()
        children = data.get("data", {}).get("children", [])
        
        output = []
        for child in children:
            post = child.get("data", {})
            title = post.get("title", "No Title")
            subreddit = post.get("subreddit", "unknown")
            score = post.get("score", 0)
            permalink = post.get("permalink", "")
            content = post.get("selftext", "")
            
            if len(content) > 500:
                content = content[:500] + "..."
                
            output.append(
                RedditSearchResult(
                    title=title,
                    content=content or "[Link post]",
                    url=f"https://www.reddit.com{permalink}" if permalink else "",
                    subreddit=f"r/{subreddit}",
                    score=score
                )
            )
        return output

@tool
@with_timeout_and_retry(timeout_seconds=5.0, max_retries=1)
async def reddit_search(query: str) -> List[RedditSearchResult]:
    """
    Search Reddit for community discussions, opinions, and real user experiences.
    Input should be a search query string.
    """
    try:
        # Try PRAW search in thread pool first
        return await asyncio.to_thread(sync_reddit_praw_search, query)
    except Exception as e:
        logger.info(f"[Reddit Tool] PRAW failed: {e}. Falling back to public JSON search.")
        try:
            return await async_reddit_public_search(query)
        except Exception as fallback_err:
            logger.error(f"[Reddit Tool] Fallback search failed: {fallback_err}")
            return []
