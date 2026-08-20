/**
 * HTML step of the performance loop. Idempotent - safe to re-run each pass.
 *
 *  1. Fonts: drop the render-blocking third-party Google Fonts request (and
 *     the interim css/fonts.css, now inlined into stylesheet.css) and preload
 *     the two faces first paint actually needs.
 *  2. Images: point <img> at the .webp built by optimize-images.mjs, when one
 *     exists and actually beat the original.
 *  3. Hints: loading/decoding plus intrinsic width/height. The CSS reset is
 *     `max-width:100%; height:auto`, so the attributes supply an aspect ratio
 *     without taking over layout.
 *  4. Scripts: defer. They sit at the end of <body> and none of them wait on
 *     DOMContentLoaded, so deferring only moves execution later, never earlier.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require_ = createRequire(path.join(process.env.LH_HARNESS_DIR, "package.json"));
const sharp = (await import(pathToFileURL(require_.resolve("sharp")).href)).default;

const PAGES = JSON.parse(fs.readFileSync("perf/pages.json", "utf8"));
const PRELOAD = [
  "fonts/bricolage-grotesque-200-800-latin.woff2",
  "fonts/hanken-grotesk-400-latin.woff2",
];

const dims = new Map();
const dimsOf = async (rel) => {
  if (!dims.has(rel)) {
    try { const m = await sharp(rel).metadata(); dims.set(rel, { w: m.width, h: m.height }); }
    catch { dims.set(rel, null); }
  }
  return dims.get(rel);
};

const stats = { fonts: 0, webp: 0, hints: 0, dims: 0, defer: 0 };

for (const page of PAGES) {
  let html = fs.readFileSync(page, "utf8");
  const P = "../".repeat(page.split("/").length - 1);
  const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
  const NL = html.includes(CR + LF) ? CR + LF : LF;

  // 1. fonts ---------------------------------------------------------------
  const lines = html.split(NL);
  /* Existing font preloads count as replaceable, otherwise re-running the
     loop stacks a fresh copy on top of the previous pass. */
  const dead = (l) =>
    (l.includes('rel="preconnect"') && l.includes("fonts.g")) ||
    l.includes('href="https://fonts.googleapis.com/css2?') ||
    /href="(\.\.\/)*css\/fonts\.css"/.test(l) ||
    (l.includes('rel="preload"') && l.includes('as="font"'));
  const hasPreload = false;
  if (lines.some(dead) || !hasPreload) {
    const repl = PRELOAD.map(
      (f) => `  <link rel="preload" href="${P}${f}" as="font" type="font/woff2" crossorigin>`);
    const out = [];
    let inserted = false;
    for (const l of lines) {
      if (dead(l)) {
        if (!inserted) { out.push(...repl); inserted = true; }
        continue;
      }
      /* no font links at all (already cleaned): anchor the preloads above the
         main stylesheet so they start early */
      if (!inserted && !hasPreload && /href="(\.\.\/)*css\/stylesheet\.css"/.test(l)) {
        out.push(...repl); inserted = true;
      }
      out.push(l);
    }
    html = out.join(NL);
    if (inserted) stats.fonts++;
  }

  // 2 + 3. images ----------------------------------------------------------
  for (const tag of new Set([...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]))) {
    const srcMatch = tag.match(/src="((?:\.\.\/)*images\/([^"]+))"/);
    if (!srcMatch) continue;
    let next = tag;
    let [, fullSrc, file] = srcMatch;

    if (/\.(png|jpe?g)$/i.test(file)) {
      const webpRel = path.join("images", file.replace(/\.(png|jpe?g)$/i, ".webp"));
      if (fs.existsSync(webpRel)) {
        const newSrc = fullSrc.replace(/[^/]+$/, path.basename(webpRel));
        next = next.replace(`src="${fullSrc}"`, `src="${newSrc}"`);
        fullSrc = newSrc; file = path.basename(webpRel);
        stats.webp++;
      }
    }

    /* the about portrait is the one image that can be the LCP element, so it
       is fetched eagerly instead of deferred */
    const isHeroPhoto = /portrait/i.test(file);
    if (!/\bloading=/.test(next) && !/fetchpriority=/.test(next)) {
      next = next.replace(/\s*\/?>$/, isHeroPhoto
        ? ' decoding="async" fetchpriority="high">'
        : ' loading="lazy" decoding="async">');
      stats.hints++;
    }
    if (!/\bdecoding=/.test(next)) {
      next = next.replace(/\s*\/?>$/, ' decoding="async">');
    }
    /* refreshed every pass, not just when absent: re-encoding an image at a
       new cap would otherwise leave stale numbers in the markup */
    const d = await dimsOf(path.join("images", file));
    if (d) {
      next = /\bwidth=/.test(next)
        ? next.replace(/\swidth="\d+"\sheight="\d+"/, ` width="${d.w}" height="${d.h}"`)
        : next.replace(/<img\b/, `<img width="${d.w}" height="${d.h}"`);
      stats.dims++;
    }
    if (next !== tag) html = html.split(tag).join(next);
  }

  // 4. scripts -------------------------------------------------------------
  html = html.replace(/<script\s+src="([^"]+)"\s*>/g, (m, src) => {
    stats.defer++;
    return `<script src="${src}" defer>`;
  });

  fs.writeFileSync(page, html);
}

console.log(`fonts: ${stats.fonts} pages | webp swaps: ${stats.webp} | hints: ${stats.hints}` +
  ` | dims: ${stats.dims} | deferred scripts: ${stats.defer}`);
