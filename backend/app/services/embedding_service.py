from sentence_transformers import SentenceTransformer

class EmbeddingService:
    _model = None

    def __init__(self):
        # Cache the model class-wide so we don't load it multiple times
        if EmbeddingService._model is None:
            print("Loading sentence-transformers model (all-MiniLM-L6-v2) locally...")
            EmbeddingService._model = SentenceTransformer("all-MiniLM-L6-v2")
            print("Sentence model loaded successfully.")

    def get_embedding(self, text: str) -> list[float]:
        """
        Generate embedding for a single text block.
        """
        if not text:
            return []
        embedding = EmbeddingService._model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """
        Generate embeddings in batches for a list of text blocks.
        """
        if not texts:
            return []
        embeddings = EmbeddingService._model.encode(texts, batch_size=32, show_progress_bar=False, convert_to_numpy=True)
        return embeddings.tolist()
