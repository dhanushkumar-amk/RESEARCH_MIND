import httpx
from langchain_core.tools import tool
from app.core.config import settings

@tool
async def github_search(query: str) -> str:
    """
    Search public GitHub repositories for code, libraries, documentations, and open-source project structures.
    Input should be a query string.
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
        "per_page": 5
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                return f"Error from GitHub search API: status {response.status_code}"
                
            data = response.json()
            items = data.get("items", [])
            if not items:
                return f"No GitHub repositories found for query: '{query}'"
                
            results = []
            for item in items:
                name = item.get("full_name")
                desc = item.get("description") or "No description."
                repo_url = item.get("html_url")
                stars = item.get("stargazers_count", 0)
                lang = item.get("language") or "Unspecified"
                
                results.append(
                    f"Repo: {name}\n"
                    f"Language: {lang} | Stars: {stars}\n"
                    f"URL: {repo_url}\n"
                    f"Description: {desc}\n"
                )
            return "\n---\n".join(results)
    except Exception as e:
        return f"Exception occurred during GitHub Search: {str(e)}"
