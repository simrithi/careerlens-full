import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId, requireGroup } from '../common/auth';
import { ApiError, ok, errorResponse } from '../common/http';
import { listRoles, listCandidates } from '../common/recruiterStore';
import { scoreCandidate, stripPii, type Candidate, type Role } from '../common/candidateScoring';

// GET /recruiter/candidates?roleId= — company group only. Ranked candidates for one job
// posting, scored server-side (55% skill match / 35% best project alignment / 10% ATS — see
// candidateScoring.ts) with PII stripped for anyone not yet shortlisted. Both the scoring and
// the stripping happen here specifically so neither can be bypassed by reading client JS
// (see docs/api-contract.md's "Blind screening enforced server-side").
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    requireGroup(event, 'company');
    const roleId = event.queryStringParameters?.roleId;

    const [rolesRaw, candidatesRaw, shortlistItem] = await Promise.all([
      listRoles(userId),
      listCandidates(userId),
      ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk: pk(userId), sk: SK.shortlist } })),
    ]);
    const roles = rolesRaw as unknown as Role[];
    const candidates = candidatesRaw as unknown as Candidate[];

    const role = (roleId ? roles.find((r) => r.id === roleId) : roles[0]) as Role | undefined;
    if (!role) throw new ApiError(404, 'NOT_FOUND', 'No matching role posting');

    const shortlistIds: string[] = shortlistItem.Item?.ids ?? [];

    const ranked = candidates
      .map((cand) => {
        const short = shortlistIds.includes(cand.id);
        const { sm, best, total } = scoreCandidate(cand, role);
        return { cand: stripPii(cand, short), sm, best, total };
      })
      .sort((a, b) => b.total - a.total);

    return ok(ranked);
  } catch (err) {
    return errorResponse(err);
  }
}
