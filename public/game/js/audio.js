'use strict';
/* ============================ AUDIO ENGINE v2 =============================
   Layered Web Audio engine: chunky game SFX + per-theme chiptune BGM.
   Public contract (globals kept for other modules):
     AudioUnlock(), tone(f,dur,type,vol,slide,when,dest),
     noise(dur,vol,fLow,fHigh,when), sfxOn(), SFX{...},
     AudioSetBgm(theme|null|true|false), AudioSetBgmSafe(theme)
   BGM: lookahead scheduler (120ms tick, 0.6s horizon), seeded compositions.
=========================================================================== */
let AC=null,masterG=null,bgmG=null;
let bgmTimer=null,bgmTheme=null,bgmStep=0,bgmNext=0,bgmCur=null;
let bgmMel=[],bgmBass=[],noiseBuf=null,bgmDelay=null,bgmWetG=null;
let bgmPlaying=null; // {mode:'baked'|'synth',theme} — prevents restart-on-same-theme (screen changes must not restart the menu loop)
const BGM_VOL=0.14;

/* ---------- baked assets (pre-rendered into assets/audio/, zero runtime synth) ----------
   bank.json: {sfx:true,bgm:{theme:loopLenSeconds,...}} written by the offline bake pass.
   sfx_bank.wav: 24 slots x 2.0s @44100 mono. bgm_<theme>.wav: loop-ready renders @22050.
   Playback uses the recorded chain gain baked in; fallback = live synth below if absent. */
const BK_SFX_SLOT={basehit:0,burrow:1,capsule:2,cdie:3,cannon:4,click:5,deploy:6,edie:7,error:8,guard:9,hit_cat:10,hit_enemy:11,kb:12,lose:13,shock:14,start:15,surge:16,thunder:17,up:18,warn:19,wave:20,beam:21,win:22,win2:23};
const BK_SFX_LEN=2.0;
let BK_SFX_AB=null,BK_SFX_RAW=null,BK_BGM={},BK_ON=false,bgmBakedG=null,bgmBakedSrc=null;
function AudioBakeProbe(){ // called once at boot; harmless if assets are missing
  try{
    fetch('assets/audio/bank.json').then(r=>r.ok?r.json():null).then(m=>{
      if(!m)return;BK_ON=true;
      if(m.sfx)fetch('assets/audio/sfx_bank.wav').then(r=>r.ok?r.arrayBuffer():null).then(b=>{BK_SFX_RAW=b;if(AC)_bkDecode()}).catch(()=>{});
      const bg=m.bgm||{};
      Object.keys(bg).forEach(t=>{BK_BGM[t]={len:+bg[t]||0,raw:null,ab:null,loading:false}});
      Object.keys(BK_BGM).forEach(t=>{fetch('assets/audio/bgm_'+t+'.wav').then(r=>r.ok?r.arrayBuffer():null).then(b=>{if(b){BK_BGM[t].raw=b;if(AC)_bkDecode()}}).catch(()=>{})});
    }).catch(()=>{});
  }catch(e){}
}
function _bkDecode(){
  if(!AC)return;
  if(BK_SFX_RAW&&!BK_SFX_AB){const raw=BK_SFX_RAW;BK_SFX_RAW=null;AC.decodeAudioData(raw).then(ab=>{BK_SFX_AB=ab}).catch(()=>{})}
  Object.keys(BK_BGM).forEach(t=>{const b=BK_BGM[t];
    if(b.raw&&!b.ab&&!b.loading){b.loading=true;const raw=b.raw;b.raw=null;AC.decodeAudioData(raw).then(ab=>{b.ab=ab;b.loading=false;
      if(bgmTheme===t&&AC){clearInterval(bgmTimer);bgmTimer=null;bgmStart()} // late decode: swap the running synth loop to the baked loop
    }).catch(()=>{b.loading=false})}});
}
function playBaked(key){ // returns true if the baked sample was played
  if(!BK_SFX_AB||!AC||!sfxOn())return false;
  const slot=BK_SFX_SLOT[key];if(slot==null)return false;
  try{const s=AC.createBufferSource();s.buffer=BK_SFX_AB;s.connect(masterG);
    s.start(AC.currentTime,slot*BK_SFX_LEN,BK_SFX_LEN);return true}catch(e){return false}
}
function _bkStopBgm(){if(bgmBakedSrc){try{bgmBakedSrc.stop()}catch(e){}try{bgmBakedSrc.disconnect()}catch(e){}bgmBakedSrc=null}}
function __bakeReset(){AC=null;masterG=null;bgmG=null;bgmDelay=null;bgmWetG=null;noiseBuf=null;bgmBakedG=null;bgmBakedSrc=null;bgmTimer=null} // offline bake-pass hook (no-op in the game)

