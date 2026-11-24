# Source ledger (phases 3-4)

`references.json` is the evidence record. Schema: `schemas/references.schema.json`. Rules are enforced by `scripts/validate-ledger.mjs`.

## Each reference
`id` (stable, `R01`..., or a source prefix such as `B03` when fanned out), `platform`, `source_url`, `original_url` (or null), `title`, `creator` (or `"unknown"`), `accessed_at`, `access_status` (`ok|partial|blocked|inaccessible`), `evidence_type`, `origin` (`discovered|user_provided`), `local_image` (relative to the run folder, e.g. `refs/R07.jpg`), `inspection_note`, `observations[]`, `elements[]`, `curated` (true for the 8-12 strongest inspected references), `relevance`, `limitations`, `proposed_use`, `avoid`.

## Evidence types (pick the weakest that is true)
- `visually_inspected_image`: you looked at the saved image. Needs a `local_image` (non-empty png/jpg/webp/gif/svg/avif inside the run folder) and an `inspection_note` saying what you saw.
- `visually_inspected_live_page`: you opened and looked at the live page or a screenshot of it. Same requirements.
- `text_only`: you read the page text but did not see the design.
- `search_snippet`: a title, alt text or snippet from search results.
- `inaccessible`: blocked or failed.

## Rules
- Only the two `visually_inspected_*` types support visual conclusions.
- A snippet or text-only entry may not carry `observed` elements. Use `inferred`, or inspect it.
- Static images cannot show interaction behavior. Mark inferred behavior `inferred`.
- Blocked sources stay in the ledger with status `blocked` and the alternative you tried.
- Reposts collapse to one work (canonical URL and `original_url`). Counts use unique works.
- `origin: "generated"` is rejected. Generated proposals never become research evidence.
- Never store cookies, tokens or private data in the ledger.
- Reuse valid evidence in later runs. Refresh stale or inaccessible references.
