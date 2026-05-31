import logging
import asyncio
import json
from langchain_core.documents import Document
from langchain_core.runnables import RunnableConfig

from app.agents.state import AgentState
from app.rag.chain import primary_llm
from app.evaluation.ragas_evaluator import RAGASEvaluator

logger = logging.getLogger("researchmind")

async def critic_agent(state: AgentState, config: RunnableConfig) -> dict:
    """
    NODE 3: Critic Agent
    Scores retrieved documents, filters low-quality chunks, and runs RAGAS evaluation
    on faithfulness + context_relevance to determine if a retry is needed.
    """
    configurable = config.get("configurable", {})
    queue = configurable.get("queue")
    session_id = state.get("session_id", "default")
    
    if queue:
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
            # Find any integer in response
            import re
            match = re.search(r'\b(10|[0-9])\b', content)
            score = float(match.group(1)) if match else 5.0
        except Exception as e:
            logger.error(f"[Critic Agent] Error scoring document: {e}")
            score = 4.0
            
        doc.metadata["relevance_score"] = score
        return doc, score

    # Score all combined documents in parallel
    tasks = [score_doc(doc) for doc in combined_docs]
    scored_results = await asyncio.gather(*tasks)
    
    # Filter documents with score >= 5
    filtered_docs = [doc for doc, score in scored_results if score >= 5]
    filtered_docs.sort(key=lambda x: x.metadata.get("relevance_score", 0.0), reverse=True)
    top_docs = filtered_docs[:5]

    # Generate a draft/candidate answer using the top documents context
    # to run RAGAS faithfulness and context relevance check.
    logger.info("[Critic Agent] Generating candidate draft answer for RAGAS evaluation...")
    draft_prompt = (
        f"Based on the following contexts, provide a concise, direct, and factual answer to the question.\n"
        f"Question: {state['question']}\n\n"
        f"Contexts:\n" + "\n\n".join([f"[Doc {i}]: {d.page_content}" for i, d in enumerate(top_docs)]) + "\n\n"
        f"Answer:"
    )
    
    candidate_answer = ""
    try:
        draft_response = await primary_llm.ainvoke(draft_prompt, config=config)
        candidate_answer = draft_response.content.strip()
    except Exception as e:
        logger.error(f"[Critic Agent] Failed to generate draft answer: {e}")
        candidate_answer = "Draft answer generation failed."

    # Run RAGAS evaluator on faithfulness and context relevance
    evaluator = RAGASEvaluator()
    contexts_list = [d.page_content for d in top_docs]
    
    try:
        eval_res = await evaluator.evaluate_response(
            question=state["question"],
            answer=candidate_answer,
            contexts=contexts_list,
            session_id=session_id,
            model_used=getattr(primary_llm, "model", "groq/llama-3.3-70b-versatile")
        )
        faithfulness = eval_res.faithfulness
        context_relevance = eval_res.context_relevance
        composite = (faithfulness + context_relevance) / 2
    except Exception as e:
        logger.error(f"[Critic Agent] RAGAS evaluation failed inside critic: {e}", exc_info=True)
        faithfulness = 0.0
        context_relevance = 0.0
        composite = 0.0

    # Route logic based on composite score
    retry_count = state.get("retry_count", 0)
    needs_retry = False
    
    if composite < 0.50 and retry_count < 2:
        needs_retry = True
        retry_count += 1
        logger.warning(f"[Critic Agent] RAGAS score {composite:.2f} is below 0.50. Triggering RETRY {retry_count}/2...")
    else:
        logger.info(f"[Critic Agent] RAGAS score {composite:.2f} meets routing requirements. Proceeding to Summary Agent.")
        
    if queue:
        queue.put_nowait({
            "event": "agent_complete",
            "data": json.dumps({"agent": "critic", "status": "done", "quality_score": composite})
        })
        
    return {
        "reranked_chunks": top_docs,
        "quality_score": composite,
        "needs_retry": needs_retry,
        "retry_count": retry_count
    }
