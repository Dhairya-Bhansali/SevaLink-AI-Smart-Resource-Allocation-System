from fastapi import APIRouter, Depends, HTTPException
from fastapi_jwt_auth import AuthJWT
from sqlalchemy.orm import Session
from pydantic import BaseModel
from .. import database
from ..models import needs as need_model
from ..models import volunteer as vol_model
from ..services.matching_engine import batch_score_volunteers_for_need
from ..utils.notifier import log_notification

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
    batched_results = batch_score_volunteers_for_need(volunteers, need)
    
    for result in batched_results:
        if result["score"] > 0:
            vol = next((v for v in volunteers if v.id == result["id"]), None)
            if vol:
                v_data = {
                    "id": vol.id,
                    "name": vol.name,
                    "location": vol.location,
                    "skills": vol.skills
                }
                matches.append({"volunteer": v_data, "match_score": result["score"], "reason": result.get("reason")})
            
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return {"need": need, "recommended_volunteers": matches}


@router.get("/for-volunteer/{volunteer_id}")
def recommend_needs_for_volunteer(volunteer_id: int, db: Session = Depends(database.get_db)):
    vol = db.query(vol_model.Volunteer).filter(vol_model.Volunteer.id == volunteer_id).first()
    if not vol:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    needs = db.query(need_model.Need).all()
    
    matches = []
    # Note: `batch_score_volunteers_for_need` is specifically designed to score Many Volunteers against One Need.
    # To score Many Needs against One Volunteer (which is what this endpoint does),
    # we would need a different prompt or we just fallback to the loop. Let's use loop of fallback for now to keep it simple,
    # or loop through Gemini for each need. Since this endpoint `recommend_needs_for_volunteer` isn't used in MVP Dashboard yet,
    from ..services.matching_engine import fallback_score_volunteer_for_need
    
    for need in needs:
        score = fallback_score_volunteer_for_need(vol, need)
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
    return {"volunteer_id": vol.id, "matches": matches}


class MatchRequest(BaseModel):
    need_id: int

@router.post("/match-volunteers")
def match_volunteers(req: MatchRequest, db: Session = Depends(database.get_db), Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    need = db.query(need_model.Need).filter(need_model.Need.id == req.need_id).first()
    if not need:
        raise HTTPException(status_code=404, detail="Need not found")

    volunteers = db.query(vol_model.Volunteer).all()
    
    matches = []
    batched_results = batch_score_volunteers_for_need(volunteers, need)
    
    for result in batched_results:
        if result["score"] > 0:
            vol = next((v for v in volunteers if v.id == result["id"]), None)
            if vol:
                matches.append({
                    "id": vol.id,
                    "name": vol.name,
                    "location": vol.location,
                    "skills": vol.skills,
                    "match_score": result["score"],
                    "reason": result.get("reason")
                })
            
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    
    if len(matches) > 0:
        log_notification(db, f"Allocated {len(matches)} volunteers dynamically to Task #{need.id} in {need.location}", "info")
        
    return {"need_id": need.id, "matches": matches[:5], "total_found": len(matches)}

from ..services.optimized_matching import optimized_batch_matching

@router.post("/optimized")
def get_optimized_matching(db: Session = Depends(database.get_db), Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    
    volunteers = db.query(vol_model.Volunteer).all()
    # Only try to allocate high urgency needs
    needs = db.query(need_model.Need).filter(need_model.Need.urgency_level.in_(["High", "Critical"])).all()
    
    if not volunteers or not needs:
        return {"assignments": [], "message": "Not enough data to optimize."}
        
    try:
        assignments = optimized_batch_matching(volunteers, needs)
        if len(assignments) > 0:
            log_notification(db, f"Global Optimization successfully allocated {len(assignments)} routes globally.", "info")
        return {"assignments": assignments, "message": "Optimal global matching generated successfully"}
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Optimization failed: {e}")
        return {"assignments": [], "message": "Optimization failed, use standard matching mode."}

