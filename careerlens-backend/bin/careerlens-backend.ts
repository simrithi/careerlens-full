#!/usr/bin/env node
import { App, CfnOutput, Stack, Tags } from 'aws-cdk-lib';
import { DataStack } from '../lib/data-stack';
import { AuthStack } from '../lib/auth-stack';
import { ApiStack } from '../lib/api-stack';
import { GuardrailsStack } from '../lib/guardrails-stack';

const app = new App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Frontend origin(s) allowed to call the API. Override with FRONTEND_ORIGIN (comma-separated)
// once the CloudFront URL exists (prompt D2); defaults to the Vite dev server.
const origins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',');

// Cognito's callback/logout URLs must match EXACTLY what the browser sends, including trailing
// slash — src/api/cognito.js builds redirect_uri as origin + pathname, and browsers normalize a
// bare origin's path to "/", so both forms need to be registered.
const redirectUrls = origins.flatMap((o) => (o.endsWith('/') ? [o] : [o, `${o}/`]));

// Cognito Hosted UI domain prefix must be globally unique across ALL AWS accounts.
// Override with COGNITO_DOMAIN_PREFIX if "careerlens-dev" is already taken.
const domainPrefix = process.env.COGNITO_DOMAIN_PREFIX || 'careerlens-dev';

const guardrailsStack = new GuardrailsStack(app, 'CareerLensGuardrailsStack', {
  env,
  monthlyLimitUsd: Number(process.env.MONTHLY_BUDGET_USD || 25),
  alertEmail: process.env.BUDGET_ALERT_EMAIL || 'simrithi.s@gmail.com',
});

const dataStack = new DataStack(app, 'CareerLensDataStack', { env });

const authStack = new AuthStack(app, 'CareerLensAuthStack', {
  env,
  callbackUrls: redirectUrls,
  logoutUrls: redirectUrls,
  domainPrefix,
});

const apiStack = new ApiStack(app, 'CareerLensApiStack', {
  env,
  table: dataStack.table,
  resumeBucket: dataStack.resumeBucket,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  allowedOrigins: origins,
});
apiStack.addDependency(dataStack);
apiStack.addDependency(authStack);

new CfnOutput(apiStack, 'ApiUrl', { value: apiStack.apiUrl });
new CfnOutput(authStack, 'UserPoolId', { value: authStack.userPool.userPoolId });
new CfnOutput(authStack, 'UserPoolClientId', { value: authStack.userPoolClient.userPoolClientId });
new CfnOutput(authStack, 'HostedUiDomain', {
  value: `https://${domainPrefix}.auth.${env.region}.amazoncognito.com`,
});

for (const stack of [guardrailsStack, dataStack, authStack, apiStack] as Stack[]) {
  Tags.of(stack).add('project', 'careerlens');
}
