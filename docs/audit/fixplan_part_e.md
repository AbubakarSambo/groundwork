# Fix plan, part E: who may see what, and where department comes from

This part exists because the register kept filing the same thing as several bugs. The product has
never written down who may read a check-in, so each file answered for itself. Fixing the four
missing predicates without fixing that leaves the next endpoint free to invent a fifth answer.

Part A owns the missing organisation and role predicates as a security fix. This part owns the
rule they should all call. Where an identifier appears in both, the security fix ships first and
this rule replaces it in the same sprint.

## What is true today, verified

| Surface | The test it applies |
|---|---|
| The check-ins list | Admins see every check-in in the organisation; everybody else sees only their own |
| Read a report, four paths | Same organisation, no role test at all, and the reader is treated as the lead |
| Read a check-in | Same organisation, no party test |
| The board | Same organisation and the admin role, arrived at separately |
| Two people-shaped API routes | No party test |
| A person's own record and transcript | Owner only. Correct |
| An uploaded document | A three-way choice made by whoever uploaded it. Correct, and the model the rest should copy |
| Deactivation and role change | Re-read from the database on every request, so both take effect immediately. Correct |

Department and a reporting line already sit on every person row. The directory sync writes them.
The public API returns the department. Nothing anywhere reads either one.

---

## E1. One rule, in one file, that every read calls

Closes: P1-001, P1-002, P6B-004, and the disagreement between the list and the read.

Add `api/src/modules/grounds/who-may-read-this-check-in.ts`, in the style of
`a-ground-that-has-ended.ts`: no database access, no Nest, one pure function taking the viewer and
the check-in and returning what they may see. Three levels, not a boolean, because the register
shows the damage comes from treating a reader as either nobody or the lead:

- `own` — their own record and their own words.
- `shared` — the shared report, the board, who has answered. Never another person's exact words.
- `lead` — the above, plus the admin surfaces of the check-in they run.

The four report paths, the check-in read, the board, and the list all call it. The list stops being
the place the rule lives and becomes a query built from it.

Then delete the local `isOrgAdmin` variables. There are six of them and they are the bug.

Spec: `one-rule-decides-who-reads-a-check-in.spec.ts`, plus
`no-read-invents-its-own-answer.spec.ts` — a scan that fails when a report, board or grounds read
compares `organizationId` itself instead of calling the rule. That second spec is the one that
stops this coming back, and it is the reason to do this as a module rather than six edits.

Migration: none. Backfill: none.
Effort: a day for the module and the six call sites, half a day for the scanning spec.
Risk: a read that should be allowed starts refusing. Mitigated by the level being three-valued, so
the common case of an admin reading a shared report keeps working.

## E2. Department is captured wherever a person is added

Closes: the gap that makes E3 impossible, and the panel's silent drop of it.

Department is optional and sits next to role at every door where a person is added:

| Door | Today | Change |
|---|---|---|
| Directory sync | Writes department and the reporting line | No change |
| The panel's add-a-person | Takes email, name, external identifier, phone | Accept an optional department |
| The public API's person write | Same shape | Accept an optional department, and document it |
| Adding a contributor in the app | Asks what their part is | Add an optional department beside it |
| The join page | Asks "your part in this" | Add an optional department beside it |

One rule for all five: optional, never inferred, never guessed from an email domain, and blank
means blank rather than a default. A person with no department is not in a department, and E3 must
treat that as "no manager scope", not as "everyone's".

Spec: `a-person-may-have-a-department-and-may-not.spec.ts`, and
`every-door-that-adds-a-person-asks-the-same-things.spec.ts` so a sixth door cannot skip it.

Migration: none, the column exists. Backfill: none, blank is a valid answer.
Effort: half a day.
Risk: low. The field is additive and already in the schema and the API response.

## E3. The manager rule exists. Wire it to the reads that do not use it

**Corrected 10 September 2026.** This batch was written as though the manager rule had to be built.
It does not. `api/src/modules/reports/whose-reports-a-manager-may-read.ts` implements it, with a
long header stating the rule, and `a-manager-sees-the-report-not-the-words.spec.ts` holds it. It
already draws the two lines that matter: a solo report is never handed over by virtue of being
somebody's manager, a transcript never at any level, and access follows your own people rather than
any report that happens to mention one of them.

It is reachable through exactly one route, the published interface's reports-for-my-people. The
product's own client never calls it, and the app's four report reads still use the roleless
organisation test.

So the work here is not a rule, it is a wiring job: E1's rule delegates to this module rather than
inventing a second answer, and the app's own reads go through E1. That is the whole batch.

Two things to check while wiring, because they are the failure modes the module cannot see from
where it sits. A person with no department must not match another person with no department. And
the caller has to supply the manager's own external identifier, which the app's session does not
carry today the way a panel caller's does.

Spec: extend the existing one rather than adding a near-duplicate. Do not write
`a-manager-sees-the-report-and-not-the-words.spec.ts`; the file already exists under all but one
character of that name.

Effort: hours, not the half-day previously stated, and only after E1.
Risk: low. The rule is already specified and tested; this changes who can reach it.

## E4. The organisation switch is global, and the join path does not use it

**Corrected 10 September 2026.** This batch claimed the organisation should move out of the person's
row and into the session. That reverses a decision recorded at `auth.service.ts:1209-1218`, and it
is unnecessary: the switcher exists, it takes the role from the membership rather than carrying the
old one, and it works, because it writes the active organisation onto the user row and the token
strategy re-reads that row on every request.

Two real defects remain, both narrower than what was proposed.

The active organisation is global to the person rather than to the session. Switching in one browser
switches every other browser and device at the same time, mid-task, with no notice. Whether that is
worth changing is a judgement: the cost of per-session is that every org-scoped query stops trusting
the user row, which is the rewrite the recorded decision deliberately avoided. My recommendation is
to leave it and say so on the switcher, rather than to rewrite the scoping.

The join path never switches. Somebody who joins another organisation's check-in is signed in against
their home organisation, so the shell around the check-in reads the wrong one. That is P4-B07 and it
is a real bug with a small fix: the join confirmation switches the active organisation to the one
whose check-in they just joined, using the switcher that already exists.

Spec: `joining-somewhere-else-puts-you-there.spec.ts`.

Effort: hours for the join path. The per-session question is a decision, not a task.
Risk: low, once it stops being a rewrite.

## E5. What a lead may read

Closes: the role that grants nothing.

Lead is a real role and is consulted in two places, neither of them a read. A lead cannot see their
own team's reports unless they happen to have started the check-in.

Once E1 exists, a lead reads at `shared` for any check-in in their department, and at `lead` for
the ones they run. If E3's setting says nobody, a lead still reads what they run, because that is
what starting a check-in already means.

Spec: `a-lead-reads-what-they-run.spec.ts`.

Effort: hours, once E1 and E3 exist.
Risk: low.

## E6. Machine reads ask the same question

Closes: P4-G01, P4-G02, P4-G05, P4-G07.

A customer's key currently reaches two people-shaped routes with no party test. The rule from E1
takes a viewer, so give it a machine viewer: the organisation on the key, plus the person the panel
session is acting as. No second set of rules for the API, because a second set is how the first one
drifted.

Spec: `a-key-reads-no-more-than-a-person.spec.ts`.

Effort: half a day after E1.
Risk: it will refuse calls that work today. That is the point, but it is a breaking change for any
integration already relying on it, and there is one.

---

## Order

E1 first, because E3, E5 and E6 are each small once it exists and unbounded before it. E2 can run
in parallel; it touches different files. Then E3, then E6, then E5. E4 last and alone.

Total: about four days of work, one of which is E4 on its own.

## Coverage

| ID | Batch |
|---|---|
| P1-001 | E1 |
| P1-002 | E1 |
| P6B-004 | E1 |
| P4-B07 | E4 |
| P4-G01 | E6 |
| P4-G02 | E6 |
| P4-G05 | E6 |
| P4-G07 | E6 |

The rest of this part is not a register finding. It is the decision the register kept tripping over.
