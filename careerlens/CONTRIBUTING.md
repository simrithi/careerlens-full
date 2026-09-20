# CareerLens POC

React 19 + Vite (plain JS, not TypeScript). HashRouter (react-router-dom v7). framer-motion, recharts, lucide-react (no brand icons; use GitBranch not Github).

## Architecture
- Pages never touch data directly. They call functions in `src/api/*.js` and store the result via `useData().run(...)` (see `src/context/AppContext.jsx`).
- `src/api/*.js` is the backend contract: `authApi`, `profileApi`, `roadmapApi`, `applicationsApi`, `interviewApi`, `marketApi`, `featuresApi`, `recruiterApi` (re-exported from `src/api/index.js`).
- `src/api/client.js` is the mock persistence layer (`localStorage`, key `careerlens_db_v4`). `request(userId, fn)` loads the user's full record, mutates it, saves it, and returns a clone. **Every mutation currently returns the whole user record.** See `docs/api-contract.md` for the plan to change this to per-slice responses when swapping in a real backend.
- `src/api/engine.js` holds pure, deterministic "mock intelligence" functions (skillMatch, roadmapStats, atsAnalysis, rejectionDiagnosis, projectAlignment, applicationInsights, timingAdvice, jobMatch, pivotFinder, resilience, evaluateAnswer, readiness...). Each is commented with the AWS service that replaces or augments it in production.
- `src/data/seed.js` is the "database" shape for the 3 demo accounts (`ananya`, `vikram`, `novapixel`) and mirrors what DynamoDB should return per user.
- When changing `src/api/*.js` internals, keep function names and return shapes, or update `docs/api-contract.md` and `docs/openapi.yaml` in the same change.
- Shared UI lives in `src/components/ui.jsx`. Styles: `src/styles/base.css` (primitives) and `pages.css` (page-specific). Reuse existing classes before adding new ones.
- Do not add dependencies without asking.
- All market numbers and companies in `src/data` are illustrative sample data. Never present them as real statistics.
- Scores are estimates, never a probability of being hired.
- Run `npm run build` and fix errors before saying a task is done.

## Connecting a real backend
- `VITE_USE_MOCK` (default true) toggles each `src/api/*.js` function between the mock in `client.js` and a real HTTP call via `src/api/http.js` (to be added). Do not remove the mock path — it's the demo fallback if the real backend has an issue on stage.
- `VITE_API_URL` is the API Gateway base URL.
- Never paste AWS keys, tokens or passwords into prompts or files. Use `aws configure sso` and environment variables; keep `.env` out of git.
- Before any `cdk deploy`, show `cdk diff` output and wait for explicit approval. Never delete or recreate resources outside the CDK stacks without asking first.
