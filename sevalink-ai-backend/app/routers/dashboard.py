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
    
    # We don't have a matched tasks table in MVP, so we mock or calculate based on potential matches.
    # We will mock a number for demonstration, or we can just return a placeholder.
    matched_tasks = int(total_needs * 0.4) 
    
    return {
        "total_needs": total_needs,
        "urgent_needs": urgent_needs,
        "total_volunteers": total_volunteers,
        "matched_tasks": matched_tasks
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
    # Just creating a dummy 7-day trend
    needs_over_time = {
        "dates": ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"],
        "counts": [5, 12, 8, 20, 15, 30, 25]
    }
    
    return {
        "needs_by_type": needs_by_type,
        "volunteers_by_skill": volunteers_by_skill,
        "needs_over_time": needs_over_time
    }
