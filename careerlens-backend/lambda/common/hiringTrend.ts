import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getSecret } from './secrets';
import { ddb, TABLE_NAME, MARKET_PK, MARKET_SK } from './db';

// Same role categories the old mock HIRING_TREND used (src/data/market.js), mapped to an Adzuna
// search term. There's no live "hiring trend index" API anywhere, so this builds a real one from
// scratch out of Adzuna's own result counts — see getHiringTrendSeries() below for how.
const CATEGORIES: Record<string, string> = {
  Fullstack: 'full stack developer',
  Cloud: 'devops engineer',
  ML: 'machine learning engineer',
  Android: 'android developer',
};

const REFRESH_MS = 30 * 60 * 1000; // same cadence as the other market caches
const MAX_POINTS = 24; // ~2 years of monthly snapshots

interface TrendPoint {
  key: string; // "YYYY-MM", used to dedupe — stripped before returning to the frontend
  month: string; // short display label, e.g. "Sep" — matches the old mock's month format
  Fullstack: number;
  Cloud: number;
  ML: number;
  Android: number;
}
interface TrendSeries {
  points: TrendPoint[];
  lastFetchedAt: string;
}

async function fetchCounts(): Promise<Record<string, number>> {
  const raw = await getSecret(process.env.ADZUNA_SECRET_NAME as string);
  const { app_id: appId, app_key: appKey } = JSON.parse(raw) as { app_id: string; app_key: string };

  const entries = await Promise.all(
    Object.entries(CATEGORIES).map(async ([key, what]) => {
      const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=0&what=${encodeURIComponent(what)}&content-type=application/json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Adzuna request failed for ${key}: ${res.status}`);
      const data = (await res.json()) as { count?: number };
      return [key, data.count ?? 0] as const;
    })
  );
  return Object.fromEntries(entries);
}

// Real hiring-trend index, built from live Adzuna result counts per role category and
// accumulated one genuine snapshot at a time (capped to the last MAX_POINTS months) — rather
// than fabricating retroactive history that was never actually observed. The series starts thin
// (one real point) and grows a new point each calendar month the cache refreshes; the current
// month's point is overwritten in place on same-month refreshes so it stays up to date.
export async function getHiringTrendSeries(): Promise<Omit<TrendPoint, 'key'>[]> {
  const existing = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk: MARKET_PK, sk: MARKET_SK.hiringTrendCache } }));
  const series = (existing.Item?.data as TrendSeries | undefined) ?? { points: [], lastFetchedAt: '' };

  const isFresh = series.lastFetchedAt && Date.now() - new Date(series.lastFetchedAt).getTime() < REFRESH_MS;
  if (isFresh) return series.points.map(stripKey);

  try {
    const counts = await fetchCounts();
    const now = new Date();
    const key = now.toISOString().slice(0, 7); // "YYYY-MM"
    const month = now.toLocaleDateString('en-US', { month: 'short' });
    const point: TrendPoint = { key, month, Fullstack: 0, Cloud: 0, ML: 0, Android: 0, ...counts };

    const points = [...series.points];
    const i = points.findIndex((p) => p.key === key);
    if (i >= 0) points[i] = point;
    else points.push(point);
    const capped = points.slice(-MAX_POINTS);

    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { pk: MARKET_PK, sk: MARKET_SK.hiringTrendCache, data: { points: capped, lastFetchedAt: now.toISOString() } },
    }));
    return capped.map(stripKey);
  } catch (err) {
    if (series.points.length) return series.points.map(stripKey); // stale is better than none
    throw err;
  }
}

function stripKey({ key: _key, ...rest }: TrendPoint): Omit<TrendPoint, 'key'> {
  return rest;
}
