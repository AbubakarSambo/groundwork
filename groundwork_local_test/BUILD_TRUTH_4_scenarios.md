# Build Truth: Scenarios

This document exists to answer one practical question: **do personas need to vary
by scenario, or does one persona's behavior generalize across all 16?** Read
fresh, cited to file:line. Cross-references the report-synthesis mechanics
already covered in `BUILD_TRUTH_1` rather than re-deriving them.

Repo root for all paths below: `api/src/...` unless noted otherwise.

---

## 1. Every scenario, and its defaults

**`GroundScenario` — 16 values** (`api/prisma/schema.prisma:38-55`, no per-value
doc comments): `NEW_HIRE`, `NEW_COFOUNDER`, `NEW_ADVISOR`, `NEW_PROJECT`,
`NEW_MANAGER`, `CONTRACT_RENEWAL`, `RECOGNITION`, `DRIFT`, `CRISIS_ALIGNMENT`,
`OKR_ALIGNMENT`, `WORKPLAN_BUDGET`, `PULSE_CHECK`, `REALIGN_TEAM`, `PIP`,
`BOARD_STRATEGY`, `COHORT_CHECK`.

**`GroundMoment` — 3 values, fully independent of scenario**
(`schema.prisma:58-62`): `STARTING` ("set expectations before the work
begins"), `RECOGNITION` ("acknowledge progress, name what has changed"),
`RESOLUTION` ("close a chapter, agree on what happened") — meanings from
`CreateGroundPage.tsx:33-38`. `CreateGroundDto.moment` is a required,
independently-chosen field (`create-ground.dto.ts:35-37`, no `@IsOptional()`),
written straight through in `create()` (`grounds.service.ts:90-91`) with **no
lookup table mapping scenario to moment anywhere**. A NEW_HIRE ground can
legally be created with `moment: RESOLUTION` if the caller sends that — nothing
enforces the "obvious" pairing.

**Default timeline, per scenario** (`DEFAULT_TIMELINE_DAYS`,
`grounds.service.ts:15-32`, a `Record<GroundScenario, number>` — TypeScript
forces every scenario to have an entry, so there's no runtime fallback):

| Scenario | Default days |
|---|---|
| NEW_HIRE, NEW_COFOUNDER, NEW_PROJECT, NEW_MANAGER, PIP, BOARD_STRATEGY, OKR_ALIGNMENT, WORKPLAN_BUDGET, DRIFT | 90 |
| NEW_ADVISOR | 365 |
| CONTRACT_RENEWAL, CRISIS_ALIGNMENT, REALIGN_TEAM | 60 |
| RECOGNITION, PULSE_CHECK, COHORT_CHECK | 30 |

Caller-supplied `timelineDays` always overrides this default — it's a fallback,
not a constraint.

**COHORT_CHECK is not structurally special.** `isMultiPartyScenario()`
(`grounds.service.ts:36-38`) always returns `true` for **every** scenario, with
the comment: "All scenarios support any number of participants... No hard-coded
per-scenario cap." No code anywhere branches on `scenario === COHORT_CHECK` for
party-count purposes — multi-party is available to all 16 scenarios equally.
COHORT_CHECK's only real differentiation is content-level (its own 30-day
default, its own end-states list, its own intake pack — see §2).

**Only 12 of the 16 scenarios have a picker card in the actual creation UI**
(`CreateGroundPage.tsx:17-30`):

| Card | Scenario | Tag |
|---|---|---|
| New hire | NEW_HIRE | Starting |
| New project | NEW_PROJECT | Starting |
| New board member | NEW_ADVISOR | Starting |
| New partner | NEW_COFOUNDER | Starting |
| Contract renewal | CONTRACT_RENEWAL | Renewal |
| PIP | PIP | Accountability |
| Goals & planning | OKR_ALIGNMENT | Planning |
| Pulse check | PULSE_CHECK | Recurring |
| New direction | DRIFT | Alignment |
| Board strategy | BOARD_STRATEGY | Leadership |
| Cohort check-in | COHORT_CHECK | Recurring |
| Other | REALIGN_TEAM | Other |

**Not reachable from the picker at all**: `NEW_MANAGER`, `RECOGNITION`,
`CRISIS_ALIGNMENT`, `WORKPLAN_BUDGET`. They have default-timeline and
end-state entries, but no card and no entry in `SCENARIO_FROM_LABEL`
(`CreateGroundPage.tsx:80-95`). **This matters directly for your persona
question**: a persona driving the actual product UI cold cannot produce these
four scenarios at all — they'd only ever appear via direct API calls or a
different entry point (worth checking `entry.service.ts` separately if you
need them tested).

The wizard itself is identical regardless of scenario chosen — same 6 steps
(scenario → billing → timeframe → participants → resolution → brief,
`CreateGroundPage.tsx:102-104`). The only scenario-conditional UI branch found
anywhere in the file is one NEW_HIRE-only empty-state hint (line 501).

---

## 2. What the AI actually asks differently, per scenario

**Correction, and the most important finding in this document.** An earlier
draft of this section quoted a large library of rich, scenario-specific prompt
text (`STARTING_ROLE_QUESTIONS`, `DRIFT_OPENING`, `CRISIS_SCOPE_BOUNDARY`,
`RECOGNITION_INITIATOR`, `PULSE_CHECK_PACK`, `BOARD_STRATEGY_PACK`,
`COHORT_CHECK_PACK`, `PIP_PACK`, etc.) as if it were live. **It is not.** Traced
precisely: `composeSystemPrompt` (`conversation.service.ts:409-568`) calls
`buildIntakeBlock` (line 479), which calls `buildActivePathway` (line 1971 of
`prompt-library.ts`) — and that is the *only* scenario-dependent content that
actually reaches the model. Every one of the richly-written packs above lives
in `SCENARIO_PACKS`/`buildScenarioPackForParty`, which are used **only** to
seed `PromptVersion` DB rows under keys like `scenario.crisis_alignment.initiator`
(`prompt-library.ts:2246-2264`) — and a full-file check confirms
`conversation.service.ts` never fetches a scenario-keyed prompt at all; the
only key it ever requests is `'system'` (lines 270, 426). The file's own
comment claiming "Runtime uses `buildScenarioPackForParty`" (line 1640) is
itself wrong — that function is never called from `conversation.service.ts`,
only from the seed generator inside `prompt-library.ts` itself. Likewise,
`WILLINGNESS_GATE_SCENARIOS` (`:1763`, listing DRIFT/RECOGNITION/CRISIS_ALIGNMENT)
is defined once and referenced nowhere else in the entire codebase — dead,
unrelated to the real willingness-gate fields (`willingnessConfirmed`, etc.)
already documented correctly in `BUILD_TRUTH_1`.

**What actually is live, precisely** (`buildActivePathway`,
`prompt-library.ts:1918-1962`, and `PATHWAY_QUESTIONS`, `:1799-1820`):

For **session 1 only**, a single one-line opening question is picked by
`selectPathwayNumber(scenario, partyType, relHistory)` (`:1880-1916`):

| Scenario | Initiator gets | Participant gets |
|---|---|---|
| NEW_HIRE | Pathway 14 — "Describe the situation. What is happening, from your point of view?" | Pathway 1 — "Before we build anything, I want to hear your version. What were you brought in here to do, and what does early success look like to you?" |
| NEW_COFOUNDER | Pathway 3 (both parties) — "What are you bringing to this, what are you responsible for..." | same, pathway 3 |
| NEW_ADVISOR | Pathway 14 | Pathway 5 — "What were you brought in to do - specifically..." |
| NEW_PROJECT | Pathway 14 | Pathway 8 — "What is your specific role on this project..." |
| NEW_MANAGER | Pathway 14 | Pathway 7 — "What problem were you brought in to solve..." |
| CONTRACT_RENEWAL | Pathway 14 | Pathway 19 — "What do you think is working well..." |
| RECOGNITION | Pathway 12 (both) — "What have you done... not currently reflected in your compensation..." | same, pathway 12 |
| DRIFT | Pathway 15 (both, unless relHistory=drifted → pathway 13) — "What has changed in this working relationship..." | same |
| CRISIS_ALIGNMENT | Pathway 14 | **Pathway 20 — the fully generic fallback**: "What is this ground about for you, and what would need to be true at the end of this period for you to feel it was worth doing?" |
| Everything else (OKR_ALIGNMENT, WORKPLAN_BUDGET, PULSE_CHECK, REALIGN_TEAM, PIP, BOARD_STRATEGY, COHORT_CHECK) | Pathway 20 for both parties | Pathway 20 |

So: **7 of the 16 scenarios get the identical generic opening question, for
both parties, with no distinction whatsoever** at session 1. CRISIS_ALIGNMENT's
participant also gets the fully generic question, despite the initiator side
getting something scenario-flavored. There is no live equivalent of a "scope
boundary" instruction anywhere — the participant-side content for
CRISIS_ALIGNMENT is literally indistinguishable from PULSE_CHECK's or PIP's at
this stage.

**Correction to an earlier draft of this section: "falls back to generic" is
not the same as "gets nothing," and it matters which one is true.** Traced two
of the seven (PULSE_CHECK and PIP) end to end, scenario selection through to
the literal prompt text:

1. `composeSystemPrompt` passes `scenario: ground.scenario` into
   `buildIntakeBlock` (`conversation.service.ts:480`) — the only place
   `ctx.scenario` is read in the whole file.
2. Neither PULSE_CHECK nor PIP has a `case` in any of the three mapping
   functions or in `selectPathwayNumber` — both fall to the same `default`
   branch in all four, producing identically: `SITUATION_TYPE: Starting`,
   `RELATIONSHIP_TYPE: relationship`, `RELATIONSHIP_HISTORY: new`, and
   `ACTIVE_PATHWAY: Pathway 20`.
3. That output is concatenated into the final prompt unchanged
   (`conversation.service.ts:567`). The literal string `"PULSE_CHECK"` or
   `"PIP"` never appears anywhere in it — confirmed, no line in
   `buildIntakeBlock` prints `ctx.scenario` raw.

**So: the scenario name/type itself is never given to the model, in any
form** — not the raw enum, not even a distinguishing generic label (`Starting`
is produced for 6 different scenarios including these two). **But real
inference material does exist**, just not scenario-shaped: `GROUND:
${ctx.groundLabel}` and `ADMIN_BRIEF: ${ctx.adminBrief}` (`prompt-library.ts:1978,
1986`) are free text the initiator wrote at ground creation. If they wrote "PIP
for Sarah — missed two delivery deadlines" as the brief, the model has real,
organic signal — the same way a person reading that brief would. `PRIOR_SESSION`
(session 2+) works the same way. This is genuinely inference from content, not
from a structured hint — the model isn't told what kind of ground this is, it
reads what a human actually wrote and responds to that.

**This is confirmed as a degraded path by the system's own documentation, not
a designed inference mechanism.** `ENGINE_RULES` states directly
(`prompt-library.ts:1039`): *"ACTIVE_PATHWAY... is the most important field. A
missing or generic ACTIVE_PATHWAY produces a generic session."* The prompt's
own author calls this generic, not "the AI infers scenario-appropriate
framing." Whatever adaptation happens for PIP vs. PULSE_CHECK comes entirely
from the initiator's brief and the participant's own words — nothing in the
system is scenario-aware for these 7.

**One more dead/unwired detail, found in the same pass**: `ENGINE_RULES`
documents `SITUATION_TYPE` as one of `Starting | Recognition | Resolution |
Multi-party | Accountability` (`:1030`) — `Accountability` is obviously the
intended value for PIP — but `situationTypeFromScenario` never produces it
anywhere; PIP falls to the same `'Starting'` as a brand-new hire. The
documented design and the actual mapping function have drifted apart.

**Session 2 onward is entirely scenario-blind.** The rest of
`buildActivePathway` (lines 1927-1962) branches only on `sessionNumber` and
`lowSpecificityMultiDim` — never on `scenario`. The "last time you told us...
since then... today we are going to..." structure is identical prose for
every scenario at session 2+; only the specific facts slotted into it (drawn
from `PRIOR_SESSION`/`GROUND_STATE`, which are content, not scenario-shaped
templates) differ.

**What genuinely does vary by scenario, confirmed live**, all inside
`buildIntakeBlock`'s metadata lines (`:1975-1991`) via three small mapping
functions:
- `situationTypeFromScenario` (`:1822-1840`): a single label — `Starting` (6
  scenarios), `Recognition`, `Resolution` (DRIFT), `Multi-party`
  (CRISIS_ALIGNMENT), defaulting to `Starting` for the other 8.
- `relationshipTypeFromScenario` (`:1865-1877`): a single tag per scenario
  (`new_hire`, `cofounder`, `drifted_relationship`, etc.), defaulting to the
  generic `relationship` for 7 scenarios.
- `resolveRelationshipHistory` (`:1842-1863`): `new` (5 scenarios), `drifted`
  (DRIFT, CRISIS_ALIGNMENT — this also sets `PROTOCOL: FAILING_RELATIONSHIP` in
  the intake block, `conversation.service.ts`/`prompt-library.ts:1993`),
  `ongoing` (RECOGNITION, CONTRACT_RENEWAL), defaulting to `new` for the rest.

These are real, live, and do reach the model — but they are single-word/short-
phrase labels in a metadata block, not distinct question content. `RESOLUTION_STATE`
and `ADMIN_BRIEF` (from ground creation) are the other genuinely scenario-
adjacent inputs, but they vary by what the initiator typed, not by scenario
itself.

**Corrected conclusion for this section**: the AI does not ask meaningfully
different questions across most scenarios in practice. Real, confirmed
variation exists only for: NEW_HIRE/NEW_ADVISOR/NEW_PROJECT/NEW_MANAGER's
participant-side session-1 opener (each gets a different pathway question),
NEW_COFOUNDER and RECOGNITION (symmetric, own pathway), and DRIFT (own pathway,
plus the `FAILING_RELATIONSHIP` protocol tag shared with CRISIS_ALIGNMENT).
Everything else — CRISIS_ALIGNMENT's participant side, and all 7 of
OKR_ALIGNMENT/WORKPLAN_BUDGET/PULSE_CHECK/REALIGN_TEAM/PIP/BOARD_STRATEGY/
COHORT_CHECK for both parties — asks the identical generic question at session
1, and identical scenario-blind structure from session 2 onward. The rich,
scenario-tailored prompt library exists in the codebase and is well-written,
but is disconnected from the live conversation entirely.

---

## 3. How the report itself differs by scenario

Confirmed: 16 scenarios collapse to **exactly 4 distinct report shapes**, via
`synthesize()`'s schema selection (`reports.service.ts:463-477`):

| Group | Scenarios | Schema |
|---|---|---|
| NEW_STARTING | NEW_HIRE, NEW_COFOUNDER, NEW_ADVISOR, NEW_PROJECT, NEW_MANAGER | `NEW_STARTING_REPORT_SCHEMA` |
| RECOGNITION | RECOGNITION | `RECOGNITION_REPORT_SCHEMA` |
| DRIFT | DRIFT, CRISIS_ALIGNMENT | `DRIFT_REPORT_SCHEMA` |
| Generic | CONTRACT_RENEWAL, OKR_ALIGNMENT, WORKPLAN_BUDGET, PULSE_CHECK, REALIGN_TEAM, PIP, BOARD_STRATEGY, COHORT_CHECK | generic `REPORT_SCHEMA` |

Each special schema keeps the base fields (`sharedPicture`, `agreements`,
`divergences`, `centralQuestion`, `inferences`) but **drops** the generic
schema's four org-diagnostic fields (`hiddenContributors`, `concernFlags`,
`specificityCauses`, `leadCalibrationNote`) in exchange for exactly one bespoke
structured field:

