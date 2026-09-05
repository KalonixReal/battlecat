'use strict';
/* ====================== ART v3: BATTLE-CATS STYLE LINE-ART ======================
   White/cream bodies, THICK dark outlines (#22262f), tiny dot eyes, iconic :3 mouth,
   stubby limbs, squash-bob walk, attack lunge. Pure path drawing — gradients only
   for boss/legend auras. All units drawn facing +x with feet at local (0,0).
   Basic Cat = sleek cat (big round :3 head, compact body, 4 stubby legs, curly tail).
   Every cat has a distinct silhouette; every enemy matches its real-game look. */
const OUT='#22262f';
const CATW='#f7f5ec';
/* boss red pulse glow (only when e.boss) */
function traitAura(c,r,e){if(!e||!e.boss)return;
  c.save();c.globalAlpha=0.25+0.1*Math.sin(G.t*5);const g=c.createRadialGradient(0,-r,0,0,-r,r*2.2);
  g.addColorStop(0,'rgba(255,80,60,.5)');g.addColorStop(1,'rgba(255,80,60,0)');c.fillStyle=g;
  c.beginPath();c.arc(0,-r,r*2.2,0,TAU);c.fill();c.restore()}

/* ============================ PARAM TABLES ============================ */


/* ============================ RENDER API ============================ */
/* ---- offscreen sprite bake cache (pre-baked unit frames for 60fps) ---- */
const BAKE=new Map();
function bakeGet(key,w,h,draw){let b=BAKE.get(key);if(b)return b;
  if(BAKE.size>700){let n=0;for(const k2 of BAKE.keys()){BAKE.delete(k2);if(++n>=300)break}}
  const off=document.createElement('canvas');off.width=Math.max(2,w);off.height=Math.max(2,h);
  const c2=off.getContext('2d');draw(c2,w,h);b={cv:off,w,h};BAKE.set(key,b);return b}
/* per-body-class gait: [bobAplitude px, bobRate rad/s] — heavies lumber, kittens trot */
/* ================================ ART ================================
   REAL ASSETS ONLY (r30). The painter-fallback bodies (painted cat/enemy
   heads+bodies, catBig, enemyIconBody, invented boss scales) are DELETED —
   an audit (scripts/r30_coverage.py) proved 100% real-asset coverage:
   46 cats x every form + 60 enemies, walk/atk strips + icons all present.
   Every entry point renders the original game's own art — or nothing at all
   during a transient decode gap (the original never shows placeholders). */
