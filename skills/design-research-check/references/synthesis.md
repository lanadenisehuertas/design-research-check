# Synthesis and design spec (phases 5-6)

## Synthesis (`synthesis.md`)
1. Cluster the strongest references into **two or three** plausible directions. For a vague brief these usually align with the aesthetic hypotheses from `brief.md`. Do not average incompatible references.
2. Fill the pattern matrix: information architecture and content order; layout, grid, proportions, spacing; typography and hierarchy; palette and contrast; image treatment, texture, motifs; components, borders, surfaces, radii, iconography; motion, feedback, responsive adaptation where observed.
3. For every major recommendation write:
   **Observed pattern -> reference IDs -> reason it fits this brief -> adaptation for this project.**
   Keep source observation, your interpretation and your proposal visibly separate.
4. Choose a primary composition or system logic for each direction. When references conflict, explain the tradeoff and decide by the user's goals.
5. In `auto` mode, recommend the best-supported direction and say why, including its main tradeoff.

## Design spec (`design-spec.md`)
A compact specification for the chosen direction: semantic color roles, type roles, spacing scale, grid, containers, component rules, imagery rules, responsive behavior, motion intent.

Every decision is one line in this exact form so it can be checked:

```
- **D3** Display headlines use a high-contrast serif at large scale over a calm ground [refs: R02, R07]
```

- Cite at least one reference that was visually inspected. `scripts/check-claims.mjs --spec --ledger` fails a decision whose cited references were only snippets or text.
- A decision without evidence is allowed only if the line ends with `unsupported assumption`. Keep these rare and say so in the final response.
- Distinguish observed measurements (from references, labeled estimates) from proposed implementation values.
- When the user mixes elements from several directions, reconcile them into one coherent spec before implementing.
