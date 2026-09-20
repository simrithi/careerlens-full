import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lambda/common/db';
import { handler } from '../lambda/profile/sectionItem';
import { fakeEvent } from './helpers';

process.env.TABLE_NAME = 'test-table';
const ddbMock = mockClient(ddb as unknown as DynamoDBDocumentClient);

beforeEach(() => ddbMock.reset());

describe('profile section item handler', () => {
  it('POST creates an item and returns the refreshed section list', async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({
      Items: [{ pk: 'USER#user-1', sk: 'PROJ#abc', id: 'abc', name: 'Img2Asset' }],
    });

    const res = await handler(
      fakeEvent({ method: 'POST', path: '/profile/projects', pathParameters: { section: 'projects' }, body: { name: 'Img2Asset' } })
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual([{ id: 'abc', name: 'Img2Asset' }]);
  });

  it('DELETE on an unknown id still returns 200 with the current list (delete is idempotent)', async () => {
    ddbMock.on(DeleteCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const res = await handler(
      fakeEvent({ method: 'DELETE', path: '/profile/projects/nope', pathParameters: { section: 'projects', id: 'nope' } })
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual([]);
  });

  it('PATCH on a missing item returns 404', async () => {
    ddbMock.on(UpdateCommand).rejects({ name: 'ConditionalCheckFailedException' });

    const res = await handler(
      fakeEvent({ method: 'PATCH', path: '/profile/projects/nope', pathParameters: { section: 'projects', id: 'nope' }, body: { name: 'x' } })
    );

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body as string).error.code).toBe('NOT_FOUND');
  });

  it('rejects an unknown section with a 400 before touching DynamoDB', async () => {
    const res = await handler(
      fakeEvent({ method: 'POST', path: '/profile/hobbies', pathParameters: { section: 'hobbies' }, body: {} })
    );

    expect(res.statusCode).toBe(400);
    expect(ddbMock.calls()).toHaveLength(0);
  });
});
