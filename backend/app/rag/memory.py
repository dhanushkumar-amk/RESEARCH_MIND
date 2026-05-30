import asyncio
from datetime import datetime
from langchain_core.messages import HumanMessage, AIMessage
from langchain_litellm import ChatLiteLLM
from langchain_classic.memory import ConversationSummaryMemory
import tiktoken

from app.core.config import settings

# Initialize cheap model for conversation summary
summary_llm = ChatLiteLLM(
    model="groq/llama-3.1-8b",
    temperature=0.0,
    max_tokens=500
)

summary_memory = ConversationSummaryMemory(llm=summary_llm)

try:
    encoding = tiktoken.get_encoding("cl100k_base")
except Exception:
    encoding = tiktoken.encoding_for_model("gpt-4")

def count_tokens(text: str) -> int:
    return len(encoding.encode(text))

async def get_session_history_and_summary(user_id: str, session_id: str, db) -> str:
    """
    Retrieve conversation history, auto-summarizing via ConversationSummaryMemory
    if history dialogue exceeds the 2400-token budget.
    """
    history_cursor = db.chat_history.find(
        {"user_id": user_id, "session_id": session_id}
    ).sort("created_at", 1).limit(20)
    history_docs = await history_cursor.to_list(length=20)
    
    messages = []
    dialogue_parts = []
    
    for h in history_docs:
        role = h["role"]
        content = h["content"]
        if role == "user":
            messages.append(HumanMessage(content=content))
            dialogue_parts.append(f"Human: {content}")
        else:
            messages.append(AIMessage(content=content))
            dialogue_parts.append(f"AI: {content}")
        
    dialogue = "\n".join(dialogue_parts).strip()
    
    if count_tokens(dialogue) > 2400:
        print("[RAG Memory] Conversation history exceeds 2400 tokens. Generating summary via ConversationSummaryMemory...")
        summary = await asyncio.to_thread(
            summary_memory.predict_new_summary,
            messages,
            existing_summary=""
        )
        return f"Summary of previous conversation:\n{summary}"
        
    return dialogue