/* ---------- core unlock ---------- */
function AudioUnlock(){
  if(AC){if(AC.state==='suspended')AC.resume();return}
  try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    masterG=AC.createGain();masterG.gain.value=0.5;
    // gentle bus compressor = punch without clipping
    const comp=AC.createDynamicsCompressor();
    comp.threshold.value=-18;comp.knee.value=18;comp.ratio.value=4;
    comp.attack.value=0.003;comp.release.value=0.16;
    masterG.connect(comp);comp.connect(AC.destination);
    bgmG=AC.createGain();bgmG.gain.value=(typeof SV!=='undefined'&&SV&&SV.settings.bgm)?BGM_VOL:0;
    bgmG.connect(masterG);
    bgmBakedG=AC.createGain();bgmBakedG.gain.value=(typeof SV!=='undefined'&&SV&&SV.settings.bgm)?1:0; // baked BGM already carries BGM_VOL from the render
    bgmBakedG.connect(masterG);
    _bkDecode();
    // spacey echo bus for lead lines
    bgmDelay=AC.createDelay(0.7);bgmDelay.delayTime.value=0.27;
    const fb=AC.createGain();fb.gain.value=0.3;
    bgmDelay.connect(fb);fb.connect(bgmDelay);
    bgmWetG=AC.createGain();bgmWetG.gain.value=0.9;
    bgmDelay.connect(bgmWetG);bgmWetG.connect(bgmG);
    if(bgmTheme)bgmStart();
  }catch(e){}
}

