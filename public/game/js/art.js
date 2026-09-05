'use strict';
/* ====================== ART v3: BATTLE-CATS STYLE LINE-ART ======================
   White/cream bodies, THICK dark outlines (#22262f), tiny dot eyes, iconic :3 mouth,
   stubby limbs, squash-bob walk, attack lunge. Pure path drawing — gradients only
   for boss/legend auras. All units drawn facing +x with feet at local (0,0).
   Basic Cat = sleek cat (big round :3 head, compact body, 4 stubby legs, curly tail).
   Every cat has a distinct silhouette; every enemy matches its real-game look. */
const OUT='#22262f';
const CATW='#f7f5ec';
function outline(c,fn,lw){c.lineWidth=lw||3;c.strokeStyle=OUT;c.lineJoin='round';c.lineCap='round';fn();c.stroke()}
function wob(t,a){return Math.sin(t*9)*a}
/* fill+outline in one pass. fn: path commands WITHOUT beginPath (replayed for stroke). */
function fo(c,fn,col,lw){c.fillStyle=col||CATW;c.beginPath();fn();c.fill();outline(c,fn,lw||3)}
function so(c,fn,lw,col){c.strokeStyle=col||OUT;c.lineWidth=lw||3;c.lineCap='round';c.lineJoin='round';c.beginPath();fn();c.stroke()}
/* outlined tube limb (dark edge + light core) */
function tube(c,fn,w,col){c.lineCap='round';c.lineJoin='round';c.strokeStyle=OUT;c.lineWidth=w+2.4;c.beginPath();fn();c.stroke();c.strokeStyle=col||CATW;c.lineWidth=w;c.beginPath();fn();c.stroke()}
function dots2(c,x,y,r){c.beginPath();c.arc(-x,y,r,0,TAU);c.fill();c.beginPath();c.arc(x,y,r,0,TAU);c.fill()}
/* stubby scissoring legs with real stepping — horizontal swing + knee lift on the forward pass.
   pts=[[xTop,yTop],...]; alternate diagonal phase (ph = continuous -1..1 stride wave). */
function legs(c,pts,ph,w,col){pts.forEach((p,i)=>{const s=(i%2?1:-1);const sw=s*(ph||0);
  tube(c,()=>{c.moveTo(p[0],p[1]);c.lineTo(p[0]+sw*4.4,-Math.max(0,sw)*5.4)},w,col)})}
/* zombie stitch mark: seam line + cross ticks */
function stitch(c,x,y,s,col){const col2=col||'#4a6238';const k=s||2;
  so(c,()=>{c.moveTo(x-k,y);c.lineTo(x+k,y)},k*0.7,col2);
  so(c,()=>{c.moveTo(x-k*0.4,y-k*0.8);c.lineTo(x-k*0.4,y+k*0.8);c.moveTo(x+k*0.4,y-k*0.8);c.lineTo(x+k*0.4,y+k*0.8)},k*0.55,col2)}

/* ---------- THE FACE: tiny dot eyes + iconic :3 (ω) mouth ---------- */
/* FACE_BLINK: when true, painters render closed happy eyes (idle blink micro-animation) */
let FACE_BLINK=false;
function face(c,r,o){o=o||{};if(FACE_BLINK)o=Object.assign({},o,{happy:true,angry:false});const ey=-r*0.12,ew=r*0.38,er=Math.max(1.3,r*0.12);
  c.fillStyle=o.ec||OUT;
  if(o.happy){const k=Math.max(1.6,r*0.1);
    so(c,()=>{c.moveTo(-ew-er,ey+er);c.quadraticCurveTo(-ew,ey-r*0.26,-ew+er,ey+er)},k,o.ec||OUT);
    so(c,()=>{c.moveTo(ew-er,ey+er);c.quadraticCurveTo(ew,ey-r*0.26,ew+er,ey+er)},k,o.ec||OUT)}
  else if(o.xeyes){const k=Math.max(1.6,r*0.1);
    [[-ew,ey],[ew,ey]].forEach(p=>{so(c,()=>{c.moveTo(p[0]-er,p[1]-er);c.lineTo(p[0]+er,p[1]+er);c.moveTo(p[0]+er,p[1]-er);c.lineTo(p[0]-er,p[1]+er)},k)})}
  else dots2(c,ew,ey,er);
  if(o.angry){const k=Math.max(1.4,r*0.09);
    so(c,()=>{c.moveTo(-ew-er*1.2,ey-r*0.34);c.lineTo(-ew+er,ey-r*0.18)},k);
    so(c,()=>{c.moveTo(ew+er*1.2,ey-r*0.34);c.lineTo(ew-er,ey-r*0.18)},k)}
  const mw=r*0.34,my=r*0.26;
  if(o.open){c.fillStyle=o.omC||'#8a4a44';c.beginPath();c.ellipse(0,r*0.36,r*0.15,r*0.2,0,0,TAU);c.fill();so(c,()=>c.ellipse(0,r*0.36,r*0.15,r*0.2,0,0,TAU),1.6)}
  else if(!o.nomouth){c.strokeStyle=o.mc||OUT;c.lineWidth=Math.max(1.6,r*0.11);c.lineCap='round';
    c.beginPath();c.moveTo(-mw,my);c.quadraticCurveTo(-mw*0.5,my+r*0.22,0,my);c.quadraticCurveTo(mw*0.5,my+r*0.22,mw,my);c.stroke()}
  if(o.tongue){c.fillStyle='#e88a9a';c.beginPath();c.ellipse(0,r*0.52,r*0.13,r*0.17,0,0,TAU);c.fill();so(c,()=>c.ellipse(0,r*0.52,r*0.13,r*0.17,0,0,TAU),1.6)}
  if(o.nose){c.fillStyle=OUT;c.beginPath();c.moveTo(-r*0.08,r*0.1);c.lineTo(r*0.08,r*0.1);c.lineTo(0,r*0.22);c.closePath();c.fill()}
  if(o.blush){c.fillStyle='rgba(240,150,150,.5)';c.beginPath();c.arc(-r*0.62,r*0.16,r*0.14,0,TAU);c.fill();c.beginPath();c.arc(r*0.62,r*0.16,r*0.14,0,TAU);c.fill()}
  if(o.glass){c.fillStyle='rgba(38,42,54,.88)';c.strokeStyle=OUT;c.lineWidth=Math.max(1.6,r*0.09);
    c.beginPath();c.arc(-ew,ey,r*0.3,0,TAU);c.fill();c.stroke();
    c.beginPath();c.arc(ew,ey,r*0.3,0,TAU);c.fill();c.stroke();
    so(c,()=>{c.moveTo(-r*0.14,ey);c.lineTo(r*0.14,ey)},Math.max(1.4,r*0.08))}}

/* ---------- full head: ears + round head + face ---------- */
function head(c,r,o){o=o||{};const col=o.c||CATW,lw=o.lw||3;
  const ears=o.ears||(o.dogEars?'dog':'cat');
  if(ears==='dog'){[-1,1].forEach(sg=>{fo(c,()=>{c.moveTo(sg*r*0.5,-r*0.5);c.quadraticCurveTo(sg*r*1.2,-r*0.85,sg*r*1.05,-r*0.05);c.quadraticCurveTo(sg*r*0.75,r*0.12,sg*r*0.4,-r*0.22);c.closePath()},col,lw*0.85)})}
  else if(ears==='bear'){[-1,1].forEach(sg=>{fo(c,()=>c.arc(sg*r*0.7,-r*0.82,r*0.3,0,TAU),col,lw*0.85)})}
  else if(ears==='fox'){[-1,1].forEach(sg=>{fo(c,()=>{c.moveTo(sg*r*0.72,-r*0.3);c.lineTo(sg*r*1.05,-r*1.5);c.lineTo(sg*r*0.1,-r*0.75);c.closePath()},col,lw*0.85)})}
  else if(ears!=='none'){[-1,1].forEach(sg=>{fo(c,()=>{c.moveTo(sg*r*0.82,-r*0.28);c.lineTo(sg*r*0.6,-r*1.24);c.lineTo(sg*r*0.12,-r*0.74);c.closePath()},col,lw*0.9);
    if(o.innerEar){c.fillStyle='#f0c4bc';c.beginPath();c.moveTo(sg*r*0.6,-r*0.48);c.lineTo(sg*r*0.53,-r*0.98);c.lineTo(sg*r*0.32,-r*0.62);c.closePath();c.fill()}})}
  fo(c,()=>c.arc(0,0,r,0,TAU),col,lw);
  if(o.snout)fo(c,()=>c.ellipse(r*0.16,r*0.3,r*0.44,r*0.34,0,0,TAU),o.snout,lw*0.85);
  face(c,r,o)}

/* boss red pulse glow (only when e.boss) */
function traitAura(c,r,e){if(!e||!e.boss)return;
  c.save();c.globalAlpha=0.25+0.1*Math.sin(G.t*5);const g=c.createRadialGradient(0,-r,0,0,-r,r*2.2);
  g.addColorStop(0,'rgba(255,80,60,.5)');g.addColorStop(1,'rgba(255,80,60,0)');c.fillStyle=g;
  c.beginPath();c.arc(0,-r,r*2.2,0,TAU);c.fill();c.restore()}

/* ============================ PARAM TABLES ============================ */
const ART_CATS={
 cat:{p:'kitten'},tank:{p:'wall'},axe:{p:'kitten',acc:'axe',big:1},gross:{p:'tall'},
 cow:{p:'kitten',spots:1,horns:1},bird:{p:'bird'},fish:{p:'fish'},lizard:{p:'dragon'},
 titan:{p:'brute',club:1,big:1},boogie:{p:'kitten',hair:'afro',happy:1,dance:1},
 mr:{p:'biped',glass:1,swagger:1},bahamut:{p:'dragon',dark:1,wings:1,big:1},
 kungfu:{p:'biped',belt:1,band:1,fist:1},rock:{p:'rock'},neko:{p:'luga'},
 pogo:{p:'biped',pogo:1},sushi:{p:'kitten',hat:'sushi'},cutter:{p:'kitten',acc:'blade'},
 pirate:{p:'biped',acc:'gun',hat:'pirate'},thief:{p:'kitten',mask:1,scarf:1},
 sorcerer:{p:'biped',hat:'witch',staff:1},guitar:{p:'biped',acc:'guitar',mohawk:1},
 can:{p:'brute',gloves:1,boots:1,singlet:1},cyborg:{p:'biped',cyborg:1},
 seafarer:{p:'biped',hat:'sailor',scope:1},slime:{p:'blob'},paladin:{p:'biped',armor:1,shield:1},
 medusa:{p:'biped',snakes:1},catman:{p:'biped',cape:1,mask:1},mechabun:{p:'mech'},
 noble:{p:'samurai'},kaguya:{p:'biped',hat:'princess'},dioramos:{p:'dragon',wings:1,dark:1,big:1},
 gao:{p:'brute',aura:1,armor:1,angry:1,big:1},luza:{p:'luga',legend:1,staff:1,horns:1},
 gatr:{p:'dragon',legend:1,crown:1},
 valkyrie:{p:'biped',armor:1,cape:1,staff:1},
 lilcat:{p:'kitten',tiny:1},
 liltank:{p:'wall',tiny:1},
 moneko:{p:'kitten',coin:1,happy:1},
 neneko:{p:'kitten',baby:1,happy:1},
 island:{p:'kitten',spots:1,happy:1,dance:1},
 archer:{p:'biped',scope:1,band:1},
 fortune:{p:'biped',hat:'princess',staff:1},
 jurassic:{p:'dragon',angry:1},
 kotatsu:{p:'blob'}};
const ENEMY_ART={
 doge:{p:'shiba',c:'#f2e2c8',c2:'#dca86e',m:'#fbf3e3'},
 snache:{p:'snake',c:'#e8e4d4'},
 those:{p:'guys',c:'#e8e4d4'},
 baa:{p:'sheep',c:'#f0ede2'},
 jackie:{p:'penguin',c:'#3a3f4e'},
 leboin:{p:'boar',c:'#d8c0a8',m:'#e8b0a0'},
 hippoe:{p:'hippo',c:'#b8a8c8',m:'#d8c8e0',boss:1,bsc:.6},
 sirseal:{p:'seal',c:'#d8d4c8',boss:1,bsc:.6},
 dudorian:{p:'dumpling',c:'#f4e8d4'},
 onehorn:{p:'bear',c:'#e06a55',horn:1,angry:1,boss:1,bsc:.55,tr:'#ff7a6a'},
 teacher:{p:'bear',c:'#c8a878',glass:1,boss:1,bsc:.55},
 croco:{p:'croc',c:'#6a8a4e'},
 shibalien:{p:'shiba',c:'#8ad8a8',c2:'#54a074',alien:1,tr:'#7fd8ff'},
 darkotius:{p:'mech',c:'#3a3a44',boss:1,bsc:.6,tr:'#454a58'},
 face:{p:'face',c:'#d8d4c8',boss:1,bsc:.85},
 nyandam:{p:'catlord',c:'#e0533f',boss:1,bsc:.62,tr:'#ff7a6a'},
 redfox:{p:'shiba',c:'#e06a55',c2:'#c85848',fox:1,tr:'#ff7a6a'},
 ghostdoge:{p:'shiba',c:'#c8d8e8',c2:'#a8c0d8',ghost:1,tr:'#c8a8ff'},
 angelgabriel:{p:'angel',c:'#f2e8c8',small:1,tr:'#ffd94a'},
 angelseraph:{p:'angel',c:'#f2d8a0',boss:1,bsc:.6,tr:'#ffd94a'},
 metallic:{p:'hippo',c:'#9fb4c4',m:'#bccfdd',metal:1,boss:1,bsc:.6,tr:'#b8c8d4'},
 metallicdoge:{p:'shiba',c:'#9fb4c4',c2:'#8aa2b4',metal:1,tr:'#b8c8d4'},
 zombieelephant:{p:'elephant',c:'#8aa06a',c2:'#74885a',zombie:1,tr:'#8aa06a'},
 zombierturtle:{p:'turtle',c:'#8aa06a',sh:'#58724c',zombie:1,tr:'#8aa06a'},
 zombibear:{p:'bear',c:'#8aa06a',zombie:1,boss:1,bsc:.55,tr:'#8aa06a'},
 relicdoge:{p:'shiba',c:'#d8c37f',c2:'#b4964a',relic:1,tr:'#d8c37f'},
 relichippo:{p:'hippo',c:'#d8c37f',m:'#e9dba4',relic:1,boss:1,bsc:.6,tr:'#d8c37f'},
 akudoge:{p:'shiba',c:'#b06adf',c2:'#7a3a9a',aku:1,tr:'#c46adf'},
 akucerberus:{p:'cerberus',c:'#a04adf',c2:'#6a2a9a',aku:1,boss:1,bsc:.55,tr:'#c46adf'},
 akumother:{p:'face',c:'#c46adf',aku:1,boss:1,bsc:.8,tr:'#c46adf'},
 akuhound:{p:'shiba',c:'#d86adf',c2:'#9a3aaa',aku:1,hound:1,tr:'#c46adf'},
 behemothcroc:{p:'croc',c:'#6ad4c4',behemoth:1,boss:1,bsc:.6,tr:'#6ad4c4'},
 behemothbear:{p:'bear',c:'#6ad4c4',behemoth:1,boss:1,bsc:.55,tr:'#6ad4c4'},
 witchen:{p:'witch',c:'#b07fd8',tr:'#c8a8ff'},
 snacheboss:{p:'snake',c:'#3a3a44',boss:1,bsc:.62,tr:'#454a58'},
 clionel:{p:'clione',c:'#d8a0e8',boss:1,bsc:.6,tr:'#c8a8ff'},
 dogedark:{p:'shiba',c:'#3a3a44',c2:'#2a2a34',dark:1,wiz:1,tr:'#454a58'},
 divadoge:{p:'shiba',c:'#f0c8d8',c2:'#e8a8c0',diva:1},
 titanice:{p:'alien',c:'#7fd8ff',ice:1,boss:1,bsc:.6,tr:'#7fd8ff'},
 cosmicdoge:{p:'shiba',c:'#7fd8ff',c2:'#54b0e0',alien:1,tr:'#7fd8ff'},
 staralien:{p:'alien',c:'#7fe8a8',ufo:1,boss:1,bsc:.6,tr:'#7fd8ff'},
 grizzlynuke:{p:'bear',c:'#e8a04a',behemoth:1,nuke:1,boss:1,bsc:.55,tr:'#6ad4c4'},
 akuhound2:{p:'shiba',c:'#e05adf',c2:'#a03aba',aku:1,fox:1,hound:1,tr:'#c46adf'},
 gory:{p:'bear',c:'#8a6a52',angry:1},
 wanwan:{p:'shiba',c:'#c8b890',c2:'#a89868'},
 owlbrow:{p:'dumpling',c:'#b8a88a',tr:'#c8a8ff'},
 camelle:{p:'sheep',c:'#d8c098'},
 mastera:{p:'bear',c:'#c8a878',angry:1,boss:1,bsc:.6},
 bore:{p:'boar',c:'#e0533f',m:'#f0a890',boss:1,bsc:.55,tr:'#ff7a6a'},
 kurosawah:{p:'catlord',c:'#3a3a44',boss:1,bsc:.62},
 gregor:{p:'alien',c:'#7fd8ff',ufo:1,boss:1,bsc:.6,tr:'#7fd8ff'},
 lesolar:{p:'clione',c:'#ffd98a',tr:'#7fd8ff'},
 spacefish:{p:'croc',c:'#5fa8e8',boss:1,bsc:.6,tr:'#7fd8ff'},
 projecta:{p:'mech',c:'#6a8a9a',boss:1,bsc:.6,tr:'#7fd8ff'},
 phace:{p:'face',c:'#a8d8e8',boss:1,bsc:.75,tr:'#7fd8ff'},
 dober:{p:'bear',c:'#4a5a6a',angry:1,boss:1,bsc:.55,tr:'#7fd8ff'},
 sael:{p:'catlord',c:'#7fd8ff',boss:1,bsc:.7,tr:'#7fd8ff'},
 elizabeth:{p:'witch',c:'#e8a8c8',boss:1,bsc:.6,tr:'#c8a8ff'},
 sunfish:{p:'clione',c:'#f2b04a',boss:1,bsc:.65,tr:'#7fd8ff'},
 celeboodle:{p:'shiba',c:'#f2d8b8',c2:'#e8c8a0',diva:1,alien:1,tr:'#7fd8ff'}};

