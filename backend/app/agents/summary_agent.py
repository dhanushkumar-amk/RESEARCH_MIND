import logging
import time
import json
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Any
from pydantic import BaseModel, Field
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage
from langsmith import Client

from app.agents.state import AgentState
from app.core.config import settings
from app.core.database import get_database
from app.rag.chain import resilient_llm, prompt_template
from app.rag.context import format_chunks_with_lost_in_the_middle
from app.rag.memory import get_session_history_and_summary
from app.context.assembler import ContextAssembler
from app.context.entity_memory import EntityMemory
from app.security.guard_pipeline import execute_output_guards

logger = logging.getLogger("researchmind")

# Initialize LangSmith client
ls_client = None
if settings.langchain_api_key:
    try:
        ls_client = Client(api_url="https://api.smith.langchain.com", api_key=settings.langchain_api_key)
    except Exception as ls_init_err:
        logger.warning(f"[Summary Agent] Failed to initialize LangSmith client: {ls_init_err}")

class ResearchReportSchema(BaseModel):
    executive_summary: str = Field(..., description="High-level summary of the findings.")
    key_findings: List[str] = Field(..., description="Main bullet points of key findings.")
    sources: List[Dict[str, Any]] = Field(..., description="List of cited source dicts containing title and url.")
    related_topics: List[str] = Field(..., description="List of related areas for further research.")
    confidence_score: float = Field(..., description="Estimated confidence score between 0.0 and 1.0.")

