'use strict';
/* ============================== BATTLE ENGINE ============================== */
/* FIELD ORIENTATION (matches the original mobile game): the CAT BASE stands on the
   RIGHT edge and cats march LEFT toward the ENEMY BASE on the LEFT edge (per the
   Battle Cats wiki: "destroy the enemy base on the left side of the battlefield").
   The camera therefore starts at the RIGHT end (home base) and the front line
   advances leftward as the battle progresses. */
const FIELD_W=2600,ENEMY_BASE_X=120,CAT_BASE_X=FIELD_W-120,GROUND_Y=560;
const WALK_MUL=1.0; // official pacing: WALK_SPD (data.js) maps wiki SPD → px/s; no extra multiplier (parity with the original)
let B=null;
const WORKER_COST=[40,120,280,560,1000,1600,2400],WORKER_MUL=[1,1.35,1.7,2.1,2.6,3.2,3.9,4.7];
const WALLET_COST=[30,90,180,360,720,1440,2880],WALLET_MAX=[1,2,3,4,5,6,8,10];
function startBattle(st){
  const teamIds=SV.teams[SV.teamSel].filter(id=>id&&CATMAP[id]); // tolerate invalid ids (imported/hand-edited saves)
  const combo=comboBonuses(teamIds);
  const items=G.battleItems||{}; // classic battle items (original): Sniper the Cat / Cat Jobs / Cat CPU
  B={st,t:0,speed:1,paused:false,result:null,resultT:0,applied:false,
    wallet:Math.round(battleWalletMax()*0.4+combo.walletStart),walletLv:0,workerLv:0,
    units:[],pops:[],fx:[],waves:[],surges:[],queue:[],
    items,cpuT:0,continued:false,
    catBase:{hp:Math.round(st.catBaseHp*(1+0.3*(SV.base.bhp-1))),maxHp:Math.round(st.catBaseHp*(1+0.3*(SV.base.bhp-1))),x:CAT_BASE_X,alarm:0},
    enemyBase:{hp:st.baseHp,maxHp:st.baseHp,x:ENEMY_BASE_X,alarm:0},
    cam:FIELD_W-1280,camHold:0,camV:0,shake:0,warn:null,warnT:0,triggerDone:false,endlessK:0,endlessT:8,score:0,
    cannon:{t:0,charge:cannonChargeBase(),type:SV.cannonSel,fired:0},
    cds:{},teamIds,combo,dmgDealt:0,kills:0,
    treasureBase:((G.sessionTreasure&&Object.values(G.sessionTreasure).reduce((a,v)=>a+v,0))||0)}; // loot chip counts THIS battle's drops
  if(items.jobs){B.walletLv=7;B.workerLv=7;B.wallet=Math.round(battleWalletMax()*WALLET_MAX[7])} // CAT JOBS: worker cat starts at max (official item effect)
  if(items.cpu)B.cpuT=2; // CAT CPU arms its deploy ticker
  const tier=(typeof CHMAP!=='undefined'&&CHMAP[st.ch]&&CHMAP[st.ch].tier)||1;B.costMul=tier<=1?1:(tier===2?1.5:2); // official cost scaling: Ch2 x1.5, Ch3+ x2
  const wm=battleWalletMax()*WALLET_MAX[0];B.walletMax=battleWalletMax();
  teamIds.forEach(id=>B.cds[id]=0);
  // build spawn queue
  st.script.forEach(w=>{w.spawns.forEach(s=>{for(let k=0;k<s.count;k++)B.queue.push({t:w.t+k*s.interval,e:s.e})})});
  B.queue.sort((a,b)=>a.t-b.t);
  B.tint={eoc2:'rgba(255,72,40,.16)',eoc3:'rgba(24,22,44,.30)'}[st.ch]||null; // EoC Ch2 crimson / Ch3 shadow unit wash (original palette swap)
  G.onDrag=null;push('battle');
  AudioSetBgm(st.bgm||'eoc');
  SFX.start();
  toast(st.name+' — GO!','#ffd94a');
}
function spawnEnemy(eid,x0){
  const d=ENEMAP[eid];const mag=B.st.mag;
  const u={side:'enemy',def:d,id:eid,x:x0!==undefined?x0:ENEMY_BASE_X+70+Math.random()*30,y:0,
    hp:d.hp*mag.hp,maxHp:d.hp*mag.hp,atk:d.atk*mag.atk,rate:d.rate,range:d.range,speed:d.speed*WALK_SPD,kb:d.kb,
    rateT:0.5,state:'walk',animT:Math.random()*9,flash:0,kbT:0,kbDone:0,dieT:0,r:d.boss?46:22,
    st:{frozen:0,slow:0,weakenT:0,weakenP:1,curse:0},shieldHp:d.shield?d.shield.hp:0,reviveLeft:d.revive?d.revive.n:0,
    kbTaken:0,burrowUsed:false,reviveT:0,burrowDist:0,
    burrowing:0,dodge:d.dodge||null,dir:1,hitSet:null,spawnT:0.3,landT:0};
  B.units.push(u);
  if(!SV.bestiary[eid]){SV.bestiary[eid]=true;persist();toast('NEW ENEMY: '+d.n,'#ff9a6a')}
  return u}
function spawnCat(cid){
  const s=catStats(cid);const d=s.f;const cb=comboBonuses(B.teamIds);
  const u={side:'cat',def:d,id:cid,x:CAT_BASE_X-60-Math.random()*26,y:0,
    hp:Math.round(s.hp*(1+cb.hp)),maxHp:Math.round(s.hp*(1+cb.hp)),atk:Math.round(s.atk*(1+cb.atk)),rate:d.rate,range:d.range,
    speed:s.speed*(1+cb.spd),kb:d.kb,rateT:0.2,state:'walk',animT:Math.random()*9,flash:0,kbT:0,dieT:0,kbTaken:0,
    r:d.boss?40:20,st:{frozen:0,slow:0,weakenT:0,weakenP:1,curse:0},shieldHp:0,reviveLeft:0,dir:-1,
    abil:d.abil,area:d.area,traits:['cat'],hitSet:null,spawnT:0.35,landT:0};
  if(B.items&&B.items.sniper)u.atk=Math.round(u.atk*1.5),u.maxHp=u.hp=Math.round(u.hp*1.5); // SNIPER THE CAT: cats fight stronger (official item)
  B.units.push(u);SFX.deploy();B.fx.push({k:'deploy',x:u.x,t:0.4,y:0});
  if(SV.missions)SV.missions.dep=(SV.missions.dep||0)+1; // daily mission hook (deploys)
  return u}
function unitAtk(u){let a=u.atk;if(u.st.weakenT>0)a*=u.st.weakenP;
  const ab=u.side==='cat'?(u.abil||[]):(u.def.abil||[]);
  const str=ab.find(x=>x.a==='strengthen');
  if(str&&u.hp/u.maxHp<=0.5){ // STRENGTHEN: ATK up at half HP (original ability)
    if(!u.strOn){u.strOn=true;u.strPop=true}a*=1+(str.p||2)}
  return a}
function findTargets(u){
  const out=[];const dir=u.dir;const reach=u.range;
  const under=v=>v.burrowing>0||v.state==='burrow'||v.state==='revive'; // underground/reviving zombies are untargetable
  const opp=B.units.filter(v=>v.side!==u.side&&v.state!=='die'&&!under(v)&&!(v.state==='kb'));
  let best=null,bestD=1e9;
  for(const v of opp){const d=(v.x-u.x)*dir;if(d>-30&&d<=reach+v.r&&d<bestD){bestD=d;best=v}}
  const base=u.side==='cat'?B.enemyBase:B.catBase;
  const bd=(base.x-u.x)*dir;
  if(!best&&bd>-30&&bd<=reach+60)out.push({base:true,x:base.x,r:60,ref:base});
  if(best){out.push(best);
    if(u.area){for(const v of opp){if(v!==best){const d=(v.x-u.x)*dir;if(d>-30&&d<=reach+v.r)out.push(v)}}}}
  return out}
function srcAbils(src){return src&&!src.base?((src.side==='cat'?(src.abil||[]):(src.def?src.def.abil||[]:[]))):[]}
function applyDamage(src,tgt,dmg,o){o=o||{};
  if(tgt.base){const base=tgt.ref;if(base.hp<=0)return;
    let bd=dmg;
    if(srcAbils(src).find(x=>x.a==='base')){bd*=3;popTxt(base.x,GROUND_Y-165,'BASE DESTROYER!','#ff9a4a',15)} // Base Destroyer: x3 vs bases
    base.hp-=bd;base.alarm=0.5;B.shake=Math.max(B.shake,4);SFX.basehit();
    popTxt(base.x,GROUND_Y-140,Math.round(bd),'#fff');
    // trigger boss spawn
    if(!B.triggerDone&&B.st.trigger&&base.hp<=base.maxHp*B.st.trigger.onBase){B.triggerDone=true;
      B.st.trigger.spawn.forEach(s=>{for(let k=0;k<s.count;k++)spawnEnemy(s.e)});
      B.warn=B.st.trigger.warn;B.warnT=3.2;SFX.warn();
      if(B.st.shockwave){B.shake=14;SFX.shock();
        B.units.filter(v=>v.side==='cat').forEach(v=>{if((v.x-B.enemyBase.x)<500)startKb(v,130)})}
      B.queue.push({t:B.t+2,e:B.st.boss})}
    if(base.hp<=0){base.hp=0;endBattle(base===B.enemyBase)}
    return}
  const u=tgt;
  const dv=(u.side==='cat'?(u.abil||[]):(u.def.abil||[])).find(x=>x.a==='dodge');
  if(dv&&Math.random()<dv.p&&!o.noDodge){popTxt(u.x,GROUND_Y-70,'DODGE','#7fd0ff');return}
  let d=dmg;
  { // RESIST: target takes x0.25 damage from attackers whose traits match its resist filter (wiki Resistant)
    const at=src.base?[]:(src.side==='cat'?(src.traits||[]):(src.def?src.def.tr||[]:[]));
    const rab=(u.side==='cat'?(u.abil||[]):(u.def.abil||[])).find(x=>x.a==='resist');
    if(rab&&at.length&&rab.vs&&rab.vs.some(v=>at.includes(v))&&!(o.crit)){d*=0.25;popTxt(u.x,GROUND_Y-96-u.r,'RESIST','#bfe8a0')}
  }
  if(u.shieldHp>0){ // Aku shield: FULL block — only barrierBreak hits (or the Breakerblast cannon) shatter it; waves/surges deal 0
    if(srcAbils(src).find(x=>x.a==='barrierBreak')||o.breaker){
      u.shieldHp=0;popTxt(u.x,GROUND_Y-96,'SHIELD BREAK!','#ff7a6a');B.fx.push({k:'shieldbreak',x:u.x,t:0.5,y:0})}
    else{popTxt(u.x,GROUND_Y-70,'GUARD','#c46adf');SFX.guard();return}}
  if(u.traits&&u.traits.includes('metal'))d=o.crit?dmg:1; // Metal: 1 per non-crit hit; CRIT deals full ATK vs Metal (ignores Metal)
  else if(o.crit&&!o.isWave)d*=2; // wiki: Critical Hit = 200% damage; applied exactly ONCE (strike passes plain ATK); waves/surges never crit
  u.hp-=d;u.flash=0.12;
  /* IMPACT FX v2 — white starburst + radial sparks at the exact hit point (the
     original's punchy hit feedback: every strike reads as a committed contact) */
  B.fx.push({k:'impact',x:u.x,y:-70-u.r*0.6,t:0.26,big:d>=u.maxHp*0.25||o.crit,dir:(src&&src.x<u.x)?1:-1});
  popTxt(u.x,GROUND_Y-70-u.r,Math.round(d),o.crit?'#ffd94a':(u.side==='cat'?'#ff7a7a':'#fff'),o.crit?18:14);
  if(u.side==='enemy')B.dmgDealt+=d;
  if(u.hp<=0){
    if(u.side==='cat'&&!o.noDodge){const sv=(u.abil||[]).find(x=>x.a==='survive'); // wiki Survive a lethal strike: endure at 1 HP
      if(sv&&Math.random()<sv.p){u.hp=1;popTxt(u.x,GROUND_Y-96,'SURVIVED!','#ffd94a');SFX.up();return}}
    killUnit(u,src)}}
function killUnit(u,src){
  if(u.side==='enemy'&&u.reviveLeft>0){u.reviveLeft--;u.state='revive';u.reviveT=1.1; // REVIVE: sinks unhittable, re-emerges at the SAME x with pct HP
    SFX.burrow();return}
  u.state='die';u.dieT=0;
  if(u.side==='enemy'){const _wm=WALLET_MAX[Math.max(0,Math.min(7,B.walletLv))];B.wallet=Math.min(B.walletMax*_wm,(isFinite(B.wallet)?B.wallet:0)+u.def.money);B.kills++;
    B.fx.push({k:'poof',x:u.x,t:0.5,y:0});B.fx.push({k:'moneypop',x:u.x,t:0.7,y:0});SFX.edie();
    if(u.def.boss){B.shake=Math.max(B.shake,10);B.fx.push({k:'bossdie',x:u.x,t:1.2,y:0})}}
  else{B.fx.push({k:'poof',x:u.x,t:0.5,y:0});SFX.cdie()}}
