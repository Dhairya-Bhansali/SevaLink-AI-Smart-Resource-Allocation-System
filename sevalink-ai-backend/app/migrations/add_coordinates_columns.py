import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'sevalink_mvp.db')

def column_exists(cursor, table_name, column_name):
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]
    return column_name in columns

def run_migration():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    tables = ["volunteers", "needs"]
    for table in tables:
        if not column_exists(cursor, table, "lat"):
            print(f"Adding 'lat' to {table}...")
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN lat FLOAT")
        else:
            print(f"'lat' already exists in {table}.")

        if not column_exists(cursor, table, "lng"):
            print(f"Adding 'lng' to {table}...")
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN lng FLOAT")
        else:
            print(f"'lng' already exists in {table}.")

    conn.commit()
    conn.close()
    print("Migration completed successfully.")

if __name__ == "__main__":
    run_migration()
