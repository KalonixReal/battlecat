/* fetch-galleries.mjs — fetch Battle Cats unit Gallery pages via z-ai page_reader,
   extract original animation GIF/WebP URLs + captions → public/game/assets/sprites/manifest.json
   Run: bun tools/fetch-galleries.mjs [--only cat,doge] [--pages 6] */
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT = path.dirname(new URL(import.meta.url).pathname) + '/../public/game/assets/sprites';
const GALL_CACHE = path.dirname(new URL(import.meta.url).pathname) + '/.gallery-cache';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(GALL_CACHE, { recursive: true });

/* our game unit id → candidate Fandom page titles (first hit wins) */
const CATS = {
  cat: ['Cat (Normal Cat)'],
  tank: ['Tank Cat (Normal Cat)'],
  axe: ['Axe Cat (Normal Cat)'],
  gross: ['Gross Cat (Normal Cat)'],
  cow: ['Cow Cat (Normal Cat)'],
  bird: ['Bird Cat (Normal Cat)'],
  fish: ['Fish Cat (Normal Cat)'],
  lizard: ['Lizard Cat (Normal Cat)'],
  titan: ['Titan Cat (Normal Cat)'],
  boogie: ['Boogie Cat (Normal Cat)', 'Boogie Cat (Special Cat)'],
  mr: ['Mr. (Special Cat)'],
  bahamut: ['Bahamut Cat (Special Cat)', 'Crazed Bahamut Cat (Special Cat)'],
  kungfu: ['Kung Fu Cat (Special Cat)'],
  rock: ['Rock Cat (Special Cat)'],
  neko: ['Nekoluga (Rare Cat)'],
  pogo: ['Pogo Cat (Rare Cat)'],
  sushi: ['Sushi Cat (Rare Cat)'],
  cutter: ['Cutter Cat (Rare Cat)'],
  pirate: ['Pirate Cat (Rare Cat)'],
  thief: ['Thief Cat (Rare Cat)'],
  sorcerer: ['Witch Cat (Rare Cat)', 'Sorcerer Cat (Rare Cat)'],
  guitar: ['Rocker Cat (Rare Cat)'],
  can: ['Hip Hop Cat (Super Rare Cat)'],
  cyborg: ['Salon Cat (Rare Cat)'],
  seafarer: ['Surfer Cat (Super Rare Cat)'],
  slime: ['Slime Cat (Rare Cat)'],
  paladin: ['Marauder Cat (Uber Rare Cat)', 'Paladin Cat (Uber Rare Cat)'],
  medusa: ['Medusa Cat (Rare Cat)'],
  catman: ['Catman (Uber Rare Cat)'],
  mechabun: ['Mecha-Bun (Uber Rare Cat)'],
  noble: ['Warlord Cat (Uber Rare Cat)', 'Noble Cat (Uber Rare Cat)'],
  kaguya: ['Kaguya Cat (Uber Rare Cat)', 'Kaguya of the Coast (Uber Rare Cat)'],
  dioramos: ['Dioramos (Uber Rare Cat)'],
  gao: ['Gao (Uber Rare Cat)'],
  luza: ['Lufalan Pasalan (Legend Rare Cat)'],
  gatr: ['Gamatruzu (Legend Rare Cat)', 'Gamatiruzu (Legend Rare Cat)', 'Reaper of the Ruins (Legend Rare Cat)'],
  island: ['Island Cat (Rare Cat)'],
  archer: ['Archer Cats (Rare Cat)'],
  fortune: ['Fortune Teller Cat (Rare Cat)'],
  jurassic: ['Jurassic Cat Sitter (Rare Cat)'],
  kotatsu: ['Kotatsu Cat (Super Rare Cat)'],
  valkyrie: ['Valkyrie Cat (Special Cat)'],
  lilcat: ["Li'l Cat (Special Cat)"],
  liltank: ["Li'l Tank Cat (Special Cat)"],
  moneko: ['Moneko (Special Cat)'],
  neneko: ['Neneko (Special Cat)'],
};
const ENEMIES = {
  doge: ['Doge'],
  snache: ['Snache'],
  those: ['Those Guys'],
  baa: ['Baa Baa'],
  jackie: ['Jackie Peng'],
  leboin: ["Le'boin"],
  hippoe: ['Hippoe'],
  sirseal: ['Sir Seal'],
  dudorian: ['Dudorian the Dumpling', 'Pigge'],
  onehorn: ['One Horn'],
  teacher: ['Teacher Bear'],
  croco: ['Croco'],
  shibalien: ['Shibalien'],
  darkotius: ['Dark Otius', 'Otta-smash'],
  face: ['The Face'],
  nyandam: ['Lord Nyandam'],
  redfox: ['Red Fox', 'LeMurya'],
  ghostdoge: ['Ghost Doge', 'Doge Dark'],
  angelgabriel: ['Gabriel'],
  angelseraph: ['Seraphiel'],
  metallic: ['Metal Hippoe'],
  metallicdoge: ['Metal Doge'],
  zombieelephant: ['Zombie Elephant', 'Zang Roo'],
  zombierturtle: ['Zombie Turtle', 'Zirara'],
  zombibear: ['Zombie Bear', 'Zackie Peng'],
  relicdoge: ['Relic Doge'],
  relichippo: ['Ancient Hippoe'],
  akudoge: ['Aku Doge'],
  akucerberus: ['Aku Cerberus', 'Cerberus Kids'],
  akumother: ['Almighty Aku', 'Fallen Bear'],
  akuhound: ['Aku Hound', 'Fallen Bear'],
  behemothcroc: ['Beast Croc', 'Wild Dog'],
  behemothbear: ['Beast Bear', 'Wild Dog'],
  witchen: ['Witchen', 'Wicked Cat'],
  snacheboss: ['Snache the Devourer', 'Znache'],
  clionel: ['Clionel'],
  dogedark: ['Dogeluge', 'Doge Dark'],
  divadoge: ['Diva Doge', 'Doge'],
  titanice: ['Titanice', 'Cli-One'],
  cosmicdoge: ['Cosmic Doge', 'Celeboodle'],
  staralien: ['Star Alien', 'Starre'],
  grizzlynuke: ['Grizzly Nuke', 'Wild Dog'],
  akuhound2: ['Infernal Hound', 'Fallen Bear'],
  gory: ['Gory'],
  wanwan: ['Wanwan'],
  owlbrow: ['Owlbrow'],
  camelle: ['Camelle'],
  mastera: ['Master A.'],
  bore: ['Bore'],
  kurosawah: ['Kurosawah'],
  gregor: ['General Gregor'],
  lesolar: ['LeSolar'],
  spacefish: ['Spacefish Jones'],
  projecta: ['Project A'],
  phace: ['I.M. Phace'],
  dober: ['Dober'],
  sael: ['Imperator Sael'],
  elizabeth: ['Elizabeth the 1st', 'Elizabeth the 1st of England'],
  sunfish: ['Sunfish Jones'],
  celeboodle: ['Celeboodle'],
};

