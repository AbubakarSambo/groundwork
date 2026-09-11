# Where the fix plan has got to

Audited 11 September 2026 against the code on `fix/what-the-user-hit-today`, 66 commits after the
plan. Read-only: every verdict below comes from the code as it stands, not from a commit message.

## Health

| | |
|---|---|
| Client suite | 2,102 pass, 311 files, fully green |
| API suite | 6,640 of 6,642. One is a timeout under full-suite load that passes alone. One is a spec for uncommitted work in flight |
| Marketing site | Untouched since the plan. The freeze held |

## Part A — security, tenancy, money

| Batch | Verdict |
|---|---|
| A1 three public routes · A2 records named by id · A4 the join link · A7 money · A8 the Stripe webhook · A9 limits · A11 scopes · A12 client vs server · A13 the zero percentage · A14 mail escaping · A15 a read that writes · A16 the retention sweep · A17 cancelling | **Landed** (13) |
| A3 the raw words | Partly |
| A5 the meter | Partly — **core not started** |
| A6 the back office door | Partly |
| A10 credentials withdrawn | Partly |

## Part B — state, data integrity, numbers

| Batch | Verdict |
|---|---|
| B1 the hold · B3 the door · B4 two of everything · B5 the score band · B7 the report saved · B10 one clock · B12 settings · B13 one word · B14 four doors · B15 process memory · B17 one person · B18 the evidence figure | **Landed** (12) |
| B2 a round that cannot complete · B6 session numbers · B8 failures as facts · B9 the platform panel · B16 a stale token | Partly |
| B11 closing | **Not started** |

## Part C — the client screens · Part E — who may see what

| Batch | Verdict |
|---|---|
| C1 · C3 · C4 · C6 · C9 · C10 · C12 · C13 · C14 · C15 · C16 · C18 · C20, and C2 and C7 built to the correction | **Landed** (15) |
| C5 the scenario key · C8 the rename · C11 arrival state · C19 narrow viewports | Partly |
| C17 the money screens | Superseded by the payments correction |
| E1 the visibility rule · E2 department · E5 leads · E6 machine reads | **Landed** |
| E3 wire the manager rule | **Not started** |
| E4 the organisation switch | Withdrawn, correctly not built |

## Parts D, F and G — channels, promises, privacy

28 landed, 3 partly, 4 uncommitted and in flight, 6 not started, 3 withdrawn, 1 awaiting a decision.
The two sequencing traps in the plan were both taken correctly: one inbound WhatsApp path now, and
the twelve-character fix landed after it, with the bug it could have recreated handled explicitly.
The platform route was hollowed out rather than deleted, so a live Meta app still gets an answer.

## Across all 104 batches

| | |
|---|---|
| Landed | 72 |
| Partly | 16 |
| Not started | 8 |
| Uncommitted, in flight | 4 |
| Withdrawn or superseded | 5 |

## Before anything else

**The working tree does not compile.** Three unused-variable errors in the client, left behind by
the in-flight work on the sign-up wall. Confirmed with a typecheck.

**Two log lines write a person's record entry in full.** On every anchoring decision the log
carries the entry's complete text plus two hundred characters of the document passage and of what
the document says. This is the private record, in the application log, which is read by more people
than the database is. The spec written to catch exactly this has a broken pattern and cannot see
it, so it passes them and fails only on a WhatsApp error body. Fix the pattern first, then the
lines, or the spec will certify a leak as clean.

## What is actually left, in order of harm

1. **A5, the meter.** `open()` still decrements the balance and increments the free-session count
   before the model call, with no transaction, no try/catch and no compensating increment. A failed
   call still charges; a retry charges again; two people opening at once still both pay. No charge
   marker exists. This was wave one and it is the largest open item in the plan.

2. **B8, failures written down as facts.** Only one of seven steps landed. Still live: the brevity
   retry calls the model with no catch, so a cosmetic length pass can destroy a synthesis that
   already succeeded; a spreadsheet that fails to parse is stored as document content reading
   "could not parse", and is then available as corroboration; the picture-swap still substitutes
   the previous round's picture silently and dates it today; and a release failure is still one
   catch that logs.

