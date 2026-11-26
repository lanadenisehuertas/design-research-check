// Design-system memory: read the tokens block from design-system.md, find colors and font families in source that
// the tokens do not declare (drift), and keep a pointer in CLAUDE.md / AGENTS.md so later sessions load the rules.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

export const MARK_START = "<!-- design-research-check:start -->";
export const MARK_END = "<!-- design-research-check:end -->";
export const MEMORY_FILES = ["CLAUDE.md", "AGENTS.md"];

/** The first ```json block in design-system.md. Throws with a readable reason. */
export function parseTokens(markdown) {
  const m = /```json\s*\n([\s\S]*?)\n```/.exec(markdown);
  if (!m) throw new Error("design-system.md has no ```json tokens block");
  let t;
  try {
    t = JSON.parse(m[1]);
  } catch (e) {
    throw new Error(`the tokens block is not valid JSON: ${e.message}`);
  }
  const colors = new Set();
  const walk = (v) => {
    if (typeof v === "string") for (const c of findColors(v)) colors.add(c.hex);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(t.colors ?? {});
  const fonts = new Set();
  const addFonts = (v) => {
    if (typeof v === "string") splitFamilies(v).forEach((f) => fonts.add(f));
    else if (Array.isArray(v)) v.forEach(addFonts);
    else if (v && typeof v === "object") Object.values(v).forEach(addFonts);
  };
  addFonts(t.fonts ?? {});
  return { raw: t, colors, fonts };
}

// ---- colors -------------------------------------------------------------------------------------------------
const hex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function toHex(r, g, b, a) {
  const base = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  return a === undefined || a >= 1 ? base : `${base}${hex2(a * 255)}`;
}

const num = (s, scale = 1) => (s.trim().endsWith("%") ? (parseFloat(s) / 100) * scale : parseFloat(s));
const HEX = /(?<![&\w])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const FUNC = /\b(rgba?|hsla?)\(\s*([^)]*)\)/gi;
const ANCHOR_BEFORE = /(href\s*=\s*["']?|url\(\s*["']?|getElementById\(\s*["']|querySelector(All)?\(\s*["'])$/i;

/** Every hex, rgb() and hsl() color in a string, normalized to lowercase #rrggbb or #rrggbbaa. */
export function findColors(text) {
  const out = [];
  for (const m of text.matchAll(HEX)) {
    if (ANCHOR_BEFORE.test(text.slice(Math.max(0, m.index - 30), m.index))) continue;
    let h = m[1].toLowerCase();
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    if (h.length === 8 && h.endsWith("ff")) h = h.slice(0, 6);
    out.push({ raw: m[0], hex: `#${h}`, index: m.index });
  }
  for (const m of text.matchAll(FUNC)) {
    const parts = m[2].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3 || parts.some((p) => /var\(|calc\(|^from$/.test(p))) continue;
    const alpha = parts[3] !== undefined ? num(parts[3], 1) : undefined;
    let rgb;
    if (/^rgb/i.test(m[1])) rgb = parts.slice(0, 3).map((p) => num(p, 255));
    else rgb = hslToRgb(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]));
    if (rgb.some(Number.isNaN)) continue;
    out.push({ raw: m[0], hex: toHex(...rgb, alpha), index: m.index });
  }
  return out;
}

// ---- fonts --------------------------------------------------------------------------------------------------
const KEYWORDS = new Set(["inherit", "initial", "unset", "revert", "revert-layer"]);

export function splitFamilies(value) {
  return value
    .split(",")
    .map((f) => f.trim().replace(/^["']|["']$/g, "").trim().toLowerCase())
    .filter((f) => f && !/^var\(|^\$|^\{/.test(f));
}

// font-family in CSS and inline styles, fontFamily in JS/JSX style objects.
const FONT_DECL = /(?:font-family\s*:\s*((?:[^;}\n"]|"[^"]*")+)|fontFamily\s*:\s*(["'`])([^"'`]+)\2)/gi;

/** The primary family of each declaration. Fallbacks after the first comma are not drift. */
export function findFonts(text) {
  const out = [];
  for (const m of text.matchAll(FONT_DECL)) {
    const [first] = splitFamilies(m[1] ?? m[3]);
    if (first && !KEYWORDS.has(first)) out.push({ family: first, index: m.index });
  }
  return out;
}

// ---- scanning -----------------------------------------------------------------------------------------------
const SOURCE_EXT = new Set([".css", ".scss", ".sass", ".less", ".html", ".htm", ".jsx", ".tsx", ".js", ".ts", ".mjs", ".vue", ".svelte", ".astro", ".mdx"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "out", ".next", ".nuxt", ".svelte-kit", ".astro", "coverage", "vendor", "design-research-check", ".cache", ".vercel", ".turbo"]);

function* walkFiles(p) {
  const st = statSync(p);
  if (st.isFile()) {
    if (SOURCE_EXT.has(extname(p).toLowerCase()) && !/\.min\.|\.test\.|\.spec\./.test(p)) yield p;
    return;
  }
  for (const name of readdirSync(p)) {
    if (SKIP_DIRS.has(name) || name.startsWith(".")) continue;
    yield* walkFiles(join(p, name));
  }
}

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/** Colors and font families used in `paths` that the tokens do not declare. */
export function scanDrift({ tokens, paths, root = process.cwd() }) {
  const drift = [];
  let files = 0;
  for (const start of paths) {
    if (!existsSync(start)) continue;
    for (const file of walkFiles(start)) {
      const text = readFileSync(file, "utf8");
      if (text.length > 2_000_000) continue;
      files++;
      const rel = relative(root, file).replace(/\\/g, "/");
      for (const c of findColors(text)) {
        if (!tokens.colors.has(c.hex)) drift.push({ file: rel, line: lineOf(text, c.index), kind: "color", value: c.raw, normalized: c.hex });
      }
      for (const f of findFonts(text)) {
        if (!tokens.fonts.has(f.family)) drift.push({ file: rel, line: lineOf(text, f.index), kind: "font", value: f.family });
      }
    }
  }
  const distinct = (kind) => [...new Set(drift.filter((d) => d.kind === kind).map((d) => d.normalized ?? d.value))];
  return { files, drift, counts: { colors: distinct("color").length, fonts: distinct("font").length, occurrences: drift.length } };
}

// ---- memory pointer -----------------------------------------------------------------------------------------
export function memoryBlock() {
  return [
    MARK_START,
    "## Design system",
    "",
    "This project's look is defined in `design-system.md` (written by a design-research-check run). Before any UI change:",
    "",
    "1. Read `design-system.md`. Use its tokens and component rules. Do not add colors or font families outside its `json` tokens block.",
    "2. If a page needs something the file does not cover, extend `design-system.md` in the same change, then use the new token.",
    "3. Keep text contrast at 4.5:1 or more, no horizontal scroll at 390px, labels on every field and a visible focus style.",
    "4. If the design-research-check skill is installed, run its `check-system.mjs design-system.md <source folders>` after UI changes. It lists colors and fonts that drifted from the tokens.",
    MARK_END,
  ].join("\n");
}

/** Insert or replace the block in each file. Creates CLAUDE.md and AGENTS.md when neither exists. */
export function writeMemory(root, files) {
  const targets = files?.length ? files : MEMORY_FILES.filter((f) => existsSync(join(root, f)));
  const list = targets.length ? targets : MEMORY_FILES;
  const block = memoryBlock();
  const written = [];
  for (const f of list) {
    const p = join(root, f);
    const old = existsSync(p) ? readFileSync(p, "utf8") : "";
    const re = new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`);
    const next = re.test(old) ? old.replace(re, block) : `${old}${old && !old.endsWith("\n") ? "\n" : ""}${old ? "\n" : ""}${block}\n`;
    if (next !== old) writeFileSync(p, next);
    written.push({ file: f, action: !old ? "created" : re.test(old) ? (next === old ? "unchanged" : "updated") : "appended" });
  }
  return written;
}

export function hasMemoryPointer(root) {
  return MEMORY_FILES.some((f) => existsSync(join(root, f)) && readFileSync(join(root, f), "utf8").includes(MARK_START));
}
