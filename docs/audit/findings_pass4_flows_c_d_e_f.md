# Pass 4, flows c to f: session completion, closing, the panel, WhatsApp

No exposed secret and no cross-organisation leak in these four flows. Every entry point scopes by
organisation or party membership before returning content. The defects are about what happens when
something fails, and about work paid for that nobody receives.

## Blockers

```
ID: P4-C01  Severity: Blocker  Axis: Bug
Location: api/src/modules/grounds/grounds.service.ts:4284-4309, conversation.service.ts:5009-5014, grounds/round-completion.ts:39-48
Observed: decline() writes DECLINED and neither records the round nor emits checkin.completed.
  isSessionReadyForReport counts a declined party as active, because they still have a userId, and
  then requires a COMPLETED check-in from every active party. recordRoundCompletion counts only
  COMPLETED. getSessionProgress does the opposite and treats DECLINED as answered.
Impact: one person declining freezes the check-in permanently. The report is never released for
  that session or any later one, while the admin screen says the round is complete. No cron
  repairs it.
Confidence: High
```

```
ID: P4-C02  Severity: Blocker  Axis: Data integrity
Location: api/src/modules/grounds/grounds.cron.ts:242-309
Observed: autoCloseStaleCheckIns writes COMPLETED directly and emits the completion event. It
  bypasses the turn floor, the substance gate, specificity scoring, record extraction, document
  anchoring, the solo artifact and ensureNextSession.
Impact: a session containing one word and twelve hours of silence is stamped complete, closes the
  round and releases the shared report as though that person gave an account. Their entries are
  never extracted, so the report is built without their content while counting them present. And
  because ensureNextSession never runs, they have no next check-in, so the next round can never
  complete either.
Confidence: High
```

```
ID: P4-C03  Severity: Blocker  Axis: Security
Location: api/src/modules/reports/reports.service.ts:1116-1178
Observed: liftedRunIn detects a verbatim run of eight words from one person's private record. It
  is applied only to sharedPicture, and only as a retry trigger. The second pass is accepted if it
  has fewer faults than the first, so a pass that fixes a tally but keeps the lift ships. If the
  second pass is no better, the first is kept, lift and all. agreements, divergences and
  centralQuestion are never scanned for lifts at all.
Impact: the file's own comment says a long lifted phrase identifies its author as surely as a
  name. A released shared report can carry one person's exact words to every other party. This is
  the same promise as P6B-015, failing in a second place.
Confidence: High
```

```
ID: P4-E02  Severity: Blocker  Axis: Bug
Location: api/src/modules/embed/static/panel.html:225-240
Observed: finishCheckIn clears the local state before the network call, then maps the response and
  discards it. The server legitimately refuses completion on a thin record with a 400 carrying
  canContinue: true. The panel never reads the status or the flag.
Impact: the check-in stays in progress on the server while the panel tells the person "That is
  done. Your report is being put together." The record is never completed, never released, nothing
  reaches the board, and the person believes it is finished.
Confidence: High
```

```
ID: P4-E01  Severity: Blocker  Axis: User value
Location: api/src/modules/conversation/conversation.service.ts:630-660, :731-747
Observed: the same decrement-before-the-model-call as P4-H01, reached through the panel.
Impact: a person tapping "Start it" five times against a flaky model spends five sessions and sees
  five copies of "I could not open that check-in just then. Try again in a moment."
Confidence: High
```

```
ID: P4-F01  Severity: Blocker  Axis: Bug
Location: api/src/modules/whatsapp/whatsapp.controller.ts:100-106
Observed: on the platform-number route, when the check-in is NOT_STARTED the handler calls open()
  and never passes the person's text. Their message is read and then dropped.
Impact: the first thing anybody ever writes into a check-in over WhatsApp is silently discarded and
  answered with a generic opening question. It also consumes the metered session and a model call
  to reply to nothing. The per-organisation route does this correctly, so there are two behaviours
  on one channel.
Confidence: High
```

```
ID: P4-F02  Severity: Blocker  Axis: Experience
Location: api/src/modules/public-api/whatsapp-for-an-organisation.service.ts:130-141
Observed: the answer path has no try/catch. A spent balance, the answer ceiling, a paused or closed
  check-in and an already-complete one all throw, propagate out, and are caught by the controller,
  logged, and answered to Meta with received: true. Only the "finish" branch has a catch.
Impact: the person on WhatsApp gets absolute silence for every refusal the product has carefully
  worded. They wrote a real answer and nothing came back. With the balance case the session was
  already decremented before the throw.
Confidence: High
```

