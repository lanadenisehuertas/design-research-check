#!/usr/bin/env node
// Usage: node validate-ledger.mjs <references.json> [--base <dir>]
// Exit 0 = valid, 1 = errors, 2 = bad usage.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { validateLedger } from "./lib/ledger.mjs";

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const file = args.find((a, i) => !a.startsWith("--") && (baseIdx < 0 || i !== baseIdx + 1));
if (!file) {
  console.error("usage: validate-ledger.mjs <references.json> [--base <dir>]");
  process.exit(2);
}
const baseDir = baseIdx >= 0 ? resolve(args[baseIdx + 1]) : dirname(resolve(file));

const ledger = JSON.parse(readFileSync(file, "utf8"));
const { errors, warnings, counts } = validateLedger(ledger, { baseDir });
console.log(JSON.stringify({ counts, errors, warnings }, null, 2));
process.exit(errors.length ? 1 : 0);
