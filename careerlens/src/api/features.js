import { request } from './client'
import { uid, iso } from '../utils/dates'
import { http, USE_MOCK } from './http'
import { mergeSlice } from './bundleCache'

// POST /features/{id}/vote
export const toggleVote = (userId, featureId) =>
  USE_MOCK
    ? request(userId, (rec) => { rec.votes = { ...rec.votes, [featureId]: !rec.votes?.[featureId] } }, { wait: 60 })
    : http(`/features/${featureId}/vote`, { method: 'POST' }).then((votes) => mergeSlice('votes', votes))

// POST /gigs/{id}/accept -> adds an experience milestone to the roadmap
export const acceptGig = (userId, gig) =>
  USE_MOCK
    ? request(userId, (rec) => {
        if (!rec.roadmap) return
        const phase = rec.roadmap.phases.find((p) => p.name === 'Experience') || rec.roadmap.phases[rec.roadmap.phases.length - 1]
        if (phase.milestones.some((m) => m.gigId === gig.id)) return
        phase.milestones.push({ id: uid('m'), gigId: gig.id, title: `Gig: ${gig.title}`, type: 'experience', hours: gig.hours, due: iso(14), done: false, doneAt: null })
      }, { wait: 300 })
    : http(`/gigs/${gig.id}/accept`, { method: 'POST', body: gig }).then((roadmap) => mergeSlice('roadmap', roadmap))
