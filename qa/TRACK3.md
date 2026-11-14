# TRACK 3: Release hygiene audit

Audit only. Nothing outside `qa/track3/` and this file was changed. Scripts: `qa/track3/check1.mjs` (sources), `check2.mjs` (credits), `check3.mjs` (art), `sheet.mjs` (art contact sheets), `net.mjs` (network proof), `public.mjs` (public access), `lh.json` (Lighthouse raw). Checked at HEAD `0c14577`. Playwright's bundled chromium is not installed (version mismatch), so scripts use `channel: 'chrome'`.

## Summary table

| # | Check | Result |
|---|---|---|
| 1 | Number traceability | PARTIAL / FAIL (see 1) |
| 2 | NASA credits on screen | PASS with two weak spots |
| 3 | AI images (tags, alt, no logos/people, size) | PASS with hygiene issues |
| 4 | Secrets (tree + history) | PASS |
| 5 | No runtime external calls, fonts self-hosted | PASS |
| 6 | Public access, Pages | PASS (build_type workflow) |
| 7 | README licences / limits | FAIL: 3 carryover-6 items missing |
| 8 | Performance | PASS (Perf 100, A11y 96) |

## 1. Number traceability: PARTIAL

Evidence: `node qa/track3/check1.mjs`.
- `content/sources.csv`: 85 rows, 0 duplicate ids. Tags by proper CSV parse: sourced 35, SI-generated 31, game-balanced 15, computed 2, "secondary source" 1, "approximate" 1. Tag values outside the AGENTS.md trio: 33 rows (31 art rows are "SI-generated", acceptable as art; "secondary source" and "approximate" are not in the sourced/computed/game-balanced vocabulary). 11 rows have an empty `source` column (all are game-balanced rows: elevation-mask, target-lat, storm-alert-kp, battery-dod, reboost-drop, launch-slip, reset-chance, score-per-req, score-sun, closest-distance, bus-mass), acceptable but they cite nothing.
- `engine/src/constants.ts` `SOURCES`: 26 keys, all upper-case constant names (e.g. `MU_KM3_S2`) with a free-text citation. 0 of 26 keys equal a csv id (csv uses kebab ids: `mu`, `cd`, ...). So the engine-to-csv link is by prose, not by id. Not an orphan problem, but it is not machine-checkable.
- `content/parts.json`: 21 `src` values, 0 orphans (all `game-balanced` or a csv id).
- `content/rockets.json`: 2 `src` values. rockets[1] begins with csv id `spacex-rideshare-min-price` (ok). rockets[0] is free text "AGENTS.md s5 (200 kg to 500 km SSO) ...": no csv id (csv has `electron-capacity`; it should cite that).
- `content/scenarios/angola.json` and `jeddah-flood.json`: `src` is "game-balanced (...)" with a free-text suffix, not an exact id; both begin with the allowed token. Free-text prefix match only.
- `content/text/*.json`: 0 `src` fields (nothing to resolve).
- csv ids not referenced by any json or `SOURCES`: 70 of 85 (they are referenced from TS prose, art, or not at all). Not an error, but no automatic resolution.
- **There is no `SimResult.sources` field.** `grep sources engine/src/contracts.ts` finds only a comment about a csv id. The contract in AGENTS.md section 4 has no such field either; the trace is built in the web layer by `reportSources()` in `web/src/engineAdapter.ts` (line 515).
- Sources drawer: `web/src/screens/Report.tsx` lines 365-385 render a `<details class="sources">` table with label, value, tag (`sp-src-tag--sourced|computed|game-balanced`) and source, from `reportSources()`. It lists lifetime, plan lifetime, Sun took, reentry alt, FCC, NASA, CML margin, each requirement value and target, score, each cause, closest design, each chosen part, Sun Stripe steps, GIBS image. It does NOT list the gauge values (mass, power, budget, data, comms, time), rocket capacity/price, orbit limits, or numbers on Build/Launch/Flight. So "every number on screen traces" is only true for the Report screen's headline numbers.

## 2. NASA credits on screen: PASS (two weak spots)

