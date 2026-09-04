#!/usr/bin/env python3
"""Convert official gamerip tracks to seamless-loop OGG assets (v2: skip-existing + short-track handling)."""
import subprocess, os, json

LB, RB = chr(91), chr(93)
L1 = LB + 'segA' + RB
L2 = LB + 'segB' + RB
L3 = LB + 'segC' + RB
AUD = 'public/game/assets/audio'
os.makedirs(AUD, exist_ok=True)
bgms = ['menu','eoc','eoc2','eoc3','boss','itf','itf2','itf3','cotc','cotc2','cotc3','sol','ul','aku','dojo','event']
jingles = {'win':6,'lose':5,'reward':4,'start':5}
bank = {'sfx': True, 'bgm': {}}

def probeDur(path):
    r = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',path],
                       capture_output=True, text=True)
    try: return float(r.stdout.strip())
    except Exception: return 0.0

for name in bgms:
    dst = os.path.join(AUD, f'bgm_{name}.ogg')
    if os.path.exists(dst) and os.path.getsize(dst) > 500000:
        bank['bgm'][name] = round(probeDur(dst), 3)
        print('skip', name, bank['bgm'][name])
        continue
    src = f'download/gamerip/{name}.mp3'
    tmp = f'/tmp/aud_{name}.wav'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',src,'-t','92','-ar','44100','-ac','2',tmp], check=True)
    full = probeDur(tmp)
    if full >= 95:
        af = ('[0:a]atrim=0:90.4,asetpts=PTS-STARTPTS' + L1 + ';'
              '[0:a]atrim=90.4:92,asetpts=PTS-STARTPTS' + L2 + ';'
              + L1 + L2 + 'acrossfade=d=1.6:c1=tri:c2=tri' + L3)
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',tmp,'-filter_complex',af,
                        '-map',L3,'-c:a','libvorbis','-q:a','4',dst], check=True)
    else:
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',tmp,
                        '-c:a','libvorbis','-q:a','4',dst], check=True)
    bank['bgm'][name] = round(probeDur(dst), 3)
    print(f'bgm_{name}.ogg  {bank["bgm"][name]:.1f}s  {os.path.getsize(dst)//1024}KB')

for name, maxlen in jingles.items():
    dst = os.path.join(AUD, f'jingle_{name}.ogg')
    if os.path.exists(dst) and os.path.getsize(dst) > 10000:
        print('skip jingle', name); continue
    src = f'download/gamerip/{name}.mp3'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',src,'-t',str(maxlen),
                    '-ar','44100','-ac','2','-c:a','libvorbis','-q:a','4',dst], check=True)
    print(f'jingle_{name}.ogg  {os.path.getsize(dst)//1024}KB')

json.dump(bank, open(os.path.join(AUD,'bank.json'),'w'), indent=1)
print('bank.json updated')
