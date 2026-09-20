import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, GraduationCap, Briefcase, Building2, Lock, Mail } from 'lucide-react'
import { useAuth, useToast } from '../context/AppContext'
import { Button, Counter, Field } from '../components/ui'
import { DEMO_ACCOUNTS } from '../data/seed'
import { INDIA_GAP } from '../data/roles'
import { USE_MOCK } from '../api/http'

// Real-mode judge/demo accounts — pre-provisioned directly in Cognito (not seed data), with
// USER_PASSWORD_AUTH enabled only for these two (see careerlens-backend/lib/auth-stack.ts), so a
// single click signs a judge straight in with no Hosted UI page and no "sign up" option ever shown.
const JUDGE_DEMO_ACCOUNTS = [
  { email: 'judge-candidate@careerlens-demo.in', password: 'JudgeDemo!2026', icon: GraduationCap, label: 'Student', blurb: 'Dashboard, roadmap, applications, resume lab' },
  { email: 'judge-company@careerlens-demo.in', password: 'JudgeDemo!2026', icon: Building2, label: 'Company', blurb: 'Postings, candidates, gigs' },
]

const ICONS = { fresher: GraduationCap, experienced: Briefcase, company: Building2 }
const LABELS = { fresher: 'Fresher', experienced: 'Experienced', company: 'Company' }

// An original circuit-board style pattern (near-black + lime, matching the rest of the app) —
// PCB-style traces and node pads, fitting an engineering/tech platform better than the earlier
// botanical motif. Tiled via an SVG <pattern> so it scales cleanly to any strip height.
function TechStrip() {
  return (
    <div className="tech-strip">
      <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="tech-motif" width="120" height="140" patternUnits="userSpaceOnUse">
            <path d="M0 30 H45 V70 H120" fill="none" stroke="#c3e94f" strokeWidth="2" opacity="0.55" />
            <path d="M20 140 V100 H70 V60" fill="none" stroke="#f5ecd9" strokeWidth="1.5" opacity="0.35" />
            <path d="M120 20 H90 V0" fill="none" stroke="#f5ecd9" strokeWidth="1.5" opacity="0.3" />
            <circle cx="45" cy="30" r="4" fill="#c3e94f" />
            <circle cx="45" cy="70" r="3" fill="#c3e94f" opacity="0.7" />
            <rect x="66" y="56" width="8" height="8" fill="#f5ecd9" opacity="0.9" />
            <rect x="16" y="96" width="8" height="8" fill="#f5ecd9" opacity="0.6" />
            <circle cx="90" cy="0" r="3" fill="#f5ecd9" opacity="0.5" />
          </pattern>
          <pattern id="tech-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#f5ecd9" opacity="0.14" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#0a0a0a" />
        <rect width="100%" height="100%" fill="url(#tech-dots)" />
        <rect width="100%" height="100%" fill="url(#tech-motif)" />
      </svg>
    </div>
  )
}