const ART={
 cat(o){ // walk/attack/hit-blink all live inside SPRIT.draw (real cutout strips)
   const ok=(typeof SPRIT!=='undefined')&&SPRIT.draw('cat',o);
   const e=o.e||{};
   if(e&&e.curse){ // curse tell: small violet motes over the unit (an effect, not art)
     const c=cx;const t=o.t||0,s=o.s||1;c.save();c.fillStyle='#c46adf';const sa=t*3;
     [[-16,-56],[15,-48]].forEach((p,i)=>{c.save();c.translate(o.x+p[0]*s+Math.sin(sa+i*2)*3,o.y+p[1]*s+Math.cos(sa+i)*2.5);c.rotate(0.785);c.fillRect(-2.4,-2.4,4.8,4.8);c.restore()});
     c.restore()}
   return ok}
 ,enemy(o){
   const ok=(typeof SPRIT!=='undefined')&&SPRIT.draw('enemy',o);
   const e=o.e||{};const t=o.t||0,s=o.s||1;
   if(e&&e.curse){const c=cx;c.save();c.fillStyle='#c46adf';const sa=t*3;
     [[-16,-52],[15,-44]].forEach((p,i)=>{c.save();c.translate(o.x+p[0]*s+Math.sin(sa+i*2)*3,o.y+p[1]*s+Math.cos(sa+i)*2.5);c.rotate(0.785);c.fillRect(-2.4,-2.4,4.8,4.8);c.restore()});
     c.restore()}
   return ok}
 ,catIcon(id,x,y,r,dim){ // real icon; uber/legend keep their official glow ring
   const c=cx;c.save();c.globalAlpha=dim!==undefined?dim:1;c.translate(x,y);
   const rar=(typeof CATMAP!=='undefined'?(CATMAP[id]||{}).rarity:null);
   if(rar==='uber'||rar==='legend'){c.save();c.globalAlpha*=0.3+0.08*Math.sin(G.t*4);
     c.fillStyle=rar==='legend'?'#c46adf':'#ffd94a';c.beginPath();c.arc(0,0,r*1.42,0,TAU);c.fill();c.restore()}
   const ok=(typeof SPRIT!=='undefined')&&SPRIT.icon('cat',id,0,0,r,dim);
   c.restore();return ok}
 ,enemyIcon(id,x,y,r,dim){
   const c=cx;c.save();
   const ok=(typeof SPRIT!=='undefined')&&SPRIT.icon('enemy',id,x,y,r,dim);
   c.restore();return ok}
 /* undiscovered-guide mystery card: the REAL enemy icon tinted into a silhouette
    (the original darkens the actual sprite — never an invented shape) */
 ,enemySil(id,x,y,r){const c=cx;c.save();c.translate(x,y);
   const R=Math.max(10,Math.min(56,Math.round(r)));const dp=Math.min(cv._dpr||1,2);
   const BW=Math.ceil(R*3.4*dp),BH=Math.ceil(R*3.4*dp);
   const b=bakeGet('es|'+id+'|'+R+'|'+dp,BW,BH,c2=>{
     c2.setTransform(dp,0,0,dp,BW/2,BH/2);
     let im=null;
     if(typeof SPRIT!=='undefined')im=SPRIT.needIcon('enemy',id);
     if(im&&imgReady(im)){const S2=R*2.48;c2.drawImage(im,-S2/2,-S2/2,S2,S2)}
     c2.setTransform(dp,0,0,dp,0,0);c2.globalCompositeOperation='source-in';
     c2.fillStyle='#333846';c2.fillRect(0,0,BW,BH)});
   c.drawImage(b.cv,-BW/(2*dp),-BH/(2*dp),BW/dp,BH/dp);c.restore()}
 /* enemy guide big view: the REAL unit sprite at collection scale (like the gacha) */
 ,enemyBig(id,x,y,s){
   if(typeof SPRIT!=='undefined'&&SPRIT.draw('enemy',{id,x,y,s,e:{anim:'idle',idle:1},t:G.t}))return;
   ART.enemyIcon(id,x,y,12*s)}};


function bgSky(){const g=cx.createLinearGradient(0,-VOY,0,DH);g.addColorStop(0,'#a8d8f0');g.addColorStop(.75,'#c8e8b8');g.addColorStop(1,'#d8f0c0');cx.fillStyle=g;cx.fillRect(0,-VOY,DW,DH);
  // soft sun glow upper-right + slow back cloud layer + faster foreground wisps (parallax depth)
  const sg=cx.createRadialGradient(DW-100,86,20,DW-100,86,300);
  sg.addColorStop(0,'rgba(255,246,200,.55)');sg.addColorStop(.5,'rgba(255,246,200,.18)');sg.addColorStop(1,'rgba(255,246,200,0)');
  cx.fillStyle=sg;cx.fillRect(DW-400,0,400,380);
  cx.fillStyle='rgba(255,255,255,.8)';for(let i=0;i<6;i++)cloudDraw(((i*260)+G.t*8)%1500-100,70+(i*47)%140,1+(i%3)*0.4);
  cx.fillStyle='rgba(255,255,255,.5)';for(let i=0;i<3;i++){const sc=0.9+(i%2)*0.5;
    cloudDraw(((i*430)+G.t*(15+i*5))%1500-120,104+(i*61)%92,sc)}}

/* ==================== UI ART HELPERS (Builder B — official-chrome support) ====================
   All textures are baked through bakeGet() so per-frame cost is a drawImage/pattern fill.
   No emoji anywhere — pictograms are vector paths. */

/* ---- REAL EARTH MAP (official EoC parchment world map, equirectangular 2940x1440).
   Used for Empire of Cats (natural parchment) and Into the Future (tech tint), like the original. ---- */
const EARTH_MAP={img:null,loading:false,ready:false};
function earthMap(){
  if(EARTH_MAP.loading)return EARTH_MAP.img;
  EARTH_MAP.loading=true;
  const im=new Image();
  im.onload=()=>{EARTH_MAP.img=im;EARTH_MAP.ready=true};
  im.onerror=()=>{EARTH_MAP.loading=false};
  im.src='assets/maps/eoc_map.png';
  return null}
