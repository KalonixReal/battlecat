'use strict';
/* ============================ AUDIO ENGINE v3 — AUTHENTIC =============================
   Replaces the synth/baked engine with the ORIGINAL game audio:
   - BGM: the real PONOS tracks (assets/audio/ogg/*.ogg) played as WebAudio buffer
     loops. ONE source per slot — switching themes always stops the previous source
     first (kills every overlap/double-music bug), same-theme restarts are no-ops so
     screen hops never restart the track (original behavior).
   - SFX: the real game sound effects (assets/audio/sfx/*.ogg) decoded into buffers,
     routed through the same master chain; synth primitives (tone/noise) stay as the
     fallback for anything not shipped.
   - Battle boss switch: AudioSetBgm('boss') when a boss appears (per-stage id from the
     original map data lives on the stage object).
   Public contract (unchanged): AudioUnlock(), tone(), noise(), sfxOn(), SFX{...},
   AudioSetBgm(t), AudioSetBgmSafe(t), AudioBakeProbe().
=========================================================================== */
let AC=null,masterG=null,bgmG=null,sfxG=null;
let bgmTheme=null,bgmSrc=null,bgmGain=null,bgmFade=null;
let bgmPlaying=null; // {theme} — same-theme guard (no restart on screen changes)
const BGM_VOL=0.55,SFX_VOL=1.0;

/* ---------- theme -> file ---------- */
const BGM_FILE={
  menu:'ogg/bgm_menu.ogg',            // Snd000 "The Invasion Begins" (title + base)
  upgrade:'ogg/menu_upgrade.ogg',     // Snd001 "Assemble! Cat Army" (upgrade/gacha menus)
  results:'ogg/menu_results.ogg',     // Snd005 "Ending Party" (victory results)
  gamatoto:'ogg/menu_gamatoto.ogg',   // Snd52 Gamatoto expedition
  eoc:'ogg/bgm_eoc.ogg',              // Snd003 "Invading Japan!" — the classic battle theme
  eoc2:'ogg/bgm_eoc2.ogg',            // Snd004 "The Battle of Iriomote"
  b4:'ogg/bgm_b4.ogg',                // Snd030 "Slow Battle"
  boss:'ogg/bgm_boss.ogg',            // Snd031 "The Fierce Ones who Shake the Earth" (boss!)
  boss2:'ogg/bgm_boss2.ogg',          // Snd032 "The Great Tribal March"
  boss3:'ogg/bgm_boss3.ogg',          // Snd033 "Naniwa no Koibito"
  god:'ogg/bgm_eoc_god.ogg',          // Snd034 "God's Descent" (special boss) [apk]
  itf:'ogg/bgm_itf.ogg',itf2:'ogg/bgm_itf2.ogg',itf3:'ogg/bgm_itf3.ogg',       // Snd47-49
  cotc:'ogg/bgm_cotc.ogg',cotc2:'ogg/bgm_cotc2.ogg',cotc3:'ogg/bgm_cotc3.ogg', // Snd66-68
  ul:'ogg/bgm_ul.ogg',                // Snd080 "Ancient Power"
  ul2:'ogg/bgm_ul2.ogg',              // Snd082 "Astonishing! Ancient Lifeforms"
  relic:'ogg/bgm_relic.ogg',          // Snd081 "Ancient Curse" (relic loop)
  aku:'ogg/bgm_aku.ogg',              // Snd141 "The Aku Realms"
  aku2:'ogg/bgm_aku2.ogg',            // Snd142 "Mount Aku Invasion"
  dojo:'ogg/bgm_dojo.ogg',            // Snd058 "Dojo Time"
  zero1:'ogg/bgm_zero1.ogg',zero2:'ogg/bgm_zero2.ogg',zero3:'ogg/bgm_zero3.ogg',
  event:'ogg/bgm_eoc.ogg',            // event stages use the classic theme (original data)
  sol:'ogg/bgm_eoc.ogg',
  win:'ogg/jingle_win.ogg',lose:'ogg/jingle_lose.ogg',reward:'ogg/jingle_reward.ogg',
  door:'sfx/door.ogg'
};
const bgmBuf={}; // theme -> AudioBuffer

