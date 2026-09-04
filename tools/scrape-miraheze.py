#!/usr/bin/env python3
"""scrape-miraheze.py — enumerate all Battle Cats animation GIFs on Miraheze via Firecrawl.
   Outputs tools/miraheze_gifs.json: [{file, url (static.wikitide.net direct path), cat}]"""
import json, os, re, sys, time, urllib.request

FC_KEY = None
for p in [os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.secrets.json')]:
    try: FC_KEY = json.load(open(p)).get('firecrawl')
    except Exception: pass
if not FC_KEY:
    print('no firecrawl key'); sys.exit(1)

API = 'https://api.firecrawl.dev/v2/scrape'

def scrape(url, fmts=('markdown',)):
    body = json.dumps({'url': url, 'formats': list(fmts)}).encode()
    req = urllib.request.Request(API, data=body, headers={
        'Authorization': f'Bearer {FC_KEY}', 'Content-Type': 'application/json'}, method='POST')
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.loads(r.read())
            if d.get('success'): return d['data']
        except Exception as e:
            print('  retry', attempt, e); time.sleep(3 + attempt * 3)
    return None

def parse_files(md):
    """markdown contains [![](thumburl)](filepage) entries; thumburl has hash path"""
    out = []
    # thumb pattern: https://static.wikitide.net/battlecatswiki/thumb/<h1>/<h2>/<FILE>/120px-<FILE>
    for m in re.finditer(r'https://static\.wikitide\.net/battlecatswiki/thumb/([0-9a-f])/([0-9a-f]{2})/([^/"]+?)/\d+px-[^)"\s]+', md):
        h1, h2, fname = m.group(1), m.group(2), m.group(3)
        # names in thumbs may be url-encoded; keep raw for URL construction
        from urllib.parse import unquote
        name = unquote(fname)
        out.append({'file': name, 'path': f'{h1}/{h2}/{fname}'})
    return out

CATS = [
    'Cat_animations',
    'Enemy_animations',
]
seen = {}
for cat in CATS:
    url = f'https://battlecats.miraheze.org/wiki/Category:{cat}'
    page_from = None
    pages = 0
    while pages < 12:
        u = url + (f'?filefrom={page_from}' if page_from else '')
        print('scraping', u)
        d = scrape(u)
        if not d:
            print(' scrape failed'); break
        md = d.get('markdown', '')
        files = parse_files(md)
        new = 0
        for f in files:
            if f['file'] not in seen:
                seen[f['file']] = {'**cat': cat, **f}
                new += 1
        print(f'  +{new} (total {len(seen)})')
        pages += 1
        # find next-page link: ( [next page](...filefrom=X#...) )
        nx = re.search(r'\[next page\]\([^)]*filefrom=([^)&#]+)', md)
        if nx:
            page_from = nx.group(1)
        else:
            break
        time.sleep(1.5)

out = {k: {'file': v['file'], 'path': v['path'], 'cat': v['**cat']} for k, v in seen.items()}
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'miraheze_gifs.json'), 'w'), indent=0)
print('TOTAL GIFS:', len(out))
# naming breakdown
import collections
pat = collections.Counter()
for v in out.values():
    m = re.match(r'^(\d+)_([a-z]+)_([a-z_]+)_animation', v['file'])
    pat[(m.group(2) if m else '?', m.group(3) if m else '?')] += 1
for k, c in sorted(pat.items()): print(k, c)
