from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from app.dependencies.auth import get_current_user
from app.services.embedding_service import EmbeddingService
from app.services.vector_service import VectorService

router = APIRouter(prefix="", tags=["Chat"])
embedding_service = EmbeddingService()
vector_service = VectorService()

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = "default"

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

    # Step 1: Query Embedding
    query_vector = embedding_service.get_embedding(query_text)
    
    print(f"Step 1 Complete: Embedded query '{query_text}' to vector of length {len(query_vector)}")

    # Step 2: Vector Search on MongoDB Atlas
    user_id = str(current_user["_id"])
    semantic_chunks = await vector_service.search_similar_chunks(
        query_embedding=query_vector,
        user_id=user_id,
        limit=20
    )
    print(f"Step 2 Complete: Found {len(semantic_chunks)} semantic chunks in MongoDB Atlas.")

    # Step 3: BM25 Keyword Search
    keyword_chunks = await vector_service.search_bm25_chunks(
        query_text=query_text,
        user_id=user_id,
        limit=20
    )
    print(f"Step 3 Complete: Found {len(keyword_chunks)} keyword chunks via BM25.")

    # Step 4: Hybrid Search (RRF Merge)
    hybrid_chunks = vector_service.reciprocal_rank_fusion(
        vector_results=semantic_chunks,
        bm25_results=keyword_chunks,
        limit=20
    )
    print(f"Step 4 Complete: Fused semantic and keyword results into {len(hybrid_chunks)} hybrid chunks using RRF.")

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

# Step 5: Cross-Encoder Reranking
    reranked_chunks = embedding_service.rerank_chunks(
        query=query_text,
        chunks=hybrid_chunks,
        limit=5
    )
    print(f"Step 5 Complete: Reranked and selected top {len(reranked_chunks)} chunks using Cross-Encoder.")

    # Step 6: Context Building & Token Budget
    context, context_chunks = build_context_with_budget(reranked_chunks, max_tokens=4000)
    print(f"Step 6 Complete: Built context of size {len(context)} chars with {len(context_chunks)} chunks.")

    return {
        "query": query_text,
        "vector_length": len(query_vector),
        "semantic_chunks_count": len(semantic_chunks),
        "keyword_chunks_count": len(keyword_chunks),
        "hybrid_chunks_count": len(hybrid_chunks),
        "reranked_chunks_count": len(reranked_chunks),
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
