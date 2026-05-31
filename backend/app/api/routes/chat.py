import os
import json
import time
import asyncio
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from bson import ObjectId
import tiktoken

# LangChain Imports
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableParallel, RunnableLambda
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.retrievers import BaseRetriever

from app.dependencies.auth import get_current_user
from app.core.database import get_database
from app.core.config import settings

router = APIRouter(prefix="", tags=["Chat"])

# -------------------------------------------------------------
# 1. LAZY INITIALIZATION OF EMBEDDINGS, VECTOR STORE & RERANKER
# -------------------------------------------------------------
_embeddings = None
_vector_store = None
_compressor = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        print("[RAG Pipeline] Lazily loading HuggingFaceEmbeddings...")
        from langchain_huggingface import HuggingFaceEmbeddings
        # Temporarily clear HF_TOKEN during init to prevent expired token exceptions on public models
        hf_token = os.environ.pop("HF_TOKEN", None)
        try:
            _embeddings = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2",
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True}
            )
        except Exception as e:
            print(f"[RAG Pipeline] Error loading Embeddings model: {e}")
            _embeddings = None
        finally:
            if hf_token:
                os.environ["HF_TOKEN"] = hf_token
    return _embeddings

def get_vector_store():
    global _vector_store
    if _vector_store is None:
        print("[RAG Pipeline] Lazily initializing MongoDBAtlasVectorSearch...")
        emb = get_embeddings()
        from pymongo import MongoClient
        sync_client = MongoClient(settings.mongodb_uri)
        sync_db = sync_client[settings.resolved_mongodb_database]
        sync_collection = sync_db["chunks"]
        _vector_store = MongoDBAtlasVectorSearch(
            collection=sync_collection,
            embedding=emb,
            index_name="vector_index",
            text_key="text",
            embedding_key="embedding"
        )
    return _vector_store

def get_compressor():
    global _compressor
    if _compressor is None:
        print("[RAG Pipeline] Lazily loading Cross-Encoder model & Reranker...")
        from langchain_community.cross_encoders import HuggingFaceCrossEncoder
        from langchain_classic.retrievers.document_compressors import CrossEncoderReranker
        # Temporarily clear HF_TOKEN during init to prevent expired token exceptions on public models
        hf_token = os.environ.pop("HF_TOKEN", None)
        try:
            cross_encoder_model = HuggingFaceCrossEncoder(model_name="cross-encoder/ms-marco-MiniLM-L-6-v2")
            _compressor = CrossEncoderReranker(model=cross_encoder_model, top_n=5)
        except Exception as e:
            print(f"[RAG Pipeline] Error loading Cross-Encoder model: {e}")
            _compressor = None
        finally:
            if hf_token:
                os.environ["HF_TOKEN"] = hf_token
    return _compressor

# -------------------------------------------------------------
# 3. INITIALIZE BM25 RETRIEVER IN-MEMORY CACHE (Step 3)
all_documents_cache: List[Document] = []
# Cache built BM25Retriever instances to avoid rebuilding on every chat request
_bm25_retriever_cache = {}

async def init_bm25_retriever():
    """
    Step 3: Fetch all documents from MongoDB chunks collection on startup.
    Keeps BM25 index in memory and supports refreshing.
    """
    global all_documents_cache, _bm25_retriever_cache
    _bm25_retriever_cache.clear() # Invalidate cache
    try:
        db = get_database()
        cursor = db.chunks.find(
            {},
            {"_id": 1, "text": 1, "chunk_index": 1, "page_number": 1, "metadata": 1, "user_id": 1, "source_id": 1}
        )
        all_chunks = await cursor.to_list(length=100000)
        
        docs = []
        for chunk in all_chunks:
            meta = dict(chunk.get("metadata", {}))
            meta["id"] = str(chunk["_id"])
            meta["source_id"] = str(chunk.get("source_id", ""))
            meta["page_number"] = chunk.get("page_number", 1)
            meta["user_id"] = chunk.get("user_id", "")
            meta["filename"] = meta.get("filename", "Unknown")
            
            docs.append(Document(
                page_content=chunk["text"],
                metadata=meta
            ))
            
        all_documents_cache = docs
        print(f"[RAG Pipeline] BM25 cache initialized/refreshed with {len(all_documents_cache)} documents.")
    except Exception as e:
        print(f"[RAG Pipeline] Failed to initialize BM25 retriever cache: {e}")

