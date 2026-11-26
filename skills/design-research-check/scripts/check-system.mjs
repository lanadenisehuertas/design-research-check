#!/usr/bin/env node
// Usage: node check-system.mjs <design-system.md> <source folder or file>... [--out system.json]
// Drift check: lists every color (hex, rgb(), hsl()) and primary font family in the source that the ```json tokens
// block in design-system.md does not declare, with file and line. Run it after any UI change so a new page cannot
// quietly drift from the system. Fix drift by using a token, or by adding the value to design-system.md first.
// Skips node_modules, build output, minified files, tests and design-research-check run folders.
// Not checked: named colors (red, white), the font shorthand, Tailwind theme files, images.
// Exit 0 = no drift, 1 = drift found, 2 = bad usage or no tokens block.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseTokens, scanDrift } from "./lib/system.mjs";

const args = process.argv.slice(2);
const i = args.indexOf("--out");
const out = i >= 0 ? args.splice(i, 2)[1] : null;
const [systemFile, ...paths] = args;
if (!systemFile || paths.length === 0) {
  console.error("usage: check-system.mjs <design-system.md> <source folder or file>... [--out system.json]");
  process.exit(2);
}
let tokens;
try {
  tokens = parseTokens(readFileSync(systemFile, "utf8"));
} catch (e) {
  console.log(JSON.stringify({ status: "error", reason: e.message, next: "add a ```json block with colors and fonts to design-system.md (see templates/design-system.md)" }));
  process.exit(2);
}
const result = scanDrift({ tokens, paths: paths.map((p) => resolve(p)) });
const report = {
  status: result.drift.length ? "drift" : "ok",
  tokens: { colors: tokens.colors.size, fonts: tokens.fonts.size },
  files_scanned: result.files,
  counts: result.counts,
  drift: result.drift,
};
if (out) {
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ ...report, drift: result.drift.slice(0, 40), ...(result.drift.length > 40 ? { truncated: result.drift.length - 40 } : {}) }, null, 2));
process.exit(result.drift.length ? 1 : 0);
