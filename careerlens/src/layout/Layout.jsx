import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, User, Target, FileText, Map, Send, Mic, Newspaper, FlaskConical, Bell, Search, ChevronDown, LogOut,
  RotateCcw, PanelLeftClose, PanelLeftOpen, Building2, Users, Briefcase, Lightbulb, ArrowRight, Sun, Moon, AlertTriangle,
} from 'lucide-react'
import { useAuth, useData, useToast } from '../context/AppContext'
import { Avatar, Button, Drawer, Spinner } from '../components/ui'
import { resetDb, roadmapStats } from '../api'
import { useTheme } from '../hooks/useTheme'

const STUDENT_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/fit', label: 'Job Fit', icon: Target },
  { to: '/resume', label: 'Resume Lab', icon: FileText },
  { to: '/roadmap', label: 'Roadmap', icon: Map },
  { to: '/applications', label: 'Applications', icon: Send },
  { to: '/interview', label: 'Mock Interview', icon: Mic },
  { to: '/market', label: 'Job Market', icon: Newspaper },
  { to: '/lab', label: 'Innovation Lab', icon: FlaskConical },
]
const COMPANY_NAV = [
  { to: '/company', label: 'Overview', icon: Building2 },
  { to: '/talent', label: 'Talent Match', icon: Users },
  { to: '/postings', label: 'Job Postings', icon: Briefcase },
  { to: '/market', label: 'Job Market', icon: Newspaper },
  { to: '/lab', label: 'Innovation Lab', icon: FlaskConical },
]

