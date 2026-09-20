import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId } from '../common/auth';
import { ok, errorResponse, parseJsonBody } from '../common/http';

// POST /interviews — session summary (role, mode, score breakdown). Scoring itself
// (evaluateAnswer) stays rule-based client-side for now; only persistence is real here.
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const body = parseJsonBody(event.body) as Record<string, unknown>;
    const id = randomUUID();
    const key = pk(userId);

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        // Server-controlled keys go last so a body containing pk/sk/id (accidentally or
        // otherwise) can never overwrite an item outside the caller's own partition.
        Item: { date: new Date().toISOString().slice(0, 10), ...body, pk: key, sk: SK.interview(id), id },
      })
    );

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': key, ':prefix': SK.interviewPrefix },
      })
    );
    const interviews = (res.Items ?? []).map(({ pk: _pk, sk: _sk, ...rest }) => rest);
    return ok(interviews);
  } catch (err) {
    return errorResponse(err);
  }
}
