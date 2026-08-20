/**
 * Image optimisation step of the performance loop.
 *
 * Emits a .webp next to every raster source, capped at the width the layout
 * actually uses. Idempotent: skips a target that is newer than its source, so
 * re-running inside the loop is cheap.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const HARNESS = process.env.LH_HARNESS_DIR;
const require_ = createRequire(path.join(HARNESS, "package.json"));
const sharp = (await import(pathToFileURL(require_.resolve("sharp")).href)).default;

/* Caps come from the CSS: social icons render at 16-17px, marquee logos at
   54px high, everything else is content imagery in a max ~1100px column.
   3x of the display size is the ceiling worth storing. */
const CAPS = [
  [/^(twitter|github|codepen|spotify)\.png$/i, 64],
  [/(logo|codewest|rpcs3-1)/i, 256],
  [/^portrait/i, 1200],
  [/.*/, 1600],
];
const capFor = (f) => CAPS.find(([re]) => re.test(f))[1];

const dir = "images";
let saved = 0, before = 0, after = 0, n = 0;
for (const f of fs.readdirSync(dir).sort()) {
  if (!/\.(png|jpe?g)$/i.test(f)) continue;
  const src = path.join(dir, f);
  const out = path.join(dir, f.replace(/\.(png|jpe?g)$/i, ".webp"));
  const srcStat = fs.statSync(src);
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= srcStat.mtimeMs) {
    before += srcStat.size; after += fs.statSync(out).size; n++;
    continue;
  }
  const meta = await sharp(src).metadata();
  let cap = capFor(f);
  /* Long scroll-capture screenshots carry far more pixels than the gallery
     ever shows. Detail matters less on these than total weight, so they get
     a tighter cap than ordinary imagery. */
  if (meta.height / meta.width >= 3) cap = Math.min(cap, 1200);
  const pipeline = sharp(src);
  if (meta.width > cap) pipeline.resize({ width: cap, withoutEnlargement: true });
  await pipeline.webp({ quality: 82, effort: 6 }).toFile(out);
  let outSize = fs.statSync(out).size;
  /* WebP loses to PNG on flat//small graphics. Drop the output when it is not
     actually smaller so the rewriter keeps pointing at the better original. */
  if (outSize >= srcStat.size) {
    fs.unlinkSync(out);
    console.log(`${f.padEnd(30)} kept original (webp was larger)`);
    before += srcStat.size; after += srcStat.size; n++;
    continue;
  }
  before += srcStat.size; after += outSize; n++;
  saved += srcStat.size - outSize;
  console.log(
    `${f.padEnd(30)} ${String(meta.width).padStart(5)}px ${(srcStat.size / 1024).toFixed(0).padStart(6)}KB` +
    ` -> ${String(Math.min(meta.width, cap)).padStart(5)}px ${(outSize / 1024).toFixed(0).padStart(6)}KB`
  );
}
console.log(`\n${n} images: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB` +
  ` (${(100 * (before - after) / before).toFixed(1)}% smaller)`);
