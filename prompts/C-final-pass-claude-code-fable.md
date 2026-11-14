# Prompt C: Final release pass (Claude Code, Fable 5.2, the only Fable session)

**When:** Saturday about 21:00, after the playtest, on `main` with all lanes merged and Dua's art in `web/public/img/art/`. It must finish before Sun 13:00; Fable is included on Pro only until 16 Nov 23:59 PT.
**How:** quit every other Claude session first. Start fresh (`claude`, then `/clear`), set `/model` to Fable 5.2 and paste everything below the line. Fable wrote none of this code, so it reviews as an outsider.

---

<context>
You are the release engineer, QA lead and independent reviewer for Stormproof, our NASA Space Apps 2026 entry ("Space Mission Design Game"). Other agents built it today: Opus 5.5 built the engine and data, and Hydrogen 4 in Antigravity built the UI. Treat their claims as unverified until a tool result proves them.
Read first: AGENTS.md (binding), HANDOFF.md, ISSUES.md (mentor and playtest findings), design/README.md, prompts/G-game-feel.md, prompts/G2-game-feel-round2.md, README.md, then `git log --oneline -60`.
Judging: Impact, Creativity, Validity (including usability), Relevance (NASA data must be core), Presentation. Local submission Sun 14:30 Riyadh; code freeze Sun 13:00. The pitch demo is one scripted mission that fails, then succeeds after a re-design.
Goal: the strongest honest v1.0 we can ship from what exists, with fixes and polish only, and evidence for every claim we will make to judges.
</context>

