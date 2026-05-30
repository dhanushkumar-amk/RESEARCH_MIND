import logging
import asyncio
from langchain_core.documents import Document
from langchain_core.runnables import RunnableConfig
from app.agents.state import AgentState
from app.rag.chain import primary_llm
from app.tools.tool_registry import all_research_tools, get_tool_by_name

logger = logging.getLogger("researchmind")

# Bind tools to primary LLM to decide which tools to call
llm_with_tools = primary_llm.bind_tools(all_research_tools)

async def research_agent(state: AgentState, config: RunnableConfig) -> dict:
    """
    NODE 2: Research Agent
    Executes in parallel with Retrieval Agent. Utilizes an LLM to decide
    which of the 10 research tools to query, executes them, and updates web_results.
    """
    logger.info(f"[Research Agent] Analyzing query for external research: {state['question']}")
    
    # Extract queue from config parameters
    configurable = config.get("configurable", {})
    queue = configurable.get("queue")
    
    if queue:
        import json
        queue.put_nowait({
            "event": "agent_start",
            "data": json.dumps({"agent": "research", "status": "starting"})
        })
        
    try:
        # Prompt model to choose tools
        prompt = (
            f"You are the Research Agent. Analyze the user's query and call the most relevant search tool(s) "
            f"to gather background facts or current data.\n"
            f"User Query: {state['question']}"
        )
        
        response = await llm_with_tools.ainvoke(prompt, config=config)
        tool_calls = getattr(response, "tool_calls", [])
        
        if not tool_calls:
            logger.info("[Research Agent] No external tools selected by LLM.")
            if queue:
                queue.put_nowait({
                    "event": "agent_complete",
                    "data": json.dumps({"agent": "research", "status": "done", "results_count": 0})
                })
            return {"web_results": [], "error": ""}
            
        logger.info(f"[Research Agent] Selected tools: {[tc['name'] for tc in tool_calls]}")
        
        # Define helper to execute a single tool call asynchronously
        async def run_single_tool(tool_call) -> Document:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            logger.info(f"[Research Agent] Invoking tool '{tool_name}' with args {tool_args}")
            
            try:
                tool_instance = get_tool_by_name(tool_name)
                # Handle both async and sync tools
                if asyncio.iscoroutinefunction(tool_instance._run) or asyncio.iscoroutinefunction(tool_instance.ainvoke):
                    result = await tool_instance.ainvoke(tool_args)
                else:
                    result = await asyncio.to_thread(tool_instance.invoke, tool_args)
                
                # Retrieve source url if present in arguments or output
                source_url = tool_args.get("url", tool_args.get("query", ""))
                return Document(
                    page_content=str(result),
                    metadata={
                        "source": tool_name,
                        "filename": f"Web: {tool_name}",
                        "source_id": tool_name,
                        "url": source_url if source_url.startswith("http") else "",
                        "relevance_score": 0.0,
                        "page_number": 1
                    }
                )
            except Exception as tool_err:
                logger.error(f"[Research Agent] Tool '{tool_name}' failed: {tool_err}")
                return Document(
                    page_content=f"Tool '{tool_name}' failed to run: {tool_err}",
                    metadata={"source": tool_name, "filename": f"Error: {tool_name}", "source_id": tool_name, "page_number": 1}
                )

        # Run all tool queries in parallel
        tasks = [run_single_tool(tc) for tc in tool_calls]
        web_docs = await asyncio.gather(*tasks)
        
        logger.info(f"[Research Agent] Completed {len(web_docs)} tool queries.")
        
        if queue:
            queue.put_nowait({
                "event": "agent_complete",
                "data": json.dumps({"agent": "research", "status": "done", "results_count": len(web_docs)})
            })
            
        return {
            "web_results": web_docs,
            "error": ""
        }
        
    except Exception as e:
        logger.error(f"[Research Agent] Error during tool invocation: {e}", exc_info=True)
        return {
            "error": f"Research Agent failed: {str(e)}"
        }
