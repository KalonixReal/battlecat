#!/usr/bin/env python3
"""census-sheets.py — download all unit sheets and classify: full-frame (sliceable) vs parts-atlas.
   full-frame: few components per row, similar large areas, coherent figures
   atlas: many small disparate parts"""
import json, os, re, sys, time, hashlib, urllib.request, urllib.parse
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'public/game/assets/sprites/raw')
os.makedirs(RAW, exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0'}

def cdn(f):
    h = hashlib.md5(f.encode()).hexdigest()
    return f"https://static.wikia.nocookie.net/battle-cats/images/{h[0]}/{h[:2]}/{urllib.parse.quote(f)}/revision/latest"

def fetch(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 400: return path
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=40) as r:
            d = r.read()
        if len(d) > 400:
            open(path, 'wb').write(d); return path
    except Exception: pass
    return None

manifest = json.load(open(os.path.join(ROOT, 'public/game/assets/sprites/manifest.json')))
data_js = open(os.path.join(ROOT, 'public/game/js/data.js')).read()
cat_forms = {}
for m in re.finditer(r"C\('(\w+)','\w+',\[([\s\S]*?)\]\)", data_js):
    names = re.findall(r"F\((['\"])(.*?)\1", m.group(2))
    cat_forms[m.group(1)] = [n[1] for n in names]

out = {}
for gid, info in manifest.items():
    kind = info['kind']
    g = json.dumps(info)
    m = re.search(r'Enemy_icon_(\d{3})', g) if kind == 'enemy' else re.search(r'Uni(\d{3})_f00', g)
    if not m: continue
    num = m.group(1)
    suffixes = ['f', 'c', 's'] if kind == 'cat' else ['e']
    n_forms = len(cat_forms.get(gid, ['x'])) if kind == 'cat' else 1
    for fi in range(min(n_forms, 3)):
        suf = suffixes[fi]
        sf = f'{num}_{suf}.png'
        p = fetch(cdn(sf), os.path.join(RAW, sf))
        if not p:
            out[f'{gid}:{fi}'] = {'sheet': sf, 'status': 'nodl'}
            continue
        try:
            im = Image.open(p).convert('RGBA')
        except Exception:
            out[f'{gid}:{fi}'] = {'sheet': sf, 'status': 'badimg'}
            continue
        a = np.asarray(im)[:, :, 3]
        lab, n = ndimage.label(a > 12)
        sizes = ndimage.sum(a > 12, lab, range(1, n + 1)) if n else []
        big = [s for s in sizes if s > 150]
        if not big:
            out[f'{gid}:{fi}'] = {'sheet': sf, 'status': 'empty'}
            continue
        med = float(np.median(big))
        # figures = components with area >= 8% of median-big
        figs = [s for s in sizes if s >= 0.08 * med]
        ratio = len(figs) / max(1, len(big))
        # full-frame heuristic: <=14 figures total AND median figure is sizeable
        full = len(figs) <= 14 and med >= 300
        out[f'{gid}:{fi}'] = {'sheet': sf, 'status': 'ok', 'comps': int(n),
                              'figs': int(len(figs)), 'medarea': int(med),
                              'type': 'full' if full else 'atlas', 'size': list(im.size)}
        print(f"{gid}:{fi} {sf} comps={n} figs={len(figs)} med={int(med)} -> {out[f'{gid}:{fi}']['type']}", flush=True)
    time.sleep(0.1)

json.dump(out, open(os.path.join(ROOT, 'tools/sheet_census.json'), 'w'), indent=1)
fulls = sum(1 for v in out.values() if v.get('type') == 'full')
atl = sum(1 for v in out.values() if v.get('type') == 'atlas')
print(f"\nFULL-FRAME: {fulls}, ATLAS: {atl}, total {len(out)}")
