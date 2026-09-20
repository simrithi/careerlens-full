import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { requireUserId } from '../common/auth';
import { ok, errorResponse, parseJsonBody } from '../common/http';
import { ensureRoadmap, saveRoadmap } from '../common/roadmapStore';

// POST /gigs/{id}/accept -> adds an Experience milestone to the roadmap (ported from
// acceptGig() in src/api/features.js).
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const gig = parseJsonBody(event.body) as { id: string; title: string; hours: number };

    const roadmap = await ensureRoadmap(userId);
    const phase = roadmap.phases.find((p) => p.name === 'Experience') || roadmap.phases[roadmap.phases.length - 1];
    const already = phase.milestones.some((m) => (m as { gigId?: string }).gigId === gig.id);
    if (!already) {
      const due = new Date();
      due.setDate(due.getDate() + 14);
      phase.milestones.push({
        id: randomUUID(),
        title: `Gig: ${gig.title}`,
        type: 'experience',
        hours: gig.hours,
        due: due.toISOString().slice(0, 10),
        done: false,
        doneAt: null,
        gigId: gig.id,
      } as (typeof phase.milestones)[number]);
      await saveRoadmap(userId, roadmap);
    }

    return ok(roadmap);
  } catch (err) {
    return errorResponse(err);
  }
}
