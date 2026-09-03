# The Battle Cats — Replica Worklog

## Project Overview
A full browser-playable Battle Cats replica served at `/` (Next.js 16 wrapper + full-screen iframe
mounting the standalone canvas game at `/game/index.html`). The game engine is pure-canvas JS
(modules: core/save, data, art, audio, battle, ui, savesys, boot) with pre-baked BGM/SFX WAV bank
in `/public/game/assets/audio/`.

## Current Project Status (assessment)
- Game boots cleanly, all 14+ screens render (title, home, chapters, map, submap, equip, upgrade,
  gacha + capsule animation, treasure, guide/bestiary, base, settings, store, battle).
- Full gameplay loop verified E2E: title → home → chapters → map → stage modal → battle (deploy,
  cannon, speed, pause, quit) → win → rewards (XP/rank/clears/treasure) → return to map.
- Gacha, upgrades, team equip, store purchases, daily bonus, settings toggles all verified.
- Content: 41 cats, 60 enemies, 14 chapters (EoC/ItF/CotC ×3, SoL 240, UL 80, Aku 13, Dojo 15,
  Events), 4 gacha banners, 7 cannon types, treasures, catfruit, talents, combos, missions.

## Completed Modifications (this session — Task 1: deploy + hard fixes)
1. **Deployed** the uploaded replica into the Next.js project: `public/game/*` + wrapper page
   `src/app/page.tsx` (full-viewport iframe + loading splash with postMessage handshake
   `{bc:'booted'}`; game posts from boot.js — audio streaming never blocks reveal).
2. **FIXED: splash overlay stuck** — iframe `load` is delayed by the 28MB audio fetch; old code
   used a 30s stale-closure timeout that flagged false failure. Now: postMessage + `__BC` polling.
