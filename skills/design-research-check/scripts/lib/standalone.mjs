// Build the standalone operating prompt from the canonical skill, so the rules cannot drift.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ORDER = [
  "modes", "capabilities", "brief", "baseline", "research", "ledger", "elements",
  "synthesis", "proposals", "implement", "verify", "providers", "fallbacks", "final-response",
];

const PREAMBLE = `# design-research-check: standalone operating prompt

GENERATED FILE. Do not edit. Source: skills/design-research-check/ (run \`node skills/design-research-check/scripts/build-standalone.mjs\`).

You are following the design-research-check workflow in an agent that has no native plugin or skill support for it.
A prompt cannot create browsing, vision, image generation or file access. Use the tools you actually have, and say what you lack.
Where the text says "scripts/", the Node helpers exist in the repository at skills/design-research-check/scripts/. If you cannot run them, apply the same rules by hand and say you did.
Capability requirement for the full evidence-led run (ceiling A): a browser, image vision, local file access and a way to render the app. Without them, follow the fallbacks and state your ceiling.
`;

export function stripFrontmatter(md) {
  return md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

export function buildStandalone(skillDir) {
  const parts = [PREAMBLE.trimEnd(), "", "---", "", stripFrontmatter(readFileSync(join(skillDir, "SKILL.md"), "utf8")).trim()];
  for (const name of ORDER) {
    parts.push("", "---", "", readFileSync(join(skillDir, "references", `${name}.md`), "utf8").trim());
  }
  return parts.join("\n").replace(/\r\n/g, "\n") + "\n";
}

export const REFERENCE_ORDER = ORDER;
