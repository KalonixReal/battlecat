#!/usr/bin/env python3
"""build-sprites.py — download real Battle Cats sprites from the Fandom CDN and build
   the game's sprite manifest + optimized PNG frame strips.

   Input : public/game/assets/sprites/manifest.json   (from tools/fetch-galleries.mjs)
           public/game/js/data.js                     (form names for GIF→form matching)
   Output: public/game/assets/sprites/sprites.json
           public/game/assets/sprites/s_{kind}_{id}_{form}.png   (frame strips)
           public/game/assets/sprites/icon_{kind}_{id}_{form}.png (unit icons)

   Sheet naming on the wiki (from game data rips):
     cats   : {num:03d}_f.png = form 1, _c.png = form 2, _s.png = form 3
     enemies: {num:03d}_e.png
     icons  : Uni{num:03d}_{f,c,s}00.png (cats) / Enemy_icon_{num:03d}.png (enemies)
   GIFs: per-form attack/walking animations with captions like "Macho Cat's attack animation".
"""
import json, os, re, sys, time, io, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'public/game/assets/sprites')
RAW = os.path.join(SPR, 'raw')
os.makedirs(RAW, exist_ok=True)

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'}

# ---------- load manifest ----------
manifest = json.load(open(os.path.join(SPR, 'manifest.json')))

# ---------- parse data.js for form names ----------
data_js = open(os.path.join(ROOT, 'public/game/js/data.js')).read()
cat_forms = {}  # id -> [formName0, formName1, formName2]
for m in re.finditer(r"C\('(\w+)','\w+',[^,]+,\[((?:F\([\s\S]*?\)\]?\,?)*)\]", data_js):
    cid = m.group(1)
    names = re.findall(r"F\((['\"])((?:(?!\1).)*)\1", m.group(2))
    cat_forms[cid] = [n[1] for n in names]
enemy_names = {}
for m in re.finditer(r"E\('(\w+)',EF\((['\"])((?:(?!\2).)*)\2", data_js):
    enemy_names[m.group(1)] = m.group(3)

# ---------- downloader ----------
def fetch(url, cache_name, tries=7):
    cf = os.path.join(RAW, cache_name)
    if os.path.exists(cf) and os.path.getsize(cf) > 300:
        return cf
    for t in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=40) as r:
                data = r.read()
            if len(data) > 300 and not data.lstrip()[:15].startswith(b'<!DOCTYPE'):
                open(cf, 'wb').write(data)
                return cf
            # 503 html / placeholder webp — retry
        except Exception as e:
            pass
        time.sleep(1.6 + t * 0.9)
    return None

from PIL import Image
import numpy as np

def load_img(path):
    try:
        return Image.open(path).convert('RGBA')
    except Exception:
        return None

def webp_durations(path):
    """per-frame durations (ms) of an animated webp"""
    data = open(path, 'rb').read()
    if data[:4] != b'RIFF':
        return None
    p = 12; durs = []
    while p + 8 <= len(data):
        fourcc = data[p:p+4]; size = int.from_bytes(data[p+4:p+8], 'little')
        body = data[p+8:p+8+size]
        if fourcc == b'ANMF':
            durs.append(int.from_bytes(body[12:15], 'little'))
        p += 8 + size + (size & 1)
    return durs or None

def content_frames(im, min_gap=1):
    """slice a transparent sheet strip into frames via empty-column runs"""
    a = np.array(im.split()[3])
    cols = (a > 12).any(axis=0)
    frames = []; in_f = False; start = 0
    for x, c in enumerate(cols):
        if c and not in_f: start = x; in_f = True
        elif not c and in_f:
            if x - start >= 3: frames.append((start, x))
            in_f = False
    if in_f and len(cols) - start >= 3: frames.append((start, len(cols)))
    # single huge frame → likely touching frames: uniform split
    if len(frames) <= 1:
        w = frames[0][1] - frames[0][0] if frames else im.width
        if w > 210:
            n = max(2, round(w / 85))
            fw = w / n
            frames = [(frames[0][0] + int(i * fw), frames[0][0] + int((i + 1) * fw)) for i in range(n)]
    return frames

def union_bbox(frames_imgs):
    """union content bbox across PIL images"""
    x0 = 10**9; y0 = 10**9; x1 = 0; y1 = 0
    for im in frames_imgs:
        a = np.array(im.split()[3])
        ys, xs = np.where(a > 12)
        if len(xs) == 0: continue
        x0 = min(x0, int(xs.min())); y0 = min(y0, int(ys.min()))
        x1 = max(x1, int(xs.max()) + 1); y1 = max(y1, int(ys.max()) + 1)
    if x0 > x1: return None
    return (x0, y0, x1, y1)

def sheet_entry(num, suffix):
    """gallery entry for the numeric sheet file"""
    return f'{num:03d}_{suffix}.png'

