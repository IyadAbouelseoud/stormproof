# Prompt D3: emblems, medals and extra plates for game feel (Dua, Gemini)

UI icons (parts, requirements, CML stages, speaker) are drawn in code for consistency, so they are NOT in this list. Gemini makes only the illustrated pieces below. Same workflow as D2: attach P1 as the style reference, 3 variants each, pick one, no hand retouching, save as `web/public/img/art/art-pN-<slug>-v1.webp` (1600 px, webp q80), add rows to content/sources.csv ("Gemini, prompt D3 PN, 2026-11-14, SI-generated"), make the tagged copy in content/pitch-art/, commit `art: P13-P17`.

## Shared style block (paste first in every prompt)
Flat editorial illustration in the style of an Arabic astronomical almanac plate: hand-inked hairline strokes, flat colour fills, visible paper grain, no gradients, no glow, no lens flare, no 3D rendering, no photorealism, no scattered starfield. NO text, NO letters, NO numerals, NO logos, NO flags, NO people, no real brands. Palette only: paper #F2ECDF, ink #15171C, lapis #2340B8, brass #765520, and sun orange #FF5A1F used ONLY for the Sun. Plain paper background, generous margin, strong simple silhouette.

## P13 Mission emblem (square, Paper)
"A circular mission emblem like an astrolabe seal: an outer ring with fine tick marks, inside it a small orange Sun disc at upper left, a thin lapis orbit ellipse, a tiny six-unit CubeSat on the orbit, and a small Earth disc at the lower right. Perfectly centred, symmetric ring, no text."

## P14 Three medals (3 separate images, same style; square, Paper)
(a) "A round brass medal with a laurel-free almanac design: a satellite on a closed circular orbit with a small check stroke; 'plan flown'."
(b) "A round brass medal: a small Sun disc with concentric rings and a satellite passing safely in front; 'sun survivor'."
(c) "A round brass medal: a stylised storm wave arc (curved hairline rays) and a satellite riding above it; 'storm rider'."
Each medal on a short lapis ribbon, flat, centred, no text. Orange only on the Sun in (b).

## P15 Orbit header (wide 21:9, Night #0D1016)
"A cross-section of the Earth's edge seen from the side as concentric flat bands: thin atmosphere layers in lapis tints getting fainter with height, with a dotted horizontal altitude scale on the left (ticks only, no numbers) and three small satellites at different heights, the lowest one with short drag streaks. Calm, diagrammatic, much empty dark space on the right."

## P16 Four role emblems (one image, 2x2 grid of equal cells on plain paper, Paper)
"Four small round emblems in a 2 by 2 grid with equal spacing: top-left a compass rose (systems lead), top-right a magnifier over a leaf-shaped land patch (science), bottom-left a sun with a small solar panel (power and spacecraft), bottom-right a dish antenna with an orbit arc (orbit and comms). Same line weight, brass and ink with lapis fills, no text."

## P17 Autopsy plate (wide 16:9, Paper)
"A scientific specimen plate in almanac style: a CubeSat laid flat at the centre, seen from above, with thin hairline leader lines ending in small empty circles to the left and right (no labels), and a faint dashed arc across the top suggesting a descent path. Paper grain, a brass border line, lots of margin."

## Checks before sending to Iyad
No text, numerals, people or logos; orange only on the Sun; no gradient or glow; if present, regenerate, do not retouch. Remember: illustrations, never real imagery.
