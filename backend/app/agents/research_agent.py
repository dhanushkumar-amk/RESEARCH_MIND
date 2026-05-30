import logging
import asyncio
import time
import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from langchain_core.documents import Document
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from langsmith import Client

from app.agents.state import AgentState
from app.core.config import settings
from app.rag.chain import primary_llm
from app.tools.tool_registry import all_research_tools, get_tool_by_name

logger = logging.getLogger("researchmind")

# Bind all 10 MCP tools to primary LLM to decide tool calls
llm_with_tools = primary_llm.bind_tools(all_research_tools)

# Initialize LangSmith client
ls_client = None
if settings.langchain_api_key:
    try:
        ls_client = Client(api_url="https://api.smith.langchain.com", api_key=settings.langchain_api_key)
    except Exception as ls_init_err:
        logger.warning(f"[Research Agent] Failed to initialize LangSmith client: {ls_init_err}")

def pydantic_to_document(result: Any, tool_name: str) -> Document:
    """Helper to convert structured Pydantic tool search results into a unified LangChain Document."""
    cls_name = result.__class__.__name__
    
    page_content = ""
    url = ""
    title = ""
    metadata = {
        "source": tool_name,
        "filename": f"Web: {tool_name}",
        "source_id": tool_name,
        "page_number": 1,
        "relevance_score": 0.0
    }
    
    if cls_name == "TavilySearchResult":
        page_content = result.content
        url = result.url
        title = result.title
        metadata["relevance_score"] = result.score
    elif cls_name == "WikipediaSearchResult":
        page_content = result.summary
        url = result.url
        title = result.title
        metadata["categories"] = result.categories
    elif cls_name == "ArXivSearchResult":
        page_content = result.abstract
        url = result.url
        title = result.title
        metadata["authors"] = result.authors
        metadata["published_date"] = result.published_date
    elif cls_name == "PubMedSearchResult":
        page_content = result.abstract
        url = result.url
        title = result.title
        metadata["authors"] = result.authors
    elif cls_name == "HackerNewsSearchResult":
        page_content = f"Title: {result.title} | Points: {result.points} | Comments: {result.comments} | Date: {result.date}"
        url = result.url
        title = result.title
        metadata["points"] = result.points
        metadata["comments"] = result.comments
        metadata["date"] = result.date
    elif cls_name == "DuckDuckGoSearchResult":
        page_content = result.body
        url = result.url
        title = result.title
    elif cls_name == "YouTubeTranscriptResult":
        page_content = result.transcript
        url = result.url
        title = result.video_title
    elif cls_name == "RedditSearchResult":
        page_content = result.content
        url = result.url
        title = result.title
        metadata["subreddit"] = result.subreddit
        metadata["score"] = result.score
    elif cls_name == "GitHubSearchResult":
        page_content = f"Repo: {result.name} | Language: {result.language} | Stars: {result.stars} | Description: {result.description}"
        url = result.url
        title = result.name
        metadata["language"] = result.language
        metadata["stars"] = result.stars
    elif cls_name == "NewsSearchResult":
        page_content = result.description
        url = result.url
        title = result.title
        metadata["source_name"] = result.source
        metadata["date"] = result.date
    else:
        # Fallback for generic text
        page_content = str(result)
        
    metadata["url"] = url
    metadata["title"] = title
    
    return Document(page_content=page_content, metadata=metadata)

async def execute_tool_with_logging(tool_call: Dict[str, Any], config: RunnableConfig) -> List[Any]:
    """Executes a single tool call asynchronously with 5s timeout, retries, and LangSmith tracing."""
    tool_name = tool_call["name"]
    tool_args = tool_call["args"]
    query = tool_args.get("query", str(tool_args))
    
    logger.info(f"[Research Agent] Invoking tool '{tool_name}' with arguments: {tool_args}")
    start_time = time.time()
    results = []
    error = None
    
    try:
        tool_instance = get_tool_by_name(tool_name)
        # Invoke the async tool (which has its own 5s timeout & retry wrapper)
        results = await tool_instance.ainvoke(tool_args, config=config)
    except Exception as tool_err:
        error = str(tool_err)
        logger.error(f"[Research Agent] Tool execution '{tool_name}' failed: {tool_err}")
        
    latency_ms = int((time.time() - start_time) * 1000)
    logger.info(f"[Research Agent] Tool '{tool_name}' returned {len(results)} results in {latency_ms}ms.")
    
    # Tag mapping logic: e.g. "tavily_search" -> "tools.tavily", "youtube_transcript" -> "tools.youtube"
    tag_suffix = tool_name
    if tag_suffix.endswith("_search"):
        tag_suffix = tag_suffix[:-7]
    elif tag_suffix.endswith("_transcript"):
        tag_suffix = tag_suffix[:-11]
    tool_tag = f"tools.{tag_suffix}"
    
    # Programmatic LangSmith Tracing
    if ls_client:
        try:
            now = datetime.now(timezone.utc)
            await asyncio.to_thread(
                ls_client.create_run,
                name=f"Tool Call: {tool_name}",
                run_type="tool",
                inputs={"query": query, "args": tool_args},
                outputs={"results_count": len(results), "error": error, "latency_ms": latency_ms},
                tags=[tool_tag],
                project_name=settings.langchain_project or "researchmind",
                start_time=now,
                end_time=now
            )
        except Exception as ls_err:
            logger.debug(f"[Research Agent] LangSmith tool tracing error: {ls_err}")
            
    return results

