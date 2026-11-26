# Changelog

## Unreleased

Faster:
- Depth tiers. "quick", "fast" or "cheaper" in the request runs a smaller round: 5 to 8 references studied, two proposals, one correction cycle. A minimal prompt still gets the deep run. The agent states the expected time and cost before it starts.
- `capture-refs.mjs` captures a list of image or page URLs in parallel. It reads `og:image` from pages, records refused fetches as blocked, and writes the ledger entries. `annotate-refs.mjs` records what the agent saw, and marks an entry inspected only when it has a saved image and a note. Every earlier live run had written its own fetcher and ledger builder.
- `references/fanout.md`: a ready brief for one research subagent per source. Each subagent writes its own shard, so parallel subagents never overwrite each other.

Checked by the tools, not by eye:
- `screenshot.mjs` audits every local render automatically and prints the critical findings. The audit logic moved to `lib/audit.mjs`, shared with `audit-ui.mjs`.
- Gate: every proposal needs its audit file. A critical finding fails the run unless `synthesis.md` explains it by id. The bundled example's proposal B had label text at 4.21:1; it is fixed.

Remembered across sessions:
- `design-system.md` now carries a `json` tokens block (colors, fonts, scale).
- `check-system.mjs` lists every color and primary font family in the code that the tokens do not declare, with file and line.
- `remember.mjs` writes a short block into `CLAUDE.md` and `AGENTS.md`. It tells later sessions to read `design-system.md` before any UI change. It replaces its own block in place and leaves the rest of the file alone.
- Gate: a redesign needs filled tokens, the pointer, and `final/system.json` with no drift. Audit mode reports drift when a design system exists.

Other:
- README rewritten for first-time readers.

Earlier in this release:
- New `audit` mode: a two-minute path with no web research and no edits. It renders the page, runs the scans and writes a ranked `report.md`.
- New `audit-ui.mjs`: renders a page at 1440, 768 and 390 and checks WCAG 2.2 AA basics and layout. It reports contrast, horizontal overflow, missing alt text and labels, unnamed controls, zoom blocking, lang, heading order, touch targets, removed focus outlines and missing reduced-motion. Run on earlier live-run proposals it found 1.07:1 text and 463px of mobile overflow that eyeballing had missed.
- Gate: a redesign needs `final/audit.json` with every critical finding fixed or explained, and a `design-system.md` in the project root.
- Proposals are audited before the user sees them.
- New `templates/design-system.md` and `references/product-patterns.md` (what each kind of page must do, with query seeds).

## 0.1.0-beta.1 (2026-11-24)

First public beta.

- Skill `design-research-check`. It infers the brief and records a baseline, then:
  - researches Pinterest, Behance, Dribbble, Cosmos and your own boards;
  - inspects the saved images and extracts concrete elements;
  - synthesizes directions and renders two or three proposals;
  - implements the chosen direction and verifies it;
  - ends with a completion gate.
- Modes: `research` and `review` (never edit the app), `redesign`, `preview-first` and `auto`.
- Evidence ceilings A, B and C, so the agent never claims more than it actually saw.
- Zero-dependency Node helpers:
  - `detect-capabilities`, `new-run`, `save-image`, `screenshot`;
  - `merge-shards`, `validate-ledger`, `check-claims`, `scan-outbound`;
  - `build-board`, `detect-slop`, `build-compare`, `check-run`, `build-standalone`.
- Packaging for Claude Code, Codex (Agent Plugins) and Cursor, plus a standalone prompt for other agents.
- 110 tests, including CLI, adversarial and prompt-injection cases. Live results are in `docs/STATUS.md`.
