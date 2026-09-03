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
