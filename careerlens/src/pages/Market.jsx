import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bar as RBar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Newspaper, Search, Heart, MapPin, Users, Clock, Briefcase, TrendingDown, Building, GraduationCap, Send, ArrowRight, Flame, Sparkles, Star } from 'lucide-react'
import { useAuth, useData, useToast } from '../context/AppContext'
import { Badge, Bar, Button, Card, CardTitle, Chip, Disclaimer, PageHeader, Skeleton, Tabs, useAsync, colorOf } from '../components/ui'
import { marketApi, applicationsApi, jobMatch, timingAdvice, pivotFinder, skillLevel, canonicalSkill } from '../api'
import { USE_MOCK } from '../api/http'
import { ROLES } from '../data/roles'
import { timeAgo } from '../utils/dates'

const TABS = [
  { id: 'openings', label: 'Latest openings', icon: Briefcase },
  { id: 'layoffs', label: 'Layoffs', icon: TrendingDown },
  { id: 'news', label: 'Market news', icon: Newspaper },
  { id: 'placements', label: 'Placements', icon: GraduationCap },
]

// Original flat-color block mosaic (not a copied illustration) — a playful accent in the app's
// own palette, used on the jobs/placements sections only.
const MOSAIC_COLORS = ['#c3e94f', '#f4511e', '#0a0a0a', '#fbbf24', '#3b82f6', '#8f9463', '#84cc16', '#14170a']
function Mosaic() {
  return (
    <div className="mosaic">
      {MOSAIC_COLORS.map((c, i) => (
        <div key={i} className="mosaic-cell" style={{ background: c }}>
          {i === 2 && <Star size={16} fill="currentColor" />}
          {i === 5 && <Sparkles size={16} />}
        </div>
      ))}
    </div>
  )
}

function OliveBanner({ title, subtitle }) {
  return (
    <div className="olive-banner">
      <div><b>{title}</b><span>{subtitle}</span></div>
      <Mosaic />
    </div>
  )
}

export default function Market() {
  const [params] = useSearchParams()
  const [tab, setTab] = useState('openings')
  return (
    <>
      <PageHeader title="Job Market Portal" subtitle="Latest openings, layoffs, news and campus placement trends in one place." icon={Newspaper} />
      <Disclaimer>Job listings and news/layoff headlines are live (Adzuna, GNews) where available, with sample fictional-company data as a fallback. Placements, the hiring-trend index and micro-gigs remain illustrative: no public dataset exists for those.</Disclaimer>
      <div className="mt16"><Tabs id="market" tabs={TABS} value={tab} onChange={setTab} /></div>
      {tab === 'openings' && <Openings initialQ={params.get('q') || ''} />}
      {tab === 'layoffs' && <Layoffs />}
      {tab === 'news' && <News />}
      {tab === 'placements' && <Placements />}
    </>
  )
}

