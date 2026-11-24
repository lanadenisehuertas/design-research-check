// FIXTURE-based logic tests: the board must not present un-inspected work as inspected.
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderBoard } from "../skills/design-research-check/scripts/lib/board.mjs";
import { makeInspectedRef, makeLedger, makeRef, tmpDir } from "./helpers.mjs";

test("only inspected references get image cards; others are listed as not inspected", () => {
  const dir = tmpDir();
  const html = renderBoard(makeLedger([
    makeInspectedRef(dir, { id: "R01", title: "Inspected one" }),
    makeRef({ id: "R02", source_url: "https://x.example/2", evidence_type: "search_snippet", title: "Snippet two" }),
    makeRef({ id: "R03", source_url: "https://x.example/3", access_status: "blocked", evidence_type: "inaccessible" }),
  ]));
  assert.equal(html.match(/<article class="card">/g).length, 1);
  assert.match(html, /<img src="refs\/r01\.png"/);
  const notInspected = html.split('id="not-inspected"')[1];
  assert.match(notInspected, /R02/);
  assert.match(notInspected, /R03/);
  assert.doesNotMatch(notInspected, /R01/);
});

test("titles are HTML-escaped and non-http links are neutralised", () => {
  const dir = tmpDir();
  const html = renderBoard(makeLedger([
    makeInspectedRef(dir, { title: "<script>alert(1)</script>", source_url: "javascript:alert(1)" }),
  ]));
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /href="#"/);
});

test("fixture ledgers show a fixture banner", () => {
  assert.match(renderBoard(makeLedger([], { fixture: true })), /FIXTURE, not real research/);
  assert.doesNotMatch(renderBoard(makeLedger([], { fixture: false })), /FIXTURE, not real research/);
});

test("reposts are counted once in the board header", () => {
  const dir = tmpDir();
  const a = makeInspectedRef(dir, { id: "R01", original_url: "https://s.example/a" });
  const b = makeRef({ id: "R02", source_url: "https://p.example/2", original_url: "https://s.example/a" });
  assert.match(renderBoard(makeLedger([a, b])), /2 discovered, 1 unique, 1 inspected/);
});
