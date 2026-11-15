# DEMO: the scripted pitch mission (fail, then fix)

The live slot is 3 minutes in total. This demo takes about 75 seconds of it. Every number below is engine output, locked by `engine/test/demo.test.ts` (files `content/demo/angola-demo.json`, `content/demo/jeddah-demo.json`) and checked on screen by `web/scripts/demo-walk.mjs`. Nothing here depends on luck: the seed is fixed (20230415).

## Before you start
- Open the live URL (or `pnpm --filter @stormproof/web preview`) at 1440 x 900 or larger. English. Night theme (default). Sound is off by default; leave it off.
- **Mode: Engineer.** The header switch defaults to *Cadet* (plain words, tips, goal tracker) for first-time players. The judges' demo below is scripted in **Engineer**: press "Engineer" next to the language button once before you start (it is remembered). Every number is the same in both modes; in Cadet two labels read differently ("Lifetime" is "Stays up for").
- New since v1.0-rc2 (prompt H): a goal tracker strip on Build/Orbit/Launch (projected score and stars), the Part lab in each part's detail panel, one storm decision per flight, and a Report top card with "Best next fix". None of them changes a demo number; `web/scripts/demo-walk.mjs` checks them in Engineer.
- Reload the page so the design is the default Angola mission. For a room with no Wi-Fi, serve the built site locally (`pnpm --filter @stormproof/web preview`): then nothing needs the network. There is no service worker, so the hosted site needs a connection to load pictures it has not shown yet.
- Check: `cd web && pnpm build && pnpm preview --port 4172`, then `node scripts/demo-walk.mjs` must print `RESULT: 0 wrong numbers, 0 console/network problems`.

## The story in one line
"Same satellite, same rocket, same launch day. The 2019 forecast said it would live 3.3 years. The real Sun gave it 2.3. Seventeen kilometres fixed it."

## Click by click

| # | Screen | Do | What the screen shows | Say | Time |
|---|---|---|---|---|---|
| 1 | Brief | Nothing. Point at the header line and the Sun Stripe. | "FACSAT-2 was designed for five years, flew into a stronger Sun than forecast, and lasted 926 days." Sun Stripe 2015-2026, marker on Apr 2023 (F10.7 146.7 sfu). | "The Sun you launch into decides how long your satellite lives." | 8 s |
| 2 | Build | Press **Next**. Click the **Pointing** dot on the drawing (or the Pointing tab). Click the **Precise Pointing** card. | The equipment bay: map and options side by side; the card showed "Fixes: Comes back every…" and the gauge changes before you equipped it. Gauges after the change: mass 6.7 kg of 12, power 8.9 W, budget 1.3M of 1,500,000 USD. | "Every part is a trade. Better pointing meets our 10-day revisit, and costs mass, power and money." | 12 s |
| 3 | Orbit | Press **Next**. Drag the altitude slider from 500 to **480 km** (or press Left Arrow twice). | Forecast Sun **1219 days** (3.3 years). Real Sun **833 days** (2.3 years). "All 11 checks pass". | "Lower is sharper. The forecast says we still make our three years. Every check is green." | 10 s |
| 4 | Launch | Press **Next**. Wait for the checklist to tick, press **LAUNCH**. | Launch date Apr 15, 2023. Planned life 1,219 days. 3-2-1 countdown (about 1.5 s). | "We launch on 15 April 2023, into a rising Sun." | 8 s |
| 5 | Flight | Press **Play**, let it run 3 seconds, then **Skip to end**. | Solid line (real Sun) falls away from the dashed line (2019 forecast). Reentry at 120 km. Counter stops at **833 days**. | "Dashed is the plan. Solid is what NASA's OMNIWeb data says the Sun really did." | 10 s |
| 6 | Report | Press **See the report**. | Stamp **DIED**, "reentered Aug 25, 2025, the Sun took 386 days". Score **78 / 100**. Requirements **4 / 5**, "Lifetime: missed, 833 days >= 1,095 days". Cause chain: "Air at 480 km was on average 1.6 times as dense as planned." | "It died 386 days early. One requirement missed: lifetime. The cause chain says why: the air was 1.6 times denser than planned." | 12 s |
| 7 | Re-fly | Press **Next**. Under "Try next tweaks" press **Align with FACSAT-2 heritage orbit**. Then **Skip to end**, **See the report**. | Altitude 480 to **497 km**. Stamp **LIVED**, "reentered Aug 29, 2026". **1,202 days**. Score **95 / 100**. Requirements **5 / 5**. "Reenters after 3.3 years: meets the FCC 5-year and NASA 25-year rules." | "One change: 17 km higher, the orbit the real FACSAT-2 flew. It lives 1,202 days, meets every requirement, and still comes down inside the FCC 5-year rule." | 12 s |
| 8 | Re-fly | Press **Next**. | Side by side: First flight **833 days**, Re-fly **1,202 days**, **+369 days**, **+17 pts**, two altitude lines. | "Plan with the forecast, fly with the truth." | 5 s |

