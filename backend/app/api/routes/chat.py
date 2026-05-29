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

    return {
        "query": query_text,
        "vector_length": len(query_vector),
        "semantic_chunks_count": len(semantic_chunks),
        "semantic_chunks": [
            {
                "text": chunk["text"],
                "score": chunk.get("score", 0.0),
                "page_number": chunk.get("page_number", 1),
                "filename": chunk.get("metadata", {}).get("filename", "Unknown")
            }
            for chunk in semantic_chunks
        ]
    }
