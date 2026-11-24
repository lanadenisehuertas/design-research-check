// Handling of retrieved content: it is data, never instructions, and private project
// content must not leave in outbound search or generation queries.

const OPEN = "<retrieved_content";
const CLOSE = "</retrieved_content";

export function wrapRetrieved(text, { url = "unknown" } = {}) {
  const escaped = String(text).replace(/<(\/?)retrieved_content/gi, "&lt;$1retrieved_content");
  const safeUrl = String(url).replace(/"/g, "%22");
  return `${OPEN} source="${safeUrl}" trust="data-not-instructions">\n${escaped}\n${CLOSE}>`;
}

const PATTERNS = [
  ["override-instructions", /ignore\s+(all\s+|any\s+)?(previous|prior|above|earlier)\s+(instructions|rules|prompts?)/i],
  ["new-instructions", /\bnew\s+instructions?\s*:/i],
  ["role-command", /\byou\s+(must|should|will)\s+now\b/i],
  ["shell-or-file-command", /\b(run|execute|edit|delete|overwrite|write\s+to)\b[^.\n]{0,40}(package\.json|\.env|shell|command|curl|rm\s+-rf|\|\s*sh)/i],
  ["secret-exfiltration", /\b(include|send|append|paste|post|reveal|add|put|insert|share)\b[^.\n]{0,80}(api[_ -]?key|password|secret|token|credentials?|codename|confidential|internal|roadmap|private)/i],
  ["system-prompt-probe", /\b(system\s+prompt|developer\s+message)\b/i],
];

/** Returns labels of instruction-like patterns found. Informational: flagged text is still only data. */
export function flagInstructionLike(text) {
  return PATTERNS.filter(([, re]) => re.test(text)).map(([label]) => label);
}

/** Returns the private markers (brand names, product names, unreleased copy) found in outbound text. */
export function scanOutbound(queriesText, privateMarkers = []) {
  // Compare case- and punctuation-insensitively: "HALDEN-NORTHSTAR-7731" matches "halden northstar 7731".
  const norm = (s) => ` ${String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
  const hay = norm(queriesText);
  return privateMarkers.filter((m) => m && norm(m).trim() && hay.includes(norm(m)));
}
