#!/usr/bin/env node
// Usage: node check-run.mjs <run-dir> --mode research|review|redesign [--depth quick|standard|deep] [--no-render]
// The completion gate. Exit 0 = the run folder holds every deliverable its mode requires. Exit 1 = not done.
import { resolve } from "node:path";
import { checkRun } from "./lib/runcheck.mjs";

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--") && !["research", "review", "redesign", "quick", "standard", "deep"].includes(a));
const opt = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const mode = opt("mode");
if (!dir || !["research", "review", "redesign"].includes(mode)) {
  console.error("usage: check-run.mjs <run-dir> --mode research|review|redesign [--depth quick|standard|deep] [--no-render]");
  process.exit(2);
}
const r = checkRun({ dir: resolve(dir), mode, depth: opt("depth") ?? "deep", noRender: args.includes("--no-render") });
console.log(JSON.stringify({ done: r.errors.length === 0, ...r }, null, 2));
process.exit(r.errors.length ? 1 : 0);