/* ============================ CAT POSES ============================ */
const CP={
/* THE basic cat: big round :3 head, compact bean body, 4 stubby legs, thin curly tail */
kitten(c,t,d,a){const ph=a.ph,pk=a.pk||0;
  if(d.big)c.scale(1.12,1.12);
  if(d.tiny)c.scale(0.74,0.74);
  if(d.coin){c.save();c.translate(-10,-30);c.beginPath();c.arc(0,0,5.5,0,TAU);c.fillStyle='#ffd23f';c.fill();c.lineWidth=1.8;c.strokeStyle='#b07818';c.stroke();c.fillStyle='#b07818';setFont(c,'700 7px sans-serif');c.textAlign='center';c.textBaseline='middle';c.fillText('\u00a5',0,0.5);c.restore()}
  if(d.dance)c.translate(0,-Math.abs(Math.sin(t*12))*3);
  legs(c,[[-10,-13],[-4,-12],[5,-12],[10,-13]],ph,3.2);
  tube(c,()=>{c.moveTo(-13,-19);c.bezierCurveTo(-25,-21,-28,-34,-18,-39+Math.sin(t*6)*2)},2.6);
  fo(c,()=>{c.moveTo(-14,-10);c.quadraticCurveTo(-20,-19,-12,-29);c.quadraticCurveTo(-3,-37,7,-31);c.quadraticCurveTo(16,-25,13,-13);c.quadraticCurveTo(2,-4,-14,-10);c.closePath()},CATW);
  if(d.spots){c.fillStyle='#cdbb96';c.beginPath();c.arc(-6,-24,5.2,0,TAU);c.fill();c.beginPath();c.arc(6,-16,4,0,TAU);c.fill()}
  if(d.scarf)so(c,()=>{c.moveTo(-11,-29);c.quadraticCurveTo(-19,-27,-23+Math.sin(t*8)*2.5,-33)},2.8,'#c85a4a');
  if(d.acc==='axe'){c.save();c.translate(14,-24);c.rotate(-0.6-pk*1.3);
    tube(c,()=>{c.moveTo(0,4);c.lineTo(3,-24)},3.4,'#7a5c3e');
    fo(c,()=>{c.moveTo(1,-24);c.quadraticCurveTo(16,-27,15,-12);c.quadraticCurveTo(10,-17,2,-13);c.closePath()},'rgba(201,205,214,1)',2.8);
    fo(c,()=>{c.moveTo(2,-24);c.quadraticCurveTo(-8,-26,-6,-13);c.quadraticCurveTo(-1,-16,2,-13);c.closePath()},'rgba(201,205,214,1)',2.4);c.restore()}
  if(d.acc==='blade'){c.save();c.translate(14,-24);c.rotate(-0.35-pk*1.5);
    tube(c,()=>{c.moveTo(0,2);c.lineTo(2,-8)},3,'#7a5c3e');
    fo(c,()=>{c.moveTo(-1,-7);c.quadraticCurveTo(14,-12,21,-26);c.quadraticCurveTo(8,-18,-2,-14);c.closePath()},'rgba(223,228,236,1)',2.6);c.restore()}
  c.save();c.translate(5+pk*3,-45);c.rotate(-0.05+(d.dance?Math.sin(t*6)*0.07:0));
  if(d.horns)[-1,1].forEach(sg=>{fo(c,()=>{c.moveTo(sg*9,-10);c.quadraticCurveTo(sg*17,-13,sg*15,-20);c.quadraticCurveTo(sg*11,-14,sg*6,-14);c.closePath()},'rgba(233,226,207,1)',2)});
  head(c,14.5,{innerEar:1,happy:d.happy,blush:d.happy});
  if(d.hair==='afro'){fo(c,()=>{c.moveTo(-11,-4);c.arc(1,-8,11.5,Math.PI*0.85,Math.PI*2.15);c.closePath()},'rgba(58,48,40,1)',2.6);
    c.fillStyle='#3a3028';c.beginPath();c.arc(-9,-12,4,0,TAU);c.fill();c.beginPath();c.arc(0,-17,4.4,0,TAU);c.fill();c.beginPath();c.arc(9,-13,4,0,TAU);c.fill()}
  if(d.mask){fo(c,()=>rr(c,-14.5,2,29,8.5,4),'rgba(58,63,78,1)',2.2);
    so(c,()=>{c.moveTo(-14,4);c.lineTo(-20,1);c.moveTo(14,4);c.lineTo(20,1)},2,'rgba(58,63,78,1)')}
  if(d.hat==='sushi'){fo(c,()=>rr(c,-11,-21,20,7,3),'rgba(244,242,234,1)',2.4);
    fo(c,()=>rr(c,-11,-28,20,6.5,3),'rgba(232,112,90,1)',2.4);
    fo(c,()=>rr(c,-15,-24.5,6,11,2),'rgba(42,46,56,1)',2.2)}
  c.restore()},
/* Tank/Wall: cat peeking out of a concrete wall block, paws over the edge */
wall(c,t,d,a){
  if(d.tiny)c.scale(0.74,0.74);
  fo(c,()=>rr(c,-22,-42,44,42,6),'#b9c1cf',3);
  so(c,()=>{c.moveTo(-22,-28);c.lineTo(22,-28);c.moveTo(-22,-14);c.lineTo(22,-14)},2.2,'#9aa2b2');
  so(c,()=>{c.moveTo(-6,-42);c.lineTo(-6,-28);c.moveTo(10,-28);c.lineTo(10,-14);c.moveTo(-12,-14);c.lineTo(-12,0);c.moveTo(14,-14);c.lineTo(14,0)},2.2,'#9aa2b2');
  c.save();c.translate(0,-46);
  head(c,12.5,{innerEar:1,mouth:1});
  tube(c,()=>{c.moveTo(-12,6);c.quadraticCurveTo(-13.5,9,-12.5,12.5)},3.4);
  tube(c,()=>{c.moveTo(12,6);c.quadraticCurveTo(13.5,9,12.5,12.5)},3.4);
  c.restore()},
/* Gross: tall lanky cat, dangly arms, sway */
tall(c,t,d,a){const ph=a.ph;const sway=a.walk?Math.sin(t*4.5)*3:0;
  legs(c,[[-5,-17],[5,-17]],ph,3);
  tube(c,()=>{c.moveTo(-11,-40);c.quadraticCurveTo(-16,-29,-13,-19+ph*2)},2.8);
  tube(c,()=>{c.moveTo(11,-40);c.quadraticCurveTo(16,-29,13,-19-ph*2)},2.8);
  fo(c,()=>c.ellipse(sway*0.4,-33,12,20,0,0,TAU),CATW);
  c.save();c.translate(sway,-58);c.rotate(sway*0.012);head(c,12.5,{innerEar:1});c.restore()},
/* Titan/Can/Gao: huge chunky cat, thick limbs */
brute(c,t,d,a){const ph=a.ph;if(d.big)c.scale(1.13,1.13);
  legs(c,[[-10,-14],[10,-14]],ph,4.8);
  if(d.aura){c.strokeStyle='rgba(255,215,80,.9)';c.lineWidth=2.6;c.beginPath();c.arc(0,-36,43+wob(t,2.5),0,TAU);c.stroke();
    c.strokeStyle='rgba(255,215,80,.4)';c.beginPath();c.arc(0,-36,50+wob(t+2,3),0,TAU);c.stroke()}
  fo(c,()=>c.ellipse(0,-31,20,21,0,0,TAU),CATW);
  if(d.singlet)fo(c,()=>{c.moveTo(-18,-38);c.quadraticCurveTo(0,-45,18,-38);c.quadraticCurveTo(14,-23,0,-21);c.quadraticCurveTo(-14,-23,-18,-38);c.closePath()},'rgba(74,85,104,1)',2.6);
  if(d.armor){fo(c,()=>{c.moveTo(-14,-42);c.quadraticCurveTo(0,-49,14,-42);c.lineTo(10,-22);c.quadraticCurveTo(0,-18,-10,-22);c.closePath()},'rgba(232,200,106,1)',2.8);
    fo(c,()=>c.arc(-18,-42,6,0,TAU),'rgba(232,200,106,1)',2.4);fo(c,()=>c.arc(18,-42,6,0,TAU),'rgba(232,200,106,1)',2.4)}
  tube(c,()=>{c.moveTo(-17,-40);c.lineTo(-23,-22+ph*1.8)},4.6);
  tube(c,()=>{c.moveTo(17,-40);c.lineTo(23,-22-ph*1.8)},4.6);
  if(d.club){c.save();c.translate(23,-22);c.rotate(-0.5-a.pk*1.6);
    tube(c,()=>{c.moveTo(0,0);c.lineTo(0,-20)},3.6,'#7a5c3e');
    fo(c,()=>rr(c,-7,-34,14,15,4),'#9aa0ac',2.8);c.restore()}
  else if(d.gloves){fo(c,()=>c.arc(-23,-22+ph*1.8,6.5,0,TAU),'rgba(224,90,74,1)',2.6);fo(c,()=>c.arc(23,-22-a.ph*1.8,6.5,0,TAU),'rgba(224,90,74,1)',2.6);
    if(d.boots){fo(c,()=>rr(c,-15,-7,11,7,3),'rgba(224,90,74,1)',2.4);fo(c,()=>rr(c,4,-7,11,7,3),'rgba(224,90,74,1)',2.4)}}
  else{fo(c,()=>c.arc(-23,-22+ph*1.8,5,0,TAU),CATW,2.6);fo(c,()=>c.arc(23,-22-ph*1.8,5,0,TAU),CATW,2.6)}
  c.save();c.translate(0,-60);
  head(c,15,{innerEar:1,mouth:1,angry:d.angry});
  if(d.gloves)so(c,()=>{c.moveTo(-11,-13.5);c.lineTo(11,-13.5)},2.4,'#e05a4a');
  c.restore()},
/* Bird: winged cat with beak + tail feathers */
bird(c,t,d,a){
  so(c,()=>{c.moveTo(-4,-9);c.lineTo(-4.5,0);c.moveTo(5,-9);c.lineTo(5.5,0)},2.6);
  fo(c,()=>{c.moveTo(-10,-26);c.lineTo(-22,-31+wob(t,1.5));c.lineTo(-19,-21);c.closePath()},CATW,2.4);
  fo(c,()=>c.ellipse(0,-25,12.5,16,0,0,TAU),CATW);
  c.save();c.translate(-5,-30);c.rotate(-0.45-Math.sin(t*10)*0.3-(a.atk?0.8:0));
  fo(c,()=>c.ellipse(-8,0,11,5.5,0.12,0,TAU),'rgba(232,228,212,1)',2.6);c.restore();
  c.save();c.translate(2,-46);
  head(c,11.5,{innerEar:1});
  fo(c,()=>{c.moveTo(8,-2);c.lineTo(20,1);c.lineTo(8,5);c.closePath()},'rgba(232,160,74,1)',2.4);c.restore()},
/* Fish: fish body with cat head, wagging tail fin */
fish(c,t,d,a){
  so(c,()=>{c.moveTo(-4,-9);c.lineTo(-4,0);c.moveTo(6,-9);c.lineTo(6,0)},3);
  fo(c,()=>{c.moveTo(-18,-22);c.lineTo(-30,-30+wob(t,1.5));c.lineTo(-27,-13);c.closePath()},'rgba(216,212,198,1)',2.8);
  fo(c,()=>{c.moveTo(-7,-32);c.lineTo(-1,-41);c.lineTo(5,-32);c.closePath()},CATW,2.8);
  fo(c,()=>c.ellipse(-2,-22,19,12,0.03,0,TAU),CATW);
  c.save();c.translate(3,-18);c.rotate(Math.sin(t*8)*0.3);
  fo(c,()=>{c.moveTo(0,0);c.quadraticCurveTo(8,2,9,8);c.quadraticCurveTo(3,7,0,3);c.closePath()},'rgba(216,212,198,1)',2.2);c.restore();
  c.save();c.translate(13,-27);head(c,11,{innerEar:1});c.restore()},
/* Dragon/lizard: cat-headed dragon w/ snout, back spikes, optional wings */
dragon(c,t,d,a){const ph=a.ph;if(d.big)c.scale(1.18,1.18);
  if(d.wings){c.save();c.translate(-4,-38);c.rotate(-0.35+Math.sin(t*8)*0.18-(a.atk?0.5:0));
    fo(c,()=>{c.moveTo(0,0);c.quadraticCurveTo(-6,-24,-24,-27);c.quadraticCurveTo(-16,-12,-18,-2);c.quadraticCurveTo(-8,-6,0,0);c.closePath()},d.dark?'#5a5a6c':'rgba(230,226,212,1)',2.8);
    so(c,()=>{c.moveTo(-4,-4);c.lineTo(-14,-16);c.moveTo(-9,-3);c.lineTo(-17,-9)},1.8,d.dark?'#3a3a46':'#c8c4b4');c.restore()}
  tube(c,()=>{c.moveTo(-16,-25);c.quadraticCurveTo(-32,-28,-36,-42+wob(t,2))},4,d.dark?'#4a4a58':CATW);
  fo(c,()=>{c.moveTo(-30,-40);c.lineTo(-40,-46);c.lineTo(-31,-47);c.closePath()},d.dark?'#4a4a58':CATW,2.2);
  legs(c,[[-12,-16],[-5,-14],[7,-14],[13,-16]],ph,3.2,d.dark?'#4a4a58':CATW);
  fo(c,()=>c.ellipse(0,-26,20,13.5,0,0,TAU),d.dark?'#4a4a58':CATW);
  if(d.dark){so(c,()=>{c.moveTo(-12,-20);c.quadraticCurveTo(0,-16,12,-20)},2,'rgba(255,255,255,.25)');
    so(c,()=>{c.moveTo(-13,-14);c.quadraticCurveTo(0,-10,13,-14)},2,'rgba(255,255,255,.25)')}
  else{fo(c,()=>{c.moveTo(-14,-33);c.lineTo(-10,-39);c.lineTo(-6,-33);c.closePath()},CATW,2.2);
    fo(c,()=>{c.moveTo(-5,-36);c.lineTo(-1,-42);c.lineTo(3,-36);c.closePath()},CATW,2.2)}
  c.save();c.translate(17,-44);c.rotate(0.05);
  fo(c,()=>{c.moveTo(-4,-10);c.quadraticCurveTo(-11,-16,-9,-23);c.lineTo(-2,-13);c.closePath()},'rgba(232,228,216,1)',2.2);
  fo(c,()=>{c.moveTo(4,-11);c.quadraticCurveTo(1,-19,7,-23);c.lineTo(8,-13);c.closePath()},'rgba(232,228,216,1)',2.2);
  fo(c,()=>c.arc(0,0,12.5,0,TAU),d.dark?'#4a4a58':CATW);
  face(c,12.5,{nomouth:1});
  fo(c,()=>c.ellipse(9,3,7.5,5.5,0.1,0,TAU),d.dark?'#4a4a58':CATW,2.6);
  c.fillStyle=OUT;c.beginPath();c.arc(14.5,1.5,1.4,0,TAU);c.fill();
  if(d.crown){c.fillStyle='rgba(255,217,74,.95)';c.beginPath();c.moveTo(-8,-10.5);c.lineTo(-8,-17);c.lineTo(-4,-13);c.lineTo(0,-18.5);c.lineTo(4,-13);c.lineTo(8,-17);c.lineTo(8,-10.5);c.closePath();c.fill();
    c.strokeStyle=OUT;c.lineWidth=2;c.stroke()}
  c.restore()},
/* Lugas: tall wobbly stringy body, tiny head (Nekoluga / Luza) */
luga(c,t,d,a){const sway=a.walk?Math.sin(t*3.6)*4:0;
  fo(c,()=>{c.moveTo(-8,0);c.quadraticCurveTo(-14,-34,-4+sway,-58);c.lineTo(7+sway,-56);c.quadraticCurveTo(14,-28,7,0);c.closePath()},CATW);
  if(!d.legend){tube(c,()=>{c.moveTo(-8,-40);c.quadraticCurveTo(-13,-32,-12,-22+Math.sin(t*5)*1.5)},2.2);
    tube(c,()=>{c.moveTo(8,-40);c.quadraticCurveTo(13,-32,12,-22-Math.sin(t*5)*1.5)},2.2)}
  if(d.staff){tube(c,()=>{c.moveTo(13,-30);c.lineTo(21,-72)},3,'#7a5c3e');
    fo(c,()=>{c.moveTo(21,-79);c.lineTo(23.5,-72.5);c.lineTo(30,-70);c.lineTo(23.5,-67.5);c.lineTo(21,-61);c.lineTo(18.5,-67.5);c.lineTo(12,-70);c.lineTo(18.5,-72.5);c.closePath()},'rgba(255,217,74,.95)',2.2)}
  c.save();c.translate(2+sway,-66);c.rotate(sway*0.02);
  if(d.horns)[-1,1].forEach(sg=>{fo(c,()=>{c.moveTo(sg*6,-8);c.quadraticCurveTo(sg*16,-14,sg*12,-25);c.quadraticCurveTo(sg*10,-14,sg*2,-11);c.closePath()},'rgba(233,226,207,1)',2.2)});
  head(c,d.legend?12:11,{innerEar:1});
  c.restore()},
/* Biped: upright cat (Mr./Kung Fu/Pirate/Witch/Guitar/Cyborg/Seafarer/Paladin/Medusa/Catman/Kaguya/Pogo) */
biped(c,t,d,a){const ph=a.ph;const lean=(d.swagger||d.fist)?0.06:0;
  if(d.cape)fo(c,()=>{c.moveTo(-7,-44);c.quadraticCurveTo(-27,-30,-16+Math.sin(t*6)*3.5,-5);c.lineTo(-3,-16);c.closePath()},'rgba(138,90,223,.95)',2.8);
  if(d.pogo){tube(c,()=>{c.moveTo(-5.5,-12);c.lineTo(-6.5+ph,-3)},3);tube(c,()=>{c.moveTo(5.5,-12);c.lineTo(6.5-ph,-3)},3);
    tube(c,()=>{c.moveTo(1,-11);c.lineTo(1,9)},3,'#6a7488');
    so(c,()=>{c.moveTo(-5,-11);c.lineTo(7,-11)},3,'#6a7488');
    so(c,()=>{c.moveTo(-3,1);c.lineTo(5,3);c.moveTo(-3,5);c.lineTo(5,7)},2,'#8a94a8')}
  else legs(c,[[-5.5,-14],[5.5,-14]],ph,3);
  tube(c,()=>{c.moveTo(-9,-27);c.bezierCurveTo(-20,-31,-22,-42,-14,-44)},3);
  so(c,()=>c.arc(-13,-45,2.2,Math.PI*0.4,Math.PI*1.8),3);
  fo(c,()=>c.ellipse(lean*8,-29,11.5,15.5,lean,0,0,TAU),CATW);
  tube(c,()=>{c.moveTo(-9,-36);c.lineTo(-12,-25+ph*2)},2.8);
  if(d.shield){c.save();c.translate(-13,-30);fo(c,()=>c.ellipse(0,0,5.5,8.5,0.15,0,TAU),'rgba(216,222,232,1)',2.4);
    c.fillStyle='#e05a4a';c.beginPath();c.arc(0,0,2,0,TAU);c.fill();c.restore()}
  if(d.belt)fo(c,()=>rr(c,-11.5,-24,23,5,2),'rgba(200,90,74,1)',2.2);
  if(d.acc==='gun'){c.save();c.translate(9,-36);c.rotate(-0.15-a.pk*0.5);
    tube(c,()=>{c.moveTo(0,0);c.lineTo(3,9)},2.8);
    fo(c,()=>rr(c,1,-3,17,6,2),'#3a3f4e',2.4);
    fo(c,()=>{c.moveTo(18,-5.5);c.lineTo(25,-7.5);c.lineTo(25,5.5);c.lineTo(18,3.5);c.closePath()},'#3a3f4e',2.4);c.restore()}
  else if(d.scope){c.save();c.translate(9,-34);c.rotate(-0.5-a.pk*0.4);
    tube(c,()=>{c.moveTo(0,0);c.lineTo(13,-7)},2.8);
    fo(c,()=>rr(c,11,-10.5,6,7,2),'#3a3f4e',2);c.restore()}
  else if(d.staff){c.save();c.translate(10,-34);c.rotate(-0.1);
    tube(c,()=>{c.moveTo(0,6);c.lineTo(4,-22)},2.8,'#7a5c3e');
    fo(c,()=>{c.moveTo(4,-24);c.quadraticCurveTo(11,-27,10,-34);c.quadraticCurveTo(6,-27,1,-30);c.quadraticCurveTo(0,-26,4,-24);c.closePath()},'rgba(176,127,216,.95)',2.2);c.restore()}
  else if(d.acc==='guitar'){so(c,()=>{c.moveTo(-8,-42);c.lineTo(11,-25)},2.6,'#8a5a3a');
    c.save();c.translate(12,-26);c.rotate(0.7);
    fo(c,()=>c.ellipse(0,8,6.5,8.5,0,0,TAU),'rgba(200,122,74,1)',2.6);
    c.fillStyle='#5a3a24';c.beginPath();c.arc(0,8,2.4,0,TAU);c.fill();
    tube(c,()=>{c.moveTo(0,1);c.lineTo(0,-12)},2.6,'#8a5a3a');c.restore()}
  else if(d.fist){fo(c,()=>c.arc(11,-33-a.pk*4,4.4,0,TAU),CATW,2.6)}
  else{c.save();c.translate(9,-36);c.rotate(0.45-a.pk*1.5);tube(c,()=>{c.moveTo(0,0);c.lineTo(3,10)},2.8);c.restore()}
  if(d.armor){fo(c,()=>{c.moveTo(-10,-40);c.lineTo(10,-40);c.lineTo(7,-21);c.quadraticCurveTo(0,-17,-7,-21);c.closePath()},'rgba(216,222,232,1)',2.8);
    fo(c,()=>c.arc(11,-39,5,0,TAU),'rgba(216,222,232,1)',2.4)}
  if(d.cyborg){fo(c,()=>rr(c,7,-42,14,8,3),'#8a94a8',2.6);c.fillStyle='#ff6a5a';c.beginPath();c.arc(-1,-30,2.6,0,TAU);c.fill()}
  c.save();c.translate(0,-55);
  if(d.band){so(c,()=>{c.moveTo(-12.5,-4.5);c.quadraticCurveTo(0,-7.5,12.5,-4.5)},3,'#e05a4a');
    so(c,()=>{c.moveTo(-12,-5);c.quadraticCurveTo(-18,-3,-20+Math.sin(t*9)*2,1)},2.2,'#e05a4a')}
  head(c,13,{innerEar:1,glass:d.glass});
  if(d.mask){fo(c,()=>rr(c,-10.5,-4.5,21,6,3),'rgba(42,46,56,1)',2);
    c.fillStyle='#fff';c.beginPath();c.arc(-4.5,-1.5,1.6,0,TAU);c.fill();c.beginPath();c.arc(4.5,-1.5,1.6,0,TAU);c.fill()}
  if(d.snakes){for(let i=0;i<4;i++)so(c,()=>{c.moveTo(-8+i*5.2,-11);c.quadraticCurveTo(-11+i*5.2,-20,-5+i*5.2+Math.sin(t*7+i)*2.5,-24)},2.4,'#7fae4a')}
  if(d.hat==='witch'){fo(c,()=>c.ellipse(0,-10.5,15,3.6,0,0,TAU),'rgba(74,53,104,1)',2.6);
    fo(c,()=>{c.moveTo(-7,-11);c.quadraticCurveTo(1,-15,3,-11);c.quadraticCurveTo(3,-20,1.5,-27);c.closePath()},'rgba(74,53,104,1)',2.6);
    c.fillStyle='#ffd94a';c.beginPath();c.arc(1.8,-17,1.5,0,TAU);c.fill()}
  if(d.hat==='pirate'){fo(c,()=>{c.moveTo(-13.5,-8);c.quadraticCurveTo(0,-24,13.5,-8);c.quadraticCurveTo(0,-12.5,-13.5,-8);c.closePath()},'rgba(42,46,56,1)',2.6);
    c.fillStyle='#f4f2ea';c.beginPath();c.arc(0,-14.5,1.8,0,TAU);c.fill()}
  if(d.hat==='sailor'){fo(c,()=>c.arc(0,-6,12,Math.PI,0),'rgba(244,242,234,1)',2.6);
    fo(c,()=>rr(c,-12,-8.5,24,3.5,1.5),'rgba(58,90,138,1)',2)}
  if(d.hat==='princess'){so(c,()=>{c.moveTo(-12,-4);c.quadraticCurveTo(-17,8,-13,18)},2.6,'#3a3440');
    so(c,()=>{c.moveTo(12,-4);c.quadraticCurveTo(17,8,13,18)},2.6,'#3a3440');
    fo(c,()=>{c.moveTo(-6,-13.5);c.lineTo(0,-20);c.lineTo(6,-13.5);c.closePath()},'rgba(255,90,138,.9)',2)}
  if(d.cyborg){fo(c,()=>rr(c,-11,-6.5,22,7.5,3),'#8a94a8',2.2);c.fillStyle='#ff5a4a';c.beginPath();c.arc(4,-2.8,2.2,0,TAU);c.fill()}
  if(d.mohawk){fo(c,()=>{c.moveTo(-8,-11);c.quadraticCurveTo(-2,-27,8,-12);c.quadraticCurveTo(0,-16,-8,-11);c.closePath()},'rgba(224,90,138,.95)',2.4)}
  c.restore()},
/* Slime: green slime dome with cat ears + :3 face directly on the blob */
blob(c,t,d,a){const w2=Math.sin(t*7)*2;
  [-1,1].forEach(sg=>{fo(c,()=>{c.moveTo(sg*7,-21+w2*0.4);c.lineTo(sg*11.5,-33+w2*0.4);c.lineTo(sg*2.5,-26+w2*0.4);c.closePath()},'rgba(168,232,200,1)',2.4)});
  fo(c,()=>{c.moveTo(-17,0);c.quadraticCurveTo(-22,-26+w2,0,-27+w2*0.5);c.quadraticCurveTo(22,-26+w2,17,0);c.closePath()},'rgba(168,232,200,1)',3);
  so(c,()=>{c.moveTo(-11,-19);c.quadraticCurveTo(-14,-22,-13,-25)},2,'rgba(255,255,255,.75)');
  so(c,()=>{c.moveTo(6,-22);c.quadraticCurveTo(8,-24,8,-26)},1.6,'rgba(255,255,255,.6)');
  c.save();c.translate(0,-13);face(c,11.5,{});c.restore()},
/* Mecha-Bun: robot bunny w/ tread base + rocket arm */
mech(c,t,d,a){
  fo(c,()=>rr(c,-16,-40,32,28,8),'#9aa6b8',3);
  so(c,()=>{c.moveTo(-16,-31);c.lineTo(16,-31)},2,'#7a8698');
  c.save();c.translate(14,-36);c.rotate(0.5-a.pk*1.2);
  fo(c,()=>rr(c,0,-4,14,8,3),'#8a94a8',2.4);
  c.fillStyle='#ff6a5a';c.beginPath();c.moveTo(14,-4);c.lineTo(20,0);c.lineTo(14,4);c.closePath();c.fill();c.restore();
  fo(c,()=>rr(c,-18,-12,36,12,5),'#3a3f4e',2.6);
  [-10,0,10].forEach(x=>{c.fillStyle='#6a7488';c.beginPath();c.arc(x,-6,3.4,0,TAU);c.fill()});
  c.save();c.translate(0,-52);
  c.save();c.translate(-7,-7);c.rotate(-0.14);fo(c,()=>rr(c,-3,-17,6,17,3),'#9aa6b8',2.4);c.restore();
  c.save();c.translate(7,-7);c.rotate(0.14);fo(c,()=>rr(c,-3,-17,6,17,3),'#9aa6b8',2.4);c.restore();
  fo(c,()=>rr(c,-12,-9,24,19,6),'#aab4c4',3);
  fo(c,()=>rr(c,-8,-3,16,6.5,3),'#2a2e38',2);c.fillStyle='#ff6a5a';c.beginPath();c.arc(0,0.2,2.4,0,TAU);c.fill();
  c.restore()},
/* Noble/Warlord: armored samurai cat */
samurai(c,t,d,a){
  legs(c,[[-5.5,-14],[5.5,-14]],a.ph,3);
  fo(c,()=>{c.moveTo(-12,-16);c.lineTo(-13,-36);c.quadraticCurveTo(0,-42,13,-36);c.lineTo(12,-16);c.quadraticCurveTo(0,-12,-12,-16);c.closePath()},'rgba(74,88,120,1)',3);
  so(c,()=>{c.moveTo(-12,-27);c.lineTo(12,-27);c.moveTo(-11.5,-22);c.lineTo(11.5,-22)},1.8,'#2e3852');
  c.save();c.translate(0,-56);
  head(c,12.5,{innerEar:1});
  fo(c,()=>c.arc(0,-6,13.5,Math.PI,0),'rgba(58,68,94,1)',2.8);
  fo(c,()=>{c.moveTo(0,-18);c.quadraticCurveTo(-6.5,-25,0,-28);c.quadraticCurveTo(6.5,-25,0,-18);c.closePath()},'rgba(255,217,74,.95)',2.2);
  c.restore();
  c.save();c.translate(11,-32);c.rotate(0.5-a.pk*1.8);
  fo(c,()=>{c.moveTo(0,-2);c.lineTo(26,-8);c.lineTo(27,-5);c.lineTo(1,2);c.closePath()},'rgba(223,228,236,1)',2.4);
  c.fillStyle='#3a3f4e';c.beginPath();c.arc(0,0,3,0,TAU);c.fill();
  tube(c,()=>{c.moveTo(-1,1);c.lineTo(-9,5)},2.6,'#2a2e38');c.restore()},
/* Rock: boulder golem cat */
rock(c,t,d,a){
  tube(c,()=>{c.moveTo(-14,-18);c.lineTo(-20,-8)},3.4,'#a4aab6');
  tube(c,()=>{c.moveTo(14,-20);c.lineTo(20,-10)},3.4,'#a4aab6');
  fo(c,()=>{c.moveTo(-19,0);c.lineTo(-16,-30);c.lineTo(-4,-40);c.lineTo(12,-36);c.lineTo(18,-16);c.lineTo(15,0);c.closePath()},'rgba(164,170,182,1)',3);
  fo(c,()=>{c.moveTo(-6,-40);c.quadraticCurveTo(4,-47,12,-36);c.quadraticCurveTo(4,-38,-6,-40);c.closePath()},'rgba(143,184,106,.95)',2.2);
  so(c,()=>{c.moveTo(-12,-26);c.lineTo(-8,-18);c.lineTo(-11,-12)},1.8,'#8a909c');
  so(c,()=>{c.moveTo(8,-32);c.lineTo(11,-24)},1.8,'#8a909c');
  c.fillStyle=OUT;c.beginPath();c.arc(-2,-22,1.9,0,TAU);c.fill();c.beginPath();c.arc(8,-23,1.9,0,TAU);c.fill();
  so(c,()=>{c.moveTo(-1,-17);c.quadraticCurveTo(1,-15,3,-16);c.quadraticCurveTo(5,-15,7,-16)},1.8)}
};

