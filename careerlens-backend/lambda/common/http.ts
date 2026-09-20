import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export class ApiError extends Error {
  constructor(public statusCode: number, public code: string, message: string) {
    super(message);
  }
}

export function ok(body: unknown, statusCode = 200): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function errorResponse(err: unknown): APIGatewayProxyStructuredResultV2 {
  if (err instanceof ApiError) {
    return {
      statusCode: err.statusCode,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: err.code, message: err.message } }),
    };
  }
  console.error(err);
  return {
    statusCode: 500,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }),
  };
}

export function parseJsonBody(raw: string | undefined): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Request body must be valid JSON');
  }
}
