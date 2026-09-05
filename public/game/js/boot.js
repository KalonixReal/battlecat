'use strict';
/* ============================== BOOT / MAIN LOOP v3 ==============================
   AUTHENTIC LOADING SCREEN: black screen + official logo + walking cat base +
   "Now Loading" progress bar — preloads EVERYTHING (UI, castle sprites, cat base
   animations, battle backgrounds, every unit strip, the full original soundtrack)
   so nothing ever pops in mid-game. After the bar fills: TAP TO START (browser
   audio-unlock gesture) → title screen with the real menu theme.
================================================================================= */
const SCREENS={title:drawTitle,home:drawHome,chapters:drawChapters,map:drawMap,submap:drawSubmap,equip:drawEquip,upgrade:drawUpgrade,gacha:drawGacha,treasure:drawTreasure,guide:drawGuide,base:drawBase,settings:drawSettings,store:drawStore,battle:drawBattle,expedition:drawExpedition,leaderboard:drawLeaderboard,trophies:drawTrophies,shrine:drawShrine};
let lastTs=0,persistT=0,energyT=0;

/* ------------------------------ preload pipeline ------------------------------ */
const PRELOAD={total:0,done:0,ready:false,tap:false,failed:[],phase:'',walking:0};
function _pAdd(wt){PRELOAD.total+=wt}
function _pDone(wt){PRELOAD.done+=wt}
/* adoptRuntime: hands each preloaded Image to the EXACT cache its runtime consumer
   reads from (SPRIT strips, battle bg tiles, castle art, cat-base strips) — the old
   flow preloaded into throwaway Images and let every renderer lazily re-fetch, which
   is why maps/castles popped in the first time they were used (r27 user report). */
