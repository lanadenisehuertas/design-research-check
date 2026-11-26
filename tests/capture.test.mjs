// capture-refs.mjs and annotate-refs.mjs against a local HTTP server: no external network.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRun } from "../skills/design-research-check/scripts/lib/run.mjs";
import { readMeta, platformOf } from "../skills/design-research-check/scripts/lib/capture.mjs";
import { tmpDir } from "./helpers.mjs";

const run = promisify(execFile);
const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), "..", "skills", "design-research-check", "scripts");
// 1x1 PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

let server;
let base;
const seenAgents = [];
before(async () => {
  server = createServer((req, res) => {
    seenAgents.push(req.headers["user-agent"]);
    const html = (body) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(body); };
    if (req.url === "/img.png") { res.writeHead(200, { "content-type": "image/png" }); return res.end(PNG); }
    if (req.url === "/work") return html(`<html><head><meta content="/img.png" property="og:image"><meta property="og:title" content="Label system &amp; type"><meta name="author" content="Studio North"></head></html>`);
    if (req.url === "/noimg") return html("<html><head><title>No image here</title></head></html>");
    if (req.url === "/challenge") return html("<html><head><title>Just a moment...</title></head><body>cf-chl</body></html>");
    if (req.url === "/blocked") { res.writeHead(403); return res.end("no"); }
    res.writeHead(404);
    res.end();
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test("readMeta reads og:image in either attribute order and resolves it", () => {
  const m = readMeta(`<meta content="/a.jpg" property="og:image"><meta property="og:title" content="T &amp; U">`, "https://x.test/p/1");
  assert.equal(m.image, "https://x.test/a.jpg");
  assert.equal(m.title, "T & U");
});

test("platformOf maps gallery hosts and their CDNs", () => {
  assert.equal(platformOf("https://cdn.dribbble.com/x.png"), "dribbble");
  assert.equal(platformOf("https://mir-s3-cdn-cf.behance.net/x.jpg"), "behance");
  assert.equal(platformOf("https://i.pinimg.com/x.jpg"), "pinterest");
  assert.equal(platformOf("https://example.com/"), "other");
});

test("capture-refs saves images, records blocks honestly, and marks nothing inspected", async () => {
  const out = tmpDir();
  const { dir } = createRun({ out, slug: "cap", id: "t", ceiling: "A", mode: "research" });
  const list = join(out, "list.txt");
  writeFileSync(list, [`# comment`, `D01 ${base}/img.png dribbble`, `W01 ${base}/work`, `W02 ${base}/noimg`, `B01 ${base}/blocked behance`, `C01 ${base}/challenge cosmos`, ""].join("\n"));
  const { stdout } = await run(process.execPath, [join(SCRIPTS, "capture-refs.mjs"), dir, list]);
  const r = JSON.parse(stdout);
  assert.deepEqual(r.captured.map((c) => c.id).sort(), ["D01", "W01"]);
  assert.deepEqual(r.blocked.sort(), ["B01", "C01"]);
  assert.deepEqual(r.partial.map((p) => p.id), ["W02"]);
  const ledger = JSON.parse(readFileSync(join(dir, "references.json"), "utf8"));
  const byId = Object.fromEntries(ledger.references.map((x) => [x.id, x]));
  assert.ok(existsSync(join(dir, byId.D01.local_image)));
  assert.equal(byId.W01.title, "Label system & type");
  assert.equal(byId.W01.creator, "Studio North");
  assert.equal(byId.B01.platform, "behance");
  assert.ok(ledger.references.every((x) => !x.evidence_type.startsWith("visually_inspected")));
  // Honest, non-browser user agent: no spoofing.
  assert.ok(seenAgents.every((a) => /design-research-check/.test(a)));

  // The ledger is valid as captured.
  await run(process.execPath, [join(SCRIPTS, "validate-ledger.mjs"), join(dir, "references.json")]);

  // annotate-refs upgrades only what has an image and a note, and refuses blocked sources.
  const notes = join(out, "notes.json");
  writeFileSync(notes, JSON.stringify({
    D01: { inspection_note: "Saw a cream label with a condensed serif", relevance: "label hierarchy", proposed_use: "product card", avoid: "copying the mark", elements: [{ category: "type", observation: "condensed serif caps", confidence: "observed" }], curated: true },
    W01: { inspection_note: "Saw a cover crop of a label system", relevance: "r", proposed_use: "p", avoid: "a" },
  }));
  const ok = JSON.parse((await run(process.execPath, [join(SCRIPTS, "annotate-refs.mjs"), dir, notes])).stdout);
  assert.deepEqual(ok.upgraded.sort(), ["D01", "W01"]);
  assert.equal(ok.counts.inspected, 2);
  assert.equal(ok.counts.curated, 1);

  writeFileSync(notes, JSON.stringify({ B01: { inspection_note: "pretend I saw it" } }));
  await assert.rejects(run(process.execPath, [join(SCRIPTS, "annotate-refs.mjs"), dir, notes]), (e) => e.code === 1 && /cannot be marked inspected/.test(e.stdout));
});
