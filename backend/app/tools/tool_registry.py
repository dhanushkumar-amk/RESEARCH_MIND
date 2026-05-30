from typing import List
from langchain_core.tools import BaseTool

# Import all tools
from app.tools.tavily_tool import tavily_search
from app.tools.wikipedia_tool import wikipedia_search
from app.tools.arxiv_tool import arxiv_search
from app.tools.pubmed_tool import pubmed_search
from app.tools.hackernews_tool import hackernews_search
from app.tools.duckduckgo_tool import duckduckgo_search
from app.tools.youtube_tool import youtube_transcript
from app.tools.reddit_tool import reddit_search
from app.tools.github_tool import github_search
from app.tools.news_tool import news_search

# Expose tools list
all_research_tools: List[BaseTool] = [
    tavily_search,
    wikipedia_search,
    arxiv_search,
    pubmed_search,
    hackernews_search,
    duckduckgo_search,
    youtube_transcript,
    reddit_search,
    github_search,
    news_search
]

# Expose a helper to fetch tool by name if needed
def get_tool_by_name(name: str) -> BaseTool:
    for tool in all_research_tools:
        if tool.name == name:
            return tool
    raise ValueError(f"Tool '{name}' not found in registry.")