def gif_frames(path, max_h=230):
    """decode animated webp/gif into equal-size frames (cropped to union bbox)"""
    im = Image.open(path)
    n = getattr(im, 'n_frames', 1)
    if n <= 1: return None, None
    durs = webp_durations(path)
    frames = []
    try:
        for i in range(n):
            im.seek(i)
            frames.append(im.convert('RGBA').copy())
    except Exception:
        return None, None
    bb = union_bbox(frames)
    if not bb: return None, None
    x0, y0, x1, y1 = bb
    frames = [f.crop((x0, y0, x1, y1)) for f in frames]
    if (y1 - y0) > max_h:
        sc = max_h / (y1 - y0)
        frames = [f.resize((max(1, int(f.width * sc)), max(1, int(f.height * sc))), Image.LANCZOS) for f in frames]
    w = max(f.width for f in frames)
    h = frames[0].height
    if any(f.height != h for f in frames):
        h = max(f.height for f in frames)
        frames = [f.crop((0, 0, f.width, h)) if f.height == h else f for f in frames]
    return frames, durs

def strip_from(frames):
    """pack a list of same-height frames into one strip + rects + global anchor"""
    h = max(f.height for f in frames)
    xs = []
    strip = Image.new('RGBA', (sum(f.width for f in frames) + 2 * len(frames), h), (0, 0, 0, 0))
    x = 0
    for f in frames:
        strip.paste(f, (x + 1, h - f.height))
        xs.append((x + 1, f.width))
        x += f.width + 2
    # global anchor: frame 0's content center (keeps per-frame lunge offsets intact)
    a = np.array(frames[0].split()[3])
    ys_, xs_ = np.where(a > 12)
    if len(xs_):
        ax = int((xs_.min() + xs_.max()) / 2) + xs[0][0]
    else:
        ax = xs[0][0] + frames[0].width // 2
    return strip, xs, h, ax, h - 1

def classify_walk_atk(widths):
    """split frame indices into (walk, atk) — attack frames are the trailing wide ones"""
    if not widths: return [], []
    if len(widths) == 1: return [0], [0]
    med = float(np.median(widths))
    thr = med * 1.28
    for i in range(1, len(widths)):
        if widths[i] > thr:
            return list(range(i)), list(range(i, len(widths)))
    return list(range(len(widths))), [len(widths) - 1]  # all walk; last frame doubles as attack

# ---------- process ----------
out_units = {}
icons_out = {}
report = []
MAXH = 190

def norm_gif_name(s):
    return re.sub(r'[^a-z0-9]+', '', s.lower())

