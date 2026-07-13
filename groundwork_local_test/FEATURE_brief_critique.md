# Feature spec: Brief critique (currently misnamed `leadCalibrationNote`)

**Status: deliberately designed, accurate, half-built — uncommitted WIP, wired to no
surface.** This is a *different feature* from the lead-context input I intended (see
`FEATURE_lead_context_input.md`). It should be **renamed off `leadCalibrationNote`** so
the name is freed for the input feature.

## What it does

An AI **output** on the report: when a divergence between parties traces back to an
**ambiguous / missing / under-specified opening brief** — rather than a genuine
disagreement — it names that explicitly. It's a brief-quality diagnostic ("your setup,
not a real conflict, caused this gap").

## The exact behavior (verbatim, so it survives even if the uncommitted code is lost)

Lives in `api/src/modules/reports/reports.service.ts` (all **uncommitted**):

**Synthesis rule (rule 12 in the SYNTHESIS RULES string):**
> `12. NAME POOR INITIAL CALIBRATION WHEN IT IS THE ACTUAL SOURCE OF THE GAP. If a divergence traces back to an ambiguous or missing opening brief from the initiator/lead rather than a genuine disagreement between parties, say so explicitly in leadCalibrationNote. Leave it empty if the brief was clear.`

**`REPORT_SCHEMA` field `leadCalibrationNote` (the model-facing instruction):**
> `"If the divergences in this report trace back to an ambiguous, missing, or under-specified opening brief from the initiator/lead - rather than a genuine disagreement between parties - name that explicitly here. Empty string if the brief was clear and the gap is not attributable to how the ground was set up."`

**Assembly into the stored report:**
> `leadCalibrationNote: result.leadCalibrationNote ?? ''` (added to the `engagement` blob)

The `brief` it critiques does reach the corpus (`groundContextHeader`,
`reports.service.ts:231` → `INITIATOR'S OPENING BRIEF: ...`), so the model has what it
needs to judge.

## State (evidence)

- **Deliberately designed.** The rule and schema description are purpose-written to
  flag an under-specified brief as the source of a gap. Not an incidental side effect.
- **Never committed.** `git log -S'NAME POOR INITIAL CALIBRATION'` returns nothing; the
  rule/field/assembly exist only in the uncommitted working tree. The only committed
  trace was a comment in Option B (`7644438`, June) that called it an *"unrelated
  uncommitted schema field... out of scope for this change"* — later deleted by the D1
  commit (`02a596b`). So it has been flagged-out-of-scope WIP for months.
- **Wired to no surface.** When it fires it is written to `engagement` and returned by
  `get()` as part of the report blob, but **rendered in zero client components** — the
  only reference outside `reports.service.ts` is a type declaration
  (`client/src/types/index.ts`). No admin/lead view reads it. Same dead-end as
  `postReportGuide`: generated → stored → served → never shown.
- **Fires rarely.** Across 6 targeted vague-brief scenarios, 0 fired; only 1 non-empty
  example exists in the whole DB. The model is conservative about blaming the brief.
- **Accurate when it fires.** The one real example, against brief *"Verifying the whole
  flow end to end in a real browser"*:
  > *"The opening brief states the goal is 'Verifying the whole flow end to end in a
  > real browser' but does not define what 'the whole flow' includes or what 'verified'
  > means in terms of specific success criteria."*
  That is a correct, actionable observation — not noise.

## What finishing it would need

1. **A UI surface** so a lead actually sees it — an admin/lead-facing view (or a lead
   section on the report). Today the value is generated and thrown away.
2. **A visibility decision** — lead-visible (self-coaching about their own setup) vs
   internal-only. The one example reads developmental (critiques the brief, not the
   person), so lead-visible is defensible.
3. **A rename** off `leadCalibrationNote` — see below.

## Rename (required)

`leadCalibrationNote` collides with the intended input feature's name and mislabels an
AI output as if it were lead input. Rename to something that says "quality of the
brief," e.g. **`briefCalibrationNote`** or **`briefQualityFlag`**. The rename should
travel with the finish work (UI + visibility), not happen in isolation — see the parking
recommendation the spec author asked for.

## Note on entanglement

In the uncommitted working tree, this WIP shares `reports.service.ts` with the
`recommendedNextStep` addition to `postReportGuide` (a separate, delete-leaning item).
Acting on `postReportGuide` will require separating these two in the same file.
