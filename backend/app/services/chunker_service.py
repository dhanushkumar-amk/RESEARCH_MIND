import re
import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter

class ChunkerService:
    def __init__(self):
        # Initialize tiktoken encoder for cl100k_base (OpenAI/modern standards)
        try:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except Exception:
            self.tokenizer = None

    def clean_text(self, text: str) -> str:
        """
        Cleans up raw text: removes extra newlines, normalizes spaces,
        and strips non-printable control characters.
        """
        if not text:
            return ""
        # Replace multiple spaces with a single space
        text = re.sub(r"[ \t]+", " ", text)
        # Normalize multiple newlines to max double newlines
        text = re.sub(r"\n\s*\n+", "\n\n", text)
        return text.strip()

    def get_token_count(self, text: str) -> int:
        """
        Measures exact token counts of text chunks.
        """
        if not text:
            return 0
        if self.tokenizer:
            return len(self.tokenizer.encode(text))
        # Fallback approximation (words * 1.3)
        return len(text.split())

    def split_text(self, text: str, chunk_size: int = 512, chunk_overlap: int = 50) -> list[dict]:
        """
        Splits plaintext into semantic chunks using RecursiveCharacterTextSplitter
        and calculates token counts.
        """
        cleaned = self.clean_text(text)
        if not cleaned:
            return []

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=self.get_token_count
        )

        raw_chunks = splitter.split_text(cleaned)
        
        chunks = []
        for i, chunk_text in enumerate(raw_chunks):
            chunks.append({
                "text": chunk_text,
                "token_count": self.get_token_count(chunk_text),
                "chunk_index": i
            })
            
        return chunks