3. **A6, the back office door.** Still guards a URL pattern rather than a privilege, so the
   platform-admin routes outside that pattern are outside the door. Both one-time codes still use
   ordinary randomness. Verify still has no attempt limit, no lockout and no invalidation on a
   wrong guess. The Google exemption is still read from the token claim rather than the row.

4. **B11, closing.** Not started. No way to call off a closing round, the closing email still goes
   to everyone including people who declined or never joined, re-proposing the same end state still
   re-mails everybody, and `extract()` still has no timeout while its sibling has ninety seconds -
   now worse, because a retry was added around it.

5. **A decline does not close its own round.** Not a plan item — a gap opened by the work itself.
   `decline()` writes DECLINED and returns. It never records the round and emits no event. The
   readers were taught that a decline counts as an answer, but the write site was not, so when the
   last outstanding person declines the round stays open until the 4am backstop sweeps it. Up to a
   day's delay on a report that is ready. Verified directly in the code.

6. **A10, WhatsApp secrets.** The access token and app secret columns are still plain text and no
   encryption helper exists.

7. **B2, the willingness gate.** Half-removed and half-unbuilt: the column is gone, the board chip
   that names the state survives, and nothing is wired to `decline()`.

8. **B16, Google sign-in.** Linking an unrecognised Google id to an existing account still forces
   `isEmailVerified: true`, and that flag is what opens the back-office Google exemption.

9. **B9**, the second platform console is still routed, though it no longer miscounts.
   **B6**, one screen still defaults a numerator rather than showing no total. **B12**, three
   models are still written and never read, kept with an argument rather than a reader or a
   deletion. **B11** landed only its error-state step.

10. **A token still authenticates against the wrong organisation.** Membership is checked against
   the person's current organisation rather than the one named in the token, so a token minted
   before an organisation switch still authenticates as the current one. Small, and it is the exact
   class the batch exists to close.

11. **E3, the manager rule is still not wired.** The rule exists, is tested, and is reachable on
   one published route only. The app's own reads still do not ask it. This was costed at hours.

12. **C8, the rename is half applied.** The nine strings in the original table are renamed and
   locked by a sweep. The cluster the plan audit added is untouched: the situation-picker page
   still carries about twenty cards of session-sense prose, plus a catalogue label and four more
   across the admin and list pages. So the collision survives on the first screen a new customer
   reads.

13. **C5**, the server root is fixed but both client leaks of the raw scenario key remain.
   **C11**, one half cannot be done until the API returns the fields it needs. **C19**, one of two
   narrow-viewport defects.

## One permission inconsistency worth a decision

Once a report exists, an ordinary member of the organisation is refused it. Before it exists, the
"why there is no report yet" branch still uses a bare same-organisation test with no role check, and
tells them who has started and who has finished. The comment argues this says nothing a participant
list would not. It is defensible, but it means the same ground answers differently either side of
the report being written, and the scan spec that is supposed to catch roleless tests does not see
this one.

## Two things that need a decision, not code

**The invite-link upload now answers the consent question on the uploader's behalf**, recording it
as taken on the word of whoever holds the invitation. The signed-in path still asks. The plan said
refuse when unconfirmed. The asymmetry is deliberate and has a test pinning it.

**One sentence on the frozen privacy page is now demonstrably false.** It says staff cannot access
organisational data. The words half is true - a spec proves no staff surface reads turns, record
entries or notes - but a staff surface still builds a roster from participants. Copy is frozen, so
this closes either by narrowing that surface or by recording it as an accepted exception.

## Quality note

Where the plan and its audit disagreed, the implementation repeatedly took the audit's corrected
version and said so. It deleted a dead column rather than backfilling it, refused to invent a fifth
subscription status, rewrote a pinned test's argument instead of breaking it, and in three places
solved the problem better than the plan proposed. The departures are documented in the code.
