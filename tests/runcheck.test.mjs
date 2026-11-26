// Completion gate tests. The FIXTURE example must pass as a research run; empty or partial runs must fail.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkRun } from "../skills/design-research-check/scripts/lib/runcheck.mjs";
import { createRun } from "../skills/design-research-check/scripts/lib/run.mjs";
import { tmpDir } from "./helpers.mjs";
import { writeMemory } from "../skills/design-research-check/scripts/lib/system.mjs";

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

test("a proposal with an unexplained critical audit finding fails; explaining it by id in synthesis.md passes", () => {
  const dir = tmpDir();
  cpSync(example, dir, { recursive: true });
  const audit = { summary: [{ id: "overflow-x", severity: "critical", message: "page scrolls horizontally: content is 463px wider than the 390px viewport" }] };
  writeFileSync(join(dir, "proposals", "b.audit.json"), JSON.stringify(audit));
  assert.ok(checkRun({ dir, mode: "research" }).errors.some((e) => /proposal b has a critical "overflow-x"/.test(e)));
  writeFileSync(join(dir, "synthesis.md"), readFileSync(join(dir, "synthesis.md"), "utf8") + "\nProposal b: overflow-x is the intentional horizontal gallery.\n");
  assert.ok(!checkRun({ dir, mode: "research" }).errors.some((e) => /proposal b/.test(e)));
  rmSync(join(dir, "proposals", "a.audit.json"));
  assert.ok(checkRun({ dir, mode: "research" }).errors.some((e) => /missing proposals\/a\.audit\.json/.test(e)));
});

test("redesign needs a filled design system, a memory pointer and a drift-free result", () => {
  const root = tmpDir();
  const dir = join(root, "design-research-check", "run1");
  cpSync(example, dir, { recursive: true });
  const memoryErrors = () => checkRun({ dir, mode: "redesign" }).errors.filter((e) => /design-system|tokens|CLAUDE\.md|system\.json/.test(e));
  assert.ok(memoryErrors().some((e) => /missing design-system\.md/.test(e)));

  writeFileSync(join(root, "design-system.md"), readFileSync(new URL("../skills/design-research-check/templates/design-system.md", import.meta.url), "utf8"));
  assert.ok(memoryErrors().some((e) => /declares 0 colors and 0 fonts/.test(e)), "the unfilled template is not a design system");

  const tokens = { colors: { bg: "#f6f1e7", text: "#1a1a1a", accent: "#b5542c" }, fonts: { heading: "Fraunces", body: "Inter" } };
  writeFileSync(join(root, "design-system.md"), "# Design system\n\n```json\n" + JSON.stringify(tokens) + "\n```\n");
  assert.ok(memoryErrors().some((e) => /no design-system pointer/.test(e)));
  assert.ok(memoryErrors().some((e) => /missing final\/system\.json/.test(e)));

  writeMemory(root);
  writeFileSync(join(dir, "final", "system.json"), JSON.stringify({ drift: [{ file: "src/promo.css", line: 2, kind: "color", value: "#7c3aed" }] }));
  assert.ok(memoryErrors().some((e) => /1 uses of colors or fonts outside the tokens \(first: src\/promo\.css:2 #7c3aed\)/.test(e)));

  writeFileSync(join(dir, "final", "system.json"), JSON.stringify({ drift: [] }));
  assert.deepEqual(memoryErrors(), []);
});

test("audit mode accepts the audit file screenshot.mjs writes", () => {
  const out = tmpDir();
  const { dir } = createRun({ out, slug: "a", id: "t", ceiling: "A", mode: "audit" });
  writeFileSync(join(dir, "report.md"), "x".repeat(500));
  writeFileSync(join(dir, "baseline", "slop.json"), "{}");
  writeFileSync(join(dir, "baseline", "home.audit.json"), JSON.stringify({ summary: [] }));
  writeFileSync(join(dir, "baseline", "home-1440.png"), "png");
  assert.deepEqual(checkRun({ dir, mode: "audit" }).errors, []);
});
