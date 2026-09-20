import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK, GIGS_PK, gigSk } from '../common/db';
import { requireUserId, getGroups } from '../common/auth';
import { ApiError, ok, errorResponse } from '../common/http';
import { listGigs, toCandidateGig } from '../common/gigsStore';

// POST /market/gigs/{id}/apply — any authenticated candidate. Company accounts are blocked here
// (the frontend already hides the Accept button for them; this is the server-side backstop).
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    if (getGroups(event).includes('company')) throw new ApiError(403, 'FORBIDDEN', 'Company accounts cannot apply to gigs');

    const gigId = event.pathParameters?.id;
    if (!gigId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing gig id');

    const gigs = await listGigs();
    const gig = gigs.find((g) => g.id === gigId);
    if (!gig) throw new ApiError(404, 'NOT_FOUND', 'Gig not found');

    if (!gig.applicantIds.includes(userId)) {
      if (gig.slots - gig.applicantIds.length <= 0) throw new ApiError(409, 'CONFLICT', 'No slots remaining');
      const nextApplicantIds = [...gig.applicantIds, userId];
      await ddb.send(
        new PutCommand({ TableName: TABLE_NAME, Item: { pk: GIGS_PK, sk: gigSk(gig.postedAt, gig.id), ...gig, applicantIds: nextApplicantIds } })
      );
      gig.applicantIds = nextApplicantIds;

      const applied = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk: pk(userId), sk: SK.appliedGigs } }));
      const ids: string[] = applied.Item?.ids ?? [];
      if (!ids.includes(gigId)) {
        await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: { pk: pk(userId), sk: SK.appliedGigs, ids: [...ids, gigId] } }));
      }
    }

    return ok(toCandidateGig(gig));
  } catch (err) {
    return errorResponse(err);
  }
}
