import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { BatchWriteCommand, DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lambda/common/db';
import { handler as addApplication } from '../lambda/applications/addApplication';
import { handler as addBulk } from '../lambda/applications/addBulk';
import { handler as moveApplication } from '../lambda/applications/moveApplication';
import { handler as removeApplication } from '../lambda/applications/removeApplication';
import { fakeEvent } from './helpers';

process.env.TABLE_NAME = 'test-table';
const ddbMock = mockClient(ddb as unknown as DynamoDBDocumentClient);

beforeEach(() => ddbMock.reset());

describe('addApplication handler', () => {
  it('creates an item and returns the refreshed, sorted list', async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { pk: 'USER#u', sk: 'APP#2', id: '2', company: 'B', createdAt: '2026-01-02T00:00:00.000Z' },
        { pk: 'USER#u', sk: 'APP#1', id: '1', company: 'A', createdAt: '2026-01-01T00:00:00.000Z' },
      ],
    });

    const res = await addApplication(fakeEvent({ method: 'POST', path: '/applications', body: { company: 'B', role: 'SDE' } }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.map((a: { id: string }) => a.id)).toEqual(['2', '1']); // newest first
  });
});

describe('addBulk handler', () => {
  it('rejects an empty items array without touching DynamoDB', async () => {
    const res = await addBulk(fakeEvent({ method: 'POST', path: '/applications/bulk', body: { items: [] } }));
    expect(res.statusCode).toBe(400);
    expect(ddbMock.calls()).toHaveLength(0);
  });

  it('rejects more than 50 items', async () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ company: `C${i}` }));
    const res = await addBulk(fakeEvent({ method: 'POST', path: '/applications/bulk', body: { items } }));
    expect(res.statusCode).toBe(400);
  });

  it('batch-writes items in chunks of 25', async () => {
    ddbMock.on(BatchWriteCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    const items = Array.from({ length: 30 }, (_, i) => ({ company: `C${i}`, role: 'SDE' }));

    const res = await addBulk(fakeEvent({ method: 'POST', path: '/applications/bulk', body: { items } }));

    expect(res.statusCode).toBe(200);
    const batchCalls = ddbMock.commandCalls(BatchWriteCommand);
    expect(batchCalls).toHaveLength(2); // 25 + 5
  });
});

describe('moveApplication handler', () => {
  it('sets status and an interview date, without overwriting an existing one', async () => {
    ddbMock.on(UpdateCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const res = await moveApplication(
      fakeEvent({ method: 'PATCH', path: '/applications/a1', pathParameters: { id: 'a1' }, body: { status: 'INTERVIEW' } })
    );

    expect(res.statusCode).toBe(200);
    const update = ddbMock.commandCalls(UpdateCommand)[0].args[0].input;
    expect(update.UpdateExpression).toContain('if_not_exists(#interviewDate, :interviewDate)');
  });

  it('returns 404 for an application that does not exist', async () => {
    ddbMock.on(UpdateCommand).rejects({ name: 'ConditionalCheckFailedException' });

    const res = await moveApplication(
      fakeEvent({ method: 'PATCH', path: '/applications/nope', pathParameters: { id: 'nope' }, body: { status: 'REJECTED' } })
    );

    expect(res.statusCode).toBe(404);
  });
});

describe('removeApplication handler', () => {
  it('deletes and returns the refreshed list', async () => {
    ddbMock.on(DeleteCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const res = await removeApplication(fakeEvent({ method: 'DELETE', path: '/applications/a1', pathParameters: { id: 'a1' } }));

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual([]);
  });
});
