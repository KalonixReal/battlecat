'use strict';
/* =====================================================================================
   SAVE SYSTEM (Builder C, Task 6) — loads AFTER ui.js + battle.js, BEFORE fixes.js.

   Owns:
   - File-based export/import: downloadSaveFile() / pickSaveFile() / importSaveFile(text)
   - Pending-transaction layer: savePendingPull / consumePendingPull / applyGachaGrant /
     recoverPendingPull / recoverPendingBattle
   - Hidden DOM <textarea> overlay for in-canvas paste entry (canvas can't take text natively):
     saveFocusPasteArea / saveBlurPaste / saveSetPaste / saveClipboardRead
   - Tab-close safety: persist() flush on beforeunload + visibilitychange(hidden)

   Monkey-patches (same reassignment pattern fixes.js uses — all targets are plain
   `function` declarations, i.e. reassignable global bindings):
   - loadSave (core.js, own function)  → + boot recovery of pendingPull/pendingBattle
   - tryStartBattle (ui.js)            → records SV.pendingBattle before a real battle starts
   - applyBattleResult (battle.js)     → clears SV.pendingBattle after the battle resolves
   - drawGachaAnim (ui.js)             → WHOLESALE COPY of ui.js's implementation (visuals
     byte-identical) with ONLY the OK-button callback swapped to consumeGachaGrant(), which
     applies the summon results exactly once (A.results.__done flag) and clears pendingPull.
     Rationale (§5 #12): CF is charged the moment results are rolled, but the grant used to
     live only in the OK handler (memory). Now doPull persists SV.pendingPull, and the grant
     happens exactly once at OK *or* at boot recovery — never both, never lost on reload.
   ===================================================================================== */

/* ======================= pending-transaction primitives ======================= */
function savePendingPull(results,banner){ // called by ui.js doPull right after CF charge + persist
  if(!Array.isArray(results)||!results.length)return false;
  SV.pendingPull={results:results.slice(),banner:String(banner||'rare'),ts:now()};
  persist();
  return true}
function consumePendingPull(){ // returns the pending record (or null) and clears it durably
  const p=(SV&&SV.pendingPull)?SV.pendingPull:null;
  SV.pendingPull=null;persist();
  return p}
function applyGachaGrant(id){ // identical semantics to the OLD ui.js OK-button loop; returns true if a NEW cat appeared
  if(!id||typeof id!=='string'||!CATMAP[id])return false;
  const res=unlockCat(id,'dupe');
  if(res&&res.dupe&&SV.cats[id])SV.cats[id].plus=Math.min(RARITY_LV[CATMAP[id].rarity].plusCap,SV.cats[id].plus+1);
  return !!(res&&res.new)}
function recoverPendingPull(){ // boot path: reload happened between rolling a summon and tapping OK
  const p=SV&&SV.pendingPull;
  if(!p||!Array.isArray(p.results)||!p.results.length)return false;
  p.results.forEach(id=>applyGachaGrant(id));
  SV.pendingPull=null;persist();
  if(typeof toast==='function')toast('Recovered '+p.results.length+' summon result(s) after reload','#7fe8a0');
  return true}
function recoverPendingBattle(){ // boot path: reload mid-battle. Honest behavior: the energy was
  // spent when the battle started and is NOT refunded (matches the original's no-refund design);
  // this toast just explains why energy is lower than expected.
  if(!SV||!SV.pendingBattle)return false;
  SV.pendingBattle=null;persist();
  if(typeof toast==='function')toast('Previous battle was interrupted — energy was spent','#ffb060');
  return true}

/* ======================= boot recovery (wrap loadSave) ======================= */
const _saveSysLoadSave=loadSave;
loadSave=function(){
  _saveSysLoadSave();
  try{recoverPendingPull()}catch(e){console.error('savesys: pendingPull recovery failed',e)}
  try{recoverPendingBattle()}catch(e){console.error('savesys: pendingBattle recovery failed',e)}};

