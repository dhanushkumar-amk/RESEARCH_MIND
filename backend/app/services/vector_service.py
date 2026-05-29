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


    async def save_chunks(
        self,
        source_id: ObjectId,
        user_id: str,
        chunks: list[dict],
        embeddings: list[list[float]],
        source_metadata: dict = None
    ) -> None:
        """
        Saves chunks, their page numbers, embeddings, and metadata to MongoDB chunks collection.
        """
        if not chunks or not embeddings:
            return

        now = datetime.now(timezone.utc)
        chunk_documents = []

        for i, chunk in enumerate(chunks):
            # Combine generic source metadata with chunk-specific metadata
            chunk_metadata = {
                "user_id": user_id,
                "source_id": str(source_id),
                **(source_metadata or {})
            }
            
            chunk_doc = {
                "source_id": source_id,
                "user_id": user_id,
                "text": chunk["text"],
                "embedding": embeddings[i],
                "chunk_index": chunk["chunk_index"],
                "page_number": chunk.get("page_number", 1),
                "token_count": chunk["token_count"],
                "metadata": chunk_metadata,
                "created_at": now
            }
            chunk_documents.append(chunk_doc)

        if chunk_documents:
            await self.db.chunks.insert_many(chunk_documents)
            await self.db.sources.update_one(
                {"_id": source_id},
                {"$set": {"chunk_count": len(chunk_documents)}}
            )

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
                    "page_number": 1,
                    "metadata": 1,
                    "score": {"$meta": "searchScore"}
                }
            }
        ]

        try:
            cursor = self.db.chunks.aggregate(pipeline)
            results = await cursor.to_list(length=limit)
            return results
        except Exception as e:
            print(f"Error performing Atlas Vector Search: {e}")
            return []

    async def search_bm25_chunks(self, query_text: str, user_id: str, limit: int = 20) -> list[dict]:
        """
        Performs local BM25 keyword search on all the user's indexed chunks.
        """
        import re
        from rank_bm25 import BM25Okapi

        # 1. Fetch all chunks belonging to this user
        cursor = self.db.chunks.find(
            {"user_id": user_id},
            {"_id": 1, "text": 1, "chunk_index": 1, "page_number": 1, "metadata": 1}
        )
        all_chunks = await cursor.to_list(length=10000)
        if not all_chunks:
            return []

        # 2. Tokenize documents
        def tokenize(text: str) -> list[str]:
            return re.findall(r'\w+', text.lower())

        tokenized_corpus = [tokenize(c["text"]) for c in all_chunks]
        
        # 3. Initialize BM25 and score query
        try:
            bm25 = BM25Okapi(tokenized_corpus)
            tokenized_query = tokenize(query_text)
            scores = bm25.get_scores(tokenized_query)
        except Exception as e:
            print(f"Error calculating BM25: {e}")
            return []

        # 4. Rank and sort chunks
        scored_chunks = []
        for idx, score in enumerate(scores):
            if score > 0:
                chunk = all_chunks[idx]
                scored_chunks.append({
                    "id": str(chunk["_id"]),
                    "source_id": str(chunk.get("source_id", "")),
                    "text": chunk["text"],
                    "chunk_index": chunk.get("chunk_index", 0),
                    "page_number": chunk.get("page_number", 1),
                    "metadata": chunk.get("metadata", {}),
                    "score": float(score)
                })

        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:limit]

    def reciprocal_rank_fusion(
        self,
        vector_results: list[dict],
        bm25_results: list[dict],
        k: int = 60,
        limit: int = 20
    ) -> list[dict]:
        """
        Combines semantic vector results and BM25 keyword results using Reciprocal Rank Fusion (RRF).
        """
        rrf_scores = {}
        # Keep track of chunk properties by ID
        chunks_by_id = {}

        # Process vector search results
        for rank, chunk in enumerate(vector_results):
            chunk_id = chunk["id"]
            chunks_by_id[chunk_id] = chunk
            rrf_scores[chunk_id] = rrf_scores.get(chunk_id, 0.0) + (1.0 / (k + (rank + 1)))

        # Process BM25 search results
        for rank, chunk in enumerate(bm25_results):
            chunk_id = chunk["id"]
            chunks_by_id[chunk_id] = chunk
            rrf_scores[chunk_id] = rrf_scores.get(chunk_id, 0.0) + (1.0 / (k + (rank + 1)))

        # Sort chunks based on RRF scores in descending order
        sorted_chunk_ids = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

        # Construct final fused results list
        fused_results = []
        for chunk_id, score in sorted_chunk_ids[:limit]:
            chunk = chunks_by_id[chunk_id]
            fused_chunk = dict(chunk)
            fused_chunk["rrf_score"] = score
            fused_results.append(fused_chunk)

        return fused_results
