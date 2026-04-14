from pydantic import BaseModel
from typing import List, Optional

class VolunteerBase(BaseModel):
    name: str
    location: str
    availability: str
    skills: List[str] = []

class VolunteerCreate(VolunteerBase):
    pass

class VolunteerResponse(VolunteerBase):
    id: int
    
    class Config:
        from_attributes = True
