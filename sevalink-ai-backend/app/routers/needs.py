from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi_jwt_auth2 import AuthJWT
from sqlalchemy.orm import Session
from typing import List
import json
import csv
import io
from .. import database
from ..models import needs as model
from ..schemas import needs as schema
from ..services.priority_engine import calculate_priority_score
from ..utils.ocr import extract_text_from_image, parse_need_from_text
from ..utils.geolocation import get_coordinates
from ..utils.notifier import log_notification

router = APIRouter(
    prefix="/api/needs",
    tags=["needs"]
)

@router.post("/upload", response_model=schema.NeedResponse)
def create_need(need: schema.NeedCreate, db: Session = Depends(database.get_db), Authorize: AuthJWT = Depends()):
    try:
        Authorize.jwt_required()
    except:
        pass
    # Calculate intelligent priority
    score = calculate_priority_score(need.urgency_level, need.people_affected)
    
    # Dump the pydantic model to a dict to pass to SQLAlchemy
    need_data = need.model_dump()
    
    # Auto-convert location to coordinates
    if need_data.get("lat") is None or need_data.get("lng") is None:
        lat, lng = get_coordinates(need.location)
        need_data["lat"] = lat
        need_data["lng"] = lng

    db_need = model.Need(**need_data, priority_score=score)
    
    db.add(db_need)
    db.commit()
    db.refresh(db_need)
    
    if need_data.get("urgency_level") in ["Critical", "High"]:
        log_notification(db, f"URGENT: A new {need_data.get('urgency_level')} need ({need_data.get('need_type')}) was reported in {need_data.get('location')} affecting {need_data.get('people_affected')} people.", "critical")
        
    return db_need

@router.get("/", response_model=List[schema.NeedResponse])
def read_needs(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    # Return needs ordered by descending priority score
    needs = db.query(model.Need).order_by(model.Need.priority_score.desc()).offset(skip).limit(limit).all()
    return needs

@router.get("/coordinates")
def get_needs_coordinates(db: Session = Depends(database.get_db)):
    needs = db.query(model.Need).all()
    result = []
    for n in needs:
        result.append({
            "id": n.id,
            "location": n.location,
            "lat": n.lat,
            "lng": n.lng,
            "urgency_level": n.urgency_level,
            "need_type": n.need_type,
            "people_affected": n.people_affected,
            "priority_score": n.priority_score,
            "is_simulation": False,
        })
    return result


@router.get("/prioritized", response_model=List[schema.NeedResponse])
def read_prioritized_needs(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    needs = db.query(model.Need).order_by(model.Need.priority_score.desc()).offset(skip).limit(limit).all()
    return needs

@router.post("/upload-survey", response_model=List[schema.NeedResponse])
async def upload_survey(file: UploadFile = File(...), db: Session = Depends(database.get_db), Authorize: AuthJWT = Depends()):
    try:
        Authorize.jwt_required()
    except:
        pass
    saved_needs = []
    
    if file.filename.endswith(".csv"):
        content = await file.read()
        reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
        for row in reader:
            score = calculate_priority_score(row.get("urgency_level", "Medium"), int(row.get("people_affected", 0)))
            loc = row.get("location", "Unknown")
            lat, lng = get_coordinates(loc)
            db_need = model.Need(
                community_id=int(row.get("community_id", 999)),
                location=loc,
                need_type=row.get("need_type", "General"),
                people_affected=int(row.get("people_affected", 0)),
                urgency_level=row.get("urgency_level", "Medium"),
                priority_score=score,
                lat=lat,
                lng=lng
            )
            db.add(db_need)
            saved_needs.append(db_need)
        db.commit()
    elif file.filename.endswith(".json"):
        content = await file.read()
        data = json.loads(content.decode('utf-8'))
        if isinstance(data, dict):
            data = [data]
        for row in data:
            score = calculate_priority_score(row.get("urgency_level", "Medium"), int(row.get("people_affected", 0)))
            loc = row.get("location", "Unknown")
            lat, lng = get_coordinates(loc)
            db_need = model.Need(
                community_id=int(row.get("community_id", 999)),
                location=loc,
                need_type=row.get("need_type", "General"),
                people_affected=int(row.get("people_affected", 0)),
                urgency_level=row.get("urgency_level", "Medium"),
                priority_score=score,
                lat=lat,
                lng=lng
            )
            db.add(db_need)
            saved_needs.append(db_need)
        db.commit()
    elif file.filename.endswith(".pdf") or file.filename.endswith(".png") or file.filename.endswith(".jpg"):
        image_bytes = await file.read()
        try:
            raw_text = extract_text_from_image(image_bytes)
            parsed = parse_need_from_text(raw_text)
            score = calculate_priority_score(parsed["urgency_level"], parsed["people_affected"])
            loc = parsed.get("location", "Unknown")
            lat, lng = get_coordinates(loc)
            parsed["lat"] = lat
            parsed["lng"] = lng
            db_need = model.Need(**parsed, priority_score=score)
            db.add(db_need)
            db.commit()
            saved_needs.append(db_need)
        except RuntimeError as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format.")
        
    for sn in saved_needs:
        db.refresh(sn)
    return saved_needs

@router.post("/upload-image", response_model=schema.NeedResponse)
async def upload_survey_image(file: UploadFile = File(...), db: Session = Depends(database.get_db), Authorize: AuthJWT = Depends()):
    try:
        Authorize.jwt_required()
    except:
        pass
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Only JPEG and PNG images are supported.")
    image_bytes = await file.read()
    try:
        raw_text = extract_text_from_image(image_bytes)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    parsed = parse_need_from_text(raw_text)
    score = calculate_priority_score(parsed["urgency_level"], parsed["people_affected"])
    loc = parsed.get("location", "Unknown")
    lat, lng = get_coordinates(loc)
    parsed["lat"] = lat
    parsed["lng"] = lng
    db_need = model.Need(**parsed, priority_score=score)
    db.add(db_need)
    db.commit()
    db.refresh(db_need)
    return db_need
