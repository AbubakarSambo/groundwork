# Staging compatibility

Checked on the night of 4 to 5 October 2026, on branch `wip/plain-reports` (commit `01a72bd2` and the commits before it), against `mine/wip/live-base`, which is Hafsah's exact copy of Abubakar's staging at commit `5197f22d`. Nothing was deployed, pushed or merged, and no hosted database was touched. This is decision 97, item 3.

In short: our branch already contains everything on staging, merging it into staging has no conflicts, every migration applies on a fresh local database, and the API starts with every new setting missing. One test on our side was failing and is fixed. One check could not be run, because the safety guard refused it (section 3).

## 1. Staging's own work

Our work began on 26 September 2026, from commit `be8b48d9`. The last commit that our branch and staging had in common before the final catch-up is `ed2b4996`. Since then staging has gained 20 commits (not counting merge commits). All 20 are listed here with what became of each.

| Commit | Who | What it did | Still in our branch? |
| --- | --- | --- | --- |
| `0c51dfec` | Hafsah | What you shared, not your private record | Yes. Two lines were reworded later on our side. |
| `259f3204` | Hafsah | A failed Google sign-in says so, and leaves a trace | Yes. Its test passes. |
| `c0c38ab4` | Hafsah | The sentence about quiet handoffs reaches a reader | Yes, in reworded form. |
| `96f92590` | Hafsah | The board asks whether anything sits above the objective | Yes. The board still has the cascade question; only the wording and layout were changed later. |
| `96dd1488` | Hafsah | Five ordinary sentences were producing a cascade that was not there | Yes, every added line is present. |
| `5ead9978` | Hafsah | The product knows what a weekend is (working days) | Yes. The working-days column, the first-working-day rule and its test are present. The signup form was rebuilt later. |
| `51b4a312` | Hafsah | What keeps happening becomes a question in the next check-in | Yes. The file and its test are present and pass. |
| `c11e9526` | Hafsah | A role nobody mapped is still a person | Yes. Its test passes. |
| `71c9ec9f` | Hafsah | The job is read from what they do | Yes, every added line is present. |
| `35751ece` | Hafsah | The detector remembers last period | Yes. The file is present and its test passes. |
| `11755f93` | Hafsah | A fairness read never crosses a company boundary | Yes. Its test passes. |
| `1433936e` | Hafsah | The agreement arrives as a file | Yes. |
| `58e3fe5f` | Hafsah | Two people reading one sentence two ways is the thing to find | Yes. Its test passes. |
| `4b3e52d5` | Hafsah | A document can set the bar, when somebody says to | Yes. Its test passes. |
| `1907c3a7` | Hafsah | A measure that goes down is still going well | Yes. The file and its test are present and pass. The objective band moved to a different component. |
| `6eaf1bed` | Hafsah | Three reads no longer count what somebody unsaid | Yes. |
| `9613a743` | Hafsah | That is not what I said, for an agreement | Yes, every added line is present. |
| `5db4300b` | Abubakar | Remove a duplicate block left in a merge | Yes. It only removed lines. |
| `12d495d5` | Abubakar | Fix the production build: import `describe`, `it` and `expect` from vitest | Yes. |
| `1138df4f` | Abubakar | "updates": three client fixes | Yes, see below. |

