// TypeScript port of readiness()/profileCompleteness()/codingScore() from
// ../../careerlens/src/api/engine.js — same math, so the score in a weekly HISTORY# snapshot
// (written by lambda/auth/bundle.ts) always agrees with what the frontend would compute live from
// the same data. Ported rather than shared because the frontend build has no access to this repo.
import { skillMatch, type CandidateSkill } from './candidateScoring';
import { roadmapStats, type Roadmap } from './roadmapEngine';
import { ROLES, roleById } from './rolesCatalog';

const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));

interface Profile {
  targetRoleId?: string;
  skills: CandidateSkill[];
  about?: string;
  education: unknown[];
  experience: unknown[];
  certifications: { status: string }[];
  projects: { link?: string }[];
  headline?: string;
  resume?: { fileName?: string; sizeKb?: number };
  external: {
    leetcode: { solved?: number };
    github: { commits?: number };
    codeforces: { rating?: number };
  };
}

interface Application {
  status: string;
}

export interface ReadinessInput {
  profile: Profile;
  roadmap: Roadmap;
  applications: Application[];
}

export function profileCompleteness(profile: Profile) {
  const checks: [string, boolean, number][] = [
    ['About', !!profile.about && profile.about.length > 60, 10],
    ['Headline', !!profile.headline, 5],
    ['Education', profile.education.length > 0, 10],
    ['Experience', profile.experience.length > 0, 15],
    ['Skills (8+)', profile.skills.length >= 8, 15],
    ['Certifications', profile.certifications.some((c) => c.status === 'earned'), 10],
    ['Projects (2+)', profile.projects.length >= 2, 15],
    ['Coding profiles', !!profile.external.leetcode.solved || !!profile.external.github.commits, 10],
    ['Resume uploaded', !!profile.resume?.fileName, 10],
  ];
  const score = checks.reduce((s, c) => s + (c[1] ? c[2] : 0), 0);
  return { score };
}

export function codingScore(ext: Profile['external']): number {
  const lc = clamp(((ext.leetcode.solved || 0) / 300) * 100);
  const gh = clamp(((ext.github.commits || 0) / 800) * 100);
  const cf = clamp(((ext.codeforces.rating || 0) / 1600) * 100);
  return Math.round(lc * 0.5 + gh * 0.35 + cf * 0.15);
}

export function readiness(rec: ReadinessInput): number {
  const role = roleById(rec.profile.targetRoleId ?? '') ?? ROLES[0];
  const match = skillMatch(rec.profile.skills, { skills: role.skills }).score;
  const rs = roadmapStats(rec.roadmap);
  const comp = profileCompleteness(rec.profile).score;
  const code = codingScore(rec.profile.external);
  const active = clamp(rec.applications.filter((a) => a.status !== 'APPLIED').length * 12, 0, 100);
  const parts = [
    { value: match, weight: 0.4 },
    { value: rs.progress, weight: 0.2 },
    { value: comp, weight: 0.15 },
    { value: code, weight: 0.15 },
    { value: active, weight: 0.1 },
  ];
  return Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0));
}
