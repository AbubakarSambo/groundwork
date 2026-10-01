# The weekly plan after release

Hafsah's decision 37: deploy soon with what works, then improve the product every week.

This is the order of those weeks. **Each week is one piece, small enough to build, test and review in a week**, and ends with the same proof:
- every test passes;
- the scenario runs and the checker show nothing worse than the baseline;
- somebody reads what each person actually sees, as the lead, as a participant and as an admin.

Big capabilities are split into several weeks. The estimates behind each piece come from `docs/capability-check.md`.

**How to read the marks:**
- **Needs Hafsah first:** the week cannot start until Hafsah has decided something. The question is written out.
- **Screens later:** there is a screen piece the screens workspace could do in its own files, after the engine week, without touching the engine's files.

The order follows Hafsah's: the check-in conversation first; then judging, and making patterns stronger; then seeding and surfacing; then memory, requests through chat and being away. Documents, photos and the known gaps are fitted in where they belong.

---

## The check-in conversation

**Week 0 (early, and before the weeks below where it can be). Text other people read is never written with someone else's hidden target given to the model.** Today a target the lead set for one person is taken out of what others are served, sentence by sentence, after the model has written it. That is a rule of thumb: it errs on the side of hiding, and it can only catch what it recognises. The structural fix is the one decision 32 uses for the lead's private notes: when the engine writes a report, a board line or a session that someone other than the target's owner will read, it is not given that person's hidden target at all. Where one text is read by several people, it is written without anyone's hidden target, and each person's own number is added only to what they alone read. The read-side rule stays as a second net.

**Week 1. Asking for what someone holds back.** *Built 28 September (`020260e4`, `3fb7edf9`).* When a person states a limit ("I could open the Equity door") or leaves out a date, the check-in asks directly about the rest ("Which of the other two banks can you open?") and asks for dates. This is what advisor and shock needed in most runs. It includes the rule that the check-in never repeats a question already answered.

**Week 2. One question at a time, and the lead's name in every message about them.** *Done 28 September: 0 turns with two questions on run-14.* These are tasks 2.1 and 2.2 in `docs/tasks.md`. The check is that "turns that ask more than one question" reaches 0.

**Week 3. Plain words and warm openings.** *Built and measured twice, 28 September (`edcaf719`, `7bdbec5b`). The jargon bar needs Hafsah's decision on people's own words.* Tasks 2.3 and 2.4. The check-in has no jargon in its own turns, and starts from what the person said last time, with good news first when there is some. "Past words brought back" must not go down.

**Week 4. Asking for proof kindly, and never commenting on short answers.** *Built 28 September (`a0449e5a`, `f46a4b42`), being measured.* Tasks 2.5 and 2.8. Groundwork says what the proof is for, and picks up from the last clear thing the person said. "Proof asked for" must not go down.

**Week 5. Suggested answers under each question.** *Built 28 September (`e313b579`), being measured.* Task 2.6. The engine returns two to four suggested answers with each question (screens request 7a).
- **Screens later:** showing them. The screens already draw them when they arrive.

**Week 6. The three-part ending, with a mark on each line.** *Built on the engine's side 29 September (`47b4d04c`, `eebc48a8`); the screens need to fetch the card from the transcript after the close, and run-17 is measuring it.* Task 2.7: proven, confirmed, their word, or memory. This needs one new field, for "confirmed by the person who received the work" (screens request 7b).
- **Screens later:** the end card, and the Done page's "what changed".

**Week 6b. The same four marks on every line of the reports (decision 43).** *Built 1 October (`46297a85`): every line a lead reads carries one of the four marks, decided from the record behind it, never by the model.* The prototype marks each line a lead reads: "Proven", "Confirmed by the person who received it", "Only someone's word", "From memory only". Today the reports mark only lines with a figure ("counted", "estimated", "from memory"). This uses the field week 6 adds.
- **Screens later:** the legend and the marks on the report pages.

**Week 7. The lead confirms the exact question (decision 34).** *Built on the engine's side 28 September; the screens' card is theirs.* When the lead sets a question for a person, Groundwork writes the question once, the way it will ask it. The lead sees exactly that and confirms it, and the check-in then asks it word for word.
- **Screens later:** the confirmation card on the Context page.

---

## Judging, and making patterns stronger

**Week 8. Patterns that follow Hafsah's rules, switched on.** *Switched on 29 September (`19cdf9b0`) with the approved names (decision 52); the wording around each pattern is being fixed in place (decision 55).* Decision 57 changes how they count and adds what follows:
- A period is at least a week. For a daily check-in, each week is a period. The three-period rule counts periods everywhere, including when a later check-in is steered by a pattern.
- The lead marks a pattern "right", "wrong" or "not sure" after talking it through, and the person's answer counts as evidence too. Both are stored with the pattern.
- The lead is nudged once to have the conversation, and can mark "we talked about it". Later check-ins record whether things changed.
- The number-based rules are a second source of evidence beside the model. The runs report how steady each scenario's patterns are.
- The "setup never said" reading shows again, under the period rule.
- **Screens later:** the lead's "right", "wrong", "not sure" and "we talked about it".

