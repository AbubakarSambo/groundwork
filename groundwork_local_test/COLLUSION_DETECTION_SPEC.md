# Collusion Detection - Spec (for review, NOT built)

A rebuild of cross-party collusion detection. Replaces the inert `detectCollusion` (see
PATTERN_SYSTEM_INVENTORY.md: unreachable `UNANCHORED_RECALL` gate + generic term-overlap, wrong
signal). Spec only. The false-positive design (section 3) is the part to review hardest: get it
wrong and the feature accuses innocents.

Guiding principle: this detector RAISES A REVIEWABLE FLAG for an admin, it never concludes. Every
design choice below is biased toward "stay silent unless the circular-corroboration signal is
unambiguous", because a false accusation of collusion is far more damaging than a missed one that a
human would also struggle to see.

---

## 1. The signal - mutual vouching without independent anchoring

Collusion here = **two parties corroborate each other's claims, and the only evidence for those
claims is each other.** Three concrete parts, all required:

- **(a) Reciprocal vouching.** A's record positively affirms/credits B on a claim, AND B's record
  positively affirms/credits A on the same claim. One-directional praise is NOT collusion - that is
  just R3 (Named Collaborator, a positive signal). Reciprocity is mandatory.
  - Detectable against real data: each `RecordEntry.text` names the other party (by
    `user.firstName`/`lastName`, the same handles `detectForceMultiplier` uses) in an affirming /
    completion frame, on a shared claim.
- **(b) Same claim, treated as settled.** Both parties' records touch the same claim/topic and each
  frames it as done/agreed/delivered (completion framing, the `COMPLETION_WORDS` family). Two people
  discussing different things is not collusion.
- **(c) No independent anchoring.** The corroboration is circular - each other and nothing else.
  Concretely, NONE of these exist for that claim:
  - a `RecordEntry.evidenceType` of `DOCUMENT_AT_AGREEMENT` / `DOCUMENT_AFTER` on the claim (a
    document anchors it), or an attached `GroundDocument` covering it;
  - a THIRD participant (outside the pair) whose record independently references the same claim/work;
  - a named external user or third party outside the pair (the standard "who is using this without
    you" evidence the conversation engine already probes for).

If any independent anchor exists, the claim is corroborated by reality, not just by the pair - **not
collusion.** Independent anchoring is the whole discriminator; see section 3.

Non-goals: this does NOT detect one-sided inflation (that is the existing single-party D/B codes),
and does NOT judge whether the claim is true - only whether its ONLY support is reciprocal and
unanchored.

---

## 2. Detection mechanism - a CROSS-PARTY pass (the key departure)

The live pattern path analyses ONE party in isolation, which is structurally why it misses collusion
(PATTERN_SYSTEM_INVENTORY.md section 3). This detector must see BOTH parties together. Two layers,
mirroring the existing architecture (cheap rule gate, then AI-judgment confirmation, then
three-period, then feed-only):

1. **Rule-based candidate gate** (cheap, over each pair in a ground):
   - reciprocal name-mention between A and B (A's text names B AND B's text names A), AND
   - completion/agreement framing on a shared topic (noun overlap on a claim both mark settled), AND
   - the independent-anchor check from 1(c) returns NONE.
   Narrows thousands of honest pairs down to the few worth an AI look. Pairs failing any clause are
   dropped silently (no record, no cost).

2. **AI-judgment confirmation** (only on candidates - the nuanced call):
   A CROSS-PARTY prompt that receives both A's and B's records for the shared claim and judges, at
   the PATTERN level: "Do these two accounts corroborate the same claim only through each other, with
   no independent trace?" Same hard rules as `PATTERN_DETECTION_PROMPT` (emit only if genuinely
   present; pattern-level; never a verdict; never infer intent; one period is not a pattern). Output:
   `COLLUSION_RISK` + a plain, non-accusatory observation. This is the analog of `confirmDetection`,
   extended to a pair.

Write via the existing `observe()` path so COLLUSION_RISK inherits the CANDIDATE -> SURFACED
promotion and the three-period rule uniformly. Colocate in `PatternsService` (with the write /
three-period machinery), NOT `IntelligenceService`.

---

## 3. False-positive handling - genuine agreement must NOT flag (review this hardest)

Two honest people who genuinely agree will name each other, affirm the same claims, and sound
aligned. The ONLY reliable thing that separates them from colluders is **independent anchoring** and
**reciprocal exclusivity**. Guards, strongest first:

1. **HARD GATE - independent anchor exempts the pair.** If either party's claim is anchored by a
   document, a third party's independent record, or a named external user (1c), NEVER flag - full
   stop, before any AI call. Genuine work leaves traces outside the two people doing it. This gate is
   the feature's spine; everything else is secondary.
2. **Reciprocity required.** One-directional credit is R3, not collusion. Both directions on the same
   claim, or no flag.
3. **Sustained over 3+ periods (three-period rule).** A single period of mutual agreement is normal
   collaboration. Only a pattern that repeats across 3 consecutive periods with never any independent
   anchor is a candidate. Reuses existing machinery; transient agreement cannot flag.
4. **Genuine divergence is protective.** If the pair diverges anywhere (the cross-reference layer
   already surfaces contradiction), that is evidence of two independent accounts - weight strongly
   AGAINST flagging. Colluders align suspiciously completely; honest pairs disagree on details.
5. **Do NOT use "matching narrative / low specificity" as a trigger.** Honest aligned people also
   produce matching, vague summaries. This is the tempting-but-dangerous signal that would accuse
   innocents. At most a weak tie-breaker inside the AI call, NEVER a gate. Called out explicitly so a
   builder does not reach for it.
6. **The boundary is the ultimate FP safety (section 4).** Even a confirmed COLLUSION_RISK is a FLAG
   FOR ADMIN REVIEW, never an accusation, never shown to the accused, never in a report. A human
   makes the call with full context. A probabilistic adversarial detector is only deployable because
   its output is reviewable, not actioned. The detector's job is to say "these two are worth a look",
   not "these two colluded".

Design stance: prefer FALSE NEGATIVES over false positives. Missing a subtle collusion that a human
would also miss is acceptable; naming an honest pair as colluders is not.

---

## 4. Integration

- **Where:** the weekly per-ground cron, Monday 05:00, inside the existing `startNewPeriod` per-ground
  pass (`grounds.cron.ts`), AFTER the pair has >= 3 completed periods each. Add
  `PatternsService.analyzeGroundForCollusion(groundId)`; it runs the rule gate over pairs, AI-confirms
  candidates, and writes `COLLUSION_RISK` through `observe()`.
- **Why there:** it is the only place with all parties' records together on a per-ground cadence, and
  it already owns period boundaries and the three-period promotion. Not the daily single-party sweep
  (wrong granularity), not report time (detection should precede the report, and must not enter it).
- **Record:** `PatternDetection { code: 'COLLUSION_RISK', status: CANDIDATE->SURFACED via
  three-period, observationText: pattern-level + non-accusatory }`. Store on the ground; the pair's two
  participantIds captured in the observation/metadata for the admin, never rendered to them.

---

## 5. The boundary (NON-NEGOTIABLE)

COLLUSION_RISK must reach the admin alignment feed ONLY - never a live probe to the accused, never
the participant-facing report.

- **ADD** `'COLLUSION_RISK'` to `ALIGNMENT_FEED_ONLY_CODES` (`pattern-library.ts:84`), alongside
  `F5`/`E4`/`LOW_SPEC_MULTI_DIM`.
- **DO NOT ADD** it to `PATTERN_PROBE_BY_CODE`. No probe => the live conversation engine can never
  surface it to the person (context.service injects only codes that have a probe).
- Because it is feed-only, the two existing exclusions apply automatically: context.service's live
  surfaced-pattern query already excludes `ALIGNMENT_FEED_ONLY_CODES` (GW-07), and reports.service's
  evidence/concernFlags path already excludes feed-only codes (the E4/F5 precedent).
- **EXPLICIT HAZARD:** a plain SURFACED code that is NOT in `ALIGNMENT_FEED_ONLY_CODES` would flow into
  the report via synthesis rule 10 (concernFlags) - i.e. a collusion accusation printed in a shared
  report both parties receive. That is the exact boundary breach to prevent. Feed-only membership is
  what stops it; the tripwire (section 6) must prove it.
- Observation text is pattern-level and non-accusatory: e.g. "Two accounts corroborate the same
  claims across N periods with no independent evidence." NEVER "these people colluded" and NEVER a
  named accusation.

---

## 6. The tripwire (permanent, proven-to-bite)

- **Boundary (structural, CI-fast):** assert `'COLLUSION_RISK' in ALIGNMENT_FEED_ONLY_CODES` and
  `'COLLUSION_RISK' not in PATTERN_PROBE_BY_CODE`. Assert the live surfaced-pattern query
  (context.service) and the report evidence path (reports.service) both EXCLUDE it - i.e. a seeded
  SURFACED COLLUSION_RISK never appears in a live assembled prompt and never in a report corpus /
  concernFlags. Bite: remove COLLUSION_RISK from the feed-only set -> it leaks into the report -> red.
- **Behavioural (gated/nightly, real model for the AI-confirm part):** a seeded colluding pair
  (reciprocal vouching, no anchor, 3 periods) FLAGS COLLUSION_RISK; a genuine-agreement pair does NOT
  flag in each of two forms - (i) agreement WITH an independent anchor (a document or a third-party
  record), (ii) one-directional credit only (R3, not reciprocal). The genuine cases staying silent is
  the FP proof and matters more than the positive case.

---

## 7. Open questions for review (decide before build)

1. **Reciprocity test:** exact cross-name mention both ways (cheap, brittle) vs AI-judged mutual
   corroboration (robust, one more call)? Leaning AI-judged for the confirm, name-mention for the gate.
2. **"Same claim" matching:** noun/topic overlap for the gate vs AI-judged same-claim in the confirm.
3. **Anchor exemption scope:** does one independent anchor on ANY shared claim clear the whole pair,
   or per-claim? (Per-claim is stricter/more FPs; per-pair is safer. Leaning per-pair for safety.)
4. **Period bar:** keep the 3-period rule, or lower it because collusion is higher-stakes and rarer?
   (Lower bar = more FPs. Recommend keeping 3.)
5. **Cross-party visibility:** the AI confirm must see both parties' identities to judge reciprocity.
   This is an OFFLINE admin-side analysis (like report synthesis, which already reads all parties),
   NOT the live conversation - so it does not breach the live isolation wall. Confirm this is acceptable.
6. **Force-multiplier:** parked separately (positive, unconsumed). Delete, or wire as a real positive
   feature with its own consumer? Independent of this spec.
