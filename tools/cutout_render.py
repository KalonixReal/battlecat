#!/usr/bin/env python3
"""cutout-render.py — render REAL Battle Cats cutout animations (BCU-format maanim/mamodel/imgcut)
   into per-unit walk/attack strips for the game's sprite manifest.

   Semantics ported from battlecatsultimate BCU_java_util_common:
     EPart.alter/transform/drawPart, MaAnim.Part.update (interp modes 0..4), MaModel.
   Anim files: {num}_{f|c|s|e}00=WALK, 01=IDLE, 02=ATK, 03=HB  (TYPE4 order, verified visually)
   Output strips play at 20 fps (real gameplay rate, calibrated vs recorded GIFs)."""
import json, os, re, math, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANIM = os.path.join(ROOT, 'public/game/assets/sprites/animdata')

# ---------------- parsers ----------------

def read_text(path):
    data = open(path, 'rb').read()
    return data.decode('utf-8-sig', errors='replace').replace('\r\n', '\n')

def parse_imgcut(txt):
    ls = txt.split('\n')
    # [imgcut] / ver / name / n / cuts...
    i = 1
    while i < len(ls) and not ls[i].strip(): i += 1
    # find the line that is a pure number followed by texture name
    # format per BCU: poll marker, poll(?) , name, n
    # doge file: [imgcut]\n0\ni000_e.png\n10\n1,1,50,5...
    name = None
    n = 0
    cuts = []
    # locate texture-name line (contains .png)
    for j, l in enumerate(ls[:6]):
        if '.png' in l.lower():
            name = l.strip()
            n = int(ls[j + 1].strip())
            start = j + 2
            break
    if name is None:
        return None
    for k in range(n):
        parts = ls[start + k].strip().split(',')
        cuts.append([int(float(p)) for p in parts[:4]])
    return {'name': name, 'cuts': cuts}

def _first_two_int_lines(ls, limit=8):
    """[ver_line_idx, n_line_idx]: first two consecutive pure-integer lines —
    survives partially-encrypted headers ('...del]' garbage before the version)."""
    def pure(s):
        s = s.strip()
        return s.isdigit()
    for j in range(min(limit, len(ls) - 1)):
        if pure(ls[j]) and pure(ls[j + 1]):
            return j, j + 1
    return None

def parse_mamodel(txt):
    ls = [l for l in txt.split('\n')]
    # find n after the marker (line 1 = '3' version, line 2 = n)
    hit = _first_two_int_lines(ls)
    if hit is None: return None
    idx = hit[0]
    ver = int(ls[idx].strip())
    n = int(ls[idx + 1].strip())
    parts = []
    for k in range(n):
        ss = ls[idx + 2 + k].strip().split(',')
        vals = [int(float(p)) for p in ss[:13]]
        parts.append(vals)
    try:
        ints3 = [int(float(x)) for x in ls[idx + 2 + n].strip().split(',') if x.strip() != ''][:3]
        m = int(ls[idx + 3 + n].strip())
        confs = []
        for k in range(m):
            ss = ls[idx + 4 + n + k].strip().split(',')
            # slice to 6 BEFORE converting: 7th field may be a label (e.g. 'ダミー')
            confs.append([int(float(p)) for p in ss[:6] if p.strip() != ''][:6])
    except (IndexError, ValueError):
        ints3, confs = [100, 360, 255], []
    return {'ver': ver, 'parts': parts, 'ints': ints3, 'confs': confs}

def parse_maanim(txt):
    ls = txt.split('\n')
    hit = _first_two_int_lines(ls)
    if hit is None: return None
    idx = hit[0]
    ver = int(ls[idx].strip())
    n = int(ls[idx + 1].strip())
    parts = []
    cur = idx + 2
    for k in range(n):
        if cur >= len(ls) - 1: break  # truncated file (partial decryption tail loss)
        ss = ls[cur].strip().split(',')
        ints5 = [int(float(p)) for p in ss[:5]]
        cnt = int(ls[cur + 1].strip())
        moves = []
        for q in range(cnt):
            if cur + 2 + q >= len(ls): break  # truncated tail: keep the moves we have
            ln = ls[cur + 2 + q].strip()
            if not ln: break  # trailing blank (truncated tail)
            try:
                mv = [int(float(p)) for p in ln.split(',') if p.strip() != ''][:4]
            except ValueError:
                break  # corrupted tail — keep the moves parsed so far
            moves.append(mv)
        if moves:
            parts.append({'ints': ints5, 'moves': moves})
        cur += 2 + cnt
    return {'ver': ver, 'parts': parts}

