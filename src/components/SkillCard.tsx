import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Skill } from '../types';
import GaugeBar from './GaugeBar';
import LevelBadge from './LevelBadge';

interface SkillCardProps {
  skill: Skill;
  isLocked: boolean;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, isLocked }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!isLocked) {
      navigate(`/skills/${skill.id}`);
    }
  };

  return (
    <div 
      className={`skill-card ${isLocked ? 'locked' : ''}`}
      onClick={handleClick}
    >
      <div className="skill-card-header">
        <h3 className="skill-title">{skill.name}</h3>
        <LevelBadge totalHoursLogged={skill.total_seconds_logged / 3600} />
      </div>
      
      <GaugeBar 
        totalHoursLogged={skill.total_seconds_logged / 3600} 
        targetHours={skill.target_hours} 
      />
      
      <div className="skill-card-footer">
        <div className="priority-circle">{skill.priority}</div>
        <span className="hours-text">
          {Math.floor(skill.total_seconds_logged / 3600)} hrs
        </span>
      </div>

      {isLocked && <div className="lock-overlay">🔒 Priority Too Low</div>}
    </div>
  );
};

export default SkillCard;
