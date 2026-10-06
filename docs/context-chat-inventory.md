# The context chat, everything it does today

Decision 50: there is no separate context chat. Ask Groundwork becomes the one chat for everything,
and nothing the context chat does today may be lost. This is step (a): a complete list of what the
context chat, and the Context page around it, does today, before anything changes.

Every item below says what it does in plain words, where the code is, the rule it keeps, the tests
that cover it, and whether Ask Groundwork already does it.

## 1. The setup conversation itself

The lead (or an org admin) opens a chat about the check-in's setup, not about a person. It works
out what is missing and asks for it in the order it costs most to be without: how long it runs, how
often people check in, what doing well looks like, the measures, who else is in it, what each person
is meant to achieve, and whether there is anything in writing everybody should read.

- **Where.** Route `POST :id/context-chat` in `api/src/modules/grounds/grounds.controller.ts`
  (`contextChat`), served by `GroundsService.contextChat` in `grounds.service.ts` (from line 2473).
  The gap list and the system prompt are built by `contextGaps` and `contextChatPrompt` in
  `api/src/modules/grounds/the-context-chat.ts`.
- **Rule it keeps.** Who may run it: the lead who started the check-in, or an admin in the same
  organisation (`ground.initiatorId !== requestingUserId && !isOrgAdmin` throws). It is not a
  check-in: "nothing said here is anybody's account of anything", never reaches a report, and is
  never compared against what anyone else said. It does not decide: it only proposes, and nothing is
  written until the lead confirms it separately (see item 5). When nothing is missing it says so and
  stops, on purpose, "a setup conversation that will not end teaches people to skip setup."
- **Tests.** `the-context-chat.spec.ts`, `the-context-chat-says-check-in.spec.ts`,
  `the-context-chat-reads-them.spec.ts`, `lead-confirmation-not-skipped.spec.ts`,
  `covering-for-a-lead-means-steering-it.spec.ts`.
- **In Ask Groundwork today:** not at all. `api/src/modules/ask/ask.service.ts` answers a signed-in
  person's own private questions about a check-in they are already in; it does not run a setup
  conversation, does not compute gaps, and has no notion of "what this check-in is missing".

## 2. Working out what is missing (the gaps)

Before it says anything, the chat computes exactly what a check-in still needs: no length, no
rhythm, no stated success, no measures (only for situations where a measure makes sense), fewer than
two people, people with nothing expected of them yet, and nothing in writing that has actually been
read.

- **Where.** `contextGaps()` in `api/src/modules/grounds/the-context-chat.ts` (lines 124-203), fed by
  real numbers `GroundsService.contextChat` pulls from the ground, its objectives, its documents and
  its baseline (lines 2545-2585 of `grounds.service.ts`).
- **Rule it keeps.** A situation that only holds a question (a crisis, a one-off read, a drift, an
  open read) is never asked for measures, because that would tell someone their situation is a
  different shape than it is on the day they can least argue with it (the `WORTH_COUNTING` set). An
  expectation nobody has seen yet is not counted as missing (`perPersonAnyCount`), so the chat does
  not ask again for something it just wrote down and the person has not read.
- **Tests.** `the-context-chat.spec.ts`, `nobody-is-read-against-a-target-they-never-saw.spec.ts`,
  `a-target-nobody-has-defined.spec.ts`.
- **In Ask Groundwork today:** not at all.

## 3. Reading documents people add, and pulling out what they hold

