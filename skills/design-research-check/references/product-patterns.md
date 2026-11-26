# Product patterns: what each kind of page must do

Use this to turn a minimal request ("make my coffee site look premium") into a brief and a query matrix before any search.
Each entry gives the job of the page, the structure that usually works, the generic failure to avoid, and query seeds for the
four galleries. These are priors, not answers: the references you inspect decide the design. Never search the brand name.

How to use an entry:
1. Match the product type. Mixed products take the primary job from one entry and one section pattern from another.
2. Write the job as the main task in `brief.md`. A page that wins on looks but loses the main task is a failed run.
3. Turn "structure that works" into hypotheses to test against references. Turn "generic failure" into baseline problems to look for.
4. Use the query seeds plus an adjacent field (packaging, editorial, signage, print) for each hypothesis.

## Shop for a few products (food, drink, goods, small brand)
- **Job:** show the product honestly, let someone choose and buy in under a minute, build trust in the maker.
- **Works:** product shown as the hero object (label, bag, pack, close photo), real specs in a scannable list (origin, process, weight, price), one clear buy action per product, maker story short and specific (place, day, method), shipping and returns visible near the buy action.
- **Generic failure:** centered gradient hero with a slogan, three identical feature cards with emoji, "Get started" button, stock adjectives, no product specifics.
- **Seeds:** `<product> packaging label typography`, `<product> product page ecommerce`, `<product> brand identity`, `small batch <product> website`. Adjacent: packaging, menu, label systems.

## SaaS or developer tool landing page
- **Job:** in five seconds say who it is for and what changes for them; show the product itself; get one conversion.
- **Works:** hero with a real product screenshot or live demo, one specific claim with a number or example, logos or quotes only if real, pricing or "how it works" in three steps with real UI, one primary call to action repeated at natural stopping points, docs and changelog reachable.
- **Generic failure:** purple or blue gradient, floating glass cards, abstract blobs instead of the product, "supercharge your workflow", testimonial carousel with invented people.
- **Seeds:** `saas landing page product screenshot hero`, `developer tool homepage code example`, `pricing page comparison`, `changelog page design`. Adjacent: documentation sites, editorial product pages.

## Portfolio or studio
- **Job:** show the work first, show a point of view, make contact easy.
- **Works:** work as the page (large, varied crops, real project names and years), a short statement in the person's own voice, an index or list view alongside the grid, project pages with context (brief, role, result), contact with a real email.
- **Generic failure:** template grid with hover zoom, "Hi, I'm ... creative designer" hero, skill bars, lorem-ipsum case studies.
- **Seeds:** `designer portfolio website case study`, `studio website project index`, `photographer portfolio layout`. Adjacent: monographs, exhibition catalogues, gallery websites.

## Restaurant, cafe or venue
- **Job:** answer "is it open, where is it, what do they serve, can I book" immediately.
- **Works:** hours, address and map link above the fold, menu as real text (not an image), booking or order action, photography of the actual room and food, mobile-first because most visits start on a phone.
- **Generic failure:** stock food photo hero with centered title, menu as PDF, hours hidden in the footer.
- **Seeds:** `restaurant website menu layout`, `cafe website mobile hours location`, `bar identity menu typography`. Adjacent: printed menus, signage.

## Dashboard or internal tool
- **Job:** let a trained user find the number or action fast and trust it.
- **Works:** dense but ordered information, one clear primary view, consistent table and filter patterns, numbers aligned (tabular figures), meaningful empty, loading and error states, keyboard access.
- **Generic failure:** decorative gradient cards, oversized charts with no axis labels, color-only meaning, every widget a different style.
- **Seeds:** `dashboard ui data table filters`, `analytics dashboard dense`, `admin interface empty state`. Adjacent: financial terminals, editorial data pages.

## Editorial, blog or documentation
- **Job:** be read.
- **Works:** measure of 45 to 75 characters, a real type scale, strong heading hierarchy, readable contrast, navigation that shows where you are, search that works.
- **Generic failure:** full-width paragraphs, tiny gray text, hero image with overlaid title on every post.
- **Seeds:** `editorial website typography long form`, `documentation site navigation`, `magazine website layout`. Adjacent: print magazines, book design.

## Nonprofit, event or campaign
- **Job:** one action: donate, register, sign, attend.
- **Works:** the action visible without scrolling, the specific cause or date stated plainly, proof (real numbers, real people, real photos), a short form with clear labels and visible errors.
- **Generic failure:** stock photo of smiling hands, five equal calls to action, vague mission copy.
- **Seeds:** `nonprofit website donate`, `event website schedule registration`, `campaign landing page`. Adjacent: posters, protest and campaign print.

## Health, wellness or professional service
- **Job:** earn trust, then book.
- **Works:** named people with credentials, plain description of what happens at a visit and what it costs, booking in two taps, calm palette with strong contrast, accessibility taken seriously.
- **Generic failure:** teal gradient, stock smiling-doctor photo, unreadable pastel text, "holistic solutions".
- **Seeds:** `clinic website booking`, `wellness brand website`, `professional services website team`. Adjacent: clinic signage, patient leaflets.

## Mobile app marketing page
- **Job:** show the app working and send the right store link for the visitor's device.
- **Works:** real screens in context, one sentence of value, store badges that detect or offer both, a short list of what is different, privacy and support links.
- **Generic failure:** floating phone mockups with gradient glow, five identical feature icons.
- **Seeds:** `app landing page screens`, `mobile app website onboarding preview`. Adjacent: app store screenshots, onboarding flows.

## Checks that apply to every type
Contrast of 4.5:1 for text (3:1 for large text), no horizontal scroll at 390px, labels on every field, a visible focus style, touch targets of 44px on mobile, respect for reduced motion. `scripts/audit-ui.mjs` checks these on the rendered page, so run it on proposals and on the result.
