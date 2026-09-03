'use strict';
/* ============================== CORE / INPUT / UI KIT ============================== */
const cv=document.getElementById('game'),cx=cv.getContext('2d');
let VW=0,VH=0,SC=1,OX=0,OY=0;
function resize(){VW=innerWidth;VH=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);cv.width=VW*dpr;cv.height=VH*dpr;cv.style.width=VW+'px';cv.style.height=VH+'px';SC=Math.min(VW/1280,VH/720);OX=(VW-1280*SC)/2;OY=(VH-720*SC)/2;cx.setTransform(dpr,0,0,dpr,0,0);cv._dpr=dpr;document.getElementById('rotate').style.display=(VH>VW*1.05)?'flex':'none'}
addEventListener('resize',resize);resize();
const G={screen:'title',screenPrev:[],hits:[],drags:[],toasts:[],modal:null,t:0,chapter:'eoc1',mapSub:0,selCat:null,selEnemy:null,gachaAnim:null,dragCam:false,pending:null,hoverId:null,scrollHome:0,scrollChap:0,scrollColl:0,scrollList:0,guideFilter:'all',equipSel:-1,lastEvents:null,eventKey:'',transT:0};
function push(s){G.screenPrev.push(G.screen);G.screen=s;G.hits=[];G.transT=0.30}
function pop(){const p=G.screenPrev.pop();G.screen=p||'home';G.hits=[];G.transT=0.30}
function toast(msg,col){G.toasts.push({msg,t:3.2,col:col||'#ffd94a'})}
function openModal(title,lines,btns,drawExtra){G.modal={title,lines,btns:btns||[{n:'CLOSE',cb:()=>{}}],drawExtra}}
function toDesign(e){return{x:(e.clientX-OX)/SC,y:(e.clientY-OY)/SC}}
cv.addEventListener('pointerdown',e=>{const p=toDesign(e);AudioUnlock();G.pdown={x:p.x,y:p.y,moved:false,t:now()};
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
    if(h.horiz){const d=p.x-G.dragScroll.sx;if(Math.abs(d)>6||G.dragScroll.moved){G.dragScroll.moved=true;h.setOff(G.dragScroll.off-d)}}
    else{const d=p.y-G.dragScroll.sy;if(Math.abs(d)>6||G.dragScroll.moved){G.dragScroll.moved=true;h.setOff(clamp(G.dragScroll.off-d,0,h.max()))}}}
  else if(G.pdown&&G.onDrag){G.onDrag(p,G.pdown)}
  let hov=null;for(const h of G.hits){if(!h.hidden&&p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h){hov=h.id;break}}G.hoverId=hov;
  cv.style.cursor=hov?'pointer':'default';
});
/* mouse wheel / touchpad scrolling — roll the scroll region under the cursor */
cv.addEventListener('wheel',e=>{const p=toDesign(e);
  if(G.modal)return;
  let sreg=null;for(let i=G.hits.length-1;i>=0;i--){const s=G.hits[i];if(!s||!s.scroll||s.hidden)continue;
    if(p.x>=s.x&&p.x<=s.x+s.w&&p.y>=s.y&&p.y<=s.y+s.h){sreg=s;break}}
  if(sreg){const dy=e.deltaY;
    if(sreg.horiz){const dx=Math.abs(e.deltaX)>Math.abs(dy)?e.deltaX:dy;sreg.setOff(sreg.off()+dx)}
    else sreg.setOff(clamp(sreg.off()+dy,0,sreg.max()));
    e.preventDefault();e.stopPropagation()}
},{passive:false});
function endPointer(e){if(G.dragScroll){const ds=G.dragScroll;
    if(!ds.moved){ // a tap (not a drag): fire the region's own onTap AND any button it swallowed
      if(ds.h.tap)ds.h.tap();
      if(ds.pendBtn&&ds.pendBtn.cb)ds.pendBtn.cb()}
    if(ds.pendBtn)ds.pendBtn.active=false;
    G.dragScroll=null}
  if(G.pend&&G.pdown){const p=toDesign(e);const h=G.pend.h;if(p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h){if(!G.pdown.moved&&h.cb)h.cb()}G.pend=null}
  for(const h of G.hits)h.active=false;G.pdown=null}
cv.addEventListener('pointerup',endPointer);cv.addEventListener('pointercancel',endPointer);
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
function toastDraw(dt){let y=70;for(const t of G.toasts){t.t-=dt;const a=clamp(t.t,0,1);cx.globalAlpha=a;cx.font=FONT(17,700);const wd=cx.measureText(t.msg).width+44;cx.fillStyle='rgba(255,248,232,.95)';rr(cx,640-wd/2,y,wd,40,20);cx.fill();cx.strokeStyle=t.col;cx.lineWidth=2.5;rr(cx,640-wd/2,y,wd,40,20);cx.stroke();txt(cx,t.msg,640,y+20,17,shade(t.col,.62),'center',3,'#fff',700);y+=48;cx.globalAlpha=1}G.toasts=G.toasts.filter(t=>t.t>0)}
function modalDraw(){const m=G.modal;if(!m)return;cx.fillStyle='rgba(40,24,8,.6)';cx.fillRect(0,0,1280,720);
  const w=Math.min(760,1180),h=150+m.lines.length*30+(m.drawExtra?320:0);const x=640-w/2,y=360-h/2;
  creamPanel(x,y,w,h,'#c8913a');cx.lineWidth=4;cx.strokeStyle='#8a5a20';rr(cx,x,y,w,h,16);cx.stroke();
  txt(cx,m.title,640,y+40,24,'#e8951f','center',6,'#fff',700);
  m.lines.forEach((l,i)=>txt(cx,l,640,y+80+i*28,16,'#5a4530','center',3,'#fff',400));
  if(m.drawExtra)m.drawExtra(x,y+90+m.lines.length*28,w,Math.max(120,h-160-m.lines.length*28));
  const bw=Math.min(240,(w-40)/m.btns.length-12);let bx=640-(bw*m.btns.length+12*(m.btns.length-1))/2;
  m.btns.forEach((b,i)=>{BTN('mb'+i,bx,y+h-64,bw,46,()=>{const cb=b.cb;G.modal=null;cb&&cb()},{col:b.col||GOLD,outline:GOLDLN,label:b.n,fs:18,tcol:'#4a2f10'});bx+=bw+12})}