/* ======================= interrupted-battle tracking ======================= */
const _saveSysTryStartBattle=tryStartBattle;
tryStartBattle=function(ch,idx){
  // mirror the original's guards so we only record battles that will actually start
  try{const st=(idx>=0)?genStage(ch,idx):(G.pendingEvent?G.pendingEvent.s:null);
    if(st&&SV&&SV.energy>=st.energy){SV.pendingBattle={ch:String(ch),idx:Math.floor(idx),ts:now()};persist()}}
  catch(e){/* never block battle start */}
  return _saveSysTryStartBattle(ch,idx)};
const _saveSysApplyBattleResult=applyBattleResult;
applyBattleResult=function(){
  const r=_saveSysApplyBattleResult(); // run the real result application first
  try{if(SV&&SV.pendingBattle){SV.pendingBattle=null;persist()}}catch(e){}
  return r};

/* ======================= gacha grant-at-OK (redefined drawGachaAnim) =======================
   Builder C (Task 6) owned the OK→consumeGachaGrant exactly-once flow; Builder P (Task 7)
   restyled the RESULT phase on top of it (Defect 1). The grant logic is UNCHANGED:
   consumeGachaGrant() applies results exactly once via A.results.__done and clears the
   pendingPull record. New in Task 7: exchangeGachaDupe() (left "Exchange for XP" button)
   uses the SAME __done exactly-once flag but grants dupe XP (100 × rarity index) instead of
   a plus level, then clears pendingPull durably. */
function consumeGachaGrant(){
  const A=G.gachaAnim;
  if(!A||!A.results||A.results.__done)return;
  A.results.__done=true; // exactly-once bookkeeping — set BEFORE applying
  let newN=0;A.results.forEach(id=>{if(applyGachaGrant(id))newN++});
  consumePendingPull();
  SFX.click();G.gachaAnim=null;
  if(newN&&typeof toast==='function')toast(newN+' new cat'+(newN>1?'s':'')+' joined!','#7fe8a0')}
function exchangeGachaDupe(){ // single-pull DUPE card → dupe XP (100×rarity index) instead of +1 plus
  const A=G.gachaAnim;
  if(!A||!A.results||A.results.__done||A.results.length!==1)return;
  const id=A.results[0];const c=CATMAP[id];
  if(!c||!catOwned(id)){SFX.error();if(typeof toast==='function')toast('Only duplicate Cats can be exchanged!','#ffb060');return}
  A.results.__done=true; // exactly-once bookkeeping — same flag the OK button uses
  const xp=100*({normal:0,special:1,rare:2,srar:3,uber:4,legend:5}[c.rarity]||0);
  if(typeof addXP==='function')addXP(xp); // canonical grant path (rank ups + persist inside)
  else{SV.xp+=xp;SV.xpTotal=(SV.xpTotal||0)+xp;persist()}
  consumePendingPull(); // clear the durable pending record — this path handled the grant
  SFX.win2();G.gachaAnim=null;
  if(typeof toast==='function')toast('Duplicate exchanged for '+xp+' XP!','#ffd94a')}

/* ---- Builder P result-scene helpers: official R6/R7 composition ---- */
const GACHA_TINT={ // interior radial tint keyed by the BEST rarity of the pull
  normal:['#5ab06a','#123a1e'],special:['#4ab0d8','#0e2c44'],
  rare:['#e86ab0','#43102c'],srar:['#3f7ae0','#101f4a'],
  uber:['#8a4adf','#22103e'],legend:['#e8b13a','#3f2606']};
