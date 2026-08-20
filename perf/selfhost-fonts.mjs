/**
 * Replaces the render-blocking third-party Google Fonts request with a
 * self-hosted bundle. The fonts.googleapis.com stylesheet costs a DNS lookup,
 * TLS handshake and round trip before a single glyph is requested, and it
 * blocks first paint on every page.
 *
 * Only the latin and latin-ext subsets are kept — the site is lang="en", and
 * unicode-range means a browser downloads only the subsets it actually needs.
 */
import fs from "node:fs";
import path from "node:path";

const CSS_URL = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Hanken+Grotesk:wght@300;400;600;700&family=JetBrains+Mono:wght@500&display=swap";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const KEEP = new Set(["latin", "latin-ext"]);

const css = await (await fetch(CSS_URL, { headers: { "User-Agent": UA } })).text();

/* Each face is preceded by a /* subset *​/ comment naming its unicode range. */
const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)];
const kept = blocks.filter(([, subset]) => KEEP.has(subset));
console.log(`${blocks.length} faces upstream -> keeping ${kept.length} (${[...KEEP].join(", ")})`);

let out = "";
let total = 0;
for (const [, subset, face] of kept) {
  const url = face.match(/url\((https:\/\/[^)]+\.woff2)\)/)[1];
  const family = face.match(/font-family:\s*'([^']+)'/)[1];
  const weight = face.match(/font-weight:\s*([^;]+);/)[1].trim().replace(/\s+/g, "-");
  const file = `${family.toLowerCase().replace(/\s+/g, "-")}-${weight}-${subset}.woff2`;
  const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
  fs.writeFileSync(path.join("fonts", file), buf);
  total += buf.length;
  console.log(`  ${file.padEnd(46)} ${(buf.length / 1024).toFixed(1).padStart(6)} KB`);
  out += face.replace(/url\(https:\/\/[^)]+\.woff2\)/, `url(../fonts/${file})`) + "\n";
}
/* Injected into stylesheet.css rather than shipped as a second file. Every
   page already loads stylesheet.css, so a separate fonts.css costs one more
   render-blocking round trip for ~2 KB of @font-face rules. The sentinels keep
   this idempotent across loop iterations. */
const OPEN = "/* === generated fonts: start === */";
const CLOSE = "/* === generated fonts: end === */";
const sheetPath = "css/stylesheet.css";
const esc = (t) => t.replace(/[.*+?^${}()|[\]\/]/g, "\$&");
let sheet = fs.readFileSync(sheetPath, "utf8");
const block = OPEN + "\n" + out + CLOSE + "\n";
sheet = sheet.includes(OPEN)
  ? sheet.replace(new RegExp(esc(OPEN) + "[\s\S]*?" + esc(CLOSE) + "\r?\n"), block)
  : block + sheet;
fs.writeFileSync(sheetPath, sheet);
if (fs.existsSync("css/fonts.css")) fs.unlinkSync("css/fonts.css");
console.log("\ninlined " + kept.length + " faces into " + sheetPath +
  " - " + (total / 1024).toFixed(1) + " KB of woff2 on disk");
