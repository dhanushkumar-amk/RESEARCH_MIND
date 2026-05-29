import os
from app.core.config import settings

# Set HF_TOKEN environment variable if configured to clear the Hugging Face warning
if settings.hf_token:
    os.environ["HF_TOKEN"] = settings.hf_token

from sentence_transformers import SentenceTransformer

class EmbeddingService:
    _model = None

    def __init__(self):
        # Do not load the model in __init__. Lazy-load it when needed to keep dev reload fast.
        pass

    @property
    def model(self):
        if EmbeddingService._model is None:
            print("Loading sentence-transformers model (all-MiniLM-L6-v2) locally...")
            EmbeddingService._model = SentenceTransformer("all-MiniLM-L6-v2")
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
