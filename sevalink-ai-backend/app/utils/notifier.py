import logging
from sqlalchemy.orm import Session
from ..models.notification import Notification

logger = logging.getLogger(__name__)

def log_notification(db: Session, message: str, notif_type: str = "info"):
    """
    Globally register a shared visual telemetry alert in the remote dashboard.
    Types accepted: info, warning, critical
    """
    try:
        new_note = Notification(
            message=message,
            type=notif_type
        )
        db.add(new_note)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log global notification: {e}")
        db.rollback()
