import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from . import models, schemas

# 10,000-Foot View:
# This module implements our Authentication Security Layer.
# - Password hashing uses Passlib with the bcrypt algorithm (industry standard).
# - JWT generation issues stateless signatures containing user credentials.
# - Dependency guards authenticate endpoints by verifying incoming Authorization Headers.

# Configuration configuration. In a real-world app, load these from environment variables!
SECRET_KEY = "CHRONO_TRACKER_SUPER_DUPER_SECRET_KEY_NEVER_SHARE_THIS_IN_PRODUCTION"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # Tokens valid for 7 days (good for mobile client UX)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Tells FastAPI where to fetch the token from. "tokenUrl" references the route that generates tokens.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# Password Hashing utilities
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# JWT Generation utilities
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# FastAPI Dependency: Validates the token and retrieves the current authenticated user
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user
