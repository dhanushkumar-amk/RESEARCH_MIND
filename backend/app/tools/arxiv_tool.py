import arxiv
from langchain_core.tools import tool

@tool
def arxiv_search(query: str) -> str:
    """
    Search ArXiv for academic research papers, preprints, and scientific articles.
    Input should be a search query string.
    """
    try:
        client = arxiv.Client()
        search = arxiv.Search(
            query=query,
            max_results=5,
            sort_by=arxiv.SortCriterion.Relevance
        )
        
        results = []
        for paper in client.results(search):
            authors = ", ".join([author.name for author in paper.authors])
            results.append(
                f"Title: {paper.title}\n"
                f"Authors: {authors}\n"
                f"Published: {paper.published.strftime('%Y-%m-%d')}\n"
                f"URL: {paper.entry_id}\n"
                f"Abstract:\n{paper.summary}\n"
            )
            
        if not results:
            return f"No papers found on ArXiv for query: '{query}'"
            
        return "\n---\n".join(results)
    except Exception as e:
        return f"Exception occurred during ArXiv Search: {str(e)}"
