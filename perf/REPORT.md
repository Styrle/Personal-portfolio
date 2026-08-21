# Performance loop — run report

Closed loop over the whole site: measure -> diagnose -> fix -> re-measure.
Harness: Lighthouse 12, mobile profile, simulated throttling, served from a
local gzip server that mirrors GitHub Pages. 16 pages measured.

## Result

| Metric | Before | After | Change |
|---|---|---|---|
| Avg performance score | 92.5 | **96.8 – 97.1** | **+4.3 to +4.6** |
| Avg LCP | 3.06 s | **2.44 – 2.51 s** | **−0.55 s** |
| Total transfer, all pages | 21.4 MB | **5.8 MB** | **−72.9%** |
| Raster image payload | 19.8 MB | **2.8 MB** | **−86%** |
| CLS | 0.001 | 0.001 | unchanged |
| Pages improved | — | 15 of 16 | 1 regressed by 1 pt |

Worst page went from 87 to 94. No page is now below 94.

## What actually moved the needle

1. **Self-hosting fonts (biggest single win).** The `fonts.googleapis.com`
   stylesheet was render-blocking on all 16 pages at **793 ms** — a DNS lookup,
   TLS handshake and round trip before a glyph was requested. Now 12 latin /
   latin-ext faces are served from `fonts/` with `@font-face` inlined into
   `stylesheet.css`. Two faces are preloaded.
2. **Images: 19.8 MB -> 2.8 MB.** 38 PNGs held photographic screenshots.
   Converted to WebP and capped to the width the layout actually uses. Long
   scroll-captures (one was 1440x7000 at 6.4 MB) get a tighter cap.
3. **Deferred 21 scripts** and removed a redundant CSS request.
4. **Lazy/decoding hints and intrinsic dimensions** on 100 images.

## Fixes the data rejected

The loop's main value was refusing three plausible, conventional "best
practices" that measurement did not support:

| Proposed | Verdict | Evidence |
|---|---|---|
| Minify CSS | **Rejected** | gzip already takes 58 KB -> 14 KB. Minifying saves ~2 KB and costs source readability. |
| Inline all CSS into `<head>` | **Rejected** | Eliminated *all* render-blocking yet the score did not move (97 and 95, unchanged). Added 46 ms TBT, worsened Speed Index, loses cross-page caching. |
| Drop font preloads as redundant | **Rejected** | Cost index 97->94 and bristol 95->94, and tripled CLS (0.001 -> 0.006). |

A fourth finding was rejected as a **harness artifact**: "enable text
compression, 1.23 MB" was produced entirely by `python -m http.server` not
gzipping. GitHub Pages does. Acting on it would have been wasted work.

## Left on the table, deliberately

- **JS-gated reveal animation — worth ~5 points and ~1 s of LCP.** Content uses
  `opacity: 0` until an IntersectionObserver adds `.is-lit`, so the LCP element
  cannot paint until `script.js` runs. Forcing the lit state took
  bristol-kitchens from **95 to 100** and LCP from 2.85 s to 1.81 s. This is a
  design decision, not a bug: an entrance animation on above-the-fold content
  and a fast LCP are mutually exclusive. Flagged, not changed.
- **3 orphan pages** (`portfolio/rpcs3.html` is 0 bytes; `strength-analysed`
  and `bin-sensor` are 2021 stubs with broken links). Nothing links to them.
  See `perf/EXCLUDED.md`.
- **`srcset` for gallery images** would save ~490-695 KB per portfolio page but
  Lighthouse attaches **0 ms** to it — real-user benefit on metered data, no
  score change.
- **`srcset`** remains the one unexercised image lever (see above).

## Decisions taken after the loop closed

- **Reveal animation kept as designed.** The ~5 point / ~1 s gain was declined:
  the entrance animation is the site's signature and worth more than the
  points. The site is therefore at its practical ceiling of ~97 unless that
  changes.
- **Superseded originals deleted.** 33 replaced files plus 3 dead social PNGs
  removed, freeing **19.6 MB**; `images/` went 20 MB -> 2.9 MB. Six originals
  were kept because WebP could not beat them and they are still referenced.
  Verified afterwards: **223 asset references across the 16 live pages, 0
  broken.** (The 8 broken references in the orphan stubs point at
  `portfolio/images/`, a directory that has never existed - pre-existing
  breakage, confirmed against HEAD.)

## How effective was the loop?

**Effective, with two process failures worth naming.**

What worked:

- **Diagnosing before fixing.** The obvious read was "20 MB of images is the
  problem". It was not — LCP sat at ~3.0 s even on a 0.32 MB page. The real
  bottleneck was 1529 ms of render-blocking resources. Fixing images first
  would have looked productive and moved the score very little.
- **Checking harness fidelity before trusting it.** Caught the phantom
  compression finding, and revealed the first baseline (86.4) understated the
  site by 6 points because of no-gzip plus three junk pages in the average.
- **Cheap experiments.** Three fixes were tested and rejected in minutes each.

What went wrong:

- **I measured variance incorrectly, and it misled me.** Looping one page five
  times inside one process reported **sd = 0**, so I treated a 1-point per-page
  change as a real regression and spent an iteration on it. Two full
  back-to-back runs later showed the true floor: **±3 points per page**, ±0.3
  on the site average. The single-process test held machine state constant and
  measured almost nothing.
- **Iteration 2 bundled three changes** (defer, font inlining, image re-cap)
  and returned +0.2 — *inside the noise floor*. That work cannot be attributed
  from this data. Its byte saving (0.4 MB) is real because bytes are
  deterministic; its score claim is not.
- **A wasted full baseline** against the broken harness.
- **Tooling friction.** Several fix scripts were written via shell heredocs,
  which silently ate backslash escapes and produced three broken regexes.

## Do differently next time

1. **Noise floor first — before the baseline.** Two full runs, no code change.
   Everything after is judged against that number. This is the single biggest
   improvement available.
2. **Verify harness fidelity against the real host before measuring anything.**
3. **One lever per iteration**, always. Bundling cost the attribution of a
   whole pass.
4. **Two-tier loop:** a 3-page subset for fast iteration, the full 16-page
   suite only to accept or reject a pass. Full runs dominated wall-clock.
5. **Write tool scripts with a file-writing tool, not shell heredocs.**
6. **Report bytes and milliseconds separately.** Bytes are deterministic and
   always attributable; scores are noisy and need the significance threshold.

## Reproducing

```bash
export LH_HARNESS_DIR=/path/to/harness   # npm i lighthouse chrome-launcher sharp
node perf/serve.mjs &
node perf/lighthouse-loop.mjs before
node perf/optimize-images.mjs && node perf/selfhost-fonts.mjs && node perf/rewrite-html.mjs
node perf/lighthouse-loop.mjs after
node perf/compare.mjs before after
```

All fix scripts are idempotent. The reusable procedure is captured as a skill
in `.claude/skills/perf-loop/SKILL.md`.
