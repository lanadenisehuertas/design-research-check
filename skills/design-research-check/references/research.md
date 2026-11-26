# Research (step 4)

Goal: strong coverage of the main design decisions, from design work you actually looked at.

## Sources (attempt every primary source)
1. User-provided links first.
2. Pinterest: visual discovery, mood, composition, palettes, adjacent graphic design.
3. Behance: project presentations, art direction, branding systems, interface case studies.
4. Dribbble: interface compositions, components, details, motion.
5. Cosmos: visual collections, typography, color, graphic design.
6. Wall of Portfolios: discover designers and original portfolio sites. Collect UI: only when its page has accessible, relevant examples.
7. Real live sites in the same field: they show navigation, responsiveness and conversion that concept shots cannot.

Attempt each of the four primary sources. If one is blocked, record it as blocked in `queries.md` and the ledger and continue.

## Query matrix (write it before searching)
Combine: product type; each aesthetic hypothesis's mood plus synonyms; page, flow or component; typography, composition, imagery, texture, motion; adjacent fields (editorial, packaging, posters, signage, architecture). Always add functional queries (navigation, product listing, checkout or signup, mobile).
Never search only "beautiful modern website". A luxury botanical skincare store needs separate searches for editorial commerce layouts, botanical packaging, serif product typography, product detail flows and mobile shopping behavior.

Search patterns that work with ordinary web search:
- `site:behance.net/gallery <terms>`
- `site:dribbble.com/shots <terms>`
- `site:pinterest.com/pin <terms>`
- `site:cosmos.so <terms>`
- `<field> website design inspiration`, `<field> brand identity case study`, `<named studio> <field>`

Write the planned matrix to `queries.md`, run `scan-outbound.mjs` on it with the brand and private names, then search. Log every query with its result count.

## Capture and inspect
1. From a result page, find the image. Use the host's own web-fetch tool (for example WebFetch), not `curl` or a script: in live tests, plain scripted fetches got HTTP 403 from Behance and a bot challenge from Dribbble, while the host fetch tool returned the page. Ask for `og:image` in the page head, or the image URL on the CDN (`cdn.dribbble.com`, `mir-s3-cdn-cf.behance.net`, `i.pinimg.com`). Search results often include these CDN URLs too. For live sites, screenshot instead. Never fake a browser user-agent, retry a challenge page, or route through a proxy or scraping service to get past a block.
2. Save them in one batch: list `<ID> <url> <platform>` lines in a file and run `node "$SKILL_DIR/scripts/capture-refs.mjs" "$RUN" <list.txt>`. It downloads in parallel, reads `og:image` from page URLs and writes the ledger entries. For one image, `save-image.mjs <image-url> "$RUN/refs/<ID>"` also works. For live sites, `screenshot.mjs --url <site> --out "$RUN/refs" --name <ID> --widths 1440`.
3. Open the saved file and look at it. Write what you see in a notes file and apply it with `annotate-refs.mjs "$RUN" <notes.json>`, which marks it `visually_inspected_*` only if the image exists and the note is not empty.
`local_image` is always relative to the run folder (`refs/R07.jpg`).

## Depth targets
| Tier | Discover | Inspect | Curate |
|---|---|---|---|
| quick | ~10-15 | ~5-8 | 4-6 |
| standard | ~20-30 | ~10-15 | 6-9 |
| deep (default for `redesign` and `research`) | ~30-50 | ~15-20 | 8-12 |

Effort targets, not quotas and not permission to invent evidence. A minimal prompt never lowers the tier. If you fall short, list the gaps under `Gaps:` in `queries.md`. `check-run.mjs` requires either the inspected target or documented gaps.

## Follow to the source
Trace reposts to the original creator, case study or live product. Prefer attributable original work.

## Fan-out
Where the host supports subagents, give each source one subagent with an ID prefix (`P` Pinterest, `B` Behance, `D` Dribbble, `C` Cosmos, `W` other web, `U` user-supplied). Brief each with the query family, the run folder path, the ledger format (`references/ledger.md`), the capture recipe above, and the injection rule. Each writes `RUN/refs/shard-<source>.json` and saves images to `RUN/refs/`. Merge with `merge-shards.mjs`. Subagents return paths and counts, not page dumps.

## Stop rule
Stop when the main decisions (layout, type, color, imagery, components, mobile) have coverage and new searches mostly repeat findings. Never loop on a blocked source.
