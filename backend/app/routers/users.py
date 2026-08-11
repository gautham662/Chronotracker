from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
from .. import models, schemas, auth

# 10,000-Foot View:
# This router controls authentication and user accounts.
# - POST /auth/signup: registers a user, hashes password, returns a JWT token.
# - POST /auth/login: validates credentials, returns a JWT token.
# - GET /users/me: returns authenticated user profile.
# - PATCH /users/me: lets users update profile details (like focus limit or username).

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def signup(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if username or email already exists
    db_user_username = db.query(models.User).filter(models.User.username == user_in.username).first()
    if db_user_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    db_user_email = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user and write to DB
    hashed_password = auth.get_password_hash(user_in.password)
    db_user = models.User(
        username=user_in.username,
        email=user_in.email,
        password_hash=hashed_password,
        focus_limit=3  # Standard focus limit (user can focus on 3 skills simultaneously)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Generate login token immediately on signup
    access_token = auth.create_access_token(data={"sub": db_user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Authenticate credentials. The form_data.username will represent username or email.
    user = db.query(models.User).filter(
        (models.User.username == form_data.username) | (models.User.email == form_data.username)
    ).first()
    
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate JWT
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


# Extra route to read and update authenticated user details
user_router = APIRouter(prefix="/users", tags=["Users"])

@user_router.get("/me", response_model=schemas.UserResponse)
def get_user_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@user_router.patch("/me", response_model=schemas.UserResponse)
def update_user_profile(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Perform fields check and update
    if user_update.username is not None:
        # Prevent duplicate username collision
        collision = db.query(models.User).filter(
            models.User.username == user_update.username, models.User.id != current_user.id
        ).first()
        if collision:
            raise HTTPException(status_code=400, detail="Username already in use")
        current_user.username = user_update.username
        
    if user_update.email is not None:
        collision = db.query(models.User).filter(
            models.User.email == user_update.email, models.User.id != current_user.id
        ).first()
        if collision:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = user_update.email
        
    if user_update.focus_limit is not None:
        current_user.focus_limit = user_update.focus_limit
        
    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url

    db.commit()
    db.refresh(current_user)
    return current_user
