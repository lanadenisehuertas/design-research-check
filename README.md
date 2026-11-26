# design-research-check

Your AI-built site looks generic. This skill makes the agent stop guessing and look at real design work first.

It researches Pinterest, Behance, Dribbble and Cosmos, opens and studies the images, and pulls out concrete elements: type pairings, grids, spacing, image treatment, component details. Then it shows you rendered proposals built from your own content, builds the one you pick, and checks the result in a browser.

A short prompt is enough: "make this look premium". It works out the brief from your project and lists its assumptions so you can correct them.

## Quick start

**Claude Code**

```
claude plugin marketplace add lanadenisehuertas/design-research-check
claude plugin install design-research-check@design-research-check-marketplace
```

Then, in your project:

```
/design-research-check:design-research-check make this look premium
```

Other hosts (Codex, Cursor, any agent) are covered in [Install](#install).

## Pick how much you want

| You say | What happens | Time | Changes your code |
|---|---|---|---|
| "check this page for accessibility and UI problems" | **Audit.** Renders the page, scans it, writes a ranked list of problems with file and line. No web research. | about 2 min | no |
| "quick redesign, this looks AI-made" | **Quick redesign.** Smaller research round (5 to 8 references studied), two proposals, then builds your pick. | about 10 min (estimate) | yes |
| "make this look premium" | **Full redesign.** Deep research (15 to 20 references studied), three proposals, then builds your pick. | 15 to 30 min | yes |
| "show me inspiration, don't change anything" | **Research only.** References, a board and proposals. | 15 to 30 min | no |

Add "let me pick first" to any redesign and it stops after the proposals and waits for you.

The agent says the expected time before it starts. A full run uses roughly $4 to $8 of usage.

## What you get

Everything lands in `design-research-check/<run-id>/` in your project:

- **`board.html`**: the references it studied, with notes on what each one contributes.
- **`proposals/`**: two or three directions, rendered at desktop and mobile widths.
- **`compare.html`**: your page before and after, side by side.
- **`references.json`**: every source, and whether it was actually looked at or only found.
- The brief, the design spec (each decision cites the references behind it) and a verification report.

After a redesign it also leaves two things in your project root:

- **`design-system.md`**: colors, fonts, spacing and component rules, with a machine-readable tokens block.
- **A short note in `CLAUDE.md` and `AGENTS.md`** telling future agent sessions to read `design-system.md` before touching the UI. That is what keeps the next page you add from drifting.

## How it checks its own work

- **Every render is audited automatically.** When the agent screenshots your page or a proposal, the same step checks contrast, horizontal scrolling, missing labels and alt text, zoom, focus styles and tap-target size at 1440, 768 and 390 px. A proposal with a critical problem cannot pass the final check. This exists because eyeballing failed: two earlier proposals shipped with 1.07:1 text and 463 px of sideways scroll that the agent had looked at and missed.
- **Drift is measured.** `check-system` lists every color or font in your code that `design-system.md` does not declare, with file and line.
- **AI-default tells are counted.** Purple gradients, gradient text, emoji icons, stock copy, three equal cards and similar defaults are scored before and after.
- **A completion gate** refuses to call a run done until every deliverable exists and the evidence rules hold.

## What the agent can see

It tells you this up front:

- **A**: it can save images, look at them and render pages. Full run.
- **B**: it can look at images but cannot render. Proposals are not rendered.
- **C**: no image vision. Results are marked provisional.

Reading a page as text does not count as looking at it.

## Your own taste

Give it a Pinterest board, a Cosmos collection, Behance or Dribbble links, or a folder of screenshots. It uses those before searching. A private board needs your signed-in browser (for example Claude in Chrome) or a screenshot export.

## Install

| Host | Install | Invoke |
|---|---|---|
| Claude Code | the two commands in [Quick start](#quick-start) | `/design-research-check:design-research-check <request>` |
| Codex | `codex plugin marketplace add lanadenisehuertas/design-research-check`, then `codex plugin add design-research-check@design-research-check-marketplace`. Or copy `skills/design-research-check/` into `.agents/skills/`. | `$design-research-check` |
| Cursor | Customize, then "From GitHub Repository". Or copy `skills/design-research-check/` into `.cursor/skills/`. | `/design-research-check` |
| Any other agent | give it `adapters/standalone/operating-prompt.md` | ask in plain words |

If you have other design skills installed, a plain "the site looks generic" may go to one of them. Invoke this one by name to be sure.

Which hosts have actually been tested is in [docs/STATUS.md](docs/STATUS.md).

## Helper scripts

Node 20 or later, no dependencies, in `skills/design-research-check/scripts/`. The agent runs them; you can too.

| Script | Does |
|---|---|
| `audit-ui` | Render a page and check contrast, overflow, labels, alt text, zoom, focus and tap targets |
| `screenshot` | Capture a page at several widths, and audit it if it is local |
| `detect-slop` | List AI-default tells with file and line, with a before/after score |
| `check-system` | List colors and fonts in your code that `design-system.md` does not declare |
| `remember` | Write the `design-system.md` pointer into `CLAUDE.md` and `AGENTS.md` |
| `capture-refs` | Download a batch of reference images and write the ledger entries |
| `annotate-refs` | Record what the agent saw in each image |
| `check-run` | The completion gate |

Also: `new-run`, `save-image`, `merge-shards`, `validate-ledger`, `check-claims`, `scan-outbound`, `build-board`, `build-compare`, `detect-capabilities`, `build-standalone`.

Try two of them on any project:

```
node skills/design-research-check/scripts/detect-slop.mjs src/
node skills/design-research-check/scripts/audit-ui.mjs --url index.html
```

`audit-ui` only audits local pages unless you pass `--allow-remote`.

## Limits

This is a beta.

- Gallery sites often refuse automated access. How many gallery works get studied varies from run to run. The skill records refusals and never works around logins or bot checks.
- Tested live in Claude Code. Codex: install tested only. Cursor: not tested.
- The quick redesign time is an estimate, not yet measured in a live run.
- There is no measured comparison yet against the same agent without the skill.

## Develop

```
npm test
```

After changing anything in `skills/design-research-check/`, regenerate the standalone prompt (a test fails if it drifts):

```
node skills/design-research-check/scripts/build-standalone.mjs
```

`examples/skincare-fixture/` is a complete example run built from fixture data, not real research.

## License

MIT
