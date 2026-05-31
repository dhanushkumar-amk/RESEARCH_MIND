import asyncio
import os
from dotenv import load_dotenv
from langchain_litellm import ChatLiteLLM

load_dotenv()

async def test_keys():
    out = []
    out.append(f"GROQ_API_KEY: {os.getenv('GROQ_API_KEY')[:10] if os.getenv('GROQ_API_KEY') else None}")
    out.append(f"GEMINI_API_KEY: {os.getenv('GEMINI_API_KEY')[:10] if os.getenv('GEMINI_API_KEY') else None}")
    
    # Test Gemini
    try:
        out.append("Testing Gemini model...")
        llm = ChatLiteLLM(
            model="gemini/gemini-1.5-flash",
            temperature=0.0,
            api_key=os.getenv("GEMINI_API_KEY")
        )
        resp = await llm.ainvoke("Hi, reply with one word: 'hello'.")
        out.append(f"Gemini response: {resp.content}")
    except Exception as e:
        out.append(f"Gemini error: {e}")

    # Test Groq
    try:
        out.append("Testing Groq model...")
        llm = ChatLiteLLM(
            model="groq/llama-3.1-8b-instant",
            temperature=0.0,
            api_key=os.getenv("GROQ_API_KEY")
        )
        resp = await llm.ainvoke("Hi, reply with one word: 'hello'.")
        out.append(f"Groq response: {resp.content}")
    except Exception as e:
        out.append(f"Groq error: {e}")

    with open("key_results.txt", "w") as f:
        f.write("\n".join(out))
    print("Done writing key_results.txt")

if __name__ == "__main__":
    asyncio.run(test_keys())
