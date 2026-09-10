# Pass 4, flows g and h: the machine API and billing

Machine API cross-organisation isolation is clean. Every handler passes the token's own
organisationId and no route takes an organisation from the path or body. The defects below are
about the per-person fence inside an organisation, and about money.

```
ID: P4-H01
Severity: Blocker
Axis: Bug
Location: api/src/modules/conversation/conversation.service.ts:630-640 and :733
Observed: on a metered check-in the session balance is decremented at line 636, and the model is
  called at line 733, roughly a hundred lines later. The model call is not wrapped in a try/catch
  and there is no compensating increment anywhere. Verified: `sessionsBalance` appears six times
  in the file and the only write is that decrement.
Expected: the meter is charged when the work succeeds, or reversed when it does not.
Impact: a model timeout, rate limit or error leaves the balance one lower with no AI turn written.
  The person sees an error and retries. The two guards that would stop a second charge both look
  for an AI turn, and no turn was written, so the retry decrements again. Every failed attempt
  burns another paid session, silently, until they are told they are out of check-ins they never
  received. There is no refund, reversal or credit path anywhere in the billing service.
Confidence: High
```

```
ID: P4-H02
Severity: Blocker
Axis: Security
Location: api/src/modules/billing/billing.service.ts:395-412, billing.controller.ts:66-72
Observed: claimFreeExtension checks the caller's own organisation for freeExtensionUsed, then runs
  ground.update({ where: { id: groundId } }) with groundId taken straight from the request body and
  never checked against that organisation. The neighbouring purchaseSession does exactly that check
  at :214.
Expected: the pattern used everywhere else, findFirst({ where: { id: groundId, organizationId } }).
Impact: an admin of one organisation can increment the session balance of a check-in in another
  customer's tenant, and write a billing event against their own organisation pointing at it. It
  spends their own one-time extension, so it is griefing rather than theft, but it is a write
  across the tenant boundary from an unvalidated body field.
Confidence: High
```

```
ID: P4-G01
Severity: Blocker
Axis: Security
Location: api/src/modules/public-api/public-api.controller.ts:1152-1171, grounds-by-api.service.ts:649, :827
Observed: GET /people/:personExternalId/forecasts and GET /people/:personExternalId/before-a-conversation
  call service methods whose signatures take no fence, and the controller never passes req.machine.
  Both return one named person's open commitments, unresolved findings and both sides of their
  handoffs. Verified: neither signature has a fence parameter.
Expected: the treatment the parallel routes already get. report, structuredFindings, senseCheckGround
  and commitmentsOf all receive req.machine and call mayTouch.
Impact: a credential deliberately issued with boundToPersonExternalIds set, the whole purpose of
  which is that a sales integration and an engineering one are not the same integration, reads any
  person in the organisation by putting their external id in the path. The boundary the customer
  configured is absent on the two most person-specific reads in the API.
Confidence: High
```

```
ID: P4-H05
Severity: Major
Axis: Bug
Location: client/src/pages/billing/BillingCallbackPage.tsx:22-58
Observed: the payment success screen is rendered entirely from URL query parameters that Stripe put
  in the return URL. It asserts "You are now on the {plan} plan" and "Unlimited check-ins and
  unlimited sessions are now active". Nothing reads back the organisation's actual state, and the
  page navigates away after three seconds.
Expected: confirm before asserting, or word it as payment received and activating.
Impact: the redirect from Checkout routinely beats the webhook. If the webhook then fails, and
  P4-H07 and P4-H08 give it several ways to, the customer has been told in plain words that they
  are subscribed when they are not.
Confidence: High
```

