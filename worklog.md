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

---

## Session Round — SCOUT RANK SYSTEM + DUAL EXPEDITIONS + API HARDENING (Task: autonomous QA → features)

### Current project status (assessment at round start)
- Game booted clean on the existing save (rank 2); zero console/page errors; dev.log clean.
- Full golden-path E2E re-verified with REAL pointer input at 1280x720: title → home → chapters →
  map → stage modal → battle (deploy x2, speed x2, cannon UI present) → WIN result → OK → map.
- 14-screen sweep + expedition + leaderboard: all non-blank (tests/verify-shots.ts).
- `node --check` all 9 game JS files pass; lint 0 errors / 12 benign warnings.
- VLM visual review STILL 429-blocked (retried twice this round) — pixel probes used instead.

### Completed modifications this round

**1. EXPEDITION SCOUT RANK SYSTEM (new meta-progression):**
- data.js: SCOUT_T cumulative XP ladder (10 levels: ROOKIE→MYTHIC, 900 XP cap) + SCOUT_NAMES;
  `scoutInfo()` (lv/name/cur/need/bonus/maxed), `scoutBonus()` (+6%/level rewards),
  `expdSlots()` (2nd slot at User Rank 30), `expdAnyDone()`, `expdStart` now slot-aware
  (max slots, no duplicate destination), `expdCollect(idx)` per-trip (splice, danger×12
  scout XP, RANK UP line when level crossed).
- core.js: DEF_SAVE expedition → `{actives:[], scoutXP, runs}`; `_svNormalize` migrates v1
  single `active` object into `actives[0]`, validates entries (dest/dur 1-86400s/start in
  past), hard caps at 2; scoutXP clamped. Verified: old save auto-migrated (actives=0,
  old key gone), fresh boots clean.
- ui.js drawExpedition REWORK: right column = SCOUT RANK panel (pulsing cat badge + LV ribbon,
  rank name, +N% rewards, trips count, XP progress bar w/ next-rank label, 2 slot pips with
  padlock) + one tracker card per slot (compact bezier-road scene, walking cat, paw prints,
  progress bar, countdown, per-slot COLLECT/IN-PROGRESS button); locked slot-2 card shows
  padlock + rank progress bar; destination cards fold scout bonus into reward preview;
  per-card EN ROUTE/RETURNED states + guards with slot-aware toasts.
- Home EXPEDITIONS badge now uses expdAnyDone() (fires when either slot returns).

**2. FIXED (real bug found by QA): collect-button hit rect off-canvas.**
  The pulsing COLLECT BTN was wrapped in cx.translate/scale, so its hit rect registered at
  (-78,-20) — the visual button was NEVER actually clickable, and with 2 slots both rects
  overlapped at canvas (0,0) (dispatch picked the topmost → collected the WRONG trip).
  Inherited pattern from last session's excollect. Fix: BTN at ABSOLUTE coords, pulse only
  the shadow glow (title PLAY button already used the correct pattern — audited all other
  BTN sites, none affected). Verified E2E: excollect1 rect at real position (1086,476),
  click collects the correct slot-1 trip (+3,436 XP peaks values, actives correctly spliced).
  NOTE for future devs: NEVER wrap BTN() in canvas transforms — hit rects are design-space.

**3. LEADERBOARD API HARDENING (server-side):**
- route.ts POST: in-memory rate limit — 10 posts / 10 min per name+IP (429 past that),
  bounded map (5000 keys, opportunistic sweep). Verified: 12 rapid curl POSTs → 1-10 ok,
  11-12 `{"ok":false,"error":"rate-limited"}`. Test rows cleaned; GET unaffected.

**4. CROWN LADDER M2 verified at scale** (was on the unresolved list): seeded 47 crowns →
  real-pointer stage-1 win (2 crowns earned) → total 49 → crownladder:1 AND :2 flags set,
  +30 CF/+3,000 XP each applied (cf 640, xp 14,247), screenshot qa5-crownladder-m2.png.

**5. STYLING POLISH (battle, mandatory):**
- Deploy dock cards: breathing cyan glow when ready+affordable, diagonal glass gloss
  gradient, radial cooldown ring around the countdown number, cost text color state
  (green-affordable / red-short). Pixel-verified: card bg (53,68,93) = navy+gloss.
- Field units: soft elliptical ground shadow (depth cue; fades during knockback,
  skipped for dying/wall/burrow states).

