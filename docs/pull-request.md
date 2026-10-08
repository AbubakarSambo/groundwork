# The release, for Abubakar

## Before you merge

Tick each one before merging. The full steps are in `docs/deploy.md`, "The release night, in order".

- [ ] **Take a backup of the database first**, and write down the time. Nothing else happens before it.
- [ ] **How many proxies sit in front of the live API** (for example a load balancer, plus a content network like Cloudflare)? If more than one, set `TRUST_PROXY_HOPS` to that number (the default assumes 1). The API writes one warning in its log at start while this is unset, and starts anyway.
- [ ] **`SETTINGS_ENCRYPTION_KEY` is set** on each hosted environment, made with `openssl rand -base64 32`, a different one for each environment, and never changed later.
- [ ] **`NODE_ENV=production`** is set on production.
- [ ] **Which Node runs the API and the client.** Your commit "fix: node" asks for Node 24. Our notes said Node 20. The build and the production start check pass on both (Node 20.20.2 and Node 24.21.0), so either is fine; please say which the hosts run.
- [ ] **Google sign-in:** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set on the hosted API with the same values as live, `GOOGLE_CALLBACK_URL` is the API's address plus `/api/v1/auth/google/callback` and is an authorised redirect in the Google client, and `FRONTEND_URL` is the client's address. Without the id and secret, no Google button shows anywhere, on live or here.
- [ ] **Staff access:** on the real database, `hjumare@gmail.com` has an account and `is_platform_admin` reads true after the migrations (migration `20261007233000_hafsah_stays_a_platform_admin` sets it, but cannot create the account).
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
8. **The anchor scenario, built and switched off** (`release.anchorScenario`). Its separate screens contradict Hafsah's decision 114 that the anchor uses the normal entry chat, board and reports, so it follows in the next pull request, rebuilt through the normal flow.
9. **Nothing removed.** A feature-by-feature audit of live against this branch (`docs/nothing-removed-audit.md`) found nothing live can do that this cannot, on the server: every sign-in method including Google, every route the live client calls, every setting, email, WhatsApp message, scheduled job and staff page. Google sign-in and staff access were checked and proved; nothing in the code had changed.
10. **Hafsah's answers of 8 October (decision 117).** The person reviewed on a performance plan, promotion or renewal reads the manager's words again, as on live; only colleagues' exact words stay hidden (`f5e31c45`). "Your report is ready" goes at most twice for a person and a report, then appears in their weekly summary (`e16074bc`).
11. **The user journey sweep** (`docs/user-journey-tests.md`): 83 problems found through the engine, WhatsApp and email; 63 fixed, each with a test that fails without it. The 20 left are listed below.

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

All from 8 October, on the final commit of this branch.

| Check | Result |
| --- | --- |
| API tests | 18,636 pass in 1,892 suites, 6 skipped on purpose (live journeys). The run found two guard specs behind the last fixes; both were brought up to date with no product change and pass. |
| Client tests | All 4,709 pass, in 710 files. |
| Typechecks | The API (`tsc --noEmit`) and the client (`tsc -b`) are clean. |
| Production start | `npm run check:production-start` passes: it builds as production does, starts, `/health` says ok, `/embed.js` answers. It passed on Node 20.20.2 and Node 24.21.0 on 7 October. |
| Migrations | Five new ones over live (the anchor's situation, "use simpler words", the strategy's versions, an address can always stop the mail, and the platform admin kept). On 7 October all applied on an empty database and on a database built to live's own schema with existing-client rows, with every row unchanged. |
| Privacy sweep | 28 readers across three organisations, about 17,000 server reads plus Ask questions. No leak. Transcripts reach only their owner; nobody reads another person's You or Ask; no lead-only field reaches a member; no comparison between people; ratings only to the person they are about; decision 40's checkability rule holds; no email address where a name goes. The last three findings were fixed on 8 October (a lead-only field in the report, labels on the ending panel, the roster's stored text). |
| Browser journeys | Sign-up and sign-in (link and password, at 1440, 1280, 1024 and 390), the admin, the lead's set-up from a pasted plan, the member joining and checking in, approvals and reviews, people, a check-in waiting for an admin, joining at 390: all pass. One fault found and fixed: a new check-in's first open takes 65 to 88 seconds and the screen gave up at 45. |
| Google sign-in | With test client ids, `/auth/methods` says google is on, "Sign in with Google" and "Sign up with Google" show at 1440 and 390, and both go to Google's sign-in with the right redirect. Tests prove an existing Google user signs in, a same-address user is linked, and a new one signs up. |
| The anchor | Off in this release. It was walked as a lead and a team member before being switched off, and nothing stopped either; it follows in the next pull request through the normal flow. |
| Existing clients ("nothing lost") | Old code against new on realistic old data, as 12 people: every person's words identical in 142 of 142 transcripts; two real losses found and fixed (unnamed colleagues missing from the picker, and words shown as "nothing specific" on the lead's report). Everything else that differs comes from a decision. Stalled check-ins send nothing. |
| The 24-scenario run (run-oct7c, 7 October) | Every problem count is 0. Every engine number holds or rises except "proof asked for", 34 against 42, mostly the word "picture". |