/* ============================== SCREEN: TITLE / HOME ============================== */
function drawTitle(dt){
  // orange sunset gradient like the original title
  const g=cx.createLinearGradient(0,0,0,720);g.addColorStop(0,'#ff9a00');g.addColorStop(.55,'#ffb31f');g.addColorStop(1,'#ffd23f');
  cx.fillStyle=g;cx.fillRect(0,0,1280,720);
  // sun rays
  cx.save();cx.translate(640,300);cx.globalAlpha=.08;cx.fillStyle='#fff';
  for(let i=0;i<12;i++){cx.rotate(TAU/12);cx.beginPath();cx.moveTo(0,0);cx.lineTo(900,-70);cx.lineTo(900,70);cx.closePath();cx.fill()}
  cx.restore();
  // cloud band + landmark silhouettes (simplified skyline) — clouds drift slowly
  cx.fillStyle='rgba(255,255,255,.85)';
  const cdrift=(off,sp)=>{let wx=(off-G.t*sp)%1600;if(wx<-260)wx+=1600;return wx};
  cloudDraw(cdrift(140,7),320,1.6);cloudDraw(cdrift(430,5),290,1.3);cloudDraw(cdrift(900,8),320,1.7);cloudDraw(cdrift(1150,4),300,1.2);
  // drifting cat-face hot-air balloon (subtle title charm) — kept above the logo so it never covers the wordmark
  {const bx=cdrift(1350,11),by=118+Math.sin(G.t*0.9)*12;
   cx.save();cx.translate(bx,by);cx.rotate(Math.sin(G.t*0.7)*0.06);
   cx.fillStyle='#e85840';cx.beginPath();cx.ellipse(0,0,26,30,0,0,TAU);cx.fill();
   cx.fillStyle='#ffd23f';cx.beginPath();cx.ellipse(0,0,26,30,0,0,Math.PI/2);cx.fill();
   cx.beginPath();cx.ellipse(0,0,26,30,0,-Math.PI/2,0);cx.fill();
   cx.lineWidth=2.5;cx.strokeStyle='#7a2a1c';cx.beginPath();cx.ellipse(0,0,26,30,0,0,TAU);cx.stroke();
   cx.strokeStyle='#7a2a1c';cx.lineWidth=1.5;
   cx.beginPath();cx.moveTo(-16,24);cx.lineTo(-8,40);cx.moveTo(16,24);cx.lineTo(8,40);cx.stroke();
   cx.fillStyle='#8a5a20';rr(cx,-9,40,18,12,3);cx.fill();
   cx.fillStyle='#fff';cx.beginPath();cx.arc(0,-2,11,0,TAU);cx.fill();
   cx.lineWidth=1.6;cx.strokeStyle='#3a3a44';cx.stroke();
   cx.fillStyle='#3a3a44';cx.beginPath();cx.arc(-4,-3,1.7,0,TAU);cx.arc(4,-3,1.7,0,TAU);cx.fill();
   cx.beginPath();cx.moveTo(-2.5,2);cx.lineTo(2.5,2);cx.lineTo(0,5);cx.closePath();cx.fill();
   cx.restore()}
  cx.fillStyle='rgba(120,80,20,.55)';
  // pagoda silhouette
  cx.beginPath();cx.moveTo(180,330);cx.lineTo(230,330);cx.lineTo(222,300);cx.lineTo(240,300);cx.lineTo(232,268);cx.lineTo(258,268);cx.lineTo(248,236);cx.lineTo(280,236);cx.lineTo(268,268);cx.lineTo(296,268);cx.lineTo(288,300);cx.lineTo(306,300);cx.lineTo(298,330);cx.lineTo(348,330);cx.closePath();cx.fill();
  // torii silhouette
  cx.fillRect(950,270,10,60);cx.fillRect(1010,270,10,60);cx.fillRect(938,262,94,10);cx.fillRect(946,276,78,8);
  //tokyo tower
  cx.beginPath();cx.moveTo(760,330);cx.lineTo(782,240);cx.lineTo(804,330);cx.closePath();cx.fill();
  // cat-head crowd bottom (the iconic Basic Cat faces)
  const headRows=[[710,46,1.2],[668,38,1.02],[696,32,.86]];
  headRows.forEach((row,ri)=>{const[y,step,sc]=row;
    for(let x=-20;x<1320;x+=step){const h=46*sc+(Math.sin(x*7.3+ri)*3);
      ART.catHead(x,y+h/2,h/2,false)}});
  // logo: per-letter bouncy "Battle" pink + paw + "Cats" orange w/ rim (original title signature)
  cx.save();cx.translate(640,215);
  cx.rotate(-0.04);
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
  // paw print tucked beside the “Cats” wordmark (a signature, not a smudge)
  cx.fillStyle='#2b2b33';cx.beginPath();cx.arc(252,52,11,0,TAU);cx.fill();
  [[240,40],[250,35],[261,40]].forEach(([tx,ty])=>{cx.beginPath();cx.arc(tx,ty+2,5,0,TAU);cx.fill()});
  cx.restore();
  // PLAY / SETTINGS pill buttons (PLAY pulses like the original)
  cx.save();cx.translate(640,384);const pulse=1+Math.sin(G.t*4)*0.022;cx.scale(pulse,pulse);
  cx.shadowColor='rgba(255,150,0,.6)';cx.shadowBlur=30;cx.fillStyle='rgba(255,210,63,.4)';rr(cx,-180,-46,360,92,46);cx.fill();cx.restore();
  const bw=330;
  BTN('play',640-bw/2,352,bw,64,()=>{SFX.click();push('home')},{col:'#ffd23f',outline:'#5a3b16',label:'PLAY',fs:34,r:32});
  txt(cx,'© PONOS Corp.',14,18,13,'rgba(90,60,20,.85)','left');
  txt(cx,'Version 12.6.0',1266,18,13,'rgba(90,60,20,.85)','right');

}

