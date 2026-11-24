#!/usr/bin/env node
// Usage: node build-compare.mjs <run-dir>
// Writes <run-dir>/compare.html: baseline and final screenshots side by side for each width found in both
// folders (file names ending in -<width>.png), plus the AI-tell scan before and after if
// baseline/slop.json and final/slop.json exist. Open it in a browser to show the user the change.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const run = process.argv[2];
if (!run || !existsSync(run)) {
  console.error("usage: build-compare.mjs <run-dir>");
  process.exit(2);
}
const pngs = (dir) => (existsSync(join(run, dir)) ? readdirSync(join(run, dir)).filter((f) => /\.png$/i.test(f)) : []);
const byWidth = (files) => {
  const m = new Map();
  for (const f of files) {
    const w = f.match(/-(\d{3,4})\.png$/i)?.[1];
    if (w && !m.has(w)) m.set(w, f);
  }
  return m;
};
const before = byWidth(pngs("baseline"));
const after = byWidth(pngs("final"));
const widths = [...before.keys()].filter((w) => after.has(w)).sort((a, b) => b - a);
if (widths.length === 0) {
  console.error("no matching widths: need baseline/<name>-<width>.png and final/<name>-<width>.png");
  process.exit(1);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const readJson = (p) => (existsSync(join(run, p)) ? JSON.parse(readFileSync(join(run, p), "utf8")) : null);
const sb = readJson("baseline/slop.json");
const sf = readJson("final/slop.json");
let slop = "";
if (sb && sf) {
  const ids = [...new Set([...Object.keys(sb.counts), ...Object.keys(sf.counts)])];
  slop = `<section><h2>AI-default tells (detect-slop)</h2><p>Weighted score: ${sb.weighted} before, ${sf.weighted} after.</p><table><tr><th>Tell</th><th>Before</th><th>After</th></tr>${ids
    .map((id) => `<tr><td>${esc(id)}</td><td>${sb.counts[id] || 0}</td><td>${sf.counts[id] || 0}</td></tr>`)
    .join("")}</table></section>`;
}
const rows = widths
  .map(
    (w) => `<section><h2>${w}px</h2><div class="pair" style="--w:${Math.min(Number(w), 720)}px">
<figure><figcaption>Before</figcaption><img src="baseline/${esc(before.get(w))}" alt="Baseline at ${w}px"></figure>
<figure><figcaption>After</figcaption><img src="final/${esc(after.get(w))}" alt="Final at ${w}px"></figure></div></section>`,
  )
  .join("\n");

writeFileSync(
  join(run, "compare.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Before and after</title>
<style>body{margin:0;padding:32px;font:15px/1.5 ui-monospace,Menlo,Consolas,monospace;background:#f4f2ee;color:#1b1b1b}h1{font-size:20px}h2{font-size:15px;margin:32px 0 12px;border-top:1px solid #1b1b1b;padding-top:12px}
.pair{display:flex;gap:24px;align-items:flex-start;overflow-x:auto}figure{margin:0;flex:0 0 auto;width:var(--w)}figcaption{font-weight:700;margin-bottom:6px}img{width:100%;border:1px solid #1b1b1b;display:block}
table{border-collapse:collapse}td,th{border:1px solid #1b1b1b;padding:4px 10px;text-align:left}</style></head>
<body><h1>Before and after</h1>${slop}${rows}</body></html>`,
);
console.log(`wrote ${join(run, "compare.html")} (${widths.length} widths)`);
