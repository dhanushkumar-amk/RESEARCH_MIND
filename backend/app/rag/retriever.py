from typing import List, Optional
from pymongo import MongoClient
from bson import ObjectId
from langchain_core.documents import Document
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_community.retrievers import BM25Retriever

from app.core.config import settings
from app.core.database import get_database
from app.rag.embeddings import get_embeddings

# Shared pymongo client and vector search definition
sync_client = MongoClient(settings.mongodb_uri)
sync_db = sync_client[settings.resolved_mongodb_database]
sync_collection = sync_db["chunks"]

vector_store = MongoDBAtlasVectorSearch(
    collection=sync_collection,
    embedding=get_embeddings(),
    index_name="vector_index",
    text_key="text",
    embedding_key="embedding"
)

# Global documents cache for in-memory BM25 index
all_documents_cache: List[Document] = []

async def init_bm25_retriever() -> None:
    """
    Fetch all documents from MongoDB chunks collection on startup.
    Keeps BM25 index in memory and supports refreshing.
    """
    global all_documents_cache
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
        print(f"[RAG Retriever] BM25 cache initialized/refreshed with {len(all_documents_cache)} documents.")
    except Exception as e:
        print(f"[RAG Retriever] Failed to initialize BM25 retriever cache: {e}")

def get_user_bm25_retriever(user_id: str, source_ids: Optional[List[str]] = None) -> BM25Retriever:
    """
    Filters the global cache in-memory by user_id and source_ids,
    then returns a BM25Retriever instance with k=20.
    """
    global all_documents_cache
    
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
        user_docs = [Document(
            page_content="Placeholder for empty library.",
            metadata={"user_id": user_id, "filename": "System", "source_id": "system", "page_number": 1}
        )]
        
    retriever = BM25Retriever.from_documents(user_docs)
    retriever.k = 20
    return retriever
