import asyncio
import logging
import sys

# Configure logging to see tool startup and execution traces
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

sys.path.append(".")

from app.core.database import connect_to_mongo, close_mongo_connection
from app.tools.tool_registry import run_tool_registry_health_checks
from app.agents.research_agent import research_agent

async def test_mcp_integration():
    print("=" * 60)
    print("STARTING MCP TOOLS VERIFICATION SUITE")
    print("=" * 60)
    
    # 1. Run Registry Health Checks
    print("\n--- 1. Running Tool Registry Health Checks ---")
    health_status = await run_tool_registry_health_checks()
    print(f"Health Check Summary: {health_status}")

    # 2. Test Research Agent with a Technical query
    print("\n--- 2. Querying Research Agent (Technical Query) ---")
    # Initialize MongoDB connection to prevent DB errors during test
    try:
        await connect_to_mongo()
    except Exception as db_err:
        print(f"MongoDB connection failed (test continuing): {db_err}")
        
    state = {
        "question": "What is the latest status of solid-state batteries on GitHub?",
        "session_id": "test_session_tools",
        "source_ids": [],
        "web_results": []
    }
    
    config = {
        "configurable": {
            "thread_id": "test_session_tools",
            "user_id": "test_user_tools"
        }
    }
    
    try:
        result = await research_agent(state, config)
        print("\nResearch Agent Run Completed Successfully!")
        print(f"Error status: '{result.get('error')}'")
        web_results = result.get("web_results", [])
        print(f"Retrieved unique documents count: {len(web_results)}")
        
        for idx, doc in enumerate(web_results[:3]):
            print(f"\nDocument {idx+1}:")
            print(f"  Source: {doc.metadata.get('source')}")
            print(f"  Title:  {doc.metadata.get('title')}")
            print(f"  URL:    {doc.metadata.get('url')}")
            print(f"  Snippet: {doc.page_content[:150]}...")
    except Exception as e:
        print(f"Research Agent run failed: {e}")
        
    # Clean up MongoDB connection
    try:
        await close_mongo_connection()
    except Exception:
        pass
        
    print("\n" + "=" * 60)
    print("MCP TOOLS VERIFICATION SUITE COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_mcp_integration())