/* lon/lat → map-pixel on the 2940x1440 equirect sheet */
function geo2map(lon,lat,mw,mh){return[(lon+180)/360*mw,(90-lat)/180*mh]}
/* Chapter tint table: which overlay each story chapter gets (original EoC2/3 are darker recolors) */
const CH_TINT={eoc1:null,eoc2:'rgba(40,16,60,.22)',eoc3:'rgba(140,16,10,.18)',itf1:'rgba(16,60,120,.30)',itf2:'rgba(10,40,90,.42)',itf3:'rgba(60,10,80,.38)'};

/* ---- r32 REAL MAP BACKDROP for non-story maps (SoL/UL/Aku/Dojo/events): a genuine
   in-game battle background, cover-fit to the map extents + readability veil + tint.
   Replaces the invented parchment scene (fake continents/compass/galleon doodles) —
   base-game art only. Own image cache so releasing a battle's memory never blanks
   the map screen. ---- */
const _mapBgImgs={};
function mapBackdrop(name,w,h,tint){
  const ext=(typeof mapFileExt==='function')?mapFileExt(name):'webp';
  const im=lazyImg(_mapBgImgs,name,'assets/maps/'+name+'.'+ext);
  const ready=imgReady(im);
  const key='mapbg|'+name+'|'+w+'x'+h+'|'+(tint||'')+(ready?'|r':'');
  if(!ready&&im.addEventListener&&!im._mbHook){ // still decoding: re-bake the moment it lands
    im._mbHook=1;
    const drop=()=>{try{for(const k of Array.from(BAKE.keys())){if(k.indexOf('mapbg|'+name+'|')===0)BAKE.delete(k)}}catch(e){}};
    im.addEventListener('load',drop,{once:true});
    im.addEventListener('error',drop,{once:true});
  }
  return bakeGet(key,Math.max(2,w),Math.max(2,h),(c2)=>{
    c2.fillStyle='#3a2a16';c2.fillRect(0,0,w,h); // warm dark base tone (also the pre-decode look)
    if(ready&&im.naturalWidth){
      const s=Math.max(w/im.naturalWidth,h/im.naturalHeight); // cover-fit
      const dw=Math.ceil(im.naturalWidth*s),dh=Math.ceil(im.naturalHeight*s);
      c2.imageSmoothingEnabled=true;
      c2.drawImage(im,Math.round((w-dw)/2),Math.round((h-dh)/2),dw,dh);
    }
    // readability veil + edge vignette — stage banners/dots pop like the original's map screens
    c2.fillStyle='rgba(24,16,8,.28)';c2.fillRect(0,0,w,h);
    const vg=c2.createRadialGradient(w/2,h/2,Math.min(w,h)*0.35,w/2,h/2,Math.max(w,h)*0.75);
    vg.addColorStop(0,'rgba(10,6,2,0)');vg.addColorStop(1,'rgba(10,6,2,.42)');
    c2.fillStyle=vg;c2.fillRect(0,0,w,h);
    if(tint){c2.fillStyle=tint;c2.fillRect(0,0,w,h)}}).cv
}

/* Kikkou (interlocking-scale / seigaiha) baked TILE for chrome strips. */
function kikkouTile(c2,fill,line){
  c2.fillStyle=fill;c2.fillRect(0,0,64,64);
  c2.strokeStyle=line;c2.lineWidth=1.6;
  for(let row=-1;row<5;row++)for(let col=-1;col<5;col++){
    const x=col*16+(row%2?8:0),y=row*10.5;
    for(let r=13;r>2;r-=3.2){c2.beginPath();c2.arc(x,y,r,Math.PI,0);c2.stroke()}}}
function kikkouStrip(x,y,w,h,flip,fill,line){
  const b=bakeGet('kikkou|'+(flip?1:0)+'|'+(fill||'')+(line||''),64,64,(c2)=>{
    if(flip){c2.translate(32,32);c2.rotate(Math.PI);c2.translate(-32,-32)}
    kikkouTile(c2,fill||'#8a5a28',line||'rgba(56,34,12,.75)')});
  const pat=cx.createPattern(b.cv,'repeat');
  cx.save();cx.beginPath();cx.rect(x,y,w,h);cx.clip();
  cx.fillStyle=pat;cx.fillRect(x,y,w,h);
  cx.fillStyle='rgba(40,24,8,.18)';cx.fillRect(x,y,w,h);
  cx.fillStyle='rgba(255,220,150,.12)';cx.fillRect(x,y,w,3);
  cx.restore()}

