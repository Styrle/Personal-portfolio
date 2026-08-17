# Blog, Playground & intro speed — August 2026

Fourth pass. Everything in this document is **already applied** to the files in
this archive — it's a record of what changed and why, not a to-do list. Same
constraints as the rest of the site: no frameworks, no build step, no
dependencies beyond Google Fonts and Formspree.

---

## What's new

```
blog.html                       index: filters, featured post, chronological list
blog/agent-scoreboard.html      one full post, also the template for the next one
playground.html                 live pens, as the second half of Work
css/blog.css                    list, filters, article prose, reading progress
css/playground.css              pen grid, previews, split-pane editor
js/blog.js                      tag filter, reading progress, contents
js/pens.js                      the pens themselves — the file you'll edit most
js/playground.js                grid, sandboxed previews, editor
```

## What changed in existing files

| File | Change |
| --- | --- |
| `css/stylesheet.css` | `--intro-speed` knob + every intro duration scaled by it; `.section-tabs` / `.tab-count` appended |
| `js/script.js` | `RUN` and the `is-gone` timeout now read `--intro-speed` |
| `work.html` | tab strip above the work list |
| 13 pages | `Writing` added to `.nav-links` and `.footer-links` |
| 12 pages | universe menu: a fifth keyed planet and a fifth menu item |

Untouched: `portfolio/bin-sensor.html`, `portfolio/rpcs3.html` (empty) and
`portfolio/strength-analysed.html`. They're 2021 leftovers with no modern nav,
so the scripted edits skipped them. Worth deleting or rebuilding at some point.

---

## 1. Intro speed — halved

The intro is **Orbit Lock**, not the three-beat version, so the numbers here
are different from the ones I first quoted. One continuous 4.6s run plus a 0.9s
clear, which is why it dragged.

Rather than editing a dozen durations, every one is now the original multiplied
by a single property:

```css
:root { --intro-speed: 0.5; }   /* 1 = the original 5.5s · 0.5 = 2.75s */
```

`js/script.js` reads the same property for `RUN`, which is the part that
actually matters — the old `RUN = 4600` carried a comment saying it must match
the CSS, and a hard-coded constant next to a hand-edited stylesheet is exactly
the pair that drifts. Now it can't:

```js
var introSpeed = parseFloat(
  getComputedStyle(document.documentElement).getPropertyValue("--intro-speed")
) || 1;
var RUN = Math.round(4600 * introSpeed);
```

| | Before | After |
| --- | --- | --- |
| System run | 4,600ms | 2,300ms |
| Clip-path clear | 900ms | 450ms |
| **Total to usable page** | **~5.5s** | **~2.75s** |
| `main` entrance delay | 4.5s | 2.25s |

Verified in a headless browser: `--intro-speed` resolves to `0.5`, the
`introSystem` animation reports a 2,300ms duration, and `.intro` has `is-gone`
before 3.1s.

The ring and orb `--d` delays stay inline in `index.html` — the CSS scales them
with `calc(var(--d, 0s) * var(--intro-speed))`, so that markup never needs
touching.

Tune the one number if 2.75s still feels long. Below about `0.35` the wipe
starts before the last orbs have snapped on and it reads as a glitch rather
than a sequence.

**The intro lab is deliberately unchanged.** Its job is comparing candidates at
their natural pace; halving one variant would make the comparison misleading.
Variant 06 is the shipped intro, now tuned separately from its preview.

---

## 2. Blog

### Adding a post

1. Copy `blog/agent-scoreboard.html` to `blog/your-slug.html`.
2. Replace the article body, `<h1>`, byline, eyebrow, `<title>` and meta description.
3. Rebuild the `.toc` list — one `<li>` per `<h2>`, `href` matching the heading's
   `id`. Headings without an `id` just don't appear; nothing breaks.
4. In `blog.html`, copy one `<li>` in `.post-list` and change the date, title,
   href, dek, read time and `data-tags`.
5. If it's the newest, update the `.post-feature` block too — it's a separate
   element with its own `data-tags`.

`data-tags` must match a `data-filter` on a toolbar chip. Current set:
`ai-engineering`, `platform`, `craft`, `process`. Add a chip to the toolbar and
the JS picks it up with no changes.

### Design decisions worth knowing

**The date is the structural device, not a number.** Work rows are numbered
because a curated selection has an order you chose; posts are chronological, so
the date carries the information and gets the amber hover. Post rows also drop
the full indigo wipe, so the two lists never read as the same component.

**The post count comes from list rows only.** The featured post also appears in
the list, so counting every `[data-tags]` element reported six posts for five.

**Filters are shareable.** `blog.html#platform` opens pre-filtered, and a
`hashchange` listener re-applies without a reload — otherwise a shared link
would land on whatever was already showing.

