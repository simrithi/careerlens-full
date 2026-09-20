import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId } from '../common/auth';
import { ok, errorResponse } from '../common/http';

const s3 = new S3Client({});
const BUCKET = process.env.RESUME_BUCKET as string;

// POST /resume/upload-url — returns a short-lived presigned PUT URL so the browser uploads
// straight to S3 (never through this Lambda). Records resume.parseStatus='pending' on the
// PROFILE item right away so it survives a page refresh; the S3-triggered Textract + Gemini
// Lambda (profile/parseResume.ts) flips it to 'done'/'failed' once OCR + extraction finish.
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const fileKey = `resumes/${userId}/${randomUUID()}.pdf`;
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: BUCKET, Key: fileKey, ContentType: 'application/pdf' }),
      { expiresIn: 300 }
    );
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: pk(userId), sk: SK.profile },
        UpdateExpression: 'SET resume = :r',
        ExpressionAttributeValues: { ':r': { fileKey, parseStatus: 'pending', uploadedAt: new Date().toISOString().slice(0, 10) } },
      })
    );
    return ok({ uploadUrl, fileKey });
  } catch (err) {
    return errorResponse(err);
  }
}
