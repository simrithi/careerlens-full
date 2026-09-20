// "Mock intelligence". Pure, deterministic functions that stand in for the real ML/LLM services.
// Each function documents the AWS service that will replace it. UI code never calls these directly:
// it goes through /src/api/*.js so the team can swap in real endpoints one at a time.
import { ROLES, roleById, SKILL_ALIASES } from '../data/roles'
import { daysBetween } from '../utils/dates'
import { JOBS } from '../data/market'

const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n))
const norm = (s) => s.toLowerCase().trim()
export const canonicalSkill = (s) => SKILL_ALIASES[norm(s)] || s

export const skillLevel = (skills, name) => {
  const hit = skills.find((s) => norm(s.name) === norm(name))
  return hit ? hit.level : 0
}

// ---- Role / skill matching (SageMaker embeddings + rules in production) ----
export function skillMatch(skills, role) {
  let total = 0
  let got = 0
  const rows = role.skills.map((r) => {
    const have = skillLevel(skills, r.name)
    const ratio = clamp(have / r.need, 0, 1)
    total += r.weight
    got += r.weight * ratio
    return { name: r.name, need: r.need, have, weight: r.weight, gap: Math.max(0, r.need - have), ratio }
  })
  const score = Math.round((got / total) * 100)
  return { score, rows, missing: rows.filter((r) => r.ratio < 0.7).sort((a, b) => b.gap * b.weight - a.gap * a.weight) }
}

export const rankRoles = (skills) =>
  ROLES.map((r) => ({ role: r, ...skillMatch(skills, r) })).sort((a, b) => b.score - a.score)

// ---- Roadmap maths ----
export function roadmapStats(roadmap) {
  const all = roadmap.phases.flatMap((p) => p.milestones.map((m) => ({ ...m, phase: p.name, phaseId: p.id })))
  const totalH = all.reduce((s, m) => s + m.hours, 0)
  const doneH = all.filter((m) => m.done).reduce((s, m) => s + m.hours, 0)
  const progress = Math.round((doneH / totalH) * 100)
  const start = roadmap.goal.startDate
  const end = roadmap.goal.deadline
  const totalDays = Math.max(1, daysBetween(start, end))
  const elapsedDays = clamp(daysBetween(start), 0, totalDays)
  const elapsedPct = Math.round((elapsedDays / totalDays) * 100)
  const plannedH = all.filter((m) => daysBetween(m.due) >= 0).reduce((s, m) => s + m.hours, 0)
  const planned = Math.round((plannedH / totalH) * 100)
  const diff = progress - planned
  const pace = diff >= -3 ? (diff > 6 ? 'ahead' : 'on-track') : diff >= -12 ? 'slightly-behind' : 'behind'
  const overdue = all.filter((m) => !m.done && daysBetween(m.due) > 0)
  const current =
    roadmap.phases.find((p) => p.milestones.some((m) => !m.done)) || roadmap.phases[roadmap.phases.length - 1]
  const byType = {}
  all.forEach((m) => {
    byType[m.type] = byType[m.type] || { total: 0, done: 0 }
    byType[m.type].total += 1
    if (m.done) byType[m.type].done += 1
  })
  const phases = roadmap.phases.map((p) => {
    const t = p.milestones.reduce((s, m) => s + m.hours, 0)
    const d = p.milestones.filter((m) => m.done).reduce((s, m) => s + m.hours, 0)
    return { id: p.id, name: p.name, pct: Math.round((d / t) * 100), done: p.milestones.filter((m) => m.done).length, total: p.milestones.length }
  })
  return {
    progress, planned, diff, pace, elapsedPct, elapsedDays, totalDays, daysLeft: totalDays - elapsedDays,
    overdue, current, byType, phases, totalMilestones: all.length, doneMilestones: all.filter((m) => m.done).length,
    hoursDone: doneH, hoursTotal: totalH, hoursLeft: totalH - doneH,
    next: all.filter((m) => !m.done).sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 4),
  }
}