def get_user_bm25_retriever(user_id: str, source_ids: Optional[List[str]] = None) -> "BM25Retriever":
    """
    Filters the global cache in-memory by user_id and source_ids,
    then returns a cached or newly compiled BM25Retriever instance with k=20.
    """
    global all_documents_cache, _bm25_retriever_cache
    
    # Generate a cache key
    cache_key = user_id if not source_ids else (user_id, tuple(sorted(source_ids)))
    if cache_key in _bm25_retriever_cache:
        return _bm25_retriever_cache[cache_key]
    
    # Filter documents in-memory
    user_docs = []
    for doc in all_documents_cache:
        # Check user_id
        if doc.metadata.get("user_id") != user_id:
            continue
        # Check source_ids if provided
        if source_ids and doc.metadata.get("source_id") not in source_ids:
            continue
        user_docs.append(doc)
        
    if not user_docs:
        # If no documents, return a dummy document retriever to prevent initialization error
        user_docs = [Document(page_content="Placeholder for empty library.", metadata={"user_id": user_id, "filename": "System"})]
        
    from langchain_community.retrievers import BM25Retriever
    retriever = BM25Retriever.from_documents(user_docs)
    retriever.k = 20
    _bm25_retriever_cache[cache_key] = retriever
    return retriever

# -------------------------------------------------------------
# 4. CONFIGURE CHAT LITELLM WITH RESILIENT FALLBACKS (Step 7)
# -------------------------------------------------------------
from app.rag.chain import LazyProxy, FALLBACK_MODELS

def _make_primary_llm():
    from langchain_litellm import ChatLiteLLM
    return ChatLiteLLM(
        model=FALLBACK_MODELS[0],
        temperature=0.1,
        max_tokens=1000,
        request_timeout=30.0,
        max_retries=5
    )

def _make_resilient_llm():
    from langchain_litellm import ChatLiteLLM
    primary = _make_primary_llm()
    fallbacks = [
        ChatLiteLLM(
            model=model_name,
            temperature=0.1,
            max_tokens=1000,
            request_timeout=30.0,
            max_retries=5
        )
        for model_name in FALLBACK_MODELS[1:]
    ]
    return primary.with_fallbacks(fallbacks=fallbacks)

primary_llm = LazyProxy(_make_primary_llm)
resilient_llm = LazyProxy(_make_resilient_llm)

_summary_memory_cache = None

# -------------------------------------------------------------
# 5. SCHEMAS & HELPERS
# -------------------------------------------------------------
class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = "default"
    source_ids: Optional[List[str]] = None

try:
    encoding = tiktoken.get_encoding("cl100k_base")
except Exception:
    encoding = tiktoken.encoding_for_model("gpt-4")

def count_tokens(text: str) -> int:
    return len(encoding.encode(text))

class PrecomputedRetriever(BaseRetriever):
    docs: list[Document]
    
    def _get_relevant_documents(self, query: str) -> list[Document]:
        return self.docs

def merge_hybrid_results(vector_docs: list[Document], bm25_docs: list[Document], limit: int = 20) -> list[Document]:
    """
    Step 4: Combine Vector Search and BM25 results using LangChain's EnsembleRetriever.
    Applies weights from active RAG configuration dynamically.
    Returns the top unique merged results.
    """
    from app.mlflow.manager import BestConfigManager
    rag_config = BestConfigManager.get_applied_rag_config()
    vector_weight = rag_config.get("hybrid_vector_weight", 0.6)
    bm25_weight = rag_config.get("hybrid_bm25_weight", 0.4)
    k_limit = rag_config.get("k_value", limit)

    r1 = PrecomputedRetriever(docs=vector_docs)
    r2 = PrecomputedRetriever(docs=bm25_docs)
    
    from langchain_classic.retrievers import EnsembleRetriever
    ensemble = EnsembleRetriever(
        retrievers=[r1, r2],
        weights=[vector_weight, bm25_weight]
    )
    
    # Invoke RRF fusion using the EnsembleRetriever
    fused_docs = ensemble.invoke("dummy query")
    return fused_docs[:k_limit]

def reorder_context_chunks(chunks: list[Document]) -> list[Document]:
    """
    Step 6: Reorder documents to mitigate 'lost in the middle' phenomenon.
    Places the most relevant chunk at the start (index 0) and the second most at the end,
    with less relevant chunks in the middle.
    """
    n = len(chunks)
    if n <= 2:
        return chunks
    
    # Sort remaining chunks in the middle
    return [chunks[0]] + chunks[2:] + [chunks[1]]

