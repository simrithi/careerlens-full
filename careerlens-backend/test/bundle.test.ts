import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { GetCommand, PutCommand, QueryCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lambda/common/db';
import { buildBundle, handler } from '../lambda/auth/bundle';
import { weekMonday } from '../lambda/common/historyStore';
import { fakeEvent } from './helpers';

process.env.TABLE_NAME = 'test-table';
const ddbMock = mockClient(ddb as unknown as DynamoDBDocumentClient);

describe('buildBundle', () => {
  it('shapes a flat item list into the full bundle', () => {
    const items = [
      { pk: 'USER#1', sk: 'PROFILE', headline: 'Aspiring Android Developer' },
      { pk: 'USER#1', sk: 'SKILL#kotlin', name: 'Kotlin', level: 80, verified: true },
      { pk: 'USER#1', sk: 'SKILL#git', name: 'Git', level: 75, verified: false },
      { pk: 'USER#1', sk: 'EDU#e1', id: 'e1', school: 'Nandi Institute of Technology' },
      { pk: 'USER#1', sk: 'PROJ#p1', id: 'p1', name: 'Img2Asset' },
      { pk: 'USER#1', sk: 'EXT#github', username: 'ananya-dev' },
      { pk: 'USER#1', sk: 'NOTIF#n1', id: 'n1', title: 'Interview in 2 days', read: false },
      { pk: 'USER#1', sk: 'ROADMAP', templateKey: 'android-google', goal: { roleId: 'android' }, phases: [], replans: 0 },
      { pk: 'USER#1', sk: 'QUESTIONS', solved: [{ id: 'a1', solvedAt: '2026-01-01T00:00:00.000Z' }, { id: 'a2', solvedAt: '2026-01-02T00:00:00.000Z' }] },
      { pk: 'USER#1', sk: 'APP#a1', id: 'a1', company: 'Nimbus Labs', status: 'APPLIED', createdAt: '2026-01-01T00:00:00.000Z' },
      { pk: 'USER#1', sk: 'APP#a2', id: 'a2', company: 'Orbit Apps', status: 'APPLIED', createdAt: '2026-01-02T00:00:00.000Z' },
      { pk: 'USER#1', sk: 'INTERVIEW#i1', id: 'i1', role: 'android', score: 72 },
      { pk: 'USER#1', sk: 'SAVEDJOBS', ids: ['j1', 'j8'] },
      { pk: 'USER#1', sk: 'VOTES', votes: { 'pivot-finder': true } },
    ];

    const bundle = buildBundle(items);

    expect(bundle.profile.headline).toBe('Aspiring Android Developer');
    expect(bundle.profile.skills).toHaveLength(2);
    expect(bundle.profile.skills[0]).not.toHaveProperty('pk');
    expect(bundle.profile.education).toEqual([{ id: 'e1', school: 'Nandi Institute of Technology' }]);
    expect(bundle.profile.projects).toEqual([{ id: 'p1', name: 'Img2Asset' }]);
    expect(bundle.profile.external.github).toEqual({ username: 'ananya-dev' });
    expect(bundle.notifications).toEqual([{ id: 'n1', title: 'Interview in 2 days', read: false }]);
    expect(bundle.roadmap).toEqual({ templateKey: 'android-google', goal: { roleId: 'android' }, phases: [], replans: 0 });
    expect(bundle.solvedQuestions).toEqual(['a1', 'a2']);
    expect(bundle.applications.map((a) => a.id)).toEqual(['a2', 'a1']); // newest (createdAt) first
    expect(bundle.interviews).toEqual([{ id: 'i1', role: 'android', score: 72 }]);
    expect(bundle.savedJobs).toEqual(['j1', 'j8']);
    expect(bundle.votes).toEqual({ 'pivot-finder': true });
    expect(bundle.history).toEqual({ readiness: [], weeklyHours: [], weeklySolved: [] });
    expect(bundle.profile.targetRoleId).toBe('android'); // defaulted from roadmap.goal.roleId
  });

  it('does not override an explicitly-set targetRoleId with the roadmap default', () => {
    const items = [
      { pk: 'USER#1', sk: 'PROFILE', targetRoleId: 'backend' },
      { pk: 'USER#1', sk: 'ROADMAP', goal: { roleId: 'android' }, phases: [], replans: 0 },
    ];
    const bundle = buildBundle(items);
    expect(bundle.profile.targetRoleId).toBe('backend');
  });

  it('returns empty collections, never undefined, when a user has no items yet', () => {
    const bundle = buildBundle([]);
    expect(bundle.profile.skills).toEqual([]);
    expect(bundle.profile.education).toEqual([]);
    expect(bundle.profile.external).toEqual({ leetcode: { solved: 0 }, github: {}, codeforces: {}, hackerrank: {}, linkedin: {} });
    expect(bundle.profile.headline).toBe('');
    expect(bundle.notifications).toEqual([]);
    expect(bundle.roadmap).toBeNull();
    expect(bundle.solvedQuestions).toEqual([]);
    expect(bundle.applications).toEqual([]);
  });
});

describe('handler (GET /me/bundle)', () => {
  beforeEach(() => ddbMock.reset());

  const roadmapFields = {
    templateKey: 'android-google',
    goal: { roleId: 'android', title: 'Android Developer', company: 'Google', months: 8, startDate: '2026-01-01', deadline: '2026-09-01' },
    phases: [{ id: 'p1', name: 'Foundations', icon: '🧱', milestones: [{ id: 'm1', title: 'Learn Kotlin', type: 'learn', hours: 20, due: '2026-02-01', done: false, doneAt: null }] }],
    replans: 0,
  };

  it("records this week's snapshot and returns it merged into history", async () => {
    ddbMock.on(GetCommand).resolves({ Item: { pk: 'USER#user-1', sk: 'ROADMAP', ...roadmapFields } }); // ensureRoadmap
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { pk: 'USER#user-1', sk: 'PROFILE', headline: 'Aspiring Android Developer' },
        { pk: 'USER#user-1', sk: 'ROADMAP', ...roadmapFields },
      ],
    });
    ddbMock.on(PutCommand).resolves({});

    const res = await handler(fakeEvent({ method: 'GET', path: '/me/bundle' }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.history.weeks).toEqual([weekMonday()]);
    expect(body.history.readiness[0]).toBeGreaterThanOrEqual(0);

    const historyPut = ddbMock
      .commandCalls(PutCommand)
      .find((c) => (c.args[0].input.Item as { sk: string }).sk === `HISTORY#${weekMonday()}`);
    expect(historyPut).toBeTruthy();
  });

  it("never writes candidates into a company account's bundle", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ pk: 'USER#biz-1', sk: 'COMPANY', name: 'NovaPixel Games' }],
    });

    const res = await handler(fakeEvent({ method: 'GET', path: '/me/bundle', userId: 'biz-1', groups: ['company'] }));

    const body = JSON.parse(res.body as string);
    expect(body.company.name).toBe('NovaPixel Games');
    expect(body.candidates).toBeUndefined();
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0); // no history snapshot for company accounts
  });
});
