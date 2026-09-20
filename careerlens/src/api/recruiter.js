import { request, readAll } from './client'
import { uid, iso } from '../utils/dates'
import { http, USE_MOCK } from './http'
import { getCachedBundle, mergeSlice } from './bundleCache'
import { skillMatch, projectAlignment } from './engine'
import { GIGS } from '../data/market'
import { SEED } from '../data/seed'

// POST /recruiter/shortlist/{candidateId} — falls back to a local toggle on the cached bundle if
// the recruiter stack isn't deployed yet (see AppContext.jsx's company-bundle fallback), so
// shortlisting still works against sample candidates on a real Cognito session.
export const toggleShortlist = (userId, candidateId) =>
  USE_MOCK
    ? request(userId, (rec) => {
        rec.shortlist = rec.shortlist.includes(candidateId) ? rec.shortlist.filter((c) => c !== candidateId) : [...rec.shortlist, candidateId]
      }, { wait: 80 })
    : http(`/recruiter/shortlist/${candidateId}`, { method: 'POST' }).then((shortlist) => mergeSlice('shortlist', shortlist))
        .catch(() => {
          const cur = getCachedBundle()?.shortlist || []
          const next = cur.includes(candidateId) ? cur.filter((c) => c !== candidateId) : [...cur, candidateId]
          return mergeSlice('shortlist', next)
        })

// POST /recruiter/roles — same fallback: append locally onto the cached (possibly sample) roles.
export const addRole = (userId, role) =>
  USE_MOCK
    ? request(userId, (rec) => { rec.company.roles.unshift({ id: uid('r'), applicants: 0, openings: 1, posted: iso(0), domains: [], skills: [], ...role }) }, { wait: 300 })
    : http('/recruiter/roles', { method: 'POST', body: role }).then((roles) => mergeSlice('company.roles', roles))
        .catch(() => {
          const cur = getCachedBundle()?.company?.roles || []
          const roles = [{ id: uid('r'), applicants: 0, openings: 1, posted: iso(0), domains: [], skills: [], ...role }, ...cur]
          return mergeSlice('company.roles', roles)
        })

// POST /market/gigs — company group only. Response: every open gig (candidate-safe shape),
// same idiom as addRole() above. Gigs aren't part of the per-user record (any candidate can
// browse any company's postings), so this isn't a mergeSlice — see marketApi.getGigs().
export const postGig = (userId, gig) =>
  USE_MOCK
    ? new Promise((resolve) => setTimeout(() => {
        GIGS.unshift({ id: uid('gig'), applicantIds: [], slotsRemaining: Number(gig.slots) || 1, ...gig })
        resolve([...GIGS])
      }, 300))
    : http('/market/gigs', { method: 'POST', body: gig }).catch(() => {
        GIGS.unshift({ id: uid('gig'), applicantIds: [], slotsRemaining: Number(gig.slots) || 1, ...gig })
        return [...GIGS]
      })

// GET /recruiter/gigs/{id}/applicants — company group only, and only for a gig you posted.
export const getGigApplicants = (userId, gigId) =>
  USE_MOCK ? Promise.resolve([]) : http(`/recruiter/gigs/${gigId}/applicants`).catch(() => [])

function scoreCandidate(cand, role) {
  const skills = Object.entries(cand.skills).map(([name, level]) => ({ name, level }))
  const sm = skillMatch(skills, { skills: role.skills })
  const projects = cand.projects.map((p) => ({ p, ...projectAlignment(p, role.domains) })).sort((a, b) => b.score - a.score)
  const best = projects[0]
  const total = Math.round(sm.score * 0.55 + (best?.score || 0) * 0.35 + (cand.ats / 100) * 10)
  return { sm, best, total }
}

// GET /recruiter/candidates?roleId= — ranked, scored candidates for one job posting.
// Real mode: scoring + blind-screening PII stripping both happen server-side (see
// docs/api-contract.md) so neither can be bypassed by reading client JS. Mock mode has no such
// boundary to enforce, so it just runs the same scoring locally over the seed data and returns
// candidates with PII intact (Company.jsx's own blind toggle handles the demo UI for that case).
// If the recruiter stack isn't deployed, falls back to the same local scoring over sample
// candidates (the bundle never carries real candidate PII, so this can't leak anything real).
export async function getCandidates(userId, roleId) {
  if (USE_MOCK) {
    const rec = readAll()[userId]
    const role = rec.company.roles.find((r) => r.id === roleId) || rec.company.roles[0]
    return rec.candidates.map((cand) => ({ cand, ...scoreCandidate(cand, role) })).sort((a, b) => b.total - a.total)
  }
  try {
    return await http(`/recruiter/candidates?roleId=${encodeURIComponent(roleId)}`)
  } catch {
    const roles = getCachedBundle()?.company?.roles || SEED.novapixel.company.roles
    const role = roles.find((r) => r.id === roleId) || roles[0]
    return SEED.novapixel.candidates.map((cand) => ({ cand, ...scoreCandidate(cand, role) })).sort((a, b) => b.total - a.total)
  }
}