### Verification results
- Expedition E2E (fresh migrated save, real input): deploy peaks → tracker card animates →
  second deploy correctly rejected ("scout already on road") → force-complete → COLLECT at
  REAL button position → results modal (+XP/+CF/+Green Catfruit/+36 Scout XP) → NICE! →
  state applied (scoutXP 36, runs 1). Rank-30 test: 2 slots unlocked, 2 concurrent trips
  (fort+peaks), per-slot collect verified, RANK UP line fired at threshold
  (160+36=196 → lv4 PATHFINDER +18%). Slot-2 lock screen shows rank progress bar.
- Full battle E2E post-dock-rework: deploy/speed/win/OK→map, zero console errors.
- Save reset to pristine defaults via live SV mutation + game persist (rank 1, cf 300,
  0 crowns, 0 scoutXP) — fresh boot + title→home verified clean.
- 15-screen sweep all non-blank (qa5-*); node --check 9/9; lint 0 errors; dev.log clean;
  leaderboard GET 200 with 8 entries after cleanup.
- QA screenshots: tests/shots/qa5-*.png (expedition-new/active/2slots/collect/rankup,
  crownladder-m2, battle-dock, result2, final-home, all screens).

### Unresolved / next-phase priorities
1. VLM visual review still 429-blocked — retry next session with fresh quota (qa5 shots ready).
2. Scout rank currently maxes at MYTHIC (900 XP) — consider prestige/paragon ranks or
   expedition GACHA-ticket-only destinations if more depth is wanted.
3. Consider surfacing scout rank bonus inside the collect modal reward preview (currently
   folded silently into reward numbers — a tooltip line could make it more legible).
4. Battle B state is a top-level `let` (not reachable via window.__BC) — fine for players,
   but QA probes can't inspect it; consider adding B to the __BC hook for future testing.
5. 28MB WAV audio bank — re-encode if load time becomes a complaint.

---

## Session Round — TROPHY STAND SYSTEM + VICTORY CONFETTI + QA HOOK (Task: autonomous QA → features)

### Current project status (assessment at round start)
- Pristine save booted clean (rank 1); zero console/page errors; dev.log clean.
- Golden-path E2E with REAL pointer input re-verified at 1280x720: title → home → chapters →
  map → stage modal → battle (deploy, speed x2) → WIN with perfect 3-crown clear → OK → map.
- 15-screen sweep all non-blank; node --check 9/9; lint 0 errors / 12 benign warnings.
- VLM visual review STILL 429-blocked (3 attempts this round) — pixel probes used instead.

### Completed modifications this round

**1. NEW META SYSTEM — TROPHY STAND (achievements, 34 trophies in 10 themed groups):**
- data.js: TROPHY_GROUPS (Cat Collector / Story Veteran / Crown Chaser / Grand Summoner /
  Scout Captain / Monster Hunter / Treasure Seeker / Dojo Master / Rising Star / Loyal
  Commander) — 3-4 tiers each, rewards CF/XP/Rare+Gold tickets. Progress is COMPUTED LIVE
  from save state via helpers (stageClearsTotal, crownsTotal, treasuresTotal) — zero drift;
  only claim/notify flags persist. trophyProg/trophyDone/trophyClaimable/claimTrophy/
  trophyCheckAll (toast per newly-claimable, deduped via notified flags).
- core.js: DEF_SAVE + _svNormalize for `trophies:{claimed,notified}` (flag values forced to 1)
  and `stats:{pulls,wins}` (lifetime counters clamped 0-1e7).
- ui.js: full drawTrophies screen — sky bg, giant animated trophy-cup summary header
  (claimed count + rewards earned + pulsing READY badge), 2-column scrollable group grid
  (colored header bands + group icons), rows with status medallion (✓ green / pulsing gold
  star when claimable / padlock), progress bars, reward chips, CLAIM/DONE/% buttons.
  New glyph kinds: 'trophy' + 'crown'. Home menu gained TROPHIES item (purple) with a
  purple COUNT badge when claimable. Registered in boot.js SCREENS.
- Hooks (each calls trophyCheckAll): boot (post-loadSave), applyBattleResult (win path,
  also counts SV.stats.wins), doPull + doGoldPull (stats.pulls += n), consumeGachaGrant
  (cats-collected after grant), expdCollect, daily CF claim (streak).
- Verified E2E (real input): seeded 5 cats + 12 pulls → 2 claimable + toasts + notified
  flags set → home badge shows count → CLAIM cats1 (cf 300→350) + CLAIM sm1 (→400) →
  DONE medallions render → info % button toast "Recruit 15 different cats — 4/15 · reward
  100 CF" → wheel scroll (0→320) AND drag scroll (0→200) both work → post-battle
  stats.wins=1 → gacha pull E2E: pulls 12→13, rare ticket consumed, pendingPull cleared.

