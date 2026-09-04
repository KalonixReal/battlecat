#!/usr/bin/env python3
"""build-sprites.py v3 — the definitive sprite/animation pipeline.

FIXES over v2:
  1. ROW ORDER: verified conventions — CAT sheets: row0(top)=ATTACK-ish, row1(bottom)=WALK-ish
     (mixed rows!); ENEMY sheets: row0=WALK, row1=ATTACK. v2 had cats INVERTED.
  2. MIXED-ROW CLASSIFICATION: when an attack animation GIF/WebP is available, each sheet
     frame is classified attack-like vs neutral via normalized-RGB correlation against the
     GIF (also resolves per-sheet ORIENTATION empirically: direct vs mirrored).
  3. REAL ANIMATIONS as attack source: gallery WebP/GIFs (transparent, real frame timing).
     Cat attack GIFs face LEFT in-game -> mirrored to sheet convention; enemies face RIGHT -> kept.
  4. ENEMY WALK from Miraheze Idle GIFs (static-background recordings) via background
     subtraction (tools/bgstrip.extract) — real walk cycles for matched enemies.
  5. Real frame durations everywhere (gif/webp ANMF parsing); walk dur uniform fallback.

Output manifest v3 (public/game/assets/sprites/sprites.json):
  units: { "kind:id": { forms: { fi: {
      walk: {img, frames[[sx,sy,sw,sh,ax,ay]...], idx, dur, refH, src},
      atk : {img, frames, idx, dur, refH, src} } } } }
  icons: { "kind:id:fi": "icon_*.png" }   (preserved from v2)
"""
import json, os, re, sys, time, hashlib, shutil, urllib.request, urllib.parse, subprocess
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'public/game/assets/sprites')
RAW = os.path.join(SPR, 'raw')
os.makedirs(RAW, exist_ok=True)
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from bgstrip import extract as bg_extract  # noqa: E402

UA = {'User-Agent': 'Mozilla/5.0'}
REPORT = []

def cdn(file):
    h = hashlib.md5(file.encode()).hexdigest()
    return f"https://static.wikia.nocookie.net/battle-cats/images/{h[0]}/{h[:2]}/{urllib.parse.quote(file)}/revision/latest"

def fetch(url, path, tries=5):
    if os.path.exists(path) and os.path.getsize(path) > 400:
        return path
    for a in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=45) as r:
                data = r.read()
            if len(data) > 400:
                open(path, 'wb').write(data)
                return path
        except Exception:
            time.sleep(0.8 + a)
    return None

def fetch_mz(path_md5, path):
    """Miraheze file via weserv proxy (keeps animation with &n=-1)."""
    if os.path.exists(path) and os.path.getsize(path) > 400:
        return path
    url = f'https://images.weserv.nl/?url=static.wikitide.net/battlecatswiki/{path_md5}&n=-1'
    return fetch(url, path, tries=3)

# ---------------- sheet slicing (v2 lineage, returns ALL rows) ----------------

