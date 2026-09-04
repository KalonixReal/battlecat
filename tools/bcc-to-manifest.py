#!/usr/bin/env python3
"""bcc-to-manifest.py — build the FULL sprite manifest from the BCC (Battle Cats Compendium)
   databases (/tmp/bcc_db.json cats + /tmp/bcc_enemies.json enemies) using the Fandom CDN's
   MD5 hash-path convention. ZERO page fetches needed — every sheet/icon URL is constructed.

   Numbering: BCC cat ids are 1-based where the WIKI file naming is 0-based
   (verified: BCC 001=Cat ↔ wiki 000_f.png "Cat's spritesheet"; BCC 007=Fish ↔ wiki 006_f).
   Enemy ids match the wiki directly (BCC 000=Doge ↔ E_000.png).
"""
import json, re, hashlib, os, sys, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'public/game/assets/sprites')

def cdn(file):
    h = hashlib.md5(file.encode()).hexdigest()
    return f"https://static.wikia.nocookie.net/battle-cats/images/{h[0]}/{h[:2]}/{urllib.parse.quote(file)}/revision/latest"

def norm(s):
    return re.sub(r'[^a-z0-9]+', '', s.lower())

data_js = open(os.path.join(ROOT, 'public/game/js/data.js')).read()
cat_forms = {}
for m in re.finditer(r"C\('(\w+)','\w+',(?:\{[^}]*\}|'[^']*'|[^,]+),\[((?:F\([\s\S]*?\)\]?\,?)*)\]", data_js):
    cid = m.group(1)
    names = re.findall(r"F\((['\"])((?:(?!\1).)*)\1", m.group(2))
    cat_forms[cid] = [n[1] for n in names]
enemy_names = {}
for m in re.finditer(r"E\('(\w+)',EF\((['\"])((?:(?!\2).)*)\2", data_js):
    enemy_names[m.group(1)] = m.group(3)

cats_db = json.load(open('/tmp/bcc_db.json'))['sampledata']
enemies_db = json.load(open('/tmp/bcc_enemies.json'))['sampledata']

# BCC unit table: num -> [form names]
bcc_units = {}
for c in cats_db:
    num = c['key'].split('-')[0]
    bcc_units.setdefault(num, []).append(c['name'])
# BCC enemy table: num -> name
bcc_enemies = {e['key']: e['name'] for e in enemies_db}

# fuzzy match: any of our form names matches a BCC unit's any form name
def match_cat(forms):
    cand = []
    for num, names in bcc_units.items():
        for our in forms:
            for their in names:
                if norm(our) == norm(their):
                    cand.append((int(num), num, their))
    if not cand:
        return None
    cand.sort()
    return cand[0]  # lowest id — the original unit (avoid gacha dupes sharing form names)

# manual overrides for our units whose real-game counterparts have different names
# ourId -> (bccNum, formSuffix) — formSuffix picks WHICH sheet family to use
OVERRIDE = {
  'kaguya': ('615', 'fcs'),      # Kaguya of the Coast
  'gao': ('270', 'fcs'),         # Baby Gao / Mighty Lord Gao
  'noble': ('451', 'fcs'),       # High Lord Babel (Warlord/Demon King vibe)
  'luza': ('171', 's'),          # Lufalan Pasalan (Tecoluga true form)
  'gatr': ('462', 'fcs'),        # Legeluga (legend rare)
  'archer': ('057', 'fcs'),      # Archer Cat
  'island': ('007', 's'),        # Island Cat = Fish Cat TRUE form
  'rock': ('582', 'fcs'),        # Rock Cat / Boulder Cat
}
ENEMY_OVERRIDE = {
  'nyandam': '023',      # Dark Emperor Nyandam
  'clionel': '232',      # Cruel Angel Clionel
  'dogedark': '046',     # Doge Dark
  'wanwan': '506',       # Everlord Wanwan
  'kurosawah': '053',    # Director Kurosawah
  'gregor': '362',       # General GreGory
  'dober': '044',        # Dober P.D
  'elizabeth': '178',    # Elizabeth the LVIth
  'akucerberus': '554',  # Cerberus Kids
  'witchen': '121',      # Drury Witch
  'ghostdoge': '284',    # Zoge (ghostly doge)
  'zombibear': '427',    # Cadaver Bear
  'zombieelephant': '641', # Elephantidae Papaou
  'behemothcroc': '655', # Crocodylidae Kurocroc
  'behemothbear': '100', # Bearkini
  'relichippo': '113',   # Heavenly Hippoe (gold relic vibe)
  'angelseraph': '254',  # Mr. Angel
}
manifest = {}
unmatched = []
for uid, forms in cat_forms.items():
    hit = match_cat(forms)
    sufs = 'fcs'
    if uid in OVERRIDE:
        num, sufs = OVERRIDE[uid]
        hit = (int(num), num, bcc_units.get(num, [forms[0]])[0])
    if not hit:
        unmatched.append('cat:' + uid)
        continue
    _, num, name = hit
    wiki = f'{int(num) - 1:03d}'
    gal, mains = [], []
    # download a sheet per OUR form count, using the BCC form list order
    bcc_forms = bcc_units.get(num, forms)
    n_sufs = len(sufs) if sufs != 'fcs' else len(forms)
    for i, suf in enumerate(sufs[:n_sufs if sufs=='fcs' else len(sufs)]):
        if i >= (len(forms) if sufs == 'fcs' else len(sufs)):
            break
        f = f'{wiki}_{suf}.png'
        gal.append({'file': f, 'url': cdn(f), 'caption': f'{bcc_forms[i] if i < len(bcc_forms) else forms[i]} spritesheet', 'sizeKB': 0})
        ic = f'Uni{wiki}_{suf}00.png'
        mains.append({'url': cdn(ic), 'file': ic})
    manifest[uid] = {'kind': 'cat', 'wikiTitle': name, 'gallery': gal, 'mainImages': mains}

for uid, ename in enemy_names.items():
    found = None
    if uid in ENEMY_OVERRIDE:
        num = ENEMY_OVERRIDE[uid]
        found = (num, bcc_enemies.get(num, ename))
    if not found:
        for num, their in bcc_enemies.items():
            if norm(their) == norm(ename):
                found = (num, their)
                break
    if not found:
        unmatched.append('enemy:' + uid)
        continue
    num, their = found
    f = f'{num}_e.png'
    ic = f'Enemy_icon_{num}.png'
    manifest[uid] = {'kind': 'enemy', 'wikiTitle': their,
                     'gallery': [{'file': f, 'url': cdn(f), 'caption': f'{their} spritesheet', 'sizeKB': 0}],
                     'mainImages': [{'url': cdn(ic), 'file': ic}]}

# preserve richer entries (real GIF captions) from the existing fetcher manifest
old_path = os.path.join(SPR, 'manifest.json')
try:
    old = json.load(open(old_path))
    for uid, info in old.items():
        if uid in manifest:
            merged = list(info.get('gallery', []))
            have = {g['file'] for g in merged}
            for g in manifest[uid]['gallery']:
                if g['file'] not in have:
                    merged.append(g)
            oldmain = list(info.get('mainImages', []))
            haveM = {g['file'] for g in oldmain}
            for g in manifest[uid]['mainImages']:
                if g['file'] not in haveM:
                    oldmain.append(g)
            manifest[uid]['gallery'] = merged
            manifest[uid]['mainImages'] = oldmain
        else:
            manifest[uid] = info
except Exception:
    pass

json.dump(manifest, open(old_path, 'w'), indent=1)
print('manifest:', len(manifest), 'units')
print('unmatched (painter fallback):')
for u in unmatched:
    print('  ', u)
