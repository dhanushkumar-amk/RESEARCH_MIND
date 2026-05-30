from langchain_core.documents import Document
import tiktoken
from app.rag.memory import count_tokens

def reorder_context_chunks(chunks: list[Document]) -> list[Document]:
    """
    Reorder documents to mitigate 'lost in the middle' phenomenon.
    Places the most relevant chunk at the start (index 0) and the second most at the end,
    with less relevant chunks in the middle.
    """
    n = len(chunks)
    if n <= 2:
        return chunks
    
    # Sort remaining chunks in the middle
    return [chunks[0]] + chunks[2:] + [chunks[1]]

def format_chunks_with_lost_in_the_middle(docs: list[Document], max_tokens: int = 3200) -> tuple[str, list[dict]]:
    """
    Formats documents within a strict 3200-token budget.
    """
    ordered_docs = reorder_context_chunks(docs)
    context_parts = []
    current_tokens = 0
    included_sources = []

    for doc in ordered_docs:
        meta = doc.metadata
        filename = meta.get("filename", "Unknown")
        page_num = meta.get("page_number", 1)
        score = meta.get("relevance_score", 0.0)
        
        # Format each chunk with source name and page number
        formatted_chunk = f"[Source: {filename}, Page: {page_num}]\n{doc.page_content}\n\n"
        chunk_tokens = count_tokens(formatted_chunk)
        
        if current_tokens + chunk_tokens <= max_tokens:
            context_parts.append(formatted_chunk)
            current_tokens += chunk_tokens
            included_sources.append({
                "title": filename,
                "chunk": doc.page_content,
                "score": score
            })
        else:
            break
            
    return "".join(context_parts).strip(), included_sources
