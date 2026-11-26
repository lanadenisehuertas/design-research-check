// Render-based UI audit, shared by audit-ui.mjs (on demand) and screenshot.mjs (automatic on local pages).
// Engines: Playwright if installed, otherwise the system Chrome or Edge in headless mode.
// The system-browser engine turns off web security in a throwaway profile so it can read the framed page,
// so callers must refuse non-local addresses unless the user explicitly allows them (see isLocalUrl).
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const SEVERITY_ORDER = ["critical", "major", "minor"];
export const DEFAULT_AUDIT_WIDTHS = [1440, 768, 390];

/** file: URLs, localhost, loopback and private LAN addresses. */
export function isLocalUrl(url) {
  if (url.startsWith("file:")) return true;
  const host = new URL(url).hostname;
  return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(host) || /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(host) || host.endsWith(".localhost");
}

export function findBrowser() {
  const c = process.platform === "win32"
    ? ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"]
    : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Chromium.app/Contents/MacOS/Chromium"]
      : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge"];
  return c.find((p) => existsSync(p));
}

async function loadPlaywright() {
  let spec = "playwright";
  try {
    spec = pathToFileURL(createRequire(join(process.cwd(), "package.json")).resolve("playwright")).href;
  } catch {}
  return import(spec);
}

export const isMissingModule = (e) => /Cannot find (package|module)|ERR_MODULE_NOT_FOUND/.test(String(e?.message ?? e)) || e?.code === "ERR_MODULE_NOT_FOUND";

async function viaPlaywright(url, widths, height, browserSource) {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const pages = [];
  try {
    for (const w of widths) {
      const page = await browser.newPage({ viewport: { width: w, height } });
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      const result = await page.evaluate(`(() => { ${browserSource}; return drcAudit(document, window); })()`);
      pages.push({ width: w, ...result });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return { engine: "playwright", pages };
}

function viaSystemBrowser(url, widths, height, browserSource) {
  const bin = findBrowser();
  if (!bin) throw new Error("no Playwright and no system Chrome/Edge found");
  const tmp = mkdtempSync(join(tmpdir(), "drc-audit-"));
  const pages = [];
  try {
    for (const w of widths) {
      const win = Math.max(w, 600);
      const wrapper = join(tmp, `audit-${w}.html`);
      // The page is framed at exactly w px so its layout viewport is w. The script runs in the wrapper and reads the frame.
      writeFileSync(
        wrapper,
        `<!doctype html><html><body style="margin:0"><iframe id="f" src="${url}" style="display:block;width:${w}px;height:${height}px;border:0"></iframe><pre id="drc-result"></pre>
<script>${browserSource}
const f = document.getElementById("f");
f.addEventListener("load", () => setTimeout(() => {
  let r;
  try { r = drcAudit(f.contentDocument, f.contentWindow); } catch (e) { r = { error: String(e && e.message || e) }; }
  document.getElementById("drc-result").textContent = JSON.stringify(r);
}, 300));
</script></body></html>`,
      );
      const profile = join(tmp, `profile-${w}`);
      const dom = execFileSync(
        bin,
        ["--headless", "--disable-gpu", "--hide-scrollbars", "--disable-web-security", "--allow-file-access-from-files", `--user-data-dir=${profile}`, `--window-size=${win},${height}`, "--virtual-time-budget=8000", "--dump-dom", pathToFileURL(wrapper).href],
        { encoding: "utf8", timeout: 90000, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 },
      );
      const m = dom.match(/<pre id="drc-result">([\s\S]*?)<\/pre>/);
      const text = m && m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
      if (!text) throw new Error(`audit produced no result at ${w}px (the page may have blocked framing)`);
      const r = JSON.parse(text);
      if (r.error) throw new Error(`audit script failed at ${w}px: ${r.error}`);
      pages.push({ width: w, ...r });
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return { engine: `system browser: ${bin}`, pages };
}

/** Collapse per-width findings into one row per finding id, most severe first. */
export function summarize(pages) {
  const counts = { critical: 0, major: 0, minor: 0 };
  const byId = {};
  for (const p of pages) {
    for (const f of p.findings) {
      counts[f.severity]++;
      (byId[f.id] ||= { severity: f.severity, widths: new Set(), count: 0, example: f }).count++;
      byId[f.id].widths.add(p.width);
    }
  }
  const summary = Object.entries(byId)
    .map(([id, v]) => ({ id, severity: v.severity, count: v.count, widths: [...v.widths], message: v.example.message, selector: v.example.selector, ...(v.example.offenders ? { offenders: v.example.offenders } : {}), ...(v.example.text ? { text: v.example.text, color: v.example.color, background: v.example.background } : {}) }))
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  return { counts, summary };
}

/**
 * Render `url` at each width and run the in-page checks. Throws when no engine works.
 * @returns {Promise<{status: "ok", url: string, engine: string, widths: number[], counts: object, passed: boolean, summary: object[], pages: object[]}>}
 */
export async function auditPage({ url, widths = DEFAULT_AUDIT_WIDTHS, height = 900 }) {
  const browserSource = readFileSync(join(here, "audit-browser.js"), "utf8");
  let result;
  try {
    result = await viaPlaywright(url, widths, height, browserSource);
  } catch (e) {
    if (!isMissingModule(e)) throw e;
    result = viaSystemBrowser(url, widths, height, browserSource);
  }
  const { counts, summary } = summarize(result.pages);
  return { status: "ok", url, engine: result.engine, widths, counts, passed: counts.critical === 0, summary, pages: result.pages };
}