function hasImm(u,k){return (u.side==='cat'?(u.abil||[]):(u.def.abil||[])).some(x=>x.a==='immune'&&x.extra===k)}
function startKb(u,dist,src){
  if(!u||u.state==='die'||u.state==='revive'||u.state==='burrow')return;
  if(hasImm(u,'kb')){popTxt(u.x,GROUND_Y-96-u.r,'IMMUNE','#bfe8a0');return}
  u.kbTaken=(u.kbTaken||0)+1;
  if(u.kbTaken>=u.kb){killUnit(u,src);return} // KB limit: the kb-th knockback destroys the unit instead of pushing
  u.state='kb';u.kbT=0.38;u.kbTotal=dist||90;
  u.kbFrom=u.x;u.rateT=0.3; // ORIGINAL RULE: being knocked back mid-attack RESETS the attack timer
  SFX.kb();B.fx.push({k:'impact',x:u.x,y:-90,t:0.26,big:true,dir:u.dir})}
function popTxt(x,y,s,col,big){B.pops.push({x:x+(Math.random()*16-8),y,s:String(s),col:col||'#fff',t:0.9,big:big||14,vy:-55})}
function applyAbilities(src,tgts,o){
  const abils=src.side==='cat'?(src.abil||[]):(src.def.abil||[]);
  if(src.st&&src.st.curse>0)return;
  for(const a of abils){
    for(const t of tgts){
      if(t.base)continue;
      const tt=t.traits||[];
      if(a.vs&&!a.vs.some(v=>tt.includes(v)))continue;
      const isCatTgt=t.side==='cat';
      const half=1; // status resist is now damage reduction x0.25 in applyDamage (wiki Resistant)
      switch(a.a){
        case 'kb':if(Math.random()<a.p)startKb(t,90,src);break;
        case 'freeze':if(Math.random()<a.p&&!hasImm(t,'freeze')){t.st.frozen=Math.max(t.st.frozen,(a.d||2)*half);popTxt(t.x,GROUND_Y-100,'FREEZE','#7fd0ff')}break;
        case 'slow':if(Math.random()<a.p&&!hasImm(t,'slow')){let dur=(a.d||3)*half;if(src.side==='cat')dur*=1+(B.combo.slow||0); // Hex Squad / Gorgon Guard combo bonus
          t.st.slow=Math.max(t.st.slow,dur);popTxt(t.x,GROUND_Y-100,'SLOW','#a0d8ff')}break;
        case 'weaken':if(Math.random()<a.p&&!hasImm(t,'weaken')){t.st.weakenT=Math.max(t.st.weakenT,(a.d||4)*half);t.st.weakenP=a.extra||0.5;popTxt(t.x,GROUND_Y-100,'WEAK','#e8a0ff')}break;
        case 'curse':if(Math.random()<a.p&&!hasImm(t,'curse')){t.st.curse=Math.max(t.st.curse,(a.d||3)*half);popTxt(t.x,GROUND_Y-100,'CURSE','#c46adf')}break;
        case 'warp':if(Math.random()<a.p&&!hasImm(t,'warp')){t.x=clamp(t.x-t.dir*(220+Math.random()*200),ENEMY_BASE_X+40,CAT_BASE_X-40);t.st.frozen=Math.max(t.st.frozen,0.6);popTxt(t.x,GROUND_Y-100,'WARP','#7fe8a0')}break;
        case 'toxic':if(Math.random()<a.p){const td=t.maxHp*(a.d||0.2);applyDamage(src,t,td,{noDodge:true,toxic:true});popTxt(t.x,GROUND_Y-120,'TOXIC','#a0ff88')}break;
        case 'dodge':case 'resist':case 'strengthen':break;
        case 'savage':case 'crit':case 'goodbye':break; // savage/crit roll in strike(); 'goodbye' (death explosion): intentionally not implemented — no-op
      }}
    if(a.a==='wave'&&!o.isWave&&Math.random()<a.p){B.waves.push({x:src.x+src.dir*30,dir:src.dir,dmg:unitAtk(src)*0.5,side:src.side,t:0,hit:new Set()});SFX.wave()}
    if(a.a==='surge'&&!o.isSurge&&Math.random()<a.p){for(let k=0;k<2;k++){const sx=src.x+src.dir*(80+Math.random()*a.d);B.surges.push({x:sx,t:1.2,dmg:unitAtk(src)*0.35,side:src.side,tick:0});}SFX.surge()}
  }}
function strike(u){
  const tgts=findTargets(u);if(!tgts.length)return false;
  const a=unitAtk(u);const ab=(u.abil||[]).concat(u.side==='enemy'?(u.def.abil||[]):[]);
  const crit=ab.find(x=>x.a==='crit');
  const isCrit=crit&&Math.random()<crit.p;
  const sav=ab.find(x=>x.a==='savage');
  tgts.forEach(t=>{
    if(t.base){applyDamage(u,t,a,{});return}
    let dmg=a,savHit=false;
    if(sav&&!isCrit){const tt=t.traits||[]; // SAVAGE: xN only vs matching traits (crit takes precedence; metal rule still applies inside applyDamage)
      if(!sav.vs||sav.vs.some(v=>tt.includes(v))){if(Math.random()<sav.p){dmg*=(sav.d||3);savHit=true}}}
    applyDamage(u,t,dmg,{crit:isCrit,savage:savHit}); // plain dmg — applyDamage applies the single x3 for crit
    if(savHit)popTxt(t.x,GROUND_Y-96-t.r,'SAVAGE','#ff9a4a',15)});
  applyAbilities(u,tgts,{});
  SFX.hit(u.side==='cat');
  B.fx.push({k:'slash',x:u.x+u.dir*(u.range>100?u.range*0.7:34),t:0.18,y:0,dir:u.dir,range:u.range});
  return true}
function updateUnit(u,dt){
  if(u.state==='die'){u.dieT+=dt;return}
  if(u.state==='wall')return;
  if(u.state==='revive'){ // ZOMBIE REVIVE: sunk underground (unhittable, not drawn standing), re-emerges at the SAME x
    u.reviveT-=dt;
    if(u.reviveT<=0){u.state='walk';u.hp=Math.round(u.maxHp*(u.def.revive?u.def.revive.pct:0.5));u.rateT=Math.max(u.rateT,0.3);
      popTxt(u.x,GROUND_Y-70,'REVIVE!','#8aa06a');B.fx.push({k:'dust',x:u.x,t:0.6,y:0})}
    return}
  if(u.state==='burrow'){ // ZOMBIE BURROW: travels underground toward the cat base (unhittable, invisible, untargetable)
    const sp=u.speed*2*WALK_MUL*dt;u.x+=u.dir*sp;u.burrowDist+=sp; // dir=+1 → digs rightward toward the CAT base
    if(u.burrowDist>=(u.def.burrow?u.def.burrow.d:0)||u.x>=CAT_BASE_X-60){
      u.x=clamp(u.x,ENEMY_BASE_X+60,CAT_BASE_X-60);u.state='walk';u.rateT=Math.max(u.rateT,0.2);
      popTxt(u.x,GROUND_Y-70,'BURROW!','#8aa06a');B.fx.push({k:'dust',x:u.x,t:0.6,y:0});SFX.burrow()}
    return}
  for(const k of ['frozen','slow','weakenT','curse'])if(u.st[k]>0)u.st[k]-=dt;
  if(u.flash>0)u.flash-=dt;
  if(u.landT>0)u.landT-=dt;
  if(u.spawnT>0)u.spawnT-=dt;
  if(u.strPop){u.strPop=false;popTxt(u.x,GROUND_Y-100-u.r,'STRENGTHEN!','#ff9a4a');SFX.up()}
  u.animT+=dt*(u.state==='walk'?1:0.55); // secondary motion (tail sway/blinks) keeps ticking, slower mid-attack
  if(u.state==='kb'){
    u.kbT-=dt;
    u.x=u.kbFrom-u.dir*u.kbTotal*(1-Math.pow(u.kbT/0.38,2));
    if(u.kbT<=0){u.state='walk';u.landT=0.18;B.fx.push({k:'dust',x:u.x,t:0.5,y:0})}
    return}
  if(u.st.frozen>0)return;
  u.rateT-=dt;
  // walls block
  const wall=B.units.find(v=>v.state==='wall'&&v.side!==u.side&&Math.abs(v.x-u.x)<30&&v.hp>0);
  /* ===== ATTACK FLOW (original Battle Cats timing) =====
     rateT<=0 & target in reach → WINDUP (foreswing: crouch back, weapon raises;
     unit cannot move — "cannot move or start another attack until the animation
     ends") → damage lands AT the lunge apex (strike frame) → BACKSWING (recoil
     settle). A whiff (target died mid-windup) still plays the full swing. */
  if(u.rateT<=0&&u.state==='walk'){
    // BURROW trigger: a burrowing zombie digs under instead of its first strike when a cat is in reach (once per spawn)
    if(u.side==='enemy'&&u.def.burrow&&!u.burrowUsed){
      const bg=findTargets(u);
      if(bg.some(t=>!t.base)){u.burrowUsed=true;u.state='burrow';u.burrowDist=0;
        B.fx.push({k:'dust',x:u.x,t:0.6,y:0});SFX.burrow();return}}
    if(findTargets(u).length){u.state='pre';u.preT0=Math.max(0.16,Math.min(0.42,u.rate*0.30));u.preT=u.preT0;u.rateT=99;return}}
  if(u.state==='pre'){ // FORESWING — damage lands when this expires
    u.preT-=dt;
    if(u.preT<=0){
      strike(u);                       // hit lands at the moment of the lunge apex
      u.state='post';u.postT0=Math.max(0.14,Math.min(0.4,u.rate*0.26));u.postT=u.postT0;u.rateT=u.rate}
    return}
  if(u.state==='post'){u.postT-=dt;if(u.postT<=0)u.state='walk';return}
  // walk (with slow) — official: hold position while a UNIT target is in attack range (base-only reach never stops movement)
  const spd=u.speed*(u.st.slow>0?0.5:1);
  const front=B.units.filter(v=>v.side===u.side&&v!==u&&v.state!=='die'&&v.burrowing<=0&&v.state!=='burrow'&&v.state!=='revive'&&(v.x-u.x)*u.dir>0&&(v.x-u.x)*u.dir<30).sort((a,b)=>(a.x-u.x)*u.dir-((b.x-u.x)*u.dir))[0];
  let halt=!!(wall||front);
  if(!halt){const tg=findTargets(u);if(tg.some(t=>!t.base))halt=true}
  u.halted=halt;
  if(halt)u.animT+=dt // halted units keep marching in place (original walk-in-place idle)
  else{u.x+=u.dir*spd*WALK_MUL*dt;u.animT+=dt} // walk frames play at their official authored timing (50ms/frame)
  u.x=clamp(u.x,ENEMY_BASE_X+30,CAT_BASE_X-30)}
function fireCannon(){
  if(B.result||B.paused)return; // pause freezes the field AND player actions
  const c=B.cannon;if(c.t>0)return;c.t=c.charge;c.fired++;
  const pw=1+0.25*(SV.base.cpow-1);
  const es=B.units.filter(v=>v.side==='enemy'&&v.state!=='die');
  B.shake=12;SFX.cannon();
  B.fx.push({k:'cannon',x:B.catBase.x,t:0.5,y:0});
  switch(c.type){
    case 'standard':es.forEach(v=>{applyDamage({side:'cat',abil:[]},v,15*pw,{noDodge:true});if(v.state!=='die')startKb(v,120)});break;
    case 'slow':es.forEach(v=>{v.st.slow=Math.max(v.st.slow,6*pw);popTxt(v.x,GROUND_Y-100,'SLOW','#a0d8ff')});
      B.fx.push({k:'slowbeam',x:CAT_BASE_X,t:1.3,y:0});SFX.beam&&SFX.beam();break;
    case 'ironwall':{const wx=clamp(B.cam+640,ENEMY_BASE_X+200,CAT_BASE_X-200);
      B.units.push({side:'cat',def:{n:'Iron Wall'},id:'__wall',x:wx,hp:Math.round(1400*pw*treasureMult('baseHp')),maxHp:Math.round(1400*pw*treasureMult('baseHp')),atk:0,rate:0,range:0,speed:0,kb:99,rateT:0,state:'wall',animT:0,flash:0,kbT:0,dieT:0,r:34,st:{frozen:0,slow:0,weakenT:0,weakenP:1,curse:0},shieldHp:0,reviveLeft:0,dir:1,hitSet:null});
      B.fx.push({k:'dust',x:wx,t:0.6,y:0});break}
    case 'thunder':es.forEach(v=>{v.st.frozen=Math.max(v.st.frozen,2.5);popTxt(v.x,GROUND_Y-100,'FREEZE','#7fd0ff')});
      {const pool=es.length?es:[{x:clamp(B.cam+640,ENEMY_BASE_X+200,CAT_BASE_X-200)}];
       for(let i=0;i<Math.min(5,pool.length+1);i++){const v=pool[i%pool.length];B.fx.push({k:'bolt',x:v.x+(Math.random()*40-20),t:0.45,y:0})}}
      SFX.thunder();break;
    case 'water':es.forEach(v=>{if(v.state!=='die')startKb(v,220*pw)});
      B.fx.push({k:'waterwave',x:CAT_BASE_X-60,t:1.0,y:0});SFX.wave();break;
    case 'holy':es.forEach(v=>{const fl=v.def.tr&&(v.def.tr.includes('floating')||v.def.tr.includes('angel'));applyDamage({side:'cat',abil:[]},v,fl?120*pw:12*pw,{noDodge:true});if(v.state!=='die'&&fl)startKb(v,90);
      B.fx.push({k:'holyblast',x:v.x,t:0.8,y:0})});
      if(!es.length)B.fx.push({k:'holyblast',x:clamp(B.cam+640,ENEMY_BASE_X+300,CAT_BASE_X-100),t:0.8,y:0});break;
    case 'breaker':es.forEach(v=>{applyDamage({side:'cat',abil:[{a:'barrierBreak',p:1,d:0,vs:null}]},v,20*pw,{noDodge:true}); // shatter + damage-through handled by applyDamage
      B.fx.push({k:'breaker',x:v.x,t:0.55,y:0})});
      B.fx.push({k:'breaker',x:clamp(B.cam+640,ENEMY_BASE_X+300,CAT_BASE_X-100),t:0.55,y:0});break;
  }}
