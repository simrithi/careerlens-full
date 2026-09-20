import { request } from './client'
import { replanRoadmap } from './engine'
import { uid, iso } from '../utils/dates'
import { http, USE_MOCK } from './http'
import { mergeSlice } from './bundleCache'

// GET /roadmap is part of the bundle. Mutations below:

// PATCH /roadmap/milestones/{id}. Real backend returns the whole roadmap (see
// ../careerlens-backend/lambda/roadmap/toggleMilestone.ts) so the merge is a straight replace.
export const toggleMilestone = (userId, milestoneId) =>
  USE_MOCK
    ? request(userId, (rec) => {
        rec.roadmap.phases.forEach((p) => p.milestones.forEach((m) => {
          if (m.id === milestoneId) { m.done = !m.done; m.doneAt = m.done ? iso(0) : null }
        }))
      }, { wait: 120 })
    : http(`/roadmap/milestones/${milestoneId}`, { method: 'PATCH' }).then((roadmap) => mergeSlice('roadmap', roadmap))

// POST /roadmap/phases/{phaseId}/milestones
export const addMilestone = (userId, phaseId, milestone) =>
  USE_MOCK
    ? request(userId, (rec) => {
        const phase = rec.roadmap.phases.find((p) => p.id === phaseId) || rec.roadmap.phases[0]
        phase.milestones.push({ id: uid('m'), done: false, doneAt: null, hours: 10, type: 'learn', due: iso(21), ...milestone })
      }, { wait: 150 })
    : http(`/roadmap/phases/${phaseId}/milestones`, { method: 'POST', body: milestone }).then((roadmap) => mergeSlice('roadmap', roadmap))

// POST /roadmap/replan (deterministic math in real mode too, see roadmapEngine.ts; AI-driven
// resource re-selection is future work, not built yet)
export const replan = (userId) =>
  USE_MOCK
    ? request(userId, (rec) => {
        const { roadmap, moved } = replanRoadmap(rec.roadmap)
        rec.roadmap = roadmap
        rec.lastReplan = { moved, at: iso(0) }
      }, { wait: 1800 })
    : http('/roadmap/replan', { method: 'POST' }).then(({ roadmap, lastReplan }) => {
        mergeSlice('roadmap', roadmap)
        return mergeSlice('lastReplan', lastReplan)
      })

// PATCH /roadmap/goal — real backend returns the whole roadmap (auto-provisions one from a
// starter template on a brand-new account; see ../careerlens-backend/lambda/roadmap/setGoal.ts)
export const setGoal = (userId, patch) =>
  USE_MOCK
    ? request(userId, (rec) => { rec.roadmap.goal = { ...rec.roadmap.goal, ...patch } }, { wait: 100 })
    : http('/roadmap/goal', { method: 'PATCH', body: patch }).then((roadmap) => mergeSlice('roadmap', roadmap))

export const toggleQuestion = (userId, qid) =>
  USE_MOCK
    ? request(userId, (rec) => {
        rec.solvedQuestions = rec.solvedQuestions.includes(qid) ? rec.solvedQuestions.filter((x) => x !== qid) : [...rec.solvedQuestions, qid]
      }, { wait: 60 })
    : http(`/roadmap/questions/${qid}/toggle`, { method: 'PATCH' }).then((solved) => mergeSlice('solvedQuestions', solved))