function drawHome(dt){bgSky();drawTopBar('');
  ensureMissions();
  const mDone=MISSIONS.filter(m=>missionDone(m.id)&&!missionClaimed(m.id)).length;
  const items=[['BATTLE','#ffd94a','swords',()=>{G.mapSub=0;push('chapters')}],['EQUIP / TEAMS','#7fd0ff','cat',()=>push('equip')],['IMPROVE CATS','#7fe8a0','up',()=>{G.selCat=null;push('upgrade')}],['GACHA','#ff9ad5','capsule',()=>push('gacha')],['TREASURES','#e8c37f','chest',()=>push('treasure')],['ENEMY GUIDE','#c9c9d6','doge',()=>push('guide')],['CAT BASE','#a0e8d0','cannon',()=>push('base')],['MISSIONS','#ffb060','scroll',()=>openMissionsModal()],['SETTINGS','#b8b8c8','gear',()=>push('settings')]];
  G.hits.push({id:'homescroll',x:20,y:200,w:600,h:466,scroll:true,off:()=>G.scrollHome,setOff:v=>G.scrollHome=v,max:()=>Math.max(0,items.length*74-466),cb:null});
  creamPanel(20,70,1240,120,'#c8913a');
  txt(cx,'THE BATTLE CATS',40,112,34,'#e8951f','left',6,'#fff',700);
  ART.cat({x:1170,y:130,s:1.15,id:'cat',t:G.t,e:{anim:'walk'}});
  // event + gacha banner chips (wiggle like original event tiles)
  try{
    const evs=eventStages();const ban=activeBanners();
    const chips=[];
    if(evs.length)chips.push(['EVENT',evs[0].s.name,'#e85840','#8a1a10']);
    if(ban.length)chips.push(['GACHA',ban[0].n,'#c86adf','#5a1a7a']);
    chips.forEach((ch,i)=>{
      const cw=222,cxh=80,bx=790+i*234,by=110+Math.sin(G.t*2.4+i*1.7)*4;
      cx.save();cx.translate(bx,by);cx.rotate(Math.sin(G.t*1.8+i*2.1)*0.035);
      cx.shadowColor='rgba(0,0,0,.3)';cx.shadowBlur=6;cx.shadowOffsetY=3;
      cx.fillStyle=ch[2];rr(cx,-cw/2,-cxh/2,cw,cxh,12);cx.fill();cx.shadowColor='transparent';
      cx.lineWidth=2.5;cx.strokeStyle=ch[3];rr(cx,-cw/2,-cxh/2,cw,cxh,12);cx.stroke();
      cx.fillStyle='#fff8e8';rr(cx,-cw/2+8,-cxh/2+28,cw-16,cxh-38,8);cx.fill();
      txt(cx,ch[0],0,-cxh/2+15,11,'#fff','center',3,ch[3],700);
      txt(cx,ch[1],0,6,ch[1].length>16?12:14,ch[3],'center',3,'#fff',700);
      txt(cx,i===0?'Limited time!':'Now summoning!',0,cxh/2-10,9.5,'rgba(255,255,255,.85)','center',2,ch[3],700);
      cx.restore()});
  }catch(e){}
  const ih=64,gap=10,x=40;let y=210;
  items.forEach((it,i)=>{const w=560;BTN('hm'+i,x,y-G.scrollHome,w,ih,it[3],{col:'#fffdf5',outline:'#a8845a',r:16,draw:(c,hov)=>{
    if(hov){c.fillStyle='rgba(255,200,90,.22)';rr(c,0,0,w,ih,16);c.fill()}
    c.fillStyle=it[1];c.beginPath();c.arc(34,32,19,0,TAU);c.fill();c.lineWidth=2.5;c.strokeStyle='#5a3b16';c.stroke();
    glyph(c,it[2],34,32,10.5,'#fff','#5a3b16');
    txt(c,it[0],68,33,23,'#5a3b16','left',3,'#fff',700);
    if(it[0]==='MISSIONS'&&mDone>0){const bw2=26;cx.save();c.translate(w-24,14);c.rotate(Math.sin(G.t*5)*0.12);
      c.fillStyle='#e84030';c.beginPath();c.arc(0,0,bw2/2,0,TAU);c.fill();c.lineWidth=2;c.strokeStyle='#7a1a10';c.stroke();
      txt(c,String(mDone),0,0.5,13,'#fff','center',2,'#7a1a10',700);c.restore()}}});y+=ih+gap});
  creamPanel(640,210,600,440);
  txt(cx,'CATALOG',660,240,20,'#b06a10','left',4,'#fff',700);
  const owned=CATS.filter(c=>catOwned(c.id)).length;
  const lines=[['Cats owned:',owned+' / '+CATS.length],['Forms maxed:',CATS.filter(c=>catOwned(c.id)&&catFormUnlockedCount(c.id)>=c.forms.length).length+' / '+CATS.reduce((a,c)=>a+c.forms.length,0)],['Chapters cleared:',Object.keys(SV.cleared).length+' / '+CHAPTERS.length],['User Rank:',SV.rank+'  (XP total '+fmt(SV.xpTotal)+')'],['NP:',fmt(SV.np)],['Cat Food:',fmt(SV.cf)],['Tickets:','R:'+SV.tickets.rare+' G:'+SV.tickets.gold+' P:'+SV.tickets.plat],['Catfruit:',Object.entries(SV.fruit).filter(([,v])=>v).map(([k,v])=>k[0].toUpperCase()+':'+v).join(' ')||'\u2014']];
  lines.forEach((l,i)=>{txt(cx,l[0],660,278+i*34,15,'#8a7a5a','left');txt(cx,String(l[1]),1220,278+i*34,16,'#4a3a24','right')});
  const done=CATS.filter(c=>catOwned(c.id));
  cx.strokeStyle='rgba(176,138,80,.5)';cx.lineWidth=1.5;cx.beginPath();cx.moveTo(660,540);cx.lineTo(1220,540);cx.stroke();
  txt(cx,'YOUR CATS',660,556,11,'#a89878','left',2,'#fff',700);
  let bx=660,by=600;
  done.slice(0,13).forEach(c=>{ART.catIcon(c.id,bx,by,20);bx+=42});
  if(owned>13)txt(cx,'+'+(owned-13)+' more',bx+6,by,12,'#a89878','left');brownBottomBar()}

/* ============================== MODAL: DAILY MISSIONS ============================== */
function openMissionsModal(){ensureMissions();SFX.click();
  openModal('DAILY MISSIONS \u2014 '+new Date().toLocaleDateString('en-US',{weekday:'long'}),[],[{n:'CLOSE',cb:()=>{}}],(mx,my,mw,mh)=>{
    // rank-tier badge: goals & rewards scale every 10 User Ranks
    const tier=missionTier();
    cx.save();cx.translate(mx+mw/2,my+mh-58);
    cx.fillStyle=tier>0?'#e8951f':'#c8b890';rr(cx,-118,-14,236,28,14);cx.fill();cx.lineWidth=2.5;cx.strokeStyle=tier>0?'#8a5210':'#8a7a5a';rr(cx,-118,-14,236,28,14);cx.stroke();
    txt(cx,tier>0?('RANK TIER '+tier+' \u2014 GOALS \u00d7'+(1+tier*0.5)+' \u00b7 CF \u00d7'+(1+tier*0.25).toFixed(2)):'RANK TIER 1 \u2014 scale up every 10 ranks',0,0.5,10.5,tier>0?'#fff':'#6a5a42','center',2,tier>0?'#7a4a08':'#fff',700);
    cx.restore();
    MISSIONS.forEach((m,i)=>{const y=my+i*74;const done=missionDone(m.id),cl=missionClaimed(m.id);const goal=missionGoal(m),cf=missionCF(m);
      creamPanel(mx+10,y,mw-20,66,cl?'#9ab88a':'#c8913a');
      cx.save();cx.translate(mx+42,y+33);
      cx.fillStyle=done?'#7fc86a':'#d8c8a0';cx.beginPath();cx.arc(0,0,20,0,TAU);cx.fill();cx.lineWidth=3;cx.strokeStyle=done?'#3a7a2a':'#a89a78';cx.stroke();
      glyph(cx,m.icon,0,0,11,done?'#1e4a14':'#6a5a3a',done?'#7fc86a':'#d8c8a0');cx.restore();
      txt(cx,m.n.replace(/\d+/,String(goal)),mx+76,y+22,15.5,'#5a3b16','left',3,'#fff',700);
      txt(cx,'Reward: '+cf+' Cat Food'+(tier>0?' (scaled)':''),mx+76,y+46,12,'#8a7a5a','left');
      // progress pips
      for(let k=0;k<goal;k++){cx.fillStyle=k<(SV.missions[m.id]||0)?'#e8a020':'#d8ccb0';rr(cx,mx+290+k*20,y+40,14,14,4);cx.fill();cx.lineWidth=1.5;cx.strokeStyle='#a8845a';rr(cx,mx+290+k*20,y+40,14,14,4);cx.stroke()}
      if(cl){cx.fillStyle='#e8f4e0';rr(cx,mx+mw-150,y+18,120,30,15);cx.fill();cx.lineWidth=2;cx.strokeStyle='#5a8a4a';rr(cx,mx+mw-150,y+18,120,30,15);cx.stroke();
        txt(cx,'\u2714 CLAIMED',mx+mw-90,y+34,13,'#3a7a2a','center',2,'#fff',700)}
      else if(done)BTN('mclaim'+m.id,mx+mw-150,y+18,120,30,()=>{claimMission(m.id)},{col:'#ffd23f',outline:'#8a5a20',label:'CLAIM +'+cf,fs:12,r:15,modal:true});
      else txt(cx,'In progress\u2026',mx+mw-90,y+34,12.5,'#a89878','center',2,'#fff',700)});
    txt(cx,'Missions reset daily. Higher User Rank = bigger goals & rewards. Streak logins in the Store for bigger daily bonuses!',mx+mw/2,my+mh-14,12,'#a89878','center',2,'#fff',400)})}

