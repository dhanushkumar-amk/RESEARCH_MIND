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

    return {
        "query": query_text,
        "vector_length": len(query_vector),
        "semantic_chunks_count": len(semantic_chunks),
        "keyword_chunks_count": len(keyword_chunks),
        "hybrid_chunks_count": len(hybrid_chunks),
        "hybrid_chunks": [
            {
                "text": chunk["text"],
                "rrf_score": chunk.get("rrf_score", 0.0),
                "page_number": chunk.get("page_number", 1),
                "filename": chunk.get("metadata", {}).get("filename", "Unknown")
            }
            for chunk in hybrid_chunks
        ]
    }
