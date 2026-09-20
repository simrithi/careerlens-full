import { request, readAll, delay } from './client'
import { http, USE_MOCK } from './http'
import { setBundle, mergeSlice } from './bundleCache'

// Login has no real endpoint: production uses Cognito Hosted UI / Amplify Auth (prompt A2), which
// redirects the browser and returns a JWT directly, so there is nothing for http() to call here.
// This mock stays as the offline/demo fallback even after Cognito exists.
export async function login(email, password) {
  await delay(500)
  const db = readAll()
  const rec = Object.values(db).find((r) => r.account.email.toLowerCase() === email.toLowerCase().trim())
  if (!rec || rec.account.password !== password) throw new Error('Invalid email or password')
  return { ...rec.account }
}

// GET /me/bundle -> the whole record for the logged-in user (profile, roadmap, applications,
// interviews, solvedQuestions, savedJobs, votes, history, notifications — all built server-side).
// Cached here so later mutations can merge their slice back into a full record (see bundleCache.js).
export const getBundle = (userId) =>
  USE_MOCK ? request(userId, (rec) => rec, { wait: 250 }) : http('/me/bundle').then(setBundle)

export const markNotificationsRead = (userId) =>
  USE_MOCK
    ? request(userId, (rec) => { rec.notifications = rec.notifications.map((n) => ({ ...n, read: true })) }, { wait: 50 })
    : http('/me/notifications/read', { method: 'PATCH' }).then(({ notifications }) => mergeSlice('notifications', notifications))