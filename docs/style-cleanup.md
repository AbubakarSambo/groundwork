# Style clean-up, page by page

Table of pages reviewed for the one-off style clean-up (`client/src/components/gw/ui/one-off-uses-per-file.ts`), largest count first. A row with "no change" means the page was read closely for exact matches to the shared parts (`Stack`, `Note`, `Callout`, `Button`, `PageTitle`, the `gwui-*` shared classes) and none were found that would be pixel-identical - only near-matches, which the task rules out.

| Page | Uses before | Uses after | States checked | Result |
| --- | --- | --- | --- | --- |
| `pages/board/BoardPage.tsx` | 584 | 584 | Sampled ~40 of the 584 one-off uses across the file (comparisons, errors, decisions, patterns) | No change. Every sampled use is either (a) a font-size/colour utility combined with an inline `lineHeight`/`fontWeight`/`letterSpacing` that no shared text part covers, or (b) a `gwui-gap-N` class paired with an inline `display: flex` *row* (horizontal gap between buttons/badges) - `Stack` only reproduces a *vertical* `margin-top` stacking, so it is not the same layout and would be a near-match, not an exact one. Matches the engine's own finding in `docs/answers-from-engine.md` item 18. |
| `pages/grounds/GroundParticipantPage.tsx` | 1 | 1 | Settings tab, the one `gwui-gap-10` + flex-column div | No change. The file's own comment (just above the div) explains this one is deliberately kept as `display: flex; flexDirection: column` because `MyParticipation`'s child sections rely on CSS `order` to reorder without moving in the source; `Stack` lays out with plain block margins and would silently break that reordering. Pinned by `what-is-true-about-you-comes-first.spec.ts`. Confirmed still accurate by reading the test and the component. |
| `components/gw/WhatToProbeThemOn.tsx` | 1 | 1 | Grepped for the file's one listed one-off class | No change. The one count is not a font-size/colour/gap utility text-style combination with no exact shared-part match (same shape as the rest of the list). |
| `pages/company/CompanyContextPage.tsx` | 1 | 1 | The one `gwui-ink-sub` span | No change. Plain inline colour on a run of text inside a sentence; no shared part renders an inline coloured `<span>`. |
| `pages/company/CompanyPage.tsx` | 2 | 2 | Both `gwui-ink-sub` spans | No change, same reason as above. |
| `pages/suites/OnboardingBoardPage.tsx` | 2 | 2 | Both `gwui-ink-sub` uses (progress count, step description) | No change, same reason as above. |
| `pages/you/YouPage.tsx` | 3 | 3 | All three `gwui-ink-sub` uses | No change, same reason as above. |

No file's count changed this pass, so `one-off-uses-per-file.ts` is untouched and no commit was made. `npx tsc --noEmit` and `npx vitest run` were not re-run because nothing in `client/` changed.

## Why nothing moved this round

The one-off classes still left on every page sampled fall into two shapes, neither of which has an exact shared equivalent today:

1. **Inline text styling** - a `gwui-fs-N` and/or `gwui-ink-X` class on a `<span>`/`<div>`/`<p>`, usually combined with an inline `fontWeight`, `lineHeight`, or `letterSpacing` that is specific to that one sentence. There is no shared "Text" part in `components/gw/ui/` that takes a size, a colour and those extra properties; building one now would be inventing a new shared part, which the task says to leave alone until there is a write-up and visible gain.
2. **Horizontal `gap` on a flex row** (`gwui-gap-N` with inline `display: flex` and no `flexDirection: column`) - buttons or badges spaced across a row. `Stack` only reproduces vertical `margin-top` stacking between block children, so swapping it in would be a behaviourally different (and here, visually different) layout, not an exact match.

