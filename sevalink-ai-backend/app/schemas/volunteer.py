from pydantic import BaseModel
from typing import List, Optional

class VolunteerBase(BaseModel):
    name: str
    location: str
    availability: str
    skills: List[str] = []
    lat: Optional[float] = None
    lng: Optional[float] = None

class VolunteerCreate(VolunteerBase):
    pass

class VolunteerResponse(VolunteerBase):
    id: int
    
    class Config:
        from_attributes = True
