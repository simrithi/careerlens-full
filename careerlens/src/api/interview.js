import { request } from './client'
import { uid, iso } from '../utils/dates'
import { http, USE_MOCK } from './http'
import { mergeSlice } from './bundleCache'
import { evaluateAnswer as localEvaluateAnswer } from './engine'

// POST /interviews  (session summary)
export const saveInterview = (userId, session) =>
  USE_MOCK
    ? request(userId, (rec) => { rec.interviews.push({ id: uid('mi'), date: iso(0), ...session }) }, { wait: 200 })
    : http('/interviews', { method: 'POST', body: session }).then((interviews) => mergeSlice('interviews', interviews))

// POST /interview/score-answer — real rubric scoring from Gemini. Falls back to the local
// keyword-matching heuristic (engine.js) if the call fails, so a Gemini outage never breaks
// a live mock-interview session.
export async function scoreAnswer(question, answer, roleTitle) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1300)) // simulated "thinking" delay for the demo
    return localEvaluateAnswer(question, answer)
  }
  try {
    return await http('/interview/score-answer', { method: 'POST', body: { question: question.text, answer, roleTitle } })
  } catch {
    return localEvaluateAnswer(question, answer)
  }
}