// Re-plan: shift overdue work forward, insert a catch-up sprint. (An AI planner re-plans in production.)
export function replanRoadmap(roadmap) {
  const shiftDays = 21
  const overdue = []
  const next = JSON.parse(JSON.stringify(roadmap))
  next.phases.forEach((p) => {
    p.milestones.forEach((m) => {
      if (!m.done) {
        const late = daysBetween(m.due)
        if (late > 0) overdue.push(m)
        const d = new Date(m.due)
        d.setDate(d.getDate() + (late > 0 ? late + 7 : shiftDays))
        m.due = d.toISOString().slice(0, 10)
      }
    })
  })
  const dl = new Date(next.goal.deadline)
  dl.setDate(dl.getDate() + Math.min(shiftDays, 14))
  next.goal.deadline = dl.toISOString().slice(0, 10)
  next.replans = (roadmap.replans || 0) + 1
  return { roadmap: next, moved: overdue.length }
}

// ---- Profile completeness & readiness ----
export function profileCompleteness(profile) {
  const checks = [
    ['About', !!profile.about && profile.about.length > 60, 10],
    ['Headline', !!profile.headline, 5],
    ['Education', profile.education.length > 0, 10],
    ['Experience', profile.experience.length > 0, 15],
    ['Skills (8+)', profile.skills.length >= 8, 15],
    ['Certifications', profile.certifications.some((c) => c.status === 'earned'), 10],
    ['Projects (2+)', profile.projects.length >= 2, 15],
    ['Coding profiles', !!profile.external.leetcode.solved || !!profile.external.github.commits, 10],
    ['Resume uploaded', !!profile.resume?.fileName, 10],
  ]
  const score = checks.reduce((s, c) => s + (c[1] ? c[2] : 0), 0)
  return { score, checks: checks.map(([label, ok, pts]) => ({ label, ok, pts })) }
}

export const codingScore = (ext) => {
  const lc = clamp(((ext.leetcode.solved || 0) / 300) * 100)
  const gh = clamp(((ext.github.commits || 0) / 800) * 100)
  const cf = clamp(((ext.codeforces.rating || 0) / 1600) * 100)
  return Math.round(lc * 0.5 + gh * 0.35 + cf * 0.15)
}

export function readiness(rec) {
  const role = roleById(rec.profile.targetRoleId) || ROLES[0]
  const match = skillMatch(rec.profile.skills, role).score
  const rs = roadmapStats(rec.roadmap)
  const comp = profileCompleteness(rec.profile).score
  const code = codingScore(rec.profile.external)
  const active = clamp(rec.applications.filter((a) => a.status !== 'APPLIED').length * 12, 0, 100)
  const parts = [
    { key: 'Skill match', value: match, weight: 0.4 },
    { key: 'Roadmap', value: rs.progress, weight: 0.2 },
    { key: 'Profile', value: comp, weight: 0.15 },
    { key: 'Coding', value: code, weight: 0.15 },
    { key: 'Traction', value: active, weight: 0.1 },
  ]
  const score = Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0))
  return { score, parts, match, role }
}

