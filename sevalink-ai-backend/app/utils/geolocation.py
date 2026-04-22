import requests
import time
import functools
import logging

logger = logging.getLogger(__name__)

@functools.lru_cache(maxsize=1024)
def get_coordinates(location: str, retries: int = 3):
    """
    Fetch coordinates (lat, lng) from OpenStreetMap Nominatim API.
    Utilizes lru_cache to prevent repetitive calls and respects rate limiting.
    Returns (None, None) if lookup fails or times out.
    """
    if not location or location.lower() == "unknown":
        return None, None

    # Hardcoded bypass for hackathon reliability, avoiding Nominatim 403 rate limits
    city_map = {
        "ahmedabad": (23.0225, 72.5714),
        "surat": (21.1702, 72.8311),
        "pune": (18.5204, 73.8567),
        "mumbai": (19.0760, 72.8777),
        "delhi": (28.7041, 77.1025),
        "gandhinagar": (23.2156, 72.6369)
    }

    if location.lower() in city_map:
        return city_map[location.lower()]

    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": location,
        "format": "json",
        "limit": 1
    }
    headers = {
        "User-Agent": "SevaLinkAI/1.0 (production-admin@example.com)"
    }
    
    for attempt in range(retries):
        try:
            response = requests.get(url, params=params, headers=headers, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if data and len(data) > 0:
                lat = float(data[0]["lat"])
                lng = float(data[0]["lon"])
                return lat, lng
            else:
                return None, None
        except Exception as e:
            logger.warning(f"Geocoding error for '{location}' (Attempt {attempt+1}/{retries}): {e}")
            if attempt < retries - 1:
                time.sleep(1.0) # Rate limiting respect
            else:
                logger.error(f"Failed to geocode '{location}': {e}")
                
    return None, None
