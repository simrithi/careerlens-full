import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useInView } from 'framer-motion'
import { X, Info, Loader2, TrendingUp, TrendingDown } from 'lucide-react'

export const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: Math.min(i, 12) * 0.05, ease: 'easeOut' },
})

export function Card({ children, className = '', hover, delay = 0, pad = true, style, onClick }) {
  return (
    <motion.div
      {...fadeUp(delay)}
      whileHover={hover ? { y: -3, boxShadow: '0 14px 30px rgba(0,0,0,0.14)' } : undefined}
      className={`card ${pad ? 'card-pad' : ''} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}

export function CardTitle({ icon: Icon, children, right }) {
  return (
    <div className="card-title">
      <div className="row gap8">
        {Icon && <Icon size={18} className="icon-teal" />}
        <span>{children}</span>
      </div>
      {right}
    </div>
  )
}

export function Button({ children, variant = 'primary', size = 'md', icon: Icon, loading, className = '', ...rest }) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} whileHover={{ scale: rest.disabled ? 1 : 1.02 }} className={`btn btn-${variant} btn-${size} ${className}`} {...rest}>
      {loading ? <Loader2 size={16} className="spin" /> : Icon ? <Icon size={16} /> : null}
      {children}
    </motion.button>
  )
}

export const Badge = ({ tone = 'gray', children, icon: Icon }) => (
  <span className={`badge badge-${tone}`}>{Icon && <Icon size={12} />}{children}</span>
)

export const Chip = ({ children, onRemove, active, onClick }) => (
  <span className={`chip ${active ? 'chip-active' : ''} ${onClick ? 'chip-click' : ''}`} onClick={onClick}>
    {children}
    {onRemove && <X size={12} onClick={(e) => { e.stopPropagation(); onRemove() }} />}
  </span>
)

export function Avatar({ name, color = '#84cc16', size = 36 }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('')
  return <div className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>{initials}</div>
}

export function Counter({ to, duration = 1.2, prefix = '', suffix = '', decimals = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView || !ref.current) return
    const c = animate(0, to, {
      duration, ease: 'easeOut',
      onUpdate: (v) => { if (ref.current) ref.current.textContent = `${prefix}${v.toFixed(decimals)}${suffix}` },
    })
    return () => c.stop()
  }, [inView, to, duration, prefix, suffix, decimals])
  return <span ref={ref}>{`${prefix}0${suffix}`}</span>
}

export function Ring({ value, size = 120, stroke = 11, color = 'var(--teal)', label, sub, children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(100, value) / 100) }}
          transition={{ duration: 1.3, ease: 'easeOut' }}
        />
      </svg>
      <div className="ring-center">
        {children || (
          <>
            <div className="ring-value" style={{ fontSize: size * 0.25 }}><Counter to={value} suffix={label ?? '%'} /></div>
            {sub && <div className="ring-sub">{sub}</div>}
          </>
        )}
      </div>
    </div>
  )
}

export function Bar({ value, color = 'var(--teal)', height = 8, marker, delay = 0 }) {
  return (
    <div className="bar-track" style={{ height }}>
      <motion.div className="bar-fill" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, value))}%` }} transition={{ duration: 0.9, delay, ease: 'easeOut' }} />
      {marker != null && <div className="bar-marker" style={{ left: `${marker}%` }} />}
    </div>
  )
}

export function Tabs({ tabs, value, onChange, id = 'tabs' }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t.id} className={`tab ${value === t.id ? 'active' : ''}`} onClick={() => onChange(t.id)}>
          {t.icon && <t.icon size={15} />}
          {t.label}
          {t.count != null && <span className="tab-count">{t.count}</span>}
          {value === t.id && <motion.div layoutId={`${id}-underline`} className="tab-underline" />}
        </button>
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children, width = 560, footer }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="modal" style={{ maxWidth: width }} initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{title}</h3>
              <button className="icon-btn" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-foot">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Drawer({ open, onClose, title, children, width = 480 }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="drawer" style={{ width }} initial={{ x: width }} animate={{ x: 0 }} exit={{ x: width }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{title}</h3>
              <button className="icon-btn" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="modal-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <motion.div {...fadeUp(0)} className="page-header">
      <div>
        <h1>{Icon && <Icon size={26} className="icon-teal" />}{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="row gap8 wrap">{actions}</div>}
    </motion.div>
  )
}

