from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(
    *,
    subject: str,
    email: str,
    token_type: str,
    expires_delta: timedelta,
    extra_claims: dict[str, Any] | None = None,
) -> tuple[str, str, datetime]:
    now = datetime.now(timezone.utc)
    expires_at = now + expires_delta
    jti = str(uuid4())

    payload: dict[str, Any] = {
        "sub": subject,
        "email": email,
        "type": token_type,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)

    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, jti, expires_at


def create_access_token(subject: str, email: str) -> tuple[str, str, datetime]:
    return create_token(
        subject=subject,
        email=email,
        token_type="access",
        expires_delta=timedelta(minutes=settings.access_token_expiry_minutes),
    )


def create_refresh_token(subject: str, email: str) -> tuple[str, str, datetime]:
    return create_token(
        subject=subject,
        email=email,
        token_type="refresh",
        expires_delta=timedelta(days=settings.refresh_token_expiry_days),
    )


def create_reset_token(subject: str, email: str) -> tuple[str, str, datetime]:
    return create_token(
        subject=subject,
        email=email,
        token_type="password_reset",
        expires_delta=timedelta(minutes=settings.reset_token_expiry_minutes),
    )


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Invalid or expired token.") from exc


def generate_otp_code(length: int = 6) -> str:
    upper_bound = 10**length
    lower_bound = 10 ** (length - 1)
    return str(uuid4().int % (upper_bound - lower_bound) + lower_bound).zfill(length)


def validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not any(char.isupper() for char in password):
        raise ValueError("Password must include at least one uppercase letter.")
    if not any(char.islower() for char in password):
        raise ValueError("Password must include at least one lowercase letter.")
    if not any(char.isdigit() for char in password):
        raise ValueError("Password must include at least one number.")
