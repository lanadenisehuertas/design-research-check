# Inspect and extract elements (phase 4)

This phase is what keeps the result from looking generic. A reference is useful only for the specific, transferable elements you can name and point to.

## Inspect
Save each candidate image or live-page screenshot to `refs/` in the run folder (recipe in `references/research.md`), open it and look at it. Record what you saw in `inspection_note`. Pointing at a title or snippet is not inspection.
Prefer attributable original work. Use AI-content filters where a source offers them, without treating them as proof of anything.

## Extract elements
For each inspected reference, record elements in the ledger, each with a category, an observation and a confidence.

| Category | Examples to look for |
|---|---|
| `type` | pairing, contrast of scale and weight, case, tracking, line length, how headlines break |
| `grid` | column structure, asymmetry, proportions, alignment lines, how content is cropped by the frame |
| `spacing` | rhythm, density, where whitespace is spent, section transitions |
| `color` | role split (ground, ink, accent), temperature, how little accent is used |
| `imagery` | crop, scale, framing, treatment, texture, art direction, how products and people are shown |
| `motif` | recurring graphic devices, lines, marks, patterns, illustration approach |
| `component` | navigation, product cards, buttons, forms, borders, radii, surfaces, iconography |
| `motion` | entrance, scroll, hover and feedback behavior (needs a live page; a still shows none) |
| `ia` | content order, section sequence, page and flow structure |

`confidence: observed` only for things visible in an inspected image or page. Estimated sizes and any behavior inferred from a still are `inferred` and labeled estimates. Do not state exact font names or hex values unless the source shows them (a live page's CSS, a specimen); otherwise describe the style ("high-contrast serif") and mark the value an estimate.

## Apply elements without producing slop
1. **Name the generic default** in the baseline that each element will replace.
2. **Draw from at least three distinct inspected works** per direction, from different creators where known. Resolve reposts to the original first. One work's page is a copy; elements from three works under one system is a design. `check-run.mjs` enforces the three-work minimum.
3. **One system logic.** Choose a primary composition. Take compatible details from the others. Do not collage unrelated styles.
4. **Adapt, do not transplant.** Use the pattern with the user's content, brand, colors and type. Same grid logic and different content is adaptation. Same page with a new logo is copying.
5. **Copy-guard.** No other brand's logo, wordmark, proprietary illustration, photography or whole-page layout. Attribution does not grant reuse rights. The verify phase checks this.
6. **Keep working UX.** Elements from static concept shots are visual only. Take navigation, responsiveness and conversion patterns from live interfaces.
