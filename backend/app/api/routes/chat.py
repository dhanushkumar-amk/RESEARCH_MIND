import os
import json
import time
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from bson import ObjectId
import litellm
from litellm import acompletion

from app.dependencies.auth import get_current_user
from app.services.embedding_service import EmbeddingService
from app.services.vector_service import VectorService
from app.core.database import get_database
from app.core.config import settings

router = APIRouter(prefix="", tags=["Chat"])
embedding_service = EmbeddingService()
vector_service = VectorService()

# Setup LangSmith callbacks if API key is present
if settings.langchain_api_key and settings.langchain_api_key != "your_langsmith_api_key_here":
    litellm.success_callback = ["langsmith"]

    # Fallback models in priority order
    FALLBACK_MODELS = [
        "groq/llama-3.3-70b-versatile",
        "openrouter/meta-llama/llama-3.3-70b-instruct:free",
        "openrouter/deepseek/deepseek-r1:free",
        "openrouter/nvidia/nemotron-3-super-120b:free",
        "openrouter/qwen/qwen3-coder:free",
        "openrouter/mistralai/mistral-7b-instruct:free",
        "openrouter/microsoft/phi-3-medium-128k-instruct:free",
        "openrouter/meta-llama/llama-3.1-8b-instruct:free",
        "openrouter/openai/gpt-oss-120b:free",
        "openrouter/deepseek/deepseek-v4-flash:free",
        "gemini/gemini-1.5-flash"
    ]

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = "default"

def reorder_context_chunks(chunks: list[dict]) -> list[dict]:
    """
    Reorders chunks to mitigate the 'lost in the middle' phenomenon.
    Places the most relevant chunks at the beginning, end, and middle.
    """
    n = len(chunks)
    if n <= 2:
        return chunks
    
    # Pre-defined mapping for n=3, 4, 5
    reorder_map = {
        3: [1, 0, 2],
        4: [1, 3, 0, 2],
        5: [1, 3, 0, 4, 2]
    }
    
    if n in reorder_map:
        return [chunks[i] for i in reorder_map[n]]
        
    return chunks

def build_context_with_budget(chunks: list[dict], max_tokens: int = 4000) -> tuple[str, list[dict]]:
    """
    Assembles context from chunks, enforcing a strict token budget using tiktoken.
    Returns the context string and the list of chunks actually included.
    """
    import tiktoken
    try:
        encoding = tiktoken.get_encoding("cl100k_base")
    except Exception:
        encoding = tiktoken.encoding_for_model("gpt-4")

    # First, reorder chunks to handle lost-in-the-middle
    ordered_chunks = reorder_context_chunks(chunks)

    included_chunks = []
    current_tokens = 0
    context_parts = []

    for chunk in ordered_chunks:
        filename = chunk.get("metadata", {}).get("filename", "Unknown")
        page_num = chunk.get("page_number", 1)
        formatted_chunk = f"[Source: {filename}, Page: {page_num}]\n{chunk['text']}\n\n"
        
        chunk_tokens = len(encoding.encode(formatted_chunk))
        if current_tokens + chunk_tokens <= max_tokens:
            context_parts.append(formatted_chunk)
            current_tokens += chunk_tokens
            included_chunks.append(chunk)
        else:
            break

    context_string = "".join(context_parts).strip()
    return context_string, included_chunks


async def execute_rag_pipeline(query_text: str, user_id: str) -> tuple[str, list[dict], list[float]]:
    """
    Helper function executing Steps 1 to 6 of the RAG pipeline.
    """
    # Step 1: Embed query
    query_vector = embedding_service.get_embedding(query_text)
    
    # Step 2: Vector search
    semantic_chunks = await vector_service.search_similar_chunks(
        query_embedding=query_vector,
        user_id=user_id,
        limit=20
    )
    
    # Step 3: BM25 search
    keyword_chunks = await vector_service.search_bm25_chunks(
        query_text=query_text,
        user_id=user_id,
        limit=20
    )
    
    # Step 4: Hybrid RRF merge
    hybrid_chunks = vector_service.reciprocal_rank_fusion(
        vector_results=semantic_chunks,
        bm25_results=keyword_chunks,
        limit=20
    )
    
    # Step 5: Cross-Encoder reranking
    reranked_chunks = embedding_service.rerank_chunks(
        query=query_text,
        chunks=hybrid_chunks,
        limit=5
    )
    
    # Step 6: Context building
    context, context_chunks = build_context_with_budget(reranked_chunks, max_tokens=4000)
    
    return context, context_chunks, query_vector


