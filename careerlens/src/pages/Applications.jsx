import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, Plus, Mail, Filter, Trash2, Clock, CalendarClock, XCircle, MailQuestion, Sparkles, Copy, Inbox, ListPlus } from 'lucide-react'
import { useAuth, useData, useToast } from '../context/AppContext'
import { Badge, Button, Card, CardTitle, Field, Modal, PageHeader, StatCard, Tabs, Bar } from '../components/ui'
import { applicationsApi, applicationInsights, followUpDraft } from '../api'
import { USE_MOCK } from '../api/http'
import { daysBetween, daysFromNow, fmtDate } from '../utils/dates'

const COLS = [
  { id: 'APPLIED', label: 'Applied', color: '#3b82f6', bg: '#eff6ff' },
  { id: 'SCREENING', label: 'Screening', color: '#f59e0b', bg: '#fffbeb' },
  { id: 'INTERVIEW', label: 'Interview', color: '#84cc16', bg: '#ecfdf5' },
  { id: 'OFFER', label: 'Offer', color: '#8b5cf6', bg: '#f5f3ff' },
  { id: 'REJECTED', label: 'Rejected', color: '#ef4444', bg: '#fef2f2' },
]
const SOURCES = ['All', 'LinkedIn', 'Naukri', 'Foundit', 'Company site', 'Internshala', 'Referral', 'Campus portal', 'Other']
const PALETTE = ['#6366f1', '#f97316', '#10b981', '#ec4899', '#0ea5e9', '#a855f7', '#14b8a6', '#eab308']
const colorFor = (s) => PALETTE[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length]

