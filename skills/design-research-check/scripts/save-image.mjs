#!/usr/bin/env node
// Usage: node save-image.mjs <image-url> <out-file-without-or-with-extension>
// Downloads one public image (for example a page's og:image or a shot's image URL) so it can be
// viewed and cited as a visually inspected reference. Refuses non-images and files over 15 MB.
// Does not send cookies or credentials, and does not bypass login walls.
// For many references at once, use capture-refs.mjs: it also reads og:image from pages and writes ledger entries.
import { saveImage } from "./lib/capture.mjs";

const [url, outArg] = process.argv.slice(2);
if (!url || !outArg || !/^https?:\/\//i.test(url)) {
  console.error("usage: save-image.mjs <http(s)-image-url> <out-file>");
  process.exit(2);
}
try {
  const r = await saveImage(url, outArg);
  console.log(JSON.stringify({ status: "ok", ...r }));
} catch (e) {
  console.log(JSON.stringify({ status: "failed", reason: String(e.message ?? e), url }));
  process.exit(1);
}
