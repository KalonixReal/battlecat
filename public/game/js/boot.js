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

/* ------------------------------ preload pipeline v6 (r34) ------------------------------
   FULL PRELOAD, per player mandate: the BOOT loading screen loads EVERYTHING —
   cats, the map, UI chrome, every icon, the FULL soundtrack, AND all battle-only
   assets (enemy strips, battle backgrounds, castles, battle BGM/SFX). The bar
   tracks the real byte-level progress of all ~900 files, and battles therefore
   open instantly (their loading gate passes on the first frame). Low-memory
   devices (<2GB deviceMemory) still release battle decodes after a fight. */
const PRELOAD={total:0,done:0,ready:false,tap:false,failed:[],phase:'',walking:0,disp:0,bgTotal:0,bgDone:0};
function _pAdd(wt){PRELOAD.total+=wt}
function _pDone(wt){PRELOAD.done+=wt;if(!PRELOAD.ready&&PRELOAD.total>0&&PRELOAD.done>=PRELOAD.total)finishPreload()}
function finishPreload(){
  if(PRELOAD.ready)return;PRELOAD.ready=true;PRELOAD.phase='ready';
}
/* adoptRuntime: hands each preloaded Image to the EXACT cache its runtime consumer
   reads from (SPRIT strips, battle bg tiles, castle art, cat-base strips) — so the
   runtime never re-fetches what the pool already downloaded. */
function adoptRuntime(url,im){
  try{
    if(url.indexOf('assets/sprites/')===0){
      if(typeof SPRIT!=='undefined')SPRIT.adopt(url,im);
      const fn=url.slice(15);
      if(typeof _cbStrips!=='undefined')_cbStrips[fn]=im; // battle's cat-base strip cache (keys are unique filenames)
      return}
    if(url.indexOf('assets/maps/')===0){
      // strip extension AND any cache-bust query — bgImg() keys are bare names ('Bg000')
      const n=url.slice(12).replace(/\.(png|jpg|webp)(\?.*)?$/,'');
      if(typeof _bgImgs!=='undefined'&&n!=='eoc_map')_bgImgs[n]=im; // earth map has its own EARTH_MAP holder
      return}
    if(url.indexOf('assets/castles/')===0){
      const n=url.split('/').pop().replace(/\.(png|jpg|webp)(\?.*)?$/,'');
      if(typeof _castleImgs!=='undefined')_castleImgs[n]=im;
      return}
    if(url.indexOf('assets/ui/')===0){
      // ui pool urls are 'assets/ui/<file>?v=50' — adopt into UIIMG under the bare
      // filename so uiImg() finds the SAME decoded object (no re-fetch/decode).
      const n=url.slice(11).replace(/\?.*$/,'');
      if(typeof UIIMG!=='undefined'&&UIIMG.imgs[n]===undefined)UIIMG.imgs[n]=im;
      return}
  }catch(e){/* cache objects missing (old build order) — browser cache still covers it */}
}
function PORTS_LOADED(){/* hook for ui code that waits on the portrait atlas */}
/* ---- phase-1 gate images (tiny, load FIRST, nothing else competes) ---- */
function preloadImg(url){
  _pAdd(1);
  const im=new Image();
  im.onload=()=>{_pDone(1);adoptRuntime(url,im)};
  im.onerror=()=>{_pDone(1);PRELOAD.failed.push(url)};
  im.src=url;
  return im;
}
/* ---- phase-2 background pool (N parallel, priority-ordered, adopts everything).
   r34: pool completions count toward the SAME total/done counters the loading bar
   reads — the bar now reflects the REAL full preload (it used to finish after the
   7 phase-1 images while half a GB still streamed silently — players tapped in and
   hit half-loaded screens; that was the "stuff doesn't load" experience). ---- */
