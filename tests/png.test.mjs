import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { cropPng, encodeRgba, readPngSize } from "../skills/design-research-check/scripts/lib/png.mjs";

const pixel = (x, y) => (x < 390 ? [x % 256, y % 256, 200, 255] : [119, 119, 119, 255]);

test("cropPng cuts a 600px capture to 390px and keeps the pixels", () => {
  const src = encodeRgba(600, 20, pixel);
  const out = cropPng(src, 390);
  assert.deepEqual(readPngSize(out), { width: 390, height: 20 });
  // Decode the cropped image: row 5, pixel 300 must match the source pixel and no grey column may remain.
  const idat = [];
  let off = 8;
  while (off < out.length) {
    const len = out.readUInt32BE(off);
    if (out.toString("ascii", off + 4, off + 8) === "IDAT") idat.push(out.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const row = 5 * (390 * 4 + 1) + 1;
  assert.deepEqual([...raw.subarray(row + 300 * 4, row + 300 * 4 + 4)], [300 % 256, 5, 200, 255]);
  assert.notDeepEqual([...raw.subarray(row + 389 * 4, row + 389 * 4 + 3)], [119, 119, 119]);
});

test("cropPng returns the input unchanged when already narrow enough", () => {
  const src = encodeRgba(100, 10, () => [0, 0, 0, 255]);
  assert.equal(cropPng(src, 390), src);
});

test("cropPng rejects non-PNG input", () => {
  assert.throws(() => cropPng(Buffer.from("not a png"), 10), /not a PNG/);
});
