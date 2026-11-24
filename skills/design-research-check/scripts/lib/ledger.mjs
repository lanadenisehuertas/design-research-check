// Source-ledger logic: URL canonicalisation, de-duplication, validation.
// Zero dependencies. Pure functions; the only I/O is an existsSync check for local images.
import { existsSync, statSync } from "node:fs";
import { extname, isAbsolute, relative, resolve } from "node:path";

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"]);

/** The saved image must be a non-empty image file inside the run folder. */
function checkLocalImage(tag, localImage, baseDir) {
  const abs = resolve(baseDir, localImage);
  const rel = relative(resolve(baseDir), abs);
  if (rel.startsWith("..") || isAbsolute(rel)) return [`${tag}: local_image must stay inside the run folder: ${localImage}`];
  if (!IMAGE_EXT.has(extname(abs).toLowerCase())) return [`${tag}: local_image is not an image file type: ${localImage}`];
  if (!existsSync(abs)) return [`${tag}: local_image not found: ${localImage}`];
  if (statSync(abs).size === 0) return [`${tag}: local_image is empty: ${localImage}`];
  return [];
}

export const PLATFORMS = ["pinterest", "behance", "dribbble", "cosmos", "collectui", "wallofportfolios", "user", "other"];
export const ACCESS_STATUS = ["ok", "partial", "blocked", "inaccessible"];
export const EVIDENCE_TYPES = [
  "visually_inspected_image",
  "visually_inspected_live_page",
  "text_only",
  "search_snippet",
  "inaccessible",
];
export const ORIGINS = ["discovered", "user_provided"];
export const ELEMENT_CATEGORIES = ["type", "grid", "spacing", "color", "imagery", "motif", "component", "motion", "ia"];
export const CONFIDENCE = ["observed", "inferred"];
export const REQUIRED_FIELDS = [
  "id", "platform", "source_url", "title", "creator", "accessed_at", "access_status",
  "evidence_type", "origin", "relevance", "limitations", "proposed_use", "avoid",
];

const TRACKING = /^(utm_.*|mibextid|fbclid|gclid|ref|ref_src|igshid|mt|si|s|share)$/i;

export function isInspected(ref) {
  return ref.evidence_type === "visually_inspected_image" || ref.evidence_type === "visually_inspected_live_page";
}

export function canonicalUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return String(raw).trim().toLowerCase();
  }
  u.hash = "";
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING.test(key)) u.searchParams.delete(key);
  }
  // http/https and www./m. variants of one page are the same work. Path case is kept.
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, "");
  const path = u.pathname.replace(/\/+$/, "");
  const query = u.searchParams.toString();
  const protocol = u.protocol === "http:" ? "https:" : u.protocol;
  return `${protocol}//${host}${path}${query ? `?${query}` : ""}`;
}

const STRENGTH = {
  visually_inspected_live_page: 4,
  visually_inspected_image: 3,
  text_only: 2,
  search_snippet: 1,
  inaccessible: 0,
};

/**
 * Collapse reposts. Two refs are the same underlying work when they share a
 * canonical original/source URL. The ref with the strongest evidence is kept.
 */
export function dedupe(refs) {
  const parent = refs.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a, b) => { parent[find(a)] = find(b); };

  const keyOwner = new Map();
  refs.forEach((ref, i) => {
    const keys = [canonicalUrl(ref.source_url)];
    if (ref.original_url) keys.push(canonicalUrl(ref.original_url));
    for (const k of keys) {
      if (keyOwner.has(k)) union(i, keyOwner.get(k));
      else keyOwner.set(k, i);
    }
  });

  const groups = new Map();
  refs.forEach((ref, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(ref);
  });

  const unique = [];
  const collapsed = [];
  for (const members of groups.values()) {
    const sorted = [...members].sort(
      (a, b) => (STRENGTH[b.evidence_type] ?? 0) - (STRENGTH[a.evidence_type] ?? 0),
    );
    const [kept, ...dropped] = sorted;
    unique.push(kept);
    for (const d of dropped) {
      collapsed.push({ kept: kept.id, dropped: d.id, reason: "same underlying work (shared canonical URL)" });
    }
  }
  unique.sort((a, b) => refs.indexOf(a) - refs.indexOf(b));
  return { unique, collapsed };
}

