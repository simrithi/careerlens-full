import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { Mic, MicOff, Play, Timer, ChevronRight, Lightbulb, CheckCircle2, XCircle, RotateCcw, History, Volume2 } from 'lucide-react'
import { useData, useToast } from '../context/AppContext'
import { Badge, Bar, Button, Card, CardTitle, Chip, Counter, Field, PageHeader, Ring, colorOf, toneOf } from '../components/ui'
import { interviewApi } from '../api'
import { ROLES, roleById } from '../data/roles'
import { QUESTIONS, HR_QUESTIONS } from '../data/questions'
import { fmtDate } from '../utils/dates'

const TOTAL = 5
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5)

export default function MockInterview() {
  const { rec, run, userId } = useData()
  const toast = useToast()
  const [setup, setSetup] = useState({ roleId: rec.profile.targetRoleId, mode: 'technical' })
  const [stage, setStage] = useState('setup') // setup | live | summary
  const [qs, setQs] = useState([])
  const [i, setI] = useState(0)
  const [answer, setAnswer] = useState('')
  const [evalRes, setEvalRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState([])
  const [secs, setSecs] = useState(0)
  const [mic, setMic] = useState(false)
  const timer = useRef(null)

  const role = roleById(setup.roleId)

  useEffect(() => {
    if (stage === 'live' && !evalRes) {
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000)
      return () => clearInterval(timer.current)
    }
    clearInterval(timer.current)
  }, [stage, evalRes, i])

  const start = () => {
    const bank = setup.mode === 'hr' ? HR_QUESTIONS : QUESTIONS[setup.roleId] || QUESTIONS.android
    const mixed = setup.mode === 'mixed' ? [...shuffle(QUESTIONS[setup.roleId] || []).slice(0, 3), ...shuffle(HR_QUESTIONS).slice(0, 2)] : shuffle(bank).slice(0, TOTAL)
    setQs(mixed.slice(0, TOTAL)); setI(0); setResults([]); setAnswer(''); setEvalRes(null); setSecs(0); setStage('live')
  }

  const submit = async () => {
    setBusy(true)
    const r = await interviewApi.scoreAnswer(qs[i], answer, role.title)
    setEvalRes(r)
    setResults((x) => [...x, { q: qs[i], ...r, secs }])
    setBusy(false)
  }

  const next = async () => {
    if (i + 1 >= qs.length) {
      const all = [...results]
      const avg = Math.round(all.reduce((s, r) => s + r.overall, 0) / all.length)
      await run(interviewApi.saveInterview(userId, { role: setup.roleId, roleTitle: role.title, score: avg, mode: setup.mode }))
      setStage('summary')
      toast('Interview saved to your history', { desc: `Overall score ${avg}/100` })
    } else { setI(i + 1); setAnswer(''); setEvalRes(null); setSecs(0) }
  }

  const avg = results.length ? Math.round(results.reduce((s, r) => s + r.overall, 0) / results.length) : 0
  const radar = useMemo(() => ['relevance', 'depth', 'structure', 'clarity'].map((k) => ({ k: k[0].toUpperCase() + k.slice(1), v: results.length ? Math.round(results.reduce((s, r) => s + r[k], 0) / results.length) : 0 })), [results])
  const mm = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const history = [...rec.interviews].reverse()

  return (
    <>
      <PageHeader title="Mock Interview" subtitle="Practice role-specific questions and get instant rubric-based feedback." icon={Mic} />

      {stage === 'setup' && (
        <div className="grid g-main">
          <Card>
            <CardTitle icon={Play}>Set up your session</CardTitle>
            <div className="stack gap16">
              <Field label="Role"><select className="select" value={setup.roleId} onChange={(e) => setSetup({ ...setup, roleId: e.target.value })}>{ROLES.map((r) => <option key={r.id} value={r.id}>{r.emoji} {r.title}</option>)}</select></Field>
              <Field label="Interview type">
                <div className="row gap8 wrap">
                  {[['technical', 'Technical'], ['hr', 'HR / Behavioural'], ['mixed', 'Mixed']].map(([id, l]) => <Chip key={id} active={setup.mode === id} onClick={() => setSetup({ ...setup, mode: id })}>{l}</Chip>)}
                </div>
              </Field>
              <div className="muted small">{TOTAL} questions · answer in text (or try the mic preview) · scored on relevance, depth, structure and clarity.</div>
              <div><Button size="lg" icon={Play} onClick={start}>Start interview</Button></div>
            </div>
          </Card>
          <Card>
            <CardTitle icon={History}>Your history</CardTitle>
            <div className="stack gap12">
              {history.length === 0 && <div className="muted small">No sessions yet.</div>}
              {history.slice(0, 6).map((h) => (
                <div key={h.id} className="row gap12">
                  <Ring value={h.score} size={52} stroke={6} color={colorOf(h.score)} label="" />
                  <div><div className="bold small">{h.roleTitle}</div><div className="muted tiny">{fmtDate(h.date)} · {h.mode}</div></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {stage === 'live' && qs[i] && (
        <div className="grid g-main">
          <Card>
            <div className="row between mb12">
              <div className="row gap8"><Badge tone="teal">Question {i + 1} of {qs.length}</Badge><Badge tone={qs[i].level === 'Easy' ? 'green' : qs[i].level === 'Hard' ? 'red' : 'amber'}>{qs[i].level}</Badge></div>
              <div className="row gap8 timer"><Timer size={15} /> {mm(secs)}</div>
            </div>
            <Bar value={((i + (evalRes ? 1 : 0)) / qs.length) * 100} height={6} />
            <motion.h2 key={qs[i].id} className="q-text" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>{qs[i].text}</motion.h2>
            {qs[i].tip && !evalRes && <div className="hintbox"><Lightbulb size={15} /> Hint: {qs[i].tip}</div>}
            <textarea className="textarea answer" placeholder="Type your answer as you would say it in an interview..." value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={!!evalRes} />
            <div className="row between mt12">
              <div className="row gap8">
                <button className={`mic ${mic ? 'on' : ''}`} onClick={() => { setMic(!mic); toast(mic ? 'Mic off' : 'Voice mode is a preview', { tone: 'info', desc: 'Amazon Transcribe will turn speech into text in production.' }) }}>{mic ? <MicOff size={18} /> : <Mic size={18} />}</button>
                <span className="muted tiny">{(answer.trim().match(/\S+/g) || []).length} words</span>
              </div>
              {!evalRes ? <Button onClick={submit} loading={busy} disabled={answer.trim().length < 5}>Submit answer</Button> : <Button onClick={next}>{i + 1 >= qs.length ? 'Finish' : 'Next question'} <ChevronRight size={16} /></Button>}
            </div>
          </Card>

          <AnimatePresence mode="wait">
            {evalRes ? (
              <motion.div key="fb" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Card>
                  <CardTitle icon={Volume2}>AI feedback</CardTitle>
                  <div className="row gap16"><Ring value={evalRes.overall} size={96} color={colorOf(evalRes.overall)} sub="score" />
                    <div className="stack gap8" style={{ flex: 1 }}>{['relevance', 'depth', 'structure', 'clarity'].map((k) => <div key={k}><div className="row between tiny"><span style={{ textTransform: 'capitalize' }}>{k}</span><b>{evalRes[k]}</b></div><Bar value={evalRes[k]} color={colorOf(evalRes[k])} height={6} /></div>)}</div></div>
                  <div className="mt12 small bold">Concepts you covered</div>
                  <div className="row wrap gap4 mt8">{evalRes.hits.length ? evalRes.hits.map((h) => <Badge key={h} tone="green" icon={CheckCircle2}>{h}</Badge>) : <span className="muted small">None detected</span>}</div>
                  <div className="mt12 small bold">Worth mentioning</div>
                  <div className="row wrap gap4 mt8">{evalRes.misses.slice(0, 5).map((h) => <Badge key={h} tone="gray" icon={XCircle}>{h}</Badge>)}</div>
                  <div className="stack gap8 mt16">{evalRes.feedback.map((f) => <div key={f} className="fix"><Lightbulb size={14} /> {f}</div>)}</div>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="tips" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card>
                  <CardTitle icon={Lightbulb}>How answers are scored</CardTitle>
                  <div className="stack gap8 small">
                    <div><b>Relevance</b> - did you cover the core concepts?</div><div><b>Depth</b> - enough detail and examples?</div>
                    <div><b>Structure</b> - clear flow (first, then, because...)?</div><div><b>Clarity</b> - concise and easy to follow?</div>
                  </div>
                  <div className="muted tiny mt12">Scored live by Gemini against this rubric (falls back to a rule-based estimate if the AI call fails).</div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {stage === 'summary' && (
        <div className="grid g-main">
          <Card>
            <CardTitle>Session summary</CardTitle>
            <div className="row gap24 wrap">
              <Ring value={avg} size={150} stroke={13} color={colorOf(avg)} sub="overall" />
              <div style={{ flex: 1, minWidth: 240, height: 220 }}>
                <ResponsiveContainer><RadarChart data={radar} outerRadius="70%"><PolarGrid stroke="var(--line)" /><PolarAngleAxis dataKey="k" tick={{ fontSize: 12 }} /><Radar dataKey="v" stroke="#84cc16" fill="#84cc16" fillOpacity={0.4} /></RadarChart></ResponsiveContainer>
              </div>
            </div>
            <div className="stack gap8 mt16">
              {results.map((r, k) => (
                <div key={k} className="q-row"><Badge tone={toneOf(r.overall)}>{r.overall}</Badge><div className="small" style={{ flex: 1 }}>{r.q.text}</div><span className="muted tiny">{mm(r.secs)}</span></div>
              ))}
            </div>
            <div className="row gap8 mt16"><Button icon={RotateCcw} onClick={() => setStage('setup')}>New session</Button><Button variant="outline" onClick={start}>Retry same setup</Button></div>
          </Card>
          <Card>
            <CardTitle>Coach's note</CardTitle>
            <p className="small">{avg >= 75 ? 'Strong performance. Focus on adding real examples from your projects.' : avg >= 55 ? 'Solid base. Cover more of the core concepts and structure answers as idea, reason, example.' : 'Revisit fundamentals for this role using your roadmap resources, then retry in a few days.'}</p>
            <div className="mt12"><Badge tone="teal">Your score: <Counter to={avg} /></Badge></div>
          </Card>
        </div>
      )}
    </>
  )
}
