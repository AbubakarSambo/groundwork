# Groundwork audit, Pass 6 (user value) and Pass 7 (cross-cutting consistency)

Read only. Branch `fix/the-brief-is-yours-and-the-context-chat-takes-work`, 2026-09-10.

Prior passes read first and not repeated: `audit_map.md`, `browser_findings.md`, `browser_to_code.md`,
`notify_to_code.md`, `findings_pass6c.md`. The promise-against-marketing audit is Pass 6b and is not
here. Where this pass corrects an earlier one it says so.

---

## Pass 6. User value

### Role 1. The anonymous visitor at `/start`

**The job.** Describe a situation at work and find out whether this product has anything to say about it.

**Can they complete it.** Yes. `/start` is guarded only by `MayOpenCheckIns` (`client/src/App.tsx:365`),
the entry chat routes are `@Public()` (`api/src/modules/entry/entry.controller.ts:206-370`), and the
visitor gets a real, specific report at the end with no account. Confirmed live in the browser pass.
Steps to first value: pick a situation, describe it, answer roughly three questions, read the report.
None of the four is avoidable and none should be. This is the best thing in the product.

**What it asks for and never uses.** `alignmentStatus`. One of two fields the commit DTO accepts
(`entry.controller.ts:114-116`), enum-validated, and never written anywhere. See P6-001.

**What it shows that cannot be acted on.** The session count on the summary card. BR-003 found it stated
as a settled fact with no provenance; the code side is P6-002.

**What it makes them do that it could do.** Nothing significant. This flow does the work.

**First value, and how long.** The end-of-session report, after three or four answers. Minutes.
Then the product throws seven ninths of it away (P6-001).

**Open twice.** Not applicable; `/start` is by design a one-time door.

---

### Role 2. The organisation member who is a participant

**The job.** Somebody invited me. Answer, and see what came of it.

**Can they complete it.** Yes, but the paywall can stop them with a sentence that is not true (P6-004).

**What it asks for and never uses.** Nothing found that is participant-entered and unread.
`roleAsDescribed`, `managingOnly`, `brief`, record entries and participant notes all have live readers
(`participants.service.ts:39`, `conversation.service.ts:1966`, `grounds.service.ts:1610`).

**What it shows that cannot be acted on.** The paywall's "Upgrade organisation" button, offered to any
initiator, where the route behind it is `@Roles(ADMIN)` (P6-003).

**What it makes them do that it could do for them.** Nothing large.

**First value.** Their own private session report, immediately on finishing. Verified in the browser pass.

**Open twice.** The Setup tab of `/grounds/:id/p` now holds one panel
(`GroundParticipantPage.tsx:756-763`). Worth opening once.

---

### Role 3. The organisation admin who leads check-ins

**The job.** Find out what the people I lead actually think, and what to do about it.

**Can they complete it.** Yes. The gate in front of it is `/org/setup`, one unavoidable step that exists
for a field nothing sends mail to (P6-005).

**What it asks for and never uses.** `Organization.email`. Mandatory, blocks every signed-in route, read
in three places, never used to contact anybody (P6-005).

**What it shows that cannot be acted on.** Nothing material beyond the paywall above.

**What it makes them do that it could do for them.** Connect Slack or Teams, and connect the embed. Both
subsystems are built, both fire, and neither has any interface that can create the row they need
(P6-006, P6-007). The admin cannot do it either; only a hand-written database row can.

**Where a number has no provenance.** `avgDaysToFirstCheckin` and the retention percentages on `/admin`
carry no sample size and no date range (`AdminPage.tsx:573, 592`). Staff-only, so Minor. The customer
board is careful: `BoardPage.tsx:466-470` refuses to draw a bar when no target is set and says
"no number set". The cadence is the exception (P6-002).

**First value.** The first session report on their own check-in.

**Open twice.** `/org/guide` is 83 lines of static copy with no query, linked from one button
(`OrgMembersPage.tsx:566`). Read once, never again. That is correct for a guide.

---

### Role 4. Groundwork staff

**The job.** Run the company and support customers.

**Can they complete it.** Yes, at a cost that is the largest single user-value observation in this pass:
133 HTTP routes across nine ops controllers, 34 `/ops` screens, and 42 of the 152 Prisma models
(28 per cent of the schema) serve a handful of internal staff rather than any paying customer. See
P6-008. Alongside that, the platform console is built twice (P7-003).

**What it shows that cannot be acted on.** `GET /admin/coaching` exists specifically so somebody can read
coaching output before turning coaching on. It has no client caller, and there is no way to turn it on
(P6-009).

**Open twice.** Several of the 34 ops screens are one-time statements of position rather than working
surfaces: `/ops/what-we-are`, `/ops/workplan`, `/ops/moat`, `/ops/positioning`. Recorded in P6-008
rather than one finding each.

---

### Role 5. The machine integrator

**The job.** Push our people, objectives and events in, get findings out.

