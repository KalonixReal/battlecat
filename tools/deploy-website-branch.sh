#!/bin/bash
# Deploy public/game as a standalone website branch (gh-pages) with index.html at root.
# Contains ONLY the website: index.html + js/ + fonts/ + assets (minus build-time caches).
set -e
SRC=/home/z/my-project/battlecat/public/game
DEPLOY=/home/z/my-project/battlecat/.website-deploy

rm -rf "$DEPLOY"
mkdir -p "$DEPLOY"

# --- copy website content, excluding build-time caches ---
cp "$SRC/index.html" "$DEPLOY/"
cp -r "$SRC/js" "$DEPLOY/js"
cp -r "$SRC/fonts" "$DEPLOY/fonts"
mkdir -p "$DEPLOY/assets/audio" "$DEPLOY/assets/maps" "$DEPLOY/assets/sprites" "$DEPLOY/assets/ui"
cp -r "$SRC/assets/audio/." "$DEPLOY/assets/audio/"
# castles: authentic enemy-castle sprites + the preload manifest (r26 loading screen)
cp -r "$SRC/assets/castles" "$DEPLOY/assets/castles"
cp "$SRC/assets/preload.json" "$DEPLOY/assets/preload.json"
# ui: authentic title/home art (doors bg, logo, title backgrounds, play button)
cp -r "$SRC/assets/ui/." "$DEPLOY/assets/ui/"
# maps: only the backgrounds the game references (battle.js BG_PIC/SOL_ROT)
mkdir -p "$DEPLOY/assets/maps"
for b in $(grep -o "Bg[0-9][0-9][0-9]" "$SRC/js/battle.js" | sort -u); do
  cp "$SRC/assets/maps/$b.png" "$DEPLOY/assets/maps/" 2>/dev/null || true
done
cp "$SRC/assets/maps/eoc_map.png" "$DEPLOY/assets/maps/" 2>/dev/null || true
# sprites: everything except raw/ and animdata/ (build-time caches)
for f in "$SRC"/assets/sprites/*; do
  b=$(basename "$f")
  if [ "$b" != "raw" ] && [ "$b" != "animdata" ]; then
    cp -r "$f" "$DEPLOY/assets/sprites/"
  fi
done
touch "$DEPLOY/.nojekyll"   # skip Jekyll processing on GitHub Pages

# --- init orphan repo, single commit ---
cd "$DEPLOY"
git init -q -b main
git add -A
git -c user.name="KalonixReal" -c user.email="KalonixReal@users.noreply.github.com" \
    commit -q -m "website: Battle Cats browser port (standalone static site, index.html at root)"
git remote add origin https://KalonixReal:$(python3 -c "import json;print(json.load(open('/home/z/my-project/battlecat/.secrets.json'))['github_token'])")@github.com/KalonixReal/battlecat.git
git push -q origin main:gh-pages --force
echo "PUSHED gh-pages"
du -sh "$DEPLOY"
echo "--- root contents ---"
ls -a "$DEPLOY"
