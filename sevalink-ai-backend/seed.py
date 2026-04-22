"""
seed.py -- Run this ONCE before your demo to pre-fill the database.
Usage:  python seed.py
"""
import requests, sys

BASE_URL = "http://localhost:8000"
TIMEOUT  = 10  # seconds per request

# ---------------------------------------------------------------------------
# Community Needs  -- Exactly 9 needs: 3 Ahmedabad, 1 Gandhinagar, 5 others
# ---------------------------------------------------------------------------
NEEDS = [
    # Ahmedabad - 3 separate neighbourhoods
    {
        "community_id": 101,
        "location": "Ahmedabad - Maninagar",
        "need_type": "Water",
        "people_affected": 420,
        "urgency_level": "Critical",
        "lat": 22.9990, "lng": 72.6050,
    },
    {
        "community_id": 102,
        "location": "Ahmedabad - Navrangpura",
        "need_type": "Medical",
        "people_affected": 260,
        "urgency_level": "Critical",
        "lat": 23.0420, "lng": 72.5620,
    },
    {
        "community_id": 103,
        "location": "Ahmedabad - Naroda",
        "need_type": "Food",
        "people_affected": 380,
        "urgency_level": "Critical",
        "lat": 23.0790, "lng": 72.6550,
    },
    # Gandhinagar - 1 need
    {
        "community_id": 106,
        "location": "Gandhinagar",
        "need_type": "Logistics",
        "people_affected": 140,
        "urgency_level": "High",
        "lat": 23.2156, "lng": 72.6369,
    },
    # 5 Others
    {
        "community_id": 104,
        "location": "Surat",
        "need_type": "Medical",
        "people_affected": 180,
        "urgency_level": "Critical",
        "lat": 21.1702, "lng": 72.8311,
    },
    {
        "community_id": 105,
        "location": "Vadodara",
        "need_type": "Water",
        "people_affected": 310,
        "urgency_level": "High",
        "lat": 22.3072, "lng": 73.1812,
    },
    {
        "community_id": 108,
        "location": "Mumbai - Dharavi",
        "need_type": "Water",
        "people_affected": 500,
        "urgency_level": "Critical",
        "lat": 19.0415, "lng": 72.8545,
    },
    {
        "community_id": 109,
        "location": "Delhi - Yamuna Pusta",
        "need_type": "Shelter",
        "people_affected": 650,
        "urgency_level": "Critical",
        "lat": 28.6692, "lng": 77.2452,
    },
    {
        "community_id": 110,
        "location": "Pune - Wagholi",
        "need_type": "Education",
        "people_affected": 190,
        "urgency_level": "Medium",
        "lat": 18.5686, "lng": 73.9820,
    },
]

