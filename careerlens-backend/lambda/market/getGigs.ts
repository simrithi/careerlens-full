import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ok, errorResponse } from '../common/http';
import { listGigs, toCandidateGig } from '../common/gigsStore';

// GET /market/gigs — real, company-posted gigs (see market/postGig.ts). Any authenticated user
// can browse; the authorizer already requires a valid token, no group check needed here.
export async function handler(): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const gigs = await listGigs();
    return ok(gigs.map(toCandidateGig));
  } catch (err) {
    return errorResponse(err);
  }
}
