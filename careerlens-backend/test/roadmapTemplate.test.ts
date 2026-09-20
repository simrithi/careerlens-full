import { describe, expect, it } from 'vitest';
import { generateDefaultRoadmap } from '../lambda/common/roadmapTemplate';

describe('generateDefaultRoadmap', () => {
  it('produces a roadmap with unique milestone ids, nothing pre-completed, and sane dates', () => {
    const roadmap = generateDefaultRoadmap();

    expect(roadmap.phases.length).toBeGreaterThan(0);
    const allMilestones = roadmap.phases.flatMap((p) => p.milestones);
    expect(allMilestones.length).toBeGreaterThan(0);
    expect(allMilestones.every((m) => m.done === false && m.doneAt === null)).toBe(true);

    const ids = allMilestones.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length); // all unique

    const start = new Date(roadmap.goal.startDate);
    const deadline = new Date(roadmap.goal.deadline);
    expect(deadline.getTime()).toBeGreaterThan(start.getTime());
    allMilestones.forEach((m) => {
      expect(new Date(m.due).getTime()).toBeGreaterThanOrEqual(start.getTime());
    });
  });
});
