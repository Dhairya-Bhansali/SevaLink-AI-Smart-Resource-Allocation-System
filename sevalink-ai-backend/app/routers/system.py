from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import time
import random
from .. import database
from ..models import needs as need_model
from ..models import volunteer as vol_model

router = APIRouter(
    prefix="/api/system",
    tags=["system"]
)

@router.get("/status")
def get_system_status(db: Session = Depends(database.get_db)):
    start_time = time.time()
    
    # Calculate live real-time metrics
    total_volunteers = db.query(vol_model.Volunteer).count()
    active_needs = db.query(need_model.Need).count()
    critical_needs = db.query(need_model.Need).filter(need_model.Need.urgency_level == "Critical").count()
    
    # Mock assignments derived from active needs
    assigned_tasks = int(active_needs * 0.6) 
    
    # Dynamic dummy average match time simulating backend performance
    avg_match_time = round(random.uniform(0.1, 1.2), 2)
    
    end_time = time.time()
    
    return {
        "total_volunteers": total_volunteers,
        "active_needs": active_needs,
        "assigned_tasks": assigned_tasks,
        "critical_needs": critical_needs,
        "average_match_time": avg_match_time,
        "query_ms": round((end_time - start_time) * 1000, 2)
    }

from ..middleware.performance import PERFORMANCE_METRICS

@router.get("/performance")
def get_system_performance():
    return PERFORMANCE_METRICS