/* Wooden frame with vertical grain (baked strip tile) */
function woodFrame(x,y,w,h,t){
  const b=bakeGet('woodgrainV',56,56,(c2)=>{
    const g=c2.createLinearGradient(0,0,56,0);g.addColorStop(0,'#9a6a30');g.addColorStop(.5,'#7a4e1e');g.addColorStop(1,'#94662c');
    c2.fillStyle=g;c2.fillRect(0,0,56,56);
    const R=rnd(551);
    for(let i=0;i<16;i++){const gx=R()*56;const wv=2+R()*4;
      c2.strokeStyle=R()<0.5?'rgba(56,34,12,.4)':'rgba(220,170,100,.22)';c2.lineWidth=1+R()*1.8;
      c2.beginPath();c2.moveTo(gx,0);
      c2.bezierCurveTo(gx+wv,14,gx-wv,28,gx+wv*0.6,42);c2.lineTo(gx,56);c2.stroke()}});
  cx.save();
  cx.drawImage(b.cv,0,0,56,56,x,y,w,t);            // top
  cx.drawImage(b.cv,0,0,56,56,x,y+h-t,w,t);        // bottom
  cx.drawImage(b.cv,0,0,56,56,x,y+t,t,h-2*t);      // left
  cx.drawImage(b.cv,0,0,56,56,x+w-t,y+t,t,h-2*t);  // right
  cx.strokeStyle='rgba(40,22,6,.8)';cx.lineWidth=2;cx.strokeRect(x+1,y+1,w-2,h-2);
  cx.restore()}

/* Dark-grey circular pictogram button (map item row). drawFn(c) draws glyph in light col, centered. */
function circIcon(c,x,y,r,drawFn,dim){
  c.save();c.translate(x,y);
  c.fillStyle='rgba(52,58,70,'+(dim?0.55:0.92)+')';c.beginPath();c.arc(0,0,r,0,TAU);c.fill();
  c.fillStyle='rgba(122,130,146,'+(dim?0.5:1)+')';c.beginPath();c.arc(0,0,r-3.5,0,TAU);c.fill();
  c.strokeStyle='rgba(20,24,32,.65)';c.lineWidth=2;c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();
  c.strokeStyle='rgba(255,255,255,.14)';c.lineWidth=1.4;c.beginPath();c.arc(0,0,r-1.6,-2.4,-0.6);c.stroke();
  drawFn&&drawFn(c);
  c.restore()}

/* Ribbon banner with forked tails. Returns nothing; text drawn by caller. */
function ribbon(c,x,y,w,h,col,edge){
  c.save();c.translate(x,y);
  c.fillStyle=edge;
  c.beginPath();c.moveTo(-w/2-12,-h*0.32);c.lineTo(-w/2+6,-h*0.32);c.lineTo(-w/2+6,h*0.55);c.lineTo(-w/2-12,h*0.9);c.closePath();c.fill();
  c.beginPath();c.moveTo(w/2+12,-h*0.32);c.lineTo(w/2-6,-h*0.32);c.lineTo(w/2-6,h*0.55);c.lineTo(w/2+12,h*0.9);c.closePath();c.fill();
  c.fillStyle=col;rr(c,-w/2,-h/2,w,h,h*0.28);c.fill();
  c.lineWidth=2;c.strokeStyle=edge;rr(c,-w/2,-h/2,w,h,h*0.28);c.stroke();
  c.restore()}

/* White cat map-marker with soft shadow + gentle bob (t = global time).
   r32: draws the REAL basic-cat icon from the cutout atlas (base-game art) —
   the old painted head painter was removed in r30 and left a crash here. */
