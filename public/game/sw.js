/* ===================== BATTLE CATS SERVICE WORKER (r40) =====================
   WHY: the site is a single 500MB load-everything-at-boot game. GitHub Pages
   serves every asset with Cache-Control max-age=600 — so a revisit 10 minutes
   later re-downloaded the ENTIRE game again ("a lot of loading issues").
   This worker keeps the full asset set in Cache Storage after the first visit:
   every later boot fills its loading bar from the local cache in seconds.

   STRATEGY
   - cache-first for same-origin game payloads: /assets/** (webp/png/ogg),
     /js/*.js?v=NN, /fonts/**  (all immutable; js is query-versioned)
   - .json manifests (sprites.json / preload.json / catbase.json) are NEVER
     cached: they always come from the network so content changes land
     immediately.
   - everything else (documents, cross-origin) passes straight through.
   - VER must be bumped whenever the asset set changes (deploy ritual) —
     activate() deletes every older cache wholesale.
   - any failure at any point falls back to the network: a broken worker can
     never break the game. Quota-exceeded puts are swallowed (rare on 500MB).

   Registered from index.html (works at /game/ in dev AND at the gh-pages
   root — all paths are checked by substring, never absolute). */
'use strict';
const VER='bc-v58';

self.addEventListener('install',()=>{self.skipWaiting()});
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  try{
    const req=e.request;
    if(req.method!=='GET')return;
    const u=new URL(req.url);
    if(u.origin!==location.origin)return;
    const p=u.pathname;
    const isAsset=(p.indexOf('/assets/')>=0||p.indexOf('/js/')>=0||p.indexOf('/fonts/')>=0)
      &&p.indexOf('.json')<0;
    if(!isAsset)return;
    e.respondWith(
      caches.open(VER).then(c=>
        c.match(req).then(hit=>{
          if(hit)return hit;
          return fetch(req).then(res=>{
            if(res&&res.ok){try{c.put(req,res.clone())}catch(_){/* quota — pass */}}
            return res;
          }).catch(()=>hit);
        })
      ).catch(()=>fetch(req))
    );
  }catch(err){/* never intercept on internal error */}
});