# ---------------- EPart state machine ----------------

class EPart:
    __slots__ = ('ind', 'args', 'fa', 'id', 'img', 'z', 'pos', 'piv', 'sca', 'angle', 'opacity',
                 'hf', 'vf', 'glow', 'extendX', 'gsca', 'model')

    def __init__(self, ind, args, model):
        self.ind = ind
        self.args = args
        self.model = model
        self.setValue()

    def setValue(self):
        a = self.args
        n = len(self.model['parts'])
        self.fa = None if a[0] <= -1 or a[0] >= n else a[0]
        self.id = a[1]
        self.img = a[2]
        self.z = a[3] * n + self.ind
        self.pos = [float(a[4]), float(a[5])]
        self.piv = [float(a[6]), float(a[7])]
        self.sca = [float(a[8]), float(a[9])]
        self.angle = float(a[10])
        self.opacity = float(a[11])
        self.glow = a[12] if len(a) > 12 else 0
        self.hf = 1.0
        self.vf = 1.0
        self.gsca = self.model['ints'][0]

    def alter(self, m, v):
        if m == 0:
            n = len(self.model['parts'])
            self.fa = int(v) if 0 <= v < n else 0
            if self.fa == self.ind: self.fa = 0
        elif m == 1: self.id = int(v)  # id (BCU drawPart skips parts with id < 0)
        elif m == 2: self.img = int(v)
        elif m == 3: self.z = v * len(self.model['parts']) + self.ind
        elif m == 4: self.pos[0] = self.args[4] + v
        elif m == 5: self.pos[1] = self.args[5] + v
        elif m == 6: self.piv[0] = self.args[6] + v
        elif m == 7: self.piv[1] = self.args[7] + v
        elif m == 8:
            self.sca[0] = self.args[8] * v / self.model['ints'][0]
            self.sca[1] = self.args[9] * v / self.model['ints'][0]
        elif m == 9: self.sca[0] = self.args[8] * v / self.model['ints'][0]
        elif m == 10: self.sca[1] = self.args[9] * v / self.model['ints'][0]
        elif m == 11: self.angle = self.args[10] + v
        elif m == 12: self.opacity = v * self.args[11] / self.model['ints'][2]
        elif m == 13: self.hf = 1.0 if v == 0 else -1.0
        elif m == 14: self.vf = 1.0 if v == 0 else -1.0
        elif m == 53: self.gsca = v

    def getSize(self, ents):
        mi = 1.0 / self.model['ints'][0]
        gs = self.gsca * mi * mi
        if self.fa is None:
            return (self.sca[0] * gs, self.sca[1] * gs)
        p = ents[self.fa]
        ps = p.getSize(ents)
        return (ps[0] * self.sca[0] * gs, ps[1] * self.sca[1] * gs)

    def opa(self, ents):
        if self.opacity == 0: return 0.0
        mi_op = self.opacity / self.model['ints'][2]
        if self.fa is not None:
            return ents[self.fa].opa(ents) * mi_op
        return mi_op

# ---------------- animation frame application ----------------