async def summary_agent(state: AgentState, config: RunnableConfig) -> dict:
    """
    NODE 4: Summary Agent
    Builds final context, runs LLM answer generation with fallback,
    streams tokens, and generates a structured research report.
    """
    logger.info("[Summary Agent] Synthesizing research results...")
    
    # Expose inputs to config
    configurable = config.get("configurable", {})
    user_id = configurable.get("user_id")
    session_id = state.get("session_id", "default")
    queue = configurable.get("queue")
    
    if queue:
        queue.put_nowait({
            "event": "agent_start",
            "data": json.dumps({"agent": "summary", "status": "starting"})
        })

    # Assemble dynamic context using ContextAssembler
    assembler = ContextAssembler()
    assembly_start = time.time()
    assembled = await assembler.assemble_context(
        question=state["question"],
        session_id=session_id,
        chunks=state.get("reranked_chunks", []),
        user_id=user_id
    )
    assembly_latency_ms = int((time.time() - assembly_start) * 1000)

    # Format prompt value using assembled components
    prompt_value = f"{assembled.system_prompt}\n\n"
    if assembled.history:
        prompt_value += "Conversation History:\n"
        for m in assembled.history:
            role_label = "Human" if m["role"] == "human" else ("System" if m["role"] == "system" else "Assistant")
            prompt_value += f"{role_label}: {m['content']}\n"
        prompt_value += "\n"
    
    prompt_value += f"Retrieved Context:\n{assembled.context}\n\n"
    prompt_value += f"Question: {assembled.query}"

    # Log token breakdown metrics to LangSmith
    if ls_client:
        try:
            db = get_database()
            entity_mem = EntityMemory()
            
            # Check if summary was triggered/exists
            sw_record = await db.sliding_window_memory.find_one({"session_id": session_id})
            summary_exists = bool(sw_record.get("summary")) if sw_record else False
            
            # Extract entities count
            entities = await entity_mem.get_entities(session_id)
            entities_count = len(entities)
            
            # Check if window has slid
            total_history_count = await db.chat_history.count_documents({"session_id": session_id})
            window_slid = total_history_count > 10

            tags = ["context.token_budget"]
            if summary_exists:
                tags.append("context.summary_triggered")
            if entities_count > 0:
                tags.append("context.entities_extracted")
            if window_slid:
                tags.append("context.window_slid")

            now = datetime.now(timezone.utc)
            await asyncio.to_thread(
                ls_client.create_run,
                name="Context Assembly Pipeline",
                run_type="chain",
                inputs={"question": state["question"], "session_id": session_id},
                outputs={
                    "token_breakdown": assembled.token_breakdown.model_dump(),
                    "summary_triggered": summary_exists,
                    "entities_extracted_count": entities_count,
                    "window_slid": window_slid,
                    "context_assembly_latency_ms": assembly_latency_ms
                },
                tags=tags,
                project_name=settings.langchain_project or "researchmind",
                start_time=now,
                end_time=now
            )
        except Exception as ls_err:
            logger.debug(f"[Summary Agent] LangSmith metrics logging failed: {ls_err}")

    context_str = assembled.context
    
    # Construct included_sources from matching reranked chunks in assembled context
    included_sources = []
    for chunk in state.get("reranked_chunks", []):
        if chunk.page_content in context_str:
            included_sources.append({
                "title": chunk.metadata.get("filename") or chunk.metadata.get("title") or chunk.metadata.get("source") or "Unknown Source",
                "score": chunk.metadata.get("relevance_score") or chunk.metadata.get("score") or 0.0
            })
            
    # Emit sources event if queue is present
    if queue:
        # Format sources to fit: {"title": "", "url": "", "score": 0}
        sources_payload = []
        for src in included_sources:
            # Match metadata of the original reranked chunks to find URL
            matched_url = ""
            for chunk in state.get("reranked_chunks", []):
                if chunk.metadata.get("filename") == src["title"]:
                    matched_url = chunk.metadata.get("url", "")
                    break
            sources_payload.append({
                "title": src["title"],
                "url": matched_url,
                "score": src["score"]
            })
            
        queue.put_nowait({
            "event": "sources",
            "data": json.dumps({"sources": sources_payload})
        })
        
    start_time = time.time()
    full_answer = ""
    model_used = "groq/llama-3.3-70b-versatile" # default fallback start
    
    # 4. Invoke LLM and stream tokens (with up to 1 retry if output guards fail)
    ip_address = configurable.get("ip_address", "127.0.0.1")
    attempt = 0
    max_attempts = 2
    current_prompt = prompt_value
    
    while attempt < max_attempts:
        full_answer = ""
        try:
            if queue:
                # If this is a retry, emit a security_retry event to notify client
                if attempt > 0:
                    queue.put_nowait({
                        "event": "security_retry",
                        "data": json.dumps({"attempt": attempt, "message": "Re-generating response due to security/quality check."})
                    })
                
                # Stream tokens via astream
                async for chunk in resilient_llm.astream(current_prompt, config=config):
                    # Update model used from chunk metadata if available
                    if chunk.response_metadata and "model_info" in chunk.response_metadata:
                        model_used = chunk.response_metadata["model_info"].get("name", model_used)
                    
                    token = chunk.content
                    full_answer += token
                    queue.put_nowait({
                        "event": "token",
                        "data": json.dumps({"token": token})
                    })
            else:
                response = await resilient_llm.ainvoke(current_prompt, config=config)
                full_answer = response.content
                if response.response_metadata and "model_info" in response.response_metadata:
                    model_used = response.response_metadata["model_info"].get("name", model_used)
        except Exception as e:
            logger.error(f"[Summary Agent] LLM invocation failed on attempt {attempt}: {e}", exc_info=True)
            if attempt == max_attempts - 1:
                if queue:
                    queue.put_nowait({
                        "event": "error",
                        "data": json.dumps({"message": f"Summary generation failed: {str(e)}"})
                    })
                return {"error": str(e)}
            attempt += 1
            continue

        # Execute output guards
        cleaned_answer, blocked, violation_type, reason = await execute_output_guards(
            response=full_answer,
            context=context_str,
            session_id=session_id,
            user_id=user_id,
            ip_address=ip_address
        )
        
        if not blocked:
            from app.evaluation.ragas_evaluator import RAGASEvaluator
            evaluator = RAGASEvaluator()
            try:
                eval_res = await evaluator.evaluate_response(
                    question=state["question"],
                    answer=cleaned_answer,
                    contexts=[c.page_content for c in state.get("reranked_chunks", [])],
                    session_id=session_id,
                    model_used=model_used
                )
                
                # Check for answer relevance threshold: regenerate if below 0.50 (once)
                if eval_res.needs_regeneration and attempt < max_attempts - 1:
                    logger.warning(f"[Summary Agent] Answer relevance {eval_res.answer_relevance:.2f} is below threshold 0.50. Triggering regeneration...")
                    current_prompt = (
                        f"{prompt_value}\n\n"
                        f"[System Warning: Your previous response did not directly address the user's question. "
                        f"Please generate a new response that is highly relevant, detailed, and directly answers: '{state['question']}']"
                    )
                    attempt += 1
                    continue
                
                # If faithfulness below 0.6: Add disclaimer to response
                if eval_res.needs_disclaimer:
                    logger.warning(f"[Summary Agent] Faithfulness {eval_res.faithfulness:.2f} is below threshold 0.60. Appending disclaimer.")
                    disclaimer = "\n\n*Disclaimer: This response has been flagged with potential grounding risks and may contain minor factual inaccuracies or hallucinated content. Please verify critical facts.*"
                    cleaned_answer += disclaimer
                
            except Exception as e:
                logger.error(f"[Summary Agent] RAGAS evaluation failed inside summary agent: {e}", exc_info=True)

            full_answer = cleaned_answer
            break
        else:
            logger.warning(f"[Summary Agent] Output guard check failed on attempt {attempt + 1}: {reason}")
            if attempt < max_attempts - 1:
                # Modify prompt for the single retry attempt
                current_prompt = (
                    f"{prompt_value}\n\n"
                    f"[System Security Warning: Your previous response was rejected due to {violation_type} ({reason}). "
                    f"Please generate a new response that is fully grounded in the context, contains no PII, "
                    f"is safe and non-toxic, and is between 50 and 3000 characters long.]"
                )
                attempt += 1
            else:
                # Second attempt failed as well, block and return fallback response
                full_answer = "Security Block: The generated response did not meet our quality or safety standards."
                break

    latency_ms = int((time.time() - start_time) * 1000)
    
    # 5. Generate structured research report
    logger.info("[Summary Agent] Generating structured research report...")
    report_prompt = (
        f"You are the Summary Agent. Based on the user query, context, and generated answer, "
        f"synthesize a structured research report matching this JSON schema:\n"
        f"JSON Schema:\n"
        f"{ResearchReportSchema.model_json_schema()}\n\n"
        f"User Query: {state['question']}\n"
        f"Context:\n{context_str}\n\n"
        f"Answer:\n{full_answer}\n\n"
        f"Return ONLY valid JSON content matching the schema. Do not enclose it in markdown blocks."
    )
    
    report_data = {
        "executive_summary": "Failed to compile report.",
        "key_findings": [],
        "sources": [],
        "related_topics": [],
        "confidence_score": 0.0
    }
    
    try:
        # Use primary model to fetch structured JSON
        report_response = await resilient_llm.ainvoke(report_prompt, config=config)
        content = report_response.content.strip()
        # Clean any markdown json wrapper
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        report_data = json.loads(content.strip())
        
        # Emit report to queue
        if queue:
            queue.put_nowait({
                "event": "report",
                "data": json.dumps(report_data)
            })
    except Exception as report_err:
        logger.error(f"[Summary Agent] Structured report generation failed: {report_err}")
        # Build basic report fallback
        report_data["executive_summary"] = full_answer[:200] + "..."
        report_data["key_findings"] = [full_answer[:100]]
        
    # Calculate token count approximately
    from app.rag.memory import count_tokens
    total_tokens = count_tokens(prompt_value) + count_tokens(full_answer)
    
    # Emit final metadata
    if queue:
        queue.put_nowait({
            "event": "metadata",
            "data": json.dumps({
                "model_used": model_used,
                "tokens_used": total_tokens,
                "latency_ms": latency_ms,
                "quality_score": state.get("quality_score", 0.0),
                "retry_count": state.get("retry_count", 0)
            })
        })
        
    if queue:
        queue.put_nowait({
            "event": "agent_complete",
            "data": json.dumps({"agent": "summary", "status": "done"})
        })
        
    return {
        "answer": full_answer,
        "sources": report_data.get("sources", []),
        "report": report_data,
        "token_count": total_tokens,
        "latency_ms": latency_ms,
        "model_used": model_used,
        "final_context": context_str
    }
