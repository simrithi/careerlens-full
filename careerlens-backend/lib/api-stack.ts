import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'node:path';

// Created by hand via `aws secretsmanager create-secret` (see README) — never provisioned by
// CDK, since the key value itself must never pass through source control or a CDK diff.
const GEMINI_SECRET_NAME = 'careerlens/gemini-api-key';
const ADZUNA_SECRET_NAME = 'careerlens/adzuna-credentials'; // JSON: {"app_id": "...", "app_key": "..."}
const GNEWS_SECRET_NAME = 'careerlens/gnews-api-key';

export interface ApiStackProps extends StackProps {
  table: dynamodb.Table;
  resumeBucket: s3.Bucket;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  /** Frontend origins allowed to call this API (CORS). Include http://localhost:5173 in dev. */
  allowedOrigins: string[];
}

export class ApiStack extends Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { table, resumeBucket } = props;

    const fn = (name: string, entry: string, extraEnv?: Record<string, string>, timeoutSeconds = 10) =>
      new NodejsFunction(this, name, {
        entry: path.join(__dirname, '..', 'lambda', entry),
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_24_X,
        memorySize: 256,
        timeout: Duration.seconds(timeoutSeconds),
        logRetention: logs.RetentionDays.TWO_WEEKS,
        environment: { TABLE_NAME: table.tableName, ...extraEnv },
        bundling: { minify: true, sourceMap: true },
      });

    // --- auth ---
    const bundleFn = fn('BundleFn', 'auth/bundle.ts');
    const notificationsReadFn = fn('NotificationsReadFn', 'auth/notificationsRead.ts');
    table.grantReadWriteData(notificationsReadFn);

    // --- profile ---
    const updateProfileFn = fn('UpdateProfileFn', 'profile/updateProfile.ts');
    const sectionItemFn = fn('SectionItemFn', 'profile/sectionItem.ts');
    const skillFn = fn('SkillFn', 'profile/skill.ts');
    const externalFn = fn('ExternalFn', 'profile/external.ts');
    const resumeUploadUrlFn = fn('ResumeUploadUrlFn', 'profile/resumeUploadUrl.ts', {
      RESUME_BUCKET: resumeBucket.bucketName,
    });
    table.grantReadWriteData(updateProfileFn);
    table.grantReadWriteData(sectionItemFn);
    table.grantReadWriteData(skillFn);
    table.grantReadWriteData(externalFn);
    table.grantReadWriteData(resumeUploadUrlFn);
    resumeBucket.grantPut(resumeUploadUrlFn);

    // --- roadmap (prompt A3) ---
    const toggleMilestoneFn = fn('ToggleMilestoneFn', 'roadmap/toggleMilestone.ts');
    const addMilestoneFn = fn('AddMilestoneFn', 'roadmap/addMilestone.ts');
    const replanFn = fn('ReplanFn', 'roadmap/replan.ts', undefined, 20);
    const setGoalFn = fn('SetGoalFn', 'roadmap/setGoal.ts');
    const toggleQuestionFn = fn('ToggleQuestionFn', 'roadmap/toggleQuestion.ts');
    table.grantReadWriteData(toggleMilestoneFn);
    table.grantReadWriteData(addMilestoneFn);
    table.grantReadWriteData(replanFn);
    table.grantReadWriteData(setGoalFn);
    table.grantReadWriteData(toggleQuestionFn);
    // GET /me/bundle also lazily provisions a roadmap (ensureRoadmap), so it needs write access too.
    table.grantReadWriteData(bundleFn);

    // --- applications (prompt A4; simulateEmail stays client-side/mock forever) ---
    const addApplicationFn = fn('AddApplicationFn', 'applications/addApplication.ts');
    const addBulkFn = fn('AddBulkFn', 'applications/addBulk.ts');
    const moveApplicationFn = fn('MoveApplicationFn', 'applications/moveApplication.ts');
    const removeApplicationFn = fn('RemoveApplicationFn', 'applications/removeApplication.ts');
    table.grantReadWriteData(addApplicationFn);
    table.grantReadWriteData(addBulkFn);
    table.grantReadWriteData(moveApplicationFn);
    table.grantReadWriteData(removeApplicationFn);

    // --- recruiter (company group only; see requireGroup in lambda/common/auth.ts) ---
    const toggleShortlistFn = fn('ToggleShortlistFn', 'recruiter/toggleShortlist.ts');
    const addRoleFn = fn('AddRoleFn', 'recruiter/addRole.ts');
    const getCandidatesFn = fn('GetCandidatesFn', 'recruiter/getCandidates.ts');
    table.grantReadWriteData(toggleShortlistFn);
    table.grantReadWriteData(addRoleFn);
    table.grantReadData(getCandidatesFn);

    // --- interview, market, features (small remaining slices) ---
    const saveInterviewFn = fn('SaveInterviewFn', 'interview/saveInterview.ts');
    const toggleSavedJobFn = fn('ToggleSavedJobFn', 'market/toggleSavedJob.ts');
    const toggleVoteFn = fn('ToggleVoteFn', 'features/toggleVote.ts');
    const acceptGigFn = fn('AcceptGigFn', 'features/acceptGig.ts');
    table.grantReadWriteData(saveInterviewFn);
    table.grantReadWriteData(toggleSavedJobFn);
    table.grantReadWriteData(toggleVoteFn);
    table.grantReadWriteData(acceptGigFn);

    // --- Gemini-backed AI features ---
    const geminiSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GeminiSecret', GEMINI_SECRET_NAME);
    const geminiEnv = { GEMINI_SECRET_NAME };
    const scoreAnswerFn = fn('ScoreAnswerFn', 'interview/scoreAnswer.ts', geminiEnv, 20);
    const diagnoseRejectionFn = fn('DiagnoseRejectionFn', 'resume/diagnoseRejection.ts', geminiEnv, 20);
    geminiSecret.grantRead(scoreAnswerFn);
    geminiSecret.grantRead(diagnoseRejectionFn);
    // replanFn already exists above (roadmap section) — it also calls Gemini for a best-effort note.
    replanFn.addEnvironment('GEMINI_SECRET_NAME', GEMINI_SECRET_NAME);
    geminiSecret.grantRead(replanFn);

    // Note: the resume-parsing Lambda (Textract + Gemini) lives in DataStack, not here — see the
    // comment on ParseResumeFn there for why (avoiding a cross-stack dependency cycle on the
    // resumeBucket event notification).

    // --- real market data (Adzuna jobs, GNews hiring/layoff headlines) ---
    const adzunaSecret = secretsmanager.Secret.fromSecretNameV2(this, 'AdzunaSecret', ADZUNA_SECRET_NAME);
    const gnewsSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GNewsSecret', GNEWS_SECRET_NAME);
    const getJobsFn = fn('GetJobsFn', 'market/getJobs.ts', { ADZUNA_SECRET_NAME }, 15);
    const getNewsFn = fn('GetNewsFn', 'market/getNews.ts', { GNEWS_SECRET_NAME }, 15);
    const getLayoffNewsFn = fn('GetLayoffNewsFn', 'market/getLayoffNews.ts', { GNEWS_SECRET_NAME }, 15);
    adzunaSecret.grantRead(getJobsFn);
    gnewsSecret.grantRead(getNewsFn);
    gnewsSecret.grantRead(getLayoffNewsFn);
    // each reads (TTL check) and writes (refresh) its own small cache item under PK=MARKET
    table.grantReadWriteData(getJobsFn);
    table.grantReadWriteData(getNewsFn);
    table.grantReadWriteData(getLayoffNewsFn);

    const getHiringTrendFn = fn('GetHiringTrendFn', 'market/getHiringTrend.ts', { ADZUNA_SECRET_NAME }, 15);
    adzunaSecret.grantRead(getHiringTrendFn);
    table.grantReadWriteData(getHiringTrendFn);

    // --- EventBridge news-ingest schedule (the "EventBridge (news ingest)" piece referenced by
    // the Layoff & Automation Shield feature card in src/data/features.js). Proactively refreshes
    // the layoffs-news cache every 30 min (matching marketCache.ts's TTL) so GET /market/layoffs
    // is normally served warm instead of a real visitor triggering the first (slow) GNews call
    // after the cache goes stale. Additive only — doesn't touch the existing lazy cache-on-read
    // path in getLayoffNewsFn, which still works standalone if this rule is ever removed.
    const refreshLayoffNewsFn = fn('RefreshLayoffNewsFn', 'market/refreshLayoffNews.ts', { GNEWS_SECRET_NAME }, 15);
    gnewsSecret.grantRead(refreshLayoffNewsFn);
    table.grantReadWriteData(refreshLayoffNewsFn);
    new events.Rule(this, 'LayoffNewsRefreshRule', {
      schedule: events.Schedule.rate(Duration.minutes(30)),
      targets: [new targets.LambdaFunction(refreshLayoffNewsFn)],
    });

    // --- gigs marketplace (company posts, any candidate browses/applies — PK='GIGS', see db.ts) ---
    const postGigFn = fn('PostGigFn', 'market/postGig.ts');
    const getGigsFn = fn('GetGigsFn', 'market/getGigs.ts');
    const applyToGigFn = fn('ApplyToGigFn', 'market/applyToGig.ts');
    const getGigApplicantsFn = fn('GetGigApplicantsFn', 'recruiter/getGigApplicants.ts');
    table.grantReadWriteData(postGigFn);
    table.grantReadData(getGigsFn);
    table.grantReadWriteData(applyToGigFn);
    table.grantReadData(getGigApplicantsFn);

    // --- HTTP API + Cognito JWT authorizer ---
    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'careerlens-api',
      corsPreflight: {
        allowOrigins: props.allowedOrigins,
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: Duration.hours(1),
      },
    });

    const authorizer = new HttpJwtAuthorizer('CognitoAuthorizer', props.userPool.userPoolProviderUrl, {
      jwtAudience: [props.userPoolClient.userPoolClientId],
    });

    const route = (path_: string, methods: apigwv2.HttpMethod[], handler: lambda.IFunction) => {
      httpApi.addRoutes({
        path: path_,
        methods,
        integration: new HttpLambdaIntegration(`${path_}-${methods.join('-')}`, handler),
        authorizer,
      });
    };

    route('/me/bundle', [apigwv2.HttpMethod.GET], bundleFn);
    route('/me/notifications/read', [apigwv2.HttpMethod.PATCH], notificationsReadFn);
    route('/profile', [apigwv2.HttpMethod.PATCH], updateProfileFn);
    route('/profile/{section}', [apigwv2.HttpMethod.POST], sectionItemFn);
    route(
      '/profile/{section}/{id}',
      [apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE],
      sectionItemFn
    );
    route('/profile/skills/{name}', [apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE], skillFn);
    route('/profile/external/{platform}', [apigwv2.HttpMethod.PUT], externalFn);
    route('/resume/upload-url', [apigwv2.HttpMethod.POST], resumeUploadUrlFn);

    route('/roadmap/milestones/{id}', [apigwv2.HttpMethod.PATCH], toggleMilestoneFn);
    route('/roadmap/phases/{phaseId}/milestones', [apigwv2.HttpMethod.POST], addMilestoneFn);
    route('/roadmap/replan', [apigwv2.HttpMethod.POST], replanFn);
    route('/roadmap/goal', [apigwv2.HttpMethod.PATCH], setGoalFn);
    route('/roadmap/questions/{qid}/toggle', [apigwv2.HttpMethod.PATCH], toggleQuestionFn);

    route('/applications', [apigwv2.HttpMethod.POST], addApplicationFn);
    route('/applications/bulk', [apigwv2.HttpMethod.POST], addBulkFn);
    route('/applications/{id}', [apigwv2.HttpMethod.PATCH], moveApplicationFn);
    route('/applications/{id}', [apigwv2.HttpMethod.DELETE], removeApplicationFn);

    route('/recruiter/shortlist/{candidateId}', [apigwv2.HttpMethod.POST], toggleShortlistFn);
    route('/recruiter/roles', [apigwv2.HttpMethod.POST], addRoleFn);
    route('/recruiter/candidates', [apigwv2.HttpMethod.GET], getCandidatesFn);

    route('/interviews', [apigwv2.HttpMethod.POST], saveInterviewFn);
    route('/jobs/{id}/save', [apigwv2.HttpMethod.POST], toggleSavedJobFn);
    route('/features/{id}/vote', [apigwv2.HttpMethod.POST], toggleVoteFn);
    route('/gigs/{id}/accept', [apigwv2.HttpMethod.POST], acceptGigFn);

    route('/interview/score-answer', [apigwv2.HttpMethod.POST], scoreAnswerFn);
    route('/resume/diagnose', [apigwv2.HttpMethod.POST], diagnoseRejectionFn);

    route('/market/jobs', [apigwv2.HttpMethod.GET], getJobsFn);
    route('/market/news', [apigwv2.HttpMethod.GET], getNewsFn);
    route('/market/layoffs', [apigwv2.HttpMethod.GET], getLayoffNewsFn);
    route('/market/hiring-trend', [apigwv2.HttpMethod.GET], getHiringTrendFn);

    route('/market/gigs', [apigwv2.HttpMethod.GET], getGigsFn);
    route('/market/gigs', [apigwv2.HttpMethod.POST], postGigFn);
    route('/market/gigs/{id}/apply', [apigwv2.HttpMethod.POST], applyToGigFn);
    route('/recruiter/gigs/{id}/applicants', [apigwv2.HttpMethod.GET], getGigApplicantsFn);

    this.apiUrl = httpApi.apiEndpoint;
  }
}
