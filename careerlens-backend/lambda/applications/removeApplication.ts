import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId } from '../common/auth';
import { ApiError, ok, errorResponse } from '../common/http';
import { listApplications } from '../common/applicationsStore';

// DELETE /applications/{id}
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const id = event.pathParameters?.id;
    if (!id) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing application id');

    await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: pk(userId), sk: SK.application(id) } }));
    return ok(await listApplications(userId));
  } catch (err) {
    return errorResponse(err);
  }
}
