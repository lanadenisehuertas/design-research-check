// End-to-end check of the FIXTURE example run (case 1, logic side only; a live host run is reported separately).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateLedger } from "../skills/design-research-check/scripts/lib/ledger.mjs";
import { checkSpecCitations, checkVerificationClaims } from "../skills/design-research-check/scripts/lib/claims.mjs";

const dir = join(fileURLToPath(new URL("..", import.meta.url)), "examples", "skincare-fixture");
const ledger = JSON.parse(readFileSync(join(dir, "references.json"), "utf8"));

test("example ledger is marked fixture and validates", () => {
  assert.equal(ledger.fixture, true);
  const { errors, counts } = validateLedger(ledger, { baseDir: dir });
  assert.deepEqual(errors, []);
  assert.equal(counts.discovered, 11);
  assert.equal(counts.unique, 10, "the repost R11 collapses into R01");
  assert.equal(counts.inspected, 7);
  assert.equal(counts.blocked, 1);
});

test("every spec decision is supported or explicitly labeled unsupported", () => {
  const specText = readFileSync(join(dir, "design-spec.md"), "utf8");
  const { errors, unsupported } = checkSpecCitations({ specText, ledger });
  assert.deepEqual(errors, []);
  assert.deepEqual(unsupported, ["D10"]);
});

test("verification wording stays within the evidence ceiling", () => {
  const text = readFileSync(join(dir, "verification.md"), "utf8");
  assert.deepEqual(checkVerificationClaims({ ceiling: ledger.evidence_ceiling, text }).errors, []);
});

test("every direction draws on at least three distinct inspected creators", () => {
  const byId = new Map(ledger.references.map((r) => [r.id, r]));
  const directions = { A: ["R01", "R06", "R07", "R04"], B: ["R03", "R02", "R04"], C: ["R05", "R02", "R07"] };
  for (const [name, ids] of Object.entries(directions)) {
    const creators = new Set(ids.map((id) => byId.get(id)).filter((r) => r.evidence_type.startsWith("visually_inspected")).map((r) => r.creator));
    assert.ok(creators.size >= 3, `direction ${name} has ${creators.size} creators`);
  }
});

test("every example text file carries the fixture banner and all deliverables exist", () => {
  for (const f of ["brief.md", "baseline.md", "queries.md", "synthesis.md", "design-spec.md", "decision-map.md", "verification.md"]) {
    assert.match(readFileSync(join(dir, f), "utf8").slice(0, 200), /FIXTURE/, f);
  }
  for (const f of ["a.html", "b.html", "c.html"]) assert.match(readFileSync(join(dir, "proposals", f), "utf8"), /FIXTURE proposal/);
  assert.ok(readdirSync(join(dir, "final")).length >= 6, "rendered images present");
});