function adoptRuntime(url,im){
  try{
    if(url.indexOf('assets/sprites/')===0){
      if(typeof SPRIT!=='undefined')SPRIT.adopt(url,im);
      const fn=url.slice(15);
      if(typeof _cbStrips!=='undefined')_cbStrips[fn]=im; // battle's cat-base strip cache (keys are unique filenames)
      if(fn==='ports.png'&&typeof PORTS!=='undefined')PORTS.img=im; // portrait atlas — one decode shared with PORTS
      return}
    if(url.indexOf('assets/maps/')===0){
      const n=url.slice(12).replace(/\.png$/,'');
      if(typeof _bgImgs!=='undefined'&&n!=='eoc_map')_bgImgs[n]=im; // earth map has its own EARTH_MAP holder
      return}
    if(url.indexOf('assets/castles/')===0){
      const n=url.split('/').pop().replace(/\.png$/,'');
      if(typeof _castleImgs!=='undefined')_castleImgs[n]=im;
      return}
  }catch(e){/* cache objects missing (old build order) — browser cache still covers it */}
}
function preloadImg(url,wt){
  _pAdd(wt||1);
  const im=new Image();
  im.onload=()=>{_pDone(wt||1)};
  im.onerror=()=>{_pDone(wt||1);PRELOAD.failed.push(url)};
  im.src=url;
  adoptRuntime(url,im);
  return im;
}
async function preloadRun(){
  PRELOAD.phase='assets';
  // 1) static lists
  try{
    const lists=await fetch('assets/preload.json',{cache:'no-cache'}).then(r=>r.json());
    lists.ui.forEach(n=>{uiImgCache(n,'assets/ui/'+n)});
    lists.castles.forEach(n=>preloadImg('assets/'+n,1));
    lists.maps.forEach(n=>preloadImg('assets/maps/'+n,1));
    // audio weight is registered by the poller from AUDIO_PRELOAD.reg (no double-count here)
    // 2) unit strips straight out of the sprite manifest
    try{
      const sp=await fetch('assets/sprites/sprites.json',{cache:'no-cache'}).then(r=>r.json());
      const urls=new Set();
      for(const k in (sp.units||{}))for(const f in sp.units[k].forms){
        const fm=sp.units[k].forms[f];
        if(fm.walk)urls.add('assets/sprites/'+fm.walk.img);
        if(fm.atk)urls.add('assets/sprites/'+fm.atk.img)}
      for(const k in (sp.icons||{}))urls.add('assets/sprites/'+sp.icons[k]);
      urls.forEach(u=>preloadImg(u,1));
    }catch(e){}
    (lists.sprites||[]).forEach(n=>{if(!n.endsWith('.json'))preloadImg('assets/sprites/'+n,1)});
  }catch(e){/* offline/dev: keep booting, images load lazily */}
  // 3) audio decode (works in a suspended context — the tap only RESUMES)
  try{AudioUnlockSilent()}catch(e){}
  try{AudioBakeProbe()}catch(e){}
  // poll: every audio file accounted for? (AUDIO_PRELOAD is maintained by audio.js)
  const audioWait=setInterval(()=>{
    if(audioRegistered!==AUDIO_PRELOAD.reg){ // sync pre-counted weight to the real queue length
      PRELOAD.total+=AUDIO_PRELOAD.reg-audioRegistered;audioRegistered=AUDIO_PRELOAD.reg}
    const aDone=AUDIO_PRELOAD.done-audioDoneSeen;
    if(aDone>0){PRELOAD.done+=aDone;audioDoneSeen=AUDIO_PRELOAD.done}
    if(PRELOAD.total>0&&PRELOAD.done>=PRELOAD.total){clearInterval(audioWait);finishPreload()}
  },120);
  // safety: never hang the loader — hard timeout at 40s finishes whatever loaded
  setTimeout(finishPreload,40000);
}
let audioRegistered=0,audioDoneSeen=0;
function finishPreload(){
  if(PRELOAD.ready)return;PRELOAD.ready=true;PRELOAD.phase='ready';
}
/* ui images go through ui.js's cache so drawTitle/drawHome use the SAME objects */
function uiImgCache(name,url){
  _pAdd(1);
  const im=new Image();
  im.onload=()=>_pDone(1);
  im.onerror=()=>{_pDone(1);PRELOAD.failed.push(url)};
  im.src=url;
  UIIMG.imgs[name]=im;
}
/* create the AudioContext WITHOUT a user gesture (stays suspended until the tap) */
function AudioUnlockSilent(){
  if(AC)return;
  try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    // true peak-safety limiter (matches audio.js AudioUnlock — one mix, two entry points)
    const comp=AC.createDynamicsCompressor();
    comp.threshold.value=-5;comp.knee.value=10;comp.ratio.value=2.5;
    comp.attack.value=0.003;comp.release.value=0.15;
    masterG=AC.createGain();masterG.gain.value=0.9;
    masterG.connect(comp);comp.connect(AC.destination);
    const bgmOn=(typeof SV!=='undefined'&&SV&&SV.settings.bgm);
    bgmG=AC.createGain();bgmG.gain.value=bgmOn?BGM_VOL:0;bgmG.connect(masterG);
    sfxG=AC.createGain();sfxG.gain.value=SFX_VOL;sfxG.connect(masterG);
    if(AC.state==='suspended'){/* decode still works; resume happens on first tap */}
  }catch(e){}
}

/* ------------------------------ loading screen ------------------------------ */
let cbMeta=null;
fetch('assets/sprites/catbase.json',{cache:'no-cache'}).then(r=>r.json()).then(j=>{cbMeta=j;try{_cbMeta=j}catch(e){}}).catch(()=>{});
function drawCatBaseWalk(x,y,h,t){
  // the real cat base idle strip (16 frames) — walks in place under the logo
  if(!cbMeta||!cbMeta.idle)return;
  const en=cbMeta.idle;
  const im=SPRIT_STRIP_IMG(en.img);
  if(!im)return;
  const fr=en.frames[Math.floor((t*10))%en.frames.length];
  const sc=h/(en.refH||300);
  const w=fr[2]*sc;
  cx.drawImage(im,fr[0],fr[1],fr[2],fr[3],x-w/2,y-fr[3]*sc,w,fr[3]*sc);
}
const _stripImgs={}; // (retired — SPRIT_STRIP_IMG now reads battle.js's shared cbStrip cache)
function SPRIT_STRIP_IMG(fn){
  // shared with battle.js's cat-base cache so the loading screen + in-battle base use ONE decode
  const im=(typeof cbStrip==='function')?cbStrip(fn):null;
  return imgReady(im)?im:null;
}

