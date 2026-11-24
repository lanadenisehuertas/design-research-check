#!/usr/bin/env node
// Usage: node build-board.mjs <references.json> <out.html>
// Writes the reference board. Only visually inspected references get image cards.
// Image paths in the page are relative to the ledger file, so put out.html in the same folder.
import { readFileSync, writeFileSync } from "node:fs";
import { renderBoard } from "./lib/board.mjs";

const [file, out] = process.argv.slice(2);
if (!file || !out) {
  console.error("usage: build-board.mjs <references.json> <out.html>");
  process.exit(2);
}
writeFileSync(out, renderBoard(JSON.parse(readFileSync(file, "utf8"))));
console.log(`wrote ${out}`);
