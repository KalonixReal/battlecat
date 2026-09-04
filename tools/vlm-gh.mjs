// VLM relay via GitHub Actions (US runners -> Gemini API)
// Usage:
//   bun tools/vlm-gh.mjs add <imagePath|-> <id> <promptFile|promptText> [model]
//   bun tools/vlm-gh.mjs ask <id> <promptText> [model]        (text-only)
//   bun tools/vlm-gh.mjs push                                  (commit+push+dispatch)
//   bun tools/vlm-gh.mjs run <imagePath> <id> <prompt> [model] (add+push)
//   bun tools/vlm-gh.mjs status                                (workflow run state)
//   bun tools/vlm-gh.mjs collect [idPrefix]                    (pull+print results)
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const REPO = 'KalonixReal/battlecat';
const ROOT = path.resolve(import.meta.dir, '..');
let TOKEN = process.env.GH_TOKEN || '';
try { TOKEN = TOKEN || JSON.parse(fs.readFileSync(path.join(ROOT, '.secrets.json'), 'utf8')).gh; } catch {}
const Q = path.join(ROOT, 'vlm/queue');
const IMGS = path.join(Q, 'images');
const RES = path.join(ROOT, 'vlm/results');
for (const d of [Q, IMGS, RES]) fs.mkdirSync(d, { recursive: true });

function sh(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).toString();
}
function gh(method, urlPath, body) {
  const args = ['-s', '--max-time', '30', '-X', method, `-H`, `Authorization: token ${TOKEN}`,
    '-H', 'Accept: application/vnd.github+json', `https://api.github.com/repos/${REPO}/${urlPath}`];
  if (body) args.push('-d', JSON.stringify(body));
  const out = sh(`curl ${args.map(a => (a.includes(' ') || a.length === 0) ? `'${a.replace(/'/g, "'\\''")}'` : a).join(' ')}`);
  try { return JSON.parse(out); } catch { return { raw: out }; }
}

const cmd = process.argv[2];
async function main() {
  if (cmd === 'add' || cmd === 'run') {
    const [imgPath, id, prompt, model] = process.argv.slice(3);
    if (!id || !prompt) { console.error('need id + prompt'); process.exit(1); }
    let img = null;
    if (imgPath && imgPath !== '-') {
      const ext = path.extname(imgPath) || '.png';
      const dest = path.join(IMGS, id + ext);
      fs.copyFileSync(imgPath, dest);
      img = 'images/' + id + ext;
    }
    fs.writeFileSync(path.join(Q, id + '.json'), JSON.stringify({ id, prompt, image: img, ...(model ? { model } : {}) }, null, 1));
    console.log('staged', id);
    if (cmd === 'run') await push();
  } else if (cmd === 'ask') {
    const [id, prompt, model] = process.argv.slice(3);
    fs.writeFileSync(path.join(Q, id + '.json'), JSON.stringify({ id, prompt, image: null, ...(model ? { model } : {}) }, null, 1));
    console.log('staged (text-only)', id);
  } else if (cmd === 'push') {
    await push();
  } else if (cmd === 'status') {
    const runs = gh('GET', 'actions/runs?per_page=3');
    for (const r of (runs.workflow_runs || [])) console.log(r.name, r.status, r.conclusion, r.created_at);
  } else if (cmd === 'collect') {
    const prefix = process.argv[3] || '';
    try { sh('git pull --rebase -q -X ours 2>&1 || true'); } catch {}
    let files = fs.readdirSync(RES).filter(f => f.endsWith('.json'));
    if (prefix) files = files.filter(f => f.startsWith(prefix));
    for (const f of files) {
      const j = JSON.parse(fs.readFileSync(path.join(RES, f), 'utf8'));
      console.log(`\n===== ${j.id} (${j.model}) ok=${j.ok} =====\n${j.text}`);
      fs.unlinkSync(path.join(RES, f));
    }
    if (!files.length) console.log('(no results yet)');
    else { // clean results dir on remote too
      sh('git add vlm/results && git commit -q -m "vlm: clear collected [skip ci]" --allow-empty 2>/dev/null || true');
      try { sh('git push -q'); } catch {}
    }
  } else {
    console.log('unknown cmd');
  }
}
async function push() {
  sh('git add vlm/ .github/workflows/vlm.yml');
  const st = sh('git status --porcelain vlm/ .github/');
  if (st.trim()) sh('git commit -q -m "vlm: queue batch [skip ci]"');
  sh('git push -q');
  const d = gh('POST', 'actions/workflows/vlm.yml/dispatches', { ref: 'main' });
  console.log('dispatched:', d.message === undefined ? 'OK' : JSON.stringify(d).slice(0, 200));
}
main().catch(e => { console.error(e.message); process.exit(1); });
