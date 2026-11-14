# QA Screen Verification Checklist: 1440x900 & 390x844 (EN / AR / Night)

Verified across all 7 mission screens and app views under the **Night space theme** (default live starfield backdrop) with RTL mirroring in Arabic and LTR in English, using Playwright automated smoke walks (`web/scripts/smoke.mjs` and `web/scripts/smoke-jeddah.mjs`).

## Acceptance Criteria Verification Summary
- **Console Errors:** 0 across all runs
- **Request Failures / External Requests:** 0 (fully offline-compliant)
- **Horizontal Overflow:** 0 px across all screens at 390x844 and 1440x900
- **Theme / Starfield:** Space night theme live with CSS starfield drifting on GPU, 60 fps, >=4.5:1 text contrast over panels
- **Gradients / Glow / Emojis / Hex colors / Outside px font sizes:** 0 (tokens only)

---

## Screen Checklist Matrix

| Screen | 1440x900 EN | 1440x900 AR (RTL) | 390x844 EN | 390x844 AR (RTL) | Key Verification Points |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Brief** | ✓ | ✓ | ✓ | ✓ | 21:9 hero banner with SI tag, mission emblem patch, one-sentence hook with `<details>` disclosure, 3-col/2-col objective tiles with icons, focal Start Mission button with mirrored arrow, compact Sun Stripe visible without scrolling. |
| **Build** | ✓ | ✓ | ✓ | ✓ | Exploded 6U diagram with live hotspots, subsystem spotlight, full row-width dial gauges with CML margin tick and shake on limit, 7 code-drawn line family icons, selected part card lapis outline transition. |
| **Orbit** | ✓ | ✓ | ✓ | ✓ | 60% left column big orbit scene SVG with Earth disc, day/night terminator, eclipse arc, drag and FCC bands, live ring drag on slider change; right 40% SSO / 51.6° selectable console tiles with mini ring icons, Sun Risk strip with 240ms animated count-up numbers, FCC 5-year compliant badge, fit checks. |
| **Launch** | ✓ | ✓ | ✓ | ✓ | Pre-flight vehicle selection with Electron (P18) and SpaceX Rideshare (P19) cards with capacity vs satellite mass bar and orbit-fit tick; Pre-flight checklist ticking in 120ms sequence; centered countdown button; 3-2-1 countdown ceremony triggering starfield warp burst (scaleY 1.6 for 600ms). |
| **Flight** | ✓ | ✓ | ✓ | ✓ | Instrument HUD readout (Date, Day odometer, Altitude km, Density kg/m³, Kp/storm alert); AltitudeChart and SunStripe paired as interactive instruments with draggable/arrow-key scrubbing; vertical cursor syncing charts, ground map, and log; spacebar play/pause; Mission Log panel (bottom-left) with live status line; reentry stamp (120 km). |
| **Report** | ✓ | ✓ | ✓ | ✓ | Debrief console header with verdict stamp, score count-up, 3 medals (ReportMedals); two-column console grid with Cause Chain (staggered reveal), Plan vs Truth twin gauges, Requirements checklist, Orbital Disposal Dial (FCC 5y / NASA 25y), Closest-design hint tile with one-click "Apply", GIBS satellite viewfinder frame with corner brackets and blur to GSD, cropped P6 backdrop. |
| **Re-fly** | ✓ | ✓ | ✓ | ✓ | Three-column layout at 1440px / responsive stack at 390px: left "What Changed" delta table with staggered slide-in, centre dual-run racing lifetime bars with up/down delta chips and dual altitude lines chart (P20 diptych art), right 3 one-click tweaks from engine hint; "Fly Again" ceremonial button; empty state with rocket-and-orbit SVG illustration when no baseline. |
| **Gallery** | ✓ | ✓ | ✓ | ✓ | Side-by-side component gallery rendering cleanly in Paper and Night modes. |

---

## Screenshot Artifacts Generated

The following screenshot files are generated in `qa/screens/`:
- `1440-en-brief.png`, `1440-ar-brief.png`, `390-en-brief.png`, `390-ar-brief.png`
- `1440-en-build.png`, `1440-ar-build.png`, `390-en-build.png`, `390-ar-build.png`
- `1440-en-orbit.png`, `1440-ar-orbit.png`, `390-en-orbit.png`, `390-ar-orbit.png`
- `1440-en-launch.png`, `1440-ar-launch.png`, `390-en-launch.png`, `390-ar-launch.png`
- `1440-en-flight.png`, `1440-ar-flight.png`, `390-en-flight.png`, `390-ar-flight.png`
- `1440-en-report.png`, `1440-ar-report.png`, `390-en-report.png`, `390-ar-report.png`
- `1440-en-refly.png`, `1440-ar-refly.png`, `390-en-refly.png`, `390-ar-refly.png`
- `1440-en-gallery.png`, `1440-ar-gallery.png`, `390-en-gallery.png`, `390-ar-gallery.png`
- `jeddah-*-brief.png`, `jeddah-*-build.png`, `jeddah-*-orbit.png`, `jeddah-*-flight.png`, `jeddah-*-report.png`