Machine time for all eight steps is under 25 seconds; the rest is talking.

Do not press "Raise orbit altitude by +50 km" in step 7: 530 km lives 3,763 days (10.3 years) and breaks the FCC 5-year rule. It is a good answer if a judge asks "why not just go higher?".

## The three missions (codes)

Paste a code into the Report screen's "Load" field to jump to a design.

**FAIL** (`angola-fail`): 6U, sun-synchronous 480 km, SpaceX rideshare, 15 Apr 2023, Precise Pointing.
Plan 1,219 days, truth 833 days, the Sun took 386 days, reentry 25 Aug 2025, score 78, 4 of 5.
```
SP1-YW5nb2xhfmNhbWVyYS1zdGFuZGFyZH5wYW5lbHMtbGFyZ2V-YmF0dGVyeS1tZWRpdW1-cmFkaW8tZmFzdH5jb21wdXRlci1zdGFuZGFyZH5wb2ludGluZy1wcmVjaXNlfmZ1ZWwtc21hbGx-NlV-U340ODB-c3BhY2V4LXJpZGVzaGFyZX4yMDIzLTA0LTE1fnR-MjAyMzA0MTV-fg
```

**FIX** (`angola-fix-refly`, the one-click Re-fly tweak): the same satellite at 497 km.
Plan 1,637 days, truth 1,202 days, the Sun took 435 days, reentry 29 Aug 2026, score 95, 5 of 5, FCC met (3.3 years).
```
SP1-YW5nb2xhfmNhbWVyYS1zdGFuZGFyZH5wYW5lbHMtbGFyZ2V-YmF0dGVyeS1tZWRpdW1-cmFkaW8tZmFzdH5jb21wdXRlci1zdGFuZGFyZH5wb2ludGluZy1wcmVjaXNlfmZ1ZWwtc21hbGx-NlV-U340OTd-c3BhY2V4LXJpZGVzaGFyZX4yMDIzLTA0LTE1fnR-MjAyMzA0MTV-fg
```

**Backup FIX by hand** (`angola-fix`, Orbit slider back to 500 km): plan 1,730 days, truth 1,313 days (still flying on 29 Oct 2026; reenters about 18 Dec 2026 on NASA's forecast Sun), score 95, 5 of 5, FCC met (3.6 years).
```
SP1-YW5nb2xhfmNhbWVyYS1zdGFuZGFyZH5wYW5lbHMtbGFyZ2V-YmF0dGVyeS1tZWRpdW1-cmFkaW8tZmFzdH5jb21wdXRlci1zdGFuZGFyZH5wb2ludGluZy1wcmVjaXNlfmZ1ZWwtc21hbGx-NlV-U341MDB-c3BhY2V4LXJpZGVzaGFyZX4yMDIzLTA0LTE1fnR-MjAyMzA0MTV-fg
```

## Things a judge may notice (and the honest answer)
- **The cause chain says 398 days, the stamp says 386.** The launch slipped one month (seeded). On the planned date the Sun would have taken 398 days; the slip gave 12 back. The Report prints this line under "The Sun took".
- **The Orbit screen already shows the real-Sun number before launch.** Yes: the team chose to show the risk while you plan. The flight then shows why.
- **Storm alerts.** A Kp 7 or higher storm pauses playback and asks for a vote (ride out or safe mode). "Skip to end" does not stop for them.
- **The FIX at 500 km is "still flying".** The real Sun data ends on 29 Oct 2026. After that the game uses NASA's solar-cycle prediction and says so.

## Optional 60-second add-on: Jeddah flood watch
On the Brief choose **Jeddah flood watch**, or paste the codes (in `content/demo/jeddah-demo.json`). All three fly 6U, 500 km sun-synchronous, launched 1 Jun 2021: 1,394 days, reentry 26 Aug 2025, score 80.

| Mission | Result | Numbers |
|---|---|---|
| `optical-fails` | The only pass in the 2-day window is on 24 Nov 2022. Storm cloud blocks the optical camera. Event look: none. | 5 of 6, cost 1,233,000 USD |
| `radar-over-budget` | Radar sees through the cloud (first look 0.4 days), but the design is over budget and over volume. | 5 of 6, cost 2,013,000 of 1,900,000 USD, mass margin 22% (35% needed) |
| `lean-radar-recovery` | Radar look at 0.8 days and every fit check passes. Revisit is the one missed requirement. | 5 of 6, cost 1,847,000 USD |

Say: "A satellite cannot warn of a flood that lasts hours; NASA's IMERG rain data does that. The satellite shows what happened, and only if its camera can see through cloud. No 6U radar imager has flown: ours is a labelled design study."

## If something goes wrong
- "Sample data" in the header: the data files did not load. Reload once. The demo numbers need the real data.
- Known and disclosed: the map has no coastline; three NASA DAS comparison points fail (README "Disclosed limits").
- Flight playback crash seen earlier in headless Chrome: see `qa/TRACK2.md` for the final 20-walk result.
