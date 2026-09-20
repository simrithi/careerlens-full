import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId, requireGroup } from '../common/auth';
import { ApiError, ok, errorResponse } from '../common/http';
import { listGigs } from '../common/gigsStore';

// GET /recruiter/gigs/{id}/applicants — company group only, and only the company that posted
// the gig (checked via companyId, same tenant-isolation principle as every other recruiter
// endpoint). Gigs are lighter-weight than role hiring, so applicants are shown in full — no
// blind-screening step like GET /recruiter/candidates.
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    requireGroup(event, 'company');
    const gigId = event.pathParameters?.id;
    if (!gigId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing gig id');

    const gigs = await listGigs();
    const gig = gigs.find((g) => g.id === gigId);
    if (!gig) throw new ApiError(404, 'NOT_FOUND', 'Gig not found');
    if (gig.companyId !== userId) throw new ApiError(403, 'FORBIDDEN', 'You did not post this gig');

    if (gig.applicantIds.length === 0) return ok([]);

    const res = await ddb.send(
      new BatchGetCommand({
        RequestItems: {
          [TABLE_NAME]: { Keys: gig.applicantIds.map((id) => ({ pk: pk(id), sk: SK.profile })) },
        },
      })
    );
    // Real display names live in Cognito, not this table (see auth-stack.ts) — resolving them
    // needs an AdminGetUser call this Lambda isn't yet granted for, so applicants surface by
    // profile headline only for now rather than fabricating a name. Follow-up, not a stand-in.
    const profiles = (res.Responses?.[TABLE_NAME] ?? []) as Record<string, unknown>[];
    const applicants = gig.applicantIds.map((id) => {
      const profile = profiles.find((p) => p.pk === pk(id));
      return { id, headline: (profile?.headline as string) || '' };
    });
    return ok(applicants);
  } catch (err) {
    return errorResponse(err);
  }
}
