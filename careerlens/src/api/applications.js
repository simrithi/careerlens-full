import { request } from './client'
import { uid, iso } from '../utils/dates'
import { SAMPLE_EMAILS } from './engine'
import { http, USE_MOCK } from './http'
import { getCachedBundle, mergeSlice } from './bundleCache'

// POST /applications
export const addApplication = (userId, a) =>
  USE_MOCK
    ? request(userId, (rec) => { rec.applications.unshift({ id: uid('app'), status: 'APPLIED', date: iso(0), source: 'Other', ...a }) }, { wait: 150 })
    : http('/applications', { method: 'POST', body: a }).then((apps) => mergeSlice('applications', apps))

// POST /applications/bulk  (paste up to 50 lines "Company - Role")
export const addBulk = (userId, items) =>
  USE_MOCK
    ? request(userId, (rec) => {
        items.forEach((a) => rec.applications.unshift({ id: uid('app'), status: 'APPLIED', date: iso(0), source: 'Other', ...a }))
      }, { wait: 500 })
    : http('/applications/bulk', { method: 'POST', body: { items } }).then((apps) => mergeSlice('applications', apps))

// PATCH /applications/{id}
export const moveApplication = (userId, id, status) =>
  USE_MOCK
    ? request(userId, (rec) => {
        const a = rec.applications.find((x) => x.id === id)
        if (a) { a.status = status; if (status === 'INTERVIEW' && !a.interviewDate) a.interviewDate = iso(4) }
      }, { wait: 80 })
    : http(`/applications/${id}`, { method: 'PATCH', body: { status } }).then((apps) => mergeSlice('applications', apps))

export const removeApplication = (userId, id) =>
  USE_MOCK
    ? request(userId, (rec) => { rec.applications = rec.applications.filter((a) => a.id !== id) }, { wait: 80 })
    : http(`/applications/${id}`, { method: 'DELETE' }).then((apps) => mergeSlice('applications', apps))

// Simulates SES -> S3 -> Lambda -> AI parser. There is no real endpoint for this in
// production (see docs/api-contract.md); it stays a client-side demo forever, even in real
// mode, operating on the cached bundle so it still works once VITE_USE_MOCK=false.
export async function simulateEmail(userId) {
  if (USE_MOCK) {
    let parsed = null
    const rec = await request(userId, (r) => {
      const candidates = r.applications.filter((a) => a.status === 'APPLIED' || a.status === 'SCREENING')
      const target = candidates[Math.floor(Math.random() * Math.max(1, candidates.length))]
      if (!target) return
      const options = SAMPLE_EMAILS.filter((e) => (target.status === 'APPLIED' ? true : e.status !== 'SCREENING'))
      const e = options[Math.floor(Math.random() * options.length)]
      target.status = e.status
      if (e.status === 'INTERVIEW') target.interviewDate = iso(5)
      if (e.status === 'REJECTED') target.reason = e.reason
      parsed = { ...e, subject: e.subject.replace(/ - .*/, '') + ' - ' + target.role, company: target.company, role: target.role, from: `careers@${target.company.toLowerCase().replace(/[^a-z]/g, '')}.example`, id: target.id }
    }, { wait: 900 })
    return { rec, parsed }
  }

  await new Promise((r) => setTimeout(r, 900))
  const bundle = getCachedBundle()
  const apps = [...(bundle?.applications ?? [])]
  const candidates = apps.filter((a) => a.status === 'APPLIED' || a.status === 'SCREENING')
  const target = candidates[Math.floor(Math.random() * Math.max(1, candidates.length))]
  if (!target) return { rec: bundle, parsed: null }
  const options = SAMPLE_EMAILS.filter((e) => (target.status === 'APPLIED' ? true : e.status !== 'SCREENING'))
  const e = options[Math.floor(Math.random() * options.length)]
  const updated = { ...target, status: e.status }
  if (e.status === 'INTERVIEW') updated.interviewDate = iso(5)
  if (e.status === 'REJECTED') updated.reason = e.reason
  const nextApps = apps.map((a) => (a.id === target.id ? updated : a))
  const rec = mergeSlice('applications', nextApps)
  const parsed = { ...e, subject: e.subject.replace(/ - .*/, '') + ' - ' + target.role, company: target.company, role: target.role, from: `careers@${target.company.toLowerCase().replace(/[^a-z]/g, '')}.example`, id: target.id }
  return { rec, parsed }
}
