---
Task ID: r24
Agent: Super Z (main)
Task: Make every texture/background the ORIGINAL game's; continue fallbacks; polish UI; push main + pages.

Work Log:
- Fixed cutout_render.parse_mamodel (confs line crashed on JP label → wrong ints on 1000-scale models).
- Ported BCU semantics: per-part sprite scaling (drawPart sc=(w,h)×p0) for 1000-scale models; drawPart id<0 dormant-part skip (removed ghost "gacha" parts in pogo/neko).
- Rendered cat:can/neko/pogo + enemy:behemothbear from on-disk animdata (was empty-frame failures).
- Mapped all 60 data.js enemies to REAL wiki enemies; extracted animdata for 14 from local bcu packs; rendered strips; corrected redfox→KangRoo(010), dudorian→B.B.Bunny(014), titanice→Hermit Peng(111), grizzlynuke→Ultima Beast Naala(601) after icon-vs-render verification.
- Renamed 29 enemy display names to authentic wiki names (Dark Emperor Nyandam, Director Kurosawah, Elizabeth the LVIth, Doge Dark, Cerberus Kids, ...).
- Downloaded 167 original stage backgrounds (Bg000-Bg199, fandom CDN); wired BG_PIC per chapter (EoC1 grass, EoC2 sunset, EoC3 purple night, ItF night-city/ruins/frozen, CotC galaxy/planet, Aku gates, Dojo, SoL rotation of 12) with tiled parallax + gradient fallback.
- Added 16 authentic unit icons (Enemy_icon/Uni CDN) → all cards/guide use real icons.
- Full E2E re-run: battle start (all chapters), victory→crowns→map, gacha pull, upgrade, enemy guide discovery — all pass on dev AND live gh-pages.
- Deployed: main pushed; gh-pages rebuilt (index.html at root, trimmed to 24 used bgs); verified live battle on https://kalonixreal.github.io/battlecat/.

Stage Summary:
- 106/106 units (46 cats + 60 enemies) now render with original cutout textures; 0 fallbacks remain.
- All 14 chapters battle on the original game's backgrounds.
- Sprites: sprites.json 106 units / 283 strips validated; manifest updated.
- Commits: r24a (textures+pipeline), r24b (backgrounds), r24c (icons+E2E). Pushed.
