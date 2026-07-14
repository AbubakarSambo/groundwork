# Master proposal: scenario reframe

**Status: PROPOSAL, approved-in-principle, not built.** Read-only spec. This is the single
source for the whole scenario reframe: new labels, new descriptions, recognizer sub-examples,
the CRISIS retirement, the report-card header rewrite, and the create-flow de-jargon. When
approved it is ready to build as one change.

## Hard rule for this whole change

**Keys and schema are untouched.** Every `GroundScenario` enum value stays. The scenario
packs (the questions each pack asks) stay. The `classifyIntent` routing keys stay. This is a
COPY and DISPLAY change plus one new display field (sub-examples), nothing in the data model
or the AI packs. All user-facing strings follow house style: no em dashes, no en dashes,
straight quotes only.

## What changes

1. Reframe every surfaced scenario's **label** and **description** to be action-focused and
   plain (fixes the three mismatches: DRIFT was mislabelled "New direction", REALIGN_TEAM was
   the "Other" catch-all, PIP was a bare acronym).
2. Add 2 to 3 **recognizer sub-examples** per scenario so people can self-select from concrete
   situations instead of abstract labels.
3. **Retire CRISIS_ALIGNMENT** from the surfaced set (its cases are absorbed by DRIFT and
   REALIGN_TEAM; its enum value and pack stay in code, reversible).
4. Separate **"Describe your own situation"** from REALIGN_TEAM so the catch-all and the real
   realignment scenario are distinct.
5. Rewrite the **report-card headers** ("What Groundwork saw" and friends) into plain language.
6. **Kill "contributor" and "on record"** in the create flow.

---

## Where the sub-examples render (confirmed against current code)

Both pickers today render a card as **label (bold) then description (sub-text)** and nothing
else:
- Create-ground: `<div>{label}</div>` then `<div>{desc}</div>` (CreateGroundPage).
- Entry /start: `<div>{label}</div>` then `<div>{detail}</div>` (EntryChatPage SITUATION_CARDS).

Neither card object has an examples field today. So sub-examples are a **new field on the card
data** (for example `examples: string[]`), rendered as a short third block directly **under the
description, inside the same card**. Small, muted, prefixed "e.g." or shown as two or three short
lines. No layout rework beyond adding that block. This is additive: label, then description,
then the recognizer lines.

---

## The scenario set: label + description + sub-examples

Keys in the left column never change. "Picker" notes where each is selectable today.

### NEW_HIRE
- **Label:** New hire
- **Description:** Get you and a new hire on the same page about the role, expectations, and what
  early success looks like, before anything drifts. You each answer separately; the report shows
  where you already match and where you do not.
- **Sub-examples:**
  - Someone starts Monday and you want to be sure you both mean the same thing by "doing well."
  - You just hired a senior person and need what they own pinned down before day one.
  - A new joiner and their manager each writing what success looks like in the first 90 days.
- Picker: create-ground, entry card, classify.

### NEW_PROJECT
- **Label:** New project
- **Description:** Line everyone up on scope, ownership, and what "done" means before the work
  starts. Each person answers on their own; the report shows the gaps to close first.
- **Sub-examples:**
  - Kicking off a build and you want scope and "done" agreed before anyone writes code.
  - A cross-team project where each team quietly assumes a different owner.
  - Starting work with a client and you want both sides' version of the goal on record.
- Picker: create-ground, entry card, classify.

### NEW_ADVISOR
- **Label:** New advisor or board member
- **Description:** Pin down what the advisor will actually contribute, on what terms, so
  "available" does not quietly stand in for "contributing."
- **Sub-examples:**
  - Bringing on an advisor for equity and you want it clear what they will actually do for it.
  - A new board member joining, each side writing what they expect from the relationship.
- Picker: create-ground, classify.

### NEW_COFOUNDER
- **Label:** New partner or co-founder
- **Description:** Put what each of you expects to build, own, and contribute in writing, before
  those assumptions collide.
- **Sub-examples:**
  - You and a co-founder splitting equity and roles and want the assumptions said out loud first.
  - A new equal partner joining the founding team.
- Picker: create-ground, classify.

### NEW_MANAGER
- **Label:** New manager or lead
- **Description:** Get clear on scope, reporting, and success for someone stepping into an existing
  team or role.
- **Sub-examples:**
  - An interim leader stepping into an existing team for six months.
  - A new manager taking over mid-project and you want scope and authority clear.
- Picker: classify only today. OPEN DECISION: add as a create-ground card too? (Would take the
  create picker from 12 toward 14 or 16.)

### CONTRACT_RENEWAL
- **Label:** Contract or renewal
- **Description:** Both sides give an honest account of how the term actually went, and what a fair
  next one looks like.
- **Sub-examples:**
  - A contractor's term is ending and you are deciding whether to renew.
  - An agency engagement up for renewal and you want an honest account of what got delivered.
- Picker: create-ground, classify.

### RECOGNITION  (SURFACE: currently an orphan, bring it into the picker)
- **Label:** Raise, promotion, or recognition
- **Description:** Build the evidence behind the ask before the conversation, and see how the
  decision-maker reads the same record, so you both start from the same picture.
