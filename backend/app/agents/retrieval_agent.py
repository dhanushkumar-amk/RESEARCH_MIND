import logging
import asyncio
from langchain_core.runnables import RunnableConfig
from app.agents.state import AgentState
from app.rag.chain import search_vector_async, search_bm25_async, merge_hybrid_results, get_rerank_compressor
from app.context.entity_memory import EntityMemory

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
    session_id = state.get("session_id", "default")
    queue = configurable.get("queue")
    
    if queue:
        import json
        queue.put_nowait({
            "event": "agent_start",
            "data": json.dumps({"agent": "retrieval", "status": "starting"})
        })
        
    if not user_id:
        return {"error": "Authentication user_id is missing in config."}
        
    # Enrich the query with relevant entity facts
    entity_mem = EntityMemory()
    enriched_query = await entity_mem.inject_entities(session_id, state["question"])
    logger.info(f"[Retrieval Agent] Original query: '{state['question']}' -> Enriched query: '{enriched_query}'")

    inputs = {
        "query": enriched_query,
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
            reranked_docs = await asyncio.to_thread(
                compressor.compress_documents, 
                fused_docs, 
                enriched_query
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
            "retrieved_chunks": reranked_docs
        }
        
    except Exception as e:
        logger.error(f"[Retrieval Agent] Error during retrieval: {e}", exc_info=True)
        return {
            "error": f"Retrieval Agent failed: {str(e)}"
        }


