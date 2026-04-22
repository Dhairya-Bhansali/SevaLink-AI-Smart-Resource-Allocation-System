import numpy as np
from scipy.optimize import linear_sum_assignment
from ..utils.distance import calculate_distance

NEED_SKILLS_MAP = {
    "Medical": ["Doctor", "Nurse", "First Aid", "Medical"],
    "Water": ["Logistics", "Driver", "Heavy Lifting", "Plumbing"],
    "Food": ["Logistics", "Cooking", "Distribution"],
    "Education": ["Teaching", "Counseling"],
    "Logistics": ["Logistics", "Driver", "Heavy Lifting"],
    "First Aid": ["First Aid", "Nurse", "Medical"],
    "Heavy Lifting": ["Heavy Lifting", "Logistics"],
    "Doctor": ["Doctor", "Medical", "First Aid"],
}

def _get_need_lat(need):
    """Safe accessor — SimulationNeed and Need both have .lat"""
    return getattr(need, 'lat', None)

def _get_need_lng(need):
    return getattr(need, 'lng', None)

def _get_need_type(need):
    return getattr(need, 'need_type', '') or ''

def optimized_batch_matching(volunteers: list, needs: list):
    """
    Hungarian algorithm based matching optimization.
    Minimizes total 'cost' across assignments where cost is computed based on:
    - geographic distance (penalty)
    - skill mismatch (penalty)

    Works for both real Need objects and SimulationNeed objects.
    """
    if not volunteers or not needs:
        return []
    
    # Cost matrix rows=volunteers, cols=needs
    cost_matrix = np.zeros((len(volunteers), len(needs)), dtype=float)
    
    for i, vol in enumerate(volunteers):
        for j, need in enumerate(needs):
            cost = 0.0
            
            # Geography Penalty
            v_lat = getattr(vol, 'lat', None)
            v_lng = getattr(vol, 'lng', None)
            n_lat = _get_need_lat(need)
            n_lng = _get_need_lng(need)
            
            dist = float('inf')
            if v_lat is not None and n_lat is not None:
                dist = calculate_distance(v_lat, v_lng, n_lat, n_lng)
            
            if dist == float('inf'):
                cost += 500.0  # High penalty for unknown location
            else:
                cost += dist  # Use km directly as cost
                
            # Skill Mismatch Penalty
            need_type = _get_need_type(need)
            required = NEED_SKILLS_MAP.get(need_type, [])
            v_skills = set(vol.skills) if isinstance(vol.skills, list) else set()
            match_count = len(v_skills.intersection(set(required)))
            
            if match_count == 0:
                cost += 150.0  # Significant penalty if NO matching skills
            else:
                cost -= (match_count * 50.0)  # Bonus for matching skills (reduces cost)
                
            cost_matrix[i, j] = max(0.0, cost)  # Ensure cost is strictly positive or 0
            
    # Apply Hungarian algorithm
    row_ind, col_ind = linear_sum_assignment(cost_matrix)
    
    assignments = []
    for r, c in zip(row_ind, col_ind):
        vol = volunteers[r]
        need = needs[c]
        assignments.append({
            "volunteer_id": vol.id,
            "volunteer_name": vol.name,
            "need_id": need.id,
            "need_location": getattr(need, 'location', 'Unknown'),
            "need_type": _get_need_type(need),
            "cost": float(cost_matrix[r, c])
        })
        
    return assignments
