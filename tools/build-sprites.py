#!/usr/bin/env python3
"""build-sprites.py v2 — download real Battle Cats sprites from the Fandom CDN and build
   the game's sprite manifest + frame data.

   KEY INSIGHT (v2): the wiki's unit sheets ({num}_f/_c/_s/_e.png) are MULTI-ROW GRIDS:
     row 1 (top)    = walk/idle frames (uniform size, shared ground line)
     rows 2..n      = attack frames (reading order, top-to-bottom)
   Frames inside a row may TOUCH (no transparent gap) and separated effects/shadows exist
   as small components.  Column-gap slicing (v1) merged rows into garbled mega-frames.

   v2 algorithm: connected-component analysis → speck attachment → row clustering →
   per-frame rects [sx,sy,sw,sh,ax,ay] with per-row ground lines.

   Attack GIFs (wiki animated rips, IN-GAME orientation: cats face LEFT, enemies face
   RIGHT) are mirrored at build time when needed so EVERYTHING shares the sheet
   orientation (sheets face LEFT — game data convention), then the renderer flips
   uniformly: flip = (dir > 0).

   Output manifest v2 (public/game/assets/sprites/sprites.json):
     units: { "cat:cat": { forms: { "0": {
        walk:{img,frames:[[sx,sy,sw,sh,ax,ay],...],idx,dur,refH}|null,
        atk :{img,frames:[[sx,sy,sw,sh,ax,ay],...],idx,dur,refH}|null } } } }
     icons: { "cat:cat:0":"icon_cat_0.png" }
"""
import json, os, re, sys, time, shutil, urllib.request, urllib.error
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'public/game/assets/sprites')
RAW = os.path.join(SPR, 'raw')
os.makedirs(RAW, exist_ok=True)

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'}
SHEETS_FACE_LEFT = True   # game data convention; enemy GIF rips (in-game: right) get mirrored

manifest = json.load(open(os.path.join(SPR, 'manifest.json')))

# ---------- parse data.js for form names ----------
data_js = open(os.path.join(ROOT, 'public/game/js/data.js')).read()
cat_forms = {}
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
        except Exception:
            pass
        time.sleep(1.6 + t * 0.9)
    return None

def load_img(path):
    try:
        return Image.open(path).convert('RGBA')
    except Exception:
        return None

def webp_durations(path):
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

# ============================== SHEET SLICER v2 ==============================
def sheet_frames(im):
    """Connected-component slicer for multi-row grid sheets.
    Returns list of figure dicts: {x0,y0,x1,y1,area} (merged with specks)."""
    a = np.array(im)[:, :, 3] > 12
    lbl, n = ndimage.label(a, structure=np.ones((3, 3)))
    figs = []; specks = []
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(xs) == 0:
            continue
        f = {'x0': int(xs.min()), 'y0': int(ys.min()), 'x1': int(xs.max()) + 1,
             'y1': int(ys.max()) + 1, 'area': int(len(xs))}
        if f['area'] >= 420 or (f['x1']-f['x0'] >= 16 and f['y1']-f['y0'] >= 16 and f['area'] >= 200):
            figs.append(f)
        elif f['area'] >= 60:
            specks.append(f)
    # attach specks (shadows, separated fists, effects) to the big figure they sit on
    for s in specks:
        best = None; best_d = 10**9
        for f in figs:
            xo = min(s['x1'], f['x1']) - max(s['x0'], f['x0'])
            if xo < 0.30 * (s['x1'] - s['x0']):
                continue
            ygap = max(f['y0'], s['y0']) - min(f['y1'], s['y1'])
            if ygap > 26:
                continue
            d = ygap - xo
            if d < best_d:
                best_d = d; best = f
        if best is not None:
            best['x0'] = min(best['x0'], s['x0']); best['y0'] = min(best['y0'], s['y0'])
            best['x1'] = max(best['x1'], s['x1']); best['y1'] = max(best['y1'], s['y1'])
            best['area'] += s['area']
        elif s['area'] >= 220:
            figs.append(s)  # standalone small frame (tiny units)
    # de-dup contained figures (fully inside another & same area scale → merged copy)
    figs.sort(key=lambda f: (-f['area'], f['x0']))
    out = []
    for f in figs:
        contained = False
        for g in out:
            if f['x0'] >= g['x0'] and f['x1'] <= g['x1'] and f['y0'] >= g['y0'] and f['y1'] <= g['y1'] \
               and f['area'] < 0.92 * g['area']:
                contained = True; break
        if not contained:
            out.append(f)
    return out

