from sqlalchemy import Column, Integer, String, Float, Boolean
from .base import Base

class SimulationNeed(Base):
    __tablename__ = "simulation_needs"

    id = Column(Integer, primary_key=True, index=True)
    location = Column(String, index=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    urgency = Column(String) # Low, Medium, High, Critical
    need_type = Column(String) # For visualization parity
    people_affected = Column(Integer)
    is_simulation = Column(Boolean, default=True)
    priority_score = Column(Float, default=0.0) # Used identically for matching
