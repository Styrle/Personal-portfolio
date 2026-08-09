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

## Intro sequence

The homepage opens with a three-beat introduction, mirroring the reference's
numbered intro:

| Beat | Field | Word |
| --- | --- | --- |
| 01 | Indigo | Design |
| 02 | Amber | Engineering |
| 03 | Ink, with orbit rings and planets converging | Josh Serpis |

Each beat arrives as a disc scaling up to fill the frame — the same circular
wipe the reference uses between slides. A mono `01 / 03` counter sits bottom
left and a **Skip intro** control bottom right.

It auto-advances at 1.15s per beat, but scroll, click, tap or an arrow key
jumps ahead immediately, so it's interactive rather than something to sit
through. Total run time is about 3.5 seconds if untouched.

**It stays out of the way.** An inline script in `<head>` arms it before first
paint, and only when all three are true: no `jsx-intro` flag in sessionStorage,
reduced motion off, and no same-origin referrer — so it plays on genuine first
arrival, not every time someone navigates back to the homepage. No JS, or
reduced motion, and the markup never renders at all.

## Intro lab — `intro-lab.html`

A scratch page (noindex, not linked from the site) holding six candidate intro
sequences side by side. Each card previews live; **Play full screen** is the
only honest way to judge one.

| # | Name | Words? | Idea |
| --- | --- | --- | --- |
| 01 | Beats | Words | The current homepage intro — three flat fields, disc wipes |
| 02 | Eclipse | None | Amber sun and ink moon converge, corona flares, light floods out |
| 03 | Eclipse Transit | Numerals | The moon crosses the full frame over a loading count, flipping it to amber |
| 04 | Big Bang | None | Core pulses, rays fire, planets travel out then collapse back |
| 05 | Counter | Numerals | 0→100 count with the colour field flipping underneath |
| 06 | Slats | Words | Six columns sweep down then up, the name lands in the gap |
| 07 | Orbit Lock | None | Rings draw themselves, planets snap on, the system flies past |

**03 Eclipse Transit** is the one worth understanding. The counter is drawn
twice — a dark layer on the amber field and a light layer clipped to
`circle(27cqmin at X 50%)`. The clip and the moon's `translateX` use the same
two numbers (`-28%` / `128%`) and both run `linear`, so they can't drift apart
at any duration or viewport. The count shares the transit's exact time window,
also linear, so it reads **50 at the instant of totality**.

Every variant lives inside a `.stage`, which is a **size container**. All
dimensions are percentages or `cq` units, so the identical markup plays at card
size and full screen with nothing to change. The counter uses `@property` with
an `<integer>` syntax so the count is pure CSS — no JS ticking a number.

Files: `intro-lab.html`, `css/intro-lab.css`, `js/intro-lab.js`. All three are
self-contained — delete them once a direction is picked and nothing else breaks.

## Scroll-linked shapes

The hero planets keep working as you scroll. A single rAF-throttled handler
writes two custom properties on the orbit field — `--sy` (raw scroll) and
`--sp` (0→1 through the hero) — and each orb scales them with its own
personality:

```html
--driftX / --driftY   how far and which way it travels
--grow                how much it swells (0.55 → 2.4)
--spin                how far it rotates (-40deg → 90deg)
--morph               circle → squircle (30% → 42%)
```

Because the entrance keyframe references those properties, one
forwards-filling animation keeps responding to scroll — no need to fight the
animation for control of `transform`. The CTA discs morph on their own
`--cp` progress as the section arrives.

## The universe menu is navigable from both ends

The four keyed planets are `<a>` elements, not decoration:

- Hovering a **menu item** lights its planet and dims the rest of the system.
- Hovering a **planet** lights it, shows a mono label, and flips its menu item
  to the per-letter colour wave while the other items drop to 40%.
- **Clicking a planet** navigates to that page, through the warp transition.

Both directions call the same `focusKey()` / `clearKey()` pair, so the two
entry points can't drift out of sync. The planets carry `tabindex="-1"` and
`aria-hidden` — they duplicate the menu links, so they shouldn't be second tab
stops.

