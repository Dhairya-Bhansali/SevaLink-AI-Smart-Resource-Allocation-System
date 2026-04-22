from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from .. import database
from ..models import needs as need_model
from ..models import volunteer as vol_model

router = APIRouter(
    prefix="/api/dashboard",
    tags=["dashboard"]
)

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(database.get_db)):
    total_needs = db.query(need_model.Need).count()
    urgent_needs = db.query(need_model.Need).filter(
        need_model.Need.urgency_level.in_(["Critical", "High"])
    ).count()
    
    total_volunteers = db.query(vol_model.Volunteer).count()
    
    # Free volunteers = volunteers not currently needed for any active need
    # (i.e. volunteers in excess of current needs count)
    # If more volunteers than needs => some are free; otherwise all are busy
    free_volunteers = max(0, total_volunteers - total_needs)
    assigned_volunteers = min(total_volunteers, total_needs)
    matched_tasks = assigned_volunteers  # approximation: 1 volunteer per need
    
    return {
        "total_needs": total_needs,
        "urgent_needs": urgent_needs,
        "total_volunteers": total_volunteers,
        "free_volunteers": free_volunteers,
        "assigned_volunteers": assigned_volunteers,
        "matched_tasks": matched_tasks,
    }

@router.get("/analytics")
def get_dashboard_analytics(db: Session = Depends(database.get_db)):
    # needs_by_type
    needs_by_type = {}
    type_counts = db.query(need_model.Need.need_type, func.count(need_model.Need.id)).group_by(need_model.Need.need_type).all()
    for nt, c in type_counts:
        needs_by_type[nt] = c
        
    # volunteers_by_skill
    volunteers = db.query(vol_model.Volunteer).all()
    volunteers_by_skill = {}
    for v in volunteers:
        if v.skills:
            for s in v.skills:
                volunteers_by_skill[s] = volunteers_by_skill.get(s, 0) + 1
                
    # needs_over_time (mocked for MVP since Need doesn't have a created_at field in MVP schema)
    needs_over_time = {
        "dates": ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"],
        "counts": [5, 12, 8, 20, 15, 30, 25]
    }
    
    return {
        "needs_by_type": needs_by_type,
        "volunteers_by_skill": volunteers_by_skill,
        "needs_over_time": needs_over_time
    }
