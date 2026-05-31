import logging
import redis
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.security import decode_token

logger = logging.getLogger("researchmind.security")

def get_user_id_from_jwt(request: Request) -> str:
    """
    Key function for slowapi: Extracts user_id from JWT bearer token.
    Falls back to remote IP address if unauthenticated.
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_token(token)
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except Exception:
            pass
            
    # Fallback to IP address
    return f"ip:{get_remote_address(request)}"

# Fail-safe Redis connection check
storage_uri = "memory://"
redis_url = settings.resolved_redis_url
try:
    if redis_url:
        # Check connection using a short timeout to prevent startup hangs
        r = redis.Redis.from_url(redis_url, socket_connect_timeout=2.0, socket_timeout=2.0)
        if r.ping():
            storage_uri = redis_url
            logger.info("[Rate Limiter] Successfully connected to Upstash Redis storage backend.")
except Exception as e:
    logger.warning(
        f"[Rate Limiter] Failed to connect to Redis at {redis_url} ({e}). "
        "Falling back to MemoryStorage for rate limiting."
    )
    storage_uri = "memory://"

# Initialize slowapi Limiter
limiter = Limiter(
    key_func=get_user_id_from_jwt,
    storage_uri=storage_uri,
    headers_enabled=True,
    swallow_errors=True,
    in_memory_fallback_enabled=True,
    default_limits=[
        f"{settings.rate_limit_per_minute}/minute",
        f"{settings.rate_limit_per_day}/day"
    ]
)
