import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { ddb } from '../lambda/common/db';
import { handler as getJobs } from '../lambda/market/getJobs';
import { handler as getNews } from '../lambda/market/getNews';
import { handler as getLayoffNews } from '../lambda/market/getLayoffNews';

process.env.TABLE_NAME = 'test-table';
process.env.ADZUNA_SECRET_NAME = 'adzuna-secret';
process.env.GNEWS_SECRET_NAME = 'gnews-secret';

const ddbMock = mockClient(ddb as unknown as DynamoDBDocumentClient);
const secretsMock = mockClient(SecretsManagerClient);

function mockFetchJson(body: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, status: ok ? 200 : 500, text: async () => 'error', json: async () => body })));
}

beforeEach(() => {
  ddbMock.reset();
  secretsMock.reset();
  secretsMock.on(GetSecretValueCommand).callsFake((input) => {
    if (input.SecretId === 'adzuna-secret') return { SecretString: JSON.stringify({ app_id: 'id', app_key: 'key' }) };
    if (input.SecretId === 'gnews-secret') return { SecretString: 'gnews-token' };
    throw new Error('unexpected secret');
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('getJobs handler', () => {
  it('fetches fresh from Adzuna when the cache is empty, and normalizes the result', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    ddbMock.on(PutCommand).resolves({});
    mockFetchJson({
      results: [{
        id: '123', title: 'Android Developer', company: { display_name: 'Nimbus Labs' },
        location: { display_name: 'Bengaluru' }, salary_min: 800000, salary_max: 1400000,
        created: new Date().toISOString(), redirect_url: 'https://example.com/job/123',
        description: 'We need Kotlin and Jetpack Compose experience.',
      }],
    });

    const res = await getJobs();
    expect(res.statusCode).toBe(200);
    const jobs = JSON.parse(res.body as string);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ id: 'adzuna-123', company: 'Nimbus Labs', roleId: 'android', source: 'Adzuna', applicants: null });
    expect(jobs[0].skills).toContain('Kotlin');
  });

  it('serves the cache without calling fetch when it is still fresh', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { data: [{ id: 'cached-1' }], fetchedAt: new Date().toISOString() } });
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const res = await getJobs();
    const jobs = JSON.parse(res.body as string);
    expect(jobs).toEqual([{ id: 'cached-1' }]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('serves stale cache instead of failing when a fresh fetch errors', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { data: [{ id: 'stale-1' }], fetchedAt: '2020-01-01T00:00:00.000Z' } });
    mockFetchJson({}, false);

    const res = await getJobs();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual([{ id: 'stale-1' }]);
  });

  it('returns a 5xx when the cache is empty and the fetch fails', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    mockFetchJson({}, false);

    const res = await getJobs();
    expect(res.statusCode).toBe(500);
  });
});

describe('getNews handler', () => {
  it('normalizes GNews articles and tags them by keyword', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    ddbMock.on(PutCommand).resolves({});
    mockFetchJson({ articles: [{ title: 'IT firms ramp up hiring for cloud roles', description: 'desc', url: 'https://x.com/a', publishedAt: new Date().toISOString(), source: { name: 'Test Wire' } }] });

    const res = await getNews();
    const news = JSON.parse(res.body as string);
    expect(news[0].tag).toBe('Hiring');
    expect(news[0].tone).toBe('good');
    expect(news[0].source).toBe('Test Wire');
  });
});

describe('getLayoffNews handler', () => {
  it('tags layoff headlines and never invents structured employee numbers', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    ddbMock.on(PutCommand).resolves({});
    mockFetchJson({ articles: [{ title: 'Tech firm announces layoffs amid restructuring', url: 'https://x.com/b', publishedAt: new Date().toISOString() }] });

    const res = await getLayoffNews();
    const news = JSON.parse(res.body as string);
    expect(news[0].tag).toBe('Layoffs');
    expect(news[0].tone).toBe('bad');
    expect(news[0]).not.toHaveProperty('employees');
    expect(news[0]).not.toHaveProperty('pct');
  });
});