```
ID: P4-F03  Severity: Blocker  Axis: Data integrity
Location: api/src/modules/public-api/whatsapp-for-an-organisation.service.ts:42-48
Observed: no idempotency on message.id anywhere. Meta redelivers when it does not get a 200 in
  time, and the finish branch holds the response for up to twelve seconds of report polling plus a
  translation call before sending.
Impact: a redelivered message is processed as a fresh answer. Another turn, another model call,
  another slot against the answer ceiling, and potentially another session decrement. Duplicate
  answers reach the record and the report.
Confidence: High
```

```
ID: P4-F04  Severity: Blocker  Axis: User value
Location: api/src/modules/public-api/whatsapp-for-an-organisation.service.ts:146-165
Observed: the completion listener returns early whenever a WhatsAppThread row exists, on the
  reasoning that the finish handler already sent the report. But a thread row is created by any
  WhatsApp interaction with that check-in, and deleted only in the WhatsApp finish branch.
Impact: a person who exchanges one WhatsApp message about a check-in and then finishes it in the
  app or the panel gets no report on WhatsApp at all, ever. The report is generated, the synthesis
  paid for, and the channel they were using goes quiet at the moment it had something to say.
Confidence: High
```

## Majors, in brief

Session completion and closing: P4-C05 the brevity retry has no catch, so a cosmetic length pass
can destroy a synthesis that already succeeded and the release never happens; P4-C06 `extract`,
which every synthesis and extractor uses, has no timeout while `respond` has ninety seconds;
P4-C07 every listener failure lands in one catch that logs and nothing else, so the participant
sees "complete", the lead sees no report, and nothing anywhere says why; P4-C08 the Slack "a report
is ready" notice is sent before the all-emails-failed check that leaves the report unreleased;
P4-C09 the repair sweep covers only session one, so a failed release mid-run is permanent;
P4-C04 when the picture still has a severe fault after two passes it is silently replaced with the
previous round's picture and dated today.

Closing: P4-D01 beginClosingSession loops without a transaction while the client says "nothing has
changed for anyone", and a retry creates a second final session per person; P4-D02 the loop does
not exclude managing-only leads or people who never joined, which can make the closing round
permanently unready; P4-D03 nothing anywhere sets isFinal back to false and there is no un-close,
yet the confirm does not say it is one-way; P4-D04 a ground can reach CLOSED with no closing
synthesis, and the repair query skips exactly the grounds broken by a decline or an auto-close;
P4-D05 the closing email goes to every participant row, including people who declined or never
joined.

Panel: P4-E03 every non-2xx from open() becomes "Try again in a moment", including the billing wall
that cannot be fixed by trying again; P4-E04 the assistant lane parses the body without checking
the status, so a refusal produces total silence, which the file's own comment forbids; P4-E05 no
in-flight lock on the composer and one failure string for a network error, a ceiling and a legal
hold; P4-E06 the panel auto-completes on sessionComplete while WhatsApp asks first, and completion
is irreversible; P4-E07 the once-daily nudge is marked used before the line reaches the person.

WhatsApp: P4-F05 a failed report send is swallowed, so synthesis and a translation call are paid
for and thrown away with no record; P4-F06 a roster person with no linked account is told "You have
no check-in open right now", which is false; P4-F07 a message of twelve characters or fewer is used
to trigger the open and then discarded; P4-F09 any bare number is eaten as a menu pick even
mid-answer, so answering "7" switches check-in; P4-F10 an undelivered reply on the platform route
is logged and lost after the session and model call were spent; P4-F12 "finish" against a
not-started check-in is written into the record as an answer.

Lower: P4-E08 any panel session can settle another person's objective disagreement; P4-E09 an idle
panel polls the host for ever; P4-E11 outbound postMessage uses a wildcard origin while inbound is
checked; P4-F13 an unknown organisation id or a disabled connection swallows every message with no
log and no counter; P4-F15 two live inbound WhatsApp handlers with materially different behaviour;
P4-C10 the board reports a transient server error as a permission problem; P4-C11 the repair sweep
re-sends the "X has checked in" email each time it fires; P4-D06 the resolution panel's labels
change the moment you press a button; P4-D07 re-proposing the same end state re-mails everybody.
