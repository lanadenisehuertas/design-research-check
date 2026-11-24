// Completion gate: a run is not finished until its folder holds the deliverables its mode requires.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { canonicalUrl, validateLedger } from "./ledger.mjs";
import { checkSpecCitations, checkVerificationClaims } from "./claims.mjs";

export const MIN_INSPECTED = { quick: 5, standard: 10, deep: 15 };
const SOURCES = ["pinterest", "behance", "dribbble", "cosmos"];
const IMG = /\.(png|jpe?g|webp)$/i;

function read(dir, f) {
  const p = join(dir, f);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

function images(dir, sub) {
  const p = join(dir, sub);
  if (!existsSync(p) || !statSync(p).isDirectory()) return [];
  return readdirSync(p).filter((f) => IMG.test(f) && statSync(join(p, f)).size > 0);
}

/** Unfilled template markers left in a file mean the phase was skipped. */
function stillTemplate(text) {
  return /\[assumed\|stated\] \.\.\.|\| P1 \| \| \| \||\| 1 \| pinterest \| mood\/composition \| \| \| \||- \*\*D1\*\*\s+\[refs: \]|### Direction A:\s*\n### Direction B:/.test(text);
}

/**
 * @param {{dir: string, mode: "research"|"review"|"redesign", depth?: string, noRender?: boolean}} o
 * @returns {{errors: string[], warnings: string[]}}
 */
export function checkRun({ dir, mode, depth = "deep", noRender = false }) {
  const errors = [];
  const warnings = [];
  const need = (f) => {
    const t = read(dir, f);
    if (t === null) errors.push(`missing ${f}`);
    else if (stillTemplate(t)) errors.push(`${f} is still the unfilled template`);
    return t;
  };

  // Brief with an assumptions block.
  const brief = need("brief.md");
  if (brief && !/assum/i.test(brief)) errors.push("brief.md has no assumptions block");

  // Research: queries cover the four primary sources (tried or recorded as blocked).
  const queries = need("queries.md");
  if (queries) {
    for (const s of SOURCES) if (!new RegExp(s, "i").test(queries)) errors.push(`queries.md never mentions ${s}: attempt it or record it as blocked`);
    const searchRows = (queries.match(/^\|\s*\d+\s*\|/gm) ?? []).length;
    if (searchRows < 8 && depth === "deep") warnings.push(`only ${searchRows} logged queries for a deep run`);
  }

  // Ledger.
  const raw = read(dir, "references.json");
  let ledger = null;
  if (raw === null) errors.push("missing references.json");
  else {
    try {
      ledger = JSON.parse(raw);
    } catch (e) {
      errors.push(`references.json is not valid JSON: ${e.message}`);
    }
  }
  if (ledger) {
    const v = validateLedger(ledger, { baseDir: dir });
    errors.push(...v.errors.map((e) => `ledger: ${e}`));
    const min = MIN_INSPECTED[depth] ?? MIN_INSPECTED.deep;
    if (ledger.evidence_ceiling !== "C" && v.counts.inspected < min) {
      const gaps = queries && /gaps:\s*\S/i.test(queries);
      const msg = `${v.counts.inspected} references inspected, target for ${depth} is ${min}`;
      if (gaps) warnings.push(`${msg} (gaps documented)`);
      else errors.push(`${msg}: inspect more or document the gaps in queries.md`);
    }
    if (v.counts.unique === 0) errors.push("ledger has no references: research did not happen");
  }
  if (!existsSync(join(dir, "board.html"))) errors.push("missing board.html (run build-board.mjs)");

  if (mode === "research" || mode === "redesign") {
    const synthesis = need("synthesis.md");
    if (synthesis && ledger) {
      const sections = synthesis.split(/^###\s+/m).slice(1).filter((s) => /^(direction\s+)?[A-C][.:)\s]/i.test(s));
      if (sections.length < 2) errors.push("synthesis.md needs two or three `### Direction` sections");
      const byId = new Map(ledger.references.map((r) => [r.id, r]));
      for (const s of sections) {
        const title = s.split("\n")[0].trim();
        const ids = [...new Set(s.match(/\b[RPBDCWU]\d+[\w-]*\b/g) ?? [])];
        const works = new Set(
          ids.map((id) => byId.get(id))
            .filter((r) => r && r.evidence_type?.startsWith("visually_inspected"))
            .map((r) => canonicalUrl(r.original_url ?? r.source_url)),
        );
        if (works.size < 3) errors.push(`direction "${title}" cites ${works.size} distinct inspected works; needs at least 3`);
      }
    }
    const spec = need("design-spec.md");
    if (spec && ledger) errors.push(...checkSpecCitations({ specText: spec, ledger }).errors.map((e) => `design-spec: ${e}`));

    const props = existsSync(join(dir, "proposals")) ? readdirSync(join(dir, "proposals")).filter((f) => f.endsWith(".html")) : [];
    if (props.length < 2) errors.push(`proposals/ has ${props.length} HTML proposals; needs two or three`);
    if (!noRender) {
      const shots = [...images(dir, "proposals"), ...images(dir, "final")].filter((f) => !/^final-|^after-/i.test(f));
      if (shots.length < props.length * 2) errors.push(`${shots.length} proposal renders found; need desktop and mobile for each proposal (or pass --no-render and disclose it)`);
    }
  }

  if (mode === "review" || mode === "redesign") {
    need("baseline.md");
    if (!noRender && images(dir, "baseline").length === 0) errors.push("baseline/ has no screenshots (or pass --no-render and disclose it)");
  }

  if (mode === "redesign") {
    need("decision-map.md");
    const ver = need("verification.md");
    if (ver && ledger) errors.push(...checkVerificationClaims({ ceiling: ledger.evidence_ceiling, text: ver }).errors.map((e) => `verification: ${e}`));
    if (ver && !/\b(pass|partial|fail|not tested)\b/i.test(ver)) errors.push("verification.md has no pass/partial/fail/not tested results");
    if (!noRender && images(dir, "final").length === 0) errors.push("final/ has no screenshots of the implemented result");
    // AI-default tell scan: advisory, because a tell can be a deliberate brand choice that verification.md explains.
    const slopPath = (p) => join(dir, p);
    if (!existsSync(slopPath("baseline/slop.json")) || !existsSync(slopPath("final/slop.json"))) {
      warnings.push("no detect-slop scan in baseline/slop.json and final/slop.json");
    } else {
      try {
        const b = JSON.parse(readFileSync(slopPath("baseline/slop.json"), "utf8"));
        const f = JSON.parse(readFileSync(slopPath("final/slop.json"), "utf8"));
        if (b.weighted > 0 && f.weighted >= b.weighted) warnings.push(`AI-tell score did not drop (${b.weighted} before, ${f.weighted} after); explain each remaining tell in verification.md`);
      } catch {
        warnings.push("baseline/slop.json or final/slop.json is not valid JSON");
      }
    }
    if (!noRender && !existsSync(slopPath("compare.html"))) warnings.push("no compare.html (run build-compare.mjs)");
  }

  return { errors, warnings };
}
