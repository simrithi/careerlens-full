import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { requireUserId } from '../common/auth';
import { ok, errorResponse, parseJsonBody } from '../common/http';
import { ensureRoadmap, saveRoadmap } from '../common/roadmapStore';

// PATCH /roadmap/goal — patches goal fields only (roleId/title/company/months/deadline); does
// NOT regenerate phases, matching the same limitation setGoal() has in src/api/roadmap.js today.
// Returns the full roadmap (not just the goal slice) since this may be the first roadmap call a
// brand-new account makes and the frontend's bundle cache needs phases too either way.
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const patch = parseJsonBody(event.body) as Record<string, unknown>;

    const roadmap = await ensureRoadmap(userId);
    roadmap.goal = { ...roadmap.goal, ...patch } as typeof roadmap.goal;
    await saveRoadmap(userId, roadmap);
    return ok(roadmap);
  } catch (err) {
    return errorResponse(err);
  }
}
