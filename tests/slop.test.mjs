import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { scanSlop } from "../skills/design-research-check/scripts/lib/slop.mjs";
import { encodeRgba } from "../skills/design-research-check/scripts/lib/png.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPTS = join(ROOT, "skills/design-research-check/scripts");

const GENERIC_HTML = `<!doctype html><html><body>
<section class="hero"><h1>Elevate Your Workflow</h1><p>Unlock the power of seamless collaboration.</p><a class="btn">Get Started</a></section>
<div class="cards"><div class="card"><div class="icon">🚀</div><h3>Fast</h3></div><div class="card"><div class="icon">✨</div><h3>Smart</h3></div></div>
</body></html>`;
const GENERIC_CSS = `body { font-family: Inter, system-ui, sans-serif; }
.hero {
  text-align: center;
  background: linear-gradient(135deg, #6366f1, #a855f7);
}
.title { background-clip: text; -webkit-background-clip: text; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); }
.panel { backdrop-filter: blur(12px); box-shadow: 0 0 40px rgba(139, 92, 246, .5); }
.btn { border-radius: 999px; }`;
const DESIGNED_HTML = `<!doctype html><html><head><style>
body { font-family: "Fraunces", Georgia, serif; background: #efe9df; }
.lots { display: grid; grid-template-columns: 2fr 1fr; }
.label { border: 1px solid #1b1b1b; border-radius: 2px; }
</style></head><body><h1>Three coffees, roasted every Tuesday.</h1><a href="#beans">Shop the beans</a></body></html>`;

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), "drc-slop-"));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
}

test("scanSlop finds the common AI-default tells with file and line", () => {
  const dir = fixture({ "index.html": GENERIC_HTML, "styles.css": GENERIC_CSS });
  try {
    const r = scanSlop([dir], { root: dir });
    for (const id of ["purple-gradient", "gradient-text", "emoji-icon", "filler-copy", "generic-cta", "glassmorphism", "glow-shadow", "three-equal-cards", "pill-everything", "default-font-only", "centered-hero"]) {
      assert.ok(r.counts[id] > 0, `expected ${id}, got ${JSON.stringify(r.counts)}`);
    }
    const grad = r.tells.find((t) => t.id === "purple-gradient");
    assert.equal(grad.file, "styles.css");
    assert.equal(grad.line, 4);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scanSlop stays quiet on a designed page", () => {
  const dir = fixture({ "index.html": DESIGNED_HTML });
  try {
    const r = scanSlop([dir], { root: dir });
    assert.deepEqual(r.counts, {});
    assert.equal(r.weighted, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scanSlop ignores node_modules and run folders, and copyright signs are not emoji", () => {
  const dir = fixture({ "index.html": "<footer>© 2026 Studio ® ™ →</footer>" });
  try {
    mkdirSync(join(dir, "node_modules"));
    writeFileSync(join(dir, "node_modules", "x.html"), GENERIC_HTML);
    mkdirSync(join(dir, "design-research-check"));
    writeFileSync(join(dir, "design-research-check", "p.html"), GENERIC_HTML);
    const r = scanSlop([dir], { root: dir });
    assert.equal(r.files, 1);
    assert.deepEqual(r.counts, {});
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("detect-slop --compare exits 1 when the score did not drop and 0 when it did", () => {
  const generic = fixture({ "index.html": GENERIC_HTML, "styles.css": GENERIC_CSS });
  const designed = fixture({ "index.html": DESIGNED_HTML });
  try {
    const base = join(generic, "base.json");
    execFileSync(process.execPath, [join(SCRIPTS, "detect-slop.mjs"), generic, "--out", base]);
    const ok = execFileSync(process.execPath, [join(SCRIPTS, "detect-slop.mjs"), designed, "--compare", base], { encoding: "utf8" });
    assert.ok(JSON.parse(ok).compare.removed.includes("purple-gradient"));
    assert.throws(() => execFileSync(process.execPath, [join(SCRIPTS, "detect-slop.mjs"), generic, "--compare", base], { stdio: "pipe" }), (e) => e.status === 1);
  } finally {
    rmSync(generic, { recursive: true, force: true });
    rmSync(designed, { recursive: true, force: true });
  }
});

test("build-compare pairs baseline and final screenshots by width", () => {
  const run = mkdtempSync(join(tmpdir(), "drc-cmp-"));
  try {
    mkdirSync(join(run, "baseline"));
    mkdirSync(join(run, "final"));
    const png = encodeRgba(4, 4, () => [0, 0, 0, 255]);
    writeFileSync(join(run, "baseline", "home-1440.png"), png);
    writeFileSync(join(run, "baseline", "home-390.png"), png);
    writeFileSync(join(run, "final", "final-home-1440.png"), png);
    writeFileSync(join(run, "baseline", "slop.json"), JSON.stringify({ counts: { "emoji-icon": 3 }, weighted: 3 }));
    writeFileSync(join(run, "final", "slop.json"), JSON.stringify({ counts: {}, weighted: 0 }));
    execFileSync(process.execPath, [join(SCRIPTS, "build-compare.mjs"), run]);
    const html = readFileSync(join(run, "compare.html"), "utf8");
    assert.match(html, /baseline\/home-1440\.png/);
    assert.match(html, /final\/final-home-1440\.png/);
    assert.doesNotMatch(html, /home-390/);
    assert.match(html, /3 before, 0 after/);
  } finally {
    rmSync(run, { recursive: true, force: true });
  }
});
