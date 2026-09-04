#!/usr/bin/env python3
"""unpack-bcuzip.py — decrypt a .asset.bcuzip and extract its info index."""
import struct, hashlib, json, sys, os
from Crypto.Cipher import AES

def unpack(path, outdir):
    data = open(path, 'rb').read()
    key = data[0x10:0x20]
    iv = hashlib.md5(b'battlecatsultimate').digest()
    length = struct.unpack('<I', data[0x20:0x24])[0]
    pad = 16 * (length // 16 + 1)
    dec = AES.new(key, AES.MODE_CBC, iv).decrypt(data[0x24:0x24 + pad])
    info = json.loads(dec[:length].decode('utf-8', errors='ignore'))
    os.makedirs(outdir, exist_ok=True)
    json.dump(info, open(os.path.join(outdir, '_info.json'), 'w'))
    return info

def extract(path, info, outdir, only=None):
    data = open(path, 'rb').read()
    base = 0x24 + 16 * (info and 0) # unused; offsets are pack-relative after info
    # real data base = 0x24 + pad — recompute
    length = struct.unpack('<I', data[0x20:0x24])[0]
    pad = 16 * (length // 16 + 1)
    dbase = 0x24 + pad
    n = 0
    for f in info['files']:
        p = f['path']
        if only and not only(p):
            continue
        rel = p.lstrip('./')
        dst = os.path.join(outdir, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        blob = data[dbase + f['offset']: dbase + f['offset'] + f['size']]
        open(dst, 'wb').write(blob)
        n += 1
    return n

if __name__ == '__main__':
    pid = sys.argv[1]
    path = f'/tmp/apk/{pid}.asset.bcuzip'
    outdir = f'/tmp/apk/x/{pid}'
    info = unpack(path, outdir)
    print(pid, '->', len(info['files']), 'files')
    n = extract(path, info, outdir)
    print('extracted', n)