**Can they complete it.** Yes, and this is the second strongest role in the product. `Subject` is read by
twelve non-spec call sites including the conversation prompt itself
(`conversation.service.ts:2029, 4051`), the report engines (`detectors.service.ts:85, 203, 725`), the
handover brief (`handover.service.ts:131`) and the embed (`embed.service.ts:182, 281, 377`). What an
integrator pushes reaches the conversation a person has. Access is one route, not a sales cycle
(`public-api.controller.ts:98`).

**What it shows that cannot be acted on.** The webhook contract names ten events; four are refused by
name because nothing emits them (`events-we-can-actually-send.ts:53-61`). The refusal is honest and is
the right call.

**What it makes them do that it could do for them.** Guess the error shape. Success bodies on
`/api/org/v1` are raw and error bodies are enveloped (P7-010).

**Where a number has no provenance.** Nowhere found. `a-number-does-not-argue.ts` and
`a-record-with-no-provenance.spec.ts` exist for exactly this and hold.

**Correction to the map.** `audit_map.md` note 6 says `Subject`'s own schema comment reports nothing in
the live product reads it. That comment is no longer there (`schema.prisma:3066-3126`) and the reads
above are live. See P7-011.

---

### The findings

```
ID: P6-001
Severity: Blocker
Axis: Data integrity
Location: api/src/modules/entry/entry.service.ts:402-403, 1624-1628;
  api/src/modules/entry/entry.controller.ts:105-120; api/src/modules/entry/entry.service.ts:307, 314-315
Observed: the anonymous entry report the visitor reads on screen has nine fields, extracted by the model
  and required by the schema at entry.service.ts:307 - whatGroundworkSaw, alignmentStatus,
  alignmentBasis, areasRequiringAlignment, alignmentReached, honestClose, mentionedPeople,
  suggestedParties, yourRole. The commit DTO accepts two of them (EntryReportSummaryDto,
  entry.controller.ts:114-116). At merge, the persisted report is rebuilt as an object with exactly one
  key: `merged.report = { whatGroundworkSaw: merged.reportSummary.whatGroundworkSaw }`
  (entry.service.ts:402-403). That single-key object is what is written to CheckIn.sessionReport
  (entry.service.ts:1624-1628). Seven of the nine fields are shown to the person and then dropped.
Expected: the report the person read at the end of their first session is the report saved. That is what
  the-report-you-read-is-kept.spec.ts is named for, and the comment at entry.service.ts:1620-1623 says
  "the report looks nothing like what I got at the end" was reported four times.
Impact: everybody who comes in through /start, the product's only self-serve front door. Their first and
  most valuable artefact is silently truncated to one paragraph at the moment they create an account.
  sessionReport is read downstream (conversation.service.ts:4930, 4940), so the loss surfaces again as a
  thinner second session.
Evidence: entry.service.ts:402-403 is the whole reconstruction. entry.controller.ts:105-113 states in a
  comment that the client has sent `reportSummary` rather than `report` since commit e078b0d, so this is
  the path every real commit takes, not a fallback.
Confidence: High
```

```
ID: P6-002
Severity: Minor
Axis: Experience
Location: api/prisma/schema.prisma:778-789 (Ground.timelineStated, Ground.cadenceStated)
Observed: timelineDays is not nullable and cadence has a default, so both are set on every check-in from
  the moment it exists - by the lead if they said so, by DEFAULT_TIMELINE_DAYS[scenario] if they did not.
  The schema's own comment says the gap reader asks about duration only when it is ABSENT, and it is
  never absent, so the question exists and has never been asked. timelineStated and cadenceStated record
  which it was.
Expected: a number the product chose is shown as a number the product chose. BR-003 read the session
  count on the summary card as a settled fact with no provenance; this is why.
Impact: every lead. They are shown a cadence they did not set, cannot tell it apart from one they did,
  and are never asked.
Evidence: schema.prisma:778-789. The two boolean columns exist precisely to make the distinction, and no
  copy renders it.
Confidence: Medium
Check needed: grep for timelineStated and cadenceStated readers in the report and board copy. If either
  already changes a sentence, this drops to Note.
```

```
ID: P6-003
Severity: Major
Axis: Experience
Location: client/src/pages/grounds/GroundParticipantPage.tsx:788, 802-820;
  api/src/modules/billing/billing.controller.ts:61-81
Observed: the paywall overlay renders "Continue for free" and "Upgrade organisation" for anybody whose
  partyType is INITIATOR. Both routes behind those buttons, POST /billing/free-extension and
  POST /billing/subscription, are @Roles(Role.ADMIN).
Expected: a control is offered only to whoever can use it. The same file applies that rule two blocks
  down: the access-code field at :833 is gated on INITIATOR with a comment saying it "used to render for
  everyone, sending plain participants hunting for a code they were never issued".
Impact: an organisation with whoMayOpenCheckIns set to EVERYONE (schema.prisma:478-484) lets a non-admin
  open a check-in and become its initiator. That person hits the paywall, presses the only button
  offered, and gets a 403. They are blocked with no route forward and no explanation.
Evidence: the @Roles(Role.ADMIN) decorators at billing.controller.ts:63 and :72 against the ungated
  renders at GroundParticipantPage.tsx:788 and :808.
Confidence: High
```

```
ID: P6-004
Severity: Major
Axis: Bug
Location: client/src/pages/grounds/GroundParticipantPage.tsx:824-828
Observed: a non-initiator who hits the paywall is told "Your initiator has been notified. Once they add
  a session, you will be able to check in." Nothing notifies the initiator. That sentence is the only
  occurrence of the concept in the repository; a grep across api/src and client/src for a matching send
  returns this string and nothing else.
Expected: either a notification fires, or the screen tells the person to go and ask.
Impact: the blocked participant waits for a message that will never be sent, and the initiator never
  learns somebody is stuck. A stated fact that is false, at the moment somebody is blocked.
Evidence: the string at :827 and the absence of any sender. The notifications pass inventoried 48
  senders (notify_to_code.md) and none of them is this.
Confidence: High
```

```
ID: P6-005
Severity: Major
Axis: User value
Location: client/src/pages/org/OrgSetupPage.tsx:14-38; client/src/App.tsx:189, 307;
  api/src/modules/auth/auth.service.ts:1039, 1128; api/src/modules/billing/billing.service.ts:220, 495;
  api/src/modules/prompts/prompts.service.ts:417
Observed: an organisation admin cannot reach any signed-in route until Organization.email is filled in.
  App.tsx:189 and :307 redirect to /org/setup on the strength of that one column; auth.service.ts:1039
  computes the flag. The column is written at auth.service.ts:1128 and read in exactly three places:
  billing.service.ts:220 and :495, where it prefills the Stripe customer record, and
  prompts.service.ts:417, a staff read. No email is ever sent to it.
Expected: a gate in front of the whole product exists for something the product needs.
Impact: every new admin. The first thing Groundwork does after sign-up is stop them and demand a second
  email address, for a field that matters only if they later pay. 21 of 224 organisations in the local
  database have never created a check-in (findings_pass6c.md, P6C-003); this is the first wall they hit.
Evidence: the three reads above are the complete set. The gate at App.tsx:189 is unconditional for admins.
Confidence: High
```

```
ID: P6-006
Severity: Major
Axis: User value
Location: api/src/modules/workspace/workspace-notifier.controller.ts (6 routes, no client caller);
  api/src/modules/workspace/workspace-notifier.service.ts:109;
  callers at api/src/modules/reports/reports.service.ts:2939,
  api/src/modules/conversation/remind.service.ts:431,
  api/src/modules/webhooks/webhooks.listener.ts:71, 196,
  api/src/modules/webhooks/webhooks.service.ts:363
Observed: Slack and Teams notification is wired end to end. tell() has five live production call sites
  and fires on every released report, on the lead digest and on webhook escalation. It reads
  workspaceNotifier rows with findMany({where:{organizationId, enabled:true}}) at :109. The only route
  that can create such a row is on a controller with no caller in client/src or panel.html, so for every
  organisation that query returns empty and tell() returns [].
Expected: a capability that fires on five events has a way to be switched on.
Impact: every customer. A feature that would put a report into the channel the team already lives in is
  finished and starved at the input. This is capability the product needs and cannot reach, not weight
  it carries and does not need.
Evidence: the five call sites above; zero occurrences of "integrations/workspace" in client/src or
  api/src/modules/embed/static/panel.html.
Confidence: High
```

```
ID: P6-007
Severity: Major
Axis: User value
Location: api/src/modules/embed/embed-setup.controller.ts:17-35 (2 routes, no client caller);
  api/src/modules/embed/embed.service.ts (391 lines);
  api/src/modules/embed/embed-assets.controller.ts:33, 53; api/prisma/schema.prisma:1841 (EmbedConfig)
Observed: POST /integrations/embed is the only writer of EmbedConfig.allowedDomains and the only issuer
  of the embed signing secret. It has no caller in client/src. GET /embed.js and GET /embed/panel are
  served, and EmbedSessionGuard gates on config that nothing can create.
Expected: /org/integrations, the screen the Pass 0 map lists as "Connect: API, embed, WhatsApp, webhooks",
  sets the embed up.
Impact: every customer who wants the panel inside their own application. A subsystem of over 1,300 lines
  including a served loader, a panel page and a signing scheme cannot be turned on except by writing a
  database row by hand. The highest-severity of the four unreachable modules.
Evidence: the two handlers at :22 and :28; the absence of "integrations/embed" in client/src.
Confidence: High
Check needed: confirm no computed URL in IntegrationsPage.tsx reaches it. The Pass 0 path matching is
  string-based and the map flags that caveat itself (Notes for later passes, item 7).
```

```
ID: P6-008
Severity: Major
Axis: User value
Location: api/src/modules/ops/*.controller.ts (133 route decorators across 9 controllers);
  client/src/App.tsx:430-490 (34 /ops screens); api/prisma/schema.prisma (42 models named Ops*, of 152)
Observed: 28 per cent of the data model, roughly a quarter of the front-end routes and a quarter of the
  controller surface serve Groundwork's own staff rather than any customer. The customer product, by
  contrast, has four whole modules it cannot reach (P6-006, P6-007, P6-013, P6-014) and a truncated first
  report (P6-001).
Expected: nothing in the code. This is a judgement of the product, which is what this pass is for.
Impact: every customer, indirectly. Weight the product carries at a stage when the customer path has
  unfinished seams. Several of the 34 screens are statements of position rather than working surfaces -
  /ops/what-we-are, /ops/workplan, /ops/moat, /ops/positioning - which nobody has a reason to open twice.
Evidence: `grep -c "^model Ops" api/prisma/schema.prisma` = 42 against `grep -c "^model "` = 152.
  Route-decorator count across api/src/modules/ops/*.controller.ts = 133.
Confidence: High
```

```
ID: P6-009
Severity: Major
Axis: User value
Location: api/src/modules/conversation/conversation.service.ts:56, 2436-2441;
  api/src/modules/admin/admin.controller.ts:238-239; api/src/modules/admin/admin.service.ts:79-83
Observed: coaching in the conversation is gated on platform_settings.coaching_live. The key is read at
  conversation.service.ts:2439 and at admin.service.ts:83. Nothing in api/src ever writes it: a full grep
  for 'coaching_live' returns only the two reads, the constant and a Swagger summary. GET /admin/coaching
  exists so somebody can read a batch of coaching output before deciding to turn it on - its Swagger line
  says exactly that - and it has no client caller.
Expected: a flag that gates a shipped capability has a control, and the screen built to inform the
  decision is reachable.
Impact: coaching is dark for every organisation and can only be lit by a hand-written SQL row. The
  reviewing screen built to make that decision safe cannot be opened.
Evidence: the grep result above; admin.controller.ts:239's own summary text.
Confidence: High
```

```
ID: P6-010
Severity: Major
Axis: Security
Location: api/src/modules/entry/entry.controller.ts:289-296, 311-315, 317-322, 324-330;
  api/src/modules/entry/entry.service.ts:477-481, 483-501
Observed: POST /entry/classify-intent and POST /entry/faq are @Public() and neither carries a @Throttle.
  Every sibling does: /entry/chat 30/min (:297), /entry/report 20/min (:326), /entry/join-accept 5/min
  (:355), /entry/join-confirm 10/min (:369). Both unthrottled routes reach the model - faq() calls
  guardedReply (entry.service.ts:480), classifyIntent() builds a classifier prompt (:485-501).
  classify-intent additionally has no DTO class, so the global ValidationPipe has nothing to validate
  against and there is no length bound on `description`.
Expected: the throttle the rest of the anonymous surface carries, and a DTO like every sibling.
Impact: an anonymous caller can spend Groundwork's model budget at the global 60/min/IP ceiling instead
  of the intended 20 or 30, with an unbounded prompt body on one of the two.
Evidence: the four decorator blocks read in sequence.
Confidence: High
```

```
ID: P6-011
Severity: Minor
Axis: Experience
Location: api/src/modules/entry/entry.service.ts:485-501
Observed: the scenario classifier is a single prompt listing fourteen scenario keys with one-line
  descriptions and no tie-break and no confidence output. "PIP - performance improvement, formal
  feedback, or capability concern" and "NEW_HIRE - onboarding a new hire or someone joining a team" both
  match "a new hire six weeks in who is not settling, inside a six-month probation", and the browser pass
  got PIP.
Expected: a situation explicitly about a new hire resolves to NEW_HIRE, or the classifier says it is
  unsure and asks.
Impact: BR-001's root. The scenario key reaches user-facing copy and the invitation, so the wrong key
  puts the words of a performance process around somebody's onboarding.
Evidence: the flat list at :488-501, with no precedence rule.
Confidence: High
```

```
ID: P6-012
Severity: Minor
Axis: Experience
Location: client/src/pages/admin/AdminPage.tsx:573, 592, 612, 629, 645
Observed: the platform console renders drop-off percentages, an average days-to-first-check-in to one
  decimal and average session minutes to one decimal, with no sample size beside any of them and no date
  range on the panel.
Expected: a rate carries its denominator.
Impact: staff only, so Minor. But this is the panel BR-014 found contradicting itself, and one decimal on
  a mean over a possibly tiny n reads as more certain than it is.
Evidence: the five render sites above; none is adjacent to an n.
Confidence: High
```

```
ID: P6-013
Severity: Note
Axis: User value
Location: api/src/modules/knowledge/how-we-do-it.controller.ts (4 routes, no client caller);
  api/src/modules/knowledge/how-we-do-it.service.ts:52, 117, 124, 136;
  api/src/modules/assistant/what-is-true.service.ts:50
Observed: KnowledgeCard is read live by the assistant. The only in-product way to create one - propose,
  approve, decline on org/how-we-do-it - has no client caller, so for a customer not using the machine
  API the assistant's knowledge read is permanently empty.
Expected: an organisation can tell the product how it does things without writing an API integration.
Impact: capability the product needs and cannot reach, same class as P6-006 and P6-007 but smaller.
Evidence: no occurrence of "how-we-do-it" in client/src; the live read at what-is-true.service.ts:50.
Confidence: High
```

```
ID: P6-014
Severity: Note
Axis: User value
Location: api/src/modules/alignment/ (29 routes, 1,027 non-spec implementation lines, 5 services,
  registered at api/src/app.module.ts:81);
  api/prisma/schema.prisma:3530, 3595, 3633, 3656, 3701, 3736, 3781
Observed: the alignment module implements a commercial-dispute substrate - reported figures with
  provenance, arithmetic differences, versioned agreements with terms read out of documents, obligations,
  named parties, one-sided assertions awaiting the other side. It writes seven tables. A grep for
  prisma.reportedFigure, .difference, .agreement, .agreementVersion, .agreementTerm, .assertion and
  .obligation across api/src returns zero hits outside modules/alignment/. It carries 1,336 lines of its
  own specs.
Expected: judged against this pass's question - capability the product needs and cannot reach, or weight
  it carries and does not need. Unlike the workspace notifier and the embed, nothing else in the product
  is waiting on it. It is a second product built inside the first.
Impact: 2,363 lines and 7 tables of maintained surface with no consumer, on a codebase whose customer
  path has four unreachable modules and a truncated report.
Evidence: the zero-hit grep above; no product doc outside the audit files.
Confidence: High
```

```
ID: P6-015
Severity: Major
Axis: Bug
Location: api/src/modules/whatsapp/whatsapp.controller.ts:101-109;
  api/src/modules/public-api/whatsapp-for-an-organisation.service.ts:127-136;
  api/src/modules/public-api/whatsapp-for-an-organisation.controller.ts:107-109
Observed: on both WhatsApp paths the handler catches every failure, logs it and returns
  `{received: true}`. The person who sent the message gets no reply and no error. In the platform path,
  when the check-in is NOT_STARTED the inbound text is discarded entirely - only open() runs, and the
  message is never recorded (whatsapp.controller.ts:101-104). The per-organisation path does the same
  when the inbound text is 12 characters or shorter (service:136).
Expected: a person who writes to the product on WhatsApp gets an answer or is told something went wrong,
  and their first message is not thrown away.
Impact: every WhatsApp user. The channel fails silently, which is the worst way for a messaging channel
  to fail: there is nothing on screen to distinguish "we lost it" from "it is still thinking".
Evidence: the two catch blocks and the two discard branches above.
Confidence: High
```

```
ID: P6-016
Severity: Major
Axis: User value
Location: api/src/modules/conversation/conversation.service.ts:557-660, 633-636;
  api/src/modules/conversation/anthropic.service.ts:36-44, 67-71
Observed: open() decrements sessionsBalance with an atomic updateMany at :633-636, before the model is
  called. When the model is down, anthropic.service.ts:67-71 throws engineUnavailable() as a 503. There
  is no refund path and no deferral.
Expected: a paid session is consumed when the person gets a session.
Impact: a customer's quota is spent on a session that never happened, on every path into open(). This is
  the same ordering NL-014 found on the WhatsApp path; it is not WhatsApp-specific, it is in open()
  itself and therefore on every entry point.
Evidence: the decrement at :633-636 precedes every model call in the method; no code path restores it.
Confidence: High
```

---

## Pass 7. Cross-cutting consistency

```
ID: P7-001
Severity: Major
Axis: Inconsistency
Location: api/prisma/schema.prisma:766 (Ground), :1177 (CheckIn), :1181 (sessionNumber),
  :1819 (RoundCompletion.roundNumber), :4003 (ReportRound.round);
  api/src/modules/webhooks/events-we-can-actually-send.ts:24, 27
Observed: BR-015 named "check-in" for both a whole engagement and one session, with "ground" in the
  database. The inversion underneath it was not stated and is worse. The Prisma model called `CheckIn`
  is not the thing a user calls a check-in - it is one SESSION inside one, keyed by sessionNumber. The
  thing a user calls a check-in is `Ground`. The database uses the interface's word for the interface's
  other concept.
  The counter saying which session this is has three names: CheckIn.sessionNumber (:1181),
  RoundCompletion.roundNumber (:1819) and ReportRound.round (:4003). All three are the same integer.
  And "round", retired from every human surface by client/src/one-word-and-it-is-session.spec.ts, is
  still the published name of a webhook event: round.completed (events-we-can-actually-send.ts:24), the
  first event in the machine contract and described in its own comment as "the one the delivery
  discipline hangs on".
Expected: one word per concept, including in the contract a customer builds against.
Impact: BR-014's contradictory counters are the visible symptom. An integrator subscribes to
  round.completed and checkin.completed where the product says "session" everywhere a person can see,
  and no glossary reconciles them. Every new reader of the schema has to learn that CheckIn means
  session.
Evidence: the five schema lines and the two event names, read against the two naming guards
  (client/src/one-word-and-it-is-session.spec.ts, api/src/one-word-for-the-thing-on-the-server-too.spec.ts),
  both of which explicitly exempt the data model and neither of which reaches the webhook contract.
Confidence: High
```

```
ID: P7-002
Severity: Note
Axis: Inconsistency
Location: api/prisma/schema.prisma:514 (User), :2977 (Person), :1022 (GroundParticipant),
  :4345 (OrganizationMembership), :4832 (OpsPerson), :4864 (OpsPersonAccount)
Observed: six models represent a human being. The interface has settled on one word, "participant", and
  guards it (client/src/one-word-for-a-person.spec.ts). The model has not: User is an account, Person a
  roster entry, GroundParticipant a role in one check-in, OrganizationMembership a second membership seam
  beside User.organizationId, OpsPerson a staff member, OpsPersonAccount the link back to a User.
Expected: recorded, not condemned. Each has a stated reason and Person.linkedUserId is the documented
  roster/account seam.
Impact: none today. Recorded because five of the six can hold a name and an address, so a rule enforced
  on one is not enforced on the others - the mechanism behind NL-034.
Evidence: the six model declarations.
Confidence: High
```

```
ID: P7-003
Severity: Major
Axis: Inconsistency
Location: api/src/modules/admin/admin.service.ts:211-234 (getPlatformStats), :251-262 (getDashboard),
  :315-349 (getUsagePatterns), :630 (getFeedback), :81 (getCoaching);
  api/src/modules/prompts/prompts.service.ts:227-300 (platformDashboard), :376 (orgList),
  :427 (usageStats), :516 (feedbackSummary);
  client/src/pages/admin/AdminPage.tsx:1192-1256; client/src/App.tsx:511
Observed: the platform console is implemented twice by two services, and both are shipped. /admin
  (AdminPage.tsx) reads platform statistics from promptsApi - platform-dashboard, platform-funnel,
  org-list, usage-stats, feedback-summary. /admin/dashboard (AdminDashboardPage) reads them from adminApi
  via GET /admin/dashboard, which composes getPlatformStats, getAllCodes, getFeedback and
  getUsagePatterns. The two count different things under the same words: prompts.service.ts:257-259
  counts CheckIn rows with status COMPLETED, admin.service.ts:216 counts Ground rows, and both reach a
  label containing "check-ins".
Expected: one implementation of one number.
Impact: this is the code behind BR-014's "Check-ins completed 484 / Check-ins created 243 / Check In
  Completed 359". A staff member cannot tell which figure is right, and the answer is that they measure
  different objects that share a name (P7-001). Five routes on the admin controller - coaching, stats,
  feedback, usage, grounds/:groundId - are the unused half.
Evidence: the two count expressions above, and the two query sets at AdminPage.tsx:1192-1256 against
  App.tsx:511.
Confidence: High
```

```
ID: P7-004
Severity: Minor
Axis: Inconsistency
Location: api/src/modules/feedback/feedback.service.ts:9-21 (GET /feedback);
  api/src/modules/admin/admin.service.ts:630 (GET /admin/feedback);
  api/src/modules/prompts/prompts.service.ts:516 (GET /prompts/feedback-summary);
  client/src/pages/admin/AdminPage.tsx:778, 1252
Observed: in-app feedback is readable through three routes on three controllers. The client calls two of
  them from the same page: feedbackApi.list at AdminPage.tsx:778 and promptsApi.feedbackSummary at
  :1252. GET /admin/feedback is called by nobody.
Expected: one read path.
Impact: minor. Corrects the Pass 0 map, which lists GET /admin/feedback under "no caller" without noting
  the capability is alive twice over elsewhere. Feedback submissions are not lost.
Confidence: High
```

```
ID: P7-005
Severity: Major
Axis: Inconsistency
Location: api/prisma/schema.prisma:4094 (PlatformSetting);
  writable: api/src/modules/billing/pricing.service.ts:198, 211;
  api/src/modules/whatsapp/whatsapp.service.ts:87
  read-only: api/src/modules/conversation/conversation.service.ts:56, 2439 (coaching_live);
  api/src/modules/conversation/the-window-for-correcting-a-record.ts:28 with
  api/src/modules/reports/reports.service.ts:1795 and
  api/src/modules/conversation/conversation.service.ts:5100 (correction_window_days)
Observed: PlatformSetting holds four keys. Two - the free ground limit and the free member limit - have
  PATCH routes and an editing UI on /admin. One - the WhatsApp toggle - has a PATCH route and a switch.
  The other two - coaching_live and correction_window_days - have readers, no writer anywhere in api/src
  and no UI. One gates a shipped conversation capability (P6-009); the other sets how long somebody has
  to correct their own record.
Expected: one mechanism. A setting is either configurable or a constant, not a row only SQL can reach.
Impact: two real product policies are configuration in form and hardcoded in practice. Whoever changes
  them does it in the database, with no validation, no audit trail and nothing in the product recording
  that it happened.
Evidence: `grep -rn "coaching_live" api/src` returns two reads, one constant and one Swagger string, and
  no write. Same shape for CORRECTION_WINDOW_KEY: two reads, one declaration, no write.
Confidence: High
```

