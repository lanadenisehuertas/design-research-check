import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { checkRun } from "../skills/design-research-check/scripts/lib/runcheck.mjs";
import { resolveMode } from "../skills/design-research-check/scripts/lib/modes.mjs";
import { encodeRgba } from "../skills/design-research-check/scripts/lib/png.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUDIT = join(ROOT, "skills/design-research-check/scripts/audit-ui.mjs");
const FIX = join(ROOT, "tests/fixtures/audit");

function audit(file, extra = []) {
  try {
    const out = execFileSync(process.execPath, [AUDIT, "--url", file, "--widths", "390", ...extra], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000 });
    return { code: 0, json: JSON.parse(out) };
  } catch (e) {
    return { code: e.status, json: JSON.parse(String(e.stdout || "{}").trim() || "{}") };
  }
}

const probe = audit(join(FIX, "good.html"));
const NO_BROWSER = probe.code === 2;

test("audit-ui flags the classic UI defects on a bad page", { skip: NO_BROWSER && "no browser available" }, () => {
  const r = audit(join(FIX, "bad.html"));
  assert.equal(r.code, 1);
  assert.equal(r.json.passed, false);
  const ids = r.json.summary.map((s) => s.id);
  for (const id of ["contrast", "overflow-x", "img-alt", "input-label", "control-name", "zoom-disabled", "html-lang", "heading-skip", "focus-outline-removed", "reduced-motion"]) {
    assert.ok(ids.includes(id), `expected ${id}, got ${ids.join(", ")}`);
  }
  const contrast = r.json.summary.find((s) => s.id === "contrast");
  assert.match(contrast.message, /contrast \d\.\d\d:1/);
});

test("audit-ui passes a clean page", { skip: NO_BROWSER && "no browser available" }, () => {
  assert.equal(probe.code, 0, JSON.stringify(probe.json.summary));
  assert.equal(probe.json.counts.critical, 0);
});

test("audit-ui refuses remote addresses without --allow-remote", () => {
  const r = audit("https://example.com/");
  assert.equal(r.code, 2);
  assert.equal(r.json.status, "refused");
});

test("accessibility and audit requests resolve to audit mode, design requests do not", () => {
  const m = (request) => resolveMode({ request, hasExistingProject: true }).mode;
  assert.equal(m("check this page for accessibility problems"), "audit");
  assert.equal(m("quick audit of the UI"), "audit");
  assert.equal(m("is the contrast ok on this site"), "audit");
  assert.equal(m("make this look premium"), "redesign");
  assert.equal(m("the site looks generic, fix the accessibility too"), "redesign");
  assert.equal(m("review my page against the brief"), "review");
  assert.equal(resolveMode({ request: "audit", hasExistingProject: true, flags: { mode: "audit" } }).edits, false);
});

function auditRun({ withFiles = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "drc-audit-run-"));
  mkdirSync(join(dir, "baseline"));
  if (withFiles) {
    writeFileSync(join(dir, "report.md"), "# Audit report\n\n" + "Critical: contrast on the hero button is 3.1:1. Major: no focus style. ".repeat(8));
    writeFileSync(join(dir, "baseline", "slop.json"), "{}");
    writeFileSync(join(dir, "baseline", "audit.json"), "{}");
    writeFileSync(join(dir, "baseline", "home-1440.png"), encodeRgba(2, 2, () => [0, 0, 0, 255]));
  }
  return dir;
}

test("gate: audit mode needs the report, both scans and a baseline render, and no research files", () => {
  const ok = auditRun();
  const bad = auditRun({ withFiles: false });
  try {
    assert.deepEqual(checkRun({ dir: ok, mode: "audit" }).errors, []);
    const e = checkRun({ dir: bad, mode: "audit" }).errors.join("\n");
    assert.match(e, /report\.md/);
    assert.match(e, /baseline\/audit\.json/);
    assert.match(e, /baseline\/slop\.json/);
  } finally {
    rmSync(ok, { recursive: true, force: true });
    rmSync(bad, { recursive: true, force: true });
  }
});
