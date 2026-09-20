import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId } from '../common/auth';
import { ok, errorResponse, parseJsonBody } from '../common/http';
import { ProfilePatchSchema, parse } from '../common/schema';

// PATCH /profile — partial update of top-level profile fields (headline, about, location, ...).
// Returns the `profile` slice: just these fields, not skills/education/etc (those live under
// their own SKs and are returned by GET /me/bundle or their own endpoints).
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const patch = parse(ProfilePatchSchema, parseJsonBody(event.body));
    const entries = Object.entries(patch).filter(([k]) => k !== 'pk' && k !== 'sk');

    if (entries.length === 0) return ok({});

    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};
    const sets = entries.map(([k, v], i) => {
      names[`#f${i}`] = k;
      values[`:v${i}`] = v;
      return `#f${i} = :v${i}`;
    });

    const res = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: pk(userId), sk: SK.profile },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      })
    );

    const { pk: _pk, sk: _sk, ...profile } = res.Attributes ?? {};
    return ok(profile);
  } catch (err) {
    return errorResponse(err);
  }
}
