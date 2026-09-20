import { request } from './client'
import { uid } from '../utils/dates'
import { http, USE_MOCK } from './http'
import { getCachedBundle, mergeSlice } from './bundleCache'
import { getBundle } from './auth'

// PATCH /profile returns only the patched top-level fields (see lambda/profile/updateProfile.ts
// in ../careerlens-backend) — skills/education/etc live in their own items server-side, so we
// merge onto the cached profile rather than replace it wholesale.
export const updateProfile = (userId, patch) =>
  USE_MOCK
    ? request(userId, (rec) => { rec.profile = { ...rec.profile, ...patch } }, { wait: 150 })
    : http('/profile', { method: 'PATCH', body: patch }).then((fields) =>
        mergeSlice('profile', { ...getCachedBundle().profile, ...fields })
      )

// Generic list helpers: POST/PATCH/DELETE /profile/{section}
export const addItem = (userId, section, item) =>
  USE_MOCK
    ? request(userId, (rec) => { rec.profile[section] = [...rec.profile[section], { id: uid(section), ...item }] }, { wait: 150 })
    : http(`/profile/${section}`, { method: 'POST', body: item }).then((list) => mergeSlice(`profile.${section}`, list))

export const removeItem = (userId, section, id) =>
  USE_MOCK
    ? request(userId, (rec) => { rec.profile[section] = rec.profile[section].filter((x) => x.id !== id) }, { wait: 100 })
    : http(`/profile/${section}/${id}`, { method: 'DELETE' }).then((list) => mergeSlice(`profile.${section}`, list))

export const updateItem = (userId, section, id, patch) =>
  USE_MOCK
    ? request(userId, (rec) => { rec.profile[section] = rec.profile[section].map((x) => (x.id === id ? { ...x, ...patch } : x)) }, { wait: 60 })
    : http(`/profile/${section}/${id}`, { method: 'PATCH', body: patch }).then((list) => mergeSlice(`profile.${section}`, list))

// Skills are keyed by name
export const upsertSkill = (userId, skill) =>
  USE_MOCK
    ? request(userId, (rec) => {
        const i = rec.profile.skills.findIndex((s) => s.name.toLowerCase() === skill.name.toLowerCase())
        if (i >= 0) rec.profile.skills[i] = { ...rec.profile.skills[i], ...skill }
        else rec.profile.skills.push({ verified: false, ...skill })
      }, { wait: 60 })
    : http(`/profile/skills/${encodeURIComponent(skill.name)}`, { method: 'PUT', body: skill }).then((skills) =>
        mergeSlice('profile.skills', skills)
      )

export const removeSkill = (userId, name) =>
  USE_MOCK
    ? request(userId, (rec) => { rec.profile.skills = rec.profile.skills.filter((s) => s.name !== name) }, { wait: 60 })
    : http(`/profile/skills/${encodeURIComponent(name)}`, { method: 'DELETE' }).then((skills) =>
        mergeSlice('profile.skills', skills)
      )

// PUT /profile/external/{platform}  (manual entry, or filled in from syncExternal below)
export const updateExternal = (userId, platform, data) =>
  USE_MOCK
    ? request(userId, (rec) => { rec.profile.external[platform] = { ...rec.profile.external[platform], ...data } }, { wait: 150 })
    : http(`/profile/external/${platform}`, { method: 'PUT', body: data }).then((patch) =>
        mergeSlice('profile.external', { ...getCachedBundle().profile.external, ...patch })
      )

// Direct, unauthenticated calls to public developer-platform APIs — both GitHub and Codeforces
// serve CORS headers that allow this from the browser, so real stats can be pulled without a
// backend proxy. LeetCode/HackerRank don't expose a public CORS-enabled API, so those platforms
// stay manual entry until a server-side importer exists (prompt A9). Whatever comes back is saved
// through updateExternal above, same as a manual edit, so both paths share one code path and the
// per-user record shape never changes.
async function fetchPublicStats(platform, handle) {
  if (platform === 'github') {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(handle)}`),
      fetch(`https://api.github.com/users/${encodeURIComponent(handle)}/repos?per_page=100`),
    ])
    if (!userRes.ok) throw new Error(`GitHub user "${handle}" not found`)
    const user = await userRes.json()
    const repos = reposRes.ok ? await reposRes.json() : []
    const stars = Array.isArray(repos) ? repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0) : 0
    return { handle, repos: user.public_repos ?? repos.length, stars }
  }
  if (platform === 'codeforces') {
    const infoRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`)
    const info = await infoRes.json()
    if (info.status !== 'OK') throw new Error(`Codeforces handle "${handle}" not found`)
    const u = info.result[0]
    const ratingRes = await fetch(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`)
    const ratingHist = await ratingRes.json().catch(() => null)
    const contests = ratingHist?.status === 'OK' ? ratingHist.result.length : 0
    return { handle, rating: u.rating || 0, maxRating: u.maxRating || 0, contests }
  }
  throw new Error(`${platform} has no public, browser-callable stats API yet — enter it manually.`)
}

export async function syncExternal(userId, platform, handle) {
  const stats = await fetchPublicStats(platform, handle)
  return updateExternal(userId, platform, stats)
}

// POST /resume/upload-url -> presigned PUT -> upload straight to S3. Real mode: the S3-triggered
// Lambda (Textract + Gemini, see careerlens-backend's parseResume.ts) picks up from here — it
// sets profile.resume.parseStatus 'pending' -> 'done'/'failed' and additively fills in
// skills/projects/experience a few seconds later. fileKey/parseStatus below are the server's real
// fields; fileName/sizeKb are client-only display metadata the server never sees.
export const uploadResume = (userId, file) =>
  USE_MOCK
    ? request(userId, (rec) => {
        rec.profile.resume = { fileName: file.name, uploadedAt: new Date().toISOString().slice(0, 10), sizeKb: Math.max(1, Math.round(file.size / 1024)) }
      }, { wait: 700 })
    : http('/resume/upload-url', { method: 'POST' }).then(async ({ uploadUrl, fileKey }) => {
        await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file })
        const resume = {
          fileName: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)),
          fileKey, parseStatus: 'pending', uploadedAt: new Date().toISOString().slice(0, 10),
        }
        return mergeSlice('profile', { ...getCachedBundle().profile, resume })
      })

// Re-fetches the bundle a few times (short backoff) while profile.resume.parseStatus is still
// 'pending', so the UI can show real extraction progress instead of guessing when it's done.
// Stops as soon as the status changes or after ~30s; a normal page refresh will pick up a late
// finish either way.
export async function pollResumeParse(userId, onUpdate) {
  if (USE_MOCK) return // mock resumes have no async parse step to wait for
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const rec = await getBundle(userId)
    onUpdate(rec)
    if (rec.profile.resume?.parseStatus !== 'pending') return
  }
}
