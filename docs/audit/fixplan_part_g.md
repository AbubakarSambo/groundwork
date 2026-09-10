# Fix plan, part G: privacy commitments and the words we use

Nothing here is a register finding. These are things that are working as written and are still worth
deciding, because each one is a promise the product is making on your behalf.

## G1. How long words are kept, and whether a person may erase them

**Today.** There is no retention limit on what anybody writes. A person can download their own
record and cannot delete it. The product tells them their own account of things is theirs, and then
keeps it indefinitely.

This is the gap a buyer's legal team finds first, and for a product whose whole promise is that the
words are private, "for ever" is the answer we currently give.

Two decisions, both yours:

1. How long a person's words are kept after a check-in ends. A default of a year covers a full
   review cycle; anything shorter starts destroying the record the product exists to build.
2. Whether a person may erase their own words while the shared report built from them stays. The
   shared report contains no verbatim runs by design, so this is coherent. It is also the harder
   promise to keep, because it means the report can never be regenerated from the record afterwards.

**Once decided.** A retention column on the organisation, a sweep that removes turns past it and
leaves the record entries and the report, and an erase route for a person's own check-in. The sweep
must never touch a ground under a legal hold.

Spec: `words-do-not-stay-for-ever.spec.ts` and `a-report-outlives-the-words-behind-it.spec.ts`.
Effort: a day, once the two answers exist. Nothing can start before them.

## G2. The processor list names two providers we do not use

**Today.** The privacy page says Groundwork may use OpenAI, Anthropic and Google. Only Google, via
Vertex, is ever called; the model identifiers are set in one service.

The page hedges with "may", so it is not false. It does put three data processors in front of every
security review instead of one, and invites questions about two we do not send anything to.

**Change.** Name the provider we use. Keep a sentence saying the provider may change with notice, so
the page does not have to be rewritten the day it does.

Spec: `the-privacy-page-names-the-provider-we-call.spec.ts` — reads the configured model and fails
when the page names a provider the code does not call. This is the only way that page stays true,
because the page and the config drift silently otherwise.
Effort: an hour for the wording, half a day for the spec.
Risk: none. It narrows a claim.

## G3. "Groundwork staff can't read it" is broader than what we enforce

**Today.** I looked for a staff console that shows a person's words and did not find one. The claim
holds at the level of screens. It is a claim about people, though, and anyone with database access
can read them.

**Change, and it is a choice.** Either narrow the sentence to what is enforced, which is that no
Groundwork surface shows a person's words to staff, or build the control that makes the broad
version true: encryption of turn content under a key the application holds and operators do not,
with a break-glass path that is logged.

The narrow wording is honest and costs an hour. The control is real work and is the thing that lets
you keep the sentence as it stands. I would narrow the wording now and treat the control as a
decision for when a customer asks, because one will.

Spec: `no-staff-surface-shows-a-persons-words.spec.ts` — a scan over the ops and platform consoles.
Effort: an hour, or a week if you want the control.

## G4. Personal data in application logs

**Today.** Email addresses are logged routinely on notification failures. One line in the context
chat writes fragments of what the lead actually said into the log.

It is the lead's own words, not another party's, so the harm is small. Logs usually have wider
access than the database does, and they are the copy nobody remembers to include in a retention
policy.

**Change.** Log the participant identifier instead of the address, and log the count of shortened
phrases rather than the phrases. Both are one-line edits and lose nothing diagnostically.

Spec: `no-log-line-carries-what-somebody-wrote.spec.ts`.
Effort: half a day across all sites.
Risk: none.

## G5. "Account" is doing two jobs

**Today.** The word appears in user-facing copy in two senses: the login sense, which your standing
rule bans, and the telling sense, as in the account you wrote of what happened. Both appear, in
places near each other.

The telling sense is the best word in the product and the reason the ban is awkward to hold.

**Change.** Keep the telling. Remove the login sense everywhere, which is what the rule was always
aiming at. This makes the rule easier to keep rather than harder, and it removes the collision that
makes the two senses read as one sloppy word.

This runs alongside the check-in and session rename in part C, and should be one pass over the copy
rather than two.

Spec: extend the existing copy spec so the login sense fails and the telling sense passes.
Effort: half a day with the rename.

## G6. The service that calls Google is named after Anthropic

Internal only. Every engineer who opens the repository reads it as a fact about the stack, and it
will reach an architecture diagram eventually.

**Change.** Rename the file and the class to what it is. Mechanical.
Effort: an hour.
Risk: a wide diff and nothing else.

---

## What this part is waiting on

G1 cannot start until you answer how long words are kept and whether a person may erase their own.
Everything else here can be done now, and G2 through G6 together are about two days.
