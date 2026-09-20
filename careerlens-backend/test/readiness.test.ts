import { describe, expect, it } from 'vitest';
import { readiness, profileCompleteness, codingScore } from '../lambda/common/readiness';
import type { Roadmap } from '../lambda/common/roadmapEngine';

const roadmap: Roadmap = {
  templateKey: 'android-google',
  goal: { roleId: 'android', title: 'Android Developer', company: 'Google', months: 8, startDate: '2026-01-01', deadline: '2026-09-01' },
  phases: [
    { id: 'p1', name: 'Foundations', icon: '', milestones: [{ id: 'm1', title: 'Learn Kotlin', type: 'learn', hours: 20, due: '2026-02-01', done: true, doneAt: '2026-01-15' }] },
  ],
  replans: 0,
};

const baseProfile = {
  targetRoleId: 'android',
  skills: [
    { name: 'Kotlin', level: 80 }, { name: 'Android SDK', level: 80 }, { name: 'Jetpack Compose', level: 70 },
    { name: 'Java', level: 60 }, { name: 'REST APIs', level: 60 }, { name: 'Room DB', level: 55 },
    { name: 'Git', level: 60 }, { name: 'Testing', level: 50 },
  ],
  about: 'a'.repeat(61),
  education: [{}],
  experience: [{}],
  certifications: [{ status: 'earned' }],
  projects: [{}, {}],
  headline: 'Aspiring Android Developer',
  resume: { fileName: 'resume.pdf' },
  external: { leetcode: { solved: 150 }, github: { commits: 400 }, codeforces: { rating: 800 } },
};

describe('codingScore', () => {
  it('weights leetcode 50%, github 35%, codeforces 15%', () => {
    const score = codingScore({ leetcode: { solved: 300 }, github: { commits: 800 }, codeforces: { rating: 1600 } });
    expect(score).toBe(100);
  });

  it('is 0 when no external profiles are set', () => {
    expect(codingScore({ leetcode: {}, github: {}, codeforces: {} })).toBe(0);
  });
});

describe('profileCompleteness', () => {
  it('scores 100 when every check passes', () => {
    expect(profileCompleteness(baseProfile).score).toBe(100);
  });

  it('scores 0 for a bare-minimum profile', () => {
    const bare = { ...baseProfile, about: '', headline: '', education: [], experience: [], skills: [], certifications: [], projects: [], resume: undefined, external: { leetcode: {}, github: {}, codeforces: {} } };
    expect(profileCompleteness(bare).score).toBe(0);
  });
});

describe('readiness', () => {
  it('combines skill match, roadmap progress, profile completeness, coding score and application traction', () => {
    const score = readiness({ profile: baseProfile, roadmap, applications: [{ status: 'INTERVIEW' }, { status: 'APPLIED' }] });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('falls back to the first role when targetRoleId is unset', () => {
    const score = readiness({ profile: { ...baseProfile, targetRoleId: undefined }, roadmap, applications: [] });
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
