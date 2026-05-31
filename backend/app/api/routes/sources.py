from datetime import datetime, timezone
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks
from bson import ObjectId
from typing import List
from urllib.parse import urlparse

from app.dependencies.auth import get_current_user
from app.core.database import get_database
from app.services.s3_service import S3Service
from app.services.vector_service import VectorService
from app.schemas.sources import SourceResponse, UrlIngestRequest, YoutubeIngestRequest
from app.services.extractor_service import ExtractorService
from app.services.chunker_service import ChunkerService
from app.services.embedding_service import EmbeddingService

router = APIRouter(prefix="", tags=["Sources"])
s3_service = S3Service()
vector_service = VectorService()
extractor_service = ExtractorService()
chunker_service = ChunkerService()
embedding_service = EmbeddingService()

# Allowed file extensions
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".txt"}

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

async def _serialize_mongo_doc(doc: dict) -> dict:
    """Helper to convert MongoDB object IDs to strings and generate S3 presigned URLs."""
    if not doc:
        return doc
    # Deep copy or modify in place
    serialized = dict(doc)
    if "_id" in serialized:
        serialized["id"] = str(serialized["_id"])
        del serialized["_id"]
    # If S3 key is stored, generate a temporary presigned URL for secure access
    s3_url = serialized.get("s3_url")
    if s3_url and s3_url.startswith("researchmind/"):
        serialized["s3_url"] = s3_service.generate_presigned_url(s3_url)
    
    # 20-year experience tip: Avoid redundant count_documents query for files in-progress
    # or files that already have the chunk_count cached.
    if serialized.get("chunk_count") is None:
        if serialized.get("status") == "indexed":
            db = get_database()
            serialized["chunk_count"] = await db.chunks.count_documents({"source_id": doc["_id"] if "_id" in doc else ObjectId(serialized["id"])})
        else:
            serialized["chunk_count"] = 0
    return serialized

async def run_ingestion_pipeline(
    source_id: ObjectId,
    user_id: str,
    file_bytes: bytes = None,
    file_type: str = None,
    url: str = None
):
    """
    Production-grade ETL Ingestion Pipeline:
    1. Extract (yields page-level [{"text": str, "page_number": int}])
    2. Chunk (splits text per page semantically)
    3. Embed (batch processed on CPU in 384 dimensions)
    4. Index (inserts into MongoDB vector chunks collection)
    """
    db = get_database()
    
    async def update_status(status_str: str, error_reason: str = None):
        await db.sources.update_one(
            {"_id": source_id},
            {"$set": {
                "status": status_str,
                "error_reason": error_reason,
                "updated_at": _utcnow()
            }}
        )

    try:
        # Load source document if needed to get source_url or metadata
        source_doc = await db.sources.find_one({"_id": source_id})
        if not source_doc:
            raise ValueError(f"Source document {source_id} not found in database.")

        # --- Step 1: Extraction ---
        await update_status("extracting")
        
        pages = []
        if file_bytes:
            pages = extractor_service.extract_text(file_bytes, file_type)
        elif file_type == "url":
            if not url:
                url = source_doc.get("source_url") or source_doc.get("s3_url")
            if not url or url.startswith("researchmind/"):
                raise ValueError("No valid URL found for recrawl/scraping.")
            text = extractor_service.extract_url(url)
            pages = [{"text": text, "page_number": 1}]
            # Upload raw scraped text to S3
            s3_key = f"researchmind/{user_id}/scraped/{source_id}.txt"
            await s3_service.upload_bytes(text.encode("utf-8"), s3_key, content_type="text/plain")
            # Update database to store S3 key path
            await db.sources.update_one({"_id": source_id}, {"$set": {"s3_url": s3_key}})
        elif file_type == "youtube":
            if not url:
                url = source_doc.get("source_url") or source_doc.get("s3_url")
            if not url or url.startswith("researchmind/"):
                raise ValueError("No valid YouTube URL found for recrawl/scraping.")
            text = extractor_service.extract_youtube(url)
            pages = [{"text": text, "page_number": 1}]
            # Upload raw transcript text to S3
            s3_key = f"researchmind/{user_id}/transcripts/{source_id}.txt"
            await s3_service.upload_bytes(text.encode("utf-8"), s3_key, content_type="text/plain")
            # Update database to store S3 key path
            await db.sources.update_one({"_id": source_id}, {"$set": {"s3_url": s3_key}})
        else:
            raise ValueError("No valid ingestion source input was provided.")

        # --- Step 2: Chunking ---
        await update_status("chunking")
        chunks = chunker_service.split_text(pages)
        if not chunks:
            raise ValueError("No text chunks could be extracted from this source.")

        # --- Step 3: Embedding ---
        await update_status("embedding")
        chunk_texts = [c["text"] for c in chunks]
        embeddings = embedding_service.get_embeddings(chunk_texts)

        # --- Step 4: Indexing ---
        await update_status("indexing")
        source_metadata = {
            "filename": source_doc.get("filename", ""),
            "file_type": source_doc.get("file_type", "")
        }
        await vector_service.save_chunks(source_id, user_id, chunks, embeddings, source_metadata)

        # --- Done ---
        await update_status("indexed")
        print(f"Successfully processed and indexed source {source_id} for user {user_id}")
        
        # Refresh the BM25 index with the newly added chunks
        try:
            from app.api.routes.chat import init_bm25_retriever
            await init_bm25_retriever()
        except Exception as e:
            print(f"[RAG Pipeline] Error refreshing BM25 retriever cache on ingestion: {e}")


    except Exception as e:
        error_msg = str(e)
        print(f"Error processing source {source_id}: {error_msg}")
        await update_status("failed", error_reason=error_msg)


