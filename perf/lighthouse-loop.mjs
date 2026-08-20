/**
 * Lighthouse loop harness.
 *
 * Measures every page of the static site under identical conditions so that
 * two runs are comparable. Emits one JSON snapshot per run plus a markdown
 * table, so a "before" and "after" run can be diffed mechanically rather than
 * by eyeballing scores.
 *
 * Usage: node perf/lighthouse-loop.mjs <label> [--pages a.html,b.html]
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const HARNESS = process.env.LH_HARNESS_DIR;
if (!HARNESS) {
  console.error("Set LH_HARNESS_DIR to a dir with `npm i lighthouse chrome-launcher`.");
  process.exit(1);
}
const require_ = createRequire(path.join(HARNESS, "package.json"));
/* resolve from the harness install, then convert to a file:// URL so the
   dynamic import works on Windows as well as POSIX */
const load = (m) => import(pathToFileURL(require_.resolve(m)).href);
const lighthouse = (await load("lighthouse")).default;
const chromeLauncher = await load("chrome-launcher");

const ORIGIN = process.env.LH_ORIGIN || "http://127.0.0.1:8080";
const label = process.argv[2] || "run";
const pagesArg = process.argv.indexOf("--pages");
const PAGES = pagesArg > -1
  ? process.argv[pagesArg + 1].split(",")
  : JSON.parse(fs.readFileSync("perf/pages.json", "utf8"));

/* Mobile throttling is the default Lighthouse profile and the one that
   surfaces asset-weight problems; desktop hides them behind fast CPU. */
const CONFIG = {
  logLevel: "error",
  output: "json",
  onlyCategories: ["performance"],
  formFactor: "mobile",
  screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
  throttlingMethod: "simulate",
};

const chrome = await chromeLauncher.launch({
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

const results = [];
for (const page of PAGES) {
  const url = `${ORIGIN}/${page}`;
  process.stderr.write(`  ${page} ... `);
  try {
    const { lhr } = await lighthouse(url, { ...CONFIG, port: chrome.port });
    const a = lhr.audits;
    const row = {
      page,
      score: Math.round((lhr.categories.performance.score ?? 0) * 100),
      fcp: a["first-contentful-paint"]?.numericValue ?? null,
      lcp: a["largest-contentful-paint"]?.numericValue ?? null,
      tbt: a["total-blocking-time"]?.numericValue ?? null,
      cls: a["cumulative-layout-shift"]?.numericValue ?? null,
      si: a["speed-index"]?.numericValue ?? null,
      bytes: a["total-byte-weight"]?.numericValue ?? null,
      /* the specific opportunities we intend to act on */
      opps: Object.fromEntries(
        ["modern-image-formats", "uses-optimized-images", "uses-responsive-images",
         "unminified-css", "unused-css-rules", "render-blocking-resources",
         "efficient-animated-content", "uses-text-compression"]
          .map((k) => [k, Math.round(a[k]?.details?.overallSavingsBytes ?? 0)])
          .filter(([, v]) => v > 0)
      ),
    };
    results.push(row);
    process.stderr.write(`${row.score} (LCP ${(row.lcp / 1000).toFixed(1)}s)\n`);
  } catch (err) {
    process.stderr.write(`FAILED: ${err.message}\n`);
    results.push({ page, score: null, error: String(err.message) });
  }
}
await chrome.kill();

const ok = results.filter((r) => r.score !== null);
const mean = (f) => ok.length ? ok.reduce((s, r) => s + f(r), 0) / ok.length : 0;
const summary = {
  label,
  pages: results.length,
  measured: ok.length,
  avgScore: +mean((r) => r.score).toFixed(1),
  avgLcp: Math.round(mean((r) => r.lcp)),
  avgTbt: Math.round(mean((r) => r.tbt)),
  avgCls: +mean((r) => r.cls).toFixed(3),
  totalBytes: ok.reduce((s, r) => s + (r.bytes || 0), 0),
  results,
};

const out = path.join("perf/reports", `${label}.json`);
fs.writeFileSync(out, JSON.stringify(summary, null, 2));
console.log(`\n${label}: avg score ${summary.avgScore} | avg LCP ${(summary.avgLcp / 1000).toFixed(2)}s | avg CLS ${summary.avgCls} | ${(summary.totalBytes / 1048576).toFixed(1)} MB total`);
console.log(`wrote ${out}`);