const GACHA_TITLE={normal:'Rare!',special:'Super Rare!!',rare:'Rare!',srar:'Super Rare!!',uber:'Uber Super Rare!!',legend:'Legend Rare!!'};
function gachaResultBackdrop(bestKey){ // full-screen wood frame + colored radial interior + rays
  const tint=GACHA_TINT[bestKey]||GACHA_TINT.rare;
  const g=cx.createRadialGradient(640,330,70,640,330,790);
  g.addColorStop(0,tint[0]);g.addColorStop(1,tint[1]);
  cx.fillStyle=g;cx.fillRect(0,0,1280,720);
  cx.save();cx.translate(640,240);cx.globalAlpha=.055;cx.fillStyle='#fff'; // slow celebratory rays
  cx.rotate(G.t*0.05);
  for(let i=0;i<10;i++){cx.rotate(TAU/10);cx.beginPath();cx.moveTo(0,0);cx.lineTo(880,-64);cx.lineTo(880,64);cx.closePath();cx.fill()}
  cx.restore();
  const vg=cx.createLinearGradient(0,0,0,720); // seat the scene into the frame
  vg.addColorStop(0,'rgba(0,0,0,.34)');vg.addColorStop(.25,'rgba(0,0,0,0)');
  vg.addColorStop(.78,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.42)');
  cx.fillStyle=vg;cx.fillRect(0,0,1280,720);
  woodFrame(0,0,1280,720,16);
  kikkouStrip(0,688,1280,32,true,'#d2a868','rgba(122,82,26,.65)')} // official patterned bottom strip
function gachaRarityTitle(bestKey,pr){ // big red→gold gradient chunky letters, top-center
  const s=GACHA_TITLE[bestKey]||'Rare!';
  const sc=(pr==null)?1:(0.55+0.45*clamp(pr,0,1));
  cx.save();cx.translate(640,102);cx.scale(sc,sc);
  cx.font=FONT(52,700);cx.textAlign='center';cx.textBaseline='middle';cx.lineJoin='round';
  const tg=cx.createLinearGradient(-340,0,340,0);tg.addColorStop(0,'#ff4040');tg.addColorStop(.55,'#ff9038');tg.addColorStop(1,'#ffd23f');
  cx.lineWidth=12;cx.strokeStyle='#2a0e08';cx.strokeText(s,0,0);
  cx.lineWidth=4.5;cx.strokeStyle='#7a1a10';cx.strokeText(s,0,0);
  cx.fillStyle=tg;cx.fillText(s,0,0);
  cx.save();cx.beginPath();cx.rect(-420,-46,840,38);cx.clip(); // top-half gloss
  cx.fillStyle='rgba(255,255,255,.22)';cx.fillText(s,0,0);cx.restore();
  cx.restore();
  for(let i=0;i<5;i++){const sa=G.t*1.6+i*1.7;const sxp=640+Math.cos(sa)*300,syp=102+Math.sin(sa*1.3)*46;
    cx.fillStyle='rgba(255,240,170,'+(0.35+0.3*Math.sin(G.t*5+i*2)).toFixed(2)+')';star(cx,sxp,syp,6+(i%2)*3,2.6+i);cx.fill()}}
function gachaYellowCircle(id,cxL,cyd,l1,l2,enabled,cb){ // official yellow circle side-button
  const r=50;
  cx.save();
  if(enabled){cx.shadowColor='rgba(0,0,0,.45)';cx.shadowBlur=10;cx.shadowOffsetY=4}
  const bg2=cx.createLinearGradient(0,cyd-r,0,cyd+r);
  bg2.addColorStop(0,enabled?'#ffe24a':'#cfc4a8');bg2.addColorStop(1,enabled?'#ffb420':'#a89c80');
  cx.fillStyle=bg2;cx.beginPath();cx.arc(cxL,cyd,r,0,TAU);cx.fill();cx.restore();
  cx.lineWidth=4;cx.strokeStyle=enabled?'#5a3b16':'#6a604c';cx.beginPath();cx.arc(cxL,cyd,r,0,TAU);cx.stroke();
  cx.lineWidth=1.5;cx.strokeStyle='rgba(255,255,255,.7)';cx.beginPath();cx.arc(cxL,cyd,r-5,0,TAU);cx.stroke();
  const tc=enabled?'#fff':'#e4ddca';
  if(l2){txt(cx,l1,cxL,cyd-11,l1.length>9?12:14.5,tc,'center',3,'#5a3b16',700);
    txt(cx,l2,cxL,cyd+10,l2.length>9?12:14.5,tc,'center',3,'#5a3b16',700)}
  else txt(cx,l1,cxL,cyd+1,15,tc,'center',3,'#5a3b16',700);
  BTN(id,cxL-r,cyd-r,r*2,r*2,cb,{flat:true,nohov:true})}
