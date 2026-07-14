# Feature spec: Ground setup guidance

**Status: SPEC ONLY, not built.** Fast-follow feature. Captured 2026-07-14 while the
contents of each scenario pack are fresh, so the guidance is tied to what each pack
actually probes rather than guessed.

## What this feature is

When someone sets up a ground, guide them to make it mirror their real situation, so the
first sessions gather the right things and the report is worth reading. Two levers:

1. **Document suggestions** - what to upload, scaled to how complex and evidence-heavy the
   situation is, and tied to what the pack will actually use.
2. **Suggested cadence as a real-world arc** - not a bare session count, but a suggested
   sequence of sessions mapped to the situation's actual timeline and milestones.

## Advisory only: the user controls duration and cadence

This whole feature RECOMMENDS. It never sets, enforces, auto-schedules, or locks anything.
The user decides how long to run their ground and how many sessions to have. The product
suggests ("this kind of situation usually works best as one fast session, maybe a short
follow-up") and the user can take the suggestion, change it, or ignore it entirely. Nothing
below auto-creates a fixed arc, blocks a ground from running longer or shorter, or schedules
sessions on the user's behalf. Every arc in this document is a suggestion phrased as
"you might run it as", not a shape the product imposes.

## Two dimensions that make this more than a flat list

- **Documents scale with complexity and with evidentiary need.** A start-of-project ground
  needs a brief. A ground that has to prove a complex technical thing was actually delivered
  needs the real evidence (code, tests, deploy logs, closed tickets, a demo). Same scenario
  key, very different document ask. The heavier ask is not padding: it is how the product
  answers "is this actually done, or just claimed?" See "Claim verification" below.

- **Cadence is a lifecycle, not a number.** Some scenarios are one moment you lock down once.
  Some are an arc with a start, one or more checkpoints, and an end that produces a record
  (onboarding through probation, a performance plan, a gap you are trying to close). Some are
  an ongoing signal that just repeats. The setup should SUGGEST the shape that matches, not a
  flat "how many sessions?" - and the user is free to run a different shape.

## How to read each entry

Per scenario: the KEY, one line on what the pack probes (so the document list is grounded),
the document suggestions (scaled to complexity), and the suggested cadence (a recommended
shape, the real-world timeline it maps to, what each session in the suggested sequence is
for, and a one-line reason). All of it is advice the user can take or ignore.

Cadence shapes used below (all suggestions, never enforced):
- **One-shot**: a single session that locks the moment. Do not force an arc onto it.
- **Arc**: a start, one or more checkpoints, and an end that produces the record.
- **Recurring**: an ongoing signal that repeats on a fixed interval with no fixed end.

Supported cadences in the product today: DAILY, WEEKLY, FORTNIGHTLY, MONTHLY, and SEQUENTIAL
(the next round opens when the initiator checks in, no fixed schedule). Moments: STARTING,
RECOGNITION, RESOLUTION.

---

## The 16 scenarios

### NEW_HIRE
**Pack probes:** what the person was hired to do, what early success looks like (the hirer's
version, not the job description), the timeframe, what the hire needs before they can deliver,
and, where the mandate comes from several people, who has the final word.

**Documents (scaled):**
- Baseline: the job description and the role scope or offer letter. The onboarding plan or
  first-90-days plan if one exists.
- For a senior or executive hire: an org chart or a short note on the reporting line and who
  the mandate comes from (the pack asks about authority when more than one person is involved).
- Meeting notes / AI notetaker: the hiring or kickoff conversation is useful here, because it
  is often where the real expectations were said out loud and never written down.

**Suggested cadence (recommendation only; this is the headline example):** we would suggest
mapping it to onboarding plus the probation period, commonly about three months. You might
run it as:
- Start (day one to week one, STARTING): align on the role, the expectations, and what early
  success looks like, both sides, independently.
- Mid-probation check (about six weeks, FORTNIGHTLY or a scheduled mid point): are the
  expectations being met, from both sides, and is anything already drifting.
- End-of-probation check (about three months, RESOLUTION): produces the confirm-or-not record,
  built from both accounts rather than one manager's memory.
- Reason: probation is exactly the window where a small unspoken gap becomes a hard review. An
  arc catches it at six weeks instead of at the end.

### NEW_PROJECT
**Pack probes:** the project name and owner, what needs to exist at the end that does not now,
who else has a stake, and, from each person, what "done" looks like for their part and what the
work will be judged on.

**Documents (scaled):**
- General project: the brief or spec, the project plan, the kickoff deck. This is the light case.
- Technical or engineering delivery: this is where the ask gets heavier. If the project is a
  build, the evidence that answers "is it actually done" is the real artefact set: the repo and
  pull requests, test results, deployment or release logs, architecture or design docs, the
  ticket board (what is closed versus open), and a demo or a link to the running thing. Suggest
  these only when a later session is about proving delivery, not at kickoff.
- Meeting notes / AI notetaker: the kickoff meeting, strongly useful, since scope and ownership
  are usually agreed verbally first.

**Suggested cadence (recommendation only):** usually a one-shot at the start (lock scope, ownership, and success
before work begins). Offer an optional two-point arc when the project has a real delivery date:
- Start (STARTING): lock scope, ownership, and what done means.
- Delivery check (at the deadline, RESOLUTION): what was supposed to exist versus what does,
  with the proof-of-delivery documents attached.
- Reason: the start session prevents the mismatch being discovered at delivery. The optional
  delivery session is where claim verification actually earns its place.

### NEW_ADVISOR
**Pack probes:** what the advisor will contribute, on what terms, measured how, and one specific
thing each side expects to exist in twelve months. The pack is blunt that "available" is not the
same as "contributing."

**Documents (scaled):**
- The advisory agreement or term sheet, the equity or retainer terms, and any written scope of
  the engagement.
- Meeting notes / AI notetaker: the conversation where the arrangement was agreed, useful,
  because advisor expectations are almost always verbal.

**Suggested cadence (recommendation only):** a start lock plus periodic reviews.
- Start (STARTING): agree what the advisor will contribute and how it will be judged.
- Periodic review (QUARTERLY-ish, so MONTHLY or a scheduled quarter): what actually happened
  against that definition.
- Reason: advisory relationships drift into "we have a call sometimes" without a periodic check
  against the agreed contribution.

### NEW_COFOUNDER
**Pack probes:** what each person believes they are here to build, contribute, and own, and
specifically what has not been said out loud yet, before those assumptions collide.

**Documents (scaled):**
- The founder agreement, the equity split, a roles or responsibilities doc, the cap table if it
  exists. Often none of these exist yet, which is itself the point.
- Meeting notes / AI notetaker: early founding conversations, useful but secondary to just
  getting each person's account.

**Suggested cadence (recommendation only):** a start lock, revisited at real milestones.
- Start (STARTING): each person's account of contribution, ownership, and reliance.
- Milestone revisit (SEQUENTIAL or MONTHLY): at a raise, a hire, a pivot, whenever the shape of
  the company changes.
- Reason: cofounder assumptions are cheap to surface now and expensive to surface after equity
  and authority have hardened.

### NEW_MANAGER
**Pack probes:** what the person is being brought in to do and for how long, what the scope
includes and explicitly excludes, the reporting line, success at the end of the engagement, the
dependencies they need in place, and who has the final word if the mandate comes from several
people.

**Documents (scaled):**
- The role scope or mandate doc, an org chart or reporting-line note, the engagement terms.
- Meeting notes / AI notetaker: the handover or mandate conversation, useful, because the
  unwritten expectations are the ones that derail.

**Suggested cadence (recommendation only):** a start plus checkpoints through the engagement.
- Start (STARTING): scope in and out, reporting, and what success looks like at the end.
- Checkpoint(s) (MONTHLY, or tied to the engagement length): are the dependencies in place, is
  the scope holding.
- Reason: an interim or incoming manager's most common failure is scope and authority ambiguity,
  which only shows up once the work starts.

### CONTRACT_RENEWAL
**Pack probes:** the original arrangement and what it was supposed to deliver, what actually
happened against that definition, where it fell short and what got in the way, and an honest read
of whether renewal makes sense and on what terms.

**Documents (scaled):**
- The original agreement or contract and the original statement of work or deliverables. This is
  the anchor the whole session compares against, so it matters most here.
- The delivery evidence: what was actually produced over the term. For a services or technical
  contract this is where the ask gets heavier (outputs shipped, reports delivered, tickets
  closed, uptime or performance data).
- Meeting notes / AI notetaker: review meetings across the term, useful.

**Suggested cadence (recommendation only):** a short arc tied to the contract end date, or a one-shot decision session.
- Review (a few weeks before the end, STARTING): both sides account for delivery against the
  original.
- Decision (at the end date, RESOLUTION): the renew-or-not record and the terms.
- Reason: renewal decisions made from memory reward whoever tells the better story. The original
  agreement plus delivery evidence makes it about what happened.

### RECOGNITION
**Pack probes:** the specific ask (raise, equity, promotion), why the record supports it, the
evidence of contribution over time, and, from the decision-maker, an honest read of the same
record before the ask is made. If the two reads diverge, that gap is the real conversation.

**Documents (scaled):**
- The evidence behind the ask: performance reviews, KPI or goal data, past work, prior check-ins,
  messages or written praise, and any comp or level benchmark. The pack literally says "the
  record is the argument," so the documents are the case.
- Meeting notes / AI notetaker: past one-to-ones where the contribution was discussed, useful.

**Suggested cadence (recommendation only):** a one-shot before the recognition conversation, timed to the review or comp
cycle. Not an ongoing arc. Run it once, get both reads, walk into the room from a shared record.
- Reason: this session exists to be ready for a single conversation, not to be maintained.

### DRIFT
**Pack probes:** what was agreed, what actually happened, and the specific gap between them, for a
person not delivering, a project that has slipped, or a partnership under strain, plus what each
side is most worried about.

**Documents (scaled):**
- General: the original plan or agreement, recent status updates, and evidence of the current
  state versus what was planned.
- Where the drift is about a technical deliverable not being done: the proof-of-delivery evidence
  applies here too (what exists in the repo, what is deployed, what tests pass, what tickets are
  closed), because the whole session turns on "what was supposed to exist by now that does not."
- Meeting notes / AI notetaker: recent status or one-to-one meetings, strongly useful, since the
  gap is often visible in what was said versus what happened.

**Suggested cadence (recommendation only):** an arc that tracks whether the gap actually closes over weeks.
- Start (STARTING): name the gap specifically, both sides.
- Check-ins (WEEKLY or FORTNIGHTLY): is the gap closing, is the plan being followed.
- Close (RESOLUTION): resolved, or escalated with a record of what was tried.
- Reason: a drift named once and never followed up just becomes a documented complaint. The value
  is in the trajectory across weeks.

### OKR_ALIGNMENT
**Pack probes:** each person's top objectives in their own words, what the key result looks like at
the end of the period, how each objective connects to the company direction, and any cross-team
dependency that has not been formally agreed.

**Documents (scaled):**
- The person's own OKR or goals doc, the company or team OKRs for the period, any planning doc.
- Meeting notes / AI notetaker: the planning meetings, useful.

**Suggested cadence (recommendation only):** a one-shot at the start of the planning cycle, optionally repeated per cycle.
- Start of cycle (STARTING): each person's objectives and how they connect, gaps and unformalised
  dependencies flagged.
- Optional mid-cycle check (MONTHLY): are the objectives still connected and on track.
- Reason: the value is catching the gaps and missing links before the cycle locks in, not tracking
  execution day to day.

### WORKPLAN_BUDGET
**Pack probes:** the actual work planned for the period (the first few items, specifically), what
it will cost in time, money, or people, what is approved versus assumed, and any gap between the
plan and the resources available.

**Documents (scaled):**
- The workplan, the budget spreadsheet, the resource plan, and any approval record. The budget doc
  matters most, because the pack checks the plan against the money.
- Meeting notes / AI notetaker: planning or budget meetings, useful.

**Suggested cadence (recommendation only):** a one-shot at the start of the period, optionally revisited if the plan or
budget is revised.
- Start of period (STARTING): the plan, the resource ask, approved versus assumed, and the gaps.
- Reason: this is a plan-check at a moment, not an ongoing tracker.

### PULSE_CHECK
**Pack probes:** one thing going well, one thing stuck (a named obstacle, not "busy"), and what has
changed since the last check-in. Deliberately light, about five minutes.

**Documents (scaled):**
- Minimal by design. Usually none. Optionally a recent status note if something specific changed.
  Do not push documents here, it defeats the point.
- Meeting notes / AI notetaker: not needed. This is a quick self-report.

**Suggested cadence (recommendation only):** recurring, no fixed end. This is the clearest recurring scenario.
- Recommend WEEKLY, FORTNIGHTLY, or MONTHLY depending on how fast the thing moves.
- Reason: the value is the repeated signal over time, so say plainly this repeats and does not
  need setup each time. Do not offer an arc with an end.

### REALIGN_TEAM
**Pack probes:** what each person believes the team is trying to achieve today (not what was agreed
months ago), what has changed from the original plan as they understand it, and any tension the team
is not talking about openly.

**Documents (scaled):**
- The original plan or direction doc, the current roadmap, and a note on recent changes.
- Meeting notes / AI notetaker: recent team meetings, useful, since the divergence often shows up
  in how differently people describe the same meeting.

**Suggested cadence (recommendation only):** usually a one-shot to get everyone's read before a group discussion. Offer a
short arc if the realignment itself takes time.
- Align (STARTING): each person's current understanding, before the group talks.
- Optional follow-up (FORTNIGHTLY): did the shared picture hold after the discussion.
- Reason: the point is a shared starting picture for one important conversation, so one session is
  often enough.

### PIP
**Pack probes:** the person's own understanding of the concern, what support they believe is
available, what success looks like at the end of the period, and any gap between their account and
the formal plan. Both the person on the plan and the person setting it account independently.

**Documents (scaled):**
- The performance plan itself, recent review or one-to-one notes, prior written feedback, examples
  of the concern, and the role expectations. The plan document is the anchor, so it matters most.
- Meeting notes / AI notetaker: the feedback and one-to-one meetings, strongly useful, because a PIP
  turns on what was actually said versus what was heard.

**Suggested cadence (recommendation only):** we would suggest mapping it to the improvement
window (commonly 30, 60, or 90 days). You might run it as:
- Start (STARTING): both sides on the concern, the support, and the definition of success.
- Mid checkpoint(s) (WEEKLY or FORTNIGHTLY across the window): is it improving, is the support real,
  both sides.
- End of plan (RESOLUTION): the outcome record, built from both accounts.
- Reason: a PIP with no mid checkpoints is a set-up-and-judge exercise. The arc makes it a fair
  record of whether improvement actually happened and whether support was actually provided.

### BOARD_STRATEGY
**Pack probes:** each leader's single most important strategic priority in their own words, where they
think the board only appears aligned, and what each is willing to stop or sacrifice to fund the top
priority.

**Documents (scaled):**
- The strategy deck or board pack, the financials, prior board minutes.
- Meeting notes / AI notetaker: board and exec meetings, useful, but the pack's real target is the
  quiet disagreement that does not make it into the minutes.

**Suggested cadence (recommendation only):** a one-shot before a strategy offsite or board meeting, optionally quarterly.
- Before the meeting (STARTING): each leader's independent read, so hidden disagreement shows up
  before the room debates.
- Optional quarterly repeat (MONTHLY or per quarter): has alignment held.
- Reason: the value is surfacing silent disagreement before the decision, so it is timed to a meeting,
  not run continuously.

### COHORT_CHECK
**Pack probes:** per person, one concrete example of progress against the cohort's shared question,
one named blocker, and one specific support need. The value is the pattern across many independent
accounts.

**Documents (scaled):**
- Minimal per person. The shared question or rubric the cohort is checking against is the useful
  input, not per-person documents.
- Meeting notes / AI notetaker: not needed. This is a short repeatable self-report.

**Suggested cadence (recommendation only):** recurring across the cohort, at whatever interval the programme runs.
- Recommend WEEKLY or MONTHLY depending on the programme.
- Reason: like PULSE, the value is the repeated pattern over time and across people, so it repeats
  with no fixed end. Do not force a start-middle-end arc.

### CRISIS_ALIGNMENT
**Pack probes:** the current situation named specifically (numbers, runway, deadline), what needs to
be true in the next sixty days to consider it stabilised, what decisions need to be made and by when,
and what each person is most worried about. Scoped hard to the current decision, explicitly not to
relationship history. (See the note below: this pack is narrower than a general "any chaos" tool.)

**Documents (scaled):**
- The numbers that define the situation: the financials, the runway or cash model, the deadline or
  the contract at risk, the current status. The pack asks for the actual number, so the documents are
  the numbers.
- Meeting notes / AI notetaker: the emergency or leadership meetings, useful.

**Suggested cadence (recommendation only):** a fast arc through the stabilisation window.
- Now (STARTING): everyone's account of the actual situation and what stabilised means.
- Tight check-ins (WEEKLY across the window): is it stabilising, what changed.
- Close (RESOLUTION, around the sixty-day mark): stabilised, or the decision that was made.
- Reason: the situation is moving fast, so the cadence is tighter than normal and tied to the
  stabilisation deadline.

---

## Cross-cutting: claim verification and document weight

Several scenarios exist to answer "did the thing that was claimed actually happen?" NEW_PROJECT at a
delivery check, DRIFT about a deliverable, CONTRACT_RENEWAL, PIP, RECOGNITION, and NEW_ADVISOR all turn
on evidence, not assertion. For these, the document ask is not optional colour. It is the mechanism.

The clearest split is a general project versus a technical delivery:
- **General project ground:** brief, plan, notes. Light. The report can work from stated intent.
- **Technical delivery ground:** the report has to be able to check shipped versus claimed, so the
  documents are the real artefacts: the repo and pull requests, test results, deployment or release
  logs, architecture and design docs, the ticket board (closed versus open), and a demo or link to the
  running thing. This is the heavy end of the same scenario key, and it is exactly where the product's
  claim-verification behaviour has something to check against.

Setup guidance should scale the document ask to this, not present one flat list per scenario.

## Meeting notes and AI notetakers

Meeting notes and AI notetaker transcripts (for example Gemini, Granola, Otter) are useful context
across most scenarios, because the real expectations are usually agreed out loud before anything is
written down. They benefit most where the ground is about a spoken agreement or a spoken concern:
NEW_HIRE, NEW_MANAGER, NEW_ADVISOR, PIP, DRIFT, REALIGN_TEAM, and BOARD_STRATEGY. They add least to the
lightweight recurring scenarios (PULSE_CHECK, COHORT_CHECK), where the point is a quick fresh self-report,
not imported context.

## Future direction (note only, do not spec in detail)

Context-tuned scenario variants. Today a scenario key maps to one pack. In future, the same key could
adapt to the context it is used in. An engineering or technical delivery ground would probe delivery
differently (asking for the specific proof that something shipped) and ask for heavier evidence than a
general project ground. This could be done as new dedicated packs (for example a technical-delivery
variant of NEW_PROJECT and of DRIFT), or as context sensitivity inside the existing packs (the pack
adjusts its questions and its document ask based on a signal about the ground's domain). Either way it is
a bigger piece of work than this setup-guidance feature and is noted here as a direction, not specced.

## Related open decision (carried in from the scenario review)

CRISIS_ALIGNMENT as written is a numbers-and-decision-under-pressure pack, scoped away from relationship
and continuity events. It does not currently serve "a key person is leaving" or "a project is imploding,
get a shared picture fast, this is not yet a decision." That is an open product decision (broaden the
pack, route those cases to DRIFT, or add a new shared-reality scenario) and it affects both the label and
the document and cadence guidance above for that key. Flagged so the setup guidance for CRISIS is not
finalised until that decision is made.
