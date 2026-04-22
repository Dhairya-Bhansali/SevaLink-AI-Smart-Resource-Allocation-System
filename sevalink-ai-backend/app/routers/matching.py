from fastapi import APIRouter, Depends, HTTPException
from fastapi_jwt_auth2 import AuthJWT
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
    from ..services.matching_engine import fallback_score_volunteer_for_need
    
    for need in needs:
        res = fallback_score_volunteer_for_need(vol, need)
        if res["score"] > 0:
            n_data = {
                "id": need.id,
                "location": need.location,
                "need_type": need.need_type,
                "urgency_level": need.urgency_level,
                "priority_score": need.priority_score,
                "people_affected": need.people_affected
            }
            matches.append({"need": n_data, "match_score": res["score"], "reason": res["reason"]})
            
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return {"volunteer_id": vol.id, "matches": matches}


class MatchRequest(BaseModel):
    need_id: int

@router.post("/match-volunteers")
def match_volunteers(req: MatchRequest, db: Session = Depends(database.get_db), Authorize: AuthJWT = Depends()):
    try:
        Authorize.jwt_required()
    except:
        pass
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

class SimMatchRequest(BaseModel):
    sim_need_id: int

@router.post("/match-sim")
def match_sim_need(req: SimMatchRequest, db: Session = Depends(database.get_db)):
    """Match real volunteers against a simulation need using rule-based scoring."""
    from ..models.simulation import SimulationNeed
    from ..services.matching_engine import fallback_score_volunteer_for_need
    
    sim_need = db.query(SimulationNeed).filter(SimulationNeed.id == req.sim_need_id).first()
    if not sim_need:
        raise HTTPException(status_code=404, detail="Simulation need not found")
    
    volunteers = db.query(vol_model.Volunteer).all()
    
    matches = []
    for vol in volunteers:
        res = fallback_score_volunteer_for_need(vol, sim_need)
        if res["score"] > 0:
            matches.append({
                "id": vol.id,
                "name": vol.name,
                "location": vol.location,
                "skills": vol.skills,
                "match_score": res["score"],
                "reason": res["reason"]
            })
    
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return {"sim_need_id": sim_need.id, "matches": matches[:5], "total_found": len(matches)}

class AssignRequest(BaseModel):
    need_id: int
    volunteer_id: int
    is_simulation: bool = False

@router.post("/assign")
def assign_volunteer(req: AssignRequest, db: Session = Depends(database.get_db)):
    if req.is_simulation:
        from ..models.simulation import SimulationNeed
        need = db.query(SimulationNeed).filter(SimulationNeed.id == req.need_id).first()
    else:
        need = db.query(need_model.Need).filter(need_model.Need.id == req.need_id).first()
        
    if need:
        location = need.location
        db.delete(need)
        db.commit()
        log_notification(db, f"Volunteer successfully assigned. Task at {location} resolved.", "info")
        
    return {"message": "Assigned and resolved"}


from ..services.optimized_matching import optimized_batch_matching

class BulkAllocateRequest(BaseModel):
    include_simulation: bool = False

@router.post("/optimized")
def get_optimized_matching(db: Session = Depends(database.get_db), Authorize: AuthJWT = Depends()):
    """
    Hungarian algorithm global optimization — assigns volunteers to ALL real needs.
    No urgency filter: every need gets matched.
    """
    try:
        Authorize.jwt_required()
    except:
        pass
    
    volunteers = db.query(vol_model.Volunteer).all()
    # Match ALL needs — no urgency filter
    needs = db.query(need_model.Need).all()
    
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


@router.post("/optimized-sim")
def get_optimized_sim_matching(db: Session = Depends(database.get_db)):
    """
    Hungarian algorithm global optimization for SIMULATION needs.
    Runs without deleting data — simulation only, data stays intact.
    """
    from ..models.simulation import SimulationNeed
    
    volunteers = db.query(vol_model.Volunteer).all()
    sim_needs = db.query(SimulationNeed).all()
    
    if not volunteers or not sim_needs:
        return {"assignments": [], "message": "No simulation data to optimize."}
    
    try:
        assignments = optimized_batch_matching(volunteers, sim_needs)
        if len(assignments) > 0:
            log_notification(db, f"Simulation Optimization allocated {len(assignments)} routes across sim events.", "warning")
        return {"assignments": assignments, "message": "Simulation optimal matching generated successfully"}
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Sim optimization failed: {e}")
        return {"assignments": [], "message": "Simulation optimization failed."}
