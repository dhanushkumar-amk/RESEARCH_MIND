from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies.auth import get_current_user
from app.core.database import get_database
from datetime import datetime, timezone

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("")
async def get_user_settings(current_user: dict = Depends(get_current_user)):
    """Fetch settings for the current user, fallback to defaults if not created."""
    db = get_database()
    user_id = str(current_user["_id"])
    settings_doc = await db.user_settings.find_one({"user_id": user_id})
    if not settings_doc:
        return {
            "user_id": user_id,
            "theme": "light",
            "llm_preference": "groq/llama-3.3-70b-versatile",
            "topic_preferences": [],
            "notifications_enabled": True
        }
    if "_id" in settings_doc:
        settings_doc["id"] = str(settings_doc["_id"])
        del settings_doc["_id"]
    return settings_doc

@router.put("")
async def update_user_settings(data: dict, current_user: dict = Depends(get_current_user)):
    """Upsert settings configuration for the current authenticated user."""
    db = get_database()
    user_id = str(current_user["_id"])
    
    # Clean payload keys
    payload = dict(data)
    payload.pop("user_id", None)
    payload.pop("_id", None)
    payload.pop("id", None)
    
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": {**payload, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "Settings saved successfully.", "settings": payload}

@router.delete("/data")
async def delete_all_user_data(current_user: dict = Depends(get_current_user)):
    """Purge all user-related data (sources, chunks, chat histories, sessions)."""
    db = get_database()
    user_id = str(current_user["_id"])
    
    try:
        # Delete chat logs and sessions
        await db.chat_history.delete_many({"user_id": user_id})
        await db.sessions.delete_many({"user_id": user_id})
        
        # Delete document references and search vector chunks
        cursor = db.sources.find({"user_id": user_id})
        sources = await cursor.to_list(length=1000)
        source_ids = [s["_id"] for s in sources]
        
        if source_ids:
            await db.chunks.delete_many({"source_id": {"$in": source_ids}})
            await db.sources.delete_many({"user_id": user_id})
            
        # Delete user preferences
        await db.user_settings.delete_one({"user_id": user_id})
        await db.feedbacks.delete_many({"user_id": user_id})
        
        return {"message": "All database histories and records deleted successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Wipe operation failed: {str(e)}"
        )
