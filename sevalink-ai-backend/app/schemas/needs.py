from pydantic import BaseModel
from typing import Optional

class NeedBase(BaseModel):
    community_id: int
    location: str
    need_type: str
    people_affected: int
    urgency_level: str

class NeedCreate(NeedBase):
    pass

class NeedResponse(NeedBase):
    id: int
    priority_score: float

    class Config:
        from_attributes = True
