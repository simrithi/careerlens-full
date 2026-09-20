import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bar as RBar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FlaskConical, ThumbsUp, Play, Cloud, Volume2, ShieldCheck, Wallet, BadgeCheck, QrCode, ArrowRight } from 'lucide-react'
import { useAuth, useData, useToast } from '../context/AppContext'
import { Badge, Bar, Button, Card, Chip, Disclaimer, Modal, PageHeader, Ring, colorOf, resilienceTone, resilienceColor, useAsync } from '../components/ui'
import { FEATURES, MENTOR_SAMPLES, REJECTION_CIRCLE_SAMPLE } from '../data/features'
import { ROLES } from '../data/roles'
import { SEED } from '../data/seed'
import { featuresApi, marketApi, profileApi, pivotFinder, resilience } from '../api'

const STATUS = { live: ['green', 'Live demo'], prototype: ['amber', 'Prototype'], concept: ['gray', 'Concept'] }

export default function InnovationLab() {
  const { rec, run, userId } = useData()
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)
  const votes = rec.votes || {}
  const list = FEATURES.filter((f) => filter === 'all' || f.status === filter)

  return (
    <>
      <PageHeader title="Innovation Lab" subtitle="New ideas to attack the 10-lakh-graduates-for-1-lakh-jobs problem. Open the live demos; vote for what the team should build next." icon={FlaskConical} />
      <div className="lab-hero">
        <div><b>{FEATURES.length} ideas</b><span>across student, college and employer sides</span></div>
        <div><b>{FEATURES.filter((f) => f.status === 'live').length} live demos</b><span>interactive right now</span></div>
        <div><b>{Object.values(votes).filter(Boolean).length} votes</b><span>from you so far</span></div>
      </div>
      <div className="row gap8 mt16 mb16 wrap">
        {[['all', 'All'], ['live', 'Live demos'], ['prototype', 'Prototypes'], ['concept', 'Concepts']].map(([id, l]) => <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>{l}</Chip>)}
      </div>
      <div className="grid g3">
        {list.map((f, i) => (
          <Card key={f.id} hover delay={i} className="feat">
            <div className="row between"><div className="feat-emoji">{f.emoji}</div><Badge tone={STATUS[f.status][0]}>{STATUS[f.status][1]}</Badge></div>
            <h3 className="mt8">{f.title}</h3>
            <p className="muted small mt4">{f.tagline}</p>
            <div className="mt8"><Badge tone="teal">Impact: {f.impact}</Badge></div>
            <div className="row between mt16">
              <button className={`vote ${votes[f.id] ? 'on' : ''}`} onClick={() => run(featuresApi.toggleVote(userId, f.id))}><ThumbsUp size={15} /> {votes[f.id] ? 'Voted' : 'Vote'}</button>
              <Button size="sm" variant={f.status === 'live' ? 'primary' : 'outline'} icon={f.status === 'live' ? Play : undefined} onClick={() => setOpen(f)}>{f.status === 'live' ? 'Try it' : 'Preview'}</Button>
            </div>
          </Card>
        ))}
      </div>
      <FeatureModal feature={open} onClose={() => setOpen(null)} />
    </>
  )
}

function FeatureModal({ feature, onClose }) {
  return (
    <Modal open={!!feature} onClose={onClose} title={feature ? `${feature.emoji} ${feature.title}` : ''} width={920}>
      {feature && (
        <div className="stack gap16">
          <div className="grid g3" style={{ gap: 12 }}>
            <div className="mini-box"><b>The problem</b><span>{feature.problem}</span></div>
            <div className="mini-box"><b>How it works</b><span>{feature.how}</span></div>
            <div className="mini-box"><b>AWS services</b><span className="row wrap gap4">{feature.aws.map((a) => <Badge key={a} tone="blue" icon={Cloud}>{a}</Badge>)}</span></div>
          </div>
          {feature.id === 'pivot' && <PivotDemo />}
          {feature.id === 'gap' && <GapDemo />}
          {feature.id === 'gigs' && <GigsDemo onClose={onClose} />}
          {feature.id === 'mentor' && <MentorDemo />}
          {feature.id === 'shield' && <ShieldDemo />}
          {feature.id === 'circles' && <CirclesDemo />}
          {feature.id === 'passport' && <PassportDemo />}
          {!['pivot', 'gap', 'gigs', 'mentor', 'shield', 'circles', 'passport'].includes(feature.id) && (
            <div className="concept-note"><b>Concept card.</b> This idea is documented for the team but not built yet. Vote for it if you want it prioritised.</div>
          )}
        </div>
      )}
    </Modal>
  )
}