function Openings({ initialQ }) {
  const { user } = useAuth()
  const { rec, run, userId } = useData()
  const toast = useToast()
  const isCompany = user.role === 'company'
  const { loading, data: jobs } = useAsync(() => marketApi.getJobs(), [])
  const [q, setQ] = useState(initialQ)
  const [roleId, setRoleId] = useState('all')
  const [mode, setMode] = useState('All')
  const [sort, setSort] = useState('match')
  const skills = rec.profile?.skills || []
  const applied = new Set((rec.applications || []).map((a) => `${a.company}|${a.role}`))

  const list = useMemo(() => {
    if (!jobs) return []
    return jobs
      .filter((j) => (roleId === 'all' || j.roleId === roleId) && (mode === 'All' || j.mode === mode) &&
        (!q || `${j.title} ${j.company} ${j.skills.join(' ')} ${j.location}`.toLowerCase().includes(q.toLowerCase())))
      .map((j) => { const match = isCompany ? 0 : jobMatch(skills, j); return { ...j, match, adv: timingAdvice(j, match) } })
      .sort((a, b) => (sort === 'match' ? b.match - a.match : a.posted - b.posted))
  }, [jobs, q, roleId, mode, sort, skills, isCompany])

  const apply = async (j) => {
    await run(applicationsApi.addApplication(userId, { company: j.company, role: j.title, source: j.source }))
    toast(`Applied to ${j.company}`, { desc: 'Added to your Application Tracker.' })
  }
  const save = (j) => run(marketApi.toggleSavedJob(userId, j.id))

  return (
    <>
      <OliveBanner title="Fresh openings, every day" subtitle="Real listings from Adzuna, matched to your skills." />
      <div className="filters">
        <div className="search-inline"><Search size={16} /><input className="input" placeholder="Search title, company, skill, city..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="select" style={{ width: 200 }} value={roleId} onChange={(e) => setRoleId(e.target.value)}><option value="all">All roles</option>{ROLES.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select>
        {['All', 'Remote', 'Hybrid', 'On-site'].map((m) => <Chip key={m} active={mode === m} onClick={() => setMode(m)}>{m}</Chip>)}
        {!isCompany && <select className="select" style={{ width: 150 }} value={sort} onChange={(e) => setSort(e.target.value)}><option value="match">Best match</option><option value="new">Newest</option></select>}
      </div>
      <div className="stack gap12 mt16">
        {loading && [1, 2, 3].map((k) => <Skeleton key={k} h={110} />)}
        {list.map((j, i) => (
          <Card key={j.id} hover delay={i} className="job-card">
            <div className="row gap16 wrap">
              <div className="job-logo lg">{j.company[0]}</div>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div className="row gap8 wrap"><h3>{j.title}</h3>{j.posted <= 2 && <Badge tone="green" icon={Flame}>New</Badge>}{j.type === 'Internship' && <Badge tone="purple">Internship</Badge>}{j.closesIn && <Badge tone="red">Closes in {j.closesIn}d</Badge>}</div>
                <div className="muted small row gap12 wrap mt4"><span><Building size={13} /> {j.company}</span><span><MapPin size={13} /> {j.location} · {j.mode}</span><span><Briefcase size={13} /> {j.exp}</span><span>💰 {j.salary}</span></div>
                <div className="row wrap gap4 mt8">{j.skills.map((s) => { const has = !isCompany && skillLevel(skills, canonicalSkill(s)) >= 50; return <span key={s} className={`chip ${has ? 'chip-have' : ''}`}>{s}</span> })}</div>
                {!isCompany && <div className={`advice advice-${j.adv.tone} mt8`}>{j.adv.verdict}</div>}
                <div className="muted tiny row gap12 mt8"><span><Clock size={12} /> {timeAgo(j.posted)}</span>{j.applicants != null && <span><Users size={12} /> {j.applicants} applicants</span>}<span>via {j.source}</span>{j.applyUrl && <a href={j.applyUrl} target="_blank" rel="noreferrer" className="icon-teal bold">View posting ↗</a>}</div>
              </div>
              {!isCompany && (
                <div className="job-side">
                  <div className="match-badge" style={{ '--c': colorOf(j.match) }}><b>{j.match}%</b><span>match</span></div>
                  <div className="row gap8">
                    <button className={`icon-btn heart ${rec.savedJobs.includes(j.id) ? 'on' : ''}`} onClick={() => save(j)}><Heart size={18} fill={rec.savedJobs.includes(j.id) ? '#ef4444' : 'none'} /></button>
                    <Button size="sm" icon={Send} disabled={applied.has(`${j.company}|${j.title}`)} onClick={() => apply(j)}>{applied.has(`${j.company}|${j.title}`) ? 'Applied' : 'Apply'}</Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
        {!loading && list.length === 0 && <Card><div className="empty"><Search size={30} /><b>No openings match</b><span className="muted small">Try clearing filters.</span></div></Card>}
      </div>
    </>
  )
}

function Layoffs() {
  const nav = useNavigate()
  const { user } = useAuth()
  const { rec } = useData()
  const { loading, data } = useAsync(() => marketApi.getLayoffs(), [])
  const pivots = useMemo(() => (rec.profile ? pivotFinder(rec.profile.skills, rec.profile.targetRoleId).slice(0, 3) : []), [rec.profile])
  if (loading) return <Skeleton h={300} />

  // Real mode returns { news: [...] } — actual headlines, no fabricated employee/percentage
  // numbers attached to real companies. Mock mode keeps the old structured sample chart, since
  // its companies are clearly fictional (see data/market.js).
  const isReal = Array.isArray(data.news)

  return (
    <div className="grid g-main">
      <div className="stack gap16">
        {isReal ? (
          <Card>
            <CardTitle icon={TrendingDown} right={<Badge tone="gray">Real headlines</Badge>}>Recent layoff news</CardTitle>
            <div className="stack gap12">
              {data.news.length === 0 && <div className="empty"><span className="muted small">No recent layoff headlines found.</span></div>}
              {data.news.map((n, i) => (
                <motion.a key={n.id} href={n.url} target="_blank" rel="noreferrer" className="layoff" style={{ textDecoration: 'none', color: 'inherit' }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="job-logo sm" style={{ background: '#ef4444' }}>{n.source[0]}</div>
                  <div style={{ flex: 1 }}><div className="bold">{n.title}</div>{n.summary && <div className="muted small mt4">{n.summary}</div>}</div>
                  <div style={{ textAlign: 'right' }}><div className="muted tiny">{n.source}</div><div className="muted tiny">{timeAgo(n.daysAgo)}</div></div>
                </motion.a>
              ))}
            </div>
          </Card>
        ) : (
          <>
            <Card>
              <CardTitle icon={TrendingDown} right={<Badge tone="red">{data.layoffs.reduce((s, l) => s + l.employees, 0).toLocaleString()} affected (sample)</Badge>}>Layoffs by sector</CardTitle>
              <div style={{ height: 240 }}>
                <ResponsiveContainer><BarChart data={data.bySector} layout="vertical" margin={{ left: 20, right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" /><XAxis type="number" fontSize={12} tickLine={false} axisLine={false} /><YAxis dataKey="sector" type="category" fontSize={12} tickLine={false} axisLine={false} width={90} /><Tooltip /><RBar dataKey="affected" fill="#ef4444" radius={[0, 6, 6, 0]} animationDuration={1200} /></BarChart></ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <CardTitle>Recent layoff events</CardTitle>
              <div className="stack gap12">
                {data.layoffs.map((l, i) => (
                  <motion.div key={l.id} className="layoff" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className="job-logo sm" style={{ background: '#ef4444' }}>{l.company[0]}</div>
                    <div style={{ flex: 1 }}><div className="bold">{l.company} <Badge tone="gray">{l.sector}</Badge></div><div className="muted small">{l.note}</div><div className="row wrap gap4 mt8">{l.roles.map((r) => <Badge key={r} tone="red">{r}</Badge>)}</div></div>
                    <div style={{ textAlign: 'right' }}><div className="bold">{l.employees}</div><div className="muted tiny">{l.pct}% of staff</div><div className="muted tiny">{timeAgo(l.daysAgo)}</div></div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
      <Card>
        <CardTitle>{user.role === 'company' ? 'Hiring opportunity' : 'If your role is affected'}</CardTitle>
        <p className="small muted mb12">{user.role === 'company' ? 'Laid-off engineers are available with real experience. Search Talent Match with the skills you need.' : 'Based on your skills, these roles need the smallest reskilling jump:'}</p>
        {user.role !== 'company' && <div className="stack gap12">{pivots.map((p) => <div key={p.role.id}><div className="row between small"><b>{p.role.emoji} {p.role.title}</b><span>{p.match}% match</span></div><Bar value={p.match} /></div>)}</div>}
        <div className="mt16"><Button variant="outline" onClick={() => nav('/lab')}>Open Layoff & Automation Shield <ArrowRight size={14} /></Button></div>
      </Card>
    </div>
  )
}

const TONE = { good: 'green', warn: 'amber', bad: 'red' }
function News() {
  const { loading, data } = useAsync(() => marketApi.getNews(), [])
  const trend = useAsync(() => marketApi.getHiringTrend(), [])
  return (
    <div className="grid g-main-l">
      <Card>
        <CardTitle>{USE_MOCK ? 'Hiring index by track (12 months ago = 100)' : 'Hiring signal by track'}</CardTitle>
        <div style={{ height: 300 }}>
          {trend.data && <ResponsiveContainer><LineChart data={trend.data} margin={{ left: -15, right: 10 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" /><XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} domain={USE_MOCK ? [85, 150] : ['auto', 'auto']} /><Tooltip /><Legend />
            <Line dataKey="Cloud" stroke="#84cc16" strokeWidth={3} dot={false} /><Line dataKey="ML" stroke="#6366f1" strokeWidth={3} dot={false} /><Line dataKey="Android" stroke="#f59e0b" strokeWidth={3} dot={false} /><Line dataKey="Fullstack" stroke="#ef4444" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer>}
        </div>
        <div className="muted tiny">{USE_MOCK ? 'Sample index. Cloud and ML hiring grows while generic full stack is flat.' : 'Live count of open Adzuna listings matching each track, tracked once per day. New tracks start thin and build up real history over time.'}</div>
      </Card>
      <div className="stack gap12">
        {loading && [1, 2, 3].map((k) => <Skeleton key={k} h={90} />)}
        {data?.map((n, i) => (
          <Card key={n.id} hover delay={i}>
            <div className="row between"><Badge tone={TONE[n.tone]}>{n.tag}</Badge><span className="muted tiny">{timeAgo(n.daysAgo)}</span></div>
            <h4 className="mt8">{n.title}</h4>
            <p className="muted small mt4">{n.summary}</p>
            <div className="row between mt8"><span className="tiny muted">{n.source}</span>{n.url && <a href={n.url} target="_blank" rel="noreferrer" className="tiny bold icon-teal">Read more ↗</a>}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function Placements() {
  const { loading, data } = useAsync(() => marketApi.getPlacements(), [])
  if (loading) return <Skeleton h={300} />
  return (
    <>
      <OliveBanner title="Where graduates actually land" subtitle="Graduate employability by college tier." />
      <div className="grid g2">
        <Card className="g-span">
          <CardTitle icon={GraduationCap}>Graduate employability by college tier</CardTitle>
          <div style={{ height: 250 }}>
            <ResponsiveContainer><BarChart data={data.byTier} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" /><XAxis dataKey="tier" fontSize={12} tickLine={false} axisLine={false} /><YAxis unit="%" fontSize={12} tickLine={false} axisLine={false} /><Tooltip formatter={(v) => `${v}%`} /><RBar dataKey="employability" name="Employability" fill="#84cc16" radius={[8, 8, 0, 0]} animationDuration={1200} /></BarChart></ResponsiveContainer>
          </div>
          <div className="row gap12 wrap">{data.byTier.map((t) => <Badge key={t.tier} tone="teal">{t.tier}: {t.employability}%</Badge>)}</div>
          <div className="mt12"><Disclaimer>{data.note}</Disclaimer></div>
        </Card>
      </div>
    </>
  )
}
