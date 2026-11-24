// Evidence ceiling and preview-path selection from declared capabilities.
// A script cannot see host tools, so the agent declares them (see references/capabilities.md).
//
// Fetching a page as text is NOT vision. The ceiling depends on whether the agent can look at pixels:
//   A: vision + a way to get reference images onto disk (imageCapture or a browser) + render (screenshots)
//   B: vision on saved or user-supplied images, but no render of live pages or the user's app
//   C: no vision

export function evidenceCeiling(caps = {}) {
  if (!caps.vision) return "C";
  const canGetImages = caps.imageCapture || caps.browser || caps.userImages;
  if (canGetImages && (caps.render || caps.browser) && (caps.imageCapture || caps.browser)) return "A";
  if (canGetImages) return "B";
  return "C";
}

/** Prefer generated concept imagery plus an HTML render; fall back to HTML/CSS render; else unrendered files. */
export function pickPreviewPath(caps = {}) {
  if (caps.imageGen && caps.render) return "generated+html";
  if (caps.render) return "html_render";
  return "html_unrendered";
}

export function unavailableList(caps = {}) {
  const out = [];
  if (!caps.webSearch) out.push({ capability: "webSearch", effect: "cannot discover references", fallback: "work from user links and supplied screenshots; report coverage honestly" });
  if (!caps.imageCapture && !caps.browser) out.push({ capability: "imageCapture", effect: "cannot save reference images to inspect", fallback: "run scripts/save-image.mjs (needs network) or ask for screenshots" });
  if (!caps.browser) out.push({ capability: "browser", effect: "cannot interact with live interfaces", fallback: "screenshot live sites with scripts/screenshot.mjs; interaction behavior stays unverified" });
  if (!caps.vision) out.push({ capability: "vision", effect: "cannot visually inspect images", fallback: "provisional text-only analysis, labeled; request the smallest useful screenshot set" });
  if (!caps.render) out.push({ capability: "render", effect: "cannot capture previews or verification screenshots", fallback: "ship HTML files unrendered and disclose it" });
  if (!caps.imageGen) out.push({ capability: "imageGen", effect: "no concept imagery", fallback: "HTML/CSS proposals rendered with available preview tools" });
  if (caps.fileEdit === false) out.push({ capability: "fileEdit", effect: "cannot write the run folder or implement", fallback: "deliver artifacts in chat and say so" });
  return out;
}