```
ID: P4-H07
Severity: Major
Axis: Bug
Location: api/src/modules/billing/billing.service.ts:966-988, :1059-1096
Observed: the subscription webhook branch calls stripe.subscriptions.retrieve before updating the
  organisation, unguarded. If it throws, the organisation is never activated. The
  invoice.payment_succeeded branch does not activate a subscription either; it sends a renewal
  email and writes a ledger row. There is no reconciliation job.
Expected: activate from the session metadata first and enrich afterwards, or treat
  invoice.payment_succeeded as a second chance.
Impact: a Stripe blip during webhook handling means the customer has paid, Stripe holds an active
  subscription, and our record says nothing. Nothing alerts, and the customer has already been
  shown the screen above telling them they are on the plan.
Confidence: High
```

```
ID: P4-H03
Severity: Major
Axis: User value
Location: api/src/modules/billing/billing.service.ts:395-402, client/src/components/PostSessionPanel.tsx:52-66
Observed: claimFreeExtension has no isFreeGround guard, and the panel offers "Add one more free
  session" whenever the extension is unused, with no check on whether the check-in is metered at
  all. A free-tier check-in already has unlimited sessions.
Expected: the guard purchaseSession already has, which refuses with "This check-in has unlimited
  free sessions - nothing to purchase".
Impact: the organisation's single one-time extension is spent on a check-in that never needed it.
  freeExtensionUsed is a boolean with no reset path, so it is unrecoverable. The person is told
  "Free session added" and got nothing.
Confidence: High
```

```
ID: P4-H04
Severity: Major
Axis: Experience
Location: client/src/pages/grounds/GroundParticipantPage.tsx:174-183, billing.controller.ts:64-72
Observed: the free-extension route is admin-only. Both surfaces that render "Continue for free" are
  participant-facing and shown to whoever hit the paywall. The failure handler says "Could not
  claim free session. Try again."
Expected: hide the button from people who cannot use it, or say who can.
Impact: a blocked participant who is not an admin presses a button that can never work and is told
  to try again. The same message covers "already used", which is permanent.
Confidence: High
```

```
ID: P4-G04
Severity: Major
Axis: Data integrity
Location: api/src/modules/public-api/public-api.controller.ts:467-473
Observed: Idempotency-Key is honoured on POST /subjects and POST /subjects/bulk only. POST /grounds,
  /role-assignments, /primary-actions, /objective-drafts and /evidence accept no key and are not
  upserts.
Expected: the reasoning in idempotency.service.ts, that a network timeout on our side looks exactly
  like a refusal from theirs so any integration worth connecting retries, applies identically to
  opening a check-in.
Impact: a retried POST /grounds after a timeout creates a second check-in, consumes one of the
  organisation's ten free ones, and sends a second set of invitations to the same people.
Confidence: High
```

```
ID: P4-G03
Severity: Major
Axis: Data integrity
Location: api/src/modules/public-api/grounds-by-api.service.ts:350-400
Observed: seedObjectives loops the submitted array and throws on the first bad item. Every prior
  item has already been written. There is no transaction.
Expected: validate the batch before writing, or wrap it, or adopt the bulk-import shape that skips
  bad rows and lists them.
Impact: a caller who gets a 400 cannot tell whether nothing, some, or nearly all of their
  objectives landed.
Confidence: High
```

Also recorded: P4-H06 the session-fee webhook branch keeps the check-then-act dedupe that was
replaced elsewhere, so a duplicate delivery 500s and Stripe retries a processed payment for ever;
P4-H08 the webhook handler has no wrapping try/catch, so any throw becomes a non-2xx and a
deterministic failure sticks permanently with no operator signal; P4-H09 no idempotency key on
Checkout creation, so two tabs can pay twice and the second overwrites the first, orphaning a live
subscription; P4-H10 the carefully worded "billing is not set up on this deployment, no card was
touched" is thrown and then discarded by a generic toast; P4-H11 a live admin-guarded $5 charging
route whose own annotation says it is legacy and unreachable; P4-H12 there is no refund, reversal
or credit path anywhere, so every consumption defect above is permanent for the customer;
P4-G02 two routes over the same detector table, one fenced and one not; P4-G05 a route annotated
with a read scope that runs detectors and writes proposals; P4-G07 a revoked credential's issued
token keeps working for the rest of its fifteen minutes.
