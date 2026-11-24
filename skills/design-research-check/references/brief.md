# Brief recovery (phase 1)

Read first, ask later: the request, the conversation, supplied references, brand materials, and the repo (copy, product type, routes, tokens, assets, logo, existing screenshots, README, package.json).

## Compact brief (`brief.md`)
Product, audience, primary task, outcome. Scope (page, screen, component, flow). Desired tone. Brand (logo, colors, type, imagery, voice, fixed constraints). References liked and what exactly is liked. Dislikes and rejected directions. Content, functionality, responsive, accessibility and technical constraints. What can change and what must be preserved.

## Minimal prompts
When the user gives only a feeling ("premium", "less AI", "modern"):
1. Infer product, audience and tone from the repo. Mark each inferred field `assumed`.
2. Write **three aesthetic hypotheses** as testable visual claims, not adjectives.
   Example for "premium editorial": strong typographic contrast, deliberate whitespace, restrained palette, art-directed photography, asymmetric composition. This is a hypothesis to test against references, not a formula.
   Make the three hypotheses genuinely different (for example quiet editorial, tactile craft, high-contrast modern), each plausible for this product.
3. Put the assumptions block at the top of `brief.md`. It is repeated in the final response.
4. Ask a question only when a missing fact would block the work. At most three, in one message. Use visual choices when the user cannot name a style.

User preferences and explicit brand requirements outrank reference popularity.
Do not write universal bans (gradients, cards, rounded corners, popular fonts, bento grids, animation). Judge each against the brief and the evidence.
