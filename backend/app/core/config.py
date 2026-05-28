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
