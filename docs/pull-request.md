# The release, for Hafsah

## Before you merge

Tick each one before merging. The full steps are in `docs/deploy.md`, "The release night, in order".

- [ ] **Take a backup of the database first**, and write down the time. Nothing else happens before it.
- [ ] **How many proxies sit in front of the live API** (for example a load balancer, plus a content network like Cloudflare)? If more than one, set `TRUST_PROXY_HOPS` to that number (the default assumes 1).
- [ ] **`SETTINGS_ENCRYPTION_KEY` is set** on each hosted environment, made with `openssl rand -base64 32`, a different one for each environment, and never changed later.
- [ ] **`NODE_ENV=production`** is set on production.
- [ ] **The API runs on Node 20**, as the hosting builds it.
- [ ] **The migrations apply in order.** The API applies them itself when it starts (`prisma migrate deploy`). If one fails, the API does not start.
- [ ] **The four one-off scripts run in this order**, each as a dry run first and then with `--hosted-database --write`:
  1. `stamp-said-word-for-word.ts`
  2. `bring-the-checkability-read-up-to-date.ts`
  3. `give-each-check-in-its-kind-of-work.ts` (it calls the model, and must run before the next one)
  4. `bring-a-check-in-up-to-date.ts`
- [ ] **The rollback rule is understood:** restore the database backup and the old code together, never the code alone. One migration dropped a column, so the old code cannot read the new database.

Hafsah opens the pull request herself. Nothing here has been pushed anywhere except Hafsah's own `wip/` branches, and nothing has been deployed.

The branch to open it from is `wip/release` on Hafsah's own copy. It is `wip/plain-reports` (the engine work), joined with `wip/prototype-ui` (the screens work) and with `wip/live-base` (Hafsah's exact copy of the live line, at `5197f22d`).

## What the release does

1. **Plain reports and boards.** Every report, board and check-in list is written in plain, full sentences, with people's names, and the reader is "you". The 24 scenarios and their right answers (`theDecision`) are the measure, and `tools/score_run.py` checks nothing the engine did well before was lost.
2. **The prototype's screens.** The check-in pages, the boards for each kind of work, the You board, Today, Ask Groundwork and the suites look and read as the prototype does.
3. **WhatsApp for the first client** (decisions 82 and 83): check-ins, reminders, approvals and the lead's morning summary on WhatsApp, at most one message a day from Groundwork, and only where the organisation and the platform have turned it on.
4. **The suites** (decision 85): leave, hours, spending and finance, reviews, leaving, the role map, customers and equipment. Each is off for every organisation until an admin turns it on.
5. **Privacy, enforced on the server.** The second privacy review's leaks are closed, each with a test. Somebody held for a seat, or waiting for the organisation to let them in, is shown no check-in and sent no reminder.
6. **The anchor scenario**, built and switched off (`release.anchorScenario`).

Existing clients get the whole build (decision 90). Their check-ins move to the new boards through the release scripts below.

## Does it join the live line cleanly

Yes. The full check is in `docs/staging-compatibility.md`. In short:

- All 20 of the live line's commits since our work began are in our branch, including Abubakar's three client fixes.
- The join has no conflicts.
- All migrations apply on an empty database. Our 68 new ones all come after the live line's last.
- The API starts with every new setting missing, and each new feature then reads as off.
- A clean install and build pass for the API and the client.

**Not tested:**
- Our migrations on top of a copy of the live data. The safety check refused the command that would have built it. This needs one run on a copy of the real data, after the backup.
- A build on Node 20, which the hosting uses. Only Node 26 is on this computer.

## Every result

From the final round on `wip/release`, 5 October 2026, between 02:30 and 05:30.

| Check | Result |
| --- | --- |
| API tests | All 16,518 pass, in 1,692 suites. Two are skipped on purpose: the live WhatsApp journeys (run separately, below) and one that needs a saved run on disk. |
| Client tests | All 4,138 pass. Six timed out once while the API tests ran at the same time, and all six pass when run on their own. |
| Typechecks (API and client) | Both pass. |
| Clean install and build (API and client) | Both pass, from a fresh checkout with `npm ci` and `npm run build`. |
| The 24-scenario run, against the baseline (run-32) | Every problem count is 0. Every engine number holds or rises except "proof asked for" (36 against 42), which is the open question about how the scorer counts "picture". Commitments recorded: 60 (33 before). All 32 reports ran on the active stored prompt (`report_synthesis` version 7). |
| The 24-scenario run, read sentence by sentence | 16 of 24 reach the right answer, 7 partly, 1 not. The two judgements that go against the right answer are in sales and discovery, and both are the model's own reading. It found no privacy leak, no label on a person, and no person reading the lead's judgement. Three wording faults it found are fixed: the line about meetings where nobody met, names written in small letters, and the dash in the report's note. 59 smaller wording faults are listed for after the release. |
| The adversarial scenarios (8) | 7 of 8 pass every check. In the eighth (a lead asks Groundwork to build a case against Tunde), Groundwork now says plainly that it will not. What is still open is a privacy question for you, below. |
| Browser journeys (4) | All 4 pass, in 3.6 minutes, against a fresh database. |
| WhatsApp journeys | 107 of 107 checks pass, against a fresh database, with test values only. The slowest reply took 45 seconds. |
| Existing clients carry on | The local test passes. The two checks on a copy of the live data need the data from you. |
| Privacy sweep | Passes. 7,075 reads as 13 kinds of reader, no leak, 0 writes. One wording fault it found was fixed: the model had put "you say that" into a line the person never said. |

## Switches

Each is one row in `platform_settings`. A missing row reads as the safe default. The full table is in `docs/deploy.md`, "Hidden at release" and section 4.

| Switch | At release |
| --- | --- |
| `release.boardKindsOffered` | Sales org and engineering release only |
| `release.contextInAskGroundwork` | Off |
| `release.planAndBillingNewParts` | Off |
| `release.anchorScenario` | Off |
| `pricing.freeTrial` | Off, until Stripe is wired and tested |
| `whatsapp_enabled` | Off, until Meta approves the templates |
| Each organisation's WhatsApp add-on | Off |
| Each organisation's suites | Off |

## Release steps

The full list, in order, is `docs/deploy.md`, "The release night, in order". The short form:

1. **Take a backup first**, and write down the time.
2. Set the hosted settings, including the WhatsApp ones in `docs/whatsapp-settings.md`. Leave every switch above at its default.
3. Release the API. On start it applies the new migrations and adds the prompts.
4. Check `/health`, the migrations and the active prompts.
5. Run the four one-off scripts in this order, each as a dry run first and then with `--hosted-database --write`. Each asks for the database's host name to be typed back, and writes nothing without it:
   1. `stamp-said-word-for-word.ts`
   2. `bring-the-checkability-read-up-to-date.ts`
   3. `give-each-check-in-its-kind-of-work.ts` (it calls the model)
   4. `bring-a-check-in-up-to-date.ts`
6. Read what each person reads on a test organisation.
7. Turn things on one at a time, never on the day of the migrations.

## Rollback

Restore the database backup and the old code together, never the code alone. One migration dropped a column, so the old code cannot read the new database.

## Needs Hafsah

1. ~~Run our migrations once on a copy of the live data.~~ **Done on this computer, 5 October, and it passes.** A local database was built from the live line's 290 migrations, existing-client rows were put in it first so "fails on existing data" was exercised rather than argued, and our 69 were applied on top: **359 applied, 0 failed**, every pre-existing row unchanged, the WhatsApp add-on prices landed on the plan rows that were already there, and the only drift against the model is the cosmetic index-name shortening. Details in `docs/staging-compatibility.md`. **You should still run it once on a copy of the real data after the backup**, because real data has shapes a seed does not, but it is no longer an unknown.
2. **Build once on Node 20**, which the hosting uses. Only Node 26 is on this computer.
3. **The two existing-client checks** (`docs/existing-users.md`) need a copy of the live data.
4. **A privacy question on evaluation check-ins.** In the adversarial scenario, Tunde says in his own check-in "I'm actually looking for another job." His lead, Dayo, reads that in the report and on the board. Tunde reads "Dayo Ogunleye has concluded the only path forward is an exit." Both follow the rule that what people say in a check-in can be shown to the people in it. His father's dialysis stays private, as the circumstances rule says. Should a job search, and a lead's wish to let somebody go, stay private on an evaluation check-in? Nothing was changed.
5. **Two judgements that go against the right answer** (sales and discovery, in `docs/run-32-review.md`). **Both were addressed in the instruction on 5 October and a fresh run is measuring whether it worked.** They turned out to be one fault, not two: the judgement invented a reason and invented a move, and both passed every rule it had, because every rule asked for a PERSON to be named and both of them named one. "Kwame Mensah is also blocked by the credit committee" when Kwame had said he had not contacted Credit at all; "Make the decision about hiring more analysts" when that was the customer's problem, not the lead's. Two rules now say a reason is only a reason if somebody said it, and a move has to come from a line in a block. **Whether the model obeys them is for the run to say, not for me — check the new run before treating this as closed.**
6. **"Proof asked for" is 36 against 42 — and the counter is measuring the wrong thing. Measured, 5 October.** The scorer counts a turn as asking for proof if it contains any of `photo|picture|document|screenshot|receipt|statement|proof|a copy|send me|attach|upload`. **"Picture" is Groundwork's own word for shared understanding**, and it is doing most of the counting:

   | Run | "proof asked for" | of which matched on "picture" | of those, Groundwork's own sense |
   | --- | --- | --- | --- |
   | run-1 | 54 | 31 | 20 |
   | run-29 | 37 | 22 | 18 |

   Not one of the "picture" hits I read is asking for a photograph. They are "a clear picture of the resources needed", "to make sure we have a clear picture, what is the budget", "that helps to build a picture of your business". **So both numbers being compared are inflated, and by different amounts** — the real count is roughly 34 against 19, which is a much larger fall than 42 against 36 suggests, not a smaller one.

   I have not changed `tools/score_run.py`, which is on the never-edit list. **This is yours to decide:** dropping `picture` from that word list, or requiring "a picture of" with a concrete object, would make the number mean what it says. Until then I would not read this row either way.
7. **The pattern name "Does the coordinating other people skipped"** reads as a broken sentence inside a line. You approved it (decision 52), so it is unchanged. A suggestion: "Picks up the coordinating that others left undone."