/* ============================ ENEMY POSES ============================ */
const EP={
/* Doge & family: shiba w/ curled tail, saddle, open mouth + tongue */
shiba(c,t,d,a){const ph=a.ph;
  if(d.ghost)c.globalAlpha*=0.85;
  if(d.hound){legs(c,[[-9,-10],[-2,-9],[7,-9],[12,-10]],ph,3.6,d.c);
    fo(c,()=>{c.moveTo(-8,-26);c.quadraticCurveTo(-15,-34,-8,-41);c.quadraticCurveTo(-9,-33,-2,-36);c.quadraticCurveTo(-6,-30,2,-32);c.quadraticCurveTo(-4,-28,-2,-25);c.closePath()},d.aku?'rgba(160,58,186,.9)':'rgba(255,138,74,.9)',2.2)}
  else if(d.ghost){so(c,()=>{c.moveTo(-11,-12);c.quadraticCurveTo(-14,-6,-10+Math.sin(t*7)*2.5,-1);
    c.moveTo(-2,-11);c.quadraticCurveTo(-4,-5,1,-1+Math.sin(t*6+1)*2);
    c.moveTo(7,-10);c.quadraticCurveTo(8,-5,12,-2)},3.2,d.c)}
  else legs(c,[[-10,-14],[-4,-13],[6,-13],[11,-14]],ph,3,d.c);
  c.save();c.translate(-14,-26);c.rotate(wob(t,0.12));
  if(d.fox){fo(c,()=>{c.moveTo(0,0);c.quadraticCurveTo(-13,-3,-15,-15);c.quadraticCurveTo(-12,-22,-4,-19);c.quadraticCurveTo(-9,-11,3,-7);c.closePath()},d.c,2.6);
    fo(c,()=>c.arc(-12.5,-18,3.2,0,TAU),'rgba(251,248,239,1)',1.8)}
  else{fo(c,()=>c.arc(0,-3,5.4,Math.PI*0.85,Math.PI*2.4),d.c2||d.c,2.6);
    c.fillStyle=d.c2||d.c;c.beginPath();c.arc(-3.6,-6.6,2.3,0,TAU);c.fill()}
  c.restore();
  fo(c,()=>c.ellipse(0,-20,15.5,11,0.04,0,TAU),d.c);
  fo(c,()=>{c.moveTo(-10,-27.5);c.quadraticCurveTo(-1,-33,8,-27.5);c.quadraticCurveTo(3,-22.5,-3,-23.5);c.quadraticCurveTo(-8,-23.5,-10,-27.5);c.closePath()},d.c2||d.c,2);
  if(d.metal){so(c,()=>{c.moveTo(-12,-19);c.lineTo(12,-19)},1.8,'rgba(255,255,255,.6)');
    c.fillStyle='#76889a';c.beginPath();c.arc(-9,-15,1.3,0,TAU);c.fill();c.beginPath();c.arc(9,-14,1.3,0,TAU);c.fill()}
  if(d.relic){c.save();c.setLineDash([5,4]);c.lineDashOffset=-t*12;
    so(c,()=>c.arc(0,-21,22,0,TAU),2,'#b89a4a');c.setLineDash([]);c.restore()}
  if(d.aku&&!d.hound)fo(c,()=>{c.moveTo(-6,-29);c.quadraticCurveTo(-18,-33,-15,-45);c.quadraticCurveTo(-10,-38,-3,-42);c.quadraticCurveTo(-8,-35,1,-31);c.closePath()},'rgba(58,20,64,.9)',2.2);
  c.save();c.translate(11,-37);c.rotate(-0.04+(d.hound?-0.1:0));
  if(d.alien){so(c,()=>{c.moveTo(-5,-11);c.lineTo(-8,-18)},2,'#54c888');so(c,()=>{c.moveTo(5,-11);c.lineTo(8,-18)},2,'#54c888')}
  if(d.aku){fo(c,()=>{c.moveTo(-8,-9);c.quadraticCurveTo(-14,-16,-10,-21);c.lineTo(-4,-12);c.closePath()},'rgba(58,20,64,1)',2);
    fo(c,()=>{c.moveTo(8,-9);c.quadraticCurveTo(14,-16,10,-21);c.lineTo(4,-12);c.closePath()},'rgba(58,20,64,1)',2)}
  head(c,12.5,{ears:d.fox?'fox':'cat',c:d.c,snout:d.m||'#fbf3e3',nose:1,open:1,tongue:1,ec:d.dark?'#c46adf':undefined,blush:d.diva?1:0});
  if(d.alien){c.fillStyle='#8af0b8';c.beginPath();c.arc(-8,-19,2,0,TAU);c.fill();c.beginPath();c.arc(8,-19,2,0,TAU);c.fill()}
  if(d.diva){fo(c,()=>{c.moveTo(-11,-11);c.lineTo(-15,-16.5);c.lineTo(-6.5,-15);c.closePath()},'rgba(255,90,138,.9)',1.8);
    fo(c,()=>{c.moveTo(11,-11);c.lineTo(15,-16.5);c.lineTo(6.5,-15);c.closePath()},'rgba(255,90,138,.9)',1.8)}
  if(d.wiz){fo(c,()=>c.ellipse(0,-11,13.5,3.2,0,0,TAU),'rgba(74,53,104,1)',2.4);
    fo(c,()=>{c.moveTo(-7,-12);c.lineTo(2,-30);c.quadraticCurveTo(5,-20,7,-12);c.closePath()},'rgba(74,53,104,1)',2.4);
    c.fillStyle='#ffd94a';c.beginPath();c.arc(2,-18,1.5,0,TAU);c.fill()}
  c.restore();
  if(d.dark&&a.atk)so(c,()=>{c.moveTo(-24,-14);c.quadraticCurveTo(-18,-26,-24,-36)},2.4,'rgba(196,106,223,.7)')},
/* Snache: coiled snake, raised head, fangs + forked tongue */
snake(c,t,d,a){const sw=a.walk?Math.sin(t*6):0;
  fo(c,()=>c.ellipse(0,-6,16,7,0,0,TAU),d.c,2.8);
  fo(c,()=>c.ellipse(-3,-13,12,6,0,0,TAU),d.c,2.8);
  if(d.boss){fo(c,()=>{c.moveTo(-14,-10);c.lineTo(-11,-17);c.lineTo(-7,-9);c.closePath()},d.c,2);
    fo(c,()=>{c.moveTo(-4,-16);c.lineTo(-1,-23);c.lineTo(3,-15);c.closePath()},d.c,2)}
  tube(c,()=>{c.moveTo(4,-16);c.quadraticCurveTo(10,-24,7,-32)},5.5,d.c);
  c.save();c.translate(9,-38);c.rotate(0.1+sw*0.04);
  fo(c,()=>c.ellipse(1,0,10,7.5,0.08,0,TAU),d.c,2.8);
  c.fillStyle='#fbf8ef';c.beginPath();c.arc(-1,-2,2.8,0,TAU);c.fill();c.beginPath();c.arc(5.5,-1.4,2.6,0,TAU);c.fill();
  c.fillStyle=d.boss?'#ff5a4a':OUT;c.beginPath();c.arc(-0.6,-2,1.4,0,TAU);c.fill();c.beginPath();c.arc(5.8,-1.2,1.3,0,TAU);c.fill();
  c.fillStyle='#fbf8ef';c.beginPath();c.moveTo(2,4.5);c.lineTo(3,8);c.lineTo(4.2,4.5);c.closePath();c.fill();
  c.beginPath();c.moveTo(6.5,4.2);c.lineTo(7.5,7.5);c.lineTo(8.6,4);c.closePath();c.fill();
  so(c,()=>{c.moveTo(10.5,2.5);c.lineTo(16,2.5);c.moveTo(16,2.5);c.lineTo(18.5,1);c.moveTo(16,2.5);c.lineTo(18.5,4)},1.6,'#e05a6a');
  c.restore()},
/* Those Guys: trio of tiny round goons */
guys(c,t,d,a){for(let i=0;i<3;i++){const hx=(i-1)*15,hy=-12-(i===1?13:2)+Math.sin(t*5+i*2)*2;
  c.save();c.translate(hx,hy);
  so(c,()=>{c.moveTo(-2.5,1);c.lineTo(-2.5,5);c.moveTo(2.5,1);c.lineTo(2.5,5)},2);
  fo(c,()=>c.arc(0,-5,7.5,0,TAU),d.c,2.6);
  c.fillStyle=OUT;c.beginPath();c.arc(-2.6,-6.5,1.2,0,TAU);c.fill();c.beginPath();c.arc(2.6,-6.5,1.2,0,TAU);c.fill();
  so(c,()=>{c.moveTo(-2,-2.6);c.quadraticCurveTo(-1,-1.4,0,-2.6);c.quadraticCurveTo(1,-1.4,2,-2.6)},1.4);
  if(i===1)so(c,()=>{c.moveTo(-4.4,-9);c.lineTo(-1,-7.8);c.moveTo(4.4,-9);c.lineTo(1,-7.8)},1.4);
  c.restore()}},
/* Baa Baa: cloud sheep w/ grey face */
sheep(c,t,d,a){const ph=a.ph;
  legs(c,[[-9,-9],[-4,-9],[5,-9],[10,-9]],ph,2.4,'#5a6472');
  fo(c,()=>{c.moveTo(-16,-10);c.quadraticCurveTo(-23,-20,-13,-26);c.quadraticCurveTo(-7,-33,2,-28);c.quadraticCurveTo(12,-33,15,-23);c.quadraticCurveTo(21,-14,13,-10);c.quadraticCurveTo(0,-6,-16,-10);c.closePath()},d.c,2.8);
  fo(c,()=>c.arc(5,-25,4.5,0,TAU),d.c,2);
  fo(c,()=>c.ellipse(11,-15,6,7.5,0.12,0,TAU),'#5a6472',2.4);
  c.fillStyle='#fbf8ef';c.beginPath();c.arc(9.4,-17,1.7,0,TAU);c.fill();c.beginPath();c.arc(13.4,-16.4,1.7,0,TAU);c.fill();
  c.fillStyle=OUT;c.beginPath();c.arc(9.6,-17,0.8,0,TAU);c.fill();c.beginPath();c.arc(13.6,-16.4,0.8,0,TAU);c.fill();
  so(c,()=>{c.moveTo(10.5,-12.5);c.quadraticCurveTo(11.8,-11.4,13,-12.5)},1.3)},
/* Jackie Peng: penguin w/ flippers + orange beak/feet */
penguin(c,t,d,a){
  fo(c,()=>rr(c,-9,-4,7,4.5,2),'rgba(232,160,74,1)',2);fo(c,()=>rr(c,3,-4,7,4.5,2),'rgba(232,160,74,1)',2);
  c.save();c.translate(-12,-27);c.rotate(-0.3+Math.sin(t*8)*0.15-(a.atk?0.6:0));
  fo(c,()=>c.ellipse(-5,0,7,3.5,0.1,0,TAU),d.c,2.4);c.restore();
  c.save();c.translate(12,-27);c.rotate(0.3-Math.sin(t*8)*0.15+(a.atk?0.6:0));
  fo(c,()=>c.ellipse(5,0,7,3.5,-0.1,0,TAU),d.c,2.4);c.restore();
  fo(c,()=>c.ellipse(0,-24,14,19,0,0,TAU),d.c,3);
  fo(c,()=>c.ellipse(2,-20,8.5,13.5,0,0,TAU),'#f4f2ea',2.2);
  so(c,()=>{c.moveTo(-3,-42);c.lineTo(-4,-46);c.moveTo(2,-42);c.lineTo(2,-47)},2,d.c);
  c.fillStyle=OUT;c.beginPath();c.arc(5,-36,1.9,0,TAU);c.fill();c.beginPath();c.arc(11.5,-34.5,1.9,0,TAU);c.fill();
  fo(c,()=>{c.moveTo(8.5,-32);c.lineTo(19,-29.5);c.lineTo(8.5,-27);c.closePath()},'rgba(232,160,74,1)',2)},
/* Hippoe family: round barrel hippo w/ huge snout */
hippo(c,t,d,a){const ph=a.ph;
  legs(c,[[-16,-12],[-7,-11],[7,-11],[14,-12]],ph,4.4,d.c);
  so(c,()=>{c.moveTo(-24,-18);c.quadraticCurveTo(-28,-14,-25,-10)},2.2,d.c);
  fo(c,()=>c.ellipse(-3,-24,22,16,0,0,TAU),d.c,3);
  fo(c,()=>rr(c,8,-44,27,26,11),d.c,3);
  fo(c,()=>c.arc(14,-45,3,0,TAU),d.c,2);fo(c,()=>c.arc(25,-46,3,0,TAU),d.c,2);
  c.fillStyle=OUT;c.beginPath();c.arc(17,-37,1.9,0,TAU);c.fill();c.beginPath();c.arc(25,-37,1.9,0,TAU);c.fill();
  fo(c,()=>rr(c,24,-38,14,18,7),d.m||'#d8c8e0',2.6);
  c.fillStyle=OUT;c.beginPath();c.arc(29,-32,1.6,0,TAU);c.fill();c.beginPath();c.arc(34,-33,1.6,0,TAU);c.fill();
  if(d.metal){so(c,()=>{c.moveTo(-21,-20);c.lineTo(12,-20)},1.8,'rgba(255,255,255,.55)');
    c.fillStyle='#6a8090';c.beginPath();c.arc(-12,-30,1.5,0,TAU);c.fill();c.beginPath();c.arc(0,-36,1.5,0,TAU);c.fill()}
  if(d.relic){so(c,()=>{c.moveTo(-14,-30);c.lineTo(-8,-26);c.moveTo(-8,-30);c.lineTo(-14,-26)},1.8,'#8a6a2a');
    so(c,()=>{c.moveTo(-2,-18);c.lineTo(4,-14);c.lineTo(0,-10)},1.8,'#8a6a2a')}},
/* Sir Seal: plump seal w/ blue beret + whiskers */
seal(c,t,d,a){
  fo(c,()=>{c.moveTo(-19,0);c.quadraticCurveTo(-24,-30,-6,-38);c.quadraticCurveTo(14,-43,20,-26);c.quadraticCurveTo(24,-11,18,0);c.closePath()},d.c,3);
  fo(c,()=>c.ellipse(6,-13,7.5,10,0.1,0,TAU),'#ece8da',2.2);
  fo(c,()=>{c.moveTo(-19,-8);c.lineTo(-26,-2);c.lineTo(-17,-3);c.closePath()},d.c,2.2);
  tube(c,()=>{c.moveTo(8,-18);c.lineTo(14,-4)},3,d.c);
  tube(c,()=>{c.moveTo(1,-16);c.lineTo(7,-2)},3,d.c);
  c.fillStyle=OUT;c.beginPath();c.arc(9,-32,1.9,0,TAU);c.fill();c.beginPath();c.arc(16,-30,1.9,0,TAU);c.fill();
  c.fillStyle=OUT;c.beginPath();c.arc(21,-24,1.5,0,TAU);c.fill();
  so(c,()=>{c.moveTo(18,-22);c.lineTo(24,-20);c.moveTo(18,-19);c.lineTo(24,-16);c.moveTo(20,-26);c.lineTo(26,-25)},1.4);
  fo(c,()=>{c.moveTo(-3,-41);c.quadraticCurveTo(7,-52,19,-44);c.quadraticCurveTo(10,-37,-3,-41);c.closePath()},'rgba(42,74,138,1)',2.6);
  so(c,()=>{c.moveTo(8,-48);c.lineTo(9,-51)},2,'#2a4a8a')},
/* Dudorian: steamed dumpling w/ pleats + steam */
dumpling(c,t,d,a){
  fo(c,()=>c.arc(0,-15,15.5,0,TAU),d.c,3);
  so(c,()=>{c.moveTo(0,-30.5);c.lineTo(-6,-22);c.moveTo(0,-30.5);c.lineTo(0,-21);c.moveTo(0,-30.5);c.lineTo(6,-22);c.moveTo(-4,-29);c.lineTo(-10,-22)},1.8,'#d8c4a4');
  c.fillStyle=OUT;c.beginPath();c.arc(-5,-15,1.8,0,TAU);c.fill();c.beginPath();c.arc(6,-15,1.8,0,TAU);c.fill();
  so(c,()=>{c.moveTo(-3,-11);c.quadraticCurveTo(-1.5,-9.4,0,-11);c.quadraticCurveTo(1.5,-9.4,3,-11)},1.6);
  tube(c,()=>{c.moveTo(-14,-16);c.lineTo(-18,-9)},2.6,d.c);
  tube(c,()=>{c.moveTo(14,-16);c.lineTo(18,-9)},2.6,d.c);
  so(c,()=>{c.moveTo(-4,-38);c.quadraticCurveTo(-7,-44,-3,-49)},1.6,'rgba(255,255,255,.75)');
  so(c,()=>{c.moveTo(5,-37);c.quadraticCurveTo(8,-42,5,-46)},1.6,'rgba(255,255,255,.75)')},
/* Le'boin: boar w/ tusks + mane ridge */
boar(c,t,d,a){const ph=a.ph;
  legs(c,[[-16,-13],[-6,-12],[6,-12],[14,-13]],ph,4.4,d.c);
  fo(c,()=>c.ellipse(-2,-27,25,17.5,0,0,TAU),d.c,3);
  so(c,()=>{c.moveTo(-22,-40);c.quadraticCurveTo(-4,-47,12,-40)},2.4,'#b89a80');
  fo(c,()=>rr(c,12,-40,24,22,9),d.c,3);
  fo(c,()=>{c.moveTo(16,-42);c.lineTo(14,-49);c.lineTo(21,-43);c.closePath()},d.c,2);
  fo(c,()=>c.ellipse(30,-28,6.5,7.5,0,0,TAU),d.m||'#e8b0a0',2.6);
  c.fillStyle=OUT;c.beginPath();c.arc(29,-30,1.5,0,TAU);c.fill();c.beginPath();c.arc(33,-29,1.5,0,TAU);c.fill();
  c.fillStyle=OUT;c.beginPath();c.arc(19,-35,1.9,0,TAU);c.fill();
  so(c,()=>{c.moveTo(15.5,-39.5);c.lineTo(22,-37.5)},1.8);
  so(c,()=>{c.moveTo(26,-21);c.quadraticCurveTo(32,-17,30,-11)},3,'#fbf8ef');
  so(c,()=>{c.moveTo(20,-20);c.quadraticCurveTo(25,-17,24,-12)},3,'#fbf8ef')},
/* Bear family: One Horn / Teacher / Zombie / Beast / Grizzly Nuke */
bear(c,t,d,a){const ph=a.ph;
  if(d.nuke){c.save();c.translate(-10,-48);c.rotate(-0.5);
    fo(c,()=>rr(c,-4.5,-26,9,26,3),'rgba(200,204,212,1)',2.4);
    fo(c,()=>{c.moveTo(-4.5,-26);c.lineTo(0,-35);c.lineTo(4.5,-26);c.closePath()},'rgba(232,90,74,.9)',2.2);
    fo(c,()=>{c.moveTo(-4.5,-2);c.lineTo(-9,4);c.lineTo(-3,1);c.closePath()},'rgba(138,148,168,.9)',1.8);
    fo(c,()=>{c.moveTo(4.5,-2);c.lineTo(9,4);c.lineTo(3,1);c.closePath()},'rgba(138,148,168,.9)',1.8);c.restore()}
  if(d.behemoth){fo(c,()=>{c.moveTo(-16,-46);c.lineTo(-12,-56);c.lineTo(-8,-46);c.closePath()},d.c,2.2);
    fo(c,()=>{c.moveTo(-6,-49);c.lineTo(-2,-59);c.lineTo(2,-49);c.closePath()},d.c,2.2);
    fo(c,()=>{c.moveTo(4,-47);c.lineTo(8,-56);c.lineTo(12,-46);c.closePath()},d.c,2.2);
    so(c,()=>c.arc(0,-33,34+wob(t,2),0,TAU),2,'rgba(106,212,196,.55)')}
  legs(c,[[-10,-14],[10,-14]],ph,5,d.c);
  const sl=d.zombie?4:0;
  fo(c,()=>c.ellipse(0,-31,20,19,0,0,TAU),d.c,3);
  if(d.zombie){stitch(c,-10,-34,2.2);stitch(c,6,-42,2.2)}
  if(d.nuke){c.fillStyle='rgba(42,46,56,.8)';
    for(let i=0;i<3;i++){const a0=-Math.PI/2+i*2.094;c.beginPath();c.moveTo(1,-27);c.arc(1,-27,4.6,a0,a0+1.1);c.closePath();c.fill()}
    c.beginPath();c.arc(1,-27,1.6,0,TAU);c.fill()}
  tube(c,()=>{c.moveTo(-18,-38);c.lineTo(-23,-24+ph*1.5)},4.2,d.c);
  tube(c,()=>{c.moveTo(18,-38);c.lineTo(23,-24-ph*1.5)},4.2,d.c);
  c.save();c.translate(4,-60-sl);
  fo(c,()=>c.arc(-9,-11,5,0,TAU),d.c,2.6);fo(c,()=>c.arc(9,-11,5,0,TAU),d.c,2.6);
  fo(c,()=>c.arc(0,0,14.5,0,TAU),d.c,3);
  fo(c,()=>c.ellipse(3,4.5,7.5,5.5,0,0,TAU),d.zombie?'#a8bc8a':'#f2e8d8',2.2);
  c.fillStyle=OUT;c.beginPath();c.moveTo(1.6,2.4);c.lineTo(4.8,2.4);c.lineTo(3.2,4.2);c.closePath();c.fill();
  so(c,()=>{c.moveTo(3.2,4.5);c.quadraticCurveTo(3.2,7,0.5,7)},1.6);
  c.fillStyle=OUT;c.beginPath();c.arc(-4.5,-4,1.9,0,TAU);c.fill();c.beginPath();c.arc(6.5,-4,1.9,0,TAU);c.fill();
  if(d.angry)so(c,()=>{c.moveTo(-8,-8.5);c.lineTo(-2,-6.5);c.moveTo(11,-8.5);c.lineTo(5,-6.5)},2);
  if(d.glass){c.strokeStyle=OUT;c.lineWidth=2;c.fillStyle='rgba(200,225,240,.45)';
    c.beginPath();c.arc(-4.5,-4,4.6,0,TAU);c.fill();c.stroke();c.beginPath();c.arc(6.5,-4,4.6,0,TAU);c.fill();c.stroke();
    so(c,()=>{c.moveTo(0.5,-4);c.lineTo(2,-4)},2)}
  if(d.horn)fo(c,()=>{c.moveTo(-2,-13.5);c.quadraticCurveTo(1,-25,9,-27);c.quadraticCurveTo(3.5,-18,4.5,-12.5);c.closePath()},'rgba(251,248,239,.95)',2.4);
  if(d.zombie)stitch(c,10,3,1.8);
  c.restore()},
/* Croco family: long-jawed croc w/ ridges + zigzag teeth */
croc(c,t,d,a){const ph=a.ph;
  if(d.behemoth){so(c,()=>c.arc(-2,-14,30+wob(t,2),0,TAU),2,'rgba(106,212,196,.55)');
    fo(c,()=>{c.moveTo(-18,-24);c.lineTo(-14,-32);c.lineTo(-10,-23);c.closePath()},d.c,2);
    fo(c,()=>{c.moveTo(-6,-26);c.lineTo(-2,-34);c.lineTo(2,-25);c.closePath()},d.c,2)}
  fo(c,()=>{c.moveTo(-14,-16);c.quadraticCurveTo(-30,-18,-36,-27);c.quadraticCurveTo(-26,-14,-15,-8);c.closePath()},d.c,2.8);
  legs(c,[[-12,-9],[-4,-8],[6,-8],[13,-9]],ph,3.6,d.c);
  fo(c,()=>c.ellipse(-2,-14,21,10.5,0.02,0,TAU),d.c,3);
  fo(c,()=>{c.moveTo(-13,-21);c.lineTo(-10,-27);c.lineTo(-6,-21);c.closePath()},d.c,2);
  fo(c,()=>{c.moveTo(-4,-23);c.lineTo(-1,-29);c.lineTo(3,-23);c.closePath()},d.c,2);
  fo(c,()=>{c.moveTo(5,-22);c.lineTo(8,-28);c.lineTo(11,-22);c.closePath()},d.c,2);
  c.save();c.translate(16,-18);
  c.fillStyle=d.c;fo(c,()=>c.arc(-4,-10,3.6,0,TAU),d.c,2);fo(c,()=>c.arc(3,-11,3.6,0,TAU),d.c,2);
  c.fillStyle=OUT;c.beginPath();c.arc(-4,-10,1.5,0,TAU);c.fill();c.beginPath();c.arc(3,-11,1.5,0,TAU);c.fill();
  fo(c,()=>{c.moveTo(-10,-6);c.quadraticCurveTo(-2,-13,8,-11);c.quadraticCurveTo(18,-9,21,-4);c.lineTo(-8,-1);c.closePath()},d.c,2.8);
  fo(c,()=>{c.moveTo(-8,0);c.lineTo(19,-2);c.quadraticCurveTo(16,4,8,5);c.quadraticCurveTo(-2,5,-8,0);c.closePath()},d.c,2.8);
  c.fillStyle='#fbf8ef';[[2,0.2],[8,-0.2],[14,-0.6]].forEach(p=>{c.beginPath();c.moveTo(p[0]-1.4,p[1]);c.lineTo(p[0],p[1]+3);c.lineTo(p[0]+1.4,p[1]);c.closePath();c.fill()});
  c.restore()},
/* The Face / Aku Mother: giant grinning cat face w/ ears + whiskers */
face(c,t,d,a){const R=26;
  [-1,1].forEach(sg=>{fo(c,()=>{c.moveTo(sg*R*0.5,-R*1.75);c.lineTo(sg*R*0.72,-R*2.25);c.lineTo(sg*R*0.14,-R*1.98);c.closePath()},d.c,2.6)});
  fo(c,()=>c.arc(0,-R-4,R,0,TAU),d.c,3.4);
  so(c,()=>{c.moveTo(-R*0.8,-R*1.5);c.lineTo(-R*0.65,-R*1.2);c.lineTo(-R*0.85,-R*0.95)},1.8,'rgba(90,84,70,.5)');
  so(c,()=>{c.moveTo(R*0.85,-R*1.35);c.lineTo(R*0.7,-R*1.05)},1.8,'rgba(90,84,70,.5)');
  c.fillStyle=OUT;c.beginPath();c.arc(-R*0.42,-R*1.02,2.7,0,TAU);c.fill();c.beginPath();c.arc(R*0.42,-R*1.02,2.7,0,TAU);c.fill();
  so(c,()=>{c.moveTo(-R*0.6,-R*1.28);c.lineTo(-R*0.24,-R*1.22);c.moveTo(R*0.24,-R*1.22);c.lineTo(R*0.6,-R*1.28)},2.4);
  so(c,()=>{c.moveTo(-R*0.6,-R*0.38);c.quadraticCurveTo(0,-R*0.02,R*0.6,-R*0.38)},3.4);
  for(let i=-2;i<=2;i++){const gx=i*R*0.24;const gy=-R*0.38+R*0.36*(1-(gx*gx)/(R*R*0.36))*0.5;
    so(c,()=>{c.moveTo(gx,gy-3.2);c.lineTo(gx,gy+1.2)},1.8)}
  c.fillStyle='rgba(90,84,70,.55)';
  [-1,1].forEach(sg=>{for(let i=0;i<3;i++){c.beginPath();c.arc(sg*(R*0.62+i*3),-R*0.62+i*4,1.1,0,TAU);c.fill()}});
  if(d.aku){fo(c,()=>{c.moveTo(-R*0.55,-R*1.75);c.quadraticCurveTo(-R*0.95,-R*2.3,-R*0.5,-R*2.5);c.quadraticCurveTo(-R*0.6,-R*2.05,-R*0.3,-R*1.85);c.closePath()},'rgba(58,20,64,.95)',2.4);
    fo(c,()=>{c.moveTo(R*0.55,-R*1.75);c.quadraticCurveTo(R*0.95,-R*2.3,R*0.5,-R*2.5);c.quadraticCurveTo(R*0.6,-R*2.05,R*0.3,-R*1.85);c.closePath()},'rgba(58,20,64,.95)',2.4);
    c.fillStyle='#3a1440';c.beginPath();c.ellipse(0,-R*1.62,2.6,4.4,0,0,TAU);c.fill()}},
/* Lord Nyandam: red caped cat lord w/ swept hair + fangs */
catlord(c,t,d,a){
  fo(c,()=>{c.moveTo(-6,-46);c.quadraticCurveTo(-27,-30,-16+Math.sin(t*5)*3.5,-4);c.lineTo(-2,-16);c.closePath()},'rgba(122,30,20,.95)',2.8);
  legs(c,[[-5,-14],[5,-14]],a.ph,3,'#3a2028');
  fo(c,()=>{c.moveTo(-9,-16);c.lineTo(-11,-40);c.quadraticCurveTo(0,-45,11,-40);c.lineTo(9,-16);c.closePath()},'rgba(58,32,40,.98)',3);
  so(c,()=>{c.moveTo(-10,-24);c.lineTo(10,-24)},2,'#c8a03a');
  tube(c,()=>{c.moveTo(9,-36);c.lineTo(17,-46)},3,'#3a2028');
  so(c,()=>{c.moveTo(17,-46);c.lineTo(19.5,-51);c.moveTo(17,-46);c.lineTo(21.5,-48);c.moveTo(17,-46);c.lineTo(22.5,-45)},1.8,'#e8e4d8');
  c.save();c.translate(1,-58);
  head(c,13,{c:d.c,angry:1});
  fo(c,()=>{c.moveTo(-8,-10);c.quadraticCurveTo(-17,-15,-14,-25);c.quadraticCurveTo(-10,-16,-3,-12);c.closePath()},'rgba(42,16,24,.95)',2.2);
  fo(c,()=>{c.moveTo(8,-10);c.quadraticCurveTo(17,-15,14,-25);c.quadraticCurveTo(10,-16,3,-12);c.closePath()},'rgba(42,16,24,.95)',2.2);
  c.fillStyle='#fbf8ef';c.beginPath();c.moveTo(-4,10.5);c.lineTo(-2.6,14.5);c.lineTo(-1.2,10.5);c.closePath();c.fill();
  c.beginPath();c.moveTo(1.2,10.5);c.lineTo(2.6,14.5);c.lineTo(4,10.5);c.closePath();c.fill();
  c.restore()},
/* Gabriel / Seraph: angels w/ halo + wings */
angel(c,t,d,a){const sc=d.small?0.82:1;c.scale(sc,sc);
  const fw=Math.sin(t*9)*0.15;
  [[-1,0],[1,0]].forEach(sg=>{c.save();c.translate(sg[0]*6,-31);c.rotate(sg[0]*(0.5+fw));
    fo(c,()=>c.ellipse(sg[0]*8.5,0,11.5,4.8,sg[0]*0.35,0,TAU),'rgba(251,248,239,.98)',2.4);c.restore()});
  if(!d.small)[[-1,1],[1,-1]].forEach(sg=>{c.save();c.translate(sg[0]*7,-23);c.rotate(sg[0]*(0.6-fw));
    fo(c,()=>c.ellipse(sg[0]*7,0,8.5,3.8,sg[0]*0.4,0,TAU),'rgba(244,236,216,.98)',2.2);c.restore()});
  fo(c,()=>{c.moveTo(-8,0);c.quadraticCurveTo(-11,-20,0,-27);c.quadraticCurveTo(11,-20,8,0);c.quadraticCurveTo(0,3.5,-8,0);c.closePath()},d.c,3);
  so(c,()=>{c.moveTo(-7.4,-2.5);c.quadraticCurveTo(0,0.8,7.4,-2.5)},2,'#e8c86a');
  tube(c,()=>{c.moveTo(-6.5,-17);c.lineTo(-9,-11)},2.4,d.c);
  tube(c,()=>{c.moveTo(6.5,-17);c.lineTo(9,-11)},2.4,d.c);
  c.save();c.translate(0,-37);
  head(c,d.small?9.5:10,{ears:d.small?'dog':'none',c:'#fbf8ef',innerEar:0,blush:d.small?1:0,happy:1});
  c.restore();
  so(c,()=>c.ellipse(0,-53,7,2.3,0,0,TAU),2.6,'#ffd94a');
  if(!d.small){c.save();c.globalAlpha=0.5;so(c,()=>c.ellipse(0,-53,10.5,3.4,0,0,TAU),1.6,'#fff2c0');c.restore()}},
/* Zombie Elephant: trunk + tusk + stitches */
elephant(c,t,d,a){const ph=a.ph;
  legs(c,[[-16,-14],[-6,-13],[6,-13],[15,-14]],ph,5,d.c);
  fo(c,()=>c.ellipse(-2,-30,25,19,0,0,TAU),d.c,3);
  stitch(c,-8,-38,2.2);
  fo(c,()=>c.ellipse(6,-48,10,13,0.15,0,TAU),d.c2||d.c,2.6);
  fo(c,()=>c.arc(20,-42,13.5,0,TAU),d.c,3);
  c.fillStyle=OUT;c.beginPath();c.arc(21,-46,1.9,0,TAU);c.fill();c.beginPath();c.arc(27.5,-44.5,1.9,0,TAU);c.fill();
  tube(c,()=>{c.moveTo(30,-40);c.quadraticCurveTo(39,-31,36,-14+wob(t,2))},5.5,d.c);
  so(c,()=>{c.moveTo(33,-34);c.lineTo(37,-33);c.moveTo(34,-28);c.lineTo(38,-28)},1.6);
  so(c,()=>{c.moveTo(28,-34);c.quadraticCurveTo(24,-29,25,-24)},3,'#fbf8ef');
  stitch(c,20,-46,2)},
/* Zombie Turtle: shell dome + stitches */
turtle(c,t,d,a){const ph=a.ph;
  legs(c,[[-13,-8],[-5,-7],[6,-7],[13,-8]],ph,3.4,d.c);
  fo(c,()=>{c.moveTo(-19,-14);c.lineTo(-25,-18);c.lineTo(-18,-20);c.closePath()},d.c,2);
  fo(c,()=>{c.arc(0,-16,19,Math.PI,0);c.closePath()},d.sh||d.c,3);
  so(c,()=>{c.moveTo(-19,-16);c.lineTo(19,-16)},2.2,d.sh||d.c);
  so(c,()=>{c.moveTo(-10,-17);c.quadraticCurveTo(-8,-26,-2,-31);c.moveTo(2,-17);c.quadraticCurveTo(3,-25,7,-30)},1.8,'rgba(40,60,36,.5)');
  stitch(c,-4,-24,2,'#2e4228');
  tube(c,()=>{c.moveTo(17,-17);c.lineTo(22,-19)},4.5,d.c);
  fo(c,()=>c.arc(25,-21,7,0,TAU),d.c,2.6);
  c.fillStyle=OUT;c.beginPath();c.arc(27,-23,1.6,0,TAU);c.fill();
  so(c,()=>{c.moveTo(29,-18);c.quadraticCurveTo(30.5,-17,31.5,-18.5)},1.4)},
/* Witchen: hovering witch cat w/ hat + broom */
witch(c,t,d,a){const hv=Math.sin(t*4)*2.5;c.translate(0,hv);
  tube(c,()=>{c.moveTo(11,-18);c.lineTo(23,-36)},2.6,'#8a5a3a');
  so(c,()=>{c.moveTo(23,-36);c.lineTo(29,-42);c.moveTo(23,-36);c.lineTo(30,-37);c.moveTo(23,-36);c.lineTo(27,-31)},2,'#d8b878');
  tube(c,()=>{c.moveTo(-9,-22);c.lineTo(-14,-15)},2.6,d.c);
  tube(c,()=>{c.moveTo(9,-22);c.lineTo(14,-16)},2.6,d.c);
  fo(c,()=>{c.moveTo(-11,0);c.quadraticCurveTo(-4,-26,-2,-32);c.lineTo(4,-32);c.quadraticCurveTo(6,-26,12,0);c.closePath()},d.c,3);
  c.fillStyle='#ffd94a';c.beginPath();c.arc(1,-8,2,0,TAU);c.fill();
  c.save();c.translate(1,-40);head(c,10,{innerEar:1});c.restore();
  fo(c,()=>c.ellipse(1,-48,13,3.4,0,0,TAU),'rgba(58,42,82,1)',2.6);
  fo(c,()=>{c.moveTo(-6,-49);c.lineTo(3,-68);c.quadraticCurveTo(6,-58,8,-49);c.closePath()},'rgba(58,42,82,1)',2.6);
  c.fillStyle='#ffd94a';c.beginPath();c.arc(3,-54,1.6,0,TAU);c.fill()},
/* Clionel: sea angel w/ translucent hood + orange core */
clione(c,t,d,a){const fw=Math.sin(t*12)*0.3;
  if(d.boss){so(c,()=>c.arc(0,-13,26+wob(t,2),0,TAU),2,'rgba(200,168,255,.4)')}
  [[-1,-1],[1,1]].forEach(sg=>{c.save();c.translate(sg[0]*7,-22);c.rotate(sg[0]*(0.5+fw));
    fo(c,()=>c.ellipse(sg[0]*6,0,8,4,sg[0]*0.5,0,TAU),'rgba(240,220,250,.9)',2.2);c.restore()});
  fo(c,()=>{c.moveTo(-8,0);c.quadraticCurveTo(-11,-20,0,-25);c.quadraticCurveTo(11,-20,8,0);c.closePath()},d.c,3);
  fo(c,()=>{c.moveTo(-3,0);c.lineTo(-5,-5);c.lineTo(-1,-4);c.closePath()},'rgba(240,220,250,.9)',1.6);
  fo(c,()=>{c.moveTo(3,0);c.lineTo(5,-5);c.lineTo(1,-4);c.closePath()},'rgba(240,220,250,.9)',1.6);
  fo(c,()=>c.arc(1,-14,4.5,0,TAU),'rgba(232,150,90,.95)',2.2);
  c.fillStyle=OUT;c.beginPath();c.arc(-1.5,-19.5,1.3,0,TAU);c.fill();c.beginPath();c.arc(3.5,-19.5,1.3,0,TAU);c.fill();
  so(c,()=>{c.moveTo(-2,-25);c.lineTo(-3.5,-29);c.moveTo(3,-25);c.lineTo(4.5,-29)},1.8,d.c);
  c.fillStyle='#e8965a';c.beginPath();c.arc(-3.5,-30,1.4,0,TAU);c.fill();c.beginPath();c.arc(4.5,-30,1.4,0,TAU);c.fill()},
/* Dark Otius: walking mech w/ visor + shoulder cannon */
mech(c,t,d,a){const ph=a.ph;const hv=Math.sin(t*5)*1.5;c.translate(0,hv);
  c.save();c.globalAlpha*=0.7;c.fillStyle='#ff9a4a';
  c.beginPath();c.moveTo(-4,-2);c.lineTo(0,4+Math.sin(t*20)*2);c.lineTo(4,-2);c.closePath();c.fill();c.restore();
  tube(c,()=>{c.moveTo(-8,-16);c.lineTo(-11+ph*2,-3)},4.4,'#3a3a44');
  tube(c,()=>{c.moveTo(8,-16);c.lineTo(11-ph*2,-3)},4.4,'#3a3a44');
  fo(c,()=>rr(c,-17,-5,13,6,2.5),'#2e2e38',2.2);
  fo(c,()=>rr(c,4,-5,13,6,2.5),'#2e2e38',2.2);
  fo(c,()=>{c.moveTo(-15,-10);c.lineTo(-17,-33);c.quadraticCurveTo(0,-43,17,-33);c.lineTo(15,-10);c.quadraticCurveTo(0,-4,-15,-10);c.closePath()},d.c,3);
  so(c,()=>{c.moveTo(-13,-18);c.lineTo(13,-18)},1.6,'#22222c');
  fo(c,()=>rr(c,-9,-30,18,7,3),'#14141c',2.2);
  so(c,()=>{c.moveTo(-6,-26.5);c.lineTo(6,-26.5)},2.4,'#ff5a4a');
  fo(c,()=>rr(c,9,-40,15,7,2),'#2e2e38',2.4);
  fo(c,()=>rr(c,23,-39,4,5,1),'#14141c',1.6);
  so(c,()=>{c.moveTo(-10,-36);c.lineTo(-13,-44)},1.8);
  c.fillStyle='#ff5a4a';c.beginPath();c.arc(-13,-45,1.6,0,TAU);c.fill()},
/* Star Alien / Titanice: floating alien, UFO / ice variants */
alien(c,t,d,a){const hv=Math.sin(t*4+1)*2.5;
  if(d.ufo){fo(c,()=>c.ellipse(0,-3,21,6,0,0,TAU),'rgba(138,148,168,.98)',2.8);
    fo(c,()=>{c.moveTo(-10,-4);c.quadraticCurveTo(0,-15,10,-4);c.quadraticCurveTo(0,-8,-10,-4);c.closePath()},'rgba(190,220,240,.95)',2.2);
    [-12,0,12].forEach(x=>{c.fillStyle='#7fd8ff';c.beginPath();c.arc(x,-2.5,1.6,0,TAU);c.fill()});
    c.translate(0,-14)}
  c.translate(0,hv);
  so(c,()=>c.ellipse(0,3,13,3.2,0,0,TAU),2.2,'rgba(140,220,255,.7)');
  tube(c,()=>{c.moveTo(-3,-26);c.lineTo(-6,-34)},2,'#c8ecf8');
  tube(c,()=>{c.moveTo(3,-26);c.lineTo(6,-34)},2,'#c8ecf8');
  c.fillStyle=d.gl||'#7fd8ff';c.beginPath();c.arc(-6,-35,2.2,0,TAU);c.fill();c.beginPath();c.arc(6,-35,2.2,0,TAU);c.fill();
  tube(c,()=>{c.moveTo(-9,-16);c.lineTo(-13,-11)},2.2,d.c);
  tube(c,()=>{c.moveTo(9,-16);c.lineTo(13,-11)},2.2,d.c);
  fo(c,()=>{c.moveTo(-10,0);c.quadraticCurveTo(-13,-22,0,-27);c.quadraticCurveTo(13,-22,10,0);c.closePath()},d.c,3);
  c.fillStyle='#2a2e38';c.beginPath();c.ellipse(-4,-17,2.8,4.6,0.12,0,TAU);c.fill();c.beginPath();c.ellipse(5,-16.4,2.8,4.6,-0.12,0,TAU);c.fill();
  c.fillStyle='rgba(255,255,255,.75)';c.beginPath();c.arc(-4.8,-19,0.9,0,TAU);c.fill();c.beginPath();c.arc(4.2,-18.4,0.9,0,TAU);c.fill();
  if(d.ice){fo(c,()=>{c.moveTo(-11,-12);c.lineTo(-17,-29);c.lineTo(-7,-18);c.closePath()},'rgba(232,248,255,.95)',2.2);
    fo(c,()=>{c.moveTo(7,-17);c.lineTo(13,-33);c.lineTo(13,-14);c.closePath()},'rgba(232,248,255,.95)',2.2);
    fo(c,()=>{c.moveTo(-3,-26);c.lineTo(-1,-38);c.lineTo(4,-25);c.closePath()},'rgba(244,252,255,.95)',2.2);
    so(c,()=>{c.moveTo(-7,-8);c.quadraticCurveTo(0,-4,7,-8)},1.8,'rgba(255,255,255,.7)')}},
/* Aku Cerberus: three-headed purple hound w/ dark horns */
cerberus(c,t,d,a){const ph=a.ph;
  legs(c,[[-11,-12],[-4,-11],[5,-11],[11,-12]],ph,3.4,d.c);
  fo(c,()=>{c.moveTo(-6,-24);c.quadraticCurveTo(-12,-32,-6,-38);c.quadraticCurveTo(-7,-31,-1,-33);c.quadraticCurveTo(-4,-28,3,-30);c.quadraticCurveTo(-2,-26,0,-23);c.closePath()},'rgba(90,26,122,.9)',2.2);
  fo(c,()=>c.ellipse(0,-22,15,11,0.05,0,TAU),d.c);
  [[-7,-35,8,-0.06],[16,-34,7.5,0.1],[6,-43,9.5,0.02]].forEach(hd=>{
    c.save();c.translate(hd[0],hd[1]);c.rotate(hd[3]);
    fo(c,()=>{c.moveTo(-6,-7);c.quadraticCurveTo(-10,-12,-7,-16);c.lineTo(-3,-9);c.closePath()},'rgba(58,20,64,1)',1.8);
    fo(c,()=>{c.moveTo(6,-7);c.quadraticCurveTo(10,-12,7,-16);c.lineTo(3,-9);c.closePath()},'rgba(58,20,64,1)',1.8);
    head(c,hd[2],{ears:'cat',c:d.c,snout:'#e8d0f8',nose:1,open:1,angry:1,lw:2.6});
    c.restore()})}
};

