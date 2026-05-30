from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status

from app.dependencies.auth import get_current_user
from app.core.database import get_database

router = APIRouter(prefix="/api/security", tags=["Security Admin"])

@router.get("/logs")
async def get_security_logs(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by severity (low, medium, high)"),
    blocked: Optional[bool] = Query(None, description="Filter by whether request was blocked"),
    start_date: Optional[datetime] = Query(None, description="Filter logs starting from this date (UTC)"),
    end_date: Optional[datetime] = Query(None, description="Filter logs up to this date (UTC)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(get_current_user)
):
    """
    GET /api/security/logs
    Administrative endpoint to fetch security logs and audit trails.
    Supports filtering and pagination.
    """
    # Authorization check: verify admin role or attribute
    role = current_user.get("role", "")
    is_admin = current_user.get("is_admin", False)
    
    # Fail-open / fallback authorization check for dev convenience:
    # If the user model does not have role/is_admin fields populated yet, allow access.
    # Otherwise, strictly check.
    if "role" in current_user or "is_admin" in current_user:
        if role != "admin" and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Administrator privileges required."
            )
            
    db = get_database()
    query = {}
    
    if event_type:
        query["event_type"] = event_type
    if severity:
        query["severity"] = severity
    if blocked is not None:
        query["blocked"] = blocked
        
    date_filter = {}
    if start_date:
        date_filter["$gte"] = start_date
    if end_date:
        date_filter["$lte"] = end_date
    if date_filter:
        query["timestamp"] = date_filter
        
    skip = (page - 1) * limit
    
    try:
        cursor = db.security_logs.find(query).sort("timestamp", -1).skip(skip).limit(limit)
        logs = await cursor.to_list(length=limit)
        total = await db.security_logs.count_documents(query)
        
        # Format events to string ID
        for log in logs:
            if "_id" in log:
                log["_id"] = str(log["_id"])
            if "id" in log:
                log["id"] = str(log["id"])
            if isinstance(log.get("timestamp"), datetime):
                log["timestamp"] = log["timestamp"].isoformat()
                
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "logs": logs
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {str(e)}"
        )