Every open document on the ground (and the lead's own private ones, only for the lead) is read into
the conversation as text, up to what fits in the model's context, with a note about anything left
out. A separate reader pulls structured facts out of a document: a number for one named person, a
number for the whole check-in, a date something is due, and a one-line description of what the
document is.

- **Where.** Document assembly: `openDocuments` query and `whatFitsInTheRoom` /
  `whatTheDocumentsSay` / `tellThemWhatIsMissing` calls in `grounds.service.ts` lines 2533-2607
  (`api/src/modules/grounds/what-the-documents-say.ts`). Structured extraction:
  `api/src/modules/documents/what-a-document-holds.ts`.
- **Rule it keeps.** A document is context, never an account (G24 rule 1 in
  `api/src/modules/documents/a-document-is-context.ts`): nothing pulled from a document may be used
  as evidence that a person holds a position, because that would let anyone win a disagreement by
  uploading a file. Who uploaded it travels with the claim. A judgement about a person in a comments
  column is deliberately not read as a target.
- **Tests.** `what-a-document-holds.spec.ts`, `the-context-page-keeps-its-promises.spec.ts`,
  `documents-isolation.spec.ts`, `a-document-is-read-not-agreed.spec.ts`.
- **In Ask Groundwork today:** not at all. Ask Groundwork does not read ground documents.

## 4. Pulling targets out of documents and attaching them to the right people or goals

When a document holds a number for a named person ("Dayo: Q4 sales, 45,000,000") or a number for the
whole check-in, that is matched to the actual participant on the record (or left unmatched and said
out loud rather than guessed), and offered as a target proposal. A lead can also just say "use the
targets in the delivery plan" mid-conversation and the chat reads them out of the document already
in front of it.

- **Where.** `what-a-document-holds.ts` (extraction shape); matching against real participants
  happens the same way as the paste reader, via `whoThisNameIs` in `grounds.service.ts`; writable
  proposals for named-document targets go through `theMeasuresTheyNamed()` and the `targets` branch
  of `proposalFrom()` in `api/src/modules/grounds/what-the-context-chat-heard.ts` (lines 105-144).
- **Rule it keeps.** A target read out of a document and written without anyone saying yes is "a bar
  nobody set, appearing on a board people are then read against" — still proposed, still confirmed.
  A qualitative target with no number is kept, not refused (`GroundObjective.target` is nullable). An
  unmatched name is never guessed onto the nearest person.
- **Tests.** `a-target-nobody-has-defined.spec.ts`, `what-a-target-assumes.spec.ts`,
  `a-dump-is-many-things.spec.ts` (for the paste path).
- **In Ask Groundwork today:** not at all.

## 5. Saying it back and requiring confirmation before saving (the proposal/confirm split)

The chat never writes anything by itself. `contextChat` only ever returns a `proposal` with a
plain-English `say` sentence ("I will set this to run for twelve weeks"). A second, separate call —
`POST :id/context-chat/confirm` — re-derives the same value from the lead's own words (not from a
field the client sends) and only then writes it. Two guards sit underneath this: a proposed value
has to be traceable to words the lead actually typed (`traceableToWhatTheySaid`), and a greeting or
filler message ("hi", "ok", "thanks") is recognised as having nothing to record
(`nothingToTakeFrom`), so the model cannot manufacture a proposal out of small talk (this is exactly
the bug where the chat's own greeting, "Hi! What's on your mind?", was once offered back as "what
doing well looks like").

- **Where.** Route `POST :id/context-chat/confirm` → `confirmContextProposal` in
  `grounds.controller.ts` (line 623) → `GroundsService.applyContextProposal` in `grounds.service.ts`
  (line 3296). The extraction/validation rules live in
  `api/src/modules/grounds/what-the-context-chat-heard.ts` (`proposalFrom`, `extractionToolFor`,
  `MIN_DAYS`/`MAX_DAYS`/`MIN_SUCCESS`/`MAX_SUCCESS` bounds, refused rather than clamped). The
  traceability guard is `api/src/modules/grounds/nothing-proposed-that-nobody-said.ts`
  (`traceableToWhatTheySaid`, `nothingToTakeFrom`, `aLengthTheyCouldHaveMeant`).
- **Rule it keeps.** "Extraction is confirmed rather than adopted" (G24 rule 4, and decision 12).
  Only the field the open question was about is ever writable — an answer about duration cannot also
  change the cadence, even if it was mentioned in passing. Implausible values (e.g. a check-in
  running for 4,000 days) are refused outright, never silently clamped to the nearest legal value.
  **There is a permission asymmetry worth flagging directly: `contextChat` (the propose half) allows
  the lead or an org admin, but `applyContextProposal` (line 3320) checks `ground.initiatorId !==
  requestingUserId` with no admin fallback at all — "Setting this check-in up is the lead's."** An
  org admin covering for an absent lead can have the conversation but cannot actually confirm and
  save anything from it. No spec file was found that pins this asymmetry down by name, so a rewrite
  that reuses the general "lead or admin" guard here would silently widen who can write to the
  ground.
- **Tests.** `the-context-chat-can-close-what-it-opens.spec.ts`, `lead-confirmation-not-skipped.spec.ts`,
  `setup-can-write-an-expectation.spec.ts`, `setup-writes-an-expectation.spec.ts`.
- **In Ask Groundwork today:** partly. The assistant's own request/confirm shape
  (`api/src/modules/assistant/a-suggestion-you-can-answer.ts`, `nothing-leaves-without-a-yes.spec.ts`)
  already says a request back and waits for a yes before acting — the general mechanism exists — but
  it is not wired to ground setup fields (timeline, cadence, success, targets, per-person
  expectations) at all.

## 6. Reading a "dump" — someone pasting everything at once — as one thing to confirm

If a lead pastes something long (400+ characters) instead of answering the open question one field
at a time, the chat recognises it as a paste rather than an answer, reads it once for everything it
holds (success statement, team-wide numbers, per-person expectations and their numbers, dates,
strategy, ways of working, notes, open decisions, unsettled items, observations about named people,
commitments/to-dos, questions for people, and issues between two named people), and offers it back
as one thing to say yes to, rather than asking eight follow-up questions.

- **Where.** `looksLikeADump()`, `A_DUMP_PROMPT`, `A_DUMP_SCHEMA` in
  `api/src/modules/grounds/a-dump-is-many-things.ts`; consumed by
  `GroundsService.whatAPasteGives` in `grounds.service.ts` (line 3162) and surfaced through
  `contextChat`'s `fromAPaste` branch (line 2685).
- **Rule it keeps.** Same confirmation rule as everything else — nothing is written until the lead
  says yes, and the confirmation re-reads their words rather than a value from the screen. A name
  that matches nobody on the check-in is said out loud, never guessed. An expectation of somebody
  goes down as the lead's, marked unseen until that person reads it.
- **Tests.** `a-dump-is-many-things.spec.ts`, `the-context-chat-takes-what-you-bring.spec.ts`.
- **In Ask Groundwork today:** not at all.

## 7. Hearing a change to something already on the record

If the lead types a correction rather than an answer — "drop the 30-day rule", "the 12m is signed
not collected", "Client C is Hassan's", "that one is decided" — the chat recognises it as a change
request against an existing line, target, or commitment, says back exactly which line it would
change and how, and only changes it once the lead says yes.

- **Where.** `GroundsService.whatTheyWantChanged` (referenced at `grounds.service.ts` line 2705) and
  `GroundsService.makeTheChange` (line 3083), which applies a `{intent, thing}` change to a
  `groundContextItem`, `groundCommitment`, or `groundObjective` row (close/reword/assign/drop).
- **Rule it keeps.** A target can only be dropped by the lead, and only after it is said out loud
  first, "because dropping one takes its counts and its history with it." A change request is
  answered as the whole of that turn even when the model cannot place which line is meant — it never
  gets silently swallowed by whatever gap question was still open underneath it.
- **Tests.** `what-the-lead-wants-changed.spec.ts`.
- **In Ask Groundwork today:** not at all.

## 8. The lead's exact questions for people, and confirming them word for word (decision 34)

A lead can ask for something to be raised with a specific person in their next check-in. Before it
ever reaches that person, the lead is shown the exact sentence Groundwork will ask, drafted by a
model from the lead's own words and the person's first name, and must confirm it — as shown, or
edited into their own words — before it can be asked. Declining leaves the question out entirely.

- **Where.** Routes `GET :id/questions-for-people`, `POST :id/questions-for-people/:itemId/confirm`,
  and (found while reading) `POST :id/questions-for-people/:itemId/decline` in
  `grounds.controller.ts` (lines 428-450+). Served by `GroundsService.questionsForPeople` (line
  4037), `theQuestionsForPeople` (line 4016), `confirmQuestionForPerson` (line 4061),
  `declineQuestionForPerson` (line 4104), and the drafting helper `theExactQuestionFor` (line 3139),
  which calls `api/src/modules/grounds/a-question-asked-word-for-word.ts`.
- **Rule it keeps.** Decision 34 exactly: "the lead sees the exact question as Groundwork will ask
  it, and confirms it, changes it, or leaves it out. Nothing is read into a person's check-in until
  it is confirmed here." Confirming and declining are both strictly lead-only, with no admin
  fallback at all — `confirmQuestionForPerson` and `declineQuestionForPerson` both check only
  `ground.initiatorId !== requestingUserId` (lines 4069 and 4107), which is stricter than every other
  write in this feature (compare item 5, `applyContextProposal`, and item 14, which are also
  lead-only but for the same reason; contrast item 1's `contextChat` and items 9/17, which do allow
  an org admin). Reading the list of questions (`questionsForPeople`, `GET`) is open to lead or org
  admin; only confirming or declining one is lead-only. A question is retired ("left out"), never
  silently deleted, and reopening it clears any prior confirmation so it must be confirmed again.
- **Tests.** `a-question-asked-word-for-word.spec.ts`.
- **In Ask Groundwork today:** not at all. Ask Groundwork has no concept of a lead's question queued
  for another person.

## 9. Notes about a person, always private to the lead (LEAD_ONLY)

The lead can write a private note about a check-in, or about one named person on it. A note about a
named person can never be shared with the check-in — the endpoint refuses that outright rather than
accepting it and hiding it. A note about the whole check-in (not about a person) can be shared with
everyone, one note at a time, by the lead.

- **Where.** Routes `POST :id/lead-context` (`addLeadContext`) and
  `POST :id/lead-context/:noteId/share` (`shareLeadContext`) in `grounds.controller.ts` (lines
  363-377), served by `GroundsService.addLeadContext` (line 4123) and `shareLeadContext` (line
  3828) in `grounds.service.ts`, backed by the `LeadContextNote` table.
- **Rule it keeps.** "A note everyone reads is about the whole check-in, not about one person" — a
  request to share a note that has a `participantId` throws `BadRequestException` rather than
  proceeding. Only the lead, or an admin in the same organisation, may add or share a note. A note is
  never quoted as a claim, and a note about a person is never shown to that person.
- **Tests.** `the-leads-note-reaches-the-lead-alone.spec.ts`,
  `the-leads-words-about-someone-stay-with-the-lead.spec.ts`,
  `a-decision-about-a-person-is-the-leads.spec.ts`.
- **In Ask Groundwork today:** not at all. There is no lead-private-note concept in Ask Groundwork.

## 10. Coaching the lead about a named person, kept as the lead's own read

If the lead tells the chat somebody is struggling, difficult, or "the problem", the conversation is
not shut down and not redirected elsewhere — it asks what the lead has seen, what they have already
tried, and what they want to be different, and records the answer as the lead's own private read of
that person. It is never quoted to that person as a finding and never put into that person's own
check-in.

- **Where.** Rule 2 of `contextChatPrompt()` in `api/src/modules/grounds/the-context-chat.ts` (lines
  305-325) — this is enforced only by the system prompt text, not by a separate code check, beyond
  the fact that whatever gets recorded as "their read" lands as a `LEAD_ONLY` note through the normal
  note-writing path in item 9. This is one of the places where the rule genuinely lives only in the
  prompt.
- **Rule it keeps.** "A judgement is not a fact about somebody and is never recorded as one." A
  judgement ("struggling", "difficult") is different in kind from an expectation ("give her 3,000
  units by December") — see item 11 — and the chat is expected to tell them apart. `readsAsAJudgement()`
  in `what-setup-agreed.ts` is the one place this distinction is actually checked in code, and only
  for the objectives-writing path, not for this coaching path itself.
- **Tests.** No dedicated spec file for the coaching conversation itself was found; `worthRecording`
  and `readsAsAJudgement` are exercised by `setup-can-write-an-expectation.spec.ts` and
  `setup-writes-an-expectation.spec.ts`, which cover the adjacent write-path guard, not the coaching
  turn in isolation.
- **In Ask Groundwork today:** not at all.

## 11. Setting what the lead expects of a named person (an "objective", not an agreement)

The lead can tell the chat what they expect a specific person to do or reach — a number, a date, a
piece of work to own. This is recorded as the lead's own expectation (`authoredBy: 'lead-setup'`),
never as something agreed, and is marked `seenBySubject: false` until that person actually reads it
in their own check-in.

- **Where.** `objectives` branch of `proposalFrom()` in `what-the-context-chat-heard.ts` (lines
  190-227); the write-worthiness check `worthRecording()` and the person-is-not-a-judgement check
  `readsAsAJudgement()` in `api/src/modules/grounds/what-setup-agreed.ts`; the disclosure sentence
  `WHAT_RECORDING_IT_MEANS` (same file, lines 126-130), attached to the prompt in
  `grounds.service.ts` whenever there is more than one party (line 2621).
- **Rule it keeps.** "It is NOT agreement... recording the lead's version as though it were shared
  would close that gap by fiat." A sentence with nothing checkable in it ("do a good job", "be more
  proactive") is refused outright — the bar is deliberately high, and silence is the ordinary answer,
  because the first check-in interview is better at drawing a real expectation out. A description of
  what someone IS ("is struggling with the wholesale accounts") is refused even though it reads as
  checkable, because it is a judgement, not an expectation (see item 10).
- **Tests.** `setup-can-write-an-expectation.spec.ts`, `setup-writes-an-expectation.spec.ts`,
  `a-target-for-somebody-is-not-an-opinion-about-them.spec.ts`,
  `nobody-is-read-against-a-target-they-never-saw.spec.ts`.
- **In Ask Groundwork today:** not at all.

## 12. Which documents are private to the lead

A document has three possible visibilities, not two: `OWN` (private to whoever uploaded it — the
default for every new upload, with no exceptions, including the lead's own files), `OPEN` (everybody
on the ground can read it), and `CLOSED` (the lead only — including an org admin acting with the
lead's eyes, but never the uploader if they are not the lead). Only the uploader can move their own
document between `OWN` and `OPEN`; only the lead can move a document to `CLOSED`; a lead can never
promote someone else's private document to shared. The context chat includes the lead's own `OWN`
documents (because the lead is also the uploader and the only reader of this particular
conversation) plus every `OPEN` document, but no one else's `OWN` document.

- **Where.** `openDocuments` query in `grounds.service.ts` (lines 2533-2540): `OR: [{visibility:
  'OPEN'}, {participant: {userId: requestingUserId}}]`. The three-state model and its read rules are
  in `api/src/modules/documents/who-can-see-a-document.ts` (`canSeeDocument`, `documentWhereFor`,
  `whoCanSeeItInWords`; `DocumentVisibility` enum in `api/prisma/schema.prisma`). Upload defaults to
  `OWN` in `api/src/modules/documents/a-document-is-context.ts` (rule 3,
  `defaultVisibilityForUpload`). Visibility changes: `PATCH grounds/:groundId/documents/:docId/visibility`
  in `documents.controller.ts` → `DocumentsService.setVisibility`. Document names are scrubbed from
  anyone who cannot see the document itself in `api/src/modules/documents/a-private-file-is-not-named.ts`
  — a real fixed bug where a report once named a lead's private file to the whole team by quoting the
  chat's own words back.
- **Rule it keeps.** "A person's own file is not behind a wall FROM THEM. The wall is other people
  reading it." A performance plan dropped into shared context in a hurried first week must be
  recoverable as private — upload defaults to private, on purpose. With the `CONTEXT_ENABLED` flag
  off, every document is treated as `OWN` regardless of its stored column, checked inside the reader
  function itself rather than at each call site, so a flag flip cannot accidentally leak a document
  written `OPEN` while the flag was on.
- **Tests.** `your-own-file-is-not-behind-a-wall-from-you.spec.ts` (grounds),
  `a-private-file-is-not-named.spec.ts`, `closed-is-the-leads-only.spec.ts`,
  `documents-isolation.spec.ts`, `off-is-the-old-product.spec.ts`, `who-can-see-it-in-words.spec.ts`.
- **In Ask Groundwork today:** no. Ask Groundwork does not read ground documents at all yet, so this
  rule has nothing to apply to there.

## 13. Which targets are hidden from whom (`whoSeesTargets`, `THEIR_OWN`)

A check-in has a setting for whether everyone on it can see everyone's numbers, or only their own.
`THEIR_OWN` is the default; a lead or org admin can switch it to `EVERYBODY`. Both the board and the
context chat read this setting before showing anyone a target that is not theirs.

- **Where.** Route `PATCH :id/who-sees-targets` in `grounds.controller.ts` (line 816);
  `aSettingOnlyTheLeadMayChange` guard and the `whoSeesTargets` read/write logic in
  `grounds.service.ts` (around lines 1905-1921, 2252-2262, 4218-4310).
  `default 'THEIR_OWN'` in the Prisma schema.
- **Rule it keeps.** Only the lead of the check-in, or an admin in the same organisation, may change
  it. A participant on a `THEIR_OWN` ground must never be handed numbers that are not theirs — the
  comment records a real incident where this leaked.
- **Tests.** `one-answer-about-whose-numbers-somebody-reads.spec.ts`,
  `one-rule-for-whose-share-is-shown.spec.ts`.
- **In Ask Groundwork today:** confirmed not at all. `whoSeesTargets` is not read anywhere under
  `api/src/modules/ask/` or `api/src/modules/assistant/`; `ask.service.ts`'s own comment admits "the
  check-in chosen is checked here, and is not yet read by the assistant." This is a live gap that
  exists today, independent of any migration: if Ask Groundwork is ever asked about targets, this
  visibility rule is not there yet to stop a colleague's number being shown to somebody it is not
  theirs.

## 14. Who is allowed to use the context chat at all

Only the lead who started the check-in, or an admin in the same organisation, can open the context
chat, add or change context lines, add or share lead notes, or confirm a question for a person.
Participants never get access to it — it is not their tool.

- **Where.** Enforced independently in every one of `contextChat`, `applyContextProposal`,
  `addLeadContext`, `shareLeadContext`, `addContextLine`, `changeContextLine`, `questionsForPeople`,
  `confirmQuestionForPerson`, `stateBaseline` — each repeats the same check:
  `ground.initiatorId !== requestingUserId && !adminsThisOrg(viewer, ground)` throws
  `ForbiddenException`.
- **Rule it keeps.** "An admin in this organisation could release the report and close the check-in
  — the two least reversible acts in the product — and could not write a note or use the context
  chat," which the code comment calls out as a gap that was closed deliberately, so covering for an
  absent lead means being able to steer the check-in, not just end it. A participant is never one of
  the two roles checked, by construction.
- **Tests.** `covering-for-a-lead-means-steering-it.spec.ts`, `managing-only-lead.spec.ts`,
  `an-admin-of-this-org-runs-the-ground.spec.ts`.
- **In Ask Groundwork today:** partly, by a different route. `ask.service.ts` establishes who is
  asking (the signed-in person) and answers only for a check-in "the person runs or takes part in,
  and not one that has ended" — a similar shape of gate, but it has no lead-vs-admin-vs-participant
  distinction because it isn't answering setup questions at all, only the person's own private
  questions about a check-in they're already in.

## 15. What it asks for when setup is thin (the gap list itself, restated)

Restating item 2 as user-facing behaviour: when a check-in has just been created from very little
(the original defect this whole feature was built to fix — "a real Ground 1 run produced a
ninety-day ground from a single answer with no duration, no rhythm and no sense of who was
involved"), the chat's very first message names what is missing and asks for the most important
thing first, rather than a generic greeting — and if the check-in already holds something, it opens
by saying what is already there instead of asking again.

- **Where.** `contextChatPrompt()`'s `holds`/`onRecord` blocks in `the-context-chat.ts` (lines
  216-258), fed by `GroundsService.whatThisCheckInAlreadyHolds` and `whatIsOnThisCheckIn` (called at
  `grounds.service.ts` lines 2625-2627).
- **Rule it keeps.** "OPEN ON THAT, NOT ON A GREETING... never ask for something this list says you
  already have." This was a real defect Hafsah reported (22 September 2026): a lead pasted a whole
  quarter in and the chat opened with "Hello! We're setting up the Groundwork ground...".
- **Tests.** `the-context-chat.spec.ts`.
- **In Ask Groundwork today:** not at all — Ask Groundwork has no "what this check-in already holds"
  opening-line behaviour.

## 16. Setting what success looks like (`GroundBaseline`)

What doing well looks like is stored separately from the brief, versioned, with every past version
kept and a reason recorded whenever it is restated. It is stated by the lead (or org admin) but
readable by anyone on the ground — "the yardstick a person is being read against is the last thing
that should be private from them."

- **Where.** Routes `POST :id/baseline` (`stateBaseline`) and `GET :id/baseline`
  (`baselineHistory`) in `grounds.controller.ts` (lines 641-655); served by
  `GroundsService.stateBaseline` (line 6400) and `baselineHistory` (line 6464). The context chat's
  `success` gap reads and writes this same table (`statedSuccessFor`, `success` proposal kind in
  `what-the-context-chat-heard.ts`).
- **Rule it keeps.** A restatement requires a reason once a prior version exists — "the reason is the
  thing that makes the change legible later." Nothing is overwritten; each restatement is a new
  version, and unspecified fields (e.g. conditions) are carried forward rather than silently cleared.
  Baseline history is readable by any participant, the lead, or an org admin — not lead-only, unlike
  most other context-chat output.
- **Tests.** Not confirmed by spec-file name in this pass; `a-bar-nobody-set-is-a-bar-nobody-agreed.spec.ts`
  and `a-standard-set-afterwards-is-not-a-standard.spec.ts` are the closest-named files and likely
  cover baseline behaviour, but their content was not read to confirm.
- **In Ask Groundwork today:** not at all.

## 17. Typing a context line directly, without the chat (the door for when there is no chat)

Besides the conversation, a lead (or org admin) can type one line directly onto the Context page:
a strategy note, a way of working, a decision, something unsettled, or a general note. This exists
because a check-in with the chat switched off would otherwise show five empty buckets each saying
"say it in the conversation above" with no conversation there. A line about a named person can never
be created this way — it is refused outright, not silently filed as private.

- **Where.** Routes `POST :id/context` (`addContextLine`) and `PATCH :id/context/:itemId`
  (`changeContextLine`) in `grounds.controller.ts` (lines 402-421); served by
  `GroundsService.addContextLine` (line 3922) and `changeContextLine` (line 3969). Sharing rules in
  `api/src/modules/grounds/what-this-check-in-knows.ts` (`ABOUT_SOMEBODY`, `mayBeShared`,
  `WHY_A_LINE_ABOUT_SOMEBODY_STAYS_YOURS`).
- **Rule it keeps.** Only `STRATEGY`, `WAY_OF_WORKING`, `DECISION`, `UNSETTLED`, `NOTE` kinds may be
  typed this way — `ABOUT_A_PERSON` and `QUESTION_FOR_PERSON` kinds are refused with
  `WHY_A_LINE_ABOUT_SOMEBODY_STAYS_YOURS`, because "a line about a person cannot be created here at
  all... it belongs to the conversation that can ask what it rests on." A line about a person can
  never be shared with `EVERYONE`, whoever asks, even through the change endpoint. A retired line is
  closed (`closedAt`), never deleted — "a decision that was made is not a decision that never
  existed." A reworded question loses its prior confirmation and must be confirmed again (item 8).
- **Tests.** `a-line-is-changed-by-talking-about-it.spec.tsx` (client), and coverage inferred from
  `nothing-gets-lost-in-the-merge.spec.ts` mentioning "the guard fired for every document and
  lead-context call."
- **In Ask Groundwork today:** not at all.

## 18. Bank and card numbers are hidden everywhere the chat touches text

Before any document text is stored, before any message history reaches the model, and before any
typed line or note is saved, account numbers, card numbers (Luhn-checked), IBANs, sort codes,
routing numbers and SWIFT/BIC codes are replaced with a labelled placeholder (`[account number
hidden]`, etc). This applies to documents, to what the lead types directly into a context line or
note, and — per decision 35 — to numbers typed into a check-in message or the setup chat itself.

- **Where.** `api/src/modules/documents/bank-details-are-never-kept.ts` (the detector); called via
  `withoutBankDetails` / `withoutBankDetailsInEachTurn` at the top of `contextChat` (line 2480),
  inside `addContextLine` (line 3927), `changeContextLine` (line 3975), `addLeadContext` (line
  4124), and `confirmQuestionForPerson` (line 4082).
- **Rule it keeps.** Decision 35: "The same code as for documents hides them, before anything is
  stored and before any model call. Where a quote shows the message, it says a number was hidden.
  This is protection, not changing someone's words." Deliberately narrow: an ordinary figure (an
  amount, a date, a phone number, a short reference) is never hidden.
- **Tests.** `bank-details-are-never-kept.spec.ts`, `bank-details-are-what-it-left-out.spec.ts`,
  `bank-details-never-reach-the-record-or-the-model.spec.ts`.
- **In Ask Groundwork today:** unclear — `withoutBankDetails` was not confirmed as called anywhere
  under `api/src/modules/ask/` or `api/src/modules/assistant/` in this pass. Given Ask Groundwork
  already takes free-text questions from people, this is worth checking directly before treating it
  as covered.

## 19. Setup sign-offs (found while reading the neighbouring routes)

Separate from the context chat but on the same Context/setup surface: each person can mark their own
setup questions as signed off, and only ever their own — `GET :id/setup-sign-offs` returns only the
requesting user's marks, never anyone else's.

- **Where.** Routes `GET :id/setup-sign-offs`, `POST :id/setup-sign-offs/:step`,
  `DELETE :id/setup-sign-offs/:step` in `grounds.controller.ts` (lines 562-579); served by
  `GroundsService.setupSignOffs` (line 5368) and neighbours.
- **Rule it keeps.** "A person's own marks against the setup questions. Their own only: this never
  returns anybody [else's]." Comment directly above the route in the controller.
- **Tests.** Not identified by name in this pass.
- **In Ask Groundwork today:** not at all; unrelated surface, listed here only because it lives next
  to the context-chat routes on the same controller and the same Context page.

## 20. What the client's Context page actually calls (cross-reference only)

Confirmed by reading `client/src/api/grounds.ts` and `client/src/components/gw/ContextChat.tsx`,
`ContextPage.tsx`, `ExpectationsPanel.tsx` (the Context page lives under `client/src/components/gw/`,
not `client/src/pages/`, despite the task's pointer — noted as a correction). The client calls:
`POST /grounds/:id/context-chat`, `POST /grounds/:id/context-chat/confirm`,
`POST /grounds/:id/context`, `PATCH /grounds/:id/context/:itemId`,
`POST /grounds/:id/lead-context/:noteId/share`, `POST/GET /grounds/:id/baseline`,
`GET/POST /grounds/:id/baseline-entries` and `/baseline-entries/candidates`. This confirms every
route named in items 1-17 is actually reachable from the screen a lead uses, not dead code.

## 21. Other mechanics found while reading, worth knowing before anything is rebuilt

A few smaller pieces that do not deserve their own numbered privacy/confirmation rule but would be
easy to silently drop in a rewrite, since each one exists only because a specific real defect forced
it in:

- **A document is read three separate times, for three separate purposes.** `extractContent` pulls
  the raw, bank-scrubbed text; `assessDocument` produces a short "what this suggests / what we will
  do with it" card; `whatItHolds` pulls the structured numbers and dates (item 4). An agreement-type
  ground has a fourth, narrower read (`readTheAgreementInIt`) that extracts contract terms into a
  separate `Agreements` table entirely. (`api/src/modules/documents/documents.service.ts`.)
- **Name matching against the roster has at least three separate implementations** that all have to
  stay in agreement: `whoTheyMeant` (objectives), `whoThisNameIs` (document reads and the paste
  reader), and inline matching inside the paste-writing path in `grounds.service.ts`. All three
  refuse to guess when a name is ambiguous — two people both called "David" matches neither — rather
  than picking the nearest person. This is deliberate and repeated, but it is three places to keep
  right rather than one.
- **A confirmed paste is recognised and never written twice.** A hash of the trimmed pasted text is
  kept (`GroundPaste`), and a paste that has already been fully confirmed is refused a second write
  ("That is already on the record, exactly as you sent it"). Separately, a fuzzy, stemmed
  word-overlap check (`theSameMeasure`) recognises the same measure reworded slightly between two
  reads of a similar paste ("signed" vs "signed sales"), so a re-paste does not double the board.
  Both mechanisms would need to survive a rewrite for a lead who pastes something twice, by accident
  or on purpose, not to see it duplicated.
- **Pronoun resolution reads only the last message for content**, and earlier turns only to resolve
  who "her"/"him"/"them" refers to (`asContextThenTheSentence`, `WHO_AND_WHAT_THEY_EXPECT` in
  `what-the-context-chat-heard.ts`). This exists because a real run once had the extractor return the
  literal word "her" as a person's name, matched nobody, and silently dropped a target the lead had
  just been asked for.
- **Several of the prompt's own rules have no code-level backstop at all**, beyond the traceability
  and refusal checks already covered in item 5 — for instance "if a lead says somebody is
  struggling, coach them rather than deflecting" (item 10) and "never tell them individual targets
  cannot be set here" are pure prompt instructions, evidenced only by a code comment describing the
  live incident where the old prompt got both wrong. A prompt rewrite or model swap could silently
  regress either with nothing in the test suite to catch it.

---

## Summary table

| # | Item | Where (primary file) | Covered by tests | Already in Ask Groundwork |
|---|---|---|---|---|
| 1 | The setup conversation itself | grounds.service.ts `contextChat`; the-context-chat.ts | Yes | No |
| 2 | Working out what is missing | the-context-chat.ts `contextGaps` | Yes | No |
| 3 | Reading documents, pulling out facts | what-a-document-holds.ts; what-the-documents-say.ts | Yes | No |
| 4 | Targets out of documents, matched to people | what-the-context-chat-heard.ts `proposalFrom` | Partly | No |
| 5 | Say-back and confirm before saving | grounds.service.ts `applyContextProposal`; nothing-proposed-that-nobody-said.ts | Yes | Partly (mechanism exists, not wired to setup) |
| 6 | Reading a whole "dump" at once | a-dump-is-many-things.ts | Yes | No |
| 7 | Hearing a change to something already recorded | grounds.service.ts `whatTheyWantChanged`/`makeTheChange` | Yes | No |
| 8 | Exact question for a person, confirmed (decision 34) | a-question-asked-word-for-word.ts; grounds.service.ts `confirmQuestionForPerson` | Yes | Yes, as shown and with the lead's own changed wording (piece 2 point 1; piece 3 point 3) |
| 9 | Private lead notes, LEAD_ONLY, never shared if about a person | grounds.service.ts `addLeadContext`/`shareLeadContext` | Yes | Yes, adding and sharing (piece 2 point 1; piece 3 point 2) |
| 10 | Coaching the lead about a named person, kept private | the-context-chat.ts prompt rule 2 (prompt-only) | No dedicated spec found | No |
| 11 | Setting an expectation of a named person | what-setup-agreed.ts; what-the-context-chat-heard.ts | Yes | No |
| 12 | Documents private to the lead | grounds.service.ts `openDocuments` query; a-document-is-context.ts | Yes | No |
| 13 | Targets hidden from whom (whoSeesTargets) | grounds.service.ts (multiple) | Yes | Unclear/not found |
| 14 | Who may use it (lead/admin, never participant) | repeated guard in grounds.service.ts | Yes | Partly (different gate, same shape) |
| 15 | Opening on what's already there, not a greeting | the-context-chat.ts prompt | Yes | No |
| 16 | Setting success (GroundBaseline), versioned | grounds.service.ts `stateBaseline`/`baselineHistory` | Not confirmed by name | No |
| 17 | Typing a context line directly (door with no chat) | grounds.service.ts `addContextLine`/`changeContextLine` | Yes | Yes, adding and changing (piece 2 point 1; piece 3 point 2) |
| 18 | Bank/card details hidden everywhere | bank-details-are-never-kept.ts | Yes | Unclear/not found |
| 19 | Setup sign-offs (own only) | grounds.service.ts `setupSignOffs` | Not identified by name | No (unrelated surface) |
| 20 | Client Context page route cross-reference | client/src/api/grounds.ts | n/a | n/a |
| 21 | Other mechanics (document triple-read, name matching x3, paste/hash dedup, prompt-only rules) | multiple | Mixed | No |

## Comparison, item by item

**Step (b), piece 1 (decided 29 September, decision 50).** Ask Groundwork now has an `add_context`
lane (`api/src/modules/assistant/the-router-is-deterministic.ts`, dispatched in
`AssistantService.answer`/`addContext`, `api/src/modules/assistant/assistant.service.ts`). It does
not reimplement anything the context chat does: when the message is about a check-in's context and
one can be resolved, the lane calls `GroundsService.contextChat` for the propose half and
`GroundsService.applyContextProposal` for the confirm half - the exact same methods
`POST :id/context-chat` and `POST :id/context-chat/confirm` still call, unchanged. **The old routes
keep working, unchanged, and are still the only way to reach items 8, 9, 17 and 19 below.**

How the two halves fit onto Ask Groundwork's own request/confirm shape (item 5): the propose half's
`proposal` is parked as an `AssistantProposal` of kind `context`, carrying `{groundId, said, history}`
in its payload; a `yes` through `POST /ask/answer` re-sends that stored `said` and `history` into
`applyContextProposal`, never a value read from the client - the same guarantee item 5 already
names. An ambiguous "which check-in" (no `groundId` chosen and more than one candidate, and the
message does not name one) parks a proposal of kind `which_context_check_in` instead, answered by
naming one rather than by yes or no, the same way a document proposal already is.

**Proven, with a new test at the Ask Groundwork boundary** (see
`api/src/modules/assistant/add-context-is-the-context-chat.spec.ts`):

- **Item 14, who may use it, AND THE TEST THE INVENTORY SAID WAS MISSING.** The lane is reached only
  by the lead who runs the check-in or an admin of the same organisation - checked with `runsIt`, the
  shared function behind `contextChat`'s own guard, not a second copy of "lead or admin". An admin of
  a *different* organisation, and a participant who is neither the lead nor an admin, never reach the
  setup conversation at all; their message gets Ask Groundwork's ordinary answer.
- **Item 5, the asymmetry, kept exactly as it is rather than smoothed away.** `resolveParkedContext`
  calls `applyContextProposal` un-widened: an admin can have the whole conversation, get the proposal
  said back to them, say yes - and still be refused at the write, honestly (the error is returned as
  the reply, and the proposal is marked `DROPPED` rather than silently vanishing), not by a shared
  "lead or admin" guard quietly granting them a write item 5 says they must not have. This is the test
  item 5's note said no spec file pinned down by name.
- **Item 2, questions stay private, decided for this lane specifically.** The old context chat keeps
  no history server-side at all - it is stateless, and the client holds it. Ask Groundwork *does* keep
  a private history of everything else a person asks it (`AssistantTurn`), so the choice item 2 asks
  for had to be made rather than inherited: **nothing from the `add_context` lane is written to
  `AssistantTurn`** (`AssistantService.respond` skips `remember` whenever `reply.lane === 'add_context'`).
  This keeps decision 50's own wording, "the context lane's history is stored where the context chat
  stores it today" - which is nowhere - rather than quietly starting a transcript of check-in setup
  talk inside a person's private Ask Groundwork questions, which nobody decided to do. The only state
  this lane keeps between turns is what a still-open `AssistantProposal` payload carries, cleared once
  it resolves.
- **Items 1, 3, 15 (the setup conversation itself; nobody but the lead/admin gets it; opens on what is
  already there, not a greeting).** Proven for the one turn this lane sends: `contextChat` is called
  with exactly the ground and the words that produced it, and everything the prompt itself does
  (opening on what is already on record, refusing to ask again for something unseen, and so on) is
  unchanged because it is the same function - see `the-context-chat.spec.ts` for what it does with
  that input.
- **Items 4, 6, 7, 10, 11, 12, 13, 16, 18 (targets from documents, reading a dump, hearing a change,
  coaching the lead, setting an expectation, private documents, hidden targets, stating success, bank
  details).** All of these live *inside* `contextChat`/`applyContextProposal`, so a message routed to
  this lane gets exactly their existing behaviour, proven by the existing specs those functions
  already have (`what-a-document-holds.spec.ts`, `a-dump-is-many-things.spec.ts`,
  `what-the-lead-wants-changed.spec.ts`, `setup-can-write-an-expectation.spec.ts`,
  `your-own-file-is-not-behind-a-wall-from-you.spec.ts`,
  `one-answer-about-whose-numbers-somebody-reads.spec.ts`,
  `a-bar-nobody-set-is-a-bar-nobody-agreed.spec.ts`, `bank-details-are-never-kept.spec.ts` and
  neighbours) - nothing here re-tests them, because nothing here re-implements them. **Not yet proven
  end-to-end through Ask Groundwork's own turn**, because that would need the full multi-gap
  conversation (several turns, several `groundId`-free follow-up answers) wired through the panel,
  which is client work outside this piece's scope (this piece touches only `api/`).

**Step (b), piece 2, point 1 (30 September 2026). Items 8, 9 and 17, each through the exact function
the old route calls, never a copy:**

- **Item 17, typing a context line directly with no chat.** A new router lane, `context_line`,
  anchored on the whole message ("decision: we will drop the pilot", "strategy: …", "way of working:
  …", "unsettled: …", "context note: …" - `docs/prototype`'s own five kinds, parsed in
  `a-line-or-a-note-typed-in-chat.ts`). The lane says the line back, kind and all, as an
  `AssistantProposal` of kind `context_line`, and only a yes calls `GroundsService.addContextLine` -
  the exact function `POST :id/context` still calls, so the refusal of a line about a named person and
  the sharing rules on each kind are its rule, not a second copy. See
  `AssistantService.addContextLineByChat`/`proposeContextLine`/`resolveParkedContextLine`.
- **Item 9, the lead's private notes.** A new lane, `lead_note`, on the word "private"/"privately" (a
  bare "note:" is left ambiguous with the shared context note above and routes nowhere, rather than
  being guessed onto either). A note naming somebody ("private note about Ben: …") is matched against
  the check-in's own roster and refused, out loud, rather than guessed, if nobody or more than one
  person could be meant - the same refusal-to-guess discipline as items 4 and 6. The proposal always
  carries `audience: 'LEAD_ONLY'` into `GroundsService.addLeadContext`, so the one rule this item exists
  to keep - a note about a named person can never be shared - is enforced by `addLeadContext` itself,
  not re-implemented here; the chat has no way to ask for `EVERYONE` on a note at all. See
  `addLeadNoteByChat`/`proposeLeadNote`/`resolveParkedLeadNote`.
- **Item 8, the lead's exact question for a person (decision 34).** A new lane, `questions_for_people`,
  lists what `GroundsService.questionsForPeople` already has waiting (reading is open to the lead or an
  org admin, as before), with the exact sentence on each. "Confirm the question for Ben" or "leave out
  the question for Ben" is said back as a proposal, and only a yes calls
  `confirmQuestionForPerson`/`declineQuestionForPerson` - the same lead-only routes the old card's own
  buttons call, with no admin fallback, proven the same way item 5 already is: an admin can list the
  questions and hear one said back, and is still refused, honestly, at the confirm step (see the test
  "the asymmetry is honest, not smoothed" in `items-8-9-17-through-ask-groundwork.spec.ts`). Confirming
  "as shown" works; confirming with the lead's own changed wording, in one turn, does not yet - that
  would need the lane to accept a longer message after naming the person, which is real remaining work,
  not something this piece claims is closed.
- **All three keep item 2's rule.** Nothing from `context_line`, `lead_note` or `questions_for_people`
  is written to the person's ordinary Ask Groundwork history (`AssistantTurn`) - the same treatment as
  `add_context` itself, now named in one place, `SETUP_LANES`, in `assistant.service.ts`.
- **The "which check-in" mechanism is shared, not copied.** All four setup doors that need a ground
  chosen park the same `which_context_check_in` proposal kind, now carrying a `purpose` field so the
  right door resumes once the lead names one; a parked row from before this piece, with no `purpose` at
  all, still reads as `'setup'` and resumes the old conversation exactly as it did.
- Proven in `api/src/modules/assistant/items-8-9-17-through-ask-groundwork.spec.ts`.

**Step (b), piece 2, point 2 (30 September 2026). A multi-turn setup conversation continues.** The
defect the task named directly: `runContextChat` sent `contextChat` a fresh, one-message history on
every turn, so a bare answer with nothing else in it ("twelve weeks") - exactly how somebody answers
the SECOND question of a setup conversation - was read with no memory of the question it was answering.
Fixed without a schema change, by parking the turns so far as their own `AssistantProposal` kind,
`context_turn`, carrying `{ groundId, history }` - distinct from the `context` kind (item 5), which is
a concrete value waiting for a yes/no. `context_turn` is not: the next message, whatever it is, is fed
back into `contextChat` as the next turn, the same way the old, client-held conversation always sent
its whole history. Handled before the yes/no reading in `resolveParked`, the same as `document` and
`which_context_check_in` already are, for the same reason - its question is not a yes/no one. Each
continuation supersedes the row before it (marked `ACCEPTED`), so exactly one `context_turn` is ever
open for a person at a time, the same "one open question" invariant every other parked kind here keeps.
Once `contextChat` returns a concrete proposal, or says there is nothing left to ask (`done` with no
proposal), nothing further is parked - an unrelated message right after does not get swallowed into a
finished setup conversation. Proven with a three-turn exchange (still gathering, still gathering, then
a concrete proposal, with the whole history reaching `contextChat` on the third call) in
`add-context-is-the-context-chat.spec.ts`. **Known limitation, not claimed as closed:** a message that
is not remotely an answer to the open gap - the lead asking about something else entirely mid-setup -
is still fed into `contextChat` as though it were one, because nothing here can tell the two apart
generically; this is the same trust the old, stateless, client-held conversation always placed in
`contextChat`'s own prompt to handle a genuine digression (see item 15's "answer them before you ask"
rule), not a new risk this piece introduces.

**Step (b), piece 2, step (c) (30 September 2026). The live proof.** A new, local-only script,
`api/journey/context-chat-equivalence.ts` (committed, with a `.gitignore` exception alongside the
other named-exception journey scripts), creates two fresh check-ins with the same lead and the same
colleague, puts the same setup message, the same long paste, the same typed context line, the same
private note and the same document through the old routes on one and through Ask Groundwork on the
other, confirms Ben's exact question the same way on both, and then reads both check-ins straight out
of Postgres - never through either API's own GET routes, which could render two different rows the
same way by accident - to compare, item by item: the targets a paste set (owner, number), the context
lines kept (kind, text, audience), the lead's private note, the confirmed exact question, the
document's visibility, and the check-in's who-sees-targets setting. It refuses to run against anything
but a local database and a local API. **Not run as part of this piece** - the local API this checkout
would hit is running a scenario suite (`npm run build`/starting or stopping it was off limits here) -
so this is the script only; Hafsah runs it once that finishes and reads its plain-sentence output.

**Item 19, setup sign-offs.** Still not reachable through Ask Groundwork, and still not meant to be:
re-reading the inventory's own item 19, it is "a person's own marks against the setup questions" - a
per-person acknowledgement, not a write to the check-in's context - and it lives next to these routes
on the same controller only because they share a screen, not because decision 50's five bullets (which
list "add or change context", "a target for one person", "a document", "who can add context",
"questions asked") name it. Nothing here changes that reading.

**Known, deliberate narrowing of what routes to the lane in this piece.** The router's `add_context`
patterns are narrow on purpose (word "context", explicit "setting up context", "what is missing from
this check-in") and do not recognise every phrasing a lead might use for duration, cadence or success
on its own - the FIRST message of a setup conversation still has to name "context" or the check-in
somehow, because nothing has opened yet for a bare answer to continue. **Piece 2, point 2 (above)
closes the gap this paragraph used to describe**: once that first message has opened a setup
conversation, a bare "twelve weeks" on the very next message is no longer read as a fresh,
contextless question - it is carried forward as the answer to whichever gap `contextChat` just asked
about, through the `context_turn` proposal. What is still real remaining work is the FIRST message of
a conversation that has not opened yet ("twelve weeks", said cold, with nothing to link it to any
check-in) - that one genuinely has nothing to route on, the same way it would mean nothing typed cold
into any other chat.

**Step (b), piece 3 (30 September 2026). Wording fixed, and items 8, 9 and 17 finished.**

1. **The say-back sentences are rewritten as full sentences, never clipped or colon-joined**, in
   `assistant.service.ts`: adding a line now says `Shall I add "we will drop the pilot" to this
   check-in's context as a decision?`; a private note says `Shall I keep "keep an eye on Ben's
   workload" as a private note that only you can see?`; confirming a question says `Groundwork will
   ask Ben, word for word, "How is the Lagos pitch going?" in Ben's next check-in. Shall I send it?`;
   leaving one out says `Shall I leave out the question for Ben, "How is the Lagos pitch going?"?`;
   and the "which one did you mean" refusal on an ambiguous name reads `I cannot tell which question
   you mean. The people waiting are Ben, Ada.` rather than the old `Waiting: Ben, Ada.` Proven in
   `decision-50-piece-3-through-ask-groundwork.spec.ts`, "point 1".
2. **`shareLeadContext` and `changeContextLine`, each through the exact function the old route calls.**
   - **`shareLeadContext` (item 9's other half).** A new command, "share the note ..." (matched in the
     `lead_note` lane, alongside its existing "private note:" pattern), lists only the lead's own notes
     about the whole check-in (`participantId: null`) - a note about a named person is never even read
     into the list, so the chat never relies on `shareLeadContext`'s own refusal to catch a guess it
     should not have offered in the first place. The matched note is said back
     (`Shall I share "..." with everybody on this check-in?`) and only a yes calls
     `GroundsService.shareLeadContext` - the same function the old Context and resources page's own
     share button calls. See `shareLeadNoteByChat`/`resolveParkedShareLeadNote`.
   - **`changeContextLine` (item 17's other half).** A new command family in the `context_line` lane -
     "reword the line 'X' to 'Y'", "share the line 'X'", "make the line 'X' private", "retire the line
     'X'" - reads only the lines this same door can create (`STRATEGY`/`WAY_OF_WORKING`/`DECISION`/
     `UNSETTLED`/`NOTE`, `closedAt: null`), so a line about a named person has no way in through this
     lane, the same as when it is first typed. The matched line and the change are said back before
     anything happens, and only a yes calls `GroundsService.changeContextLine` - the same function the
     old page's own edit/share/retire controls call, so the "a line about a person can never be shared"
     rule (`mayBeShared`, inventory item 17) is `changeContextLine`'s own, not a copy of it here. See
     `manageContextLineByChat`/`resolveParkedChangeContextLine`.
   - Both are new `AssistantProposal` kinds, `share_lead_note` and `change_context_line`, dispatched in
     `resolveParked` the same way every other kind here is, and both are in `SETUP_LANES`'s effect
     already (they park under the existing `lead_note`/`context_line` lanes, so item 2's rule - nothing
     from a setup door reaches `AssistantTurn` - already covers them without a separate list).
   - Fragment matching never guesses: an unquoted "retire the line" with more than one open line lists
     what is open and asks for enough of its own words, the same refusal-to-guess discipline as items 4,
     6 and 9's own name matching.
3. **Confirming the lead's exact question with their own changed wording (decision 34), the item 8 gap
   piece 2 named as not yet closed.** A new pattern in the `questions_for_people` lane, `ask NAME
   "..." instead`, reads the lead's new sentence, says it back in the same "Groundwork will ask ...
   word for word ..." sentence used for confirming as shown, and only a yes calls the very same
   `confirmQuestionForPerson` - now passing the lead's new wording as `exactQuestion`, the same field
   the old Context and resources page's own "edit and confirm" flow already used
   (`confirmQuestionForPerson`'s own `dto.exactQuestion` was there all along; nothing about the
   function changed). Confirming "as shown", with no reword, still sends no `exactQuestion` and behaves
   exactly as piece 2 left it.
   Proven in `decision-50-piece-3-through-ask-groundwork.spec.ts`, "point 3".
4. **A router collision, found and fixed while wiring "share the note".** The `add_a_document` lane's
   own word list included bare `notes?`, so "share the note ..." was being read as adding a document,
   before `lead_note`'s new pattern ever got a turn - `add_a_document` sits earlier in the router's
   ordered list. Fixed by narrowing that word to plural `notes` only (a document like "the meeting
   notes" still routes to `add_a_document`; a single private or shared "note" no longer collides with
   it). No existing test named a singular "note" case for `add_a_document`, and the full `assistant` and
   `grounds` suites pass with the change (`api/src/modules/assistant/the-router-is-deterministic.ts`).

**What is left.** Nothing in the router or the write paths - `add-context-is-the-context-chat.spec.ts`,
`items-8-9-17-through-ask-groundwork.spec.ts` and the new
`decision-50-piece-3-through-ask-groundwork.spec.ts` between them now exercise every item this
inventory names as reachable through Ask Groundwork at all (1, 2, 3 (inside `contextChat`), 5, 8, 9, 14,
17 and the "which check-in" mechanism), each through the exact function its old route calls.

**Step (b), piece 2, step (c) - RUN (30 September 2026).** `api/journey/context-chat-equivalence.ts`
ran end to end against the local API (build 5cdedcd0) and `gw_pw9_1786222102`. The first two runs
found real script faults, not product differences - fixed, and left in the file's own comments so the
next person does not repeat them:

- The two grounds were created with `timelineDays`/`cadence` already set, which marks those gaps
  closed (`timelineStated`/`cadenceStated`, `grounds.service.ts` lines 580-581) before the setup turns
  ever ran, so turns written to answer duration then cadence landed on whatever gap actually was open
  instead, differently between runs. Fixed by leaving both unset at creation.
- `waitingQuestionByName`, this script's own helper, matched a colleague's first name against the
  served card's FULL name (`theNameWeUseFor`) with `===` rather than a substring, so it silently found
  nobody and the confirm/decline calls for Ben, Chidi and the admin-refusal test never ran on the old
  route at all - every one of them stayed "waiting" and the admin test printed nothing. Fixed to match
  by substring, the same way the product's own `findByName` (`assistant.service.ts`) does.
- The two doors were sent two different sentences for the same setup turn: the old route's history
  carried the bare words, Ask Groundwork's message carried the same words with an extra "the context
  for our check-in:" opener stitched on the front, needed only to fire the router - and
  `runContextChat` hands the whole message, opener included, to `contextChat` as the lead's own words.
  Two different sentences reaching the same extractor is not a product difference. Fixed by wrapping
  every setup turn and the paste in the identical opener text (`setup()`/`asContext()`) on both sides.

**The result, after those three fixes (full output kept below):** every item this inventory can check
without a model in the loop - the target a paste sets, `whoSeesTargets`, the three lines typed directly
(kind, text, audience, retired), the lead's private notes (shared and still-private), the refusal to
ever share a note about a named person, the document's content (bank detail hidden) and visibility, the
admin asymmetry's refusal message, and what the setup conversation said back for duration and cadence -
matched **word for word** between the old routes and Ask Groundwork. Decision 34's own promise (a
person either gets no question, a waiting one, or a confirmed one, and who runs the check-in decides
that, nobody else) held for Ben, Chidi and Femi alike; the exact SENTENCE each one reads was compared
too, and is shown below, but is not itself part of what MATCH means for that row, for the reason under
"open questions" below.

Two things are still open, described exactly rather than patched around, because they touch how a
model in the loop behaves rather than a line the router or a service misapplied:

1. **A success statement said properly was kept differently.** Same literal input on both doors
   (`Good means every pipeline stage has an owner, the weekly numbers are posted before Friday close,
   and nothing sits unowned for more than two days.`). The old route recorded it with the leading
   "Good means" kept; Ask Groundwork recorded it with "Good means" trimmed off the front (see the
   output below). Both are the lead's own words, in order, so nothing here was invented - the
   extraction model chose a different starting point for the quote each time it ran. `proposalFrom`
   ("success" branch, `what-the-context-chat-heard.ts`) just takes whatever `heard.success` the model
   returned and stores it - this is the model's own read of where the sentence starts, once, not a
   difference in what either door does with it afterwards.
2. **A success statement too short to record was refused on one door and not the other.** Same literal
   input on both doors (`Setting up context for our check-in: Good.`). The old route's PROPOSE call
   returned nothing to confirm (as Ask Groundwork's did too), and this script's own old-route driver
   still called `/context-chat/confirm` anyway - which re-derives from the words independently
   (`applyContextProposal` never trusts what propose said) and, on its own separate model call, read a
   short enough `heard.success` to trigger the length refusal. Ask Groundwork's driver only ever says
   "yes" when a proposal was actually offered - the same as a real lead only ever presses a button that
   is on the screen - so it never reached that second, independent extraction at all for this turn.
   This is not a bug in either door: `contextChat` (propose) and `applyContextProposal` (confirm) are
   two separate model calls by design (item 5, "extraction is confirmed rather than adopted"), so they
   are not guaranteed to agree with each other on a borderline input, and a script that always presses
   confirm regardless of what propose showed is testing a lead who clicks a button that was not there.
   Left open rather than forced: a fair, deterministic version of this particular test would need an
   input where PROPOSE itself offers a "success" proposal that CONFIRM then independently refuses for
   length, which this input does not reliably produce given the model is free to read "Good." as
   nothing at all on either call.

**The full comparison output**, the third and passing run (ground A `d891ed3f-3aeb-4c8f-82c3-7450115f93d9`,
ground B `3b1317cd-587a-4a06-bc0d-c790cfc8edab`):

```
- Targets set for a named person (owner, number), hidden from others by default
  MATCH (1): for a named person "Q4 sales" = 45000000

- Who sees targets on the check-in (default THEIR_OWN, unchanged by any of this)
  MATCH: THEIR_OWN

- Context lines typed directly (item 17): kind, text, audience, and whether retired
  MATCH (3): DECISION: "we will drop the small clients pilot" (EVERYONE, RETIRED) | STRATEGY: "we will focus on retention across existing accounts" (EVERYONE) | UNSETTLED: "who owns the marketing budget for next quarter" (EVERYONE)

- Context lines read out of the paste (item 6): by kind only - wording is the model's own
  MISMATCH on kind counts (old {"UNSETTLED":1,"NOTE":1}, ask groundwork {"UNSETTLED":1}). Wording, which the model draws from the paste independently on each side:
    old route:      UNSETTLED: "The launch date is still moving around." | NOTE: "The Lagos pitch is our biggest open item this quarter."
    ask groundwork: UNSETTLED: "The launch date is still moving around while marketing decides on the campaign name."

- The lead's private notes: about the whole check-in (shared) and about Ben (still private)
  MATCH (2): "keep an eye on Ben's workload this month" (EVERYONE, about the whole check-in) | "struggling with the pitch deck this month" (LEAD_ONLY, about somebody named)

- A note about a named person can never be shared (the refusal, word for word)
  MATCH: A note everyone reads is about the whole check-in, not about one person. To say what you expect of somebody, say it in your own check-in - it is published with your name on it.

- Ben's exact question, confirmed as shown
  MATCH on state (confirmed). The model's own wording, which may legitimately differ between the two doors:
    old route:      "How is the Lagos pitch going?" (confirmed)
    ask groundwork: "How is the Lagos pitch going?" (confirmed)

- Chidi's exact question, confirmed with the lead's changed wording
  MATCH on state (confirmed). The model's own wording, which may legitimately differ between the two doors:
    old route:      "Is the renewals forecast still on track for Q1?" (confirmed)
    ask groundwork: "Is the renewals forecast still on track for Q1?" (confirmed)

- Femi's question, still waiting - an admin who is not the lead could not confirm it
  MATCH on state (waiting). The model's own wording, which may legitimately differ between the two doors:
    old route:      "What is blocking your onboarding checklist right now?" (waiting)
    ask groundwork: "What is blocking the onboarding checklist right now?" (waiting)

- An admin who is not the lead is refused at the confirm step (the asymmetry, word for word)
  MATCH: Only the person who runs this check-in can confirm a question for somebody on it.

- The document's content: the target is kept, the bank detail is hidden
  MATCH: Chidi: Q1 renewals target is 20,000,000. Account number: [account number hidden] for payouts.

- The document's visibility (private to the lead by default)
  MATCH: OWN

- The setup conversation: what it said back for the duration
  MATCH: I will set this to run for 12 weeks.

- The setup conversation: what it said back for the cadence
  MATCH: I will set people to check in once a week.

- A success statement too short to record is refused, word for word
  MISMATCH.
    old route:      That is too short to stand as what doing well looks like.
    ask groundwork: Good. What is still missing from the setup for this check-in? I need to know what success looks like for "askgw check-in", what targets will measure it, and what each person is trying to achieve. I also need to know if there are any documents everybody should be working from.

- A success statement said properly is recorded, word for word
  MISMATCH.
    old route:      I will record that as what doing well looks like: "Good means every pipeline stage has an owner, the weekly numbers are posted before Friday close, and nothing sits unowned for more than two days."
    ask groundwork: I will record that as what doing well looks like: "every pipeline stage has an owner, the weekly numbers are posted before Friday close, and nothing sits unowned for more than two days."
```

Reproduce with:

```
DATABASE_URL="postgresql://hafsahjumare@localhost:5432/gw_pw9_1786222102?schema=public" \
  npx ts-node -T journey/context-chat-equivalence.ts
```
(run from `api/`, against a local build and a local database only - the script refuses anything else).

**Items 10, 11, 15 and 16, proven live through both doors (30 September 2026).** `api/journey/the-four-live-checks.ts` sends the same words through the old context chat and through Ask Groundwork opened from inside a check-in (decision 65), on the real model, and prints what the lead reads and what was saved. The first run found six faults and the later runs smaller ones; all are fixed (`2be05495` to `f6256b71`). What the lead reads now, the same on both doors:
- **Item 15.** "This check-in runs for 12 weeks and people check in once a week." then the question for the most important missing thing. No greeting, and nothing it already has is asked for again.
- **Item 10.** The lead is asked what they have seen, tried and want. Their read of the person is offered as a private note ("Shall I keep "Ben is struggling" as a private note about Ben that only you can see?") and kept only on a yes, as a note only the lead reads.
- **Item 11.** "Shall I record "close 3 renewals by the end of December" as what you expect of Ben? It is kept as your expectation, not as something Ben agreed to, and Ben has not seen it yet." Saved as the lead's expectation, unseen by Ben. A wish with nothing checkable ("more proactive") is not kept as an expectation.
- **Item 16.** "Shall I change what doing well looks like to "every stage has an owner and a next date", because the board kept going stale? The earlier version is kept." Both versions are kept, the second with its reason.
- Everywhere: what is saved is exactly what was said back, and the chat never says it has recorded something unless it is offering to.
- One difference that is the model varying, not a door: on one run Ask Groundwork asked what "more proactive" means where the old chat offered a private note.
