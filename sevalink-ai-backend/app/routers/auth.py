from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import bcrypt
from fastapi_jwt_auth2 import AuthJWT
from pydantic import BaseModel
import os

from .. import database
from ..models import user as model
from ..schemas import auth as schema

router = APIRouter(
    prefix="/api/auth",
    tags=["authentication"]
)

# Password hashing setup using direct bcrypt
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

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
    hashed_pwd = hash_password(user.password)

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

    if not verify_password(user.password, db_user.hashed_password):
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