/* ------------------------------ PERF auto-tuner (r27) ------------------------------
   Goal: 60fps on ANY system. A rolling frame-time monitor watches the real rAF cadence;
   if the machine can't keep up it steps the render tier DOWN (device-pixel-ratio cap
   first, then cosmetic FX) until it holds 60 — and steps back UP when there's headroom.
   Tier 0: full quality (DPR ≤2, all FX)   Tier 1: DPR ≤1.5   Tier 2: DPR ≤1.25, no
   shadowBlur/glow   Tier 3: DPR 1, no FX. A cooldown between steps stops oscillation. */
const PERF={ms:16.7,tier:0,acc:0,n:0,cool:0,good:0,fps:60,last:0};
const PERF_DPR=[2,1.5,1.25,1];
function PERF_FRAME(rawMs){
  if(rawMs<=0||rawMs>250)return; // tab-switch resume spikes are not render cost
  PERF.acc+=rawMs;PERF.n++;
  const t=performance.now();
  if(t-PERF.last>=1000){PERF.fps=Math.round(1000/Math.max(1,PERF.acc/Math.max(1,PERF.n)));PERF.last=t}
  if(PERF.n<90)return; // ~1.5s window
  if(!PRELOAD.tap)return; // boot-time asset decode spikes are NOT render cost — only tune once the game is actually playing
  const avg=PERF.acc/PERF.n;PERF.acc=0;PERF.n=0;
  PERF.ms=PERF.ms*0.4+avg*0.6;
  if(PERF.cool>0){PERF.cool--;return}
  if(PERF.ms>20.5&&PERF.tier<3){PERF.tier++;perfApply();PERF.cool=3;PERF.good=0}
  else if(PERF.ms<15.2&&PERF.tier>0){if(++PERF.good>=4){PERF.good=0;PERF.tier--;perfApply();PERF.cool=4}}
  else PERF.good=0;
}
function perfApply(){
  try{DPR_CAP=PERF_DPR[PERF.tier];resize()}catch(e){}
  console.log('%c[PERF] tier '+PERF.tier+' (dpr≤'+PERF_DPR[PERF.tier]+', fx='+(PERF.tier>=2?'off':'on')+')','color:#7fd0ff')}
function drawLoading(dt){
  const w=1280,h=720;
  cx.fillStyle='#0d0d12';cx.fillRect(0,0,w,h);
  // official logo
  const logo=uiImg('title_logo.png');
  if(logo)cx.drawImage(logo,w/2-270,110,540,243);
  else{txt(cx,'THE BATTLE CATS',w/2,230,44,'#ffd94a','center')}
  // walking cat base (real animation)
  PRELOAD.walking+=dt;
  drawCatBaseWalk(w/2,470,110,PRELOAD.walking);
  // progress bar
  const p=PRELOAD.total?clamp(PRELOAD.done/PRELOAD.total,0,1):0;
  const bw=460,bx=w/2-bw/2,by=520;
  cx.fillStyle='#242430';rr(cx,bx-3,by-3,bw+6,22,11);cx.fill();
  cx.fillStyle='#111118';rr(cx,bx,by,bw,16,8);cx.fill();
  if(p>0.01){cx.fillStyle='#ffd94a';rr(cx,bx,by,Math.max(14,bw*p),16,8);cx.fill();
    cx.fillStyle='rgba(255,255,255,.25)';rr(cx,bx,by,Math.max(14,bw*p),6,4);cx.fill()}
  txt(cx,PRELOAD.ready?'READY':('Now Loading... '+Math.round(p*100)+'%'),w/2,by+42,17,'#e8dfc8','center');
  txt(cx,'The Battle Cats — web replica',w/2,h-26,12,'rgba(255,255,255,.35)','center');
  // TAP TO START gate (browser audio needs a gesture — also how ports do it)
  if(PRELOAD.ready){
    const pu=0.6+0.4*Math.sin(G.t*4);
    cx.fillStyle='rgba(255,217,74,'+pu.toFixed(3)+')';
    txt(cx,'TAP TO START',w/2,600,30,'#ffd94a','center',6,'#1a1408',900);
  }
}