function catMarker(c,x,y,s,t){
  const bob=Math.sin(t*2.6)*2.5;
  c.save();c.translate(x,y+bob);
  c.fillStyle='rgba(60,40,14,.28)';c.beginPath();c.ellipse(0,s*0.92-bob,s*0.72,s*0.2,0,0,TAU);c.fill();
  const r=s*0.5;
  if(typeof SPRIT!=='undefined'&&SPRIT.icon)SPRIT.icon('cat','cat',0,-s*0.12,r);
  c.restore()}

/* Big capsule machine (gacha idle centerpiece). col/cap = banner colors, s = scale (~2.0).
   Local extents: x -104..104, y -78..112 (glass globe + wooden cabinet + coin slot + knob + chute + tray). */
function capsuleMachine(c,x,y,s,col,cap,shakeT){
  c.save();c.translate(x,y);c.scale(s,s);
  if(shakeT)c.rotate(Math.sin(shakeT*30)*0.045);
  // soft ground shadow
  c.fillStyle='rgba(30,18,6,.32)';c.beginPath();c.ellipse(0,106,104,13,0,0,TAU);c.fill();
  // pedestal base plate
  c.fillStyle='#5f3f1c';rr(c,-100,92,200,18,7);c.fill();
  c.strokeStyle='#33200c';c.lineWidth=2.5;rr(c,-100,92,200,18,7);c.stroke();
  c.fillStyle='rgba(255,220,150,.14)';rr(c,-100,92,200,4,2);c.fill();
  // wooden cabinet body
  const body=c.createLinearGradient(-75,0,75,0);
  body.addColorStop(0,'#8a5a28');body.addColorStop(.5,'#a5713a');body.addColorStop(1,'#7c4e20');
  c.fillStyle=body;rr(c,-75,4,150,92,10);c.fill();
  c.strokeStyle='#3f2a10';c.lineWidth=3;rr(c,-75,4,150,92,10);c.stroke();
  // vertical wood slats on the cabinet
  c.strokeStyle='rgba(60,36,12,.32)';c.lineWidth=2;
  for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(i*28,10);c.lineTo(i*28,90);c.stroke()}
  // collar band under the globe + gold trim
  c.fillStyle='#4a3624';rr(c,-62,-12,124,20,8);c.fill();
  c.strokeStyle='#2e1e0e';c.lineWidth=2.5;rr(c,-62,-12,124,20,8);c.stroke();
  c.strokeStyle='rgba(255,210,63,.8)';c.lineWidth=2;c.beginPath();c.moveTo(-56,-2.5);c.lineTo(56,-2.5);c.stroke();
  // center medal on the band
  c.fillStyle='#ffd23f';c.beginPath();c.arc(0,-2,9,0,TAU);c.fill();
  c.strokeStyle='#8a5a10';c.lineWidth=2;c.beginPath();c.arc(0,-2,9,0,TAU);c.stroke();
  c.fillStyle='rgba(255,255,255,.5)';c.beginPath();c.arc(-3,-5,2.6,0,TAU);c.fill();
  // glass dome
  c.fillStyle='rgba(210,232,244,.50)';c.beginPath();c.arc(0,-14,56,Math.PI,0);c.fill();
  // capsules piled inside (clipped to the dome)
  c.save();c.beginPath();c.arc(0,-14,52,Math.PI,0);c.closePath();c.clip();
  c.fillStyle='rgba(255,244,214,.22)';c.beginPath();c.arc(0,-18,42,Math.PI,0);c.fill();
  const caps=[[-32,-24],[-8,-34],[16,-26],[34,-16],[-40,-12],[6,-16],[-16,-8],[26,-38],[-26,-38],[42,-30],[44,-14]];
  caps.forEach((p,i)=>{c.save();c.translate(p[0],p[1]);c.rotate((i*1.7)%3-1);
    c.fillStyle=i%2?cap:col;c.beginPath();c.arc(0,0,9.5,0,TAU);c.fill();
    c.fillStyle=i%2?col:cap;c.beginPath();c.arc(0,0,9.5,Math.PI,0);c.fill();
    c.strokeStyle='rgba(60,40,60,.5)';c.lineWidth=1.4;c.beginPath();c.arc(0,0,9.5,0,TAU);c.stroke();
    c.fillStyle='rgba(255,255,255,.5)';c.beginPath();c.arc(-3,-3,2.6,0,TAU);c.fill();c.restore()});
  c.restore();
  // dome outline + rim light + shine
  c.strokeStyle='#4a3a2a';c.lineWidth=4;c.beginPath();c.arc(0,-14,56,Math.PI,0);c.stroke();
  c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=2;c.beginPath();c.arc(0,-14,50,Math.PI*1.12,Math.PI*1.42);c.stroke();
  c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.ellipse(-20,-38,9,18,-0.65,0,TAU);c.fill();
  // dome cap finial
  c.fillStyle='#4a3a2a';c.beginPath();c.arc(0,-72,6,0,TAU);c.fill();
  c.fillStyle='rgba(255,255,255,.3)';c.beginPath();c.arc(-1.8,-73.8,2,0,TAU);c.fill();
  // coin slot (right side of cabinet)
  c.fillStyle='#33200c';rr(c,46,18,18,30,4);c.fill();
  c.fillStyle='#ffd23f';rr(c,51,24,8,16,2);c.fill();
  c.strokeStyle='#8a6a10';c.lineWidth=1.2;rr(c,51,24,8,16,2);c.stroke();
  // red turn-knob (left)
  c.fillStyle='#33200c';c.beginPath();c.arc(-46,32,10,0,TAU);c.fill();
  c.fillStyle='#e84830';c.beginPath();c.arc(-46,32,7,0,TAU);c.fill();
  c.fillStyle='rgba(255,255,255,.4)';c.beginPath();c.arc(-48.5,29.5,2.2,0,TAU);c.fill();
  // discharge chute (center bottom of cabinet)
  c.fillStyle='#2e1e0e';rr(c,-18,58,36,26,5);c.fill();
  c.fillStyle='#1c1208';rr(c,-13,64,26,20,4);c.fill();
  // catch tray under the chute
  c.fillStyle='#4a3624';rr(c,-56,84,112,12,5);c.fill();
  c.strokeStyle='#2e1e0e';c.lineWidth=2;rr(c,-56,84,112,12,5);c.stroke();
  c.fillStyle='#33200c';c.beginPath();c.ellipse(0,90,42,5,0,0,TAU);c.fill();
  // a capsule waiting in the tray
  c.fillStyle=cap;c.beginPath();c.arc(0,84,8,0,TAU);c.fill();
  c.fillStyle=col;c.beginPath();c.arc(0,84,8,Math.PI,0);c.fill();
  c.strokeStyle='rgba(60,40,60,.5)';c.lineWidth=1.3;c.beginPath();c.arc(0,84,8,0,TAU);c.stroke();
  c.fillStyle='rgba(255,255,255,.5)';c.beginPath();c.arc(-2.4,81.6,2.2,0,TAU);c.fill();
  c.restore()}

