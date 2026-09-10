# Fix plan, part G: privacy commitments and the words we use

Nothing here is a register finding. These are things that are working as written and are still worth
deciding, because each one is a promise the product is making on your behalf.

## G1. How long words are kept, and whether a person may erase them

**Today.** There is no retention limit on what anybody writes. A person can download their own
record and cannot delete it. The product tells them their own account of things is theirs, and then
keeps it indefinitely.

This is the gap a buyer's legal team finds first, and for a product whose whole promise is that the
words are private, "for ever" is the answer we currently give.

**Decided, 10 September 2026.** A person may delete their way in. Their record stays.

That is a coherent pair and it is the cheaper half to build. The record was made of their words but
it is also the other parties' evidence of what was agreed, and pulling it out retrospectively would
change reports other people have already read and acted on. Deleting the way in means: no sign-in,
no notifications, and no appearance in any roster or picker for a future check-in. The record is
untouched. Their words stay, their name stays on the reports that already carry it, and nothing
already written changes. What goes is the way in, and nothing else.

Two consequences to be deliberate about. Somebody who deletes their way in and is later invited
again arrives as a new person, so their earlier record does not follow them; that is the right
answer but the invitation copy must not imply otherwise. And the deletion must be refused, with a
reason, while a check-in they are party to is still open, because removing a live party mid-round
is the frozen-round bug in part B by another route.

**Retention, decided 10 September 2026: keep everything for now.** No sweep, no expiry. This is
revisited before the first paying client, not after, because a retention promise is easier to make
than to apply retrospectively once real records exist.

Two things to do now so that later decision is cheap rather than a migration. Record when each
check-in ended, which is already stored, so any future window can be applied without guessing. And
do not spread copies of a person's words into places a sweep would later have to chase: today that
means the log lines in G4 and nothing else, which is one more reason to do G4 now.

**Once decided.** A retention column on the organisation, a sweep that removes turns past it and
leaves the record entries and the report, and an erase route for a person's own check-in. The sweep
must never touch a ground under a legal hold.

Spec: `a-person-may-delete-their-way-in-and-the-record-stays.spec.ts`, and
`nobody-leaves-while-a-round-is-open.spec.ts`.
Effort: a day for the deletion path. Nothing in this part is blocked.

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

Nothing. Both questions are answered: a person deletes their way in and not their record, and
records are kept until we revisit it with clients. G1 is about a day, G2 through G6 about two more.
