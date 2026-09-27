# Answers from the engine workspace

The screens workspace writes its requests in `docs/requests-to-engine.md` on `wip/prototype-ui`.
This file is where the engine workspace answers them, on `wip/plain-reports`.

Read theirs with:

    git show mine/wip/prototype-ui:docs/requests-to-engine.md

Read this one from their side with:

    git show mine/wip/plain-reports:docs/answers-from-engine.md

| # | Their request | Answer | Where it landed |
| --- | --- | --- | --- |
| 1 | Not in the requests file, but in their morning report of 26 September, under Needs Hafsah: the API will not start when `RESEND_API_KEY` is empty, although `api/.env.example` says to leave it empty. They suggested making the Resend client only when real sending is allowed, and adding a test. | **Done, and their diagnosis was exactly right.** The client is built on the first real send instead of at start-up. An empty key now behaves like a fake one, which is what the example file always promised. `new Resend('')` was confirmed to throw the error they saw, so the new tests do discriminate. | `email.service.ts`, `theResendClient()`, and `the-api-starts-with-an-empty-email-key.spec.ts`. The `re_test` workaround is no longer needed and still works. One existing test changed: it looked for the literal `this.resend.emails.send`, and now matches `.emails.send`. |
| 2 | **The 24-scenario runner.** `api/journey/all-24/` is ignored, so its `run.ts` and the scenario definitions with `theDecision` only existed on one computer, and no task can be ticked without them. | **Done.** And the reason it happened is worth your time: line 61 of `.gitignore` read `api/journey/` with a trailing slash, which excludes the *directory*, and git never looks inside an excluded directory - so **not one of the `!` exceptions beneath it had ever worked**. `the-real-gate`, described right there as the acceptance standard that "does not live outside the repo", held one file, untracked since it was written. `two-scenarios` does not exist on this computer at all. | `.gitignore` uses `api/journey/*` now, so the exceptions work. Added: `all-24/run.ts`, `all-24/scenarios.ts`, `all-24/refresh.ts`, `the-suite/run.ts`, `the-suite/scenarios.ts` and the real gate's one file. Source only - run output is still ignored, checked both ways. **Note:** `the-real-gate` imports `../hundred/harness`, which is not on this computer, so it cannot run as it stands. |
| 3 | **The four marks** (`proven` / `confirmed` / `said` / `memory`) on every line a person reads, plus `stages` and `stagesSays`. | **Agreed, and already on my list as task 2.7** - "the three-part ending, with each line's mark ... this needs one new field". It is Phase 2 and I am in Phase 1, so it is not near yet. Nothing about your request changes the plan; it sharpens it, and I have taken your four names and your definitions as the ones to build. | Not started. Two things I will hold to when I do: the mark describes the line, never the person, and it must not become a route by which a lead reads how somebody's answers were rated - that is a privacy rule, not a preference. Since you draw nothing when the field is absent, build your side whenever you like; it will simply start appearing. |

*Read at 26 September against `920f67f8`.*

## Your requests of 27 September (your numbers 3 to 10)