/* Official CAT FOOD can (Builder P, Defect 2): orange can + silver top rim + white cat-face
   label, with an optional small white "+" badge variant (plus). s ~ half-height of the can.
   Drawn with plain paths every call (tiny area — no bake needed); used by map/upgrade/gacha/
   store/settings bottom bars & chips. Replaces the old red-jar pictogram everywhere. */
function drawCFCan(c,x,y,s,plus){
  s=Math.max(4,s);
  c.save();c.translate(x,y);
  const w=s*1.3,h=s*1.66; // body box (centered)
  // can body: orange gradient-ish (two flat tones, cheap)
  c.fillStyle='#f28a2a';rr(c,-w/2,-h*0.32,w,h*0.98,s*0.22);c.fill();
  c.fillStyle='#e06f1a';rr(c,-w/2,h*0.14,w,h*0.52,s*0.18);c.fill(); // lower shade band
  c.strokeStyle='#8a4a10';c.lineWidth=Math.max(1.4,s*0.11);rr(c,-w/2,-h*0.32,w,h*0.98,s*0.22);c.stroke();
  // silver top rim (slightly wider lid)
  c.fillStyle='#d8dde4';rr(c,-w/2-s*0.06,-h*0.62,w+s*0.12,s*0.42,s*0.14);c.fill();
  c.strokeStyle='#8a92a0';c.lineWidth=Math.max(1.1,s*0.08);rr(c,-w/2-s*0.06,-h*0.62,w+s*0.12,s*0.42,s*0.14);c.stroke();
  c.fillStyle='rgba(255,255,255,.75)';rr(c,-w/2+s*0.10,-h*0.56,w-s*0.2,s*0.10,s*0.05);c.fill(); // rim glint
  // white label disc + cat face (ears + dot eyes + ω mouth), orange ink
  c.fillStyle='#fff8ee';c.beginPath();c.arc(0,s*0.14,s*0.52,0,TAU);c.fill();
  c.strokeStyle='#e8951f';c.lineWidth=Math.max(1,s*0.07);c.beginPath();c.arc(0,s*0.14,s*0.52,0,TAU);c.stroke();
  c.fillStyle='#e8951f';
  c.beginPath();c.moveTo(-s*0.34,-s*0.12);c.lineTo(-s*0.42,-s*0.44);c.lineTo(-s*0.12,-s*0.26);c.closePath();c.fill();
  c.beginPath();c.moveTo(s*0.34,-s*0.12);c.lineTo(s*0.42,-s*0.44);c.lineTo(s*0.12,-s*0.26);c.closePath();c.fill();
  c.beginPath();c.arc(-s*0.17,s*0.06,s*0.06,0,TAU);c.arc(s*0.17,s*0.06,s*0.06,0,TAU);c.fill();
  c.strokeStyle='#e8951f';c.lineWidth=Math.max(1,s*0.07);c.lineCap='round';
  c.beginPath();c.moveTo(-s*0.13,s*0.26);c.quadraticCurveTo(-s*0.06,s*0.36,0,s*0.27);c.quadraticCurveTo(s*0.06,s*0.36,s*0.13,s*0.26);c.stroke();
  // side sheen
  c.fillStyle='rgba(255,255,255,.30)';c.beginPath();c.ellipse(-w*0.30,-h*0.05,s*0.10,s*0.42,0.12,0,TAU);c.fill();
  // optional white "+" badge (e.g. gain indicators)
  if(plus){
    c.fillStyle='#fff';c.beginPath();c.arc(w*0.52,-h*0.38,s*0.30,0,TAU);c.fill();
    c.strokeStyle='#e8951f';c.lineWidth=Math.max(1,s*0.07);c.beginPath();c.arc(w*0.52,-h*0.38,s*0.30,0,TAU);c.stroke();
    c.strokeStyle='#e8951f';c.lineWidth=Math.max(1.2,s*0.10);c.lineCap='round';
    c.beginPath();c.moveTo(w*0.52-s*0.14,-h*0.38);c.lineTo(w*0.52+s*0.14,-h*0.38);
    c.moveTo(w*0.52,-h*0.38-s*0.14);c.lineTo(w*0.52,-h*0.38+s*0.14);c.stroke()}
  c.restore()}
