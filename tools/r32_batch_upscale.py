#!/usr/bin/env python3
"""r32 batch upscaler — ESPCN x2 + iterative back-projection + micro-unsharp.

Targets (measured at 2560x1440, SC=2):
  - unit sprite strips  (c_cat_* / c_enemy_*): rendered ~2.9x their source size → x2
  - small icons (64/128px): rendered up to ~2.2x → x2
  - battle backgrounds  (maps/Bg*.webp, 1540x1024 → stretched 1.66x+): x2
  - title/door art: stretched 1.33x at 2560w: x2
  - castles (256x512 vs 416px draw) + catbase (620px vs ~300px draw): already >=
    draw size — SKIPPED.

Memory-safe on 2-core/4GB: ESPCN runs in horizontal tiles (replicate-padded),
wide sheets are cut at FRAME boundaries BEFORE upscaling (each tile <=16000px
after x2 — the v2 renderer understands manifest img:[...] + tileW:[...]).

Alpha path: RGB through ESPCN(+IBP+unsharp); alpha bicubic + re-tighten
(coverage alpha must not grow fringes).

Manifest surgery: sprites.json frames [sx,sy,sw,sh,ax,ay]*2, tileW*2, refH*2
(engine dest sizes unchanged — only the source resolution doubles).
"""
import cv2, numpy as np, json, os, sys, glob
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'game'))
SPRITES = os.path.join(ROOT, 'assets', 'sprites')
MAPS = os.path.join(ROOT, 'assets', 'maps')
UI = os.path.join(ROOT, 'assets', 'ui')
MODEL = os.path.join(os.path.dirname(__file__), 'sr', 'ESPCN_x2.pb')

cv2.setNumThreads(2)
_SR = cv2.dnn_superres.DnnSuperResImpl_create()
_SR.readModel(MODEL)
_SR.setModel('espcn', 2)

WEBP_MAX = 16383
TILE_TARGET = 15800   # x2-space cap per output tile
ESP_TILE = 1024       # ESPCN inference tile width (source px)
ESP_PAD = 12
IBP_ITERS = 2


def espcn_tiled(bgr):
    h, w = bgr.shape[:2]
    if w <= ESP_TILE:
        return _SR.upsample(bgr)
    outs = []
    x = 0
    while x < w:
        x2 = min(x + ESP_TILE, w)
        x0 = max(0, x - ESP_PAD)
        x1 = min(w, x2 + ESP_PAD)
        up = _SR.upsample(bgr[:, x0:x1])
        c0 = (x - x0) * 2
        c1 = c0 + (x2 - x) * 2
        outs.append(up[:, c0:c1])
        x = x2
    return np.hstack(outs)


def ibp(up, orig_bgr, iters=IBP_ITERS):
    """iterative back-projection: refine `up` so downscaling it reproduces `orig`."""
    cur = up.astype(np.float32)
    for _ in range(iters):
        down = cv2.resize(cur, (orig_bgr.shape[1], orig_bgr.shape[0]), interpolation=cv2.INTER_AREA)
        residual = orig_bgr.astype(np.float32) - down
        cur = cur + cv2.resize(residual, (cur.shape[1], cur.shape[0]), interpolation=cv2.INTER_CUBIC)
    return np.clip(cur, 0, 255).astype(np.uint8)


def unsharp(img, amount=0.28, radius=1.2):
    blur = cv2.GaussianBlur(img, (0, 0), radius)
    return cv2.addWeighted(img, 1 + amount, blur, -amount, 0)


def upscale_rgb(bgr):
    up = espcn_tiled(bgr)
    up = ibp(up, bgr)
    return unsharp(up)


def upscale_alpha(a):
    """coverage alpha: bicubic + keep the original hard 0/255 core (no fringe growth)"""
    up = cv2.resize(a, (a.shape[1] * 2, a.shape[0] * 2), interpolation=cv2.INTER_CUBIC)
    up = np.clip(up, 0, 255).astype(np.uint8)
    core = cv2.resize(a, (a.shape[1] * 2, a.shape[0] * 2), interpolation=cv2.INTER_NEAREST)
    strong = core >= 200
    up[strong & (up < 200)] = np.maximum(up, 128)[strong & (up < 200)]
    return up


def load_rgba(path):
    im = Image.open(path)
    im.load()
    if im.mode != 'RGBA':
        im = im.convert('RGBA')
    rgba = np.array(im)
    bgr = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2BGR)
    return bgr, rgba[:, :, 3].copy()


