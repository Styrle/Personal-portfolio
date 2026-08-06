# Portfolio — "Orbit", dark, August 2026

Third pass. Motion language from the Circus Shanghai reference, now sitting on
the dark **Sophisticated Vibrancy** palette. Still zero dependencies, still no
build step.

## The idea

Flat colour fields, orbital geometry, light-weight display type at large
sizes, and motion that reads as a solar system: things fly out from a centre
point, grow as they travel, then drift.

## Colour — dark surface hierarchy

Depth comes from **tonal layering**, not shadows. Five surface levels, straight
from the Stitch spec:

| Token | Value | Used for |
| --- | --- | --- |
| `--surface-lowest` | `#0B0F10` | universe menu, footer |
| `--surface` | `#101415` | page ground, hero |
| `--surface-low` | `#191C1E` | marquee, image beds |
| `--surface-mid` | `#1D2022` | raised sections (capabilities) |
| `--surface-high` | `#272A2C` | cards, hover states |
| `--surface-top` | `#323537` | highest stacking |

Text runs `--on-surface` `#E0E3E5` → `--on-surface-dim` `#C5C6CD` →
`--outline` `#8F9097`, with `--outline-dim` `#45474C` for hairlines and a
`--ghost` (white at 10%) for the 1px card borders the spec calls for.

Accents keep your identity and gain two lifts for legibility on dark:

- `--indigo` `#4648D4` — brand fill: CTA field, work-row hover, warp discs
- `--indigo-lift` `#8F92FF` — chips and inline accents
- `--periwinkle` `#ADC6FF` — eyebrows, links, focus rings
- `--amethyst` `#DDB8FF` — tertiary flourish on planets
- `--amber` `#FFC329` / `--amber-deep` `#E5A300` — signature highlight

The old light-theme aliases (`--ink`, `--paper`, `--line`, `--mist`) still
exist, repointed at the dark equivalents, so nothing downstream broke.

### Flat colour fields

Following the reference, sections alternate rather than sitting on one ground:
hero and work index on `--surface`, capabilities lifted to `--surface-mid`,
marquee on `--surface-low` — then two full-bleed colour moments. **Section 02
is a flat amber field** with dark type, and **section 06 is flat indigo**.
Those two carry the energy; everything else stays calm.

### Glassmorphism & type

The sticky bar uses a 20px backdrop blur over `rgba(16,20,21,0.6)` with a
ghost border. Cards use ghost borders and a soft indigo glow on hover.
**JetBrains Mono** now carries all metadata — eyebrows, the section counter,
work numbers, project tags, meta headings, the hero role line — per the
spec's "technical labels" note.

## The universe menu

The signature piece. Opening it:

1. The overlay clips open as a circle from the toggle button (0.95s)
2. Four orbit ellipses fade in and rotate on a 160s loop
3. A core dot pops, then five amber rays scale outward from it
4. Nine planets fly out along those rays, growing from scale 0, on staggered
   delays — then settle into slow independent drift (11–20s, alternating)
5. Menu items mask up from below, one every 70ms
6. The meta row (email, location, socials) fades in last

Each menu word is split into per-character spans by JS, each carrying its own
`--chc` colour from a cycling palette. Hovering runs a coloured wave across
the word with a 26ms per-letter stagger. Hovering also lights that item's
paired planet (`data-planet`) and dims the rest of the system.

Escape closes it, Tab is trapped inside it, and body scroll locks while open.

## Page transitions

Two halves, deliberately decoupled:

- **Enter** — an indigo disc contracts away from centre. Pure CSS animation on
  `.warp-in`, so it plays on first paint whether or not the JS has run.
- **Exit** — JS intercepts same-origin link clicks, grows an ink disc from the
  click coordinates, then navigates after 560ms. `pageshow` resets it for
  back-button/bfcache returns.

With JS off, links just navigate normally.

## Other motion

| Element | Behaviour |
| --- | --- |
| Headings | line-mask reveal, children rise from below |
| Body copy | left-to-right colour wipe (`background-clip: text`) |
| Hero | orbit rings + planets, pointer parallax via `--px`/`--py`, scroll parallax |
| Statement | halftone dot swarm scales in behind flat amber |
| Work rows | indigo field wipes up from the bottom edge |
| Work preview | circular image that trails the cursor, lerped |
| Constellation | SVG rays draw on via `stroke-dashoffset`, nodes pop with stagger |
| CTA | two discs scale in from the right, amber in front of ink |
| HUD | fixed `01 / 06` section counter + scroll progress bar |
| Cursor | trailing ring that swells over interactive elements |

## Notes / decisions

- **Typography** — Bricolage Grotesque for display (weight **200** at large
  sizes), Hanken Grotesk for body, JetBrains Mono for labels. Swapping
  `--font-display` for a high-contrast display serif is a one-line change.
- **Client logos** get light tiles in the marquee. Three of the six are dark
  artwork on opaque white backgrounds, so no filter can make them work on a
  dark ground — the tile is the honest fix. Muted at rest, full colour on hover.
- **Buttons stay pills.** The spec calls for 0.5rem on buttons; change
  `--radius-pill` to `0.5rem` if you want that instead.
- **The custom cursor hides the native pointer** (`.has-cursor { cursor: none }`).
  Delete that one rule to keep the arrow.
- `prefers-reduced-motion` is honoured throughout — every animation collapses
  to its end state, the warp-in is removed, and the cursor falls back to native.
- Visible focus rings everywhere; the universe uses amber rings on its dark
  ground. Menu links keep their accessible names despite being split into
  per-letter spans.

## Structure (unchanged)

```
index.html  about.html  work.html
css/stylesheet.css      (rewritten — 1,278 lines)
js/script.js            (rewritten — 334 lines, no dependencies)
portfolio/*.html        (8 pages regenerated; copy untouched)
images/                 (untouched)
```

## Bug fixed along the way

The scroll-reveal observer used `threshold: 0.15`. Project screenshots run to
5,800px tall — taller than six viewports — so 15% of them could never be
visible at once and **they never revealed**. Now `threshold: 0` with a
`-12%` bottom root margin, which works at any element height.

## Still outstanding

- Somerset Bees and Zero Limitations still have no project screenshots.
- `bin-sensor`, `rpcs3` and `strength-analysed` remain unbuilt stubs. The
  `rpcs3-*.png` images are sitting unused in `images/` if you want to revive
  that one.
- `codewest.png`, `freedom-leisure-logo.jpeg` and `portrait.jpg` are also
  unreferenced — Freedom Leisure could join the client marquee.

## Deploying

Replace the repo contents with this folder and push. GitHub Pages needs
nothing else — no build step, no npm dependencies.
