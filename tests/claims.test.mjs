// FIXTURE-based logic tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSpecCitations, checkVerificationClaims } from "../skills/design-research-check/scripts/lib/claims.mjs";
import { makeRef, makeInspectedRef, makeLedger, tmpDir } from "./helpers.mjs";

test("ceiling C forbids visual-verification claims", () => {
  const r = checkVerificationClaims({ ceiling: "C", text: "All pages visually verified at 3 widths." });
  assert.equal(r.errors.length, 1);
});

test("ceiling C allows an honest negated statement", () => {
  const r = checkVerificationClaims({ ceiling: "C", text: "Layout was not visually verified; no images could be inspected." });
  assert.deepEqual(r.errors, []);
});

test("ceiling A allows visual verification", () => {
  assert.deepEqual(checkVerificationClaims({ ceiling: "A", text: "Visually verified at 1440 and 390." }).errors, []);
});

test("ceiling B allows supplied-screenshot wording and rejects live-interface wording", () => {
  assert.deepEqual(checkVerificationClaims({ ceiling: "B", text: "Verified from supplied screenshots." }).errors, []);
  assert.equal(checkVerificationClaims({ ceiling: "B", text: "Verified in the live interface." }).errors.length, 1);
});

test("unknown ceiling is an error", () => {
  assert.equal(checkVerificationClaims({ ceiling: "Z", text: "" }).errors.length, 1);
});

function ledgerWithTextOnly() {
  const dir = tmpDir();
  const inspected = makeInspectedRef(dir, { id: "R02" });
  const textOnly = makeRef({ id: "R03", evidence_type: "text_only" });
  return makeLedger([inspected, textOnly]);
}

test("decision with no refs is unsupported and an error unless labeled", () => {
  const ledger = ledgerWithTextOnly();
  const spec = "- **D1** Use a serif display face.\n- **D2** Calm motion. unsupported assumption";
  const r = checkSpecCitations({ specText: spec, ledger });
  assert.deepEqual(r.unsupported, ["D1", "D2"]);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /^D1/);
});

test("decision citing only a text-only ref is unsupported", () => {
  const r = checkSpecCitations({ specText: "- **D1** Olive palette [refs: R03]", ledger: ledgerWithTextOnly() });
  assert.deepEqual(r.unsupported, ["D1"]);
  assert.equal(r.errors.length, 1);
});

test("decision citing an inspected ref passes", () => {
  const r = checkSpecCitations({ specText: "- **D1** Serif display [refs: R02, R03]", ledger: ledgerWithTextOnly() });
  assert.deepEqual(r.unsupported, []);
  assert.deepEqual(r.errors, []);
});

test("citing an id missing from the ledger is an error", () => {
  const r = checkSpecCitations({ specText: "- **D1** Wide margins [refs: R99, R02]", ledger: ledgerWithTextOnly() });
  assert.ok(r.errors.some((e) => /R99/.test(e)));
});
