import os
from langchain_huggingface import HuggingFaceEmbeddings

# Cache model after first load
embeddings = None

def get_embeddings() -> HuggingFaceEmbeddings:
    global embeddings
    if embeddings is None:
        # Temporarily clear HF_TOKEN to prevent expired token exceptions on public models
        hf_token = os.environ.pop("HF_TOKEN", None)
        try:
            embeddings = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2",
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True}
            )
        except Exception as e:
            print(f"[RAG Embeddings] Error loading HuggingFaceEmbeddings: {e}")
            raise e
        finally:
            if hf_token:
                os.environ["HF_TOKEN"] = hf_token
    return embeddings
