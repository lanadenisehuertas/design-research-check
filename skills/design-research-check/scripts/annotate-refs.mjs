#!/usr/bin/env node
// Usage: node annotate-refs.mjs <RUN> <notes.json> [--ledger <file>]   (default RUN/references.json; a shard when fanned out)
// Records what you saw after opening captured images, instead of hand-editing references.json.
// notes.json maps reference IDs to fields:
//   { "B03": { "inspection_note": "what you actually saw", "relevance": "...", "proposed_use": "...", "avoid": "...",
//              "elements": [{ "category": "type", "observation": "...", "confidence": "observed" }],
//              "curated": true, "title": "...", "creator": "...", "live_page": false } }
// An entry with a non-empty inspection_note and a saved local_image becomes visually_inspected_image
// (or visually_inspected_live_page with "live_page": true). Blocked or inaccessible entries cannot be upgraded.
// Validates the ledger afterwards. Exit 0 = valid, 1 = ledger errors, 2 = bad usage.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { validateLedger } from "./lib/ledger.mjs";

const args = process.argv.slice(2);
const li = args.indexOf("--ledger");
const ledgerOpt = li >= 0 ? args.splice(li, 2)[1] : null;
const [runDir, notesFile] = args;
if (!runDir || !notesFile) {
  console.error("usage: annotate-refs.mjs <RUN> <notes.json> [--ledger <file>]");
  process.exit(2);
}
const ledgerPath = ledgerOpt ?? join(runDir, "references.json");
const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
const notes = JSON.parse(readFileSync(notesFile, "utf8"));
const FIELDS = ["inspection_note", "relevance", "proposed_use", "avoid", "limitations", "elements", "observations", "curated", "title", "creator", "original_url"];

const problems = [];
const upgraded = [];
for (const [id, n] of Object.entries(notes)) {
  const ref = ledger.references.find((r) => r.id === id);
  if (!ref) {
    problems.push(`${id}: not in references.json (capture it first with capture-refs.mjs)`);
    continue;
  }
  for (const f of FIELDS) if (n[f] !== undefined) ref[f] = n[f];
  const blocked = ref.access_status === "blocked" || ref.access_status === "inaccessible";
  if (String(ref.inspection_note ?? "").trim() && ref.local_image && !blocked) {
    ref.evidence_type = n.live_page ? "visually_inspected_live_page" : "visually_inspected_image";
    if (/not yet inspected/.test(ref.limitations ?? "")) ref.limitations = ref.limitations.replace(/,? not yet inspected/, "");
    if (!ref.limitations) ref.limitations = "static image: interaction and responsive behavior not visible";
    upgraded.push(id);
  } else if (n.inspection_note && blocked) {
    problems.push(`${id}: is ${ref.access_status}; a blocked source cannot be marked inspected`);
  } else if (n.inspection_note && !ref.local_image) {
    problems.push(`${id}: has no local_image; save the image before marking it inspected`);
  }
}
writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
const v = validateLedger(ledger, { baseDir: runDir });
console.log(JSON.stringify({ upgraded, problems, counts: v.counts, errors: v.errors, warnings: v.warnings.length }, null, 2));
process.exit(v.errors.length || problems.length ? 1 : 0);
