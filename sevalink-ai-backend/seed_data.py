import sqlite3
import json

conn = sqlite3.connect('sevalink_mvp.db')
cur = conn.cursor()

# Seed priority needs
needs = [
    (201, 'Ahmedabad', 'Medical', 2500, 'Critical', 9.8, 23.0225, 72.5714),
    (202, 'Surat', 'Water', 1800, 'Critical', 9.5, 21.1702, 72.8311),
    (203, 'Mumbai', 'Food', 3200, 'High', 8.4, 19.0760, 72.8777),
    (204, 'Delhi', 'Medical', 900, 'High', 8.1, 28.7041, 77.1025),
    (205, 'Pune', 'Logistics', 650, 'Medium', 6.2, 18.5204, 73.8567),
]
for n in needs:
    cur.execute(
        'INSERT INTO needs (community_id, location, need_type, people_affected, urgency_level, priority_score, lat, lng) VALUES (?,?,?,?,?,?,?,?)',
        n
    )

# Seed more volunteers
volunteers = [
    ('Raj Nair', 'Ahmedabad', 'Weekends', json.dumps(['Medical', 'First Aid', 'Doctor']), 23.0225, 72.5714),
    ('Sneha Verma', 'Surat', 'Full-time Action', json.dumps(['Logistics', 'Cooking', 'Distribution']), 21.1702, 72.8311),
    ('Dev Mehta', 'Mumbai', 'Weekdays', json.dumps(['Medical', 'Nurse', 'First Aid']), 19.0760, 72.8777),
    ('Pooja Singh', 'Delhi', 'Emergency Only', json.dumps(['Teaching', 'Counseling']), 28.7041, 77.1025),
    ('Aakash Patel', 'Ahmedabad', 'Full-time Action', json.dumps(['Heavy Lifting', 'Driver', 'Logistics']), 23.0225, 72.5714),
    ('Riya Kapoor', 'Mumbai', 'Weekends', json.dumps(['Medical', 'Nurse']), 19.0760, 72.8777),
    ('Suresh Kumar', 'Surat', 'Full-time Action', json.dumps(['Water', 'Plumbing', 'Logistics']), 21.1702, 72.8311),
]
for v in volunteers:
    cur.execute(
        'INSERT INTO volunteers (name, location, availability, skills, lat, lng) VALUES (?,?,?,?,?,?)',
        v
    )

# Fix malformed location coordinate
cur.execute("UPDATE volunteers SET lat=23.0225, lng=72.5714 WHERE location='Ahmedabad , India'")

conn.commit()

cur.execute('SELECT COUNT(*) FROM needs')
print('Total Needs:', cur.fetchone()[0])
cur.execute('SELECT COUNT(*) FROM volunteers')
print('Total Volunteers:', cur.fetchone()[0])

conn.close()
print('Seeding complete!')
