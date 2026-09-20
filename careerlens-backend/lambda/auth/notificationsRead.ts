import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId } from '../common/auth';
import { ok, errorResponse } from '../common/http';

// PATCH /me/notifications/read — marks every notification for this user read and returns the
// updated `notifications` slice (see docs/api-contract.md).
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const key = pk(userId);

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': key, ':prefix': SK.notifPrefix },
      })
    );
    const items = (res.Items ?? []) as Record<string, unknown>[];

    await Promise.all(
      items
        .filter((n) => n.read !== true)
        .map((n) =>
          ddb.send(
            new UpdateCommand({
              TableName: TABLE_NAME,
              Key: { pk: key, sk: n.sk },
              UpdateExpression: 'SET #read = :true',
              ExpressionAttributeNames: { '#read': 'read' },
              ExpressionAttributeValues: { ':true': true },
            })
          )
        )
    );

    const notifications = items.map(({ pk: _pk, sk: _sk, ...rest }) => ({ ...rest, read: true }));
    return ok({ notifications });
  } catch (err) {
    return errorResponse(err);
  }
}
