import React from 'react';
import { getLevel } from '../utils/levels';

interface LevelBadgeProps {
  totalHoursLogged: number;
}

const LevelBadge: React.FC<LevelBadgeProps> = ({ totalHoursLogged }) => {
  const levelInfo = getLevel(totalHoursLogged);

  return (
    <div className="level-badge" style={{ backgroundColor: `${levelInfo.color}20`, color: levelInfo.color }}>
      <span className="level-icon">{levelInfo.badge}</span>
      <span className="level-name">Lvl {levelInfo.name}</span>
    </div>
  );
};

export default LevelBadge;
