import os
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain_classic.retrievers.document_compressors import CrossEncoderReranker

compressor = None

def get_rerank_compressor() -> CrossEncoderReranker:
    global compressor
    if compressor is None:
        # Temporarily clear HF_TOKEN to prevent expired token exceptions
        hf_token = os.environ.pop("HF_TOKEN", None)
        try:
            cross_encoder_model = HuggingFaceCrossEncoder(model_name="cross-encoder/ms-marco-MiniLM-L-6-v2")
            compressor = CrossEncoderReranker(model=cross_encoder_model, top_n=5)
        except Exception as e:
            print(f"[RAG Reranker] Error loading Cross-Encoder model: {e}")
            raise e
        finally:
            if hf_token:
                os.environ["HF_TOKEN"] = hf_token
    return compressor
