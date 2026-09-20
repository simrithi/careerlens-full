import { getSecret } from './secrets';

async function getGeminiKey(): Promise<string> {
  const secretId = process.env.GEMINI_SECRET_NAME;
  if (!secretId) throw new Error('GEMINI_SECRET_NAME not configured');
  return getSecret(secretId);
}

// "-latest" alias auto-tracks Google's current flash model, so a future model retirement
// doesn't silently 404 every AI-backed feature the way pinning an exact version name did before.
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callOnce<T>(key: string, prompt: string, schema: Record<string, unknown>): Promise<{ ok: true; value: T } | { ok: false; status: number; text: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.4 },
    }),
  });
  if (!res.ok) return { ok: false, status: res.status, text: await res.text() };
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return { ok: false, status: 502, text: 'Gemini returned no content' };
  return { ok: true, value: JSON.parse(text) as T };
}

// Calls Gemini with a response schema for controlled JSON generation. Retries once on a 503
// ("model overloaded" — Gemini's own free-tier flash models hit this fairly often under load,
// and Google's own error message says it's transient) before giving up. Throws on any other
// failure (missing key, network error, other non-2xx, empty/unparsable output) — callers should
// let the error propagate to a 5xx response and let the frontend fall back to its local
// heuristic rather than trying to guess at a partial result here.
export async function generateJson<T>(prompt: string, schema: Record<string, unknown>): Promise<T> {
  const key = await getGeminiKey();
  let result = await callOnce<T>(key, prompt, schema);
  if (!result.ok && result.status === 503) {
    await sleep(1500);
    result = await callOnce<T>(key, prompt, schema);
  }
  if (!result.ok) throw new Error(`Gemini request failed: ${result.status} ${result.text}`);
  return result.value;
}

export const clampScore = (n: unknown): number => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
