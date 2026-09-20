import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId } from '../common/auth';
import { ok, errorResponse, parseJsonBody } from '../common/http';
import { listApplications } from '../common/applicationsStore';

// POST /applications
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const body = parseJsonBody(event.body) as Record<string, unknown>;
    const id = randomUUID();
    const now = new Date().toISOString();

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        // Server-controlled keys go last so a body containing pk/sk/id can never overwrite an
        // item outside the caller's own partition (see the same fix in addRole.ts/addBulk.ts).
        Item: {
          status: 'APPLIED',
          date: now.slice(0, 10),
          source: 'Other',
          ...body,
          pk: pk(userId),
          sk: SK.application(id),
          id,
          createdAt: now,
        },
      })
    );

    return ok(await listApplications(userId));
  } catch (err) {
    return errorResponse(err);
  }
}