def apply_anim(ents, ma, f):
    for part in ma['parts']:
        ints = part['ints']
        moves = part['moves']
        n = len(moves)
        if n == 0: continue
        ent = ents[ints[0]] if ints[0] < len(ents) else ents[0]
        loop = ints[2]
        fir = moves[0][0]
        smax = moves[n - 1][0]
        lmax = smax - fir
        frame = float(f)
        if loop != -1:
            mf = smax if loop == -1 else (ma_len(ma) + 1)
            if loop > 1:
                mf = fir + loop * lmax
            if mf and loop != -1:
                frame = (f + 0) % mf if loop == -1 else f
            if loop > 0 and lmax != 0:
                if frame > fir + loop * lmax:
                    v = moves[n - 1][1]
                    ent.alter(ints[1], v)
                    continue
                if frame > fir and frame < fir + loop * lmax:
                    frame = fir + (frame - fir) % lmax
                elif frame >= fir + loop * lmax:
                    frame = smax
        # find segment
        applied = False
        for i in range(n):
            if frame == moves[i][0]:
                ent.alter(ints[1], float(moves[i][1]))
                applied = True
                break
            elif i < n - 1 and moves[i][0] < frame < moves[i + 1][0]:
                f0, v0 = moves[i][0], moves[i][1]
                f1, v1 = moves[i + 1][0], moves[i + 1][1]
                ti = (frame - f0) / (f1 - f0) if f1 != f0 else 1.0
                mode = moves[i][2]
                if mode == 1 or ints[1] in (13, 14):
                    ti = 0.0
                elif mode == 2:
                    ease = moves[i][3] if moves[i][3] != 0 else 1.0
                    tc = max(0.0, min(1.0, ti))
                    if ease >= 0:
                        ef = 1.0 - math.sqrt(1.0 - math.pow(tc, ease))
                    else:
                        ef = math.sqrt(1.0 - math.pow(1.0 - tc, -ease))
                    if not math.isnan(ef): ti = ef
                elif mode == 4:
                    if moves[i][3] > 0: ti = 1 - math.cos(ti * math.pi / 2)
                    elif moves[i][3] < 0: ti = math.sin(ti * math.pi / 2)
                    else: ti = (1 - math.cos(ti * math.pi)) / 2
                if ints[1] == 2:
                    vd = math.ceil((v1 - v0) * ti + v0) if (v1 - v0) < 0 else int((v1 - v0) * ti + v0)
                else:
                    vd = v0 + int((v1 - v0) * ti)
                ent.alter(ints[1], float(vd))
                applied = True
                break
        if not applied and frame > moves[n - 1][0]:
            ent.alter(ints[1], float(moves[n - 1][1]))
        elif not applied and ints[1] == 0 and frame < moves[0][0]:
            pass

def ma_len(ma):
    L = 1
    for p in ma['parts']:
        mv = p['moves']
        if mv:
            loop = p['ints'][2]
            fir = mv[0][0]
            smax = mv[-1][0]
            lmax = smax - fir
            if loop != -1 and loop > 1:
                v = fir + (smax - fir) * loop
            else:
                v = smax
            if v > L: L = int(v)
    return L

# ---------------- rendering ----------------

def render_frame(ents, mm, tex, cuts, scale, canvas_h, canvas_w, origin_x, origin_y):
    """draw all parts in z order onto (canvas) using BCU transform semantics"""
    n = len(ents)
    order = sorted(range(n), key=lambda i: ents[i].z)
    out = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    # recursive transform accumulation via matrix stack
    def draw_part(i, base_mat, chain_size, base_scale):
        ep = ents[i]
        if ep.img < 0 or ep.img >= len(cuts): return
        opa = ep.opa(ents)
        if opa <= 0.005: return
        cut = cuts[ep.img]
        if cut[2] <= 0 or cut[3] <= 0: return
        # transform: parent first
        mat = base_mat.copy()
        size = ep.getSize({j: ents[j] for j in range(n)})
        # effective pos scaled by parent size (chain_size = parent cumulative size or 1)
        if i != 0:
            px = chain_size[0] * base_scale * ep.pos[0]
            py = chain_size[1] * base_scale * ep.pos[1]
            mat = mat.translate(px, py)
            mat = mat.scale(ep.hf, ep.vf)
        else:
            # root: confs adjust + pivot translate
            if mm['confs']:
                d = mm['confs'][0]
                bsize = (abs(mm['parts'][0][8]) / mm['ints'][0], abs(mm['parts'][0][9]) / mm['ints'][0])
                p0x = -bsize[0] * d[2] * base_scale
                p0y = -bsize[1] * d[3] * base_scale
                mat = mat.translate(p0x, p0y)
            p0x = size[0] * base_scale * ep.piv[0] * ep.hf
            p0y = size[1] * base_scale * ep.piv[1] * ep.vf
            mat = mat.translate(p0x, p0y)
            mat = mat.scale(ep.hf, ep.vf)
        if ep.angle != 0:
            mat = mat.rotate(math.pi * 2 * ep.angle / mm['ints'][1])
        # draw the cut region: tpiv = piv*size*base ; sc = (w,h)*size*base
        w, h = cut[2], cut[3]
        tpivx = ep.piv[0] * size[0] * base_scale
        tpivy = ep.piv[1] * size[1] * base_scale
        scx = w * size[0] * base_scale
        scy = h * size[1] * base_scale
        # final image-space transform
        full = mat.translate(-tpivx, -tpivy)
        region = tex.crop((cut[0], cut[1], cut[0] + w, cut[1] + h))
        if abs(scx - w) > 0.01 or abs(scy - h) > 0.01 or True:
            # render via affine
            A = np.array([[full.a, full.c, full.e], [full.b, full.d, full.f]])
            # composite affine with PIL: use Image.transform with AFFINE inverse
            region = region.transform((canvas_w, canvas_h), Image.AFFINE,
                                      (A[0][0], A[0][1], A[0][2], A[1][0], A[1][1], A[1][2]),
                                      resample=Image.BILINEAR)
            if opa < 0.999:
                al = region.getchannel('A').point(lambda v: int(v * opa))
                region.putalpha(al)
            out.alpha_composite(region)
        # children
        for j in range(n):
            if ents[j].fa == i:
                draw_part(j, full, size, base_scale)
    # NOTE: recursive rendering draws parent subtree in z-mixed order incorrectly for
    # complex models; use the simple non-recursive z-ordered pass with accumulated
    # matrices instead:
    out2 = render_frame_flat(ents, mm, tex, cuts, scale, canvas_h, canvas_w, origin_x, origin_y)
    return out2

