import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId } from '../common/auth';
import { ApiError, ok, errorResponse } from '../common/http';

// POST /features/{id}/vote -> votes slice ({ [featureId]: boolean })
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const featureId = event.pathParameters?.id;
    if (!featureId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing feature id');
    const key = pk(userId);

    const existing = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk: key, sk: SK.votes } }));
    const votes: Record<string, boolean> = existing.Item?.votes ?? {};
    const next = { ...votes, [featureId]: !votes[featureId] };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: { pk: key, sk: SK.votes, votes: next } }));
    return ok(next);
  } catch (err) {
    return errorResponse(err);
  }
}
