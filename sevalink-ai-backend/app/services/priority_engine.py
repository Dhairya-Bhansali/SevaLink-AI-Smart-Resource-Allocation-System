import re

def calculate_priority_score(urgency_level: str, people_affected: int) -> float:
    # 1. Base weights for urgency
    urgency_weights = {
        "Critical": 10.0,
        "High": 7.0,
        "Medium": 4.0,
        "Low": 1.0
    }
    
    # Capitalize for safe lookup
    level = urgency_level.capitalize() if urgency_level else "Low"
    base_score = urgency_weights.get(level, 1.0)
    
    # 2. Add impact scale based on people affected. 
    impact_multiplier = min(people_affected / 50.0, 5.0) 
    
    total_score = base_score + impact_multiplier
    return round(total_score, 2)
