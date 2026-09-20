import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK, GIGS_PK, gigSk } from '../common/db';
import { requireUserId, requireGroup } from '../common/auth';
import { ApiError, ok, errorResponse, parseJsonBody } from '../common/http';
import { listGigs, toCandidateGig } from '../common/gigsStore';

interface PostGigBody {
  title?: string;
  skill?: string;
  hours?: number;
  reward?: number;
  level?: string;
  slots?: number;
}

// POST /market/gigs — company group only. Response: every open gig (candidate-safe shape), same
// idiom as POST /recruiter/roles returning the refreshed roles list.
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    requireGroup(event, 'company');
    const body = parseJsonBody(event.body) as PostGigBody;
    if (!body.title || !body.skill) throw new ApiError(400, 'VALIDATION_ERROR', 'title and skill are required');

    const companyItem = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk: pk(userId), sk: SK.company } }));
    const companyName = (companyItem.Item?.name as string) || 'Unknown company';

    const id = randomUUID();
    const postedAt = new Date().toISOString();
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: GIGS_PK,
          sk: gigSk(postedAt, id),
          id,
          companyId: userId,
          company: companyName,
          title: body.title,
          skill: body.skill,
          hours: Number(body.hours) || 0,
          reward: Number(body.reward) || 0,
          level: body.level || 'Beginner',
          slots: Math.max(1, Number(body.slots) || 1),
          applicantIds: [],
          postedAt,
        },
      })
    );

    const gigs = await listGigs();
    return ok(gigs.map(toCandidateGig));
  } catch (err) {
    return errorResponse(err);
  }
}
