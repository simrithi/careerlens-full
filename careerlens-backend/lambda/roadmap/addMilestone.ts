import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { requireUserId } from '../common/auth';
import { ok, errorResponse, parseJsonBody } from '../common/http';
import { ensureRoadmap, saveRoadmap } from '../common/roadmapStore';

// POST /roadmap/phases/{phaseId}/milestones — falls back to the first phase if phaseId doesn't
// match, same as addMilestone() in src/api/roadmap.js.
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const phaseId = event.pathParameters?.phaseId;
    const body = parseJsonBody(event.body) as Record<string, unknown>;

    const roadmap = await ensureRoadmap(userId);
    const phase = roadmap.phases.find((p) => p.id === phaseId) || roadmap.phases[0];
    const due = new Date();
    due.setDate(due.getDate() + 21);
    phase.milestones.push({
      id: randomUUID(),
      done: false,
      doneAt: null,
      hours: 10,
      type: 'learn',
      due: due.toISOString().slice(0, 10),
      title: 'New milestone',
      ...body,
    } as (typeof roadmap.phases)[number]['milestones'][number]);

    await saveRoadmap(userId, roadmap);
    return ok(roadmap);
  } catch (err) {
    return errorResponse(err);
  }
}
