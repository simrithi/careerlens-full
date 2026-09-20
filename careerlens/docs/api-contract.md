# CareerLens API contract

Generated from `src/api/*.js`, `src/context/AppContext.jsx` and `src/data/seed.js` as of the mock POC. This is the contract a real backend must implement so the frontend can swap `VITE_USE_MOCK=false` without touching page code.

## The core problem to fix first

Today, `request(userId, fn)` in `src/api/client.js` loads the **entire user record**, runs a mutation, and every API function returns the **entire record** (`clone(result === undefined ? rec : result)`). `DataProvider.run()` in `AppContext.jsx` just calls `setRec(result)` — it replaces the whole thing.

That doesn't scale to a real backend (fetching/returning the whole user blob on every `PATCH /roadmap/milestones/{id}` is wasteful and leaks unrelated data). **Proposed fix:**

- Each real endpoint returns only the slice it changed, tagged with its name, e.g. `{ slice: "roadmap", data: {...} }` or just the bare slice with the key implied by the endpoint called.
- Change `DataProvider.run()` to accept `(promise, sliceKey)` and merge: `setRec(prev => ({ ...prev, [sliceKey]: result }))`.
- `GET /me/bundle` stays as a single aggregate call, used once on login/refresh to hydrate `rec` — this is the one place returning everything is correct.

This is `src/api/http.js` + `DataProvider` work (prompt A1), done once, before wiring individual services.

## Auth model

- Mock: plaintext password check against `seed.js`. **Production: Amazon Cognito.** No password endpoint — the frontend uses Cognito Hosted UI / Amplify Auth (or a Cognito Hosted UI redirect) and gets back an ID token, sent as `Authorization: Bearer <token>` on every request.
- `userId` (`sub` claim) is **always** derived from the JWT server-side in every Lambda — never trust a body/path `userId` for the authenticated user's own data.
- Two Cognito groups: `student` (covers both `fresher` and `experienced` account "roles" — that distinction is just a profile field, not an auth group) and `company`.
- The record shape is polymorphic by group: student records have `profile`, `roadmap`, `applications`, `interviews`, `solvedQuestions`, `savedJobs`, `history`, `notifications`, `votes`. Company records have `company`, `candidates`, `shortlist`, `notifications`, `votes` instead of `profile`/`roadmap`/`applications`. Model this as two item types under one users table, or two tables — the API surface below reflects it as one resource per concern rather than the flat mock record.

## Resources

### Auth (`authApi`, `src/api/auth.js`)
| Mock function | Method + path | Notes |
|---|---|---|
| `login(email, password)` | N/A — Cognito Hosted UI / Amplify Auth | Frontend redirects to Cognito; no direct login endpoint. |
| `getBundle(userId)` | `GET /me/bundle` | Returns the full record for hydration on load. Auth: Cognito JWT. |
| `markNotificationsRead(userId)` | `PATCH /me/notifications/read` | Body: none. Response: `{ notifications: [...] }` (slice). |

### Profile (`profileApi`, `src/api/profile.js`)
| Mock function | Method + path | Request | Response slice |
|---|---|---|---|
| `updateProfile(userId, patch)` | `PATCH /profile` | Partial profile fields | `profile` |
| `addItem(userId, section, item)` | `POST /profile/{section}` | `section` ∈ `education\|experience\|certifications\|projects`; body = item fields | `profile.{section}` |
| `removeItem(userId, section, id)` | `DELETE /profile/{section}/{id}` | — | `profile.{section}` |
| `updateItem(userId, section, id, patch)` | `PATCH /profile/{section}/{id}` | Partial item | `profile.{section}` |
| `upsertSkill(userId, skill)` | `PUT /profile/skills/{name}` | `{ level, verified? }` | `profile.skills` |
| `removeSkill(userId, name)` | `DELETE /profile/skills/{name}` | — | `profile.skills` |
| `updateExternal(userId, platform, data)` | `PUT /profile/external/{platform}` | `platform` ∈ `leetcode\|github\|codeforces\|hackerrank\|linkedin`; manual fields, or filled in by `syncExternal` below | `profile.external` |
| `syncExternal(userId, platform, handle)` | client-side only — no backend endpoint | Calls the public GitHub/Codeforces REST APIs directly from the browser (both send permissive CORS headers) and pipes the result through `updateExternal`; other platforms throw, since they have no public CORS-enabled API yet (see prompt A9 for a future server-side importer) | `profile.external` |
| `uploadResume(userId, file)` | `POST /resume/upload-url` → S3 presigned PUT → S3-triggered Lambda (Textract + Gemini extraction) | **Built** (component A5). `resumeUploadUrl.ts` writes `profile.resume = {fileKey, parseStatus: 'pending', uploadedAt}` immediately; `lambda/profile/parseResume.ts` fires on the S3 upload event, OCRs with Textract (sync API — single-page only for now), asks Gemini to structure skills/projects/experience, and writes them additively (never overwriting an entry the candidate already has) before flipping `parseStatus` to `done`/`failed`. | `profile.resume` immediately, `profile.skills/projects/experience` a few seconds later, async |

