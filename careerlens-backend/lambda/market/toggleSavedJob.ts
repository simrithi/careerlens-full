import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId } from '../common/auth';
import { ApiError, ok, errorResponse } from '../common/http';

// POST /jobs/{id}/save -> savedJobs slice (array of job ids)
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const jobId = event.pathParameters?.id;
    if (!jobId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing job id');
    const key = pk(userId);

    const existing = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk: key, sk: SK.savedJobs } }));
    const ids: string[] = existing.Item?.ids ?? [];
    const next = ids.includes(jobId) ? ids.filter((x) => x !== jobId) : [...ids, jobId];

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: { pk: key, sk: SK.savedJobs, ids: next } }));
    return ok(next);
  } catch (err) {
    return errorResponse(err);
  }
}
