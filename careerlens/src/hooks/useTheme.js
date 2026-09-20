import { useEffect, useState } from 'react'

const KEY = 'careerlens_theme'

// Cosmic dark is the default identity of the app; light stays available as an explicit choice
// rather than following the OS preference, per product direction.
export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem(KEY) || 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(KEY, theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  return { theme, toggleTheme }
}
