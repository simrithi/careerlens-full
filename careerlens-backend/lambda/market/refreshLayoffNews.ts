import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, MARKET_PK, MARKET_SK } from '../common/db';
import { fetchLayoffNews } from '../common/gnews';

// Triggered on a schedule by EventBridge (see lib/api-stack.ts's LayoffNewsRefreshRule) — this is
// the "EventBridge (news ingest)" piece referenced by the Layoff & Automation Shield feature card
// in src/data/features.js. Proactively refreshes the same DynamoDB cache item GET /market/layoffs
// reads via lambda/common/marketCache.ts's `cached()`, so a real visitor almost never waits on a
// live GNews call — the cache is kept warm on a timer instead of only refreshing lazily on request.
export async function handler(): Promise<void> {
  const data = await fetchLayoffNews();
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { pk: MARKET_PK, sk: MARKET_SK.layoffsCache, data, fetchedAt: new Date().toISOString() },
    })
  );
}