/* ---------- real SFX ---------- */
const SFX_FILE={
  click:['sfx/click.ogg'],cancel:['sfx/cancel.ogg'],scroll:['sfx/scroll.ogg'],
  item:['sfx/item.ogg'],blocked:['sfx/blocked.ogg'],
  deploy:['sfx/deploy.ogg'],hit1:['sfx/hit1.ogg'],hit2:['sfx/hit2.ogg'],
  basehit:['sfx/basehit.ogg'],die1:['sfx/die1.ogg'],die2:['sfx/die2.ogg'],
  cannonpre:['sfx/cannonpre.ogg'],cannon:['sfx/cannon.ogg'],
  recharge:['sfx/recharge.ogg'],cannonready:['sfx/cannonready.ogg'],
  notif:['sfx/notif.ogg'],capsule:['sfx/capsule.ogg'],critical:['sfx/critical.ogg'],
  shockwave:['sfx/shockwave.ogg'],stamp:['sfx/stamp.ogg'],gamatoto_xp:['sfx/gamatoto_xp.ogg'],
  win:['ogg/jingle_win.ogg'],lose:['ogg/jingle_lose.ogg'],reward:['ogg/jingle_reward.ogg'],
  door:['sfx/door.ogg']
};
const SFX_BUF={}; // key -> {buf, gain}
const SFX_BOOST={cannon:0.9,shockwave:0.9,cannonpre:1.4,cannonready:1.6,critical:1.6,basehit:1.7,
  deploy:2.6,hit1:2.6,hit2:2.6,die1:2.4,die2:2.4,click:2.2,cancel:2.0,scroll:1.6,item:2.0,
  blocked:2.0,recharge:2.2,notif:2.2,capsule:1.8,stamp:2.0,gamatoto_xp:2.2,
  win:1.6,lose:1.6,reward:1.6,door:1.8};
const sfxLast={}; // per-key throttle
let _hitAlt=0,_dieAlt=0;

function sfxOn(){return typeof SV!=='undefined'&&SV&&SV.settings.sfx&&AC}

const AUDIO_PRELOAD={reg:0,done:0};
function AudioBakeProbe(){ // kept for boot compatibility — loads the AUTHENTIC audio now
  if(!AC)return;
  const load=(key,file,gain)=>{
    if(SFX_BUF[key])return;
    AUDIO_PRELOAD.reg++;
    fetch('assets/audio/'+file).then(r=>r.ok?r.arrayBuffer():null)
      .then(b=>b?AC.decodeAudioData(b):null)
      .then(ab=>{if(ab)SFX_BUF[key]={buf:ab,gain:gain};AUDIO_PRELOAD.done++}).catch(()=>{AUDIO_PRELOAD.done++});
  };
  for(const k in SFX_FILE){if(SFX_BUF[k])continue;load(k,SFX_FILE[k][0],SFX_BOOST[k]||1.4)}
  for(const t in BGM_FILE){
    if(bgmBuf[t])continue;
    AUDIO_PRELOAD.reg++;
    (t=>{fetch('assets/audio/'+BGM_FILE[t]).then(r=>r.ok?r.arrayBuffer():null)
      .then(b=>b?AC.decodeAudioData(b):null)
      .then(ab=>{if(ab){bgmBuf[t]=ab}
        AUDIO_PRELOAD.done++;
        // late decode: if this theme is wanted but silent, start it now
        if(bgmTheme===t&&!bgmSrc)bgmStart()
      }).catch(()=>{AUDIO_PRELOAD.done++})})(t);
  }
}

/* ---------- core unlock ---------- */
function AudioUnlock(){
  if(AC){if(AC.state==='suspended')AC.resume();return}
  try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    const comp=AC.createDynamicsCompressor();
    comp.threshold.value=-14;comp.knee.value=20;comp.ratio.value=4;
    comp.attack.value=0.003;comp.release.value=0.2;
    masterG=AC.createGain();masterG.gain.value=0.6;
    masterG.connect(comp);comp.connect(AC.destination);
    const bgmOn=(typeof SV!=='undefined'&&SV&&SV.settings.bgm);
    bgmG=AC.createGain();bgmG.gain.value=bgmOn?BGM_VOL:0;bgmG.connect(masterG);
    sfxG=AC.createGain();sfxG.gain.value=SFX_VOL;sfxG.connect(masterG);
    AudioBakeProbe();
    if(bgmTheme)bgmStart();
  }catch(e){}
}

