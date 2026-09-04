#!/usr/bin/env python3
"""master-to-manifest.py — build the sprite manifest from the wiki MASTER unit lists
   (/tmp/catunits.json + /tmp/enemyunits.json fetched via page_reader) using the
   Fandom CDN's MD5 hash-path convention, so every sheet/icon URL is constructed
   directly with ZERO additional page fetches.

   Wiki file naming (game data rips):
     cat sheets   : {num:03d}_f.png (form 1) / _c.png (form 2) / _s.png (form 3)
     cat icons    : Uni{num:03d}_{f,c,s}00.png
     enemy sheets : {num:03d}_e.png
     enemy icons  : Enemy_icon_{num:03d}.png
   CDN URL: https://static.wikia.nocookie.net/battle-cats/images/{md5[0]}/{md5[:2]}/{file}/revision/latest
"""
import json, re, hashlib, os, sys, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'public/game/assets/sprites')
sys.path.insert(0, ROOT)

def cdn(file):
    h = hashlib.md5(file.encode()).hexdigest()
    return f"https://static.wikia.nocookie.net/battle-cats/images/{h[0]}/{h[:2]}/{urllib.parse.quote(file)}/revision/latest"

def load(path):
    try:
        d = json.load(open(path))
        return d.get('data', d).get('html', '')
    except Exception:
        return ''

def norm(s):
    return re.sub(r'[^a-z0-9]+', '', s.lower())

# ---- our game's unit names (form names for cats, enemy names) ----
data_js = open(os.path.join(ROOT, 'public/game/js/data.js')).read()
cat_names = {}   # ourId -> [form names]
for m in re.finditer(r"C\('(\w+)','\w+',[^,]+,\[((?:F\([\s\S]*?\)\]?\,?)*)\]", data_js):
    cid = m.group(1)
    names = re.findall(r"F\((['\"])((?:(?!\1).)*)\1", m.group(2))
    cat_names[cid] = [n[1] for n in names]
enemy_names = {}
for m in re.finditer(r"E\('(\w+)',EF\((['\"])((?:(?!\2).)*)\2", data_js):
    enemy_names[m.group(1)] = m.group(3)

# page-name → (num, kind): scan <a href="/wiki/NAME"> containing data-image-key="UniNNN_f00.png"/Enemy_icon
def scan_master(html, icon_re):
    out = {}
    if not html:
        return out
    # pairs: a link wrapping an img with data-image-key (any order within a short window)
    for m in re.finditer(r'<a[^>]*href="/wiki/([^"#]+)"[^>]*>([\s\S]{0,400}?)</a>', html):
        href, inner = m.group(1), m.group(2)
        if href.startswith('File:') or href.startswith('Special'):
            continue
        im = re.search(icon_re, inner)
        if im:
            out.setdefault(norm(href), (im.group(1), href))
    # reverse: icon first, then link
    for m in re.finditer(r'data-image-key="' + icon_re + r'\.png"[^>]*>([\s\S]{0,200}?)<a[^>]*href="/wiki/([^"#]+)"', html):
        num, tail = m.group(1), m.group(2)
        if not tail.startswith('File:'):
            out.setdefault(norm(tail), (num, tail))
    return out

cat_html = load('/tmp/catunits.json')
enemy_html = load('/tmp/enemyunits.json')
cat_pages = scan_master(cat_html, r'(Uni\d{3})_f00')
enemy_pages = scan_master(enemy_html, r'(Enemy_icon_\d{3})')

print('cat page entries:', len(cat_pages), '| enemy page entries:', len(enemy_pages))
if not cat_pages and not enemy_pages:
    print('NO master data — aborting (fetch /tmp/catunits.json first)')
    sys.exit(1)

# ---- map our units → numbers ----
manifest = {}
unmatched = []
for uid, forms in cat_names.items():
    found = None
    for fname in forms:
        for key, (num, href) in cat_pages.items():
            if key == norm(fname) or key.startswith(norm(fname)) or norm(href.split('(')[0]) == norm(fname):
                found = (num, href)
                break
        if found:
            break
    if not found:
        unmatched.append(uid)
        continue
    num = re.search(r'(\d{3})', found[0]).group(1)
    gal, mains = [], []
    for i, suf in enumerate('fcs'):
        if i >= len(forms):
            break
        f = f'{num}_{suf}.png'
        gal.append({'file': f, 'url': cdn(f), 'caption': f'{forms[i]} spritesheet', 'sizeKB': 0})
        ic = f'Uni{num}_{suf}00.png'
        mains.append({'url': cdn(ic), 'file': ic})
    manifest[uid] = {'kind': 'cat', 'wikiTitle': found[1].replace('_', ' '), 'gallery': gal, 'mainImages': mains}

for uid, ename in enemy_names.items():
    found = None
    for key, (num, href) in enemy_pages.items():
        if key == norm(ename) or key.startswith(norm(ename)):
            found = (num, href)
            break
    if not found:
        unmatched.append(uid)
        continue
    num = re.search(r'(\d{3})', found[0]).group(1)
    f = f'{num}_e.png'
    ic = f'Enemy_icon_{num}.png'
    manifest[uid] = {'kind': 'enemy', 'wikiTitle': found[1].replace('_', ' '),
                     'gallery': [{'file': f, 'url': cdn(f), 'caption': f'{ename} spritesheet', 'sizeKB': 0}],
                     'mainImages': [{'url': cdn(ic), 'file': ic}]}

# keep any richer existing gallery entries (real captions/GIFs) from the fetcher manifest
try:
    old = json.load(open(os.path.join(SPR, 'manifest.json')))
    for uid, info in old.items():
        if uid in manifest:
            # merge: prefer old gallery (has GIFs w/ captions), add missing sheets from new
            merged = list(info.get('gallery', []))
            have = {g['file'] for g in merged}
            for g in manifest[uid]['gallery']:
                if g['file'] not in have:
                    merged.append(g)
            oldmain = list(info.get('mainImages', []))
            haveM = {g['file'] for g in oldmain}
            for g in manifest[uid]['mainImages']:
                if g['file'] not in haveM:
                    oldmain.append(g)
            manifest[uid]['gallery'] = merged
            manifest[uid]['mainImages'] = oldmain
        else:
            manifest[uid] = info
except Exception:
    pass

json.dump(manifest, open(os.path.join(SPR, 'manifest.json'), 'w'), indent=1)
print('manifest written:', len(manifest), 'units')
print('unmatched (painter fallback):', sorted(set(unmatched)))
