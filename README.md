Now here is the README explained in full detail, no dashes anywhere.

The project is called CareerLens, and its tagline is plan today, get hired tomorrow. It is framed around India's graduate hiring gap: roughly ten lakh engineering adjacent graduates enter the job market every year, chasing only about one lakh entry level openings that genuinely fit their skills. CareerLens gives students a roadmap that can be replanned as circumstances change, honest ATS and resume feedback, and an applications tracker, while giving recruiters a way to rank candidates by proven skill with identity blinded until shortlist, instead of filtering people out by college pedigree.

It was built solo for an AWS focused hackathon. The stack is a React frontend paired with a full AWS serverless backend, using Cognito, API Gateway, around thirty Lambda functions, DynamoDB, S3, EventBridge, and Secrets Manager, all wired together end to end rather than left as separate pieces.

The repository holds both halves of the project as two fully independent applications. The folder named careerlens contains the frontend, a React 19 and Vite single page app, with its own README and a CONTRIBUTING file for frontend specific detail. The folder named careerlens backend contains the backend, an AWS CDK application written in TypeScript, with its own README covering stack details, prerequisites, and the exact deploy commands. Each of these two folders has its own package.json, its own node_modules, and gets developed and deployed on its own schedule, not as a single combined build.

For a quick start in mock mode, which needs no AWS account at all, you move into the careerlens folder, run npm install, then run npm run dev, and open localhost port 5173 in a browser. The VITE_USE_MOCK setting defaults to true, so the entire product runs completely offline against realistic seed data. Three demo accounts exist for trying it immediately, all sharing the password demo123: ananya at demo dot in is a fresher student account, vikram at demo dot in is an experienced student account who is pivoting careers after a layoff, and hr at novapixel dot demo is a company recruiter account. Each can also be reached instantly through a query parameter deep link in the URL.

To run the product against the real AWS backend instead of the mock, three steps are involved. First, the backend has to be deployed, which the backend's own README covers in detail, including AWS CLI and SSO login setup and the exact cdk diff and cdk deploy commands to run. That deploy provisions Cognito, API Gateway, roughly thirty Lambda functions, and a DynamoDB table, spread across four stacks, with an AWS Budgets cost alert configured before anything else gets deployed, so spending visibility exists from the very first resource onward. Second, the stack outputs from that deploy get copied into the frontend's environment file, setting VITE_USE_MOCK to false and filling in the real API URL, the Cognito user pool id, the Cognito client id, and the Cognito hosted UI domain. Third, running npm run dev again switches the login screen from the mock email and password form to real Cognito hosted UI login, and a one click judge demo sign in option is also available for evaluators, skipping the hosted UI page and any sign up option entirely.

The architecture section explains the two halves briefly. On the frontend, pages never touch data directly. Every page calls a function inside the src slash api folder, and stores whatever comes back through a single shared function called run, from a hook called useData. Those api functions form the entire backend contract, and a flag called VITE_USE_MOCK decides at runtime whether each one resolves against a local mock or makes a real HTTP call, meaning the exact same interface code runs identically whether you are offline or hitting production.

On the backend, there are four CDK stacks living inside the careerlens backend folder. The guardrails stack owns the AWS Budgets cost alert, with thresholds at 50, 80, and 100 percent of a monthly limit, deployed before anything else. The data stack owns a single table DynamoDB design, encrypted with a customer managed KMS key with point in time recovery enabled, plus an S3 bucket for resumes. The auth stack owns the Cognito user pool, with separate student and company groups, and the hosted UI. The api stack owns the API Gateway HTTP API, protected by a Cognito JWT authorizer, with one Lambda function per route, and it also owns a scheduled EventBridge rule that keeps the layoffs news cache warm automatically.

