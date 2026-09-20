import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'node:path';

// Same secret, imported independently here rather than passed in from ApiStack — fromSecretNameV2
// just builds a reference by name (no resource ownership), so duplicating it avoids a cross-stack
// dependency. See lib/api-stack.ts for the canonical comment on how these secrets are created.
const GEMINI_SECRET_NAME = 'careerlens/gemini-api-key';

export class DataStack extends Stack {
  public readonly table: dynamodb.Table;
  public readonly resumeBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const key = new kms.Key(this, 'TableKey', {
      description: 'CareerLens DynamoDB encryption key',
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // Single-table design: PK = USER#{userId}, SK = PROFILE | SKILL#{name} | EDU#{id} | EXP#{id}
    // | CERT#{id} | PROJ#{id} | EXT#{platform} | NOTIF#{id}. See docs/api-contract.md and
    // lambda/common/db.ts for the full key scheme; later stacks (roadmap, applications, ...)
    // add more SK prefixes to this same table rather than creating new tables.
    this.table = new dynamodb.Table(this, 'Table', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: key,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // Resumes bucket (A2: presigned upload target; A5's Textract-triggered Lambda below).
    this.resumeBucket = new s3.Bucket(this, 'ResumeBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      removalPolicy: RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: ['*'], // tightened to the deployed frontend origin once D2 lands
          allowedHeaders: ['*'],
        },
      ],
    });

    // S3-triggered: OCRs + Gemini-extracts skills/projects/experience from an uploaded resume.
    // Lives in this stack (not ApiStack, where every other Lambda lives) specifically because
    // ApiStack already depends on DataStack for table/resumeBucket — wiring the bucket's event
    // notification to a Lambda in ApiStack would need DataStack to depend back on ApiStack for
    // that Lambda's ARN, a cycle. No API route needed either way; it only fires on the S3 event.
    const parseResumeFn = new NodejsFunction(this, 'ParseResumeFn', {
      entry: path.join(__dirname, '..', 'lambda', 'profile/parseResume.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_24_X,
      memorySize: 256,
      timeout: Duration.seconds(60),
      logRetention: logs.RetentionDays.TWO_WEEKS,
      environment: { TABLE_NAME: this.table.tableName, GEMINI_SECRET_NAME },
      bundling: { minify: true, sourceMap: true },
    });
    const geminiSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GeminiSecretForParseResume', GEMINI_SECRET_NAME);
    this.table.grantReadWriteData(parseResumeFn);
    this.resumeBucket.grantRead(parseResumeFn);
    geminiSecret.grantRead(parseResumeFn);
    parseResumeFn.addToRolePolicy(new iam.PolicyStatement({ actions: ['textract:DetectDocumentText'], resources: ['*'] }));
    this.resumeBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(parseResumeFn), { prefix: 'resumes/' });
  }
}
