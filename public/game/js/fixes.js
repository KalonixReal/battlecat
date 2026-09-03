'use strict';
/* ============================== FIXES / HELPERS ============================== */
function getAbil(u){return u.side==='cat'?(u.abil||[]):(u.def.abil||[])}
const _applyDamage=applyDamage;
applyDamage=function(src,tgt,dmg,o){o=o||{};
  if(!tgt.base&&tgt.dodge===undefined){const dod=getAbil(tgt).find(a=>a.a==='dodge');if(dod)tgt.dodge={p:dod.p}}
  _applyDamage(src,tgt,dmg,o)};
const _spawnEnemy=spawnEnemy;
spawnEnemy=function(eid,x0){const u=_spawnEnemy(eid,x0);u.traits=ENEMAP[eid].tr||[];return u};

