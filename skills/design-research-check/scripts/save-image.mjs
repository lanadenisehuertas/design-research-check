#!/usr/bin/env node
// Usage: node save-image.mjs <image-url> <out-file-without-or-with-extension>
// Downloads one public image (for example a page's og:image or a shot's image URL) so it can be
// viewed and cited as a visually inspected reference. Refuses non-images and files over 15 MB.
// Does not send cookies or credentials, and does not bypass login walls.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";

const [url, outArg] = process.argv.slice(2);
if (!url || !outArg || !/^https?:\/\//i.test(url)) {
  console.error("usage: save-image.mjs <http(s)-image-url> <out-file>");
  process.exit(2);
}
const EXT = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "image/avif": ".avif", "image/svg+xml": ".svg" };
try {
  const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (design-research-check reference capture)" } });
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!EXT[type]) throw new Error(`not an image (content-type "${type || "none"}")`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error("empty response");
  if (buf.length > 15 * 1024 * 1024) throw new Error("image larger than 15 MB");
  let out = resolve(outArg);
  if (!extname(out)) out += EXT[type];
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  console.log(JSON.stringify({ status: "ok", file: out, bytes: buf.length, content_type: type, final_url: res.url }));
} catch (e) {
  console.log(JSON.stringify({ status: "failed", reason: String(e.message ?? e), url }));
  process.exit(1);
}
