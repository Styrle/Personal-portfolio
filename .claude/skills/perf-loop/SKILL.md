---
name: perf-loop
description: Run a closed measure-fix-remeasure performance loop over a website using Lighthouse. Use when the user asks to run performance tests, profile or speed up a site, improve Lighthouse/Core Web Vitals scores, fix LCP/CLS/TBT, or asks "why is the site slow". Also use when asked to re-run the loop or verify a performance change did not regress.
---

# Performance loop

A closed loop: **measure -> diagnose -> fix one thing -> re-measure -> accept or revert.**
The loop's value is not the fixes, it is refusing to accept a fix the numbers
do not support.

## Rules that make the loop trustworthy

1. **Never optimise before the harness is honest.** A harness that misrepresents
   production invents work. Check compression, caching and protocol against the
   real host *before* the baseline. A local server without gzip will report
   ~44 KB/page of phantom "enable text compression" savings.
2. **Establish the noise floor before believing any delta.** Run the suite
   twice with no code change. Anything smaller than that spread is not a
   result. Do not measure noise by looping one page inside one process — that
   holds machine state constant and reports near-zero variance. Use two full,
   separate runs.
3. **One lever per iteration.** Bundled changes cannot be attributed, and a
   regression inside a bundle cannot be isolated.
4. **Diagnose before fixing.** Read `render-blocking-resources`, the LCP
   element, and per-audit `overallSavingsMs`. Savings measured in bytes with
   `0ms` attached will not move the score — worth doing for real users on
   metered data, but do not expect a score change.
5. **Exclude meaningless pages, and say so.** Empty or stub pages score 0 or
   100 for reasons unrelated to performance and distort the average. Document
   exclusions rather than silently dropping them.
6. **A rejected fix is a result.** Record what you tried and why the data
   rejected it, so nobody re-litigates it later.
7. **Verify the site still works.** Byte savings that break rendering are not
   savings. Load a page, check the console, confirm images resolve and fonts
   load.

## Procedure

### 1. Survey
Inventory pages and assets. Look for: total image weight and format, image
intrinsic size vs display size, render-blocking `<link>`/`<script>`, third-party
origins in `<head>`, and empty/stub pages.

### 2. Match the harness to production
Identify the real host and mirror its behaviour (gzip/brotli, cache headers).
`perf/serve.mjs` in this repo mirrors GitHub Pages.

### 3. Baseline
Run every page under one fixed profile (mobile + simulated throttling). Store
per-page score, FCP, LCP, TBT, CLS and byte weight as JSON so runs diff
mechanically.

### 4. Noise floor
Run the baseline twice. Record the max per-page swing and the site-average
swing. These are your significance thresholds for the rest of the loop.

### 5. Iterate
Rank levers by measured `overallSavingsMs`, not by convention. Apply one,
re-measure, then **compare against the noise floor** before accepting.
Regressions get diagnosed, not averaged away.

### 6. Report
State the delta, what was rejected and why, what is left, and what the
remaining work would cost.

## Tooling in this repo

```bash
# one-time: install the harness deps somewhere outside the repo
mkdir -p /tmp/lh-harness && cd /tmp/lh-harness
echo '{"name":"lh-harness","private":true}' > package.json
npm i lighthouse chrome-launcher sharp

export LH_HARNESS_DIR=/tmp/lh-harness
node perf/serve.mjs &                      # production-like static server

node perf/lighthouse-loop.mjs baseline     # measure all pages -> perf/reports/
node perf/optimize-images.mjs              # webp + cap to displayed size
node perf/selfhost-fonts.mjs               # inline @font-face, drop 3rd party
node perf/rewrite-html.mjs                 # webp refs, lazy/dims, defer scripts
node perf/lighthouse-loop.mjs after
node perf/compare.mjs baseline after       # verdict table
```

All fix scripts are idempotent — safe to re-run each pass.

## Levers, in the order they usually pay

| Lever | Typically worth | Watch out for |
|---|---|---|
| Third-party font CSS in `<head>` | 500-800 ms on every page | Self-host only the subsets the site's `lang` needs |
| Oversized/legacy images | Most of total byte weight | WebP loses to PNG on small flat graphics — keep whichever is smaller |
| Render-blocking `<script>` | 300-450 ms | `defer` delays JS-gated reveal animations, which can push LCP *later* |
| Extra CSS request | ~150 ms | Inline generated `@font-face` into an existing sheet instead |
| Minifying CSS | Usually ~0 once gzip is on | Costs source readability for a couple of KB |
| Inlining all CSS | Often 0 | Removes render-blocking but adds TBT and loses cross-page caching |

## Known trap: JS-gated reveal animations

`opacity: 0` until an IntersectionObserver adds a class means **the LCP element
cannot paint until the script runs**. Deferring the script makes this worse. The
honest framing: an entrance animation on above-the-fold content and a fast LCP
are mutually exclusive. Quantify the cost, then let the owner decide — do not
silently delete someone's designed animation.
