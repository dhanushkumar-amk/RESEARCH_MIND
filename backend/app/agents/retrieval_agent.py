import logging
from langchain_core.runnables import RunnableConfig
from app.agents.state import AgentState
from app.rag.chain import search_vector_async, search_bm25_async, merge_hybrid_results, get_rerank_compressor

logger = logging.getLogger("researchmind")

async def retrieval_agent(state: AgentState, config: RunnableConfig) -> dict:
    """
    NODE 1: Retrieval Agent
    Performs hybrid search (Vector + BM25) and reranking on internal documents.
    """
    logger.info(f"[Retrieval Agent] Starting retrieval for question: {state.get('question')}")
    
    # Extract user_id and queue from config parameters
    configurable = config.get("configurable", {})
    user_id = configurable.get("user_id")
    queue = configurable.get("queue")
    
    if queue:
        import json
        queue.put_nowait({
            "event": "agent_start",
            "data": json.dumps({"agent": "retrieval", "status": "starting"})
        })
        
    if not user_id:
        return {"error": "Authentication user_id is missing in config."}
        
    inputs = {
        "query": state["question"],
        "user_id": user_id,
        "source_ids": state.get("source_ids")
    }
    
    try:
        # Step 1: Run Vector and BM25 search in parallel
        vector_docs, bm25_docs = await asyncio.gather(
            search_vector_async(inputs),
            search_bm25_async(inputs)
        )
        
        # Step 2: Merge hybrid results (weights: 0.6 vector, 0.4 BM25)
        fused_docs = merge_hybrid_results(vector_docs, bm25_docs, limit=20)
        
        # Step 3: Rerank results down to top 5 using Cross-Encoder
        compressor = get_rerank_compressor()
        if compressor and fused_docs:
            import asyncio
            reranked_docs = await asyncio.to_thread(
                compressor.compress_documents, 
                fused_docs, 
                state["question"]
            )
        else:
            reranked_docs = fused_docs[:5]
            
        # Add score details to metadata
        for doc in reranked_docs:
            if hasattr(doc, "state") and "relevance_score" in doc.state:
                doc.metadata["relevance_score"] = float(doc.state["relevance_score"])
            elif hasattr(doc, "relevance_score"):
                doc.metadata["relevance_score"] = float(doc.relevance_score)
            elif "relevance_score" not in doc.metadata:
                doc.metadata["relevance_score"] = 0.0
                
        logger.info(f"[Retrieval Agent] Successfully retrieved {len(reranked_docs)} chunks.")
        
        if queue:
            queue.put_nowait({
                "event": "agent_complete",
                "data": json.dumps({"agent": "retrieval", "status": "done", "chunks": len(reranked_docs)})
            })
            
        # Return updated state
        return {
            "retrieved_chunks": reranked_docs,
            "error": ""
        }
        
    except Exception as e:
        logger.error(f"[Retrieval Agent] Error during retrieval: {e}", exc_info=True)
        return {
            "error": f"Retrieval Agent failed: {str(e)}"
        }

# Import asyncio here inside retrieval_agent for parallel queries
import asyncio