export function validateLedger(ledger, { baseDir = "." } = {}) {
  const errors = [];
  const warnings = [];
  const refs = Array.isArray(ledger?.references) ? ledger.references : null;
  if (!refs) {
    return { errors: ["ledger.references must be an array"], warnings, counts: { discovered: 0, unique: 0, inspected: 0, blocked: 0 } };
  }
  if (!ledger.run_id) errors.push("ledger.run_id is required");
  if (!["A", "B", "C"].includes(ledger.evidence_ceiling)) errors.push("ledger.evidence_ceiling must be A, B or C");

  const seen = new Set();
  for (const ref of refs) {
    const tag = ref?.id ?? "(no id)";
    for (const f of REQUIRED_FIELDS) {
      if (ref[f] === undefined || ref[f] === null || ref[f] === "") errors.push(`${tag}: missing required field ${f}`);
    }
    if (ref.id) {
      if (seen.has(ref.id)) errors.push(`${tag}: duplicate id`);
      seen.add(ref.id);
    }
    if (ref.platform && !PLATFORMS.includes(ref.platform)) errors.push(`${tag}: invalid platform "${ref.platform}"`);
    if (ref.access_status && !ACCESS_STATUS.includes(ref.access_status)) errors.push(`${tag}: invalid access_status "${ref.access_status}"`);
    if (ref.evidence_type && !EVIDENCE_TYPES.includes(ref.evidence_type)) errors.push(`${tag}: invalid evidence_type "${ref.evidence_type}"`);
    if (ref.origin === "generated") {
      errors.push(`${tag}: origin "generated" is not allowed in the external-reference ledger`);
    } else if (ref.origin && !ORIGINS.includes(ref.origin)) {
      errors.push(`${tag}: invalid origin "${ref.origin}"`);
    }

    if (isInspected(ref)) {
      if (!ref.local_image) errors.push(`${tag}: ${ref.evidence_type} requires local_image`);
      else errors.push(...checkLocalImage(tag, ref.local_image, baseDir));
      if (!String(ref.inspection_note ?? "").trim()) errors.push(`${tag}: ${ref.evidence_type} requires a non-empty inspection_note`);
    }
    if (ref.access_status === "blocked" || ref.access_status === "inaccessible") {
      if (isInspected(ref)) errors.push(`${tag}: a ${ref.access_status} source cannot be marked visually inspected`);
    }

    for (const el of ref.elements ?? []) {
      if (!ELEMENT_CATEGORIES.includes(el.category)) errors.push(`${tag}: invalid element category "${el.category}"`);
      if (!CONFIDENCE.includes(el.confidence)) errors.push(`${tag}: invalid element confidence "${el.confidence}"`);
      if (el.confidence === "observed" && !isInspected(ref)) {
        errors.push(`${tag}: ${ref.evidence_type} cannot support an observed visual element (use confidence "inferred" or inspect the image)`);
      }
    }
    if (ref.creator === "unknown") warnings.push(`${tag}: creator unknown`);
    if (ref.curated === true && !isInspected(ref)) errors.push(`${tag}: only visually inspected references can be curated`);
  }

  const { unique, collapsed } = dedupe(refs);
  for (const c of collapsed) warnings.push(`${c.dropped}: duplicate of ${c.kept}, counted once`);

  return {
    errors,
    warnings,
    counts: {
      discovered: refs.length,
      unique: unique.length,
      inspected: unique.filter(isInspected).length,
      blocked: unique.filter((r) => r.access_status === "blocked" || r.access_status === "inaccessible").length,
      curated: unique.filter((r) => r.curated === true && isInspected(r)).length,
    },
  };
}