### The progress bar conflict

The site already had `.hud-bar`: a fixed 2px indigo→amber rule at the top,
driven by `--p` from document scroll. My `.read-bar` was a near-duplicate at the
same position, height and z-index, so the article page rendered two stacked
bars.

Post pages now **drop `.hud-bar` and use `.read-bar` instead**, with the
gradient matched so it reads as the same component. The difference is what it
measures: `.hud-bar` tracks the whole document, `.read-bar` tracks the article,
so the footer and CTA don't count as unread. Only ever one renders.

---

## 3. Playground

### Adding a pen

One object in `js/pens.js`:

```js
{
  slug: "your-slug",          // unique, url-safe — drives playground.html#your-slug
  title: "Your pen",
  blurb: "One line on what it does.",
  tags: ["css", "motion"],    // the filter row builds itself from these
  html: "...", css: "...", js: "..."
}
```

Source is written as arrays joined with `\n` to stay readable in the file.
**Avoid backticks inside pen source** — the surrounding strings are template
literals.

Pens get the palette injected, so `var(--amber)`, `var(--indigo-lift)`,
`var(--surface)` and `var(--mono)` all work inside a frame, along with Hanken
Grotesk and JetBrains Mono.

### How it runs

Every pen is an iframe with `sandbox="allow-scripts"` and **no**
`allow-same-origin`, so it executes but can't reach the page, its storage or
its cookies. That's the whole reason arbitrary editing is safe to offer.

Cards lay out at 900×563 and scale down, so you get a true miniature rather than
a squashed mobile view — `--fit` is set per card by a `ResizeObserver`. If you
change `.pen-frame`'s width, change `FRAME_W` in `playground.js` to match.

Previews build lazily on scroll. Under `prefers-reduced-motion` nothing
autoplays; every card waits on its Run button.

Editor: typing re-runs 500ms after you stop, Tab indents rather than escaping
the field, Esc closes, Reset restores the original, Full screen uses the native
API. Edits live in memory for the visit and are pushed back to the card on
close. Nothing persists, which the editor bar says out loud.

### The cursor handover

The site hides the real cursor and draws its own, but mousemove doesn't cross
into a sandboxed iframe. The custom dot froze at the frame's edge while the
real pointer stayed hidden by the inherited `cursor: none` — so a pen had no
visible pointer at all. Fatal for Goo pointer, which is entirely about pointer
position.

Frames now get the real cursor back and the custom one steps aside, driven by
`mouseenter`/`mouseleave` on the iframe element (those fire in the parent even
though moves inside it don't).

### Why it's a page, not a JS tab

You suggested a sub-tab within Work, which it is visually — but as two pages
sharing a tab strip rather than one page toggling panels. Each half keeps its
own URL, `<title>`, back-button behaviour and deep links, and neither needs JS
to be reachable. The strip is the only thing that has to stay in sync.

The `08` and `04` counts in `work.html` are hand-written — bump them when you
add a case study or a pen. The playground's own count updates itself from
`js/pens.js`.

---

## 4. The universe menu

Writing needed a keyed planet, so the small amber decorative one at
`--x:8vw; --y:34vh` became it: 52px, amethyst, an `<a>` with a label. Its
`--d` moved from `.48s` to `.34s` and Contact shifted `.36s` → `.38s`, so the
reveal still runs outward from the core. The menu list gained a fifth item and
Contact moved to `--i:4`.

Given that converting a `<span>` planet to an `<a>` broke position corrections
last time, this was applied by script across all 12 pages rather than by hand,
and the highlight pairing was left alone — it queries `.planet[data-planet]`,
which doesn't care about the tag. Still worth opening the menu once and
confirming the new planet sits where you expect.

---

## 5. QA

Headless Chromium against the real stylesheet and scripts, 1440px and 390px,
no console or page errors beyond the sandbox blocking Google Fonts.

- Intro: `--intro-speed` resolves, animation duration halved, cleared by 3.1s.
- Blog: reveals fire on scroll, counts correct across all five filter states,
  feature hides with its tag, deep links and `hashchange` both apply.
- Article: one progress bar, tracking the article; contents highlight follows a
  full scroll.
- Playground: four pens build and run, editor live-edits, cursor hands over on
  frame enter and returns on leave.
- Work: tab strip renders with the existing hero and list.

### Still unverified

- Formspree is still on the placeholder ID.
- Real-device touch: the editor is usable at 390px but two stacked panes on a
  small screen is tight, and I've only checked it in an emulated viewport.
- `.gitignore` in this repo is the stock 6KB Node one from 2021 and doesn't
  reflect a no-build site; unchanged, but worth a look.