- **Sub-examples:**
  - You are going to ask for a raise and want the evidence lined up first.
  - Someone is up for promotion and you want their record and your read to match before the talk.
- Picker: add to create-ground AND to the classifyIntent list (it is in neither today).

### DRIFT  (FIX MISMATCH: was mislabelled "New direction"; absorbs crisis work-cases)
- **Label:** Something's off track
- **Description:** Name what was agreed, what actually happened, and the exact gap, so a vague worry
  becomes something you can act on. Fits a person not delivering, a project that has slipped, or a
  partnership under strain.
- **Sub-examples:**
  - A project blew up or is badly behind and everyone has a different story about why.
  - A senior hire is not delivering what they were brought in to do.
  - Cash is tight and you need everyone seeing the same runway and what has to change.
- Picker: create-ground (relabelled), entry cards, classify.

### OKR_ALIGNMENT
- **Label:** Goals & planning
- **Description:** Check everyone is genuinely on the same goals and plan, and catch the gaps and
  overlaps before the cycle locks in.
- **Sub-examples:**
  - Planning season and you want to check everyone's goals actually connect before they lock.
  - Two teams whose objectives depend on each other and you are not sure the handoff is agreed.
- Picker: create-ground, classify.

### WORKPLAN_BUDGET
- **Label:** Workplan & budget
- **Description:** Check each person has actually built their plan and budget, and that it holds up
  against the resources available.
- **Sub-examples:**
  - Start of the quarter and you want each person's plan and budget to hold up against real resources.
  - A plan that looks fine on paper but you suspect the budget behind it was assumed, not approved.
- Picker: classify only today. OPEN DECISION: add as a create-ground card too?

### PULSE_CHECK
- **Label:** Quick check-in
- **Description:** A fast, repeatable read from each person: what is moving, what is stuck, what has
  changed. About five minutes.
- **Sub-examples:**
  - A fast fortnightly read from each person on what is moving and what is stuck.
  - You want a lightweight recurring signal without calling a meeting.
- Picker: create-ground, classify.

### REALIGN_TEAM  (FIX MISMATCH: was the "Other" catch-all; absorbs crisis people-cases)
- **Label:** Get a team back on the same page
- **Description:** You and your team see the situation differently. Each person gives their honest
  read before the group talks, so the conversation starts from a shared picture.
- **Sub-examples:**
  - The team is pulling two ways on a decision and you want each person's honest read before the meeting.
  - Priorities shifted and everyone is working off a different idea of what matters now.
  - After a reorg or a change, the team quietly disagrees about where things stand.
- Picker: create-ground (relabelled off "Other"), entry card, classify.

### PIP  (FIX MISMATCH: was a bare acronym)
- **Label:** Performance improvement plan
- **Description:** Run a fair plan with both sides on the same page: the concern, the support
  available, and what success looks like at the end.
- **Sub-examples:**
  - You are putting someone on a formal plan and want both sides on the concern and what success looks like.
  - A capability concern where you want a fair record, not a he-said-she-said.
- Picker: create-ground (relabelled), entry card, classify.

### BOARD_STRATEGY
- **Label:** Board & leadership strategy
- **Description:** Each leader gives their own read on strategy before the room debates it, so quiet
  disagreement shows up now, not after the decision.
- **Sub-examples:**
  - Before a strategy offsite, you want each leader's real read so quiet disagreement shows up early.
  - The board looks aligned in the room but you suspect it is not on one big bet.
- Picker: create-ground, classify.

### COHORT_CHECK
- **Label:** Cohort check-in
- **Description:** Many people in the same role each answer the same question on their own. See the
  pattern, who is on track and who is stuck, without them swaying each other.
- **Sub-examples:**
  - Twenty field officers each answering the same question so you can see the pattern.
  - A training cohort where you want to see who is on track and who is stuck without them influencing each other.
- Picker: create-ground, classify.

### CRISIS_ALIGNMENT  (RETIRE from the surfaced set)
- **Do not surface.** Not a label, not a create-ground card, not in the classifier (it is already in
  none of these, so this is zero code churn: just do not add it in the reframe).
- **Why:** its probes duplicate DRIFT (which already has a revenue, runway, 60-day variant) and
  REALIGN_TEAM (team pulled two ways). Its only unique trait is a scope rule that strips relationship
  and history context ("a decision session, not a relationship assessment"), which is the wrong
  instinct for the messy human cases people reach for it with.
- **Where its cases go:**
  - "A project blew up, everyone tells a different story" to DRIFT (the work is off track) AND
    REALIGN_TEAM (people see it differently). Covered by the sub-examples in both, above.
  - "Cash crunch, align fast on the call" to DRIFT (revenue sub-example, above).
  - "A key person is leaving" to HANDOVER (below), not here.
- **Reversible:** the enum value and the CRISIS pack stay in the codebase untouched. If it is ever
  wanted again, it is one line to re-add to a picker.

### HANDOVER  (PENDING NEW FAMILY: not built, key-person-leaving routes here)
- **Label (working):** Handover or someone leaving
- **Description (working):** Someone is moving on and you need what they know, own, and are mid-way
  through transferred before their last day, with both sides on what actually got handed over.
- **Sub-examples:**
  - Someone is leaving and you need what they know transferred before their last day.
  - A departure where a new hire is taking over, and the handover is their onboarding.
  - A senior person phasing out over a few months rather than a clean last day.
- Status: this is a NEW scenario family still in design (see the transition/handover structure
  exploration: one adaptive handover pack, leaver as initiator and receiver as participant, with
  receiver-type and arc length as parameters; the full leaver-plus-new-hire dual arc and the
  many-receiver redistribution case need new capability). Included here so "key person leaving" has
  a home and is NOT routed to CRISIS. Do not build the pack from this proposal; build it from the
  handover spec once that structure is approved.

### Describe your own situation  (SEPARATE from REALIGN_TEAM)
- **Label:** Describe your own situation
- **Description:** Not sure which fits? Describe it in your own words, add any context or documents,
  and we will set up the right ground for you.
- Behaviour today: in the entry /start flow this already exists as a first-class path ("My situation
  is different") that routes through classifyIntent and accepts pasted or uploaded documents, so
  making it inviting is copy only. In the create-ground flow it needs its own card separate from
  REALIGN_TEAM (today "Other" IS REALIGN_TEAM); cheapest version maps the card to REALIGN_TEAM's
  general pack and leans on the brief, a better version routes it through classifyIntent (small new
  wiring). This is the one spot in the reframe that is more than copy.

---

## Report-card headers (what every entry user sees at the payoff)

The `alignmentStatus` enum values stay as data keys; only their on-screen labels change, so the AI
schema is untouched.

| Current | Proposed |
|---|---|
| "What Groundwork saw" | "What we heard from you" |
| "Where your side stands" plus ladder `Unresolved, Mixed, Emerging, Clear, Aligned` | "How complete your account is" plus rung labels `Just started, Taking shape, Getting there, Clear, Shared (once the other side checks in)` |
| "...Aligned (only after the other party checks in). This reflects your side only." | "This is your side only. It becomes 'Shared' once the other person checks in too." |
| "Areas requiring alignment" | "What's still open" |
| sub-labels "Observation / Why it matters / Recommended move" | "What we noticed / Why it matters / What to do next" |
| "'Next session' is what Groundwork will surface for you to check" | "'Next time' is what we will check back on with you, not a to-do list" |
| one-glance keys "Settled / Open / Revisit / Risk" | "Settled / Still open / Worth revisiting / Watch for" |

---

## Create-flow copy: kill "contributor" and "on record"

The onboarding system prompt already bans this vocabulary, but the surrounding UI still uses it. Fix
the UI to match.

| Current | Proposed |
|---|---|
| "This shapes the questions each contributor answers." | "This shapes the questions each person answers." |
| "Add everyone who will check in. Contributors can be from different organisations." | "Add everyone who will take part. They can be from different organisations." |
| "Each contributor writes their own in their first session. The report shows where accounts agree and where they differ." | "Each person writes their own in their first session. The report shows where your accounts agree and where they differ." |
| Entry: "Your account is on record." | "Your answers are saved." |
| Scenario descriptions repeating "Both accounts on record" | "You each answer separately; the report shows where you agree and differ." |

---

## Notes and open decisions (do not build from these)

1. **UPDATE (2026-07-14): the shared-reality-under-acute-shock scenario is now BUILT** as
   ACUTE_SHOCK (label "A shock just hit", branch feat/acute-shock-scenario). Symmetric pack:
   first-hand account of the event, known-versus-assumed split, genuinely-at-risk versus
   apparently-at-risk, who is affected and not yet heard from, biggest unknown, where reads
   diverge, plus worry and tension. Explicitly NOT a decision session (decision pushes are
   recorded as an option raised and deflected back to the picture) and it states its lane
   boundaries against CRISIS, DRIFT, and REALIGN_TEAM in the pack text. In the create-ground
   picker (with sub-example recognizer lines) and the entry classifier. CRISIS stays
   retired-but-in-code, unchanged.
2. **HANDOVER is a pending new family**, specified separately. Its label and sub-examples are here so
   "key person leaving" has a home, but the pack is not built from this proposal.
3. **NEW_MANAGER and WORKPLAN_BUDGET** are reachable via entry classify but are not create-ground
   cards today. Open decision whether to add them as cards (would grow the create picker). Labels and
   sub-examples are ready either way.
4. **RECOGNITION** needs to be added to the classifyIntent scenario list as well as the create picker,
   since it is in neither today.

## What is explicitly untouched

- Every `GroundScenario` enum key.
- Every scenario pack (the questions the AI asks).
- The `classifyIntent` mapping keys (only RECOGNITION is added to the list; nothing is renamed).
- The `alignmentStatus` enum values and the report JSON schema.
- CRISIS_ALIGNMENT's enum value and pack (kept in code, just not surfaced).
