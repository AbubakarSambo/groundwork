# Groundwork: the fix plan

Written 10 September 2026 from the three audits in this directory. Nothing has been built. This is
for you to read before anything starts.

## How to read this

The detail lives in seven part files. This document is the order to do them in and the decisions
they rest on. Every batch below is a reference like `A3`, meaning batch 3 of `fixplan_part_a.md`.

| Part | What it covers | Batches |
|---|---|---|
| `fixplan_part_a.md` | Security, tenancy, money | 16 |
| `fixplan_part_b.md` | State machine, data integrity, numbers | 17 |
| `fixplan_part_c.md` | The client screens | 20 |
| `fixplan_part_d.md` | WhatsApp, the panel, notifications, arrival doors | 20 |
| `fixplan_part_e.md` | Who may see what, and department | 6 |
| `fixplan_part_f.md` | Promises, unreachable features, the published API | 16 |
| `fixplan_part_g.md` | Privacy commitments and the words we use | 6 |

Every proposed change was checked against the code before it was written down. Where the register
and the code disagreed, the part files say so; there are nine such corrections and they matter,
because three of them would have turned a fix into a new bug.

## Standing constraints

**Nothing in the marketing site or its homepage is changed by this plan.** Several batches were
written proposing a wording change there. Those halves are struck. Where a batch had a product half
and a copy half, only the product half survives.

This has a consequence worth stating plainly rather than burying. Some of the claims the audit found
on the site are ones the product does not currently deliver. With the copy frozen, the only way to
close those is to build the thing the claim describes. `planaudit_d_f_g.md` lists every claim that
now stands uncorrected and what the product would have to do to make each one true. Read that list
and decide which to build and which to accept as a known gap. The gap does not disappear because the
sentence stays.

## Decisions already made

- **Deleting.** A person may delete their way in. The record is untouched: their words stay, their
  name stays on reports that already carry it, nothing already written changes.
- **Retention.** Keep everything for now. Revisited before the first paying client, not after.
- **Department.** Optional, captured beside role wherever a person is added, usable through the API,
  never inferred.
- **Cancelling.** A cancellation ends the subscription at the end of the paid period. Somebody who
  wants to stop sooner pauses instead, which is already built and correct. See batch `A17`.
- **check-in and session.** A check-in is the whole engagement. A session is one round by one
  person. Grounded in what the navigation and the database already do.

## The one correction you should read first

`CORRECTION-payments.md`. I wrote parts of this plan believing payment was not connected on
production. That was wrong, and it changes the severity of four billing findings. The worst of them
is that cancelling ends a subscription immediately rather than at the end of the paid period, so a
customer who cancels early loses time they have already paid for, with no refund and no notice.

## The plan was itself audited against the code

Four passes checked every batch against what the code actually does. Their reports are
`planaudit_a_e.md`, `planaudit_b.md`, `planaudit_c.md` and `planaudit_d_f_g.md`. Read the one for
any part before working on it.

What they found, and what has been done about it:

- **Sixteen batches are unsound as written.** Each is now marked in place with a warning naming the
  problem. Do not implement one from its original text.
- **Four batches proposed building something that already ships**, and are withdrawn: the manager
  read rule, the organisation switcher, self-service erasure with retention, and the banned-word
  rule, whose polarity I had backwards. All four exist, wired and specified.
- **Three pairs of batches collide**, proposing incompatible versions of one fix: cancellation in
  two places, WhatsApp idempotency in two places, and the refund path in two places. The later of
  each pair defers to the earlier.
- **About a third of the line citations are wrong.** Implement by searching for the symbol, never
  by opening the cited line. The diagnoses hold; the coordinates drifted.
- **Several batches reverse a written decision without acknowledging it.** This codebase records
  its reasoning in long comments above the code. Where a batch contradicts one, the comment wins
  until somebody argues with it deliberately.

The corrections are folded into parts E, G, A, B and F. The audits stay on disk because they carry
the evidence, and because they are the record of what the plan got wrong.

## The order

### Wave 0 — three things to confirm, not build

