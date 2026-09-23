import { LevelInfo } from '../types';

export const LEVELS = [
  { name: 'Newbie', badge: '🟢', color: '#22c55e', minHours: 0 },
  { name: 'Explorer', badge: '🔵', color: '#3b82f6', minHours: 5 },
  { name: 'Builder', badge: '🟡', color: '#eab308', minHours: 10 },
  { name: 'Skilled', badge: '🟠', color: '#f97316', minHours: 20 },
  { name: 'Apprentice', badge: '🔴', color: '#ef4444', minHours: 25 },
  { name: 'Pro', badge: '🟣', color: '#a855f7', minHours: 50 },
  { name: 'Master', badge: '⭐', color: '#eab308', minHours: 100 },
];

export const getLevel = (totalHoursLogged: number): LevelInfo => {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];

  for (let i = 0; i < LEVELS.length; i++) {
    if (totalHoursLogged >= LEVELS[i].minHours) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
    } else {
      break;
    }
  }

  return {
    ...currentLevel,
    nextLevelName: nextLevel?.name,
    nextLevelHours: nextLevel?.minHours,
  };
};

export const getMilestoneProgress = (totalHoursLogged: number) => {
  const levelInfo = getLevel(totalHoursLogged);
  if (!levelInfo.nextLevelHours) {
    return { nextLevel: null, percentage: 100 }; // Max level reached
  }

  const currentLevelMin = levelInfo.minHours;
  const nextLevelMin = levelInfo.nextLevelHours;
  
  const hoursIntoCurrentLevel = totalHoursLogged - currentLevelMin;
  const hoursRequiredForNextLevel = nextLevelMin - currentLevelMin;
  
  const percentage = Math.min(
    100,
    Math.max(0, (hoursIntoCurrentLevel / hoursRequiredForNextLevel) * 100)
  );

  return { nextLevel: levelInfo.nextLevelName, percentage };
};
