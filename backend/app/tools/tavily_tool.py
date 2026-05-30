import httpx
from langchain_core.tools import tool
from app.core.config import settings

@tool
async def tavily_search(query: str) -> str:
    """
    Search the web in real-time using Tavily Search API. Useful for current facts, news, and general topics.
    Input should be a search query string.
    """
    api_key = settings.tavily_api_key
    if not api_key or "your_tavily" in api_key:
        return "Tavily API key is not configured."
        
    url = "https://api.tavily.com/search"
    payload = {
        "api_key": api_key,
        "query": query,
        "max_results": 5
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code != 200:
                return f"Error from Tavily Search API: status {response.status_code}"
            
            data = response.json()
            results = data.get("results", [])
            if not results:
                return "No search results found."
                
            formatted = []
            for r in results:
                formatted.append(f"Title: {r.get('title')}\nURL: {r.get('url')}\nContent: {r.get('content')}\n")
            return "\n---\n".join(formatted)
    except Exception as e:
        return f"Exception occurred during Tavily Search: {str(e)}"
