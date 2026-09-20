import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lambda/common/db';
import { handler as toggleMilestone } from '../lambda/roadmap/toggleMilestone';
import { handler as setGoal } from '../lambda/roadmap/setGoal';
import { handler as toggleQuestion } from '../lambda/roadmap/toggleQuestion';
import { fakeEvent } from './helpers';

process.env.TABLE_NAME = 'test-table';
const ddbMock = mockClient(ddb as unknown as DynamoDBDocumentClient);

const existingRoadmap = {
  pk: 'USER#user-1',
  sk: 'ROADMAP',
  templateKey: 'android-google',
  goal: { roleId: 'android', title: 'Android Developer', company: 'Google', months: 8, startDate: '2026-01-01', deadline: '2026-09-01' },
  phases: [
    { id: 'p1', name: 'Foundations', icon: '🧱', milestones: [{ id: 'm1', title: 'Learn Kotlin', type: 'learn', hours: 20, due: '2026-02-01', done: false, doneAt: null }] },
  ],
  replans: 0,
};

beforeEach(() => ddbMock.reset());

describe('toggleMilestone handler', () => {
  it('toggles a milestone and persists the whole roadmap', async () => {
    ddbMock.on(GetCommand).resolves({ Item: existingRoadmap });
    ddbMock.on(PutCommand).resolves({});

    const res = await toggleMilestone(fakeEvent({ method: 'PATCH', path: '/roadmap/milestones/m1', pathParameters: { id: 'm1' } }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.phases[0].milestones[0].done).toBe(true);
    expect(body.phases[0].milestones[0].doneAt).not.toBeNull();

    const put = ddbMock.commandCalls(PutCommand)[0].args[0].input;
    expect(put.Item?.sk).toBe('ROADMAP');
  });

  it('returns 404 for an id that does not exist in any phase', async () => {
    ddbMock.on(GetCommand).resolves({ Item: existingRoadmap });

    const res = await toggleMilestone(fakeEvent({ method: 'PATCH', path: '/roadmap/milestones/nope', pathParameters: { id: 'nope' } }));

    expect(res.statusCode).toBe(404);
  });
});

describe('setGoal handler', () => {
  it('auto-provisions a starter roadmap when the user has none yet, then applies the patch', async () => {
    // ensureRoadmap: first Get finds nothing -> Put creates it -> second Get re-reads what was
    // just written (echoed back here rather than re-deriving the real generated template).
    ddbMock
      .on(GetCommand)
      .resolvesOnce({ Item: undefined })
      .resolvesOnce({ Item: { ...existingRoadmap } });
    ddbMock.on(PutCommand).resolves({});

    const res = await setGoal(fakeEvent({ method: 'PATCH', path: '/roadmap/goal', body: { title: 'Backend Engineer' } }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.goal.title).toBe('Backend Engineer');
    expect(body.phases.length).toBeGreaterThan(0); // came from the default template, not empty
  });

  it('patches only goal fields, leaving phases untouched', async () => {
    ddbMock.on(GetCommand).resolves({ Item: existingRoadmap });
    ddbMock.on(PutCommand).resolves({});

    const res = await setGoal(fakeEvent({ method: 'PATCH', path: '/roadmap/goal', body: { months: 10 } }));

    const body = JSON.parse(res.body as string);
    expect(body.goal.months).toBe(10);
    expect(body.goal.title).toBe('Android Developer'); // unchanged
    expect(body.phases).toEqual(existingRoadmap.phases);
  });
});

describe('toggleQuestion handler', () => {
  it('adds a timestamped entry, but returns only flat ids (the documented slice shape)', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { solved: [] } });
    ddbMock.on(PutCommand).resolves({});

    const res = await toggleQuestion(fakeEvent({ method: 'PATCH', path: '/roadmap/questions/a1/toggle', pathParameters: { qid: 'a1' } }));

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual(['a1']);
    const put = ddbMock.commandCalls(PutCommand)[0].args[0].input;
    expect(put.Item?.solved[0]).toMatchObject({ id: 'a1' });
    expect(put.Item?.solved[0].solvedAt).toBeTruthy();
  });

  it('removes an already-solved question by id', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { solved: [{ id: 'a1', solvedAt: '2026-01-01T00:00:00.000Z' }] } });
    ddbMock.on(PutCommand).resolves({});

    const res = await toggleQuestion(fakeEvent({ method: 'PATCH', path: '/roadmap/questions/a1/toggle', pathParameters: { qid: 'a1' } }));

    expect(JSON.parse(res.body as string)).toEqual([]);
  });
});
