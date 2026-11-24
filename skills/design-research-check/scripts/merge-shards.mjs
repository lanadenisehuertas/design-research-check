#!/usr/bin/env node
// Usage: node merge-shards.mjs <out.json> <shard1.json> <shard2.json> ...
// Each shard is a ledger-shaped JSON file written by one research subagent.
import { readFileSync, writeFileSync } from "node:fs";
import { mergeShards } from "./lib/merge.mjs";

const [out, ...shardFiles] = process.argv.slice(2);
if (!out || shardFiles.length === 0) {
  console.error("usage: merge-shards.mjs <out.json> <shard.json>...");
  process.exit(2);
}
// A shard may be a ledger object ({ references: [...] }) or a bare array of references.
const shards = shardFiles.map((f) => {
  const j = JSON.parse(readFileSync(f, "utf8"));
  if (Array.isArray(j)) return { references: j };
  if (!Array.isArray(j?.references)) {
    console.error(`${f}: expected an array of references or an object with a "references" array`);
    process.exit(1);
  }
  return j;
});
const first = shards[0];
const merged = mergeShards(shards);
writeFileSync(
  out,
  JSON.stringify(
    {
      run_id: first.run_id,
      fixture: shards.every((s) => s.fixture === true),
      evidence_ceiling: first.evidence_ceiling,
      references: merged.references,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ counts: merged.counts, collapsed: merged.collapsed, idCollisions: merged.idCollisions }, null, 2));
