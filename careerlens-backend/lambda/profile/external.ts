import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId } from '../common/auth';
import { ok, errorResponse, parseJsonBody } from '../common/http';
import { ExternalPatchSchema, ExternalPlatformSchema, parse } from '../common/schema';

// PUT /profile/external/{platform} — manual entry today; GitHub/Codeforces importers (prompt A9)
// PUT the same item shape from a scheduled Lambda instead of the browser. Stored as its own item
// (not nested in PROFILE) so an importer can update one platform without a read-modify-write race
// against whatever else is touching the profile.
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const platform = parse(ExternalPlatformSchema, event.pathParameters?.platform);
    const data = parse(ExternalPatchSchema, parseJsonBody(event.body));
    const entries = Object.entries(data).filter(([k]) => k !== 'pk' && k !== 'sk');

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
        Key: { pk: pk(userId), sk: SK.external(platform) },
        UpdateExpression: sets.length ? `SET ${sets.join(', ')}` : 'SET platform = :platform',
        ExpressionAttributeNames: sets.length ? names : undefined,
        ExpressionAttributeValues: sets.length ? values : { ':platform': platform },
        ReturnValues: 'ALL_NEW',
      })
    );

    const { pk: _pk, sk: _sk, ...external } = res.Attributes ?? {};
    return ok({ [platform]: external });
  } catch (err) {
    return errorResponse(err);
  }
}
