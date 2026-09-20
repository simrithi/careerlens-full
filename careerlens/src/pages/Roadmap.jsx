import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Map as MapIcon, Check, GitBranch, ExternalLink, RefreshCw, Plus, Award, Target, Send, BookOpen, Hammer, Briefcase, Flag, Clock, Sparkles, Trophy, Mic, Zap, CalendarDays,
} from 'lucide-react'
import { useData, useToast } from '../context/AppContext'
import { Badge, Bar, Button, Card, CardTitle, Confetti, Counter, Modal, PageHeader, Ring, colorOf, toneOf, useAsync } from '../components/ui'
import { FormModal } from '../components/Forms'
import { roadmapApi, roadmapStats, jobMatch, timingAdvice, marketApi } from '../api'
import { MILESTONE_TYPES } from '../data/roadmapTemplates'
import { QUESTIONS } from '../data/questions'
import { daysBetween, daysFromNow, fmtDate, iso } from '../utils/dates'

const TYPE_ICON = { learn: BookOpen, build: Hammer, certify: Award, experience: Briefcase, practice: Target, apply: Send }
const PACE = {
  ahead: { tone: 'green', text: 'Ahead of plan', msg: 'You are ahead of schedule. Keep the momentum.' },
  'on-track': { tone: 'green', text: 'On track', msg: 'You are keeping pace with the plan.' },
  'slightly-behind': { tone: 'amber', text: 'Slightly behind', msg: 'A little behind. Finish overdue items this week.' },
  behind: { tone: 'red', text: 'Behind schedule', msg: 'You are behind plan. Re-plan to get realistic dates.' },
}
const REPLAN_STEPS = ['Reading your completed milestones', 'Measuring how far behind you are', 'Re-balancing remaining hours per week', 'Shifting due dates and adding catch-up buffer', 'Saving your new plan']

