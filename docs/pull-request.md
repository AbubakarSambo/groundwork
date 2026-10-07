# The release, for Abubakar

## Before you merge

Tick each one before merging. The full steps are in `docs/deploy.md`, "The release night, in order".

- [ ] **Take a backup of the database first**, and write down the time. Nothing else happens before it.
- [ ] **How many proxies sit in front of the live API** (for example a load balancer, plus a content network like Cloudflare)? If more than one, set `TRUST_PROXY_HOPS` to that number (the default assumes 1). The API writes one warning in its log at start while this is unset, and starts anyway.
- [ ] **`SETTINGS_ENCRYPTION_KEY` is set** on each hosted environment, made with `openssl rand -base64 32`, a different one for each environment, and never changed later.
- [ ] **`NODE_ENV=production`** is set on production.
- [ ] **Which Node runs the API and the client.** Your commit "fix: node" asks for Node 24. Our notes said Node 20. The build and the production start check pass on both (Node 20.20.2 and Node 24.21.0), so either is fine; please say which the hosts run.
- [ ] **The migrations apply in order.** The API applies them itself when it starts (`prisma migrate deploy`). If one fails, the API does not start.
- [ ] **The four one-off scripts run in this order**, each as a dry run first and then with `--hosted-database --write`:
  1. `stamp-said-word-for-word.ts`
  2. `bring-the-checkability-read-up-to-date.ts`
  3. `give-each-check-in-its-kind-of-work.ts` (it calls the model, and must run before the next one)
  4. `bring-a-check-in-up-to-date.ts`
- [ ] **The rollback rule is understood:** restore the database backup and the old code together, never the code alone. One migration dropped a column, so the old code cannot read the new database.

## What is in it

This is the whole build: the engine work, the screens work, and everything you changed on the shared line, joined on the branch `wip/release`.

1. **Plain reports and boards.** Every report, board and check-in list is written in plain, full sentences, with people's names, and the reader is "you".
2. **The prototype's screens**: the check-in pages, the boards for each kind of work, the You board, Today, Ask Groundwork, the Company page and the suites.
3. **WhatsApp on Groundwork's own number** (decisions 82, 83, 106 and 112): check-ins, reminders, approvals and the lead's morning summary. At most one routine message a day for each person, across email and WhatsApp together. An organisation's own number is an advanced option kept out of the way.
4. **The suites** (decision 85): leave, hours, spending and finance, reviews, leaving, the role map, customers, equipment and to-dos. Each is off for every organisation until an admin turns it on.
5. **Staying in touch** (decision 109): "here is what is new" made from the person's own data, one-click opt-out with a confirmation, and a daily lead summary that is skipped when nothing changed.
6. **Privacy, enforced on the server**, each with a test. What a lead writes about a person never reaches that person. A lead in the same department does not read evaluation check-ins she is not in. A person held for a seat keeps their own answers and own report and nothing else. An email address is never shown in place of a name.
7. **Safety fixes**: only the person who runs a check-in, or an organisation admin, can resend an invitation; the scheduled jobs' lock is held on one connection; each visitor is counted by their own address in the rate limits; the WhatsApp webhook answers at once and never does a message twice.
8. **The anchor scenario**, built and switched off (`release.anchorScenario`).

Existing clients get the whole build (decision 90). Their check-ins move to the new boards through the one-off scripts above.

## Your changes since #322

All seven of your commits from 6 October are in, and nothing of yours was dropped. The details are in `docs/staging-compatibility.md`, section 9.

| Your commit | What it did | Where it is now |
| --- | --- | --- |
| `9771bbcd` "fix: node" | The Node version in both `package.json` files, 20 to 24 | Kept as it is. |
| `9a84afb7` | Three lines on the Today page | Already in the merged file. |
| `18bb53e4`, `6a4d67a1`, `8a73ee23`, `ba198931`, `59533562` "fix: map" | 50 client files guard against a list coming back empty | Carried in line by line. Four lines sat in three pages the screens later rewrote with the same guards, so they are covered. |

The join had one conflict, in `docs/known-issues.md`, and it was resolved by keeping both sides.

## Every result

All from 7 October, on the merged code.