def sheet_frames(im):
    """connected-component + row clustering; returns (rows, frames)
       rows: [(y0,y1)], frames: [{x,y,w,h,ax,ay,row}]"""
    a = np.asarray(im)[:, :, 3]
    H, W = a.shape
    mask = a > 12
    lab, n = ndimage.label(mask)
    if n == 0:
        return [], []
    objs = ndimage.find_objects(lab)
    comps = []
    for i, sl in enumerate(objs):
        y0, y1 = sl[0].start, sl[0].stop
        x0, x1 = sl[1].start, sl[1].stop
        area = int((lab[sl] == i + 1).sum())
        comps.append({'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0, 'area': area})
    if not comps:
        return [], []
    med_area = np.median([c['area'] for c in comps])
    figs = [c for c in comps if c['area'] >= max(40, 0.06 * med_area)]
    specks = [c for c in comps if c not in figs]
    # attach specks below/inside figures (shadows)
    for s in specks[:]:
        for f in figs:
            if (s['x'] >= f['x'] - 6 and s['x'] + s['w'] <= f['x'] + f['w'] + 6 and
                    0 <= s['y'] - (f['y'] + f['h']) <= 10):
                f['h'] = s['y'] + s['h'] - f['y']
                f['w'] = max(f['w'], s['x'] + s['w'] - f['x'])
                specks.remove(s)
                break
    # row clustering by y-center
    for f in figs:
        f['cy'] = f['y'] + f['h'] / 2
    figs.sort(key=lambda f: f['cy'])
    rows = []
    cur = [figs[0]]
    for f in figs[1:]:
        if abs(f['cy'] - np.mean([g['cy'] for g in cur])) <= max(16, 0.10 * H):
            cur.append(f)
        else:
            rows.append(cur); cur = [f]
    rows.append(cur)
    frames = []
    for ri, row in enumerate(rows):
        row.sort(key=lambda f: f['x'])
        for f in row:
            frames.append({'x': f['x'], 'y': f['y'], 'w': f['w'], 'h': f['h'],
                           'ax': f['x'] + f['w'] / 2, 'ay': f['y'] + f['h'], 'row': ri})
    return [(int(min(f['y'] for f in r)), int(max(f['y'] + f['h'] for f in r))) for r in rows], frames

def frames_to_strip(im, frames, path):
    """pack frames into a single-row strip; returns frames with strip-space rects"""
    xs = []
    off = 0
    out = []
    for f in frames:
        out.append({**f, 'sx': off, 'sy': 0})
        off += f['w']
    strip = Image.new('RGBA', (max(1, off), max(f['h'] for f in frames)), (0, 0, 0, 0))
    for f, o in zip(frames, out):
        tile = im.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
        strip.paste(tile, (o['sx'], o['sy']))
    strip.save(path)
    rects = [[o['sx'], o['sy'], o['w'], o['h'], o['sx'] + o['w'] / 2, o['h']] for o in out]
    return rects

# ---------------- correlation classification ----------------

def norm_rgb(im, size=(36, 36)):
    a = np.asarray(im)[:, :, 3]
    ys, xs = np.where(a > 12)
    if len(xs) < 12:
        return None
    c = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)).resize(size)
    arr = np.asarray(c, dtype=np.float32)[:, :, :3]
    return (arr - arr.mean()) / (arr.std() + 1e-6)

def corr(a, b):
    return float((a * b).mean())

def gif_frames(path, max_frames=24):
    im = Image.open(path)
    fr, durs, i = [], [], 0
    while i < max_frames * 4:
        try:
            im.seek(i)
        except EOFError:
            break
        fr.append(im.convert('RGBA'))
        durs.append(im.info.get('duration', 80) or 80)
        i += 1
        if len(fr) >= max_frames:
            break
    return fr, durs

# ---------------- source discovery ----------------

def load_json(p):
    try:
        return json.load(open(p))
    except Exception:
        return {}

def find_attack_gif(gid, kind, fi, form_name, galleries, miraheze):
    """return (local_path, source_tag) for a transparent attack animation"""
    g = galleries.get(gid, {}).get('entries', [])
    nm = re.sub(r'[^a-z0-9]+', '', (form_name or '').lower())
    # 1) gallery caption match: "<Form>'s attack animation"
    for e in g:
        cap = (e.get('caption', '') + ' ' + e.get('file', '')).lower()
        if 'attack' not in cap:
            continue
        if nm and nm in re.sub(r'[^a-z0-9]+', '', cap):
            url = e['url']
            ext = '.webp' if '.webp' in url.lower() else '.gif'
            p = os.path.join(RAW, f'{gid}_atk_{fi}{ext}')
            if fetch(url, p):
                return p, 'gallery'
    # 2) any gallery entry with 'attack animation' (single-form units)
    for e in g:
        cap = (e.get('caption', '')).lower()
        if "attack animation" in cap:
            url = e['url']
            p = os.path.join(RAW, f'{gid}_atk_{fi}.gif')
            if fetch(url, p):
                return p, 'gallery'
    # 3) Fandom name-based probe: {Title}_attack.gif
    title = galleries.get(gid, {}).get('title', '')
    if title:
        p = os.path.join(RAW, f'{gid}_atk_{fi}_t.gif')
        if fetch(cdn(f'{title}_attack.gif'), p):
            return p, 'nameprobe'
    # 4) existing raw webp from previous session
    for legacy in [f'{gid}_atk_{fi}.webp', f'{os.path.basename(gid)}_atk_{fi}.webp']:
        p = os.path.join(RAW, legacy)
        if os.path.exists(p) and os.path.getsize(p) > 400:
            return p, 'legacy'
    return None, None