**2. NEW QA INFRA — window.__BC.getB()**: live battle state B exposed in the boot hook
  (was a top-level let, unreachable before). Verified: getB() returns full state mid-battle
  (st/t/units/bases), null outside battle. Future rounds can probe battle internals directly.

**3. SCOUT BONUS LEGIBILITY** (from last round's unresolved list): expedition collect modal
  now appends "Scout Rank bonus +N% applied" after the reward lines.

**4. STYLING — VICTORY CONFETTI**: endBattle(win) spawns 42 streamers (5-color palette:
  gold/pink/white/cyan/purple, deterministic rnd() seed, per-particle rot/vr/sway phase);
  drawResult updates+draws them under the UI bands (text stays readable), gentle gravity,
  recycle at bottom. Verified: 42 particles alive on result screen, 103 pixel-probe hits
  with correct palette colors, victory screenshot qa6-victory-confetti.png.
  Defeat shows none (correct).

**5. Cache-bust v15 → v16** (index.html + page.tsx wrapper in sync).

### Verification results
- Fresh-save boot → title → home clean; save reset via live SV mutation + persist works.
- 16-screen sweep (incl. new trophies screen) all non-blank (qa6b-*); zero console errors.
- Battle E2E: full win with confetti + stats.wins counter + trophy hook (no errors).
- Gacha pull E2E with new counter; expedition collect modal shows bonus line (code path).
- A brace-balance syntax slip in the home-menu edit was caught by `node --check` and fixed
  before browser testing; all 9 files pass after.
- bun run lint: 0 errors / 12 benign warnings. dev.log clean.
- QA screenshots: qa6-* and qa6b-* (home-trophy-item, trophies, trophies-claimed,
  home-badge, victory-confetti, gacha-reveal, equip-check, trophies-scrolled, all screens).

### Unresolved / next-phase priorities
1. VLM visual review still 429-blocked (5+ sessions now) — screenshots ready in tests/shots/
   (qa6b-* are freshest); retry when quota clears.
2. Trophy progression display could add a "next reward hint" on the home CATALOG panel.
3. Scout rank MYTHIC cap (900 XP) — prestige ranks or ticket-only expeditions if wanted.
4. Consider a trophy SOUND distinct from SFX.up (minor).
5. 28MB WAV bank — re-encode if load time becomes a complaint.

---

## Session Round — MISSION BOARD EXPANSION + BATTLE HUD RICHES + HOME CATALOG POLISH (Task: autonomous QA → features)

### Current project status (assessment at round start)
- Pristine save booted clean (rank 1); zero console/page errors; dev.log clean.
- Full golden-path E2E re-verified with REAL pointer input at 1280x720 BEFORE any edits:
  title → home → chapters → EoC map → stage modal (attack → Attack!) → battle (deploy ×N at
  real dock positions, kills/dmg tracked via getB()) → legit WIN (enemy base 900→0) → resOk →
  map, with XP/rank/clears/wins all applied (stats.wins=1, cleared.eoc1['0'] set).
- 14-screen sweep + verify-shots: all non-blank, zero console errors.
- node --check 9/9 game JS files; lint 0 errors / 12 benign warnings.
- QA harness quirks re-learned this round (IMPORTANT for future rounds):
  1. `G.hits.push({id:'play'...})` does NOT fire buttons — hits are rebuilt every frame; the
     injected entry is wiped before the next pointerup scan. Real pointer events (mouse move/
     down/up at the rect center from `tests/click.ts`) are the only reliable way.
  2. Home menu rows below scrollHome=0 (hm6..hm10, y>720) are OFF-CANVAS — must dispatch a
     WheelEvent on the canvas (or drag) BEFORE clicking them: `cv.dispatchEvent(new
     w.WheelEvent('wheel',{clientX,clientY,deltaY:240}))`.
  3. Stage modal buttons (mb0/mb1) only exist while the modal is open — click.ts must chain
     `attack` (600ms) → `mb1` (300ms) within the same frame window.

### Completed modifications this round

**1. DAILY MISSION BOARD: 3 → 6 MISSIONS + REAL PROGRESS BARS (core.js / ui.js / battle.js / data.js):**
- core.js MISSIONS: added 3 new dailies — 'win' (Win 2 battles, 60 CF, medal icon),
  'dep' (Deploy 8 cats in battle, 60 CF, cat icon), 'exp' (Complete 1 expedition, 70 CF,
  compass icon). DEF_SAVE + ensureMissions reset line extended with win/dep/exp counters.
- Hooks: battle.js applyBattleResult win-path increments missions.win; spawnCat increments
  missions.dep (fires on every real deploy); data.js expdCollect increments missions.exp.
- openMissionsModal COMPLETELY REDESIGNED for 6 rows: modal height 612 (title-keyed override
  in modalDraw), compact rows (rowH 55, step 62) in the drawExtra coordinate space (NOTE:
  drawExtra receives y+90+lines*28 — NOT the modal top; row layout tuned to that), per-row
  REAL progress bars (blue/green/gold fill + numeric 'n / goal' label + top gloss), pulsing
  gold icon medallions when claimable, IN PROGRESS buttons (tap → toast with exact progress),
  CLAIM buttons, ✔ CLAIMED tags, rank-tier footer badge, reset-info line, header count line.
- Layout verified collision-free: rows 187..529, footer 558..584, reset 586, CLOSE 602..648.

**2. BATTLE HUD: SESSION LOOT CHIP (battle.js):**
- Top-center chip under the stage name: gold coin dot + 'N kills · M treasure' (session
  treasure count from G.sessionTreasure), dark navy pill with gold rim. Fades with the HUD
  on result screens (correct — verified on defeat/victory shots).

**3. BATTLE: BASE ALARM AURAS (battle.js drawBases):**
- Cat base: warm pulsing rim-light ellipse while alarm>0 (complements the existing shake).
- Enemy base: red pulsing aura ellipse — clear "under attack" feedback for the push phase.

**4. VICTORY RANK MEDAL (battle.js drawResult):**
- Victory-only laurel-wreath medal at (930,262): two arcs of dark-green leaves, gold disc,
  up-glyph, 'RANK N' + 'Commander' caption, gentle breathing scale. Fades in at resultT 0.15.
  Defeat shows none (correct). Pixel-verified: gold disc + green leaf (75,137,65) present.

**5. HOME SCREEN POLISH (ui.js drawHome):**
- Scroll-position indicator rail on the menu column (gold gradient thumb tracks scrollHome).
- Catdex completion bar under the cat strip: green gradient fill + 'N% of the Catdex
  collected' label.
- NEXT TROPHY hint chip on the catalog panel (from last round's unresolved list): sorts
  unclaimed trophies by %-complete, shows group icon + truncated name + % — purple theme.

**6. Cache-bust v16 → v18** (index.html + page.tsx wrapper in sync).

### Verification results
- Mission hooks E2E (real input, 2 battles: one loss + one win + retreat test): after win —
  clear=2, win=1, dep=12, stats.wins=2 all correct; CLAIM flow verified: mclaimclear click →
  +80 CF (300→380), claimed flag set, green bar + ✔ CLAIMED tag render; IN PROGRESS toast
  shows 'Clear 2 stages — 1/2 · reward 80 Cat Food'.
- 6-row modal E2E: opens via MISSIONS (after wheel-scroll), 6 mprog/mclaim buttons at
  correct non-overlapping positions, close via mb0 works.
- Pixel probes: progress bar blue #4a9ae8 fill at exact row coordinates; claimed-state
  green #7fc86a; loot chip dark pill + gold text at (640,72..90); rank medal gold+green;
  home rail gold thumb at (612,500); Catdex green fill 660..700; hint chip purple at 940..980.
- Full regression post-edits: 14-screen sweep (tests/screen-qa.sh) zero console errors;
  verify-shots all non-blank; battle deploy/pause/retreat flows OK; 1920x800 letterbox ✓;
  390x844 portrait rotate-prompt ✓ (nonBg 1.3% = expected dark overlay).
- node --check 9/9 pass; bun run lint 0 errors / 12 benign warnings; dev.log clean.
- QA screenshots: tests/shots/qa7-*.png (01 home, 02 battle, 03 victory, 04/05 missions
  modal, 06 defeat, 07 victory-medal, 08 missions-claimed, 09 home-new, 10 1920x800,
  11 portrait, 12/13 battle-chip).

### Unresolved / next-phase priorities
1. VLM visual review still 429-blocked (6+ sessions) — pixel probes used instead; retry
   when quota clears (qa7-* shots are freshest).
2. Missions 'up' (Improve a Cat) hook only counts upgrade-screen purchases — treasure-
   based improvements don't count; consider widening if it matters.
3. Battle loot chip currently counts session-wide treasure, not per-battle — could scope
   it to the active battle if clearer feedback is wanted.
4. Scout rank MYTHIC cap (900 XP) — prestige ranks or ticket-only expeditions if wanted.
5. 28MB WAV bank load time — re-encode if it becomes a complaint.
6. Mission modal drawExtra coordinate quirk (my-94 vs modal-top) is now documented above —
   future modal layouts should always compute against the drawExtra-passed (mx,my,mw,mh),
   never the modal's own geometry.
