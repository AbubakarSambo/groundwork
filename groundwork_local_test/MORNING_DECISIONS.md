# Morning decisions — items waiting on your call

## FIX 3 — mangled session-1 opener ("It's about for you") — VERIFIED STALE, NO FIX NEEDED

**Verdict: closed. The bug does not reproduce on today's code.** Did NOT implement
option B or C, per instruction.

**How verified:** ran 6 live session-1 openers on current pack code (real Gemini
generations, same prompt assembly `open()` uses: `ENGINE_RULES + buildIntakeBlock(ctx)`
+ `<<BEGIN_CHECK_IN>>`), across PULSE_CHECK/participant, NEW_PROJECT/participant,
NEW_HIRE/participant, CRISIS_ALIGNMENT/participant, REALIGN_TEAM/initiator,
NEW_HIRE/initiator. **All six first lines were well-formed sentences.** Examples:

- PULSE_CHECK/participant: *"This is our Q2 pulse check... To start: what's one thing
  that's going well right now?"*
- NEW_PROJECT/participant: *"This is the ground for the new Data Platform kickoff
  project. We're here to build your record of it... What did you understand your role
  in this to be - in your own words, before anyone else's version?"*
- REALIGN_TEAM/initiator: *"This ground is for each of you to capture your own
  independent view of the team's direction before you all align as a group."*

**Why it was stale:** the original mangle (*"It's about for you"*) was the model
paraphrasing `PATHWAY_QUESTIONS[20]` (*"What is this ground **about for you**..."*).
That transcript was ≤2026-07-09 data, from **before** the scenario packs were wired
into `buildActivePathway`. Current code uses the packs at session 1, which ask
different, well-formed openers (PULSE_CHECK now opens on "what's going well", never
touches pathway-20). The paraphrase-of-pathway-20 failure mode no longer exists on
the live path.

**One minor cosmetic note (not the bug, not blocking):** NEW_HIRE/participant produced
*"...in your own words-before anyone else's version-what did you understand..."* — the
hyphens are FIX 1 normalizing the model's em dashes; grammatical but the double
`word-word-word` compound reads slightly clunky. Cosmetic only.

**Decision needed from you:** none. Logged for the record. FIX 3 is done.

---

## (No other decisions currently pending.)

FIX 1 (typography in streamed deltas), FIX 2 (truncation floor + thinking budget),
and DECIDE 4 (record-narration → demonstrate-heard) are all implemented, proven, and
committed — no morning input required on those.