export default function Roadmap() {
  const { rec, run, userId } = useData()
  const toast = useToast()
  const nav = useNavigate()
  const rm = rec.roadmap
  const st = useMemo(() => roadmapStats(rm), [rm])
  const [phaseId, setPhaseId] = useState(st.current.id)
  const [boom, setBoom] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [replan, setReplan] = useState({ open: false, step: 0, done: false, moved: 0, aiNote: null })
  const phase = rm.phases.find((p) => p.id === phaseId) || rm.phases[0]
  const pace = PACE[st.pace]
  const goalRole = rm.goal.roleId

  useEffect(() => { if (boom) { const t = setTimeout(() => setBoom(false), 2000); return () => clearTimeout(t) } }, [boom])

  const toggle = async (m) => {
    const wasDone = m.done
    const r = await run(roadmapApi.toggleMilestone(userId, m.id))
    if (!wasDone) {
      setBoom(true)
      const ph = r.roadmap.phases.find((p) => p.id === phaseId)
      const phaseDone = ph.milestones.every((x) => x.done)
      toast(phaseDone ? `Phase complete: ${ph.name}` : 'Milestone completed', { desc: phaseDone ? 'Amazing progress. On to the next phase.' : m.title })
    }
  }

  const startReplan = async () => {
    setReplan({ open: true, step: 0, done: false, moved: 0, aiNote: null })
    let s = 0
    const t = setInterval(() => { s += 1; setReplan((r) => (r.done ? r : { ...r, step: Math.min(s, REPLAN_STEPS.length - 1) })) }, 340)
    const r = await run(roadmapApi.replan(userId))
    clearInterval(t)
    setReplan({ open: true, step: REPLAN_STEPS.length, done: true, moved: r.lastReplan?.moved ?? 0, aiNote: r.lastReplan?.aiNote ?? null })
  }

  // plan vs reality curve
  const curve = useMemo(() => {
    const all = rm.phases.flatMap((p) => p.milestones)
    const total = all.reduce((s, m) => s + m.hours, 0)
    const start = rm.goal.startDate
    const days = Math.max(1, daysBetween(start, rm.goal.deadline))
    const pts = []
    for (let d = 0; d <= days; d += Math.max(7, Math.round(days / 30))) {
      const h = all.filter((m) => daysBetween(start, m.due) <= d).reduce((s, m) => s + m.hours, 0)
      pts.push({ day: d, planned: Math.round((h / total) * 100) })
    }
    const ticks = []; for (let d = 0; d <= days; d += 30.4) ticks.push(Math.round(d))
    return { pts, today: st.elapsedDays, max: days, ticks }
  }, [rm, st.elapsedDays])

  const { data: allJobs } = useAsync(() => marketApi.getJobs(), [])
  const questions = QUESTIONS[goalRole] || []
  const solved = rec.solvedQuestions.filter((id) => questions.some((q) => q.id === id))
  const jobs = (allJobs || []).filter((j) => j.roleId === goalRole).slice(0, 3)
  const certs = rec.profile.certifications
  const projectsDone = rm.phases.flatMap((p) => p.milestones).filter((m) => m.type === 'build' && m.done).length
  const projectsTotal = rm.phases.flatMap((p) => p.milestones).filter((m) => m.type === 'build').length

  return (
    <>
      <Confetti show={boom} />
      <PageHeader
        title="My Roadmap"
        subtitle={`${rm.goal.title} at ${rm.goal.company} in ${rm.goal.months} months`}
        icon={MapIcon}
        actions={<>
          <Button variant="outline" icon={Plus} onClick={() => setAddOpen(true)}>Add milestone</Button>
          <Button icon={RefreshCw} onClick={startReplan}>Re-plan with AI</Button>
        </>}
      />

      {/* goal banner */}
      <motion.div className="goal" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="goal-main">
          <div className="goal-kicker"><Flag size={14} /> Goal</div>
          <h2>{rm.goal.title} <span>@ {rm.goal.company}</span></h2>
          <div className="goal-meta">
            <span><CalendarDays size={14} /> Deadline {fmtDate(rm.goal.deadline)}</span>
            <span><Clock size={14} /> {st.daysLeft} days left</span>
            <span><Zap size={14} /> {st.hoursLeft}h of work remaining</span>
            {rm.replans > 0 && <span><RefreshCw size={14} /> Re-planned {rm.replans}x</span>}
          </div>
          <div className="goal-bars">
            <div><div className="row between tiny"><span>Your progress</span><b>{st.progress}%</b></div><Bar value={st.progress} color="#22d3ee" height={10} /></div>
            <div><div className="row between tiny"><span>Planned by today</span><b>{st.planned}%</b></div><Bar value={st.planned} color="#94a3b8" height={10} /></div>
            <div><div className="row between tiny"><span>Time used</span><b>{st.elapsedPct}%</b></div><Bar value={st.elapsedPct} color="#64748b" height={10} /></div>
          </div>
        </div>
        <div className="goal-side">
          <Ring value={st.progress} size={132} stroke={12} color="#22d3ee" sub="complete" />
          <Badge tone={pace.tone}>{pace.text}</Badge>
          <div className="tiny" style={{ color: '#a9c4da', textAlign: 'center', maxWidth: 190 }}>{pace.msg}</div>
        </div>
      </motion.div>

      {/* phase stepper */}
      <Card className="mt16">
        <div className="stepper">
          {rm.phases.map((p, i) => {
            const ps = st.phases[i]
            const isCur = p.id === st.current.id
            return (
              <div key={p.id} className="step-wrap">
                {i > 0 && <div className="step-line"><motion.div initial={{ width: 0 }} animate={{ width: st.phases[i - 1].pct === 100 ? '100%' : '0%' }} transition={{ duration: 0.8, delay: 0.1 * i }} /></div>}
                <motion.button className={`step ${p.id === phaseId ? 'sel' : ''} ${ps.pct === 100 ? 'done' : isCur ? 'cur' : ''}`} whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }} onClick={() => setPhaseId(p.id)}>
                  <div className="step-circle">{ps.pct === 100 ? <Check size={20} /> : <span>{p.icon}</span>}</div>
                  <div className="step-name">{p.name}</div>
                  <div className="step-pct">{ps.done}/{ps.total} · {ps.pct}%</div>
                </motion.button>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="grid g-main mt16">
        <div className="stack gap16">
          <Card>
            <CardTitle icon={Target} right={<Badge tone="teal">{st.phases.find((x) => x.id === phase.id)?.pct}% done</Badge>}>{phase.icon} Phase: {phase.name}</CardTitle>
            <div className="stack gap8">
              <AnimatePresence initial={false}>
                {phase.milestones.map((m, i) => {
                  const T = TYPE_ICON[m.type]
                  const late = !m.done && daysBetween(m.due) > 0
                  const info = MILESTONE_TYPES[m.type]
                  return (
                    <motion.div key={m.id} layout className={`ms ${m.done ? 'done' : ''} ${late ? 'late' : ''}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                      <motion.button className={`check ${m.done ? 'on' : ''}`} whileTap={{ scale: 0.8 }} onClick={() => toggle(m)}>
                        <AnimatePresence>{m.done && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check size={15} strokeWidth={3} /></motion.span>}</AnimatePresence>
                      </motion.button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="ms-title">{m.title}</div>
                        <div className="row gap8 wrap tiny mt4">
                          <span className="type-tag" style={{ color: info.color, background: `${info.color}18` }}><T size={12} /> {info.label}</span>
                          <span className="muted">{m.hours}h</span>
                          <span className={late ? 'late-text' : 'muted'}>{m.done ? `Done ${fmtDate(m.doneAt)}` : late ? `Overdue by ${daysBetween(m.due)}d` : `Due ${fmtDate(m.due)}`}</span>
                          {m.auto && <span className="auto-tag"><GitBranch size={11} /> auto-tracked via {m.auto}</span>}
                          {m.resource && <a href={m.resource.url} target="_blank" rel="noreferrer" className="res-link"><ExternalLink size={11} /> {m.resource.label}</a>}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </Card>

          <Card>
            <CardTitle icon={Sparkles}>Plan vs reality</CardTitle>
            <div style={{ height: 230 }}>
              <ResponsiveContainer>
                <LineChart data={curve.pts} margin={{ left: -18, right: 10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="day" type="number" domain={[0, curve.max]} ticks={curve.ticks} tickFormatter={(d) => `M${Math.round(d / 30.4)}`} tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} unit="%" />
                  <Tooltip formatter={(v) => `${v}%`} labelFormatter={(d) => `Day ${d}`} />
                  <Line type="monotone" dataKey="planned" name="Planned" stroke="#94a3b8" strokeWidth={3} strokeDasharray="6 4" dot={false} animationDuration={1200} />
                  <ReferenceLine x={curve.pts.find((p) => p.day >= curve.today)?.day} stroke="var(--text)" strokeDasharray="2 2" label={{ value: 'Today', fontSize: 11, fill: 'var(--text)' }} />
                  <ReferenceDot x={curve.pts.find((p) => p.day >= curve.today)?.day} y={st.progress} r={8} fill="#84cc16" stroke="#fff" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="muted small">The dashed line is where you should be. The teal dot is where you actually are today ({st.progress}%). Completing a milestone moves the dot up.</div>
          </Card>
        </div>

        <div className="stack gap16">
          <div className="grid g2" style={{ gap: 12 }}>
            {[
              ['Milestones', `${st.doneMilestones}/${st.totalMilestones}`, Check, 'green'],
              ['Hours done', `${st.hoursDone}h`, Clock, 'blue'],
              ['Projects built', `${projectsDone}/${projectsTotal}`, Hammer, 'teal'],
              ['Questions solved', `${solved.length}/${questions.length}`, Trophy, 'amber'],
            ].map(([l, v, I, tone], i) => (
              <Card key={l} hover delay={i} className="mini-stat"><div className={`stat-icon tone-${tone}`} style={{ width: 38, height: 38 }}><I size={18} /></div><div><div className="muted tiny">{l}</div><div className="bold" style={{ fontSize: 19 }}>{v}</div></div></Card>
            ))}
          </div>

          <Card>
            <CardTitle>Progress by type</CardTitle>
            <div className="stack gap8">
              {Object.entries(st.byType).map(([t, v]) => (
                <div key={t}><div className="row between tiny"><span style={{ color: MILESTONE_TYPES[t].color }} className="bold">{MILESTONE_TYPES[t].label}</span><span>{v.done}/{v.total}</span></div><Bar value={(v.done / v.total) * 100} color={MILESTONE_TYPES[t].color} height={7} /></div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle icon={CalendarDays}>Do next</CardTitle>
            <div className="stack gap8">
              {st.next.map((m) => (
                <div key={m.id} className="next-row" onClick={() => setPhaseId(m.phaseId)}>
                  <div className="small bold">{m.title}</div>
                  <div className="tiny muted">{m.phase} · {daysBetween(m.due) > 0 ? <span className="late-text">overdue</span> : `due in ${daysFromNow(m.due)}d`}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle icon={Award}>Certifications</CardTitle>
            <div className="stack gap8">
              {certs.map((c) => (
                <div key={c.id} className="row between small"><div><div className="bold">{c.name}</div><div className="muted tiny">{c.issuer} · {c.date}</div></div><Badge tone={c.status === 'earned' ? 'green' : c.status === 'in-progress' ? 'amber' : 'gray'}>{c.status}</Badge></div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid g2 mt16">
        <Card>
          <CardTitle icon={Trophy} right={<Button size="sm" variant="outline" icon={Mic} onClick={() => nav('/interview')}>Practice live</Button>}>Practice questions for this role</CardTitle>
          <div className="stack gap8">
            {questions.map((q) => (
              <div key={q.id} className="q-row">
                <motion.button className={`check ${rec.solvedQuestions.includes(q.id) ? 'on' : ''}`} whileTap={{ scale: 0.8 }} onClick={() => run(roadmapApi.toggleQuestion(userId, q.id))}>{rec.solvedQuestions.includes(q.id) && <Check size={15} strokeWidth={3} />}</motion.button>
                <div style={{ flex: 1 }}><div className="small">{q.text}</div></div>
                <Badge tone={q.level === 'Easy' ? 'green' : q.level === 'Hard' ? 'red' : 'amber'}>{q.level}</Badge>
              </div>
            ))}
          </div>
          <div className="muted tiny mt8">Generated practice questions based on the role's skills, not copied from any interview site.</div>
        </Card>
        <Card>
          <CardTitle icon={Briefcase} right={<Button size="sm" variant="ghost" onClick={() => nav('/market')}>See all</Button>}>Matching openings</CardTitle>
          <div className="stack gap12">
            {jobs.map((j) => {
              const match = jobMatch(rec.profile.skills, j)
              const adv = timingAdvice(j, match)
              return (
                <div key={j.id} className="job-mini">
                  <div className="job-logo">{j.company[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}><div className="bold truncate">{j.title}</div><div className="muted small truncate">{j.company} · {j.location}</div><div className={`advice advice-${adv.tone}`}>{adv.verdict}</div></div>
                  <Badge tone={toneOf(match)}>{match}%</Badge>
                </div>
              )
            })}
            {jobs.length === 0 && <div className="muted small">No current openings for this goal role.</div>}
          </div>
        </Card>
      </div>

      <FormModal open={addOpen} onClose={() => setAddOpen(false)} title="Add a milestone" initial={{ type: 'learn', hours: 10 }}
        fields={[
          { key: 'title', label: 'Milestone', required: true },
          { key: 'type', label: 'Type', type: 'select', options: Object.keys(MILESTONE_TYPES) },
          { key: 'hours', label: 'Estimated hours', type: 'number' },
        ]}
        onSubmit={async (v) => { await run(roadmapApi.addMilestone(userId, phase.id, { title: v.title, type: v.type, hours: Number(v.hours) || 10, due: iso(21) })); toast('Milestone added', { desc: `Added to ${phase.name}` }) }}
      />

      <Modal open={replan.open} onClose={() => replan.done && setReplan((r) => ({ ...r, open: false }))} title="AI re-plan" width={480}
        footer={replan.done && <Button onClick={() => setReplan((r) => ({ ...r, open: false }))}>Got it</Button>}>
        <div className="stack gap12">
          {REPLAN_STEPS.map((s, i) => (
            <div key={s} className={`scan-step ${i < replan.step ? 'done' : i === replan.step && !replan.done ? 'now' : ''}`}>
              {i < replan.step ? <Check size={16} /> : i === replan.step && !replan.done ? <RefreshCw size={16} className="spin" /> : <span className="scan-dot" />}{s}
            </div>
          ))}
          {replan.done && (
            <motion.div className="replan-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <b>New plan ready.</b> Moved <b><Counter to={replan.moved} /></b> overdue milestone{replan.moved === 1 ? '' : 's'} forward with a catch-up buffer. New deadline: <b>{fmtDate(rm.goal.deadline)}</b>.
              {replan.aiNote ? <div className="small mt8">✦ {replan.aiNote}</div> : <div className="tiny muted mt8">Dates and pace are code-computed; Gemini couldn't be reached for a personalized note this time.</div>}
            </motion.div>
          )}
        </div>
      </Modal>
    </>
  )
}
