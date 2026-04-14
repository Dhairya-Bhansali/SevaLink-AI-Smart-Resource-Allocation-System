from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import volunteers, needs, matching, dashboard
from .database import engine
from .models import base

# Create all database tables
base.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SevaLink AI",
    description="Community Needs Intelligence & Volunteer Matching System MVP",
    version="1.0.0"
)

# Allow all origins for the hackathon MVP
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(volunteers.router)
app.include_router(needs.router)
app.include_router(matching.router)
app.include_router(dashboard.router)

@app.get("/")
def root():
    return {"message": "Welcome to SevaLink AI Backend MVP"}
