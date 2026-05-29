from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.database import get_database
from app.api.routes.sources import run_ingestion_pipeline
from bson import ObjectId

scheduler = AsyncIOScheduler()

async def refresh_url_sources():
    """
    Daily recrawl job: Find all 'url' sources and re-run their ingestion.
    """
    print("Starting daily URL recrawl scheduler job...")
    db = get_database()
    cursor = db.sources.find({"file_type": "url", "status": {"$ne": "failed"}})
    url_sources = await cursor.to_list(length=100)
    
    for source in url_sources:
        source_id = source["_id"]
        user_id = source["user_id"]
        url = source.get("source_url") or source.get("s3_url")
        print(f"Scheduling recrawl for source: {source['filename']} (ID: {source_id})")
        await run_ingestion_pipeline(source_id=source_id, user_id=user_id, file_type="url", url=url)

async def refresh_youtube_sources():
    """
    Weekly YouTube refresh job: Refreshes YouTube transcripts in case subtitles got updated.
    """
    print("Starting weekly YouTube transcript refresh scheduler job...")
    db = get_database()
    cursor = db.sources.find({"file_type": "youtube", "status": {"$ne": "failed"}})
    yt_sources = await cursor.to_list(length=100)
    
    for source in yt_sources:
        source_id = source["_id"]
        user_id = source["user_id"]
        url = source.get("source_url") or source.get("s3_url")
        print(f"Scheduling refresh for YouTube source: {source['filename']} (ID: {source_id})")
        await run_ingestion_pipeline(source_id=source_id, user_id=user_id, file_type="youtube", url=url)

def start_scheduler():
    if not scheduler.running:
        # Add daily job at 2 AM
        scheduler.add_job(refresh_url_sources, "cron", hour=2, minute=0, id="url_recrawl_job", replace_existing=True)
        # Add weekly job on Sunday at 3 AM
        scheduler.add_job(refresh_youtube_sources, "cron", day_of_week="sun", hour=3, minute=0, id="youtube_refresh_job", replace_existing=True)
        scheduler.start()
        print("Background scheduler started successfully.")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("Background scheduler shut down successfully.")
