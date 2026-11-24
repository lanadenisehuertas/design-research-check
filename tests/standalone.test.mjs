// Drift guard: the committed standalone prompt must equal what the generator produces from the core.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { REFERENCE_ORDER, buildStandalone } from "../skills/design-research-check/scripts/lib/standalone.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const skillDir = join(root, "skills", "design-research-check");

test("committed operating-prompt.md matches the generator output", () => {
  const committed = readFileSync(join(root, "adapters", "standalone", "operating-prompt.md"), "utf8").replace(/\r\n/g, "\n");
  assert.equal(committed, buildStandalone(skillDir), "run: node skills/design-research-check/scripts/build-standalone.mjs");
});

test("every reference file is included in the standalone prompt", () => {
  const onDisk = readdirSync(join(skillDir, "references")).map((f) => f.replace(/\.md$/, "")).sort();
  assert.deepEqual([...REFERENCE_ORDER].sort(), onDisk);
});

test("SKILL.md stays a short router", () => {
  const lines = readFileSync(join(skillDir, "SKILL.md"), "utf8").split("\n").length;
  assert.ok(lines <= 150, `SKILL.md has ${lines} lines`);
});
