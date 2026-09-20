import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId } from '../common/auth';
import { ApiError, ok, errorResponse, parseJsonBody } from '../common/http';
import { listApplications } from '../common/applicationsStore';

// POST /applications/bulk — up to 50 at once (BatchWriteCommand caps at 25 items per call).
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const body = parseJsonBody(event.body) as { items?: Record<string, unknown>[] };
    const items = body.items ?? [];
    if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, 'VALIDATION_ERROR', 'items must be a non-empty array');
    if (items.length > 50) throw new ApiError(400, 'VALIDATION_ERROR', 'Max 50 applications per bulk add');

    const now = new Date().toISOString();
    const key = pk(userId);
    const requests = items.map((item) => {
      const id = randomUUID();
      return {
        PutRequest: {
          // Server-controlled keys go last — see addApplication.ts.
          Item: { status: 'APPLIED', date: now.slice(0, 10), source: 'Other', ...item, pk: key, sk: SK.application(id), id, createdAt: now },
        },
      };
    });

    for (let i = 0; i < requests.length; i += 25) {
      const chunk = requests.slice(i, i + 25);
      await ddb.send(new BatchWriteCommand({ RequestItems: { [TABLE_NAME]: chunk } }));
    }

    return ok(await listApplications(userId));
  } catch (err) {
    return errorResponse(err);
  }
}
