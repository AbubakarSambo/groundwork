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
| 36 | Privacy: a person's label can fall back to the lead's private description of them. | **Done, 27 September, in `a75b13ac`, `5680910c`, `c28dbc97`, `7586775d`, `feea6104`, `7b2a876c`, `731f889c`, `c39d7fca`, `f2c99afc` and `bbc33862`.** Hafsah's words: "Fix it the simple way: the label never uses the lead's description; with no name, use a plain neutral label." **The label.** A person's label is now their own name, or the name they typed at the end of an open link (`nameGiven`), and never `roleAsDescribed`. This covers the board's `nameOf`, the board listener, the email sent when the lead suggests how a check-in ends, `whatToCallThem` in the interview, and four name lists in `conversation.service.ts`. **The word.** With no name, a person is "a colleague". The prototype never says "teammate". With one person the reader cannot name, they are "a colleague". With two or more, they are "one colleague", "another colleague", "a third colleague" and so on (Hafsah's decision, `bbc33862`). When the same person comes up again in the same text, the words say it is the same one. While only one such person has come up, it is "the same colleague". Once two or more have, it is the number their first mention gave them: "the first colleague", "the second colleague". For example, "The second colleague says the tests were the slow part, and the first colleague agrees." This used to read "Another colleague says the tests were the slow part, and a colleague agrees." A board line or a single sentence uses the first-mention words, and a lead with no name is "the lead" ("your lead" to someone in the check-in). These words come from the one function the reports already use, `plainWordsForTheUnnameable`, through a new `plainWordsByPerson`, so the same person is called the same thing everywhere. There is a capital letter only at the start of a sentence or a line. A person now reads, for example: "A colleague has not checked in for this round yet.", "What a colleague said this round has no number, no date and no document with it yet, so there is nothing new to count.", "Ask this colleague to check in.", and the email subject "The lead suggested how to wrap this up". In the report's list of who answered, someone the reader may not name now reads "A colleague", where it used to read "Participant B". **Four more routes, closed.** (1) The board's `contribution[].remit` was `roleAsDescribed`, sent to every reader. It now goes only to whoever runs the check-in, through `theLeadsWordsAbout`, and everyone else gets null. `remitDefined` is kept. On your board card (`BoardPage.tsx`, line 1388), a null remit with `remitDefined` true shows nothing beside the name: the span is empty and no "role not clearly defined" is shown. (2) The report's `people[].role` reaches only the room judgement, which only the lead reads (`whatAParticipantMayRead`, `theBoardsJudgementFor`). No code needed to change, and a test now shows this on the served board. (3) A person's own session is no longer handed the lead's words about them: not "The person who set this up described this person's part in it as", not `PRIOR_CONTEXT`, and not "who described their role as". Only the lead's own row counts as their own words. `remitAsGiven` is the lead's invite note, so it is not used instead. Because the model no longer sees the lead's description, an invited person whose row holds only that description is now asked "are you the person this check-in is about, or somebody working alongside them?" in their first session of a starting situation, the same as somebody with no role (`f2c99afc`). (4) The person's own coaching note said "your work as" plus the start of the lead's sentence, which gave "your work as daniel". It now says "this work" unless the words are the person's own. A new spec, `a-label-is-never-the-leads-description.spec.ts`, searches the whole served board for the person and a peer. Another new spec, `a-persons-session-is-not-handed-the-leads-words.spec.ts`, reads every prompt in a real turn. **Please change these in `client/`, which I have not touched:** `participantLabel` and `personLabel` in `client/src/lib/utils.ts` (lines 91 to 104) still fall back to `roleAsDescribed` and then say "a teammate". "A teammate" is also shown for a missing name in `BoardPage.tsx` (lines 1210 and 1312) and `components/gw/nine-columns-is-not-a-phone-screen.tsx` (line 92). The wording is in comments in `GroundAdminPage.tsx` (around line 1982) and `SettingsPage.tsx` (line 28). Your specs `lib/participantLabel.spec.ts` and `lib/one-way-to-name-a-person.spec.ts` expect "a teammate". **One of your specs now fails because of my change:** `pages/grounds/the-reveal-row-names-who-you-are-waiting-on.spec.ts` (line 66) reads my `reports.service.ts` for `label || 'A teammate'`. That line is now `return aColleague(p.id);`, so please make the spec expect that. |
| 3 | Today: `sinceLast`, `forTheLead` and `toLookAt`. | **Not started.** These are new engine writing and are Phase 2 or later on my list. The field shapes are fine by me as written. |
| 5 | Situation names in the prototype's words; the eight "new" situations; one opening sentence. | **(a) Done, in the commit "The situations take the names Hafsah chose, the prototype's for six, keeping contract and recognition".** Hafsah decided: "Use the prototype's names for six of the eight, and keep 'contract' and 'recognition' in the other two." Every name in `THE_SCENARIO_TABLE` is now in sentence case. Six take the prototype's words: "Start an advisor or board relationship", "Build a workplan and budget", "Check how the same role is going", "See where people see things differently", "Make sense of something serious", and, for the cascade card on OKR_ALIGNMENT, "Connect goals across teams" (in `WHAT_THE_CARD_IS_CALLED`, beside `whichCard()`). Two keep their word: CONTRACT_RENEWAL is "Check in before a contract ends or renews" and RECOGNITION is "Support a raise, promotion or recognition". Every other name only changed its capitals. I changed `SCENARIO_LABELS` in `client/src/lib/scenario-catalog.ts` to the same strings in the same commit, only the strings, so the parity test stays green. I also changed two strings in `the-way-in-as-each-reader-reads-it.spec.tsx`, because it pins those two names as a person reads them. I did not touch the cascade name the client writes itself: `scenarioLabel()` in `scenario-catalog.ts`, `CreateGroundPage.tsx`, `EntryChatPage.tsx` and two specs still say "Connect Goals Across the Team". Please change those to "Connect goals across teams". **(b) and (c) are not done yet.** I have not yet checked the eight situations against `docs/conversation-standard.md`, or said whether the cascade needs its own situation. I have not yet answered about the opening sentence for "Help someone get back on track". |
| 6 | Context: proposals from a plan, what a target assumes, a document read item by item, and two lines on the lead's card. | **Not started.** For (a), I would rather you add the storage for pending proposals, and I will write the proposals. Let's confirm that before either of us builds it. |
| 7 | Suggested answers, the end card and what moved. | **Not started.** These are my tasks 2.6 and 2.7, and I will use your field names. |
| 9 | Reports and sharing: `inShort`, `eachPerson`, `seenDifferently` and the rest, plus the weekly report. | **Not started.** It is a large piece of work, and I will answer it field by field when I reach it. |
| 19 | Privacy: the board names who is waiting on you, even where people don't see each other. | **Done, 27 September, in the commit "A participant reads no colleague's name on a board where people see only themselves".** On a check-in where people do not see each other (the setting is off, or it is not set and the kind of check-in hides people by default, decided by the one rule, `peersAreNamedOn`), a participant's board now names only themselves and the lead. Everybody else is "one colleague", "another colleague" and so on, in the words the reports use (`plainWordsByPerson`, fed the names this reader may see by `namesVisibleTo`). This is done in the board's one `nameOf`, so it covers both ends of a handoff (your request: whoever is waiting on the reader is now "one colleague"), the list of people (`participants[].name`), and who picked a time in the poll. The lead and admins still read every name. Nobody's role reaches a participant, as before. A participant on such a check-in now reads, for example, the list "Wairimu Kamau", "Miriam Wanjiku", "One colleague", "Another colleague", and the handoffs "Miriam Wanjiku is waiting on One colleague for the pricing sheet" and "Another colleague is waiting on Miriam Wanjiku for the stock count" (as `from`, `what`, `on`). The capital letter is `atTheStart`, as everywhere else on the board; mid-sentence, please lower it. `the-board-opens-for-every-reader.spec.ts` searches the whole served board, as each participant, on every situation where people are hidden, for every colleague's first name, last name, address, role and organisation, and finds none. **Please check these places draw a colleague correctly:** the board's list of people and every card that looks a person up by `participantId` in `participants` (`BoardPage.tsx`, `nameOnTheBoard`), the handoffs (`dependencies[].from` and `.on`), the poll's `who`, and the check-in grid rows. |
| 56, 58, 65 | An email address used as a name. | **Fixed, 28 September, in `fdc1439b`.** Hafsah: a lead never sees "Start with zawadi.u8@example.test"; use the person's name, or a plain sentence when there isn't one. `displayName` no longer returns an address to anybody, so a person with no name is "a colleague", "another colleague" everywhere, `probes` included. Four places that fell back to the address are fixed. Text already stored with an address in it is read once more at the end of every board and report read, and the address becomes the name or the plain words. A field that is an address by design (`email`) is left as it is, so you can still show it beside a person where the lead needs it. The count of "4 of 5" against "4 of 6" in request 56 was request 69's fix. |
| 62 | "How much you gave this one" or the prototype's words. | **Done, `f0168cff`.** `WHAT_THE_BLOCK_IS_CALLED.howMuchYouGaveIt` is now "How checkable today’s check-in was". `the-order-is-the-order-on-screen.spec.ts` passes. |
| After the merge of 28 September | Three of your client tests fail on your branch as it stands. | `nothing-is-left-behind.spec.ts` (`components/gw/GroundTabRow.tsx` is no longer imported by anything), `a-phone-is-not-a-narrow-desktop.spec.ts` (the section heading's right-aligned source line), and `that-is-on-the-record.spec.tsx` (the header after the one-line question). These test your own files mid-rebuild; the merge changed no client file of mine. Passing them on to you, not changing them. |
| 54 | Internal labels in the session report and the rounds. | **Fixed, 28 September, in `0bad62f2`.** The routes it took: the session report's own fields (`atStake`, `settledBy`, `restsOn`, `positions[].view`, `whatEachPersonSaid[].finding`, `theConversationWorthHaving`) and `rounds[].sharedPicture` were built after the name swap and never went through it. Rather than add them one by one, every board and report read now ends in the same last read: the board, `/report`, `/report/session/:n`, `/report/rounds` and `/report/against-success`. Any label left anywhere becomes the name this reader may see, or "a colleague", "another colleague" where they may not. "You is aiming" and "until you sends it" are mended there too, outside quotation marks only. A test serves the board and each report read to the lead, each participant and an admin who only reads, with people named to each other and not, and finds no label. The emails in `probes` and elsewhere (requests 56, 58, 65) are a different fault and still open. |
| 53 | Dates arriving as `{}`. | **Fixed, `0bad62f2`.** Both walks in the name swap now leave a Date as a Date. |
| 46, again, and 63 | A private file's name, and a hidden target's number, on the board. | **Fixed, 28 September, in `7afee54e`.** The fields were already walled; the sentences were not. Now everything the board sends, and everything `GET /report` and `GET /report/session/:n` send, is read once more for the reader. A file's name comes out where `canSeeDocument` says the reader may not open it; a lead's own file is not named to an admin. A sentence giving a person's target comes out where `targetsFor` says the reader may not see it; on a row about one person, any sentence with their number goes. An aim left empty is dropped from `objectives`. A test serves the board and the report to the lead, the person whose target it is, a participant with no target, and an admin who only reads. On run-14's sales check-in, Ngozi reading Kwame's 14 is not covered by this: Kwame said it himself in his own check-in, and that check-in has no per-person targets set by the lead. I have asked Hafsah whether a person's own stated target should be treated like one the lead set. Nothing changes on your side. Not live on the local API until the current full run ends. |
| 68 | "Unblock: …" on the decisions list. | **Fixed, `7afee54e`.** "Somebody is waiting on the discount decision, so it needs deciding." The divergence line next to it had the same shape ("Settle: …") and now reads "The accounts differ on whether a price range counts as a budget, so it needs settling." |
| 69 | Two head counts, and "Four of the 6". | **Fixed on the engine side, `7afee54e`.** Hafsah decided the count people read uses the same people as your header. The server now has that rule too (`whoIsInTheRound` in `reports/how-many-have-answered.ts`: everybody, and a lead who only asks in round one only). The board's `howItIsGoing.glance.progress.answeredThisRound` and `ofPeople` use it, and so does the report's opening count, for the round being reported. It used to count everyone who had ever finished, the lead included, against a different set. `waitingOn` still uses the round-closing rule, so someone whose invitation lapsed is counted but not waited on. The sentence is all in words or all in figures: "Four of the six people have answered so far.", "12 of the 41 people have answered so far." Your `whoIsInRound` can stay as it is. |
| 51 | The session report before someone has answered. | **Fixed, `ef212298`.** Before the report is released, a participant who has not answered that session gets only `{ sessionNumber, withheldUntilYouAnswer: true, saying }`, where `saying` is the same sentence the main report gives ("A picture is forming from the accounts that are in. You can read it as soon as you have given yours…"). Please show `saying` when `withheldUntilYouAnswer` is true, as you already do for the main report. The lead and an admin read as before; once released, everybody does. |
| 52 | `parties[].confidence` on another person's row. | **Fixed, `ef212298`.** It comes off with `specificityLabel`, and the privacy test checks it. |
| 49, 57 | A person held for a seat reading the report; any admin releasing it. | **With Hafsah.** Both are product decisions, asked in the morning report. |
| 7a | Suggested answers under each question. | **Built, 28 September, in `e313b579`, not yet measured live.** `suggestedAnswers?: string[]` is on the open response, on each reply (`POST /check-ins/:id/messages`), on the stream's `done` event, and on each AI turn in `GET /check-ins/:id/transcript` (stored on the turn, so they survive a reload). Two to four, or the field is left out; never one on its own. A turn that asks nothing, such as the closing one, has none. They are built from the question and the person's own last answer only. Some carry a gap written as "...", such as "We have sold ... so far.", for the person to fill in, so please let a tap put the text in the box rather than send it. 7b and 7c are not started. |
| 8, changed back | "Nothing checkable" on the lead's board. | **Changed on Hafsah's correction, 28 September, in `01379c6e`.** She decided that the rating of how checkable a person's answers are is needed, and that the lead's board shows it as the prototype does. So `eachPerson[].reason` can be `'nothing checkable'` again, and `'nothing to count yet'` is gone. Please (1) add `'nothing checkable'` to the `reason` type in `client/src/api/board.ts` and to `TONE` and `MEANS` in `where-each-person.tsx`; (2) show the pill as "Nothing checkable", as the prototype writes it; (3) show `says` under it, which is a full sentence and now counts the weeks in a row ("This is the second week in a row."), in place of `MEANS` if you like; (4) show `ask`, which now also carries what to ask next for this reason, for example "Ask Miriam Wanjiku for a photo, a message or a document that shows what moved." These rows are sent only to whoever runs the check-in and admins, never to a participant. If you took "nothing checkable" out of any screen because of request 8, it can come back as the prototype shows it. |
| 43, (a) | Privacy: the lead's path. | **Done, 28 September, in `828b4837`.** Hafsah decided that leads and admins are never sent how anyone's answers were rated. Every reader of a report now gets only the rating of their own answers. The Done page's "Only you see it" is true now, so please update the wording there if you had changed it to wait for this. **One change on your side:** `POST /grounds/:id/report/release` now returns `{ groundId, releasedAt }`, not the report. It used to send the whole stored report, with every rating and every private guide. `reportsApi.release` in `client/src/api/reports.ts` is still typed `Report`. `GroundAdminPage.tsx` only refreshes after it, so nothing breaks, but the type should say what comes back. |
| 43 | Privacy: every reader of a report gets everyone's rating. | **(b) Done, 28 September, in `59a62cc3`.** The forming report now goes through `withoutOtherPeoplesReads` like the other two places, so a participant who has answered keeps only their own rating. A test checks every call is wrapped. **(a) is with Hafsah.** `own-reads-only.ts` gives the lead and an org admin everyone's reads on purpose, and CLAUDE.md says leads never see ratings. That is a privacy decision, so I have asked her in the morning report and changed nothing. Please keep the Done page's wording as it is until she answers. |
| 40, 44 to 48 | Document wording, opening speed, the checkable read, a file named on the board, the closing gate, a closing message twice. | **Read, not started.** 46 (a private file named on the board) and 47 (the conversation says the report is ready, then the server refuses) come first when I next work. |
| 47 | The closing message and the completion gate disagree. | **Fixed on the engine side, 28 September, in `1a9ffa59`, being re-run twice.** Thank you for the ids. They are in `groundwork_dev` on your computer, which this one does not have, so I worked from your description. (1) When the product refuses a close and has no question of its own to add, the model's goodbye now comes off the turn, on the stream too, and the product's usual question goes on. So "Your report is ready now. Speak soon." is never written with `sessionComplete: false` any more. (2) "Please finish my check-in" is now heard as asking to finish, so the floor lets them out, as it already did for "finish this check-in". Your floor gate on `mayCompleteAfter` can stay as it is. For `117d94e8`, where the end card came before the 400, I could not find a server path that sends `sessionComplete: true` below the floor. If your end card also comes up on the client's own reading of "asked to finish", that reading now matches the server's for "my check-in". If it still happens after this, please send me the turns. |
| 46 | The board names the lead's private file. | **Fixed, 28 September, in `fc82c0a5` and `9758c050`.** The name came through the lead's own check-in: Groundwork's reply named the file, her answer echoed it, and the report was written from every record line. Now private file names are taken out of what the report is written from, and out of any note or line read by anyone but the lead, on the check-in's page and in their own check-in. The note "The numbers on this check-in come from X" names the file only when it is OPEN. The session report lists only the documents the reader may open. Nothing changes on your side. |
| 47, first look | The closing message and the completion gate disagree. | **Not fixed yet. What I found in the code, 28 September.** The two checks use the same turn floor (`theFloorFor`) and the same "they asked to finish" test, so they should not disagree on the count. Two places look likelier. (1) When the product decides the session is not over but the model has already written "Your report is ready now. Speak soon.", the product adds a question and leaves the goodbye in the turn (`conversation.service.ts`, after `const sessionComplete`), so the person reads that the report is ready while the session is still open. (2) The streaming path answers `sessionComplete: close.ready` without the `!stillAsking(...)` check the other path has. Could you send me the check-in id where Rukia saw it? Then I can tell which one it was. |
| 46, first look | The board names the lead's private file. | **Not fixed yet. What I found in the code, 28 September.** The report's list of documents takes only documents everyone may see (`visibility: 'OPEN'`, `reports.service.ts`), so the name did not come from there. The likelier route is the lead's own check-in. When a lead attaches a file there, Groundwork's own turns say its name, for example "Here is the context we have from team-plan.txt." (`what-a-document-holds.ts`) and "Recorded from team-plan.txt." (`conversation.service.ts`). What the lead's session says then reaches the synthesis as part of the record. The fix I would make is to take a private document's file name out of what the synthesis reads, and to test it on the board as a participant and an admin. Could you send me the check-in id? |

## 28 September: a question the lead wants asked, confirmed one at a time (decision 34)

Hafsah's decision 34: "A question the lead wants asked of a person may reach that person's session. Before it goes, the lead sees the exact question as Groundwork will ask it, and confirms it." The engine side is done, in `5f30dde3`, `be5e9d78` and `d6d00a44`. Nothing in `client/` is changed. This is what the screens need to build.

**How it works now.** When a lead pastes something that holds a question for a named person, Groundwork writes that question once, exactly as it will ask it, and shows it to the lead. The lead's yes to the paste keeps the question, but does not send it. Each question then waits until the lead confirms it, changes its words, or leaves it out, one at a time. Only a confirmed question reaches that person's check-in, and it is asked in those exact words. A question that is waiting or left out reaches nobody.

**1. In the context chat, beside the list.** `POST /grounds/:id/context-chat` still returns `proposal.say`. Each question in it now reads, for example:

    Questions you want asked, each one exactly as Groundwork will ask it:
    - Groundwork will ask Ngozi Balogun: "Have you sent the Client B proposal?"
    None of these questions is asked until you confirm it. You confirm, change or leave out each one on its own.

With one question it reads "A question you want asked, exactly as Groundwork will ask it:" and ends "This question is not asked until you confirm it. You can confirm it, change it or leave it out." Beside `say`, the proposal now also has `proposal.questionsForPeople`: `[{ id: null, participantId, who, exactQuestion, says, status: 'not yet kept' }]`. `id` is null because nothing is written yet. Show these as they are. There are no buttons on them yet, because "Yes, set it" is what keeps them.

**2. After "Yes, set it".** `POST /grounds/:id/context-chat/confirm` returns `questionsForPeople` beside `say` when the paste had any questions. These are now stored, and each one has an `id`. Show one card for each.

**3. The card, one per question.** The shape is `{ id, participantId, who, exactQuestion, says, status: 'waiting' | 'confirmed', confirmedAt, writtenBeforeConfirming, note }`. `says` is the line the card leads with, for example `Groundwork will ask Ngozi Balogun: "Have you sent the Client B proposal?"`. Please show it exactly as sent. A waiting card has three buttons:

- **Confirm**: `POST /grounds/:id/questions-for-people/:itemId/confirm` with an empty body. It returns the card, now `status: 'confirmed'`, and a `say` to show, for example: "Confirmed. Groundwork will ask Ngozi Balogun "Have you sent the Client B proposal?" in their next check-in, word for word."
- **Edit**: open the sentence in a text box with the current `exactQuestion` in it, and send `POST .../confirm` with `{ "exactQuestion": "<what they typed>" }`. What they typed becomes the question, word for word. It is confirmed in the same step, so the button under the box should say "Confirm". An empty box returns 400 "Write the question as you want it asked first." More than 400 characters returns 400 "That is too long to ask as one question. Keep it to one or two sentences."
- **Not now**: `POST /grounds/:id/questions-for-people/:itemId/decline`. It returns `{ id, status: 'left out', say }`, where `say` is, for example, "Left out. Groundwork will not ask Ngozi Balogun this question." Take the card off the list.

A confirmed card shows `says` and no buttons. Only the lead can confirm, edit or leave one out. Anybody else gets 403 "Only the person who runs this check-in can confirm a question for somebody on it."

**4. Where the cards come from on the Context page.** `GET /grounds/:id` now carries `questionsForPeople` for the lead and for an admin in their organisation. Waiting cards come first, then confirmed ones. Left-out ones are not listed. For a participant the field is absent, not empty. The same list is at `GET /grounds/:id/questions-for-people`, which returns 403 to anybody except the lead or an org admin. The `QUESTION_FOR_PERSON` lines in `contextItems` also now carry `exactQuestion` and `questionConfirmedAt`, but please draw the cards from `questionsForPeople`, not from those lines.

**5. Questions kept before 28 September.** These have no exact sentence and were never confirmed, so none of them is asked. They are listed as waiting cards with `writtenBeforeConfirming: true`. Their `exactQuestion` is the lead's own words, with a capital letter and a question mark added, and nothing reworded. Their `note` is the sentence to show under `says`: "You wrote this question before Groundwork asked you to confirm each one. It has not been asked. Confirm it, change it, or leave it out." The buttons are the same as for any other waiting card. Confirm keeps exactly the sentence the card showed.

**6. Changing a question elsewhere.** If the lead changes a question's words on the Context page (`PATCH /grounds/:id/context/:itemId` with `text`), or through "reword that one" in the chat, it goes back to waiting and needs to be confirmed again. The same happens when a question is closed or opened again. The card then shows the new words.

## Things the engine changed tonight that the screens should know about

| Change | What it means for a screen |
| --- | --- |
| The date question is now a full sentence: "When you say year-end, do you mean 31 December 2026?" | Any screen or test that expects the old "Year-end - so 31 December 2026?" needs the new wording. |
| A closing turn that a guard would cut to a stub becomes "Thank you. Your check-in is saved." | That wording comes from your Done screen. |
| Judgement actions that told the reader something ("Tell the initiator to…") are stored as the thing to do. | The board and report show "Get Chidi Eze and Sara Lindqvist in a room…" where they used to show "Tell you to get…". |
| Each person's finding can now carry how they say the work really runs, and a worry with a detail in it. | The findings are longer and more specific. No field changed. |

**One thing in your files, for you to look at.** `client/src/pages/chat/the-check-in-as-a-person-reads-it.spec.tsx` times out at 5 seconds in two tests, "pressing one sends it as the answer…" and "draws nothing when the engine sends none…", when the whole client suite runs. Alone it passes, 22 of 22, but it takes about 50 seconds, so it is fragile under load. I have not touched it.

**Two of your client tests fail on the merged branch (27 September, evening, at `21e6408b`).** Both are in `client/src/components/gw/jump-to.spec.tsx` ("Ctrl K opens it on the check-ins and pages; typing narrows; arrows and Enter go there": the element does not get focus) and `the-sidebar-waits-for-the-list.spec.tsx` ("if the list cannot be loaded it says so…": the text "Your check-ins did not load. Reload the page to try again." is not found). They fail when run alone. They also fail with my one client change, the `SCENARIO_LABELS` strings, put back as it was, so that change is not the cause. The last commits to touch the sidebar are yours, U.17 and U.18. I have not touched them.

**Your two sidebar tests fail again, and it is not a code change (27 September, night, at `7a9e9c93`).** The tests are `client/src/components/gw/jump-to.spec.tsx` ("Ctrl K opens it on the check-ins and pages…": the element does not get focus) and `the-sidebar-waits-for-the-list.spec.tsx` ("if the list cannot be loaded it says so…": the text is not found). They fail even when run on their own. At `5413a8ee` all 3,198 client tests passed, and no file under `client/` has changed since then. So they seem to depend on something outside the code, such as the date, the time or the order they run in. I have not touched them.

**Patterns have a new shape, for when they are switched on (28 September, `965712f5` to `81f03b75`).** Patterns are switched off everywhere until Hafsah approves the plain names in `docs/pattern-names.md`. When they are switched on, every place that shows them (the board's section, the check-in page's list, the person's own record) receives `heading`, `whatHappened`, `howOften`, `whoSeesIt`, `theirWords`, `canAnswer`, `askThem` and `participantId`. There is no longer `label`, `code`, `text`, `periods` or `type`. `BoardPage.tsx` still draws `{p.label}` and `{p.periods}`. Please also add:
- a "Say what's behind it" box, shown when `canAnswer` is true, that posts `{ text }` to `POST /patterns/:id/answer`, and shows `theirWords` back;
- on the lead's board, each pattern under that person's line, as the prototype does;
- on the You board (`/you`, yours), a call to `servedPatterns` and `markShownToThePerson`.

The person sees their own pattern first. The lead sees it only after they answer, after three days, or after a week if they never open it.

**One change in your file, for privacy (28 September, `95e789b2`).** In `api/src/modules/grounds/your-board.service.ts`, `myTodos` now returns nothing for a guest from another organisation. A guest viewing the host organisation could otherwise read the private to-do list of a host entry that shares their email address. It is part of making sure a guest's check-in never reaches, and never reads from, anyone on the host's list (decision 36). Please keep it when you merge.

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

## 29 September: a plan becomes proposals, and the engine stores them (week 13, your request 6a)

**Please do not add any storage for proposals of your own.** Hafsah decided on 29 September that storing proposals is engine work. The engine has added the table, `plan_proposals` (Prisma model `PlanProposal`, migration `20260929130000_plan_proposals`), in `db2bf16c`. When you merge, apply the migration to your own local database. You only need to show the proposals and send the lead's choice back. The routes are in `a1c58f7c`.

**Who can use them:** only the person who runs the check-in. Everyone else gets 403, including a participant and an admin who only reads. A participant never sees a proposal.

**The routes**

| What the lead does | Route | Send | You get back |
| --- | --- | --- | --- |
| Pastes a plan, or picks a document | `POST /grounds/:id/plan/proposals` | `{ "text": "..." }` or `{ "documentId": "..." }` | `{ "proposals": [proposal, ...], "says": "That's 5 things to confirm. Nothing goes into Context until you do." }` Nothing is written to targets, roles, commitments or rules yet. |
| Opens "Waiting for you to confirm" | `GET /grounds/:id/plan/proposals` | nothing | `{ "proposals": [proposal, ...] }`, the ones still waiting, oldest first |
| Confirm | `POST /grounds/:id/plan/proposals/:pid/confirm` | nothing | `{ "confirmed": proposal, "wrote": { "table": "...", "id": "..." } }` Exactly one row is written. A second confirm is refused. |
| Not now | `POST /grounds/:id/plan/proposals/:pid/not-now` | nothing | the proposal, with `"status": "NOT_NOW"` |
| Edit | `PATCH /grounds/:id/plan/proposals/:pid` | `{ "says"?: "...", "fields"?: { "personName"?, "what"?, "number"?, "date"? } }` | the proposal, still waiting, with `editedAt` set. A number or date must still be in the plan's own words. |

**One proposal, as the lead reads it**

```json
{ "id": "3f1c…", "kind": "commitment",
  "says": "Samuel will call every butchery in Ikeja by Friday 10 October.",
  "fields": { "personName": "Samuel", "participantId": "p-samuel", "personOnTheCheckIn": "Samuel Okoro",
              "what": "call every butchery in Ikeja", "date": "Friday 10 October" },
  "fromThePlan": "Samuel will call every butchery in Ikeja by Friday 10 October.",
  "heading": "A commitment, from Q4 plan.pdf. It would go in commitments.",
  "landsIn": "Commitments", "from": "Q4 plan.pdf",
  "status": "PENDING", "editedAt": null }
```

- `kind` is `goal`, `role`, `commitment` or `rule`.
- `landsIn` is "Targets", "People and roles", "Commitments" or "How we work".
- `from` is the file's name, or "the plan you pasted".
- `note` is there only when a name in it is not on the check-in, for example "One name in it, Musa Bello, is not on this check-in. Add them, and this will go on too."
- Show `says` as the card's sentence and `heading` above it. Show `fromThePlan` where the prototype shows the plan's own words.

**When something is refused**, you get a 400 with a plain sentence to show as it is. For example: "That one is already confirmed.", "Musa Bello is not on this check-in yet. Add them first, then confirm this.", or "The number or the date is not in the plan's own words, so it was not changed."

**Not done yet:** when a goal is confirmed, its date is not kept, because a target has no date field. The date stays on the proposal and in its sentence.

## 29 September, evening: your requests 76 and 77

### Request 77: a person's own words are never removed

The cause was not the private-file rule. It was the engine's new filter for colleagues' hidden targets, which went through every string on Rukia's row, including her own lines. It emptied each line with "four" in it, because Juma may not see her target of 4. Fixed in `7eb0aed1`:
- A person's own words from their check-in stay for every reader. That covers `whoOwnsWhat[].items[].text` on the board, and `whatEachPersonSaid[].lines[]` in the report.
- A private file's name inside such a line is still replaced ("As a document says, four shops each by Friday.").
- An item with no words is never served, so you can drop your client-side guard whenever you like.

### Request 76: the kind of work, and each kind's records

Built in `343cf214`, `46eff9f0` and `643a245a`. **When you merge, apply the migration `20260929140000_the_kind_of_work` to your own local database.** It adds three nullable columns to `grounds` and a new table, `work_items`.

**`kindOfWork` on the board** (`GET /grounds/:id/board`) is one of these eleven names, exactly as written, or `null`: `"sales org"`, `"engineering release"`, `"support desk"`, `"distribution operations"`, `"trader training programme"`, `"founder's own check-in"`, `"asset loans"`, `"MarketView where next"`, `"MarketView Q4"`, `"a law firm matter"`, `"a government programme"`.
- It is read from the lead's words when setup is saved, and checked in code to be one of the eleven.
- The lead, or an admin of the organisation, can change it with `PATCH /grounds/:id/kind-of-work` and `{ "kind": "...", "stages": ["...", ...] }`. A later read never overwrites the lead's choice. A name that is not one of the eleven is refused with a sentence you can show as it is.

**`workRecords` on the board** is a list of sections under the switchboard's names. Each is in one of three states:

```json
{ "section": "Deal grid", "holds": "deals", "state": "filled",
  "stages": ["Contacted","Need established","Pitched","Qualified","Quoted","Won"],
  "rows": [ { "id": "w-1", "kind": "deal", "name": "Nyama Choma Palace", "stage": "Won",
              "owner": "Rukia Mwangi", "ownerParticipantId": "p-rukia", "due": null,
              "fields": { "Value": "KES 90K" }, "from": "said",
              "said": "Nyama Choma Palace paid KES 90K on 22 September, so that one is won." } ] }

{ "section": "Deal grid", "holds": "deals", "state": "none-yet", "rows": [] }

{ "section": "Forecast", "holds": "where the sales numbers are likely to end up", "state": "not-known",
  "why": "Groundwork does not keep this yet. It needs numbers from another system, such as payment records or a helpdesk." }
```

- `none-yet` means Groundwork keeps this kind of record, but none has come up yet. `not-known` means it is not something Groundwork knows. Draw them differently.
- `stages` is there only where the kind has stages. The lead's own stage names replace the defaults.
- `from` is `"said"` (read from somebody's check-in, with `said` holding their words exactly) or `"lead"` (added by the lead, with no `said`).

**Which sections each kind gets:**

| Kind | Filled from records | Served as not-known |
| --- | --- | --- |
| sales org | Deal grid: deals, with stages Contacted, Need established, Pitched, Qualified, Quoted, Won | Forecast |
| engineering release | Deal grid: releases and tasks, with stages Worked on, Written, Merged, Tested, Deployed, Used | none |
| support desk | Deal grid: tickets | Themes |
| distribution operations | Deal grid: incidents | none |
| trader training programme | Deal grid: trader groups, with stages Enrolled, Session 1, Session 2, Completed | none |
| founder's own check-in | Work plan: commitments and decisions | none |
| asset loans | Deal grid: loans and their repayments, with stages Disbursed, Repaying, Late, Repaid | none |
| MarketView where next | Themes: priorities people named | none |
| MarketView Q4 | Deal grid: subscriptions, with stages Said, Paid | Forecast |
| a law firm matter | Timeline: deadlines. Obligations: the parties | none |
| a government programme | Deal grid: counties and their projects | none |
| no kind yet | nothing | Deal grid, Forecast, Themes, Work plan, Timeline and Obligations, each saying Groundwork does not know what kind of work this is yet |

**The lead can add, change or remove a record** with `POST`, `PATCH` and `DELETE /grounds/:id/board/work-items`. Only the lead can do this, and every refusal is a plain sentence.

**Who sees which rows:** the lead and an admin see every row, with names. Where people do not see each other, a participant sees only their own rows, the lead's, and rows with nobody's name on them. Hidden targets, private file names and goals not told yet are taken out, and a person's own words in `said` stay exactly as said.

**Not built yet:** the other sections of your request 70, and records filled from another system, such as a helpdesk or payments.

## 29 September, night: patterns are switched on, with the approved names

Hafsah approved the plain pattern names (decision 52) and patterns are switched on (`19cdf9b0`). Nothing changes in where you read them: every road still goes through the same served shape, and a pattern arrives only when every rule holds (three periods, the person first, the lead later, no colleague ever sees another person's, E4 and F5 never). What you will now receive where you had nothing before:

```json
{ "id": "pd2", "participantId": "p-femi", "yours": true, "kind": "attention",
  "heading": "Others describe doing work they described as theirs",
  "whatHappened": "You described the Harbor Foods deal as your own, although Ngozi prepared the pricing.",
  "sessions": [1, 2, 3],
  "howOften": "This came up in 3 of your check-ins, in sessions 1, 2 and 3.",
  "askThem": null, "theirWords": null, "canAnswer": true,
  "whoSeesIt": "You are seeing this first. Tunde will see it too, with anything you say about it. Nothing is decided from it." }
```

- `heading` is always the approved plain name. Never show a code or any other name.
- `whatHappened` is worded for the reader: "you" for the person it is about, their first name for the lead. It can be `null`; draw nothing then.
- `kind` is `good`, `carrying` or `attention`.
- `canAnswer` is true only for the person it is about. Their answer is `POST /patterns/:id/answer` with `{ "text": "..." }`, and the lead then reads it in `theirWords`.
- For the lead, `askThem` holds one question to ask the person, and `whoSeesIt` says whether the person has answered yet.
- `participantId` is for placing it under the right person. Never join it to a name as a label beside the person (decision 11).
- A session report now shows only patterns that had reached three periods by that session.

**Coming next, for Hafsah's decision 57:** the lead marking a pattern "right", "wrong" or "not sure" after talking it through, a nudge to have the conversation, and "we talked about it". I will send the exact routes when they exist.

**One thing in your files, found by the engine's builder:** `client/src/components/gw/WhatToWorkOnNext.tsx` shows "Done well, that is: {note.role.lookingLike…}". That is a colon-joined, third-person line from the role map ("Names what they would do differently, then does it"). The engine now says the You board's version to the person as a full sentence ("One thing to try this week is to name what you would do differently, then do it."), in `api/src/modules/grounds/a-step-said-to-you.ts`, which you can reuse.

## 30 September: the lead's marks on a pattern, and "we talked about it" (Hafsah's decision 57, items 2 and 3)

Built in `beffb44f` and `6aa62f9b`. **When you merge, apply the migration `20260930010000_what_the_lead_made_of_a_pattern`** to your own local database. It adds six nullable columns to `pattern_detections`, and changes no data.

**Two routes, both only for the person who runs the check-in.** Anyone else gets 403, including the person the pattern is about. They work only once the lead may already read the pattern (the timing of decision 39).

| What the lead does | Route | Send | You get back |
| --- | --- | --- | --- |
| Marks what they made of it, after talking it through | `POST /patterns/:id/mark` | `{ "mark": "RIGHT" }`, or `"WRONG"` or `"NOT_SURE"` | the pattern, with `leadMark` set |
| Says they talked it through | `POST /patterns/:id/talked-about` | nothing | the pattern, with `talkedAbout: true`. A second press does nothing. |

**Two new fields on every served pattern:**
- `leadMark`: `"RIGHT"`, `"WRONG"`, `"NOT_SURE"` or `null`. **It is only ever set for the lead.** The person the pattern is about always gets `null`, because the mark must never read as a verdict on them. A colleague never gets the pattern at all.
- `talkedAbout`: `true` or `false`. Both the lead and the person get it. It is a plain fact, with no mark behind it.

**The nudge:** the lead's `forTheLead` list on `GET /grounds/:id/report` holds one item for each pattern they may read and have not yet talked through, for example:

```json
{ "id": "pattern-talk-pd-brian-b3",
  "decide": "Talk with Brian about “Others describe doing work they described as theirs”.",
  "why": "Brian has seen it and has not answered yet." }
```

When the person has answered, `why` gives their answer. The item goes away as soon as the lead presses "we talked about it".

Wording note: the `why` with the person's answer is being reworded, because it joins with a colon today. Show whatever sentence arrives.

## 30 September: confirming a person's role, and where a person's own role is kept (Hafsah's decision 57, item 5)

**When you merge, apply the migration `20260930020000_evidence_and_a_confirmed_role`.** It adds three nullable columns and changes no data.

**A person's own words about their role live in `User.jobTitle`.** `GroundParticipant.roleAsDescribed` is only ever the lead's private description of a person (decision 30), with one exception: the lead's own row, which holds the lead's own words. On the join page, "Your part in this" now goes to the person's own job title (`ae2b5a9e`). It used to be copied into the lead's private field.

**Two routes, for the person themselves or the lead of the check-in:**

| What happens | Route | Send | You get back |
| --- | --- | --- | --- |
| "Yes, that's right" | `POST /participants/:id/confirm-role` | nothing | `{ "id": "…", "detectedFunction": "SALES", "detectedFunctionConfirmedAt": "…" }` |
| "I'd describe it differently" | `PATCH /participants/:id` | `{ "roleAsDescribed": "Mostly sales, closing deals." }` | from the person: `{ "id": "…", "ownRoleAsGiven": "…" }`; from the lead: `{ "id": "…", "roleAsDescribed": "…" }` |

- When the person themselves sends `PATCH`, their words go to their own job title, never to the lead's field. When the lead sends it about someone else, it is the lead's private description, as before.
- Anyone else gets 404, so a stranger learns nothing.
- The person's own check-in also asks them once, in words: "It sounds like most of your work is sales. Is that right, or would you describe it differently?" Their answer is read after the check-in, so you need no screen for that part. A Context page confirm for the lead is yours to draw.

**One more field on a served pattern, for the lead only:** `secondReadNote`. It is "Two separate reads of the record found this." when both the model and the number-based rule found the pattern, and otherwise `null`. The person it is about always gets `null`.

## 30 September: what Ask Groundwork's screens need to show, so the old context chat can be switched off (decision 50)

Hafsah, 30 September: the old context chat stays on until your Ask Groundwork screens for documents and for confirming things are built, and you have confirmed live that everything works through them. Nothing in the engine switches it off before you say so in this file.

**Two routes, and one reply shape.**

| What the person does | Route | Send | You get back |
| --- | --- | --- | --- |
| Types a message | `POST /ask` | `{ "message": "…", "groundId": "…" }` (`groundId` is optional, from "About") | a reply, below |
| Presses yes or no on something said back | `POST /ask/answer` | `{ "proposalId": "…", "answer": "yes" }` or `"no"` | a reply, below |

A reply is `{ "blocks": [...], "composedBy": "model" or "rules", "lane": "…" }`. Draw the blocks in order. The ones these screens need:

- `{ "type": "text", "body": "…" }`: a paragraph. Show it as it is.
- `{ "type": "proposal", "proposalId": "…", "summary": "…" }`: something said back that waits for the person. Show `summary` as it is, with two buttons, "Yes" and "No", which call `POST /ask/answer`. Nothing is saved until "Yes". Only the newest waiting proposal can be answered; an older one returns 409 with a plain sentence, which you show.
- `{ "type": "next_step", "kind": "upload_a_document", "label": "Choose a file", "id": "<check-in id>", "context": { "groundId": "…", "label": "…" } }`: open the file picker and upload to that check-in with the upload route the Context and resources page already uses. The `id` is the check-in's own id, the same as `context.groundId`, and never the id of a session. It is offered to whoever runs the check-in chosen under "About", whether or not that person has a session of their own open, and to anyone else who has a session of their own open. The file arrives private to the person (`OWN`).

**Three things said back are not yes or no.** For these, show the text and let the person type the answer; do not draw yes and no buttons, because `POST /ask/answer` refuses them:

1. Which check-in they mean, when they run more than one and did not choose under "About". The person answers by naming one.
2. Who a document is for, after it is read from a link or uploaded. The person answers in words ("only me", "everybody on it").
3. The next question of a setup conversation ("How long should it run?"). The next message is the answer.

**What has to be visible for each thing a lead can do through Ask Groundwork.** Every one ends with a proposal, and every proposal needs its "Yes" and "No":

| The lead types, for example | Said back as | "Yes" does |
| --- | --- | --- |
| "Setting up the context for the sales check-in", then answers | "I will set this to run for 12 weeks." | sets the length, rhythm, success or target |
| A long paste of a plan or message | everything it found, as one thing to say yes to | saves all of it together |
| "decision: we will drop the pilot" (also strategy, way of working, unsettled, context note) | Shall I add "we will drop the pilot" to this check-in's context as a decision? | adds the line |
| "reword the line 'X' to 'Y'", "share the line 'X'", "make the line 'X' private", "retire the line 'X'" | the line and the change | changes the line |
| "private note about Ben: …" | Shall I keep "…" as a private note that only you can see? | keeps the note, for the lead only |
| "share the note …" | Shall I share "…" with everybody on this check-in? | shares a note about the whole check-in (never one about a person) |
| "questions for people" | the list of questions waiting, word for word | nothing; it is a list |
| "confirm the question for Ben" or "ask Ben '…' instead" | Groundwork will ask Ben, word for word, "…" in Ben's next check-in. Shall I send it? | confirms the question |
| "leave out the question for Ben" | Shall I leave out the question for Ben, "…"? | leaves it out |

**Who sees these.** Only the lead who runs the check-in, or an admin of the same organisation, reaches any of these. Anyone else who types the same words gets Ask Groundwork's ordinary answer, and nothing is said back. An admin can hear something said back, and is then refused at "Yes" for the three things that are the lead's alone (setup values, a question for a person, and confirming it). The refusal is a plain sentence in a text block; show it.

**Nothing from these conversations appears in the person's Ask Groundwork history.** The setup talk is not kept as questions. Do not expect it back from `GET /ask`.

**What to confirm live before the old chat goes, and write here when it is done:**

1. A document added through Ask Groundwork: the file picker opens, the file lands private, and what is read out of it is said back before anything from it is saved.
2. A long paste: said back as one thing, "Yes" saves it, "No" saves nothing.
3. Each row of the table above, as the lead.
4. The same messages typed as a participant: nothing is said back and nothing is saved.
5. As an admin who is not the lead: the refusal sentence shows at "Yes".

## 30 September, later the same day: a document's numbers, said back through Ask Groundwork, and what to send after an upload

The gap this closes: `DocumentsService.whatItHolds` reads a document and keeps the numbers it found on the document itself, resolved to the right person or to the whole check-in, and writes nothing - see `docs/context-chat-inventory.md`, item 3 and 4. The Context page already says this back (`theContextWeHave`, `askingAboutIt` on the upload response) and the check-in conversation already asks and saves it. Ask Groundwork now does the same third thing, through the same `POST /ask` and `POST /ask/answer` used for everything else - no new route.

**A new kind of thing said back: `document_numbers`.** It arrives as an ordinary `proposal` block, the same shape as everything else in the table above:

```json
{ "type": "proposal", "proposalId": "…", "summary": "Here is the context we have from Q4 targets.xlsx. …\n\nShall I record these numbers on this check-in?" }
```

`summary` is the exact words the Context page already shows for that document (`theContextWeHave`), with the same rule: every number says whose it is, by name, or says it is for everybody. Draw it exactly as you draw every other proposal - the text, then "Yes" and "No" through `POST /ask/answer`. "Yes" writes the numbers, with each person's own number under their name and a team number under nobody. "No" leaves the document exactly as it was - still read, still on the document, still asking the next time somebody mentions it.

**When it appears.** Either of two ways, and you do not have to tell them apart on the screen - Ask Groundwork decides:

- The person says, in the ordinary chat box, that they have just put a document in - "I added the Q4 targets sheet", "I've uploaded it" - and that document (theirs, on a check-in they are part of) still has numbers nobody has said yes to.
- The person starts to add a document through Ask Groundwork's own upload flow, and an earlier upload of theirs on that check-in is still waiting on a yes.

**What the screen should send after an upload finishes: nothing, automatically.** `whatItHolds` runs in the background after the file is stored (`readTheRestOfIt`), so `holds` is not on the row yet when the upload's own response comes back (`numbersWaiting` is always `0` at that moment, by design - see `documents.service.ts`, "AND THE TWO SLOW READS, AFTER THE ANSWER"). Sending "I've uploaded it" straight after the upload call returns will usually find nothing waiting and say nothing. The decision, so every screen does the same thing: **poll the document (or the Context page's own read) until `numbersWaiting` is greater than zero or a reasonable time has passed (the Context page already shows "still reading"), and only then send the message "I've uploaded it." to `POST /ask`.** That is the one sentence to standardise on; Ask Groundwork recognises it (and close variants - "I added it", "I attached the file") whichever of the two ways above triggered it.

**Who this reaches.** The same rule as everywhere a document's numbers may be set (`docs/context-chat-inventory.md`, item 4): only the uploader's own numbers, and a number for somebody else only when the uploader is the lead - decided when the document is read, not here, so nothing about who may set whose number changes by asking through Ask Groundwork instead of the Context page.

## 30 September, later: the suggestion threshold admin page should show a plain label, not the field name

Decision 61 sets the first threshold, support, from the start: extra support is suggested once a person has kept fewer than half of their commitments (`keptBelow: 0.5`), with at least 6 settled, kept or not (`overPeriods: 6`). `GET /admin/suggestion-thresholds` now returns both the values and a `labels` object with the plain words for each field, for example:

```json
{
  "thresholds": { "support": { "keptBelow": 0.5, "overPeriods": 6 } },
  "labels": {
    "keptBelow": "Suggest extra support when fewer than this share of commitments were kept",
    "overPeriods": "At least this many settled commitments"
  }
}
```

`overPeriods` is the API field name the admin `PATCH` already uses, and it stays exactly as it is - it is not being renamed. The admin page should show `labels.overPeriods` ("At least this many settled commitments") beside that field's value instead of the field name itself, and the same for `labels.keptBelow`. The labels are the same for every verdict (keep, reward, support, plan, exit); there is one `labels` object, not one per verdict.

## 30 September, later still: Ask Groundwork opened from inside a check-in knows which one (decision 65)

The gap this closes: opening Ask Groundwork from inside a check-in's own Context and resources page or setup used to need the lead to type the word "context" (or one of a short list of close phrasings) before the setup conversation would start. Decision 65 removes that: the screen tells Ask Groundwork which check-in it was opened from, and the setup conversation opens straight away.

**What to send.** `POST /ask`, with two extra things alongside the ordinary `message`:

```json
{ "message": "", "groundId": "g-tobi", "openedFrom": "check_in_setup" }
```

- `groundId` is the check-in's id - the same field the "About" picker already sends on an ordinary question.
- `openedFrom: "check_in_setup"` is the one recognised value. Send it only when Ask Groundwork was opened from that check-in's own Context and resources page or setup, never on an ordinary question typed from the general Ask Groundwork panel.
- `message` may be empty ("") for the very first message of that opening - Ask Groundwork reads that as "start", and opens on whatever the setup is still missing, the same way the old context chat opened with nothing typed. Every later message in the same conversation is typed normally, still sent with the same `groundId` and `openedFrom`.

**What comes back.** The ordinary Ask Groundwork reply shape (`lane`, `composedBy`, `blocks`) - nothing new to parse. `lane` will be `"add_context"`. Draw it exactly as the setup conversation's replies are already drawn: text, and a "Yes"/"No" through `POST /ask/answer` when a block is a `proposal`.

**Who this reaches.** Only somebody who may confirm setup on that check-in (decision 63): the lead who runs it, or, once the lead has left the organisation, an admin of it. Sent by anybody else - a participant, most often - `openedFrom` is quietly ignored and Ask Groundwork gives its ordinary answer to whatever was typed. There is no separate refusal to show: nothing about the reply says whether `openedFrom` was acted on, so do not build a screen that assumes it always was. If the screen only ever offers this opening from a place a participant cannot reach (the lead's own Context and resources page), this will not come up in practice.

**Everything else about the setup conversation is unchanged**: it is not kept in the person's ordinary Ask Groundwork history (`GET /ask` will not show these turns), and a concrete change is said back and waits for a "Yes" before anything is saved, exactly as the table earlier in this document describes for the "context" keyword itself.

## 30 September, evening: requests 82, 85, 86, 87, 88, 89 and 90

Everything below is on the branch `wip/plain-reports`. The commit for each is in its row in `docs/requests-to-engine.md`.

**Request 82 and decision 67: which part of "What keeps coming up" a pattern belongs in, and the coaching beside it.** Every pattern served on the board, on the check-in's own page and in a person's own record now carries three more fields.

- `about` is `"the work"` or `"what is said against what happened"`. It is the same for every reader, because it says nothing about a person. Put a pattern under "About each person's work" or under "How what people say can run ahead of what happened" by it. The second part is exactly these nine patterns and no others, as Hafsah decided (decision 67): D1, D2, D3, D5, D8, B1, B2, B3 and E2. The list is fixed in `api/src/modules/patterns/what-a-pattern-is-about.ts`. No pattern was added, removed or changed.
- `coachTowards` is what the lead coaches the person towards, the good version, in one sentence. It is for whoever runs the check-in only, and is `null` for the person it is about. Example, for B11: `"Coach them towards naming what the team itself can change when something goes wrong."` Where the person's role map pairs the behaviour with its good version, the role map's own words are used, for example in sales for K1: `"In sales and expansion, the good version is someone who spends the week in front of buyers, and does the admin around it."`
- `oneStep` is one small, concrete step the person could take this week, in one sentence, also for the lead only and `null` for the person. Example, for B11: `"One step they could take this week is to name one thing in the team's own hands the next time a problem comes up."`

Both sentences are fixed text in `api/src/modules/patterns/what-to-coach-towards.ts`, one pair for each pattern that has a plain name, so opening a board never calls a model. They carry no name; the page places them under the person the pattern is about, using `participantId`, as it already does. The lead's existing fields stay: the plain name is `heading`, the sentence about what happened is `whatHappened`, and the pattern's own question to open the conversation is `askThem`. The person reading their own pattern, a colleague and an admin who does not run the check-in never receive `coachTowards` or `oneStep`, and a colleague or such an admin receives no other person's pattern at all, as before (decisions 58 and 67). The screens decide nothing from any of this; it is wording for the lead to use in a conversation.

I found no sentence "No patterns have repeated often enough to show yet." in the engine's board text. It is only drawn on the screen, so the change to it is yours.

**Request 85: someone an admin did not let in.** Each row of `eachPerson` (and so of the lead's and the admin's "where each person is") now also carries `notLetIn` (true or false), `notLetInBy` (the decider's name, or null) and `notLetInAt`. Its `reason` is `"not let in"` (sorted last, and never shown as a label on the person) and `ask` is `null`. The row says `"Faraji Odhiambo was not let in by Juma Mwangi, so there is nobody to ask."` Nobody else receives `eachPerson`, so the decider's name goes only to whoever runs the check-in or an admin, the same rule as `GET /grounds/:id`.

**Request 87: "You" in the middle of a sentence, and "1 sessions".** The sentence is now `"In session 1, you committed to call the client. The time you gave for it was on Wednesday 30 September."` `overTime` also carries `inSessions`: `"in 1 session"`, `"in 3 sessions"`, or `null` before any session. Use it for the heading: `"What people said they would do, in 1 session"`.

**Request 88, wording.** `decisions[].owner` reads `"Nobody has been named to decide this."` where nobody is named. The "Blockers" tile of `quickRead` names the same blocker as `howItIsGoing.glance.inTheWay.oldest`. A participant's `howItIsGoing.latestSummary` opens `"People disagree on ..."` and not `"They disagree on ..."`. The `why` of a section Groundwork does not keep reads `"Groundwork does not keep this yet. It needs the ticket counts from the helpdesk itself."` for the helpdesk section and `"...such as payment records."` for a forecast.

**Request 89: who said a record.** Each row of `workRecords[].rows[]` carries `saidBy` and `saidByParticipantId`. For a record a person said, `saidBy` is their first name, for example `"Baraka"`. Where this reader may not name them it is `"a colleague"` in lower case, to sit inside "In ...'s words", and `saidByParticipantId` is `null`. Both are `null` for a record the lead added.

**Request 90: one form of number.** `howItIsGoing.latestSummary` counts in one form: `"Four of the six people have answered so far."` (words up to ten, figures after: `"12 of the 41 people have answered so far."`).

**Request 86: a question, answered in `docs/requests-to-engine.md`.** A session that has been started is now read as open on Today, in the assistant and in a guest's answer, whatever `availableFrom` still says. `availableFrom` itself is unchanged; it only says when the session was first offered.

## 30 September, night: a conversation point in the lead's judgement (decision 56, point 3)

The report's `theJudgement` can now carry `conversationPoints`, a list of plain sentences for the lead only. It is filled when the judgement rests on a goal the person has not been told about yet, for example:

"Tobi has not been told about this goal yet, so talk it through with Tobi before reading anything into it."

Draw each sentence under the judgement, as the lead reads it. The person, a colleague and an admin who only reads never receive it. The product writes it, not the model.

Also from tonight: in "What the record shows over time", the lead is now named, or is "you" when the lead reads it ("In session 3, you committed Aisha Otieno to call the client."), never "the lead".

## 30 September, late: admins and the three evaluation check-ins (request 78), coaching on the board (request 79)

**Which check-ins are a performance plan, a promotion or a renewal (request 78).** Read the check-in's `scenario`. It is one of these three exactly when it is `PIP` (a performance plan), `RECOGNITION` (a promotion) or `CONTRACT_RENEWAL` (a renewal). The list is `EVALUATION_SCENARIOS` in `api/src/modules/reports/is-this-an-evaluation-check-in.ts`, built from the same test the engine uses, so it cannot drift. Leave the admins line out of the invitation on those three.

What the server now does, so the screens need not hide anything: an admin of the organisation reads one of these three only when they run it, set it up, or take part in it. Without that they are treated as if they were not an admin of it. It is not in their list, on Today, in the roster or in the approval queue, and its page, board, report, session reports, earlier rounds, activation status, outcome and reasons answer "not found" or "not part of this check-in". An admin who set it up or runs it reads it as before. An admin who only takes part reads it as a person in it does. On every other kind of check-in an admin reads what they read today.

**Coaching on the board (request 79 b).** The board response carries `coaching`, present only when there is something for this reader:

- `coaching.yours` is the reader's own coaching note, exactly as the report serves it (the same note, about the reader only). It is there for anyone who takes part, the lead included.
- `coaching.eachPerson` is what to ask each person, the list the report gives the person who runs the check-in. It is there for the lead, and for the admin who set the check-in up for them, and for nobody else. An admin who only reads, a colleague and the person themselves get `null`.

I did not serve each person's own coaching note to the lead, because the report never does: a note written for one person is not given to their lead (the report's own comment says so). If Hafsah wants the lead to read each person's note too, that is a change to a privacy rule and is hers to decide.

**Periods (request 79 a).** `managerAlignment[].periods` is now never more than the number of answered sessions as decision 57 counts them (a daily check-in counts calendar weeks). After a single session it reads 1.

## 30 September, night: a check-in that runs until the lead ends it (request 37)

Hafsah said yes on 27 September. The engine side is done. This is exactly what the ongoing state looks like and what to send.

**The state.** One field on the check-in: `runsUntilEnded` (true or false). It is on every check-in read (the check-in itself, the list, the admin view, the API). When it is true, `timelineDays` is served as `null` (stored internally as 0, never shown), `daysLeft` and `endsOn` are `null`, `endsAt` is `null`, and the check-in is never "out of time": no warning email, no stall. Every check-in that existed before is `runsUntilEnded: false` and unchanged.

**What to send.**
- Creating a check-in (`POST /grounds`, `POST /grounds/for-lead`, and the entry commit `POST /entry/commit`): send `runsUntilEnded: true` and leave `timelineDays` and `endsAt` out. If you send both, the choice "When I end it" wins and the length and end date are ignored.
- Changing it later (`PATCH /grounds/:id`): send `{ "runsUntilEnded": true }` to make it ongoing. Send a length (`timelineDays` or `timelineWeeks`) to give it a length again; that turns `runsUntilEnded` off. A check-in that had run out of time opens again when it is made ongoing.
- The context chat: the lead can say "when I end it", "until I stop it" or "no end date". The proposal comes back as `{ kind: 'timeline', days: 0, untilEnded: true, say: "I will set this to run until you end it." }`, and after the yes the reply says "I have set this to run until you end it." The same works in Ask Groundwork's setup, which is the same chat. Once set, the chat does not ask how long it runs again, and its opening line reads "This check-in runs until you end it and people check in once a week."
- Ending it: the existing "Begin the closing session" route (`POST /grounds/:id/closing-session`) is the "End it". It works at any session of an ongoing check-in. It makes each person's next session the closing one, and no session is made after it. The report of that session is written as a closing report, the same as a check-in that reached its planned last session.

**What the screens read.**
- The session report carries `runsUntilEnded` and a ready sentence, `position`: "Session 3. It runs until you end it." For a check-in with a length it is "Session 3 of 12." and for one with no length set it is "Session 3." `plannedSessions` is `null` for an ongoing check-in. Print `position` rather than building the sentence.
- For an ongoing check-in the engine never says how many sessions there are, how far through it is, "halfway", or "the last session", in the conversation, the reports, the board, Today or the suggestions. There is no "Decide how it ends" prompt, because there is no planned last session. The only ending is the lead's.
- `howItIsGoing` has no planned rounds for an ongoing check-in. Do not draw "x of y rounds".
- The setting history on the Context page carries `untilItIsEnded` (true on the change that made it ongoing) and `weeks.to` is `null` for that change.

## 1 October: links between check-ins (your request 18)

Done. Nothing in `client/` is changed. Below is exactly where each field is and its shape.

**(a) Which check-in a handoff waits on.** `GroundDependency.waitingOnGroundId` is now written when the conversation records a handoff. It is set only when it is certain, and only in code: the words the person said for the team ("Finance") must all be in the name of exactly one other running check-in of the same organisation ("Finance, Q3"). The plain words every team name carries ("team", "review", "Q3") are set aside. Two check-ins that fit, the handoff's own check-in fitting as well, another organisation's check-in, or a person named in the same check-in all give null. A newer account that names a team updates the link; an account that names no team leaves it alone. `GET /grounds/:id/links` needed no change.

**(b) When, and where it stands.** These four fields are on every item of `GET /grounds/:id/links` (`waitingOnOtherTeams[]` and `askedOfThisCheckIn[]`) and of `askedOfYou.items[]` on `GET /you`, under the rules those already use:

| Field | Shape | What it is |
| --- | --- | --- |
| `dueSaid` | string or null | The person's own words for when, word for word ("by Friday"). Kept only if those exact words are in what they said; null if they gave no time. |
| `dueOn` | "2026-09-25" or null | The day those words meant, read in code ("Friday", "tomorrow", "30 September"). Null for "soon" or "after the audit": a day is never guessed. |
| `dueWord` | string or null | "Overdue", "Today", a short weekday through the next six days ("Fri"), or a short date ("9 Oct"). Null when `dueOn` is null. Counted in Lagos time. Use it for the due word in "Everything asked of you this week". |
| `standing` | string | One plain sentence of where it stands, written from the record. |

What a person reads in `standing`: "The Mombasa depot's count is due Friday." (a time was given; "are due" where the thing is plural, such as "The seals are due next week."), "Not decided yet." (the handoff is a decision nobody has made), or "No date has been given yet." Show it after "Asked 14 Sept." Show `dueSaid` where you want their own words.

**(c) Where the blocker started.** `GET /grounds/:id/blocker-trace`, for anybody who may open that check-in (404 otherwise). It answers `{ traces: [...] }`, one trace for each blocker that ends in this check-in, often none.

    {
      id: string,
      steps: [{ kind: 'need' | 'request' | 'question' | 'approval' | 'priority' | 'delay' | 'effect',
                checkIn: string, checkInId: string,        // the check-in it came from; open with /grounds/<checkInId>/board
                owner: string | null,                       // a name this reader may read, "You", or "a colleague"
                text: string }],                            // one full sentence
      whereItStarted: string | null,    // "Where it started: the request went to Finance without ..."
      decisionNeeded: string | null,    // "Decision needed: sign off Westgate's credit terms this week?"
      decidedBy: string | null          // "Amani Njoroge decides."
    }

Who reads what. Each reader gets only the steps from check-ins they may open (the same list as the links). Where a check-in keeps people apart, a reader who does not run it (and is not an admin) reads only the steps that are theirs. If the first step or the last step is not readable, the trace is not served at all. If any step between is hidden, the steps the reader may read are served and `whereItStarted`, `decisionNeeded` and `decidedBy` are null, because they were written from the whole chain. Nothing is ever rated or labelled; the sentences are checked for names and for words that judge a person. The prototype's "Nobody was slow on their own." is not written, because the record cannot say it. Show the steps, then the two sentences when they are there; "Ask Miriam for the references" is yours to draw from the owner of the request step.

How it is built. Stored in `blocker_traces`, without names (each step holds its check-in and a person id). Built only when a handoff is written or changes, in `ConversationService.followTheBlockersAcrossCheckIns`, never on opening. The same record again makes no second model call. The model gets the handoffs on record with people as tokens; its answer is kept only if every step cites a handoff on the record, takes its check-in and person from that handoff, shares words with it, names nobody and judges nobody, and the chain crosses two check-ins and ends where the blocker is felt. The instructions are the stored prompt `blocker_trace` (seeded on boot); the row records `promptVersionId`. Names are swapped in when it is served, for each step's own check-in, through the same wrapper every report uses.

**Also, from request 37.** A participant's session report now says "Session 3. It runs until Wairimu Kamau ends it." (the lead's name, or "the person running it" where the reader may not read a name); the lead still reads "Session 3. It runs until you end it." `POST /check-ins` on the public API takes `runsUntilEnded: true`, as the product's own create does.


## Request 17: the Company page's company-wide picture (parts a to d)

`GET /company` (the same read as before) now carries four more things. Everything is written once, when the record changes, and only read when the page opens. Until a picture has been written for the organisation, `reading` is `null` on every priority and the three lists are empty: draw nothing in their place.

### The fields

    GET /company
    {
      ...the fields you already have...,
      priorities: [{ ...,
        reading: { tag: string, says: string } | null    // (a)
      }],
      notReaching: [{ id, observation, question, forWhom }],                              // (b)
      namedByTeams: [{ id, title, touches, teams: [{ team, says }] }],                    // (c)
      saidAndShown: [{ id, area, youSaid, checkInsShow }]                                 // (d)
    }

(a) `reading.tag` is one of: "Nobody owns it yet", "Nothing is moving it yet", "At risk", "Quiet for a month", "Moving, but not enough of it", "Moving". It is about the priority and is decided in code from the record (owner, check-ins that feed it, handoffs stopping work, a date that has passed). `reading.says` is one or two full sentences, for example "1 check-in feeds this priority, and 3 were finished in the last 30 days. 1 handoff is stopping work on it." It is `null` when the reader may not open every check-in it was built from. `tag` (the old field, "Nobody owns it yet" or null) is unchanged.

(b) `notReaching` comes in this order and is written from the shape of the organisation's priorities, for example "Priority 3 has no owner and nothing underneath it." with the question "Who owns priority 3, Build a stronger organisation?" and `forWhom` "For you". The other two kinds are "The customer portal sits under no current priority." with "Which priority does The customer portal serve?" and `forWhom` "For Lina Ali, Product lead" (the owner's name and title from the roster, or "For you" when the reader is that owner), and "Open the second warehouse is still open, and its date has passed." with "Should Open the second warehouse get a new date, or be closed?". Served only to readers who may read every check-in (admins). Draw "Decide" for `forWhom` "For you" and "Ask" for anybody else.

(c) `namedByTeams[].title` is the thing in plain words ("No way for customers to order in bulk"), `touches` is "Touches priority 1 and priority 2." (or "It does not sit under any priority yet."), and each team's `says` is one sentence ("Sales raised this in 2 check-ins, with 3 open handoffs." when the model's sentence did not pass the checks). Teams come in alphabetical order and groups in order of their title, never by size. A thing is only here when at least two teams raised it. "Nobody owns it." is not written, because the record cannot say it of a thing.

(d) `saidAndShown[]`: `area` is "Priority 1", `youSaid` is the priority as the organisation wrote it in its own system (not anybody's words from a check-in), `checkInsShow` is one or two sentences such as "1 of the 4 check-ins finished in the last 30 days that belong to a priority was about this one. 1 handoff is open in them." Served only to readers who may read every check-in, and only once at least three such check-ins were finished. The prototype's examples ("6 in 10 sales visits went to small shops.") need figures the record does not hold, so they are not written.

### Who reads what

Each item keeps the ids of the check-ins it was built from (`restsOn`, never served). A reader is given an item only if they may open every one of them, by the same list of check-ins that feeds `fedBy` (their role and their access, never their title). A lead who runs the sales check-in reads the reading of the priority it feeds, and a thing that only check-ins they may open named; a member in that check-in reads the same reading. `notReaching` and `saidAndShown` are for readers who may read every check-in, so a lead or a member is given empty lists. An admin who was not given a performance plan, promotion or renewal check-in is given nothing that rests on it, and such check-ins are never read into the picture at all.

### How it is kept

Table `company_pictures`, one row per organisation, no names (an owner is held as the customer's own id and named only when served). Written by `CompanyPictureService` (`api/src/modules/grounds/the-company-picture.service.ts`) when a check-in completes, when a handoff is raised, and once a night if the priorities changed in the organisation's own system. The same record again makes no second model call and no new row. The model is given priorities with counts and open handoffs with team and check-in numbers, and no person. Its sentences are kept only if every number is on the record, nobody is named, nothing is judged or ranked, there is no quotation and nothing is copied word for word; otherwise a plain sentence is written from the counts. The instructions are the stored prompt `company_picture` (seeded on boot); the row records `promptVersionId`.

### Not built

(e) The company context picked up from check-ins is `docs/weekly-plan.md` week 20, "Memory that lasts beyond one check-in". It would be kept at the organisation's level, confirmed by a lead before it counts. (f) and (g) wait for Hafsah.


## Request 28: where each customer stands, from the sales check-ins

Nothing changes in what the board serves: `GET /suites/customers/board` still gives `standing` for each customer, and it is now the latest line the engine wrote, else the organisation's own word.

The line reads like "Quote sent. Buys in January.", "Said yes. The deposit is waiting." or "Asked to wait until the new shop opens.". Each is one or two plain full sentences about the customer. It never names a person, never says "I" or "you", carries no label or score, and holds no date or number that the person did not say.

When it is written: once, when a sales check-in completes. A sales check-in is one whose kind of work is "sales org" (the kind set at setup, which the lead can change), and is not a performance plan, a promotion or a renewal. A check-in with no kind of work is not read. It reads only the person's own words in their own check-in, never a report, never a question to Ask Groundwork, never a lead's private note. A name that matches no customer, or more than one customer, writes nothing. The same line twice in a row writes one row.

Who reads it: the same readers who are served the customer. An admin reads every customer's line. A lead reads the lines for the customers owned by their own team and themselves. A member and a guest are refused the board.

Not built: (b), "changing something here tells the person who owns the customer, in their next check-in." It waits for Hafsah.


## Request 25: the role map, the role interview, and why a job nobody owns matters

**(a) The role interview. Built.**

To send it (admins only, refused for everybody else, decided on the server):

    POST /suites/roles/interview
    { "personId": "<the person's externalId>" }              // to one person, for each role they hold
    { "personId": "<externalId>", "roleName": "Sales rep" }  // to one person, for this role
    { "roleName": "Sales rep" }                              // to everyone who holds that role

It answers `{ sent: [{ personId, name, roleName }], notSent: [{ name, why }] }`. `why` is a plain sentence, for example "Aisha Otieno has not signed in yet, so there is nowhere to ask them." or "Miriam Wanjiku already has the role interview waiting for Sales rep.". A refusal is one plain sentence too ("Say which person, or which role, the role interview is for."). Nothing is emailed: the interview waits for the person in Ask Groundwork.

What the person reads in Ask Groundwork, when they say "start": "What do you own in your job as Sales rep? Tell me in your own words, for example "the sales target and the sales team"." Then "What do you decide yourself, without asking anybody first?", then "Who do you depend on to do your job?", then "And who depends on you to do theirs?". Then all four are said back, in quotation marks, exactly as typed except that the first letter of a plain word loses its capital and a name keeps it: "You said you own "my own customers and their deals", you decide "what discount I give up to 10 percent", you depend on "the Sales lead and Operations for stock", and "the customers I sign, for their first delivery" depend on you. Shall I save this for the role map?" (with a Yes and No on it, through `POST /ask/answer`). Only a yes writes one `role_interview_answers` row, with the person's words exactly as typed. A no writes nothing and offers to start again. If they ask something else first, it is answered, and once they are told the interview is waiting: "Your admin has asked you four short questions about your job as Sales rep, so that the role map can show what the job owns. It is about the job and not about you, and nobody is marked on it. Say "start" when you are ready, or "not now" if you would rather not."

After a yes: "I have saved this for the role map. It shows what the Sales rep job owns. It is about the job and not about you."

No model words any of this, so `promptVersionId` on the row is empty. Who reads the answers: an admin, on the role map (`owns` for each role, as before), and the person themselves at `GET /suites/roles/interview/mine` (`{ answers: [{ roleName, owns, decides, dependsOn, dependedOnBy, createdAt }] }`). A colleague and a lead who is not an admin read none of it. Nothing is read into any check-in's report.

**(b) Why a job nobody owns matters. Built.**

`nobody[].why` on `GET /suites/roles/board` is now filled. It is written once when a check-in completes or a handoff is raised (and looked at once a night), never when the map is opened. It is built from a handoff a person raised in a check-in that waits on a role nobody holds, such as "Stock planning". It reads "That is why Kwame Mensah has been waiting three weeks for freezers." while the wait is open, and "That is why Kwame Mensah waited three weeks for freezers." once it has ended. The wait is at least one week, and the note is about the longest one for the role. It is stored with the check-in's label ("Participant A"), never a name, and the name goes in only when an admin who may open that check-in reads the map, through the wrapper reports use. If the name would not be theirs to see, or they may not open the check-in (a performance plan, a promotion or a renewal they do not run), `why` is `null` rather than a placeholder. It is checked in code: only numbers from the record, no name, no label, no score, no ranking. It is never built from a private report or from questions to Ask Groundwork.

Schema: `role_gap_notes` gained `ground_id` and `input_key` (migration `20261001150000_role_gap_notes_rest_on_a_check_in`). No field on the map changed shape.


## 1 October: the switchboard's 22 sections

Your request 70. Before building anything, I read what the board and the reports serve today against each of the 22 sections. "Calls for it" is the number of the 24 situations that switch the section on or make it optional (`switchboardSectionsNotServed` in `what-the-switchboard-allows.ts`). The purple twelve are called for by four situations only: "Help a new hire get started", "Check in before a renewal", "Help someone get back on track" and "Get a project back on track" (the new hire and the renewal also carry most of them).

"Served already" means the content is on the board under another field today, for the readers named. "Not served" means nothing carries it, and the last column says whether I build it, or why I serve nothing.

| Section | Calls for it | State | Where, or what is missing |
| --- | --- | --- | --- |
| Lead actions | 22 | Served already | `theJudgement.whatToDo` (what to do and why, the lead only), `decisions` (what needs deciding, and who decides), `toLookAt` and `eachPersonToday[].conversationPoints` (what has stayed the same, and what to talk through, the lead only). |
| Risks | 18 | Not served. Built. | Nothing gathers "what could go wrong". Built from the record, in plain sentences, with the facts behind each one. |
| Work plan | 13 | Partly served. Built. | `whoOwnsWhat` has each person's commitments with no date and no state. `overTime.commitments` has the date and the state, for the lead only. `workRecords` has it for the founder's own check-in only. Built as `workPlan` for each reader under their own wall. |
| Deal grid | 11 | Served already | `workRecords`, the section named "Deal grid", by the check-in's kind of work (request 76): sales org, engineering release, support desk, distribution operations, trader training programme, asset loans, MarketView Q4, a government programme. Served as `none-yet` when nothing has been recorded and as `not-known` when the kind is not set. |
| Coaching | 10 | Served already | `coaching` (`yours` and `eachPerson`), request 79 b. |
| Themes | 9 | Served already | `whatTheRoomIsAbout` (aims, places and things, each with who named it, nothing dropped), `whatTheAnswersSay` (the network read, where enough accounts came in) and, for MarketView where next, `workRecords` "Themes". For support desk it is served as not known, because the helpdesk's own counts are not in the record. |
| Obligations | 6 | Partly served | A law firm matter's parties are in `workRecords` "Obligations". For the others, what each person promised is `workPlan` (built here) and what each waits on is `dependencies`. What a contract's own clauses require is not in the record (the record holds what people said, not the document), so that is not served. |
| Timeline | 5 | Not served. Built. | `phaseSpine` has the sessions and their dates only, and a law firm's deadlines are in `workRecords`. Nothing puts what happened in order. Built as `timeline`. |
| Person history | 5 | Not served. Built. | Built as `personHistory`, one person's record session by session, facts only, to the lead and to the person themselves. |
| Forecast | 5 | Not served. Nothing built. | The record holds no projected figure. `objectives[].journey` says where a number started, where it is and what was aimed for, and `eachPerson` says whether the pace is behind. Neither is a forecast, and I will not invent one. `workRecords` already serves "Forecast" as `not-known` for sales org and MarketView Q4, with the reason. |
| Blocker check | 4 | Not served. Built. | Built as `blockerCheck`: for each open handoff, whether it names a person, whether the person said what they had tried, and whether a time was given. |
| Evidence index | 4 | Not served. Built. | Built as `evidenceIndex`: every line on the board that a document proves or a colleague confirmed, with whose it is and the session. |
| Busy or moving | 4 | Not served. Built. | Built as `busyOrMoving`: counts from the record, for the lead only, never a label. |
| Where the time went | 4 | Not served. Nothing built. | The record holds no record of how anybody's time was spent, only what they said they would do. Anything I wrote here would be a guess. |
| Requirements review | 3 | Served already | `overTime.gaps` (what the role was said to be, against what the record holds; the lead only), `startingState` and `objectives`. |
| Actions and their results | 4 | Served already | `overTime.commitments` (the lead only) with the state and how it was settled. `workPlan` (built here) gives each other reader their own. |
| The other side | 4 | Served already | `divergence.items`, `divergence.agreements`, `whoOwnsWhat` and `managerAlignment`. |
| Who waited on whom | 4 | Served already | `dependencies` on the board, `GET /grounds/:id/links` (`dueSaid`, `dueOn`, `standing`), `GET /grounds/:id/blocker-trace`, and `overTime.dependencies` (sessions waiting, whether anybody went back). |
| Commitments followed over time | 4 | Served already | `overTime.commitments` (said in which session, said again in which, how it ended), the lead only. |
| Pattern history | 4 | Served already | `patterns[].sessions` and `patterns[].howOften`, under `who-reads-a-pattern.ts`, and `overTime.patterns` for the lead. |
| Contradictions | 4 | Served already | `divergence.items` (where two people said different things). Where one person said two things across sessions, nothing is written yet. |
| Questions for the lead | 4 | Served already | `decisions`, `coaching.eachPerson` (what to ask each person) and `eachPersonToday[].conversationPoints`, for the lead only. |

Built in this pass, in order of how many situations call for them: Risks, Work plan, Timeline, Person history, then Blocker check, Evidence index and Busy or moving (four each).

### What is served now (request 70), and what is left

Seven sections are new on `GET /grounds/:id/board`. Each is a top-level field, served only when it has something in it (the field is absent, never an empty list), built from rows the record already holds, with no model and nothing written, so opening the board never changes it. They are served on every board that renders, whatever the family, because the switchboard (your table) decides which a situation draws.

Who reads what, for all seven. The person who runs the check-in, and the admin who set it up, read everyone's. An admin of the organisation reads everyone's on a check-in that is not an evaluation, as they read every other row on the board. On an evaluation check-in (a performance plan, a renewal, a promotion) any other admin has no access to the board at all, as before. Everybody else reads their own rows, the lead's, and (only where people see each other, and never on an evaluation check-in) rows with nobody's name on them. A person they may not name is "a colleague". A handoff is read only by someone in it, where people do not see each other.

| Field | Shape | One real line, as a reader is served it |
| --- | --- | --- |
| `risks` | `[{ id, says, because }]`, at most 10 | says: "Rukia Mwangi cannot move on the credit terms until it comes from Finance." because: "It was first said on 3 September. About what has been tried, Rukia Mwangi said, "I emailed twice." The time given for it was "by Friday"." |
| `workPlan` | `[{ id, participantId, who, says, when, state: 'open' \| 'done' \| 'not done' \| 'dropped', statedInSession }]`, open first | "In session 1, Rukia Mwangi committed to send the Westgate quote. The time Rukia Mwangi gave for it was by Friday. Nobody has said yet whether it happened." (Rukia reads "In session 1, you committed to send the Westgate quote." It is the sentence the report writes for the same commitment.) |
| `timeline` | `[{ on: '2026-09-10', says }]`, oldest first, newest 40. `on` is the day for ordering; `says` starts with the day in words | "On 10 September, Baraka Otieno's commitment to call the Kisumu depot was marked done." |
| `personHistory` | `[{ participantId, who, says, sessions: [{ n, on, says }] }]` | For whoever runs the check-in: "Rukia Mwangi has answered 2 sessions and made 3 commitments." and, for session 1, "In session 1, Rukia Mwangi made 1 commitment and named 1 thing the work was waiting on." How many were kept is the person's own (decision 24), so only they read the tally: "You have answered 2 sessions and made 3 commitments. 1 is done, 1 is not done or dropped, and 1 is still open." A person reads only their own; whoever runs the check-in reads each person who has answered, without a tally of kept against not kept. |
| `blockerCheck` | `[{ id, who, says, namesWhoHoldsIt, saidWhatWasTried, timeGiven, checks: [sentence x 3] }]`, open waits only | checks: "Finance holds it.", "About what has been tried, Rukia Mwangi said, "I emailed twice." (or "Nobody has said what has been tried.")", "No time has been given for it." |
| `evidenceIndex` | `[{ id, participantId, who, said, backedBy, sessionNumber }]` | said (word for word): "We paid out KES 90K to the Nyama Choma Palace account." backedBy: "A document Rukia Mwangi added shows this." or "The colleague who received this work confirmed it." Only lines somebody has not disputed, and only for those whose words the reader may read. |
| `busyOrMoving` | `{ eachPerson: [{ participantId, who, says }], cannotTellYou }`, whoever runs the check-in only | "Rukia Mwangi has made 3 commitments across 2 answered sessions. Rukia Mwangi also named 2 things the work was waiting on." There is no count of how many were kept or cleared, because that is the person's own. cannotTellYou: "These are counts of what people said and what came of it. The record does not show how hard anybody worked, or whether the work itself moved, so nothing here says that." |

No section rates, scores or labels a person, and each test checks that the words "score", "rating", "at risk", "slow", "busy", "behind" and the like are not in what is served. The `said` line of `evidenceIndex` is on the list of a person's own words, so the hidden-target rule leaves it as they said it.

Code: `api/src/modules/board/the-switchboards-own-sections.ts` (the builders) and one block in `board.service.ts`. Tests, each read as Amina who runs it, Rukia, Baraka, an admin who only reads, the admin who set up an evaluation check-in, and an admin with no access to it: `risks-on-the-board-as-each-reader-reads-them.spec.ts`, `a-work-plan-on-the-board-as-each-reader-reads-it.spec.ts`, `a-timeline-on-the-board-as-each-reader-reads-it.spec.ts`, `a-person-history-on-the-board-as-each-reader-reads-it.spec.ts`, `a-blocker-check-on-the-board-as-each-reader-reads-it.spec.ts`, `an-evidence-index-on-the-board-as-each-reader-reads-it.spec.ts`, `busy-or-moving-on-the-board-as-each-reader-reads-it.spec.ts`.

For the screens. Thirteen of the 22 needed no new field, and are in the table above under "Served already" with the field to map each to (`G2_SECTION_TO_BOARD_SECTION` can now point Work plan to `workPlan`, Timeline to `timeline`, Person history to `personHistory`, Risks to `risks`, Blocker check to `blockerCheck`, Evidence index to `evidenceIndex`, Busy or moving to `busyOrMoving`, Coaching to `coaching`, Lead actions to `theJudgement.whatToDo`, Deal grid, Obligations and Themes to `workRecords`, Themes also to `whatTheRoomIsAbout`, The other side and Contradictions to `divergence`, Who waited on whom to `dependencies`, Commitments followed over time and Requirements review to `overTime`, Pattern history to `patterns`, Questions for the lead to `decisions`).

Left, and why. Forecast: the record holds no projected figure, so nothing is served (the work-record section still says "not known" for sales org and MarketView Q4). Where the time went: the record does not hold how anybody's time was spent, so nothing is served. Contradictions inside one person's own answers across sessions, and a contract's own clauses for Obligations: not in the record, not served. `overTime` is still served to the lead only, so the lead's Commitments followed over time, Actions and their results and Requirements review read from it; the other readers get their own commitments in `workPlan`.

## Week 11: the ending page's suggestion, signals and questions, and reviews that fall due from inside the product

### The ending page (`GET /grounds/:groundId/resolution`)

The read the ending page already makes now also carries `theEndingPage`. It is built on the server for whoever is reading, after the read has refused anybody who may not read the check-in (an admin without access to a performance plan, a promotion or a renewal still gets "You are not part of this check-in." and nothing else).

| Field | Who reads it | Shape |
| --- | --- | --- |
| `theEndingPage.reader` | everybody | `'lead'`, `'person'` or `'admin'` |
| `theEndingPage.suggestions` | the lead only, and only once the person has had their turn (decision 53) | The week-10 `ForTheLead` shape: `id`, `aboutName`, `headline`, `why`, `whatWouldChangeIt`, `theirOwnAnswer`, `ifYouAgree`, `otherChoices`, `decision`, `mayChangeTheDecision`, `conversationPoints`. No count, no verdict. Decide with `POST /suggestions/:id/decision`. |
| `theEndingPage.aboutYou` | the person, and a colleague only for what is about them | The week-10 `ForThePerson` shape: `facts` (their own count, theirs alone), `whatWouldChangeIt`, `decision` with `reasons`, `yourSide`, `mayAppeal`. Never the headline, the lead's why, or the verdict. |
| `theEndingPage.appealed` | an admin | Suggestions only once appealed (`ForAnAdmin`). |
| `theEndingPage.signals` | the lead, the admin who set the check-in up, and each person for their own | `[{ id, participantId, yours, heading, whatHappened, howOften, theirWords, whoSeesIt }]`. The same rule as every other pattern (three check-ins, the person first, never every admin). A person is an id for you to place, never joined to a name. |
| `theEndingPage.questions` | the lead only | `[{ aboutName, question }]`. |

What a lead reads, for a person the suggestion was reached for:

- "Groundwork suggests extra support for Kwame"
- Why: "Commitments have been kept less often than Groundwork looks for, over several check-ins."
- What would change it: "Keeping more of what is agreed, over the next few check-ins."
- Questions: "Were Kwame's goals clear enough from the first day?" and "Is there something Kwame needed from you or from the team that has not been given yet?"

What the person reads: "In the last few check-ins, you kept 2 of 8 commitments. That is 25 in 100. When fewer are kept than Groundwork looks for, Groundwork suggests extra support to your lead." and, once decided, the decision with its reasons.

Until the threshold in decision 61 is crossed (fewer than half kept, at least 6 settled), there is no suggestion, so `suggestions` and `aboutYou` are empty lists, and the page should draw nothing for them rather than a line saying nothing was found.

### Reviews (`/suites/reviews`)

- `GET` the board: each `next[]` row now has `proposal`, a sentence when Groundwork proposed the review itself, else `null`. "Groundwork suggests a review for Kwame, because a check-in about Kwame's work has ended. Nothing is sent to Kwame unless you say yes." or "Groundwork suggests a review for Kwame, because your organisation asked for reviews on a regular date and this is the next one. Nothing is sent to Kwame unless you say yes." Show it beside "Start it". `mayStart` is unchanged: only whoever writes the review with the person may say yes.
- `POST` start is unchanged, and is the only thing that starts a review. Nothing starts one on its own, and nothing is sent to the person before it.
- One review: the writer's shape has `suggestion`, the week-10 lead shape for that person on a check-in the writer runs (or `null`). `noticed` is now written from the record when the writer says yes: "Wairimu decided on “Extend evaluation period” at the end of “Kwame, first 90 days” on 20 September 2026, and said why, “He needs another month on the supermarket accounts”." All marked `proven`. No rating, no label, no count of what was kept. A line from an evaluation check-in is read by the writer and the person only.

### The four marks on every line of the reports (request 2, week 6b, decision 43)

Every line a lead reads in a report now carries one of the four marks, decided by the product from the record lines behind it and never by the model. The wording is the prototype's: "Proven", "Confirmed by the person who received it", "Only someone’s word", "From memory only". Each mark is served as two fields, the machine word and the words to print: `mark: 'proven' | 'confirmed' | 'said' | 'memory'` and `markSays`.

A line the model wrote is tied to the record lines it restates (at least two of a record line's own key words, and three quarters of them). It takes the mark of those lines. When several stand behind it and they are not all known the same way, it takes the weakest, in the order proven, confirmed, only someone's word, from memory. It then also carries `marksBehind` (the different marks, strongest first) and `markNote`: "This line rests on more than one thing people said, and they are not all known in the same way. It carries the mark of the one that is known least well." When no record line stands behind it, the mark is `said`, "Only someone’s word". A finding is marked from that person's own lines only. The marks never name a file, never say who said a line and never say how anybody's answers were rated.

The older figure-only marks are kept. Where a line carries a figure, `figureIs` ("their estimate" or "from memory") is still there, and the line also reads `memory`.

| Where | Field |
| --- | --- |
| Team report `GET /grounds/:id/report`, the shared picture | `sharedPictureLines: [{ text, mark, markSays, marksBehind?, markNote?, figureIs? }]`, one per sentence. `sharedPicture` itself is unchanged. |
| Team report, agreements | `agreementMarks`, one per agreement, in the same order as `agreements` (which stay plain strings). |
| Team report, differences (lead and admin, as before) | each item in `divergences` carries `mark`, `markSays` and the rest; each side in `positions` carries them for what that person said; `evidenceMarks` is in the same order as `evidence`. |
| Team report, findings | each item in `findings` carries `mark` and `markSays` (only the reader's own for a participant, as before). |
| Team report, lines from the record | `myRows[]` and `whatTheGroundCanTellYou.whatTheRecordHolds[]` now also carry `markSays`. |
| Session report | each item in a section carries `markSays` beside `mark`; `whatEachPersonSaid[].lineMarksSay` goes with `lineMarks`; `whereThingsStand.settledMarks` and `openMarks` go with `settled` and `open`; each `openWithReasons[]` item carries `mark`, `markSays`, each of its `positions` carries them, and `restsOnMarks` goes with `restsOn`. |
| Board | `divergence.items[]` carry the same marks as the report; `divergence.agreementMarks`, `divergence.settledMarks`, `divergence.stillOpenMarks`; `eachPerson[].findingMark`, `findingMarkSays` (and `findingMarkNote` when they differ); `whoOwnsWhat[].items[]` now also carry `markSays`. |

When they are worked out. When the report is built from the record, and stored with it. Opening a report or a board reads what was stored and asks nothing. A report stored before this change has no marks on its model-written lines, and those lines simply carry none: the screens draw nothing when the field is absent. They fill in the next time something new comes in and the report is built again. A closed round's kept lines carry none either, because they were kept as they were.

Code: `api/src/modules/reports/the-mark-on-every-line.ts`, written at the synthesis write in `reports.service.ts` and attached at `asItWasShared`, the door every report and board read goes through. Tests: `the-mark-on-every-line.spec.ts`.

## Request 9, part (d): the weekly report's sentence about each person (1 October 2026, week 12b)

The engine now serves one part of the weekly report: what this week shows about each person, in one plain sentence each. The rest of the weekly report (the numbers, the three-in-a-row things, what changed, what to do next week) is still to come, so the screens should draw only this part for now.

`GET /grounds/:groundId/report/week` returns:

```
{ weekStart: "2026-09-21" | null,      // the Monday, in Lagos
  builtAt: date | null,
  saying?: string,                      // said when there is nothing to show, for example "No check-in has come in this week yet, so there is nothing to say yet about what people named."
  eachPerson: [{ who: string, isYou: boolean, says: string }] }
```

Who reads what. Whoever runs the check-in (and an admin of the organisation, on an ordinary check-in) reads every sentence, with names. A person in the check-in reads only the sentence about themselves, written to them ("You named Green Mart this week, and gave a next step and a date."), and never another person's. An admin who was not given access to a performance plan, a promotion or a renewal, and anybody outside the organisation, get the usual "Check-in not found". Nothing is ever said about how anybody's answers were rated.

What it says, written from what people named (a customer or company, a date, a next step, a document behind it), never from a rating:
- "Aisha named Green Mart and Nyama Choma Palace this week, and gave a next step and a date."
- "Baraka named Mama Fresh this week, but gave no next step or date, so it is not yet clear what happens next."
- "Baraka gave a date this week, but named no customer, so it is not yet clear who it is for."
- "Baraka's account named no customer, date or next step this week, so there is nothing yet to follow up on."
- "Baraka has not checked in this week, so there is nothing here yet about what Baraka is working on."

There is one sentence per person and no sentence compares two people, so the screens should list them as they come and never group, sort or rank them. The prototype's "Aisha and Miriam consistently get to..." cannot be said from one week, so the engine does not say "consistently".

When it is worked out. When a check-in comes in, and stored without names (by the report's labels; names go in when it is served). Opening the page builds nothing. The product writes the sentence from the record, so no model and no prompt version are involved.

Code: `api/src/modules/reports/the-weekly-sentence-about-each-person.ts`, `the-weekly-report.service.ts`, `the-weekly-report.controller.ts`. Tests: `the-weekly-sentence-about-each-person.spec.ts`.

## Week 17: Ask Groundwork answers "What should I do next?", "What did Femi say last week?", and says where every answer came from

### A new block, `source`

Every reply is still `{ blocks, composedBy, lane }`. There is one new block type, `source`, which is a link-like block saying which record an answer was built from:

```
{ "type": "source",
  "label": "Femi's check-in of 24 September on Sales team, Q3",
  "says": "This is from Femi's check-in of 24 September on Sales team, Q3.",
  "href": "/grounds/<groundId>/session/2",
  "kind": "check_in" | "report" | "to_dos" | "commitments" | "today",
  "id": "<groundId>"            // only where the record is on a check-in
}
```

- The same sentence (`says`) is already the last line of the text block, so a screen that draws only the text still tells the reader where it came from. Draw `label` as the link and do not print `says` a second time.
- `href` is a path within Groundwork, relative on purpose, as for `next_step`. The four paths are the round's report (`/grounds/:id/session/:n`), the report on a check-in (`/grounds/:id/report`), your to-do list (`/suite/todos`), your commitments (`/you`) and Today (`/today`).
- An answer can carry more than one `source` block, in the same order as the parts of the text, when it draws on more than one check-in.
- The older answers that read a record now carry one too: "What is on my list?" (kind `to_dos`), "What did I commit to?" (`commitments`), "Where am I needed?" (`today`) and "What came of it?" (`report`). An answer with nothing behind it (an empty list, "I cannot show you that.") carries none.

### "What should I do next?" (lane `what_next`)

One thing first, with why, and the rest counted, never listed. Built only from the reader's own open commitments, their own to-dos, and what is waiting on them (what Today reads). The order is: a commitment whose date has passed, then somebody waiting on you, then the to-do with the nearest date (or the oldest), then the open commitment with the nearest date. What a person reads, for example:

> Start with "Send the Westgate price list". You said you would do it by Friday, and the date you gave has passed, so whoever is counting on it is still waiting. Either do it, or tell them when it will happen. After that, one more thing is open. Ask me what is on your list, or where you are needed, to see them.
>
> This is from the commitments you have made in your check-ins.

Or, when somebody is waiting on you: "Start with Femi. Femi is waiting on you for the discount approval, and has been for 6 days. Nobody else can clear this one." When nothing is open: "I have nothing to put first. You have no open commitments or to-dos, and nobody is waiting on you in the record. That can also mean something has been said somewhere I cannot see."

### "What did Femi say last week?" (lane `what_did_they_say`)

Answered only with what the asker may already read of Femi's words. The engine lists the check-ins the asker may read at all (the same rule as everywhere else, so an admin with no access to a performance plan, a promotion or a renewal gets nothing from it), and reads the newest round of each as the asker. So Femi's lines come word for word only where the report serves them to the asker; before a round is released a colleague gets the wall's own sentence instead; in an evaluation check-in the person being reviewed gets the facts sentence. Femi's own report, the questions anybody asked Ask Groundwork, a lead's private notes and anybody's load are never opened.

What a person reads:

> Here is what Femi said in their check-in of 24 September on Sales team, Q3.
> - "Shipped the price list to Harbor Foods."
> - "Still waiting on finance for the Green Mart terms."
> This is from Femi's check-in of 24 September on Sales team, Q3.

When the words are not served to the asker: "I cannot show you Yemi's words from their check-in of 30 September on Kilimani launch. Answered. What they said opens to you when the report releases." When there is nothing the asker may read: "I cannot show you that. I have nothing from Femi in the check-ins you can read." That sentence is the same whether Femi said nothing or said something the asker may not read, on purpose. When the asker named a time and nothing fits it, the answer says so ("I cannot find anything Femi said today in a check-in you can read. The most recent I can show you is below.") and gives the most recent, dated. Up to three check-ins are read out, newest first, each with its own source. A person's own words are read back as "you" and "your check-in".

### The wording of the answers

A model may reword these answers, but the engine refuses the reworded version, and sends its own words, if any name, number, date or quoted line is not exactly as the record gave it. The quoted-line check is new and applies to every answer Ask Groundwork words, not only these.

### A guest

A guest is still answered only about their own check-in (decision 36). "What did Femi say last week?" gets the plain list of what they can ask; "What should I do next?" gets their own commitments from their own check-in and nothing of anyone else's.

Code: `api/src/modules/assistant/what-they-said-that-you-may-read.ts`, `what-to-do-next.ts`, `a-source-says-where-it-came-from.ts`, the `source` block in `a-reply-is-a-payload-not-a-string.ts`, the two lanes in `the-router-is-deterministic.ts`. Tests: `what-they-said-and-what-is-next-as-each-reader-reads-it.spec.ts`.

## Week 18: Ask Groundwork changes things by talking, after a yes

Three changes, each said back as a yes or no question and written only when the person answers yes through `POST /ask/answer` (the answer for the proposal block the reply carries, exactly as for adding a to-do). A no writes nothing. The question and the sentence after the yes are the product's own words. A model is never asked to word them, so there is nothing for the screen to reword either.

**Who may change what.** A person changes only their own commitments and to-dos. A lead may also move the deadline of a commitment the lead made for somebody, on a check-in the lead runs. Nobody marks somebody else's commitment done, lead or not. The rule is checked again at the moment of the yes, not only when the question was asked.

What a person reads, where the day is read in code (a day that cannot be read is asked for, and a day that has passed is asked about again):

- Moving your own: "Shall I move "Send the Westgate price list" from Friday 2 October to Tuesday 6 October?" After a yes: "I have moved "Send the Westgate price list" to Tuesday 6 October."
- A lead moving one they set for somebody: "Shall I move "Call the Kisumu depot", which you set for Baraka, from Monday 5 October to Wednesday 7 October?" After a yes: "I have moved "Call the Kisumu depot" to Wednesday 7 October."
- With no day yet: "Shall I set "X" to be done by Tuesday 6 October?" and "I have set "X" to be done by Tuesday 6 October."
- Adding one (always the asker's own): "Shall I add "Book the room for the launch" as something you will do by Friday 2 October?" After a yes: "I have added "Book the room for the launch" as something you will do by Friday 2 October." With no day said, none is made up: "Shall I add "Call the Naivasha depot" as something you will do?"
- Marking done, now said back first for a to-do and for your own commitment: "Shall I mark "Call the Kisumu depot" as done?" After a yes: "I have marked "Call the Kisumu depot" as done."
- On a no, for all three: "I have left it as it was. Nothing was changed."
- A date that cannot be read: "I could not read a date from "next sprint". Which day do you mean? For example, Tuesday 7 October." A date that has passed: "Wednesday 2 September has already passed. Which day do you mean?" A day in another year carries the year.
- Somebody else's, when the asker names them: "Only Baraka can change what Baraka said they would do." It is said only when the asker typed the name, so it tells them nothing they did not say.
- If the lead has left the check-in by the time of the yes: "Only Baraka can change what Baraka said they would do. You can no longer move it for them, so I have changed nothing."

Phrasings that start each: "move X to Tuesday", "push X back to Friday", "change the deadline on X to 7 October"; "add a commitment: X by Friday", "commit me to X"; "mark X as done", "tick off X", "done: X". The proposal kinds are `move_deadline`, `add_commitment` and `tick_off`, and the reply's `lane` is `move_a_deadline`, `add_a_commitment` or `tick_off_a_to_do`.

Moving a deadline also moves the check-in's own record of it where the commitment came from a check-in, so the two never disagree. Not done this week: moving the date of a target that lives on the company's targets page (there is no route for it yet), and a route in the panel API to move a deadline (adding and marking done already share their writer with Ask Groundwork).

Code: `api/src/modules/assistant/a-change-said-back-first.ts` (reading and wording), `a-commitment-has-one-writer.ts` (the one writer, also used by `/commitments`), the lanes in `assistant.service.ts`. Tests: `changing-things-by-talking-is-said-back-first.spec.ts`.

## Week 25: the lead is told while the report is still being written

The lead's read of the report (`GET /reports/:groundId`) carries a new field, `beingWritten`, for as long as a new report of that check-in is being written, and only then:

```
beingWritten: {
  since: "2026-10-01T10:00:00.000Z",
  sentence: "The report is being written with what Amani and Baraka said. It will include everyone in a few minutes."
}
```

- It is there only for the person who runs the check-in. Nobody else reads it, and it is absent (not null) when nothing is being written.
- The sentence is ready to show as it is. The names go through the same naming wrapper as every other line of the report, so a person the lead may not see named reads as "a colleague". With more than three people answered it reads "with what Amani, Baraka, Chidi and others said". With nobody answered yet it reads "The report is being written. It will include everyone in a few minutes."
- It is removed by the engine when the report is finished. Screens should show it above the report and stop showing it when the field is gone; reading again after a minute or two is enough. Opening a report never starts one being written.
- Until the very first report of a check-in exists, the read still answers "there is no report yet" with its reason, as before.

Code: `api/src/modules/reports/the-report-is-being-written.ts`, `withBeingWritten` in `reports.service.ts`. Tests: `the-report-is-written-in-parallel.spec.ts`.

## Week 19: think it through, in Ask Groundwork

A new lane, `think_it_through`, lays out options before anything is written. It writes nothing, parks nothing and decides nothing (decisions 12 and 13). The reply has no `proposal` block and no `picker`: it is one `text` block, with `lane: "think_it_through"`, `composedBy: "model"`, and a new `promptVersionId` on the reply that says which stored prompt version ran (the prompt is stored as `think_it_through` and can be changed at `/prompts`). A reply that could not be made, or was refused by the checks, is a plain `text` block with `composedBy: "rules"` and no `promptVersionId`.

It starts on "help me think through the Q4 target", "what are my options for the Atlas deadline", "let us think it through", "weigh up my options" or "brainstorm how to hit the quarter". "Set a target for Q4" still opens the target draft, and "add a commitment: X" still says the change back first.

What a person reads (two to four options, the frame is the product's and the three sentences in each option are the model's, checked):

- "Here are three options for the Q4 target. I am not choosing for you, and nothing has been written."
- "The first option is to keep the target at 3." (then "The second option is to raise the target.", "The third option is to keep 3 and add a review point."; the model gives each title as a short phrase starting with a lower-case verb and code joins it after "The first option is to") then three sentences on their own lines, always starting "It would mean that", "It assumes that" and "You would know it is working if".
- When nothing written down could be read: "I found nothing written down about this that you can read, so these options come only from what you told me."
- The last paragraph, always: "Would you like me to turn one of these into something concrete? I can help you set it as a target, add it as a commitment, or keep it as a line of context. Tell me which option and which of those, and I will say exactly what I would write, and I will write nothing until you say yes." That is only a question. The next message is routed as usual, so each of the three is said back first and waits for a yes.
- With nothing named: "What would you like to think through? Tell me the target, the decision or the plan, and I will lay out the options."
- If the model cannot be reached: "I could not lay out options just now, so I have not suggested anything and nothing has been written. Ask me again in a moment."
- If fewer than two options pass the checks: "I could not put together options that stay within what you told me and what you can already read, so I have not suggested any. Nothing has been written. Tell me a little more about what you are deciding, such as the number or the date you have in mind, and I will try again."

The checks, in code: any option that uses a number, a number in words, a name, a month or a day that was not in the question or in what the reader may read is dropped. So is any option that does not keep its three sentences, or that recommends ("I recommend", "you should", "the best option" and similar). The screens need not reword or filter anything.

Who reads what: a participant's options come from their own targets and commitments only, and no check-in report is opened for them. A lead or an admin also has what the check-ins they may read serve to them (the same read as "what did Femi say"), so an admin with no access to a performance plan, promotion or renewal gets nothing from it. Private reports, questions to Ask Groundwork, a lead's private notes and a person's load across check-ins are never read.

Code: `api/src/modules/assistant/think-it-through.ts`, the lane in `assistant.service.ts`, the rule in `the-router-is-deterministic.ts`, the capability in `what-the-assistant-can-do.ts`, the seed in `conversation/prompt-library.ts`. Tests: `think-it-through.spec.ts`.

## Week 20: memory that lasts beyond one check-in (request 17 part e), and leave dates said in chat

### What the lead is asked, and what is kept

When the lead says something in the setup conversation (the context chat, also reached through Ask Groundwork) that is true of the whole company, the setup conversation offers to keep it for the organisation. It is a rule, a definition, a principle, who owns something, or something about a client. The offer is its own say-back, in the lead's own words, and only a yes keeps it:

- "Shall I keep "Every quote over 1 million needs Amina's sign-off" as a rule for the whole organisation, so later check-ins and Ask Groundwork can use it?"
- The kind reads "a rule", "a definition", "a principle", "who owns something" or "something about a client".
- After the yes: "I have kept "Every quote over 1 million needs Amina's sign-off" as a rule for the whole organisation. Later check-ins and Ask Groundwork can now use it. You can see it on the Company page."
- After the no: "I have not kept that for the organisation. It stays only on this check-in." The offer is deleted; nothing of it is kept.

On the two doors the screens already use:

- `POST /grounds/:id/context-chat` returns `proposal: { gap: 'organisation_memory', say, offerId }`. `POST /grounds/:id/context-chat/confirm` takes `{ said, offerId }` for the yes. New: `POST /grounds/:id/context-chat/decline` takes `{ offerId }` for the no. Only the person who was asked can answer. A yes that carries an `offerId` never reads a value from the screen; what is kept is the row that was offered.
- Through Ask Groundwork nothing changes for the screens: the say-back arrives as the usual `proposal` block, and the yes or no goes to `POST /ask/answer`.
- Only one question waits at a time. When the lead's turn has already produced another proposal (an answer to the open question, a target for a person), nothing is offered on that turn.

Never offered: anything in a message where the lead asked for privacy ("keep this between us", "private", "off the record" and the like); a sentence that names someone on the check-in and judges or worries about them; a sentence that is not, word for word, what the lead typed; anything said by a participant (the setup conversation is the lead's, and an admin covering for a lead who has left); and anything a lead's private note carries, because private notes have their own road and never come here.

### Where it is kept, and who reads it

Kept in the new table `organization_memories` (`OrganizationMemory`): `kind`, `text` (the lead's own words), `status` (`OFFERED` until the yes, then `KEPT`), `sourceLine`, `offeredById`, `keptById`, `keptAt`. It sits next to the knowledge cards ("how we do it here") and is kept apart from them on purpose: a card is what the company wrote down, and what a person says is held up against it; this is what a lead said, and it is only context. An offer that has not been said yes to is read by nothing.

`GET /company` carries a new field, `whatWeKeep`, for an admin, a lead (organisation role), and anybody who runs a check-in. For everyone else the field is absent, not empty. It reads:

```
whatWeKeep: {
  readBy: "Admins, leads and anyone who runs a check-in can read this. Everyone else cannot.",
  items: [
    { id, kind: "rule", says: "Every quote over 1 million needs Amina's sign-off", source: "Picked up from your check-in on 22 September" }
  ]
}
```

`readBy` is ready to show, so the page can say who reads it. Newest first. The prototype's "Waiting for your confirmation" list with Confirm, Edit and Not now is not served: the question is asked and answered in the conversation, where the yes is said. If you want those three buttons on the page, tell me and I will add the waiting list and its routes.

### Who is given it

- Ask Groundwork: a question about how something is done is answered from the kept words too, for the same readers as the page: "Your organisation has kept this from a setup conversation." and then the sentence in quotation marks. It never says who said it or when. Anybody else is told "Your organisation has not written anything down about that here. If it should have, whoever set Groundwork up can add it."
- Later check-ins: the session's instructions carry the kept sentences as context, under "WHAT THIS ORGANISATION HAS ASKED US TO KEEP IN MIND", with the rule that they are never quoted, never attributed, and never treated as what the person said. They are kept out of "how this company says it works", so a person's account is never compared with them.

### Leave dates said in chat

Leave dates said in the setup conversation or to Ask Groundwork ("I need next Thursday and Friday off") go to the leave suite, never to the record. The days are read by rules from what was said and today's date, and nothing is guessed: "Monday and Wednesday" is not read, because it could include Tuesday. It is said back and sent only on a yes:

- "You asked for leave from Thursday 8 October to Friday 9 October, which is 2 working days. You have 16 days of leave left this year, and nobody else in Sales is off then. Shall I send it to Wairimu to approve?" (the approver's first name where the organisation has said "their manager" and that manager is a lead or admin; otherwise "an admin". The days left and the team clause are left out when they are not known.)
- After the yes, through `LeaveBoardService.ask`: "I have sent your leave request from Thursday 8 October to Friday 9 October to Wairimu. It is not approved until they decide, and you will see it under your leave."
- After the no: "I have not sent it. Nothing was kept."
- While the suite is off: "Leave requests are not switched on in your organisation, so I have not sent or kept these dates. An admin can switch them on under Suites." Nothing is parked, recorded or remembered, not even in the person's private Ask Groundwork history.

Through the setup route it arrives as `proposal: { gap: 'leave_request', say }` and the yes is `confirm` with `{ said, leave: true }`. Through Ask Groundwork it is lane `ask_for_leave`.

Code: `api/src/modules/knowledge/what-the-organisation-keeps.ts` (the rules and the words), `organisation-memory.ts` (the table), `api/src/modules/suites/leave-said-in-chat.ts`, the hooks in `grounds.service.ts` (`contextChat`, `applyContextProposal`, `declineContextOffer`), `assistant.service.ts`, `conversation.service.ts` and `company.service.ts`. Tests: `organisation-memory.spec.ts`, `organisation-memory-through-the-setup-chat.spec.ts`, `organisation-memory-and-leave-through-ask-groundwork.spec.ts`, `kept-organisation-memory-reaches-the-prompt.spec.ts`, `leave-said-in-chat.spec.ts`, and the company page spec for each reader.

## Hours and spending said in chat (weeks 21 and 22, requests 21, 22 and 26)

Who approves, for leave, hours and spending alike: the person's line manager in the staff directory when that manager is a lead or an admin here, otherwise an admin. The person who runs a check-in does not approve just because they run it, and nobody approves their own. It is one function (`whoApprovesFor` in `api/src/modules/suites/who-approves.ts`), and the leave board, the time sheets board and the spending board all follow it. This is recorded as decided for Hafsah to confirm. The suite's own answer to "Who approves?" no longer changes who decides for leave and hours, so that question can leave the suite's setup page when you next touch it; spending still has its limit and the named person above it.

Both go through Ask Groundwork only (lanes `log_hours` and `ask_to_spend`), as a text block and a proposal block with Yes and No, exactly like leave. Neither is in a check-in's record, a report, a pattern, or the person's Ask Groundwork history.

### Hours (lane `log_hours`)

- Said: "I did 6 hours on Atlas today". Read by rules: the hours, a project from the admin's list, and a day that was said (today, yesterday, a weekday, a date). A day, a project or an amount that is not certain is asked, never guessed.
- Said back: "Shall I log 6 hours on Atlas for Thursday 1 October and send it to Wairimu to approve?" (several projects: "Shall I log 3 hours on Naivas Ngong Road and 1 hour on Lakeside for Wednesday 30 September and send it to Wairimu to approve?"). With no line manager it says "an admin".
- After the yes, through `TimeSheetsService.record`: "I have logged 6 hours on Atlas for Thursday 1 October and sent it to Wairimu to approve. It is not approved until they decide, and you will see it under your hours." The hours then wait for the approver on the time sheets board.
- After the no: "I have not sent it. Nothing was kept."
- Suite off: "Time sheets are not switched on in your organisation, so I have not sent or kept these hours. An admin can switch them on under Suites." Nothing is parked or kept.
- Asked again: "I do not have Zebra on the list of clients and projects. Which one did you mean? The ones I have are Atlas, Naivas Ngong Road and Lakeside." / "Which day was that? Tell me the day, for example today, yesterday or a date, and I will ask again." / "Monday 5 October has not come yet. Tell me the day the hours were on, and I will ask again." / "I could not tell how many hours that was. Tell me the number of hours and the project, for example 6 hours on Atlas, and I will ask again."

### Spending (lane `ask_to_spend`)

- Said: "I spent 12,000 on fuel for the Kisumu trip" or "Can I spend KES 18,000 on fuel for the Kisumu deliveries?".
- Fits: "You asked to spend KES 12,000 on fuel for the Kisumu trip. Operations has KES 38,000 left for October, so that fits. Shall I send it to Wairimu to approve?"
- Over the budget: "You asked to spend KES 12,000 on fuel for the Kisumu trip. That is over the Operations budget left for October, which is KES 8,000. Shall I still send it to Wairimu to approve?" (It names the person's team, not a category: the budget in the product is per team.)
- Over the rule: "... This is over KES 20,000, so Grace must approve it. Shall I still send it to Grace to approve?"
- After the yes, through `SpendingService.ask`: "I have sent your request to spend KES 12,000 on fuel for the Kisumu trip to Wairimu. It is not approved until they decide, and nothing is spent until then."
- After the no: "I have not sent it. Nothing was kept." Suite off: "Spending requests are not switched on in your organisation, so I have not sent or kept this. An admin can switch them on under Suites."
- Asked again: more than one amount, a currency that is not the organisation's ("Your organisation counts spending in KES, and you wrote USD. Tell me the amount in KES and I will ask again."), or no reason ("What is the KES 12,000 for? Tell me in a few words and I will ask again."). A person is told only what their own team has left, never anybody else's spending.

### Still open for the screens

The approver is not yet told on Today. Today is built in `grounds/what-needs-you*`, which this work did not change, so it needs one new kind of item there ("Aisha has asked for leave", "Brian has sent hours to approve", "Kamau has asked to spend KES 18,000"), read from the leave, time sheets and spending boards for the person who may decide. Until then the approver finds them on the three suite boards, which already show Approve and Decline only to the right person.

Code: `api/src/modules/suites/hours-said-in-chat.ts`, `spend-said-in-chat.ts`, `who-approves.ts`, and the lanes in `api/src/modules/assistant/assistant.service.ts`. Tests: `suites/hours-and-spending-said-in-chat.spec.ts` and `assistant/hours-and-spending-through-ask-groundwork.spec.ts`.
