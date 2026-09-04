#!/usr/bin/env python3
"""bgstrip.py — extract a moving unit from a static-background recording GIF.
   bg = per-pixel median; alpha from multi-channel diff + morphological cleanup;
   keeps largest component. Usage: bgstrip.py <in.gif> <out.png contact> [out strip]"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

def extract(in_path, max_frames=40):
    im = Image.open(in_path)
    frames = []
    i = 0
    while True:
        try: im.seek(i); frames.append(np.asarray(im.convert('RGB'), dtype=np.float32)); i += 1
        except EOFError: break
        if i >= 300: break
    if not frames: return None
    # subsample for bg estimate speed
    stack = np.stack(frames)
    bg = np.median(stack, axis=0)
    masks = []
    for f in frames:
        diff = np.abs(f - bg).max(axis=2)
        a = (diff > 26).astype(np.uint8)
        a = ndimage.binary_closing(a, np.ones((3, 3)), iterations=2)
        a = ndimage.binary_opening(a, np.ones((3, 3)), iterations=1)
        lab, n = ndimage.label(a)
        if n > 1:
            sizes = ndimage.sum(a, lab, range(1, n + 1))
            a = lab == (np.argmax(sizes) + 1)
        a = ndimage.binary_dilation(a, np.ones((2, 2)), iterations=1)
        masks.append(a)
    return frames, masks

def contact_sheet(frames, masks, out, cell=200):
    n = min(len(frames), 10)
    idxs = [round(k * (len(frames) - 1) / max(1, n - 1)) for k in range(n)]
    tiles = []
    for i in idxs:
        f, m = frames[i], masks[i]
        rgba = np.dstack([f, (m * 255).astype(np.uint8)])
        im = Image.fromarray(rgba.astype(np.uint8))
        im.thumbnail((cell, cell))
        # checkerboard bg
        bgc = Image.new('RGBA', im.size, (255, 255, 255, 255))
        for yy in range(0, im.size[1], 12):
            for xx in range(0, im.size[0], 12):
                if (xx // 12 + yy // 12) % 2:
                    for ty in range(yy, min(yy + 12, im.size[1])):
                        for tx in range(xx, min(xx + 12, im.size[0])):
                            bgc.putpixel((tx, ty), (225, 225, 225, 255))
        bgc.alpha_composite(im)
        tiles.append(bgc)
    W = sum(t.size[0] + 6 for t in tiles) + 6
    H = max(t.size[1] for t in tiles) + 12
    c = Image.new('RGB', (W, H), (255, 255, 255))
    x = 6
    for t in tiles: c.paste(t.convert('RGB'), (x, 6)); x += t.size[0] + 6
    c.save(out)
    return out

if __name__ == '__main__':
    r = extract(sys.argv[1])
    if not r: print('no frames'); sys.exit(1)
    frames, masks = r
    out = contact_sheet(frames, masks, sys.argv[2])
    cover = np.mean([m.mean() for m in masks])
    print(f'{len(frames)} frames, avg fg coverage {cover:.1%}, contact: {out}')
