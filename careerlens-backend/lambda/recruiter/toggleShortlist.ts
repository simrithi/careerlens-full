import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId, requireGroup } from '../common/auth';
import { ApiError, ok, errorResponse } from '../common/http';

// POST /recruiter/shortlist/{candidateId} — company group only. Response: shortlist slice
// (array of candidate ids). This is the one write that flips a candidate's PII visibility in
// GET /recruiter/candidates, so it must stay group-gated the same way that read is.
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    requireGroup(event, 'company');
    const candidateId = event.pathParameters?.candidateId;
    if (!candidateId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing candidate id');
    const key = pk(userId);

    const existing = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk: key, sk: SK.shortlist } }));
    const ids: string[] = existing.Item?.ids ?? [];
    const next = ids.includes(candidateId) ? ids.filter((x) => x !== candidateId) : [...ids, candidateId];

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: { pk: key, sk: SK.shortlist, ids: next } }));
    return ok(next);
  } catch (err) {
    return errorResponse(err);
  }
}
