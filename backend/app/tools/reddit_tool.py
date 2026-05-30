import httpx
import praw
from langchain_core.tools import tool
from app.core.config import settings

@tool
async def reddit_search(query: str) -> str:
    """
    Search Reddit threads and discussions for community opinions, tech comments, and troubleshooting queries.
    Input should be a query string.
    """
    client_id = settings.reddit_client_id
    client_secret = settings.reddit_client_secret
    
    # Try PRAW if credentials exist
    if client_id and client_secret and "your_reddit" not in client_id:
        try:
            reddit = praw.Reddit(
                client_id=client_id,
                client_secret=client_secret,
                user_agent="ResearchMind/1.0 (contact@dhanushkumaramk.dev)"
            )
            # Use read_only mode to search
            reddit.read_only = True
            submissions = reddit.subreddit("all").search(query, limit=5)
            
            results = []
            for sub in submissions:
                content = sub.selftext
                if len(content) > 500:
                    content = content[:500] + "..."
                results.append(
                    f"Title: {sub.title}\n"
                    f"Subreddit: r/{sub.subreddit.display_name} | Score: {sub.score}\n"
                    f"URL: https://www.reddit.com{sub.permalink}\n"
                    f"Content: {content or '[Link post]'}\n"
                )
            if results:
                return "\n---\n".join(results)
        except Exception as e:
            # If PRAW fails, failover to public JSON scraping
            print(f"[Reddit Tool] PRAW failed: {e}. Falling back to public JSON search.")
            
    # Fallback: Query public Reddit search JSON API (requires no credentials)
    url = "https://www.reddit.com/search.json"
    headers = {"User-Agent": "ResearchMind/1.0 (contact@dhanushkumaramk.dev)"}
    params = {"q": query, "limit": 5, "type": "link"}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                return f"Error from Reddit Search: status {response.status_code}"
                
            data = response.json()
            children = data.get("data", {}).get("children", [])
            if not children:
                return f"No Reddit discussions found for query: '{query}'"
                
            results = []
            for child in children:
                post = child.get("data", {})
                title = post.get("title")
                subreddit = post.get("subreddit")
                score = post.get("score", 0)
                permalink = post.get("permalink")
                content = post.get("selftext", "")
                
                if len(content) > 500:
                    content = content[:500] + "..."
                    
                results.append(
                    f"Title: {title}\n"
                    f"Subreddit: r/{subreddit} | Score: {score}\n"
                    f"URL: https://www.reddit.com{permalink}\n"
                    f"Content: {content or '[Link post]'}\n"
                )
            return "\n---\n".join(results)
    except Exception as e:
        return f"Exception occurred during Reddit Search: {str(e)}"
