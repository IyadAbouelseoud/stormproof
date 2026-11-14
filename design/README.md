# STORMPROOF design brief ("Stormproof Almanac")

Idea: a mission logbook on almanac paper, where the only warm colour is the real Sun.
Two themes: **Paper** (Brief, Build, Orbit, Launch, Report) and **Night** (Flight and ops). Launch turns Paper into Night in 600 ms.
Heritage: Arabic astronomical tradition (astrolabe rete, zij almanacs). At most one ornament per screen. No dark-starfield-neon look.

Day 1 (Renad's agent): generate `design/tokens.json`, `design/tokens.css` and `design/components.css` from the tables below. Do not hand-type other colours.

## Colour tokens (Paper / Night)
| Token | Paper | Night |
|---|---|---|
| ground | #F2ECDF | #0D1016 |
| ground-raised | #FAF6EE | #151A22 |
| ground-sunken | #E7DFCF | #0A0C11 |
| rule | #C9BFAC | #2A313D |
| ink | #15171C | #ECE5D8 |
| ink-muted | #545866 | #A6A196 |
| ink-faint | #767983 | #5E6470 |
| sol | #FF5A1F | #FF5A1F |
| sol-ink | #B3390B | #FF8A57 |
| sol-tint | #FFD9C7 | #3A1A10 |
| lapis | #2340B8 | #93A6FF |
| lapis-tint | #DCE2FA | #1A2347 |
| on-lapis | #FAF6EE | #0D1016 |
| brass | #765520 | #C9A15A |
| ok | #19694A | #5CCB98 |
| warn | #7A4F00 | #E6B04A |
| fail | #A32020 | #FF7A7A |

Rule: `sol` is reserved for the Sun and its effects. Actions use `lapis`.

Sun Stripe (quiet to active): #1E2A44, #3D5277, #8A8F98, #E2B36A, #FF7A33, #E8361A. Steps at F10.7 = 80 / 110 / 140 / 180 / 220 sfu (game-balanced).

## Type
Fonts (self-hosted woff2, OFL): Big Shoulders Display 800 (display, upper case); IBM Plex Sans Arabic 700 (Arabic display; Reem Kufi dropped 2026-11-14, hard to read); IBM Plex Sans and IBM Plex Sans Arabic (text); IBM Plex Mono (data).

| Style | Size / line height | Notes |
|---|---|---|
| display-xl | 88 / 0.92 | Big Shoulders, upper case |
| display-l | 56 / 0.95 | Big Shoulders, upper case |
| display-ar | 48 / 1.2 | IBM Plex Sans Arabic 700 |
| heading | 22 / 1.2 | weight 600 |
| body | 16 / 1.5 | |
| small | 13 / 1.4 | |
| data-l | 32 / 1 | Plex Mono 500 |
| data | 14 / 1.35 | Plex Mono |
| label | 11 / 1.2 | weight 600, upper case, 0.08em tracking |

## Scales
- Spacing (px): 4, 8, 12, 16, 24, 32, 48, 64
- Radius (px): 0, 2, 4
- Durations (ms): 120, 240, 600

## Contrast
All text at least 5:1, controls at least 3:1, in both themes. Verify in code (axe + a contrast script).

## Components
SunStripe, Gauge, PartCard, CauseChain, RoleChip, Button, VerdictStamp, MissionTicket, plus the SI tag.
- **SunStripe**: the Launch-date timeline coloured by F10.7; "forecast" days shaded; the player's chosen date marked.
- **Gauge**: six (mass, power, budget, data, comms, time); value, limit, margin; state by ok/warn/fail.
- **PartCard**: part name, mass/power/cost/data numbers, "game-balanced" or source tag.
- **CauseChain**: the autopsy; ordered causes with numeric effect, ending in the verdict.
- **RoleChip**: systems lead, science, power and spacecraft, orbit and comms.
- **Button**: lapis fill, on-lapis text; 120 ms hover.
- **VerdictStamp**: LIVED / DIED with date and "the Sun took N days".
- **MissionTicket**: the mission code (seed) with copy.
- **SI tag**: small visible "SI-generated" label on every AI image.

## Moments
Peak: the turn to Night on launch and the reentry burn. End: the Autopsy card and Re-fly side by side. Loss framing: "the Sun took N days".

## Visual rules
Draw visuals in code (SVG/Canvas from tokens and real data). AI art is limited to about 7 hero/accent images, each tagged. Arabic + English UI; one ornament per screen; no NASA branding.
