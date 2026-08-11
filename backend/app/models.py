import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Float
from sqlalchemy.orm import relationship
from .database import Base

# 10,000-Foot View:
# This module defines the relational database schemas (tables) for our SQLite DB:
# - Users: Holds login info, focus limits, and profile metadata.
# - Skills: Tracks the user's custom skills, their focus configuration, and total time accumulated.
# - Sessions: Logs historical entries for every Pomodoro block completed (or stopped midway).

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    focus_limit = Column(Integer, default=3, nullable=False)  # Customizable (default 3, range 2-4+)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    # If a user is deleted, all their associated skills are cascadingly deleted.
    skills = relationship("Skill", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False, index=True)
    target_hours = Column(Integer, default=20, nullable=False)  # User configurable (min 20)
    priority = Column(Integer, default=1, nullable=False)  # Scale 1-5, 5 is highest focus
    focus_minutes = Column(Integer, default=25, nullable=False)  # Customize Pomodoro focus timer length
    break_minutes = Column(Integer, default=5, nullable=False)  # Customize break timer length
    total_seconds_logged = Column(Float, default=0.0, nullable=False) # Aggregated skill hours
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="skills")
    sessions = relationship("Session", back_populates="skill", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    duration_seconds = Column(Float, nullable=False)  # Exact focus time completed
    started_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    was_completed = Column(Boolean, default=True, nullable=False)  # False if user closed mid-session

    # Relationships
    user = relationship("User", back_populates="sessions")
    skill = relationship("Skill", back_populates="sessions")