/* ============================== MODAL: COMBO DETAIL (tap a combo tile) ============================== */
function openComboDetail(cb){SFX.click();
  const effLine=Object.entries(cb.eff).map(([k,v])=>EFF_LABEL[k](v)).join('  \u00b7  ');
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
      if(on)txt(cx,'\u2714 TEAM',x+tileW/2,y+110,9.5,'#3a7a2a','center',2,'#fff',700);
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
  groups.forEach(([kind,label])=>{
    txt(cx,label,24,y+G.scrollChap,14,'#7a5a2a','left');y+=26;
    CHAPTERS.filter(c=>c.kind===kind).forEach(c=>{
      const unl=chapterUnlocked(c.id);const yy=y+G.scrollChap;
      const clearedN=c.kind==='story'?Object.keys(SV.cleared[c.id]||{}).length:0;
      // white panel with border
      cx.save();cx.translate(20,yy);
      cx.fillStyle=unl?'#ffffff':'#d8cfb8';rr(cx,0,0,1240,60,12);cx.fill();
      cx.lineWidth=unl?3:2;cx.strokeStyle=unl?'#3a3a44':'#a89a78';rr(cx,1.5,1.5,1237,57,12);cx.stroke();
      if(unl)BTN('ch'+i,20,yy,1240,60,()=>{G.chapter=c.id;G.mapSub=0;push('map');SFX.click()},{flat:true,nohov:true});
      cx.globalAlpha=unl?1:.55;
      if(c.id==='eoc1')ART.catIcon('cat',36,30,17);else if(c.id==='itf1')ART.catIcon('lizard',36,30,17);else if(c.id==='cotc1')ART.catIcon('gao',36,30,17);else if(c.kind==='sol')ART.catIcon('gross',36,30,17);else if(c.kind==='ul')ART.catIcon('luza',36,30,17);else if(c.kind==='aku')ART.enemyIcon('akumother',36,30,17);else if(c.kind==='dojo')ART.catIcon('kungfu',36,30,17);else ART.catIcon('mr',36,30,17);
      txt(cx,c.n,66,24,19,unl?'#e8a020':'#8a8272','left',4,'#fff',700);
      txt(cx,c.desc||'',66,44,13,'#8a7a5a','left');
      txt(cx,unl?(clearedN?(c.kind==='story'?clearedN+'/48 cleared':''):''):'',1128,20,13,'#8a7a5a','right');
      if(unl&&c.kind==='story'){ // crown total chip (sum of stage crowns /144) + completion progress bar
        const crc=SV.crowns[c.id]||{};let cn=0;for(const k in crc)cn+=crc[k];
        crownDraw(cx,1158,19,8.5,'#ffd23f','#8a5a10',cn===0);
        txt(cx,cn+'/144',1240,20,13,'#b08028','right',2,'#fff',700);
        const pn=clearedN/48;
        cx.fillStyle='rgba(90,59,22,.16)';rr(cx,930,42,240,10,5);cx.fill();
        if(pn>0){cx.fillStyle=pn>=1?'#5aa84a':'#e8951f';rr(cx,930,42,Math.max(9,240*pn),10,5);cx.fill()}
        cx.lineWidth=1.5;cx.strokeStyle='rgba(90,59,22,.4)';rr(cx,930,42,240,10,5);cx.stroke();
        txt(cx,Math.round(pn*100)+'%',1204,47.5,11,clearedN?'#8a6a3a':'#b8a884','right',2,'#fff',700)}
      if(!unl)txt(cx,'Locked',1216,30,14,'#a89a78','right');
      cx.globalAlpha=1;cx.restore();y+=66;i++});
    y+=14});brownBottomBar()
}