One thing that needed fixing: `.universe-inner` spans the whole overlay, so it
was an invisible shield over every planet. It's now `pointer-events: none`,
with only `.u-link`, `.u-mail` and `.u-social a` opting back in. The first
attempt gave the whole `.u-meta` strip pointer events, which still blocked the
lower planets — worth knowing if more content lands in the overlay later.

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

## Content

Copy across the homepage and About page now reflects AI and full-stack
engineering rather than the 2017–21 design era:

- **Hero** — "AI engineer building agent systems, evaluation pipelines, and
  the full-stack products that wrap around them." Role strip reads
  *AI Engineer · Full-Stack · South West England*.
- **Section 02** — "Demos are easy. Production isn't." on the evaluation /
  pipeline / interface chain.
- **Capabilities** — AI engineering, Full-stack product, Platform & developer
  experience. Each ends on a mono stack line instead of a case-study link,
  since none of the existing case studies match these.
- **About** — five years at CapPlan (three in AI, recently promoted onto
  full-stack), freelance alongside throughout, and the PHP → UX/UI → AI arc
  that frames the older case studies as history rather than as the offer.
  Adds a Toolkit chip row.
- **CTA** — freelance and *founding* opportunities, now pointing at the
  contact page rather than a bare mailto.

### Contact page (new)

Matches the Orbit language: orbit field, kinetic heading, sticky aside with
an availability pill, direct email, response time and socials.

Inputs follow the Stitch spec — surface fill, bottom-only 2px rule, JetBrains
Mono label that lifts and shrinks on focus, border animating to periwinkle.
The topic picker is radio buttons styled as chips.

**The form needs an endpoint before it works.** GitHub Pages can't process a
POST, so `action` is set to `https://formspree.io/f/YOUR_FORM_ID` — create a
free Formspree form and paste the real ID in. Until then the JS intercepts
submission and tells the visitor to email directly rather than silently
swallowing the message. With JS off it degrades to a normal form POST.

## Structure

```
index.html  about.html  work.html  contact.html
css/stylesheet.css      (rewritten — 1,278 lines)
js/script.js            (rewritten — 334 lines, no dependencies)
portfolio/*.html        (8 pages regenerated; copy untouched)
images/                 (untouched)
```

## Bugs fixed along the way

The scroll-reveal observer used `threshold: 0.15`. Project screenshots run to
5,800px tall — taller than six viewports — so 15% of them could never be
visible at once and **they never revealed**. Now `threshold: 0` with a
`-12%` bottom root margin, which works at any element height.

The contact form's visually-hidden radio inputs were `position: absolute`
with no containing block, so all three stacked in one spot and intercepted
clicks aimed at other elements. They're now clipped and `pointer-events: none`
— the labels do the toggling, and keyboard focus still reaches them.

Skipping the intro early left a blank page: `main`'s entrance is delayed to
3.35s to sync with the intro clearing, so a skip at 0.5s meant staring at
nothing for three seconds. Finishing now drops the delay and restarts the
animation through `getAnimations()`, so the hero rises properly whenever the
intro ends.

## Still outstanding

- **The Work page is the weak link.** All eight case studies are 2017–21
  design work. The copy now frames that as history, but one recent AI or
  full-stack case study would do more for positioning than any amount of
  wording.
- **Check these three** — they came through a voice note and I guessed:
  CapPlan's spelling, "Claude Code" (heard as "floor code"), and *founding*
  opportunities (heard as "found"). Also verify "Microsoft Agent Framework"
  is the name you want on the Azure agent work.
- Somerset Bees and Zero Limitations still have no project screenshots.
- `bin-sensor`, `rpcs3` and `strength-analysed` remain unbuilt stubs. The
  `rpcs3-*.png` images are sitting unused in `images/` if you want to revive
  that one.
- `codewest.png`, `freedom-leisure-logo.jpeg` and `portrait.jpg` are also
  unreferenced — Freedom Leisure could join the client marquee.

## Deploying

Replace the repo contents with this folder and push. GitHub Pages needs
nothing else — no build step, no npm dependencies.
