#!/usr/bin/env python3
"""r32 repair: chunks killed mid-run + a later re-run corrupted 35 tile files
(re-upscaled sub-rects) and truncated 2 strips. This restores each damaged
entry's ORIGINAL x1 sheet from git HEAD, recomputes the frame-boundary cuts
with the git-HEAD (x1) manifest, and regenerates the tiles exactly as the
current (x2) manifest expects them."""
import json, os, sys, subprocess, io
sys.path.insert(0, os.path.dirname(__file__))
from r32_batch_upscale import (SPRITES, load_rgba, upscale_rgba_array, save_webp,
                               frame_cuts, WEBP_MAX)
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def git_bytes(path):
    r = subprocess.run(['git', 'show', 'HEAD:' + path], cwd=REPO, capture_output=True)
    if r.returncode != 0:
        return None
    return r.stdout


def git_manifest():
    b = git_bytes('public/game/assets/sprites/sprites.json')
    return json.loads(b.decode())


def load_rgba_bytes(data):
    im = Image.open(io.BytesIO(data))
    im.load()
    if im.mode != 'RGBA':
        im = im.convert('RGBA')
    import numpy as np, cv2
    rgba = np.array(im)
    bgr = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2BGR)
    return bgr, rgba[:, :, 3].copy()


def save_tile_set(bgr, a, frames_old, imgs_cur, tw_cur, key, anim, cur_entry, single_name):
    """upscale a source sheet/tile, splitting whenever a piece would exceed the
    WebP limit; writes pieces under the current manifest names (+ extra _t names),
    updates cur_entry img/tileW in place. Returns True on success."""
    h, w = bgr.shape[:2]
    imgs = list(imgs_cur)
    names = list(imgs)
    outs = []
    # decide cuts: only if the doubled width exceeds the webp limit
    if w * 2 > WEBP_MAX and frames_old:
        cuts = frame_cuts(frames_old, w)
    else:
        cuts = [0, w * 2]
    pieces = max(1, len(cuts) - 1)
    written = []
    pi = 0
    for i in range(pieces):
        x0, x1 = cuts[i] // 2, cuts[i + 1] // 2
        if x1 - x0 < 2:
            continue
        out = upscale_rgba_array(bgr[:, x0:x1, :], a[:, x0:x1])
        if out.shape[1] > WEBP_MAX:  # still too wide (shouldn't happen) — hard split
            n2 = (out.shape[1] + WEBP_MAX - 1) // WEBP_MAX
            step = out.shape[1] // n2
            for j in range(n2):
                seg = out[:, j * step:min((j + 1) * step, out.shape[1]), :]
                written.append(seg)
        else:
            written.append(out)
    # name the pieces: reuse the current manifest names first, then new _t names
    final_names = []
    final_w = []
    for j, out in enumerate(written):
        if j < len(names):
            tfn = names[j]
        else:
            base = os.path.splitext(single_name)[0]
            tfn = base + '_t%d.webp' % (100 + j)
        save_webp(out, os.path.join(SPRITES, tfn), 92)
        final_names.append(tfn)
        final_w.append(out.shape[1])
    if final_names != imgs_cur or final_w != (tw_cur or []):
        cur_entry['img'] = final_names if len(final_names) > 1 else final_names[0]
        cur_entry['tileW'] = final_w
        print('  manifest entry updated:', key, anim, final_names, final_w)
    return True


