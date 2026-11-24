import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRun, runId } from "../skills/design-research-check/scripts/lib/run.mjs";
import { tmpDir } from "./helpers.mjs";

test("runId is date-stamped and slugged", () => {
  assert.equal(runId({ slug: "Skincare Landing!", now: new Date(2026, 10, 20, 9, 5) }), "20261120-0905-skincare-landing");
});

test("createRun writes every template with variables filled", () => {
  const out = tmpDir();
  const r = createRun({ out, slug: "skincare", id: "t1", ceiling: "B" });
  for (const f of ["brief.md", "baseline.md", "queries.md", "synthesis.md", "design-spec.md", "decision-map.md", "verification.md", "references.json"]) {
    assert.ok(existsSync(join(r.dir, f)), f);
  }
  const ledger = JSON.parse(readFileSync(join(r.dir, "references.json"), "utf8"));
  assert.equal(ledger.run_id, "t1");
  assert.equal(ledger.evidence_ceiling, "B");
  assert.match(readFileSync(join(r.dir, "verification.md"), "utf8"), /Evidence ceiling: B/);
});

test("createRun refuses to overwrite a previous run", () => {
  const out = tmpDir();
  createRun({ out, slug: "x", id: "same" });
  assert.throws(() => createRun({ out, slug: "x", id: "same" }), /refusing to overwrite/);
});