/* legacy alias — all old call sites now render the official orange can */
function catFoodCan(c,x,y,r){drawCFCan(c,x,y,r*0.94)}

/* Official curved BACK arrow (Builder P, Defect 3): thick white hook arrow inside a yellow
   circle — replaces the ◀ triangle on every top bar / bottom bar back button. */
function drawBackArrow(c,x,y,r){
  c.save();c.translate(x,y);
  c.fillStyle='#ffd23f';c.beginPath();c.arc(0,0,r,0,TAU);c.fill();
  const bw=Math.max(2.4,r*0.15);
  c.lineWidth=bw;c.strokeStyle='#5a3b16';c.beginPath();c.arc(0,0,r-bw/2,0,TAU);c.stroke();
  c.fillStyle='rgba(255,255,255,.30)';c.beginPath();c.ellipse(-r*0.32,-r*0.38,r*0.30,r*0.16,0.7,0,TAU);c.fill();
  // white hook: sweep from the right, over the top, ending at the left pointing down-inward
  const R=r*0.40,cy2=r*0.10;
  c.strokeStyle='#fff';c.lineWidth=Math.max(3,r*0.24);c.lineCap='round';
  c.beginPath();c.arc(0,cy2,R,0,Math.PI,true);c.stroke();
  c.save();c.translate(-R,cy2);c.rotate(Math.PI*0.42);
  c.fillStyle='#fff';c.beginPath();c.moveTo(r*0.30,0);c.lineTo(-r*0.02,-r*0.24);c.lineTo(-r*0.02,r*0.24);c.closePath();c.fill();
  c.restore();
  c.restore()}