def load_rgb(path):
    im = Image.open(path).convert('RGB')
    return cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)


def save_webp(arr, path, quality=92):
    if arr.ndim == 3 and arr.shape[2] == 4:
        im = Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGRA2RGBA))
    else:
        im = Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGR2RGB))
    im.save(path, 'WEBP', quality=quality, method=4)


def upscale_rgba_array(bgr, a):
    rgb2 = upscale_rgb(bgr)
    a2 = upscale_alpha(a)
    return cv2.merge([rgb2[:, :, 0], rgb2[:, :, 1], rgb2[:, :, 2], a2])


def upscale_rgba_file(path, out_path=None, quality=92):
    bgr, a = load_rgba(path)
    out = upscale_rgba_array(bgr, a)
    save_webp(out, out_path or path, quality)
    return out.shape[1], out.shape[0]


def upscale_rgb_file(path, out_path=None, quality=87):
    bgr = load_rgb(path)
    out = upscale_rgb(bgr)
    save_webp(out, out_path or path, quality)
    return out.shape[1], out.shape[0]


def frame_cuts(frames, sheet_w, target=TILE_TARGET):
    """cut positions (x2 space) at frame boundaries so every tile <= target"""
    bounds = sorted(set([fr[0] * 2 for fr in frames] + [fr[0] * 2 + fr[2] * 2 for fr in frames] + [sheet_w * 2]))
    cuts = [0]
    for b in bounds:
        if b - cuts[-1] > target:
            cand = [x for x in bounds if cuts[-1] < x <= cuts[-1] + target]
            cuts.append(cand[-1] if cand else b)
    if cuts[-1] != sheet_w * 2:
        cuts.append(sheet_w * 2)
    return cuts


def process_strips(dry=False):
    manifest = json.load(open(os.path.join(SPRITES, 'sprites.json')))
    units = manifest.get('units', {})
    files = {}
    for key, u in units.items():
        for f, fm in u['forms'].items():
            for anim in ('walk', 'atk', 'idle'):
                en = fm.get(anim)
                if not en:
                    continue
                imgs = en['img'] if isinstance(en['img'], list) else [en['img']]
                for fn in imgs:
                    files.setdefault(fn, []).append((key, f, anim))
    results = _supervise(sorted(files.keys()), 'strip', dry)
    # manifest merge — per anim entry (handles pre-existing multi-tile entries)
    for key, u in units.items():
        for f, fm in u['forms'].items():
            for anim in ('walk', 'atk', 'idle'):
                en = fm.get(anim)
                if not en:
                    continue
                imgs = en['img'] if isinstance(en['img'], list) else [en['img']]
                newimgs, newtileW, ok = [], [], True
                for fn in imgs:
                    r = results.get(fn)
                    if not r:
                        ok = False
                        break
                    newimgs += r['img']
                    newtileW += r['tileW']
                if ok and newimgs:
                    en['img'] = newimgs if len(newimgs) > 1 else newimgs[0]
                    en['tileW'] = newtileW
                    en['frames'] = [[v * 2 for v in fr] for fr in en['frames']]
                    if 'refH' in en:
                        en['refH'] = en['refH'] * 2
    return manifest


def _supervise(file_list, kind, dry=False):
    """run ONE fresh subprocess per file — the in-process DNN/IBP memory never
    returns to the OS (2.2GB RSS after 14 strips → OOM kill), so isolation is
    mandatory on this 4GB box. Results accumulate in /tmp/r32_results.json."""
    import subprocess
    rpath = '/tmp/r32_results_%s.json' % kind
    results = {}
    if os.path.exists(rpath):
        try:
            results = json.load(open(rpath))
        except Exception:
            results = {}
    total = len(file_list)
    for idx, fn in enumerate(file_list):
        if fn in results:
            continue
        if dry:
            continue
        cmd = [sys.executable, os.path.abspath(__file__), 'file', fn, kind]
        p = subprocess.run(cmd, capture_output=True, text=True)
        line = (p.stdout or '').strip().splitlines()
        got = None
        for ln in line:
            if ln.startswith('RESULT '):
                got = json.loads(ln[7:])
        if got is None:
            print('[%d/%d] FAILED %s (%s)' % (idx + 1, total, fn, (p.stderr or '')[-200:]), flush=True)
            continue
        results[fn] = got
        json.dump(results, open(rpath, 'w'))
        print('[%d/%d] %s %s -> %s' % (idx + 1, total, kind, fn, got.get('img')), flush=True)
    return results


