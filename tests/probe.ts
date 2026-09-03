// Pixel probe for game screenshots — samples key regions and prints average colors
// Usage: bun tests/probe.ts file.png x,y x,y ...
import sharp from 'sharp'
import process from 'process'

const file = process.argv[2]
const pts = process.argv.slice(3)
const img = sharp(file)
const { width, height, data, info } = await img.raw().toBuffer({ resolveWithObject: true })
const px = (x, y) => {
  const xi = Math.round(x), yi = Math.round(y)
  if (xi < 0 || yi < 0 || xi >= info.width || yi >= info.height) return 'OUT'
  const i = (yi * info.width + xi) * info.channels
  return `rgb(${data[i]},${data[i+1]},${data[i+2]})`
}
const avg = (x, y, w, h) => {
  let r = 0, g = 0, b = 0, n = 0
  for (let yy = y; yy < y + h; yy += 2) for (let xx = x; xx < x + w; xx += 2) {
    const i = (yy * info.width + xx) * info.channels
    r += data[i]; g += data[i+1]; b += data[i+2]; n++
  }
  return `rgb(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)})`
}
console.log(`size: ${info.width}x${info.height} ch=${info.channels}`)
for (const p of pts) {
  const [x, y, w, h] = p.split(',').map(Number)
  if (w) console.log(`avg(${p}) = ${avg(x, y, w, h)}`)
  else console.log(`px(${p}) = ${px(x, y)}`)
}