Evidence: `node qa/track3/check2.mjs`, `web/src/App.tsx` line 251.
- Footer on every screen (`shell.credit`, EN and AR): "NASA OMNIWeb data drives the NRLMSIS 2.1 model (NRL). Storms: NASA DONKI. Images: NASA GIBS/Worldview. Solar forecast: NASA."
- OMNIWeb: footer (all screens), `sun.legend` (Brief, Launch), `ptn.explain` (Launch).
- DONKI: footer, `storm.body` (Flight storm card).
- GIBS/Worldview: footer, Report satellite-view credit (`report.gibs_credit` from credits.json), Jeddah panel (`jeddah.before_credit`, `after_credit`, `rain.credit`, `cloud.note`). 
- IMERG: Jeddah panel (`jeddah.rain.title`, `rain.credit`, `event.imerg`). Not in footer (fine, only used there).
- NASA solar-cycle prediction: footer says only "Solar forecast: NASA" and Launch legend says "hatched = NASA forecast". The phrase "solar-cycle prediction" does not appear in any user string. Weak spot: suggest footer "Solar forecast: NASA solar-cycle prediction".
- Weak spot 2: other datasets from AGENTS.md section 5 (NASA LSP area-to-mass medians and DAS deck, JPL CML, Goddard MDL) have no on-screen credit string found (JPL appears only in RainCube text); they are credited in README only.
- No dataset used without any credit besides those noted.

## 3. AI images: PASS with hygiene issues

Evidence: `node qa/track3/check3.mjs`, grep of `web/src`, contact sheets viewed.
- 27 webp files in `web/public/img/art`, total 5,181,262 bytes = 4.94 MiB (`du -sb` 5,182,807 incl. README). Under 6 MB: PASS. Same size in `web/dist/img/art`.
- Every render of an art file shows the tag: 11 `<Illustration>` uses (component overlays `.sp-si-tag`), plus 4 direct `<img>` uses that add their own tag: `Brief.tsx` 55 (`<SiTag/>`), `Build.tsx` 47 (inline `<span class="sp-si-tag">`), `Jeddah.tsx` 42 (`<SiTag/>`). No CSS `background: url(img/art)` exists (`grep url(` shows fonts only). PASS.
- Every art file has a row in `content/sources.csv`: 27 of 27. Every art file has EN and AR alt in `art-alt.json`: 27 of 27. But 8 keys in `art-alt.json` do not match a filename (`art-p1-brief-hero-v1`, `art-p2-angola-card-v1`, `art-p5-build-diagram-v1`, `art-p6-report-backdrop-v1`, `art-p14-medals-v1`, `art-p16-role-emblems-v1`, `art-p18-rocket-light-v1`, `art-p19-rocket-heavy-v1`): stale/duplicate keys.
- Alt text defect (a11y/AR): `artAlt()` from `art-alt.json` is used only in `Jeddah.tsx`. Elsewhere alts are unrelated UI strings (`t('launch.go')`, `t('flight.map')`, `t('sun.legend')`, `t('map.station')`) or hard-coded English ("Debrief plate", "Empty orbit", "Refly diptych", "Log border", "Backdrop"; `Report.tsx` 166, 357; `Refly.tsx` 208, 229; `MissionLog.tsx` 133), which will read in English on the Arabic UI.
- 10 art files are shipped but never rendered in `web/src`: p1 hero, p13 emblem, p14 medals x3, p15 orbit header, p16 roles x4, p17 autopsy plate = 1,347,392 bytes (1.28 MiB) of dead payload in dist.
- Visual review (all 27 viewed on contact sheets): engraved-style illustrations of Earth, Sun, satellites, rockets, dish antenna, medals, compass, desert/river, flooded street scene. No NASA logo, meatball, worm, flag or insignia seen. No people or children depicted anywhere. No legible text in any image. Rule 3 and rule 4: PASS.

## 4. Secret scan: PASS

