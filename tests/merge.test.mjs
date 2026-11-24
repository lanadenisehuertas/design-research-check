// FIXTURE-based logic tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeShards } from "../skills/design-research-check/scripts/lib/merge.mjs";
import { makeRef, makeInspectedRef, tmpDir } from "./helpers.mjs";

test("reposts across shards merge to one reference, counts show the inflation avoided", () => {
  const dir = tmpDir();
  const pinterestRepost = makeRef({
    id: "R01",
    platform: "pinterest",
    source_url: "https://pinterest.com/pin/1",
    original_url: "https://studio.example/work/a",
    evidence_type: "search_snippet",
  });
  const behanceOriginal = makeInspectedRef(dir, {
    id: "R01",
    platform: "behance",
    source_url: "https://behance.net/gallery/9/a",
    original_url: "https://studio.example/work/a",
  });
  const distinct = makeRef({ id: "R02", source_url: "https://dribbble.com/shots/5", platform: "dribbble" });

  const merged = mergeShards([{ references: [pinterestRepost] }, { references: [behanceOriginal, distinct] }]);
  assert.equal(merged.counts.discovered, 3);
  assert.equal(merged.counts.unique, 2);
  assert.equal(merged.collapsed.length, 1);
  const kept = merged.references.find((r) => r.original_url === "https://studio.example/work/a");
  assert.equal(kept.evidence_type, "visually_inspected_image", "stronger evidence wins");
});

test("id collisions between different works are renamed and reported", () => {
  const a = makeRef({ id: "R01", source_url: "https://a.example/1" });
  const b = makeRef({ id: "R01", source_url: "https://b.example/2" });
  const merged = mergeShards([{ references: [a] }, { references: [b] }]);
  assert.equal(merged.references.length, 2);
  assert.equal(new Set(merged.references.map((r) => r.id)).size, 2);
  assert.equal(merged.idCollisions.length, 1);
});