function drawMap(dt){const c=CHMAP[G.chapter];
  /* ================= STAGE-SELECT MAP — official parchment composition (R1/R2/sol_a) ================= */
  drawTopBar(c.kind==='story'?'Stage Select':c.n,false);
  cx.fillStyle='#4a3319';cx.fillRect(0,54,1280,666); // dark wood backboard behind the map
  // ---- node layout: precomputed serpentine with per-stage jitter (deterministic per chapter) ----
  const kinds={story:{n:48,cols:6},sol:{n:SOL_SUBS.length,cols:6},ul:{n:UL_SUBS.length,cols:5},aku:{n:13,cols:5},dojo:{n:15,cols:5},event:{n:Math.max(1,G.lastEvents.length),cols:3}};
  const K=kinds[c.kind]||kinds.story;
  let seed=0;for(const ch of c.id)seed=(seed*31+ch.charCodeAt(0))>>>0;
  const cols=K.cols,sx=228,sy=172,x0=210,y0=180;
  const R=rnd(seed);
  const pts=[];
  for(let i=0;i<K.n;i++){const row=Math.floor(i/cols),k=i%cols;const col=(row%2===0)?k:(cols-1-k);
    pts.push({x:x0+col*sx+(R()-0.5)*54,y:y0+row*sy+(R()-0.5)*44})}
  const mapW=Math.max(1280,x0+(cols-1)*sx+230),mapH=Math.max(660,y0+Math.ceil(K.n/cols)*sy+130);
  const tint=c.kind==='aku'?'rgba(84,24,100,.20)':c.kind==='event'?'rgba(255,168,64,.12)':c.kind==='dojo'?'rgba(120,72,26,.14)':'';
  const scene=parchScene(Math.round(mapW),Math.round(mapH),tint);
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
  // ---- camera: focus the current node, clamp, drag-to-pan both axes ----
  if(G.mapFor!==c.id||!G.mapCam){const f=nodes.find(n=>n.cur)||nodes[0];
    G.mapCam={x:clamp(f.p.x-624,0,Math.max(0,mapW-1248)),y:clamp(f.p.y-330,0,Math.max(0,mapH-634))};G.mapFor=c.id}
  G.mapCam.x=clamp(G.mapCam.x,0,Math.max(0,mapW-1248));G.mapCam.y=clamp(G.mapCam.y,0,Math.max(0,mapH-634));
  if(G.pdown&&!G.mapDrag)G.mapDrag={sx:G.pdown.x,sy:G.pdown.y,cx:G.mapCam.x,cy:G.mapCam.y};
  if(!G.pdown)G.mapDrag=null;
  G.onDrag=(p,pd)=>{if(!G.mapDrag)return;const dx=p.x-G.mapDrag.sx,dy=p.y-G.mapDrag.sy;
    if(!pd.moved&&Math.abs(dx)+Math.abs(dy)>7)pd.moved=true;
    if(pd.moved){G.mapCam.x=clamp(G.mapDrag.cx-dx,0,Math.max(0,mapW-1248));G.mapCam.y=clamp(G.mapDrag.cy-dy,0,Math.max(0,mapH-634))}};
  // ---- parchment scene ----
  cx.save();cx.beginPath();cx.rect(16,70,1248,634);cx.clip();
  cx.drawImage(scene.cv,16-G.mapCam.x,70-G.mapCam.y);
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
    if(nd.unl&&nd.tap)BTN('nd'+c.kind+i,bx-6,by-8,bW+12,bH+34,()=>{if(!G.pdown||!G.pdown.moved)nd.tap()},{flat:true,nohov:true});
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
    // Energy -N (cyan number, white outline)
    const eLbl='Energy -'+nd.energy;
    cx.font=FONT(12.5,700);const ew=cx.measureText(eLbl).width;
    const exs=bx+bW/2-ew/2;
    txt(cx,eLbl,exs,by+bH+13,12.5,'#e8fdff','left',3,'rgba(30,40,50,.85)',700);
    txt(cx,String(nd.energy),exs+cx.measureText('Energy -').width,by+bH+13,12.5,'#54e0f0','left',3,'rgba(30,40,50,.85)',700);
    // crown pips row (story stages): earned gold / unearned dim — replays can top them up
    if(c.kind==='story'&&nd.done){const cn=(SV.crowns[c.id]&&SV.crowns[c.id][String(i)])||0;
      for(let k=0;k<3;k++)crownDraw(cx,bx+bW/2-17+k*17,by+bH+28,5.5,k<cn?'#ffd23f':'#c8bca0',k<cn?'#8a5a10':'#8a7a5a',k>=cn)}
    if(!nd.unl)drawPadlock(cx,bx+bW-14,by+bH/2,7,'#8f887a');
    cx.restore()}
  // white cat marker stands on the current node
  if(markerNode)catMarker(cx,markerNode.p.x,markerNode.p.y-16,30,G.t);
  cx.restore(); // un-clip + un-translate
  // ---- dark wood frame around the map ----
  woodFrame(0,54,1280,666,16);
  // progress label (story)
  if(c.kind==='story'){const last=lastClearedIdx(c)+1;
    cx.fillStyle='rgba(255,248,232,.9)';rr(cx,1108,86,150,30,15);cx.fill();
    cx.lineWidth=2.5;cx.strokeStyle='#8a5a20';rr(cx,1108,86,150,30,15);cx.stroke();
    txt(cx,Math.min(last,48)+' / 48 CLEARED',1183,101.5,13,'#8a5a10','center',3,'#fff',700)}
  // ---- chapter cycle arrows on the frame (official side arrows) ----
  const chIdx=CHAPTERS.indexOf(c);
  const cyc=dir=>{for(let k=1;k<=CHAPTERS.length;k++){const nc=CHAPTERS[(chIdx+dir*k+CHAPTERS.length*2)%CHAPTERS.length];
    if(chapterUnlocked(nc.id)){G.chapter=nc.id;G.mapFor=null;SFX.click();break}}};
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
    cx.fillStyle='rgba(38,24,10,.92)';rr(cx,30,540,438,116,12);cx.fill();
    cx.lineWidth=2.5;cx.strokeStyle='#c8913a';rr(cx,31.5,541.5,435,113,11);cx.stroke();
    txt(cx,'DOJO RECORD',52,562,12,'#e8c890','left',2.5,'#1c1006',700);
    txt(cx,'Best: '+(SV.dojoBest||0)+'  \u00b7  survive escalating waves',52,582,12.5,'#ffd23f','left',3,'#1c1006',700);
    const medal=['#cd7f32','#c0c0c0','#ffd700'];
    if((SV.dojoBoard||[]).length)(SV.dojoBoard||[]).forEach((e2,i2)=>{const chx=58+i2*140;
      cx.fillStyle=medal[i2]||'#8a7a5a';star(cx,chx,606,7,3.5);cx.fill();cx.strokeStyle='#1c1006';cx.lineWidth=1.4;cx.stroke();
      txt(cx,'#'+(i2+1)+' '+e2.s,chx+12,606,12,'#fff','left',2.5,'#1c1006',700);
      txt(cx,e2.d,chx+12,622,9,'#a89878','left',2,'#1c1006',400)});
    else txt(cx,'Enter Endless grading to set your first score!',52,610,11.5,'#c8b890','left',2.5,'#1c1006',400);
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
  openModal(st.name,[
    'Energy cost: '+st.energy+'   (you have '+SV.energy+')',
    'Enemy base HP: '+fmt(st.baseHp),
    'Power: HP \u00d7'+st.mag.hp.toFixed(2)+'  ATK \u00d7'+st.mag.atk.toFixed(2),
    'Enemies: '+([...new Set(en)].map(e=>ENEMAP[e].n).join(', ')||'\u2014'),
    'Reward: '+fmt(st.reward.xp)+' XP'+(st.reward.fruit?' + '+FRUIT_NAMES[st.reward.fruit]:'')+(st.reward.cf?' + '+st.reward.cf+' CF':''),
    ...(c.kind==='story'?['Crowns: '+crownsN+'/3 \u2014 win with base HP \u226580% for a PERFECT 3-crown clear!']:[]),
    ...(CHSETS[ch]?['Treasure chance: ~'+Math.round(treasureChance(ch,idx,tCount(ch,idx%9))*100)+'% \u2014 farmable on repeat clears!']:[])],
    [{n:'Cancel',cb:()=>{}},{n:'Attack!',col:'#ffd23f',cb:()=>tryStartBattle(ch,idx)}],(x,y,w,h)=>{
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
        const tl=e.tr.length?e.tr.map(t2=>t2.toUpperCase()).join('\u00b7'):'TRAITLESS';
        txt(cx,tl,ex+tw/2,ey+56,6.8,shade(tc,.6),'center',2,'#fff',700);
        if(e.boss){cx.save();cx.translate(ex+tw/2,ey-1);cx.rotate(-0.08);cx.fillStyle='#e84030';rr(cx,-21,-8,42,15,4);cx.fill();txt(cx,'BOSS',0,-0.5,9,'#fff','center',2,'#7a1a10',700);cx.restore()}});
      if(uni.length>6)txt(cx,'+'+(uni.length-6)+' more',x+w/2,y+yOff+112,11,'#a89878','center',2,'#fff',400);
      else if(!uni.length)txt(cx,'No enemies \u2014 destroy the base!',x+w/2,y+yOff+60,12,'#a89878','center',2,'#fff',400)})}

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
        const tl=e.tr.length?e.tr.map(t2=>t2.toUpperCase()).join('\u00b7'):'TRAITLESS';
        txt(cx,tl,ex+tw/2,ey+56,6.8,shade(tc,.6),'center',2,'#fff',700);
        if(e.boss){cx.save();cx.translate(ex+tw/2,ey-1);cx.rotate(-0.08);cx.fillStyle='#e84030';rr(cx,-21,-8,42,15,4);cx.fill();txt(cx,'BOSS',0,-0.5,9,'#fff','center',2,'#7a1a10',700);cx.restore()}});
      if(uni.length>6)txt(cx,'+'+(uni.length-6)+' more',x+w/2,y+108,11,'#a89878','center',2,'#fff',400);
      else if(!uni.length)txt(cx,'No enemies \u2014 destroy the base!',x+w/2,y+56,12,'#a89878','center',2,'#fff',400);
      // stat strip: base HP + magnification
      txt(cx,'Enemy base HP '+fmt(s.baseHp)+'   \u00b7   Power HP \u00d7'+s.mag.hp.toFixed(1)+' / ATK \u00d7'+s.mag.atk.toFixed(1),x+w/2,y+138,12.5,'#8a6a3a','center',3,'#fff',400);
      // rewards ribbon
      const ry=y+h-38;cx.fillStyle='rgba(255,244,214,.85)';rr(cx,x+16,ry,w-32,30,9);cx.fill();
      cx.lineWidth=1.5;cx.strokeStyle='rgba(176,138,80,.5)';rr(cx,x+16,ry,w-32,30,9);cx.stroke();
      let rtxt='Reward: '+fmt(s.reward.xp)+' XP';let rcol='#b06a10';
      if(s.reward.fruit){rtxt+='  \u00b7  Catfruit: '+FRUIT_NAMES[s.reward.fruit];rcol=shade(FRUIT_COL[s.reward.fruit],.7)}
      if(s.reward.ticket)rtxt+='  \u00b7  Rare Ticket chance!';
      txt(cx,rtxt,x+w/2,ry+15.5,12.5,rcol,'center',3,'#fff',700)})}
