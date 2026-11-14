# Prompt B (Gemini 3.8 Flash version): Renad's lane (UI)

**Tool:** Antigravity, model **Gemini 3.8 Flash**, thinking/effort on **High**. (Hydrogen 4 not available.)
**Fallback:** Claude Code with Opus 5.5, only if a step fails twice. Tell Iyad first (shared Claude pool).

How to use this file (important, Flash does best with small steps):
1. Start only after Iyad says "contracts pushed". Then: `git pull`, `git checkout -b lane/renad`, open the folder in Antigravity.
2. Open a NEW chat in Antigravity. Paste the PREAMBLE once.
3. Then paste ONE step at a time. Wait for it to finish, check it in the browser yourself (390 px and 1440 px, EN and AR), then paste the next. Never paste two steps together.
4. If the chat gets long or the model starts forgetting rules, open a new chat and paste the PREAMBLE again plus the next step.
5. Commit after every step (`git add -A && git commit -m "U3: ..." && git push`).

---

## PREAMBLE (paste once per chat)

You are building the web UI for "Stormproof", a satellite-design game, in the folder `web/` of this repo. I am Renad. Work in small steps. I will give you ONE step at a time. Do only that step.

Before doing anything, read these files fully: `AGENTS.md`, `design/README.md`, `engine/src/contracts` (the types; read only), `engine/test/fixtures/mock-result.json`, `HANDOFF.md`. If a file is missing, say so and stop.

RULES (follow every one, every step):
1. Write only inside `web/` and `design/`. Never edit anything in `engine/`, `pipeline/`, `content/` or `web/public/data/`. Never edit the contracts.
2. Stack: Vite, React 19, TypeScript strict, Zustand, plain CSS. Add NO other dependency. If you think you need one, stop and ask me.
3. Colours, sizes, fonts, spacing, radius and durations come ONLY from CSS variables made from `design/tokens.json`. Never type a hex colour or a pixel size in a component. If a token is missing, stop and tell me.
4. The look: warm paper and ink, brass and lapis. NO starfields, neon, glows, gradients, glass, emoji, bubbly rounded cards, 3D globes. Draw everything with SVG or Canvas.
5. Use CSS logical properties only (margin-inline-start, padding-block, inset-inline-end, text-align: start). The app must work left-to-right (English) and right-to-left (Arabic).
6. The orange colour `sol` is only for the Sun and its effects. Never use it for buttons.
7. All data comes through ONE file, `web/src/engineAdapter.ts`, which returns `mock-result.json` for now. Components never import the fixture directly.
8. All visible text goes through `t("key")`. Add keys to the en and ar JSON. Do not hard-code strings in components.
9. If you need a field the contract does not have, do NOT change the contract. Add a line under "Contract requests" in `HANDOFF.md` and stub it in the adapter.
10. Do not invent numbers. Every number shown comes from the result object. Show units in the mono font.
11. Do not run destructive commands (rm -rf, git push --force, git reset --hard). Ask first.
12. When a step is done, reply in exactly this format, then stop and wait:
   `DONE <step id>: <one line of what changed> | files: <list> | how I checked: <what you ran or looked at>`
   Then add one line to `HANDOFF.md`. If anything is unfinished or you were unsure, say it plainly under `NOT DONE:`. Never claim you checked something you did not run.

Reply "READY" now and nothing else.

---

## STEP U1a: project and tokens
Create the Vite + React 19 + TypeScript (strict) + Zustand app inside `web/` (pnpm). Then:
1. Write `design/tokens.json` with EXACT values from the tables in `design/README.md`: colours for `paper` and `night`, the 9 type styles, spacing, radius, durations. Name the durations `dur-fast` 120, `dur-base` 240, `dur-launch` 600.
2. Write a small node script `web/scripts/make-tokens.mjs` that reads `design/tokens.json` and writes `web/src/styles/tokens.css` with `:root, [data-theme="paper"] { ... }` and `[data-theme="night"] { ... }`, plus `--font-*`, `--space-*`, `--radius-*`, `--dur-*`. Add `"tokens": "node scripts/make-tokens.mjs"` to package.json and run it.
3. Show a test page that prints every colour as a swatch with its token name and light/dark theme toggle. Check that the page runs with `pnpm dev`.

## STEP U1b: fonts
Self-host five font families as woff2 in `web/public/fonts/` with their OFL licence text files: Big Shoulders Display (800), Reem Kufi, IBM Plex Sans, IBM Plex Sans Arabic, IBM Plex Mono. Download them with the package manager or from the official font repositories on GitHub, not from a runtime Google Fonts link. Write `@font-face` rules in `web/src/styles/fonts.css` with `font-display: swap`. Wire `--font-display`, `--font-display-ar`, `--font-text`, `--font-text-ar`, `--font-mono` and the 9 type styles as CSS classes using tokens. Confirm in the browser network tab that no request goes to an outside host. If a font cannot be downloaded, stop and tell me which one.

## STEP U1c: i18n and language toggle
Create `web/src/i18n/` with `t(key)`, `en.json` and `ar.json` (start with the keys for the app title, the 7 screen names, Next, Back, Language). Missing keys fall back to the key text. Add a language toggle button that sets `document.documentElement.lang` and `dir` ("ltr" or "rtl") and remembers the choice in memory only (no localStorage). Use the Arabic fonts when lang is ar.

