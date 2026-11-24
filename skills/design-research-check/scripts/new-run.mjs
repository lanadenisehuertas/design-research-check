#!/usr/bin/env node
// Usage: node new-run.mjs --out <project-dir> --slug <name> [--ceiling A|B|C] [--mode redesign] [--depth deep] [--id <run-id>]
// Creates <project-dir>/design-research-check/<run-id>/ from templates. Exit 1 if the run exists.
import { resolve } from "node:path";
import { createRun } from "./lib/run.mjs";

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
if (!opt("out")) {
  console.error("usage: new-run.mjs --out <dir> --slug <name> [--ceiling A|B|C] [--mode m] [--depth d] [--id run-id]");
  process.exit(2);
}
try {
  const r = createRun({
    out: resolve(opt("out")),
    slug: opt("slug", "run"),
    id: opt("id"),
    ceiling: opt("ceiling", "C"),
    mode: opt("mode", "redesign"),
    depth: opt("depth", "deep"),
  });
  console.log(JSON.stringify(r, null, 2));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
