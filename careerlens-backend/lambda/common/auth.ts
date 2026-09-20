import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { ApiError } from './http';

// userId (Cognito `sub`) is always taken from the verified JWT claims that API Gateway's
// JWT authorizer attaches to the event — never from the request body or path, so a caller
// can never act on another user's data by forging an id in the payload.
export function requireUserId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const sub = event.requestContext.authorizer?.jwt?.claims?.sub;
  if (!sub || typeof sub !== 'string') {
    throw new ApiError(401, 'UNAUTHORIZED', 'Missing or invalid identity token');
  }
  return sub;
}

// HTTP API's JWT authorizer stringifies an array-valued claim like cognito:groups as
// "[company]" or "[company, other]" (square brackets, comma-space separated) rather than a
// clean CSV — so a naive raw.split(',') never matches (e.g. "[company]" !== "company"). Strip
// the brackets before splitting.
export function getGroups(event: APIGatewayProxyEventV2WithJWTAuthorizer): string[] {
  const raw = event.requestContext.authorizer?.jwt?.claims?.['cognito:groups'];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  return raw.replace(/^\[|\]$/g, '').split(',').map((g) => g.trim()).filter(Boolean);
}

export function requireGroup(event: APIGatewayProxyEventV2WithJWTAuthorizer, group: string): void {
  if (!getGroups(event).includes(group)) {
    throw new ApiError(403, 'FORBIDDEN', `Requires the "${group}" group`);
  }
}
