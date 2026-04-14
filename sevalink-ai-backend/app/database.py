from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Replace with actual Hackathon PostgreSQL URI. 
# Using SQLite fallback for instant local testing if Postgres isn't ready.
SQLALCHEMY_DATABASE_URL = "sqlite:///./sevalink_mvp.db"
# SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/sevalink"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    # check_same_thread=False is needed only for SQLite
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
