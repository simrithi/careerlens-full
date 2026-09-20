import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import { authApi } from '../api'
import { SEED } from '../data/seed'
import { USE_MOCK, setTokenProvider } from '../api/http'
import { setBundle } from '../api/bundleCache'
import { currentUser, getValidIdToken, handleRedirectCallback, redirectToLogin, redirectToSignUp, demoLogin, logout as cognitoLogout } from '../api/cognito'
import { checkTrackerNotifications, requestNotificationPermission } from '../utils/trackerNotifications'

/* ---------------- Toasts ---------------- */
const ToastCtx = createContext(null)
export const useToast = () => useContext(ToastCtx)

const TOAST_ICONS = { good: CheckCircle2, warn: AlertTriangle, info: Info, bad: XCircle }

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const toast = useCallback((title, opts = {}) => {
    const id = Math.random().toString(36).slice(2)
    setItems((s) => [...s, { id, title, tone: 'good', ...opts }])
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), opts.duration || 3800)
  }, [])
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-wrap">
        <AnimatePresence>
          {items.map((t) => {
            const Icon = TOAST_ICONS[t.tone] || Info
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, x: 60, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60 }} className={`toast toast-${t.tone}`}>
                <Icon size={20} />
                <div>
                  <div className="toast-title">{t.title}</div>
                  {t.desc && <div className="toast-desc">{t.desc}</div>}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------------- Auth ---------------- */
const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)
const SESSION_KEY = 'careerlens_session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!USE_MOCK) return currentUser() // synchronous, from persisted Cognito tokens (see api/cognito.js)
    // Demo deep link: http://localhost:5173/?as=ananya (also vikram, novapixel) logs in directly.
    const as = new URLSearchParams(window.location.search).get('as')
    if (as && SEED[as]) {
      const u = { ...SEED[as].account }
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(u)) } catch { /* ignore */ }
      return u
    }
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
  })
  // True while handling a Hosted UI redirect on boot, so Protected routes don't bounce to /login
  // mid-exchange. Always false in mock mode.
  const [authLoading, setAuthLoading] = useState(!USE_MOCK)

  useEffect(() => {
    if (USE_MOCK) return
    setTokenProvider(getValidIdToken)
    handleRedirectCallback()
      .then((u) => { if (u) setUser(u) })
      .catch((err) => console.error('Cognito sign-in failed:', err.message))
      .finally(() => setAuthLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    if (!USE_MOCK) throw new Error('Real mode uses loginWithRedirect(), not email/password — see Login.jsx')
    const u = await authApi.login(email, password)
    localStorage.setItem(SESSION_KEY, JSON.stringify(u))
    setUser(u)
    return u
  }, [])
  // One-click judge/demo sign-in for real mode — see api/cognito.js#demoLogin. Not gated on
  // USE_MOCK the other way: this only ever gets called from the real-mode Login.jsx branch.
  const loginAsDemo = useCallback(async (email, password) => {
    const u = await demoLogin(email, password)
    setUser(u)
    return u
  }, [])
  const logout = useCallback(() => {
    if (!USE_MOCK) { cognitoLogout(); return } // redirects to Hosted UI logout, page unmounts
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])
  const value = useMemo(
    () => ({ user, login, loginAsDemo, logout, authLoading, loginWithRedirect: redirectToLogin, signUpWithRedirect: redirectToSignUp }),
    [user, login, loginAsDemo, logout, authLoading]
  )
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

/* ---------------- Data (the logged-in user's record) ---------------- */
const DataCtx = createContext(null)
export const useData = () => useContext(DataCtx)

export function DataProvider({ children }) {
  const { user, authLoading, logout } = useAuth()
  const [rec, setRec] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)
  const retry = useCallback(() => setRetryTick((t) => t + 1), [])

  useEffect(() => {
    // Wait for authLoading to clear (real mode: Cognito redirect handling + setTokenProvider)
    // before fetching — otherwise this can fire before the token provider is wired and every
    // real request gets a 401 with no way to recover (see api/cognito.js, api/http.js).
    if (authLoading) return
    let alive = true
    setRec(null)
    setLoadError(null)
    if (user) {
      authApi.getBundle(user.id)
        .then((r) => {
          if (!alive) return
          // Recruiter/roadmap/applications backend stacks aren't deployed yet (see
          // docs/api-contract.md) — GET /me/bundle for a real company account comes back
          // without `company`. Rather than block the whole portal on that, layer in the same
          // sample company + candidates data mock mode uses, so the demo still works end-to-end
          // on a real Cognito session. Re-seed bundleCache too, so later mutations (addRole,
          // toggleShortlist) merge onto this instead of an empty cache.
          if (!USE_MOCK && user.role === 'company' && !r.company) {
            r = setBundle({
              ...r,
              company: JSON.parse(JSON.stringify(SEED.novapixel.company)),
              shortlist: r.shortlist ?? [],
              votes: r.votes ?? {},
              notifications: r.notifications?.length ? r.notifications : JSON.parse(JSON.stringify(SEED.novapixel.notifications)),
            })
          }
          setRec(r)
        })
        .catch((err) => { console.error('getBundle failed:', err.message); if (alive) setLoadError(err.message) })
    }
    return () => { alive = false }
  }, [user, authLoading, retryTick])

  // run(promise): every api mutation resolves with the fresh record; we just store it.
  const run = useCallback(async (promise) => {
    const r = await promise
    setRec(r)
    return r
  }, [])

  // Desktop notifications for the Applications tracker (interview reminders, no-reply
  // follow-ups, status changes). Client-side only, checked on every data refresh plus a 60s
  // interval so date-crossing (e.g. "interview is now tomorrow") is caught without a mutation.
  useEffect(() => { requestNotificationPermission() }, [])
  useEffect(() => {
    if (!rec) return
    checkTrackerNotifications(rec)
    const id = setInterval(() => checkTrackerNotifications(rec), 60000)
    return () => clearInterval(id)
  }, [rec])

  const value = useMemo(() => ({ rec, setRec, run, userId: user?.id, loadError, retry, logout }), [rec, run, user, loadError, retry, logout])
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}
