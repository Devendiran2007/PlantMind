from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.auth import LoginRequest, Token
from app.core.security import verify_password, create_access_token
import logging

logger = logging.getLogger(__name__)

class AuthService:
    @staticmethod
    def authenticate_user(db: Session, login_data: LoginRequest) -> Token:
        # Search User
        user = db.query(User).filter(User.email == login_data.email).first()
        if not user:
            logger.warning(f"Login failed: user not found: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Verify crypted password
        if not verify_password(login_data.password, user.hashed_password):
            logger.warning(f"Login failed: incorrect password for: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if not user.is_active:
            logger.warning(f"Login failed: inactive account for: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is inactive"
            )
            
        # Issue JWT Access Token
        access_token = create_access_token(subject=user.email)
        logger.info(f"User {user.email} authenticated successfully. Access token granted.")
        return Token(access_token=access_token, token_type="bearer")
