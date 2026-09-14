# Build plan: the conversation worth coming back to

Handover for the next workspace. Written 14 September 2026 at the end of a session that ran out of
budget. Everything below has been read in the code, not assumed. Line numbers are as of commit on
`product-only`.

Read `docs/the-conversation-worth-coming-back-to.md` first for why. This is how.

---

## Before anything: the state you are inheriting

- **PR #296 is merged.** All of it is on `main`, verified commit by commit.
- **PR #297 is open** on branch `product-only`, ~10 commits, everything from the 14 Sept session.
- **GitHub Actions is over budget on this account.** Every CI job fails in about three seconds with
  "The job was not started because an Actions budget is preventing further use." It is not the code.
  Run the checks locally: `npx tsc --noEmit`, `npx jest`, `npx vitest run` in `api/` and `client/`.
- **Production will not boot without `EMAIL_SENDS_FOR_REAL=true` and a real `RESEND_API_KEY`.** A
  spec now fails if a future boot blocker is added without reaching `.env.example`.
- A client starts 15 September. Tonight's invite-timing change means a lead can save setup without
  mailing anybody until the start date they chose.

---

## The one-line diagnosis

The conversation is extractive: the lead answers eight questions and receives a report about the
answers they just gave. A conversation people return to is a **trade** - every answer buys something
back inside the same turn.

Almost everything needed for that **already exists and is pointed at reports instead of at turns.**

---

# WAVE 1 - make it work

The lead came to set targets and track them. Today the number she says is discarded. This wave is
small and it is the difference between a report about her objectives and her objectives existing.

## 1.1 Keep the number

**Where:** `api/src/modules/conversation/conversation.service.ts`, `writeTheirOwnPromises`, the
`groundObjective.createMany` at ~5207.

```ts
data: aims.map((name, i) => ({ groundId, name, target: null, sortOrder: i }))
```

`target: null` is why the board says "No targets set yet" and "Movement: not tracked" after a lead
has said "500 contracts by December".

**Do NOT write a number parser.** The reader already exists:
`api/src/modules/board/what-the-record-says-a-number-is.ts` - `WHAT_THE_RECORD_SAYS_PROMPT`,
`theQuestion()`, `onlyWhatIsWorthOffering()`. Today it runs on ROUND_COMPLETED (`board.listener.ts`)
and needs a target to already exist to attach a number to. Extend the extraction that produces
`groundAims` to return `{ name, target, unit, by }` per aim, in one call, so the number arrives with
the name rather than being recovered later.

**Acceptance:** a session where somebody says "500 contracts by the end of the year" leaves a
`GroundObjective` with `target = 500`. Test it from the transcript, not from a unit call.

## 1.2 Remove the once-only gate

Same function: `if (existing === 0)`. Targets change, and a lead naming a second objective in
session 4 is silently dropped. Match on name instead and add what is new.

**Watch for:** do not overwrite a `count` a lead has set by hand on the board. That is theirs. See
the `suggestedCount` / `suggestedSaid` / `suggestedAtSession` columns - the board already has the
"the record shows X, not Y, press to accept" pattern and it is the right one for a conflict.

## 1.3 Per-person targets

"150 each" for three people is three owned targets. `GroundObjective.ownerParticipantId` already
exists (relation `ObjectiveOwner`) and `where-each-person-is-against-their-number.ts` already renders
per-person progress. Nothing new to model.

## 1.4 Confirm at the close

The close names what is about to be created and lets them fix it, before the report.
`client/src/pages/enter/EntryChatPage.tsx` - same place the invite-timing control went in tonight.

**Acceptance:** nobody ever reads a report saying targets were discussed while the board says none
are set.

## 1.5 Close measured against their first message

The lead's opening line states what they came for ("we are setting shared goals for this period").
The close, and the entry report's `honestClose`, answer that question: did you get it.

`api/src/modules/entry/entry.service.ts` - the report prompt is around line 220, the schema at 330.
Tonight's changes to it are the model for tone: see `what-they-declined-is-not-a-gap.ts`.

---

# WAVE 2 - the trade

This is the wave that changes how it feels. **No new engines.** Every source below is built, tested,
and currently only reaches a report.

## 2.1 The give-back block

Add one conditional block to the 30 already assembled at
`conversation.service.ts:2795`. It fires only when there is something true and specific to give, and
it is built from data, never from the model's guesswork.

| Trigger in what they just said | Source that already exists |
|---|---|
| They named a blocker | `GroundDependency` - who else named the same thing |
| They named a person | that person's record entries on this ground |
| They named a worry | `PatternDetection` - is this recurring |
| They gave a number against a target | `where-each-person-is-against-their-number.ts` |
| They named a date | other commitments landing that week |

**Rules, learned the hard way this session:**
- Never invent. `nothing-invented-reaches-them.ts` already screens names and numbers; the give-back
  must pass through it like everything else.
- Never cross the wall. `the-board-keeps-the-same-wall.ts` and the fairness-read boundary spec are
  the authority on what may be said about somebody else.
- One per turn at most, and never instead of the question.

**Acceptance:** rate ten real transcripts before and after. The question is whether the lead learnt
anything they did not already know.

## 2.2 Every scenario ends with something set

All 22 produce a target, an agreement, or a shared read. The scenario pack says which. A conversation
does not close without one. `scenario-prompt-wiring.spec.ts` is where to pin it.

---

# WAVE 3 - the prompt

Phase 0 and Phase 1 are done. `docs/phase-0-what-is-in-the-base-prompt.md` holds the list of all 44
blocks with two columns for Hafsah to mark.

**Hafsah's rule, non-negotiable:** nothing goes on the strength of being long. A block leaves only
when a spec already guarantees it, or it moves into code with a test written first.

## 3.1 Instrument first

Log which of the 30 blocks fired on each turn. Cheap, safe, and it turns the Phase 0 review from a
judgement call into a decision with evidence: blocks that never fire, blocks that always fire, blocks
that fire on turns that went badly.

**Do this before decomposing anything.**

## 3.2 Move shape into code

`ONE QUESTION RULE` is 19,081 characters, 16% of the base prompt, and is **already enforced** by
`one-question-per-turn.ts` on both the streaming and non-streaming paths. Verify the code covers the
whole rule, then remove the block.

`BANNED WORDS AND PHRASES` is 17,780 and is **partly** enforced by `presentation/outbound.ts`.
Establish the gap, close it in code, then remove.

Those two are 32% of the base prompt.

## 3.3 Decompose the rest

Three tiers: **Always** (identity, voice, safety - target under 15,000 chars), **When it applies**
(fires on a trigger like the other 29 blocks), **Code**. One block per commit.

## 3.4 Rebuild the 22 packs

From ~1,400 characters each to ~4,000, on the freed budget. Each gets: its opening, its follow-ups,
two example answers **in that situation's own nouns**, what a good answer looks like, what "set"
means here, and what to do when somebody has nothing to say.

The example rule is already written into `ENGINE_RULES` and has a spec. Examples come from what the
person has said, never from the file - a lead setting sales targets was once offered probation and
onboarding as examples and had to type "this is not about probation or onboarding" to escape.

## 3.5 A ceiling

A test that fails when the Always tier grows past its number, so the next fix has to choose what to
remove. This is the discipline that was missing: every past fix added instructions.

---

# WAVE 4 - memory and edge

- **Visible continuity.** Session 4 opens with what changed since session 3. The prior-session
  context already reaches the prompt (compressed to 800 chars in `composeSystemPrompt`) and is mostly
  unused.
- **Rising difficulty.** Session 1 generous; by session 6 it knows what this person overstates and
  can say so. Coaching already has the staircase for this.

---

## THE TRAP THAT CAUGHT US THREE TIMES IN ONE EVENING

**A fix lands on a path the person never takes.** Every one of these was written correctly and helped
nobody:

- `/start?new=1` made the page ask instead of silently restoring a stale setup. It worked. The three
  "Start a check-in" buttons on the check-ins list never passed it.
- The extraction that turns "500 contracts" into a target had run on the signed-in check-in since it
  was written. The entry commit, the path every lead takes first, never called it.
- Five shape guards, each built from a fault a lead hit on a real screen, all wired into
  `conversation.service`. The entry chat ran the invention screen and nothing else.

Each was found by running the product. Each could have been found by a test.

**There are two conversations here and a person meets the entry one first.**
`every-guard-reaches-every-conversation.spec.ts` asserts the guard list on both paths. Add a guard,
add it to that list. The give-backs are named there as a deliberate exception, with the reason: the
entry chat has no board to draw a fact from.

**The general rule: pin the wiring, not only the unit.** A test proving an extraction works is worth
nothing while nobody calls it, which is the whole of the second bullet above.

## Traps found the hard way this session. Do not relearn these.

1. **An instruction-only rule fails.** Three times this week a prompt rule lost to another prompt
   rule in the same file. If it is shape, put it in code and let the model write every word.
2. **The round rule had four copies and three were wrong.** One function now: `which-round-is-open.ts`.
   Never write a fifth.
3. **A spec pinned to a line of code is not a spec.** Two were rewritten this session for matching a
   literal string that a rename satisfied.
4. **Comments must be stripped before a source-assertion spec reads a file.** Enforced by
   `a-guard-that-a-comment-satisfies-is-not-a-guard.spec.ts`.
5. **`nest start --watch` serves stale code.** Restart it when a fix appears not to work.
6. **Prove at the output**, never from code structure: the assembled prompt, the rendered screen, the
   real transcript.
7. **Do not run the full jest suite after every edit.** Typecheck, run the module, run the suite
   before committing.

## Rules of the house

- **No PR unless Hafsah asks.** Commit and push, report, wait. Never merge.
- Plain language. No court language, no em dashes, never the word "account" in anything a person
  reads.
- Report issues as a table, never prose. Lead with the outcome.
- Fix what you find, including pre-existing breakage you hit on the way.

## How we know it worked

Not test counts. A small set of real transcripts, rated before and after each wave, against the
question Hafsah set herself:

> Did the lead get what they came for, and would they come back next week without being chased?
