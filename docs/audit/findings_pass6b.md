# Pass 6b. The promise audit

68 claims extracted from the marketing site, the in-product Connect page, the lead's guide, the API
terms, the sign-up copy and the situation catalogue.

| Verdict | Count |
|---|---|
| Delivered | 44 |
| Partly delivered | 16 |
| **Not delivered** | **5** |
| Delivered but not findable | 3 |

Every "Not delivered" claim is a Blocker by the audit's own rule.

## The five claims the product does not deliver

| # | Claim, in its own words | Where it is made | Finding |
|---|---|---|---|
| 8 | "Groundwork never shows anyone's raw answers" | how-it-works.astro:89 | P6B-001 |
| 13 | "% document-backed" on the participant page and board | index.astro | P6B-002 |
| 22 | "They cannot request an individual's check-in, and there is no screen anywhere that shows one, including ours." | index.astro:367 | P6B-004 |
| 45 | "Cancel from the billing page and your subscription ends at the close of the billing period." | pricing.astro FAQ | P6B-011 |
| 47 | "You can still run Grounds on the free plan (up to 10 total)." | pricing.astro FAQ | P6B-012 |

## Delivered but not findable, each Major by the rule

| # | Capability | Finding |
|---|---|---|
| 66 | The lead's guide, which says "Send this link to your team" but sits behind an admin-only link inside the signed-in app | P6B-018 |
| 69 | The only contact route on the About page is a mailto, which the pricing page's own source says was removed there for being broken | P6B-019 |
| 70 | WhatsApp check-ins, the embedded panel, patterns, webhooks and the ops back office appear nowhere on the marketing site | P6B-020 |

Prices were checked figure by figure. Starter $25 for 5, Small Team $90 for 20, Growth $400 for 100,
Business $900 for 250, Scale $1,650 for 500, Enterprise contact us. Every one matches what the app
charges today. The risk is P6B-010, not the current numbers.

---

## Findings

```
ID: P6B-004
Severity: Blocker
Axis: Security
Location: api/src/modules/grounds/grounds.controller.ts:566-570, api/src/modules/grounds/grounds.service.ts:4163-4200
Observed: GET /grounds/:id/conversation returns every participant's raw conversation turns, grouped
  by party, with participantId, email, partyType and the full content of every turn. The only gate
  is `where: { id: groundId, initiatorId: requestingUserId }`, which is the lead.
Expected: "Leaders get the report. They cannot request an individual's check-in, and there is no
  screen anywhere that shows one, including ours." index.astro:367. And "What an admin can see:
  ...Never anybody's check-in itself." LeadsGuidePage.tsx:68-72.
Impact: every participant. This is the promise the product is sold on and the reason a person
  answers honestly. No client screen calls the route, so the "no screen" half is literally true.
  The "cannot request" half is false: the route is live, it is in the generated API reference, and
  any lead with a browser console can call it.
Evidence: verified directly. Controller summary reads "(initiator only)". Service selects
  `conversationTurn.findMany({ select: { id, role, content, createdAt } })` per participant, with
  participant email alongside.
Confidence: High
```

```
ID: P6B-002
Severity: Blocker
Axis: Data integrity
Location: api/src/modules/reports/reports.service.ts:1326-1341
Observed: documentBackedPct counts record entries whose evidenceType is DOCUMENT_AT_AGREEMENT or
  DOCUMENT_AFTER. A repository-wide search finds zero writes of evidenceType anywhere in api/src.
  The only reads are reports.service.ts:1326,1337 and patterns.service.ts:440,472, and the schema
  default is CHECK_IN. The previous writer was deleted, documents.service.ts:443-452 records that
  it was, and nothing replaced it. The figure is structurally always zero.
Expected: the homepage shows four worked reports, each carrying a document-backed figure of 64%,
  83%, 29% and 76%.
Impact: the number is rendered to users at GroundParticipantPage.tsx:666 and in board.service.ts
  as "N% of it is backed by a document". It gates a capability line that can never be true, and it
  permanently suppresses the strong coverage band, which requires above 30. A separate and working
  implementation exists in the-session-report.ts:384-385, so the same promise is true on one
  surface and false on another.
Evidence: verified. grep for evidenceType across api/src returns four reads and no writes.
Confidence: High
```

```
ID: P6B-011
Severity: Blocker
Axis: Bug
Location: api/src/modules/billing/billing.service.ts:564-577
Observed: cancelSubscription calls stripe.subscriptions.cancel(), which ends the subscription
  immediately with no proration, then nulls subscriptionPlan, subscriptionStatus, subscriptionStripeId
  and subscriptionPeriodEnd. cancel_at_period_end is never set. The controller's own summary says
  "Cancel the org subscription immediately."
Expected: "Cancel from the billing page and your subscription ends at the close of the billing
  period. No penalties, no questions."
Impact: anyone cancelling on day two of a month loses twenty-eight paid days and their seats at
  once, having read the opposite in writing on the page they bought from.
Confidence: High
```

```
ID: P6B-012
Severity: Blocker
Axis: Inconsistency
Location: api/src/modules/billing/billing.service.ts:173-197
Observed: canCreateGround counts every check-in the organisation has ever created and compares it
  to the free limit. It is a lifetime counter, not a remaining allowance. An organisation that
  created forty while subscribed and then cancels gets zero free ones, not ten.
Expected: "You can still run Grounds on the free plan (up to 10 total)."
Impact: a cancelling customer reads that the free plan is still open to them and finds it is not.
Confidence: High
```

```
ID: P6B-001
Severity: Blocker
Axis: Inconsistency
Location: marketing/src/pages/how-it-works.astro:89 against marketing/src/pages/index.astro:366
Observed: how-it-works states that raw answers are never shown. The homepage states the opposite,
  and the homepage is correct: report divergences carry direct quotes of what a person said about
  their own work. The guard that exists to stop exactly this sentence,
  the-site-does-not-promise-more-than-this.spec.ts:29, reads only index.astro, so the same false
  claim survives one page over.
Expected: the sentence to be removed, as it already was from the homepage.
Impact: a buyer or a participant who reads how-it-works and then reads a real report finds their
  own words quoted. The guard's docstring records that this sentence was removed once for being
  false, so the company already knows.
Confidence: High
```

```
ID: P6B-009
Severity: Major
Axis: Inconsistency
Location: api/src/modules/conversation/prompt-library.ts:3512, :3528
Observed: the assembled session-two opening prompt instructs the model to tell the participant
  "who has submitted, what the confidence score is, whether the alignment map has updated".
Expected: "Nobody is scored, ranked or watched", how-it-works.astro:89 and pricing.astro:218. "It
  is not a score, and it is not a grade out of five", how-it-works.astro:93.
Impact: a participant told their confidence score at the start of session two has been scored, in
  the exact words the site says will never be used. It is a prompt-level leak, so no structural
  guard on the report will catch it.
Confidence: High
```

```
ID: P6B-014
Severity: Major
Axis: Security
Location: marketing/src/pages/privacy-and-ai.astro:55 against api/src/modules/admin/admin.controller.ts:232-307
Observed: a platform admin can read per-user usage, per-organisation rosters with participant
  emails, check-in status and report state. Content is genuinely excluded and pinned by a test.
  Separately the repository's own PRIVACY-AND-AI-AUDIT.md records that anybody holding DATABASE_URL
  can read every check-in.
Expected: "Groundwork staff cannot access your OKRs, check-ins, team performance, evidence, or
  underlying organizational data. We only see information you deliberately send to us."
Impact: the sentence is broader than the code. Rosters, emails and completion state are
  organizational data. No test reads privacy-and-ai.astro, so nothing notices if the gap widens.
Confidence: High
```

```
ID: P6B-015
Severity: Major
Axis: User value
Location: api/src/modules/reports/counts-accounts.ts:16-62, api/src/modules/reports/deferrals.ts:260,275
Observed: "never says who said what about whom" is structurally enforced on the private guide, the
  manager board and name resolution. It is not structurally enforced inside the shared synthesis
  prose, where the only protection is a prompt line plus countsAccounts, which by design detects
  and warns and never rewrites.
Expected: the codebase's own standard, quoted in guide-sanitiser.ts: "a prompt is a request, and a
  model that complies most of the time is worse than one that never does".
Impact: the most load-bearing privacy promise rests, on the report body itself, on a model
  complying.
Confidence: High
```

```
ID: P6B-010
Severity: Major
Axis: Data integrity
Location: api/src/modules/billing/pricing.service.ts:99-115 against marketing/src/pages/pricing.astro
Observed: prices and seat caps are editable at runtime and read live by the app. The marketing page
  hardcodes them at build time. The guard compares the marketing page against a seed file that
  reproduces the migration values, not the live table.
Expected: the guard's own failure message asserts the page tracks what is charged.
Impact: the first time an admin changes a price the public site is wrong and every test still
  passes. A buyer reads one number and is charged another.
Confidence: High
```

```
ID: P6B-006
Severity: Major
Axis: User value
Location: api/src/modules/conversation/conversation.service.ts:3308-3345
Observed: a participant's next session is created only when they complete the current one. Nothing
  on a clock creates a missed round. Reminders do send, but a person who never opens session one
  never receives session two.
Expected: "Groundwork runs regular check-ins and prompts people automatically when it is their
  turn, so you are not left chasing anyone."
Impact: the lead. The claim is that the product removes the chasing. A quiet participant's run
  silently stops advancing, and the report has fewer accounts than the lead expects.
Confidence: Medium
Check needed: open a fortnightly check-in with two people, complete one, leave the other untouched
  for four weeks, and confirm whether the silent one is ever given session two.
```

```
ID: P6B-008
Severity: Major
Axis: User value
Location: api/src/modules/reports/reports.service.ts:649-696, :1715-1717
Observed: the closing synthesis delivers objectives against delivered, expectations changed,
  evidence and the complete history. There is no field and no producer for "the key decisions" or
  for "what was learned".
Expected: the closing report contains all six named parts.
Impact: four of six land. The two missing are the parts a leader would quote in the next
  conversation.
Confidence: High
```

```
ID: P6B-018
Severity: Major
Axis: Experience
Location: client/src/pages/org/LeadsGuidePage.tsx:38, client/src/App.tsx:504
Observed: /org/guide is linked from one place, behind an admin-only control. The page tells the
  reader to "Send this link to your team", but the route is inside the signed-in app, so a
  colleague who has not accepted their invitation cannot open it.
Expected: a guide meant to be sent to a team is readable by that team.
Impact: the page exists to brief people before their first check-in. A lead who is not an
  organisation admin cannot find it, and the people being briefed cannot read it.
Confidence: High
```

```
ID: P6B-020
Severity: Note
Axis: User value
Location: marketing/src/pages/, the whole site
Observed: WhatsApp check-ins, the embedded panel, the pattern detector, webhook delivery, the
  departure sweep, the Monday intelligence brief and the whole ops back office are mentioned
  nowhere. The words WhatsApp, panel, API and integration do not appear in marketing/src/pages/.
Expected: this is the inverse check, so nothing.
Impact: the two most saleable capabilities the product has, running a check-in over WhatsApp and
  embedding it in a customer's own product, are invisible to a prospect. A customer finds them
  only by opening the Connect page, which nothing on the site links to.
Confidence: High
```

Also recorded, lower severity: P6B-003 the EVALUATION board family deliberately omits the four-state
strip the homepage shows on a probation example; P6B-005 the marketing site says "Ground" three
times, a noun the product stopped using; P6B-007 "where expectations differ" is promised as a report
section and exists only as a count tile; P6B-013 the public coaching request writes a different
table from the in-product one and notifies nobody; P6B-016 "about ten minutes" is unmeasured, and
deliberately so; P6B-017 nothing detects a terms-version bump for an already-approved organisation;
P6B-019 the About page's only contact route is a mailto.
