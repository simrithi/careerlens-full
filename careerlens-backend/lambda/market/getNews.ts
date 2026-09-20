import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ok, errorResponse } from '../common/http';
import { cached } from '../common/marketCache';
import { fetchHiringNews } from '../common/gnews';
import { MARKET_SK } from '../common/db';

// GET /market/news — real headlines from GNews's free tier, cached 30 min. Frontend falls back
// to local sample data if this errors.
export async function handler(): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const news = await cached(MARKET_SK.newsCache, fetchHiringNews);
    return ok(news);
  } catch (err) {
    return errorResponse(err);
  }
}
