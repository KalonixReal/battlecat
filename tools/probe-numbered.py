#!/usr/bin/env python3
"""probe-numbered.py — probe numbered animation GIF patterns for all unit numbers.
   Patterns: Idle{num}.gif, Move{num}.gif, Walk{num}.gif, Attack{num}.gif, {num}_attack.gif,
             {num}_e_animation.gif, {num}_walk_animation.gif, {num}_move_animation.gif
   Probes BOTH Fandom (direct CDN) and Miraheze (via filename list we already have)."""
import json, os, re, hashlib, urllib.request, urllib.parse, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def cdn(file):
    h = hashlib.md5(file.encode()).hexdigest()
    return f"https://static.wikia.nocookie.net/battle-cats/images/{h[0]}/{h[:2]}/{urllib.parse.quote(file)}/revision/latest"

def exists(url):
    req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r: return r.status == 200
    except Exception: return False

manifest = json.load(open(os.path.join(ROOT, 'public/game/assets/sprites/manifest.json')))
nums = {}  # gid -> (kind, num)
for gid, info in manifest.items():
    g = json.dumps(info)
    if info['kind'] == 'enemy':
        m = re.search(r'Enemy_icon_(\d{3})', g)
    else:
        m = re.search(r'Uni(\d{3})_f00', g)
    if m: nums[gid] = (info['kind'], m.group(1))

pats = ['Idle{n}.gif', 'Move{n}.gif', 'Walk{n}.gif', 'Attack{n}.gif', '{n}_attack.gif',
        '{n}_walk_animation.gif', '{n}_move_animation.gif', '{n}_e_animation.gif',
        '{n}e.gif', '{n}_walk.gif', '{n}_move.gif', '{n}_idle.gif']
jobs = {}
for gid, (kind, n) in nums.items():
    for p in pats:
        f = p.format(n=n)
        jobs[cdn(f)] = (gid, f)

print(f'probing {len(jobs)} URLs on Fandom...', flush=True)
hits = {}
with cf.ThreadPoolExecutor(max_workers=16) as ex:
    futs = {ex.submit(exists, u): u for u in jobs}
    for f in cf.as_completed(futs):
        if f.result(): hits[jobs[futs[f]]] = futs[f]

print(f'Fandom numbered hits: {len(hits)}')
for (gid, f), u in sorted(hits.items()): print(f'  {gid}: {f}')
json.dump({f'{gid}': {'file': f, 'url': u} for (gid, f), u in hits.items()},
          open(os.path.join(ROOT, 'tools/numbered_gifs.json'), 'w'), indent=1)
