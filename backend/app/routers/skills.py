from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas, auth

# 10,000-Foot View:
# This router implements CRUD operations on Skills.
# - GET /skills: Lists all skills owned by the current user.
# - POST /skills: Creates a new skill.
# - PATCH /skills/{skill_id}: Updates metadata (target_hours, name, priority, focus/break minutes).
# - DELETE /skills/{skill_id}: Safely removes a skill.
#
# Under the hood, this router handles the core business rule:
# Priority focus hard-enforcement. Only the top N skills (based on user.focus_limit) are allowed to be tracked.
# If a user tries to start/track a skill whose rank lies outside this focus limit, the client blocks it.

router = APIRouter(prefix="/skills", tags=["Skills"])

@router.get("", response_model=List[schemas.SkillResponse])
def read_skills(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.Skill).filter(models.Skill.user_id == current_user.id).all()


@router.post("", response_model=schemas.SkillResponse, status_code=status.HTTP_201_CREATED)
def create_skill(
    skill_in: schemas.SkillCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_skill = models.Skill(
        **skill_in.model_dump(),
        user_id=current_user.id,
        total_seconds_logged=0.0
    )
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill


@router.patch("/{skill_id}", response_model=schemas.SkillResponse)
def update_skill(
    skill_id: int,
    skill_update: schemas.SkillUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_skill = db.query(models.Skill).filter(
        models.Skill.id == skill_id, models.Skill.user_id == current_user.id
    ).first()
    
    if not db_skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
        
    # Update fields provided in the PATCH body
    update_data = skill_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_skill, key, value)
        
    db.commit()
    db.refresh(db_skill)
    return db_skill


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(
    skill_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_skill = db.query(models.Skill).filter(
        models.Skill.id == skill_id, models.Skill.user_id == current_user.id
    ).first()
    
    if not db_skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
        
    db.delete(db_skill)
    db.commit()
    return None
