import os
import time
import json
import asyncio
import logging
import tempfile
from typing import List, Dict, Any, Tuple
from datetime import datetime, timezone

import uuid
from app.core.config import settings
from app.core.database import get_database
from app.evaluation.ragas_evaluator import RAGASEvaluator
from app.mlflow.manager import BestConfigManager

async def register_config_model(
    config_type: str, 
    run_id: str, 
    config: Dict[str, Any], 
    scores: Dict[str, float]
) -> Dict[str, Any]:
    """Stub to replace MLflow Model Registry registration."""
    return {
        "model_name": f"researchmind-{config_type}-config",
        "registered": False,
        "version": None,
        "promoted_to_staging": False,
        "message": "Model Registry disabled (MLflow removed)."
    }

# Import RAG steps dynamically to allow running individual pipeline operations
from app.api.routes.chat import (
    search_vector_async,
    search_bm25_async,
    merge_hybrid_results,
    format_chunks_with_lost_in_the_middle,
    resilient_llm,
    prompt_template,
    get_compressor
)

# Import agent nodes
from app.agents.retrieval_agent import retrieval_agent
from app.agents.research_agent import research_agent
from app.agents.critic_agent import critic_agent
from app.agents.summary_agent import summary_agent
from app.agents.memory_agent import memory_agent

logger = logging.getLogger("researchmind")

SAMPLE_QUESTIONS: List[str] = [
    "What is machine learning?",
    "Explain transformer architecture",
    "Latest developments in LLMs",
    "How does RAG work?",
    "What is LangChain used for?",
    "Explain attention mechanism",
    "What is fine-tuning?",
    "How does vector search work?",
    "What is prompt engineering?",
    "Explain RLHF",
    "What is LangGraph?",
    "How do AI agents work?",
    "What is semantic search?",
    "Explain embeddings",
    "What is RAG evaluation?",
    "How does BM25 work?",
    "What is cross-encoder reranking?",
    "Explain hybrid search",
    "What is context engineering?",
    "How does MLflow work?"
]

