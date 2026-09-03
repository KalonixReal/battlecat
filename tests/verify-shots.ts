// Verify screenshots are non-blank: reports % of non-background pixels + top colors
import sharp from 'sharp'
import { readdirSync } from 'fs'
const dir = 'tests/shots'
for (const f of readdirSync(dir).sort()) {
  if (!f.endsWith('.png')) continue
  const { data, info } = await sharp(`${dir}/${f}`).raw().toBuffer({ resolveWithObject: true })
  let nonBg = 0, n = 0
  const colors = new Map()
  for (let i = 0; i < data.length; i += info.channels * 7) {
    n++
    const r = data[i], g = data[i+1], b = data[i+2]
    const key = `${r>>4},${g>>4},${b>>4}`
    colors.set(key, (colors.get(key) || 0) + 1)
    // not the page background #14141a
    if (Math.abs(r-20) + Math.abs(g-20) + Math.abs(b-26) > 30) nonBg++
  }
  const top = [...colors.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([c,k])=>`${c}:${(100*k/n).toFixed(0)}%`).join(' ')
  console.log(`${f.padEnd(14)} nonBg=${(100*nonBg/n).toFixed(1)}%  top=[${top}]`)
}