function updateBattle(dt){
  if(B.result){B.resultT+=dt;
    B.pops.forEach(p=>{p.t-=dt;p.y+=p.vy*dt;p.vy+=60*dt});B.pops=B.pops.filter(p=>p.t>0);
    B.fx.forEach(f=>f.t-=dt);B.fx=B.fx.filter(f=>f.t>0);
    if(B.shake>0)B.shake=Math.max(0,B.shake-30*dt);
    return}
  const d=B.paused?0:dt*B.speed;B.t+=d;
  const Bn=B;
  // wallet
  const regen=battleRegen()*WORKER_MUL[Math.max(0,Math.min(WORKER_MUL.length-1,B.workerLv))];
  const _wmx=WALLET_MAX[Math.max(0,Math.min(7,Bn.walletLv))];
  Bn.wallet=Math.min(Bn.walletMax*_wmx,(isFinite(Bn.wallet)?Bn.wallet:0)+regen*d);
  // cooldowns
  for(const id in Bn.cds)Bn.cds[id]=Math.max(0,Bn.cds[id]-d);
  // cannon
  Bn.cannon.t=Math.max(0,Bn.cannon.t-d);
  // spawns
  Bn.queue=Bn.queue.filter(q=>{if(Bn.t>=q.t){spawnEnemy(q.e);return false}return true});
  // CAT CPU: auto-deploys the next ready team cat on a steady ticker (official item behavior)
  if(Bn.items&&Bn.items.cpu&&!Bn.result){Bn.cpuT-=d;
    if(Bn.cpuT<=0){const pick2=Bn.teamIds.find(id=>id&&(Bn.cds[id]||0)<=0&&(Bn.wallet>=catStats(id,undefined,Bn.costMul).cost));
      if(pick2){const cs=catStats(pick2,undefined,Bn.costMul);Bn.wallet-=cs.cost;Bn.cds[pick2]=cs.cd;spawnCat(pick2);Bn.cpuT=1.4}
      else Bn.cpuT=0.5}}
  // endless dojo
  if(Bn.st.endless&&Bn.t>=Bn.endlessT){Bn.endlessK++;Bn.score=Math.max(Bn.score,Bn.endlessK);Bn.endlessT=Bn.t+7;
    const pool=Bn.st.pool;const mag=1+Bn.endlessK*0.18;
    for(let k=0;k<2+Math.floor(Bn.endlessK/3);k++){const e=ENEMAP[pick(pool,Math.random)];if(!e.boss){const u=spawnEnemy(e.id);u.hp*=mag/Bn.st.mag.hp;u.maxHp=u.hp;u.atk*=mag/Bn.st.mag.atk}}
    if(Bn.endlessK%4===0){const e=ENEMAP[pick(pool.filter(p=>ENEMAP[p].boss),Math.random)];if(e){const u=spawnEnemy(e.id);u.hp*=mag/Bn.st.mag.hp;u.maxHp=u.hp;u.atk*=mag/Bn.st.mag.atk;Bn.warn='⚠ '+e.n.toUpperCase()+' GRADE '+(Bn.endlessK/4);Bn.warnT=3;SFX.warn()}}}
  // update units
  for(const u of Bn.units)updateUnit(u,d);
  Bn.units=Bn.units.filter(u=>!(u.state==='die'&&u.dieT>0.9));
  // waves
  Bn.waves=Bn.waves.filter(w=>{w.t+=d;w.x+=w.dir*420*d;
    const tgts=Bn.units.filter(v=>v.side!==w.side&&v.state!=='die'&&v.burrowing<=0&&v.state!=='burrow'&&v.state!=='revive'&&!w.hit.has(v)&&Math.abs(v.x-w.x)<46);
    tgts.forEach(v=>{w.hit.add(v);applyDamage({side:w.side,abil:[]},v,w.dmg,{noDodge:true,isWave:true})});
    const bx=w.side==='cat'?Bn.enemyBase.x:Bn.catBase.x;
    if(Math.abs(bx-w.x)<60){applyDamage({side:w.side,abil:[]},{base:true,x:bx,r:60,ref:w.side==='cat'?Bn.enemyBase:Bn.catBase},w.dmg,{isWave:true});return false}
    return w.t<3});
  // surges
  Bn.surges=Bn.surges.filter(s=>{s.t-=d;s.tick-=d;
    if(s.tick<=0&&s.t>0){s.tick=0.4;Bn.units.filter(v=>v.side!==s.side&&v.state!=='die'&&v.burrowing<=0&&v.state!=='burrow'&&v.state!=='revive'&&Math.abs(v.x-s.x)<60).forEach(v=>applyDamage({side:s.side,abil:[]},v,s.dmg,{noDodge:true,isSurge:true}))}
    return s.t>0});
  // fx
  Bn.fx.forEach(f=>f.t-=d);Bn.fx=Bn.fx.filter(f=>f.t>0);
  Bn.pops.forEach(p=>{p.t-=d;p.y+=p.vy*d;p.vy+=60*d});Bn.pops=Bn.pops.filter(p=>p.t>0);
  if(Bn.shake>0)Bn.shake=Math.max(0,Bn.shake-30*d);
  if(Bn.warnT>0)Bn.warnT-=d;
  Bn.catBase.alarm=Math.max(0,Bn.catBase.alarm-d);Bn.enemyBase.alarm=Math.max(0,Bn.enemyBase.alarm-d);
  /* ===== CAMERA (original behavior) =====
     The camera NEVER auto-follows — the player controls it by dragging (grab-the-
     world: the battlefield follows the finger) and releases with a fling that
     glides with friction, hard-clamped to the field bounds. The view starts at
     the home base (right end) and only moves when the player moves it. */
  if(G.flingCam&&!B.result){
    Bn.cam=clamp(Bn.cam-G.flingCam.v*dt,0,FIELD_W-1280); // grab-the-world: content follows the finger's release direction
    G.flingCam.v*=Math.pow(0.002,dt);
    if(Math.abs(G.flingCam.v)<40||Bn.cam<=0||Bn.cam>=FIELD_W-1280)G.flingCam=null}
  // wallet / worker / cannon buttons handled in UI
}
function endBattle(win){
  if(B.result)return;B.result=win?'win':'lose';B.resultT=0;
  if(G.modal)G.modal=null; // battle over: drop any open overlay (worker menu etc.) so the result screen is unblocked
  B.newRecord=!!(B.st.endless&&B.score>(SV.dojoBest||0)); // NEW RECORD flag captured BEFORE applyBattleResult updates the best (official result shows it above the Score band)
  if(win){SFX.win();B.fx.push({k:'baseboom',x:B.enemyBase.x,t:1.4,y:0});B.shake=16;
    // victory confetti: 42 streamers burst from the top, golds + pinks + whites (deterministic RNG)
    B.confetti=[];const R2=rnd((now()&0x7fffffff)>>>0);
    for(let i=0;i<42;i++)B.confetti.push({x:80+R2()*1120,y:-30-R2()*160,vx:(R2()-0.5)*40,vy:90+R2()*120,
      rot:R2()*TAU,vr:(R2()-0.5)*6,w:7+R2()*6,h:3+R2()*4,ph:R2()*TAU,
      col:['#ffd23f','#ff9ad5','#fdfdf8','#7fd0ff','#c46adf'][i%5]})}
  else{SFX.lose();B.fx.push({k:'baseboom',x:B.catBase.x,t:1.4,y:0});B.shake=16}}
/* endless dojo run ended: update local top-5, then fire-and-forget POST to the world
   ranking (/api/leaderboard — Prisma SQLite). failures are silent (offline = local only). */
function dojoRecordRun(){
  SV.dojoBoard=SV.dojoBoard||[];
  SV.dojoBoard.push({s:B.score,d:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})});
  SV.dojoBoard.sort((a,b)=>b.s-a.s);SV.dojoBoard=SV.dojoBoard.slice(0,5);
  if(B.score>(SV.dojoBest||0))SV.dojoBest=B.score;
  if(B.score>0&&B.newRecord){ // only post record-breaking runs — keeps the board meaningful
    try{
      fetch('/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:SV.cmdName||'CAT COMMANDER',score:B.score,stage:B.st.endless?'dojo':B.st.ch})})
        .then(r=>r.json()).then(j=>{if(j&&j.ok&&j.entry)B.worldRank=j.entry.score})
        .catch(()=>{});
    }catch(e){}}}
function applyBattleResult(){
  if(B.applied)return;B.applied=true;const st=B.st;
  const acc=1+0.15*(SV.base.account-1);
  // events carry a per-day identity (evtId): their first-clear state lives in eventsDone, NOT in the shared cleared.event['-1'] slot
  const isEv=st.ch==='event'&&st.evtId;
  if(B.result==='win'){
    const first=isEv?!SV.eventsDone['clr:'+st.evtId]:!(SV.cleared[st.ch]&&SV.cleared[st.ch][String(st.idx)]);
    B.firstClear=first;
    let xp=Math.round(st.reward.xp*acc*treasureMult('xp')*(1+(B.combo.xp||0))*(first?1:0.3));
    addXP(xp);B.rewardXP=xp;
    if(isEv){SV.eventsDone['clr:'+st.evtId]=1}
    else if(st.idx>=0){SV.cleared[st.ch]=SV.cleared[st.ch]||{};SV.cleared[st.ch][String(st.idx)]={xp}}
    if(first){
      if(st.reward.fruit){SV.fruit[st.reward.fruit]=(SV.fruit[st.reward.fruit]||0)+1;B.rewardFruit=st.reward.fruit}
      if(st.reward.cf){addCF(st.reward.cf);B.rewardCF=st.reward.cf}
      // event ticket
      if(st.reward.ticket&&Math.random()<0.5){SV.tickets.rare++;B.rewardTicket=true}
      // story unlocks of cats
      const unlockCatAt={eoc1:{2:'axe',5:'gross',8:'cow',12:'bird',16:'fish',21:'lizard',26:'titan',33:'boogie'},eoc2:{24:'liltank'},itf1:{12:'kungfu',48:'valkyrie'},eoc3:{24:'lilcat',48:'bahamut'},cotc1:{10:'rock'}};
      const m=unlockCatAt[st.ch];if(m&&m[st.idx+1]!==undefined){const id=m[st.idx+1];if(!catOwned(id)){unlockCat(id);B.rewardCat=id}}
      if(st.ch==='eoc1'&&st.idx===47&&!catOwned('mr')){unlockCat('mr');B.rewardCat='mr'}
    }
    // treasure roll — repeatable on every clear (original farming loop), chance scales with stage progress
    const c=CHMAP[st.ch];
    if(c&&CHSETS[st.ch]&&st.idx>=0){const setIdx=st.idx%9;const own=tCount(st.ch,setIdx);
      if(own<3){const p=treasureChance(st.ch,st.idx,own);if(Math.random()<p){SV.treasures[st.ch]=SV.treasures[st.ch]||{};const arr=SV.treasures[st.ch];arr[setIdx]=own+1;B.rewardTreasure={set:setIdx,tier:own};toast('TREASURE GET!','#ffd94a');
        G.sessionTreasure=G.sessionTreasure||{};const sk=st.ch+'|'+setIdx;G.sessionTreasure[sk]=(G.sessionTreasure[sk]||0)+1}}}
    // ===== CROWN SYSTEM (story chapters): protect your base to earn up to 3 crowns =====
    const cc=CHMAP[st.ch];
    if(cc&&cc.kind==='story'&&st.idx>=0){
      const hpRatio=B.catBase.hp/B.catBase.maxHp;
      const earned=hpRatio>=0.8?3:(hpRatio>=0.4?2:1);
      SV.crowns[st.ch]=SV.crowns[st.ch]||{};
      const prev=SV.crowns[st.ch][String(st.idx)]||0;
      if(earned>prev){SV.crowns[st.ch][String(st.idx)]=earned;
        B.crowns={earned,prev,improved:prev>0};
        if(earned===3)B.fx.push({k:'crown',x:640+B.cam,y:0,t:1.6})} // crown sparkle fx anchored to screen center
      else B.crowns={earned:prev,prev,improved:false};
      // full-3-crown chapter bonus: one-time 750 CF + big XP (tracked via eventsDone flags)
      const all3=(()=>{const cr=SV.crowns[st.ch]||{};for(let s2=0;s2<48;s2++)if((cr[String(s2)]||0)<3)return false;return true})();
      if(all3&&!SV.eventsDone['crown:'+st.ch]){
        SV.eventsDone['crown:'+st.ch]=1;addCF(750);addXP(25000);
        B.crownBonusCF=750;B.crownBonusXP=25000;
        toast('ALL CROWNS! Chapter bonus 750 Cat Food + 25,000 XP!','#ffd94a')}
      // ===== CROWN LADDER: every 24 crowns banked → milestone reward (repeating) =====
      let totalCr=0;for(const ck2 in SV.crowns)for(const sk2 in SV.crowns[ck2])totalCr+=SV.crowns[ck2][sk2];
      B.crownLadder=[];
      const goal2=24;
      const maxMile=Math.floor(totalCr/goal2);
      for(let m2=1;m2<=maxMile;m2++){
        if(SV.eventsDone['crownladder:'+m2])continue;
        SV.eventsDone['crownladder:'+m2]=1;
        addCF(30);addXP(3000);
        B.crownLadder.push({n:m2,cf:30,xp:3000});
        toast('CROWN LADDER M'+m2+'! +30 Cat Food +3,000 XP ('+totalCr+' crowns total)','#ffd94a');
        B.fx.push({k:'crown',x:640+B.cam,y:0,t:1.6})}}
    // endless dojo grading: the run score counts whether you survive or fall (local top-5 board)
    if(st.endless)dojoRecordRun();
    if(SV.missions)SV.missions.clear=(SV.missions.clear||0)+1; // daily mission hook
    if(SV.missions)SV.missions.win=(SV.missions.win||0)+1; // daily mission hook (wins)
    SV.stats.wins=(SV.stats.wins||0)+1; // lifetime wins (trophy/stat)
    persist();
    if(typeof trophyCheckAll==='function')trophyCheckAll();
  }else{
    if(st.endless)dojoRecordRun();
    persist()}
  AudioSetBgm(null)}
