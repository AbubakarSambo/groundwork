# Feature spec: Post-report guide (honest state + wire-up brief)

**Status: generation BUILT and accurate, but FULLY UNWIRED both directions, and now GATED
OFF.** This is a real, deliberately-designed feature that produces good output nobody can
see, and paid a Gemini call per participant per release to do it. The spend is now gated
off (`POST_REPORT_GUIDE_ENABLED`, default false). This doc is the build brief to finish it
later — it is a proper build, not a display-add.

## What it is (and why it's worth finishing)

A per-participant **bridge into the next session**. Groundwork's sessions recur, so after a
report releases, each party gets private coaching for what comes next — three fields:

- **`openingLine`** — a grounded, non-defensive line to open the next real conversation.
- **`questionToCarry`** — the genuine unresolved thread to hold between sessions.
- **`toAcknowledge`** — one concrete thing from the other side to recognize.

This matches how people actually use the product (recurring check-ins), which is why it's
worth wiring rather than deleting.

## Verified state (checked against origin/main, not assumed)

**Generation works and is accurate.**
- `generatePostReportGuides()` builds `{shared synthesis + this party's record}` and calls
  `anthropic.extract` with `POST_REPORT_GUIDE_SCHEMA` (all three fields required).
- 8 of 15 stored reports have guides. Real stored example (party's own view):
  > *open:* "This report was helpful. It seems clear we both see the tension between the
  > roadmap and the strategy as a problem for us to solve together."
  > *acknowledge:* "I want to acknowledge the pressure that comes from having committed the
  > enterprise dashboard to three of our largest clients."
  > *question:* "The report asks what our process should be for re-evaluating commitments.
  > What do you think is most important to get right in that process?"
  Specific, on-tone, grounded in the record. Not noise.

**It is unwired in BOTH directions.**
- *Display:* no client component renders `report.postReportGuide`. The read path serves it
  (per-party scoped, `GW-PRI-06`-tested), but `questionToCarry`/`toAcknowledge`/`openingLine`
  reach no UI. Only a type declaration references it.
- *Opener:* the next-session opener is prompt-driven (`PATHWAY_QUESTIONS` + self-correction
  / returning-person guards in `conversation.service.ts`). It references the guide
  **nowhere**. `openingLine` does **not** feed the next session's first turn.

**Cost.** `generatePostReportGuides` is called once, from `release()`, and makes **one**
Gemini `extract` call per participant (best-effort). So it is **1 call per participant per
release** — spent entirely into a void, since nothing renders or consumes the result.

## Claims I could NOT verify (flagged honestly)

- **"2 Gemini calls per participant per release."** Not supported by the code: one call
  site (`release()`), one `extract` per participant → **1/participant/release**, not 2.
- **"Partial-write bug dropping 2 of 3 fields on release."** Not reproduced in origin/main.
  The generator stores the full 3-field object (`guides[participantId] = result`) and the
  read-back returns the full object; the one real stored example has all three fields. No
  code path persists or reads a subset of the three fields.
  - The one real **write-ordering risk** found instead: `synthesize()` writes the whole
    `engagement` blob (`report.upsert`, ~L747-765) *without* `postReportGuides`. If a report
    is re-synthesized after guides were written, that write **drops the entire guides map**
    (all parties), not "2 of 3 fields." Worth handling during wire-up, but it's a different
    bug than reported. If a genuine per-field partial write was observed in prod, it isn't
    in committed code — capture the offending record before building on the claim.

## Current state: generation GATED OFF

`generatePostReportGuides()` early-returns unless `app.postReportGuideEnabled`
(`POST_REPORT_GUIDE_ENABLED`, default false). Stops the per-release spend without deleting
anything. Guarded by `post-report-guide-gate.spec.ts` (off → zero model calls / zero
writes; on → still fires). Release is unaffected — the call was already best-effort
(`.catch`), so a skipped generation cannot block report delivery (proven: privacy /
release suites green with the gate on).

## Wire-up (a proper build, not a display-add)

1. **Settle the write-ordering.** Ensure re-synthesis does not silently drop
   `postReportGuides` (merge, or regenerate guides after any engagement rewrite). Confirm
   with a real re-synthesis, not just a unit mock.
2. **Build the participant-facing display.** Render `report.postReportGuide` as a
   participant-only section on the report view (the data is already served, per-party
   scoped; mirror the existing `soloArtifact` participant section). Drop the phantom
   `recommendedNextStep` field from the client `Report` type (server emits only 3), and
   normalize curly apostrophes before rendering (house style).
3. **Wire `openingLine` into the next-session opener.** This is net-new: the opener is
   currently `PATHWAY_QUESTIONS`/prompt-driven and reads nothing from the guide. Feeding
   `openingLine` (or at least `questionToCarry` as next-session focus) into the opener is
   real conversation-engine work, and needs its own proof at the assembled opener prompt.
4. **Flip the flag** (`POST_REPORT_GUIDE_ENABLED=true`) only once 1–3 land, so generation
   resumes exactly when something consumes it.

## Recommendation

Finish it — the value (a bridge into the recurring next session) is real and the generation
is proven — but treat it as a proper build across display + opener + the write-ordering fix,
not a quick render. Until then it stays gated off and costs nothing.
