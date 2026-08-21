/**
 * Assembles the deployable site into dist/.
 *
 * Cloudflare publishes an entire assets directory, so pointing it at the repo
 * root would put .git, the perf harness and the working notes on the edge.
 * This copies an explicit allowlist instead: anything not named here is not
 * published, which makes the public surface a decision rather than an oversight.
 */
import fs from "node:fs";
import path from "node:path";

const OUT = "dist";

/* Directories ship whole; the pages are listed by extension at the root. */
const DIRS = ["css", "js", "fonts", "images", "blog", "portfolio"];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const pages = fs.readdirSync(".").filter((f) => f.endsWith(".html"));
for (const page of pages) fs.copyFileSync(page, path.join(OUT, page));

for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue;
  fs.cpSync(dir, path.join(OUT, dir), { recursive: true });
}

const count = (d) =>
  fs.readdirSync(d, { withFileTypes: true })
    .reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);

console.log(`built ${OUT}/: ${pages.length} pages, ${count(OUT)} files total`);
