import { request, delay } from './client'
import { JOBS, LAYOFFS, LAYOFF_BY_SECTOR, NEWS, PLACEMENTS, HIRING_TREND, GIGS } from '../data/market'
import { http, USE_MOCK } from './http'
import { mergeSlice } from './bundleCache'

// GET /market/* : public data, no user record needed.
// jobs/news/layoffs/hiring-trend are real (Adzuna + GNews, proxied and cached server-side) in
// real mode, with a fallback to local sample data if the call fails — a flaky external API
// should never blank the Job Market page. Placements is real too, but as a static, cited dataset
// (see data/market.js) rather than a live endpoint — no per-college-tier API exists to call.
export const getJobs = async () => {
  if (USE_MOCK) { await delay(400); return JOBS }
  try { return await http('/market/jobs') } catch { return JOBS }
}
export const getLayoffs = async () => {
  if (USE_MOCK) { await delay(300); return { layoffs: LAYOFFS, bySector: LAYOFF_BY_SECTOR } }
  try { return { news: await http('/market/layoffs') } } catch { return { layoffs: LAYOFFS, bySector: LAYOFF_BY_SECTOR } }
}
export const getNews = async () => {
  if (USE_MOCK) { await delay(300); return NEWS }
  try { return await http('/market/news') } catch { return NEWS }
}
export const getPlacements = async () => { await delay(300); return PLACEMENTS }
export const getHiringTrend = async () => {
  if (USE_MOCK) { await delay(200); return HIRING_TREND }
  try { return await http('/market/hiring-trend') } catch { return HIRING_TREND }
}
export const getGigs = async () => {
  if (USE_MOCK) { await delay(250); return GIGS }
  try { return await http('/market/gigs') } catch { return GIGS }
}

// POST /market/gigs/{id}/apply — any candidate. Response: the gig's own candidate-safe shape
// (slotsRemaining recalculated server-side, never trust a client-computed count).
export const applyToGig = (userId, gigId) =>
  USE_MOCK
    ? request(userId, () => {}, { wait: 200 })
    : http(`/market/gigs/${gigId}/apply`, { method: 'POST' })

// POST /jobs/{id}/save
export const toggleSavedJob = (userId, jobId) =>
  USE_MOCK
    ? request(userId, (rec) => {
        rec.savedJobs = rec.savedJobs.includes(jobId) ? rec.savedJobs.filter((j) => j !== jobId) : [...rec.savedJobs, jobId]
      }, { wait: 60 })
    : http(`/jobs/${jobId}/save`, { method: 'POST' }).then((savedJobs) => mergeSlice('savedJobs', savedJobs))
