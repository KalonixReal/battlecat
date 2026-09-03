import { execSync } from 'child_process'
const sh = (c: string) => execSync(c, { encoding: 'utf8', timeout: 20000 }).trim()
console.log(sh('agent-browser eval "document.querySelector(\'iframe\').contentWindow.__BC.G.scrollHome"'))