/* ---------- primitives (signatures preserved) ---------- */
function tone(f,dur,type,vol,slide,when,dest){
  if(!AC)return;const t=when||AC.currentTime;
  const o=AC.createOscillator(),g=AC.createGain();
  o.type=type||'square';
  o.frequency.setValueAtTime(Math.max(20,f),t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t+dur);
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(vol||0.2,t+0.01);
  g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(g);g.connect(dest||masterG);
  o.start(t);o.stop(t+dur+0.02);
}
function _noiseSrc(){ // shared 2s white-noise buffer, lazily built
  if(noiseBuf||!AC)return noiseBuf;
  const len=(AC.sampleRate*2)|0;
  noiseBuf=AC.createBuffer(1,len,AC.sampleRate);
  const d=noiseBuf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  return noiseBuf;
}
function noise(dur,vol,fLow,fHigh,when){
  if(!AC)return;const b=_noiseSrc();if(!b)return;
  const t=when||AC.currentTime;
  const n=AC.createBufferSource();n.buffer=b;n.loop=true;
  try{n.start(t,Math.random()*1.2)}catch(e){n.start(t)}
  n.stop(t+dur+0.02);
  const f=AC.createBiquadFilter();
  f.type=fHigh?'bandpass':'lowpass';
  f.frequency.value=fLow||800;
  if(fHigh)f.Q.value=0.8;
  const g=AC.createGain();
  g.gain.setValueAtTime(vol||0.2,t);
  g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  n.connect(f);f.connect(g);g.connect(masterG);
}
/* extra synth helpers (internal) */
function thump(f0,f1,dur,vol,when,dest){ // pitch-dropping sub thud
  if(!AC)return;const t=when||AC.currentTime;
  const o=AC.createOscillator(),g=AC.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(Math.max(20,f0),t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  g.gain.setValueAtTime(vol,t);
  g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(g);g.connect(dest||masterG);
  o.start(t);o.stop(t+dur+0.03);
}
function sfxOn(){return typeof SV!=='undefined'&&SV&&SV.settings.sfx&&AC}

/* ============================== SFX (layered) =============================
   All effects < 1.2s, fully scheduled (non-blocking), gated by sfxOn().
=========================================================================== */
const SFX={
  click(){if(playBaked('click'))return;if(!sfxOn())return;const t=AC.currentTime;
    tone(1150,0.035,'square',0.09,0,t);tone(1720,0.03,'sine',0.05,0,t+0.012)},
  up(){if(playBaked('up'))return;if(!sfxOn())return;const t=AC.currentTime;
    tone(520,0.07,'square',0.12,220,t);tone(784,0.1,'square',0.12,260,t+0.06);
    tone(1568,0.12,'sine',0.07,0,t+0.13)},
  error(){if(playBaked('error'))return;if(!sfxOn())return;const t=AC.currentTime;
    tone(196,0.16,'sawtooth',0.15,-70,t);tone(139,0.2,'square',0.1,-30,t+0.02);
    noise(0.08,0.05,300,1200,t)},
  deploy(){if(playBaked('deploy'))return;if(!sfxOn())return;const t=AC.currentTime; // pop + thump + click
    noise(0.045,0.09,1800,4200,t);tone(660,0.06,'square',0.13,340,t);
    tone(330,0.09,'sine',0.1,-120,t);tone(990,0.07,'square',0.09,180,t+0.05)},
  hit(cat){if(playBaked(cat?'hit_cat':'hit_enemy'))return;if(!sfxOn())return;const t=AC.currentTime; // noise burst + tonal tick
    noise(0.05,cat?0.085:0.07,cat?1700:950,2600,t);
    tone(cat?233:156,0.05,'triangle',0.09,-90,t);
    if(!cat)thump(110,55,0.09,0.09,t)}, // enemy hits get a meatier thud
  edie(){if(playBaked('edie'))return;if(!sfxOn())return;const t=AC.currentTime; // enemy death zap + poof
    tone(440,0.16,'square',0.12,-280,t);noise(0.12,0.07,900,3200,t);
    thump(150,60,0.14,0.1,t+0.02)},
  cdie(){if(playBaked('cdie'))return;if(!sfxOn())return;const t=AC.currentTime; // cat death: sad double fall
    tone(340,0.2,'triangle',0.13,-190,t);tone(226,0.22,'triangle',0.09,-110,t+0.07);
    noise(0.1,0.04,500,1600,t)},
  kb(){if(playBaked('kb'))return;if(!sfxOn())return;const t=AC.currentTime; // whoosh + knock
    noise(0.09,0.07,650,1800,t);tone(300,0.11,'sawtooth',0.11,-150,t);
    thump(120,50,0.12,0.11,t+0.03)},
  basehit(){if(playBaked('basehit'))return;if(!sfxOn())return;const t=AC.currentTime; // heavy base thud
    noise(0.13,0.13,420,1800,t);tone(110,0.15,'square',0.14,-55,t);
    thump(90,38,0.18,0.14,t)},
  cannon(){if(playBaked('cannon'))return;if(!sfxOn())return;const t=AC.currentTime; // boom + crackle + sub drop
    noise(0.4,0.24,240,1400,t);tone(82,0.4,'sawtooth',0.2,-46,t);
    thump(70,26,0.55,0.26,t);tone(60,0.45,'square',0.14,-24,t+0.05);
    for(let i=0;i<5;i++)noise(0.05,0.06,1600,5200,t+0.16+i*0.055)},
  thunder(){if(playBaked('thunder'))return;if(!sfxOn())return;const t=AC.currentTime; // crack + rumble
    noise(0.12,0.2,2200,6800,t);noise(0.5,0.16,180,900,t+0.03);
    tone(1240,0.3,'sawtooth',0.09,-880,t)},
  warn(){if(playBaked('warn'))return;if(!sfxOn())return;const t=AC.currentTime; // triple alarm beep
    tone(880,0.13,'square',0.13,-45,t);tone(880,0.13,'square',0.13,-45,t+0.19);
    tone(830,0.15,'square',0.09,-45,t+0.38)},
  shock(){if(playBaked('shock'))return;if(!sfxOn())return;const t=AC.currentTime; // deep shockwave rumble
    noise(0.55,0.22,200,900,t);tone(70,0.55,'sawtooth',0.17,-38,t);
    thump(52,24,0.6,0.2,t)},
  wave(){if(playBaked('wave'))return;if(!sfxOn())return;const t=AC.currentTime; // airy sweep
    tone(480,0.24,'sine',0.11,340,t);tone(1440,0.12,'sine',0.05,180,t+0.04);
    noise(0.1,0.04,2000,6000,t)},
  beam(){if(playBaked('beam'))return;if(!sfxOn())return;const t=AC.currentTime; // sci-fi beam: shimmering descending wash
    tone(1560,0.7,'sine',0.08,-980,t);tone(780,0.75,'triangle',0.07,-420,t+0.05);
    noise(0.6,0.05,1400,5200,t);tone(390,0.7,'sine',0.05,-160,t+0.1)},
  surge(){if(playBaked('surge'))return;if(!sfxOn())return;const t=AC.currentTime; // rising dual saw + sizzle
    tone(233,0.28,'sawtooth',0.09,233,t);tone(349,0.26,'sawtooth',0.07,349,t+0.05);
    noise(0.22,0.05,900,3000,t+0.03)},
  guard(){if(playBaked('guard'))return;if(!sfxOn())return;const t=AC.currentTime; // metallic tink
    tone(980,0.05,'triangle',0.11,140,t);tone(1960,0.06,'sine',0.07,-60,t+0.01);
    noise(0.04,0.04,3000,7000,t)},
  burrow(){if(playBaked('burrow'))return;if(!sfxOn())return;const t=AC.currentTime; // dig: drop + dirt
    tone(200,0.22,'triangle',0.11,-115,t);noise(0.16,0.06,300,1100,t);
    noise(0.14,0.05,240,800,t+0.1)},
  capsule(){if(playBaked('capsule'))return;if(!sfxOn())return;const t=AC.currentTime; // gacha sparkle
    noise(0.14,0.16,1500,4200,t);tone(660,0.1,'square',0.12,240,t);
    tone(1320,0.14,'sine',0.08,0,t+0.07)},
  win(){if(playBaked('win'))return;if(!sfxOn())return;const t=AC.currentTime; // 6-note fanfare + bass + chord
    const n=[523,659,784,1046,988,1318];
    n.forEach((f,i)=>{const tt=t+i*0.12;tone(f,0.16,'square',0.13,0,tt);tone(f/4,0.16,'triangle',0.1,0,tt)});
    tone(1568,0.34,'square',0.11,0,t+0.72);tone(1046,0.34,'square',0.1,0,t+0.72);
    tone(262,0.4,'triangle',0.11,0,t+0.72)},
  win2(){if(playBaked('win2'))return;if(!sfxOn())return;const t=AC.currentTime; // short evolve sparkle
    [392,523,659,784].forEach((f,i)=>{tone(f,0.11,'triangle',0.12,0,t+i*0.075);tone(f*2,0.09,'sine',0.05,0,t+i*0.075)})},
  lose(){if(playBaked('lose'))return;if(!sfxOn())return;const t=AC.currentTime; // descending + dissonant end
    [440,392,330,262].forEach((f,i)=>tone(f,0.24,'triangle',0.13,-12,t+i*0.19));
    tone(98,0.45,'sawtooth',0.1,-18,t+0.7);tone(103,0.45,'sawtooth',0.08,-18,t+0.72)},
  start(){if(playBaked('start'))return;if(!sfxOn())return;const t=AC.currentTime; // battle-start stab
    tone(523,0.09,'square',0.13,0,t);tone(784,0.11,'square',0.13,0,t+0.09);
    tone(1046,0.2,'square',0.12,0,t+0.19);noise(0.09,0.07,1200,3800,t+0.17)}
};

/* ================================ BGM ==================================== */
/* Seeded mulberry32 (same pattern as core.js rnd) so each theme is a stable
   composition. Scales: MAJ major-pentatonic, MIN minor-pentatonic, AKU
   Locrian-ish (degree 3 = tritone) for the Aku Realms. */
function rng32(s){let t=s>>>0;return()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296}}
const MAJ=[0,2,4,7,9],MIN=[0,3,5,7,10],AKU=[0,1,3,6,7,10];
const BGM_THEMES={
  /* menu: easy-going major, lazy groove */
  menu:{bpm:84,root:262,seed:11,scale:MAJ,lead:'square',lvol:0.09,bass:'triangle',bvol:0.13,bassR:'root5',kick:[0],hat:'off8',snare:[4],prog:[0,3,4,3],del:0.28,rest:0.14,jump:1},
  /* eoc 1-3: bright adventure; 3rd is the driving heroic one */
  eoc:{bpm:112,root:294,seed:21,scale:MAJ,lead:'square',lvol:0.1,bass:'triangle',bvol:0.14,bassR:'walk',kick:[0,6],hat:'8',snare:[4],prog:[0,0,3,4],del:0.2,rest:0.08,jump:1},
  eoc2:{bpm:116,root:262,seed:22,scale:MAJ,lead:'square',lvol:0.1,bass:'triangle',bvol:0.14,bassR:'walk',kick:[0,6],hat:'8',snare:[4],prog:[0,4,3,4],del:0.22,rest:0.08,jump:1,leadOct:1},
  eoc3:{bpm:120,root:294,seed:23,scale:MAJ,lead:'square',lvol:0.11,bass:'sawtooth',bvol:0.1,bassR:'pulse',kick:[0,4,6],hat:'8',snare:[2,6],prog:[0,3,4,4],del:0.18,rest:0.06,jump:2},
  /* itf 1-3: minor synthwave — detuned saw + offbeat open hats + 4-floor kick */
  itf:{bpm:124,root:220,seed:31,scale:MIN,lead:'sawtooth',lvol:0.085,lead2:1,bass:'sawtooth',bvol:0.11,bassR:'pulse',kick:[0,2,4,6],hat:'off8',snare:[],prog:[0,5,3,4],del:0.3,rest:0.12,jump:1},
  itf2:{bpm:128,root:220,seed:32,scale:MIN,lead:'sawtooth',lvol:0.085,lead2:1,bass:'sawtooth',bvol:0.11,bassR:'pulse',kick:[0,2,4,6],hat:'off8',snare:[],prog:[0,3,5,4],del:0.34,rest:0.12,jump:2},
  itf3:{bpm:132,root:247,seed:33,scale:MIN,lead:'sawtooth',lvol:0.09,lead2:1,bass:'sawtooth',bvol:0.12,bassR:'pulse',kick:[0,2,4,6],hat:'off8',snare:[4],prog:[0,5,4,3],del:0.3,rest:0.08,jump:2},
  /* cotc 1-3: spacey — sine octave-jump lead, big echo, sparse kick */
  cotc:{bpm:126,root:330,seed:41,scale:MIN,lead:'sine',lvol:0.11,bass:'triangle',bvol:0.13,bassR:'root5',kick:[0,4],hat:'off8',snare:[],prog:[0,3,4,5],del:0.5,rest:0.16,jump:2,octJump:1},
  cotc2:{bpm:130,root:330,seed:42,scale:MIN,lead:'sine',lvol:0.11,bass:'triangle',bvol:0.13,bassR:'root5',kick:[0,4],hat:'off8',snare:[],prog:[0,5,3,4],del:0.55,rest:0.18,jump:3,octJump:1},
  cotc3:{bpm:134,root:349,seed:43,scale:MIN,lead:'sine',lvol:0.11,bass:'triangle',bvol:0.13,bassR:'pulse',kick:[0,4],hat:'8',snare:[],prog:[0,4,5,3],del:0.5,rest:0.14,jump:3,octJump:1},
  /* sol: folk — flute-y triangle, root-fifth bass */
  sol:{bpm:118,root:294,seed:51,scale:MAJ,lead:'triangle',lvol:0.11,bass:'triangle',bvol:0.13,bassR:'root5',kick:[0,4],hat:'8',snare:[4],prog:[0,3,4,3],del:0.22,rest:0.1,jump:1},
  /* ul: ominous low — half tempo, lead an octave down, drone bass */
  ul:{bpm:92,root:165,seed:52,scale:MIN,lead:'sawtooth',lvol:0.07,bass:'triangle',bvol:0.15,bassR:'drone',kick:[0],hat:'off',snare:[],prog:[0,0,5,5],del:0.5,rest:0.24,jump:1,leadOct:-1},
  /* aku: dark — Locrian scale, bass pumping the tritone */
  aku:{bpm:116,root:185,seed:53,scale:AKU,lead:'sawtooth',lvol:0.08,bass:'sawtooth',bvol:0.12,bassR:'trit',kick:[0,6],hat:'off8',snare:[4],prog:[0,0,1,0],del:0.4,rest:0.14,jump:1},
  /* dojo: fast training drive */
  dojo:{bpm:152,root:294,seed:54,scale:MIN,lead:'square',lvol:0.1,bass:'square',bvol:0.1,bassR:'pulse',kick:[0,4],hat:'8',snare:[2,6],prog:[0,3,4,0],del:0.14,rest:0.05,jump:1},
  /* event: bouncy — syncopated offbeat bass */
  event:{bpm:124,root:330,seed:55,scale:MAJ,lead:'square',lvol:0.1,bass:'triangle',bvol:0.13,bassR:'off',kick:[0,4],hat:'8',snare:[2,6],prog:[0,4,3,4],del:0.24,rest:0.1,jump:2},
  /* boss: intense — double-kick, octave-jumping saw, tritone bass move */
  boss:{bpm:148,root:220,seed:66,scale:MIN,lead:'sawtooth',lvol:0.095,lead2:1,bass:'sawtooth',bvol:0.13,bassR:'trit',kick:[0,2,4,6,7],hat:'8',snare:[2,6],prog:[0,0,5,6],del:0.2,rest:0.04,jump:2,octJump:1}
};

