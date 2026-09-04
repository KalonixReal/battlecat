'use strict';
/* ============================== REAL SPRITE RENDERER v2 ==============================
   Renders the original-game unit animations built by tools/build-sprites.py v2
   (connected-component slicing of the wiki's multi-row grid sheets).

   Manifest v2 entry (walk/atk):
     { img, frames: [[sx,sy,sw,sh,ax,ay], ...],   // sheet-space rect + anchor
       idx: [frameNumbers], dur: [ms], refH: px }  // refH = typical content height
   Anchor (ax,ay) in sheet space lands at the unit origin (feet);
   ax = frame center (sheets) or frame-0 center (attack GIF strips — keeps lunge travel). */
const SPRIT=(()=>{
  const M={units:{},icons:{},imgs:{},loading:false,loaded:false};
  const BASE='assets/sprites/';
  function img(url){
    const im=M.imgs[url];
    if(im!==undefined)return im;
    const image=new Image();
    image.onload=()=>{M.imgs[url]=image};
    image.onerror=()=>{M.imgs[url]=null};
    image.src=url;
    M.imgs[url]=image; // in-flight; callers check .complete
    return image;
  }
  async function init(){
    if(M.loading)return;M.loading=true;
    try{
      const r=await fetch(BASE+'sprites.json',{cache:'no-cache'});
      const j=await r.json();
      M.units=j.units||{};M.icons=j.icons||{};
      const urls=new Set();
      for(const k in M.units)for(const f in M.units[k].forms){
        const fm=M.units[k].forms[f];
        if(fm.walk)urls.add(BASE+fm.walk.img);
        if(fm.atk)urls.add(BASE+fm.atk.img)}
      for(const k in M.icons)urls.add(BASE+M.icons[k]);
      let n=0;const all=[...urls];
      const pump=()=>{ // staged preload: a few at a time so the first battle starts fast
        while(n<all.length&&n<6+((M._open||0))){
          const u=all[n++];const image=new Image();
          M._open=(M._open||0)+1;
          image.onload=()=>{M.imgs[u]=image;M._open--;pump()};
          image.onerror=()=>{M.imgs[u]=null;M._open--;pump()};
          image.src=u;M.imgs[u]=image}
        if(n>=all.length&&!(M._open>0))M.loaded=true;
        else if(n<all.length)setTimeout(pump,30)};
      pump();
    }catch(e){/* manifest absent — painter mode */}
  }
  function formEntry(kind,id,form){
    const u=M.units[kind+':'+id];
    if(!u)return null;
    const fs=u.forms;
    let fi=form;
    if(fi===undefined)fi=(kind==='cat'&&typeof catForm==='function'&&typeof SV!=='undefined'&&SV)?catForm(id):0;
    if(fi===undefined||fi===null)fi=0;
    for(let f=fi;f>=0;f--){if(fs[f])return fs[f]}
    for(let f=fi+1;f<3;f++){if(fs[f])return fs[f]}
    return null;
  }
  /* cycling frame index from a timed list */
  function cycIdx(list,durs,t){
    if(!list||!list.length)return 0;
    if(list.length===1)return list[0];
    const total=durs.reduce((a,b)=>a+b,0)||100*list.length;
    let p=((t*1000)%total+total)%total;
    for(let i=0;i<list.length;i++){const d=durs[i]||100;if(p<d)return list[i];p-=d}
    return list[list.length-1];
  }
  const progIdx=(list,p)=>list.length?list[clamp(Math.floor(clamp(p,0,0.999)*list.length),0,list.length-1)]:0;
  /* draw one manifest-v2 frame: anchor (ax,ay) lands at the origin;
     sc = px per sheet-pixel; flip mirrors horizontally (sheets face RIGHT) */
  function drawFrame(en,i,sc,flip){
    const fr=(en.frames||[])[i];
    if(!fr||fr.length<6)return false;
    const im=img(BASE+en.img);
    if(!im||!im.complete||!im.naturalWidth)return false;
    const sx=fr[0],sy=fr[1],sw=fr[2],sh=fr[3],ax=fr[4],ay=fr[5];
    const c=cx;
    c.save();
    if(flip)c.scale(-1,1);
    const dx=-(ax-sx)*sc,dy=-(ay-sy)*sc;
    c.drawImage(im,sx,sy,sw,sh,dx,dy,sw*sc,sh*sc);
    c.restore();
    return true;
  }
  /* ---- unit renderer: contract matches ART.cat/ART.enemy (x,y = feet origin,
        s = engine scale, dir = facing, e = {anim,atkT,idle,...}) — returns true when drawn ---- */
  function draw(kind,o){
    const e=o.e||{};
    const fi=(kind==='cat'&&o.form!==undefined)?o.form:((kind==='cat'&&typeof catForm==='function'&&typeof SV!=='undefined'&&SV)?catForm(o.id):0);
    const fm=formEntry(kind,o.id,fi);
    if(!fm)return false;
    const s=(o.s||1);
    const TARGET=kind==='enemy'?86:74;
    const flip=(o.dir||0)<0; // sheets face RIGHT (VLM-verified): cats march dir=-1 → flip to face LEFT; enemies dir=+1 unflipped
    const c=cx;
    c.save();
    c.translate(o.x||0,o.y||0); // drawUnit pre-translates to the unit; absolute call sites pass real coords
    if(e.weak)c.globalAlpha*=0.92;
    let ok=false;
    const anim=e.anim||'walk';
    if(anim==='windup'||anim==='attack'){
      const en=fm.atk||fm.walk;
      if(en){
        const list=en.idx||[0];
        let fi2;
        if(list.length>1){
          const p=anim==='windup'?(e.atkT||0)*0.42:0.42+(e.atkT||0)*0.58;
          fi2=progIdx(list,p);
        }else fi2=list[0];
        const H=(en.refH||100);
        ok=drawFrame(en,fi2,s*TARGET/Math.max(20,H),flip);
      }
    }
    if(!ok){
      const en=fm.walk||fm.atk;
      if(en){
        const list=en.idx||[0];
        let fi2;
        if(e.idle||e.anim==='idle')fi2=list[0];
        else fi2=cycIdx(list,en.dur,(o.t||0));
        const H=(en.refH||100);
        ok=drawFrame(en,fi2,s*TARGET/Math.max(20,H),flip);
      }
    }
    c.restore();
    return ok;
  }
  /* ---- icon renderer: replaces painted heads with the real unit icons ---- */
  function icon(kind,id,x,y,r,dim,form){
    let key=kind+':'+id+':'+(form!==undefined?form:0);
    let fn=M.icons[key];
    if(!fn&&kind==='cat'){ // fall back along forms
      const fi=form!==undefined?form:0;
      for(let f=fi;f>=0&&!fn;f--)fn=M.icons[kind+':'+id+':'+f];
      for(let f=fi+1;f<3&&!fn;f++)fn=M.icons[kind+':'+id+':'+f]}
    if(!fn)return false;
    const im=img(BASE+fn);
    if(!im||!im.complete||!im.naturalWidth)return false;
    const c=cx;c.save();
    if(dim!==undefined)c.globalAlpha=dim;
    const R=r*1.24;
    c.drawImage(im,x-R,y-R,R*2,R*2);
    c.restore();return true;
  }
  function stats(){return{units:Object.keys(M.units).length,icons:Object.keys(M.icons).length,imgs:Object.keys(M.imgs).filter(k=>M.imgs[k]&&M.imgs[k].naturalWidth).length,loaded:M.loaded}}
  return{init,draw,icon,formEntry,stats,ready:(k,i,f)=>{const fm=formEntry(k,i,f);return!!(fm&&((fm.walk&&img(BASE+fm.walk.img).naturalWidth)||(fm.atk&&img(BASE+fm.atk.img).naturalWidth)))}};
})();
if(typeof window!=='undefined'){window.SPRIT=SPRIT;window.addEventListener('DOMContentLoaded',()=>{try{SPRIT.init()}catch(e){}})}
