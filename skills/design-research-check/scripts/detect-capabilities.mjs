#!/usr/bin/env node
// Usage: node detect-capabilities.mjs [--declared caps.json]
// Probes what a script CAN see (node, git, playwright) and merges the capabilities the agent
// declares for host tools it can see (browser, vision, imageGen, render, userImages).
// Prints JSON: { probed, declared, evidence_ceiling, preview_path, unavailable[] }.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { evidenceCeiling, pickPreviewPath, unavailableList } from "./lib/capabilities.mjs";

function has(cmd, args = ["--version"]) {
  try {
    execFileSync(cmd, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function hasPlaywright() {
  try {
    createRequire(join(process.cwd(), "package.json")).resolve("playwright");
    return true;
  } catch {}
  try {
    await import("playwright");
    return true;
  } catch {
    return false;
  }
}

function systemBrowser() {
  const c = process.platform === "win32"
    ? ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"]
    : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Chromium.app/Contents/MacOS/Chromium"]
      : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge"];
  return c.find((p) => existsSync(p)) ?? null;
}

const args = process.argv.slice(2);
const i = args.indexOf("--declared");
const declared = i >= 0 ? JSON.parse(readFileSync(args[i + 1], "utf8")) : {};

const probed = { node: process.version, git: has("git"), playwright: await hasPlaywright(), system_browser: systemBrowser(), fetch: typeof fetch === "function" };
// Playwright or a system Chrome/Edge is a render path (scripts/screenshot.mjs) even if the host has no screenshot tool.
// Node's fetch is an image-capture path (scripts/save-image.mjs) when the machine has network access.
const caps = {
  ...declared,
  render: declared.render ?? (probed.playwright || Boolean(probed.system_browser)),
  imageCapture: declared.imageCapture ?? probed.fetch,
};

console.log(
  JSON.stringify(
    {
      probed,
      declared,
      evidence_ceiling: evidenceCeiling(caps),
      preview_path: pickPreviewPath(caps),
      unavailable: unavailableList(caps),
    },
    null,
    2,
  ),
);
