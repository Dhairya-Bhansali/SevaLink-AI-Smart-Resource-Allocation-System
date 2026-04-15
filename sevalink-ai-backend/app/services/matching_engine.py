import os
import json

def fallback_score_volunteer_for_need(volunteer, need) -> int:
    score = 0
    if volunteer.location.lower() == need.location.lower():
        score += 50
        
    need_skills_map = {
        "Medical": ["Doctor", "Nurse", "First Aid", "Medical"],
        "Water": ["Logistics", "Driver", "Heavy Lifting", "Plumbing"],
        "Food": ["Logistics", "Cooking", "Distribution"],
        "Education": ["Teaching", "Counseling"]
    }
    required_skills = need_skills_map.get(need.need_type, [])
    
    v_skills = set(volunteer.skills) if isinstance(volunteer.skills, list) else set()
    matching_skills = v_skills.intersection(set(required_skills))
    
    if matching_skills:
        score += (len(matching_skills) * 20)
    return min(score, 100)

def batch_score_volunteers_for_need(volunteers, need) -> list:
    """
    Optimization: Sends all volunteers to Gemini in a single batch prompt to avoid 
    rate limits and drastically speed up the matching process.
    """
    from dotenv import load_dotenv
    load_dotenv()
    gemini_api_key = os.getenv("GEMINI_API_KEY")

    # If no API key or no volunteers, fallback
    if not gemini_api_key or not volunteers:
        fallback_results = []
        for vol in volunteers:
            score = fallback_score_volunteer_for_need(vol, need)
            fallback_results.append({"id": vol.id, "score": score, "reason": "Rule-based match."})
        return fallback_results

    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_api_key)
        
        # We explicitly enforce JSON array response
        model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"response_mime_type": "application/json"})
        
        v_list = [{"id": v.id, "location": v.location, "skills": v.skills} for v in volunteers]
        need_info = {"location": need.location, "type": need.need_type, "urgency": need.urgency_level}
        
        prompt = f"""
        You are an intelligent disaster relief coordinator AI. 
        Evaluate these volunteers against the current need.
        Return ONLY a raw JSON array of objects.
        
        Need: {json.dumps(need_info)}
        Volunteers: {json.dumps(v_list)}
        
        Rules:
        - Score from 0 to 100 based on location proximity and skill relevance. Exact location is top priority.
        - Important: Provide a 1-sentence 'reason' for the score explaining why they are a good or bad fit.

        Required Output Format (JSON Array):
        [
          {{"id": 1, "score": 85, "reason": "Close proximity and possesses medical skills."}}
        ]
        """
        
        response = model.generate_content(prompt)
        ai_scores = json.loads(response.text)
        
        # Ensure we return valid format
        return [{"id": item["id"], "score": item["score"], "reason": item.get("reason", "AI Matched")} for item in ai_scores]
        
    except Exception as e:
        print(f"Gemini API Error: {e}")
        # Fallback
        fallback_results = []
        for vol in volunteers:
            score = fallback_score_volunteer_for_need(vol, need)
            fallback_results.append({"id": vol.id, "score": score, "reason": "Rule-based fallback due to AI error."})
        return fallback_results
