import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from './db';
import { generateDefaultRoadmap } from './roadmapTemplate';
import type { Roadmap } from './roadmapEngine';

// Lazily provisions a starter roadmap the first time a user's roadmap is needed (there's no
// onboarding wizard yet to let them pick one — see roadmapTemplate.ts). Called from GET
// /me/bundle and from every roadmap-mutating endpoint so none of them 400 on a brand-new account.
export async function ensureRoadmap(userId: string): Promise<Roadmap> {
  const key = pk(userId);
  const existing = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk: key, sk: SK.roadmap } }));
  if (existing.Item) {
    const { pk: _pk, sk: _sk, ...roadmap } = existing.Item;
    return roadmap as Roadmap;
  }

  const roadmap = generateDefaultRoadmap();
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { pk: key, sk: SK.roadmap, ...roadmap },
      ConditionExpression: 'attribute_not_exists(sk)', // avoid clobbering a concurrent first-write
    })
  ).catch(async (e) => {
    if (e?.name !== 'ConditionalCheckFailedException') throw e;
  });

  const fresh = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk: key, sk: SK.roadmap } }));
  const { pk: _pk, sk: _sk, ...saved } = fresh.Item!;
  return saved as Roadmap;
}

export async function saveRoadmap(userId: string, roadmap: Roadmap): Promise<void> {
  await ddb.send(
    new PutCommand({ TableName: TABLE_NAME, Item: { pk: pk(userId), sk: SK.roadmap, ...roadmap } })
  );
}
