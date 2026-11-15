> **Before starting:** `git pull && git checkout -b final/polish`. The backdrop + part illustrations are ALREADY on main (commit "space: real NASA ISS backdrop…"), credits included (sources.csv rows `space-backdrop-nasa` and `art-part-*`, README, art README).

# Prompt H: FINAL polish pass (Claude Code, Opus 5.5). Sun 15 Nov, start ~06:45, HARD STOP 11:30

You are the final-polish engineer for STORMPROOF (NASA Space Apps 2026, Space Mission Design Game).
Read AGENTS.md fully first, then HANDOFF.md, ISSUES.md, DEMO.md, qa/FUNCTIONAL.md. Every rule in AGENTS.md section 1 still applies.
Iyad is the only human awake; Renad is asleep. Work alone, decide, log decisions in HANDOFF.md. Ask Iyad only for something irreversible.

FACSAT-2 wording: Iyad chose **wording A** (final, 2026-11-15); it is already in the repo; do not change it.

## 0. Why this pass exists (mentor and playtest evidence, Sat night + Sun 06:30)
Mentors at the venue (AOU Jeddah) said:
- M1. The game suits systems engineers, not teens or newcomers. Keep the challenge and the physics; remove the jargon wall.
- M2. The Build parts need to be much more interactive: each option should show what it does (figures, pictures, camera views), as interesting as the hover hotspots but different.
- M3. A university doctor said it "doesn't feel like a game".
- M4. The background should look like more realistic space.
- Keep the site light.

