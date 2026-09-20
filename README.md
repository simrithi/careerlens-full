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

The project is called CareerLens, and its tagline is plan today, get hired tomorrow. It is framed around India's graduate hiring gap: roughly ten lakh engineering adjacent graduates enter the job market every year, chasing only about one lakh entry level openings that genuinely fit their skills. CareerLens gives students a roadmap that can be replanned as circumstances change, honest ATS and resume feedback, and an applications tracker, while giving recruiters a way to rank candidates by proven skill with identity blinded until shortlist, instead of filtering people out by college pedigree.

It was built solo for an AWS focused hackathon. The stack is a React frontend paired with a full AWS serverless backend, using Cognito, API Gateway, around thirty Lambda functions, DynamoDB, S3, EventBridge, and Secrets Manager, all wired together end to end rather than left as separate pieces.

The repository holds both halves of the project as two fully independent applications. The folder named careerlens contains the frontend, a React 19 and Vite single page app, with its own README and a CONTRIBUTING file for frontend specific detail. The folder named careerlens backend contains the backend, an AWS CDK application written in TypeScript, with its own README covering stack details, prerequisites, and the exact deploy commands. Each of these two folders has its own package.json, its own node_modules, and gets developed and deployed on its own schedule, not as a single combined build.

For a quick start in mock mode, which needs no AWS account at all, you move into the careerlens folder, run npm install, then run npm run dev, and open localhost port 5173 in a browser. The VITE_USE_MOCK setting defaults to true, so the entire product runs completely offline against realistic seed data. Three demo accounts exist for trying it immediately, all sharing the password demo123: ananya at demo dot in is a fresher student account, vikram at demo dot in is an experienced student account who is pivoting careers after a layoff, and hr at novapixel dot demo is a company recruiter account. Each can also be reached instantly through a query parameter deep link in the URL.

To run the product against the real AWS backend instead of the mock, three steps are involved. First, the backend has to be deployed, which the backend's own README covers in detail, including AWS CLI and SSO login setup and the exact cdk diff and cdk deploy commands to run. That deploy provisions Cognito, API Gateway, roughly thirty Lambda functions, and a DynamoDB table, spread across four stacks, with an AWS Budgets cost alert configured before anything else gets deployed, so spending visibility exists from the very first resource onward. Second, the stack outputs from that deploy get copied into the frontend's environment file, setting VITE_USE_MOCK to false and filling in the real API URL, the Cognito user pool id, the Cognito client id, and the Cognito hosted UI domain. Third, running npm run dev again switches the login screen from the mock email and password form to real Cognito hosted UI login, and a one click judge demo sign in option is also available for evaluators, skipping the hosted UI page and any sign up option entirely.

The architecture section explains the two halves briefly. On the frontend, pages never touch data directly. Every page calls a function inside the src slash api folder, and stores whatever comes back through a single shared function called run, from a hook called useData. Those api functions form the entire backend contract, and a flag called VITE_USE_MOCK decides at runtime whether each one resolves against a local mock or makes a real HTTP call, meaning the exact same interface code runs identically whether you are offline or hitting production.

On the backend, there are four CDK stacks living inside the careerlens backend folder. The guardrails stack owns the AWS Budgets cost alert, with thresholds at 50, 80, and 100 percent of a monthly limit, deployed before anything else. The data stack owns a single table DynamoDB design, encrypted with a customer managed KMS key with point in time recovery enabled, plus an S3 bucket for resumes. The auth stack owns the Cognito user pool, with separate student and company groups, and the hosted UI. The api stack owns the API Gateway HTTP API, protected by a Cognito JWT authorizer, with one Lambda function per route, and it also owns a scheduled EventBridge rule that keeps the layoffs news cache warm automatically.

For AI specifically, three features call Gemini directly: resume rejection reason phrasing, mock interview scoring, and roadmap re plan notes. That integration is tuned for Gemini's free tier, and every single call has a deterministic local fallback, so an AI outage never breaks a live session. Real job listings, real news, and a real hiring trend index come from Adzuna and GNews respectively. Everything else in the product, meaning skill matching, ATS scoring, readiness scoring, and resilience scoring, is deliberately kept as plain deterministic code rather than routed through any AI model. The full endpoint by endpoint contract for all of this lives in two files inside the frontend's docs folder, api contract dot md and openapi dot yaml.

Finally, the README closes with a section on data honesty. Market numbers and the sample companies shown in the demo are explicitly illustrative rather than real statistics, and the app itself labels that sample data as sample data directly in the interface rather than only in documentation. Match scores and ATS readiness scores are always presented as estimates, never as a probability of actually being hired. Real external data, meaning the job listings, news, and hiring trends pulled from Adzuna and GNews, is kept clearly distinguished from the seeded demo data throughout both the codebase and the documentation referenced above.
