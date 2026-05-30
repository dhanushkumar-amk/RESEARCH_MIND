import re
import logging
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_litellm import ChatLiteLLM

from app.core.config import settings
from app.security.input_guards import scrub_pii

logger = logging.getLogger("researchmind.security")

# Configure LLM for classification (Groq Llama-3.1-8b)
security_llm = ChatLiteLLM(
    model="groq/llama-3.1-8b-instant",
    temperature=0.0,
    max_tokens=10,
    request_timeout=3.0,
    max_retries=1
)

def scrub_pii_output(text: str) -> tuple[str, list[str]]:
    """Scrubs PII from generated answer, replacing it with [REDACTED]."""
    return scrub_pii(text)

async def check_hallucination(answer: str, context: str) -> tuple[float, bool]:
    """
    Checks if the generated answer is faithful to the provided context.
    Returns (score, is_hallucination).
    """
    if not context or not answer:
        return 1.0, False  # No context or answer to evaluate, fail-open
        
    system_prompt = (
        "You are an AI faithfulness classifier. Analyze if the candidate answer is fully grounded in and supported by "
        "the provided context.\n"
        "Output ONLY a single float score between 0.0 and 1.0, where 1.0 means the answer is fully supported by the context, "
        "and 0.0 means the answer contains hallucinations or information not supported by the context.\n"
        "Do not include any text, markdown, or explanation, only output the float number (e.g., 0.9)."
    )
    user_prompt = f"Context: {context}\nCandidate Answer: {answer}"
    
    try:
        response = await security_llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ])
        content = response.content.strip()
        try:
            score = float(content)
        except ValueError:
            score = None
            
        if score is None:
            # Corrected regex placing longer pattern first
            match = re.search(r"\b(0\.\d+|1\.0|0|1)\b", content)
            if match:
                score = float(match.group(1))
                
        if score is not None:
            is_hallucination = score < settings.hallucination_threshold
            return score, is_hallucination
        return 1.0, False
    except Exception as e:
        logger.error(f"[Output Guards] Hallucination LLM classification failed: {e}. Failing open.")
        return 1.0, False  # Fail open

async def check_toxicity(text: str) -> tuple[float, bool]:
    """
    Checks if the generated text contains toxic, offensive, or harmful content.
    Returns (score, is_toxic).
    """
    if not text:
        return 0.0, False
        
    system_prompt = (
        "You are an AI toxicity classifier. Evaluate if the following text contains toxic, offensive, harmful, harassing, "
        "or highly inappropriate language.\n"
        "Output ONLY a single float score between 0.0 and 1.0, where 1.0 means highly toxic/offensive, "
        "and 0.0 means completely safe.\n"
        "Do not include any text, markdown, or explanation, only output the float number (e.g., 0.1)."
    )
    user_prompt = f"Text: {text}"
    
    try:
        response = await security_llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ])
        content = response.content.strip()
        try:
            score = float(content)
        except ValueError:
            score = None
            
        if score is None:
            # Corrected regex placing longer pattern first
            match = re.search(r"\b(0\.\d+|1\.0|0|1)\b", content)
            if match:
                score = float(match.group(1))
                
        if score is not None:
            is_toxic = score > 0.5  # Toxicity threshold set to 0.5
            return score, is_toxic
        return 0.0, False
    except Exception as e:
        logger.error(f"[Output Guards] Toxicity LLM classification failed: {e}. Failing open.")
        return 0.0, False  # Fail open

def check_length(text: str) -> bool:
    """Checks if the generated text is within the required 50 to 3000 character limit."""
    length = len(text)
    return 50 <= length <= 3000
