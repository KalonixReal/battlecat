#!/usr/bin/env python3
"""build-cutout.py — render ALL units' official cutout animations into strips + sprites.json v3.
   Walk = {base}00.maanim, Attack = {base}02.maanim. 20fps (50ms/frame).
   Strips keep a per-anim UNION bbox (no frame jitter); unit origin tracked per frame."""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cutout_render as cr
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANIM = os.path.join(ROOT, 'public/game/assets/sprites/animdata')
SPR = os.path.join(ROOT, 'public/game/assets/sprites')
K = 1.1  # px per model unit (global proportion scale)
FPS_MS = 50

manifest = json.load(open(os.path.join(SPR, 'manifest.json')))
old = json.load(open(os.path.join(SPR, 'sprites.json')))
data_js = open(os.path.join(ROOT, 'public/game/js/data.js')).read()
cat_forms = {}
for m in __import__('re').finditer(r"C\('(\w+)','\w+',\[([\s\S]*?)\]\)", data_js):
    names = __import__('re').findall(r"F\((['\"])(.*?)\1", m.group(2))
    cat_forms[m.group(1)] = [n[1] for n in names]

def render_strip(unit_dir, base, anim_idx):
    apath = os.path.join(unit_dir, f'{base}{anim_idx:02d}.maanim')
    if not os.path.exists(apath): return None, 'no anim file'
    try:
        tex = Image.open(os.path.join(unit_dir, base + '.png')).convert('RGBA')
        cuts = cr.parse_imgcut(cr.read_text(os.path.join(unit_dir, base + '.imgcut')))['cuts']
        mm = cr.parse_mamodel(cr.read_text(os.path.join(unit_dir, base + '.mamodel')))
        ma = cr.parse_maanim(cr.read_text(apath))
        if not mm or not ma or not cuts: return None, 'parse fail'
        L = max(1, min(30, cr.ma_len(ma)))
        ents = [cr.EPart(i, p, mm) for i, p in enumerate(mm['parts'])]
        frames = []
        CW, CH = 760, 640
        ox, oy = 380, 520
        for f in range(L):
            for ep in ents: ep.setValue()
            cr.apply_anim(ents, ma, f)
            img = cr.render_frame_flat(ents, mm, tex, cuts, 1.0, CH, CW, ox, oy)
            frames.append(img)
        # union bbox
        x0, y0, x1, y1 = CW, CH, 0, 0
        for f in frames:
            bb = f.getbbox()
            if not bb: continue
            x0, y0 = min(x0, bb[0]), min(y0, bb[1])
            x1, y1 = max(x1, bb[2]), max(y1, bb[3])
        if x1 <= x0 or y1 <= y0: return None, 'empty frames'
        pad = 2
        x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
        x1, y1 = min(CW, x1 + pad), min(CH, y1 + pad)
        tiles = [f.crop((x0, y0, x1, y1)) for f in frames]
        # pack strip
        W = sum(t.size[0] for t in tiles)
        H = max(t.size[1] for t in tiles)
        strip = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        rects = []
        off = 0
        for t in tiles:
            strip.paste(t, (off, 0))
            rects.append([off, 0, t.size[0], t.size[1], ox - x0, oy - y0])
            off += t.size[0]
        refH = float(oy - y0)  # ground line at origin
        return {'strip': strip, 'rects': rects, 'refH': refH, 'dur': [FPS_MS] * len(rects)}, None
    except Exception as e:
        return None, f'{type(e).__name__}: {e}'

def main():
    units_out = {}
    report = []
    # resume support: pick up an in-progress manifest
    RESUME = os.path.join(SPR, 'sprites_v3_wip.json')
    if os.path.exists(RESUME):
        wip = json.load(open(RESUME))
        for k, v in wip.get('units', {}).items():
            units_out[k] = v
        print(f'resuming with {len(units_out)} units done', flush=True)
    n_cutout = n_fallback = 0
    for gid, info in manifest.items():
        kind = info['kind']
        g = json.dumps(info)
        mnum = (__import__('re').search(r'Enemy_icon_(\d{3})', g) if kind == 'enemy'
                else __import__('re').search(r'Uni(\d{3})', g))
        if not mnum:
            report.append(f'SKIP {gid} (no num)')
            continue
        num = mnum.group(1)
        uid = kind + ':' + gid
        if kind == 'cat':
            n_forms = min(len(cat_forms.get(gid, ['x'])), 3)
            forms = [('fcs'[fi]) for fi in range(n_forms)]
        else:
            forms = ['e']
        forms_out = {}
        for fi, suf in enumerate(forms):
            base = f'{num}_{suf}'
            udir = os.path.join(ANIM, kind, gid)
            if not os.path.exists(os.path.join(udir, base + '.png')):
                continue
            entry = {}
            for anim_idx, key in [(0, 'walk'), (2, 'atk')]:
                r, err = render_strip(udir, base, anim_idx)
                if r:
                    fn = f'c_{kind}_{gid}_{fi}_{key}.png'
                    r['strip'].save(os.path.join(SPR, fn), optimize=True)
                    entry[key] = {'img': fn, 'frames': r['rects'], 'idx': list(range(len(r['rects']))),
                                  'dur': r['dur'], 'refH': round(r['refH'], 1), 'src': 'cutout'}
                else:
                    report.append(f'{gid} f{fi} {key}: FAIL {err}')
            if entry:
                forms_out[str(fi)] = entry
        if forms_out:
            units_out[uid] = {'forms': forms_out}
            n_cutout += 1
            report.append(f"OK {gid} ({info['wikiTitle']}) forms={len(forms_out)}")
            print(f"OK {gid} forms={len(forms_out)}", flush=True)
            json.dump({'ver': int(time.time()), 'v': 3, 'units': units_out, 'icons': old.get('icons', {})},
                      open(RESUME, 'w'), separators=(',', ':'))
        else:
            n_fallback += 1
            if old.get('units', {}).get(uid):
                units_out[uid] = old['units'][uid]
                report.append(f'KEEP-OLD {gid}')
    # icons preserved
    out = {'ver': int(time.time()), 'v': 3, 'units': units_out, 'icons': old.get('icons', {})}
    json.dump(out, open(os.path.join(SPR, 'sprites.json'), 'w'), separators=(',', ':'))
    if os.path.exists(os.path.join(SPR, 'sprites_v3_wip.json')):
        os.remove(os.path.join(SPR, 'sprites_v3_wip.json'))
    print('\n'.join(report))
    print(f'\n== cutout build: {n_cutout} units rendered, {n_fallback} fallback/kept')

if __name__ == '__main__':
    main()