<carryover>
Open items from HANDOFF.md and ISSUES.md that the earlier agents left to this pass. Verify each from the code, then fix, disclose in README "Limits", or mark unverified. Do not trust any "done" in HANDOFF without a command output.
0. Start state: main must contain feature/jeddah (Jeddah flood scenario, SimResult.groundTrack, content/text wiring) and Renad's game-feel work (prompt G). If either is not on main, say so and stop; Iyad merges (Jeddah first, then Renad rebased). Expect engine 103 + 3 expected fail + 6 skipped, pipeline 26/26, web tests green.
1. HIGHEST RISK, do first in Track 2: renderer crash during Flight playback in headless Chrome (HANDOFF "Blocked": 5 of 9 smoke runs, 3 of 3 with animation at 1440 EN on feature/jeddah, not reproduced in 24 isolated runs, cause unknown). The FAIL demo runs through Flight, so a crash is fatal. Reproduce with Playwright (headless and headed, 1440 and 390), watch the console and memory, bisect the per-frame work (rAF loop, chart redraws, the new G2 motion). Required result: 20 consecutive full Brief-to-Re-fly walks with zero crashes, in the production build, with animation on. If the cause stays unknown, ship the safe fallback (lower per-frame work, no per-frame React state, CSS-only motion) and say so in README Limits and DEMO.md.
2. Axe was never run (@axe-core/playwright not installed; pre-approved here). Install it and run Track 2's axe sweep on all 8 screens, including the Jeddah screens and the new Flight/Report motion states.
3. Flight map must draw SimResult.groundTrack (fallback to the adapter's own track only when absent); art P3, P5, P6 placed (G6b). Any still missing: do it, it is small.
4. content/text/messages.json advice lines exist but are not shown (messageTemplate() unused; engine message keys were kept on purpose so Angola hashes stay identical). Do NOT change engine keys. If the cause chain can show "cause + one fix" through content.ts in about 30 lines, do it; else disclose.
5. Arabic completeness: engine messages whose params are missing fall back to English in Arabic mode; part, rocket and scenario names must now come from content/text (ar). Walk every screen in AR and list any English that remains; fix the cheap ones.
6. Disclose in README Limits: map has no coastline (cut, no offline source); golden 2 has 3 known fails (README line "33 of 36" only after you re-run it); empirical atmosphere models under-respond to storms (Feb 2022 x1.875 only); Jeddah radar is a design study (RainCube anchor); SpaceX figure is an estimate, not a quote; IMERG layer used is IMERG_Precipitation_Rate_30min (IMERG_Rain_Rate does not exist in GIBS); the Jeddah dry HLS image is a 2024 baseline, not the flood.
7. Both builds must work: VITE_JEDDAH=1 (default for release if the Jeddah smoke passes) and VITE_JEDDAH=0 (Angola only, no Jeddah entry point). The Angola SimResult hashes in engine/test/angola-regression.test.ts must still pass.
8. Pages: confirm Settings > Pages Source is "GitHub Actions" (gh api repos/IyadAbouelseoud/stormproof/pages shows build_type workflow). If it is still "legacy", tell Iyad the exact command; do not run it.
9. Demo: DEMO.md covers the Angola FAIL and FIX codes (Track 4) and, as an optional 60-second add-on, the three Jeddah codes in content/demo/jeddah-demo.json (optical-fails, radar-over-budget, lean-radar-recovery). Re-run them after Track 5; numbers and codes must match.
10. ISSUES.md: record the Saturday 20:00 playtest findings if Iyad pasted them; otherwise write "playtest result: not provided".
</carryover>

<task>
Run these six tracks (after the <carryover> start-state check; carryover item 1, the Flight crash, goes first). Order: 1, 6, 2, 3, 4, 5. Correctness and function come before polish; Track 5 is cut first if the limit protocol triggers. Tracks 1-3 are independent: give each to its own subagent (model: sonnet for tracks 2 and 3; keep track 1's judgement calls in this session). Merge the findings, then fix in priority order: correctness > rule compliance > broken UX > polish.

TRACK 1: Physics and validity (independent recomputation)
- Write `qa/independent_check.py`, a separate Python implementation (not importing engine/) of period, SSO inclination, eclipse fraction, decay with the shipped density tables, and the launch-fit check. Run it and the engine on 5 designs (FACSAT-2 golden; 6U at 430 and 550 km launched 2021; a 210 km Starlink-trap case; one oversized design that must fail the fit check). Report the deltas; anything over 5% (or over 10% for lifetime) is a bug to fix or a limit to disclose.
- Check the invariants: battery in 0..100%; data bucket never negative; altitude never rising without propulsion; plan and truth identical when the Sun data is identical; same design + seed gives byte-identical SimResult (hash it 3 times); mission codes round-trip for 100 random designs.
- Golden tests 1-3 pass, or are disclosed in README "Limits" with the measured numbers. Never loosen a tolerance or edit a fixture to make a test pass.
- The F10.7 conversion (adjusted to observed), the forecast join at 29 Oct 2026, and the Feb 2022 correction are each implemented exactly as AGENTS.md section 5 says.

TRACK 2: UX, accessibility, design-system conformance
- With Playwright (add `@axe-core/playwright` as a devDependency for this pass; it is pre-approved here), walk Brief -> Re-fly at 390x844 and 1440x900, in EN and AR, in Paper and Night. Record console errors, axe violations (serious and critical must be zero), and a screenshot of each screen into `qa/screens/`.
- Design conformance: grep `web/src` for hex colours, px font sizes or font names outside `styles/tokens.css`; any use of `--sol` on buttons, links or decoration; any gradient, glow or emoji (the shared `ui/Starfield` backdrop is allowed; check that no other star or particle effect exists). Check text contrast on every screen; check focus is visible; check that prefers-reduced-motion turns motion into cross-fades; check RTL mirrors layouts, chains and arrows while numbers stay readable.
- Comprehension: the first screen must say what the game is in one line, and the Sun Stripe must be visible without scrolling at 1440x900.

TRACK 3: Release hygiene
- Every number shown on screen traces to `SimResult.sources` with a tag, and to `content/sources.csv`. NASA data is credited on screen where used (OMNIWeb, DONKI, GIBS, NASA solar-cycle prediction). Every AI image carries a visible "SI-generated" tag; no NASA logos in SI content.
- Secret scan (patterns: api_key, NASA_API_KEY values, token, password, BEGIN PRIVATE KEY) across the working tree AND git history (`git log -p`). `pipeline/.env` is git-ignored and absent from history. If a key ever reached history, STOP and tell Iyad to revoke it at api.nasa.gov; do not rewrite history yourself.
- No runtime calls to external hosts (grep web/src and the built dist for http(s) URLs; only credits and links are allowed). Fonts are self-hosted.
- Open the repo and the live URL in a private browser window (Playwright with a fresh context) to prove both are public and need no login.
- Licences: the NRLMSIS non-commercial note, OFL font licences, and the NASA data use statements are in the README. "SI use" states honestly where AI was used: research, brainstorming, code, images.
- Performance: run Lighthouse (desktop) against `pnpm --filter web preview`; target performance >= 85, accessibility >= 95. Report bundle size and data payload size.

TRACK 4 (after tracks 1-3, in this session): Judge walkthrough and demo script
- Play the game as a sceptical judge for 10 minutes using the browser. List the 5 biggest moments of confusion and fix the ones that need at most about 30 changed lines.
- Find and record two mission codes for the pitch: FAIL (a low-orbit design launched into the active Sun that dies early and misses the 3-year requirement, with a clear cause chain) and FIX (the re-design that meets the requirements without breaking the FCC 5-year rule). Write `DEMO.md`: the click-by-click script with both codes, what each screen shows, and the exact numbers that will appear, so the pitch never depends on luck.
- Write `qa/JUDGE_ANSWERS.md` with honest, evidence-backed answers to the four questions the Saudi guide says judges ask: which NASA data, and what breaks without it; what is real and what is a mock-up; who would use it and how it differs from what exists; the hardest problems, and what's next.
- Polish budget: up to 10 small quality fixes (copy clarity, spacing, motion timing, empty states, loading states), each under about 30 changed lines, no new features.

TRACK 6 (functional and data integrity; Iyad's bar is "all data and all functionality sound and perfect"; use a sonnet subagent for the matrix, keep judgement in this session)
Functional matrix, Playwright, production build, EN and AR, 390 and 1440, mouse and keyboard-only:
- Every button, slider, toggle, chip, hotspot, link and form field on all 8 screens (including the Jeddah screens and the Build exploded view): record screen, control, action, expected, actual in qa/FUNCTIONAL.md. A control that does nothing, throws, or leaves stale state is a bug.
- Flows: solo and team (names, roles, storm vote both policies); Back/Next and every direct jump; browser reload and hash routing keep or cleanly reset state; language and theme switch mid-flow keep the design; Re-fly baseline and deltas; scenario switch (Angola to Jeddah and back) resets nothing it should not and leaves no Jeddah state in Angola.
- Mission code: copy, paste, decode and re-simulate for 100 random designs (result hash identical); empty, truncated, wrong-prefix and tampered codes show an inline error and never crash or change the design.
- Edge designs: 1U with oversized parts, 6U maximum parts, 150 km, 800 km, launch dates at both ends of the timeline (2015-01 and 2026-10), a rocket that cannot reach the orbit, zero fuel, every camera including radar. Each must give a clear verdict or fit-check message, no NaN, no negative bucket, no blank panel.
- Fuzz: 500 random valid designs through simulate(): no exception, no NaN or Infinity anywhere in SimResult, gauges consistent with the timeline, outcome consistent with lifetime days, score between 0 and 100, causes ordered and non-empty when the mission died.
Data audit:
- Every file in web/public/data and content/*.json parses; densities finite and monotone in altitude for sampled days; density_meta matches the .bin sizes; the Sun Stripe months equal sun_daily monthly means for 5 spot-checked months (compute them yourself from the file).
- Every id in content/text, content/parts.json, rockets.json, scenarios/*.json, art-alt.json and every `src` resolves in content/sources.csv or is "game-balanced"; no orphan or duplicate ids; every image file referenced exists and every shipped image has a sources row and en/ar alt text.
- Every number on screen in the demo path (both Angola codes, the three Jeddah codes) is traced to SimResult or a source; units, rounding and thousands separators consistent in EN and AR; dates formatted per language; no "undefined", "NaN", "[object" or untranslated key text anywhere (grep the rendered DOM text of every screen).
- Offline: with the network blocked after first load (Playwright route abort for all non-local hosts), the whole demo still works and no request leaves the origin.
Output: qa/FUNCTIONAL.md with the matrix, the fuzz and audit results, the bugs found, fixed or disclosed. Fix bugs in priority order; each fix gets a regression test where the engine or adapter is involved.

TRACK 5 (game feel, after track 4; budget about 20% of the window, cut first if the limit protocol triggers)
Problem: the live site reads as a report, not a game. The specs are prompts/G-game-feel.md (G1-G9) and prompts/G2-game-feel-round2.md (X1-X8: mission-control header, briefing-style Brief, dial gauges, medals, orbit mini-diagram; the Build exploded-view hotspots already shipped on main); Renad or a worker may already have done some of it. Extra illustrations from prompts/D2 and D3 (P8-P17) are wired where G/G2 say; missing files are skipped, never replaced by stand-ins. Sound defaults to OFF (never plays before a user tap); fix it if it is on.
- Audit first: for each of G1-G9 and X1-X8 mark done / partly / missing from the code and the live URL (screenshots in qa/screens/). Do not redo what exists.
- Implement the missing items in this priority: G1 launch ceremony, G2 flight motion, G3 verdict stamp and count-up, G9 first screen, G6 art wiring, G4 build feedback, G5 transitions, G7 empty states, G8 optional sound (last; drop it first).
- Hard rules from G apply: no gradients, glows, emoji, confetti (only the shared `ui/Starfield` backdrop; G3 rules apply); sol only for the Sun; durations from tokens; transform/opacity only; reduced motion honoured; RTL mirrored; animation only reveals real SimResult values; no new dependency; engine, contracts, numbers untouched.
- Conformance gate before commit: Playwright walk with reduced motion on and off; axe serious/critical still zero; Lighthouse performance still >= 85; bundle +60 kB gzip max; art folder < 4 MB, lazy-loaded; every AI image shows the SI tag and has en and ar alt text in content/text/art-alt.json.
- Missing art (P8-P12 not delivered) is not a blocker: skip those placements, do not draw stand-ins.
- Re-record the two demo missions (FAIL and FIX) after Track 5 and confirm DEMO.md numbers and codes are unchanged; update DEMO.md with the new timings (launch countdown, reentry hold) so the 3-minute demo still fits.

Then: tick AGENTS.md section 8 item by item with evidence, update README (run steps, physics model, Limits, SI use, References), commit, tag `v1.0-rc`, push, confirm that the GitHub Pages deploy finished, and load the live URL once more.
</task>

<constraints>
- Fixes and polish only. No new features, screens, scenarios or refactors. Smallest change that solves each issue. The only exception is Track 5 (game feel: motion, feedback, illustration wiring, optional sound) within the limits stated there.
- Stop and ask Iyad before: deleting files, changing engine/src/contracts.ts, changing physics constants, tolerances or fixtures, adding any dependency other than @axe-core/playwright (Track 5 adds none), rewriting git history, or force-pushing.
- At most 3 subagents at once. Each returns <= 10 lines: findings ranked by severity, files touched, evidence.
- Ground every progress claim in actual tool output (commands, counts, screenshots, URLs). If something cannot be verified, write "unverified" and why.
- Limit protocol (AGENTS.md section 6): checkpoint after each track and each batch of fixes (tests green, commit, HANDOFF line). At about 85% of the usage window, finish the current fix, commit `checkpoint: final-pass <step>`, write HANDOFF with the remaining list and a resume prompt, and stop. The tag needs tracks 1 and 3 clean first; Track 5 never blocks the tag.
</constraints>

<output_format>
After each track (1 to 6): `TRACK <n>: <issues found> found, <fixed> fixed, <disclosed> disclosed | evidence: <files/commands> | commit <sha>`.
Final release report (at most 30 lines; include G1-G9 and X1-X8 status, the qa/FUNCTIONAL.md result and Lighthouse before/after): the section 8 checklist (each item ✅ or ❌ with evidence); golden-test numbers; Lighthouse scores; disclosed limits; unfixed items ranked; the two demo mission codes; the live URL; the tag.
</output_format>

---

> This prompt is for an agentic tool with real system access. Review the scope locks, forbidden actions and stop conditions before pasting. Confirm the paths and permissions match the actual repo.


## Addendum (2026-11-14): prompt G3
Run after Track 5 starts (art P18-P23 from D4 may be wired by G3 or left out): verify prompt `G3-space-and-screens.md` is fully done (S0 backdrop contrast and perf, S1 Orbit, S2 Launch spacing, S3 Flight instruments and mission log, S4 Report debrief, S5 Re-fly, S6 consistency). Fill any gap. Conformance: contrast over the starfield on every screen, CPU idle under 3 %, no dead space at 390/768/1440 in EN and AR, 20 clean walkthroughs.
