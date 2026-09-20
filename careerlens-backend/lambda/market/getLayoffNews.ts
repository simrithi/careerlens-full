import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ok, errorResponse } from '../common/http';
import { cached } from '../common/marketCache';
import { fetchLayoffNews } from '../common/gnews';
import { MARKET_SK } from '../common/db';

// GET /market/layoffs — real layoff-related headlines from GNews, cached 30 min. Deliberately
// headlines only, no structured "N employees, X% of staff" figures — there's no public dataset
// for that, and attaching invented numbers to real company names would misrepresent them.
export async function handler(): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const news = await cached(MARKET_SK.layoffsCache, fetchLayoffNews);
    return ok(news);
  } catch (err) {
    return errorResponse(err);
  }
}
