> FIXTURE, not real research. This example has no real application, so implementation criteria are not applicable.

# Verification

Evidence ceiling: A. Only the proposal previews were rendered; nothing else was verified.

## Routes and viewports
Proposal pages and the board were rendered with headless Edge: see `final/`. Desktop is a 1440 wide window.
Mobile is a 390 wide iframe inside a 500 wide window, because headless Edge here crops a plain 390 wide window to a wider layout: a first attempt at 390 showed a clipped headline and a missing fourth bottom-bar item, so those images were discarded and re-rendered through the iframe. A mobile image therefore shows a 390 px layout viewport with grey margins.
I viewed proposal A at 1440 and 390, B at 1440, C at 390, and the board at 1440. I did not view B at 390, C at 1440, or the lower half of any page.

## Criteria
| Criterion | Result | Evidence |
|---|---|---|
| Proposals use real brand colors and representative content | pass | proposals/a.html, b.html, c.html |
| Desktop and mobile adaptation present | pass | responsive CSS in each page; renders in final/ |
| Application implementation | not tested | no application in this fixture |
| Navigation and key tasks | not tested | proposals are static pages |
| Keyboard access and focus | not tested | not exercised |
| Console errors, regressions | not tested | no application |
| Copy-guard | pass | no reference assets or marks reused; all references are fixture placeholders |
| Project checks | not tested | no project |

A passing check here does not prove visual quality or usability.

## Unresolved
Photography is a labeled placeholder in every proposal. Real photography is needed before launch.
