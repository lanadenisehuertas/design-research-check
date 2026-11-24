// Create a run folder from templates. Never overwrites an existing run.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "templates");
const RUN_FILES = ["brief.md", "baseline.md", "queries.md", "synthesis.md", "design-spec.md", "decision-map.md", "verification.md", "references.json"];
const SUBDIRS = ["baseline", "refs", "proposals", "final"];

export function runId({ slug, now = new Date() }) {
  const p = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
  const safe = String(slug ?? "run").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "run";
  return `${stamp}-${safe}`;
}

export function createRun({ out, slug, id, ceiling = "C", mode = "redesign", depth = "deep" }) {
  const rid = id ?? runId({ slug });
  const dir = join(out, "design-research-check", rid);
  if (existsSync(dir)) throw new Error(`run already exists, refusing to overwrite: ${dir}`);
  mkdirSync(dir, { recursive: true });
  for (const sub of SUBDIRS) mkdirSync(join(dir, sub));
  const vars = { run_id: rid, ceiling, mode, depth };
  for (const f of RUN_FILES) {
    const body = readFileSync(join(TEMPLATES, f), "utf8").replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
    writeFileSync(join(dir, f), body);
  }
  return { dir, id: rid, files: [...RUN_FILES, ...readdirSync(dir).filter((x) => SUBDIRS.includes(x))] };
}
