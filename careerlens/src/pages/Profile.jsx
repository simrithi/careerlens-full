import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import {
  User, Wrench, GraduationCap, Briefcase, Award, FolderGit2, Code2, FileText, Plus, Trash2, BadgeCheck, MapPin, Pencil, GitBranch, Trophy, ExternalLink, RefreshCw,
} from 'lucide-react'
import { useAuth, useData, useToast } from '../context/AppContext'
import { Badge, Bar, Button, Card, CardTitle, Chip, Field, Modal, PageHeader, Ring, Tabs, colorOf } from '../components/ui'
import { FormModal, ResumeUploader } from '../components/Forms'
import { profileApi, profileCompleteness } from '../api'
import { ALL_SKILLS } from '../data/roles'
import { fmtDateLong } from '../utils/dates'

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'skills', label: 'Skills', icon: Wrench },
  { id: 'background', label: 'Education & Experience', icon: GraduationCap },
  { id: 'projects', label: 'Projects', icon: FolderGit2 },
  { id: 'coding', label: 'Coding profiles', icon: Code2 },
  { id: 'resume', label: 'Resume', icon: FileText },
]

export default function Profile() {
  const { user } = useAuth()
  const { rec } = useData()
  const [tab, setTab] = useState('overview')
  const p = rec.profile
  const comp = useMemo(() => profileCompleteness(p), [p])

  return (
    <>
      <PageHeader title="My Profile" subtitle="Everything here feeds your fit score, roadmap and resume analysis." icon={User} />
      <Card className="profile-hero">
        <div className="row gap16 wrap">
          <div className="profile-avatar" style={{ background: user.color }}>{user.name.split(' ').map((w) => w[0]).join('')}</div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h2 style={{ fontSize: 22 }}>{user.name}</h2>
            <div className="muted">{p.headline}</div>
            <div className="row gap8 mt8 wrap small muted"><MapPin size={14} />{user.location}<span>·</span>{user.college || 'Independent'}</div>
          </div>
          <div className="row gap12">
            <Ring value={comp.score} size={84} stroke={9} color={colorOf(comp.score)} sub="complete" />
          </div>
        </div>
      </Card>
      <div className="mt16">
        <Tabs id="profile" tabs={TABS} value={tab} onChange={setTab} />
        {tab === 'overview' && <Overview comp={comp} />}
        {tab === 'skills' && <Skills />}
        {tab === 'background' && <Background />}
        {tab === 'projects' && <Projects />}
        {tab === 'coding' && <Coding />}
        {tab === 'resume' && <ResumeTab />}
      </div>
    </>
  )
}