```
ID: P7-006
Severity: Note
Axis: Inconsistency
Location: api/prisma/schema.prisma:424-427 (Organization.contributorBypass);
  :2717 (KnowledgeRetrieval), :3128 (OrgIntelligence), :3496 (DocumentElsewhere);
  :4225 (PatternConfig), :4583 (RetentionPolicy);
  api/src/modules/patterns/patterns.service.ts:643; api/src/modules/people/departure.service.ts:34
Observed: the Pass 0 dead list re-run and confirmed, extended by one. contributorBypass is new here: its
  own schema comment at :424-426 says it "exists in the database, referenced nowhere in the codebase".
  KnowledgeRetrieval, OrgIntelligence and DocumentElsewhere are written and never read. PatternConfig and
  RetentionPolicy are read and never written, so patterns.service.ts:643 and departure.service.ts:34
  always see nothing.
Expected: nothing. Recorded, with the extension noted.
Impact: two behaviours - pattern configuration and the retention policy - are permanently at their
  fallback because the row they depend on cannot be created. Same shape as P7-005.
Evidence: the schema comment at :424-426; the re-run zero-side query.
Confidence: High
```

```
ID: P7-007
Severity: Blocker
Axis: Security
Location: api/src/app.module.ts:51; api/src/modules/entry/entry.controller.ts:206-210;
  api/src/modules/whatsapp/whatsapp.controller.ts:53;
  api/src/modules/public-api/whatsapp-for-an-organisation.controller.ts:99;
  api/src/modules/email/unsubscribe.controller.ts:30;
  api/src/modules/email/resend-webhook.controller.ts:18
Observed: the throttler is registered under one name, `global` (app.module.ts:51). A @Throttle keyed to a
  throttler name that does not exist is a silent no-op. entry.controller.ts:206-210 documents this
  exactly - "a limit named for a throttler that does not exist is a silent no-op" - and was fixed to
  `global`. Four other decorators still say `default` and are therefore inert: the platform WhatsApp
  webhook (120/min intended), the per-organisation WhatsApp webhook (240/min intended), the unsubscribe
  route (20/min intended) and the Resend webhook.
Expected: every stated limit is the limit.
Impact: the unsubscribe route is the one that matters. It is @Public, takes a token in the path, and its
  own comment says the point of the limit is that "nothing should be able to sit and try" - and nothing
  is stopping anything from sitting and trying beyond the plain 60/min. The two WhatsApp webhooks get a
  LOWER limit than intended, so legitimate Meta traffic from one egress IP can be throttled and messages
  dropped.
Evidence: the four decorators against the single registration at app.module.ts:51, and the comment at
  entry.controller.ts:206-210 that already names the bug and its fix.
Confidence: High
```

```
ID: P7-008
Severity: Major
Axis: Inconsistency
Location: signed-in app: api/src/modules/conversation/conversation.controller.ts:9-14, 79-83;
  anonymous /start: api/src/modules/entry/entry.controller.ts:9-12, 14-30, 294-303;
  embedded panel: api/src/modules/public-api/public-api.controller.ts:298-304;
  WhatsApp: api/src/modules/whatsapp/whatsapp.controller.ts:52-78 and
  api/src/modules/public-api/whatsapp-for-an-organisation.controller.ts:93-111
Observed: the four entry points into a check-in validate four different amounts.
  - App: SendMessageDto, @IsString @IsNotEmpty @MaxLength(8000). The only one with a message-length cap.
  - /start: EntryChatDto with @ValidateNested over TurnDto, but TurnDto is bare @IsString on role and
    content - no MaxLength on content, no ArrayMaxSize on messages, and role is not @IsIn(['user',
    'assistant']) despite the TypeScript union. The entire conversation history is client-supplied and
    replayed to the model (entry.service.ts:927-967), so an anonymous caller can forge assistant turns.
  - Panel: `@Body() dto: { message?: string }` - an inline type, so the global ValidationPipe has no
    class and is inert. No cap, no required field, no whitelist; an empty string is a valid request. The
    sibling route at :656-668 hand-checks the same thing, so the omission is local, not a policy.
  - WhatsApp: no DTO on either path; fields are plucked off the raw request by hand.
  Client-side, three of the four enforce trim-and-non-empty and none sets a maxlength
  (ChatPage.tsx:579-587, EntryChatPage.tsx:1784-1800, panel.html:315-323). EntryChatPage.tsx:1829
  truncates a pasted document to 8000 characters client-side only; the server accepts the whole field.
Expected: one validation posture for one concept, applied at every door into it.
Impact: three of the four doors into the same conversation engine accept unbounded, unvalidated text
  bound only by the 2 MiB body limit (main.ts:71). The 8000-character rule the product decided on is
  enforced at one door out of four.
Evidence: the five DTO or non-DTO declarations above, read side by side.
Confidence: High
```

