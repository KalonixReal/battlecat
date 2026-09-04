// rescore-galleries.mjs — re-scrape ALL Fandom unit gallery pages via page_reader,
// parse caption-labeled animation entries, merge into tools/galleries_v2.json
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/game/assets/sprites/manifest.json'), 'utf8'));
const OUT = path.join(ROOT, 'tools/galleries_v2.json');
const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};

const zai = await ZAI.create();

function parseGallery(html) {
  const entries = [];
  const blocks = html.split('wikia-gallery-item');
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i].slice(0, 4000);
    const href = b.match(/href="\/wiki\/File:([^"]+)"/);
    const src = b.match(/src="(https:\/\/static\.wikia\.nocookie\.net\/battle-cats\/images\/[^"]+)"/);
    const cap = b.match(/lightbox-caption"[^>]*>([\s\S]*?)<\/div>/);
    if (!src) continue;
    let url = src[1].replace(/\/scale-to-width-down\/\d+.*$/, '');
    const file = href ? decodeURIComponent(href[1]) : decodeURIComponent(url.split('/images/')[1]?.split('/').slice(2).join('/') || '');
    const caption = cap ? cap[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
    entries.push({ file, url, caption });
  }
  if (entries.length) return entries;
  // fallback: any CDN images with a caption-ish alt
  const out = [];
  const seen = new Set();
  const re = /<img[^>]+src="(https:\/\/static\.wikia\.nocookie\.net\/battle-cats\/images\/[^"]+)"[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1].replace(/\/scale-to-width-down\/\d+.*$/, '').split('?')[0];
    const parts = url.replace(/^https:\/\/static\.wikia\.nocookie\.net\/battle-cats\/images\//, '').split('/');
    if (parts.length < 3) continue;
    const file = decodeURIComponent(parts.slice(2).join('/'));
    if (seen.has(file)) continue;
    seen.add(file);
    const tail = html.slice(m.index, m.index + 600);
    const alt = (tail.match(/alt="([^"]{0,120})"/) || [])[1] || '';
    out.push({ file, url, caption: alt });
  }
  return out;
}

async function pageRead(url) {
  for (let a = 1; a <= 5; a++) {
    try {
      const p = zai.functions.invoke('page_reader', { url });
      const res = await Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 45000))]);
      const html = (res && (res.html || (res.data && res.data.html))) || '';
      if (html.length > 5000) return html;
    } catch (e) { }
    await new Promise(r => setTimeout(r, 1200 * a));
  }
  return '';
}

const gids = Object.keys(manifest);
console.log(`scraping ${gids.length} galleries...`);
let done = 0, ok = 0;
for (const gid of gids) {
  if (existing[gid] && existing[gid].entries && existing[gid].entries.length >= 5) { done++; ok++; continue; }
  const title = manifest[gid].wikiTitle;
  const url = `https://battle-cats.fandom.com/wiki/${encodeURIComponent(title).replace(/%20/g, '_')}/Gallery`;
  const html = await pageRead(url);
  done++;
  const entries = parseGallery(html);
  if (entries.length) { existing[gid] = { title, entries }; ok++; }
  console.log(`[${done}/${gids.length}] ${gid} (${title}): ${entries.length} entries`);
  fs.writeFileSync(OUT, JSON.stringify(existing, null, 0));
  await new Promise(r => setTimeout(r, 400));
}
console.log(`DONE: ${ok}/${gids.length} galleries with entries`);
