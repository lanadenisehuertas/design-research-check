# Capability check (step 1)

A prompt cannot create browsing, vision, image generation or file access. Check what this session really has, then say so.

## What counts
- `webSearch`: a search tool.
- `imageCapture`: you can save a reference image to disk. `scripts/save-image.mjs <url> <out>` (one image) or `scripts/capture-refs.mjs <RUN> <list>` (a batch) does this anywhere with network access.
- `vision`: you can open a saved PNG/JPG/WebP and see its pixels (for example the Read tool on an image file). Fetching a page as text, alt text or a snippet is **not** vision. SVG and AVIF may not be viewable: screenshot or convert them.
- `render`: you can screenshot a page or your own HTML. `scripts/screenshot.mjs` uses Playwright (resolved from the user's project or the plugin) or the system Chrome/Edge in headless mode.
- `browser`: an interactive browser tool (for example a Chrome extension tool). Useful for live interaction; not required for ceiling A.
- `imageGen`: an image generation tool the user allows.
- `userImages`: the user supplied screenshots or image files.

Optionally write these as JSON to `RUN/caps.json` and run `node "$SKILL_DIR/scripts/detect-capabilities.mjs" --declared "$RUN/caps.json"`. It probes Node, git, Playwright and a system browser, then returns `evidence_ceiling`, `preview_path` and `unavailable[]` with a fallback for each gap.

## Evidence ceiling
- **A**: vision, plus a way to get reference images onto disk, plus render. Full evidence-led run.
- **B**: vision on saved or user-supplied images, no render. Live interface behavior and the final result cannot be visually verified.
- **C**: no vision. Analysis is provisional and text-only. Never write "visually verified" or "visually inspected".

Verification wording depends on render too: without render, do not claim visual verification of the result even at ceiling A (`check-claims.mjs --render false`).

## Tell the user, then continue
Two or three lines before research: the ceiling, what is missing, the fallback. Offer to take screenshots from the user, but do not stop and wait for them. Continue at the current ceiling.
Gallery sites often block automated access. Expect partial access and plan for it (`references/providers.md`).
