# CareerLens backend

AWS CDK (TypeScript) app implementing the real backend behind `../careerlens` (see that repo's
`docs/api-contract.md` and `docs/openapi.yaml` for the full contract). Deployed and live: auth,
profile (including Textract + Gemini resume parsing), roadmap, applications, recruiter, interview
scoring, resume rejection diagnosis, and real market data (Adzuna + GNews). See "What's NOT here
yet" below for the genuine remaining gaps.

Deviates from the guide's "Node 20" Lambda runtime — Node 20 is past its deprecation date as of
this build, so functions run on `NODEJS_24_X` instead.

## Stacks

1. **CareerLensGuardrailsStack** — AWS Budgets with a monthly cost limit and alerts at 50/80/100%
   of it, deployed before anything else so cost visibility exists from the first dollar spent.
2. **CareerLensDataStack** — DynamoDB single table (`pk`/`sk`, customer-managed KMS key, point-in-time
   recovery) + an S3 bucket for resume uploads. Also owns `ParseResumeFn`, the S3-triggered Lambda
   that OCRs an uploaded resume with Textract and asks Gemini to structure skills/projects/experience
   from it — it lives here rather than in ApiStack specifically to avoid a cross-stack dependency
   cycle on the bucket's event notification. See `lambda/common/db.ts` for the key scheme.
3. **CareerLensAuthStack** — Cognito User Pool with `student`/`company` groups, a public SPA app
   client (no secret), a Hosted UI domain, and a direct `USER_PASSWORD_AUTH` flow enabled only for
   two pre-provisioned judge demo accounts (see `src/api/cognito.js#demoLogin` in the frontend).
4. **CareerLensApiStack** — API Gateway HTTP API with a Cognito JWT authorizer, one Lambda per
   route across auth, profile, roadmap, applications, recruiter, interview, resume, market and
   features. Also owns `LayoffNewsRefreshRule`, an EventBridge schedule that proactively refreshes
   the layoffs-news cache every 30 minutes.

`CareerLensApiStack` depends on the other stacks; deploy in that order (CDK handles this automatically
via `cdk deploy --all`, but you can also target one stack at a time).

## Prerequisites

- Node 20+ (we build/test with the version on your machine; Lambdas deploy on Node 24).
- AWS CLI v2 configured with a profile that has permission to deploy (see the main project's
  `careerlens/CONTRIBUTING.md`: use `aws configure sso` + `aws sso login`, never long-lived keys if you can help it).
- `npx cdk bootstrap --profile <your-profile>` once per account/region, before the first deploy.

## Environment variables (set before `cdk synth`/`diff`/`deploy`)

| Var | Default | Purpose |
|---|---|---|
| `CDK_DEFAULT_ACCOUNT` / `CDK_DEFAULT_REGION` | from your AWS profile | Deploy target. `cdk` sets these automatically from `--profile` if you don't. |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Comma-separated list of origins allowed by CORS and Cognito Hosted UI redirects. Add every deployed frontend URL (e.g. the Amplify Hosting domain) here, or Hosted UI login and API calls from that origin will fail. |
| `COGNITO_DOMAIN_PREFIX` | `careerlens-dev` | Cognito Hosted UI domain prefix — **must be globally unique across all AWS accounts**; change it if deploy fails with a "domain already exists" error. |
| `MONTHLY_BUDGET_USD` | `25` | AWS Budgets monthly limit. |
| `BUDGET_ALERT_EMAIL` | (set your own) | Where budget threshold alerts go. Always pass this explicitly rather than relying on a hardcoded fallback, especially if the repo is public. |

## Commands

```
npm install
npm run build        # tsc type-check
npm test              # vitest unit tests
npx cdk synth          # no AWS credentials needed (no context lookups in these stacks)
npx cdk diff --profile <your-profile>     # ALWAYS run this and review before deploying
npx cdk deploy --all --profile <your-profile>
```

Per the main project's `careerlens/CONTRIBUTING.md`: always show `cdk diff` output and get explicit approval before
`cdk deploy`. Never delete or recreate resources outside these stacks without asking first.

## After deploying

The stack outputs (`ApiUrl`, `UserPoolId`, `UserPoolClientId`, `HostedUiDomain`) are what the
frontend's `.env` needs:

```
VITE_USE_MOCK=false
VITE_API_URL=<ApiUrl output>
VITE_COGNITO_USER_POOL_ID=<UserPoolId output>
VITE_COGNITO_CLIENT_ID=<UserPoolClientId output>
VITE_COGNITO_DOMAIN=<HostedUiDomain output>
```

Cognito Hosted UI login (redirect → ID token → `setTokenProvider` in `src/api/http.js`) is fully
wired on the frontend side — `src/api/cognito.js` handles the real flow, and `src/api/auth.js`'s
mock `login()` is only used when `VITE_USE_MOCK=true`.

If you deploy the frontend somewhere other than `localhost:5173` (Amplify Hosting, CloudFront,
etc.), add that origin to `FRONTEND_ORIGIN` and redeploy `CareerLensAuthStack` + `CareerLensApiStack`
— otherwise Cognito will reject the redirect and API Gateway's CORS will block every request from
that origin.

## What's NOT here yet

- Real SES inbound email ingestion (auto-updating applications from forwarded portal emails) is
  not built — blocked on owning a domain to verify with SES. The frontend's "forward emails here"
  UI is explicitly labeled simulated for the demo.
- `GET /applications/stats` and `GET /applications/insights` — not implemented; the frontend
  computes both client-side instead (`applicationInsights()` in `engine.js`).
- `POST /applications/extract` (job-link/text extraction for the bulk-add modal) — not implemented.
- No CI/CD (prompt D6), no observability dashboard (D7), no formal security review (D8).
