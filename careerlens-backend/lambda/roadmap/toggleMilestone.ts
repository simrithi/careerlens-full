import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { requireUserId } from '../common/auth';
import { ApiError, ok, errorResponse } from '../common/http';
import { ensureRoadmap, saveRoadmap } from '../common/roadmapStore';

// PATCH /roadmap/milestones/{id}
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const milestoneId = event.pathParameters?.id;
    if (!milestoneId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing milestone id');

    const roadmap = await ensureRoadmap(userId);
    const today = new Date().toISOString().slice(0, 10);
    let found = false;
    roadmap.phases.forEach((p) =>
      p.milestones.forEach((m) => {
        if (m.id === milestoneId) {
          found = true;
          m.done = !m.done;
          m.doneAt = m.done ? today : null;
        }
      })
    );
    if (!found) throw new ApiError(404, 'NOT_FOUND', `Milestone ${milestoneId} not found`);

    await saveRoadmap(userId, roadmap);
    return ok(roadmap);
  } catch (err) {
    return errorResponse(err);
  }
}
