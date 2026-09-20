import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { PutCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lambda/common/db';
import { weekMonday, recordWeeklySnapshot, buildHistory } from '../lambda/common/historyStore';
import type { Roadmap } from '../lambda/common/roadmapEngine';
import type { ReadinessInput } from '../lambda/common/readiness';

process.env.TABLE_NAME = 'test-table';
const ddbMock = mockClient(ddb as unknown as DynamoDBDocumentClient);

beforeEach(() => ddbMock.reset());

describe('weekMonday', () => {
  it('returns the Monday of the given date\'s week', () => {
    expect(weekMonday(new Date('2026-09-20T12:00:00'))).toBe('2026-09-14'); // a Sunday -> preceding Monday
    expect(weekMonday(new Date('2026-09-14T00:00:00'))).toBe('2026-09-14'); // already a Monday
  });
});

describe('recordWeeklySnapshot', () => {
  const roadmap: Roadmap = {
    templateKey: 't', goal: { roleId: 'android', title: '', company: '', months: 1, startDate: '2026-01-01', deadline: '2026-12-31' },
    phases: [
      {
        id: 'p1', name: 'P1', icon: '',
        milestones: [
          { id: 'm1', title: 'Done this week', type: 'learn', hours: 5, due: '2026-01-01', done: true, doneAt: weekMonday() },
          { id: 'm2', title: 'Done long ago', type: 'learn', hours: 9, due: '2026-01-01', done: true, doneAt: '2020-01-01' },
          { id: 'm3', title: 'Not done', type: 'learn', hours: 3, due: '2026-01-01', done: false, doneAt: null },
        ],
      },
    ],
    replans: 0,
  };

  const bundle: ReadinessInput = {
    profile: {
      targetRoleId: 'android', skills: [], about: '', education: [], experience: [], certifications: [], projects: [],
      external: { leetcode: {}, github: {}, codeforces: {} },
    },
    roadmap,
    applications: [],
  };

  it('sums only this-week milestone hours and this-week solved questions', async () => {
    ddbMock.on(PutCommand).resolves({});
    const now = new Date();
    const point = await recordWeeklySnapshot('u1', bundle, [
      { solvedAt: now.toISOString() },
      { solvedAt: '2020-01-01T00:00:00.000Z' },
    ]);

    expect(point.hours).toBe(5); // only m1, not the 2020 milestone
    expect(point.solved).toBe(1); // only the current one
    expect(point.week).toBe(weekMonday());

    const put = ddbMock.commandCalls(PutCommand)[0].args[0].input;
    expect(put.Item).toMatchObject({ pk: 'USER#u1', sk: `HISTORY#${weekMonday()}`, hours: 5, solved: 1 });
  });
});

describe('buildHistory', () => {
  it('merges the freshly-recorded current week with past HISTORY# items, sorted, with gaps left as gaps', () => {
    const items = [
      { pk: 'USER#u1', sk: 'HISTORY#2026-08-31', week: '2026-08-31', readiness: 40, hours: 3, solved: 1 },
      { pk: 'USER#u1', sk: 'HISTORY#2026-09-07', week: '2026-09-07', readiness: 45, hours: 6, solved: 2 },
      { pk: 'USER#u1', sk: 'PROFILE', headline: 'irrelevant' },
    ];
    const current = { week: '2026-09-14', readiness: 50, hours: 2, solved: 0 };

    const history = buildHistory(items, current);

    expect(history.weeks).toEqual(['2026-08-31', '2026-09-07', '2026-09-14']);
    expect(history.readiness).toEqual([40, 45, 50]);
    expect(history.weeklyHours).toEqual([3, 6, 2]);
    expect(history.weeklySolved).toEqual([1, 2, 0]);
  });

  it('overwrites a stale same-week item with the freshly-computed current point', () => {
    const items = [{ pk: 'USER#u1', sk: 'HISTORY#2026-09-14', week: '2026-09-14', readiness: 10, hours: 1, solved: 0 }];
    const current = { week: '2026-09-14', readiness: 99, hours: 8, solved: 4 };

    const history = buildHistory(items, current);

    expect(history.weeks).toEqual(['2026-09-14']);
    expect(history.readiness).toEqual([99]);
  });
});
