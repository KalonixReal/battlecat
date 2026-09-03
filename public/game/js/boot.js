'use strict';
/* ============================== BOOT / MAIN LOOP ============================== */
const SCREENS={title:drawTitle,home:drawHome,chapters:drawChapters,map:drawMap,submap:drawSubmap,equip:drawEquip,upgrade:drawUpgrade,gacha:drawGacha,treasure:drawTreasure,guide:drawGuide,base:drawBase,settings:drawSettings,store:drawStore,battle:drawBattle,expedition:drawExpedition,leaderboard:drawLeaderboard,trophies:drawTrophies,shrine:drawShrine};
let lastTs=0,persistT=0,energyT=0;
function loop(ts){const dt=Math.min(0.05,(ts-lastTs)/1000||0.016);lastTs=ts;G.t+=dt;
  energyT+=dt;if(energyT>1){energyT=0;regenEnergy()}
  persistT+=dt;if(persistT>8){persistT=0;persist()}
  cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cx.setTransform(cv._dpr||1,0,0,cv._dpr||1,0,0);
  G.hits.length=0;
  cx.save();cx.scale(SC,SC);cx.translate(OX/SC,OY/SC);
  cx.beginPath();cx.rect(0,0,1280,720);cx.clip(); // keep all art inside the 1280x720 design area (no letterbox leaks)
  const fn=SCREENS[G.screen]||drawTitle;
  try{fn(dt)}catch(err){console.error('SCREEN ERR',G.screen,err);cx.fillStyle='#300';cx.fillRect(0,0,1280,720);txt(cx,'⚠ UI ERROR: '+err.message,640,360,20,'#fff','center')}
  toastDraw(dt);modalDraw();
  // screen-change transition: quick fade-from-black on push()/pop() (official-style cut)
  if(G.transT>0){G.transT-=dt;const ta=clamp(G.transT/0.30,0,1);
    cx.fillStyle='rgba(18,10,6,'+(ta*ta*0.92).toFixed(3)+')';cx.fillRect(0,0,1280,720);
    if(G.transT<=0)G.transT=0}
  if(G.hoverId)G.hits.forEach(h=>{});
  cx.restore();
  requestAnimationFrame(loop)}
loadSave();
// sanitize team slots against the live roster: an invalid id (edited/imported save) would crash
// catStats() every battle frame — drop it to an empty slot instead
SV.teams=SV.teams.map(t=>t.map(id=>id&&CATMAP[id]?id:''));
ensureMissions();
trophyCheckAll(); // surface any trophies that became claimable while away
AudioBakeProbe(); // pre-rendered SFX bank + BGM loops (assets/audio/) — synth fallback stays
AudioSetBgm('menu');
G.lastEvents=eventStages();G.eventKey='ev'+new Date().toDateString();
document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastTs=performance.now()}});
requestAnimationFrame(loop);
console.log('%cThe Battle Cats booted','color:#ffd94a;font-weight:bold');
window.__BC={G:G,getSV:()=>SV,getB:()=>B}; // QA/testing hook (getB: live battle state, null outside battle)
// tell the Next.js wrapper (or any embedder) the engine is live & the first frame is drawn
try{parent!==window&&parent.postMessage({bc:'booted',v:1},'*')}catch(e){}
addEventListener('message',e=>{ // wrapper → game bridge (focus restore / forced resize)
  if(!e.data||!e.data.bc)return;
  if(e.data.bc==='resize')resize();
});

