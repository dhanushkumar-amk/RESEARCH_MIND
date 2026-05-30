from duckduckgo_search import DDGS
from langchain_core.tools import tool

@tool
def duckduckgo_search(query: str) -> str:
    """
    Search the web using DuckDuckGo. Use this as a general fallback search tool for web topics.
    Input should be a query string.
    """
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))
            if not results:
                return f"No results found on DuckDuckGo for query: '{query}'"
                
            formatted = []
            for r in results:
                formatted.append(
                    f"Title: {r.get('title')}\n"
                    f"URL: {r.get('href')}\n"
                    f"Snippet: {r.get('body')}\n"
                )
            return "\n---\n".join(formatted)
    except Exception as e:
        return f"Exception occurred during DuckDuckGo Search: {str(e)}"
