import { applicationInsights } from '../api'
import { daysFromNow } from './dates'

// Desktop (Web Notification API) alerts for the Applications tracker. Client-side only — no
// push backend. Dedup state lives in localStorage so a 60s interval check never re-fires the
// same alert twice, even across page reloads.
const NOTIFIED_KEY = 'careerlens_notified_v1'
const STATUS_KEY = 'careerlens_last_status_v1'

const loadSet = (key) => {
  try { return new Set(JSON.parse(localStorage.getItem(key)) || []) } catch { return new Set() }
}
const saveSet = (key, set) => {
  try { localStorage.setItem(key, JSON.stringify([...set])) } catch { /* ignore (private browsing, quota) */ }
}
const loadMap = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} }
}
const saveMap = (key, map) => {
  try { localStorage.setItem(key, JSON.stringify(map)) } catch { /* ignore */ }
}

function fireNotification(title, body, tag) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, { body, tag })
    n.onclick = () => { window.focus(); window.location.hash = '#/applications' }
  } catch { /* ignore (unsupported context) */ }
}

export function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'default') Notification.requestPermission().catch(() => {})
}

export function checkTrackerNotifications(rec) {
  if (!rec?.applications) return
  const notified = loadSet(NOTIFIED_KEY)
  const lastStatus = loadMap(STATUS_KEY)
  let changed = false
  const fire = (id, title, body) => {
    if (notified.has(id)) return
    fireNotification(title, body, id)
    notified.add(id)
    changed = true
  }

  rec.applications.forEach((a) => {
    if (a.status === 'INTERVIEW' && a.interviewDate) {
      const d = daysFromNow(a.interviewDate)
      if (d === 0 || d === 1) {
        fire(`interview:${a.id}:${a.interviewDate}`, 'Interview coming up', `${a.company} - ${a.role}, ${d === 0 ? 'today' : 'tomorrow'}`)
      }
    }
    if (lastStatus[a.id] && lastStatus[a.id] !== a.status) {
      fire(`status:${a.id}:${a.status}`, 'Application updated', `${a.company} - ${a.role} moved to ${a.status}`)
    }
    lastStatus[a.id] = a.status
  })

  applicationInsights(rec.applications).noReply.forEach((a) => {
    fire(`noreply:${a.id}`, 'No reply in 14+ days', `${a.company} - ${a.role} hasn't responded yet. Consider a follow-up.`)
  })

  if (changed) saveSet(NOTIFIED_KEY, notified)
  saveMap(STATUS_KEY, lastStatus)
}
