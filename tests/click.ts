// Click a game button by id from the parent frame (drives real pointer events)
// usage: bun tests/click.ts btnId [waitMs]
import { execSync } from 'child_process'
const id = process.argv[2]
const wait = process.argv[3] || '700'
const sh = (cmd) => execSync(cmd, { encoding: 'utf8', timeout: 30000 }).trim()
// find the hit rect for id this frame
const rect = sh(`agent-browser eval "JSON.stringify(document.querySelector('iframe').contentWindow.__BC.G.hits.find(h=>h.id==='${id}'))"`).replace(/^"|"$/g, '').replace(/\\"/g, '"')
if (rect === 'false' || !rect) { console.log(`BUTTON NOT FOUND: ${id}`); process.exit(2) }
const h = JSON.parse(rect)
const mid = `${Math.round(h.x + h.w / 2)} ${Math.round(h.y + h.h / 2)}`
console.log(`click ${id} at ${mid} (${h.w}x${h.h})`)
execSync(`agent-browser mouse move ${mid} && agent-browser mouse down left && agent-browser mouse up left`, { stdio: 'inherit' })
await new Promise(r => setTimeout(r, Number(wait)))
console.log(sh(`agent-browser eval "document.querySelector('iframe').contentWindow.__BC.G.screen"`))