def format_chunks_with_lost_in_the_middle(docs: list[Document], max_tokens: int = 3200) -> tuple[str, list[dict]]:
    """
    Step 6: Formats documents within a strict 3200-token budget.
    """
    ordered_docs = reorder_context_chunks(docs)
    context_parts = []
    current_tokens = 0
    included_sources = []

    for doc in ordered_docs:
        meta = doc.metadata
        filename = meta.get("filename", "Unknown")
        page_num = meta.get("page_number", 1)
        score = meta.get("relevance_score", 0.0)
        
        # Format each chunk with source name and page number
        formatted_chunk = f"[Source: {filename}, Page: {page_num}]\n{doc.page_content}\n\n"
        chunk_tokens = count_tokens(formatted_chunk)
        
        if current_tokens + chunk_tokens <= max_tokens:
            context_parts.append(formatted_chunk)
            current_tokens += chunk_tokens
            included_sources.append({
                "title": filename,
                "chunk": doc.page_content,
                "score": score
            })
        else:
            break
            
    return "".join(context_parts).strip(), included_sources

async def get_session_history_and_summary(user_id: str, session_id: str, db) -> str:
    """
    Step 6: Retrieve conversation history, auto-summarizing via ConversationSummaryMemory
    if history dialogue exceeds the 2400-token budget.
    """
    history_cursor = db.chat_history.find(
        {"user_id": user_id, "session_id": session_id}
    ).sort("created_at", 1).limit(20)
    history_docs = await history_cursor.to_list(length=20)
    
    from langchain_core.messages import HumanMessage, AIMessage
    messages = []
    dialogue_parts = []
    
    for h in history_docs:
        role = h["role"]
        content = h["content"]
        if role == "user":
            messages.append(HumanMessage(content=content))
            dialogue_parts.append(f"Human: {content}")
        else:
            messages.append(AIMessage(content=content))
            dialogue_parts.append(f"AI: {content}")
        
    dialogue = "\n".join(dialogue_parts).strip()
    
    if count_tokens(dialogue) > 2400:
        print("[RAG Pipeline] Conversation history exceeds 2400 tokens. Generating summary via ConversationSummaryMemory...")
        global _summary_memory_cache
        if _summary_memory_cache is None:
            from langchain_litellm import ChatLiteLLM
            from langchain_classic.memory import ConversationSummaryMemory
            summary_llm = ChatLiteLLM(
                model="groq/llama-3.1-8b",
                temperature=0.0,
                max_tokens=500
            )
            _summary_memory_cache = ConversationSummaryMemory(llm=summary_llm)
            
        summary = await asyncio.to_thread(
            _summary_memory_cache.predict_new_summary,
            messages,
            existing_summary=""
        )
        return f"Summary of previous conversation:\n{summary}"
        
    return dialogue

# -------------------------------------------------------------
# 6. CUSTOM LANGCHAIN CALLBACK HANDLER FOR SSE STREAMING (Step 8)
# -------------------------------------------------------------
class SSEStreamingCallbackHandler(BaseCallbackHandler):
    def __init__(self, queue: asyncio.Queue):
        self.queue = queue
        self.latency_start = 0
        self.model_name = "Unknown"

    def on_llm_start(self, serialized: dict, prompts: list, **kwargs) -> None:
        self.latency_start = time.time()
        if kwargs and "invocation_params" in kwargs:
            self.model_name = kwargs["invocation_params"].get("model", "Unknown")
        elif serialized and "name" in serialized:
            self.model_name = serialized["name"]
        print(f"[RAG Pipeline] Model execution started: {self.model_name}")

    def on_llm_new_token(self, token: str, **kwargs) -> None:
        event = {
            "event": "token",
            "data": json.dumps({"token": token})
        }
        self.queue.put_nowait(event)

    def on_llm_end(self, response, **kwargs) -> None:
        latency_ms = int((time.time() - self.latency_start) * 1000)
        print(f"[RAG Pipeline] Model successfully responded: {self.model_name} (latency: {latency_ms}ms)")
        
        tokens_used = 0
        if response and response.llm_output:
            tokens_used = response.llm_output.get("token_usage", {}).get("total_tokens", 0)
        
        # Yield metadata
        event = {
            "event": "metadata",
            "data": json.dumps({
                "model_used": self.model_name,
                "tokens_used": tokens_used,
                "latency_ms": latency_ms
            })
        }
        self.queue.put_nowait(event)
        # Yield completion done event
        self.queue.put_nowait({"event": "done", "data": json.dumps({"status": "complete"})})

    def on_llm_error(self, error: Exception, **kwargs) -> None:
        print(f"[RAG Pipeline] LLM error: {error}")
        event = {
            "event": "error",
            "data": json.dumps({"message": str(error)})
        }
        self.queue.put_nowait(event)

