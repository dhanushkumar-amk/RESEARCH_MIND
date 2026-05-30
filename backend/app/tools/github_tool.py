import logging
import httpx
from typing import List
from pydantic import BaseModel, Field
from langchain_core.tools import tool

from app.core.config import settings
from app.tools.utils import with_timeout_and_retry

logger = logging.getLogger("researchmind.tools")

class GitHubSearchResult(BaseModel):
    name: str = Field(..., description="Repository full name (owner/repo)")
    description: str = Field(..., description="Repository description")
    url: str = Field(..., description="URL link to the repository")
    stars: int = Field(..., description="Stargazers count of the repository")
    language: str = Field(..., description="Primary programming language")

@tool
@with_timeout_and_retry(timeout_seconds=5.0, max_retries=1)
async def github_search(query: str) -> List[GitHubSearchResult]:
    """
    Search GitHub for open source projects, code examples, and technical documentation.
    Input should be a search query string.
    """
    url = "https://api.github.com/search/repositories"
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "ResearchMind/1.0"
    }

    token = settings.github_token
    if token and "your_github" not in token:
        headers["Authorization"] = f"token {token}"

    params = {
        "q": query,
        "sort": "stars",
        "order": "desc",
        "per_page": 5
    }

    async with httpx.AsyncClient(timeout=4.0) as client:
        response = await client.get(url, params=params, headers=headers)
        if response.status_code != 200:
            logger.error(f"[GitHub Tool] API error: status {response.status_code}")
            return []
            
        data = response.json()
        items = data.get("items", [])
        
        output = []
        for item in items:
            name = item.get("full_name", "Unknown Repository")
            desc = item.get("description") or "No description provided."
            repo_url = item.get("html_url", "")
            stars = item.get("stargazers_count", 0)
            lang = item.get("language") or "Unspecified"
            
            output.append(
                GitHubSearchResult(
                    name=name,
                    description=desc,
                    url=repo_url,
                    stars=stars,
                    language=lang
                )
            )
        return output
