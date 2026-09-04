#!/usr/bin/env python3
"""orient-calib.py — deterministically determine GIF facing orientation vs sheets.
   Sheets are ground truth (their layout is fixed). For each test unit:
   download sheet + GIF, slice sheet rows, correlate GIF frames against sheet walk-row
   frames in BOTH orientations -> the higher total correlation wins.
   Usage: python3 tools/orient-calib.py <unitName> <gifUrl> <kind:cat|enemy>"""
import json, os, re, sys, hashlib, urllib.request, urllib.parse, subprocess, io
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))

def cdn_fandom(file):
    h = hashlib.md5(file.encode()).hexdigest()
    return f"https://static.wikia.nocookie.net/battle-cats/images/{h[0]}/{h[:2]}/{urllib.parse.quote(file)}/revision/latest"

def fetch(url, out, use_weserv=False):
    if os.path.exists(out): return out
    u = (f'https://images.weserv.nl/?url={url.replace("https://","")}&n=-1' if use_weserv else url)
    subprocess.run(['curl', '-s', '--max-time', '90', '-o', out, u], check=False)
    if os.path.exists(out) and os.path.getsize(out) > 500: return out
    return None

def gif_frames(path, maxf=8):
    im = Image.open(path)
    fr, i = [], 0
    while i < maxf:
        try: im.seek(i); fr.append(np.asarray(im.convert('RGBA'), dtype=np.float32)); i += 1
        except EOFError: break
    return fr

def sheet_rows(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im)[:, :, 3]
    rows = (a > 12).any(axis=1)
    bands, y, H = [], 0, a.shape[0]
    while y < H:
        if rows[y]:
            y0 = y
            while y < H and rows[y]: y += 1
            bands.append((y0, y))
        else: y += 1
    return [im.crop((0, b[0], im.size[0], b[1])) for b in bands], bands

def norm_img(im, size=(32, 32)):
    """crop to alpha bbox, resize, return RGB array normalized"""
    a = np.asarray(im)[:, :, 3]
    ys, xs = np.where(a > 12)
    if len(xs) < 10: return None
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    c = im.crop(box).resize(size)
    arr = np.asarray(c, dtype=np.float32)[:, :, :3]
    m = arr.mean()
    s = arr.std() + 1e-6
    return (arr - m) / s

def corr(a, b):
    return float((a * b).mean())

def main():
    manifest = json.load(open(os.path.join(ROOT, 'public/game/assets/sprites/manifest.json')))
    gifs = json.load(open(os.path.join(ROOT, 'tools/miraheze_gifs.json')))
    gifs_by_file = {v['file']: v['path'] for v in gifs.values()}

    tests = [
        # (gid, gif file in miraheze, sheet num for wiki, kind)
        ('baabaa', 'BaaBaa.gif', None, 'enemy'),
        ('croco', 'Croco.gif', None, 'enemy'),
        ('ctoseal', 'IdleCTOSeal.gif', None, 'enemy'),
    ]
    # find sheet numbers from manifest gallery JSON
    for gid, gifname, _, kind in tests:
        info = manifest.get(gid)
        if not info: print('no manifest entry for', gid); continue
        g = json.dumps(info)
        m = re.search(r'Enemy_icon_(\d{3})', g)
        num = m.group(1) if m else None
        if not num:
            print('no num for', gid); continue
        sheet_f = f'{num}_e.png'
        sp = f'/tmp/calib_{sheet_f}'
        if not fetch(cdn_fandom(sheet_f), sp): print('sheet dl fail', gid); continue
        gp = f'/tmp/calib_{gifname}'
        if not fetch(f'https://static.wikitide.net/battlecatswiki/{gifs_by_file[gifname]}', gp, use_weserv=True):
            print('gif dl fail', gid); continue
        rows, _ = sheet_rows(sp)
        if not rows: print('no rows', gid); continue
        # enemy sheet: row0 = walk (verified). Slice its frames by transparent columns.
        row0 = rows[0]
        a = np.asarray(row0)[:, :, 3]
        cols = (a > 12).any(axis=0)
        frames, x, W = [], 0, a.shape[1]
        while x < W:
            if cols[x]:
                x0 = x
                while x < W and cols[x]: x += 1
                if x - x0 > 8: frames.append(row0.crop((x0, 0, x, row0.size[1])))
            else: x += 1
        sheet_norms = [n for n in (norm_img(f) for f in frames[:5]) if n is not None]
        gf = gif_frames(gp)
        gif_norms = [n for n in (norm_img(Image.fromarray(f.astype(np.uint8))) for f in gf) if n is not None]
        if not sheet_norms or not gif_norms: print('norm fail', gid); continue
        direct = np.mean([max(corr(g, s) for s in sheet_norms) for g in gif_norms])
        flipped = np.mean([max(corr(np.ascontiguousarray(g[:, ::-1]), s) for s in sheet_norms) for g in gif_norms])
        verdict = 'GIF FACES SAME AS SHEET (right)' if direct >= flipped else 'GIF FACES OPPOSITE OF SHEET (left)'
        print(f'{gid}: direct={direct:.4f} flipped={flipped:.4f} -> {verdict}')

if __name__ == '__main__':
    main()