- **NEW_STARTING** adds `successDefinitions` (`prompt-library.ts:2037-2103`) — each party's verbatim words on what success looks like.
- **RECOGNITION** adds `askVsRecord` (`:2105-2169`) — the explicit ask, what the record shows, and the gap between them.
- **DRIFT** adds `driftTrace` (`:2171-2240`) — what was agreed at the start, what the record shows, the gap, and a `structuralCause` **constrained to an enum**: `role clarity`, `evidence standards`, `decision authority`, `unspoken expectation`. This is the most rigidly typed of the three additions.

**No separate system-prompt text per group** — confirmed via
`reports.service.ts:285-304`: one unconditional system prompt (`synthesisVersion.content`
+ the numbered SYNTHESIS RULES) is used for every scenario. The only
scenario-dependent value in the entire `synthesize()` function is which schema
object gets passed in — there is no additional freeform instruction like "for
drift grounds, focus on root cause." The schema's field descriptions are the
only steering mechanism.

**The 8 generic scenarios get literally identical report structure and
identical instructions** — confirmed, no exceptions found. What varies for
them is only the content fed in (the ground's own `brief`/`resolutionState`
context and the actual check-in records), never the report's shape or framing.

---

## 4. Does scenario touch extraction, scoring, or pattern detection?

No — this is where scenario differences stop. Confirmed scenario-agnostic:

- **Record-entry extraction**: `RECORD_EXTRACTION_PROMPT`
  (`prompt-library.ts:1263-1274`) is one static string with no scenario
  token anywhere. `extractRecordEntries()` takes no scenario parameter.
- **Specificity scoring**: `scoreSessionSpecificity()`
  (`conversation.service.ts:851-889`) never reads `ground.scenario`.
- **Pattern detection**: `pattern-library.ts` has zero references to
  `GroundScenario` anywhere. All codes (D1-D8, B1-B12, K1-K5, E1-E5, R1-R4,
  including the F-codes, "senior-hire composite signals") fire uniformly on
  every ground via the generic `DETECTORS` map — **not gated to the
  NEW_STARTING group** despite the F-codes' name suggesting they might be.

**The one place scenario is hard-branched outside intake**: resolution
end-states. `endStatesFor(scenario)` (`api/src/modules/resolution/end-states.ts:8-109`)
genuinely differs — NEW_HIRE offers KEEP/RESTRUCTURE/EXIT/EXTEND/NOT_YET; PIP
offers RESOLVED/EXTENDED/SEPARATED/NOT_YET; RECOGNITION offers a simple
YES/NO/NOT_YET; each of the other 13 scenarios has its own distinct list.

**Net shape of the whole pipeline**: scenario differences are concentrated at
exactly two points — **intake** (what's asked, per §2) and **resolution
options** (what "done" can mean, per this section) — plus, separately, **report
schema** (per §3). Extraction, specificity scoring, and pattern detection sit
in the middle of the pipeline entirely untouched by scenario.

---

## 5. Answering the actual question

**Is NEW_HIRE genuinely different from PULSE_CHECK, or the same flow with a
different label?** At the **intake** level: barely. NEW_HIRE's participant gets
a distinct pathway-1 opener; PULSE_CHECK's participant gets the fully generic
pathway-20 opener. That's a real but thin difference — one different opening
sentence, then scenario-blind structure for the rest of session 1 and all of
session 2+. At the **report** level: yes, genuinely different — NEW_HIRE gets
`NEW_STARTING_REPORT_SCHEMA` (with `successDefinitions`); PULSE_CHECK gets the
generic schema. So the honest answer is split by stage: barely different
conversations, meaningfully different reports.

**Which scenarios are most different from each other?** RECOGNITION remains
the most structurally distinct — the only scenario with a symmetric,
same-pathway-for-both-parties session-1 question (pathway 12) but a fully
independent report field (`askVsRecord`) and a binary YES/NO end-state.
DRIFT is the only scenario with its own dedicated pathway (13 or 15) **and**
its own report field (`driftTrace` with an enum'd `structuralCause`) **and**
a live protocol tag (`FAILING_RELATIONSHIP`) — the most consistently
scenario-aware experience end to end. CRISIS_ALIGNMENT, despite sharing
DRIFT's report schema, has by far the thinnest live intake distinction of any
"special" scenario — its participant-side question is byte-for-byte identical
to seven other scenarios' generic fallback.

**Does any scenario change what the AI asks, how it scores, or what the
report emphasizes?** What it asks: genuinely, only a little — one different
opening line for roughly 9 of 32 party/scenario combinations (per §2's table),
everything else identical. How it scores: no — extraction and specificity
scoring are scenario-blind (§4). What the report emphasizes: yes, meaningfully,
but only in 4 buckets (§3), not 16 — and 8 of the 16 scenarios get a
completely generic report with zero scenario-specific emphasis.

**For persona planning, corrected**: the intake layer does not need 8-9
persona flavors — it barely varies at all once you look past the single
opening line, so **one generic persona behavior genuinely does generalize
across most of the 16 scenarios for intake purposes**, with the exception of
NEW_HIRE-family/NEW_COFOUNDER/RECOGNITION/DRIFT's distinct session-1 openers
(worth a quick check that the persona responds sensibly to each, since they
are real one-time differences). Where scenario variation genuinely earns
separate personas is the **report layer**: build around the 4 report-schema
buckets (NEW_STARTING, RECOGNITION, DRIFT, generic), since that's where
distinct fields, distinct emphasis, and distinct downstream framing actually
live. That's **4 persona flavors for report coverage**, not 8-9 — the earlier
draft's higher estimate was built on prompt content that turned out to be
dead code. If you want to also confirm the thin intake differences work as
intended, add 3-4 short spot-checks (a NEW_STARTING-family opener, RECOGNITION
asker vs. recipient, DRIFT) rather than full separate personas for each.

**One practical note for whoever writes personas against the 7 generic-fallback
scenarios**: since the model gets no scenario signal at all beyond the
ground's own `label` and `brief`, a persona testing PIP/PULSE_CHECK/
OKR_ALIGNMENT/etc. needs a **realistic, situation-specific brief written at
ground creation** to get a scenario-appropriate conversation at all — an
empty or generic brief will produce a genuinely generic session (per
`ENGINE_RULES`'s own admission, `prompt-library.ts:1039`), not an
adaptively-inferred one. The persona's realism has to be carried in what the
initiator writes at setup, not assumed from the scenario picker choice alone.

---

## Summary of open UNCLEARs

- **Why does the codebase contain an entire second, richly-detailed
  scenario-prompt system (`SCENARIO_PACKS`/`buildScenarioPackForParty`,
  hundreds of lines) that is never called from the live conversation path?**
  This reads as an abandoned migration — the comment at `prompt-library.ts:1640`
  claims runtime uses it, but it doesn't. Worth asking directly: was
  `buildActivePathway`/`PATHWAY_QUESTIONS` meant to be temporary/a fallback
  that never got replaced, or was the rich pack system deprecated in favor of
  the thinner pathway system and the comments/dead code just never got
  cleaned up? This changes whether "wire the packs in" is a bug fix or
  resurrecting something intentionally retired.
- Whether `NEW_MANAGER`, `RECOGNITION`, `CRISIS_ALIGNMENT`, and
  `WORKPLAN_BUDGET` are reachable through any UI path at all, or only via
  direct API calls — they have full backend support (defaults, end-states,
  report schema membership) but no picker card.
- Whether the tool-schema field descriptions alone (with no accompanying
  freeform system-prompt text — confirmed in §3, one shared system prompt for
  all scenarios) are a reliable enough steering mechanism for the three
  special report schemas, or whether report quality for
  NEW_STARTING/RECOGNITION/DRIFT grounds should be spot-checked against the
  generic ones to confirm the schema-only approach actually produces the
  intended emphasis.