### Roadmap (`roadmapApi`, `src/api/roadmap.js`)
| Mock function | Method + path | Request | Response slice |
|---|---|---|---|
| `toggleMilestone(userId, milestoneId)` | `PATCH /roadmap/milestones/{id}` | — (toggles) | `roadmap` |
| `addMilestone(userId, phaseId, milestone)` | `POST /roadmap/phases/{phaseId}/milestones` | Milestone fields | `roadmap` |
| `replan(userId)` | `POST /roadmap/replan` | — | `roadmap` + `lastReplan` (`{ moved, at, aiNote? }`). **Built.** Pace/progress math (`roadmapEngine.ts`, ported from `engine.js`) is fully deterministic; `aiNote` is a best-effort one-sentence rationale from Gemini (never blocks the response — omitted if the call fails). Resource re-selection (swapping actual milestone content) is still future work. |
| `setGoal(userId, patch)` | `PATCH /roadmap/goal` | `{ roleId?, title?, company?, months?, deadline? }` | `roadmap.goal` |
| `toggleQuestion(userId, qid)` | `PATCH /roadmap/questions/{qid}/toggle` | — | `solvedQuestions` |

### Applications (`applicationsApi`, `src/api/applications.js`) — see the tracker module PDF for the full backend design
| Mock function | Method + path | Request | Response slice |
|---|---|---|---|
| `addApplication(userId, a)` | `POST /applications` | `{ company, role, source, jobUrl?, notes? }` | `applications` |
| `addBulk(userId, items)` | `POST /applications/bulk` | `{ items: [...] }` (up to 50) | `applications` |
| `moveApplication(userId, id, status)` | `PATCH /applications/{id}` | `{ status }` | `applications` |
| `removeApplication(userId, id)` | `DELETE /applications/{id}` | — | `applications` |
| `simulateEmail(userId)` | **Dev/demo-only.** In production there is no client-callable equivalent — SES → S3 → Lambda `ingestEmail` → Lambda `parseEmail` (Gemini) updates the application asynchronously; the frontend just polls/refetches or gets pushed an update. The function itself still runs its fabricated logic regardless of `USE_MOCK` (useful for local dev against a real backend), but `Applications.jsx` now only renders the "Simulate incoming email" button when `USE_MOCK` is true, so it can never appear or run against a real user's real data. Real SES inbound ingestion is not built — blocked on owning a domain to verify. | — | — |
| *(not built yet)* `getStats(userId)` | `GET /applications/stats` | — | Counts per status, "no reply" (`APPLIED` > 14 days), week-over-week change — matches Component 1 in the tracker doc. No Lambda, no route, no frontend caller today; `Applications.jsx` computes the equivalent entirely client-side via `applicationInsights()` in `engine.js`. Removed from `openapi.yaml` until built so a spec-generated client can't call a path that 404s. |
| *(not built yet)* `getInsights(userId)` | `GET /applications/insights` | — | Smart Insights: computed facts (`applicationInsights()` in `engine.js`) phrased by Gemini server-side, cached 6h in DynamoDB. Never let the model invent numbers — see Component 5. Not implemented; removed from `openapi.yaml`. |
| *(not built yet)* `extractJob(items)` | `POST /applications/extract` | `{ items: string[] }` (URLs or pasted text, up to 50) | Preview rows for the bulk-add modal — see Component 6. Not implemented; removed from `openapi.yaml`. |

### Interview (`interviewApi`, `src/api/interview.js`)
| Mock function | Method + path | Request | Response slice |
|---|---|---|---|
| `saveInterview(userId, session)` | `POST /interviews` | Session summary (role, mode, score breakdown) | `interviews` |
| `scoreAnswer(question, answer, roleTitle)` | `POST /interview/score-answer` | `{ question, answer, roleTitle }` | `{ overall, relevance, depth, structure, clarity, hits[], misses[], feedback[] }` — **built**, scored by Gemini against a rubric instead of keyword matching. Not persisted (only the session summary from `saveInterview` is). Frontend falls back to the local `evaluateAnswer()` heuristic in `engine.js` if this call fails, so an AI-provider outage never breaks a live session. |

