# Proposals and reference board (phase 7)

Produce these before any application change.

## Reference board
Shows inspected source material only: image, reference ID, link, creator (or "unknown"), and annotations of the elements taken. Generate it with `node "$SKILL_DIR/scripts/build-board.mjs" "$RUN/references.json" "$RUN/board.html"` (the template is only its style source). Keep it separate from proposals. Blocked or text-only references are listed without images.

## Proposals
Two or three high-fidelity directions, each using the user's actual brand and representative content (real copy, real product names, real logo). Each must include:
- A short descriptive name.
- Reference IDs and the specific elements adapted.
- A visible desktop composition and a meaningful mobile adaptation.
- Typography, palette, layout, imagery and representative components.
- Why it fits the brief and its main tradeoff.

Vary composition, hierarchy, density or art direction, not only accent colors. For a small component task, scale the proposals to the component and its states.

## How to render
Preferred: self-contained HTML/CSS pages in `proposals/` (`a.html`, `b.html`, `c.html`), rendered with `screenshot.mjs --url "$RUN/proposals/a.html" --out "$RUN/proposals" --name a` at 1440 and 390, plus an optional comparison page based on `templates/proposals.html`. Look at every render and fix broken layouts before showing them.
- `imageGen` available and useful: use it for concept imagery grounded in the synthesized brief. Label it "generated concept". Never present it as a discovered reference or as working UI.
- No image generation: render HTML/CSS and capture with the host preview tool or `scripts/screenshot.mjs`.
- Cannot render at all: ship the HTML files, say they were not rendered, and do not claim visual review of them.
A text description alone does not satisfy the preview requirement.
Generated images never replace implemented text, controls, accessibility or responsiveness. Never implement a functional page as one screenshot.

## After the proposals
- `preview-first`: stop. Show the board and proposals and ask for a choice. If they pick pieces from several, reconcile into one spec.
- `auto`: state the recommendation and reasons and continue, if edits are authorized.
- `research`: stop here. Do not edit the application.