const GUIDE = {
  ananya: [
    ['Dashboard', '/dashboard', 'Readiness score, the 10-lakh-vs-1-lakh reality strip and next best actions.'],
    ['Roadmap', '/roadmap', 'Android at Google in 8 months. Tick milestones and watch the pace badge change.'],
    ['Resume Lab', '/resume', 'ATS readiness, rejection reasons and project-to-company alignment (her Img2Asset project scores high for a game studio).'],
    ['Applications', '/applications', 'Drag cards, then press "Simulate incoming email" to see auto-sorting.'],
    ['Innovation Lab', '/lab', 'Pivot Finder, Reality Gap Explorer and Micro-Gigs that feed the roadmap.'],
  ],
  vikram: [
    ['Dashboard', '/dashboard', 'Experienced user pivoting after a layoff. Compare with Ananya.'],
    ['Roadmap', '/roadmap', 'He is BEHIND schedule. Press "Re-plan" to see the AI adjust dates.'],
    ['Job Market', '/market', 'Layoffs, hiring trends and news for his former sector.'],
    ['Innovation Lab', '/lab', 'Layoff & Automation Shield shows resilient roles to move into.'],
  ],
  novapixel: [
    ['Overview', '/company', 'Hiring funnel and time-to-shortlist KPIs.'],
    ['Talent Match', '/talent', 'Blind screening ON. Ananya ranks high because her Img2Asset project fits the Technical Artist role.'],
    ['Job Postings', '/postings', 'Post a role and see skills auto-suggested.'],
    ['Innovation Lab', '/lab', 'Employer Skill Challenges and Campus Bridge concepts.'],
  ],
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { rec, loadError, retry } = useData()
  const toast = useToast()
  const { theme, toggleTheme } = useTheme()
  const nav = useNavigate()
  const loc = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [bell, setBell] = useState(false)
  const [menu, setMenu] = useState(false)
  const [guide, setGuide] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }) }, [loc.pathname])
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setBell(false); setMenu(false) } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const items = user.role === 'company' ? COMPANY_NAV : STUDENT_NAV
  const stats = rec?.roadmap ? roadmapStats(rec.roadmap) : null
  const unread = rec?.notifications?.filter((n) => !n.read).length || 0

  const onReset = () => {
    resetDb()
    toast('Demo data reset', { desc: 'All accounts restored to their original state.', tone: 'info' })
    setTimeout(() => window.location.reload(), 600)
  }

  const onSearch = (e) => {
    if (e.key === 'Enter' && q.trim()) { nav(`/market?q=${encodeURIComponent(q.trim())}`); setQ('') }
  }

  return (
    <div className="shell">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <div className="brand-logo"><i style={{ height: 14 }} /><i style={{ height: 22 }} /><i style={{ height: 30 }} /></div>
          {!collapsed && <div><h2>CareerLens</h2><small>Plan Today, Get Hired Tomorrow</small></div>}
        </div>
        <nav className="nav">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.div layoutId="nav-active" className="nav-active-bg" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                  <it.icon size={19} />
                  {!collapsed && <span>{it.label}</span>}
                  {!collapsed && it.to === '/roadmap' && stats?.pace === 'behind' && <span className="nav-badge">!</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          {!collapsed && (
            <div className="promo">
              <b>Track. Improve. Get Hired.</b>
            </div>
          )}
          <button className="nav-item" style={{ marginTop: 8 }} onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div className="guide-fab">
        <Button variant="navy" icon={Lightbulb} onClick={() => setGuide(true)}>Demo guide</Button>
      </div>

      <div className="main">
        <header className="topbar">
          <div className="search">
            <Search size={17} />
            <input placeholder="Search companies, roles, or keywords... (Enter)" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onSearch} />
          </div>
          <div className="spacer" />
          <div className="row gap8" ref={ref} style={{ position: 'relative' }}>
            <button className="icon-btn" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button className="icon-btn bell" onClick={() => { setBell((b) => !b); setMenu(false) }}>
              <Bell size={21} />
              {unread > 0 && <span className="bell-dot" />}
            </button>
            <AnimatePresence>
              {bell && (
                <motion.div className="pop" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="card-title" style={{ padding: '14px 14px 6px', marginBottom: 0 }}>Notifications</div>
                  {rec?.notifications?.map((n) => (
                    <div key={n.id} className="pop-item">
                      <span className="dot" style={{ background: { good: '#10b981', warn: '#f59e0b', bad: '#ef4444', info: '#3b82f6' }[n.tone] }} />
                      <div><div className="bold small">{n.title}</div><div className="muted tiny">{n.desc}</div><div className="tiny muted">{n.time}</div></div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <button className="userbtn" onClick={() => { setMenu((m) => !m); setBell(false) }}>
              <Avatar name={user.name} color={user.color} size={38} />
              <div style={{ textAlign: 'left' }}>
                <div className="bold" style={{ fontSize: 13.5, lineHeight: 1.2 }}>{user.name}</div>
                <div className="muted tiny">{user.title}</div>
              </div>
              <ChevronDown size={16} className="muted" />
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div className="menu" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="small muted" style={{ padding: '8px 12px' }}>{user.email}</div>
                  <button onClick={onReset}><RotateCcw size={16} /> Reset demo data</button>
                  <button onClick={() => { logout(); nav('/login') }}><LogOut size={16} /> Log out / switch account</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main className="content" ref={contentRef}>
          <div className="content-inner">
            {loadError ? (
              <div className="stack gap12" style={{ alignItems: 'center', textAlign: 'center', padding: '64px 24px' }}>
                <AlertTriangle size={32} className="muted" />
                <h3>Couldn't load your workspace</h3>
                <p className="muted small" style={{ maxWidth: 360 }}>{loadError}</p>
                <div className="row gap8">
                  <Button onClick={retry}>Try again</Button>
                  <Button variant="ghost" onClick={() => { logout(); nav('/login') }}>Log out</Button>
                </div>
              </div>
            ) : !rec ? <Spinner label="Loading your workspace..." /> : user.role === 'company' && !rec.company ? (
              <div className="stack gap12" style={{ alignItems: 'center', textAlign: 'center', padding: '64px 24px' }}>
                <AlertTriangle size={32} className="muted" />
                <h3>Company data isn't available yet</h3>
                <p className="muted small" style={{ maxWidth: 360 }}>Your workspace loaded, but the backend didn't return company data for this account — the recruiter stack may not be deployed yet.</p>
                <div className="row gap8">
                  <Button onClick={retry}>Try again</Button>
                  <Button variant="ghost" onClick={() => { logout(); nav('/login') }}>Log out</Button>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={loc.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </main>
      </div>

      <Drawer open={guide} onClose={() => setGuide(false)} title={`Demo guide: ${user.name}`} width={420}>
        <p className="muted small mb16">{user.blurb}</p>
        <div className="stack gap12">
          {(GUIDE[user.id] || []).map(([t, to, d], i) => (
            <div key={t} className="card card-pad" style={{ boxShadow: 'none' }}>
              <div className="row between">
                <div className="bold">{i + 1}. {t}</div>
                <Button size="sm" variant="outline" onClick={() => { nav(to); setGuide(false) }}>Open <ArrowRight size={14} /></Button>
              </div>
              <div className="muted small mt8">{d}</div>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  )
}

