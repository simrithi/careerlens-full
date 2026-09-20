// TypeScript port of roadmapStats()/replanRoadmap() from src/api/engine.js (careerlens frontend).
// Ported verbatim (same field names, same math) so pace/progress stay deterministic and identical
// between mock and real mode — Bedrock only phrases explanations elsewhere, never these numbers
// (see docs/api-contract.md). test/roadmapEngine.test.ts proves this against the ported template.

export interface Milestone {
  id: string;
  title: string;
  type: string;
  hours: number;
  due: string;
  done: boolean;
  doneAt: string | null;
  resource?: { label: string; url: string };
  auto?: string | null;
}

export interface Phase {
  id: string;
  name: string;
  icon: string;
  milestones: Milestone[];
}

export interface Goal {
  roleId: string;
  title: string;
  company: string;
  months: number;
  startDate: string;
  deadline: string;
}

export interface Roadmap {
  templateKey: string;
  goal: Goal;
  phases: Phase[];
  replans: number;
}

const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));

// Same semantics as src/utils/dates.js: days from `a` to `b` (positive when `a` is in the past).
export const daysBetween = (a: string, b: Date = new Date()): number =>
  Math.round((new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)) / 86400000);

const isoOffset = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export function roadmapStats(roadmap: Roadmap) {
  const all = roadmap.phases.flatMap((p) => p.milestones.map((m) => ({ ...m, phase: p.name, phaseId: p.id })));
  const totalH = all.reduce((s, m) => s + m.hours, 0);
  const doneH = all.filter((m) => m.done).reduce((s, m) => s + m.hours, 0);
  const progress = Math.round((doneH / totalH) * 100);
  const start = roadmap.goal.startDate;
  const end = roadmap.goal.deadline;
  const totalDays = Math.max(1, daysBetween(start, new Date(end)));
  const elapsedDays = clamp(daysBetween(start), 0, totalDays);
  const elapsedPct = Math.round((elapsedDays / totalDays) * 100);
  const plannedH = all.filter((m) => daysBetween(m.due) >= 0).reduce((s, m) => s + m.hours, 0);
  const planned = Math.round((plannedH / totalH) * 100);
  const diff = progress - planned;
  const pace = diff >= -3 ? (diff > 6 ? 'ahead' : 'on-track') : diff >= -12 ? 'slightly-behind' : 'behind';
  const overdue = all.filter((m) => !m.done && daysBetween(m.due) > 0);
  const current =
    roadmap.phases.find((p) => p.milestones.some((m) => !m.done)) || roadmap.phases[roadmap.phases.length - 1];
  const byType: Record<string, { total: number; done: number }> = {};
  all.forEach((m) => {
    byType[m.type] = byType[m.type] || { total: 0, done: 0 };
    byType[m.type].total += 1;
    if (m.done) byType[m.type].done += 1;
  });
  const phases = roadmap.phases.map((p) => {
    const t = p.milestones.reduce((s, m) => s + m.hours, 0);
    const d = p.milestones.filter((m) => m.done).reduce((s, m) => s + m.hours, 0);
    return { id: p.id, name: p.name, pct: Math.round((d / t) * 100), done: p.milestones.filter((m) => m.done).length, total: p.milestones.length };
  });
  return {
    progress, planned, diff, pace, elapsedPct, elapsedDays, totalDays, daysLeft: totalDays - elapsedDays,
    overdue, current, byType, phases, totalMilestones: all.length, doneMilestones: all.filter((m) => m.done).length,
    hoursDone: doneH, hoursTotal: totalH, hoursLeft: totalH - doneH,
    next: all.filter((m) => !m.done).sort((a, b) => +new Date(a.due) - +new Date(b.due)).slice(0, 4),
  };
}

// Deterministic re-plan (shift overdue work, add a catch-up buffer). Bedrock-constrained resource
// re-selection is future work (prompt A3's Bedrock step) — this ports only the math, which the
// guide is explicit must stay code-computed regardless.
export function replanRoadmap(roadmap: Roadmap): { roadmap: Roadmap; moved: number } {
  const shiftDays = 21;
  let moved = 0;
  const next: Roadmap = JSON.parse(JSON.stringify(roadmap));
  next.phases.forEach((p) => {
    p.milestones.forEach((m) => {
      if (!m.done) {
        const late = daysBetween(m.due);
        if (late > 0) moved += 1;
        const d = new Date(m.due);
        d.setDate(d.getDate() + (late > 0 ? late + 7 : shiftDays));
        m.due = d.toISOString().slice(0, 10);
      }
    });
  });
  const dl = new Date(next.goal.deadline);
  dl.setDate(dl.getDate() + Math.min(shiftDays, 14));
  next.goal.deadline = dl.toISOString().slice(0, 10);
  next.replans = (roadmap.replans || 0) + 1;
  return { roadmap: next, moved };
}

export { isoOffset };