// A classy, slow-spinning orbit of dots — original composition in the app's own lime/cream
// palette (not a reuse of any reference image), three rings turning at different speeds/
// directions for a layered, unhurried motion rather than a busy "loading spinner" feel.
const ORBIT_RINGS = [
  { radius: 118, count: 8, dotSize: 13, color: '#f5ecd9', duration: 34 },
  { radius: 80, count: 9, dotSize: 8, color: '#c3e94f', duration: 24, reverse: true },
  { radius: 42, count: 10, dotSize: 5, color: '#f5ecd9', duration: 16 },
]
function OrbitSpinner({ size = 260 }) {
  return (
    <div className="orbit-spinner" style={{ width: size, height: size }} aria-hidden="true">
      {ORBIT_RINGS.map((ring, ri) => (
        <div key={ri} className="orbit-ring" style={{ animationDuration: `${ring.duration}s`, animationDirection: ring.reverse ? 'reverse' : 'normal' }}>
          {Array.from({ length: ring.count }).map((_, i) => {
            const angle = (360 / ring.count) * i
            return (
              <span
                key={i}
                className="orbit-dot"
                style={{
                  width: ring.dotSize, height: ring.dotSize, background: ring.color,
                  marginLeft: -ring.dotSize / 2, marginTop: -ring.dotSize / 2,
                  transform: `rotate(${angle}deg) translate(${ring.radius}px)`,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default function Login() {
  const { login, loginAsDemo, loginWithRedirect, signUpWithRedirect } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(null)

  const go = async (e, p, key = 'form') => {
    setBusy(key)
    try {
      const u = await login(e, p)
      nav(u.role === 'company' ? '/company' : '/dashboard')
    } catch (err) {
      toast(err.message, { tone: 'bad' })
      setBusy(null)
    }
  }

  const goDemo = async (a) => {
    setBusy(a.email)
    try {
      const u = await loginAsDemo(a.email, a.password)
      nav(u.role === 'company' ? '/company' : '/dashboard')
    } catch (err) {
      toast(err.message, { tone: 'bad' })
      setBusy(null)
    }
  }

  return (
    <div className="login">
      <TechStrip />
      <div className="login-hero">
        <div className="orbit-wrap"><OrbitSpinner /></div>
        <div className="brand" style={{ padding: 0 }}>
          <div className="brand-logo"><i style={{ height: 14 }} /><i style={{ height: 22 }} /><i style={{ height: 30 }} /></div>
          <div><h2>CareerLens</h2><small>Plan Today, Get Hired Tomorrow</small></div>
        </div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          Every engineering graduate deserves to know <span>why</span> they are not getting hired.
        </motion.h1>
        <motion.div className="gap-visual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div><b><Counter to={10} suffix=" lakh" /></b><span>engineering graduates a year</span></div>
          <div className="vs">vs</div>
          <div><b className="teal"><Counter to={1} suffix=" lakh" /></b><span>entry-level openings</span></div>
        </motion.div>
        <p className="login-note">{INDIA_GAP.note}</p>
        <div className="login-bullets">
          {['Roadmaps with live progress tracking', 'Resume + ATS + rejection reasons', 'Applications tracked from your inbox', 'Mock interviews and market intelligence'].map((t, i) => (
            <motion.div key={t} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.1 }}>✓ {t}</motion.div>
          ))}
        </div>
      </div>

      <div className="login-panel">
        <motion.div className="login-box" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          {USE_MOCK ? (
            <>
              <h2>Welcome back</h2>
              <p className="muted">Sign in, or jump into a demo account to explore.</p>
              <form className="stack gap12 mt16" onSubmit={(e) => { e.preventDefault(); go(email, password) }}>
                <Field label="Email"><div className="input-icon"><Mail size={16} /><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ananya@demo.in" /></div></Field>
                <Field label="Password"><div className="input-icon"><Lock size={16} /><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="demo123" /></div></Field>
                <Button size="lg" loading={busy === 'form'} type="submit">Sign in <ArrowRight size={16} /></Button>
              </form>

              <div className="divider"><span>Demo accounts (password: demo123)</span></div>
              <div className="stack gap8">
                {DEMO_ACCOUNTS.map((a, i) => {
                  const Icon = ICONS[a.role]
                  return (
                    <motion.button key={a.id} className="demo-acc" whileHover={{ x: 4 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }} onClick={() => go(a.email, a.password, a.id)} disabled={!!busy}>
                      <div className="acc-icon" style={{ background: a.color }}><Icon size={20} /></div>
                      <div className="acc-text">
                        <div className="row gap8"><b>{a.name}</b><span className="badge badge-teal">{LABELS[a.role]}</span></div>
                        <span className="muted small">{a.blurb}</span>
                      </div>
                      <ArrowRight size={18} className="muted" />
                    </motion.button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <h2>Welcome back</h2>
              <p className="muted">Sign in with your CareerLens account.</p>
              <div className="stack gap12 mt16">
                <Button size="lg" onClick={() => loginWithRedirect()}>Sign in <ArrowRight size={16} /></Button>
                <Button size="lg" variant="ghost" onClick={signUpWithRedirect}>Create an account</Button>
              </div>
              <p className="muted small mt16">You'll be redirected to a secure AWS Cognito sign-in page.</p>

              <div className="divider"><span>Judging this project? One click, no sign-up</span></div>
              <div className="stack gap8">
                {JUDGE_DEMO_ACCOUNTS.map((a) => {
                  const Icon = a.icon
                  return (
                    <motion.button key={a.email} type="button" className="demo-acc" whileHover={{ x: 4 }} onClick={() => goDemo(a)} disabled={!!busy}>
                      <div className="acc-icon" style={{ background: 'var(--aurora)' }}><Icon size={20} /></div>
                      <div className="acc-text">
                        <div className="row gap8"><b>{a.label}</b></div>
                        <span className="muted small">{a.blurb}</span>
                      </div>
                      <ArrowRight size={18} className="muted" />
                    </motion.button>
                  )
                })}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