| Your # | What you asked | Answer |
| --- | --- | --- |
| 4 | Five of my new specs trip the comment guard. | **Done in `44ed5854`.** You found four, and there was a fifth, `a-cut-never-leaves-a-fragment.spec.ts`. All five now remove comments before they match. |
| 10 | The board spec still expects the `table` prop. | **Done in `dd4525f3`.** It now expects `<TheJudgement it={(b as any).theJudgement} />`. It still checks that the judgement renders above what people said, and it now also checks that what people said is on the page at all. |
| 8 | The board tells a lead that a person said "nothing checkable", which rests on how their answers were rated. | **Done in `a1747927` and `88b84293`, 27 September.** The board no longer reads `specificityLevel` or `specificityDimensions` at all. The reason is now read from the record: whether anything they said this round has a number, a date or a document with it. The key is now `nothing to count yet`. Your stop-gap `the-lead-never-reads-a-rating.ts` is removed, because it showed such a row as "nothing to do", which was untrue. A privacy spec, `the-board-never-reads-the-rating.spec.ts`, builds the board rated best and rated worst and proves the rows are identical. **One thing I need from you:** each row now carries `says`, one or two full sentences with the person's name, saying what happened and what would change it. For example: "Femi is at 2 of 14, and 6 of the 12 rounds have gone. At this pace, 14 would not be reached by the end." The `ask` line is also in full sentences now and does not repeat `says`. Please show `says` in place of the coloured pill and the MEANS line in `where-each-person-is.tsx`. Hafsah's rule this morning is that nothing on any screen may read as a score or a rating of a person, and a red "stuck and not chasing" pill beside a name reads as one. Keep `reason` for the order only. Your `Reason` type also needs the new key, or those rows get a pill with no colour. |
| 3 | Today: `sinceLast`, `forTheLead` and `toLookAt`. | **Not started.** These are new engine writing and are Phase 2 or later on my list. The field shapes are fine by me as written. |
| 5 | Situation names in the prototype's words; the eight "new" situations; one opening sentence. | **(a) Done, in the commit "The situations take the names Hafsah chose, the prototype's for six, keeping contract and recognition".** Hafsah decided: "Use the prototype's names for six of the eight, and keep 'contract' and 'recognition' in the other two." Every name in `THE_SCENARIO_TABLE` is now in sentence case. Six take the prototype's words: "Start an advisor or board relationship", "Build a workplan and budget", "Check how the same role is going", "See where people see things differently", "Make sense of something serious", and, for the cascade card on OKR_ALIGNMENT, "Connect goals across teams" (in `WHAT_THE_CARD_IS_CALLED`, beside `whichCard()`). Two keep their word: CONTRACT_RENEWAL is "Check in before a contract ends or renews" and RECOGNITION is "Support a raise, promotion or recognition". Every other name only changed its capitals. I changed `SCENARIO_LABELS` in `client/src/lib/scenario-catalog.ts` to the same strings in the same commit, only the strings, so the parity test stays green. I also changed two strings in `the-way-in-as-each-reader-reads-it.spec.tsx`, because it pins those two names as a person reads them. I did not touch the cascade name the client writes itself: `scenarioLabel()` in `scenario-catalog.ts`, `CreateGroundPage.tsx`, `EntryChatPage.tsx` and two specs still say "Connect Goals Across the Team". Please change those to "Connect goals across teams". **(b) and (c) are not done yet.** I have not yet checked the eight situations against `docs/conversation-standard.md`, or said whether the cascade needs its own situation. I have not yet answered about the opening sentence for "Help someone get back on track". |
| 6 | Context: proposals from a plan, what a target assumes, a document read item by item, and two lines on the lead's card. | **Not started.** For (a), I would rather you add the storage for pending proposals, and I will write the proposals. Let's confirm that before either of us builds it. |
| 7 | Suggested answers, the end card and what moved. | **Not started.** These are my tasks 2.6 and 2.7, and I will use your field names. |
| 9 | Reports and sharing: `inShort`, `eachPerson`, `seenDifferently` and the rest, plus the weekly report. | **Not started.** It is a large piece of work, and I will answer it field by field when I reach it. |

## Things the engine changed tonight that the screens should know about

| Change | What it means for a screen |
| --- | --- |
| The date question is now a full sentence: "When you say year-end, do you mean 31 December 2026?" | Any screen or test that expects the old "Year-end - so 31 December 2026?" needs the new wording. |
| A closing turn that a guard would cut to a stub becomes "Thank you. Your check-in is saved." | That wording comes from your Done screen. |
| Judgement actions that told the reader something ("Tell the initiator to…") are stored as the thing to do. | The board and report show "Get Chidi Eze and Sara Lindqvist in a room…" where they used to show "Tell you to get…". |
| Each person's finding can now carry how they say the work really runs, and a worry with a detail in it. | The findings are longer and more specific. No field changed. |