@router.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    query_text = request.query.strip()
    if not query_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query cannot be empty."
        )

    user_id = str(current_user["_id"])
    context, context_chunks, query_vector = await execute_rag_pipeline(query_text, user_id)
    
    return {
        "query": query_text,
        "vector_length": len(query_vector),
        "context_chunks_count": len(context_chunks),
        "context": context,
        "context_chunks": [
            {
                "text": chunk["text"],
                "rrf_score": chunk.get("rrf_score", 0.0),
                "rerank_score": chunk.get("rerank_score", 0.0),
                "page_number": chunk.get("page_number", 1),
                "filename": chunk.get("metadata", {}).get("filename", "Unknown")
            }
            for chunk in context_chunks
        ]
    }


@router.get("/chat/stream")
async def chat_stream(
    query: str,
    session_id: str = "default",
    current_user: dict = Depends(get_current_user)
):
    query_text = query.strip()
    if not query_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query cannot be empty."
        )

    user_id = str(current_user["_id"])

    async def event_generator():
        try:
            # 1. Run RAG Pipeline Steps 1 to 6
            context, context_chunks, _ = await execute_rag_pipeline(query_text, user_id)
            
            # 2. Build prompt messages (system, user, history)
            system_prompt = (
                "You are a helpful research assistant. Answer the user query using only the provided context. "
                "If the answer cannot be found in the context, say 'I cannot find the answer in the provided context.' "
                "Do not make up answers. Cite sources by using the format [Source: filename, Page: number]."
            )
            user_prompt = f"Context:\n{context}\n\nQuestion: {query_text}"
            
            messages = [
                {"role": "system", "content": system_prompt}
            ]
            
            # Load conversation history from database
            db = get_database()
            history_cursor = db.chat_history.find(
                {"user_id": user_id, "session_id": session_id}
            ).sort("created_at", 1).limit(10)
            history_docs = await history_cursor.to_list(length=10)
            
            for h in history_docs:
                messages.append({"role": h["role"], "content": h["content"]})
                
            messages.append({"role": "user", "content": user_prompt})

            # Save user message to history
            await db.chat_history.insert_one({
                "user_id": user_id,
                "session_id": session_id,
                "role": "user",
                "content": query_text,
                "created_at": datetime.now(timezone.utc)
            })

            success = False
            full_response = ""
            used_model = "Unknown"
            latency_ms = 0

            # Try models in fallback order
            for model in FALLBACK_MODELS:
                print(f"Attempting completion with model: {model}")
                start_time = time.time()
                try:
                    # Call LiteLLM async completion with stream=True
                    response_stream = await acompletion(
                        model=model,
                        messages=messages,
                        stream=True,
                        temperature=0.1,
                        max_tokens=1000,
                        timeout=10.0,
                        num_retries=2
                    )
                    
                    # Yield tokens in SSE format
                    async for chunk in response_stream:
                        choice = chunk.choices[0]
                        delta = choice.delta
                        token = delta.content or ""
                        if token:
                            full_response += token
                            yield f"data: {json.dumps({'token': token})}\n\n"
                    
                    latency_ms = int((time.time() - start_time) * 1000)
                    used_model = model
                    success = True
                    print(f"Success! Model {model} responded in {latency_ms}ms")
                    break
                    
                except Exception as e:
                    latency_ms = int((time.time() - start_time) * 1000)
                    print(f"Model {model} failed after {latency_ms}ms. Error: {e}. Trying fallback...")
                    continue
            
            if not success:
                error_response = "I encountered an issue processing your request across all available LLM models. Please check your configurations or try again later."
                yield f"data: {json.dumps({'token': error_response})}\n\n"
                full_response = error_response
                used_model = "None"
            
            # Save assistant message to history
            await db.chat_history.insert_one({
                "user_id": user_id,
                "session_id": session_id,
                "role": "assistant",
                "content": full_response,
                "created_at": datetime.now(timezone.utc)
            })

            # Yield final metadata with sources list
            sources_list = [
                {
                    "id": str(chunk.get("id", "")),
                    "name": chunk.get("metadata", {}).get("filename", "Unknown"),
                    "type": "PDF" if chunk.get("metadata", {}).get("filename", "").endswith(".pdf") else "URL",
                    "matchScore": f"{int((chunk.get('rrf_score', 0.0) * 1000)) / 10}%"
                }
                for chunk in context_chunks
            ]
            
            yield f"data: {json.dumps({'sources': sources_list, 'model': used_model, 'latency': latency_ms})}\n\n"
            yield "data: [DONE]\n\n"
            
        except Exception as outer_e:
            print(f"Error inside streaming generator: {outer_e}")
            yield f"data: {json.dumps({'error': str(outer_e)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
