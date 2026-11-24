// Claim checks: stop verification text from over-claiming, and make every design
// decision trace to a visually inspected reference.
import { isInspected } from "./ledger.mjs";

const NEGATION = /\b(not|never|cannot|can't|no|nothing|none|without|unable to)\b\W+(\w+\W+){0,3}$|n't\W+(\w+\W+){0,3}$/i;

function findClaims(text, pattern) {
  const hits = [];
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  let m;
  while ((m = re.exec(text)) !== null) {
    // Only a negation in the same clause counts ("not cropped; visually verified" is still a claim).
    const window = text.slice(Math.max(0, m.index - 60), m.index);
    const before = window.split(/[.!?;,\n]/).pop();
    if (!NEGATION.test(before)) hits.push(m[0]);
  }
  return hits;
}

const VISUAL = /visually[\s-]+(verified|inspected|confirmed|validated|checked)|(verified|checked|confirmed|inspected|validated)\s+visually/i;
const LIVE = /verified\s+(in|against|on)\s+the\s+(live|running|rendered)\s+(interface|app|page|site|ui)/i;

/**
 * Ceiling A: browser + vision. Ceiling B: user-supplied images only. Ceiling C: text only.
 * A negated statement ("not visually verified") is honest and always allowed.
 */
export function checkVerificationClaims({ ceiling, text, render = true }) {
  const errors = [];
  if (!render && ceiling !== "C") {
    // Verification depends on rendering the result, whatever the research ceiling was.
    for (const hit of findClaims(text, VISUAL)) errors.push(`no render was available, so "${hit}" cannot be claimed`);
    for (const hit of findClaims(text, LIVE)) errors.push(`no render was available, so "${hit}" cannot be claimed`);
  }
  if (ceiling === "C") {
    for (const hit of findClaims(text, VISUAL)) errors.push(`ceiling C forbids the claim "${hit}"`);
    for (const hit of findClaims(text, LIVE)) errors.push(`ceiling C forbids the claim "${hit}"`);
  } else if (ceiling === "B") {
    for (const hit of findClaims(text, LIVE)) errors.push(`ceiling B forbids the claim "${hit}" (only supplied images were inspected)`);
  } else if (ceiling !== "A") {
    errors.push(`unknown ceiling "${ceiling}"`);
  }
  return { errors };
}

const DECISION = /^\s*[-*]\s+\*\*(D\d+)\*\*(.*)$/;
const REFS = /\[refs?:\s*([^\]]*)\]/i;

/** Join indented continuation lines onto the decision line they belong to. */
function decisionLines(specText) {
  const out = [];
  for (const line of specText.split(/\r?\n/)) {
    if (DECISION.test(line)) out.push(line);
    else if (out.length && /^\s+\S/.test(line) && !/^\s*[-*]\s/.test(line)) out[out.length - 1] += " " + line.trim();
    else if (out.length && line.trim() === "") out.push("");
  }
  return out.filter(Boolean);
}

/**
 * design-spec.md decision lines: `- **D3** decision text [refs: R02, R05]`.
 * A decision is supported only if it cites at least one visually inspected reference.
 */
export function checkSpecCitations({ specText, ledger }) {
  const errors = [];
  const unsupported = [];
  const byId = new Map((ledger.references ?? []).map((r) => [r.id, r]));
  const lines = decisionLines(specText);
  if (lines.length === 0) {
    return { errors: ["no decisions found: write each as `- **D<n>** text [refs: R01]`"], unsupported };
  }

  for (const line of lines) {
    const [, id, rest] = DECISION.exec(line);
    const labeled = /unsupported assumption/i.test(rest);
    const refMatch = REFS.exec(rest);
    const cited = refMatch ? refMatch[1].split(",").map((s) => s.trim()).filter(Boolean) : [];

    let hasInspected = false;
    for (const refId of cited) {
      const ref = byId.get(refId);
      if (!ref) errors.push(`${id}: cites ${refId}, which is not in the ledger`);
      else if (isInspected(ref)) hasInspected = true;
    }
    if (!hasInspected) {
      unsupported.push(id);
      if (!labeled) {
        const why = cited.length ? "cited references are not visually inspected" : "no references cited";
        errors.push(`${id}: ${why}. Cite an inspected reference or label it "unsupported assumption"`);
      }
    }
  }
  return { errors, unsupported };
}
