import wikipediaapi
from langchain_core.tools import tool

@tool
def wikipedia_search(query: str) -> str:
    """
    Search Wikipedia for background knowledge, histories, and encyclopedia definitions.
    Input should be a search term or page title.
    """
    try:
        # User-agent is required per Wikipedia API policy to avoid rate blocking
        wiki = wikipediaapi.Wikipedia(
            user_agent="ResearchMind/1.0 (contact@dhanushkumaramk.dev)",
            language="en"
        )
        page = wiki.page(query)
        if not page.exists():
            # If direct match fails, try to return search page suggestions (using a basic search query if available)
            # Since wikipedia-api doesn't have search-list directly, we'll try a fallback page
            return f"Wikipedia page for '{query}' not found."
            
        summary = page.summary
        if len(summary) > 2000:
            summary = summary[:2000] + "\n[Truncated...]"
            
        return f"Title: {page.title}\nURL: {page.fullurl}\nSummary:\n{summary}"
    except Exception as e:
        return f"Exception occurred during Wikipedia Search: {str(e)}"
