#!/usr/bin/env python3
"""r32 batch upscaler — ESPCN x2 + iterative back-projection + micro-unsharp.

Targets (measured at 2560x1440, SC=2):
  - unit sprite strips  (c_cat_* / c_enemy_*): rendered ~2.9x their source size → x2
  - small icons (64/128px): rendered up to ~2.2x → x2
  - battle backgrounds  (maps/Bg*.webp, 1540x1024 → stretched 1.66x+): x2
  - title/door art: stretched 1.33x at 2560w: x2
  - castles (256x512 vs 416px draw) + catbase (620px vs ~300px draw): already >=
    draw size — SKIPPED.

Alpha-safe path (strips/icons): RGB goes through ESPCN(+IBP+unsharp), alpha is
bicubic-upscaled then re-tightened (alpha is coverage — blurring it would grow
fringes). Wide strips (>16000px after x2) are split BETWEEN frames into tiles —
the v2 renderer already understands manifest img:[...] + tileW:[...] tiling.

Manifest surgery: sprites.json frames [sx,sy,sw,sh,ax,ay] * 2, tileW * 2,
refH * 2 (dest sizes in the engine are unchanged — only the source doubles).
"""
import cv2, numpy as np, json, os, sys, glob, io
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'game'))
SPRITES = os.path.join(ROOT, 'assets', 'sprites')
MAPS = os.path.join(ROOT, 'assets', 'maps')
UI = os.path.join(ROOT, 'assets', 'ui')
MODEL = os.path.join(os.path.dirname(__file__), 'sr', 'ESPCN_x2.pb')

cv2.setNumThreads(2)
_SR = cv2.dnn_superres.DnnSuperResImpl_create()
_SR.readModel(MODEL)
_SR.setModel('espcn', 2)

WEBP_MAX = 16383
TILE_TARGET = 16000


def espcn(bgr):
    out = _SR.upsample(bgr)
    return out


def ibp(up, orig_bgr, iters=4):
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


def upscale_rgb(bgr, ibp_iters=4):
    up = espcn(bgr)
    if ibp_iters:
        up = ibp(up, bgr, ibp_iters)
    up = unsharp(up)
    return up


def upscale_alpha(a):
    """coverage alpha: bicubic + keep the original hard 0/255 core (no fringe growth)"""
    up = cv2.resize(a, (a.shape[1] * 2, a.shape[0] * 2), interpolation=cv2.INTER_CUBIC)
    up = np.clip(up, 0, 255).astype(np.uint8)
    # re-tighten: threshold the quarter-opacity mush toward the nearest strong value
    core = cv2.resize(a, (a.shape[1] * 2, a.shape[0] * 2), interpolation=cv2.INTER_NEAREST)
    strong = core >= 200
    up[strong & (up < 200)] = np.maximum(up, 128)[strong & (up < 200)]
    return up


def load_rgba(path):
    im = Image.open(path)
    im.load()
    if im.mode != 'RGBA':
        im = im.convert('RGBA')
    rgba = np.array(im)  # H,W,4 RGB order
    bgr = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2BGR)
    return bgr, rgba[:, :, 3].copy()


def load_rgb(path):
    im = Image.open(path).convert('RGB')
    return cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)


def save_webp(arr_bgr_or_rgba, path, quality=92, lossless=False):
    if arr_bgr_or_rgba.ndim == 3 and arr_bgr_or_rgba.shape[2] == 4:
        im = Image.fromarray(cv2.cvtColor(arr_bgr_or_rgba, cv2.COLOR_BGRA2RGBA))
    else:
        im = Image.fromarray(cv2.cvtColor(arr_bgr_or_rgba, cv2.COLOR_BGR2RGB))
    im.save(path, 'WEBP', quality=quality, method=6, lossless=lossless)


def upscale_rgba_file(path, out_path=None, quality=92):
    bgr, a = load_rgba(path)
    rgb2 = upscale_rgb(bgr)
    a2 = upscale_alpha(a)
    out = cv2.merge([rgb2[:, :, 0], rgb2[:, :, 1], rgb2[:, :, 2], a2])
    save_webp(out, out_path or path, quality=quality)
    return out.shape[1], out.shape[0]


def upscale_rgb_file(path, out_path=None, quality=87):
    bgr = load_rgb(path)
    out = upscale_rgb(bgr)
    save_webp(out, out_path or path, quality=quality)
    return out.shape[1], out.shape[0]