```
ID: P7-009
Severity: Minor
Axis: Inconsistency
Location: api/src/modules/entry/entry.controller.ts:289-296, 311-315, 317-322, 324-330
Observed: five public handlers on one controller, five validation postures. `chat` and `report` have a
  DTO and a @Throttle. `opener` has a DTO and no throttle. `faq` has a DTO capped at 1000 and no
  throttle. `classify-intent` has neither.
Expected: one posture per controller, or a stated reason per exception.
Impact: the security consequence is P6-010. This entry records the pattern: the same problem solved three
  ways in five adjacent handlers.
Evidence: the four decorator blocks read in sequence.
Confidence: High
```

```
ID: P7-010
Severity: Major
Axis: Inconsistency
Location: api/src/common/interceptors/transform.interceptor.ts:37-56;
  api/src/common/filters/http-exception.filter.ts:36, 90-98
Observed: the success interceptor deliberately exempts three URL families from the `{success, data}`
  envelope - /api/org/v1, /embed.js, /embed/panel (transform.interceptor.ts:37) - so the machine API
  returns raw bodies. The exception filter has no matching exemption, so machine-API ERRORS come back
  enveloped as `{success:false, statusCode, message, errors, code?, timestamp, path}`.
  Separately, within that envelope `errors` is `responseObj.errors ?? null` (:36), but class-validator's
  failure array lands in `responseObj.message`. So a 400 from the pipe returns `message` as an array of
  strings while every hand-thrown error returns `message` as a string.
Expected: one shape. A published API's error body is the part an integrator writes code against first.
Impact: every machine integrator. They parse a raw object on success and an enveloped one on failure,
  and `message` changes type depending on which layer rejected them. Also affects the SSE routes, which
  bypass the filter entirely and emit `{type:'error', message}` at HTTP 200
  (conversation.controller.ts:97-99, entry.controller.ts:236-238), leaking the raw internal message text.
Evidence: the PUBLISHED array at transform.interceptor.ts:37 against the unconditional filter at
  http-exception.filter.ts:90-98, and the `errors` assignment at :36.
Confidence: High
```

```
ID: P7-011
Severity: Note
Axis: Inconsistency
Location: docs/audit/audit_map.md (Notes for later passes, item 6);
  api/prisma/schema.prisma:3066-3126
Observed: the map records that Subject's own doc comment says nothing in the live product reads it yet.
  That sentence is no longer in the schema, and Subject is read at twelve non-spec call sites including
  conversation.service.ts:2029 and :4051, detectors.service.ts:85, :203, :725, handover.service.ts:131,
  embed.service.ts:182, :281, :377 and assistant/what-is-true.service.ts:35.
Expected: the map is a snapshot and this one moved under it.
Impact: none, except that judging the machine API's value from the map alone would understate it badly.
Confidence: High
```

```
ID: P7-012
Severity: Minor
Axis: Inconsistency
Location: api/src/modules/grounds/grounds.controller.ts:584 (POST /grounds/:id/sign-off);
  client/src/pages/grounds/the-setup-steps-you-have-checked.ts:31, 36
  (POST /grounds/:id/setup-sign-offs); api/prisma/schema.prisma:6525 (GroundSetupSignOff)
Observed: two routes named for signing off on a check-in's setup. The client calls
  /grounds/:id/setup-sign-offs. /grounds/:id/sign-off is called by nobody.
Expected: one route.
Impact: minor, but this is the exact shape that produces a wrong fix later - the Pass 0 map lists the
  dead one without noting that a near-identically named live route sits beside it.
Confidence: High
```

```
ID: P7-013
Severity: Note
Axis: Inconsistency
Location: api/src/modules/conversation/conversation.service.ts:772-800, 791
Observed: assertGroundAcceptsInput refuses input on a closed check-in, but the branch at :791 fails OPEN
  when the status is unreadable. Elsewhere the product's convention is to fail closed: the Resend
  webhook throws Unauthorized with no secret (delivery.service.ts:70), the WhatsApp inbound throws with
  no app secret (whatsapp.service.ts:56), and production refuses to boot without its keys
  (main.ts:17-30).
Expected: one direction of failure for one class of uncertainty.
Impact: none established; the status being unreadable is not a state anything is known to reach.
  Recorded because it is the single fail-open in a codebase that otherwise fails closed.
Confidence: Medium
Check needed: establish whether any code path can present a Ground with an unreadable status. If none
  can, this closes.
```
