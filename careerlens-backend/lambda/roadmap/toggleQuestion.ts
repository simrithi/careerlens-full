import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId } from '../common/auth';
import { ApiError, ok, errorResponse } from '../common/http';

interface SolvedEntry {
  id: string;
  solvedAt: string;
}

// PATCH /roadmap/questions/{qid}/toggle -> solvedQuestions slice (array of question ids).
// Stored with a solvedAt timestamp per entry (not just the id) so weekly solve-counts in
// GET /me/bundle's history can be computed for real — see lambda/common/readiness.ts.
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    const qid = event.pathParameters?.qid;
    if (!qid) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing question id');
    const key = pk(userId);

    const existing = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk: key, sk: SK.questions } }));
    // Normalize legacy plain-string entries (pre-timestamp format) on first touch.
    const raw = (existing.Item?.solved as (string | SolvedEntry)[]) ?? [];
    const solved: SolvedEntry[] = raw.map((s) => (typeof s === 'string' ? { id: s, solvedAt: new Date(0).toISOString() } : s));
    const next = solved.some((s) => s.id === qid)
      ? solved.filter((s) => s.id !== qid)
      : [...solved, { id: qid, solvedAt: new Date().toISOString() }];

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: { pk: key, sk: SK.questions, solved: next } }));
    return ok(next.map((s) => s.id));
  } catch (err) {
    return errorResponse(err);
  }
}
