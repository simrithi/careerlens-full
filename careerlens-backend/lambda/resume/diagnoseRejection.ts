import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { requireUserId } from '../common/auth';
import { ApiError, ok, errorResponse, parseJsonBody } from '../common/http';
import { generateJson } from '../common/gemini';

interface MissingSkill {
  name: string;
  have: number;
  need: number;
}

interface DiagnoseBody {
  roleTitle?: string;
  atsScore?: number;
  matchScore?: number;
  missingSkills?: MissingSkill[];
  projects?: { name: string; tech: string[] }[];
  experienceCount?: number;
  leetcodeSolved?: number;
}

interface Reason {
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  fix: string;
}

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    reasons: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          severity: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          title: { type: 'STRING' },
          detail: { type: 'STRING' },
          fix: { type: 'STRING' },
        },
        required: ['severity', 'title', 'detail', 'fix'],
      },
    },
  },
  required: ['reasons'],
};

// POST /resume/diagnose — the deterministic ATS checklist (checks/score) stays client-side
// (those are rule-based facts, not something an LLM should be guessing at), but the "why might
// I get rejected" reasons are now written by Gemini, personalized to the candidate's actual
// projects/skills instead of generic templates. Frontend falls back to the local template
// version (rejectionDiagnosis in engine.js) if this call fails.
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    requireUserId(event);
    const body = parseJsonBody(event.body) as DiagnoseBody;
    if (!body.roleTitle) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing roleTitle');

    const missing = (body.missingSkills || []).map((s) => `${s.name} (candidate at ${s.have}%, role needs ${s.need}%)`).join('; ') || 'none';
    const projects = (body.projects || []).map((p) => `${p.name} [${(p.tech || []).join(', ')}]`).join('; ') || 'none listed';

    const prompt = `You are a hiring manager reviewing a candidate's profile for a "${body.roleTitle}" role and explaining, honestly, why they might get screened out — never claim a probability of being hired, only likely gaps.

Candidate facts:
- Resume ATS readiness score: ${body.atsScore ?? 'unknown'}/100
- Overall skill match for this role: ${body.matchScore ?? 'unknown'}%
- Skill gaps: ${missing}
- Projects on file: ${projects}
- Experience entries: ${body.experienceCount ?? 0}
- LeetCode problems solved: ${body.leetcodeSolved ?? 0}

Write 3-6 specific rejection-risk reasons. Reference the candidate's ACTUAL project names and skill names from the facts above wherever relevant — do not write generic advice that could apply to anyone. Each reason needs a severity (high/medium/low), a short title, a one-sentence detail explaining the gap using the specific facts given, and a concrete, actionable fix.`;

    const result = await generateJson<{ reasons: Reason[] }>(prompt, SCHEMA);
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const reasons = (Array.isArray(result.reasons) ? result.reasons : [])
      .filter((r) => r && r.title && r.detail && r.fix)
      .sort((a, b) => (order[a.severity] ?? 1) - (order[b.severity] ?? 1))
      .slice(0, 6);

    return ok({ reasons });
  } catch (err) {
    return errorResponse(err);
  }
}