## STEP U1d: shell, routing and CML rail
Build the app shell: a header with the title (display-l, upper case), the language toggle and a theme attribute on the root. Add simple routing with Zustand state (no router library) for 7 screens: Brief, Build, Orbit, Launch, Flight, Report, Refly. Each screen is an empty placeholder that shows its name and a segment tag (launch, space, ground or user). Add the CML progress rail: four labelled steps (Cocktail Napkin, Initial Feasibility, Trade Space, Point Design) with brass ticks, showing the current step; put the labels in the i18n files. Back and Next buttons move between screens. Buttons use lapis, never sol.

## STEP U1e: component styles
Write `web/src/styles/components.css` and small React components for: Button, Gauge, PartCard, RoleChip, VerdictStamp, MissionTicket, SunStripe (static placeholder), CauseChain, and the SI tag (class `sp-si-tag`, text "SI-generated"). Follow the descriptions in `design/README.md`. Tokens only. Add a "component gallery" page at the route `/gallery` (hash route `#gallery`) that shows each component in paper and night, with sample values. Check text contrast visually in both themes.

## STEP U2: Brief screen
Brief screen: read the scenario from the adapter (use the field the mock result or `content/scenarios/angola.json` provides through the adapter; if missing, add a Contract request). Show the title, the story paragraph, the 3 numeric requirements as data-l numbers with units, the segment tag "user", and an empty hero-image slot with the SI tag in the corner (a plain paper-sunken rectangle labelled "art goes here" is fine). Next goes to Build.

## STEP U3a: Build screen, parts
Build screen part 1: a grid of PartCards for the categories camera, panels, battery, radio, computer, pointing, fuel, taken from the adapter. One part selected per category. Add a frame choice 1U / 3U / 6U as three Buttons. Keep selection in a Zustand store.

## STEP U3b: Build screen, gauges and trail
Build screen part 2: six Gauges always visible at the top (mass, power, budget, data, comms, time), driven by the current design through the adapter. When a selection changes, animate the changed gauges one by one with `--dur-base` delay between them (skip animation if prefers-reduced-motion). Under the gauges, show one trail line of the knock-on effects, built only from numbers in the result, for example "camera -> +12 W -> panel -> +3 kg". If the data for the trail is not in the result, add a Contract request and show a placeholder.

## STEP U4a: Orbit and rocket screen
Orbit screen: an altitude slider from 200 to 800 km with a two-sided warning band: below the safe zone is drag (colour sol-ink), above is the 5-year disposal rule (colour lapis). Do not decide the thresholds yourself: read them from the result or adapter; if they are missing, add a Contract request and use clearly labelled placeholders. Add SSO vs ISS-deploy as two Buttons, a rocket list, and the fit-check verdict with its reasons list (VerdictStamp ok/warn/fail).

## STEP U4b: Launch-date screen
Launch screen: build the SunStripe as the date control for 2015 to 2026: a horizontal band of cells coloured by solar activity from the data in the adapter, with a keyboard-accessible handle (left/right arrows move by one month, Page Up/Down by one year), a cursor label showing the date and value, and hatched cells for forecast days. Below it, a short plan-vs-truth note from the result. Pressing Launch moves to Flight.

## STEP U5a: Flight screen, theme turn
Flight screen shell: when Launch is pressed, switch the root theme from paper to night with a `--dur-launch` transition (instant if prefers-reduced-motion). Layout: map area, altitude chart area, battery strip, data bucket, play/pause and speed buttons. All empty boxes with labels for now. Flight uses night theme only.

## STEP U5b: Flight screen, altitude chart and time-lapse
Fill the altitude chart (SVG): the truth line solid in ink, the plan line dashed in lapis, the gap between them filled with sol-tint, a horizontal line at 120 km. A play button advances a day cursor through the timeline from the result at the chosen speed (1x, 10x, 100x). Use requestAnimationFrame. Pause on end.

## STEP U5c: Flight screen, map, battery, data, storm card, reentry
Add the 2D equirectangular map as SVG with the ground track from the result (no 3D, no globe), the battery-minimum strip, and the data bucket. Add a storm alert card that pauses play and opens a vote prompt when the timeline hits a storm day. Add the reentry moment: when the altitude line meets 120 km, draw a short burn trace and show the exact day count in data-l. Respect prefers-reduced-motion. Then go to Report.

## STEP U6: Report screen
Report screen: a VerdictStamp per requirement, the CauseChain, a big figure "the Sun took N days" (N from the result), the closest real mission card, a MissionTicket with a copy button, and a sources drawer that lists every number shown with its tag (sourced, computed or game-balanced). For the satellite picture: add a slot for an image from `web/public/img/gibs/` blurred to the player's ground resolution using a canvas blur, with a caption stating the blur and a NASA GIBS credit; if no image exists yet, show a labelled placeholder.

## STEP U7a: Re-fly
Re-fly screen: same seed, two runs side by side with two altitude lines on one chart and a verdict row for each. A "change one thing" Button goes back to Build keeping the first result as the baseline.

## STEP U7b: Team mode
Team mode: 4 RoleChips (systems lead, science, power and spacecraft, orbit and comms); hot-seat turns where each role owns the decisions of its screens; a hand-over screen between turns that hides the previous player's choices; the storm vote collects 4 votes and the majority sets the storm policy in the store (pass it to the adapter). Solo mode stays the default.

## STEP U8: polish
Focus rings on every control, logical tab order, aria-labels, 44 px touch targets, Arabic typography check, page loads in under 2 seconds on the dev build, zero console errors, keyboard-only walk through all 7 screens. List every problem you found and fix it. Report anything you could not fix under `NOT DONE:`.