class M:
    """simple 2D affine matrix"""
    def __init__(self, a=1, b=0, c=0, d=1, e=0, f=0):
        self.a, self.b, self.c, self.d, self.e, self.f = a, b, c, d, e, f
    def copy(self):
        return M(self.a, self.b, self.c, self.d, self.e, self.f)
    def translate(self, x, y):
        # java-style post-multiply: new = this * translate
        return M(self.a, self.b, self.c, self.d,
                 self.a * x + self.c * y + self.e,
                 self.b * x + self.d * y + self.f)
    def scale(self, x, y):
        return M(self.a * x, self.b * x, self.c * y, self.d * y, self.e, self.f)
    def rotate(self, th):
        cs, sn = math.cos(th), math.sin(th)
        return M(self.a * cs + self.c * sn, self.b * cs + self.d * sn,
                 -self.a * sn + self.c * cs, -self.b * sn + self.d * cs, self.e, self.f)
    def apply(self, x, y):
        return (self.a * x + self.c * y + self.e, self.b * x + self.d * y + self.f)

def render_frame_flat(ents, mm, tex, cuts, base_scale, canvas_h, canvas_w, origin_x, origin_y, part_scale=False):
    out = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    n = len(ents)
    mats = [None] * n
    sizes = [None] * n

    def compute(i, ancestor_hf=1.0):
        if mats[i] is not None:
            return mats[i]
        ep = ents[i]
        size = ep.getSize({j: ents[j] for j in range(n)})
        sizes[i] = size
        if i != 0:
            par = ep.fa
            if par is not None and par != i and par < n:
                pm = compute(par)
                psize = sizes[par]
            else:
                pm = M()
                psize = (1.0, 1.0)
            m = pm.copy()
            m = m.translate(psize[0] * base_scale * ep.pos[0], psize[1] * base_scale * ep.pos[1])
            m = m.scale(ep.hf, ep.vf)
        else:
            m = M()
            if mm['confs']:
                d = mm['confs'][0]
                bsize = (abs(mm['parts'][0][8]) / mm['ints'][0], abs(mm['parts'][0][9]) / mm['ints'][0])
                m = m.translate(-bsize[0] * d[2] * base_scale, -bsize[1] * d[3] * base_scale)
            m = m.translate(size[0] * base_scale * ep.piv[0], size[1] * base_scale * ep.piv[1])
            m = m.scale(ep.hf, ep.vf)
        if ep.angle != 0:
            m = m.rotate(math.pi * 2 * ep.angle / mm['ints'][1])
        mats[i] = m
        return m

    for i in range(n):
        compute(i)

    for i in sorted(range(n), key=lambda k: ents[k].z):
        ep = ents[i]
        if ep.id < 0 or ep.img < 0 or ep.img >= len(cuts): continue  # BCU: dormant parts (id<0) never draw
        opa = ep.opa(ents)
        if opa <= 0.005: continue
        cut = cuts[ep.img]
        w, h = cut[2], cut[3]
        if w <= 0 or h <= 0: continue
        size = sizes[i]
        # BCU drawPart: sc = (w,h) * getSize() * base — 1000-scale models have NON-uniform
        # per-part p0 (1.0/1.79/...), so the sprite must draw scaled by its own size.
        # Legacy 255-scale models are uniform-per-model, so 1:1 + global dscale is
        # pixel-identical — keep those untouched (part_scale=False).
        pw = size[0] * base_scale if part_scale else 1.0
        ph = size[1] * base_scale if part_scale else 1.0
        tpivx = ep.piv[0] * size[0] * base_scale
        tpivy = ep.piv[1] * size[1] * base_scale
        m = mats[i].translate(-tpivx, -tpivy)
        # scale goes INTO the matrix (M · T(-tpiv) · S) so the dest→src inverse samples correctly
        if part_scale and (abs(pw - 1) > 1e-9 or abs(ph - 1) > 1e-9):
            m = m.scale(pw, ph)
        # source->dest matrix; compute dest bbox from transformed corners
        a, b, c, d, e, f = m.a, m.b, m.c, m.d, m.e + origin_x, m.f + origin_y
        corners = [(0, 0), (w, 0), (0, h), (w, h)]
        pts = [(a * x + c * y + e, b * x + d * y + f) for x, y in corners]
        bx0 = max(0, int(min(p[0] for p in pts)) - 1)
        by0 = max(0, int(min(p[1] for p in pts)) - 1)
        bx1 = min(canvas_w, int(max(p[0] for p in pts)) + 2)
        by1 = min(canvas_h, int(max(p[1] for p in pts)) + 2)
        if bx1 <= bx0 or by1 <= by0: continue
        det = a * d - b * c
        if abs(det) < 1e-9: continue
        # inverse (dest->source), shifted into the sub-rect
        ia, ic_ = d / det, -c / det
        ib, id_ = -b / det, a / det
        ie = (c * f - d * e) / det + (ia * bx0 + ic_ * by0)
        if_ = (b * e - a * f) / det + (ib * bx0 + id_ * by0)
        A = (ia, ic_, ie, ib, id_, if_)
        region = tex.crop((cut[0], cut[1], cut[0] + w, cut[1] + h))
        layer = region.transform((bx1 - bx0, by1 - by0), Image.AFFINE, A, resample=Image.BILINEAR)
        if opa < 0.999:
            al = layer.getchannel('A').point(lambda v: int(v * min(1.0, opa)))
            layer.putalpha(al)
        out.alpha_composite(layer, (bx0, by0))
    return out

