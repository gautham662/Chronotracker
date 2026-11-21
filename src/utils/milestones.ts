import type { Session, Skill } from '../types';
import { LEVELS } from './levels';

export function getAchievedMilestones(skill: Skill, sessions: readonly Session[]) {
  const earnedLevels = LEVELS.filter(level => skill.total_seconds_logged >= level.minHours * 3600);
  const milestones = earnedLevels.map(level => ({
    name: level.name,
    date: level.minHours === 0 ? skill.created_at : null,
  }));

  // A total without matching session history cannot establish when a level was reached.
  const recordedSeconds = sessions.reduce((total, session) => total + session.duration_seconds, 0);
  if (milestones.length <= 1 || Math.abs(recordedSeconds - skill.total_seconds_logged) > 0.001) {
    return milestones;
  }

  // Older SQLite records omit the UTC suffix from completion timestamps.
  const completionTime = (session: Session) => Date.parse(
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(session.completed_at)
      ? session.completed_at
      : `${session.completed_at}Z`,
  );
  const orderedSessions = [...sessions].sort((first, second) =>
    completionTime(first) - completionTime(second) || first.id - second.id,
  );

  let loggedSeconds = 0;
  let nextMilestone = 1;
  for (const session of orderedSessions) {
    loggedSeconds += session.duration_seconds;
    while (
      nextMilestone < milestones.length &&
      loggedSeconds >= earnedLevels[nextMilestone].minHours * 3600
    ) {
      milestones[nextMilestone].date = session.completed_at;
      nextMilestone += 1;
    }
    if (nextMilestone === milestones.length) break;
  }

  return milestones;
}