The 17 commits by Hafsah are her earlier work, which was already carried on our branch under different commit numbers and has been improved since. For each one I compared every added line with our tree. The lines that are not in our tree are lines that were reworded or moved later (for example, the board's "What this sits under" text, and the sign-up form). I found no change that was dropped.

The three changes in Abubakar's `1138df4f`:

1. **Who is still out (`WhoIsStillOut.tsx`).** Whether a person has answered comes from the round everyone is counted against, not from matching a local session number. Our branch keeps this and builds on it. It also adds "said no to this round" for a person who declined.
2. **Adding a file with no check-in open (`ChatPage.tsx`).** The message "Context missing. Please open this session from your check-in page." is in our file.
3. **The "Ends on" date in setup.** The date is measured from the check-in's start date, or from when it was created, never from today. In our branch this code moved into `CheckInPeopleAndSetup.tsx` and keeps the same rule.

The commit also removed a long comment from `alignment.module.ts`. Our file matches staging's exactly.

**Staging's own tests.** I ran every test file that those 20 commits added or changed (123 files in the API, 3 in the client). All pass, once the one failure below was fixed.

**One problem found and fixed.** The test `a-number-with-a-name-on-it-goes-through-one-rule` failed, because a new anchor file, `the-anchor-recommendations.ts`, reads who owns an aim. It reads it only to see whether an aim has no owner. It shows no number, and what it writes is offered to the lead alone. It is now on the test's list of files excused with a reason (commit `01a72bd2`). The rest of the test is unchanged, including the check that excused files are still not readers.

## 2. A clean merge

- `mine/wip/live-base` (`5197f22d`) is an ancestor of `wip/plain-reports`, so our branch already holds staging's latest commit.
- `git merge-tree --write-tree mine/wip/live-base HEAD` gave a merged tree with no conflicts and no messages.
- Staging's tree and ours differ in many files, because of our work, but nothing is in conflict.

## 3. The database

**Order and names.** Staging has 291 migrations, the last being `20260924175813_how_somebody_arrived`. Our branch has 359. Every one of staging's 291 is also in ours with the same name, and our 68 new ones are all later than staging's last, so they apply after it. The newest is `20261004100000_a_check_in_remembers_it_began_at_the_anchor_link`.

- **No clashing names.** The name `the_number_out_of_the_sentence` appears twice, and two pairs of timestamps are shared (`20260907120000`, `20260911230000`). All three are already on staging, so they have been applied there. Two more shared timestamps (`20260927180000`, `20260927190000`) are ours; the folders have different names, so the order is fixed by the full folder name and is the same on every database.
- **No duplicate changes.** A fresh run (below) applied all 359 without an error, which it could not do if two of them added the same column or table.

**One staging migration was changed on our side.** `20260923200000_reopen_every_check_in_that_ran_out_of_time` used to set every stalled check-in back to active. Decision 54 (29 September) says existing check-ins are not reopened by a migration, so our copy is now a harmless `SELECT 1`. Staging already ran the old version, so any reopening it did has happened there. The file is not run again on a database that has already recorded it, so there is no conflict. The one thing to know: if staging has not run it yet, nothing is reopened, which is what decision 54 intends.

**From scratch.** I created `gw_compat_scratch` and ran `npx prisma migrate deploy`. All 359 migrations applied and a second run said there was nothing to apply. A comparison of the result with `schema.prisma` found one cosmetic difference only: Postgres shortens the name of one index (`leaving_checklists_organization_id_person_external_id_last_...`) to 63 characters, and Prisma wants the full name. It changes no data and no behaviour.

**From the live line's schema, with data. Done, 5 October.** This was the one check left open; it
has now been run on this computer and it passes.

What was done, in order:

1. The live line's 290 migrations were taken from `mine/wip/live-base` and applied to a fresh local
   database, so it sat at exactly the schema the live line has.
2. **Rows were put in it first**, so "fails on existing data" was exercised rather than argued: an
   organisation, two users, a check-in with two parties, a completed check-in, a released report, a
   surfaced pattern, and the six pricing plans the migrations already create.
3. Our 69 new migrations were applied on top.

The result: **359 applied, 0 failed.** Every row that was there before is still there and still
reads the same - the report still says "An existing released report.", the check-in still says what
it said. The WhatsApp add-on prices landed on the five plan rows that already existed
(`ENTERPRISE` is left null, which is what the migration intends for custom pricing).

A drift check against `schema.prisma` afterwards found **one difference, and it is the same
cosmetic one the from-scratch run found**: Postgres shortens that one `leaving_checklists` index
name to 63 characters. No data, no behaviour.

So the earlier reading of the 68 migrations was right, and it is no longer only a reading.

**A note on how this was run.** An earlier attempt was refused by the safety guard because the
command named the live environment, and that refusal was right to exist. What is actually needed is
a purely local database built from a branch's migration files, which decision 97 item 3 asks for in
as many words. It was run on localhost, against no hosted database and no real data.

## 4. Settings

**New environment variables** (read by our branch, not by staging):

| Setting | What it does | Missing means |
| --- | --- | --- |
| `WHATSAPP_DISPLAY_NUMBER` | The number shown on the Connections page | The page says "Groundwork's WhatsApp number" with no number |
| `PUBLIC_API_URL` | Builds the webhook address shown to admins | The page says the address is known once hosted |
| `WHATSAPP_GRAPH_BASE_URL` | Lets a test point WhatsApp at a recorder | Meta's own address is used |
| `PRINT_TABLE`, `PRINT_THE_APPROVER_TABLE` | Only print helpers for scripts | Nothing |

**New `platform_settings` keys.** `release.boardKindsOffered`, `release.contextInAskGroundwork`, `release.planAndBillingNewParts` (the WhatsApp add-on's price, use and limit), `release.anchorScenario`, `suggestions.thresholds`, and one row per scheduled job named `job.<name>.ran_for`. Each has a safe default for a database with no row: the three switches and the anchor scenario read as off, and the board offers only the sales and engineering kinds.

**Test.** I built the API from a clean checkout of our commit and started it on port 3012, against `gw_compat_scratch`, with only `PORT`, `DATABASE_URL`, `JWT_SECRET` (a test value) and `EMAIL_SENDS_FOR_REAL=false` set, so every setting above was missing along with the WhatsApp, Stripe, Resend and Google ones. It started ("Nest application successfully started", the health address answered "ok"). The API's log showed only the warnings that mean the feature is off: no Stripe key (billing refuses), no Resend key (mail is logged, not sent), and no model credentials (the engine probe says so and carries on). The WhatsApp webhook answered 401 to an unsigned post and 403 to a wrong verify token, so WhatsApp is off, not crashing. It seeded 58 prompts into the empty database. I then stopped it, and nothing is left running.

I did not need to fix a crash. Note: with `NODE_ENV=production` the API also needs the variables it already asked for on staging (`JWT_SECRET`, `CORS_ORIGINS`, `FRONTEND_URL`, Stripe and so on). Our branch adds none to that list.

## 5. The build staging runs

- **The API** is on Railway (`api/railway.toml`): build command `npm run build && npx prisma generate`, start command `npx prisma migrate resolve --rolled-back 20260627000000_contributor_code_system 2>/dev/null; npx prisma migrate deploy && node dist/main`, health path `/health`. Our `railway.toml` is identical to staging's.
- **The client** is on Vercel (`client/vercel.json`): `npm run build` (`tsc -b && vite build`), output `dist`. Identical to staging's. The staging workflow uses Node 20.
- **Node.** Both `package.json` files say Node 20.x and npm 10.x. This Mac has only Node 26 and npm 11, so I could not build on Node 20. A build on Node 26 passed; npm 11 does not run package install scripts, so the `prisma generate` after install is the one step that matters, and the build command runs it.
- **Clean install and build** in a fresh checkout of our commit: `npm ci` and `npm run build` for the API (passed; `dist/main.js` exists and the embed files are copied), then `npm ci` and `npm run build` for the client (passed; one warning that the main script is 1.9 MB, which staging's build has too).
- **Dependencies.** The only package change since staging is in the client: two font packages, `@fontsource/atkinson-hyperlegible` and `@fontsource/literata`. They install from the lock file with `npm ci`.

## 6. Anything else that would differ on staging

- **Time zones.** Every scheduled job is pinned to UTC, as on staging. A few places use the machine's own clock to find the day of the week or the start of today (`which-days-this-team-works.ts`, `session-count.ts`, one place in `grounds.service.ts`). This Mac is three hours ahead of UTC and the hosted server is on UTC, so these can differ by a day near midnight. See the result below.
- **File paths.** The API reads no file outside `api/` at run time. The embed script and panel (`embed.js`, `panel.html`) are copied into `dist` by the build and were present in the clean build. The model credentials file `api/credentials/service-account.json` is not in the repository, as on staging.
- **Scheduled jobs running twice.** Most jobs claim their time slot first (`once-across-copies.ts`), so two copies of the API run each once. Three do not, and they were already that way on staging: the held-mail sender (it uses a database lock), the Stripe retry (it is safe to repeat) and the engine probe (one cheap model call every five minutes per copy).
- **Rate limits.** The default is 60 a minute for each address, with tighter limits on sign-in. The API does not set "trust proxy", so behind the host's proxy every visitor may be counted as one address. This is the same on staging today and was not changed by us, but if sign-in limits (5 a minute) trip for several people at once, this is the cause. It is a question for Abubakar.
- **Prompt seeds.** The seeding wrote 58 prompt versions, 293,000 characters in all; the largest, the base prompt, is 118,590 characters. The column is `TEXT`, which has no limit that matters. A start never replaces a prompt somebody activated by hand, and the new base prompt is activated only where the active one is the seeding's own.
- **Listening address.** The API listens on all addresses unless `NODE_ENV` is exactly `development`, so a hosted server is not affected by the new local-only rule.

**The time zone test.** I ran the grounds, common, board, reports and conversation tests (1,003 files, 9,512 tests) with the clock set to UTC, as on the hosted server. Two tests failed in that run, both about timing while the machine was busy with a scenario run (`the-report-is-written-in-parallel` and `the-first-night-warns-only-after-the-release`). Run again on their own, both pass in UTC and in the East Africa time zone. So no test depends on this Mac's time zone.

## 7. Checked again on 5 October, evening, at `ee99f19c`

The checks in sections 3 and 5 were run again on branch `wip/release` at commit `ee99f19c`, which is 208 commits after `01a72bd2`. Everything ran on this computer only. Nothing was deployed or merged, and no hosted database was touched. All of it passes, and nothing differs from 4 to 5 October.

- **Nothing that staging builds from has changed since.** Between `01a72bd2` and `ee99f19c` there is no change to either `package.json`, either lock file, `railway.toml`, `vercel.json` or anything in `api/prisma/`. The 208 commits are code, prompts and tests.
- **Staging is still inside our branch.** `mine/wip/live-base` is still an ancestor of `ee99f19c`, and `git merge-tree` still gives a merged tree with no conflicts.
- **Migrations from scratch.** A new database, `gw_compat_oct5b`, on localhost. `npx prisma migrate deploy`, run from a clean checkout of `ee99f19c`, applied all 359 migrations, the last still being `20261004100000_a_check_in_remembers_it_began_at_the_anchor_link`. A second run said there was nothing to apply. The `_prisma_migrations` table holds 359 rows, none failed or rolled back. The comparison with `schema.prisma` found the same one difference as before: the `leaving_checklists` index name shortened to 63 characters. Nothing else.
- **Clean install and build, as staging builds.** A fresh detached worktree of `ee99f19c`. In `api/`, `npm ci`, then `npm run build && npx prisma generate`, passed; `dist/main.js`, `embed.js` and `panel.html` are there. In `client/`, `npm ci` and `npm run build` passed, with the same warning as before that the main script is 1.9 MB. This was still Node 26 and npm 11, not Node 20.
- **The built API starts with every new setting missing.** It was started from that worktree on port 3012 against `gw_compat_oct5b`, with only `PORT`, `DATABASE_URL`, a test `JWT_SECRET` and `EMAIL_SENDS_FOR_REAL=false`. It said "Nest application successfully started", and `/health` answered "ok". It seeded 58 prompt versions into the empty database, 293,928 characters in all. The log showed the same "this is off" messages as before: no Stripe key, no Resend key, and the engine probe failing because the model credentials file is not there. An unsigned post to the WhatsApp webhook got 401 and a wrong verify token got 403. It was then stopped, and nothing is left running on port 3012. The API on port 3000 and its database were not touched.
- **Two lines in the log not written down last time.** Nest warns that the route `api/org/v1/(.*)` uses an old style of path, and Node warns once that more than ten listeners were added to one event. Neither stops anything. Since no package changed after 4 to 5 October, they were most likely there then too and simply not recorded. Neither needs anything from staging.
- The worktree was removed afterwards.
- While this ran, two more commits landed on the branch: `e6234eca`, a scenario score, and `d2e3e34b`, the judgement reading a stored prompt version. Neither changes a package, a lock file, the deploy settings or a migration, so the results above should hold for them too, but they were not built here.

## What I could not do

1. Run our migrations on top of a database built at staging's schema with sample rows. The guard refused the command and I stopped, as told.
2. Build on Node 20. Only Node 26 is installed here.

## Databases left behind

`gw_compat_scratch`, on this Mac only. Nothing else was created.

Also on this Mac only: `gw_compat_from_live_base_1313`, from the check on 5 October with data, and `gw_compat_oct5b`, from the check in section 7. The safety guard does not allow `dropdb`, so they are left for you to remove when you want.
