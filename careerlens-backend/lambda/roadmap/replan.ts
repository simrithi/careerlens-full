import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { requireUserId } from '../common/auth';
import { ok, errorResponse } from '../common/http';
import { ensureRoadmap, saveRoadmap } from '../common/roadmapStore';
import { replanRoadmap } from '../common/roadmapEngine';
import { generateJson } from '../common/gemini';

const NOTE_SCHEMA = { type: 'OBJECT', properties: { note: { type: 'STRING' } }, required: ['note'] };

// Pace, dates and progress stay code-computed (see docs/api-contract.md) — only this short
// rationale line is Gemini-written. Best-effort: if the AI call fails, aiNote is simply omitted
// and the re-plan still fully succeeds, since the deterministic part never depended on it.
async function generateNote(roleTitle: string, moved: number): Promise<string | undefined> {
  try {
    const prompt = `A student's career roadmap for becoming a "${roleTitle}" just got re-planned because ${moved} milestone${moved === 1 ? ' was' : 's were'} overdue. Write one encouraging, specific sentence (max 25 words) explaining what changed and motivating them to keep going. No generic platitudes — reference the actual number moved.`;
    const result = await generateJson<{ note: string }>(prompt, NOTE_SCHEMA);
    return result.note?.trim() || undefined;
  } catch (err) {
    console.error('generateNote failed, omitting aiNote:', err);
    return undefined;
  }
}

// POST /roadmap/replan — deterministic math (shift overdue work + catch-up buffer, ported
// verbatim from engine.js) plus a best-effort Gemini-written rationale note.
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const current = await ensureRoadmap(userId);
    const { roadmap, moved } = replanRoadmap(current);
    await saveRoadmap(userId, roadmap);
    const roleTitle = (current as { goal?: { roleId?: string } }).goal?.roleId || 'their target role';
    const aiNote = await generateNote(roleTitle, moved);
    return ok({ roadmap, lastReplan: { moved, at: new Date().toISOString().slice(0, 10), aiNote } });
  } catch (err) {
    return errorResponse(err);
  }
}
