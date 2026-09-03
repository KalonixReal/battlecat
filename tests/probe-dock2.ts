import { execSync } from 'child_process'
const sh = (c: string) => execSync(c, { encoding: 'utf8', timeout: 30000 })
const js = `
(()=>{const w=document.querySelector('iframe').contentWindow;const cv=w.document.querySelector('canvas');
const c=cv.getContext('2d');const pts=[];
const x0=640-(5*78+4*10)/2;
for(let i=0;i<5;i++){pts.push(Array.from(c.getImageData(x0+i*88+39,560,1,1).data).slice(0,3))}
for(let i=0;i<5;i++){pts.push(Array.from(c.getImageData(x0+i*88+39,652,1,1).data).slice(0,3))}
const gloss=Array.from(c.getImageData(x0+10,534,1,1).data).slice(0,3);
const cost=Array.from(c.getImageData(x0+39,685,1,1).data).slice(0,3);
return JSON.stringify({cards:pts,gloss,cost})})()`
const out = sh(`agent-browser eval "${js.replace(/"/g, '\\"')}"`).trim().replace(/^"|"$/g, '')
console.log(out)
