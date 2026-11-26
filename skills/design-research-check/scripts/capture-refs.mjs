#!/usr/bin/env node
// Usage: node capture-refs.mjs <RUN> <list.txt> [--ledger <file>] [--origin discovered|user_provided] [--concurrency 6]
// Captures many references in one call, instead of fetching and writing the ledger by hand.
// list.txt has one reference per line: `<ID> <url> [platform]`. Blank lines and lines starting with # are ignored.
// The URL can be an image (CDN URL from a gallery or search result) or a page (its og:image is read and saved).
// Each image is saved to RUN/refs/<ID>.<ext>, and each line becomes an entry in RUN/references.json (added, or
// replacing the entry with the same ID). Parallel subagents pass --ledger RUN/refs/shard-<PREFIX>.json so they never
// write the same file at once; merge the shards with merge-shards.mjs. Refused fetches (401/403/429, bot checks) are recorded as blocked.
// Nothing is marked inspected: open each saved image, then record what you saw with annotate-refs.mjs.
// For live sites you want as full screenshots, use screenshot.mjs --out "$RUN/refs" --name <ID> instead.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { captureRef, pool } from "./lib/capture.mjs";
import { PLATFORMS } from "./lib/ledger.mjs";

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args.splice(i, 2)[1] : d;
};
const origin = opt("origin", "discovered");
const ledgerOpt = opt("ledger");
const concurrency = Number(opt("concurrency", "6")) || 6;
const [runDir, listFile] = args;
if (!runDir || !listFile) {
  console.error("usage: capture-refs.mjs <RUN> <list.txt> [--ledger <file>] [--origin discovered|user_provided] [--concurrency 6]");
  process.exit(2);
}

const items = [];
for (const [n, line] of readFileSync(listFile, "utf8").split(/\r?\n/).entries()) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const [id, url, platform] = t.split(/\s+/);
  if (!id || !/^https?:\/\//i.test(url ?? "")) {
    console.error(`${listFile}:${n + 1}: expected "<ID> <http(s) url> [platform]"`);
    process.exit(2);
  }
  if (platform && !PLATFORMS.includes(platform)) {
    console.error(`${listFile}:${n + 1}: unknown platform "${platform}" (one of ${PLATFORMS.join(", ")})`);
    process.exit(2);
  }
  items.push({ id, url, platform });
}

const mainPath = join(runDir, "references.json");
const ledgerPath = ledgerOpt ?? mainPath;
const main = existsSync(mainPath) ? JSON.parse(readFileSync(mainPath, "utf8")) : {};
const ledger = existsSync(ledgerPath)
  ? JSON.parse(readFileSync(ledgerPath, "utf8"))
  : { run_id: main.run_id ?? null, fixture: false, evidence_ceiling: main.evidence_ceiling ?? "C", references: [] };
ledger.references ||= [];

const entries = await pool(items, concurrency, (it) => captureRef({ ...it, runDir, origin }));
for (const e of entries) {
  const i = ledger.references.findIndex((r) => r.id === e.id);
  if (i >= 0) {
    // Keep what the agent already wrote (notes, elements); refresh only what capture knows.
    const old = ledger.references[i];
    ledger.references[i] = old.evidence_type?.startsWith("visually_inspected") ? { ...e, ...old, local_image: e.local_image ?? old.local_image } : { ...old, ...e };
  } else ledger.references.push(e);
}
writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));

const by = (s) => entries.filter((e) => e.access_status === s).map((e) => e.id);
console.log(JSON.stringify({
  ledger: ledgerPath,
  captured: entries.filter((e) => e.local_image).map((e) => ({ id: e.id, image: e.local_image, title: e.title })),
  partial: entries.filter((e) => e.access_status === "partial").map((e) => ({ id: e.id, why: e.limitations })),
  blocked: by("blocked"),
  inaccessible: by("inaccessible"),
  next: "open each captured image, then record what you saw with annotate-refs.mjs",
}, null, 2));