# ---------------- strip generation ----------------

def render_anim(unit_dir, base, anim_idx, base_scale=1.0, max_frames=40):
    tex = Image.open(os.path.join(unit_dir, base + '.png')).convert('RGBA')
    cuts = parse_imgcut(read_text(os.path.join(unit_dir, base + '.imgcut')))['cuts']
    mm = parse_mamodel(read_text(os.path.join(unit_dir, base + '.mamodel')))
    apath = os.path.join(unit_dir, f'{base}{anim_idx:02d}.maanim')
    if not os.path.exists(apath): return None
    ma = parse_maanim(read_text(apath))
    if not ma: return None
    L = min(max_frames, ma_len(ma))
    if L < 1: L = 1
    ents = [EPart(i, p, mm) for i, p in enumerate(mm['parts'])]
    frames = []
    # estimate canvas from a probe frame
    probe = render_frame_flat(ents, mm, tex, cuts, base_scale, 500, 900, 450, 380)
    bbox = probe.getbbox()
    if not bbox: return None
    for f in range(L):
        for ep in ents: ep.setValue()
        apply_anim(ents, ma, f)
        img = render_frame_flat(ents, mm, tex, cuts, base_scale, 500, 900, 450, 380)
        frames.append(img.crop(bbox))
    return frames

if __name__ == '__main__':
    # quick test: doge walk + attack
    d = os.path.join(ANIM, 'enemy', 'doge')
    tiles = []
    for anim, tag in [(0, 'walk'), (1, 'idle'), (2, 'atk'), (3, 'kb')]:
        fr = render_anim(d, '000_e', anim)
        if not fr:
            print(tag, 'NONE'); continue
        print(f'{tag}: {len(fr)} frames, size {fr[0].size}')
        strip = Image.new('RGBA', (sum(f.size[0] + 6 for f in fr) + 6, max(f.size[1] for f in fr) + 6), (255, 255, 255, 255))
        x = 6
        for f in fr:
            strip.paste(f, (x, 6), f); x += f.size[0] + 6
        tiles.append((tag, strip))
    H = sum(s.size[1] + 24 for _, s in tiles) + 10
    W = max(s.size[0] for _, s in tiles) + 10
    from PIL import ImageDraw, ImageFont
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
    c = Image.new('RGB', (W, H), (235, 235, 235))
    dr = ImageDraw.Draw(c)
    y = 5
    for tag, s in tiles:
        dr.text((6, y), tag, fill=(180, 0, 0), font=font)
        c.paste(s.convert('RGB'), (0, y + 20), s)
        y += s.size[1] + 24
    c.save('/tmp/cutout_doge.png')
    print('saved /tmp/cutout_doge.png')
