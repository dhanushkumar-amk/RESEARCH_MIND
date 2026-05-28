from datetime import datetime, timezone
from bson import ObjectId
from app.core.database import get_database

class VectorService:
    def __init__(self):
        # Atlas Vector Search index name (configured in Atlas dashboard)
        self.vector_index_name = "vector_index"

    @property
    def db(self):
        return get_database()


    async def save_chunks(self, source_id: ObjectId, user_id: str, chunks: list[dict], embeddings: list[list[float]]) -> None:
        """
        Saves chunks and their corresponding embeddings to the 'chunks' collection in MongoDB.
        """
        if not chunks or not embeddings:
            return

        now = datetime.now(timezone.utc)
        chunk_documents = []

        for i, chunk in enumerate(chunks):
            chunk_doc = {
                "source_id": source_id,
                "user_id": user_id,
                "text": chunk["text"],
                "embedding": embeddings[i],
                "chunk_index": chunk["chunk_index"],
                "token_count": chunk["token_count"],
                "created_at": now
            }
            chunk_documents.append(chunk_doc)

        if chunk_documents:
            await self.db.chunks.insert_many(chunk_documents)

    async def delete_source_chunks(self, source_id: ObjectId) -> None:
        """
        Deletes all chunks associated with a specific source ID.
        """
        await self.db.chunks.delete_many({"source_id": source_id})

    async def search_similar_chunks(self, query_embedding: list[float], user_id: str, limit: int = 5) -> list[dict]:
        """
        Performs semantic vector search restricted to the user's own sources.
        """
        if not query_embedding:
            return []

        pipeline = [
            {
                "$vectorSearch": {
                    "index": self.vector_index_name,
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": limit * 10,
                    "limit": limit,
                    "filter": {
                        "user_id": {"$eq": user_id}
                    }
                }
            },
            {
                "$project": {
                    "id": {"$toString": "$_id"},
                    "_id": 0,
                    "source_id": {"$toString": "$source_id"},
                    "text": 1,
                    "chunk_index": 1,
                    "score": {"$meta": "searchScore"}
                }
            }
        ]

        try:
            cursor = self.db.chunks.aggregate(pipeline)
            results = await cursor.to_list(length=limit)
            return results
        except Exception as e:
            # Fallback or log if index is not yet created in MongoDB Atlas
            print(f"Error performing Atlas Vector Search: {e}")
            return []
