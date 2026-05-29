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

    def split_text(self, pages: list[dict], chunk_size: int = 512, chunk_overlap: int = 50) -> list[dict]:
        """
        Splits plaintext pages into semantic chunks while preserving their page numbers.
        """
        if not pages:
            return []

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=self.get_token_count
        )

        all_chunks = []
        overall_index = 0

        for page in pages:
            page_text = page.get("text", "")
            page_num = page.get("page_number", 1)
            
            cleaned_text = self.clean_text(page_text)
            if not cleaned_text:
                continue

            raw_chunks = splitter.split_text(cleaned_text)
            for chunk_text in raw_chunks:
                all_chunks.append({
                    "text": chunk_text,
                    "token_count": self.get_token_count(chunk_text),
                    "chunk_index": overall_index,
                    "page_number": page_num
                })
                overall_index += 1
            
        return all_chunks
