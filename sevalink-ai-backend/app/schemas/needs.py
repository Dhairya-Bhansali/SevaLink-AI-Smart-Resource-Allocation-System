from pydantic import BaseModel
from typing import Optional

class NeedBase(BaseModel):
    community_id: int
    location: str
    need_type: str
    people_affected: int
    urgency_level: str
    lat: Optional[float] = None
    lng: Optional[float] = None

class NeedCreate(NeedBase):
    pass

class NeedResponse(NeedBase):
    id: int
    priority_score: float

    class Config:
        from_attributes = True
