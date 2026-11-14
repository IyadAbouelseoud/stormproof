# Prompt C: Final release pass (Claude Code, Fable 5.2, the only Fable session)

**When:** Saturday about 21:00, after the playtest, on `main` with all lanes merged and Dua's art in `web/public/img/art/`. It must finish before Sun 13:00; Fable is included on Pro only until 16 Nov 23:59 PT.
**How:** quit every other Claude session first. Start fresh (`claude`, then `/clear`), set `/model` to Fable 5.2 and paste everything below the line. Fable wrote none of this code, so it reviews as an outsider.

---

<context>
You are the release engineer, QA lead and independent reviewer for Stormproof, our NASA Space Apps 2026 entry ("Space Mission Design Game"). Other agents built it today: Opus 5.5 built the engine and data, and Hydrogen 4 in Antigravity built the UI. Treat their claims as unverified until a tool result proves them.
Read first: AGENTS.md (binding), HANDOFF.md, ISSUES.md (mentor and playtest findings), design/README.md, prompts/G-game-feel.md, README.md, then `git log --oneline -60`.
Judging: Impact, Creativity, Validity (including usability), Relevance (NASA data must be core), Presentation. Local submission Sun 14:30 Riyadh; code freeze Sun 13:00. The pitch demo is one scripted mission that fails, then succeeds after a re-design.
Goal: the strongest honest v1.0 we can ship from what exists, with fixes and polish only, and evidence for every claim we will make to judges.
</context>

<task>
Run these five tracks. Tracks 1-3 are independent: give each to its own subagent (model: sonnet for tracks 2 and 3; keep track 1's judgement calls in this session). Merge the findings, then fix in priority order: correctness > rule compliance > broken UX > polish.

TRACK 1: Physics and validity (independent recomputation)
- Write `qa/independent_check.py`, a separate Python implementation (not importing engine/) of period, SSO inclination, eclipse fraction, decay with the shipped density tables, and the launch-fit check. Run it and the engine on 5 designs (FACSAT-2 golden; 6U at 430 and 550 km launched 2021; a 210 km Starlink-trap case; one oversized design that must fail the fit check). Report the deltas; anything over 5% (or over 10% for lifetime) is a bug to fix or a limit to disclose.
- Check the invariants: battery in 0..100%; data bucket never negative; altitude never rising without propulsion; plan and truth identical when the Sun data is identical; same design + seed gives byte-identical SimResult (hash it 3 times); mission codes round-trip for 100 random designs.
- Golden tests 1-3 pass, or are disclosed in README "Limits" with the measured numbers. Never loosen a tolerance or edit a fixture to make a test pass.
- The F10.7 conversion (adjusted to observed), the forecast join at 29 Oct 2026, and the Feb 2022 correction are each implemented exactly as AGENTS.md section 5 says.

TRACK 2: UX, accessibility, design-system conformance
- With Playwright (add `@axe-core/playwright` as a devDependency for this pass; it is pre-approved here), walk Brief -> Re-fly at 390x844 and 1440x900, in EN and AR, in Paper and Night. Record console errors, axe violations (serious and critical must be zero), and a screenshot of each screen into `qa/screens/`.
- Design conformance: grep `web/src` for hex colours, px font sizes or font names outside `styles/tokens.css`; any use of `--sol` on buttons, links or decoration; any gradient, glow, emoji or starfield. Check text contrast on every screen; check focus is visible; check that prefers-reduced-motion turns motion into cross-fades; check RTL mirrors layouts, chains and arrows while numbers stay readable.
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

TRACK 5 (game feel, after track 4; budget about 20% of the window, cut first if the limit protocol triggers)
Problem: the live site reads as a report, not a game. The spec is prompts/G-game-feel.md (tasks G1-G9); Renad or a worker may already have done some of it.
- Audit first: for each of G1-G9 mark done / partly / missing from the code and the live URL (screenshots in qa/screens/). Do not redo what exists.
- Implement the missing items in this priority: G1 launch ceremony, G2 flight motion, G3 verdict stamp and count-up, G9 first screen, G6 art wiring, G4 build feedback, G5 transitions, G7 empty states, G8 optional sound (last; drop it first).
- Hard rules from G apply: no gradients, glows, emoji, starfield, confetti; sol only for the Sun; durations from tokens; transform/opacity only; reduced motion honoured; RTL mirrored; animation only reveals real SimResult values; no new dependency; engine, contracts, numbers untouched.
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
After each track (1 to 5): `TRACK <n>: <issues found> found, <fixed> fixed, <disclosed> disclosed | evidence: <files/commands> | commit <sha>`.
Final release report (at most 30 lines; include G1-G9 status and Lighthouse before/after): the section 8 checklist (each item ✅ or ❌ with evidence); golden-test numbers; Lighthouse scores; disclosed limits; unfixed items ranked; the two demo mission codes; the live URL; the tag.
</output_format>

---

> This prompt is for an agentic tool with real system access. Review the scope locks, forbidden actions and stop conditions before pasting. Confirm the paths and permissions match the actual repo.
