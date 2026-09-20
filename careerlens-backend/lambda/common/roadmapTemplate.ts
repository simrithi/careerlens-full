import { randomUUID } from 'node:crypto';
import type { Goal, Milestone, Phase, Roadmap } from './roadmapEngine';

// Default starter template for a brand-new real account, ported from
// src/data/roadmapTemplates.js's 'android-google' entry. There's no onboarding wizard yet
// (prompt B4, not built) to let a real user pick a role/company/months, so every new signup
// starts here and can retarget via PATCH /roadmap/goal (same limitation the mock has today —
// setGoal only patches goal fields, it doesn't regenerate phases either).
const DEFAULT_TEMPLATE = {
  key: 'android-google',
  title: 'Android Developer',
  company: 'Google',
  months: 8,
  phases: [
    {
      id: 'p1', name: 'Foundations', icon: '🧱', spanMonths: [0, 1.5] as [number, number],
      milestones: [
        { title: 'Kotlin fundamentals course', type: 'learn', hours: 20, resource: { label: 'Kotlin docs', url: 'https://kotlinlang.org/docs/getting-started.html' } },
        { title: 'Android Basics with Compose', type: 'learn', hours: 30, resource: { label: 'Android Developers', url: 'https://developer.android.com/courses' } },
        { title: 'Git & GitHub workflow', type: 'learn', hours: 8, auto: 'github' },
        { title: 'Solve 50 DSA problems', type: 'practice', hours: 25, auto: 'leetcode' },
        { title: 'Set up Android Studio + emulator', type: 'learn', hours: 3 },
      ],
    },
    {
      id: 'p2', name: 'Build Projects', icon: '🛠️', spanMonths: [1.5, 3.5] as [number, number],
      milestones: [
        { title: 'Weather app with Jetpack Compose', type: 'build', hours: 25, auto: 'github' },
        { title: 'Chat app with Firebase', type: 'build', hours: 30, auto: 'github' },
        { title: 'Offline-first notes app (Room)', type: 'build', hours: 20, auto: 'github' },
        { title: 'Learn MVVM + Hilt', type: 'learn', hours: 18 },
        { title: 'Publish an app on Play Store', type: 'build', hours: 12 },
      ],
    },
    {
      id: 'p3', name: 'Certify', icon: '🎓', spanMonths: [3.5, 4.5] as [number, number],
      milestones: [
        { title: 'Android developer certificate prep', type: 'certify', hours: 40, resource: { label: 'Coursera: Meta Android Developer', url: 'https://www.coursera.org/professional-certificates/meta-android-developer' } },
        { title: 'Take the certificate exam', type: 'certify', hours: 6, auto: 'credly' },
        { title: 'Polish portfolio + README files', type: 'build', hours: 10 },
      ],
    },
    {
      id: 'p4', name: 'Experience', icon: '💼', spanMonths: [4.5, 6] as [number, number],
      milestones: [
        { title: '3 pull requests to an open-source Android repo', type: 'experience', hours: 30, auto: 'github' },
        { title: 'Android internship or freelance project', type: 'experience', hours: 120 },
        { title: 'Complete one paid micro-gig', type: 'experience', hours: 15 },
      ],
    },
    {
      id: 'p5', name: 'Interview Prep', icon: '🎤', spanMonths: [6, 7.5] as [number, number],
      milestones: [
        { title: 'Reach 150 solved DSA problems', type: 'practice', hours: 60, auto: 'leetcode' },
        { title: 'Android interview question bank', type: 'practice', hours: 40 },
        { title: 'Mobile system design basics', type: 'learn', hours: 20 },
        { title: '5 mock interviews', type: 'practice', hours: 10 },
      ],
    },
    {
      id: 'p6', name: 'Apply', icon: '🚀', spanMonths: [7.5, 8] as [number, number],
      milestones: [
        { title: 'Tailor resume for target role', type: 'apply', hours: 5 },
        { title: 'Apply to 30 targeted roles', type: 'apply', hours: 10 },
        { title: 'Referral outreach (10 people)', type: 'apply', hours: 8 },
        { title: 'Final mock interview', type: 'apply', hours: 3 },
      ],
    },
  ],
};

const dayOf = (months: number) => Math.round(months * 30.4);
const isoOffset = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

// Builds a fresh roadmap starting today, nothing pre-completed — unlike the demo seed's
// pre-populated accounts, a real signup has done none of this yet.
export function generateDefaultRoadmap(): Roadmap {
  const t = DEFAULT_TEMPLATE;
  const phases: Phase[] = t.phases.map((p) => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
    milestones: p.milestones.map((m, i, arr): Milestone => {
      const due = dayOf(p.spanMonths[0] + ((p.spanMonths[1] - p.spanMonths[0]) * (i + 1)) / arr.length);
      return { id: randomUUID(), done: false, doneAt: null, due: isoOffset(due), ...m };
    }),
  }));
  const goal: Goal = {
    roleId: 'android',
    title: t.title,
    company: t.company,
    months: t.months,
    startDate: isoOffset(0),
    deadline: isoOffset(dayOf(t.months)),
  };
  return { templateKey: t.key, goal, phases, replans: 0 };
}