This agrees with `docs/answers-from-engine.md` item 18: "the one-off style clean-up stopped where no exact shared class exists... Going further means new shared parts with no visible gain." This pass re-checked that conclusion against the current code (including one new read of `GroundParticipantPage.tsx`'s settings tab, which has its own documented, test-pinned reason for staying a flex column) rather than taking it on trust, and found it still holds.

## Round 2 (9 October): two new shared parts, `FlexRow` and `Text`

Hafsah asked for the clean-up to continue past round 1's "no exact match" conclusion by adding two
new shared parts whose CSS is exactly what the inline code already does, so swapping them in cannot
change a pixel: `FlexRow` (`components/gw/ui/FlexRow.tsx`) and `Text` (`components/gw/ui/Text.tsx`).
Written up in `docs/the-parts-against-the-prototype.md` per the guard's own requirement.

**Method used for BoardPage's first batch (`FlexRow`):** before screenshots of the board, signed in
as the lead and as a member, on two boards of different kinds (one report-ready with both of them in
it, one still active with only the lead), full page, at 1440 and 390
(`e2e/sweep/style-cleanup-pixels.spec.ts`, screenshots to the scratchpad, not committed). The before
set was run twice first to check the page's own noise - both runs came back pixel-identical, so no
masking was needed. Every `<div className="gwui-gap-N" style={{ display: 'flex', ... }}>` row (no
fixed width, no `flexDirection: column`) was swapped for `<FlexRow gap={N} ...>`, after screenshots
taken, and compared pixel by pixel against the before set with `e2e/sweep/compare-style-shots.js`
(uses `client/node_modules/pngjs`, already a project dependency, rather than adding `pixelmatch`,
which was not installed; same idea - a per-channel tolerance for anti-aliasing, exact match required
otherwise).

| Page | Uses before | Uses after | States checked | Result |
| --- | --- | --- | --- | --- |
| `pages/board/BoardPage.tsx` (FlexRow batch) | 584 | 561 | report-ready board as lead and as member, active board as lead, at 1440 and 390 (6 screenshots) | 0 differing pixels in every screenshot. 23 `gwui-gap-N` + inline `display: flex` rows converted. |

**Second batch, same session (`Text`):** the 14 style-free `gwui-fs-N`/`gwui-ink-X` cases in
`BoardPage.tsx` (a sentence set in one size and one colour with no inline style at all) were
swapped for `<Text size="N" ink="X">`. One more occurrence (`TheLeadsNote`'s own `className` prop)
was left alone - it passes the classes into another component's prop API, not onto a literal
element, so it is not this shape. 561 -> 533 one-off uses.

Pixel proof hit one false alarm worth recording: the first after-run showed real differences on
the lead's two screenshots and one of the member's, all traced to the SAME cause - the sidebar's
own check-ins list ("Your check-ins did not load. Reload the page to try again."), a background
fetch entirely separate from the board itself, flaking under the repeated sign-ins this sweep does.
`style-cleanup-pixels.spec.ts` now checks for that exact sentence after each page load and reloads
(up to twice) until it is gone, same as it already retried a dropped sign-in. With that fix, three
separate before/after comparisons (against the FlexRow-batch screenshots, and against the very
first baseline from before any change) all came back at 0 differing pixels on all 6 screenshots.

| Page | Uses before | Uses after | States checked | Result |
| --- | --- | --- | --- | --- |
| `pages/board/BoardPage.tsx` (Text batch) | 561 | 533 | report-ready board as lead and as member, active board as lead, at 1440 and 390 (6 screenshots) | 0 differing pixels in every screenshot, once the sidebar's own unrelated flake was retried past. 14 style-free `gwui-fs-N`/`gwui-ink-X` text elements converted. |

**Left for a future batch:** `Text`'s props for `weight`/`lineHeight`/`letterSpacing`/`display` were
built but not yet exercised - BoardPage's remaining `gwui-fs-N`/`gwui-ink-X` uses all carry an
inline style alongside the classes (the common shape is size, colour, and one of `fontWeight 600`/
`700`, `lineHeight 1.4` to `1.6`, or both), which `Text` already covers prop-for-prop; converting
those is the safest next target.

**Still left alone, and why:** every `gwui-gap-N` with a fixed `width` or paired with
`flexDirection: 'column'` (`GroundParticipantPage.tsx`'s settings tab - its own comment explains the
children need `order`, see `docs/the-parts-against-the-prototype.md`) - not `FlexRow`'s row-only
shape. The CSS-grid `gwui-gap-N`/`gwui-gap-14` rows (`display: 'grid'`, three of them in
`BoardPage.tsx`) are a different layout mode entirely and were not touched.
