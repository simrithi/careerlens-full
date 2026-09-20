import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLE_NAME = process.env.TABLE_NAME as string;

// Single-table key scheme (see docs/api-contract.md and prompt A2):
//   PK              SK              Item
//   USER#{userId}   PROFILE         top-level profile fields (headline, about, location, resume, external map)
//   USER#{userId}   SKILL#{name}    one skill
//   USER#{userId}   EDU#{id}        one education entry
//   USER#{userId}   EXP#{id}        one experience entry
//   USER#{userId}   CERT#{id}       one certification
//   USER#{userId}   PROJ#{id}       one project
//   USER#{userId}   NOTIF#{id}      one notification (needed by GET /me/bundle + PATCH /me/notifications/read;
//                                   not in the guide's literal SK list but required by the authApi contract)
//   USER#{userId}   ROADMAP         the whole roadmap (goal + phases + milestones), prompt A3 —
//                                   stored as one item since it's edited as a nested whole, not
//                                   queried by sub-fields
//   USER#{userId}   QUESTIONS       { solved: {id, solvedAt}[] } — practice-question toggle state,
//                                   timestamped so weekly solve-counts (history below) can be
//                                   computed for real; GET /me/bundle still exposes this as a flat
//                                   string[] to match the existing solvedQuestions contract
//   USER#{userId}   HISTORY#{weekMonday} snapshot for one calendar week (Monday, e.g. "2026-09-14"):
//                                   { readiness, hoursThisWeek, solvedThisWeek } — written once per
//                                   visit to GET /me/bundle for the CURRENT week only (never
//                                   backfilled for past weeks); see lambda/common/readiness.ts
//   USER#{userId}   APP#{id}        one job application (prompt A4)
//   USER#{userId}   INTERVIEW#{id}  one mock interview session summary
//   USER#{userId}   SAVEDJOBS       { ids: string[] }
//   USER#{userId}   VOTES           { [featureId]: boolean } — Innovation Lab votes
//   USER#{userId}   COMPANY         company-group account: top-level company profile fields
//   USER#{userId}   ROLE#{id}       one job posting (company-group accounts only)
//   USER#{userId}   CAND#{id}       one candidate record scoped to this recruiter (seeded, see
//                                   scripts/seedRecruiterDemo.ts — no real cross-tenant candidate
//                                   sourcing pipeline exists yet)
//   USER#{userId}   SHORTLIST       { ids: string[] } — shortlisted candidate ids
//   USER#{userId}   APPLIED_GIGS    { ids: string[] } — gig ids this candidate applied to
//   MARKET          HIRING_TREND_CACHE  real Adzuna-derived hiring trend series (see market/getHiringTrend.ts)
//   GIGS            GIG#{postedAt}#{id} one company-posted gig, browsable by every candidate —
//                                   the one item type NOT scoped to a single user's own PK (see
//                                   gigSk() below), since candidates need to list gigs across
//                                   every company with a plain Query and this table has no GSI
// Recruiter data is tenant-isolated by the recruiter's own `sub` (same pattern as every other
// resource here) rather than a separate companyId claim — the account model today is one
// recruiter per company, so PK=USER#{userId} already gives full isolation with no new Cognito
// attribute needed.
export const pk = (userId: string) => `USER#${userId}`;
export const SK = {
  profile: 'PROFILE',
  skill: (name: string) => `SKILL#${name.toLowerCase()}`,
  skillPrefix: 'SKILL#',
  section: (section: string, id: string) => `${sectionPrefix(section)}${id}`,
  sectionPrefixOf: (section: string) => sectionPrefix(section),
  external: (platform: string) => `EXT#${platform}`,
  externalPrefix: 'EXT#',
  notif: (id: string) => `NOTIF#${id}`,
  notifPrefix: 'NOTIF#',
  roadmap: 'ROADMAP',
  questions: 'QUESTIONS',
  application: (id: string) => `APP#${id}`,
  applicationPrefix: 'APP#',
  interview: (id: string) => `INTERVIEW#${id}`,
  interviewPrefix: 'INTERVIEW#',
  savedJobs: 'SAVEDJOBS',
  votes: 'VOTES',
  company: 'COMPANY',
  role: (id: string) => `ROLE#${id}`,
  rolePrefix: 'ROLE#',
  candidate: (id: string) => `CAND#${id}`,
  candidatePrefix: 'CAND#',
  shortlist: 'SHORTLIST',
  appliedGigs: 'APPLIED_GIGS',
  history: (weekMonday: string) => `HISTORY#${weekMonday}`,
  historyPrefix: 'HISTORY#',
};

const SECTION_PREFIX: Record<string, string> = {
  education: 'EDU#',
  experience: 'EXP#',
  certifications: 'CERT#',
  projects: 'PROJ#',
};

export const PROFILE_SECTIONS = Object.keys(SECTION_PREFIX);

// Non-user-scoped items (shared cache for external market data — jobs/news/layoffs), under a
// fixed PK so they sit in the same table without a second table for one small cache.
export const MARKET_PK = 'MARKET';
export const MARKET_SK = {
  jobsCache: 'JOBS_CACHE',
  newsCache: 'NEWS_CACHE',
  layoffsCache: 'LAYOFFS_CACHE',
  hiringTrendCache: 'HIRING_TREND_CACHE',
};

// Gigs (micro paid tasks companies post, any candidate can browse/apply — prompt A9-adjacent).
// Shared across all companies, so — unlike everything else in this table, which is scoped to
// one user's own PK — gigs live under a fixed PK the same way the MARKET cache does, letting a
// candidate list every open gig with one Query and no GSI. sk embeds postedAt so a plain Query
// (no extra sort param) already comes back oldest-to-newest; callers reverse for newest-first.
export const GIGS_PK = 'GIGS';
export const gigSk = (postedAtIso: string, id: string) => `GIG#${postedAtIso}#${id}`;
export const GIG_PREFIX = 'GIG#';

function sectionPrefix(section: string): string {
  const prefix = SECTION_PREFIX[section];
  if (!prefix) throw new Error(`Unknown profile section: ${section}`);
  return prefix;
}
