import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from './db';

async function queryPrefix(userId: string, prefix: string): Promise<Record<string, unknown>[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': pk(userId), ':prefix': prefix },
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map(({ pk: _pk, sk: _sk, ...rest }) => rest);
}

// Newest-posted first, matching addRole() in src/api/recruiter.js's unshift().
export async function listRoles(userId: string): Promise<Record<string, unknown>[]> {
  const roles = await queryPrefix(userId, SK.rolePrefix);
  return roles.sort((a, b) => String(b.posted ?? '').localeCompare(String(a.posted ?? '')));
}

export async function listCandidates(userId: string): Promise<Record<string, unknown>[]> {
  return queryPrefix(userId, SK.candidatePrefix);
}