Evidence:
- `git check-ignore -v pipeline/.env` -> `.gitignore:3:**/.env	pipeline/.env` (ignored).
- `git log --all --diff-filter=A --name-only -- pipeline/.env '**/.env' '.env'` -> empty. All env paths ever in history: only `pipeline/.env.example` (placeholder `NASA_API_KEY=your-key-here`).
- History: 73 commits scanned with `git log -p --all`. `api_key` / `NASA_API_KEY` hits: 3 commits, all code that reads the variable (`os.environ.get("NASA_API_KEY")`, `params={... "api_key": key}`, a settings allow-rule `Bash(echo $NASA_API_KEY)`) and the prompt text. `DEMO_KEY`: 1 commit (fetch_donki fallback literal, a public demo key, not a secret; also mentioned in `pipeline/build_all.py` docstring). `BEGIN ... PRIVATE KEY`: only the prompt text. `password|secret|token = <12+ chars>`: 0. 40-char key-like string next to key/api/nasa/auth: 0 in history, 0 in working tree. Working-tree 40-char hits are the base64url alphabet (`engine/src/mission-code.ts`) and mission codes (`content/demo/jeddah-demo.json`, `fuzz.test.ts`, `HANDOFF.md`).
- No real key value found. No key printed. Note: `.claude/settings.json` has an allow rule `Bash(echo $NASA_API_KEY)` which would let an agent print the key; consider removing it.
- Untracked build copy `web/dist-t2/` exists in the working tree (another agent's build, contains the word "token" from React internals; not a secret). Make sure it is not committed.

## 5. No runtime external calls: PASS

Evidence:
- `web/src` URLs: 3 matches, all `http://www.w3.org/2000/svg` (SVG namespace, not a request). `fetch(`: 3 uses in `engineAdapter.ts` (lines 144, 149 data via `dataUrl`, 474 `img/gibs/credits.json`), all same-origin relative paths. XMLHttpRequest/WebSocket/@import/googleapis/gstatic/sendBeacon: 0 in src and dist.
- `web/dist` JS/CSS/HTML URLs: w3.org namespaces (SVG, xlink, XML, MathML) and `https://react.dev/errors/` (error message text, 2) - all non-requests. `fetch(` x4 in the bundle: 3 above plus Vite's modulepreload polyfill `fetch(f.href,m)` (same-origin module URLs).
- CSS `url(`: 9, all `../fonts/*.woff2` (relative).
- Playwright proof (`node qa/track3/net.mjs`, local preview http://localhost:4173, 1440x900, walked Brief through to Launch and toggled to Arabic/RTL): 27 requests, 0 non-same-origin, 0 failed. Breakdown: 1 page, 2 assets, 8 img, 8 data, 8 fonts. Fonts loaded: Big Shoulders Display 800, IBM Plex Sans 400/600, IBM Plex Mono 400/500, plus Plex Sans Arabic 400/600/700 requested. Caveat: Flight and Report screens were not reached by the auto-walk; static greps cover them.
- Fonts: `web/public/fonts` has 11 woff2 (Big Shoulders Display latin and latin-ext 800, Plex Sans x2, Plex Sans Arabic x3, Plex Mono x2) and 4 OFL files (`OFL-BigShouldersDisplay.txt`, `OFL-IBMPlexMono.txt`, `OFL-IBMPlexSans.txt`, `OFL-IBMPlexSansArabic.txt`, 93 lines each). Self-hosted: PASS.
- Note: `src/styles/fonts.css` writes `url('/fonts/...')` (absolute); Vite rewrote it to `../fonts/...` in dist, so it works under the `/stormproof/` subpath (verified by the live site loading).

## 6. Public access: PASS

Evidence: `node qa/track3/public.mjs` (fresh context, no cookies).
- https://github.com/IyadAbouelseoud/stormproof: HTTP 200, title "GitHub - IyadAbouelseoud/stormproof · GitHub", no password inputs, no login wall (header shows "Sign in / Sign up" only), code view loaded.
- https://iyadabouelseoud.github.io/stormproof/: HTTP 200, title "STORMPROOF", no login wall, renders the app (h1 "STORMPROOF", h2 "Brief", "Watch the Cunene", pitch text "The Sun you launch into decides ...").
- Asset hash: live serves `assets/index-CxV8PjUA.js` and `assets/index--ERs8yKu.css`; local `web/dist` has the same two files: identical.
- `gh api repos/IyadAbouelseoud/stormproof/pages` -> `build_type: "workflow"`, `status: "built"`, source branch main, html_url as above. (Carryover 8: done, nothing to change.)
- `gh run list --limit 5` (all workflow `test-and-deploy`, branch main): 1) success "fix: dial gauge clipping, FACSAT-2 wording, Track 7..." 49s 15:27Z; 2) success "feat(game-redesign): ... G3" 44s; 3) success "feat(game-feel): ... G2" 43s; 4) success "prompts: art budget 6 MB after P13-P23" 47s; 5) cancelled "art: P13-P23 ..." 8s (superseded by the next push). Latest run head sha `0c14577` = local HEAD = `git ls-remote origin main`.

## 7. README: FAIL (3 carryover-6 items missing)

Present: NASA data list (OMNIWeb, solar-cycle prediction, DONKI, GIBS, LSP/JPL line; IMERG only in the Jeddah section), "AI use" section (research, brainstorming, coding, content/art; text drafted with ChatGPT/Claude; images carry SI tag), "Licences" (NRLMSIS non-commercial, only pre-computed tables shipped; NRL not NASA; no NASA logos; "Fonts are OFL and self-hosted").