/* ---------- battle UI ---------- */
function drawBattle(dt){updateBattle(dt);
  const b=B;
  // (HUD drawn later fades out once a result is set — see end of this function)
  cx.save();
  const shx=b.shake?(Math.random()*2-1)*b.shake:0,shy=b.shake?(Math.random()*2-1)*b.shake:0;
  drawBattleBG(b,shx,shy);
  // world translate
  cx.save();cx.translate(shx-b.cam,shy);
  // bases
  drawBases(b);
  // units sorted
  const sorted=b.units.slice().sort((a,c)=>a.x-c.x);
  for(const u of sorted)drawUnit(u);
  // waves / surges / fx
  for(const w of b.waves){cx.save();cx.translate(w.x,GROUND_Y-40);cx.scale(w.dir,1);
    cx.strokeStyle=w.side==='cat'?'rgba(255,240,150,.9)':'rgba(255,150,150,.9)';cx.lineWidth=6;
    cx.beginPath();cx.arc(-10,0,34+Math.sin(w.t*30)*6,-1.2,1.2);cx.stroke();cx.restore()}
  for(const s of b.surges){cx.globalAlpha=clamp(s.t,0,1)*0.5;cx.fillStyle='#c46adf';cx.beginPath();cx.ellipse(s.x,GROUND_Y-6,54,14,0,0,TAU);cx.fill();cx.globalAlpha=1;
    cx.strokeStyle='rgba(255,255,255,.7)';cx.lineWidth=2;cx.beginPath();cx.ellipse(s.x,GROUND_Y-6,54*(0.5+0.5*Math.sin(G.t*10)),14,0,0,TAU);cx.stroke()}
  for(const f of b.fx)drawFx(f);
  cx.restore();
  // pops (screen space with cam)
  cx.save();cx.translate(shx-b.cam,shy);
  for(const p of b.pops){cx.globalAlpha=clamp(p.t*2,0,1);txt(cx,p.s,p.x,p.y,p.big,p.col,'center',4,'#101018',700);cx.globalAlpha=1}
  cx.restore();
  cx.restore();
  // HUD fades away under the result overlay (original clears the battle HUD on result)
  const hudA=b.result?clamp(1-b.resultT/0.45,0,1):1;
  if(hudA>0){cx.globalAlpha=hudA;drawBattleHUD(b,dt);cx.globalAlpha=1}
  if(b.paused&&!b.result){ // pause overlay (engine is frozen via d=0 in updateBattle)
    cx.fillStyle='rgba(8,10,18,.5)';cx.fillRect(0,0,1280,720);
    txt(cx,'PAUSED',640,316,42,'#fff','center',7,'#14141c',700);
    txt(cx,'tap \u25b6 to resume',640,368,16,'rgba(255,255,255,.8)','center',4,'#14141c',700)}
  if(b.warnT>0){cx.globalAlpha=clamp(b.warnT,0,1);txt(cx,b.warn,640,150,30,'#ff5a5a','center',6,'#201018',700);cx.globalAlpha=1}
  if(b.result)drawResult(b)}
function drawBattleBG(b,shx,shy){
  const th=b.st.bg;const grad=BG_THEMES[th]||BG_THEMES.grass;
  /* sky — 3-stop gradient + horizon haze band (depth) */
  const g=cx.createLinearGradient(0,0,0,720);
  g.addColorStop(0,grad.sky1);g.addColorStop(0.62,grad.sky2);g.addColorStop(1,grad.sky2);
  cx.fillStyle=g;cx.fillRect(0,0,1280,720);
  const hz=cx.createLinearGradient(0,GROUND_Y-150,0,GROUND_Y);
  hz.addColorStop(0,'rgba(255,255,255,0)');hz.addColorStop(1,'rgba(255,255,255,.14)');
  cx.fillStyle=hz;cx.fillRect(0,GROUND_Y-150,1280,150);
  /* sun with soft rotating rays (alive, not static) */
  cx.save();cx.translate(1100,90);
  cx.globalAlpha=0.16;cx.fillStyle=grad.sun;
  for(let i=0;i<10;i++){const a=i/10*TAU+G.t*0.06;
    cx.beginPath();cx.moveTo(0,0);cx.arc(0,0,74,a,a+0.19);cx.closePath();cx.fill()}
  cx.globalAlpha=0.28;cx.beginPath();cx.arc(0,0,52,0,TAU);cx.fill();
  cx.globalAlpha=1;cx.beginPath();cx.arc(0,0,38,0,TAU);cx.fill();
  if(th==='cosmos'){cx.fillStyle='rgba(255,255,255,.85)';
    for(let i=0;i<4;i++){const a=G.t*0.5+i*1.57;cx.beginPath();cx.arc(Math.cos(a)*54,Math.sin(a)*18,2.2,0,TAU);cx.fill()}}
  cx.restore();
  /* clouds — soft white puffs with a shaded underside (volumetric) */
  for(let i=0;i<7;i++){const cxp=((i*397+Math.sin(i*7)*60)-b.cam*0.25)%(1500)-150;
    const cy=60+((i*53)%120),cs=0.7+((i*29)%40)/100;
    cx.fillStyle='rgba(190,205,225,.5)';
    cx.beginPath();cx.arc(cxp,cy+7*cs,24*cs,0,TAU);cx.arc(cxp+32*cs,cy+3*cs,19*cs,0,TAU);cx.arc(cxp+58*cs,cy+8*cs,17*cs,0,TAU);cx.fill();
    cx.fillStyle='rgba(255,255,255,.9)';
    cx.beginPath();cx.arc(cxp,cy,23*cs,0,TAU);cx.arc(cxp+30*cs,cy-6*cs,19*cs,0,TAU);cx.arc(cxp+56*cs,cy,16*cs,0,TAU);cx.fill()}
  /* far mountains — two-tone silhouettes with rim highlights */
  for(let i=0;i<11;i++){let mx=((i*280)-b.cam*0.35)%3080;if(mx<-200)mx+=3080;const h=90+((i*97)%90);
    cx.fillStyle=grad.far;
    cx.beginPath();cx.moveTo(mx-170,GROUND_Y+4);cx.quadraticCurveTo(mx,GROUND_Y-h*1.9,mx+170,GROUND_Y+4);cx.closePath();cx.fill();
    cx.fillStyle='rgba(255,255,255,.20)';
    cx.beginPath();cx.moveTo(mx-38,GROUND_Y-h*1.42);cx.quadraticCurveTo(mx,GROUND_Y-h*1.9,mx+34,GROUND_Y-h*1.46);cx.quadraticCurveTo(mx+8,GROUND_Y-h*1.5,mx-12,GROUND_Y-h*1.36);cx.closePath();cx.fill()}
  /* mid layer — trees for grass/snow, towers for future/cosmos (parallax 0.6) */
  for(let i=0;i<9;i++){let mx=((i*340+120)-b.cam*0.6)%3060;if(mx<-200)mx+=3060;
    if(th==='future'||th==='cosmos'){
      cx.fillStyle=grad.mid;cx.fillRect(mx,360,40,200);cx.fillRect(mx+52,410,26,150);
      cx.fillStyle='rgba(255,255,255,.25)';
      for(let wy=0;wy<3;wy++)cx.fillRect(mx+6,375+wy*55,8,9);
      if((i*7)%3===0){cx.fillStyle='rgba(255,90,90,'+(0.5+0.4*Math.sin(G.t*3+i)).toFixed(2)+')';cx.beginPath();cx.arc(mx+20,352,3,0,TAU);cx.fill()}}
    else{ // round-crown trees: trunk + double canopy + sway
      const swy=Math.sin(G.t*0.8+i*1.9)*3;
      cx.fillStyle=shade(grad.mid,.55);cx.fillRect(mx-5,GROUND_Y-38,10,42);
      cx.fillStyle=grad.mid;
      cx.beginPath();cx.arc(mx+swy*0.4,GROUND_Y-58,34,0,TAU);cx.arc(mx-18+swy*0.3,GROUND_Y-44,22,0,TAU);cx.arc(mx+20+swy*0.5,GROUND_Y-46,24,0,TAU);cx.fill();
      cx.fillStyle='rgba(255,255,255,.16)';
      cx.beginPath();cx.arc(mx-9+swy*0.4,GROUND_Y-66,14,0,TAU);cx.arc(mx+11+swy*0.4,GROUND_Y-58,11,0,TAU);cx.fill()}}
  // Aku realm: drifting flame wisps rising from the ground (chapter atmosphere)
  if(th==='aku'){for(let i=0;i<6;i++){
    let wx=((i*430+40)-b.cam*0.5)%2700;if(wx<-100)wx+=2700;
    const wy=GROUND_Y-60-((i*97)%140)-Math.abs(Math.sin(G.t*0.9+i*1.7))*36;
    const fs=0.7+((i*37)%40)/100;
    cx.save();cx.translate(wx,wy);cx.globalAlpha=0.22+0.1*Math.sin(G.t*2.2+i*1.3);
    cx.fillStyle='#c46adf';cx.beginPath();cx.ellipse(0,0,15*fs,26*fs,Math.sin(G.t*1.5+i)*0.2,0,TAU);cx.fill();
    cx.fillStyle='#ff5a9a';cx.beginPath();cx.ellipse(0,7*fs,7.5*fs,14*fs,0,0,TAU);cx.fill();
    cx.restore()}}
  /* butterflies / drifting leaves — grass chapters get ambient life */
  if(th==='grass'||th==='snow'||th==='event'){for(let i=0;i<5;i++){
    let lx=((i*517+90)-b.cam*0.8)%2560;if(lx<-60)lx+=2560;
    const ly=200+((i*131)%210)+Math.sin(G.t*1.3+i*2.1)*26;
    const fl=0.85+0.15*Math.sin(G.t*6+i*2);
    cx.save();cx.translate(lx,ly);cx.globalAlpha=0.75;
    cx.fillStyle=th==='snow'?'rgba(255,255,255,.9)':['#ffd94a','#ff9a5a','#a8e8ff'][i%3];
    cx.scale(fl,1);
    cx.beginPath();cx.ellipse(-4,-2,5,3.5,-0.6,0,TAU);cx.ellipse(4,-2,5,3.5,0.6,0,TAU);cx.fill();
    cx.restore()}}
  /* ground — top lip highlight + base fill + rolling texture */
  cx.fillStyle=grad.ground;cx.fillRect(0,GROUND_Y,1280,720-GROUND_Y);
  cx.fillStyle=grad.ground2;cx.fillRect(0,GROUND_Y,1280,8);
  cx.fillStyle='rgba(255,255,255,.10)';cx.fillRect(0,GROUND_Y,1280,2);
  // perspective stripes (camera-speed cue)
  cx.strokeStyle=grad.ground3;cx.lineWidth=2;
  for(let i=0;i<42;i++){const gx=((i*64)-b.cam)%(42*64);cx.beginPath();cx.moveTo(gx,GROUND_Y+14);cx.lineTo(gx+22,GROUND_Y+30);cx.stroke()}
  // grass tufts + flowers / pebbles scattered on the near band
  for(let i=0;i<26;i++){let fx=((i*173+50)-b.cam)%4150;if(fx<-40)fx+=4150;
    const fy=GROUND_Y+18+((i*61)%56);
    if((i*13)%4===0){ // flower: stem + colored head
      cx.strokeStyle=shade(grad.ground,.6);cx.lineWidth=2;cx.beginPath();cx.moveTo(fx,fy+8);cx.lineTo(fx,fy-2);cx.stroke();
      const fc=['#ffd94a','#ff8a9a','#a8e8ff'][i%3];
      cx.fillStyle=fc;for(let p=0;p<5;p++){const a=p/5*TAU;cx.beginPath();cx.arc(fx+Math.cos(a)*3.4,fy-4+Math.sin(a)*3.4,2.3,0,TAU);cx.fill()}
      cx.fillStyle='#e88a2a';cx.beginPath();cx.arc(fx,fy-4,2,0,TAU);cx.fill()}
    else if((i*7)%3===0){ // pebble
      cx.fillStyle='rgba(0,0,0,.14)';cx.beginPath();cx.ellipse(fx,fy,4.5,2.6,0,0,TAU);cx.fill();
      cx.fillStyle='rgba(255,255,255,.22)';cx.beginPath();cx.ellipse(fx-1,fy-1,2.2,1.2,0,0,TAU);cx.fill()}
    else{ // grass tuft
      cx.strokeStyle=shade(grad.ground,.72);cx.lineWidth=2;cx.lineCap='round';
      cx.beginPath();cx.moveTo(fx,fy+7);cx.quadraticCurveTo(fx-3,fy-1,fx-5,fy-6);
      cx.moveTo(fx,fy+7);cx.quadraticCurveTo(fx+1,fy-2,fx+1,fy-8);
      cx.moveTo(fx,fy+7);cx.quadraticCurveTo(fx+4,fy,fx+6,fy-5);cx.stroke()}}
}
const BG_THEMES={grass:{sky1:'#bfe8ff',sky2:'#e8ffd0',sun:'#ffe66a',far:'#8fbf6a',mid:'#6aa04e',ground:'#5a9e3f',ground2:'#4a8a33',ground3:'rgba(0,0,0,.12)'},
 desert:{sky1:'#ffe0a8',sky2:'#ffefc8',sun:'#ff9a4a',far:'#d8a86a',mid:'#c09050',ground:'#e0b070',ground2:'#c89858',ground3:'rgba(120,80,40,.2)'},
 snow:{sky1:'#cfe4f8',sky2:'#eef6ff',sun:'#fff',far:'#a8c0dc',mid:'#c8dcec',ground:'#e8f2fc',ground2:'#d0e2f4',ground3:'rgba(140,170,200,.25)'},
 future:{sky1:'#1a2340',sky2:'#3a2a55',sun:'#ff6ad5',far:'#2a3a6a',mid:'#3a4a7a',ground:'#2a3450',ground2:'#3a4a6a',ground3:'rgba(120,200,255,.25)'},
 cosmos:{sky1:'#0a0a28',sky2:'#221148',sun:'#ffd94a',far:'#22184a',mid:'#332560',ground:'#2a2050',ground2:'#3a2c68',ground3:'rgba(200,150,255,.3)'},
 aku:{sky1:'#2a0a2a',sky2:'#4a1038',sun:'#ff4a6a',far:'#3a1030',mid:'#551a40',ground:'#3a1430',ground2:'#501e42',ground3:'rgba(255,100,180,.2)'},
 dojo:{sky1:'#2a2418',sky2:'#4a4030',sun:'#ffd94a',far:'#3a3428',mid:'#554a38',ground:'#4a4030',ground2:'#5c503c',ground3:'rgba(0,0,0,.2)'},
 event:{sky1:'#ffd0e8',sky2:'#fff0c8',sun:'#ffd94a',far:'#e8a0c8',mid:'#d890b8',ground:'#c8a0d8',ground2:'#b088c8',ground3:'rgba(120,60,120,.2)'}};
