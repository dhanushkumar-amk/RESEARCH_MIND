import logging
import asyncio
import re
from langchain_core.documents import Document
from langchain_core.runnables import RunnableConfig
from app.agents.state import AgentState
from app.rag.chain import primary_llm

logger = logging.getLogger("researchmind")

async def critic_agent(state: AgentState, config: RunnableConfig) -> dict:
    """
    NODE 3: Critic Agent
    Receives retrieved_chunks + web_results, scores each from 0-10,
    filters scores < 5, and determines if a retry is needed.
    """
    # Extract queue from config parameters
    configurable = config.get("configurable", {})
    queue = configurable.get("queue")
    
    if queue:
        import json
        queue.put_nowait({
            "event": "agent_start",
            "data": json.dumps({"agent": "critic", "status": "starting"})
        })
        
    retrieved = state.get("retrieved_chunks") or []
    web = state.get("web_results") or []
    combined_docs = retrieved + web
    
    if not combined_docs:
        logger.warning("[Critic Agent] No documents to score.")
        if queue:
            queue.put_nowait({
                "event": "agent_complete",
                "data": json.dumps({"agent": "critic", "status": "done", "quality_score": 0.0})
            })
        return {
            "reranked_chunks": [],
            "quality_score": 0.0,
            "needs_retry": True if state.get("retry_count", 0) < 2 else False,
            "retry_count": state.get("retry_count", 0) + (1 if state.get("retry_count", 0) < 2 else 0),
            "error": ""
        }
        
    async def score_doc(doc: Document) -> tuple[Document, float]:
        prompt = (
            f"You are the Critic Agent. Score the quality and relevance of this text chunk to the user's question.\n"
            f"Question: {state['question']}\n\n"
            f"Text Chunk:\n{doc.page_content}\n\n"
            f"Provide a numerical score between 0 and 10, where:\n"
            f"- 10 is extremely relevant, factually rich, and reliable.\n"
            f"- 0 is completely irrelevant or noise.\n\n"
            f"Return ONLY the numerical score as an integer (e.g. 8). Do not write any other explanation."
        )
        
        try:
            response = await primary_llm.ainvoke(prompt, config=config)
            content = response.content.strip()
            # Extract number
            match = re.search(r'\b(10|[0-9])\b', content)
            if match:
                score = float(match.group(1))
            else:
                score = 5.0  # Fallback neutral score
        except Exception as e:
            logger.error(f"[Critic Agent] Error scoring document: {e}")
            score = 4.0  # Fail-low score
            
        doc.metadata["relevance_score"] = score
        return doc, score

    # Score all combined documents in parallel
    tasks = [score_doc(doc) for doc in combined_docs]
    scored_results = await asyncio.gather(*tasks)
    
    # Filter documents with score >= 5
    filtered_docs = [doc for doc, score in scored_results if score >= 5]
    
    # Sort descending by score
    filtered_docs.sort(key=lambda x: x.metadata.get("relevance_score", 0.0), reverse=True)
    
    # Take top 5 best documents
    top_docs = filtered_docs[:5]
    best_score = top_docs[0].metadata["relevance_score"] if top_docs else 0.0
    
    # Retry condition evaluation
    retry_count = state.get("retry_count", 0)
    needs_retry = False
    
    if best_score < 7.0 and retry_count < 2:
        needs_retry = True
        retry_count += 1
        logger.warning(f"[Critic Agent] Best context score is {best_score} (< 7.0). Triggering RETRY {retry_count}/2...")
    else:
        logger.info(f"[Critic Agent] Quality criteria met with best score: {best_score}. Proceeding to summary.")
        
    if queue:
        queue.put_nowait({
            "event": "agent_complete",
            "data": json.dumps({"agent": "critic", "status": "done", "quality_score": best_score})
        })
        
    return {
        "reranked_chunks": top_docs,
        "quality_score": best_score,
        "needs_retry": needs_retry,
        "retry_count": retry_count,
        "error": ""
    }
