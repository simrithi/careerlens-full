import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { roadmapStats, replanRoadmap, daysBetween } from '../lambda/common/roadmapEngine';
import type { Roadmap } from '../lambda/common/roadmapEngine';

// "Today" pinned so days-since-due math is deterministic instead of depending on when the test runs.
const TODAY = new Date('2026-01-15T00:00:00.000Z');

function fixture(): Roadmap {
  return {
    templateKey: 'test',
    goal: { roleId: 'android', title: 'Android Developer', company: 'Test Co', months: 1, startDate: '2026-01-01', deadline: '2026-01-31' },
    phases: [
      {
        id: 'p1', name: 'Foundations', icon: '🧱',
        milestones: [
          { id: 'm1', title: 'Done early', type: 'learn', hours: 10, due: '2026-01-05', done: true, doneAt: '2026-01-04' },
          { id: 'm2', title: 'Overdue', type: 'build', hours: 20, due: '2026-01-10', done: false, doneAt: null },
          { id: 'm3', title: 'Not due yet', type: 'build', hours: 30, due: '2026-01-20', done: false, doneAt: null },
        ],
      },
      {
        id: 'p2', name: 'Certify', icon: '🎓',
        milestones: [
          { id: 'm4', title: 'Later', type: 'certify', hours: 40, due: '2026-01-25', done: false, doneAt: null },
        ],
      },
    ],
    replans: 0,
  };
}

beforeEach(() => vi.useFakeTimers().setSystemTime(TODAY));
afterEach(() => vi.useRealTimers());

describe('daysBetween', () => {
  it('is positive when the date is in the past', () => {
    expect(daysBetween('2026-01-10')).toBe(5); // 5 days before pinned "today"
  });
  it('is negative when the date is in the future', () => {
    expect(daysBetween('2026-01-20')).toBe(-5);
  });
});

describe('roadmapStats', () => {
  it('matches hand-computed values for a known fixture (ported 1:1 from src/api/engine.js)', () => {
    const st = roadmapStats(fixture());

    expect(st.hoursTotal).toBe(100); // 10+20+30+40
    expect(st.hoursDone).toBe(10);
    expect(st.progress).toBe(10); // 10/100
    expect(st.totalDays).toBe(30); // Jan 1 -> Jan 31
    expect(st.elapsedDays).toBe(14); // Jan 1 -> Jan 15
    expect(st.elapsedPct).toBe(47); // round(14/30*100)
    expect(st.planned).toBe(30); // m1(10)+m2(20) already due = 30/100
    expect(st.diff).toBe(-20); // 10 - 30
    expect(st.pace).toBe('behind'); // -20 < -12
    expect(st.overdue.map((m) => m.id)).toEqual(['m2']);
    expect(st.current.id).toBe('p1'); // first phase with an undone milestone
    expect(st.totalMilestones).toBe(4);
    expect(st.doneMilestones).toBe(1);
    expect(st.phases).toEqual([
      { id: 'p1', name: 'Foundations', pct: 17, done: 1, total: 3 }, // round(10/60*100)
      { id: 'p2', name: 'Certify', pct: 0, done: 0, total: 1 },
    ]);
  });
});

describe('replanRoadmap', () => {
  it('shifts the overdue milestone by (daysLate + 7), untouched ones by 21, and extends the deadline', () => {
    const { roadmap, moved } = replanRoadmap(fixture());

    expect(moved).toBe(1); // only m2 was overdue
    const m1 = roadmap.phases[0].milestones[0];
    const m2 = roadmap.phases[0].milestones[1];
    const m3 = roadmap.phases[0].milestones[2];
    const m4 = roadmap.phases[1].milestones[0];

    expect(m1.due).toBe('2026-01-05'); // done milestones are never touched
    expect(m2.due).toBe('2026-01-22'); // was 5 days late -> +5+7=12 days from 01-10
    expect(m3.due).toBe('2026-02-10'); // not overdue -> flat +21 days from 01-20
    expect(m4.due).toBe('2026-02-15'); // not overdue -> flat +21 days from 01-25
    expect(roadmap.goal.deadline).toBe('2026-02-14'); // +14 days (min(21,14)) from 01-31
    expect(roadmap.replans).toBe(1);
  });

  it('does not mutate the input roadmap', () => {
    const original = fixture();
    const originalDue = original.phases[0].milestones[1].due;
    replanRoadmap(original);
    expect(original.phases[0].milestones[1].due).toBe(originalDue);
  });
});
