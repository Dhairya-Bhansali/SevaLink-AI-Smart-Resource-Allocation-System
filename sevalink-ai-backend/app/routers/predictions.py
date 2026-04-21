from fastapi import APIRouter, Depends
from typing import List
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..services.prediction_model import engine
from .. import database
from ..utils.notifier import log_notification

router = APIRouter(
    prefix="/api/predictions",
    tags=["predictions"]
)

# ✅ Correct Pydantic Model
class FutureNeedResponse(BaseModel):
    predicted_need: str
    confidence: float
    location: str
    season: str


@router.get("/future-needs", response_model=List[FutureNeedResponse])
def get_future_needs(db: Session = Depends(database.get_db)):

    scenarios = [
        {"location": "Ahmedabad", "season": "Monsoon", "urgency": "High", "people_affected": 1000},
        {"location": "Surat", "season": "Summer", "urgency": "Critical", "people_affected": 2000},
        {"location": "Mumbai", "season": "Monsoon", "urgency": "Critical", "people_affected": 5000},
    ]

    results = []
    high_risk_triggered = False

    for s in scenarios:

        prediction = engine.predict_future_needs(
            location=s["location"],
            season=s["season"],
            urgency=s["urgency"],
            people_affected=s["people_affected"]
        )

        results.append(prediction)

        if prediction["confidence"] > 0.80 and not high_risk_triggered:

            log_notification(
                db,
                f"AI PREDICTION WARNING: High risk of {prediction['predicted_need']} detected in {prediction['location']}.",
                "critical"
            )

            high_risk_triggered = True

    return results