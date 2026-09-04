#!/usr/bin/env python3
"""orient-calib2.py — determine GIF orientation using units IN our manifest.
   For each: sheet (ground truth) vs Miraheze/Fandom GIF, both walk and attack rows."""
import json, os, re, sys, hashlib, urllib.request, urllib.parse, subprocess
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def cdn_fandom(file):
    h = hashlib.md5(file.encode()).hexdigest()
    return f"https://static.wikia.nocookie.net/battle-cats/images/{h[0]}/{h[:2]}/{urllib.parse.quote(file)}/revision/latest"

def fetch(url, out, weserv=False):
    if os.path.exists(out) and os.path.getsize(out) > 500: return out
    u = f'https://images.weserv.nl/?url={url.replace("https://","")}&n=-1' if weserv else url
    subprocess.run(['curl', '-s', '--max-time', '90', '-o', out, u], check=False)
    return out if os.path.exists(out) and os.path.getsize(out) > 500 else None

def gif_frames(path, maxf=8):
    try: im = Image.open(path)
    except Exception: return []
    fr, i = [], 0
    while i < maxf:
        try: im.seek(i); fr.append(np.asarray(im.convert('RGBA'), dtype=np.uint8)); i += 1
        except EOFError: break
    return fr

def row_frames(sheet_img, row_idx):
    a = np.asarray(sheet_img)[:, :, 3]
    rows = (a > 12).any(axis=1)
    bands, y, H = [], 0, a.shape[0]
    while y < H:
        if rows[y]:
            y0 = y
            while y < H and rows[y]: y += 1
            bands.append((y0, y))
        else: y += 1
    if row_idx >= len(bands): return []
    b = bands[row_idx]
    row = sheet_img.crop((0, b[0], sheet_img.size[0], b[1]))
    ra = np.asarray(row)[:, :, 3]
    cols = (ra > 12).any(axis=0)
    fr, x, W = [], 0, ra.shape[1]
    while x < W:
        if cols[x]:
            x0 = x
            while x < W and cols[x]: x += 1
            if x - x0 > 8: fr.append(row.crop((x0, 0, x, row.size[1])))
        else: x += 1
    return fr

def norm_img(im, size=(36, 36)):
    a = np.asarray(im)[:, :, 3]
    ys, xs = np.where(a > 12)
    if len(xs) < 12: return None
    c = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)).resize(size)
    arr = np.asarray(c, dtype=np.float32)[:, :, :3]
    return (arr - arr.mean()) / (arr.std() + 1e-6)

def corr(a, b): return float((a * b).mean())

manifest = json.load(open(os.path.join(ROOT, 'public/game/assets/sprites/manifest.json')))
gifs = json.load(open(os.path.join(ROOT, 'tools/miraheze_gifs.json')))
gifs_by_file = {v['file']: v['path'] for v in gifs.values()}
fandom = json.load(open(os.path.join(ROOT, 'tools/fandom_gifs.json')))

# test set: gid -> (gif source type, gif locator)
TESTS = [
    ('doge', 'fandom_atk', None),          # Doge_attack.gif vs sheet attack row (row1 enemy)
    ('hippoe', 'fandom_atk', None),        # Hippoe_attack.gif
    ('croco', 'mz', 'Croco.gif'),
    ('jackie', 'mz', 'IdleJackie Peng.gif'),
]
for gid, src, gname in TESTS:
    info = manifest.get(gid)
    if not info: print(gid, 'not in manifest'); continue
    g = json.dumps(info)
    kind = info['kind']
    m = re.search(r'Enemy_icon_(\d{3})', g) if kind == 'enemy' else re.search(r'Uni(\d{3})_f00', g)
    num = m.group(1) if m else None
    if not num: print(gid, 'no num'); continue
    sheet_f = f'{num}_e.png' if kind == 'enemy' else f'{num}_f.png'
    sp = fetch(cdn_fandom(sheet_f), f'/tmp/o2_{sheet_f}')
    if not sp: print(gid, 'sheet dl fail'); continue
    sheet = Image.open(sp).convert('RGBA')
    # enemy: row0=walk row1=atk ; cat: row0=atk row1=walk (verified conventions)
    if kind == 'enemy':
        walk_row, atk_row = 0, 1
    else:
        walk_row, atk_row = 1, 0
    # pick GIF
    if src == 'fandom_atk':
        fent = fandom.get(gid, {})
        gurl, gfile = fent.get('atk'), fent.get('atk_file')
        if not gurl: print(gid, 'no fandom atk gif'); continue
        gp = fetch(gurl, f'/tmp/o2_{gfile}')
        compare_row = atk_row
    else:
        if gname not in gifs_by_file: print(gid, 'gif not in miraheze list'); continue
        gp = fetch(f'https://static.wikitide.net/battlecatswiki/{gifs_by_file[gname]}', f'/tmp/o2_{gname}', weserv=True)
        compare_row = walk_row
    if not gp: print(gid, 'gif dl fail'); continue
    sframes = row_frames(sheet, compare_row)
    snorms = [n for n in (norm_img(f) for f in sframes[:6]) if n is not None]
    gnorms = [n for n in (norm_img(Image.fromarray(f)) for f in gif_frames(gp)) if n is not None]
    if not snorms or not gnorms: print(gid, 'norm fail'); continue
    direct = np.mean([max(corr(g, s) for s in snorms) for g in gnorms])
    flipped = np.mean([max(corr(np.ascontiguousarray(g[:, ::-1]), s) for s in snorms) for g in gnorms])
    same = direct >= flipped
    print(f'{gid} ({kind}, row{compare_row} vs {os.path.basename(gp)}): direct={direct:.4f} flipped={flipped:.4f} -> GIF {"SAME as sheet (RIGHT)" if same else "OPPOSITE of sheet (LEFT)"}')