const _pool={q:[],active:0,MAX:16,started:false};
function poolAdd(url){_pool.q.push(url);PRELOAD.bgTotal++;_pAdd(1);poolPump()}
function poolPump(){
  while(_pool.active<_pool.MAX&&_pool.q.length){
    const url=_pool.q.shift();_pool.active++;
    const im=new Image();
    im.onload=()=>{_pool.active--;PRELOAD.bgDone++;_pDone(1);adoptRuntime(url,im);poolPump()};
    im.onerror=()=>{_pool.active--;PRELOAD.bgDone++;PRELOAD.failed.push(url);_pDone(1);poolPump()};
    im.src=url;
  }
}
function spriteUrlsFromManifest(sp,filter,withIcons){
  const urls=[];
  for(const k in (sp.units||{}))for(const f in sp.units[k].forms){
    const fm=sp.units[k].forms[f];
    for(const a of ('walk atk idle').split(' ')){const en=fm[a];if(!en)continue;
      (Array.isArray(en.img)?en.img:[en.img]).forEach(img=>{if(!filter||filter(k,f,a))urls.push('assets/sprites/'+img)})}}
  if(withIcons!==false)for(const k in (sp.icons||{}))urls.push('assets/sprites/'+sp.icons[k]);
  return urls;
}
function preloadRun(){
  PRELOAD.phase='first-paint';
  // 1) PHASE 1: the files the loading screen + title + home need to look right
  uiImgCache('title_logo.png','assets/ui/title_logo.webp?v=50');
  uiImgCache('title_bg.png','assets/ui/title_bg.webp?v=50');
  uiImgCache('title_bg_itf.png','assets/ui/title_bg_itf.webp?v=50');   // campaign-cleared title variants
  uiImgCache('title_bg_cotc.png','assets/ui/title_bg_cotc.webp?v=50');
  uiImgCache('play_button.png','assets/ui/play_button.png?v=50');
  uiImgCache('doors_home.png','assets/ui/doors_home.webp?v=50');
  preloadImg('assets/sprites/catbase_idle.webp');
  // catbase.json feeds the walking-cat animation metadata
  fetch('assets/sprites/catbase.json',{cache:'no-cache'}).then(r=>r.json()).then(j=>{cbMeta=j;try{_cbMeta=j}catch(e){}}).catch(()=>{});
  // 2) manifest + stage data for priority planning (fetches overlap phase 1).
  // MANIFEST BARRIER: +1 unit that only completes when the full pool has been
  // registered — phase-1 (7 fast images) alone can never fill the bar (the old
  // pipeline let the bar hit 100% in ~2s while half a GB silently streamed).
  _pAdd(1);
  Promise.all([
    fetch('assets/sprites/sprites.json',{cache:'no-cache'}).then(r=>r.json()),
    fetch('assets/preload.json',{cache:'no-cache'}).then(r=>r.json())
  ]).then(([sp,lists])=>{
    window.__MANIFEST=sp;window.__LISTS=lists;
    startBackgroundPool(sp,lists);
  }).catch(()=>{_pDone(1);/* offline/dev: renderers lazy-load as before */});
  // safety valve: a stalled connection can never wedge the boot forever — after 90s
  // the bar eases to full and TAP TO START shows while remaining files keep streaming
  // (battles still gate on their own asset decodes). 90s (was 12s) because the pool is
  // now the FULL ~500MB, not just the menu set.
  setTimeout(finishPreload,90000);
}
function startBackgroundPool(sp,lists){
  if(_pool.started)return;_pool.started=true;
  PRELOAD.phase='background';
  const q1=[],q2=[],q3=[]; // priority buckets
  const seen=new Set();
  const add=(bucket,url)=>{if(seen.has(url))return;seen.add(url);bucket.push(url)};
  // BUCKET 1 — the actual first tap targets: deck cats (strips+icons)
  try{
    const deck=(SV&&SV.teams&&SV.teams[0]?SV.teams[0]:[]).filter(Boolean);
    if(!deck.length&&typeof CATMAP!=='undefined')Object.keys(CATMAP).slice(0,10).forEach(id=>deck.push(id));
    (sp.units?Object.keys(sp.units):[]).forEach(k=>{
      const [side,id]=k.split(':');
      const hot=(side==='cat'&&deck.indexOf(id)>=0);
      if(!hot)return;
      for(const f in sp.units[k].forms){const fm=sp.units[k].forms[f];
        for(const a of ['walk','atk','idle']){const en=fm[a];if(!en)continue;
          (Array.isArray(en.img)?en.img:[en.img]).forEach(img=>add(q1,'assets/sprites/'+img))}}
    });
  }catch(e){}
  /* BUCKET 2 — everything the roster/menu screens draw: ALL cat strips, every icon
     (cats + enemies — the guide/trophies draw those), the portrait atlas. */
  spriteUrlsFromManifest(sp,(k)=>k.split(':')[0]!=='enemy',true).forEach(u=>add(q2,u)); // strips+icons for menu side
  add(q2,'assets/sprites/ports.png');
  // BUCKET 3 — world art for the menu screens: ui images + the real Earth map
  (lists.ui||[]).forEach(n=>add(q3,'assets/ui/'+n+'?v=50'));
  add(q3,'assets/maps/eoc_map.png');
  // cat-base attack strips (idle is already phase-1) — the in-battle base attack anim
  ['catbase_a1.webp','catbase_a2.webp','catbase_a3.webp'].forEach(f=>add(q3,'assets/sprites/'+f));
  /* BUCKET 4 — r34 FULL PRELOAD (player mandate: "load all 500MB on startup"):
     the battle-only assets join the BOOT pool (after the menu-critical buckets so
     the first screens are always ready first). Enemy STRIPS, every battle bg and
     all castles — battles then open instantly since their gate finds everything
     decoded. window.__BATTLE_POOL is GONE (battlePoolStart is a safe no-op now). */
  const q4=[];
  spriteUrlsFromManifest(sp,(k)=>k.split(':')[0]==='enemy',false).forEach(u=>add(q4,u)); // enemy STRIPS
  (lists.maps||[]).forEach(n=>{if(n!=='eoc_map')add(q4,'assets/maps/'+n)});              // battle bgs
  (lists.castles||[]).forEach(n=>add(q4,'assets/'+n));                                   // enemy castles
  [...q1,...q2,...q3,...q4].forEach(poolAdd);
  _pDone(1); // manifest barrier complete — the FULL pool is registered (bar can fill for real)
  // audio decodes in parallel with images (suspended context decodes fine; tap resumes)
  // r34: boot decodes the ENTIRE soundtrack (menu + battle sets) — AudioPreloadBattle
  // finds everything baked and the battle gate passes instantly.
  try{AudioUnlockSilent()}catch(e){}
  try{AudioBakeProbe()}catch(e){}
  audioProgressBridge();
}
/* r34: audio decode progress feeds the SAME loading bar (each file = 1 unit, polled
   at 300ms — registrations and completions arrive as deltas). First tick is
   synchronous so registrations made by AudioBakeProbe count immediately. */
function audioProgressBridge(){
  let lastReg=0,lastDone=0;
  const tick=()=>{
    try{
      if(typeof AUDIO_PRELOAD==='undefined'){clearInterval(iv);return}
      const reg=AUDIO_PRELOAD.reg,done=AUDIO_PRELOAD.done;
      if(reg>lastReg){_pAdd(reg-lastReg);lastReg=reg}
      if(done>lastDone){_pDone(done-lastDone);lastDone=done}
      if(PRELOAD.ready&&done>=reg&&_pool.q.length===0&&_pool.active===0)clearInterval(iv);
    }catch(e){clearInterval(iv)}};
  const iv=setInterval(tick,300);
  tick();
}
/* r34: battle.js calls this on battle entry — the full pool is already loaded at
   boot, so this is a harmless no-op kept for call-site compatibility (it floats
   any still-streaming urls to the front if the boot pool somehow isn't finished). */
function battlePoolStart(priorityUrls){
  if(!priorityUrls||!priorityUrls.length){poolPump();return}
  const pri=new Set(priorityUrls);
  const hot=_pool.q.filter(u=>pri.has(u));
  if(hot.length){_pool.q=_pool.q.filter(u=>!pri.has(u));_pool.q=hot.concat(_pool.q)}
  poolPump();
}
/* r34: kept for call-site compatibility — with the full preload there is no
   separate battle pool to stop. */
function battlePoolStop(){}
/* ui images go through ui.js's cache so drawTitle/drawHome use the SAME objects */
function uiImgCache(name,url){
  _pAdd(1);
  const im=new Image();
  im.onload=()=>{_pDone(1);adoptRuntime(url,im)};
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
  const w=DW,h=DH;
  cx.fillStyle='#0d0d12';cx.fillRect(0,VOY>0?-VOY:0,w,VOY>0?DH:h);
  // official logo
  const logo=uiImg('title_logo.png');
  if(logo)cx.drawImage(logo,w/2-270,110,540,243);
  else{txt(cx,'THE BATTLE CATS',w/2,230,44,'#ffd94a','center')}
  // walking cat base (real animation)
  PRELOAD.walking+=dt;
  drawCatBaseWalk(w/2,470,110,PRELOAD.walking);
  // progress bar — the visual fill ALWAYS reaches 100% before READY/TAP shows.
  // (the 40s safety valve can declare readiness while a few slow requests are still
  // outstanding — the bar must never contradict the READY state, r30 report)
  const pRaw=PRELOAD.total?clamp(PRELOAD.done/PRELOAD.total,0,1):0;
  const pTgt=PRELOAD.ready?1:pRaw;
  // ease the visible fill toward its target so the bar visibly FINISHES rather than jumps
  PRELOAD.disp=PRELOAD.disp===undefined?pTgt:PRELOAD.disp+(pTgt-PRELOAD.disp)*Math.min(1,dt*4);
  if(PRELOAD.ready&&PRELOAD.disp>0.995)PRELOAD.disp=1;
  const p=PRELOAD.disp;
  const bw=460,bx=w/2-bw/2,by=520;
  cx.fillStyle='#242430';rr(cx,bx-3,by-3,bw+6,22,11);cx.fill();
  cx.fillStyle='#111118';rr(cx,bx,by,bw,16,8);cx.fill();
  if(p>0.01){cx.fillStyle='#ffd94a';rr(cx,bx,by,Math.max(14,bw*p),16,8);cx.fill();
    cx.fillStyle='rgba(255,255,255,.25)';rr(cx,bx,by,Math.max(14,bw*p),6,4);cx.fill()}
  const barDone=p>=0.999;
  const filesTxt=(PRELOAD.total>10&&!PRELOAD.ready)?' · '+Math.min(PRELOAD.done,PRELOAD.total)+' / '+PRELOAD.total:'';
  txt(cx,PRELOAD.ready?(barDone?'READY':'Now Loading... '+Math.round(p*100)+'%'):('Now Loading... '+Math.round(p*100)+'%'+filesTxt),w/2,by+42,17,'#e8dfc8','center');
  txt(cx,'The Battle Cats — Browser Version',w/2,h-26,12,'rgba(255,255,255,.35)','center');
  // READY + TAP TO START only once the bar has VISUALLY reached the end
  if(PRELOAD.ready&&barDone){
    // TAP TO START gate (browser audio needs a gesture — also how ports do it)
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
  cx.beginPath();cx.rect(0,0,DW,DH);cx.clip(); // design space fills the window at ANY aspect ratio
  cx.translate(0,VOY); // portrait: center the 720-tall content band (VOY=0 in landscape)
  if(!PRELOAD.ready){
    drawLoading(dt);
  }else if(!PRELOAD.tap){
    drawLoading(dt); // bar full — waiting for the tap (TAP TO START pulses)
    // any pointer down anywhere starts the game (registered by the canvas hit layer below)
  }else{
    const fn=SCREENS[G.screen]||drawTitle;
    try{fn(dt)}catch(err){console.error('SCREEN ERR',G.screen,err);cx.fillStyle='#300';cx.fillRect(-VOY,-VOY,DW,DH);txt(cx,'⚠ UI ERROR: '+err.message,DW/2,360,20,'#fff','center')}
    modalDraw();toastDraw(dt); // toasts render ABOVE modals (in-modal action feedback stays visible)
    // screen-change transition: quick fade-from-black on push()/pop() (official-style cut)
    if(G.transT>0){G.transT-=dt;const ta=clamp(G.transT/0.30,0,1);
      cx.fillStyle='rgba(18,10,6,'+(ta*ta*0.92).toFixed(3)+')';cx.fillRect(0,-VOY,DW,DH);
      if(G.transT<=0)G.transT=0}
  }
  /* r35 safety: if a screen left the save/restore stack unbalanced (the battle's stray
     restore bug did exactly that), re-assert the base transform AFTER the pop so the
     next frame always starts clean — a leaked stack must never compound across frames. */
  cx.restore();
  cx.setTransform(cv._dpr||1,0,0,cv._dpr||1,0,0);
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