async def research_agent(state: AgentState, config: RunnableConfig) -> dict:
    """
    NODE 2: Research Agent
    Executes in parallel with Retrieval Agent. Utilizes LLM tool binding
    to dynamically query specialized tools in up to 5 loop turns.
    """
    question = state["question"]
    logger.info(f"[Research Agent] Running External Tool Agent for query: {question}")
    
    configurable = config.get("configurable", {})
    queue = configurable.get("queue")
    
    if queue:
        queue.put_nowait({
            "event": "agent_start",
            "data": json.dumps({"agent": "research", "status": "starting"})
        })
        
    # Heuristics guidelines to prompt the tool selector
    system_prompt = (
        "You are the Research Agent. Your goal is to select and query the most relevant search tool(s) "
        "to gather background facts or current data to answer the user's question.\n"
        "You have access to 10 specialized search tools. Follow this strategy when selecting tools:\n"
        "  - Technical/programming questions: Query 'github_search', 'hackernews_search', or 'arxiv_search'.\n"
        "  - Medical or health-science questions: Query 'pubmed_search' or 'news_search'.\n"
        "  - Current events/news: Query 'tavily_search', 'news_search', or 'duckduckgo_search'.\n"
        "  - Historical definitions or background: Query 'wikipedia_search'.\n"
        "  - Video content queries: Query 'youtube_transcript'.\n"
        "  - General facts: Query 'tavily_search', 'duckduckgo_search', or 'wikipedia_search'.\n\n"
        "Please select 3 to 5 most relevant tools in parallel. If the query requires cross-referencing, "
        "feel free to query multiple tools. If you receive responses from tools and they are incomplete, "
        "you can continue querying other tools in the next iteration. Stop when you have sufficient information."
    )
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=question)
    ]
    
    all_retrieved_results = []
    max_iterations = 5
    
    for iteration in range(max_iterations):
        logger.info(f"[Research Agent] Loop Turn {iteration + 1}/{max_iterations}")
        
        try:
            # Decide on tool calls
            response = await llm_with_tools.ainvoke(messages, config=config)
            messages.append(response)
            
            tool_calls = getattr(response, "tool_calls", [])
            if not tool_calls:
                logger.info(f"[Research Agent] Loop terminated: LLM made no further tool calls.")
                break
                
            # Keep LLM tool calling size capped at 3-5
            selected_calls = tool_calls[:5]
            logger.info(f"[Research Agent] LLM selected tool calls: {[tc['name'] for tc in selected_calls]}")
            
            # Execute selected tools in parallel
            tasks = [execute_tool_with_logging(tc, config) for tc in selected_calls]
            batch_results = await asyncio.gather(*tasks)
            
            # Feed observations back to the LLM
            for tc, tool_output_list in zip(selected_calls, batch_results):
                # Serialize outputs as a list of dicts for tool message history
                dict_outputs = [item.model_dump() if hasattr(item, "model_dump") else str(item) for item in tool_output_list]
                messages.append(
                    ToolMessage(
                        content=json.dumps(dict_outputs),
                        tool_call_id=tc["id"]
                    )
                )
                # Accumulate the raw results
                for item in tool_output_list:
                    all_retrieved_results.append((item, tc["name"]))
                    
        except Exception as turn_err:
            logger.error(f"[Research Agent] Error during loop turn {iteration + 1}: {turn_err}", exc_info=True)
            break
            
    # Process and format accumulated results
    logger.info(f"[Research Agent] Processing {len(all_retrieved_results)} accumulated results.")
    
    final_documents = []
    seen_urls = set()
    
    # 1. Convert to Documents and Deduplicate by URL
    for item, tool_name in all_retrieved_results:
        doc = pydantic_to_document(item, tool_name)
        url = doc.metadata.get("url", "").strip()
        
        if url:
            if url in seen_urls:
                continue
            seen_urls.add(url)
            
        final_documents.append(doc)
        
    # 2. Sort by relevance score (e.g. Tavily result score, descending)
    final_documents.sort(key=lambda d: d.metadata.get("relevance_score", 0.0), reverse=True)
    
    # 3. Limit to top 10 combined results
    top_results = final_documents[:10]
    logger.info(f"[Research Agent] Final count after deduplication & truncation: {len(top_results)} unique documents.")
    
    if queue:
        queue.put_nowait({
            "event": "agent_complete",
            "data": json.dumps({"agent": "research", "status": "done", "results_count": len(top_results)})
        })
        
    return {
        "web_results": top_results,
        "error": ""
    }
