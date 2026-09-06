#!/usr/bin/env python3
"""r40 ASSET DIET — delete every asset the game can never reach, then regenerate
preload.json to match. Motivation (player mandate): "just load everything on load,
but decrease the amount needed — unused assets can be deleted to save RAM".

Reachability audit (every rule below is backed by a code call site):
  maps    : BG_PIC (battle.js) + SOL_ROT rotation + ui.js MAP_BG + data.js
            GAMATOTO expeditions + art.js earthMap (eoc_map.png)      -> 24 Bg files
  castles : battle.js castleImg/castleUrlFor chapter->set rotation
            (eoc ec000-047, itf+cosmos sc000-047, world wc000-047,
             dark+zero+dojo rc000-047)                                -> 192 files
  sprites : sprites.json manifest (863 files — all reachable: cats render in
            roster/gacha/guide, enemies in pools/guide/enemyBig) +
            code-referenced extras (catbase_*.webp via catbase.json,
            ports.png portrait atlas)                                  -> 867 kept
  audio   : audio.js BGM_FILE + SFX map == preload list == disk         -> all kept
  ui      : preload list + boot phase-1 == disk                         -> all kept

Also stamps 'mb' (total transfer estimate) so the boot bar can show "~N MB".
Idempotent: re-running deletes nothing more.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'public', 'game', 'assets')

# ---------- used MAPS (all code call sites) ----------
BG_PIC  = ['Bg000','Bg001','Bg002','Bg014','Bg016','Bg033','Bg074','Bg017','Bg096',
           'Bg057','Bg019','Bg043','Bg023']                 # battle.js BG_PIC (sol:null)
SOL_ROT = ['Bg005','Bg028','Bg030','Bg007','Bg012','Bg023','Bg025','Bg013','Bg098',
           'Bg089','Bg061','Bg088']                          # battle.js SOL_ROT
EXPED   = ['Bg012','Bg005','Bg030','Bg057','Bg019']          # data.js GAMATOTO list
MAP_BG  = ['Bg028','Bg057','Bg019','Bg043','Bg023','Bg012']  # ui.js MAP_BG (submap)
used_maps = set(BG_PIC + SOL_ROT + EXPED + MAP_BG)
maps_keep = set(m + '.webp' for m in used_maps) | {'eoc_map.png'}  # art.js earthMap()

# ---------- used CASTLES (battle.js castleImg rotation, 48-stage cycles) ----------
used_castles = set()
for i in range(48): used_castles.add('eoc/ec%03d.webp' % i)        # eoc1-3 + events
for i in range(24): used_castles.add('cosmos/sc%03d.webp' % i)     # itf1-3
for i in range(24): used_castles.add('cosmos/sc%03d.webp' % (24+i))# cotc1-3
for i in range(48): used_castles.add('world/wc%03d.webp' % i)      # sol
for i in range(16): used_castles.add('dark/rc%03d.webp' % i)       # aku
for i in range(8):  used_castles.add('dark/rc%03d.webp' % (16+i))  # ul (zero)
for i in range(24): used_castles.add('dark/rc%03d.webp' % (24+i))  # dojo

# ---------- used SPRITES (manifest + code-referenced extras) ----------
sp = json.load(open(os.path.join(A, 'sprites', 'sprites.json')))
def clean(p): return re.sub(r'\?.*$', '', p)
used_sprites = set()
for k, u in sp['units'].items():
    for f, fm in u['forms'].items():
        for a in ('walk', 'atk', 'idle'):
            en = fm.get(a)
            if not en: continue
            imgs = en['img'] if isinstance(en['img'], list) else [en['img']]
            for i in imgs: used_sprites.add(clean(i))
for key, fn in sp['icons'].items():
    used_sprites.add(clean(fn))
used_sprites |= {'catbase_idle.webp', 'catbase_a1.webp', 'catbase_a2.webp',
                 'catbase_a3.webp', 'ports.png'}   # catbase.json + boot/art call sites

def diet(folder, keep, tag):
    disk = set(f for f in os.listdir(os.path.join(A, folder))
               if not f.endswith('.json'))
    orphans = sorted(disk - keep)
    freed = 0
    for f in orphans:
        freed += os.path.getsize(os.path.join(A, folder, f))
        os.remove(os.path.join(A, folder, f))
    print('%-8s kept %3d  deleted %3d  freed %6.1f MB' %
          (tag, len(disk & keep), len(orphans), freed / 1e6))
    return freed, orphans

def diet_tree(sub, keep, tag):
    """keep keys are 'dir/file.webp' relative to <sub>/"""
    base = os.path.join(A, sub)
    disk, freed, n = set(), 0, 0
    for root, dirs, files in os.walk(base):
        for f in files:
            disk.add(os.path.relpath(os.path.join(root, f), base))
    orphans = sorted(disk - keep)
    for f in orphans:
        freed += os.path.getsize(os.path.join(base, f))
        os.remove(os.path.join(base, f))
    print('%-8s kept %3d  deleted %3d  freed %6.1f MB' %
          (tag, len(disk & keep), len(orphans), freed / 1e6))
    # prune any directory that became empty
    for root, dirs, files in os.walk(base, topdown=False):
        if not os.listdir(root): os.rmdir(root)
    return freed, orphans

total = 0
f1, _ = diet('sprites', used_sprites, 'sprites')
f2, _ = diet('maps', maps_keep, 'maps')
f3, _ = diet_tree('castles', used_castles, 'castles')
total = f1 + f2 + f3

# ---------- regenerate preload.json ----------
pl = json.load(open(os.path.join(A, 'preload.json')))
pl['maps'] = sorted(m + '.webp?v=50' for m in used_maps)
pl['castles'] = sorted('castles/' + c for c in used_castles)
# total transfer estimate: every byte the boot pool will actually pull
# (assets minus json manifests + the 10 js files + the font)
mb = 0
for root, dirs, files in os.walk(A):
    for f in files:
        if f.endswith('.json'): continue
        mb += os.path.getsize(os.path.join(root, f))
jsdir = os.path.join(ROOT, 'public', 'game')
for f in os.listdir(os.path.join(jsdir, 'js')):
    mb += os.path.getsize(os.path.join(jsdir, 'js', f))
mb += os.path.getsize(os.path.join(jsdir, 'fonts', 'fredoka-one.woff2'))
pl['mb'] = int(round(mb / 1e6))
with open(os.path.join(A, 'preload.json'), 'w') as fh:
    json.dump(pl, fh, separators=(',', ':'))

# ---------- report ----------
def du(path):
    t = 0
    for root, dirs, files in os.walk(path):
        for f in files: t += os.path.getsize(os.path.join(root, f))
    return t / 1e6
print('-' * 60)
print('deleted bytes : %.1f MB' % (total / 1e6))
print('assets now    : %.1f MB' % du(A))
print('preload.json  : maps=%d castles=%d audio=%d ui=%d mb≈%d' %
      (len(pl['maps']), len(pl['castles']), len(pl['audio']), len(pl['ui']), pl['mb']))
print('kept map set  :', ' '.join(sorted(used_maps)))
