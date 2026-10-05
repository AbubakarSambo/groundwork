# The release, for Hafsah

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

Filled in from the final round on `wip/release`.

| Check | Result |
| --- | --- |
| API tests | To be filled in |
| Client tests | To be filled in |
| Typechecks (API and client) | To be filled in |
| Clean install and build (API and client) | To be filled in |
| The 24-scenario run, against the baseline | To be filled in |
| The adversarial scenarios | To be filled in |
| Browser journeys | To be filled in |
| WhatsApp journeys | To be filled in |
| Existing clients carry on | To be filled in |
| Privacy sweep | To be filled in |

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

Listed at the top of `docs/morning-report.md`.
