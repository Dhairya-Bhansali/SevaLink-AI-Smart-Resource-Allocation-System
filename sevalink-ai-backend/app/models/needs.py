from sqlalchemy import Column, Integer, String, Float
from .base import Base

class Need(Base):
    __tablename__ = "needs"

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, index=True)
    location = Column(String, index=True)
    need_type = Column(String, index=True) # Water, Medical, Food
    people_affected = Column(Integer)
    urgency_level = Column(String) # Low, Medium, High, Critical
    priority_score = Column(Float, default=0.0)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
