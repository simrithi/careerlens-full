import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lambda/common/db';
import { handler as toggleShortlist } from '../lambda/recruiter/toggleShortlist';
import { handler as addRole } from '../lambda/recruiter/addRole';
import { handler as getCandidates } from '../lambda/recruiter/getCandidates';
import { fakeEvent } from './helpers';

process.env.TABLE_NAME = 'test-table';
const ddbMock = mockClient(ddb as unknown as DynamoDBDocumentClient);

beforeEach(() => ddbMock.reset());

const role = {
  id: 'r1',
  title: 'Technical Artist - Tools',
  roleId: 'game',
  domains: ['game-dev', '3d', 'pipeline'],
  skills: [{ name: 'Python', need: 60, weight: 3 }],
  posted: '2026-09-01',
};

const shortlistedCandidate = {
  id: 'c1',
  name: 'Ananya Iyer',
  college: 'Nandi Institute of Technology',
  city: 'Mysuru',
  tier: 'Tier 2',
  exp: 'Fresher',
  ats: 84,
  leetcode: 132,
  verified: 4,
  skills: { Python: 60 },
  projects: [{ name: 'Img2Asset', domains: ['game-dev', '3d', 'pipeline'] }],
};

const hiddenCandidate = {
  ...shortlistedCandidate,
  id: 'c2',
  name: 'Rohit Kulkarni',
  college: 'City College of Engineering',
  city: 'Belagavi',
};

describe('toggleShortlist handler', () => {
  it('rejects a caller not in the company group', async () => {
    const res = await toggleShortlist(
      fakeEvent({ method: 'POST', path: '/recruiter/shortlist/c1', pathParameters: { candidateId: 'c1' }, groups: ['student'] })
    );
    expect(res.statusCode).toBe(403);
  });

  it('adds then removes a candidate id', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { ids: [] } });
    ddbMock.on(PutCommand).resolves({});

    const res = await toggleShortlist(
      fakeEvent({ method: 'POST', path: '/recruiter/shortlist/c1', pathParameters: { candidateId: 'c1' }, groups: ['company'] })
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual(['c1']);
  });
});

describe('addRole handler', () => {
  it('creates a role item and returns the refreshed list', async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({ Items: [{ pk: 'USER#u', sk: 'ROLE#r1', ...role }] });

    const res = await addRole(
      fakeEvent({ method: 'POST', path: '/recruiter/roles', body: { title: 'Gameplay Dev' }, groups: ['company'] })
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body).toHaveLength(1);
  });
});

describe('getCandidates handler', () => {
  it('scores candidates against the role and strips PII for non-shortlisted ones', async () => {
    ddbMock.on(QueryCommand, { ExpressionAttributeValues: { ':pk': 'USER#user-1', ':prefix': 'ROLE#' } }).resolves({
      Items: [{ pk: 'USER#user-1', sk: 'ROLE#r1', ...role }],
    });
    ddbMock.on(QueryCommand, { ExpressionAttributeValues: { ':pk': 'USER#user-1', ':prefix': 'CAND#' } }).resolves({
      Items: [
        { pk: 'USER#user-1', sk: 'CAND#c1', ...shortlistedCandidate },
        { pk: 'USER#user-1', sk: 'CAND#c2', ...hiddenCandidate },
      ],
    });
    ddbMock.on(GetCommand).resolves({ Item: { ids: ['c1'] } });

    const res = await getCandidates(
      fakeEvent({ method: 'GET', path: '/recruiter/candidates', queryStringParameters: { roleId: 'r1' }, groups: ['company'] })
    );

    expect(res.statusCode).toBe(200);
    const ranked = JSON.parse(res.body as string) as { cand: Record<string, unknown> }[];
    const shortlisted = ranked.find((r) => r.cand.id === 'c1')!;
    const hidden = ranked.find((r) => r.cand.id === 'c2')!;
    expect(shortlisted.cand.name).toBe('Ananya Iyer');
    expect(hidden.cand.name).toBeUndefined();
    expect(hidden.cand.college).toBeUndefined();
    expect(hidden.cand.city).toBeUndefined();
  });

  it('returns 404 when the requested roleId has no matching posting', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    ddbMock.on(GetCommand).resolves({});

    const res = await getCandidates(
      fakeEvent({ method: 'GET', path: '/recruiter/candidates', queryStringParameters: { roleId: 'nope' }, groups: ['company'] })
    );

    expect(res.statusCode).toBe(404);
  });
});
