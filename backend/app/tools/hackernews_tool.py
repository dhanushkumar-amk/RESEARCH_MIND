import httpx
from langchain_core.tools import tool

@tool
async def hackernews_search(query: str) -> str:
    """
    Search Hacker News stories and tech discussions. Useful for current tech industry sentiments, startups, and software engineering debates.
    Input should be a query string.
    """
    url = "https://hn.algolia.com/api/v1/search"
    params = {
        "query": query,
        "tags": "story",
        "hitsPerPage": 5
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            if response.status_code != 200:
                return f"Error from HackerNews Algolia API: status {response.status_code}"
                
            data = response.json()
            hits = data.get("hits", [])
            if not hits:
                return f"No HackerNews discussions found for query: '{query}'"
                
            results = []
            for hit in hits:
                title = hit.get("title")
                story_url = hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID')}"
                points = hit.get("points", 0)
                num_comments = hit.get("num_comments", 0)
                author = hit.get("author")
                
                results.append(
                    f"Title: {title}\n"
                    f"URL: {story_url}\n"
                    f"Author: {author} | Points: {points} | Comments: {num_comments}\n"
                )
            return "\n---\n".join(results)
    except Exception as e:
        return f"Exception occurred during HackerNews Search: {str(e)}"
