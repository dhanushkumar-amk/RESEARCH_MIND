from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class SourceDocument(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    filename: str
    file_type: str  # e.g., 'pdf', 'docx', 'xlsx', 'txt', 'url', 'youtube'
    file_size: Optional[int] = None  # None for URLs
    s3_url: Optional[str] = None     # S3 URL if uploaded, or website URL
    status: str  # 'uploaded', 'extracting', 'chunking', 'embedding', 'indexing', 'indexed', 'failed'
    error_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )
