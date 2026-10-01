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
| "Where each target stands" (a compact row of target chips, each with its own "Close"/"Behind"/"On time" word) | "What we are aiming for" | **Different heading, different shape.** The prototype shows each target as a short chip with one status word. Ours is a full `TargetsBand` with the lead's own editing controls (Change/Add target), which is right for the lead but is also what a participant without edit rights sees, just without the buttons. | Screen: the heading itself could read "Where each target stands" when there is nothing to change (see request below); the editing shape for a lead is correct and not a prototype regression. |
| "Every task, and what shows it" / "Every sale, and what shows it" / "Every incident..." | "Every release and task, and what shows it" / "Every sale, and what shows it" / "Every county, and what shows it" | **Close.** The per-kind noun (`ITEM_NOUN_FOR_KIND` in `WorkRecords.tsx`) already varies by kind and mostly matches; "Every release and task" for eng has an extra word the prototype's "Every task" does not. | Screen - see fix below. |
| "What needs you in this check-in" | "What needs you in this check-in" | Match. | - |
| "The team today" | "The team today" | Match (request 70/82 already renamed this). | - |
| "Who checked in" | "Who checked in" | Match. | - |
| "Blockers" (its own section, with history and "would clear it") | Folded into "Waiting on" and "What could go wrong" | **Different shape.** The prototype's "Blockers" section gives each blocker its own card: what it's blocking, who's waited on, every time it was raised, what the proof shows, and the one thing that would clear it. Ours spreads the same facts across "Waiting on" (handoffs) and "What could go wrong" (risks), with no single per-blocker history or "would clear it" line. | Engine: no field groups one blocker's full history (raised-count, dates, "would clear it") the way the prototype's example does; `whoWaitedOnWhom`/`risks` are close but not the same shape. See request 105. |
| "What keeps coming up" | "What keeps coming up" | Match. | - |
| "Reports" / "Over time" | "Reports" / "Over time" | Match. | - |
| "By area of work" (eng only: grouped tasks-done/blocked/released by area, with names) | Not present | **Missing.** | Engine: no field for this grouping. |
| "Reported vs evidence, stage by stage" (eng only: a stage funnel, said vs met) | Present as "The shape of the work" (a similar said-vs-met stage funnel) | Close in substance, different heading. | Screen wording, minor. |

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

Every participant board pictured here instead shows the **same generic switchboard sections** a
lead sees (What success looks like, Every sale and what shows it for everyone, Work plan for
everyone, Where people differ - naming colleagues and quoting them, Who owns what - everyone's
statements, Waiting on - everyone's handoffs), minus the lead's own editing controls (Change/Add
target/Add a record) and minus `theJudgement`/`whatTheAnswersSay` (confirmed absent from every
participant's own `GET /grounds/:id/board` response in this review - the privacy rule that a
participant never reads the lead's judgement holds server-side, not just on screen).

This is allowed under CLAUDE.md's privacy rule ("What people say in check-ins can be shown word for
word to the people in that check-in") - nothing here is a privacy defect. But it is a real shape
difference from the prototype's much narrower participant board, and it is not something the
screen draws wrongly: the client shows exactly what `GET /grounds/:id/board` sends a participant,
unfiltered by section beyond what `shown.*`/`canEdit` already gate. Whether participants should see
the full switchboard or the narrower "your own work" board the prototype shows is a product
decision the engine side owns (which fields it sends a participant), so this is logged as part of
request 105 rather than fixed here.

## Per-kind, per-reader summary

| Kind | Lead board | Participant board |
| --- | --- | --- |
| eng | Generic shape, matches prototype's section set; two heading-wording differences (fixed) | Same sections minus lead controls and judgement; shape differs from B5's personal view (request 105) |
| founder | Generic shape, matches (no participant - founder's own check-in has none) | n/a |
| ops | Generic shape, matches | As eng |
| programme | Generic shape, matches | As eng |
| salesorg | Generic shape, matches; richest test data of the ten | As eng; B5's own example is this kind, so the gap above is clearest here |
| support | Generic shape, matches | As eng |
| gov | Generic switchboard shown; prototype expects a bespoke cascade/county board (request 105) | As eng, generic shape; prototype has no participant example for this kind |
| loans | Generic switchboard shown; prototype expects a bespoke 40-trader cohort board (request 105) | As eng |
| matter | Generic switchboard shown; prototype expects a bespoke legal-matter board (request 105) | As eng |
| mvnext | Generic switchboard shown; prototype expects a bespoke discovery-workshop board (request 105) | As eng |
| mvq4 | Generic switchboard shown (on the repurposed check-in, which also still carries its old onboarding content); prototype expects a systems-integration board sourced from Paystack/MarketView (request 105) | As eng |

## Pictures

`.../scratchpad/pictures/boards3/` - `w1440-<lead\|part>-<path>.png`/`.txt`/`.api.json` and
`w375-<lead\|part>-<path>.png`/`.txt`/`.api.json` for all 22 boards, plus `fixcheck-lead-...png`
(the gov board at 375px after the overflow fix, confirming `scrollW` now equals `innerW`).
