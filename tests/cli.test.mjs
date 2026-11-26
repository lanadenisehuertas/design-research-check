// Runs the helper CLIs exactly as SKILL.md tells the agent to call them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, cpSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPTS = join(ROOT, "skills/design-research-check/scripts");
const FIXTURE = join(ROOT, "examples/skincare-fixture");

function run(script, args) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [join(SCRIPTS, script), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    return { code: e.status, out: String(e.stdout) + String(e.stderr) };
  }
}

test("validate-ledger accepts a path with no --base (as SKILL.md calls it)", () => {
  const r = run("validate-ledger.mjs", [join(FIXTURE, "references.json")]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /"inspected"/);
});

test("validate-ledger accepts --base before or after the file", () => {
  assert.equal(run("validate-ledger.mjs", [join(FIXTURE, "references.json"), "--base", FIXTURE]).code, 0);
  assert.equal(run("validate-ledger.mjs", ["--base", FIXTURE, join(FIXTURE, "references.json")]).code, 0);
});

test("validate-ledger with no file is a usage error", () => {
  assert.equal(run("validate-ledger.mjs", []).code, 2);
});

test("merge-shards accepts bare-array shards and ledger-object shards", () => {
  const dir = mkdtempSync(join(tmpdir(), "drc-cli-"));
  try {
    const refs = JSON.parse(readFileSync(join(FIXTURE, "references.json"), "utf8")).references;
    writeFileSync(join(dir, "shard-a.json"), JSON.stringify(refs.slice(0, 3)));
    writeFileSync(join(dir, "shard-b.json"), JSON.stringify({ references: refs.slice(3) }));
    const out = join(dir, "references.json");
    const r = run("merge-shards.mjs", [out, join(dir, "shard-a.json"), join(dir, "shard-b.json")]);
    assert.equal(r.code, 0, r.out);
    const merged = JSON.parse(readFileSync(out, "utf8"));
    assert.ok(merged.references.length >= refs.length - 2, `merged ${merged.references.length} of ${refs.length}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("merge-shards rejects a shard with no references", () => {
  const dir = mkdtempSync(join(tmpdir(), "drc-cli-"));
  try {
    writeFileSync(join(dir, "bad.json"), JSON.stringify({ items: [] }));
    assert.equal(run("merge-shards.mjs", [join(dir, "o.json"), join(dir, "bad.json")]).code, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scan-outbound exits 1 on a leaked marker and 0 on clean queries", () => {
  const dir = mkdtempSync(join(tmpdir(), "drc-cli-"));
  try {
    writeFileSync(join(dir, "q.md"), "site:dribbble.com/shots coffee roaster editorial serif\n");
    assert.equal(run("scan-outbound.mjs", [join(dir, "q.md"), "Halden"]).code, 0);
    writeFileSync(join(dir, "q.md"), "halden coffee website\n");
    assert.equal(run("scan-outbound.mjs", [join(dir, "q.md"), "Halden"]).code, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("build-board and check-run work on the example run", () => {
  const dir = mkdtempSync(join(tmpdir(), "drc-cli-"));
  try {
    cpSync(FIXTURE, dir, { recursive: true });
    assert.equal(run("build-board.mjs", [join(dir, "references.json"), join(dir, "board.html")]).code, 0);
    const r = run("check-run.mjs", [dir, "--mode", "research", "--depth", "deep"]);
    assert.equal(r.code, 0, r.out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-claims runs on the example spec and ledger", () => {
  const r = run("check-claims.mjs", ["--ceiling", "A", "--spec", join(FIXTURE, "design-spec.md"), "--ledger", join(FIXTURE, "references.json")]);
  assert.equal(r.code, 0, r.out);
});

test("check-run accepts every mode SKILL.md names, including audit", () => {
  const dir = mkdtempSync(join(tmpdir(), "drc-cli-"));
  try {
    for (const mode of ["research", "review", "audit", "redesign"]) {
      const r = run("check-run.mjs", [dir, "--mode", mode]);
      assert.ok(r.code === 0 || r.code === 1, `${mode}: exit ${r.code}\n${r.out}`); // 2 would mean the mode was rejected as bad usage
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