@router.post("/upload", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Step 1: Upload document to S3/local storage and store metadata in MongoDB.
    Validates file type.
    """
    filename = file.filename
    file_ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    user_id = str(current_user["_id"])
    source_id = ObjectId()
    # Mirror structure: researchmind/{user_id}/documents/{file_id}
    s3_key = f"researchmind/{user_id}/documents/{source_id}{file_ext}"

    # Read bytes for background task before S3 upload closes stream
    file_bytes = await file.read()

    # Upload to S3 (returns s3_key)
    s3_url = await s3_service.upload_file(file, s3_key)

    # Save metadata to MongoDB
    now = _utcnow()
    source_doc = {
        "_id": source_id,
        "user_id": user_id,
        "filename": filename,
        "file_type": file_ext.lstrip("."),
        "file_size": file.size,
        "s3_url": s3_url,
        "status": "uploaded",
        "error_reason": None,
        "created_at": now,
        "updated_at": now
    }

    db = get_database()
    await db.sources.insert_one(source_doc)

    # Trigger background ETL
    background_tasks.add_task(
        run_ingestion_pipeline,
        source_id=source_id,
        user_id=user_id,
        file_bytes=file_bytes,
        file_type=file_ext.lstrip(".")
    )

    return await _serialize_mongo_doc(source_doc)


@router.post("/ingest/url", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def ingest_url(
    background_tasks: BackgroundTasks,
    payload: UrlIngestRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Step 4: URL scraping trigger.
    """
    url = payload.url.strip()
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL format. Scheme (http/https) and domain name are required."
        )

    user_id = str(current_user["_id"])
    source_id = ObjectId()
    now = _utcnow()

    filename = parsed.netloc + parsed.path
    if filename.endswith("/"):
        filename = filename[:-1]

    source_doc = {
        "_id": source_id,
        "user_id": user_id,
        "filename": filename or url,
        "file_type": "url",
        "file_size": None,
        "s3_url": url,  # Temporarily store source URL; replaced with S3 key inside pipeline
        "source_url": url,  # Keep the original source URL for recrawls
        "status": "uploaded",
        "error_reason": None,
        "created_at": now,
        "updated_at": now
    }

    db = get_database()
    await db.sources.insert_one(source_doc)

    # Trigger background ETL
    background_tasks.add_task(
        run_ingestion_pipeline,
        source_id=source_id,
        user_id=user_id,
        file_bytes=None,
        file_type="url",
        url=url
    )

    return await _serialize_mongo_doc(source_doc)


@router.post("/ingest/youtube", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def ingest_youtube(
    background_tasks: BackgroundTasks,
    payload: YoutubeIngestRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Step 5: YouTube trigger.
    """
    url = payload.url.strip()
    if "youtube.com" not in url and "youtu.be" not in url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid YouTube URL. Must contain youtube.com or youtu.be"
        )

    user_id = str(current_user["_id"])
    source_id = ObjectId()
    now = _utcnow()

    source_doc = {
        "_id": source_id,
        "user_id": user_id,
        "filename": f"YouTube: {url}",
        "file_type": "youtube",
        "file_size": None,
        "s3_url": url,  # Temporarily store source URL; replaced with S3 key inside pipeline
        "source_url": url,  # Keep the original source URL for refreshes
        "status": "uploaded",
        "error_reason": None,
        "created_at": now,
        "updated_at": now
    }

    db = get_database()
    await db.sources.insert_one(source_doc)

    # Trigger background ETL
    background_tasks.add_task(
        run_ingestion_pipeline,
        source_id=source_id,
        user_id=user_id,
        file_bytes=None,
        file_type="youtube",
        url=url
    )

    return await _serialize_mongo_doc(source_doc)


@router.get("/sources", response_model=List[SourceResponse])
async def list_sources(
    current_user: dict = Depends(get_current_user)
):
    """
    Step 9: List all sources for the current authenticated user (with presigned S3 URLs).
    """
    db = get_database()
    cursor = db.sources.find({"user_id": str(current_user["_id"])})
    sources = await cursor.to_list(length=100)
    return [await _serialize_mongo_doc(src) for src in sources]


@router.get("/sources/{source_id}/status", response_model=SourceResponse)
async def get_source_status(
    source_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Step 9: Get the status of a specific source (with presigned S3 URL).
    """
    if not ObjectId.is_valid(source_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid source ID format."
        )

    db = get_database()
    source = await db.sources.find_one({
        "_id": ObjectId(source_id),
        "user_id": str(current_user["_id"])
    })
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found."
        )

    return await _serialize_mongo_doc(source)


@router.delete("/sources/{source_id}", status_code=status.HTTP_200_OK)
async def delete_source(
    source_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a source and remove its corresponding storage files and vector chunks.
    """
    if not ObjectId.is_valid(source_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid source ID format."
        )

    db = get_database()
    source = await db.sources.find_one({
        "_id": ObjectId(source_id),
        "user_id": str(current_user["_id"])
    })
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found or access denied."
        )

    # Delete original / scraped files from S3 if key exists
    if source.get("s3_url") and source["s3_url"].startswith("researchmind/"):
        await s3_service.delete_file(source["s3_url"])

    # Delete all semantic chunks and vector embeddings associated with this source
    await vector_service.delete_source_chunks(ObjectId(source_id))

    await db.sources.delete_one({"_id": ObjectId(source_id)})
    
    # Refresh the BM25 index after chunks are deleted
    try:
        from app.api.routes.chat import init_bm25_retriever
        await init_bm25_retriever()
    except Exception as e:
        print(f"[RAG Pipeline] Error refreshing BM25 retriever cache on deletion: {e}")
        
    return {"message": "Source deleted successfully."}