function cloudDraw(x,y,s){cx.beginPath();cx.arc(x,y,18*s,0,TAU);cx.arc(x+20*s,y-8*s,14*s,0,TAU);cx.arc(x+38*s,y,16*s,0,TAU);cx.fill()}
function drawBases(b){
  // cat base (left)
  const cb=b.catBase;cx.save();cx.translate(cb.x,GROUND_Y);
  const alm=cb.alarm>0;cx.translate(0,Math.sin(G.t*30)*(alm?3:0));
  // alarm-state flash: warm rim light around the cat base while it takes hits
  if(alm){const pl=0.5+0.5*Math.sin(G.t*12);
    cx.save();cx.globalAlpha=0.20+pl*0.18;
    cx.fillStyle='#ff8a5a';cx.beginPath();cx.ellipse(0,-95,95,115,0,0,TAU);cx.fill();cx.restore()}
  cx.fillStyle=alm?'#ff8a8a':'#8a94a8';cx.fillRect(-64,-30,128,32); // platform
  cx.fillStyle=alm?'#ffb0b0':'#a8b2c6';cx.fillRect(-52,-90,104,60); // body
  cx.fillStyle=alm?'#ffdddd':'#f4f2ea';cx.fillRect(-40,-150,80,60);
  // iconic cat face on base
  cx.save();cx.translate(0,-120);
  cx.fillStyle=alm?'#ffb8b8':'#fff';cx.strokeStyle='#22262f';cx.lineWidth=3;
  [[-1,0],[1,0]].forEach(([sx])=>{cx.beginPath();cx.moveTo(sx*16,-14);cx.lineTo(sx*12,-30);cx.lineTo(sx*4,-19);cx.closePath();cx.fill();cx.stroke()});
  cx.beginPath();cx.arc(0,0,19,0,TAU);cx.fill();cx.stroke();
  cx.fillStyle='#22262f';cx.beginPath();cx.arc(-7,-3,2.4,0,TAU);cx.arc(7,-3,2.4,0,TAU);cx.fill();
  cx.lineWidth=2.4;cx.beginPath();cx.moveTo(-6,7);cx.quadraticCurveTo(-3,12,0,8);cx.quadraticCurveTo(3,12,6,7);cx.stroke();
  cx.restore();
  // flag
  cx.strokeStyle='#5a6478';cx.lineWidth=4;cx.beginPath();cx.moveTo(0,-150);cx.lineTo(0,-190);cx.stroke();
  cx.fillStyle='#ffd94a';cx.beginPath();cx.moveTo(0,-190);cx.lineTo(34+Math.sin(G.t*4)*4,-182);cx.lineTo(0,-172);cx.fill();
  // cannon barrel — points LEFT toward the enemy base (home base stands on the RIGHT)
  cx.fillStyle='#3a3f4e';cx.fillRect(-40,-168,44,14);
  cx.fillStyle='#5a6478';cx.fillRect(-40,-168,44,4);
  cx.fillStyle='#22262f';cx.beginPath();cx.arc(-38,-161,8,0,TAU);cx.fill();
  cx.fillStyle='#3a3f4e';cx.fillRect(-12,-176,26,20);
  cx.restore();
  // hp bar
  baseBar(cb.x,GROUND_Y-215,cb.hp,cb.maxHp,'#7fe8a0');
  // enemy base (right)
  const eb=b.enemyBase;cx.save();cx.translate(eb.x,GROUND_Y);
  const ealm=eb.alarm>0;
  // alarm-state aura: pulsing red glow behind the fortress when under attack
  if(ealm){const pl=0.5+0.5*Math.sin(G.t*12);
    cx.save();cx.globalAlpha=0.30+pl*0.22;
    cx.fillStyle='#ff5a5a';cx.beginPath();cx.ellipse(0,-100,110,130,0,0,TAU);cx.fill();cx.restore()}
  cx.fillStyle='#4a3848';cx.fillRect(-70,-36,140,38);
  cx.fillStyle='#5a4658';cx.fillRect(-56,-140,112,104);
  cx.fillStyle='#4a3848';cx.beginPath();cx.moveTo(-66,-140);cx.lineTo(0,-205);cx.lineTo(66,-140);cx.fill();
  cx.fillStyle='#2a1e28';cx.fillRect(-16,-60,32,60);
  cx.fillStyle='#6a5468';cx.beginPath();cx.arc(0,-172,16,0,TAU);cx.fill();
  cx.fillStyle='#ff5a5a';cx.beginPath();cx.arc(-6,-174,3,0,TAU);cx.arc(6,-174,3,0,TAU);cx.fill();
  cx.restore();
  baseBar(eb.x,GROUND_Y-230,eb.hp,eb.maxHp,'#ff7a7a');
}
function baseBar(x,y,hp,max,col){if(hp>=max&&x!==B.enemyBase.x&&x!==B.catBase.x)return;
  const w=120;cx.fillStyle='rgba(10,10,16,.6)';rr(cx,x-w/2-2,y-2,w+4,12,6);cx.fill();
  cx.fillStyle='rgba(255,255,255,.2)';rr(cx,x-w/2,y,w,8,4);cx.fill();
  cx.fillStyle=col;rr(cx,x-w/2,y,w*clamp(hp/max,0,1),8,4);cx.fill()}
function drawUnit(u){
  if(u.state==='burrow'||u.state==='revive'){ // underground: draw only a dirt mound (not standing) — minimal draw-side edit for engine states
    cx.save();cx.translate(u.x,GROUND_Y);
    cx.fillStyle='rgba(88,66,38,.85)';cx.beginPath();cx.ellipse(0,-4,26,9,0,0,TAU);cx.fill();
    cx.fillStyle='rgba(58,44,24,.9)';cx.beginPath();cx.ellipse(0,-7,14,5,0,0,TAU);cx.fill();
    // dirt crumb trail while burrowing
    for(let i=0;i<3;i++){const cp=(G.t*2+i*0.33)%1;cx.globalAlpha=(1-cp)*0.6;
      cx.fillStyle='#6a5230';cx.beginPath();cx.arc(-u.dir*cp*22,-6-Math.abs(Math.sin(cp*9))*8,2.4,0,TAU);cx.fill()}
    cx.restore();return}
  /* ===== LIVE ANIMATION TRANSFORM PIPELINE (applied around the baked sprite) =====
     bake = body pose only (walk/idle/windup/strike frames); all positional juice —
     spawn pop-in, hit squash, kb tumble arc, landing squash, death spin — is a live
     transform so it stays smooth at 60fps and composes with every unit painter. */
  const dieP=u.state==='die'?clamp(u.dieT/0.55,0,1):0;   // death: fast spin+shrink phase, then fade-out drift
  const dieFade=u.state==='die'?clamp((u.dieT-0.55)/0.35,0,1):0;
  const kbP=u.state==='kb'?1-u.kbT/0.38:0;               // knockback: parabolic tumble arc
  const kbY=u.state==='kb'?-Math.sin(kbP*Math.PI)*46:0;
  const kbRot=u.state==='kb'?-u.dir*kbP*3.4:0;           // tumble back over the arc (full head-over-heels spin, original style)
  const spn=u.spawnT>0?1-u.spawnT/(u.side==='cat'?0.35:0.3):1;
  const pop=spn<1?1+Math.sin(Math.min(1,spn)*Math.PI)*0.16:1; // spawn overshoot bounce
  const lsq=u.landT>0?u.landT/0.18:0;                    // landing squash (widescreen pancake)
  const hsq=u.flash>0?u.flash/0.12:0;                    // fresh-hit micro squash
  const y=GROUND_Y+kbY-(dieFade>0?dieFade*26:0);
  // soft ground shadow (depth cue — skips dying fade / walls; shrinks while airborne)
  if(u.state!=='die'&&u.state!=='wall'){
    const air=kbY<-4?0.55:1;const sh=clamp(air*(1-(u.state==='kb'?Math.sin((1-u.kbT/0.38)*Math.PI)*0.4:0)),0.5,1);
    cx.fillStyle='rgba(20,16,10,'+(0.22*sh).toFixed(3)+')';
    cx.beginPath();cx.ellipse(u.x,GROUND_Y-3,u.r*0.85*sh,4.2*sh,0,0,TAU);cx.fill()}
  cx.save();cx.translate(u.x,y);
  // death: spin + fly back + shrink (first half), then drift up while fading
  if(u.state==='die'){cx.globalAlpha=1-dieFade;cx.translate(-u.dir*dieP*14,dieP*10);cx.rotate(-u.dir*dieP*2.6);const ds=1-dieP*0.38;cx.scale(ds,ds)}
  // spawn pop-in: scale from 0 with a bouncy overshoot
  if(spn<1){const se=0.55+spn*0.45;cx.scale(spn<0.15?spn/0.15*0.55:se*pop,spn<0.15?spn/0.15*0.55:se*pop)}
  // knockback tumble rotation (arc offset handled by kbY above)
  if(u.state==='kb')cx.rotate(kbRot);
  // landing squash / hit micro-squash (compose both)
  if(lsq>0||hsq>0){const w=1+lsq*0.28+hsq*0.08,h=1-lsq*0.22-hsq*0.10;cx.scale(w,h)}
  const e={anim:u.state==='pre'?'windup':(u.state==='post'?'attack':(u.state==='kb'?'idle':'walk')),
    animT:u.animT,idle:u.halted&&u.state==='walk',atkT:u.state==='pre'?1-u.preT/(u.preT0||0.3):(u.state==='post'?1-u.postT/(u.postT0||0.25):0),
    flash:u.flash>0,frozen:u.st.frozen>0,weak:u.st.weakenT>0,curse:u.st.curse>0,slow:u.st.slow>0,r:u.r,boss:u.side==='enemy'&&u.def.boss};
  if(u.state==='wall'){cx.fillStyle='#8a94a8';rr(cx,-26,-70,52,70,8);cx.fill();cx.strokeStyle='#5a6478';cx.lineWidth=3;rr(cx,-26,-70,52,70,8);cx.stroke();cx.fillStyle='#6a7488';for(let i=0;i<3;i++)cx.fillRect(-20+i*16,-62,10,54)}
  else if(u.side==='cat')ART.cat({id:u.id,x:0,y:0,s:1,t:u.animT,dir:u.dir,e});
  else ART.enemy({id:u.id,x:0,y:0,s:1,t:u.animT,dir:u.dir,e,u,tint:B.tint});
  /* hit-blink is applied INSIDE the sprite/painter renderers (per-pixel white of the
     unit's own pixels, like the original) — a main-canvas fillRect here would paint a
     white BOX over the background (source-atop composites against everything). */
  cx.restore();
  if(u.state==='die'&&dieFade>0){ // death poof ring + rising motes
    cx.globalAlpha=dieFade*0.8;cx.strokeStyle='#fff';cx.lineWidth=2.5;
    cx.beginPath();cx.ellipse(u.x,GROUND_Y-14,20+dieFade*26,8+dieFade*10,0,0,TAU);cx.stroke();cx.globalAlpha=1}
  if(e.frozen){cx.fillStyle='rgba(140,220,255,.45)';cx.beginPath();cx.arc(u.x,y-30,u.r+12,0,TAU);cx.fill();cx.strokeStyle='#bfeaff';cx.stroke()}
  // hp bar (damaged only)
  if(u.hp<u.maxHp&&u.state!=='die'){const w=u.def&&u.def.boss?70:36;
    cx.fillStyle='rgba(10,10,16,.6)';rr(cx,u.x-w/2-1,y-u.r*2.4-7,w+2,7,3);cx.fill();
    cx.fillStyle=u.side==='cat'?'#7fe8a0':'#ff7a7a';rr(cx,u.x-w/2,y-u.r*2.4-6,w*clamp(u.hp/u.maxHp,0,1),5,2.5);cx.fill()}
  // status icons
  if(u.state!=='die'){let sx=u.x-(u.st.frozen>0)+(u.st.slow>0?12:0);
    const icons=[];if(u.st.frozen>0)icons.push(['❄','#7fd0ff']);if(u.st.slow>0)icons.push(['⏱','#a0d8ff']);if(u.st.weakenT>0)icons.push(['↓','#e8a0ff']);if(u.st.curse>0)icons.push(['☾','#c46adf']);
    icons.forEach((ic,i)=>txt(cx,ic[0],u.x-(icons.length-1)*7+i*14,y-u.r*2.4-18,12,ic[1],'center',3,'#101018',700));
    if(u.shieldHp>0)txt(cx,'◈',u.x+u.r+4,y-40,14,'#c46adf','center',3,'#101018',700)}}