def worker(fn, kind):
    """one file, one process. Prints 'RESULT {json}'."""
    if kind == 'strip':
        path = os.path.join(SPRITES, fn)
        bgr, a = load_rgba(path)
        h, w = bgr.shape[:2]
        # split wide sheets at frame boundaries BEFORE upscaling
        manifest = json.load(open(os.path.join(SPRITES, 'sprites.json')))
        frames = None
        for u in manifest['units'].values():
            for fm in u['forms'].values():
                for anim in ('walk', 'atk', 'idle'):
                    en = fm.get(anim)
                    if not en:
                        continue
                    imgs = en['img'] if isinstance(en['img'], list) else [en['img']]
                    if fn in imgs:
                        frames = en['frames']
                        break
            if frames:
                break
        need_split = (w * 2 > WEBP_MAX)
        if need_split and frames is not None:
            cuts = frame_cuts(frames, w)
            if len(cuts) <= 1:
                need_split = False
        if not need_split:
            out = upscale_rgba_array(bgr, a)
            save_webp(out, path, 92)
            print('RESULT ' + json.dumps({'img': [fn], 'tileW': [out.shape[1]]}))
        else:
            base = os.path.splitext(fn)[0]
            tiles = []
            for i in range(len(cuts) - 1):
                x0, x1 = cuts[i] // 2, cuts[i + 1] // 2
                if x1 - x0 < 2:
                    continue
                tfn = fn if i == 0 else base + '_t%d.webp' % i
                out = upscale_rgba_array(bgr[:, x0:x1, :], a[:, x0:x1])
                save_webp(out, os.path.join(SPRITES, tfn), 92)
                tiles.append((tfn, out.shape[1]))
            print('RESULT ' + json.dumps({'img': [t[0] for t in tiles], 'tileW': [t[1] for t in tiles]}))
    elif kind == 'icon':
        path = os.path.join(SPRITES, fn)
        out = upscale_rgba_file(path, quality=94)
        print('RESULT ' + json.dumps({'img': [fn], 'tileW': [out[0]]}))
    elif kind == 'bg':
        path = os.path.join(MAPS, fn)
        out = upscale_rgb_file(path, quality=87)
        print('RESULT ' + json.dumps({'img': [fn], 'tileW': [out[0]]}))
    elif kind == 'ui':
        path = os.path.join(UI, fn)
        if Image.open(path).mode == 'RGBA':
            out = upscale_rgba_file(path, quality=92)
        else:
            out = upscale_rgb_file(path, quality=90)
        print('RESULT ' + json.dumps({'img': [fn], 'tileW': [out[0]]}))


def process_icons():
    fl = [os.path.basename(p) for p in sorted(glob.glob(os.path.join(SPRITES, 'icon_*.webp')))
          if Image.open(p) and max(Image.open(p).size) < 200]
    _supervise(fl, 'icon')
    print('icons upscaled:', len(fl), flush=True)


def process_bgs():
    fl = [os.path.basename(p) for p in sorted(glob.glob(os.path.join(MAPS, 'Bg*.webp')))
          if Image.open(p).size[0] < 3000]
    _supervise(fl, 'bg')
    print('bgs upscaled:', len(fl), flush=True)


def process_ui():
    fl = ['title_bg.webp', 'title_bg_itf.webp', 'title_bg_cotc.webp', 'doors_home.webp']
    fl = [f for f in fl if os.path.exists(os.path.join(UI, f))]
    _supervise(fl, 'ui')


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if mode == 'file':
        worker(sys.argv[2], sys.argv[3])
        return
    if mode == 'dry':
        m = process_strips(dry=True)
        print('dry run OK')
        return
    if mode in ('all', 'strips'):
        m = process_strips()
        json.dump(m, open(os.path.join(SPRITES, 'sprites.json'), 'w'))
        print('sprites.json updated (frames/refH/tileW x2)', flush=True)
    if mode in ('all', 'icons'):
        process_icons()
    if mode in ('all', 'bgs'):
        process_bgs()
    if mode in ('all', 'ui'):
        process_ui()
    print('DONE', flush=True)


if __name__ == '__main__':
    main()
