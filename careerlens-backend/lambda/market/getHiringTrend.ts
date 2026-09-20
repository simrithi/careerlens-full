import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ok, errorResponse } from '../common/http';
import { getHiringTrendSeries } from '../common/hiringTrend';

// GET /market/hiring-trend — real Adzuna-derived series (see common/hiringTrend.ts for how it's
// built and why it accumulates over time instead of faking history). Frontend falls back to
// local sample data if this errors.
export async function handler(): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    return ok(await getHiringTrendSeries());
  } catch (err) {
    return errorResponse(err);
  }
}
