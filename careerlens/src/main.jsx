import React from 'react'
import { MotionGlobalConfig } from 'framer-motion'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/base.css'
import './styles/pages.css'

// ?static in the URL turns animations off (used for capturing screenshots / PDFs).
if (new URLSearchParams(window.location.search).has('static')) MotionGlobalConfig.skipAnimations = true

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