export default function Applications() {
  const { user } = useAuth()
  const { rec, run, userId } = useData()
  const toast = useToast()
  const [source, setSource] = useState('All')
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)
  const [flash, setFlash] = useState(null)
  const [add, setAdd] = useState(false)
  const [draft, setDraft] = useState(null)
  const [email, setEmail] = useState(null)
  const [busyMail, setBusyMail] = useState(false)

  const ins = useMemo(() => applicationInsights(rec.applications), [rec.applications])
  const apps = rec.applications.filter((a) => source === 'All' || a.source === source)
  const ghost = (a) => a.status === 'APPLIED' && daysBetween(a.date) >= 14

  const move = async (id, status) => {
    const a = rec.applications.find((x) => x.id === id)
    if (!a || a.status === status) return
    await run(applicationsApi.moveApplication(userId, id, status))
    toast(`${a.company} moved to ${COLS.find((c) => c.id === status).label}`, { tone: status === 'REJECTED' ? 'warn' : 'good' })
  }

  const simulate = async () => {
    setBusyMail(true)
    const { rec: r, parsed } = await applicationsApi.simulateEmail(userId)
    setBusyMail(false)
    if (!parsed) return toast('No open applications to update', { tone: 'info' })
    await run(Promise.resolve(r))
    setFlash(parsed.id)
    setTimeout(() => setFlash(null), 3500)
    setEmail(parsed)
  }

  return (
    <>
      <PageHeader
        title="Application Tracker" subtitle="Every application in one place. Replies from any portal are read from your inbox and sorted automatically."
        icon={Send}
        actions={<>
          {USE_MOCK && <Button variant="outline" icon={Mail} loading={busyMail} onClick={simulate}>Simulate incoming email</Button>}
          <Button icon={Plus} onClick={() => setAdd(true)}>Add application</Button>
        </>}
      />

      <div className="bento">
        <StatCard icon={Send} label="Applied" value={ins.total} sub={`${ins.responseRate}% got a reply`} tone="blue" delay={0} solid span="b-lg" />
        <StatCard icon={CalendarClock} label="Interviews" value={ins.interviews} sub="active" tone="green" delay={1} solid />
        <StatCard icon={XCircle} label="Rejected" value={ins.rejected} tone="red" delay={2} solid />
        <StatCard icon={Clock} label="No reply (14d+)" value={ins.noReply.length} sub="follow up now" tone="amber" delay={3} solid />
      </div>

      <div className="row gap12 wrap mt16 mb12">
        <Filter size={16} className="muted" />
        {SOURCES.map((s) => <button key={s} className={`pill ${source === s ? 'active' : ''}`} onClick={() => setSource(s)}>{s}</button>)}
      </div>

      <div className="grid-kanban">
        <div className="kanban">
          {COLS.map((col) => {
            const items = apps.filter((a) => a.status === col.id)
            return (
              <div key={col.id} className={`kcol ${overCol === col.id ? 'over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col.id) }} onDragLeave={() => setOverCol(null)}
                onDrop={() => { setOverCol(null); if (dragId) move(dragId, col.id); setDragId(null) }}>
                <div className="kcol-head" style={{ background: col.bg, color: col.color }}><b>{col.label}</b><span>{items.length}</span></div>
                <div className="kcol-body">
                  <AnimatePresence>
                    {items.map((a) => {
                      const g = ghost(a)
                      return (
                        <motion.div key={a.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                        <div
                          className={`kcard ${dragId === a.id ? 'dragging' : ''} ${flash === a.id ? 'flash' : ''} ${a.status === 'INTERVIEW' ? 'interview' : ''}`}
                          draggable onDragStart={() => setDragId(a.id)} onDragEnd={() => { setDragId(null); setOverCol(null) }}>
                          <div className="row gap8">
                            <div className="job-logo sm" style={{ background: colorFor(a.company) }}>{a.company[0]}</div>
                            <div style={{ minWidth: 0, flex: 1 }}><div className="bold truncate">{a.company}</div><div className="muted tiny truncate">{a.role}</div></div>
                            <button className="icon-btn" onClick={() => run(applicationsApi.removeApplication(userId, a.id))}><Trash2 size={13} /></button>
                          </div>
                          <div className="row between mt8"><span className="chip" style={{ padding: '1px 8px', fontSize: 11 }}>{a.source}</span><span className="tiny muted">{fmtDate(a.date)}</span></div>
                          {a.interviewDate && daysFromNow(a.interviewDate) >= 0 && <div className="kbadge kb-teal"><CalendarClock size={12} /> Interview in {daysFromNow(a.interviewDate)} days</div>}
                          {g && <button className="kbadge kb-amber" onClick={() => setDraft(a)}><MailQuestion size={12} /> No reply {daysBetween(a.date)}d - draft follow-up</button>}
                          {a.status === 'REJECTED' && a.reason && <div className="kbadge kb-red">{a.reason}</div>}
                        </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                  {items.length === 0 && <div className="kempty">{col.id === 'OFFER' ? 'No offers yet. Keep going!' : 'Drop cards here'}</div>}
                </div>
              </div>
            )
          })}
        </div>

        <Card className="insights">
          <CardTitle icon={Sparkles}>Smart insights</CardTitle>
          <div className="stack gap12">
            <div className="insight ins-blue"><Inbox size={16} /><div><b>{ins.noReply.length} companies</b> have not replied after 14 days. Send follow-ups.</div></div>
            {ins.sources[0] && <div className="insight ins-green"><Sparkles size={16} /><div><b>{ins.sources[0].source}</b> is your best channel ({ins.sources[0].rate}% replies).</div></div>}
            {ins.topReasons[0] && <div className="insight ins-amber"><XCircle size={16} /><div>Most common rejection: <b>{ins.topReasons[0][0]}</b> ({ins.topReasons[0][1]}x).</div></div>}
            <div className="insight ins-purple"><Mail size={16} /><div>Forward portal emails to <b>{user.id.slice(0, 8)}@track.careerlens.app</b> to auto-update this board. <span className="muted">(simulated for the demo)</span></div></div>
          </div>
          <div className="mt16">
            <div className="bold small mb8">Reply rate by source</div>
            <div className="stack gap8">
              {ins.sources.map((s, i) => <div key={s.source}><div className="row between tiny"><span>{s.source}</span><b>{s.rate}%</b></div><Bar value={s.rate} height={6} delay={i * 0.05} /></div>)}
            </div>
          </div>
        </Card>
      </div>

      <AddModal open={add} onClose={() => setAdd(false)} />

      <Modal open={!!draft} onClose={() => setDraft(null)} title={`Follow-up draft: ${draft?.company}`} width={560}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Close</Button><Button icon={Copy} onClick={() => { navigator.clipboard?.writeText(followUpDraft(draft, user.name)); toast('Draft copied to clipboard') }}>Copy email</Button></>}>
        {draft && <pre className="draft">{followUpDraft(draft, user.name)}</pre>}
        <div className="muted tiny mt8">Drafted by AI in production, using your project highlights for this specific role.</div>
      </Modal>

      <Modal open={!!email} onClose={() => setEmail(null)} title="Email received and parsed" width={560}
        footer={<Button onClick={() => setEmail(null)}>Nice</Button>}>
        {email && (
          <div className="stack gap12">
            <div className="mail"><div className="tiny muted">From: {email.from}</div><div className="bold">{email.subject}</div><div className="small mt8">{email.text}</div></div>
            <div className="small bold">AI extraction (SES → Lambda)</div>
            <pre className="draft json">{JSON.stringify({ isJobRelated: true, company: email.company, role: email.role, status: email.status, confidence: 0.93 }, null, 2)}</pre>
            <div className="muted small">The card was moved to <b>{email.status}</b> automatically. Look for the highlighted card on the board.</div>
          </div>
        )}
      </Modal>
    </>
  )
}

function AddModal({ open, onClose }) {
  const { run, userId } = useData()
  const toast = useToast()
  const [tab, setTab] = useState('single')
  const [f, setF] = useState({ company: '', role: '', source: 'LinkedIn' })
  const [bulk, setBulk] = useState('')
  const [busy, setBusy] = useState(false)
  const lines = bulk.split('\n').map((l) => l.trim()).filter(Boolean)

  const submit = async () => {
    setBusy(true)
    if (tab === 'single') {
      await run(applicationsApi.addApplication(userId, f))
      toast(`${f.company} added`)
      setF({ company: '', role: '', source: 'LinkedIn' })
    } else {
      const items = lines.map((l) => { const [company, role] = l.split(/\s+[-–,|]\s+/); return { company: company.trim(), role: (role || 'Software Engineer').trim() } })
      await run(applicationsApi.addBulk(userId, items))
      toast(`${items.length} applications added`, { desc: 'Bulk paste from your big application night.' })
      setBulk('')
    }
    setBusy(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add application" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy} disabled={tab === 'single' ? !f.company || !f.role : lines.length === 0} icon={tab === 'single' ? Plus : ListPlus}>{tab === 'single' ? 'Add' : `Add ${lines.length || ''} applications`}</Button></>}>
      <Tabs id="addapp" tabs={[{ id: 'single', label: 'Single' }, { id: 'bulk', label: 'Bulk paste (applied to 50 in one night?)' }]} value={tab} onChange={setTab} />
      {tab === 'single' ? (
        <div className="stack gap12">
          <Field label="Company *"><input className="input" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
          <Field label="Role *"><input className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></Field>
          <Field label="Source"><select className="select" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>{SOURCES.slice(1).map((s) => <option key={s}>{s}</option>)}</select></Field>
        </div>
      ) : (
        <Field label="One per line: Company - Role" hint={`${lines.length} lines detected`}>
          <textarea className="textarea" style={{ minHeight: 170 }} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'Nimbus Labs - Android Developer\nOrbit Systems - Backend Engineer\nStratus Cloud - DevOps Engineer'} />
        </Field>
      )}
    </Modal>
  )
}
