import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId } from '../common/auth';
import { ApiError, ok, errorResponse, parseJsonBody } from '../common/http';
import { ProfileItemSchema, ProfileSectionSchema, parse } from '../common/schema';

// Handles all three /profile/{section}[/​{id}] routes (POST, PATCH, DELETE) — one Lambda per
// resource rather than per HTTP verb, since they share the same section-list re-fetch afterward.
// section ∈ education | experience | certifications | projects (see docs/openapi.yaml).
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const section = parse(ProfileSectionSchema, event.pathParameters?.section);
    const id = event.pathParameters?.id;
    const key = pk(userId);
    const method = event.requestContext.http.method;

    if (method === 'POST') {
      const item = parse(ProfileItemSchema, parseJsonBody(event.body));
      const newId = randomUUID();
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          // ProfileItemSchema is z.object({}).passthrough(), so `item` can legally contain a
          // pk/sk of the caller's choosing — server-controlled keys must go last, not first.
          Item: { ...item, pk: key, sk: SK.section(section, newId), id: newId },
        })
      );
    } else if (method === 'PATCH') {
      if (!id) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing id');
      const patch = parse(ProfileItemSchema, parseJsonBody(event.body));
      const entries = Object.entries(patch).filter(([k]) => k !== 'pk' && k !== 'sk' && k !== 'id');
      if (entries.length > 0) {
        const names: Record<string, string> = {};
        const values: Record<string, unknown> = {};
        const sets = entries.map(([k, v], i) => {
          names[`#f${i}`] = k;
          values[`:v${i}`] = v;
          return `#f${i} = :v${i}`;
        });
        await ddb.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: key, sk: SK.section(section, id) },
            UpdateExpression: `SET ${sets.join(', ')}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
            ConditionExpression: 'attribute_exists(sk)',
          })
        ).catch((e) => {
          if (e?.name === 'ConditionalCheckFailedException') {
            throw new ApiError(404, 'NOT_FOUND', `${section} item ${id} not found`);
          }
          throw e;
        });
      }
    } else if (method === 'DELETE') {
      if (!id) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing id');
      await ddb.send(
        new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: key, sk: SK.section(section, id) } })
      );
    } else {
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', `${method} not supported`);
    }

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': key, ':prefix': SK.sectionPrefixOf(section) },
      })
    );
    const list = (res.Items ?? []).map(({ pk: _pk, sk: _sk, ...rest }) => rest);
    return ok(list);
  } catch (err) {
    return errorResponse(err);
  }
}