For AI specifically, three features call Gemini directly: resume rejection reason phrasing, mock interview scoring, and roadmap re plan notes. That integration is tuned for Gemini's free tier, and every single call has a deterministic local fallback, so an AI outage never breaks a live session. Real job listings, real news, and a real hiring trend index come from Adzuna and GNews respectively. Everything else in the product, meaning skill matching, ATS scoring, readiness scoring, and resilience scoring, is deliberately kept as plain deterministic code rather than routed through any AI model. The full endpoint by endpoint contract for all of this lives in two files inside the frontend's docs folder, api contract dot md and openapi dot yaml.

Finally, the README closes with a section on data honesty. Market numbers and the sample companies shown in the demo are explicitly illustrative rather than real statistics, and the app itself labels that sample data as sample data directly in the interface rather than only in documentation. Match scores and ATS readiness scores are always presented as estimates, never as a probability of actually being hired. Real external data, meaning the job listings, news, and hiring trends pulled from Adzuna and GNews, is kept clearly distinguished from the seeded demo data throughout both the codebase and the documentation referenced above.

# CareerLens

**Plan today. Get hired tomorrow.**
An AI career-readiness platform for India's engineering graduates — built for the AWS Build & Ship Hackathon.

> Every year, a huge number of engineering graduates compete for a much smaller number of entry-level openings. Most get silence, not feedback. CareerLens gives them a readiness score, ranked skill gaps, a dated roadmap, honest rejection reasons, and one unified board for every job application — instead of fifty portals and no answers.

---

## Repository structure

This is a monorepo with two independently deployed pieces:

```
careerlens-full/
├── careerlens/           # Frontend — React + Vite (this is what gets deployed to Amplify/S3+CloudFront)
└── careerlens-backend/   # Backend — AWS CDK (TypeScript): Cognito, DynamoDB, Lambda, API Gateway, Bedrock
```

| Folder | What it is | Deploy target |
|---|---|---|
| `careerlens/` | React + Vite frontend, runs in **mock mode** by default (no backend required) | AWS Amplify Hosting, or S3 + CloudFront |
| `careerlens-backend/` | AWS CDK stacks for auth, data, API, AI, and email ingestion | Deployed separately via `cdk deploy` |

> **For the hackathon POC / demo, you only need `careerlens/`.** It runs entirely on mock data (`localStorage`) with `VITE_USE_MOCK=true` (the default) — no backend deployment required to see the full product working.

---

## Quick start (frontend)

```bash
cd careerlens
npm install
npm run dev        # http://localhost:5173
npm run build       # production build → careerlens/dist/
```

Jump straight into a demo account:

```
http://localhost:5173/?as=ananya      # Fresher, on track
http://localhost:5173/?as=vikram      # Experienced, behind schedule
http://localhost:5173/?as=novapixel   # Company / recruiter
```

### Demo accounts

| Email | Password | Type | Story |
|---|---|---|---|
| `ananya@demo.in` | `demo123` | Fresher | Tier-2 student, targeting Android @ a top company in 8 months, on track |
| `vikram@demo.in` | `demo123` | Experienced | Laid off after 4.5 years, pivoting to cloud, behind schedule |
| `hr@novapixel.demo` | `demo123` | Company | Game-studio recruiter using blind screening and project matching |

---

## What's built (feature tour)

1. **Dashboard** — career readiness score, competition reality strip, computed next-best-actions, market pulse
2. **Roadmap** — six-phase goal tracker (Foundations → Apply), plan-vs-reality chart, AI re-plan
3. **Resume Lab** — ATS readiness check, likely rejection reasons with fixes, project-to-company alignment
4. **Application Tracker** — drag-and-drop board, simulated inbox parsing, ghosting follow-ups
5. **Profile** — editable skills, education, projects, coding stats, certifications
6. **Job Fit** — role-by-role skill match, radar chart, best-fit role ranking
7. **Mock Interview** — role-specific Q&A scored on relevance, depth, structure, clarity
8. **Job Market Portal** — openings, layoffs, news, placements with apply-timing advice
9. **Innovation Lab** — 12 ideas (5 live demos) tackling the graduates-vs-openings gap
10. **Company Portal** — talent match with server-side blind screening, hiring funnel

