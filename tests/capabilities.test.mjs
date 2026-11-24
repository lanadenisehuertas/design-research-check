// FIXTURE-based logic tests (cases 5 and 6).
import { test } from "node:test";
import assert from "node:assert/strict";
import { evidenceCeiling, pickPreviewPath, unavailableList } from "../skills/design-research-check/scripts/lib/capabilities.mjs";
import { checkVerificationClaims } from "../skills/design-research-check/scripts/lib/claims.mjs";

test("evidence ceiling: A needs vision, image capture and render", () => {
  assert.equal(evidenceCeiling({ vision: true, imageCapture: true, render: true }), "A");
  assert.equal(evidenceCeiling({ vision: true, browser: true }), "A");
});

test("evidence ceiling: B is vision on saved or supplied images without render", () => {
  assert.equal(evidenceCeiling({ vision: true, imageCapture: true, render: false }), "B");
  assert.equal(evidenceCeiling({ vision: true, userImages: true }), "B");
});

test("evidence ceiling: text fetching alone is C, whatever else is declared", () => {
  assert.equal(evidenceCeiling({ webSearch: true, render: true, imageCapture: true }), "C");
  assert.equal(evidenceCeiling({ vision: true }), "C");
  assert.equal(evidenceCeiling({}), "C");
});

test("case 5: missing image generation falls back to a rendered HTML preview", () => {
  assert.equal(pickPreviewPath({ imageGen: true, render: true }), "generated+html");
  assert.equal(pickPreviewPath({ imageGen: false, render: true }), "html_render");
  assert.equal(pickPreviewPath({ imageGen: false, render: false }), "html_unrendered");
});

test("case 6: no vision -> ceiling C -> a visually-verified claim is rejected", () => {
  const ceiling = evidenceCeiling({ browser: true, vision: false, render: true });
  assert.equal(ceiling, "C");
  assert.equal(checkVerificationClaims({ ceiling, text: "Result visually verified." }).errors.length, 1);
});

test("no render means no visual verification claim, even at ceiling A", () => {
  assert.equal(checkVerificationClaims({ ceiling: "A", render: false, text: "Visually verified at 390." }).errors.length, 1);
  assert.deepEqual(checkVerificationClaims({ ceiling: "A", render: true, text: "Visually verified at 390." }).errors, []);
});

test("unavailable list names a fallback for each missing capability", () => {
  const list = unavailableList({});
  assert.deepEqual(list.map((x) => x.capability).sort(), ["browser", "imageCapture", "imageGen", "render", "vision", "webSearch"]);
  assert.ok(list.every((x) => x.fallback));
});
