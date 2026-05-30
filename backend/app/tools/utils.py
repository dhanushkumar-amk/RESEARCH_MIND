import asyncio
import logging
from typing import Callable, Any, TypeVar, Coroutine, List
from functools import wraps

logger = logging.getLogger("researchmind.tools")

T = TypeVar("T")

def with_timeout_and_retry(timeout_seconds: float = 5.0, max_retries: int = 1):
    """
    A decorator to wrap an async tool function with a timeout and retry mechanism.
    If the function execution exceeds `timeout_seconds`, it retries up to `max_retries` times.
    On persistent timeout or any other exception, it logs the error and safely returns an empty list [].
    """
    def decorator(func: Callable[..., Coroutine[Any, Any, List[T]]]) -> Callable[..., Coroutine[Any, Any, List[T]]]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> List[T]:
            attempts = max_retries + 1
            for attempt in range(attempts):
                try:
                    # Enforce timeout using asyncio.wait_for
                    return await asyncio.wait_for(func(*args, **kwargs), timeout=timeout_seconds)
                except asyncio.TimeoutError:
                    logger.warning(
                        f"[Tool {func.__name__}] Attempt {attempt + 1}/{attempts} timed out after {timeout_seconds}s."
                    )
                    if attempt == attempts - 1:
                        logger.error(f"[Tool {func.__name__}] All {attempts} attempts timed out. Returning empty list.")
                        return []
                    # Wait briefly before retrying
                    await asyncio.sleep(0.5)
                except Exception as e:
                    logger.error(
                        f"[Tool {func.__name__}] Exception occurred during execution: {e}",
                        exc_info=True
                    )
                    return []
            return []
        return wrapper
    return decorator
