// Design-system memory: tokens parsing, drift detection, and the CLAUDE.md / AGENTS.md pointer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findColors, findFonts, parseTokens, writeMemory, hasMemoryPointer, MARK_START } from "../skills/design-research-check/scripts/lib/system.mjs";
import { tmpDir } from "./helpers.mjs";

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), "..", "skills", "design-research-check", "scripts");
const cli = (script, args) => {
  try {
    return { code: 0, out: execFileSync(process.execPath, [join(SCRIPTS, script), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    return { code: e.status, out: String(e.stdout) };
  }
};

const SYSTEM = [
  "# Design system", "", "## Tokens", "```json",
  JSON.stringify({ colors: { bg: "#F6F1E7", text: "#1a1a1a", accent: "rgb(181, 84, 44)", border: "#ddd" }, fonts: { heading: "Fraunces, Georgia, serif", body: ["Inter", "system-ui"] } }, null, 2),
  "```", "",
].join("\n");

test("colors normalize across hex, short hex, rgb and hsl; anchors and entities are not colors", () => {
  const c = findColors(`a{color:#FFF} b{color:rgb(255,0,0)} c{color:hsl(0 100% 50%)} <a href="#fade">x</a> &#123; d{color:#11223380}`);
  assert.deepEqual(c.map((x) => x.hex).sort(), ["#112233" + "80", "#ff0000", "#ff0000", "#ffffff"].sort());
});

test("only the primary font family counts; fallbacks, keywords and variables do not", () => {
  const f = findFonts(`h1{font-family:"Fraunces", Georgia, serif} p{font-family:var(--body)} i{font-family:inherit} const s={fontFamily:'Lora, serif'}`);
  assert.deepEqual(f.map((x) => x.family), ["fraunces", "lora"]);
});

test("parseTokens reads the json block and rejects a file without one", () => {
  const t = parseTokens(SYSTEM);
  assert.ok(t.colors.has("#f6f1e7") && t.colors.has("#b5542c") && t.colors.has("#dddddd"));
  assert.ok(t.fonts.has("fraunces") && t.fonts.has("inter"));
  assert.throws(() => parseTokens("# no tokens"), /no ```json tokens block/);
});

test("check-system flags drift with file and line, and passes clean code", () => {
  const root = tmpDir();
  writeFileSync(join(root, "design-system.md"), SYSTEM);
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "ok.css"), ":root{--bg:#f6f1e7;--accent:#b5542c}\nh1{font-family:Fraunces,serif;color:#1A1A1A}\n");
  assert.equal(cli("check-system.mjs", [join(root, "design-system.md"), join(root, "src")]).code, 0);

  writeFileSync(join(root, "src", "new-page.css"), ".promo{\n  background:#7c3aed;\n  font-family:'Poppins', sans-serif;\n}\n");
  mkdirSync(join(root, "src", "node_modules"));
  writeFileSync(join(root, "src", "node_modules", "lib.css"), "x{color:#123456}");
  const r = cli("check-system.mjs", [join(root, "design-system.md"), join(root, "src"), "--out", join(root, "system.json")]);
  assert.equal(r.code, 1);
  const report = JSON.parse(readFileSync(join(root, "system.json"), "utf8"));
  assert.deepEqual(report.drift.map((d) => `${d.file.split("/").pop()}:${d.line}:${d.kind}:${d.value}`), ["new-page.css:2:color:#7c3aed", "new-page.css:3:font:poppins"]);
});

test("remember writes one idempotent block and keeps the rest of the file", () => {
  const root = tmpDir();
  writeFileSync(join(root, "design-system.md"), SYSTEM);
  writeFileSync(join(root, "CLAUDE.md"), "# Project\n\nUse pnpm.\n");
  assert.equal(cli("remember.mjs", [root]).code, 0);
  assert.equal(cli("remember.mjs", [root]).code, 0);
  const text = readFileSync(join(root, "CLAUDE.md"), "utf8");
  assert.equal(text.split(MARK_START).length - 1, 1);
  assert.match(text, /Use pnpm\./);
  assert.match(text, /design-system\.md/);
  assert.ok(!existsSync(join(root, "AGENTS.md")), "only existing files are updated when one exists");
  assert.ok(hasMemoryPointer(root));
});

test("remember creates CLAUDE.md and AGENTS.md when neither exists, and refuses without a design system", () => {
  const root = tmpDir();
  assert.equal(cli("remember.mjs", [root]).code, 2);
  writeFileSync(join(root, "design-system.md"), SYSTEM);
  const written = writeMemory(root);
  assert.deepEqual(written.map((w) => w.file), ["CLAUDE.md", "AGENTS.md"]);
  assert.ok(existsSync(join(root, "AGENTS.md")));
});
