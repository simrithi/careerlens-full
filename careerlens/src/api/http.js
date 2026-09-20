// Fetch wrapper for the real backend. See docs/api-contract.md and docs/openapi.yaml for the contract.
// Every src/api/*.js function picks this or the mock in client.js based on USE_MOCK, so the demo
// still works offline even after real endpoints exist.

export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false'
const BASE_URL = import.meta.env.VITE_API_URL || ''

let getIdToken = () => null
// Wired up once Cognito/Amplify Auth exists, so http() can attach a Bearer token (see prompt A2).
export function setTokenProvider(fn) { getIdToken = fn }

export async function http(path, { method = 'GET', body, headers } = {}) {
  const token = await getIdToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let data = null
  try { data = await res.json() } catch { /* empty body, e.g. 204 */ }

  if (!res.ok) {
    const message = data?.error?.message || `${method} ${path} failed (${res.status})`
    throw new Error(message)
  }
  return data
}
