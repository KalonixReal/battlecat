# 4-apk — Authentic menu art extracted from The Battle Cats (PONOS)

## Source chain (all PONOS-original data, zero re-drawn art)

1. **APK**: `download/apk/battlecats_15.5.0.xapk` (181 MB, APKPure XAPK bundle,
   `jp.co.ponos.battlecatsen` v15.5.0 / versionCode 1505000) → contains
   `InstallPack.apk` (137 MB, extracted at `download/apk/xapk/InstallPack.apk`).
2. InstallPack.apk `assets/` holds the LOCAL packs (DataLocal, ImageLocal,
   ImageDataLocal, MapLocal, NumberLocal, UnitLocal + snd000-192) — but the
   menu-UI PNG sheets live in PONOS's own server image packs, mirrored in
   BCData (`/tmp/bcdata/en_server/`, cloned from fieryhenry's PONOS data mirror).
3. **Decrypt recipe** (from tbcml 1.1.0 / BCGM, verified live):
   - `.list` files: AES-128-ECB, key = hex(md5("pack")[:8]) as ASCII (16 bytes)
   - `*Server*.pack` chunks: AES-128-ECB, key = hex(md5("battlecats")[:8])
   - `ImageDataLocal.pack` is stored **unencrypted**
4. The 15.5.0 APK's OWN `ImageDataLocal.pack` carries the current
   `img060_01.imgcut` (404 cuts) — it lists the peeking-cat cut at the exact
   same rect as the 10.6/10.7-era data, proving the asset is unchanged.
5. PNGs decrypted from the server packs into
   `download/apk/ex/ImageServer_100600_01_en/` (previous partial run of this
   task; re-verified here) + fresh `ImageServer_100700_00_en.pack` extraction.

## Priority 1 — Home-screen peeking cat face  ✅ FOUND (authentic)

- **File**: `peeking_cat.png` — 29×39 RGBA, tight alpha crop, md5 `fb7d07d74b6ab312bcefb0fd2128e431`
- **Asset name** (PONOS's own label in the imgcut): `ネコのぞくやつ` = "the cat peeking thing"
- **Sheet**: `img060_01.png` (1157×1024), cut rect `313,436,29,39`
  - pack: `ImageServer_100700_00_en.pack` @ offset 2612304, size 599296 (byte-identical region in `ImageServer_100600_01_en.pack` @ 24824112)
  - imgcut sidecar: `menu_chrome/img060_01.imgcut`; **same rect present in the v15.5.0 APK's ImageDataLocal.pack** (404-cut version)
- **Look** (VLM-verified): white/cream cat head with two pointed ears, black
  dot eyes, `:3` mouth, whisker dots; D-shaped with a **straight right edge** —
  drawn pre-clipped so it tucks against the screen's right edge while peeking
  up over the bottom bar (exactly the real game's bottom-right Store/Cat-Food
  corner cat that speaks the daily-tips bubble).
- **Not animated** (single cut in the sheet; no maanim references it) — a blink
  can be faked in-engine by squashing the eyes or toggling opacity.
- Other "peeking cat" candidates found in unit sheets (kept in `work/`):
  `004_f.png` / `016_f.png` (287,1,46,25) and `131_f.png` (319,211,46,25) —
  PONOS labels them `のぞくにゃんこ`; they are full-frontal meme-style faces
  (Gross-Cat family), NOT the peeking-over-a-bar pose. Rejected as primary.

## Priority 2 — Gacha capsule machine  ✅ FOUND (authentic)

- **Files**:
  - `capsule_machine.png` — 274×473 RGBA (claw arm + golden cat-face capsule, spin anim frame 25)
  - `capsule_ball.png` — 274×281 RGBA (static capsule ball w/ face + ears, wait pose)
  - `capsule_spin_frames/capsule_spin_f00..f59.png` + `frames.json` — 60 frames
    (0–59 of 140; claw descends → grabs → shakes; capsule splits at ~frame 60)
- **Source**: `gatya_000.png` (1024×512) from `ImageServer_100600_01_en.pack`
  assembled with `gatya_000_wait.mamodel` / `gatya_000_spin_01ren.{maanim,mamodel}`
  (PONOS animdata), rendered with the repo's own `tools/cutout_render.py`
  engine (BCU maanim semantics). Parts per imgcut: 胴体 body, 顔 face,
  左耳/右耳 ears, アーム arm, 超/激/レ/ア/!! text, 稲妻 lightning, キラキラ sparkles.
- Note: the arm is designed to hang from off-screen top (in-game it descends
  from above); `capsule_machine.png` keeps ~74 px of arm at the top edge.

## Priority 3 — Menu UI chrome  ✅ FOUND (authentic)

Raw sheets + imgcut sidecars in `menu_chrome/` (all from
`ImageServer_100600_01_en.pack` unless noted):

| sheet | contents |
|---|---|
| `img001_en.png` | XP / Cat-Food counter digits (24×46), working-cat LEVEL digits, dojo score |
| `img002_en.png` | battle UI: working-cat button ON/OFF, cat-cannon button + charge bar |
| `img004_en.png` | battle result: "PERFECT!!" banner, XP label |
| `img006_en.png` | proceed window, small window, yes/no fonts, Cat-Food buy button + XP + "Cat Food" text |
| `img007_en.png` | title-screen bust-up cats (254×254 @1.4×) + eye-blink parts |
| `img010_en.png` | HOME gold bar buttons "Start!!" / "Upgrade" / "Equip" (EN text baked), menu-button window, gray button |
| `img015.png` | sort/base button set (294 cuts) |
| `img016.png` | 960×640 grid menu background |
| `img017_en.png` | window bg + treasure/jewel icons |
| `img037_en.png` | store text windows, G-font (Item Purchase / Cat Food Purchase), category window |
| `gatya_UI_1.png` | gacha UI buttons/labels (from InstallPack.apk's ImageLocal.pack) |
| `img060_01.png` | Gamatoto screen sheet (incl. the peeking cat + generic yellow/gray buttons) |

Ready-to-use tight crops (top level): `gold_btn_start.png` (109×40),
`gold_btn_upgrade.png` (129×42), `gold_btn_equip.png` (89×42) — authentic EN
button TEXT art (transparent bg; the gold bar itself is engine-drawn),
`menu_button_window.png` (254×48), `btn_yellow.png` (256×67) /
`btn_yellow_gray.png` (PONOS's own gold bar button),
`proceed_window.png`, `small_window.png`, `catfood_buy_btn.png`,
`item_buy_btn.png`, `catfood_digits.png` (277×46), `text_window_top.png`,
`text_window_bar.png` (960×42), `grid_bg.png` (960×640), `btn_gray.png`.

## Integration notes

- imgcut rects are used **0-based** `(x,y,w,h)` — same convention as
  `tools/cutout_render.py` (hash-verified vs APK in r30).
- `peeking_cat.png` is native-resolution 29×39; draw at ~2–3× (58×78 … 87×117)
  on the 720p home canvas, right-aligned near the Cat-Food counter, bottom
  clipped by the bottom bar (y≈676) so only the head shows — the sprite's flat
  right edge hugs the screen/bubble edge. It sits directly under the daily-tips
  speech-bubble tail. ESPCN x2 via `tools/r32_batch_upscale.py` works on it if
  more crispness is wanted.
- `capsule_machine.png` / `capsule_ball.png` drop straight into the gacha
  screen centerpiece; `capsule_spin_frames/` gives the authentic shake cycle
  (30 fps native).
- Keep `download/apk/ex/` (2.5 GB of decrypted PONOS image packs + animdata +
  4828 imgcuts) as the local asset mine; the XAPK + InstallPack.apk stay in
  `download/apk/`.

## Workspace

- `work/` — intermediate: extracted unit sheets (004_f/016_f/131_f/004_p),
  candidate crops, region renders, `img060_01_v1007.png` (newest sheet source).
