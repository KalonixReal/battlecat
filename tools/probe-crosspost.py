#!/usr/bin/env python3
"""probe-crosspost.py — find which Miraheze GIFs also exist on the Fandom CDN (direct, no proxy).
   Plus probe systematic name variants per unit. Output: tools/crosspost.json {file: cdn_url}"""
import json, os, re, hashlib, time, urllib.request, urllib.parse, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def cdn(file):
    h = hashlib.md5(file.encode()).hexdigest()
    return f"https://static.wikia.nocookie.net/battle-cats/images/{h[0]}/{h[:2]}/{urllib.parse.quote(file)}/revision/latest"

def exists(url):
    req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status == 200
    except Exception:
        return False

gifs = json.load(open(os.path.join(ROOT, 'tools/miraheze_gifs.json')))
names = [v['file'] for v in gifs.values()]
# only animation-useful ones: numbered attacks, Idle*, and enemy-ish names
wanted = [n for n in names if re.match(r'^\d{3}_', n) or n.lower().startswith('idle')]
print(f'probing {len(wanted)} gif names on Fandom CDN...', flush=True)

hits = {}
with cf.ThreadPoolExecutor(max_workers=12) as ex:
    futs = {ex.submit(exists, cdn(n)): n for n in wanted}
    done = 0
    for f in cf.as_completed(futs):
        n = futs[f]
        done += 1
        if done % 100 == 0: print(f'  {done}/{len(wanted)}', flush=True)
        if f.result(): hits[n] = cdn(n)

print('crossposted hits:', len(hits))
json.dump(hits, open(os.path.join(ROOT, 'tools/crosspost.json'), 'w'), indent=1)
for k in sorted(hits)[:20]: print(' ', k)
