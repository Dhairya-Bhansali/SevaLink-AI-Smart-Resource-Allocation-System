import os
import json

from ..utils.distance import calculate_distance

def fallback_score_volunteer_for_need(volunteer, need) -> dict:
    score = 0
    reasons = []
    
    if volunteer.lat is not None and getattr(need, 'lat', None) is not None:
        dist = calculate_distance(volunteer.lat, volunteer.lng, need.lat, need.lng)
        if dist <= 10:
            score += 50
            reasons.append("Very close proximity")
        elif dist <= 50:
            score += 30
            reasons.append("Close proximity")
        elif dist <= 100:
            score += 15
            reasons.append("Within driving distance")
        else:
            reasons.append(f"{int(dist)}km away")
    elif volunteer.location.lower() == need.location.lower():
        score += 50
        reasons.append("Same city match")
    else:
        reasons.append("Location match unclear")
        
    need_skills_map = {
        "Medical": ["Doctor", "Nurse", "First Aid", "Medical"],
        "Water": ["Logistics", "Driver", "Heavy Lifting", "Plumbing"],
        "Food": ["Logistics", "Cooking", "Distribution"],
        "Education": ["Teaching", "Counseling"],
        "Logistics": ["Logistics", "Driver", "Heavy Lifting"],
        "Shelter": ["Heavy Lifting", "Logistics", "Plumbing"]
    }
    required_skills = need_skills_map.get(need.need_type, [])
    
    v_skills = set(volunteer.skills) if isinstance(volunteer.skills, list) else set()
    matching_skills = v_skills.intersection(set(required_skills))
    
    if matching_skills:
        score += (len(matching_skills) * 20)
        reasons.append(f"possesses required skills ({', '.join(matching_skills)})")
    else:
        reasons.append("missing optimal skills")
        
    final_score = min(score, 100)
    reason_str = " and ".join(reasons) + "."
    return {"score": final_score, "reason": reason_str.capitalize()}

def batch_score_volunteers_for_need(volunteers, need) -> list:
    """
    Optimization: For the demo, we use the fast rule-based engine 
    to provide instant matching without waiting 5-10 seconds for Gemini API.
    """
    results = []
    for vol in volunteers:
        res = fallback_score_volunteer_for_need(vol, need)
        results.append({"id": vol.id, "score": res["score"], "reason": res["reason"]})
    return results