const FXDUR={bossdie:1.2,baseboom:1.4,cannon:0.5,slowbeam:1.3,bolt:0.45,waterwave:1.0,holyblast:0.8,breaker:0.55,dust:0.6,crown:1.6,moneypop:0.7,impact:0.26};
function drawFx(f){const p=clamp(1-f.t/(FXDUR[f.k]||0.5),0,1);
  cx.save();cx.translate(f.x,GROUND_Y-30+(f.y||0));
  switch(f.k){
    case 'poof':cx.globalAlpha=1-p;cx.fillStyle='#fff';for(let i=0;i<5;i++){const a=i/5*TAU+f.t*3;cx.beginPath();cx.arc(Math.cos(a)*(10+p*30),Math.sin(a)*8-p*20,8*(1-p),0,TAU);cx.fill()}break;
    case 'deploy':cx.globalAlpha=1-p;cx.strokeStyle='#ffd94a';cx.lineWidth=3;cx.beginPath();cx.arc(0,0,20+p*30,0,TAU);cx.stroke();break;
    case 'impact':{ /* hit starburst: 4-point white star + radial speed-sparks (reads in 1 frame) */
      const im=1-p;const sc=(f.big?1.5:1)*(0.6+im*0.8);cx.globalAlpha=Math.min(1,im*1.6);
      cx.save();cx.rotate((f.dir||1)*p*0.9);
      cx.fillStyle='#fff';
      cx.beginPath(); // 4-point star
      for(let i2=0;i2<8;i2++){const a=i2*Math.PI/4;const rr2=(i2%2?7:21)*sc;
        if(i2===0)cx.moveTo(Math.cos(a)*rr2,Math.sin(a)*rr2);else cx.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2)}
      cx.closePath();cx.fill();
      cx.strokeStyle='#ffd94a';cx.lineWidth=2.5*sc;
      cx.beginPath();cx.arc(0,0,23*sc,0,TAU);cx.stroke();cx.restore();
      for(let i2=0;i2<6;i2++){const a=i2/6*TAU+(f.dir||1)*0.4; // flying sparks
        cx.strokeStyle='rgba(255,255,255,'+(im*0.9).toFixed(2)+')';cx.lineWidth=2.2;
        cx.beginPath();cx.moveTo(Math.cos(a)*(14+im*26)*sc,Math.sin(a)*(14+im*26)*sc);
        cx.lineTo(Math.cos(a)*(22+im*38)*sc,Math.sin(a)*(22+im*38)*sc);cx.stroke()}
      cx.globalAlpha=1;break}
    case 'slash':cx.globalAlpha=1-p*0.7;cx.strokeStyle='#fff';cx.lineWidth=4;const sw=(f.range>100?60:26);cx.beginPath();cx.moveTo(f.dir*sw*0.3,-30);cx.quadraticCurveTo(f.dir*sw,-16,f.dir*sw*0.4,10);cx.stroke();break;
    case 'bossdie':cx.globalAlpha=1-p;for(let i=0;i<8;i++){const a=i/8*TAU;cx.fillStyle=i%2?'#ffd94a':'#ff7a5a';cx.beginPath();cx.arc(Math.cos(a)*p*120,Math.sin(a)*p*60,14*(1-p)+4,0,TAU);cx.fill()}break;
    case 'baseboom':cx.globalAlpha=1-p;for(let i=0;i<12;i++){const a=i/12*TAU*2+p*3;cx.fillStyle=i%2?'#ffd94a':'#fff';cx.beginPath();cx.arc(Math.cos(a)*p*160,Math.sin(a)*p*90-40,16*(1-p)+4,0,TAU);cx.fill()}break;
    case 'cannon':cx.globalAlpha=1-p;cx.fillStyle='#fff';cx.fillRect(-1280*p,-46,1280*p,26);cx.fillStyle='rgba(255,220,100,.7)';cx.fillRect(-1280*p,-52,1280*p,38);break;
    case 'slowbeam':{cx.globalAlpha=(1-p)*0.9;const bw=26*(1-p*0.5);const grad=cx.createLinearGradient(0,-60-bw,0,-20);
      grad.addColorStop(0,'rgba(140,200,255,0)');grad.addColorStop(0.7,'rgba(120,180,255,.75)');grad.addColorStop(1,'rgba(230,250,255,.95)');
      cx.fillStyle=grad;cx.fillRect(-(2600+p*600),-60-bw,2600+p*600,bw+40);
      cx.fillStyle='rgba(255,255,255,.85)';cx.fillRect(-(2600+p*600),-46,2600+p*600,7);break}
    case 'bolt':{cx.globalAlpha=1-p;cx.strokeStyle='#bfe4ff';cx.lineWidth=4;cx.beginPath();let bx=0,by=-560;cx.moveTo(bx,by);
      while(by<-10){bx+=Math.random()*30-15;by+=44;cx.lineTo(bx,by)}cx.stroke();
      cx.strokeStyle='#fff';cx.lineWidth=1.6;cx.stroke();
      cx.fillStyle='rgba(190,230,255,'+(0.7*(1-p))+')';cx.beginPath();cx.arc(0,-6,26*p+6,0,TAU);cx.fill();break}
    case 'waterwave':{cx.globalAlpha=(1-p)*0.85;for(let i=0;i<3;i++){const wp=i/3;cx.strokeStyle=i%2?'rgba(120,200,255,.9)':'rgba(220,245,255,.9)';cx.lineWidth=9-i*2;
      cx.beginPath();cx.arc(-wp*900*(1-p*0.4),10,46+p*130,-Math.PI*0.86,-Math.PI*0.14);cx.stroke()}
      cx.fillStyle='rgba(140,210,255,.35)';cx.beginPath();cx.ellipse(-p*700,26,220*p+40,20,0,0,TAU);cx.fill();break}
    case 'holyblast':{cx.globalAlpha=(1-p)*0.95;const hw=30*(1-p*0.6);
      const grad2=cx.createLinearGradient(-hw,0,hw,0);grad2.addColorStop(0,'rgba(255,240,160,0)');grad2.addColorStop(0.5,'rgba(255,246,200,.95)');grad2.addColorStop(1,'rgba(255,240,160,0)');
      cx.fillStyle=grad2;cx.fillRect(-hw,-560,hw*2,560);
      cx.fillStyle='rgba(255,255,255,.9)';for(let i=0;i<4;i++){const a=-Math.PI/2+(i-1.5)*0.5;cx.beginPath();cx.moveTo(0,-20);cx.lineTo(Math.cos(a)*26-4,-30);cx.lineTo(Math.cos(a)*40+p*50,-90-p*40);cx.lineTo(Math.cos(a)*14+4,-28);cx.closePath();cx.fill()}
      cx.fillStyle='rgba(255,250,210,.8)';cx.beginPath();cx.arc(0,-16,20*p+8,0,TAU);cx.fill();break}
    case 'breaker':{cx.globalAlpha=1-p;cx.strokeStyle='#ff6a5a';cx.lineWidth=5*(1-p)+1;cx.beginPath();cx.arc(0,-26,14+p*95,0,TAU);cx.stroke();
      cx.strokeStyle='#2a1620';cx.lineWidth=2;cx.stroke();
      cx.strokeStyle='rgba(255,140,80,.8)';cx.lineWidth=3;cx.beginPath();cx.arc(0,-26,6+p*130,-0.5,0.9);cx.stroke();cx.beginPath();cx.arc(0,-26,10+p*110,Math.PI-0.6,Math.PI+0.7);cx.stroke();break}
    case 'crown':{cx.globalAlpha=1-p; // golden crown burst: 3 crowns spiral outward + sparkles
      for(let i=0;i<3;i++){const a=-Math.PI/2+(i-1)*0.7;const rr2=30+p*110;
        cx.save();cx.translate(Math.cos(a)*rr2,Math.sin(a)*rr2*0.6-30);cx.rotate((i-1)*0.3+p*2);
        crownDraw(cx,0,0,13,'#ffd23f','#e8951f');cx.restore()}
      for(let i=0;i<10;i++){const a2=i/10*TAU+p*1.5;const rr3=60+((i*37)%50)+p*130;
        cx.fillStyle=i%2?'#fff':'#ffd94a';cx.beginPath();cx.arc(Math.cos(a2)*rr3,Math.sin(a2)*rr3*0.55-20,4*(1-p)+1.5,0,TAU);cx.fill()}
      break}
    case 'dust':cx.globalAlpha=(1-p)*0.8;cx.fillStyle='#c8b89a';for(let i=0;i<7;i++){const a=i/7*TAU;cx.beginPath();cx.arc(Math.cos(a)*(10+p*46),Math.sin(a)*5-p*26,9*(1-p)+2,0,TAU);cx.fill()}break;
    case 'moneypop':{cx.globalAlpha=1-p; // 3 gold coins arc up + sparkle (enemy bounty feedback)
      for(let i=0;i<3;i++){const ph=p+i*0.12;const cxp=-14+i*14+ph*8;const cyp=-ph*(64+i*10)+Math.pow(ph,2)*40;
        cx.save();cx.translate(cxp,cyp);cx.rotate(ph*(i%2?4:-3));
        cx.fillStyle='#ffd23f';cx.beginPath();cx.arc(0,0,6.5,0,TAU);cx.fill();
        cx.lineWidth=2;cx.strokeStyle='#b07818';cx.stroke();
        cx.fillStyle='rgba(255,255,255,.65)';cx.beginPath();cx.arc(-2.2,-2.2,1.7,0,TAU);cx.fill();
        cx.fillStyle='#b07818';txt(cx,'¢',0,0.5,8,'#8a5a10','center');cx.restore()}
      for(let i=0;i<4;i++){const a=i/4*TAU+0.6;const sr=12+((i*29)%14)+p*34;
        cx.fillStyle=i%2?'#fff':'#ffd94a';cx.beginPath();cx.arc(Math.cos(a)*sr,Math.sin(a)*sr*0.6-p*18,2.2*(1-p)+0.8,0,TAU);cx.fill()}
      break}
    case 'shieldbreak':cx.globalAlpha=1-p;cx.strokeStyle='#c46adf';cx.lineWidth=3;for(let i=0;i<6;i++){const a=i/6*TAU;cx.beginPath();cx.moveTo(Math.cos(a)*10,Math.sin(a)*10-20);cx.lineTo(Math.cos(a)*(20+p*30),Math.sin(a)*(20+p*30)-20);cx.stroke()}break;
  }
  cx.restore();cx.globalAlpha=1}
