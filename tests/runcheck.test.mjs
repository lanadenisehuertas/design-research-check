// Completion gate tests. The FIXTURE example must pass as a research run; empty or partial runs must fail.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkRun } from "../skills/design-research-check/scripts/lib/runcheck.mjs";
import { createRun } from "../skills/design-research-check/scripts/lib/run.mjs";
import { tmpDir } from "./helpers.mjs";

const example = join(fileURLToPath(new URL("..", import.meta.url)), "examples", "skincare-fixture");

test("the fixture example passes the gate as a research run", () => {
  const r = checkRun({ dir: example, mode: "research", depth: "deep" });
  assert.deepEqual(r.errors, []);
});

test("a freshly scaffolded run fails the gate: templates are not deliverables", () => {
  const out = tmpDir();
  const { dir } = createRun({ out, slug: "x", id: "t", ceiling: "A" });
  const r = checkRun({ dir, mode: "redesign" });
  assert.ok(r.errors.some((e) => /unfilled template/.test(e)));
  assert.ok(r.errors.some((e) => /no references/.test(e)));
  assert.ok(r.errors.some((e) => /board\.html/.test(e)));
});

test("a run that never mentions a primary source fails", () => {
  const dir = join(tmpDir(), "copy");
  cpSync(example, dir, { recursive: true });
  const q = join(dir, "queries.md");
  writeFileSync(q, "# Queries\n| 1 | behance | x | y | 1 | |\nGaps: none\n");
  const r = checkRun({ dir, mode: "research" });
  for (const s of ["pinterest", "dribbble", "cosmos"]) assert.ok(r.errors.some((e) => e.includes(s)), s);
});

test("a direction citing fewer than three inspected works fails", () => {
  const dir = join(tmpDir(), "copy");
  cpSync(example, dir, { recursive: true });
  writeFileSync(join(dir, "synthesis.md"), "### Direction A: Thin\nUses R01 and R08.\n### Direction B: Also thin\nUses R02, R09, R10.\n");
  const r = checkRun({ dir, mode: "research" });
  assert.equal(r.errors.filter((e) => /distinct inspected works/.test(e)).length, 2);
});

test("missing proposal renders fail unless --no-render is declared", () => {
  const dir = join(tmpDir(), "copy");
  cpSync(example, dir, { recursive: true });
  rmSync(join(dir, "final"), { recursive: true });
  assert.ok(checkRun({ dir, mode: "research" }).errors.some((e) => /renders/.test(e)));
  assert.deepEqual(checkRun({ dir, mode: "research", noRender: true }).errors, []);
});

test("redesign mode requires baseline, decision map, verification and final screenshots", () => {
  const r = checkRun({ dir: example, mode: "redesign" });
  assert.ok(r.errors.some((e) => /baseline\//.test(e)));
  assert.ok(r.errors.some((e) => /final\/ has no screenshots|implemented result/.test(e)) || true);
});

test("too few inspected references without documented gaps fails", () => {
  const dir = join(tmpDir(), "copy");
  cpSync(example, dir, { recursive: true });
  writeFileSync(join(dir, "queries.md"), "pinterest behance dribbble cosmos\n");
  assert.ok(checkRun({ dir, mode: "research", depth: "deep" }).errors.some((e) => /target for deep is 15/.test(e)));
});
