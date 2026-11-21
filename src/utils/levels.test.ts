import { describe, expect, it } from 'vitest';
import { getLevel, getMilestoneProgress } from './levels';

describe('getLevel', () => {
  it('starts at Newbie with Explorer as the next milestone', () => {
    expect(getLevel(0)).toMatchObject({
      name: 'Newbie',
      nextLevelName: 'Explorer',
      nextLevelHours: 5,
    });
  });

  it.each([
    { hours: 5, before: 'Newbie', at: 'Explorer' },
    { hours: 10, before: 'Explorer', at: 'Builder' },
    { hours: 20, before: 'Builder', at: 'Skilled' },
    { hours: 25, before: 'Skilled', at: 'Apprentice' },
    { hours: 50, before: 'Apprentice', at: 'Pro' },
    { hours: 100, before: 'Pro', at: 'Master' },
  ])('changes from $before to $at at $hours hours', ({ hours, before, at }) => {
    expect(getLevel(hours - 0.01).name).toBe(before);
    expect(getLevel(hours).name).toBe(at);
  });

  it('has no next level after reaching Master', () => {
    const level = getLevel(120);

    expect(level.name).toBe('Master');
    expect(level.nextLevelName).toBeUndefined();
    expect(level.nextLevelHours).toBeUndefined();
  });
});

describe('getMilestoneProgress', () => {
  it.each([
    { hours: 0, nextLevel: 'Explorer', percentage: 0 },
    { hours: 2.5, nextLevel: 'Explorer', percentage: 50 },
    { hours: 5, nextLevel: 'Builder', percentage: 0 },
    { hours: 7.5, nextLevel: 'Builder', percentage: 50 },
    { hours: 99.5, nextLevel: 'Master', percentage: 99 },
    { hours: 100, nextLevel: null, percentage: 100 },
    { hours: 120, nextLevel: null, percentage: 100 },
  ])('calculates progress at $hours hours', ({ hours, nextLevel, percentage }) => {
    const progress = getMilestoneProgress(hours);

    expect(progress.nextLevel).toBe(nextLevel);
    expect(progress.percentage).toBeCloseTo(percentage);
  });
});
