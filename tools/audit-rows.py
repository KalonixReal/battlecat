#!/usr/bin/env python3
"""audit-rows.py — build a labeled side-by-side of a raw sheet's rows vs the known attack GIF
   so a VLM can definitively say which row is walk and which is attack."""
import sys, os
from PIL import Image, ImageDraw, ImageFont

SPR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public/game/assets/sprites')

def load_rgba(p):
    im = Image.open(p).convert('RGBA')
    return im

def split_rows(im, gap_thresh=2):
    """split sheet into horizontal bands by transparent rows"""
    a = im.getchannel('A')
    w, h = im.size
    px = a.load()
    rowhas = [any(px[x, y] > 12 for x in range(w)) for y in range(h)]
    bands, y = [], 0
    while y < h:
        if rowhas[y]:
            y0 = y
            while y < h and rowhas[y]:
                y += 1
            bands.append((y0, y))
        else:
            y += 1
    return bands

def main(sheet_path, gif_path, out_path):
    sheet = load_rgba(sheet_path)
    bands = split_rows(sheet)
    print(f"sheet {sheet.size}, {len(bands)} content bands: {bands}")

    gif_frames = []
    if gif_path and os.path.exists(gif_path):
        try:
            gif = Image.open(gif_path)
            # animated webp/gif: seek frames
            i = 0
            while True:
                try:
                    gif.seek(i)
                    gif_frames.append(gif.convert('RGBA'))
                    i += 1
                    if i > 12: break
                except EOFError:
                    break
        except Exception as e:
            print('gif decode fail:', e)
    print(f"gif frames: {len(gif_frames)}")

    # layout: left column = rows labeled ROW0/ROW1..., right column = GIF frames labeled GIF0..
    CELL = 150
    rows_imgs = []
    for (y0, y1) in bands:
        strip = sheet.crop((0, y0, sheet.size[0], y1))
        rows_imgs.append(strip)
    W = max([r.size[0] for r in rows_imgs] + [CELL * 4]) + 40
    gifw = max([f.size[0] for f in gif_frames], default=CELL)
    W = max(W, gifw + 500)
    H = sum(r.size[1] + 36 for r in rows_imgs) + sum(f.size[1] + 8 for f in gif_frames[:8]) + 120
    canvas = Image.new('RGBA', (W, H), (255, 255, 255, 255))
    d = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
    except Exception:
        font = ImageFont.load_default()

    y = 10
    d.text((10, y), f"SHEET ROWS ({len(rows_imgs)}):", fill=(200, 0, 0, 255), font=font)
    y += 34
    for i, r in enumerate(rows_imgs):
        d.text((10, y), f"ROW{i}:", fill=(0, 0, 200, 255), font=font)
        canvas.paste(r, (100, y), r)
        y += r.size[1] + 30
    d.text((10, y), f"KNOWN ATTACK GIF FRAMES ({len(gif_frames)}):", fill=(200, 0, 0, 255), font=font)
    y += 34
    for i, f in enumerate(gif_frames[:8]):
        d.text((10, y), f"GIF{i}:", fill=(0, 128, 0, 255), font=font)
        canvas.paste(f, (100, y), f)
        y += f.size[1] + 6
    canvas.convert('RGB').save(out_path)
    print('saved', out_path, canvas.size)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None, sys.argv[3] if len(sys.argv) > 3 else '/tmp/audit_rows.png')