def main():
    cur = json.load(open(os.path.join(SPRITES, 'sprites.json')))
    old = git_manifest()
    damaged = set()

    def audit_file(fn, exp):
        try:
            im = Image.open(os.path.join(SPRITES, fn))
            im.load()
            return exp is None or abs(im.size[0] - exp) <= 2
        except Exception:
            return False

    # 1) find every damaged anim entry
    for key, u in cur['units'].items():
        for f, fm in u['forms'].items():
            for anim in ('walk', 'atk', 'idle'):
                en = fm.get(anim)
                if not en:
                    continue
                imgs = en['img'] if isinstance(en['img'], list) else [en['img']]
                tw = en.get('tileW', [])
                for i, fn in enumerate(imgs):
                    exp = tw[i] if i < len(tw) else (tw[0] if tw else None)
                    if not audit_file(fn, exp):
                        damaged.add((key, f, anim))
    print('damaged entries:', len(damaged))
    # 2) regenerate each from the git-HEAD x1 original
    changed_manifest = False
    for (key, f, anim) in sorted(damaged):
        en_cur = cur['units'][key]['forms'][f][anim]
        en_old = old['units'].get(key, {}).get('forms', {}).get(f, {}).get(anim)
        if not en_old:
            print('SKIP (no git entry)', key, f, anim)
            continue
        imgs_cur = en_cur['img'] if isinstance(en_cur['img'], list) else [en_cur['img']]
        tw_cur = en_cur.get('tileW', [])
        imgs_old = en_old['img'] if isinstance(en_old['img'], list) else [en_old['img']]
        if len(imgs_old) == 1:
            orig_fn = imgs_old[0]
            b = git_bytes('public/game/assets/sprites/' + orig_fn)
            if b is None:
                print('MISSING in git:', orig_fn)
                continue
            bgr, a = load_rgba_bytes(b)
            ok = save_tile_set(bgr, a, en_old['frames'], imgs_cur, tw_cur, key, anim, en_cur, orig_fn)
            if ok:
                changed_manifest = True
                print('fixed entry', key, f, anim)
        else:
            # pre-existing multi-tile (r31 .t1 style): restore each tile from git, upscale each,
            # re-splitting any tile that would exceed the webp limit after x2
            new_names, new_tw = [], []
            old_frames = en_old['frames']
            for i, ofn in enumerate(imgs_old):
                b = git_bytes('public/game/assets/sprites/' + ofn)
                if b is None:
                    print('MISSING in git:', ofn)
                    continue
                bgr, a = load_rgba_bytes(b)
                # per-tile cut if needed: frames in OLD virtual sheet space — offset by this tile's start
                acc = 0
                old_tws = en_old.get('tileW', [])
                start = sum(old_tws[:i]) if old_tws else 0
                sub_frames = [[fr[0] - start, fr[1], fr[2], fr[3], fr[4], fr[5]] for fr in old_frames if start <= fr[0] < start + (old_tws[i] if old_tws else bgr.shape[1])]
                names0 = [imgs_cur[i]] if i < len(imgs_cur) else [ofn]
                entry_stub = {}
                save_tile_set(bgr, a, sub_frames, names0, [], key, anim, entry_stub, ofn)
                got = entry_stub.get('img')
                got = got if isinstance(got, list) else [got]
                new_names += got
                new_tw += entry_stub.get('tileW', [])
            en_cur['img'] = new_names if len(new_names) > 1 else new_names[0]
            en_cur['tileW'] = new_tw
            changed_manifest = True
            print('fixed multi entry', key, f, anim, new_names, new_tw)
    if changed_manifest:
        json.dump(cur, open(os.path.join(SPRITES, 'sprites.json'), 'w'))
        print('sprites.json saved')
    # 3) icons: any corrupt icon restored from git + upscaled (or plain if webp > 200px);
    #    if the git copy is ALSO broken (pre-existing r31 corruption), rebuild the icon
    #    from the unit's own walk strip frame 0 (base-game art).
    for k, fn in cur['icons'].items():
        try:
            im = Image.open(os.path.join(SPRITES, fn))
            im.load()
            continue
        except Exception:
            pass
        b = git_bytes('public/game/assets/sprites/' + fn)
        fixed = False
        if b:
            try:
                im = Image.open(io.BytesIO(b))
                im.load()
                if max(im.size) < 200:
                    bgr, a = load_rgba_bytes(b)
                    out = upscale_rgba_array(bgr, a)
                    if fn.endswith('.png'):
                        Image.fromarray(out[:, :, [2, 1, 0, 3]] if False else __import__('cv2').cvtColor(out, __import__('cv2').COLOR_BGRA2RGBA)).save(os.path.join(SPRITES, fn), 'PNG')
                    else:
                        save_webp(out, os.path.join(SPRITES, fn), 94)
                else:
                    open(os.path.join(SPRITES, fn), 'wb').write(b)
                print('fixed icon', fn)
                fixed = True
            except Exception:
                fixed = False
        if not fixed:
            # rebuild from the unit's own strip (base-game art)
            kind, uid, form = k.split(':')
            un = cur['units'].get(kind + ':' + uid, {}).get('forms', {}).get(form, {})
            src = None
            for anim in ('walk', 'atk', 'idle'):
                en = un.get(anim)
                if not en:
                    continue
                imgs = en['img'] if isinstance(en['img'], list) else [en['img']]
                fr = en['frames'][0]
                acc = 0
                for i, tfn in enumerate(imgs):
                    tws = en.get('tileW', [])
                    w_i = tws[i] if i < len(tws) else 16000
                    if fr[0] < acc + w_i:
                        try:
                            im = Image.open(os.path.join(SPRITES, tfn))
                            im.load()
                            x0 = fr[0] - acc
                            src = im.crop((int(x0), int(fr[1]), int(x0 + fr[2]), int(fr[1] + fr[3])))
                        except Exception:
                            pass
                        break
                    acc += w_i
                if src:
                    break
            if src:
                side = max(src.size)
                canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
                canvas.paste(src, ((side - src.size[0]) // 2, (side - src.size[1]) // 2))
                if fn.endswith('.png'):
                    canvas.save(os.path.join(SPRITES, fn), 'PNG')
                else:
                    canvas.save(os.path.join(SPRITES, fn), 'WEBP', quality=94, method=4)
                print('REBUILT icon from strip:', fn)
            else:
                print('icon unrecoverable:', fn)
    print('REPAIR DONE')


if __name__ == '__main__':
    main()
