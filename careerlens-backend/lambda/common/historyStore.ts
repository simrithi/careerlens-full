// Weekly progress history for the Dashboard's "Readiness trend" / "Weekly effort" charts.
//
// readiness is a composite score over CURRENT skill levels/profile/roadmap state — it can't be
// reconstructed for past weeks, so it's snapshotted going forward only, once per visit to
// GET /me/bundle, overwriting the CURRENT week's point each time (never touching past weeks).
// hours and solved ARE reconstructible from existing timestamped data (milestone doneAt, question
// solvedAt) — but computing them the same way, into the same weekly snapshot, keeps one code path
// and one set of week buckets for all three series instead of three different derivations.
//
// A week with no visit has no HISTORY# item at all — gaps are honest, not zero-filled, so the
// frontend only ever sees points that reflect an actual visit.
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from './db';
import { readiness, type ReadinessInput } from './readiness';

export interface HistoryPoint {
  week: string; // Monday of the week, e.g. "2026-09-14"
  readiness: number;
  hours: number;
  solved: number;
}

export function weekMonday(d: Date = new Date()): string {
  const day = (d.getDay() + 6) % 7; // Monday = 0 ... Sunday = 6
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  // Format from local date components, not toISOString() — converting a local-midnight Date to
  // UTC can shift it onto the previous day for any positive UTC offset (e.g. IST, UTC+5:30).
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export async function recordWeeklySnapshot(
  userId: string,
  bundle: ReadinessInput,
  solvedEntries: { solvedAt: string }[]
): Promise<HistoryPoint> {
  const week = weekMonday();
  const weekStart = new Date(week);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const inWeek = (isoDate: string) => {
    const d = new Date(isoDate);
    return d >= weekStart && d < weekEnd;
  };

  const hours = bundle.roadmap.phases
    .flatMap((p) => p.milestones)
    .filter((m) => m.done && m.doneAt && inWeek(m.doneAt))
    .reduce((s, m) => s + m.hours, 0);

  const solved = solvedEntries.filter((s) => inWeek(s.solvedAt)).length;
  const point: HistoryPoint = { week, readiness: readiness(bundle), hours, solved };

  await ddb.send(
    new PutCommand({ TableName: TABLE_NAME, Item: { pk: pk(userId), sk: SK.history(week), ...point } })
  );
  return point;
}

// `current` is merged in because it was written AFTER `items` was queried, so it's never in
// `items` itself on the same request that just recorded it.
export function buildHistory(items: Record<string, unknown>[], current: HistoryPoint) {
  const points = new Map<string, HistoryPoint>();
  for (const item of items) {
    const sk = item.sk as string;
    if (sk.startsWith(SK.historyPrefix)) {
      points.set(item.week as string, {
        week: item.week as string,
        readiness: item.readiness as number,
        hours: item.hours as number,
        solved: item.solved as number,
      });
    }
  }
  points.set(current.week, current);
  const sorted = Array.from(points.values()).sort((a, b) => a.week.localeCompare(b.week));
  return {
    weeks: sorted.map((p) => p.week),
    readiness: sorted.map((p) => p.readiness),
    weeklyHours: sorted.map((p) => p.hours),
    weeklySolved: sorted.map((p) => p.solved),
  };
}