A first-time playthrough of the live site (https://iyadabouelseoud.github.io/stormproof/, main b3b9c07) found:
- P1 **No challenge at the start.** The default design shows all 6 gauges OK and "All 11 checks pass"; pressing Next five times gives LIVED, score 79.
- P2 **A hidden requirement fails without warning.** Revisit (≤ 10 days) is never shown on Build, Orbit or Launch. The Report shows "REVISIT: MISSED 14.1 days". The player could not have known, and nothing says that pointing drives revisit.
- P3 **The launch date changes silently.** Launch says Apr 15 2023; Flight says May 15 2023. The 1-month slip is only explained deep in the Report cause chain, so it looks like a bug.
- P4 **The mission log spoils the ending.** At day 0 it already lists "Day 1,313 Mission nominal" plus about 25 identical "Solar storm alert / Density spike" rows.
- P5 **There is one decision in the whole flight.** The storm vote "stands for every storm", so 25 storms give 1 choice.
- P6 **The Report is a wall.** The useful next step (Re-fly / "Change one thing") is near the bottom. All three medals are LOCKED on a decent run. Check whether "Sun survivor" (truth life > plan life) can be reached at all in Angola for any launch date 2015-2026; if not, say so in ISSUES.md and change its wording or condition to something reachable and honest (no fake unlock).
- P7 **Jargon a 15-year-old cannot parse:** Cocktail Napkin / Initial Feasibility / Trade Space / Point Design, F10.7 sfu, Margin +244.9% (need 35%), Swath, Delta-v, Downlink 0.0096 Mbps, Comms min/day, Density 6.77e-13 kg/m³, Kp, FCC 22-74, "Funda" never introduced.
- P8 **Misleading numbers:** panel and battery cards show "Power 0 W" (they make or store power), and "GAME-BALANCED" repeats 22 times on Build.
- P9 The orbit sweet spot is 500-510 km on a 200-800 km slider, which is real and should stay, but it needs to read as a target zone, not a trap.

## 1. Non-negotiables (any break = revert that change)
- Do NOT edit engine/src (physics, decay.ts, drag.ts, contracts), golden tests, golden fixtures, content numbers, sources.csv rows, or demo codes in content/demo/*.json. engine tests stay 164 passed + 3 expected fail + 7 skipped (or whatever HANDOFF says now, unchanged).
- Angola and Jeddah demo codes in DEMO.md must give the same numbers on screen (`web/scripts/demo-walk.mjs` passes).
- Same difficulty: requirements, targets and scoring stay identical. Teen mode changes WORDS, HINTS and VISUALS only, never thresholds.
- Light: total new shipped bytes ≤ 900 KB (images included), no new npm deps, no runtime external calls, all new images lazy-loaded (`loading="lazy"`, `decoding="async"`) except the space backdrop.
- Hex and px only in styles/tokens.css. No glow, no confetti, no emoji. --sol only for the Sun. AI images get the visible `.sp-si-tag`. No people.
- en and ar for every new string (i18n symmetry test passes). RTL checked.
- prefers-reduced-motion: every new animation off or instant.
- axe: 0 serious/critical at 390 and 1440, EN/AR, Night/Paper.

## 2. Git plan
- Branch `final/polish` from main. Commit after each item with tests green. Rollback point is tag v1.0-rc2.
- At 11:30 at the latest: run the full test set, merge to main, push (main auto-deploys), wait for Pages, smoke the live URL, then tag `v1.0`. If anything is red at 11:30, merge only the green commits (cherry-pick) and log the rest as "not shipped" in HANDOFF.md.
- Commit messages end with the trailers this repo already uses.

## 3. Work, in priority order (cut from the bottom)

### TIER 1 (must ship, ~2 h)

**H1. Mode toggle: "Cadet" (default) / "Engineer".** Put it next to the language toggle; persist it in the store (and in localStorage, wrapped in try/catch). Engineer = today's UI exactly. Cadet = the same screens and numbers with:
- plain words via a `term(key)` helper that returns the Cadet or Engineer label from i18n. Map at least: CML rail → "1 Idea · 2 Rough check · 3 Compare · 4 Final design"; Mass margin → "Spare weight"; Power margin → "Spare power"; Swath → "Photo width"; Resolution → "Smallest thing you can see"; Revisit → "Comes back every…"; Delta-v → "Fuel to raise your orbit"; Downlink → "Radio speed" (show MB per pass, not Mbps); Comms min/day → "Talk time with the ground station"; F10.7 sfu → "Sun activity" (Low/Medium/High/Very high, using the existing game-balanced colour steps; the number stays in a tooltip); Kp → "Storm strength N of 9"; Density → "Air is N× thicker than a quiet-Sun day" (computed from values the adapter already has; if no quiet baseline exists, say "air thickness" with a bar and keep the number in a tooltip); FCC 5-year rule → "Clean-space rule: come down within 5 years".
- one-line "why it matters" under every gauge, e.g. Time: "Your satellite slowly falls. More Sun = thicker air = it falls faster."
- "Funda" introduced once on Brief: "Your ground station is at Funda, near Luanda (approximate)".
- Jargon tooltips (the Track 7 tier 3 item): a small "?" button on each term opens a 1-2 sentence popover. Keyboard, Esc, aria. No hover-only content.
- Acceptance: a Playwright test switches modes and asserts that the Cadet Build has none of these strings visible: "Delta-v", "Swath", "sfu", "e-1", "Cocktail". Engineer shows them.

**H2. Requirement tracker = the challenge is visible from second 1 (fixes P1, P2).** A sticky strip on Build, Orbit and Launch with the 5 requirements (Angola) / 6 (Jeddah) as chips: icon, plain label, live value vs target, ✓/✗. Use the live truth result the store already computes; revisitDays and the others exist in SimResult. Add a "Projected score N/100" and 0-3 stars (stars = score bands 60/80/95, game-balanced, in the copy). On Brief, change the CTA copy to "Your first draft misses 1 goal. Can you fix it?" when the default design misses one (it does: revisit 14.1 > 10). Each ✗ chip, when tapped, names the parts or settings that move it (from a static coupling map in content/text, e.g. revisit ← pointing, altitude, camera photo width) and scrolls to that slot.
- Acceptance: on load with the default design, Build shows Revisit ✗ 14.1 / 10 days and the projected score equals the Report score of the same design (test).

**H3. Build "Part lab": per-option interactivity (M2), zero new heavy assets.** In the existing PartDetail panel (and as a compact live preview on the selected card), add one live mini-visual per slot, computed from engine/adapter numbers at the current altitude:
- Camera: **"What your camera sees"**: the real GIBS HLS image already shipped (web/public/img/gibs/angola_cunene_hls30.jpg; jeddah_hls30.jpg for Jeddah), canvas-blurred to that option's GSD at the current altitude. Reuse Report's SatelliteView logic (extract it into ui/CameraView.tsx). Use a side-by-side or a drag slider "current pick vs this option", plus a scale bar ("this box = 100 m"). Also draw the photo width as a strip on a tiny map. The caption keeps the NASA GIBS credit.
- Panels: an SVG cubesat with wings sized ∝ panel area; a power bar "makes X W / uses Y W" that animates as you switch.
- Battery: an "Eclipse countdown": a 35.8-min shadow bar (use the real eclipse minutes from the fit check) with the battery draining; it shows "lasts with Z% to spare" or "runs out at minute M".
- Radio: "One pass over Funda": a bar for one pass of the computed pass length, filling with the MB sent vs MB made per day.
- Computer: a storage bucket filling over the days between passes.
- Pointing: a ground-strip cone showing how far sideways the camera can look (offNadirFactor) and the resulting "comes back every N days".
- Fuel: an arrow "+N days of life" from the delta-v already modelled (if no per-option life number exists, show the delta-v as "can raise the orbit by ~N km" only if computed; else the plain text, no invented number).
- Every visual has a text equivalent for screen readers and shows the knock-on chips (gauge before → after) that tier 1 already has.
- Show "GAME-BALANCED" once per slot header (with the tooltip), not on every card. Replace the "Power 0 W" rows: panels show "Makes ~X W at this orbit" (computed), the battery shows capacity only.
- Card thumbnails: **already committed** (already on main): 21 files `web/public/img/art/parts/<part-id>.webp`, 256×256, 171 KB total, ink-engraving style on paper, one per part id in content/parts.json (there is no "tier" file for camera-radar; it has one file). Show each at 96-128 px on its card, and larger (≤ 256 px) in PartDetail with the `.sp-si-tag`, `loading="lazy"`, and alt text from content/text/art-alt.json (add 21 en/ar entries: "Illustration of a <part>"). They are Paper-ground art: on Night, put them in the existing paper "plate" frame. The 21 sources.csv rows already exist (`art-part-<id>`).

**H4. The background looks like real space (M4). ALREADY DONE in commit "space: real NASA ISS backdrop…" (already on main). Your job is only to: verify it at 390/1440 and in both languages; check that the header text over the photo reads well (if not, raise the `.sp-backdrop::after` opacity token range, or move background-position so the Milky Way core is not behind the title); keep axe at 0; and show the credit in the app footer/sources drawer: "Background: NASA ISS photo iss073e0516005, public domain" (credit is already in sources.csv and README). Do not undo the following, which is already implemented:
- Remove the coloured four-point sparkles and the shooting stars (they read as cartoon). Keep the parallax and warp only if subtle; cut the warp to ≤ 300 ms.
- Stars: neutral white with a slight warm/cool tint (add 3 star tokens in tokens.css), a realistic magnitude spread (about 70% 1 px at 0.35-0.6 opacity, 25% 1.5 px, 5% 2 px), and slow, subtle twinkle only on the brightest 5%.
- Add the backdrop image `web/public/img/space/space-backdrop-{2560,1280}.webp` (from Dua, ≤ 150 KB / ≤ 70 KB) via image-set/srcset, fixed, behind the stars, dimmed by a token overlay so text contrast stays ≥ 4.5:1. If the file is a real NASA photo, credit it in content/sources.csv (new row; NASA images are generally public domain; record the exact page URL Dua gives). If it is Gemini art, the SI tag shows once in the footer ("Background: SI-generated illustration"). If no file exists by 10:00, ship the star changes alone.
- Paper theme unchanged.

### TIER 2 (game feel, M3; ~1.5 h)

**H5. Moments, not pages.**
- Launch: a 3-2-1 countdown (≤ 2.5 s, skippable, instant with reduced motion) using the existing rocket art, then, if the engine applied a slip, an event card: "Launch delayed 1 month: rideshare launches often slip. The Sun you meet is now different (+23 days)" with values from the result's launch-slip cause (fixes P3). Flight's launch date and this card must agree.
- Flight: the log reveals entries as the playhead passes them, never ahead (fixes P4). Group storms: "Storm season: 6 storms this month" collapses. At the first storm with Kp ≥ 7, keep the existing vote as a full-screen decision card with a 1-line consequence for each option; after the flight, show "Your storm choice cost/saved N days" if the engine result provides it (re-run the other policy through the adapter, which is a pure call; no engine change).
- A live HUD while flying: day counter, "falling N m/day" (computed), and the requirement chips ticking ✓ as they are earned (data GB rising toward the target, lifetime days toward 1,095).
- Report top card first: LIVED/DIED stamp, stars, score, and ONE big button "Best next fix" that applies the single change with the largest score gain among a small candidate set (altitude ±10 km, pointing up a tier, launch ±1 year), found by running the adapter (pure, deterministic; cap at 12 runs; < 300 ms total or show a spinner). Under it, "Why" (the existing cause chain, collapsed to the top 2 with "show all").
- Medals: fix P6 honestly. Add progress text ("4 of 5 goals; fix revisit to unlock").
- Sound: keep it off by default (judges). Add a small "Turn on sound for the full experience" chip on Brief only.

**H6. First-run coach marks (Cadet only):** 4 steps max (Brief goal → Build tracker → Orbit green zone → Launch date and the Sun stripe), dismissible, never shown again after Skip (stored). Show the Orbit "green zone" (where all tracked goals pass) as a highlighted band on the slider, computed from the existing band engine runs.

### TIER 3 (only if all above is green before 10:30)
- H7. "Challenge cards" on Brief: 3 one-line quests with fixed codes (use only codes you generate and verify with the engine; e.g. "Make it live past 2027 on a $1.2M budget"). Store the codes in content/demo/challenges.json with a test that locks their outcomes.
- H8. A sharable "mission patch" on Report: the existing emblem + score + mission code (copy button already exists).

## 4. Verification (you do not self-certify)
1. `pnpm -r test` (engine counts unchanged, web tests + new tests green, i18n symmetry), `pnpm build`.
2. Playwright: smoke.mjs, smoke-jeddah.mjs, demo-walk.mjs, judge-walk.mjs at 390 and 1440, EN/AR, Night/Paper, Cadet/Engineer; 0 console errors; no horizontal overflow; axe 0 serious/critical.
3. Byte budget script: print the bytes of new files in dist and fail if > 900 KB; print the total dist size before and after.
4. Lighthouse desktop on the built preview: Performance ≥ 95, Accessibility 100. Report the mobile score too.
5. A **teen walk**: write web/scripts/teen-walk.mjs, which starts in Cadet with the default design, reads the tracker, follows the ✗ chip hint (pointing up a tier or altitude into the green zone), launches, and asserts score > 79 and the revisit ✓. Screenshot each screen to qa/screens/teen/ (git-ignored).
6. Update HANDOFF.md (done / not shipped / evidence), DEMO.md (whether the demo is in Cadet or Engineer; the judges' demo stays in Engineer unless Iyad says otherwise), README (a Cadet mode line; background credit), qa/JUDGE_ANSWERS.md (+2 Qs: "Is Cadet mode easier?" No: the same targets and physics, only plain words and hints. "Where do the camera previews come from?" The real NASA GIBS HLS image, blurred to each camera's resolution).

## 5. Report back to Iyad (short)
What shipped, what was cut, test counts, byte delta, Lighthouse, the live URL check, the v1.0 tag status, and the 3 riskiest things for Dua to click before 13:00.