function drawBattleHUD(b,dt){
  // camera drag region registered FIRST so HUD buttons (registered later) win the hit scan.
  // Layout mirrors the ORIGINAL battle screen exactly:
  //   top-left $ wallet sign · top-right pause+speed · bottom-left Worker Cat lv-up button ·
  //   ONE bottom row of up to 10 unit cards · bottom-right Fire!! cannon · nothing else.
  SCROLL('field',0,110,1280,470,()=>b.cam,v=>{b.cam=clamp(v,0,FIELD_W-1280)},FIELD_W-1280,null).horiz=true;
  /* ===== TOP-LEFT: wallet sign — yellow rounded plate, brown $ amount + cent coin (original) ===== */
  {
    const mfs=27;cx.font=FONT(mfs,700);
    const s='$'+fmt(Math.floor(b.wallet));
    const sw=cx.measureText(s).width;
    const pw=sw+56,px=16,py=12,ph=42;
    cx.save();cx.shadowColor='rgba(0,0,0,.35)';cx.shadowBlur=6;cx.shadowOffsetY=3;
    cx.fillStyle='#ffd23f';rr(cx,px,py,pw,ph,12);cx.fill();cx.restore();
    cx.lineWidth=3;cx.strokeStyle='#8a5a20';rr(cx,px,py,pw,ph,12);cx.stroke();
    cx.fillStyle='rgba(255,255,255,.35)';rr(cx,px+4,py+3,pw-8,10,6);cx.fill(); // top gloss
    txt(cx,s,px+18,py+28,mfs,'#7a4a10','left',4.5,'rgba(255,244,200,.85)',700);
    drawCent(cx,px+pw-20,py+21,10,'#ffb020','rgba(90,50,8,.9)',3.5);
  }
  /* ===== TOP-RIGHT: pause (yellow circle w/ two dark bars) — retreat lives in the pause menu ===== */
  cx.fillStyle=b.paused?'#e85840':'#ffd23f';cx.beginPath();cx.arc(1243,33,23,0,TAU);cx.fill();
  cx.lineWidth=4;cx.strokeStyle=b.paused?'#7a1a10':'#8a5a20';cx.stroke();
  if(b.paused)txt(cx,'\u25b6',1243,34,17,'#5a3b16','center',3,'#fff',700);
  else{cx.fillStyle='#5a3b16';cx.fillRect(1235,23,6,20);cx.fillRect(1245,23,6,20)}
  BTN('pause',1218,10,46,46,()=>{if(B.result)return;b.paused=!b.paused;SFX.click();
    if(b.paused&&!b.result)openModal('PAUSED',['Battle paused.'],[
      {n:'Resume',col:'#ffd23f',cb:()=>{if(B)B.paused=false}},
      {n:'Retry',col:'#7fd0ff',cb:()=>{if(!B)return;const st=B.st;B=null;G.modal=null;startBattle(st)}},
      {n:'Retreat',col:'#e85840',cb:()=>{if(!B)return;B.paused=false;endBattle(false);applyBattleResult();G.screen='map';G.screenPrev=[];B=null;AudioSetBgm('menu')}},
      {n:'Close',cb:()=>{if(B)B.paused=false}}])},{flat:true,nohov:true});
  // (no boss name label — the original announces bosses via the warning banner only)
  /* ===== RIGHT EDGE: dark circular SPEED UP button (official caption style) ===== */
  const sx=1234,sy=124,srad=36;
  cx.fillStyle='#2c3242';cx.beginPath();cx.arc(sx,sy,srad,0,TAU);cx.fill();
  cx.lineWidth=3.5;cx.strokeStyle='#171b26';cx.stroke();
  cx.strokeStyle='rgba(255,255,255,.16)';cx.lineWidth=2;cx.beginPath();cx.arc(sx,sy,srad-3.5,-2.3,-0.7);cx.stroke();
  txt(cx,'SPEED',sx,sy-13.5,11,'#e8ecf4','center',2.5,'#171b26',700);
  txt(cx,'UP',sx,sy-2.5,11,'#e8ecf4','center',2.5,'#171b26',700);
  txt(cx,'\u00d7'+b.speed,sx,sy+15,16,'#ffd23f','center',3,'#171b26',700);
  if(SV.rank<20)drawPadlock(cx,sx+16,sy+19,8,'#ffd23f'); // ×3 is rank-gated
  BTN('speed',sx-srad-2,sy-srad-2,srad*2+4,srad*2+4,()=>{if(B.result)return;
    if(b.speed===1){b.speed=2;SFX.click()}
    else if(b.speed===2){if(SV.rank>=20){b.speed=3;SFX.click()}else{SFX.error();toast('Speed x3 unlocks at User Rank 20! (now '+SV.rank+')','#ffb060')}}
    else{b.speed=1;SFX.click()}},{flat:true,nohov:true});
  /* ===== BOTTOM-LEFT: Worker Cat level-up button (original: direct upgrade, no menu) =====
     Wallet Lv drives BOTH max (WALLET_MAX) and regen (WORKER_MUL) — one combined level like the original. */
  const wLv=Math.max(b.walletLv,b.workerLv);b.walletLv=b.workerLv=wLv; // keep the two engine fields unified
  const wbx=20,wby=586,wbw=100,wbh=96;
  cx.save();cx.shadowColor='rgba(0,0,0,.4)';cx.shadowBlur=8;cx.shadowOffsetY=3;
  cx.fillStyle='#ffd23f';rr(cx,wbx,wby,wbw,wbh,14);cx.fill();cx.restore();
  cx.lineWidth=4;cx.strokeStyle='#8a5a20';rr(cx,wbx,wby,wbw,wbh,14);cx.stroke();
  ART.catIcon('cat',wbx+wbw/2,wby+44,26);
  // level plate across the top of the button (original 'Lv.N' badge)
  cx.fillStyle='#8a5a20';rr(cx,wbx+14,wby+6,wbw-28,22,11);cx.fill();
  txt(cx,'Lv.'+(wLv+1),wbx+wbw/2,wby+17.5,14,'#ffe8a0','center',3,'rgba(40,20,4,.9)',700);
  const wkCost=WALLET_COST[wLv];
  if(wLv<7){ // upgrade cost pill (green when affordable, grey otherwise) — tap = direct upgrade
    const can=b.wallet>=wkCost;
    const cw=74;
    cx.save();cx.translate(wbx+wbw/2,wby+wbh+16);
    if(can){const pu=1+Math.sin(G.t*5)*0.05;cx.scale(pu,pu)}
    cx.fillStyle=can?'#5ad84a':'#5a6472';rr(cx,-cw/2,-13,cw,26,13);cx.fill();
    cx.lineWidth=2.5;cx.strokeStyle=can?'#1e5a14':'#2c3242';rr(cx,-cw/2,-13,cw,26,13);cx.stroke();
    // cost sits centered in the space RIGHT of the arrow; auto-shrinks for 4-digit costs (never touches the arrow)
    cx.font=FONT(13,700);const ws2='$'+wkCost;let ww2=cx.measureText(ws2).width,wfs2=13;
    while(ww2>44&&wfs2>9.5){wfs2-=0.5;cx.font=FONT(wfs2,700);ww2=cx.measureText(ws2).width}
    txt(cx,ws2,13,0.5,wfs2,'#fff','center',2.5,'rgba(10,30,8,.8)',700);
    // up-arrow affordance left of the cost
    cx.fillStyle='#fff';cx.beginPath();cx.moveTo(-cw/2+12,5);cx.lineTo(-cw/2+19,-5);cx.lineTo(-cw/2+26,5);cx.closePath();cx.fill();
    cx.restore();
    BTN('worker',wbx,wby,wbw,wbh+30,()=>{if(B.result||B.paused)return;
      if(b.wallet>=wkCost&&wLv<7){b.wallet-=wkCost;b.walletLv=wLv+1;b.workerLv=wLv+1;SFX.up();
        popTxtUI('Wallet Lv.'+(wLv+2)+'!')}else SFX.error()},{flat:true,nohov:true});
  }else{ // MAX: no arrow, golden plate
    cx.fillStyle='#8a5a20';rr(cx,wbx+wbw/2-40,wby+wbh+6,80,26,13);cx.fill();
    txt(cx,'MAX',wbx+wbw/2,wby+wbh+19.5,13,'#ffe8a0','center',2.5,'rgba(40,20,4,.9)',700);
    BTN('worker',wbx,wby,wbw,wbh,()=>{SFX.error()},{flat:true,nohov:true});
  }
  /* ===== BOTTOM-RIGHT: Fire!! cannon button — magenta glow when ready ===== */
  const c=b.cannon;const ready=c.t<=0;const fx=1190,fy=636;
  const cmeta=CANNON_TYPES.find(t=>t.id===c.type)||CANNON_TYPES[0];
  const frac=ready?1:1-c.t/c.charge;
  cx.save();cx.shadowColor=ready?'rgba(255,74,216,.65)':'rgba(0,0,0,.35)';cx.shadowBlur=ready?16:5;
  const cg=cx.createLinearGradient(fx,fy-44,fx,fy+44);
  if(ready){cg.addColorStop(0,'#ff9ad5');cg.addColorStop(1,'#e8489a')}else{cg.addColorStop(0,'#4a5468');cg.addColorStop(1,'#2c3242')}
  cx.fillStyle=cg;cx.beginPath();cx.arc(fx,fy,44,0,TAU);cx.fill();cx.restore();
  cx.lineWidth=5;cx.strokeStyle='#22262f';cx.beginPath();cx.arc(fx,fy,44,0,TAU);cx.stroke();
  cx.lineWidth=6;cx.strokeStyle=ready?(cmeta.ring||'#ffd23f'):'#8fd8ff';
  cx.beginPath();cx.arc(fx,fy,35,-Math.PI/2,-Math.PI/2+TAU*frac);cx.stroke();
  cx.fillStyle=ready?'#fff':'#c8ccd4';cx.beginPath();cx.arc(fx,fy-6,15,0,TAU);cx.fill();
  cx.fillStyle='#22262f';cx.beginPath();cx.arc(fx-5,fy-8,2.2,0,TAU);cx.arc(fx+5,fy-8,2.2,0,TAU);cx.fill();
  txt(cx,ready?'Fire!!':tstr(c.t),fx,fy+24,ready?16:13,ready?'#ffd23f':'#cfd3e0','center',3,'#22262f',700);
  BTN('cannon',fx-46,fy-46,92,92,()=>{if(B.result)return;fireCannon()},{flat:true,nohov:true});
  /* ===== BOTTOM-CENTER: ONE row of up to 10 unit cards (original deck) ===== */
  const team=b.teamIds.filter(id=>id).slice(0,10);
  const dw=76,dh=84,gpx=7;
  const x0=132; // right of the worker button
  team.forEach((id,i)=>{
    const dx=x0+i*(dw+gpx),dy=614;
    if(dx+dw>1120)return; // never collide with the Fire button
    const st=catStats(id,undefined,B.costMul);const cd=b.cds[id]||0;const cdMax=st.cd;const can=b.wallet>=st.cost&&cd<=0;
    const afford=b.wallet>=st.cost;
    BTN('dock'+i,dx,dy,dw,dh+16,()=>{if(B.result||B.paused)return;if(!can){SFX.error();if(cd>0)toast(cd.toFixed(1)+'s','#ffb060');else toast('Not enough \u00a2!','#ff7a7a');return}
      b.wallet-=st.cost;b.cds[id]=cdMax;spawnCat(id)},{flat:true,nohov:true,draw:cc2=>{
      // ready + affordable: soft breathing glow behind the card
      if(can){const gl=0.5+0.5*Math.sin(G.t*3.2+i);
        cc2.save();cc2.shadowColor='rgba(120,200,255,'+(0.25+gl*0.3).toFixed(3)+')';cc2.shadowBlur=10+gl*6;
        cc2.fillStyle='#31405a';rr(cc2,0,0,dw,dh,10);cc2.fill();cc2.restore()}
      else{cc2.save();cc2.shadowColor='rgba(0,0,0,.35)';cc2.shadowBlur=5;cc2.shadowOffsetY=3;
        cc2.fillStyle=can?'#31405a':'#232a38';rr(cc2,0,0,dw,dh,10);cc2.fill();cc2.restore()}
      cc2.lineWidth=3;cc2.strokeStyle=can?'#c8d2e4':'#3a4456';rr(cc2,1.5,1.5,dw-3,dh-3,10);cc2.stroke();
      ART.catIcon(id,dw/2,36,25,can?undefined:0.45);
      if(cd>0){ // recharge curtain falls from the top, revealing the card as it recharges (original sweep)
        const hgt=dh*clamp(cd/cdMax,0,1);
        cc2.save();rr(cc2,1.5,1.5,dw-3,dh-3,10);cc2.clip();
        cc2.fillStyle='rgba(10,14,24,.78)';cc2.fillRect(1.5,1.5,dw-3,hgt);cc2.restore();
        txt(cc2,cd.toFixed(1),dw/2,dh/2+1,15,'#fff','center',3,'#22262f',700)}
      else if(!afford){cc2.fillStyle='rgba(16,20,30,.4)';rr(cc2,0,0,dw,dh,10);cc2.fill()}
      // diagonal gloss highlight (glassy card)
      cc2.save();cc2.beginPath();rr(cc2,1.5,1.5,dw-3,dh-3,10);cc2.clip();
      const gg=cc2.createLinearGradient(0,0,dw,dh);gg.addColorStop(0,'rgba(255,255,255,.14)');gg.addColorStop(0.45,'rgba(255,255,255,.02)');gg.addColorStop(1,'rgba(255,255,255,0)');
      cc2.fillStyle=gg;cc2.fillRect(0,0,dw,dh);cc2.restore();
      // cost badge at the card's bottom edge (original: dark plate + green number + ¢ symbol AFTER the digits)
      const cs=String(st.cost);cc2.font=FONT(13,700);const csw=cc2.measureText(cs).width;
      const bw2=csw+21,bx2=dw/2-bw2/2; // plate sized for [digits + gap + symbol], group centered
      cc2.fillStyle='rgba(10,14,22,.82)';rr(cc2,bx2,dh-16,bw2,18,9);cc2.fill();
      const cCol=afford?'#9ae89a':'#ff9a8a';
      txt(cc2,cs,bx2+7,dh-7,13,cCol,'left',2.5,'rgba(8,10,16,.9)',700);
      drawCent(cc2,bx2+7+csw+6.5,dh-7.5,5.5,cCol,'rgba(8,10,16,.9)',3)}});
  });
}
function popTxtUI(s){toast(s,'#ffd94a')}

