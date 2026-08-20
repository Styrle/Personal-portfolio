/**
 * Closes the loop: diffs two runs and states plainly whether the pass helped.
 * Usage: node perf/compare.mjs baseline iter2
 */
import fs from "node:fs";

const [a, b] = process.argv.slice(2);
const load = (l) => JSON.parse(fs.readFileSync(`perf/reports/${l}.json`, "utf8"));
const A = load(a), B = load(b);
const byPage = new Map(A.results.map((r) => [r.page, r]));

const sign = (n, unit = "", dp = 0) =>
  (n > 0 ? "+" : "") + n.toFixed(dp) + unit;

console.log(`\n## ${a} -> ${b}\n`);
console.log("| page | score | LCP (s) | bytes |");
console.log("|---|---|---|---|");
let win = 0, loss = 0, same = 0;
for (const r of B.results) {
  const p = byPage.get(r.page);
  if (!p || r.score === null || p.score === null) continue;
  const ds = r.score - p.score;
  ds > 0 ? win++ : ds < 0 ? loss++ : same++;
  const mark = ds > 0 ? "up" : ds < 0 ? "DOWN" : "--";
  console.log(
    `| ${r.page} | ${p.score} -> ${r.score} (${sign(ds)}) ${mark} ` +
    `| ${(p.lcp / 1000).toFixed(2)} -> ${(r.lcp / 1000).toFixed(2)} (${sign((r.lcp - p.lcp) / 1000, "s", 2)}) ` +
    `| ${(p.bytes / 1048576).toFixed(2)} -> ${(r.bytes / 1048576).toFixed(2)} MB |`
  );
}
console.log(`\n**avg score** ${A.avgScore} -> ${B.avgScore} (${sign(B.avgScore - A.avgScore, "", 1)})`);
console.log(`**avg LCP**   ${(A.avgLcp / 1000).toFixed(2)}s -> ${(B.avgLcp / 1000).toFixed(2)}s (${sign((B.avgLcp - A.avgLcp) / 1000, "s", 2)})`);
console.log(`**total**     ${(A.totalBytes / 1048576).toFixed(1)} MB -> ${(B.totalBytes / 1048576).toFixed(1)} MB` +
  ` (${sign(-100 * (A.totalBytes - B.totalBytes) / A.totalBytes, "%", 1)})`);
console.log(`**pages**     ${win} improved, ${same} unchanged, ${loss} regressed`);
if (loss) console.log(`\nNOTE: ${loss} page(s) regressed - investigate before accepting this pass.`);