class ExperimentRunner:
    @staticmethod
    async def run_rag_experiment(configs: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], float, List[Dict[str, Any]]]:
        """
        Run RAG experiments for a list of configs.
        Evaluates each configuration on 20 sample questions using RAGAS,
        logs runs to MLflow, registers configurations, and updates the best configuration in MongoDB.
        """
        logger.info(f"[ExperimentRunner] Starting RAG experiment for {len(configs)} configurations...")
        
        all_results = []
        best_config = {}
        best_score = -1.0
        
        # Load current best RAG config to compare against
        current_best = await BestConfigManager.get_best_config("rag")
        if current_best:
            best_config = current_best.get("config", {})
            best_score = current_best.get("composite_score", 0.0)
            
        evaluator = RAGASEvaluator()
        
        for idx, config in enumerate(configs):
            logger.info(f"[ExperimentRunner] Evaluating RAG config {idx + 1}/{len(configs)}: {config}")
            
            # Temporarily apply config parameters
            BestConfigManager._applied_rag.update(config)
            
            # Extract configuration parameters
            chunk_size = config.get("chunk_size", 512)
            chunk_overlap = config.get("chunk_overlap", 50)
            k_value = config.get("k_value", 10)
            reranker_top_n = config.get("reranker_top_n", 5)
            embedding_model = config.get("embedding_model", "all-MiniLM-L6-v2")
            reranker_model = config.get("reranker_model", "cross-encoder/ms-marco-MiniLM-L-6-v2")
            hybrid_vector_weight = config.get("hybrid_vector_weight", 0.6)
            hybrid_bm25_weight = config.get("hybrid_bm25_weight", 0.4)
            
            run_questions = []
            run_answers = []
            
            total_faithfulness = 0.0
            total_answer_relevance = 0.0
            total_context_relevance = 0.0
            total_composite = 0.0
            
            total_retrieval_latency = 0
            total_reranking_latency = 0
            total_latency = 0
            
            # Run the 20 questions
            for q_idx, question in enumerate(SAMPLE_QUESTIONS):
                start_total = time.time()
                
                # Step 1: Retrieval
                start_retrieval = time.time()
                vector_docs, bm25_docs = await asyncio.gather(
                    search_vector_async({"query": question, "user_id": "experiment_user", "source_ids": None}),
                    search_bm25_async({"query": question, "user_id": "experiment_user", "source_ids": None})
                )
                retrieval_latency = int((time.time() - start_retrieval) * 1000)
                total_retrieval_latency += retrieval_latency
                
                # Step 2: Merge hybrid results
                fused_docs = merge_hybrid_results(vector_docs, bm25_docs, limit=k_value)
                
                # Step 3: Rerank results
                start_reranking = time.time()
                comp = get_compressor()
                if comp and fused_docs:
                    reranked_docs = await asyncio.to_thread(
                        comp.compress_documents, fused_docs, question
                    )
                else:
                    reranked_docs = fused_docs[:reranker_top_n]
                reranking_latency = int((time.time() - start_reranking) * 1000)
                total_reranking_latency += reranking_latency
                
                # Step 4: Formatting context
                context_str, included_sources = format_chunks_with_lost_in_the_middle(
                    reranked_docs, max_tokens=3200
                )
                
                # Step 5: Generating answer
                prompt = prompt_template.format(context=context_str, history="", query=question)
                res = await resilient_llm.ainvoke(prompt)
                answer = res.content
                
                latency = int((time.time() - start_total) * 1000)
                total_latency += latency
                
                # Step 6: Evaluate with RAGAS
                contexts = [doc.page_content for doc in reranked_docs]
                eval_res = await evaluator.evaluate_response(
                    question=question,
                    answer=answer,
                    contexts=contexts,
                    session_id=f"exp_rag_run_{idx}_{q_idx}",
                    ground_truth=None
                )
                
                total_faithfulness += eval_res.faithfulness
                total_answer_relevance += eval_res.answer_relevance
                total_context_relevance += eval_res.context_relevance
                total_composite += eval_res.composite_score
                
                run_questions.append(question)
                run_answers.append(answer)
                
            # Aggregate run metrics
            num_questions = len(SAMPLE_QUESTIONS)
            avg_faithfulness = total_faithfulness / num_questions
            avg_answer_relevance = total_answer_relevance / num_questions
            avg_context_relevance = total_context_relevance / num_questions
            avg_composite = total_composite / num_questions
            
            avg_retrieval_latency_ms = int(total_retrieval_latency / num_questions)
            avg_reranking_latency_ms = int(total_reranking_latency / num_questions)
            avg_total_latency_ms = int(total_latency / num_questions)
            cache_hit_rate = 0.0  # Mock cache hit rate for experiment runs
            
            metrics = {
                "faithfulness": avg_faithfulness,
                "answer_relevance": avg_answer_relevance,
                "context_relevance": avg_context_relevance,
                "composite_score": avg_composite,
                "avg_retrieval_latency_ms": avg_retrieval_latency_ms,
                "avg_reranking_latency_ms": avg_reranking_latency_ms,
                "avg_total_latency_ms": avg_total_latency_ms,
                "cache_hit_rate": cache_hit_rate
            }
            
            # Log to MLflow
            run_id = await asyncio.to_thread(
                ExperimentRunner._log_rag_run_to_mlflow, 
                config, 
                metrics, 
                run_questions, 
                run_answers
            )
            
            # Register in Model Registry and handle promotion checks
            registry_res = await register_config_model("rag", run_id, config, metrics)
            
            result_entry = {
                "config": config,
                "metrics": metrics,
                "mlflow_run_id": run_id,
                "registry_result": registry_res
            }
            all_results.append(result_entry)
            
            # Update best config if this one beats it
            if avg_composite > best_score:
                best_score = avg_composite
                best_config = config
                await BestConfigManager.update_best_config("rag", config, metrics, run_id)
                logger.info(f"[ExperimentRunner] New best RAG config found! Composite score: {best_score:.4f}")
                
        # Restore active configuration
        if current_best:
            BestConfigManager._applied_rag.update(current_best.get("config", {}))
            
        return best_config, best_score, all_results

    @staticmethod
    def _log_rag_run_to_mlflow(
        config: Dict[str, Any], 
        metrics: Dict[str, Any], 
        questions: List[str], 
        answers: List[str]
    ) -> str:
        """Mock helper replacing MLflow logging."""
        return f"run_{uuid.uuid4().hex[:12]}"

    @staticmethod
    async def run_agent_experiment(configs: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], float, List[Dict[str, Any]]]:
        """
        Run Agent experiments for a list of configs.
        Evaluates each configuration on 20 sample questions,
        logs runs to MLflow, registers configurations, and updates the best configuration in MongoDB.
        """
        logger.info(f"[ExperimentRunner] Starting Agent experiment for {len(configs)} configurations...")
        
        all_results = []
        best_config = {}
        best_score = -1.0
        
        # Load current best Agent config to compare against
        current_best = await BestConfigManager.get_best_config("agent")
        if current_best:
            best_config = current_best.get("config", {})
            best_score = current_best.get("composite_score", 0.0)
            
        evaluator = RAGASEvaluator()
        
        for idx, config in enumerate(configs):
            logger.info(f"[ExperimentRunner] Evaluating Agent config {idx + 1}/{len(configs)}: {config}")
            
            # Temporarily apply config parameters
            BestConfigManager._applied_agent.update(config)
            
            # Extract configuration parameters
            primary_model = config.get("primary_model", "groq/llama-3.3-70b-versatile")
            fallback_models = config.get("fallback_models", [])
            temperature = config.get("temperature", 0.1)
            max_tokens = config.get("max_tokens", 1000)
            tools_used = config.get("tools_used", [])
            retry_count_limit = config.get("retry_count", 2)
            
            run_questions = []
            run_states = []
            run_tool_results = []
            run_final_reports = []
            
            total_faithfulness = 0.0
            total_answer_relevance = 0.0
            total_composite = 0.0
            total_quality = 0.0
            
            sum_total_latency = 0
            sum_retrieval_latency = 0
            sum_research_latency = 0
            sum_critic_latency = 0
            sum_summary_latency = 0
            sum_memory_latency = 0
            
            sum_tokens_used = 0
            fallback_triggered_count = 0
            total_fallback_runs_count = 0
            
            for q_idx, question in enumerate(SAMPLE_QUESTIONS):
                start_agent_total = time.time()
                
                # Mock graph state
                state = {
                    "question": question,
                    "session_id": f"exp_agent_run_{idx}_{q_idx}",
                    "source_ids": [],
                    "retrieved_chunks": [],
                    "web_results": [],
                    "reranked_chunks": [],
                    "final_context": "",
                    "answer": "",
                    "sources": [],
                    "quality_score": 0.0,
                    "needs_retry": False,
                    "retry_count": 0,
                    "conversation_history": [],
                    "model_used": primary_model,
                    "token_count": 0,
                    "latency_ms": 0,
                    "error": "",
                    "report": {}
                }
                
                run_config = {"configurable": {"user_id": "experiment_user"}}
                
                # Node 1: Retrieval Agent
                start_node = time.time()
                retrieval_res = await retrieval_agent(state, run_config)
                retrieval_latency = int((time.time() - start_node) * 1000)
                sum_retrieval_latency += retrieval_latency
                state.update(retrieval_res)
                
                # Node 2: Research Agent
                start_node = time.time()
                research_res = await research_agent(state, run_config)
                research_latency = int((time.time() - start_node) * 1000)
                sum_research_latency += research_latency
                state.update(research_res)
                
                # Node 3: Critic Agent
                start_node = time.time()
                critic_res = await critic_agent(state, run_config)
                critic_latency = int((time.time() - start_node) * 1000)
                sum_critic_latency += critic_latency
                state.update(critic_res)
                
                # Node 4: Summary Agent
                start_node = time.time()
                summary_res = await summary_agent(state, run_config)
                summary_latency = int((time.time() - start_node) * 1000)
                sum_summary_latency += summary_latency
                state.update(summary_res)
                
                # Node 5: Memory Agent
                start_node = time.time()
                memory_res = await memory_agent(state, run_config)
                memory_latency = int((time.time() - start_node) * 1000)
                sum_memory_latency += memory_latency
                state.update(memory_res)
                
                agent_latency = int((time.time() - start_agent_total) * 1000)
                sum_total_latency += agent_latency
                
                # Evaluate final agent response
                answer = state.get("answer", "")
                report_content = state.get("report", {}).get("content", answer)
                contexts = [doc.page_content for doc in state.get("retrieved_chunks", [])] + \
                           [doc.page_content for doc in state.get("web_results", [])]
                
                eval_res = await evaluator.evaluate_response(
                    question=question,
                    answer=report_content,
                    contexts=contexts,
                    session_id=state["session_id"],
                    ground_truth=None
                )
                
                total_faithfulness += eval_res.faithfulness
                total_answer_relevance += eval_res.answer_relevance
                total_composite += eval_res.composite_score
                
                quality_score = state.get("quality_score", eval_res.composite_score)
                total_quality += quality_score
                
                # Token count logic
                tokens = state.get("token_count", 0)
                sum_tokens_used += tokens
                
                # Fallback tracking
                used_model = state.get("model_used", primary_model)
                if used_model != primary_model:
                    fallback_triggered_count += 1
                    total_fallback_runs_count += 1
                    
                # Collect files for artifacts
                run_questions.append(question)
                # Remove non-serializable objects from state before collection
                clean_state = {k: (str(v) if k in ["retrieved_chunks", "web_results", "reranked_chunks"] else v) for k, v in state.items()}
                run_states.append(clean_state)
                run_tool_results.append({
                    "question": question,
                    "web_results_count": len(state.get("web_results", [])),
                    "error": state.get("error", "")
                })
                run_final_reports.append(state.get("report", {}))
                
            # Aggregate run metrics
            num_questions = len(SAMPLE_QUESTIONS)
            avg_faithfulness = total_faithfulness / num_questions
            avg_answer_relevance = total_answer_relevance / num_questions
            avg_composite = total_composite / num_questions
            avg_quality = total_quality / num_questions
            
            metrics = {
                "faithfulness": avg_faithfulness,
                "answer_relevance": avg_answer_relevance,
                "composite_score": avg_composite,
                "quality_score": avg_quality,
                "total_latency_ms": int(sum_total_latency / num_questions),
                "retrieval_latency_ms": int(sum_retrieval_latency / num_questions),
                "research_latency_ms": int(sum_research_latency / num_questions),
                "critic_latency_ms": int(sum_critic_latency / num_questions),
                "summary_latency_ms": int(sum_summary_latency / num_questions),
                "memory_latency_ms": int(sum_memory_latency / num_questions),
                "total_tokens_used": int(sum_tokens_used / num_questions),
                "fallback_triggered": fallback_triggered_count > 0,
                "fallback_count": total_fallback_runs_count
            }
            
            # Log to MLflow
            run_id = await asyncio.to_thread(
                ExperimentRunner._log_agent_run_to_mlflow,
                config,
                metrics,
                run_states,
                run_tool_results,
                run_final_reports
            )
            
            # Register in Model Registry and handle promotion checks
            registry_res = await register_config_model("agent", run_id, config, metrics)
            
            result_entry = {
                "config": config,
                "metrics": metrics,
                "mlflow_run_id": run_id,
                "registry_result": registry_res
            }
            all_results.append(result_entry)
            
            # Update best config if this one beats it
            if avg_composite > best_score:
                best_score = avg_composite
                best_config = config
                await BestConfigManager.update_best_config("agent", config, metrics, run_id)
                logger.info(f"[ExperimentRunner] New best Agent config found! Composite score: {best_score:.4f}")
                
        # Restore active configuration
        if current_best:
            BestConfigManager._applied_agent.update(current_best.get("config", {}))
            
        return best_config, best_score, all_results

    @staticmethod
    def _log_agent_run_to_mlflow(
        config: Dict[str, Any],
        metrics: Dict[str, Any],
        states: List[Dict[str, Any]],
        tool_results: List[Dict[str, Any]],
        final_reports: List[Dict[str, Any]]
    ) -> str:
        """Mock helper replacing MLflow agent logging."""
        return f"run_{uuid.uuid4().hex[:12]}"
