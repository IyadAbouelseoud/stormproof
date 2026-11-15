# Prompt H for Dua (Gemini, Nano Banana Pro). Sun 15 Nov, 06:45 to 09:30

Two jobs, in this order: **A. part pictures** (8 generations), then **B. space background** (real NASA photo first, Gemini only as fallback).
Budget: everything together ≤ 800 KB. Give the files to Iyad by **09:30** (WhatsApp as files, not photos, or commit to `lane/dua`).
Honesty: these are illustrations. Keep the SI tag rule; no people, no logos, no flags, no real brand markings, no text in the images.

---

## A. Part pictures for the Build screen (22 small images from 8 generations)

**How:** for every request, attach `web/public/img/art/art-p5-6u-exploded-v1.webp` (the exploded CubeSat) as the style reference. Each request makes ONE image with **three objects side by side** (small, medium, big tier), so the tiers look like a real progression. Then crop it into 3 squares.

### Style block (paste at the top of every request)
Same style, line weight, paper colour and grain as the attached image: hand-inked technical engraving, hairline cross-hatching, cream paper #F2ECDF, ink #15171C, small flat accents of lapis #2340B8 and brass #765520 only. No gradients, no glow, no 3D render, no photorealism, no text, no numbers, no labels, no leader lines, no logos, no people. Three objects in a row on a plain paper background, evenly spaced, each centred in its own third, same viewing angle (3/4 isometric from above-left), same scale reference so size differences are real, generous margin. 3:1 wide image.

### The 8 requests (add after the style block)
1. **Cameras (camera-budget, camera-standard, camera-sharp):** left a tiny CubeSat camera module with a short single lens; middle a mid-size camera with a longer lens barrel and a sun baffle; right a big folded-optics telescope camera with a long barrel and a large aperture. Each is clearly bigger and more precise than the one before.
2. **Radar (camera-radar), make 1 only, 1:1:** a folded flat-panel synthetic aperture radar antenna for a CubeSat, half unfolded like a book, with a rectangular panel grid. Same style. Square image.
3. **Solar panels (panels-small, panels-medium, panels-large):** left a single small body-mounted solar panel; middle two fold-out wings; right four large deployed wings in a cross. Show the cell grid on every panel.
4. **Batteries (battery-small, battery-medium, battery-large):** left a small pack of 2 cylindrical cells; middle 4 cells; right 8 cells in a bigger pack with a circuit board on top.
5. **Radios (radio-slow, radio-standard, radio-fast):** left a small board with a thin wire whip antenna; middle a board with a small patch antenna; right a larger board with a dish-like high-gain patch array.
6. **Computers (computer-basic, computer-standard, computer-large):** left a single small flight-computer board; middle a board with an extra memory card stacked; right a stack of three boards with memory chips.
7. **Pointing (pointing-basic, pointing-standard, pointing-precise):** left a simple magnet-rod torquer bar; middle a small box with one reaction wheel visible; right a cube with three reaction wheels plus a tiny star-tracker lens.
8. **Fuel (fuel-small, fuel-large), make 2 only, 2:1:** left a small round propellant tank with a tiny nozzle; right a tank twice the size with the same nozzle.

### Export (important for light weight)
- Pick the best of 2-3 variants. Crop each object into a **square, 256 × 256 px**, object filling about 80%.
- Save as **WebP quality 72, each ≤ 25 KB** (squoosh.app works offline once loaded: WebP, quality 72; check the size).
- File names = the part id exactly, in a folder `parts/`:
  `camera-budget.webp camera-standard.webp camera-sharp.webp camera-radar.webp panels-small.webp panels-medium.webp panels-large.webp battery-small.webp battery-medium.webp battery-large.webp radio-slow.webp radio-standard.webp radio-fast.webp computer-basic.webp computer-standard.webp computer-large.webp pointing-basic.webp pointing-standard.webp pointing-precise.webp fuel-small.webp fuel-large.webp`
  (22 files in total. Iyad puts them in `web/public/img/art/parts/`, and the backdrops in `web/public/img/space/`.)
- Keep the full uncropped sheets too (for the slides); Iyad adds the tagged copies.
- Check: all 22 together ≤ 550 KB.

---

## B. Realistic space background (M4)

**Option 1, preferred: a real NASA photo** (more credible to judges than AI, and no SI tag needed).
1. Go to **images.nasa.gov**, search `Milky Way from space station` or `stars Earth limb night ISS`.
2. Choose a photo that is: mostly black sky with many fine stars, at most a thin Earth edge at the bottom, no station hardware covering the middle, no astronaut, no bright Sun.
3. Copy the page URL and the "NASA ID" shown on the page. Iyad needs both for the credit.
4. Export two files: `space-backdrop-2560.webp` (2560 × 1440, quality 60, **≤ 150 KB**) and `space-backdrop-1280.webp` (1280 × 720, **≤ 70 KB**). Darken by about 30% before export so the white text stays readable.

**Option 2, only if nothing fits in 15 min: Gemini.** Prompt:
> Photorealistic deep-space background as seen from low Earth orbit, deep black sky filled with thousands of fine, sharp, natural white and very faint blue-white and warm-white stars of varied brightness, a faint subtle band of the Milky Way crossing diagonally from upper left to lower right with soft dark dust lanes, low contrast and muted colours, no planets, no Sun, no nebula colours, no lens flare, no glow, no spacecraft, no people, no text, no logos. Very dark overall (mostly near-black) so white text on top stays readable. 16:9, 2560 × 1440.

Then export the same two files. Tell Iyad it is Gemini, so the footer credit says "Background: SI-generated illustration".

---

## Done check (2 min)
- [ ] 22 files in `parts/`, named exactly by part id, each ≤ 25 KB
- [ ] 2 backdrop files, ≤ 150 KB and ≤ 70 KB
- [ ] Source written down (NASA URL + NASA ID, or "Gemini")
- [ ] Sent to Iyad by 09:30
