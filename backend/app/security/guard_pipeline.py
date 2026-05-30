import logging
from app.core.config import settings
from app.security.audit_logger import log_security_event
from app.security.input_guards import (
    check_prompt_injection,
    classify_jailbreak,
    scrub_pii,
    classify_topic_relevance,
    enforce_token_limits
)
from app.security.output_guards import (
    scrub_pii_output,
    check_hallucination,
    check_toxicity,
    check_length
)

logger = logging.getLogger("researchmind.security")

async def execute_input_guards(
    question: str,
    session_id: str,
    user_id: str,
    ip_address: str
) -> tuple[str, bool, str]:
    """
    Executes all input security checks in sequence.
    Returns (cleaned_question, blocked, reason).
    """
    # 1. Enforce token limits (truncates input and warns)
    cleaned_question, truncated = enforce_token_limits(question, max_tokens=settings.max_input_tokens)
    if truncated:
        logger.warning(f"[Input Guards] Input from session {session_id} was truncated to {settings.max_input_tokens} tokens.")

    # 2. Prompt Injection Detector (Regex-based)
    injected, pattern = check_prompt_injection(cleaned_question)
    if injected:
        await log_security_event(
            user_id=user_id,
            session_id=session_id,
            event_type="prompt_injection",
            original_input=question,
            cleaned_input=cleaned_question,
            severity="high",
            blocked=True,
            ip_address=ip_address,
            metadata={"pattern": pattern}
        )
        return question, True, f"Prompt Injection detected (pattern: {pattern})"

    # 3. Jailbreak Detector (LLM-based)
    try:
        jailbreak_score = await classify_jailbreak(cleaned_question)
        if jailbreak_score >= settings.jailbreak_threshold:
            await log_security_event(
                user_id=user_id,
                session_id=session_id,
                event_type="jailbreak",
                original_input=question,
                cleaned_input=cleaned_question,
                severity="high",
                blocked=True,
                ip_address=ip_address,
                metadata={"score": jailbreak_score}
            )
            return question, True, f"Jailbreak attempt detected (score: {jailbreak_score})"
    except Exception as e:
        logger.error(f"[Input Guards] Jailbreak detection exception: {e}. Failing open.")

    # 4. Topic Filter Compliance (LLM-based)
    try:
        relevance_score = await classify_topic_relevance(cleaned_question)
        if relevance_score < settings.topic_relevance_threshold:
            await log_security_event(
                user_id=user_id,
                session_id=session_id,
                event_type="topic_blocked",
                original_input=question,
                cleaned_input=cleaned_question,
                severity="medium",
                blocked=True,
                ip_address=ip_address,
                metadata={"score": relevance_score}
            )
            return question, True, f"Query off-topic or harmful (score: {relevance_score})"
    except Exception as e:
        logger.error(f"[Input Guards] Topic relevance check exception: {e}. Failing open.")

    # 5. PII Scrubbing (Regex-based)
    scrubbed_question, pii_types = scrub_pii(cleaned_question)
    if pii_types:
        await log_security_event(
            user_id=user_id,
            session_id=session_id,
            event_type="pii_input",
            original_input=question,
            cleaned_input=scrubbed_question,
            severity="low",
            blocked=False,
            ip_address=ip_address,
            metadata={"pii_types": pii_types}
        )
        cleaned_question = scrubbed_question

    return cleaned_question, False, ""

async def execute_output_guards(
    response: str,
    context: str,
    session_id: str,
    user_id: str,
    ip_address: str
) -> tuple[str, bool, str, str]:
    """
    Executes all output security checks in sequence.
    Returns (cleaned_response, blocked, violation_type, reason).
    """
    # 1. PII Output Scrubber (Regex-based)
    scrubbed_response, pii_types = scrub_pii_output(response)
    if pii_types:
        await log_security_event(
            user_id=user_id,
            session_id=session_id,
            event_type="pii_output",
            original_input=response,
            cleaned_input=scrubbed_response,
            severity="low",
            blocked=False,
            ip_address=ip_address,
            metadata={"pii_types": pii_types}
        )
        response = scrubbed_response

    # 2. Toxicity Check (LLM-based)
    try:
        toxicity_score, is_toxic = await check_toxicity(response)
        if is_toxic:
            await log_security_event(
                user_id=user_id,
                session_id=session_id,
                event_type="toxic_output",
                original_input=response,
                cleaned_input=response,
                severity="high",
                blocked=True,
                ip_address=ip_address,
                metadata={"score": toxicity_score}
            )
            return response, True, "toxic_output", f"Toxic response generated (score: {toxicity_score})"
    except Exception as e:
        logger.error(f"[Output Guards] Toxicity check exception: {e}. Failing open.")

    # 3. Hallucination / Faithfulness Check (LLM-based)
    try:
        faithfulness_score, is_hallucinated = await check_hallucination(response, context)
        if is_hallucinated:
            await log_security_event(
                user_id=user_id,
                session_id=session_id,
                event_type="hallucination_flagged",
                original_input=response,
                cleaned_input=response,
                severity="medium",
                blocked=True,
                ip_address=ip_address,
                metadata={"score": faithfulness_score}
            )
            return response, True, "hallucination_flagged", f"Response failed groundedness check (score: {faithfulness_score})"
    except Exception as e:
        logger.error(f"[Output Guards] Hallucination check exception: {e}. Failing open.")

    # 4. Length/Format Validator
    if not check_length(response):
        await log_security_event(
            user_id=user_id,
            session_id=session_id,
            # We classify format_violation as a medium severity event under hallucination_flagged / fallback
            event_type="hallucination_flagged",
            original_input=response,
            cleaned_input=response,
            severity="low",
            blocked=True,
            ip_address=ip_address,
            metadata={"reason": "length_violation", "length": len(response)}
        )
        return response, True, "format_violation", f"Response length ({len(response)}) is outside bounds (50-3000)"

    return response, False, "", ""