3. **FIXED: Next.js dev-tools badge** (`<nextjs-portal>`) swallowed all clicks in the bottom-left
   88px corner (where the game's back buttons live). Disabled via `devIndicators:false` in
   next.config.ts.
4. **FIXED: scroll regions unusable by drag** — buttons inside a scroll region captured
   pointerdown first, so drag-to-scroll was impossible (only 10px gaps worked). pointerdown now
   captures the enclosing scroll region AND remembers the pressed button (`pendBtn`); tap fires
   the button, drag scrolls.
5. **ADDED: mouse-wheel scrolling** — `wheel` listener rolls the scroll region under the cursor
   (natural scrolling, horizontal regions supported).
6. **FIXED: home menu scroll inverted** — items drew at `y+scrollHome` while all other screens use
   `y-offset`. Fixed sign.
7. **FIXED: gacha reveal let stray clicks through** — during phase-2 reveal only the OK button is
   clickable now (prevents discarding unconfirmed pulls).
8. **FIXED: misleading stage-lock toast** — now says which chapter/saga to clear first.
9. Syntax error in the toast edit was caught via `node --check` + a broken-boot smoke check
   (`typeof SCREENS!=='undefined'`); all 8 game JS files now pass `node --check`.

## Content Expansion (Task: canon roster)
- **+17 enemies**: Gory, Wanwan, Owlbrow, Camelle, Master A., Bore, Kurosawah (EoC/SoL);
  General Gregor, LeSolar, Spacefish Jones, Project A, I.M. Phace, Dober, Imperator Sael,
  Elizabeth the 1st (ItF); Sunfish Jones, Celeboodle (CotC).
- **+5 cats**: Valkyrie Cat (clear ItF1 final), Li'l Cat, Li'l Tank Cat (tiny sprites),
  Moneko (rank 4, ¥-coin sprite), Neneko (rank 12). Rank unlocks fire automatically in addXP.
- New boss tables: EoC finals now Master A./Nyandam/The Face; ItF boss chain Gregor→Dark Otius→
  I.M. Phace→Project A→Dober→Imperator Sael; CotC adds Sunfish Jones; SoL bosses Kurosawah/Bore.
- Art entries for all new units (data-driven poses; new `tiny` and `coin` kitten/wall flags).

## Verification Results
- All screens pixel-verified non-blank (tests/verify-shots.ts) + zero console errors.
- Interaction-verified via agent-browser real pointer events (tests/click.ts drives G.hits).
- Aspect ratios verified: 390×844 (rotate prompt), 800×400 and 1920×800 (letterboxed scaling).
- ITF final stage spawns Imperator Sael + Celeboodle correctly; event battles include new units.
- `bun run lint`: 0 errors (11 benign warnings in game JS expression style).
- dev.log: no errors.

## Unresolved / Next-phase priorities
- VLM visual review blocked by API 429 rate-limits this session — retry when quota clears.
- Consider adding more gacha rares/specials (Island/Archer/etc.) and talents polish.
- Consider a "3-crown" EoC star system and Gauntlet-style score screens if time permits.
- The audio bank is 28MB — consider re-encoding BGM to smaller loop files if load time matters.

---

## Session Update — Verification Round Complete
- Golden-path E2E re-verified post-input-fix: play → chapters (scroll ✓) → map → stage modal →
  battle (deploy/cannon/speed/pause/quit/pan ✓) → win → OK → map. Defeat flow also verified.
- Evolution verified: Cat → Macho Cat → Mohawk Cat (catfruit consumed, ev1/ev2 flags set).
- Talents verified: talm click invests NP (SV.np2.cat = {0:1}, NP debited).
- 10+1 gacha pull verified: 11 results, multi-card reveal, OK applies all.
- Advanced battle systems: UL stage 24 (shields ✓, defeat correct — endgame scaling), Aku Gate 6
  (Aku shields ✓), event battles include new enemies (Gory/Owlbrow).
- Audio: AudioContext running, baked BGM 'menu' loaded, SFX object live.
- Fresh-save boot verified earlier (cats: cat+tank, 90 energy, title screen).
- All 8 game JS files pass `node --check`; dev.log clean; lint 0 errors.
- VLM visual review remains blocked by API 429 — cron reviewer (job 355934, every 15 min) will
  retry with fresh quota and can use tests/probe.ts / screenshots in tests/shots/.

## Current Goals / Status
Game is fully playable end-to-end with 41 cats, 60 enemies, 14 chapters, complete meta systems.
Next-phase priorities (for the 15-min reviewer):
1. Retry VLM visual review (tests/shots/*.png) and fix anything it flags.
2. Add more gacha rares/specials or 3-crown star system if stable.
3. Consider smaller BGM encodings (28MB bank) if load time matters.

---

## Session Round — QA + Crowns + Gacha Expansion + Polish (Task: autonomous round)

### Current project status (assessment at round start)
- Game stable: fresh browser session boots clean (title, t advancing), zero console/page errors.
- Golden-path E2E re-verified with REAL pointer events at 1280x720 viewport (title → home →
  chapters → map → stage modal → battle: deploy/pause/retreat → map). Note: clicks must be done
  at a 1280x720 viewport — at other sizes the design-space (1280x720) is letterboxed and raw
  mouse coords no longer map to hit rects (SC≠1).
- Stale-error trap identified: `agent-browser errors` in a long-lived session shows errors from
  OLD file versions (?v=6); a fresh session (or reload after cache-bump) shows zero. Not a bug.
- VLM visual review STILL blocked by API 429 (retried this round) — pixel probes used instead.

### Completed modifications this round
1. **CROWN SYSTEM (3-crown clears for story chapters)**
   - core.js: `SV.crowns = {ch: {stageIdx: 1..3}}` in DEF_SAVE; `_svNormalize` hard-clamps every
     pip to 0-3 and drops invalid entries; old saves auto-backfill via defaults-merge (verified:
     deleted `crowns` from a stored save → reloaded → boots clean, field restored).
   - battle.js `applyBattleResult`: on story-chapter wins, crowns = 3 if base HP ≥80%, 2 if ≥40%,
     else 1; best-per-stage kept (`Math.max`); crown sparkle FX on a 3-crown earn; ALL-CROWN
     chapter bonus (all 48 stages × 3) grants one-time 750 CF + 25,000 XP (flag:
     `SV.eventsDone['crown:'+ch]`).
   - battle.js `drawResult`: new navy CROWN band under the XP band — 3 slots pop in sequentially
     with overshoot ease (gold earned / dim unearned), "CROWN UP!" tag on improvement, and
     Gauntlet-style battle stats right-aligned: ⏱ time · ☠ kills · DMG dealt. All-crown bonus
     line appended to the drop panel (panel resizes correctly — push happens before ph2 calc).
   - ui.js `openStageModal`: "Crowns: N/3" info line + BEST CROWNS strip in the drawExtra area
     (3 pips + PERFECT! tag at 3); enemy tiles shifted down 42px via yOff to make room.
   - ui.js `drawMap`: 3 mini crown pips (gold/dim) under the "Energy -N" label of every cleared
     story-stage banner — replays can top them up.
   - ui.js `drawChapters`: story-chapter cards now show crown glyph + total "N/144" beside the
     cleared count.
   - New shared helper `crownDraw(c,x,y,s,fill,rim,dim)` in ui.js (3-point crown w/ gems).
   - New FX kind 'crown' (FXDUR 1.6): 3 gold crowns spiral outward + 10 sparkles.
2. **GACHA EXPANSION — 5 new cats (41 → 46 total)**
   - data.js: island (Rare, area anti-Red resist tank, 3 forms), archer (Rare, 420-range
     anti-Floating sniper), fortune (Rare, dodge), jurassic (Rare, area crit), kotatsu (Super
     Rare, area Freeze vs Red). Talents included; 4 new combos (Island Resort, Arrow Storm,
     Cozy Winter, Ancient Lizards).
   - art.js: ART_CATS entries (island: spotted dancing kitten; archer: scoped ranger biped;
     fortune: princess-hat staff biped; jurassic: angry dragon; kotatsu: green blob blanket).
3. **STYLING / POLISH**
   - Screen-change transition: push()/pop() set G.transT=0.30; boot.js draws a quick
     fade-from-black overlay (quadratic ease) — verified transT 0.30→0.22→0 live.
   - bgSky: soft sun glow (radial gradient upper-right) + 3 faster foreground cloud wisps for
     parallax depth (affects home + every sky-backed screen).
   - index.html script cache-bust v6 → v7.

### Verification results
- Crown E2E (fresh save, real input): won eoc1 stage 1 with base HP 74.7% → earned 2 crowns →
  victory crown band rendered (navy band + 2 gold + 1 dim pip + stats line), SV.crowns.eoc1['0']=2
  persisted, map banner shows 2 gold + 1 dim pip under Energy label (pixel-mapped), stage modal
  shows "Crowns: 2/3" + pips, chapter card shows gold crown + "2/144".
- Crown FX verified (frozen mid-phase in paused battle): 3 dimmed-gold crowns at exact spiral
  positions; only fires on 3-crown earns.
- Gacha: pool probe lists all 5 new cats in correct rarity pools; 12 rollGacha samples include
  island/fortune; REAL pull flow via UI (Rare Ticket consumed → capsule anim → reveal → OK →
  grant applied, pendingPull cleared, zero errors).
- New-cat art: granted 5 cats → equip screen renders roster cleanly; battle deploy of island
  cat renders sprite on field, no errors.
- screen-qa.sh sweep (14 screens): all non-blank, zero console errors (NOTE: must open
  localhost:3000 in the default session before running the script, else it captures blanks).
- `node --check`: all 9 game JS files pass. `bun run lint`: 0 errors / 11 benign warnings.
  dev.log clean. Syntax error during dev (extra brace in crown edit) was caught immediately
  by node --check and fixed before browser testing.

### Unresolved / next-phase priorities
1. VLM visual review still 429-blocked — retry with fresh quota (screenshots in tests/shots/,
   incl. new qa2-* captures).
2. Crowns currently award on story chapters only (EoC/ItF/CotC). Consider extending to Aku gates.
3. The 28MB WAV audio bank load time — consider re-encoding if it matters.
4. Consider a Crown-progress reward ladder (e.g. every 48 crowns → CF) instead of only the
   full-144 bonus.

---

## Session Round — CRITICAL BALANCE BUG + 3 NEW SYSTEMS (Task: autonomous round: QA → fix → features)

### Current project status (assessment at round start)
- Game booted clean, all 14 screens rendered, zero console errors (fresh-session sweep).
- Golden-path E2E with real pointer clicks at 1280x720 worked (title → home → chapters → map →
  stage modal → battle → deploy/cannon/speed → result → map).
- HOWEVER: stage-1 battles with the starting team kept LOSING in ways that felt wrong, which led
  to discovering a critical enemy-data bug (below). Also found a stuck-state bug and a crash path.

### Completed modifications this round

**BUG FIXES (priority — all verified E2E with real pointer input):**
1. **FIXED (CRITICAL): enemy range/speed arg swap in EF signature.** All 60 enemies were defined
   with wiki order (rate, SPEED, RANGE) but EF declared (rate, RANGE, SPEED) — every enemy ran at
   2–5× intended speed (Doge 337px/s effective, faster than Giraffe Cats) with a ~9px attack
   reach, causing them to blitz the field then traffic-jam at the cat base forever (rateT draining
   to −30, never striking). One-line signature swap in data.js + explanatory comment. After fix:
   Doge range=45/speed=9 (→67px/s, crosses field in ~35s — authentic pacing), early stages
   properly winnable with the starting team. Battle trace before/after verified live.
2. **FIXED: Worker Cat modal blocked the battle result screen.** Opened mid-battle and left open,
   the generic modal kept drawing over the result panel and its mb*-only pointer filter swallowed
   the OK click (result screen stuck, verified live). endBattle() now drops any open modal
   (`if(G.modal)G.modal=null`) the moment a result is set. Regression-tested: modal left open
   through a full win → auto-closed → OK works.
3. **FIXED: invalid team ids crash the battle screen every frame.** A hand-edited/imported save
   with unknown cat ids (e.g. 'ninja', 'vale') made catStats() throw → boot.js catch painted the
   red "UI ERROR" overlay forever (battle.png was 99% #300 dark red). Now: boot.js sanitizes team
   slots against CATMAP after loadSave(); startBattle() filters team ids defensively. Verified:
   tampered team auto-cleaned to empty slots on reload, battle renders clean.
4. Synced wrapper iframe cache-bust (page.tsx ?v=6 → ?v=12, matching index.html).

**NEW FEATURE 1 — SCOUT EXPEDITIONS (Gamatoto-style idle meta):**
- data.js: EXPD table (5 destinations: Sunny Meadow 3m → Storm Fortress 60m, danger 1–5, XP/CF/
  ticket/fruit chances); expdToday() 3-of-5 daily rotation (date-seeded); expdStart/Collect with
  rank + Accounting scaling; random ticket/fruit bonus rolls.
- core.js: DEF_SAVE `expedition:{active,runs}` + hard normalization (bad active trips dropped).
- ui.js: full drawExpedition screen — terrain swatch cards with hills/sun, claw-mark danger pips,
  reward preview, DEPLOY buttons; live tracker with bezier road scene, goal flag, animated scout
  cat walking along the path (progress-mapped), paw prints, progress bar, countdown, pulsing
  COLLECT button, results modal. Home menu gained an EXPEDITIONS item with a green READY! badge
  (like the missions badge). New glyph kinds: compass/flag/medal.
- Verified E2E: deploy → progress strip → forced timer completion → COLLECT → rewards modal
  (+2,616 XP +91 CF) → runs counter → state cleared.

**NEW FEATURE 2 — CROWN LADDER (milestone rewards):**
- battle.js applyBattleResult: total crowns counted across all chapters; every 24 crowns → +30 CF
  +3,000 XP milestone (eventsDone['crownladder:N'], repeating forever). Fires with toast + crown
  FX; result drop panel appends "CROWN LADDER Mn: …" lines.
- Verified E2E: set 26 crowns → won story stage with 3-crown → M1 fired (xp 3816→7394, cf
  391→421, flag set), result panel line shown, screenshot qa3-crown-ladder.png.

**NEW FEATURE 3 — WORLD DOJO RANKING (first true fullstack feature):**
- prisma/schema.prisma: new LeaderboardEntry model (name/score/stage/createdAt); db:push run.
- src/app/api/leaderboard/route.ts: GET (top-N, ordered) + POST (hard-validated: name ≤18 chars,
  score 0–1M, stage ≤32; keeps only each commander's best per stage — upsert-style).
- battle.js dojoRecordRun(): on endless-run end (win OR defeat) updates local top-5, then
  fire-and-forget POST of record-breaking runs using SV.cmdName.
- ui.js drawLeaderboard screen: navy starfield bg, top-3 podium (gold/silver/bronze + medal
  glyph), rows 4–20 with own-row highlight + YOU tag, own-best panel, REFRESH button, offline
  fallback text. Reached via new WORLD RANKING button on the Dojo map record board.
- Settings: COMMANDER NAME row (EDIT → modal with real DOM input overlay; Enter saves; sanitized
  to 18 chars). New helpers nameFocus/nameBlur (hidden <input> over canvas, keyboard-driven).
- Verified E2E: curl POST/GET; in-game leaderboard fetch renders seeded entries; endless-run end
  auto-posted CAT COMMANDER:77 (best-per-commander replaced old 3); name editor typed "SCOUT ACE"
  via real keystrokes + Enter → saved + modal closed.

**STYLING / POLISH (mandatory):**
- Toasts: slide-in with cubic ease + spring overshoot, drop shadow, colored icon dot with glossy
  highlight, left-aligned text (was: static centered plain chip).
- Modals: pop-in scale animation (0.18s cubic-out + overshoot) + backdrop fade + title ribbon
  shadow. Hit rects stay in final design space (visual-only transform) — verified clicks still
  land during/after animation.
- Title screen: attract-mode pulsing glow + breathing scale on the PLAY button.
- Home: EXPEDITIONS menu item + animated READY! badge dot.
- Dojo map: record board restyled taller with WORLD RANKING button + "global board" caption.

### Verification results
- Fresh browser session: 14-screen sweep (tests/screen-qa.sh) → zero console errors, all screens
  non-blank (tests/verify-shots.ts); battle screen no longer dark-red error wash.
- Golden path re-verified post-fixes: title → home → chapters → map → stage modal → battle
  (deploy ×N, cannon, speed toggle) → legit WIN at t=112s with 94% base HP → 3 crowns → OK → map.
  (Defeat flow also verified earlier in the round.)
- Expedition / leaderboard / name editor / crown ladder / auto-POST all E2E verified (above).
- Aspect ratios: 1920x800 letterboxed ✓, 390x844 portrait dark rotate-prompt ✓, 1280x720 primary.
- `node --check`: all 9 game JS files pass. `bun run lint`: 0 errors / 12 benign warnings
  (expression-style warnings in game JS incl. upload/ copies — not served).
- dev.log: clean; API routes 200; Prisma queries logged without error.
- New QA screenshots: tests/shots/qa3-*.png (title-pulse, expedition, exp-active, exp-collect,
  leaderboard, leaderboard2, crown-ladder, victory-crowns, battle-check, 1920x800, portrait).

### Unresolved / next-phase priorities
1. **Crown ladder M2+ needs save testing at scale** — M1 verified; deeper milestones only reachable
   via long play (or another seeded-crown QA run).
2. Leaderboard has no auth/rate-limit (canvas game, trusted-ish) — consider a lightweight per-session
   POST cap server-side if abuse matters.
3. VLM visual review still blocked by API 429 in this environment — pixel probes used instead
   (tests/probe.ts coordinates documented in worklog history).
4. Consider expedition "scout level" progression (trips increase a scout rank → small reward
   multipliers) and a second concurrent slot unlocked at Rank 30.
5. The 28MB WAV bank load time — re-encode if it matters.
