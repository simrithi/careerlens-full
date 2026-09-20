// Captures screenshots of the running app through Edge/Chrome DevTools. Usage: node scripts/shots.mjs <outDir>
// Needs the dev server on :5173 and a browser started with --remote-debugging-port=9222.
import { writeFileSync, mkdirSync } from 'node:fs'

const out = process.argv[2] || 'shots'
mkdirSync(out, { recursive: true })
const BASE = 'http://localhost:5173'
const SHOTS = [
  ['login', '', '/login', 900],
  ['dashboard', 'ananya', '/dashboard', 1350],
  ['roadmap', 'ananya', '/roadmap', 1500],
  ['roadmap_vikram', 'vikram', '/roadmap', 1500],
  ['applications', 'ananya', '/applications', 950],
  ['resume', 'ananya', '/resume', 1600],
  ['fit', 'ananya', '/fit', 1500],
  ['profile', 'ananya', '/profile', 1000],
  ['interview', 'ananya', '/interview', 800],
  ['market', 'ananya', '/market', 1200],
  ['lab', 'ananya', '/lab', 1250],
  ['talent', 'novapixel', '/talent', 1400],
  ['company', 'novapixel', '/company', 900],
  ['lab_pivot', 'ananya', '/lab', 1100, "document.querySelector('.feat button.btn-primary').click()"],
  ['email_parsed', 'ananya', '/applications', 1000, "[...document.querySelectorAll('button')].find(b => b.innerText.includes('Simulate incoming email')).click()"],
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function shot([name, as, route, h, js]) {
  const t = await (await fetch('http://localhost:9222/json/new?about:blank', { method: 'PUT' })).json()
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map()
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id) } }
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: h, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${BASE}/${as ? `?as=${as}` : ''}#${route}` })
  await sleep(6500)
  if (js) { await send('Runtime.evaluate', { expression: js }); await sleep(3500) }
  const r = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${out}/${name}.png`, Buffer.from(r.result.data, 'base64'))
  ws.close()
  await fetch(`http://localhost:9222/json/close/${t.id}`)
  console.log('saved', name)
}

for (const s of SHOTS) await shot(s)
