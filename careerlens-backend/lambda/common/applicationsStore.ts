import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from './db';

// Applications are stored one-item-per-application (SK=APP#{id}) rather than as a single blob,
// since each is added/moved/removed independently. DynamoDB doesn't preserve insertion order
// under a prefix Query, so we sort by createdAt here — mirrors the mock's unshift() (newest first).
export async function listApplications(userId: string): Promise<Record<string, unknown>[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': pk(userId), ':prefix': SK.applicationPrefix },
    })
  );
  const items = (res.Items ?? []) as Record<string, unknown>[];
  return items
    .map(({ pk: _pk, sk: _sk, ...rest }) => rest)
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
}
