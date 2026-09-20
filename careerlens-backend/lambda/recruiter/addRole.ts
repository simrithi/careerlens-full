import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { requireUserId, requireGroup } from '../common/auth';
import { ApiError, ok, errorResponse, parseJsonBody } from '../common/http';
import { listRoles } from '../common/recruiterStore';

interface AddRoleBody {
  title?: string;
  roleId?: string;
  openings?: number;
  domains?: unknown[];
  skills?: unknown[];
}

// POST /recruiter/roles — company group only. Response: company.roles slice.
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = requireUserId(event);
    requireGroup(event, 'company');
    const body = parseJsonBody(event.body) as AddRoleBody;
    if (!body.title) throw new ApiError(400, 'VALIDATION_ERROR', 'title is required');

    const id = randomUUID();
    const now = new Date().toISOString();

    // Build the Item from explicit named fields only — never spread the raw body onto it (that
    // previously let a caller pass pk/sk in the request and overwrite an arbitrary item anywhere
    // in the single-table design, not just their own role).
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: pk(userId),
          sk: SK.role(id),
          id,
          title: body.title,
          roleId: typeof body.roleId === 'string' ? body.roleId : undefined,
          applicants: 0,
          openings: Math.max(1, Number(body.openings) || 1),
          domains: Array.isArray(body.domains) ? body.domains : [],
          skills: Array.isArray(body.skills) ? body.skills : [],
          posted: now.slice(0, 10),
        },
      })
    );

    return ok(await listRoles(userId));
  } catch (err) {
    return errorResponse(err);
  }
}
