#!/usr/bin/env python3
"""probe-gifs.py — probe the Fandom CDN for {Title}_attack.gif / {Title}_walk.gif / etc for all units.
   Fandom serves via MD5 hash-path convention with zero page fetches.
   Outputs tools/fandom_gifs.json: {gameId: {walk?:url, atk?:url}}"""
import json, os, re, hashlib, time, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
manifest = json.load(open(os.path.join(ROOT, 'public/game/assets/sprites/manifest.json')))

def cdn(file):
    h = hashlib.md5(file.encode()).hexdigest()
    return f"https://static.wikia.nocookie.net/battle-cats/images/{h[0]}/{h[:2]}/{urllib.parse.quote(file)}/revision/latest"

def exists(url, timeout=12):
    req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status == 200
    except Exception:
        return False

out = {}
for gid, info in manifest.items():
    title = info.get('wikiTitle', '')
    kind = info['kind']
    e = {'kind': kind, 'title': title}
    # attack GIF name variants
    atk_cands = [f'{title}_attack.gif', f'{title}attack.gif', f'{title} Attack.gif', f'{title}_Attack_Animation.gif', f'{title}attackanimation.gif']
    for c in atk_cands:
        if exists(cdn(c)):
            e['atk'] = cdn(c); e['atk_file'] = c; break
    # walk GIF variants (rare on Fandom but probe)
    walk_cands = [f'{title}_walk.gif', f'{title}walk.gif', f'{title}.gif', f'{title}_move.gif']
    for c in walk_cands:
        if exists(cdn(c)):
            e['walk'] = cdn(c); e['walk_file'] = c; break
    out[gid] = e
    tag = []
    if e.get('atk'): tag.append('ATK')
    if e.get('walk'): tag.append('WALK')
    print(gid, title, '+'.join(tag) if tag else '-', flush=True)
    time.sleep(0.15)

json.dump(out, open(os.path.join(ROOT, 'tools/fandom_gifs.json'), 'w'), indent=1)
atk_n = sum(1 for v in out.values() if v.get('atk'))
walk_n = sum(1 for v in out.values() if v.get('walk'))
print(f'\nFandom attack GIFs: {atk_n}/93, walk GIFs: {walk_n}/93')
