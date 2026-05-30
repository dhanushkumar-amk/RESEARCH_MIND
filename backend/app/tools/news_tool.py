import httpx
from langchain_core.tools import tool
from app.core.config import settings
from app.tools.duckduckgo_tool import duckduckgo_search

@tool
async def news_search(query: str) -> str:
    """
    Search real-time current news articles and headlines.
    Input should be a query string.
    """
    api_key = settings.newsapi_key
    
    # Fallback to duckduckgo search if NewsAPI key is not configured
    if not api_key or "your_news_api" in api_key:
        print("[News Tool] NewsAPI key not set. Falling back to DuckDuckGo Search.")
        try:
            # Invoke the duckduckgo_search tool synchronously
            return duckduckgo_search.invoke(query)
        except Exception as e:
            return f"DuckDuckGo fallback search failed: {e}"
            
    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "sortBy": "publishedAt",
        "pageSize": 5,
        "apiKey": api_key
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            if response.status_code != 200:
                # If NewsAPI fails, fall back to DuckDuckGo
                print(f"[News Tool] NewsAPI status {response.status_code}. Falling back to DuckDuckGo.")
                return duckduckgo_search.invoke(query)
                
            data = response.json()
            articles = data.get("articles", [])
            if not articles:
                return f"No news articles found for query: '{query}'"
                
            results = []
            for art in articles:
                title = art.get("title")
                art_url = art.get("url")
                desc = art.get("description") or "No content available."
                source = art.get("source", {}).get("name", "Unknown Source")
                published = art.get("publishedAt", "Unknown Date")
                
                results.append(
                    f"Title: {title}\n"
                    f"Source: {source} ({published})\n"
                    f"URL: {art_url}\n"
                    f"Description: {desc}\n"
                )
            return "\n---\n".join(results)
    except Exception as e:
        print(f"[News Tool] NewsAPI exception: {e}. Falling back to DuckDuckGo.")
        try:
            return duckduckgo_search.invoke(query)
        except Exception as ddg_err:
            return f"Exception occurred during News Search: {str(e)} and fallback DDG also failed: {ddg_err}"