def cluster_rows(figs, sheet_h):
    """cluster figures into rows by y-center; returns [[figs...]] top→bottom.
    ANCHOR-based (no drift): each row keeps its first figure's y-center as the
    reference — prevents chain-linking of stacked effect rows into one giant row."""
    fs = sorted(figs, key=lambda f: (f['y0'] + f['y1']) / 2)
    tol = max(18, 0.12 * sheet_h)
    rows = []
    for f in fs:
        yc = (f['y0'] + f['y1']) / 2
        if rows and abs(yc - rows[-1][0]) <= tol:
            rows[-1][1].append(f)
        else:
            rows.append([yc, [f]])
    for r in rows:
        r[1].sort(key=lambda f: f['x0'])
    return [r[1] for r in rows]

def split_mega(fig_row):
    """uniformly split figures much wider than the row median (touching walk frames)"""
    widths = [f['x1'] - f['x0'] for f in fig_row]
    if not widths:
        return fig_row
    med = float(np.median(widths))
    out = []
    for f, w in zip(fig_row, widths):
        if w > 2.6 * med and med > 8:
            n = min(4, max(2, round(w / med)))
            fw = w / n
            for i in range(n):
                g = dict(f)
                g['x0'] = int(f['x0'] + i * fw); g['x1'] = int(f['x0'] + (i + 1) * fw)
                out.append(g)
        else:
            out.append(f)
    return out

def med_area(figs):
    return float(np.median([f['area'] for f in figs])) if figs else 0.0

