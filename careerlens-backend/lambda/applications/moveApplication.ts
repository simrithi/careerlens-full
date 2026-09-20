import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId } from '../common/auth';
import { ApiError, ok, errorResponse, parseJsonBody } from '../common/http';
import { listApplications } from '../common/applicationsStore';

// PATCH /applications/{id} — moves to a new status; sets interviewDate on first move to INTERVIEW
// (matches moveApplication() in src/api/applications.js).
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const id = event.pathParameters?.id;
    if (!id) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing application id');
    const { status } = parseJsonBody(event.body) as { status?: string };
    if (!status) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing status');
    const key = pk(userId);

    const names: Record<string, string> = { '#status': 'status' };
    const values: Record<string, unknown> = { ':status': status };
    let setExpr = 'SET #status = :status';
    if (status === 'INTERVIEW') {
      const interviewDate = new Date();
      interviewDate.setDate(interviewDate.getDate() + 4);
      names['#interviewDate'] = 'interviewDate';
      values[':interviewDate'] = interviewDate.toISOString().slice(0, 10);
      // if_not_exists so an existing interviewDate is never overwritten
      setExpr += ', #interviewDate = if_not_exists(#interviewDate, :interviewDate)';
    }

    await ddb
      .send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { pk: key, sk: SK.application(id) },
          UpdateExpression: setExpr,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ConditionExpression: 'attribute_exists(sk)',
        })
      )
      .catch((e) => {
        if (e?.name === 'ConditionalCheckFailedException') throw new ApiError(404, 'NOT_FOUND', `Application ${id} not found`);
        throw e;
      });

    return ok(await listApplications(userId));
  } catch (err) {
    return errorResponse(err);
  }
}