Carryover 6 items vs README "Disclosed limits" and Jeddah limits:
| Item | In README? |
|---|---|
| Golden 2 has 3 known fails | Yes (line 75, "fails at 3 points") |
| Storm under-response, Feb 2022 x1.875 only | Yes (line 74) |
| Jeddah radar design study, RainCube anchor | Yes (Jeddah limit 3) |
| SpaceX figure is an estimate | Yes (Jeddah limit 7) |
| Map has no coastline | MISSING |
| IMERG layer is IMERG_Precipitation_Rate_30min (IMERG_Rain_Rate does not exist in GIBS) | MISSING (credits.json confirms 6 frames use `IMERG_Precipitation_Rate_30min`) |
| Jeddah dry HLS image is a 2024 baseline, not the flood | MISSING in README (only in-app string `jeddah.before_credit`) |

Suggested one-liners:
- "The 2D map has no coastline: there is no offline coastline source, so only the ground track and station are drawn."
- "The IMERG frames use the GIBS layer IMERG_Precipitation_Rate_30min, because a layer called IMERG_Rain_Rate does not exist in GIBS."
- "The dry Jeddah image is an HLS 30 m baseline from 2024, not the flood; the flood-day image is MODIS Terra, 24 Nov 2022."

Other README gaps:
- OFL: only "Fonts are OFL and self-hosted"; does not name the four families, nor point to `web/public/fonts/OFL-*.txt`.
- NASA data-use statement: credits line exists; no explicit "data is used under NASA's open data policy" wording, and IMERG/GPM is missing from the "NASA data used" list (only in the Jeddah section).
- "AI use": covers research, brainstorming, code, text and art; says Gemini "helped with content and art" but does not state in one line that all images in `web/public/img/art` are AI-generated (it does say tagged); acceptable, small improvement possible.
- README says "18 of 21" for golden 2 and "ratio 1.44"; these are not verified here (Track 1 owns golden numbers).

## 8. Performance: PASS

Evidence: Lighthouse 13.6.0 via `npx --yes lighthouse` (one-off, not added to package.json), desktop preset, `http://localhost:4173/` (vite preview of `web/dist`), raw output `qa/track3/lh.json`.
- Scores: Performance 100, Accessibility 96, Best Practices 100, SEO 83. (Targets perf >= 85, a11y >= 95: met.)
- Metrics: FCP 0.2 s, LCP 0.2 s, TBT 10 ms, CLS 0.006, Speed Index 0.6 s.
- Top 3 opportunities/diagnostics (no formal "opportunity" with savings was flagged): (1) `image-delivery-insight` est. 858 KiB saving (art-p7 Jeddah and art-p2 Angola banners/cards are large); (2) `unused-javascript` est. 55 KiB; (3) `unsized-images`: banner `<img>` tags lack width/height (cause of the CLS 0.006). Also `total-byte-weight` 3,891 KiB, driven by `density_*_truth.bin` (1.19 MB each) and `art-p7`.
- Accessibility failures (a11y 96): `color-contrast` on `.cml-step-label` spans (CML rail labels); `label-content-name-mismatch` on `.lang-toggle-btn` (`aria-label="Language"` vs visible text). Both worth fixing since the release checklist wants zero serious/critical axe issues.
- SEO 83: `meta-description` missing, `robots-txt` missing (not part of the target).
- Best-practices: `valid-source-maps` only.
- Payload (`web/dist`, 72 files, 10,904,780 bytes = 10.4 MiB total):
  - JS `index-CxV8PjUA.js` 681,130 B raw / 168,917 B gzip.
  - CSS `index--ERs8yKu.css` 74,913 B raw / 12,372 B gzip.
  - Data `web/dist/data` 2,721,303 B (density bins 2 x 1,188,000 + 2 x 85,008; sun_daily 129,083; storms 25,811; plan 13,247; forecast 4,977; meta 2,169).
  - Images: `dist/img` 6,925,376 B = art 5,182,807 + gibs 1,742,569.
  - Fonts 501,413 B (11 woff2 + 4 OFL txt).

## Findings ranked by severity
1. README is missing three carryover-6 limits (coastline, IMERG layer name, dry HLS baseline). Release-checklist gap.
2. No `SimResult.sources` exists; the trace drawer covers only Report headline numbers, not gauges, rockets, orbit or part stats. engine `SOURCES` is not keyed by csv ids, and 33 csv rows use non-standard tag values.
3. Art alt text: only Jeddah uses `art-alt.json`; the others use unrelated or hard-coded English alts (breaks AR); 8 stale keys in `art-alt.json`.
4. Axe-class issues from Lighthouse: contrast on CML step labels; language-toggle label mismatch.
5. 10 unused art files (1.28 MiB) shipped in dist; "NASA solar-cycle prediction" is not named on screen (footer says "Solar forecast: NASA"); no on-screen credit for LSP/JPL/Goddard.
6. Rockets[0] `src` is free text with no csv id (use `electron-capacity`); `.claude/settings.json` allows `echo $NASA_API_KEY`.
