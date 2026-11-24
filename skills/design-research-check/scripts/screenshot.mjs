#!/usr/bin/env node
// Usage: node screenshot.mjs --url <url-or-file-path> --out <dir> [--widths 1440,390] [--height 900] [--name page]
// Captures a page at each width. Uses Playwright if installed; otherwise the system Chrome or Edge in
// headless mode. Narrow widths are captured through an iframe of exactly that width, because headless
// Chrome/Edge windows have a minimum width and would otherwise lay the page out wider than requested;
// the PNG is then cropped to the requested width.
// Exit 0 = captured, 2 = unavailable or failed (JSON on stdout says why). Installs nothing.
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { cropPng, readPngSize } from "./lib/png.mjs";

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
let url = opt("url");
const out = opt("out");
if (!url || !out) {
  console.error("usage: screenshot.mjs --url <url-or-file> --out <dir> [--widths 1440,390] [--height 900] [--name page]");
  process.exit(2);
}
if (!/^[a-z]+:\/\//i.test(url)) url = pathToFileURL(resolve(url)).href;
const widths = opt("widths", "1440,390").split(",").map(Number).filter(Boolean);
const height = Number(opt("height", "900"));
const name = opt("name", "page");
mkdirSync(resolve(out), { recursive: true });

async function viaPlaywright() {
  // Resolve Playwright from the user's project first (where `npm i -D playwright` puts it), then from here.
  let spec = "playwright";
  try {
    spec = pathToFileURL(createRequire(join(process.cwd(), "package.json")).resolve("playwright")).href;
  } catch {}
  const { chromium } = await import(spec);
  const browser = await chromium.launch();
  const shots = [];
  try {
    for (const w of widths) {
      const page = await browser.newPage({ viewport: { width: w, height } });
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      const file = join(resolve(out), `${name}-${w}.png`);
      await page.screenshot({ path: file, fullPage: true });
      shots.push({ width: w, file, console_errors: errors });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return { engine: "playwright", shots };
}

function findBrowser() {
  const candidates = process.platform === "win32"
    ? [
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
      ]
    : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Chromium.app/Contents/MacOS/Chromium"]
      : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge"];
  return candidates.find((p) => existsSync(p));
}

function viaSystemBrowser() {
  const bin = findBrowser();
  if (!bin) throw new Error("no Playwright and no system Chrome/Edge found");
  const shots = [];
  const tmp = join(tmpdir(), `drc-shot-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  try {
    for (const w of widths) {
      const file = join(resolve(out), `${name}-${w}.png`);
      let target = url;
      let win = w;
      if (w < 600) {
        // Frame the page at exactly w px so its layout viewport is w, inside a window wide enough to exist.
        win = 600;
        const wrapper = join(tmp, `frame-${w}.html`);
        writeFileSync(wrapper, `<!doctype html><html><body style="margin:0;background:#777"><iframe src="${url}" style="display:block;width:${w}px;height:${height}px;border:0;background:#fff"></iframe></body></html>`);
        target = pathToFileURL(wrapper).href;
      }
      execFileSync(bin, ["--headless", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files", `--window-size=${win},${height}`, `--screenshot=${file}`, target], { stdio: "ignore", timeout: 60000 });
      if (!existsSync(file)) throw new Error(`browser produced no screenshot for width ${w}`);
      if (win !== w) writeFileSync(file, cropPng(readFileSync(file), w));
      const size = readPngSize(readFileSync(file));
      shots.push({ width: w, file, size, note: w < 600 ? `rendered as a ${w}px iframe, cropped to ${w}px` : "viewport only, not full page" });
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return { engine: `system browser: ${bin}`, shots };
}

try {
  let result;
  try {
    result = await viaPlaywright();
  } catch (e) {
    if (!/Cannot find (package|module)|ERR_MODULE_NOT_FOUND/.test(String(e?.message ?? e)) && e?.code !== "ERR_MODULE_NOT_FOUND") throw e;
    result = viaSystemBrowser();
  }
  console.log(JSON.stringify({ status: "ok", url, ...result }, null, 2));
} catch (e) {
  console.log(JSON.stringify({ status: "unavailable", reason: String(e.message ?? e), next: "use the host's browser/screenshot tool, install Playwright, or ask the user for screenshots" }));
  process.exit(2);
}