/* ---------- Overview + progression timeline ---------- */
function Overview({ comp }) {
  const { rec, run, userId } = useData()
  const toast = useToast()
  const p = rec.profile
  const [about, setAbout] = useState(p.about)
  const [headline, setHeadline] = useState(p.headline)
  const [saving, setSaving] = useState(false)

  const timeline = useMemo(() => {
    const ev = []
    p.education.forEach((e) => ev.push({ k: e.id, when: e.year, sort: parseInt(e.year, 10) || 0, icon: GraduationCap, tone: 'blue', title: e.degree, sub: `${e.school} · ${e.score}` }))
    p.experience.forEach((e) => ev.push({ k: e.id, when: `${e.from} - ${e.to}`, sort: parseInt(e.from, 10) || 0, icon: Briefcase, tone: 'amber', title: e.role, sub: e.company }))
    p.certifications.forEach((c) => ev.push({ k: c.id, when: c.date, sort: parseInt(c.date, 10) || 0, icon: Award, tone: 'purple', title: c.name, sub: `${c.issuer} · ${c.status}` }))
    p.projects.forEach((x, i) => ev.push({ k: x.id, when: 'Project', sort: 2026 - i * 0.1, icon: FolderGit2, tone: 'teal', title: x.name, sub: x.tech.join(', ') }))
    rec.roadmap?.phases.flatMap((ph) => ph.milestones).filter((m) => m.done && m.doneAt).forEach((m) => ev.push({ k: m.id, when: fmtDateLong(m.doneAt), sort: new Date(m.doneAt).getFullYear() + new Date(m.doneAt).getMonth() / 12, icon: BadgeCheck, tone: 'green', title: `Completed: ${m.title}`, sub: 'Roadmap milestone' }))
    return ev.sort((a, b) => b.sort - a.sort).slice(0, 14)
  }, [p, rec.roadmap])

  const save = async () => {
    setSaving(true)
    await run(profileApi.updateProfile(userId, { about, headline }))
    setSaving(false)
    toast('Profile saved')
  }

  return (
    <div className="grid g-main">
      <div className="stack gap16">
        <Card>
          <CardTitle icon={User}>About you</CardTitle>
          <Field label="Headline"><input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} /></Field>
          <div className="mt12"><Field label="About"><textarea className="textarea" style={{ minHeight: 120 }} value={about} onChange={(e) => setAbout(e.target.value)} /></Field></div>
          <div className="row mt12"><Button onClick={save} loading={saving} disabled={about === p.about && headline === p.headline}>Save changes</Button></div>
        </Card>
        <Card>
          <CardTitle icon={BadgeCheck}>Progression timeline</CardTitle>
          <div className="timeline">
            {timeline.map((e, i) => (
              <motion.div key={e.k} className="tl-item" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <div className={`tl-dot tone-${e.tone}`}><e.icon size={15} /></div>
                <div><div className="bold small">{e.title}</div><div className="muted tiny">{e.sub}</div></div>
                <span className="tl-when muted tiny">{e.when}</span>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <CardTitle icon={BadgeCheck}>Profile completeness</CardTitle>
        <div className="stack gap8">
          {comp.checks.map((c) => (
            <div key={c.label} className="row between small">
              <span className={c.ok ? '' : 'muted'}>{c.ok ? '✅' : '⬜'} {c.label}</span>
              <Badge tone={c.ok ? 'green' : 'gray'}>+{c.pts}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ---------- Skills ---------- */
function Skills() {
  const { rec, run, userId } = useData()
  const toast = useToast()
  const [name, setName] = useState('')
  const [level, setLevel] = useState(50)
  const skills = [...rec.profile.skills].sort((a, b) => b.level - a.level)

  const add = async () => {
    if (!name.trim()) return
    await run(profileApi.upsertSkill(userId, { name: name.trim(), level: Number(level) }))
    toast(`${name.trim()} added`)
    setName('')
  }

  return (
    <div className="grid g-main">
      <Card>
        <CardTitle icon={Wrench} right={<span className="muted small">{skills.length} skills · drag to rate</span>}>Your skills</CardTitle>
        <div className="stack gap12">
          {skills.map((s, i) => (
            <motion.div key={s.name} className="skill-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <div className="row between small">
                <span className="bold">{s.name} {s.verified && <Badge tone="teal" icon={BadgeCheck}>Verified</Badge>}</span>
                <span className="row gap8"><b style={{ color: colorOf(s.level) }}>{s.level}%</b><button className="icon-btn" onClick={() => run(profileApi.removeSkill(userId, s.name))}><Trash2 size={14} /></button></span>
              </div>
              <input type="range" min={0} max={100} value={s.level} onChange={(e) => run(profileApi.upsertSkill(userId, { name: s.name, level: Number(e.target.value) }))} />
            </motion.div>
          ))}
        </div>
      </Card>
      <Card>
        <CardTitle icon={Plus}>Add a skill</CardTitle>
        <Field label="Skill name"><input className="input" list="skill-list" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kubernetes" /></Field>
        <datalist id="skill-list">{ALL_SKILLS.map((s) => <option key={s} value={s} />)}</datalist>
        <div className="mt12"><Field label={`Self-rated level: ${level}%`}><input type="range" min={0} max={100} value={level} onChange={(e) => setLevel(e.target.value)} /></Field></div>
        <div className="mt12"><Button icon={Plus} onClick={add} disabled={!name.trim()}>Add skill</Button></div>
        <div className="muted small mt16">Verified badges come from evidence: passed assessments, repo analysis or Credly badges (planned).</div>
      </Card>
    </div>
  )
}

/* ---------- Education, experience, certifications ---------- */
const EDU_FIELDS = [
  { key: 'school', label: 'College / School', required: true }, { key: 'degree', label: 'Degree', required: true },
  { key: 'year', label: 'Years', placeholder: '2023 - 2027' }, { key: 'score', label: 'CGPA / Percentage', placeholder: '8.4 CGPA' },
]
const EXP_FIELDS = [
  { key: 'company', label: 'Company / Organisation', required: true }, { key: 'role', label: 'Role', required: true },
  { key: 'from', label: 'From', placeholder: '2025' }, { key: 'to', label: 'To', placeholder: 'Present' },
  { key: 'summary', label: 'What did you do?', type: 'textarea', hint: 'Add numbers: users, speed-ups, team size.' },
]
const CERT_FIELDS = [
  { key: 'name', label: 'Certificate', required: true }, { key: 'issuer', label: 'Issuer', required: true },
  { key: 'date', label: 'Date (YYYY-MM)', placeholder: '2026-08' }, { key: 'status', label: 'Status', type: 'select', options: ['earned', 'in-progress', 'planned'] },
]

function Section({ title, icon, items, render, onAdd, onRemove, addLabel }) {
  return (
    <Card>
      <CardTitle icon={icon} right={<Button size="sm" variant="outline" icon={Plus} onClick={onAdd}>{addLabel}</Button>}>{title}</CardTitle>
      <div className="stack gap12">
        {items.length === 0 && <div className="muted small">Nothing added yet.</div>}
        {items.map((it) => (
          <div key={it.id} className="list-row">
            <div style={{ flex: 1 }}>{render(it)}</div>
            <button className="icon-btn" onClick={() => onRemove(it.id)}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Background() {
  const { rec, run, userId } = useData()
  const toast = useToast()
  const [modal, setModal] = useState(null)
  const p = rec.profile
  const cfg = {
    education: { title: 'Add education', fields: EDU_FIELDS },
    experience: { title: 'Add experience', fields: EXP_FIELDS },
    certifications: { title: 'Add certification', fields: CERT_FIELDS },
  }
  const remove = (sec) => (id) => run(profileApi.removeItem(userId, sec, id))
  return (
    <div className="stack gap16">
      <div className="grid g2">
        <Section title="Education" icon={GraduationCap} items={p.education} addLabel="Add" onAdd={() => setModal('education')} onRemove={remove('education')}
          render={(e) => <><div className="bold">{e.degree}</div><div className="muted small">{e.school} · {e.year} · {e.score}</div></>} />
        <Section title="Experience" icon={Briefcase} items={p.experience} addLabel="Add" onAdd={() => setModal('experience')} onRemove={remove('experience')}
          render={(e) => <><div className="bold">{e.role} · {e.company}</div><div className="muted small">{e.from} - {e.to}</div><div className="small mt8">{e.summary}</div></>} />
      </div>
      <Section title="Certifications" icon={Award} items={p.certifications} addLabel="Add" onAdd={() => setModal('certifications')} onRemove={remove('certifications')}
        render={(c) => <div className="row between"><div><div className="bold">{c.name}</div><div className="muted small">{c.issuer} · {c.date}</div></div><Badge tone={c.status === 'earned' ? 'green' : c.status === 'in-progress' ? 'amber' : 'gray'}>{c.status}</Badge></div>} />
      {modal && (
        <FormModal open onClose={() => setModal(null)} title={cfg[modal].title} fields={cfg[modal].fields} initial={modal === 'certifications' ? { status: 'earned' } : {}}
          onSubmit={async (v) => { await run(profileApi.addItem(userId, modal, v)); toast('Added') }} />
      )}
    </div>
  )
}

/* ---------- Projects ---------- */
function Projects() {
  const { rec, run, userId } = useData()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="row between mb16"><div className="muted">Projects are the strongest proof of skill. Domains help match them to companies in Resume Lab.</div><Button icon={Plus} onClick={() => setOpen(true)}>Add project</Button></div>
      <div className="grid g3">
        {rec.profile.projects.map((p, i) => (
          <Card key={p.id} hover delay={i}>
            <div className="row between"><FolderGit2 className="icon-teal" /><button className="icon-btn" onClick={() => run(profileApi.removeItem(userId, 'projects', p.id))}><Trash2 size={15} /></button></div>
            <h3 className="mt8">{p.name}</h3>
            <p className="muted small mt8">{p.description}</p>
            <div className="row wrap gap4 mt12">{p.tech.map((t) => <Chip key={t}>{t}</Chip>)}</div>
            <div className="row wrap gap4 mt8">{p.domains.map((t) => <Badge key={t} tone="teal">{t}</Badge>)}</div>
            {p.link && <div className="mt12 small"><GitBranch size={13} style={{ verticalAlign: -2 }} /> {p.link}</div>}
          </Card>
        ))}
      </div>
      <FormModal open={open} onClose={() => setOpen(false)} title="Add project"
        fields={[
          { key: 'name', label: 'Project name', required: true }, { key: 'description', label: 'Description', type: 'textarea', required: true },
          { key: 'tech', label: 'Tech stack (comma separated)', placeholder: 'Kotlin, Room, Retrofit' },
          { key: 'domains', label: 'Domains (comma separated)', placeholder: 'mobile, api, game-dev, 3d', hint: 'Used to align this project with company needs.' },
          { key: 'link', label: 'Link', placeholder: 'github.com/you/project' },
        ]}
        onSubmit={async (v) => {
          const list = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean)
          await run(profileApi.addItem(userId, 'projects', { ...v, tech: list(v.tech), domains: list(v.domains).map((d) => d.toLowerCase()) }))
          toast('Project added')
        }}
      />
    </>
  )
}

/* ---------- Coding profiles ---------- */
const PLATFORMS = {
  leetcode: { label: 'LeetCode', color: '#f59e0b', fields: ['handle', 'solved', 'easy', 'medium', 'hard', 'rating', 'streak'] },
  github: { label: 'GitHub', color: '#1c1f3d', fields: ['handle', 'repos', 'commits', 'stars'], sync: true },
  codeforces: { label: 'Codeforces', color: '#3b82f6', fields: ['handle', 'rating', 'maxRating', 'contests'], sync: true },
  hackerrank: { label: 'HackerRank', color: '#10b981', fields: ['handle', 'stars'] },
  linkedin: { label: 'LinkedIn', color: '#0a66c2', fields: ['handle'], linkOnly: true },
}
const PROFILE_URL = {
  github: (h) => `https://github.com/${h}`,
  codeforces: (h) => `https://codeforces.com/profile/${h}`,
  hackerrank: (h) => `https://www.hackerrank.com/${h}`,
  linkedin: (h) => (h.startsWith('http') ? h : `https://www.linkedin.com/in/${h}`),
}

function Coding() {
  const { rec, run, userId } = useData()
  const toast = useToast()
  const [edit, setEdit] = useState(null)
  const [syncing, setSyncing] = useState(null)
  const ext = rec.profile.external || {}
  const lc = ext.leetcode || {}
  const pie = [{ name: 'Easy', v: lc.easy || 0, c: '#10b981' }, { name: 'Medium', v: lc.medium || 0, c: '#f59e0b' }, { name: 'Hard', v: lc.hard || 0, c: '#ef4444' }]

  const doSync = async (k) => {
    const handle = (ext[k] || {}).handle
    if (!handle) { toast(`Add your ${PLATFORMS[k].label} username first`, { tone: 'bad' }); setEdit(k); return }
    setSyncing(k)
    try {
      await run(profileApi.syncExternal(userId, k, handle))
      toast(`${PLATFORMS[k].label} synced from live data`)
    } catch (e) {
      toast(e.message, { tone: 'bad' })
    } finally {
      setSyncing(null)
    }
  }

  return (
    <>
      <div className="row between mb16">
        <div className="muted">Add your handle and hit sync to pull real public stats straight from GitHub or Codeforces. LeetCode, HackerRank and LinkedIn don't offer a public browser-callable stats API, so add your link there and enter numbers manually.</div>
      </div>
      <div className="grid g-main">
        <Card>
          <CardTitle icon={Trophy} right={<Button size="sm" variant="outline" icon={Pencil} onClick={() => setEdit('leetcode')}>Edit</Button>}>LeetCode {lc.handle && <span className="muted small">@{lc.handle}</span>}</CardTitle>
          <div className="row gap24 wrap">
            <div style={{ width: 170, height: 170, position: 'relative' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pie} dataKey="v" innerRadius={55} outerRadius={78} paddingAngle={3} animationDuration={1200}>{pie.map((s) => <Cell key={s.name} fill={s.c} />)}</Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="ring-center"><div className="ring-value" style={{ fontSize: 30 }}>{lc.solved || 0}</div><div className="ring-sub">solved</div></div>
            </div>
            <div className="stack gap8" style={{ flex: 1, minWidth: 200 }}>
              {pie.map((s) => <div key={s.name}><div className="row between small"><span><span className="dot" style={{ background: s.c, display: 'inline-block', marginRight: 6 }} />{s.name}</span><b>{s.v}</b></div><Bar value={(s.v / Math.max(1, lc.solved)) * 100} color={s.c} height={6} /></div>)}
              <div className="row gap8 mt8 wrap"><Badge tone="amber">Rating {lc.rating || '-'}</Badge><Badge tone="red">🔥 {lc.streak || 0} day streak</Badge></div>
            </div>
          </div>
        </Card>
        <div className="stack gap16">
          {['github', 'codeforces', 'hackerrank', 'linkedin'].map((k) => {
            const pl = PLATFORMS[k]
            const d = ext[k] || {}
            return (
              <Card key={k} hover>
                <div className="row between">
                  <div className="bold">{pl.label} {d.handle && <span className="muted small">@{d.handle}</span>}</div>
                  <div className="row gap4">
                    {d.handle && <a className="icon-btn" href={PROFILE_URL[k](d.handle)} target="_blank" rel="noreferrer" title="View profile"><ExternalLink size={15} /></a>}
                    {pl.sync && <button className="icon-btn" disabled={syncing === k} onClick={() => doSync(k)} title="Sync real stats"><RefreshCw size={15} className={syncing === k ? 'spin' : ''} /></button>}
                    <button className="icon-btn" onClick={() => setEdit(k)}><Pencil size={15} /></button>
                  </div>
                </div>
                {!pl.linkOnly && (
                  <div className="row gap16 mt8 wrap">
                    {pl.fields.filter((f) => f !== 'handle').map((f) => <div key={f}><div className="stat-value" style={{ fontSize: 22 }}>{d[f] ?? 0}</div><div className="muted tiny">{f}</div></div>)}
                  </div>
                )}
                {pl.linkOnly && !d.handle && <div className="muted small mt8">No link added yet.</div>}
              </Card>
            )
          })}
        </div>
      </div>
      {edit && (
        <FormModal open onClose={() => setEdit(null)} title={`Edit ${PLATFORMS[edit].label}${PLATFORMS[edit].linkOnly ? ' link' : ' stats'}`} initial={ext[edit] || {}}
          fields={PLATFORMS[edit].fields.map((f) => ({ key: f, label: f === 'handle' ? (PLATFORMS[edit].linkOnly ? 'Profile URL or username' : 'Username') : f, type: f === 'handle' ? 'text' : 'number' }))}
          onSubmit={async (v) => {
            const clean = { ...v }
            PLATFORMS[edit].fields.forEach((f) => { if (f !== 'handle') clean[f] = Number(clean[f]) || 0 })
            if (edit === 'leetcode') clean.solved = clean.easy + clean.medium + clean.hard || clean.solved
            await run(profileApi.updateExternal(userId, edit, clean))
            toast(`${PLATFORMS[edit].label} updated`)
          }}
        />
      )}
    </>
  )
}

function ResumeTab() {
  return (
    <div className="grid g2">
      <Card><CardTitle icon={FileText}>Upload resume</CardTitle><ResumeUploader /></Card>
      <Card>
        <CardTitle>What happens next</CardTitle>
        <div className="stack gap8 small">
          <div>1. <b>S3</b> stores the file securely.</div><div>2. <b>Textract</b> extracts text and layout.</div>
          <div>3. <b>AI extraction</b> pulls skills, projects and experience into your profile.</div><div>4. <b>Resume Lab</b> scores ATS readiness and explains likely rejection reasons.</div>
        </div>
      </Card>
    </div>
  )
}
