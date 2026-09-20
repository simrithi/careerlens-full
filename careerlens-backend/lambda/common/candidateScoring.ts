// Ported from ../../careerlens/src/api/engine.js (skillMatch, projectAlignment) and
// src/pages/Company.jsx (scoreCandidate) — kept in lock-step with the frontend's own copy, which
// still runs the same math in mock mode. This copy exists so ranking runs server-side in real
// mode: per docs/api-contract.md, blind screening must be enforced server-side, which only works
// if the scoring (and the PII stripping below) can't be skipped by reading client JS.

export interface RoleSkillNeed {
  name: string;
  need: number;
  weight: number;
}

export interface CandidateSkill {
  name: string;
  level: number;
}

export interface Project {
  name: string;
  desc?: string;
  domains: string[];
}

export interface Candidate {
  id: string;
  name?: string;
  college?: string;
  city?: string;
  tier: string;
  exp: string;
  ats: number;
  leetcode: number;
  verified: number;
  skills: Record<string, number>;
  projects: Project[];
}

export interface Role {
  id: string;
  title: string;
  roleId: string;
  domains: string[];
  skills: RoleSkillNeed[];
}

const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));
const norm = (s: string) => s.toLowerCase().trim();

function skillLevel(skills: CandidateSkill[], name: string): number {
  const hit = skills.find((s) => norm(s.name) === norm(name));
  return hit ? hit.level : 0;
}

export function skillMatch(skills: CandidateSkill[], role: { skills: RoleSkillNeed[] }) {
  let total = 0;
  let got = 0;
  const rows = role.skills.map((r) => {
    const have = skillLevel(skills, r.name);
    const ratio = clamp(have / r.need, 0, 1);
    total += r.weight;
    got += r.weight * ratio;
    return { name: r.name, need: r.need, have, weight: r.weight, gap: Math.max(0, r.need - have), ratio };
  });
  const score = total > 0 ? Math.round((got / total) * 100) : 0;
  return {
    score,
    rows,
    missing: rows.filter((r) => r.ratio < 0.7).sort((a, b) => b.gap * b.weight - a.gap * a.weight),
  };
}

export function projectAlignment(project: Project, targetDomains: string[]) {
  const overlap = project.domains.filter((d) => targetDomains.includes(d));
  const score = clamp(Math.round((overlap.length / Math.max(3, Math.min(targetDomains.length, 5))) * 100));
  const label = score >= 70 ? 'Direct hire signal' : score >= 40 ? 'Relevant' : 'Weak signal';
  return { score, overlap, label };
}

// 55% skill match / 35% best project alignment / 10% ATS readiness — see docs/api-contract.md.
export function scoreCandidate(cand: Candidate, role: Role) {
  const skillsArr: CandidateSkill[] = Object.entries(cand.skills).map(([name, level]) => ({ name, level }));
  const sm = skillMatch(skillsArr, { skills: role.skills });
  const projects = cand.projects
    .map((p) => ({ p, ...projectAlignment(p, role.domains) }))
    .sort((a, b) => b.score - a.score);
  const best = projects[0];
  const total = Math.round(sm.score * 0.55 + (best?.score ?? 0) * 0.35 + (cand.ats / 100) * 10);
  return { sm, best, total };
}

// Candidate name/college/city are omitted until shortlisted. This must run here — the one place
// a caller cannot skip it by editing client JS or reading the network tab before shortlisting.
export function stripPii<T extends Candidate>(cand: T, shortlisted: boolean): T {
  if (shortlisted) return cand;
  const { name: _name, college: _college, city: _city, ...rest } = cand;
  return rest as T;
}