// solid: renders as a bold flat-color bento tile (matching a Dribbble-style bento mosaic)
// instead of a neutral card with a colored icon chip. span: bento grid-span modifier class
// ('b-wide' | 'b-tall' | 'b-lg'), applied by the caller to build an asymmetric mosaic.
export function StatCard({ icon: Icon, label, value, suffix = '', delta, tone = 'teal', sub, delay = 0, solid = false, span = '' }) {
  const up = delta >= 0
  return (
    <Card hover delay={delay} className={`statcard ${span} ${solid ? `tile tile-${tone}` : ''}`}>
      <div className={`stat-icon tone-${tone}`}><Icon size={22} /></div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value"><Counter to={value} suffix={suffix} /></div>
        {(delta != null || sub) && (
          <div className="stat-sub">
            {delta != null && (
              <span className={up ? 'delta-up' : 'delta-down'}>{up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{Math.abs(delta)}%</span>
            )}
            {sub && <span className="muted"> {sub}</span>}
          </div>
        )}
      </div>
    </Card>
  )
}

export const Empty = ({ icon: Icon, title, desc, action }) => (
  <div className="empty">
    {Icon && <Icon size={34} />}
    <div className="bold">{title}</div>
    {desc && <div className="muted small">{desc}</div>}
    {action}
  </div>
)

export const Disclaimer = ({ children }) => (
  <div className="disclaimer"><span className="disclaimer-icon"><Info size={14} /></span><span>{children}</span></div>
)

export const Spinner = ({ label = 'Loading...' }) => (
  <div className="center-fill"><Loader2 className="spin" size={28} /><span className="muted">{label}</span></div>
)

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle">
      <span className={`toggle-track ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
        <motion.span className="toggle-thumb" layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
      </span>
      {label && <span className="small bold">{label}</span>}
    </label>
  )
}

export const Field = ({ label, children, hint }) => (
  <label className="field">
    <span className="label">{label}</span>
    {children}
    {hint && <span className="hint">{hint}</span>}
  </label>
)

export const Skeleton = ({ h = 20, w = '100%' }) => <div className="skeleton" style={{ height: h, width: w }} />

// Tiny confetti burst for milestone completion
export function Confetti({ show }) {
  const pieces = Array.from({ length: 26 })
  const colors = ['#84cc16', '#f59e0b', '#6366f1', '#ef4444', '#3b82f6', '#ec4899']
  return (
    <AnimatePresence>
      {show && (
        <div className="confetti">
          {pieces.map((_, i) => (
            <motion.span
              key={i}
              className="confetti-piece"
              style={{ background: colors[i % colors.length], left: `${(i * 37) % 100}%` }}
              initial={{ y: -20, opacity: 1, rotate: 0 }}
              animate={{ y: 420 + (i % 5) * 60, opacity: 0, rotate: 360 + i * 20, x: (i % 2 ? 1 : -1) * (30 + (i % 7) * 12) }}
              transition={{ duration: 1.6 + (i % 4) * 0.2, ease: 'easeOut' }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}

export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null })
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    fn().then((data) => alive && setState({ loading: false, data, error: null })).catch((error) => alive && setState({ loading: false, data: null, error }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

export const toneOf = (score) => (score >= 75 ? 'green' : score >= 50 ? 'amber' : 'red')
export const colorOf = (score) => (score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444')

// Matches projectAlignment()'s own label breakpoints in api/engine.js ("Direct hire signal" /
// "Relevant" / "Weak signal") — keep the two in sync so a project's badge color never disagrees
// with its label.
export const alignmentTone = (score) => (score >= 70 ? 'green' : score >= 40 ? 'amber' : 'gray')
export const alignmentColor = (score) => (score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#94a3b8')

// Matches resilience()'s own label breakpoints in api/engine.js ("Resilient" / "Watch closely" /
// "At risk").
export const resilienceTone = (score) => (score >= 75 ? 'green' : score >= 55 ? 'amber' : 'red')
export const resilienceColor = (score) => (score >= 75 ? '#10b981' : score >= 55 ? '#f59e0b' : '#ef4444')

// Skill have/need ratio (0-1 scale, not a 0-100 score) — used for skill-bar coloring.
export const ratioColor = (ratio) => (ratio >= 1 ? '#10b981' : ratio >= 0.7 ? '#f59e0b' : '#ef4444')