/* ============================ RENDER API ============================ */
/* ---- offscreen sprite bake cache (pre-baked unit frames for 60fps) ---- */
const BAKE=new Map();
function bakeGet(key,w,h,draw){let b=BAKE.get(key);if(b)return b;
  if(BAKE.size>700){let n=0;for(const k2 of BAKE.keys()){BAKE.delete(k2);if(++n>=300)break}}
  const off=document.createElement('canvas');off.width=Math.max(2,w);off.height=Math.max(2,h);
  const c2=off.getContext('2d');draw(c2,w,h);b={cv:off,w,h};BAKE.set(key,b);return b}
/* per-body-class gait: [bobAplitude px, bobRate rad/s] — heavies lumber, kittens trot */
const GAIT={kitten:[4.6,9],wall:[3.0,6],tall:[5.4,6.5],brute:[6.2,6],bird:[5.0,10],fish:[5.0,8],
  dragon:[6.4,6.5],luga:[4.6,4.5],biped:[5.0,7.5],blob:[5.4,7],rock:[3.2,5],mech:[3.5,5],samurai:[5.2,7.5]};
/* soft volumetric light: top-light + bottom shade clipped to the painted body —
   gives EVERY unit instant roundness (applied inside the bake, source-atop). */
function volumeShade(c2,BW,BH){
  try{c2.globalCompositeOperation='source-atop';
    const vg=c2.createLinearGradient(0,0,0,BH);
    vg.addColorStop(0,'rgba(255,255,242,.20)');
    vg.addColorStop(0.5,'rgba(255,255,255,0)');
    vg.addColorStop(1,'rgba(28,20,48,.15)');
    c2.fillStyle=vg;c2.fillRect(0,0,BW,BH);
    c2.globalCompositeOperation='source-over'}catch(e){}}
