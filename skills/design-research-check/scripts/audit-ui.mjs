#!/usr/bin/env node
// Usage: node audit-ui.mjs --url <file-or-url> [--widths 1440,768,390] [--out audit.json] [--allow-remote]
// Renders the page at each width and checks it against WCAG 2.2 AA basics and layout rules: contrast, horizontal
// overflow, alt text, form labels, control names, heading order, zoom, lang, touch targets, focus outline, reduced
// motion, tiny text. Severity: critical (fix before delivery), major (fix or justify), minor (note).
// Engines: Playwright if installed, otherwise the system Chrome or Edge in headless mode.
// Only audit your own pages: the system-browser engine turns off web security in a throwaway profile so it can read
// the page, so it refuses non-local addresses unless --allow-remote is given.
// screenshot.mjs runs the same audit automatically on local pages.
// Exit 0 = no critical findings, 1 = critical findings, 2 = unavailable or bad usage.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { auditPage, isLocalUrl, DEFAULT_AUDIT_WIDTHS } from "./lib/audit.mjs";

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
let url = opt("url");
if (!url) {
  console.error("usage: audit-ui.mjs --url <file-or-url> [--widths 1440,768,390] [--out audit.json] [--allow-remote]");
  process.exit(2);
}
if (!/^[a-z]+:\/\//i.test(url)) url = pathToFileURL(resolve(url)).href;
const widths = opt("widths") ? opt("widths").split(",").map(Number).filter(Boolean) : DEFAULT_AUDIT_WIDTHS;

if (!isLocalUrl(url) && !args.includes("--allow-remote")) {
  console.log(JSON.stringify({ status: "refused", reason: `${new URL(url).hostname} is not a local address. Audit your own pages, or pass --allow-remote.` }));
  process.exit(2);
}

try {
  const full = await auditPage({ url, widths });
  if (opt("out")) {
    mkdirSync(dirname(resolve(opt("out"))), { recursive: true });
    writeFileSync(opt("out"), JSON.stringify(full, null, 2));
  }
  const { pages, ...brief } = full;
  console.log(JSON.stringify(brief, null, 2));
  process.exit(full.passed ? 0 : 1);
} catch (e) {
  console.log(JSON.stringify({ status: "unavailable", reason: String(e.message ?? e), next: "use the host's browser tools, install Playwright, or check by hand and mark the rows not tested" }));
  process.exit(2);
}
