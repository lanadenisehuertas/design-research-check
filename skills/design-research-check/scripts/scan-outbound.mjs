#!/usr/bin/env node
// Usage: node scan-outbound.mjs <queries.md> <marker> [<marker>...]
// Markers are private strings (brand name, product name, unreleased copy, client names).
// Exit 1 if any marker appears in the queries file, i.e. would leave the machine.
import { readFileSync } from "node:fs";
import { scanOutbound } from "./lib/sanitize.mjs";

const [file, ...markers] = process.argv.slice(2);
if (!file) {
  console.error("usage: scan-outbound.mjs <queries.md> <marker>...");
  process.exit(2);
}
const found = scanOutbound(readFileSync(file, "utf8"), markers);
console.log(JSON.stringify({ leaked_markers: found }, null, 2));
process.exit(found.length ? 1 : 0);
