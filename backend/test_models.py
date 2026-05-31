import asyncio
import os
from dotenv import load_dotenv
from langchain_litellm import ChatLiteLLM

load_dotenv()

async def main():
    models = [
        "groq/llama-3.3-70b-versatile",
        "groq/llama-3.1-8b-instant",
        "gemini/gemini-1.5-flash",
        "gemini/gemini-1.5-pro",
    ]
    
    for model in models:
        try:
            print(f"Testing model: {model} ...")
            llm = ChatLiteLLM(
                model=model,
                temperature=0.0,
                max_tokens=10
            )
            resp = await llm.ainvoke("Hi, reply with 'ok'")
            print(f"  -> SUCCESS: {resp.content.strip()}")
        except Exception as e:
            print(f"  -> FAILED: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
