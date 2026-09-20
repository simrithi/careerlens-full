// Date helpers. All demo data is generated relative to "today" so the demo never looks stale.
export const iso = (offsetDays = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

export const daysBetween = (a, b = new Date()) =>
  Math.round((new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)) / 86400000)

export const daysFromNow = (dateStr) => -daysBetween(dateStr) // positive = in the future

export const fmtDate = (s) =>
  s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'

export const fmtDateLong = (s) =>
  s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

export const timeAgo = (daysAgo) =>
  daysAgo <= 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`

export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}`

// Last n calendar month labels ending at the current month (oldest first) — for chart x-axes
// that show "the last few months," so labels never drift stale outside a hardcoded date range.
export const lastNMonths = (n) => {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)
    return d.toLocaleDateString('en-US', { month: 'short' })
  })
}
