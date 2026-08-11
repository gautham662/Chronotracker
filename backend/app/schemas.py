from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# 10,000-Foot View:
# This module defines Pydantic Schemas. These schemas act as the "contract" between
# our client-side React code and our FastAPI backend. They handle strict validation
# of data coming in (requests) and format data going out (responses).

# ==========================================
# USER SCHEMAS
# ==========================================
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")

class UserLogin(BaseModel):
    username: str  # Can be username or email in implementation
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    focus_limit: Optional[int] = Field(None, ge=2, le=10, description="Focus limit must be between 2 and 10")
    avatar_url: Optional[str] = None

class UserResponse(UserBase):
    id: int
    focus_limit: int
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# AUTH SCHEMAS
# ==========================================
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None


# ==========================================
# SESSION SCHEMAS
# ==========================================
class SessionBase(BaseModel):
    skill_id: int
    duration_seconds: float = Field(..., gt=0)
    started_at: datetime
    completed_at: datetime
    was_completed: bool

class SessionCreate(SessionBase):
    pass

class SessionResponse(SessionBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


# ==========================================
# SKILL SCHEMAS
# ==========================================
class SkillBase(BaseModel):
    name: str = Field(..., min_length=1, description="Skill name cannot be empty")
    target_hours: int = Field(20, ge=20, description="Target hours must be at least 20 hours")
    priority: int = Field(1, ge=1, le=5, description="Priority must be between 1 and 5")
    focus_minutes: int = Field(25, ge=1, description="Focus time must be at least 1 minute")
    break_minutes: int = Field(5, ge=1, description="Break time must be at least 1 minute")

class SkillCreate(SkillBase):
    pass

class SkillUpdate(BaseModel):
    name: Optional[str] = None
    target_hours: Optional[int] = Field(None, ge=20)
    priority: Optional[int] = Field(None, ge=1, le=5)
    focus_minutes: Optional[int] = Field(None, ge=1)
    break_minutes: Optional[int] = Field(None, ge=1)

class SkillResponse(SkillBase):
    id: int
    user_id: int
    total_seconds_logged: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
