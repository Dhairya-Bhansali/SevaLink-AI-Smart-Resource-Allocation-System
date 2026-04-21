import numpy as np
from scipy.optimize import linear_sum_assignment
from ..utils.distance import calculate_distance

def optimized_batch_matching(volunteers: list, needs: list):
    """
    Hungarian algorithm based matching optimization.
    Minimizes total 'cost' across assignments where cost is computed based on:
    - geographic distance (penalty)
    - skill mismatch (penalty)
    """
    if not volunteers or not needs:
        return []
    
    # Cost matrix rows=volunteers, cols=needs
    cost_matrix = np.zeros((len(volunteers), len(needs)))
    
    for i, vol in enumerate(volunteers):
        for j, need in enumerate(needs):
            cost = 0
            
            # Geography Penalty
            dist = float('inf')
            if vol.lat is not None and need.lat is not None:
                dist = calculate_distance(vol.lat, vol.lng, need.lat, need.lng)
            
            if dist == float('inf'):
                cost += 500 # High penalty for unknown location
            else:
                cost += dist # Use km directly as cost
                
            # Skill Mismatch Penalty
            need_skills_map = {
                "Medical": ["Doctor", "Nurse", "First Aid", "Medical"],
                "Water": ["Logistics", "Driver", "Heavy Lifting", "Plumbing"],
                "Food": ["Logistics", "Cooking", "Distribution"],
                "Education": ["Teaching", "Counseling"]
            }
            required = need_skills_map.get(need.need_type, [])
            v_skills = set(vol.skills) if isinstance(vol.skills, list) else set()
            match_count = len(v_skills.intersection(set(required)))
            
            if match_count == 0:
                cost += 150 # Significant penalty if NO matching skills
            else:
                cost -= (match_count * 50) # Bonus for matching skills (reduces cost)
                
            cost_matrix[i, j] = max(0, cost) # Ensure cost is strictly positive or 0
            
    # Apply algorithm
    row_ind, col_ind = linear_sum_assignment(cost_matrix)
    
    assignments = []
    for r, c in zip(row_ind, col_ind):
        assignments.append({
            "volunteer_id": volunteers[r].id,
            "volunteer_name": volunteers[r].name,
            "need_id": needs[c].id,
            "need_location": needs[c].location,
            "cost": float(cost_matrix[r, c])
        })
        
    return assignments