def find_idle_gif(gid, title, num, miraheze):
    """return local path of a Miraheze Idle{Title}.gif (static-bg recording)"""
    # name-based (from gif_match)
    gm = load_json(os.path.join(ROOT, 'tools/gif_match.json'))
    e = gm.get(gid, {})
    if e.get('walk_gif'):
        p = os.path.join(RAW, f'{gid}_idle.gif')
        if fetch_mz(e['walk_gif'], p):
            return p
    return None

# ---------------- per-unit build ----------------

def main():
    manifest = load_json(os.path.join(SPR, 'manifest.json'))
    galleries = load_json(os.path.join(ROOT, 'tools/galleries_v2.json'))
    miraheze = load_json(os.path.join(ROOT, 'tools/miraheze_gifs.json'))
    old = load_json(os.path.join(SPR, 'sprites.json'))

    data_js = open(os.path.join(ROOT, 'public/game/js/data.js')).read()
    # cat form names
    cat_forms = {}
    for m in re.finditer(r"C\('(\w+)','\w+',\[([\s\S]*?)\]\)", data_js):
        names = re.findall(r"F\((['\"])(.*?)\1", m.group(2))
        cat_forms[m.group(1)] = [n[1] for n in names]

    units_out = {}
    for gid, info in manifest.items():
        kind = info['kind']
        title = info.get('wikiTitle', '')
        g = json.dumps(info)
        mnum = (re.search(r'Enemy_icon_(\d{3})', g) if kind == 'enemy' else re.search(r'Uni(\d{3})_f00', g))
        if not mnum:
            REPORT.append(f'SKIP {gid}: no wiki num')
            continue
        num = mnum.group(1)
        n_forms = len(cat_forms.get(gid, ['x'])) if kind == 'cat' else 1
        forms_out = {}
        old_forms = old.get('units', {}).get(kind + ':' + gid, {}).get('forms', {})
        for fi in range(n_forms):
            suffix = ('fcs'[fi] if fi < 3 else 's') if kind == 'cat' else 'e'
            form_name = cat_forms.get(gid, [title] * 3)[fi] if kind == 'cat' else title
            sheet_f = f'{num}_{suffix}.png' if kind == 'cat' else f'{num}_e.png'
            sp = fetch(cdn(sheet_f), os.path.join(RAW, sheet_f))
            if not sp:
                REPORT.append(f'{gid} f{fi}: sheet download FAIL {sheet_f}')
                continue
            try:
                im = Image.open(sp).convert('RGBA')
            except Exception as e:
                REPORT.append(f'{gid} f{fi}: sheet decode FAIL {e}')
                continue
            rows, frames = sheet_frames(im)
            if not frames:
                REPORT.append(f'{gid} f{fi}: no frames in sheet')
                continue
            heights = [f['h'] for f in frames]
            med_h = float(np.median(heights))

            # --- attack animation source ---
            gifp, gsrc = find_attack_gif(gid, kind, fi, form_name, galleries, miraheze)
            gif_im_frames, gif_durs = ([], [])
            if gifp:
                try:
                    gif_im_frames, gif_durs = gif_frames(gifp, max_frames=20)
                except Exception as e:
                    REPORT.append(f'{gid} f{fi}: gif decode FAIL {e}')

            mirror_sheet = False
            walk_sel, atk_sel = [], []
            if gif_im_frames:
                # classify sheet frames vs gif frames (both orientations)
                gn = [n for n in (norm_rgb(f) for f in gif_im_frames[:10]) if n is not None]
                ds, fs = [], []
                for f in frames:
                    tile = im.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
                    n = norm_rgb(tile)
                    if n is None:
                        ds.append(0); fs.append(0); continue
                    ds.append(max(corr(n, g) for g in gn))
                    fn = np.ascontiguousarray(n[:, ::-1])
                    fs.append(max(corr(fn, g) for g in gn))
                mirror_sheet = (np.mean(fs) > np.mean(ds))
                # attack-like = top 40% by match score
                score = [max(a, b) for a, b in zip(ds, fs)]
                order = np.argsort(score)[::-1]
                n_atk = max(2, int(len(frames) * 0.4))
                atk_idx = set(order[:n_atk].tolist())
                walk_sel = [f for i, f in enumerate(frames) if i not in atk_idx]
                atk_sel = [f for i, f in enumerate(frames) if i in atk_idx]
                src_atk = f'gif:{gsrc}'
            else:
                # row-order fallback (fixed conventions)
                if kind == 'cat':
                    walk_rows = {max(0, len(rows) - 1)} if len(rows) > 1 else {0}
                    atk_rows = set(range(len(rows))) - walk_rows or {0}
                else:
                    walk_rows = {0}
                    atk_rows = set(range(len(rows))) - walk_rows or {min(1, len(rows) - 1)}
                for f in frames:
                    if f['row'] in walk_rows and 0.6 * med_h <= f['h'] <= 1.5 * med_h:
                        walk_sel.append(f)
                    elif f['row'] in atk_rows:
                        atk_sel.append(f)
                # cats: rows mixed -> anything unassigned but small goes to walk
                assigned = {id(f) for f in walk_sel} | {id(f) for f in atk_sel}
                for f in frames:
                    if id(f) not in assigned and f['h'] <= 1.4 * med_h:
                        walk_sel.append(f)
                if not atk_sel and walk_sel:
                    atk_sel = walk_sel[-1:]
                src_atk = 'sheet-rows'

            if not walk_sel:
                walk_sel = frames[:max(1, len(frames) // 2)]
            if not atk_sel:
                atk_sel = frames

            # --- orientation: mirror sheet if classified so; mirror cat GIFs (face LEFT in-game)
            if mirror_sheet:
                im = im.transpose(Image.FLIP_LEFT_RIGHT)
                for f in frames:
                    f['x'] = im.size[0] - f['x'] - f['w']
                    f['ax'] = f['x'] + f['w'] / 2
                for f in walk_sel + atk_sel:
                    pass  # coords already updated via frames list mutation

            # --- build walk strip from sheet frames
            walk_sorted = sorted(walk_sel, key=lambda f: (f['y'], f['x']))
            w_rects = frames_to_strip(im, walk_sorted, os.path.join(SPR, f's_{kind}_{gid}_{fi}_w.png'))
            refH = float(np.median([f['h'] for f in walk_sorted]))
            walk_entry = {
                'img': f's_{kind}_{gid}_{fi}_w.png',
                'frames': w_rects,
                'idx': list(range(len(w_rects))),
                'dur': [110] * len(w_rects),
                'refH': refH,
                'src': 'sheet',
            }

            # --- attack: prefer the REAL animation GIF
            atk_entry = None
            if gif_im_frames:
                mirror_gif = (kind == 'cat')  # cats face LEFT in-game; sheets/renders face RIGHT
                gf = [f.transpose(Image.FLIP_LEFT_RIGHT) if mirror_gif else f for f in gif_im_frames]
                # normalize durations
                gd = [max(40, int(d)) for d in gif_durs] or [90] * len(gf)
                # calibrate scale: gif f0 standing height -> walk frame median height
                a = np.asarray(gf[0])[:, :, 3]
                ys, xs = np.where(a > 12)
                f0h = float(ys.max() - ys.min() + 1) if len(xs) > 12 else med_h
                gif_refH = f0h
                rects = []
                off = 0
                W = sum(f.size[0] for f in gf)
                Hh = max(f.size[1] for f in gf)
                strip = Image.new('RGBA', (W, Hh), (0, 0, 0, 0))
                for f in gf:
                    strip.paste(f, (off, 0), f)
                    aa = np.asarray(f)[:, :, 3]
                    yy, xx = np.where(aa > 12)
                    ax = off + (xx.min() + xx.max()) / 2 if len(xx) else off + f.size[0] / 2
                    ay = yy.max() if len(yy) else Hh  # gif bottom = ground
                    rects.append([off, 0, f.size[0], f.size[1], ax, ay])
                    off += f.size[0]
                fn = f's_{kind}_{gid}_{fi}_a.png'
                strip.save(os.path.join(SPR, fn))
                atk_entry = {
                    'img': fn, 'frames': rects, 'idx': list(range(len(rects))),
                    'dur': gd, 'refH': round(gif_refH * (refH / max(8, refH)), 1),
                    'gifRefH': round(gif_refH, 1), 'walkRefH': round(refH, 1),
                    'src': src_atk,
                }
            else:
                atk_sorted = sorted(atk_sel, key=lambda f: (f['y'], f['x']))
                a_rects = frames_to_strip(im, atk_sorted, os.path.join(SPR, f's_{kind}_{gid}_{fi}_a.png'))
                atk_entry = {
                    'img': f's_{kind}_{gid}_{fi}_a.png',
                    'frames': a_rects,
                    'idx': list(range(len(a_rects))),
                    'dur': [90] * len(a_rects),
                    'refH': refH,
                    'src': src_atk,
                }

            forms_out[str(fi)] = {'walk': walk_entry, 'atk': atk_entry}

        # --- enemy walk override from Idle GIF (real walk cycle)
        if kind == 'enemy' and forms_out:
            ip = find_idle_gif(gid, title, num, miraheze)
            if ip:
                try:
                    r = bg_extract(ip, max_frames=48)
                    if r:
                        frames_bg, masks = r
                        keep = [i for i, msk in enumerate(masks) if msk.mean() > 0.02]
                        if len(keep) >= 3:
                            subs = [i for i in keep][:20]
                            tiles = []
                            for i in subs:
                                rgba = np.dstack([frames_bg[i], (masks[i] * 255).astype(np.uint8)])
                                t = Image.fromarray(rgba.astype(np.uint8))
                                a = np.asarray(t)[:, :, 3]
                                yy, xx = np.where(a > 12)
                                if len(xx) < 20:
                                    continue
                                t = t.crop((xx.min(), yy.min(), xx.max() + 1, yy.max() + 1))
                                tiles.append((t, 100))
                            if tiles:
                                refH = forms_out.get('0', {}).get('walk', {}).get('refH') or \
                                       float(np.median([t.size[1] for t, _ in tiles]))
                                scale = refH / max(8, float(np.median([t.size[1] for t, _ in tiles])))
                                rects, off = [], 0
                                tiles_r = []
                                for t, d in tiles:
                                    if scale != 1:
                                        t = t.resize((max(1, int(t.size[0] * scale)), max(1, int(t.size[1] * scale))))
                                    tiles_r.append((t, d))
                                W = sum(t.size[0] for t, _ in tiles_r)
                                Hh = max(t.size[1] for t, _ in tiles_r)
                                strip = Image.new('RGBA', (W, Hh), (0, 0, 0, 0))
                                for t, d in tiles_r:
                                    strip.paste(t, (off, Hh - t.size[1]), t)
                                    rects.append([off, Hh - t.size[1], t.size[0], t.size[1],
                                                  off + t.size[0] / 2, Hh])
                                    off += t.size[0]
                                fn = f's_{kind}_{gid}_0_w.png'
                                strip.save(os.path.join(SPR, fn))
                                forms_out['0']['walk'] = {
                                    'img': fn, 'frames': rects, 'idx': list(range(len(rects))),
                                    'dur': [d for _, d in tiles_r], 'refH': round(float(np.median([t.size[1] for t, _ in tiles_r])), 1),
                                    'src': 'idle-gif'}
                except Exception as e:
                    REPORT.append(f'{gid}: idle-gif walk FAIL {e}')

        if forms_out:
            units_out[kind + ':' + gid] = {'forms': forms_out}
            srcs = ','.join(sorted({fms[a]['src'] for fms in forms_out.values() for a in ('walk', 'atk') if fms.get(a)}))
            REPORT.append(f"OK {gid} ({title}) forms={len(forms_out)} src=[{srcs}]")
        else:
            # carry over old entry if present
            uid = kind + ':' + gid
            if old.get('units', {}).get(uid):
                units_out[uid] = old['units'][uid]
                REPORT.append(f'KEEP-OLD {gid}')

    icons = old.get('icons', {})
    out = {'ver': int(time.time()), 'v': 3, 'units': units_out, 'icons': icons}
    json.dump(out, open(os.path.join(SPR, 'sprites.json'), 'w'), separators=(',', ':'))
    print('\n'.join(REPORT))
    n_walk_gif = sum(1 for u in units_out.values() for f in u['forms'].values() if f['walk']['src'] == 'idle-gif')
    n_atk_gif = sum(1 for u in units_out.values() for f in u['forms'].values() if f['atk']['src'].startswith('gif'))
    print(f"\n== sprites v3 built: {len(units_out)} units; walk from idle-gif: {n_walk_gif}; atk from real gif: {n_atk_gif}")

if __name__ == '__main__':
    main()