function gachaOkPill(x,y,wd,ht){ // official gold "Ok" pill w/ magenta border
  cx.save();cx.shadowColor='rgba(0,0,0,.45)';cx.shadowBlur=10;cx.shadowOffsetY=4;
  const og=cx.createLinearGradient(0,y,0,y+ht);og.addColorStop(0,'#ffe24a');og.addColorStop(1,'#ffb420');
  cx.fillStyle=og;rr(cx,x,y,wd,ht,ht/2);cx.fill();cx.restore();
  cx.lineWidth=4.5;cx.strokeStyle='#ff2fd0';rr(cx,x,y,wd,ht,ht/2);cx.stroke();
  cx.lineWidth=1.5;cx.strokeStyle='rgba(255,255,255,.65)';rr(cx,x+4,y+4,wd-8,ht-8,ht/2-4);cx.stroke();
  txt(cx,'Ok',x+wd/2,y+ht/2+1,24,'#4a2f10','center',4,'rgba(255,255,255,.8)',700)}
function drawGachaAnim(dt){const A=G.gachaAnim;A.t+=dt;cx.fillStyle='rgba(8,6,16,.82)';cx.fillRect(0,0,1280,720);
  if(A.phase===0){const drop=Math.min(1,A.t/0.5);const y=lerp(-100,340,drop*drop);
    cx.save();cx.translate(640,y);cx.rotate(A.t>0.7?Math.sin((A.t-0.7)*40)*0.25:0);
    cx.fillStyle='#ff9ad5';cx.beginPath();cx.arc(0,0,80,Math.PI,0);cx.fill();cx.fillStyle='#fff';cx.beginPath();cx.arc(0,0,80,0,Math.PI);cx.fill();cx.fillStyle='#2a1e46';cx.fillRect(-80,-8,160,16);
    cx.fillStyle='rgba(255,255,255,.55)';cx.beginPath();cx.ellipse(-32,-36,24,13,-0.6,0,TAU);cx.fill();
    cx.fillStyle='rgba(255,255,255,.3)';cx.beginPath();cx.ellipse(12,-44,32,10,-0.35,0,TAU);cx.fill();
    cx.strokeStyle='rgba(42,30,70,.6)';cx.lineWidth=4;cx.beginPath();cx.arc(0,0,80,0,TAU);cx.stroke();cx.restore();
    if(A.t>1.6||A.tap){A.phase=1;A.t=0;A.tap=false;SFX.capsule()}}
  else if(A.phase===1){const col=RAR_FLASH[Object.keys(RAR_FLASH)[A.best]];
    const r=Math.min(1,A.t/0.8);cx.save();cx.translate(640,300);cx.rotate(Math.min(1.6,A.t*4));
    cx.fillStyle=col;cx.globalAlpha=1-r*0.9;cx.beginPath();cx.arc(0,0,80,Math.PI,0);cx.fill();cx.globalAlpha=1;cx.restore();
    cx.globalAlpha=r;cx.fillStyle=col;cx.beginPath();cx.arc(640,300,40+r*380*r,0,TAU);cx.globalAlpha=r*0.5;cx.fill();cx.globalAlpha=1;
    if(A.t>1.2||A.tap){A.phase=2;A.t=0;A.tap=false;SFX.win2();A.reveal=0}}
  else{A.reveal=Math.min(A.results.length,A.reveal+dt*2.2);
    const shown=Math.floor(A.reveal)+1;
    const n=A.results.length;
    const bestKey=Object.keys(RAR_FLASH)[A.best]||'rare';
    gachaResultBackdrop(bestKey); // official composition: wood frame + rarity-tinted radial interior
    if(n===1){ // ===== SINGLE-PULL RESULT (R6/R7): large art + name bar + Use/Exchange + Ok =====
      const id=A.results[0];const c=CATMAP[id];const dup=catOwned(id);
      const pr=clamp(A.reveal/0.45,0,1);const q=pr-1;const sc=1+2.7*q*q*q+1.7*q*q;
      gachaRarityTitle(c.rarity,pr);
      cx.save();cx.globalAlpha=pr;cx.translate(640,322);cx.scale(sc,sc);
      cx.fillStyle='rgba(20,8,24,.35)';cx.beginPath();cx.ellipse(0,196,122,20,0,0,TAU);cx.fill();
      ART.cat({id,x:0,y:186,s:2.6,t:G.t}); // LARGE full-body center art (walk-idle, legend/uber aura included)
      cx.restore();
      if(!dup){for(let si=0;si<3;si++){const sa=G.t*2.4+si*2.1;const sxp=640+Math.cos(sa)*160,syp=320+Math.sin(sa)*130;
        cx.fillStyle='rgba(255,225,110,'+(0.5+0.4*Math.sin(G.t*7+si*2)).toFixed(2)+')';star(cx,sxp,syp,7,3);cx.fill()}}
      // dark-olive name bar + white name
      const nm=c.forms[0].n;const barW=460,barH=48,barY=556;
      cx.font=FONT(24,700);let nfs=24;while(cx.measureText(nm).width>barW-60&&nfs>12)nfs--;
      cx.save();cx.shadowColor='rgba(0,0,0,.5)';cx.shadowBlur=10;cx.shadowOffsetY=4;
      cx.fillStyle='#3a3a26';rr(cx,640-barW/2,barY,barW,barH,10);cx.fill();cx.restore();
      cx.lineWidth=2.5;cx.strokeStyle='rgba(255,248,232,.85)';rr(cx,640-barW/2,barY,barW,barH,10);cx.stroke();
      txt(cx,nm,640,barY+barH/2+1,nfs,'#fff','center',4,'rgba(0,0,0,.75)',700);
      // white "New!" tag with red border, rotated, left of the name bar (dupes get none)
      if(!dup){cx.save();cx.translate(368,barY+4);cx.rotate(-0.22);
        cx.shadowColor='rgba(0,0,0,.4)';cx.shadowBlur=8;cx.shadowOffsetY=3;
        cx.fillStyle='#fff';rr(cx,-58,-24,116,46,10);cx.fill();cx.shadowColor='transparent';
        cx.lineWidth=4;cx.strokeStyle='#e84030';rr(cx,-58,-24,116,46,10);cx.stroke();
        txt(cx,'New!',0,1,26,'#e84030','center',5,'#fff',700);cx.restore()}
      // left: yellow circle buttons — "Use now" (same exactly-once grant as Ok) + "Exchange for XP"
      gachaYellowCircle('guse',140,600,'Use','now',true,()=>{consumeGachaGrant()});
      gachaYellowCircle('gxchg',262,600,'Exchange','for XP',dup,()=>{exchangeGachaDupe()});
      // right: official gold "Ok" pill (grant-once logic unchanged)
      gachaOkPill(960,572,220,56);
      BTN('gok',960,572,220,56,()=>{consumeGachaGrant()},{flat:true,nohov:true});
      // chrome: XP pill top-right + Cat Food can bottom-right (draw-only, official layout)
      cx.font=FONT(22,700);const xpw2=cx.measureText(fmt(SV.xp)).width;
      txt(cx,fmt(SV.xp),1236,32,22,'#ffd23f','right',4.5,'rgba(20,16,4,.9)',700);
      txt(cx,'XP',1236-xpw2-10,32,13,'#37b6ff','right',3.5,'rgba(10,20,30,.85)',700);
      drawCFCan(cx,1120,666,12);
      txt(cx,fmt(SV.cf),1142,666,19,'#ffd23f','left',4,'rgba(20,16,4,.95)',700)}
    else{ // ===== MULTI-PULL: card grid reveal restyled to official dark-bordered cards =====
      gachaRarityTitle(bestKey,null);
      const cols=n>6?6:n;const cw=150;const ox=640-(cols*cw+(cols-1)*10)/2;
      const gy=n<=6?210:168;
      A.results.slice(0,Math.min(shown,n)).forEach((id,i)=>{const col=i%cols,row=Math.floor(i/cols);const x=ox+col*(cw+10),y=gy+row*192;
        // per-card pop-in: back-eased scale + rarity glow flash + NEW sparkles (timing unchanged)
        const pr=clamp((A.reveal-i)/0.45,0,1);if(pr<=0)return;
        const q=pr-1;const sc2=1+2.7*q*q*q+1.7*q*q;
        const c=CATMAP[id];const dup=catOwned(id);
        cx.save();cx.globalAlpha=pr;cx.translate(x+cw/2,y+85);cx.scale(sc2,sc2);cx.translate(-(x+cw/2),-(y+85));
        if(pr<1){cx.fillStyle=RAR_COL[c.rarity];cx.globalAlpha=(1-pr)*0.5;cx.beginPath();cx.arc(x+cw/2,y+85,95,0,TAU);cx.fill();cx.globalAlpha=pr}
        cx.save();cx.shadowColor='rgba(0,0,0,.5)';cx.shadowBlur=8;cx.shadowOffsetY=4;
        cx.fillStyle='#1b1b26';rr(cx,x,y,cw,170,10);cx.fill();cx.restore(); // official dark card
        cx.lineWidth=3;cx.strokeStyle='rgba(255,255,255,.92)';rr(cx,x,y,cw,170,10);cx.stroke();
        cx.lineWidth=1.2;cx.strokeStyle='rgba(255,255,255,.22)';rr(cx,x+5,y+5,cw-10,160,7);cx.stroke();
        cx.fillStyle=RAR_COL[c.rarity];cx.beginPath();cx.moveTo(x+cw-34,y+2.5);cx.lineTo(x+cw-2.5,y+2.5);cx.lineTo(x+cw-2.5,y+34);cx.closePath();cx.fill();
        cx.lineWidth=1.2;cx.strokeStyle='rgba(0,0,0,.4)';cx.stroke();
        ART.catIcon(id,x+cw/2,y+64,30);
        txt(cx,c.forms[0].n,x+cw/2,y+114,11.5,'#fff','center',3,'rgba(0,0,0,.85)',700);
        txt(cx,c.rarity.toUpperCase(),x+cw/2,y+132,10.5,shade(RAR_COL[c.rarity],1.05),'center',2.5,'rgba(0,0,0,.85)',700);
        txt(cx,dup?'DUP! +1 Plus'+(c.rarity==='uber'||c.rarity==='legend'?' +'+({uber:5,legend:10}[c.rarity])+' NP':''):'NEW!',x+cw/2,y+151,11,dup?'#ffb060':'#7fe8a0','center',2.5,'rgba(0,0,0,.8)',700);
        if(!dup){ // sparkle shimmer on the card corners
          for(let si=0;si<2;si++){const sa=G.t*3+si*Math.PI+i;const sxp=x+cw/2+Math.cos(sa)*78,syp=y+85+Math.sin(sa)*88;
            cx.fillStyle='rgba(255,220,90,'+(0.55+0.4*Math.sin(G.t*7+si))+')';star(cx,sxp,syp,8,3.2);cx.fill()}}
        cx.restore()});
      if(shown>=n){gachaOkPill(530,584,220,56);
        BTN('gok',530,584,220,56,()=>{consumeGachaGrant()},{flat:true,nohov:true})}}}}

