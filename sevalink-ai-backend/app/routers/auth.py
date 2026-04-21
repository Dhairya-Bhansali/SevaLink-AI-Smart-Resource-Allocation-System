from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel
import os

from .. import database
from ..models import user as model
from ..schemas import auth as schema

router = APIRouter(
    prefix="/api/auth",
    tags=["authentication"]
)

# Password hashing setup
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

# JWT Settings
class Settings(BaseModel):
    authjwt_secret_key: str = os.getenv(
        "JWT_SECRET",
        "supersecretkey"
    )

@AuthJWT.load_config
def get_config():
    return Settings()

# -------------------------
# REGISTER USER
# -------------------------
@router.post(
    "/register",
    response_model=schema.UserResponse
)
def register(
    user: schema.UserCreate,
    db: Session = Depends(database.get_db)
):

    # Check if username exists
    existing = db.query(model.User)\
        .filter(model.User.username == user.username)\
        .first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )

    # Hash password
    hashed_pwd = pwd_context.hash(
        user.password
    )

    # Validate role
    valid_roles = ["Admin", "NGO", "Volunteer"]

    role = (
        user.role
        if user.role in valid_roles
        else "Volunteer"
    )

    # Create user
    db_user = model.User(
        username=user.username,
        hashed_password=hashed_pwd,
        role=role
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # 🔧 CRITICAL FIX:
    # Return dictionary instead of SQLAlchemy object
    return {
        "id": db_user.id,
        "username": db_user.username,
        "role": db_user.role
    }

# -------------------------
# LOGIN USER
# -------------------------
@router.post(
    "/login",
    response_model=schema.TokenResponse
)
def login(
    user: schema.UserLogin,
    db: Session = Depends(database.get_db),
    Authorize: AuthJWT = Depends()
):

    db_user = db.query(model.User)\
        .filter(model.User.username == user.username)\
        .first()

    # Validate credentials
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    if not pwd_context.verify(
        user.password,
        db_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    # Create JWT token
    access_token = Authorize.create_access_token(
        subject=db_user.username,
        user_claims={
            "role": db_user.role
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }