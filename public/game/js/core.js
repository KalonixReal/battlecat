'use strict';

'use strict';
/* =====================================================================================
   THE BATTLE CATS (single-file)
   Modules: UTIL · SAVE · DATA(CATS/ENEMIES) · CONTENT(chapters/stages/treasures/gacha)
            UI(immediate-mode canvas widgets/screens) · BATTLE(engine/traits/statuses/cannons)
            ART(line-art) · AUDIO
   ===================================================================================== */

/* ============================== UTIL ============================== */
const TAU=Math.PI*2, clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const rnd=(s)=>{let t=s>>>0;return()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296}};
const pick=(arr,r)=>arr[Math.floor(r()*arr.length)];
const fmt=n=>{n=Math.floor(n);return n>=1e9?(n/1e9).toFixed(2)+'B':n>=1e6?(n/1e6).toFixed(2)+'M':n.toLocaleString('en-US')};
const tstr=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const now=()=>Date.now();
const FONT=(px,w)=>`${w||400} ${px}px "Fredoka One","Trebuchet MS","Arial Rounded MT Bold",sans-serif`;
/* setFont: assigns a context font ONLY when the string actually changed — font parsing
   is one of the hottest Canvas2D costs at 60fps (txt() + measureText loops run dozens
   of times per frame). Every font assignment in the codebase goes through this. */
function setFont(c,f){if(c._bcf!==f){c.font=f;c._bcf=f}return f}
function txt(c,s,x,y,px,fill,align,strokeW,strokeC,w){setFont(c,FONT(px,w));c.textAlign=align||'left';c.textBaseline='middle';if(strokeW){c.lineWidth=strokeW;c.strokeStyle=strokeC||'#101018';c.lineJoin='round';c.strokeText(s,x,y)}c.fillStyle=fill||'#fff';c.fillText(s,x,y)}
/* lazyImg: THE single lazy-image loader (battle bgs / castles / cat-base strips / boot
   strips all used to hand-roll the same pattern — now every cache shares this one).
   Cache values: undefined = never requested, Image = in-flight or decoded. */
function lazyImg(cache,key,url){let im=cache[key];if(im===undefined){im=new Image();im.src=url;cache[key]=im}return im}
/* r31 ship-shrink: battle bgs + castles now ship as WebP (q85/q90 — benchmarked
   visually identical). Files that missed the 42dB PSNR bar stayed .jpg/.png;
   preload.json carries the exception tables (mapExt/castleExt) — default webp. */
function mapFileExt(n){const L=window.__LISTS;return (L&&L.mapExt&&L.mapExt[n])||'webp'}
function castleFileExt(n){const L=window.__LISTS;return (L&&L.castleExt&&L.castleExt[n])||'webp'}
/* imgReady: true once the image is fully decoded (safe to drawImage without pop-in) */
function imgReady(im){return !!im&&im.complete&&im.naturalWidth>0}
/* ===================== PORTS: official unit portraits & icons =====================
   One atlas (ports.png, 4096x4096) holds EVERY cat's official udi battle-card banner
   (512x128) and uni framed icon (128x128), cut straight from the APK for all 46 cats
   x 3 forms. One fetch, preloaded at boot, zero pop-in. Letter mapping f/c/s = form
   1st/2nd/3rd (same convention as the anim strips). */
const PORTS={img:null,meta:null};
(function(){
  fetch('assets/sprites/ports_atlas.json',{cache:'no-cache'}).then(r=>r.json())
    .then(j=>{PORTS.meta=j;if(!PORTS.img)PORTS.img=lazyImg(PORTS,'atlas','assets/sprites/ports.png')})
    .catch(()=>{});
})();
const PORT_FORM='fcs'; // form index 0/1/2 -> atlas letter (mirrors build-sprites 'fcs'[fi])
function portsReady(){return imgReady(PORTS.img)&&!!PORTS.meta}
function portsKey(kind,id,form){return kind+'_'+id+'_'+PORT_FORM[Math.max(0,Math.min(2,form|0))]}
/* drawPort: official portrait/icon. kind='udi'|'uni'. face=true crops the udi face
   (left ~45% — exactly the region the original battle cards show). mode='stretch'
   fills the box edge-to-edge (the original PowerUp card stretches the banner).
   Returns false if the atlas isn't decoded yet (caller falls back). */
function drawPort(c,kind,id,form,x,y,w,h,face,stretch){
  if(!portsReady())return false;
  const m=PORTS.meta[portsKey(kind,id,form)];if(!m)return false;
  let sx=m.x,sy=m.y,sw=m.w,sh=m.h;
  if(face)sw=Math.min(sw,Math.round(sh*1.8)); // face crop of the udi banner
  let dx=x,dy=y,dw=w,dh=h;
  if(!stretch){const sc=Math.min(w/sw,h/sh);dw=sw*sc;dh=sh*sc;dx=x+(w-dw)/2;dy=y+(h-dh)/2}
  c.save();c.imageSmoothingEnabled=true;
  c.drawImage(PORTS.img,sx,sy,sw,sh,dx,dy,dw,dh);
  c.restore();
  return true}
/* DPR_CAP: device-pixel-ratio ceiling — the PERF auto-tuner lowers it on weak systems
   (the single biggest perf lever; every pixel saved is 4x cheaper at DPR 1 vs 2) */
let DPR_CAP=2;
function rr(c,x,y,w,h,r){r=Math.min(r,h/2,w/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
const shade=(hex,f)=>{const n=parseInt(hex.slice(1),16);let r=(n>>16)&255,g=(n>>8)&255,b=n&255;r=clamp(Math.round(r*f),0,255);g=clamp(Math.round(g*f),0,255);b=clamp(Math.round(b*f),0,255);return`rgb(${r},${g},${b})`};

/* ============================== SAVE / META ============================== */
/* Builder C save block: schema v2 + migration chain (MIGRATIONS[ver] upgrades ver→ver+1),
   validation, deep shape/number normalization, hardened persist() (failure surfacing via
   SAVE_UNRELIABLE + SV.saveStats, 1-shot retry), and the import/export codecs
   (base64 clipboard code + wrapped v2 file JSON). regenEnergy/spendEnergy/addCF/addXP/
   rankOf/energyMax belong to Builder A — untouched below. */
const SAVE_KEY='battle-cats-save-v1', SAVE_KEY_LEGACY='bc_replica_full_v1', SAVE_KEY_BAK='battle-cats-save-v1.bak';
const SAVE_VER=2;
const DEF_SAVE={ver:2,created:now(),xp:1200,cf:300,tickets:{rare:1,gold:0,plat:0},np:20,
  energy:90,energyTs:now(),rank:1,xpTotal:1200,
  cats:{cat:{lv:1,plus:0},tank:{lv:1,plus:0}},np2:{},teams:[['cat','tank','','','','','','','',''],['','','','','','','','','',''],['','','','','','','','','','']],teamSel:0,
  cleared:{},crowns:{},treasures:{},fruit:{red:0,green:0,yellow:0,blue:0,purple:0,epic:0,ancient:0},
  cannons:{standard:{pwr:1,rch:1}},cannonSel:'standard',
  base:{wallet:1,worker:1,cpow:1,crch:1,bhp:1,research:1,account:1},
  bestiary:{},settings:{bgm:true,sfx:true},dupeXp:0,eventsDone:{},dojoBest:0,dojoBoard:[],
  expedition:{actives:[],scoutXP:0,runs:0,prestige:0},cmdName:'CAT COMMANDER',
  shrine:{day:'',freeUsed:false,todayN:0,total:0,megaN:0,pity:0,streak:0,lastPrayDay:'',lastId:'',lastBless:0,keeperName:''},
  trophies:{claimed:{},notified:{}},stats:{pulls:0,wins:0},
  dailyStreak:0,dailyLast:'',missions:{date:'',clear:0,pull:0,up:0,win:0,dep:0,exp:0,claimed:{}},
  gachaSteps:{},pendingPull:null,pendingBattle:null,saveStats:{writes:0,fails:0,lastWrite:0}};
let SV=null;
let SAVE_UNRELIABLE=false; // true while localStorage writes are failing (drawSettings shows a red banner)
/* ---- migration chain: MIGRATIONS[ver] upgrades an object FROM `ver` to ver+1 ---- */
const MIGRATIONS={
  1:o=>{ // v1 → v2: pending-transaction slots, write stats, container guards
    if(!o.eventsDone||typeof o.eventsDone!=='object'||Array.isArray(o.eventsDone))o.eventsDone={};
    if(!o.gachaSteps||typeof o.gachaSteps!=='object'||Array.isArray(o.gachaSteps))o.gachaSteps={};
    if(!Array.isArray(o.dojoBoard))o.dojoBoard=[];
    o.pendingPull=null;o.pendingBattle=null;
    o.saveStats={writes:0,fails:0,lastWrite:0};
    o.ver=2}};
function migrateSave(o){
  if(!o||typeof o!=='object'||Array.isArray(o))return o;
  let v=Math.floor(Number(o.ver));if(!isFinite(v)||v<1)v=1;
  while(v<SAVE_VER){
    const fn=MIGRATIONS[v];
    if(typeof fn==='function')fn(o);else o.ver=v+1; // unknown step: bump & continue
    const nv=Math.floor(Number(o.ver));
    if(!isFinite(nv)||nv<=v){o.ver=v+1;break} // guard: chain entry that never bumps ver
    v=nv}
  return o}
function validateSave(o){ // type-checks critical fields; returns null when corrupt (caller keeps the current save).
  // MISSING fields are fine (deep defaults fill them in — legacy v1 saves may predate a field);
  // only PRESENT-but-invalid values (wrong type / NaN / negative) mark the save as corrupt.
  if(!o||typeof o!=='object'||Array.isArray(o))return null;
  for(const k of['xp','cf','energy','rank']){
    if(o[k]===undefined||o[k]===null)continue;
    const v=Number(o[k]);if(!isFinite(v)||v<0)return null}
  if(o.cats!==undefined&&o.cats!==null){
    if(typeof o.cats!=='object'||Array.isArray(o.cats))return null;
    for(const id in o.cats){const c=o.cats[id];
      if(!c||typeof c!=='object'||Array.isArray(c))return null;
      if(!isFinite(Number(c.lv))||!isFinite(Number(c.plus)))return null}}
  if(o.teams!==undefined&&o.teams!==null){
    if(!Array.isArray(o.teams))return null;
    for(const t of o.teams){if(!Array.isArray(t))return null;for(const s of t)if(typeof s!=='string')return null}}
  return o}
function _svNormalize(o){ // shape/number hardening AFTER defaults-merge (unknown fields preserved)
  const num=(v,d)=>{const n=Number(v);return isFinite(n)?n:d};
  const objKeys=['cats','cannons','settings','eventsDone','gachaSteps','treasures','fruit','base','bestiary','missions','np2','tickets','cleared','crowns'];
  for(const k of objKeys)if(!o[k]||typeof o[k]!=='object'||Array.isArray(o[k]))o[k]=JSON.parse(JSON.stringify(DEF_SAVE[k]||{}));
  for(const k of['xp','cf','np','energy','rank','xpTotal','dupeXp','dojoBest','dailyStreak','teamSel','energyTs','created'])o[k]=num(o[k],DEF_SAVE[k]);
  for(const k of['xp','cf','np','energy'])if(o[k]<0)o[k]=0;
  o.rank=clamp(Math.floor(o.rank),1,999);
  if(!Array.isArray(o.teams))o.teams=JSON.parse(JSON.stringify(DEF_SAVE.teams)); // arrays not objects
  o.teams=o.teams.slice(0,3).map(t=>{const a=Array.isArray(t)?t.map(s=>String(s==null?'':s)):[];while(a.length<10)a.push('');return a.slice(0,10)});
  while(o.teams.length<3)o.teams.push(['','','','','','','','','','']);
  if(!o.cats.cat)o.cats.cat={lv:1,plus:0};if(!o.cats.tank)o.cats.tank={lv:1,plus:0};
  for(const id in o.cats){const c=o.cats[id]||{};const e={lv:clamp(Math.floor(num(c.lv,1)),1,50),plus:clamp(Math.floor(num(c.plus,0)),0,40)};
    for(let i=1;i<=3;i++)if(c['ev'+i])e['ev'+i]=true; // preserve explicit evolution flags (they ARE the form state)
    o.cats[id]=e}
  if(!Array.isArray(o.dojoBoard))o.dojoBoard=[];
  // expedition: {actives:[{dest,start,dur}×2], scoutXP, runs} — v2 (scout rank era)
  // v1 saves stored a single `active` object-or-null: migrate it into actives[0].
  if(!o.expedition||typeof o.expedition!=='object'||Array.isArray(o.expedition))o.expedition=JSON.parse(JSON.stringify(DEF_SAVE.expedition));
  const exo=o.expedition;
  if(!Array.isArray(exo.actives)){exo.actives=[];
    if(exo.active&&typeof exo.active==='object'&&!Array.isArray(exo.active)){
      const ea=exo.active;ea.dest=String(ea.dest||'');ea.start=num(ea.start,0);ea.dur=num(ea.dur,60);
      if(ea.dest&&ea.dur>0&&ea.dur<=86400&&ea.start>0&&ea.start<=now())exo.actives.push({dest:ea.dest,start:ea.start,dur:ea.dur})}
    delete exo.active}
  exo.actives=exo.actives.filter(a=>a&&typeof a==='object'&&!Array.isArray(a))
    .map(a=>({dest:String(a.dest||''),start:num(a.start,0),dur:num(a.dur,60)}))
    .filter(a=>a.dest&&a.dur>0&&a.dur<=86400&&a.start>0&&a.start<=now())
    .slice(0,2); // hard cap: max 2 concurrent trips (slot 2 unlocks at user Rank 30)
  exo.scoutXP=clamp(Math.floor(num(exo.scoutXP,0)),0,1e6);
  exo.runs=clamp(Math.floor(num(exo.runs,0)),0,1e6);
  exo.prestige=clamp(Math.floor(num(exo.prestige,0)),0,3); // prestige stars survive the XP reset
  // shrine: {day,freeUsed,todayN,total,megaN,pity,streak,lastPrayDay,lastId,lastBless} — daily counters + pity/streak
  if(!o.shrine||typeof o.shrine!=='object'||Array.isArray(o.shrine))o.shrine=JSON.parse(JSON.stringify(DEF_SAVE.shrine));
  const sho=o.shrine;
  if(typeof sho.day!=='string')sho.day='';
  sho.freeUsed=!!sho.freeUsed;
  for(const k of['todayN','total','megaN','lastBless'])sho[k]=clamp(Math.floor(num(sho[k],0)),0,1e6);
  sho.pity=clamp(Math.floor(num(sho.pity,0)),0,10);          // MEGA pity counter (gacha-style hard guarantee)
  sho.streak=clamp(Math.floor(num(sho.streak,0)),0,10);      // consecutive prayer days
  if(typeof sho.lastPrayDay!=='string')sho.lastPrayDay='';
  if(typeof sho.lastId!=='string')sho.lastId='';
  if(typeof sho.keeperName!=='string')sho.keeperName=''; // settings → shrine scene name sign (12-char everywhere)
  sho.keeperName=sho.keeperName.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,12);
  if(sho.day!==todayKey()){sho.freeUsed=false;sho.todayN=0} // stale day → reset counters (mirrors shrineInfo)
  // trophies: {claimed:{id:1}, notified:{id:1}} — progress is computed live, only flags persist
  if(!o.trophies||typeof o.trophies!=='object'||Array.isArray(o.trophies))o.trophies={claimed:{},notified:{}};
  for(const k of['claimed','notified']){if(!o.trophies[k]||typeof o.trophies[k]!=='object'||Array.isArray(o.trophies[k]))o.trophies[k]={};
    for(const tid in o.trophies[k])if(o.trophies[k][tid]!==1)delete o.trophies[k][tid]}
  // stats: cumulative counters not derivable from save shape (gacha pulls, battle wins)
  if(!o.stats||typeof o.stats!=='object'||Array.isArray(o.stats))o.stats={pulls:0,wins:0};
  o.stats.pulls=clamp(Math.floor(num(o.stats.pulls,0)),0,1e7);
  o.stats.wins=clamp(Math.floor(num(o.stats.wins,0)),0,1e7);
  if(typeof o.cmdName!=='string'||!o.cmdName.trim())o.cmdName='CAT COMMANDER';
  o.cmdName=o.cmdName.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,18)||'CAT COMMANDER';
  o.dojoBoard=o.dojoBoard.filter(e=>e&&typeof e==='object'&&isFinite(Number(e.s))).slice(0,5).map(e=>({s:Math.floor(num(e.s,0)),d:String(e.d||'')}));
  for(const fk in o.fruit)o.fruit[fk]=clamp(Math.floor(num(o.fruit[fk],0)),0,1e9);
  for(const ck in o.crowns){const cc=o.crowns[ck]; // crowns: {chapter:{stageIdx:1..3}} — hard-clamp each pip
    if(!cc||typeof cc!=='object'||Array.isArray(cc)){delete o.crowns[ck];continue}
    for(const sk in cc){const v=clamp(Math.floor(num(cc[sk],0)),0,3);if(v>0)cc[sk]=v;else delete cc[sk]}}
  for(const tk of['rare','gold','plat'])o.tickets[tk]=clamp(Math.floor(num(o.tickets[tk],0)),0,1e9);
  if(typeof o.cannonSel!=='string')o.cannonSel='standard';
  if(typeof o.dailyLast!=='string')o.dailyLast='';
  o.settings.bgm=!!o.settings.bgm;o.settings.sfx=!!o.settings.sfx;
  if(!o.saveStats||typeof o.saveStats!=='object'||Array.isArray(o.saveStats))o.saveStats={writes:0,fails:0,lastWrite:0};
  o.saveStats={writes:clamp(Math.floor(num(o.saveStats.writes,0)),0,1e12),fails:clamp(Math.floor(num(o.saveStats.fails,0)),0,1e12),lastWrite:num(o.saveStats.lastWrite,0)};
  o.pendingPull=(o.pendingPull&&typeof o.pendingPull==='object'&&!Array.isArray(o.pendingPull)&&Array.isArray(o.pendingPull.results)&&o.pendingPull.results.length&&o.pendingPull.results.every(x=>typeof x==='string'))
    ?{results:o.pendingPull.results.slice(),banner:String(o.pendingPull.banner||'rare'),ts:num(o.pendingPull.ts,0)}:null;
  o.pendingBattle=(o.pendingBattle&&typeof o.pendingBattle==='object'&&!Array.isArray(o.pendingBattle)&&typeof o.pendingBattle.ch==='string')
    ?{ch:String(o.pendingBattle.ch),idx:Math.floor(num(o.pendingBattle.idx,-1)),ts:num(o.pendingBattle.ts,0)}:null;
  if(Math.floor(num(o.ver,SAVE_VER))<SAVE_VER)o.ver=SAVE_VER; // never stamp a FUTURE ver backwards
  return o}
function _svAdopt(o,corrupt){ // shared load path: defaults-merge + normalize (used for primary AND backup)
  if(!corrupt&&o){SV=Object.assign(JSON.parse(JSON.stringify(DEF_SAVE)),o);_svNormalize(SV)}
  else{SV=JSON.parse(JSON.stringify(DEF_SAVE));
    if(corrupt&&typeof toast==='function')toast('Save data was corrupted — started a new save','#ff7a7a')}}
function loadSave(){
  let o=null,corrupt=false;
  try{let s=localStorage.getItem(SAVE_KEY);
    if(s==null){s=localStorage.getItem(SAVE_KEY_LEGACY);if(s!=null)localStorage.setItem(SAVE_KEY,s)} // one-time legacy key migration
    if(s!=null){ // a missing key = first boot: silent fresh default (a PRESENT but broken key = corrupt + toast)
      try{o=JSON.parse(s)}catch(e){o=null}
      if(!o||typeof o!=='object'||Array.isArray(o))corrupt=true;
      else if(!validateSave(o))corrupt=true; // validate → migrate (spec order)
      else migrateSave(o)}}
  catch(e){corrupt=true}
  if(corrupt){ // LAST-LINE SAFETY (r27): a truncated primary (mid-write crash, storage glitch)
    // must not vaporize a player's progress — fall back to the mirrored backup save.
    try{const b=localStorage.getItem(SAVE_KEY_BAK);
      if(b!=null){let bo=null;try{bo=JSON.parse(b)}catch(e){}
        if(bo&&typeof bo==='object'&&!Array.isArray(bo)&&validateSave(bo)){migrateSave(bo);o=bo;corrupt=false;
          if(typeof toast==='function')toast('Save restored from backup','#7fd0ff')}}
    }catch(e){}}
  _svAdopt(o,corrupt);
  regenEnergy()}
let _persistStreak=0,_persistToastShown=false,_persistRetry=null;
function persist(){
  try{
    if(!SV.saveStats||typeof SV.saveStats!=='object')SV.saveStats={writes:0,fails:0,lastWrite:0};
    localStorage.setItem(SAVE_KEY,JSON.stringify(SV));
    try{localStorage.setItem(SAVE_KEY_BAK,JSON.stringify(SV))}catch(e2){} // mirrored backup: a future truncated primary write recovers from here
    SV.saveStats.writes++;SV.saveStats.lastWrite=now();
    if(_persistStreak>0){_persistStreak=0;_persistToastShown=false} // failure streak ended
    SAVE_UNRELIABLE=false;
    return true}
  catch(e){ // quota/private-mode/etc: surface it (once per streak), count it, single 1s retry
    if(SV&&SV.saveStats)SV.saveStats.fails++;
    _persistStreak++;SAVE_UNRELIABLE=true;
    if(!_persistToastShown){_persistToastShown=true;if(typeof toast==='function')toast('⚠ Progress could not be saved!','#ff7a7a')}
    if(!_persistRetry)_persistRetry=setTimeout(()=>{_persistRetry=null;persist()},1000);
    return false}}
function persistNow(){return persist()} // explicit flush alias (boot.js keeps its 8s cadence; savesys.js flushes on hide/unload)
function regenEnergy(){const max=energyMax(),t=now();let e=SV.energy+Math.floor((t-SV.energyTs)/60000);if(e>=max){SV.energy=max;SV.energyTs=t}else{SV.energy=e;SV.energyTs=t-(t-SV.energyTs)%60000}} // partial regen must actually commit (was: only capped at max, energy never refilled below it)
function spendEnergy(n){if(SV.energy<n)return false;SV.energy-=n;persist();return true}
function addCF(n){SV.cf+=n;persist()}
function addXP(n){SV.xp+=n;SV.xpTotal+=n;const r=rankOf(SV.xpTotal);if(r>SV.rank){for(let k=SV.rank+1;k<=r;k++){if(k%5===0){SV.cf+=50;toast('USER RANK '+k+'! +50 Cat Food')}
    // rank-reward cats (Moneko @4, Neneko @12) — unlock automatically at the milestone
    const RU=CATS.filter(c=>c.unlock&&c.unlock.rank===k);
    for(const c of RU){if(!catOwned(c.id)){unlockCat(c.id);toast('RANK '+k+'! "'+c.forms[0].n+'" joined your army!','#7fd0ff')}}}
  SV.rank=r}else SV.rank=r;persist()}
function rankOf(xt){return clamp(Math.floor(Math.pow(xt/800,0.55))+1,1,999)}
/* ---- daily systems: login streak + daily missions ---- */
const todayKey=()=>new Date().toDateString();
function yesterKey(){const d=new Date();d.setDate(d.getDate()-1);return d.toDateString()}
function ensureMissions(){
  if(!SV.missions)SV.missions={date:'',clear:0,pull:0,up:0,win:0,dep:0,exp:0,claimed:{}};
  if(SV.missions.date!==todayKey()){SV.missions={date:todayKey(),clear:0,pull:0,up:0,win:0,dep:0,exp:0,claimed:{}};persist()}
  // login streak continuity (claimed flag lives in eventsDone via store screen)
  if(SV.dailyLast&&SV.dailyLast!==todayKey()&&SV.dailyLast!==yesterKey())SV.dailyStreak=0;
}
const MISSIONS=[
  {id:'clear',n:'Clear 2 stages',goal:2,cf:80,icon:'swords'},
  {id:'pull',n:'Summon from Gacha',goal:1,cf:50,icon:'capsule'},
  {id:'up',n:'Improve a Cat',goal:1,cf:50,icon:'up'},
  {id:'win',n:'Win 2 battles',goal:2,cf:60,icon:'medal'},
  {id:'dep',n:'Deploy 8 cats in battle',goal:8,cf:60,icon:'cat'},
  {id:'exp',n:'Complete 1 expedition',goal:1,cf:70,icon:'compass'}];
/* missions scale with User Rank: every 10 ranks the goals grow (+50%) and rewards keep up (+25%) */
function missionTier(){return Math.floor((SV.rank-1)/10)}
function missionGoal(m){return Math.ceil(m.goal*(1+missionTier()*0.5))}
function missionCF(m){return Math.round(m.cf*(1+missionTier()*0.25))}
function missionProg(id){return Math.min(SV.missions[id]||0,missionGoal(MISSIONS.find(m=>m.id===id)))}
function missionDone(id){return (SV.missions[id]||0)>=missionGoal(MISSIONS.find(m=>m.id===id))}
function missionClaimed(id){return !!SV.missions.claimed[id]}
function claimMission(id){const m=MISSIONS.find(m=>m.id===id);if(!missionDone(id)||missionClaimed(id))return false;
  const cf=missionCF(m);SV.missions.claimed[id]=true;SV.cf+=cf;persist();toast('MISSION COMPLETE! +'+cf+' CF','#7fe8a0');SFX.up();return true}
function energyMax(){return 90+Math.floor(SV.rank/4)*5+Math.floor(treasureMult('energy')*10-10)}
function exportSave(){return btoa(unescape(encodeURIComponent(JSON.stringify(SV))))} // clipboard code (legacy-compat base64)
function importSave(str){ // accepts: wrapped v2 file JSON ({app,v,data}), raw v1/v2 JSON, legacy base64 code.
  // NEVER mutates SV unless a fully valid candidate was produced (invalid → return false, progress preserved).
  if(typeof str!=='string')return false;
  const s=str.trim();if(!s)return false;
  let cand=null;
  try{const j=JSON.parse(s);
    if(j&&typeof j==='object'&&!Array.isArray(j)&&j.data&&typeof j.data==='object'&&!Array.isArray(j.data))cand=j.data; // wrapped v2 export
    else cand=j} // raw save JSON
  catch(e){cand=null}
  if(!cand){try{cand=JSON.parse(decodeURIComponent(escape(atob(s))))}catch(e){cand=null}} // legacy base64
  if(!cand||!validateSave(cand))return false;
  migrateSave(cand);
  const merged=Object.assign(JSON.parse(JSON.stringify(DEF_SAVE)),cand);
  _svNormalize(merged);
  SV=merged;regenEnergy();persist();
  return true}

