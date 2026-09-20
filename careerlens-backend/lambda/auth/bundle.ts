import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId, getGroups } from '../common/auth';
import { ok, errorResponse } from '../common/http';
import { ensureRoadmap } from '../common/roadmapStore';
import { recordWeeklySnapshot, buildHistory } from '../common/historyStore';
import type { ReadinessInput } from '../common/readiness';

// GET /me/bundle — the one place a full-record response is correct (used to hydrate the
// frontend's DataProvider on login/refresh). Every other endpoint returns just its slice.
// Aggregates every item under PK=USER#{userId} into the shape src/data/seed.js expects.
// roadmap is lazily provisioned here (see roadmapStore.ts) since there's no onboarding wizard
// yet. applications/interviews/savedJobs/votes are all aggregated from their own item types.
interface ProfileBundle {
  skills: unknown[];
  education: unknown[];
  experience: unknown[];
  certifications: unknown[];
  projects: unknown[];
  external: Record<string, unknown>;
  [field: string]: unknown;
}

export function buildBundle(items: Record<string, unknown>[]) {
  const profile: ProfileBundle = {
    skills: [],
    education: [],
    experience: [],
    certifications: [],
    projects: [],
    // Dashboard.jsx interpolates this directly (`${rec.profile.headline}`) with no fallback —
    // undefined would literally render the string "undefined".
    headline: '',
    // codingScore() in engine.js does ext.leetcode.solved / ext.github.commits / ext.codeforces.rating
    // unconditionally, and Profile.jsx's Coding tab does ext[k].handle for k in [github, codeforces,
    // hackerrank, linkedin] — so all five keys must always exist. Dashboard.jsx also interpolates
    // `${leetcode.solved}` directly with no fallback, so that one needs a real 0, not just {}.
    external: { leetcode: { solved: 0 }, github: {}, codeforces: {}, hackerrank: {}, linkedin: {} },
  };
  const notifications: unknown[] = [];
  const applications: Record<string, unknown>[] = [];
  const interviews: Record<string, unknown>[] = [];
  let roadmap: unknown = null;
  let solvedQuestions: string[] = [];
  let savedJobs: string[] = [];
  let votes: Record<string, unknown> = {};

  for (const item of items) {
    const sk = item.sk as string;
    if (sk === SK.profile) {
      const { pk: _pk, sk: _sk, ...fields } = item;
      Object.assign(profile, fields);
    } else if (sk.startsWith(SK.skillPrefix)) {
      const { pk: _pk, sk: _sk, ...fields } = item;
      (profile.skills as unknown[]).push(fields);
    } else if (sk.startsWith('EDU#')) {
      profile.education = [...(profile.education as unknown[]), stripKeys(item)];
    } else if (sk.startsWith('EXP#')) {
      profile.experience = [...(profile.experience as unknown[]), stripKeys(item)];
    } else if (sk.startsWith('CERT#')) {
      profile.certifications = [...(profile.certifications as unknown[]), stripKeys(item)];
    } else if (sk.startsWith('PROJ#')) {
      profile.projects = [...(profile.projects as unknown[]), stripKeys(item)];
    } else if (sk.startsWith(SK.externalPrefix)) {
      const platform = sk.slice(SK.externalPrefix.length);
      (profile.external as Record<string, unknown>)[platform] = stripKeys(item);
    } else if (sk.startsWith(SK.notifPrefix)) {
      notifications.push(stripKeys(item));
    } else if (sk === SK.roadmap) {
      roadmap = stripKeys(item);
    } else if (sk === SK.questions) {
      // Tolerate legacy plain-string entries (pre-timestamp format) alongside the new shape.
      const raw = (item.solved as (string | { id: string; solvedAt: string })[]) ?? [];
      solvedQuestions = raw.map((s) => (typeof s === 'string' ? s : s.id));
    } else if (sk.startsWith(SK.applicationPrefix)) {
      applications.push(stripKeys(item));
    } else if (sk.startsWith(SK.interviewPrefix)) {
      interviews.push(stripKeys(item));
    } else if (sk === SK.savedJobs) {
      savedJobs = (item.ids as string[]) ?? [];
    } else if (sk === SK.votes) {
      votes = (item.votes as Record<string, unknown>) ?? {};
    }
  }
  applications.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));

  // JobFit.jsx does roleById(rec.profile.targetRoleId) with no fallback, unlike readiness()'s
  // `|| ROLES[0]` — so a brand-new profile (no PROFILE item yet) needs a real default here.
  // Match it to the auto-provisioned roadmap's role so Job Fit and Roadmap agree on "the role".
  if (profile.targetRoleId === undefined && roadmap) {
    profile.targetRoleId = (roadmap as { goal: { roleId: string } }).goal.roleId;
  }

  return {
    profile,
    notifications,
    roadmap,
    solvedQuestions,
    applications,
    interviews,
    savedJobs,
    votes,
    // Dashboard.jsx charts read history.readiness/.weeklyHours/.weeklySolved directly — empty
    // arrays render as empty charts rather than crashing, which is honest for a brand-new account.
    history: { readiness: [] as number[], weeklyHours: [] as number[], weeklySolved: [] as number[] },
  };
}

