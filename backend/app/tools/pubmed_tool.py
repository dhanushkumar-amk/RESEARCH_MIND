import logging
import asyncio
from typing import List
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from Bio import Entrez, Medline

from app.core.config import settings
from app.tools.utils import with_timeout_and_retry

logger = logging.getLogger("researchmind.tools")

class PubMedSearchResult(BaseModel):
    title: str = Field(..., description="Title of the publication")
    abstract: str = Field(..., description="Abstract or description of the study")
    authors: List[str] = Field(..., description="List of paper authors")
    url: str = Field(..., description="URL of the publication page on PubMed")

def sync_pubmed_search(query: str) -> List[PubMedSearchResult]:
    """Synchronous PubMed search running inside a thread pool."""
    # Set email for NCBI request compliance
    Entrez.email = settings.pubmed_email or "your@email.com"
    
    try:
        # 1. Search for matching IDs
        search_handle = Entrez.esearch(db="pubmed", term=query, retmax=5)
        search_results = Entrez.read(search_handle)
        search_handle.close()
        
        id_list = search_results.get("IdList", [])
        if not id_list:
            logger.info(f"[PubMed Tool] No results found for query '{query}'")
            return []
            
        # 2. Fetch Medline records
        fetch_handle = Entrez.efetch(db="pubmed", id=id_list, rettype="medline", retmode="text")
        records = list(Medline.parse(fetch_handle))
        fetch_handle.close()
        
        output = []
        for r in records:
            title = r.get("TI", "No Title Available")
            abstract = r.get("AB", "No abstract available.")
            authors = r.get("AU", [])
            pmid = r.get("PMID", "")
            url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else ""
            
            output.append(
                PubMedSearchResult(
                    title=title,
                    abstract=abstract,
                    authors=authors,
                    url=url
                )
            )
        return output
    except Exception as e:
        logger.error(f"[PubMed Tool] Entrez query failed: {e}")
        return []

@tool
@with_timeout_and_retry(timeout_seconds=5.0, max_retries=1)
async def pubmed_search(query: str) -> List[PubMedSearchResult]:
    """
    Search PubMed for medical research, clinical studies, and health science papers.
    Input should be a search query string.
    """
    return await asyncio.to_thread(sync_pubmed_search, query)
