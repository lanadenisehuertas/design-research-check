#!/usr/bin/env node
// Usage: node check-claims.mjs --ceiling A|B|C [--render true|false] [--verification verification.md] [--spec design-spec.md --ledger references.json]
// Exit 0 = ok, 1 = problems, 2 = bad usage.
import { readFileSync } from "node:fs";
import { checkSpecCitations, checkVerificationClaims } from "./lib/claims.mjs";

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const ceiling = opt("ceiling");
if (!ceiling) {
  console.error("usage: check-claims.mjs --ceiling A|B|C [--verification f] [--spec f --ledger f]");
  process.exit(2);
}
const result = { errors: [], unsupported: [] };
if (opt("verification")) {
  const render = opt("render") !== "false";
  result.errors.push(...checkVerificationClaims({ ceiling, render, text: readFileSync(opt("verification"), "utf8") }).errors);
}
if (opt("spec")) {
  if (!opt("ledger")) {
    console.error("--spec needs --ledger");
    process.exit(2);
  }
  const r = checkSpecCitations({
    specText: readFileSync(opt("spec"), "utf8"),
    ledger: JSON.parse(readFileSync(opt("ledger"), "utf8")),
  });
  result.errors.push(...r.errors);
  result.unsupported.push(...r.unsupported);
}
console.log(JSON.stringify(result, null, 2));
process.exit(result.errors.length ? 1 : 0);