/* shared pose math for the 4-state attack cycle — ORIGINAL TIMING:
   'windup' (pk 0→-1: deep anticipation crouch, weapon cocks back) → 'attack' in THREE
   phases like the original's 2-frame attack flipbook:
     0–10%  SNAP  −1→+1 (the strike frame lands with the damage tick — near-instant)
     10–50% HOLD  pk=+1 (impact frame lingers — reads as a committed hit)
     50–100% RETURN  +1→0 (ease home through the backswing) */
function poseOf(e,t,gait){
  const walk=!e||e.anim==='walk';
  const idle=!!(e&&e.idle&&walk);
  const win=e&&e.anim==='windup';
  const atk=e&&e.anim==='attack';
  const aT=clamp((e&&e.atkT)||0,0,1);
  let pk=0;
  if(win){const s=aT*aT*(3-2*aT);pk=-s}                          // smoothstep anticipation: 0 → −1
  else if(atk){
    if(aT<0.10){const s=aT/0.10;pk=-1+2*(1-(1-s)*(1-s))}         // SNAP: −1 → +1 (easeOut)
    else if(aT<0.50)pk=1                                         // HOLD the impact frame
    else{const s=(aT-0.50)/0.50;pk=1-s*s}                        // RETURN: +1 → 0 (easeIn)
  }
  const code=win?'g':atk?'a':(idle?'i':'w');
  const gr=(gait&&gait[1])||8,ga=(gait&&gait[0])||2.8;
  const ph=(walk&&!idle)?Math.sin(t*gr):0;
  const stride=(walk&&!idle)?Math.cos(t*gr):0;                   // vertical hop counter-phase (2 beats per stride)
  return{walk,idle,win,atk,pk,ph,stride,code,aT}}
const ART={
 /* per-unit blink seed — desyncs idle blinking between units */
 _seed(id){let h=0;const s=String(id);for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h%1000},
 cat(o){ /* REAL SPRITES ONLY (user: no invented art). All 106 units ship authentic
   cutout strips — if one is missing we draw nothing rather than a fake painter cat. */
   if(typeof SPRIT!=='undefined'&&SPRIT.draw('cat',o))return;
   const t=o.t||0,e=o.e||null,s=o.s||1;
   const c=cx;c.save();
   if(e&&e.curse){c.fillStyle='#c46adf';const sa=t*3;
     [[-16,-56],[15,-48]].forEach((p,i)=>{c.save();c.translate(o.x+p[0]*s+Math.sin(sa+i*2)*3,o.y+p[1]*s+Math.cos(sa+i)*2.5);c.rotate(0.785);c.fillRect(-2.4,-2.4,4.8,4.8);c.restore()})}
   c.restore()}
 ,enemy(o){ const d=ENEMY_ART[o.id]||ENEMY_ART.doge;const s=o.s||1;
   const bz=o.e&&o.e.boss;const bsc=bz?(d.bsc!==undefined?d.bsc:0.55):1;
   const t=o.t||0,e=o.e||null;
   /* boss trait aura stays live behind the sprite */
   if(bz){const c=cx;c.save();c.translate(o.x,o.y);c.scale(s*bsc,s*bsc);traitAura(c,22,e);c.restore()}
   /* REAL SPRITES ONLY — authentic cutout strips for every enemy; no invented art */
   if(typeof SPRIT!=='undefined'){
     const o2=Object.assign({},o,{s:s*bsc});
     if(SPRIT.draw('enemy',o2))return}
   const c=cx;c.save();
   if(e&&e.curse){c.fillStyle='#c46adf';const sa=t*3;
     [[-16,-52],[15,-44]].forEach((p,i)=>{c.save();c.translate(o.x+p[0]*s*bsc+Math.sin(sa+i*2)*3,o.y+p[1]*s*bsc+Math.cos(sa+i)*2.5);c.rotate(0.785);c.fillRect(-2.4,-2.4,4.8,4.8);c.restore()})}
   c.restore()}
 ,catIcon(id,x,y,r,dim){const c=cx;c.save();c.globalAlpha=dim!==undefined?dim:1;c.translate(x,y);
   const rar=(typeof CATMAP!=='undefined'?(CATMAP[id]||{}).rarity:null);
   if(rar==='uber'||rar==='legend'){c.save();c.globalAlpha*=0.3+0.08*Math.sin(G.t*4);
     c.fillStyle=rar==='legend'?'#c46adf':'#ffd94a';c.beginPath();c.arc(0,0,r*1.42,0,TAU);c.fill();c.restore()}
   if(typeof SPRIT!=='undefined'&&SPRIT.icon('cat',id,0,0,r,dim)){c.restore();return}
   const d=ART_CATS[id]||ART_CATS.cat;
   const R=Math.max(4,Math.round(r));const dp=Math.min(cv._dpr||1,2);
   const BW=Math.ceil(R*3.6*dp),BH=Math.ceil(R*3.6*dp);
   const b=bakeGet('ci|'+id+'|'+R+'|'+dp,BW,BH,c2=>{c2.setTransform(dp,0,0,dp,BW/2,BH/2);c2.rotate(-0.05);
     const lw=Math.max(2.2,R*0.14);
     const col=d.p==='blob'?'#a8e8c8':d.p==='rock'?'#a4aab6':d.p==='mech'?'#aab4c4':(d.p==='dragon'&&d.dark)?'#5a5a68':CATW;
     head(c2,R,{c:col,lw,innerEar:1});catOver(c2,d,R)});
   c.drawImage(b.cv,-BW/(2*dp),-BH/(2*dp),BW/dp,BH/dp);c.restore()}
 ,catBig(id,x,y,s){const c=cx;const r=13*s;c.save();c.translate(x,y);
   const d=ART_CATS[id]||ART_CATS.cat;const rar=(typeof CATMAP!=='undefined'?(CATMAP[id]||{}).rarity:null);
   if(rar==='uber'||rar==='legend'){c.save();c.globalAlpha*=0.3+0.08*Math.sin(G.t*4);
     c.fillStyle=rar==='legend'?'#c46adf':'#ffd94a';c.beginPath();c.arc(0,0,r*1.45,0,TAU);c.fill();c.restore()}
   c.rotate(-0.04);
   fo(c,()=>{c.moveTo(-r*1.05,r*1.78);c.quadraticCurveTo(-r*1.22,r*0.72,-r*0.55,r*0.58);c.lineTo(r*0.55,r*0.58);c.quadraticCurveTo(r*1.22,r*0.72,r*1.05,r*1.78);c.closePath()},CATW,Math.max(2.4,r*0.13));
   head(c,r,{c:d.p==='blob'?'#a8e8c8':d.p==='rock'?'#a4aab6':d.p==='mech'?'#aab4c4':(d.p==='dragon'&&d.dark)?'#5a5a68':CATW,lw:Math.max(2.2,r*0.14),innerEar:1});
   catOver(c,d,r);
   c.restore()}
 ,enemyIcon(id,x,y,r){const c=cx;c.save();c.translate(x,y);
   if(typeof SPRIT!=='undefined'&&SPRIT.icon('enemy',id,0,0,r)){c.restore();return}
   if(r>=8){ // pre-baked offscreen icon (guide grid hot path)
     const R=Math.max(10,Math.min(56,Math.round(r)));const dp=Math.min(cv._dpr||1,2);
     const BW=Math.ceil(R*3.4*dp),BH=Math.ceil(R*3.4*dp);
     const b=bakeGet('ei|'+id+'|'+R+'|'+dp,BW,BH,c2=>{c2.setTransform(dp,0,0,dp,BW/2,BH/2);c2.scale(R/12,R/12);ART.enemyIconBody(c2,id)});
     c.drawImage(b.cv,-BW/(2*dp),-BH/(2*dp),BW/dp,BH/dp);c.restore();return}
   c.scale(r/12,r/12);ART.enemyIconBody(c,id);c.restore()}
 /* undiscovered-guide silhouette: same icon shape filled with a dark trait tint (mystery card) */
 ,enemySil(id,x,y,r){const c=cx;c.save();c.translate(x,y);
   const R=Math.max(10,Math.min(56,Math.round(r)));const dp=Math.min(cv._dpr||1,2);
   const BW=Math.ceil(R*3.4*dp),BH=Math.ceil(R*3.4*dp);
   const b=bakeGet('es|'+id+'|'+R+'|'+dp,BW,BH,c2=>{
     c2.setTransform(dp,0,0,dp,BW/2,BH/2);c2.scale(R/12,R/12);ART.enemyIconBody(c2,id);
     c2.setTransform(dp,0,0,dp,0,0);c2.globalCompositeOperation='source-in';
     const d=ENEMY_ART[id]||ENEMY_ART.doge;
     c2.fillStyle=shade(d.tr||'#4a4a52',.42);c2.fillRect(0,0,BW,BH)});
   c.drawImage(b.cv,-BW/(2*dp),-BH/(2*dp),BW/dp,BH/dp);c.restore()}
 ,enemyIconBody(ci,id){const c=ci;
   const d=ENEMY_ART[id]||ENEMY_ART.doge;
   if(d.boss){c.strokeStyle='#ff5a5a';c.lineWidth=1.7;c.beginPath();c.arc(0,0,14.6,0,TAU);c.stroke()}
   else if(d.tr){c.save();c.globalAlpha*=0.75;c.strokeStyle=d.tr;c.lineWidth=2;c.setLineDash([3.5,3]);c.beginPath();c.arc(0,0,13.8,0,TAU);c.stroke();c.setLineDash([]);c.restore()}
   if(d.ghost)c.globalAlpha*=0.85;
   switch(d.p){
     case 'shiba':if(d.relic){c.save();c.setLineDash([3,2.5]);so(c,()=>c.arc(0,-1,11.6,0,TAU),1.6,'#b89a4a');c.setLineDash([]);c.restore()}
       if(d.alien){so(c,()=>{c.moveTo(-4,-8);c.lineTo(-6.5,-13)},1.8,'#54c888');so(c,()=>{c.moveTo(4,-8);c.lineTo(6.5,-13)},1.8,'#54c888');
         c.fillStyle='#8af0b8';c.beginPath();c.arc(-6.5,-13.8,1.6,0,TAU);c.fill();c.beginPath();c.arc(6.5,-13.8,1.6,0,TAU);c.fill()}
       if(d.aku){fo(c,()=>{c.moveTo(-5.5,-6.5);c.quadraticCurveTo(-9.5,-10.5,-7.5,-14.5);c.lineTo(-3,-8);c.closePath()},'rgba(58,20,64,1)',1.8);
         fo(c,()=>{c.moveTo(5.5,-6.5);c.quadraticCurveTo(9.5,-10.5,7.5,-14.5);c.lineTo(3,-8);c.closePath()},'rgba(58,20,64,1)',1.8)}
       head(c,9,{ears:d.fox?'fox':'cat',c:d.c,snout:d.m||'#fbf3e3',nose:1,open:1,tongue:1,lw:2.4,ec:d.dark?'#c46adf':undefined,blush:d.diva?1:0});
       if(d.diva){fo(c,()=>{c.moveTo(-8,-8.5);c.lineTo(-11,-12.5);c.lineTo(-5,-11.5);c.closePath()},'rgba(255,90,138,.9)',1.4);
         fo(c,()=>{c.moveTo(8,-8.5);c.lineTo(11,-12.5);c.lineTo(5,-11.5);c.closePath()},'rgba(255,90,138,.9)',1.4)}
       if(d.wiz){fo(c,()=>c.ellipse(0,-8.5,10.5,2.4,0,0,TAU),'rgba(74,53,104,1)',2);
         fo(c,()=>{c.moveTo(-5.5,-9);c.lineTo(1.5,-22);c.quadraticCurveTo(3.5,-14.5,5.5,-9);c.closePath()},'rgba(74,53,104,1)',2);
         c.fillStyle='#ffd94a';c.beginPath();c.arc(1.5,-14,1.2,0,TAU);c.fill()}
       if(d.metal){c.fillStyle='#76889a';c.beginPath();c.arc(-6,2,1,0,TAU);c.fill();c.beginPath();c.arc(6,3,1,0,TAU);c.fill()}
       break;
     case 'snake':so(c,()=>{c.moveTo(-3,6);c.quadraticCurveTo(-2,1,1,-2)},4.5,d.c);
       c.save();c.translate(3,-4);c.rotate(0.08);
       fo(c,()=>c.ellipse(1.5,0,7.5,6,0.1,0,TAU),d.c,2.4);
       c.fillStyle='#fbf8ef';c.beginPath();c.arc(0.5,-1.5,2.2,0,TAU);c.fill();c.beginPath();c.arc(5,-1,2,0,TAU);c.fill();
       c.fillStyle=d.boss?'#ff5a4a':OUT;c.beginPath();c.arc(0.8,-1.3,1.1,0,TAU);c.fill();c.beginPath();c.arc(5.2,-0.8,1,0,TAU);c.fill();
       c.fillStyle='#fbf8ef';c.beginPath();c.moveTo(3.5,3.5);c.lineTo(4.2,5.8);c.lineTo(5,3.5);c.closePath();c.fill();
       so(c,()=>{c.moveTo(8.5,2);c.lineTo(12,2);c.moveTo(12,2);c.lineTo(14,0.8);c.moveTo(12,2);c.lineTo(14,3.2)},1.4,'#e05a6a');
       c.restore();break;
     case 'guys':fo(c,()=>c.arc(-6,4,4.5,0,TAU),d.c,2);fo(c,()=>c.arc(6.5,3,4.2,0,TAU),d.c,2);
       fo(c,()=>c.arc(0,-2,6.5,0,TAU),d.c,2.2);
       c.fillStyle=OUT;c.beginPath();c.arc(-2.2,-3.5,1.1,0,TAU);c.fill();c.beginPath();c.arc(2.2,-3.5,1.1,0,TAU);c.fill();
       so(c,()=>{c.moveTo(-1.6,-0.2);c.quadraticCurveTo(-0.8,0.6,0,-0.2);c.quadraticCurveTo(0.8,0.6,1.6,-0.2)},1.2);break;
     case 'sheep':fo(c,()=>{c.moveTo(-9,4);c.quadraticCurveTo(-13.5,-2.5,-7,-6);c.quadraticCurveTo(-4,-10.5,1,-8);c.quadraticCurveTo(6.5,-10.5,8.5,-4.5);c.quadraticCurveTo(12,0,8,4);c.quadraticCurveTo(0,7,-9,4);c.closePath()},d.c,2.4);
       fo(c,()=>c.arc(3,-8,2.6,0,TAU),d.c,1.8);
       fo(c,()=>c.ellipse(6.5,0.5,3.6,4.4,0.12,0,TAU),'#5a6472',1.8);
       c.fillStyle='#fbf8ef';c.beginPath();c.arc(5.6,-0.8,1.1,0,TAU);c.fill();c.beginPath();c.arc(8,-0.5,1.1,0,TAU);c.fill();break;
     case 'penguin':fo(c,()=>c.ellipse(0,0.5,8.5,9.5,0,0,TAU),d.c,2.4);
       fo(c,()=>c.ellipse(1,2,4.8,6.4,0,0,TAU),'#f4f2ea',1.8);
       c.fillStyle=OUT;c.beginPath();c.arc(2.5,-4,1.2,0,TAU);c.fill();c.beginPath();c.arc(5.6,-3.4,1.2,0,TAU);c.fill();
       fo(c,()=>{c.moveTo(4.5,-1.5);c.lineTo(10,0);c.lineTo(4.5,1.8);c.closePath()},'rgba(232,160,74,1)',1.6);break;
     case 'hippo':case 'boar':fo(c,()=>rr(c,-9,-7,18,15,6),d.c,2.4);
       fo(c,()=>rr(c,2,-1,8,9,3.5),d.m||'#d8c8e0',2);
       c.fillStyle=OUT;c.beginPath();c.arc(4.5,2.5,1.1,0,TAU);c.fill();c.beginPath();c.arc(7.8,2,1.1,0,TAU);c.fill();
       c.fillStyle=OUT;c.beginPath();c.arc(-3.5,-2.5,1.3,0,TAU);c.fill();c.beginPath();c.arc(3.5,-2.5,1.3,0,TAU);c.fill();
       fo(c,()=>c.arc(-6.5,-7.5,1.8,0,TAU),d.c,1.6);fo(c,()=>c.arc(6.5,-7.5,1.8,0,TAU),d.c,1.6);
       if(d.p==='boar'){so(c,()=>{c.moveTo(7.5,6);c.quadraticCurveTo(10.5,7.5,9.8,10)},1.8,'#fbf8ef');
         so(c,()=>{c.moveTo(-7.5,-6);c.lineTo(-3.5,-4.6)},1.4)}
       if(d.metal){c.fillStyle='#6a8090';c.beginPath();c.arc(-6,4,0.9,0,TAU);c.fill()}
       if(d.relic){so(c,()=>{c.moveTo(-7,3);c.lineTo(-3.5,4.5);c.moveTo(-3.5,3);c.lineTo(-7,4.5)},1.2,'#8a6a2a')}
       break;
     case 'seal':fo(c,()=>{c.moveTo(-9,7);c.quadraticCurveTo(-11.5,-5.5,-2,-8.5);c.quadraticCurveTo(8.5,-10.5,10,-1);c.quadraticCurveTo(10.5,4,8,7);c.closePath()},d.c,2.4);
       c.fillStyle=OUT;c.beginPath();c.arc(2,-3,1.2,0,TAU);c.fill();c.beginPath();c.arc(5.6,-2.4,1.2,0,TAU);c.fill();
       so(c,()=>{c.moveTo(6,1.5);c.lineTo(9.5,2.5);c.moveTo(6,3.5);c.lineTo(9.5,4.8)},1,'rgba(90,84,70,.6)');
       fo(c,()=>{c.moveTo(-2,-8);c.quadraticCurveTo(4,-13.5,10.5,-8.5);c.quadraticCurveTo(4.5,-5.5,-2,-8);c.closePath()},'rgba(42,74,138,1)',1.8);break;
     case 'bear':fo(c,()=>c.arc(-6.5,-6.5,3,0,TAU),d.c,2);fo(c,()=>c.arc(6.5,-6.5,3,0,TAU),d.c,2);
       fo(c,()=>c.arc(0,0,9,0,TAU),d.c,2.4);
       fo(c,()=>c.ellipse(1.5,2.8,4.4,3.2,0,0,TAU),d.zombie?'#a8bc8a':'#f2e8d8',1.8);
       c.fillStyle=OUT;c.beginPath();c.arc(-3.5,-1.5,1.3,0,TAU);c.fill();c.beginPath();c.arc(4,-1.5,1.3,0,TAU);c.fill();
       if(d.glass){c.strokeStyle=OUT;c.lineWidth=1.4;c.fillStyle='rgba(200,225,240,.45)';
         c.beginPath();c.arc(-3.5,-1.5,3,0,TAU);c.fill();c.stroke();c.beginPath();c.arc(4,-1.5,3,0,TAU);c.fill();c.stroke()}
       if(d.horn)fo(c,()=>{c.moveTo(0,-8.5);c.quadraticCurveTo(2,-14,5.5,-15);c.quadraticCurveTo(2.5,-10.5,3,-8);c.closePath()},'rgba(251,248,239,.95)',1.8);
       if(d.behemoth){fo(c,()=>{c.moveTo(-7,-8);c.lineTo(-5.5,-12.5);c.lineTo(-3.5,-8);c.closePath()},d.c,1.6);
         fo(c,()=>{c.moveTo(2,-9);c.lineTo(3.5,-13.5);c.lineTo(5.5,-8.5);c.closePath()},d.c,1.6)}
       if(d.nuke){so(c,()=>{c.moveTo(-8,-2.5);c.lineTo(8,-3)},1.4,'#5a4a34')}
       if(d.zombie){so(c,()=>{c.moveTo(4,4.5);c.lineTo(7,5.5)},1.2,'#4a6238')}
       break;
     case 'croc':fo(c,()=>{c.moveTo(-6,1);c.quadraticCurveTo(2,-4,10,-2);c.quadraticCurveTo(14,-1,14.5,1.5);c.lineTo(-5,3);c.closePath()},d.c,2.2);
       fo(c,()=>{c.moveTo(-5,4);c.lineTo(13.5,2.5);c.quadraticCurveTo(12,6,6,6.5);c.quadraticCurveTo(0,6.5,-5,4);c.closePath()},d.c,2.2);
       fo(c,()=>c.arc(-2,-3.5,2.4,0,TAU),d.c,1.8);fo(c,()=>c.arc(3,-4,2.4,0,TAU),d.c,1.8);
       c.fillStyle=OUT;c.beginPath();c.arc(-2,-3.5,1,0,TAU);c.fill();c.beginPath();c.arc(3,-4,1,0,TAU);c.fill();
       if(d.behemoth){fo(c,()=>{c.moveTo(-3,-6);c.lineTo(-1.5,-9.5);c.lineTo(0.5,-6);c.closePath()},d.c,1.4)}
       break;
     case 'face':[-1,1].forEach(sg=>{fo(c,()=>{c.moveTo(sg*4.5,-10.5);c.lineTo(sg*6.2,-13.5);c.lineTo(sg*1.5,-12);c.closePath()},d.c,1.8)});
       fo(c,()=>c.arc(0,0,11,0,TAU),d.c,2.6);
       c.fillStyle=OUT;c.beginPath();c.arc(-4.5,-3,1.6,0,TAU);c.fill();c.beginPath();c.arc(4.5,-3,1.6,0,TAU);c.fill();
       so(c,()=>{c.moveTo(-6.5,2.5);c.quadraticCurveTo(0,6.5,6.5,2.5)},2);
       so(c,()=>{c.moveTo(-2.2,2.8);c.lineTo(-2.2,4.6);c.moveTo(0,3.4);c.lineTo(0,5.2);c.moveTo(2.2,2.8);c.lineTo(2.2,4.6)},1.2);
       c.fillStyle='rgba(90,84,70,.55)';c.beginPath();c.arc(-8.5,1,0.8,0,TAU);c.fill();c.beginPath();c.arc(8.5,1,0.8,0,TAU);c.fill();
       if(d.aku){c.fillStyle='rgba(58,20,64,.95)';c.beginPath();c.ellipse(0,-6.8,1.6,2.6,0,0,TAU);c.fill();
         c.beginPath();c.moveTo(-3,-9.5);c.lineTo(-4.5,-13);c.lineTo(-1.5,-10.8);c.closePath();c.fill();
         c.beginPath();c.moveTo(3,-9.5);c.lineTo(4.5,-13);c.lineTo(1.5,-10.8);c.closePath();c.fill()}break;
     case 'catlord':head(c,8.5,{c:d.c,angry:1,ears:'none',lw:2.2});
       fo(c,()=>{c.moveTo(-5,-7);c.quadraticCurveTo(-9.5,-10.5,-8,-14.5);c.lineTo(-2.5,-8.5);c.closePath()},'rgba(42,16,24,.95)',1.8);
       fo(c,()=>{c.moveTo(5,-7);c.quadraticCurveTo(9.5,-10.5,8,-14.5);c.lineTo(2.5,-8.5);c.closePath()},'rgba(42,16,24,.95)',1.8);break;
     case 'angel':so(c,()=>c.ellipse(0,-11.5,4.5,1.5,0,0,TAU),1.8,'#ffd94a');
       fo(c,()=>c.ellipse(-8.5,0.5,4.5,2.2,0.5,0,TAU),'rgba(251,248,239,.98)',1.6);
       fo(c,()=>c.ellipse(8.5,0.5,4.5,2.2,-0.5,0,TAU),'rgba(251,248,239,.98)',1.6);
       head(c,7,{ears:d.small?'dog':'none',c:'#fbf8ef',lw:2.2,happy:1});break;
     case 'elephant':fo(c,()=>c.ellipse(-5.5,-1,5,6.5,0.2,0,TAU),d.c2||d.c,1.8);
       fo(c,()=>c.arc(2.5,-0.5,8,0,TAU),d.c,2.4);
       c.fillStyle=OUT;c.beginPath();c.arc(3,-3,1.2,0,TAU);c.fill();c.beginPath();c.arc(6.4,-2.4,1.2,0,TAU);c.fill();
       so(c,()=>{c.moveTo(9,1);c.quadraticCurveTo(12,4,11,8)},3,d.c);
       so(c,()=>{c.moveTo(-2,-7.5);c.lineTo(1,-6)},1,'#4a6238');break;
     case 'turtle':fo(c,()=>{c.arc(0,1.5,9.5,Math.PI,0);c.closePath()},d.sh||d.c,2.4);
       fo(c,()=>c.arc(7.5,1,5.5,0,TAU),d.c,2.2);
       c.fillStyle=OUT;c.beginPath();c.arc(9.3,-0.5,1.1,0,TAU);c.fill();
       so(c,()=>{c.moveTo(-3,-4);c.lineTo(0,-2.8)},1,'#2e4228');break;
     case 'dumpling':fo(c,()=>c.arc(0,0,9.5,0,TAU),d.c,2.4);
       so(c,()=>{c.moveTo(0,-9.5);c.lineTo(-3.5,-4.5);c.moveTo(0,-9.5);c.lineTo(0,-4);c.moveTo(0,-9.5);c.lineTo(3.5,-4.5)},1.4,'#d8c4a4');
       c.fillStyle=OUT;c.beginPath();c.arc(-3,0.5,1.2,0,TAU);c.fill();c.beginPath();c.arc(3,0.5,1.2,0,TAU);c.fill();
       so(c,()=>{c.moveTo(-1.8,3.4);c.quadraticCurveTo(-0.9,4.4,0,3.4);c.quadraticCurveTo(0.9,4.4,1.8,3.4)},1.2);break;
     case 'witch':head(c,7.5,{innerEar:1,c:d.c,lw:2.2});
       fo(c,()=>c.ellipse(0.5,-8,9.5,2.4,0,0,TAU),'rgba(58,42,82,1)',1.8);
       fo(c,()=>{c.moveTo(-4,-8.5);c.lineTo(2.5,-20);c.quadraticCurveTo(4.5,-13.5,5.5,-8.5);c.closePath()},'rgba(58,42,82,1)',1.8);
       c.fillStyle='#ffd94a';c.beginPath();c.arc(2.2,-12.5,1.1,0,TAU);c.fill();break;
     case 'alien':if(d.ufo){so(c,()=>c.ellipse(0,7.5,9,2.6,0,0,TAU),2,'rgba(138,148,168,.95)')}
       fo(c,()=>{c.moveTo(-7,7);c.quadraticCurveTo(-9.5,-6,0,-9.5);c.quadraticCurveTo(9.5,-6,7,7);c.closePath()},d.c,2.4);
       so(c,()=>{c.moveTo(-2,-9);c.lineTo(-4,-14)},1.6,'#c8ecf8');so(c,()=>{c.moveTo(2,-9);c.lineTo(4,-14)},1.6,'#c8ecf8');
       c.fillStyle='#7fd8ff';c.beginPath();c.arc(-4,-15,1.6,0,TAU);c.fill();c.beginPath();c.arc(4,-15,1.6,0,TAU);c.fill();
       c.fillStyle='#2a2e38';c.beginPath();c.ellipse(-2.5,-3,1.8,3,0.1,0,TAU);c.fill();c.beginPath();c.ellipse(3,-2.6,1.8,3,-0.1,0,TAU);c.fill();
       if(d.ice){fo(c,()=>{c.moveTo(-7,-6);c.lineTo(-10,-13);c.lineTo(-4.5,-8);c.closePath()},'rgba(232,248,255,.95)',1.4);
         fo(c,()=>{c.moveTo(4,-7);c.lineTo(7,-14);c.lineTo(7.5,-6);c.closePath()},'rgba(232,248,255,.95)',1.4)}break;
     case 'clione':fo(c,()=>{c.moveTo(-6,8);c.quadraticCurveTo(-8,-5,0,-8.5);c.quadraticCurveTo(8,-5,6,8);c.closePath()},d.c,2.4);
       fo(c,()=>c.arc(0.5,-3,2.8,0,TAU),'rgba(232,150,90,.95)',1.8);
       c.fillStyle=OUT;c.beginPath();c.arc(-1,-5.5,0.9,0,TAU);c.fill();c.beginPath();c.arc(2.5,-5.5,0.9,0,TAU);c.fill();
       so(c,()=>{c.moveTo(-1.5,-8.5);c.lineTo(-2.5,-11.5);c.moveTo(2,-8.5);c.lineTo(3,-11.5)},1.4,d.c);
       fo(c,()=>c.ellipse(-6.5,1,3,1.6,0.5,0,TAU),'rgba(240,220,250,.9)',1.2);
       fo(c,()=>c.ellipse(6.5,1,3,1.6,-0.5,0,TAU),'rgba(240,220,250,.9)',1.2);break;
     case 'mech':fo(c,()=>rr(c,-8,-7,16,14,4),d.c,2.4);
       fo(c,()=>rr(c,-5.5,-3.5,11,4.5,2),'#14141c',1.8);
       so(c,()=>{c.moveTo(-3.5,-1.2);c.lineTo(3.5,-1.2)},1.8,'#ff5a4a');
       so(c,()=>{c.moveTo(0,-7);c.lineTo(0,-11)},1.6);c.fillStyle='#ff5a4a';c.beginPath();c.arc(0,-12,1.4,0,TAU);c.fill();break;
     case 'cerberus':fo(c,()=>c.arc(-6.5,3.5,4.6,0,TAU),d.c,1.8);fo(c,()=>c.arc(7,3.5,4.4,0,TAU),d.c,1.8);
       c.fillStyle=OUT;c.beginPath();c.arc(-7.5,3,0.9,0,TAU);c.fill();c.beginPath();c.arc(-5,3,0.9,0,TAU);c.fill();
       c.beginPath();c.arc(6,3,0.9,0,TAU);c.fill();c.beginPath();c.arc(8.5,3,0.9,0,TAU);c.fill();
       fo(c,()=>{c.moveTo(-4.5,-6.5);c.quadraticCurveTo(-7.5,-9.5,-5.5,-12.5);c.lineTo(-2.5,-8);c.closePath()},'rgba(58,20,64,1)',1.4);
       fo(c,()=>{c.moveTo(4.5,-6.5);c.quadraticCurveTo(7.5,-9.5,5.5,-12.5);c.lineTo(2.5,-8);c.closePath()},'rgba(58,20,64,1)',1.4);
       head(c,7.5,{c:d.c,snout:'#e8d0f8',nose:1,open:1,lw:2.2,angry:1});break;
     default:head(c,9,{c:d.c,lw:2.4})}
   }
 ,enemyBig(id,x,y,s){ART.enemyIcon(id,x,y,12*s)}};

/* per-cat accessory overlay for icons (head-local coords, head radius r) */
function catOver(c,d,r){
 if(d.p==='wall'){c.strokeStyle='#5a6478';c.lineWidth=r*0.16;c.strokeRect(-r*0.98,-r*0.98,r*1.96,r*1.96)}
 if(d.acc==='axe'){c.strokeStyle='#6a5138';c.lineWidth=r*0.13;c.beginPath();c.moveTo(r*0.35,r*0.8);c.lineTo(r*0.92,-r*0.5);c.stroke();
   c.fillStyle='#c8ccd4';c.beginPath();c.moveTo(r*0.72,-r*0.9);c.lineTo(r*1.25,-r*0.5);c.lineTo(r*0.82,-r*0.12);c.closePath();c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.4,r*0.07);c.stroke()}
 if(d.acc==='blade'){c.fillStyle='#dfe4ec';c.beginPath();c.moveTo(r*0.3,r*0.6);c.quadraticCurveTo(r*1.1,r*0.2,r*1.2,-r*0.6);c.quadraticCurveTo(r*0.7,-r*0.15,r*0.25,r*0.1);c.closePath();c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.4,r*0.07);c.stroke()}
 if(d.p==='dragon'){[-1,1].forEach(sg=>{c.fillStyle='#e8e4d8';c.beginPath();c.moveTo(sg*r*0.45,-r*0.72);c.lineTo(sg*r*0.75,-r*1.3);c.lineTo(sg*r*0.2,-r*0.95);c.closePath();c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.4,r*0.07);c.stroke()})}
 if(d.p==='brute'){c.fillStyle='#e05a4a';rr(c,-r*0.75,-r*0.72,r*1.5,r*0.28,r*0.12);c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.2,r*0.06);c.stroke()}
 if(d.p==='mech'){so(c,()=>{c.moveTo(0,-r);c.lineTo(0,-r*1.35)},r*0.11);c.fillStyle='#ff6a5a';c.beginPath();c.arc(0,-r*1.42,r*0.13,0,TAU);c.fill();
   c.fillStyle='rgba(38,42,54,.85)';rr(c,-r*0.5,-r*0.14,r,r*0.34,r*0.14);c.fill()}
 if(d.p==='rock'){c.fillStyle='#8fb86a';c.beginPath();c.moveTo(-r*0.35,-r*0.92);c.quadraticCurveTo(r*0.1,-r*1.18,r*0.5,-r*0.82);c.quadraticCurveTo(r*0.1,-r*0.9,-r*0.35,-r*0.92);c.closePath();c.fill()}
 if(d.p==='fish'){c.fillStyle='#7fb8e0';c.beginPath();c.moveTo(-r*0.3,-r*0.95);c.lineTo(0,-r*1.4);c.lineTo(r*0.3,-r*0.95);c.closePath();c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.2,r*0.06);c.stroke()}
 if(d.p==='bird'){c.fillStyle='#e8a04a';c.beginPath();c.moveTo(r*0.55,r*0.05);c.lineTo(r*1.15,r*0.2);c.lineTo(r*0.55,r*0.35);c.closePath();c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.2,r*0.06);c.stroke()}
 if(d.p==='samurai'){c.fillStyle='#3a445e';c.beginPath();c.arc(0,-r*0.28,r*0.78,Math.PI,0);c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.4,r*0.07);c.stroke();
   c.fillStyle='#ffd94a';c.beginPath();c.moveTo(0,-r*1.02);c.quadraticCurveTo(-r*0.32,-r*1.32,0,-r*1.44);c.quadraticCurveTo(r*0.32,-r*1.32,0,-r*1.02);c.closePath();c.fill();c.stroke()}
 if(d.hat==='witch'){c.fillStyle='#4a3568';c.beginPath();c.ellipse(-r*0.1,-r*0.62,r*0.72,r*0.2,0,0,TAU);c.fill();
   c.beginPath();c.moveTo(-r*0.42,-r*0.66);c.lineTo(r*0.08,-r*1.28);c.quadraticCurveTo(r*0.2,-r*0.9,r*0.32,-r*0.66);c.closePath();c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.2,r*0.06);c.stroke()}
 if(d.hat==='pirate'){c.fillStyle='#2a2e38';c.beginPath();c.moveTo(-r*0.75,-r*0.5);c.quadraticCurveTo(0,-r*1.32,r*0.75,-r*0.5);c.quadraticCurveTo(0,-r*0.68,-r*0.75,-r*0.5);c.closePath();c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.2,r*0.06);c.stroke()}
 if(d.hat==='sailor'){c.fillStyle='#f4f2ea';c.beginPath();c.arc(0,-r*0.34,r*0.68,Math.PI,0);c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.2,r*0.06);c.stroke();
   c.fillStyle='#3a5a8a';rr(c,-r*0.68,-r*0.42,r*1.36,r*0.16,r*0.06);c.fill()}
 if(d.hat==='princess'){c.fillStyle='rgba(255,90,138,.9)';c.beginPath();c.moveTo(-r*0.3,-r*0.82);c.lineTo(0,-r*1.2);c.lineTo(r*0.3,-r*0.82);c.closePath();c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.2,r*0.06);c.stroke()}
 if(d.hat==='sushi'){c.fillStyle='#f4f2ea';rr(c,-r*0.6,-r*0.95,r*1.2,r*0.3,r*0.1);c.fill();c.fillStyle='#e8705a';rr(c,-r*0.6,-r*1.2,r*1.2,r*0.28,r*0.1);c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.2,r*0.06);c.stroke()}
 if(d.horns&&d.p==='kitten'){[-1,1].forEach(sg=>{c.fillStyle='#e9e2cf';c.beginPath();c.moveTo(sg*r*0.62,-r*0.68);c.quadraticCurveTo(sg*r*1.1,-r*0.86,sg*r*1.02,-r*1.3);c.quadraticCurveTo(sg*r*0.78,-r*0.95,sg*r*0.45,-r*0.92);c.closePath();c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.2,r*0.06);c.stroke()})}
 if(d.band){c.strokeStyle='#e05a4a';c.lineWidth=r*0.2;c.beginPath();c.moveTo(-r*0.98,-r*0.3);c.quadraticCurveTo(0,-r*0.52,r*0.98,-r*0.3);c.stroke()}
 if(d.crown){c.fillStyle='rgba(255,217,74,.95)';c.beginPath();c.moveTo(-r*0.4,-r*0.78);c.lineTo(-r*0.4,-r*1.12);c.lineTo(-r*0.16,-r*0.9);c.lineTo(0,-r*1.2);c.lineTo(r*0.16,-r*0.9);c.lineTo(r*0.4,-r*1.12);c.lineTo(r*0.4,-r*0.78);c.closePath();c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.2,r*0.06);c.stroke()}
 if(d.horns&&d.p==='luga'){[-1,1].forEach(sg=>{c.fillStyle='#e9e2cf';c.beginPath();c.moveTo(sg*r*0.4,-r*0.7);c.quadraticCurveTo(sg*r*1.15,-r*0.95,sg*r*0.9,-r*1.6);c.quadraticCurveTo(sg*r*0.7,-r*1,sg*r*0.2,-r*0.8);c.closePath();c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.2,r*0.06);c.stroke()})}
 if(d.glass){c.fillStyle='rgba(38,42,54,.88)';c.strokeStyle=OUT;c.lineWidth=Math.max(1.4,r*0.08);
   c.beginPath();c.arc(-r*0.38,-r*0.12,r*0.3,0,TAU);c.fill();c.stroke();
   c.beginPath();c.arc(r*0.38,-r*0.12,r*0.3,0,TAU);c.fill();c.stroke()}
 if(d.cyborg){c.fillStyle='#8a94a8';rr(c,-r*0.55,-r*0.28,r*1.1,r*0.36,r*0.12);c.fill();
   c.strokeStyle=OUT;c.lineWidth=Math.max(1.2,r*0.06);c.stroke();
   c.fillStyle='#ff5a4a';c.beginPath();c.arc(r*0.2,-r*0.1,r*0.1,0,TAU);c.fill()}
 if(d.mask&&d.cape){c.fillStyle='#2a2e38';rr(c,-r*0.62,-r*0.3,r*1.24,r*0.3,r*0.1);c.fill();
   c.fillStyle='#fff';c.beginPath();c.arc(-r*0.34,-r*0.15,r*0.09,0,TAU);c.fill();c.beginPath();c.arc(r*0.34,-r*0.15,r*0.09,0,TAU);c.fill()}
 else if(d.mask){c.fillStyle='#3a3f4e';rr(c,-r*0.72,-r*0.3,r*1.44,r*0.3,r*0.12);c.fill();
   so(c,()=>{c.moveTo(-r*0.7,-r*0.22);c.lineTo(-r*1.02,-r*0.42)},Math.max(1.2,r*0.07),'#3a3f4e')}
 if(d.snakes){for(let i=0;i<3;i++)so(c,()=>{c.moveTo(-r*0.4+i*r*0.4,-r*0.85);c.quadraticCurveTo(-r*0.5+i*r*0.4,-r*1.15,-r*0.3+i*r*0.4,-r*1.32)},Math.max(1.2,r*0.06),'#7fae4a')}
 if(d.p==='blob'){so(c,()=>{c.arc(-r*0.35,-r*0.35,r*0.3,Math.PI*0.9,Math.PI*1.4)},Math.max(1.4,r*0.08),'rgba(255,255,255,.8)')}
 if(d.aura){c.strokeStyle='rgba(255,215,80,.8)';c.lineWidth=Math.max(1.4,r*0.08);c.beginPath();c.arc(0,0,r*1.18,-2.4,-0.7);c.stroke()}}

/* ---------- title crowd face (kept API) ---------- */
ART.catHead=function(x,y,r,walking){const c=cx;
  c.save();c.translate(x,y);
  c.fillStyle='#fff';c.strokeStyle='#22262f';c.lineWidth=Math.max(2.5,r*0.16);c.lineJoin='round';
  c.beginPath();c.moveTo(-r*0.82,-r*0.35);c.lineTo(-r*0.62,-r*1.15);c.lineTo(-r*0.15,-r*0.78);c.closePath();c.fill();c.stroke();
  c.beginPath();c.moveTo(r*0.82,-r*0.35);c.lineTo(r*0.62,-r*1.15);c.lineTo(r*0.15,-r*0.78);c.closePath();c.fill();c.stroke();
  c.beginPath();c.arc(0,0,r,0,TAU);c.fill();c.stroke();
  c.fillStyle='#22262f';
  c.beginPath();c.arc(-r*0.36,-r*0.12,r*0.11,0,TAU);c.fill();
  c.beginPath();c.arc(r*0.36,-r*0.12,r*0.11,0,TAU);c.fill();
  c.strokeStyle='#22262f';c.lineWidth=Math.max(2,r*0.11);c.lineCap='round';
  c.beginPath();c.moveTo(-r*0.3,r*0.28);c.quadraticCurveTo(-r*0.15,r*0.5,0,r*0.3);c.quadraticCurveTo(r*0.15,r*0.5,r*0.3,r*0.28);c.stroke();
  c.restore()};

function bgSky(){const g=cx.createLinearGradient(0,0,0,720);g.addColorStop(0,'#a8d8f0');g.addColorStop(.75,'#c8e8b8');g.addColorStop(1,'#d8f0c0');cx.fillStyle=g;cx.fillRect(0,0,1280,720);
  // soft sun glow upper-right + slow back cloud layer + faster foreground wisps (parallax depth)
  const sg=cx.createRadialGradient(1180,86,20,1180,86,300);
  sg.addColorStop(0,'rgba(255,246,200,.55)');sg.addColorStop(.5,'rgba(255,246,200,.18)');sg.addColorStop(1,'rgba(255,246,200,0)');
  cx.fillStyle=sg;cx.fillRect(880,0,400,380);
  cx.fillStyle='rgba(255,255,255,.8)';for(let i=0;i<6;i++)cloudDraw(((i*260)+G.t*8)%1500-100,70+(i*47)%140,1+(i%3)*0.4);
  cx.fillStyle='rgba(255,255,255,.5)';for(let i=0;i<3;i++){const sc=0.9+(i%2)*0.5;
    cloudDraw(((i*430)+G.t*(15+i*5))%1500-120,104+(i*61)%92,sc)}}

/* ==================== UI ART HELPERS (Builder B — official-chrome support) ====================
   All textures are baked through bakeGet() so per-frame cost is a drawImage/pattern fill.
   No emoji anywhere — pictograms are vector paths. */

/* Baked mottled-parchment TILE (256px) — seeded so every bake is identical. */
function parchTileBase(c2,base,dark,light){
  c2.fillStyle=base;c2.fillRect(0,0,256,256);
  const R=rnd(9137);
  for(let i=0;i<46;i++){ // soft blotches (very low-contrast: faint aged tint, never dirty blobs)
    const x=R()*256,y=R()*256,r=10+R()*46;
    const g=c2.createRadialGradient(x,y,0,x,y,r);
    const browner=R()<0.5;
    g.addColorStop(0,browner?'rgba(146,116,66,0.13)':'rgba(246,236,206,0.28)');g.addColorStop(1,'rgba(0,0,0,0)');
    c2.fillStyle=g;c2.beginPath();c2.arc(x,y,r,0,TAU);c2.fill()}
  for(let i=0;i<330;i++){ // paper speckles / fibers
    const x=R()*256,y=R()*256;
    c2.fillStyle=R()<0.5?dark:light;c2.globalAlpha=0.02+R()*0.038;
    c2.fillRect(x,y,1+R()*2.4,1+R()*1.6)}
  c2.globalAlpha=1;
  for(let i=0;i<16;i++){ // faint short fibers
    const x=R()*256,y=R()*256,a=R()*TAU,l=6+R()*16;
    c2.strokeStyle=dark;c2.globalAlpha=0.035;c2.lineWidth=1;
    c2.beginPath();c2.moveTo(x,y);c2.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);c2.stroke()}
  c2.globalAlpha=1}

/* Full aged-parchment MAP scene (baked at content size): base tile + lat/long grid +
   continent blobs + compass rose + galleon + sea-serpent doodles + deckled torn edge +
   edge vignette. key must encode size+tint. Returns {cv,w,h}. */
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

function parchScene(w,h,tint){
  const key='parch|'+w+'x'+h+'|'+(tint||'');
  return bakeGet(key,w,h,(c2)=>{
    const pat=c2.createPattern((function(){const off=document.createElement('canvas');off.width=256;off.height=256;
      parchTileBase(off.getContext('2d'),'#d9c9a2','rgba(146,116,66,0.5)','rgba(246,236,206,0.55)');return off})(),'repeat');
    c2.fillStyle=pat;c2.fillRect(0,0,w,h);
    const R=rnd(4211);
    // large soft light/shade clouds over the tile seams (kept gentle so the parchment reads clean)
    for(let i=0;i<26;i++){const x=R()*w,y=R()*h,r=60+R()*160;
      const g=c2.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,R()<0.5?'rgba(146,116,66,0.05)':'rgba(250,242,214,0.07)');g.addColorStop(1,'rgba(0,0,0,0)');
      c2.fillStyle=g;c2.beginPath();c2.arc(x,y,r,0,TAU);c2.fill()}
    // faint cartographic lat/long grid
    c2.strokeStyle='rgba(120,96,54,.13)';c2.lineWidth=1;
    for(let gx=0;gx<=w;gx+=88){c2.beginPath();c2.moveTo(gx,0);c2.lineTo(gx,h);c2.stroke()}
    for(let gy=0;gy<=h;gy+=88){c2.beginPath();c2.moveTo(0,gy);c2.lineTo(w,gy);c2.stroke()}
    // continent blobs (faint outlined landmasses with hatch shores)
    c2.strokeStyle='rgba(112,88,48,.30)';c2.fillStyle='rgba(214,192,142,.5)';c2.lineWidth=2;
    for(let b=0;b<Math.max(4,Math.round(w*h/210000));b++){
      const bx=R()*w,by=R()*h,br=46+R()*92,sq=0.5+R()*0.35,rot=R()*3;
      c2.save();c2.translate(bx,by);c2.rotate(rot);c2.scale(1,sq);
      c2.beginPath();c2.arc(0,0,br,0.3,2.4);c2.arc(br*0.7,br*0.35,br*0.55,2.0,4.6);c2.arc(-br*0.55,br*0.4,br*0.5,3.6,5.9);c2.closePath();
      c2.fill();c2.stroke();c2.restore()}
    // compass rose (upper-left area)
    c2.save();c2.translate(w*0.11,h*0.16);c2.globalAlpha=0.5;
    c2.strokeStyle='#8a6a3a';c2.lineWidth=2;c2.beginPath();c2.arc(0,0,30,0,TAU);c2.stroke();
    c2.beginPath();c2.arc(0,0,21,0,TAU);c2.stroke();
    for(let a=0;a<8;a++){c2.save();c2.rotate(a*TAU/8);
      c2.fillStyle=a%2?'#8a6a3a':'#b0563a';
      c2.beginPath();c2.moveTo(0,-38);c2.lineTo(6,-6);c2.lineTo(-6,-6);c2.closePath();c2.fill();c2.restore()}
    c2.font='700 13px Trebuchet MS';c2.fillStyle='#7a5a2a';c2.textAlign='center';c2.fillText('N',0,-44);
    c2.restore();
    // galleon doodle (upper-right)
    c2.save();c2.translate(w*0.86,h*0.12);c2.globalAlpha=0.42;c2.strokeStyle='#6a5028';c2.lineWidth=2.4;c2.lineCap='round';
    c2.beginPath();c2.moveTo(-34,10);c2.quadraticCurveTo(0,22,34,8);c2.lineTo(26,-2);c2.lineTo(-26,-2);c2.closePath();c2.stroke();
    c2.beginPath();c2.moveTo(0,-2);c2.lineTo(0,-40);c2.stroke();
    c2.beginPath();c2.moveTo(0,-38);c2.quadraticCurveTo(20,-30,4,-14);c2.closePath();c2.stroke();
    c2.beginPath();c2.moveTo(-8,-8);c2.lineTo(-8,-26);c2.lineTo(-20,-26);c2.lineTo(-8,-14);c2.stroke();
    c2.beginPath();c2.moveTo(-46,16);c2.quadraticCurveTo(-30,10,-20,14);c2.moveTo(40,14);c2.quadraticCurveTo(52,10,60,16);c2.stroke();
    c2.restore();
    // sea-serpent doodle (lower-left)
    c2.save();c2.translate(w*0.12,h*0.82);c2.globalAlpha=0.34;c2.strokeStyle='#6a5028';c2.lineWidth=2.4;c2.lineCap='round';
    c2.beginPath();c2.moveTo(-40,10);
    for(let s=0;s<4;s++)c2.quadraticCurveTo(-40+s*22+11,-14,-40+(s+1)*22,10);
    c2.stroke();
    c2.beginPath();c2.arc(54,4,8,0,TAU);c2.stroke();
    c2.beginPath();c2.moveTo(58,-3);c2.lineTo(64,-10);c2.moveTo(50,-4);c2.lineTo(44,-12);c2.stroke();
    c2.restore();
    // "HERE BE CATS" cartouche (decorative label)
    c2.save();c2.translate(w*0.88,h*0.9);c2.globalAlpha=0.4;
    c2.strokeStyle='#6a5028';c2.lineWidth=2;rr(c2,-70,-16,140,32,10);c2.stroke();
    c2.font='700 14px Trebuchet MS';c2.fillStyle='#6a5028';c2.textAlign='center';c2.textBaseline='middle';
    c2.fillText('HERE BE CATS',0,1);c2.restore();
    // deckled torn inner edge: irregular bite marks just inside the border
    c2.strokeStyle='rgba(92,70,36,.55)';c2.lineWidth=3;
    c2.save();c2.beginPath();
    const teeth=(x0,y0,x1,y1,horiz)=>{const steps=Math.round((horiz?x1-x0:y1-y0)/26);
      for(let i2=0;i2<=steps;i2++){const t=i2/steps,j=(R()-0.5)*7;
        const px=horiz?x0+(x1-x0)*t:x0+j, py=horiz?y0+j:y0+(y1-y0)*t;
        if(i2===0)c2.moveTo(px,py);else c2.lineTo(px,py)}};
    teeth(6,6,w-6,6,true);teeth(w-6,6,w-6,h-6,false);teeth(w-6,h-6,6,h-6,true);teeth(6,h-6,6,6,false);
    c2.stroke();c2.restore();
    // edge vignette (aged darkening)
    const vg=c2.createRadialGradient(w/2,h/2,Math.min(w,h)*0.42,w/2,h/2,Math.max(w,h)*0.72);
    vg.addColorStop(0,'rgba(80,58,24,0)');vg.addColorStop(1,'rgba(80,58,24,0.26)');
    c2.fillStyle=vg;c2.fillRect(0,0,w,h);
    if(tint){c2.fillStyle=tint;c2.fillRect(0,0,w,h)}})}

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

/* White :3 cat map-marker with soft shadow + gentle bob (t = global time). */
function catMarker(c,x,y,s,t){
  const bob=Math.sin(t*2.6)*2.5;
  c.save();c.translate(x,y+bob);
  c.fillStyle='rgba(60,40,14,.28)';c.beginPath();c.ellipse(0,s*0.92-bob,s*0.72,s*0.2,0,0,TAU);c.fill();
  ART.catHead(0,-s*0.05,s*0.62,false);
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