# ---------------------------------------------------------------------------
# Volunteers - 20 volunteers
# ---------------------------------------------------------------------------
VOLUNTEERS = [
    {"name": "Rahul Mehta",   "skills": ["Medical", "First Aid"],         "location": "Ahmedabad", "availability": "Weekend", "lat": 23.0225, "lng": 72.5714},
    {"name": "Priya Shah",    "skills": ["Teaching", "Counseling"],       "location": "Mumbai",    "availability": "Any", "lat": 19.0760, "lng": 72.8777},
    {"name": "Arjun Patel",   "skills": ["Logistics", "Driver"],          "location": "Surat",     "availability": "Weekdays", "lat": 21.1702, "lng": 72.8311},
    {"name": "Neha Joshi",    "skills": ["Medical", "Nurse"],             "location": "Surat",     "availability": "Any", "lat": 21.1702, "lng": 72.8311},
    {"name": "Vikram Singh",  "skills": ["Logistics", "Heavy Lifting"],   "location": "Delhi",     "availability": "Weekend", "lat": 28.7041, "lng": 77.1025},
    {"name": "Ananya Rao",    "skills": ["Teaching", "Cooking"],          "location": "Pune",      "availability": "Any", "lat": 18.5204, "lng": 73.8567},
    {"name": "Karan Desai",   "skills": ["Doctor", "First Aid"],          "location": "Ahmedabad", "availability": "Weekdays", "lat": 23.0225, "lng": 72.5714},
    {"name": "Meera Iyer",    "skills": ["Nurse", "First Aid", "Medical"],"location": "Ahmedabad", "availability": "Any", "lat": 23.0225, "lng": 72.5714},
    {"name": "Suresh Nair",   "skills": ["Logistics", "Distribution"],    "location": "Ahmedabad", "availability": "Any", "lat": 23.0225, "lng": 72.5714},
    {"name": "Divya Kapoor",  "skills": ["Plumbing", "Heavy Lifting"],    "location": "Delhi",     "availability": "Weekend", "lat": 28.7041, "lng": 77.1025},
    {"name": "Arun Kumar",    "skills": ["Medical", "Doctor"],            "location": "Hyderabad", "availability": "Any", "lat": 17.3850, "lng": 78.4867},
    {"name": "Sonal Verma",   "skills": ["Cooking", "Food Distribution"], "location": "Vadodara",  "availability": "Weekdays", "lat": 22.3072, "lng": 73.1812},
    {"name": "Nikhil Sharma", "skills": ["Logistics", "Driver"],          "location": "Rajkot",    "availability": "Any", "lat": 22.3039, "lng": 70.8022},
    {"name": "Pooja Nair",    "skills": ["Teaching", "Counseling"],       "location": "Bangalore", "availability": "Weekend", "lat": 12.9716, "lng": 77.5946},
    {"name": "Rohit Gupta",   "skills": ["First Aid", "Heavy Lifting"],   "location": "Delhi",     "availability": "Any", "lat": 28.7041, "lng": 77.1025},
    {"name": "Ayesha Khan",   "skills": ["Medical", "Nurse"],             "location": "Ahmedabad", "availability": "Any", "lat": 23.0225, "lng": 72.5714},
    {"name": "Manoj Tiwari",  "skills": ["Logistics", "Heavy Lifting"],   "location": "Gandhinagar","availability": "Weekdays", "lat": 23.2156, "lng": 72.6369},
    {"name": "Sneha Reddy",   "skills": ["First Aid", "Cooking"],         "location": "Hyderabad", "availability": "Weekend", "lat": 17.3850, "lng": 78.4867},
    {"name": "Ravi Shastri",  "skills": ["Plumbing", "Distribution"],     "location": "Mumbai",    "availability": "Any", "lat": 19.0760, "lng": 72.8777},
    {"name": "Deepak Chahar", "skills": ["Driver", "Logistics"],          "location": "Pune",      "availability": "Weekdays", "lat": 18.5204, "lng": 73.8567},
]


def seed():
    print("[SevaLink AI] Seeding demo database...\n")

    # -- Needs --
    print(f"[+] Uploading {len(NEEDS)} Community Needs:")
    for n in NEEDS:
        try:
            res  = requests.post(f"{BASE_URL}/api/needs/upload", json=n, timeout=TIMEOUT)
            data = res.json()
            score = data.get("priority_score", "?")
            print(f"  OK [{n['urgency_level']:8s}] {n['location']:30s} {n['need_type']:12s} Score={score}")
        except Exception as e:
            print(f"  FAIL {n['location']} - {n['need_type']}: {e}", file=sys.stderr)

    print()

    # -- Volunteers --
    print(f"[+] Registering {len(VOLUNTEERS)} Volunteers:")
    for v in VOLUNTEERS:
        try:
            res  = requests.post(f"{BASE_URL}/api/volunteers/", json=v, timeout=TIMEOUT)
            data = res.json()
            print(f"  OK {data.get('name', v['name']):20s} @ {v['location']:12s} | {', '.join(v['skills'])}")
        except Exception as e:
            print(f"  FAIL {v['name']}: {e}", file=sys.stderr)

    print()
    print("=" * 60)
    print("[DONE] Seed complete!")
    print(f"  {len(NEEDS)} needs | 3 Ahmedabad, 1 Gandhinagar | {len(VOLUNTEERS)} volunteers")
    print("  Open http://localhost:5174")
    print("=" * 60)


if __name__ == "__main__":
    seed()