def process_strips(dry=False):
    """All unit strips x2 with tiling for wide sheets. Returns manifest updates."""
    manifest = json.load(open(os.path.join(SPRITES, 'sprites.json')))
    units = manifest.get('units', {})
    # 1) collect every referenced strip file
    files = {}  # filename -> entry list
    for key, u in units.items():
        for f, fm in u['forms'].items():
            for anim in ('walk', 'atk', 'idle'):
                en = fm.get(anim)
                if not en:
                    continue
                imgs = en['img'] if isinstance(en['img'], list) else [en['img']]
                for fn in imgs:
                    files.setdefault(fn, []).append((key, f, anim))
    # 2) process each file once
    results = {}  # filename -> {'img': [...], 'tileW':[...]}
    for fn in sorted(files.keys()):
        path = os.path.join(SPRITES, fn)
        if not os.path.exists(path):
            print('MISSING', fn)
            continue
        bgr, a = load_rgba(path)
        h, w = bgr.shape[:2]
        if w * 2 <= WEBP_MAX:
            if dry:
                results[fn] = {'img': [fn], 'tileW': [w * 2]}
                continue
            nw, nh = upscale_rgba_file(path)
            results[fn] = {'img': [fn], 'tileW': [nw]}
        else:
            # wide sheet: split between frames after upscale → tiles <= TILE_TARGET
            owners = files[fn]
            frames = None
            for (key, f, anim) in owners:
                en = units[key]['forms'][f][anim]
                imgs2 = en['img'] if isinstance(en['img'], list) else [en['img']]
                if fn in imgs2:
                    frames = en['frames']
                    break
            if frames is None:
                print('no frames for', fn, '— skipping tile split (single img)')
                if dry:
                    results[fn] = {'img': [fn], 'tileW': [w * 2]}
                    continue
                nw, nh = upscale_rgba_file(path)
                results[fn] = {'img': [fn], 'tileW': [nw]}
                continue
            # upscale whole sheet into memory
            if not dry:
                rgb2 = upscale_rgb(bgr)
                a2 = upscale_alpha(a)
            # choose split x positions (in x2 space) at frame boundaries
            bounds = sorted(set([fr[0] * 2 for fr in frames] + [fr[0] * 2 + fr[2] * 2 for fr in frames]))
            cuts = [0]
            for b in bounds:
                if b - cuts[-1] > TILE_TARGET:
                    # walk back to the largest frame boundary <= b that fits
                    cand = [x for x in bounds if cuts[-1] < x <= cuts[-1] + TILE_TARGET]
                    cuts.append(cand[-1] if cand else b)
            if cuts[-1] != w * 2:
                cuts.append(w * 2)
            tiles = []
            base = os.path.splitext(fn)[0]
            for i in range(len(cuts) - 1):
                x0, x1 = cuts[i], cuts[i + 1]
                if x1 - x0 < 2:
                    continue
                tfn = fn if i == 0 else base + '_t%d.webp' % i
                if not dry:
                    tile = cv2.merge([
                        rgb2[:, x0:x1, 0], rgb2[:, x0:x1, 1], rgb2[:, x0:x1, 2], a2[:, x0:x1]])
                    save_webp(tile, os.path.join(SPRITES, tfn), quality=92)
                tiles.append((tfn, x1 - x0))
            results[fn] = {'img': [t[0] for t in tiles], 'tileW': [t[1] for t in tiles]}
        print(('DRY ' if dry else '') + 'strip', fn, '→', results[fn]['img'], results[fn]['tileW'])
    # 3) rewrite manifest — merge per anim entry (handles existing multi-tile entries)
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
                    # frames: sheet-space rects + anchors ×2
                    en['frames'] = [[v * 2 for v in fr] for fr in en['frames']]
                    if 'refH' in en:
                        en['refH'] = en['refH'] * 2
                    # timings unchanged
    return manifest


def process_icons():
    """icons at 64/128 → x2 (256s stay). No coords in manifest for icons."""
    n = 0
    for path in sorted(glob.glob(os.path.join(SPRITES, 'icon_*.webp'))):
        im = Image.open(path)
        if max(im.size) >= 200:
            continue
        upscale_rgba_file(path, quality=94)
        n += 1
    print('icons upscaled:', n)


def process_bgs():
    n = 0
    for path in sorted(glob.glob(os.path.join(MAPS, 'Bg*.webp'))):
        w, h = Image.open(path).size
        if w >= 3000:
            continue
        upscale_rgb_file(path, quality=87)
        n += 1
    print('bgs upscaled:', n)


def process_ui():
    for name in ('title_bg.webp', 'title_bg_itf.webp', 'title_bg_cotc.webp', 'doors_home.webp'):
        path = os.path.join(UI, name)
        if not os.path.exists(path):
            continue
        im = Image.open(path)
        if im.mode == 'RGBA':
            upscale_rgba_file(path, quality=92)
        else:
            upscale_rgb_file(path, quality=90)
        print('ui', name)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if mode in ('all', 'dry'):
        dry = mode == 'dry'
        m = process_strips(dry=dry)
        if not dry:
            json.dump(m, open(os.path.join(SPRITES, 'sprites.json'), 'w'))
            print('sprites.json updated (frames/refH/tileW ×2)')
    if mode in ('all', 'icons'):
        process_icons()
    if mode in ('all', 'bgs'):
        process_bgs()
    if mode in ('all', 'ui'):
        process_ui()


if __name__ == '__main__':
    main()