Nobody can settle these from the repository. They gate how urgent wave 1 is.

1. Is the payment webhook signing secret set on production? Without it no invoice event is trusted
   and the billing record silently stops matching Stripe.
2. Is the webhook endpoint registered and recently delivering?
3. Has the endpoint that creates charges under a comment claiming it is unreachable ever been
   called? If it has, somebody has been charged through a path the team believes is dead.

### Wave 1 — exploitable now, or taking money wrongly

`A1` three public routes acting with the product's own authority, including an open mail relay and
the unauthenticated draft takeover. `A2` eleven handlers that name a record by its id alone. `A3`
the raw words, which is the promise the product is sold on. `A4` the join link as a way into an
organisation. `A7`, `A8` and `A17` money kept or refused wrongly, the webhook that loses the record, and
cancelling early taking money that is not returned.
`B3` the door people actually use, which has no lock and no meter.

`B3` is the one to look at first if you read only one thing. The streaming route the client uses
checks only that the check-in is yours, and skips both the hold guard and the meter.

### Wave 2 — flows that cannot finish

`B1` a hold with no exit and an ending that does not end. `B2` a round that can never complete.
`B4` transactions, which unblocks the two above. `D1` nobody on WhatsApp meeting silence. `D6` the
panel telling the truth about what happened. `C1` a failure never rendering the success screen.
`F1` a blocked participant offered two buttons that cannot work.

`B4` first inside this wave. `D1` is a single try block and the highest harm per line in the plan.

### Wave 3 — numbers and promises

`B5` the score band whose bottom is upside down. `B6`, `B7`, `B9` numbers labelled as one thing and
counting another. `C4` numbers printed as fact on screen. `A13` a figure the code can only print as
zero. `F10` the marketing guard that reads one page out of five, which is why the false privacy
sentence survived. `F9` a performance process wrapped around an onboarding.

### Wave 4 — the visibility rule

`E1` one rule every read calls, then `E2` department, `E3` the manager scope, `E6` machine reads,
`E5` leads. `E4` last and alone, because it touches sign-in.

This wave replaces the predicates added in `A2`. Do it after, not instead.

### Wave 5 — the channels and the doors

`D2` one inbound handler instead of two. `D3` through `D5`, `D8` through `D17`. `F5` the
twelve-character discard, which must land after `D2` or it recreates a bug the register described.
`F11` advertising WhatsApp on the site, which must land after all of `D`, or the site sells a
channel that answers with silence.

### Wave 6 — the client sweeps

`C2`, `C3`, `C6`, `C7`, `C9` through `C16`, `C18`, `C19`. Nine of these are one shape repeated
across many files, so they are cheaper together than apart. `C8` the rename runs with `G5`, as one
pass over the copy rather than two.

### Wave 7 — what is built and cannot be reached, and what is dead

`F12`, `F18`-equivalents in `D18`, `B12`, `B14`, `B15`, `A9` through `A12`, `A14` through `A16`,
`F13` through `F16`, `B10`, `B13`, `B16`, `B17`, `C17`, `C20`, `F2` through `F4`, `F6` through
`F8`, `D19`, `D20`, `G1` through `G6`.

`G4` is worth pulling forward: it is half a day, and now that records are kept indefinitely, not
scattering copies of people's words into logs is worth more than it was.

## What this plan does not cover

Six notification findings cannot be fixed, or even confirmed, without a test inbox and provider
access: a staging deploy with a live mail key, seeded inboxes on the four large mail providers, the
sending dashboard, and a Meta business account with a test number. They are listed in `D20`.

The register itself could not check production data, live payment behaviour, provider webhook
redelivery, or a full sweep of mobile and assistive technology. `audit_summary.md` says what access
each would need.

## Coverage

`check_coverage.sh` proves this plan accounts for every finding in the register, exactly once, and
flags anything cited that the register does not contain. Run it after any edit to a part file.

The identifiers `P4-E10`, `P4-F08`, `P4-F11` and `P4-F14` are gaps in the register's numbering. The
plan names them only to record that they do not exist, rather than inventing findings to fill them.
