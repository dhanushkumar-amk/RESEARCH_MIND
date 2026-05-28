from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from bson import ObjectId
from typing import List

from app.dependencies.auth import get_current_user
from app.core.database import get_database
from app.services.s3_service import S3Service
from app.schemas.sources import SourceResponse, UrlIngestRequest, YoutubeIngestRequest
from urllib.parse import urlparse

router = APIRouter(prefix="", tags=["Sources"])
s3_service = S3Service()

# Allowed file extensions
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".txt"}

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

def _serialize_mongo_doc(doc: dict) -> dict:
    """Helper to convert MongoDB object IDs to strings."""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

@router.post("/upload", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Step 1: Upload document to storage (S3 or local mock) and store metadata in MongoDB.
    Validates that the file type is PDF, Word, Excel, or TXT.
    """
    # 1. Type validation
    filename = file.filename
    file_ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 2. Generate unique storage key and metadata
    user_id = str(current_user["_id"])
    source_id = ObjectId()
    s3_key = f"{user_id}/{source_id}{file_ext}"

    # 3. Upload to S3 / Local Storage
    s3_url = await s3_service.upload_file(file, s3_key)

    # 4. Save metadata to MongoDB
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

    return _serialize_mongo_doc(source_doc)


@router.post("/ingest/url", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def ingest_url(
    payload: UrlIngestRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Step 4: URL scraping trigger. Validates the URL format and saves metadata.
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

    # Use the domain/path as the filename
    filename = parsed.netloc + parsed.path
    if filename.endswith("/"):
        filename = filename[:-1]

    source_doc = {
        "_id": source_id,
        "user_id": user_id,
        "filename": filename or url,
        "file_type": "url",
        "file_size": None,
        "s3_url": url,  # For URLs, s3_url stores the source web URL
        "status": "uploaded",
        "error_reason": None,
        "created_at": now,
        "updated_at": now
    }

    db = get_database()
    await db.sources.insert_one(source_doc)
    return _serialize_mongo_doc(source_doc)


@router.post("/ingest/youtube", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def ingest_youtube(
    payload: YoutubeIngestRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Step 5: YouTube trigger. Validates YouTube URL and saves metadata.
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
        "s3_url": url,  # For YouTube, s3_url stores the video URL
        "status": "uploaded",
        "error_reason": None,
        "created_at": now,
        "updated_at": now
    }

    db = get_database()
    await db.sources.insert_one(source_doc)
    return _serialize_mongo_doc(source_doc)


@router.get("", response_model=List[SourceResponse])
async def list_sources(
    current_user: dict = Depends(get_current_user)
):
    """
    Step 9: List all sources for the current authenticated user.
    """
    db = get_database()
    cursor = db.sources.find({"user_id": str(current_user["_id"])})
    sources = await cursor.to_list(length=100)
    return [_serialize_mongo_doc(src) for src in sources]


@router.get("/{source_id}/status", response_model=SourceResponse)
async def get_source_status(
    source_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Step 9: Get the ingestion status of a specific source.
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

    return _serialize_mongo_doc(source)


@router.delete("/{source_id}", status_code=status.HTTP_200_OK)
async def delete_source(
    source_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a source and remove its file from S3 / Local storage.
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

    # Delete from S3 / local storage if it's a file
    if source["file_type"] in {"pdf", "docx", "xlsx", "txt"} and source.get("s3_url"):
        s3_key = f"{source['user_id']}/{source['_id']}.{source['file_type']}"
        await s3_service.delete_file(s3_key)

    await db.sources.delete_one({"_id": ObjectId(source_id)})
    return {"message": "Source deleted successfully."}
