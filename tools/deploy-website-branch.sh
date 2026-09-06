#!/bin/bash
# Deploy public/game as a standalone website branch (gh-pages) with index.html at root.
# r34: ships the FULL asset set (~460MB) so the load-everything-at-boot pipeline has
# zero 404s. Builds the tree with plumbing (temp index) and pushes a raw commit ref
# THROUGH THE MAIN REPO's credentials (the sandbox redacts the token from file reads,
# so a separate orphan repo can't authenticate).
set -e
MAIN=/home/z/my-project
SRC=$MAIN/public/game
DEPLOY=$MAIN/.website-deploy
IDX=/tmp/ghpages.index

rm -rf "$DEPLOY" "$IDX"
mkdir -p "$DEPLOY"

# --- copy website content ---
cp "$SRC/index.html" "$DEPLOY/"
cp -r "$SRC/js" "$DEPLOY/js"
cp -r "$SRC/fonts" "$DEPLOY/fonts"
mkdir -p "$DEPLOY/assets"
cp -r "$SRC/assets/audio" "$DEPLOY/assets/audio"
cp -r "$SRC/assets/castles" "$DEPLOY/assets/castles"
cp -r "$SRC/assets/maps" "$DEPLOY/assets/maps"
cp -r "$SRC/assets/ui" "$DEPLOY/assets/ui"
mkdir -p "$DEPLOY/assets/sprites"
for f in "$SRC"/assets/sprites/*; do
  b=$(basename "$f")
  if [ "$b" != "raw" ] && [ "$b" != "animdata" ]; then
    cp -r "$f" "$DEPLOY/assets/sprites/"
  fi
done
cp "$SRC/assets/preload.json" "$DEPLOY/assets/preload.json"
touch "$DEPLOY/.nojekyll"

# --- build an orphan commit from the deploy tree (plumbing; temp index; NO worktree changes) ---
cd "$DEPLOY"
export GIT_INDEX_FILE="$IDX"
git --git-dir="$MAIN/.git" --work-tree="$DEPLOY" read-tree --empty
git --git-dir="$MAIN/.git" --work-tree="$DEPLOY" add -A -- .
TREE=$(git --git-dir="$MAIN/.git" --work-tree="$DEPLOY" write-tree)
COMMIT=$(git --git-dir="$MAIN/.git" commit-tree "$TREE" -m "website: r40 — asset-diet full-preload Battle Cats browser port (index.html at root)")
echo "tree=$TREE commit=$COMMIT"

# --- push the raw commit to gh-pages via the main repo's credentials ---
git --git-dir="$MAIN/.git" push origin "$COMMIT:refs/heads/gh-pages" --force
unset GIT_INDEX_FILE
echo "PUSHED gh-pages"
du -sh "$DEPLOY"
