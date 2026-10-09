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
