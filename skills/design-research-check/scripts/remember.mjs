#!/usr/bin/env node
// Usage: node remember.mjs <project-root> [--file CLAUDE.md] [--file AGENTS.md]
// Writes a short pointer to design-system.md into the project's agent instructions, so every later session (and
// every other agent) reads the design rules before touching UI. Claude Code reads CLAUDE.md; Codex, Cursor and many
// other agents read AGENTS.md. Without --file it updates whichever of the two exist, or creates both if neither does.
// The block sits between <!-- design-research-check:start --> and <!-- design-research-check:end --> and is replaced
// in place on later runs. Nothing else in the file is touched.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { writeMemory } from "./lib/system.mjs";

const args = process.argv.slice(2);
const files = [];
for (let i = args.indexOf("--file"); i >= 0; i = args.indexOf("--file")) files.push(args.splice(i, 2)[1]);
const [root] = args;
if (!root || files.some((f) => !f)) {
  console.error("usage: remember.mjs <project-root> [--file CLAUDE.md] [--file AGENTS.md]");
  process.exit(2);
}
const dir = resolve(root);
if (!existsSync(join(dir, "design-system.md"))) {
  console.log(JSON.stringify({ status: "error", reason: "no design-system.md in the project root yet; write it first (step 9.4)" }));
  process.exit(2);
}
console.log(JSON.stringify({ status: "ok", written: writeMemory(dir, files) }, null, 2));