### Resume (`resumeApi`, `src/api/resume.js`)

| Mock function | Method + path | Request | Response slice |
|---|---|---|---|
| `rejectionDiagnosis(profile, roleId, ats)` | `POST /resume/diagnose` | `{ roleTitle, atsScore, matchScore, missingSkills[], projects[], experienceCount, leetcodeSolved }` | `{ reasons: [{severity, title, detail, fix}] }` — **built**. The ATS checklist/score (`atsAnalysis()`) stays purely client-side deterministic; only the rejection-reason *phrasing* is Gemini-written, personalized to the candidate's real projects/skills instead of a generic template. Falls back to the local template version (`rejectionDiagnosis()` in `engine.js`) if the call fails. |

### Market (`marketApi`, `src/api/market.js`)
| Mock function | Method + path | Notes |
|---|---|---|
| `getJobs()` | `GET /market/jobs` | **Built.** Real listings from Adzuna's free-tier job search API (India), normalized in `lambda/market/getJobs.ts`. Cached 30 min in DynamoDB (`PK=MARKET`) so traffic never exceeds the free-tier daily quota. Fields Adzuna doesn't provide (applicant count, precise experience band) are `null`/estimated from the title, never invented. Frontend falls back to `data/market.js` sample jobs if the call fails. |
| `getLayoffs()` | `GET /market/layoffs` | **Built**, response shape changed from the mock: real mode returns `{ news: [...headlines] }` (real articles from GNews, tagged Layoffs/bad), not a structured per-company employee-count chart — there's no public dataset for that, and attaching invented numbers to real companies would misrepresent them. Mock mode is unchanged (`{ layoffs, bySector }`, fictional companies) since that data is clearly fake. `Market.jsx`'s `Layoffs()` renders either shape. |
| `getNews()` | `GET /market/news` | **Built.** Real headlines from GNews's free tier (`lambda/market/getNews.ts`), tag/tone assigned by keyword heuristic (Hiring/Layoffs/Salaries/Market), cached 30 min. Falls back to sample data on failure. |
| `getPlacements()` | client-side only, no endpoint | **Built, but as a static cited dataset** (`data/market.js`), not a live call — no API publishes per-college-tier placement rates. Figures are the India Skills Report 2025's own tier-wise *employability* score (a skill-assessment measure, explicitly labeled as such, not a claimed placement rate). Update the numbers by hand when a newer edition publishes. |
| `getHiringTrend()` | `GET /market/hiring-trend` | **Built.** No live "hiring trend index" exists anywhere, so `lambda/common/hiringTrend.ts` builds a real one from Adzuna's own per-category result counts, cached in DynamoDB and appended to **one real point per calendar month** (capped to the last 24) — it starts thin and grows only from genuinely observed snapshots, never backfilled with invented history. Falls back to `data/market.js` sample data on failure. |
| `getGigs()` | `GET /market/gigs` | **Built.** Real, company-posted gigs — not fictional startups. Stored under a fixed `pk='GIGS'` partition (shared across all companies, unlike every other resource here) since candidates need to browse every company's postings with one Query and this table has no GSI. Response is the candidate-safe projection (`slotsRemaining`, no raw applicant list). |
| `postGig(userId, gig)` | `POST /market/gigs` | `company` group only. Body: `{title, skill, hours, reward, level, slots}`. Response: every open gig (candidate-safe shape), same idiom as `addRole`. |
| `applyToGig(userId, gigId)` | `POST /market/gigs/{id}/apply` | Any authenticated non-`company` account. Response: that gig's candidate-safe shape. Also mirrors onto the candidate's own `APPLIED_GIGS` item. Pairs with `featuresApi.acceptGig` below, which adds the roadmap milestone. |
| `toggleSavedJob(userId, jobId)` | `POST /jobs/{id}/save` → `savedJobs` slice | Built (prompt A6/A7 era). |

Real-data caching pattern (`lambda/common/marketCache.ts`): lazy cache-on-read with a 30-min TTL — the first request after the TTL expires triggers a fresh external fetch and refreshes the cache; a failed fresh fetch serves stale cache rather than erroring, so a slow external API never blanks the page for one unlucky requester. Never scrape sites that forbid it — Adzuna and GNews are both used via their documented, free-tier-permitted APIs.