/* ---- parse a gallery page HTML → entries [{file,url,caption,size,w,h}] ---- */
function parseGallery(html) {
  const entries = [];
  const blocks = html.split('<div class="wikia-gallery-item"');
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const href = b.match(/href="\/wiki\/File:([^"]+)"/);
    const src = b.match(/src="(https:\/\/static\.wikia\.nocookie\.net\/battle-cats\/images\/[^"]+)"/);
    const cap = b.match(/<div class="lightbox-caption"[^>]*>([\s\S]*?)<\/div>/);
    if (!href || !src) continue;
    const file = decodeURIComponent(href[1]);
    let url = src[1];
    // original file: strip /scale-to-width-down/NNN?cb=...
    url = url.replace(/\/scale-to-width-down\/\d+.*$/, '');
    const caption = cap ? cap[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
    const titleAttr = b.match(/title="[^"]*\(([\d.]+) *(KB|MB|bytes)\)"/);
    let size = 0;
    if (titleAttr) { size = parseFloat(titleAttr[1]); if (titleAttr[2] === 'MB') size *= 1024; if (titleAttr[2] === 'bytes') size /= 1024; }
    entries.push({ file, url, caption, sizeKB: Math.round(size) });
  }
  return entries;
}

/* ---- also parse infobox/lead images from the MAIN unit page (icons) ---- */
function parseMain(html) {
  const out = [];
  const seen = new Set();
  const re = /<img[^>]+src="(https:\/\/static\.wikia\.nocookie\.net\/battle-cats\/images\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[1].split('?')[0];
    const parts = raw.replace(/^https:\/\/static\.wikia\.nocookie\.net\/battle-cats\/images\//, '').split('/');
    if (parts.length < 5) continue;
    const file = decodeURIComponent(parts[2]);
    if (seen.has(file)) continue;
    seen.add(file);
    if (/\.(png|gif)$/i.test(file)) out.push({ url: 'https://static.wikia.nocookie.net/battle-cats/images/' + parts[0] + '/' + parts[1] + '/' + file + '/revision/latest', file });
  }
  return out;
}

