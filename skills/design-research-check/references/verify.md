# Render, compare, correct (phase 9)

1. Run the project checks.
2. Render the real changed interface at the baseline routes and viewports, plus representative intermediate widths (for example 768 and 1024). Save to `final/`.
3. Inspect: alignment with the selected direction and the brief; hierarchy, typography, spacing, imagery, brand consistency; overflow, clipping, wrapping, contrast, image cropping; navigation and key user tasks; keyboard access and states; console errors, broken assets, regressions.
4. Run `detect-slop.mjs <source folders> --out "$RUN/final/slop.json" --compare "$RUN/baseline/slop.json"`. For each tell still present or newly introduced, either fix it or give the reason in `verification.md` (a tell can be a real brand choice). Then run `build-compare.mjs "$RUN"` to write the before/after page `compare.html`.
5. Compare with the approved proposal and the extracted principles. Pixel similarity to unrelated branded sites is never the success metric.
6. **Copy-guard.** Confirm no other brand's logo, wordmark, proprietary illustration, photography or whole-page layout was reproduced.
7. Record `pass`, `partial`, `fail` or `not tested` per criterion in `verification.md`, with concrete evidence. A self-assigned aesthetic score is not usability validation.
8. Fix material failures and render again. After **two** focused correction cycles, stop and report what is unresolved and what evidence or decision would resolve it.
9. Run `node "$SKILL_DIR/scripts/check-claims.mjs" --ceiling <A|B|C> --render <true|false> --verification "$RUN/verification.md" --spec "$RUN/design-spec.md" --ledger "$RUN/references.json"`. Fix any over-claim it reports.
10. Run the completion gate: `node "$SKILL_DIR/scripts/check-run.mjs" "$RUN" --mode redesign --depth <depth>`.

Wording by ceiling: A may say "visually verified" if the result was rendered and looked at. B may say "verified from the supplied screenshots", not "verified in the live interface". C may not claim visual verification; say what could not be checked.
Include rows for: baseline generic defaults replaced (list `P#`), and each direction's named elements visible in the result.
A passing build does not prove visual quality. A beautiful screenshot does not prove working UX.
