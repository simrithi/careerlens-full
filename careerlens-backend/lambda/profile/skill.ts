import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { DeleteCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId } from '../common/auth';
import { ApiError, ok, errorResponse, parseJsonBody } from '../common/http';
import { SkillSchema, parse } from '../common/schema';

// PUT /profile/skills/{name} and DELETE /profile/skills/{name} — both return the full,
// re-sorted `profile.skills` list, matching upsertSkill()/removeSkill() in src/api/profile.js.
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const name = event.pathParameters?.name;
    if (!name) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing skill name');
    const key = pk(userId);
    const method = event.requestContext.http.method;

    if (method === 'PUT') {
      const body = parseJsonBody(event.body) as Record<string, unknown>;
      const skill = parse(SkillSchema, { ...body, name });
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          // SkillSchema is .passthrough(), so `skill` can legally contain a pk/sk of the
          // caller's choosing — server-controlled keys must go last, not first.
          Item: { verified: false, ...skill, pk: key, sk: SK.skill(name), name },
        })
      );
    } else if (method === 'DELETE') {
      await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: key, sk: SK.skill(name) } }));
    } else {
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', `${method} not supported`);
    }

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': key, ':prefix': SK.skillPrefix },
      })
    );
    const skills = (res.Items ?? []).map(({ pk: _pk, sk: _sk, ...rest }) => rest);
    return ok(skills);
  } catch (err) {
    return errorResponse(err);
  }
}
