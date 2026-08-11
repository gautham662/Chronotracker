from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models, schemas, auth

# 10,000-Foot View:
# This router logs Pomodoro focus blocks (Sessions).
# - POST /sessions: Creates a session record, validating that the skill belongs to the logged-in user.
#   It automatically increments 'skill.total_seconds_logged' by the session's duration.
# - GET /sessions: Returns history of all completed and partial focus blocks.

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.post("", response_model=schemas.SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session_in: schemas.SessionCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Verify skill ownership
    db_skill = db.query(models.Skill).filter(
        models.Skill.id == session_in.skill_id, models.Skill.user_id == current_user.id
    ).first()
    
    if not db_skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found or access denied"
        )

    # 1. Check Priority Focus limit hard-enforcement
    # Pull all skills for the current user, sorted by priority (descending), then by name (alphabetically)
    all_user_skills = db.query(models.Skill).filter(
        models.Skill.user_id == current_user.id
    ).order_by(models.Skill.priority.desc(), models.Skill.name.asc()).all()

    # Establish which skills fall inside the focus limit (e.g. top 3 skills)
    focus_limit = current_user.focus_limit
    focused_skill_ids = [s.id for s in all_user_skills[:focus_limit]]

    # If this skill is outside the active focus ranks, block tracking
    if db_skill.id not in focused_skill_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This skill is locked. You can only focus on your top {focus_limit} priority skills. Please adjust your priority scale or focus limit."
        )

    # 2. Log the Session
    db_session = models.Session(
        **session_in.model_dump(),
        user_id=current_user.id
    )
    db.add(db_session)

    # 3. Automatically roll up/aggregate total tracked seconds to the parent Skill
    db_skill.total_seconds_logged += session_in.duration_seconds

    db.commit()
    db.refresh(db_session)
    return db_session


@router.get("", response_model=List[schemas.SessionResponse])
def read_sessions(
    skill_id: Optional[int] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Session).filter(models.Session.user_id == current_user.id)
    if skill_id is not None:
        query = query.filter(models.Session.skill_id == skill_id)
    return query.all()
