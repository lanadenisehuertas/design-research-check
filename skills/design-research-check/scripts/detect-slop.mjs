#!/usr/bin/env node
// Usage: node detect-slop.mjs <file-or-folder>... [--out result.json] [--compare baseline.json]
// Lists the default choices that make a page read as AI-generated (purple gradients, gradient text, emoji icons,
// stock copy, glass panels, glows, three equal cards, pill everything, default-sans-only type, centered hero).
// Skips node_modules, build output and design-research-check run folders.
// With --compare, also reports which baseline tells are gone and which are new, and exits 1 if the weighted score
// did not drop. Without --compare it always exits 0: a tell is a default to question, not an automatic failure.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { scanSlop } from "./lib/slop.mjs";

const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const flagged = new Set(["--out", "--compare"].flatMap((f) => (args.includes(f) ? [args.indexOf(f), args.indexOf(f) + 1] : [])));
const paths = args.filter((a, i) => !flagged.has(i) && !a.startsWith("--"));
if (paths.length === 0 || paths.some((p) => !existsSync(p))) {
  console.error("usage: detect-slop.mjs <file-or-folder>... [--out result.json] [--compare baseline.json]");
  process.exit(2);
}

const result = scanSlop(paths);
let code = 0;
if (opt("compare")) {
  const base = JSON.parse(readFileSync(opt("compare"), "utf8"));
  const before = new Set(Object.keys(base.counts || {}));
  const after = new Set(Object.keys(result.counts));
  result.compare = {
    baseline_weighted: base.weighted,
    weighted: result.weighted,
    removed: [...before].filter((id) => !after.has(id)),
    remaining: [...after].filter((id) => before.has(id)),
    introduced: [...after].filter((id) => !before.has(id)),
  };
  if (base.weighted > 0 && result.weighted >= base.weighted) code = 1;
}
if (opt("out")) writeFileSync(opt("out"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ files: result.files, counts: result.counts, weighted: result.weighted, compare: result.compare, first: result.tells.slice(0, 15) }, null, 2));
process.exit(code);