## What is switched off

Each is one row in `platform_settings`, and a missing row reads as the safe default. The full table is `docs/deploy.md`, section 4.

| Switch | At release |
| --- | --- |
| `release.anchorScenario` | Off (follows in the next pull request) |
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
3. Release the API. On start it applies the 5 new migrations and adds the prompts.
4. Check `/health`, that the migrations finished, the active prompts, and that `hjumare@gmail.com` reads `is_platform_admin` true.
5. Run the four one-off scripts in order, each as a dry run first and then with `--hosted-database --write`. Each asks for the database's host name to be typed back.
6. Read what each person reads on a test organisation.
7. Turn things on one at a time, never on the day of the migrations.

## Rollback

Restore the database backup and the old code together, never the code alone. One migration dropped a column, so the old code cannot read the new database.

## Still being polished, for the next pull request

- **Decision 113, appealing a decided review** (bug B-024): built next.
- **The anchor scenario, switched on**, as a scenario like the others (decision 114): the normal entry chat, invitations, board and reports, with its board sections through the switchboard; `/start/team` becomes a redirect. The engine and the screens are both on it.
- **The engagement work** from `docs/engagement-spec.md`.
- **Prompt changes, each waiting for a full 24-scenario run:** the anchor member's opening questions, "..." in suggested replies, back-to-front lines, "they" for one named person, and the 15 sweep bugs that are the model's own wording.
- **Open sweep bugs** (`docs/bug-log-engine.md`): B-127 needs a decision (nothing links a check-in to a company priority, so the Company page says "No team feeds it"); B-141 and B-152 are by design; B-112 is a screen item.
- **The rest of `docs/known-issues.md`.**

## Needs Hafsah

0. **From the audit, for a yes or no** (`docs/nothing-removed-audit.md`, H3 to H11): a same-department lead no longer reads evaluation check-ins; admins lost the set-up controls on check-ins they do not run, while the server still accepts those writes; the People list's count; the alignment, brief, note and advice narrowings; the WhatsApp add-on section hidden while WhatsApp is off.

1. **What a lead in the same department reads.** Today any lead in the department can open the department's ordinary check-ins (evaluation check-ins are now left out for her), and on them she reads the members' promises word for word, for example "I will call the electrician on Monday". Your rule of 5 September says a manager sees the report, not people's sentences. Should the department read be only the manager's, and should it leave out the promises' exact words? This is how the live line works today; nothing was changed.
2. **Health and family said in a person's own check-in.** Tunde mentions his father's dialysis himself, and it reaches his lead's report. The rules allow it (what people say in a check-in can be shown to the people in it); the adversarial test treats it as private. No decision covers health or family. Nothing was changed.
3. **"Proof asked for"** counts the word "picture". Dropping it from the scorer would make the number mean what it says. The scorer was not changed.
4. **The decided-for-you items** in `docs/morning-report.md`: the footer on the lead's first message, "one colleague" for a person with no name in reports, removing the People list's count of check-ins an admin cannot open, and setup not counting as the lead's first check-in.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
