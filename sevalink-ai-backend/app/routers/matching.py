from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import database
from ..models import needs as need_model
from ..models import volunteer as vol_model
from ..services.matching_engine import score_volunteer_for_need

router = APIRouter(
    prefix="/api/matches",
    tags=["matching"]
)

@router.get("/recommend/{need_id}")
def recommend_volunteers_for_need(need_id: int, db: Session = Depends(database.get_db)):
    need = db.query(need_model.Need).filter(need_model.Need.id == need_id).first()
    if not need:
        raise HTTPException(status_code=404, detail="Need not found")

    volunteers = db.query(vol_model.Volunteer).all()
    
    matches = []
    for vol in volunteers:
        score = score_volunteer_for_need(vol, need)
        if score > 0:
            # Dump minimal representation for matching dashboard
            v_data = {
                "id": vol.id,
                "name": vol.name,
                "location": vol.location,
                "skills": vol.skills
            }
            matches.append({"volunteer": v_data, "match_score": score})
            
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return {"need": need, "recommended_volunteers": matches}


@router.get("/for-volunteer/{volunteer_id}")
def recommend_needs_for_volunteer(volunteer_id: int, db: Session = Depends(database.get_db)):
    vol = db.query(vol_model.Volunteer).filter(vol_model.Volunteer.id == volunteer_id).first()
    if not vol:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    needs = db.query(need_model.Need).all()
    
    matches = []
    for need in needs:
        score = score_volunteer_for_need(vol, need)
        if score > 0:
            n_data = {
                "id": need.id,
                "location": need.location,
                "need_type": need.need_type,
                "urgency_level": need.urgency_level,
                "priority_score": need.priority_score,
                "people_affected": need.people_affected
            }
            matches.append({"need": n_data, "match_score": score})
            
    matches.sort(key=lambda x: x["match_score"], reverse=True)
from pydantic import BaseModel

class MatchRequest(BaseModel):
    need_id: int

@router.post("/match-volunteers")
def match_volunteers(req: MatchRequest, db: Session = Depends(database.get_db)):
    need = db.query(need_model.Need).filter(need_model.Need.id == req.need_id).first()
    if not need:
        raise HTTPException(status_code=404, detail="Need not found")

    volunteers = db.query(vol_model.Volunteer).all()
    
    matches = []
    for vol in volunteers:
        score = score_volunteer_for_need(vol, need)
        if score > 0:
            matches.append({
                "id": vol.id,
                "name": vol.name,
                "location": vol.location,
                "skills": vol.skills,
                "match_score": score
            })
            
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return {"need_id": need.id, "matches": matches[:5]}