/* ======================= file export / import ======================= */
function downloadSaveFile(){ // wrapped v2 JSON → battle-cats-save-YYYYMMDD.txt
  try{
    const payload=JSON.stringify({app:'battle-cats',v:2,exported:Date.now(),data:SV},null,1);
    const blob=new Blob([payload],{type:'text/plain'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const d=new Date();const ds=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
    a.download='battle-cats-save-'+ds+'.txt';a.href=url;a.style.display='none';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    toast('Save file downloaded','#7fe8a0');return true}
  catch(e){toast('Download failed — use Copy code instead','#ff7a7a');return false}}
function pickSaveFile(){ // on-demand <input type=file>; result → importSaveFile(text)
  try{
    const inp=document.createElement('input');
    inp.type='file';inp.accept='.txt,.json,.bcv';inp.style.display='none';
    document.body.appendChild(inp);
    inp.addEventListener('change',()=>{
      const f=inp.files&&inp.files[0];
      if(!f){inp.remove();return}
      const rd=new FileReader();
      rd.onload=()=>{importSaveFile(String(rd.result==null?'':rd.result));inp.remove()};
      rd.onerror=()=>{toast('Could not read that file','#ff7a7a');inp.remove()};
      rd.readAsText(f)});
    inp.click();return true}
  catch(e){toast('File picker unavailable in this browser','#ff7a7a');return false}}
function importSaveFile(text){ // tri-format unwrap lives in core.importSave; this adds UX + re-init
  if(importSave(text)){
    toast('Save file imported!','#7fe8a0');
    regenEnergy();AudioSetBgm('menu');G.screen='home';G.screenPrev=[];G.hits=[];
    return true}
  toast('Invalid save file — current progress preserved','#ff7a7a');SFX.error();return false}

/* ======================= hidden paste textarea (in-canvas text entry) ======================= */
let _pasteTA=null;
function saveEnsureTA(){
  if(_pasteTA)return _pasteTA;
  _pasteTA=document.createElement('textarea');
  _pasteTA.id='bc-paste-ta';
  _pasteTA.setAttribute('autocomplete','off');
  _pasteTA.setAttribute('autocorrect','off');
  _pasteTA.setAttribute('spellcheck','false');
  _pasteTA.style.cssText='position:fixed;z-index:999;border:0;margin:0;padding:2px;background:rgba(255,255,255,.05);color:transparent;caret-color:#fff;opacity:.02;resize:none;outline:none;overflow:hidden;font:11px monospace;white-space:pre;left:-9999px;top:0;width:10px;height:10px;';
  document.body.appendChild(_pasteTA);
  _pasteTA.addEventListener('input',()=>{G.importBuf=_pasteTA.value});
  return _pasteTA}
function saveFocusPasteArea(dx,dy,dw,dh){ // design-space rect (1280x720) → screen px over the canvas
  const ta=saveEnsureTA();
  const sx=(OX+dx*SC),sy=(OY+dy*SC),sw=Math.max(40,dw*SC),sh=Math.max(24,dh*SC);
  ta.style.left=sx+'px';ta.style.top=sy+'px';ta.style.width=sw+'px';ta.style.height=sh+'px';
  ta.value=G.importBuf||'';
  setTimeout(()=>{try{ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)}catch(e){}},0)}
function saveBlurPaste(){if(_pasteTA){try{_pasteTA.blur()}catch(e){}_pasteTA.style.left='-9999px';_pasteTA.style.top='0px';_pasteTA.style.width='10px';_pasteTA.style.height='10px'}}
function saveSetPaste(v){G.importBuf=String(v==null?'':v);if(_pasteTA)_pasteTA.value=G.importBuf}
function saveClipboardRead(cb){ // navigator.clipboard.readText with a graceful catch
  if(navigator.clipboard&&navigator.clipboard.readText){
    navigator.clipboard.readText().then(t=>cb(String(t==null?'':t))).catch(()=>toast('Clipboard blocked — tap the box and press Ctrl+V','#ff7a7a'))}
  else toast('Clipboard unavailable — tap the box and press Ctrl+V','#ff7a7a')}

/* ======================= tab-close / tab-hide durability ======================= */
addEventListener('beforeunload',()=>{try{if(SV)persist()}catch(e){}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){try{if(SV)persist()}catch(e){}}});

console.log('%csavesys: v2 save system active (migration chain + pending-transaction recovery)','color:#7fe8a0;font-weight:bold');
