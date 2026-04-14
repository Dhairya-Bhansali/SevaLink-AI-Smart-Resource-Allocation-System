def score_volunteer_for_need(volunteer, need) -> int:
    score = 0
    
    # 1. Location Match (Exact match)
    if volunteer.location.lower() == need.location.lower():
        score += 50
        
    # 2. Skill Match
    need_skills_map = {
        "Medical": ["Doctor", "Nurse", "First Aid", "Medical"],
        "Water": ["Logistics", "Driver", "Heavy Lifting", "Plumbing"],
        "Food": ["Logistics", "Cooking", "Distribution"],
        "Education": ["Teaching", "Counseling"]
    }
    required_skills = need_skills_map.get(need.need_type, [])
    
    if isinstance(volunteer.skills, list):
        v_skills = set(volunteer.skills)
    else:
        v_skills = set()
        
    matching_skills = v_skills.intersection(set(required_skills))
    if matching_skills:
        score += (len(matching_skills) * 20)
        
    return score
