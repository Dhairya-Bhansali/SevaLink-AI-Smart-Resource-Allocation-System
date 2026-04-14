from sqlalchemy import Column, Integer, String, JSON
from .base import Base

class Volunteer(Base):
    __tablename__ = "volunteers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    location = Column(String, index=True)
    availability = Column(String)
    
    # Store lists as JSON strings for simplicity if not using strictly Postgres Array
    # e.g., ["Medical", "Logistics"]
    skills = Column(JSON, default=list)
