# CareerLens

**Plan today, get hired tomorrow.** A platform for India's graduate hiring gap — roughly 10 lakh
engineering-adjacent graduates a year chasing about 1 lakh entry-level openings that actually fit
them. CareerLens gives students a re-plannable roadmap, honest ATS/resume feedback and an
applications tracker, and gives recruiters a blind-screened, skill-first way to rank candidates
instead of filtering on college pedigree.

Built solo for an AWS-focused hackathon: a React frontend and a full AWS serverless backend
(Cognito, API Gateway, ~30 Lambda functions, DynamoDB, S3, EventBridge, Secrets Manager),
wired together end to end.

## Repo layout

This repo holds both halves of the project as two independent apps:

```
careerlens/           Frontend — React 19 + Vite SPA. See careerlens/README.md and
                       careerlens/CONTRIBUTING.md for frontend-specific details.
careerlens-backend/   Backend — AWS CDK (TypeScript) app. See careerlens-backend/README.md
                       for stack details, prerequisites and deploy commands.
```

Each has its own `package.json`, its own `node_modules`, and is developed/deployed independently.

## Quick start (frontend, mock mode — no AWS needed)

```
cd careerlens
npm install
npm run dev
```
Open http://localhost:5173. `VITE_USE_MOCK` defaults to `true`, so the whole product runs fully
offline against realistic seed data — no AWS account required to try it.

Demo accounts (password `demo123`), or use the deep links below:

| Account | Role | Try it |
| --- | --- | --- |
| ananya@demo.in | Student (fresher) | `?as=ananya` |
| vikram@demo.in | Student (experienced, pivoting after a layoff) | `?as=vikram` |
| hr@novapixel.demo | Company (recruiter) | `?as=novapixel` |

## Running against the real AWS backend

1. Deploy the backend first — see `careerlens-backend/README.md` for prerequisites
   (AWS CLI + SSO login, `cdk bootstrap`) and the exact `cdk diff` / `cdk deploy --all` commands.
   It provisions Cognito, API Gateway, ~30 Lambda functions, and a DynamoDB table across four
   stacks, with an AWS Budgets cost alert set up before anything else deploys.
2. Copy the stack outputs into `careerlens/.env` (see `careerlens/.env.example`):
   ```
   VITE_USE_MOCK=false
   VITE_API_URL=<CareerLensApiStack ApiUrl output>
   VITE_COGNITO_USER_POOL_ID=<CareerLensAuthStack UserPoolId output>
   VITE_COGNITO_CLIENT_ID=<CareerLensAuthStack UserPoolClientId output>
   VITE_COGNITO_DOMAIN=<CareerLensAuthStack HostedUiDomain output>
   ```
3. `npm run dev` again — real Cognito Hosted UI login replaces the mock email/password form.
   A one-click judge demo sign-in (no Hosted UI page, no sign-up option) is also wired in for
   evaluators — see the login screen.

## Architecture, in brief

**Frontend** — pages never touch data directly; every page calls a function in
`careerlens/src/api/*.js` and stores the result through one `useData().run(...)` call. Those
`api/*.js` functions are the backend contract: a `VITE_USE_MOCK` flag decides at runtime whether
each one resolves against a local mock or a real HTTP call, so the same UI code runs identically
offline and against production.

**Backend** — four CDK stacks in `careerlens-backend`:

| Stack | Owns |
| --- | --- |
| `CareerLensGuardrailsStack` | AWS Budgets cost alert (50/80/100% thresholds), deployed before anything else |
| `CareerLensDataStack` | DynamoDB single-table design (KMS-encrypted, point-in-time recovery) + S3 for resumes, and the Textract + Gemini resume-parsing Lambda |
| `CareerLensAuthStack` | Cognito User Pool, `student`/`company` groups, Hosted UI |
| `CareerLensApiStack` | API Gateway HTTP API + Cognito JWT authorizer + one Lambda per route, including a scheduled EventBridge rule that keeps the layoffs-news cache warm |

AI features (resume rejection-reason phrasing, mock-interview scoring, roadmap re-plan notes) call
Gemini directly, tuned for its free tier, with a deterministic local fallback on every call so an AI
outage never breaks a live session. Uploading a resume also triggers an S3 event straight into a
Lambda that OCRs it with Amazon Textract and structures the result with Gemini, written additively
so it never overwrites something the candidate entered themselves. Real job/news/hiring-trend data
comes from Adzuna and GNews. Everything else — skill matching, ATS scoring, readiness, resilience
scoring — is plain deterministic code on purpose.

Full endpoint-by-endpoint contract: `careerlens/docs/api-contract.md` and
`careerlens/docs/openapi.yaml`.

## Data honesty

Market numbers and sample companies are illustrative, not real statistics — the app itself labels
sample data as sample data in the UI. Match scores and ATS readiness are estimates, never a
probability of being hired. Real external data (jobs, news, hiring trends) is clearly distinguished
from seeded demo data throughout the codebase and the docs above.
