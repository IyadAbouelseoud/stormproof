# Prompt D4: Night-theme plates for the space look (Dua, Gemini)

The game now runs on Night (ground #0D1016) over a live star backdrop, so these plates are made on a DARK ground and must sit on it without a visible box. Do D3 first only if time allows; D4 matters more for the screens Renad is redesigning (G3).

Workflow per image: open a new Gemini chat, attach the reference file(s) listed, paste the style block, then the prompt. Save as PNG, send to Iyad with the file name shown. Iyad converts to webp and adds the SI tag.

## Reference files (in the repo: web/public/img/art/)
- STYLE reference for every image: `art-p9-flight-header-v1.webp` (dark navy almanac plate with a CubeSat and dotted orbit; this is the target look).
- Second reference where noted: `art-p8-launch-header-v1.webp`, `art-p3-ground-station-v1.webp`.

## Shared style block (paste first)
Flat editorial illustration in the style of an Arabic astronomical almanac plate on a dark ground: hand-inked hairline strokes in warm cream (#ECE5D8) and brass (#C9A25A), flat lapis (#2340B8) fills, visible paper grain, background exactly #0D1016 with no vignette. No gradients, no glow, no lens flare, no 3D rendering, no photorealism, no nebula, no scattered starfield (stars are drawn by the app). NO text, letters, numerals, logos, flags, people, real brands or real rocket markings. Sun orange #FF5A1F used ONLY for the Sun. Generous empty margin, strong simple silhouette, calm composition.

## P18 Light rocket portrait (portrait 3:4) -> `art-p18-rocket-light-v1.png`
Attach: P9 (style). "A slim two-stage small launch rocket standing upright, seen from the side, drawn as an almanac specimen: cream hairline outline, lapis fairing, brass band at the stage joint, small dotted flame-free base, thin leader lines ending in empty circles on both sides. Generic, no real markings."

## P19 Heavy rocket portrait (portrait 3:4) -> `art-p19-rocket-heavy-v1.png`
Attach: P9 (style) and P18 once made (same line weight). "A taller, wider three-booster-style heavy rocket standing upright, same specimen style as the light rocket, clearly larger in proportion, generic, no markings, no flame."

## P20 Re-fly diptych (wide 21:9) -> `art-p20-refly-diptych-v1.png`
Attach: P9, P8. "Two panels side by side separated by a thin brass vertical rule. Left panel: a small CubeSat on a short, tightly curved orbit that ends early in a small cream cross-hatched burn mark at the planet's edge. Right panel: the same CubeSat on a long, wide orbit that continues past the panel edge. Earth drawn as a flat lapis arc at the bottom of each panel; a small orange Sun disc only in the top-right corner of the right panel."

## P21 Debrief console plate (wide 21:9) -> `art-p21-debrief-plate-v1.png`
Attach: P3 (ground station), P9. "A ground-station dish silhouette on a low horizon at left, a dotted line rising to a small CubeSat at upper right, three empty circular instrument rings in a row at the bottom centre like gauges (no ticks with numbers), brass hairlines. Calm, empty centre-top for the app to place a stamp."

## P22 Waiting-in-orbit empty state (square) -> `art-p22-empty-orbit-v1.png`
Attach: P9. "A single small CubeSat on a faint dotted circular orbit around a flat lapis planet at the lower edge, mostly empty space around it, a small dotted question-mark-free gap in the orbit ring where the satellite will appear. Quiet and minimal."

## P23 Mission-log scroll border (wide 8:1, transparent-looking dark) -> `art-p23-log-border-v1.png`
Attach: P9. "A thin decorative almanac border strip: repeating tiny astrolabe tick marks and small brass diamonds along a single hairline, nothing else, on the dark ground."

## Checks before sending
Background reads as #0D1016 and blends into the app; no text, numerals, people or logos; orange only on the Sun; no gradient or glow. If a check fails, regenerate, do not retouch. Remember: illustrations, never real imagery.