for uid, info in manifest.items():
    kind = info.get('kind', 'cat')
    gallery = info.get('gallery', [])
    mains = info.get('mainImages', [])
    forms = cat_forms.get(uid) or [enemy_names.get(uid, '')]
    n_forms = len(forms)

    # --- find numeric id from any sheet/icon reference ---
    num = None
    pat = re.compile(r'^(\d{3})_(?:f|c|s|e|a|p)\.(?:png|PNG)$')
    for e in gallery:
        m = pat.match(e['file'])
        if m: num = int(m.group(1)); break
    if num is None:
        for e in mains:
            m = re.match(r'^(?:Uni|Enemy_icon|E|Udi)(\d{3})', e['file'])
            if m: num = int(m.group(1)); break

    sheets = []   # [(form_idx, path)]
    gif_walk = {} # form_idx -> path
    gif_atk = {}  # form_idx -> path

    for e in gallery:
        f = e['file']; cap = norm_gif_name(e.get('caption', '') + ' ' + f)
        m = pat.match(f)
        if m:
            suf = f.split('_')[-1].split('.')[0].lower()
            fi = {'f': 0, 'c': 1, 's': 2, 'e': 0, 'a': 0, 'p': 0}.get(suf)
            if fi is not None and fi < n_forms:
                p = fetch(e['url'], f'{uid}_{suf}.png')
                if p: sheets.append((fi, p))
            continue
        if not f.lower().endswith('.gif'): continue
        if 'year' in cap or 'announc' in cap or 'april' in cap or 'banner' in cap: continue
        capraw = (e.get('caption', '') or f).lower()
        is_atk = 'attack' in capraw or f.lower().endswith('_attack.gif')
        is_walk = 'walk' in capraw or f.lower().endswith(('_walking.gif', '_walk.gif'))
        if not (is_atk or is_walk): continue
        # match form by form-name in caption (fallback: form 0)
        fi = 0
        for i, fn in enumerate(forms):
            if fn and norm_gif_name(fn) in cap: fi = i; break
        p = fetch(e['url'], f'{uid}_{"atk" if is_atk else "walk"}_{fi}.webp')
        if p:
            (gif_atk if is_atk else gif_walk)[fi] = p

    # --- icons ---
    import shutil
    for e in mains:
        f = e['file']
        m = re.match(r'^Uni(\d{3})_([fcs])0(\d)\.png$', f)
        if m and kind == 'cat':
            fi = {'f': 0, 'c': 1, 's': 2}[m.group(2)]
            if fi < n_forms:
                p = fetch(e['url'], f'icon_{uid}_{fi}.png')
                if p:
                    dst = os.path.join(SPR, f'icon_{uid}_{fi}.png')
                    if not os.path.exists(dst): shutil.copyfile(p, dst)
                    icons_out[f'cat:{uid}:{fi}'] = f'icon_{uid}_{fi}.png'
        m = re.match(r'^Enemy_icon_(\d{3})\.png$', f)
        if m and kind == 'enemy':
            p = fetch(e['url'], f'icon_{uid}_0.png')
            if p:
                dst = os.path.join(SPR, f'icon_{uid}_0.png')
                if not os.path.exists(dst): shutil.copyfile(p, dst)
                icons_out[f'enemy:{uid}:0'] = f'icon_{uid}_0.png'

    # --- build per-form sprite entries ---
    forms_meta = {}
    for fi in range(min(n_forms, 3)):
        walkE = None   # from the sheet strip (walk frames + anchor)
        atkE = None    # from the attack GIF (full in-game motion + timing) or sheet attack frames
        # SHEET: walk frames + anchor (+ attack frames when no GIF covers them)
        cand = [p for f2, p in sheets if f2 == fi] or [p for f2, p in sheets if f2 == 0]
        if cand:
            im = load_img(cand[0])
            if im is not None:
                fr = content_frames(im)
                widths = [e - s0 for s0, e in fr]
                walk, atk = classify_walk_atk(widths)
                if im.height > MAXH:
                    sc = MAXH / im.height
                    im = im.resize((max(1, int(im.width * sc)), MAXH), Image.LANCZOS)
                    fr = [(int(s0 * sc), int(e * sc)) for s0, e in fr]
                a = np.array(im.split()[3])
                ys, xs_ = np.where(a > 12)
                if len(ys):
                    ax = int((xs_.min() + xs_.max()) / 2); ay = int(ys.max())
                else:
                    ax = im.width // 2; ay = im.height - 2
                fn = f's_{kind}_{uid}_{fi}_w.png'
                im.save(os.path.join(SPR, fn))
                walkE = {'img': fn, 'frames': [[s0, e - s0] for s0, e in fr], 'fh': im.height,
                         'idx': walk or [0], 'dur': [100] * len(fr), 'ax': ax, 'ay': ay}
                if fi not in gif_atk:
                    atkE = {'img': fn, 'frames': [[s0, e - s0] for s0, e in fr], 'fh': im.height,
                            'idx': atk or [len(fr) - 1], 'dur': [90] * max(1, len(atk)), 'ax': ax, 'ay': ay}
        # GIF attack: full in-game motion with real timing
        if fi in gif_atk:
            frames, durs = gif_frames(gif_atk[fi])
            if frames and len(frames) >= 2:
                strip, xs, h, ax, ay = strip_from(frames)
                fn = f's_{kind}_{uid}_{fi}_a.png'
                strip.save(os.path.join(SPR, fn))
                atkE = {'img': fn, 'frames': xs, 'fh': h, 'idx': list(range(len(xs))),
                        'dur': durs or [100] * len(xs), 'ax': ax, 'ay': ay}
        # walk GIF fallback
        if walkE is None and fi in gif_walk:
            frames, durs = gif_frames(gif_walk[fi])
            if frames:
                strip, xs, h, ax, ay = strip_from(frames)
                fn = f's_{kind}_{uid}_{fi}_w.png'
                strip.save(os.path.join(SPR, fn))
                walkE = {'img': fn, 'frames': xs, 'fh': h, 'idx': list(range(len(xs))),
                         'dur': durs or [100] * len(xs), 'ax': ax, 'ay': ay}
        if walkE or atkE:
            forms_meta[fi] = {'walk': walkE, 'atk': atkE}
    if forms_meta:
        out_units[f'{kind}:{uid}'] = {'forms': {str(k): v for k, v in forms_meta.items()}}
        best = max(forms_meta.keys())
        src = (forms_meta[best].get('atk') or {}).get('img', '?') + '+' + (forms_meta[best].get('walk') or {}).get('img', '?')
        nf = len(((forms_meta[best].get('walk') or {}).get('frames') or [])) + len(((forms_meta[best].get('atk') or {}).get('frames') or []))
        report.append((kind, uid, info.get('wikiTitle'), sorted(forms_meta.keys()), src, nf))
    else:
        report.append((kind, uid, info.get('wikiTitle'), [], 'NONE', 0))

json.dump({'ver': int(time.time()), 'units': out_units, 'icons': icons_out},
          open(os.path.join(SPR, 'sprites.json'), 'w'), separators=(',', ':'))

print(f'== sprites built: {len(out_units)} units ==')
have = [r for r in report if r[4] != 'NONE']
miss = [r for r in report if r[4] == 'NONE']
print(f'with real sprites: {len(have)}; painter fallback: {len(miss)}')
for r in have:
    print(f"  OK   {r[0]:6s} {r[1]:14s} forms={r[3]} src={r[4]} frames={r[5]}  ({r[2]})")
for r in miss:
    print(f"  MISS {r[0]:6s} {r[1]:14s} ({r[2]})")
