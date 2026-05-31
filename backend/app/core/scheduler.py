import asyncio
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
    
    semaphore = asyncio.Semaphore(5)
    
    async def recrawl_task(source):
        async with semaphore:
            source_id = source["_id"]
            user_id = source["user_id"]
            url = source.get("source_url") or source.get("s3_url")
            print(f"Scheduling recrawl for source: {source['filename']} (ID: {source_id})")
            try:
                await run_ingestion_pipeline(source_id=source_id, user_id=user_id, file_type="url", url=url)
            except Exception as e:
                print(f"Error recrawling source {source_id}: {e}")
                
    await asyncio.gather(*(recrawl_task(source) for source in url_sources))

async def refresh_youtube_sources():
    """
    Weekly YouTube refresh job: Refreshes YouTube transcripts in case subtitles got updated.
    """
    print("Starting weekly YouTube transcript refresh scheduler job...")
    db = get_database()
    cursor = db.sources.find({"file_type": "youtube", "status": {"$ne": "failed"}})
    yt_sources = await cursor.to_list(length=100)
    
    semaphore = asyncio.Semaphore(5)
    
    async def refresh_task(source):
        async with semaphore:
            source_id = source["_id"]
            user_id = source["user_id"]
            url = source.get("source_url") or source.get("s3_url")
            print(f"Scheduling refresh for YouTube source: {source['filename']} (ID: {source_id})")
            try:
                await run_ingestion_pipeline(source_id=source_id, user_id=user_id, file_type="youtube", url=url)
            except Exception as e:
                print(f"Error refreshing YouTube source {source_id}: {e}")
                
    await asyncio.gather(*(refresh_task(source) for source in yt_sources))

def start_scheduler():
    if not scheduler.running:
        # Add daily job at 2 AM
        scheduler.add_job(refresh_url_sources, "cron", hour=2, minute=0, id="url_recrawl_job", replace_existing=True)
        # Add weekly job on Sunday at 3 AM
        scheduler.add_job(refresh_youtube_sources, "cron", day_of_week="sun", hour=3, minute=0, id="youtube_refresh_job", replace_existing=True)
        # Add daily RAGAS evaluation job at 2 AM
        from app.evaluation.scheduler import run_nightly_evaluation
        scheduler.add_job(run_nightly_evaluation, "cron", hour=2, minute=0, id="nightly_evaluation_job", replace_existing=True)
        scheduler.start()
        print("Background scheduler started successfully.")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("Background scheduler shut down successfully.")
