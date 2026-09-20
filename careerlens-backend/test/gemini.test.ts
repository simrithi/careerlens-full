import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { handler as scoreAnswer } from '../lambda/interview/scoreAnswer';
import { handler as diagnoseRejection } from '../lambda/resume/diagnoseRejection';
import { fakeEvent } from './helpers';

process.env.GEMINI_SECRET_NAME = 'test-secret';
const secretsMock = mockClient(SecretsManagerClient);

function mockGeminiResponse(payload: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }),
    }))
  );
}

beforeEach(() => {
  secretsMock.reset();
  secretsMock.on(GetSecretValueCommand).resolves({ SecretString: 'fake-gemini-key' });
});

afterEach(() => vi.unstubAllGlobals());

describe('scoreAnswer handler', () => {
  it('scores an answer and clamps out-of-range values from the model', async () => {
    mockGeminiResponse({
      overall: 82, relevance: 130, depth: -5, structure: 70, clarity: 75,
      hits: ['recursion', 'base case'], misses: ['time complexity'], feedback: ['Mention Big-O next time.'],
    });

    const res = await scoreAnswer(fakeEvent({
      method: 'POST', path: '/interview/score-answer',
      body: { question: 'Explain recursion', answer: 'A function calling itself with a base case.', roleTitle: 'Backend Engineer' },
    }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.overall).toBe(82);
    expect(body.relevance).toBe(100); // clamped down from 130
    expect(body.depth).toBe(0); // clamped up from -5
    expect(body.hits).toEqual(['recursion', 'base case']);
  });

  it('rejects a request missing the answer', async () => {
    const res = await scoreAnswer(fakeEvent({ method: 'POST', path: '/interview/score-answer', body: { question: 'Explain recursion' } }));
    expect(res.statusCode).toBe(400);
  });

  it('returns a 5xx (so the frontend can fall back) when Gemini errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, text: async () => 'unavailable' })));
    const res = await scoreAnswer(fakeEvent({ method: 'POST', path: '/interview/score-answer', body: { question: 'Q', answer: 'A' } }));
    expect(res.statusCode).toBe(500);
  });
});

describe('diagnoseRejection handler', () => {
  it('returns Gemini-written reasons sorted by severity', async () => {
    mockGeminiResponse({
      reasons: [
        { severity: 'low', title: 'Minor gap', detail: 'd', fix: 'f' },
        { severity: 'high', title: 'Major gap', detail: 'd', fix: 'f' },
      ],
    });

    const res = await diagnoseRejection(fakeEvent({
      method: 'POST', path: '/resume/diagnose',
      body: { roleTitle: 'Android Developer', atsScore: 60, matchScore: 55, missingSkills: [{ name: 'Kotlin', have: 30, need: 80 }], projects: [{ name: 'Img2Asset', tech: ['Python'] }] },
    }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.reasons[0].severity).toBe('high');
    expect(body.reasons).toHaveLength(2);
  });

  it('rejects a request missing roleTitle', async () => {
    const res = await diagnoseRejection(fakeEvent({ method: 'POST', path: '/resume/diagnose', body: {} }));
    expect(res.statusCode).toBe(400);
  });
});
