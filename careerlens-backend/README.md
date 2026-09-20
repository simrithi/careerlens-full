# CareerLens backend

AWS CDK (TypeScript) app implementing the real backend behind `../careerlens` (see that repo's
`docs/api-contract.md` and `docs/openapi.yaml` for the full contract). This folder currently
implements **prompt A2 only**: auth (`GET /me/bundle`, `PATCH /me/notifications/read`) and profile
(`profileApi`'s endpoints). Roadmap, applications/email, resume Textract processing, interview
scoring, market data and the recruiter portal are separate stacks/prompts (A3-A8) not built yet.

Deviates from the guide's "Node 20" Lambda runtime — Node 20 is past its deprecation date as of
this build, so functions run on `NODEJS_24_X` instead.

## Stacks

1. **CareerLensDataStack** — DynamoDB single table (`pk`/`sk`, customer-managed KMS key, point-in-time
   recovery) + an S3 bucket for resume uploads. See `lambda/common/db.ts` for the key scheme.
2. **CareerLensAuthStack** — Cognito User Pool with `student`/`company` groups, a public SPA app
   client (no secret), and a Hosted UI domain.
3. **CareerLensApiStack** — API Gateway HTTP API with a Cognito JWT authorizer, one Lambda per
   route group (`lambda/auth/*`, `lambda/profile/*`).

`CareerLensApiStack` depends on the other two; deploy in that order (CDK handles this automatically
via `cdk deploy --all`, but you can also target one stack at a time).

## Prerequisites

- Node 20+ (we build/test with the version on your machine; Lambdas deploy on Node 24).
- AWS CLI v2 configured with a profile that has permission to deploy (see the main project's
  `CLAUDE.md`: use `aws configure sso` + `aws sso login`, never long-lived keys if you can help it).
- `npx cdk bootstrap --profile <your-profile>` once per account/region, before the first deploy.

## Environment variables (set before `cdk synth`/`diff`/`deploy`)

| Var | Default | Purpose |
|---|---|---|
| `CDK_DEFAULT_ACCOUNT` / `CDK_DEFAULT_REGION` | from your AWS profile | Deploy target. `cdk` sets these automatically from `--profile` if you don't. |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Comma-separated list of origins allowed by CORS and Cognito Hosted UI redirects. Add the CloudFront URL once D2 is deployed. |
| `COGNITO_DOMAIN_PREFIX` | `careerlens-dev` | Cognito Hosted UI domain prefix — **must be globally unique across all AWS accounts**; change it if deploy fails with a "domain already exists" error. |

## Commands

```
npm install
npm run build        # tsc type-check
npm test              # vitest unit tests
npx cdk synth          # no AWS credentials needed (no context lookups in these stacks)
npx cdk diff --profile <your-profile>     # ALWAYS run this and review before deploying
npx cdk deploy --all --profile <your-profile>
```

Per the main project's `CLAUDE.md`: always show `cdk diff` output and get explicit approval before
`cdk deploy`. Never delete or recreate resources outside these stacks without asking first.

## After deploying

The stack outputs (`ApiUrl`, `UserPoolId`, `UserPoolClientId`, `HostedUiDomain`) are what the
frontend's `.env` needs:

```
VITE_USE_MOCK=false
VITE_API_URL=<ApiUrl output>
```

Cognito auth wiring (Hosted UI redirect → ID token → `setTokenProvider` in `src/api/http.js`) is
still TODO on the frontend side — `src/api/auth.js`'s `login()` is still the mock. That's the next
piece of A1/A2 to finish.

## What's NOT here yet

- `POST /resume/upload-url` returns a presigned URL and the bucket exists, but the S3-triggered
  Textract + Bedrock extraction Lambda (prompt A5) that actually reads the resume isn't built.
- No budget/guardrails stack (prompt D1) — deploying this costs real money (DynamoDB is pay-per-request
  so idle cost is near zero, but Cognito/API Gateway/CloudWatch Logs are not free at scale). Set up
  billing alerts in the console before your first deploy if you haven't already.
- No CI/CD (prompt D6), no observability dashboard (D7), no security review (D8).
