# Product Decision: Two Scenario Prompt Systems

Not a code fix. This is the history and the options, for you to decide from.
No code changed.

## The two systems, and what each actually is

**System A — the rich per-scenario pack** (`SCENARIO_PACKS`,
`buildScenarioPackForParty`, plus every named block feeding it:
`STARTING_ROLE_QUESTIONS`, `DRIFT_OPENING`, `CRISIS_SCOPE_BOUNDARY`,
`RECOGNITION_INITIATOR`, `PULSE_CHECK_PACK`, `BOARD_STRATEGY_PACK`,
`COHORT_CHECK_PACK`, `PIP_PACK`, etc. — `api/src/modules/conversation/prompt-library.ts`).
Fully written, per-party (initiator vs. participant get different content),
covers every scenario with distinct, detailed instructions. **Not reached by
any live conversation today** — confirmed by tracing every call site.

**System B — the thin pathway system** (`buildIntakeBlock`,
`buildActivePathway`, `PATHWAY_QUESTIONS`, `selectPathwayNumber` — same file).
A single one-line opening question per scenario/party combination for session
1, scenario-blind structure for session 2+. **This is what every live
conversation actually runs today**, confirmed via `conversation.service.ts:480`.

## (a) Which system is the intended future?

**System B (the pathway system) is the one actually running, and the git
history shows it replaced System A deliberately — not accidentally.** This
isn't ambiguous from the evidence available; see (b).

## (b) Abandoned mid-migration, or retired on purpose?

**Retired on purpose, in a single clean commit — not a stalled migration.**

Traced via `git log -S` on the defining symbols in
`api/src/modules/conversation/prompt-library.ts`:

- `SCENARIO_PACKS` has existed since the very first commit (`f9639b0 init`).
- `buildScenarioPackForParty` (the per-party refinement of System A) was added
  later, in `74e4aa8` ("fix: updates", 2026-06-08).
- `buildActivePathway` and `PATHWAY_QUESTIONS` (System B, in full) were **both
  added together, in one later commit**: `ab207ef` ("update",
  2026-06-16, author AbubakarSambo).

That same commit's diff to `conversation.service.ts` is the decisive evidence.
Before it, the code was:

```ts
const [systemPrompt, dbScenarioPack] = await Promise.all([
  this.prompts.getActiveContent('system'),
  // Try a party-specific DB override first (e.g. "scenario.new_project.initiator").
  // Falls back to the code-generated party-filtered pack below.
  this.prompts
    .getActiveContent(`scenario.${ground.scenario.toLowerCase()}.${checkIn.participant.partyType.toLowerCase()}`)
    .catch(() => ''),
]);
const scenarioPack = dbScenarioPack || buildScenarioPackForParty(ground.scenario, checkIn.participant.partyType);
...
return [systemPrompt, scenarioPack, runtimeContext, ...].filter(Boolean).join('\n\n');
```

The commit changed it to:

```ts
const systemPrompt = await this.prompts.getActiveContent('system');
...
const intakeBlock = buildIntakeBlock({ scenario: ground.scenario, ... });
...
return [systemPrompt, intakeBlock, ...].filter(Boolean).join('\n\n');
```

`scenarioPack` — the entire System A fetch-and-fallback chain — was deleted
from the returned array in the same commit that introduced `buildIntakeBlock`.
This was a deliberate swap, done in one pass, by the same author, in the same
commit. It is not the signature of an interrupted migration (which would
typically show partial wiring, both systems half-coexisting, or a TODO). It
reads as: someone redesigned the intake mechanism and consciously replaced the
old one.

**What was not cleaned up**: the System A source code itself (all the named
packs) was left in `prompt-library.ts`, and — more consequentially — the
seed-generation code (`buildPartySeeds()`, `SEED_PROMPTS`) that writes System
A's content into the `PromptVersion` table under keys like
`scenario.pip.initiator` was **never removed**. `PromptsService.onModuleInit()`
(`api/src/modules/prompts/prompts.service.ts:31-49`) runs this seed loop **on
every application boot**, actively creating/versioning these 32 orphaned rows
each deploy — live, ongoing write activity for content nothing has read since
`ab207ef`. This part looks unintentional: leftover plumbing from the swap, not
a deliberate decision to keep seeding dead data.

## (c) If abandoned — wire in, or delete?

Since the evidence points to *deliberate retirement of the runtime wiring* but
*accidental non-cleanup of the authoring code and seed process*, the real
choice isn't binary "wire in vs. delete" — it's three options:

1. **Delete System A entirely.** Remove `SCENARIO_PACKS`,
   `buildScenarioPackForParty`, all the named pack constants, `buildPartySeeds()`,
   and their entries in `SEED_PROMPTS`. Stops the every-boot dead writes, removes
   ~600+ lines of unreachable code, and removes the 32 orphaned `PromptVersion`
   rows (or leaves them as historical/inert once seeding stops). This is the
   right move if System B's thinness (7 of 16 scenarios sharing one generic
   opener) is an accepted tradeoff, not a regression to fix.

2. **Wire System A back in**, replacing or supplementing `buildIntakeBlock`
   with the richer per-scenario content, restoring what `ab207ef` removed (or
   a modernized version of it — System A predates the `PRIOR_SESSION`/
   `RESOLUTION_STATE`/`leadSignals` context fields System B now carries, so a
   straight revert isn't a clean option; it would need reconciling with what
   System B added since). This is the right move if the thin pathway system
   was a step backward that should be corrected, not an intentional
   simplification.

3. **Leave it exactly as-is.** Possible if there's no appetite to touch this
   right now — but worth naming explicitly that this means the every-boot dead
   seed writes continue, and the ~600 lines of unreachable prompt content stay
   in the file as a standing trap for the next person who reads it and
   (reasonably) assumes it's live, the way this document's own first draft did.

No code has been changed for this note. Your call on which of the three.
