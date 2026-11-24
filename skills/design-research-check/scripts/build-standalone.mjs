#!/usr/bin/env node
// Usage: node build-standalone.mjs [out-file]
// Default out-file: <repo>/adapters/standalone/operating-prompt.md
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildStandalone } from "./lib/standalone.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(here, "..");
const repoRoot = resolve(skillDir, "..", "..");
const out = process.argv[2] ? resolve(process.argv[2]) : join(repoRoot, "adapters", "standalone", "operating-prompt.md");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, buildStandalone(skillDir));
console.log(`wrote ${out}`);
