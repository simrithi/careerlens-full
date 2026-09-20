import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { requireUserId } from '../common/auth';
import { ApiError, ok, errorResponse, parseJsonBody } from '../common/http';
import { generateJson, clampScore } from '../common/gemini';

interface ScoreBody {
  question?: string;
  roleTitle?: string;
  answer?: string;
}

interface ScoreResult {
  overall: number;
  relevance: number;
  depth: number;
  structure: number;
  clarity: number;
  hits: string[];
  misses: string[];
  feedback: string[];
}

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    overall: { type: 'INTEGER' },
    relevance: { type: 'INTEGER' },
    depth: { type: 'INTEGER' },
    structure: { type: 'INTEGER' },
    clarity: { type: 'INTEGER' },
    hits: { type: 'ARRAY', items: { type: 'STRING' } },
    misses: { type: 'ARRAY', items: { type: 'STRING' } },
    feedback: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['overall', 'relevance', 'depth', 'structure', 'clarity', 'hits', 'misses', 'feedback'],
};

// POST /interview/score-answer — replaces the client-side keyword-matching evaluateAnswer() with
// real rubric scoring from Gemini. The frontend falls back to the local heuristic if this errors,
// so failures here should just propagate as a 5xx rather than trying to fake a result.
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    requireUserId(event); // auth check only — this endpoint doesn't touch DynamoDB
    const body = parseJsonBody(event.body) as ScoreBody;
    if (!body.question || !body.answer) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing question or answer');

    const prompt = `You are an interviewer scoring a candidate's spoken answer for a ${body.roleTitle || 'software engineering'} interview.

Question: "${body.question}"
Candidate's answer: "${body.answer}"

Score the answer 0-100 on each of: relevance (did they answer the actual question and cover the core concepts?), depth (enough technical detail and examples, not just surface-level?), structure (clear flow, e.g. first/then/because, not rambling?), clarity (concise and easy to follow?). Set "overall" as a holistic score, not necessarily the average.
List "hits": short phrases naming concepts the answer correctly covered (empty array if none).
List "misses": short phrases naming important concepts the answer should have covered but didn't (up to 5).
List "feedback": 2-4 short, specific, actionable coaching tips for improving this exact answer.
Be an honest, moderately strict interviewer — a vague or generic answer should not score above 60.`;

    const result = await generateJson<ScoreResult>(prompt, SCHEMA);
    return ok({
      overall: clampScore(result.overall),
      relevance: clampScore(result.relevance),
      depth: clampScore(result.depth),
      structure: clampScore(result.structure),
      clarity: clampScore(result.clarity),
      hits: Array.isArray(result.hits) ? result.hits.slice(0, 8) : [],
      misses: Array.isArray(result.misses) ? result.misses.slice(0, 5) : [],
      feedback: Array.isArray(result.feedback) ? result.feedback.slice(0, 4) : [],
    });
  } catch (err) {
    return errorResponse(err);
  }
}