### Features / Innovation Lab (`featuresApi`, `src/api/features.js`)
| Mock function | Method + path | Response slice |
|---|---|---|
| `toggleVote(userId, featureId)` | `POST /features/{id}/vote` | `votes` |
| `acceptGig(userId, gig)` | `POST /gigs/{id}/accept` | `roadmap` (adds an Experience milestone) |

### Recruiter (`recruiterApi`, `src/api/recruiter.js`) — `company` group only. **Built.**
Tenant-isolated by the recruiter's own Cognito `sub` (`PK=USER#{sub}`, same single-table pattern as
every other resource) rather than a separate `companyId` claim — today's account model is one
recruiter per company, so no new Cognito attribute was needed. Revisit if/when multiple recruiters
need to share one company's postings/candidates.

| Mock function | Method + path | Notes |
|---|---|---|
| `toggleShortlist(userId, candidateId)` | `POST /recruiter/shortlist/{candidateId}` | Response: `shortlist` (array of candidate ids). |
| `addRole(userId, role)` | `POST /recruiter/roles` | Response: `company.roles` |
| `getCandidates(userId, roleId)` | `GET /recruiter/candidates?roleId=` | **Built.** Server computes the same scoring formula as `scoreCandidate()` (55% skill match / 35% best project alignment / 10% ATS — ported to `lambda/common/candidateScoring.ts`), returns a ranked list with name/college/city stripped for any candidate not in `shortlist` — **enforced server-side**, so it can't be bypassed by reading client JS. `Company.jsx`'s `TalentMatch` fetches this per selected role instead of scoring `rec.candidates` itself. |
| `getGigApplicants(userId, gigId)` | `GET /recruiter/gigs/{id}/applicants` | **Built.** Only the company that posted the gig (checked via `companyId`) can see who applied. Real applicant identity beyond the profile headline needs a Cognito `AdminGetUser` lookup this Lambda isn't yet granted for — a follow-up, not faked in the meantime. |

Candidates are seeded demo data per recruiter (`CAND#{id}` items — see
`careerlens-backend/scripts/seedRecruiterDemo.ts`), not sourced from real registered student
profiles — there is no cross-tenant candidate-sourcing pipeline yet. `GET /me/bundle` for a
`company`-group account returns `{ company, notifications, shortlist, votes }` and deliberately
excludes raw `candidates` — the only path that can return a candidate is the PII-scoped
`GET /recruiter/candidates`.

## Deterministic vs. AI-backed logic

Everything currently in `src/api/engine.js` runs client-side. Only some of it needs to move server-side for a real deployment:

- **Stays client-side (pure math over data already in the bundle):** `skillMatch`, `roadmapStats`, `profileCompleteness`, `codingScore`, `readiness`, `applicationInsights`, `timingAdvice`, `jobMatch`, `pivotFinder`, `resilience`, ATS deterministic checks (`atsAnalysis`'s checklist/score). No new endpoint needed — just keep shipping the raw data.
- **Moved server-side, built, calling Gemini** (Bedrock isn't authorized on this AWS account — see `lambda/common/gemini.ts`): rejection-reason phrasing (`POST /resume/diagnose`), mock-interview scoring (`POST /interview/score-answer`), roadmap re-plan rationale (`aiNote` on `POST /roadmap/replan`, best-effort only — the re-plan math itself is deterministic). All three fall back to their local `engine.js` heuristic on failure.
- **Still future work (needs an LLM, not yet built):** Smart Insights phrasing, follow-up email drafts, job-detail extraction from pasted links/URLs. (Recruiter candidate ranking needed no LLM and is already built server-side — see the Recruiter section above; it was deterministic math from the start, just moved off the client so blind screening can't be bypassed by reading client JS.)

## Error shape

Standardize on:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "human readable" } }
```
mapped by `src/api/http.js` into `Error` objects the existing `useToast()` calls already display.

## Open questions
- Does `interviewApi` need a dedicated evaluate endpoint before cutover, or can Component A6 (Gemini rubric scoring) ship after the MVP tracker work? (Recommend: after — the tracker is the differentiator for the pitch.)
- Gemini access isn't AWS-region-locked, so only SES inbound receiving needs a supported region — confirm the target region supports SES inbound, or split the SES stack into a different region (see D0 preflight).
- `interviews` currently has no GET — confirm the frontend pulls sessions from the bundle only, or add `GET /interviews`.