/* ------------------------------ main loop ------------------------------ */
function loop(ts){
  const rawMs=ts-lastTs;
  const dt=Math.min(0.05,rawMs/1000||0.016);lastTs=ts;G.t+=dt;
  PERF_FRAME(rawMs);
  energyT+=dt;if(energyT>1){energyT=0;regenEnergy()}
  persistT+=dt;if(persistT>8){persistT=0;persist()}
  cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cx.setTransform(cv._dpr||1,0,0,cv._dpr||1,0,0);
  G.hits.length=0;
  cx.save();cx.scale(SC,SC);cx.translate(OX/SC,OY/SC);
  cx.beginPath();cx.rect(0,0,1280,720);cx.clip(); // keep all art inside the 1280x720 design area (no letterbox leaks)
  if(!PRELOAD.ready){
    drawLoading(dt);
  }else if(!PRELOAD.tap){
    drawLoading(dt); // bar full — waiting for the tap (TAP TO START pulses)
    // any pointer down anywhere starts the game (registered by the canvas hit layer below)
  }else{
    const fn=SCREENS[G.screen]||drawTitle;
    try{fn(dt)}catch(err){console.error('SCREEN ERR',G.screen,err);cx.fillStyle='#300';cx.fillRect(0,0,1280,720);txt(cx,'⚠ UI ERROR: '+err.message,640,360,20,'#fff','center')}
    modalDraw();toastDraw(dt); // toasts render ABOVE modals (in-modal action feedback stays visible)
    // screen-change transition: quick fade-from-black on push()/pop() (official-style cut)
    if(G.transT>0){G.transT-=dt;const ta=clamp(G.transT/0.30,0,1);
      cx.fillStyle='rgba(18,10,6,'+(ta*ta*0.92).toFixed(3)+')';cx.fillRect(0,0,1280,720);
      if(G.transT<=0)G.transT=0}
  }
  cx.restore();
  requestAnimationFrame(loop)}
loadSave();
if(typeof earthMap==='function')earthMap(); // preload the real Earth map AT BOOT — the stage-select map never flashes a placeholder (r22 user report)
// sanitize team slots against the live roster: an invalid id (edited/imported save) would crash
// catStats() every battle frame — drop it to an empty slot instead
SV.teams=SV.teams.map(t=>t.map(id=>id&&CATMAP[id]?id:''));
ensureMissions();
trophyCheckAll(); // surface any trophies that became claimable while away
G.lastEvents=eventStages();G.eventKey='ev'+new Date().toDateString();
document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastTs=performance.now()}});
preloadRun();
requestAnimationFrame(loop);
/* first gesture anywhere: unlock audio, start the menu theme, enter the title */
function bootFirstTap(){
  if(!PRELOAD.ready||PRELOAD.tap)return;
  PRELOAD.tap=true;
  try{AudioUnlock()}catch(e){}
  try{AudioSetBgm('menu')}catch(e){}
  try{SFX.click()}catch(e){}
}
addEventListener('pointerdown',bootFirstTap,{capture:true});
addEventListener('keydown',bootFirstTap,{capture:true});
console.log('%cThe Battle Cats booted','color:#ffd94a;font-weight:bold');
window.__BC={G:G,getSV:()=>SV,getB:()=>B,ENEMAP,CATMAP,genStage,startBattle,spawnCat,spawnEnemy,updateBattle:()=>B&&updateBattle(0.016),PRELOAD,PERF:()=>({fps:PERF.fps,ms:+PERF.ms.toFixed(2),tier:PERF.tier})}; // QA/testing hook (getB: live battle state, null outside battle)
// tell the Next.js wrapper (or any embedder) the engine is live & the first frame is drawn
try{parent!==window&&parent.postMessage({bc:'booted',v:1},'*')}catch(e){}
addEventListener('message',e=>{ // wrapper → game bridge (focus restore / forced resize)
  if(!e.data||!e.data.bc)return;
  if(e.data.bc==='resize')resize();
  if(e.data.bc==='taptostart')bootFirstTap();
});
