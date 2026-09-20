// Mock "backend". Everything the UI needs goes through the api/* modules, which all use this client.
// TO CONNECT A REAL API: replace the body of `request()` (or each api function) with fetch()/Amplify calls.
// The function names and return shapes in api/*.js are the contract the backend should implement.
import { SEED } from '../data/seed'

const KEY = 'careerlens_db_v4'
const LATENCY = 350 // ms, so loading states are visible in the demo

export const delay = (ms = LATENCY) => new Promise((r) => setTimeout(r, ms))

const clone = (o) => JSON.parse(JSON.stringify(o))

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  const fresh = clone(SEED)
  save(fresh)
  return fresh
}

function save(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* ignore */ }
}

export function resetDb() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

// Read/modify/write helper used by every api function.
export async function request(userId, fn, { wait = LATENCY } = {}) {
  await delay(wait)
  const db = load()
  const rec = db[userId]
  if (!rec) throw new Error('Unknown user')
  const result = fn(rec, db)
  save(db)
  return clone(result === undefined ? rec : result)
}

export const readAll = () => load()