def sheet_entries(im):
    """Full v2 analysis of one sheet → (walkE, atkE) using sheet-space coords.
    Each entry: frames=[[sx,sy,sw,sh,ax,ay],...] ax=frame center x, ay=row ground line."""
    figs = sheet_frames(im)
    if not figs:
        return None, None
    rows = cluster_rows(figs, im.height)
    max_area = max(f['area'] for f in figs)
    max_h = max(f['y1'] - f['y0'] for f in figs)
    # walk row: topmost row whose median area AND median height are real-figure scale
    # (guards against lone wide-thin banner strips / tiny effect rows)
    walk_row = None; walk_ri = -1
    for ri, row in enumerate(rows):
        med_h_row = float(np.median([f['y1'] - f['y0'] for f in row]))
        if med_area(row) >= 0.12 * max_area and med_h_row >= 0.25 * max_h and len(row) >= 1:
            walk_row = split_mega(row); walk_ri = ri; break
    if walk_row is None:
        walk_row = rows[0]; walk_ri = 0
    # effect filter: keep only walk frames within a sane height band of the row median
    # (drops lone effect sprites / partial poses that would pulse the unit's size)
    if len(walk_row) >= 2:
        med_h = float(np.median([f['y1'] - f['y0'] for f in walk_row]))
        band = [f for f in walk_row if 0.60 * med_h <= (f['y1'] - f['y0']) <= 1.70 * med_h]
        if band:
            walk_row = band
    walk_med_area = med_area(walk_row) or max_area
    walk_med_w = float(np.median([f['x1'] - f['x0'] for f in walk_row]))
    walk_med_h = float(np.median([f['y1'] - f['y0'] for f in walk_row]))
    # attack rows: all others in reading order, drop tiny effect figs + thin strips
    atk_figs = []
    for ri, row in enumerate(rows):
        if ri == walk_ri:
            continue
        for f in row:
            if f['area'] >= 0.15 * walk_med_area and (f['y1'] - f['y0']) >= 0.30 * walk_med_h:
                atk_figs.append(f)
    def make_entry(fig_list, default_dur):
        if not fig_list:
            return None
        # robust ground line: median figure bottom (mixed rows won't float the majority)
        ground = int(np.median([f['y1'] for f in fig_list]))
        frames = [[f['x0'], f['y0'], f['x1'] - f['x0'], f['y1'] - f['y0'],
                   (f['x0'] + f['x1']) // 2, ground] for f in fig_list]
        ref_h = float(np.median([f['y1'] - f['y0'] for f in fig_list]))
        return {'frames': frames, 'idx': list(range(len(frames))),
                'dur': [default_dur] * len(frames), 'refH': ref_h}
    walkE = make_entry(walk_row, 110)
    # single-row sheets: attack = wide frames (>1.28×med) or last frame
    if len(rows) == 1 or not atk_figs:
        widths = [f['x1'] - f['x0'] for f in walk_row]
        med = float(np.median(widths))
        wide = [i for i, w in enumerate(widths) if w > 1.28 * med]
        atkE = make_entry([walk_row[i] for i in (wide or [len(walk_row) - 1])], 90)
    else:
        atkE = make_entry(atk_figs, 90)
    return walkE, atkE

# ============================== GIF (attack) ==============================
def gif_frames(path, max_h=230):
    im = Image.open(path)
    n = getattr(im, 'n_frames', 1)
    if n <= 1:
        return None, None
    durs = webp_durations(path)
    frames = []
    try:
        for i in range(n):
            im.seek(i)
            frames.append(im.convert('RGBA').copy())
    except Exception:
        return None, None
    x0 = 10**9; y0 = 10**9; x1 = 0; y1 = 0
    for f in frames:
        a = np.array(f.split()[3])
        ys, xs = np.where(a > 12)
        if len(xs) == 0:
            continue
        x0 = min(x0, int(xs.min())); y0 = min(y0, int(ys.min()))
        x1 = max(x1, int(xs.max()) + 1); y1 = max(y1, int(ys.max()) + 1)
    if x0 > x1:
        return None, None
    frames = [f.crop((x0, y0, x1, y1)) for f in frames]
    if (y1 - y0) > max_h:
        sc = max_h / (y1 - y0)
        frames = [f.resize((max(1, int(f.width * sc)), max(1, int(f.height * sc))), Image.LANCZOS) for f in frames]
    h = max(f.height for f in frames)
    frames = [f.crop((0, 0, f.width, h)) for f in frames]
    return frames, durs

def gif_entry(frames, durs, mirror):
    """pack decoded gif frames into a strip PNG (v2 manifest coords); mirror if needed"""
    if mirror:
        frames = [f.transpose(Image.FLIP_LEFT_RIGHT) for f in frames]
    h = max(f.height for f in frames)
    strip = Image.new('RGBA', (sum(f.width for f in frames) + 2 * len(frames), h), (0, 0, 0, 0))
    x = 0; frs = []
    for f in frames:
        strip.paste(f, (x + 1, h - f.height))
        frs.append([x + 1, 0, f.width, f.height, 0, h])  # ax filled below
        x += f.width + 2
    # anchor: frame 0's content center (preserves real lunge travel)
    a = np.array(frames[0].split()[3])
    ys, xs = np.where(a > 12)
    if len(xs):
        ax0 = int((xs.min() + xs.max()) / 2) + 1
    else:
        ax0 = 1 + frames[0].width // 2
    for fr in frs:
        fr[4] = ax0
    ref_h = float(np.median([f.height for f in frames]))
    # frame 0's content height inside the union window (for size calibration vs the sheet)
    a0 = np.array(frames[0].split()[3])
    ys0 = np.where((a0 > 12).any(axis=1))[0]
    f0h = int(ys0.max() - ys0.min() + 1) if len(ys0) else ref_h
    E = {'frames': frs, 'idx': list(range(len(frs))),
         'dur': durs or [100] * len(frs), 'refH': ref_h}
    return strip, E, f0h

# ============================== process ==============================
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

    num = None
    pat = re.compile(r'^(\d{3})_(?:f|c|s|e|a|p)\.(?:png|PNG)$')
    for e in gallery:
        m = pat.match(e['file'])
        if m: num = int(m.group(1)); break
    if num is None:
        for e in mains:
            m = re.match(r'^(?:Uni|Enemy_icon|E|Udi)(\d{3})', e['file'])
            if m: num = int(m.group(1)); break

    sheets = []
    gif_atk = {}

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
        if not f.lower().endswith('.gif'):
            continue
        if 'year' in cap or 'announc' in cap or 'april' in cap or 'banner' in cap:
            continue
        capraw = (e.get('caption', '') or f).lower()
        is_atk = 'attack' in capraw or f.lower().endswith('_attack.gif')
        if not is_atk:
            continue
        fi = 0
        for i, fn in enumerate(forms):
            if fn and norm_gif_name(fn) in cap:
                fi = i; break
        p = fetch(e['url'], f'{uid}_atk_{fi}.webp')
        if p:
            gif_atk[fi] = p

    # --- icons (unchanged from v1) ---
    for e in mains:
        f = e['file']
        m = re.match(r'^Uni(\d{3})_([fcs])0(\d)\.png$', f)
        if m and kind == 'cat':
            fi = {'f': 0, 'c': 1, 's': 2}[m.group(2)]
            if fi < n_forms:
                p = fetch(e['url'], f'icon_{uid}_{fi}.png')
                if p:
                    dst = os.path.join(SPR, f'icon_{uid}_{fi}.png')
                    if not os.path.exists(dst):
                        shutil.copyfile(p, dst)
                    icons_out[f'cat:{uid}:{fi}'] = f'icon_{uid}_{fi}.png'
        m = re.match(r'^Enemy_icon_(\d{3})\.png$', f)
        if m and kind == 'enemy':
            p = fetch(e['url'], f'icon_{uid}_0.png')
            if p:
                dst = os.path.join(SPR, f'icon_{uid}_0.png')
                if not os.path.exists(dst):
                    shutil.copyfile(p, dst)
                icons_out[f'enemy:{uid}:0'] = f'icon_{uid}_0.png'

    # --- build per-form entries ---
    forms_meta = {}
    for fi in range(min(n_forms, 3)):
        walkE = None; atkE = None
        walk_img = None
        cand = [p for f2, p in sheets if f2 == fi] or [p for f2, p in sheets if f2 == 0]
        if cand:
            im = load_img(cand[0])
            if im is not None:
                wE, aE = sheet_entries(im)
                if wE:
                    # downscale very tall sheets for disk size; scale coords accordingly
                    if im.height > MAXH:
                        sc = MAXH / im.height
                        im2 = im.resize((max(1, int(im.width * sc)), MAXH), Image.LANCZOS)
                        for E in (wE, aE):
                            if E:
                                for fr in E['frames']:
                                    fr[0] = int(fr[0] * sc); fr[1] = int(fr[1] * sc)
                                    fr[2] = max(1, int(fr[2] * sc)); fr[3] = max(1, int(fr[3] * sc))
                                    fr[4] = int(fr[4] * sc); fr[5] = int(fr[5] * sc)
                                E['refH'] = max(8.0, E['refH'] * sc)  # keep refH in scaled coords
                        im = im2
                    walk_img = im
                    walkE = wE; atkE = aE
                    if atkE and walkE:
                        atkE['refH'] = walkE['refH']  # same sheet → same pixel scale
        if walkE is not None:
            fn = f's_{kind}_{uid}_{fi}_w.png'
            walk_img.save(os.path.join(SPR, fn))
            walkE['img'] = fn
            if atkE:
                atkE['img'] = fn  # attack frames live in the same sheet image
        # attack GIF: real in-game motion + timing (mirrored to sheet orientation)
        if fi in gif_atk:
            frames, durs = gif_frames(gif_atk[fi])
            if frames and len(frames) >= 2:
                mirror = SHEETS_FACE_LEFT and kind == 'enemy'
                strip, E, f0h = gif_entry(frames, durs, mirror)
                # size calibration: gif's standing pose (f0) should render at the
                # same size as the sheet's walk frame 0 → refH scales the window
                if walkE and walkE.get('frames') and f0h and f0h > 4:
                    w0sh = walkE['frames'][0][3] or 1
                    E['refH'] = max(8.0, f0h * walkE['refH'] / max(8.0, w0sh))
                else:
                    E['refH'] = max(8.0, float(f0h or E['refH']))
                fn = f's_{kind}_{uid}_{fi}_a.png'
                strip.save(os.path.join(SPR, fn))
                E['img'] = fn
                atkE = E
        if walkE or atkE:
            forms_meta[fi] = {'walk': walkE, 'atk': atkE}
    if forms_meta:
        out_units[f'{kind}:{uid}'] = {'forms': {str(k): v for k, v in forms_meta.items()}}
        f0 = forms_meta[0] if 0 in forms_meta else list(forms_meta.values())[0]
        nw = len((f0.get('walk') or {}).get('frames') or [])
        na = len((f0.get('atk') or {}).get('frames') or [])
        report.append((kind, uid, info.get('wikiTitle'), sorted(forms_meta.keys()), nw, na))
    else:
        report.append((kind, uid, info.get('wikiTitle'), [], 0, 0))

json.dump({'ver': int(time.time()), 'v': 2, 'units': out_units, 'icons': icons_out},
          open(os.path.join(SPR, 'sprites.json'), 'w'), separators=(',', ':'))

print(f'== sprites built: {len(out_units)} units (v2) ==')
have = [r for r in report if r[4] or r[5]]
miss = [r for r in report if not (r[4] or r[5])]
print(f'with real sprites: {len(have)}; none: {len(miss)}')
for r in have:
    print(f"  OK   {r[0]:6s} {r[1]:14s} forms={r[3]} walk={r[4]} atk={r[5]}  ({r[2]})")
for r in miss:
    print(f"  MISS {r[0]:6s} {r[1]:14s} ({r[2]})")