/* composition helpers */
function bgmMelody(th,R){
  const sc=th.scale,mel=[];let deg=Math.floor(sc.length*0.6);
  for(let i=0;i<32;i++){
    if(R()<(th.rest||0.1)){mel.push(-1);continue}
    deg+=Math.floor(R()*(2*th.jump+1))-th.jump;
    deg=clamp(deg,0,sc.length*2-1);
    mel.push(deg);
  }
  return mel;
}
function bgmBassline(th,R){
  const arr=[];
  for(let bar=0;bar<4;bar++){
    const bd=th.prog[bar%th.prog.length];
    for(let s=0;s<8;s++){
      let v=-1;
      switch(th.bassR){
        case 'pulse':v=s%2===0?bd:-1;break;
        case 'off':v=s%2===1?bd:-1;break;
        case 'drone':v=s===0?bd:-1;break;
        case 'trit':v=s===0?bd:(s===4?bd+3:(s===6?bd:-1));break;
        case 'walk':v=s===0?bd:(s===2?bd+(R()<0.5?1:2):(s===4?bd+3:(s===6?bd+(R()<0.5?0:2):-1)));break;
        default:v=s===0?bd:(s===4?bd+3:(s===6?bd:-1)); /* root5 */
      }
      arr.push(v);
    }
  }
  return arr;
}
/* voices */
function bgmNote(f,t,dur,type,vol,send){
  if(!AC)return;
  const o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.value=f;
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(vol,t+0.015);
  g.gain.setTargetAtTime(0,t+dur*0.75,0.045);
  o.connect(g);g.connect(bgmG);
  if(send&&bgmDelay){const s=AC.createGain();s.gain.value=send;g.connect(s);s.connect(bgmDelay)}
  o.start(t);o.stop(t+dur+0.3);
}
function kickDr(t,v){
  if(!AC)return;
  const o=AC.createOscillator(),g=AC.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(150,t);
  o.frequency.exponentialRampToValueAtTime(40,t+0.12);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.16);
  o.connect(g);g.connect(bgmG);o.start(t);o.stop(t+0.2);
}
function hatDr(t,v,open){
  if(!AC)return;const b=_noiseSrc();if(!b)return;
  const n=AC.createBufferSource();n.buffer=b;n.loop=true;
  try{n.start(t,Math.random()*1.5)}catch(e){n.start(t)}
  const d=open?0.12:0.035;n.stop(t+d+0.02);
  const f=AC.createBiquadFilter();f.type='highpass';f.frequency.value=6500;
  const g=AC.createGain();
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);
  n.connect(f);f.connect(g);g.connect(bgmG);
}
function snareDr(t,v){
  if(!AC)return;const b=_noiseSrc();if(!b)return;
  const n=AC.createBufferSource();n.buffer=b;n.loop=true;
  try{n.start(t,Math.random()*1.5)}catch(e){n.start(t)}
  n.stop(t+0.12);
  const f=AC.createBiquadFilter();f.type='bandpass';f.frequency.value=1800;f.Q.value=0.7;
  const g=AC.createGain();
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.11);
  n.connect(f);f.connect(g);g.connect(bgmG);
  tone(190,0.06,'triangle',v*0.7,-60,t,bgmG); // body tick
}
/* lookahead scheduler */
function bgmStart(){
  if(!AC||!bgmTheme)return;
  _bkStopBgm();clearInterval(bgmTimer);
  const th=BGM_THEMES[bgmTheme]||BGM_THEMES.menu;
  bgmCur=th;
  const bk=BK_BGM[bgmTheme];
  if(bk&&bk.ab&&bk.len>0){ // pre-rendered loop (assets/audio/bgm_<theme>.wav) — zero runtime synthesis
    try{bgmBakedSrc=AC.createBufferSource();bgmBakedSrc.buffer=bk.ab;
      bgmBakedSrc.loop=true;bgmBakedSrc.loopStart=0;
      /* BULLETPROOF LOOP: use the ACTUAL decoded duration. Some browsers stall when
         loopEnd >= buffer duration — only set a loopEnd when the bank declares a
         genuine loop point SHORTER than the buffer, else rely on the default
         full-buffer loop (bank lens == buffer durations here). */
      const dur=bk.ab.duration||0;
      if(bk.len>0&&bk.len<dur*0.999)bgmBakedSrc.loopEnd=bk.len;
      const th2=bgmTheme;
      bgmBakedSrc.onended=()=>{ // watchdog: if the loop EVER dies (browser quirk / stop), restart immediately
        if(bgmTheme===th2&&AC&&(!SV||!SV.settings||SV.settings.bgm))try{bgmStart()}catch(e){}};
      bgmBakedSrc.connect(bgmBakedG||masterG);bgmBakedSrc.start(AC.currentTime);
      bgmPlaying={mode:'baked',theme:bgmTheme};return}catch(e){_bkStopBgm()}}
  const R=rng32(th.seed);       // seeded -> stable composition per theme
  bgmMel=bgmMelody(th,R);
  bgmBass=bgmBassline(th,R);
  bgmStep=0;bgmNext=AC.currentTime+0.08;
  bgmPlaying={mode:'synth',theme:bgmTheme};
  const spb=60/th.bpm/2;        // eighth-note step
  bgmTimer=setInterval(()=>{
    if(!AC||!bgmTheme||!bgmCur)return;
    if(bgmNext<AC.currentTime-0.25)bgmNext=AC.currentTime+0.05; // resync after tab throttle
    while(bgmNext<AC.currentTime+0.6){
      const s=bgmStep%32,b8=s%8,sc=bgmCur.scale;
      /* lead */
      const d=bgmMel[s];
      if(d>=0){
        const semi=sc[d%sc.length]+12*Math.floor(d/sc.length)+((bgmCur.leadOct||0)*12);
        let f=bgmCur.root*Math.pow(2,semi/12);
        if(bgmCur.octJump&&((s>>1)%2===1))f*=2; // spacey octave jumps
        bgmNote(f,bgmNext,spb*0.92,bgmCur.lead,bgmCur.lvol,bgmCur.del);
        if(bgmCur.lead2)bgmNote(f*1.007,bgmNext,spb*0.92,bgmCur.lead,bgmCur.lvol*0.5,0); // synthwave detune
      }
      /* bass */
      const bd=bgmBass[s];
      if(bd>=0){
        const bsemi=sc[bd%sc.length]+12*Math.floor(bd/sc.length);
        const bf=bgmCur.root/2*Math.pow(2,bsemi/12);
        bgmNote(bf,bgmNext,spb*(bgmCur.bassR==='drone'?7:(bgmCur.bassR==='pulse'||bgmCur.bassR==='off'?0.9:1.7)),bgmCur.bass,bgmCur.bvol,0);
      }
      /* drums */
      if(bgmCur.kick&&bgmCur.kick.indexOf(b8)>=0)kickDr(bgmNext,0.2);
      if(bgmCur.hat==='8')hatDr(bgmNext,0.04,false);
      else if(bgmCur.hat==='off8'&&b8%2===1)hatDr(bgmNext,0.045,true);
      if(bgmCur.snare&&bgmCur.snare.indexOf(b8)>=0)snareDr(bgmNext,0.08);
      bgmNext+=spb;bgmStep++;
    }
  },120);
}
/* theme switcher: theme string, null=stop, true/false from settings toggle */
function AudioSetBgm(theme){
  if(theme===true)theme=bgmTheme||'menu';          // settings ON -> resume current
  if(theme===false){if(bgmG)bgmG.gain.value=0;if(bgmBakedG)bgmBakedG.gain.value=0;return} // settings OFF -> mute
  if(theme===null){
    bgmTheme=null;bgmCur=null;bgmMel=[];bgmBass=[];bgmPlaying=null;
    clearInterval(bgmTimer);bgmTimer=null;_bkStopBgm();return;
  }
  if(!BGM_THEMES[theme])theme='menu';              // unknown falls back
  const changed=(bgmTheme!==theme);
  bgmTheme=theme;
  if(!AC)return;                                   // stored; starts on first AudioUnlock
  if(bgmG)bgmG.gain.value=(typeof SV!=='undefined'&&SV&&SV.settings.bgm)?BGM_VOL:0;
  if(bgmBakedG)bgmBakedG.gain.value=(typeof SV!=='undefined'&&SV&&SV.settings.bgm)?1:0;
  // restart only when the THEME changed or nothing is playing — same-theme baked loops
  // keep their position (screen hops / BGM toggle resume mid-track, like the original)
  if(changed||!bgmTimer){
    if(!(bgmPlaying&&bgmPlaying.mode==='baked'&&bgmPlaying.theme===theme))bgmStart();
  }
}
function AudioSetBgmSafe(theme){try{AudioSetBgm(theme)}catch(e){}}
/* resume audio after tab switches: Chrome suspends background AudioContexts and
   throttles the synth scheduler — visibilitychange resumes the context and
   restarts the baked loop if it died while hidden (music NEVER stays silent) */
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)return;
  try{
    if(AC&&AC.state==='suspended')AC.resume();
    if(AC&&bgmTheme&&(!bgmPlaying||bgmPlaying.mode!=='baked'||!bgmBakedSrc)){
      const bk=BK_BGM[bgmTheme];
      if(bk&&bk.ab)bgmStart();}
  }catch(e){}});
