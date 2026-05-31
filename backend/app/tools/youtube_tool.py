import logging
import asyncio
import re
from typing import List
import httpx
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from youtube_transcript_api import YouTubeTranscriptApi

from app.tools.utils import with_timeout_and_retry

logger = logging.getLogger("researchmind.tools")

class YouTubeTranscriptResult(BaseModel):
    transcript: str = Field(..., description="Transcript of the video content")
    video_title: str = Field(..., description="Title of the YouTube video")
    url: str = Field(..., description="URL of the video source")

def extract_video_id(url: str) -> str | None:
    """Extract video ID from various YouTube URL formats."""
    patterns = [
        r'(?:v=|\/v\/|embed\/|youtu\.be\/|\/embed\/|\/watch\?v=|\/watch\?.+&v=)([^#\&\?]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

async def fetch_video_title(video_id: str) -> str:
    """Fetches video HTML metadata to parse the exact video title without requiring an API key."""
    watch_url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            response = await client.get(watch_url, headers=headers)
            if response.status_code == 200:
                title_match = re.search(r"<title>(.*?)</title>", response.text)
                if title_match:
                    title = title_match.group(1).strip()
                    # Clean the typical " - YouTube" suffix
                    if title.endswith("- YouTube"):
                        title = title[:-9].strip()
                    return title
    except Exception as e:
        logger.debug(f"[YouTube Tool] Failed to fetch video title: {e}")
    return f"YouTube Video ID: {video_id}"

def sync_get_transcript(video_id: str) -> str:
    """Wrapper to run the synchronous YouTube transcript fetch in a thread pool."""
    transcript_list = YouTubeTranscriptApi().fetch(video_id)
    # Join entries into a single text block dynamically handling dict or object structure
    text_pieces = []
    for entry in transcript_list:
        if hasattr(entry, "text"):
            text_pieces.append(entry.text)
        elif isinstance(entry, dict) and "text" in entry:
            text_pieces.append(entry["text"])
        else:
            try:
                text_pieces.append(entry.get("text", ""))
            except Exception:
                text_pieces.append(str(entry))
                
    full_text = " ".join(text_pieces)
    # Truncate if exceptionally long to avoid contextual overloading
    if len(full_text) > 10000:
        full_text = full_text[:10000] + "\n[Transcript truncated due to length limits]"
    return full_text

@tool
@with_timeout_and_retry(timeout_seconds=5.0, max_retries=1)
async def youtube_transcript(url: str) -> List[YouTubeTranscriptResult]:
    """
    Fetch transcript from YouTube videos for video content analysis.
    Input should be a YouTube video URL string.
    """
    video_id = extract_video_id(url)
    if not video_id:
        logger.warning(f"[YouTube Tool] Could not extract video ID from '{url}'")
        return []

    # Run transcript fetch in a separate thread and fetch title concurrently
    try:
        transcript_task = asyncio.to_thread(sync_get_transcript, video_id)
        title_task = fetch_video_title(video_id)
        
        transcript_text, title = await asyncio.gather(transcript_task, title_task)
        
        return [
            YouTubeTranscriptResult(
                transcript=transcript_text,
                video_title=title,
                url=url
            )
        ]
    except Exception as e:
        logger.error(f"[YouTube Tool] Failed to process video {video_id}: {e}")
        return []
