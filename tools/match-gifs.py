#!/usr/bin/env python3
"""match-gifs.py — map our 92 game units to Miraheze animation GIFs.
   Cats: prefer numbered {num}_{f,c,s,m}_attack_animation.gif / named attack GIFs.
   Enemies: prefer Idle{Name}.gif (walk/idle) + {Name}attack*.gif (attack).
   Outputs tools/gif_match.json: {gameId: {kind, num, walk_gif?, atk_gif?}}"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'public/game/assets/sprites')
gifs = json.load(open(os.path.join(ROOT, 'tools/miraheze_gifs.json')))
manifest = json.load(open(os.path.join(SPR, 'manifest.json')))

def norm(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())

# index GIFs by normalized name (without Idle/attack/animation suffixes)
gif_by_norm = {}
for k, v in gifs.items():
    f = v['file']
    base = re.sub(r'\.gif$', '', f, flags=re.I)
    gif_by_norm.setdefault(norm(base), []).append(v)

# numbered cat attack GIFs: num -> path (prefer _f form1, then _m, then others)
num_atk = {}
for k, v in gifs.items():
    m = re.match(r'^(\d+)_([a-z])_attack_animation\.gif$', v['file'], re.I)
    if m:
        num = int(m.group(1))
        form = m.group(2).lower()
        pref = {'f': 0, 'm': 1, 'c': 2, 's': 3}.get(form, 9)
        if num not in num_atk or pref < num_atk[num][0]:
            num_atk[num] = (pref, v)

# numbered enemy attack GIFs: {num}_attack.gif
enum_atk = {}
for k, v in gifs.items():
    m = re.match(r'^(\d+)_attack\.gif$', v['file'], re.I)
    if m:
        enum_atk.setdefault(int(m.group(1)), []).append(v)

# enemy idle GIFs: Idle{Name}.gif -> name index
idle_by_name = {}
for k, v in gifs.items():
    m = re.match(r'^Idle(.+)\.gif$', v['file'], re.I)
    if m:
        idle_by_name.setdefault(norm(m.group(1)), []).append(v)

# enemy full-sheet animation GIFs {num}_e_animation_{lang}.gif
esheet = {}
for k, v in gifs.items():
    m = re.match(r'^(\d+)_e_animation_([a-z]+)\.gif$', v['file'], re.I)
    if m:
        esheet.setdefault(int(m.group(1)), []).append(v)

out = {}
miss_atk, miss_walk = [], []
for gid, info in manifest.items():
    kind = info['kind']
    title = info.get('wikiTitle', '')
    num = None
    # extract wiki number from gallery URLs (UniNNN / E_NNN patterns in icon filenames)
    g = json.dumps(info)
    m = re.search(r'Uni(\d{3})_f00', g)
    if m: num = int(m.group(1))
    if num is None:
        m = re.search(r'Enemy_icon_(\d{3})', g)
        if m: num = int(m.group(1))
    entry = {'kind': kind, 'num': num, 'title': title}
    ntitle = norm(title)
    if kind == 'cat':
        # attack: numbered first (num == wiki number), else named attack GIF
        if num is not None and num in num_atk:
            entry['atk_gif'] = num_atk[num][1]['path']
        else:
            # named: {Title}attack... or Title == gif name
            cands = [g for n, lst in gif_by_norm.items() if n == ntitle or (ntitle and ntitle in n and ('attack' in n or 'animation' in n)) for g in lst]
            if cands:
                entry['atk_gif'] = sorted(cands, key=lambda v: len(v['file']))[0]['path']
            else:
                miss_atk.append((gid, title))
    else:
        # walk: Idle{Title}.gif
        if ntitle in idle_by_name:
            entry['walk_gif'] = sorted(idle_by_name[ntitle], key=lambda v: len(v['file']))[0]['path']
        elif num is not None and num in esheet:
            entry['walk_gif'] = sorted(esheet[num], key=lambda v: v['file'])[0]['path']
        else:
            miss_walk.append((gid, title))
        # attack: {num}_attack.gif or named {Title}attack
        if num is not None and num in enum_atk:
            entry['atk_gif'] = sorted(enum_atk[num], key=lambda v: len(v['file']))[0]['path']
        else:
            cands = [g for n, lst in gif_by_norm.items() if n == ntitle + 'attack' or n == 'attack' + ntitle or (ntitle and n.startswith(ntitle) and 'attack' in n) for g in lst]
            if cands:
                entry['atk_gif'] = sorted(cands, key=lambda v: len(v['file']))[0]['path']
            else:
                miss_atk.append((gid, title))
    out[gid] = entry

json.dump(out, open(os.path.join(ROOT, 'tools/gif_match.json'), 'w'), indent=1)
cats = sum(1 for v in out.values() if v['kind'] == 'cat')
print(f"mapped {len(out)} units ({cats} cats)")
print(f"cats missing attack GIF: {len(miss_atk)} -> {[t for _, t in miss_atk][:20]}")
print(f"enemies missing walk GIF: {len(miss_walk)} -> {[t for _, t in miss_walk][:20]}")
have_atk = sum(1 for v in out.values() if v.get('atk_gif'))
have_walk = sum(1 for v in out.values() if v.get('walk_gif'))
print(f"attack GIFs available: {have_atk}, walk GIFs available: {have_walk}")
