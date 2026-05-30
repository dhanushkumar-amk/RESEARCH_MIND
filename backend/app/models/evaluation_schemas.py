from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import UUID

class TokenBreakdown(BaseModel):
    system: int = Field(..., description="Tokens used for system prompt")
    history: int = Field(..., description="Tokens used for conversation history")
    context: int = Field(..., description="Tokens used for retrieved context chunks")
    query: int = Field(..., description="Tokens used for user query")
    total: int = Field(..., description="Total tokens used")

class EvaluationResult(BaseModel):
    faithfulness: float = Field(..., description="Faithfulness score (0 to 1)")
    answer_relevance: float = Field(..., description="Answer relevance score (0 to 1)")
    context_relevance: float = Field(..., description="Context relevance score (0 to 1)")
    context_recall: Optional[float] = Field(None, description="Context recall score (0 to 1) if ground truth is available")
    answer_correctness: Optional[float] = Field(None, description="Answer correctness score (0 to 1) if ground truth is available")
    composite_score: float = Field(..., description="Calculated composite score")
    quality_level: str = Field(..., description="Quality level: excellent, good, acceptable, poor")
    needs_disclaimer: bool = Field(..., description="Flag indicating if the response needs a warning disclaimer")
    needs_regeneration: bool = Field(..., description="Flag indicating if the response should be regenerated")
    evaluation_latency_ms: int = Field(..., description="Latency of the evaluation in milliseconds")

class ScoreRecord(BaseModel):
    id: str = Field(..., description="UUID as string")
    session_id: str = Field(..., description="Session identifier")
    question: str = Field(..., description="User query")
    answer: str = Field(..., description="Generated answer")
    faithfulness: float = Field(..., description="Faithfulness score")
    answer_relevance: float = Field(..., description="Answer relevance score")
    context_relevance: float = Field(..., description="Context relevance score")
    composite_score: float = Field(..., description="Composite score")
    quality_level: str = Field(..., description="Quality level description")
    model_used: str = Field(..., description="Name of LLM model evaluated")
    latency_ms: int = Field(..., description="Evaluation latency in ms")
    timestamp: datetime = Field(..., description="Date and time of evaluation")
    flagged: bool = Field(..., description="Whether the evaluation was flagged due to poor score")
    flag_reason: str = Field(..., description="Reason for flagging the evaluation")

class DailyEvaluationReport(BaseModel):
    date: datetime = Field(..., description="Reporting date")
    total_evaluated: int = Field(..., description="Total sessions evaluated")
    avg_faithfulness: float = Field(..., description="Average faithfulness score")
    avg_answer_relevance: float = Field(..., description="Average answer relevance score")
    avg_context_relevance: float = Field(..., description="Average context relevance score")
    avg_composite: float = Field(..., description="Average composite score")
    excellent_count: int = Field(..., description="Count of excellent quality runs")
    good_count: int = Field(..., description="Count of good quality runs")
    acceptable_count: int = Field(..., description="Count of acceptable quality runs")
    poor_count: int = Field(..., description="Count of poor quality runs")
    alerts: List[str] = Field(default_factory=list, description="List of alert strings triggered")

class ManualEvaluationInput(BaseModel):
    question: str = Field(..., description="The query to evaluate")
    answer: str = Field(..., description="The generated response to evaluate")
    contexts: List[str] = Field(..., description="The retrieved context chunks")
    ground_truth: Optional[str] = Field(None, description="Optional ground truth to compare against")