# -------------------------------------------------------------
# 7. LCEL CHAIN RUNNABLES ASSEMBLY
# -------------------------------------------------------------
async def search_vector_async(inputs: dict) -> list[Document]:
    query = inputs["query"]
    user_id = inputs["user_id"]
    source_ids = inputs.get("source_ids")
    
    from app.mlflow.manager import BestConfigManager
    rag_config = BestConfigManager.get_applied_rag_config()
    k_val = rag_config.get("k_value", 20)
    
    pre_filter = {"user_id": user_id}
    if source_ids:
        pre_filter["source_id"] = {"$in": [ObjectId(sid) for sid in source_ids]}
        
    try:
        vstore = get_vector_store()
        results_with_score = await vstore.asimilarity_search_with_score(
            query,
            k=k_val,
            pre_filter=pre_filter
        )
    except (AttributeError, NotImplementedError):
        vstore = get_vector_store()
        # Fallback to run synchronous search in a threadpool
        results_with_score = await asyncio.to_thread(
            vstore.similarity_search_with_score,
            query,
            k=k_val,
            pre_filter=pre_filter
        )
    
    docs = []
    for doc, score in results_with_score:
        doc.metadata["relevance_score"] = float(score)
        docs.append(doc)
    return docs

async def search_bm25_async(inputs: dict) -> list[Document]:
    query = inputs["query"]
    user_id = inputs["user_id"]
    source_ids = inputs.get("source_ids")
    
    from app.mlflow.manager import BestConfigManager
    rag_config = BestConfigManager.get_applied_rag_config()
    k_val = rag_config.get("k_value", 20)
    
    retriever = get_user_bm25_retriever(user_id, source_ids)
    retriever.k = k_val
    # Invoke retriever asynchronously via threadpool
    docs = await asyncio.to_thread(retriever.invoke, query)
    return docs

# LCEL Parallel Retrieval Step
retrieval_step = RunnableParallel({
    "vector_docs": RunnableLambda(search_vector_async),
    "bm25_docs": RunnableLambda(search_bm25_async),
    "query": RunnableLambda(lambda x: x["query"]),
    "user_id": RunnableLambda(lambda x: x["user_id"]),
    "session_id": RunnableLambda(lambda x: x.get("session_id", "default")),
    "queue": RunnableLambda(lambda x: x.get("queue"))
})

# LCEL Hybrid RRF Merge Step
hybrid_step = RunnableLambda(lambda x: {
    "fused_docs": merge_hybrid_results(x["vector_docs"], x["bm25_docs"], limit=20),
    "query": x["query"],
    "user_id": x["user_id"],
    "session_id": x["session_id"],
    "queue": x["queue"]
})

# LCEL Cross-Encoder Reranker Step
async def rerank_step_runnable(x: dict) -> dict:
    fused_docs = x["fused_docs"]
    query = x["query"]
    
    from app.mlflow.manager import BestConfigManager
    rag_config = BestConfigManager.get_applied_rag_config()
    top_n = rag_config.get("reranker_top_n", 5)
    
    comp = get_compressor()
    if comp and fused_docs:
        # Dynamic top_n update
        comp.top_n = top_n
        # Run Compressor reranker in threadpool
        reranked_docs = await asyncio.to_thread(comp.compress_documents, fused_docs, query)
    else:
        reranked_docs = fused_docs[:top_n]
        
    for doc in reranked_docs:
        # Extract and add reranking score to metadata
        if hasattr(doc, "state") and "relevance_score" in doc.state:
            doc.metadata["relevance_score"] = float(doc.state["relevance_score"])
        elif hasattr(doc, "relevance_score"):
            doc.metadata["relevance_score"] = float(doc.relevance_score)
        elif "relevance_score" not in doc.metadata:
            doc.metadata["relevance_score"] = 0.0
            
    return {
        "reranked_docs": reranked_docs,
        "query": query,
        "user_id": x["user_id"],
        "session_id": x["session_id"],
        "queue": x["queue"]
    }

rerank_step = RunnableLambda(rerank_step_runnable)