/* ---------- synth primitives (fallbacks; signatures preserved) ---------- */
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
let noiseBuf=null;
function _noiseSrc(){
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

/* ---------- real SFX playback ---------- */
function playReal(key,minGap){
  if(!AC||!sfxOn())return false;
  const e=SFX_BUF[key];if(!e)return false;
  const now=performance.now();
  if(minGap&&sfxLast[key]&&now-sfxLast[key]<minGap)return true; // throttled (still counts as played)
  sfxLast[key]=now;
  try{const s=AC.createBufferSource();s.buffer=e.buf;
    const g=AC.createGain();g.gain.value=e.gain;
    s.connect(g);g.connect(sfxG||masterG);s.start();return true}catch(err){return false}
}

/* ============================== SFX API (real sounds + synth fallbacks) ============================== */
function thump(f0,f1,dur,vol,when,dest){
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
const SFX={
  click(){if(playReal('click',40))return;if(!sfxOn())return;const t=AC.currentTime;
    tone(1150,0.035,'square',0.09,0,t);tone(1720,0.03,'sine',0.05,0,t+0.012)},
  up(){if(playReal('item',80))return;if(!sfxOn())return;const t=AC.currentTime;
    tone(520,0.07,'square',0.12,220,t);tone(784,0.1,'square',0.12,260,t+0.06)},
  error(){if(playReal('blocked',150))return;if(!sfxOn())return;const t=AC.currentTime;
    tone(196,0.16,'sawtooth',0.15,-70,t)},
  deploy(){if(playReal('deploy',60))return;if(!sfxOn())return;const t=AC.currentTime;
    noise(0.045,0.09,1800,4200,t);tone(660,0.06,'square',0.13,340,t)},
  hit(cat){ // alternate the two authentic hit sounds like the original
    _hitAlt^=1;
    if(playReal(_hitAlt?'hit1':'hit2',45))return;
    if(!sfxOn())return;const t=AC.currentTime;
    noise(0.05,cat?0.085:0.07,cat?1700:950,2600,t)},
  edie(){_dieAlt^=1;if(playReal(_dieAlt?'die1':'die2',50))return;
    if(!sfxOn())return;const t=AC.currentTime;
    tone(440,0.16,'square',0.12,-280,t)},
  cdie(){_dieAlt^=1;if(playReal(_dieAlt?'die1':'die2',50))return;
    if(!sfxOn())return;const t=AC.currentTime;
    tone(340,0.2,'triangle',0.13,-190,t)},
  kb(){if(playReal('critical',90))return;if(!sfxOn())return;const t=AC.currentTime;
    noise(0.09,0.07,650,1800,t)},
  basehit(){if(playReal('basehit',120))return;if(!sfxOn())return;const t=AC.currentTime;
    noise(0.13,0.13,420,1800,t)},
  cannon(){if(playReal('cannonpre',0)){ // pre-attack whistle, then the blast (authentic two-parter)
      if(AC){try{const s=AC.createBufferSource();const e=SFX_BUF.cannon;
        if(e){s.buffer=e.buf;const g=AC.createGain();g.gain.value=e.gain;
          s.connect(g);g.connect(sfxG||masterG);s.start(AC.currentTime+0.42)}}catch(err){}}
      return}
    if(!sfxOn())return;const t=AC.currentTime;
    noise(0.4,0.24,240,1400,t);thump(70,26,0.55,0.26,t)},
  thunder(){if(playReal('shockwave',150))return;if(!sfxOn())return;const t=AC.currentTime;
    noise(0.12,0.2,2200,6800,t)},
  warn(){if(playReal('notif',200))return;if(!sfxOn())return;const t=AC.currentTime;
    tone(880,0.13,'square',0.13,-45,t);tone(880,0.13,'square',0.13,-45,t+0.19)},
  shock(){if(playReal('shockwave',150))return;if(!sfxOn())return;const t=AC.currentTime;
    noise(0.55,0.22,200,900,t)},
  wave(){if(playReal('item',90))return;if(!sfxOn())return;const t=AC.currentTime;
    tone(480,0.24,'sine',0.11,340,t)},
  beam(){if(playReal('critical',90))return;if(!sfxOn())return;const t=AC.currentTime;
    tone(1560,0.7,'sine',0.08,-980,t)},
  surge(){if(playReal('shockwave',150))return;if(!sfxOn())return;const t=AC.currentTime;
    noise(0.22,0.05,900,3000,t+0.03)},
  guard(){if(playReal('cancel',80))return;if(!sfxOn())return;const t=AC.currentTime;
    tone(980,0.05,'triangle',0.11,140,t)},
  burrow(){if(playReal('scroll',120))return;if(!sfxOn())return;const t=AC.currentTime;
    tone(200,0.22,'triangle',0.11,-115,t)},
  capsule(){if(playReal('capsule',200))return;if(!sfxOn())return;const t=AC.currentTime;
    noise(0.14,0.16,1500,4200,t)},
  recharge(){if(playReal('recharge',200))return;if(!sfxOn())return;const t=AC.currentTime;
    tone(880,0.1,'square',0.1,0,t)},
  cannonReady(){if(playReal('cannonready',300))return;if(!sfxOn())return;const t=AC.currentTime;
    tone(660,0.12,'square',0.1,120,t)},
  win(){if(playReal('win',0))return;if(!sfxOn())return;const t=AC.currentTime;
    [523,659,784,1046].forEach((f,i)=>tone(f,0.16,'square',0.13,0,t+i*0.12))},
  win2(){if(playReal('stamp',120))return;if(!sfxOn())return;const t=AC.currentTime;
    [392,523,659,784].forEach((f,i)=>tone(f,0.11,'triangle',0.12,0,t+i*0.075))},
  lose(){if(playReal('lose',0))return;if(!sfxOn())return;const t=AC.currentTime;
    [440,392,330,262].forEach((f,i)=>tone(f,0.24,'triangle',0.13,-12,t+i*0.19))},
  start(){if(playReal('deploy',60))return;if(!sfxOn())return;const t=AC.currentTime;
    tone(523,0.09,'square',0.13,0,t);tone(784,0.11,'square',0.13,0,t+0.09)},
  reward(){if(playReal('reward',0))return;if(!sfxOn())return;const t=AC.currentTime;
    tone(1046,0.2,'square',0.12,0,t)},
  door(){if(playReal('door',300))return;if(!sfxOn())return;const t=AC.currentTime;
    noise(0.2,0.1,300,1200,t)}
};

/* ================================ BGM ================================ */
function _stopBgmSrc(){
  if(bgmSrc){try{bgmSrc.onended=null;bgmSrc.stop()}catch(e){}
    try{bgmSrc.disconnect()}catch(e){}bgmSrc=null}
  if(bgmGain){try{bgmGain.disconnect()}catch(e){}bgmGain=null}
}
function bgmStart(){
  if(!AC||!bgmTheme)return;
  _stopBgmSrc();if(bgmFade){clearInterval(bgmFade);bgmFade=null}
  const ab=bgmBuf[bgmTheme];
  if(!ab)return; // still decoding — AudioBakeProbe starts it when ready
  try{
    bgmGain=AC.createGain();bgmGain.gain.value=1;bgmGain.connect(bgmG||masterG);
    bgmSrc=AC.createBufferSource();bgmSrc.buffer=ab;bgmSrc.loop=true;
    bgmSrc.connect(bgmGain);bgmSrc.start();
    const th=bgmTheme;bgmPlaying={theme:th};
    bgmSrc.onended=()=>{ // watchdog: loop death (tab throttle) → instant restart
      if(bgmTheme===th&&AC&&(!SV||!SV.settings||SV.settings.bgm)&&bgmSrc){try{bgmStart()}catch(e){}}
    };
  }catch(e){_stopBgmSrc()}
}
/* theme switcher: theme string | null=stop | true=resume | false=mute-by-setting */
function AudioSetBgm(theme){
  if(theme===true)theme=bgmTheme||'menu';
  if(theme===false){if(bgmG)bgmG.gain.value=0;return}
  if(theme===null){bgmTheme=null;bgmPlaying=null;_stopBgmSrc();return}
  if(!BGM_FILE[theme])theme='menu';
  const changed=bgmTheme!==theme;
  bgmTheme=theme;
  if(!AC)return;
  if(bgmG)bgmG.gain.value=(typeof SV!=='undefined'&&SV&&SV.settings.bgm)?BGM_VOL:0;
  if(!changed&&bgmSrc)return;               // same theme already playing → keep position
  if(!changed&&!bgmSrc){bgmStart();return}  // wanted but not playing (late decode) → start
  bgmStart();                                // new theme: stop old FIRST, then start (no overlap)
}
/* short crossfade used at battle end (boss theme -> jingle gap) */
function AudioStopBgmSoft(){
  if(!AC||!bgmSrc)return;
  try{const g=bgmGain;const src=bgmSrc;bgmSrc=null;bgmGain=null;
    g.gain.setTargetAtTime(0,AC.currentTime,0.12);
    setTimeout(()=>{try{src.stop()}catch(e){}try{g.disconnect()}catch(e){}},600);
  }catch(e){_stopBgmSrc()}
}
function AudioSetBgmSafe(theme){try{AudioSetBgm(theme)}catch(e){}}
/* one-shot jingle through the SFX bus (victory fanfare etc.) */
function AudioJingle(name){try{const k=name==='lose'?'lose':name==='reward'?'reward':'win';
  const e=SFX_BUF[k];if(!e)return false;
  const s=AC.createBufferSource();s.buffer=e.buf;
  const g=AC.createGain();g.gain.value=e.gain;
  s.connect(g);g.connect(sfxG||masterG);s.start();return true}catch(e){return false}}
/* resume after tab switches: Chrome suspends contexts — restart the loop if it died */
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)return;
  try{
    if(AC&&AC.state==='suspended')AC.resume();
    if(AC&&bgmTheme&&!bgmSrc&&bgmBuf[bgmTheme])bgmStart();
  }catch(e){}});
