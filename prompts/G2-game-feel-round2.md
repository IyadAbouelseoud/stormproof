# Prompt G2: game feel, round 2 (header, Brief, instruments, rewards)

**Who:** Renad (UI lane) or Iyad with a Sonnet `worker`. Same rules as prompt G (read it first: tokens only, no gradients/glow/emoji/confetti (the shared `ui/Starfield` backdrop is the one allowed star effect, see G3), `--sol` only for the Sun, transform/opacity animation, reduced motion, RTL, real values only, no new dependency, engine and contracts untouched). Fable (prompt C, Track 5) verifies and fills gaps.
**Why:** Iyad's playtest of the live site: the header and the Brief read like a textbook. The exploded-view hover did nothing. Done already by Claude on main: the Build exploded view now has live hotspots, a dim-the-rest spotlight and a detail card. Do not redo it.

<tasks>
X1. Header becomes a mission-control strip (all screens). Keep the title and the pitch line, but:
  - a small code-drawn orbit scene on the right: a Sun disc (sol), an Earth arc, a satellite dot that travels the orbit continuously (CSS offset-path or SVG animateMotion, 24 s loop, off for reduced motion);
  - a live status line in Plex Mono: `DAY 0 · SCENARIO <name> · SCORE <n>/100` taken from the current result; it updates (count-up) when the design changes;
  - sound becomes an icon button (speaker / speaker-off, aria-label, 48 px). Default OFF; first visit shows a one-time tooltip "Sound is off. Tap to turn on". Never play before the first user tap.
X2. Brief becomes a mission briefing, not an essay (Brief.tsx).
  - Top: a full-width banner with the scenario art (P2 Angola, P7 Jeddah) at 21:9, SI tag, and the mission emblem (code-drawn circle with sun, orbit and satellite; later swap in P13 from prompt D3).
  - Title, then ONE sentence of story (max 20 words) visible; the rest of the story behind a "Read the full brief" disclosure (closed by default, keyboard accessible, content/text unchanged).
  - Requirements become objective tiles in a grid (3 columns at 1440, 2 at 390): each tile has a code-drawn line icon (revisit: clock with arrows; image detail: crosshair grid; data: stacked disks; lifetime: hourglass; budget: coin; event look: cloud with eye), the label, the big target number in Plex Mono, and an empty checkbox ring that fills on the Report screen. The "why" sentence shows on hover/focus/tap, not always.
  - Staged reveal on load: banner, title, tiles stagger in 120 ms apart (opacity + 8 px rise). Reduced motion: none.
  - The Start mission button is the single focal action: full-width on mobile, with an arrow that mirrors in RTL, press = 1 px depress + the snap sound.
  - Sun Stripe stays visible without scrolling at 1440x900.
X3. Gauges as instruments (Build, GaugeRow). The six gauges fill the row width (no empty right side at 1440). Each becomes a dial-style gauge: a flat arc (SVG stroke-dasharray, tokens only) with the value in the middle, a tick at the CML margin, colour by ok/warn/fail. The arc animates to a new value in 240 ms. A gauge that crosses its limit shakes once (2 px, 120 ms) and shows the reason. Keep the numbers and "Limit / Margin" text.
X4. Progress and reward (all derived from SimResult, never invented):
  - CML rail: each of the four stages gets a small code-drawn icon and fills as the player moves forward; the current stage pulses once on arrival.
  - Report: three medals shown as earned or locked, computed from the result: "Plan flown" (every requirement met), "Sun survivor" (alive past the plan-mode lifetime in truth mode), "Storm rider" (alive through 3-5 Feb 2022 if the flight spans it). Locked medals are outlined, earned ones filled lapis. Each shows how it was computed on focus. Use the P14 medal art only if delivered, else code-drawn.
  - Re-fly: show the change versus the previous attempt as an up/down delta chip with an arrow (lifetime days, score).
X5. Orbit screen: the altitude slider gets a live mini-diagram (Earth arc, orbit ring at the chosen height, the drag and FCC bands as coloured arcs) that updates as you drag; the satellite dot sits on the ring.
X6. Micro-feedback everywhere: part card selection draws a lapis outline in 120 ms; the six-gauge trail items slide in one by one; copy-mission-code shows a 1.2 s "Copied" chip; invalid code shows an inline error, never a crash.
X7. Team mode: role chips get the code-drawn role emblems (or P16 if delivered); the storm vote is a two-button card with a countdown ring (cosmetic only, no forced timeout).
X8. Hotspot polish pass on the Build exploded view (already shipped): keyboard order, 48 px targets, RTL positions mirrored correctly, touch tap toggles, card text in en and ar. Fix only defects.
</tasks>

<acceptance>
- Playwright walk at 390x844 and 1440x900, EN and AR, Paper and Night, reduced motion on and off: no console errors, no horizontal overflow, axe serious/critical zero if @axe-core/playwright is available.
- No hex colours or px font sizes outside tokens.css; no gradient, box-shadow glow, emoji.
- Lighthouse performance 85 or more; bundle +40 kB gzip max; 20 consecutive walks with zero renderer crashes (see prompt C carry-over item 1).
- Screenshots in qa/screens/ before and after for header, Brief, Build gauges.
- HANDOFF line per task: done, partly, cut.
</acceptance>