**Read this first:** everything in the POC is dummy data. Market figures, companies, jobs, layoffs, and news are illustrative/fictional and must be replaced with sourced data (AICTE, NASSCOM, PLFS, etc.) before being presented as fact. Match and ATS scores are estimates, never a probability of being hired.

---

## Tech stack

- **Frontend:** React + Vite (plain JS), HashRouter, framer-motion, recharts, lucide-react
- **State:** `localStorage`-backed mock DB (`src/api/client.js`) with simulated latency — swappable for a real API
- **Backend (production path):** AWS CDK (TypeScript) — Cognito, DynamoDB (single-table), API Gateway, Lambda, Bedrock (+ Guardrails), Textract, SES, EventBridge

### Frontend architecture

```
careerlens/src/
├── api/          # THE CONTRACT — one module per service (auth, profile, roadmap, applications, interview, market, recruiter)
│   ├── client.js     # mock database (localStorage) + simulated latency
│   └── engine.js     # mock "intelligence": skillMatch, atsAnalysis, rejectionDiagnosis, pivotFinder, evaluateAnswer...
├── data/         # seed accounts, roles, roadmap templates, question bank, sample market data
├── context/      # AuthProvider, DataProvider, ToastProvider
├── components/   # shared UI primitives
├── layout/       # sidebar, top bar, demo guide
└── pages/        # one file per screen
```

**Key rule:** pages never touch data directly — they call `src/api/*.js` functions and store results via `useData().run(...)`. This keeps `src/api/*` as the clean contract boundary for swapping mock data with a real backend.

---

## Deployment

### Frontend (Amplify Hosting)

This repo is a **monorepo**, so when connecting it to Amplify:

1. Select this repo (`careerlens-full`) and branch (`main`)
2. Enable **"My app is a monorepo"**
3. Set **monorepo root directory** to `careerlens`
4. Build settings (auto-detected):
   - Build command: `npm run build`
   - Output directory: `dist`

Since the app uses `HashRouter`, no SPA rewrite rules are required.

### Frontend (alternative: S3 + CloudFront)

See `careerlens-backend/` CDK stacks — a `FrontendStack` hosts the built app in a private S3 bucket behind CloudFront with Origin Access Control.

### Backend

The backend is deployed independently via CDK, in this order:
`DataStack → AuthStack → ApiStack → AiStack → IngestStack → SchedulerStack`

See `careerlens-backend/README.md` for CDK deploy commands and prerequisites (AWS SSO login, Bedrock model access, region checks for SES inbound support).

---

## POC → Production mapping

| POC piece | Production replacement |
|---|---|
| `localStorage` "database" | DynamoDB (single-table) behind API Gateway + Lambda |
| Dummy login | Amazon Cognito (student / company groups) |
| Resume upload (fake) | S3 presigned upload → Textract → Bedrock extraction |
| ATS / rejection logic | Deterministic checks in Lambda + Bedrock explanations (Guardrails) |
| Project alignment tags | Titan embeddings + cosine similarity |
| Simulated email | SES inbound → S3 → Lambda → Bedrock parser → DynamoDB |
| Mock interview scoring | Bedrock rubric scoring; Transcribe + Polly for voice |
| Sample market data | EventBridge-scheduled ingestion from a licensed job/news API |
| Hosting | S3 + CloudFront, or Amplify Hosting |

---

## Honesty checklist before presenting

- [ ] Replace or clearly label every statistic; cite sources
- [ ] Say "estimates and likely gaps," never "you will be rejected" or "you have an X% chance"
- [ ] State that companies, jobs, layoffs, and news are sample data
- [ ] Verify learning-resource links in `src/data/roadmapTemplates.js`
- [ ] Check terms of service before importing data from any job board or coding platform
- [ ] Note privacy handling: consent, PII masking, retention limits, deletion on request (India's DPDP Act)

---

## License

_Add your chosen license here._
