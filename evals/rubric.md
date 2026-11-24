# Rubric

Mark each row `pass`, `partial`, `fail` or `not tested`, with one line of evidence (a file path or screenshot name).

| # | Criterion | How to check |
|---|---|---|
| 1 | Zero-question behavior | The run did not stop to interview the user. Any question was one message, at most three, and blocked the work |
| 2 | Assumptions block | `brief.md` and the final response list assumptions, each marked `assumed` or `stated` |
| 3 | Evidence ceiling stated first | The ceiling and the unavailable capabilities appear before research starts |
| 4 | Three hypotheses researched | A query family exists per hypothesis in `queries.md` |
| 5 | Sources attempted | Pinterest, Behance, Dribbble, Cosmos each attempted, or a recorded block with the alternative used |
| 6 | Ledger valid | `validate-ledger.mjs` exits 0. Counts in the final response match the ledger |
| 7 | Inspection is real | Open five random `inspected` entries: the saved image exists and the `inspection_note` matches what the image shows |
| 8 | Traceability | `check-claims.mjs --spec --ledger` shows no unlabeled unsupported decisions |
| 9 | Three-creator rule | Each direction draws elements from at least three distinct creators |
| 10 | Structural change | Compare baseline and final screenshots: layout, type and hierarchy changed, not only colors |
| 11 | Elements visible in the result | Name three decisions in the final design and point to the spec ID and reference each came from |
| 12 | Copy-guard | No other brand's logo, wordmark, proprietary illustration, photography or whole-page layout appears |
| 13 | Brand and function preserved | Logo, palette (if fixed), copy, links, forms and cart still work; unrelated edits intact |
| 14 | Mode gate | In `research` and `review` runs, `git status` shows no application file changed |
| 15 | Verification honesty | `check-claims.mjs --verification` exits 0. Criteria not exercised say `not tested` |
| 16 | Usefulness judged by the user | The user compared before and after and said which they prefer, and why |

Rows 1 to 15 can be scored by the person running the eval. Row 16 needs the user's own judgment and decides whether the skill is useful.
