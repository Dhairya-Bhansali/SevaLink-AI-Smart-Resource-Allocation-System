from fastapi import APIRouter, Depends
from fastapi_jwt_auth2 import AuthJWT
from sqlalchemy.orm import Session
from typing import List
from .. import database
from ..models import volunteer as model
from ..schemas import volunteer as schema
from ..utils.geolocation import get_coordinates

router = APIRouter(
    prefix="/api/volunteers",
    tags=["volunteers"]
)

@router.post("/", response_model=schema.VolunteerResponse)
def create_volunteer(volunteer: schema.VolunteerCreate, db: Session = Depends(database.get_db)):
    # Open registration - no auth required
    v_data = volunteer.model_dump()
    if v_data.get("lat") is None or v_data.get("lng") is None:
        lat, lng = get_coordinates(volunteer.location)
        v_data["lat"] = lat
        v_data["lng"] = lng

    db_volunteer = model.Volunteer(**v_data)
    db.add(db_volunteer)
    db.commit()
    db.refresh(db_volunteer)
    return db_volunteer

@router.get("/", response_model=List[schema.VolunteerResponse])
def read_volunteers(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    volunteers = db.query(model.Volunteer).offset(skip).limit(limit).all()
    return volunteers
