import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bar as RBar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Building2, Users, Briefcase, Clock, Star, EyeOff, Eye, CheckCircle2, Plus, Sparkles, FolderGit2, Shield, Wallet } from 'lucide-react'
import { useData, useToast } from '../context/AppContext'
import { Badge, Bar, Button, Card, CardTitle, Chip, Drawer, Field, Modal, PageHeader, Ring, StatCard, Toggle, useAsync, colorOf, alignmentTone, ratioColor } from '../components/ui'
import { recruiterApi, marketApi, projectAlignment } from '../api'
import { ROLES, roleById } from '../data/roles'
import { fmtDate, lastNMonths } from '../utils/dates'

/* ---------------- Overview ---------------- */
export function CompanyOverview() {
  const { rec } = useData()
  const c = rec.company
  const total = c.roles.reduce((s, r) => s + r.applicants, 0)
  const funnel = c.funnel
  const months = lastNMonths(c.timeToShortlist.length)
  const ttl = c.timeToShortlist.map((d, i) => ({ month: months[i], days: d }))
  return (
    <>
      <PageHeader title={`${c.name} Hiring Hub`} subtitle={`${c.industry} · ${c.size} · ${c.location}`} icon={Building2} />
      <div className="bento">
        <StatCard icon={Users} label="Total applicants" value={total} sub="across all open roles" tone="purple" delay={1} solid span="b-lg" />
        <StatCard icon={Briefcase} label="Open roles" value={c.roles.length} tone="blue" solid />
        <StatCard icon={Clock} label="Days to shortlist" value={c.timeToShortlist[c.timeToShortlist.length - 1]} sub="most recent (sample)" tone="green" delay={2} solid />
        <StatCard icon={Star} label="Shortlisted" value={rec.shortlist.length} tone="amber" delay={3} solid />
      </div>
      <div className="grid g2 mt16">
        <Card>
          <CardTitle icon={Users}>Hiring funnel</CardTitle>
          <div style={{ height: 260 }}>
            <ResponsiveContainer><BarChart data={funnel} layout="vertical" margin={{ left: 30, right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" /><XAxis type="number" fontSize={12} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="stage" fontSize={12} width={110} tickLine={false} axisLine={false} /><Tooltip /><RBar dataKey="count" fill="#84cc16" radius={[0, 8, 8, 0]} animationDuration={1200} /></BarChart></ResponsiveContainer>
          </div>
          <div className="muted tiny">Sample metrics: there's no applicant-funnel tracking pipeline yet.</div>
        </Card>
        <Card>
          <CardTitle icon={Clock}>Time to shortlist (days)</CardTitle>
          <div style={{ height: 260 }}>
            <ResponsiveContainer><LineChart data={ttl} margin={{ left: -15, right: 10 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" /><XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} /><Tooltip /><Line dataKey="days" stroke="var(--text)" strokeWidth={3} dot={{ r: 5, fill: '#84cc16' }} animationDuration={1300} /></LineChart></ResponsiveContainer>
          </div>
          <div className="muted tiny">Sample metrics for the demo.</div>
        </Card>
      </div>
      <Card className="mt16">
        <CardTitle icon={Sparkles}>Why recruiters use CareerLens</CardTitle>
        <div className="grid g3">
          <div className="mini-box"><b>Project-to-role matching</b><span>See which candidate projects directly prove the skills you need, not just keywords.</span></div>
          <div className="mini-box"><b>Blind screening</b><span>Names and colleges are hidden until shortlist, so skill decides, not pedigree.</span></div>
          <div className="mini-box"><b>Verified skills</b><span>Badges backed by evidence reduce time spent on unreliable resumes.</span></div>
        </div>
      </Card>
    </>
  )
}

/* ---------------- Talent match ---------------- */
// Identity fields (name/college/city) are omitted server-side for anyone not yet shortlisted —
// see recruiterApi.getCandidates and docs/api-contract.md's "Blind screening enforced
// server-side". The client's own "Blind screening" toggle only controls whether identity is
// SHOWN once it's actually present; it can never reveal what the server didn't send.
const hasIdentity = (cand) => cand.name !== undefined

export function TalentMatch() {
  const { rec, run, userId } = useData()
  const toast = useToast()
  const c = rec.company
  const [roleId, setRoleId] = useState(c.roles[0]?.id ?? null)
  const [blind, setBlind] = useState(true)
  const [sel, setSel] = useState(null)
  const [ranked, setRanked] = useState([])
  const role = c.roles.find((r) => r.id === roleId) || c.roles[0]

  const refresh = () => { if (role) recruiterApi.getCandidates(userId, role.id).then(setRanked) }
  useEffect(() => { refresh() }, [role?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const top5 = ranked.slice(0, 5)
  const nonT1 = top5.filter((r) => hasIdentity(r.cand) && r.cand.tier !== 'Tier 1').length

  const toggleShort = async (cand) => {
    const was = rec.shortlist.includes(cand.id)
    await run(recruiterApi.toggleShortlist(userId, cand.id))
    await refresh() // re-fetch: shortlisting just changed this candidate's PII visibility
    toast(was ? 'Removed from shortlist' : `Shortlisted ${cand.name || 'candidate'}`, { desc: was ? '' : 'Identity revealed. Interview invite drafted.' })
  }

  if (!role) {
    return (
      <>
        <PageHeader title="Talent Match" subtitle="Post a role to start matching candidates against it." icon={Users} />
        <Card><div className="muted">No roles posted yet. Go to Job Postings to post one.</div></Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Talent Match" subtitle="Candidates ranked by skills and by how directly their projects prove the role's needs."
        icon={Users} actions={<div className="row gap12"><Toggle checked={blind} onChange={setBlind} label="Blind screening" />{blind ? <EyeOff size={18} className="muted" /> : <Eye size={18} className="muted" />}</div>} />
      <div className="row gap8 wrap mb16">{c.roles.map((r) => <Chip key={r.id} active={r.id === roleId} onClick={() => setRoleId(r.id)}>{r.title}</Chip>)}</div>

      <motion.div className="bias-banner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Shield size={20} />
        <div><b>{nonT1} of your top 5</b> come from Tier 2 / Tier 3 colleges. With colleges hidden, ranking follows skills and project proof, not pedigree.</div>
      </motion.div>

      <div className="stack gap12 mt16">
        {ranked.map(({ cand, sm, best, total }, i) => {
          const short = rec.shortlist.includes(cand.id)
          const reveal = hasIdentity(cand) && (!blind || short)
          const anon = `Candidate #${cand.id.toUpperCase()}${String(cand.leetcode).slice(-1)}X`
          return (
            <Card key={cand.id} hover delay={i} className={`cand ${short ? 'short' : ''}`}>
              <div className="row gap16 wrap">
                <div className="rank-badge">{i + 1}</div>
                <div className="avatar" style={{ width: 46, height: 46, background: reveal ? '#6366f1' : '#94a3b8', fontSize: 16 }}>{reveal ? cand.name.split(' ').map((w) => w[0]).join('') : '?'}</div>
                <div style={{ flex: 1, minWidth: 250 }}>
                  <div className="row gap8 wrap"><b style={{ fontSize: 16 }}>{reveal ? cand.name : anon}</b>{reveal && <Badge tone="gray">{cand.tier}</Badge>}<Badge tone="gray">{cand.exp}</Badge>{cand.verified >= 4 && <Badge tone="teal" icon={CheckCircle2}>{cand.verified} verified skills</Badge>}</div>
                  <div className="muted small">{reveal ? `${cand.college} · ${cand.city}` : 'College and location hidden (blind screening)'}</div>
                  {best && (
                    <div className="proj-match">
                      <FolderGit2 size={15} />
                      <div><b>{best.p.name}</b> <span className="muted">- {best.p.desc}</span>
                        <div className="row wrap gap4 mt4">{best.overlap.map((o) => <Badge key={o} tone="teal">{o}</Badge>)}<Badge tone={alignmentTone(best.score)}>{best.label} · {best.score}%</Badge></div></div>
                    </div>
                  )}
                </div>
                <div className="row gap16">
                  <div style={{ textAlign: 'center' }}><Ring value={sm.score} size={70} stroke={8} color={colorOf(sm.score)} /><div className="tiny muted">skills</div></div>
                  <div style={{ textAlign: 'center' }}><Ring value={Math.min(100, total)} size={70} stroke={8} color={colorOf(total)} /><div className="tiny muted">overall</div></div>
                </div>
                <div className="stack gap8">
                  <Button size="sm" variant={short ? 'outline' : 'primary'} icon={Star} onClick={() => toggleShort(cand)}>{short ? 'Shortlisted' : 'Shortlist'}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSel({ cand, sm, best, total })}>Details</Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Drawer open={!!sel} onClose={() => setSel(null)} title="Candidate breakdown" width={500}>
        {sel && (
          <div className="stack gap16">
            <div><b style={{ fontSize: 18 }}>{hasIdentity(sel.cand) && (!blind || rec.shortlist.includes(sel.cand.id)) ? sel.cand.name : 'Anonymous candidate'}</b><div className="muted small">Overall {sel.total}/100 · ATS readiness {sel.cand.ats} · {sel.cand.leetcode} problems solved</div></div>
            <div>
              <div className="bold small mb8">Skills vs role needs</div>
              <div className="stack gap8">{sm_rows(sel)}</div>
            </div>
            <div>
              <div className="bold small mb8">Projects vs this role</div>
              {sel.cand.projects.map((p) => { const a = projectAlignment(p, role.domains); return <div key={p.name} className="align-card mb8"><div className="row between"><b>{p.name}</b><Badge tone={alignmentTone(a.score)}>{a.score}%</Badge></div><div className="muted small mt4">{p.desc}</div></div> })}
            </div>
            <div className="muted tiny">Score = 55% skill match + 35% best project alignment + 10% ATS readiness. Weights are configurable per role in production.</div>
          </div>
        )}
      </Drawer>
    </>
  )
}
const sm_rows = (sel) => sel.sm.rows.map((r) => <div key={r.name}><div className="row between tiny"><span>{r.name}</span><span>{r.have} / {r.need}</span></div><Bar value={r.have} marker={r.need} height={7} color={ratioColor(r.ratio)} /></div>)

/* ---------------- Postings ---------------- */
export function Postings() {
  const { rec, run, userId } = useData()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ title: '', roleId: 'game', openings: 1 })
  const [busy, setBusy] = useState(false)
  const suggested = roleById(f.roleId)

  const create = async () => {
    setBusy(true)
    await run(recruiterApi.addRole(userId, { title: f.title, roleId: f.roleId, openings: Number(f.openings) || 1, skills: suggested.skills.map((s) => ({ ...s })), domains: [] }))
    setBusy(false); setOpen(false); setF({ title: '', roleId: 'game', openings: 1 })
    toast('Role posted', { desc: 'Skills were auto-suggested from the role catalogue.' })
  }

  return (
    <>
      <PageHeader title="Job Postings" subtitle="Post roles with AI-suggested skill requirements. Students see them in the Job Market portal." icon={Briefcase} actions={<Button icon={Plus} onClick={() => setOpen(true)}>Post a role</Button>} />
      <div className="grid g2">
        {rec.company.roles.map((r, i) => (
          <Card key={r.id} hover delay={i}>
            <div className="row between"><h3>{r.title}</h3><Badge tone="green">Open</Badge></div>
            <div className="muted small mt4">{r.openings} opening{r.openings > 1 ? 's' : ''} · posted {fmtDate(r.posted)} · {r.applicants} applicants</div>
            <div className="row wrap gap4 mt12">{r.skills.map((s) => <span key={s.name} className="chip">{s.name} {s.need}%</span>)}</div>
            {r.domains.length > 0 && <div className="row wrap gap4 mt8">{r.domains.map((d) => <Badge key={d} tone="teal">{d}</Badge>)}</div>}
          </Card>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Post a role" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} loading={busy} disabled={!f.title.trim()}>Post role</Button></>}>
        <div className="stack gap12">
          <Field label="Job title *"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Gameplay Programmer" /></Field>
          <Field label="Role family"><select className="select" value={f.roleId} onChange={(e) => setF({ ...f, roleId: e.target.value })}>{ROLES.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></Field>
          <Field label="Openings"><input className="input" type="number" min={1} value={f.openings} onChange={(e) => setF({ ...f, openings: e.target.value })} /></Field>
          <div><div className="label mb8">Auto-suggested skills</div><div className="row wrap gap4">{suggested.skills.map((s) => <span key={s.name} className="chip">{s.name} {s.need}%</span>)}</div></div>
        </div>
      </Modal>
      <CompanyGigs />
    </>
  )
}

/* ---------------- Gigs (micro paid tasks candidates accept from the Innovation Lab) ---------------- */
function CompanyGigs() {
  const { rec, userId } = useData()
  const toast = useToast()
  const { data: initialGigs, loading } = useAsync(() => marketApi.getGigs(), [])
  const [gigs, setGigs] = useState(null)
  useEffect(() => { if (initialGigs) setGigs(initialGigs) }, [initialGigs])
  const myGigs = (gigs || []).filter((g) => g.company === rec.company.name)
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ title: '', skill: '', hours: 8, reward: 2000, level: 'Beginner', slots: 3 })
  const [busy, setBusy] = useState(false)
  const [applicants, setApplicants] = useState(null)

  const create = async () => {
    setBusy(true)
    const updated = await recruiterApi.postGig(userId, { title: f.title, skill: f.skill, hours: Number(f.hours) || 1, reward: Number(f.reward) || 0, level: f.level, slots: Number(f.slots) || 1 })
    setGigs(updated)
    setBusy(false); setOpen(false); setF({ title: '', skill: '', hours: 8, reward: 2000, level: 'Beginner', slots: 3 })
    toast('Gig posted', { desc: 'Candidates can now find and accept it from the Innovation Lab.' })
  }

  const viewApplicants = async (gig) => {
    setApplicants({ gig, loading: true, list: [] })
    const list = await recruiterApi.getGigApplicants(userId, gig.id)
    setApplicants({ gig, loading: false, list })
  }

  return (
    <div className="mt24">
      <div className="row between mb12">
        <div><h3 style={{ margin: 0 }}>Micro-gigs</h3><div className="muted small">Small paid tasks candidates complete for verified roadmap experience.</div></div>
        <Button variant="outline" icon={Plus} onClick={() => setOpen(true)}>Post a gig</Button>
      </div>
      {!loading && myGigs.length === 0 && <div className="muted small">No gigs posted yet.</div>}
      <div className="grid g2">
        {myGigs.map((g) => (
          <Card key={g.id} hover>
            <div className="row between"><h3 style={{ fontSize: 16 }}>{g.title}</h3><Badge tone="gray">{g.level}</Badge></div>
            <div className="muted small mt4">{g.skill} · {g.hours}h · {g.slotsRemaining}/{g.slots} slots left</div>
            <div className="row between mt12">
              <div className="bold row gap4"><Wallet size={14} /> ₹{g.reward.toLocaleString('en-IN')}</div>
              <Button size="sm" variant="outline" onClick={() => viewApplicants(g)}>Applicants</Button>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Post a gig" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} loading={busy} disabled={!f.title.trim() || !f.skill.trim()}>Post gig</Button></>}>
        <div className="stack gap12">
          <Field label="Title *"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Build a Compose UI for onboarding" /></Field>
          <Field label="Primary skill *"><input className="input" value={f.skill} onChange={(e) => setF({ ...f, skill: e.target.value })} placeholder="e.g. Jetpack Compose" /></Field>
          <div className="row gap12">
            <Field label="Hours"><input className="input" type="number" min={1} value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></Field>
            <Field label="Reward (₹)"><input className="input" type="number" min={0} value={f.reward} onChange={(e) => setF({ ...f, reward: e.target.value })} /></Field>
            <Field label="Slots"><input className="input" type="number" min={1} value={f.slots} onChange={(e) => setF({ ...f, slots: e.target.value })} /></Field>
          </div>
          <Field label="Level"><select className="select" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></Field>
        </div>
      </Modal>
      <Modal open={!!applicants} onClose={() => setApplicants(null)} title={applicants ? `Applicants: ${applicants.gig.title}` : ''}>
        {applicants?.loading && <div className="muted small">Loading...</div>}
        {applicants && !applicants.loading && applicants.list.length === 0 && <div className="muted small">No applicants yet.</div>}
        <div className="stack gap8">
          {applicants?.list.map((a) => (
            <div key={a.id} className="row between"><div className="bold small">{a.headline || 'Candidate'}</div><span className="muted tiny">#{a.id.slice(-6)}</span></div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
