import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ok, errorResponse } from '../common/http';
import { cached } from '../common/marketCache';
import { fetchAdzunaJobs } from '../common/adzuna';
import { MARKET_SK } from '../common/db';

// GET /market/jobs — real listings from Adzuna, cached in DynamoDB for 30 min so we stay well
// inside the free-tier daily quota regardless of visitor count. Frontend falls back to local
// sample data if this errors (e.g. cache empty and Adzuna unreachable).
export async function handler(): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const jobs = await cached(MARKET_SK.jobsCache, fetchAdzunaJobs);
    return ok(jobs);
  } catch (err) {
    return errorResponse(err);
  }
}
