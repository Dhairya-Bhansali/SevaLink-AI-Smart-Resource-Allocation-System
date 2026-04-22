import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi
from fastapi_jwt_auth2.exceptions import AuthJWTException
from dotenv import load_dotenv

from .routers import volunteers, needs, matching, dashboard, auth
from .routers import predictions, simulation, system, notifications
from .database import engine
from .models import base
from .middleware.performance import PerformanceMiddleware

load_dotenv()

# Create logs folder
if not os.path.exists("logs"):
    os.makedirs("logs")

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("logs/app.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Create DB tables
base.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SevaLink AI",
    description="Community Needs Intelligence & Volunteer Matching System MVP",
    version="1.0.0"
)

# JWT Exception Handler
@app.exception_handler(AuthJWTException)
def authjwt_exception_handler(request: Request, exc: AuthJWTException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message}
    )

# Performance Middleware
app.add_middleware(PerformanceMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(volunteers.router)
app.include_router(needs.router)
app.include_router(matching.router)
app.include_router(dashboard.router)
app.include_router(predictions.router)
app.include_router(simulation.router)
app.include_router(system.router)
app.include_router(notifications.router)

# Startup Event
@app.on_event("startup")
def startup_event():
    logger.info("Application started. Loading configurations.")

@app.get("/")
def root():
    logger.info("Root endpoint accessed")
    return {"message": "Welcome to SevaLink AI Backend MVP"}

# =========================
# 🔒 ADD JWT AUTHORIZE BUTTON TO SWAGGER
# =========================

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="SevaLink AI",
        version="1.0.0",
        description="Community Needs Intelligence & Volunteer Matching System",
        routes=app.routes,
    )

    # Add JWT Security Scheme
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }

    # Apply security globally
    openapi_schema["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi