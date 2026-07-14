# Feature spec: Lead context input

**Status: intended, never built.** This is the feature I actually wanted under the
name "leadCalibrationNote." It does not exist in any form. See
`FEATURE_brief_critique.md` for the different (half-built) thing that currently
carries that name.

## What it is

A lead (initiator) can **feed real-world context IN** so the synthesis has knowledge
the AI would otherwise never have. Two shapes:

- **About a specific person** — e.g. "Ben has been carrying the on-call rotation solo
  since March," or a document (a prior review, an org chart, a signed agreement) that
  bears on how to read that person's record.
- **About the ground** — context on the situation that isn't in anyone's check-in.

It is an **INPUT channel** — the lead adds knowledge; the synthesis uses it. (Contrast
with the existing `leadCalibrationNote`, which is an AI **output** critiquing the
brief. Opposite direction.)

## The gap: what reaches synthesis today (all ground-level or AI-derived)

The synthesis corpus's only non-record inputs are assembled in `groundContextHeader`
(`api/src/modules/reports/reports.service.ts`, ~227-238):

| Input | Source | Per-person? | Lead-supplied? |
|---|---|---|---|
| `brief` | `Ground.brief`, set once at ground creation | No (ground-level) | Yes |
| `resolutionState` | `Ground.resolutionState`, set at creation | No (ground-level) | Yes |
| `leadSignals` | `adminProfile.signals` — **AI-extracted from the lead's own past check-ins** (`SIGNAL_EXTRACTION_PROMPT`) | No | **No** — AI-derived |
| per-party `RecordEntry` | each party's own check-in + own uploaded docs | Yes | No (the person's own) |

**There is no mechanism for a lead to add context about a specific participant that
reaches synthesis.** Confirmed:
- **Documents** attach to `participant.id` via `assertParticipant(groundId, userId)`
  (`documents.service.ts`) — always the **uploader's own** record. A lead cannot
  attach a document *about* another person.
- **`roleAsDescribed`** is a lead-set per-person field (a short role label set at
  invite) but it feeds **only the report's party labels** (`labelById`,
  `reports.service.ts:247-265`), never synthesis content — `roleAsDescribed` is never
  read as context.
- The many `GroundParticipant` text fields (`roleIntent`, `compensationAsk`,
  `stressTolerance`, …) are the **person's own** answers, not lead notes about them.

## Real foundations to build on (mapped, verified)

1. **The document → RecordEntry → corpus pipeline is the strongest reuse.**
   `documents.service.ts` already: uploads a doc → `extractAndStoreClaims()` →
   `RecordEntry` rows → which the synthesis corpus reads
   (`recordEntry.findMany({ where: { participant: { groundId } } })`). To carry lead
   context it needs: (a) a **lead-can-attach-about-a-participant** variant (today
   `assertParticipant` scopes to the uploader), and (b) a corpus **label** that
   distinguishes lead-supplied context from the person's own words, so the AI weighs
   it correctly and never presents it as the person's own claim.

2. **`roleAsDescribed`** proves the invite flow can already carry lead input about a
   specific person. A sibling field (e.g. `leadContext`) could extend it — the plumbing
   for "lead types something about participant X" exists.

3. **`groundContextHeader`** is the exact slot where ground-level lead input
   (`brief`/`resolutionState`) enters the corpus. Per-participant lead-context lines
   would slot in the same construction.

## Net-new work

- A **per-participant lead-context store** (field and/or lead-attached document), and
- A **corpus slot** for it — the corpus has slots for ground-level and per-party-own
  context, but **none for lead-supplied context about a participant**. That is net-new.

## Open design decisions (must resolve before building)

- **Privacy / the trust wall.** The product's model is that a party's record is theirs
  and synthesis reads each party's own words. Lead-supplied context *about* a person is
  a new data class the person did not author. Decide: does that person see what the lead
  added about them? Is it attributed? Does it violate the "shared intelligence only from
  the person's own channel" wall? This is the load-bearing decision.
- **Weighting.** How synthesis should treat lead context vs the person's own record when
  they conflict (the corpus label from foundation #1 is where this is enforced).
- **Scope of input** — free-text note, document, or both; per-person, per-ground, or both.
