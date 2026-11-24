# Usefulness evals

These measure whether the skill changes a design for the better. They cannot run in `npm test`: they need a live agent host with a browser, image vision and a real project. Results are reported separately from the logic tests and have not been run yet.

## How to run one
1. Pick a project that looks generic (a template landing page works).
2. Start a fresh session in the host. Install the skill. Do not paste any extra instructions.
3. Give one prompt from `prompts.md`, word for word.
4. When the run ends, score it with `rubric.md`. Save the filled rubric and the run folder under `evals/results/<date>-<host>-<prompt>/`.
5. Record the host, model, evidence ceiling reached and any blocked sources.

## What a good result looks like
The skill is useful if, from a minimal prompt, a run (a) states its assumptions, (b) researches without interrogating the user, (c) produces a structurally different design from the baseline, and (d) can show which inspected reference each major decision came from.

## What does not count
A well-formatted report, a long ledger, or a nice screenshot is not evidence of usefulness by itself. A self-assigned score is not proof of user satisfaction. Only a user comparing before and after can say whether the design is better.
