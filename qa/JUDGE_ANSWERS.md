# Judge answers (honest, with evidence)

Every number here is engine or test output from the final pass (14 Nov 2026). Where something is not verified, it says so.

## 1. Which NASA data do you use, and what breaks without it?

| NASA data | What it does in the game | Without it |
|---|---|---|
| OMNIWeb daily F10.7 and Ap, 2015 to 29 Oct 2026 (4,320 days) | Drives the NRLMSIS 2.1 air-density tables for the "truth" flight | No truth flight. The game could only show the forecast, and the core lesson (plan vs truth) is gone. |
| NASA solar-cycle prediction (MSFC, Oct 2026 release) | The Sun after 29 Oct 2026, to Oct 2041, shaded "forecast" | Every flight would stop in Oct 2026; no 5-year or 25-year disposal verdict. |
| DONKI geomagnetic storms (164 storms) | Storm flags on the timeline, storm alerts and the team vote | No storm events. |
| GIBS / Worldview imagery (MODIS, HLS 30 m, GPM IMERG rain) | The "what your camera would see" picture on the Report; the Jeddah rain and cloud replay | The Report has no real picture; the Jeddah scenario cannot be replayed. |
| NASA LSP CubeSat area-to-mass medians, JPL CML 35% margins, NASA-STD-8719.14C | Drag area, design margins, the 25-year rule | The numbers would be guesses. |

NRLMSIS itself is from the U.S. Naval Research Laboratory, not NASA. We say "NASA OMNIWeb data drives the NRLMSIS model".

Measured effect of the real Sun, same satellite, same orbit (`content/demo/angola-demo.json`, locked by `engine/test/demo.test.ts`): at 480 km the 2019 forecast Sun gives 1,219 days, the real Sun 833 days.

## 2. What is real and what is a mock-up?

Real (computed in the browser from shipped data, no network):
- Orbit decay from pre-computed NRLMSIS 2.1 densities, power, data and link budgets, fit checks, disposal rules, score, cause chain. 164 engine tests pass; 3 are marked known failures (below).
- An independent Python re-implementation agrees with the engine on 51 values, largest difference 0.34% (`qa/independent_check.py`, `qa/TRACK1.md`).
- FACSAT-2 check: our model reenters it on 26 Oct 2025; the real date is 27 Oct 2025 (after one disclosed drag fit of -5.3%).
- Starlink Feb 2022 check: a 210 km orbit reenters in 1.27 days on the real Sun, 2.80 days on the forecast.

Game-balanced (labelled on screen and in `content/sources.csv`): part masses, costs and performance, launch slips, storm reset chance, score weights, the Electron price, the bus mass.

Not real:
- Illustrations are AI-generated and tagged "SI-generated". They are never data.
- The radar camera is a design study. No 6U radar imager has flown.
- The map has no coastline.
- The mission-code "ticket" is a way to share a design, not a saved account.

Known failures we keep visible:
- NASA DAS comparison (golden test 2): 18 of 21 checkable points are within +/-30%. Three fail: 430 km launched 2039 (ratio 0.67), 550 km launched 2033 (0.69), 550 km launched 2034 (0.55). We did not tune anything to close them.
- Atmosphere models under-respond to storms. Only the Feb 2022 storm is corrected (density x1.875, Fang et al. 2022).

## 3. Who would use it, and how is it different from what exists?

- Who: students and first-time CubeSat teams, in a classroom or a workshop, solo or as a team of four roles. It runs offline in a browser, in English and Arabic.
- What it teaches: a mission is a set of trades (mass, power, budget, data, link, lifetime), and the launch date is a design choice because the Sun changes the air.
- Difference: professional tools (NASA DAS, commercial mission software) answer the lifetime question for experts. Stormproof lets a beginner fly the same design through the Sun that was forecast and the Sun that happened, and shows the gap in days with the cause chain. As far as we know no classroom game does this with real solar data; we did not run a formal survey.

## 4. What was hardest, and what is next?

Hardest:
1. Making the Sun data right. OMNI F10.7 is adjusted to 1 AU, but NRLMSIS needs the observed flux. We convert it (ratio 1.034 on 4 Jan, 0.967 on 4 Jul; checked on all 4,320 days).
2. Shipping a research atmosphere model offline. NRLMSIS 2.1 is non-commercial, so we ship only pre-computed tables (2.7 MB), not the model.
3. Staying honest when a check fails: the three DAS points above stay as visible failures.
4. Joining measured data to the forecast: the first forecast month is 9% above the last 27 measured days. We show forecast days shaded.

Next: more reference missions beside FACSAT-2, a coastline on the map, a native-speaker review of the Arabic text, measured (not game-balanced) part data, and peer-reviewed sources where we now use a preprint.

## Extra questions we expect

**Is the FACSAT-2 claim true?**
FACSAT-2 was designed for at least five years and lasted 926 days. Against the official 2019 forecast Sun it lost about 1.3 years: the paper finds the forecast-Sun lifetime 1.52 times longer (926 x 1.52 = about 1,408 days). The 1.3 years is our calculation from the paper's ratio. Source: Vargas Dominguez, Angel, Buitrago, arXiv:2609.24534v1 (preprint, not peer-reviewed). We do not say it "fell 2.5 years early".

**Why is your plan/truth ratio 1.44 and not the paper's 1.52?**
Different density model (the paper uses NRLMSISE-00, we use NRLMSIS 2.1) and one disclosed ballistic-coefficient fit (72.3 to 68.43 kg/m2, inside the paper's +/-20%). Our forecast Sun is also a reconstruction of the 2019 panel forecast (peak sunspot number 115, July 2025).

**Could a satellite really warn of the Jeddah flood?**
No. One small satellite revisits every few days; the storm lasted hours. NASA GPM IMERG rain data gives the early signal. The game says this on the Brief.

**Did AI write this?**
AI tools helped with research, brainstorming, code, text drafts and all illustrations. People reviewed the physics; the golden tests compare the engine with real missions. See README "AI use".
