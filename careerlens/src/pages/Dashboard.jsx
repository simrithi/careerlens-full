import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Area, AreaChart, Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Send, CalendarCheck, Map as MapIcon, Flame, ArrowRight, AlertTriangle, Sparkles, TrendingUp, CalendarClock, FileWarning, Target, UserCheck } from 'lucide-react'
import { useAuth, useData } from '../context/AppContext'
import { Badge, Bar, Button, Card, CardTitle, Counter, Disclaimer, PageHeader, Ring, colorOf } from '../components/ui'
import { applicationInsights, atsAnalysis, profileCompleteness, readiness, roadmapStats, skillMatch } from '../api'
import { ROLES, INDIA_GAP } from '../data/roles'
import { daysFromNow, fmtDate, lastNMonths } from '../utils/dates'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// Original flat node-graph line art (lime/cream, matching the app palette) standing in for a
// brand graphic on the reality strip — no photo, no gradient blob.
function RealityArt() {
  return (
    <svg className="reality-art" viewBox="0 0 220 220" fill="none" aria-hidden="true">
      <g stroke="#c3e94f" strokeWidth="1.2" opacity="0.6">
        <line x1="40" y1="50" x2="110" y2="30" />
        <line x1="110" y1="30" x2="175" y2="70" />
        <line x1="110" y1="30" x2="95" y2="100" />
        <line x1="95" y1="100" x2="40" y2="50" />
        <line x1="95" y1="100" x2="160" y2="130" />
        <line x1="160" y1="130" x2="175" y2="70" />
        <line x1="95" y1="100" x2="60" y2="160" />
        <line x1="160" y1="130" x2="130" y2="190" />
      </g>
      <g fill="#f5ecd9">
        <circle cx="40" cy="50" r="4" />
        <circle cx="175" cy="70" r="3" />
        <circle cx="60" cy="160" r="3" />
        <circle cx="130" cy="190" r="4" />
      </g>
      <g fill="#c3e94f">
        <circle cx="110" cy="30" r="5" />
        <circle cx="95" cy="100" r="6" />
        <circle cx="160" cy="130" r="4" />
      </g>
    </svg>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { rec } = useData()
  const nav = useNavigate()

  const d = useMemo(() => {
    const rd = readiness(rec)
    const rs = roadmapStats(rec.roadmap)
    const ai = applicationInsights(rec.applications)
    const ats = atsAnalysis(rec.profile)
    const comp = profileCompleteness(rec.profile)
    const match = skillMatch(rec.profile.skills, rd.role)
    const upcoming = rec.applications.filter((a) => a.interviewDate && daysFromNow(a.interviewDate) >= 0).sort((a, b) => new Date(a.interviewDate) - new Date(b.interviewDate))
    const actions = []
    if (rs.overdue.length) actions.push({ icon: AlertTriangle, tone: 'red', title: `${rs.overdue.length} roadmap milestone${rs.overdue.length > 1 ? 's are' : ' is'} overdue`, desc: `Start with "${rs.overdue[0].title}"`, to: '/roadmap' })
    if (upcoming[0]) actions.push({ icon: CalendarClock, tone: 'blue', title: `Interview in ${daysFromNow(upcoming[0].interviewDate)} days: ${upcoming[0].company}`, desc: 'Run a mock interview for this role today.', to: '/interview' })
    if (ai.noReply.length) actions.push({ icon: Send, tone: 'amber', title: `${ai.noReply.length} applications with no reply for 14+ days`, desc: 'Send AI-drafted follow-ups.', to: '/applications' })
    if (ats.score < 85) actions.push({ icon: FileWarning, tone: 'amber', title: `Resume ATS readiness is ${ats.score}/100`, desc: 'Fix the failing checks in Resume Lab.', to: '/resume' })
    if (match.missing[0]) actions.push({ icon: Target, tone: 'purple', title: `Biggest skill gap: ${match.missing[0].name}`, desc: `You are at ${match.missing[0].have}%, the role expects ${match.missing[0].need}%.`, to: '/fit' })
    if (comp.score < 100) actions.push({ icon: UserCheck, tone: 'green', title: `Profile ${comp.score}% complete`, desc: `Missing: ${comp.checks.filter((c) => !c.ok).map((c) => c.label).slice(0, 2).join(', ')}`, to: '/profile' })
    return { rd, rs, ai, ats, comp, match, upcoming, actions: actions.slice(0, 5) }
  }, [rec])

  const role = d.rd.role
  const ratio = (role.demand.supply / role.demand.openings).toFixed(1)
  // Real mode: history.weeks holds actual week-start dates (see careerlens-backend's
  // historyStore.ts) since points only exist for weeks the user actually visited the app — gaps
  // are real gaps, not zero-filled. Mock mode has no `weeks` array, so fall back to its own
  // fixed cadence (readiness = monthly checkpoints, hours/solved = last-N-weeks by index).
  const months = useMemo(() => lastNMonths(rec.history.readiness.length), [rec.history.readiness.length])
  const weekLabel = (i) => (rec.history.weeks ? fmtDate(rec.history.weeks[i]) : `W${i + 1}`)
  const trend = rec.history.readiness.map((v, i) => ({ month: rec.history.weeks ? weekLabel(i) : months[i], score: v }))
  const weekly = rec.history.weeklyHours.map((h, i) => ({ week: weekLabel(i), hours: h, solved: rec.history.weeklySolved[i] }))
  const paceBadge = { ahead: ['green', 'Ahead of plan'], 'on-track': ['green', 'On track'], 'slightly-behind': ['amber', 'Slightly behind'], behind: ['red', 'Behind schedule'] }[d.rs.pace]

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
        subtitle={`${rec.profile.headline}`}
        actions={<Button icon={MapIcon} onClick={() => nav('/roadmap')}>Open my roadmap</Button>}
      />

      {/* India reality strip */}
      <motion.div className="reality" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <RealityArt />
        <div className="reality-left">
          <div className="reality-tag"><Sparkles size={14} /> The reality you are competing in</div>
          <div className="reality-nums">
            <div><b><Counter to={INDIA_GAP.graduatesPerYear / 100} suffix=" lakh" /></b><span>engineering graduates / year</span></div>
            <div className="reality-vs">for</div>
            <div><b className="teal"><Counter to={INDIA_GAP.entryOpenings / 100} suffix=" lakh" /></b><span>entry-level openings</span></div>
          </div>
        </div>
        <div className="reality-right">
          <div className="small" style={{ color: '#a9c4da' }}>Your target: <b style={{ color: '#fff' }}>{role.title}</b></div>
          <div className="reality-ratio"><Counter to={+ratio} suffix=" : 1" decimals={1} /></div>
          <div className="small" style={{ color: '#a9c4da' }}>graduates trained per opening. Standing out matters more than ever.</div>
        </div>
      </motion.div>
      <div className="mt8"><Disclaimer>{INDIA_GAP.note}</Disclaimer></div>

      <Card delay={1} pad={false} className="metric-strip">
        {[
          { icon: Send, label: 'Applications', value: d.ai.total, sub: `${d.ai.responseRate}% response rate`, tone: 'blue' },
          { icon: CalendarCheck, label: 'Interviews', value: d.ai.interviews, sub: d.upcoming[0] ? `next ${fmtDate(d.upcoming[0].interviewDate)}` : 'none scheduled', tone: 'green' },
          { icon: MapIcon, label: 'Roadmap progress', value: d.rs.progress, suffix: '%', sub: `planned ${d.rs.planned}%`, tone: 'purple' },
          { icon: Flame, label: 'Coding streak', value: rec.profile.external.leetcode.streak || 0, suffix: ' days', sub: `${rec.profile.external.leetcode.solved} solved`, tone: 'amber' },
        ].map((m) => (
          <div key={m.label} className="metric-item">
            <div className={`stat-icon tone-${m.tone}`}><m.icon size={20} /></div>
            <div>
              <div className="stat-label">{m.label}</div>
              <div className="stat-value"><Counter to={m.value} suffix={m.suffix || ''} /></div>
              <div className="stat-sub muted">{m.sub}</div>
            </div>
          </div>
        ))}
      </Card>

      <Card delay={2} className="mt16">
        <div className="dash-overview-grid">
          <div>
            <CardTitle icon={TrendingUp}>Career readiness</CardTitle>
            <div className="row gap16">
              <Ring value={d.rd.score} size={132} color={colorOf(d.rd.score)} sub="out of 100" />
              <div className="stack gap8" style={{ flex: 1 }}>
                {d.rd.parts.map((p, i) => (
                  <div key={p.key}>
                    <div className="row between tiny"><span className="muted">{p.key}</span><b>{p.value}</b></div>
                    <Bar value={p.value} height={6} color={colorOf(p.value)} delay={0.1 * i} />
                  </div>
                ))}
              </div>
            </div>
            <div className="row gap8 mt12 wrap"><Badge tone={paceBadge[0]}>{paceBadge[1]}</Badge><Badge tone="teal">Skill match {d.rd.match}% for {role.title}</Badge></div>
          </div>

          <div className="dash-overview-col">
            <div className="bold small mb8">Readiness trend</div>
            <div style={{ height: 130 }}>
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ left: -20, right: 6, top: 8 }}>
                  <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#84cc16" stopOpacity={0.5} /><stop offset="100%" stopColor="#84cc16" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke="#84cc16" strokeWidth={3} fill="url(#g1)" animationDuration={1400} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bold small mb8 mt16">Weekly effort</div>
            <div style={{ height: 130 }}>
              <ResponsiveContainer>
                <BarChart data={weekly} margin={{ left: -20, right: 6, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip />
                  <RBar dataKey="hours" name="Study hours" fill="var(--text)" radius={[6, 6, 0, 0]} animationDuration={1200} />
                  <RBar dataKey="solved" name="Problems solved" fill="#84cc16" radius={[6, 6, 0, 0]} animationDuration={1200} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid g-main mt16">
        <Card delay={3}>
          <CardTitle icon={Sparkles}>Your next best actions</CardTitle>
          <div className="stack gap8">
            {d.actions.map((a, i) => (
              <motion.div key={a.title} className="action-row" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.07 }} whileHover={{ x: 4 }} onClick={() => nav(a.to)}>
                <div className={`stat-icon tone-${a.tone}`} style={{ width: 40, height: 40 }}><a.icon size={19} /></div>
                <div style={{ flex: 1 }}><div className="bold">{a.title}</div><div className="muted small">{a.desc}</div></div>
                <ArrowRight size={18} className="muted" />
              </motion.div>
            ))}
          </div>
        </Card>

        <Card delay={4}>
          <CardTitle>Market pulse for you</CardTitle>
          <div className="stack gap12">
            {[...ROLES].sort((a, b) => a.demand.supply / a.demand.openings - b.demand.supply / b.demand.openings).slice(0, 5).map((r, i) => {
              const c = r.demand.supply / r.demand.openings
              return (
                <div key={r.id}>
                  <div className="row between small"><span>{r.emoji} {r.title} {r.id === role.id && <Badge tone="teal">your target</Badge>}</span><b>{c.toFixed(1)} : 1</b></div>
                  <Bar value={100 - c * 6} color={c < 5 ? '#10b981' : c < 9 ? '#f59e0b' : '#ef4444'} delay={0.08 * i} />
                </div>
              )
            })}
            <div className="muted tiny">Lower ratio means less competition per opening. Illustrative data.</div>
            <Button variant="outline" size="sm" onClick={() => nav('/lab')}>Explore pivots in Innovation Lab <ArrowRight size={14} /></Button>
          </div>
        </Card>
      </div>
    </>
  )
}
