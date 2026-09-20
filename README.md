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
