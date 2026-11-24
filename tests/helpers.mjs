// FIXTURE helpers. Everything built here is test data, not real research.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export function tmpDir() {
  return mkdtempSync(join(tmpdir(), "drc-test-"));
}

export function makeRef(overrides = {}) {
  return {
    id: "R01",
    platform: "behance",
    source_url: "https://www.behance.net/gallery/1/FIXTURE-one",
    original_url: null,
    title: "FIXTURE one",
    creator: "unknown",
    accessed_at: "2026-11-20",
    access_status: "ok",
    evidence_type: "text_only",
    origin: "discovered",
    local_image: null,
    inspection_note: "",
    observations: [],
    elements: [],
    relevance: "fixture",
    limitations: "fixture",
    proposed_use: "fixture",
    avoid: "fixture",
    ...overrides,
  };
}

/** A ref that is genuinely inspected: writes the image file under baseDir. */
export function makeInspectedRef(baseDir, overrides = {}) {
  const local_image = overrides.local_image ?? "refs/r01.png";
  const abs = join(baseDir, local_image);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, "x");
  return makeRef({
    evidence_type: "visually_inspected_image",
    local_image,
    inspection_note: "Viewed the saved image: serif display headline over cream field.",
    observations: ["serif display headline", "wide margins"],
    elements: [
      { category: "type", observation: "high-contrast serif headline", confidence: "observed" },
    ],
    ...overrides,
  });
}

export function makeLedger(references, extra = {}) {
  return {
    run_id: "fixture-run",
    fixture: true,
    evidence_ceiling: "A",
    references,
    ...extra,
  };
}
