// probe deploy-dock card pixels: expect dark navy cards with gloss variance
import { execSync } from 'child_process'
const sh = (c: string) => execSync(c, { encoding: 'utf8', timeout: 30000 })
const js = `
(()=>{const w=document.querySelector('iframe').contentWindow;const cv=w.document.querySelector('canvas');
const c=cv.getContext('2d');const pts=[];
for(let i=0;i<5;i++){const x=362+i*88,y=560;pts.push(Array.from(c.getImageData(x,y,1,1).data).slice(0,3))}
for(let i=0;i<5;i++){const x=362+i*88,y=652;pts.push(Array.from(c.getImageData(x,y,1,1).data).slice(0,3))}
return JSON.stringify(pts)})()`
const out = sh(`agent-browser eval "${js.replace(/"/g, '\\"')}"`).trim().replace(/^"|"$/g, '')
console.log('dock card pixels (row1 y=560, row2 y=652):', out)