| Check | Result |
| --- | --- |
| API tests | All 18,029 pass, in 1,838 suites. Two are skipped on purpose (live journeys run separately). |
| Client tests | All 4,602 pass. |
| Typechecks | The API (`tsc --noEmit`) and the client (`tsc -b`) are clean. |
| Clean install and build | Both pass, from a fresh checkout with `npm ci`, using the build commands in `api/railway.toml` and `client/vercel.json`. |
| Production start | `npm run check:production-start` passes on Node 20.20.2 and on Node 24.21.0: it starts, `/health` says ok, `/embed.js` answers. |
| Migrations, empty database | All 365 apply, and a second run finds nothing to apply. |
| Migrations, on the shared line's own schema | A database built with the shared line's 361 migrations, with rows like an existing client, takes our 4 new ones. None fails and every row reads the same afterwards. |
| The 24-scenario run (run-oct7c), against the baseline | Every problem count is 0. Every engine number holds or rises except "proof asked for": 34 against 42. About three quarters of that count is the word "picture" ("a clearer picture"); two runs of the same code moved it by 7. Commitments recorded 59 (33 before), agreements 75 (56), jargon in Groundwork's turns 20 (42). Every report and judgement ran on the active stored prompts. |
| Judgements against the right answer | 13 right, 9 partly, 2 missed (loans and openread). |
| Adversarial set | 32 of 35 checks pass. The three are explained under "Needs Hafsah"; none is a leak by the rules. |
| User journeys (admin, lead, team member) | Browser and WhatsApp, from a clean install, with the model. Every fault found was fixed, then the journeys were run again: 129 of 130 pass. The one left is the model's own wording in one report sentence. |
| WhatsApp journeys | 230 of 232 at the first run; both faults fixed. Groundwork's own number and an organisation's own number never cross (32 of 32). A guest asks only about their own check-in (34 of 34). |
| Privacy sweep | 168 routes read on the server as 12 kinds of reader. The one leak it found (a same-department lead reading evaluation check-ins) is fixed. |
| Existing clients | Old against new on a copy of the existing-clients data: 0 leaks, wording worse in nothing. 12 lines say a person held for a seat no longer reads the team's board or report; that is decision 110 (B3), on purpose. The carry-on test passes 10 of 10. |

## What is switched off

Each is one row in `platform_settings`, and a missing row reads as the safe default. The full table is `docs/deploy.md`, section 4.

| Switch | At release |
| --- | --- |
| `release.anchorScenario` | Off |
| `release.contextInAskGroundwork` | Off |
| `release.planAndBillingNewParts` | Off |
| `release.boardKindsOffered` | Sales and engineering release only |
| `pricing.freeTrial` (the trial and the WhatsApp add-on) | Off until switched on by step 13a in `docs/deploy.md` |
| `whatsapp_enabled` | Off until Meta approves the templates (`docs/whatsapp-templates.md`) |
| Each organisation's WhatsApp add-on | Off |
| Each organisation's suites | Off |
| "Use simpler words" | Off for every check-in |
| Learned weights, prompt self-learning | Off |

## Release steps

The full list is `docs/deploy.md`, "The release night, in order". In short:

1. **Take the backup first**, and write down the time.
2. Set the hosted settings: `SETTINGS_ENCRYPTION_KEY`, `TRUST_PROXY_HOPS` if more than one proxy, `NODE_ENV=production`, and the WhatsApp ones in `docs/whatsapp-settings.md`. Leave every switch above at its default.
3. Release the API. On start it applies the 4 new migrations and adds the prompts.
4. Check `/health`, that the migrations finished, and the active prompts.
5. Run the four one-off scripts in order, each as a dry run first and then with `--hosted-database --write`. Each asks for the database's host name to be typed back.
6. Read what each person reads on a test organisation.
7. Turn things on one at a time, never on the day of the migrations.

## Rollback

Restore the database backup and the old code together, never the code alone. One migration dropped a column, so the old code cannot read the new database.

## Not in this release, and known

- **Prompt changes waiting for a full run.** The anchor's member questions still borrow the project's, suggested replies can carry "..." placeholders, some prompt lines read back to front, and judgements sometimes call one named person "they". Each needs a full 24-scenario run to prove nothing is lost, so none is in this release. The anchor is switched off.
- **The rest of `docs/known-issues.md`**: 4 Broken entries that need you or Hafsah (the templates, the release-night steps, the hosting questions), and the Wrong and Untidy entries, none of which reaches a private word.

## Needs Hafsah

1. **Should a lead in the same department read the department's ordinary check-ins, or only the manager?** Today any lead in the department can. Evaluation check-ins are now left out for her.
2. **Health and family said in a person's own check-in.** Tunde mentions his father's dialysis himself, and it reaches his lead's report. The rules allow it (what people say in a check-in can be shown to the people in it); the adversarial test treats it as private. No decision covers health or family. Nothing was changed.
3. **"Proof asked for"** counts the word "picture". Dropping it from the scorer would make the number mean what it says. The scorer was not changed.
4. **The decided-for-you items** in `docs/morning-report.md`: the footer on the lead's first message, "one colleague" for a person with no name in reports, removing the People list's count of check-ins an admin cannot open, and setup not counting as the lead's first check-in.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
