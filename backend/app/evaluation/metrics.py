import sys
import logging
from unittest.mock import MagicMock

# 10-year experience pro tip: Dynamic mock to bypass Ragas vertexai import error in langchain_community
if "langchain_community.chat_models.vertexai" not in sys.modules:
    sys.modules["langchain_community.chat_models.vertexai"] = MagicMock()
if "langchain_community.embeddings.vertexai" not in sys.modules:
    sys.modules["langchain_community.embeddings.vertexai"] = MagicMock()

from langchain_groq import ChatGroq
from app.core.config import settings
from app.rag.embeddings import get_embeddings

logger = logging.getLogger("researchmind")

# Cache Ragas LLM and Embeddings instances globally
_ragas_llm = None
_ragas_embeddings = None

def get_ragas_llm_and_embeddings():
    """
    Get the wrapped LLM and Embeddings instances for Ragas.
    Reuses instances once cached.
    """
    global _ragas_llm, _ragas_embeddings
    if _ragas_llm is None or _ragas_embeddings is None:
        from ragas.llms import LangchainLLMWrapper
        from ragas.embeddings import LangchainEmbeddingsWrapper

        # Clean the model name prefix if present
        model_name = settings.ragas_llm
        if model_name.startswith("groq/"):
            model_name = model_name[5:]
        
        # Groq ChatModel at temperature 0 for deterministic evaluations
        logger.info(f"[RAGAS Metrics] Initializing ChatGroq model: {model_name}")
        chat_groq = ChatGroq(
            model=model_name,
            temperature=0.0,
            api_key=settings.groq_api_key
        )
        
        # Get cached embeddings from RAG pipeline
        hf_embeddings = get_embeddings()

        _ragas_llm = LangchainLLMWrapper(chat_groq)
        _ragas_embeddings = LangchainEmbeddingsWrapper(hf_embeddings)

    return _ragas_llm, _ragas_embeddings

def get_ragas_metrics():
    """
    Instantiate and bind the configured LLM and Embeddings to Ragas metrics.
    """
    from ragas.metrics import (
        faithfulness,
        answer_relevancy,
        context_precision,
        context_recall,
        answer_correctness
    )

    ragas_llm, ragas_embeddings = get_ragas_llm_and_embeddings()

    # Bind the LLM and Embeddings wrappers to each metric
    faithfulness.llm = ragas_llm
    
    answer_relevancy.llm = ragas_llm
    answer_relevancy.embeddings = ragas_embeddings
    
    context_precision.llm = ragas_llm
    
    context_recall.llm = ragas_llm
    
    answer_correctness.llm = ragas_llm
    answer_correctness.embeddings = ragas_embeddings

    return [
        faithfulness,
        answer_relevancy,
        context_precision,
        context_recall,
        answer_correctness
    ]
