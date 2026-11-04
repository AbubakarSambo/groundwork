# The old team report, against the rebuilt Report tab

Hafsah's instruction, 1 October 2026: before removing the unused old team report page, compare it
with the rebuilt Report tab. If the old page had any section the new tab lacked, especially anything
about patterns, coaching, roles or probes, move it into the Report tab first, from the shared parts.
Then remove the old page and say in the report what, if anything, was moved.

## What was found

`client/src/pages/report/ReportPage.tsx`'s default export (`ReportPage`) only ever redirected to
`/grounds/:id?tab=report`. The ~1,750-line `ReportBody` it also exported, and the components it
drew (`ResolutionSection`, `OutcomeFeedbackSection`, `PatternBlock`, `AreaBlock`, `HonestClose`,
`WhereTheRecordIsThin`, `WhatTheGroundCanTellYou`, `HiddenContributorsSection` and more), were drawn
by no route - confirmed by the file's own regression tests, several of which already said so in
their own comments.

Reading `the-four-reports.ts` (`api/src/modules/reports/`) - the engine's own map of where every
report field belongs - showed this work was already well under way: most of `ReportBody`'s sections
had already been given a live home by earlier passes (the engine workspace's own comments call this
"the surfacing work"), and the engine's file names exactly two remaining items in
`BEFORE_THE_DEAD_BODY_CAN_GO`: the resolution panel's "nothing to say is a line, not a panel" rule,
and "what the server already knew reaches the page, lead-only" (the weigh section and the soft
spots). This document is the section-by-section comparison that confirms that reading and the two
exceptions found along the way.

**The server response checked against**: `GET /grounds/:id/report`, as Rukia
(`rukia.u8lead@example.test`, the lead) for "Sales team, Q3" (`9028f0ad-293b-4592-9a4e-25b680dd91cd`).
This is the same endpoint `ReportBody` called (`reportsApi.get`) and the one `SessionReportPage.tsx`
now calls as `groundReport`.

## The table

