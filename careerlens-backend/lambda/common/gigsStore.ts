import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, GIGS_PK, GIG_PREFIX } from './db';

export interface GigItem {
  id: string;
  companyId: string;
  company: string;
  title: string;
  skill: string;
  hours: number;
  reward: number;
  level: string;
  slots: number;
  applicantIds: string[];
  postedAt: string;
}

// Newest-first, matching how the old mock GIGS array read (top of list = most recently added).
export async function listGigs(): Promise<GigItem[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': GIGS_PK, ':prefix': GIG_PREFIX },
    })
  );
  const items = ((res.Items ?? []) as Record<string, unknown>[]).map(({ pk: _pk, sk: _sk, ...rest }) => rest as unknown as GigItem);
  return items.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

// Candidate-safe projection: never expose the raw applicant list to every browsing candidate
// (only the posting company gets that, via GET /recruiter/gigs/{id}/applicants), just how many
// slots are left.
export function toCandidateGig(g: GigItem) {
  const { applicantIds, companyId: _companyId, ...rest } = g;
  return { ...rest, slotsRemaining: Math.max(0, g.slots - applicantIds.length) };
}
