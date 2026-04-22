from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import List

from .. import database
from ..models import notification as notif_model

router = APIRouter(
    prefix="/api/notifications",
    tags=["notifications"]
)

# =========================
# Response Schema
# =========================

class NotificationResponse(BaseModel):
    id: int
    message: str
    type: str
    timestamp: datetime
    is_read: bool

    class Config:
        orm_mode = True   # ✅ REQUIRED for Pydantic v1


# =========================
# Get Notifications
# =========================

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(db: Session = Depends(database.get_db)):
    """
    Get latest 20 notifications
    """

    notes = (
        db.query(notif_model.Notification)
        .order_by(notif_model.Notification.timestamp.desc())
        .limit(20)
        .all()
    )

    return notes


# =========================
# Mark Notification Read
# =========================

@router.post("/mark-read/{notif_id}")
def mark_notification_read(
    notif_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Mark a notification as read
    """

    note = (
        db.query(notif_model.Notification)
        .filter(notif_model.Notification.id == notif_id)
        .first()
    )

    if not note:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    note.is_read = True
    db.commit()

    return {"detail": "Marked read successfully"}

# =========================
# Mark All Read
# =========================

@router.post("/mark-all-read")
def mark_all_notifications_read(db: Session = Depends(database.get_db)):
    """
    Mark all unread notifications as read.
    """
    db.query(notif_model.Notification).filter(notif_model.Notification.is_read == False).update({"is_read": True})
    db.commit()

    return {"detail": "Marked all as read successfully"}