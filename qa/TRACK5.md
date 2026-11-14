# Track 5: game-feel audit (final pass, 14 Nov 2026)

Audit only: nothing in G, G2 or G3 was rebuilt. "Seen" means I looked at it in a screenshot from the production build (`qa/screens/judge-*`, `demo-*`, `view-*`, `build-*`) or the demo gate exercised it. "Code only" means the code is there and tests pass, but I did not look at it on screen.

## Prompt G (G1-G9)
| Item | Status | Evidence |
|---|---|---|
| G1 launch ceremony (3-2-1, rocket, skip) | done | demo gate: checklist ticks, Launch unlocks, ceremony about 1.5 s to the Flight screen; with reduced motion the gate still passes (shorter) |
| G2 flight motion (odometer, travelling satellite, line draws in, storm rings, reentry hold, speeds) | done | seen: flight mid-play, 1x / 4x / 16x, day counter, reentry stamp at 120 km, hold before "See the report" |
| G3 verdict stamp, count-up, requirement stagger, resilience meter | done | seen: DIED / LIVED stamps, "The Sun took 386 days", requirement tiles, Sun resilience 14 / 20 |
| G4 build feedback (card lift, gauges animate, slot icons, exploded 6U) | done, extended by Track 7 | seen: dial gauges, slot icons, hotspots, detail panel; `qa/track7/hotspots.mjs` 0 problems |
| G5 screen transitions, pressed states, CML rail progress | code only | CSS present; not judged frame by frame |
| G6 illustration wiring with SI tag | done | seen: P1/P2 Brief, P3 Orbit, P5 Build, P6 Report, P8 Launch, P9 Flight, P11 Launch, P20 Re-fly, each with the "SI-generated" tag; alt text now comes from `content/text/art-alt.json` in EN and AR |
| G7 empty and loading states | code only | `ui/EmptyState.tsx` used on Report and Re-fly before a flight; not walked |
| G8 optional sound, default off | done | seen: "Sound is off. Tap to turn on"; `sound.ts` is on only when localStorage `sp-sound` is '1' |
| G9 first screen: one line, Sun Stripe visible | done | seen at 1440x900: header line and Sun Stripe in the first view |

## Prompt G2 (X1-X8)
| Item | Status | Evidence |
|---|---|---|
| X1 header mission-control strip | done, one change | seen. The strip said "DAY 0" on every screen, including after an 833-day flight; that constant was removed in this pass. It now reads "SCENARIO name · SCORE n/100". |
| X2 briefing-style Brief (banner, emblem, one-sentence hook, full brief folded) | done | seen |
| X3 dial gauges | done | seen; numbers stay inside the dial in EN and AR (`qa/TRACK2.md`) |
| X4 CML rail icons, medals, delta chips | done | seen: three medals with their rule, "+369 days", "+17 pts" on Re-fly |
| X5 orbit mini-diagram / orbit scene | done | seen: ring, drag and FCC bands, live numbers |
| X6 micro-feedback (selected outline, trail, copied chip, inline code error) | done | selected card has a 2 px outline and a check mark; empty and bad codes show the inline error |
| X7 team mode emblems, storm vote card | done in the flows | `qa/FUNCTIONAL.md` F1 (team setup, hand-over, 4 votes); not looked at by me |
| X8 exploded view hotspots | done | `qa/track7/hotspots.mjs` |

## Prompt G3 (S0-S6)
| Item | Status | Evidence |
|---|---|---|
| S0 star backdrop, Paper toggle | done | seen in Night; Paper is walked by the axe sweep (`qa/TRACK2.md`). Idle CPU under 3%: not measured, unverified. A few sparkle stars cross header text; small, left as is. |
| S1 Orbit planning table | done | seen. "0 of 11 checks fail" now reads "All 11 checks pass". |
| S2 Launch rhythm | fixed in this pass | the two pictures were about 740 px tall each; now bands, so the Sun Stripe is in the first view |
| S3 Flight instruments, mission log | fixed in this pass | header picture capped; the map now draws `SimResult.groundTrack` |
| S4 Report debrief | done, two fixes | SI tag on the backdrop was clipped (fixed); note added that explains 398 vs 386 days |
| S5 Re-fly console | done, two fixes | one-click tweaks now show after the first flight; table labels translated |
| S6 consistency, 20 clean walkthroughs | see `qa/TRACK2.md` | |

## Hard rules (grep of `web/src`)
0 gradients; 0 glows, text shadows or blurred box shadows (the one `blur()` is the canvas that blurs the real GIBS picture to the camera's resolution); 0 hex colours and 0 px font sizes outside `styles/tokens.css`; 0 emoji; the Sun colour is used only for the Sun, storms, drag and "the Sun took" numbers, never on a button. Only `ui/Starfield` draws stars.

## Budget
JS 174.81 kB gzip (was 169.79 before this pass), CSS 13.92 kB gzip (was 12.52): +6.4 kB in total, inside the Track 7 (+15 kB) and Track 5 (+60 kB) limits. Art folder 4.94 MiB (under 6 MB), pictures lazy-loaded.
