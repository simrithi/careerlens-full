import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface AuthStackProps extends StackProps {
  /** Where Cognito Hosted UI redirects after login/logout, e.g. the CloudFront URL from D2 or localhost during dev. */
  callbackUrls: string[];
  logoutUrls: string[];
  /** Prefix for the Cognito Hosted UI domain (must be globally unique): https://{domainPrefix}.auth.{region}.amazoncognito.com */
  domainPrefix: string;
}

export class AuthStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    // Two account "types" from src/data/seed.js map to two Cognito groups. The mock's fresher/
    // experienced distinction is just a profile field, not an auth group (see docs/api-contract.md).
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'careerlens-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    new cognito.CfnUserPoolGroup(this, 'StudentGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'student',
      description: 'Fresher and experienced job seekers (src/data/seed.js accounts like ananya, vikram)',
    });
    new cognito.CfnUserPoolGroup(this, 'CompanyGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'company',
      description: 'Recruiter accounts (src/data/seed.js account novapixel), tenant-scoped by companyId claim',
    });

    this.userPoolClient = this.userPool.addClient('WebClient', {
      generateSecret: false, // public SPA client — no secret to leak into frontend bundles
      // adminUserPassword enables `aws cognito-idp admin-initiate-auth` for smoke testing and
      // future seed scripts (prompt D9). userPassword (USER_PASSWORD_AUTH) lets the frontend sign
      // in a small set of pre-provisioned judge/demo accounts with one direct InitiateAuth call
      // (see src/api/cognito.js#demoLogin) instead of redirecting to Hosted UI, so evaluators never
      // land on a page with a "sign up" option. Real end users still use userSrp / the Hosted UI
      // redirect.
      authFlows: { userSrp: true, userPassword: true, adminUserPassword: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls: props.callbackUrls,
        logoutUrls: props.logoutUrls,
      },
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
    });

    this.userPool.addDomain('HostedUiDomain', {
      cognitoDomain: { domainPrefix: props.domainPrefix },
    });
  }
}
