import { rejectionDiagnosis as localDiagnosis, skillMatch } from './engine'
import { roleById } from '../data/roles'
import { http, USE_MOCK } from './http'

// POST /resume/diagnose — the ATS checklist/score stay local (deterministic facts about the
// resume, not something an LLM should guess at — see engine.js's atsAnalysis). Only the
// "why might I get rejected" reasons are Gemini-written, personalized to the candidate's real
// projects and skills. Falls back to the local template version if the call fails, so a Gemini
// outage never breaks the Resume Lab demo.
export async function rejectionDiagnosis(profile, roleId, ats) {
  const local = localDiagnosis(profile, roleId, ats)
  if (USE_MOCK) return local
  try {
    const role = roleById(roleId) || local.role
    const m = skillMatch(profile.skills, role)
    const body = {
      roleTitle: role.title,
      atsScore: ats.score,
      matchScore: local.matchScore,
      missingSkills: m.missing.slice(0, 3).map((s) => ({ name: s.name, have: s.have, need: s.need })),
      projects: profile.projects.map((p) => ({ name: p.name, tech: p.tech || [] })),
      experienceCount: profile.experience.length,
      leetcodeSolved: profile.external.leetcode?.solved || 0,
    }
    const { reasons } = await http('/resume/diagnose', { method: 'POST', body })
    return { ...local, reasons: reasons?.length ? reasons : local.reasons }
  } catch {
    return local
  }
}
