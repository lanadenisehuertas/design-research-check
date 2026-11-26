# Design system

Source of truth for this project's look. Written from run `{{run_id}}` and followed by every later page and component.
When a page needs something this file does not cover, extend this file in the same change. Do not improvise in the page.
`check-system.mjs design-system.md <source folders>` lists any color or font family in the code that is not declared below.

## Direction
One sentence: what this site is, who it is for, and the feeling the design should create.
Chosen direction and why (from `design-research-check/{{run_id}}/synthesis.md`):

## Tokens
This block is the machine-readable source. Define the same values once in code (CSS custom properties, Tailwind theme
or equivalent), and make components use the tokens, never raw values. Every color used anywhere must appear under
`colors`; every primary font family under `fonts`. Add a value here first, then use it.

```json
{
  "colors": {
    "bg": "",
    "surface": "",
    "text": "",
    "muted": "",
    "accent": "",
    "on-accent": "",
    "border": "",
    "danger": "",
    "success": ""
  },
  "fonts": {
    "heading": "",
    "body": ""
  },
  "type_scale_px": [],
  "spacing_px": [],
  "radius_px": [],
  "breakpoints_px": [390, 768, 1024, 1440]
}
```

Contrast pairs checked (4.5:1 for text, 3:1 for large text and UI borders):
- `text` on `bg`:
- `muted` on `bg`:
- `on-accent` on `accent`:

Type: weights, line-height, measure (45 to 75 characters).
Layout: grid, container width.
Motion: durations and easing, and the reduced-motion behavior.

## Components
For each reused component (button, card, form field, nav, label, footer): structure, states (hover, focus-visible, pressed, disabled, error), and the reference IDs it came from.

## Do
-

## Do not
- Emoji as icons, gradient text, purple gradients, glass panels used as decoration.
- Raw color values in components, or colors and fonts that are not in the tokens block.
- Removing focus outlines without a replacement.

## Page overrides
List any page that deviates from the rules above, and why. Page-specific rules live under `## Page: <name>`.