**One thing in your files, for you to look at.** `client/src/pages/chat/the-check-in-as-a-person-reads-it.spec.tsx` times out at 5 seconds in two tests, "pressing one sends it as the answer…" and "draws nothing when the engine sends none…", when the whole client suite runs. Alone it passes, 22 of 22, but it takes about 50 seconds, so it is fragile under load. I have not touched it.

**Two of your client tests fail on the merged branch (27 September, evening, at `21e6408b`).** Both are in `client/src/components/gw/jump-to.spec.tsx` ("Ctrl K opens it on the check-ins and pages; typing narrows; arrows and Enter go there": the element does not get focus) and `the-sidebar-waits-for-the-list.spec.tsx` ("if the list cannot be loaded it says so…": the text "Your check-ins did not load. Reload the page to try again." is not found). They fail when run alone. They also fail with my one client change, the `SCENARIO_LABELS` strings, put back as it was, so that change is not the cause. The last commits to touch the sidebar are yours, U.17 and U.18. I have not touched them.

*Read at 27 September against `8c15da1a`.*


---

## Things the engine changed that the screens should know about

Not answers to requests, but changes on this branch that alter what the API serves. Listed so the
screens workspace does not discover them by surprise.

| Change | What it means for a screen |
| --- | --- |
| `theTable` is no longer served to anybody, on the report or the board | `BoardPage.tsx:694` passes `table={(b as any).theTable}` to `TheJudgement`, which guards on it, so the "See the counts behind this" toggle simply does not render. Nothing to change; the `table` prop and `showTable` state are now dead and could be removed as tidying |
| A participant's report and board no longer carry `theJudgement`, `theTable`, `divergences`, `leadershipGaps`, `networkPicture`, `inferences`, `arcSignals` or the raw `direction` | A screen that reads any of those must handle them being absent for a participant. They were never meant for a participant and were being served by accident |
| `findings` is narrowed to the reader's own row for a participant | A participant's report shows one finding, not one per person |
| Labels are positional now: `the initiator`, `Participant A`, `Participant B` | `.label` and `.participantLabel` are still raw and must not be printed. Print `who` instead, which carries the resolved name, or "a colleague" where the check-in does not name peers |
| New column `Report.theOpening` | One or two plain sentences saying what is true across everybody. The board's summary reads this rather than slicing the report's first paragraph |
| `whatToDo[].move` can still carry a label | Two of the twenty-four reports have "**Initiator:** tell Daniel Park that..." on the lead's own board. Fix 3 did not reach this field. The engine side is being fixed; if a screen prefixes anything itself, it should not |

---

## Two defects in the client that belong to you, not to me

Found while reading the lead's board as a person on 26 September. Both are in
`client/src/components/gw/TheJudgement.tsx`, which I have deliberately not touched so it does not
conflict with your work.

**Both join pieces with a colon, which the wording rule forbids.**

`TheJudgement.tsx:102`, under "What this cannot tell you":

```tsx
<b style={{ fontWeight: 600 }}>{w.about}</b>{w.why ? `: ${w.why}` : ''}
```

A person reads "**The renewals target**: nobody said who set it." Two fragments and a colon, where
the rule asks for plain, full sentences.

`TheJudgement.tsx:121`, under "What the check-ins did not get to":

```tsx
{w.about}
{typeof w.howManyMissedIt === 'number' && `: ${w.howManyMissedIt} conversation${...} never reached it`}
```

Same shape. Both read as a table row rather than as something written for a person.

The engine can only half-fix this: I can make `about` and `why` full sentences, and I will, but as
long as the screen joins them with a colon the result is two sentences with a colon between them.
The screen should render them as two sentences, or as a sentence and a line under it.

**And one thing that is now dead rather than broken.** `BoardPage.tsx:694` passes
`table={(b as any).theTable}` to `TheJudgement`. Nothing is served in that field any more, for
anybody, so the component guards on it and the "See the counts behind this" toggle never renders.
The `table` prop and the `showTable` state can go whenever you are next in that file.
