import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lambda/common/db';
import { handler as saveInterview } from '../lambda/interview/saveInterview';
import { handler as toggleSavedJob } from '../lambda/market/toggleSavedJob';
import { handler as toggleVote } from '../lambda/features/toggleVote';
import { handler as acceptGig } from '../lambda/features/acceptGig';
import { fakeEvent } from './helpers';

process.env.TABLE_NAME = 'test-table';
const ddbMock = mockClient(ddb as unknown as DynamoDBDocumentClient);

beforeEach(() => ddbMock.reset());

describe('saveInterview handler', () => {
  it('persists a session and returns the refreshed list', async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({ Items: [{ pk: 'USER#u', sk: 'INTERVIEW#i1', id: 'i1', score: 72 }] });

    const res = await saveInterview(fakeEvent({ method: 'POST', path: '/interviews', body: { role: 'android', score: 72 } }));

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual([{ id: 'i1', score: 72 }]);
  });
});

describe('toggleSavedJob handler', () => {
  it('adds a job id when not already saved', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { ids: ['j1'] } });
    ddbMock.on(PutCommand).resolves({});

    const res = await toggleSavedJob(fakeEvent({ method: 'POST', path: '/jobs/j8/save', pathParameters: { id: 'j8' } }));

    expect(JSON.parse(res.body as string)).toEqual(['j1', 'j8']);
  });

  it('removes a job id when already saved', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { ids: ['j1', 'j8'] } });
    ddbMock.on(PutCommand).resolves({});

    const res = await toggleSavedJob(fakeEvent({ method: 'POST', path: '/jobs/j8/save', pathParameters: { id: 'j8' } }));

    expect(JSON.parse(res.body as string)).toEqual(['j1']);
  });
});

describe('toggleVote handler', () => {
  it('flips a feature vote', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { votes: {} } });
    ddbMock.on(PutCommand).resolves({});

    const res = await toggleVote(fakeEvent({ method: 'POST', path: '/features/pivot-finder/vote', pathParameters: { id: 'pivot-finder' } }));

    expect(JSON.parse(res.body as string)).toEqual({ 'pivot-finder': true });
  });
});

describe('acceptGig handler', () => {
  it('adds an Experience milestone to the roadmap, once', async () => {
    const roadmap = {
      pk: 'USER#u', sk: 'ROADMAP', templateKey: 't', replans: 0,
      goal: { roleId: 'android', startDate: '2026-01-01', deadline: '2026-09-01' },
      phases: [{ id: 'p4', name: 'Experience', icon: '💼', milestones: [] }],
    };
    ddbMock.on(GetCommand).resolves({ Item: roadmap });
    ddbMock.on(PutCommand).resolves({});

    const res = await acceptGig(
      fakeEvent({ method: 'POST', path: '/gigs/g1/accept', pathParameters: { id: 'g1' }, body: { id: 'g1', title: 'Landing page for a startup', hours: 15 } })
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.phases[0].milestones).toHaveLength(1);
    expect(body.phases[0].milestones[0].gigId).toBe('g1');
  });
});
