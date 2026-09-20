import { getSecret } from './secrets';

// The secret is meant to be a bare key string (no JSON wrapper) — but accepts a {"apiKey": "..."}
// shape too, since that's an easy mistake to make when setting it via the CLI (quoting issues can
// also mangle it into invalid JSON, e.g. losing every double-quote), and failing loudly with a
// clear message beats silently sending a broken string as the API key to Google.
async function getGeminiKey(): Promise<string> {
  const secretId = process.env.GEMINI_SECRET_NAME;
  if (!secretId) throw new Error('GEMINI_SECRET_NAME not configured');
  const raw = (await getSecret(secretId)).trim();
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { apiKey?: string };
      if (parsed.apiKey) return parsed.apiKey.trim();
    } catch {
      throw new Error(`Gemini secret looks like malformed JSON, not a usable key: ${raw.slice(0, 30)}...`);
    }
  }
  return raw;
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
