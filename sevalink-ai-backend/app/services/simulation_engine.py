import random
from typing import List
from sqlalchemy.orm import Session
from ..models import simulation as sim_model
from ..utils.geolocation import get_coordinates
from ..services.priority_engine import calculate_priority_score

def simulate_disaster(disaster_type: str, city: str, db: Session) -> List[sim_model.SimulationNeed]:
    """Generates synthetic local needs based around a city's center."""
    # Find base city coordinate
    base_lat, base_lng = get_coordinates(city)
    if not base_lat or not base_lng:
        # Default arbitrary coordinates if geocoding fails completely
        base_lat, base_lng = 23.0225, 72.5714 # Default Ahmedabad
        
    rules = {
        "Flood": { "urgency": "Critical", "types": ["Water", "Food", "Medical", "Logistics"], "people_min": 100, "people_max": 2000, "events": 5 },
        "Earthquake": { "urgency": "Critical", "types": ["Medical", "Heavy Lifting", "Water", "Logistics"], "people_min": 50, "people_max": 1000, "events": 6 },
        "Fire": { "urgency": "High", "types": ["Water", "Medical"], "people_min": 10, "people_max": 200, "events": 3 },
        "Medical": { "urgency": "High", "types": ["Medical", "First Aid", "Doctor"], "people_min": 5, "people_max": 50, "events": 4 },
    }
    
    settings = rules.get(disaster_type, rules["Flood"])  # Fallback to Flood
    
    generated = []
    for i in range(settings["events"]):
        # Jitter coordinates slightly
        lat_offset = random.uniform(-0.06, 0.06)
        lng_offset = random.uniform(-0.06, 0.06)
        n_lat = base_lat + lat_offset
        n_lng = base_lng + lng_offset
        
        n_type = random.choice(settings["types"])
        n_people = random.randint(settings["people_min"], settings["people_max"])
        n_urgency = settings["urgency"]
        score = calculate_priority_score(n_urgency, n_people)
        
        sim = sim_model.SimulationNeed(
            location=f"Simulated Zone {i+1} ({city})",
            lat=n_lat,
            lng=n_lng,
            urgency_level=n_urgency,
            need_type=n_type,
            people_affected=n_people,
            is_simulation=True,
            priority_score=score
        )
        db.add(sim)
        generated.append(sim)
        
    db.commit()
    for g in generated:
        db.refresh(g)
        
    return generated
