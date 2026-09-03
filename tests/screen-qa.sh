#!/bin/bash
# Screen QA: visit each screen, capture screenshot + probe pixels + collect errors
# v2: covers all 18 screens incl. expedition/leaderboard/trophies/shrine
cd /home/z/my-project
mkdir -p tests/shots
SCREENS="title home chapters map submap equip upgrade gacha treasure guide base settings store expedition leaderboard trophies shrine battle"
for s in $SCREENS; do
  # jump to screen via the QA hook (title/home need fresh state each)
  agent-browser eval "(()=>{const w=document.querySelector('iframe').contentWindow;const G=w.__BC.G;if('$s'==='battle'){w.startBattle(w.genStage('eoc1',0))}else{G.screen='$s';G.hits=[];G.screenPrev=['home'];G.modal=null;G.gachaAnim=null;G.shrineAnim=null}return G.screen})()" > /dev/null 2>&1
  sleep 1.2
  agent-browser screenshot tests/shots/sweep-$s.png > /dev/null 2>&1
done
echo "--- console errors ---"
agent-browser console 2>&1 | rg -i "err|warn|fail" | rg -v "React DevTools|HMR|Fast Refresh" | head -30
echo "--- verify shots ---"
bun tests/verify-shots.ts 2>/dev/null | tail -22
echo "--- done ---"
