import re
from youtube_transcript_api import YouTubeTranscriptApi
from langchain_core.tools import tool

def extract_video_id(url: str) -> str | None:
    """Helper to extract video ID from various YouTube URL formats."""
    patterns = [
        r'(?:v=|\/v\/|embed\/|youtu\.be\/|\/embed\/|\/watch\?v=|\/watch\?.+&v=)([^#\&\?]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

@tool
def youtube_transcript(url: str) -> str:
    """
    Fetch the full transcript text of a YouTube video given its URL.
    Input should be a complete YouTube URL.
    """
    video_id = extract_video_id(url)
    if not video_id:
        return f"Could not extract a valid YouTube video ID from URL: '{url}'"
        
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        full_text = " ".join([entry["text"] for entry in transcript_list])
        
        # Limit text length to avoid token bloating in contexts
        if len(full_text) > 10000:
            full_text = full_text[:10000] + "\n[Transcript truncated due to length limits]"
            
        return f"Video URL: {url}\nVideo ID: {video_id}\nTranscript:\n{full_text}"
    except Exception as e:
        return f"Exception occurred while fetching YouTube transcript: {str(e)}"
