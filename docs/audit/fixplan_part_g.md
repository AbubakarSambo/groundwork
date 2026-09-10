# Fix plan, part G: privacy commitments and the words we use

Nothing here is a register finding. These are things that are working as written and are still worth
deciding, because each one is a promise the product is making on your behalf.

## G1. Withdrawn. Deletion and retention already ship

**Corrected 10 September 2026. This batch should never have been written.**

Everything G1 proposed to build exists. `DELETE /users/me/data` is wired to `eraseAccount`
(`users.service.ts`), reachable from a visible "Erase it" control in the app's settings. Its doc
comment states the rule as an Article 17 erasure: it anonymises every identifying field on the
person and their participant links, and keeps the conversation content under the other party's
legitimate interest in the shared record, noting that the retained content no longer carries the
person's name or address. That is precisely the decision the product owner gave me, already
implemented, with its legal basis recorded.

Retention exists too. `RetentionPolicy.turnRetentionDays` defaults to 180 days, and a nightly cron
ages out departed people's turns.

So the two questions I put to the product owner were both already answered in code. The decisions
she gave match what is built, which is the only reassuring part of this.

**What is actually left.** A reconciliation, not a build:

- The stated retention position is now "keep everything for now", and the code keeps turns for 180
  days. One of those has to move. My recommendation is to keep the 180-day default, because it is
  built, tested and defensible, and to raise it only if a customer needs it.
- This batch said "no sweep, no expiry". Part A batch 16 repairs that sweep and adds a deletion
  backfill. A16 is right and this was wrong; A16 stands.
- The "refuse deletion while a round is open" rule I proposed is unsafe as stated, because the
  field it would test is nullable, so a check-in that never completes would lock somebody out of
  erasure permanently. If that rule is wanted it must be time-bounded.
- One real gap the existing implementation has: a report renders participant names by joining to
  the live person, so an erased person appears as a deleted user on reports that previously named
  them, while a different surface keeps the original name. Those two disagree, and the decision was
  that nothing already written changes. That is the only genuine defect here.

Effort: hours, for the name-rendering disagreement. Nothing else.

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

## G5. Withdrawn. My recommendation was backwards

**Corrected 10 September 2026.** I proposed keeping the telling sense of "account" and removing the
login sense. The shipped rule is the exact opposite, and it is right.

`client/src/components/gw/account-is-not-the-word.spec.ts` states it: what is banned is the sense,
not the string. The login sense stays, because that is what a reader resolves the word to before
they reach the end of the sentence. The telling sense is the one that must not appear in copy,
precisely because it is the codebase's own internal vocabulary and keeps leaking out of the
comments into the product. The comments are deliberately left alone.

There is nothing to do here, and something to avoid: the copy pass in part D must not rewrite the
report vocabulary on the strength of what I originally wrote.

## G6. The service that calls Google is named after Anthropic

Internal only. Every engineer who opens the repository reads it as a fact about the stack, and it
will reach an architecture diagram eventually.

**Change.** Rename the file and the class to what it is. Mechanical.
Effort: an hour.
Risk: a wide diff and nothing else.

---

## What this part is waiting on

Nothing, and this part is now much smaller than it looked. G1 and G5 are withdrawn because both
were already built. What remains is G2, G3, G4 and G6, plus a few hours reconciling how an erased
person's name renders. About a day in total.
