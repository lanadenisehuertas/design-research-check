// Static scan for the default choices that make a page read as AI-generated ("AI slop tells").
// A tell is a default, not a crime: the scan lists them so the baseline names concrete problems and the
// final render can show they were replaced on purpose. It reads source text only; it does not render.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const EXT = new Set([".html", ".htm", ".css", ".scss", ".sass", ".less", ".jsx", ".tsx", ".js", ".ts", ".vue", ".svelte", ".astro", ".mdx"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "out", ".next", ".nuxt", ".svelte-kit", "coverage", "design-research-check", "vendor"]);

const PURPLE = "(#(?:6366f1|4f46e5|4338ca|818cf8|8b5cf6|7c3aed|6d28d9|a855f7|9333ea|7e22ce|c084fc|a78bfa|d946ef|ec4899)|\\b(?:purple|indigo|violet|fuchsia)\\b)";

/** Each tell: id, severity (high | medium | low), what it is, and a per-line regex. */
export const TELLS = [
  { id: "purple-gradient", severity: "high", what: "purple/indigo/violet gradient", re: new RegExp(`(linear|radial|conic)-gradient\\([^;\\n]*${PURPLE}|\\b(from|via|to)-(purple|indigo|violet|fuchsia)-\\d{2,3}\\b`, "i") },
  { id: "gradient-text", severity: "high", what: "gradient-filled text", re: /background-clip:\s*text|-webkit-background-clip:\s*text|\bbg-clip-text\b/i },
  { id: "emoji-icon", severity: "high", what: "emoji used as icon or label", re: /[\u{1F300}-\u{1FAFF}\u{2728}\u{26A1}\u{2B50}\u{2615}\u{2705}\u{274C}]/u },
  { id: "filler-copy", severity: "medium", what: "stock marketing phrase", re: /\b(elevate your|unlock (the|your)|seamless(ly)?\b|supercharge|revolutioni[sz]e|next[- ]level|empower(s|ing)? (you|your)|effortless(ly)?\b|cutting[- ]edge|game[- ]chang|join our community|discover (premium|the power|the future)|transform your|all[- ]in[- ]one|unleash|look no further|in today's fast[- ]paced)/i },
  { id: "generic-cta", severity: "low", what: "generic call to action", re: />\s*(get started|learn more|sign up now|start your journey)\s*</i },
  { id: "glassmorphism", severity: "medium", what: "frosted-glass panel", re: /backdrop-filter:\s*blur|\bbackdrop-blur(-\w+)?\b/i },
  { id: "glow-shadow", severity: "medium", what: "colored glow shadow", re: new RegExp(`box-shadow:[^;\\n]*0\\s+0\\s+\\d{2,}px[^;\\n]*(${PURPLE}|rgba?\\(\\s*(99|124|139|168|147)\\s*,)|\\bshadow-(purple|indigo|violet)-\\d{3}`, "i") },
  { id: "three-equal-cards", severity: "low", what: "row of three identical cards", re: /grid-template-columns:\s*repeat\(\s*3\s*,\s*1fr\s*\)|\bgrid-cols-3\b/i },
  { id: "pill-everything", severity: "low", what: "pill-shaped buttons and inputs by default", re: /border-radius:\s*(999|9999)px|\brounded-full\b/i },
  { id: "default-font-only", severity: "medium", what: "only a default sans (Inter, Roboto, Arial, system-ui)", re: null },
  { id: "centered-hero", severity: "low", what: "centered hero block", re: null },
];

function walk(p, out) {
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const e of readdirSync(p)) {
      if (SKIP_DIRS.has(e) || e.startsWith(".")) continue;
      walk(join(p, e), out);
    }
  } else if (EXT.has(extname(p).toLowerCase()) && st.size < 1_000_000 && !/\.min\.(js|css)$/i.test(p)) {
    out.push(p);
  }
  return out;
}

const DEFAULT_FONTS = /^(inter|roboto|arial|helvetica( neue)?|system-ui|-apple-system|blinkmacsystemfont|segoe ui|sans-serif|ui-sans-serif|var\(--[\w-]+\))$/i;

/** Scan files or folders. Returns { files, tells: [{id, severity, what, file, line, text}], counts, weighted }. */
export function scanSlop(paths, { root = process.cwd() } = {}) {
  const files = paths.flatMap((p) => walk(p, []));
  const tells = [];
  const families = new Set();
  let heroCentered = null;
  for (const file of files) {
    const rel = relative(root, file).replace(/\\/g, "/");
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    let inHeroRule = false;
    lines.forEach((text, i) => {
      for (const t of TELLS) {
        if (t.re && t.re.test(text)) tells.push({ id: t.id, severity: t.severity, what: t.what, file: rel, line: i + 1, text: text.trim().slice(0, 160) });
      }
      for (const m of text.matchAll(/font-family:\s*([^;}\n]+)/gi)) {
        for (const f of m[1].split(",")) families.add(f.trim().replace(/^["']|["']$/g, ""));
      }
      if (/hero[^{]*\{/i.test(text)) inHeroRule = true;
      if (inHeroRule && /text-align:\s*center/i.test(text) && !heroCentered) heroCentered = { file: rel, line: i + 1, text: text.trim() };
      if (/class(Name)?=["'][^"']*\bhero\b[^"']*\btext-center\b|\btext-center\b[^"']*\bhero\b/.test(text) && !heroCentered) heroCentered = { file: rel, line: i + 1, text: text.trim().slice(0, 160) };
      if (text.includes("}")) inHeroRule = false;
    });
  }
  const real = [...families].filter((f) => f && !/^(inherit|initial|unset|monospace|serif)$/i.test(f));
  if (real.length > 0 && real.every((f) => DEFAULT_FONTS.test(f))) {
    tells.push({ id: "default-font-only", severity: "medium", what: "only a default sans (Inter, Roboto, Arial, system-ui)", file: "(all styles)", line: 0, text: real.join(", ") });
  }
  if (heroCentered) tells.push({ id: "centered-hero", severity: "low", what: "centered hero block", ...heroCentered });

  const counts = {};
  for (const t of tells) counts[t.id] = (counts[t.id] || 0) + 1;
  const W = { high: 3, medium: 2, low: 1 };
  // Weighted score counts each tell type once, so 40 emoji do not drown out everything else.
  const weighted = Object.keys(counts).reduce((s, id) => s + W[TELLS.find((t) => t.id === id).severity], 0);
  return { files: files.length, tells, counts, weighted };
}