**Week 8b. Self-learning (decisions 55 and 57), early, because everything after it gets better with it.** *Built 1 October (`5c0d187d`, `a8fe3f79`, `7e5a36f9`): the three signals are counted and a weight is suggested for each; the weights are switched off until proven on the scenario runs and agreed by Hafsah.* Every pattern, coaching step and probe keeps three signals:
- was it right (the lead's mark, and the person's answer);
- did the conversation happen (the lead's "we talked about it", or the step asked about);
- did things change (what later check-ins show).

These give more weight to what works, and flag what is often wrong. For example:
- a pattern often marked "wrong" is shown less readily;
- a coaching step that rarely helps is offered less;
- a probe that gets the most specific answers is asked sooner.

What never changes:
- People's own words are never changed.
- No privacy rule bends: signals are counted, and nobody reads another person's answers through them.
- Any change to how patterns are judged is proven on the scenario runs before it is adopted.
- Big changes go to Hafsah first.

It needs week 8's marks, and week 9's kept and missed commitments, to have signals to learn from.

**Week 8 (as first planned).** This is only if the work is not finished before release.
- The plain names are approved.
- A pattern never appears as a label beside a name, and a participant never sees a colleague's.
- It shows only after three periods.
- The person sees theirs first and can answer before the lead sees it.
- **Needs Hafsah first:** approving the 49 plain names in `docs/pattern-names.md`, and the open question on B5.
- **Screens later:** the place where a person answers their own pattern.

**Week 9. Commitments kept and missed.** Each commitment is marked as kept or missed from the next check-in and from proof, so "kept 11 of 20 in the last 4 weeks" can be counted. Everything in the next week rests on this.

**Week 10. The first suggestion, told like a signal (decision 6).** The engine reaches a suggestion for one person and records it: why, what would change it, and the person's own answer, in plain sentences. The screens that show, decide, answer and appeal a suggestion are already built.
- **Needs Hafsah first:** the thresholds for each suggestion (for example "below 6 in 10"), how "the last 4 weeks" is counted, and whether a new suggestion replaces one nobody has decided.

**Week 11. Suggestions on the ending page and in reviews.** *Built 1 October: the ending page carries the suggestion, signals and questions; a review that falls due is proposed, and only the writer's yes starts it (decided for Hafsah to confirm).* The ending page gets its suggestion, signals and questions. The reviews suite can start reviews that fall due from inside the product, not only from an outside system, and writes "What Groundwork noticed".
- **Needs Hafsah first:** whether the product itself starts reviews, and how often.
- **Screens later:** any changes to the reviews board.

**Week 12. Who is slipping, said as what happened.** *Partly done 28 September (`b450fbf2`): no row says "nothing here needs you" and then gives something to ask, "waiting 0 days" is gone, and nobody is asked to speak to a thing. The alert in the prototype's words is still to do.* *Finished later (`1f17703e`), on the report and each person's line.* Each person's line on the board says what needs the lead. It never says "nothing here needs you" and then names a blocker. It fixes "waiting 0 days". The alert reads like the prototype's "Samuel has chased the same 5 leads for 3 check-ins". Never a label on a person.

**Week 12b. The weekly report's sentence about each person (decision 43).** *Built 1 October (`52096bd3`): one sentence about each person, from what they named, at GET /grounds/:id/report/week.* The prototype's weekly report says, in one plain sentence, how people's accounts read, for example "Aisha and Miriam consistently get to specific customer needs and next steps." The engine has no weekly report yet (screens request 9). This writes that sentence from the record, never from the rating itself, and never as a label. *Built 1 October: `GET /grounds/:id/report/week` serves one plain sentence about each person, written by the product from what they named; the rest of the weekly report is still to do.*
- **Screens later:** the weekly report page.

**Week 12c. An email address is never used as a name** *Built 1 October: no address, or the front of one, in any sentence; the same unnamed person is "the same colleague".* (screens requests 56, 58 and 65). A lead is shown the address of someone who has not given a name, as a stand-in for the name, and the model then writes it into sentences such as "Start with zawadi.u8@example.test." Say "a colleague" in sentences, as everywhere else, and show the address only where the lead needs it to tell who is who, beside the name rather than in its place. The same person is counted in one place, so "4 of 5" and "4 of 6" cannot both appear (request 56).

---

## Seeding and surfacing

**Week 13. A plan becomes proposals, confirmed one by one.** A pasted or uploaded plan becomes separate proposals, one each for goals, roles, commitments and rules, each with Confirm, Edit and Not now. Dates are kept. Roles are created. Everything comes before any row is written. This is screens request 6a.
- **Screens later:** the "Waiting for you to confirm" cards, and the storage for proposals waiting to be confirmed, which the screens workspace offered to add.

**Week 14. A document read item by item.** *Built 29 September (`3d60bbaf` and after).* For each document: what was taken, with page numbers, and what was left out, and why. When a document disagrees with the record, the product asks about it once, and does not ask again after it is answered. Numbers are kept on "Yes, but…" as well as a bare "yes". This is screens request 6c.
- **Screens later:** the item-by-item view on "Add a document".

**Week 15. Photos as proof, said out loud.** *Built 29 September (`61c48f3d` and after).* A photo that backs a line is marked as proof and shown, and the person is told it counted. The check-in asks for a photo when a claim is only someone's word. A receipt or an invoice is never called "a conversation".
- **Screens later:** the proof mark on the board and the end card.

**Week 16. Today, and alerts.** *Built 29 September (`30e398df` and after).* Today shows what really needs each person: blockers, people waiting, decisions only the lead can make. It never says nothing needs them while their board shows otherwise. This is screens request 3.
- **Screens later:** any new parts of Today.

---

## Memory, requests through chat, and being away

**Week 17. Ask Groundwork answers more questions.** *Built 1 October (`16352e10`): "What should I do next?" and "What did Femi say last week?", with where each answer came from.* "What should I do next?", "What did Femi say last week?", and reading any record the person may already see, with where each answer came from. This is the biggest part of Converse.

**Week 18. Ask Groundwork changes things by talking, after a yes.** *Built 1 October: move a deadline, add a commitment, mark something done, each said back and written only on a yes; ticking off a to-do is said back too.* Moving a deadline, adding a commitment, marking something done. Every one is said back and confirmed first (decision 12), including ticking off a to-do, which today acts without saying it back.

**Week 19. Brainstorm.** *Built 1 October (`f2998808`): options with what each assumes, nothing chosen for the lead, nothing written.* A "think it through" mode lays out options, targets and what each assumes before anything is written. Nothing is decided for the lead (decision 13).

**Week 20. Memory that lasts beyond one check-in.** *Built 1 October (`81e22cb0`): kept only on the lead's yes, used as context, leave dates go to the leave suite.* What a lead tells the context chat that is true of the whole company, such as a client's rules or names, can be kept for the organisation after the lead confirms it. Ask Groundwork and the next check-ins can then use it. Leave dates said in chat go to the leave suite, not to the record.
- **Needs Hafsah first:** what may move from one check-in to the whole company, and who confirms it.

**Week 21. Leave and hours through chat.** *Built 1 October: leave (week 20) and hours through Ask Groundwork, said back and sent on a yes; the approver's line on Today followed the same day (`e16604c2`).* "I need leave from 12 to 16 October" and "I did 6 hours on Atlas today" are said back with the real dates, the days left and who else is off, then sent to the right approver after a yes. The approver is told on Today. This is screens requests 21 and 22.
- **Needs Hafsah first:** whether the person who runs a check-in counts as a person's lead for approving (decision 33 says this is decided when the work starts).

**Week 22. Spending through chat.** *Built 1 October: checked against the budget and the rules before the yes.* The same, checked against the budget and the rules. This is screens request 26.

**Week 23. Being away.** *Built 1 October (`6efda69e` to `c2ed3add`): not waited on, no reminders, nothing counted against them.* The dates of approved leave, dates only (decision 31), are copied to where the engine reads them. While someone is away:
- the board and the round count do not wait for them;
- no reminders or "you have missed" emails go to them;
- nothing counts against them.

It says, for example, "Yemi is on leave until Friday 2 October, so this round does not wait for her."
- **Needs Hafsah first:** the exact sentence the lead reads, since the prototype does not draw one.

---

## Known gaps, fitted in

**Week 24. Ask Groundwork for a guest, within their own check-in (decision 36).** *Built 1 October (`3fe8d5c0`).* Today a guest is refused. This week scopes every part of the assistant to the guest's own check-in, so they can ask about it and nothing else.

**Week 25. The slow report for a larger team.** *Built 1 October (`3f34d2cc`): independent calls run together, readers warmed four at a time, and a plain line while it is being written. To be measured on the next run.* For nine people, the report takes five to six minutes after the last check-in to include everyone. This week makes it faster, or shows the lead plainly that it is still being written.

**Week 26. The remaining wording.** *Board and reports part built 1 October (`025c05dc`): every product sentence there is checked, about twenty fixed. The conversation's pronoun check is still to do.* Counts that mix a word and a figure, the board's own sentences, which are built when the board is opened, and the pronoun check in the conversation. All are brought under the automatic check of task 1.6.

---

## Pieces the screens workspace could do at any time, without touching the engine's files

- The board shows each person's plain sentence (`says`) in place of the coloured pill.
- A person with no name reads "a colleague" everywhere on screen.
- The misleading "No patterns have surfaced yet…" is fixed while patterns are off.
- The two sidebar tests that fail without any code change are fixed.
- The screens for weeks 5, 6, 7, 8, 11, 13, 14, 15 and 16 are built, each after its engine week.
