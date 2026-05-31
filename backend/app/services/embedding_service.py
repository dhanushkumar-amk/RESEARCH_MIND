import os
from app.core.config import settings

# Set HF_TOKEN environment variable if configured to clear the Hugging Face warning
if settings.hf_token:
    os.environ["HF_TOKEN"] = settings.hf_token

class EmbeddingService:
    _model = None

    def __init__(self):
        # Do not load the model in __init__. Lazy-load it when needed to keep dev reload fast.
        pass

    @property
    def model(self):
        if EmbeddingService._model is None:
            print("Loading sentence-transformers model (all-MiniLM-L6-v2) locally...")
            from sentence_transformers import SentenceTransformer
            try:
                EmbeddingService._model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception as e:
                # If loading fails (e.g., due to expired token), try clearing the HF_TOKEN from environment and retrying
                if "HF_TOKEN" in os.environ:
                    print("Model load failed, likely due to an expired/invalid HF_TOKEN. Clearing token and retrying...")
                    os.environ.pop("HF_TOKEN", None)
                    from sentence_transformers import SentenceTransformer
                    EmbeddingService._model = SentenceTransformer("all-MiniLM-L6-v2")
                else:
                    raise e
            print("Sentence model loaded successfully.")
        return EmbeddingService._model

    def get_embedding(self, text: str) -> list[float]:
        """
        Generate embedding for a single text block.
        """
        if not text:
            return []
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """
        Generate embeddings in batches for a list of text blocks.
        """
        if not texts:
            return []
        embeddings = self.model.encode(texts, batch_size=32, show_progress_bar=False, convert_to_numpy=True)
        return embeddings.tolist()

    _reranker = None

    @property
    def reranker(self):
        if EmbeddingService._reranker is None:
            print("Loading sentence-transformers Cross-Encoder (ms-marco-MiniLM-L-6-v2) locally...")
            from sentence_transformers import CrossEncoder
            try:
                EmbeddingService._reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
            except Exception as e:
                # If loading fails (e.g., due to expired token), try clearing the HF_TOKEN from environment and retrying
                if "HF_TOKEN" in os.environ:
                    print("Cross-Encoder load failed, likely due to an expired/invalid HF_TOKEN. Clearing token and retrying...")
                    os.environ.pop("HF_TOKEN", None)
                    EmbeddingService._reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
                else:
                    raise e
            print("Cross-Encoder model loaded successfully.")
        return EmbeddingService._reranker

    def rerank_chunks(self, query: str, chunks: list[dict], limit: int = 5) -> list[dict]:
        """
        Reranks a list of chunks against a query using a local Cross-Encoder.
        Returns the top K reranked chunks.
        """
        if not chunks:
            return []

        # Prepare pairs of (query, chunk_text)
        pairs = [(query, c["text"]) for c in chunks]
        
        # Predict relevance scores
        scores = self.reranker.predict(pairs)
        
        # Combine scores with chunks
        reranked = []
        for i, score in enumerate(scores):
            chunk = dict(chunks[i])
            chunk["rerank_score"] = float(score)
            reranked.append(chunk)

        # Sort by rerank score descending
        reranked.sort(key=lambda x: x["rerank_score"], reverse=True)
        return reranked[:limit]