| Old `ReportBody` section | What it showed, and the field | Who could see it | Does the Report tab's surface show it, and where | Does the server still send it to that reader |
| --- | --- | --- | --- | --- |
| `ResolutionSection` | The agreed-at-the-start resolution state, and the live `/resolution` read: current status, outcome, reason, per-party tally | Lead and org admin only (resolution state); the live tally per `leadDecides` | **Yes, and more.** `ResolutionPanel.tsx`, used on the board (`board-top`/`board-bottom`) and on `EndingPage.tsx`. Fuller than the old section: it proposes, confirms and shows "How this ended" to everyone, not just a read. One behaviour genuinely differs: the old section rendered a one-line "Resolution. Not set yet." even far from the end; the live panel renders nothing at all until a decision is near or under way. Judged as a design decision of the richer rebuild, not a regression - see the note to the engine, request 99. | Yes, `/resolution` |
| `OutcomeFeedbackSection` ("did this feel fair") | `outcomeFeedbackApi.mine`/`.submit`, shown once the ground is closed | Everyone (private per-person answer) | **Moved.** `client/src/components/gw/OutcomeFeedback.tsx`, rendered on the board under `ResolutionPanel` once `groundEnded`. Same two buttons, same wording, same privacy note. | Yes |
| `PatternBlock` ("What we heard") | `report.sharedPicture`, with `[INFERRED: ...]` markers split and labelled | Everyone | **Yes**, as the per-session shared report's "The picture from everybody" / "What we heard" on `TheSessionsReport.tsx`, folded as "The full account". | Yes |
| Divergences (`TwoAccountsSideBySide`) / Agreements (`Folded`) | Each side's position, evidence, what is at stake; what is already agreed | Everyone | **Yes**, on `TheSessionsReport.tsx` ("Where things stand") and in full on the board. | Yes |
| `HonestClose` | Aligned / Open / Revisit / Risk, four cells | Everyone | **Yes**, equivalent content is in the board's and the session report's own "Where things stand" and "What is still open" blocks, in the rebuilt shape (a card rather than a four-cell grid) - the facts are the same, the layout changed, per the "sharp part first" rebuild. | Yes |
| `WhereToFocus` (discovery direction) | `report.theDirection` | Everyone | **Yes**, on `TheSessionsReport.tsx` directly. | Yes |
| `WhatToSettleTogether` (`centralQuestion`) | The one thing to settle together | Everyone | **Yes**, on the board (`b.divergence.centralQuestion`) and on `SharedReportForAParty`'s `the-shared-picture-a-party-reads.tsx`. The per-session page draws the session-scoped `theConversationWorthHaving` instead, in its own styling - a deliberate difference, not an omission. | Yes |
| `leadershipGaps` ("Worth your attention as the person leading this") | A pattern in how the check-in was led: a deferred conversation, a commitment nobody was held to, work not handed over, a contribution not seen | Lead and org admin only | **Yes, and better-gated.** `managerAlignment` on the board ("How the leading is landing"), built from `report.leadershipGaps` server-side (`board.service.ts`), shown only when patterns are switched on, only to whoever runs the check-in, and only once seen across three periods (decision 8) - stronger than the old section's bare "if there are any" gate. | Yes (as `managerAlignment`, via the board) |
| `WhereTheRecordIsThin` (`softSpots`, cross-participant) | Per participant: where the picture is thin, and what would settle it | Lead and org admin only | **Was missing; now moved.** Added to `WhatToProbeThemOn.tsx` ("Where this picture is thin"), fed from `SessionReportPage.tsx`'s `groundReport.softSpots`, with `nameFor` resolving each participant id to a name the lead may read. Each spot's own participant-level `mySoftSpots` (a person's own account) was already live, as a bar, in `HowSpecificThisSessionWas.tsx`. | Yes, `softSpots`, lead-only |
| `WhatTheGroundCanTellYou` (the weigh section: what good means, what the record holds, what nobody mentioned) | `whatYouSaidGoodMeans`, `whatTheRecordHolds`, `whatNobodyHasEvidenceFor`, with `[INFERRED: ...]` split and labelled, and the module's own note alongside the standing caveat | Lead (and the person the standard is about) | **Partly live already, now complete.** `WhatToProbeThemOn.tsx` already rendered the three lists (`weigh` prop). Missing and now added: the inferred-marker splitting (was rendering raw `[INFERRED: ...]` text with no mechanism), the "what nobody mentioned" empty-state sentence, and both notes shown together rather than one replacing the other (`weigh.note` **and** `weighNote`, not `??` between them). | Yes, `whatTheGroundCanTellYou`/`whatTheGroundCanTellYouNote` |
| `whatItRestedOn` ("What you said it rested on") | The conditions a standard depended on, not in anybody's hands | Lead (and the subject) | **Was missing; now moved.** Added to `WhatToProbeThemOn.tsx`'s weigh block. | Yes, `whatItRestedOn` |
| `whereThisStarted` ("Where this stood at the start") | What was true on day one, frozen, gated on `canShowMovement` | Lead (and the subject) | **Was missing; now moved.** Added to `WhatToProbeThemOn.tsx`'s weigh block, with the "Added at session N" line folded into one sentence. | Yes, `whereThisStarted` |
| `HiddenContributorsSection` | People the record references who are not themselves a party, with an add-or-request action | Everyone sees the names; the action differs by role (initiator adds directly, a participant requests) | **Was read-only; now interactive.** The board already named these people (`b.hiddenContributors`); the add/request action was missing. Added as `HiddenContributorRow` in `BoardPage.tsx`, with the same two code paths (`groundsApi.addParticipant` for the initiator, `participantRequestsApi.create` otherwise), the same address validation, and the same toasts. | Yes, `engagement.hiddenContributors` |
| `arcAdvisories` ("For your review - record shape") | A reviewer flag about how an account was given, with `features[]` | Lead and org admin only; stripped from a participant's own read server-side | **Was missing; now moved.** Added to `WhatToProbeThemOn.tsx` ("For your review, about the record itself"), named only through `nameFor`, never through a field on the row. | Yes, `arcAdvisories` |
| `updates` (the visible corrections trail) | Who revised their account, when, and whether it was after sign-off | Everyone | **Was missing; now moved.** `client/src/components/gw/UpdatesToTheRecord.tsx`, rendered on `SessionReportPage.tsx` under the shared report, named only through `nameFor`. | Yes, `updates` |
| The inferred-claims review (`InferenceReviewPanel`) | Each inferred claim, with "Correct this" | The party it is about | **Already moved** (an earlier pass): on `SessionReportPage.tsx`, beside the self-correction control. Confirmed unaffected here. | Yes, `inferences` |
| `WhatToWalkInWith` (private prep for the next conversation) | What to say, privately, before talking to them | The reader themselves | **Already moved** (an earlier pass): into the shared `YourWork` component, rendered on My work / My record. Confirmed unaffected here. | Yes, `postReportGuide` |
| The legend ("How this report is put together") | The three explanations of the report's own method | Everyone | **Already moved** (an earlier pass): to the foot of the board, as "How this board is put together", in its own wording. Confirmed unaffected here, with the detail (closed by default, styled as a control, responsive) now locked by a test against the live file. | n/a (static copy) |
| The "On record" specificity badge | A colour-coded specificity label beside each person's name | Everyone | **Deliberately removed**, not moved - the old file's own comment calls this out as "a grade on a named colleague", which the product's privacy rule forbids showing to anyone but the person themselves. Each person's own specificity is private, on My record and (per session) on `SessionReportPage.tsx`'s own half. Confirmed by `no-grades-on-the-shared-page.spec.ts` against the live surfaces. | Computed, but correctly never served to a shared surface |
| `conversationApi.download` ("this record is yours... download it") | A text file of one finished session | The party whose session it is | **Was missing; now moved.** Added to `SessionReportPage.tsx`'s private half, for the one session that page already is. | Yes, via `conversationApi.download(checkInId)` |
| The stale-version banner ("someone has checked in since this was written...") | A warning that the ground-level report on screen predates a later check-in | Everyone | **Not moved.** The per-session report (`TheSessionsReport.tsx`) is fetched fresh on each visit instead of polled with a staleness flag, and already says when it was last updated (`lastChangedLine`). Whether a live "you are reading an old version" banner is still needed on the rebuilt surfaces is a product question, left as a note for Hafsah rather than decided here (see `a-panel-with-nothing-to-say-is-a-line.spec.ts`). | n/a (client-side comparison) |
| The "Picture forming" progress banner (role="status", "X of Y checked in for session N") | Live progress while a round is open | Everyone | **Not moved as a status region.** The same fact (who has checked in, for which session) is said as plain rendered text on the Report tab and `TheSessionsReport.tsx`, but not inside an `aria-live` status element, because the page loads it rather than polling it. Left as a note for Hafsah (see `the-page-says-what-it-is-doing.spec.ts`). | Yes, `sessionProgress` |

## What was not moved, and why

Two items, both because moving them exactly as the old page had them would not have been honest to
the live, richer surfaces that replaced them:

1. **Resolution's "one line until there is a resolution" rule.** The old section always rendered,
   even far from the end, saying "Resolution. Not set yet." when there was nothing to show. The
   live `ResolutionPanel` renders nothing at all in that case - a stronger form of "a panel with
   nothing to say takes no space", not a weaker one, but a genuinely different behaviour. This is a
   product decision (is a quiet "nothing yet" line still wanted on the board, far from the end?)
   rather than a mechanical move, so it is left as a note rather than built.

2. **A live "you are reading an old version" banner**, and the **"Picture forming" status region**.
   Both existed because the old page polled a cached ground-level report. The rebuilt surfaces fetch
   fresh on each visit and already say when they last changed in plain text; whether an aria-live
   status region or a staleness warning is still wanted on top of that is a design call for Hafsah.

## Where each protected thing lives now

- **Patterns and coaching for the lead** (`leadershipGaps`): `managerAlignment` on the board
  (`BoardPage.tsx`, "How the leading is landing"), gated on patterns being switched on and seen
  across three periods - stronger than before.
- **Role behaviour**: role-based gating (lead vs. participant, initiator vs. admin) is preserved
  exactly as it was on every moved section - `isInitiator`/`viewerRunsThisCheckIn` on the board,
  `amTheInitiator` on `SessionReportPage.tsx`.
- **The probe structure** (`probes`, "What to ask each person"): `WhatToProbeThemOn.tsx`, unchanged,
  now also carrying the weigh section, the soft spots, the record-shape flag and the restedOn/
  startedAt fields alongside it - all lead-only, on `SessionReportPage.tsx`.

## Tests removed or moved

See the main report for the full list, with the reason for each. In short: ten specs read the dead
`ReportBody` directly. Two retired outright because they tested the dead component's own internals
(an export existing, an `embedded` branch). The rest were retargeted to the live file that now holds
the same rule - never deleted, because each protects a real rule (several of them privacy rules)
that still applies on a live surface.
