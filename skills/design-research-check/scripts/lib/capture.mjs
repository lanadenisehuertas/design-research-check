// Reference capture: download a public image, or read a page's og:image/twitter:image and download that, and
// turn the result into a ledger entry. Used by save-image.mjs (one image) and capture-refs.mjs (a batch).
// Plain fetch with an honest user agent. No cookies, no credentials, no retries on challenges, no proxy.
// A 401/403/429/451 or a bot-check page is recorded as blocked, never worked around.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";

export const USER_AGENT = "Mozilla/5.0 (compatible; design-research-check reference capture)";
const EXT = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "image/avif": ".avif", "image/svg+xml": ".svg" };
const MAX_BYTES = 15 * 1024 * 1024;
const BLOCKED_STATUS = new Set([401, 403, 407, 429, 451]);
const CHALLENGE = /cf-chl|challenge-platform|just a moment\.\.\.|attention required|captcha|are you a robot|verify you are human|px-captcha|datadome/i;

export function platformOf(url) {
  const h = new URL(url).hostname.toLowerCase();
  if (/pinterest\.|pinimg\.com$/.test(h)) return "pinterest";
  if (/behance\.net$|mir-s3-cdn-cf\.behance\.net$/.test(h)) return "behance";
  if (/dribbble\.com$/.test(h)) return "dribbble";
  if (/cosmos\.so$/.test(h)) return "cosmos";
  if (/collectui\.com$/.test(h)) return "collectui";
  if (/wallofportfolios\./.test(h)) return "wallofportfolios";
  return "other";
}

async function get(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "user-agent": USER_AGENT, accept: "text/html,image/*;q=0.9,*/*;q=0.5" } });
  } finally {
    clearTimeout(t);
  }
}

/** Save one image URL to outBase (extension added from the content type). Throws with a reason on failure. */
export async function saveImage(url, outBase, { timeoutMs = 20000 } = {}) {
  const res = await get(url, timeoutMs);
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  if (!EXT[type]) throw new Error(`not an image (content-type "${type || "none"}")`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error("empty response");
  if (buf.length > MAX_BYTES) throw new Error("image larger than 15 MB");
  let out = resolve(outBase);
  if (!extname(out)) out += EXT[type];
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  return { file: out, bytes: buf.length, content_type: type, final_url: res.url };
}

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

/** Read og/twitter/meta fields from HTML. Attribute order varies, so match both orders. */
export function readMeta(html, baseUrl) {
  const meta = (key) => {
    const a = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`, "i").exec(html);
    const b = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`, "i").exec(html);
    return (a || b) ? decode((a || b)[1]) : null;
  };
  const rawImage = meta("og:image:secure_url") || meta("og:image") || meta("twitter:image") || meta("twitter:image:src");
  let image = null;
  if (rawImage) {
    try {
      image = new URL(rawImage, baseUrl).href;
    } catch {}
  }
  const titleTag = /<title[^>]*>([^<]{1,300})<\/title>/i.exec(html);
  return {
    image,
    title: meta("og:title") || meta("twitter:title") || (titleTag ? decode(titleTag[1]) : null),
    creator: meta("author") || meta("article:author") || meta("twitter:creator") || null,
    site: meta("og:site_name") || null,
  };
}

/**
 * Capture one reference into `${runDir}/refs/${id}.<ext>` and return a ledger entry.
 * The entry is never marked inspected: only the agent can do that, after opening the image (see annotate-refs.mjs).
 */
export async function captureRef({ id, url, runDir, platform, origin = "discovered", now = new Date(), timeoutMs = 20000 }) {
  const entry = {
    id,
    platform: platform || platformOf(url),
    source_url: url,
    original_url: null,
    title: "untitled",
    creator: "unknown",
    accessed_at: now.toISOString().slice(0, 10),
    access_status: "ok",
    evidence_type: "search_snippet",
    origin,
    relevance: "not assessed yet",
    limitations: "",
    proposed_use: "none yet",
    avoid: "none yet",
  };
  const outBase = resolve(runDir, "refs", id);
  const fail = (status, why) => Object.assign(entry, { access_status: status, evidence_type: "inaccessible", limitations: why, relevance: "not assessed: not accessible", proposed_use: "none", avoid: "n/a" });
  let res;
  try {
    res = await get(url, timeoutMs);
  } catch (e) {
    return fail("inaccessible", `fetch failed: ${e.name === "AbortError" ? "timeout" : e.message}`);
  }
  if (BLOCKED_STATUS.has(res.status)) return fail("blocked", `HTTP ${res.status}: the site refused an automated fetch. Not bypassed. Try the creator's own site or ask the user for a screenshot.`);
  if (!res.ok) return fail("inaccessible", `HTTP ${res.status}`);
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();

  if (EXT[type]) {
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) return fail("inaccessible", buf.length ? "image larger than 15 MB" : "empty image");
    const file = outBase + EXT[type];
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, buf);
    entry.local_image = `refs/${id}${EXT[type]}`;
    entry.limitations = "image captured, not yet inspected; the page around it (title, creator) was not read";
    return entry;
  }

  if (type === "text/html" || type === "application/xhtml+xml") {
    const html = (await res.text()).slice(0, 2_000_000);
    if (CHALLENGE.test(html.slice(0, 200_000)) && !/og:image/i.test(html)) {
      return fail("blocked", "bot check or challenge page. Not bypassed. Use the host's own fetch tool, the creator's site, or a user screenshot.");
    }
    const m = readMeta(html, res.url);
    entry.evidence_type = "text_only";
    if (m.title) entry.title = m.title.slice(0, 200);
    if (m.creator) entry.creator = m.creator.slice(0, 120);
    if (res.url !== url) entry.original_url = res.url;
    if (!m.image) {
      entry.access_status = "partial";
      entry.limitations = "page read, but it declares no og:image or twitter:image; screenshot the page or find the image URL";
      return entry;
    }
    try {
      const saved = await saveImage(m.image, outBase, { timeoutMs });
      entry.local_image = `refs/${id}${extname(saved.file)}`;
      entry.image_url = m.image;
      entry.limitations = "og:image captured (often a cover crop of the work), not yet inspected";
    } catch (e) {
      entry.access_status = "partial";
      entry.image_url = m.image;
      entry.limitations = `page read, image download failed: ${e.message}`;
    }
    return entry;
  }
  return fail("inaccessible", `unsupported content type "${type || "none"}"`);
}

/** Run async tasks with a concurrency limit, preserving order. */
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}
