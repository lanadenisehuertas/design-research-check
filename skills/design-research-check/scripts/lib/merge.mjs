// Merge per-source ledger shards into one de-duplicated reference list.
import { dedupe } from "./ledger.mjs";

/**
 * @param {{references: object[]}[]} shards
 * @returns {{references: object[], collapsed: object[], idCollisions: object[], counts: {discovered:number, unique:number}}}
 */
export function mergeShards(shards) {
  const all = [];
  shards.forEach((shard, shardIndex) => {
    for (const ref of shard.references ?? []) all.push({ ...ref, __shard: shardIndex });
  });

  const { unique, collapsed } = dedupe(all);

  // Different works can reuse an id across shards. Rename later ones, report the rename.
  const used = new Set();
  const idCollisions = [];
  const references = unique.map((ref) => {
    const { __shard, ...clean } = ref;
    if (!used.has(clean.id)) {
      used.add(clean.id);
      return clean;
    }
    let candidate = `${clean.id}-s${__shard + 1}`;
    let n = 2;
    while (used.has(candidate)) candidate = `${clean.id}-s${__shard + 1}-${n++}`;
    idCollisions.push({ from: clean.id, to: candidate });
    used.add(candidate);
    return { ...clean, id: candidate };
  });

  return {
    references,
    collapsed,
    idCollisions,
    counts: { discovered: all.length, unique: references.length },
  };
}