process.on('unhandledRejection', e => console.log('  (late rejection swallowed) ' + String((e && e.message) || e).slice(0, 90)));
const zai = await ZAI.create();
let reqCount = 0;
async function pageRead(url) {
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      reqCount++;
      const invokeP = zai.functions.invoke('page_reader', { url });
      invokeP.catch(() => {}); // never let the loser of the race crash the process
      const res = await Promise.race([
        invokeP,
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 45000))
      ]);
      const html = (res && (res.html || (res.data && res.data.html))) || '';
      if (html.length > 20000) return html;
      console.log('  attempt ' + attempt + ' (empty ' + html.length + 'B) ' + url.slice(-55));
      await new Promise(r => setTimeout(r, 4000));
    } catch (e) {
      const is429 = String((e && e.message) || e).includes('429');
      const wait = is429 ? 60000 + attempt * 15000 : 3000 * attempt;
      console.log('  retry ' + attempt + ' (' + (is429 ? '429' : 'err') + ') ' + url.slice(-55));
      await new Promise(r => setTimeout(r, wait));
    }
  }
  return '';
}
async function fetchPage(url, cacheKey) {
  const cf = GALL_CACHE + '/' + cacheKey + '.html';
  if (fs.existsSync(cf) && fs.statSync(cf).size > 20000) return fs.readFileSync(cf, 'utf8');
  const html = await pageRead(url);
  if (html.length > 20000) fs.writeFileSync(cf, html);
  await new Promise(r => setTimeout(r, 900));
  return html;
}

const args = process.argv.slice(2);
const onlyFlag = args.find(a => a.startsWith('--only='));
const only = onlyFlag ? onlyFlag.split('=')[1].split(',') : null;
const pagesArg = args.find(a => a.startsWith('--pages='));
const CHUNK = pagesArg ? parseInt(pagesArg.split('=')[1]) : 1;

const manifest = {};
const jobs = [];
let existing = {};
try { existing = JSON.parse(fs.readFileSync(OUT + '/manifest.json', 'utf8')); } catch (e) {}
Object.assign(manifest, existing);
for (const [id, pages] of [...Object.entries(CATS), ...Object.entries(ENEMIES)]) {
  if (only && !only.includes(id)) continue;
  const prev = existing[id];
  if (prev && prev.gallery && prev.gallery.length && (prev.mainImages === undefined || prev.mainImages.length)) continue; // resume: already fetched
  jobs.push({ id, pages, kind: Object.prototype.hasOwnProperty.call(CATS, id) ? 'cat' : 'enemy' });
}
console.log('units to fetch:', jobs.length);

for (let i = 0; i < jobs.length; i += CHUNK) {
  const chunk = jobs.slice(i, i + CHUNK);
  const results = await Promise.all(chunk.map(async (job) => {
    for (const title of job.pages) {
      try {
        const gal = await fetchPage('https://battle-cats.fandom.com/wiki/' + encodeURIComponent(title) + '/Gallery', 'g_' + job.id + '_' + title.replace(/[^a-z0-9]+/gi, '_'));
        if (!gal || gal.length < 20000) continue;
        const entries = parseGallery(gal);
        if (!entries.length) continue;
        let main = [];
        try {
          const mp = await fetchPage('https://battle-cats.fandom.com/wiki/' + encodeURIComponent(title), 'm_' + job.id + '_' + title.replace(/[^a-z0-9]+/gi, '_'));
          if (mp && mp.length > 20000) main = parseMain(mp);
        } catch (e) {}
        return { id: job.id, kind: job.kind, title, entries, main };
      } catch (e) { /* try next candidate */ }
    }
    return { id: job.id, kind: job.kind, title: null, entries: [], main: [] };
  }));
  for (const r of results) {
    manifest[r.id] = { kind: r.kind, wikiTitle: r.title, gallery: r.entries, mainImages: r.main };
    const gifs = r.entries.filter(e => /\.(gif|GIF)$/.test(e.file)).length;
    console.log(`${r.id}: ${r.title ? 'OK (' + r.title + ')' : 'MISS'} — ${r.entries.length} gallery files (${gifs} anims), ${r.main.length} main imgs`);
  }
  fs.writeFileSync(OUT + '/manifest.json', JSON.stringify(manifest, null, 1));
}
console.log('DONE → ' + OUT + '/manifest.json');
