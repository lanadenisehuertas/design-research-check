# Changelog

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
