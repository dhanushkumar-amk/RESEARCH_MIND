import logging
import asyncio
from datetime import datetime
from typing import List
from pydantic import BaseModel, Field
from langchain_core.tools import tool
import arxiv

from app.tools.utils import with_timeout_and_retry

logger = logging.getLogger("researchmind.tools")

class ArXivSearchResult(BaseModel):
    title: str = Field(..., description="Title of the paper")
    authors: List[str] = Field(..., description="List of paper authors")
    abstract: str = Field(..., description="Abstract/summary of the paper")
    url: str = Field(..., description="ArXiv URL for the paper page")
    published_date: str = Field(..., description="Date the paper was published (YYYY-MM-DD)")

def sync_arxiv_search(query: str) -> List[ArXivSearchResult]:
    """Synchronous ArXiv search executed in a thread pool."""
    client = arxiv.Client()
    search = arxiv.Search(
        query=query,
        max_results=5,
        sort_by=arxiv.SortCriterion.Relevance
    )
    
    output = []
    try:
        for paper in client.results(search):
            authors_list = [author.name for author in paper.authors]
            pub_date = paper.published.strftime("%Y-%m-%d") if isinstance(paper.published, datetime) else str(paper.published)
            output.append(
                ArXivSearchResult(
                    title=paper.title,
                    authors=authors_list,
                    abstract=paper.summary,
                    url=paper.entry_id,
                    published_date=pub_date
                )
            )
    except Exception as e:
        logger.error(f"[ArXiv Tool] ArXiv client iteration failed: {e}")
        
    return output

@tool
@with_timeout_and_retry(timeout_seconds=5.0, max_retries=1)
async def arxiv_search(query: str) -> List[ArXivSearchResult]:
    """
    Search ArXiv for academic research papers, scientific studies, and technical papers.
    Input should be a search query string.
    """
    return await asyncio.to_thread(sync_arxiv_search, query)
