from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import database
from ..models import volunteer as model
from ..schemas import volunteer as schema

router = APIRouter(
    prefix="/api/volunteers",
    tags=["volunteers"]
)

@router.post("/", response_model=schema.VolunteerResponse)
def create_volunteer(volunteer: schema.VolunteerCreate, db: Session = Depends(database.get_db)):
    db_volunteer = model.Volunteer(**volunteer.model_dump())
    db.add(db_volunteer)
    db.commit()
    db.refresh(db_volunteer)
    return db_volunteer

@router.get("/", response_model=List[schema.VolunteerResponse])
def read_volunteers(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    volunteers = db.query(model.Volunteer).offset(skip).limit(limit).all()
    return volunteers
