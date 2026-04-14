"""
seed.py — Run this ONCE before your demo to pre-fill the database with realistic test data.
Usage: python seed.py
"""

import requests

BASE_URL = "http://localhost:8000"

# ─── Sample Community Needs ────────────────────────────────────────────────────
NEEDS = [
    {
        "community_id": 101,
        "location": "Ahmedabad",
        "need_type": "Water",
        "people_affected": 350,
        "urgency_level": "Critical",
    },
    {
        "community_id": 102,
        "location": "Surat",
        "need_type": "Medical",
        "people_affected": 80,
        "urgency_level": "Critical",
    },
    {
        "community_id": 103,
        "location": "Pune",
        "need_type": "Food",
        "people_affected": 200,
        "urgency_level": "High",
    },
    {
        "community_id": 104,
        "location": "Mumbai",
        "need_type": "Education",
        "people_affected": 120,
        "urgency_level": "Medium",
    },
    {
        "community_id": 105,
        "location": "Ahmedabad",
        "need_type": "Medical",
        "people_affected": 60,
        "urgency_level": "High",
    },
    {
        "community_id": 106,
        "location": "Delhi",
        "need_type": "Water",
        "people_affected": 500,
        "urgency_level": "Critical",
    },
    {
        "community_id": 107,
        "location": "Surat",
        "need_type": "Food",
        "people_affected": 150,
        "urgency_level": "High",
    },
]

# ─── Sample Volunteers ─────────────────────────────────────────────────────────
VOLUNTEERS = [
    {
        "name": "Rahul Mehta",
        "skills": ["Medical", "First Aid"],
        "location": "Ahmedabad",
        "availability": "Weekend",
    },
    {
        "name": "Priya Shah",
        "skills": ["Teaching", "Counseling"],
        "location": "Mumbai",
        "availability": "Any",
    },
    {
        "name": "Arjun Patel",
        "skills": ["Logistics", "Driver"],
        "location": "Surat",
        "availability": "Weekdays",
    },
    {
        "name": "Neha Joshi",
        "skills": ["Medical", "Nurse"],
        "location": "Surat",
        "availability": "Any",
    },
    {
        "name": "Vikram Singh",
        "skills": ["Logistics", "Heavy Lifting"],
        "location": "Delhi",
        "availability": "Weekend",
    },
    {
        "name": "Ananya Rao",
        "skills": ["Teaching", "Cooking"],
        "location": "Pune",
        "availability": "Any",
    },
    {
        "name": "Karan Desai",
        "skills": ["Doctor", "First Aid"],
        "location": "Ahmedabad",
        "availability": "Weekdays",
    },
]


def seed():
    print("🌱 SevaLink AI — Seeding demo database...\n")
    
    # Seed Needs
    print("📌 Uploading Community Needs:")
    for n in NEEDS:
        try:
            res = requests.post(f"{BASE_URL}/api/needs/upload", json=n)
            data = res.json()
            print(f"  ✅ [{data.get('urgency_level', n['urgency_level'])}] {n['location']} — {n['need_type']} (Priority: {data.get('priority_score', '?')})")
        except Exception as e:
            print(f"  ❌ Failed to upload need {n}: {e}")

    print()

    # Seed Volunteers
    print("🙋 Registering Volunteers:")
    for v in VOLUNTEERS:
        try:
            res = requests.post(f"{BASE_URL}/api/volunteers/", json=v)
            data = res.json()
            print(f"  ✅ {data.get('name', v['name'])} @ {v['location']} — Skills: {', '.join(v['skills'])}")
        except Exception as e:
            print(f"  ❌ Failed to register volunteer {v}: {e}")

    print()
    print("🎉 Seed data inserted! Open http://localhost:3000/dashboard to see your live command center.")


if __name__ == "__main__":
    seed()
