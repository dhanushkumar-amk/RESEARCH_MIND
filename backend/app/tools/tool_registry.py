import logging
import asyncio
from typing import List, Dict
from langchain_core.tools import BaseTool

# Import all 10 tools
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

logger = logging.getLogger("researchmind.tools")

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

# Categorized tool mapping
CATEGORIZED_TOOLS: Dict[str, List[BaseTool]] = {
    "academic": [arxiv_search, pubmed_search],
    "web": [tavily_search, duckduckgo_search, news_search],
    "social": [hackernews_search, reddit_search],
    "tech": [github_search, youtube_transcript],
    "knowledge": [wikipedia_search]
}

def get_tool_by_name(name: str) -> BaseTool:
    """Helper to fetch a tool by its registered LangChain tool name."""
    for tool in all_research_tools:
        if tool.name == name:
            return tool
    raise ValueError(f"Tool '{name}' not found in registry.")

def get_tools_by_category(category: str) -> List[BaseTool]:
    """Helper to fetch tools belonging to a specific category."""
    return CATEGORIZED_TOOLS.get(category.lower(), [])

async def verify_tool_health(tool_instance: BaseTool) -> bool:
    """Performs a quick dry-run check on a tool to verify it works."""
    try:
        # Run a simple query query tailored for each tool
        name = tool_instance.name
        test_query = "test"
        if name == "youtube_transcript":
            test_query = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            
        # Invoke tool with test query (all tools are async and timeout-safeguarded)
        result = await tool_instance.ainvoke(test_query)
        # If we got a list and it ran without throwing exceptions, consider it healthy
        return isinstance(result, list)
    except Exception as e:
        logger.warning(f"[Registry] Health check failed for tool '{tool_instance.name}': {e}")
        return False

async def run_tool_registry_health_checks() -> Dict[str, bool]:
    """
    Runs a health verification across all 10 tools concurrently.
    Logs tool availability on startup.
    """
    logger.info("[Registry] Launching startup health checks for all 10 MCP tools...")
    
    tasks = {tool.name: verify_tool_health(tool) for tool in all_research_tools}
    results = await asyncio.gather(*tasks.values())
    
    health_status = dict(zip(tasks.keys(), results))
    
    for tool_name, is_healthy in health_status.items():
        status_msg = "HEALTHY" if is_healthy else "UNAVAILABLE/UNCONFIGURED"
        if is_healthy:
            logger.info(f"  - Tool '{tool_name}': {status_msg}")
        else:
            logger.warning(f"  - Tool '{tool_name}': {status_msg}")
            
    return health_status
