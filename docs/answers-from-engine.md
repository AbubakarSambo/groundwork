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
- `{ "type": "next_step", "kind": "upload_a_document", "label": "Choose a file", "id": "<check-in id>", "context": { "groundId": "…", "label": "…" } }`: open the file picker and upload to that check-in with the upload route the Context and resources page already uses. The file arrives private to the person (`OWN`).

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
