'use strict';
/* ============================== CORE / INPUT / UI KIT ============================== */
const cv=document.getElementById('game'),cx=cv.getContext('2d');
let VW=0,VH=0,SC=1,OX=0,OY=0;
function resize(){VW=innerWidth;VH=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);cv.width=VW*dpr;cv.height=VH*dpr;cv.style.width=VW+'px';cv.style.height=VH+'px';SC=Math.min(VW/1280,VH/720);OX=(VW-1280*SC)/2;OY=(VH-720*SC)/2;cx.setTransform(dpr,0,0,dpr,0,0);cv._dpr=dpr;document.getElementById('rotate').style.display=(VH>VW*1.05)?'flex':'none'}
addEventListener('resize',resize);resize();
const G={screen:'title',screenPrev:[],hits:[],drags:[],toasts:[],modal:null,t:0,chapter:'eoc1',mapSub:0,selCat:null,selEnemy:null,gachaAnim:null,dragCam:false,pending:null,hoverId:null,scrollHome:0,scrollChap:0,scrollColl:0,scrollList:0,guideFilter:'all',equipSel:-1,lastEvents:null,eventKey:'',transT:0};
function push(s){G.screenPrev.push(G.screen);G.screen=s;G.hits=[];G.transT=0.30}
function pop(){const p=G.screenPrev.pop();G.screen=p||'home';G.hits=[];G.transT=0.30}
function toast(msg,col){G.toasts.push({msg,t:3.2,age:0,col:col||'#ffd94a'})}
function openModal(title,lines,btns,drawExtra){G.modal={title,lines,btns:btns||[{n:'CLOSE',cb:()=>{}}],drawExtra}}
function toDesign(e){return{x:(e.clientX-OX)/SC,y:(e.clientY-OY)/SC}}
cv.addEventListener('pointerdown',e=>{const p=toDesign(e);AudioUnlock();G.pdown={x:p.x,y:p.y,moved:false,t:now()};
  if(G.flingCam)G.flingCam=null; // new grab kills any live camera fling
  try{cv.setPointerCapture(e.pointerId)}catch(e2){} // drag survives leaving the window — no more stuck/lost drags
  if(G.modal){for(let i=G.hits.length-1;i>=0;i--){const h=G.hits[i];if(!String(h.id).startsWith('mb')&&!h.modal)continue;
    if(p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h){G.pend={h,p}}}
    if(G.gachaAnim)G.gachaAnim.tap=true;return}
  // during capsule/flash phases (0,1) taps just skip the animation; phase 2 reveals
  // block ALL underlying buttons except the reveal's own OK (a stray pull would
  // discard unconfirmed results)
  if(G.gachaAnim){
    if(G.gachaAnim.phase>=2){
      const h=G.hits.find(x=>x.id==='gok');
      if(h&&p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h){G.pend={h,p};if(!h.noactive)h.active=true}
      return}
    G.gachaAnim.tap=true;return}
  for(let i=G.hits.length-1;i>=0;i--){const h=G.hits[i];if(h.hidden)continue;
    if(p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h){
      if(h.scroll){G.dragScroll={h,off:h.off(),sy:p.y,sx:p.x,moved:false,pendBtn:null};return}
      if(h.cb){
        // drag-to-scroll from a button that lives inside a scroll region (buttons register AFTER the
        // region, so reverse iteration finds the button first — we must still capture the region)
        let sreg=null;for(let j=G.hits.length-1;j>=0;j--){const s=G.hits[j];if(!s||s===h||!s.scroll||s.hidden)continue;
          if(p.x>=s.x&&p.x<=s.x+s.w&&p.y>=s.y&&p.y<=s.y+s.h){sreg=s;break}}
        if(sreg){G.dragScroll={h:sreg,off:sreg.off(),sy:p.y,sx:p.x,moved:false,pendBtn:h};h.active=true;return}
        G.pend={h,p};if(!h.noactive)h.active=true;return}}}
});
cv.addEventListener('pointermove',e=>{const p=toDesign(e);G.mouse=p;
  if(G.dragScroll){const h=G.dragScroll.h;
    if(h.horiz){const d=p.x-G.dragScroll.sx;if(Math.abs(d)>6||G.dragScroll.moved){G.dragScroll.moved=true;h.setOff(G.dragScroll.off-d); /* GRAB-THE-WORLD (original): the WORLD follows the finger — drag LEFT slides content LEFT, revealing the right */
      if(G.flingCam)G.flingCam=null;
      const nt=now(),olt=G.dragScroll.lt||nt,olx=(G.dragScroll.lx!==undefined?G.dragScroll.lx:G.dragScroll.sx); // first segment measures from the drag START
      const iv=(p.x-olx)/Math.max(0.008,(nt-olt)/1000); // instantaneous px/s of this segment
      G.dragScroll.v=0.55*(G.dragScroll.v||0)+0.45*clamp(iv,-3000,3000); // smoothed velocity (for the release fling)
      G.dragScroll.lx=p.x;G.dragScroll.lt=nt}}
    else{const d=p.y-G.dragScroll.sy;if(Math.abs(d)>6||G.dragScroll.moved){G.dragScroll.moved=true;h.setOff(clamp(G.dragScroll.off-d,0,h.max()))}}}
  else if(G.pdown&&G.onDrag)G.onDrag(p,G.pdown);
  if(G.pdown&&Math.hypot(p.x-G.pdown.x,p.y-G.pdown.y)>7)G.pdown.moved=true;
  let hov=null;for(const h of G.hits){if(!h.hidden&&p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h){hov=h.id;break}}G.hoverId=hov;
  cv.style.cursor=hov?'pointer':'default';
});
/* mouse wheel / touchpad scrolling — roll the scroll region under the cursor */
cv.addEventListener('wheel',e=>{const p=toDesign(e);
  if(G.modal)return;
  let sreg=null;for(let i=G.hits.length-1;i>=0;i--){const s=G.hits[i];if(!s||!s.scroll||s.hidden)continue;
    if(p.x>=s.x&&p.x<=s.x+s.w&&p.y>=s.y&&p.y<=s.y+s.h){sreg=s;break}}
  if(sreg){const dy=e.deltaY;
    if(sreg.horiz){const dx=Math.abs(e.deltaX)>Math.abs(dy)?e.deltaX:dy; // wheel: roll right slides content LEFT (grab-the-world, matches the drag)
      sreg.setOff(clamp(sreg.off()-dx,0,(sreg.max&&sreg.max()>0)?sreg.max():1e9))}
    else sreg.setOff(clamp(sreg.off()+dy,0,sreg.max()));
    e.preventDefault();e.stopPropagation()}
},{passive:false});
function endPointer(e){if(G.dragScroll){const ds=G.dragScroll;
    if(!ds.moved){ // a tap (not a drag): fire the region's own onTap AND any button it swallowed
      if(ds.h.tap)ds.h.tap();
      if(ds.pendBtn&&ds.pendBtn.cb)ds.pendBtn.cb()}
    else if(ds.h.horiz&&ds.v){ // FLING: content keeps gliding in the finger's direction (grab-the-world momentum)
      if(now()-(ds.lt||0)<140&&Math.abs(ds.v)>380)G.flingCam={v:clamp(ds.v,-2600,2600)}}
    if(ds.pendBtn)ds.pendBtn.active=false;
    G.dragScroll=null}
  if(e&&e.pointerId!==undefined){try{cv.releasePointerCapture(e.pointerId)}catch(e2){}}
  if(G.pend&&G.pdown){const p=toDesign(e);const h=G.pend.h;if(p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h){if(!G.pdown.moved&&h.cb)h.cb()}G.pend=null}
  for(const h of G.hits)h.active=false;G.pdown=null}
cv.addEventListener('pointerup',endPointer);cv.addEventListener('pointercancel',endPointer);
cv.addEventListener('lostpointercapture',endPointer);
function BTN(id,x,y,w,h,cb,o){o=o||{};G.hits.push({id,x,y,w,h,cb,scroll:o.scroll,hidden:o.hidden,modal:o.modal});if(o.scroll)return;
  const hov=G.hoverId===id&&!o.nohov,act=h.active&&!o.nohov;
  cx.save();cx.translate(x+(act?2:0),y+(act?2:0));
  const R=o.r||14;
  if(o.flat){o.draw&&o.draw(cx,hov,act)}
  else{cx.shadowColor='rgba(0,0,0,.35)';cx.shadowBlur=6;cx.shadowOffsetY=3;cx.fillStyle=o.col||'#ffd94a';rr(cx,0,0,w,h,R);cx.fill();cx.shadowColor='transparent';
    if(hov){cx.fillStyle='rgba(255,255,255,.18)';rr(cx,0,0,w,h,R);cx.fill()}
    if(o.outline){cx.lineWidth=2.5;cx.strokeStyle=o.outline;rr(cx,1.5,1.5,w-3,h-3,R);cx.stroke()}
    if(o.disabled){cx.fillStyle='rgba(30,30,40,.55)';rr(cx,0,0,w,h,R);cx.fill()}
    if(o.label){let lf=o.fs||Math.min(22,h*0.42); // auto-shrink labels that would overflow the button (e.g. ADD TO TEAM in narrow modals)
      cx.font=FONT(lf,700);while(cx.measureText(o.label).width>w-18&&lf>9)lf--;
      txt(cx,o.label,w/2,h/2+(o.ly||0),lf,o.tcol||'#26262e','center',4,'rgba(255,255,255,.75)',700)}
    o.draw&&o.draw(cx,hov,act)}
  cx.restore()}
function SCROLL(id,x,y,w,h,getOff,setOff,maxH,onTap){const hIt={id,x,y,w,h,scroll:true,hidden:false,cb:null,off:getOff,setOff:v=>setOff(v),max:()=>maxH,tap:onTap};G.hits.push(hIt);return hIt}
function inScroll(s,x,y){return s&&x>=s.x&&x<=s.x+s.w&&y>=s.y&&y<=s.y+s.h}
/* ---- warm brown/parchment chrome palette (matches Stage Select) ---- */
const WOOD1='#c98a3c',WOOD2='#8a5a20',PARCH1='#f2e3c0',PARCH2='#e0c890',CREAM='#fff8e8',CARD='#fffdf5',BROWN='#5a3b16',BROWN2='#7a5a2a',GOLD='#ffd23f',GOLDLN='#5a3b16';
function woodBar(){const g=cx.createLinearGradient(0,0,0,54);g.addColorStop(0,'#c98a3c');g.addColorStop(1,'#8a5a20');cx.fillStyle=g;cx.fillRect(0,0,1280,54);cx.fillStyle='rgba(60,35,10,.4)';cx.fillRect(0,52,1280,3);
  cx.strokeStyle='rgba(60,35,10,.16)';cx.lineWidth=1.6;
  for(let i=0;i<3;i++){cx.beginPath();cx.moveTo(0,15+i*13);cx.bezierCurveTo(320,11+i*13,960,20+i*13,1280,14+i*13);cx.stroke()}}
function parchBody(){const pg=cx.createLinearGradient(0,54,0,720);pg.addColorStop(0,'#f2e3c0');pg.addColorStop(1,'#e0c890');cx.fillStyle=pg;cx.fillRect(0,54,1280,666)}
function woodBody(){const wg=cx.createLinearGradient(0,54,0,720);wg.addColorStop(0,'#9a7434');wg.addColorStop(1,'#6f4e1c');cx.fillStyle=wg;cx.fillRect(0,54,1280,666);
  cx.strokeStyle='rgba(50,32,10,.22)';cx.lineWidth=2;
  for(let i=0;i<7;i++){cx.beginPath();cx.moveTo(0,120+i*86);cx.bezierCurveTo(320,112+i*86,960,128+i*86,1280,118+i*86);cx.stroke()}}
function creamPanel(x,y,w,h,ln){cx.fillStyle='#fff8e8';rr(cx,x,y,w,h,16);cx.fill();cx.lineWidth=3;cx.strokeStyle=ln||'#b08a50';rr(cx,x+1,y+1,w-2,h-2,15);cx.stroke();cx.lineWidth=1.2;cx.strokeStyle='rgba(176,138,80,.45)';rr(cx,x+5,y+5,w-10,h-10,12);cx.stroke()}
function glyph(c,kind,x,y,s,col,bg){c.save();c.translate(x,y);c.scale(s/10,s/10);c.strokeStyle=col;c.fillStyle=col;c.lineWidth=2.6;c.lineCap='round';c.lineJoin='round';
  if(kind==='swords'){c.beginPath();c.moveTo(-8,8);c.lineTo(6,-6);c.moveTo(-6,-6);c.lineTo(8,8);c.moveTo(-9,6);c.lineTo(-4,9);c.moveTo(4,9);c.lineTo(9,6);c.stroke()}
  else if(kind==='cat'){c.beginPath();c.arc(0,1.5,7,0,TAU);c.fill();c.beginPath();c.moveTo(-6.5,-3);c.lineTo(-8,-9);c.lineTo(-2.5,-5.5);c.closePath();c.fill();c.beginPath();c.moveTo(6.5,-3);c.lineTo(8,-9);c.lineTo(2.5,-5.5);c.closePath();c.fill();c.fillStyle=bg;c.beginPath();c.arc(-2.8,0.5,1.3,0,TAU);c.arc(2.8,0.5,1.3,0,TAU);c.fill()}
  else if(kind==='up'){c.beginPath();c.moveTo(0,-9);c.lineTo(7.5,-1);c.lineTo(3,-1);c.lineTo(3,9);c.lineTo(-3,9);c.lineTo(-3,-1);c.lineTo(-7.5,-1);c.closePath();c.fill()}
  else if(kind==='capsule'){c.beginPath();c.arc(0,0,8.5,0,TAU);c.stroke();c.beginPath();c.arc(0,0,8.5,Math.PI,0);c.closePath();c.fill();c.fillRect(-8.5,-1.6,17,3.2)}
  else if(kind==='chest'){c.beginPath();c.moveTo(-8.5,-1);c.lineTo(8.5,-1);c.lineTo(8.5,7);c.lineTo(-8.5,7);c.closePath();c.fill();c.beginPath();c.moveTo(-8.5,-1);c.arc(0,-1,8.5,Math.PI,0);c.closePath();c.fill();c.fillStyle=bg;c.fillRect(-1.4,-2,2.8,5);c.beginPath();c.arc(0,0.5,1.6,0,TAU);c.fill()}
  else if(kind==='doge'){c.beginPath();c.arc(0,1,7.2,0,TAU);c.fill();c.beginPath();c.moveTo(-6.5,-3.5);c.lineTo(-5.5,-10);c.lineTo(-1.5,-5);c.closePath();c.fill();c.beginPath();c.moveTo(6.5,-3.5);c.lineTo(5.5,-10);c.lineTo(1.5,-5);c.closePath();c.fill();c.fillStyle=bg;c.beginPath();c.ellipse(0,3.6,3.4,2.2,0,0,TAU);c.fill();c.beginPath();c.arc(-3,-0.5,1.2,0,TAU);c.arc(3,-0.5,1.2,0,TAU);c.fill();c.fillStyle=col;c.beginPath();c.arc(0,2.6,1.1,0,TAU);c.fill()}
  else if(kind==='cannon'){c.save();c.rotate(-0.7);c.fillRect(-2.8,-11,5.6,14);c.restore();c.beginPath();c.arc(0,3,6.2,0,TAU);c.fill();c.fillStyle=bg;c.beginPath();c.arc(0,3,2.6,0,TAU);c.fill()}
  else if(kind==='gear'){for(let i2=0;i2<8;i2++){c.save();c.rotate(i2*TAU/8);c.fillRect(-1.8,-9.5,3.6,5);c.restore()}c.beginPath();c.arc(0,0,5.6,0,TAU);c.fill();c.fillStyle=bg;c.beginPath();c.arc(0,0,2.4,0,TAU);c.fill()}
  else if(kind==='scroll'){c.beginPath();c.moveTo(-7,-6);c.lineTo(5,-6);c.quadraticCurveTo(8,-6,8,-3.5);c.quadraticCurveTo(8,-1,5,-1);c.lineTo(-7,-1);c.closePath();c.stroke();c.beginPath();c.moveTo(-7,-1);c.lineTo(-7,7);c.lineTo(6,7);c.quadraticCurveTo(8,7,8,4.5);c.lineTo(8,4.5);c.stroke();c.beginPath();c.moveTo(-3.5,2);c.lineTo(2.5,2);c.moveTo(-3.5,4.5);c.lineTo(2.5,4.5);c.stroke()}
  else if(kind==='flame'){c.beginPath();c.moveTo(0,-9);c.quadraticCurveTo(6.5,-2.5,5.5,3);c.quadraticCurveTo(4.8,8,0,8.5);c.quadraticCurveTo(-4.8,8,-5.5,3);c.quadraticCurveTo(-6.5,-2.5,0,-9);c.closePath();c.fill();c.fillStyle=bg;c.beginPath();c.moveTo(0,-2.5);c.quadraticCurveTo(3,1.5,2.2,4.2);c.quadraticCurveTo(1.4,6.2,0,6.4);c.quadraticCurveTo(-1.6,6,-2.2,4);c.quadraticCurveTo(-2.8,1,0,-2.5);c.closePath();c.fill()}
  else if(kind==='cart'){c.beginPath();c.moveTo(-9.5,-7);c.lineTo(-5.5,-7);c.lineTo(-3,3);c.lineTo(6.5,3);c.lineTo(9,-3.4);c.lineTo(-4.4,-3.4);c.closePath();c.fill();c.fillStyle=bg;c.beginPath();c.arc(-1.6,5.4,1.8,0,TAU);c.arc(4.6,5.4,1.8,0,TAU);c.fill()}
  else if(kind==='compass'){c.beginPath();c.arc(0,0,8.6,0,TAU);c.stroke();c.save();c.rotate(-0.6);c.fillStyle=col;c.beginPath();c.moveTo(0,-6.5);c.lineTo(2.2,2.4);c.lineTo(0,0.8);c.lineTo(-2.2,2.4);c.closePath();c.fill();c.fillStyle=bg;c.beginPath();c.arc(0,0,2,0,TAU);c.fill();c.restore();c.fillStyle=col;c.beginPath();c.arc(0,-7.2,1.2,0,TAU);c.fill()}
  else if(kind==='flag'){c.beginPath();c.moveTo(-6,9);c.lineTo(-6,-8);c.stroke();c.fillStyle=col;c.beginPath();c.moveTo(-6,-8);c.quadraticCurveTo(1,-5,8,-7);c.quadraticCurveTo(3,1,-6,1);c.closePath();c.fill()}
  else if(kind==='medal'){c.beginPath();c.arc(0,0,8,0,TAU);c.stroke();c.beginPath();c.moveTo(-6.5,6.5);c.lineTo(-3.5,3.5);c.moveTo(6.5,6.5);c.lineTo(3.5,3.5);c.stroke();c.fillStyle=col;c.beginPath();c.arc(0,0,4.6,0,TAU);c.fill();c.fillStyle=bg;c.beginPath();c.arc(0,0,2,0,TAU);c.fill()}
  else if(kind==='trophy'){c.beginPath();c.moveTo(-6,-8);c.lineTo(6,-8);c.lineTo(4.6,2);c.lineTo(-4.6,2);c.closePath();c.fill();c.beginPath();c.moveTo(-6,-7);c.quadraticCurveTo(-9,-4,-4.5,-1.5);c.stroke();c.beginPath();c.moveTo(6,-7);c.quadraticCurveTo(9,-4,4.5,-1.5);c.stroke();c.fillRect(-2,2,4,4);c.fillRect(-6,6,12,2.5);c.fillStyle=bg;c.fillRect(-4.6,-7,9.2,1.6)}
  else if(kind==='crown'){c.beginPath();c.moveTo(-8,5);c.lineTo(-8,-4);c.lineTo(-3.5,0.5);c.lineTo(0,-6);c.lineTo(3.5,0.5);c.lineTo(8,-4);c.lineTo(8,5);c.closePath();c.fill();c.fillStyle=bg;c.beginPath();c.arc(0,1.5,2,0,TAU);c.fill();c.fillRect(-8,5,16,2.5)}
  else if(kind==='bolt'){c.beginPath();c.moveTo(2,-9);c.lineTo(-5,1);c.lineTo(-1,1);c.lineTo(-2.5,9);c.lineTo(5,-2);c.lineTo(0.5,-2);c.closePath();c.fill()}
  else if(kind==='torii'){c.lineWidth=2.2;c.beginPath();c.moveTo(-9,-7.5);c.lineTo(9,-7.5);c.moveTo(-9.5,-3.5);c.lineTo(9.5,-3.5);c.moveTo(-6.5,-6);c.lineTo(-6.5,9);c.moveTo(6.5,-6);c.lineTo(6.5,9);c.stroke();c.lineWidth=1.8;c.beginPath();c.moveTo(-9,-7.5);c.quadraticCurveTo(0,-10.5,9,-7.5);c.stroke();c.beginPath();c.moveTo(-6.5,6);c.lineTo(6.5,6);c.stroke()}
  c.restore()}
/* small drawn padlock (replaces emoji padlocks everywhere — art rule: no emoji) */
function drawPadlock(c,x,y,s,col){c.save();c.translate(x,y);c.scale(s/10,s/10);
  c.strokeStyle=col;c.lineWidth=2.2;c.lineCap='round';
  c.beginPath();c.arc(0,-3,4.6,Math.PI,0);c.stroke();
  c.fillStyle=col;rr(c,-6.5,-3,13,10.5,2.5);c.fill();
  c.fillStyle='rgba(255,255,255,.75)';c.beginPath();c.arc(0,1.6,1.7,0,TAU);c.fill();
  c.restore()}
/* tiny drawn lightning glyph (replaces the ⚡ emoji everywhere) */
function boltGlyph(c,x,y,s,col){c.save();c.translate(x,y);c.scale(s/10,s/10);c.fillStyle=col;
  c.beginPath();c.moveTo(2,-9);c.lineTo(-5,1);c.lineTo(-1,1);c.lineTo(-2.5,9);c.lineTo(5,-2);c.lineTo(0.5,-2);c.closePath();c.fill();c.restore()}
function drawTopBar(title,back){
  woodBar();
  if(back){drawBackArrow(cx,40,27,21);BTN('back',14,8,54,40,pop,{flat:true,nohov:true})}
  if(title)txt(cx,title,back?74:18,27,21,'#fff','left',5,'#5a3b16',700);
  const stats=[[fmt(SV.xp),'XP','#c07a10'],[fmt(SV.cf),'CF','#2a8a4a'],[fmt(SV.energy)+'/'+energyMax(),'⚡','#1a6a9a'],['RANK '+SV.rank,'','#8a3ab8']];
  // (energy regen countdown intentionally not shown — matches the original, which refills silently)
  // one compact pill group: all four stats in a single rounded tray, right margin ≥8px at 1280.
  // metrics: leading inset 9 + per item [dot 12 + value + (label|bolt)] + 9 pad + 1 divider + 9 pad; last item trailing 18.
  cx.textBaseline='middle';
  let tfs=14;
  const pillW=s=>{let w=9;for(const[pre,lab]of stats){cx.font=FONT(s,700);let iw=12+cx.measureText(pre).width;
    if(lab==='⚡')iw+=15;else if(lab){cx.font=FONT(s-3.5,700);iw+=5+cx.measureText(lab).width}
    w+=iw+19}
    return w-1};
  while(pillW(tfs)>392&&tfs>10.5)tfs-=0.5;
  const pw=pillW(tfs),px=1272-pw,py=9,ph=36,pcy=py+ph/2;
  cx.fillStyle='#fff8e8';rr(cx,px,py,pw,ph,18);cx.fill();
  cx.lineWidth=2;cx.strokeStyle='rgba(90,59,22,.55)';rr(cx,px+1,py+1,pw-2,ph-2,17);cx.stroke();
  cx.lineWidth=1;cx.strokeStyle='rgba(255,255,255,.65)';rr(cx,px+3.5,py+3.5,pw-7,ph-7,14.5);cx.stroke();
  let x=px+9;
  stats.forEach(([pre,lab,col],i)=>{
    cx.fillStyle=col;cx.beginPath();cx.arc(x+4,pcy,4,0,TAU);cx.fill();
    cx.fillStyle='rgba(255,255,255,.55)';cx.beginPath();cx.arc(x+3,pcy-1.4,1.4,0,TAU);cx.fill();
    cx.font=FONT(tfs,700);
    txt(cx,pre,x+12,pcy+0.5,tfs,BROWN,'left',2.5,'#fff',700);
    x+=12+cx.measureText(pre).width;
    if(lab==='⚡'){boltGlyph(cx,x+5,pcy,10,col);x+=15}
    else if(lab){cx.font=FONT(tfs-3.5,700);const lw2=cx.measureText(lab).width;
      txt(cx,lab,x+5,pcy+1,tfs-3.5,'rgba(90,59,22,.8)','left',2,'#fff',700);x+=5+lw2}
    x+=9;
    if(i<stats.length-1){cx.strokeStyle='rgba(90,59,22,.22)';cx.lineWidth=1.2;cx.beginPath();cx.moveTo(x,py+9);cx.lineTo(x,py+ph-9);cx.stroke();x+=1}
    x+=9});
}
function panel(x,y,w,h,col,bd){cx.fillStyle=col||'rgba(22,25,36,.96)';rr(cx,x,y,w,h,16);cx.fill();if(bd!==false){cx.lineWidth=2;cx.strokeStyle=bd||'rgba(255,255,255,.14)';rr(cx,x+1,y+1,w-2,h-2,16);cx.stroke()}}
function toastDraw(dt){let y=70;for(const t of G.toasts){t.t-=dt;t.age=(t.age||0)+dt;
  const enter=clamp(t.age/0.28,0,1); // slide-in spring
  const eIn=1-Math.pow(1-enter,3);
  const overshoot=enter<1?Math.sin(enter*Math.PI)*6:0;
  const yOff=(1-eIn)*-46-overshoot;
  const a=Math.min(eIn,clamp(t.t,0,1)); // fade-in + tail fade-out
  cx.globalAlpha=a;
  cx.font=FONT(17,700);const wd=cx.measureText(t.msg).width+64;
  const bx=640-wd/2;
  cx.save();cx.translate(0,yOff);
  // drop shadow under the chip
  cx.fillStyle='rgba(40,26,8,.28)';rr(cx,bx+2,y+5,wd,40,20);cx.fill();
  cx.fillStyle='rgba(255,248,232,.96)';rr(cx,bx,y,wd,40,20);cx.fill();
  // icon dot (toast color) with glossy highlight
  cx.fillStyle=t.col;cx.beginPath();cx.arc(bx+26,y+20,10,0,TAU);cx.fill();
  cx.fillStyle='rgba(255,255,255,.45)';cx.beginPath();cx.arc(bx+24,y+17,3.4,0,TAU);cx.fill();
  cx.lineWidth=2.5;cx.strokeStyle=t.col;rr(cx,bx,y,wd,40,20);cx.stroke();
  txt(cx,t.msg,bx+46,y+20,17,shade(t.col,.62),'left',3,'#fff',700);
  cx.restore();
  y+=48;cx.globalAlpha=1}G.toasts=G.toasts.filter(t=>t.t>0)}
function modalDraw(){const m=G.modal;if(!m)return;
  m.age=(m.age||0)+1/60; // ~seconds since open (rAF-paced)
  const pop=Math.min(1,m.age/0.18); // quick pop-in (cubic out + tiny overshoot)
  const e=1-Math.pow(1-pop,3);const sc=0.92+e*0.08+Math.sin(pop*Math.PI)*0.02;
  const fade=clamp(m.age/0.14,0,1);
  cx.save();cx.globalAlpha=fade;
  cx.fillStyle='rgba(40,24,8,.6)';cx.fillRect(0,0,1280,720);
  let h=150+m.lines.length*30+(m.drawExtra?320:0);
  if(m.title&&m.title.startsWith('DAILY MISSIONS'))h=612; // 6 mission rows need a taller board
  if(m.title&&m.title.startsWith('TREASURE RADAR'))h=612; // tab pills + 6 radar rows + digest footer
  if(m.title&&m.title.startsWith('FARM:'))h=560; // 5 stage-picker rows + footer
  const w=Math.min(760,1180);
  // pop-in: purely visual transform — all drawing/hit coords below stay in FINAL
  // (unscaled) design space so hit rects stay valid even mid-animation
  cx.translate(640,360);cx.scale(sc,sc);cx.translate(-640,-360);
  const x=640-w/2,y=360-h/2;
  creamPanel(x,y,w,h,'#c8913a');cx.lineWidth=4;cx.strokeStyle='#8a5a20';rr(cx,x,y,w,h,16);cx.stroke();
  // title ribbon shadow for depth
  cx.fillStyle='rgba(138,90,32,.16)';rr(cx,x+6,y+8,w-12,44,12);cx.fill();
  txt(cx,m.title,640,y+40,24,'#e8951f','center',6,'#fff',700);
  m.lines.forEach((l,i)=>txt(cx,l,640,y+80+i*28,16,'#5a4530','center',3,'#fff',400));
  if(m.drawExtra)m.drawExtra(x,y+90+m.lines.length*28,w,Math.max(120,h-160-m.lines.length*28));
  const bw=Math.min(240,(w-40)/m.btns.length-12);let bx=640-(bw*m.btns.length+12*(m.btns.length-1))/2;
  m.btns.forEach((b,i)=>{BTN('mb'+i,bx,y+h-64,bw,46,()=>{const cb=b.cb;G.modal=null;cb&&cb()},{col:b.col||GOLD,outline:GOLDLN,label:b.n,fs:18,tcol:'#4a2f10'});bx+=bw+12});
  cx.restore()}

/* ============================== SCREEN: TITLE / HOME ============================== */
'use strict';
/* ============================== AUTHENTIC TITLE SCREEN ==============================
   The real game's title: EoCBackground (orange sunburst + landmarks + cat crowd),
   the official MenuTitle logo, and the real Play button texture. Background swaps to
   ItF / CotC art as those campaigns are cleared (like the original). */
const UIIMG={imgs:{}};
function uiImg(name){
  let im=UIIMG.imgs[name];
  if(im===undefined){
    im=new Image();
    im.onload=()=>{UIIMG.imgs[name]=im};
    im.onerror=()=>{UIIMG.imgs[name]=null};
    im.src='assets/ui/'+name;
    UIIMG.imgs[name]=im;
  }
  return (im&&im.complete&&im.naturalWidth>0)?im:null;
}
function chapterClearedAny(id){const c=SV.cleared[id];if(!c)return false;for(const k in c)return true;return false}
function drawTitle(dt){
  // authentic title background — EoC by default, ItF/CotC art once those chapters are cleared
  const bgName=chapterClearedAny('cotc3')?'title_bg_cotc.png':chapterClearedAny('itf3')?'title_bg_itf.png':'title_bg.png';
  const bg=uiImg(bgName)||uiImg('title_bg.png');
  if(bg)cx.drawImage(bg,0,0,1280,720);
  else{ // first-frame fallback while the png streams in: flat orange sunburst
    const g=cx.createLinearGradient(0,0,0,720);g.addColorStop(0,'#ffa11f');g.addColorStop(.55,'#ffc235');g.addColorStop(1,'#ff8a1f');
    cx.fillStyle=g;cx.fillRect(0,0,1280,720);
    cx.save();cx.translate(640,300);cx.globalAlpha=.08;cx.fillStyle='#fff';
    for(let i=0;i<12;i++){cx.rotate(TAU/12);cx.beginPath();cx.moveTo(0,0);cx.lineTo(900,-70);cx.lineTo(900,70);cx.closePath();cx.fill()}
    cx.restore();
  }
  // official logo, gently bobbing (exact original artwork)
  const logo=uiImg('title_logo.png');
  if(logo){
    const lw=560,lh=lw*logo.naturalHeight/logo.naturalWidth;
    cx.save();cx.translate(640,200+Math.sin(G.t*1.5)*4);
    cx.rotate(-0.022);
    cx.shadowColor='rgba(130,60,0,.35)';cx.shadowBlur=16;cx.shadowOffsetY=6;
    cx.drawImage(logo,-lw/2,-lh/2,lw,lh);
    cx.restore();
  }else{ // streamed-in fallback: bouncy per-letter wordmark
    cx.save();cx.translate(640,215);cx.rotate(-0.04);
    cx.font=FONT(30);cx.textAlign='left';cx.lineWidth=8;cx.strokeStyle='#20303f';cx.strokeText('THE',-330,-38);cx.fillStyle='#fff';cx.fillText('THE',-330,-38);
    cx.textAlign='center';cx.lineJoin='round';
    const word=(s,x0,y0,size,fill,rim,ph)=>{cx.font=FONT(size);
      const widths=[...s].map(ch=>cx.measureText(ch).width);const tot=widths.reduce((a,b)=>a+b,0);
      let x=x0-tot/2;
      [...s].forEach((ch,i)=>{const yy=y0+Math.sin(G.t*2.2+ph+i*0.55)*5;const rot=Math.sin(G.t*1.7+ph+i*0.5)*0.06;
        cx.save();cx.translate(x+widths[i]/2,yy);cx.rotate(rot);
        cx.lineWidth=size*0.18;cx.strokeStyle='#20303f';cx.strokeText(ch,0,0);
        cx.lineWidth=size*0.10;cx.strokeStyle=rim;cx.strokeText(ch,0,0);
        cx.fillStyle=fill;cx.fillText(ch,0,0);cx.restore();
        x+=widths[i]})};
    word('Battle',-118,0,92,'#ffb0d8','#ff77b0',0);
    word('Cats',128,26,92,'#ffc93f','#2f6fd0',2.1);
    cx.restore();
  }
  // PLAY — the real button texture, pulsing like the original's attract mode
  {const bw=300,bh=84,by=396;
    cx.save();cx.translate(640,by);
    const pulse=1+Math.sin(G.t*4)*0.03;cx.scale(pulse,pulse);
    const pb=uiImg('play_button.png');
    if(pb){cx.drawImage(pb,-bw/2,-bh/2,bw,bh)}
    else{
      cx.shadowColor='rgba(255,150,0,.6)';cx.shadowBlur=26;cx.shadowOffsetY=4;
      const gg=cx.createLinearGradient(0,-bh/2,0,bh/2);gg.addColorStop(0,'#ffdf60');gg.addColorStop(.55,'#fdc321');gg.addColorStop(1,'#e89a10');
      cx.fillStyle=gg;rr(cx,-bw/2,-bh/2,bw,bh,20);cx.fill();
      cx.shadowColor='transparent';
      cx.lineWidth=3.5;cx.strokeStyle='#1a1208';rr(cx,-bw/2,-bh/2,bw,bh,20);cx.stroke();
      txt(cx,'Play',0,2,40,'#fff','center',7,'#1a1208',700);
    }
    cx.restore();
    BTN('play',640-bw/2,by-bh/2,bw,bh,()=>{SFX.click();push('home')},{flat:true,nohov:true})}
  txt(cx,'\u00A9 PONOS Corp.',14,18,13,'rgba(90,60,20,.9)','left',3,'rgba(255,235,200,.6)');
  txt(cx,'Version 12.6.0',1266,18,13,'rgba(90,60,20,.9)','right',3,'rgba(255,235,200,.6)');
}

/* ============================== CAT BASE MENU (authentic v11.10 layout) ==============================
   Teal karakusa double-doors fill the screen (Img009_3). LEFT door: user-rank bar +
   calendar, Start!!/Upgrade/Equip gold buttons, Menu/Gamatoto/Missions icons, back arrow.
   Door gap: storage fridge + capsule buttons on a wooden tray. RIGHT door: event banners,
   the Cat's speech bubble, and the big Cat peeking over the bottom bar (Store / Cat Food). */
const SPLASH_TIPS=[
  'Welcome to the Cat Base! Prepare yourself for battle here! When you\u2019re ready, attack!',
  'Have I mentioned Cat Treasures? They\u2019re really good. You can get a lot stronger just collecting Cat Treasures!',
  'You can read about our enemies in the Enemy Encyclopedia.',
  'Teaming up certain units will give bonuses to your battle abilities!',
  'I heard some enemies can survive even a lethal strike! Scary\u2026',
  'Clearing Event Stages sometimes gives you Items! Collect lots of items and use them to give you the upper hand during battle!',
  'If you end the battle within 10 seconds of entering combat, Energy spent will be restored! Don\u2019t worry, items chosen for that fight will be given back too!',
  'You can organize the cats you use in the Organize screen. Customize your Cat Army and start the battle!',
  'Praise is good! Praise that you deserve is even better! You deserve praise if you tried!',
  'Tap a stage\u2019s name to check what enemies will appear. You gotta play the stage at least once, though!',
  'It\u2019s okay to cry. It\u2019s okay to run away. You were not made that strong.',
  'Cat Jobs gives the most XP for your time! Try using this item on levels with already big XP rewards!'];
function splashTip(){const d=new Date();const day=Math.floor(d.getTime()/86400000);return SPLASH_TIPS[day%SPLASH_TIPS.length]}
/* word-wrap for the speech bubble */
function wrapText(c,s,maxW){const words=s.split(' ');const lines=[];let cur='';
  for(const w of words){const t=cur?cur+' '+w:w;
    if(c.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t}
  if(cur)lines.push(cur);return lines}
/* the big Cat face that peeks over the bottom bar (painted to match the original exactly) */
function bigCatFace(c,x,y,s){
  c.save();c.translate(x,y);c.scale(s,s);
  c.lineWidth=13;c.strokeStyle='#141414';c.lineJoin='round';c.fillStyle='#fff';
  // ears — short triangles sitting ON the head silhouette
  c.beginPath();c.moveTo(-118,-92);c.lineTo(-134,-176);c.lineTo(-38,-130);c.closePath();c.fill();c.stroke();
  c.beginPath();c.moveTo(118,-92);c.lineTo(134,-176);c.lineTo(38,-130);c.closePath();c.fill();c.stroke();
  // head
  c.beginPath();c.ellipse(0,0,178,152,0,0,TAU);c.fill();c.stroke();
  // eyes
  c.fillStyle='#141414';
  c.beginPath();c.arc(-58,-40,14,0,TAU);c.fill();
  c.beginPath();c.arc(58,-40,14,0,TAU);c.fill();
  // \u03c9 mouth: nose notch + side arcs + chin V (the iconic face)
  c.strokeStyle='#141414';c.lineWidth=11;c.lineCap='round';
  c.beginPath();
  c.moveTo(-46,10);
  c.quadraticCurveTo(-30,38,0,14);
  c.quadraticCurveTo(30,38,46,10);
  c.stroke();
  c.beginPath();c.moveTo(-11,-14);c.lineTo(0,-2);c.lineTo(11,-14);c.stroke(); // nose bridge
  c.beginPath();c.moveTo(-16,22);c.lineTo(0,52);c.lineTo(16,22);c.stroke();   // chin V
  c.restore();
}
function goldBtnAuth(id,y,label,h,cb,o){ // the original's gold bar buttons (Start!!/Upgrade/Equip)
  o=o||{};const bw=o.w||386,bh=h,x=o.x||26;
  const pu=(o.pulse?1+Math.sin(G.t*3.2)*0.012:1);
  cx.save();cx.translate(x+bw/2,y+bh/2);cx.scale(pu,pu);
  const gg=cx.createLinearGradient(0,-bh/2,0,bh/2);
  gg.addColorStop(0,'#ffe264');gg.addColorStop(.5,'#fdc321');gg.addColorStop(1,'#e8940f');
  cx.shadowColor='rgba(40,22,4,.5)';cx.shadowBlur=6;cx.shadowOffsetY=4;
  cx.fillStyle=gg;rr(cx,-bw/2,-bh/2,bw,bh,12);cx.fill();
  cx.shadowColor='transparent';
  cx.lineWidth=3.2;cx.strokeStyle='#221808';rr(cx,-bw/2,-bh/2,bw,bh,12);cx.stroke();
  cx.lineWidth=1.3;cx.strokeStyle='rgba(255,255,255,.75)';rr(cx,-bw/2+3.5,-bh/2+3.5,bw-7,bh-10,9);cx.stroke();
  txt(cx,label,0,1,o.fs||30,'#fff','center',6.5,'#221808',700);
  cx.restore();
  BTN(id,x,y,bw,bh,cb,{flat:true,nohov:true});
}
function drawHome(dt){
  ensureMissions();
  const mDone=MISSIONS.filter(m=>missionDone(m.id)&&!missionClaimed(m.id)).length;
  const doors=uiImg('doors_home.png');
  if(doors)cx.drawImage(doors,0,0,1280,720);
  else{const g=cx.createLinearGradient(0,0,0,720);g.addColorStop(0,'#8fb2a4');g.addColorStop(1,'#6f9a8a');cx.fillStyle=g;cx.fillRect(0,0,1280,720)}

  /* ===== top bar: "Cat Base" + area swap | XP counter ===== */
  {const g=cx.createLinearGradient(0,0,0,40);g.addColorStop(0,'#b57a35');g.addColorStop(1,'#7a4a18');
    cx.fillStyle=g;cx.fillRect(0,0,1280,40);
    cx.fillStyle='rgba(50,28,8,.5)';cx.fillRect(0,37,1280,3)}
  txt(cx,'Cat Base',16,21,25,'#fff','left',5.5,'rgba(56,32,8,.95)',700);
  { // swap-button (area select) — the \u21c4 chip beside the wordmark
    cx.fillStyle='#e8d8b8';rr(cx,150,6,40,28,7);cx.fill();
    cx.lineWidth=2.2;cx.strokeStyle='#5a3b16';rr(cx,150,6,40,28,7);cx.stroke();
    cx.strokeStyle='#5a3b16';cx.lineWidth=3;cx.lineCap='round';
    cx.beginPath();cx.moveTo(159,15);cx.lineTo(179,15);cx.moveTo(174,11);cx.lineTo(180,15);cx.lineTo(174,19);cx.stroke();
    cx.beginPath();cx.moveTo(181,25);cx.lineTo(161,25);cx.moveTo(166,21);cx.lineTo(160,25);cx.lineTo(166,29);cx.stroke();
    BTN('hareas',150,6,40,28,()=>{SFX.click();push('chapters')},{flat:true,nohov:true})}
  { // XP: gold LED-style counter, tappable like the original's XP shop shortcut
    const s=fmt(SV.xp);cx.font=FONT(31,700);const w=cx.measureText(s).width;
    txt(cx,'XP',1258-w-46,21,20,'#ffd23f','left',4,'#5a3406',700);
    txt(cx,s,1258,22,31,'#ffd23f','right',5.5,'#5a3406',700);
    BTN('hxp',1080,4,190,32,()=>{SFX.click();push('store')},{flat:true,nohov:true})}

  /* ===== LEFT door ===== */
  // user-rank bar + (i) + calendar
  {const t1=800*Math.pow(SV.rank,1/0.55),t0=800*Math.pow(SV.rank-1,1/0.55);
    const fr=clamp((SV.xpTotal-t0)/Math.max(1,t1-t0),0,1);
    // (i) round button
    cx.fillStyle='#6a4416';cx.beginPath();cx.arc(42,86,17,0,TAU);cx.fill();
    cx.lineWidth=2.5;cx.strokeStyle='#3a250a';cx.stroke();
    cx.fillStyle='#e8d8b8';cx.beginPath();cx.arc(42,86,11.5,0,TAU);cx.fill();
    txt(cx,'i',42,87,15,'#5a3b16','center',3,'#fff',700);
    BTN('hinfo',25,69,34,34,()=>{SFX.click();openModal('THE BATTLE CATS',
      ['Version 12.6.0 \u00b7 fan replica built on the original assets',
       'User Rank '+SV.rank+' \u00b7 total XP '+fmt(SV.xpTotal)+' \u00b7 NP '+fmt(SV.np)],
      [{n:'CLOSE',cb:()=>{}}])},{flat:true,nohov:true});
    // rank bar (dark leather pill + gold LED number + fill)
    cx.fillStyle='#4a2e0e';rr(cx,68,68,252,36,18);cx.fill();
    cx.lineWidth=2.5;cx.strokeStyle='#2a1a06';rr(cx,68,68,252,36,18);cx.stroke();
    cx.fillStyle='rgba(0,0,0,.4)';rr(cx,150,76,158,20,10);cx.fill();
    if(fr>0){const pg=cx.createLinearGradient(150,0,308,0);pg.addColorStop(0,'#ffe264');pg.addColorStop(1,'#e8a010');
      cx.fillStyle=pg;rr(cx,150,76,Math.max(10,158*fr),20,10);cx.fill()}
    cx.lineWidth=1.5;cx.strokeStyle='rgba(255,220,140,.4)';rr(cx,150,76,158,20,10);cx.stroke();
    txt(cx,fmt(SV.xpTotal),229,87,19,'#ffd23f','center',4,'rgba(20,10,0,.9)',700);
    txt(cx,'RANK '+SV.rank,109,87,13,'#e8d8b8','center',3,'rgba(20,10,0,.9)',700);
    BTN('hrank',68,68,252,36,()=>{SFX.click();toast('User Rank '+SV.rank+' \u00b7 '+fmt(SV.xpTotal)+' XP collected','#ffd23f')},{flat:true,nohov:true});
    // calendar with cat face
    cx.save();cx.translate(356,86);
    cx.fillStyle='#f4ede0';rr(cx,-21,-19,42,38,5);cx.fill();
    cx.lineWidth=2.4;cx.strokeStyle='#5a3b16';rr(cx,-21,-19,42,38,5);cx.stroke();
    cx.fillStyle='#d83a2a';rr(cx,-21,-19,42,10,4);cx.fill();
    cx.fillStyle='#8a5a20';cx.fillRect(-13,-25,5,10);cx.fillRect(8,-25,5,10);
    cx.fillStyle='#4a3a28';cx.beginPath();cx.arc(-7,4,2.6,0,TAU);cx.arc(7,4,2.6,0,TAU);cx.fill();
    cx.strokeStyle='#4a3a28';cx.lineWidth=1.8;cx.beginPath();cx.arc(0,8,3.6,0.2,Math.PI-0.2);cx.stroke();
    cx.beginPath();cx.moveTo(-9,0);cx.lineTo(-6,-3);cx.lineTo(-3,0);cx.closePath();cx.fill();
    cx.beginPath();cx.moveTo(9,0);cx.lineTo(6,-3);cx.lineTo(3,0);cx.closePath();cx.fill();
    cx.restore();
    BTN('hcal',335,63,42,46,()=>{SFX.click();const evs=eventStages();
      openModal('EVENT CALENDAR',evs.length?evs.slice(0,6).map(e=>e.s.name+' \u00b7 '+e.s.energy+' energy'):['No events today \u2014 check the Store for daily deals!'],
      [{n:'VIEW EVENT STAGES',cb:()=>{G.chapter='event';G.mapSub=0;push('chapters')}},{n:'CLOSE',cb:()=>{}}])},{flat:true,nohov:true})}

  // Start!! / Upgrade / Equip (gold, authentic order + sizes)
  goldBtnAuth('hstart',124,'Start!!',72,()=>{G.mapSub=0;G.mapFocusIdx=null;push('map')},{pulse:true,fs:31});
  goldBtnAuth('hupg',206,'Upgrade',58,()=>{G.selCat=null;push('upgrade')},{fs:25});
  goldBtnAuth('hequip',272,'Equip',58,()=>push('equip'),{fs:25});

  // Menu / GAMATOTO / Missions — freestanding icons with labels beneath (original row)
  const bookDot=mDone>0||shrineInfo().freeLeft||expdAnyDone()||trophyClaimCount()||radarHotCount();
  const homeIcon=(id,cxp,label,drawFn,hot,hotCol,cb)=>{
    cx.save();cx.translate(cxp,398);
    cx.fillStyle='rgba(30,50,40,.18)';cx.beginPath();cx.ellipse(0,44,40,7,0,0,TAU);cx.fill();
    drawFn();
    if(hot){cx.save();cx.translate(34,-40);cx.rotate(Math.sin(G.t*5)*0.14);
      cx.fillStyle=hotCol||'#e84030';cx.beginPath();cx.arc(0,0,11,0,TAU);cx.fill();
      cx.lineWidth=2;cx.strokeStyle='rgba(60,20,10,.6)';cx.stroke();
      txt(cx,String(hot),0,0.5,11,'#fff','center',2,'rgba(60,20,10,.6)',700);cx.restore()}
    txt(cx,label,0,64,14.5,'#fff','center',4.5,'rgba(50,30,10,.9)',700);
    cx.restore();
    BTN(id,cxp-52,344,104,128,cb,{flat:true,nohov:true})};
  homeIcon('hbook',100,'Menu',()=>{ // open book with cat mark
    cx.save();cx.translate(0,-6);
    cx.fillStyle='#fffdf5';cx.beginPath();
    cx.moveTo(-34,-26);cx.quadraticCurveTo(-12,-34,0,-26);cx.quadraticCurveTo(12,-34,34,-26);
    cx.lineTo(34,22);cx.quadraticCurveTo(12,30,0,22);cx.quadraticCurveTo(-12,30,-34,22);cx.closePath();cx.fill();
    cx.lineWidth=3;cx.strokeStyle='#5a3b16';cx.stroke();
    cx.beginPath();cx.moveTo(0,-26);cx.lineTo(0,22);cx.stroke();
    cx.fillStyle='#e8951f';cx.beginPath();cx.arc(0,-2,9,0,TAU);cx.fill();
    cx.lineWidth=1.8;cx.strokeStyle='#7a4a08';cx.stroke();
    cx.fillStyle='#7a4a08';cx.beginPath();cx.arc(-3,-4,1.4,0,TAU);cx.arc(3,-4,1.4,0,TAU);cx.fill();
    cx.strokeStyle='#7a4a08';cx.lineWidth=1.4;cx.beginPath();cx.arc(0,-1,3,0.2,Math.PI-0.2);cx.stroke();
    cx.restore()},'','#e84030',()=>{SFX.click();openBookMenu()},0);
  homeIcon('hgamatoto',244,'GAMATOTO',()=>{ // pickaxe + white hard-hat with brim
    cx.save();cx.translate(0,-6);
    cx.strokeStyle='#8a5a20';cx.lineWidth=5;cx.lineCap='round';
    cx.beginPath();cx.moveTo(-30,26);cx.lineTo(14,-22);cx.stroke();
    cx.strokeStyle='#5a3b16';cx.lineWidth=5;
    cx.beginPath();cx.moveTo(-36,-18);cx.quadraticCurveTo(-2,-42,34,-16);cx.stroke();
    cx.fillStyle='#f2f4f8';cx.beginPath();cx.arc(14,0,15,Math.PI,0);cx.closePath();cx.fill();
    cx.lineWidth=2.4;cx.strokeStyle='#7a7e88';cx.stroke();
    cx.fillStyle='#d8dce4';rr(cx,-4,0,36,5,2.5);cx.fill();
    cx.strokeStyle='#7a7e88';cx.lineWidth=1.6;rr(cx,-4,0,36,5,2.5);cx.stroke();
    cx.fillStyle='#fff';cx.beginPath();cx.arc(9,-2,2,0,TAU);cx.arc(19,-2,2,0,TAU);cx.fill();
    cx.strokeStyle='#9aa0aa';cx.lineWidth=1.4;cx.beginPath();cx.arc(14,1,3,0.2,Math.PI-0.2);cx.stroke();
    cx.restore()},expdAnyDone()?'!':'','#3abc6a',()=>{SFX.click();push('expedition')},0);
  homeIcon('hmissions',388,'Missions',()=>{ // clipboard with red hearts
    cx.save();cx.translate(0,-6);cx.rotate(0.06);
    cx.fillStyle='#e8d8b8';rr(cx,-24,-30,48,60,6);cx.fill();
    cx.lineWidth=3;cx.strokeStyle='#5a3b16';rr(cx,-24,-30,48,60,6);cx.stroke();
    cx.fillStyle='#c8ccd4';rr(cx,-10,-36,20,12,4);cx.fill();
    cx.lineWidth=2;cx.strokeStyle='#5a5e66';rr(cx,-10,-36,20,12,4);cx.stroke();
    const heart=(hx,hy)=>{cx.fillStyle='#d83a2a';cx.save();cx.translate(hx,hy);cx.scale(1.15,1.15);
      cx.beginPath();cx.moveTo(0,3);cx.bezierCurveTo(-6,-3,-3,-8,0,-4);cx.bezierCurveTo(3,-8,6,-3,0,3);cx.closePath();cx.fill();cx.restore()};
    heart(-8,-12);heart(9,-12);heart(-8,4);heart(9,4);
    cx.strokeStyle='#8a7a5a';cx.lineWidth=2;cx.beginPath();cx.moveTo(-14,20);cx.lineTo(14,20);cx.moveTo(-14,26);cx.lineTo(6,26);cx.stroke();
    cx.restore()},mDone||'','#e84030',()=>{SFX.click();openMissionsModal()},0);

  // back-to-title round arrow (bottom-left)
  {cx.fillStyle='#fdc321';cx.beginPath();cx.arc(62,646,42,0,TAU);cx.fill();
    cx.lineWidth=4;cx.strokeStyle='#221808';cx.stroke();
    cx.fillStyle='rgba(255,255,255,.35)';cx.beginPath();cx.arc(62,646,35,Math.PI,TAU);cx.fill();
    drawBackArrow(cx,62,646,22);
    BTN('hback',20,604,84,84,()=>{SFX.click();push('title')},{flat:true,nohov:true})}

  /* ===== door gap: wooden tray with Storage + the two capsule buttons ===== */
  {const ty=576,tx=482,tw=318,th=104;
    cx.save();cx.translate(0,Math.sin(G.t*1.8)*0);
    cx.shadowColor='rgba(20,12,4,.5)';cx.shadowBlur=10;cx.shadowOffsetY=4;
    const tg=cx.createLinearGradient(0,ty,0,ty+th);tg.addColorStop(0,'#9a6a2e');tg.addColorStop(1,'#6a4416');
    cx.fillStyle=tg;rr(cx,tx,ty,tw,th,14);cx.fill();cx.restore();
    cx.lineWidth=3;cx.strokeStyle='#4a2e0e';rr(cx,tx,ty,tw,th,14);cx.stroke();
    cx.fillStyle='rgba(255,220,150,.14)';rr(cx,tx+3,ty+3,tw-6,12,8);cx.fill();
    // storage fridge
    {cx.save();cx.translate(tx+52,ty+42);
      cx.fillStyle='#dfe3e8';rr(cx,-20,-30,40,62,5);cx.fill();
      cx.lineWidth=2.4;cx.strokeStyle='#5a5e66';rr(cx,-20,-30,40,62,5);cx.stroke();
      cx.beginPath();cx.moveTo(-20,-8);cx.lineTo(20,-8);cx.stroke();
      cx.fillStyle='#8a8e96';cx.fillRect(6,-22,4,9);cx.fillRect(6,-4,4,7);
      cx.restore();
      txt(cx,'Storage',tx+52,ty+92,11,'#fff','center',3,'rgba(50,30,10,.95)',700);
      BTN('hstorage',tx+16,ty+8,72,88,()=>{SFX.click();
        const fruit=Object.entries(SV.fruit).filter(([,v])=>v>0).map(([k,v])=>k+' \u00d7'+v).join('  ')||'none yet';
        openModal('STORAGE',['Catfruit: '+fruit,'Tickets: '+SV.tickets.rare+' Rare \u00b7 '+SV.tickets.gold+' Gold \u00b7 '+SV.tickets.plat+' Platinum','NP: '+fmt(SV.np),'Leadership: '+(SV.leadership!=null?SV.leadership:'-')],
          [{n:'CLOSE',cb:()=>{}}])},{flat:true,nohov:true})}
    // capsule buttons (green normal / yellow rare) — cat-face capsules like the original tray
    const capBtn=(id,cxp,fill,rim,label,count,cb)=>{
      cx.save();cx.translate(cxp,ty+44);
      const bob=Math.sin(G.t*2.4+cxp)*2.5;cx.translate(0,bob);
      const cg=cx.createRadialGradient(-8,-12,4,0,-6,34);cg.addColorStop(0,'#fff');cg.addColorStop(.35,fill);cg.addColorStop(1,rim);
      cx.fillStyle=cg;cx.beginPath();cx.arc(0,0,26,0,TAU);cx.fill();
      cx.lineWidth=3;cx.strokeStyle=shade(rim,.65);cx.stroke();
      cx.fillStyle='rgba(255,255,255,.55)';cx.beginPath();cx.ellipse(-9,-9,8,5,-0.6,0,TAU);cx.fill();
      cx.fillStyle='#3a2a1a';cx.beginPath();cx.arc(-8,-4,2.6,0,TAU);cx.arc(8,-4,2.6,0,TAU);cx.fill();
      cx.strokeStyle='#3a2a1a';cx.lineWidth=2;cx.beginPath();cx.arc(0,0,4.4,0.15,Math.PI-0.15);cx.stroke();
      cx.fillStyle=shade(rim,.7);cx.beginPath();cx.moveTo(-15,-18);cx.lineTo(-18,-29);cx.lineTo(-8,-21);cx.closePath();cx.fill();
      cx.beginPath();cx.moveTo(15,-18);cx.lineTo(18,-29);cx.lineTo(8,-21);cx.closePath();cx.fill();
      cx.restore();
      // label plate
      cx.fillStyle='#fffdf5';rr(cx,cxp-52,ty+74,104,20,9);cx.fill();
      cx.lineWidth=1.8;cx.strokeStyle='#8a5a20';rr(cx,cxp-52,ty+74,104,20,9);cx.stroke();
      cx.font=FONT(9.5,700);
      let lab=label;while(cx.measureText(lab).width>98&&lab.length>4)lab=lab.slice(0,-2);
      txt(cx,lab+(lab===label?'':'\u2026'),cxp,ty+85,9.5,'#5a3b16','center',2.5,'#fff',700);
      if(count!=null){cx.save();cx.translate(cxp+30,ty+18);
        cx.fillStyle='#e84030';cx.beginPath();cx.arc(0,0,12,0,TAU);cx.fill();
        cx.lineWidth=2;cx.strokeStyle='#7a1a10';cx.stroke();
        txt(cx,String(count),0,0.5,11,'#fff','center',2,'#7a1a10',700);cx.restore()}
      BTN(id,cxp-46,ty+6,92,92,cb,{flat:true,nohov:true})};
    capBtn('hcapN',tx+140,'#7fe89a','#3a9a5a','Cat capsule',null,()=>{SFX.click();G.gachaSel=0;push('gacha')});
    capBtn('hcapR',tx+248,'#ffe264','#e8940f','Rare Cat capsule',SV.tickets.rare,()=>{SFX.click();G.gachaSel=0;push('gacha')})}

  /* ===== RIGHT door: event banners + (i) + speech bubble + the big Cat ===== */
  try{
    const evs=eventStages();const ban=activeBanners();
    const banners=[];
    if(ban.length)banners.push([ban[0].n,'#c86adf','#5a1a7a',()=>{G.gachaSel=0;push('gacha')}]);
    banners.push(['Special Sale!','#3aa05a','#1a5a2a',()=>{SFX.click();push('store')}]);
    banners.forEach((bn,i)=>{
      const bw2=176,bh2=42,bx=868+i*184,by=66+Math.sin(G.t*2.2+i*1.9)*2.5;
      cx.save();cx.translate(bx,by); // NOTE: everything (fill/stroke/arrows/label) draws INSIDE this translate
      cx.shadowColor='rgba(20,12,4,.4)';cx.shadowBlur=5;cx.shadowOffsetY=2;
      const bg2=cx.createLinearGradient(-bw2/2,0,bw2/2,0);bg2.addColorStop(0,bn[2]);bg2.addColorStop(.5,bn[1]);bg2.addColorStop(1,bn[2]);
      cx.fillStyle=bg2;rr(cx,-bw2/2,-bh2/2,bw2,bh2,10);cx.fill();
      cx.shadowColor='transparent';
      cx.lineWidth=2.2;cx.strokeStyle=bn[2];rr(cx,-bw2/2,-bh2/2,bw2,bh2,10);cx.stroke();
      cx.fillStyle='#ffd23f';cx.beginPath();cx.moveTo(-bw2/2+14,0);cx.lineTo(-bw2/2+22,-7);cx.lineTo(-bw2/2+22,7);cx.closePath();cx.fill();
      cx.beginPath();cx.moveTo(bw2/2-14,0);cx.lineTo(bw2/2-22,-7);cx.lineTo(bw2/2-22,7);cx.closePath();cx.fill();
      let nm=bn[0];cx.font=FONT(13.5,700);while(cx.measureText(nm).width>bw2-56&&nm.length>4)nm=nm.slice(0,-2);
      txt(cx,nm+(nm===bn[0]?'':'\u2026'),0,0.5,13.5,'#fff','center',3.5,'rgba(20,10,20,.9)',700);
      cx.restore();
      BTN('hbann'+i,bx-bw2/2,by-bh2/2,bw2,bh2,bn[3],{flat:true,nohov:true})});
    // green (i) at the far right of the banner row
    cx.fillStyle='#2a8a4a';cx.beginPath();cx.arc(1258,66,16,0,TAU);cx.fill();
    cx.lineWidth=2.5;cx.strokeStyle='#1a5a30';cx.stroke();
    txt(cx,'i',1258,67,17,'#fff','center',3,'#1a5a30',700);
    BTN('hinfo2',1242,50,32,32,()=>{SFX.click();
      openModal('CAT BASE INFO',['The Cat Base is your home front.','Send the Cat Army to battle with Start!!, organize it in Equip,','and power it up in Upgrade.','Daily deals wait in the Store. Good luck!'],[{n:'CLOSE',cb:()=>{}}])},{flat:true,nohov:true});
  }catch(e){}

  // big Cat (right corner, chin seated behind the bottom bar) + speech bubble
  bigCatFace(cx,1130,568,1.0);
  {const tip=splashTip();
    cx.font=FONT(13.5,700);
    const lines=wrapText(cx,tip,300);
    const bw2=336,bh2=lines.length*20+26,bx=1128-258,by=398-bh2;
    cx.fillStyle='rgba(20,14,6,.25)';rr(cx,bx+3,by+4,bw2,bh2,14);cx.fill();
    cx.fillStyle='#f6f6ef';rr(cx,bx,by,bw2,bh2,14);cx.fill();
    cx.lineWidth=3;cx.strokeStyle='#3a3a40';rr(cx,bx,by,bw2,bh2,14);cx.stroke();
    cx.fillStyle='#f6f6ef';cx.beginPath();cx.moveTo(bx+bw2-108,by+bh2-3);cx.lineTo(bx+bw2-52,by+bh2+30);cx.lineTo(bx+bw2-58,by+bh2-3);cx.closePath();cx.fill();
    cx.strokeStyle='#3a3a40';cx.lineWidth=3;
    cx.beginPath();cx.moveTo(bx+bw2-110,by+bh2-2);cx.lineTo(bx+bw2-52,by+bh2+30);cx.stroke();
    cx.beginPath();cx.moveTo(bx+bw2-52,by+bh2+30);cx.lineTo(bx+bw2-56,by+bh2-2);cx.stroke();
    lines.forEach((l,i)=>txt(cx,l,bx+bw2/2,by+22+i*20,13.5,'#3a3a40','center'));
    BTN('hcat',bx,by,bw2,bh2+20,()=>{SFX.meow?SFX.meow():SFX.click();toast(splashTip(),'#ffd23f')},{flat:true,nohov:true})}

  /* ===== bottom bar: Store + Cat Food ===== */
  {const g=cx.createLinearGradient(0,676,0,720);g.addColorStop(0,'#b57a35');g.addColorStop(1,'#7a4a18');
    cx.fillStyle=g;cx.fillRect(0,676,1280,44);
    cx.fillStyle='rgba(50,28,8,.5)';cx.fillRect(0,676,1280,3)}
  { // Store button (gold pill + cart) — sits center-left in the bar like the original
    const bw2=260,bh2=38,bx=660,by=679;
    const gg=cx.createLinearGradient(0,by,0,by+bh2);gg.addColorStop(0,'#ffe264');gg.addColorStop(.55,'#fdc321');gg.addColorStop(1,'#e8940f');
    cx.fillStyle=gg;rr(cx,bx,by,bw2,bh2,19);cx.fill();
    cx.lineWidth=3;cx.strokeStyle='#221808';rr(cx,bx,by,bw2,bh2,19);cx.stroke();
    glyph(cx,'cart',bx+52,by+bh2/2,11,'#fff','rgba(0,0,0,0)');
    txt(cx,'Store',bx+bw2/2+22,by+bh2/2+1,24,'#fff','center',5.5,'#221808',700);
    BTN('hstore',bx,by,bw2,bh2,()=>{SFX.click();push('store')},{flat:true,nohov:true})}
  { // Cat Food: label + can icon + counter (right end of the bar, like the original)
    cx.save();cx.translate(1188,698);
    cx.fillStyle='#d83a2a';rr(cx,-16,-14,32,28,6);cx.fill();
    cx.lineWidth=2.4;cx.strokeStyle='#7a1a10';rr(cx,-16,-14,32,28,6);cx.stroke();
    cx.fillStyle='#e8e4da';rr(cx,-16,-18,32,10,4);cx.fill();
    cx.lineWidth=1.8;cx.strokeStyle='#7a1a10';cx.beginPath();cx.moveTo(-16,-12);cx.lineTo(16,-12);cx.stroke();
    cx.fillStyle='#fff';cx.beginPath();cx.arc(0,2,7.5,0,TAU);cx.fill();
    cx.fillStyle='#d83a2a';cx.beginPath();cx.arc(-2,0.5,1.2,0,TAU);cx.arc(2,0.5,1.2,0,TAU);cx.fill();
    cx.strokeStyle='#d83a2a';cx.lineWidth=1.2;cx.beginPath();cx.arc(0,3.5,2.6,0.2,Math.PI-0.2);cx.stroke();
    cx.fillStyle='#ffd23f';cx.beginPath();cx.arc(14,12,8,0,TAU);cx.fill();
    cx.lineWidth=1.8;cx.strokeStyle='#7a4a08';cx.stroke();
    txt(cx,'+',14,12.5,12,'#7a4a08','center',2,'#fff',700);
    cx.restore();
    txt(cx,'Cat Food',1160,698,15,'#fff','right',4,'rgba(56,32,8,.95)',700);
    txt(cx,fmt(SV.cf),1262,698,24,'#ffd23f','right',4.5,'#5a3406',700);
    BTN('hcf',1128,680,152,38,()=>{SFX.click();push('store')},{flat:true,nohov:true})}
}

/* ---- MENU BOOK overlay (the original's open-book menu) ---- */
function openBookMenu(){SFX.click();
  openModal('MENU — BASE GUIDE',['Everything in your Cat Base, one book.'],[{n:'CLOSE',cb:()=>{}}],(mx,my,mw,mh)=>{
    const items=[
      ['cat','CAT GUIDE','View your Cat units & forms',()=>push('guide')],
      ['doge','ENEMY GUIDE','Enemy dictionary & stats',()=>push('guide')],
      ['chest','TREASURES','Treasure sets & radar',()=>push('treasure')],
      ['torii','CAT SHRINE','Pray for blessings',()=>push('shrine')],
      ['compass','EXPEDITIONS','Gamatoto scouting runs',()=>push('expedition')],
      ['trophy','TROPHIES','Catdex milestones',()=>push('trophies')],
      ['cannon','CAT BASE','Ototo base upgrades',()=>push('base')],
      ['scroll','MISSIONS','Daily missions',()=>openMissionsModal()],
      ['gear','SETTINGS','Options & data',()=>push('settings')]];
    const cols=3,rows=Math.ceil(items.length/cols);
    const tw=(mw-40-(cols-1)*10)/cols,th=88;
    items.forEach((it,i)=>{
      const cxx=mx+20+(i%cols)*(tw+10),cyy=my+8+Math.floor(i/cols)*(th+10);
      creamPanel(cxx,cyy,tw,th);
      cx.fillStyle='#c8913a';cx.beginPath();cx.arc(cxx+30,cyy+44,20,0,TAU);cx.fill();
      cx.lineWidth=2.5;cx.strokeStyle='#8a5a20';cx.stroke();
      glyph(cx,it[0],cxx+30,cyy+44,12,'#fff','#8a5a20');
      txt(cx,it[1],cxx+58,cyy+34,13,'#5a3b16','left',2.5,'#fff',700);
      txt(cx,it[2],cxx+58,cyy+54,9.5,'#8a7a5a','left');
      // hot dots
      let hot=null,hotCol='#e84030';
      if(it[0]==='chest')hot=radarHotCount()||null;
      if(it[0]==='torii'&&shrineInfo().freeLeft)hot='!';
      if(it[0]==='compass'&&expdAnyDone()){hot='!';hotCol='#3abc6a'}
      if(it[0]==='trophy'){const tc2=trophyClaimCount();hot=tc2||null;hotCol='#c46adf'}
      if(it[0]==='scroll')hot=MISSIONS.filter(m=>missionDone(m.id)&&!missionClaimed(m.id)).length||null;
      if(hot){cx.save();cx.translate(cxx+tw-16,cyy+14);cx.rotate(Math.sin(G.t*5)*0.12);
        cx.fillStyle=hotCol;cx.beginPath();cx.arc(0,0,10,0,TAU);cx.fill();
        cx.lineWidth=2;cx.strokeStyle='rgba(60,20,10,.6)';cx.stroke();
        txt(cx,String(hot),0,0.5,10,'#fff','center',2,'rgba(60,20,10,.6)',700);cx.restore()}
      BTN('bk'+i,cxx,cyy,tw,th,()=>{G.modal=null;it[3]()},{flat:true,nohov:true,modal:true})});
    txt(cx,'GACHA & STORE live on the base field — tap the capsule cats!',mx+mw/2,my+mh-14,11.5,'#8a6a4a','center',2.5,'#fff',400)})}
function catOwnedCount(){return CATS.filter(c=>catOwned(c.id)).length}

/* ============================== MODAL: DAILY MISSIONS ============================== */
function openMissionsModal(){ensureMissions();SFX.click();
  const total=MISSIONS.length;
  const claimedN=MISSIONS.filter(m=>missionClaimed(m.id)).length;
  const claimableN=MISSIONS.filter(m=>missionDone(m.id)&&!missionClaimed(m.id)).length;
  openModal('DAILY MISSIONS — '+new Date().toLocaleDateString('en-US',{weekday:'long'}),
    [claimedN+'/'+total+' complete · '+claimableN+' ready to claim'],
    [{n:'CLOSE',cb:()=>{}}],(mx,my,mw,mh)=>{
    const tier=missionTier();
    // per-mission rows: icon medallion + name + REAL progress bar + action button
    MISSIONS.forEach((m,i)=>{
      const rowH=55,gapY=7; // compact 6-row stack: fits the drawExtra area (header line + rows + footer)
      const y=my+4+i*(rowH+gapY);
      const done=missionDone(m.id),cl=missionClaimed(m.id);
      const goal=missionGoal(m),cf=missionCF(m),prog=Math.min(SV.missions[m.id]||0,goal);
      // row plate (tinted when done/claimable)
      creamPanel(mx+10,y,mw-20,rowH,cl?'#9ab88a':(done?'#e8c37f':'#c8913a'));
      // icon medallion (pulses gold when claimable)
      const mcx2=mx+41,mcyy=y+rowH/2;
      if(done&&!cl){const pu=1+Math.sin(G.t*5)*0.1;
        cx.save();cx.translate(mcx2,mcyy);cx.scale(pu,pu);
        cx.fillStyle='#ffd23f';cx.beginPath();cx.arc(0,0,18,0,TAU);cx.fill();
        cx.lineWidth=2.5;cx.strokeStyle='#8a5a10';cx.stroke();
        glyph(cx,m.icon,0,0,10.5,'#5a3b16','#ffd23f');cx.restore()}
      else{cx.fillStyle=done?'#7fc86a':'#d8c8a0';cx.beginPath();cx.arc(mcx2,mcyy,18,0,TAU);cx.fill();
        cx.lineWidth=2.5;cx.strokeStyle=done?'#3a7a2a':'#a89a78';cx.stroke();
        glyph(cx,m.icon,mcx2,mcyy,10.5,done?'#1e4a14':'#6a5a3a',done?'#7fc86a':'#d8c8a0')}
      // mission name (goal number substituted) + reward line
      txt(cx,m.n.replace(/\d+/,String(goal)),mx+68,y+18,13,cl?'#6a7a5a':'#5a3b16','left',3,'#fff',700);
      txt(cx,'Reward: '+cf+' Cat Food'+(tier>0?' (scaled)':''),mx+68,y+36,9.5,'#8a7a5a','left');
      // REAL progress bar with numeric label
      const pbx=mx+mw-336,pbw=176,pby=y+rowH/2-8;
      cx.fillStyle='rgba(90,59,22,.16)';rr(cx,pbx,pby,pbw,12,6);cx.fill();
      const fr=clamp(prog/goal,0,1);
      const barCol=cl?'#7fc86a':(done?'#ffd23f':'#4a9ae8');
      if(fr>0){cx.fillStyle=barCol;rr(cx,pbx,pby,Math.max(10,pbw*fr),12,6);cx.fill();
        cx.fillStyle='rgba(255,255,255,.28)';rr(cx,pbx+1,pby+1.5,Math.max(8,pbw*fr-2),4,2);cx.fill()}
      cx.lineWidth=1.5;cx.strokeStyle='rgba(90,59,22,.4)';rr(cx,pbx,pby,pbw,12,6);cx.stroke();
      txt(cx,prog+' / '+goal,pbx+pbw/2,pby+16,10,done?'#1e7a3a':'#8a6a3a','center',2,'#fff',700);
      // action button / claimed tag
      if(cl){cx.fillStyle='#e8f4e0';rr(cx,mx+mw-138,y+11,114,32,16);cx.fill();
        cx.lineWidth=2;cx.strokeStyle='#5a8a4a';rr(cx,mx+mw-138,y+11,114,32,16);cx.stroke();
        txt(cx,'✔ CLAIMED',mx+mw-81,y+27.5,12,'#3a7a2a','center',2,'#fff',700)}
      else if(done)BTN('mclaim'+m.id,mx+mw-138,y+11,114,32,()=>{claimMission(m.id)},{col:'#ffd23f',outline:'#8a5a20',label:'CLAIM +'+cf,fs:12,r:16,modal:true});
      else BTN('mprog'+m.id,mx+mw-138,y+11,114,32,()=>{SFX.click();toast(m.n.replace(/\d+/,String(goal))+' — '+prog+'/'+goal+' · reward '+cf+' Cat Food','#ffb060')},{col:'#e8d8b0',outline:'#8a7a5a',label:'IN PROGRESS',fs:10.5,tcol:'#8a6a3a',r:16,modal:true})});
    // footer: rank-tier badge (last row ends my+374; badge sits safely below)
    const fy=my+mh-36;
    cx.save();cx.translate(mx+mw/2,fy);
    cx.fillStyle=tier>0?'#e8951f':'#c8b890';rr(cx,-190,-13,380,26,13);cx.fill();
    cx.lineWidth=2.5;cx.strokeStyle=tier>0?'#8a5210':'#8a7a5a';rr(cx,-190,-13,380,26,13);cx.stroke();
    txt(cx,tier>0?('RANK TIER '+tier+' — GOALS ×'+(1+tier*0.5)+' · CF ×'+(1+tier*0.25).toFixed(2)):'RANK TIER 1 — goals & rewards grow every 10 ranks',0,0.5,10,tier>0?'#fff':'#6a5a42','center',2,tier>0?'#7a4a08':'#fff',700);
    cx.restore();
    txt(cx,'Missions reset daily · streak logins in the Store pay bigger daily bonuses',mx+mw/2,my+mh-8,10.5,'#a89878','center',2,'#fff',400)})}

/* ============================== MODAL: COMBO DETAIL (tap a combo tile) ============================== */
function openComboDetail(cb){SFX.click();
  const effLine=Object.entries(cb.eff).map(([k,v])=>EFF_LABEL[k](v)).join('  ·  ');
  const allOwn2=cb.ids.every(i2=>catOwned(i2));
  const inUse2=cb.ids.every(i2=>SV.teams[SV.teamSel].includes(i2));
  const btns2=[{n:'CLOSE',cb:()=>{}}];
  if(allOwn2&&!inUse2)btns2.unshift({n:'ADD TO TEAM',col:'#7fe8a0',cb:()=>{
    const t=SV.teams[SV.teamSel];
    const rest=t.filter(id=>id&&!cb.ids.includes(id));
    const nt=cb.ids.concat(rest).slice(0,10);while(nt.length<10)nt.push('');
    SV.teams[SV.teamSel]=nt;persist();SFX.up();toast(cb.n+' equipped — combo active!','#7fe8a0')}});
  openModal(cb.n,[effLine],btns2,(mx,my,mw,mh)=>{
    const n=cb.ids.length,tileW=104,gap=14;
    const totalW=n*tileW+(n-1)*gap;let x0=mx+mw/2-totalW/2;
    cb.ids.forEach((id,i2)=>{const own=catOwned(id);const on=SV.teams[SV.teamSel].includes(id);
      const x=x0+i2*(tileW+gap),y=my+8;
      creamPanel(x,y,tileW,120,on?'#d8913a':'#cbb384');
      ART.catIcon(id,x+tileW/2,y+44,26,own?undefined:0.16);
      txt(cx,CATMAP[id].forms[0].n,x+tileW/2,y+86,10.5,own?'#5a4530':'#a89878','center',3,'#fff',700);
      // rarity underline bar
      cx.fillStyle=RAR_COL[CATMAP[id].rarity];rr(cx,x+14,y+96,tileW-28,5,2.5);cx.fill();
      if(on)txt(cx,'✔ TEAM',x+tileW/2,y+110,9.5,'#3a7a2a','center',2,'#fff',700);
      else if(own)txt(cx,'OWNED',x+tileW/2,y+110,9.5,'#8a7a5a','center',2,'#fff',700);
      else txt(cx,'NOT FOUND',x+tileW/2,y+110,9.5,'#c05040','center',2,'#fff',700);
      if(i2<n-1)txt(cx,'+',x+tileW+gap/2,y+60,20,'#a89878','center')});
    const allOwn=allOwn2;
    const tip=inUse2?'Active with your current team \u2014 bonuses apply in battle!':(allOwn?'All cats owned \u2014 tap ADD TO TEAM to activate!':'Missing cats can be found in Gacha banners and story unlocks.');
    txt(cx,tip,mx+mw/2,my+mh-30,12.5,allOwn?'#3a7a2a':'#8a6a3a','center',3,'#fff',400)})}

/* ============================== SCREEN: CHAPTER SELECT ============================== */
function drawChapters(dt){
  // campaign select styled like the original brown chrome + parchment
  const g=cx.createLinearGradient(0,0,0,54);g.addColorStop(0,'#c98a3c');g.addColorStop(1,'#8a5a20');
  cx.fillStyle=g;cx.fillRect(0,0,1280,54);
  cx.fillStyle='rgba(60,35,10,.4)';cx.fillRect(0,52,1280,3);
  txt(cx,'Campaign Select',86,28,26,'#fff','left',5,'#5a3b16',400);
  // XP display right
  cx.fillStyle='#ffd23f';rr(cx,1050,8,216,38,10);cx.fill();cx.lineWidth=3;cx.strokeStyle='#5a3b16';rr(cx,1050,8,216,38,10);cx.stroke();
  txt(cx,'XP',1070,28,20,'#fff','left',4,'#5a3b16',700);txt(cx,fmt(SV.xp),1254,28,22,'#fff','right',4,'#5a3b16',700);
  drawBackArrow(cx,38,27,20);BTN('back',10,7,56,40,pop,{flat:true,nohov:true});
  // parchment body
  const pg=cx.createLinearGradient(0,54,0,720);pg.addColorStop(0,'#f2e3c0');pg.addColorStop(1,'#e0c890');
  cx.fillStyle=pg;cx.fillRect(0,54,1280,666);
  cx.strokeStyle='rgba(120,90,40,.25)';cx.lineWidth=2;
  for(let i=0;i<8;i++){cx.beginPath();cx.moveTo(0,90+i*84);cx.bezierCurveTo(400,74+i*84,800,106+i*84,1280,90+i*84);cx.stroke()}
  const groups=[['story','EMPIRE OF CATS / INTO THE FUTURE / CATS OF THE COSMOS'],['sol','STORIES OF LEGEND'],['ul','UNCANNY LEGENDS'],['aku','THE AKU REALMS'],['dojo','CATCLAW DOJO'],['event','EVENT STAGES']];
  SCROLL('chl',0,54,1280,612,()=>G.scrollChap,v=>G.scrollChap=v,Math.max(0,CHAPTERS.length*74+groups.length*44-566));
  let y=80;let i=0;
  cx.save();cx.beginPath();cx.rect(0,54,1280,612);cx.clip(); // clip: cards scroll UNDER the top bar/bottom bar
  groups.forEach(([kind,label])=>{
    txt(cx,label,24,y-G.scrollChap,14,'#7a5a2a','left');y+=26;
    CHAPTERS.filter(c=>c.kind===kind).forEach(c=>{
      const unl=chapterUnlocked(c.id);const yy=y-G.scrollChap; // scroll subtracts (rows move up) — '+' trapped all rows below the fold off-screen
      const clearedN=c.kind==='story'?Object.keys(SV.cleared[c.id]||{}).length:0;
      // white panel with border
      cx.save();cx.translate(20,yy);
      cx.fillStyle=unl?'#ffffff':'#d8cfb8';rr(cx,0,0,1240,60,12);cx.fill();
      cx.lineWidth=unl?3:2;cx.strokeStyle=unl?'#3a3a44':'#a89a78';rr(cx,1.5,1.5,1237,57,12);cx.stroke();
      if(unl)BTN('ch'+i,20,yy,1240,60,()=>{G.chapter=c.id;G.mapSub=0;G.mapFocusIdx=null;push('map');SFX.click()},{flat:true,nohov:true});
      cx.globalAlpha=unl?1:.55;
      if(c.id==='eoc1')ART.catIcon('cat',36,30,17);else if(c.id==='itf1')ART.catIcon('lizard',36,30,17);else if(c.id==='cotc1')ART.catIcon('gao',36,30,17);else if(c.kind==='sol')ART.catIcon('gross',36,30,17);else if(c.kind==='ul')ART.catIcon('luza',36,30,17);else if(c.kind==='aku')ART.enemyIcon('akumother',36,30,17);else if(c.kind==='dojo')ART.catIcon('kungfu',36,30,17);else ART.catIcon('mr',36,30,17);
      txt(cx,c.n,66,24,19,unl?'#e8a020':'#8a8272','left',4,'#fff',700);
      txt(cx,c.desc||'',66,44,13,'#8a7a5a','left');
      txt(cx,unl?(clearedN?(c.kind==='story'?clearedN+'/48 cleared':''):''):'',1128,20,13,'#8a7a5a','right');
      if(unl&&c.kind==='story'){ // crown total chip (sum of stage crowns /144) + completion progress bar
        const crc=SV.crowns[c.id]||{};let cn=0;for(const k in crc)cn+=crc[k];
        crownDraw(cx,1158,19,8.5,'#ffd23f','#8a5a10',cn===0);
        txt(cx,cn+'/144',1228,20,13,'#b08028','right',2,'#fff',700);
        const pn=clearedN/48;
        cx.fillStyle='rgba(90,59,22,.16)';rr(cx,930,42,240,10,5);cx.fill();
        if(pn>0){cx.fillStyle=pn>=1?'#5aa84a':'#e8951f';rr(cx,930,42,Math.max(9,240*pn),10,5);cx.fill()}
        cx.lineWidth=1.5;cx.strokeStyle='rgba(90,59,22,.4)';rr(cx,930,42,240,10,5);cx.stroke();
        txt(cx,Math.round(pn*100)+'%',1204,47.5,11,clearedN?'#8a6a3a':'#b8a884','right',2,'#fff',700)}
      if(!unl)txt(cx,'Locked',1216,30,14,'#a89a78','right');
      cx.globalAlpha=1;cx.restore();y+=66;i++});
    y+=14});cx.restore();brownBottomBar()
}

function drawMap(dt){const c=CHMAP[G.chapter];
  /* ================= STAGE-SELECT MAP =================
     Story chapters (EoC/ItF): REAL Earth map — the official parchment world map with
     stage nodes placed on real geographic positions (lon/lat), panned/zoomed like the original.
     Other modes keep the parchment serpentine layout. */
  drawTopBar(c.kind==='story'?'Stage Select':c.n,false);
  cx.fillStyle='#4a3319';cx.fillRect(0,54,1280,666); // dark wood backboard behind the map
  const isRealMap=c.kind==='story'&&G.chapter!=='eoc999'; // story = real geography
  const GEO=isRealMap?(GEO_EOC&&GEO_EOC.length===(c.names||[]).length&&c.names===COUNTRY?GEO_EOC:(GEO_ITF&&GEO_ITF.length===(c.names||[]).length&&c.names===FUT?GEO_ITF:null)):null;
  let useReal=isRealMap&&!!GEO&&!!earthMap(); // map image decoded
  let pts=[],mapW=1280,mapH=660;
  if(useReal){
    const im=earthMap();
    mapW=im.naturalWidth||2940;mapH=im.naturalHeight||1440;
    for(let i=0;i<c.names.length;i++){const g=GEO[i]||[0,0];const p=geo2map(g[0],g[1],mapW,mapH);pts.push({x:p[0],y:p[1]})}
    // a couple of stage names are long — spacing handled by the banner collision logic below
  }else{
    // ---- fallback: precomputed serpentine with per-stage jitter (deterministic per chapter) ----
    const kinds={story:{n:48,cols:6},sol:{n:SOL_SUBS.length,cols:6},ul:{n:UL_SUBS.length,cols:5},aku:{n:13,cols:5},dojo:{n:15,cols:5},event:{n:Math.max(1,G.lastEvents.length),cols:3}};
    const K=kinds[c.kind]||kinds.story;
    let seed=0;for(const ch of c.id)seed=(seed*31+ch.charCodeAt(0))>>>0;
    const cols=K.cols,sx=228,sy=172,x0=210,y0=180;
    const R=rnd(seed);
    for(let i=0;i<K.n;i++){const row=Math.floor(i/cols),k=i%cols;const col=(row%2===0)?k:(cols-1-k);
      pts.push({x:x0+col*sx+(R()-0.5)*54,y:y0+row*sy+(R()-0.5)*44})}
    mapW=Math.max(1280,x0+(cols-1)*sx+230);mapH=Math.max(660,y0+Math.ceil(K.n/cols)*sy+130);
  }
  const tint=useReal?(CH_TINT[G.chapter]||null):(c.kind==='aku'?'rgba(84,24,100,.20)':c.kind==='event'?'rgba(255,168,64,.12)':c.kind==='dojo'?'rgba(120,72,26,.14)':'');
  const scene=useReal?null:parchScene(Math.round(mapW),Math.round(mapH),tint);
  // ---- node state table ----
  const next=nextPlayableIdx(c);
  const clearedN=c.kind==='sol'||c.kind==='ul'?Object.keys(SV.cleared[c.id]||{}).length:0;
  const nodes=pts.map((p,i)=>{
    let label,energy,tap,boss=false,done=false,cur=false,unl=false,endless=false,ev=null;
    if(c.kind==='story'){const st=genStage(c.id,i);label=st.name;energy=st.energy;boss=!!st.boss;
      unl=stageUnlocked(c.id,i);done=!!(SV.cleared[c.id]&&SV.cleared[c.id][String(i)]);cur=unl&&i===next;
      tap=()=>openStageModal(c.id,i)}
    else if(c.kind==='sol'||c.kind==='ul'){const sub=(c.kind==='sol'?SOL_SUBS:UL_SUBS)[i];label=sub.n;energy=sub.energy;
      unl=i===0||clearedN>=i*8;done=clearedN>=(i+1)*8;cur=unl&&!done;tap=()=>{G.mapSub=i;push('submap');SFX.click()}}
    else if(c.kind==='aku'){label='Aku Gate '+(i+1);energy=AKU_GATES[i].energy;boss=i===12;
      unl=stageUnlocked('aku',i);done=!!(SV.cleared.aku&&SV.cleared.aku[String(i)]);cur=unl&&i===next;tap=()=>openStageModal('aku',i)}
    else if(c.kind==='dojo'){const ds=DOJO_STAGES[i];label=ds.n;energy=ds.energy;endless=!!ds.endless;
      unl=stageUnlocked('dojo',i);done=!!(SV.cleared.dojo&&SV.cleared.dojo[String(i)]);cur=unl&&!done&&!endless;tap=()=>openStageModal('dojo',i)}
    else{ev=G.lastEvents[i];if(ev){label=ev.s.name;energy=ev.s.energy;boss=false;
      done=!!(SV.eventsDone&&SV.eventsDone['clr:'+ev.s.evtId]);unl=true;cur=!done&&i===0;tap=()=>openEventModal(ev)}}
    return{p,label,energy,boss,done,cur,unl,endless,ev,tap}});
  // ---- camera: focus the current node (or the FARM SET target), clamp, drag-to-pan both axes ----
  if(G.mapFor!==c.id||!G.mapCam){const f=(G.mapFocusIdx!=null&&nodes[G.mapFocusIdx]&&nodes[G.mapFocusIdx].unl)?nodes[G.mapFocusIdx]:(nodes.find(n=>n.cur)||nodes[0]);
    G.mapCam={x:clamp(f.p.x-624,0,Math.max(0,mapW-1248)),y:clamp(f.p.y-330,0,Math.max(0,mapH-634))};G.mapFor=c.id}
  G.mapCam.x=clamp(G.mapCam.x,0,Math.max(0,mapW-1248));G.mapCam.y=clamp(G.mapCam.y,0,Math.max(0,mapH-634));
  if(G.pdown&&!G.mapDrag)G.mapDrag={sx:G.pdown.x,sy:G.pdown.y,cx:G.mapCam.x,cy:G.mapCam.y};
  if(!G.pdown)G.mapDrag=null;
  G.onDrag=(p,pd)=>{if(!G.mapDrag)return;const dx=p.x-G.mapDrag.sx,dy=p.y-G.mapDrag.sy;
    if(!pd.moved&&Math.abs(dx)+Math.abs(dy)>7)pd.moved=true;
    if(pd.moved){G.mapCam.x=clamp(G.mapDrag.cx-dx,0,Math.max(0,mapW-1248));G.mapCam.y=clamp(G.mapDrag.cy-dy,0,Math.max(0,mapH-634))}}; // GRAB-THE-WORLD (original): map content follows the finger
  // ---- map scene (real Earth for story chapters; parchment otherwise) ----
  cx.save();cx.beginPath();cx.rect(16,70,1248,634);cx.clip();
  if(useReal){
    const im=earthMap();
    cx.drawImage(im,16-G.mapCam.x,70-G.mapCam.y);
    if(tint){cx.fillStyle=tint;cx.fillRect(16-G.mapCam.x,70-G.mapCam.y,mapW,mapH)}
  }else{
    cx.drawImage(scene.cv,16-G.mapCam.x,70-G.mapCam.y);
  }
  cx.translate(-G.mapCam.x+16,-G.mapCam.y+70);
  // white dotted path winding through the nodes
  cx.strokeStyle='rgba(70,50,20,.35)';cx.lineWidth=7;cx.lineCap='round';cx.setLineDash([0.1,15]);
  cx.beginPath();
  for(let i=0;i<nodes.length-1;i++){if(i===0)cx.moveTo(nodes[0].p.x,nodes[0].p.y);cx.lineTo(nodes[i+1].p.x,nodes[i+1].p.y)}
  cx.stroke();
  cx.strokeStyle='rgba(255,255,255,.95)';cx.stroke();cx.setLineDash([]);
  // nodes: red dot + banner + energy + ribbons
  let markerNode=null;
  const placedB=[]; // placed banner rects — prevents name-banner/'Energy -N' pileups on dense rows
  const bHit=(a,b2)=>a.x<b2.x+b2.w+8&&a.x+a.w+8>b2.x&&a.y<b2.y+b2.h+8&&a.y+a.h+8>b2.y;
  for(let i=0;i<nodes.length;i++){const nd=nodes[i];const px=nd.p.x,py=nd.p.y;
    const vis=px>G.mapCam.x-140&&px<G.mapCam.x+1400&&py>G.mapCam.y-140&&py<G.mapCam.y+800;
    if(!vis)continue;
    if(nd.cur)markerNode=nd;
    const bW=nd.label.length>15?196:172,bH=42;
    const bx=clamp(px-bW/2,G.mapCam.x+26,G.mapCam.x+1248-bW-26);
    // banner placement with collision resolution: the reserved rect INCLUDES the 'Energy -N'
    // label zone under the plate, and fallback candidates keep ≥60px vertical spacing so
    // dense clusters (Taiwan/Philippines/Mongolia) never stack plates onto each other's labels
    let by=py-bH-34;
    const rect=()=>({x:bx,y:by-6,w:bW,h:bH+38});
    if(placedB.some(b2=>bHit(rect(),b2))){
      const cands=[py-bH-96,py+26,py-bH-158,py+88,py-bH-220,py+150];
      for(const cy of cands){by=cy;if(!placedB.some(b2=>bHit(rect(),b2)))break}}
    placedB.push(rect());
    // dot: red w/ white ring + thin dark edge
    if(nd.cur){const pl=0.5+0.5*Math.sin(G.t*4.5);
      cx.strokeStyle='rgba(255,196,64,'+(0.45+0.4*pl)+')';cx.lineWidth=6;
      cx.beginPath();cx.arc(px,py,17+pl*3,0,TAU);cx.stroke()}
    cx.fillStyle='rgba(70,50,20,.4)';cx.beginPath();cx.arc(px+1,py+2.5,11.5,0,TAU);cx.fill();
    cx.fillStyle='#e84030';cx.strokeStyle='#fff';cx.lineWidth=4;
    cx.beginPath();cx.arc(px,py,11,0,TAU);cx.fill();cx.stroke();
    cx.strokeStyle='rgba(40,16,10,.8)';cx.lineWidth=1.4;cx.beginPath();cx.arc(px,py,13.4,0,TAU);cx.stroke();
    if(nd.unl&&nd.tap)BTN('nd'+c.kind+i,bx-6-G.mapCam.x+16,by-8-G.mapCam.y+70,bW+12,bH+34,()=>{if(!G.pdown||!G.pdown.moved)nd.tap()},{flat:true,nohov:true});
    /* hit rect registered in SCREEN space: BTN hit tests run in design coords (toDesign),
       but this code draws under the mapCam translate — without the offset the banner's
       hitbox sat thousands of px off-screen and map taps never landed (r23 E2E finding) */
    /* Original map rule: only the CURRENT stage carries a name banner; cleared stages keep
       their small Clear! ribbon; every other stage is just a red dot — no plate, no energy
       label, no padlock clutter (the user's video showed this noise). */
    if(!(nd.cur||nd.done||nd.endless))continue;
    cx.save();cx.globalAlpha=nd.unl?1:0.5;
    // banner plate
    cx.save();cx.shadowColor='rgba(50,32,10,.35)';cx.shadowBlur=nd.cur?10:4;cx.shadowOffsetY=nd.cur?4:2;
    cx.fillStyle=nd.cur?'#ffffff':'#d4cfc2';rr(cx,bx,by,bW,bH,9);cx.fill();cx.restore();
    cx.lineWidth=nd.cur?3.5:2.5;cx.strokeStyle=nd.cur?'#2a2a34':'#8f887a';rr(cx,bx,by,bW,bH,9);cx.stroke();
    if(nd.cur){cx.lineWidth=1.2;cx.strokeStyle='rgba(240,160,32,.55)';rr(cx,bx+3.5,by+3.5,bW-7,bH-7,7);cx.stroke()}
    // stage name (current = gold on white; others = white on grey)
    const nm=nd.label.length>21?nd.label.slice(0,20)+'\u2026':nd.label;
    txt(cx,nm,bx+bW/2,by+bH/2+0.5,nd.cur?15.5:13.5,nd.cur?'#f09c1a':'#fdfdf8','center',nd.cur?4:3,nd.cur?'#5a3210':'#6a6458',700);
    // boss tilt ribbon
    if(nd.boss){cx.save();cx.translate(bx+bW-8,by+2);cx.rotate(0.14);
      ribbon(cx,0,0,58,20,'#e84030','#7a1a10');txt(cx,'BOSS',0,0.5,10.5,'#fff','center',2.5,'#7a1a10',700);cx.restore()}
    // cleared: Clear! ribbon + blue onward arrow
    if(nd.done){cx.save();cx.translate(bx+30,by-4);cx.rotate(-0.1);
      ribbon(cx,0,0,64,18,'#f4f0e4','#8f887a');txt(cx,'Clear!',0,0.5,10.5,'#4aa0e8','center',2.5,'#3a4a5a',700);cx.restore();
      const nb=nodes[i+1];
      if(nb){const ang=Math.atan2(nb.p.y-py,nb.p.x-px);
        cx.save();cx.translate(bx+bW+16,by+bH/2);cx.rotate(Math.abs(ang)<1.2?0:(ang<0?-0.6:0.6));
        cx.fillStyle='#4aa0e8';cx.beginPath();cx.moveTo(10,0);cx.lineTo(-4,-8);cx.lineTo(-4,8);cx.closePath();cx.fill();
        cx.lineWidth=1.6;cx.strokeStyle='#2a5a8a';cx.stroke();cx.restore()}}
    if(nd.endless){cx.save();cx.translate(bx+26,by-4);cx.rotate(-0.08);
      ribbon(cx,0,0,72,18,'#ffd23f','#8a5a10');txt(cx,'ENDLESS',0,0.5,10,'#7a4a08','center',2.5,'#fff',700);cx.restore()}
    if(nd.ev&&nd.done){cx.save();cx.translate(bx+32,by-4);cx.rotate(-0.08);
      ribbon(cx,0,0,72,18,'#5aa84a','#2e6a22');txt(cx,'CLEARED',0,0.5,10,'#fff','center',2.5,'#2e6a22',700);cx.restore()}
    // Energy -N (cyan number, white outline) — ONLY on the current stage (original)
    if(nd.cur){const eLbl='Energy -'+nd.energy;
      cx.font=FONT(12.5,700);const ew=cx.measureText(eLbl).width;
      const exs=bx+bW/2-ew/2;
      txt(cx,eLbl,exs,by+bH+13,12.5,'#e8fdff','left',3,'rgba(30,40,50,.85)',700);
      txt(cx,String(nd.energy),exs+cx.measureText('Energy -').width,by+bH+13,12.5,'#54e0f0','left',3,'rgba(30,40,50,.85)',700)}
    // crown pips row (story stages): earned gold / unearned dim — replays can top them up
    if(c.kind==='story'&&nd.done){const cn=(SV.crowns[c.id]&&SV.crowns[c.id][String(i)])||0;
      for(let k=0;k<3;k++)crownDraw(cx,bx+bW/2-17+k*17,by+bH+28,5.5,k<cn?'#ffd23f':'#c8bca0',k<cn?'#8a5a10':'#8a7a5a',k>=cn)}
    // TREASURE RADAR (story stages): set maps to stage i%9 — a gold diamond pinned beside the
    // node marks stages missing ONE piece (2/3), dim diamonds mark completed sets: farming at a glance
    if(c.kind==='story'&&nd.unl&&CHSETS[c.id]){const setIdx=i%9;const own=tCount(c.id,setIdx);
      if(own===2){const pu=1+Math.sin(G.t*5)*0.12;
        cx.save();cx.translate(px+24,py-24);cx.scale(pu,pu);
        cx.shadowColor='rgba(255,210,63,.7)';cx.shadowBlur=8;
        cx.fillStyle='#ffd23f';cx.beginPath();cx.moveTo(0,-8);cx.lineTo(7,0);cx.lineTo(0,8);cx.lineTo(-7,0);cx.closePath();cx.fill();
        cx.shadowBlur=0;cx.lineWidth=1.8;cx.strokeStyle='#8a5a10';cx.stroke();cx.restore();
        txt(cx,'2/3',px+34,py-24,9.5,'#5a3210','left',2.5,'#ffd23f',700)}
      else if(own===3){cx.save();cx.translate(px+24,py-24);
        cx.fillStyle='rgba(216,195,127,.9)';cx.beginPath();cx.moveTo(0,-6);cx.lineTo(5.5,0);cx.lineTo(0,6);cx.lineTo(-5.5,0);cx.closePath();cx.fill();
        cx.lineWidth=1.4;cx.strokeStyle='rgba(138,90,16,.5)';cx.stroke();cx.restore()}}
    // (padlocks removed from the map — original shows dots only)
    cx.restore()}
  // white cat marker stands on the current node
  if(markerNode)catMarker(cx,markerNode.p.x,markerNode.p.y-16,30,G.t);
  cx.restore(); // un-clip + un-translate
  // ---- FARM TARGET banner (from the treasure screen FARM SET jump): dismissible overlay chip ----
  if(G.mapFocusIdx!=null&&c.kind==='story'&&CHSETS[c.id]){const fs2=CHSETS[c.id][G.mapFocusIdx%9];
    if(fs2){const own2=tCount(c.id,G.mapFocusIdx%9);
      const bw2=456,bx2=16,by2=78;
      const pu=0.5+0.5*Math.sin(G.t*4);
      cx.save();cx.shadowColor='rgba(255,200,40,'+(0.22+pu*0.28).toFixed(2)+')';cx.shadowBlur=8+pu*6;
      cx.fillStyle='rgba(255,238,180,.97)';rr(cx,bx2,by2,bw2,34,17);cx.fill();cx.restore();
      cx.lineWidth=2;cx.strokeStyle='#e8951f';rr(cx,bx2,by2,bw2,34,17);cx.stroke();
      cx.save();cx.translate(bx2+22,by2+17);cx.scale(1+Math.sin(G.t*5)*0.1,1+Math.sin(G.t*5)*0.1);
      cx.fillStyle='#ffd23f';cx.beginPath();cx.moveTo(0,-7);cx.lineTo(6,0);cx.lineTo(0,7);cx.lineTo(-6,0);cx.closePath();cx.fill();
      cx.lineWidth=1.6;cx.strokeStyle='#8a5a10';cx.stroke();cx.restore();
      txt(cx,(own2===2?'1 PIECE LEFT — ':'')+'FARM: '+fs2.n,bx2+38,by2+17,13,'#5a3b16','left',2.5,'#fff',700);
      txt(cx,'gold ◇ nodes drop its pieces',bx2+38,by2+29,9,'#8a6a3a','left',2,'#fff',400);
      BTN('farmx',bx2+bw2-40,by2+3,30,28,()=>{G.mapFocusIdx=null;SFX.click()},{col:'#e85840',outline:'#8a1a10',label:'×',fs:12,r:14})}}
  // ---- dark wood frame around the map ----
  woodFrame(0,54,1280,666,16);
  // progress label (story)
  if(c.kind==='story'){const last=lastClearedIdx(c)+1;
    cx.fillStyle='rgba(255,248,232,.9)';rr(cx,1108,86,150,30,15);cx.fill();
    cx.lineWidth=2.5;cx.strokeStyle='#8a5a20';rr(cx,1108,86,150,30,15);cx.stroke();
    txt(cx,Math.min(last,48)+' / 48 CLEARED',1183,101.5,13,'#8a5a10','center',3,'#fff',700);
    // treasure-set completion chip (radar legend): complete sets / 9 for this chapter
    if(CHSETS[c.id]){let done=0;for(let k=0;k<9;k++)if(tCount(c.id,k)===3)done++;
      cx.fillStyle='rgba(255,248,232,.9)';rr(cx,1108,122,150,30,15);cx.fill();
      cx.lineWidth=2.5;cx.strokeStyle='#c8a030';rr(cx,1108,122,150,30,15);cx.stroke();
      cx.fillStyle='#ffd23f';cx.save();cx.translate(1124,137);cx.beginPath();cx.moveTo(0,-6.5);cx.lineTo(5.8,0);cx.lineTo(0,6.5);cx.lineTo(-5.8,0);cx.closePath();cx.fill();
      cx.lineWidth=1.6;cx.strokeStyle='#8a5a10';cx.stroke();cx.restore();
      txt(cx,'TREASURE '+done+'/9',1224,137.5,13,'#b08028','center',2.5,'#fff',700);
      if(done<9)txt(cx,'gold ◇ = set at 2/3 pieces',1183,162,9.5,'#a89878','center',2,'#fff',400)}}
  // ---- chapter cycle arrows on the frame (official side arrows) ----
  const chIdx=CHAPTERS.indexOf(c);
  const cyc=dir=>{for(let k=1;k<=CHAPTERS.length;k++){const nc=CHAPTERS[(chIdx+dir*k+CHAPTERS.length*2)%CHAPTERS.length];
    if(chapterUnlocked(nc.id)){G.chapter=nc.id;G.mapFor=null;G.mapFocusIdx=null;SFX.click();break}}};
  [[36,388,-1,'chprev'],[1244,388,1,'chnext']].forEach(([ax,ay,dir,id])=>{
    cx.fillStyle='rgba(58,40,16,.88)';cx.beginPath();cx.arc(ax,ay,24,0,TAU);cx.fill();
    cx.strokeStyle='#c8913a';cx.lineWidth=3;cx.beginPath();cx.arc(ax,ay,24,0,TAU);cx.stroke();
    cx.fillStyle='#ffd23f';cx.beginPath();cx.moveTo(ax+dir*10,ay);cx.lineTo(ax-dir*6,ay-11);cx.lineTo(ax-dir*6,ay+11);cx.closePath();cx.fill();
    BTN(id,ax-26,ay-26,52,52,()=>cyc(dir),{flat:true,nohov:true})});
  // ---- right action cluster: Equip chip / Energy pill / ATTACK! ----
  const teamFilled=SV.teams[SV.teamSel].filter(Boolean).length;
  cx.fillStyle='#e8b23c';rr(cx,1030,498,192,40,12);cx.fill();cx.lineWidth=3;cx.strokeStyle='#5a3b16';rr(cx,1030,498,192,40,12);cx.stroke();
  glyph(cx,'cat',1052,518,10,'#5a3b16','#e8b23c');
  txt(cx,'Equip',1080,513,15,'#5a3b16','left',3,'#fff',700);
  txt(cx,'Slots '+teamFilled+'/10',1080,530,11,'#6a4a1a','left',2,'#fff',700);
  BTN('mequip',1030,498,192,40,()=>{push('equip');SFX.click()},{flat:true,nohov:true});
  cx.fillStyle='#ffd23f';rr(cx,1006,548,238,44,22);cx.fill();cx.lineWidth=3.5;cx.strokeStyle='#c07818';rr(cx,1006,548,238,44,22);cx.stroke();
  txt(cx,'Energy',1034,570,19,'#5a3b16','left',3,'#fff',700);
  cx.fillStyle='#1a1a22';rr(cx,1128,556,100,28,14);cx.fill();
  txt(cx,String(SV.energy),1178,571,19,'#7fe86a','center',3,'#061806',700);
  const curIdx=c.kind==='story'?next:c.kind==='aku'?next:c.kind==='dojo'?Math.min(14,lastClearedIdx(c)+1):0;
  const canPlay=c.kind==='event'?(G.lastEvents.length>0):stageUnlocked(c.id,curIdx);
  cx.save();
  const glow=.5+.5*Math.sin(G.t*4);
  cx.shadowColor='rgba(255,60,200,'+(0.35+glow*0.4)+')';cx.shadowBlur=16;
  const ag=cx.createLinearGradient(0,604,0,672);ag.addColorStop(0,'#ffe24a');ag.addColorStop(1,'#ffb420');
  cx.fillStyle=ag;rr(cx,986,604,278,68,34);cx.fill();cx.restore();
  cx.lineWidth=4.5;cx.strokeStyle='#ff4bd8';rr(cx,986,604,278,68,34);cx.stroke();
  cx.lineWidth=1.5;cx.strokeStyle='rgba(122,26,16,.5)';rr(cx,990,608,270,60,30);cx.stroke();
  txt(cx,'Attack!',1125,639,32,'#fff','center',5,'#7a1a50',700);
  BTN('attack',986,604,278,68,()=>{
    if(!canPlay){const _unlockReq={eoc2:'eoc1',eoc3:'eoc2',itf1:'eoc3',itf2:'itf1',itf3:'itf2',cotc1:'itf3',cotc2:'cotc1',cotc3:'cotc2',dojo:'eoc2',aku:'itf3',sol:'eoc1'};
      const _reqCh=_unlockReq[c.id];
      toast(chapterUnlocked(c.id)?'Stage locked — clear the previous stage first!':('Unlock '+c.n+' — clear '+(CHMAP[_reqCh]?CHMAP[_reqCh].n:'the previous saga')+' first!'),'#ffb060');SFX.error();return}
    if(c.kind==='event'){if(G.lastEvents.length)openEventModal(G.lastEvents[0]);return}
    openStageModal(c.id,curIdx)},{flat:true,nohov:true});
  // ---- bottom icon row INSIDE the map (official single-row approach: no global bottom bar here) ----
  const tierCount=()=>{let n=0;for(const ch in CHSETS)if(CHSETS[ch])for(let s2=0;s2<9;s2++)n+=tCount(ch,s2);return n};
  const IROW=[
    ['SPEED UP',cc=>txt(cx,'\u00bb',0,0.5,15,'#e8ecf4','center',2.5,'#2a3040',700),'x0','Speed Up items drop from event stages!',null],
    ['TREASURE GET',cc=>glyph(cx,'chest',0,0,9.5,'#e8ecf4','#7a8296'),'x'+tierCount(),null,()=>{push('treasure');SFX.click()}],
    ['MAX',cc=>glyph(cx,'up',0,0,9.5,'#e8ecf4','#7a8296'),'x0','Max Perfume comes from the store!',null],
    ['UNITS',cc=>glyph(cx,'cat',0,0,9.5,'#e8ecf4','#7a8296'),'x'+CATS.filter(q=>catOwned(q.id)).length,null,()=>{push('equip');SFX.click()}],
    ['XP UP',cc=>{ // bright gold star + white outline + dark rim + glint (Defect 8: was faint)
      cc.fillStyle='#ffd23f';star(cc,0,-0.5,11,4.8);cc.fill();
      cc.lineWidth=2;cc.strokeStyle='#fff';cc.stroke();
      cc.lineWidth=1.3;cc.strokeStyle='#8a5a10';star(cc,0,-0.5,12.8,5.5);cc.stroke();
      cc.fillStyle='rgba(255,255,255,.9)';star(cc,-2.6,-3.4,2.6,1.1);cc.fill()},'x0',null,()=>{G.selCat=null;push('upgrade');SFX.click()}],
    ['CANNON',cc=>glyph(cx,'cannon',0,0,9.5,'#e8ecf4','#7a8296'),'x'+CANNON_TYPES.filter(t=>cannonUnlocked(t.id)).length,null,()=>{push('base');SFX.click()}],
    ['UNLOCK',cc=>drawPadlock(cc,0,0.5,8,'#e8ecf4'),'x0','Clear story chapters to unlock new modes!',null]];
  IROW.forEach((ir,ii)=>{const ix=128+ii*72,iy=664;
    circIcon(cx,ix,iy,21,ir[1],ir[2]==='x0'&&ii!==4);
    txt(cx,ir[0],ix,694,7.2,'#f5ecd8','center',2.2,'rgba(40,24,8,.9)',700);
    txt(cx,ir[2],ix,704,8.5,'#ffd23f','center',2.4,'rgba(40,24,8,.95)',700);
    BTN('irow'+ii,ix-24,iy-24,48,58,()=>{if(ir[4])ir[4]();else toast(ir[3]||ir[0]+' — earned from events & the store!','#ffb060')},{flat:true,nohov:true})});
  // back circle (yellow curved arrow, official) — returns to chapter list
  drawBackArrow(cx,52,678,25);
  BTN('back',24,650,56,56,pop,{flat:true,nohov:true});
  // Store pill (center, white cart glyph) + Cat Food can + gold count (bottom-right)
  cx.fillStyle='#ffd23f';rr(cx,628,662,170,40,20);cx.fill();cx.lineWidth=3.5;cx.strokeStyle='#5a3b16';rr(cx,628,662,170,40,20);cx.stroke();
  glyph(cx,'cart',678,683,10,'#5a3b16','#ffd23f');
  txt(cx,'Store',726,683,19,'#5a3b16','center',3,'#fff',700);
  BTN('storepill',628,662,170,40,()=>{push('store');SFX.click()},{flat:true,nohov:true});
  drawCFCan(cx,1128,688,13);
  txt(cx,fmt(SV.cf),1150,688,21,'#ffd23f','left',4,'#5a3210',700);
  // dojo record board (dojo only)
  if(c.kind==='dojo'){
    cx.save();cx.globalAlpha=0.94;
    cx.fillStyle='rgba(38,24,10,.92)';rr(cx,30,508,438,148,12);cx.fill();
    cx.lineWidth=2.5;cx.strokeStyle='#c8913a';rr(cx,31.5,509.5,435,145,11);cx.stroke();
    txt(cx,'DOJO RECORD',52,530,12,'#e8c890','left',2.5,'#1c1006',700);
    txt(cx,'Best: '+(SV.dojoBest||0)+'  ·  survive escalating waves',52,550,12.5,'#ffd23f','left',3,'#1c1006',700);
    const medal=['#cd7f32','#c0c0c0','#ffd700'];
    if((SV.dojoBoard||[]).length)(SV.dojoBoard||[]).forEach((e2,i2)=>{const chx=58+i2*140;
      cx.fillStyle=medal[i2]||'#8a7a5a';star(cx,chx,574,7,3.5);cx.fill();cx.strokeStyle='#1c1006';cx.lineWidth=1.4;cx.stroke();
      txt(cx,'#'+(i2+1)+' '+e2.s,chx+12,574,12,'#fff','left',2.5,'#1c1006',700);
      txt(cx,e2.d,chx+12,590,9,'#a89878','left',2,'#1c1006',400)});
    else txt(cx,'Enter Endless grading to set your first score!',52,578,11.5,'#c8b890','left',2.5,'#1c1006',400);
    // world ranking button (global board via /api/leaderboard)
    BTN('worldrank',52,606,180,34,()=>{push('leaderboard');SFX.click()},{col:'#ffd23f',outline:'#8a5a20',label:'WORLD RANKING',fs:12});
    txt(cx,'global board',260,624,10,'#c8b890','left',2,'#1c1006',400);
    cx.restore()}
}
function brownBottomBar(){
  const g=cx.createLinearGradient(0,666,0,720);g.addColorStop(0,'#c98a3c');g.addColorStop(1,'#8a5a20');
  cx.fillStyle=g;cx.fillRect(0,666,1280,54);
  // menu circular buttons with pictogram glyphs
  const items=[['equip','CATS','cat',()=>push('equip')],['upgrade','UPGRADE','up',()=>{G.selCat=null;push('upgrade')}],['gacha','GACHA','capsule',()=>push('gacha')],['treasure','TREASURE','chest',()=>push('treasure')],['guide','ENEMIES','doge',()=>push('guide')],['base','BASE','cannon',()=>push('base')],['settings','MENU','gear',()=>push('settings')]];
  items.forEach((it,i)=>{const x=110+i*86,y=686;
    cx.fillStyle='#5a3b16';cx.beginPath();cx.arc(x,y,20,0,TAU);cx.fill();
    cx.fillStyle='#ffd23f';cx.beginPath();cx.arc(x,y,17.5,0,TAU);cx.fill();
    glyph(cx,it[2],x,y-1.5,10,'#5a3b16','#ffd23f');
    txt(cx,it[1],x,y+24.5,8,'#fff','center',2,'#5a3b16',700);
    BTN('mb_item'+i,x-20,y-20,40,40,it[3],{flat:true,nohov:true})});
  // Store pill + cart glyph + cat food can
  cx.fillStyle='#ffd23f';rr(cx,640,676,150,36,18);cx.fill();cx.lineWidth=3;cx.strokeStyle='#5a3b16';rr(cx,640,676,150,36,18);cx.stroke();
  glyph(cx,'cart',686,694,9.5,'#5a3b16','#ffd23f');
  txt(cx,'Store',722,695,18,'#5a3b16','center');
  BTN('storepill',640,676,150,36,()=>{push('store');SFX.click()},{flat:true,nohov:true});
  txt(cx,'Cat Food',880,694,15,'#fff','left',3,'#5a3b16',700);
  drawCFCan(cx,975,694,12);
  txt(cx,fmt(SV.cf),1052,694,22,'#ffd23f','left',4,'#5a3b16',700);
  // back button bottom-left (curved arrow)
  drawBackArrow(cx,56,693,30);
  BTN('back',22,659,68,68,pop,{flat:true,nohov:true});
}
function star(c,x,y,R,r){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5;const rad=i%2?r:R;c.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad)}c.closePath()}
/* crown glyph (crown system): 3-point gold crown w/ dark rim + optional dim slot variant.
   crownDraw(c,x,y,s,fill,rim) paints a filled+stroked crown of half-height s. */
function crownDraw(c,x,y,s,fill,rim,dim){c.save();c.translate(x,y);
  const w=s*2.2,h=s*1.15,lw=Math.max(1.4,s*0.24);
  c.beginPath();
  c.moveTo(-w/2,h*0.55);
  c.lineTo(-w/2,-h*0.5);c.lineTo(-w*0.32,h*0.02);c.lineTo(0,-h);c.lineTo(w*0.32,h*0.02);c.lineTo(w/2,-h*0.5);
  c.lineTo(w/2,h*0.55);c.closePath();
  if(dim){c.globalAlpha*=0.35;fill=fill||'#c8bca0'}
  c.fillStyle=fill;c.fill();
  c.lineWidth=lw;c.strokeStyle=rim||'#8a5a10';c.lineJoin='round';c.stroke();
  // gem dots on the band
  if(!dim){c.fillStyle='#fff';[[-w*0.18,0],[0,-h*0.28],[w*0.18,0]].forEach(p=>{c.beginPath();c.arc(p[0],h*0.3+(p[1]*0.2),Math.max(0.9,s*0.12),0,TAU);c.fill()})}
  c.restore()}
/* custom-drawn cent sign (Fredoka One's ¢ glyph reads like a 4 at large sizes) — x,y = center of the glyph */
function drawCent(c,x,y,r,col,strokeC,sw){c.save();c.translate(x,y);c.lineCap='round';
  const lw=Math.max(1.4,r*0.30);
  if(strokeC){c.strokeStyle=strokeC;c.lineWidth=lw+Math.max(1.6,sw*0.7)}
  else c.lineWidth=lw;
  c.beginPath();c.arc(0,0,r,0.55,TAU-0.55);c.stroke();
  if(strokeC){c.beginPath();c.moveTo(0,-r-r*0.42);c.lineTo(0,r+r*0.42);c.stroke()}
  c.strokeStyle=col;c.lineWidth=lw;
  c.beginPath();c.arc(0,0,r,0.55,TAU-0.55);c.stroke();
  c.beginPath();c.moveTo(0,-r-r*0.42);c.lineTo(0,r+r*0.42);c.stroke();
  c.restore()}
function lastClearedIdx(c){const cc=SV.cleared[c.id]||{};let m=-1;for(const k in cc){const v=+k;if(v>m)m=v}return m}
function nextPlayableIdx(c){return Math.min(47,lastClearedIdx(c)+1)}

function drawSubmap(dt){const c=CHMAP[G.chapter];const sub=c.kind==='sol'?SOL_SUBS[G.mapSub]:UL_SUBS[G.mapSub];drawTopBar(c.n+' — '+sub.n,true);
  parchBody();
  // drifting cloud puffs + wind streaks (original SoL map vibe)
  for(let ci=0;ci<5;ci++){
    const cyc=(G.t*(7+ci*3)+ci*337)%(1280+260)-130;
    const cy2=120+((ci*167)%380);const cs=0.8+((ci*53)%50)/70;
    cx.fillStyle='rgba(255,252,240,'+(0.30+((ci*29)%20)/100)+')';
    cx.beginPath();cx.arc(cyc,cy2,26*cs,0,TAU);cx.arc(cyc+30*cs,cy2-10*cs,20*cs,0,TAU);cx.arc(cyc+56*cs,cy2+2*cs,18*cs,0,TAU);cx.fill();
    cx.strokeStyle='rgba(255,255,255,.35)';cx.lineWidth=2;cx.lineCap='round';
    const wy=cy2+34+ci*7;cx.beginPath();cx.moveTo(cyc-60,wy);cx.quadraticCurveTo(cyc-20,wy-5,cyc+30,wy);cx.stroke()}
  for(let i=0;i<8;i++){const x=20+(i%4)*312,y=90+Math.floor(i/4)*150;const idx=G.mapSub*8+i;const st=genStage(c.kind==='sol'?'sol':'ul',idx);
    const unl=stageUnlocked(c.kind==='sol'?'sol':'ul',idx);const cl=SV.cleared[c.kind==='sol'?'sol':'ul']&&SV.cleared[c.kind==='sol'?'sol':'ul'][String(idx)];
    cx.fillStyle=cl?'#fdf3d8':unl?'#fffdf5':'#e8dcbf';rr(cx,x,y,296,134,12);cx.fill();
    cx.lineWidth=cl?3.5:2.5;cx.strokeStyle=cl?'#c88a3c':unl?'#b0a180':'#b8a67e';rr(cx,x+1.5,y+1.5,293,131,12);cx.stroke();
    if(unl)BTN('sm'+i,x,y,296,134,()=>openStageModal(c.kind==='sol'?'sol':'ul',idx),{flat:true,nohov:true});
    cx.globalAlpha=unl?1:0.45;
    txt(cx,(i+1===8?'\u2605 BOSS':'Stage '+(i+1)),x+14,y+30,16,i+1===8?'#e8602a':'#b06a10','left',3,'#fff',700);
    txt(cx,st.name.length>26?st.name.slice(0,25)+'\u2026':st.name,x+14,y+56,12,'#6a5a3a','left');
    txt(cx,'Energy '+st.energy+'  Mag ×'+st.mag.hp.toFixed(1),x+14,y+78,12,'#2a7a9a','left');
    txt(cx,'XP '+fmt(st.reward.xp),x+14,y+100,12,'#8a6a10','left');
    if(st.boss)ART.enemyIcon(st.boss,x+250,y+40,20);
    if(cl){cx.fillStyle='#8a6a10';star(cx,x+160,y+118,7,4);cx.fill();txt(cx,'CLEARED',x+172,y+118,12,'#8a6a10','left')}
    cx.globalAlpha=1}
  brownBottomBar()}
function openStageModal(ch,idx){const c=CHMAP[ch];const st=genStage(ch,idx);SFX.click();
  const en=st.script.flatMap(w=>w.spawns.map(s=>s.e)).concat(st.boss?[st.boss]:[]);
  const crownsN=(c.kind==='story'&&SV.crowns[ch])?(SV.crowns[ch][String(idx)]||0):0;
  // treasure-set card data (story chapters with treasure): set i%9, current owned tiers
  const treasureCard=(c.kind==='story'&&CHSETS[ch])?{set:CHSETS[ch][idx%9],own:tCount(ch,idx%9)}:null;
  G.battleItems=G.battleItems||{}; // selection persists across stages (like the original's item memory)
  const ITEMS=[{k:'sniper',n:'SNIPER',d:'+50% cat ATK'},{k:'jobs',n:'CAT JOBS',d:'worker starts max'},{k:'cpu',n:'CAT CPU',d:'auto-deploys cats'}];
  openModal(st.name,[
    'Energy cost: '+st.energy+'   (you have '+SV.energy+')',
    'Enemy base HP: '+fmt(st.baseHp),
    'Power: HP ×'+st.mag.hp.toFixed(2)+'  ATK ×'+st.mag.atk.toFixed(2),
    'Enemies: '+([...new Set(en)].map(e=>ENEMAP[e].n).join(', ')||'\u2014'),
    'Reward: '+fmt(st.reward.xp)+' XP'+(st.reward.fruit?' + '+FRUIT_NAMES[st.reward.fruit]:'')+(st.reward.cf?' + '+st.reward.cf+' CF':''),
    ...(c.kind==='story'?['Crowns: '+crownsN+'/3 \u2014 win with base HP \u226580% for a PERFECT 3-crown clear!']:[]),
    ...(!treasureCard?['Treasure chance: ~'+Math.round(treasureChance(ch,idx%9,tCount(ch,idx%9))*100)+'% \u2014 farmable on repeat clears!']:[])],
    [{n:'Cancel',cb:()=>{}},{n:'Attack!',col:'#ffd23f',cb:()=>tryStartBattle(ch,idx)}],(x,y,w,h)=>{
      /* ===== BATTLE ITEMS row (classic original items) — defined here, drawn LAST so it never hides under the treasure card ===== */
      const drawItems=()=>{
      const iy=y+h-46,iw=170,gap2=14,x2=x+(w-(iw*3+gap2*2))/2;
      txt(cx,'BATTLE ITEMS',x+w/2,iy-12,11.5,'#8a6a3a','center',3,'#fff',700);
      ITEMS.forEach((it,i3)=>{
        const on=!!G.battleItems[it.k];const ix2=x2+i3*(iw+gap2);
        const opts={flat:true,nohov:true,draw:(cc)=>{
          cc.save();if(on){cc.shadowColor='rgba(255,210,63,.5)';cc.shadowBlur=8}
          cc.fillStyle=on?'#ffd23f':'rgba(90,70,40,.25)';rr(cc,0,0,iw,36,10);cc.fill();cc.restore();
          cc.lineWidth=2.5;cc.strokeStyle=on?'#8a5a20':'rgba(90,70,40,.45)';rr(cc,0,0,iw,36,10);cc.stroke();
          txt(cc,it.n,iw/2,12.5,12,on?'#4a2f10':'#8a7a5a','center',2.5,'#fff',700);
          txt(cc,on?it.d:'tap to use',iw/2,26.5,9.5,on?'#6a4a12':'#a89878','center',2,'#fff',400);
        }};
        BTN('itm'+it.k,ix2,iy-8,iw,36,()=>{G.battleItems[it.k]=!G.battleItems[it.k];SFX.click()},opts);
      });
      };
      let yOff=0;
      // crown strip (story chapters): earned pips + dim slots + PERFECT tag
      if(c.kind==='story'){yOff=42;
        txt(cx,'BEST CROWNS',x+30,y+16,11.5,'#b06a10','left',3,'#fff',700);
        for(let i=0;i<3;i++)crownDraw(cx,x+150+i*46,y+16,13,i<crownsN?'#ffd23f':'#c8bca0',i<crownsN?'#8a5a10':'#8a7a5a',i>=crownsN);
        if(crownsN===3)txt(cx,'PERFECT!',x+w-30,y+16,13,'#e8951f','right',3,'#fff',700)}
      // enemy lineup tiles with trait rings + boss ribbons
      const uni=[...new Set(en)];const shown=uni.slice(0,6);
      txt(cx,'APPEARING ENEMIES',x+w/2,y+yOff+10,12.5,'#8a6a3a','center',3,'#fff',700);
      const n=shown.length,tw=64,gap=16,x0=x+w/2-(n*tw+(n-1)*gap)/2;
      shown.forEach((eid,i2)=>{const e=ENEMAP[eid];const ex=x0+i2*(tw+gap),ey=y+yOff+24;
        cx.fillStyle='#fffdf5';rr(cx,ex,ey,tw,74,10);cx.fill();
        const tc=TRAIT_COL[e.tr[0]]||'#a89a78';cx.lineWidth=3;cx.strokeStyle=e.boss?'#e84030':tc;rr(cx,ex+1.5,ey+1.5,tw-3,71,9);cx.stroke();
        ART.enemyIcon(eid,ex+tw/2,ey+28,17);
        const tl=e.tr.length?e.tr.map(t2=>t2.toUpperCase()).join('·'):'TRAITLESS';
        txt(cx,tl,ex+tw/2,ey+56,6.8,shade(tc,.6),'center',2,'#fff',700);
        if(e.boss){cx.save();cx.translate(ex+tw/2,ey-1);cx.rotate(-0.08);cx.fillStyle='#e84030';rr(cx,-21,-8,42,15,4);cx.fill();txt(cx,'BOSS',0,-0.5,9,'#fff','center',2,'#7a1a10',700);cx.restore()}});
      if(uni.length>6)txt(cx,'+'+(uni.length-6)+' more',x+w/2,y+yOff+112,11,'#a89878','center',2,'#fff',400);
      else if(!uni.length)txt(cx,'No enemies \u2014 destroy the base!',x+w/2,y+yOff+60,12,'#a89878','center',2,'#fff',400);
      // TREASURE SET CARD (story chapters with treasure): set name, tier pips + per-tier odds,
      // pulsing gold highlight when one piece remains \u2014 closes the map-radar loop
      // (map ping \u2192 stage modal shows the exact set + odds \u2192 farm with confidence)
      if(treasureCard){const tcd=treasureCard;
        const cy2=y+yOff+126,ch2=w-56,cx2=x+28;
        const hot=tcd.own===2; // ONE PIECE LEFT
        cx.save();
        if(hot){const pu=0.5+0.5*Math.sin(G.t*4);
          cx.shadowColor='rgba(255,200,40,'+(0.30+pu*0.35).toFixed(2)+')';cx.shadowBlur=8+pu*8}
        cx.fillStyle=hot?'rgba(255,238,180,.95)':'rgba(255,244,214,.80)';rr(cx,cx2,cy2,ch2,58,12);cx.fill();cx.restore();
        cx.lineWidth=hot?3:1.8;cx.strokeStyle=hot?'#e8951f':'rgba(176,138,80,.6)';rr(cx,cx2,cy2,ch2,58,12);cx.stroke();
        // chest medallion
        cx.fillStyle='#b06a10';cx.beginPath();cx.arc(cx2+34,cy2+29,20,0,TAU);cx.fill();
        cx.lineWidth=2.5;cx.strokeStyle='#8a5a10';cx.stroke();
        glyph(cx,'chest',cx2+34,cy2+29,17,'#ffd23f','#7a4a08');
        // set name + stat-bonus line
        txt(cx,'TREASURE SET \u00b7 '+tcd.set.n,cx2+64,cy2+16,13.5,hot?'#b06a10':'#8a6a10','left',2.5,'#fff',700);
        txt(cx,'Set bonus: '+TSTATS[tcd.set.stat]+' \u2014 pieces stack its multiplier',cx2+64,cy2+34,10.5,'#8a6a3a','left',2,'#fff',400);
        // tier pips: bronze / silver / gold, owned fill + per-tier drop odds
        const tiers=[['Bronze','#cd7f32'],['Silver','#c0c0c0'],['Gold','#ffd700']];
        tiers.forEach((t3,i)=>{const px2=cx2+66+i*152,py2=cy2+46;const got=tcd.own>i;
          cx.fillStyle=got?t3[1]:'rgba(200,190,160,.35)';cx.beginPath();cx.arc(px2,py2,8,0,TAU);cx.fill();
          cx.lineWidth=1.8;cx.strokeStyle=got?shade(t3[1],.55):'#c8b892';cx.stroke();
          if(got){cx.fillStyle='rgba(255,255,255,.55)';cx.beginPath();cx.arc(px2-2.6,py2-2.6,2.6,0,TAU);cx.fill()}
          txt(cx,t3[0]+' '+Math.round(treasureChance(ch,idx,Math.min(i,2))*100)+'%',px2+14,py2+0.5,10,got?'#5a3b16':'#a89878','left',2,'#fff',got?700:400)});
        if(hot){const pu=1+Math.sin(G.t*5)*0.05;
          cx.save();cx.translate(cx2+ch2-92,cy2+29);cx.scale(pu,pu);
          cx.fillStyle='#e84030';rr(cx,-58,-13,116,26,13);cx.fill();
          txt(cx,'1 PIECE LEFT!',0,0.5,12,'#fff','center',2.5,'#7a1a10',700);cx.restore()}
        else if(tcd.own===3)txt(cx,'SET COMPLETE \u2713',cx2+ch2-14,cy2+29,11,'#3a9a5a','right',2.5,'#fff',700)}drawItems();})}
function openEventModal(ev){const s=ev.s;const uni=[...new Set(s.pool)];
  const wasCl=SV.eventsDone&&SV.eventsDone['clr:'+s.evtId];
  openModal(s.name,['Energy '+s.energy+'   ·   XP '+fmt(s.reward.xp),ev.desc,...(wasCl?['Already cleared today — replays pay 30% XP (fresh rewards tomorrow!)']:[])],
    [{n:'Cancel',cb:()=>{}},{n:'BATTLE!',col:'#ffd94a',cb:()=>{G.pendingEvent=ev;tryStartBattle('event',-1)}}],
    (x,y,w,h)=>{
      // enemy lineup tiles (stage-modal style): trait rings + boss ribbons
      txt(cx,'APPEARING ENEMIES',x+w/2,y+8,12.5,'#8a6a3a','center',3,'#fff',700);
      const shown=uni.slice(0,6);const n=shown.length,tw=64,gap=16,x0=x+w/2-(n*tw+(n-1)*gap)/2;
      shown.forEach((eid,i2)=>{const e=ENEMAP[eid];const ex=x0+i2*(tw+gap),ey=y+22;
        cx.fillStyle='#fffdf5';rr(cx,ex,ey,tw,74,10);cx.fill();
        const tc=TRAIT_COL[e.tr[0]]||'#a89a78';cx.lineWidth=3;cx.strokeStyle=e.boss?'#e84030':tc;rr(cx,ex+1.5,ey+1.5,tw-3,71,9);cx.stroke();
        ART.enemyIcon(eid,ex+tw/2,ey+28,17);
        const tl=e.tr.length?e.tr.map(t2=>t2.toUpperCase()).join('·'):'TRAITLESS';
        txt(cx,tl,ex+tw/2,ey+56,6.8,shade(tc,.6),'center',2,'#fff',700);
        if(e.boss){cx.save();cx.translate(ex+tw/2,ey-1);cx.rotate(-0.08);cx.fillStyle='#e84030';rr(cx,-21,-8,42,15,4);cx.fill();txt(cx,'BOSS',0,-0.5,9,'#fff','center',2,'#7a1a10',700);cx.restore()}});
      if(uni.length>6)txt(cx,'+'+(uni.length-6)+' more',x+w/2,y+108,11,'#a89878','center',2,'#fff',400);
      else if(!uni.length)txt(cx,'No enemies \u2014 destroy the base!',x+w/2,y+56,12,'#a89878','center',2,'#fff',400);
      // stat strip: base HP + magnification
      txt(cx,'Enemy base HP '+fmt(s.baseHp)+'   ·   Power HP ×'+s.mag.hp.toFixed(1)+' / ATK ×'+s.mag.atk.toFixed(1),x+w/2,y+138,12.5,'#8a6a3a','center',3,'#fff',400);
      // rewards ribbon
      const ry=y+h-38;cx.fillStyle='rgba(255,244,214,.85)';rr(cx,x+16,ry,w-32,30,9);cx.fill();
      cx.lineWidth=1.5;cx.strokeStyle='rgba(176,138,80,.5)';rr(cx,x+16,ry,w-32,30,9);cx.stroke();
      let rtxt='Reward: '+fmt(s.reward.xp)+' XP';let rcol='#b06a10';
      if(s.reward.fruit){rtxt+='  ·  Catfruit: '+FRUIT_NAMES[s.reward.fruit];rcol=shade(FRUIT_COL[s.reward.fruit],.7)}
      if(s.reward.ticket)rtxt+='  ·  Rare Ticket chance!';
      txt(cx,rtxt,x+w/2,ry+15.5,12.5,rcol,'center',3,'#fff',700)})}
function tryStartBattle(ch,idx){const st=idx>=0?genStage(ch,idx):(G.pendingEvent?G.pendingEvent.s:null);if(!st)return;
  if(SV.energy<st.energy){ // blocking dialog (original behavior) — a toast was too easy to miss
    SFX.error();
    const regen=Math.max(0,st.energy-SV.energy);
    openModal('OUT OF ENERGY',['Energy: '+SV.energy+' / '+st.energy,'Leadership is a renewable resource — energy refills 1 per minute'+(regen>0?' (full in ~'+tstr(regen)+')':'')+'.'],[
      {n:'STORE — top up!',col:'#ffd23f',cb:()=>{G.screen='store';G.screenPrev=[];G.hits=[];G.modal=null;SFX.click()}},
      {n:'OK',cb:()=>{}}]);
    return}
  spendEnergy(st.energy);SFX.click();startBattle(st)}
/* ============================== SCREEN: EQUIP ============================== */
const RAR_COL={normal:'#c9c9d6',special:'#7fd0ff',rare:'#8fe8ff',srar:'#ffd94a',uber:'#ff9ad5',legend:'#c46adf'};
const EFF_LABEL={walletStart:v=>'Start wallet +'+Math.round(v)+'\u00a2',atk:v=>'ATK +'+Math.round(v*100)+'%',hp:v=>'HP +'+Math.round(v*100)+'%',spd:v=>'Speed +'+Math.round(v*100)+'%',xp:v=>'XP +'+Math.round(v*100)+'%',slow:v=>'Slow dur. +'+Math.round(v*100)+'%'};
function drawEquip(dt){
  /* ---- light-blue background + subtle graph-paper grid (R5) ---- */
  const bg=cx.createLinearGradient(0,0,0,720);bg.addColorStop(0,'#d8f2fc');bg.addColorStop(1,'#b6dff2');
  cx.fillStyle=bg;cx.fillRect(0,0,1280,720);
  cx.strokeStyle='rgba(96,164,204,.20)';cx.lineWidth=1;
  for(let gx=0;gx<=1280;gx+=44){cx.beginPath();cx.moveTo(gx+.5,0);cx.lineTo(gx+.5,720);cx.stroke()}
  for(let gy=0;gy<=720;gy+=44){cx.beginPath();cx.moveTo(0,gy+.5);cx.lineTo(1280,gy+.5);cx.stroke()}
  const team=SV.teams[SV.teamSel],teamIds2=team.filter(Boolean);
  const toggleCat=id=>{const at=team.indexOf(id);
    if(at>=0){team[at]='';persist();SFX.click()}
    else{const emp=team.indexOf('');if(emp<0){toast('Team full! Remove a unit first.','#ff7a7a');SFX.error();return}
      team[emp]=id;persist();SFX.click()}};
  /* ---- slim top strip: Filter / team tabs / combos / mini team slots (kept from old layout logic) ---- */
  cx.fillStyle='rgba(255,255,255,.62)';cx.fillRect(0,0,1280,102);
  cx.fillStyle='rgba(70,140,180,.25)';cx.fillRect(0,100,1280,2);
  // yellow Filter button (top-left) → filter modal
  BTN('eqfilter',20,8,110,40,()=>{SFX.click();
    openModal('FILTER UNITS',['Toggle owned-only or a rarity to reshape the grid.'],[{n:'CLOSE',cb:()=>{}}],(mx,my,mw,mh)=>{
      BTN('eqfOwn',mx+20,my+4,200,38,()=>{G.eqOwn=!G.eqOwn;G.scrollColl=0},{col:G.eqOwn?'#ffd23f':'#fff8e8',outline:'#8a5a20',label:'OWNED ONLY'+(G.eqOwn?' \u2713':''),fs:13,r:10,modal:true});
      const rars=['normal','special','rare','srar','uber','legend'];
      rars.forEach((r,i)=>{const bx=mx+20+(i%3)*160,by=my+52+Math.floor(i/3)*44;
        BTN('eqf'+r,bx,by,150,36,()=>{G.eqRar=G.eqRar===r?null:r;G.scrollColl=0},{col:G.eqRar===r?RAR_COL[r]:'#fff8e8',outline:'#8a5a20',label:r.toUpperCase(),fs:11.5,r:10,tcol:G.eqRar===r?'#2a1c06':'#4a2f10',modal:true})});
      BTN('eqfClr',mx+20,my+150,200,36,()=>{G.eqOwn=false;G.eqRar=null;G.scrollColl=0},{col:'#e8d8b0',outline:'#8a5a20',label:'CLEAR FILTERS',fs:12,r:10,modal:true})})},
    {col:'#ffd23f',outline:'#8a5a20',label:'Filter',fs:16,r:10,tcol:'#4a2f10'});
  // team tabs I/II/III
  ['I','II','III'].forEach((t,i)=>{BTN('tt'+i,146+i*66,8,62,40,()=>{SV.teamSel=i;persist();SFX.click()},{col:SV.teamSel===i?'#ffd23f':'#fff8e8',outline:'#8a5a20',label:t,fs:15,r:10,tcol:'#4a2f10'})});
  // active combo summary (kept under the hood logic)
  const actCbs=COMBOS.filter(cb=>cb.ids.every(i=>teamIds2.includes(i)));
  const cbt=actCbs.length?actCbs.map(cb=>cb.n).join(' · ')+' ('+actCbs.map(cb=>Object.entries(cb.eff).map(([k,v])=>EFF_LABEL[k](v)).join(', ')).join(' | ')+')':'No active combos';
  txt(cx,cbt.length>118?cbt.slice(0,117)+'\u2026':cbt,352,18,12,actCbs.length?'#8a5a10':'#5a7a8a','left',3,'#fff',700);
  txt(cx,'Tap a card to fill the first empty slot · tap card or its slot again to remove',352,38,11.5,'#3a6a84','left',2.5,'#fff',400);
  // ALL COMBOS chip (existing modal, verbatim wiring)
  BTN('cbs',1004,8,132,40,()=>{SFX.click();openModal('CAT COMBOS',[],[{n:'CLOSE',cb:()=>{G.comboFilter='all'}}],(mx,my,mw,mh)=>{
    const teamIds3=SV.teams[SV.teamSel].filter(Boolean);
    const f=G.comboFilter||'all';
    const isOwned=cb=>cb.ids.every(i=>catOwned(i));const isOn=cb=>cb.ids.every(i=>teamIds3.includes(i));
    const list=COMBOS.filter(cb=>f==='all'||(f==='ready'&&isOwned(cb)&&!isOn(cb))||(f==='active'&&isOn(cb))||(f==='locked'&&!isOwned(cb)));
    const chips=[['all','ALL'],['ready','READY'],['active','IN USE'],['locked','LOCKED']];
    let chx=mx+10;chips.forEach(([k,lab])=>{const cw2=86;BTN('cbf'+k,chx,my-6,cw2,26,()=>{G.comboFilter=k;G.scrollCombos=0;SFX.click()},{col:f===k?'#ffd23f':'#fff8e8',outline:'#8a5a20',label:lab,fs:11.5,r:13,tcol:'#4a2f10',modal:true});chx+=cw2+8});
    txt(cx,list.length+' combos',mx+mw-14,my+7,12,'#a89878','right',2,'#fff',400);
    const tileH=56,perMax=Math.floor((mh-44)/tileH);
    SCROLL('cbsc',mx+8,my+22,mw-16,Math.max(tileH,perMax*tileH),()=>G.scrollCombos||0,v=>G.scrollCombos=v,Math.max(0,list.length*tileH-perMax*tileH));
    cx.save();cx.beginPath();cx.rect(mx+8,my+22,mw-16,perMax*tileH);cx.clip();
    list.forEach((cb,i)=>{const y=my+22+i*tileH-(G.scrollCombos||0);
      if(y<my+22-tileH||y>my+22+perMax*tileH)return;
      const on=isOn(cb),own=isOwned(cb);
      BTN('cbtile'+i,mx+12,y+3,mw-24,tileH-9,()=>{SFX.click();openComboDetail(cb)},{flat:true,nohov:true,modal:true,draw:()=>{
        cx.fillStyle=on?'#fff3c8':(own?'#fffdf5':'#efe6cf');rr(cx,mx+12,y+3,mw-24,tileH-9,10);cx.fill();
        cx.lineWidth=on?2.5:1.5;cx.strokeStyle=on?'#d8913a':(own?'#cbb384':'#c8bc9e');rr(cx,mx+12.5,y+3.5,mw-25,tileH-10,10);cx.stroke();
        let ix=mx+34;cb.ids.forEach(id=>{ART.catIcon(id,ix,y+tileH/2-2,15,own?undefined:0.16);ix+=34;if(ix<mx+34+cb.ids.length*34-6)txt(cx,'+',ix-7,y+tileH/2-2,13,'#a89878','center')});
        const tx0=mx+34+cb.ids.length*34+8;
        txt(cx,cb.n,tx0,y+18,13.5,on?'#b06a10':(own?'#5a4530':'#a89878'),'left',3,'#fff',700);
        txt(cx,Object.entries(cb.eff).map(([k,v])=>EFF_LABEL[k](v)).join('  ·  '),tx0,y+40,12,own?'#4a3a24':'#b0a488','left',2,'#fff',400);
        if(on){cx.fillStyle='#e8951f';rr(cx,mx+mw-108,y+14,86,26,13);cx.fill();txt(cx,'✔ IN USE',mx+mw-65,y+27.5,11.5,'#fff','center',2,'#7a4a08',700)}
        else if(own){cx.fillStyle='#e8f4e0';rr(cx,mx+mw-108,y+14,86,26,13);cx.fill();cx.lineWidth=1.5;cx.strokeStyle='#5a8a4a';rr(cx,mx+mw-108,y+14,86,26,13);cx.stroke();txt(cx,'READY',mx+mw-65,y+27.5,11.5,'#3a7a2a','center',2,'#fff',700)}
        else{const miss=cb.ids.filter(i2=>!catOwned(i2)).length;txt(cx,miss+' cat'+(miss>1?'s':'')+' missing',mx+mw-65,y+27.5,10.5,'#b0a488','center',2,'#fff',400)}}})});
    cx.restore()})},{col:'#ffd23f',outline:'#8a5a20',label:'ALL COMBOS \u25b8',fs:12,r:10,tcol:'#4a2f10'});
  // slots mini-row (kept clear of the ALL COMBOS button which ends at x=1136)
  txt(cx,'Slots '+teamIds2.length+'/10',1206,14,12.5,'#2a5a74','center',3,'#fff',700);
  txt(cx,SV.teamSel===0?'Team I':SV.teamSel===1?'Team II':'Team III',1206,40,10.5,'#3a6a84','center',2.5,'#fff',700);
  for(let i2=0;i2<10;i2++){const x=20+i2*38,y=56;const id=team[i2];
    cx.fillStyle=id?'#fff8e8':'rgba(255,255,255,.5)';rr(cx,x,y,34,34,8);cx.fill();
    cx.lineWidth=2;cx.strokeStyle=id?'#d8913a':'rgba(90,59,22,.35)';rr(cx,x,y,34,34,8);cx.stroke();
    if(id)ART.catIcon(id,x+17,y+17,11);
    else txt(cx,'+',x+17,y+18,14,'#a89a78','center',2,'#fff',700);
    BTN('eqslot'+i2,x,y,34,34,()=>{if(id){team[i2]='';persist();SFX.click()}},{flat:true,nohov:true})}
  /* ---- 6-column scrollable card grid ---- */
  const list=CATS.filter(c=>!G.eqOwn||catOwned(c.id)).filter(c=>!G.eqRar||c.rarity===G.eqRar);
  const gx=24,gy=114,gh=520,perRow=6,cw=190,chh=128,gap=10;
  const maxScroll=Math.max(0,Math.ceil(list.length/perRow)*(chh+gap)-gh+gap);
  SCROLL('eqgrid',0,gy,1280,gh,()=>G.scrollColl,v=>G.scrollColl=clamp(v,0,maxScroll),maxScroll);
  cx.save();cx.beginPath();cx.rect(0,gy-4,1280,gh+8);cx.clip();
  list.forEach((c,i)=>{const col=i%perRow,row=Math.floor(i/perRow);
    const x=gx+col*(cw+gap),y=gy+10+row*(chh+gap)-G.scrollColl;
    if(y<gy-chh||y>gy+gh)return;
    const own=catOwned(c.id),on=teamIds2.includes(c.id);
    cx.save();cx.shadowColor='rgba(40,70,90,.25)';cx.shadowBlur=5;cx.shadowOffsetY=3;
    cx.fillStyle=own?'#fffdf6':'#e4e2da';rr(cx,x,y,cw,chh,10);cx.fill();cx.restore();
    cx.lineWidth=on?4.5:3;cx.strokeStyle=on?'#ffd23f':'#26262e';rr(cx,x,y,cw,chh,10);cx.stroke();
    if(own)ART.catIcon(c.id,x+cw/2,y+50,28);
    else{ART.catIcon(c.id,x+cw/2,y+50,28,0.15);txt(cx,'?',x+cw/2,y+54,24,'#9a9284','center',3,'#fff',700)}
    if(own){ // Lv tag
      cx.fillStyle='#26262e';rr(cx,x+8,y+chh-27,66,21,7);cx.fill();
      txt(cx,'Lv'+catLv(c.id)+(catPlus(c.id)?' +'+catPlus(c.id):''),x+41,y+chh-16.5,11,'#ffd23f','center',2,'#26262e',700)}
    // rarity corner triangle (+ tiny star for special and above)
    cx.fillStyle=RAR_COL[c.rarity];cx.beginPath();cx.moveTo(x+cw-32,y+2.5);cx.lineTo(x+cw-2.5,y+2.5);cx.lineTo(x+cw-2.5,y+32);cx.closePath();cx.fill();
    cx.lineWidth=1.5;cx.strokeStyle='rgba(30,30,40,.35)';cx.stroke();
    if(c.rarity!=='normal'&&c.rarity!=='rare'){cx.fillStyle='#fff';star(cx,x+cw-14,y+13,6.5,2.8);cx.fill()}
    if(on){ // in-team badge: gold cat-face coin
      cx.fillStyle='#ffd23f';cx.beginPath();cx.arc(x+15,y+15,11.5,0,TAU);cx.fill();
      cx.lineWidth=2;cx.strokeStyle='#8a5a10';cx.stroke();
      glyph(cx,'cat',x+15,y+15.5,5.5,'#8a5a10','#ffd23f')}
    if(own)BTN('eq'+c.id,x,y,cw,chh,()=>toggleCat(c.id),{flat:true,nohov:true});
    else BTN('eqlock'+c.id,x,y,cw,chh,()=>{toast('Not unlocked yet \u2014 find new Cats in Gacha & story rewards!','#ffb060');SFX.error()},{flat:true,nohov:true})});
  cx.restore();
  // page arrows at the screen edges (page-wise scroll)
  const pageGo=d=>{G.scrollColl=clamp(G.scrollColl+d*(gh-60),0,maxScroll);SFX.click()};
  [[10,-1,'eqpgL',G.scrollColl<=0],[1270,1,'eqpgR',G.scrollColl>=maxScroll]].forEach(([ax,dir,id,dis])=>{
    cx.save();cx.globalAlpha=dis?0.45:0.92;cx.translate(ax,gy+gh/2);
    cx.fillStyle='#e8f4b0';cx.beginPath();
    if(dir<0){cx.moveTo(18,0);cx.lineTo(-12,-26);cx.lineTo(-12,26)}
    else{cx.moveTo(-18,0);cx.lineTo(12,-26);cx.lineTo(12,26)}
    cx.closePath();cx.fill();cx.lineWidth=3;cx.strokeStyle='rgba(90,110,40,.7)';cx.stroke();cx.restore();
    BTN(id,ax-18,gy+gh/2-34,40,68,()=>pageGo(dir),{flat:true,nohov:true})});
  /* ---- bottom: back circle + yellow Select button (official) ---- */
  drawBackArrow(cx,44,688,23);
  BTN('back',16,660,56,56,pop,{flat:true,nohov:true});
  BTN('eqselect',1096,650,160,54,()=>{SFX.click();pop()},{col:'#ffd23f',outline:'#8a5a20',label:'Select \u2605',fs:18,r:14,tcol:'#4a2f10'});
}

/* ============================== SCREEN: UPGRADE — official carousel (R3/R4) ============================== */
function drawUpgrade(dt){
  const owned=CATS.filter(c=>catOwned(c.id));
  if(!owned.length){drawTopBar('IMPROVE CATS',true);parchBody();brownBottomBar();return}
  // carousel index (kept in sync with legacy G.selCat so other screens' shortcuts still land on the same cat).
  // G._upSel = the id we last published: only an EXTERNAL change of G.selCat (home/map shortcut) re-targets the carousel.
  if(G.upIdx==null||G.upIdx<0)G.upIdx=0;
  G.upIdx=((G.upIdx%owned.length)+owned.length)%owned.length;
  if(G.selCat!==G._upSel){const f=owned.findIndex(q=>q.id===G.selCat);if(f>=0)G.upIdx=f}
  G._upSel=owned[G.upIdx].id;G.selCat=G._upSel;
  const c=owned[G.upIdx],s=catStats(c.id),fi=s.fi,form=c.forms[fi];
  /* ---- cream backdrop + kikkou-pattern decorative strips (R3) ---- */
  const bg=cx.createLinearGradient(0,0,0,720);bg.addColorStop(0,'#f8f0da');bg.addColorStop(1,'#ecd7a8');
  cx.fillStyle=bg;cx.fillRect(0,0,1280,720);
  kikkouStrip(0,0,1280,46,false,'#d2a868','rgba(122,82,26,.6)');kikkouStrip(0,678,1280,42,true,'#d2a868','rgba(122,82,26,.6)');
  /* ---- top bar title + black rounded 'Character' pill sitting just under the top strip (y≈64) ---- */
  txt(cx,'Upgrade',20,24,20,'#fff','left',5,'#5a3b16',700);
  cx.fillStyle='#191922';rr(cx,22,50,196,30,15);cx.fill();cx.lineWidth=3;cx.strokeStyle='#fff8e8';rr(cx,24,52,192,26,13);cx.stroke();
  txt(cx,'Characters',120,65.5,15.5,'#fff','center',3,'#000',700);
  /* ---- top-right: XP emphasized (cyan label + gold number) + CF chip with a guaranteed ≥4px gap ---- */
  cx.font=FONT(26,700);const xpw=cx.measureText(fmt(SV.xp)).width;
  const xNumR=1264,xLabR=xNumR-xpw-10; // right edge of the cyan 'XP' label
  txt(cx,fmt(SV.xp),xNumR,24,26,'#ffd23f','right',5,'rgba(60,30,0,.9)',700);
  txt(cx,'XP',xLabR,24,15,'#37b6ff','right',3,'rgba(10,20,30,.85)',700);
  cx.font=FONT(12.5,700);const cfw=cx.measureText(fmt(SV.cf)).width+42;
  const pillR=xLabR-22-16; // CF pill ends 16px left of the XP label start (clear of the label's outline too)
  cx.fillStyle='rgba(255,248,232,.92)';rr(cx,pillR-cfw,10,cfw,28,14);cx.fill();cx.lineWidth=2;cx.strokeStyle='rgba(90,59,22,.5)';rr(cx,pillR-cfw,10,cfw,28,14);cx.stroke();
  drawCFCan(cx,pillR-cfw+15,24,8);
  txt(cx,fmt(SV.cf),pillR-15,24,13.5,'#8a5a10','right',3,'#fff',700);
  /* ---- page dots (top-center, under the strip) ---- */
  {const n=owned.length,dspace=Math.min(18,680/n),d0=640-(n-1)*dspace/2;
   for(let i=0;i<n;i++){cx.fillStyle=i===G.upIdx?'#fffdf6':'rgba(40,30,16,.5)';
     cx.beginPath();cx.arc(d0+i*dspace,74,i===G.upIdx?5.5:3.2,0,TAU);cx.fill();
     if(i===G.upIdx){cx.lineWidth=2;cx.strokeStyle='rgba(40,30,16,.75)';cx.stroke()}}}
  /* ---- horizontal carousel ---- */
  const drawCard=(x,y,w,h,cc,active)=>{
    const inTeam=SV.teams[SV.teamSel].includes(cc.id);
    const lvv=catLv(cc.id),plv=catPlus(cc.id),cost2=lvlUpCost(cc.id);
    cx.save();cx.shadowColor='rgba(60,40,10,.4)';cx.shadowBlur=active?14:6;cx.shadowOffsetY=active?6:3;
    cx.fillStyle='#fffdf6';rr(cx,x,y,w,h,14);cx.fill();cx.restore();
    cx.lineWidth=active?5:3;cx.strokeStyle='#fffdf6';rr(cx,x,y,w,h,14);cx.stroke();
    cx.fillStyle='#0c0c14';rr(cx,x+6,y+6,w-12,h-12,10);cx.fill(); // black interior
    if(active){cx.lineWidth=1.5;cx.strokeStyle='rgba(255,255,255,.22)';rr(cx,x+9,y+9,w-18,h-18,8);cx.stroke()}
    const nm=cc.forms[catForm(cc.id)].n;
    let nfs=active?19:14;cx.font=FONT(nfs,700);while(cx.measureText(nm).width>w-70&&nfs>9)nfs--;
    txt(cx,nm,x+w/2,y+27,nfs,'#fff','center',4,'#000',700);
    txt(cx,cc.rarity.toUpperCase(),x+w-12,y+27,9.5,shade(RAR_COL[cc.rarity],1.05),'right',3,'#000',700);
    ART.catIcon(cc.id,x+w/2,y+h/2-16,active?46:33,active?undefined:0.62);
    if(inTeam){ // red circular IN USE stamp over the art
      cx.save();cx.translate(x+w-58,y+h/2-14);cx.rotate(-0.28);
      cx.strokeStyle='#ff4040';cx.lineWidth=4;cx.beginPath();cx.arc(0,0,33,0,TAU);cx.stroke();
      cx.lineWidth=1.6;cx.beginPath();cx.arc(0,0,27,0,TAU);cx.stroke();
      txt(cx,'In use',0,-0.5,12.5,'#ff4040','center',3,'rgba(255,255,255,.8)',700);cx.restore()}
    const bandH=active?62:50;
    cx.fillStyle='#23232e';rr(cx,x+6,y+h-bandH-6,w-12,bandH,8);cx.fill();
    txt(cx,'Level',x+18,y+h-bandH/2-9,active?11.5:10,'#cfcfe0','left');
    txt(cx,String(lvv)+(plv?' +'+plv:''),x+72,y+h-bandH/2-6,active?22:16,'#ffd23f','left',3.5,'rgba(0,0,0,.85)',700);
    if(cost2!=null){
      txt(cx,'Req. XP',x+18,y+h-bandH/2+13,active?11:9.5,'#9a9ab0','left');
      txt(cx,fmt(cost2),x+72,y+h-bandH/2+15,active?16:12.5,SV.xp>=cost2?'#ffd23f':'#ff8070','left',3.5,'rgba(0,0,0,.85)',700)}
    else txt(cx,'Max Level',x+18,y+h-bandH/2+13,active?13:10.5,'#8fe89a','left',3,'rgba(0,0,0,.85)',700)};
  const n=owned.length;
  if(n>1){ // dimmed side cards (also clickable)
    const L=owned[((G.upIdx-1)%n+n)%n],Rr=owned[(G.upIdx+1)%n];
    drawCard(64,124,288,244,L,false);BTN('upsideL',64,124,288,244,()=>{G.upIdx--;SFX.click()},{flat:true,nohov:true});
    drawCard(928,124,288,244,Rr,false);BTN('upsideR',928,124,288,244,()=>{G.upIdx++;SFX.click()},{flat:true,nohov:true})}
  drawCard(470,94,340,300,c,true);
  // drag/swipe navigation across the carousel band
  G.onDrag=(p,pd)=>{if(pd.moved||pd.y<88||pd.y>404)return;
    const dx=p.x-pd.x;
    if(dx>70){G.upIdx--;SFX.click();pd.moved=true}
    else if(dx<-70){G.upIdx++;SFX.click();pd.moved=true}};
  // blue arrow tabs at the screen edges
  const navArrow=(ax,dir,id)=>{cx.save();cx.translate(ax,246);
    cx.fillStyle='rgba(122,196,255,.9)';cx.beginPath();
    if(dir<0){cx.moveTo(16,0);cx.lineTo(-14,-24);cx.lineTo(-14,24)}
    else{cx.moveTo(-16,0);cx.lineTo(14,-24);cx.lineTo(14,24)}
    cx.closePath();cx.fill();cx.lineWidth=3;cx.strokeStyle='rgba(30,60,100,.55)';cx.stroke();cx.restore();
    BTN(id,ax-34,204,68,84,()=>{G.upIdx=(G.upIdx+dir+n)%n;SFX.click()},{flat:true,nohov:true})};
  navArrow(46,-1,'upL');navArrow(1234,1,'upR');
  /* ---- LEVEL UP !! button: dark olive fill, silver chunky letters, thick magenta border ---- */
  const cost=lvlUpCost(c.id);
  BTN('lvlup',80,412,460,74,()=>{
    if(cost==null)return;
    if(SV.xp>=cost){SV.xp-=cost;SV.cats[c.id].lv++;if(SV.missions)SV.missions.up=(SV.missions.up||0)+1;persist();SFX.up();checkUnlocks(c.id)}
    else{toast('Not enough XP!','#ff7a7a');SFX.error()}},{flat:true,r:14,draw:cc=>{
      cc.shadowColor='rgba(40,20,60,.45)';cc.shadowBlur=8;cc.shadowOffsetY=4;
      cc.fillStyle='#8a804a';rr(cc,0,0,460,74,14);cc.fill();cc.shadowColor='transparent';
      const g=cc.createLinearGradient(0,0,0,74);g.addColorStop(0,'rgba(255,255,255,.22)');g.addColorStop(1,'rgba(0,0,0,.14)');
      cc.fillStyle=g;rr(cc,0,0,460,74,14);cc.fill();
      cc.lineWidth=5;cc.strokeStyle=cost==null?'#8a8a96':'#ff2fd0';rr(cc,2.5,2.5,455,69,12);cc.stroke();
      const lab=cost==null?'Max Level':'Upgrade!!';
      cc.font=FONT(33,700);cc.textAlign='center';cc.textBaseline='middle';cc.lineJoin='round';
      cc.lineWidth=9;cc.strokeStyle='#26262e';cc.strokeText(lab,230,39);
      cc.lineWidth=3;cc.strokeStyle='#eef0f8';cc.strokeText(lab,230,39);
      cc.fillStyle=cost==null?'#9a9aa8':'#e2e4f0';cc.fillText(lab,230,39);
      if(cost!=null)txt(cc,fmt(cost)+' XP',230,62,11,SV.xp>=cost?'#ffd23f':'#ffb0a0','center',3,'#26262e',700)}});
  /* ---- purple Evolve button (right-aligned above the description panel) ----
     Official gating (Builder P, Defect 6): evolution to form i needs catLv ≥ need
     (normal: 10 then 30 · other rarities: 20 then 30) AND the form's catfruit cost owned.
     Gated = GREY button + an exact missing-requirements tooltip line. */
  const nextFi=fi+1;let fcTxt=[],fruitMiss=[],canLv=true,canFruit=true,need=0;
  if(nextFi<c.forms.length){
    need=nextFi===1?10:(c.rarity==='normal'?20:30); // wiki: 2nd form lv10 for all; true form lv20 (normals) / lv30+catfruit (rare+)
    const fc=(FRUIT_COST[c.rarity]||{})[nextFi];
    canLv=catLv(c.id)>=need;canFruit=true;fruitMiss=[];
    if(fc)for(const k in fc){const have=SV.fruit[k]||0;if(have<fc[k]){canFruit=false;fruitMiss.push((fc[k]-have)+'× '+FRUIT_NAMES[k])}fcTxt.push(FRUIT_NAMES[k].replace(' Catfruit','')+' '+have+'/'+fc[k])}}
  const evoReady=canLv&&canFruit; // gated unless the level rule AND the catfruit cost are satisfied
  const evoDone=evoReady; // "ready — tap EVOLVE!" tip must agree with the actual button gate
  if(nextFi<c.forms.length){
    const gateTxt=!canLv?('Need Lv.'+need+(fruitMiss.length?' · Need '+fruitMiss.join(', '):''))
      :fruitMiss.length?('Need '+fruitMiss.join(', ')):'';
    BTN('evo',570,412,420,74,()=>{
      if(!canLv){toast('Need level '+need+' first!','#ff7a7a');SFX.error();return}
      if(!canFruit){toast('Not enough Catfruit! Need '+fruitMiss.join(', '),'#ff7a7a');SFX.error();return}
      const fc=(FRUIT_COST[c.rarity]||{})[nextFi];if(fc)for(const k in fc)SV.fruit[k]-=fc[k];
      SV.cats[c.id]['ev'+nextFi]=true;if(SV.missions)SV.missions.up=(SV.missions.up||0)+1; // daily mission hook (improvements)
      persist();SFX.win2();toast('EVOLVED \u2192 '+c.forms[nextFi].n+'!','#7fe8a0')},{flat:true,r:14,draw:cc=>{
      cc.shadowColor='rgba(30,10,60,.45)';cc.shadowBlur=8;cc.shadowOffsetY=4;
      cc.fillStyle=evoReady?'#8a4adf':'#8f8f9c';rr(cc,0,0,420,74,14);cc.fill();cc.shadowColor='transparent';
      const g=cc.createLinearGradient(0,0,0,74);g.addColorStop(0,'rgba(255,255,255,.2)');g.addColorStop(1,'rgba(0,0,0,.15)');
      cc.fillStyle=g;rr(cc,0,0,420,74,14);cc.fill();
      cc.lineWidth=4.5;cc.strokeStyle=evoReady?'#e8c8ff':'#c8c8d2';rr(cc,2.5,2.5,415,69,12);cc.stroke();
      cc.font=FONT(24,700);cc.textAlign='center';cc.textBaseline='middle';cc.lineJoin='round';
      cc.lineWidth=7;cc.strokeStyle='#241038';cc.strokeText('EVOLVE',210,30);
      cc.lineWidth=2.5;cc.strokeStyle=evoReady?'#f0e0ff':'#d8d8e2';cc.strokeText('EVOLVE',210,30);
      cc.fillStyle=evoReady?'#fff':'#c4c4d0';cc.fillText('EVOLVE',210,30);
      txt(cc,evoReady?'Ready to evolve!':gateTxt,210,58,12.5,evoReady?'#ffe95a':'#ffd0c0','center',3,'#241038',700)}})}
  /* ---- Talents chip (opens the NP talent flow in a modal) ---- */
  if((c.tal||[]).length){
    BTN('tals',1010,412,200,74,()=>{openTalentsModal(c)},{flat:true,r:14,draw:cc=>{
      cc.shadowColor='rgba(30,10,60,.4)';cc.shadowBlur=6;cc.shadowOffsetY=3;
      cc.fillStyle='#3a2a58';rr(cc,0,0,200,74,14);cc.fill();cc.shadowColor='transparent';
      cc.lineWidth=3;cc.strokeStyle='#a86adf';rr(cc,1.5,1.5,197,71,13);cc.stroke();
      txt(cc,'TALENTS',100,28,17,'#e8d8ff','center',3.5,'#241038',700);
      txt(cc,'NP '+fmt(SV.np),100,54,14,'#ffd23f','center',3,'#241038',700)}})}
  /* ---- description panel: brown gradient, centered white text ---- */
  {const px=70,py=506,pw=1140,ph=104;
   const dg=cx.createLinearGradient(0,py,0,py+ph);dg.addColorStop(0,'#6d5632');dg.addColorStop(1,'#453419');
   cx.fillStyle=dg;rr(cx,px,py,pw,ph,14);cx.fill();
   cx.lineWidth=3;cx.strokeStyle='#191922';rr(cx,px,py,pw,ph,14);cx.stroke();
   const abilLine=form.abil.length?'ABILITIES: '+form.abil.map(a=>abilStr(a)).join(' · '):'A dependable all-rounder \u2014 no special abilities.';
   txt(cx,abilLine,640,py+27,14,'#fff','center',3,'rgba(0,0,0,.55)');
   txt(cx,c.rarity.toUpperCase()+' · Form '+(fi+1)+'/'+c.forms.length+' · HP '+fmt(s.hp)+' · ATK '+fmt(s.atk)+' · Cost '+s.cost+'\u00a2 · Range '+s.range+' · '+s.rate+'s per hit',640,py+53,12.5,'#e8d8b8','center',2.5,'rgba(0,0,0,.5)');
   let l3='';
   if(nextFi<c.forms.length)l3=evoDone?'Next form \u201c'+c.forms[nextFi].n+'\u201d is ready \u2014 tap EVOLVE!':'Next form: '+c.forms[nextFi].n+' \u2014 needs Lv '+need+(fcTxt.length?' + '+fcTxt.join(', '):'');
   else l3='All forms unlocked · plus levels come from duplicate Cats in the Gacha';
   txt(cx,l3,640,py+79,12.5,nextFi<c.forms.length?(evoDone?'#a0f0a0':'#ffd9a8'):'#c8b890','center',2.5,'rgba(0,0,0,.5)')}
  /* ---- official bottom row: back circle (curved arrow) / STORE pill w/ cart / Cat Food count ---- */
  drawBackArrow(cx,52,698,26);
  BTN('back',24,670,56,56,pop,{flat:true,nohov:true});
  cx.fillStyle='#ffd23f';rr(cx,556,680,168,38,19);cx.fill();cx.lineWidth=3.5;cx.strokeStyle='#5a3b16';rr(cx,556,680,168,38,19);cx.stroke();
  glyph(cx,'cart',604,699,10,'#5a3b16','#ffd23f');
  txt(cx,'Store',652,699.5,17,'#5a3b16','center',3,'#fff',700);
  BTN('storepill',556,680,168,38,()=>{push('store');SFX.click()},{flat:true,nohov:true});
  drawCFCan(cx,1092,699,13);txt(cx,fmt(SV.cf),1114,699,21,'#ffd23f','left',4,'#5a3210',700);
}
/* NP talents modal (reached from the Talents chip on the upgrade carousel) */
function openTalentsModal(c){SFX.click();
  openModal('TALENTS \u2014 '+c.forms[0].n,['Spend NP on permanent boosts for this Cat. NP comes from duplicate Uber/Legend Cats.'],[{n:'CLOSE',cb:()=>{}}],(mx,my,mw,mh)=>{
    txt(cx,'NP: '+fmt(SV.np),mx+mw/2,my+10,15,'#9a3ab8','center',3,'#fff',700);
    (c.tal||[]).forEach((t,i)=>{const tl=talentLv(c.id,i);const y=my+44+i*44;const cost=(i+1)*4+tl*4;
      creamPanel(mx+14,y-20,mw-28,36,'#cbb384');
      txt(cx,t.n+'  Lv'+tl+'/5',mx+30,y-2,14,'#5a4530','left',3,'#fff',700);
      if(tl<5)BTN('talm'+i,mx+mw-194,y-16,168,30,()=>{
        if(SV.np>=cost){SV.np-=cost;SV.np2[c.id]=SV.np2[c.id]||{};SV.np2[c.id][i]=tl+1;if(SV.missions)SV.missions.up=(SV.missions.up||0)+1;persist();SFX.up();openTalentsModal(c)}
        else{toast('Not enough NP!','#ff7a7a');SFX.error()}},{col:'#8a4adf',tcol:'#fff',label:cost+' NP',fs:13,r:9,modal:true});
      else txt(cx,'MAX',mx+mw-110,y-2,12,'#a89878','right')})})}
function abilStr(a){const D={kb:'Knockback',freeze:'Freeze',slow:'Slow',weaken:'Weaken',crit:'Critical Hit',savage:'Savage Blow',wave:'Wave Attack',surge:'Surge',toxic:'Toxic',dodge:'Dodge',warp:'Warp',curse:'Curse',barrierBreak:'Barrier Break',shieldPierce:'Shield Pierce',resist:'Resist',strengthen:'Strengthen',base:'Base Destroyer'};
  let s=D[a.a]||a.a;if(a.a==='strengthen')s+=' (ATK ×'+(1+(a.p||2))+' at half HP)';
  if(a.vs)s+=' ('+a.vs.map(v=>v[0].toUpperCase()+v.slice(1)).join('/')+')';if(a.p&&a.a!=='strengthen'&&a.a!=='resist'&&a.a!=='dodge')s+=' '+(a.p*100).toFixed(0)+'%';else if(a.a==='dodge')s+=' '+(a.p*100).toFixed(0)+'%';if(a.d&&(a.a==='freeze'||a.a==='slow'||a.a==='weaken'||a.a==='curse'))s+=' '+a.d+'s';return s}
function checkUnlocks(id){const lv=catLv(id);const c=CATMAP[id];if(lv>=10&&c.forms.length>1)toast(c.forms[0].n+' can now evolve!','#ffd94a')}

/* ============================== SCREEN: GACHA ============================== */
/* Official-style gacha IDLE room (gachaidle_a.jpg): warm wood interior, banner chips on the
   top bar, a big capsule machine under a spotlight, ticket chips top-right, two yellow pull
   buttons below the machine. The RESULT scene is drawGachaAnim (redefined in savesys.js). */
function drawGacha(dt){drawTopBar('GACHA CAPSULES',true);
  if(G.gachaSel==null)G.gachaSel=0;
  const bs=activeBanners();const b=bs[Math.min(G.gachaSel,bs.length-1)];
  // === warm wood-frame interior + darker floor band ===
  woodBody();
  cx.fillStyle='rgba(40,24,8,.32)';cx.fillRect(0,556,1280,110);
  cx.fillStyle='rgba(255,220,150,.10)';cx.fillRect(0,556,1280,3);
  // subtle radial spotlight behind the machine + warm pool of light on the floor
  const sp=cx.createRadialGradient(640,320,50,640,320,440);
  sp.addColorStop(0,'rgba(255,228,150,.38)');sp.addColorStop(.55,'rgba(255,216,140,.16)');sp.addColorStop(1,'rgba(255,216,140,0)');
  cx.fillStyle=sp;cx.fillRect(0,54,1280,666);
  const fp=cx.createRadialGradient(640,562,20,640,562,330);
  fp.addColorStop(0,'rgba(255,222,140,.20)');fp.addColorStop(1,'rgba(255,222,140,0)');
  cx.fillStyle=fp;cx.fillRect(0,556,1280,110);
  // dust motes drifting in the light
  for(let i=0;i<12;i++){const mx=(i*211+G.t*(6+i%4*3))%1300-30,my=110+((i*137)%400)+Math.sin(G.t*1.4+i)*8;
    cx.fillStyle='rgba(255,238,190,'+(0.10+0.08*Math.sin(G.t*2.6+i)).toFixed(2)+')';
    cx.beginPath();cx.arc(mx,my,1.6+(i%3)*0.7,0,TAU);cx.fill()}
  // === banner switcher: compact chips on the wood top-bar row ===
  bs.forEach((tb,i)=>{const on=i===G.gachaSel;const tx=344+i*172,tw=164,ty=on?10:12,th=on?34:30;
    cx.save();cx.globalAlpha=on?1:0.78;
    cx.shadowColor='rgba(20,10,30,.4)';cx.shadowBlur=on?8:3;cx.shadowOffsetY=on?2:1;
    const tg=cx.createLinearGradient(tx,0,tx+tw,0);tg.addColorStop(0,shade(tb.col2,0.8));tg.addColorStop(.5,tb.col);tg.addColorStop(1,shade(tb.col2,0.8));
    cx.fillStyle=tg;rr(cx,tx,ty,tw,th,9);cx.fill();cx.restore();
    if(on){cx.lineWidth=2.5;cx.strokeStyle='#fff8e8';rr(cx,tx+1.5,ty+1.5,tw-3,th-3,8);cx.stroke();
      // 3D bevel on the active tab: lit top edge + shaded bottom edge (Defect 11)
      cx.save();rr(cx,tx,ty,tw,th,9);cx.clip();
      cx.fillStyle='rgba(255,255,255,.32)';cx.fillRect(tx,ty,tw,4.5);
      cx.fillStyle='rgba(0,0,0,.24)';cx.fillRect(tx,ty+th-4.5,tw,4.5);
      cx.fillStyle='rgba(255,255,255,.14)';cx.fillRect(tx,ty+4.5,tw,2);
      cx.restore()}
    else{cx.lineWidth=1.5;cx.strokeStyle='rgba(40,20,50,.5)';rr(cx,tx+1,ty+1,tw-2,th-2,8);cx.stroke()}
    cx.fillStyle=tb.cap;cx.beginPath();cx.arc(tx+15,ty+th/2,8,0,TAU);cx.fill();
    cx.fillStyle=tb.col;cx.beginPath();cx.arc(tx+15,ty+th/2,8,Math.PI,0);cx.fill();
    cx.lineWidth=1.3;cx.strokeStyle='rgba(60,30,60,.55)';cx.beginPath();cx.arc(tx+15,ty+th/2,8,0,TAU);cx.stroke();
    cx.fillStyle='rgba(255,255,255,.55)';cx.beginPath();cx.arc(tx+12.5,ty+th/2-2.6,2.1,0,TAU);cx.fill(); // capsule glint
    let nm=tb.n;cx.font=FONT(10.5,700);while(cx.measureText(nm).width>tw-32&&nm.length>4)nm=nm.slice(0,nm.length-2);
    txt(cx,nm+(nm===tb.n?'':'…'),tx+27,ty+th/2+0.5,10.5,'#fff','left',2.5,'rgba(60,30,20,.85)',700);
    BTN('gtab'+i,tx,ty,tw,th,()=>{G.gachaSel=i;SFX.click()},{flat:true,nohov:true})});
  // === active-banner wooden sign above the machine ===
  const plx=396,ply=68,plw=488,plh=82;
  cx.save();cx.shadowColor='rgba(20,12,4,.45)';cx.shadowBlur=10;cx.shadowOffsetY=4;
  cx.fillStyle='#7a5222';rr(cx,plx,ply,plw,plh,14);cx.fill();cx.restore();
  cx.lineWidth=4;cx.strokeStyle='#c8913a';rr(cx,plx+2,ply+2,plw-4,plh-4,12);cx.stroke();
  cx.fillStyle=b.col;rr(cx,plx+10,ply+10,plw-20,5,2.5);cx.fill();
  txt(cx,b.n,640,ply+34,25,'#ffe9a8','center',5,'rgba(30,16,4,.9)',700);
  txt(cx,b.pool==='rare'?'Rare Units & Above!':b.pool==='legend'?'Legend & Uber Rare Units Appear!':'Uber Rare Units Guaranteed Lineup!',640,ply+62,14,'#ffd23f','center',3.5,'rgba(30,16,4,.85)',700);
  // === the capsule machine (centered, wobbles during a pull) ===
  const wob=(G.gachaAnim&&G.gachaAnim.banner===b.id)?G.t:0;
  capsuleMachine(cx,640,336,2.0,b.col,b.cap,wob);
  // === ticket counter chips, top-right of the machine ===
  const tchip=(ty2,iconBg,iconLn,pre,val)=>{cx.fillStyle='rgba(20,12,30,.55)';rr(cx,950,ty2,150,34,17);cx.fill();
    cx.fillStyle=iconBg;rr(cx,962,ty2+9,26,16,3);cx.fill();cx.lineWidth=1.5;cx.strokeStyle=iconLn;rr(cx,962,ty2+9,26,16,3);cx.stroke();
    txt(cx,pre+' '+val,996,ty2+17.5,14,iconBg,'left',3,'#0a0612',700)};
  tchip(170,'#bfe8ff','#4a7a9a','R',SV.tickets.rare);
  tchip(212,'#ffe9a8','#9a7a2a','G',SV.tickets.gold);
  // === 'Featured rotate in Xh Ym' chip (honest — counts to local midnight) + (i) rates button, top-right ===
  const feats=bannerFeats(b);
  cx.fillStyle='rgba(20,12,30,.55)';rr(cx,1088,86,156,28,14);cx.fill();
  txt(cx,'rotate in '+featRotateIn(),1166,100.5,12.5,'#ffd23f','center',2.5,'#1a0e20',700);
  cx.fillStyle='#3a9a5a';cx.beginPath();cx.arc(1246,72,16,0,TAU);cx.fill();
  cx.lineWidth=2.5;cx.strokeStyle='#1e5a30';cx.stroke();
  txt(cx,'i',1246,73,17,'#fff','center',3,'#1e5a30',700);
  BTN('ginfo',1226,52,40,40,()=>{SFX.click();openGachaInfo(b)},{flat:true,nohov:true});
  // === TODAY'S FEATURED strip (right column): the daily rotation, live — 25% boost applies to these ===
  {const fx=950,fy=262,fw=306,fh=54+feats.length*56;
    cx.save();cx.shadowColor='rgba(20,12,4,.5)';cx.shadowBlur=8;cx.shadowOffsetY=3;
    cx.fillStyle='rgba(24,16,34,.82)';rr(cx,fx,fy,fw,fh,14);cx.fill();cx.restore();
    cx.lineWidth=2;cx.strokeStyle=b.col;rr(cx,fx,fy,fw,fh,14);cx.stroke();
    cx.lineWidth=1;cx.strokeStyle='rgba(255,255,255,.16)';rr(cx,fx+4,fy+4,fw-8,fh-8,11);cx.stroke();
    // header ribbon w/ clock glyph
    cx.fillStyle=b.col;rr(cx,fx+10,fy+8,fw-20,26,13);cx.fill();
    cx.strokeStyle='rgba(255,255,255,.9)';cx.lineWidth=1.8;
    cx.beginPath();cx.arc(fx+24,fy+21,7,0,TAU);cx.stroke();
    cx.beginPath();cx.moveTo(fx+24,fy+21);cx.lineTo(fx+24,fy+16.5);cx.moveTo(fx+24,fy+21);cx.lineTo(fx+27.5,fy+21);cx.stroke();
    txt(cx,'TODAY\u2019S FEATURED',fx+fw/2+8,fy+21,12.5,'#fff','center',2.5,'rgba(20,10,30,.85)',700);
    feats.forEach((fid,i)=>{const fc=CATMAP[fid];const ry=fy+44+i*56;
      const first=i===0;const pu=first?1+Math.sin(G.t*4)*0.05:1;
      // row plate (first row gets a subtle glow)
      cx.save();if(first){cx.shadowColor=b.col;cx.shadowBlur=8+4*Math.sin(G.t*4)}
      cx.fillStyle='rgba(255,255,255,'+(first?'.12':'.07')+')';rr(cx,fx+10,ry,fw-20,48,10);cx.fill();cx.restore();
      cx.lineWidth=1.5;cx.strokeStyle=first?b.col:'rgba(255,255,255,.14)';rr(cx,fx+10,ry,fw-20,48,10);cx.stroke();
      // cat icon in a rarity-ringed medallion
      cx.save();cx.translate(fx+38,ry+24);cx.scale(pu,pu);
      cx.fillStyle='#fff8e8';cx.beginPath();cx.arc(0,0,17,0,TAU);cx.fill();
      cx.lineWidth=2.5;cx.strokeStyle=RAR_COL[fc.rarity];cx.stroke();cx.restore();
      ART.catIcon(fid,fx+38,ry+24,20);
      // name + rarity tag
      txt(cx,fc.forms[0].n,fx+62,ry+16,13,'#fff','left',2.5,'rgba(10,6,20,.9)',700);
      txt(cx,fc.rarity.toUpperCase()+' \u00b7 25% BOOST',fx+62,ry+35,9.5,shade(RAR_COL[fc.rarity],1.25),'left',2,'#0a0612',700);
      // owned check / NEW tag
      if(SV.cats[fid])txt(cx,'OWNED \u2713',fx+fw-18,ry+24,9.5,'#7fe8a0','right',2,'#0a0612',700);
      else{const np2=1+Math.sin(G.t*5)*0.06;cx.save();cx.translate(fx+fw-44,ry+24);cx.scale(np2,np2);
        cx.fillStyle='#e84030';rr(cx,-24,-9,48,18,9);cx.fill();
        txt(cx,'NEW!',0,0.5,9.5,'#fff','center',2,'#7a1a10',700);cx.restore()}});
    txt(cx,'new featured cats every midnight',fx+fw/2,fy+fh-8,9,'rgba(255,255,255,.55)','center')}
  // === pull buttons: big yellow official-style pair below the machine ===
  const canTicket=SV.tickets.rare>0,can1=canTicket||SV.cf>=b.cost,can10=SV.cf>=b.cost10;
  const step=(SV.gachaSteps&&SV.gachaSteps[b.id])||0;
  // pity step pill (pulls since last featured-ish result, /10) — labeled + capped state
  cx.fillStyle='rgba(20,12,30,.55)';rr(cx,208,582,142,52,14);cx.fill();
  cx.fillStyle=b.cap;cx.beginPath();cx.arc(232,606,11,0,TAU);cx.fill();
  cx.fillStyle=b.col;cx.beginPath();cx.arc(232,606,11,Math.PI,0);cx.fill();
  txt(cx,step+' / 10',252,602,16,'#fff','left',3,'#1a0e20',700);
  txt(cx,step>=10?'guaranteed!':'step pity',252,622,9,step>=10?'#ffd23f':'#9a8fb0','left',2,'#1a0e20',step>=10?700:400);
  const pullBtn=(id,bx,label,costTxt,enabled,cb,glowCol)=>{cx.save();
    if(enabled){cx.shadowColor=glowCol;cx.shadowBlur=12}
    const g=cx.createLinearGradient(0,576,0,634);g.addColorStop(0,enabled?'#ffe24a':'#cfc4a8');g.addColorStop(1,enabled?'#ffb420':'#a89c80');
    cx.fillStyle=g;rr(cx,bx,576,250,58,16);cx.fill();cx.restore();
    cx.lineWidth=3.5;cx.strokeStyle=enabled?'#5a3b16':'#6a604c';rr(cx,bx,576,250,58,16);cx.stroke();
    // glassy top highlight
    cx.save();rr(cx,bx,576,250,58,16);cx.clip();
    cx.fillStyle='rgba(255,255,255,'+(enabled?0.30:0.14)+')';cx.beginPath();cx.ellipse(bx+125,582,105,13,0,0,TAU);cx.fill();cx.restore();
    txt(cx,label,bx+125,596,21,enabled?'#fff':'#e4ddca','center',4.5,'#5a3b16',700);
    txt(cx,costTxt,bx+125,618,15,enabled?'#fff':'#ddd6c2','center',3,'#5a3b16',700);
    BTN(id,bx,576,250,58,cb,{flat:true,nohov:true})};
  pullBtn('gtry',380,'Try once!',canTicket?'Rare Ticket ×'+SV.tickets.rare:fmt(b.cost)+' CF',can1,
    ()=>{if(canTicket){SV.tickets.rare--;doPull(b.id,1,0,true);syncSteps(b.id,1)}else doPull(b.id,1,b.cost)},
    'rgba(255,210,63,.5)');
  pullBtn('g10',630,'Try 10+1!',fmt(b.cost10)+' CF — RARE+ guaranteed!',can10,
    ()=>{doPull(b.id,11,b.cost10);if(SV.cf>=b.cost10)syncSteps(b.id,11)},
    'rgba(255,154,213,.45)');
  // flavor line under the buttons
  txt(cx,'Uses Cat Food or Rare Tickets \u2014 every 10+1 guarantees a RARE or better!',540,652,14,'#ffe95a','center',4,'rgba(30,16,4,.9)',700);
  // === GOLD TICKET PULL (Defect 7): distinct gold button when a Gold Ticket is held ===
  if(SV.tickets.gold>0){
    cx.save();cx.shadowColor='rgba(255,210,63,.65)';cx.shadowBlur=14;
    const gg=cx.createLinearGradient(0,576,0,634);gg.addColorStop(0,'#ffe97a');gg.addColorStop(1,'#eda41c');
    cx.fillStyle=gg;rr(cx,930,576,250,58,16);cx.fill();cx.restore();
    cx.save();rr(cx,930,576,250,58,16);cx.clip();
    cx.fillStyle='rgba(255,255,255,.35)';cx.beginPath();cx.ellipse(1055,582,105,13,0,0,TAU);cx.fill();cx.restore();
    cx.lineWidth=4;cx.strokeStyle='#8a5a10';rr(cx,930,576,250,58,16);cx.stroke();
    cx.lineWidth=1.5;cx.strokeStyle='rgba(255,255,255,.75)';rr(cx,934,580,242,50,12);cx.stroke();
    txt(cx,'GOLD TICKET PULL',1055,596,17,'#fff','center',4.5,'#7a4a08',700);
    txt(cx,'Guaranteed Uber! ×'+SV.tickets.gold,1055,618,14,'#fff','center',3,'#7a4a08',700);
    for(let si=0;si<3;si++){const sa=G.t*2.2+si*2.1;const sxp=1055+Math.cos(sa)*108,syp=605+Math.sin(sa)*22;
      cx.fillStyle='rgba(255,244,200,'+(0.5+0.4*Math.sin(G.t*6+si*2)).toFixed(2)+')';star(cx,sxp,syp,5,2.1);cx.fill()}
    BTN('ggold',930,576,250,58,()=>{doGoldPull(b.id)},{flat:true,nohov:true})}
  // Cat Food can + balance (bottom-right of the machine room \u2014 the global bottom menu is
  // intentionally NOT shown on this screen, matching the official gacha layout; Defect 10)
  drawCFCan(cx,1128,646,12);
  txt(cx,fmt(SV.cf),1150,646,21,'#ffd23f','left',4,'rgba(30,16,4,.95)',700);
  // banner cycle arrows flanking the machine
  const drawArrow=(ax,ay,dir,id)=>{cx.save();cx.translate(ax,ay);
    cx.fillStyle='rgba(20,12,30,.45)';cx.beginPath();cx.moveTo(dir*22,0);cx.lineTo(-dir*14,-26);cx.lineTo(-dir*14,26);cx.closePath();cx.fill();
    cx.lineWidth=2.5;cx.strokeStyle='rgba(255,248,232,.75)';cx.beginPath();cx.moveTo(dir*22,0);cx.lineTo(-dir*14,-26);cx.lineTo(-dir*14,26);cx.closePath();cx.stroke();
    cx.restore();BTN(id,ax-30,ay-34,60,68,()=>{const n=bs.length;G.gachaSel=(G.gachaSel+dir+n)%n;SFX.click()},{flat:true,nohov:true})};
  drawArrow(190,330,-1,'garrL');drawArrow(916,330,1,'garrR'); // right arrow sits clear of the featured strip (panel starts at x=950)
  // ---- storage box bottom-left (drawn cabinet, no emoji) ----
  cx.save();cx.translate(120,600);
  cx.fillStyle='#e8e4da';rr(cx,-38,-34,76,62,6);cx.fill();
  cx.lineWidth=2.5;cx.strokeStyle='#5a5a66';rr(cx,-38,-34,76,62,6);cx.stroke();
  cx.fillStyle='#d4d0c6';rr(cx,-30,-26,60,16,3);cx.fill();cx.lineWidth=1.6;cx.strokeStyle='#8a8a96';rr(cx,-30,-26,60,16,3);cx.stroke();
  cx.fillStyle='#c8c4ba';rr(cx,-30,-6,60,16,3);cx.fill();cx.lineWidth=1.6;cx.strokeStyle='#8a8a96';rr(cx,-30,-6,60,16,3);cx.stroke();
  cx.fillStyle='#5a5a66';cx.beginPath();cx.arc(0,2,3,0,TAU);cx.fill();
  cx.restore();
  txt(cx,'Storage',120,650,14,'#fff','center',3.5,'rgba(40,20,50,.9)',700);
  BTN('gstorage',76,556,88,100,()=>{SFX.click();openModal('STORAGE',['Dupe Plus levels and NP upgrades live in IMPROVE CATS.','Sold-out banner lineups rotate back every day.'],[{n:'CLOSE',cb:()=>{}}])},{flat:true,nohov:true});
  if(G.gachaAnim)drawGachaAnim(dt)}
function syncSteps(bid,n){SV.gachaSteps=SV.gachaSteps||{};SV.gachaSteps[bid]=((SV.gachaSteps[bid]||0)+n)%11;persist()}
function openGachaInfo(b){
  const pool=CATS.filter(c=>c.rarity===(b.pool==='legend'?'legend':b.pool==='uber'?'uber':'rare')&&c.unlock&&c.unlock.gacha===b.pool).slice(0,8);
  const feats=bannerFeats(b);
  openModal(b.n,[
    b.pool==='rare'?'Rates: 89% Rare / 9% SR / 2% Uber':b.pool==='legend'?'Rates: 3% Legend / 27% Uber / 68% Rare+':'Rates: 9% Uber / 23% SR / 68% Rare+',
    'Today\u2019s featured: '+(feats.map(f=>CATMAP[f].forms[0].n).join(', ')||'\u2014'),
    'Featured cats have a boosted 25% appearance chance!',
    'Featured lineup rotates at midnight \u2014 new cats every day!',
    'Gold Tickets (from the Store) guarantee an Uber Rare \u2014 use the gold button!',
    pool.length?'On-banner: '+pool.map(c=>CATMAP[c.id].forms[0].n).join(', ')+'\u2026':''],
    [{n:'CLOSE',cb:()=>{}}])}
function doPull(bannerId,n,cost,free){
  if(!free&&SV.cf<cost){toast('Not enough Cat Food! Need '+cost+' CF.','#ff7a7a');SFX.error();return}
  // roll FIRST — only charge CF once the results exist (never lose Cat Food to a failed pull)
  const results=[];for(let k=0;k<n;k++){const id=rollGacha(bannerId);if(id)results.push(id)}
  if(!results.length){toast('Nothing obtained?!','#ff7a7a');return}
  if(!free)SV.cf-=cost;
  if(SV.missions)SV.missions.pull=(SV.missions.pull||0)+1; // daily mission hook
  SV.stats.pulls=(SV.stats.pulls||0)+n; // trophy/stat lifetime pull counter
  persist();SFX.click();
  savePendingPull(results,bannerId); // BUILDER C: results are durable the moment they're rolled — the grant itself happens exactly-once at the OK button (consumeGachaGrant in savesys.js) or, if the tab died first, at boot recovery
  G.gachaAnim={t:0,phase:0,results,banner:bannerId,best:bestRarity(results)}}
function bestRarity(ids){const ord={normal:0,rare:1,special:2,srar:3,uber:4,legend:5};return ids.reduce((a,id)=>Math.max(a,ord[CATMAP[id].rarity]),0)}
/* Gold Ticket redemption (Builder P, Defect 7): consumes 1 gold ticket, grants ONE guaranteed
   Uber-or-better gacha cat (banner featured Uber/Legends get the same 25%-ish weighting the
   regular rolls use when the active banner has any), and reuses the exact doPull result flow
   (pendingPull persistence + drawGachaAnim reveal + exactly-once OK grant). */
function doGoldPull(bannerId){
  if((SV.tickets.gold||0)<1){toast('No Gold Tickets! Get them in the Store.','#ff7a7a');SFX.error();return}
  const B=BANNERS.find(b2=>b2.id===bannerId);
  const ubers=CATS.filter(c=>c.rarity==='uber'&&c.unlock&&c.unlock.gacha==='uber');
  const legends=CATS.filter(c=>c.rarity==='legend'&&c.unlock&&c.unlock.gacha==='legend');
  const feat=bannerFeats(B).map(f=>CATMAP[f]).filter(c=>c&&(c.rarity==='uber'||c.rarity==='legend'));
  let pool=feat.length?feat.concat(ubers,legends):ubers.concat(legends); // featured weighted by presence
  if(!pool.length)pool=ubers.length?ubers:legends; // null-safe fallbacks (same policy as rollGacha)
  if(!pool.length){toast('No Uber pool available!','#ff7a7a');return}
  const R=rnd((now()+((Math.random()*4294967296)>>>0))>>>0);
  const id=pick(pool,R).id;
  SV.tickets.gold--; // consume exactly one gold ticket, then persist BEFORE the reveal
  if(SV.missions)SV.missions.pull=(SV.missions.pull||0)+1;
  SV.stats.pulls=(SV.stats.pulls||0)+1; // trophy/stat lifetime pull counter
  persist();SFX.click();
  savePendingPull([id],bannerId);
  G.gachaAnim={t:0,phase:0,results:[id],banner:bannerId,best:bestRarity([id])}}
const RAR_FLASH={normal:'#c9c9d6',rare:'#8fe8ff',special:'#7fd0ff',srar:'#ffd94a',uber:'#ff9ad5',legend:'#c46adf'};
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
    const n=A.results.length;const cols=n>6?6:n;const rows=Math.ceil(n/cols);const cw=150;const ox=640-(cols*cw+ (cols-1)*10)/2;
    A.results.slice(0,Math.min(shown,n)).forEach((id,i)=>{const col=i%cols,row=Math.floor(i/cols);const x=ox+col*(cw+10),y=180+row*190;
      // per-card pop-in: back-eased scale + rarity glow flash + NEW sparkles
      const pr=clamp((A.reveal-i)/0.45,0,1);if(pr<=0)return;
      const q=pr-1;const sc2=1+2.7*q*q*q+1.7*q*q; // back-out ease (overshoots to ~1.1)
      const c=CATMAP[id];const dup=catOwned(id);
      cx.save();cx.globalAlpha=pr;cx.translate(x+cw/2,y+85);cx.scale(sc2,sc2);cx.translate(-(x+cw/2),-(y+85));
      if(pr<1){cx.fillStyle=RAR_COL[c.rarity];cx.globalAlpha=(1-pr)*0.5;cx.beginPath();cx.arc(x+cw/2,y+85,95,0,TAU);cx.fill();cx.globalAlpha=pr}
      panel(x,y,cw,170,'#fff8e8',shade(RAR_COL[c.rarity],.75));
      ART.catIcon(id,x+cw/2,y+58,30);
      txt(cx,c.forms[0].n,x+cw/2,y+108,11.5,'#5a3b16','center',3,'#fff',700);
      txt(cx,c.rarity.toUpperCase(),x+cw/2,y+126,10.5,shade(RAR_COL[c.rarity],.7),'center',2,'#fff',700);
      txt(cx,dup?'DUP! +1 Plus'+(c.rarity==='uber'||c.rarity==='legend'?' +'+({uber:5,legend:10}[c.rarity])+' NP':''):'NEW!',x+cw/2,y+146,11,dup?'#a89878':'#3a9a5a','center');
      if(!dup){ // sparkle shimmer on the card corners
        for(let si=0;si<2;si++){const sa=G.t*3+si*Math.PI+i;const sxp=x+cw/2+Math.cos(sa)*78,syp=y+85+Math.sin(sa)*88;
          cx.fillStyle='rgba(255,220,90,'+(0.55+0.4*Math.sin(G.t*7+si))+')';star(cx,sxp,syp,8,3.2);cx.fill()}}
      cx.restore()});
    if(shown>=n)BTN('gok',640-110,596,220,56,()=>{ // apply results
      A.results.forEach(id=>{const res=unlockCat(id,'dupe');if(res&&res.dupe&&SV.cats[id])SV.cats[id].plus=Math.min(RARITY_LV[CATMAP[id].rarity].plusCap,SV.cats[id].plus+1)});
      persist();G.gachaAnim=null;SFX.click()},{col:'#ffd94a',label:'OK',fs:20})}}

/* ============================== SCREEN: TREASURE ============================== */
function drawTreasure(dt){drawTopBar('TREASURE COLLECTION',true);
  woodBody();
  const chs=CHAPTERS.filter(c=>c.treasure);
  // RADAR digest button (top bar, between title and stats pill) — red badge pings hot sets
  {const hotN=radarHotCount();
    const pu=hotN>0?1+Math.sin(G.t*5)*0.04:1;
    cx.save();cx.translate(780,27);cx.scale(pu,pu);
    if(hotN>0){cx.shadowColor='rgba(255,180,40,'+(0.35+0.3*Math.sin(G.t*5)).toFixed(2)+')';cx.shadowBlur=10}
    const rg=cx.createLinearGradient(-80,0,80,0);rg.addColorStop(0,'#e8951f');rg.addColorStop(.5,'#ffd23f');rg.addColorStop(1,'#e8951f');
    cx.fillStyle=rg;rr(cx,-80,-18,160,36,18);cx.fill();cx.shadowColor='transparent';
    cx.lineWidth=2.5;cx.strokeStyle='#8a5a10';rr(cx,-78.5,-16.5,157,33,17);cx.stroke();
    // radar sweep glyph (disc + orbiting blip dot)
    cx.fillStyle='#5a3b16';cx.beginPath();cx.arc(-58,0,8,0,TAU);cx.fill();
    cx.strokeStyle='#5a3b16';cx.lineWidth=1.6;
    cx.beginPath();cx.arc(-58,0,13,Math.PI*0.15,Math.PI*0.85);cx.stroke();
    const ba=G.t*2.2; // blip orbits the disc (radar sweep)
    cx.fillStyle='#7a2a10';cx.beginPath();cx.arc(-58+Math.cos(ba)*10,Math.sin(ba)*10,2.2,0,TAU);cx.fill();
    cx.restore();
    txt(cx,'RADAR',826,27.5,14,'#4a2f10','center',3,'#fff',700);
    BTN('tradar',700,9,160,36,()=>{openRadarModal()},{flat:true,nohov:true});
    if(hotN>0){ // badge count (pulses red like the MISSIONS badge)
      const bp=1+Math.sin(G.t*6)*0.12;
      cx.save();cx.translate(852,13);cx.rotate(Math.sin(G.t*5)*0.12);cx.scale(bp,bp);
      cx.fillStyle='#e84030';cx.beginPath();cx.arc(0,0,12,0,TAU);cx.fill();
      cx.lineWidth=2;cx.strokeStyle='#7a1a10';cx.stroke();
      txt(cx,String(hotN),0,0.5,12,'#fff','center',2,'#7a1a10',700);cx.restore()}}
  // chapter tabs (locked tabs self-guard: BTN disabled is visual-only)
  const CH_PREV={eoc2:'eoc1',eoc3:'eoc2',itf1:'eoc3',itf2:'itf1',itf3:'itf2',cotc1:'itf3',cotc2:'cotc1',cotc3:'cotc2'};
  chs.forEach((c,i)=>{const x=20+i*138;BTN('tch'+i,x,64,132,44,()=>{
    if(!chapterUnlocked(c.id)){const pv=CH_PREV[c.id];toast('Clear '+(pv?CHMAP[pv].n:'earlier chapters')+' first to unlock!','#ffb060');SFX.error();return}
    G.tChap=c.id;SFX.click()},{col:G.tChap===c.id?'#ffd23f':'#fffdf5',outline:'#5a3b16',label:c.n.replace('Empire of Cats: ','EoC ').replace('Into the Future: ','ItF ').replace('Cats of the Cosmos: ','CotC '),fs:11.5,r:10,disabled:!chapterUnlocked(c.id)})});
  if(!G.tChap)G.tChap='eoc1';const c=CHMAP[G.tChap]||chs[0];const sets=CHSETS[c.id];
  const multTxt=s=>treasureMult(s).toFixed(2)+'×';
  txt(cx,'Clear stages in '+c.n+' for a chance to find treasure pieces! Each tier stacks.',20,130,14,'#f5e6c4','left',3,'#5a3b16',700);
  // catfruit inventory strip
  const fruits=Object.keys(FRUIT_NAMES);
  txt(cx,'CATFRUIT',712,132,12.5,'#ffe9b0','left',3,'#5a3b16',700);
  fruits.forEach((fk,i)=>{const fx=786+i*64;const have=SV.fruit[fk]||0;
    cx.fillStyle=have?'#fff8e8':'rgba(255,248,232,.35)';rr(cx,fx,114,58,36,10);cx.fill();cx.lineWidth=2;cx.strokeStyle='rgba(90,59,22,.6)';rr(cx,fx,114,58,36,10);cx.stroke();
    cx.fillStyle=FRUIT_COL[fk];cx.beginPath();cx.arc(fx+15,132,9,0,TAU);cx.fill();cx.strokeStyle='#5a3b16';cx.lineWidth=1.8;cx.stroke();
    cx.fillStyle='rgba(255,255,255,.4)';cx.beginPath();cx.arc(fx+12,129,3,0,TAU);cx.fill();
    txt(cx,String(have),fx+50,132,14,have?'#5a3b16':'#c8b888','center',3,'#fff',700)});
  // grid 9 sets x 3 tiers
  for(let i=0;i<9;i++){const x=20+(i%3)*416,y=146+Math.floor(i/3)*168;const set=sets[i];const own=tCount(c.id,i);
    creamPanel(x,y,400,160,'#d8913a');
    txt(cx,set.n,x+14,y+26,14,'#b06a10','left',3,'#fff',700);
    txt(cx,TSTATS[set.stat]+'  total: '+multTxt(set.stat),x+14,y+48,12,'#8a6a10','left');
    const sg=(G.sessionTreasure||{})[c.id+'|'+i]; // session farming gains (this run of the game)
    if(sg){cx.fillStyle='#ffe9b8';rr(cx,x+256,y+12,130,22,11);cx.fill();cx.lineWidth=1.8;cx.strokeStyle='#b08a50';rr(cx,x+256,y+12,130,22,11);cx.stroke();
      txt(cx,'+'+sg+' THIS SESSION',x+321,y+24,9.5,'#8a5a10','center',2,'#fff',700)}
    for(let t=0;t<3;t++){const tx=x+14+t*126,ty=y+66;const got=own>t;
      panel(tx,ty,118,74,got?'#ffe9b8':'#e8d8b0',got?'#e8951f':'#cbb384');
      if(got){cx.save();cx.translate(tx+59,ty+30);cx.rotate(Math.sin(G.t*2+i+t)*0.08);
        cx.fillStyle=t===0?'#cd7f32':t===1?'#c0c0c0':'#ffd700';cx.beginPath();cx.arc(0,0,16,0,TAU);cx.fill();cx.strokeStyle='#5a3b16';cx.lineWidth=2.5;cx.stroke();cx.fillStyle='rgba(255,255,255,.5)';cx.beginPath();cx.arc(-5,-5,6,0,TAU);cx.fill();cx.restore()}
      else txt(cx,'?',tx+59,ty+30,24,'#b8a884','center');
      txt(cx,['Bronze','Silver','Gold'][t],tx+59,ty+62,10,got?'#8a6a10':'#a89878','center')}
    // FARM SET jump (closes the radar loop: treasure screen → map focused on this set's stages)
    {const farmStages=[0,9,18,27,36].map(k=>i+k).filter(idx=>idx<48&&stageUnlocked(c.id,idx));
      const farmable=farmStages.length>0,hot=own===2&&farmable;
      const pu=hot?1+Math.sin(G.t*5)*0.05:1;
      cx.save();if(hot){cx.translate(x+336,y+49);cx.scale(pu,pu);cx.translate(-x-336,-y-49);
        cx.shadowColor='rgba(255,180,30,.55)';cx.shadowBlur=10}
      BTN('tfarm'+i,x+286,y+36,100,26,()=>farmJump(c.id,i),
        {col:farmable?(hot?'#ffd23f':'#e8c37f'):'#d8ccb0',outline:'#8a5a10',
         label:farmable?(hot?'1 LEFT · FARM!':'FARM SET'):'LOCKED',
         fs:hot?10:10.5,r:13,disabled:!farmable,tcol:'#4a2f10'});
      cx.restore()}
  }
  txt(cx,'Total attack multiplier: ×'+treasureMult('atk').toFixed(2)+'  ·  HP ×'+treasureMult('hp').toFixed(2)+'  ·  Wallet ×'+treasureMult('wallet').toFixed(2),640,650,14,'#ffe9b0','center',3,'#5a3b16',700);
  brownBottomBar()}
/* FARM SET jump: focus the chapter map on the highest-odds unlocked stage of this treasure
   set (chance grows with stage index) — pairs with the map's gold ◇ radar pings.
   stageIdx (optional): jump to a specific stage of the set (stage picker) */
function farmJump(ch,setI,stageIdx){
  const stages=[0,9,18,27,36].map(k=>setI+k).filter(idx=>idx<48&&stageUnlocked(ch,idx));
  if(!stages.length){toast('Clear more stages to unlock this set\'s farms!','#ffb060');SFX.error();return}
  const target=(stageIdx!==undefined&&stages.includes(stageIdx))?stageIdx:stages[stages.length-1];
  G.chapter=ch;G.mapSub=0;G.mapFocusIdx=target;G.mapFor=null;
  push('map');SFX.click()}
  // no toast here: the map's FARM TARGET banner carries the message (toast only duplicated + covered its ×)

/* STAGE PICKER (per-set farm menu): all 5 stages of one treasure set with live odds + lock
   state + BEST badge — opened from the radar rows' PICK button. */
function openStagePicker(ch,setI){SFX.click();
  const set=CHSETS[ch][setI];
  const own=tCount(ch,setI);
  const rows=[0,9,18,27,36].map(k=>setI+k).filter(idx=>idx<48);
  const unl=rows.filter(idx=>stageUnlocked(ch,idx));
  const best=unl[unl.length-1];
  openModal('FARM: '+set.n.toUpperCase(),
    [chShort(ch)+' · own '+own+'/3 tiers — odds grow with the stage number:'],
    [{n:'CANCEL',cb:()=>{openRadarModal()}}], // CANCEL returns to the radar (tab remembered), not a dead-end
    (mx,my,mw,mh)=>{
      rows.forEach((idx,i)=>{
        const rowH=46,y=my+6+i*(rowH+8),ok=stageUnlocked(ch,idx);
        creamPanel(mx+10,y,mw-20,rowH,ok?(idx===best?'#e8c37f':'#c8913a'):'#b8a888');
        // stage number medallion
        cx.fillStyle=ok?'#b06a10':'#a89878';cx.beginPath();cx.arc(mx+44,y+rowH/2,17,0,TAU);cx.fill();
        cx.lineWidth=2;cx.strokeStyle=ok?'#8a5a10':'#98887a';cx.stroke();
        txt(cx,String(idx+1),mx+44,y+rowH/2+0.5,14,'#fff','center',2.5,'#7a4a08',700);
        txt(cx,'STAGE '+(idx+1),mx+74,y+18,13,ok?'#5a3b16':'#a89878','left',3,'#fff',700);
        // next-tier chip: the tier that drops next (bronze→silver→gold)
        {const tc=['#cd7f32','#c0c0c0','#ffd700'][Math.min(own,2)];
          const tn=['BRONZE','SILVER','GOLD'][Math.min(own,2)];
          cx.save();cx.translate(mx+216,y+16);cx.rotate(Math.sin(G.t*2.5+idx*0.7)*0.03);
          cx.fillStyle=ok?'rgba(255,248,232,.9)':'rgba(232,216,176,.5)';rr(cx,-38,-9,76,18,9);cx.fill();
          cx.lineWidth=1.4;cx.strokeStyle=ok?'rgba(138,90,32,.55)':'rgba(138,106,58,.3)';rr(cx,-38,-9,76,18,9);cx.stroke();
          cx.fillStyle=tc;cx.beginPath();cx.arc(-25,0,5,0,TAU);cx.fill();
          cx.lineWidth=1.2;cx.strokeStyle=shade(tc,.6);cx.stroke();
          txt(cx,'NEXT: '+tn,4,0.5,8,ok?'#8a5a10':'#a89878','center',1.5,'#fff',700);cx.restore()}
        txt(cx,ok?'one clear = one tier roll':'locked — clear stage '+idx+' first',mx+74,y+34,9.5,ok?'#8a6a3a':'#a89878','left',2,'#fff',400);
        // odds / lock + BEST chip
        if(ok){txt(cx,Math.round(treasureChance(ch,idx,own)*100)+'%',mx+mw-330,y+rowH/2,18,idx===best?'#b06a10':'#8a6a3a','center',2.5,'#fff',700);
          if(idx===best){cx.save();cx.translate(mx+mw-252,y+rowH/2);cx.rotate(Math.sin(G.t*3)*0.04);
            cx.fillStyle='#c46adf';rr(cx,-40,-10,80,20,10);cx.fill();
            cx.lineWidth=1.8;cx.strokeStyle='#8a2aa8';rr(cx,-40,-10,80,20,10);cx.stroke();
            txt(cx,'\u2605 BEST',0,0.5,10,'#fff','center',2,'#6a1a8a',700);cx.restore()}}
        else drawPadlock(cx,mx+mw-330,y+rowH/2,8,'#8a8272');
        // per-row GO (locked rows self-guard: engine disabled flag is visual-only)
        BTN('spgo'+i,mx+mw-176,y+8,150,30,()=>{if(!stageUnlocked(ch,idx)){toast('Stage '+(idx+1)+' is locked — clear earlier stages first!','#ffb060');SFX.error();return}
          G.modal=null;farmJump(ch,setI,idx)},
          {col:ok?'#ffd23f':'#d8ccb0',outline:'#8a5a10',label:ok?'FARM!':'LOCKED',fs:12.5,tcol:'#4a2f10',r:15,disabled:!ok,modal:true})});
      txt(cx,'FARM focuses the map on that stage — gold \u25c7 radar pings mark its stages',mx+mw/2,my+mh-14,9.5,'#a89878','center',2,'#fff',400)})}

/* ============================== TREASURE RADAR (cross-chapter digest) ==============================
   Scans ALL 9 treasure chapters at once: every set at 2/3 (ONE piece left) with its best
   unlocked stage + odds, sorted by odds — one-click FARM jump per row. Closes the radar loop:
   radar digest → map focus → stage modal odds → battle. */
function radarSets(){
  const hot=[],near=[],done=[];let doneN=0,totalSets=0,tiers=0;
  CHAPTERS.filter(c=>c.treasure).forEach(c=>{
    CHSETS[c.id].forEach((set,i)=>{
      const own=tCount(c.id,i);totalSets++;tiers+=own;
      if(own>=3){doneN++;done.push({ch:c.id,setI:i,own:3});return}
      const stages=[0,9,18,27,36].map(k=>i+k).filter(idx=>idx<48&&stageUnlocked(c.id,idx));
      if(!stages.length)return; // nothing farmable unlocked yet
      const best=stages[stages.length-1];
      const row={ch:c.id,setI:i,own,best,odds:treasureChance(c.id,best,own)};
      if(own===2)hot.push(row);else if(own===1)near.push(row)})});
  hot.sort((a,b)=>b.odds-a.odds);near.sort((a,b)=>b.odds-a.odds);
  return{hot,near,done,doneN,totalSets,tiers}}
function radarHotCount(){return radarSets().hot.length}
function chShort(id){return (CHMAP[id].n||'').replace('Empire of Cats: ','EoC ').replace('Into the Future: ','ItF ').replace('Cats of the Cosmos: ','CotC ')}
function openRadarModal(){SFX.click();
  const R=radarSets();
  if(!G.radarTab||G.radarTab==='done'&&R.doneN===0)G.radarTab=R.hot.length?'hot':'near'; // default to the useful tab
  G.radarPage=0;
  openModal('TREASURE RADAR',
    [R.hot.length
      ?R.hot.length+' set'+(R.hot.length>1?'s':'')+' ONE piece from completion — sorted by best odds!'
      :'No sets at 2/3 yet — the CLOSE tab lists the nearest 1/3 sets!'],
    [{n:'CLOSE',cb:()=>{G.radarTab=null}}],
    (mx,my,mw,mh)=>{
      /* ---- tab pills: HOT (2/3) · CLOSE (1/3) · DONE (complete) ---- */
      const tabs=[['hot','HOT',R.hot.length,'#ffd23f'],['near','CLOSE',R.near.length,'#7fd0ff'],['done','DONE',R.doneN,'#7fc86a']];
      const tw=(mw-24-16)/3;
      tabs.forEach((tb,i)=>{
        const tx=mx+12+i*(tw+8),on=G.radarTab===tb[0];
        const pu=on&&tb[2]>0?1+Math.sin(G.t*4)*0.03:1;
        cx.save();cx.translate(tx+tw/2,my+16);cx.scale(pu,pu);cx.translate(-tx-tw/2,-my-16);
        BTN('rdtab'+tb[0],tx,my+2,tw,30,()=>{G.radarTab=tb[0];G.radarPage=0;SFX.click()},
          {col:on?tb[3]:'#d8ccb0',outline:'#8a5a10',label:tb[1]+(tb[2]>0?' · '+tb[2]:''),fs:11.5,tcol:'#4a2f10',r:15,modal:true});
        cx.restore()});
      const bodyY=my+44;
      /* ---- DONE tab: compact chip grid (4 per row) + pager — every completed set ---- */
      if(G.radarTab==='done'){
        const D=R.done;
        if(!D.length){txt(cx,'Nothing complete yet — fill all 3 tiers of a set to finish it!',mx+mw/2,bodyY+40,13,'#8a6a3a','center',3,'#fff',700);
          txt(cx,'(Bronze → Silver → Gold — one tier per treasure drop.)',mx+mw/2,bodyY+66,10.5,'#a89878','center',2,'#fff',400)}
        else{
          const chipW=(mw-20-3*8)/4,chipH=34,perPage=28;
          const pages=Math.max(1,Math.ceil(D.length/perPage));
          G.radarPage=clamp(G.radarPage,0,pages-1);
          const list=D.slice(G.radarPage*perPage,(G.radarPage+1)*perPage);
          const chapTint=id=>id.startsWith('eoc')?'#e8951f':id.startsWith('itf')?'#4a9ae8':'#c46adf';
          list.forEach((r,i)=>{
            const x=mx+12+(i%4)*(chipW+8),y=bodyY+4+Math.floor(i/4)*(chipH+8);
            const set=CHSETS[r.ch][r.setI];
            creamPanel(x,y,chipW,chipH,'#ffe9b8');
            // chapter color spine (left edge) + 3 gold pips
            cx.fillStyle=chapTint(r.ch);rr(cx,x,y,5,chipH,3);cx.fill();
            for(let t=0;t<3;t++){cx.fillStyle='#ffd700';cx.beginPath();cx.arc(x+chipW-12-t*13,y+chipH/2,4.2,0,TAU);cx.fill();
              cx.lineWidth=1.2;cx.strokeStyle='#8a5a10';cx.stroke()}
            const nm=set.n.length>15?set.n.slice(0,14)+'\u2026':set.n;
            txt(cx,nm,x+13,y+chipH/2,9.5,'#5a3b16','left',2,'#fff',700);
            // VIEW: chip click → treasure screen with that chapter selected
            BTN('rdv'+r.ch+'_'+r.setI,x,y,chipW,chipH,()=>{G.modal=null;G.tChap=r.ch;push('treasure');SFX.click();
              toast('Viewing '+set.n+' in '+chShort(r.ch),'#ffd23f')},{flat:true,nohov:true,modal:true})});
          // pager: PREV · page n/m · NEXT
          if(pages>1){const py2=bodyY+4+Math.ceil(Math.min(list.length,perPage)/4)*(chipH+8)+2;
            BTN('rdpgL',mx+mw/2-190,py2,84,28,()=>{G.radarPage=Math.max(0,G.radarPage-1);SFX.click()},{col:'#e8c37f',outline:'#8a5a10',label:'\u25c2 PREV',fs:11,tcol:'#4a2f10',r:14,disabled:G.radarPage===0,modal:true});
            txt(cx,'page '+(G.radarPage+1)+'/'+pages,mx+mw/2,py2+14,12,'#8a6a3a','center',2,'#fff',700);
            BTN('rdpgR',mx+mw/2+106,py2,84,28,()=>{G.radarPage=Math.min(pages-1,G.radarPage+1);SFX.click()},{col:'#e8c37f',outline:'#8a5a10',label:'NEXT \u25b8',fs:11,tcol:'#4a2f10',r:14,disabled:G.radarPage>=pages-1,modal:true})}
          if(R.doneN>perPage)txt(cx,'showing '+(G.radarPage*perPage+1)+'\u2013'+(G.radarPage*perPage+list.length)+' of '+R.doneN+' complete sets',mx+mw/2,my+mh-30,10,'#a89878','center',2,'#fff',400)}
        txt(cx,'Sets complete: '+R.doneN+'/'+R.totalSets+' · tap a set to view it in TREASURES',mx+mw/2,my+mh-14,11,'#8a6a3a','center',2.5,'#fff',700);
        return}
      /* ---- HOT / CLOSE tabs: farm rows (PICK opens the stage picker) ---- */
      const rows=(G.radarTab==='near'?R.near:R.hot).slice(0,6);
      if(!rows.length){ // this tab is empty — point at the other one
        const alt=G.radarTab==='hot'?'CLOSE':'HOT';
        txt(cx,'No '+(G.radarTab==='hot'?'2/3 (one piece left)':'1/3 (two pieces left)')+' sets right now.',mx+mw/2,bodyY+36,13,'#8a6a3a','center',3,'#fff',700);
        txt(cx,'Try the '+alt+' tab — or FARM SET buttons on the TREASURE screen.',mx+mw/2,bodyY+62,10.5,'#a89878','center',2,'#fff',400)}
      rows.forEach((r,i)=>{
        const rowH=44,y=bodyY+2+i*(rowH+8),isHot=r.own===2;
        const set=CHSETS[r.ch][r.setI];
        creamPanel(mx+10,y,mw-20,rowH,isHot?'#e8c37f':'#c8913a');
        if(isHot){ // hot rows breathe gold (one piece left)
          const pu=0.5+0.5*Math.sin(G.t*4+i);
          cx.save();cx.shadowColor='rgba(255,200,40,'+(0.20+pu*0.25).toFixed(2)+')';cx.shadowBlur=6+pu*6;
          cx.fillStyle='rgba(255,238,180,.6)';rr(cx,mx+10,y,mw-20,rowH,16);cx.fill();cx.restore()}
        // chapter chip (tier-tinted)
        const cn=chShort(r.ch);
        cx.fillStyle=isHot?'#e8951f':'#b06a10';rr(cx,mx+22,y+10,104,24,12);cx.fill();
        cx.lineWidth=1.8;cx.strokeStyle='#8a5a10';rr(cx,mx+22,y+10,104,24,12);cx.stroke();
        txt(cx,cn,mx+74,y+22,10.5,'#fff','center',2,'#7a4a08',700);
        // set name + stat bonus
        txt(cx,set.n,mx+140,y+17,13.5,'#5a3b16','left',3,'#fff',700);
        txt(cx,'bonus: '+TSTATS[set.stat],mx+140,y+33,9.5,'#8a6a3a','left',2,'#fff',400);
        // tier pips (bronze/silver/gold; hot row's empty gold pip pulses)
        const tcols=['#cd7f32','#c0c0c0','#ffd700'];
        for(let t=0;t<3;t++){const got=r.own>t;const px2=mx+336+t*24,py2=y+22;
          const pu=isHot&&t===2&&!got?1+Math.sin(G.t*6)*0.18:1;
          cx.save();cx.translate(px2,py2);cx.scale(pu,pu);
          cx.fillStyle=got?tcols[t]:'rgba(200,190,160,.4)';cx.beginPath();cx.arc(0,0,8,0,TAU);cx.fill();
          cx.lineWidth=1.8;cx.strokeStyle=got?shade(tcols[t],.55):'#c8b892';cx.stroke();
          if(got){cx.fillStyle='rgba(255,255,255,.5)';cx.beginPath();cx.arc(-2.5,-2.5,2.4,0,TAU);cx.fill()}
          cx.restore()}
        // best odds + stage (hot rows show the odds in gold — one piece left)
        txt(cx,Math.round(r.odds*100)+'%',mx+446,y+20,17,isHot?'#b06a10':'#8a6a3a','center',2.5,'#fff',700);
        txt(cx,'stage '+(r.best+1)+' — best odds',mx+446,y+36,8.5,'#8a6a3a','center',2,'#fff',400);
        // PICK: stage picker (all 5 stages w/ odds) — then FARM: quick jump to the best
        BTN('rdpick'+i,mx+mw-208,y+7,50,30,()=>{openStagePicker(r.ch,r.setI)},
          {col:isHot?'#ffdf80':'#e8c37f',outline:'#8a5a10',label:'PICK',fs:9.5,tcol:'#4a2f10',r:15,modal:true});
        BTN('rdfarm'+i,mx+mw-152,y+7,128,30,()=>{G.modal=null;farmJump(r.ch,r.setI)},
          {col:isHot?'#ffd23f':'#e8c37f',outline:'#8a5a10',label:isHot?'FARM!':'FARM',fs:12.5,tcol:'#4a2f10',r:15,modal:true})});
      // digest footer: world completion snapshot
      const fy=my+mh-14;
      const moreN=R.hot.length+R.near.length-rows.length;
      txt(cx,'Sets complete: '+R.doneN+'/'+R.totalSets+' · tiers owned: '+R.tiers+'/'+R.totalSets*3
        +(moreN>0?' · +'+moreN+' more sets in progress':''),mx+mw/2,fy,11,'#8a6a3a','center',2.5,'#fff',700);
      txt(cx,'FARM jumps focus the map on the set\'s best stage · PICK lists every stage with odds',mx+mw/2,fy-16,9.5,'#a89878','center',2,'#fff',400)})}

/* ============================== SCREEN: ENEMY GUIDE ============================== */
function drawGuide(dt){drawTopBar('ENEMY GUIDE — BESTIARY',true);
  parchBody();
  const seen=ENEMIES.filter(e=>SV.bestiary[e.id]);
  txt(cx,'Discovered '+seen.length+' / '+ENEMIES.length+' enemies. Encounter enemies in battle to register them!',20,80,13,'#8a6a3a','left',3,'#fff',400);
  const eList=ENEMIES;const perRow=10;const cw=118,ch=132;
  SCROLL('gd',0,94,1280,572,()=>G.scrollList,v=>G.scrollList=v,Math.max(0,Math.ceil(eList.length/perRow)*(ch+6)-566));
  cx.save();cx.beginPath();cx.rect(0,94,1280,572);cx.clip(); // clip: cards scroll UNDER the top bar/bottom bar
  eList.forEach((e,i)=>{const col=i%perRow,row=Math.floor(i/perRow);const x=24+col*cw,y=104+row*(ch+6)-G.scrollList;
    if(y<80||y>650)return;const known=!!SV.bestiary[e.id];
    panel(x,y,cw-6,ch,known?'#fffdf5':'#e2d4ae',known?'#b08a50':'#cbb384');
    if(known){ART.enemyIcon(e.id,x+(cw-6)/2,y+42,20);
      txt(cx,e.n.length>14?e.n.slice(0,13)+'…':e.n,x+(cw-6)/2,y+86,10,'#5a3b16','center',3,'#fff',700);
      const tc=e.tr.map(t=>TRAIT_COL[t]||'#fff');txt(cx,e.tr.length?e.tr.map(t=>t.toUpperCase()).join('·'):'TRAITLESS',x+(cw-6)/2,y+104,8,shade(tc[0]||'#888',.62),'center',2,'#fff',700);
      if(e.boss)txt(cx,'BOSS',x+(cw-6)/2,y+120,9,'#d0483a','center',2,'#fff',700);
      BTN('gd'+e.id,x,y,cw-6,ch,()=>{G.selEnemy=e.id;SFX.click()},{flat:true,nohov:true})}
    else{ // undiscovered: trait-tinted mystery silhouette + hint labels
      cx.save();cx.globalAlpha=.8;ART.enemySil(e.id,x+(cw-6)/2,y+40,19);cx.restore();
      const tc2=e.tr.map(t=>TRAIT_COL[t]||'#fff');
      txt(cx,e.tr.length?e.tr.map(t=>t.toUpperCase()).join('·'):'TRAITLESS',x+(cw-6)/2,y+88,7.2,shade(tc2[0]||'#8a8272',.55),'center',2,'#fff',700);
      txt(cx,'?',x+(cw-6)/2,y+108,14,'#b8a884','center',2,'#fff',700);
      if(e.boss)txt(cx,'BOSS',x+(cw-6)/2,y+122,8.5,'#d0a08a','center',2,'#fff',700)}});
  cx.restore();
  if(G.selEnemy)drawEnemyDetail();
  brownBottomBar()}
function drawEnemyDetail(){const e=ENEMAP[G.selEnemy];cx.fillStyle='rgba(30,20,10,.66)';cx.fillRect(0,0,1280,720);
  // official bestiary entry: dark charcoal card with thick white border (guide_a.jpg)
  const px=240,py=80,pw=800,ph=560;
  cx.fillStyle='rgba(24,24,28,.97)';rr(cx,px,py,pw,ph,16);cx.fill();
  cx.lineWidth=4;cx.strokeStyle='#fdfdf8';rr(cx,px+2,py+2,pw-4,ph-4,14);cx.stroke();
  cx.lineWidth=1.5;cx.strokeStyle='rgba(255,255,255,.22)';rr(cx,px+9,py+9,pw-18,ph-18,10);cx.stroke();
  // large enemy portrait standing on a shadow base (left half)
  cx.fillStyle='rgba(0,0,0,.45)';cx.beginPath();cx.ellipse(378,478,112,20,0,0,TAU);cx.fill();
  ART.enemyBig(e.id,378,340,3.4);
  // name + trait chips (top-right zone)
  txt(cx,e.n,524,128,24,'#fdfdf8','left',5,'rgba(0,0,0,.6)',700);
  const traits=e.tr.length?e.tr:['traitless'];
  let tx=524;
  traits.forEach(t=>{const tc=TRAIT_COL[t]||'#a89a78';cx.font=FONT(11,700);
    const chw=cx.measureText(t.toUpperCase()).width+22;
    cx.fillStyle=t==='traitless'?'#6a6a78':shade(tc,.85);rr(cx,tx,148,chw,24,12);cx.fill();
    cx.lineWidth=2;cx.strokeStyle='rgba(255,255,255,.75)';rr(cx,tx,148,chw,24,12);cx.stroke();
    txt(cx,t.toUpperCase(),tx+chw/2,160.5,11,'#fff','center',2.5,'rgba(0,0,0,.5)',700);
    tx+=chw+8});
  if(e.boss){cx.fillStyle='#e84030';rr(cx,tx,148,64,24,12);cx.fill();cx.lineWidth=2;cx.strokeStyle='rgba(255,255,255,.75)';rr(cx,tx,148,64,24,12);cx.stroke();
    txt(cx,'BOSS',tx+32,160.5,11,'#fff','center',2.5,'rgba(0,0,0,.5)',700)}
  // stat rows: gold labels, white values, two columns on divider strips
  const mag=G._guideMag||1;
  const rows=[['HP',fmt(e.hp*mag)],['Attack',fmt(e.atk*mag)],['Rate',e.rate+'s'],['Range',e.range],['Speed',e.speed],['KB',e.kb],['Money ¢',e.money],['Type',e.boss?'BOSS':'Normal']];
  rows.forEach((r,i)=>{const x=524+(i%2)*252,y=206+Math.floor(i/2)*40;
    cx.fillStyle='rgba(255,255,255,.08)';rr(cx,x-8,y-14,236,30,8);cx.fill();
    txt(cx,r[0],x,y+0.5,14,'#ffd23f','left',3,'rgba(0,0,0,.55)',700);
    txt(cx,String(r[1]),x+220,y+0.5,14,'#fdfdf8','right',3,'rgba(0,0,0,.55)',700)});
  if(e.abil&&e.abil.length)txt(cx,'ABILITIES: '+e.abil.map(a=>abilStr(a)).join(', '),516,386,12.5,'#bfe0ff','left',3,'rgba(0,0,0,.6)',400);
  if(e.shield)txt(cx,'AKU SHIELD: '+e.shield.hp+' (blocks until broken)',516,410,12.5,'#d8a8ff','left',3,'rgba(0,0,0,.6)',700);
  if(e.revive)txt(cx,'ZOMBIE REVIVE: revives '+e.revive.n+'× at '+e.revive.pct*100+'% HP (burrows back)',516,434,12.5,'#c0e8a8','left',3,'rgba(0,0,0,.6)',700);
  if(e.burrow)txt(cx,'BURROW: retreats underground when killed',516,458,12.5,'#c0e8a8','left',3,'rgba(0,0,0,.6)',700);
  txt(cx,'Magnification slider (simulated):',516,500,13,'#c8b890','left',3,'rgba(0,0,0,.6)',400);
  const magV=G._guideMag||1;cx.fillStyle='rgba(0,0,0,.55)';rr(cx,516,514,380,16,8);cx.fill();
  cx.fillStyle='#ff7a6a';rr(cx,516,514,380*((magV-1)/23),16,8);cx.fill();
  cx.lineWidth=1.5;cx.strokeStyle='rgba(255,255,255,.5)';rr(cx,516,514,380,16,8);cx.stroke();
  txt(cx,'×'+magV.toFixed(1),916,522,13,'#ffd23f','left',3,'rgba(0,0,0,.6)',700);
  cx.fillStyle='rgba(255,255,255,.9)';cx.beginPath();cx.arc(516+380*((magV-1)/23),522,8,0,TAU);cx.fill(); // drag knob
  cx.lineWidth=2;cx.strokeStyle='#8a2a20';cx.stroke();
  // clickable hit zone EXACTLY over the drawn slider (click anywhere on the bar to set the value)
  BTN('maghit',516,508,380,28,()=>{if(G.pdown){const v=1+clamp((G.pdown.x-516)/380,0,1)*23;G._guideMag=Math.max(1,Math.round(v*10)/10);SFX.click()}},{flat:true,nohov:true});
  BTN('gdclose',600,566,160,48,()=>{G.selEnemy=null},{col:'#ffd23f',outline:'#5a3b16',label:'CLOSE',fs:16,tcol:'#4a2f10'})}

/* ============================== SCREEN: CAT BASE ============================== */
function drawBase(dt){drawTopBar('CAT BASE UPGRADES',true);
  parchBody();
  creamPanel(20,64,700,480);
  txt(cx,'Upgrade your Cat Base with XP. Effects apply in every battle!',40,94,14,'#8a6a3a','left',3,'#fff',400);
  Object.entries(BASE_UPG).forEach(([k,v],i)=>{const y=120+i*58;const lv=SV.base[k];const cost=baseUpCost(k);const max=lv>=10;
    panel(36,y,660,50,'#fffdf5',k==='wallet'||k==='worker'?'#e8951f':'#cbb384');
    txt(cx,v.n,56,y+18,15,'#5a3b16','left',3,'#fff',700);txt(cx,v.d,56,y+36,11.5,'#8a7a5a','left');
    for(let p=0;p<10;p++){cx.fillStyle=p<lv?'#5aa84a':'#d8c8a0';rr(cx,300+p*13,y+22,10,10,3);cx.fill()}
    if(!max)BTN('bu'+k,520,y+6,160,38,()=>{if(SV.xp>=cost){SV.xp-=cost;SV.base[k]++;persist();SFX.up();toast(v.n+' → Lv'+SV.base[k])}else{toast('Not enough XP!','#ff7a7a');SFX.error()}},{col:'#7fe8a0',outline:'#3a7a3a',label:fmt(cost)+' XP',fs:13,r:10});
    else txt(cx,'MAX',600,y+26,13,'#5aa84a','center')});
  // cannon panel
  creamPanel(740,64,520,480,'#d8913a');
  txt(cx,'CAT CANNON',760,94,18,'#b06a10','left',3,'#fff',700);
  const sel=CANNON_TYPES.find(t=>t.id===SV.cannonSel)||CANNON_TYPES[0];
  txt(cx,'Equipped: '+sel.n+' — '+sel.d,760,120,12.5,'#6a5a3a','left');
  CANNON_TYPES.forEach((t,i)=>{const y=140+i*52;const unl=cannonUnlocked(t.id);
    panel(756,y,488,44,SV.cannonSel===t.id?'#ffe9b8':'#fffdf5',unl?(SV.cannonSel===t.id?'#e8951f':'#cbb384'):'#dccba0');
    if(unl)BTN('cn'+t.id,756,y,488,44,()=>{SV.cannonSel=t.id;persist();SFX.click()},{flat:true,nohov:true});
    cx.globalAlpha=unl?1:0.5;
    txt(cx,t.n,772,y+16,13.5,unl?'#b06a10':'#a89878','left',3,'#fff',700);
    txt(cx,t.d,772,y+33,10.5,'#8a7a5a','left');
    if(!unl){drawPadlock(cx,1234,y+21,7.5,'#a89878');txt(cx,'Clear '+CHMAP[t.unlock.ch].n,1222,y+22,10.5,'#a89878','right')}
    cx.globalAlpha=1});
  // summary
  creamPanel(20,552,1240,104);
  const sums=[['Battle wallet max',fmt(battleWalletMax())+'¢'],['Worker income',battleRegen().toFixed(1)+'¢/s'],['Cannon charge',cannonChargeBase().toFixed(1)+'s'],['Cat base HP',fmt(Math.round(1200*treasureMult('baseHp')*(1+0.3*(SV.base.bhp-1))))],['Research cd','×'+Math.max(0.55,treasureMult('speed')*Math.pow(0.94,SV.base.research-1)).toFixed(2)],['Cannon power','×'+(1+0.25*(SV.base.cpow-1)).toFixed(2)]];
  sums.forEach((s,i)=>{const x=76+i*200;txt(cx,s[0],x,584,12.5,'#8a7a5a','center');txt(cx,String(s[1]),x,614,16,'#b06a10','center')});
  brownBottomBar()}

/* ---- commander-name entry: hidden DOM input over the canvas (real keyboard) ---- */
let _nameInp=null;
function nameEnsure(){
  if(_nameInp)return _nameInp;
  _nameInp=document.createElement('input');
  _nameInp.type='text';_nameInp.maxLength=18;
  _nameInp.setAttribute('autocomplete','off');_nameInp.setAttribute('spellcheck','false');
  _nameInp.style.cssText='position:fixed;z-index:998;border:2px solid #5a6478;border-radius:8px;margin:0;padding:4px 10px;background:#101218;color:#e8e8f0;font:16px monospace;outline:none;left:-9999px;top:0;width:10px;height:10px;';
  document.body.appendChild(_nameInp);
  _nameInp.addEventListener('input',()=>{G.nameBuf=_nameInp.value.slice(0,18)});
  _nameInp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();nameBlur();
    if(G.modal&&(G.modal.title==='COMMANDER NAME'||G.modal.title==='KEEPER NAME')){const cb=(G.modal.btns.find(b=>b.n==='SAVE')||{}).cb;G.modal=null;cb&&cb()}}});
  return _nameInp}
function nameFocus(dx,dy,dw,dh){
  const inp=nameEnsure();
  const sx=OX+dx*SC,sy=OY+dy*SC,sw=Math.max(60,dw*SC),sh=Math.max(28,dh*SC);
  inp.style.left=sx+'px';inp.style.top=sy+'px';inp.style.width=sw+'px';inp.style.height=sh+'px';
  inp.value=G.nameBuf||'';
  setTimeout(()=>{try{inp.focus();inp.select()}catch(e){}},0)}
function nameBlur(){if(_nameInp){try{_nameInp.blur()}catch(e){}_nameInp.style.left='-9999px';_nameInp.style.width='10px';_nameInp.style.height='10px'}}

/* ============================== SCREEN: SCOUT EXPEDITIONS ============================== */
/* Gamatoto-style idle meta: 3 rotating destination cards (left), live expedition tracker
   (right) with an animated scout cat, progress bar and COLLECT button. */
function expdFmt(ms){const s=Math.max(0,Math.ceil(ms/1000));const m=Math.floor(s/60);
  return m>0?(m+'m '+String(s%60).padStart(2,'0')+'s'):(s+'s')}
function drawExpedition(dt){bgSky();drawTopBar('SCOUT EXPEDITIONS',true);
  const today=expdToday();
  const actList=expdActives();
  const slots=expdSlots();
  const scout=scoutInfo();
  // header ribbon
  creamPanel(20,64,744,60,'#c8913a');
  txt(cx,'Send your scout cat out — collect when the timer rings!',392,94,15,'#8a6a3a','center',3,'#fff',700);
  txt(cx,'Destinations rotate daily · rewards scale with Rank, Accounting & Scout Rank',392,110,10.5,'#a89878','center',2,'#fff',400);
  // ---- left: 3 destination cards ----
  today.forEach((d,i)=>{
    const y=140+i*132,x=20,w=744,h=118;
    const mine=actList.find(a=>a.dest===d.id);
    creamPanel(x,y,w,h,mine?'#d8913a':'#c8913a');
    // terrain swatch with little hills
    const tx=x+14,ty=y+12,tw=88,th=94;
    cx.fillStyle=d.terr;rr(cx,tx,ty,tw,th,10);cx.fill();
    cx.save();rr(cx,tx,ty,tw,th,10);cx.clip();
    cx.fillStyle='rgba(255,255,255,.22)';
    cx.beginPath();cx.arc(tx+18,ty+th-16,20,Math.PI,0);cx.fill();
    cx.beginPath();cx.arc(tx+54,ty+th-10,26,Math.PI,0);cx.fill();
    cx.beginPath();cx.arc(tx+84,ty+th-18,16,Math.PI,0);cx.fill();
    cx.fillStyle='rgba(255,255,255,.35)';cx.beginPath();cx.arc(tx+tw-16,ty+16,10,0,TAU);cx.fill();
    cx.restore();
    cx.lineWidth=2.5;cx.strokeStyle='rgba(90,59,22,.55)';rr(cx,tx,ty,tw,th,10);cx.stroke();
    txt(cx,d.n,x+118,y+26,17,'#5a3b16','left',3.5,'#fff',700);
    txt(cx,d.blurb,x+118,y+48,10.5,'#8a7a5a','left',2,'#fff',400);
    // danger pips (claw marks)
    txt(cx,'DANGER',x+118,y+72,9.5,'#a89878','left',2,'#fff',700);
    for(let k=0;k<5;k++){cx.save();cx.translate(x+172+k*17,y+72);
      cx.strokeStyle=k<d.danger?'#e0533f':'#d8ccb0';cx.lineWidth=2.4;cx.lineCap='round';
      cx.beginPath();cx.moveTo(-3.5,-5);cx.lineTo(-3.5,5);cx.moveTo(0,-6.5);cx.lineTo(0,6.5);cx.moveTo(3.5,-5);cx.lineTo(3.5,5);cx.stroke();cx.restore()}
    // reward preview (scout bonus folded in)
    const rw=[fmt(Math.round(d.xp*scoutBonus()))+' XP',Math.round(d.cf*scoutBonus())+' CF',Math.round(d.tk*100)+'% '+d.tkr[0].toUpperCase()+d.tkr.slice(1)+' Ticket',Math.round(d.fruit*100)+'% Catfruit'];
    txt(cx,rw.slice(0,2).join(' · '),x+118,y+94,11,'#b06a10','left',2,'#fff',700);
    txt(cx,rw.slice(2).join(' · '),x+300,y+94,11,'#2a7a9a','left',2,'#fff',700);
    // duration badge + deploy
    cx.fillStyle='#fff8e8';rr(cx,x+w-186,y+56,74,30,15);cx.fill();
    cx.lineWidth=2;cx.strokeStyle='#a8845a';rr(cx,x+w-186,y+56,74,30,15);cx.stroke();
    txt(cx,d.mins+' min',x+w-149,y+72,13,'#b06a10','center',2.5,'#fff',700);
    const myDone=mine&&now()>=mine.start+mine.dur*1000;
    BTN('exdep'+i,x+w-104,y+56,90,30,()=>{
      if(mine){toast(myDone?'Collect the returned scout on the right!':'That destination is already being scouted!','#ffb060');SFX.error();return}
      if(actList.length>=slots){toast(slots===1?'A scout is already on the road! (Slot 2 unlocks at Rank 30)':'Both scouts are already out!','#ffb060');SFX.error();return}
      if(expdStart(d.id)){SFX.up();toast('Scout cat set out for '+d.n+'!','#7fe8a0')}},{col:mine?(myDone?'#7fe8a0':'#ffd94a'):'#ffd23f',outline:'#8a5a20',label:mine?(myDone?'RETURNED':'EN ROUTE'):'DEPLOY',fs:12,tcol:'#4a2f10'});
    if(mine){ // progress strip along the card bottom
      const frac=clamp((now()-mine.start)/(mine.dur*1000),0,1);
      cx.fillStyle='rgba(90,59,22,.16)';rr(cx,x+14,y+h-12,w-28,7,3.5);cx.fill();
      cx.fillStyle=myDone?'#3abc6a':'#e8a020';rr(cx,x+14,y+h-12,Math.max(14,(w-28)*frac),7,3.5);cx.fill()}});
  // ---- right: SCOUT RANK panel ----
  const rx=784,rw2=476;
  creamPanel(rx,64,rw2,92,'#c8913a');
  { // badge: scout cat face in a circle + rank ribbon
    const bx=rx+46,by=104;
    cx.save();cx.translate(bx,by);cx.rotate(Math.sin(G.t*1.6)*0.05);
    cx.fillStyle='#fff8e8';cx.beginPath();cx.arc(0,0,27,0,TAU);cx.fill();
    cx.lineWidth=3;cx.strokeStyle='#8a5a20';cx.stroke();cx.restore();
    ART.cat({x:bx,y:by+6,s:1.0,id:'cat',t:G.t,e:{anim:'walk'}});
    cx.save();cx.translate(bx,by-27);cx.rotate(-0.08);
    cx.fillStyle='#e85840';rr(cx,-24,-11,48,20,8);cx.fill();
    txt(cx,'LV '+scout.lv,0,0.5,12,'#fff','center',2,'#7a1a10',700);cx.restore()}
  txt(cx,scout.name,rx+84,88,17,'#5a3b16','left',3.5,'#fff',700);
  { // stats line: compact when the PRESTIGE button shares this panel (no run-under)
    const st=scout.maxed
      ?('+'+Math.round(scout.bonus*100)+'% rewards · '+fmt(SV.expedition.runs||0)+' trips')
      :('+'+Math.round(scout.bonus*100)+'% expedition rewards · trips: '+fmt(SV.expedition.runs||0));
    txt(cx,st,rx+84,106,11,'#8a6a3a','left',2,'#fff',700)}
  // scout XP bar (label sits clear above the bar — no descender clipping)
  {const bx=rx+84,bw=rw2-208,by=126;
    txt(cx,scout.maxed?'MAX RANK — prestige for a ★':(scout.cur+'/'+scout.need+' Scout XP — next: '+SCOUT_NAMES[scout.lv]),bx,118,9.5,'#5a3b16','left',2,'#fff',700);
    cx.fillStyle='rgba(90,59,22,.16)';rr(cx,bx,by,bw,10,5);cx.fill();
    const fr=scout.maxed?1:clamp(scout.cur/scout.need,0,1);
    const g=cx.createLinearGradient(bx,0,bx+bw,0);g.addColorStop(0,'#7fd0ff');g.addColorStop(1,'#4a9ae8');
    cx.fillStyle=g;rr(cx,bx,by,Math.max(10,bw*fr),10,5);cx.fill();
    cx.lineWidth=1.5;cx.strokeStyle='#8a5a20';rr(cx,bx,by,bw,10,5);cx.stroke()}
  // prestige button: whenever MYTHIC (confirm modal — resets scout XP) — ★∞, uncapped
  if(scout.maxed){const pu=0.6+0.4*(1+Math.sin(G.t*4))/2;
    cx.save();cx.shadowColor='rgba(196,106,223,'+(0.25+pu*0.35).toFixed(2)+')';cx.shadowBlur=8+pu*8;
    BTN('sprest',rx+rw2-192,78,88,46,()=>{
      openModal('SCOUT PRESTIGE',[
        'Reset scout XP to zero and claim a permanent ★.',
        'Each star adds +10% expedition rewards — forever. No cap!',
        'Current: +'+Math.round(scout.bonus*100)+'% → after: +'+Math.round((scout.bonus+0.10)*100)+'%'],[
        {n:'PRESTIGE!',col:'#c46adf',cb:()=>{if(scoutPrestige()){toast('SCOUT PRESTIGE! ★'+SV.expedition.prestige+' — bonus now +'+Math.round(scoutInfo().bonus*100)+'%','#c46adf')}}},
        {n:'LATER',cb:()=>{}}])},
      {col:'#c46adf',outline:'#6a1a8a',label:'PRESTIGE',fs:11,tcol:'#fff'});
    cx.restore()}
  else if(scout.prest>0){ // star count lives in the rank-name line — one compact note only
    txt(cx,scout.prest+'★ · +'+Math.round(scout.prest*10)+'% forever · no cap',rx+rw2-136,110,9,'#a86ac4','right',2,'#fff',400)}
  // slot pips (right side)
  for(let s=0;s<2;s++){const sx=rx+rw2-64,sy=88+s*26;const unlocked=s<slots;const inUse=!!actList[s];
    cx.fillStyle=inUse?'#3abc6a':(unlocked?'#ffd94a':'#d8ccb0');cx.beginPath();cx.arc(sx,sy,9,0,TAU);cx.fill();
    cx.lineWidth=2;cx.strokeStyle=unlocked?'#8a5a20':'#c8b892';cx.stroke();
    if(!unlocked){drawPadlock(cx,sx,sy,6,'#8a7a5a')}
    txt(cx,'SLOT '+(s+1),sx-14,sy+0.5,9,unlocked?'#5a3b16':'#a89878','right',2,'#fff',700)}
  txt(cx,'Slot 2: Rank 30 (now '+SV.rank+')',rx+rw2-12,145,9.5,slots>=2?'#1e7a3a':'#a89878','right',2,'#fff',700);
  // ---- right: tracker cards (one per slot) ----
  for(let s=0;s<2;s++){
    const y=162+s*196,x2=rx,w2=rw2,h=188;
    const a=actList[s];
    if(a){ // ---- active trip tracker ----
      const d=EXPD.find(d2=>d2.id===a.dest)||{n:'?',terr:'#a8a8a8'};
      const done=now()>=a.start+a.dur*1000;
      creamPanel(x2,y,w2,h,done?'#3a9a5a':'#c8913a');
      txt(cx,'SLOT '+(s+1)+' · '+d.n,x2+w2/2,y+24,16,done?'#eafff0':'#5a3b16','center',4,'#fff',700);
      // winding path scene (compact)
      const px=x2+20,py=y+38,pw=w2-40,ph=96;
      cx.fillStyle='#e8f4dc';rr(cx,px,py,pw,ph,10);cx.fill();
      cx.lineWidth=2;cx.strokeStyle='#b8d8a0';rr(cx,px,py,pw,ph,10);cx.stroke();
      cx.save();rr(cx,px,py,pw,ph,10);cx.clip();
      const road=cx.createLinearGradient(0,py,0,py+ph);road.addColorStop(0,'#d8c8a0');road.addColorStop(1,'#c8b480');
      cx.strokeStyle=road;cx.lineWidth=20;cx.lineCap='round';
      cx.beginPath();cx.moveTo(px+26,py+ph-18);cx.bezierCurveTo(px+pw*0.3,py+ph+30,px+pw*0.4,py-30,px+pw-26,py+18);cx.stroke();
      cx.strokeStyle='rgba(176,138,80,.5)';cx.lineWidth=1.6;cx.setLineDash([8,10]);
      cx.beginPath();cx.moveTo(px+26,py+ph-18);cx.bezierCurveTo(px+pw*0.3,py+ph+30,px+pw*0.4,py-30,px+pw-26,py+18);cx.stroke();cx.setLineDash([]);
      const gx=px+pw-26,gy=py+18;
      cx.fillStyle='#5a3b16';rr(cx,gx-2,gy-24,4,28,2);cx.fill();
      cx.fillStyle='#e0533f';cx.beginPath();cx.moveTo(gx+2,gy-24);cx.lineTo(gx+22,gy-19);cx.lineTo(gx+2,gy-13);cx.closePath();cx.fill();
      const frac=clamp((now()-a.start)/(a.dur*1000),0,1);
      const bez=t=>{const u=1-t;
        const x0=px+26,y0=py+ph-18,x1=px+pw*0.3,y1=py+ph+30,x2b=px+pw*0.4,y2b=py-30,x3=px+pw-26,y3=py+18;
        return{x:u*u*u*x0+3*u*u*t*x1+3*u*t*t*x2b+t*t*t*x3,y:u*u*u*y0+3*u*u*t*y1+3*u*t*t*y2b+t*t*t*y3}};
      const pos=bez(frac);
      ART.cat({x:pos.x,y:pos.y+(done?Math.sin(G.t*6)*3:0),s:0.8,id:'cat',t:G.t,e:{anim:'walk'}});
      cx.fillStyle='rgba(90,59,22,.22)';
      for(let k=1;k<=3;k++){const pp=bez(Math.max(0,frac-k*0.08));if(pp){cx.beginPath();cx.arc(pp.x,pp.y+7,2.6,0,TAU);cx.fill()}}
      cx.restore();
      // progress bar + countdown + action button
      const pby=y+144;
      cx.fillStyle='rgba(90,59,22,.14)';rr(cx,px,pby,w2-40,12,6);cx.fill();
      cx.fillStyle=done?'#3abc6a':'#e8a020';rr(cx,px,pby,Math.max(16,(w2-40)*frac),12,6);cx.fill();
      cx.lineWidth=1.5;cx.strokeStyle='#8a5a20';rr(cx,px,pby,w2-40,12,6);cx.stroke();
      txt(cx,done?'Returned with the goods!':expdFmt(a.start+a.dur*1000-now())+' left',px+4,y+174,12,done?'#1e5a2a':'#8a6a3a','left',2.5,'#fff',700);
      txt(cx,'+'+(d.danger||1)*12+' scout XP',px+w2-44,y+174,11,'#8a6a3a','right',2.5,'#fff',700);
      if(done){ // collect button (pulsing glow; BTN at ABSOLUTE coords — hit rects must not inherit transforms)
        const pulse=0.6+0.4*(1+Math.sin(G.t*5))/2;
        cx.save();
        cx.shadowColor='rgba(58,188,106,'+(0.4+pulse*0.5).toFixed(3)+')';cx.shadowBlur=10+pulse*14;
        BTN('excollect'+s,x2+w2-174,y+130,156,40,()=>{
          const lines=expdCollect(s);
          if(lines){SFX.win();openModal('EXPEDITION RESULTS',lines,[{n:'NICE!',col:'#ffd23f',cb:()=>{}}],(x,y3,w3,h3)=>{
            cx.fillStyle='rgba(58,188,106,.12)';rr(cx,x+20,y3+h3-52,w3-40,34,10);cx.fill();
            txt(cx,'Scout rests for a moment — new trips can start right away.',x+w3/2,y3+h3-35,11.5,'#8a6a3a','center',2.5,'#fff',400)})}},{col:'#7fe8a0',outline:'#2a6a3a',label:'COLLECT!',fs:14,tcol:'#fff'});
        cx.restore()}
      else BTN('exwait'+s,x2+w2-174,y+130,156,40,()=>{toast('Still on the road — '+expdFmt(a.start+a.dur*1000-now())+' to go!','#ffb060');SFX.click()},{col:'#e8d8b0',outline:'#8a7a5a',label:'IN PROGRESS…',fs:12,tcol:'#8a6a3a'})}
    else{ // ---- free / locked slot ----
      const unlocked=s<slots;
      if(unlocked){
        cx.save();cx.setLineDash([10,8]);cx.lineWidth=2.5;cx.strokeStyle='rgba(138,106,58,.55)';
        rr(cx,x2,y,w2,h,14);cx.stroke();cx.restore();
        txt(cx,'SLOT '+(s+1)+' — FREE',x2+w2/2,y+34,15,'#a8845a','center',3,'#fff',700);
        ART.cat({x:x2+w2/2-90,y:y+96+Math.sin(G.t*1.5)*3,s:0.9,id:'cat',t:G.t,e:{anim:'idle'}});
        // floating Z z z above the napping scout (idle anim — matches the flavor text)
        for(let z=0;z<3;z++){const zx=x2+w2/2-64+z*16,zy=y+52-z*16-Math.sin(G.t*1.6+z*0.9)*5;
          cx.fillStyle='rgba(90,120,180,'+(0.75-z*0.18).toFixed(2)+')';
          cx.font=FONT(9+z*2.5,700);cx.textAlign='center';cx.textBaseline='middle';
          cx.fillText('z',zx,zy)}
        txt(cx,'Your scout is napping by the base.',x2+w2/2+24,y+96,13,'#8a7a5a','center',2.5,'#fff',400);
        txt(cx,'Pick a destination on the left to deploy!',x2+w2/2+24,y+120,12.5,'#5a3b16','center',2.5,'#fff',700);
        txt(cx,'Runs in real time — leave and come back later!',x2+w2/2+24,y+150,10.5,'#a89878','center',2,'#fff',400)}
      else{
        cx.save();cx.setLineDash([10,8]);cx.lineWidth=2.5;cx.strokeStyle='rgba(168,152,120,.5)';
        rr(cx,x2,y,w2,h,14);cx.stroke();cx.restore();
        drawPadlock(cx,x2+w2/2-140,y+96,11,'#a89878');
        txt(cx,'SLOT 2 — LOCKED',x2+w2/2,y+34,15,'#a89878','center',3,'#fff',700);
        txt(cx,'Unlocks at User Rank 30 (you are Rank '+SV.rank+')',x2+w2/2,y+96,13.5,'#8a6a3a','center',2.5,'#fff',700);
        const prog=clamp(SV.rank/30,0,1);
        cx.fillStyle='rgba(90,59,22,.14)';rr(cx,x2+90,y+118,w2-180,10,5);cx.fill();
        cx.fillStyle='#c8a860';rr(cx,x2+90,y+118,Math.max(10,(w2-180)*prog),10,5);cx.fill();
        txt(cx,'Rank progress '+Math.round(prog*100)+'%',x2+w2/2,y+150,10.5,'#a89878','center',2,'#fff',400)}}}
  brownBottomBar()}

/* ============================== SCREEN: WORLD DOJO RANKING ============================== */
/* Global endless-Dojo scores via the Next.js /api/leaderboard (Prisma SQLite).
   Canvas rendering only — fetch happens on entry + REFRESH, own row highlighted. */
function lbFetch(){
  if(G.lbFetching)return;G.lbFetching=true;
  fetch('/api/leaderboard?limit=20').then(r=>r.json()).catch(()=>({ok:false}))
    .then(j=>{G.lbData={ts:now(),entries:j&&j.ok?j.entries:null};G.lbFetching=false})
    .catch(()=>{G.lbData={ts:now(),entries:null};G.lbFetching=false})}
function lbEnter(){if(!G.lbData||now()-G.lbData.ts>15000)lbFetch()}
function drawLeaderboard(dt){lbEnter();
  const g=cx.createLinearGradient(0,54,0,720);g.addColorStop(0,'#233152');g.addColorStop(1,'#141a2c');
  cx.fillStyle=g;cx.fillRect(0,54,1280,666);
  // faint starfield
  cx.fillStyle='rgba(255,255,255,.10)';
  for(let i=0;i<40;i++){const sx2=(i*337)%1280,sy2=90+((i*173)%560);cx.beginPath();cx.arc(sx2,sy2,(i%3===0)?1.8:1,0,TAU);cx.fill()}
  drawTopBar('WORLD DOJO RANKING',true);
  const D=G.lbData;
  const own=SV.dojoBest||0;
  // ---- own best panel (left) ----
  cx.fillStyle='rgba(255,248,232,.06)';rr(cx,24,74,300,150,14);cx.fill();
  cx.lineWidth=2;cx.strokeStyle='rgba(255,210,63,.5)';rr(cx,25,75,298,148,13);cx.stroke();
  txt(cx,'YOUR BEST GRADE',174,102,13,'#e8c890','center',3,'#141a2c',700);
  txt(cx,String(own),174,146,46,'#ffd23f','center',6,'#3a2810',700);
  txt(cx,'Endless waves survived',174,178,11,'#c9b28a','center',2,'#141a2c',400);
  txt(cx,'Commander: '+(SV.cmdName||'CAT COMMANDER'),174,200,12,'#9fd8ff','center',2.5,'#141a2c',700);
  // ---- top-3 podium (restacked QA fix: old '#N' baseline -h/2+44 collided with the name
  //   baseline at y=6 on the 68px cards and crossed it; score 28 vs stage h/2-10 also crossed.
  //   New layout: big rank number flanked by medal glyphs, then name/score/stage each clear) ----
  const es=(D&&D.entries)||[];
  const podium=[[{x:640,w:120,h:90,c:'#ffd700',r:1},{x:488,w:110,h:68,c:'#c0c0c0',r:2},{x:792,w:110,h:68,c:'#cd7f32',r:3}]][0];
  if(es.length>=1){
    podium.forEach(pd=>{
      const e=es[pd.r-1];if(!e)return;
      const big=pd.r===1;
      cx.save();cx.translate(pd.x,340-pd.h/2);
      cx.shadowColor='rgba(0,0,0,.4)';cx.shadowBlur=10;
      const pg=cx.createLinearGradient(0,-pd.h/2,0,pd.h/2);pg.addColorStop(0,shade(pd.c,.35));pg.addColorStop(1,shade(pd.c,-.25));
      cx.fillStyle=pg;rr(cx,-pd.w/2,-pd.h/2,pd.w,pd.h,8);cx.fill();cx.shadowColor='transparent';
      cx.lineWidth=2.5;cx.strokeStyle=shade(pd.c,-.5);rr(cx,-pd.w/2+1.5,-pd.h/2+1.5,pd.w-3,pd.h-3,7);cx.stroke();
      // rank: big number + flanking medals (baselines: #1 → 5 / 25 / 38 · #2,3 → 2 / 16 / 28)
      const ry=-pd.h/2+26,mfx=big?30:21;
      glyph(cx,'medal',-mfx,ry-3,big?10:8,pd.c,shade(pd.c,-.3));
      glyph(cx,'medal', mfx,ry-3,big?10:8,pd.c,shade(pd.c,-.3));
      txt(cx,'#'+pd.r,0,ry+(big?7:5),big?20:15,shade(pd.c,-.55),'center',2.5,'#fff',700);
      txt(cx,e.name.slice(0,12),0,big?5:2,big?11.5:10,'#fff','center',2.5,shade(pd.c,-.6),700);
      txt(cx,String(e.score),0,big?25:16,big?17:13.5,'#fff','center',3,shade(pd.c,-.6),700);
      txt(cx,e.stage,0,pd.h/2-(big?7:6),big?8.5:7.5,'rgba(255,255,255,.85)','center',2,shade(pd.c,-.6),400);
      cx.restore()})
    // left void decor: dojo trainee cat on a lit pedestal (fills the gap beside the podium)
    cx.fillStyle='rgba(0,0,0,.35)';cx.beginPath();cx.ellipse(378,344,30,9,0,0,TAU);cx.fill();
    cx.fillStyle='rgba(255,248,232,.10)';rr(cx,352,318,52,26,7);cx.fill();
    cx.lineWidth=1.5;cx.strokeStyle='rgba(255,210,63,.4)';rr(cx,352,318,52,26,7);cx.stroke();
    ART.catIcon('cat',378,312,26,0.92);
    txt(cx,'TRAINING FOR NO.4',378,368,8.5,'#8a92a8','center',2,'#141a2c',700)}
  // ---- rows 4..20 ----
  const rowX=340,rowY=386,rowW=916,rowH=29;
  txt(cx,'ALL COMMANDERS — TOP 20',rowX,372,12.5,'#e8c890','left',3,'#141a2c',700);
  if(G.lbFetching&&(!D||!D.entries))txt(cx,'Fetching world scores…',rowX+rowW/2,460,16,'#c9b28a','center');
  else if(D&&!D.entries)txt(cx,'Offline — could not reach the ranking server.',rowX+rowW/2,460,15,'#ff9a6a','center',3,'#141a2c',700);
  else if(es.length===0)txt(cx,'No scores yet — be the first! Enter Endless grading in the Dojo!',rowX+rowW/2,460,14,'#c9b28a','center');
  else es.slice(3).forEach((e,i)=>{
    const y=rowY+6+i*rowH;
    const isOwn=e.name===(SV.cmdName||'CAT COMMANDER');
    if(isOwn){cx.fillStyle='rgba(127,208,255,.14)';rr(cx,rowX,y-11,rowW,26,7);cx.fill();
      cx.lineWidth=1.5;cx.strokeStyle='rgba(127,208,255,.5)';rr(cx,rowX,y-11,rowW,26,7);cx.stroke()}
    else{cx.fillStyle=i%2?'rgba(255,255,255,.035)':'rgba(255,255,255,.06)';rr(cx,rowX,y-11,rowW,26,7);cx.fill()}
    txt(cx,String(i+4),rowX+24,y,12.5,i<3?'#ffd23f':'#c9b28a','center',2.5,'#141a2c',700);
    txt(cx,e.name.slice(0,18),rowX+56,y,13,isOwn?'#9fd8ff':'#fff','left',2.5,'#141a2c',700);
    txt(cx,String(e.score),rowX+rowW-140,y,13.5,'#ffd23f','right',3,'#141a2c',700);
    txt(cx,e.stage,rowX+rowW-16,y,10.5,'#8a92a8','right',2,'#141a2c',400);
    if(isOwn)txt(cx,'YOU',rowX+rowW-260,y,10.5,'#9fd8ff','right',2,'#141a2c',700)});
  // ---- WORLD DOJO FEED panel (fills the right void; hosts the refresh button) ----
  {const fx2=866,fy2=232,fw2=372,fh2=106;
    cx.fillStyle='rgba(255,248,232,.06)';rr(cx,fx2,fy2,fw2,fh2,14);cx.fill();
    cx.lineWidth=2;cx.strokeStyle='rgba(127,208,255,.45)';rr(cx,fx2+1,fy2+1,fw2-2,fh2-2,13);cx.stroke();
    txt(cx,'WORLD DOJO FEED',fx2+20,fy2+24,12.5,'#9fd8ff','left',3,'#141a2c',700);
    {const pu=0.5+0.5*Math.sin(G.t*3); // LIVE chip: pulsing green dot + label
      cx.fillStyle='rgba(58,188,106,'+(0.75+pu*0.25).toFixed(2)+')';cx.beginPath();cx.arc(fx2+fw2-84,fy2+20,5,0,TAU);cx.fill();
      txt(cx,'LIVE',fx2+fw2-44,fy2+22,10.5,'#3abc6a','center',2,'#141a2c',700)}
    txt(cx,'Endless survival — waves cleared per run',fx2+20,fy2+44,10.5,'#8a92a8','left',2,'#141a2c',400);
    BTN('lbrefresh',fx2+14,fy2+58,168,36,()=>{G.lbData=null;lbFetch();SFX.click()},{col:'#ffd23f',outline:'#8a5a20',label:D&&D.entries?('⟳ '+(Math.round((now()-D.ts)/1000))+'s ago').slice(0,12):'⟳ RETRY',fs:11.5});
    txt(cx,D&&D.entries?'world scores synced':'offline — retry above',fx2+fw2-14,fy2+66,10,'#8a92a8','right',2,'#141a2c',400)}
  txt(cx,'Scores post automatically when an Endless Dojo run ends. Set your commander name in SETTINGS!',640,690,11.5,'#c9b28a','center',2.5,'#141a2c',400)}

/* ============================== SCREEN: TROPHY STAND ============================== */
/* Achievement showcase: 10 themed group panels (2-column, scrollable). Progress is
   computed live from save state; CLAIM grants CF/XP/tickets. Badge on the home menu. */
function drawTrophies(dt){bgSky();drawTopBar('TROPHY STAND',true);
  const all=trophyList();
  const claimedN=all.filter(t=>SV.trophies.claimed[t.id]).length;
  const claimableN=all.filter(trophyClaimable).length;
  let cfEarned=0,xpEarned=0;all.forEach(t=>{if(SV.trophies.claimed[t.id]){cfEarned+=t.rw.cf||0;xpEarned+=t.rw.xp||0}});
  // ---- summary header: giant cup + counts ----
  creamPanel(20,64,1240,84,'#c8913a');
  cx.save();cx.translate(76,106);cx.rotate(Math.sin(G.t*1.8)*0.04);
  cx.fillStyle='#ffd23f';cx.beginPath();cx.moveTo(-24,-30);cx.lineTo(24,-30);cx.lineTo(18,6);cx.quadraticCurveTo(12,20,0,22);cx.quadraticCurveTo(-12,20,-18,6);cx.closePath();cx.fill();
  cx.strokeStyle='#8a5a20';cx.lineWidth=3;cx.stroke();
  cx.beginPath();cx.moveTo(-24,-26);cx.quadraticCurveTo(-38,-12,-14,-2);cx.stroke();
  cx.beginPath();cx.moveTo(24,-26);cx.quadraticCurveTo(38,-12,14,-2);cx.stroke();
  cx.fillStyle='#8a5a20';rr(cx,-7,22,14,10,3);cx.fill();rr(cx,-16,32,32,7,3);cx.fill();
  cx.fillStyle='rgba(255,255,255,.5)';rr(cx,-15,-27,12,9,4);cx.fill();cx.restore();
  txt(cx,claimedN+' / '+all.length+' trophies claimed',124,96,20,'#5a3b16','left',4,'#fff',700);
  txt(cx,'Rewards earned: '+fmt(cfEarned)+' Cat Food'+(xpEarned?' · '+fmt(xpEarned)+' XP':''),124,124,12.5,'#8a6a3a','left',2.5,'#fff',700);
  if(claimableN>0){const pulse=1+Math.sin(G.t*5)*0.05;
    cx.save();cx.translate(1160,106);cx.scale(pulse,pulse);
    cx.fillStyle='#e84030';cx.beginPath();cx.arc(0,0,20,0,TAU);cx.fill();cx.lineWidth=2.5;cx.strokeStyle='#8a1a10';cx.stroke();
    txt(cx,String(claimableN),0,1,16,'#fff','center',2.5,'#8a1a10',700);
    txt(cx,'READY TO CLAIM!',0,38,10.5,'#e84030','center',2.5,'#fff',700);cx.restore()}
  else txt(cx,'All claimed — keep playing to unlock more!',1160,106,12,'#5a3b16','right',2.5,'#fff',700);
  // ---- scrollable 2-column group grid (starts BELOW the summary header — QA fix: grid used
  //   to start at y=96 which buried the header's lower half: text, cup base, rewards line, badge) ----
  const colW=606,gap=16,colX=[20,20+colW+gap];
  let colH=[0,0];
  const placed=TROPHY_GROUPS.map(g=>{
    const cI=colH[0]<=colH[1]?0:1;
    const y=156+colH[cI];
    const h=44+g.list.length*46+10;
    colH[cI]+=h+gap;
    return{g,cI,x:colX[cI],y,h}});
  const contentH=Math.max(colH[0],colH[1]);
  SCROLL('tsc',0,156,1280,514,()=>G.scrollTrophy||0,v=>G.scrollTrophy=clamp(v,0,Math.max(0,contentH-514)),Math.max(0,contentH-514));
  const off=G.scrollTrophy||0;
  cx.save();cx.beginPath();cx.rect(0,156,1280,514);cx.clip(); // clip: panels scroll UNDER the header/footer
  placed.forEach(({g,cI,x,y,h})=>{
    const sy=y-off;
    if(sy+h<140||sy>660)return; // cull off-screen panels
    creamPanel(x,sy,colW,h);
    // group header band
    cx.fillStyle=shade(g.col,.92);rr(cx,x+3,sy+3,colW-6,38,12);cx.fill();
    cx.lineWidth=2;cx.strokeStyle=shade(g.col,.55);rr(cx,x+3,sy+3,colW-6,38,12);cx.stroke();
    glyph(cx,g.icon,x+30,sy+22,13,'#fff',shade(g.col,.6));
    txt(cx,g.n,x+52,sy+23,15.5,'#fff','left',3,'rgba(20,16,4,.8)',700);
    const gDone=g.list.filter(t=>SV.trophies.claimed[t.id]).length;
    txt(cx,gDone+'/'+g.list.length,x+colW-16,sy+23,12.5,'#fff','right',2.5,'rgba(20,16,4,.8)',700);
    // trophy rows
    g.list.forEach((t,i)=>{
      const ry=sy+50+i*46;
      const prog=Math.min(trophyProg(t),t.goal);
      const done=trophyDone(t),cl=!!SV.trophies.claimed[t.id],can=done&&!cl;
      // row plate
      cx.fillStyle=can?'rgba(232,64,48,.08)':'rgba(90,59,22,.05)';
      rr(cx,x+10,ry,colW-20,42,9);cx.fill();
      // status medallion
      const mx=x+28,my=ry+21;
      if(cl){cx.fillStyle='#3a9a5a';cx.beginPath();cx.arc(mx,my,11,0,TAU);cx.fill();
        cx.lineWidth=2;cx.strokeStyle='#1e5a2a';cx.stroke();
        cx.strokeStyle='#fff';cx.lineWidth=2.6;cx.beginPath();cx.moveTo(mx-4.5,my+0.5);cx.lineTo(mx-1.5,my+3.5);cx.lineTo(mx+5,my-3.5);cx.stroke()}
      else if(done){const pu=1+Math.sin(G.t*5)*0.08;
        cx.save();cx.translate(mx,my);cx.scale(pu,pu);
        cx.fillStyle='#ffd23f';star(cx,0,0,11,4.6);cx.fill();
        cx.lineWidth=1.8;cx.strokeStyle='#8a5a20';cx.stroke();cx.restore()}
      else{cx.fillStyle='#e2d4ae';cx.beginPath();cx.arc(mx,my,11,0,TAU);cx.fill();
        cx.lineWidth=2;cx.strokeStyle='#c8b892';cx.stroke();
        drawPadlock(cx,mx,my+1,6.5,'#a89878')}
      // name + progress bar
      txt(cx,t.n,x+46,ry+11,12,cl?'#8a7a5a':'#5a3b16','left',2.5,'#fff',cl?400:700);
      const bw=colW-322; // progress text needs ~70px clear before the reward chip (was 260 → text ran under the chip)
      cx.fillStyle='rgba(90,59,22,.14)';rr(cx,x+46,ry+20,bw,7,3.5);cx.fill();
      const fr=clamp(prog/t.goal,0,1);
      const pcol=done?(cl?'#7fc86a':'#ffd23f'):'#4a9ae8';
      cx.fillStyle=pcol;rr(cx,x+46,ry+20,Math.max(8,bw*fr),7,3.5);cx.fill();
      cx.lineWidth=1;cx.strokeStyle='rgba(90,59,22,.35)';rr(cx,x+46,ry+20,bw,7,3.5);cx.stroke();
      txt(cx,fmt(Math.min(prog,t.goal))+' / '+fmt(t.goal),x+46+bw+8,ry+24.5,10.5,done?'#1e7a3a':'#8a6a3a','left',2,'#fff',700);
      // reward chip
      const rwTxt=RW_TXT(t.rw);
      cx.fillStyle=cl?'rgba(58,154,90,.10)':'rgba(255,244,214,.75)';
      rr(cx,x+colW-190,ry+6,104,30,8);cx.fill();
      cx.lineWidth=1.2;cx.strokeStyle=cl?'rgba(58,154,90,.5)':'rgba(176,138,80,.5)';
      rr(cx,x+colW-190,ry+6,104,30,8);cx.stroke();
      txt(cx,rwTxt,x+colW-138,ry+22,9,cl?'#3a9a5a':'#b06a10','center',2,'#fff',700);
      // claim button / claimed tag
      if(can){const pu=0.6+0.4*(1+Math.sin(G.t*5))/2;
        cx.save();cx.shadowColor='rgba(232,64,48,'+(0.3+pu*0.4).toFixed(3)+')';cx.shadowBlur=8+pu*8;
        BTN('tcl'+t.id,x+colW-78,ry+6,66,30,()=>{
          const res=claimTrophy(t.id);
          if(res)toast('TROPHY CLAIMED! '+t.n+' — +'+RW_TXT(t.rw),'#7fe8a0')},
          {col:'#e84030',outline:'#8a1a10',label:'CLAIM',fs:12,tcol:'#fff'});
        cx.restore()}
      else if(cl)txt(cx,'DONE',x+colW-45,ry+22,10.5,'#3a9a5a','center',2,'#fff',700);
      else BTN('tinfo'+t.id,x+colW-78,ry+6,66,30,()=>{toast(t.n+' — '+fmt(Math.min(prog,t.goal))+'/'+fmt(t.goal)+' · reward '+RW_TXT(t.rw),'#ffb060');SFX.click()},{col:'#e8d8b0',outline:'#8a7a5a',label:Math.round(fr*100)+'%',fs:11,tcol:'#8a6a3a'})})});
  cx.restore();
  txt(cx,'Trophies track your whole adventure — crowns, summons, scouting, treasures and more!',640,700,11.5,'#8a6a3a','center',2.5,'#fff',400)}


/* ============================== SCREEN: CAT SHRINE ============================== */
/* Daily blessing meta: one free coin toss per day (+3 paid at 50 CF). A coin arcs into the
   offering box, then the blessing reveals in a modal. Scene is fully drawn (torii, lanterns,
   smoke particles) — no emoji, data-driven from SHRINE_BLESSINGS. */
function shrineBlessLine(res){const b=SHRINE_BLESSINGS.find(x=>x.id===res.id)||SHRINE_BLESSINGS[0];
  return b.line(res)}
function drawShrine(dt){bgSky();drawTopBar('CAT SHRINE',true);
  const si=shrineInfo();
  const anim=G.shrineAnim;
  /* ---- LEFT: the shrine scene (evening sky, torii, hut, offering box, lanterns, smoke) ---- */
  const sx=20,sw=744,sy=64,sh=596;
  creamPanel(sx,sy,sw,sh,'#c8913a');
  { // scene viewport: dusk gradient inside a rounded frame
    const vx=sx+10,vy=sy+10,vw=sw-20,vh=sh-20;
    const sky2=cx.createLinearGradient(0,vy,0,vy+vh);
    sky2.addColorStop(0,'#3a2450');sky2.addColorStop(0.55,'#7a4a7a');sky2.addColorStop(1,'#c88a5a');
    cx.fillStyle=sky2;rr(cx,vx,vy,vw,vh,14);cx.fill();
    cx.save();rr(cx,vx,vy,vw,vh,14);cx.clip();
    // moon + stars (moon kept clear of the right lantern — VLM QA fix)
    cx.fillStyle='#fff8e8';cx.beginPath();cx.arc(vx+vw-64,vy+56,24,0,TAU);cx.fill();
    cx.fillStyle='rgba(200,138,90,.9)';cx.beginPath();cx.arc(vx+vw-52,vy+48,20,0,TAU);cx.fill();
    for(let i=0;i<14;i++){const stx=vx+40+((i*163)% (vw-80)),sty=vy+16+((i*97)%150);
      const tw=0.4+0.6*Math.abs(Math.sin(G.t*1.4+i*1.7));
      cx.fillStyle='rgba(255,255,255,'+(tw*0.8).toFixed(2)+')';cx.beginPath();cx.arc(stx,sty,1.6,0,TAU);cx.fill()}
    // stone ground + steps
    const gy=vy+vh-120;
    cx.fillStyle='#8a8494';cx.fillRect(vx,gy,vw,vh-gy);
    cx.fillStyle='rgba(255,255,255,.10)';cx.fillRect(vx,gy,vw,7);
    for(let s2=0;s2<3;s2++){cx.fillStyle=s2%2?'#7a7484':'#847e8e';
      cx.fillRect(vx+vw/2-170-s2*26,gy+22+s2*26,340+s2*52,24)}
    // ---- torii gate (big, centered) ----
    const txc=vx+vw/2,tyy=gy-238;
    cx.fillStyle='#d8483a';
    cx.fillRect(txc-96,tyy+14,20,238);            // left pillar
    cx.fillRect(txc+76,tyy+14,20,238);            // right pillar
    cx.fillStyle='#b8382c';cx.fillRect(txc-96,tyy+96,20,10);cx.fillRect(txc+76,tyy+96,20,10); // base collars
    cx.fillStyle='#c84034';rr(cx,txc-118,tyy,236,18,7);cx.fill();      // nuki (lower lintel)
    cx.save();cx.translate(txc,tyy-14);           // kasagi (curved top lintel) + black cap
    cx.fillStyle='#1e1a24';cx.beginPath();cx.moveTo(-132,10);cx.quadraticCurveTo(0,-12,132,10);cx.lineTo(132,16);cx.quadraticCurveTo(0,-6,-132,16);cx.closePath();cx.fill();
    cx.fillStyle='#d8483a';cx.beginPath();cx.moveTo(-124,4);cx.quadraticCurveTo(0,-16,124,4);cx.lineTo(124,12);cx.quadraticCurveTo(0,-8,-124,12);cx.closePath();cx.fill();
    cx.fillStyle='#ffd23f';cx.fillRect(-16,8,32,16); // name plaque
    cx.fillStyle='#8a2018';cx.fillRect(-12,11,24,10);
    cx.restore();
    // ---- shrine hut behind the gate (dark wood, gold trim) ----
    {const hx=txc,hyy=gy-252,hw=300,hh=132;
      cx.fillStyle='#4a3426';rr(cx,hx-hw/2,hyy+42,hw,hh-42,8);cx.fill();
      cx.fillStyle='#2e2018';rr(cx,hx-hw/2+16,hyy+56,hw-32,hh-62,6);cx.fill(); // inner shadow
      cx.fillStyle='#ffd23f';rr(cx,hx-9,hyy+86,18,26,3);cx.fill();             // offering glow slit
      cx.save();cx.shadowColor='rgba(255,210,63,.8)';cx.shadowBlur=18;
      cx.fillStyle='#ffe89a';rr(cx,hx-9,hyy+86,18,26,3);cx.fill();cx.restore();
      // curved roof
      cx.fillStyle='#3a2a20';cx.beginPath();
      cx.moveTo(hx-hw/2-26,hyy+44);cx.quadraticCurveTo(hx,hyy-14,hx+hw/2+26,hyy+44);
      cx.lineTo(hx+hw/2+18,hyy+56);cx.quadraticCurveTo(hx,hyy+2,hx-hw/2-18,hyy+56);cx.closePath();cx.fill();
      cx.strokeStyle='#c8a030';cx.lineWidth=2.5;cx.beginPath();
      cx.moveTo(hx-hw/2-24,hyy+45);cx.quadraticCurveTo(hx,hyy-12,hx+hw/2+24,hyy+45);cx.stroke()}
    // ---- offering box (saisen-bako) in front ----
    const obx=txc,oby=gy+56;
    cx.fillStyle='#7a5a3a';rr(cx,obx-64,oby,128,58,7);cx.fill();
    cx.fillStyle='#5a4028';rr(cx,obx-64,oby,128,14,7);cx.fill();
    cx.fillStyle='#1e1610';rr(cx,obx-38,oby+18,76,10,5);cx.fill();   // coin slot
    cx.strokeStyle='#c8a030';cx.lineWidth=2;rr(cx,obx-64,oby,128,58,7);cx.stroke();
    cx.fillStyle='rgba(255,255,255,.12)';rr(cx,obx-58,oby+3,44,8,4);cx.fill();
    // ---- hanging lanterns (pulsing warm glow) ----
    for(const lx2 of[vx+120,vx+vw-120]){
      cx.strokeStyle='#5a4a3a';cx.lineWidth=2;cx.beginPath();cx.moveTo(lx2,vy+8);cx.lineTo(lx2,vy+46);cx.stroke();
      const pu=0.6+0.4*Math.sin(G.t*2.2+lx2*0.02);
      cx.save();cx.shadowColor='rgba(255,190,80,'+(0.4+pu*0.5).toFixed(2)+')';cx.shadowBlur=12+pu*10;
      cx.fillStyle='#ffb060';rr(cx,lx2-16,vy+46,32,40,9);cx.fill();cx.restore();
      cx.strokeStyle='#8a4a10';cx.lineWidth=2;rr(cx,lx2-16,vy+46,32,40,9);cx.stroke();
      cx.strokeStyle='rgba(90,30,10,.55)';cx.lineWidth=1.4;
      cx.beginPath();cx.moveTo(lx2-16,vy+60);cx.lineTo(lx2+16,vy+60);cx.moveTo(lx2-16,vy+74);cx.lineTo(lx2+16,vy+74);cx.stroke();
      cx.fillStyle='#8a4a10';rr(cx,lx2-5,vy+40,10,7,3);cx.fill();rr(cx,lx2-5,vy+85,10,6,3);cx.fill()}
    // ---- incense smoke: soft radial-gradient puffs (VLM QA fix: no flat circles) ----
    for(let i=0;i<7;i++){
      const ph=G.t*0.5+i/7, cyc=(ph%1);
      const px=obx+52+Math.sin(ph*TAU+i*2.1)*14;
      const py=oby-cyc*88;
      const pr=6+cyc*10;
      const sg=cx.createRadialGradient(px,py,1,px,py,pr);
      sg.addColorStop(0,'rgba(232,224,244,'+(0.40*(1-cyc)).toFixed(2)+')');
      sg.addColorStop(0.65,'rgba(224,214,238,'+(0.18*(1-cyc)).toFixed(2)+')');
      sg.addColorStop(1,'rgba(220,210,236,0)');
      cx.fillStyle=sg;cx.beginPath();cx.arc(px,py,pr,0,TAU);cx.fill()}
    // ---- shrine keeper cat (sitting, bobbing) beside the offering box ----
    // costume overlays dress the keeper as lifetime MEGA count grows (KEEPER'S DRESS track)
    {const kx=obx-118,ky=gy+58+Math.sin(G.t*2.6)*3;
      const mg=si.megaN||0;
      const C=i=>mg>=SHRINE_COSTUMES[i].mega; // C(0) collar · C(1) cape · C(2) mask · C(3) crown · C(4) halo
      cx.fillStyle='rgba(20,14,10,.3)';cx.beginPath();cx.ellipse(kx,gy+72,20,6,0,0,TAU);cx.fill();
      if(C(4)){ // divine aura (behind everything)
        const au=cx.createRadialGradient(kx,ky-40,4,kx,ky-40,58);
        au.addColorStop(0,'rgba(255,216,90,.35)');au.addColorStop(0.6,'rgba(196,106,223,.16)');au.addColorStop(1,'rgba(196,106,223,0)');
        cx.fillStyle=au;cx.beginPath();cx.arc(kx,ky-40,58,0,TAU);cx.fill()}
      if(C(1)){ // vermilion cape (behind the cat)
        cx.save();cx.translate(kx,ky-52);cx.rotate(-0.06);
        cx.fillStyle='#c83830';cx.beginPath();
        cx.moveTo(-15,0);cx.quadraticCurveTo(-24,26,-19,50);
        cx.lineTo(19,50);cx.quadraticCurveTo(24,26,15,0);cx.closePath();cx.fill();
        cx.lineWidth=2;cx.strokeStyle='#8a2018';cx.stroke();
        cx.fillStyle='rgba(255,255,255,.14)';cx.beginPath();
        cx.moveTo(-11,2);cx.quadraticCurveTo(-18,24,-14,46);cx.lineTo(-6,46);cx.quadraticCurveTo(-9,24,-6,2);cx.closePath();cx.fill();
        cx.restore()}
      ART.cat({x:kx,y:ky,s:1.05,id:'cat',t:G.t,e:{anim:'idle'}});
      if(C(0)){ // bell collar: red neck band + gold bell
        cx.strokeStyle='#e84030';cx.lineWidth=4.5;
        cx.beginPath();cx.arc(kx,ky-44,13.5,Math.PI*0.15,Math.PI*0.85);cx.stroke();
        cx.fillStyle='#ffd23f';cx.beginPath();cx.arc(kx,ky-36,4.6,0,TAU);cx.fill();
        cx.lineWidth=1.4;cx.strokeStyle='#8a5a10';cx.stroke();
        cx.beginPath();cx.moveTo(kx,ky-39);cx.lineTo(kx,ky-34);cx.stroke()}
      if(C(2)){ // fox mask worn tilted on the head (face stays visible)
        cx.save();cx.translate(kx+14,ky-76);cx.rotate(0.32);
        cx.fillStyle='#e89040';cx.beginPath();cx.ellipse(0,0,10,12,0,0,TAU);cx.fill();
        cx.lineWidth=1.8;cx.strokeStyle='#8a5a20';cx.stroke();
        cx.beginPath();cx.moveTo(-9,-4);cx.lineTo(-12,-15);cx.lineTo(-3,-9);cx.closePath();cx.fill();cx.stroke();
        cx.beginPath();cx.moveTo(9,-4);cx.lineTo(12,-15);cx.lineTo(3,-9);cx.closePath();cx.fill();cx.stroke();
        cx.fillStyle='#fff4e0';cx.beginPath();cx.ellipse(0,5,5.5,4.2,0,0,TAU);cx.fill();
        cx.fillStyle='#5a3b16';
        cx.beginPath();cx.ellipse(-4.5,-2,1.6,2.4,0.3,0,TAU);cx.fill();
        cx.beginPath();cx.ellipse(4.5,-2,1.6,2.4,-0.3,0,TAU);cx.fill();
        cx.restore()}
      if(C(3)){ // golden crown above-left (clear of the mask)
        glyph(cx,'crown',kx-13,ky-87,12,'#ffd23f','#8a5a10')}
      if(C(4)){ // divine halo + orbiting sparks
        cx.save();cx.shadowColor='rgba(255,216,90,.9)';cx.shadowBlur=10;
        cx.strokeStyle='#ffe89a';cx.lineWidth=3;
        cx.beginPath();cx.ellipse(kx,ky-99,15,4.6,0,0,TAU);cx.stroke();cx.restore();
        for(let i2=0;i2<3;i2++){const a2=G.t*1.6+i2*TAU/3;
          const sxp=kx+Math.cos(a2)*20,syp=ky-99+Math.sin(a2)*6.5;
          cx.fillStyle='rgba(255,232,140,'+(0.65+0.35*Math.sin(G.t*4+i2)).toFixed(2)+')';
          star(cx,sxp,syp,4,1.8);cx.fill()}}
      // keeper's name sign: small wooden plaque standing left of the cat (settings names it)
      {const kn=(SV.shrine.keeperName||'').trim();
        if(kn){const sxx=kx-58,syy=gy+70;
          // post + board, slight sway
          cx.save();cx.translate(sxx,syy);cx.rotate(Math.sin(G.t*1.2)*0.02);
          cx.fillStyle='#5a4028';rr(cx,-2.5,-14,5,26,2);cx.fill();
          const bw2=Math.min(84,kn.length*6.2+16);
          cx.fillStyle='#8a6a42';rr(cx,-bw2/2,-36,bw2,24,5);cx.fill();
          cx.lineWidth=2;cx.strokeStyle='#4a3018';rr(cx,-bw2/2,-36,bw2,24,5);cx.stroke();
          cx.fillStyle='rgba(255,255,255,.10)';rr(cx,-bw2/2+2,-34,bw2-4,7,3);cx.fill();
          txt(cx,kn.slice(0,12),0,-24,9,'#ffe9b0','center',2,'#3a2410',700);
          cx.restore()}}}
    // ---- coin toss animation → flash → reveal ----
    if(anim){
      anim.t+=dt;
      const T=1.05,fr=Math.min(1,anim.t/T);
      const sx2=anim.from.x,sy2=anim.from.y,ex2=obx,ey2=oby+22;
      const bx2=sx2+(ex2-sx2)*fr, byy=sy2+(ey2-sy2)*fr-Math.sin(fr*Math.PI)*150;
      if(fr<1){ // spinning coin
        cx.save();cx.translate(bx2,byy);cx.rotate(anim.t*9);
        const cw2=Math.abs(Math.cos(anim.t*9))*9+2.5;
        cx.fillStyle='#ffd23f';cx.beginPath();cx.ellipse(0,0,cw2,11,0,0,TAU);cx.fill();
        cx.lineWidth=2;cx.strokeStyle='#8a5a10';cx.stroke();
        cx.fillStyle='rgba(255,255,255,.5)';cx.beginPath();cx.ellipse(-cw2*0.3,-4,2.5,3.4,0,0,TAU);cx.fill();
        cx.restore()}
      else{ // landing flash + sparkles
        const f=clamp((anim.t-T)/0.45,0,1);
        cx.globalAlpha=1-f;
        cx.fillStyle='#fff2c0';cx.beginPath();cx.arc(obx,oby+22,10+f*46,0,TAU);cx.fill();
        cx.globalAlpha=1;
        for(let i=0;i<8;i++){const a=i*TAU/8+f*1.6;
          const px=obx+Math.cos(a)*(16+f*58),py=oby+22+Math.sin(a)*(12+f*40);
          cx.fillStyle='rgba(255,220,120,'+(1-f).toFixed(2)+')';star(cx,px,py,5,2.2);cx.fill()}
        if(!anim.revealed){anim.revealed=true; // apply ONCE at the flash
          shrineApply(anim.res);
          SFX.up();
          toast('SHRINE BLESSING: '+anim.res.name,'#ffd23f');
          const res=anim.res;
          openModal(res.jackpot?'MEGA BLESSING!':'BLESSING!',[res.name],[
            {n:'NICE!',col:'#ffd23f',cb:()=>{G.shrineAnim=null}}],
            (mx,my,mw,mh)=>{ // medallion + reward line (drawExtra space)
              const ccx=mx+mw/2,ccy=my+52;
              const pu=1+Math.sin(G.t*4)*0.05;
              cx.save();cx.translate(ccx,ccy);cx.scale(pu,pu);
              if(res.jackpot){ // jackpot rays behind the medallion
                cx.save();cx.rotate(G.t*0.6);
                for(let i=0;i<10;i++){cx.rotate(TAU/10);
                  cx.fillStyle='rgba(255,210,80,.16)';
                  cx.beginPath();cx.moveTo(0,0);cx.lineTo(70,-9);cx.lineTo(70,9);cx.closePath();cx.fill()}
                cx.restore()}
              cx.fillStyle=res.col;cx.beginPath();cx.arc(0,0,34,0,TAU);cx.fill();
              cx.lineWidth=3.5;cx.strokeStyle=shade(res.col,.5);cx.stroke();
              cx.fillStyle='rgba(255,255,255,.35)';cx.beginPath();cx.arc(-9,-11,9,0,TAU);cx.fill();
              glyph(cx,res.icon,0,0,20,'#fff',shade(res.col,.62));cx.restore();
              txt(cx,shrineBlessLine(res),mx+mw/2,my+126,17,res.jackpot?'#c46adf':'#5a3b16','center',4,'#fff',700);
              if(res.streakMul>1)txt(cx,'prayer streak bonus +'+Math.round((res.streakMul-1)*100)+'% applied',mx+mw/2,my+146,11.5,'#d05a28','center',2.5,'#fff',700);
              if(res.newCostume){const pu=1+Math.sin(G.t*5)*0.06; // MEGA milestone: keeper dress-up
                cx.save();cx.translate(mx+mw/2,my+172);cx.scale(pu,pu);
                cx.fillStyle='#c46adf';rr(cx,-190,-13,380,26,13);cx.fill();
                cx.lineWidth=2;cx.strokeStyle='#8a2aa8';rr(cx,-190,-13,380,26,13);cx.stroke();
                glyph(cx,'crown',-166,0,11,'#ffd23f','#c46adf');
                txt(cx,'NEW KEEPER COSTUME: '+res.newCostume+'!',22,0.5,12.5,'#fff','center',2.5,'#6a1a8a',700);
                cx.restore()}
              txt(cx,anim.free?'(free daily toss)':'(paid toss — '+SHRINE_COST+' CF)',mx+mw/2,my+200,11,'#8a6a3a','center',2,'#fff',400)})}}}
    cx.restore()}
  /* ---- RIGHT: status panel + pray controls + pool preview ---- */
  const rx=784,rw2=476;
  creamPanel(rx,64,rw2,150,'#c8913a');
  glyph(cx,'torii',rx+42,104,26,'#ffd23f','#8a4a10');
  txt(cx,'NYANKO SHRINE',rx+80,90,19,'#5a3b16','left',4,'#fff',700);
  txt(cx,'Toss a coin — the shrine god blesses daily visitors!',rx+80,114,11.5,'#8a6a3a','left',2.5,'#fff',400);
  {const stat=si.freeLeft?['FREE TOSS READY!','#1e7a3a']:['Free toss used today — extra tosses '+si.extraLeft+'/'+SHRINE_MAX_EXTRA,'#a89878'];
    txt(cx,stat[0],rx+80,138,12,stat[1],'left',2.5,'#fff',700)}
  // keeper line: names the scene cat (settings → KEEPER NAME) — gold chip right of the title
  {const kn=(SV.shrine.keeperName||'').trim();
    if(kn){const pu=1+Math.sin(G.t*2.2)*0.03;
      cx.save();cx.translate(rx+rw2-86,88);cx.scale(pu,pu);
      cx.fillStyle='#2e2018';rr(cx,-70,-13,140,26,13);cx.fill();
      cx.lineWidth=1.8;cx.strokeStyle='#c8a030';rr(cx,-70,-13,140,26,13);cx.stroke();
      glyph(cx,'cat',-54,0,8.5,'#ffd23f','#2e2018');
      txt(cx,kn.slice(0,12).toUpperCase(),8,0.5,10.5,'#ffd23f','center',2,'#8a5a10',700);cx.restore()}}
  // prayer-streak chip (flame + day count + live bonus) — advances on each daily free toss
  {const sk=si.streak;
    cx.fillStyle=sk>0?'rgba(255,170,80,.16)':'rgba(90,59,22,.06)';rr(cx,rx+16,156,rw2-32,44,11);cx.fill();
    cx.lineWidth=1.6;cx.strokeStyle=sk>0?'rgba(232,88,64,.5)':'rgba(138,106,58,.35)';rr(cx,rx+16,156,rw2-32,44,11);cx.stroke();
    const fp=sk>0?1+Math.sin(G.t*4)*0.08:1;
    cx.save();cx.translate(rx+44,178);cx.scale(fp,fp);glyph(cx,'flame',0,0,15,'#ff7a3f','#ffd23f');cx.restore();
    if(sk>0){txt(cx,sk+'-DAY PRAYER STREAK',rx+70,170,11.5,'#d05a28','left',2.5,'#fff',700);
      txt(cx,'blessing rewards +'+Math.round(si.streakBonus*100)+'% (+'+(sk<SHRINE_STREAK_MAX?'4% each new day':'max streak!)')+')',rx+70,188,10,sk>=SHRINE_STREAK_MAX?'#d05a28':'#8a6a3a','left',2,'#fff',400)}
    else{txt(cx,'PRAYER STREAK',rx+70,170,11.5,'#a89878','left',2,'#fff',700);
      txt(cx,'pray daily — each day adds +4% blessing rewards',rx+70,188,10,'#a89878','left',2,'#fff',400)}}
  // stats strip (+ KEEPER'S DRESS costume track row — derived from megaN, no save change)
  creamPanel(rx,226,rw2,108);
  txt(cx,'Lifetime tosses: '+fmt(si.total)+'   ·   MEGA blessings: '+si.megaN,rx+24,250,12.5,'#5a3b16','left',2.5,'#fff',700);
  {const lastB=SHRINE_BLESSINGS.find(b=>b.id===si.lastId);
    if(lastB){txt(cx,'LAST BLESSING:',rx+24,278,10.5,'#a89878','left',2,'#fff',700);
      cx.fillStyle='rgba(255,244,214,.7)';rr(cx,rx+120,266,rw2-146,26,13);cx.fill();
      cx.lineWidth=1.4;cx.strokeStyle='rgba(176,138,80,.5)';rr(cx,rx+120,266,rw2-146,26,13);cx.stroke();
      glyph(cx,lastB.icon,rx+140,279,10,lastB.col,'#fff');
      txt(cx,lastB.n,rx+158,279,11,'#b06a10','left',2,'#fff',700)}
    else txt(cx,'No blessings yet — toss your first coin today!',rx+24,278,11,'#a89878','left',2,'#fff',400)}
  // MEGA pity meter — 10 gold pips; MEGA weight ramps as pips fill, forced at 10
  {const p=si.pity,pL=si.pityLeft;
    txt(cx,'MEGA PITY',rx+24,306,10.5,'#a89878','left',2,'#fff',700);
    for(let i=0;i<SHRINE_PITY_MAX;i++){const px=rx+108+i*22,py=306;
      const on=i<p;
      const pu=on&&p>=SHRINE_PITY_MAX-1?1+Math.sin(G.t*6+i)*0.15:1;
      cx.save();cx.translate(px,py);cx.scale(pu,pu);
      cx.fillStyle=on?'#c46adf':'rgba(196,106,223,.16)';
      cx.beginPath();cx.moveTo(0,-7);cx.lineTo(6,0);cx.lineTo(0,7);cx.lineTo(-6,0);cx.closePath();cx.fill();
      if(on){cx.lineWidth=1.6;cx.strokeStyle='#8a2aa8';cx.stroke()}
      cx.restore()}
    if(pL<=1)txt(cx,'NEXT TOSS: GUARANTEED MEGA!',rx+rw2-24,306,10.5,'#c46adf','right',2.5,'#fff',700);
    else txt(cx,'MEGA in ≤'+pL+' tosses',rx+rw2-24,306,10.5,'#8a6a3a','right',2,'#fff',400)}
  // KEEPER'S DRESS: 5 costume milestones unlocked by lifetime MEGA count (dresses the scene cat)
  {const cs=shrineCostumes(si.megaN);const gotN=cs.filter(c=>c.got).length;
    const next=cs.find(c=>!c.got);
    txt(cx,'KEEPER\'S DRESS',rx+24,326,10,'#a89878','left',2,'#fff',700);
    cs.forEach((c,i)=>{const px=rx+142+i*26,py=326;
      const on=c.got;
      const pu=on&&next&&i===gotN-1?1+Math.sin(G.t*5)*0.14:1; // newest unlock pulses
      cx.save();cx.translate(px,py);cx.scale(pu,pu);
      cx.fillStyle=on?'#ffd23f':'rgba(255,210,63,.18)';
      cx.beginPath();cx.moveTo(0,-7);cx.lineTo(6.2,0);cx.lineTo(0,7);cx.lineTo(-6.2,0);cx.closePath();cx.fill();
      if(on){cx.lineWidth=1.6;cx.strokeStyle='#8a5a10';cx.stroke();
        cx.fillStyle='#5a3b16';cx.font=FONT(6.5,700);cx.textAlign='center';cx.fillText(String(c.mega),0,2.4)}
      else{cx.lineWidth=1.2;cx.strokeStyle='rgba(138,106,58,.4)';cx.stroke()}
      cx.restore()});
    if(next)txt(cx,next.n+' at '+next.mega+' MEGA',rx+rw2-24,326,10,gotN?'#8a6a3a':'#b8a884','right',2,'#fff',400);
    else txt(cx,'FULLY DRESSED — MEGA +'+Math.round(shrineBlessPct()*100)+'%!',rx+rw2-24,326,10,'#d05a28','right',2,'#fff',700)}
  // PRAY buttons (disabled mid-animation / when modal up)
  {const canFree=si.freeLeft&&!anim;
    const canPaid=!si.freeLeft&&si.extraLeft>0&&SV.cf>=SHRINE_COST&&!anim;
    const py2=342;
    if(si.freeLeft)BTN('prayfree',rx,py2,rw2,64,()=>{shrineStart(true)},{col:'#ffd23f',outline:'#8a5a20',label:anim?'TOSSING…':'PRAY — FREE TODAY',fs:17,tcol:'#4a2f10',disabled:!!anim,
      draw:(c,hov)=>{if(hov&&!anim){c.fillStyle='rgba(255,200,90,.25)';rr(c,0,0,rw2,64,16);c.fill()}
        if(!anim){const pu=0.6+0.4*(1+Math.sin(G.t*4))/2;
          c.save();c.shadowColor='rgba(255,180,20,'+(0.25+pu*0.35).toFixed(2)+')';c.shadowBlur=10+pu*10;
          c.fillStyle='#ffd23f';rr(c,0,0,rw2,64,16);c.fill();c.restore();
          c.lineWidth=3;c.strokeStyle='#8a5a20';rr(c,1.5,1.5,rw2-3,61,15);c.stroke()}
        else{c.fillStyle='#d8ccb0';rr(c,0,0,rw2,64,16);c.fill()}
        c.lineWidth=1.5;c.strokeStyle='rgba(255,255,255,.55)';rr(c,5,5,rw2-10,54,12);c.stroke();
        glyph(c,'cat',34,32,16,'#5a3b16','#ffd23f');
        txt(c,anim?'TOSSING…':'PRAY — FREE TODAY',rw2/2+16,32,17,anim?'#a89878':'#4a2f10','center',3.5,'#fff',700);
        if(!anim)txt(c,'daily luck · jackpot x2',rw2/2+16,52,10,'#8a6a3a','center',2,'#fff',400)}});
    else BTN('praypaid',rx,py2,rw2,64,()=>{shrineStart(false)},{col:si.extraLeft>0&&SV.cf>=SHRINE_COST?'#ffb060':'#d8ccb0',outline:'#8a5a20',label:'PRAY — '+SHRINE_COST+' CF ('+si.extraLeft+' left)',fs:15,tcol:'#4a2f10',disabled:!!anim});
    txt(cx,'Extra tosses reset each day · blessings scale with User Rank',rx+rw2/2,py2+82,10.5,'#a89878','center',2,'#fff',400)}
  // blessing pool preview (QA fix: 8 rows at 24.5px spacing — the old 26px layout pushed the
  //   MEGA row below the panel's bottom edge; now every row stays inside)
  creamPanel(rx,432,rw2,228);
  txt(cx,'POSSIBLE BLESSINGS',rx+18,452,13,'#b06a10','left',3,'#fff',700);
  { // KEEPER'S BLESSING: live MEGA-weight bonus from the dress track (gold, pulses when active)
    const bp=shrineBlessPct();
    if(bp>0){const pu=1+Math.sin(G.t*3.5)*0.04;
      cx.save();cx.translate(rx+rw2-96,452);cx.scale(pu,pu);
      cx.fillStyle='rgba(255,238,180,.95)';rr(cx,-88,-10,176,20,10);cx.fill();
      cx.lineWidth=1.8;cx.strokeStyle='#e8951f';rr(cx,-88,-10,176,20,10);cx.stroke();
      glyph(cx,'crown',-72,0,9,'#b06a10','#ffd23f');
      txt(cx,'MEGA +'+Math.round(bp*100)+'%',6,0.5,10.5,'#8a5a10','center',2,'#fff',700);cx.restore()}
    else txt(cx,'dress the keeper to raise MEGA odds',rx+rw2-18,452,9.5,'#a89878','right',2,'#fff',400)}
  SHRINE_BLESSINGS.forEach((b,i)=>{
    const bx=rx+18,by=462+i*24.5;
    cx.fillStyle=i%2?'rgba(90,59,22,.05)':'rgba(255,244,214,.45)';
    rr(cx,bx,by,rw2-36,23,8);cx.fill();
    cx.fillStyle=b.col;cx.beginPath();cx.arc(bx+14,by+11.5,9.5,0,TAU);cx.fill();
    cx.lineWidth=1.8;cx.strokeStyle=shade(b.col,.55);cx.stroke();
    glyph(cx,b.icon,bx+14,by+11.5,9.5,'#fff',shade(b.col,.62));
    txt(cx,b.n,bx+32,by+12,11.5,'#5a3b16','left',2,'#fff',700);
    if(b.jackpot){const pu=1+Math.sin(G.t*5)*0.06;
      const bp=shrineBlessPct();
      if(bp>0)txt(cx,'+'+Math.round(bp*100)+'%',bx+rw2-98,by+12,11,'#e8951f','right',2,'#fff',700); // blessing boost badge
      cx.save();cx.translate(bx+rw2-66,by+11.5);cx.scale(pu,pu);
      cx.fillStyle='#c46adf';rr(cx,-26,-9,52,18,9);cx.fill();
      txt(cx,'JACKPOT',0,0.5,9,'#fff','center',2,'#6a1a8a',700);cx.restore()}
    else txt(cx,'+',bx+rw2-50,by+12,11,'#8a6a3a','right')});
  brownBottomBar()}
/* kick off a toss: rolls the blessing and starts the coin-flight animation */
function shrineStart(free){
  const got=shrinePray();
  if(!got)return;
  G.shrineAnim={t:0,res:got.res,free:got.free,revealed:false,from:{x:990,y:360}};
  SFX.click()}


/* ============================== SCREEN: SETTINGS ============================== */
/* Builder C owns this function (Task 6): file export/import with real controls, hidden
   textarea paste overlay (helpers live in savesys.js), storage info + failure banner,
   double-confirm reset, dev-gated DEMO BOOST. */
function drawSettings(dt){drawTopBar('SETTINGS',true);
  parchBody();
  creamPanel(240,90,800,540,'#c8913a');
  BTN('sbgm',280,130,340,60,()=>{SV.settings.bgm=!SV.settings.bgm;persist();AudioSetBgm(SV.settings.bgm)},{col:SV.settings.bgm?'#7fe8a0':'#e8d8b0',outline:'#8a5a20',label:'BGM: '+(SV.settings.bgm?'ON':'OFF'),fs:18});
  BTN('ssfx',660,130,340,60,()=>{SV.settings.sfx=!SV.settings.sfx;persist()},{col:SV.settings.sfx?'#7fe8a0':'#e8d8b0',outline:'#8a5a20',label:'SFX: '+(SV.settings.sfx?'ON':'OFF'),fs:18});
  // ---- commander name (posted to the World Dojo Ranking) — left half ----
  cx.fillStyle='#fff8e8';rr(cx,280,200,350,46,14);cx.fill();
  cx.lineWidth=2.5;cx.strokeStyle='#a8845a';rr(cx,281.5,201.5,347,43,13);cx.stroke();
  glyph(cx,'medal',308,223,10,'#b06a10','#ffd23f');
  txt(cx,'COMMANDER NAME',328,213,10,'#a89878','left',2,'#fff',700);
  txt(cx,(SV.cmdName||'CAT COMMANDER').slice(0,16),328,234,12.5,'#5a3b16','left',2.5,'#fff',700);
  BTN('sname',552,206,72,34,()=>{G.nameBuf=SV.cmdName||'';
    openModal('COMMANDER NAME',['1–18 characters — signs your Dojo scores.'],[
      {n:'SAVE',col:'#ffd23f',cb:()=>{nameBlur();
        const v=String(G.nameBuf||'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,18);
        SV.cmdName=v||'CAT COMMANDER';persist();toast('Commander name saved: '+SV.cmdName,'#7fe8a0')}},
      {n:'CANCEL',cb:()=>{nameBlur()}}],
      (x,y,w,h)=>{ // live text field (hidden DOM input overlay — real keyboard, canvas frame)
        const bx=x+40,by=y+14,bw=w-80,bh=54;
        cx.fillStyle='#101218';rr(cx,bx,by,bw,bh,10);cx.fill();
        cx.lineWidth=2;cx.strokeStyle='#5a6478';rr(cx,bx,by,bw,bh,10);cx.stroke();
        cx.font='16px monospace';cx.textAlign='left';cx.textBaseline='middle';
        cx.fillStyle='#e8e8f0';cx.fillText(String(G.nameBuf||'').slice(0,26),bx+14,by+bh/2);
        if(!G.nameBuf)txt(cx,'(tap and type)',bx+14,by+bh/2,13,'#6a7488','left');
        G.hits.push({id:'namefield',x:bx,y:by,w:bw,h:bh,cb:()=>{nameFocus(bx,by,bw,bh)},hidden:false,modal:true})})},{col:'#7fd0ff',outline:'#2a5a7a',label:'EDIT',fs:12});
  // ---- shrine keeper name (the cat who takes your coins) — right half ----
  cx.fillStyle='#fff8e8';rr(cx,650,200,350,46,14);cx.fill();
  cx.lineWidth=2.5;cx.strokeStyle='#a8845a';rr(cx,651.5,201.5,347,43,13);cx.stroke();
  glyph(cx,'torii',678,223,10,'#b06a10','#ffd23f');
  txt(cx,'SHRINE KEEPER',698,213,10,'#a89878','left',2,'#fff',700);
  txt(cx,(SV.shrine.keeperName||'KEEPER').slice(0,16),698,234,12.5,'#5a3b16','left',2.5,'#fff',700);
  BTN('skname',922,206,72,34,()=>{G.nameBuf=SV.shrine.keeperName||'';
    openModal('KEEPER NAME',['1–12 characters — the shrine cat who takes your coins.'],[
      {n:'SAVE',col:'#ffd23f',cb:()=>{nameBlur();
        const v=String(G.nameBuf||'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,12);
        SV.shrine.keeperName=v;persist();toast('Keeper name saved: '+(v||'KEEPER'),'#ffd23f')}},
      {n:'CANCEL',cb:()=>{nameBlur()}}],
      (x,y,w,h)=>{ // same hidden-DOM-input pattern as the commander name
        const bx=x+40,by=y+14,bw=w-80,bh=54;
        cx.fillStyle='#101218';rr(cx,bx,by,bw,bh,10);cx.fill();
        cx.lineWidth=2;cx.strokeStyle='#5a6478';rr(cx,bx,by,bw,bh,10);cx.stroke();
        cx.font='16px monospace';cx.textAlign='left';cx.textBaseline='middle';
        cx.fillStyle='#e8e8f0';cx.fillText(String(G.nameBuf||'').slice(0,26),bx+14,by+bh/2);
        if(!G.nameBuf)txt(cx,'(tap and type)',bx+14,by+bh/2,13,'#6a7488','left');
        G.hits.push({id:'knamefield',x:bx,y:by,w:bw,h:bh,cb:()=>{nameFocus(bx,by,bw,bh)},hidden:false,modal:true})})},{col:'#ffb95a',outline:'#8a4a10',label:'EDIT',fs:12});
  // ---- export: proper panel — download a file OR copy the clipboard code ----
  BTN('sexp',280,290,340,60,()=>{openModal('EXPORT SAVE',['Back up your progress: download a save file,','or copy a restore code to the clipboard.'],[
    {n:'DOWNLOAD FILE',col:'#7fd0ff',cb:()=>{downloadSaveFile()}},
    {n:'COPY CODE',cb:()=>{try{navigator.clipboard.writeText(exportSave()).then(()=>toast('Save code copied!'),()=>toast('Copy blocked — use Download file','#ff7a7a'))}catch(e){toast('Copy blocked — use Download file','#ff7a7a')}}},
    {n:'CLOSE',cb:()=>{}}],(x,y,w,h)=>{
      cx.fillStyle='#101218';rr(cx,x+20,y+10,w-40,92,10);cx.fill();
      const s=exportSave();cx.font='11px monospace';cx.textAlign='left';cx.textBaseline='top';
      cx.fillStyle='#e8e8f0';cx.fillText(s.slice(0,58),x+34,y+24);cx.fillText(s.slice(58,116)+'…',x+34,y+40);
      cx.fillStyle='#8a92a8';const d=new Date();const ds=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
      cx.fillText('file: battle-cats-save-'+ds+'.txt  ·  pasted codes are accepted too',x+34,y+72)})},{col:'#ffd94a',outline:'#8a5a20',label:'EXPORT SAVE',fs:17});
  // ---- import: file picker + real in-canvas paste entry (hidden DOM textarea overlay) ----
  BTN('simp',660,290,340,60,()=>{
    saveSetPaste('');
    const openImp=()=>{openModal('IMPORT SAVE',['Tap the box, then type or press Ctrl+V — or pick a save file.'],[
      {n:'CLEAR',col:'#e8d8b0',cb:()=>{saveSetPaste('');openImp()}},
      {n:'CLIPBOARD',col:'#7fd0ff',cb:()=>{openImp();saveClipboardRead(v=>{saveSetPaste(v);if(G.modal&&G.modal.title==='IMPORT SAVE')openImp()})}},
      {n:'IMPORT',col:'#ffd94a',cb:()=>{
        if(importSave(G.importBuf)){saveBlurPaste();toast('Save imported!','#7fe8a0');regenEnergy()}
        else{toast('Invalid save code — current progress preserved','#ff7a7a');SFX.error();openImp()}}},
      {n:'CHOOSE FILE',col:'#b0e8a0',cb:()=>{saveBlurPaste();pickSaveFile()}},
      {n:'CANCEL',cb:()=>{saveBlurPaste()}}],
      (x,y,w,h)=>{const bx=x+20,by=y+10,bw=w-40,bh=150; // paste area (validated on IMPORT only)
        cx.fillStyle='#101218';rr(cx,bx,by,bw,bh,10);cx.fill();
        cx.lineWidth=2;cx.strokeStyle='#5a6478';rr(cx,bx,by,bw,bh,10);cx.stroke();
        const s=String(G.importBuf||'');const cols=56;const shown=s.slice(0,cols*4);
        cx.font='11px monospace';cx.textAlign='left';cx.textBaseline='top';
        if(!s){cx.fillStyle='#6a7488';cx.fillText('(tap here, then type or Ctrl+V — or use CHOOSE FILE)',bx+14,by+14)}
        else{cx.fillStyle='#e8e8f0';for(let i=0;i<4;i++){const ln=shown.slice(i*cols,(i+1)*cols);if(ln)cx.fillText(ln,bx+14,by+14+i*16)}
          if(s.length>shown.length){cx.fillStyle='#8a92a8';cx.fillText('… '+(s.length-shown.length)+' more chars',bx+14,by+14+4*16)}}
        G.hits.push({id:'imparea',x:bx,y:by,w:bw,h:bh,cb:()=>{saveFocusPasteArea(bx,by,bw,bh)},hidden:false,modal:true})})};
    openImp()},{col:'#ffd94a',outline:'#8a5a20',label:'IMPORT SAVE',fs:17});
  // ---- reset: double confirm (two modals) ----
  BTN('sreset',280,370,340,60,()=>{openModal('RESET GAME?',['This deletes ALL progress permanently!'],[
    {n:'DELETE ALL',col:'#ff5a5a',cb:()=>{openModal('FINAL CONFIRM',['Every cat, XP, treasure and clear will be','wiped from this browser. There is no undo.'],[
      {n:'YES — WIPE SAVE',col:'#ff5a5a',cb:()=>{localStorage.removeItem(SAVE_KEY);localStorage.removeItem(SAVE_KEY_LEGACY);loadSave();toast('Game reset');G.screen='title';G.screenPrev=[]}},
      {n:'KEEP MY SAVE',cb:()=>{}}])}},
    {n:'CANCEL',cb:()=>{}}])},{col:'#ff5a5a',outline:'#8a1a1a',label:'RESET SAVE',fs:16});
  // ---- dev-only DEMO BOOST (not part of normal progression UI) ----
  if(localStorage.getItem('bc_dev_boost')==='1'){ // enable: localStorage.setItem('bc_dev_boost','1') then reload
    BTN('splus',660,370,340,60,()=>{SV.cf+=1500;SV.tickets.rare+=3;SV.xp+=10000;persist();toast('Demo boost: +1500 CF, +3 tickets, +10k XP','#7fe8a0')},{col:'#7a9a4a',outline:'#3a5a1a',label:'DEMO BOOST (DEV)',fs:15,tcol:'#fff'})}
  else{ // harmless credits panel in its place
    cx.fillStyle='#fff8e8';rr(cx,660,370,340,60,14);cx.fill();cx.lineWidth=2.5;cx.strokeStyle='#b08a50';rr(cx,661.5,371.5,337,57,13);cx.stroke();
    txt(cx,'CREDITS',830,391,13.5,'#b06a10','center',3,'#fff',700);
    txt(cx,'Fan tribute · vanilla JS · procedural art & audio',830,412,10.5,'#8a7a5a','center')}
  // ---- storage info line + storage-failure banner (from SV.saveStats) ----
  try{const st=SV.saveStats||{writes:0,fails:0,lastWrite:0};
    const kb=(JSON.stringify(SV).length/1024).toFixed(1);
    const lw=st.lastWrite?new Date(st.lastWrite).toLocaleTimeString():'—';
    if(typeof SAVE_UNRELIABLE!=='undefined'&&SAVE_UNRELIABLE){
      cx.fillStyle='rgba(255,90,90,.18)';rr(cx,260,458,760,30,10);cx.fill();
      cx.lineWidth=2;cx.strokeStyle='#ff5a5a';rr(cx,260,458,760,30,10);cx.stroke();
      txt(cx,'⚠ STORAGE WRITE FAILURES ('+st.fails+') — progress may not be saved. Check browser storage settings.',640,473,12,'#ff7a7a','center',3,'#fff',700)}
    else txt(cx,'SAVE: v'+SV.ver+' · '+kb+' KB · last write '+lw+' · '+st.writes+' writes · '+st.fails+' failed',640,473,12.5,'#8a7a5a','center',3,'#fff',400);
    // Cat Food balance with the official can, right of the storage line (Defect 2)
    drawCFCan(cx,952,473,8);
    txt(cx,fmt(SV.cf),970,473,12.5,'#8a5a10','left',3,'#fff',700);
  }catch(e){}
  txt(cx,'THE BATTLE CATS',640,508,20,'#b06a10','center',4,'#fff',700);
  txt(cx,'Story: EoC 1-3 · ItF 1-3 · CotC 1-3 · SoL · Uncanny Legends · Aku Realms · Dojo · Events',640,542,14,'#6a5a3a','center');
  txt(cx,'Units: '+CATS.length+' cats · Enemies: '+ENEMIES.length+' · Treasures: 27 sets · Cannons: 7 types',640,568,14,'#6a5a3a','center');
  txt(cx,'The Battle Cats © PONOS Corp.',640,640,12,'#a89878','center');
  brownBottomBar()}

/* ============================== SCREEN: STORE ============================== */
function drawStore(dt){drawTopBar('CAT FOOD STORE',true);
  ensureMissions();
  parchBody();
  // cat food balance header (official orange can)
  creamPanel(20,64,1240,74,'#c8913a');
  drawCFCan(cx,60,101,15);
  txt(cx,'Cat Food balance',90,92,14,'#8a7a5a','left',3,'#fff',400);
  txt(cx,fmt(SV.cf),90,116,22,'#b06a10','left',4,'#fff',700);
  txt(cx,'Earn Cat Food by clearing stages, ranking up, and daily login!',1200,101,13.5,'#8a6a3a','right',3,'#fff',400);
  // daily free pack — with login streak scaling (+25 CF per streak day, cap +300)
  const dayKey='storeDaily'+new Date().toDateString();
  const claimed=SV.eventsDone[dayKey];
  const streak=SV.dailyStreak||0;
  const nextReward=150+25*Math.min(streak,6);
  creamPanel(20,152,400,250,'#d8913a');
  txt(cx,'DAILY BONUS',220,182,16,'#e8951f','center',4,'#fff',700);
  if(streak>0){ // streak chip
    cx.save();cx.translate(352,182);cx.rotate(Math.sin(G.t*2.6)*0.06);
    cx.fillStyle='#e85840';rr(cx,-42,-13,84,26,13);cx.fill();cx.lineWidth=2;cx.strokeStyle='#8a1a10';rr(cx,-42,-13,84,26,13);cx.stroke();
    glyph(cx,'flame',-24,0,7,'#ffd23f','#e85840');
    txt(cx,streak+' DAY'+(streak>1?'S':''),12,0.5,12,'#fff','center',2,'#8a1a10',700);cx.restore()}
  cx.save();cx.translate(220,242);cx.rotate(Math.sin(G.t*2)*0.06);
  drawCFCan(cx,0,0,26);cx.restore();
  txt(cx,'FREE +'+nextReward+' Cat Food',220,300,15,'#5a3b16','center',3,'#fff',700);
  txt(cx,claimed?'Come back tomorrow to grow your streak!':'Log in daily: +25 CF per streak day (max +300)',220,324,11.5,'#8a7a5a','center');
  if(claimed)txt(cx,'✔ CLAIMED TODAY',220,366,15,'#5aa84a','center',3,'#fff',700);
  else BTN('dailycf',110,352,220,44,()=>{const st2=(SV.dailyLast===yesterKey())?(SV.dailyStreak||0):0;SV.dailyStreak=st2+1;SV.dailyLast=todayKey();SV.eventsDone[dayKey]=true;
    const rw=150+25*Math.min(SV.dailyStreak-1,6);SV.cf+=rw;persist();SFX.win2();toast('+'+rw+' Cat Food! Streak '+SV.dailyStreak+'d','#e85840');
    trophyCheckAll()},{col:'#e85840',outline:'#8a1a10',label:'CLAIM',fs:17,tcol:'#fff'});
  // 7-day streak calendar — visualizes the login-streak reward curve
  creamPanel(20,416,400,196,'#d8913a');
  txt(cx,'STREAK CALENDAR',220,442,14.5,'#e8951f','center',4,'#fff',700);
  for(let d=0;d<7;d++){const col=220+(d-3)*52,row=Math.floor(d/4);
    const cy=486+row*58;const doneDay=streak>d;const cur=!claimed&&streak===d;
    const dayRW=150+25*Math.min(d,6);
    cx.save();cx.translate(col,cy);
    if(cur){cx.scale(1.12+Math.sin(G.t*4)*0.05,1.12+Math.sin(G.t*4)*0.05)}
    cx.fillStyle=doneDay?'#7fc86a':(cur?'#ffd23f':'#efe4c8');cx.beginPath();cx.arc(0,0,20,0,TAU);cx.fill();
    cx.lineWidth=3;cx.strokeStyle=doneDay?'#3a7a2a':(cur?'#b07818':'#c8b892');cx.stroke();
    if(doneDay){txt(cx,'✔',0,1,17,'#1e4a14','center',3,'#fff',700)}
    else{txt(cx,String(d+1),0,0.5,15,cur?'#7a4a08':'#a89878','center',3,'#fff',700)}
    cx.restore();
    txt(cx,'+'+dayRW,col,cy+34,9.5,doneDay?'#3a7a2a':(cur?'#b07818':'#a89878'),'center',2,'#fff',700);
    if(d===6)txt(cx,'DAY 7 MAX',col,cy-34,9.5,'#b07818','center',2,'#fff',700)}
  txt(cx,claimed?'Next check-in tomorrow keeps the chain alive!':'Check in today to light up the next day!',220,596,11.5,'#8a6a3a','center',2,'#fff',400);
  // CF shop items — with owned counts, purchase float-text and insufficient shake feedback
  if(!G.storeFx)G.storeFx=[];if(!G.storeShake)G.storeShake={};
  const shop=[['XP PACK (S)','1,000 XP',{cf:150},()=>{SV.xp+=1000;return '+1,000 XP'}],['XP PACK (L)','6,000 XP',{cf:750},()=>{SV.xp+=6000;return '+6,000 XP'}],['XP PACK (XL)','20,000 XP',{cf:2200},()=>{SV.xp+=20000;return '+20,000 XP'}],['RARE TICKET','1× Rare Ticket (Gacha)',{cf:300},()=>{SV.tickets.rare++;return '+1 Rare Ticket'}],['GOLD TICKET','1× Gold Ticket (Uber guarantee)',{cf:1500},()=>{SV.tickets.gold++;return '+1 Gold Ticket'}]];
  const ownTxt=['','','','','Owned: '+SV.tickets.gold];
  shop.forEach((it,i)=>{const x=444,y=148+i*99;
    const shk=G.storeShake['shop'+i]||0;const sx=shk>0?Math.sin(shk*40)*5*shk:0;
    if(shk>0)G.storeShake['shop'+i]=Math.max(0,shk-0.016);
    cx.save();cx.translate(sx,0);
    creamPanel(x,y,816,92);
    txt(cx,it[0],x+24,y+30,16,'#b06a10','left',3,'#fff',700);
    txt(cx,it[1],x+24,y+60,12.5,'#8a7a5a','left');
    if(it[0].includes('TICKET')){const own=it[0].includes('RARE')?SV.tickets.rare:SV.tickets.gold;
      cx.fillStyle='#fff8e8';rr(cx,x+24,y+66,86,20,10);cx.fill();cx.lineWidth=1.5;cx.strokeStyle='#c8a860';rr(cx,x+24,y+66,86,20,10);cx.stroke();
      txt(cx,'Owned: '+own,x+67,y+77,10.5,'#8a6a10','center',2,'#fff',700)}
    const can=SV.cf>=it[2].cf;
    BTN('shop'+i,x+640,y+20,152,52,()=>{
      if(SV.cf<it[2].cf){G.storeShake['shop'+i]=0.5;toast('Not enough Cat Food!','#ff7a7a');SFX.error();return}
      SV.cf-=it[2].cf;const msg=it[3]();persist();SFX.up();
      G.storeFx.push({txt:msg,col:'#3a9a5a',x:x+716,y:y+26,t:1.3});
      toast(it[0]+' purchased!','#7fe8a0')},{col:can?'#ffd23f':'#e0d0a8',outline:'#8a5a20',label:fmt(it[2].cf)+' CF',fs:15});
    if(!can)txt(cx,'insufficient',x+716,y+84,10,'#c04030','center');
    cx.restore()});
  // floating purchase feedback
  G.storeFx.forEach(f=>{f.t-=dt;const a=clamp(f.t,0,1);cx.globalAlpha=a;
    txt(cx,f.txt,f.x,f.y-(1.3-f.t)*46,17,f.col,'center',4,'#fff',700);cx.globalAlpha=1});
  G.storeFx=G.storeFx.filter(f=>f.t>0);
  txt(cx,'Rare Tickets pull the Rare banner for free · Gold Tickets guarantee an Uber Rare from Uberfest.',640,650,13,'#8a6a3a','center',3,'#fff',400);
  brownBottomBar()}