const RARITY_LABEL={normal:'Basic Cat',special:'Special Cat',rare:'Rare Cat',srar:'Super Rare Cat',uber:'Uber Super Rare Cat',legend:'Legend Rare Cat'};
function drawResult(b){
  applyBattleResult();
  const win=b.result==='win';
  const t=Math.min(1,b.resultT/0.6),e=1-Math.pow(1-t,3);
  /* victory confetti (screen-space, drawn UNDER the UI bands so text stays readable) */
  if(win&&b.confetti){
    const d=Math.min(0.05,1/60); // fixed-ish step (drawResult runs once per frame)
    for(const p of b.confetti){
      p.x+=p.vx*d;p.y+=p.vy*d;p.rot+=p.vr*d;p.vy+=14*d; // gentle gravity
      if(p.y>760){p.y=-24;p.x=80+Math.random()*1120;p.vy=90+Math.random()*120}
      cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);
      const sway=Math.sin(G.t*3+p.ph)*0.5+0.5;
      cx.globalAlpha=0.75+sway*0.25;
      cx.fillStyle=p.col;cx.fillRect(-p.w/2,-p.h*sway/2,p.w,p.h*sway);
      cx.restore()}
    cx.globalAlpha=1}
  /* ===== EXACT official result composition (refs result_a/result_b/treasure_a): =====
     battle scene stays visible; huge white result word drops in; full-width navy bands
     carry 'Score N' + 'Gained N XP!!'; drop-reward panel lists the drop; Ok + Post to SNS. */
  const ty=lerp(-180,250,e);
  cx.save();cx.translate(640,ty);cx.rotate(Math.sin(G.t*2.6)*0.008);
  cx.font=FONT(92,700);cx.textAlign='center';cx.textBaseline='middle';cx.lineJoin='round';
  const title=win?'Victory!':'Defeat...';
  cx.lineWidth=20;cx.strokeStyle='rgba(16,12,8,.95)';cx.strokeText(title,0,0);
  cx.lineWidth=7;cx.strokeStyle=win?'#6a4a10':'#4a1420';cx.strokeText(title,0,0);
  cx.fillStyle='#fff';cx.fillText(title,0,0);cx.restore();
  /* ===== rank medal (Victory only): laurel-wreath chip with the commander's User Rank ===== */
  if(win&&b.resultT>0.15){const mA=clamp((b.resultT-0.15)/0.3,0,1);
    cx.save();cx.globalAlpha=mA;cx.translate(952,234);cx.rotate(-0.12); // raised+shifted so the caption clears the score band (VLM QA fix)
    const pu=1+Math.sin(G.t*3)*0.03;cx.scale(pu,pu);
    // laurel wreath: two arcs of leaves
    cx.strokeStyle='#3a7a2a';cx.lineWidth=3;cx.lineCap='round';
    for(let s2=-1;s2<=1;s2+=2){cx.beginPath();
      for(let a2=-1.15;a2<=1.15;a2+=0.22){const rr2=44+Math.sin(a2*3)*3;
        cx.moveTo(s2*Math.cos(a2)*rr2*0.86,Math.sin(a2)*rr2*0.86);
        cx.lineTo(s2*Math.cos(a2+0.16)*(rr2+9),Math.sin(a2+0.16)*(rr2+9))}
      cx.stroke()}
    // medal disc
    cx.fillStyle='#ffd23f';cx.beginPath();cx.arc(0,0,36,0,TAU);cx.fill();
    cx.lineWidth=3.5;cx.strokeStyle='#8a5a10';cx.stroke();
    cx.lineWidth=1.5;cx.strokeStyle='rgba(255,255,255,.7)';cx.beginPath();cx.arc(0,0,30,0,TAU);cx.stroke();
    glyph(cx,'up',0,-8,12,'#8a5a10','#ffd23f');
    txt(cx,'RANK '+SV.rank,0,14,11,'#5a3b16','center',2.5,'#fff8e8',700);
    txt(cx,'Commander',0,52,10,'#fff','center',3,'rgba(20,12,4,.9)',700);
    cx.restore()}
  const bA=clamp((b.resultT-0.2)/0.35,0,1);
  if(bA>0){cx.globalAlpha=bA;
    // NEW RECORD chip sits above the Score band on dojo screens (treasure_a)
    let by=340;
    if(b.st.endless){
      if(B.newRecord)txt(cx,'NEW RECORD',640,by-22,17,'#ffd23f','center',4,'rgba(30,16,2,.95)',700);
      cx.fillStyle='rgba(15,18,36,.8)';cx.fillRect(0,by-28,1280,56);
      txt(cx,'Score',560,by+1,30,'#fff','center',5,'rgba(10,10,20,.9)',700);
      txt(cx,fmt(B.score),720,by+1,34,'#ffd23f','center',6,'rgba(30,16,2,.95)',700);
      by+=66}
    cx.fillStyle='rgba(15,18,36,.8)';cx.fillRect(0,by-28,1280,56);
    // 'Gained [N] XP!!' — white label, gold numeral, white suffix, centered as one line
    cx.font=FONT(30,700);const l1='Gained  ',l3='  XP!!';
    const gold=fmt(B.rewardXP||0);
    cx.font=FONT(34,700);const gw=cx.measureText(gold).width;
    cx.font=FONT(30,700);const w1=cx.measureText(l1).width,w3=cx.measureText(l3).width;
    const x0=640-(w1+gw+w3)/2;
    txt(cx,l1,x0+w1/2,by+1,30,'#fff','center',5,'rgba(10,10,20,.9)',700);
    txt(cx,gold,x0+w1+gw/2,by+1,34,'#ffd23f','center',6,'rgba(30,16,2,.95)',700);
    txt(cx,l3,x0+w1+gw+w3/2,by+1,30,'#fff','center',5,'rgba(10,10,20,.9)',700);
    by+=66;
    // ===== CROWN BAND (story wins): 3 slots pop in + time/kills/damage stats (Gauntlet-style) =====
    if(win&&b.crowns){
      cx.fillStyle='rgba(15,18,36,.8)';cx.fillRect(0,by-28,1280,56);
      txt(cx,'CROWNS',390,by+8,20,'#fff','center',4,'rgba(10,10,20,.9)',700); // baseline lowered to optically center against the pip row
      const ce=b.crowns.earned;
      for(let i=0;i<3;i++){ // sequential pop-in w/ overshoot ease
        const pop=clamp((b.resultT-0.4-i*0.14)/0.2,0,1);
        if(pop<=0)continue;
        const eb=pop<1?(1+Math.sin(pop*Math.PI)*0.5):1;
        cx.save();cx.translate(470+i*58,by+2);cx.scale(pop*eb,pop*eb);cx.rotate(i===ce-1&&pop<0.85?Math.sin(pop*30)*0.1:0);
        crownDraw(cx,0,0,i<ce?15:13,i<ce?'#ffd23f':'#c8bca0',i<ce?'#8a5a10':'#6a6458',i>=ce);
        cx.restore()}
      if(b.crowns.improved)txt(cx,'CROWN UP!',540,by+2,14,'#7fe86a','left',3,'#061806',700);
      // battle stats right side
      const tsec=Math.max(0,Math.round(b.t));const mm=Math.floor(tsec/60),ss=String(tsec%60).padStart(2,'0');
      txt(cx,'⏱ '+mm+':'+ss+'  ·  ☠ '+b.kills+'  ·  DMG '+fmt(Math.round(b.dmgDealt/1000))+'k',1080,by+6,18,'#9fd8ff','right',4,'rgba(10,10,20,.9)',700); // right edge 1080 — clears the enemy-base art (drawn from ~x1100 at result cam)
      by+=66}
    cx.globalAlpha=1}
  // drop-reward panel (dark olive + white border, verbatim official lines)
  const drops=[];
  if(B.rewardCat&&CATMAP[B.rewardCat])drops.push(RARITY_LABEL[CATMAP[B.rewardCat].rarity]+' "'+CATMAP[B.rewardCat].forms[0].n+'" received!','Activate it at the Upgrade menu!');
  else if(B.rewardTreasure){const ts=CHSETS[B.st.ch]&&CHSETS[B.st.ch][B.rewardTreasure.set];drops.push('Treasure "'+(ts?ts.n:'?')+'" received!','Check it at the Treasure menu!')}
  else if(B.rewardFruit)drops.push(FRUIT_NAMES[B.rewardFruit]+' received!','Activate it at the Upgrade menu!');
  else if(B.rewardTicket)drops.push('Rare Ticket x1 received!','Activate it at the Gacha menu!');
  else if(B.rewardCF)drops.push('+'+B.rewardCF+' Cat Food received!','Spend it at the Store!');
  if(drops.length&&bA>0){cx.globalAlpha=bA;
    const hasCrowns=win&&b.crowns;
    if(hasCrowns&&B.crownBonusCF)drops.push('ALL-CROWN BONUS: +'+B.crownBonusCF+' Cat Food + '+fmt(B.crownBonusXP)+' XP!');
    if(B.crownLadder&&B.crownLadder.length)B.crownLadder.forEach(cm=>drops.push('CROWN LADDER M'+cm.n+': +'+cm.cf+' Cat Food + '+fmt(cm.xp)+' XP!'));
    const pw2=790,ph2=34+drops.length*30+22,px2=640-pw2/2,py2=hasCrowns?458:438;
    cx.fillStyle='rgba(38,38,24,.94)';rr(cx,px2,py2,pw2,ph2,6);cx.fill();
    cx.lineWidth=3.5;cx.strokeStyle='#e8e4d4';rr(cx,px2,py2,pw2,ph2,6);cx.stroke();
    const dr='Drop Reward ',de='Earned!!';
    cx.font=FONT(21,700);const dw1=cx.measureText(dr).width,dw2=cx.measureText(de).width;
    txt(cx,dr,640-(dw1+dw2)/2+dw1/2,py2+27,21,'#fff','center',4,'rgba(10,10,6,.9)',700);
    txt(cx,de,640+(dw1+dw2)/2-dw2/2,py2+27,21,'#ffd23f','center',4,'rgba(10,10,6,.9)',700);
    drops.forEach((s,i)=>{const hot=i===drops.length-1&&/Activate|Check|menu!/.test(s);
      txt(cx,s,640,py2+58+i*30,20,hot?'#ffd23f':'#fff','center',4,'rgba(10,10,6,.9)',700)});
    cx.globalAlpha=1}
  // official buttons: big yellow Ok + Continue (defeat only, costs 3 CF — original mechanic) + Post to SNS
  const okA=clamp((b.resultT-0.45)/0.3,0,1);
  if(okA>0){cx.globalAlpha=okA;
    if(!win&&!b.continued){ // CONTINUE: revive the base + heal every deployed cat, battle resumes (original defeat flow)
      BTN('resCont',180,610,220,76,()=>{if(SV.cf<3){SFX.error();toast('Need 3 Cat Food to continue!','#ff7a7a');return}
        addCF(-3);b.continued=true;B.applied=false;B.result=null;B.resultT=0;
        B.catBase.hp=B.catBase.maxHp;B.catBase.alarm=0;
        B.units.forEach(u=>{if(u.side==='cat'&&u.state!=='die'){u.hp=u.maxHp;u.kbTaken=0;u.rateT=Math.min(u.rateT,0.3)}});
        B.units=B.units.filter(u=>!(u.side==='cat'&&u.state==='die')); // fallen cats are gone (they can be re-deployed)
        for(const id in B.cds)B.cds[id]=0;
        toast('CONTINUE! The base stands again!','#7fe86a');SFX.up()},{flat:true,nohov:true,draw:cc=>{
        cc.save();cc.shadowColor='rgba(255,80,180,.45)';cc.shadowBlur=12;
        cc.fillStyle='#e8489a';rr(cc,0,0,220,76,14);cc.fill();cc.restore();
        cc.lineWidth=3.5;cc.strokeStyle='#8a1a5a';rr(cc,0,0,220,76,14);cc.stroke();
        cc.lineWidth=1.5;cc.strokeStyle='rgba(255,255,255,.5)';rr(cc,5,5,210,66,11);cc.stroke();
        txt(cc,'Continue',110,32,24,'#fff','center',0,null,700);
        txt(cc,'3 \u00a2 CF \u2014 base revived',110,58,13,'#ffd9f2','center',2.5,'rgba(60,8,40,.9)',700)}});}
    BTN('resOk',430,610,420,76,()=>{SFX.click();const st=b.st;const kind=CHMAP[st.ch]&&CHMAP[st.ch].kind;B=null;
      if(kind==='sol'||kind==='ul'){G.screen='submap';G.screenPrev=[]}else{G.screen='map';G.screenPrev=[]}
      AudioSetBgm('menu')},{flat:true,nohov:true,draw:cc=>{
      cc.save();cc.shadowColor='rgba(255,180,20,.5)';cc.shadowBlur=14;
      cc.fillStyle='#ffd23f';rr(cc,0,0,420,76,14);cc.fill();cc.restore();
      cc.lineWidth=3.5;cc.strokeStyle='#8a5a20';rr(cc,0,0,420,76,14);cc.stroke();
      cc.lineWidth=1.5;cc.strokeStyle='rgba(255,255,255,.55)';rr(cc,5,5,410,66,11);cc.stroke();
      txt(cc,'Ok',210,40,36,'#4a2f10','center',0,null,700)}});
    BTN('resSns',1064,622,190,52,()=>{SFX.click();
      const st=b.st;const msg='I cleared '+st.name+' in The Battle Cats! '+ (win?('Gained '+fmt(B.rewardXP||0)+' XP!!'):'Try again with me!');
      if(navigator.share){navigator.share({text:msg}).catch(()=>{})}
      else if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(msg).then(()=>toast('Result copied!','#7fd0ff')).catch(()=>toast('Result ready to share!','#7fd0ff'))}
      else toast('Result ready to share!','#7fd0ff')},{flat:true,nohov:true,draw:cc=>{
      cc.fillStyle='#8a93a8';rr(cc,0,0,190,52,12);cc.fill();
      cc.lineWidth=3;cc.strokeStyle='#4a4e5e';rr(cc,0,0,190,52,12);cc.stroke();
      txt(cc,'Post to SNS',95,27,20,'#fff','center',3.5,'rgba(10,10,20,.9)',700)}});
    cx.globalAlpha=1}
}

function nextStageIdx(st){const c=CHMAP[st.ch];
  if(c.kind==='story'&&st.idx<47)return{ch:st.ch,idx:st.idx+1};
  if(c.kind==='aku'&&st.idx<12)return{ch:'aku',idx:st.idx+1};
  if(c.kind==='dojo'&&!st.endless&&st.idx<14)return{ch:'dojo',idx:st.idx+1};
  if(c.kind==='sol'&&st.idx%8<7)return{ch:'sol',idx:st.idx+1};
  if(c.kind==='ul'&&st.idx%8<7)return{ch:'ul',idx:st.idx+1};
  return null}
