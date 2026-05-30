import json
import time
import asyncio
from langchain_core.callbacks import BaseCallbackHandler

class SSEStreamingCallbackHandler(BaseCallbackHandler):
    def __init__(self, queue: asyncio.Queue):
        self.queue = queue
        self.latency_start = 0
        self.model_name = "Unknown"

    def on_llm_start(self, serialized: dict, prompts: list, **kwargs) -> None:
        self.latency_start = time.time()
        if kwargs and "invocation_params" in kwargs:
            self.model_name = kwargs["invocation_params"].get("model", "Unknown")
        elif serialized and "name" in serialized:
            self.model_name = serialized["name"]

    def on_llm_new_token(self, token: str, **kwargs) -> None:
        event = {
            "event": "token",
            "data": json.dumps({"token": token})
        }
        self.queue.put_nowait(event)

    def on_llm_end(self, response, **kwargs) -> None:
        latency_ms = int((time.time() - self.latency_start) * 1000)
        tokens_used = 0
        if response and response.llm_output:
            tokens_used = response.llm_output.get("token_usage", {}).get("total_tokens", 0)
        
        # Yield metadata event
        event = {
            "event": "metadata",
            "data": json.dumps({
                "model_used": self.model_name,
                "tokens_used": tokens_used,
                "latency_ms": latency_ms
            })
        }
        self.queue.put_nowait(event)
        # Yield done event
        self.queue.put_nowait({
            "event": "done",
            "data": json.dumps({"status": "complete"})
        })

    def on_llm_error(self, error: Exception, **kwargs) -> None:
        event = {
            "event": "error",
            "data": json.dumps({"message": str(error)})
        }
        self.queue.put_nowait(event)

def format_sse(event_name: str, data: dict) -> str:
    """Format event name and data dict to standard SSE string payload."""
    return f"event: {event_name}\ndata: {json.dumps(data)}\n\n"
