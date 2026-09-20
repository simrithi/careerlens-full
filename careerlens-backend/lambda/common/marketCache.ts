import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, MARKET_PK } from './db';

const TTL_MS = 30 * 60 * 1000; // 30 minutes — keeps us well inside free-tier daily API quotas
// regardless of visitor traffic, since every request within the window is served from cache.

interface CacheItem<T> {
  data: T;
  fetchedAt: string;
}

// Lazy cache-on-read: serves a fresh external-API result at most once per TTL_MS, otherwise
// returns what's in DynamoDB. If a fresh fetch fails, serves stale cache when there is any
// (better than nothing) and only lets the error propagate when the cache is completely empty —
// callers (frontend) fall back to local sample data in that case.
export async function cached<T>(sk: string, fetchFresh: () => Promise<T>): Promise<T> {
  const existing = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk: MARKET_PK, sk } }));
  const item = existing.Item as CacheItem<T> | undefined;
  const isFresh = item && Date.now() - new Date(item.fetchedAt).getTime() < TTL_MS;
  if (isFresh) return item.data;

  try {
    const data = await fetchFresh();
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: { pk: MARKET_PK, sk, data, fetchedAt: new Date().toISOString() } }));
    return data;
  } catch (err) {
    if (item) return item.data; // stale is better than none
    throw err;
  }
}