// A company account has no student profile, so demos fall back to a sample student.
function useSkills() {
  const { user } = useAuth()
  const { rec } = useData()
  return user.role === 'company' ? { skills: SEED.ananya.profile.skills, target: 'android', sample: true } : { skills: rec.profile.skills, target: rec.profile.targetRoleId, sample: false }
}

function PivotDemo() {
  const { skills, target, sample } = useSkills()
  const { run, userId } = useData()
  const toast = useToast()
  const list = useMemo(() => pivotFinder(skills, target), [skills, target])
  return (
    <div>
      {sample && <Disclaimer>Showing a sample student because you are logged in as a company.</Disclaimer>}
      <p className="muted small mb12">Opportunity = skill match (60%) + low competition (40%) + demand growth. The highest bars are where you can win fastest.</p>
      <div className="stack gap12">
        {list.map((p, i) => (
          <motion.div key={p.role.id} className={`pivot ${p.isCurrent ? 'current' : ''}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
            <span className="rank-n">{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div className="row between"><b>{p.role.emoji} {p.role.title} {p.isCurrent && <Badge tone="teal">current target</Badge>}</b><span className="row gap8"><Badge tone={p.match >= 70 ? 'green' : 'amber'}>{p.match}% ready</Badge><Badge tone={p.competition < 6 ? 'green' : p.competition < 10 ? 'amber' : 'red'}>{p.competition}:1 competition</Badge></span></div>
              <Bar value={p.opportunity} color={colorOf(p.opportunity)} delay={i * 0.06} />
              <div className="muted tiny mt4">Opportunity score {p.opportunity} · {p.missing.length ? `close: ${p.missing.map((m) => m.name).join(', ')}` : 'no major gaps'}</div>
            </div>
            {!sample && !p.isCurrent && <Button size="sm" variant="outline" onClick={async () => { await run(profileApi.updateProfile(userId, { targetRoleId: p.role.id })); toast(`Target switched to ${p.role.title}`) }}>Target</Button>}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function GapDemo() {
  const [sort, setSort] = useState('ratio')
  const rows = useMemo(() => ROLES.map((r) => ({ name: r.title.replace(' Engineer', '').replace(' Developer', ''), full: r.title, Graduates: r.demand.supply, Openings: r.demand.openings, ratio: +(r.demand.supply / r.demand.openings).toFixed(1) })).sort((a, b) => (sort === 'ratio' ? b.ratio - a.ratio : b.Graduates - a.Graduates)), [sort])
  return (
    <div>
      <div className="row gap8 mb12"><Chip active={sort === 'ratio'} onClick={() => setSort('ratio')}>Sort by competition</Chip><Chip active={sort === 'grads'} onClick={() => setSort('grads')}>Sort by graduates</Chip></div>
      <div style={{ height: 300 }}>
        <ResponsiveContainer><BarChart data={rows} margin={{ left: -10 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" /><XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} unit="k" /><Tooltip /><Legend />
          <RBar dataKey="Graduates" fill="var(--text)" radius={[6, 6, 0, 0]} animationDuration={1000} /><RBar dataKey="Openings" fill="#84cc16" radius={[6, 6, 0, 0]} animationDuration={1300} /></BarChart></ResponsiveContainer>
      </div>
      <div className="grid g4 mt12" style={{ gap: 10 }}>
        {rows.slice(0, 4).map((r) => <div key={r.full} className="mini-box"><b>{r.full}</b><span><b style={{ fontSize: 20 }}>{r.ratio} : 1</b> graduates per opening</span></div>)}
      </div>
      <div className="mt12"><Disclaimer>Illustrative data in thousands per year. Sources to plug in: AICTE intake, NASSCOM, PLFS and job-portal demand APIs.</Disclaimer></div>
    </div>
  )
}

function GigsDemo({ onClose }) {
  const { user } = useAuth()
  const { rec, run, userId } = useData()
  const toast = useToast()
  const nav = useNavigate()
  const { data } = useAsync(() => marketApi.getGigs(), [])
  const taken = new Set(rec.roadmap?.phases.flatMap((p) => p.milestones).map((m) => m.gigId).filter(Boolean) || [])
  const accept = async (g) => {
    await marketApi.applyToGig(userId, g.id)
    await run(featuresApi.acceptGig(userId, g))
    toast('Gig accepted', { desc: 'An experience milestone was added to your roadmap.' })
  }
  return (
    <div className="stack gap12">
      <p className="muted small">Small paid tasks from real companies. Completing one adds verified experience to your roadmap and profile.</p>
      {data?.map((g) => (
        <div key={g.id} className="gig">
          <div className="job-logo sm">{g.company[0]}</div>
          <div style={{ flex: 1 }}><div className="bold">{g.title}</div><div className="muted small">{g.company} · {g.skill} · {g.hours}h · {g.slotsRemaining > 0 ? `${g.slotsRemaining} of ${g.slots} slots left` : 'Full'}</div></div>
          <div style={{ textAlign: 'right' }}><div className="bold row gap4"><Wallet size={14} /> ₹{g.reward.toLocaleString('en-IN')}</div><Badge tone="gray">{g.level}</Badge></div>
          {user.role !== 'company' && (taken.has(g.id)
            ? <Button size="sm" variant="outline" onClick={() => { onClose(); nav('/roadmap') }}>In roadmap <ArrowRight size={14} /></Button>
            : g.slotsRemaining > 0 ? <Button size="sm" onClick={() => accept(g)}>Accept</Button> : <Badge tone="gray">Full</Badge>)}
        </div>
      ))}
    </div>
  )
}

const LANG_CODE = { English: 'en-IN', 'हिन्दी': 'hi-IN', 'தமிழ்': 'ta-IN', 'తెలుగు': 'te-IN', 'ಕನ್ನಡ': 'kn-IN' }
function MentorDemo() {
  const [lang, setLang] = useState('English')
  const [shown, setShown] = useState('')
  const text = MENTOR_SAMPLES[lang]
  useEffect(() => {
    setShown('')
    let i = 0
    const t = setInterval(() => { i += 1; setShown(text.slice(0, i)); if (i >= text.length) clearInterval(t) }, 22)
    return () => clearInterval(t)
  }, [text])
  const speak = () => {
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = LANG_CODE[lang]
      window.speechSynthesis.speak(u)
    } catch { /* browser without TTS */ }
  }
  return (
    <div>
      <div className="row gap8 wrap mb12">{Object.keys(MENTOR_SAMPLES).map((l) => <Chip key={l} active={l === lang} onClick={() => setLang(l)}>{l}</Chip>)}</div>
      <div className="chat">
        <div className="bubble bot">🤖 <span>{shown}<span className="caret" /></span></div>
      </div>
      <div className="row gap8 mt12"><Button icon={Volume2} onClick={speak}>Listen</Button><span className="muted tiny">Uses your browser voice if available. Production uses Amazon Translate + Polly (and Transcribe for spoken replies).</span></div>
    </div>
  )
}

function ShieldDemo() {
  const { skills, target } = useSkills()
  const [sel, setSel] = useState(target)
  const rows = useMemo(() => ROLES.map((r) => ({ r, ...resilience(r) })).sort((a, b) => b.score - a.score), [])
  const cur = rows.find((x) => x.r.id === sel)
  const pivots = useMemo(() => pivotFinder(skills, sel).filter((p) => !p.isCurrent).map((p) => ({ ...p, res: resilience(p.role).score })).filter((p) => p.res > cur.score).slice(0, 3), [skills, sel, cur.score])
  return (
    <div className="grid g2">
      <div className="stack gap12">
        {rows.map((x, i) => (
          <div key={x.r.id} className={`pivot ${x.r.id === sel ? 'current' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setSel(x.r.id)}>
            <div style={{ flex: 1 }}><div className="row between small"><b>{x.r.emoji} {x.r.title}</b><Badge tone={resilienceTone(x.score)}>{x.label} · {x.score}</Badge></div><Bar value={x.score} color={resilienceColor(x.score)} delay={i * 0.05} /></div>
          </div>
        ))}
      </div>
      <Card pad style={{ boxShadow: 'none' }}>
        <div className="row gap16"><Ring value={cur.score} size={100} color={resilienceColor(cur.score)} sub={cur.label} /><div><b>{cur.r.title}</b><div className="muted small mt4">Automation risk {cur.r.automationRisk}% · demand growth +{cur.r.demand.growth}% · {(cur.r.demand.supply / cur.r.demand.openings).toFixed(1)}:1 competition</div></div></div>
        <div className="bold small mt16 mb8"><ShieldCheck size={15} style={{ verticalAlign: -3 }} /> Safer moves from your skills</div>
        {pivots.length === 0 ? <div className="muted small">This is already among the most resilient roles. Keep deepening your skills.</div> : pivots.map((p) => <div key={p.role.id} className="row between small mb8"><span>{p.role.emoji} {p.role.title}</span><span className="row gap8"><Badge tone="green">safety {p.res}</Badge><Badge tone="gray">{p.match}% ready</Badge></span></div>)}
        <div className="muted tiny mt12">Resilience combines automation risk, demand growth and competition. Illustrative weights for the demo.</div>
      </Card>
    </div>
  )
}

function CirclesDemo() {
  return (
    <div>
      <p className="muted small mb12">Sample output: why 1,240 candidates (anonymised) were rejected by product companies for Android roles.</p>
      <div className="stack gap12">
        {REJECTION_CIRCLE_SAMPLE.map((r, i) => <div key={r.reason}><div className="row between small"><span>{r.reason}</span><b>{r.pct}%</b></div><Bar value={r.pct * 2.5} color="#ef4444" delay={i * 0.08} height={10} /></div>)}
      </div>
      <div className="mt12"><Disclaimer>Sample numbers for illustration. Real data would be opt-in, anonymised, PII-masked and shown only above a minimum group size.</Disclaimer></div>
    </div>
  )
}

function PassportDemo() {
  const { skills, sample } = useSkills()
  const { rec } = useData()
  const { user } = useAuth()
  const name = sample ? 'Ananya Iyer' : user.name
  const verified = skills.filter((s) => s.verified)
  return (
    <div className="passport">
      <div className="passport-head"><BadgeCheck size={20} /> CareerLens Skill Passport</div>
      <div className="row gap16 wrap">
        <div style={{ flex: 1, minWidth: 240 }}>
          <h3>{name}</h3>
          <div className="muted small">{sample ? SEED.ananya.profile.headline : rec.profile.headline}</div>
          <div className="bold small mt12">Verified skills</div>
          <div className="row wrap gap4 mt8">{verified.map((s) => <Badge key={s.name} tone="teal" icon={BadgeCheck}>{s.name} {s.level}%</Badge>)}</div>
          <div className="muted tiny mt12">Each badge links to its evidence: repo analysis, assessment result or certificate.</div>
        </div>
        <div className="qr"><QrCode size={90} /><span className="tiny muted">Share link</span></div>
      </div>
    </div>
  )
}