function tryStartBattle(ch,idx){const st=idx>=0?genStage(ch,idx):(G.pendingEvent?G.pendingEvent.s:null);if(!st)return;
  if(SV.energy<st.energy){toast('Not enough energy! ('+SV.energy+'/'+st.energy+')','#ff7a7a');SFX.error();return}
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
  const cbt=actCbs.length?actCbs.map(cb=>cb.n).join(' \u00b7 ')+' ('+actCbs.map(cb=>Object.entries(cb.eff).map(([k,v])=>EFF_LABEL[k](v)).join(', ')).join(' | ')+')':'No active combos';
  txt(cx,cbt.length>118?cbt.slice(0,117)+'\u2026':cbt,352,18,12,actCbs.length?'#8a5a10':'#5a7a8a','left',3,'#fff',700);
  txt(cx,'Tap a card to fill the first empty slot \u00b7 tap card or its slot again to remove',352,38,11.5,'#3a6a84','left',2.5,'#fff',400);
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
        txt(cx,Object.entries(cb.eff).map(([k,v])=>EFF_LABEL[k](v)).join('  \u00b7  '),tx0,y+40,12,own?'#4a3a24':'#b0a488','left',2,'#fff',400);
        if(on){cx.fillStyle='#e8951f';rr(cx,mx+mw-108,y+14,86,26,13);cx.fill();txt(cx,'\u2714 IN USE',mx+mw-65,y+27.5,11.5,'#fff','center',2,'#7a4a08',700)}
        else if(own){cx.fillStyle='#e8f4e0';rr(cx,mx+mw-108,y+14,86,26,13);cx.fill();cx.lineWidth=1.5;cx.strokeStyle='#5a8a4a';rr(cx,mx+mw-108,y+14,86,26,13);cx.stroke();txt(cx,'READY',mx+mw-65,y+27.5,11.5,'#3a7a2a','center',2,'#fff',700)}
        else{const miss=cb.ids.filter(i2=>!catOwned(i2)).length;txt(cx,miss+' cat'+(miss>1?'s':'')+' missing',mx+mw-65,y+27.5,10.5,'#b0a488','center',2,'#fff',400)}}})});
    cx.restore()})},{col:'#ffd23f',outline:'#8a5a20',label:'ALL COMBOS \u25b8',fs:12,r:10,tcol:'#4a2f10'});
  // slots mini-row
  txt(cx,'Slots '+teamIds2.length+'/10',1150,14,13,'#2a5a74','center',3,'#fff',700);
  txt(cx,SV.teamSel===0?'Team I':SV.teamSel===1?'Team II':'Team III',1150,40,10.5,'#3a6a84','center',2.5,'#fff',700);
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
  txt(cx,'XP',xLabR,24,15,'#37b6ff','right',4,'rgba(10,20,30,.85)',700);
  cx.font=FONT(12.5,700);const cfw=cx.measureText(fmt(SV.cf)).width+42;
  const pillR=xLabR-22-8; // CF pill ends 8px left of the XP label start (≥4px required gap)
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
    if(fc)for(const k in fc){const have=SV.fruit[k]||0;if(have<fc[k]){canFruit=false;fruitMiss.push((fc[k]-have)+'\u00d7 '+FRUIT_NAMES[k])}fcTxt.push(FRUIT_NAMES[k].replace(' Catfruit','')+' '+have+'/'+fc[k])}}
  const evoReady=canLv&&canFruit; // gated unless the level rule AND the catfruit cost are satisfied
  const evoDone=evoReady; // "ready — tap EVOLVE!" tip must agree with the actual button gate
  if(nextFi<c.forms.length){
    const gateTxt=!canLv?('Need Lv.'+need+(fruitMiss.length?' \u00b7 Need '+fruitMiss.join(', '):''))
      :fruitMiss.length?('Need '+fruitMiss.join(', ')):'';
    BTN('evo',570,412,420,74,()=>{
      if(!canLv){toast('Need level '+need+' first!','#ff7a7a');SFX.error();return}
      if(!canFruit){toast('Not enough Catfruit! Need '+fruitMiss.join(', '),'#ff7a7a');SFX.error();return}
      const fc=(FRUIT_COST[c.rarity]||{})[nextFi];if(fc)for(const k in fc)SV.fruit[k]-=fc[k];
      SV.cats[c.id]['ev'+nextFi]=true;persist();SFX.win2();toast('EVOLVED \u2192 '+c.forms[nextFi].n+'!','#7fe8a0')},{flat:true,r:14,draw:cc=>{
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
   const abilLine=form.abil.length?'ABILITIES: '+form.abil.map(a=>abilStr(a)).join(' \u00b7 '):'A dependable all-rounder \u2014 no special abilities.';
   txt(cx,abilLine,640,py+27,14,'#fff','center',3,'rgba(0,0,0,.55)');
   txt(cx,c.rarity.toUpperCase()+' \u00b7 Form '+(fi+1)+'/'+c.forms.length+' \u00b7 HP '+fmt(s.hp)+' \u00b7 ATK '+fmt(s.atk)+' \u00b7 Cost '+s.cost+'\u00a2 \u00b7 Range '+s.range+' \u00b7 '+s.rate+'s per hit',640,py+53,12.5,'#e8d8b8','center',2.5,'rgba(0,0,0,.5)');
   let l3='';
   if(nextFi<c.forms.length)l3=evoDone?'Next form \u201c'+c.forms[nextFi].n+'\u201d is ready \u2014 tap EVOLVE!':'Next form: '+c.forms[nextFi].n+' \u2014 needs Lv '+need+(fcTxt.length?' + '+fcTxt.join(', '):'');
   else l3='All forms unlocked \u00b7 plus levels come from duplicate Cats in the Gacha';
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
        if(SV.np>=cost){SV.np-=cost;SV.np2[c.id]=SV.np2[c.id]||{};SV.np2[c.id][i]=tl+1;persist();SFX.up();openTalentsModal(c)}
        else{toast('Not enough NP!','#ff7a7a');SFX.error()}},{col:'#8a4adf',tcol:'#fff',label:cost+' NP',fs:13,r:9,modal:true});
      else txt(cx,'MAX',mx+mw-110,y-2,12,'#a89878','right')})})}
