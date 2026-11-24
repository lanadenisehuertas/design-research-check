# design-research-check

An agent skill for the moment an AI-generated site looks generic, or keeps drifting through guesswork revisions. It sends the agent back to real design work: it researches references on Pinterest, Behance, Dribbble and Cosmos (plus your own links), looks at the images, extracts specific elements such as type pairing, grid logic, spacing, image treatment and component details, shows rendered proposals built from your brand and content, implements the direction you pick, and checks the render.

It works from a minimal prompt such as "make it look premium". It infers the brief from your project, lists its assumptions, and lets the proposals stand in for a questionnaire.

**Central rule:** find evidence, inspect it, explain the useful pattern, adapt it to your brand, render it, verify it.

## What you get

A run folder, `design-research-check/<run-id>/`, with the brief, baseline, queries, a source ledger (`references.json`), a reference board, synthesis, a design spec where every decision cites inspected references, proposal previews, a decision map and a verification report.

## Modes

`research` and `review` never edit your application. `redesign` does the full pipeline. `preview-first` waits for your pick after the proposals. `auto` recommends a direction and continues.

## Evidence ceiling

The skill tells you up front what it can actually see.
- **A**: the agent can save reference images, look at them, and render pages. Full evidence-led run.
- **B**: it can look at saved or supplied images but cannot render. Proposals ship unrendered.
- **C**: no image vision. The result is provisional and is never called visually verified.

Fetching a page as text is not vision. Gallery sites often refuse automated fetches, so how many gallery works get inspected varies from run to run (see STATUS).

## Install and invoke

Details and the verified-or-not status per host are in [docs/STATUS.md](docs/STATUS.md).

| Host | Install | Invoke |
|---|---|---|
| Claude Code | `claude plugin marketplace add lanadenisehuertas/design-research-check`, then `claude plugin install design-research-check@design-research-check-marketplace` | `/design-research-check:design-research-check <request>` or ask in plain words |
| Codex | `codex plugin marketplace add lanadenisehuertas/design-research-check` (or a local path), then `codex plugin add design-research-check@design-research-check-marketplace`; or copy `skills/design-research-check/` into `.agents/skills/` | `$design-research-check` |
| Cursor | Customize, "From GitHub Repository"; or put this folder in `~/.cursor/plugins/local` and reload the window; or copy the skill into `.cursor/skills/` | `/design-research-check` |
| Other agents | give the agent `adapters/standalone/operating-prompt.md` | ask in plain words |

Local test for Claude Code: `claude --plugin-dir .`

If you have other design skills installed (for example a "taste" or frontend-design skill), a plain request like "the site looks generic" may be routed to them instead. Invoke this one by name to be sure: `/design-research-check:design-research-check make this look premium`.

## Helper scripts

Node 20+, no dependencies, in `skills/design-research-check/scripts/`: `detect-capabilities`, `new-run`, `save-image` (download a reference image to inspect), `screenshot` (Playwright if installed, otherwise the system Chrome or Edge), `merge-shards`, `validate-ledger`, `check-claims`, `scan-outbound`, `build-board`, `check-run` (the completion gate) and `build-standalone`.

## Develop

`npm test` runs the logic tests on labeled fixtures. After changing anything under `skills/design-research-check/`, run `node skills/design-research-check/scripts/build-standalone.mjs`; a test fails if the standalone prompt drifts.
`examples/skincare-fixture/` is an end-to-end example run made of fixture data, not real research.
`evals/` holds the usefulness evals and rubric. The planned with/without-skill comparison has not been completed.

## Limits

This is a beta. Live runs in Claude Code are summarized in [docs/STATUS.md](docs/STATUS.md).
- Codex: install tested, no agent run. Cursor: not tested.
- A full run takes 15–30 minutes and several dollars of usage.
- No measured comparison against the same agent without the skill yet.
- Facebook reels cannot be watched by an agent: the skill asks for screenshots or a transcript.