# LCEL Context & History Builder Step
async def build_context_runnable(x: dict) -> dict:
    docs = x["reranked_docs"]
    query = x["query"]
    user_id = x["user_id"]
    session_id = x["session_id"]
    queue = x["queue"]
    
    context_str, included_sources = format_chunks_with_lost_in_the_middle(docs, max_tokens=3200)
    
    # Put sources event into the stream queue immediately
    if queue:
        queue.put_nowait({
            "event": "sources",
            "data": json.dumps({"sources": included_sources})
        })
        
    db = get_database()
    history_str = await get_session_history_and_summary(user_id, session_id, db)
    
    return {
        "context": context_str,
        "history": history_str,
        "query": query
    }

context_step = RunnableLambda(build_context_runnable)

# Chat Prompt Template
prompt_template = ChatPromptTemplate.from_template(
    "You are ResearchMind — an intelligent research assistant.\n"
    "Answer ONLY based on the provided context.\n"
    "If answer not in context say exactly:\n"
    "\"I could not find this in the provided documents.\"\n"
    "Always cite source name for every fact you state.\n"
    "Be concise, accurate and factual.\n\n"
    "Context:\n{context}\n\n"
    "Conversation History:\n{history}\n\n"
    "Question: {query}"
)

# FULL LANGCHAIN LCEL CHAIN ASSEMBLY!
lcel_chain = (
    retrieval_step
    | hybrid_step
    | rerank_step
    | context_step
    | prompt_template
    | resilient_llm
)

# -------------------------------------------------------------
# 8. ROUTE HANDLERS
# -------------------------------------------------------------
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
    
    try:
        response = await lcel_chain.ainvoke({
            "query": query_text,
            "user_id": user_id,
            "session_id": request.session_id,
            "source_ids": request.source_ids,
            "queue": None
        })
        
        return {
            "query": query_text,
            "response": response.content,
            "model": getattr(response, "response_metadata", {}).get("model", "Unknown")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LCEL Chain execution failed: {str(e)}"
        )


@router.get("/chat/stream")
async def chat_stream(
    query: str,
    session_id: str = "default",
    source_ids: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query_text = query.strip()
    if not query_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query cannot be empty."
        )

    user_id = str(current_user["_id"])
    parsed_source_ids = source_ids.split(",") if source_ids else None

    async def event_generator():
        # Setup message queue and custom streaming callback
        queue = asyncio.Queue()
        callback = SSEStreamingCallbackHandler(queue)
        
        db = get_database()
        
        # Save user message to history
        await db.chat_history.insert_one({
            "user_id": user_id,
            "session_id": session_id,
            "role": "user",
            "content": query_text,
            "created_at": datetime.now(timezone.utc)
        })

        # Define background task to run the LCEL chain
        async def run_chain():
            try:
                await lcel_chain.ainvoke(
                    {
                        "query": query_text,
                        "user_id": user_id,
                        "session_id": session_id,
                        "source_ids": parsed_source_ids,
                        "queue": queue
                    },
                    config={"callbacks": [callback]}
                )
            except Exception as e:
                queue.put_nowait({
                    "event": "error",
                    "data": json.dumps({"message": str(e)})
                })
                queue.put_nowait({
                    "event": "done",
                    "data": json.dumps({"status": "failed"})
                })

        # Fire and run LCEL chain task
        chain_task = asyncio.create_task(run_chain())
        
        full_response = ""

        try:
            # Yield events from queue as they arrive
            while True:
                event = await queue.get()
                
                # Format event to SSE structure
                yield f"event: {event['event']}\ndata: {event['data']}\n\n"
                
                # Accumulate tokens to save history on completion
                if event["event"] == "token":
                    data_dict = json.loads(event["data"])
                    full_response += data_dict.get("token", "")
                
                if event["event"] in {"done", "error"}:
                    break
        except Exception as e:
            print(f"Stream generation interrupted: {e}")
            yield f"event: error\ndata: {json.dumps({'message': 'Stream interrupted'})}\n\n"
            yield f"event: done\ndata: {json.dumps({'status': 'failed'})}\n\n"
        finally:
            # Clean up task
            if not chain_task.done():
                chain_task.cancel()

        # Save assistant complete response to history
        if full_response:
            await db.chat_history.insert_one({
                "user_id": user_id,
                "session_id": session_id,
                "role": "assistant",
                "content": full_response,
                "created_at": datetime.now(timezone.utc)
            })

    return StreamingResponse(event_generator(), media_type="text/event-stream")

