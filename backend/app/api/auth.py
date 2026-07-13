from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.auth import LoginRequest, Token, UserProfile
from app.services.auth_service import AuthService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT bearer token.
    """
    return AuthService.authenticate_user(db, login_data)

@router.get("/me", response_model=UserProfile)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Fetch details for current authenticated session.
    """
    return current_user
