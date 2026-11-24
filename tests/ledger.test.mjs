// Logic tests on FIXTURE data. They do not assert any aesthetic is correct.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalUrl, dedupe, validateLedger } from "../skills/design-research-check/scripts/lib/ledger.mjs";
import { makeRef, makeInspectedRef, makeLedger, tmpDir } from "./helpers.mjs";

test("canonicalUrl strips tracking, www, fragment, trailing slash", () => {
  assert.equal(
    canonicalUrl("https://www.Facebook.com/share/r/1MamvtkHvx/?mibextid=wwXIfr&utm_source=x#frag"),
    "https://facebook.com/share/r/1MamvtkHvx",
  );
});

test("dedupe collapses repeated original_url and counts once", () => {
  const a = makeRef({ id: "R01", source_url: "https://pinterest.com/pin/1", original_url: "https://studio.example/work/a" });
  const b = makeRef({ id: "R02", source_url: "https://behance.net/gallery/9", original_url: "https://www.studio.example/work/a/" });
  const { unique, collapsed } = dedupe([a, b]);
  assert.equal(unique.length, 1);
  assert.equal(collapsed.length, 1);
});

test("dedupe collapses a repost whose source_url equals another's original_url", () => {
  const original = makeRef({ id: "R01", source_url: "https://studio.example/work/a" });
  const repost = makeRef({ id: "R02", source_url: "https://pinterest.com/pin/2", original_url: "https://studio.example/work/a" });
  assert.equal(dedupe([original, repost]).unique.length, 1);
});

test("inspected image requires an existing local_image", () => {
  const dir = tmpDir();
  const ref = makeRef({ evidence_type: "visually_inspected_image", local_image: "refs/missing.png", inspection_note: "viewed" });
  const { errors } = validateLedger(makeLedger([ref]), { baseDir: dir });
  assert.ok(errors.some((e) => /local_image/.test(e)));
});

test("inspected entry requires a non-empty inspection_note", () => {
  const dir = tmpDir();
  const ref = makeInspectedRef(dir, { inspection_note: "  " });
  const { errors } = validateLedger(makeLedger([ref]), { baseDir: dir });
  assert.ok(errors.some((e) => /inspection_note/.test(e)));
});

test("search snippet cannot carry observed visual elements", () => {
  const dir = tmpDir();
  const ref = makeRef({
    evidence_type: "search_snippet",
    elements: [{ category: "color", observation: "olive palette", confidence: "observed" }],
  });
  const { errors } = validateLedger(makeLedger([ref]), { baseDir: dir });
  assert.ok(errors.some((e) => /snippet|observed/i.test(e)));
});

test("generated origin is rejected from the external ledger", () => {
  const dir = tmpDir();
  const { errors } = validateLedger(makeLedger([makeRef({ origin: "generated" })]), { baseDir: dir });
  assert.ok(errors.some((e) => /origin/.test(e)));
});

test("a blocked source is recorded without failing the ledger", () => {
  const dir = tmpDir();
  const ok = makeInspectedRef(dir, { id: "R01" });
  const blocked = makeRef({
    id: "R02",
    platform: "pinterest",
    source_url: "https://pinterest.com/pin/3",
    access_status: "blocked",
    evidence_type: "inaccessible",
    limitations: "login wall",
  });
  const { errors, counts } = validateLedger(makeLedger([ok, blocked]), { baseDir: dir });
  assert.deepEqual(errors, []);
  assert.equal(counts.blocked, 1);
  assert.equal(counts.inspected, 1);
});

test("missing required fields and bad enums are errors", () => {
  const dir = tmpDir();
  const bad = makeRef({ platform: "tiktok", access_status: "maybe" });
  delete bad.title;
  const { errors } = validateLedger(makeLedger([bad]), { baseDir: dir });
  assert.ok(errors.some((e) => /title/.test(e)));
  assert.ok(errors.some((e) => /platform/.test(e)));
  assert.ok(errors.some((e) => /access_status/.test(e)));
});

test("duplicate ids are an error", () => {
  const dir = tmpDir();
  const { errors } = validateLedger(makeLedger([makeRef(), makeRef({ source_url: "https://x.example/2" })]), { baseDir: dir });
  assert.ok(errors.some((e) => /duplicate id/i.test(e)));
});

test("counts report discovered vs unique", () => {
  const dir = tmpDir();
  const a = makeRef({ id: "R01", original_url: "https://studio.example/a" });
  const b = makeRef({ id: "R02", source_url: "https://pinterest.com/pin/9", original_url: "https://studio.example/a" });
  const { counts } = validateLedger(makeLedger([a, b]), { baseDir: dir });
  assert.equal(counts.discovered, 2);
  assert.equal(counts.unique, 1);
});
