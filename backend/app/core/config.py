from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from typing import Annotated

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "ResearchMind API"
    debug: bool = False
    host: str = "127.0.0.1"
    port: int = 8000

    allowed_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"],
        validation_alias=AliasChoices("ALLOWED_ORIGINS"),
    )

    jwt_secret: str = Field(
        ...,
        min_length=16,
        validation_alias=AliasChoices("JWT_SECRET"),
    )
    jwt_algorithm: str = "HS256"
    access_token_expiry_minutes: int = Field(
        default=60,
        validation_alias=AliasChoices("ACCESS_TOKEN_EXPIRY_MINUTES"),
    )
    refresh_token_expiry_days: int = Field(
        default=7,
        validation_alias=AliasChoices("REFRESH_TOKEN_EXPIRY_DAYS", "TOKEN_EXPIRY_DAYS"),
    )
    reset_token_expiry_minutes: int = Field(
        default=30,
        validation_alias=AliasChoices("RESET_TOKEN_EXPIRY_MINUTES"),
    )
    verification_code_expiry_minutes: int = Field(
        default=10,
        validation_alias=AliasChoices("VERIFICATION_CODE_EXPIRY_MINUTES"),
    )
    password_reset_code_expiry_minutes: int = Field(
        default=10,
        validation_alias=AliasChoices("PASSWORD_RESET_CODE_EXPIRY_MINUTES"),
    )

    mongodb_uri: str = Field(
        ...,
        validation_alias=AliasChoices("MONGODB_URI", "MONGODB_URL"),
    )
    mongodb_database: str | None = Field(
        default=None,
        validation_alias=AliasChoices("MONGODB_DATABASE"),
    )

    resend_api_key: str | None = Field(default=None, validation_alias=AliasChoices("RESEND_API_KEY"))
    resend_from_email: str | None = Field(default=None, validation_alias=AliasChoices("RESEND_FROM_EMAIL"))
    resend_from_name: str = Field(default="ResearchMind", validation_alias=AliasChoices("RESEND_FROM_NAME"))

    smtp_host: str | None = Field(default=None, validation_alias=AliasChoices("SMTP_HOST"))
    smtp_port: int = Field(default=587, validation_alias=AliasChoices("SMTP_PORT"))
    smtp_username: str | None = Field(default=None, validation_alias=AliasChoices("SMTP_USERNAME"))
    smtp_password: str | None = Field(default=None, validation_alias=AliasChoices("SMTP_PASSWORD"))
    smtp_from_email: str | None = Field(default=None, validation_alias=AliasChoices("SMTP_FROM_EMAIL"))
    smtp_from_name: str = Field(default="ResearchMind", validation_alias=AliasChoices("SMTP_FROM_NAME"))
    smtp_use_tls: bool = Field(default=True, validation_alias=AliasChoices("SMTP_USE_TLS"))

    frontend_url: str = Field(
        default="http://localhost:5173",
        validation_alias=AliasChoices("FRONTEND_URL"),
    )

    aws_access_key_id: str | None = Field(default=None, validation_alias=AliasChoices("AWS_ACCESS_KEY_ID"))
    aws_secret_access_key: str | None = Field(default=None, validation_alias=AliasChoices("AWS_SECRET_ACCESS_KEY"))
    aws_s3_bucket: str | None = Field(default=None, validation_alias=AliasChoices("AWS_S3_BUCKET"))
    aws_region: str = Field(default="us-east-1", validation_alias=AliasChoices("AWS_REGION"))
    hf_token: str | None = Field(default=None, validation_alias=AliasChoices("HF_TOKEN"))
    groq_api_key: str | None = Field(default=None, validation_alias=AliasChoices("GROQ_API_KEY"))
    gemini_api_key: str | None = Field(default=None, validation_alias=AliasChoices("GEMINI_API_KEY"))
    openrouter_api_key: str | None = Field(default=None, validation_alias=AliasChoices("OPENROUTER_API_KEY"))
    langchain_api_key: str | None = Field(default=None, validation_alias=AliasChoices("LANGCHAIN_API_KEY"))
    tavily_api_key: str | None = Field(default=None, validation_alias=AliasChoices("TAVILY_API_KEY"))
    newsapi_key: str | None = Field(default=None, validation_alias=AliasChoices("NEWS_API_KEY", "NEWSAPI_KEY"))
    reddit_client_id: str | None = Field(default=None, validation_alias=AliasChoices("REDDIT_CLIENT_ID"))
    reddit_client_secret: str | None = Field(default=None, validation_alias=AliasChoices("REDDIT_CLIENT_SECRET"))
    github_token: str | None = Field(default=None, validation_alias=AliasChoices("GITHUB_TOKEN"))
    pubmed_email: str = Field(default="your@email.com", validation_alias=AliasChoices("PUBMED_EMAIL"))
    reddit_user_agent: str = Field(default="ResearchMind/1.0", validation_alias=AliasChoices("REDDIT_USER_AGENT"))
    redis_url: str | None = Field(default=None, validation_alias=AliasChoices("REDIS_URL"))
    upstash_redis_rest_url: str | None = Field(default=None, validation_alias=AliasChoices("UPSTASH_REDIS_REST_URL"))
    upstash_redis_rest_token: str | None = Field(default=None, validation_alias=AliasChoices("UPSTASH_REDIS_REST_TOKEN"))
    rate_limit_per_minute: int = Field(default=20, validation_alias=AliasChoices("RATE_LIMIT_PER_MINUTE"))
    rate_limit_per_day: int = Field(default=200, validation_alias=AliasChoices("RATE_LIMIT_PER_DAY"))
    max_input_tokens: int = Field(default=2000, validation_alias=AliasChoices("MAX_INPUT_TOKENS"))
    hallucination_threshold: float = Field(default=0.6, validation_alias=AliasChoices("HALLUCINATION_THRESHOLD"))
    jailbreak_threshold: float = Field(default=0.7, validation_alias=AliasChoices("JAILBREAK_THRESHOLD"))
    topic_relevance_threshold: float = Field(default=0.3, validation_alias=AliasChoices("TOPIC_RELEVANCE_THRESHOLD"))

    token_budget_total: int = Field(default=8000, validation_alias=AliasChoices("TOKEN_BUDGET_TOTAL"))
    token_budget_system: int = Field(default=1600, validation_alias=AliasChoices("TOKEN_BUDGET_SYSTEM"))
    token_budget_history: int = Field(default=2400, validation_alias=AliasChoices("TOKEN_BUDGET_HISTORY"))
    token_budget_context: int = Field(default=3200, validation_alias=AliasChoices("TOKEN_BUDGET_CONTEXT"))
    token_budget_query: int = Field(default=800, validation_alias=AliasChoices("TOKEN_BUDGET_QUERY"))
    sliding_window_size: int = Field(default=10, validation_alias=AliasChoices("SLIDING_WINDOW_SIZE"))
    summary_llm: str = Field(default="groq/llama-3.1-8b", validation_alias=AliasChoices("SUMMARY_LLM"))

    ragas_llm: str = Field(default="groq/llama-3.3-70b-versatile", validation_alias=AliasChoices("RAGAS_LLM"))
    ragas_faithfulness_threshold: float = Field(default=0.6, validation_alias=AliasChoices("RAGAS_FAITHFULNESS_THRESHOLD"))
    ragas_answer_relevance_threshold: float = Field(default=0.5, validation_alias=AliasChoices("RAGAS_ANSWER_RELEVANCE_THRESHOLD"))
    ragas_context_relevance_threshold: float = Field(default=0.4, validation_alias=AliasChoices("RAGAS_CONTEXT_RELEVANCE_THRESHOLD"))
    ragas_composite_threshold: float = Field(default=0.5, validation_alias=AliasChoices("RAGAS_COMPOSITE_THRESHOLD"))
    ragas_sample_size: int = Field(default=100, validation_alias=AliasChoices("RAGAS_SAMPLE_SIZE"))

    mlflow_tracking_uri: str | None = Field(default="http://localhost:5000", validation_alias=AliasChoices("MLFLOW_TRACKING_URI"))
    mlflow_experiment: str = Field(default="researchmind-rag-evaluation", validation_alias=AliasChoices("MLFLOW_EXPERIMENT"))
    mlflow_experiment_rag: str = Field(default="researchmind-rag-config", validation_alias=AliasChoices("MLFLOW_EXPERIMENT_RAG"))
    mlflow_experiment_agents: str = Field(default="researchmind-agent-runs", validation_alias=AliasChoices("MLFLOW_EXPERIMENT_AGENTS"))
    mlflow_s3_bucket: str = Field(default="researchmind-mlflow", validation_alias=AliasChoices("MLFLOW_S3_BUCKET"))
    experiment_sample_size: int = Field(default=20, validation_alias=AliasChoices("EXPERIMENT_SAMPLE_SIZE"))
    experiment_improvement_threshold: float = Field(default=0.05, validation_alias=AliasChoices("EXPERIMENT_IMPROVEMENT_THRESHOLD"))

    langchain_project: str | None = Field(default="researchmind", validation_alias=AliasChoices("LANGCHAIN_PROJECT"))
    langchain_tracing_v2: bool = Field(default=True, validation_alias=AliasChoices("LANGCHAIN_TRACING_V2"))

    @property
    def resolved_redis_url(self) -> str | None:
        # If Upstash REST configuration is present, construct standard TLS TCP URL
        if self.upstash_redis_rest_url and self.upstash_redis_rest_token:
            host = self.upstash_redis_rest_url.replace("https://", "").replace("http://", "").strip("/")
            return f"rediss://default:{self.upstash_redis_rest_token}@{host}:6379"
        return self.redis_url




    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return value
        return ["http://localhost:5173", "http://127.0.0.1:5173"]

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug_value(cls, value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "1", "yes", "on", "debug"}:
                return True
            if normalized in {"false", "0", "no", "off", "release", "prod", "production"}:
                return False
        return bool(value)

    @field_validator("mongodb_uri", mode="before")
    @classmethod
    def normalize_mongodb_uri(cls, value: str) -> str:
        if isinstance(value, str) and value.startswith("MONGODB_URI="):
            return value.split("=", 1)[1].strip()
        return value

    @property
    def resolved_mongodb_database(self) -> str:
        if self.mongodb_database:
            return self.mongodb_database

        parsed = urlparse(self.mongodb_uri)
        database_name = parsed.path.lstrip("/").split("?", 1)[0]
        return database_name or "ResearchMind"

    @property
    def email_enabled(self) -> bool:
        if self.resend_enabled:
            return True
        return bool(
            self.smtp_host
            and self.smtp_username
            and self.smtp_password
            and self.smtp_from_email
        )

    @property
    def resend_enabled(self) -> bool:
        return bool(self.resend_api_key and self.resend_from_email)


@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()