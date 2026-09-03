// wheel-scroll the trophy grid like a real user
import { execSync } from 'child_process'
const sh=(c:string)=>execSync(c,{encoding:'utf8',timeout:30000}).trim()
// move mouse over the grid, then send wheel events
sh('agent-browser mouse move 400 400')
sh('agent-browser eval "document.querySelector(\'iframe\').contentWindow.__BC.G.scrollTrophy"')
execSync('agent-browser eval "(()=>{const w=document.querySelector(\'iframe\').contentWindow;const cv=w.document.querySelector(\'canvas\');cv.dispatchEvent(new WheelEvent(\'wheel\',{deltaY:320,bubbles:true}));return \'wheeled\'})()"',{stdio:'inherit'})
await new Promise(r=>setTimeout(r,400))
console.log('scroll after wheel:',sh('agent-browser eval "document.querySelector(\'iframe\').contentWindow.__BC.G.scrollTrophy"'))
