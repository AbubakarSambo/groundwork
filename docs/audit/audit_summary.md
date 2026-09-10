# Groundwork code audit: synthesis

Read-only audit of the repository at commit `fcbc3f9`, 10 September 2026. Nothing was written,
migrated, deployed or sent. The register is `audit_findings.md`; the map is `audit_map.md`. The
browser and notifications audits are separate registers and their counts are given separately.

## Counts

| Register | Blocker | Major | Minor | Note | Total |
|---|---|---|---|---|---|
| Code audit | 51 | 106 | 77 | 31 | 265 |
| Notifications and links | 2 | 16 | 11 | 9 | 38 |
| Browser | 1 | 4 | 9 | 6 | 20 |

Code audit findings by axis: Experience 71, Inconsistency 49, Bug 47, Data integrity 39, Security 38,
User value 21.

After deduplication the 51 code Blockers collapse to 42 distinct causes. The free-extension
cross-organisation write is filed three times (P1-003, P4-001, P4-H02); the non-monotonic
specificity band twice (P2-002, P3-001); raw transcript exposure twice (P6B-004, P1-002).

## The root causes

**1. The meter is spent before the thing is delivered.** One shape, six places: the session
decrement sits before the model call, so a failed or refused turn is still charged and a retry is
charged again (P2-001, P4-002, P4-E01, P4-H01). The same shape releases a report after a synthesis
that failed, and marks a nudge used before the line is sent. Twenty-eight findings trace to it.

**2. Organisation scope is asserted in the comment, not the query.** Several writes and reads
resolve a record by its own id with no `organizationId` predicate, and a variable named
`isOrgAdmin` is computed from the organisation alone with no role test. This is the largest
security cluster: P1-001 through P1-004, P4-001, P6B-004, and the open email relay P0-001.

**3. A refusal is not a channel.** Every surface has careful refusal sentences, and three of the
four channels throw them away. The panel discards the response body, WhatsApp answers Meta with
`received: true` and the person with silence, and the magic-link page maps a named refusal to
"something went wrong, start again". People are told a permanent block is a glitch.

**4. Derived numbers are presented as measured.** A band mapper whose lowest score outranks two
better bands, a confidence figure computed from the same average as the label beside it, a
document-backed percentage that can only ever be zero, and dashboard tiles that count grounds under
a label saying check-ins. Thirty-four data-integrity findings.

**5. A failure is shown as a success.** The save card's error handler is byte-for-byte its success
handler, so a failed save sends the person to "check your email" for a mail that was never sent.
The sign-up form falls through every handled status to the same screen. Under this sit two more
shapes: no in-flight guard on eleven submits, and a destructive action with no confirm on six,
including revoking a live customer's API key.

**6. States exist that nothing can leave.** PAUSED has no exit while the copy promises a resume,
and the cron sweeps it to STALLED. One decline freezes a check-in for ever. A closing session is
metered like any other, so a spent ground can never produce its final report. Undefined transitions
are not caught anywhere, because nothing enumerates them.

## Fix order

Ranked by user harm, then blast radius, then effort.

1. **P4-A01** — an unauthenticated caller overwrites any account's saved draft, gets its token back,
   and can rename that organisation and send invites from it. One address is the whole attack.
2. **P0-001** — the email health check is an open relay through the product's own sending domain.
3. **P1-001 to P1-004, P4-001** — the missing organisation and role predicates. One afternoon.
4. **P6B-004, P1-002** — the routes that return other participants' raw words, which is the one
   promise the product is built on.
5. **P4-B01** — the broadcast join link bypasses approval and the seat cap.
6. **P2-001, P4-002, P4-E01, P4-H01** — move every meter decrement after the model call returns.
7. **P2-002 / P3-001** — the band ordering. A one-line fix that today tells a lead somebody who
   said nothing is well covered.
8. **P4-C01, P4-C02, P2-005** — the frozen states: decline, auto-close, and PAUSED.
9. **P5-009, P5-016, P5-084** — the three screens that report a failure as a success, one of them
   the terminal step of the self-serve funnel and one the only public buy button.
10. **P5-042, P5-070, P5-092, P5-002** — four numbers printed as fact that are not measurements:
   a hardcoded session total, a session count the same file calls wrong, a count of engagements
   labelled sessions, and a specificity score computed from turn count.
11. **P5-099, P5-100** — revoke and rotate on a live integration, one unconfirmed click each.
12. **P4-C03, P6B-015** — verbatim lift screening on every released field, not only the picture.
13. **P4-E02, P4-F02, P4-F01** — make the panel and WhatsApp deliver refusals and stop dropping the
    first message.
14. **P7-007** — four throttle decorators that are silent no-ops, including both WhatsApp webhooks.
15. **P6-001** — the anonymous first report is persisted as one field of nine.
16. Everything else, by severity.

## What could not be checked, and what it would take

- **Delivery.** No test inbox was available, so nothing in the notifications register was received.
  Arrival, placement, sender authentication, bounce handling and link behaviour in a real client
  are all unverified. One address per role on a real provider would close it.
- **Production data.** Every data claim is from the local database. Volumes, thin-account
  behaviour, and whether the auto-closed population is really the 125-session gap need a read
  replica.
- **Stripe.** No live subscription exists, so the cancellation and seat-count paths are read from
  code only.
- **Meta and Slack.** Webhook redelivery, template rejection and the session window were reasoned
  from code; confirming them needs the provider dashboards.
- **Mobile and assistive technology.** Narrow-viewport and screen-reader behaviour was sampled in
  the browser audit, not swept.
