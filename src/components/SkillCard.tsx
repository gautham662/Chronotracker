import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Skill } from '../types';
import GaugeBar from './GaugeBar';
import LevelBadge from './LevelBadge';

interface SkillCardProps {
  skill: Skill;
  isLocked: boolean;
  onOptionClick?: () => void;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, isLocked, onOptionClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!isLocked) {
      navigate(`/skills/${skill.id}`);
    }
  };

  const handleOptionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOptionClick) {
      onOptionClick();
    }
  };

  return (
    <div 
      className={`skill-card ${isLocked ? 'locked' : ''}`}
      onClick={handleClick}
    >
      <div className="skill-card-header">
        <h3 className="skill-title">{skill.name}</h3>
        <button
          type="button"
          className="skill-options-btn"
          aria-label="Skill options"
          title="Skill options"
          onClick={handleOptionClick}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>
      
      <GaugeBar 
        totalHoursLogged={skill.total_seconds_logged / 3600} 
        targetHours={skill.target_hours} 
      />
      
      <div className="skill-card-footer">
        <div className="skill-card-footer-left">
          <LevelBadge totalHoursLogged={skill.total_seconds_logged / 3600} />
        </div>
        <div className="skill-card-footer-right">
          <div className="priority-circle">{skill.priority}</div>
          <span className="hours-text">
            {Math.floor(skill.total_seconds_logged / 3600)} hrs
          </span>
        </div>
      </div>

      {isLocked && <div className="lock-overlay">🔒 Priority Too Low</div>}
    </div>
  );
};

export default SkillCard;
