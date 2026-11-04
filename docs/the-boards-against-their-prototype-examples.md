# The boards against their prototype examples

Phase 2 of the board task (CLAUDE.md, `docs/tasks-ui.md`): picture every kind of work's board, as
the lead and as a participant, at 1440px and 375px, and compare each against its prototype example
in `docs/prototype/screens/G1-example-check-ins/<kind>.txt` (the lead's board) and
`docs/prototype/screens/B5-the-board/board-as-participant.jpg`/`.txt` (the participant's board).

**What was pictured.** All 22 boards (eleven kinds, as lead and as participant), at both widths -
44 pictures, each with its page text and what the API sent - in
`.../scratchpad/pictures/boards3/`. Ten kinds come from the seeded test check-ins
(`.../scratchpad/pictures/boards/kinds.json`); the eleventh, MarketView Q4, has no test check-in of
its own (its creation was refused by the free plan's limit), so it is read on a duplicate "Help a
new hire get started" check-in (`d1880c07-eb5d-4e1d-9007-977e1b53788c`) whose kind of work was
changed to MarketView Q4 through the board's own control, as a lead would - see the report for
exactly how, and how to undo it.

## How to read this

Each of the eleven kinds has one prototype example, captured as the **lead's** board. There is no
per-kind example of the **participant's** board; the only participant example is the generic one at
`B5-the-board/board-as-participant.jpg` (a personalised "your deals, day by day" + "your share"
view, sales-specific). So the participant comparison below is against that generic shape, not
against a per-kind example.

**Content cannot be compared word for word.** The prototype's examples are richly detailed,
long-running fictional check-ins (a 40-trader loan cohort, a five-engineer release three weeks in,
a law firm six weeks into a matter). Our test check-ins are one or two people, one or two sessions
old, seeded only to prove the mechanism works. So the comparison below is about **shape**: which
sections appear, in what order, under what heading, with what kind of table - not whether the
sentences say the same thing, which they cannot.

## The headline finding: two different board shapes

The engine currently sends **one generic board shape** for every kind of work - the "switchboard"
sections (What success looks like, What we are aiming for, a record table, Work plan, Timeline,
What could go wrong, The team today, Decisions needed, Who owns what, Waiting on, Who checked in,
Contribution against role, What keeps coming up, Find a time, Reports, Over time, and so on),
gated per situation by `the-switchboard-g2-table.ts`.

The prototype's examples for **gov, loans, matter, mvnext and mvq4** are not this generic shape at
all. Each is a bespoke board built around what that kind of work actually is:

- **gov** (`gov.txt`): a ministry-down-to-officers cascade ("What each level understood"), a
  per-county breakdown ("The three counties"), a link to questions raised by the counties.
- **loans** (`loans.txt`): a 40-trader cohort breakdown by status ("Where the cohort stands":
  repaying, behind, blocked, not heard from), a support-effectiveness table ("Support given, and
  whether it helped").
- **matter** (`matter.txt`): "Where the matter stands", "What you need to decide", "What changed
  this week, and what it changed", a handover page link.
- **mvnext** (`mvnext.txt`): a discovery-workshop breakdown by respondent group ("By who they
    are"), "Where next, ranked", "Where they disagree".
- **mvq4** (`mvq4.txt`): a systems-integration table ("What the systems show", sourced from
  Paystack and MarketView) and "Where what people said and the systems differ".

None of these sections exist anywhere in the client or the API (`grep` for their headings across
`client/src` and `api/src` finds nothing). This is not a drawing problem - the client draws
whatever the board response sends, nothing more, nothing less - so it is not something this
workspace can fix by changing a page. It is logged as **request 105** below.

**eng, founder, ops, programme, salesorg and support** match the generic switchboard shape, which
is also what their prototype examples show (eng.txt, founder.txt, ops.txt, programme.txt,
salesorg.txt, support.txt all use the same section set: Where each target stands, What needs you
in this check-in, Every task/sale/incident and what shows it, The team today, Who checked in,
Blockers, What keeps coming up, Reports, Over time). These six are the ones a true section-by-
section comparison is possible for.

## Section-by-section, for the six generic kinds

Checked against eng, founder, ops, programme, salesorg and support, both readers, both widths.

| Prototype section | Our heading | Match | Cause if not |
| --- | --- | --- | --- |
| "Where each target stands" (a compact row of target chips, each with its own "Close"/"Behind"/"On time" word) | "What we are aiming for" | **Different heading, different shape.** The prototype shows each target as a short chip with one status word. Ours is a full `TargetsBand` with the lead's own editing controls (Change/Add target), which is right for the lead but is also what a participant without edit rights sees, just without the buttons. | Engine: no field carries the per-target pace word ("Close"/"Behind"/"On time") `objectives[].journey` would need to draw the prototype's own chip; drawing one here would be a word invented rather than read off the record. See request 108(b). The editing shape for a lead is correct and not a prototype regression. |
| The headline question, with its bar ("Deliver the major release by 30 September?", a bold serif question above everything else, with a one-line answer and a bar) | `howItIsGoing`'s own story, at the prototype's own size (no question above it) | **Close, but missing the question itself.** `howItIsGoing.latestSummary` already supplies the prototype's prose answer, drawn at the prototype's largest text (fixed in an earlier review, see `how-it-is-going.tsx`'s own comment) - but nothing on the payload is a yes/no question like the prototype's own headline, so the board has no question to put above it. | Engine: no field is this question; `title` is the check-in's name, not one. See request 108(a). |
| "Every task, and what shows it" / "Every sale, and what shows it" / "Every incident..." | "Every release and task, and what shows it" / "Every sale, and what shows it" / "Every county, and what shows it" | **Close.** The per-kind noun (`ITEM_NOUN_FOR_KIND` in `WorkRecords.tsx`) already varies by kind and mostly matches; "Every release and task" for eng has an extra word the prototype's "Every task" does not. | Screen - see fix below. |
| The record table's key ("Ringed is someone's word; filled is proven. Select one for its detail") | No key; no mark drawn on any row | **Missing.** The prototype draws the shared proof-mark dot (`ProofMark`, already used by `TheEndCard.tsx` and `ReviewPage.tsx`) beside each record. | Engine: `AServedWorkRow` carries no `mark` field (only `from: 'said' \| 'lead'` and free text) - nothing to read a mark from. See request 108(c). |
| "What needs you in this check-in" (Today's items, the record's own `leadActions`, and decisions - a decision reads as one more row here, tagged "Decision needed", with no separate "Decisions needed" heading anywhere in the example) | **Fixed, phase 2.** One section, built from Today's `needsHere`, `leadActions` and `decisions` together, for whoever runs the check-in. The standalone "Decisions needed" section (unchanged) now renders only for a participant or a read-only admin, who this heading was never addressed to. | Match. | - |
| "The team today" | "The team today" | Match (request 70/82 already renamed this). | - |
| "Who checked in" | "Who checked in" | Match. | - |
| "Blockers" (its own section, one card per blocker: "Waiting on:", "Raised:", "Affects:", "Promised"/"What the proof shows:", "Would clear it:") | **Fixed, phase 2.** One "Blockers" section, one card per blocker, joining `blockerCheck` and `whoWaitedOnWhom` on the id they already share. Each card shows "Waiting on:" (who holds it, from `blockerCheck`'s own first check), "Raised:" (the date `whoWaitedOnWhom` gives, and when it cleared), and "What the proof shows:" (the rest of `blockerCheck`'s checks) - only what the two arrays actually send. | **Close, not exact.** "Affects" and "Would clear it" are in the prototype's own example; no field sends either one today, so neither is drawn (nothing invented in their place). | Engine: see request 105 (already covers this gap) and request 108(d)'s neighbour, "Where this is heading", for the same kind of missing field. |
| "What keeps coming up" | "What keeps coming up" | Match. | - |
| "Reports" / "Over time" | "Reports" / "Over time" | Match. | - |
| "By area of work" (eng only: grouped tasks-done/blocked/released by area, with names) | Not present | **Missing.** | Engine: no field for this grouping. |
| "Reported vs evidence, stage by stage" (eng only: a stage funnel, said vs met) | Present as "The shape of the work" (a similar said-vs-met stage funnel) | Close in substance, different heading. | Screen wording, minor. |
| "Where this is heading" (the possible outcomes, with their signals, "What would settle it", who decides) and "Record the decision" | Not present (closest served field, `forecast`, is "Where this could end up": one pace-based projection, not named outcomes or a place to record which was chosen) | **Missing.** | Engine: no field carries named outcomes, their own signals, or a decision-recording action. See request 108(d). |

## The two confirmed screen-side fixes

**1. A phone-width overflow in "Decisions needed" (fixed).** When a decision has no named owner,
the board sends the owner as a full sentence ("Nobody has been named to decide this.") rather than
a short name. `BoardPage.tsx`'s owner label was pinned `whiteSpace: 'nowrap'` - fine for a name like
"Rukia Otieno", but it forced that whole sentence onto one line and pushed the gov board's lead and
participant views to 395px wide inside a 375px viewport (measured with `bgprobe375`-style probing
before the fix, confirmed back to 375px after). Fixed by dropping the forced `nowrap`, in
`client/src/pages/board/BoardPage.tsx`.

**2. Section heading wording (fixed).** "Every release and task, and what shows it" (eng) reworded
to match the prototype's "Every task, and what shows it"; see the commit for the exact change.

## TheSwitchboardsSections.tsx and the one-off classes

`client/src/pages/board/TheSwitchboardsSections.tsx` (request 70's thirteen new sections) does
render live data on this review: nine of the ten real test check-ins populate several of these
fields (`risks`, `workPlan`, `timeline`, `personHistory`, `busyOrMoving`, `leadActions`,
`obligations`, and on some boards `blockerCheck`, `whoWaitedOnWhom`, `questionsForTheLead`,
`evidenceIndex`); `forecast` and `contradictions` never appear in any of the 22 boards pictured
here.

Its rows are built with the same pattern already used on `WorkRecords.tsx` (a page already on
`REBUILT_PAGES`): `Panel`/`gwui-panel-row` plus the frozen one-off classes (`gwui-fs-15`,
`gwui-ink-text`, `gwui-fs-13-5`, `gwui-ink-muted`, and so on) from
`client/src/components/gw/ui/one-off-style-classes.ts`, with only `lineHeight`/`fontStyle` inline -
never `fontSize`, `color`, `margin*`, `padding*`, `border*` or `gap`, which is what the rebuilt-page
guard (`the-rebuilt-pages-use-only-the-new-parts.spec.ts`) actually forbids. None of the thirteen
sections' thirty-odd rows showed a visible defect against the prototype examples, because the
prototype has no per-kind example of most of them at all (they are new, request-70 sections with no
prototype screen of their own yet).

Given that, a full rewrite of all thirteen components onto `RowList`/`Row`/`SubHeading` was not
attempted in this pass: there is no prototype screen to render them against and check the result
visually, so a rewrite here would be guided by taste rather than a verified difference, which is a
worse trade than leaving a hygiene item for the next round that does have something to check it
against. This is flagged, not silently skipped - see the report for the full reasoning.

## Participant boards against the B5 example

The B5 example (`board-as-participant.jpg`/`.txt`) shows a participant a **personal, narrowed**
board: only their own deals ("Your deals, day by day - Only yours"), their own share of the team's
total ("Only you and Wairimu see your share"), and a note that the team's shared picture isn't out
yet.

**Fixed, phase 2 of the board task.** A participant's board now leads with a short personal view
(`TheParticipantsOwnView`, `client/src/pages/board/BoardPage.tsx`), decided for Hafsah to confirm:
whether today's team picture is shared (read off `howItIsGoing.glance.progress.roundsDone`, the
same count the board's own header sentence already uses elsewhere - nothing invented for this),
"Read your own report", and this reader's own records from `workRecords`, filtered to rows they
own and marked "Only yours" (`YourOwnRecordsSections`, `WorkRecords.tsx`). "Your share" (B5's "Only
you and Wairimu see your share") has no served field at all yet, so nothing is drawn for it rather
than an empty box - still open, see request 107(c).

Everything the participant already received - the same generic switchboard sections a lead sees
(What success looks like, Every sale and what shows it for everyone, Work plan for everyone, Where
people differ, Who owns what, Waiting on), minus the lead's own editing controls and minus
`theJudgement`/`whatTheAnswersSay` (confirmed absent from every participant's own
`GET /grounds/:id/board` response - the privacy rule that a participant never reads the lead's
judgement holds server-side, not just on screen) - is unchanged and still there, now folded below
the personal view under one name, "The whole check-in" (`Folded`, closed by default), so nothing a
participant could read before this change is taken away.

This is allowed under CLAUDE.md's privacy rule ("What people say in check-ins can be shown word for
word to the people in that check-in") - nothing here is a privacy defect. The full switchboard
staying available (now inside the fold) is a deliberate choice, not a stopgap: Hafsah's instruction
for this task was to draw the personal view first and keep everything else below it, rather than
replace the full switchboard outright, since whether participants should ever lose any of it is a
product decision nobody has made. If that decision changes, only the fold needs removing - no data
the server sends is withheld by this screen.

## Per-kind, per-reader summary

**Phase 2 update (2 October).** The merged "What needs you in this check-in" (Today's items,
`leadActions` and `decisions` together) and the joined "Blockers" section apply to every kind that
carries these fields - all eleven, not only the six generic ones - since both are built in
`BoardPage.tsx`/`TheSwitchboardsSections.tsx` from fields the switchboard already sends regardless
of kind of work. The participant's personal view (`TheParticipantsOwnView`) applies to every
participant board, for the same reason. The table below is not yet re-pictured against these
changes (see "Pictures" below for the fresh set); it still records what the previous review found,
with the phase 2 fixes noted against each row. Nobody here is marked "done" - that is the
reviewer's finding, not this one.

| Kind | Lead board | Participant board |
| --- | --- | --- |
| eng | Generic shape, matches prototype's section set; two heading-wording differences (fixed); "What needs you" merge and "Blockers" join now apply (phase 2) | Now leads with the personal view (phase 2); the rest, unchanged, folded below under "The whole check-in" |
| founder | Generic shape, matches (no participant - founder's own check-in has none) | n/a |
| ops | Generic shape, matches; phase 2 fixes apply | As eng |
| programme | Generic shape, matches; phase 2 fixes apply | As eng |
| salesorg | Generic shape, matches; richest test data of the ten; phase 2 fixes apply | As eng; B5's own example is this kind, so the personal view is clearest here |
| support | Generic shape, matches; phase 2 fixes apply | As eng |
| gov | Generic switchboard shown; prototype expects a bespoke cascade/county board (request 105); phase 2 fixes apply where the fields exist | As eng, generic shape; prototype has no participant example for this kind |
| loans | Generic switchboard shown; prototype expects a bespoke 40-trader cohort board (request 105); phase 2 fixes apply where the fields exist | As eng |
| matter | Generic switchboard shown; prototype expects a bespoke legal-matter board (request 105); phase 2 fixes apply where the fields exist | As eng |
| mvnext | Generic switchboard shown; prototype expects a bespoke discovery-workshop board (request 105); phase 2 fixes apply where the fields exist | As eng |
| mvq4 | Generic switchboard shown (on the repurposed check-in, which also still carries its old onboarding content); prototype expects a systems-integration board sourced from Paystack/MarketView (request 105); phase 2 fixes apply where the fields exist | As eng |

## Pictures

`.../scratchpad/pictures/boards3/` - `w1440-<lead\|part>-<path>.png`/`.txt`/`.api.json` and
`w375-<lead\|part>-<path>.png`/`.txt`/`.api.json` for all 22 boards, plus `fixcheck-lead-...png`
(the gov board at 375px after the overflow fix, confirming `scrollW` now equals `innerW`).

## Phase 2's own picture pass (2 October), after the fixes above

All 11 kinds, as the lead and (10 of them) as a participant, at 1440px and 375px -
`.../scratchpad/pictures/boards-fix2/` - `w1440-<lead|part>-<path>.png`, `w375-<lead|part>-<path>.png`
and `w1440text-<lead|part>-<path>.txt` (the page's own `innerText`, which a real browser already
hides for a closed `<details>` - a participant's folded "whole check-in" correctly does not appear
in these text captures, the same way it is really hidden from the reader until they open it).
Found, read against these pictures:

- **The merged "What needs you in this check-in"** renders for the lead on every kind that sends
  `leadActions`/`decisions`/Today items (confirmed on eng, gov, sales), with no separate "Decisions
  needed" heading anywhere on a lead's board any more. A participant's own board (where "Decisions
  needed" still belongs) was not directly checked this pass, since it now sits inside "The whole
  check-in" fold and does not appear in an `innerText` capture - this is expected (see above), not
  a gap; `TheSwitchboardsSections.spec.tsx`'s own test for it (`"for a participant, 'Decisions
  needed' is still its own section, as before"`) checks the DOM directly instead.
- **The joined "Blockers" section** renders correctly where the server actually sends
  `blockerCheck` - confirmed on the MarketView Q4 board (the one kind of the eleven whose test data
  carries it today): "Blockers", "Each with its history and the one thing that would clear it,
  where the record has it.", one card with "Blocking", "Waiting on: IT holds it.", "Raised: since
  27 September", "What the proof shows: Nobody has said what has been tried. No time has been given
  for it." - matching the prototype's own card shape exactly, for the fields the server sends.
  `eng`'s own test data does not currently carry `blockerCheck` at all (only the general `risks`
  and `dependencies` it always had), so no Blockers card draws there - correct behaviour (a section
  with nothing to show draws nothing), not a defect.
- **The participant's personal view** renders on every participant board checked (eng, sales,
  loans): the sharing-status sentence (in both states - "isn't ready yet", naming the lead, and "is
  ready" once a round has closed), "Read your own report" (linking to `/grounds/:id/report`), and
  "The whole check-in" folded below, closed by default. "Your own records, day by day" only draws
  where this reader actually owns a row in `workRecords` - it was absent on every board checked
  this pass because none of the three participants read here (Aisha, Amani, Miriam) owns a record
  on their own test check-in yet; this is the section correctly drawing nothing rather than an
  empty heading, not a gap in the section itself.
- **At 375px**, every board checked kept its background at the one cream colour throughout (the
  `bgprobe375` background probe found no stray colour at any sampled point on any of the 20 boards
  pictured), and the personal view's own panel and fold read cleanly in the narrow column (see the
  eng participant picture).

Nobody is marked "done" by this pass - that is the reviewer's own finding to make, not the
builder's.

## The sales board, section by section (2 October)

Hafsah's new approach: get the sales team's board exactly right first, lead and participant, one
section at a time against `salesorg.txt`/`.jpg` and `board-as-lead.txt`/`.jpg` (the lead) and
`board-as-participant.txt`/`.jpg` (the participant), before touching any other kind of work. The
check-in: "Sales team, Q3", `9028f0ad-293b-4592-9a4e-25b680dd91cd`, Rukia Otieno (lead) and Amani
Wekesa (participant). This covers requests 105, 107 and 108 from the 2 October merge
(`docs/answers-from-engine.md`), none of which was drawn before this pass.

**Step 1, coaching.** The coaching drawn on 1 October (`e7b604c9`) sits right after "What needs you
in this check-in" (`questionsForTheLead`), as `WhatToWorkOnNext` (this reader's own note) and,
lead-only, `WhatToProbeThemOn` (the lead's read on everybody else). Neither prototype file for this
board (`salesorg.txt`, `board-as-lead.txt`) has a "Coaching, and whether it changed anything"
heading - that module (`docs/prototype/source/s7.js`'s `coachSec`, a per-person tone tag, a quote
and an "afterwards" line) belongs to a different situation in `modules.md`'s own table ("Help
someone get back on track", "Help a new manager take over") and is not one of "Set goals and keep
the team on track"'s guaranteed sections. So there is no drift to fix here: the placement already
matches where this board's own coaching belongs, and the richer follow-up module is simply a
different, not-yet-requested feature for a different situation. No code changed in this step.

**Step 2, the new fields, drawn in the prototype's own order.** Five commits
(`a595db3d`..`39d7c316`):

- **Blockers** (request 105 part 2, 107 b, 108): rewritten to draw the server's own `blockers`
  field directly - one sentence per fact (`says`, `raised.says`, `proof.says`, `timeGiven`,
  `wouldClearItSays`, `holdingUp`), no "Waiting on:"/"Raised:"/"What the proof shows:" labels. As
  Rukia: "Baraka Mwangi is waiting on you for the discount decision." / "Blocking" / "This was
  raised once, on 27 September." / "Nothing on record proves it yet. It rests on what Baraka Mwangi
  said." / "No time has been given for it." / "Nobody has said what would clear it yet." - matching
  the engine's own worked example in `docs/answers-from-engine.md` exactly, and the prototype's
  shape (one card per blocker, its history, what would clear it) without the prototype's invented
  "Affects:" (no field sends it) or "Would clear it:" label text.
- **The headline question** (request 108 a): drawn above everything else, in `Callout
  tone="emphasis"` (the one shared bold-sentence part, not a new type size). As Rukia: "Will we
  sign 12 shops for kitchen appliances in Nairobi by 13 December?" - matches
  `salesorg.txt`'s own "Will we reach 25 sales by 30 September?" in shape and placement (above "How
  it is going"). This check-in's own aim has no answer yet (`answer: null`, no sessions closed), so
  the prototype's "Not yet. 21 freezers are sold..." sentence and bars are correctly absent rather
  than invented.
- **Where each target stands** (request 108 b): a `Tag` beside the target's name, from
  `objectives[].stands`. As Rukia: "You want us to sign 12 shops by 20 December. **Met**" (the
  12-shop aim was reached this round).
- **"Where this is heading"** (request 108 d): drawn beside the existing board-top
  `ResolutionPanel`, whose "Record the decision" button it reuses (scrolled to, not duplicated). As
  Rukia: heading "Where this is heading", "Set goals and keep the team on track", the three
  situation outcomes, the signals (each with "This was raised once, on 27 September." underneath),
  "Nothing on record says yet what would settle it.", "You decide.", "Groundwork lays out the
  outcomes and the proof. It doesn't choose.", "Record the decision" - matches `board-as-lead.txt`'s
  own "Where this is heading" section heading-for-heading, in the engine's own wording rather than
  the prototype's fictional example text (different check-in, different facts).
- **Each record's "Next", and its mark** (request 107 c part 1, 108 c): the deal grid's row name is
  now preceded by the shared `ProofMark` (nothing drawn for `mark: "none"`, as both this board's
  deals were added on the board with nothing behind them), and `nextSays` draws under "What shows
  it": "Nobody has said what happens next." (Tuskys Westgate) and "You committed to visit Naivas
  Karen on Wednesday 30 September to show them the fridges." (Naivas Karen) - matching the
  prototype's "Next: Send the quote, with a photo" in substance, though this board's own records
  have no proof attached yet so the ringed/filled distinction cannot be pictured on this check-in.
- **By area, and reported against criteria** (request 107 c parts 3 and 4): both draw their
  "not-known" state with the engine's own reason sentence ("Nothing on record says which site,
  county, team or queue...", "Nothing on record says what a deal must show to be at each stage...")
  plus, for the second, what was actually reported at each stage ("1 deal was reported at Quoted,
  and it has no document behind it.", "...at Won..."). Never "criteria met", as the engine's answer
  requires. `salesorg.txt` does show "By team" with real counts and a reported/criteria-met bar
  chart - this check-in's own records simply carry no site/county/team/queue and no stage criteria,
  so the honest "not-known" state is correct, not a regression against the prototype's richer
  (different-data) example.

**Step 3, the participant's board.** Amani's board is unchanged this pass and still matches
`board-as-participant.txt`: "Today's team picture isn't shared yet." / "Rukia shares it. Your own
report is ready now." / "Read your own report" / "The whole check-in" fold (closed) / "Ask" /
"Feedback". None of the five new sections above reach her, correctly - the team picture has not
been shared yet (request 105 part 3: `headline`, `whereThisIsHeading`, the quick read and the
forecast are all held back until release), and `yourShare` and her own counted aim ("I am aiming
for 3 shops in Kilimani") are not present in the server's response to her at all - see "What still
differs" below.

**Checks, every commit:** `cd client && npx vitest run src/pages/board src/components/gw` (200
files, 1328 tests). At the end: `npx vitest run src/pages` (331 files, 2125 tests) and `npx vitest
run src/components src/lib src/api src/hooks src/stores` (one pre-existing failure fixed along the
way - `scroll-to.spec.ts` banned a raw `scrollIntoView` call the "Record the decision" button used
at first; switched to the shared `scrollTo` helper, see Board fix 5e); both green after. `cd e2e &&
npx playwright test the-prototype-count-of-buttons.spec.ts -g "sales"` - 2 passed (lead and
participant). The one-off-style-class guard and the one-vocabulary guard both pass throughout: the
new sections are built from `Section`/`Panel`/`Note`/`Stack`/`Callout`/`Tag`/`gwui-panel-text`
only, and the progress-bar track colour, now needed in two files, was named `--gw-bar-track` rather
than typed out a second time.

**What now matches, screen for screen (lead):** the headline question's placement and shape; a
target's own word; "Where this is heading" heading-for-heading, including "Record the decision";
Blockers as one sentence per fact with no colon labels; each record's own "Next" line and its mark;
"By area" and the sales-only "Reported, stage by stage", each saying honestly what the record does
and doesn't hold.

**What still differs, and why:**

- **The headline's answer and bars are empty** on this board (`answer: null`, `bars: []`) because
  no session has closed yet to measure the pace against - this is the engine's own rule (108 a:
  "bars" and "answer" come from counts the board already serves), not a drawing gap. It will fill in
  once this check-in has run further; nothing to fix on the screen.
- **Amani's own counted aim ("I am aiming for 3 shops in Kilimani") is missing from her own
  board.** Request 107 (c) item 6 says the engine fixed exactly this ("a participant's own number
  goes on the board with somebody's name on it") - but the live fetch of her board
  (`GET /grounds/.../board` as Amani) shows only two targets (the un-named 12-shop aim and "Rukia
  Otieno wants us to sign 12 shops by 20 December"), neither hers. **Engine gap, not a screen gap**:
  nothing on the client withholds it; the field simply is not in the response. Needs a request back
  to the engine workspace.
- **`yourShare` is entirely absent from the served board**, for both Rukia (whose board should not
  get it, correctly) and Amani (who should: request 107 c part 5 says every participant gets
  `{ objectiveId, says, whoSees }` for their own targets). It is not present in the JSON at all, not
  even as `null`. **Engine gap**: the client is ready to draw it (ask for it in
  `docs/requests-to-engine.md` before building a component with nothing to render against).
- **Visual, pixel-level comparison against the prototype's `.jpg`s was not completed this pass.**
  The session's Python had a broken Pillow install and no ImageMagick was available to crop the
  very tall (1440x19727px) full-page screenshots into comparable strips; the sentence-by-sentence
  comparison above (against the engine's own worked examples in `docs/answers-from-engine.md`,
  which match this test check-in's facts) was used instead, which is the authoritative check per
  CLAUDE.md ("Judge the output ... Check the rendered text"). The raw screenshots are saved at
  `.../scratchpad/pictures/sales2/` (`a1440-`/`a375-` PNGs, `t-` text dumps) for the reviewer to
  open directly.
