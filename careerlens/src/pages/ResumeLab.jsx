import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileSearch, CheckCircle2, XCircle, ScanLine, AlertOctagon, Lightbulb, FolderGit2, Loader2, Sparkles, ShieldAlert, Upload } from 'lucide-react'
import { useData } from '../context/AppContext'
import { Badge, Bar, Button, Card, CardTitle, Chip, Disclaimer, Field, PageHeader, Ring, colorOf, alignmentTone, alignmentColor } from '../components/ui'
import { ResumeUploader } from '../components/Forms'
import { atsAnalysis, projectAlignment, COMPANY_TYPES, resumeApi } from '../api'
import { ROLES } from '../data/roles'

const STEPS = ['Reading file layout', 'Extracting text and sections', 'Detecting skills and keywords', 'Simulating ATS parsers', 'Comparing with the target role', 'Building rejection insights']

export default function ResumeLab() {
  const { rec } = useData()
  const p = rec.profile
  const [roleId, setRoleId] = useState(p.targetRoleId)
  const [jd, setJd] = useState('')
  const [phase, setPhase] = useState('idle') // idle | scanning | done
  const [step, setStep] = useState(0)
  const [result, setResult] = useState(null)
  const [company, setCompany] = useState(COMPANY_TYPES[0].id)
  const timer = useRef(null)

  // Minimum time the "scanning" steps stay visible, so a near-instant mock-mode result doesn't
  // just flash by — but this is a floor, not a fixed duration: the real diagnosis call and this
  // timer run concurrently, and completion waits on whichever finishes last. A slow real API call
  // (Gemini under free-tier throttling, network latency) genuinely extends the wait instead of
  // being tacked on after a fake animation that already ran independently of the real work.
  const MIN_SCAN_MS = 2600

  const scan = () => {
    setPhase('scanning'); setStep(0)
    clearInterval(timer.current)
    const ats = atsAnalysis(p, jd)
    const work = resumeApi.rejectionDiagnosis(p, roleId, ats)
    const minWait = new Promise((r) => setTimeout(r, MIN_SCAN_MS))
    timer.current = setInterval(() => {
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s))
    }, MIN_SCAN_MS / (STEPS.length - 1))
    Promise.all([work, minWait]).then(([diag]) => {
      clearInterval(timer.current)
      setStep(STEPS.length)
      setResult({ ats, diag })
      setPhase('done')
    })
  }

  useEffect(() => () => clearInterval(timer.current), [])

  const ct = COMPANY_TYPES.find((c) => c.id === company)
  const aligned = useMemo(
    () => p.projects.map((pr) => ({ pr, ...projectAlignment(pr, ct.domains) })).sort((a, b) => b.score - a.score),
    [p.projects, ct],
  )

  return (
    <>
      <PageHeader title="Resume Lab" subtitle="ATS readiness, likely rejection reasons, and which projects actually help you get hired." icon={FileSearch} />
      <div className="grid g-main-l">
        <div className="stack gap16">
          <Card>
            <CardTitle>1. Your resume</CardTitle>
            <ResumeUploader compact />
          </Card>
          <Card>
            <CardTitle>2. Target</CardTitle>
            <Field label="Role"><select className="select" value={roleId} onChange={(e) => setRoleId(e.target.value)}>{ROLES.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></Field>
            <div className="mt12"><Field label="Paste a job description (optional)" hint="Keyword coverage is measured against this text."><textarea className="textarea" value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste JD here, e.g. We need Kotlin, Jetpack Compose, Room and REST API experience..." /></Field></div>
            <div className="mt12">
              <Button icon={ScanLine} onClick={scan} loading={phase === 'scanning'} disabled={!p.resume} style={{ width: '100%', justifyContent: 'center' }}>{phase === 'done' ? 'Re-run scan' : 'Run ATS scan'}</Button>
              {!p.resume && <div className="muted tiny mt8">Upload a resume above first — there's nothing to scan yet.</div>}
            </div>
          </Card>
        </div>

        <div>
          <AnimatePresence mode="wait">
            {phase === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="stack gap8" style={{ alignItems: 'center', textAlign: 'center', padding: '48px 24px' }}>
                  <Upload size={32} className="muted" />
                  <h3>{p.resume ? 'Ready to scan' : 'No resume yet'}</h3>
                  <p className="muted small">
                    {p.resume
                      ? 'Resume on file — click "Run ATS scan" to see your ATS readiness, fit score, and likely rejection reasons.'
                      : 'Upload a resume on the left, then run a scan to see your ATS readiness, fit score, and likely rejection reasons.'}
                  </p>
                </Card>
              </motion.div>
            )}
            {phase === 'scanning' && (
              <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="scan-card">
                  <div className="scan-doc"><motion.div className="scan-line" animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }} />
                    {Array.from({ length: 11 }).map((_, i) => <div key={i} className="scan-text" style={{ width: `${55 + ((i * 17) % 40)}%` }} />)}
                  </div>
                  <div className="stack gap8" style={{ flex: 1 }}>
                    <h3>Analysing your resume...</h3>
                    {STEPS.map((s, i) => (
                      <div key={s} className={`scan-step ${i < step ? 'done' : i === step ? 'now' : ''}`}>
                        {i < step ? <CheckCircle2 size={16} /> : i === step ? <Loader2 size={16} className="spin" /> : <span className="scan-dot" />}{s}
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
            {phase === 'done' && result && (
              <motion.div key="res" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="stack gap16">
                <div className="grid g2">
                  <Card>
                    <CardTitle icon={ShieldAlert}>ATS readiness</CardTitle>
                    <div className="row gap16"><Ring value={result.ats.score} size={110} color={colorOf(result.ats.score)} sub="/ 100" />
                      <div className="small muted">Estimates how cleanly common ATS parsers would read this resume. We cannot replicate a specific company's ATS, so treat this as a readiness check.</div></div>
                  </Card>
                  <Card>
                    <CardTitle icon={Sparkles}>Fit for {result.diag.role.title}</CardTitle>
                    <div className="row gap16"><Ring value={result.diag.matchScore} size={110} color={colorOf(result.diag.matchScore)} sub="skill match" />
                      <div className="small muted">{result.ats.coverage ? <>JD keyword coverage: <b>{result.ats.coverage.pct}%</b>{result.ats.coverage.missing.length > 0 && <> · missing {result.ats.coverage.missing.slice(0, 4).join(', ')}</>}</> : 'Paste a job description to measure keyword coverage.'}</div></div>
                  </Card>
                </div>

                <Card>
                  <CardTitle icon={AlertOctagon} right={<Badge tone="amber">Likely gaps, not a probability</Badge>}>Why this resume may get rejected</CardTitle>
                  <div className="stack gap12">
                    {result.diag.reasons.length === 0 && <div className="muted">No major gaps found. Nice work.</div>}
                    {result.diag.reasons.map((r, i) => (
                      <motion.div key={r.title} className={`reason reason-${r.severity}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                        <div className="row between"><b>{r.title}</b><Badge tone={r.severity === 'high' ? 'red' : 'amber'}>{r.severity}</Badge></div>
                        <div className="muted small">{r.detail}</div>
                        <div className="fix"><Lightbulb size={14} /> {r.fix}</div>
                      </motion.div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <CardTitle>ATS checklist</CardTitle>
                  <div className="stack gap8">
                    {result.ats.checks.map((c) => (
                      <div key={c.id} className="check-row">
                        {c.ok ? <CheckCircle2 size={18} color="#10b981" /> : <XCircle size={18} color="#ef4444" />}
                        <div style={{ flex: 1 }}><div className="small bold">{c.label}</div>{!c.ok && <div className="muted tiny">{c.tip}</div>}</div>
                        <Badge tone={c.ok ? 'green' : 'red'}>{c.ok ? 'pass' : 'fix'}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Card className="mt16">
        <CardTitle icon={FolderGit2} right={<Badge tone="teal">Helps students and recruiters</Badge>}>Project-to-company alignment</CardTitle>
        <p className="muted small mb12">Which of your projects directly help a specific type of company hire you? Example: a project that converts images into 3D game assets is a direct signal for a game studio.</p>
        <div className="row wrap gap8 mb16">{COMPANY_TYPES.map((c) => <Chip key={c.id} active={c.id === company} onClick={() => setCompany(c.id)}>{c.label}</Chip>)}</div>
        <div className="grid g3">
          {aligned.map(({ pr, score, overlap, label }, i) => (
            <motion.div key={pr.id + company} className="align-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <div className="row between"><b>{pr.name}</b><Badge tone={alignmentTone(score)}>{label}</Badge></div>
              <div className="row between tiny muted mt8"><span>Alignment</span><b style={{ color: alignmentColor(score) }}>{score}%</b></div>
              <Bar value={score} color={alignmentColor(score)} />
              <div className="muted small mt8">{overlap.length ? <>Matches: {overlap.map((o) => <Badge key={o} tone="teal">{o}</Badge>)}</> : 'No overlap with this company type.'}</div>
            </motion.div>
          ))}
        </div>
        <div className="mt12"><Disclaimer>Alignment is estimated from project tags and descriptions. In production, embeddings compare the project text with each company's real needs.</Disclaimer></div>
      </Card>
    </>
  )
}