// ---- Resume / ATS analysis (Textract + an AI scorer in production) ----
export function atsAnalysis(profile, jdText = '') {
  const p = profile
  const hasResume = !!p.resume?.fileName
  const checks = [
    { id: 'contact', label: 'Contact details detected', ok: hasResume, tip: 'Add email, phone and LinkedIn on the first line.', weight: 8 },
    { id: 'sections', label: 'Standard section headings (Education, Skills, Projects)', ok: p.education.length > 0 && p.projects.length > 0, tip: 'Use plain headings like "Experience" and "Projects" so parsers find them.', weight: 12 },
    { id: 'format', label: 'Single column, no tables or images', ok: p.resume?.sizeKb ? p.resume.sizeKb < 230 : false, tip: 'Multi-column layouts and graphics confuse many ATS parsers. Use a simple one-column PDF.', weight: 15 },
    { id: 'keywords', label: 'Role keywords present', ok: p.skills.length >= 10, tip: 'Mirror the exact skill names from the job description.', weight: 20 },
    { id: 'quant', label: 'Quantified achievements', ok: /\d/.test(p.experience.map((e) => e.summary).join(' ')), tip: 'Add numbers: users, speed-ups, team size, percentages.', weight: 15 },
    { id: 'length', label: 'Length within 1 page (fresher) or 2 pages', ok: true, tip: 'Keep to one page for under 3 years of experience.', weight: 8 },
    { id: 'links', label: 'Project links (GitHub, live demo)', ok: p.projects.every((x) => !!x.link), tip: 'Every project needs a link recruiters can click.', weight: 10 },
    { id: 'certs', label: 'Relevant certifications listed', ok: p.certifications.some((c) => c.status === 'earned'), tip: 'List certificates with issuer and date.', weight: 6 },
    { id: 'dates', label: 'Consistent date format', ok: true, tip: 'Use "Mon YYYY - Mon YYYY" everywhere.', weight: 6 },
  ]
  const score = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0)

  // JD keyword coverage
  let coverage = null
  if (jdText.trim().length > 20) {
    const words = Array.from(new Set(jdText.toLowerCase().match(/[a-z][a-z0-9+#./-]{1,}/g) || []))
    const known = new Set([...ROLES.flatMap((r) => r.skills.map((s) => s.name)), ...Object.values(SKILL_ALIASES)])
    const jdSkills = Array.from(known).filter((k) => jdText.toLowerCase().includes(k.toLowerCase()))
    const have = jdSkills.filter((k) => skillLevel(p.skills, k) >= 40 || JSON.stringify(p.projects).toLowerCase().includes(k.toLowerCase()))
    coverage = {
      jdSkills, have, missing: jdSkills.filter((k) => !have.includes(k)),
      pct: jdSkills.length ? Math.round((have.length / jdSkills.length) * 100) : 0, wordCount: words.length,
    }
  }
  return { score, checks, coverage }
}

// "Why might I be rejected?" - likely gaps, never a claimed probability.
export function rejectionDiagnosis(profile, roleId, ats) {
  const role = roleById(roleId) || ROLES[0]
  const m = skillMatch(profile.skills, role)
  const reasons = []
  m.missing.slice(0, 3).forEach((s) =>
    reasons.push({
      severity: s.ratio < 0.4 ? 'high' : 'medium',
      title: `${s.name} is below what this role expects`,
      detail: `You are at ${s.have}%, roles like this usually need ${s.need}%.`,
      fix: `Add a ${s.name} milestone to your roadmap and build one small project.`,
    }),
  )
  if (!profile.projects.some((p) => p.tech.some((t) => role.skills.some((s) => s.name === t || canonicalSkill(t) === s.name))))
    reasons.push({ severity: 'high', title: 'No project clearly proves the target skills', detail: 'Recruiters shortlist on proof-of-work.', fix: 'Build one project that uses the role core stack and deploy it.' })
  if (ats.score < 75) reasons.push({ severity: 'medium', title: 'Resume may not parse cleanly in an ATS', detail: `ATS readiness is ${ats.score}/100.`, fix: 'Fix the failing checks in the Resume Lab.' })
  if ((profile.external.leetcode.solved || 0) < 100 && ['android', 'backend', 'fullstack', 'ml'].includes(role.id))
    reasons.push({ severity: 'medium', title: 'Limited problem-solving evidence', detail: `Only ${profile.external.leetcode.solved || 0} coding problems logged; many screening rounds are DSA-heavy.`, fix: 'Aim for 150+ solved with a steady streak.' })
  if (!profile.experience.length) reasons.push({ severity: 'medium', title: 'No experience section', detail: 'Even volunteer or club work counts.', fix: 'Add internships, gigs or open-source contributions.' })
  const order = { high: 0, medium: 1, low: 2 }
  reasons.sort((a, b) => order[a.severity] - order[b.severity])
  return { role, matchScore: m.score, reasons: reasons.slice(0, 6) }
}

// ---- Project alignment (Titan embeddings similarity in production) ----
export const COMPANY_TYPES = [
  { id: 'game', label: 'Game / graphics studio', domains: ['game-dev', '3d', 'pipeline', 'graphics', 'computer-vision', 'gameplay'] },
  { id: 'mobile', label: 'Mobile-first product company', domains: ['mobile', 'ui', 'api', 'realtime', 'chat'] },
  { id: 'cloud', label: 'Cloud / infrastructure company', domains: ['cloud', 'iac', 'devops', 'cicd', 'backend'] },
  { id: 'ai', label: 'AI / computer vision startup', domains: ['computer-vision', 'python', 'ml', 'pipeline'] },
  { id: 'fintech', label: 'Fintech', domains: ['api', 'backend', 'sql', 'security', 'realtime'] },
]

export function projectAlignment(project, targetDomains) {
  const overlap = project.domains.filter((d) => targetDomains.includes(d))
  const score = clamp(Math.round((overlap.length / Math.max(3, Math.min(targetDomains.length, 5))) * 100))
  const label = score >= 70 ? 'Direct hire signal' : score >= 40 ? 'Relevant' : 'Weak signal'
  return { score, overlap, label }
}

// ---- Applications ----
export function applicationInsights(apps) {
  const total = apps.length
  const noReply = apps.filter((a) => a.status === 'APPLIED' && daysBetween(a.date) >= 14)
  const replied = apps.filter((a) => a.status !== 'APPLIED').length
  const responseRate = total ? Math.round((replied / total) * 100) : 0
  const bySource = {}
  apps.forEach((a) => {
    bySource[a.source] = bySource[a.source] || { total: 0, replied: 0 }
    bySource[a.source].total += 1
    if (a.status !== 'APPLIED') bySource[a.source].replied += 1
  })
  const sources = Object.entries(bySource).map(([source, v]) => ({ source, ...v, rate: Math.round((v.replied / v.total) * 100) })).sort((a, b) => b.rate - a.rate)
  const reasons = {}
  apps.filter((a) => a.status === 'REJECTED' && a.reason).forEach((a) => { reasons[a.reason] = (reasons[a.reason] || 0) + 1 })
  const topReasons = Object.entries(reasons).sort((a, b) => b[1] - a[1])
  return { total, noReply, responseRate, sources, topReasons, interviews: apps.filter((a) => a.status === 'INTERVIEW').length, rejected: apps.filter((a) => a.status === 'REJECTED').length }
}

export const followUpDraft = (a, name) =>
  `Subject: Following up on my application - ${a.role}\n\nHi ${a.company} Hiring Team,\n\nI applied for the ${a.role} position on ${new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} and wanted to reiterate my interest. My recent project work aligns closely with the role, and I would welcome the chance to discuss how I can contribute.\n\nCould you please share an update on the status of my application?\n\nThank you for your time.\n\nBest regards,\n${name}`

// Simulated inbound emails (SES -> Lambda -> AI parser in production)
export const SAMPLE_EMAILS = [
  { from: 'careers@nimbuslabs.example', subject: 'Interview invitation - Android Developer', status: 'INTERVIEW', match: 'Nimbus Labs', text: "We'd like to schedule a technical interview with you next week." },
  { from: 'talent@orbitapps.example', subject: 'Application update', status: 'REJECTED', match: 'Orbit Apps', text: 'After careful consideration we regret to inform you that we will not be moving forward.', reason: 'Profile not aligned' },
  { from: 'hr@codenest.example', subject: 'Online assessment link', status: 'SCREENING', match: 'CodeNest', text: 'Please complete the online assessment within 48 hours.' },
  { from: 'jobs@kiranacloud.example', subject: 'You are shortlisted', status: 'SCREENING', match: 'Kirana Cloud', text: 'Your profile has been shortlisted for the next stage.' },
]

// Apply-timing advisor: estimates competition saturation. NOT a probability of selection.
export function timingAdvice(job, matchScore) {
  const saturation = clamp(Math.round((job.applicants / 300) * 60 + job.posted * 2.2))
  const deadlineBased = job.type === 'Internship' || job.source === 'Campus portal'
  let verdict, tone
  if (deadlineBased) { verdict = 'Deadline-based hiring: timing matters less than readiness'; tone = 'info' }
  else if (matchScore >= 70 && saturation < 60) { verdict = 'Apply now - good match, competition still low'; tone = 'good' }
  else if (matchScore >= 70) { verdict = 'Apply today - strong match, but it is filling up'; tone = 'warn' }
  else if (matchScore >= 50) { verdict = 'Close 1-2 skill gaps first, then apply within a few days'; tone = 'warn' }
  else { verdict = 'Work on the roadmap first - match is low for now'; tone = 'bad' }
  return { saturation, verdict, tone }
}

export const jobMatch = (skills, job) => {
  const role = roleById(job.roleId)
  const base = role ? skillMatch(skills, role).score : 40
  const bonus = job.skills.filter((s) => skillLevel(skills, canonicalSkill(s)) >= 50).length * 3
  return clamp(Math.round(base * 0.85 + bonus))
}

// ---- Pivot finder ----
export function pivotFinder(skills, currentRoleId) {
  return ROLES.map((r) => {
    const m = skillMatch(skills, r)
    const competition = +(r.demand.supply / r.demand.openings).toFixed(1)
    const opportunity = Math.round(m.score * 0.6 + clamp(100 - competition * 6) * 0.4 + r.demand.growth)
    return { role: r, match: m.score, competition, opportunity: clamp(opportunity), missing: m.missing.slice(0, 3), isCurrent: r.id === currentRoleId }
  }).sort((a, b) => b.opportunity - a.opportunity)
}

export const resilience = (role) => {
  const score = clamp(Math.round(100 - role.automationRisk * 0.55 + role.demand.growth * 1.6 - (role.demand.supply / role.demand.openings) * 1.2))
  const label = score >= 75 ? 'Resilient' : score >= 55 ? 'Watch closely' : 'At risk'
  return { score, label }
}

// ---- Mock interview evaluation (AI rubric scoring in production) ----
export function evaluateAnswer(question, answer) {
  const text = answer.toLowerCase()
  const hits = question.keywords.filter((k) => text.includes(k))
  const misses = question.keywords.filter((k) => !text.includes(k))
  const words = (answer.trim().match(/\S+/g) || []).length
  const relevance = clamp(Math.round((hits.length / Math.max(4, question.keywords.length * 0.6)) * 100))
  const depth = clamp(Math.round((Math.min(words, 90) / 90) * 100))
  const structure = clamp((/\b(first|second|then|finally|because|for example|however|therefore)\b/.test(text) ? 55 : 25) + (answer.includes('\n') || /\d\./.test(answer) ? 25 : 0) + (words > 40 ? 20 : 0))
  const clarity = clamp(words < 8 ? 20 : 55 + Math.min(40, Math.round(words / 3)) - (words > 220 ? 20 : 0))
  const overall = Math.round(relevance * 0.4 + depth * 0.2 + structure * 0.2 + clarity * 0.2)
  const feedback = []
  if (words < 25) feedback.push('Your answer is very short. Aim for 4-6 sentences with one concrete example.')
  if (hits.length < 3) feedback.push(`Cover more core concepts. Try mentioning: ${misses.slice(0, 3).join(', ')}.`)
  if (structure < 50) feedback.push('Add structure: state the idea, explain why, then give an example.')
  if (overall >= 75) feedback.push('Strong answer. Tighten it with a quick real-world example to make it memorable.')
  if (!feedback.length) feedback.push('Good start. Add depth by mentioning trade-offs.')
  return { overall, relevance, depth, structure, clarity, hits, misses, words, feedback }
}

export const jobsForRole = (roleId) => JOBS.filter((j) => j.roleId === roleId)
