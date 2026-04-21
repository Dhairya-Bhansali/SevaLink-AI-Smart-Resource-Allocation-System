from fastapi import APIRouter, Depends, HTTPException
from fastapi_jwt_auth import AuthJWT
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from .. import database
from ..models import simulation as sim_model
from ..services.simulation_engine import simulate_disaster
from ..utils.notifier import log_notification

router = APIRouter(
    prefix="/api/simulation",
    tags=["simulation"]
)

# =========================
# Request Schema
# =========================

class SimulationRequest(BaseModel):
    type: str   # Flood, Earthquake, Fire, Medical
    city: str


# =========================
# Response Schema
# =========================

class SimulationResponse(BaseModel):
    id: int
    location: str
    lat: float
    lng: float
    urgency: str
    need_type: str
    people_affected: int
    priority_score: float

    class Config:
        orm_mode = True   # ✅ FIXED (important)


# =========================
# Start Simulation
# =========================

@router.post("/start", response_model=List[SimulationResponse])
def start_simulation(
    req: SimulationRequest,
    db: Session = Depends(database.get_db),
    Authorize: AuthJWT = Depends()
):
    Authorize.jwt_required()

    try:
        needs = simulate_disaster(
            disaster_type=req.type,
            city=req.city,
            db=db
        )

        # Log notification
        log_notification(
            db,
            f"Simulation Script [{req.type}] generated {len(needs)} localized stress events in {req.city}.",
            "warning"
        )

        return needs

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Simulation failed: {e}"
        )


# =========================
# Clear Simulation
# =========================

@router.delete("/clear")
def clear_simulation(
    db: Session = Depends(database.get_db),
    Authorize: AuthJWT = Depends()
):
    Authorize.jwt_required()

    try:
        db.query(sim_model.SimulationNeed).delete()
        db.commit()

        return {
            "detail": "Simulation data cleared successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear sim data: {e}"
        )


# =========================
# Get Simulated Needs
# =========================

@router.get("/needs", response_model=List[SimulationResponse])
def get_simulated_needs(
    db: Session = Depends(database.get_db)
):
    """
    Public endpoint used for heatmap plotting.
    """

    needs = (
        db.query(sim_model.SimulationNeed)
        .order_by(sim_model.SimulationNeed.priority_score.desc())
        .all()
    )

    return needs