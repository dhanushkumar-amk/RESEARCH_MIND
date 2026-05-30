from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import UUID, uuid4
from typing import Optional, Dict, Any, Literal

class SecurityLogEvent(BaseModel):
    id: UUID = Field(default_factory=uuid4, description="Unique security event ID.")
    user_id: str = Field(..., description="ID of the user who triggered the event.")
    session_id: str = Field(..., description="Active session ID of the conversation.")
    event_type: Literal[
        "prompt_injection",
        "jailbreak",
        "pii_input",
        "pii_output",
        "topic_blocked",
        "rate_limited",
        "hallucination_flagged",
        "toxic_output"
    ] = Field(..., description="Type of security guardrail event.")
    original_input: str = Field(..., description="Original user text before scrubbing.")
    cleaned_input: str = Field(..., description="Cleaned/redacted user text.")
    severity: Literal["low", "medium", "high"] = Field(..., description="Severity level of the violation.")
    blocked: bool = Field(..., description="Flag indicating if the request was blocked/rejected.")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="UTC timestamp of the security event.")
    ip_address: str = Field(..., description="Client IP address.")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional context details (scores, triggered rules, etc.).")
