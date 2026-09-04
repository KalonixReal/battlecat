#!/usr/bin/env python3
"""extract-animdata.py — decrypt all cutout animation files for our 92 game units
   from the unpacked bcu-assets packs into public/game/assets/sprites/animdata/"""
import json, os, re, struct, hashlib, glob
from Crypto.Cipher import AES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public/game/assets/sprites/animdata')
manifest = json.load(open(os.path.join(ROOT, 'public/game/assets/sprites/manifest.json')))
unit_index = json.load(open('/tmp/apk/unit_index.json'))  # "unit000"/"enemy000" -> pack dir

data_js = open(os.path.join(ROOT, 'public/game/js/data.js')).read()
cat_forms = {}
for m in re.finditer(r"C\('(\w+)','\w+',\[([\s\S]*?)\]\)", data_js):
    names = re.findall(r"F\((['\"])(.*?)\1", m.group(2))
    cat_forms[m.group(1)] = [n[1] for n in names]

_pack_cache = {}
def load_pack(d):
    if d in _pack_cache: return _pack_cache[d]
    pid = os.path.basename(d.rstrip('/'))
    data = open(f'/tmp/apk/{pid}.asset.bcuzip', 'rb').read()
    key = data[0x10:0x20]
    iv = hashlib.md5(b'battlecatsultimate').digest()
    length = struct.unpack('<I', data[0x20:0x24])[0]
    dbase = 0x24 + 16 * (length // 16 + 1)
    info = json.load(open(os.path.join(d, '_info.json')))
    _pack_cache[d] = (data, key, iv, dbase, {f['path']: f for f in info['files']})
    return _pack_cache[d]

def extract_file(d, path, dst):
    data, key, iv, dbase, files = load_pack(d)
    ent = files.get(path)
    if not ent: return False
    n = ent['size']
    nb = (n + 31) // 16 * 16  # padded to block boundary + one spare block
    base_off = dbase + ent['offset']
    best = None; best_score = -1
    for delta in (0, -16, 16):  # some entries sit 16 bytes off in EITHER direction (pack quirk)
        off = base_off + delta
        blob = data[off: off + nb]
        if len(blob) < nb: continue
        if blob[:4] == b'\x89PNG':
            best = blob[:n]; break
        dec = AES.new(key, AES.MODE_CBC, iv).decrypt(blob)[:n]
        s = 0
        if dec[:4] == b'\x89PNG': s += 1000  # decrypted to a valid PNG (entry was 16-shifted)
        head = dec[:40]
        if b'[modelanim' in head or b'[imgcut' in head: s += 100
        pr = sum(1 for c in dec[:256] if 32 <= c < 127 or c in (9, 10, 13))
        s += pr
        if s > best_score: best_score, best = s, dec
    if best is None: return False
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, 'wb').write(best)
    return True

def main():
    ok = miss = 0
    for gid, info in manifest.items():
        kind = info['kind']
        g = json.dumps(info)
        m = re.search(r'Enemy_icon_(\d{3})', g) if kind == 'enemy' else re.search(r'Uni(\d{3})_f00', g)
        if not m:
            m = re.search(r'Uni(\d{3})_', g)
        if not m:
            print('SKIP', gid, 'no num'); continue
        num = m.group(1)
        key = 'unit' + num if kind == 'cat' else 'enemy' + num
        d = unit_index.get(key)
        if not d:
            print('MISS', gid, key); miss += 1; continue
        if kind == 'cat':
            n_forms = len(cat_forms.get(gid, ['x']))
            forms = [('fcs'[fi] if fi < 3 else 's') for fi in range(min(n_forms, 3))]
        else:
            forms = ['e']
        got = 0
        for suf in forms:
            base = f'./org/{ "unit" if kind=="cat" else "enemy"}/{num}/{num}_{suf}'
            sub = f'{num}/{num}_{suf}' if kind == 'enemy' else f'{num}/{suf}/{num}_{suf}'
            src_dir = f'./org/{"unit" if kind=="cat" else "enemy"}/{num}' + ('' if kind == 'enemy' else f'/{suf}')
            dst_dir = os.path.join(OUT, kind, gid)
            targets = {
                'imgcut': f'{src_dir}/{num}_{suf}.imgcut',
                'mamodel': f'{src_dir}/{num}_{suf}.mamodel',
                'png': f'{src_dir}/{num}_{suf}.png',
            }
            for i in range(10):
                targets[f'a{i}'] = f'{src_dir}/{num}_{suf}{i:02d}.maanim'
            any_ok = False
            for tag, p in targets.items():
                if tag.startswith('a'):
                    idx = tag[1:]
                    dstname = f'{num}_{suf}{int(idx):02d}.maanim'
                else:
                    dstname = f'{num}_{suf}.{tag}'
                if extract_file(d, p, os.path.join(dst_dir, dstname)):
                    any_ok = True
            # edi/uni icons already handled separately
            if any_ok: got += 1
        if got:
            ok += 1
            print(f'OK {gid} ({info["wikiTitle"]}) forms={got}')
        else:
            miss += 1
            print('MISS-DATA', gid, key)
    print(f'\ndone: {ok} units extracted, {miss} missing')

if __name__ == '__main__':
    main()
