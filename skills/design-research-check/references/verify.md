# Render, compare, correct (phase 9)

1. Run the project checks.
2. Render the real changed interface at the baseline routes with `screenshot.mjs --widths 1440,768,390 --out "$RUN/final" --name <route>`. For local pages and dev servers this also writes `final/<route>.audit.json`.
3. Inspect: alignment with the selected direction and the brief; hierarchy, typography, spacing, imagery, brand consistency; overflow, clipping, wrapping, contrast, image cropping; navigation and key user tasks; keyboard access and states; console errors, broken assets, regressions.
4. Run `detect-slop.mjs <source folders> --out "$RUN/final/slop.json" --compare "$RUN/baseline/slop.json"`. For each tell still present or newly introduced, either fix it or give the reason in `verification.md` (a tell can be a real brand choice). Then run `build-compare.mjs "$RUN"` to write the before/after page `compare.html`.
5. Read the audit file from step 2 (or run `audit-ui.mjs --url <page> --out "$RUN/final/audit.json"` if the screenshot could not audit). It checks contrast, horizontal overflow, alt text, labels, control names, zoom, lang, headings, touch targets, focus outline and reduced motion at 1440, 768 and 390. Every critical finding is fixed or named by id in `verification.md` with the reason. Major findings: fix or justify. The scan cannot judge hierarchy, taste or whether the key task works, so keep looking at the screenshots.
6. Compare with the approved proposal and the extracted principles. Pixel similarity to unrelated branded sites is never the success metric.
7. **Copy-guard.** Confirm no other brand's logo, wordmark, proprietary illustration, photography or whole-page layout was reproduced.
8. Record `pass`, `partial`, `fail` or `not tested` per criterion in `verification.md`, with concrete evidence. A self-assigned aesthetic score is not usability validation.
9. Fix material failures and render again. After **two** focused correction cycles, stop and report what is unresolved and what evidence or decision would resolve it.
10. Run `node "$SKILL_DIR/scripts/check-claims.mjs" --ceiling <A|B|C> --render <true|false> --verification "$RUN/verification.md" --spec "$RUN/design-spec.md" --ledger "$RUN/references.json"`. Fix any over-claim it reports.
11. Write the project's `design-system.md` from `templates/design-system.md`, with every color and primary font in its ```json tokens block. Run `check-system.mjs design-system.md <source folders> --out "$RUN/final/system.json"` until it reports no drift, then `remember.mjs <project-root>` so later sessions read the file before any UI change.
12. Run the completion gate: `node "$SKILL_DIR/scripts/check-run.mjs" "$RUN" --mode redesign --depth <depth>`.

Wording by ceiling: A may say "visually verified" if the result was rendered and looked at. B may say "verified from the supplied screenshots", not "verified in the live interface". C may not claim visual verification; say what could not be checked.
Include rows for: baseline generic defaults replaced (list `P#`), and each direction's named elements visible in the result.
A passing build does not prove visual quality. A beautiful screenshot does not prove working UX.
