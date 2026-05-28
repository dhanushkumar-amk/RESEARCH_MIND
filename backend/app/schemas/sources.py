from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class SourceResponse(BaseModel):
    id: str
    user_id: str
    filename: str
    file_type: str
    file_size: Optional[int] = None
    s3_url: Optional[str] = None
    status: str
    error_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UrlIngestRequest(BaseModel):
    url: str

class YoutubeIngestRequest(BaseModel):
    url: str

