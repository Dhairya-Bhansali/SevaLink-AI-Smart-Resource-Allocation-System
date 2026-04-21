from sqlalchemy import Column, Integer, String, Boolean, DateTime
import datetime
from .base import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(String)
    type = Column(String) # info, warning, critical
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    is_read = Column(Boolean, default=False)