function abilStr(a){const D={kb:'Knockback',freeze:'Freeze',slow:'Slow',weaken:'Weaken',crit:'Critical Hit',savage:'Savage Blow',wave:'Wave Attack',surge:'Surge',toxic:'Toxic',dodge:'Dodge',warp:'Warp',curse:'Curse',barrierBreak:'Barrier Break',shieldPierce:'Shield Pierce',resist:'Resist',strengthen:'Strengthen',base:'Base Destroyer'};
  let s=D[a.a]||a.a;if(a.a==='strengthen')s+=' (ATK \u00d7'+(1+(a.p||2))+' at half HP)';
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
  // === 'Ends in N days' chip + (i) rates button, top-right corner ===
  cx.fillStyle='rgba(20,12,30,.55)';rr(cx,1096,86,148,28,14);cx.fill();
  txt(cx,'Ends in 3 days',1170,100.5,12.5,'#fff','center',2.5,'#1a0e20',700);
  cx.fillStyle='#3a9a5a';cx.beginPath();cx.arc(1246,72,16,0,TAU);cx.fill();
  cx.lineWidth=2.5;cx.strokeStyle='#1e5a30';cx.stroke();
  txt(cx,'i',1246,73,17,'#fff','center',3,'#1e5a30',700);
  BTN('ginfo',1226,52,40,40,()=>{SFX.click();openGachaInfo(b)},{flat:true,nohov:true});
  // === pull buttons: big yellow official-style pair below the machine ===
  const canTicket=SV.tickets.rare>0,can1=canTicket||SV.cf>=b.cost,can10=SV.cf>=b.cost10;
  const step=(SV.gachaSteps&&SV.gachaSteps[b.id])||0;
  // pity step pill (pulls since last featured-ish result, /10)
  cx.fillStyle='rgba(20,12,30,.55)';rr(cx,208,586,142,44,22);cx.fill();
  cx.fillStyle=b.cap;cx.beginPath();cx.arc(232,608,11,0,TAU);cx.fill();
  cx.fillStyle=b.col;cx.beginPath();cx.arc(232,608,11,Math.PI,0);cx.fill();
  txt(cx,step+' / 10',252,609,17,'#fff','left',3,'#1a0e20',700);
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
    txt(cx,'Guaranteed Uber! \u00d7'+SV.tickets.gold,1055,618,14,'#fff','center',3,'#7a4a08',700);
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
  drawArrow(190,330,-1,'garrL');drawArrow(1090,330,1,'garrR');
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
  openModal(b.n,[
    b.pool==='rare'?'Rates: 89% Rare / 9% SR / 2% Uber':b.pool==='legend'?'Rates: 3% Legend / 27% Uber / 68% Rare+':'Rates: 9% Uber / 23% SR / 68% Rare+',
    'Featured: '+(b.feat.map(f=>CATMAP[f].forms[0].n).join(', ')||'\u2014'),
    'Featured cats have a boosted 25% appearance chance!',
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
  const feat=(B&&B.feat||[]).map(f=>CATMAP[f]).filter(c=>c&&(c.rarity==='uber'||c.rarity==='legend'));
  let pool=feat.length?feat.concat(ubers,legends):ubers.concat(legends); // featured weighted by presence
  if(!pool.length)pool=ubers.length?ubers:legends; // null-safe fallbacks (same policy as rollGacha)
  if(!pool.length){toast('No Uber pool available!','#ff7a7a');return}
  const R=rnd((now()+((Math.random()*4294967296)>>>0))>>>0);
  const id=pick(pool,R).id;
  SV.tickets.gold--; // consume exactly one gold ticket, then persist BEFORE the reveal
  if(SV.missions)SV.missions.pull=(SV.missions.pull||0)+1;
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
  // chapter tabs
  chs.forEach((c,i)=>{const x=20+i*138;BTN('tch'+i,x,64,132,44,()=>{G.tChap=c.id;SFX.click()},{col:G.tChap===c.id?'#ffd23f':'#fffdf5',outline:'#5a3b16',label:c.n.replace('Empire of Cats: ','EoC ').replace('Into the Future: ','ItF ').replace('Cats of the Cosmos: ','CotC '),fs:11.5,r:10,disabled:!chapterUnlocked(c.id)})});
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
  }
  txt(cx,'Total attack multiplier: ×'+treasureMult('atk').toFixed(2)+'  ·  HP ×'+treasureMult('hp').toFixed(2)+'  ·  Wallet ×'+treasureMult('wallet').toFixed(2),640,650,14,'#ffe9b0','center',3,'#5a3b16',700);
  brownBottomBar()}

/* ============================== SCREEN: ENEMY GUIDE ============================== */
function drawGuide(dt){drawTopBar('ENEMY GUIDE — BESTIARY',true);
  parchBody();
  const seen=ENEMIES.filter(e=>SV.bestiary[e.id]);
  txt(cx,'Discovered '+seen.length+' / '+ENEMIES.length+' enemies. Encounter enemies in battle to register them!',20,80,13,'#8a6a3a','left',3,'#fff',400);
  const eList=ENEMIES;const perRow=10;const cw=118,ch=132;
  SCROLL('gd',0,94,1280,572,()=>G.scrollList,v=>G.scrollList=v,Math.max(0,Math.ceil(eList.length/perRow)*(ch+6)-566));
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

/* ============================== SCREEN: SETTINGS ============================== */
/* Builder C owns this function (Task 6): file export/import with real controls, hidden
   textarea paste overlay (helpers live in savesys.js), storage info + failure banner,
   double-confirm reset, dev-gated DEMO BOOST. */
function drawSettings(dt){drawTopBar('SETTINGS',true);
  parchBody();
  creamPanel(240,90,800,540,'#c8913a');
  BTN('sbgm',280,130,340,60,()=>{SV.settings.bgm=!SV.settings.bgm;persist();AudioSetBgm(SV.settings.bgm)},{col:SV.settings.bgm?'#7fe8a0':'#e8d8b0',outline:'#8a5a20',label:'BGM: '+(SV.settings.bgm?'ON':'OFF'),fs:18});
  BTN('ssfx',660,130,340,60,()=>{SV.settings.sfx=!SV.settings.sfx;persist()},{col:SV.settings.sfx?'#7fe8a0':'#e8d8b0',outline:'#8a5a20',label:'SFX: '+(SV.settings.sfx?'ON':'OFF'),fs:18});
  // ---- export: proper panel — download a file OR copy the clipboard code ----
  BTN('sexp',280,220,340,60,()=>{openModal('EXPORT SAVE',['Back up your progress: download a save file,','or copy a restore code to the clipboard.'],[
    {n:'DOWNLOAD FILE',col:'#7fd0ff',cb:()=>{downloadSaveFile()}},
    {n:'COPY CODE',cb:()=>{try{navigator.clipboard.writeText(exportSave()).then(()=>toast('Save code copied!'),()=>toast('Copy blocked — use Download file','#ff7a7a'))}catch(e){toast('Copy blocked — use Download file','#ff7a7a')}}},
    {n:'CLOSE',cb:()=>{}}],(x,y,w,h)=>{
      cx.fillStyle='#101218';rr(cx,x+20,y+10,w-40,92,10);cx.fill();
      const s=exportSave();cx.font='11px monospace';cx.textAlign='left';cx.textBaseline='top';
      cx.fillStyle='#e8e8f0';cx.fillText(s.slice(0,58),x+34,y+24);cx.fillText(s.slice(58,116)+'…',x+34,y+40);
      cx.fillStyle='#8a92a8';const d=new Date();const ds=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
      cx.fillText('file: battle-cats-save-'+ds+'.txt  ·  pasted codes are accepted too',x+34,y+72)})},{col:'#ffd94a',outline:'#8a5a20',label:'EXPORT SAVE',fs:17});
  // ---- import: file picker + real in-canvas paste entry (hidden DOM textarea overlay) ----
  BTN('simp',660,220,340,60,()=>{
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
  BTN('sreset',280,310,340,60,()=>{openModal('RESET GAME?',['This deletes ALL progress permanently!'],[
    {n:'DELETE ALL',col:'#ff5a5a',cb:()=>{openModal('FINAL CONFIRM',['Every cat, XP, treasure and clear will be','wiped from this browser. There is no undo.'],[
      {n:'YES — WIPE SAVE',col:'#ff5a5a',cb:()=>{localStorage.removeItem(SAVE_KEY);loadSave();toast('Game reset');G.screen='title';G.screenPrev=[]}},
      {n:'KEEP MY SAVE',cb:()=>{}}])}},
    {n:'CANCEL',cb:()=>{}}])},{col:'#ff5a5a',outline:'#8a1a1a',label:'RESET SAVE',fs:16});
  // ---- dev-only DEMO BOOST (not part of normal progression UI) ----
  if(localStorage.getItem('bc_dev_boost')==='1'){ // enable: localStorage.setItem('bc_dev_boost','1') then reload
    BTN('splus',660,310,340,60,()=>{SV.cf+=1500;SV.tickets.rare+=3;SV.xp+=10000;persist();toast('Demo boost: +1500 CF, +3 tickets, +10k XP','#7fe8a0')},{col:'#7a9a4a',outline:'#3a5a1a',label:'DEMO BOOST (DEV)',fs:15,tcol:'#fff'})}
  else{ // harmless credits panel in its place
    cx.fillStyle='#fff8e8';rr(cx,660,310,340,60,14);cx.fill();cx.lineWidth=2.5;cx.strokeStyle='#b08a50';rr(cx,661.5,311.5,337,57,13);cx.stroke();
    txt(cx,'CREDITS',830,331,13.5,'#b06a10','center',3,'#fff',700);
    txt(cx,'Fan tribute · vanilla JS · procedural art & audio',830,352,10.5,'#8a7a5a','center')}
  // ---- storage info line + storage-failure banner (from SV.saveStats) ----
  try{const st=SV.saveStats||{writes:0,fails:0,lastWrite:0};
    const kb=(JSON.stringify(SV).length/1024).toFixed(1);
    const lw=st.lastWrite?new Date(st.lastWrite).toLocaleTimeString():'—';
    if(typeof SAVE_UNRELIABLE!=='undefined'&&SAVE_UNRELIABLE){
      cx.fillStyle='rgba(255,90,90,.18)';rr(cx,260,398,760,30,10);cx.fill();
      cx.lineWidth=2;cx.strokeStyle='#ff5a5a';rr(cx,260,398,760,30,10);cx.stroke();
      txt(cx,'⚠ STORAGE WRITE FAILURES ('+st.fails+') — progress may not be saved. Check browser storage settings.',640,413,12,'#ff7a7a','center',3,'#fff',700)}
    else txt(cx,'SAVE: v'+SV.ver+' · '+kb+' KB · last write '+lw+' · '+st.writes+' writes · '+st.fails+' failed',640,413,12.5,'#8a7a5a','center',3,'#fff',400);
    // Cat Food balance with the official can, right of the storage line (Defect 2)
    drawCFCan(cx,952,413,8);
    txt(cx,fmt(SV.cf),970,413,12.5,'#8a5a10','left',3,'#fff',700);
  }catch(e){}
  txt(cx,'THE BATTLE CATS',640,448,20,'#b06a10','center',4,'#fff',700);
  txt(cx,'Story: EoC 1-3 · ItF 1-3 · CotC 1-3 · SoL · Uncanny Legends · Aku Realms · Dojo · Events',640,482,14,'#6a5a3a','center');
  txt(cx,'Units: '+CATS.length+' cats · Enemies: '+ENEMIES.length+' · Treasures: 27 sets · Cannons: 7 types',640,508,14,'#6a5a3a','center');
  txt(cx,'The Battle Cats © PONOS Corp.',640,600,12,'#a89878','center');
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
    const rw=150+25*Math.min(SV.dailyStreak-1,6);SV.cf+=rw;persist();SFX.win2();toast('+'+rw+' Cat Food! Streak '+SV.dailyStreak+'d','#e85840')},{col:'#e85840',outline:'#8a1a10',label:'CLAIM',fs:17,tcol:'#fff'});
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
    if(doneDay){txt(cx,'\u2714',0,1,17,'#1e4a14','center',3,'#fff',700)}
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