function stripKeys(item: Record<string, unknown>) {
  const { pk: _pk, sk: _sk, ...rest } = item;
  return rest;
}

// company-group accounts have a completely different record shape (no profile/roadmap/
// applications — see docs/api-contract.md's "polymorphic by group" note). funnel/timeToShortlist
// stay fixed placeholders — Company.jsx already labels them "Sample metrics for the demo" in the
// UI, and there's no real applicant-funnel tracking pipeline to source them from.
const SAMPLE_FUNNEL = [
  { stage: 'Applied', count: 0 },
  { stage: 'Resume screened', count: 0 },
  { stage: 'Skill matched', count: 0 },
  { stage: 'Interviewed', count: 0 },
  { stage: 'Offered', count: 0 },
];
const SAMPLE_TIME_TO_SHORTLIST = [9, 8, 7, 6, 5, 4];

interface CompanyBundle {
  name: string;
  industry: string;
  size: string;
  location: string;
  about: string;
  roles: unknown[];
  funnel: { stage: string; count: number }[];
  timeToShortlist: number[];
  [field: string]: unknown;
}

// Candidates are NOT included here — they only ever come back PII-scoped from
// GET /recruiter/candidates?roleId=, never from the bundle, so there is exactly one code path
// that can leak a not-yet-shortlisted candidate's identity.
export function buildCompanyBundle(items: Record<string, unknown>[]) {
  const company: CompanyBundle = {
    name: '',
    industry: '',
    size: '',
    location: '',
    about: '',
    roles: [],
    funnel: SAMPLE_FUNNEL,
    timeToShortlist: SAMPLE_TIME_TO_SHORTLIST,
  };
  const notifications: unknown[] = [];
  let shortlist: string[] = [];

  for (const item of items) {
    const sk = item.sk as string;
    if (sk === SK.company) {
      const { pk: _pk, sk: _sk, ...fields } = item;
      Object.assign(company, fields);
    } else if (sk.startsWith(SK.rolePrefix)) {
      company.roles = [...(company.roles as unknown[]), stripKeys(item)];
    } else if (sk.startsWith(SK.notifPrefix)) {
      notifications.push(stripKeys(item));
    } else if (sk === SK.shortlist) {
      shortlist = (item.ids as string[]) ?? [];
    }
  }
  company.roles = (company.roles as { posted?: string }[]).sort((a, b) =>
    String(b.posted ?? '').localeCompare(String(a.posted ?? ''))
  );

  return { company, notifications, shortlist, votes: {} as Record<string, unknown> };
}

function isCompanyGroup(event: APIGatewayProxyEventV2WithJWTAuthorizer): boolean {
  return getGroups(event).includes('company');
}

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const isCompany = isCompanyGroup(event);
    if (!isCompany) await ensureRoadmap(userId); // creates a starter roadmap on first call, no-op after
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': pk(userId) },
      })
    );
    const items = (res.Items ?? []) as Record<string, unknown>[];
    if (isCompany) return ok(buildCompanyBundle(items));

    const bundle = buildBundle(items);
    const questionsItem = items.find((i) => i.sk === SK.questions);
    const rawSolved = (questionsItem?.solved as (string | { id: string; solvedAt: string })[] | undefined) ?? [];
    // Legacy plain-string entries have no solvedAt, so they never count toward a "this week"
    // bucket — safe, since inWeek() on an undefined date always evaluates to false.
    const solvedEntries = rawSolved.map((s) => (typeof s === 'string' ? { solvedAt: undefined as unknown as string } : s));
    const current = await recordWeeklySnapshot(userId, bundle as unknown as ReadinessInput, solvedEntries);
    bundle.history = buildHistory(items, current);
    return ok(bundle);
  } catch (err) {
    return errorResponse(err);
  }
}
