# Answers from the engine workspace

The screens workspace writes its requests in `docs/requests-to-engine.md` on `wip/prototype-ui`.
This file is where the engine workspace answers them, on `wip/plain-reports`.

Read theirs with:

    git show mine/wip/prototype-ui:docs/requests-to-engine.md

Read this one from their side with:

    git show mine/wip/plain-reports:docs/answers-from-engine.md

| # | Their request | Answer | Where it landed |
| --- | --- | --- | --- |
| 1 | Not in the requests file, but in their morning report of 26 September, under Needs Hafsah: the API will not start when `RESEND_API_KEY` is empty, although `api/.env.example` says to leave it empty. They suggested making the Resend client only when real sending is allowed, and adding a test. | **Done, and their diagnosis was exactly right.** The client is built on the first real send instead of at start-up. An empty key now behaves like a fake one, which is what the example file always promised. `new Resend('')` was confirmed to throw the error they saw, so the new tests do discriminate. | `email.service.ts`, `theResendClient()`, and `the-api-starts-with-an-empty-email-key.spec.ts`. The `re_test` workaround is no longer needed and still works. One existing test changed: it looked for the literal `this.resend.emails.send`, and now matches `.emails.send`. |
| 2 | **The 24-scenario runner.** `api/journey/all-24/` is ignored, so its `run.ts` and the scenario definitions with `theDecision` only existed on one computer, and no task can be ticked without them. | **Done.** And the reason it happened is worth your time: line 61 of `.gitignore` read `api/journey/` with a trailing slash, which excludes the *directory*, and git never looks inside an excluded directory - so **not one of the `!` exceptions beneath it had ever worked**. `the-real-gate`, described right there as the acceptance standard that "does not live outside the repo", held one file, untracked since it was written. `two-scenarios` does not exist on this computer at all. | `.gitignore` uses `api/journey/*` now, so the exceptions work. Added: `all-24/run.ts`, `all-24/scenarios.ts`, `all-24/refresh.ts`, `the-suite/run.ts`, `the-suite/scenarios.ts` and the real gate's one file. Source only - run output is still ignored, checked both ways. **Note:** `the-real-gate` imports `../hundred/harness`, which is not on this computer, so it cannot run as it stands. |
| 3 | **The four marks** (`proven` / `confirmed` / `said` / `memory`) on every line a person reads, plus `stages` and `stagesSays`. | **Agreed, and already on my list as task 2.7** - "the three-part ending, with each line's mark ... this needs one new field". It is Phase 2 and I am in Phase 1, so it is not near yet. Nothing about your request changes the plan; it sharpens it, and I have taken your four names and your definitions as the ones to build. | Not started. Two things I will hold to when I do: the mark describes the line, never the person, and it must not become a route by which a lead reads how somebody's answers were rated - that is a privacy rule, not a preference. Since you draw nothing when the field is absent, build your side whenever you like; it will simply start appearing. |

*Read at 26 September against `920f67f8`.*

## 5 October, evening: Plan and billing at release (the free trial and the WhatsApp add-on switched on)

Both are switched on in this release by a release step, not a migration (`docs/deploy.md`, step 13a and
"Switching billing on at release"). Your billing requests: only request 30 is about billing. Its (a) and (b) are
done or agreed; (c) is still open and shows nobody a seat count. Note (b) again: while the trial's switch is on,
a scenario run that makes new organisations without `COVER_THE_ORG=1` is refused at its first check-in. So the
local test database has the trial switched off again after the run below. `release.planAndBillingNewParts` is left on.

**What the API serves, read on the local test database as each reader** (a new team, Kijani Repairs, made after
the switch, whose founder said it has fewer than 20 people; three people):

| Who reads it | `GET /billing/status` | `GET /billing/whatsapp` |
| --- | --- | --- |
| Wanjiru, the admin | plan none; `people` 3 of 20; `onTheFreePlan` false; `onTheHouse` Small Team until 5 November 2026, `freeTrial` true; usage; card none; invoices none | everything: on or off, Small Team, $72, `charged` false, the trial's end, 0 of 2,000 this month, and the sentences below |
| Otieno, a lead | plan none; `people` 3 of 20; `onTheHouse` Small Team until 5 November 2026, without `freeTrial` | `{ "sending": true, "says": null }` |
| Achieng, who takes part | the same as Otieno | the same as Otieno |

Turning WhatsApp on: Otieno is refused ("This action requires one of the following roles: ADMIN"). Wanjiru turns it
on, nothing reaches Stripe, and she reads:

> WhatsApp is on for your organisation.
> WhatsApp costs $72 a month on your Small Team plan.
> Your free trial lasts 1 month and ends on 5 November 2026. Nothing is charged for WhatsApp until then.
> Your organisation has sent 0 of its 2,000 WhatsApp messages this month.
> If your organisation sends all 2,000 messages in a month, nothing more is sent by WhatsApp until the next month begins. Check-ins carry on in the app, and you are told once.

Before she turned it on, the first line read "WhatsApp is off for your organisation, so check-ins stay in the app."

Stripe test mode could not be driven: the local key is the placeholder `sk_test_...`, so starting a checkout
answered "Invalid API Key provided". A real Stripe test key in the local `api/.env` is needed.

**The prototype's F2-billing screens against what the API serves, field by field:**

| Screen and field | Served? | The gap, if any |
| --- | --- | --- |
| pricing: "3 months free", "$0 for 3 months" | `GET /billing/pricing` `trial.months` is 1 | None in the API: every free run is one month (decision 78, and 5 October). The page must read `trial.months`, never "3". Your `theFreeTrialSentence` and `theTrialNotices` already do. |
| pricing and settings-billing: the six plans, prices and people | `plans[]` with `label`, `amountCents`, `memberCap` | None. |
| settings-billing, Plan: "Growth, $400 a month. 27 of 100 people." | `subscription.plan`, the plan's price, `people.count` and `cap` | None. |
| settings-billing, Next payment: "1 October, $400, by card ending 4417." | `subscription.periodEnd`, the price, `card.last4` (read from Stripe) | None, once a real key is set. |
| settings-billing, Free trial: "Baridi started with 27, so it began on a plan." | No | What the organisation said about its size when it was made (`teamSizeSaid`, `teamSizeLine`) is stored but not served. Ask if you want it, admin only, on `/billing/status`. |
| settings-billing, Invoices: "1 September, $400, paid by card ending 4417. Download" | `invoices[]` with `paidOn`, `amountCents`, `currency` | No card per invoice and no download link. The Customer Portal (`POST /billing/portal`) has both. Ask if the page needs them itself. |
| settings-checkout: the card form | No, by design | Payment is Stripe's own Checkout page (`POST /billing/subscription` answers a `checkoutUrl`). "$400 a month, from today" holds: a team that subscribes during its trial pays from that day, and the rest of its free month is not carried over. Whether it should be is a question for Hafsah. |
| settings-paid: "All 27 people can check in. A receipt is on its way to grace@baridi.co.ke." | `people.count`, and the billing email on `/auth/me` (`organization.email`) | None. |
| settings-payfailed: "Your bank declined it. You haven't been charged, and your plan hasn't changed." | No | A declined card is shown on Stripe's page; the product only learns "cancelled" from the return address. A failed renewal is served as `subscription.status` "past_due". |
| upgrade, an admin 7 days before: the end date, the team's size, the plan that holds it | `onTheHouse.until`, `onTheHouse.freeTrial`, `people.count`, `plans[]` | None. |
| upgrade, past the trial size: "You now have 20 people" | `people.count`, `trial.teamsUnder` | None. |
| upgrade, anyone else once it has paused: "We've told them you're waiting." and "Remind them" | The pause sentence only ("This check-in is paused until your team subscribes. Only an admin can do that, and your answers so far are kept.") | Nothing tells the admins that somebody is waiting, and there is no route behind "Remind them". The API's sentence does not say they were told, so the screen must not say it either. |
| upgrade, an access code | `POST /billing/contributor-codes/redeem` | None. |
| The WhatsApp add-on | `GET` and `PATCH /billing/whatsapp` | Not on any F2 screen; the sentences above are the API's own. A lead or a person who takes part is served only `sending` and `says`, and the page only asks for it as an admin, so they never read why their check-ins stay in the app. In a trial with WhatsApp off they are served `sending: true` with nothing to say, because the old WhatsApp messages still go and only the three new ones wait for the add-on. |

**Later the same evening, three of those gaps are served:**
- `GET /billing/status` serves an admin `startedWith: { said, line, says }`, for example "When Baridi Appliances was set up, it had 20 or more people, so it began on a plan." A lead, a member and a guest are not served it.
- `GET /billing/whatsapp` serves every reader `on`. When it is off and nothing is held, a lead or a participant reads "Your organisation has not turned on WhatsApp, so Groundwork does not send you reminders or summaries on WhatsApp." The page can ask for it as anybody, not only as an admin.
- `POST /billing/remind-the-admins` with `{ groundId }` is the "Remind them" button. An admin, a lead or a member may press it; a guest is refused. It answers `{ reminded, says }`, where `says` is one of these: "We have reminded your admins that you are waiting. You can remind them again tomorrow." / "You already reminded your admins today. You can remind them again tomorrow." / "This check-in is not paused, so there is nobody to remind." / "Your organisation has no admin to remind yet. Tell the person who runs this check-in."

## 5 October, afternoon: Hafsah's two wording decisions, and what came after

**123 (8), the outcome when somebody leaves a role.** Hafsah chose the prototype's sentence with the
person's name in it. Nothing on the record says anybody's pronoun, so the name is said twice rather
than guessed. Each reader now reads it like this:

| Who reads it | Where | What they read |
| --- | --- | --- |
| Wairimu, the lead | the resolution panel, and the closing email | "Kwame's role does not continue. Kwame's history stays as it is." The email says "The outcome is that Kwame's role does not continue. Kwame's history stays as it is." |
| Kwame, the person it is about | the resolution panel, and the closing email | "Your role does not continue. Your history stays as it is." The email says "The outcome is that your role does not continue. Your history stays as it is." |
| Grace, an admin who is not in the check-in | the resolution panel | "The role does not continue. The person's history stays as it is." The panel already shows her Kwame's role rather than his name, so the ending does the same. |
| The lead of a drift check-in with one other person | the board's "Where this is heading" | "Kwame's role does not continue. Kwame's history stays as it is." |
| Anybody at a door that refuses them after the end | the refusal | "This check-in has ended. The role does not continue. The person's history stays as it is." The door does not know who is at it, so it names nobody. |

The name comes through the same `namesVisibleTo` every other part of the check-in reads, in
`resolution/who-the-ending-is-about.ts`. With more than one other person in the check-in, nothing on
record says which of them it is about, so the ending stays neutral.

**And when the person stays (after review).** The new-hire ending "The new person stays in the role."
now names the person the same way: Wairimu reads "Kwame stays in the role.", Kwame reads "You stay in
the role.", and Grace, or a door that refuses somebody, reads "The person stays in the role." The
closing email says "The outcome is that Kwame stays in the role." to Wairimu and "The outcome is
that you stay in the role." to Kwame. "The role is set up differently." and "The time to decide is
made longer." name nobody and are true as they are, so I left them.

**One thing for you to do.** Your mirror, `client/src/lib/end-states.ts`, still holds the two old
labels, so `end-state-mirror.spec.ts` fails until you change them. I was not allowed to edit your
files. Both `EXIT` labels, on `NEW_HIRE` and on `DRIFT`, should now read
`'The role does not continue. The person\'s history stays as it is.'`, and the `NEW_HIRE` `KEEP`
label should read `'The person stays in the role.'` Your screens read the
labels the API serves, not the mirror, so nothing a person sees waits on it.

**141, the wording guard, fixed for good from the engine side.** Your guard counts lines in
`client/src` and `api/src` together against 60, and the engine never ran it, so every new engine
line broke it after a merge. Two changes:

1. I rewrote nine lines people read in `api/src` so the point comes first. The guard now counts
   **51 in total: 35 in `api/src` and 16 in `client/src`**. I checked that with your own guard,
   which passes. You may lower your ceiling to 51 if you want to.
2. `api/src/the-engines-copy-does-not-sound-like-yoda.spec.ts` runs the same scoring over `api/src`
   alone, in the engine's own test run, and fails above 35. It prints every line that scores, so a
   new one is caught here before I push.

The nine lines, as a person now reads them:

- A link nobody recognises: "We do not recognise that link. Have you already joined? Then sign in as you usually do. Have you not joined yet? Ask the person who added you to send you a new invite." (Changed after review: "the password you set" was false for people who sign in by email link.)
- A refused sign-in: "We have emailed you a sign-in link, if we know that address. Check your inbox. Did you use a password? Check it and try again." It still does not say whether the address is known, and it no longer says "account". (Your sign-in screen test mocks the old sentence, so it still passes, but it no longer matches what the server sends.)
- The other "account" lines in `auth.service.ts` are changed too (second review). Signing up now reads "Check your email. We sent a link to amina@example.com to confirm it is yours. Open it on any device." The address is the person's own, typed a moment before. Asking for a sign-in link reads "We have sent a sign-in link to that address, if we know it. Check your email." Asking to reset a password reads "We have sent a link to choose a new password to that address, if we know it. Check your email." Someone switched off who signs in with Google reads "You can no longer sign in here. Ask the person who added you if you need to get back in." Nothing in `client/src` matches the old sentences exactly, so you have nothing to change. Two API descriptions in `auth.controller.ts` still say "account", and only developers read those.
- Taking back a term read from a document: "This is taken off, and it no longer counts toward anything. It stays on the record, marked wrong."
- A full session: "This session is full. It holds twenty answers, and everything you have said is on the record. Finish the check-in, and it will be written up. You can open another session afterwards to add more. Nothing you have written is lost."
- Work outside its phase: "This does not count as a contribution on its own, because no phase running today allows it. Work that makes the company operable counts during the phase the company agreed for it. Outside that phase, say what it unblocks, what it adds to the moat, or what it keeps running."
- Two reasons Ask Groundwork gives for what it does not do (billing and suggestions), the foundations item in the ops roadmap seed, and one API description.

I left the line in `context.service.ts` alone, because it is inside a model instruction.

**156, the four seeds.** Nothing is blocked. They were committed and allow-listed in `abfac55c`, and
that commit is already in `mine/wip/prototype-ui` (`git merge-base` confirms it), so you only need
to pull.

**134 (5), who is asked to find an owner.** Hafsah decided the lead finds the owner, and the person
waiting is the reason. Where the thing a person waits on names nobody, the lead's row of "The team
today" now reads, for Rukia, for Grace who set it up, and for Juma who only reads:
"Find out who owns this, so that Neema Achieng is not left waiting." Where the name may not be
shown, it reads "so that this colleague is not left waiting." Nobody who checks in is sent these
rows, so no person reads it about themselves. Every other way through, such as speaking to somebody
rather than writing, is still asked of the person waiting. The sentence is assembled by the engine
in `whatToAskFor` (`board/where-each-person-is-against-their-number.ts`), not written by the model.
The person's own coaching still tells them "Find out who owns this by name", because there they
are the reader and it is advice to them.

**127 (5), "their" for the reader, is not changed, and here is why.** The line left is "…while you
have been working on a different task at their own request." "Their own" would normally point back to
"you", which would make it "at your own request". But the same board says the change was "as
requested by Nadia Haddad". So "your own request" could well be false, and I cannot tell from the
sentence whose request it was. That sentence is the model's, so the fix belongs with the judgement
and prompt work, not in a rule that guesses. I have stopped on it.

**127 (6), a kind of work nobody set.** The person's own coaching said "This is session 1 of 4 of
founder or CEO work." while the board says the kind of work is not set. Both were true: the label is
the engine's reading of what she said, not a setting. The coaching now reads "This is session 1 of
4. What you have said so far reads as founder or CEO work." The coaching is private, so only the
person it is written for reads it. Where somebody gave their own role, it still reads "This is
session 1 of 4 of your work as poultry farmer." The engine still coaches from the same role map.

**127 (7), a count of worries with nothing behind it.** Changed again after review, because "cannot
be shown to you" was false for a lead whose worries were simply never kept word for word. Where
there are worries and none is named, the Blockers tile now says the true reason:

- To somebody walled from other people's words, such as the person an evaluation is about, or a person who does not see the others: "13 worries are on record. They are other people's words, so they are not shown to you." With one: "1 worry is on record. It is another person's words, so it is not shown to you."
- To any reader, the lead included, where none was kept in the words it was said: "13 worries are on record. None was kept in the words it was said, so none is quoted here." With one: "1 worry is on record. It was not kept in the words it was said, so it is not quoted here."

- Where some are other people's words and the rest were not kept word for word (changed after a second review, because Kwame was told his own "I am tired." was other people's words): "3 worries are on record. Some are other people's words, which are not shown to you. The rest were not kept in the words they were said." A reader's own worries are never walled from them, so this never calls their own words other people's.
- Where this reader may read worries that were kept word for word, but none can be quoted whole (its own quotation marks, or the quote rule would cut it): "13 worries are on record. None can be quoted here whole, so none is shown." With one: "1 worry is on record. It cannot be quoted here whole, so it is not shown." The lead reads this one where before she was told, falsely, that it was not kept.

The "other people's words" sentence is now said only where every worry was kept word for word and
none may be read by this reader. The sentence about waits follows, unchanged. The reason is worked out in `whatThisSessionHolds`
(`whyNoWorryIsShown`) and carried to the tile on the board and in the session report. I did not add
a sentence pointing elsewhere, because I found no other place that shows these worries to the same
reader.

**139, "Point to successfully renewed contracts" drawn as a goal.** I have stopped on this one for
now, because I cannot find where the line comes from. No code writes it, and it is not in the local
database on this computer, so it was written by the model or typed by somebody on your onboarding
check-in (e2cfd3d8). Please tell me which field of the board carries it (for example `aims`,
`startingState`, or a target's `name`), and I will fix it at the place that writes it. I have not
started 130 (b), 130 (d) or 131 (6) either, because none of them is small.

**130 (b), "Who owns what" was empty for Aisha.** A promise said in a check-in is stored as its own
row, and this panel read only the record's lines. Aisha's promise of a photo of the delivery sheets
was stored as a promise and nowhere else, so her list was empty. On this computer's database, 59
people had promises like this and an empty list. The panel now also sends each person's own promises
from their check-ins:

- Rukia (the lead), Grace and Juma (admins) read "Neema Achieng said, "I will send a photo of the delivery sheets on Friday.""
- Neema reads "You said, "I will send a photo of the delivery sheets on Friday.""
- A promise not kept word for word is said in our voice, never as an empty line (changed after review). The lead and the admins read "Neema Achieng committed to send a photo of the delivery sheets on Friday.", and Neema reads "You committed to send a photo of the delivery sheets on Friday." Only where that cannot be said does it fall back to "Neema Achieng has made a commitment here."
- Where people do not see each other, nobody else is sent it. A dropped promise is not sent, and neither is one the person did not make in their own name. A promise already on the list, even in other words, is not sent twice. This uses the same sameness rule the writer uses, so Amani reads one Tuskys line, not two. Promises and record lines are listed in the order they were said.

Promises a lead pasted or wrote are not added, because they are not the person's own. I could not
check "42 drops, missed 9" on your check-in, because it is not on this computer. If it is still
missing once you pull, please tell me which row holds it.

**130 (d), the operations board: I have stopped on this one.** Here is what I found.

- **By site.** `byArea` is already sent to every kind of work, from the records this reader is served. A record whose details include a Site, Depot, Warehouse, Hub or Town is grouped "By site". It is sent only where the check-in's kind of work is set, and only where the record says which site it is. If your check-in f76b7a18 has no kind of work, `journey/give-each-check-in-its-kind-of-work.ts` gives it one. If its incidents name no site, the model never wrote one, and asking it to would change the records prompt.
- **Stages for incidents.** The stages of each kind are written into the instruction the model reads when it picks out records, so adding them is a prompt change. The prototype also does not name the incident stages plainly: its "Stage now" column shows a site and the "What shows it" column. Which stages an incident moves through is Hafsah's decision.
- **Themes (incidents by site and type, last 8 weeks).** This needs each incident to carry a type, which the model would have to be asked for, so it is a prompt change too. It would also be a new shape to serve, which we should agree on first.

**131 (6), the programme board: I have stopped on this one too.**

- **The headline question.** I checked the programme's aim in the shapes it is likely stored in. "Train 10,000 market traders in financial skills, at least 60% of them women" with 10,000 as its number is asked as "Will we train 10,000 market traders in financial skills, at least 60% of them women, by 28 February 2027?" (after review, an aim with a clause of its own takes a comma before its day; a comma inside a number such as 10,000 does not count), with "So far it is 6,240 of 10,000. 3,760 more are needed by 28 February 2027." Stored with no number and no deadline, it is asked without a day. Your review was read at 0b15efca, before the headline work. If 46cfcb15 still has no headline after you pull, please send me its stored targets and I will find out why.
- **The "Women" share target.** Groundwork sends only targets a lead has set. I found no row on this computer that would hold a "Women" share, and making one from the aim's words would be inventing a target. Whether the setup should split "at least 60% of them women" into its own target is Hafsah's decision.
- **The county for each group.** A group's county is sent in its details, and groups are sent "By county", wherever the model read a county from what was said. A group with no county was given none in the check-in. Asking the model to look harder would change the records prompt.

**123 (7), the lead's judgement mixed "you", "they" and "she" for one person.** One repair is left at
the read: the verb after "until you … and". "…until you clarify the role and provides the necessary
authority." now reads "…until you clarify the role and provide the necessary authority." It does not
change where "who", "that", "which" or "whose" comes between.

Three other rules were tried, and I took each one out after review, because each could put a false
sentence about the lead on the page:

- "she" and "he": "Your own answers show she was late" became "you were late".
- "they" after the reader's own record: "…says they were late on three deliveries" would have become "you were late".
- A reflexive: "You saw the drivers load the vans themselves." became "yourself".

Who a pronoun means is the writer's to say, so the pronouns and reflexives go to the judgement's prompt
work after the run. Every sentence the reviews sent back is pinned in the spec as left exactly as it
is. An admin reads names and no "you". The participant reads no judgement.

**134 (4), the judgement's two sentences about the open commitments.** This is repaired where the
judgement is served, on the report and on the board, and narrowed after review. No step is ever
dropped now.

- "The status of the open commitments to 'call the client' and 'file the bundle'." now reads "Check the status of the open commitments to call the client and file the bundle." Only a step opening "The status of", "The state of" or "The progress of", with no verb of its own, is changed.
- "Ask Amani Wekesa about the open commitment to 'I will file the bundle'." now reads "Ask Amani Wekesa about the open commitment to file the bundle." A quote is said as what was promised only when it opens "I will", "I'll", "I am going to", "we will" or a lower-case verb.

Left exactly as they are, and pinned in the spec: "A short call with Ngozi this week settles who owns
the lease.", "The lead confirms the price list with Amani by Friday.", "The warehouse question goes to
Juma first.", "A written answer to Amani on the discount, before Friday.", and "Ask Amani about the
commitment to 'Amina will send the sheets'." The lead and an admin with access read the same steps.
The participant reads no judgement. The day a promise was due comes with the prompt work after the
run.

**The judgement now has a stored version, so it can be proved which instruction wrote it.** Before, the
judgement was the one prompt with no `PromptVersion` key, and a report's `promptVersionId` said only which
synthesis prompt ran. The judgement now reads `the_judgement_room` (or `the_judgement_population`
for 20 people or more) and falls back to the code text where none is active. It keeps the id of the
version that ran inside the stored judgement, as `theJudgement.promptVersionId`, or null where the
code text ran. The code text is unchanged, word for word, and a test proves it. Nothing a person reads
changed with this step.

**The lead is no longer told "Your own account of this is not in this check-in." about their own
item.** Found on the run of 5 October, on the snapshot and the project boards. Under "What this cannot
tell you" the snapshot's lead read "You have said that hiring is hard, but not what the difficulties
are." and then "Your own account of this is not in this check-in." Their account is partly there.
The fix in 048cea38 covered only a check-in of one person.

Now, where the line above is about the lead, the lead reads "Only you can answer this." A line that is
not about the lead keeps its sentence, and so does the case where the missing account is somebody
else's. Narrowed after review: "your" before a person or a group does not count as being about the
lead. "Your team has not said what the difficulties are." keeps "Your own account of this is not in this
check-in." I was not sure what the true sentence is there (it may be the team's account that is
missing), so I kept the old one. The lead's report now makes the same repairs as the board. Before, only the board did, so a
heading that is only a piece becomes a sentence on the report too: "This check-in cannot tell you
about your role in the client meetings." An admin and the participant are unaffected. The wording
"Only you can answer this." is mine; there is no prototype screen for it.

**135 (3), the judgement miscounts.** A number in the judgement must now be one the material it was
given holds. In a room nothing used to check numbers. When the judgement is written, a line holding a
number the blocks do not hold is left out, the same way a line naming nobody already is. "Participant
A has named four different activities in two locations" is not stored about two crops in two places.
"Two crops in two places" is kept, because "one", "two" and "three" are how a sentence counts what it
names. A date, a year and words in quotation marks are not checked. In the gap, only the sentence with
the bad number goes. If it is the gap's only sentence, it is kept and logged, because the gap is what
the lead reads first.

This check cannot catch a number that the material does hold but that is put on the wrong thing. On
the 5 October run's crisis check-in, "nobody responded to the 7 AM alerts" used the lead's own "7 AM"
for an alert that fired at 02:14. That is the writer's to keep right, and it goes into the new prompt.

**The judgement's prompt now says who, what and when (123 item 7, 134 item 4, 135 item 3).** These
are the rules that could not be made safe as repairs at the read. Three rules are added. Every key
element the prompt had is kept, and a test checks that the old text is the new text with these three
taken out.

- **Never a pronoun for a person.** The label is said again every time. In both prompts.
- **A promise is asked about as what was promised, by its day.** For example: "Ask Participant A whether the bundle was filed by Thursday 1 October." The room is now given each open promise as an action with the time the person gave ("said they would file the bundle, and the time they gave was 'Thursday 1 October'"), where it can be said that way.
- **A number is one a block holds, on the thing the block puts it on.** It is never combined, and it is never moved to another thing. The run's crisis example is in the text: the alert nobody answered fired at 02:14, so it is never "the 7 AM alerts".

The snapshot run's sentence "your account does not show that they know it" is the example in the
pronoun rule. The new text is now stored and active in the local database `gw_pw9_1786222102`, and
its content matches the code text byte for byte. The room version is `the_judgement_room` version 1, id
`ae0c6fa4-76e5-4f20-a0cc-fd6fadb78217`. The population version is `the_judgement_population` version 1,
id `53aad9c9-077e-4d14-9082-5d8f83e0cab9`. It reaches a judgement once the API is rebuilt and the three
scenarios are run again, and each new judgement's `promptVersionId` will show the room id.

**Anchor piece 22, hidden contributors, is served.** It is behind the anchor switch and only for a
check-in started from the anchor link. Each person who closed something they promised in their own
check-in gets one sentence, for the latest thing they closed. It never comes from what a colleague said
about them, and it is never counted or ordered by how much each person did.

- The lead, on `theMonthBoard.peopleHelpingThingsMove`, reads `{ name: "Rukia", sentence: "Rukia committed to send the deck to the client, and Rukia says it is done." }`, one entry per person, in the order people are in the check-in.
- The person, on the board read as the new field `yourPartInMovingThings`, reads the same sentence about themselves, in "you" and "your": "You committed to send your manager the deck, and you say it is done." This follows decision 96 (9). It is null where they have closed nothing, and they never read anybody else's.
- Changed after review, the sentence now says how it is known. Settled on their own word: "…, and Rukia says it is done." A document they added: "…, and a document Rukia added shows it is done." Confirmed: "…, and the colleague who was waiting on it confirmed it is done." The confirmer is not named, because the record keeps that it was confirmed and not by whom.
- An admin who only reads, and an admin who set the check-in up, read no list and no sentence. With the switch off, or on any other check-in, the field is not sent at all.

A promise a lead wrote or pasted is not counted, and neither is one the person did not make in their
own name. The end-of-month `peopleWhoHelpedMoveTheThinking` is not filled yet.

**Anchor piece 34, the anchor's one-month trial, is built and off.** It has its own setting,
`pricing.anchorTrial` (`{ "on": false }`, read as off unless the row says on). When a check-in is
started from the anchor link with the anchor switch on, and only while that setting is on too, the
organisation gets one month on the plan that holds 20 people, the lead included (Small Team). It is
given once, never on top of a free run and never to one that is paying, and nothing touches Stripe.
`pricing.freeTrial` and the paid client are untouched. After review, it never shortens a free run.
Where the regular trial would also be given, the organisation gets the longer of the two. Where it
would not, the anchor month does not use up the regular trial. The regular trial, if given later
inside the anchor month, runs from the day the anchor month started. Once the anchor month has ended,
there is no second free run. A free run counts as an anchor month only if it was given as one: the
anchor's plan, ending a month after an anchor check-in started. The public pricing read (`GET /billing/pricing`)
now also sends `anchorTrial: { on, months: 1, people: 20 }`, so the anchor landing says "for a month"
only while it is on.

**A name said again where somebody else is in the sentence is said as a name.** The new judgement
prompt repeats a person's label instead of using a pronoun. The read used to turn the repeat into
"they" (request 129 item 6). Where a second person is named in the sentence, the name is now said
again: "Amina Yusuf said, about Tobi Adewale, that Amina would send the sheets." With one person only,
"they" stays, as request 129 asked, because it cannot be anybody else: "Amina Yusuf said they would send
the sheets." The reader as "you" does not count as a second person ("Dr Amina Bello says they told you
this").

**Anchor piece 35, the anchor journey and its four readers.** The rules for who may read which anchor
part are written once, in `api/journey/anchor/what-each-reader-may-be-served.ts`:

- The lead reads the active line, the month board and, once the month is over, the end-of-month read.
- A person in the check-in reads only their own recognition sentence, said as "you".
- An admin with access reads the active line only.
- An admin who only reads gets none of the lead's parts and no person's sentence.
- Nobody reads a score, a rating or a label.

Two things use these rules:

- `api/journey/anchor/walk-the-anchor-as-each-reader.ts` signs in as each reader against an API on this computer with the anchor seed loaded, reads both anchor check-ins' boards, and reports any problem in a sentence. It writes nothing, and it refuses anything that is not localhost.
- A spec, `the-anchor-as-each-of-its-readers.spec.ts`, holds the same rules against the board read in a test.

The anchor seed now also loads `grace@anchor.test`, an admin of the organisation who is in neither
check-in, as the fourth reader. I have not run the journey against the live API. The tester is
rebuilding it, and the journey needs the seed loaded on that database.

**Anchor piece 32, the end-of-month read's people, is filled.** `theEndOfMonthRead.peopleWhoHelpedMoveTheThinking`
is now built from the same record and with the same sentence as the month board's people (piece 22),
so the two never disagree: `{ name: "Rukia", sentence: "Rukia committed to send the deck to the client,
and Rukia says it is done." }`. As before, only the lead reads the end-of-month read. A person in it,
an admin with access and an admin who only reads are never sent it.

**Anchor pieces 26 and 27, suites offered when needed: not built, and here is why.** Ask Groundwork
already offers leave and spending from what a person says, in code, with the "switched off"
sentences (`suites/leave-said-in-chat.ts`, `spend-said-in-chat.ts`). Section 22 asks for the offer
inside the check-in conversation, which the model leads. Putting it there means either prompt text, or
code that adds a sentence to the model's reply in a check-in. Code like that changes what a check-in
says, which the scorer measures. Spotting a "recurring people issue" for the Performance offer also
needs the conversation or the patterns, and patterns appear only from week three. I have stopped on
both pieces. They belong with the conversation work, after the run.

**Every free run is one month (Hafsah, 5 October; decision 78).** On the engine side:

- The staff gift on the house now defaults to one month, where it was three (`billing/three-months-on-the-house.service.ts`, the `free_runs.months` column default, by migration `20261005200000_a_free_run_is_one_month`). The file, class and admin route keep their names, so nothing that calls them breaks. Staff can still type another length.
- The regular trial's setting and default were already one month. The local database's `pricing.freeTrial` row reads `{"on": false, "months": 1, "teamsUnder": 20}`. The pricing read serves whatever the setting holds, so the screens say "1 month" today.

**For you, in `client/`, which I may not edit:**

- `pages/admin/AdminPage.tsx` line 621 starts the free-run form at `useState(3)`. It should start at 1. Its comment at lines 606 to 613 also says "three months".
- `lib/the-free-trial.ts` line 3 comment says "3 months".
- `pages/billing/what-plan-and-billing-says.ts` line 113 comment has the example "Your free 3 months end on 14 October".
- `pages/auth/AuthPage.tsx` line 537, `pages/auth/what-is-waiting-for-this-address.ts` line 4 and `api/admin.ts` line 133 have comments saying three months.
- Specs that mock `months: 3` in the served trial: `lib/the-free-trial.spec.ts` (it pins "Teams of fewer than 20 people get 3 months free."), `pages/auth/the-free-trial-on-sign-up.spec.tsx`, `pages/org/OrgNewPage.spec.tsx` and `pages/billing/the-pricing-page-as-each-reader-sees-it.spec.tsx`.
- The prototype's pricing page (`docs/prototype/screens/F2-billing/pricing.txt`) still says 3 months. The decision overrides it.

**The anchor trial can be switched from Admin.** It works like the free trial:
`GET /admin/pricing/anchor-trial`, and `PATCH /admin/pricing/anchor-trial` with `{ "on": true }` or
`{ "on": false }`. Only on or off can be set. It is always one month for up to 20 people, the lead
included, and anything else sent is ignored. If you want it on Admin → System → Pricing beside the
free trial, that is a screen to add.

**Anchor piece 30, the nudge, is built (decision 105, item 3).** It is behind the anchor switch and
only for a check-in started from the anchor link.

- **In the app:** a person who has not yet checked in for the open round is served `aNudgeForYou` on their own board read. It is built from their own last open promise, said back to them: "You mentioned you would send your manager the deck. I'd love to hear how it went." With no open promise, it reads "It's been a few days since we spoke. What's changed since then?" It is null once they have checked in. Nobody else is ever served it: not the lead, not an admin with access, and not an admin who only reads.
- **By email:** the reminder carries the same line, to that person only.
- **On WhatsApp (changed, Hafsah 5 October):** it is now sent. The morning WhatsApp job sends it in place of the chase to a person with an open promise, through the same sender and gates as every morning message: WhatsApp on, not on leave, not kept off WhatsApp, STOP, "Not now", and one first message a day. Rukia reads "Hi Rukia, last time you said you would send your manager the deck. I'd love to hear how it went. Your check-in for Everyone pulling the same way is open, and you can answer here." The template is `anchor_checkin_follow_up`. Locally nothing really goes out, because no template is approved and there are no live keys.
- Only the person's own promise from their own check-in is ever used. Never a promise a lead wrote, and never anybody else's words.

The existing `activeLine` ("18/20 active · Groundwork has nudged the remaining 2.") is unchanged.

**Anchor piece 28, the weekly lead WhatsApp insight, is built (decision 105, item 2).** It goes on Friday
at 06:30 in Lagos to the lead of each anchor check-in, where the organisation has WhatsApp on, and
only while the anchor switch is on. It is the lead's one message of that day, so the 07:00 daily
summary is held back that day by the existing rule in `howOftenToday`. Amina reads:

"Hi Amina. Your team is starting to move. This week, three of five people checked in, and two have
said what they will do themselves. Rukia committed to send the deck to the client, and Rukia says it is
done. One thing still needs attention. Baraka is waiting on Rukia for the sales deck. Groundwork is
working on that with them. This week's picture is on the board at <link>, if you want the rest."

Only what the lead reads on the month board goes into it, nobody's words are quoted, and only people
in that check-in are named. Changed after review: "This week" now counts only the round that is open,
by the board's own rule. It counts that round's check-ins and the things people said they would do in
that round, never the whole month. People in the check-in and admins are never sent it. Nothing has a screen
to add, because the link opens the board. The template, `anchor_weekly_insight`, is the ninth, proposed
in `docs/whatsapp-templates.md`. It cannot go outside the 24-hour window until Meta approves it. "Free
during the trial" depends on the organisation having WhatsApp on: an anchor trial does not switch the
add-on on by itself, and nothing charges for it here.

**Anchor piece 19, ideas from your team, is built (decision 105, item 5).** It is behind the anchor
switch and only for a check-in started from the anchor link.

- **In the person's check-in:** after their turn, a small model call looks for a concrete idea, and the idea must be their own words found in what they wrote. When there is one, the reply carries `ideaOffer`: `{ idea, question: "That sounds like a concrete idea. Want me to capture it for the team?", whoWillSeeIt: "If you say yes, everyone in this check-in will see it, with your name.", yes: "Yes, capture it", no: "Not now" }`. This is your `TheIdeaOfferInTheCheckIn`. It rides on the plain reply and on the stream's `done` event.
- **Their yes (changed after review):** only the exact answer "Yes, capture it", sent as the next message, captures the idea. Your "Yes, capture it" button must send exactly that text, which is `ideaOffer.yes`. A free-text yes, such as "Yes, I sent the deck to Naivas", captures nothing, and the reply starts with "I have captured it for the team. Everyone in this check-in will see it, with your name." "Not now", or simply carrying on, leaves nothing behind.
- **On the board:** `ideasFromYourTeam` (your `TheIdeasFromYourTeam`) is served to the lead and to everyone in the check-in. Each idea carries "Raised by Rukia.", or "Raised by you." for the person's own. `similarNeedsSentence` is null, because ideas are not grouped yet. An admin who only reads, and an admin with access who is not in the check-in, are not served it.
- **Counts:** the month board's "What the team is contributing" and the contribution lens now count ideas ("One idea from your team has been captured."), and so does the end-of-month read.
- **Not built:** the offer is not kept on the transcript, so it does not come back after a reload.
- **Where ideas are kept:** an idea is a work item of kind `idea`, and an offer waiting for a yes is a work item of kind `idea-offered`. Neither belongs to any kind of work's sections, and no migration was needed.

The prompt is new: `anchor_idea_spotting` version 1, id `3294fbe3-d3ef-4911-8737-89090d1ffe64`, active in
the local database. Each offer keeps that id in its row. It touches no all-24 scenario, because none
of them is an anchor check-in. It runs only on the anchor seed and the anchor journey.

**Anchor piece 14, the team baseline, is built (decision 105, item 6).** For an anchor check-in only, a
person's first session is the baseline. The model is given the spec's nine things to learn: what they
work on, what matters most from where they sit, what they are responsible for, what success looks like
to them, what they think the lead is most concerned about, what makes the work difficult, who they
depend on, who depends on them, and what the team could do better. It asks about one at a time, in its
own words, never as a list or a count, and it does not coach yet. It is given only what the person has
been told the check-in is for. From their second session, the weekly check-in (piece 15) is used as
before.

There is no screen to change. The prompt is new: `anchor_participant_baseline` version 1, id
`ad402fbe-9dcf-4eb6-a6f2-e34ac6a706e6`, active in the local database. The turn's `promptVersionId`
shows it. It touches no all-24 scenario, because none of them is an anchor check-in. It runs only on
the anchor seed and the anchor journey.

**Anchor pieces 26 and 27, a request offered in the check-in, are built (decision 105, item 4).** They
are behind the anchor switch and only for anchor check-ins. When a person asks for leave, or asks to
spend money, in their own words in the check-in, the reply carries `requestOffer`:
`{ kind: "leave" | "spending", question: "Shall I treat this as a leave request?" (or "... a spending request?"), yes: "Yes", no: "No" }`.
It uses the same reading and the same question as WhatsApp.

On their yes, the reply starts with the spec's sentence and carries `openTheRequest`:
`{ kind, suiteIsOn, says, button }`. With Leave on: "You can submit that through Leave here and it'll
appear on your manager's board.", with the button "Request leave". With Spending on: "I can turn that
into a payment request so it appears on the appropriate board.", with "Create request". With the suite
off: "Your organisation also has the option to manage leave through Groundwork." (or "spending
requests"), and `button` is null. The button should open the suite's own request form. Nothing is filed
for the person, so a date or a sum is never guessed. A no, or carrying on, leaves nothing.

Both ride on the plain reply and the stream's `done`. A request is never also offered as an idea.
There is no model and no prompt: the reading is WhatsApp's own. Its limit is that only a request is
taken, so "I'm taking Friday off" alone is not read as one, while "Can I take a day off on Friday?" is.
No PromptVersion is needed, and no all-24 scenario is touched.

**Two lines from the re-run (run-oct5c), put right where they are served.**

- **Project:** "This check-in cannot tell you whether you ever saw or responded to Rita Adeleke's requirements from July." used to keep "Your own account of this is not in this check-in." The question has the lead as its subject, so the lead now reads "Only you can answer this." An admin reads the lead's name there and keeps the old sentence.
- **Crisis:** "Sarah is not a person to this check-in" came from the repair that replaces the word "party". "a party to this check-in" now becomes "in this check-in": "Sarah is not in this check-in, and the record does not state Sarah's source of information." Under it, the lead now reads "Sarah's own account is not in this check-in." instead of being told their own account is missing. Her name is said again, and no pronoun is guessed.

## The full API suite on this computer (140, item 3): green, 16,609 tests, no memory trouble

```
npx jest --maxWorkers=2            (from api/, at 9f29a874)

Test Suites: 2 skipped, 1707 passed, 1707 of 1709 total
Tests:       2 skipped, 16609 passed, 16611 total
Time:        427.471 s          exit code 0
```

Nothing ran out of memory: "JavaScript heap out of memory" appears nowhere in the run, and none of
the files you named in request 138 failed. So those failures are your machine, not the tests, and
two workers is probably the difference — the default is one per core, and each suite builds enough
of Nest that a machine with more cores runs more of them at once and needs more memory, not less.
Try `npx jest --maxWorkers=2` before anything else.

Two things worth knowing from the run:

- **The two skipped suites are `journey/user-journeys.spec.ts` and
  `journey/whatsapp-journeys.spec.ts`.** They skip themselves without their databases, so a plain
  run does not cover the browser journeys or the WhatsApp ones. Neither of us should read "all
  green" as covering those.
- **One worker had to be force-exited** at the end: "A worker process has failed to exit gracefully
  … likely caused by tests leaking due to improper teardown." Nothing failed because of it, but a
  suite that leaves timers or a connection open is exactly the kind of thing that turns into your
  out-of-memory on a machine running more workers. I have not chased which one yet.

## Requests 121 to 140, item by item, against this head

The boards you reviewed are on your computer, not mine, so I cannot re-serve them. What I can say
for each item is whether a fix has landed here and what holds it. Where I name a test, that test is
the thing to read: it is written as the reader, not as the function.

| Item | Where it stands | What holds it |
| --- | --- | --- |
| 121 (1) the gap's date | Fixed | `request-121-1-the-gap-says-the-day-the-aim-is-due.spec.ts` |
| 121 (2) the duplicate target still stored | Fixed in the script, not in the engine | `bring-a-check-in-up-to-date.ts` rule 4 now reads the lead's own aim too; `bring-a-check-in-up-to-date.spec.ts`, "the lead's own aim, said again with no number" |
| 121 (3) "You can write down what it assumes here." | Fixed | `request-121-3-a-target-does-not-point-to-a-place-that-is-not-there.spec.ts` |
| 121 (4) Faraji chased although not let in | Fixed | `request-121-4-somebody-waiting-to-be-let-in-is-not-chased.spec.ts` |
| 121 (5) the engine's text counts six | Fixed | `request-121-5-a-person-not-let-in-is-not-counted-as-missing.spec.ts` |
| 122 (1) Today says nothing needs her | Fixed | `request-122-1-today-says-what-the-board-says-needs-the-lead.spec.ts` |
| 122 (2) the wrong day for the next check-in | Fixed | `request-122-2-today-gives-the-day-the-board-gives.spec.ts` |
| 125 (1) "Dr has set a goal" / the untold goal | Fixed | the five `request-125-*` specs |
| 125 (2) two counts of one thing | Fixed | `request-125-one-count-of-the-goals-not-told.spec.ts` |
| 127 (1), 129 (1), 133 (4) no headline question | Fixed | `request-127-129-the-headline-question-on-more-boards.spec.ts` |
| 127 (2) (3), 134 (1) garbled and repeated waits | Fixed | `request-127-134-a-wait-is-said-once-and-whole.spec.ts` |
| 127 (5), 129 (3), 131 (1), 132 (e) "their"/"they" for the reader | Fixed | `aSentenceAboutTheReaderSaysYou` in `a-stored-sentence-reads-right.ts` |
| 127 (8), 129 (8), 135 (5), 136 (8) the broken `latestFinding` | Fixed | `a-finding-reads-right.ts` and its spec |
| 127 (9) a surname holding "Lead" | Fixed | `request-127-a-surname-that-is-a-role-is-no-surname.spec.ts` |
| 127 (11) `reportedAgainstCriteria` | Fixed | `request-127-the-engineering-board-reports-against-the-rules.spec.ts` |
| 127 (10), 129 (4), 130 (c), 131 (2), 132 (g), 134 (2), 135 (4), 136 (5) the meetings line | Fixed twice: left out when served, and now taken out of the row | `withoutTheMeetingsLine`; `bring-a-check-in-up-to-date.ts` rule 7 |
| 128 (1) the lead counted in the 90 days | Fixed | `request-128-the-lead-is-not-who-the-90-days-are-about.spec.ts` |
| 129 (5) what someone does now, typed as an intention | Fixed | `request-129-a-line-is-an-intention-only-if-it-intends.spec.ts` |
| 129 (6), 133 (3), 135 (2) a name said twice | Fixed | `a-name-said-twice-in-a-row.ts`, `a-name-is-not-said-twice-on-the-board.spec.ts` |
| 129 (7) a count where a thing belongs | Fixed | `request-129-where-this-is-heading-names-the-thing.spec.ts` |
| 130 (a) the first count read as a rise | Fixed | `request-130-a-first-count-is-not-a-rise.spec.ts` |
| 131 (3) a colon joining pieces | Fixed | `a-stored-sentence-reads-right.ts`, the "What changed:" rules |
| 131 (4) counts as words | Fixed | `request-131-a-tally-counts-only-what-there-is.spec.ts` |
| 132 (a) the glance undercounts | Fixed | `request-132-the-glance-counts-what-the-list-holds.spec.ts` |
| 132 (c) two readings of one fact | Fixed | `request-132-two-readings-of-one-fact.spec.ts` |
| 132 (d) "Kiambu County has 1 county" | Fixed | `request-132-the-county-is-not-counted-as-work-in-itself.spec.ts` |
| 132 (g) "chased it" about two things | Fixed | `a-stored-sentence-reads-right.ts` |
| 133 (2) "Your own account" about somebody else | Fixed | `the-judgement-reads-right.ts` |
| 134 (6) "the oldest" of one thing | Fixed | `request-134-the-glance-says-who-waits.spec.ts` |
| 135 (1), 136 (4) "That call has been open a while -" | Fixed | `a-stored-sentence-reads-right.ts` |
| 136 (2) the work plan leaves out the session | Fixed | `request-136-the-founders-work-plan-holds-the-sessions-commitments.spec.ts` |
| 139 the pattern title "Does the coordinating other people skipped" | Fixed | renamed to "Takes on coordination other people left undone" (decision 104, provisional) |
| 130 (e), 134 (3) coaching that contradicts its heading | Fixed | `a-stored-sentence-reads-right.ts`, the two "rather than asking about" rules |
| 136 (6) written for a team, on a one-person check-in | Fixed | `onlyTheLeadIsHere` in `where-you-are-against-what-you-named.ts`, set in `reports.service.ts:3604` |
| 136 (3) clipped quotes | Fixed | `what-the-record-shows-over-time.ts`, the "two clipped quotes" rule |

### Two more fixed this afternoon

| 132 (f) the thing and the person run into one another | Fixed | "…who can provide the fuel allowance for October **that** Aisha Wanjiku is waiting for". Two expectations in `lead-actions-on-the-board-as-each-reader-reads-them.spec.ts` pinned the sentence without the "that" and were updated, because they were pinning the defect |
| 136 (1) the founder's aim has no number | Fixed | "Get to 20 paying customers by December." now aims at 20: `AIMS_AT_BY_GOING_TO` in `an-aim-said-twice-is-one-aim.ts`, kept narrow, with the refusals ("Get to 12 percent", "Grow to 5 million in revenue") tested as refusals |

### Still open: eleven items, checked properly this time

My first list was guesswork — I read it off whether a test file was named after the request, which
is not the same thing, and six items I called open had fixes. This list is made the other way
round: every item of 121 to 140 against what the code cites, then each remaining one read in the
file that would hold it.

| Still open | What it is |
| --- | --- |
| 123 (7) | the lead's judgement mixes "you", "they" and "she" for one person |
| 123 (8) | a label on the new hire ("not yet equipped to…"), and the outcome when somebody leaves — see below |
| 127 (5) | "their" for the reader, outside the shapes the rule covers |
| 127 (6) | "session 1 of 4 of founder or CEO work" where no kind of work is set |
| 127 (7) | "13 worries are on record" with no worry shown anywhere |
| 130 (b) | `whoOwnsWhat` empty for Aisha, who said "42 drops, missed 9" and committed to the photo |
| 130 (d) | the operations board is not sent Themes, sites for `byArea`, or stages for incidents |
| 131 (6) | the programme's headline question, the "Women" share target and the county for each group |
| 133 (1) | a sales question on a loans check-in — see below |
| 134 (4) (5) | the judgement's two sentences about the open commitments, and who is asked to find an owner |
| 135 (3) | the judgement miscounts: "four different activities in two locations" for two crops in two places |

Seven of those fourteen are the judgement, which is the model's own writing rather than a sentence
assembled from rows. The repairs at the read (`the-judgement-reads-right.ts`) can only fix shapes,
not a miscount, so these want the prompt and the test to go together. That is the next piece of
engine work I would do, and I have not started it.

On 127 (5): the rule that puts a sentence about the reader into "you" covers she, he, her, his, and
the two shapes "they said they would" and "and their own". "most of their time" and "at their own
request" are neither, so they come through. I can widen it, but only where the sentence is already
known to be about the reader alone, and I would rather see the line it came from than guess at the
shape.

Two of the fourteen are decisions rather than defects, and I have not made them on my own:

- **123 (8), the outcome "The new person leaves the role."** (`resolution/end-states.ts`). You ask
  for his name; the prototype says "Part ways". Those are two different answers, and the words a
  reader sees when a person is let go are not mine to pick. Hafsah's call.
- **134 (5), "Ask Amani Wekesa to find out who owns this by name."** You say Amani is the one
  waiting, and she is. But she may also be the one who knows who owns the tax view, and the board
  already tells the lead separately to find out who can provide it. Telling the lead to ask her is
  not obviously wrong, so I have left it rather than quietly change who gets asked.

Three more came off the list while I was writing it:

- **130 (f), the outcomes.** `END_STATES` for this kind already reads "The team is on course.",
  "The team can reach it, with a change in how the work is done." and "The target needs to change."
  — the prototype's three, said as full sentences.
- **123 (12), one rule for the lead's words.** The sentence is already gone on a new hire's board:
  `request-124-1-the-new-hire-reads-the-leads-own-words-and-row.spec.ts` checks that "The words
  your lead used are not shown to you here" does not appear, and that Tobi reads Amina's own words
  and her row. It still appears where a colleague's words really are walled, which is its own rule.
- **123 (2), `kindOfWork` null.** Not a defect in what is served — the check-in was made before the
  kinds of work existed, so its row has none. `journey/give-each-check-in-its-kind-of-work.ts`
  gives each existing check-in its kind, using the one reading a new check-in gets at setup, with
  the answers cached so a second run is free and identical. Dry run by default; `--write` to write.
  Run that against your database and the board stops saying "not known".

And **136 (7) is fixed since I wrote this list**: the founder, the only person in her own check-in,
was told "Your own account of this is not in this check-in." about her own commitments. It now says
nobody else answers it. That wording is mine and PROVISIONAL — the prototype has no screen for a
check-in of one.

## The meetings line is out of the stored row, not only out of what is served (127, 129–136, and 140 item 1)

You asked, in 131 (2) and again through Hafsah in 140 (1), for
`journey/bring-a-check-in-up-to-date.ts` to rewrite this stored line, because its dry run kept
saying "Nothing would change". You were right that it did nothing, and my earlier answer pointed you
at a script that had no rule for it. It has one now.

**Rule 7.** For each check-in, the script reads the record lines with `aMeetingIsOnRecord` — the same
reading the engine writes by, not a second opinion — and where no meeting is on the record it takes
`THE_MEETINGS_LINE` out of the stored report's `overTime.cannotTellYou` and `overTime.toSettleFirst`.
Nothing else in the row is touched, no words of anybody's are written, and the hosted-database guard
is the one that was already there: `--hosted-database` alone is a dry run, `--hosted-database
--write` asks for the host name to be typed back.

**Proved on a database, not in a test.** A local database migrated to the current schema, loaded
from `journey/seed-a-marketview-q4-check-in.ts`, whose stored report holds both forms of the line:

```
npx ts-node -T journey/bring-a-check-in-up-to-date.ts --dry-run
  1 check-in was read. 1 thing would change.
  MarketView, Q4: the stored report says "Nobody on record has said who arranged the meetings
  that happened, so this cannot tell you who secured them" (and 1 more like it), though nobody
  in this check-in spoke of a meeting. They would be taken out of the row …

npx ts-node -T journey/bring-a-check-in-up-to-date.ts
  The changes were written.

select count(*) … where l like 'Nobody on record has said who arranged the meetings%'
  before: 2      after: 0
cannotTellYou and toSettleFirst still hold 2 lines each, and over_time still has all eight of
its keys, so nothing else went with it.

npx ts-node -T journey/bring-a-check-in-up-to-date.ts --dry-run
  1 check-in was read. Nothing would change.
```

Three tests hold it: the line goes; it **stays** where somebody did say they met someone ("I met with
Aisha on Tuesday"), because that line is then true; and a check-in with no stored report at all is
left alone.

One thing to know: serving has left this line out since the `meetingsOnRecord` fix
(`withoutTheMeetingsLine`, applied in `overTimeAsServed` and `overTimeForThisReader`), so on the
engine's current code you should not see it on a board even before you run the script. The reviews
that found it (127 (10), 129 (4), 130 (c), 131 (2), 132 (g), 134 (2), 135 (4), 136 (5)) were served
by `0b15efca` and `7bcfd919`. The script matters for anything that reads the row itself.

## The MarketView Q4 check-in, made locally with the script (140, item 2)

```
createdb gw_mv_q4_140
DATABASE_URL=postgresql://localhost:5432/gw_mv_q4_140 npx prisma migrate deploy
npx ts-node -T journey/seed-a-marketview-q4-check-in.ts postgresql://localhost:5432/gw_mv_q4_140
  Loaded 153 rows. The check-in is 6e84ca43-31d4-4e33-bf38-91defee0543a, "MarketView, Q4".
```

| | |
| --- | --- |
| The check-in | `6e84ca43-31d4-4e33-bf38-91defee0543a`, "MarketView, Q4" |
| Who leads it | `wairimu.mvq4@example.test` |
| Who checks in | `otieno.mvq4@example.test` and `naliaka.mvq4@example.test` |

The id is the same on any computer: it is in the seed's JSON, not made at load time, so your board
and mine are the same check-in. Nobody has a password — all three sign in by emailed link, which is
how the seed was exported. Run it twice and nothing changes the second time.

## Six of your open requests are already closed at `72a2f1a2` — checked one by one, not assumed

Requests 119, 120, 126, 137, 138, 141, 146 and 156 are all still marked Open on your branch. I ran
each of them against the engine's current head and they pass. Merge `mine/wip/release` and they
should all go green on your side too. What I actually did, in each case:

**156, the four seed files never reached a branch.** Closed. `.gitignore` lets them through now and
they are committed:

```
git ls-files api/journey/ | grep -E 'seed-|a-database-on-this-computer'
  api/journey/a-database-on-this-computer.ts
  api/journey/seed-a-company-for-review.ts
  api/journey/seed-a-hundred-check-ins.ts
  api/journey/seed-an-anchor-check-in.ts
  api/journey/seed-the-suites-for-the-screens.ts
```

(The MarketView Q4 seed and its JSON are tracked too, as you said.) Five, not the four you listed:
`seed-a-hundred-check-ins.ts` is request 157's hundred-check-in organisation, written since. Read request 158 above before you run any of them — until this morning
every one of them loaded people who could not sign in.

**126, the API does not compile (`myNames` on `WhoIsReading`).** Closed. `npx tsc --noEmit -p
tsconfig.json` in `api/` exits 0 at `72a2f1a2`. `myNames?: string[]` is a declared field of
`WhoIsReading` now (`the-switchboards-own-sections.ts:36`), so `board.service.ts:2464` is legal.

**120, `node dist/main` stops at once (`ConversationService` argument 1).** Closed, and proved by
starting it rather than by reading the module graph:

```
npm run build                    → nest build, no output, exit 0
ls dist/modules/embed/static/    → embed.js, panel.html   (so the copy step ran)
node --enable-source-maps dist/main
  [NestApplication] Nest application successfully started
  [Bootstrap] Groundwork API running on port 3000
POST /api/v1/auth/login with a wrong password → 401
```

Your point about the unit tests stands and I have not fixed it: nothing in the suite starts the
whole application module, so this class of fault can still reach you. I have not added that test
yet — say if you want it and I will.

**138, the engine test pins the board's source text.** Closed, and done the way you asked. The
expectation at `the-judgement-reaches-a-screen.spec.ts:115` matches
`<TheJudgement it={(b as any).theJudgement}` with no closing `/>`, with a comment saying why: the
screen may pass the judgement more props, and the where-next board does. The second half of that
test still checks the judgement is drawn **above** what people said, which is the part that matters.

On your other question there: the `journey/*.spec.ts` files you named and
`board/the-board-serves-patterns-under-the-rules.spec.ts` have not run out of memory on this Mac on
their own. I have not re-run them all today — this computer is being kept quiet — so take that as
"they passed when last run individually", not as a fresh result.

**119, 137, 141 and 146, the wording guard.** All four closed.
`client/src/lib/copy-does-not-sound-like-yoda.spec.ts` is byte-for-byte the same on both branches
(`git diff mine/wip/prototype-ui` on that file is empty) and it passes here, both its tests.

Counted exactly, by running a copy of your spec with the ceiling set to -1 so it prints the number:
**60 lines, against a ceiling of 60.** That is the part you should know: it passes with nothing to
spare. The next line either of us writes in that shape breaks it again, which is why this keeps
coming back to you. I would rather bring it down than sit on the line, so unless you object I will
take the count down as I touch engine copy, and tell you here when it moves.

*Read at 5 October against `72a2f1a2`.*

## Request 158, nobody seeded could sign in — fixed, and proved by signing in

You were right on every point, and it was my defect. All four seeds wrote their people and then
either wrote no membership at all (the suites seed) or wrote one against `organizationId_userId`,
which is not the key the model declares. `@@unique([userId, organizationId])` makes the key
`userId_organizationId`. The call threw every time and `.catch(() => undefined)` ate it, so each
seed said it had loaded and `jwt.strategy.ts` then found nothing, which is the 401 you saw.

**What changed.** There is now one place that writes a membership,
`theyAreInThisOrganisation` in `api/journey/a-database-on-this-computer.ts`, and all four seeds call
it. It keys on `userId_organizationId`, sets `role` on create **and** on update (so the admin and
the leads are still admin and leads the second time a seed is run), and has **no catch**: a seed
that cannot write a membership has not loaded, and should fall over saying so.

I also found a second fault while proving it: `seed-a-company-for-review.ts` could not be run
twice. It deleted its grounds without first deleting the record entries hanging off their
participants, and the second run died on `record_entries_participant_id_fkey`. The children are
cleared first now, as the hundred-check-in seed already did.

**The proof, not the code.** Into a clean database (`gw_seed_check_158`, migrated to the current
schema), all four seeds loaded, then loaded twice more:

| Organisation | People | Memberships | Check-ins |
| --- | --- | --- | --- |
| Harambee Logistics | 30 | 30 | 100 |
| Kijani Foods | 8 | 8 | 9 |
| Sokoni Fresh | 5 | 5 | 2 |
| Suites Test Company | 5 | 5 | 0 |

Unchanged after the third run, so a second load still replaces rather than doubles.

Then the thing you actually need, against the running local API:

```
POST /api/v1/auth/login   amina@suites.test / suites-local-only   → 200
GET  /api/v1/auth/me      with that token                          → 200
                          amina@suites.test, ADMIN, Suites Test Company
```

Before the fix that second call was the 401 you reported. Pull and re-run the four seeds; the
people you already have will be given their memberships by the same run, so nothing needs clearing.

## Your requests of 27 September (your numbers 3 to 10)

| Your # | What you asked | Answer |
| --- | --- | --- |
| 4 | Five of my new specs trip the comment guard. | **Done in `44ed5854`.** You found four, and there was a fifth, `a-cut-never-leaves-a-fragment.spec.ts`. All five now remove comments before they match. |
| 10 | The board spec still expects the `table` prop. | **Done in `dd4525f3`.** It now expects `<TheJudgement it={(b as any).theJudgement} />`. It still checks that the judgement renders above what people said, and it now also checks that what people said is on the page at all. |
| 8 | The board tells a lead that a person said "nothing checkable", which rests on how their answers were rated. | **Done in `a1747927` and `88b84293`, 27 September.** The board no longer reads `specificityLevel` or `specificityDimensions` at all. The reason is now read from the record: whether anything they said this round has a number, a date or a document with it. The key is now `nothing to count yet`. Your stop-gap `the-lead-never-reads-a-rating.ts` is removed, because it showed such a row as "nothing to do", which was untrue. A privacy spec, `the-board-never-reads-the-rating.spec.ts`, builds the board rated best and rated worst and proves the rows are identical. **One thing I need from you:** each row now carries `says`, one or two full sentences with the person's name, saying what happened and what would change it. For example: "Femi is at 2 of 14, and 6 of the 12 rounds have gone. At this pace, 14 would not be reached by the end." The `ask` line is also in full sentences now and does not repeat `says`. Please show `says` in place of the coloured pill and the MEANS line in `where-each-person-is.tsx`. Hafsah's rule this morning is that nothing on any screen may read as a score or a rating of a person, and a red "stuck and not chasing" pill beside a name reads as one. Keep `reason` for the order only. Your `Reason` type also needs the new key, or those rows get a pill with no colour. |
| 36 | Privacy: a person's label can fall back to the lead's private description of them. | **Done, 27 September, in `a75b13ac`, `5680910c`, `c28dbc97`, `7586775d`, `feea6104`, `7b2a876c`, `731f889c`, `c39d7fca`, `f2c99afc` and `bbc33862`.** Hafsah's words: "Fix it the simple way: the label never uses the lead's description; with no name, use a plain neutral label." **The label.** A person's label is now their own name, or the name they typed at the end of an open link (`nameGiven`), and never `roleAsDescribed`. This covers the board's `nameOf`, the board listener, the email sent when the lead suggests how a check-in ends, `whatToCallThem` in the interview, and four name lists in `conversation.service.ts`. **The word.** With no name, a person is "a colleague". The prototype never says "teammate". With one person the reader cannot name, they are "a colleague". With two or more, they are "one colleague", "another colleague", "a third colleague" and so on (Hafsah's decision, `bbc33862`). When the same person comes up again in the same text, the words say it is the same one. While only one such person has come up, it is "the same colleague". Once two or more have, it is the number their first mention gave them: "the first colleague", "the second colleague". For example, "The second colleague says the tests were the slow part, and the first colleague agrees." This used to read "Another colleague says the tests were the slow part, and a colleague agrees." A board line or a single sentence uses the first-mention words, and a lead with no name is "the lead" ("your lead" to someone in the check-in). These words come from the one function the reports already use, `plainWordsForTheUnnameable`, through a new `plainWordsByPerson`, so the same person is called the same thing everywhere. There is a capital letter only at the start of a sentence or a line. A person now reads, for example: "A colleague has not checked in for this round yet.", "What a colleague said this round has no number, no date and no document with it yet, so there is nothing new to count.", "Ask this colleague to check in.", and the email subject "The lead suggested how to wrap this up". In the report's list of who answered, someone the reader may not name now reads "A colleague", where it used to read "Participant B". **Four more routes, closed.** (1) The board's `contribution[].remit` was `roleAsDescribed`, sent to every reader. It now goes only to whoever runs the check-in, through `theLeadsWordsAbout`, and everyone else gets null. `remitDefined` is kept. On your board card (`BoardPage.tsx`, line 1388), a null remit with `remitDefined` true shows nothing beside the name: the span is empty and no "role not clearly defined" is shown. (2) The report's `people[].role` reaches only the room judgement, which only the lead reads (`whatAParticipantMayRead`, `theBoardsJudgementFor`). No code needed to change, and a test now shows this on the served board. (3) A person's own session is no longer handed the lead's words about them: not "The person who set this up described this person's part in it as", not `PRIOR_CONTEXT`, and not "who described their role as". Only the lead's own row counts as their own words. `remitAsGiven` is the lead's invite note, so it is not used instead. Because the model no longer sees the lead's description, an invited person whose row holds only that description is now asked "are you the person this check-in is about, or somebody working alongside them?" in their first session of a starting situation, the same as somebody with no role (`f2c99afc`). (4) The person's own coaching note said "your work as" plus the start of the lead's sentence, which gave "your work as daniel". It now says "this work" unless the words are the person's own. A new spec, `a-label-is-never-the-leads-description.spec.ts`, searches the whole served board for the person and a peer. Another new spec, `a-persons-session-is-not-handed-the-leads-words.spec.ts`, reads every prompt in a real turn. **Please change these in `client/`, which I have not touched:** `participantLabel` and `personLabel` in `client/src/lib/utils.ts` (lines 91 to 104) still fall back to `roleAsDescribed` and then say "a teammate". "A teammate" is also shown for a missing name in `BoardPage.tsx` (lines 1210 and 1312) and `components/gw/nine-columns-is-not-a-phone-screen.tsx` (line 92). The wording is in comments in `GroundAdminPage.tsx` (around line 1982) and `SettingsPage.tsx` (line 28). Your specs `lib/participantLabel.spec.ts` and `lib/one-way-to-name-a-person.spec.ts` expect "a teammate". **One of your specs now fails because of my change:** `pages/grounds/the-reveal-row-names-who-you-are-waiting-on.spec.ts` (line 66) reads my `reports.service.ts` for `label || 'A teammate'`. That line is now `return aColleague(p.id);`, so please make the spec expect that. |
| 3 | Today: `sinceLast`, `forTheLead` and `toLookAt`. | **Not started.** These are new engine writing and are Phase 2 or later on my list. The field shapes are fine by me as written. |
| 5 | Situation names in the prototype's words; the eight "new" situations; one opening sentence. | **(a) Done, in the commit "The situations take the names Hafsah chose, the prototype's for six, keeping contract and recognition".** Hafsah decided: "Use the prototype's names for six of the eight, and keep 'contract' and 'recognition' in the other two." Every name in `THE_SCENARIO_TABLE` is now in sentence case. Six take the prototype's words: "Start an advisor or board relationship", "Build a workplan and budget", "Check how the same role is going", "See where people see things differently", "Make sense of something serious", and, for the cascade card on OKR_ALIGNMENT, "Connect goals across teams" (in `WHAT_THE_CARD_IS_CALLED`, beside `whichCard()`). Two keep their word: CONTRACT_RENEWAL is "Check in before a contract ends or renews" and RECOGNITION is "Support a raise, promotion or recognition". Every other name only changed its capitals. I changed `SCENARIO_LABELS` in `client/src/lib/scenario-catalog.ts` to the same strings in the same commit, only the strings, so the parity test stays green. I also changed two strings in `the-way-in-as-each-reader-reads-it.spec.tsx`, because it pins those two names as a person reads them. I did not touch the cascade name the client writes itself: `scenarioLabel()` in `scenario-catalog.ts`, `CreateGroundPage.tsx`, `EntryChatPage.tsx` and two specs still say "Connect Goals Across the Team". Please change those to "Connect goals across teams". **(b) and (c) are not done yet.** I have not yet checked the eight situations against `docs/conversation-standard.md`, or said whether the cascade needs its own situation. I have not yet answered about the opening sentence for "Help someone get back on track". |
| 6 | Context: proposals from a plan, what a target assumes, a document read item by item, and two lines on the lead's card. | **Not started.** For (a), I would rather you add the storage for pending proposals, and I will write the proposals. Let's confirm that before either of us builds it. |
| 7 | Suggested answers, the end card and what moved. | **Not started.** These are my tasks 2.6 and 2.7, and I will use your field names. |
| 9 | Reports and sharing: `inShort`, `eachPerson`, `seenDifferently` and the rest, plus the weekly report. | **Not started.** It is a large piece of work, and I will answer it field by field when I reach it. |
| 19 | Privacy: the board names who is waiting on you, even where people don't see each other. | **Done, 27 September, in the commit "A participant reads no colleague's name on a board where people see only themselves".** On a check-in where people do not see each other (the setting is off, or it is not set and the kind of check-in hides people by default, decided by the one rule, `peersAreNamedOn`), a participant's board now names only themselves and the lead. Everybody else is "one colleague", "another colleague" and so on, in the words the reports use (`plainWordsByPerson`, fed the names this reader may see by `namesVisibleTo`). This is done in the board's one `nameOf`, so it covers both ends of a handoff (your request: whoever is waiting on the reader is now "one colleague"), the list of people (`participants[].name`), and who picked a time in the poll. The lead and admins still read every name. Nobody's role reaches a participant, as before. A participant on such a check-in now reads, for example, the list "Wairimu Kamau", "Miriam Wanjiku", "One colleague", "Another colleague", and the handoffs "Miriam Wanjiku is waiting on One colleague for the pricing sheet" and "Another colleague is waiting on Miriam Wanjiku for the stock count" (as `from`, `what`, `on`). The capital letter is `atTheStart`, as everywhere else on the board; mid-sentence, please lower it. `the-board-opens-for-every-reader.spec.ts` searches the whole served board, as each participant, on every situation where people are hidden, for every colleague's first name, last name, address, role and organisation, and finds none. **Please check these places draw a colleague correctly:** the board's list of people and every card that looks a person up by `participantId` in `participants` (`BoardPage.tsx`, `nameOnTheBoard`), the handoffs (`dependencies[].from` and `.on`), the poll's `who`, and the check-in grid rows. |
| 56, 58, 65 | An email address used as a name. | **Fixed, 28 September, in `fdc1439b`.** Hafsah: a lead never sees "Start with zawadi.u8@example.test"; use the person's name, or a plain sentence when there isn't one. `displayName` no longer returns an address to anybody, so a person with no name is "a colleague", "another colleague" everywhere, `probes` included. Four places that fell back to the address are fixed. Text already stored with an address in it is read once more at the end of every board and report read, and the address becomes the name or the plain words. A field that is an address by design (`email`) is left as it is, so you can still show it beside a person where the lead needs it. The count of "4 of 5" against "4 of 6" in request 56 was request 69's fix. |
| 62 | "How much you gave this one" or the prototype's words. | **Done, `f0168cff`.** `WHAT_THE_BLOCK_IS_CALLED.howMuchYouGaveIt` is now "How checkable today’s check-in was". `the-order-is-the-order-on-screen.spec.ts` passes. |
| After the merge of 28 September | Three of your client tests fail on your branch as it stands. | `nothing-is-left-behind.spec.ts` (`components/gw/GroundTabRow.tsx` is no longer imported by anything), `a-phone-is-not-a-narrow-desktop.spec.ts` (the section heading's right-aligned source line), and `that-is-on-the-record.spec.tsx` (the header after the one-line question). These test your own files mid-rebuild; the merge changed no client file of mine. Passing them on to you, not changing them. |
| 54 | Internal labels in the session report and the rounds. | **Fixed, 28 September, in `0bad62f2`.** The routes it took: the session report's own fields (`atStake`, `settledBy`, `restsOn`, `positions[].view`, `whatEachPersonSaid[].finding`, `theConversationWorthHaving`) and `rounds[].sharedPicture` were built after the name swap and never went through it. Rather than add them one by one, every board and report read now ends in the same last read: the board, `/report`, `/report/session/:n`, `/report/rounds` and `/report/against-success`. Any label left anywhere becomes the name this reader may see, or "a colleague", "another colleague" where they may not. "You is aiming" and "until you sends it" are mended there too, outside quotation marks only. A test serves the board and each report read to the lead, each participant and an admin who only reads, with people named to each other and not, and finds no label. The emails in `probes` and elsewhere (requests 56, 58, 65) are a different fault and still open. |
| 53 | Dates arriving as `{}`. | **Fixed, `0bad62f2`.** Both walks in the name swap now leave a Date as a Date. |
| 46, again, and 63 | A private file's name, and a hidden target's number, on the board. | **Fixed, 28 September, in `7afee54e`.** The fields were already walled; the sentences were not. Now everything the board sends, and everything `GET /report` and `GET /report/session/:n` send, is read once more for the reader. A file's name comes out where `canSeeDocument` says the reader may not open it; a lead's own file is not named to an admin. A sentence giving a person's target comes out where `targetsFor` says the reader may not see it; on a row about one person, any sentence with their number goes. An aim left empty is dropped from `objectives`. A test serves the board and the report to the lead, the person whose target it is, a participant with no target, and an admin who only reads. On run-14's sales check-in, Ngozi reading Kwame's 14 is not covered by this: Kwame said it himself in his own check-in, and that check-in has no per-person targets set by the lead. I have asked Hafsah whether a person's own stated target should be treated like one the lead set. Nothing changes on your side. Not live on the local API until the current full run ends. |
| 68 | "Unblock: …" on the decisions list. | **Fixed, `7afee54e`.** "Somebody is waiting on the discount decision, so it needs deciding." The divergence line next to it had the same shape ("Settle: …") and now reads "The accounts differ on whether a price range counts as a budget, so it needs settling." |
| 69 | Two head counts, and "Four of the 6". | **Fixed on the engine side, `7afee54e`.** Hafsah decided the count people read uses the same people as your header. The server now has that rule too (`whoIsInTheRound` in `reports/how-many-have-answered.ts`: everybody, and a lead who only asks in round one only). The board's `howItIsGoing.glance.progress.answeredThisRound` and `ofPeople` use it, and so does the report's opening count, for the round being reported. It used to count everyone who had ever finished, the lead included, against a different set. `waitingOn` still uses the round-closing rule, so someone whose invitation lapsed is counted but not waited on. The sentence is all in words or all in figures: "Four of the six people have answered so far.", "12 of the 41 people have answered so far." Your `whoIsInRound` can stay as it is. |
| 51 | The session report before someone has answered. | **Fixed, `ef212298`.** Before the report is released, a participant who has not answered that session gets only `{ sessionNumber, withheldUntilYouAnswer: true, saying }`, where `saying` is the same sentence the main report gives ("A picture is forming from the accounts that are in. You can read it as soon as you have given yours…"). Please show `saying` when `withheldUntilYouAnswer` is true, as you already do for the main report. The lead and an admin read as before; once released, everybody does. |
| 52 | `parties[].confidence` on another person's row. | **Fixed, `ef212298`.** It comes off with `specificityLabel`, and the privacy test checks it. |
| 49, 57 | A person held for a seat reading the report; any admin releasing it. | **With Hafsah.** Both are product decisions, asked in the morning report. |
| 7a | Suggested answers under each question. | **Built, 28 September, in `e313b579`, not yet measured live.** `suggestedAnswers?: string[]` is on the open response, on each reply (`POST /check-ins/:id/messages`), on the stream's `done` event, and on each AI turn in `GET /check-ins/:id/transcript` (stored on the turn, so they survive a reload). Two to four, or the field is left out; never one on its own. A turn that asks nothing, such as the closing one, has none. They are built from the question and the person's own last answer only. Some carry a gap written as "...", such as "We have sold ... so far.", for the person to fill in, so please let a tap put the text in the box rather than send it. 7b and 7c are not started. |
| 8, changed back | "Nothing checkable" on the lead's board. | **Changed on Hafsah's correction, 28 September, in `01379c6e`.** She decided that the rating of how checkable a person's answers are is needed, and that the lead's board shows it as the prototype does. So `eachPerson[].reason` can be `'nothing checkable'` again, and `'nothing to count yet'` is gone. Please (1) add `'nothing checkable'` to the `reason` type in `client/src/api/board.ts` and to `TONE` and `MEANS` in `where-each-person.tsx`; (2) show the pill as "Nothing checkable", as the prototype writes it; (3) show `says` under it, which is a full sentence and now counts the weeks in a row ("This is the second week in a row."), in place of `MEANS` if you like; (4) show `ask`, which now also carries what to ask next for this reason, for example "Ask Miriam Wanjiku for a photo, a message or a document that shows what moved." These rows are sent only to whoever runs the check-in and admins, never to a participant. If you took "nothing checkable" out of any screen because of request 8, it can come back as the prototype shows it. |
| 43, (a) | Privacy: the lead's path. | **Done, 28 September, in `828b4837`.** Hafsah decided that leads and admins are never sent how anyone's answers were rated. Every reader of a report now gets only the rating of their own answers. The Done page's "Only you see it" is true now, so please update the wording there if you had changed it to wait for this. **One change on your side:** `POST /grounds/:id/report/release` now returns `{ groundId, releasedAt }`, not the report. It used to send the whole stored report, with every rating and every private guide. `reportsApi.release` in `client/src/api/reports.ts` is still typed `Report`. `GroundAdminPage.tsx` only refreshes after it, so nothing breaks, but the type should say what comes back. |
| 43 | Privacy: every reader of a report gets everyone's rating. | **(b) Done, 28 September, in `59a62cc3`.** The forming report now goes through `withoutOtherPeoplesReads` like the other two places, so a participant who has answered keeps only their own rating. A test checks every call is wrapped. **(a) is with Hafsah.** `own-reads-only.ts` gives the lead and an org admin everyone's reads on purpose, and CLAUDE.md says leads never see ratings. That is a privacy decision, so I have asked her in the morning report and changed nothing. Please keep the Done page's wording as it is until she answers. |
| 40, 44 to 48 | Document wording, opening speed, the checkable read, a file named on the board, the closing gate, a closing message twice. | **Read, not started.** 46 (a private file named on the board) and 47 (the conversation says the report is ready, then the server refuses) come first when I next work. |
| 47 | The closing message and the completion gate disagree. | **Fixed on the engine side, 28 September, in `1a9ffa59`, being re-run twice.** Thank you for the ids. They are in `groundwork_dev` on your computer, which this one does not have, so I worked from your description. (1) When the product refuses a close and has no question of its own to add, the model's goodbye now comes off the turn, on the stream too, and the product's usual question goes on. So "Your report is ready now. Speak soon." is never written with `sessionComplete: false` any more. (2) "Please finish my check-in" is now heard as asking to finish, so the floor lets them out, as it already did for "finish this check-in". Your floor gate on `mayCompleteAfter` can stay as it is. For `117d94e8`, where the end card came before the 400, I could not find a server path that sends `sessionComplete: true` below the floor. If your end card also comes up on the client's own reading of "asked to finish", that reading now matches the server's for "my check-in". If it still happens after this, please send me the turns. |
| 46 | The board names the lead's private file. | **Fixed, 28 September, in `fc82c0a5` and `9758c050`.** The name came through the lead's own check-in: Groundwork's reply named the file, her answer echoed it, and the report was written from every record line. Now private file names are taken out of what the report is written from, and out of any note or line read by anyone but the lead, on the check-in's page and in their own check-in. The note "The numbers on this check-in come from X" names the file only when it is OPEN. The session report lists only the documents the reader may open. Nothing changes on your side. |
| 47, first look | The closing message and the completion gate disagree. | **Not fixed yet. What I found in the code, 28 September.** The two checks use the same turn floor (`theFloorFor`) and the same "they asked to finish" test, so they should not disagree on the count. Two places look likelier. (1) When the product decides the session is not over but the model has already written "Your report is ready now. Speak soon.", the product adds a question and leaves the goodbye in the turn (`conversation.service.ts`, after `const sessionComplete`), so the person reads that the report is ready while the session is still open. (2) The streaming path answers `sessionComplete: close.ready` without the `!stillAsking(...)` check the other path has. Could you send me the check-in id where Rukia saw it? Then I can tell which one it was. |
| 46, first look | The board names the lead's private file. | **Not fixed yet. What I found in the code, 28 September.** The report's list of documents takes only documents everyone may see (`visibility: 'OPEN'`, `reports.service.ts`), so the name did not come from there. The likelier route is the lead's own check-in. When a lead attaches a file there, Groundwork's own turns say its name, for example "Here is the context we have from team-plan.txt." (`what-a-document-holds.ts`) and "Recorded from team-plan.txt." (`conversation.service.ts`). What the lead's session says then reaches the synthesis as part of the record. The fix I would make is to take a private document's file name out of what the synthesis reads, and to test it on the board as a participant and an admin. Could you send me the check-in id? |

## 28 September: a question the lead wants asked, confirmed one at a time (decision 34)

Hafsah's decision 34: "A question the lead wants asked of a person may reach that person's session. Before it goes, the lead sees the exact question as Groundwork will ask it, and confirms it." The engine side is done, in `5f30dde3`, `be5e9d78` and `d6d00a44`. Nothing in `client/` is changed. This is what the screens need to build.

**How it works now.** When a lead pastes something that holds a question for a named person, Groundwork writes that question once, exactly as it will ask it, and shows it to the lead. The lead's yes to the paste keeps the question, but does not send it. Each question then waits until the lead confirms it, changes its words, or leaves it out, one at a time. Only a confirmed question reaches that person's check-in, and it is asked in those exact words. A question that is waiting or left out reaches nobody.

**1. In the context chat, beside the list.** `POST /grounds/:id/context-chat` still returns `proposal.say`. Each question in it now reads, for example:

    Questions you want asked, each one exactly as Groundwork will ask it:
    - Groundwork will ask Ngozi Balogun: "Have you sent the Client B proposal?"
    None of these questions is asked until you confirm it. You confirm, change or leave out each one on its own.

With one question it reads "A question you want asked, exactly as Groundwork will ask it:" and ends "This question is not asked until you confirm it. You can confirm it, change it or leave it out." Beside `say`, the proposal now also has `proposal.questionsForPeople`: `[{ id: null, participantId, who, exactQuestion, says, status: 'not yet kept' }]`. `id` is null because nothing is written yet. Show these as they are. There are no buttons on them yet, because "Yes, set it" is what keeps them.

**2. After "Yes, set it".** `POST /grounds/:id/context-chat/confirm` returns `questionsForPeople` beside `say` when the paste had any questions. These are now stored, and each one has an `id`. Show one card for each.

**3. The card, one per question.** The shape is `{ id, participantId, who, exactQuestion, says, status: 'waiting' | 'confirmed', confirmedAt, writtenBeforeConfirming, note }`. `says` is the line the card leads with, for example `Groundwork will ask Ngozi Balogun: "Have you sent the Client B proposal?"`. Please show it exactly as sent. A waiting card has three buttons:

- **Confirm**: `POST /grounds/:id/questions-for-people/:itemId/confirm` with an empty body. It returns the card, now `status: 'confirmed'`, and a `say` to show, for example: "Confirmed. Groundwork will ask Ngozi Balogun "Have you sent the Client B proposal?" in their next check-in, word for word."
- **Edit**: open the sentence in a text box with the current `exactQuestion` in it, and send `POST .../confirm` with `{ "exactQuestion": "<what they typed>" }`. What they typed becomes the question, word for word. It is confirmed in the same step, so the button under the box should say "Confirm". An empty box returns 400 "Write the question as you want it asked first." More than 400 characters returns 400 "That is too long to ask as one question. Keep it to one or two sentences."
- **Not now**: `POST /grounds/:id/questions-for-people/:itemId/decline`. It returns `{ id, status: 'left out', say }`, where `say` is, for example, "Left out. Groundwork will not ask Ngozi Balogun this question." Take the card off the list.

A confirmed card shows `says` and no buttons. Only the lead can confirm, edit or leave one out. Anybody else gets 403 "Only the person who runs this check-in can confirm a question for somebody on it."

**4. Where the cards come from on the Context page.** `GET /grounds/:id` now carries `questionsForPeople` for the lead and for an admin in their organisation. Waiting cards come first, then confirmed ones. Left-out ones are not listed. For a participant the field is absent, not empty. The same list is at `GET /grounds/:id/questions-for-people`, which returns 403 to anybody except the lead or an org admin. The `QUESTION_FOR_PERSON` lines in `contextItems` also now carry `exactQuestion` and `questionConfirmedAt`, but please draw the cards from `questionsForPeople`, not from those lines.

**5. Questions kept before 28 September.** These have no exact sentence and were never confirmed, so none of them is asked. They are listed as waiting cards with `writtenBeforeConfirming: true`. Their `exactQuestion` is the lead's own words, with a capital letter and a question mark added, and nothing reworded. Their `note` is the sentence to show under `says`: "You wrote this question before Groundwork asked you to confirm each one. It has not been asked. Confirm it, change it, or leave it out." The buttons are the same as for any other waiting card. Confirm keeps exactly the sentence the card showed.

**6. Changing a question elsewhere.** If the lead changes a question's words on the Context page (`PATCH /grounds/:id/context/:itemId` with `text`), or through "reword that one" in the chat, it goes back to waiting and needs to be confirmed again. The same happens when a question is closed or opened again. The card then shows the new words.

## Things the engine changed tonight that the screens should know about

| Change | What it means for a screen |
| --- | --- |
| The date question is now a full sentence: "When you say year-end, do you mean 31 December 2026?" | Any screen or test that expects the old "Year-end - so 31 December 2026?" needs the new wording. |
| A closing turn that a guard would cut to a stub becomes "Thank you. Your check-in is saved." | That wording comes from your Done screen. |
| Judgement actions that told the reader something ("Tell the initiator to…") are stored as the thing to do. | The board and report show "Get Chidi Eze and Sara Lindqvist in a room…" where they used to show "Tell you to get…". |
| Each person's finding can now carry how they say the work really runs, and a worry with a detail in it. | The findings are longer and more specific. No field changed. |

**One thing in your files, for you to look at.** `client/src/pages/chat/the-check-in-as-a-person-reads-it.spec.tsx` times out at 5 seconds in two tests, "pressing one sends it as the answer…" and "draws nothing when the engine sends none…", when the whole client suite runs. Alone it passes, 22 of 22, but it takes about 50 seconds, so it is fragile under load. I have not touched it.

**Two of your client tests fail on the merged branch (27 September, evening, at `21e6408b`).** Both are in `client/src/components/gw/jump-to.spec.tsx` ("Ctrl K opens it on the check-ins and pages; typing narrows; arrows and Enter go there": the element does not get focus) and `the-sidebar-waits-for-the-list.spec.tsx` ("if the list cannot be loaded it says so…": the text "Your check-ins did not load. Reload the page to try again." is not found). They fail when run alone. They also fail with my one client change, the `SCENARIO_LABELS` strings, put back as it was, so that change is not the cause. The last commits to touch the sidebar are yours, U.17 and U.18. I have not touched them.

**Your two sidebar tests fail again, and it is not a code change (27 September, night, at `7a9e9c93`).** The tests are `client/src/components/gw/jump-to.spec.tsx` ("Ctrl K opens it on the check-ins and pages…": the element does not get focus) and `the-sidebar-waits-for-the-list.spec.tsx` ("if the list cannot be loaded it says so…": the text is not found). They fail even when run on their own. At `5413a8ee` all 3,198 client tests passed, and no file under `client/` has changed since then. So they seem to depend on something outside the code, such as the date, the time or the order they run in. I have not touched them.

**Patterns have a new shape, for when they are switched on (28 September, `965712f5` to `81f03b75`).** Patterns are switched off everywhere until Hafsah approves the plain names in `docs/pattern-names.md`. When they are switched on, every place that shows them (the board's section, the check-in page's list, the person's own record) receives `heading`, `whatHappened`, `howOften`, `whoSeesIt`, `theirWords`, `canAnswer`, `askThem` and `participantId`. There is no longer `label`, `code`, `text`, `periods` or `type`. `BoardPage.tsx` still draws `{p.label}` and `{p.periods}`. Please also add:
- a "Say what's behind it" box, shown when `canAnswer` is true, that posts `{ text }` to `POST /patterns/:id/answer`, and shows `theirWords` back;
- on the lead's board, each pattern under that person's line, as the prototype does;
- on the You board (`/you`, yours), a call to `servedPatterns` and `markShownToThePerson`.

The person sees their own pattern first. The lead sees it only after they answer, after three days, or after a week if they never open it.

**One change in your file, for privacy (28 September, `95e789b2`).** In `api/src/modules/grounds/your-board.service.ts`, `myTodos` now returns nothing for a guest from another organisation. A guest viewing the host organisation could otherwise read the private to-do list of a host entry that shares their email address. It is part of making sure a guest's check-in never reaches, and never reads from, anyone on the host's list (decision 36). Please keep it when you merge.

*Read at 27 September against `8c15da1a`.*


---

## Things the engine changed that the screens should know about

Not answers to requests, but changes on this branch that alter what the API serves. Listed so the
screens workspace does not discover them by surprise.

| Change | What it means for a screen |
| --- | --- |
| `theTable` is no longer served to anybody, on the report or the board | `BoardPage.tsx:694` passes `table={(b as any).theTable}` to `TheJudgement`, which guards on it, so the "See the counts behind this" toggle simply does not render. Nothing to change; the `table` prop and `showTable` state are now dead and could be removed as tidying |
| A participant's report and board no longer carry `theJudgement`, `theTable`, `divergences`, `leadershipGaps`, `networkPicture`, `inferences`, `arcSignals` or the raw `direction` | A screen that reads any of those must handle them being absent for a participant. They were never meant for a participant and were being served by accident |
| `findings` is narrowed to the reader's own row for a participant | A participant's report shows one finding, not one per person |
| Labels are positional now: `the initiator`, `Participant A`, `Participant B` | `.label` and `.participantLabel` are still raw and must not be printed. Print `who` instead, which carries the resolved name, or "a colleague" where the check-in does not name peers |
| New column `Report.theOpening` | One or two plain sentences saying what is true across everybody. The board's summary reads this rather than slicing the report's first paragraph |
| `whatToDo[].move` can still carry a label | Two of the twenty-four reports have "**Initiator:** tell Daniel Park that..." on the lead's own board. Fix 3 did not reach this field. The engine side is being fixed; if a screen prefixes anything itself, it should not |

---

## Two defects in the client that belong to you, not to me

Found while reading the lead's board as a person on 26 September. Both are in
`client/src/components/gw/TheJudgement.tsx`, which I have deliberately not touched so it does not
conflict with your work.

**Both join pieces with a colon, which the wording rule forbids.**

`TheJudgement.tsx:102`, under "What this cannot tell you":

```tsx
<b style={{ fontWeight: 600 }}>{w.about}</b>{w.why ? `: ${w.why}` : ''}
```

A person reads "**The renewals target**: nobody said who set it." Two fragments and a colon, where
the rule asks for plain, full sentences.

`TheJudgement.tsx:121`, under "What the check-ins did not get to":

```tsx
{w.about}
{typeof w.howManyMissedIt === 'number' && `: ${w.howManyMissedIt} conversation${...} never reached it`}
```

Same shape. Both read as a table row rather than as something written for a person.

The engine can only half-fix this: I can make `about` and `why` full sentences, and I will, but as
long as the screen joins them with a colon the result is two sentences with a colon between them.
The screen should render them as two sentences, or as a sentence and a line under it.

**And one thing that is now dead rather than broken.** `BoardPage.tsx:694` passes
`table={(b as any).theTable}` to `TheJudgement`. Nothing is served in that field any more, for
anybody, so the component guards on it and the "See the counts behind this" toggle never renders.
The `table` prop and the `showTable` state can go whenever you are next in that file.

## 29 September: a plan becomes proposals, and the engine stores them (week 13, your request 6a)

**Please do not add any storage for proposals of your own.** Hafsah decided on 29 September that storing proposals is engine work. The engine has added the table, `plan_proposals` (Prisma model `PlanProposal`, migration `20260929130000_plan_proposals`), in `db2bf16c`. When you merge, apply the migration to your own local database. You only need to show the proposals and send the lead's choice back. The routes are in `a1c58f7c`.

**Who can use them:** only the person who runs the check-in. Everyone else gets 403, including a participant and an admin who only reads. A participant never sees a proposal.

**The routes**

| What the lead does | Route | Send | You get back |
| --- | --- | --- | --- |
| Pastes a plan, or picks a document | `POST /grounds/:id/plan/proposals` | `{ "text": "..." }` or `{ "documentId": "..." }` | `{ "proposals": [proposal, ...], "says": "That's 5 things to confirm. Nothing goes into Context until you do." }` Nothing is written to targets, roles, commitments or rules yet. |
| Opens "Waiting for you to confirm" | `GET /grounds/:id/plan/proposals` | nothing | `{ "proposals": [proposal, ...] }`, the ones still waiting, oldest first |
| Confirm | `POST /grounds/:id/plan/proposals/:pid/confirm` | nothing | `{ "confirmed": proposal, "wrote": { "table": "...", "id": "..." } }` Exactly one row is written. A second confirm is refused. |
| Not now | `POST /grounds/:id/plan/proposals/:pid/not-now` | nothing | the proposal, with `"status": "NOT_NOW"` |
| Edit | `PATCH /grounds/:id/plan/proposals/:pid` | `{ "says"?: "...", "fields"?: { "personName"?, "what"?, "number"?, "date"? } }` | the proposal, still waiting, with `editedAt` set. A number or date must still be in the plan's own words. |

**One proposal, as the lead reads it**

```json
{ "id": "3f1c…", "kind": "commitment",
  "says": "Samuel will call every butchery in Ikeja by Friday 10 October.",
  "fields": { "personName": "Samuel", "participantId": "p-samuel", "personOnTheCheckIn": "Samuel Okoro",
              "what": "call every butchery in Ikeja", "date": "Friday 10 October" },
  "fromThePlan": "Samuel will call every butchery in Ikeja by Friday 10 October.",
  "heading": "A commitment, from Q4 plan.pdf. It would go in commitments.",
  "landsIn": "Commitments", "from": "Q4 plan.pdf",
  "status": "PENDING", "editedAt": null }
```

- `kind` is `goal`, `role`, `commitment` or `rule`.
- `landsIn` is "Targets", "People and roles", "Commitments" or "How we work".
- `from` is the file's name, or "the plan you pasted".
- `note` is there only when a name in it is not on the check-in, for example "One name in it, Musa Bello, is not on this check-in. Add them, and this will go on too."
- Show `says` as the card's sentence and `heading` above it. Show `fromThePlan` where the prototype shows the plan's own words.

**When something is refused**, you get a 400 with a plain sentence to show as it is. For example: "That one is already confirmed.", "Musa Bello is not on this check-in yet. Add them first, then confirm this.", or "The number or the date is not in the plan's own words, so it was not changed."

**Not done yet:** when a goal is confirmed, its date is not kept, because a target has no date field. The date stays on the proposal and in its sentence.

## 29 September, evening: your requests 76 and 77

### Request 77: a person's own words are never removed

The cause was not the private-file rule. It was the engine's new filter for colleagues' hidden targets, which went through every string on Rukia's row, including her own lines. It emptied each line with "four" in it, because Juma may not see her target of 4. Fixed in `7eb0aed1`:
- A person's own words from their check-in stay for every reader. That covers `whoOwnsWhat[].items[].text` on the board, and `whatEachPersonSaid[].lines[]` in the report.
- A private file's name inside such a line is still replaced ("As a document says, four shops each by Friday.").
- An item with no words is never served, so you can drop your client-side guard whenever you like.

### Request 76: the kind of work, and each kind's records

Built in `343cf214`, `46eff9f0` and `643a245a`. **When you merge, apply the migration `20260929140000_the_kind_of_work` to your own local database.** It adds three nullable columns to `grounds` and a new table, `work_items`.

**`kindOfWork` on the board** (`GET /grounds/:id/board`) is one of these eleven names, exactly as written, or `null`: `"sales org"`, `"engineering release"`, `"support desk"`, `"distribution operations"`, `"trader training programme"`, `"founder's own check-in"`, `"asset loans"`, `"MarketView where next"`, `"MarketView Q4"`, `"a law firm matter"`, `"a government programme"`.
- It is read from the lead's words when setup is saved, and checked in code to be one of the eleven.
- The lead, or an admin of the organisation, can change it with `PATCH /grounds/:id/kind-of-work` and `{ "kind": "...", "stages": ["...", ...] }`. A later read never overwrites the lead's choice. A name that is not one of the eleven is refused with a sentence you can show as it is.

**`workRecords` on the board** is a list of sections under the switchboard's names. Each is in one of three states:

```json
{ "section": "Deal grid", "holds": "deals", "state": "filled",
  "stages": ["Contacted","Need established","Pitched","Qualified","Quoted","Won"],
  "rows": [ { "id": "w-1", "kind": "deal", "name": "Nyama Choma Palace", "stage": "Won",
              "owner": "Rukia Mwangi", "ownerParticipantId": "p-rukia", "due": null,
              "fields": { "Value": "KES 90K" }, "from": "said",
              "said": "Nyama Choma Palace paid KES 90K on 22 September, so that one is won." } ] }

{ "section": "Deal grid", "holds": "deals", "state": "none-yet", "rows": [] }

{ "section": "Forecast", "holds": "where the sales numbers are likely to end up", "state": "not-known",
  "why": "Groundwork does not keep this yet. It needs numbers from another system, such as payment records or a helpdesk." }
```

- `none-yet` means Groundwork keeps this kind of record, but none has come up yet. `not-known` means it is not something Groundwork knows. Draw them differently.
- `stages` is there only where the kind has stages. The lead's own stage names replace the defaults.
- `from` is `"said"` (read from somebody's check-in, with `said` holding their words exactly) or `"lead"` (added by the lead, with no `said`).

**Which sections each kind gets:**

| Kind | Filled from records | Served as not-known |
| --- | --- | --- |
| sales org | Deal grid: deals, with stages Contacted, Need established, Pitched, Qualified, Quoted, Won | Forecast |
| engineering release | Deal grid: releases and tasks, with stages Worked on, Written, Merged, Tested, Deployed, Used | none |
| support desk | Deal grid: tickets | Themes |
| distribution operations | Deal grid: incidents | none |
| trader training programme | Deal grid: trader groups, with stages Enrolled, Session 1, Session 2, Completed | none |
| founder's own check-in | Work plan: commitments and decisions | none |
| asset loans | Deal grid: loans and their repayments, with stages Disbursed, Repaying, Late, Repaid | none |
| MarketView where next | Themes: priorities people named | none |
| MarketView Q4 | Deal grid: subscriptions, with stages Said, Paid | Forecast |
| a law firm matter | Timeline: deadlines. Obligations: the parties | none |
| a government programme | Deal grid: counties and their projects | none |
| no kind yet | nothing | Deal grid, Forecast, Themes, Work plan, Timeline and Obligations, each saying Groundwork does not know what kind of work this is yet |

**The lead can add, change or remove a record** with `POST`, `PATCH` and `DELETE /grounds/:id/board/work-items`. Only the lead can do this, and every refusal is a plain sentence.

**Who sees which rows:** the lead and an admin see every row, with names. Where people do not see each other, a participant sees only their own rows, the lead's, and rows with nobody's name on them. Hidden targets, private file names and goals not told yet are taken out, and a person's own words in `said` stay exactly as said.

**Not built yet:** the other sections of your request 70, and records filled from another system, such as a helpdesk or payments.

## 29 September, night: patterns are switched on, with the approved names

Hafsah approved the plain pattern names (decision 52) and patterns are switched on (`19cdf9b0`). Nothing changes in where you read them: every road still goes through the same served shape, and a pattern arrives only when every rule holds (three periods, the person first, the lead later, no colleague ever sees another person's, E4 and F5 never). What you will now receive where you had nothing before:

```json
{ "id": "pd2", "participantId": "p-femi", "yours": true, "kind": "attention",
  "heading": "Others describe doing work they described as theirs",
  "whatHappened": "You described the Harbor Foods deal as your own, although Ngozi prepared the pricing.",
  "sessions": [1, 2, 3],
  "howOften": "This came up in 3 of your check-ins, in sessions 1, 2 and 3.",
  "askThem": null, "theirWords": null, "canAnswer": true,
  "whoSeesIt": "You are seeing this first. Tunde will see it too, with anything you say about it. Nothing is decided from it." }
```

- `heading` is always the approved plain name. Never show a code or any other name.
- `whatHappened` is worded for the reader: "you" for the person it is about, their first name for the lead. It can be `null`; draw nothing then.
- `kind` is `good`, `carrying` or `attention`.
- `canAnswer` is true only for the person it is about. Their answer is `POST /patterns/:id/answer` with `{ "text": "..." }`, and the lead then reads it in `theirWords`.
- For the lead, `askThem` holds one question to ask the person, and `whoSeesIt` says whether the person has answered yet.
- `participantId` is for placing it under the right person. Never join it to a name as a label beside the person (decision 11).
- A session report now shows only patterns that had reached three periods by that session.

**Coming next, for Hafsah's decision 57:** the lead marking a pattern "right", "wrong" or "not sure" after talking it through, a nudge to have the conversation, and "we talked about it". I will send the exact routes when they exist.

**One thing in your files, found by the engine's builder:** `client/src/components/gw/WhatToWorkOnNext.tsx` shows "Done well, that is: {note.role.lookingLike…}". That is a colon-joined, third-person line from the role map ("Names what they would do differently, then does it"). The engine now says the You board's version to the person as a full sentence ("One thing to try this week is to name what you would do differently, then do it."), in `api/src/modules/grounds/a-step-said-to-you.ts`, which you can reuse.

## 30 September: the lead's marks on a pattern, and "we talked about it" (Hafsah's decision 57, items 2 and 3)

Built in `beffb44f` and `6aa62f9b`. **When you merge, apply the migration `20260930010000_what_the_lead_made_of_a_pattern`** to your own local database. It adds six nullable columns to `pattern_detections`, and changes no data.

**Two routes, both only for the person who runs the check-in.** Anyone else gets 403, including the person the pattern is about. They work only once the lead may already read the pattern (the timing of decision 39).

| What the lead does | Route | Send | You get back |
| --- | --- | --- | --- |
| Marks what they made of it, after talking it through | `POST /patterns/:id/mark` | `{ "mark": "RIGHT" }`, or `"WRONG"` or `"NOT_SURE"` | the pattern, with `leadMark` set |
| Says they talked it through | `POST /patterns/:id/talked-about` | nothing | the pattern, with `talkedAbout: true`. A second press does nothing. |

**Two new fields on every served pattern:**
- `leadMark`: `"RIGHT"`, `"WRONG"`, `"NOT_SURE"` or `null`. **It is only ever set for the lead.** The person the pattern is about always gets `null`, because the mark must never read as a verdict on them. A colleague never gets the pattern at all.
- `talkedAbout`: `true` or `false`. Both the lead and the person get it. It is a plain fact, with no mark behind it.

**The nudge:** the lead's `forTheLead` list on `GET /grounds/:id/report` holds one item for each pattern they may read and have not yet talked through, for example:

```json
{ "id": "pattern-talk-pd-brian-b3",
  "decide": "Talk with Brian about “Others describe doing work they described as theirs”.",
  "why": "Brian has seen it and has not answered yet." }
```

When the person has answered, `why` gives their answer. The item goes away as soon as the lead presses "we talked about it".

Wording note: the `why` with the person's answer is being reworded, because it joins with a colon today. Show whatever sentence arrives.

## 30 September: confirming a person's role, and where a person's own role is kept (Hafsah's decision 57, item 5)

**When you merge, apply the migration `20260930020000_evidence_and_a_confirmed_role`.** It adds three nullable columns and changes no data.

**A person's own words about their role live in `User.jobTitle`.** `GroundParticipant.roleAsDescribed` is only ever the lead's private description of a person (decision 30), with one exception: the lead's own row, which holds the lead's own words. On the join page, "Your part in this" now goes to the person's own job title (`ae2b5a9e`). It used to be copied into the lead's private field.

**Two routes, for the person themselves or the lead of the check-in:**

| What happens | Route | Send | You get back |
| --- | --- | --- | --- |
| "Yes, that's right" | `POST /participants/:id/confirm-role` | nothing | `{ "id": "…", "detectedFunction": "SALES", "detectedFunctionConfirmedAt": "…" }` |
| "I'd describe it differently" | `PATCH /participants/:id` | `{ "roleAsDescribed": "Mostly sales, closing deals." }` | from the person: `{ "id": "…", "ownRoleAsGiven": "…" }`; from the lead: `{ "id": "…", "roleAsDescribed": "…" }` |

- When the person themselves sends `PATCH`, their words go to their own job title, never to the lead's field. When the lead sends it about someone else, it is the lead's private description, as before.
- Anyone else gets 404, so a stranger learns nothing.
- The person's own check-in also asks them once, in words: "It sounds like most of your work is sales. Is that right, or would you describe it differently?" Their answer is read after the check-in, so you need no screen for that part. A Context page confirm for the lead is yours to draw.

**One more field on a served pattern, for the lead only:** `secondReadNote`. It is "Two separate reads of the record found this." when both the model and the number-based rule found the pattern, and otherwise `null`. The person it is about always gets `null`.

## 30 September: what Ask Groundwork's screens need to show, so the old context chat can be switched off (decision 50)

Hafsah, 30 September: the old context chat stays on until your Ask Groundwork screens for documents and for confirming things are built, and you have confirmed live that everything works through them. Nothing in the engine switches it off before you say so in this file.

**Two routes, and one reply shape.**

| What the person does | Route | Send | You get back |
| --- | --- | --- | --- |
| Types a message | `POST /ask` | `{ "message": "…", "groundId": "…" }` (`groundId` is optional, from "About") | a reply, below |
| Presses yes or no on something said back | `POST /ask/answer` | `{ "proposalId": "…", "answer": "yes" }` or `"no"` | a reply, below |

A reply is `{ "blocks": [...], "composedBy": "model" or "rules", "lane": "…" }`. Draw the blocks in order. The ones these screens need:

- `{ "type": "text", "body": "…" }`: a paragraph. Show it as it is.
- `{ "type": "proposal", "proposalId": "…", "summary": "…" }`: something said back that waits for the person. Show `summary` as it is, with two buttons, "Yes" and "No", which call `POST /ask/answer`. Nothing is saved until "Yes". Only the newest waiting proposal can be answered; an older one returns 409 with a plain sentence, which you show.
- `{ "type": "next_step", "kind": "upload_a_document", "label": "Choose a file", "id": "<check-in id>", "context": { "groundId": "…", "label": "…" } }`: open the file picker and upload to that check-in with the upload route the Context and resources page already uses. The `id` is the check-in's own id, the same as `context.groundId`, and never the id of a session. It is offered to whoever runs the check-in chosen under "About", whether or not that person has a session of their own open, and to anyone else who has a session of their own open. The file arrives private to the person (`OWN`).

**Three things said back are not yes or no.** For these, show the text and let the person type the answer; do not draw yes and no buttons, because `POST /ask/answer` refuses them:

1. Which check-in they mean, when they run more than one and did not choose under "About". The person answers by naming one.
2. Who a document is for, after it is read from a link or uploaded. The person answers in words ("only me", "everybody on it").
3. The next question of a setup conversation ("How long should it run?"). The next message is the answer.

**What has to be visible for each thing a lead can do through Ask Groundwork.** Every one ends with a proposal, and every proposal needs its "Yes" and "No":

| The lead types, for example | Said back as | "Yes" does |
| --- | --- | --- |
| "Setting up the context for the sales check-in", then answers | "I will set this to run for 12 weeks." | sets the length, rhythm, success or target |
| A long paste of a plan or message | everything it found, as one thing to say yes to | saves all of it together |
| "decision: we will drop the pilot" (also strategy, way of working, unsettled, context note) | Shall I add "we will drop the pilot" to this check-in's context as a decision? | adds the line |
| "reword the line 'X' to 'Y'", "share the line 'X'", "make the line 'X' private", "retire the line 'X'" | the line and the change | changes the line |
| "private note about Ben: …" | Shall I keep "…" as a private note that only you can see? | keeps the note, for the lead only |
| "share the note …" | Shall I share "…" with everybody on this check-in? | shares a note about the whole check-in (never one about a person) |
| "questions for people" | the list of questions waiting, word for word | nothing; it is a list |
| "confirm the question for Ben" or "ask Ben '…' instead" | Groundwork will ask Ben, word for word, "…" in Ben's next check-in. Shall I send it? | confirms the question |
| "leave out the question for Ben" | Shall I leave out the question for Ben, "…"? | leaves it out |

**Who sees these.** Only the lead who runs the check-in, or an admin of the same organisation, reaches any of these. Anyone else who types the same words gets Ask Groundwork's ordinary answer, and nothing is said back. An admin can hear something said back, and is then refused at "Yes" for the three things that are the lead's alone (setup values, a question for a person, and confirming it). The refusal is a plain sentence in a text block; show it.

**Nothing from these conversations appears in the person's Ask Groundwork history.** The setup talk is not kept as questions. Do not expect it back from `GET /ask`.

**What to confirm live before the old chat goes, and write here when it is done:**

1. A document added through Ask Groundwork: the file picker opens, the file lands private, and what is read out of it is said back before anything from it is saved.
2. A long paste: said back as one thing, "Yes" saves it, "No" saves nothing.
3. Each row of the table above, as the lead.
4. The same messages typed as a participant: nothing is said back and nothing is saved.
5. As an admin who is not the lead: the refusal sentence shows at "Yes".

## 30 September, later the same day: a document's numbers, said back through Ask Groundwork, and what to send after an upload

The gap this closes: `DocumentsService.whatItHolds` reads a document and keeps the numbers it found on the document itself, resolved to the right person or to the whole check-in, and writes nothing - see `docs/context-chat-inventory.md`, item 3 and 4. The Context page already says this back (`theContextWeHave`, `askingAboutIt` on the upload response) and the check-in conversation already asks and saves it. Ask Groundwork now does the same third thing, through the same `POST /ask` and `POST /ask/answer` used for everything else - no new route.

**A new kind of thing said back: `document_numbers`.** It arrives as an ordinary `proposal` block, the same shape as everything else in the table above:

```json
{ "type": "proposal", "proposalId": "…", "summary": "Here is the context we have from Q4 targets.xlsx. …\n\nShall I record these numbers on this check-in?" }
```

`summary` is the exact words the Context page already shows for that document (`theContextWeHave`), with the same rule: every number says whose it is, by name, or says it is for everybody. Draw it exactly as you draw every other proposal - the text, then "Yes" and "No" through `POST /ask/answer`. "Yes" writes the numbers, with each person's own number under their name and a team number under nobody. "No" leaves the document exactly as it was - still read, still on the document, still asking the next time somebody mentions it.

**When it appears.** Either of two ways, and you do not have to tell them apart on the screen - Ask Groundwork decides:

- The person says, in the ordinary chat box, that they have just put a document in - "I added the Q4 targets sheet", "I've uploaded it" - and that document (theirs, on a check-in they are part of) still has numbers nobody has said yes to.
- The person starts to add a document through Ask Groundwork's own upload flow, and an earlier upload of theirs on that check-in is still waiting on a yes.

**What the screen should send after an upload finishes: nothing, automatically.** `whatItHolds` runs in the background after the file is stored (`readTheRestOfIt`), so `holds` is not on the row yet when the upload's own response comes back (`numbersWaiting` is always `0` at that moment, by design - see `documents.service.ts`, "AND THE TWO SLOW READS, AFTER THE ANSWER"). Sending "I've uploaded it" straight after the upload call returns will usually find nothing waiting and say nothing. The decision, so every screen does the same thing: **poll the document (or the Context page's own read) until `numbersWaiting` is greater than zero or a reasonable time has passed (the Context page already shows "still reading"), and only then send the message "I've uploaded it." to `POST /ask`.** That is the one sentence to standardise on; Ask Groundwork recognises it (and close variants - "I added it", "I attached the file") whichever of the two ways above triggered it.

**Who this reaches.** The same rule as everywhere a document's numbers may be set (`docs/context-chat-inventory.md`, item 4): only the uploader's own numbers, and a number for somebody else only when the uploader is the lead - decided when the document is read, not here, so nothing about who may set whose number changes by asking through Ask Groundwork instead of the Context page.

## 30 September, later: the suggestion threshold admin page should show a plain label, not the field name

Decision 61 sets the first threshold, support, from the start: extra support is suggested once a person has kept fewer than half of their commitments (`keptBelow: 0.5`), with at least 6 settled, kept or not (`overPeriods: 6`). `GET /admin/suggestion-thresholds` now returns both the values and a `labels` object with the plain words for each field, for example:

```json
{
  "thresholds": { "support": { "keptBelow": 0.5, "overPeriods": 6 } },
  "labels": {
    "keptBelow": "Suggest extra support when fewer than this share of commitments were kept",
    "overPeriods": "At least this many settled commitments"
  }
}
```

`overPeriods` is the API field name the admin `PATCH` already uses, and it stays exactly as it is - it is not being renamed. The admin page should show `labels.overPeriods` ("At least this many settled commitments") beside that field's value instead of the field name itself, and the same for `labels.keptBelow`. The labels are the same for every verdict (keep, reward, support, plan, exit); there is one `labels` object, not one per verdict.

## 30 September, later still: Ask Groundwork opened from inside a check-in knows which one (decision 65)

The gap this closes: opening Ask Groundwork from inside a check-in's own Context and resources page or setup used to need the lead to type the word "context" (or one of a short list of close phrasings) before the setup conversation would start. Decision 65 removes that: the screen tells Ask Groundwork which check-in it was opened from, and the setup conversation opens straight away.

**What to send.** `POST /ask`, with two extra things alongside the ordinary `message`:

```json
{ "message": "", "groundId": "g-tobi", "openedFrom": "check_in_setup" }
```

- `groundId` is the check-in's id - the same field the "About" picker already sends on an ordinary question.
- `openedFrom: "check_in_setup"` is the one recognised value. Send it only when Ask Groundwork was opened from that check-in's own Context and resources page or setup, never on an ordinary question typed from the general Ask Groundwork panel.
- `message` may be empty ("") for the very first message of that opening - Ask Groundwork reads that as "start", and opens on whatever the setup is still missing, the same way the old context chat opened with nothing typed. Every later message in the same conversation is typed normally, still sent with the same `groundId` and `openedFrom`.

**What comes back.** The ordinary Ask Groundwork reply shape (`lane`, `composedBy`, `blocks`) - nothing new to parse. `lane` will be `"add_context"`. Draw it exactly as the setup conversation's replies are already drawn: text, and a "Yes"/"No" through `POST /ask/answer` when a block is a `proposal`.

**Who this reaches.** Only somebody who may confirm setup on that check-in (decision 63): the lead who runs it, or, once the lead has left the organisation, an admin of it. Sent by anybody else - a participant, most often - `openedFrom` is quietly ignored and Ask Groundwork gives its ordinary answer to whatever was typed. There is no separate refusal to show: nothing about the reply says whether `openedFrom` was acted on, so do not build a screen that assumes it always was. If the screen only ever offers this opening from a place a participant cannot reach (the lead's own Context and resources page), this will not come up in practice.

**Everything else about the setup conversation is unchanged**: it is not kept in the person's ordinary Ask Groundwork history (`GET /ask` will not show these turns), and a concrete change is said back and waits for a "Yes" before anything is saved, exactly as the table earlier in this document describes for the "context" keyword itself.

## 30 September, evening: requests 82, 85, 86, 87, 88, 89 and 90

Everything below is on the branch `wip/plain-reports`. The commit for each is in its row in `docs/requests-to-engine.md`.

**Request 82 and decision 67: which part of "What keeps coming up" a pattern belongs in, and the coaching beside it.** Every pattern served on the board, on the check-in's own page and in a person's own record now carries three more fields.

- `about` is `"the work"` or `"what is said against what happened"`. It is the same for every reader, because it says nothing about a person. Put a pattern under "About each person's work" or under "How what people say can run ahead of what happened" by it. The second part is exactly these nine patterns and no others, as Hafsah decided (decision 67): D1, D2, D3, D5, D8, B1, B2, B3 and E2. The list is fixed in `api/src/modules/patterns/what-a-pattern-is-about.ts`. No pattern was added, removed or changed.
- `coachTowards` is what the lead coaches the person towards, the good version, in one sentence. It is for whoever runs the check-in only, and is `null` for the person it is about. Example, for B11: `"Coach them towards naming what the team itself can change when something goes wrong."` Where the person's role map pairs the behaviour with its good version, the role map's own words are used, for example in sales for K1: `"In sales and expansion, the good version is someone who spends the week in front of buyers, and does the admin around it."`
- `oneStep` is one small, concrete step the person could take this week, in one sentence, also for the lead only and `null` for the person. Example, for B11: `"One step they could take this week is to name one thing in the team's own hands the next time a problem comes up."`

Both sentences are fixed text in `api/src/modules/patterns/what-to-coach-towards.ts`, one pair for each pattern that has a plain name, so opening a board never calls a model. They carry no name; the page places them under the person the pattern is about, using `participantId`, as it already does. The lead's existing fields stay: the plain name is `heading`, the sentence about what happened is `whatHappened`, and the pattern's own question to open the conversation is `askThem`. The person reading their own pattern, a colleague and an admin who does not run the check-in never receive `coachTowards` or `oneStep`, and a colleague or such an admin receives no other person's pattern at all, as before (decisions 58 and 67). The screens decide nothing from any of this; it is wording for the lead to use in a conversation.

I found no sentence "No patterns have repeated often enough to show yet." in the engine's board text. It is only drawn on the screen, so the change to it is yours.

**Request 85: someone an admin did not let in.** Each row of `eachPerson` (and so of the lead's and the admin's "where each person is") now also carries `notLetIn` (true or false), `notLetInBy` (the decider's name, or null) and `notLetInAt`. Its `reason` is `"not let in"` (sorted last, and never shown as a label on the person) and `ask` is `null`. The row says `"Faraji Odhiambo was not let in by Juma Mwangi, so there is nobody to ask."` Nobody else receives `eachPerson`, so the decider's name goes only to whoever runs the check-in or an admin, the same rule as `GET /grounds/:id`.

**Request 87: "You" in the middle of a sentence, and "1 sessions".** The sentence is now `"In session 1, you committed to call the client. The time you gave for it was on Wednesday 30 September."` `overTime` also carries `inSessions`: `"in 1 session"`, `"in 3 sessions"`, or `null` before any session. Use it for the heading: `"What people said they would do, in 1 session"`.

**Request 88, wording.** `decisions[].owner` reads `"Nobody has been named to decide this."` where nobody is named. The "Blockers" tile of `quickRead` names the same blocker as `howItIsGoing.glance.inTheWay.oldest`. A participant's `howItIsGoing.latestSummary` opens `"People disagree on ..."` and not `"They disagree on ..."`. The `why` of a section Groundwork does not keep reads `"Groundwork does not keep this yet. It needs the ticket counts from the helpdesk itself."` for the helpdesk section and `"...such as payment records."` for a forecast.

**Request 89: who said a record.** Each row of `workRecords[].rows[]` carries `saidBy` and `saidByParticipantId`. For a record a person said, `saidBy` is their first name, for example `"Baraka"`. Where this reader may not name them it is `"a colleague"` in lower case, to sit inside "In ...'s words", and `saidByParticipantId` is `null`. Both are `null` for a record the lead added.

**Request 90: one form of number.** `howItIsGoing.latestSummary` counts in one form: `"Four of the six people have answered so far."` (words up to ten, figures after: `"12 of the 41 people have answered so far."`).

**Request 86: a question, answered in `docs/requests-to-engine.md`.** A session that has been started is now read as open on Today, in the assistant and in a guest's answer, whatever `availableFrom` still says. `availableFrom` itself is unchanged; it only says when the session was first offered.

## 30 September, night: a conversation point in the lead's judgement (decision 56, point 3)

The report's `theJudgement` can now carry `conversationPoints`, a list of plain sentences for the lead only. It is filled when the judgement rests on a goal the person has not been told about yet, for example:

"Tobi has not been told about this goal yet, so talk it through with Tobi before reading anything into it."

Draw each sentence under the judgement, as the lead reads it. The person, a colleague and an admin who only reads never receive it. The product writes it, not the model.

Also from tonight: in "What the record shows over time", the lead is now named, or is "you" when the lead reads it ("In session 3, you committed Aisha Otieno to call the client."), never "the lead".

## 30 September, late: admins and the three evaluation check-ins (request 78), coaching on the board (request 79)

**Which check-ins are a performance plan, a promotion or a renewal (request 78).** Read the check-in's `scenario`. It is one of these three exactly when it is `PIP` (a performance plan), `RECOGNITION` (a promotion) or `CONTRACT_RENEWAL` (a renewal). The list is `EVALUATION_SCENARIOS` in `api/src/modules/reports/is-this-an-evaluation-check-in.ts`, built from the same test the engine uses, so it cannot drift. Leave the admins line out of the invitation on those three.

What the server now does, so the screens need not hide anything: an admin of the organisation reads one of these three only when they run it, set it up, or take part in it. Without that they are treated as if they were not an admin of it. It is not in their list, on Today, in the roster or in the approval queue, and its page, board, report, session reports, earlier rounds, activation status, outcome and reasons answer "not found" or "not part of this check-in". An admin who set it up or runs it reads it as before. An admin who only takes part reads it as a person in it does. On every other kind of check-in an admin reads what they read today.

**Coaching on the board (request 79 b).** The board response carries `coaching`, present only when there is something for this reader:

- `coaching.yours` is the reader's own coaching note, exactly as the report serves it (the same note, about the reader only). It is there for anyone who takes part, the lead included.
- `coaching.eachPerson` is what to ask each person, the list the report gives the person who runs the check-in. It is there for the lead, and for the admin who set the check-in up for them, and for nobody else. An admin who only reads, a colleague and the person themselves get `null`.

I did not serve each person's own coaching note to the lead, because the report never does: a note written for one person is not given to their lead (the report's own comment says so). If Hafsah wants the lead to read each person's note too, that is a change to a privacy rule and is hers to decide.

**Periods (request 79 a).** `managerAlignment[].periods` is now never more than the number of answered sessions as decision 57 counts them (a daily check-in counts calendar weeks). After a single session it reads 1.

## 30 September, night: a check-in that runs until the lead ends it (request 37)

Hafsah said yes on 27 September. The engine side is done. This is exactly what the ongoing state looks like and what to send.

**The state.** One field on the check-in: `runsUntilEnded` (true or false). It is on every check-in read (the check-in itself, the list, the admin view, the API). When it is true, `timelineDays` is served as `null` (stored internally as 0, never shown), `daysLeft` and `endsOn` are `null`, `endsAt` is `null`, and the check-in is never "out of time": no warning email, no stall. Every check-in that existed before is `runsUntilEnded: false` and unchanged.

**What to send.**
- Creating a check-in (`POST /grounds`, `POST /grounds/for-lead`, and the entry commit `POST /entry/commit`): send `runsUntilEnded: true` and leave `timelineDays` and `endsAt` out. If you send both, the choice "When I end it" wins and the length and end date are ignored.
- Changing it later (`PATCH /grounds/:id`): send `{ "runsUntilEnded": true }` to make it ongoing. Send a length (`timelineDays` or `timelineWeeks`) to give it a length again; that turns `runsUntilEnded` off. A check-in that had run out of time opens again when it is made ongoing.
- The context chat: the lead can say "when I end it", "until I stop it" or "no end date". The proposal comes back as `{ kind: 'timeline', days: 0, untilEnded: true, say: "I will set this to run until you end it." }`, and after the yes the reply says "I have set this to run until you end it." The same works in Ask Groundwork's setup, which is the same chat. Once set, the chat does not ask how long it runs again, and its opening line reads "This check-in runs until you end it and people check in once a week."
- Ending it: the existing "Begin the closing session" route (`POST /grounds/:id/closing-session`) is the "End it". It works at any session of an ongoing check-in. It makes each person's next session the closing one, and no session is made after it. The report of that session is written as a closing report, the same as a check-in that reached its planned last session.

**What the screens read.**
- The session report carries `runsUntilEnded` and a ready sentence, `position`: "Session 3. It runs until you end it." For a check-in with a length it is "Session 3 of 12." and for one with no length set it is "Session 3." `plannedSessions` is `null` for an ongoing check-in. Print `position` rather than building the sentence.
- For an ongoing check-in the engine never says how many sessions there are, how far through it is, "halfway", or "the last session", in the conversation, the reports, the board, Today or the suggestions. There is no "Decide how it ends" prompt, because there is no planned last session. The only ending is the lead's.
- `howItIsGoing` has no planned rounds for an ongoing check-in. Do not draw "x of y rounds".
- The setting history on the Context page carries `untilItIsEnded` (true on the change that made it ongoing) and `weeks.to` is `null` for that change.

## 1 October: links between check-ins (your request 18)

Done. Nothing in `client/` is changed. Below is exactly where each field is and its shape.

**(a) Which check-in a handoff waits on.** `GroundDependency.waitingOnGroundId` is now written when the conversation records a handoff. It is set only when it is certain, and only in code: the words the person said for the team ("Finance") must all be in the name of exactly one other running check-in of the same organisation ("Finance, Q3"). The plain words every team name carries ("team", "review", "Q3") are set aside. Two check-ins that fit, the handoff's own check-in fitting as well, another organisation's check-in, or a person named in the same check-in all give null. A newer account that names a team updates the link; an account that names no team leaves it alone. `GET /grounds/:id/links` needed no change.

**(b) When, and where it stands.** These four fields are on every item of `GET /grounds/:id/links` (`waitingOnOtherTeams[]` and `askedOfThisCheckIn[]`) and of `askedOfYou.items[]` on `GET /you`, under the rules those already use:

| Field | Shape | What it is |
| --- | --- | --- |
| `dueSaid` | string or null | The person's own words for when, word for word ("by Friday"). Kept only if those exact words are in what they said; null if they gave no time. |
| `dueOn` | "2026-09-25" or null | The day those words meant, read in code ("Friday", "tomorrow", "30 September"). Null for "soon" or "after the audit": a day is never guessed. |
| `dueWord` | string or null | "Overdue", "Today", a short weekday through the next six days ("Fri"), or a short date ("9 Oct"). Null when `dueOn` is null. Counted in Lagos time. Use it for the due word in "Everything asked of you this week". |
| `standing` | string | One plain sentence of where it stands, written from the record. |

What a person reads in `standing`: "The Mombasa depot's count is due Friday." (a time was given; "are due" where the thing is plural, such as "The seals are due next week."), "Not decided yet." (the handoff is a decision nobody has made), or "No date has been given yet." Show it after "Asked 14 Sept." Show `dueSaid` where you want their own words.

**(c) Where the blocker started.** `GET /grounds/:id/blocker-trace`, for anybody who may open that check-in (404 otherwise). It answers `{ traces: [...] }`, one trace for each blocker that ends in this check-in, often none.

    {
      id: string,
      steps: [{ kind: 'need' | 'request' | 'question' | 'approval' | 'priority' | 'delay' | 'effect',
                checkIn: string, checkInId: string,        // the check-in it came from; open with /grounds/<checkInId>/board
                owner: string | null,                       // a name this reader may read, "You", or "a colleague"
                text: string }],                            // one full sentence
      whereItStarted: string | null,    // "Where it started: the request went to Finance without ..."
      decisionNeeded: string | null,    // "Decision needed: sign off Westgate's credit terms this week?"
      decidedBy: string | null          // "Amani Njoroge decides."
    }

Who reads what. Each reader gets only the steps from check-ins they may open (the same list as the links). Where a check-in keeps people apart, a reader who does not run it (and is not an admin) reads only the steps that are theirs. If the first step or the last step is not readable, the trace is not served at all. If any step between is hidden, the steps the reader may read are served and `whereItStarted`, `decisionNeeded` and `decidedBy` are null, because they were written from the whole chain. Nothing is ever rated or labelled; the sentences are checked for names and for words that judge a person. The prototype's "Nobody was slow on their own." is not written, because the record cannot say it. Show the steps, then the two sentences when they are there; "Ask Miriam for the references" is yours to draw from the owner of the request step.

How it is built. Stored in `blocker_traces`, without names (each step holds its check-in and a person id). Built only when a handoff is written or changes, in `ConversationService.followTheBlockersAcrossCheckIns`, never on opening. The same record again makes no second model call. The model gets the handoffs on record with people as tokens; its answer is kept only if every step cites a handoff on the record, takes its check-in and person from that handoff, shares words with it, names nobody and judges nobody, and the chain crosses two check-ins and ends where the blocker is felt. The instructions are the stored prompt `blocker_trace` (seeded on boot); the row records `promptVersionId`. Names are swapped in when it is served, for each step's own check-in, through the same wrapper every report uses.

**Also, from request 37.** A participant's session report now says "Session 3. It runs until Wairimu Kamau ends it." (the lead's name, or "the person running it" where the reader may not read a name); the lead still reads "Session 3. It runs until you end it." `POST /check-ins` on the public API takes `runsUntilEnded: true`, as the product's own create does.


## Request 17: the Company page's company-wide picture (parts a to d)

`GET /company` (the same read as before) now carries four more things. Everything is written once, when the record changes, and only read when the page opens. Until a picture has been written for the organisation, `reading` is `null` on every priority and the three lists are empty: draw nothing in their place.

### The fields

    GET /company
    {
      ...the fields you already have...,
      priorities: [{ ...,
        reading: { tag: string, says: string } | null    // (a)
      }],
      notReaching: [{ id, observation, question, forWhom }],                              // (b)
      namedByTeams: [{ id, title, touches, teams: [{ team, says }] }],                    // (c)
      saidAndShown: [{ id, area, youSaid, checkInsShow }]                                 // (d)
    }

(a) `reading.tag` is one of: "Nobody owns it yet", "Nothing is moving it yet", "At risk", "Quiet for a month", "Moving, but not enough of it", "Moving". It is about the priority and is decided in code from the record (owner, check-ins that feed it, handoffs stopping work, a date that has passed). `reading.says` is one or two full sentences, for example "1 check-in feeds this priority, and 3 were finished in the last 30 days. 1 handoff is stopping work on it." It is `null` when the reader may not open every check-in it was built from. `tag` (the old field, "Nobody owns it yet" or null) is unchanged.

(b) `notReaching` comes in this order and is written from the shape of the organisation's priorities, for example "Priority 3 has no owner and nothing underneath it." with the question "Who owns priority 3, Build a stronger organisation?" and `forWhom` "For you". The other two kinds are "The customer portal sits under no current priority." with "Which priority does The customer portal serve?" and `forWhom` "For Lina Ali, Product lead" (the owner's name and title from the roster, or "For you" when the reader is that owner), and "Open the second warehouse is still open, and its date has passed." with "Should Open the second warehouse get a new date, or be closed?". Served only to readers who may read every check-in (admins). Draw "Decide" for `forWhom` "For you" and "Ask" for anybody else.

(c) `namedByTeams[].title` is the thing in plain words ("No way for customers to order in bulk"), `touches` is "Touches priority 1 and priority 2." (or "It does not sit under any priority yet."), and each team's `says` is one sentence ("Sales raised this in 2 check-ins, with 3 open handoffs." when the model's sentence did not pass the checks). Teams come in alphabetical order and groups in order of their title, never by size. A thing is only here when at least two teams raised it. "Nobody owns it." is not written, because the record cannot say it of a thing.

(d) `saidAndShown[]`: `area` is "Priority 1", `youSaid` is the priority as the organisation wrote it in its own system (not anybody's words from a check-in), `checkInsShow` is one or two sentences such as "1 of the 4 check-ins finished in the last 30 days that belong to a priority was about this one. 1 handoff is open in them." Served only to readers who may read every check-in, and only once at least three such check-ins were finished. The prototype's examples ("6 in 10 sales visits went to small shops.") need figures the record does not hold, so they are not written.

### Who reads what

Each item keeps the ids of the check-ins it was built from (`restsOn`, never served). A reader is given an item only if they may open every one of them, by the same list of check-ins that feeds `fedBy` (their role and their access, never their title). A lead who runs the sales check-in reads the reading of the priority it feeds, and a thing that only check-ins they may open named; a member in that check-in reads the same reading. `notReaching` and `saidAndShown` are for readers who may read every check-in, so a lead or a member is given empty lists. An admin who was not given a performance plan, promotion or renewal check-in is given nothing that rests on it, and such check-ins are never read into the picture at all.

### How it is kept

Table `company_pictures`, one row per organisation, no names (an owner is held as the customer's own id and named only when served). Written by `CompanyPictureService` (`api/src/modules/grounds/the-company-picture.service.ts`) when a check-in completes, when a handoff is raised, and once a night if the priorities changed in the organisation's own system. The same record again makes no second model call and no new row. The model is given priorities with counts and open handoffs with team and check-in numbers, and no person. Its sentences are kept only if every number is on the record, nobody is named, nothing is judged or ranked, there is no quotation and nothing is copied word for word; otherwise a plain sentence is written from the counts. The instructions are the stored prompt `company_picture` (seeded on boot); the row records `promptVersionId`.

### Not built

(e) The company context picked up from check-ins is `docs/weekly-plan.md` week 20, "Memory that lasts beyond one check-in". It would be kept at the organisation's level, confirmed by a lead before it counts. (f) and (g) wait for Hafsah.


## Request 28: where each customer stands, from the sales check-ins

Nothing changes in what the board serves: `GET /suites/customers/board` still gives `standing` for each customer, and it is now the latest line the engine wrote, else the organisation's own word.

The line reads like "Quote sent. Buys in January.", "Said yes. The deposit is waiting." or "Asked to wait until the new shop opens.". Each is one or two plain full sentences about the customer. It never names a person, never says "I" or "you", carries no label or score, and holds no date or number that the person did not say.

When it is written: once, when a sales check-in completes. A sales check-in is one whose kind of work is "sales org" (the kind set at setup, which the lead can change), and is not a performance plan, a promotion or a renewal. A check-in with no kind of work is not read. It reads only the person's own words in their own check-in, never a report, never a question to Ask Groundwork, never a lead's private note. A name that matches no customer, or more than one customer, writes nothing. The same line twice in a row writes one row.

Who reads it: the same readers who are served the customer. An admin reads every customer's line. A lead reads the lines for the customers owned by their own team and themselves. A member and a guest are refused the board.

Not built: (b), "changing something here tells the person who owns the customer, in their next check-in." It waits for Hafsah.


## Request 25: the role map, the role interview, and why a job nobody owns matters

**(a) The role interview. Built.**

To send it (admins only, refused for everybody else, decided on the server):

    POST /suites/roles/interview
    { "personId": "<the person's externalId>" }              // to one person, for each role they hold
    { "personId": "<externalId>", "roleName": "Sales rep" }  // to one person, for this role
    { "roleName": "Sales rep" }                              // to everyone who holds that role

It answers `{ sent: [{ personId, name, roleName }], notSent: [{ name, why }] }`. `why` is a plain sentence, for example "Aisha Otieno has not signed in yet, so there is nowhere to ask them." or "Miriam Wanjiku already has the role interview waiting for Sales rep.". A refusal is one plain sentence too ("Say which person, or which role, the role interview is for."). Nothing is emailed: the interview waits for the person in Ask Groundwork.

What the person reads in Ask Groundwork, when they say "start": "What do you own in your job as Sales rep? Tell me in your own words, for example "the sales target and the sales team"." Then "What do you decide yourself, without asking anybody first?", then "Who do you depend on to do your job?", then "And who depends on you to do theirs?". Then all four are said back, in quotation marks, exactly as typed except that the first letter of a plain word loses its capital and a name keeps it: "You said you own "my own customers and their deals", you decide "what discount I give up to 10 percent", you depend on "the Sales lead and Operations for stock", and "the customers I sign, for their first delivery" depend on you. Shall I save this for the role map?" (with a Yes and No on it, through `POST /ask/answer`). Only a yes writes one `role_interview_answers` row, with the person's words exactly as typed. A no writes nothing and offers to start again. If they ask something else first, it is answered, and once they are told the interview is waiting: "Your admin has asked you four short questions about your job as Sales rep, so that the role map can show what the job owns. It is about the job and not about you, and nobody is marked on it. Say "start" when you are ready, or "not now" if you would rather not."

After a yes: "I have saved this for the role map. It shows what the Sales rep job owns. It is about the job and not about you."

No model words any of this, so `promptVersionId` on the row is empty. Who reads the answers: an admin, on the role map (`owns` for each role, as before), and the person themselves at `GET /suites/roles/interview/mine` (`{ answers: [{ roleName, owns, decides, dependsOn, dependedOnBy, createdAt }] }`). A colleague and a lead who is not an admin read none of it. Nothing is read into any check-in's report.

**(b) Why a job nobody owns matters. Built.**

`nobody[].why` on `GET /suites/roles/board` is now filled. It is written once when a check-in completes or a handoff is raised (and looked at once a night), never when the map is opened. It is built from a handoff a person raised in a check-in that waits on a role nobody holds, such as "Stock planning". It reads "That is why Kwame Mensah has been waiting three weeks for freezers." while the wait is open, and "That is why Kwame Mensah waited three weeks for freezers." once it has ended. The wait is at least one week, and the note is about the longest one for the role. It is stored with the check-in's label ("Participant A"), never a name, and the name goes in only when an admin who may open that check-in reads the map, through the wrapper reports use. If the name would not be theirs to see, or they may not open the check-in (a performance plan, a promotion or a renewal they do not run), `why` is `null` rather than a placeholder. It is checked in code: only numbers from the record, no name, no label, no score, no ranking. It is never built from a private report or from questions to Ask Groundwork.

Schema: `role_gap_notes` gained `ground_id` and `input_key` (migration `20261001150000_role_gap_notes_rest_on_a_check_in`). No field on the map changed shape.


## 1 October: the switchboard's 22 sections

Your request 70. Before building anything, I read what the board and the reports serve today against each of the 22 sections. "Calls for it" is the number of the 24 situations that switch the section on or make it optional (`switchboardSectionsNotServed` in `what-the-switchboard-allows.ts`). The purple twelve are called for by four situations only: "Help a new hire get started", "Check in before a renewal", "Help someone get back on track" and "Get a project back on track" (the new hire and the renewal also carry most of them).

"Served already" means the content is on the board under another field today, for the readers named. "Not served" means nothing carries it, and the last column says whether I build it, or why I serve nothing.

| Section | Calls for it | State | Where, or what is missing |
| --- | --- | --- | --- |
| Lead actions | 22 | Built (second pass) as `leadActions`. Also served | `theJudgement.whatToDo` (what to do and why, the lead only), `decisions` (what needs deciding, and who decides), `toLookAt` and `eachPersonToday[].conversationPoints` (what has stayed the same, and what to talk through, the lead only). |
| Risks | 18 | Not served. Built. | Nothing gathers "what could go wrong". Built from the record, in plain sentences, with the facts behind each one. |
| Work plan | 13 | Partly served. Built. | `whoOwnsWhat` has each person's commitments with no date and no state. `overTime.commitments` has the date and the state, for the lead only. `workRecords` has it for the founder's own check-in only. Built as `workPlan` for each reader under their own wall. |
| Deal grid | 11 | Served already | `workRecords`, the section named "Deal grid", by the check-in's kind of work (request 76): sales org, engineering release, support desk, distribution operations, trader training programme, asset loans, MarketView Q4, a government programme. Served as `none-yet` when nothing has been recorded and as `not-known` when the kind is not set. |
| Coaching | 10 | Served already | `coaching` (`yours` and `eachPerson`), request 79 b. |
| Themes | 9 | Served already | `whatTheRoomIsAbout` (aims, places and things, each with who named it, nothing dropped), `whatTheAnswersSay` (the network read, where enough accounts came in) and, for MarketView where next, `workRecords` "Themes". For support desk it is served as not known, because the helpdesk's own counts are not in the record. |
| Obligations | 6 | Built (second pass) as `obligations` | A law firm matter's parties are in `workRecords` "Obligations". For the others, what each person promised is `workPlan` (built here) and what each waits on is `dependencies`. What a contract's own clauses require is not in the record (the record holds what people said, not the document), so that is not served. |
| Timeline | 5 | Not served. Built. | `phaseSpine` has the sessions and their dates only, and a law firm's deadlines are in `workRecords`. Nothing puts what happened in order. Built as `timeline`. |
| Person history | 5 | Not served. Built. | Built as `personHistory`, one person's record session by session, facts only, to the lead and to the person themselves. |
| Forecast | 5 | Built (second pass) as `forecast`, for Hafsah to confirm | A team's number only, the pace so far carried forward in a straight line; see below. Before that: the record holds no projected figure. `objectives[].journey` says where a number started, where it is and what was aimed for, and `eachPerson` says whether the pace is behind. Neither is a forecast, and I will not invent one. `workRecords` already serves "Forecast" as `not-known` for sales org and MarketView Q4, with the reason. |
| Blocker check | 4 | Not served. Built. | Built as `blockerCheck`: for each open handoff, whether it names a person, whether the person said what they had tried, and whether a time was given. |
| Evidence index | 4 | Not served. Built. | Built as `evidenceIndex`: every line on the board that a document proves or a colleague confirmed, with whose it is and the session. |
| Busy or moving | 4 | Not served. Built. | Built as `busyOrMoving`: counts from the record, for the lead only, never a label. |
| Where the time went | 4 | Not served. Nothing built. | The record holds no record of how anybody's time was spent, only what they said they would do. Anything I wrote here would be a guess. |
| Requirements review | 3 | Served already | `overTime.gaps` (what the role was said to be, against what the record holds; the lead only), `startingState` and `objectives`. |
| Actions and their results | 4 | Served already | `overTime.commitments` (the lead only) with the state and how it was settled. `workPlan` (built here) gives each other reader their own. |
| The other side | 4 | Served already | `divergence.items`, `divergence.agreements`, `whoOwnsWhat` and `managerAlignment`. |
| Who waited on whom | 4 | Built (second pass) as `whoWaitedOnWhom`, with dates. Also served | `dependencies` on the board, `GET /grounds/:id/links` (`dueSaid`, `dueOn`, `standing`), `GET /grounds/:id/blocker-trace`, and `overTime.dependencies` (sessions waiting, whether anybody went back). |
| Commitments followed over time | 4 | Served already | `overTime.commitments` (said in which session, said again in which, how it ended), the lead only. |
| Pattern history | 4 | Served already | `patterns[].sessions` and `patterns[].howOften`, under `who-reads-a-pattern.ts`, and `overTime.patterns` for the lead. |
| Contradictions | 4 | Served, and built (second pass) | `divergence.items` (where two people said different things), and `contradictions` (where one person's own record says two things about a commitment). |
| Questions for the lead | 4 | Built (second pass) as `questionsForTheLead`. Also served | `overTime.toSettleFirst` (the lead only), `decisions`, `coaching.eachPerson` (what to ask each person) and `eachPersonToday[].conversationPoints`, for the lead only. |

Built in this pass, in order of how many situations call for them: Risks, Work plan, Timeline, Person history, then Blocker check, Evidence index and Busy or moving (four each).

### What is served now (request 70), and what is left

Seven sections are new on `GET /grounds/:id/board`. Each is a top-level field, served only when it has something in it (the field is absent, never an empty list), built from rows the record already holds, with no model and nothing written, so opening the board never changes it. They are served on every board that renders, whatever the family, because the switchboard (your table) decides which a situation draws.

Who reads what, for all seven. The person who runs the check-in, and the admin who set it up, read everyone's. An admin of the organisation reads everyone's on a check-in that is not an evaluation, as they read every other row on the board. On an evaluation check-in (a performance plan, a renewal, a promotion) any other admin has no access to the board at all, as before. Everybody else reads their own rows, the lead's, and (only where people see each other, and never on an evaluation check-in) rows with nobody's name on them. A person they may not name is "a colleague". A handoff is read only by someone in it, where people do not see each other.

| Field | Shape | One real line, as a reader is served it |
| --- | --- | --- |
| `risks` | `[{ id, says, because }]`, at most 10 | says: "Rukia Mwangi cannot move on the credit terms until it comes from Finance." because: "It was first said on 3 September. About what has been tried, Rukia Mwangi said, "I emailed twice." The time given for it was "by Friday"." |
| `workPlan` | `[{ id, participantId, who, says, when, state: 'open' \| 'done' \| 'not done' \| 'dropped', statedInSession }]`, open first | "In session 1, Rukia Mwangi committed to send the Westgate quote. The time Rukia Mwangi gave for it was by Friday. Nobody has said yet whether it happened." (Rukia reads "In session 1, you committed to send the Westgate quote." It is the sentence the report writes for the same commitment.) |
| `timeline` | `[{ on: '2026-09-10', says }]`, oldest first, newest 40. `on` is the day for ordering; `says` starts with the day in words | "On 10 September, Baraka Otieno's commitment to call the Kisumu depot was marked done." |
| `personHistory` | `[{ participantId, who, says, sessions: [{ n, on, says }] }]` | For whoever runs the check-in: "Rukia Mwangi has answered 2 sessions and made 3 commitments." and, for session 1, "In session 1, Rukia Mwangi made 1 commitment and named 1 thing the work was waiting on." How many were kept is the person's own (decision 24), so only they read the tally: "You have answered 2 sessions and made 3 commitments. 1 is done, 1 is not done or dropped, and 1 is still open." A person reads only their own; whoever runs the check-in reads each person who has answered, without a tally of kept against not kept. |
| `blockerCheck` | `[{ id, who, says, namesWhoHoldsIt, saidWhatWasTried, timeGiven, checks: [sentence x 3] }]`, open waits only | checks: "Finance holds it.", "About what has been tried, Rukia Mwangi said, "I emailed twice." (or "Nobody has said what has been tried.")", "No time has been given for it." |
| `evidenceIndex` | `[{ id, participantId, who, said, backedBy, sessionNumber }]` | said (word for word): "We paid out KES 90K to the Nyama Choma Palace account." backedBy: "A document Rukia Mwangi added shows this." or "The colleague who received this work confirmed it." Only lines somebody has not disputed, and only for those whose words the reader may read. |
| `busyOrMoving` | `{ eachPerson: [{ participantId, who, says }], cannotTellYou }`, whoever runs the check-in only | "Rukia Mwangi has made 3 commitments across 2 answered sessions. Rukia Mwangi also named 2 things the work was waiting on." There is no count of how many were kept or cleared, because that is the person's own. cannotTellYou: "These are counts of what people said and what came of it. The record does not show how hard anybody worked, or whether the work itself moved, so nothing here says that." |

No section rates, scores or labels a person, and each test checks that the words "score", "rating", "at risk", "slow", "busy", "behind" and the like are not in what is served. The `said` line of `evidenceIndex` is on the list of a person's own words, so the hidden-target rule leaves it as they said it.

Code: `api/src/modules/board/the-switchboards-own-sections.ts` (the builders) and one block in `board.service.ts`. Tests, each read as Amina who runs it, Rukia, Baraka, an admin who only reads, the admin who set up an evaluation check-in, and an admin with no access to it: `risks-on-the-board-as-each-reader-reads-them.spec.ts`, `a-work-plan-on-the-board-as-each-reader-reads-it.spec.ts`, `a-timeline-on-the-board-as-each-reader-reads-it.spec.ts`, `a-person-history-on-the-board-as-each-reader-reads-it.spec.ts`, `a-blocker-check-on-the-board-as-each-reader-reads-it.spec.ts`, `an-evidence-index-on-the-board-as-each-reader-reads-it.spec.ts`, `busy-or-moving-on-the-board-as-each-reader-reads-it.spec.ts`.

For the screens. Thirteen of the 22 needed no new field, and are in the table above under "Served already" with the field to map each to (`G2_SECTION_TO_BOARD_SECTION` can now point Work plan to `workPlan`, Timeline to `timeline`, Person history to `personHistory`, Risks to `risks`, Blocker check to `blockerCheck`, Evidence index to `evidenceIndex`, Busy or moving to `busyOrMoving`, Coaching to `coaching`, Lead actions to `theJudgement.whatToDo`, Deal grid, Obligations and Themes to `workRecords`, Themes also to `whatTheRoomIsAbout`, The other side and Contradictions to `divergence`, Who waited on whom to `dependencies`, Commitments followed over time and Requirements review to `overTime`, Pattern history to `patterns`, Questions for the lead to `decisions`).

Left, and why (first pass; see the second pass below, which serves a forecast for a team's number). Forecast: the record holds no projected figure, so nothing is served (the work-record section still says "not known" for sales org and MarketView Q4). Where the time went: the record does not hold how anybody's time was spent, so nothing is served. Contradictions inside one person's own answers across sessions, and a contract's own clauses for Obligations: not in the record, not served. `overTime` is still served to the lead only, so the lead's Commitments followed over time, Actions and their results and Requirements review read from it; the other readers get their own commitments in `workPlan`.

### The rest of the switchboard's sections (request 70, second pass, 1 October)

Each section below is a new top-level field on `GET /grounds/:id/board`, built the same way as the seven above: from rows the record already holds, with no model and nothing written, so opening the board never changes it, and absent (never an empty list) when there is nothing in it. The readers are the same as above unless a section says otherwise.

#### Lead actions: `leadActions`

`[{ id, says, because }]`, at most 10. What the person who runs the check-in needs to do, from the record: somebody waiting on the lead, a wait nobody was named to provide, a goal the lead set for somebody and has not told them about (decision 56), and what the lead committed to that nobody has said happened. `because` is the facts behind it, or null when `says` already holds them.

Who reads it. Whoever runs the check-in: the lead reads "You"; the admin who set it up, and an admin of the organisation on a check-in that is not an evaluation, read the lead's name. The untold goal is the lead's own private note, so only the lead reads that line, and never the goal's words or number. A participant, and the person reviewed on an evaluation check-in, read no lead actions at all. An admin with no access to an evaluation check-in reads no board.

What Bisi (the lead, sales run) reads:

- "You need to get back to Kwame Mensah, who is waiting on you for the approval of five applications." because: "It was first said on 16 September. Nobody has said what has been tried. No time has been given for it."
- "You need to find out who can provide the bank statements Femi Okonkwo is waiting for, because nobody has been named yet."
- "You need to talk Kwame Mensah through a goal you set for this work, because Kwame Mensah has not been told about it yet." because: "The goal still counts, and Groundwork will not tell its number until it has been talked through."
- "In session 2, you said, "I'll follow up directly with the committee members." Nobody has said yet whether it happened."

What an admin who reads it reads: "Bisi Adeyemi needs to get back to Kwame Mensah, who is waiting on Bisi Adeyemi for the approval of five applications."

Test: `lead-actions-on-the-board-as-each-reader-reads-them.spec.ts`.

#### Obligations: `obligations`

`[{ participantId, who, promised: [sentence], othersWaitFor: [sentence] }]`. What each side promised, and what somebody here is still waiting on that side for. One side per person in the order of the check-in, then each party outside it that somebody is waiting on (`participantId: null`, `who` is the name they were given, for example "Mr. Adebayo"). `promised` holds the work plan's own sentences for that person, so it is under the work plan's wall; `othersWaitFor` holds the open waits the reader may read. A side with nothing in it is left out. What a contract's own clauses require is still not in the record, so it is not served.

Who reads it. Whoever runs the check-in, the admin who set it up, and an admin of the organisation on an ordinary check-in read every side. A participant where people see each other reads every side; where they do not, only their own side and the lead's, and only the waits they are in. The person reviewed on an evaluation check-in reads their own side and the lead's side without the lead's promises.

What Bisi reads, for her own side: promised "In session 2, you said, "I'll follow up directly with the committee members." Nobody has said yet whether it happened." and othersWaitFor "Kwame Mensah is waiting on you for the approval of five applications." For the party outside: "Ngozi Eze is waiting on Mr. Adebayo for a date for the credit decision." Kwame, where people do not see each other, reads on Bisi's side "You are waiting on Bisi Adeyemi for the approval of five applications."

Test: `obligations-on-the-board-as-each-reader-reads-them.spec.ts`.

#### Forecast: `forecast` (decided for Hafsah to confirm)

`[{ objectiveId, about, says, restsOn, cannotTellYou }]`. Where a team's number would be by the last session if it keeps the pace the record shows, carried forward in a straight line from the counts stored when each session closed. `about` is the sentence the board already serves for that target, so the screens can draw `says` under it. The earlier answer said nothing would be served; the prototype's board does show a forecast, so this is the closest thing the record can honestly give, and it is listed for Hafsah to confirm.

When it is served. Only for a target with a number and no owner: a target that belongs to one person is never forecast, because the prototype says a forecast about one person reads like a judgement on them. Only with two sessions counted, and only while the check-in still runs past the last count. Never on an evaluation check-in (a performance plan, a promotion, a renewal). It is built from the targets this reader is already served, so `targetsFor`, an untold goal (decision 56), the lead's direction (decision 69) and the word guess where none is set all hold.

Who reads it. It says the aim or the limit, so it follows decision 73, as the weekly report does: whoever runs the check-in and the admin who set it up read it; a person in it reads it only where the check-in's "who sees targets" is everybody; an admin who only reads keeps the counts alone and reads no forecast.

What Bisi reads, for "The team is aiming for 40 approved facilities this quarter.": "If it keeps moving at the pace it has since session 1, it would be about 21 by session 4, against an aim of 40." restsOn: "It was 6 in session 1 and 11 in session 2, and this check-in runs for 4 sessions." cannotTellYou: "This carries the pace so far forward in a straight line. It is not a promise, and anything that changes the pace changes where it ends." Where the number has not moved: "It has not moved since session 1, so if nothing changes it would still be 2 by session 4, against a limit of 5."

Test: `a-forecast-on-the-board-as-each-reader-reads-it.spec.ts`.

#### Who waited on whom: `whoWaitedOnWhom`

`[{ id, says, startedAt, clearedAt, days }]`, oldest first. The prototype's "Dependency ledger": every wait in the record, open or cleared, with the day it was first said (`startedAt`, "2026-09-02"), the day it was cleared (`clearedAt`, or null), and the whole days it took (`days`, only once cleared). Nothing counts from today, so opening the board never changes it. `dependencies` is unchanged and still has no dates.

Who reads it. The same as every other wait on the board: whoever runs the check-in, the admin who set it up, and an admin on an ordinary check-in read every wait; a participant where people do not see each other, and the person reviewed on an evaluation check-in, read only the waits they are in; a wait the lead raised that names somebody stays the lead's.

What Bisi reads: "Ngozi Eze waited on the Head of Credit for the Head of Credit's reply from 2 September until it was cleared on 16 September, 14 days in all." and "Kwame Mensah has been waiting on you for the approval of five applications since 16 September, and it has not been cleared." Ngozi reads "You waited on the Head of Credit for ..." and "You have been waiting on Mr. Adebayo for a date for the credit decision since 16 September, and it has not been cleared."

Test: `who-waited-on-whom-on-the-board-as-each-reader-reads-it.spec.ts`.

#### Contradictions: `contradictions`

`[{ id, commitmentId, participantId, who, says }]`. Where one person's own record says two different things: a commitment marked done, not done or dropped in one session, and said again in a later session as something still to do. Where two people said different things, it stays in `divergence` (unchanged), so the screens draw both under "Contradictions". The commitment is quoted only where its stored text is a passage of what the person typed, as the work plan quotes it.

Who reads it. The work plan's wall: whoever runs the check-in, the admin who set it up, and an admin on an ordinary check-in read everyone's; a person reads their own, and a colleague's only where people see each other and it is not an evaluation check-in.

What Bisi reads: "Kwame Mensah's commitment, "I'll be following up with each client directly over the next week to chase down the missing documents", was marked done in session 1, and in session 2 Kwame Mensah said it again as something still to do." Kwame reads "Your commitment, "...", was marked done in session 1, and in session 2 you said it again as something still to do."

Test: `contradictions-on-the-board-as-each-reader-reads-them.spec.ts`.

#### Questions for the lead: `questionsForTheLead`

`[{ id, question, because }]`, at most 10. Questions, never conclusions, each built from rows so the same facts ask the same questions: a commitment said in three sessions or more with nobody saying whether it happened, a commitment the record says two things about (see Contradictions), a wait on somebody in the check-in nobody has gone back about, and a wait on somebody outside it nobody has chased. What the lead needs to do themselves is in `leadActions`, not here. `overTime.toSettleFirst` (the report's own list, the lead only) is unchanged.

Who reads it. Whoever runs the check-in, the admin who set it up, and an admin on an ordinary check-in. Nobody taking part, and never the person reviewed. The lead reads "only you can find out"; anybody else reads the lead's name.

What Bisi reads:

- "Has Femi Okonkwo's commitment, "I will call them again", happened, or is it still wanted?" because: "Femi Okonkwo said it in sessions 1, 2 and 3, and nobody has said whether it happened."
- "Is Kwame Mensah's commitment, "I'll be following up with each client directly over the next week to chase down the missing documents", done, or still to do?" because: the contradiction's own sentence.
- "Has anybody gone back to Ngozi Eze about the Head of Credit's contact, which Femi Okonkwo is waiting for?" because: "Nothing on record says anybody has, so only you can find out whether it was raised outside the check-in."
- "What has been tried to get a date for the credit decision from Mr. Adebayo, which Ngozi Eze is waiting for?" because: "Nothing on record says anybody has chased it, so only you can find out what was done outside the check-in."

Test: `questions-for-the-lead-on-the-board-as-each-reader-reads-them.spec.ts`.

#### What is left after the second pass, and where each is served

No new field, because the board already serves each one, and a second copy would be a second place for a wall to be forgotten:

| Section | Field to draw it from |
| --- | --- |
| Deal grid | `workRecords`, the section named "Deal grid" (request 76). |
| Coaching | `coaching` (`yours` and `eachPerson`). |
| Themes | `whatTheRoomIsAbout`, `whatTheAnswersSay`, and `workRecords` "Themes" where the kind of work has one. |
| Pattern history | `patterns[].sessions` and `patterns[].howOften`, under who-reads-a-pattern. |
| The other side | `divergence.items` (each side's `positions`), `divergence.agreements` and `managerAlignment`. |
| Commitments followed over time | `workPlan` for every reader (said in which session, said again in which, how it ended), and `overTime.commitments` for the lead. |
| Actions and their results (the prototype's "Behaviour to result") | `workPlan` rows whose `state` is not `open`: what was committed to, and how it was settled (by the person's word, a document, or the colleague who received it). |
| Requirements review | `objectives[].journey.say` (each target against what the record holds, for whoever may read the target) and `overTime.gaps` (the role as written against what the record holds, the lead only, because the role is written in the lead's own words). |

Not served, because the record does not hold it. Where the time went: nothing records how anybody's time was spent, only what they said they would do, so anything here would be a guess. A contract's own clauses (for Obligations): the record holds what people said, not the document's terms.

## Week 11: the ending page's suggestion, signals and questions, and reviews that fall due from inside the product

### The ending page (`GET /grounds/:groundId/resolution`)

The read the ending page already makes now also carries `theEndingPage`. It is built on the server for whoever is reading, after the read has refused anybody who may not read the check-in (an admin without access to a performance plan, a promotion or a renewal still gets "You are not part of this check-in." and nothing else).

| Field | Who reads it | Shape |
| --- | --- | --- |
| `theEndingPage.reader` | everybody | `'lead'`, `'person'` or `'admin'` |
| `theEndingPage.suggestions` | the lead only, and only once the person has had their turn (decision 53) | The week-10 `ForTheLead` shape: `id`, `aboutName`, `headline`, `why`, `whatWouldChangeIt`, `theirOwnAnswer`, `ifYouAgree`, `otherChoices`, `decision`, `mayChangeTheDecision`, `conversationPoints`. No count, no verdict. Decide with `POST /suggestions/:id/decision`. |
| `theEndingPage.aboutYou` | the person, and a colleague only for what is about them | The week-10 `ForThePerson` shape: `facts` (their own count, theirs alone), `whatWouldChangeIt`, `decision` with `reasons`, `yourSide`, `mayAppeal`. Never the headline, the lead's why, or the verdict. |
| `theEndingPage.appealed` | an admin | Suggestions only once appealed (`ForAnAdmin`). |
| `theEndingPage.signals` | the lead, the admin who set the check-in up, and each person for their own | `[{ id, participantId, yours, heading, whatHappened, howOften, theirWords, whoSeesIt }]`. The same rule as every other pattern (three check-ins, the person first, never every admin). A person is an id for you to place, never joined to a name. |
| `theEndingPage.questions` | the lead only | `[{ aboutName, question }]`. |

What a lead reads, for a person the suggestion was reached for:

- "Groundwork suggests extra support for Kwame"
- Why: "In the last four weeks, Kwame has kept fewer of the commitments made in this check-in than Groundwork looks for."
- What would change it: "If Kwame keeps more of the commitments made in this check-in over the next four weeks."
- Questions: "Were Kwame's goals clear enough from the first day?" and "Is there something Kwame needed from you or from the team that has not been given yet?"
- `theirOwnAnswer` is now always `null`: the lead reads the person's answer as `theirSide` (changed 1 October; it used to be the last thing they typed in a check-in, mostly a goodbye). Draw "Kwame's side" when there is one.

What the person reads: "In the last four weeks, you kept two of your eight commitments in this check-in. When fewer than half are kept, Groundwork suggests extra help to Wairimu." and "What would change this: Keeping at least half of your commitments in this check-in over the next four weeks.", and, once decided, the decision with its reasons.

Suggestions exist only on a performance plan, a recognition or a contract renewal (decision 6, clarified 29 September; the same list as the reading rule). On any other check-in, including a first 90 days, `suggestions`, `aboutYou` and `appealed` are always empty, and the You board, reviews and appeals list leave them out (changed 1 October).

Until the threshold in decision 61 is crossed (fewer than half kept, at least 6 settled), there is no suggestion, so `suggestions` and `aboutYou` are empty lists, and the page should draw nothing for them rather than a line saying nothing was found.

### Reviews (`/suites/reviews`)

- `GET` the board: each `next[]` row now has `proposal`, a sentence when Groundwork proposed the review itself, else `null`. "Groundwork suggests a review for Kwame, because a check-in about Kwame's work has ended. Nothing is sent to Kwame unless you say yes." or "Groundwork suggests a review for Kwame, because your organisation asked for reviews on a regular date and this is the next one. Nothing is sent to Kwame unless you say yes." Show it beside "Start it". `mayStart` is unchanged: only whoever writes the review with the person may say yes.
- `POST` start is unchanged, and is the only thing that starts a review. Nothing starts one on its own, and nothing is sent to the person before it.
- One review: the writer's shape has `suggestion`, the week-10 lead shape for that person on a check-in the writer runs (or `null`). `noticed` is now written from the record when the writer says yes: "Wairimu decided on “Extend evaluation period” at the end of “Kwame, first 90 days” on 20 September 2026, and said why, “He needs another month on the supermarket accounts”." All marked `proven`. No rating, no label, no count of what was kept. A line from an evaluation check-in is read by the writer and the person only.

### The four marks on every line of the reports (request 2, week 6b, decision 43)

Every line a lead reads in a report now carries one of the four marks, decided by the product from the record lines behind it and never by the model. The wording is the prototype's: "Proven", "Confirmed by the person who received it", "Only someone’s word", "From memory only". Each mark is served as two fields, the machine word and the words to print: `mark: 'proven' | 'confirmed' | 'said' | 'memory'` and `markSays`.

A line the model wrote is tied to the record lines it restates (at least two of a record line's own key words, and three quarters of them). It takes the mark of those lines. When several stand behind it and they are not all known the same way, it takes the weakest, in the order proven, confirmed, only someone's word, from memory. It then also carries `marksBehind` (the different marks, strongest first) and `markNote`: "This line rests on more than one thing people said, and they are not all known in the same way. It carries the mark of the one that is known least well." When no record line stands behind it, the mark is `said`, "Only someone’s word". A finding is marked from that person's own lines only. The marks never name a file, never say who said a line and never say how anybody's answers were rated.

The older figure-only marks are kept. Where a line carries a figure, `figureIs` ("their estimate" or "from memory") is still there, and the line also reads `memory`.

| Where | Field |
| --- | --- |
| Team report `GET /grounds/:id/report`, the shared picture | `sharedPictureLines: [{ text, mark, markSays, marksBehind?, markNote?, figureIs? }]`, one per sentence. `sharedPicture` itself is unchanged. |
| Team report, agreements | `agreementMarks`, one per agreement, in the same order as `agreements` (which stay plain strings). |
| Team report, differences (lead and admin, as before) | each item in `divergences` carries `mark`, `markSays` and the rest; each side in `positions` carries them for what that person said; `evidenceMarks` is in the same order as `evidence`. |
| Team report, findings | each item in `findings` carries `mark` and `markSays` (only the reader's own for a participant, as before). |
| Team report, lines from the record | `myRows[]` and `whatTheGroundCanTellYou.whatTheRecordHolds[]` now also carry `markSays`. |
| Session report | each item in a section carries `markSays` beside `mark`; `whatEachPersonSaid[].lineMarksSay` goes with `lineMarks`; `whereThingsStand.settledMarks` and `openMarks` go with `settled` and `open`; each `openWithReasons[]` item carries `mark`, `markSays`, each of its `positions` carries them, and `restsOnMarks` goes with `restsOn`. |
| Board | `divergence.items[]` carry the same marks as the report; `divergence.agreementMarks`, `divergence.settledMarks`, `divergence.stillOpenMarks`; `eachPerson[].findingMark`, `findingMarkSays` (and `findingMarkNote` when they differ); `whoOwnsWhat[].items[]` now also carry `markSays`. |

When they are worked out. When the report is built from the record, and stored with it. Opening a report or a board reads what was stored and asks nothing. A report stored before this change has no marks on its model-written lines, and those lines simply carry none: the screens draw nothing when the field is absent. They fill in the next time something new comes in and the report is built again. A closed round's kept lines carry none either, because they were kept as they were.

Code: `api/src/modules/reports/the-mark-on-every-line.ts`, written at the synthesis write in `reports.service.ts` and attached at `asItWasShared`, the door every report and board read goes through. Tests: `the-mark-on-every-line.spec.ts`.

## Request 9, part (d): the weekly report's sentence about each person (1 October 2026, week 12b)

The engine now serves one part of the weekly report: what this week shows about each person, in one plain sentence each. The rest of the weekly report (the numbers, the three-in-a-row things, what changed, what to do next week) is still to come, so the screens should draw only this part for now.

`GET /grounds/:groundId/report/week` returns:

```
{ weekStart: "2026-09-21" | null,      // the Monday, in Lagos
  builtAt: date | null,
  saying?: string,                      // said when there is nothing to show, for example "No check-in has come in this week yet, so there is nothing to say yet about what people named."
  eachPerson: [{ who: string, isYou: boolean, says: string }] }
```

Who reads what. Whoever runs the check-in (and an admin of the organisation, on an ordinary check-in) reads every sentence, with names. A person in the check-in reads only the sentence about themselves, written to them ("You named Green Mart this week, and gave a next step and a date."), and never another person's. An admin who was not given access to a performance plan, a promotion or a renewal, and anybody outside the organisation, get the usual "Check-in not found". Nothing is ever said about how anybody's answers were rated.

What it says, written from what people named (a customer or company, a date, a next step, a document behind it), never from a rating:
- "Aisha named Green Mart and Nyama Choma Palace this week, and gave a next step and a date."
- "Baraka named Mama Fresh this week, but gave no next step or date, so it is not yet clear what happens next."
- "Baraka gave a date this week, but named no customer, so it is not yet clear who it is for."
- "Baraka's account named no customer, date or next step this week, so there is nothing yet to follow up on."
- "Baraka has not checked in this week, so there is nothing here yet about what Baraka is working on."

There is one sentence per person and no sentence compares two people, so the screens should list them as they come and never group, sort or rank them. The prototype's "Aisha and Miriam consistently get to..." cannot be said from one week, so the engine does not say "consistently".

When it is worked out. When a check-in comes in, and stored without names (by the report's labels; names go in when it is served). Opening the page builds nothing. The product writes the sentence from the record, so no model and no prompt version are involved.

Code: `api/src/modules/reports/the-weekly-sentence-about-each-person.ts`, `the-weekly-report.service.ts`, `the-weekly-report.controller.ts`. Tests: `the-weekly-sentence-about-each-person.spec.ts`.

## Week 17: Ask Groundwork answers "What should I do next?", "What did Femi say last week?", and says where every answer came from

### A new block, `source`

Every reply is still `{ blocks, composedBy, lane }`. There is one new block type, `source`, which is a link-like block saying which record an answer was built from:

```
{ "type": "source",
  "label": "Femi's check-in of 24 September on Sales team, Q3",
  "says": "This is from Femi's check-in of 24 September on Sales team, Q3.",
  "href": "/grounds/<groundId>/session/2",
  "kind": "check_in" | "report" | "to_dos" | "commitments" | "today",
  "id": "<groundId>"            // only where the record is on a check-in
}
```

- The same sentence (`says`) is already the last line of the text block, so a screen that draws only the text still tells the reader where it came from. Draw `label` as the link and do not print `says` a second time.
- `href` is a path within Groundwork, relative on purpose, as for `next_step`. The four paths are the round's report (`/grounds/:id/session/:n`), the report on a check-in (`/grounds/:id/report`), your to-do list (`/suite/todos`), your commitments (`/you`) and Today (`/today`).
- An answer can carry more than one `source` block, in the same order as the parts of the text, when it draws on more than one check-in.
- The older answers that read a record now carry one too: "What is on my list?" (kind `to_dos`), "What did I commit to?" (`commitments`), "Where am I needed?" (`today`) and "What came of it?" (`report`). An answer with nothing behind it (an empty list, "I cannot show you that.") carries none.

### "What should I do next?" (lane `what_next`)

One thing first, with why, and the rest counted, never listed. Built only from the reader's own open commitments, their own to-dos, and what is waiting on them (what Today reads). The order is: a commitment whose date has passed, then somebody waiting on you, then the to-do with the nearest date (or the oldest), then the open commitment with the nearest date. What a person reads, for example:

> Start with "Send the Westgate price list". You said you would do it by Friday, and the date you gave has passed, so whoever is counting on it is still waiting. Either do it, or tell them when it will happen. After that, one more thing is open. Ask me what is on your list, or where you are needed, to see them.
>
> This is from the commitments you have made in your check-ins.

Or, when somebody is waiting on you: "Start with Femi. Femi is waiting on you for the discount approval, and has been for 6 days. Nobody else can clear this one." When nothing is open: "I have nothing to put first. You have no open commitments or to-dos, and nobody is waiting on you in the record. That can also mean something has been said somewhere I cannot see."

### "What did Femi say last week?" (lane `what_did_they_say`)

Answered only with what the asker may already read of Femi's words. The engine lists the check-ins the asker may read at all (the same rule as everywhere else, so an admin with no access to a performance plan, a promotion or a renewal gets nothing from it), and reads the newest round of each as the asker. So Femi's lines come word for word only where the report serves them to the asker; before a round is released a colleague gets the wall's own sentence instead; in an evaluation check-in the person being reviewed gets the facts sentence. Femi's own report, the questions anybody asked Ask Groundwork, a lead's private notes and anybody's load are never opened.

What a person reads:

> Here is what Femi said in their check-in of 24 September on Sales team, Q3.
> - "Shipped the price list to Harbor Foods."
> - "Still waiting on finance for the Green Mart terms."
> This is from Femi's check-in of 24 September on Sales team, Q3.

When the words are not served to the asker: "I cannot show you Yemi's words from their check-in of 30 September on Kilimani launch. Answered. What they said opens to you when the report releases." When there is nothing the asker may read: "I cannot show you that. I have nothing from Femi in the check-ins you can read." That sentence is the same whether Femi said nothing or said something the asker may not read, on purpose. When the asker named a time and nothing fits it, the answer says so ("I cannot find anything Femi said today in a check-in you can read. The most recent I can show you is below.") and gives the most recent, dated. Up to three check-ins are read out, newest first, each with its own source. A person's own words are read back as "you" and "your check-in".

### The wording of the answers

A model may reword these answers, but the engine refuses the reworded version, and sends its own words, if any name, number, date or quoted line is not exactly as the record gave it. The quoted-line check is new and applies to every answer Ask Groundwork words, not only these.

### A guest

A guest is still answered only about their own check-in (decision 36). "What did Femi say last week?" gets the plain list of what they can ask; "What should I do next?" gets their own commitments from their own check-in and nothing of anyone else's.

Code: `api/src/modules/assistant/what-they-said-that-you-may-read.ts`, `what-to-do-next.ts`, `a-source-says-where-it-came-from.ts`, the `source` block in `a-reply-is-a-payload-not-a-string.ts`, the two lanes in `the-router-is-deterministic.ts`. Tests: `what-they-said-and-what-is-next-as-each-reader-reads-it.spec.ts`.

## Week 18: Ask Groundwork changes things by talking, after a yes

Three changes, each said back as a yes or no question and written only when the person answers yes through `POST /ask/answer` (the answer for the proposal block the reply carries, exactly as for adding a to-do). A no writes nothing. The question and the sentence after the yes are the product's own words. A model is never asked to word them, so there is nothing for the screen to reword either.

**Who may change what.** A person changes only their own commitments and to-dos. A lead may also move the deadline of a commitment the lead made for somebody, on a check-in the lead runs. Nobody marks somebody else's commitment done, lead or not. The rule is checked again at the moment of the yes, not only when the question was asked.

What a person reads, where the day is read in code (a day that cannot be read is asked for, and a day that has passed is asked about again):

- Moving your own: "Shall I move "Send the Westgate price list" from Friday 2 October to Tuesday 6 October?" After a yes: "I have moved "Send the Westgate price list" to Tuesday 6 October."
- A lead moving one they set for somebody: "Shall I move "Call the Kisumu depot", which you set for Baraka, from Monday 5 October to Wednesday 7 October?" After a yes: "I have moved "Call the Kisumu depot" to Wednesday 7 October."
- With no day yet: "Shall I set "X" to be done by Tuesday 6 October?" and "I have set "X" to be done by Tuesday 6 October."
- Adding one (always the asker's own): "Shall I add "Book the room for the launch" as something you will do by Friday 2 October?" After a yes: "I have added "Book the room for the launch" as something you will do by Friday 2 October." With no day said, none is made up: "Shall I add "Call the Naivasha depot" as something you will do?"
- Marking done, now said back first for a to-do and for your own commitment: "Shall I mark "Call the Kisumu depot" as done?" After a yes: "I have marked "Call the Kisumu depot" as done."
- On a no, for all three: "I have left it as it was. Nothing was changed."
- A date that cannot be read: "I could not read a date from "next sprint". Which day do you mean? For example, Tuesday 7 October." A date that has passed: "Wednesday 2 September has already passed. Which day do you mean?" A day in another year carries the year.
- Somebody else's, when the asker names them: "Only Baraka can change what Baraka said they would do." It is said only when the asker typed the name, so it tells them nothing they did not say.
- If the lead has left the check-in by the time of the yes: "Only Baraka can change what Baraka said they would do. You can no longer move it for them, so I have changed nothing."

Phrasings that start each: "move X to Tuesday", "push X back to Friday", "change the deadline on X to 7 October"; "add a commitment: X by Friday", "commit me to X"; "mark X as done", "tick off X", "done: X". The proposal kinds are `move_deadline`, `add_commitment` and `tick_off`, and the reply's `lane` is `move_a_deadline`, `add_a_commitment` or `tick_off_a_to_do`.

Moving a deadline also moves the check-in's own record of it where the commitment came from a check-in, so the two never disagree. Not done this week: moving the date of a target that lives on the company's targets page (there is no route for it yet), and a route in the panel API to move a deadline (adding and marking done already share their writer with Ask Groundwork).

Code: `api/src/modules/assistant/a-change-said-back-first.ts` (reading and wording), `a-commitment-has-one-writer.ts` (the one writer, also used by `/commitments`), the lanes in `assistant.service.ts`. Tests: `changing-things-by-talking-is-said-back-first.spec.ts`.

## Week 25: the lead is told while the report is still being written

The lead's read of the report (`GET /reports/:groundId`) carries a new field, `beingWritten`, for as long as a new report of that check-in is being written, and only then:

```
beingWritten: {
  since: "2026-10-01T10:00:00.000Z",
  sentence: "The report is being written with what Amani and Baraka said. It will include everyone in a few minutes."
}
```

- It is there only for the person who runs the check-in. Nobody else reads it, and it is absent (not null) when nothing is being written.
- The sentence is ready to show as it is. The names go through the same naming wrapper as every other line of the report, so a person the lead may not see named reads as "a colleague". With more than three people answered it reads "with what Amani, Baraka, Chidi and others said". With nobody answered yet it reads "The report is being written. It will include everyone in a few minutes."
- It is removed by the engine when the report is finished. Screens should show it above the report and stop showing it when the field is gone; reading again after a minute or two is enough. Opening a report never starts one being written.
- Until the very first report of a check-in exists, the read still answers "there is no report yet" with its reason, as before.

Code: `api/src/modules/reports/the-report-is-being-written.ts`, `withBeingWritten` in `reports.service.ts`. Tests: `the-report-is-written-in-parallel.spec.ts`.

## Week 19: think it through, in Ask Groundwork

A new lane, `think_it_through`, lays out options before anything is written. It writes nothing, parks nothing and decides nothing (decisions 12 and 13). The reply has no `proposal` block and no `picker`: it is one `text` block, with `lane: "think_it_through"`, `composedBy: "model"`, and a new `promptVersionId` on the reply that says which stored prompt version ran (the prompt is stored as `think_it_through` and can be changed at `/prompts`). A reply that could not be made, or was refused by the checks, is a plain `text` block with `composedBy: "rules"` and no `promptVersionId`.

It starts on "help me think through the Q4 target", "what are my options for the Atlas deadline", "let us think it through", "weigh up my options" or "brainstorm how to hit the quarter". "Set a target for Q4" still opens the target draft, and "add a commitment: X" still says the change back first.

What a person reads (two to four options, the frame is the product's and the three sentences in each option are the model's, checked):

- "Here are three options for the Q4 target. I am not choosing for you, and nothing has been written."
- "The first option is to keep the target at 3." (then "The second option is to raise the target.", "The third option is to keep 3 and add a review point."; the model gives each title as a short phrase starting with a lower-case verb and code joins it after "The first option is to") then three sentences on their own lines, always starting "It would mean that", "It assumes that" and "You would know it is working if".
- When nothing written down could be read: "I found nothing written down about this that you can read, so these options come only from what you told me."
- The last paragraph, always: "Would you like me to turn one of these into something concrete? I can help you set it as a target, add it as a commitment, or keep it as a line of context. Tell me which option and which of those, and I will say exactly what I would write, and I will write nothing until you say yes." That is only a question. The next message is routed as usual, so each of the three is said back first and waits for a yes.
- With nothing named: "What would you like to think through? Tell me the target, the decision or the plan, and I will lay out the options."
- If the model cannot be reached: "I could not lay out options just now, so I have not suggested anything and nothing has been written. Ask me again in a moment."
- If fewer than two options pass the checks: "I could not put together options that stay within what you told me and what you can already read, so I have not suggested any. Nothing has been written. Tell me a little more about what you are deciding, such as the number or the date you have in mind, and I will try again."

The checks, in code: any option that uses a number, a number in words, a name, a month or a day that was not in the question or in what the reader may read is dropped. So is any option that does not keep its three sentences, or that recommends ("I recommend", "you should", "the best option" and similar). The screens need not reword or filter anything.

Who reads what: a participant's options come from their own targets and commitments only, and no check-in report is opened for them. A lead or an admin also has what the check-ins they may read serve to them (the same read as "what did Femi say"), so an admin with no access to a performance plan, promotion or renewal gets nothing from it. Private reports, questions to Ask Groundwork, a lead's private notes and a person's load across check-ins are never read.

Code: `api/src/modules/assistant/think-it-through.ts`, the lane in `assistant.service.ts`, the rule in `the-router-is-deterministic.ts`, the capability in `what-the-assistant-can-do.ts`, the seed in `conversation/prompt-library.ts`. Tests: `think-it-through.spec.ts`.

## Week 20: memory that lasts beyond one check-in (request 17 part e), and leave dates said in chat

### What the lead is asked, and what is kept

When the lead says something in the setup conversation (the context chat, also reached through Ask Groundwork) that is true of the whole company, the setup conversation offers to keep it for the organisation. It is a rule, a definition, a principle, who owns something, or something about a client. The offer is its own say-back, in the lead's own words, and only a yes keeps it:

- "Shall I keep "Every quote over 1 million needs Amina's sign-off" as a rule for the whole organisation, so later check-ins and Ask Groundwork can use it?"
- The kind reads "a rule", "a definition", "a principle", "who owns something" or "something about a client".
- After the yes: "I have kept "Every quote over 1 million needs Amina's sign-off" as a rule for the whole organisation. Later check-ins and Ask Groundwork can now use it. You can see it on the Company page."
- After the no: "I have not kept that for the organisation. It stays only on this check-in." The offer is deleted; nothing of it is kept.

On the two doors the screens already use:

- `POST /grounds/:id/context-chat` returns `proposal: { gap: 'organisation_memory', say, offerId }`. `POST /grounds/:id/context-chat/confirm` takes `{ said, offerId }` for the yes. New: `POST /grounds/:id/context-chat/decline` takes `{ offerId }` for the no. Only the person who was asked can answer. A yes that carries an `offerId` never reads a value from the screen; what is kept is the row that was offered.
- Through Ask Groundwork nothing changes for the screens: the say-back arrives as the usual `proposal` block, and the yes or no goes to `POST /ask/answer`.
- Only one question waits at a time. When the lead's turn has already produced another proposal (an answer to the open question, a target for a person), nothing is offered on that turn.

Never offered: anything in a message where the lead asked for privacy ("keep this between us", "private", "off the record" and the like); a sentence that names someone on the check-in and judges or worries about them; a sentence that is not, word for word, what the lead typed; anything said by a participant (the setup conversation is the lead's, and an admin covering for a lead who has left); and anything a lead's private note carries, because private notes have their own road and never come here.

### Where it is kept, and who reads it

Kept in the new table `organization_memories` (`OrganizationMemory`): `kind`, `text` (the lead's own words), `status` (`OFFERED` until the yes, then `KEPT`), `sourceLine`, `offeredById`, `keptById`, `keptAt`. It sits next to the knowledge cards ("how we do it here") and is kept apart from them on purpose: a card is what the company wrote down, and what a person says is held up against it; this is what a lead said, and it is only context. An offer that has not been said yes to is read by nothing.

`GET /company` carries a new field, `whatWeKeep`, for an admin, a lead (organisation role), and anybody who runs a check-in. For everyone else the field is absent, not empty. It reads:

```
whatWeKeep: {
  readBy: "Admins, leads and anyone who runs a check-in can read this. Everyone else cannot.",
  items: [
    { id, kind: "rule", says: "Every quote over 1 million needs Amina's sign-off", source: "Picked up from your check-in on 22 September" }
  ]
}
```

`readBy` is ready to show, so the page can say who reads it. Newest first. The prototype's "Waiting for your confirmation" list with Confirm, Edit and Not now is not served: the question is asked and answered in the conversation, where the yes is said. If you want those three buttons on the page, tell me and I will add the waiting list and its routes.

### Who is given it

- Ask Groundwork: a question about how something is done is answered from the kept words too, for the same readers as the page: "Your organisation has kept this from a setup conversation." and then the sentence in quotation marks. It never says who said it or when. Anybody else is told "Your organisation has not written anything down about that here. If it should have, whoever set Groundwork up can add it."
- Later check-ins: the session's instructions carry the kept sentences as context, under "WHAT THIS ORGANISATION HAS ASKED US TO KEEP IN MIND", with the rule that they are never quoted, never attributed, and never treated as what the person said. They are kept out of "how this company says it works", so a person's account is never compared with them.

### Leave dates said in chat

Leave dates said in the setup conversation or to Ask Groundwork ("I need next Thursday and Friday off") go to the leave suite, never to the record. The days are read by rules from what was said and today's date, and nothing is guessed: "Monday and Wednesday" is not read, because it could include Tuesday. It is said back and sent only on a yes:

- "You asked for leave from Thursday 8 October to Friday 9 October, which is 2 working days. You have 16 days of leave left this year, and nobody else in Sales is off then. Shall I send it to Wairimu to approve?" (the approver's first name where the organisation has said "their manager" and that manager is a lead or admin; otherwise "an admin". The days left and the team clause are left out when they are not known.)
- After the yes, through `LeaveBoardService.ask`: "I have sent your leave request from Thursday 8 October to Friday 9 October to Wairimu. It is not approved until they decide, and you will see it under your leave."
- After the no: "I have not sent it. Nothing was kept."
- While the suite is off: "Leave requests are not switched on in your organisation, so I have not sent or kept these dates. An admin can switch them on under Suites." Nothing is parked, recorded or remembered, not even in the person's private Ask Groundwork history.

Through the setup route it arrives as `proposal: { gap: 'leave_request', say }` and the yes is `confirm` with `{ said, leave: true }`. Through Ask Groundwork it is lane `ask_for_leave`.

Code: `api/src/modules/knowledge/what-the-organisation-keeps.ts` (the rules and the words), `organisation-memory.ts` (the table), `api/src/modules/suites/leave-said-in-chat.ts`, the hooks in `grounds.service.ts` (`contextChat`, `applyContextProposal`, `declineContextOffer`), `assistant.service.ts`, `conversation.service.ts` and `company.service.ts`. Tests: `organisation-memory.spec.ts`, `organisation-memory-through-the-setup-chat.spec.ts`, `organisation-memory-and-leave-through-ask-groundwork.spec.ts`, `kept-organisation-memory-reaches-the-prompt.spec.ts`, `leave-said-in-chat.spec.ts`, and the company page spec for each reader.

## Hours and spending said in chat (weeks 21 and 22, requests 21, 22 and 26)

Who approves, for leave, hours and spending alike: the person's line manager in the staff directory when that manager is a lead or an admin here, otherwise an admin. The person who runs a check-in does not approve just because they run it, and nobody approves their own. It is one function (`whoApprovesFor` in `api/src/modules/suites/who-approves.ts`), and the leave board, the time sheets board and the spending board all follow it. This is recorded as decided for Hafsah to confirm. The suite's own answer to "Who approves?" no longer changes who decides for leave and hours, so that question can leave the suite's setup page when you next touch it; spending still has its limit and the named person above it.

Both go through Ask Groundwork only (lanes `log_hours` and `ask_to_spend`), as a text block and a proposal block with Yes and No, exactly like leave. Neither is in a check-in's record, a report, a pattern, or the person's Ask Groundwork history.

### Hours (lane `log_hours`)

- Said: "I did 6 hours on Atlas today". Read by rules: the hours, a project from the admin's list, and a day that was said (today, yesterday, a weekday, a date). A day, a project or an amount that is not certain is asked, never guessed.
- Said back: "Shall I log 6 hours on Atlas for Thursday 1 October and send it to Wairimu to approve?" (several projects: "Shall I log 3 hours on Naivas Ngong Road and 1 hour on Lakeside for Wednesday 30 September and send it to Wairimu to approve?"). With no line manager it says "an admin".
- After the yes, through `TimeSheetsService.record`: "I have logged 6 hours on Atlas for Thursday 1 October and sent it to Wairimu to approve. It is not approved until they decide, and you will see it under your hours." The hours then wait for the approver on the time sheets board.
- After the no: "I have not sent it. Nothing was kept."
- Suite off: "Time sheets are not switched on in your organisation, so I have not sent or kept these hours. An admin can switch them on under Suites." Nothing is parked or kept.
- Asked again: "I do not have Zebra on the list of clients and projects. Which one did you mean? The ones I have are Atlas, Naivas Ngong Road and Lakeside." / "Which day was that? Tell me the day, for example today, yesterday or a date, and I will ask again." / "Monday 5 October has not come yet. Tell me the day the hours were on, and I will ask again." / "I could not tell how many hours that was. Tell me the number of hours and the project, for example 6 hours on Atlas, and I will ask again."

### Spending (lane `ask_to_spend`)

- Said: "I spent 12,000 on fuel for the Kisumu trip" or "Can I spend KES 18,000 on fuel for the Kisumu deliveries?".
- Fits: "You asked to spend KES 12,000 on fuel for the Kisumu trip. Operations has KES 38,000 left for October, so that fits. Shall I send it to Wairimu to approve?"
- Over the budget: "You asked to spend KES 12,000 on fuel for the Kisumu trip. That is over the Operations budget left for October, which is KES 8,000. Shall I still send it to Wairimu to approve?" (It names the person's team, not a category: the budget in the product is per team.)
- Over the rule: "... This is over KES 20,000, so Grace must approve it. Shall I still send it to Grace to approve?"
- After the yes, through `SpendingService.ask`: "I have sent your request to spend KES 12,000 on fuel for the Kisumu trip to Wairimu. It is not approved until they decide, and nothing is spent until then."
- After the no: "I have not sent it. Nothing was kept." Suite off: "Spending requests are not switched on in your organisation, so I have not sent or kept this. An admin can switch them on under Suites."
- Asked again: more than one amount, a currency that is not the organisation's ("Your organisation counts spending in KES, and you wrote USD. Tell me the amount in KES and I will ask again."), or no reason ("What is the KES 12,000 for? Tell me in a few words and I will ask again."). A person is told only what their own team has left, never anybody else's spending.

### Still open for the screens

The approver is not yet told on Today. Today is built in `grounds/what-needs-you*`, which this work did not change, so it needs one new kind of item there ("Aisha has asked for leave", "Brian has sent hours to approve", "Kamau has asked to spend KES 18,000"), read from the leave, time sheets and spending boards for the person who may decide. Until then the approver finds them on the three suite boards, which already show Approve and Decline only to the right person.

Code: `api/src/modules/suites/hours-said-in-chat.ts`, `spend-said-in-chat.ts`, `who-approves.ts`, and the lanes in `api/src/modules/assistant/assistant.service.ts`. Tests: `suites/hours-and-spending-said-in-chat.spec.ts` and `assistant/hours-and-spending-through-ask-groundwork.spec.ts`.

## Being away (week 23)

Approved leave is read by its dates only (decision 31): never the reason, never the kind of leave. Leave that is waiting, declined, not yet started or over changes nothing. The one read is `api/src/modules/suites/who-is-away.ts`.

While somebody is away today:

- **The round does not wait for them.** They are not counted as still to answer, the round closes and the report releases without them, and the board, the list and the report's count leave them out. If they answer anyway, they count like anybody.
- **No reminder or "you have missed" mail goes to them.** The mail door refuses nudges, the absence mail, "your check-in is open", the invitation-about-to-lapse mail and the feedback request while they are away. The manual and scheduled chases skip them, and the lead's "who has not started" list leaves them out. A check-in that opened while they were on leave is never a missed one.
- **Nothing counts against them.** A promise not kept on a day of leave is not a miss in the kept count (You board and suggestions), a pattern's streak is paused and not broken by a period spent on leave, and coaching is not offered while they are away.

### What each person reads (decided for Hafsah to confirm)

The ground read (`GET` of a check-in) and the board now carry `whoIsAway`, a list with one entry for each person who is away and not waited on: `{ participantId, until, says }`. It is empty when nobody is away. Please show `says` as it is.

- **The lead (and an admin who runs it):** "Yemi is on leave until Friday 2 October, so this round does not wait for Yemi."
- **A colleague:** "Yemi is away until Friday 2 October." Only where the check-in already shows that person to them by name. A colleague who is not shown the person by name reads nothing.
- **The person themselves:** "You are on leave until Friday 2 October, so this round does not wait for you."

The count a person reads ("Four of the five people have answered") now counts the people the round waits on, so it can drop by one while somebody is away. `sessionProgress` also carries `awayUntil` (participant id to last day) beside `missingParticipantIds`, which no longer lists somebody who is away.

Tests: `suites/being-away-as-each-reader-reads-it.spec.ts`, `conversation/being-away-no-reminders.spec.ts`, `email/no-reminder-to-somebody-who-is-away.spec.ts`.

## Week 24: Ask Groundwork for a guest, within their own check-in (decision 36)

Nothing new is needed on your side to show a guest's answers: they come back in the same reply shape as a member's (`blocks` with a `text` block, and a `proposal` block when a change is said back). `GET /ask` and `POST /ask` already work for a guest and name the check-ins they may ask about in `about`. Two things to know.

**What a guest can now ask, each answered only from their own check-in and their own part in it.** `lane` on the reply tells you which: `guest_said`, `guest_purpose`, `guest_who_reads`, `guest_next_step`, `guest_done`, `guest_move`, and the older `guest_agreed`, `guest_stuck`, `guest_mine`, `guest_report`, `guest_next`, `guest_help`, `guest_outside`, `guest_a_request`.

- "What did I say?" reads: "This is what you said in Sales team, Q3, as it is on your record." and then their own lines, one to a line. A line they have disputed, or one the product only inferred, is left out.
- "What is this check-in for?" reads: "This is what you were told about Sales team, Q3." and then the same description a participant is shown. Never the lead's own brief.
- "Who reads what I say?" reads: "The people in Sales team, Q3, including the person who runs it, can see what you say in it. Admins of the organisation that runs this check-in can read every check-in. Your own report and your questions to Ask Groundwork stay private. What you say is used to build the shared picture for this check-in and nothing else, and it does not train a model. Your answers are stored on our servers, and they are processed by Google's models to build the record." The admins sentence is left out on a performance plan, a promotion or a renewal, and where the kind of check-in is not known.
- "What should I do next?" puts one of their own open commitments first: `Start with "Send the Harbor Foods price list". You said you would do it, and you said Friday. After that, one more thing is still open in Sales team, Q3. Ask me what you said you would do to see them.` It carries no source link, because a guest has no "You" page to open.
- "Mark the price list as done" is said back as a question with a `proposal` block: `Shall I mark "Send the Harbor Foods price list" as done?` Only `POST /ask/answer` with a yes writes it, and then: `I have marked "Send the Harbor Foods price list" as done.` A no says: `I have left it as it was. Nothing was changed.`
- "Move the price list to Friday" is said back the same way: `Shall I move "Send the Harbor Foods price list" from "Friday" to Friday 9 October?` and after a yes `I have moved "Send the Harbor Foods price list" to Friday 9 October.` A day that cannot be read, or has passed, is asked for again.

A guest can change only a commitment they said themselves, in the check-in they are in. Not a colleague's, not one the lead set for them, and not one already finished. Anything else is answered with: "You are a guest here from another organisation, so Ask Groundwork can only answer questions about your own check-in, such as what you said, what you said you would do, what the check-in is for, who reads what you say, and when your next check-in is." Asking it to add a to-do or change a target is answered with a sentence that also says what it can do.

**Change for the screens.** `POST /ask/answer` used to refuse every guest with "There is nothing waiting for your yes." It now takes a guest's yes or no for the one change above that was said back to them last, and still refuses a stale yes, somebody else's, or a yes after they have asked something else. If the guest screen hid the yes and no buttons because a guest never had a `proposal` block, show them when one arrives, as for a member.

Questions, answers and waiting requests for a guest are kept under their own key only, as before. Tests: `ask/ask-groundwork-as-each-reader-reads-it.spec.ts`, "a guest asks about their own work in their own check-in (week 24)". One older test changed: `assistant/what-they-said-and-what-is-next-as-each-reader-reads-it.spec.ts` pinned "What should I do next?" as the question "mine" for a guest, which listed everything they said they would do. It is now its own question, `next_step`.

## Week 21: the approver is told on Today (requests 21, 22 and 26)

Today now carries what is waiting for the reader to approve: leave requests, hours and requests to spend. It is a new kind of item in `needs`, with the same shape as the others: `kind: "decide"`, a `title`, a `detail`, an `action` and an empty `groundId` (there is no check-in behind it). The `key` is `approve-leave-N`, `approve-hours-N` or `approve-spend-N`, or `approve-leave`, `approve-hours` and `approve-spend` for a count. Please show `title` and then `detail` as they are.

It is told only to the person who approves it, by the same rule as the boards (`mayApproveFor`): the person's manager in the directory when that manager is a lead or an admin, otherwise an admin, and never to the person themselves. A member, a guest, a colleague and an admin who is not the approver for that person read nothing. Nothing appears while a suite is switched off.

Up to two of a kind are each said. Three or more are said once, with the count. Each links to its board.

- Leave (title, then detail; dates only, never the reason or kind, and one day is said as "on"): "Amani asked for leave from Thursday 8 October to Friday 9 October." "It is waiting for you to approve." Action: "Look at it", `/suite/leave`. Count: "3 leave requests are waiting for you to approve." Action: "Look at them".
- Hours (what was sent, never how much somebody works): "Baraka sent 6 hours on Atlas for Thursday 1 October." "They are waiting for you to approve." When the hours are on more than one day: "Baraka sent 9 hours on Atlas and Zeta for the week of Monday 28 September." Action: "Look at them", `/suite/time`. Count: "Hours from 3 people are waiting for you to approve."
- Spending: "Baraka asked to spend KES 12,000 on fuel for the Kisumu trip." "It is waiting for you to approve." Action: "Look at it", `/suite/spend`. Count: "3 requests to spend are waiting for you to approve."

These items are in the count beside Today and in the "new" count on "Choose an organisation", because they are in `needs`. The time sheets board rows also now carry `days`, the days of that week that have hours.

Tests: `grounds/what-is-waiting-for-you-to-approve-as-each-reader-reads-it.spec.ts`.

## 1 October: why the person reviewed is not told who else gave a view (decision 17)

On a performance plan, a recognition or promotion round, or a contract renewal, the person the check-in is about is never told who else gave a view, whatever the lead switched for "people see each other". Everybody else still follows the lead's switch: a colleague giving a view reads who is on it when the lead switched it on, and the lead and an admin with access read everybody.

The check-in's own read (`GET /grounds/:id`) and each row of the list now carry `whyThePersonReviewedIsNotTold`. On those three kinds of check-in it reads:

"On a check-in about one person, that person is never told who else gave a view."

On every other check-in it is null. Please show it beside the lead's switch for "people see each other", and on the page of the person reviewed where the list of who is on it would be. `peersVisibleEffective` is now worked out for the reader: it is false for the person reviewed, and true for the lead and for a colleague giving a view when the lead switched it on. Before this, it read false for everybody on those check-ins, the lead included, even with the switch on.

Tests: `grounds/decision-17-on-the-check-in-page.spec.ts` and `reports/decision-17-wins-over-the-leads-switch.spec.ts`.

## 1 October: the name of each aim on the board, and the line under it (review row 113)

`board.objectives[*].name` is now one full sentence about a person by name, and "you" for the reader. For example, on the sales board Bisi reads "You are aiming for 120 million naira disbursed this quarter." and Ngozi reads "Bisi Adeyemi is aiming for 120 million naira disbursed this quarter." and "You are aiming for 14 approved facilities." Please show `name` as it comes. The Context page (`GET /grounds/:id`) still serves the name as stored, because that is the field the lead edits.

`board.objectives[*].journey.say` is now one full sentence with numbers a person can read: "It was 0 at the start and is 11 now, and the aim is 40.", "It is 0 now, and the aim is 120 million.", "It was 0 at the start and is 254,000 now, so the aim of 180,000 has been reached.", and "Nothing has been counted for it yet." where nothing is counted. `BoardPage.tsx` (around line 1023) builds its own line from `o.count`, `o.journey.start` and `o.target`, so it prints "120000000". Please show `journey.say` there instead, or write the numbers the same way. An admin outside the check-in who may not see a number gets an empty `say`.

## 1 October: each target says whether it is an aim to reach or a limit not to go over (decision 69)

Each target now has a field `direction`. Its values are `"AIM"` (an aim to reach) and `"LIMIT"` (a limit not to go over). `null` means nobody has set it yet. Where it is `null`, the board reads the words of the target's name as it did before.

**Where it is served.** On the board, `GET /grounds/:id/board`, every row of `objectives` carries:

- `direction`: `"AIM"`, `"LIMIT"` or `null`, to everybody who may read that target.
- `directionQuestion`: the sentence to ask the lead, only to the lead, only while `direction` is `null`, and only for a target with a number. Otherwise `null`. It reads, for example: "Is 40 something to reach, or a limit not to go over?" Please show it under the aim's own sentence, so the lead reads "Bisi is aiming for 40 approved facilities." and then the question.
- `directionSuggested`: `"AIM"` or `"LIMIT"`, what the words of the name suggest, only to the lead and only while `direction` is `null`. Please use it to pre-select one of the two answers. It is never stored until the lead answers.

The answers can be worded "Something to reach" and "A limit not to go over".

**How the lead sets or changes it.** `POST /grounds/:id/board/objectives` (when making a target) and `PATCH /grounds/:id/board/objectives/:objectiveId` (later) both take `direction`: `"AIM"`, `"LIMIT"`, or `null` to put it back to not set. Leaving it out of a `PATCH` changes nothing. Both routes are the lead's alone.

**From a plan.** Each waiting goal with a number, from `POST /grounds/:id/plan/proposals` and `GET /grounds/:id/plan/proposals`, now carries `whichWay` (the same question, "Is 25 something to reach, or a limit not to go over?") and `directionSuggested`. Please show `whichWay` on the card, with the two answers, and send the lead's answer as `{ "direction": "AIM" }` or `{ "direction": "LIMIT" }` in the body of `POST /grounds/:id/plan/proposals/:pid/confirm`. Without it the goal is saved with no direction set.

**In the setup conversation and Ask Groundwork,** nothing changes for the screens. The say-back now states the direction of each number, and the lead's yes confirms it. A paste's list reads, for example, "- Spending this quarter: 180,000, a limit not to go over" and "- Pumps sold under the new scheme: 40, an aim to reach". Measures named one at a time read, for example, `"Pumps sold under the new scheme" is an aim of 40 to reach.`

**What the board then says.** A limit the lead set reads "It was 0 at the start and is 254,000 now, which is 74,000 over the limit of 180,000." whatever the name says, and its name reads "The team is keeping spending to no more than 180,000." An aim the lead set reads "It was 0 at the start and is 254,000 now, so the aim of 180,000 has been reached." even where its name says "budget".

Tests: `board/a-target-is-an-aim-or-a-limit-as-each-reader-reads-it.spec.ts` and `grounds/a-target-is-an-aim-or-a-limit-when-it-is-made.spec.ts`.


## 1 October: each goal's name is now a full sentence (check-in screen)

Each item in a check-in's brief objectives is now `{ name, target, direction }`, and `name` is a full sentence for the person reading it, for example "You are aiming for 14 approved facilities." or "Bisi is aiming for 120 million naira disbursed this quarter." The number is already in the sentence. `ChatPage.tsx` adds "(14)" after the name when there is no prose summary, which would read "You are aiming for 14 approved facilities. (14)". Please show `name` on its own.


## 1 October: request 99, the dead report body and the three engine tests

**Not done yet. I have not changed the three tests, because two things in your note do not hold when I read the code.** The three tests still fail, and they fail for a reason: they are the gate `the-four-reports.ts` keeps until every rule has a live home.

**1. The wording of the two fields did not move with them.** `WhatToProbeThemOn.tsx` draws `whatItRestedOn` and `whereThisStarted`, but without the sentence under each one. The old body said, under the conditions, "These were not in their hands. Read anything unmet above against them first." and, under the starting point, "Written at the beginning and left as it was. Read what people shared above against it." Neither sentence is in the new component. The first one is the whole point of the field: without it, an unmet standard is read without the warning that it was never in the person's hands, which is the reading this product exists to prevent. `grounds/the-teams-starting-point.spec.ts` checks for exactly that sentence. Please add both sentences back, word for word, under "What you said it rested on" and "Where this stood at the start". Once they are there I will point both tests at `WhatToProbeThemOn.tsx`. For `reports/one-session-is-not-a-movement.spec.ts` I will match `startedAt={(groundReport as any)?.whereThisStarted}` on `SessionReportPage.tsx`, since the field is now read from `groundReport`; nothing else in that test needs to change.

**2. Only one of the two gate entries has a live home.** The list has two entries, not two homes in `WhatToProbeThemOn.tsx`. The second, "What the server already knew reaches the page, lead-only, worded about the record", does live there now, and its client test (`what-the-server-already-knew.spec.tsx`, 9 tests) passes. The first, "A panel with nothing to say is a line, and staleness is never conditional on being settled", does not. You say so yourself: the live `ResolutionPanel` draws nothing at all until a decision is near, where the rule asks for one quiet line, and there is no "you are reading an old version" notice anywhere live. The gate's own note says this is real work, not a repoint. I am putting it to Hafsah rather than taking it off the list: either she agrees that "nothing at all until a decision is near" is right, and the entry comes off with that reason written down, or `ResolutionPanel` gets its one line back.

**3. Who reads these two fields, so the comment in the component is true.** The server does not send them to the lead alone. `whatItRestedOn` comes with the weigh section, which `whoIsReadingTheWeighing` builds for the lead and also for the subject, the one person a check-in with a single account is about. `whereThisStarted` is not limited by reader at all. Neither is a privacy problem: both are the check-in's starting point, which `baselineEntries` and `baselineHistory` already show to everybody in the check-in by design. But it means the subject of a one-person check-in, opening their session report, now sees this whole box under the heading "What to ask each person" and the tag "Yours as the lead", with "What you said good would mean" over the lead's words. The old body was never mounted, so nobody read that before; the new home is the first place it can be seen. Please draw the weigh part for the subject under a heading that speaks to them, or tell me, and I will change the server to send the weigh section to the lead only. That second choice changes who reads what, so it would go to Hafsah first.

**What happens next.** When the two sentences are back, tell me here and I will repoint the two tests. The first test, `every-field-belongs-to-one-of-the-four.spec.ts`, waits for Hafsah's answer on the resolution line. When that entry comes off, the list is empty, and "the body is still there" is removed with it, as the file has always said it would be.


## Request 99, after Hafsah's answers (1 October)

Hafsah decided two things (decisions 70 and 71 in `docs/decisions-merged.md`):
- **70.** The resolution panel shows nothing until a decision is near, as the prototype does. "Resolution. Not set yet." is not brought back. Your note in `a-panel-with-nothing-to-say-is-a-line.spec.ts` already matches this; I have taken that half off the guard list in `the-four-reports.ts`.
- **71.** The old-version notice stays. The rebuilt session report (`TheSessionsReport.tsx` / `SessionReportPage.tsx`) needs to tell a person when the report they are reading has changed since they opened it, as the old body's banner did ("someone has checked in since this was written, you are reading the previous version"), worded plainly. Please build it and add a test in `a-panel-with-nothing-to-say-is-a-line.spec.ts` that reads it in the live page. Its guard entry is the last one left; when it is live, I take it off the list, and the "body is still there" test retires with it, as the file says.

The two dropped sentences and the rewording of "Yours as the lead" for the person are with you, as agreed. When those are pushed I merge and run the three tests.


## Request 99, done (1 October)

Merged your three commits. Both sentences are back word for word, the person reads "What your lead said good would mean", and the old-version notice is on the session report. I pointed `the-teams-starting-point` and `one-session-is-not-a-movement` at `WhatToProbeThemOn.tsx` and `SessionReportPage.tsx`, emptied `BEFORE_THE_DEAD_BODY_CAN_GO`, and the test that held `ReportBody` in place now checks it does not come back. All three pass (`736f28f7`).


## Decision 72: who may rewrite what a check-in is for (1 October)

The server now allows only the lead to rewrite a check-in's brief, unless the lead has left the organisation; then an admin of it may. Anybody else is refused with decision 63's message (it names the lead). When an admin rewrote it because the lead left, `GET /grounds/:id` serves `briefChangedByAnAdmin` to everybody on the check-in, participants included, as one plain sentence: "Otieno Kamau changed what this check-in is for because Wanjiru Mwangi has left the organisation." It is null otherwise. `briefChangedBy` (first name, `isYou`, `isTheLead`) still goes only to whoever runs the check-in, as before.


## Request 9, part (d): the rest of the weekly report (1 October 2026, week 12b)

`GET /grounds/:groundId/report/week` now serves the whole weekly report, not only the sentence about each person. Everything it said before is unchanged (`weekStart`, `builtAt`, `saying`, `eachPerson`), so nothing on the screens breaks. The new fields, all optional, all full sentences, and all already named for the reader:

```
{ heading?: string,            // "This week, 21 to 23 Sep, so far" (a finished week: "The week of 28 Sep to 2 Oct")
  whatThisIs?: string,         // the sentence under the heading
  inNumbers?: [{ figure: string, of: string, says: string }],   // "The week in numbers"
  eachPerson: [...as before],  // "What this week shows", one sentence each
  acrossTheTeam?: string[],    // also under "What this week shows", after the sentences
  threeInARow?: [{ who: string, isYou: boolean, says: string }],  // "Things that happened in three check-ins in a row"
  saidAndProof?: string | null,                                  // "What people said, and what the proof shows"
  whatChanged?: { moved: string[], dropped: string[], result: string[] },  // "What changed": Moved, Dropped, Result
  forNextWeek?: [{ do: string, why: string, comesFrom: string }] }        // "For you to do next week"
```

Draw `figure` large with `of` under it, as the prototype's tiles do; `says` is the same thing as a sentence, for the phone or a screen reader. Each list in `whatChanged` always has at least one sentence ("Nothing was dropped this week."), so draw it as it comes. Leave a section out when its field is missing.

**What the lead reads** (a check-in with Wairimu leading Aisha, Baraka and Chidi, on Wednesday 23 September):
- "This week, 21 to 23 Sep, so far" and "The report for each check-in shows that check-in. This weekly report shows what kept happening for three check-ins in a row or more." (A daily check-in reads "The daily reports show each day." first, as the prototype does.)
- 67% "of check-ins made this week" ("2 of the 3 check-ins due this week were made."); 1 "things people said this week with a photo or document behind them"; 17 "freezers sold" ("The team's freezers sold went from 12 to 17 this week, against the aim of 40."); 254,000 "spending this quarter" ("The team's spending this quarter went from 200,000 to 254,000 this week, against the limit of 180,000. That is 74,000 over the limit."); 9 "visits made, Aisha's number" ("It stayed at 9 this week.").
- "Green Mart came up in what Aisha and Baraka said this week."
- Baraka: "The work stops until there is another call. This came up in 3 check-ins, in sessions 3, 4 and 5."
- "This week, people said 5 things in their check-ins. 1 of them has a photo or document behind it. 1 number was given as an estimate, and 1 number was given from memory with nothing attached, so they cannot be checked yet. It is worth confirming them before acting on them."
- Moved: "Aisha committed to call Mama Fresh by Thursday, and it is now done." and "Baraka is no longer waiting on you for the price list." Dropped: "Baraka committed to visit Kwik Stores, and it has been dropped." Result: the targets that moved, as above.
- For you to do next week: "Decide whether a price range counts as a budget." / "Aisha is waiting on you for it." / "This comes from a blocker."; "Talk with Baraka about “The work stops until there is another call”." / "Baraka has seen this and has not answered yet." / "This comes from something that kept happening."; "Decide whether to hire a second driver." / "You wrote this down as still to decide." / "This comes from something you wrote down to decide." Where people said different things, it reads "This comes from a disagreement in the team.", as the prototype does.

**What a person in the check-in reads** (Baraka): only their own sentence, as "you"; the team's check-ins made and the targets they may already read, without the aim or the limit; "0 things you said this week with a photo or document behind them"; their own patterns, first ("The work stops until there is another call. This came up in 3 of your check-ins, in sessions 3, 4 and 5."), including one the lead cannot read yet; "This week, you said 2 things in your check-ins. ..."; their own moved and dropped ("You are no longer waiting on Wairimu for the price list.", "You committed to visit Kwik Stores, and it has been dropped."); and, for next week, what they said this week they would do and have not settled ("Send Green Mart the price list on Monday." / "You said this week that you would do this, and it is still open." / "This comes from what you said you would do."). Never a colleague's sentence, number, pattern or commitment, never what came up across the team, and never the lead's list.

**What an admin who does not run the check-in reads** (an ordinary check-in): the lead's view of the week, without the aim or the limit, without the targets that are decisions about a person, without any pattern (decision 58), and with no `forNextWeek` at all, since that list holds the lead's own notes. An admin not given an evaluation check-in gets "Check-in not found", as before.

**When it is worked out.** When a check-in comes in, and again once that session's report is written, so the lead's list reads the newest report. Opening the page builds nothing and reads no record line; it words the kept facts for the reader. The facts are kept without names, by report label, and the names go in through `withNames` when served. No model is asked, so no prompt and no prompt version is involved. Patterns are read when the page is opened, under the same rule as everywhere else (three periods, the person first), and only the ones seen in this week's check-ins are shown.

**What is not there, and why.**
- The prototype's opening line ("People are busy, but some sales move forward much more than others.") compares people. A sentence the product writes from counts cannot say that honestly, and there is no model step for the weekly report, so it is not written.
- "Adapted" ("Brian now asks about the budget on his first visit") has nothing in the record to come from: nothing records a change in how somebody works. It is not served. Please draw Moved, Dropped and Result only.
- The prototype's "9 customers said the price was too high, and none named a competitor" needs a reading of what each claim was about, which needs a model. The engine says what it can count instead: how many things were said, how many have something behind them, and how many numbers were estimates or from memory.
- Figures such as "14 deals moved stage", "5 sales closed" and "3 deals hit the stall rule" come from the stages and the stall rule, which are not in the record yet (week 6b's marks). Today the numbers are the check-ins made, the things with proof, and every target the reader may read.
- The week is kept in the existing weekly report row; nothing in the database changed.


## Decision 73: the weekly report for each reader, and earlier weeks (1 October)

- A person in the check-in reads aims and limits in the weekly report only where the check-in's `whoSeesTargets` is `EVERYBODY`, as on the board. With `THEIR_OWN` they read the counts alone.
- `GET /grounds/:groundId/report/week?week=2026-09-21` reads an earlier week by the date of its Monday, as it was kept. Without `week`, the latest week. A week with no report returns `saying: "There is no weekly report for that week."`; a value that is not a date in that form is refused with "Pick a week by the date of its Monday, for example 2026-09-21."


## Request 95, part (b), again: the wording guard (1 October, evening)

On the combined code the guard counted 63 against 60. I went through every match by the commit that wrote it. Seven were added by the engine today, and I have dealt with all seven:

1. **One was copy-shaped and is rewritten** (`what-they-will-do-is-asked-before-the-end.ts`): "This is the last question you should ask before you close. Ask it now. Make it the one question in this turn. Use words from what they have told you, about the thing in the way or the thing that is due. ..."
2. **Five are instructions to the pattern detector, read by no person** (what counts for each wavering pattern). I moved them word for word out of `pattern-library.ts`, which also holds pattern names people read, into a file of their own, `api/src/modules/patterns/what-counts-for-each-pattern.ts`. What the detector is given is unchanged (I checked its fingerprint before and after). I did not reword them, because a pattern steadiness measurement is running against exactly this wording.
3. **One is a test fixture**, `api/src/modules/board/__fixtures__/a-page-that-contradicts-itself.ts`: the words a board was built from in a run, kept as they were on purpose, so a test can prove the faults in them are fixed. It is not copy anybody reads.

**What the guard needs, in `client/src/lib/copy-does-not-sound-like-yoda.spec.ts`, two lines, the limit untouched:**
- Add `'what-counts-for-each-pattern.ts'` to `NOT_COPY`, with the same reason as `prompt-library.ts`: every line in it is addressed to a model.
- Skip test data the way `.spec.` files are skipped: in `everyFile`, also pass over any path containing `/__fixtures__/` (for example `if (name === 'node_modules' || name === 'dist' || name === '__fixtures__') continue`).

With both, the count on the combined code is 56. Without them it is 62. The other matches are older than today and were inside the 60 already.


## 1 October: please send where Ask Groundwork was opened from (decision 65)

In the live check of item 6, after the setup conversation the lead's next question anywhere ("How do we get a quote signed off?") was answered as part of setup ("Groundwork does not manage processes ..."). The engine takes the next message as the parked setup turn because the request carries no `openedFrom`. Please send `openedFrom` on every `/ask` call (`check_in_setup` only from inside a check-in's setup, and the page's own name elsewhere), so a question asked from anywhere else is answered as itself.


## Request 107 (a): no working note reaches a board (2 October)

Done (`7d7c98e6`, `39bdd374`). `stillUnanswered` no longer carries the engine's own working note. Each row is now `{ who, what, says, sinceRound, certain }`:
- `what` is the plain question that was owed, for example "How are you making your number?", never the note.
- `says` is one sentence for this reader, for example "In session 1, Rukia Mwangi was asked, "How are you making your number?" Rukia Mwangi has not answered it yet." To Rukia herself: "In session 1, you were asked, ... You have not answered it yet." Where nothing on record can confirm the answer: "... Nothing on record can confirm the answer yet."
- Please draw `says` on its own, in place of "who — what" and the "open since session" note, so no dash joins two pieces.

A test now serves the board as every reader, with a gap open for every owed line in every situation, and finds none of the working notes. The rest of request 107 and request 105 are next; I will write here as each is done.

## Request 107 (b): every sentence the review found, fixed where it is made (2 October)

Each sentence is fixed at its source, and the same shape is fixed wherever else it was made. What each reader now reads:

- **A wait whose "on" is a thing, not somebody.** The extraction sometimes writes the thing itself, or a decision, where the person waited on goes. A new rule (`board/a-thing-is-not-somebody.ts`) tells a body of people ("the credit committee", "the Head of Credit", "the customers") from a thing ("the data structure decision", "a decision on who owns them", "the pipeline fix"). A thing is never said as who something comes from. Where it is a different thing, it is said in a sentence of its own after the wait. Risks, Blocker check, Timeline, Obligations, Who waited on whom, What you need to do, and the report's waits all follow it.
  - Before, to Rukia: "You cannot move on the data structure decision until it comes from the data structure decision."
  - Now, to Rukia: "You cannot move on the data structure decision, and nobody has been named to provide it." To the lead: "Rukia Mwangi cannot move on the data structure decision, and nobody has been named to provide it."
  - Before: "... waiting on a decision on who owns them for owners with dates for the API format."
  - Now: "Baraka Otieno is waiting for owners with dates for the API format. That waits on a decision on who owns them." To Baraka: "You are waiting for owners with dates for the API format. That waits on a decision on who owns them."
- **Decisions needed name the person waiting.** Before: "Somebody is waiting on the pipeline fix, so it needs deciding." Now, to the lead: "Rukia Mwangi is waiting on the pipeline fix, so it needs deciding." The reason under it: "Rukia Mwangi cannot move until this is decided." To Rukia: "You are waiting on the pipeline fix, so it needs deciding." and "You cannot move until this is decided." A wait in this list now follows the same wall as every other wait on the board. Where people see only themselves, a participant reads only the waits they are in. An admin with no access to an evaluation check-in reads none. Nobody but the people running it reads a wait of the lead's that names somebody.
- **A difference whose topic is a whole sentence.** Before: "... said different things about There is no shared understanding ...". Now: "People in this check-in said different things. There is no shared understanding of who owns the release. This needs settling." The names are given where the reader may read every side, as before.
- **The "Lead and team" label.** The Owner of a difference, and of a decision the lead wrote down, is now the person running the check-in by name ("Amina Wanjiru"), and "You" to that person. The reason under the lead's own: "You wrote this down as still to decide." to the lead, and "Amina Wanjiru wrote this down as still to decide." to anyone else. This follows the prototype's "The operations lead needs to decide."
- **"their own" after "you".** The report is written about each person's label, and when the label became "you", "their own" stayed. Before: "Wanjiku's progress depends on you completing their own open actions." and "you have not closed their own commitment". Now: "... on you completing your own open actions." and "you have not closed your own commitment". The rule is narrow on purpose: "you have not given each person their own target" is about other people's targets, and stays as it is.
- **"Nobody has said what success looks like yet - not the person running this ..." said to the person running it, with a dash.** Now, to the person running it: "Nobody has said what success looks like yet. You have not said it, and nobody answering this check-in has said it either. Until somebody does, the report can say where people said different things, but not whether things are going well." To an admin who reads everyone: the same, with "Amina Wanjiru has not said it". To a participant who reads only their own: "Nothing has been said yet about what success looks like. Amina Wanjiru has not said it, and you have not said it either. It appears here as soon as either of you does." The lead also reads "No standard is set. You have not said what success looks like, so nobody is being measured against anything yet." in place of "The person running this has not said ...".
- **"They want to get 12 shops onboarded." as a target's name.** A name that starts with "They" now names whoever holds the target, then goes through the naming every reader gets: "Amani Wekesa wants to get 12 shops onboarded." to the lead, and "You want to get 12 shops onboarded." to Amani. Without a holder, it is whoever set it. A verb in the past stays as it was ("needed", not "neededs").
- **Coaching saying "Baraka Mwangi and Amani Wekesa are waiting on them" to Rukia.** The probe now names the person, and says "you" to the reader about their own row: "Baraka Mwangi and Amani Wekesa are waiting on you for 3 days for the plan for the launch and the shop list. Ask what that is waiting on." To the lead about Tobi (re-f, seniorhire): "You are waiting on Tobi Adewale for commercial ownership." in place of "You are waiting on them for commercial ownership." The same lines that had no person in them now do: "Rukia Otieno has not answered this session, so nothing below is from this round." and "Rukia Otieno has been waiting for 4 days on Juma for the budget, and nothing on record says it was raised higher. Ask what has stopped Rukia Otieno raising it." in place of "Waiting 4 days on Juma for the budget, with no escalation on record. Ask what has stopped them raising it." The probes are the lead's only, as before.
- **The contribution reason.** "That person is also waiting on them for 2 things" now names the person: "That person is also waiting on Tobi Adewale for 2 things".

Tests: `board/request-107-b-every-sentence-for-its-reader.spec.ts` serves the board as Amina (the lead), Rukia and Baraka (participants, with and without seeing each other), Juma (an admin who only reads, on a team check-in and on a performance plan) and the admin who set it up, and reads the sentences above. 18 of its 21 cases fail on the code before this change. Two older tests asserted "them" ("waiting on them", "showing them", "stopped them raising it"), which was the defect; they now expect the name.

Decided for Hafsah to confirm: the Owner of a difference, and of a decision the lead wrote down, is the person running the check-in by name, where it said "Lead and team". The prototype's own line is "The operations lead needs to decide."

## Request 107 (d): the Movement tile says how many targets moved (2 October)

The quick read's Movement tile served one target's own change as its value ("+96"), a number with nothing to say what it counted. It now serves how many targets moved, up or down, for the targets this reader may read (the rule fixed on 1 October is unchanged). What each reader reads, with Kwame's target moving from 4 to 100 and the team's staying where it was:

- The lead (Bisi) and Kwame: value "1 target", line "1 target moved this session." Before: "+96" and "Targets moved this session."
- Ngozi, who may not read Kwame's number, and an admin outside the check-in: "None" and "No target moved this session.", as before.
- Two targets that moved, one up and one down: "2 targets" and "2 targets moved this session." A target that went down was not counted before.

How far each one moved is said once, in "Since the last round", in the reader's own words ("Your approved facilities went from 4 to 100."), so the tile and that sentence tell one story. The report's tile is built by the same function and reads the same.

Four tests asserted the sum ("+5", "+31 million", "+14", "+2"), which was the defect; they now expect the count. Decided for Hafsah to confirm: the tile counts a target that went down as one that moved.

## Request 107 (e): one count for the sessions, from the board's own clock (2 October)

The header was counted from the open round (`whichRoundIsOpen`: the lowest round somebody has started and not finished), and the screen wrote "Session 2 opened on 30 September" from `date`, which is the day somebody first finished session 2. Two clocks on one board. Also, the board never read `availableFrom`, so `opensOn` was always empty.

Now, in `phaseSpine`:
- `currentSession` is the open round, capped at the last planned session, as the list and Today are since request 97 (a). `plannedSessions` is served beside it. Please draw the header from these two with the prototype's words, "Session 1 of 12." (the engine's own sentence for it is `theHeaderSays` in `board/one-count-for-the-sessions.ts`, and it ends "Session 12 of 12, finished." at the end). I did not serve the header as a sentence on the board, because a privacy test reads the board for a hidden target of 4 and "Session 3 of 4" would have matched it; the numbers carry the same count.
- Each session has `says`, a full sentence from the same open round, and `openedOn`, the day it opened (the earliest day it was made available that has come, or else the earliest day anybody started it, never the day somebody finished it). Please draw `says` in place of building "Session N opened on ...".

What every reader reads (the lead, Rukia and Baraka, an admin who only reads, and the admin who set it up; the lines name nobody), on a weekly check-in of 4 sessions where Baraka has not finished session 1 and Rukia has done session 2:
- Header: "Session 1 of 4."
- "Session 1 opened on 15 September, and it is still open."
- "Session 2 has started for some people, while session 1 is still open."

Once Baraka finishes session 1: header "Session 2 of 4.", then "Session 1 finished on 18 September." and "Session 2 opened on 29 September, and it is still open." A later session reads "Session 3 opens on 7 October." where a day is set, and "Session 3 has not opened yet." where none is.

Decided for Hafsah to confirm: the header follows the open round, so while one person has not finished session 1 the header stays on session 1, and the line for session 2 says it has started for some people.

## Request 107 (c): the fields the boards need (2 October)

Every field below is built from what the record already holds, after the same walls as the rest of the board, so it shows no reader anything they could not already read row by row. Nothing is made up to fill a column.

**1. Each record's "Next", and how it is known.** Each row in `workRecords` now has:
- `known` and `knownSays`: "proof" with "Proof shows it." where a document is behind the line it came from (the same mark every line carries), "said" with "Someone said it." otherwise, and "lead" for a record added on the board: "You added it on the board." to whoever added it, and "It was added on the board, not said in a check-in." to anyone else.
- `next`, `nextKnown` and `nextSays`: only what somebody said they would do about it, which is an open commitment whose words name the record. To the lead and to an admin who only reads: "Baraka Otieno committed to send Eastside Foods the quote with a photo on Friday." To Baraka: "You committed to send Eastside Foods the quote with a photo on Friday." Where nobody has said: `next` is null and `nextSays` is "Nobody has said what happens next." Someone who does not run the check-in reads only their own commitments and those of the person the record belongs to, never the lead's. Where people see only themselves, Rukia reads no row of Baraka's and none of his next steps, as before.

**2. How often a blocker was raised.** Each row in `dependencies` has `raised`: `times`, `firstRaisedAt`, `lastRaisedAt` (days), and `says`. "This has been raised 3 times, from 1 September to 23 September." or "This was raised once, on 3 September." It is counted in the check-ins it was said in, so saying it twice in one check-in counts once. The rows are walled as before: where people see only themselves, Baraka reads only his own.

**3. By area of work.** `byArea`, on a board whose kind of work is known, read from the records this reader is served:
- Where records name an area (a detail said about the record names its site, county, team, queue, branch, region or location, or the record is a county), it is `{ state: "filled", heading: "By team", areas: [{ area: "Westlands", records: 1, says: "Westlands has 1 deal on record." }] }`. The heading is "By site", "By county", "By team", "By queue", or "By area".
- Where none does, it is `{ state: "not-known", why: "Nothing on record says which site, county, team or queue each piece of work belongs to, so the work cannot be shown by area yet." }`.
- Said plainly: **Groundwork keeps no area for a person.** No participant, team or check-in row holds a site, county, team or queue. So "By team" can only come from what people said about each record. The prototype's "By team" counts each team's sales and people "on pace", and that needs a team for each person, which nothing on record holds.

**4. Reported against criteria met, for sales.** `reportedAgainstCriteria`, on a sales board only. **The record holds no criteria.** Nothing says what a deal must show to be at each stage. So it is always `state: "not-known"`, with `why`: "Nothing on record says what a deal must show to be at each stage, so the board counts what people reported and how much of it has a document behind it, but not how many meet the rules." Each stage says what was reported: "1 deal was reported at Won, and it has a document behind it.", "1 deal was reported at Qualified, and it has no document behind it.", "Nobody has reported a deal at Pitched." It never says "criteria met".

**5. Your share, on a participant's board.** `yourShare`, for a participant only: each of their own targets, from the targets they may already read, as `{ objectiveId, says, whoSees }`. To Rukia: "You are aiming for 3 shops in Kilimani. You have 1 of the 3 so far." and "Only you and Amina Wanjiru see your share." Where the lead chose that everybody sees every number: "Everybody in this check-in sees your share." A limit reads "You are at 120,000 so far."; a target with nothing counted yet reads "Nothing has been counted against it yet." The person running the check-in, an admin who only reads, and the admin who set it up get no field. A decision the lead holds about the person is not their share, and the person reviewed on a performance plan reads only their own.

**6. Amani's own aim.** Why it was missed: a participant's check-in went only to the prompt for their own promises, which keeps them as that person's promises, and then returned. The only path that puts a target on the board with somebody's name on it read the lead's check-in alone, so a number a participant set for themselves never reached the board. Now a participant's own counted aim (a target with a plain number and what it counts) is also put on the board as theirs, set by them, in their own words. Rukia reads "Amani Wekesa is aiming for 3 shops in Kilimani." and Amani reads "You are aiming for 3 shops in Kilimani.", where the lead's setting lets them. The prompt for their own promises now also says that an aim for your own number is a target ("I am aiming for 3 shops in Kilimani" is target 3, measure "shops in Kilimani"), because "a wish is not a promise" could have read it as a wish. That prompt is read from the file; no stored version overrides it. It has not been run against the model here (no live keys), so the next scenario run should confirm it.

**Decided for Hafsah to confirm:**
- "By team" comes only from what people said about each record, because no person has a team on record. Should Setup ask for each person's site, county, team or queue?
- "Criteria met" is never claimed. Should the lead set the rules for each sales stage, so the board can count them?
- A participant's own number goes on the board with their name on it, and is read like a number the lead set for them.

Tests: `board/request-107-c-the-fields-the-boards-need.spec.ts` (10 cases), `board/your-share-as-each-reader-reads-it.spec.ts` (10), and `conversation/an-aim-they-set-for-themselves-is-on-the-board.spec.ts` (5). One older test, `each-kind-of-work-has-its-records.spec.ts`, compared whole rows, so it now expects the new fields as well. Nothing in it was taken out.

## Request 105, part 2: blockers get one section (2 October)

Yes, a field is served now, so the screen does not need to put it together from `whoWaitedOnWhom` and `risks`. `blockers` is on `GET /grounds/:id/board`. It has one entry for each open blocker, shown under the same wall as every other wait (`handoffMayBeRead`). A cleared blocker is not in it. Each entry is `{ id, who, name, state, says, raised, proof, timeGiven, wouldClearIt, wouldClearItSays, holdingUp }`:
- `name` is what is waited for, as it was said, for a heading ("the bank statements").
- `state` is "blocking" where the work is stopped and "waiting" where it can carry on in the meantime.
- `raised` holds `times`, `firstRaisedAt`, `lastRaisedAt` and `sessions`, plus two sentences. `says` is "This has been raised 3 times, from 1 September to 23 September." and `inSessions` is "It was raised in sessions 1, 2 and 3."
- `proof.says` is "A document backs what Rukia Mwangi said about it." where a line about the same thing has a document behind it. It is "A colleague confirmed what ... said about it." where a colleague confirmed it. Otherwise it is "Nothing on record proves it yet. It rests on what Femi Okonkwo said."
- `timeGiven` is "The time given for it was "by Friday"." or "No time has been given for it.". Where it was raised again after the day it was due, it adds "It was raised again after 5 September, the day it was due."
- `wouldClearIt` is filled only where somebody made an open commitment about the same thing, and only from somebody this reader may read about. Otherwise it is null, and `wouldClearItSays` is "Nobody has said what would clear it yet." Groundwork never suggests an action here, because a suggestion is not something the record holds.
- `holdingUp` is "Once it is cleared, the reporting system can restart.", only where that was said with the blocker.
The ones raised most often come first, then the oldest. Please draw each sentence as it is. Do not use "Raised:" or "Would clear it:" labels.

What each reader reads on the sales run (re-f):
- Bisi, who runs it: "Femi Okonkwo is waiting for the bank statements." "This was raised once, on 16 September." "It was raised in session 2." "Nothing on record proves it yet. It rests on what Femi Okonkwo said." "No time has been given for it." "Femi Okonkwo said, "I will visit a few of them again this week to see if I can collect the statements myself."" Also "Ngozi Eze is waiting on Mr. Adebayo for a date for the credit decision." with "Nobody has said what would clear it yet.", and "Kwame Mensah is waiting on you for the approval of five applications."
- Femi: "You are waiting for the bank statements." "Nothing on record proves it yet. It rests on what you said." "You said, "I will visit a few of them again this week to see if I can collect the statements myself.""
- Kwame: "You are waiting on Bisi Adeyemi for the approval of five applications."
- Ngozi, where people see only themselves: only her own blocker. Nothing about Femi or Kwame reaches her.
- An admin who only reads, and the admin who set it up: the same as Bisi, with names ("Kwame Mensah is waiting on Bisi Adeyemi for the approval of five applications.").
- An admin with no access to a performance plan is not served that board at all, as before.

Tests: `board/request-105-blockers-as-each-reader-reads-them.spec.ts` (13 cases). All of them fail without this change.

## Request 105, part 3: a participant's board is their own (2 October)

`GET /grounds/:id/board` now sends a person who checks in a narrower board, as in the prototype's B5. It is also the more private choice. Decided for Hafsah to confirm.

**Who it is for.** Anybody who checks in and does not run the check-in. That includes a colleague giving a view on an evaluation check-in. The lead, the admin who set it up and an admin of the organisation read the board as before. The person reviewed on an evaluation check-in keeps the board they had, which their own rules had already narrowed.

**What they are sent.** The board is built from a list of what a participant may have, so a field added to the board later reaches a participant only when somebody adds it to that list (`board/a-participants-board-is-their-own.ts`).
- The frame: the title, the sessions, the list of people, `howItIsGoing`, who is away, when the board last changed, and the poll.
- Their own work, row by row. `workRecords` holds only the records that are theirs, and each section has `onlyYours: "Only yours."`. Please draw it under "Your deals, day by day". `objectives` holds their own targets and the team's (a target with nobody's name on it), and never anybody else's. `yourShare` is as before.
- Their own commitments, waits and history. Before these sections are built, the board's reader is set to "only you" for a participant, so `workPlan`, `risks`, `timeline`, `personHistory`, `blockerCheck`, `whoWaitedOnWhom`, `obligations`, `evidenceIndex` and `contradictions` hold only their own rows. `blockers` holds the waits they are in, whichever side they are on. `whoOwnsWhat`, `contribution`, `coverage` and `stillUnanswered` hold only their own row.
- The team's picture, only once the report has been released. That means `divergence`, `quickRead`, `forecast`, `whatTheAnswersSay`, `whatTheRoomIsAbout` and the opening in `howItIsGoing.latestSummary`. Before release they are not sent, and `teamPicture` is `{ shared: false, says: "Today's team picture is not shared yet.", yourOwnReport: "Your own report is ready now." }`. The `yourOwnReport` line is sent only when they have finished a check-in. Once the report is released, `teamPicture` is `{ shared: true }`.
- `theJudgement`, `theTable` and `overTime` are sent as null, as before.
- They are no longer sent `decisions`, `checkInGrid` or `cascade`. They never got `eachPerson`, `leadActions` or `questionsForTheLead`.

What Femi reads on the sales run (re-f), before the team picture is shared, where people see each other:
- "Today's team picture is not shared yet." and "Your own report is ready now."
- His own deal only, under "Only yours."
- "Only you and Bisi Adeyemi see your share."
- "In session 2, you said, "I will visit a few of them again this week to see if I can collect the statements myself." The time you gave for it was "this week". Nobody has said yet whether it happened."
- "You are waiting for the bank statements."
- Nothing of Kwame's or Ngozi's: not their deals, numbers, waits or words. Their names are only in the list of people.

Where people see only themselves, Ngozi reads "You are waiting on Mr. Adebayo for a date for the credit decision." and nothing about Femi or Kwame. On a performance plan, Kwame, a colleague giving a view, reads only his own deal and is told the team picture is not shared yet. Femi, the person reviewed, reads what he read before.

A blocker's `wouldClearIt` is still shown to both people in the wait: Rukia, who is waiting on Baraka, reads "Baraka Otieno committed to ship the pipeline fix on Monday." A promise from anybody else, the lead included, is not on her board.

**Tests changed, and why.** These tests read a participant's board for sections a lead gets, which was the behaviour this changes. Each now checks the narrower board, and that nothing of anybody else reaches the participant. No privacy check was removed: where a test said a participant reads something without a hidden thing in it, it now says the participant is not served it at all.
- `the-movement-tile-tells-the-same-story` and `a-worry-on-the-tile-is-said-as-theirs`: a participant gets no tile before release. Their own report still tells them what moved.
- `a-forecast-on-the-board`: a participant reads the team's forecast only once the report is released.
- `obligations-on-the-board`, `a-work-plan-on-the-board`, `a-goal-the-lead-has-not-told...` and `the-handoff-quote-is-their-words`: only their own side, own lines and own waits. The lead's commitments are not on their board.
- `each-kind-of-work-has-its-records`, `who-said-a-record...` and `request-107-c`: only their own records.
- `their-own-words-stay`, `what-each-person-said-is-in-their-name`, `what-the-lead-has-not-shared-reaches-nobody` and `reports/the-four-marks-as-each-reader-is-served`: only their own row of who owns what.
- `request-107-b`: a participant is not sent the lead's list of decisions. Their wait is in their blockers.
- `reports/decision-17-wins-over-the-leads-switch`: who is on the check-in is read from the list of people, not from the grid of who checked in.
- `__fixtures__/a-page-that-contradicts-itself`: both reports are marked released, as they were on the run, so the participant checks there still read the team picture.

Decided for Hafsah to confirm:
- Records with nobody's name on them, such as a matter's parties or a deal the lead added, are not on a participant's board. Only theirs are.
- The quick read and the forecast count as the team's picture, so a participant gets them only once the report is released.
- `howItIsGoing.glance` (rounds, how many have answered, how many things are in the way) stays for everybody, as on the list of check-ins.

Tests: `board/request-105-a-participants-board-is-their-own.spec.ts` (13 cases).

## Request 105, part 1: five kinds of work get their own board shape (2 October)

Yes, these five are meant to have their own board, and they have it now. The other six kinds keep the switchboard, which is what their own examples show. The engine knows a check-in's kind from `Ground.kindOfWork` (`board/the-kind-of-work.ts`), and the board already sends it as `kindOfWork`. For these five, `GET /grounds/:id/board` now sends extra fields, under the prototype's headings. They are built from the board this reader is already sent, after every wall, so they show nothing a reader could not already read row by row. Nothing is made up: where the record holds nothing for a section, it says so in a sentence. The fields go only to whoever runs the check-in, meaning the lead, the admin who set it up, and an admin of the organisation on a check-in that is not an evaluation. A person who checks in reads their own board (part 3). The person reviewed on an evaluation check-in is never told how many others answered or are waiting (decision 17). Code: `board/each-kind-gets-its-own-board.ts`.

Each section is `{ heading, state, ... }`. `state` is "filled", or "none-yet" with `says`, or "not-known" with `why`. Please draw the heading, and then the sentences as they are.

**(a) A government programme** (`kindOfWork: "a government programme"`):
- `whatEachLevelUnderstood`: the aim that was set comes first, then each person's own words for what the aim is, from what they said. `levels: [{ participantId, who, said: [...] }]`. To Stephen, who runs the rollout run (run-21, implementation): "You" with "The system is deployed in all four branches.", then "Ngozi Duru said, "My team understood that we were supposed to integrate the new system into our daily operations."" and "Musa Ibrahim said, "My understanding was that we were meant to get the new system installed and start using it for our daily operations."" `note`: "Groundwork does not keep which level each person works at, so each person's own words are shown in the order they joined, after the aim that was set." Where nobody has said: "Nobody has said yet what the aim means to them."
- `theCounties`: each county record, with the project records that name it. "The project on record for Enugu is Receipts on the new system." Or "Kiambu has no project on record yet.", or "No county is on record yet."
- `whatTheVisitLogShows`: the numbers brought in from another system for what this check-in is about. These are `ProductMetric` rows whose `subjectExternalId` is the check-in's own. For example: "The visit log shows 412 for extension visits this month, as of 30 September." The three sentences about what a number is not come with them, as in the report. Where none are attached: "No numbers from another system are attached to this check-in yet, so the board cannot say what they show. They appear here once they are brought in from the system that keeps them."

**(b) Asset loans:**
- `whereTheCohortStands`: on the loan cohort (re-f), to Amaka, who runs it: "4 people are in this cohort." Then "The loan records show 2 loans being repaid." (Sunday Eze, Hauwa Ibrahim), "The loan records show 1 loan behind on repayment." (Yakubu Sani), "1 person is waiting on something that stops them, and it has not been cleared." (Musa Danjuma), and "1 person has not checked in yet." (Yakubu Sani). The names are in `who`. They come from the loan records' stages, the open blockers and who has finished a check-in. Without loan records: "No loan record says who is repaying or who is behind yet."
- `supportGiven`: always "not-known", with "Nothing on record says what support each person was given, or whether it helped, so this cannot be shown yet."

**(c) A law firm matter:**
- `whereTheMatterStands`: on the contract review (run-21): "The reply to the supplier is due on 2 October." "Nothing is in the way that has not been cleared." "1 thing is waiting for a decision."
- `whatYouNeedToDecide`: the board's own decisions under this heading. The heading is "What you need to decide" to the lead and "What needs deciding" to anyone else. For example: "People in this check-in said different things about what the service agreement means, so it needs settling."
- `whatChangedThisWeek`: what was said in the newest session, as served in who owns what, with its mark. "In session 1, 2 things were said about the matter." Then "Frank Mbeki said, "The supplier has acknowledged every ticket within two hours so far."" and "Frank Mbeki said, "Three fixes have taken over a week."" `cannotTell`: "Nothing on record links each change to what it changed, so this shows what was said in the newest session and how each line is known."
- The handover page: there is no handover page for a check-in today. The handover brief belongs to a role that is changing hands across the organisation, not to a check-in. So no link is sent, and nothing is made up to stand in for one.

**(d) MarketView where next:**
- `byWhoTheyAre`: "not-known", with "Groundwork does not keep which group each person belongs to, such as processors, distributors or researchers, so the answers cannot be shown by group yet." and `says`: "1 of 2 people have answered."
- `whereTheyDisagree`: the board's own `divergence` items, under this heading. Or: "Nobody has said anything that differs from what somebody else said yet."

**(e) MarketView Q4:**
- `whatTheSystemsShow`: the same numbers as (a). On the sales run with a number brought in: "The loan system shows 11 for approved facilities this quarter, as of 30 September." With none, the same "not-known" sentence as (a). **No system data exists in the record today unless it is brought in.** Groundwork does not connect to Paystack or MarketView itself. Numbers reach a check-in only as `ProductMetric` rows for the check-in's `subjectExternalId`, so on our test check-ins this section says that nothing is attached. No number is made up.
- `whereWhatWasSaidAndTheSystemsDiffer`: each line somebody said where a document on the check-in says it differently. This is the record's own `documentSays`, and it is shown only where this reader may open that document. "Kwame Mensah said, "I've also had follow-up conversations with all 22 of my applications."" with "A document on this check-in says it differently. It says, "14 applications were followed up in September."" A document only Kwame may open is quoted to nobody else. With none: "Nothing anybody said differs from a document or a number on record yet."

Not built, and why: "Where next, ranked" (mvnext) would rank the priorities by how many people named each. The records keep one row per priority, with no count of who named it, so it is left out rather than ranked on nothing. "The meaning changed here" (gov) is a judgement about two people's words, and nothing on record makes it. The lead reads the words side by side.

Decided for Hafsah to confirm:
- These fields go only to whoever runs the check-in.
- The visit log and the systems are only the numbers brought in for the check-in's subject.
- Should Setup ask for each person's level (gov) and group (mvnext), so the board can show them? Today nothing on record holds either.

Tests: `board/request-105-each-kind-gets-its-own-board.spec.ts` (23 cases, on the real run text named above, as every reader). This includes a walk of every sentence in the five through the plain-sentence rules.

## Request 105: the glance names nobody a reader may not read (2 October)

`howItIsGoing.glance` is the header line ("N things are in the way, the oldest being ..."). It used to be worked out once for the whole team and sent to every reader. It is now cut to what each reader may read (`theGlanceAsThisReaderMayReadIt` in `grounds/what-a-manager-needs-at-a-glance.ts`). The cut applies to three kinds of reader:
- a participant on a check-in where people see only themselves;
- anybody on an evaluation check-in who does not run it: the person reviewed, a colleague giving a view, and an admin without access;
- that admin also on the list (the board already refuses them).

For those readers, `inTheWay` is counted and named from their own waits only: the ones they wait on, and the ones waiting on them. `progress.waitingOn` holds only themselves. The rounds and the answered counts stay, because they name nobody. The lead, the admin who set it up, and an admin of the organisation on a check-in that is not an evaluation read the whole team, as before. The check-ins list follows the same rule (`grounds.service`, `list`). Today is built from that list, so it follows too.

Before and after, on the sales run (re-f), where Femi's wait for the bank statements is the oldest:
- Ngozi, where people see only themselves. Before, she read 3 things in the way, the oldest being "the bank statements", and `waitingOn` ["Bisi Adeyemi", ...]. Now she reads 1 thing, the oldest being "a date for the credit decision", and `waitingOn` [].
- Kwame, where people see only themselves, and as a colleague giving a view on a performance plan. Before, 3 and "the bank statements". Now, 1 and "the approval of five applications".
- Femi, the person reviewed on a performance plan, where Ngozi's wait is the oldest. Before, 3 and "a date for the credit decision". Now, 1 and "the bank statements".
- Bisi, Juma (an admin who only reads) and the admin who set it up: 3 and "the bank statements", unchanged.
- On the list, where people see only themselves, Miriam used to be given 0 things in the way, her own included. Now she is given 1, "the delivery van". On a performance plan the list used to give her and Omar the whole team, 2 things, the oldest being Omar's "the new price list". Now each is given only their own. An admin without access is given 0 and no name.

Tests: `board/request-105-the-glance-names-nobody-walled.spec.ts` (10 cases) and `grounds/request-105-the-list-glance-names-nobody-walled.spec.ts` (6 cases). One older list test expected a walled participant to be given no blocker at all, her own included. It now expects her own wait, still with no name: "A colleague's login for the order system".

## Request 105: "1 of 2 people has answered" (2 October)

In "N of M people ...", the verb now goes with N and the noun with M. Every sentence of that shape on the board and in the reports is said through one helper, `someOfThemHave` (`reports/some-of-them-has-or-have.ts`).
- By who they are (mvnext): "1 of 2 people have answered." is now "1 of 2 people has answered."
- The report's basis line: "1 of 3 people have answered this session." is now "1 of 3 people has answered this session." It used to say "has" only when M was 1.
- Over time: "1 of 4 people have not answered yet, so anything about them is missing rather than absent." is now "1 of 4 people has not answered yet, so ...". It used to always say "have".
- Do the parts add up: "1 of 3 people have a number of their own, so ..." is now "1 of 3 people has a number of their own, so ...". It used to always say "have".
- How much there is to go on: it was already right ("1 of 4 people has not answered yet."), and it now goes through the same helper.
The opening's "One of the 5 people has answered so far." was already right and is unchanged.

Tests: `reports/some-of-them-has-or-have.spec.ts`. The mvnext case in `board/request-105-each-kind-gets-its-own-board.spec.ts` now expects "1 of 2 people has answered.".

## Request 106: the kind of work can be set back to none (2 October)

The route already takes it, so nothing on the server had to change, and a test now holds it. Send `{ "kind": null }` to `PATCH /grounds/:id/kind-of-work`. The check-in then has no kind of work, and the board sends `kindOfWork: null` and the records say "Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind." The client's `setKindOfWork(id, { kind: null })` already sends it.

- Who may clear it is exactly who may set it: the lead, or an admin of the organisation (on an evaluation check-in, only an admin with access). Anybody else is refused with "Only the lead of this check-in, or an admin in this organisation, can change this.", and nothing changes.
- A none the lead chose is the lead's own choice, like a kind they chose. A later read of the setup words never puts a kind back over it.
- Sending only `stages` leaves the kind as it is.
- A word that is not one of the eleven, "none" included, is still refused in a plain sentence. Please send `null` for "None of these".

Tests: `grounds/request-106-the-kind-of-work-can-be-cleared.spec.ts` (6 cases), including one that passes `{ "kind": null }` through the app's own validation, as the route receives it. They pass on the code before this test, because the route already allowed it.

## Request 108 (c): each record row carries its mark (2 October)

Each row in `workRecords[].rows` now has `mark`, in the shape `ProofMark` already reads: `proven`, `confirmed`, `said`, `memory` or `none`. It is the mark of the line the record came from, by the same rule that marks every line on the board and in the reports (`reports/how-a-line-is-known.ts`):
- `proven`: a document or photo the person themselves added is behind the line.
- `confirmed`: the colleague who received the work said it arrived.
- `memory`: a line about what happened, with a figure, and nothing of the person's own attached.
- `said`: anything else somebody said.
- `none`: a record added on the board, which no line is behind.

Nothing upgrades it. A line backed by somebody else's document is not proof of it: Femi's "I have 31 applications that I've taken from businesses." with the lead's pipeline sheet behind it is `memory`, never `proven`. `known` and `knownSays` are as before ("Proof shows it." or "Someone said it."), so the prototype's key, "Ringed is someone's word; filled is proven", can be drawn from `mark`: filled for `proven`, ringed for the rest, and nothing for `none`. The rows are walled as before: a participant reads only their own rows with their marks.

What each reader reads on the sales run (re-f): Bisi, Juma (an admin who only reads) and the admin who set it up read every row with its mark, "Ikeja Bakery" `proven`, "Jos Grain Traders" `memory` (Kwame's "That N8 million disbursed represents three approved facilities."), "Lekki Cold Rooms" `confirmed`, and the deal Bisi added on the board `none`. Femi reads only his two rows. Ngozi, where people see only themselves, reads only hers.

Tests: `board/request-108-c-each-record-row-carries-its-mark.spec.ts` (8 cases; all fail without this change). `each-kind-of-work-has-its-records.spec.ts` compares whole rows, so it now expects `mark` as well; nothing in it was taken out.

## Request 108 (a): the headline question, with its answer and its bar (2 October)

`GET /grounds/:id/board` now sends `headline`: `{ question, answer, bars }`. Please draw `question` above everything else in the largest type, `answer` under it, then one bar for each entry in `bars`, and then `howItIsGoing.latestSummary` as now.

**How it is built.** Only from the check-in's own team aims, meaning the targets with nobody's name on them, in the lead's own words for what is counted, with their number. Up to two are asked together, as in the prototype's "Will MarketView reach 40 paying subscribers and 200 weekly users this quarter?". A time in the aim's own words ("this quarter") is kept. Otherwise the check-in's own deadline is added ("by 30 November"). Where no team aim has a number, an aim with no number is asked only where it is said as something to do and the check-in has a deadline ("Will we replace the payments integration by 31 October?"). An aim stored as a sentence about somebody ("They want to get 12 shops onboarded.") is never turned into a question. Where nothing qualifies, no `headline` is sent, and nothing is made up. A limit is asked as a limit (decision 69).

- `answer` is one or two plain sentences from the counts the board already serves, or null for an aim with no number.
- Each bar is `{ objectiveId, kind: "aim" | "limit", now, target, filled (0 to 100), word }`. `word` is the target's word from part (b).

**What each reader reads on the sales run (re-f).** Bisi said "We're aiming for 40 approved facilities and N120 million disbursed this quarter."; the team was at 11 and 31 million after session 2.
- Bisi, who runs it, and the admin who set it up: "Will we reach 40 approved facilities and 120 million naira disbursed this quarter?" and "So far it is 11 of the 40 approved facilities. 29 more are needed. So far it is 31 million of the 120 million naira disbursed. 89 million more are needed." Bars: 11 of 40 (15%), 31 million of 120 million (12%), both "Behind".
- With one aim and no time in its words: "Will we reach 40 approved facilities by 30 November?" and "So far it is 11 of the 40 approved facilities. 29 more are needed by 30 November."
- A limit, from the workplan run: "Will we keep spending within 180,000 this quarter?" and "So far it is 254,000, which is 74,000 over the limit of 180,000."
- Femi, Ngozi and Kwame, who check in: only where everybody sees the targets (decision 73), and only once the team picture is shared (request 105, part 3). Then they read the same question, about the team's aims only, never a colleague's number. Where each person sees only their own numbers, or before the picture is shared, it is not sent.
- Juma, an admin who only reads: not sent, as he is not sent the aims and limits (decisions 58 and 73), the same as the forecast.
- On an evaluation check-in nobody is sent it: not the lead, not the person reviewed, not a colleague giving a view.

## Request 108 (b): a word for where each target stands (2 October)

Each row of `objectives` now has `stands`: `{ word, says }`, or null. Please draw `word` as the short chip and `says` where the reader opens it. `word` is one of the prototype's own words: "Met", "On time", "Close", "Behind", "Within", "Over limit", "Not settled", or null with `says` saying why there is none.

**The thresholds** (`board/the-headline-and-where-each-target-stands.ts`, `CLOSE_MEANS_AT_LEAST = 0.9`):
- For an aim to reach, the pace between the first and the latest count stored when sessions closed is carried forward to the check-in's last session, in a straight line, exactly as the forecast does.
  - "Met": the count has reached the aim.
  - "On time": at that pace it reaches the aim by the last session.
  - "Close": at that pace it covers at least 90% of the way from where it started to the aim.
  - "Behind": at that pace it covers less than 90% of the way.
  - Once the last session has been counted, the count itself is where it ends: 90% of the way or more is "Close", less is "Behind".
- For a limit not to go over: "Within" at or under the limit, "Over limit" above it.
- "Not settled": the lead wrote down that what this number counts is not settled.
- No word: fewer than two sessions counted ("It needs a count from two sessions before its pace can be read, so how it stands cannot be said yet."), no planned last session ("This check-in has no planned last session, so its pace cannot be read against one."), or nobody has said which way the number goes ("Nobody has said whether 40 is something to reach or a limit not to go over, so how it stands cannot be said.").

**About a target, never a person.** Only a team target gets a word. A target with somebody's name on it, or a decision about a person, has `stands: null`, the same reason the forecast leaves it out. Nothing is built on an evaluation check-in. Who reads it is the same as part (a): whoever runs it, a participant only where everybody sees the targets and only once the team picture is shared (before that, `stands` is null), and not an admin who only reads.

To Bisi, on the sales run: approved facilities "Behind", "At the pace it has kept since session 1, it would be about 31 by the last session, short of the aim of 40."; disbursed "Behind", "At the pace it has kept since session 1, it would be about 79 million by the last session, short of the aim of 120 million."; Femi's and Kwame's own targets have no word. Where Bisi wrote "Whether the 120m counts what was approved or what was disbursed.", disbursed reads "Not settled", "What this number counts is not settled yet, so how it stands cannot be said."

Decided for Hafsah to confirm:
- "On time" is used for a target on pace but not yet reached. The prototype's examples show no such target; in eng.txt "On time" is the name of a target, not a word.
- A person's own target gets no word, as the forecast gets none.
- The headline goes to the same readers as the forecast: not to an admin who only reads.
- Up to two team aims are asked in one question; the others are under "Where each target stands".

Tests: `board/request-108-the-headline-and-where-each-target-stands.spec.ts` (22 cases, as every reader). The board cases fail without this change.

## Request 108 (d): "Where this is heading" and "Record the decision" (2 October)

Yes, it survives, built only from what the product already records. `GET /grounds/:id/board` now sends `whereThisIsHeading` to whoever runs the check-in.

**What the product already had.** The lead closes a check-in by recording one of the endings its situation offers, with a reason (`POST /grounds/:id/resolution`, `END_STATES` in `resolution/end-states.ts`, decision 6). The lead also writes down what is still to decide, which the board serves in `decisions`. Nothing new is stored. Code: `board/where-this-is-heading.ts`.

The field is `{ heading, about, outcomes, outcomesSays, signals, signalsSays, whatWouldSettleIt, whatWouldSettleItSays, whoDecides, groundworkDoesNotChoose, recordTheDecision, decided }`:
- `heading`: "Where this is heading". `about`: the situation's own name, for example "Set goals and keep the team on track".
- `outcomes`: exactly the endings "Record the decision" offers for this check-in, as `{ value, says, more }`. Nothing else is listed, and none is ranked or chosen. Where there are none, `outcomesSays` is "Nothing on record names the possible outcomes for this check-in yet."
- `signals`: sentences this reader is already served on the board, each with where it comes from: the forecast of a team number, the blockers, and how many things people said different things about. They are not tied to one outcome, because nothing on record ties them. With none: "Nothing on record points towards one outcome or another yet."
- `whatWouldSettleIt`: what the lead wrote down as still to decide, in the lead's own words. With none: "Nothing on record says yet what would settle it."
- `whoDecides`: the lead. `groundworkDoesNotChoose`: the prototype's own sentence.
- `recordTheDecision`: "Record the decision", to the lead only, the one person the resolution route lets record it, and only while nothing is recorded. Please open the existing ResolutionPanel from it. Once recorded, `decided` says which ending and when.

**What Bisi reads on the sales run (re-f):**
- "Where this is heading". "Set goals and keep the team on track".
- The possible outcomes: "OKRs aligned to company direction.", "Gaps identified, revision needed.", "Not yet, more sessions needed."
- The signals: "The team is aiming for 40 approved facilities this quarter. If it keeps moving at the pace it has since session 1, it would be about 31 by session 6, against an aim of 40." with "It was 6 in session 1 and 11 in session 2, and this check-in runs for 6 sessions."; "Femi Okonkwo is waiting for the bank statements." with "This was raised once, on 16 September."; "Ngozi Eze is waiting on Mr. Adebayo for a date for the credit decision." with "This was raised once, on 16 September."
- What would settle it: "Whether to take the credit committee delays to the Head of Credit." with "You wrote this down as still to decide."
- "You decide." "Groundwork lays out the outcomes and the proof. It doesn’t choose." "Record the decision".
- Once recorded: "You recorded the decision on 30 September. The outcome is "Not yet, more sessions needed"."

The admin who set it up reads the same with "Bisi Adeyemi decides." and "Bisi Adeyemi wrote this down as still to decide.", and no "Record the decision". Juma, an admin who only reads, is not sent it (decision 58: not the lead's list, not the aims). Femi, Ngozi and Kwame are not sent it, before or after the team picture is shared, as in the prototype's participant board. On an evaluation check-in nobody is sent it: the endings there are about a person ("Separation agreed"), and the suggestion, its reasons and the decision already have their own way (decision 6).

Decided for Hafsah to confirm:
- The possible outcomes are the endings the resolution flow offers, said with a comma where the stored label has a dash. Some of those labels are not plain words ("OKRs aligned to company direction"). They are shown on the resolution panel too, so changing them is a separate decision.
- It is sent all through the check-in, as in the prototype, not only near the end. Decision 70 still decides when the resolution panel itself opens.
- Not on an evaluation check-in, and not to an admin who only reads.

Tests: `board/request-108-d-where-this-is-heading.spec.ts` (9 cases, as every reader). The board cases fail without this change.

## Request 108: the year in the board's dates follows the board's own clock (2 October)

The headline's deadline and "Where this is heading"'s recorded date leave out the year only where it is the year of the clock the board is read at, never the machine's own clock. In the product that is the moment the board is served; in tests it is the clock the test gives (`THE_BOARDS_CLOCK` in the board harness, 2 October 2026, unless a spec sets its own), so a test reads the same every year. Read in January 2027, the same board says "Will we reach 40 approved facilities by 30 November 2026?" and "You recorded the decision on 30 September 2026."

## Decision 75, items 2 and 25: who reads an evaluation check-in, and a probation is one (2 October)

**A probation or a first 90 days is now an evaluation check-in (item 25).** The list in request 78's answer above grows from three to four: `PIP`, `RECOGNITION`, `CONTRACT_RENEWAL` and now `NEW_HIRE`. `EVALUATION_SCENARIOS` in `api/src/modules/reports/is-this-an-evaluation-check-in.ts` already carries it. If the screens keep their own copy of the three (for example to leave the admins line out of an invitation), please read `NEW_HIRE` as one of them. What changes on a `NEW_HIRE` check-in, served by the engine:
- An admin who was not given access (does not run it, did not set it up, does not take part, and was not asked to approve it) cannot open it or see it listed, and is refused its board, reports, outcome and weekly report, as on a performance plan.
- A suggestion can be reached there (the ending page, the review, the You board, as for Kwame in the prototype).
- The person reviewed is never named a colleague who gave a view, whatever the lead switched, and `whyThePersonReviewedIsNotTold` now carries "On a check-in about one person, that person is never told who else gave a view." for these check-ins. By default nobody on it is named to each other (`peersDefaultVisible` is false).
- The person reviewed reads no one else's exact words on the board and in reports, as on a performance plan.
- The board keeps the shape it had for a new person starting. Nothing on the screens needs to change for that.

**The admin asked to approve an evaluation check-in reads it (item 2).** While a performance plan, promotion, renewal or probation waits for an admin to accept it (`status: AWAITING_APPROVAL`), every admin of the organisation now sees it in `GET /grounds/awaiting-approval`, can open it, its board and its outcome, and can approve or decline it. Once it is decided, only the admin who decided keeps reading it. They read it as an admin with access does, but cannot change its setup. Nothing new to send.

## Decision 75, item 24: a suggestion says when the person caught up (2 October)

Every suggestion shape now carries `caughtUp`: null, or one sentence to show under the suggestion, for every reader of it. A suggestion nobody has decided keeps the facts it was reached on; if, before anyone decides, the person is back at or above the line that reached it, the lead (and an admin deciding an appeal) reads "Kwame has caught up since this was suggested. Since Thursday 1 October, Kwame has kept as many of the commitments made in this check-in as Groundwork looks for.", and the person reads "You have caught up since this was suggested. Since Thursday 1 October, you have kept as many of your commitments in this check-in as Groundwork looks for." It is on `GET /grounds/:id/suggestions`, the ending page (`theEndingPage.suggestions`, `aboutYou`, `appealed`), the review's `suggestion`, the You board's suggestions about you, and an admin's appeals. Please show it as it comes, beside the original facts, never in their place.

## Decision 75, item 46: a participant's one line is their own waits (2 October)

`howItIsGoing.glance.inTheWay` on the board, and `glance.inTheWay` on the check-ins list (which Today reads), are now counted and named from the reader's own waits for every participant who does not run the check-in, also where people see each other. A wait the reader has on a named colleague still says whose ("Omar's login for the order system") where people see each other. Whoever runs it, the admin who set it up, and an admin who only reads still get the team's. Nothing new to send; the fields are the same.

## Decision 75, item 13: the lead's brief is never quoted to a participant (2 October)

A participant (and anybody else who does not run the check-in) is no longer served any sentence of the lead's brief. `brief` on the check-ins list, `briefAsEveryoneReadsIt` on `GET /grounds/:id`, and `brief.says` in a session now carry only the short version the lead confirmed (`toldToParticipants`), and are `null` where there is none, where they used to fall back to the brief's own situation sentences. The goals they may see still come with it. On a team update the lead's one line is still served, because it is the question everybody is asked. Please show nothing in "About this check-in" where it is `null`, rather than an empty box. The lead still reads the whole brief as before.

## Decision 75, item 14: where people do not see each other, one person's circumstances stay their own (2 October)

On a check-in where people do not see each other (a cohort, or the lead's switch off), a participant's report and board (everything that comes through the report: `sharedPicture`, `theOpening`, `sharedPictureLines`, `agreements`, `divergences`, `whatTheAnswersSay` and the rest) no longer carry any sentence about one colleague. They keep the counts ("All nine people have answered."), the patterns across people ("A common experience was a delay between receiving the asset and generating income."), the lead's sentences, and the reader's own ("Your goal was ..."). A list item about one colleague is dropped whole, not half-emptied, so a list can be shorter or empty. The lead and an admin read it whole. Evaluation check-ins keep their own rule (decision 17). Nothing new to send.

## Decision 75, item 33: the Movement tile says "changed" (2 October)

The Movement tile's line now says "changed", not "moved", because a target that went down is counted too. The value is unchanged ("1 target", "2 targets", "None"). What each reader reads:
- The lead, and a person whose own target changed: "1 target changed this session." (before: "1 target moved this session.").
- Two targets, one up and one down: "2 targets changed this session."
- A colleague who may not read that number, and an admin outside the check-in: "No target changed this session." (before: "No target moved this session.").

The report's tile is built by the same function and reads the same. `TheSessionsReport.tsx` matches the old words in a case-sensitive pattern that never matched; please match "No target changed this session." if you keep that branch.

## Decision 75, item 48: the endings are plain sentences, on both panels (2 October)

Every ending in `END_STATES` (`api/src/modules/resolution/end-states.ts`) is now one plain, full sentence that says what happened. That file is the one place they live. The resolution panel's `options` (`GET /grounds/:id/resolution`) and the board's `whereThisIsHeading.outcomes` both read from it, so both panels read the same sentence. The values are unchanged, so nothing stored changes.

Some of the new sentences, with what they replace:
- "OKRs aligned to company direction" is now "The team's goals match where the company is going."
- "Gaps identified - revision needed" is now "Gaps were found, and the goals need to be changed."
- "Not yet - more sessions needed" is now "It is not settled yet, and more sessions are needed."
- "Keep the hire", "Restructure the role", "Let them go" and "Extend evaluation period" are now "The new person stays in the role.", "The role is set up differently.", "The new person leaves the role." and "The time to decide is made longer."
- "Descope" is now "The project carries on with less in it."
- "Separation agreed" is now "Both sides agreed that the person will leave."

Once decided, the board says "You recorded the decision on 30 September. The outcome is that it is not settled yet, and more sessions are needed." (before: `The outcome is "Not yet, more sessions needed".`).

Fixed on the way, in the same places:
- A door that refuses someone after the end (the join link, the preview, a new person, a plan) said "This check-in ended: keep.", the stored value after a colon. It now says "This check-in has ended. The new person stays in the role."
- The review's line now reads "Wairimu made the decision at the end of “Kwame, first 90 days” on 20 September 2026, and said why, “He needs another month on the supermarket accounts”. The outcome is that the time to decide is made longer."
- The closing emails kept their own drifted copy of the labels ("Part ways"). They now read the same list: "Kwame, first 90 days has been closed. The outcome is that the new person stays in the role." and "Wairimu Kamau suggested how this ends." followed by the ending.

For the screens: `client/src/lib/end-states.ts` mirrors the server file and is imported by nothing but its tripwire spec. I updated its labels, and the tripwire's sanity line, so `end-state-mirror.spec.ts` still passes. Please keep the server's wording if this touches your own changes there. If the panel adds its own full stop to a label, please stop, because each one now ends with one.

## Decision 75, item 37: a person's own aim is said as their own (2 October)

A target a person set themselves in their own check-in (they hold it, they said it, and they do not run the check-in) was read exactly like a number the lead set for them. It is now said as theirs, everywhere it is shown. Nothing new to send; the sentences in the fields you already draw have changed.

- The board, `objectives[].name`: Rukia reads "You set yourself an aim of 3 shops in Kilimani." (before: "You are aiming for 3 shops in Kilimani."). Amina, who runs the check-in, reads "Rukia Mwangi set an aim of 3 shops in Kilimani for their own work." (before: "Rukia Mwangi is aiming for 3 shops in Kilimani."). A number Amina set for Baraka still reads "Baraka Otieno is aiming for 5 visits a week.", so the two are told apart. No pronoun is guessed.
- `yourShare[].says`: "You set yourself an aim of 3 shops in Kilimani. You have 1 of the 3 so far."
- The weekly report's figure: `of` is "3 shops in Kilimani, an aim you set yourself" to Rukia and "3 shops in Kilimani, an aim Rukia Mwangi set for their own work" to Amina; `says` starts "You set yourself an aim of 3 shops in Kilimani." (before: "I am aiming for 3 shops in Kilimani, your own number" and "I am aiming for ..."). An earlier week kept before this reads as it did.
- Today and "since the last round": "Your shops in Kilimani went from 0 to 1, against your own aim of 3." and to Amina "Rukia Mwangi's shops in Kilimani went from 0 to 1, against Rukia Mwangi's own aim of 3."
- In a check-in, "About this check-in" tells Rukia "You set yourself an aim of 3 shops in Kilimani." A colleague who may read it is told "Rukia set an aim of 3 shops in Kilimani for their own work." (before: "Your lead is aiming for 3 shops in Kilimani.", which was untrue), or "A colleague set ..." where names are not shared.

Who reads it is unchanged: the person themselves and whoever runs the check-in; a colleague only where everybody sees every number, and never on a colleague's own board (request 105, part 3); not an admin who only reads.

## Decision 75, item 5: a blocker that crosses teams says which team it waits on, and since when (2 October)

`GET /grounds/:id/blocker-trace` now has one more field on each trace: `waitingOn`, one sentence or null. Please show it under the steps, where `whereItStarted` would be.

- Wairimu runs Sales and cannot open Finance's or Leadership's check-ins. She reads the Sales steps only, as before, and now "This is waiting on Finance since 14 September." No Finance step, no Finance person and no Finance check-in name is served. The team is the word Miriam used for it in Sales, and the day is when she asked, so nothing is read from Finance's check-in.
- Where the person in Sales named no team, it reads "This is waiting on another team since 14 September."
- Where the chain started in Finance (its first step is not hers to read), she used to get nothing. She now gets her own steps and the sentence, but only where the person in Sales named the team. Otherwise nothing, as before.
- Miriam and Brian, in Sales where people see each other, read the same as Wairimu.
- In a check-in where people do not see each other, a person reads this only about their own wait, never a colleague's.
- An admin who may open every check-in reads every step and `whereItStarted`, so `waitingOn` is null for them. The person reviewed on a performance plan reads nothing of a chain that ends on the lead's step, as before.

## Decision 75, item 29: a company rule said during setup is offered once, after the answer (2 October)

When the lead says a company rule while a setup question is waiting, the question still gets its answer, said back as before, and the rule is offered for the whole organisation straight after the lead's yes or no to that answer. Only a yes keeps it. Each rule is offered once, and never again once the lead said no.

What the lead reads, through Ask Groundwork (nothing to change on the screens there):
- Ada answers the question about doing well with "Every quote over 1 million needs Grace's sign-off, and doing well means every quote goes out within two days." She reads the say-back of the answer, with its yes and no.
- After her yes, she reads "I have recorded ..." and then, as its own question with its own yes and no: "Shall I keep "Every quote over 1 million needs Grace's sign-off" as a rule for the whole organisation, so later check-ins and Ask Groundwork can use it?"
- After a no to the answer, she reads "I have left it as it was. Nothing was changed." and the same question about the rule.
- A yes to the rule: "I have kept "Every quote over 1 million needs Grace's sign-off" as a rule for the whole organisation. Later check-ins and Ask Groundwork can now use it. You can see it on the Company page." A no: "I have not kept that for the organisation. It stays only on this check-in." followed by the setup question still open.

On the old context chat route, `POST /grounds/:id/context-chat` now sends `proposal.thenOffer`: `{ gap: "organisation_memory", say, offerId }`, beside the answer's own `say`. Please show `thenOffer.say` with a yes and a no after the lead has answered the first proposal. The yes is the existing confirm with `{ offerId }`, and the no is the existing decline with `{ offerId }`, as for any offer to keep something for the organisation.

Never offered again: while the offer is waiting, once it is kept, once the question is earlier in the same conversation, or once the lead said no to it through Ask Groundwork. A no still keeps nothing of the rule anywhere new.

A person on the check-in, an admin who only reads, and anybody else cannot have the setup conversation or answer the offer, as before (decision 63).

## Decision 75, item 17: the five kinds of target (2 October)

Each target's `direction` now takes the prototype's five kinds. The two values that existed keep their names, because they already meant the prototype's first two kinds, so every stored row reads as before:

| `direction` | The prototype's name (`kind`) | In plain words |
| --- | --- | --- |
| `"AIM"` | "Up" | something to reach |
| `"LIMIT"` | "Lower is better" | a limit not to go over |
| `"RATE"` | "Rate" | a share to keep at or above (a percentage over a period, `target` is the percentage) |
| `"DEADLINE"` | "Deadline" | a date to meet (the day is the new field `dueOn`) |
| `"ZERO"` | "Zero" | a count to keep at zero, where any at all is a breach |

Migration `20261002120000_five_kinds_of_target` adds the three values and the column `due_on`. A date to meet is done once its count reaches its number, or 1 where it has none.

**On the board** (`GET /grounds/:id/board`), each row of `objectives` also carries `kind` (the prototype's name, or null where nobody set one) and `dueOn` ("2026-10-30", only on a date to meet), to whoever may read the target. `directionQuestion` now offers the five: "What kind of number is 40? It can be something to reach, a limit not to go over, a share to keep at or above, a date to meet, or a count to keep at zero." Please offer five answers, worded "Something to reach", "A limit not to go over", "A share to keep at or above", "A date to meet" and "A count to keep at zero", and for a date, a day. `directionSuggested` can be any of the five. `POST /grounds/:id/board/objectives` and `PATCH .../objectives/:objectiveId` take `direction` as any of the five and `dueOn` as "YYYY-MM-DD" (null takes it off). The plan card's confirm takes the five as well.

What Bisi, who runs the sales check-in, reads on 2 October:
- A share: "The team is aiming to keep follow-up within 48 hours at 90% or more." then "It was 80% at the start and is 86% now, below the aim of 90% or more.", with "Close" and "It is 86%, close to the aim of 90% or more." (90% of its number or more is "Close", less is "Behind", at or above it is "Met").
- Zero: "The team is keeping unexplained transactions at zero." then "There have been 2 so far. This should stay at zero, so any at all is a breach.", with "Over limit". None reads "There have been none so far, which is where it should stay." with "Met".
- A date: "The team has a date to meet for month-end close." then "It was due by 30 September, and it is not done yet." with "Behind". Before its day: "It is due by 30 October, and it is not done yet." and no word. Done: "It is done. It was due by 30 September." with "Met".
- Up and Lower is better read as before.
- The headline asks each kind in its own words: "Will we keep follow-up within 48 hours at 90% or more and keep unexplained transactions at zero by 30 November?" and answers "So far it is 86%, below the aim of 90% or more. So far there have been 2, and any at all is a breach." A share has a bar (`kind: "aim"`, filled towards its number); a date and zero have none.
- The forecast: "If it keeps changing at the pace it has since session 1, it would be about 100% by session 6, against an aim of 90% or more." for a share (never past 100%), and "It is at 2, and this should stay at zero, so any at all is already a breach whatever the pace." for zero. A date has no pace, so it is not forecast.

**Elsewhere:** the weekly report ("... went from 80% to 86% this week, against the aim of 90% or more. That is below it."; a date's figure is "Done" or "Not done yet"), Today and "since the last round" ("The team's month-end close is done."), a person's own share ("You are at 86% so far."), the targets a check-in is given, and "About this check-in" ("... and the share to keep at or above is 90%.") each say the kind in their own words. The say-backs at setup state each kind ("\"Follow-up within 48 hours\" is a share to keep at 90% or more.") and then offer the five: "A number can be something to reach, a limit not to go over, a share to keep at or above, a date to meet, or a count to keep at zero."

Who reads what is unchanged (decisions 58 and 73, request 105): the word, the headline and the forecast go to whoever runs the check-in, and to a participant only where everybody sees the targets and the picture is shared; an admin who only reads and the person reviewed on an evaluation check-in get none of them.


## 2 October: an edit to one of your files, for you to check

To keep the ending labels in one place (decision 75, item 48: all endings are now plain sentences), the engine work updated `client/src/lib/end-states.ts` and its mirror spec `end-state-mirror.spec.ts`, which are yours, so the mirror test still passes. Nothing else in the client imports that file. Please check the change and keep or redo it your way; the engine's own copy is `api/src/modules/resolution/end-states.ts`. On the old setup-chat route, please also show `proposal.thenOffer` after the lead's yes or no to an answer (item 29).

## Request 111 (a): no reader is sent a rating of a person (2 October)

Done (`c52e4190`). Privacy first, as asked.

**Why they were sent.** The reads in `board/reads.ts` spread `confidence`, `evidenceCount`, `shown` and `basis` into every row, and the board passed each coverage and contribution row through whole. Coverage also carried `pct`. So the lead was sent all of them for every person, and a participant their own.

**What changed, at the default.** Coverage is now built from a list of what may be served (`board/no-rating-is-served.ts`), so a field added to a read later reaches nobody until somebody adds it there. A read the engine judged too thin to show is sent as `{ participantId, name, scope, remitDefined, shown: false }`, with nothing of what it would have said. And a net takes any `confidence`, `evidenceCount`, `pct` or `score` number off the whole board before it is sent, whoever reads it. The session report's shared picture no longer carries the contribution read ("1 check-in on record. 3 lines taken from what they said, 1 with a name, a number or a date in it"), because everybody in the check-in reads that picture. The engine still works every rating out and uses it where it decides whether a read is shown.

**Before and after, per reader** (board as Amina who runs it, Rukia and Baraka who check in, Juma an admin who only reads, the admin who set it up; on a performance plan, Rukia as the person reviewed and Baraka as a colleague giving a view):
- Amina, before: `coverage.reads[].pct: 0`, `confidence: 0.15`, `evidenceCount: 0`, `basis: "Based on 1 check-in, 0 checkable things named, none of it confirmed by anyone else."` for every person. Now: none of them. She still reads where work is landing, and "Nothing Baraka Otieno has said so far is checkable, because nobody else can check it yet. A number, a date or a document for what moved would change that."
- Rukia and Baraka, before: their own `contribution[].confidence` (0.23, 0.15), `evidenceCount`, and their own `coverage.reads[].pct` and `confidence`. Now: no number. Each keeps the words of the read of their own answers (decision 38), for example Rukia: "2 check-ins on record. 2 lines taken from what they said, ..." and its `basis`.
- Juma and the admin who set it up: no rating, as before.
- The session report, before, to the lead and both participants: a picture line with each named person's count of checkable lines. Now: no such line.

**Please** stop drawing `pct` (the bar variant of "Where work is landing") and `basis` beside anybody but the reader's own row; neither is sent any more. `client/src/api/board.ts` still types `confidence`, `evidenceCount` and `pct`.

**Decided for Hafsah to confirm:** a person's own board row keeps the words of their own read (decision 38) and loses its numbers; the Done page's own read is unchanged.

Test: `board/no-reader-is-sent-a-rating.spec.ts` (34 cases) serves the board and the session report as every reader above, where people see each other and where they do not, on a team check-in and a performance plan, walks the whole payload, and finds no rating number, no specificity or verifiability reading, and no words of anybody's read but the reader's own. 24 of its cases fail on the code before this change. One older test, `a-rating-goes-only-to-the-person`, expected the reader's own row back untouched, numbers included; it now expects the words kept and the number gone.

## Request 111 (b to e) and request 109: each fact and sentence fixed at its source (2 October)

**First, what I could not check.** The check-in "Sales team, Q3" (`9028f0ad-...`) is not in the database I was given (`gw_pw9_1786222102`, the one this Mac's API runs on): no row anywhere carries that id, and its people are not there. It is on the screens workspace's database. So each fix below is found from the code that made the sentence, and proven on the served sentence the request quotes, through the real builders, as each reader. Each test fails without its fix. When I tried to check whether the screens branch already holds the request 107 (b) commits, the safety guard refused the command (it reads `merge-base` as a merge), so I stopped that line, as told.

**(109 a, 111 b) "12 now, up from 0. The aim is 12." with two shops signed** (`10e3fe89`). Why: the lead's line "Twelve signed supply contracts ... and I want us to sign 12 shops." was read as the count. "signed" sits between the number and the thing and describes it, but it was read as the shops having been signed, so the request 65 rule (an aim said is not a count) let it through, and a lead's number on a target nobody had counted lands as the count. Now a word like that right after a number is taken out before asking whether the line says something happened, and a line saying what success looks like is never read as where a target stands. "We have signed 2 shops so far, Tuskys Westgate and Karen Hardware." still lands as 2. Note: the stored count of 12 on the live check-in stays until that target is read again or the lead corrects it on the board; nothing rewrites a stored count on opening.

**(109 b, 111 b) Three targets that are one aim** (`a740e362`). Why: the lead's restatements were each kept as her own target, matched only on their exact name. Now a number that is the team's aim said again (the same figure, about the same thing, once who wants it, the day and "onboarded" are set aside) is that aim, and is not written again. The day it gives ("by 20 December") is kept on the team's aim. Rukia now reads one target, "Sign 12 shops for kitchen appliances in Nairobi". Amani's own "I am aiming for 3 shops in Kilimani" is still hers. The rows already on the live check-in stay until somebody removes them.

**(111 b) The headline said 13 December, the target 20 December; its answer was null and it had no bar.** The headline now asks by the aim's own day where the lead gave one: "Will we sign 12 shops for kitchen appliances in Nairobi by 20 December?" and "So far it is 2 of 12. 10 more are needed by 20 December.", with a bar. The answer was null because the team's aim had been kept with no number, though its name holds 12. A measure the lead names with its number in it now keeps the number, said back before it is saved.

**(111 b) Neema waiting "on the warehouse for a delivery to Naivas Karen".** Not fixed. Which wait is whose is the extraction's reading of what Neema said, and I cannot read her words on this database, so I cannot say which part was mixed or why. Please send me her check-in's lines (or the run text), and I will find it at the reader.

**(111 c) Amani.** Her own deals: by the record she owns none. Rukia signed Tuskys Westgate; Amani's "I will deliver the Tuskys cookers on 9 October" is her promise, served in her work plan. The deal grid's owner was null because both deals were added on the board with nobody's name on them, and a line about an existing record moved it on without giving it an owner. Now a record with nobody's name becomes the deal of whoever then says it is theirs (`a740e362`), so after Rukia's next check-in Tuskys Westgate is Rukia's. Her `yourShare` and her own aim: her aim was said before request 107 (c) taught the reader to keep it, so it is not on the record. It reaches the board the next time her check-in is read. Rukia's empty view: see 109 (d).

**(111 d) The counts.** "Session 1 of 12" and "4 of 6 people have answered this round" count the open round (session 1, which two people have not finished); "Session 2, 30 Sept, 2 of 6 checked in" counts session 2. Both are true; the screen's "this round" does not say which. Please say "4 of 6 people have answered session 1." from `howItIsGoing.glance.progress`. The work plan's "open for 2 sessions" against "open for 1 session": the board counted every session row, opened or not, and the report counted sessions somebody finished. Both now count finished sessions (`76ac8514`). `teamPicture.shared: true` while session 2 is not shared: see "Not done" below.

**(111 e) Wording.**
- "You are waiting on themselves to approve a discount for Baraka Mwangi" (`a740e362`): nobody waits on themselves. Such a wait is never written, and one already on record is not read as a wait, on the board and in its glance. Baraka's own wait reads as before: to Rukia, "Baraka Mwangi is waiting on you for the discount decision."
- "Worth getting on record, where anyone could check it later: Twelve signed supply contracts ... and I want us to sign 12 shops." (`baffbe8e`): now, for a line stamped as the person's own words, "Amani Wekesa said, "I will deliver the Tuskys cookers on 9 October." That is worth getting on record, so anyone can check it later." For a line the record wrote in its own words, which is not a quote: "Rukia Otieno put one thing on record that anyone could check later, which is worth recognising."
- "What to ask each person" listing Rukia to Rukia: the reader's own row is left out.
- "People see two things differently. People said different things. The allocation ..." The first sentence is the screen's; the second is the engine's tile line. The topic itself ("The allocation ... signifies ...") is the written report's own words, which a model wrote; changing them needs a prompt change and a scenario run, so it is not done here. Please do not add your own sentence before `sub` where `sub` already says it.
- "In session 1, you said, "...". The time you gave for it was "..."": the time is said once now. Where the person's words already hold it, it is not repeated (`76ac8514`). Amani reads "In session 1, you said, "I will deliver the Tuskys cookers on 9 October." Nobody has said yet whether it happened." The "..." clipping is the screen's.
- The coaching line: the sales role map now says "Buyers take weeks to decide, and the person selling cannot see most of that time. A week of silence usually means the buyer is still deciding, not that they said no." It is fixed in place (decision 55), and it is also what the conversation's plan is given about sales work.

**(109 c) "1 target is set" above three.** The tile counted only the targets with a number. It now counts every target the reader is listed, and says how many have a number: "3 targets are set, and 1 of them has a number. No round has closed to measure from."

**(109 d, e) Where people differ** (`6710a93b`). A side with no words is no longer served. Each difference now has `whoSeesIt`, naming every side once, the reader first: to Amina, "You, Baraka Otieno, Neema Achieng and Amani Wekesa see this differently."; to anyone who may not name a side, "People see this differently." Please draw `whoSeesIt` in place of `whoSeesThisDifferently` in `BoardPage.tsx`, which names the first two sides only.

**(109 f, g) and request 107 (b), sentence by sentence, as the code now serves them:**
- "They disagree on one thing: there is no shared understanding ..." Still served before this, because it is the stored opening the model wrote, not a sentence the engine builds. Now fixed where every story is served: "People disagree on one thing. There is no shared understanding ..." (`76ac8514`).
- "Aisha Wanjiku cannot move on the data structure decision until it comes from the data structure decision." The board's code has said "..., and nobody has been named to provide it." since request 107 (b), and its test still passes. If it still appears, the API that served it is running a build from before that fix, or the label differs from what is waited for in a way I cannot see without the record. I could not check which (see the guard, above).
- "1 thing is in the way, the oldest being A colleague's login for the order system" is put together by the screen (`how-it-is-going.tsx`) from `inTheWay.oldest`, which stands alone and so starts with a capital. Please lower the first letter of "A colleague's" there. "A colleague" used as a name: I could not find which sentence without the payload; please send it.
- "Seen in 1 sessions." is now "It was seen in one session.", and "Seen in sessions 1 of 2" is "It was seen in session 1 of 2."
- "Amani Wekesa says Amani is growing maize ..." (the picture) is now "People said different things about which crop the cohort grows. Amani is growing maize this season. Neema Achieng says beans pay better than maize." (`9645f07d`)
- On mvnext, "What to settle together" showing "What did you do this period that only you could have done?": a question for one person is no longer used as the room's question (`82e99095`). The blocker's question lost its colon too.
- (g) The withheld board now reads "... You will be able to open it as soon as you have checked in. Reading what everybody else said first would make yours an answer to theirs, and each answer is meant to be your own."
- The rest of 107 (b) (a decision on who owns them, the pipeline fix, "Lead and team", "their own" after "you", what success looks like, "waiting on them") is served as the 107 (b) answer says, and those tests pass.

**Not done, and why:**
- `teamPicture.shared: true` while session 2 is not shared. A report is released once, for the whole check-in, so once it is released a participant reads it as it grows. The prototype says the team picture is shared each day. Releasing each session's picture on its own needs a decision and a change to what is stored. Needs Hafsah: should a participant read the team picture only for sessions the lead has shared? (The more private answer is yes.)
- The report's own words for a difference ("allocation", "signifies") come from the written report's prompt. Changing it needs a scenario run.

**Decided for Hafsah to confirm:**
- A restated aim with the same number about the same thing is the team's aim, and is not kept as the speaker's own target.
- A record added on the board with nobody's name on it becomes the deal of whoever later says it is theirs.
- "What to ask each person" leaves out the reader's own row.
- The work plan counts only sessions somebody finished.

**Engine changes that need a scenario run before they are trusted:** what the record keeps changed in three places (a count read off an aim, a restated aim, a wait on oneself), and the sales role map's fairness line is also given to the conversation. None of these were run against the model here (no live keys).

Tests (all fail without their fix): `board/the-aim-said-is-not-a-count.spec.ts` (3 new), `conversation/one-aim-said-three-times-is-one-target.spec.ts` (6), `board/request-111-a-wait-on-oneself-and-the-targets-set.spec.ts` (9), `reports/request-111-e-what-to-ask-each-person.spec.ts` (3), `board/request-111-e-the-sales-coaching-line.spec.ts` (2), `board/request-109-f-and-111-d-e-sentences.spec.ts` (7), `board/request-109-d-e-where-people-differ.spec.ts` (5), and new cases in `reports/the-picture-is-drafted-from-the-reads.spec.ts`. Tests changed, each because it expected the defect: `each-kind-of-work-has-its-records`, `the-number-she-said-is-kept`, `a-quote-built-at-the-read`, `opening-a-report-asks-no-model`, `obligations-on-the-board-as-each-reader-reads-them`, `request-105-a-participants-board-is-their-own`. `the-same-check-in-reads-the-same-on-every-screen` failed on the date alone (its days were counted from a fixed day while the list reads the real clock), and now counts from the wait itself (`442028d8`).

## Decision 76, item 1: what request 111 took away, and what comes back (2 October)

**How this was found.** The board and the session report were served as every reader (Amina who runs it, Rukia and Baraka who check in, Juma an admin who only reads, the admin who set it up), on a team check-in where people see each other, one where they do not, and a performance plan, through the same test, once on the code before request 111 (`32fa0052`) and once on the code now. Every field of every payload was compared. Only `c52e4190` changed what readers are sent about ratings; the later commits of request 111 changed sentences, not ratings. Today, the lists and `GET /grounds/:id` were not touched by request 111.

**Everything request 111 removed, and what kind of thing each is.** (a) means the rating of how specific and checkable a person's answers are, in the form decisions 40 and 43 allow. (b) means a score of a person's contribution or performance, or a number of any other kind.

| What was removed | From | Who was sent it before | Kind | Now |
| --- | --- | --- | --- | --- |
| `coverage.reads[].pct` (how much of a person's work lands in their role, 0 to 100) | board | the lead and the admin who set it up, for everybody; each participant, for their own row | (b), a score of where a person's work lands | Stays removed |
| `coverage.reads[].confidence` (for example 0.15) | board | the same readers | (b), the engine's confidence in a read of a person | Stays removed |
| `coverage.reads[].evidenceCount` (for example 0) | board | the same readers | a count of checkable things, as a bare number; not an allowed form for anybody | Stays removed |
| `coverage.reads[].basis` on other people's rows ("Based on 2 check-ins, 0 checkable things named, none of it confirmed by anyone else.") | board | the lead and the admin who set it up | (a) in substance, but a count, sent to the lead; decision 43 allows the lead only "Nothing checkable" | Stays removed from the lead. The person still reads it on their own row. |
| everything of a coverage read too thin to show (`shown: false`): its kind, sentence and numbers | board | the same readers | (b), where a person's work lands | Stays removed |
| `contribution[].confidence` on the reader's own row (0.31, 0.15) | board | each participant, about themselves | (b), the engine's confidence, a number | Stays removed |
| `contribution[].evidenceCount` on the reader's own row (2, 0) | board | each participant, about themselves | a count of checkable things as a bare number; the person's own allowed form is "How checkable today's check-in was" | Stays removed. The person still reads the same count in words on their own row ("2 lines taken from what they said, 2 with a name, a number or a date in them, 2 of those specific enough for somebody else to go and check.") |
| The picture line "Rukia Mwangi and Baraka Otieno: 1 check-in on record. Nothing named so far could be checked by anyone else, because no people, organisations, numbers or dates were named." (in `pictureLines`, `picture`, `sharedPicture`, and as the report's `finding`, which is now null) | session report | the lead, both participants (as "You and Baraka Otieno: ..." and "Rukia Mwangi and You: ..."), and the admin who set it up, on team check-ins and the performance plan | (a), but with counts, and read by colleagues | Stays removed: colleagues may never read it, and the lead's allowed form is on the board |

**So nothing request 111 removed was the checkability rating in an allowed form, and nothing is put back.** Every allowed form was still served, before and after, and is now held by a test:
- Each person is sent their own five parts with their own check-in in `GET /grounds/:id` (`specificityDimensions`, which the Done page counts as "4 of 5"), and nobody else's. The lead and the admins are sent null for everybody (`how-checkable-is-yours-alone`).
- The lead, the admin who set it up, and an admin who only reads are sent "Nothing checkable" beside the name, with what to ask next, in `eachPerson`: `reason: "nothing checkable"`, `says: "Nothing Baraka Otieno said this round can be checked yet. A number, a date or a document for what moved would change that."`, `ask: "Ask Baraka Otieno for a photo, a message or a document that shows what moved."`. On a performance plan an admin with no access is refused the board.
- The lead and the admin who set it up also read, in `contribution`, "Nothing Baraka Otieno has said so far is checkable, because nobody else can check it yet. A number, a date or a document for what moved would change that." An admin who did not set it up does not read that section (decision 75, item 1, request 88).
- The lead also reads the same sentence in `eachPersonToday[].line`.
- A colleague reads nothing about how checkable anybody else's answers were. Nobody but the person is sent a number.

Test: `board/the-checkability-rating-is-served-where-it-is-allowed.spec.ts` (25 cases), as every reader, on both kinds of team check-in and a performance plan. `board/no-reader-is-sent-a-rating.spec.ts` still passes unchanged, so everything in (b) stays removed.

**For the screens, and for Hafsah:**
- The engine's five parts are delivery, evidence, enablement, coverage and commitment, worded on the Done page as Hafsah wrote them. The prototype's sales example names them who, what, when, proof and next. They are not the same five, and changing what the engine reads needs Hafsah's decision.
- "4 of 5" is not drawn because `SHOW_THE_COUNT` in `TheDonePage.tsx` is off, waiting on request 103 (sessions read before 29 September keep their old read). The engine sends what the count is made from, to the person alone.

## Decision 76, item 3: a record with nobody's name becomes somebody's only once the lead says yes (2 October)

`a740e362` made a record added on the board with nobody's name on it the deal of whoever next said it was theirs. Now that is a claim, checked first (decision 12). The record keeps nobody's name, and the lead reads the claim said back on her board. Only her yes sets the owner.

**What each reader is sent.**
- The lead: the record, with `owner: null` and `ownerClaim: { participantId, who: "Amani Wekesa", says: "Amani Wekesa says the Westgate Deli deal is theirs. Is it?" }`. Where she said it herself: "You said the Westgate Deli deal is yours. Is it?"
- The person who said it, and a colleague: the record is not on their board until it is theirs, and the claim is never sent to them.
- An admin, including the admin who set it up: the record with nobody's name on it, and no claim.
- After the lead's yes, everybody reads the owner as before ("Amani Wekesa" to the lead, the record on Amani's own board).

**The lead's answer.** `POST /grounds/:id/board/work-items/:itemId/claim` with `{ "yes": true }` or `{ "yes": false }`, the lead only. It answers with `{ record: { id, ownerParticipantId }, saidBack }`. A yes reads "The Westgate Deli deal is now Amani Wekesa's." A no reads "The Westgate Deli deal still has nobody's name on it.", and the same person's claim on that record is not put to her again; somebody else's still is. Anybody else is refused with "Only the lead of this check-in can change its records." With nothing waiting: "Nobody is waiting for your answer about this record." The lead setting the owner herself with the existing PATCH also answers the claim. One claim waits at a time.

**Please** draw `ownerClaim.says` on the deal grid row, with a yes and a no, and show `saidBack` after the answer. `client/src/api/board.ts` will need `ownerClaim` on a record.

The claim is kept on the record's own `fields` under a key that is never served, so nothing new is stored in a new column. Test: `board/a-claim-on-a-record-is-checked-first.spec.ts` (16 cases), as the lead, the person who said it, a colleague, an admin who only reads and the admin who set it up. Tests changed: `each-kind-of-work-has-its-records` expected the deal to become Rukia's when she spoke about it, which decision 76 reverses.

## Request 110 (a) and (b): Amani's own aim, and "Your share" (2 October)

**Why both were missing.** The check-in "Sales team, Q3" is on the screens workspace's database, not this Mac's, so I proved it on the board harness with the sales run's own words (`api/journey/all-24/run-24/sales.json`, session 1). In that run, which closed after request 107 (c), part 1, Femi's "I'm aiming for the full 12 approved facilities." is on the board and he is sent his share. So the fix works on a check-in closed after it. Amani's session 1 closed before it. Then, a participant's own counted aim was kept only as their promise (`PersonObjective`, kind TARGET, with its number and what it counts) and never put on the board. The fix runs when a check-in closes, over that check-in's own turns only, so a session that closed earlier is never read again. My answer to 111 (c) was wrong to say it would reach the board "the next time her check-in is read". It would only reach it if she said it again. How Amani said it is not the problem: her sentence is the prompt's own example.

**What changed.**
- (b) The board now also reads a person's own aim from their promise, where the board does not hold it yet. It is read as a target of theirs, set by them, in their own words, with nothing counted against it. It goes through every rule a stored target of theirs goes through: who sees targets, a participant's own board, a goal not told yet, and naming. It is left out where the board already holds it, or where it is the team's aim said again. Only an aim the person set for themselves, still open, with a plain number and what it counts. Nothing is written when the board is opened. Its id starts with `their-own-aim-`. When the lead changes its number or count, it is put on the record first, as theirs, so `PATCH .../objectives/their-own-aim-...` works as for any target. If Amani's promise holds the number, she now reads her aim and her share. If her promise was never kept as an aim with a number, nothing on the record holds it, and nothing is made up: she has to say it again, or the lead adds it.
- (a) `yourShare` is now always sent to a person who checks in, as a list. Where they have no number of their own, it is `[]`, and `yourShareSays` is "There is no number of yours on this board yet, so there is no share to show." The person running the check-in, an admin who only reads and the admin who set it up are still sent neither.

**Before and after, per reader** (the sales run, with Femi's and Ngozi's aims kept only as their promises, as Amani's was):
- Femi. Before: no target of his, and no `yourShare`. Now: "You are aiming for the full 12 approved facilities. You expect to hit that by the end of the quarter. You set yourself this aim. Nothing has been counted against it yet." and "Only you and Bisi Adeyemi see your share."
- Bisi, who runs it. Before: neither aim. Now: "Femi Okonkwo is aiming for the full 12 approved facilities. Femi Okonkwo expects to hit that by the end of the quarter. Femi Okonkwo set this aim for their own work." and "Ngozi Eze is targeting 14 approved facilities. Ngozi Eze set this aim for their own work." No share.
- Ngozi, where each person sees only their own numbers, and where people do not see each other. Before: nothing of hers. Now: "You are targeting 14 approved facilities. You set yourself this aim. Nothing has been counted against it yet." Nothing of Femi's, in either case. Where the lead chose that everybody sees every number: "Everybody in this check-in sees your share.", and her own board still holds only her own aim (request 105, part 3).
- Kwame, who set no number. Before: no `yourShare` at all. Now: `yourShare: []` and "There is no number of yours on this board yet, so there is no share to show."
- Juma, an admin who only reads, and the admin who set it up: no one person's aim and no share, before and after.
- On a performance plan: Femi, the person reviewed, reads his own aim and share. Kwame, a colleague giving a view, reads neither aim.

**Decided for Hafsah to confirm:**
- The lead can change the number or the count of an aim a person set for themselves, but cannot remove it. Only the person can drop their own aim. The lead is told: "This aim is one the person set for themselves in their own check-in, so only they can drop it. You can change its number or what is counted against it."
- `yourShare` is an empty list, with a sentence, for a person who checks in and has no number of their own.

**For the engine, not done here:** reading every earlier closed check-in again, so these aims are written to the board's own table, is a change in `conversation/` and needs a scenario run.

Tests: `board/request-110-your-own-aim-kept-as-your-promise.spec.ts` (14 cases; 10 fail without this change). One older case in `your-share-as-each-reader-reads-it.spec.ts` expected no `yourShare` at all for a participant whose only target is a decision about them. It now expects `[]` and the sentence, which is what request 110 (a) asks for. `a-number-with-a-name-on-it-goes-through-one-rule.spec.ts` lists the new file as one that builds rows the board then passes through `targetsFor`.

## Request 112 (a): each deal in its group (2 October)

Each row of the sales deal grid (`workRecords`, section "Deal grid", kind `deal`) now has `group` and `groupSays`, and the section has `groups` and `groupsNote`. Each row also has `lastSaidOn` ("2026-09-22"), the day somebody last spoke about it in a check-in, which is the day of the line it came from; it is null for a deal added on the board. Code: `board/each-deal-in-its-group.ts`.

**Only from what the record holds.** For each deal, the record holds its mark, the date somebody gave for it, the day somebody last spoke about it, whether somebody said what happens next, and its stage. Each group is built from those and nothing else, in this order:
- `won`: reported at the last stage. Heading "Won" (the stage's own name). Reason: "Somebody reported each of these at Won, the last stage."
- `next-quarter`: the date given for it is after the day the check-in ends. Heading "Next quarter" where the check-in ends on the last day of a quarter, otherwise "After 10 October". Reason: "The date given for each of these is after 30 September, when this check-in ends."
- `cooling`: somebody spoke about it, but not in the last 7 days, and nobody has said what happens next. Heading "Cooling". Reason: "Nobody has spoken about these in the last week, and nobody has said what happens next."
- `likely`: proof or a colleague's confirmation, a date on or before the end, and word about it in the last 7 days. Heading "Likely by 30 September". Reason: "Each of these has proof or a colleague's confirmation, a date on or before 30 September, and word about it in the last week."
- `possible`: every other open deal. Heading "Possible". Reason: "Each of these is still open, but is missing proof, a date on or before 30 September, or word about it in the last week."

`groups` is `[{ group, heading, reason, rowIds }]`, in the prototype's order (Likely, Possible, Next quarter, Cooling, then Won), and only groups with a deal in them. Please draw each `heading` with its `reason` beside it, then the rows in `rowIds`. Please draw `groupSays` where the prototype says "Why it's here", and each sentence of `groupsNote` once under the grid.

**What the record cannot support, said plainly in `groupsNote`:**
- "Nothing on record says what a deal must show at each stage, so no group here says whether a criterion is met." The prototype's "Every criterion proven or close" needs rules for each stage, and nothing on record holds them (request 107 c, part 4).
- "No deal is put under Cold, because nothing on record counts how many times a customer was followed up without a reply, so the stall rule cannot be applied." The stall rule is the lead's words on the Context page, and the record does not count follow-ups.
- Where the check-in has no end date: "This check-in has no end date, so no deal can be said to be likely by the end, or to fall after it."
- "Last contact" in the prototype is contact with the customer. The record holds only when somebody spoke about the deal in a check-in, so that is what `lastSaidOn` is, and what each sentence says.

**What each reader reads** (the sales run's own lines, `api/journey/all-24/re-f/sales.json`, read on 23 September, in a check-in that ends on 30 September):
- Bisi, who runs it, Juma, an admin who only reads, and the admin who set it up: "Likely by 30 September" with Lekki Cold Rooms; "Possible" with Head of Credit escalation and Plateau Foods; "Next quarter" with Jos Grain Traders; "Cooling" with Mama Ngozi Kitchens; "Won" with Ikeja Bakery. Before: one flat list, with no group.
- Why each is there, for example Lekki Cold Rooms: "A colleague confirmed it. The date given for it is 28 September. It was last spoken about on 22 September. Nobody has said what happens next." Plateau Foods: "It was added on the board, not said in a check-in. No date has been given for it. Nobody has spoken about it in a check-in yet. Nobody has said what happens next."
- Once Femi said "I will call Mama Ngozi Kitchens on Friday.", it is no longer cooling. It moves to "Possible", and its sentence ends "Somebody has said what happens next."
- Femi reads only his own: "Likely by 30 September" with Lekki Cold Rooms, and "Cooling" with Mama Ngozi Kitchens.
- Ngozi, where people see only themselves: only her own, "Possible" and "Won". Nothing of anybody else's.
- Kwame, as a colleague giving a view on a performance plan: only his own, "Next quarter".
- Each group is built from the rows that reader is already sent, after every wall, so it tells nobody anything they could not read row by row. What happens next is read as that reader may read it, so a participant who may not read the lead's promise about a deal reads "Nobody has said what happens next."

**Decided for Hafsah to confirm:**
- "Recent" means somebody spoke about it in a check-in in the last 7 days.
- A colleague's confirmation counts like proof for "Likely".
- Deals reported at the last stage are shown in their own group, "Won", after the others, so the grid still holds every deal.
- "Next quarter" is used only where the check-in ends on the last day of a quarter. Otherwise the heading is "After" and the day.
- Should the lead set what a deal must show at each stage, and should the check-in count follow-ups with no reply? Then "Likely" could check criteria, and "Cold" could apply the stall rule.

Tests: `board/request-112-a-each-deal-in-its-group.spec.ts` (13 cases, as every reader; 12 fail without this change, and the 13th checks that a board not about sales has no groups), including a walk of every sentence for colons, dashes and arrows. `each-kind-of-work-has-its-records.spec.ts` compares whole rows and sections, so it now expects `lastSaidOn`, `group`, `groupSays`, `groups` and `groupsNote` as well. Nothing in it was taken out.

## Decision 76, item 4: each session's team picture is released on its own (2 October)

Answers request 111 (d) and 112 (c): "`teamPicture.shared: true` while session 2's team report is not shared". A report was released once, for the whole check-in, so a participant kept reading it as it grew into session 2. Now each session's picture is released on its own (commits `5e6dd623`, `f5fa0a0e`).

**What is stored.** One new column on the report, `releasedSessions` (a list of session numbers). `releasedAt` stays the moment the report was first shared. The migration `20261002140000_each_sessions_picture_is_released_on_its_own` marks every report already released as released for every session up to the highest one anybody had finished when it was released, so nobody loses what they could read then and nobody gains a later session.

**The route.** `POST /grounds/:id/report/release`, as before, only for the lead (or an admin once the lead has left, decision 53). It releases the session the report holds now (the highest session anybody has finished). It now answers:

```
{ "groundId": "…", "releasedAt": "…", "releasedSessions": [1, 2], "sessionNumber": 2,
  "saying": "This shares the team's picture of session 2 with everyone in the check-in." }
```

Please show `saying` back to the lead after they press it. Pressing it again for a session already released changes nothing. A session is still released by itself when everybody in it has answered, as session 1 always was. `POST …/send-to-everyone` releases the current session first too.

**Before they press it.** The lead's `GET /grounds/:id/report` and `GET …/report/session/:n` (for the session the report holds now) carry `releaseThisSession: { sessionNumber: 2, saying: "This shares the team's picture of session 2 with everyone in the check-in." }` while that session is not released. Please put `saying` beside the Share button, so the lead reads what it does before pressing it. Nobody else is sent it.

**What everybody is sent.**
- `releasedSessions` on `GET /grounds/:id/report`, on each session report, on `GET /grounds/:id` (in `report`) and on the check-ins list (in `report`).
- On each session report, `released` is now about that session, not the first release.

**What a participant reads** (and the person reviewed on an evaluation check-in, who also reads only what is released). Whoever runs the check-in, an admin who only reads and the admin who set it up read exactly as before.
- Session 1 released, session 2 answered and not released. `GET /grounds/:id/report` serves session 1's picture as it was kept when session 1 closed, with `readingSession: { sessionNumber: 1, saying: "You are reading the team's picture of session 1. The team's picture of session 2 is not shared yet." }` and `teamPicture: { shared: false, sessionNumber: 2, says: "The team's picture of session 2 is not shared yet." }`. Nothing written from later sessions is sent with it (the opening, the findings, what moved since the last round).
- `GET …/report/session/2` sends their own words and the counts, `released: false`, and `teamPicture: { shared: false, sessionNumber: 2, says: "The team's picture of session 2 is not shared yet." }`. None of the team's agreements, differences, question or written picture for session 2.
- `GET …/report/rounds` lists only released sessions.
- `GET /grounds/:id` leaves out `report.sharedPicture` and `report.theOpening` until the session the report holds now is released. The list leaves out `latestSummary` and `latestFinding` until the latest kept round's session is released.
- Nothing released yet: `GET …/report` sends `saying: "The team's picture of session 1 is not shared yet."` with the same `teamPicture`, and their own things (`myRows`, `soloArtifact`, `couldTry`). Before, a participant who had answered read the forming picture here. A participant who has not answered still reads why they cannot read it yet, as before.
- After the lead releases session 2, they read both sessions' pictures, and none of the fields above say "not shared".

**For the board (not changed here, the board is the screens' and the other builder's).** `teamPicture.shared` is worked out at `board/board.service.ts`, the line `released: !!(ground as any).report?.releasedAt,` inside `aParticipantsOwnBoard(...)`. It should become `released: await isTheTeamPictureNowShared(this.prisma, groundId, (ground as any).report),` from `reports/each-sessions-picture-is-released-on-its-own`. The board already reads the whole report row (`report: true`), so `releasedSessions` is there. The same goes for `whatTheAnswersSay: (isInitiator || (ground as any).report?.releasedAt)`. Then "Today's team picture is not shared yet." shows on Amani's board while session 2 is not released.

Tests: `reports/each-sessions-picture-is-released-on-its-own.spec.ts` (12 cases, every reader, two sessions, before and after the lead releases session 2), and new cases in `grounds/a-participant-reads-the-report-only-once-it-is-shared.spec.ts`, `grounds/the-list-gives-each-reader-only-their-part.spec.ts` and `reports/what-today-reads-from-the-record.spec.ts`.

## Request 112 (b): an action for each item under "What needs you" (2 October)

Each item in `leadActions` and in `decisions` now has `action`, sent to the lead alone, the one person who can act on it. Nobody else is sent it, and the ids it is built from are sent to nobody. Code: `board/what-needs-you-and-what-to-do.ts`.

`action` is `{ label, says, goesTo, choices? }`:
- `label` is what the button says. `says` is one full sentence of what to do.
- `goesTo` is `"check-in"` (the lead's own check-in) or `"context"` (the Context page), or null where `choices` carry the action.
- `choices` is `[{ label, route }]`. `route` is `{ method, path, body }`, the call that keeps that answer, or null where the answer changes nothing.

Please draw each choice as its own button, and call its `route` when pressed. Where there are no choices, draw `label` as one button to `goesTo`, with `says` beside it, in place of "Open".

**Choices only where the record holds the question and a route keeps the answer.** Nothing is offered that the product cannot do.
- The lead's own promise nobody has said happened: "Yes, it’s done" (`PATCH /grounds/:id/commitments/:commitmentId` with `{ status: "DONE" }`, the route that already exists) and "Not yet" (no call).
- A question the lead wrote down as still to decide, answered yes or no ("Whether to ..." with no "or", or "Should we ...?" and the like): "Yes" and "No". Each calls the new `POST /grounds/:id/board/decisions/:itemId/answer` with `{ yes }`. Only the lead may call it; anybody else is told "Only the lead of this check-in can answer this." The answer goes in how we work as one line, in the lead's own words, read by whoever the question was shared with: "On whether to take the credit committee delays to the Head of Credit, the answer is yes." The question is closed, so it comes off the list. It answers `{ answered, saidBack }`, and `saidBack` is "This is now in how we work. It reads, "On whether to take the credit committee delays to the Head of Credit, the answer is yes."" Please show it after the answer. A question already answered: "This is not waiting for an answer any more."
- A question with two answers of the lead's own ("Whether the 120m counts what was approved or what was disbursed.") is not turned into two buttons, because splitting her sentence would put words in her mouth. It reads "Open the Context page" and "Write down what you decided on the Context page, and close this line there."

**What Bisi, who runs it, reads on the sales run** (`api/journey/all-24/re-f/sales.json`). Before, each item had one "Open" to the Check-in tab. Now:
- "In session 2, you said, "I'll follow up directly with the committee members." Nobody has said yet whether it happened." with "Say whether it has happened. Until you do, it stays open on your work plan." and the choices "Yes, it’s done" and "Not yet".
- "You need to get back to Kwame Mensah, who is waiting on you for the approval of five applications." with "Reply in your check-in" and "Tell Groundwork in your check-in what you will do for Kwame Mensah, and by when."
- "You need to find out who can provide the bank statements Femi Okonkwo is waiting for, because nobody has been named yet." with "Name who provides it" and "Say in your check-in who can provide it, so they can be asked."
- A wait on a colleague, "Ngozi Eze is waiting on the signed forms for Ikeja Bakery, so it needs deciding." with "Ask Kwame" and "Tell Groundwork on the Context page what to ask Kwame Mensah, and it will ask in Kwame Mensah's next check-in." The Context page is where a question for one person is kept, confirmed by the lead and then asked word for word (decision 34). This is the prototype's "Ask him".
- "Whether to take the credit committee delays to the Head of Credit." with "Your answer goes in how we work, and this comes off the list of things still to decide." and the choices "Yes" and "No".
- A goal she has not told somebody about: "Open your check-in" and "Talk it through with them first. Then tell Groundwork in your check-in that you have."
- People who said different things: "Open your check-in" and "People said different things about this. Talk it through with them, and say in your check-in what you settled."
- A wait on her that blocks: "Reply in your check-in" and "This is waiting on you. Tell Groundwork in your check-in what you will do about it, and by when." A wait on somebody outside the check-in: "Nobody in this check-in can provide it. Say in your check-in who will ask the credit committee, and by when."

**Every other reader.** Juma, an admin who only reads, and the admin who set it up read the same items as before, with no `action` and no ids. Femi, Ngozi (where people see only themselves) and Kwame (a colleague giving a view on a performance plan) are sent neither list, as before (request 105, part 3).

**Not from this board.** "Today’s report shares itself at 6:30pm" with "Share now" and "Hold it" is Today's item (`needsHere`), which already carries its own action. The release route and its sentence are in the answer to decision 76, item 4. "Samuel has chased the same 5 leads for 3 check-ins" comes from a pattern, and patterns are not on this list.

**Decided for Hafsah to confirm:**
- The lead's yes or no to a question she wrote down goes in how we work, as one line in her own words, and the question is closed.
- "Ask Kwame" sends the lead to the Context page, where a question for one person is kept and confirmed, because no route puts a question to one person from the board.
- Choices are offered only for a question answered yes or no. A question with two answers of the lead's own is not split into buttons.

Noticed, not changed: Juma, an admin who only reads, is sent `leadActions` and the lead's own decisions. The answer to request 108 (d) reads decision 58 as "not the lead's list". If `leadActions` is that list, it should not reach him either. Please say which, and I will change it.

Tests: `board/request-112-b-what-needs-you-and-what-to-do.spec.ts` (17 cases, as every reader, and the answer route as the lead and as somebody else). They fail without this change. The board harness now passes a Context line's id, so a spec can read which line a decision came from.

## Request 112 (c) and 111 (d), on the board: the team picture is shared session by session (2 October)

Decision 76, item 4 is built in the reports (see the answer above, `5e6dd623` and `f5fa0a0e`). The board now asks the same question. `teamPicture.shared` is true only once the session the report holds now is released, not once any session ever was. The same goes for `whatTheAnswersSay` for anybody who does not run the check-in, the person reviewed on an evaluation check-in included.

**What each reader reads** (the sales run: Femi, Ngozi and Kwame have finished sessions 1 and 2; Bisi released session 1 and not session 2):
- Femi and Ngozi. Before: `teamPicture: { shared: true }`, and the team's picture of session 2 (the quick read, where people differ, what the answers say, the forecast and the headline). Now: "Today's team picture is not shared yet." and "Your own report is ready now.", and none of those sections. Once Bisi releases session 2: `teamPicture: { shared: true }` and the sections, as before.
- Femi, the person reviewed on a performance plan: what the answers say only once session 2 is released.
- Bisi, who runs it, and Juma, an admin who only reads: as before. They read what the answers say whether or not it is released, and are sent no `teamPicture`.
- A report released before sessions were kept apart (no list of released sessions) reads as released, as it did.

So Amani now reads "Today's team picture is not shared yet." while session 2 of "Sales team, Q3" is not released. Nothing changes on the screens.

Tests: `board/decision-76-4-the-team-picture-is-shared-session-by-session.spec.ts` (8 cases; 3 fail without this change). Changed, and why: `the-movement-tile-tells-the-same-story.spec.ts` failed in 3 cases once the reports kept sessions apart, because its fixture had no report, which now means nothing is released, so a participant was rightly not sent what moved. Its fixture now releases sessions 1 and 2, so its participants read the tile and the sentence, and it expects the tile they read. The board harness now says the session the report holds is the highest anybody has finished, as the database does.


## Request 113 (2 October)

(a) Fixed (`35e1e389`): `one-persons-circumstances-stay-their-own.spec.ts` reads a scenario run's saved JSON, not source; it now loads it as data with `require`, and the comment guard passes. (b) Already passing: `the-same-check-in-reads-the-same-on-every-screen.spec.ts` counts the days from the wait itself since the request 111 work, so it no longer depends on today's date.

## Request 114

Withdrawn, and set aside on Hafsah's instruction (the checkability rating stays, decision 76). Its parts (b) to (g) are being done as request 115.

## Request 116: the checkability rating, field by field, and the two lines the lead read wrong (2 October)

**(a) Which field is which, and who is sent it now.** Nothing needs putting back. Every form of the checkability read that decisions 40 and 43 allow is still sent, to exactly the readers they allow.

| Field | What it is | Kind | Who is sent it now |
| --- | --- | --- | --- |
| `coverage.reads[].pct` | how much of a person's own remit other people say they did (0 to 100) | a score of where a person's work lands, not checkability | nobody |
| `coverage.reads[].confidence` | how sure the engine is about that coverage read | a rating of a read of a person | nobody |
| `contribution[].confidence` | how sure the engine is about the contribution read | a rating of a read of a person | nobody |
| `coverage.reads[].evidenceCount`, `contribution[].evidenceCount` | checkable lines plus colleagues' confirmations, as one bare number | a number mixing checkability and other people's credit; not an allowed form for anybody | nobody |
| `contribution[].reason` on the reader's own row ("2 lines taken from what they said, 2 with a name, a number or a date in them ...") and `coverage.reads[].basis` on the reader's own row | the person's own read of their answers, in words | checkability, the person's own | the person alone |
| `specificityDimensions` with the person's own check-in in `GET /grounds/:id` (the Done page's "How checkable today's check-in was", "4 of 5") | the person's own read | checkability, the person's own | the person alone; the lead and the admins get null for everybody |
| `eachPerson[].reason: "nothing checkable"`, its `says` and `ask` | "Nothing checkable" beside the name, with what to ask next | checkability, decision 40's form | the lead, the admin who set it up, an admin who only reads (not on an evaluation check-in without access) |
| `contribution[].nothingCheckable` and its sentence on other people's rows | the same, across the whole check-in | checkability, decision 40's form | the lead and the admin who set it up |

**(b) "Nothing to do" where the reason was that nothing is checkable.** The stop-gap from requests 8 and 11 (27 September) that served "nothing checkable" as "nothing to do" was removed on 28 September (`01379c6e`), and nothing else turns one into the other. One gap was left: a row that was "Nothing checkable" and also had a wait under a fortnight old that the person had already chased came out with no ask at all. Now it always asks for what would make it checkable (`21e12159`).
- Amina (the lead), the admin who set it up, and Juma (an admin who only reads), before: "Nothing Baraka Otieno said this round can be checked yet. A number, a date or a document for what moved would change that." and no ask. Now the same, then "Ask Baraka Otieno for a photo, a message or a document that shows what moved."
- Baraka: no rows about anybody, as before. He still reads his own five parts with his own check-in.
- Neema, Amani and Baraka on "Sales team, Q3" (115 d) were "nothing to do" because their answers were checkable and their wait on Rukia was recent and chased, not because of the old rule. See 115 (d).

**(c) Nobody is read on answers they never gave** (`21e12159`).
- Amina and the admin who set it up, before: "Nothing Faraji Odhiambo has said so far is checkable, because nobody else can check it yet. ..." Now: "Faraji Odhiambo has not checked in yet." Under "Where each person is", as before: "Faraji Odhiambo has not checked in for this round yet." and "Ask Faraji Odhiambo to check in."
- Faraji, before: "0 check-ins on record, nothing specific named yet." Now: "You have not checked in yet."
- Juma: no contribution section, as before; no read on Faraji anywhere.
- Somebody still waiting for the organisation to let them in gets no sentence there at all, so the lead is not asked to chase them (request 85).

Test: `board/request-116-checkability-as-each-reader-reads-it.spec.ts` (11 cases, every reader, a team check-in and a performance plan). I could not run it on the code before the change: the safety guard refused the command that would have put the old files back for the run, so I stopped that line, as told.

## Request 115, parts (b) to (g): the sales board, from the record (2 October)

Each part is proven on the board harness as each reader: Bisi or Amina who runs it, the admin who set it up, Juma (an admin who only reads), the people who check in (where they see each other and where they do not), and a performance plan with the person reviewed and a colleague. "Sales team, Q3" is on the screens workspace's database, so the sentences below are from the harness with the same shapes.

**(b) A deal row** (`4743c8cc`, `board/a-deal-row-from-its-record.ts`). Each deal on the sales grid now has:
- `value`: what somebody said it is worth, kept with it when it was named ("NGN 4,500,000"). Where nobody said, `value: null` and `valueSays`: "Nobody has said what this deal is worth yet."
- `contactHistory`: each day somebody spoke about it in a check-in, newest first, `how` "with proof" or "in their words", with a sentence such as "On 22 September, somebody spoke about it, and proof backs what they said." `contactHistorySays`: "Each date is a day somebody spoke about this deal in a check-in. Nothing on record holds each contact with the customer." Only lines from people whose words this reader may read.
- `theirRead`: the owner's latest sentence that names the deal, word for word, with `says` "Femi Okonkwo's read, in their own words." (to Femi: `who: "You"`, "Your read, in your own words."). Null where they never named it, or where this reader may not read their words.
- Why it is in its group: `groupSays`, as before. Criteria met: not on record, said once in `groupsNote`.
- Before, to every reader: no value, no history, no read. Now: Bisi, the admin who set it up and Juma read all of it. Femi reads it on his own deals. Ngozi reads only her own deals and none of Femi's words, whether or not people see each other. Kwame, a colleague on a performance plan, reads neither Femi's deal nor his words.
- What is needed for the rest: the prototype's "last contact" and contact history mean contact with the customer, and its value is a number to add up. The record holds when somebody spoke about a deal, and a value only as said. Counting contacts with the customer needs the check-in to ask about them, or numbers from another system.

**(c) What was not served at all** (`a75b0625`).
- `toCloseTheGap`, to whoever is served the headline (the lead and the admin who set it up; not a participant, not on a performance plan). Before: nothing. Now, with the aim at 38 of 40: "To close the gap by 30 September, 2 of these 3 open deals would need to close. Each open deal is counted as one toward the aim of 40." with each deal, such as "Lekki Cold Rooms is Femi Okonkwo's deal. Nobody has said what happens next." and "Plateau Foods is a deal with nobody's name on it yet. Nobody has said what happens next." Where the aim is money or a share: "20 more are needed by 30 September. Nothing on record says what each deal is worth against this aim, so no deals are listed as closing the gap."
- `helpNobodyMentioned`, to whoever runs the check-in only. Before: nothing. Now: "2 colleagues said Kwame Mensah helped them. Kwame Mensah did not mention it in their own check-ins." with `why` "You see the help, not who said it." Who said it, and what they said, are never sent. It counts only where the person's own lines do not mention the same work.
- `openIssues`, to whoever runs the check-in, not on a performance plan: `{ state: "not-known", why: "Nothing on record follows an issue from unclear, to decided, to done and checked, so open issues cannot be shown yet. Where people see something differently, and the questions written down to decide on the Context page, are under what needs you." }`. Following an issue through its stages needs the record to keep each stage; it does not.
- `assumes` is empty because nobody wrote anything down. Beside an empty one, `assumesSays`: to the lead, "Nothing on record says what this target assumes yet. You can write down what it assumes here."; to anybody else who may read the target, "Nobody has written down what this target assumes yet." The lead can already write them with `PATCH .../objectives/:id` and `assumes`.

**(d) "nothing to do" for people waiting on Rukia** (`313a9ac4`). Their answers were checkable and the wait was recent and chased, so the row was "nothing to do". A wait on somebody other than the reader is now `reason: "waiting on someone"`, with `says` "Baraka Otieno has checked in, and is waiting on Rukia Mwangi for the discount decision." A wait on the reader keeps "is waiting on you". To the lead, the admin who set it up and Juma; people who check in are not sent these rows. **I changed two lines in your files** so the new reason draws: `client/src/components/gw/where-each-person-is.tsx` (`Reason`, the label "Waiting on someone", tone "attention") and `client/src/api/board.ts` (the reason type). Please keep or redo them your way.

**(e) The first-person blocker line** (`e63d3e43`). `blockers[].holdingUp` now quotes the person where the words are what they typed, unchanged: "Baraka Otieno said that once it is cleared, "I will ask Chandarana for the signed agreement on 2 October when they decide."" To Baraka: "You said that once it is cleared, ...". Where the words are the record's own, only a leading "I will" becomes the name; anything else in the first person reads "Baraka Otieno said what they will do once it is cleared." A line not in the first person reads as before.

**(f) Stage by stage** (`56cd5450`). Only stages with a deal in them are sent, in order ("2 deals were reported at Quoted, and none of them has a document behind it."). With none at all, `reportedAgainstCriteria.says`: "Nobody has reported a deal at any stage yet."

**(g) Session 2 "upcoming"** (`b358fcdd`). A session somebody has checked in to, or started, is now `current`, so "Who checked in" draws its squares. Only a session nobody has started is `upcoming`. `currentSession` still counts the round still open. The same for every reader.

**(h), not done here.** "Waiting on: Chandarana Westlands" is drawn by `BoardPage.tsx` (line 2593) from `d.on`. The engine already sends full sentences: `blockers[].says` ("Baraka Mwangi is waiting on Chandarana Westlands for ...") and `eachPerson[].says`. Please draw those in place of the colon.

**Decided for Hafsah to confirm:**
- A person who waits on a colleague gets the reason "waiting on someone", ordered after "nothing checkable" and before "nothing to do".
- The gap closers count each open deal (Likely or Possible) as one toward the team's aim, and are not offered where the aim is money or a share.
- Help nobody mentioned goes to whoever runs the check-in only (the more private choice), never says who credited the person, and counts only where the person's own lines say nothing about the same work.
- Contact history counts lines from people this reader may read, and names nobody.
- A deal's "read in their own words" is the owner's latest typed sentence that names it.

Tests (each fails without its part): `request-115-b-a-deal-row-as-the-prototype-has-it.spec.ts` (6), `request-115-c-what-the-sales-board-was-missing.spec.ts` (13), `request-115-d-waiting-on-a-colleague.spec.ts` (6), `request-115-e-a-blocker-line-says-whose-it-is.spec.ts` (7), `request-115-f-only-stages-with-something-in-them.spec.ts` (2), `request-115-g-an-open-session-is-not-upcoming.spec.ts` (5). Tests changed, each because it expected the defect: `where-each-person-is-against-their-number` (3 cases) and `a-board-that-does-not-contradict-itself` ("nothing to do" or "still has something in the way" for somebody waiting on a colleague), `request-107-c-the-fields-the-boards-need` (the empty Pitched row), `each-kind-of-work-has-its-records` (whole rows, now with the new fields). The board test harness can now be given WorkMention rows. One board test, `the-board-answers-its-own-question` ("prints what each account said"), fails before and after this work, because it reads `client/src/pages/board/BoardPage.tsx`.


## 2 October: two more lines in your files, for you to check

For request 115 (d), the engine work changed two lines in `client/src/components/gw/where-each-person-is.tsx` and `client/src/api/board.ts` so the new reason "waiting on someone" draws. Please check them and keep or redo them your way. The engine's test `the-board-answers-its-own-question.spec.ts` now accepts your filtered drawing of a difference's positions (only sides with words, after request 109).

## Requests 100, 101 (c), (e) and (f), 104 and 115 (h) (2 October)

Each is proven as each reader: the lead, the people who check in, an admin who only reads, the admin who set it up, and where it applies the person reviewed on an evaluation check-in.

**Request 100 (1), `divergence.whyNothingYet`** (`563dee0d`). Already built on 1 October: it is deleted wherever there is a difference or an agreement. A new test holds the agreements-only case for all five readers, and fails without that line. Over a section with nothing in it, whoever runs it is still told why.

**Request 100 (2), `kindOfWork`: not taken off the wire.** Your screens draw by it for every reader: the participant's own records (`TheParticipantsOwnView`), `isSalesOrg` (which keeps the deal grid off a participant's board), the section headings and the banner's sentence. Taking it away from people who do not set it would put back the defect your comment beside `isSalesOrg` describes. It is a key, like `scenario` and `family`, and a test now holds that no sentence any reader is sent quotes it. If you want it off the wire, say which sentence or flag should replace it, and I will serve that first.

**Request 101 (c), "A colleague has not checked in yet." about Zawadi: not built. Needs Hafsah.** Zawadi has no name on record, only her address. Your roster's "Zawadi U8" is made from that address by `personLabel`. The engine's rule since 28 September (`fdc1439b`, Hafsah: nobody is ever shown an address as a name) is held by tests on the board and the report (`the-same-thing-for-three-check-ins.spec.ts`: "only her address is known, and it must never stand in for a name"). I built it and took it out again, because the board would then call her "Zawadi U8" while her report, which this workspace's other builder owns, calls her "a colleague", and those tests break. Your own review (morning-report-ui, item 4) also lists "makes up Zawadi U8 from her email" as a defect. The choice for Hafsah: either the lead and the admin who set it up read the name in the address everywhere, board and report together, or the roster stops making a name and says "a colleague", with the address beside it for the lead.

**Request 101 (e), the Context tab's model call** (`90dfaecd`). Opening the tab sends `POST /grounds/:id/context-chat` with an empty history. That no longer asks the model. The opening is written from what is stored: the length and rhythm already set, then the product's own question for the first thing missing. Opening it twice reads the same both times. The first model call is made on the lead's first message. Ask Groundwork's empty opener goes the same way. Before, the reply was a new model reply on each open. Now, to the lead (and an admin of the organisation, whom this route already lets in), on a check-in with its length and rhythm set:

> This check-in runs for 90 days and people check in once a week. What does doing well look like here? I do not mean a target for one person. What would make you say, at the end, that this went the way it should have?

With no length set yet: "How long should this run? You can give an end date or a number of weeks. I need it to work out how many check-ins there will be." Somebody who checks in is still refused. Nothing on the screen needs to change.

**Request 101 (f), one count for the sessions** (`8a986e1c`). `GET /grounds/:id` now serves `sessionClock: { currentSession, plannedSessions, says, whileOpen }`, from the board's own clock (request 107 e): the open round among the people who check in, capped at the last planned session. Please draw the header from `says`, and draw `whileOpen` (when it is not null) in place of "It went back to session N, because somebody new was added." Every reader gets the same thing; it names and counts nobody. With Rukia and Baraka on session 2 and Zawadi, newly added, not yet through session 1, all five readers get:
- `says`: "Session 1 of 12."
- `whileOpen`: "Session 2 has started for some people, while session 1 is still open."

Once Zawadi finishes session 1: "Session 2 of 12." and `whileOpen: null`. A test checks this against the board's `phaseSpine` for the same rows.

**Request 104, `mayChangeSetup`** (`41ec7b01`). The brief already follows decision 72 (built 1 October, tested in `whose-words-the-brief-is.spec.ts`). `GET /grounds/:id` now serves `mayChangeSetup`, worked out by the same function the writers use (`whoMayConfirmSetup`). It is true for the lead, and for an admin of the organisation only once the lead's account shows they have left. It is false for the people who check in, an admin who only reads, the admin who set it up while the lead is still there, and the person reviewed. Please offer "Rewrite" and "Write the brief" from it.

**Request 115 (h), "Waiting on: Chandarana Westlands"** (`2d322746`). Each item in `dependencies` (the "Waiting on" cards) now has `waitingSays`, one sentence that says who is waiting on whom, with "you" for the reader on either side. Please draw it in place of "Waiting on: {on}". What each reader reads:
- The lead, the admin who set it up, and Juma: "Baraka Otieno is waiting on Chandarana Westlands.", "Rukia Mwangi is waiting on the warehouse.", "Baraka Otieno is waiting on Rukia Mwangi."
- Baraka: "You are waiting on Chandarana Westlands.", "You are waiting on Rukia Mwangi."
- Rukia: "Baraka Otieno is waiting on you.", "You are waiting on the warehouse."
- Where people see only themselves, Baraka reads only his own waits, and a colleague is "a colleague", never named.
- An evaluation check-in has no "Waiting on" section, so the person reviewed is sent none.

The second line on each card ("Baraka needs the signed agreement from Chandarana Westlands. This is waiting.") is built on your side and is already a sentence. "When this arrives, Baraka says: ..." is also yours, and is joined with a colon.

**The setup conversation follows decisions 63 and 72 now (2 October).** `POST /grounds/:id/context-chat` let any admin of the organisation in while the lead was still there. It now goes through the same rule as every setup writer (`mayConfirmSetupOn`), and so does `/context-chat/decline`; `/context-chat/confirm` already did. Ask Groundwork's setup lane offers the setup conversation only on check-ins this person may set up.
- Wanjiru, the lead: opens it and talks in it, as before.
- Otieno, an admin, and Neema, the admin who set it up, while Wanjiru is still there: before, they could open it and talk in it. Now each is refused (403) with "Only Wanjiru Mwangi, who runs this check-in, can change how it is set up. An admin can only do that once Wanjiru has left the organisation. Nothing was changed." In Ask Groundwork they get its ordinary answer, as somebody with nothing to set up does.
- Otieno and Neema once Wanjiru has left: they may, as before.
- Aisha, who checks in: refused, as before, now in the same words.

Please offer the Context tab's conversation only where `mayChangeSetup` is true, so nobody opens a page that refuses them.

## Request 101 (a), (b) and (d): the session report's picture, for each reader (2 October)

All on `GET /grounds/:id/report/session/:n`, proven on a copy of "Sales team, Q3" (Rukia runs it and checks in; Amani, Baraka and Neema check in; Faraji was not let in; Juma is an admin who only reads; Grace set it up), and on a performance plan about Amani.

**(a) A reading about each person, sent to everybody** (`16ea931f`). The shared picture carried the coverage read of each person, grouped and joined by a colon. A reading about a person reaches only that person and the lead, and the lead reads it on the board, so the picture no longer carries it at all (the contribution read went in request 111 a). The engine still makes both reads. The draft's grouped and pattern lines are now sentences, never names and a claim joined by a colon.
- Before, Amani read: "Rukia Otieno, You, Baraka Mwangi and Neema Achieng: the role was never clearly defined, so there is no boundary to measure work against. Define what this role owns before reading anything into where work is landing." Rukia, Baraka, Juma and Grace read the same with their own names or "You".
- Now, every reader: no such line. Amani's picture of session 1 reads "4 of 5 people have answered this session. There is enough here to talk about, and not enough to settle anything." and the wait of that session (below).

**(b) "Faraji Odhiambo: 0 check-ins on record, nothing specific named yet."** This had already gone with request 111 (a) (`c52e4190`). A test now holds it for every reader: nothing in the picture is about Faraji, and no "check-ins on record" line is sent to anybody. Found while proving it: the lead's "What to ask each person" listed Faraji with "Faraji Odhiambo has not answered this session, so nothing below is from this round.", which asks the lead to chase somebody who cannot check in. He is no longer on that list (`33e7a809`). One thing left for you to decide: the session report's `counting` list (who this session is counting) still has a row `{ who: "Faraji Odhiambo", answered: false }`, and the count says "4 of 5". The count is shared with the rule that decides when a session is complete, so I have not changed it here. If Hafsah wants someone not yet let in out of the count, that changes when a session closes, and is hers to say.

**(d) To Rukia about herself** (`16ea931f`). Every report read now says the reader's own label as "you" (and "your" for "'s"), with the verb mended. Only for the reader themselves: an admin who set it up still reads the lead's name.
- Rukia, before: "Rukia Otieno makes a decision on the discount. That is what settles who decides the discount." Now: "You make a decision on the discount. That is what settles who decides the discount."
- Amani, Juma and Grace, as before: "Rukia Otieno makes a decision on the discount. That is what settles who decides the discount."
- "... are waiting on them for 3 days" was request 107 (b) and stays fixed: Rukia reads "Baraka Mwangi has been waiting for 3 days on you for a decision on the discount ...".
- The same rule reaches the rounds: the lead now reads "You have accounts from Amani Kariuki and Juma Otieno this round.", Amani "Rukia Mwangi has accounts from you and Juma Otieno this round.", and an admin reads every name.
- The board has its own copy of this read and still says the reader's own name there. That is the board's file, so I have not changed it: in `board/board.service.ts`, the call `whatEachLabelIsCalled(ground.participants as any[], { ... })` takes `readerIsYou: true` to do the same.

Tests: `reports/request-101-the-session-report-for-each-reader.spec.ts` (19 cases, 10 fail on the code before). Changed, each because it expected the defect: `the-picture-is-drafted-from-the-reads` (the colon form), `how-this-has-moved-is-written-for-every-reader` (the lead reading her own name), `a-read-needs-the-marker-it-reads` (pinned a line that is gone; now it also holds that the report calls no per-person read).

## Request 102: a closed session's own report carries its own coaching note, probe list and inferences (2 October)

Done (`33e7a809`, `686abe3c`). `GET /grounds/:id/report/session/:n` now carries `coaching`, `probes` and `inferences`, each for that session. Please read them from there on a session's own page, and drop the "Since then, in the latest check-in" section, or keep it for the latest only.

**How each is frozen.** For the session the report holds now, they are what `GET /grounds/:id/report` serves. For an earlier session, they are built from the record as it stood when it closed: its own sessions and lines, the waits raised by then and not cleared by then, documents added by then, each pattern counted only over the periods it had been seen in by then, and days waited counted to the day it closed. Each inference now carries the session it was concluded in. A new synthesis replaces only the items of the session the report holds now, and keeps earlier sessions' as they were; `GET /grounds/:id/report` now serves only the latest session's. An earlier session that was synthesised before this change has no kept inferences, so it gets an empty list rather than a later session's. Opening the page rebuilds nothing and asks no model (decision 7); a test checks the model is never called.

**Who is sent what** (the same walls as `GET /grounds/:id/report`; a field a reader is not given is not sent at all):
- Rukia, who runs it and checks in, on session 1 (closed 27 September). Before: nothing on this read; the page showed the working copy's "This is session 2 of this work." and "Baraka Mwangi ... Has not answered this session". Now: `coaching.whyItMatters` "This is session 1 of this work. Nothing repeats yet, which is normal this early. What decides whether the later sessions are worth anything is what you can point at.", `coaching.beforeNextTime` "Baraka Mwangi is waiting on you for 3 days for a decision on the discount. Either do it, or give a date you can do it by.", `probes` for Amani, Baraka and Neema only (everybody answered session 1, so nobody "has not answered this session"), with Baraka's "Baraka Mwangi has been waiting for 3 days on you for a decision on the discount, and nothing on record says it was raised higher. This early, that is worth showing Baraka Mwangi rather than asking about.", and `inferences` with session 1's only.
- Rukia on session 2: session 2's note ("Amani Wekesa is waiting on you for 2 days for the price list. ..."), probes and inferences, as the working copy has them.
- Amani and Baraka: their own `coaching` for that session only ("This is session 1 of this work. ..."); no `probes`, no `inferences`.
- Juma, an admin who only reads: no `coaching`, no `probes`; `inferences` of that session, as `GET /report` gives him.
- Grace, the admin who set it up: `probes` and `inferences` of that session ("Baraka Mwangi has been waiting for 3 days on Rukia Otieno for ..."); no `coaching` of her own.
- On a performance plan about Amani: Amani reads her own note only; Rukia and Grace read session 1's probes and inferences only; Juma, not given access, is refused the session report, as before.

**Found with it, and fixed** (`686abe3c`). Session 1's own picture said "Amani Wekesa is waiting on you for the price list.", a wait raised in session 2, and left out the wait session 1 was about, because that one had been cleared since. A closed session's picture now waits on what was waited on then. Rukia reads "Baraka Mwangi is waiting on you for a decision on the discount, with no escalation on record."; Baraka "You are waiting on Rukia Otieno for ..."; Amani, Juma and Grace "Baraka Mwangi is waiting on Rukia Otieno for ...". Session 2's picture keeps session 2's wait.

One thing to know: "Correct this" on an inference finds it by its id. If a later session's synthesis reuses an id an earlier item had, the earlier item is kept under a new id (`s1-<id>`), so a correction asked from its own page still finds the right one.

Tests: `reports/request-102-a-closed-session-keeps-its-own-coaching.spec.ts` (20 cases, 15 fail on the code before).

## Request 103: sessions scored before request 45's fix (2 October)

Done (`01c74168`). The person's own read is now one function, `readTheTurns` (`conversation/the-specificity-read.ts`), used when a check-in completes and by a one-off script, `api/journey/bring-the-checkability-read-up-to-date.ts`. The script reads each finished check-in's own turns again under the current rule and raises any part the current rule reads higher. It never lowers a part, never changes the overall level, never touches anybody's words, and writes only `specificityDimensions`, which is served to the person alone (the lead and admins still get null).

**Run on the local test database only** (`gw_pw9_1786222102`). The dry run first printed:
> 6325 finished check-ins were read again under the current rule.
> 4506 check-ins would have a part of the read raised. No part would be lowered, and nobody's words would change.
> "One date, number or document" would be raised on 4371 check-ins.
> "What you were waiting on, and from whom" would be raised on 984 check-ins.
> "What you did, not just what was happening" would be raised on 1 check-in.

Then the write, then a dry run that found 0 left. "Sales team, Q3" is on your database, not this one, so its check-in `7bad4943` was not touched; run the script there (below) when you want it.

**What Amani reads on the Done page**, on a session shaped like hers ("... deliver three cookers to Tuskys Kilimani on 9 October ...", "I am waiting on Rukia for the price list."):
- Before: "One date, number or document. Groundwork did not pick this up this time." and "What you were waiting on, and from whom. Groundwork did not pick this up this time."
- Now: "One date, number or document. Groundwork found this." and "What you were waiting on, and from whom. Groundwork found this."
- Rukia, Baraka, Juma and Grace: nothing of Amani's read, as before.

With this, `SHOW_THE_COUNT` in `TheDonePage.tsx` no longer has to wait on request 103 for a database the script has run on.

**A hosted database** is brought up to date as a release step, by whoever runs the release, with the same guard as the word-for-word script (decision 74, item 5). `DATABASE_URL=<hosted> npx ts-node -T journey/bring-the-checkability-read-up-to-date.ts --hosted-database` is a dry run that prints the counts above and writes nothing. Adding `--write` prints the same, then asks for the database's host name to be typed back, and writes only when it matches exactly; a wrong name, no answer, or no keyboard writes nothing. Without `--hosted-database`, any database not on this machine is refused before anything is read. The engine work never runs it anywhere but a local `gw_` database.

Tests: `api/journey/bring-the-checkability-read-up-to-date.spec.ts` (8 cases: the rule, the dry run's words, only that column written, never lowered, what each reader is sent after it, and the hosted guard). Changed, because the lines they pinned moved unchanged into `the-specificity-read.ts`: `a-worse-session-scores-lower`, `one-checkable-turn-is-not-nothing-checkable`.

## Context lines, private notes and questions for people follow decisions 63 and 72 (2 October)

A context line is setup, a lead's private note is the lead's own, and a question for a person is the lead's to ask. Each is now written only by the lead, or by an admin of the organisation once the lead has left. Anybody else is refused with the same sentence as every setup change: "Only Wanjiru Mwangi, who runs this check-in, can change how it is set up. An admin can only do that once Wanjiru has left the organisation. Nothing was changed." Who may read a private note does not change: only the lead.

**The writers, behind their own routes and Ask Groundwork's doors:**
- These already refused under this rule, and a test now proves it for each reader: adding and changing a context line (`POST` and `PATCH /grounds/:id/context`), keeping and sharing a private note (`POST /grounds/:id/lead-context`, `.../share`), and keeping, confirming and leaving out a question for a person (`.../questions-for-people/:itemId/confirm` and `/decline`).
- One did not: the step that works out the exact question before the lead's yes (`theQuestionForAPerson`) let any admin of the organisation in. Before, Otieno (an admin) and Neema (the admin who set it up) got the sentence while Wanjiru was still there. Now both are refused, and Aisha's refusal is in the shared sentence instead of "Only the person who runs this check-in can ask people things through it. Nothing was asked."

**Ask Groundwork's doors** (a context line, a private note, a question for a person) list only the check-ins this person may set up. Before, an admin was offered every check-in in the organisation while its lead was still there, and was refused only after saying yes. Now that admin, and the admin who set it up, get Ask Groundwork's ordinary answer, as somebody with nothing to set up does.

**As each reader, on each writer and each door:** Wanjiru, the lead, may. Otieno and Neema may not while Wanjiru is there, and may once she has left. Aisha, who checks in, may not, before or after.

Reading the list of questions waiting for people (`GET /grounds/:id/questions-for-people`) is a read, and is unchanged: the lead and an admin with access to the check-in.

## Request 101 (b), the count: somebody not let in yet is not counted (decision 77, 2 October)

Hafsah decided item 64: "A person an admin hasn't let in yet is left out of both the 'N of M have answered' count and the count that decides when a session closes. They are shown separately as waiting to be let in." Done (`44c7b88b`, `508cde24`).

**Who is meant.** Somebody whose sign-in is still held at the organisation's door (`user.awaitingOrgApproval`), whether an admin has not decided yet or has said no. The conversation already refuses them, so no count waits on them. One function decides it for every count: `isNotLetInYet` and `whoIsNotLetInYet` in `api/src/modules/grounds/who-an-admin-did-not-let-in.ts`. Once an admin lets them in, they are counted again at once.

**What changes on the wire.** On "Sales team, Q3" (Rukia runs it and checks in; Amani, Baraka and Neema check in; Faraji Odhiambo is not let in yet; all four let in have answered session 1):
- The session report: every reader's opening line was "4 of 5 people have answered this session." It is now "4 of 4 people have answered this session. There is enough here to talk about, and not enough to settle anything." `counting` no longer has a row for Faraji.
- The board and the check-ins list: `howItIsGoing.glance.progress` / `glance.progress` count `answeredThisRound` and `ofPeople` without him, `waitingOn` never holds him, and a round is done once everybody let in has answered.
- `GET /grounds/:id`: `sessionClock` is no longer held back by him. With Rukia already in session 2 it read "Session 1 of 12." and "Session 2 has started for some people, while session 1 is still open."; it now reads "Session 2 of 12." with `whileOpen: null`.
- Today: "In Sales team, Q3, 4 of 5 have checked in for the first check-in. Brian has not checked in yet." where it was "4 of 6", for somebody still waiting as well as somebody declined.
- The weekly report: his check-in is not one of those due ("Both check-ins due this week were made.") and he is not written up as not having checked in.
- The session closes, and its report is written and released, once everybody let in has answered.

**The separate line, `waitingToBeLetIn`** (a sentence, or null), on the session report, the board, `GET /grounds/:id` and each row of the check-ins list. Please draw it beside the count, never inside it. It goes only to whoever runs the check-in, the admin who set it up and an admin with access, because whether somebody has been let in is the organisation's business:
- Rukia, Grace (who set it up) and Juma (an admin): "Faraji Odhiambo is waiting to be let in." After an admin said no: "Faraji Odhiambo was not let in." Where no name is known: "1 person is waiting to be let in."
- Amani, Baraka and anybody else who checks in: null, before and after a decline, whether or not people see each other. Their counts still leave him out.
- With nobody held at the door: null for everybody.

**For your own count.** Each row of `GET /grounds/:id` `participants` now carries `notLetInYet` (true or false); `user.awaitingOrgApproval` was already there. `whoIsInRound` in `client/src/lib/who-is-in-this-round.ts` still counts every row, so a header drawn from it would read "4 of 5" beside the engine's "4 of 4". Please leave out a row with `notLetInYet: true` that has not answered, or draw the count from the served numbers.


## Decision 79, item 1: the Company page, section by section, and exactly what it receives (2 October)

Commit `61f0840d`. The route is the same: `GET /company`, for anybody signed in to the organisation. A guest from another company is refused with 403 and "Only people in this organisation can read its company page." Everything below is written once, when something new comes in (a check-in completes, a handoff is raised, or the nightly look finds the organisation's priorities changed), and only read when the page opens. Until it is written, `reading` is null, `levels` is empty and the lists are empty: draw nothing in their place.

### Who is given what

| Reader | Name, counts, priorities, owners, `fedBy` | `reading`, `levels`, `namedByTeams` | `notReaching` | `saidAndShown` | `whatWeKeep` |
| --- | --- | --- | --- | --- | --- |
| An admin | Yes, with `measure` and `target` | Yes, each item only if they may open every check-in it rests on | All | Yes | Yes |
| A lead (role LEAD) | Yes, without `measure` and `target` | Yes, each item only if they may open every check-in it rests on | Only the questions asked of them, with `forWhom` "For you" | No (empty) | Yes |
| Somebody who runs a check-in (any role) | Same as a lead | Same as a lead | Same as a lead | No (empty) | Yes |
| Somebody who only takes part in check-ins | Yes, as before | No: `reading` null, `levels` empty, `namedByTeams` empty | No (empty) | No (empty) | Absent |
| A guest from another company | Refused | Refused | Refused | Refused | Refused |

This is new: before today, somebody who only took part in the check-in that feeds a priority read that priority's `reading`. They no longer do (decided for Hafsah to confirm, below). They still read the page's name, counts, priorities and who owns them, because the prototype shows "Company" to everybody and the priorities hold nothing private.

### The fields, in the prototype's order (company.txt)

    GET /company
    {
      name: string,
      line: string | null,
      readsTargets: boolean,
      priorities: [{
        id: string, number: number, title: string,
        owner: string | null, tag: string | null, fedBy: string | null, staleSays: string | null,
        reading: { tag: string, says: string } | null,
        levels: [{ id: string, depth: number, level: string, title: string, changedHere: string | null, fedBy: string | null }],
        measure?: string | null, target?: string | null          // admins only
      }],
      notReaching: [{ id: string, observation: string, question: string, forWhom: string }],
      namedByTeams: [{ id: string, title: string, touches: string,
                       teams: [{ team: string, says: string, checkIns: [{ id: string, name: string }] }] }],
      saidAndShown: [{ id: string, area: string, youSaid: string, checkInsShow: string }],
      whatWeKeep?: { readBy: string, items: [{ id: string, kind: string, says: string, source: string }] }
    }

**1. The heading.** `name`: "Baridi Appliances". `line`, to an admin: "3 teams and 11 people work here, and there were 34 check-ins this week." To anybody else: "3 teams and 11 people work here." The prototype's "Strategy v2, since 1 September." is not served: nothing keeps versions of the strategy (see "Not built"). "Ask about the whole organisation", "Company context" and "Ask about the strategy" are buttons of yours; nothing new is served for them.

**2. Is the strategy moving? One card per priority.** "Priority 1" is `number`. `title`: "Improve delivery". The tag at the top right is `reading.tag`, one of "Nobody owns it yet", "Nothing is moving it yet", "At risk", "Quiet for a month", "Moving, but not enough of it", "Moving". When `reading` is null, draw `tag` instead (it is "Nobody owns it yet" or null). The sentences are `reading.says`, for example "One handoff is stopping work on this priority, so delivery is not moving yet." or, written from the counts, "1 check-in feeds this priority, and 2 were finished in the last 30 days. 1 handoff is waiting on other work." or "Nobody owns this priority yet and no check-in feeds it." The line at the bottom is `fedBy`: "Fed by Sales team, Q3" or "No team feeds it" (null when what feeds it is not the reader's to open). `staleSays`: "This was last updated on 28 August."

**3. What each level understood (new).** On each priority, `levels`, top down: the priority itself (`depth` 0, `level` "Priority 2"), then each objective and project under it (`level` "Objective" or "Project", `depth` 1, 2 and so on, in the order the organisation's own system gave them). For example:

- `depth` 0, "Priority 2", "Improve delivery", `changedHere` null, `fedBy` null
- `depth` 1, "Objective", "Reduce delivery delays", `changedHere` null, `fedBy` "Fed by Operations, Q3"
- `depth` 2, "Project", "Buy 20 delivery vans", `changedHere` "The meaning changed here, from orders arriving on time to more vans.", `fedBy` null

`changedHere` is said only where the model found the aim means something other than the aim above it, and its words named nobody, held no number and judged nobody. `fedBy` names only check-ins the reader may open. This is the prototype's "What each level understood" (what-each-level-understood.txt), within one organisation; it is the same on the Company page and on a board, so draw it where you prefer (under a priority card that opens, or as its own part of the page).

**4. Where the strategy isn't reaching the work.** `notReaching`, in this order: a priority with no owner, a priority with an owner but nothing under it, an objective or project under no current priority, and one still open past its date. For example `observation` "Priority 3 has no owner and nothing underneath it.", `question` "Who owns priority 3, Build a stronger organisation?", `forWhom` "For you". Or "The customer portal sits under no current priority.", "Which priority does The customer portal serve?", "For Lina Ali, Product lead". Or "Sign the Nakuru distributor is still open, and its date has passed.", "Should Sign the Nakuru distributor get a new date, or be closed?", "For Wairimu Kamau, Sales lead", which Wairimu herself reads as "For you". Draw "Decide" for "For you" and "Ask" for anybody else; neither button has a route yet (see "Not built"). A customer or a decision is never listed here (that was a fault, fixed today).

**5. Named by more than one team.** `namedByTeams`: `title` "No way for customers to order in bulk"; `touches` "Touches priorities 1 and 2. Nobody owns it." ("Nobody owns it." only when not one of its handoffs says who or what it waits on; "It does not sit under any priority yet." when it touches none). Each team, in alphabetical order: `team` "Operations", `says` "Bulk orders are typed in a second time by hand, which holds up delivery." or, from the counts, "Customers raised this in 1 check-in, with 1 open handoff.", and `checkIns` [{ id "g-ops", name "Operations, Q3" }], where "Read what each team said" can take the reader. Only things at least two teams raised, and only to a reader who may open every check-in behind it. Never a colleague's own words.

**6. What you say, and where the time goes.** `saidAndShown`, admins only, once at least three check-ins on priorities were finished in the last 30 days: `area` "Priority 1", `youSaid` "Grow revenue 50%, enterprise first", `checkInsShow` "2 of the 3 check-ins finished in the last 30 days that belong to a priority were about this one. 1 handoff is open in them." `youSaid` is the priority as the organisation's own system wrote it, not anybody's words, so please draw it without quotation marks. The line under it, "People appear here as counts. What each person said stays with them and their own lead.", is yours and stays true.

**7. What new people keep asking.** Not served (see "Decided for Hafsah to confirm"). Draw nothing.

### The company board, the ministry's board and its questions

- company-board.txt is the older page; it is served by the same fields (priorities with `reading`, `owner`, `fedBy`; "Observations, as questions" is `notReaching`; "The same thing, named in three places" is `namedByTeams`; "Leadership says, teams report" is `saidAndShown`). Its "Evidence" line and "Strategy history" are not served (see "Not built"). The view switch (Leadership, Sales lead, Everyone) is decided on the server by who is reading, never on screen.
- what-each-level-understood.txt: "What each level understood" is `levels`, within one organisation. The counties, "Each county is its own organisation", and "What the visit log shows" are not served (see "Not built").
- questions-for-the-ministry.txt: within one organisation, the nearest is `namedByTeams` (a problem several teams raise, said once, as a question). Questions from linked organisations are not served.

### Not built, and what each would need

- **"Strategy v2, since 1 September", the History tab and "Strategy history".** Nothing keeps versions of the priorities, and no check-in records which version was active. It needs a new table for each version of the organisation's priorities and the date it began, and a column on each check-in for the version active that day. That is a schema change, which I have not made.
- **The figures in the prototype's sentences** ("4 of 12 qualified", "On time is 88% against 95%", "6 in 10 sales visits went to small shops", "Founders made 9 decisions this month"). The first two are a check-in's own aims; decision 73 keeps a check-in's aims and limits from an admin who only reads, so they cannot go on a page an admin reads without a decision from Hafsah. The last two need records the product does not hold (visits by kind of customer, and decisions taken by a founder that sat inside someone else's role).
- **"One sales goal still points to last quarter's strategy."** Needs strategy versions, above.
- **The Teams tab.** No screen shows what is in it.
- **The buttons "Decide", "Ask", "Make someone responsible" and "Open".** No route acts on them yet.
- **Linked organisations** (the ministry and its counties, "You see summaries, never officers' own words", questions for the ministry). Nothing links two organisations, and what one may read of another is a privacy rule for Hafsah (request 17 (f), item 26.6).
- **What new people keep asking.** Built only from questions to Ask Groundwork, which are private always (request 17 (g), item 26.1).

### Decided for Hafsah to confirm

1. **Who reads the company-wide picture.** An admin, a lead, and anybody who runs a check-in, the same readers as what the organisation keeps. Somebody who only takes part reads the page's name, counts, priorities and owners, and none of what the engine wrote. This is the more private option; before today a participant read how the priority their check-in feeds was moving.
2. **A lead is asked their own questions.** Where the strategy is not reaching the work goes in full to admins; a lead, or anybody who runs a check-in, is given only the questions asked of them, as "For you". The prototype says each question "goes to the person who can answer it".
3. **What new people keep asking (request 17 (g)) is not built.** No decision since 27 September answers item 26.1, and the rule is that questions to Ask Groundwork are private always, so the more private option is to leave it out.
4. **Linked organisations (request 17 (f)) are not built.** No decision answers item 26.6. "What each level understood" is built within one organisation instead, from the organisation's own aims, which needs no new privacy rule.

## Decision 78: the free trial is one month, and WhatsApp is a paid add-on, on Plan and billing (2 October)

Commits `510f9479` (the trial) and `c694a670` (the add-on and the limit). Nothing in `client/` was touched. Everything a person reads below is served by the API, built from the database; please show the sentences as they come and do not write any of them, or any price, limit or number of months, into the screen.

### The free trial is one month

`GET /billing/pricing` still serves `trial: { on, teamsUnder, months }`. `months` is now `1` (the setting `pricing.freeTrial`, and its shipped default). The switch is still off, so nothing about the trial is shown until Hafsah turns it on. When it is on, the prototype's "3 months" has to come from `months`, and one month reads as "1 month", never "1 months": for example "Teams of fewer than 20 people get 1 month free." The screens' own sentence builder (`client/src/lib/the-free-trial.ts`) is yours to check for the singular.

### WhatsApp on Plan and billing

**`GET /billing/whatsapp`**, for anybody signed in to the organisation. What it serves depends on who reads it, and the server decides that, not the screen.

An admin of the organisation (role ADMIN) is served:

    {
      on: boolean,                       // whether the organisation has turned WhatsApp on
      plan: 'STARTER' | 'SMALL_TEAM' | 'GROWTH' | 'BUSINESS' | 'SCALE' | 'ENTERPRISE' | null,
      price: { amountCents: number, currency: 'USD' } | null,   // the add-on's price on this plan, a month
      charged: boolean,                  // whether it is a line on the Stripe subscription now
      freeTrial: { months: number, endsOn: string } | null,     // only while the organisation is in its free trial
      onTheFreePlan: boolean,
      use: { month: '2026-10', sent: number, limit: number | null, startsAgainOn: string },
      sending: boolean,                  // whether a WhatsApp message for this organisation goes now
      heldBecause: 'not turned on' | 'not on a paid plan' | 'at the limit' | null,
      says: {
        onOrOff: string,
        price: string | null,
        charge: string,
        use: string,
        atTheLimit: string | null,
        reachedTheLimit: string | null,
        held: string | null
      }
    }

Anybody else (a lead, somebody who takes part, a guest) is served only:

    { sending: boolean, says: string | null }

They are never served the price, the use, the limit or whether the organisation pays.

**`PATCH /billing/whatsapp`** with `{ on: true }` or `{ on: false }`, an admin of the organisation only (a lead or member gets 403). It answers with the admin's shape above. Turning it on for a plan that does not sell it (Enterprise) is refused with 400 and "WhatsApp is not sold by itself on Enterprise. Contact us to arrange it."

### What to show, and where

A new section on Plan and billing, under "Your plan", titled **WhatsApp**, for an admin:

| Row | Show | Example, as served |
| --- | --- | --- |
| On or off | `says.onOrOff`, with a switch that sends `PATCH /billing/whatsapp` | "WhatsApp is on for your organisation." or "WhatsApp is off for your organisation, so check-ins stay in the app." |
| Price | `says.price` | "WhatsApp costs $72 a month on your Small Team plan." |
| What is charged | `says.charge` | During the trial: "Your free trial lasts 1 month and ends on 1 November 2026. Nothing is charged for WhatsApp until then." On the free plan: "Nothing is charged for WhatsApp while you are on the free plan." Paying, with it on: "WhatsApp is added to your monthly bill as a second line." Paying, with it off: "If you turn WhatsApp on, it is added to your monthly bill as a second line." While the trial switch is off: "Nothing is charged for WhatsApp at the moment." |
| This month | `says.use` | "Your organisation has sent 412 of its 2,000 WhatsApp messages this month." |
| At the limit | `says.atTheLimit` | "If your organisation sends all 2,000 messages in a month, nothing more is sent by WhatsApp until the next month begins. Check-ins carry on in the app, and you are told once." |
| Reached | `says.reachedTheLimit`, only when not null, in place of the "At the limit" row | "Your organisation has used all 2,000 of its WhatsApp messages for October. Nothing more is sent by WhatsApp until 1 November 2026. Check-ins carry on in the app, so nobody misses one." |

If you draw a bar for the use, use `use.sent` and `use.limit`; with `limit` null, draw no bar.

For everybody, including the admin: where a check-in would have gone to their phone (the check-in page, and Settings beside their WhatsApp number), when `says` (or `says.held` for an admin) is not null, show it as it comes. The three sentences are:

- "Your organisation has not turned on WhatsApp, so this check-in stays in the app."
- "Your organisation is not on a paid plan at the moment, so this check-in stays in the app."
- "Your organisation has used all its WhatsApp messages for this month, so this check-in stays in the app. WhatsApp starts again on 1 November 2026."

### What happens, so the screen does not have to guess

- While the free trial's switch is off, which is how it ships, nothing is held and nothing is charged. WhatsApp goes exactly as today. The monthly limit still applies.
- Once it is on: during the free trial and on the free plan, WhatsApp goes and nothing is charged. After the trial, an organisation that pays with WhatsApp turned on has it as a second monthly line on its Stripe subscription; without it turned on, nothing goes by WhatsApp.
- At the limit, nothing more goes by WhatsApp until the first day of the next month (UTC). The check-in carries on in the app, and the organisation's admins are emailed once that month.

### For Groundwork's own staff (Admin, System, Pricing)

`GET /admin/pricing` now carries `whatsappAddOnCents` and `whatsappMonthlyLimit` on each plan. `PATCH /admin/pricing/:plan` takes either or both, beside `amountCents` and `memberCap`: the price in cents (empty takes it off sale on that plan), and the limit as a whole number of messages a month (empty means no limit). A changed price creates a new Stripe price the next time it is needed.

## WhatsApp on the Connections page: exactly what `GET /integrations/whatsapp` serves (2 October)

For the WhatsApp card on Connections (`docs/prototype/screens/F1-connections/connections.txt`): "WhatsApp", "Connected", the sentence, and the three counts. Organisation admins only, as before; a lead, a member or a guest gets 403 from the server. Built in `api/src/modules/public-api/whatsapp-as-the-admin-reads-it.ts`, served by `whatsapp-for-an-organisation.controller.ts`, tested in `whatsapp-as-the-admin-reads-it.spec.ts`.

**No secret is served, and no part of one.** Two fields were taken off `connection`: `verifyToken` and `tokenEndsWith` (the access token's last four characters). **This affects the setup page:** its step 3, "Verify token, Copy", read `connection.verifyToken` from this response, and will now show an empty field. Whether the verify token is set is now `callback.verifyTokenSet`, a yes or a no. How the admin gets the token to paste into Meta is a decision still to make (for example, shown once when the number is connected, or a separate reveal for the admin); the `PUT` and the switch routes still return it today, unchanged.

### Every field

Unchanged, still served: `connection` (now without `verifyToken` and `tokenEndsWith`), `webhookPath`, `languages`, `canStartAConversation`, `theNamesToSubmit`, `approvedHere`.

`connection`, when the organisation has its own number, else `null`: `phoneNumberId` (string), `businessAccountId` (string or null), `displayNumber` (string or null), `approvedTemplates` (string[]), `enabled` (boolean), `connectedAt` (date), `lastInboundAt` (date or null), `lastOutboundAt` (date or null), `webhookProvenAt` (date or null).

New:

| Field | Type | Example, as served |
| --- | --- | --- |
| `state` | `'connected'` \| `'groundworks_number'` \| `'switched_off'` \| `'not_connected'` | `'connected'` |
| `stateLabel` | string, the word beside "WhatsApp" | "Connected", "On Groundwork's number", "Switched off", "Not connected" |
| `saying` | string, the card's sentence | Connected: "Your people check in by replying to +254 709 000 111, Baridi Appliances' WhatsApp Business number. A reply is their check-in, exactly as if typed here." |
| `whatIsOff` | `('your_switch' \| 'groundworks_switch')[]`, empty unless switched off | `['your_switch']` |
| `numberInUse.whose` | `'yours'` \| `'groundworks'` \| `null` | `'yours'` |
| `numberInUse.number` | string or null | "+254 709 000 111" |
| `numberInUse.saying` | string | "The number in use is +254 709 000 111, your WhatsApp Business number." |
| `callback.address` | string or null (null until the API's public address is set) | "https://api.myground.work/api/v1/webhooks/whatsapp/org-baridi" |
| `callback.path` | string | "/api/v1/webhooks/whatsapp/org-baridi" |
| `callback.saying` | string | "The callback address to paste into Meta is https://api.myground.work/api/v1/webhooks/whatsapp/org-baridi." or, unset: "The full callback address will be known once Groundwork is hosted. It ends in /api/v1/webhooks/whatsapp/org-baridi." |
| `callback.verifyTokenSet` | boolean | `true` |
| `callback.verifyTokenSaying` | string | "The verify token is set." or "There is no verify token yet. One is made when you connect your number." |
| `counts.peopleOnWhatsApp` | `{ label: string, count: number, saying: string }` | label "people checking in on WhatsApp", count 6, "6 people in your check-ins have a WhatsApp number and can check in by replying." With none: "Nobody in your check-ins has a WhatsApp number yet. You can add numbers under People." |
| `counts.checkInsThisMonth` | `{ label: string, count: null, saying: string }` | label "check-ins this month", count `null`, "Groundwork does not yet record which check-ins came in by WhatsApp, so this number cannot be shown." |
| `counts.failedThisWeek` | `{ label: string, count: number, saying: string }` | label "failed messages this week", count 0, "No messages failed to send in the last seven days." or "2 messages failed to send in the last seven days." |
| `reminders.approved` | boolean (the same as `canStartAConversation`) | `false` |
| `reminders.saying` | string | "Meta has not approved the reminder messages yet. Until it does, Groundwork can only answer people who write first. It cannot send the first message, so no reminders go by WhatsApp." or "Meta has approved the reminder messages, so Groundwork can send the first message, such as a reminder that a check-in is open." |

The other sentences in `saying`:

- On Groundwork's number: "Your people check in by replying to +44 7700 900123, Groundwork's WhatsApp number. A reply is their check-in, exactly as if typed here. You can connect your own WhatsApp Business number instead." With no number set, "replying to Groundwork's WhatsApp number."
- Switched off by the organisation: "Your WhatsApp Business number, +254 709 000 111, is set up, but you have switched it off, so nobody can check in by replying to it. Turn it on to use it again. Until then, messages from Groundwork go from Groundwork's WhatsApp number." (The last sentence only when Groundwork's number is on.)
- Switched off by Groundwork: "Your WhatsApp Business number, +254 709 000 111, is set up and switched on, but Groundwork has switched WhatsApp off for everyone for now. You do not need to do anything."
- Both: "Your WhatsApp Business number, +254 709 000 111, is set up, but you have switched it off, so nobody can check in by replying to it. Turn it on to use it again. Groundwork has also switched WhatsApp off for everyone for now."
- Not connected: "WhatsApp is not connected. Connect your organisation's WhatsApp Business number, and your people can check in by replying to it."

### How each count is made, so the screen does not have to guess

- **People checking in on WhatsApp:** people on the organisation's roster who are active, have a phone number, have not said STOP, and are part of a check-in here that is still running and not kept off the phone. A count only; no number or name is served.
- **Check-ins this month:** the record does not say which check-ins came in by WhatsApp (a conversation turn does not record where it was typed), so the count is `null` and the sentence says so. Show the sentence in place of a number. It needs one new field on each turn to be counted; that is engine work, not yet planned.
- **Failed messages this week:** messages to this organisation's people that did not send in the last seven days. A message held because WhatsApp is not turned on for the organisation, or the month's messages are used up, is not counted here; Plan and billing says that.

**Note:** `GET /integrations/connections` (the counts at a glance, `connections-at-a-glance.service.ts`) still serves its own three WhatsApp counts, made differently: its "check-ins this month" counts check-ins Groundwork sent a message for, and its "people" counts open WhatsApp threads. For the card, use the counts here.

## WhatsApp for the first client: what a screen needs to know (2 October, decisions 82 and 83)

The engine workspace changed what goes to and comes from WhatsApp. Nothing here needs a new screen; these are the words people now read on their phones, and what the app may want to say beside them.

### Words people read on WhatsApp

- **When a session opens** (every session, the first included, on Groundwork's number too): "Hi Miriam, your check-in for the sales team is open. It takes about five minutes, and you can answer right here. Reply START to begin." With two buttons, "Start" and "Not now". It never says words are "released with everybody else's".
- **When the check-in starts on WhatsApp**, before the first question, one sentence: "You can write "ask" at any time to ask Groundwork something, "back" to come back to your check-in, and "switch" to choose another check-in." If the setup screen or Settings says how WhatsApp works, these are the three words.
- **"Not now"**: "All right. I will not write to you first again today. Your check-in is still open, and you can answer here whenever you are ready."
- **A check-in kept in the app** (`overWhatsApp = false`): a message to it is not taken in, and the person reads "Your check-in "Performance plan for Amina" is kept in the Groundwork app, so I cannot take your answers to it here. Please open Groundwork and answer it there." Nothing about it goes to a phone: no notice, no reminder, no report.
- **A request during a check-in**: "Shall I treat this as a leave request?" (or "as a spending request?", "as hours?"); yes goes to Ask Groundwork, no goes into the check-in.
- The morning reminders are Hafsah's templates, word for word, in `docs/whatsapp-templates.md`.

### When WhatsApp is held (the add-on or the month's limit)

A person who wrote in the last 24 hours gets one message, once in 24 hours, for example "Your organisation has not turned on WhatsApp, so this check-in stays in the app. You can carry on in the Groundwork app." Outside the 24 hours nothing can go. Every held message is kept in the send record (`WhatsAppSend`, `kind` ending in `:held`, `error` holding the sentence above without the last sentence), so the app can show the same sentence to the person where their check-in is.

### Numbers

Settings (`PATCH /auth/me`), an admin's roster entry (`PATCH /users/:id`) and the roster import (SCIM, and `POST /people` through it) now keep every number as "+" and digits with the country code. A local number starting with 0 takes the organisation's country when it is known. Otherwise the request is refused with a 400 whose message is: "Please write the whole number with the country code at the start, for example +234 801 234 5678." Something that is not a phone number at all is refused with: "That does not look like a whole phone number. Please write it with the country code at the start, for example +234 801 234 5678." Show the message as it comes; the screen does not need its own check.

### The Connections page

`theNamesToSubmit` on `GET /integrations/whatsapp` is now every template the product starts, Hafsah's eight and `groundwork_report_ready`, not three. `reminders.approved` (and `canStartAConversation`) is true only when every one of them is approved.

## Request 117: the fifth review of the sales board, part by part (2 October)

"Sales team, Q3" is on your database, not this Mac's, so each part is proven on the board harness with the check-in's stored rows as your review quotes them (`api/src/modules/board/__fixtures__/sales-board-review-5.ts`), served as Rukia who runs it, Amani, Baraka and Neema who check in (where people see each other and where they do not), Juma an admin who only reads, and Grace who set it up. For each part I say whether it was a fault still in the code, or rows stored before an earlier fix.

**How your database is brought up to date.** The rows stored before the fixes stay as they were, because nothing rewrites a stored row when a board is opened (decision 7). `api/journey/bring-a-check-in-up-to-date.ts` reads each check-in's stored rows again under the rules the engine now writes by, and changes only those rows. It asks nothing of anybody, calls no model and changes nobody's words. On your Mac: first `DATABASE_URL=<your local database> npx ts-node -T journey/bring-a-check-in-up-to-date.ts --dry-run` (add `--check-in <the check-in's id>` for that one only), read what it prints, then the same command without `--dry-run`. On "Sales team, Q3" its dry run prints:

- Rukia Otieno's own thing to do, "to approve a discount for Baraka Mwangi and to send a price list to Amani Wekesa", is stored as a wait on "themselves". It would be taken off, because nobody waits on themselves.
- the target "They want us to sign 12 shops by 20 December" is stored at 12, read from a line that only said the aim. It would go back to 0.
- the team's aim "Sign 12 shops for kitchen appliances in Nairobi" has no number, though its own name holds 12. It would hold 12.
- the target "They want us to sign 12 shops by 20 December" is the team's aim said again. It would be taken off. The team's aim would keep the day it was said to be due by, 20 December.
- the target "They want to get 12 shops onboarded" is the team's aim said again. It would be taken off.
- Amani Wekesa's own aim "3 shops in Kilimani by 20 December" would keep "3 shops in Kilimani" as its name and 20 December as its date.
- Rukia Otieno said, "I have signed Tuskys Westgate already, on 18 September". The Tuskys Westgate deal has nobody's name on it, so Rukia Otieno, who runs it, would be asked on the board whether it is Rukia Otieno's deal. Nobody's name is set until then. (The same for Naivas Karen, from "I will visit Naivas Karen on Monday ...".)

On this Mac's test database the dry run read 1,589 check-ins and found 99 things to change and 6 left for the lead; nothing was written. On a hosted database it is a release step that needs explicit confirmation (`docs/deploy.md`, section 5, and `docs/release-questions.md`, 12c).

**(1) The false "Met", and one aim as three targets. Stored rows.** Both were fixed in the code before the review: an aim said is never read as its count (`10e3fe89`), and the team's number said again is that aim (`a740e362`). The rows on your check-in were written before. After the script: Rukia and Grace read one aim, "Sign 12 shops for kitchen appliances in Nairobi", 0 of 12, with no "Met"; Amani no longer reads "12 now, up from 0". Before: three targets, "You want us to sign 12 shops by 20 December." at 12 of 12, "Met".

**(2) The headline's target has no number. Two faults in the code, and a stored row.** An aim said in a check-in did not keep the count its own name aims at (the setup chat did since `a740e362`), and the headline read any name ending in a full stop as a sentence about somebody, so even with 12 stored it asked nothing (`39f692e3`). Now, once the row holds 12 (the script does that), Rukia and Grace read "Will we sign 12 shops for kitchen appliances in Nairobi by 20 December?" and "Nothing has been counted yet. 12 more are needed by 20 December.", with its bar. Only the count the name aims at is taken ("Sign 12 shops ..."), never a share or another figure in it: the looser rule, read over the test database, would have given about a hundred aims a number nobody meant.

**(3) Sessions counted two ways. A fault in the code** (`9d9252a0`). The header counted the open round, the coaching note the reader's own newest check-in, and the questions the highest row anybody had. Both now read the board's clock (`theSessionClock`). With session 1 still open for Faraji: Rukia's and Amani's notes say "This is session 1 of 12 of this work." (before: "This is session 2"), and the lead's questions say only "Faraji Odhiambo has not answered this session" (before: Baraka and Neema too). The header, "Session 1 of 12.", is unchanged, for every reader. The Report tab's "Session 2, 30 Sept" is the list of session reports, which is right: two people have answered session 2.

**(4) Deal owners and the card that contradicts itself. Code faults, and stored rows.**
- One card said "Nobody has spoken about it in a check-in yet." beside "On 27 September, somebody spoke about it": a deal added on the board has no line it came from. Its last day spoken about is now the newest day in its own contact history (`909e329c`). Tuskys Westgate now reads "It was added on the board, not said in a check-in. No date has been given for it. It was last spoken about on 26 September. Nobody has said what happens next."
- "Reported at Won" for a deal added on the board: now "1 deal was added on the board at Won, not reported in a check-in.", with `addedOnTheBoard: 1` and `reported: 0` (`909e329c`).
- "Nobody is named for it yet": by decision 76, item 3, a deal added with nobody's name becomes somebody's only once the lead says yes, so nobody's name is set. The record never put Rukia's words to her as a claim, because they were read before the claim existed. The script puts both claims to her, and she reads "You said the Tuskys Westgate deal is yours. Is it?" on her board (`ownerClaim`).
- Amani's own deal list is empty because she owns no deal. "I will deliver the Tuskys cookers on 9 October." is her commitment, in her work plan, and does not name "Tuskys Westgate".

**(5) Neema's shop and the invented wait. Stored, and only the model reads it again.** Neema's 4 shops in Karen are counted by the model when a round closes, and session 1 has not closed, because Faraji has not checked in. "Neema Achieng has none of their 4 shops in Karen yet.", "Neema Achieng has signed one shop." and "Speak with Neema Achieng about the Naivas Karen account" are the written report and the judgement, which the model wrote; they are written again when the next check-in comes in. "Waiting on the warehouse for a delivery to Naivas Karen" is the model's reading of her check-in. I tried a rule that keeps a wait only where the person typed a word of who it is on (`3f96603f`), and took it back out (`66164c98`): over the test database it would have taken off 310 stored waits, most of them real. So the script does not touch it. Decided for Hafsah to confirm: whether a round's numbers should also be read when one person's check-in closes, not only when everybody's has, so a count does not wait on somebody who never checks in.

**(6) "You are waiting on themselves". Stored row, and a fault in the code** (`4934e9ef`). The board had stopped reading a wait on oneself, but the coaching note, the lead's probe list, what each person could try, Today's waits and the You board still read it. Rukia's note said "Put to approve a discount for Baraka Mwangi and to send a price list to Amani Wekesa in writing", which the wording turned into "waiting on themselves"; the probes said "Speak to themselves rather than write to them." Every one of those reads now leaves it out. Rukia's note now reads "Baraka Mwangi and Amani Wekesa are waiting on you for the discount and the price list. The first of these waits began on 24 September. Either do them, or give a date you can do them by." Grace reads, under Rukia, "Baraka Mwangi and Amani Wekesa are waiting on Rukia Otieno for the discount and the price list. ..." The script takes the stored row off.

**(7) One wait said three times on a row. A fault in the code** (`43cd510d`). Each row of "The team today" now says the wait once, with its day, in `says`; the `ask` only asks; and a sentence of the `finding` that says the same wait is left out (the rest stays). To Rukia, before: "Amani Wekesa has checked in, and is waiting on you for the price list." / "Amani Wekesa has been waiting 4 days on you for the price list. Give Amani Wekesa an answer, or say when you will." / "Amani is waiting for you to send a price list." Now: "Amani Wekesa has checked in, and has been waiting on you for the price list since 28 September." / "Give Amani Wekesa an answer, or say when you will." and no finding where it only said the wait. To Grace and Juma: "Amani Wekesa has checked in, and has been waiting on Rukia Otieno for the price list since 28 September." / "Nobody has said yet what was tried. Ask Amani Wekesa to speak to Rukia Otieno rather than write to them." People who check in are sent no rows, as before.

**(8) Repeated in the fold. A fault in the code** (`ed1e17f6`). A sentence true of several people is now said once for its section. `contributionSaysOnce`, beside `contribution`: "No position is shown for Rukia Otieno, Amani Wekesa, Baraka Mwangi, Neema Achieng or Faraji Odhiambo, because nobody's role was clearly defined. Define what each role is responsible for before assessing anyone against it. An undefined role is often the real problem, not the person." The rows it was true of now have `note: null` and `saidOnceAbove: true`. `coverage.saysOnce`: "Nobody has said anything about the work of Rukia Otieno, Amani Wekesa, Baraka Mwangi and Neema Achieng moving elsewhere." and "Their responsibilities are staying with them. ...", with `what` and `reasonText` null on those reads. Both are sent only where something was repeated. **Please draw `contributionSaysOnce` and `coverage.saysOnce` once, above the rows.** "You have reported progress. This is progress you reported.": the first sentence is ours, the second the screen's; each item whose text already says its kind now has `itsKindIsSaid: true`, so please leave your sentence out there. "People see two things differently. People said different things.": the first is the screen's, as in request 111; please leave it out where `sub` says it.

**(9) The days change when the board is opened. A fault in the code** (`31555cde`). Every wait's age on the board's rows and asks, the coaching note, the probe list and the glance is now the day it began, and anything still decided by how long a thing has sat is measured to the record's own clock (the newest thing the record holds), never the reader's. Read at 20:46, at 20:51 and the next evening, every reader is sent the same board. The glance's `inTheWay` now has `since` and `sinceSays` ("since 27 September"); **please draw `sinceSays`** in place of a count of days, as `daysWaiting` is now measured to the record's clock. Today's "It opened 9 days ago." is "It opened on 14 September." The deal grid's "in the last week" (Cooling) is still measured to the day it is read; whether that should follow the record's clock too is for Hafsah.

**(10) "signifies". The report's own words, stored** (`3c605d1c`). Every served report sentence passes through `withNames`, which now says "means" for "signifies" (and its other forms) outside quotation marks, for every reader and on stored text. Rukia reads "what document means that a shop is successfully signed". A person's own "signifies" in quotation marks is kept. Nothing else in what people read used the word.

**(11) A person's own aim. A fault in the code** (`cafed17c`). Rukia and Grace read "Amani Wekesa's own aim is 3 shops in Kilimani by 20 December." (before: "Amani Wekesa set an aim of 3 shops in Kilimani by 20 December for their own work."); Amani reads "Your own aim is 3 shops in Kilimani by 20 December." on her board and in her share. Who is sent it is unchanged: on this check-in, where the lead shares every number, Juma and (where people see each other) Baraka and Neema read the same sentence as Rukia; where people do not see each other, Baraka and Neema are not sent it. No pronoun is guessed. The weekly report says "3 shops in Kilimani, your own aim" and ", Amani Wekesa's own aim". A new aim of one person's keeps the thing counted as its name and the day as its date; the script splits the stored one.

Tests: `board/request-117-10-a-plainer-word`, `reports/request-117-6-nobody-waits-on-themselves`, `reports/request-117-3-one-count-for-the-sessions`, `board/request-117-9-a-wait-reads-the-same-at-any-hour`, `board/request-117-7-each-fact-once-per-row`, `board/request-117-8-a-repeated-sentence-said-once`, `board/request-117-11-a-persons-own-aim`, `board/request-117-4-a-deal-card-agrees-with-itself`, `conversation/request-117-2-the-number-in-the-aims-name`, and `journey/bring-a-check-in-up-to-date.spec.ts`; each fails without its change. Tests changed, each because it expected the defect: request-102 (the session count and the days), what-needs-you, the glance, the-same-check-in-reads-the-same, request-115-d, nothing-needs-you-while-somebody-waits-on-you, a-board-that-does-not-contradict-itself, and the five that expected "set an aim of ... for their own work".

**Engine changes that need a scenario run before they are trusted:** an aim said in a check-in now keeps the count its name aims at, and what a check-in is told about a person's own aim reads "Your own aim is ...". Neither was run against the model here (no live keys).

## Item 16: performance reviews

The performance reviews suite (#/suite/reviews), end to end, as `docs/prototype/screens/E-suites/suite-reviews.txt` shows it. Each change below is what the suite now sends, field by field.

### Where each review stands (`2a8e77eb`), `GET /suites/reviews/board`

Each row of `next` has a new field, `standsSays`, the sentence under "Where it stands", in the prototype's words. **Please draw `standsSays`** in place of a sentence of your own. `stands` can now also be `'not-yet'`, and then `mayStart` is false: please show "Not yet" where "Start it" would be.

- Ready, with check-ins behind it: "Ready to start. 6 months of check-ins to draw on." (whole months since the person's first check-in here; "1 month" for one).
- Ready, with none: "Ready to start."
- Waiting for another decision about the person (a probation or first 90 days, a performance plan, a promotion or a renewal still open): to somebody in that check-in, "After “Kwame, first 90 days” is decided."; to an admin or lead outside it, "After a check-in about Kwame is decided." The check-in's name is never sent to somebody outside it.
- Started: "Started on 2 October 2026. Aisha can read it and add a view of their own."
- Decided: "Decided on 12 March 2027."

Starting a review while another decision about the person is open is refused with: "This review cannot start yet, because a check-in that decides something about this person is still open. It can start once that check-in is decided." A proposal's sentence (`proposal`) is now sent only while the review is ready to start.

### The reviews about you (this commit), `GET /suites/reviews/mine`

New. Before this, the person a review is about had no way to find it: a review was read only by its id. Now any signed-in person is sent the reviews about themselves, once somebody has started them; a review Groundwork only proposed is never sent to them. Each item is `{ id, dueOn, writtenWithFirstName, stands: 'started' | 'decided', says }`, and `id` opens it with `GET /suites/reviews/:id` as before. Nothing of the review's contents is in it. `says`, for Aisha:

- "Wairimu has started your review. You can read it and add your own view before you meet."
- After she has written her view: "Wairimu has started your review, and your own view is in it. You can read it and change your view before you meet."
- Once decided: "Wairimu has decided your review. You can read the decision and the reasons."

An admin and a lead are sent only reviews about themselves here. While the suite is off, it is refused with "The performance reviews suite is not switched on." Today does not show these yet: the Today service is being changed by another builder, so this list is the place to read them for now.

### A review on Today (this commit), `GET /today` `needs`

New items in `needs`, the same shape as every other: `{ key, kind, title, detail, action: { label, to }, groundId: '', organizationId }`. `groundId` is empty, as for leave, hours and spending. Both link to `/suite/reviews`. They come before the leave, hours and spending items, in the decisions group, and they are counted in `count` and in "Choose an organisation".

- **The person a review is about**, once somebody has started it: `key: 'your-review-<review id>'`, `kind: 'look'`, `action: { label: 'Read it', to: '/suite/reviews' }`. `title` and `detail` are the suite's own sentence from `GET /suites/reviews/mine`, split after its first sentence. Aisha reads "Wairimu has started your review." with "You can read it and add your own view before you meet."; once her view is in, "Wairimu has started your review, and your own view is in it." with "You can read it and change your view before you meet."; once decided, "Wairimu has decided your review." with "You can read the decision and the reasons." A decided review stays until two weeks after its date. A review Groundwork only proposed is never sent to the person.
- **The person who writes it with them**, when a review is ready for them to start (the reviews board's own `mayStart`) and due within the next two weeks or already due: `key: 'start-review-<due id>'`, `kind: 'decide'`, `action: { label: 'Look at it', to: '/suite/reviews' }`. `title`: "Miriam’s review is ready for you to start." `detail`: the board's `proposal` sentence when Groundwork proposed it ("Groundwork suggests a review for Miriam, because a check-in about Miriam's work has ended. Nothing is sent to Miriam unless you say yes."), otherwise "It is due on Tuesday 6 October." ("It was due on ..." once the day has gone).

Nobody else is sent either: not another lead (each lead is sent only their own team's, as on the board), not an admin who does not write the review, not a colleague. Nothing of a review's contents is in them. While the suite is off, there are none, and Today opens as before. Test: `api/src/modules/grounds/a-review-on-today-as-each-reader-reads-it.spec.ts`.

### A review told on WhatsApp (this commit)

Only the person a review is about is told, and only that it waits for them in the app. Nothing of the review reaches a phone. Aisha reads:

- When Wairimu starts it: "Hi Aisha, Wairimu has started your review. Open Groundwork to read it and add your own view before you meet."
- When Wairimu decides it, once: "Hi Aisha, Wairimu has decided your review. Open Groundwork to read the decision and the reasons."

Both count as Groundwork writing first (one message a day; "not now" and "stop" hold them back), and outside the 24 hours they go as two new templates of ours, `groundwork_review_started` and `groundwork_review_decided`, written in `docs/whatsapp-templates.md` for Hafsah to confirm and submit. Until they are approved, a message outside the 24 hours is recorded as not sent, and the review still waits on `GET /suites/reviews/mine`. The Connections page's list of names to submit (`THE_NAMES_TO_SUBMIT`) now has these two as well.

A fault found on the way: the reviews service was given Groundwork's suggestion about the person as a type only, so in the running server it was never given at all, and `suggestion` on a review was always null for the writer. It is now given properly, so the writer reads a check-in's suggestion about the person on the review, under the same rules as before (only once the person has had their turn, never a count).

### A review finds its person by email too (this commit), `GET /suites/reviews/mine` and `GET /suites/reviews/:id`

No field added, removed or moved, and no sentence changed. What changed is who is sent them. Reviews found the person only by the link between their roster entry and their sign-in. Leave, hours and spending also match an entry to the sign-in with the same email (decision 82), and now reviews ask the same one place (`api/src/modules/suites/a-roster-entry-and-its-sign-in.ts`).

So Aisha, whose roster entry was never linked but carries " Aisha.Otieno@Baridi.co.ke ", the address she signs in with in other capitals and with spaces, used to be sent `[]` on `GET /suites/reviews/mine` and was refused her own review. She is now sent her review, with "Wairimu has started your review. You can read it and add your own view before you meet.", opens it as the person it is about (`reader: 'person'`), can add her own view, and is told on WhatsApp at the phone on her roster entry: "Hi Aisha, Wairimu has started your review. Open Groundwork to read it and add your own view before you meet." On `GET /suites/reviews/board`, Wairimu now reads how many months of Aisha's check-ins there are to draw on ("Ready to start. 6 months of check-ins to draw on."), and a check-in still open that decides something about Aisha now holds her review back ("After a check-in about Aisha is decided."). A lead or an admin matched this way is no longer offered their own review on the board.

The same address is not enough on its own: a sign-in in another organisation is never matched, and a sign-in already linked to another roster entry is that entry's, not Aisha's. Both are still sent `[]`.

## Item 18: what the onboarding and project boards still need from the engine (2 October, in progress)

The onboarding board is a first 90 days (`NEW_HIRE`, and `NEW_MANAGER` and `NEW_ADVISOR`, the ONBOARDING family; prototype `B6-ending-a-check-in/day-30-and-60.txt`). The project board is a new project (`NEW_PROJECT`, the DELIVERY family; prototype `G1-example-check-ins/eng.txt`, "Get a new project off to a good start"). Each was served from the engine, read-only, from the local test database, as each reader: "Engagement Director, first 90 days" (`4c1621a0`, Dr Amina Bello leads, Tobi Adewale is the new hire) and "Atlas delivery" (`6d34bb13`, Tunde Bakare leads, six people check in, Olu Fashola is an admin who only reads). What changed in what the board sends, so far:

- **A name is said once** (`fbd5d8a9`). Every text that goes through the name wrapper (the board's judgement, the report). Tunde read "Put Kwabena Mensah, Kwabena, and Samuel Aryee, Samuel, in a room together and ask them to define the data request and its priority." and "Yemi Adeyinka, Yemi, delivered the design work ...". He now reads "Put Kwabena Mensah and Samuel Aryee in a room together and ask them to define the data request and its priority." and "Yemi Adeyinka delivered the design work ...". No field added or moved.
- **The new hire's title** (`064c55eb`). `title`, for the person an evaluation check-in is about and for a colleague. Tobi read "Your check-in with Dr" (the lead's first-name field holds "Dr"). He now reads "Your check-in with Amina". The lead and an admin given access still read the label as the lead typed it.
- **Each wait under whoever holds it, and each thing once** (this commit). `coaching.eachPerson[].probe` (the lead only) and `coaching.yours.beforeNextTime` (the person only).
  - Tunde read "Samuel Aryee has been waiting on Kwabena Mensah for the details for the analysis and approval for the external dataset since 25 September, ..."; where the approval's holder is a person in the check-in it now reads "... waiting on Kwabena Mensah for the details for the analysis, and on Finance for approval for the external dataset, since 25 September, ...", and where nobody in the check-in holds it, "... waiting on Kwabena Mensah for the details for the analysis, and for approval for the external dataset, since 25 September, ...".
  - Tunde read "Kwabena Mensah has been waiting for the data team's market sizing extract and the data team's market sizing extract since 25 September"; each thing is now said once.
  - Tobi read one sentence putting eight things "in writing to Dr Amina Bello", two of which wait on the pricing decision and on his own team. He now reads one sentence for what Amina holds, "Put an invitation to lead a client meeting, ... and feedback on the QBR deck in writing to Dr Amina Bello, with the date you need them by.", and one for the rest, "Put a briefing on pricing structures and renewal processes and three dates and times for the meeting in writing, with the date you need them by."
  - One wait on one person reads exactly as before.

### "Groundwork suggests recognising Aisha’s work", behind a setting that is off (this commit), `GET /suites/reviews/:id`

Built, and switched off. Nothing below is sent to anybody until the platform setting `reviews.recognise` is stored with `on: true`. There is no admin page for it yet; while there is none, it stays off.

**Decided for Hafsah to confirm: the threshold.** In the four weeks before the review was started, in the check-ins the person who writes the review runs with the person, at least 8 commitments were settled (kept or not done), and at least nine in ten of them were kept. A promise missed while the person was on approved leave is not a miss, the same rule as their own count. Nothing else is read: no rating, no pattern, no hours, nothing anybody said. Stored as `{ "on": false, "keptAtLeast": 0.9, "atLeastSettled": 8 }`. Why these numbers: nine in ten is the prototype's own example (Aisha kept 41 of 44, which is above it), and eight settled is enough that one good week does not reach it. Only the writer's own check-ins are read, because a person's load across check-ins is private; the four weeks end the day the review started, so the review reads the same whenever it is opened.

What each reader is sent, once the setting is on and the record reaches the line:

- **Aisha, the person reviewed**, a new field `recognise` (absent otherwise): `facts` "In the four weeks before your review started, you kept nine of your ten commitments in your check-ins with Wairimu. When at least nine in ten are kept, Groundwork suggests to Wairimu that your work is recognised." and `whoDecides` "Wairimu decides, and you read the reasons." She reads it first.
- **Wairimu, who writes the review**, a new field `recognise` (null otherwise), only once Aisha has written her view or three days after the review started (decision 53): `headline` "Groundwork suggests recognising Aisha’s work", `why` "In the four weeks before this review started, Aisha kept nearly every commitment made in your check-ins together.", `whatWouldChangeIt` "If Aisha keeps fewer of them from now on.", `yourDecision` "This is only a suggestion. You decide, and Aisha sees your reasons." No number at all. "Agree" and "Choose something else" both go to the existing `POST /suites/reviews/:id/decision`, with what she decided and why.
- **A lead who does not write it, and an admin:** `recognise` is null.

**Where this differs from the prototype, on purpose.** The prototype's "Why: She kept 41 of her 44 commitments in the last 4 weeks, and 9 of her sales are proven by Paystack." and "Kept 41 of 44 things she said she would do." give the manager a count. Decision 53 says the manager gets no count, and the count stays the person's alone (decision 24), so the writer reads "nearly every commitment" and Aisha reads the numbers. Sales proven by Paystack and "two people said she helped them" are not read: nothing in the record ties a payment or a colleague's words to a review yet.

## Request 118: the ninth review of the sales board, part by part (2 October)

**(1) Rukia's Today no longer fails** (this commit). `GET /today` threw "Cannot read properties of undefined (reading '0')" when the count Rukia reads (the round header's, "4 of 5") still had somebody missing, but the list of people still waited on (the round-closing rule's, which leaves out Faraji, not let in, and anybody whose invitation lapsed) was empty. Now, where nobody is left who can be named or chased, Today serves no `line` for that round at all, rather than "4 of 5 have checked in." with nobody missing. With somebody left it reads as before: "In Sales team, Q3, 4 of 5 have checked in for the first check-in. Neema has not checked in yet." Checked with an empty list on Today (Rukia, an admin, Amani), the board (the lead, two people who check in, an admin who only reads) and the lead's daily summary ("In "Sales team, Q3", 4 of 5 people have checked in."). The You board has no such list. Test: `api/src/modules/grounds/request-118-1-nobody-left-to-name.spec.ts`. This is a code fault, not a stored row.

**(2) The reader is "you" in a sentence said once** (this commit). `contributionSaysOnce` and `coverage.saysOnce` named the reader. Rukia now reads "No position is shown for you, Amani Wekesa, Baraka Mwangi, Neema Achieng or Faraji Odhiambo, because nobody's role was clearly defined. ..." and, for a sentence true of several people, "... This is true of you, Baraka Mwangi, Amani Wekesa and Neema Achieng." Where the sentence is about whose work it is, she reads "Nobody has said anything about your work and the work of Amani Wekesa, Baraka Mwangi and Neema Achieng moving elsewhere." Somebody who is not in the list (an admin who only reads, the admin who set it up) still reads every name. No field added or moved. Test: `api/src/modules/board/request-118-2-the-reader-is-you-in-a-sentence-said-once.spec.ts`; `request-117-8-a-repeated-sentence-said-once.spec.ts` changed, because it pinned Rukia reading her own name. A code fault, not a stored row.

**(5), from 117 (4): the Won heading** (this commit). `workRecords[].groups[]` with `group: 'won'`, its `reason`. Over a deal Rukia added on the board at Won it read "Somebody reported each of these at Won, the last stage." It now reads "Each of these was put at Won, the last stage, on the board." Where some were reported and some added: "Each of these is at Won, the last stage. Some were reported in a check-in, and some were put there on the board." A reported deal reads as before. A code fault. **"Nobody is named for it yet." beside "You added it."** is the screen's own words for a deal with `owner: null`; the owner stays null until Rukia answers the claim on her board (decision 76, item 3), which `journey/bring-a-check-in-up-to-date.ts` (rule 6) puts to her. That is a stored row, and it is also why Amani has no deals: neither has anybody's name on it until Rukia says yes. Test: `api/src/modules/board/request-118-5-a-deal-added-on-the-board-was-not-reported.spec.ts`.

**(5), from 117 (6): "You are waiting on themselves" in the stored story** (this commit). Every text that goes through the name wrapper (the report's story, `howItIsGoing`, the board's prose fields). A story stored before request 111 (e) said "The initiator is waiting on themselves to approve a discount ...", and Rukia read "You are waiting on themselves to approve a discount for Baraka Mwangi and to send a price list to Amani Wekesa." She now reads "You still have to approve a discount for Baraka Mwangi and to send a price list to Amani Wekesa." Anybody else reads "Rukia Otieno still has to ...". Put right where it is served, so it is right before any script runs; the stored wait itself is taken off by `journey/bring-a-check-in-up-to-date.ts` (rule 1). Test: `api/src/modules/board/request-118-5-nobody-waits-on-themselves-in-the-story.spec.ts`.

**(5), from 117 (8): "People see two things differently. People said different things."** (this commit). The Differences sentence (the quick read's `sub` on the board, a session's Differences tile, the drafted picture). Where the topic the report wrote only says that people differ, the board said it twice; it now says "People said different things." once. A topic with something in it reads as before ("People said different things about the price list."). I could not see the stored row (the check-in is on your database), so this is fixed for any topic of that shape. A code fault. Test: `api/src/modules/reports/request-118-8-one-fact-about-a-difference-said-once.spec.ts`.

**(6) `daysWaiting` against `sinceSays`** (this commit). On the board, `howItIsGoing.glance.inTheWay.daysWaiting` is now always `null`; the field stays, so nothing breaks, and `sinceSays` ("since 27 September") is the one thing to draw. Counted to the board's last change it read 2 beside "since 27 September", and counted to the moment of reading it would change on opening. `how-it-is-going.tsx` already draws nothing for a null count. The list's own glance (`GET /grounds`) still sends a count to the moment it is read; tell me if a screen draws it, and I will drop it there too. Test: `api/src/modules/board/request-118-6-a-wait-is-dated-not-counted-on-the-glance.spec.ts`.

**What is left of request 118, and which of it is a stored row.** "Sales team, Q3" is on your database, not on this Mac's (`gw_pw9_1786222102`), so I could not run `journey/bring-a-check-in-up-to-date.ts` against it. A dry run on this Mac's database works and wrote nothing. Run it on yours (dry run first) before the next review.
- **(5) The false "Met" and the aim stored three times, and (5) the headline target with no number.** Stored rows, written before requests 109 and 111. The script's rules 2, 3 and 4 put them right (`request-117-2` and `bring-a-check-in-up-to-date.spec.ts` prove it on the review's rows). Nothing in the code writes them that way now.
- **(5) Deal owners and Amani's deals.** Stored rows, see above: the claim goes to Rukia (rule 6), and nobody's name is set until she says yes.
- **(5) Neema's shop and the Naivas Karen wait and "Speak with Neema ..."** Stored, and only the model reads them again, when the next round closes (as answered under request 117 (5)).
- **(3) "Session 1 of 12." with "Session 2 has started for some people, while session 1 is still open."** The board's clock leaves out somebody whose sign-in is waiting for an admin (`awaitingOrgApproval`), which is how Today leaves out Faraji too. Where Faraji is held on your database, the board reads "Session 2 of 12." and `whileOpen` is null; where he was let in and has simply not checked in, session 1 is still open and the board is right to say so. Which it is depends on his row on your database; please say, and send `awaitingOrgApproval` for his user, if it still reads session 1.
- **(4) "4 of 5 people have answered this round" against "Four of the six people have answered so far."** The second is the report's stored story, written before Faraji was left out (decision 77). It is written again when the next check-in comes in. Changing the numbers inside a stored story where it is served would be guessing at what the model meant, so I have not.

**Item 18, continued.**
- **A commitment is open for one count of sessions** (this commit). `overTime` on the board (the lead only): its commitment sentences, `stillOpen`, `sessions` and `inSessions` now count the sessions somebody has finished on the record, as the work plan does, not the count the report was stored with. On "Atlas delivery" Tunde read "In session 1, Samuel Aryee committed to ask for clarification. It has been open for 2 sessions, ..." beside the work plan's "... It has been open for 1 session, ...", and "in 3 sessions" with two finished. Both now read "It has been open for 1 session", and the heading "in 2 sessions". Test: `api/src/modules/board/item-18-a-commitment-is-open-for-one-count-of-sessions.spec.ts`; `the-reader-is-you-in-lower-case-mid-sentence.spec.ts` changed, because its "in 3 sessions" case had one finished session on the record and only a stored 3.
- **A difference whose topic is a whole sentence is said as one** (this commit). `decisions[].question`, `divergence.centralQuestion`, the quick read's Differences `sub`. On "Atlas delivery" Tunde read "People in this check-in said different things about who has the final authority on the completion of the Atlas analysis is not agreed, so it needs settling." and "If this holds, the analysis may be delivered incomplete on the earlier deadline, missing the parts delivered to the later one. That is what settles the delivery deadline for the analysis is not agreed upon." He now reads "People in this check-in said different things. Who has the final authority on the completion of the Atlas analysis is not agreed. This needs settling." and "The delivery deadline for the analysis is not agreed upon. If this holds, the analysis may be delivered incomplete on the earlier deadline, missing the parts delivered to the later one." A topic that is a noun phrase reads as before ("A written price list. That is what settles the price list."). Test: `api/src/modules/board/item-18-a-topic-that-is-a-sentence-is-said-as-one.spec.ts`.

## Item 19: back office numbers

Each number the platform admin reads on /admin (`GET /prompts/platform-dashboard`, `/prompts/platform-funnel`, `/prompts/usage-stats`, `/prompts/org-list`, `/prompts/feedback-summary`, `GET /admin/dashboard`) was compared with the local test database on 2 October. What changed in what these send, one change per commit:

**The System tab opens again** (this commit). `GET /prompts/platform-dashboard` threw for every range, so the System tab showed an error and no numbers at all. One session on the test database is marked complete with no completion time ("PROVE the trade", Audit Test Ltd), and the recent-activity feed sorted by that missing time. `recentActivity` now leaves out a session with no completion time; it is still counted in `checkIns.totalCompleted`. No field added or moved. On the test database it now serves 1,412 organisations, 1,589 check-ins and 6,596 sessions completed, which match the record. Test: `api/src/modules/prompts/item-19-the-panel-counts-what-the-record-holds.spec.ts`.

**How long a session takes leaves out the sessions the clock closed** (this commit). `GET /prompts/platform-funnel` `avgSessionMinutes`, and the ops number `product.session_minutes_median`. The sweep closes a session somebody walked away from about a day later and marks it complete (`closedReason: 'auto_closed'`); timed with the rest, those 470 sessions took about 1,450 minutes each. On the test database `avgSessionMinutes` for session 1 read 110.3 minutes over 4,249 sessions; it now reads 13.9 over 3,966, session 2 7.7 (was 105.3) and session 3 12.7 (was 189). The ops median is still 1 minute, now over 5,882 sessions rather than 6,352, and its `counts` sentence now ends "over customers' real sessions a person finished in the window, leaving out those the clock closed. The copy says about ten." Every count of sessions completed still counts them. Tests: `api/src/modules/prompts/item-19-the-panel-counts-what-the-record-holds.spec.ts`, `api/src/modules/ops/item-19-a-session-the-clock-closed-is-not-timed.spec.ts`.
- **A wait on "my direct reports" is said from the reader's side** (this commit). Every board section built from a wait's holder (`dependencies[].on` and `waitingSays`, `risks`, `blockerCheck`, `obligations[].who`, `whoWaitedOnWhom`, `blockers`). Tobi read "You are waiting on my direct reports for three dates and times for the meeting." and "My direct reports holds it."; Amina read "Tobi Adewale is waiting on my direct reports ...". Tobi now reads "You are waiting on your direct reports for three dates and times for the meeting." and Amina "Tobi Adewale is waiting on their own direct reports for ...". No name is added for anybody. The record over time (`overTime`, the lead only) is the report's stored text and still says "my" until the next report is written. Test: `api/src/modules/board/item-18-a-holder-in-their-own-words.spec.ts`.

**A finished session's usage event is counted** (this commit). `GET /prompts/usage-stats` `eventTotals`. A session finishing writes `CHECK_IN_COMPLETED` with its check-in and no organisation, and the rule "an event with no organisation is nobody's usage" dropped every one, so the Usage tab's "Usage events" never listed it. An event with no organisation now belongs to its check-in's organisation and is counted when that is a customer. On the test database it served `{ PARTICIPANT_INVITED: 2968, GROUND_CREATED: 1596, REPORT_RELEASED: 1410 }`; it now also serves `CHECK_IN_COMPLETED: 6325`. The /start page's model calls (`ANONYMOUS_MODEL_CALL`, 104, no organisation and no check-in) are still left out. Test: `api/src/modules/prompts/item-19-the-panel-counts-what-the-record-holds.spec.ts`.

**The organisation list counts people by the seat rule** (this commit). `GET /prompts/org-list` `userCount`. It counted people by the organisation each person last looked at (`User.organizationId`), so somebody who belongs to an organisation but last looked at another fell off its count, and the console read fewer people than the organisation's own People page and its plan. It now counts by the same rule as the People page and the invite gate (`seatsIn`): everybody let in, active and not deleted, who belongs there, a guest held for a seat not counted. On the test database the two Ouma Agencies organisations each read one more person, and the total across all organisations is 4,723 where it was 4,721. Somebody not let in yet is still not counted (decision 77). Test: `api/src/modules/prompts/item-19-the-panel-counts-what-the-record-holds.spec.ts`.
- **What a wait holds up has its person in it** (this commit). `blockers[].holdingUp`. Tobi read "Once it is cleared, lead the client meetings." and, where the record held "I can lead a client meeting ...", "You said what you will do once it is cleared."; Samuel read "Once it is cleared, submit the request to Finance for approval." Now: "Once it is cleared, you will lead the client meetings.", "Once it is cleared, you can lead a client meeting and discuss pricing and renewals." and "Once it is cleared, you will submit the request to Finance for approval."; Tunde reads "Once it is cleared, Samuel Aryee will submit the request to Finance for approval." A line with its own subject reads as before. Test: `api/src/modules/board/item-18-what-a-wait-holds-up-has-its-person.spec.ts`.

**Check-ins using a prompt version are counted as check-ins** (this commit). `GET /prompts/platform-dashboard` `promptPerformance[].groundsUsingIt`. It counted outcomes, which only a check-in that reached an agreed end has, so on the test database it read 23 for system version 35, 1 for version 17 and 0 for every other version, including version 44, the one that runs. It now counts customers' check-ins that recorded each version: 89 for version 44, 539 for version 43, 29 for version 35, and 1,393 across all versions. `outcomesResolved`, `fairnessRate` and `feedbackResponses` are unchanged. No screen draws this list today. Test: `api/src/modules/prompts/item-19-the-panel-counts-what-the-record-holds.spec.ts`.

**Subscribed orgs counts organisations paying now** (this commit). `GET /admin/dashboard` `overview.totalSubscribedOrgs`. It counted every customer with a plan, and a paused or past-due subscription keeps its plan, so it counted organisations that are not paying. It now counts a plan with the status `active`, the same rule as `isSubscribed`. On the test database all 30 organisations with a plan are active, so it still serves 30. Test: `api/src/modules/admin/item-19-the-dashboard-counts-what-the-record-holds.spec.ts`.

**A check-in is "Paid" only when it took a paid slot** (this commit). `GET /admin/dashboard` `freeReasonBreakdown`. "Paid" was every check-in with no free reason, and a check-in made free by a path that names no reason (the API, an enterprise organisation's own setup) has none, so free check-ins were counted as paid. "Paid" is now `isFreeGround: false`, the billing record stamped when the check-in was made. A free check-in with no reason is in a new key, `freeNoReasonGiven`. On the test database it served `{ FIRST_GROUND: 0, FREE_TIER: 1396, ACCESS_CODE: 0, paid: 193 }`; it now serves `{ FIRST_GROUND: 0, FREE_TIER: 1396, ACCESS_CODE: 0, paid: 166, freeNoReasonGiven: 27 }`. The page's "Where check-ins came from" already takes its percentages over every key, so Paid now reads 166 (10%); it draws no row for the 27 until the screen adds one (suggested label: "Free, no reason recorded"). Test: `api/src/modules/admin/item-19-the-dashboard-counts-what-the-record-holds.spec.ts`.

**The Feedback tab counts every customer's answer** (this commit). `GET /prompts/feedback-summary` `total` and `fairRate`. Both were read off the fifty most recent answers, so past fifty `total` stopped at 50 and `fairRate` covered only the latest fifty, and our own organisations' answers were counted. Both are now counted over all customers' answers; `recent` is still the latest fifty, now customers' only. The test database has no answers, so it serves `total: 0` and `fairRate: null` before and after. Test: `api/src/modules/prompts/item-19-the-panel-counts-what-the-record-holds.spec.ts`.
- **A person's own read is said to them** (this commit). The reader's own row of `contribution` (`reason`, `note`) and of `coverage.reads` (`what`, `reasonText`), and nobody else's. Samuel read about himself "11 lines taken from what they said ... Their work is read against what being on track means for project management ..." and "Nobody has said anything about this person's work moving elsewhere. Their responsibilities are staying with them." He now reads "11 lines taken from what you said ... Your work is read against ...", "Your stated role reads as ...", "So you are being read against what the record shows ...", "This read of your function is still provisional.", "Nobody has said anything about your work moving elsewhere." and "Your responsibilities are staying with you." Test: `api/src/modules/board/item-18-your-own-read-says-you.spec.ts`. Three tests changed because they pinned "what they said" on the person's own row: `a-rating-goes-only-to-the-person`, `the-checkability-rating-is-served-where-it-is-allowed`, `no-reader-is-sent-a-rating`.
- **A wait's line that lost its subject is not served** (this commit). `overTime.dependencies[].say` (the lead only) is now `null` where the sentence naming the wait had been taken out and only "Nothing on record says anybody has chased it since. This is work you owe Tobi Adewale, not the other way round." was left; the row's `what` stays. Please draw `what` where `say` is null. Test: `api/src/modules/board/item-18-a-wait-line-with-nothing-in-it-is-not-served.spec.ts`.
- **"People disagree on 1: ..." is said as a sentence** (this commit). Every text through the name wrapper (`howItIsGoing.latestSummary`, the report's opening and shared picture). The model sometimes keeps a line of its brief, and Amina read "Both people have answered. People disagree on 1: The definition of 'ownership' and the trigger for Tobi Adewale to lead client meetings." She now reads "Both people have answered. People disagree about the definition of 'ownership' and the trigger for Tobi Adewale to lead client meetings." (Tobi: "... for you to lead client meetings."). Several topics are one list; a topic that is a whole sentence is its own sentence. The brief that shows the model this line is unchanged, so no prompt version changes. Test: `api/src/modules/board/item-18-people-disagree-in-a-sentence.spec.ts`.

## Connections: WhatsApp numbers

**The three WhatsApp numbers on the Connections page count what happened** (this commit). `GET /integrations/connections` `whatsapp.people`, `whatsapp.checkInsThisMonth` and `whatsapp.failedThisWeek`, the three numbers the Connections page (U.18) draws beside the organisation's own WhatsApp number through `countLines`. No field is added, moved or renamed, and the screen needs no change; only the numbers in it are now right. This week's WhatsApp work put new kinds of rows in the same tables, and the three numbers counted them:

- `people` counted every WhatsApp conversation with anything where the check-in is kept, and a conversation in Ask Groundwork keeps "ask:" there, so a person asking Groundwork something was read as a person checking in. It now counts each number whose conversation is in a check-in now, once however the number was written down. "People checking in on WhatsApp" means exactly that.
- `checkInsThisMonth` counted every check-in with any WhatsApp row since the first of the month by the server's own clock: messages held because WhatsApp is turned off or the month's messages are used, the free message telling a person it was held, failed messages, and Ask Groundwork replies. It now counts each check-in a message really went for, in this calendar month in UTC, the same month the plan's monthly limit counts (`whatsapp_monthly_use.month`). The free "it is held" message is not counted, as it is not counted towards the limit.
- `failedThisWeek` counted held messages as failures. It now serves the same count as `counts.failedThisWeek` on `GET /integrations/whatsapp` (`failedThisWeekIn`): a message held by the add-on or the limit is not a failure of the line, and is told on Plan and billing instead.

With a seeded week at Baridi Appliances (two people in check-ins, two asking Groundwork, one not yet picked; three real sends for two check-ins, two held, one told it was held, one "Not now", two real failures, one sent half an hour before October in UTC), Grace's page read "5 people checking in on WhatsApp", "9 check-ins this month" and "4 failed messages this week". It now reads "2 people checking in on WhatsApp", "2 check-ins this month" and "2 failed messages this week". Tests: `api/src/modules/public-api/the-connections-whatsapp-numbers-count-what-happened.spec.ts`, and `api/src/modules/public-api/the-connections-as-each-reader-reads-them.spec.ts`, whose stand-in database now answers the new questions.

**Item 18: notes for the screens workspace, and what the engine has not changed yet.**
- **Which boards these are.** The onboarding board is any check-in whose situation is `NEW_HIRE`, `NEW_MANAGER` or `NEW_ADVISOR` (`family: 'ONBOARDING'`); `NEW_HIRE` is an evaluation check-in, so the person it is about reads "Your check-in with Amina" as the title and never the lead's judgement. The project board is `NEW_PROJECT` (`family: 'DELIVERY'`). Neither has a kind of work of its own among the eleven (`kindOfWork` is null on both test check-ins), so every `workRecords` section is served `state: 'not-known'`; the screen should draw the prototype's sections that the engine serves and leave the record table out.
- **The prototype's onboarding board (`B6-ending-a-check-in/day-30-and-60.txt`) shows sections the engine does not serve:** "What was agreed at the start" (confirmed by both on day 1), "Change since last check-in" (Moved, Held, Late), "The 90 days, in three steps", "His history, 12 weeks" with "19 made, 17 kept", and "Where this is heading" with Keep on, Extend settling-in, Change the role and Part ways. `whereThisIsHeading` is left off every evaluation check-in on purpose (decision 6: the suggestion and the decision have their own way there). Please draw none of these until the engine serves them; they are under "Needs Hafsah" in my report.
- **`overTime.dependencies[].say` can be null** now; draw `what` then.
- **`howItIsGoing.glance.inTheWay.daysWaiting` is null on the board**; draw `sinceSays`.
- **Not changed, stored rows written before today's rules:** on "Engagement Director, first 90 days" the lead's one aim is stored as seven targets ("Ben will independently manage ...", "Ben should lead the discussions ...", and so on), one counted "It was 0 at the start and is 2 now." with no number in its name; and in `overTime` one wait is "on somebody outside this check-in" while the board says Amina holds it. `journey/bring-a-check-in-up-to-date.ts` (dry run on this Mac's database) takes off some of these; the rest are written again with the next report. "Ben" is the name the lead used in the test run for the person called Tobi, and is the lead's own words.
- **Not changed, wording the model wrote into the stored report:** "This participant sees their own role ..." in `divergence.items[].positions[].view` on the project board, and the role sentences in `overTime.gaps` ("The role written down for Yemi Adeyinka is to design and Communications Lead in Design; Yemi."). Both are read again when the next report is written.

## Ask Groundwork on WhatsApp leaves a kept check-in out before alike waits are merged (2 October, decision 82 item 7)

**Nothing the board, reports or Today page send has changed** (this commit). `waitingAcrossTheOrg` and `whoNeedsYouThisWeek` take a new option, `leaveOut`, a set of check-in ids whose waits are never selected. Only Ask Groundwork on WhatsApp passes it, with the check-ins kept in the app; the board, Today and everything else pass nothing and are sent exactly what they were.

Why: the board merges alike waits across check-ins and keeps the fullest words. Ask Groundwork on WhatsApp used to leave out a kept check-in only after that merge, so a kept wait could lend its words to a team wait that was said. Femi waits on Wairimu for "the new price list for Kilimani" in "Sales team, Q3", and for "the new price list for Kilimani before my Westgate review in the plan" in "Performance plan, Femi", kept in the app. Asked "who is waiting on me" on WhatsApp, Wairimu read "- the new price list for Kilimani before my Westgate review in the plan (Sales team, Q3) - waiting, 22 days". She now reads "- the new price list for Kilimani (Sales team, Q3) - waiting, 22 days". When the plan's wait was the older one, the team wait used to vanish altogether and she read "Nothing is recorded as waiting on you, and you have not named anything you are waiting on."; she now reads the team wait. In the app she still reads the merged wait, as before. Test: `api/src/modules/assistant/a-wait-kept-in-the-app-is-not-merged-into-one-said-on-whatsapp.spec.ts`.

## The blocker check: several holders "hold" it (2 October)

**A wording change in `blockerCheck[].checks[0]` on the board** (this commit). No field is added, moved or renamed. The verb now follows whoever holds the wait: one holder "holds" it, several "hold" it. Rukia, who said she was waiting on "my direct reports", read "Your direct reports holds it." and now reads "Your direct reports hold it."; Amina, who runs the check-in, and Juma, an admin who only reads, read "Their own direct reports holds it." and now read "Their own direct reports hold it." "Ade and Bola holds it." is now "Ade and Bola hold it." One holder is unchanged: "Finance holds it.", "A colleague holds it.", "You hold it." The rule is `aHolderIsMany` in `api/src/modules/board/a-holder-in-their-own-words.ts`. Test: `api/src/modules/board/several-holders-hold-it.spec.ts`.

## A review proposal uses the same apostrophe as the rest of Today (3 October)

**A wording change in the review proposal sentence** (this commit). `GET /suite/reviews` `next[].proposal`, and the writer's Today item for that review, which joins `"<name>’s review is ready for you to start."` to the same sentence. No field is added, moved or renamed. The proposal wrote a straight apostrophe and the title a curly one, so Wairimu read on Today "Miriam’s review is ready for you to start. Groundwork suggests a review for Miriam, because a check-in about Miriam's work has ended. Nothing is sent to Miriam unless you say yes." Both now use ’, the one the prototype's screens use: "... because a check-in about Miriam’s work has ended. ..." The rule is in `theProposalSentence`, `api/src/modules/suites/a-review-falls-due.ts`. Tests: `api/src/modules/grounds/a-review-on-today-as-each-reader-reads-it.spec.ts` and `api/src/modules/suites/the-review-falls-due-as-each-reader-reads-it.spec.ts`, each changed because it pinned the straight apostrophe, and each now also checks that no straight one is served.

## Ask Groundwork says who is waiting by name, in full sentences, with the day the wait began (3 October)

**What Ask Groundwork says changes, in the app and on WhatsApp** (this commit). These are chat answers, not a screen's fields, so no screen needs to change; the one field change is on the board service's internal `whoNeedsYouThisWeek`, which no route serves.

- **"Where am I needed"** (`where_am_i_needed`). Wairimu read `femi@baridi.test: waiting on you for the new price list for Kilimani, 22 days.` She now reads "Femi Ade has been waiting on you for the new price list for Kilimani since 10 September." A list of one is the sentence alone; several are a list of full sentences. Each need now carries `sentence` and `sinceSays` (`whoNeedsYouThisWeek` in `board.service.ts`, the `Need` type in `detectors/who-needs-you-this-week.ts`); `waitingDays` stays for the order only.
- **"Who is waiting on me" and "what am I waiting on"** (`what_is_stuck`). Wairimu read "Waiting on you:" then `- the new price list for Kilimani (Sales team, Q3) - waiting, 22 days`. She now reads "Femi Ade has been waiting on you for the new price list for Kilimani since 10 September, in the check-in Sales team, Q3." Where the person said it stops their work: "Femi Ade says they cannot go on without the signed delivery schedule for Westgate, and has been waiting on you for it since 15 September, in the check-in Sales team, Q3." Several are headed "Other people have said they are waiting on you for these things." A person's own waits read "You have been waiting for the new price list for Kilimani since 10 September, in the check-in Sales team, Q3." (several are headed "You have said you are waiting for these things."), where they used to read "You said you are waiting on:" and a fragment.
- **"What should I do next"** (`what_next`). "Start with femi@baridi.test. femi@baridi.test is waiting on you for ..., and has been for 22 days." is now "Start with Femi Ade. Femi Ade has been waiting on you for the new price list for Kilimani since 10 September. Nobody else can clear this one."
- **Who is named, and to whom.** The name is the person's sign-in name, else the roster's, else the name they gave at the end of a link, with who they answered for where they said (the same rule as the board's names). It is said to whoever runs that check-in, to anybody when the person waiting runs it, and otherwise only where the check-in names its people to each other (`peersAreNamedOn`, so the person a performance plan is about is never told who, decision 17). Everybody else, and anybody with no name anywhere, reads "Somebody in Sales team, Q3 has been waiting on you ...". An email address is never said. The rule is in `api/src/modules/board/the-person-waiting-by-name.ts`; the names are read with the waits in `waitingAcrossTheOrg`, which now also carries `fromName`, `fromRunsIt` and `naming` on each wait (no caller passes a wait through whole).
- **Two sentences of the week, made whole.** `NOTHING_FLAGGED` read "That is not the same as everybody being fine - it is the record being quiet, ..." and now reads "That is not the same as everybody being fine. It is the record being quiet, ...". The "cycle ran out" bucket read "Twenty minutes with them, about what is behind it. Not another check-in question." and now reads "Spend twenty minutes with them on what is behind it, rather than asking another check-in question."
- **WhatsApp.** A check-in kept in the app is still left out before alike waits are merged (decision 82, item 7); the same answers on WhatsApp simply leave its waits out.

Tests: `api/src/modules/assistant/who-is-waiting-is-said-by-name-as-each-reader-reads-it.spec.ts` (Wairimu who runs it, Miriam a colleague, Tom the person a performance plan is about, Femi who waits, Grace an admin, each in the app and on WhatsApp; all ten fail on the old code). Two tests changed because they pinned the old wording: `a-wait-kept-in-the-app-is-not-merged-into-one-said-on-whatsapp.spec.ts` (the team wait is now a sentence) and `what-they-said-and-what-is-next-as-each-reader-reads-it.spec.ts` (the day the wait began, not "for 6 days").

## "Where am I needed" shows the waits that were taken further, to whoever runs that check-in only (3 October)

**What Ask Groundwork says changes, in the app and on WhatsApp** (this commit). These are chat answers, not a screen's fields, so no screen needs to change. No route's fields are added, moved or renamed; the board service's internal `waitingAcrossTheOrg` now carries `escalatedAt`, `triedSaid` and `onName` on each wait, and the public API's "before a conversation" read, which already passed `escalatedAt` on, now gets a real value instead of always nothing.

- **The group could never show.** `waitingAcrossTheOrg` never selected `escalatedAt`, so the group "taken further" in "where am I needed" was always empty. It now shows, second, after the reader's own queue, longest wait first.
- **Who raised it.** Nobody raises a wait by hand. `escalatedAt` is Groundwork's own overnight check, stamped on a wait still open after 14 days (`webhooks.cron.ts`). The sentence that was written but never shown, "Femi Ade has raised that they are stuck on ..., and has been waiting since ...", said the person raised it, which was not true. A wait is now in the group when Groundwork stamped it, or when the person said themselves that they took it higher (`triedSaid`, read by `itWasTakenFurther`).
- **Who reads it.** Only whoever runs the check-in the wait was said in. A colleague, the person waited on, the person a performance plan is about, the person waiting, and an admin who does not run that check-in read nothing of it, not even "somebody". On WhatsApp a check-in kept in the app is still left out before alike waits are merged (decision 82, item 7).
- **What Wairimu, who runs the check-ins, now reads** under "where am I needed", after her own queue (two of the four lines in the test):

  > This has been taken further and is still open, in a check-in you run. Either clear it, or tell the person it is not being cleared.
  > - Femi Ade says they cannot go on without the signed delivery schedule for Westgate, and has been waiting on Miriam Njeri for it since 10 September, in the check-in Sales team, Q3. It was still open after 14 days, so Groundwork raised it on 24 September.
  > - Juma Otieno has been waiting on the finance office for the approved budget for the Karen shop since 12 September, in the check-in Sales team, Q3. They have said they took it higher.

  Before, that group never appeared. The group's heading read "Somebody raised this and it is still open. Either clear it or tell them it is not being cleared." (`WHAT_IT_ASKS.STUCK_AND_RAISED`, `detectors/who-needs-you-this-week.ts`).
- **Merged waits.** Where the same wait is said twice, the earliest stamp and the words that say it was taken further are kept, whichever mention carries them (`whatThePlaceIsWaitingOn`, through a new optional argument to `dedupeDependencies` that no other caller passes).
- **Unchanged, on purpose.** "Who is waiting on me", "what am I waiting on" and "what should I do next" do not say whether a wait was taken further. The handover read (`grounds/handover.service.ts`) reads only what, status and days.
- **The public API (`beforeAConversation`).** `sayHandoff` (`detectors/what-a-lead-should-read-first.ts`) now receives the real stamp. A wait past 14 days used to read "Past 14 days and not yet raised with <who>. Raise it." even when Groundwork had raised it; it now reads "<who> has been told - it was raised automatically once it passed 14 days. ..." That sentence's own wording (the dash, and "has been told") is not changed here.

Tests: `api/src/modules/assistant/a-wait-taken-further-as-each-reader-reads-it.spec.ts` (Wairimu who runs it, Miriam the person waited on and a colleague, Tom the person a performance plan is about, Femi who waits, Grace an admin, each in the app and on WhatsApp; Wairimu's two fail on the old code, the others guard who must read nothing). One test changed because it pinned the old code: `api/src/modules/board/the-week-only-groups-what-was-already-decided.spec.ts` looked for `if (w.escalatedAt)`; it now looks for the stamp or the person's own words, and for the rule that only whoever runs the check-in reads it.

## The read before a conversation says what is true about each wait, in full sentences, with dates (3 October)

**A wording change in the public API's read before a conversation** (this commit). `GET` the read before a conversation about a person (`beforeAConversation`, `api/src/modules/public-api/grounds-by-api.service.ts`), the sections "What other people are waiting on them for" and "What they are waiting on other people for": each line in `sections[].lines`. No field is added, moved or renamed; each wait passed to the read now carries the day it began (`since`, internal). The rule is `sayHandoff` in `api/src/modules/detectors/what-a-lead-should-read-first.ts`.

Each line joined pieces with dashes around a count of days that changed every time the read was opened, and one branch said something untrue: "has been told". Groundwork's overnight check stamps a wait still open after 14 days and posts a notice to the organisation's own webhook and connected channel, which names the check-in and never a person. Nobody is told directly. Each line now names who waits on whom (the person the read is about, by name, on their side), says the day it began, and says what actually happened and what the lead can do.

- **Raised by Groundwork.** Was: "the schema sign-off - 20 days with Tom, blocking. Tom has been told - it was raised automatically once it passed 14 days. If it is still sitting there, the thing to ask is what they need in order to finish it, not whether they will." Now: "Priya has been waiting on Tom for the schema sign-off since 12 May. They have said it stops their work. Groundwork raised it on 26 May, after it had been open for 14 days. That posts a notice to your organisation's own connected tools, where there are any. It does not tell Tom directly. If it is still open, ask Tom what they need in order to finish it, rather than whether they will."
- **Not raised yet.** Was: "the schema sign-off - 12 days with Tom, blocking. Tom has not been told yet - that happens on its own at 14 days, so in 2 days. If it matters sooner than that, say so to Tom today rather than waiting for it." Now: "Priya has been waiting on Tom for the schema sign-off since 20 May. They have said it stops their work. Groundwork raises a wait that is still open after 14 days, so it will raise this one on 3 June if it is still open. That posts a notice to your organisation's own connected tools, where there are any. It does not tell Tom directly. If it matters sooner than that, say so to Tom yourself today."
- **Past 14 days, not raised yet.** Was: "the schema sign-off - 15 days with Tom, waiting. Past 14 days and not yet raised with Tom. Raise it." Now: "Priya has been waiting on Tom for the schema sign-off since 17 May. It has been open for more than 14 days, and Groundwork has not raised it yet. Raise it with Tom yourself."
- **A remark, not a handoff.** Was: "the schema sign-off - 12 days with somebody not named, blocking. This one does not name who it sits with or what is actually needed, so it is a remark rather than a handoff - and nothing has been sent to anybody. Ask what exactly is needed and from whom, and it becomes real." Now: "Priya has been waiting for the schema sign-off since 20 May. They have said it stops their work. It does not say who it sits with or what exactly is needed, so it is a remark rather than a handoff, and Groundwork has sent nothing about it. Ask what exactly is needed and from whom, and it becomes a handoff."
- **Others waiting on the person.** These read "Somebody has been waiting on Priya for ..." (who waits is not in this read), where they used to read "... with somebody not named".

Tests: `api/src/modules/detectors/a-lead-walks-in-with-questions-not-a-verdict.spec.ts`, one test per branch with the exact sentence, and one through the whole read in both directions; all five fail on the old code. Two tests there changed because they pinned the old wording ("Tom has been told", "has not been told yet", "in 2 days").

## The rest of the read before a conversation is plain too (3 October)

**A wording change in the public API's read before a conversation** (this commit), `beforeAConversation`, `sections[].lines`, `completeness.line`, and the empty answer. No field is added, moved or renamed. The rules are in `api/src/modules/detectors/what-a-lead-should-read-first.ts` (`theReadFor`, `howCompleteThePictureIs`, `NOTHING_ON_RECORD`) and `api/src/modules/detectors/when-coaching-has-stopped-being-enough.ts` (`hasCoachingRunOut`, which now takes the person's name). Each line joined pieces with a dash, counted days from the moment the read was opened, or was a bare title with nobody in it. Priya is the person the read is about.

- **A late promise.** Was: "Send the migration plan. - due 9 days ago, still open." Now: "Priya promised "Send the migration plan" by 23 May, and it is still open."
- **A promise with no date.** Was: "Finish the vendor review - said 30 days ago with no date, so neither of you can tell whether it is late. Their next check-in asks them to put a date on it. Agreeing one in the room is faster." Now: "Priya promised "Finish the vendor review" on 2 May, with no date, so neither of you can tell whether it is late. Priya's next check-in asks them to put a date on it. Agreeing one in the room is faster."
- **A finding with no wording.** Was: "A STALLED OBJECTIVE finding, 5 days old." Now: "Groundwork first raised "stalled objective" on 27 May, and nothing more was written about it." A finding that has its own wording is served as before.
- **What they are carrying.** Was the bare title, "Launch the Lagos warehouse". Now: "Priya has been seen working on "Launch the Lagos warehouse"."
- **Where the normal cycle ran out.** "... They have seen it, ..." is now "... Priya has seen it, ...", and "What is behind it is still an open question - this says the conversation is yours now, not what the answer is." is now "What is behind it is still an open question. This says the conversation is yours now, not what the answer is."
- **An empty record.** "That is not a finding about them - it means they have not been ..." is now "That is not a finding about them. It means they have not been ...". The picture's line "This is not a thin picture of them - it is the absence of one, ..." is now "This is not a thin picture of them. It is the absence of one, ...".

Tests: `api/src/modules/detectors/a-lead-walks-in-with-questions-not-a-verdict.spec.ts`, "the rest of the read, line by line": one test per line with the exact sentence, and one that no served line has a dash join or a count of days. All seven fail on the old code. No existing test changed.

## Patterns reach the lead again, after the person (3 October, decision 86)

**Who reads a pattern changes, on every surface that serves one** (this commit): the board's `patterns`, the check-in page's `signals`, a person's own record, the session report, the weekly report's `threeInARow` and `forNextWeek`, Today's `forTheLead`, the coaching note, the lead's probe list, the judgement's material and the ending page's `signals`. No field is added, moved or renamed. Decision 86 reverses decision 74, item 2: the setting `patterns.reach`, whose default `PERSON_ONLY` held the lead back until steadiness reached 8 in 10, is gone. The rule is in `api/src/modules/patterns/who-reads-a-pattern.ts`. How patterns are detected and worded is not changed (decision 55).

- **The person it is about** still reads it first, with the answer box. Was: "Only you see this. Nothing is decided from it." Now, before the lead can read it: "You are seeing this first. Tunde will see it too, with anything you say about it. Nothing is decided from it." After: "Tunde can see this too, with anything you say about it. Nothing is decided from it." A lead reading a pattern about themselves still reads "Only you see this. Nothing is decided from it."
- **The lead, and the admin who set the check-in up for them,** read nothing before. Now they read each pattern once the person has had their turn (as soon as the person answers, three days after the person was shown it, or seven days after it was ready), with the person's own words, what to coach towards and one step, for example: "Problems are mostly put down to things outside the team." "Ngozi saw this first and said what is behind it." Today's list carries the nudge again: "Talk with Brian about “Others describe doing work they described as theirs”." with "Brian has seen it. Brian said, “I ran the call, Miriam built the numbers.”" The lead can mark a pattern right, wrong or not sure, and mark that they talked it through; both were refused with 403 before. "How the leading is landing" reaches the admin who set the check-in up as well as the lead.
- **A colleague, and an admin who does not run the check-in,** read nothing, as before (decision 58; see item 3 of decision 86 below for admins).
- **Removed:** `GET /admin/pattern-reach` and `PATCH /admin/pattern-reach`. Nothing reads a `patterns.reach` row any more; the local database had none.

Tests: `api/src/modules/patterns/who-reads-a-pattern.spec.ts`, `say-whats-behind-it.spec.ts`, `what-the-lead-made-of-a-pattern.spec.ts`, `api/src/modules/board/the-board-serves-patterns-under-the-rules.spec.ts`, `the-board-serves-no-pattern.spec.ts`, `the-lead-reads-the-good-version-beside-every-pattern.spec.ts`, `api/src/modules/reports/the-weekly-report-as-each-reader-reads-it.spec.ts`, `what-today-reads-from-the-record.spec.ts`, `the-probe-list-uses-the-plain-name.spec.ts`, `api/src/modules/resolution/the-ending-page-as-each-reader-reads-it.spec.ts` and `api/src/modules/admin/who-a-pattern-reaches-is-set-here.spec.ts`. Each file used to put the wider reach in force for itself and test the person-only reach in a last block. Nothing is put in force now, so every test of the lead reading a pattern runs on the default and fails on the old code; each last block, which pinned the person-only restriction, now pins the reverse. The tests that a colleague and an admin who does not run the check-in read nothing are kept.

## The manager reads the count behind a suggestion (3 October, decision 86)

**A wording change in two suggestions the manager reads** (this commit). No field is added, moved or renamed. Decision 86 reverses the "plain line with no count" part of decision 53 (and decision 60.2). The person still reads it first; the timing is unchanged. Only the commitments made in this check-in, or in the writer's own check-ins with the person, are counted, so nothing is said of a person's load across check-ins.

- **Extra support (week 10, item 28)**, `why` and `whatWouldChangeIt`, wherever the lead reads a suggestion: the check-in's suggestions, the ending page, the review's `suggestion`, and an admin deciding an appeal. The rule is `api/src/modules/suggestions/a-suggestion-reached-from-the-record.ts`. It is written when the suggestion is reached, so a suggestion already stored keeps its old words.
  - `why` was: "In the last four weeks, Kwame has kept fewer of the commitments made in this check-in than Groundwork looks for." Now: "In the last four weeks, Kwame kept two of the eight commitments made in this check-in. That is 25%. When fewer than half are kept, Groundwork suggests extra support." Above ten, figures are used, as on the prototype's suggestion: "In the last 4 weeks, Tobi kept 5 of the 12 commitments made in this check-in. That is 42%. When fewer than half are kept, Groundwork suggests extra support."
  - `whatWouldChangeIt` was: "If Kwame keeps more of the commitments made in this check-in over the next four weeks." Now: "If Kwame keeps at least half of the commitments made in this check-in over the next four weeks."
- **Recognising in a review**, `recognise.why` and `recognise.whatWouldChangeIt`, for the person writing the review. The rule is `api/src/modules/suites/a-review-may-suggest-recognising.ts`.
  - `why` was: "In the four weeks before this review started, Aisha kept nearly every commitment made in your check-ins together." Now: "Aisha kept nine of the ten commitments made in your check-ins together in the four weeks before this review started. When at least nine in ten are kept, Groundwork suggests recognising the work."
  - `whatWouldChangeIt` was: "If Aisha keeps fewer of them from now on." Now: "If Aisha keeps fewer than nine in ten of them from now on."
- **Unchanged.** What the person reads ("In the last four weeks, you kept two of your eight commitments in this check-in. ..."), the headline, the choices, and "has caught up since this was suggested", which carries no count because none is stored for that moment.

Tests changed, because they pinned "no count for the manager": `api/src/modules/suggestions/a-suggestion-reached-from-the-record.spec.ts`, `one-person-across-the-line-as-each-reader-reads-it.spec.ts` (the lead and an admin now read the count; they still never read the person's own "two of your six"), `a-suggestion-says-when-the-person-caught-up.spec.ts`, `api/src/modules/suites/recognising-in-a-review-as-each-reader-reads-it.spec.ts`, `the-review-falls-due-as-each-reader-reads-it.spec.ts` and `api/src/modules/resolution/the-ending-page-as-each-reader-reads-it.spec.ts`. Each now checks the exact sentence the manager reads, and fails on the old code.

## The person named for large spending can decide it (3 October, bug 1 of the suites document)

**Who is served the spending board changes, and the board gains one field** (this commit). `GET /suites/spend/board` (`SpendingService.board`, `api/src/modules/suites/the-spending.service.ts`), and through it Today's "waiting for you to approve", Ask Groundwork's "approve" and "decline", the WhatsApp reply and the lead's daily summary, which all read what waits from this board.

- **New field `reader`:** `'admin'`, `'lead'` or `'approver'`. Please use it on `#/suite/spend`: an `'approver'` is served only `waiting` (the requests they decide, each with `left`, what its team has left this month), and `budgets` and `teams` are always empty for them, so draw no "Each team's budget this month" table and no budget form. The prototype shows that table to an admin only.
- **A member named for anything over the limit** ("Who approves anything above that?") was refused the board with "Only an admin or a lead can open this board." Now they open it as an `'approver'` and read only what waits for them. For example, Omar, a member who keeps the books, reads Lina's request: "Lina: KES 95,000 for a new laptop", with `left` 60,000 for Product, `over` true and `mayDecide` true. On Today he reads "Lina asked to spend KES 95,000 on a new laptop." with "It is waiting for you to approve." and the link `/suite/spend`, so the spending page must open for a member who is an approver. In Ask Groundwork and on WhatsApp his "approve" is said back as "You are approving Lina's request to spend KES 95,000 for a new laptop. Is that right?", and after his yes: "Lina's request to spend KES 95,000 for a new laptop is approved now. I have let Lina know." Before, he was told on WhatsApp that it waited for him and then read "Nothing is waiting for you to approve or decline right now."
- **A lead from another department named for it** read only their own team's requests. Now they also read each request that waits for them from another team, with `mayDecide` true. Their `budgets` stay their own team's only.
- **Unchanged:** a member who is not named and a guest are refused as before; an admin and a lead who is not named read exactly what they read before (plus `reader`).

Tests: `api/src/modules/suites/the-person-named-for-large-spending-decides.spec.ts` (Omar the named member, Fatuma a named lead of another team, Grace the admin, Wairimu a lead who is not named, Miriam a member who is not named, and a guest; served through the board, Today's words, what Ask Groundwork and WhatsApp read as waiting, and the board's own decide). Five fail on the old code; the other four guard what must not change. No existing test changed.

## Each organisation says who holds each duty, and spending over the limit uses it (3 October, decision 85, build step 2)

**Two new routes for the admin, and who approves spending over the limit can change** (this commit). The rule is in `api/src/modules/suites/who-holds-each-duty.ts`; the routes are in `SuitesService.duties` and `setDuties`.

- **`GET /suites/duties`**, for an admin only. Everybody else is refused with "Only an admin can say who holds each duty." It returns:
  - `organisation`: three duties, each `{ key, ask, holder }`, with `holder` `{ id, name }` or null. The questions are "Who looks after finance?", "Who looks after HR?" and "Who is the chief executive?".
  - `teams`: one row for each team in the staff directory, `{ team, budgetOwner, head }`, each `{ id, name }` or null. The questions for each team are in `teamAsks`: "Who holds each team’s budget?" and "Who heads each team?".
  - `said`: what is set, in full sentences, for example "Omar Abdi looks after finance.", "Grace Achieng is the chief executive.", "Wairimu Kamau holds the Sales budget." and "Wairimu Kamau heads Sales." With nothing set: "Nobody has been named for any duty yet."
  - `usedFor`: one sentence to show under it: "Spending over what a manager may approve alone goes to three people in order. It goes first to whoever holds that team’s budget, then to whoever looks after finance, and last to the person named on the spending suite."
  - `people`: who may be named, the organisation's own people by name, never a guest.
- **`PUT /suites/duties`**, for an admin only, with any of `finance`, `hr`, `chiefExecutive` (a person's id, or null to clear) and `budgetOwners`, `departmentHeads` (an object from team name to a person's id or null). A duty left out is kept. It returns the same as the `GET`. Refusals: "Choose somebody in this organisation." (a guest, or somebody outside) and "Choose a team from your staff directory."
- **Where to put it:** nowhere in the prototype shows it. I suggest a short section on the Suites page for an admin, "Who holds each duty", above or beside the spending suite's questions. The Suites page itself (`GET /suites`) is unchanged and never lists the duties as a suite.
- **Spending over the limit:** it now goes to whoever holds the requester's team's budget, then to whoever looks after finance, and only then to the person named for "Who approves anything above that?". Nobody decides their own, and a holder who is now a guest is passed over. The board's `approver` for such a request is `{ kind: 'person', firstName }` of that holder, as before for the named person, and the holder opens the board as an `'approver'` (see the entry above) if they are a member. For example, with Omar holding the Product budget, Lina's say-back reads "... This is over KES 20,000, so Omar must approve it.", Omar reads "Lina asked to spend KES 95,000 on a new laptop." on Today, and Grace, who was named on the suite, reads the request with `mayDecide` false. With no duty set, nothing changes. Up to the limit, nothing changes: the requester's lead, or an admin.

Tests: `api/src/modules/suites/who-holds-each-duty-as-each-reader-reads-it.spec.ts` (Grace the admin sets, reads and clears; Wairimu a lead, Miriam and Omar members, and Tomas a guest are refused and change nothing; a guest, somebody outside and a team not in the directory cannot be named; the Suites page never shows the duties) and five new tests in `the-person-named-for-large-spending-decides.spec.ts` (Omar holding the Product budget or finance, Lina holding her own team's budget, a holder who is now a guest, no duties at all, and a request under the limit). No existing test changed. No migration: the duties are one `OrganizationSuite` row with the key `duties`.

## A review names the person who actually started or decided it (3 October, bug 2 of the suites document)

**Who a review is said to be written with changes** (this commit), in `ReviewsService` (`api/src/modules/suites/the-reviews.service.ts`). Before, every reader was told the person's line manager, even where the organisation answered "An admin" to "Who writes each review with the person?" and an admin started it. Now it is read from the review itself: whoever decided it, once it is decided, or else whoever started it (`theOneWhoWrote`).

- **`GET /suites/reviews/mine`, and Today through it.** `writtenWithFirstName` and `says` name that person. For example, where Grace (an admin) started Aisha's review and Wairimu is Aisha's line manager, Aisha used to read "Wairimu has started your review. You can read it and add your own view before you meet." She now reads "Grace has started your review. You can read it and add your own view before you meet." On Today the title is "Grace has started your review." with the detail "You can read it and add your own view before you meet." When Omar, another admin, decides it, she reads "Omar has decided your review. You can read the decision and the reasons."
- **`GET /suites/reviews/:id`.** For the person, `writtenWithFirstName` is that person. For the writer, a lead and an admin, `writtenWith` and `writtenWithFirstName` are that person ("Grace Achieng", "Grace"). The person's recognising lines (`recognise.facts`, `recognise.whoDecides`) name whoever started the review, because the count is of the check-ins with them.
- **`GET /suites/reviews/board`.** For a started or decided review, `writtenWith` is the same person. For a review nobody has started yet, `writtenWith` is the line manager only where the answer is "Their manager" and that manager can write it (a lead or an admin here). Where the answer is "An admin", or the manager cannot write it, `writtenWith` is now **null**, because any admin may start it. Please show nothing in the "Written with" column then, or "An admin", not a name.
- **WhatsApp** already named whoever started or decided it ("Hi Aisha, Grace has started your review. ..."). Unchanged, and now tested.
- **Unchanged:** where the answer is "Their manager" and Wairimu starts it, everybody reads "Wairimu" as before. Who may read and write a review is unchanged.

Tests: `api/src/modules/suites/a-review-names-who-wrote-it-as-each-reader-reads-it.spec.ts` (Aisha the person in the app, on Today and on WhatsApp; Grace and Omar the admins who start and decide; Wairimu her lead who does not write it; Kamau a lead of another team and Miriam a colleague, still refused). Four fail on the old code. No existing test changed.

## One rule for who may decide a request (3 October, decision 85, build step 3)

**Nothing you read changes, except in two cases where nobody could decide before** (this commit). Who may decide leave, time sheets, reviews and spending is now worked out in one place, `api/src/modules/suites/who-may-decide.ts` (`whoMayDecide`, `theOneWhoDecides`, `theStepsFor`). It names approvers by rule: the requester's manager, the budget owner, the department head, finance, HR, the chief executive, or an admin. Each suite's answers are read as a list of these rules, tried in order:

- leave and time sheets: the manager, else an admin (as decided on 1 October; the admin's "Who approves?" answer is still not read);
- reviews: "Their manager" is the manager, else an admin; "An admin" is any admin;
- spending up to the limit: the manager, else an admin;
- spending over the limit: the team's budget owner, then finance, then the person named on the suite, then an admin.

A table test (`one-approval-resolver-changes-no-answer.spec.ts`) checks every answer, every kind of requester and every reader against the three old rules, and the same people may decide. The two changes, both to `mayDecide` / `mayStart` / `mayWrite` and to who is told on WhatsApp:

- **A review of a lead whom the staff directory names as their own manager**, with the answer "Their manager": before, nobody could start it (not even an admin). Now any admin can, and `mayStart` is true for an admin on the board.
- **Spending over the limit, where the person named on the suite is now a guest or has left the organisation:** before, the request waited on that person, who could not open the board. Now it goes to an admin: the board's `approver` is `{ kind: 'admin' }`, `mayDecide` is true for an admin, and the say-back no longer names that person.

No field is added or removed.

## An admin, the chief executive included, reads the figures on the board and in the weekly report (3 October, decision 86)

**Who reads which figures changes** (this commit). No field is added, moved or renamed. Decision 86 reverses decision 73 for admins, and the "only the lead sees every person's target share" rule. An admin of the organisation who only reads, the admin who set the check-in up and the admin asked to approve it now read what the lead reads of the targets. The lead's own decision about a person (decision 46), the lead's private files, the lead's own list (`forNextWeek`, `forTheLead`) and patterns (decision 58; see decision 86, item 1) stay as they were.

- **The board** (`GET /board/:groundId`, `api/src/modules/board/board.service.ts`):
  - `objectives`: every person's share, where an admin used to read the team's targets only. For example Juma now reads "The team is aiming for 20 shops onboarded.", "Rukia Mwangi's own aim is 3 shops in Kilimani." and "Baraka Otieno is aiming for 5 visits a week.", where he read the first alone. A person's own aim kept as their promise (request 110) is in it too.
  - `objectives[].journey.say`: the line under an aim, where an admin used to read an empty line on a target with somebody's number on it. Now, for example: "It was 0 at the start and is 11 now, and the aim is 40."
  - `objectives[].stands`, `headline`, `forecast` and `toCloseTheGap`: sent to an admin who only reads, where they were withheld. For example "It is 12, which is over the limit of 10." with the word "Over limit", and the question "Will we reach 40 approved facilities and 120 million naira disbursed this quarter?"
  - `eachPerson[].says` and `eachPerson[].target`: an admin reads each person's number. Was "Aisha Otieno has checked in." Now "Aisha Otieno is at 1 of 40, and 3 of the 4 rounds have gone. At this pace, 40 would not be reached by the end." Anywhere else on the board, a sentence with somebody's number in it is no longer taken out for an admin.
- **The weekly report** (`GET /grounds/:id/report/week`, `api/src/modules/reports/the-weekly-report.service.ts`), `inNumbers` and `whatChanged.result`: an admin who only reads reads the aim and the limit, and each person's number, whatever the "who sees targets" setting. Was "The team's freezers sold went from 12 to 17 this week." Now "The team's freezers sold went from 12 to 17 this week, against the aim of 40." and "The team's spending this quarter went from 200,000 to 254,000 this week, against the limit of 180,000. That is 74,000 over the limit.", and a new figure "visits made, Aisha's number", "It stayed at 9 this week."
- **The Company page** is not changed: an admin, the chief executive included, already read each priority's measure and target (`priorities[].measure`, `priorities[].target`).
- **Not changed, and asked of Hafsah:** the check-in's Context page (`GET /grounds/:id`, `objectives`), the session report and Today still give an admin who only reads the team's targets only, and take a person's number out of their sentences. So an admin reads Kwame's 17 on the board but not in the report.

Tests changed, because they pinned that an admin who only reads gets no aims, no shares or no number: in `api/src/modules/board/` `a-forecast-on-the-board-as-each-reader-reads-it`, `request-108-the-headline-and-where-each-target-stands`, `request-115-c-what-the-sales-board-was-missing`, `decision-75-item-17-five-kinds-of-target-as-each-reader-reads-it`, `a-participants-own-aim-is-their-own-as-each-reader-reads-it`, `an-aim-is-a-sentence-about-somebody`, `a-number-with-a-name-on-it-goes-through-one-rule`, `each-person-says-no-hidden-number-to-an-admin`, `a-board-that-does-not-contradict-itself`, `a-hidden-target-cannot-slip-through`, `a-target-in-the-leads-words-stays-hidden`, `a-target-is-an-aim-or-a-limit-as-each-reader-reads-it`, `request-110-your-own-aim-kept-as-your-promise`, `their-own-words-stay`, `what-the-lead-has-not-shared-reaches-nobody`; `api/src/modules/grounds/one-rule-for-whose-share-is-shown`; and `api/src/modules/reports/the-weekly-report-as-each-reader-reads-it`. Each now checks what the admin reads, and fails on the old code. The tests that a colleague reads no other person's number, and that the lead's private file and decisions about a person stay the lead's, are kept.

## The leave, time sheets and reviews boards serve whoever the rules name (3 October, decision 85, build step 3)

**Each of the three boards gains one field, `reader`, and serves whoever the rules name to decide** (this commit), as the spending board did in the entry "The person named for large spending can decide it". `GET /suites/leave/board` (`LeaveBoardService.board`), `GET /suites/time/board` (`TimeSheetsService.board`) and `GET /suites/reviews/board` (`ReviewsService.board`), and through them Today's "waiting for you to approve" and "ready for you to start", Ask Groundwork's "approve" and "decline", the WhatsApp reply and the lead's daily summary.

- **New field `reader`:** `'admin'`, `'lead'` or `'approver'`, on all three boards. An `'approver'` is a member the rules name to decide. Please open `#/suite/leave`, `#/suite/time` and `#/suite/reviews` for such a member, and draw only what is served:
  - leave: `waiting` holds only the requests that wait for them, each with `daysLeft`, `team` and `alsoOff` as a lead reads them; `off` holds only their own leave, so draw no "Who’s off" list of other people;
  - time sheets: `weeks` holds only the people whose hours wait for them; `agreements` is null, so draw no "Hours against what each client agreed";
  - reviews: `next` holds only the reviews they write, with `mayStart`.
- **A lead from another team whom the rules name** now also reads, beside their own team's, each request, week of hours or review that waits for them, with `mayDecide`, `mayApprove` or `mayStart` true. Their "Who’s off" list stays their own team's.
- **With today's answers nobody new is named**, so nothing anybody reads changes yet: a manager must be a lead or an admin, and otherwise an admin decides. This is ready for the steps of build step 4. A spec sets the rules as a later workflow could ("the department head", "HR") to prove each reader's view: Omar, a member who heads Sales, reads on Today "Aisha asked for leave from Thursday 1 October to Friday 2 October." with "It is waiting for you to approve.", "Aisha sent 3 hours on Naivas for Monday 28 September." with "They are waiting for you to approve.", and "Aisha’s review is ready for you to start."; in Ask Groundwork, "You are approving Aisha's leave from Thursday 1 October to Friday 2 October. Is that right?"; and Aisha then reads "Omar has started your review. You can read it and add your own view before you meet."
- **Unchanged:** an admin reads everything; a lead reads their own team's; a member nobody names and a guest are refused with the same sentences; nobody reads their own request as waiting.

Tests: `api/src/modules/suites/whoever-the-rules-name-decides-as-each-reader-reads-it.spec.ts` (Omar a named member, Kamau a named lead of another team, Wairimu a lead not named, Grace the admin, Miriam a member not named, Aisha the requester, Tomas a guest; and today's answers, unchanged). Eight fail on the old code. No existing test changed.

## Today shows a member what waits for them to decide (3 October, decisions 85 and 86)

**What a member reads on Today changes, when the rules name them** (this commit). No field is added, moved or renamed. `GET` Today (`WhatNeedsYouService.forReader`, `api/src/modules/grounds/what-needs-you.service.ts`) used to ask the leave, time sheets, spending and reviews boards only for an admin or a lead. So Omar, a member named for spending over the limit, was told on WhatsApp, in Ask Groundwork and in the daily summary that Lina's request waited for him, and found nothing on Today. The entry above said Omar reads these lines on Today; that was true of the boards, but Today never asked them for a member. Today now asks the boards for every reader, and each board decides who may open it, as it already does for every other way in.

- **Omar, a member named for spending over KES 20,000:** was nothing. Now "Lina asked to spend KES 95,000 on a new laptop." with "It is waiting for you to approve."
- **Omar, a member who heads Sales, where the rules name the department head:** was nothing. Now "Aisha’s review is ready for you to start." with "It is due on Monday 5 October.", "Aisha asked for leave from Thursday 1 October to Friday 2 October." with "It is waiting for you to approve.", and "Aisha sent 3 hours on Naivas for Monday 28 September." with "They are waiting for you to approve."
- **Unchanged:** a member nobody names, and a guest, read nothing waiting, because each board refuses them and Today reads a refusal as nothing waiting; Today still opens. An admin and a lead read what they read before. The approvals queue for check-ins is still asked for an admin only.

Tests: `api/src/modules/grounds/what-needs-you.service.whoever-the-rules-name.spec.ts`, through the real Today service and the real boards (Omar named for spending, Omar named by duty, Miriam a member nobody names, Tomas a guest, Grace the admin, Wairimu a lead, and today's answers). Two fail on the old code: Omar's spending and Omar's leave, hours and review. One existing test changed, because it pinned the old fault: in `what-is-waiting-for-you-to-approve-as-each-reader-reads-it.spec.ts`, "a person and a colleague are told nothing, and the boards are not even asked" now checks that the boards are asked, refuse them, and they are told nothing.

## A request passes through approval steps, and each reader reads where it is (3 October, decision 85, build step 4)

**Leave, spending and hours can go through more than one approver, and every request now says where it is in a full sentence** (this commit). An admin sets the steps; until one does, every suite has exactly the one step it had, so who decides does not change for anybody.

- **New field `where` (a string) on each row of three boards:** `GET /suites/leave/board` (`waiting[]`), `GET /suites/spend/board` (`waiting[]`) and `GET /suites/time/board` (`weeks[].people[]`). It is written for the reader. Please show it under each request, in place of anything you build from `mayDecide` or `approver`:
  - "It is waiting for you." (the reader decides it now);
  - "It is waiting for Wairimu." (somebody else decides it now);
  - "Wairimu has approved it, and it is now waiting for you." (an earlier step was approved);
  - "You have approved it, and it is now waiting for Omar in finance." (the reader approved the earlier step);
  - for hours, "Wairimu has approved these hours, and they are now waiting for you.", and "Wairimu approved these hours." once the last step has.
- **New field `where` on each of the person's own requests:** `GET /suites/leave/mine` (`requests[]`) and `GET /suites/time/mine` (`weeks[]`). For example:
  - "Your leave from Thursday 1 October to Friday 2 October is waiting for Wairimu."
  - "Your leave from Thursday 1 October to Friday 2 October is approved by Wairimu and is now waiting for Omar in finance."
  - "Your leave from Thursday 1 October to Friday 2 October is approved by Wairimu and Omar."
  - "Wairimu declined your leave from Thursday 1 October to Friday 2 October."
  - "Your hours for the week of Monday 28 September are approved by Wairimu and are now waiting for Omar in finance."
- **New route `GET /suites/spend/mine`:** the person's own requests to spend, newest first, `{ currency, requests: [{ id, amount, what, status, askedOn, where }] }`, with `where` such as "Your request to spend KES 12,000 for fuel is approved by Wairimu and is now waiting for Omar in finance." Before this, a person could not read their own requests to spend at all. Nobody else's are served.
- **New routes `GET /suites/workflows` and `PUT /suites/workflows`, for an admin only** (a lead, a member and a guest are refused with "Only an admin can set the approval steps."). `GET` gives `{ suites: [{ key, name, set, steps, stepsAbove, escalateAfter, said }], rules: [{ key, said }] }` for leave, time sheets and spending. `steps` is a list of steps, each a list of rules tried in order (`manager`, `departmentHead`, `budgetOwner`, `finance`, `hr`, `chiefExecutive`, `admin`). `said` is the workflow in full sentences, for example "A leave request goes first to the person’s manager, or else whoever heads their team, or else an admin, and then to whoever looks after HR, or else an admin." and "If the person it waits for has not answered after 2 working days, or is on approved leave that day, it goes to the next person on that step’s list." With nothing set: "Groundwork never passes leave requests on by itself. An admin can set a number of working days after which it does." `PUT` takes `{ leave?, time?, spend? }`, each `{ steps?, stepsAbove? (spending only), escalateAfter? (1 to 30) }`; a part given as null is cleared back to how it always ran, and one left out is kept. It answers with the same shape as `GET`. Steps are kept apart from each suite's answers, so switching a suite on again keeps them.
- **Ask Groundwork and the WhatsApp reply, when an approval is not the last step:** "You approved Aisha's leave from Thursday 1 October to Friday 2 October. It now waits for Omar in finance." The person is not told yet, because nothing is decided; whoever decides the next step is told on WhatsApp with the same `groundwork_request_waiting` message, and reads it on Today as before. The last step's approval, or a decline at any step, reads as before: "Aisha's leave from ... is approved now. I have let Aisha know."
- **Unchanged:** with no steps set, every reader decides and reads exactly what they did before (the table of every answer, requester and reader is in the spec). `mayDecide`, `mayApprove`, `approver` and `approved` keep their meaning, now for the step the request is on.

Tests: `api/src/modules/suites/approval-steps-as-each-reader-reads-them.spec.ts` (Aisha who asks, Wairimu her manager, Omar in finance, Grace the admin, Miriam a colleague, Tomas a guest). The reader tests fail on the old code; the table proving that nothing switched on changes passes on both, as it must. Four existing tests changed, each only to add the new `where` sentence to an exact board row they compare: `the-leave-board-as-each-reader-reads-it.spec.ts`, `the-spending-as-each-reader-reads-it.spec.ts`, `the-person-named-for-large-spending-decides.spec.ts` and `whoever-the-rules-name-decides-as-each-reader-reads-it.spec.ts`. Two specs that set the rules by hand (`whoever-the-rules-name-decides-...` and `what-needs-you.service.whoever-the-rules-name.spec.ts`) now set one step of rules, because `theStepsFor` gives a list of steps; and `one-approval-resolver-changes-no-answer.spec.ts` reads the first step.

## A request that waits too long is passed on (3 October, decision 85, build step 4)

**Once a day, a request that has waited too long, or whose approver is on approved leave, moves to the next person on its step's list** (this commit). No field is added. What changes is who `mayDecide` / `mayApprove` names and what the `where` sentence of the entry above says, on the same routes: `GET /suites/leave/board`, `GET /suites/spend/board`, `GET /suites/time/board`, `GET /suites/leave/mine`, `GET /suites/spend/mine`, `GET /suites/time/mine`, and through them Today, Ask Groundwork and the WhatsApp reply.

- **It only happens when an admin set a number of working days** with `PUT /suites/workflows` (`escalateAfter`, 1 to 30, on leave, time sheets or spending). With no days set, nothing is ever passed on, not even when the approver is away.
- **When it moves:** at 07:00 UTC, once across every copy of the API, a request that has waited that many working days (Monday to Friday) for the same person, or whose approver is on approved leave that day, goes to the next rule on its step's list that names somebody else. Whoever that names is told on WhatsApp with `groundwork_request_waiting`, and reads it on Today. The person who asked is not sent anything; they read the new name in `where`.
- **What each reader reads after it moves**, with leave set to "the person's manager, or else whoever heads their team, or else an admin" and two working days:
  - Aisha, who asked: "Your leave from Thursday 1 October to Friday 2 October is waiting for Omar, who heads Sales." For spending, "Your request to spend KES 12,000 for fuel is waiting for Omar, who heads Sales." For hours, "Your hours for the week of Monday 28 September are waiting for Omar, who heads Sales."
  - Omar: the request on his board with `mayDecide` true and "It is waiting for you."
  - Wairimu, her manager, who still reads her team's requests: `mayDecide` false and "It is waiting for Omar, who heads Sales." She can no longer decide it.
  - Two more working days without Omar's answer: "Your leave from ... is waiting for an admin.", and on Grace's board "It is waiting for you." It stops there.

Tests: `api/src/modules/suites/a-request-waits-too-long-as-each-reader-reads-it.spec.ts`. All but the two that show nothing moves without days set fail on the old code. No existing test changed.

## One record of who did what on a request, read in plain sentences (3 October, decision 85, build step 5)

**Every leave request, request to spend, week of hours and review now keeps who did what, and when, and it is served to the people who may already read the request** (this commit). Nothing already served changes.

- **New routes**, each answering `{ said: string[] }`, oldest first:
  - `GET /suites/leave/requests/:id/history`
  - `GET /suites/spend/requests/:id/history`
  - `GET /suites/time/weeks/:weekOf/people/:personId/history`
  - `GET /suites/reviews/:id/history`
- **Who may read it:** the person who asked, an admin, a lead of the person's team, and whoever decides it now; for a review, exactly whoever may open the review (`GET /suites/reviews/:id`). Anybody else gets "That request was not found." (for hours, "There are no hours here for you to read for that week."). Please show it under the request, on the leave, spending and time sheets boards and under the person's own requests, as a short list of sentences.
- **What each reader reads**, for Aisha's leave, which Wairimu approved on 2 October and Omar in finance on 3 October:
  - Aisha: "You asked for it on 1 October, after Groundwork said it back and you said yes." "Groundwork told Wairimu on WhatsApp on 1 October." "Wairimu approved it on 2 October." "Groundwork told Omar on WhatsApp on 2 October." "Omar approved it on 3 October." "Groundwork told you on WhatsApp on 3 October."
  - Wairimu: "Aisha asked for it on 1 October, after Groundwork said it back and Aisha said yes." "Groundwork told you on WhatsApp on 1 October." "You approved it on 2 October." and the rest with names.
  - A decline: "Wairimu declined it on 2 October."
  - Passed on: "Groundwork passed it to Omar on 30 September, because Wairimu had not answered for 2 working days." (Wairimu reads "because you had not answered"). When the approver was on leave: "because Wairimu was on leave".
  - Hours: "You sent these hours on 29 September, ..." and "Wairimu approved these hours on 30 September."
  - A review: "Wairimu started the review on 1 October." "Wairimu decided the review on 5 October." Never a word of the review.
- **What is kept**, in the new table `suite_events`: the suite, the request, what happened (asked, told, approved, declined, escalated, started, decided), who did it, who it went to, the step, when, and on what information as references to rows only (the request's id, the say-back the person said yes to, the WhatsApp message's name, a week's total in minutes). Never a copy of anybody's words.

Tests: `api/src/modules/suites/who-did-what-as-each-reader-reads-it.spec.ts` (Aisha who asked, Wairimu her manager, Omar in finance, Grace the admin, Miriam a colleague, Tomas a guest). All fail on the old code. Three existing tests changed, because the yes in Ask Groundwork now passes the say-back's reference on to the suite: `hours-and-spending-through-ask-groundwork.spec.ts` (two lines), `organisation-memory-and-leave-through-ask-groundwork.spec.ts` and `a-roster-entry-matched-by-email-asks-and-approves.spec.ts` now expect `proposalId` in the call.

## Each change of the suites' rules is kept, and an admin reads it (3 October, decision 85, build step 5)

**A suite switched on or off, its answers changed, who holds each duty, and the approval steps are each kept as a change, with who, when, and from what to what** (this commit). `OrganizationSuite` kept only the last answers.

- **New route `GET /suites/rules/history`, for an admin only** (anybody else gets "Only an admin can read how the suites’ rules were changed."). It answers `{ changes: [{ suite, by, at, said, details, before, after }] }`, newest first. `said` is one full sentence and `details` says what changed, each in a full sentence. Please show it on the Suites page for an admin, under a heading such as "How the rules were changed". For example:
  - "Grace switched on leave requests on 1 October." with "The answer to “How many days of leave does each person have in a year?” was set to 21." and "The answer to “Who approves a request for time off?” was set to Their manager."
  - "Grace changed the answers for leave requests on 2 October." with "The answer to “How many days of leave does each person have in a year?” changed from 21 to 25."
  - "Grace changed who holds each duty on 3 October." with "The answer to “Who looks after finance?” was set to Omar Abdi."
  - "Grace changed the approval steps on 3 October." with "The approval steps for leave requests changed. A leave request goes first to the person’s manager, or else an admin, and then to whoever looks after finance, or else an admin. ..."
  - "Grace switched off leave requests on 4 October."
- `before` and `after` are `{ isOn, answers }` as kept, for a screen that wants to show them side by side; `before` is null the first time. Saving the same answers again keeps nothing.
- **Unchanged:** `GET /suites`, `PUT /suites/:key`, `GET/PUT /suites/duties` and `GET/PUT /suites/workflows` answer exactly as before.

Tests: `api/src/modules/suites/the-suites-rules-history-as-each-reader-reads-it.spec.ts` (Grace the admin; Wairimu a lead, Omar a member and Tomas a guest, refused). All fail on the old code. No existing test changed.

## What the person who decides a leave request reads (3 October, decision 85, build step 7)

**Each waiting request on `GET /suites/leave/board` now carries two new fields, `owns` and `said`** (this commit). Nothing else on the route changes, and Today, Ask Groundwork and WhatsApp send what they did before.

- **`owns: string[]`**, what the person owns that falls in the days they asked for, one full sentence each, sorted by the day it is due:
  - "Aisha committed to “Send the Atlas price list”, due on Thursday 15 October." (an open commitment, from a check-in or the organisation's own system)
  - "Aisha's target “Sign 12 shops” on Sales, Q3 is due on Friday 16 October." (a target that is hers on a check-in, with a date to meet)
  - "Aisha owns “Project X milestone” on Sales, Q3, due on Thursday 15 October." (a work-plan item she owns on a check-in)
  - "Aisha owns “Open the Nakuru shop”, due on Wednesday 14 October." (an objective or project the organisation's own system says she owns)
  - When nothing is found: "Groundwork found nothing Aisha owns that is due on those days."
- **Who reads which line.** Anything from a check-in is served only to a reader who may already read that check-in's board (the lead who runs it, an admin with reach over it, a lead of the same department), by the one rule every read uses. So an admin who was not given access to Aisha's performance plan does not read its targets, and Wairimu does not read an item on a check-in run in Operations. A target the lead marked as a decision about a person is never served here. When something was left out for this reader, the "found nothing" sentence is not said either, so it is never untrue. Nothing new is opened to anybody.
- **`said: string[]`**, the whole request as the person who decides it reads it, in full sentences with names, for the screen to show as the request's body:
  - "Aisha asked for leave from Monday 12 October to Friday 16 October, which is 5 working days."
  - "Aisha has 18 days left." (only when the organisation said how many days each person has)
  - "Nobody else in Sales is off those days." or, for one day, "that day"; with others off, "Brian and Neema are also off on some of those days, so Sales would be three short.", or for one day "Brian is also off that day, so Sales would be two short." (the prototype's words). Nothing is said when the directory gives the person no team.
  - "Miriam Wanjiku will stand in for Aisha." (only when a stand-in was given)
  - then each sentence of `owns`.
- **Who is served it:** exactly who was served the request before: an admin, a lead of the person's team, and whoever decides it. The person reads their own request under `GET /suites/leave/mine` as before, and a colleague is refused the board as before.
- **Please show** `said` as the request's text on the leave board, in place of building it from the fields, with the approve and decline buttons under it. The other fields stay for anything that needs them.

Tests: `api/src/modules/suites/what-the-approver-reads-of-a-leave-request-as-each-reader-reads-it.spec.ts` (Wairimu who decides it, Grace an admin, Kamau a lead of another team, Miriam a colleague, Aisha who asked). The tests of what Wairimu and Grace read fail on the old code. Two existing tests changed, each only to add the two new fields to an exact board row they compare: `the-leave-board-as-each-reader-reads-it.spec.ts` and `whoever-the-rules-name-decides-as-each-reader-reads-it.spec.ts`.

## Ask a question about a leave request, and a reason with a decline (3 October, decision 85, build step 7)

**Whoever decides a leave request can now ask the person a question, the person answers, and the request keeps waiting. A decline can carry a reason, which the person is told** (this commit).

- **New route `POST /suites/leave/requests/:id/question`** with `{ question }` (up to 1,000 characters). Only whoever decides the request now may ask, and only while it waits; anybody else gets "Only the person who decides this request can ask about it.", a decided request "This request has already been decided.", and an empty one "Write the question first." It answers with the board, as approve and decline do. Please put "Ask a question" beside Approve and Decline, opening a box for the question.
- **New route `POST /suites/leave/requests/:id/answer`** with `{ answer }`. Only the person who asked for the leave may answer ("Only the person who asked for this leave can answer a question about it."), and only when a question waits for them ("There is no question waiting for your answer on this request."). It answers with `GET /suites/leave/mine`.
- **`POST /suites/leave/requests/:id/decline` now takes an optional body `{ reason }`** (up to 1,000 characters). Please offer a box for it under Decline, saying the person will read it.
- **New on each waiting request on `GET /suites/leave/board`: `questions: string[]`**, and the same sentences at the end of `said`, for whoever already reads the request (an admin, a lead of the team, whoever decides it):
  - Wairimu, who asked: "You asked Aisha on 5 October, “Who will cover the Project X milestone?”" then "Aisha has not answered yet." or "Aisha answered on 6 October, “Brian will cover it, and I will brief him on Friday.”"
  - Anybody else on the board: "Wairimu asked Aisha on 5 October, “...”" and "Aisha answered on 6 October, “...”"
- **New on each request on `GET /suites/leave/mine`:**
  - `questions: string[]`: "Wairimu asked you on 5 October, “Who will cover the Project X milestone?”" then "You have not answered yet. You can answer it here or in Ask Groundwork." or "You answered on 6 October, “...”"
  - `questionWaiting: { id, question, askedBy } | null`, so the screen can show a box to answer it under the request.
  - `declinedBecause: string | null`: "Wairimu said, “Sales is two short that week.”" Shown under "Wairimu declined your leave on Monday 19 October." It is the approver's words about the decision. No reason for the leave itself is ever asked for or kept (decision 31).
- **Today, for the person only:** a new item while a question waits for their answer, kind `decide`: title "Wairimu asked you a question about your leave from Monday 12 October to Friday 16 October.", detail "Wairimu asked, “Who will cover the Project X milestone?” Your request is still waiting.", action "Answer it" to `/suite/leave`.
- **Ask Groundwork, for the person:** the next thing they write there is said back as their answer: "Wairimu asked you about your leave from Monday 12 October to Friday 16 October, “Who will cover the Project X milestone?” I will send Wairimu your answer as you wrote it, “Brian will cover it, and I will brief him on Friday.” Shall I send it?" Yes: "I have sent your answer to Wairimu. Your leave request is still waiting for Wairimu to decide." No: "I have not sent it. Wairimu’s question is still waiting for your answer, so write your answer here when you are ready, or answer it under your leave." A message that is plainly something else (approve or decline, or a new request for leave, hours or spending) is answered as it would be, and the question keeps waiting.
- **Ask Groundwork and the WhatsApp reply, for the approver:** "decline Samuel's leave because Sales is two short that week" is said back as "You are declining Samuel's leave on Monday 19 October, and I will tell Samuel your reason, “Sales is two short that week.” Is that right?", and after the yes, "Samuel's leave on Monday 19 October is declined now. I have let Samuel know, with your reason." Without "because", it reads as before.
- **WhatsApp:** the person is told of the question with the question itself inside the 24 hours, and the approver is told of the answer with the answer itself; the decline reason is said inside the 24 hours. The exact words and what goes outside the 24 hours are in `docs/whatsapp-templates.md`, with one new template proposed, `groundwork_request_question`.
- **The record of who did what** (`GET /suites/leave/requests/:id/history`) gains "Wairimu asked Aisha a question about it on 5 October.", "Aisha answered Wairimu's question on 6 October." (or "your question" for Wairimu), and "Wairimu declined it on 5 October and gave a reason." It never holds the words of the question, the answer or the reason.

Tests: `api/src/modules/suites/a-question-about-leave-as-each-reader-reads-it.spec.ts` (Wairimu who decides, Aisha who asked, Grace an admin, Kamau a lead of another team, Miriam a colleague, Samuel declined with a reason, and Ask Groundwork for Aisha and Wairimu). All but the refusals and "a decline with no reason reads as before" fail on the old code. Two existing tests changed again, only to add `questions: []` to the exact board row they compare: `the-leave-board-as-each-reader-reads-it.spec.ts` and `whoever-the-rules-name-decides-as-each-reader-reads-it.spec.ts`.

## The leave rules an admin sets (3 October, decision 85, build step 8)

**An admin can now set kinds of leave, notice, blackout periods, who may take leave, documents needed, and whether HR is told. The person is told in their say-back when a rule applies, and whoever decides reads the same. With nothing set, nothing anybody reads changes** (this commit).

- **New routes `GET /suites/leave/rules` and `PUT /suites/leave/rules`, for an admin only** (anybody else: "Only an admin can set the leave rules."). Both answer `{ rules, said, hr }`. `PUT` takes any of:
  - `kinds`: `[{ name, days, noticeDays?, document?, documentAfterDays? }]`, up to 12. `days` is the days a year, or null for no set number. The first kind is the one taken when somebody does not say which. Given as null or `[]`, kinds are cleared.
  - `noticeDays` (calendar days, for all leave; a kind's own `noticeDays` replaces it for that kind), `blackouts: [{ from, to, why? }]`, `eligibleAfterDays`, `tellHr: 'approved' | 'every'`. Each given as null is cleared; each left out is kept.
  - Refusals, in full sentences, for example "Two kinds of leave have the same name. Give each kind its own name."
- **`said`**, for the Suites page under Leave requests, for example: "Each person has 21 days of annual leave a year." "Annual leave needs two weeks’ notice." "Sick leave has no set number of days." "Sick leave of more than two working days needs a sick note." "When somebody does not say which kind, Groundwork takes it as annual leave." "Nobody can take leave from Monday 14 December to Friday 18 December, because of the year-end stock count." "Leave can be taken once somebody has been here 90 days. Groundwork counts from the day they were added to your organisation." "Joy Mutua, who looks after HR, is told of each approved request, on the leave board." "A rule never stops a request. The person is told when one applies, before they send it, and so is whoever decides it." With nothing set: "There are no kinds of leave set, so every request is simply leave, and each person has 21 days a year." and "No notice, blackout periods or other rules are set, so Groundwork only checks the days left and who else is off. ..."
- **`GET /suites/rules/history`** now also lists "Grace changed the leave rules on 5 October." with details such as "This was added. Leave needs two weeks’ notice." and "This was taken away. ..."
- **The say-back in Ask Groundwork and in the setup conversation.** The kind is read from the person's words ("sick leave", "compassionate"), or else the first kind. The days left are of that kind, and not said for a kind with no set number. Each rule that applies comes before the question, which then asks "Shall I still send it to Wairimu?":
  - "You asked for annual leave from Thursday 8 October to Friday 9 October, which is 2 working days. You have 21 days of annual leave left this year, and Miriam is also off then. Annual leave needs two weeks’ notice, and this starts in three days. Shall I still send it to Wairimu?"
  - "You asked for sick leave from Tuesday 6 October to Friday 9 October, which is 4 working days. Miriam is also off then. Sick leave of more than two working days needs a sick note, so please have it ready. Shall I still send it to Wairimu?"
  - "... Nobody can take leave from Monday 14 December to Friday 18 December, because of the year-end stock count, and your days fall in that time. Shall I still send it to Wairimu?"
  - "... Leave can be taken once somebody has been here 90 days, and you have been here 34 days. Shall I still send it to Wairimu?"
  - After the yes: "I have sent your request for annual leave from ... to Wairimu. ..." (with no kinds set, "I have sent your leave request ..." as before). A rule never stops a request.
- **`GET /suites/leave/board`, each waiting request:** new `leaveKind` ("Annual leave", or null with no kinds) and `rules: string[]`, each rule that applies with the person's name, also in `said` after the stand-in: "Annual leave needs two weeks’ notice, and Aisha asked three days before it starts.", "Sick leave of more than two working days needs a sick note. Ask Aisha for it if you have not had it.", the blackout and the days here as above, with "Aisha's days" and "Aisha has been here". The first line of `said` names the kind ("Aisha asked for annual leave from ..."), and the days left are of that kind ("Aisha has 21 days of annual leave left."). In `off`, `kind` is the kind's key and a new `kindName` says it, when kinds are set; otherwise `kind` is "annual" as before.
- **HR told.** Whoever holds the HR duty (`PUT /suites/duties`, `hr`) may now open `GET /suites/leave/board`, as `reader: 'hr'` when they would not otherwise, and is served a new list `toldToHr: [{ id, name, startsOn, endsOn, status, kindName, said }]`: each approved request (or, with `tellHr: 'every'`, each request), from two weeks back on, for example "Aisha Otieno asked for sick leave from Tuesday 6 October to Friday 9 October, which is 4 working days." "Wairimu approved it." and the document line. Nobody else is served `toldToHr` (it is `[]`). As HR they read nothing in `waiting` or `off` that they did not read before. The record of who did what says "Groundwork told Joy, who looks after HR, on the leave board on 5 October." Nothing goes to HR's phone yet, because no approved template fits; please show the list on the leave board under a heading such as "Told to HR".
- **`GET /suites/leave/mine`:** new `kinds: [{ key, name, perYear, daysLeft }]` (empty with no kinds), and `leaveKind` on each request. With kinds set, `perYear` and `daysLeft` are the first kind's.
- **The kind never reaches the engine.** Who is away still reads dates only (decision 31), and nothing about a kind reaches a check-in, a report or a colleague.

**Before and after, with nothing set** (no rules row, or an empty one), proven in the spec:

| Reader | Before this change | After, with nothing set |
| --- | --- | --- |
| Aisha's say-back | "You asked for leave from Thursday 8 October to Friday 9 October, which is 2 working days. You have 21 days of leave left this year, and Miriam is also off then. Shall I send it to Wairimu to approve?" | The same, word for word, even when she says "sick leave". |
| Neema, 34 days here, in December | "... You have 21 days of leave left this year, and nobody else in Sales is off then. Shall I send it to Wairimu to approve?" | The same: no blackout, no notice and no first-90-days line. |
| The request kept | kind "annual" | kind "annual" |
| Wairimu's board | days left 21, "Aisha asked for leave from ...", "Aisha has 21 days left." | The same, with `leaveKind: null` and `rules: []`. |
| Who's off | `kind: 'annual'` | `kind: 'annual'`, no `kindName` |
| Joy, who looks after HR | refused the board, told nothing | refused the board, told nothing |
| Aisha's own leave | `{ perYear: 21, daysLeft: 21, requests }` | the same, with `kinds: []` |
| Grace, the admin | no leave rules to read | "There are no kinds of leave set, so every request is simply leave, and each person has 21 days a year." |

Tests: `api/src/modules/suites/the-leave-rules-as-each-reader-reads-them.spec.ts` (Grace the admin; Aisha and Neema asking; Wairimu who decides; Grace and Kamau on the board; Joy who looks after HR; Miriam a colleague). The say-back rows of the before and after table pass on the old code too, as they must; every other test fails on it. Two existing tests changed, only to add `leaveKind: null` and `rules: []` to the exact board row they compare: `the-leave-board-as-each-reader-reads-it.spec.ts` and `whoever-the-rules-name-decides-as-each-reader-reads-it.spec.ts`.

## A reply on WhatsApp during a check-in can be the answer to a question about your own request (3 October, decision 85, build step 7)

**When whoever decides a person's request has asked them a question, and the person has a check-in open on WhatsApp, their next reply no longer goes straight into the check-in. Groundwork asks once whether it is their answer, and acts only on their yes** (this commit). No route and no field on any screen changed. What the person reads on WhatsApp:

- Aisha, with a check-in open and Wairimu's question waiting, writes "Brian will cover it, and I will brief him on Friday." She reads: "Is this your answer to Wairimu's question about your leave?" Nothing goes into the check-in yet.
- She says yes: "I have sent your answer to Wairimu. Your leave request is still waiting for Wairimu to decide. Your check-in is still open, so carry on with it whenever you are ready." The answer goes through the same code as answering under her leave, so Wairimu reads it on her board ("Aisha answered on 6 October, “...”"), Grace reads it with both names, Wairimu is told it on WhatsApp, and the question waiting in Ask Groundwork is let go.
- She says no: her words go into the check-in, as they would have before. The same question is never asked about again on WhatsApp.
- Anything else: "Please reply yes or no. Is this your answer to Wairimu's question about your leave?"
- A greeting, "finish", a decision or a new request for leave, hours or spending is never taken for an answer. With no check-in open, her reply goes to Ask Groundwork, which says it back as her answer, as before.

**The message that tells her of the question changed** (inside the 24 hours): it ended "Open Groundwork to answer it." and now ends "You can reply here with your answer, or answer it in Groundwork. Your request is still waiting for Wairimu to decide."

Tests: `api/src/modules/whatsapp/an-answer-to-a-question-during-a-check-in.spec.ts` (Aisha on WhatsApp, on a fresh copy of the API for the yes) and `api/src/modules/suites/an-answer-sent-from-whatsapp-as-each-reader-reads-it.spec.ts` (Aisha, Wairimu who asked, Grace an admin, Miriam a colleague, through the real leave suite). Every test of the asking fails on the old code, where the reply went into the check-in. One existing test changed, only for the new last sentence of the WhatsApp message: `a-question-about-leave-as-each-reader-reads-it.spec.ts`.

## The spending rules an admin sets (3 October, decision 85, build step 9)

**An admin can now name categories of spending, say when a receipt or a quote is needed, and set more than one threshold by amount, each with its own approval steps. Groundwork asks only for what is missing. With nothing set, nothing anybody reads changes** (this commit).

- **New routes `GET /suites/spend/rules` and `PUT /suites/spend/rules`, for an admin only** (anybody else: "Only an admin can set the spending rules."). Both answer `{ rules, said }`. `PUT` takes any of:
  - `categories`: `[{ name, evidence?: 'receipt' | 'quote', evidenceAbove? }]`, up to 30. `evidenceAbove` unset means the evidence is always needed for that category.
  - `categoryCalled`: what a category is called when Groundwork asks, for example "project". Unset: "category".
  - `evidence`: `{ what: 'receipt' | 'quote', above }`, for any request above an amount.
  - `thresholds`: `[{ above, steps }]`, up to 5, each with its own steps chosen from the same rules as `PUT /suites/workflows` (`manager`, `departmentHead`, `budgetOwner`, `finance`, `hr`, `chiefExecutive`, `admin`). A request above two follows the higher one. Below the lowest, the approval steps are what they were.
  - Each given as null (or an empty list) is cleared; each left out is kept. Refusals are full sentences, for example "Two categories have the same name. Give each category its own name."
- **`said`**, for the Suites page under Spending and budgets, for example: "Each request to spend is for one category: Fuel, Travel and Equipment. When somebody does not say which, Groundwork asks “Which category is this for?” before it sends anything." "Spending on Fuel needs a receipt." "Spending on Equipment over KES 50,000 needs a quote." "Any request over KES 300,000 needs a quote." "A request to spend over KES 100,000 goes first to the person’s manager, and then to whoever looks after finance." With nothing set: "There are no categories set, so a request to spend is kept in the person’s own words."
- **`GET /suites/rules/history`** now also lists "Grace changed the spending rules on 5 October." with details such as "This was added. Spending on Fuel needs a receipt."
- **Ask Groundwork, the person asking** (and on WhatsApp after "Shall I treat this as a spending request?"):
  - The category is read from their words. When none is named: "Which category is this for? It can be Fuel, Travel or Equipment." (with `categoryCalled: 'project'`, "Which project is this for? It can be Atlas or Kisumu depot."). A reply naming none of them: "I could not find that among them. Which category is this for? It can be Fuel, Travel or Equipment. You can also say no, and I will not send it." A no: "I have not sent it. Nothing was kept."
  - The say-back: "You asked to spend KES 18,000 on fuel for Kisumu deliveries. It is for the category Fuel. Operations has KES 38,000 left for October, so that fits. Spending on Fuel needs a receipt, so please keep it for finance. Shall I send it to Fatuma to approve?"
  - Over a threshold, that amount and who decides each later step: "This is over KES 100,000, so Fatuma must approve it, and then Omar in finance." A quote: "Spending on Equipment over KES 50,000 needs a quote, so please have one ready for finance." A rule about evidence never stops a request.
- **`GET /suites/spend/board`, each waiting request:** new `category` (the category's name, or null) and `needs: string[]`, the evidence in full sentences for whoever reads the board: "Spending on Fuel needs a receipt." Served to exactly the readers who were served the request before. Whoever holds a duty named in a threshold's steps (Joseph for the Operations budget, Omar for finance) opens the board as `approver` and reads only what waits for them, as before.
- **`GET /suites/spend/mine`, each request:** new `category`.

**Before and after, with nothing set** (no rules row, or an empty one), proven in the spec:

| Reader | Before this change | After, with nothing set |
| --- | --- | --- |
| Kamau's say-back, KES 18,000 on fuel | "You asked to spend KES 18,000 on fuel for Kisumu deliveries. Operations has KES 38,000 left for October, so that fits. Shall I send it to Fatuma to approve?" | The same, word for word. No category is asked for. |
| Kamau's say-back, KES 150,000 | "... This is over KES 20,000, so Joseph must approve it. Shall I still send it to Joseph to approve?" | The same, word for word. |
| The request kept | `{ organizationId, userId, amount, what, team }` | The same, with nothing more. |
| Fatuma's board | the row, `where: 'It is waiting for you.'` | The same, with `category: null` and `needs: []`. |
| Kamau's own requests | "Your request to spend KES 18,000 for fuel for Kisumu deliveries is waiting for Fatuma." | The same, with `category: null`. |
| Grace, the admin | no spending rules to read | "There are no categories set, so a request to spend is kept in the person’s own words." |

Tests: `api/src/modules/suites/the-spending-rules-as-each-reader-reads-them.spec.ts` (Grace the admin; Kamau asking; Fatuma his manager; Omar in finance; Joseph who holds the budget; Miriam a colleague; a lead, a member and a guest refused the rules). The before and after rows pass on the old code too, as they should; every other test fails on it. Two existing tests changed, only to add `category: null` and `needs: []` to the exact board row they compare: `the-spending-as-each-reader-reads-it.spec.ts` and `the-person-named-for-large-spending-decides.spec.ts`.

## Ask a question about a request to spend, and a reason with a decline (3 October, decision 85, build step 9)

**Whoever decides a request to spend can now ask the person a question, and give a reason with a decline, exactly as for leave** (this commit).

- **New route `POST /suites/spend/requests/:id/question`** with `{ question }` (up to 1,000 characters). Only whoever decides it now, and only while it waits. Refusals as for leave: "Only the person who decides this request can ask about it.", "This request has already been decided.", "Write the question first." It answers with the spending board. Please put "Ask a question" beside Approve and Decline on the spending board.
- **New route `POST /suites/spend/requests/:id/answer`** with `{ answer }`. Only the person who asked to spend ("Only the person who asked to spend this can answer a question about it."). It answers with `GET /suites/spend/mine`.
- **`POST /suites/spend/requests/:id/decline` now takes an optional body `{ reason }`.** Please offer a box for it under Decline, saying the person will read it.
- **`GET /suites/spend/board`, each waiting request:** new `questions: string[]`, for whoever already reads it: Fatuma, who asked, reads "You asked Kamau on 5 October, “Is this for the Kisumu van or the Nairobi one?”" then "Kamau has not answered yet." or "Kamau answered on 6 October, “The Kisumu van, the front two are worn.”"; Grace reads "Fatuma asked Kamau on 5 October, “...”".
- **`GET /suites/spend/mine`, each request:** new `questions` ("Fatuma asked you on 5 October, “...”", then "You have not answered yet. You can answer it here or in Ask Groundwork." or "You answered on 6 October, “...”"), `questionWaiting: { id, question, askedBy } | null`, and `declinedBecause` ("Fatuma said, “We had one last week.”", or null), shown under "Fatuma declined your request to spend KES 4,000 for a team lunch."
- **Today, for the person only:** "Fatuma asked you a question about your request to spend KES 12,000 for tyres for the van.", detail "Fatuma asked, “Is this for the Kisumu van or the Nairobi one?” Your request is still waiting.", action "Answer it" to `/suite/spend`.
- **Ask Groundwork, for the person:** "Fatuma asked you about your request to spend KES 12,000 for tyres for the van, “...” I will send Fatuma your answer as you wrote it, “...” Shall I send it?" Yes: "I have sent your answer to Fatuma. Your request to spend is still waiting for Fatuma to decide." No: "I have not sent it. Fatuma’s question is still waiting for your answer, so write your answer here when you are ready, or answer it under your requests to spend."
- **WhatsApp, for the person in a check-in:** "Is this your answer to Fatuma's question about your request to spend?", as for leave.
- **Ask Groundwork and the WhatsApp reply, for the approver:** "decline Kamau's spending because we had one last week" is said back as "You are declining Kamau's request to spend KES 4,000 for a team lunch, and I will tell Kamau your reason, “we had one last week.” Is that right?", then "Kamau's request to spend KES 4,000 for a team lunch is declined now. I have let Kamau know, with your reason."
- **WhatsApp:** the question, the answer and the reason go as for leave (see `docs/whatsapp-templates.md`).
- **The record of who did what** (`GET /suites/spend/requests/:id/history`) gains the same sentences as leave, never the words.

Tests: `api/src/modules/suites/a-question-about-spending-as-each-reader-reads-it.spec.ts` (Fatuma who decides, Kamau who asked, Grace an admin, Wairimu a lead of another team, Omar in finance, Miriam a colleague; Ask Groundwork, WhatsApp and Today). All but "a decline with no reason reads as before" fail on the old code. Two existing tests changed again, only to add `questions: []` to the exact board row they compare: `the-spending-as-each-reader-reads-it.spec.ts` and `the-person-named-for-large-spending-decides.spec.ts`.

## Finance checks, codes, exports and pays an approved request to spend (3 October, decision 85, build step 10)

**Whoever looks after finance (the `finance` duty under `PUT /suites/duties`), and an admin, now work on approved requests to spend: check each one, record the budget line it is paid from, note the receipt or quote they have had, mark it paid with the day, and take the approved requests not yet paid away as a CSV or Excel file. The person reads where their request stands. There is no payment-system connection (decision 86, item 4)** (this commit).

- **New route `GET /suites/spend/finance`**, for whoever looks after finance and for an admin (anybody else: "Only whoever looks after finance, or an admin, can do this."). It answers `{ reader: 'finance' | 'admin', currency, toPay, paid, lines }`:
  - `toPay`: approved and not yet paid, oldest approval first. `paid`: paid in the last 60 days, newest first.
  - Each request: `{ id, name, team, amount, what, category, askedOn, approvedBy, approvedOn, evidenceNeeded, evidenceGiven, checked: { by, on } | null, code, paidOn, said }`. Only what is on the request itself; nothing else Groundwork knows about the person (decision 85).
  - `said`, in full sentences with "you" for the reader: "Kamau Njenga, in Operations, asked on 5 October to spend KES 12,000 for fuel for Kisumu deliveries." "It is for Fuel." "Fatuma approved it on 5 October." (with more than one approver: "Fatuma and Omar approved it. The last approval was on 6 October.") "It needs a receipt, and finance has not had it yet." "Nobody in finance has checked it yet." or "You checked it on 6 October." "It is paid from Operations fuel." "It has not been paid yet." or "It was paid on 6 October."
  - `lines`: budget lines to choose from (the spending rules' categories and the teams with a budget). Finance may also type its own.
- **New routes, each answering with the same view:** `POST /suites/spend/requests/:id/check`; `PUT /suites/spend/requests/:id/code` with `{ code }` (up to 80 letters; can be changed until paid); `POST /suites/spend/requests/:id/evidence` with `{ what: 'receipt' | 'quote' }` (only one the rules asked for); `POST /suites/spend/requests/:id/paid` with `{ on: 'YYYY-MM-DD' }` (only once checked, not a day still to come, not before it was asked). Refusals in full sentences, for example "Check the request before you mark it paid." and "Nobody checks or pays their own request. Somebody else in finance, or an admin, can." Please show these as buttons on each request in finance's view: "Check it", "Budget line", "We have the receipt" (or quote), "Mark paid", with a date.
- **New route `GET /suites/spend/finance/export?format=csv|xlsx`**: a file `requests-to-pay-2026-10-06.csv` (or `.xlsx`, a sheet "To pay", made with the `xlsx` library already in the product; no new dependency) of every approved request not yet paid. Columns: Request, Asked on, Asked by, Team, What it is for, Category, Amount, Currency, Approved by, Approved on, Checked by finance ("Omar, 2026-10-06" or "No"), Budget line, Receipt or quote needed, Receipt or quote given. Please offer "Download for payment (CSV)" and "(Excel)".
- **The record of who did what** (`GET /suites/spend/requests/:id/history`) gains: "Omar checked it for finance on 6 October.", "Omar recorded the budget line it is paid from on 6 October.", "Omar recorded that finance has the receipt on 6 October.", "Omar put it in a file of requests to pay on 6 October.", "Omar marked it paid on 7 October. It was paid on 6 October." Whoever looks after finance may now read the record of an approved request.
- **`GET /suites/spend/mine`, for the person:** new `paidOn` on each request, and `where` now says finance's part once it has happened: "Your request to spend KES 12,000 for fuel for Kisumu deliveries is approved by Fatuma. Omar in finance has checked it, and it is waiting to be paid." and then "Your request to spend KES 12,000 for fuel for Kisumu deliveries was paid on 6 October." Until finance has touched it, the sentence is as before.
- **Today, for whoever looks after finance only:** "Two approved requests to spend are waiting for you in finance.", detail "Two have not been checked yet." or "One has not been checked yet, and one is checked and waiting to be paid.", action "Open them" to `/suite/spend`. Never whose.

Tests: `api/src/modules/suites/finance-and-a-request-to-spend-as-each-reader-reads-it.spec.ts` (Omar who looks after finance, Grace the admin, Kamau who asked, Fatuma his manager, Joseph who holds the budget, Miriam a colleague, a guest; the CSV and Excel files; Today). Every test fails on the old code, where none of this existed. No existing test changed.

## A WhatsApp reply held for a yes or a no is never lost (3 October)

**When a person in a check-in on WhatsApp was asked "Shall I treat this as a leave request?" (or hours, or spending) or "Is this your answer to Wairimu's question about your leave?", and said neither yes nor no within ten minutes, their words were wiped by the next WhatsApp message anybody sent, and went nowhere. Now, at the person's own next message after the ten minutes, on whichever copy of the API reads it, their words go into the check-in they were held from, as a "no" puts them, and then the new message is handled as it always was** (this commit).

- **WhatsApp, for the person, before the reply to their new message:** "You did not answer my question within ten minutes, so I have added what you wrote earlier to your check-in: "I want leave on 20 October"" followed by the check-in's own reply to those words.
- **If that check-in has closed since:** "What you wrote earlier was not added to a check-in, because that check-in is no longer open. You wrote: "I want leave on 20 October". You can send it again in your next check-in, or write "ask" to send it to Ask Groundwork."
- While the person is in Ask Groundwork ("ask"), the words wait until they come back to the check-in.
- Nothing changes in the app's screens. The question about a leave answer is still asked only once.

Tests: `api/src/modules/whatsapp/a-reply-held-for-a-yes-or-no-is-never-lost.spec.ts`, each held on one copy and answered on a fresh copy after the ten minutes. Five of its six tests fail on the old code; "nine minutes on, nothing goes into the check-in yet" passes on both, as it should. No existing test changed.

## The time sheet rules, where you stand, and the billing file (3 October, decision 85, build step 11)

**An admin now sets the time sheet rules: who keeps a time sheet, how often hours are sent, the hours asked of each person a week, a cut-off day and time in Lagos time, and what is billable for each client or project. Who approves stays with the approval steps (`PUT /suites/workflows`, the one resolver). The person reads where they stand on Today, under their hours and in Ask Groundwork. An admin, or whoever looks after finance, takes the approved billable hours away as CSV or Excel. With nothing set, every reader reads exactly what they read before** (this commit).

- **New route `GET /suites/time/rules`**, for an admin only ("Only an admin can set the time sheet rules."). It answers `{ rules, said }`. `said`, with nothing set:
  - "Everybody in the organisation who is not a guest keeps a time sheet."
  - "Hours are sent each week."
  - "No number of hours is asked for each week."
  - "There is no cut-off."
  - "Every hour is billable, so the billing file holds every approved hour."
  - "A week of hours goes to the person’s manager, or else an admin. An admin changes who approves under the approval steps."
  - "Hours are for billing only. They never appear in anyone’s check-in report, their signals or a review."
  With rules set, for example: "People in Sales keep a time sheet, and so does Kamau Njenga. Anybody else may still give their hours.", "Each person is asked for 40 hours a week.", "The cut-off is Friday at 17:00, Lagos time, each week." (or "The cut-off is the last day of each month at 12:00, Lagos time."), "Hours on Internal are not billable.", "Hours on every other client or project are billable.", "A person can say that one entry is billable or not billable, and that entry follows what they said."
- **New route `PUT /suites/time/rules`**, for an admin, with any of `{ submitters: { teams: string[], people: userId[] }, every: 'week' | 'month', hoursAWeek: 1..80, cutOff: { day: 'friday' | 1..28 | 'last', time: 'HH:MM' }, billable: { clients: { [client]: boolean }, otherwise: boolean } }`. A part given as null is cleared; one left out is kept. Refusals in full sentences, for example "Give the hours asked of each person a week as a number from 1 to 80." and "Give the cut-off as a day and a time such as 17:00. ...". Please give Grace a form for these on the time sheets suite, with the `said` lines shown back before she saves.
- **The rules history** (`GET /suites/rules/history`) gains "Grace changed the time sheet rules on 7 October.", with "This was added. ..." and "This was taken away. ..." lines.
- **`GET /suites/time/mine`, for the person only:** new `standing: string | null`. Null with no rules, or when the rules do not ask this person. Otherwise, for example: "You have recorded 31 hours this week. You still need 9 hours by Friday at 17:00." After the cut-off: "You have recorded 31 hours this week. You still need 9 hours. The cut-off was Friday at 17:00, so please send them as soon as you can." When done: "You have recorded 40 hours this week. That is the 40 hours a week your organisation asks for." With a monthly time sheet it adds "Please send October's hours by Saturday 31 October at 17:00." With no hours yet: "You have not recorded any hours this week. ..." Please show it above the person's weeks.
- **Today, for the person only, while hours are still asked this week:** key `time-standing`, kind `look`, title the same sentence ("You have recorded 31 hours this week. You still need 9 hours by Friday at 17:00."), detail "Tell Groundwork your hours in your check-in or in Ask Groundwork. There is no grid to fill in.", action "See your hours" to `/suite/time`. Nobody else's Today ever has it; a lead in the same team reads only their own.
- **Ask Groundwork, for the person:** "How many hours have I logged this week?" (or "my hours", "my time sheet") answers the same sentence, then "You can tell me your hours here at any time, for example "I spent 3 hours on a client today"." With no rules, the question is answered as before.
- **The hours say-back, only when the rules say what is billable:** "Shall I log 3 hours on Internal for Wednesday 7 October and send it to Wairimu to approve? The hours on Internal are not billable." and, when the person says "not billable" of an entry, "... The hours on Naivas are not billable." Kept on that entry. With no billable rule the say-back is exactly as before.
- **New route `GET /suites/time/billing/export?format=csv|xlsx&from=YYYY-MM-DD&to=YYYY-MM-DD`** (both days optional; by default the last eight weeks to today), for an admin or whoever looks after finance ("Only an admin, or whoever looks after finance, can take the billable hours away as a file."). A file `billable-hours-2026-08-10-to-2026-10-07.csv` (or `.xlsx`, sheet "Billable hours") of approved weeks only, billable entries only, one line for each person, client or project and day. Columns: Client or project, Person, Day, Hours, Week of, Approved by, Approved on. Please offer "Download billable hours (CSV)" and "(Excel)" on the time sheets board for Grace, and for finance.
- **The record of a week** (`GET /suites/time/weeks/:weekOf/people/:personId/history`) gains "Grace put these hours in a file for billing on 7 October."
- **Unchanged:** the board for every reader, approving, the agreements, and who reads what. Hours never reach a check-in, a report, a signal or a review (decision 10).

**The before and after, with nothing set** (an absent rules row and an empty one, both tested):

| Reader | Before | After, with nothing set |
| --- | --- | --- |
| Aisha, her own hours | `{ weeks }` | `{ weeks, standing: null }`, the weeks the same |
| Aisha, say-back "I spent 3 hours on Internal today, not billable" | "Shall I log 3 hours on Internal for Wednesday 7 October and send it to Wairimu to approve?" | The same, kept with no billable mark |
| Aisha, "How many hours have I logged this week?" | not answered from the time sheet | The same |
| Aisha, Today | no line about her hours | The same |
| Wairimu, the board | Aisha's row, "They are waiting for you." | The same |
| Grace, the billing file | did not exist | every approved hour, Internal too |

Tests: `api/src/modules/suites/the-time-sheet-rules-as-each-reader-reads-them.spec.ts` (Grace the admin; Aisha in Sales; Kamau in Operations, not asked; Wairimu who approves; Omar in finance; a guest; the CSV and Excel files; Today and Ask Groundwork). No existing test changed.

## This week's hours drafted from the record (3 October, decision 85, build step 11)

**A person can ask Ask Groundwork to draft their week's hours ("Can you draft my hours for this week?", "draft my time sheet"). Groundwork reads only that person's own record this week (check-in sessions they took part in, commitments they kept, and the work-plan and Subject items they own that changed), matches each to a client or project on the list, and shares out the hours the rules ask a week. It says what it found, the draft and where the hours came from, and only the person's yes sends it. Hours stay for billing only: the draft feeds no judgement, report or pattern about the person (decision 10)** (this commit).

- **Ask Groundwork (and WhatsApp's Ask Groundwork), for the person only**, for example:
  - "I have enough to draft this week's hours. Here is what I found."
  - "On Monday 5 October, the record shows your check-in "Naivas Ngong Road install" and the commitment you kept, "Send Lakeside the service report"."
  - "This is the draft." then "I put 4 hours on Naivas and 4 hours on Lakeside for Monday 5 October."
  - "I gave each day 8 hours, from the 40 hours a week your organisation asks for, shared equally between the clients and projects the record shows that day. The record does not say how long anything took, so please check each line."
  - "I could not tell which client or project your check-in "Sales team" on Tuesday 6 October was for, so it is not in the draft."
  - "Change anything that is wrong before you send it. You can tell me, for example "6 hours on Naivas on Monday", or "remove Naivas on Monday"."
  - "Shall I log these hours and send them to Wairimu to approve?"
- **A change** is said back with the whole draft: "I have changed the draft. This is it now." and the lines again. A change that cannot be read: "I could not tell which line to change. ...". **Yes:** "I have logged 18 hours for this week and sent them to Wairimu to approve. They are not approved until Wairimu decides, and you will see them under your hours." **No:** "I have not sent the draft. Nothing was kept."
- **Not enough to draft:** "I found this on your record for this week, but not enough to draft your hours.", what was found, then why ("I cannot draft the hours. The record does not say how long anything took, and your organisation has not set the hours asked a week." or "You have already given hours for each of those days, so there is nothing more to draft."), then "Tell me the hours instead, ...". Nothing found: "I could not find anything on your record for this week to draft your hours from. ..."
- **No new route and no new field.** The draft is a parked proposal until the yes; on the yes the hours are the same `time_entries` as hours said in chat, and reach the approver's board, Today and WhatsApp exactly as those do. Nothing on the boards, reports or Today changes.
- **Not built, waiting for Hafsah:** the manager's "hours against the planned work and what was delivered" from decision 85, against decision 10.

Tests: `api/src/modules/suites/a-week-drafted-from-the-record-as-each-reader-reads-it.spec.ts` (Brian drafting, changing a line, removing one and saying yes; his no; Wairimu's board after; Aisha's record never in Brian's draft; Aisha with every day already given; Kamau with nothing found; the suite off; a scan that keeps the draft out of every module but the suites and Ask Groundwork). Every test fails on the old code, where none of this existed. No existing test changed.

## One borrower's circumstance never reaches another, with or without a name (3 October, decision 75, item 14)

**On run-25's loans check-in, where borrowers do not see each other, Sunday read other borrowers' circumstances without their names: "One participant's tricycle was stolen in the fourth month, halting that business." in his shared picture and its lines, "for another person, the problem was not just a delay in income but that the business asset itself was never delivered" in his own guide, and on his board, under what the borrowers already have, "A tricycle business that has generated enough revenue to make all repayments on time." and "A borehole pump business that earns roughly N25,000 a week selling water to households and small businesses." With eight borrowers and two tricycles, each points at one man. The wall where every report and board read is served now also takes these out for a participant where people do not see each other** (this commit).

- **A sentence is taken out** when it speaks of one other person without a name: "one participant", "another participant", "a single borrower", "the other recipient", "that participant", "a team member", "one of the borrowers", "another person's", "for another person". Plural words stay ("five participants", "most borrowers", "other participants"). The product's own sentences stay: "Each one is backed by what another person said, a document, or a record." and "the work could come to depend on one person".
- **A row said by one other person alone is taken out**, whatever its words: any list row whose `said` is `{ who: [], howMany: 1 }` or names one of the others. Rows said by several people stay. The reader's own row ("You") stays, and so does the lead's.
- **Sunday now reads,** in his shared picture: "All nine people have answered." ... "For most participants, the asset-based business is operating and generating revenue, though for many there was a delay of several weeks or months before income started. Several are now making payments but are behind on repayments from the initial period." Under what the borrowers already have: "A grinding business that earns approximately N45,000 weekly from around 40 customers." (his own) and "A team of field officers and a system for collecting repayment data." (Amaka's). Under what matters, "Grinding machine" and "Tricycle" (each said by two), not "Freezer" (said by one). His guide keeps its opening line and its question; the sentence about another person is gone, so `toAcknowledge` can be an empty string. Please hide an empty `toAcknowledge`.
- **Amaka, who runs it, and an admin** read everything as before. Where the lead lets people see each other, a participant reads it as before.

Tests: `api/src/modules/reports/one-persons-circumstances-stay-their-own.spec.ts`, four new tests built from run-25's own sentences through the report door, as Sunday, Amaka and an admin, and one over run-25's served report and board. Two fail on the old code (Sunday's read and the run-25 read). No existing test changed.

## The Blockers tile names only your own waits where people do not see each other (3 October, decision 75, items 14 and 46)

**On run-25's loans check-in, Sunday's header said nothing was in his way, and the Blockers tile under it read "Work is held up by the grinding machine, which waits on the supplier.": Musa's wait, not his. The tile now counts and names only the reader's own waits (what they wait on, and what waits on them) wherever the header does: a participant where people do not see each other, and anybody on an evaluation check-in who does not run it** (this commit).

- **Sunday now reads:** Blockers, "None", with the tile's own words for nothing named. With a wait of his own, he reads that one: "Work is held up by the spare blades, which waits on the field officer."
- **Amaka, who runs it, and an admin** read the team's waits, as before: "Work is held up by the grinding machine, which waits on the supplier."
- The same rule on the session report's tiles and on the board's. No field changed shape.

Tests: `api/src/modules/reports/what-this-session-holds.spec.ts` (three new, as Sunday, Amaka and an admin, with run-25's wording) and `api/src/modules/board/the-blockers-tile-is-the-readers-own-where-people-see-only-themselves.spec.ts` (four, on the served board, as Ngozi, Femi, Bisi and Juma, with people kept apart). The harness can now answer the waits a tile reads on their own, only for a spec that asks (`waitsAreReadOnTheirOwn`), so every earlier board spec reads the board it always read. Three of the new tests fail on the old code. No existing test changed.

## A review reads the record, and the person corrects each line (3 October, decision 85, item 4, build step 12)

**When the writer starts a review, Groundwork now reads the record for the review's period and keeps what it understands: what the person worked on (the check-ins they completed, the goals they own in a check-in, the work-plan items they own), what they committed to, what was finished, what was dropped, what took longer than first said, and what they said was holding them up. It is built from rows only, without a model, so `noticedPromptVersionId` stays empty. It never reads hours or leave. The person can mark any line as wrong and say what is true; the correction is kept beside the line, and the record is not changed** (this commit).

- **New field on `GET /suites/reviews/:id`, for every reader:** `record`, null for a review started before this existed. Otherwise `{ intro, whoReads, parts, mayCorrect }`. `parts` is a list of `{ part, heading, lines }`, in this order and only when it has lines: `worked-on`, `committed`, `completed`, `changed`, `delayed`, `blocked`. Each line is `{ key, says, correction }`, and `correction` is `{ said, whatIsTrue }` or null.
- **New route:** `POST /suites/reviews/:id/lines/:key/correction` with `{ text }`, for the person only. Put the key through `encodeURIComponent` (keys hold a colon, for example `commitment:<id>`). It returns the review as `GET` does. Refusals: "Only the person this review is about can correct what it says about their work.", "That line is not in this review." and "Say what is true, in a sentence or two."
- **The period** runs from the day the person's previous review started, or else back from the start by the organisation's "How often?" answer (6 months when it says no number), to the day this review started.
- **Who reads which line.** The person reads every line. Anybody else who may open the review reads a line only when they are in that check-in, or run it, because each person's load across check-ins is private (decision 4). A goal is read only by whoever runs that check-in, since a colleague may see only their own target (decision 50). A work-plan item is not from a check-in, so everybody who may open the review reads it. A goal that is a decision about a person (decision 46) and a commitment pasted in by the lead are never read.

Aisha, the person, reads (Wairimu runs "Sales team, Q3"; Kamau runs "Supplier review", which Wairimu is not in):

| Part | What Aisha reads |
| --- | --- |
| Intro | "This is what Groundwork understands from the record about your work between 1 April 2026 and 1 October 2026. It comes from your check-ins, the goals and work-plan items you own, what you committed to and how each one went, and what you said was holding you up. If a line is wrong, mark it and say what is true. Your correction is kept beside the line, and the record itself is not changed." |
| Who reads | "Wairimu reads your corrections and your own view before you meet. Lines from check-ins that Wairimu is not in stay with you, and so does anything you say about them. If you want Wairimu to know, put it in your own view." (the last two sentences only when such lines exist) |
| What you worked on | "You checked in 3 times in “Sales team, Q3”, which Wairimu runs, between 6 April 2026 and 28 September 2026." / "You checked in once in “Supplier review”, which Kamau runs, on 10 June 2026." / "You own the goal “New supermarket accounts” in “Sales team, Q3”. On 28 September 2026, it stood at 5, against a target of 4." / "You own “Supermarket accounts in Nairobi” in the work plan. It is due on 31 December 2026. Its status in the work plan is “In progress”." |
| What you committed to | "In “Sales team, Q3”, you made 5 commitments between 6 April 2026 and 28 September 2026. Of these, 2 were done, 1 was not done, 1 was dropped and 1 was still open when this review started." / "In “Supplier review”, you made 1 commitment on 10 June 2026. It was done." |
| What you finished | "On 6 April 2026, in “Sales team, Q3”, you said, “I will call Naivas about the freezers.” It was done on 20 April 2026." |
| What was dropped along the way | "On 1 June 2026, in “Sales team, Q3”, you committed to open a second butchery account. It was dropped later." |
| What took longer than first said | "On 4 May 2026, in “Sales team, Q3”, you committed to send the price list to Carrefour. It was marked as not done on 18 May 2026." / "On 4 May 2026, in “Sales team, Q3”, you committed to visit Quickmart on Ngong Road. You said it again in 2 later check-ins. It was done on 1 June 2026." |
| What you said was holding you up | "On 6 April 2026, in “Sales team, Q3”, you said you were waiting on Operations for the freezers for the first customers. It cleared on 27 April 2026." / "On 10 June 2026, in “Supplier review”, you said you were waiting on Kamau for the delivery dates. It was still open when this review started." |
| Her correction, beside the line | `said`: "You marked this as wrong on 1 October 2026, and said what is true." `whatIsTrue`: her words. |

Wairimu, who writes it, reads the same lines from "Sales team, Q3" and the work plan only, with Aisha's name ("Aisha checked in 3 times in “Sales team, Q3”, which you run, ...", "What Aisha said was holding the work up", "On 6 April 2026, in “Sales team, Q3”, Aisha said the work was waiting on Operations for the freezers for the first customers. ..."), her intro is "This is what Groundwork understands from the record about Aisha’s work between 1 April 2026 and 1 October 2026, from the check-ins you are in. Aisha reads it too, and can mark any line as wrong and say what is true.", and beside a corrected line "Aisha marked this as wrong on 1 October 2026, and said what is true." `whoReads` is null and `mayCorrect` false. Grace (an admin) and Juma (another lead of Sales), in neither check-in, read only the work-plan line. Somebody in no check-in with the person reads "You are not in any check-in with Aisha between ..., so nothing from the record is here for you. ...". With nothing in the record at all: "Groundwork found nothing in the record about your work between ...". Miriam, a colleague, and a lead of another team are refused the review, as before.

- **The review's history** (`GET /suites/reviews/:id/history`) gains one sentence when the person corrects a line, never which line or the words: "Aisha marked a line of the review as wrong, and said what is true, on 3 October 2026."
- **Migration** `20261004000000_a_review_reads_the_record_and_the_person_corrects_it` (docs/deploy.md).

Tests: `api/src/modules/suites/the-record-in-a-review-as-each-reader-reads-it.spec.ts` (Aisha, Wairimu, Grace, Juma, Miriam and Kamau; a correction kept beside the line; one that stays with Aisha; who may correct). Every test fails on the old code, where none of this existed. One existing test changed: `the-reviews-as-each-reader-reads-them.spec.ts` pins the person's whole review with `toEqual`, so it now includes `record: null` for a review started before the record was read.

## "Their documents" are the customers', not a colleague's (3 October)

**On run-25's sales check-in, Femi waited on the customers for "their documents, especially the bank statements". Every reader read "A colleague's documents, especially the bank statements" at the top of the board, and "Work is held up by a colleague's documents, especially the bank statements." on the Blockers tile: an owner nobody named. "Their" now becomes a colleague's only where the row says a person in the check-in is waited on (`onParticipantId`); otherwise it is said as whoever the row waits on, or left as the person said it. "Her" and "his" read as before** (this commit).

- **Bisi, Femi, and an admin now read** at the top (`howItIsGoing.glance.inTheWay.oldest`): "the customers' documents, especially the bank statements", and on the tile: "Work is held up by the customers' documents, especially the bank statements."
- The list of check-ins and Today take the same line, from the same place.

Tests: `api/src/modules/board/their-documents-are-not-a-colleagues.spec.ts`, on the served board as Bisi, Femi, Ngozi and an admin, and the rule itself. The four board tests fail on the old code. No existing test changed.

## "On-the-ground" stays whole (3 October)

**Run-25 served "on, the-ground" 31 times, to every reader: "Amaka Nwachukwu relies on a team for on, the-ground communication." and "The role of on, the-ground support is seen differently." The rule that turns a hyphen doing a dash's job into a comma looked at two parts only, and "the" opens a clause. A compound of three or more parts is now left whole (on-the-ground, like-for-like, word-for-word, back-and-forth, free-for-all), and so are a few two-part ones (know-how, to-do, must-have, either-or). A range between two numbers with an en dash, which became a comma ("10, 12 shops"), now reads "10 to 12 shops"** (this commit).

- **Amaka reads:** "You rely on a team for on-the-ground communication." **Sunday and an admin read:** "Amaka Nwachukwu relies on a team for on-the-ground communication."
- **The payments project reads:** "a like-for-like swap to a new gateway", where it read "a like, for-like swap".
- A hyphen between two clauses is still a comma: "the cost per delivery is down, for example, under 500".

Tests: `api/src/modules/reports/a-hyphen-doing-a-dashs-job.spec.ts`, eight new, three of them through the report door as Amaka, an admin and Sunday. Seven fail on the old code. No existing test changed.

## The manager's briefing for a review (3 October, decision 85, item 4, build step 13)

**`GET /suites/reviews/:id` now carries `briefing` for every reader who may open the review and is not the person it is about. It holds the counts (decision 86, item 2), the person's patterns after their turn with their answer beside each (decision 86, item 1), what changed after earlier conversations, and the person's corrections from the record (build step 12). It is built from the record, never by a model, and never holds a verdict, a label, a score or a rating. "Groundwork suggests recognising" is unchanged and stays behind its setting** (this commit).

- **The field:** `briefing: { heading, counts, patterns, patternsNote, changedAfterEarlierConversations, corrections, whoDecides }`. `counts` is a string or null. `patterns` is a list of `{ heading, whatHappened, howOften, checkIn, theirAnswer }`. `patternsNote` is a string when there are patterns, else null. `changedAfterEarlierConversations` is a list of sentences. `corrections` is a list of `{ line, said, whatIsTrue }`. The person's own review has no `briefing` key.
- **Each reader reads only what they may already read.** The counts and corrections come only from check-ins the reader is in (the lines of the record they read), the patterns only from check-ins they run, through `servedPatterns`, after the person has answered or after the usual 3 or 7 days. The lead's own mark on a pattern, "Two separate reads of the record found this." and the coaching lines are not in the briefing.

Wairimu, who writes Aisha's review and runs "Sales team, Q3", reads:

| Part | What Wairimu reads |
| --- | --- |
| `heading` | "Your briefing for Aisha’s review" |
| `counts` | "In the check-ins you are in with Aisha, Aisha made 5 commitments between 6 April 2026 and 28 September 2026. Aisha kept 2 of them, 1 was not done, 1 was dropped and 1 was still open when this review started. Of them, 2 took longer than first said, because they were not done, or Aisha said them again in a later check-in." |
| A pattern | heading "Problems are mostly put down to things outside the team", whatHappened "Aisha put the missed orders down to the stock arriving late.", howOften "This came up in 3 check-ins, in sessions 2, 3 and 4.", checkIn "Sales team, Q3", theirAnswer "Aisha’s answer: “The stock came three weeks late, so I could not sell.”" (the prototype's words; unanswered, "Aisha hasn’t answered this yet.") |
| `patternsNote` | "These only appear after three check-ins. Aisha sees them first and can answer, and they never go anywhere on their own." |
| `changedAfterEarlierConversations` | "You talked with Aisha about “Problems are mostly put down to things outside the team” on 25 September 2026. It came up again in 1 check-in after that." (or "It has not come up since.") and "You decided Aisha’s review on 15 March 2026. The decision was “Aisha leads the butchery accounts.” The reason given was “She closed every butchery sale she was given.”" |
| A correction | line "On 4 May 2026, in “Sales team, Q3”, Aisha committed to send the price list to Carrefour. It was marked as not done on 18 May 2026.", said "Aisha marked this as wrong on 1 October 2026, and said what is true.", whatIsTrue her words |
| `whoDecides` | "There are no scores. Groundwork gives you the evidence and the patterns, and you decide. Aisha sees your reasons." |

Grace (an admin) and Juma (another lead of Sales), in and running no check-in with Aisha, read heading "The briefing for Aisha’s review", `counts` null, no patterns, no corrections, the earlier review said with "Wairimu decided Aisha’s review on 15 March 2026. ...", and "There are no scores. Groundwork gives the evidence and the patterns, and Wairimu decides. Aisha sees the reasons." Aisha, a colleague and a lead of another team: unchanged (no briefing; refused).

Tests: `api/src/modules/suites/the-briefing-for-a-review-as-each-reader-reads-it.spec.ts` (Wairimu, before and after Aisha's three days; her corrections; Grace; Juma; Aisha; Miriam; Kamau; no labels; patterns only through `servedPatterns`). Every test fails on the old code, where there was no briefing. The fixture both review specs use moved to `api/src/modules/suites/__fixtures__/aisha-review.ts`. No existing test changed.

## A review's record, read against the local test database (3 October, build steps 12 and 13)

**Served against the local test database, the record read for a real person said "a target of 36000000", "“Disburse N36 million.” in", "Of these, 11 were still open", "which Dr runs", "“I will do that.”" and "waiting on Amina for a meeting with Amina". Each is fixed where the sentence is made** (this commit).

| Before | After |
| --- | --- |
| "You own the goal “Disburse N36 million.” in “Credit sales against this quarter target”. On 30 September 2026, it stood at 0, against a target of 36000000." | "You own the goal “Disburse N36 million” in “Credit sales against this quarter target”. On 30 September 2026, it stood at 0, against a target of 36,000,000." |
| "... you made 11 commitments between 29 September 2026 and 30 September 2026. Of these, 11 were still open when this review started." | "... All of them were still open when this review started." |
| "You checked in 4 times in “Engagement Director, first 90 days”, which Dr runs, ..." | "... which Amina runs, ..." (a title is never a first name) |
| "On 1 October 2026, in “...”, you said, “I will do that.” It was marked as not done on 1 October 2026." | Left out: a promise of two words or fewer after "I will" means nothing outside its check-in. It is still counted. |
| "... you said you were waiting on Amina for a meeting with Amina. ..." | "... you said you were waiting for a meeting with Amina. ..." |

In the briefing's counts, when every commitment was kept: "Aisha kept all of them."; when none was settled: "None of them was settled before this review started."

Tests: four more in `api/src/modules/suites/the-record-in-a-review-as-each-reader-reads-it.spec.ts`, built from those rows. Each fails on the code before this commit.

## What the room is about, and the aims, as each reader reads them (3 October)

**Run-25 served the room's read (`whatTheRoomIsAbout`) the same to every reader, as it was stored with names, and left rows a wall had emptied. Four aims named the reader where "you" belongs, across sales, cofounder and drift. Among the board's aims (`objectives`), Kwame's own words were glued onto a sentence about him, and one of Femi's commitments was listed as an aim** (this commit).

- **`whatTheRoomIsAbout.aims[].aim`, said to the reader.** Femi now reads "You are trying to get twelve approved facilities by collecting as many strong applications as possible." (was "Femi Okonkwo is trying to ..."). Tunde reads "You are responsible for and will run the product and engineering sides of the business." Zainab reads "You are worried that you will be measured on targets that you have not been able to work on." (was "Zainab Suleiman is worried that she will be measured on targets that she has not been able to work on."). Whoever runs it, and an admin, read the names as before.
- **No empty rows.** A row whose aim a wall emptied for this reader (`{ "aim": "", "held": ["Kwame Mensah"] }`) is no longer sent.
- **`held` and `named` say "You" for the reader**, first in the list: `["You"]`, `["You", "Ada Nwosu"]`. Please show "You" as the reader's own chip, as you already do for `said.who` in what the answers say.
- **Kwame's own aim, on Bisi's board:** "Kwame Mensah's own aim is 42 million naira." (was "Kwame Mensah's own aim is 42 million naira, and I'm aiming to achieve that by the end of the quarter."). Kwame reads "Your own aim is 42 million naira."
- **A promise is not an aim.** "Femi Okonkwo will follow up with the customers to get five bank statements. Femi Okonkwo set this aim." is no longer in `objectives` or in Femi's `yourShare`, for anybody. It stays where it belongs, as his commitment, in `whoOwnsWhat` and the work plan. Only a stored aim that opens with somebody promising an action ("I will follow up", "I'll call", "we are going to visit") is left out; "I will get 12 shops" is still an aim.
- **No number said twice.** "Your own aim is 12 twelve approved facilities this quarter." now reads "Your own aim is twelve approved facilities this quarter."

Tests: `api/src/modules/board/the-room-and-the-aims-as-each-reader-reads-them.spec.ts`, on the served sales board as Femi, Kwame, Bisi and an admin, and the room in cofounder and drift as Tunde, Zainab and Nadia. The harness can now carry the room's stored read (`room`). No existing test changed.

## The Movement tile says plainly when a change will show (3 October)

**"13 targets are set, and no round has closed to measure from." was work jargon. The Movement tile's line (`quickRead[].sub` where `label` is "Movement", on the board and the session report) now reads, for every reader** (this commit):

- "13 targets are set. Any change in them will show here after the next check-in."
- "1 target is set. Any change in it will show here after the next check-in."
- "3 targets are set, and 1 of them has a number. Any change in it will show here after the next check-in."
- Unchanged: "1 target is set, and it has no number to measure from." and "2 targets are set, and none of them has a number to measure from."

**For the screens:** `client/src/components/gw/TheSessionsReport.tsx` (around line 393) matches the old sentence to rewrite it; it no longer matches, so the line falls to your own fallback, which reads "Nothing has moved yet. 13 targets are set. Any change in them will show here after the next check-in." Please drop the old pattern (and its cases in `at-a-glance-tile-is-a-sentence.spec.ts`) when you next touch it.

Tests: two existing tests changed, because they pinned the old wording: `api/src/modules/board/request-111-a-wait-on-oneself-and-the-targets-set.spec.ts` and `api/src/modules/reports/what-this-session-holds.spec.ts`. Both now also check that "round" and "measure from" are gone.

## One wait said three ways is said once (3 October)

**Run-25, sales, session 3: Femi's own coaching (`coaching.beforeNextTime`, served to Femi only) read "Put their documents, especially the bank statements, the bank statements from the customers and the three remaining bank statements in writing, with the date you need them by." Bisi's "what to ask" for Femi read "Femi Okonkwo has been waiting for their documents, especially the bank statements, the bank statements from the customers and the three remaining bank statements since 2 October". The same thing, recorded three times in other words. A wait whose own words are all in a wait said before it is now that wait again, and is said once** (this commit).

- **Femi now reads:** "Put their documents, especially the bank statements in writing, with the date you need it by."
- **Bisi now reads:** "Femi Okonkwo has been waiting for their documents, especially the bank statements since 2 October, and nothing on record says it was raised higher. ..."
- Two different things that share a word stay two: "the signed contract and the contract template from legal".

Tests: `api/src/modules/reports/item-18-each-wait-under-whoever-holds-it.spec.ts`, three new, for Femi's coaching and Bisi's probe. Two fail on the old code. No existing test changed.

## A name is said once in a sentence about that person (3 October)

**Run-25 had 406 sentences that said one name twice, up from 362, mostly in the lead's report. The report is stored in labels, and a label has no pronoun, so the model repeats it. Where names are put in for each reader, a sentence that opens with a person doing something now says that person's name once in two shapes, and two lines the product builds itself now say the name once** (this commit).

- **A joined clause about the same person loses the name.** Nadia read "Zainab Suleiman has not been able to work on this since February and Zainab is worried about being measured on it." She now reads "Zainab Suleiman has not been able to work on this since February and is worried about being measured on it." Likewise "Tomi feels no longer trusted with the more challenging work, and thinks Daniel is taking those tickets." Not where somebody else is named first.
- **The same person as an owner is "their own", once, then "the".** "Grace Oyelaran took a loan to get a freezer for Grace's business." now reads "... for their own business." "Musa says it is not Musa's job to get the machine" now reads "Musa says it is not their own job to get the machine". No "he" or "she" is ever guessed.
- **Every person's history on the board (`personHistory[].says`):** "Kwame Mensah has answered 1 session, and the record holds no commitment from Kwame Mensah yet." now reads "Kwame Mensah has answered 1 session, and has made no commitment on record yet." The person's own: "You have answered 1 session, and have made no commitment on record yet."
- **The lead's conversation point about a goal not told:** "Zainab Suleiman has not been told about this goal yet, so talk it through with Zainab Suleiman before reading anything into it." now reads "Zainab Suleiman has not been told about this goal yet. Talk it through together before reading anything into it."
- **Still said twice:** a person's name after "says" or "thinks" ("Musa says Musa never received the grinding machine"), and a sentence that opens with an owner ("Tunde's understanding is that Tunde will ..."). These can only be said once with "they" or "he" or "she"; that choice is Hafsah's. Over run-25's served text, the count I measure falls from 459 sentences to 275 (my count, not the scorer's).

Tests: `api/src/modules/reports/a-name-said-once-in-a-sentence-as-each-reader-reads-it.spec.ts`, through the report door as Nadia, an admin and Zainab, and the rule itself. Five existing tests changed, each because it pinned a name said twice that is now said once: `reports/you-takes-its-verb-in-your-own-report.spec.ts` ("..., and identifies Westgate Deli as the next one."), `reports/every-line-is-read-before-it-is-kept.spec.ts` ("Nathan Owusu says their own goal is ..."), and the conversation point in `grounds/a-goal-not-told-stays-with-the-lead.spec.ts`, `reports/the-judgement-and-a-goal-not-told.spec.ts` and `suggestions/suggestions-as-each-reader-reads-them.spec.ts`.

## An aim said as work under way names the person once (3 October)

**Bisi read among the aims "Femi Okonkwo is working on getting twelve approved facilities this quarter. Femi Okonkwo set this aim." A person's own aim said as work under way ("I'm working on getting ...", "I'm trying to reach ...") is now read for the thing aimed for, like "I am aiming for ..."** (this commit).

- **Bisi and an admin read:** "Femi Okonkwo's own aim is twelve approved facilities this quarter." **Femi reads:** "Your own aim is twelve approved facilities this quarter." (`objectives[].name`, and Femi's `yourShare`).

Tests: one new test in `api/src/modules/board/the-room-and-the-aims-as-each-reader-reads-them.spec.ts`, as Bisi and Femi. No existing test changed.

## What the room is about, where people do not see each other (3 October)

**Decision 75, item 14. The room's read (`whatTheRoomIsAbout`) is stored with names and never went through the report's wall for people who do not see each other. On a check-in with the people kept apart, once the team's picture was shared, a participant read another person's aims and circumstances with their name: "Musa Danjuma wants the grinding machine he was promised to be delivered.", held by `["Musa Danjuma"]`, and a place and a thing each named by one other person. On the loans cohort itself nothing leaked, because a cohort's board has no room section; it leaked on every other kind of check-in whose board has one, where the lead keeps people apart** (this commit).

For a participant where people do not see each other (never the lead, the admin who set it up, or an admin):

- **A row held or named by one other person alone is not sent.** Aims, places and things alike.
- **The reader's own rows stay**, said to them: "You are trying to catch up on the three repayments you missed." with `held: ["You"]`.
- **Rows several people hold or named stay**, with the other people's names taken out of `held` or `named` and said as a count in a new field, `andOthers`: `{ "aim": "The borrowers want the first repayment to start once the asset earns.", "held": ["You"], "andOthers": 2 }`, `{ "name": "repayment schedule", "named": [], "andOthers": 2 }`. Please show it as "You and 2 others" or "2 people". `andOthers` is only sent when there are others to count.
- **The lead's rows stay, with the lead's name**, as in the report: `{ "aim": "The programme should learn when each asset starts earning.", "held": ["Amaka Nwachukwu"] }`.
- **A sentence in a kept aim that names one of the others is taken out**, and the row goes if nothing is left.

The lead and admins read the room exactly as before, with every name. Where people see each other, nothing changes.

Tests: `api/src/modules/board/what-the-room-is-about-where-people-do-not-see-each-other.spec.ts`, on the served board as Sunday, Amaka and an admin, with run-25's loans people. No existing test changed.

## "Waiting on the customers", not "waiting on The customers" (3 October)

**Run-25, sales: Femi said he was waiting on "The customers", and the holder was kept with its capital, so every reader read "Femi Okonkwo is waiting on The customers for their documents", "On 30 September, Femi Okonkwo said the work was waiting on The customers ..." and "What they say is in the way sits outside this check-in, with The customers, and nothing on record says anybody has chased it." 47 times in the run. A leading "The", "A" or "An" in what somebody is waiting on is now said in lower case wherever it lands mid-sentence** (this commit).

- **Bisi and admins now read:** "Femi Okonkwo is waiting on the customers." and "Femi Okonkwo is waiting on the customers for their documents, especially the bank statements." **Femi reads:** "You are waiting on the customers." and "... sits outside this check-in, with the customers, and nothing on record says anybody has chased it."
- **The field `dependencies[].on` on the board** now carries "the customers" in lower case, as a holder said in the person's own words already did ("their own direct reports"). Where it opens a line, please give it its capital, as `holdsItSaid` does: "The customers hold it."
- **The same on the session report's Blockers tile** ("..., which waits on the customers"), Today's page ("waiting on the customers"), the record over time and the blocker trace ("This is waiting on the customers since ...").
- **A name keeps its capitals:** "The Gambia office", "The Body Shop" and "A Plus Logistics" are left as they are, because the word after the article has a capital.

Tests: `api/src/modules/board/a-holder-with-the-is-said-in-lower-case-mid-sentence.spec.ts`, on the served sales board as Bisi, Femi and an admin. No existing test changed.

## Setting up leave by talking to Ask Groundwork (3 October)

**Decision 85: an admin says "Set up our employee leave process" to Ask Groundwork. Groundwork asks only what is missing, one question at a time, says the whole of it back in plain sentences, and sets nothing until the admin says yes. On the yes it writes through the same `SuitesService` methods the Suites page uses (`switch`, `setDuties`, `setWorkflows`, `setLeaveRules`), so the rules history keeps it as that admin's change** (this commit).

- **A new lane in Ask Groundwork's reply, `set_up_a_suite`.** Every reply in this conversation carries it. The said-back reply also carries a `proposal` block, the same as every other say-back, so the screen can show yes and no.
- **The questions, in order, each only when it is not known yet:** "How many days of leave does each person have in a year?" (not asked when leave is already on), "Who approves annual leave?", "Does anybody approve it after the manager, for example the head of the person’s team? You can say no.", "Does HR need to see all requests?", "What happens if the manager doesn't respond within two working days?", then "Who heads Sales? You can say nobody yet." for each team that has nobody named, and "Who looks after HR? You can say nobody yet." when HR sees requests and nobody is named.
- **The first reply opens with:** "I will ask you a few questions about how leave requests work, one at a time, and I will not set anything until you say yes."
- **A person named for approving is set by the job they hold.** When they hold none, the admin reads: "I set who approves by their job, not by name, so it keeps working when people change jobs. Which job does Omar do here? For example, does Omar head a team, hold a team’s budget, look after HR, look after finance, or is Omar the chief executive?"
- **The said-back, for Hafsah's example:** "Here is how leave requests will work. Leave requests will be switched on. Each person has 21 days of leave a year. A leave request goes to the person’s manager first. When the manager has approved it, it goes to the head of the person’s team to approve as well. It is approved only when the head of the team approves it, and a no from anybody on the way ends it. If the person has no manager in Groundwork, it goes to the head of the person’s team instead. If nobody is named as the head of the person’s team, it goes to an admin instead. Wairimu heads Finance, Fatuma heads Operations, and Omar heads Sales. Grace, who looks after HR, sees every leave request on the leave board, when it is asked for and when it is decided. If the manager has not answered after two working days, or is on leave that day, it goes to the head of the person’s team. If the head of the team has not answered after two working days, or is on leave that day, it goes to an admin. Shall I set it up like this? Nothing changes until you say yes."
- **After the yes:** "I have set it up, and leave requests are switched on." then the same sentences, read back from what is stored, then "You can change any of it by telling me, or on the Suites page."
- **A no:** "I have not set up leave requests. Nothing has changed." **A change before the yes** ("make it three working days", "HR only needs to see the approved ones") is said back again, opening with "I have changed that.", and nothing is written. **"Stop" part way:** "I have stopped setting up leave requests. Nothing has changed."
- **Anybody who is not an admin** reads: "Only an admin can set up how leave requests work in your organisation, so I have not changed anything. If you would like it set up or changed, you could ask Grace, who is an admin here." Nothing is parked or written.
- **A different approver only for longer leave cannot be set yet.** The admin reads: "I cannot yet set a different approver only for longer leave. I can have somebody approve every leave request after the first person, or nobody. Who should approve it after them, if anybody? You can say no."
- **The Suites page, duties, approval steps and leave rules routes** serve what was set, exactly as if the admin had set it there. Nothing new is added to them.

Tests: `api/src/modules/assistant/leave-set-up-by-talking-as-each-reader-reads-it.spec.ts`, through the real AssistantService and SuitesService, as Grace (admin), Wairimu (lead) and Miriam (member). One existing test changed: `everything-is-offered-or-explained.spec.ts` gains a test pinning that the suites are now reached by asking (decision 85), because `suites` moved off the not-offered list.

## Setting up spending by talking to Ask Groundwork (3 October)

**Decision 85: "Set up our spending approvals" (or "the expenses process") now works like leave: only what is missing is asked, the whole of it is said back, and nothing is set until the admin says yes. On the yes it is written through `SuitesService.switch`, `setDuties` and `setWorkflows`, as the admin** (this commit).

- **The questions, in order, each only when it is not known yet:** "Which currency do people spend in?" (not asked when spending is already on), "Who approves a request to spend?", "Does anybody approve it after the manager, for example finance? You can say no.", then "Up to what amount does a request go this way? Above that amount, somebody else approves it." when there are two approvers, or "What is the most the manager may approve on their own?" when there is one, then "Who approves anything above KES 20,000?", "What happens if the manager doesn't respond within two working days?", and who holds each job the answers need ("Who looks after finance? You can say nobody yet.", "Who heads Sales? You can say nobody yet.", "Who is the chief executive? You can say nobody yet.").
- **The said-back, for up to KES 20,000 the manager then finance, above it the head of the team then the chief executive, passed on after three working days:** "Here is how spending requests will work. Spending requests will be switched on. People ask to spend in KES. A request to spend of up to KES 20,000 goes to the person’s manager first. When the manager has approved it, it goes to Omar, who looks after finance, to approve as well. It is approved only when Omar approves it, and a no from anybody on the way ends it. If the person has no manager in Groundwork, it goes to an admin instead. If nobody is named to look after finance, it goes to an admin instead. A request to spend of more than KES 20,000 goes to the head of the person’s team first. When the head of the team has approved it, it goes to Grace, the chief executive, to approve as well. It is approved only when Grace approves it, and a no from anybody on the way ends it. If nobody is named as the head of the person’s team, it goes to an admin instead. If nobody is named as the chief executive, it goes to an admin instead. Omar heads Finance, Fatuma heads Operations, and Wairimu heads Sales. If the manager has not answered after three working days, or is on leave that day, it goes to an admin. If Omar has not answered after three working days, or is on leave that day, it goes to an admin. If the head of the team has not answered after three working days, or is on leave that day, it goes to an admin. If Grace has not answered after three working days, or is on leave that day, it goes to an admin. Shall I set it up like this? Nothing changes until you say yes."
- **After the yes, a no, a change and somebody who is not an admin** read the same sentences as for leave, with "spending requests" in place of "leave requests". A change such as "make the limit 50,000" or "anything above that is approved by finance" is said back again before anything is written.
- **One stored value nobody is asked for.** The spending suite's own page still asks for one person who approves anything above the limit (`answers.above`). When spending is set up by talking, the steps above the limit replace that person entirely, so the person kept is the one already there, else whoever holds the first job the steps above name, else the admin who set it up. Nobody is told this person, because it never decides anything while the steps are set.
- **The Suites page, duties and approval steps routes** serve what was set, exactly as if the admin had set it there.

Tests: `api/src/modules/assistant/spending-set-up-by-talking-as-each-reader-reads-it.spec.ts`, as Grace (admin), Wairimu (lead) and Omar (member, who looks after finance). No existing test changed.

## Setting up time sheets by talking to Ask Groundwork (3 October)

**Decision 85: "Set up timesheets" now works like leave and spending. On the yes it is written through `SuitesService.switch`, `setWorkflows` and `setTimeRules`, as the admin** (this commit).

- **The questions, in order, each only when it is not known yet:** "Which clients or projects do people give their hours for? Write one on each line, or put commas between them." (not asked when the list is already set), "Who approves each week’s hours?", "Does anybody approve the hours after the manager, for example finance? You can say no.", "How many hours a week does each person need to give? You can say none.", "When are the hours due each week? For example, Friday at 17:00. You can say there is no cut-off.", "What happens if the manager doesn't respond within two working days?", and who holds any job the answers need. A cut-off with a day and no time is asked again: "At what time on that day? For example, 17:00."
- **The said-back:** "Here is how time sheets will work. Time sheets will be switched on. People give their hours for Atlas, Kisumu depot and Internal, each week. A week of hours goes to the person’s manager. If the person has no manager in Groundwork, it goes to an admin instead. Each person is asked for 40 hours a week. The hours for each week are due by Friday at 17:00, Lagos time. If somebody does not answer, it waits for them. Groundwork does not pass it on by itself. Shall I set it up like this? Nothing changes until you say yes."
- **Set up by talking, time sheets are sent each week** (`timeRules.every` is set to `week`), because the questions ask about each week. Who keeps a time sheet and billable or not are left as they were; they stay on the time sheet rules page.
- **For leave and spending too:** the sentence when nothing is passed on now reads "If somebody does not answer, it waits for them. Groundwork does not pass it on by itself." (it said "the request waits for them").
- **After the yes, a no, a change and somebody who is not an admin** read the same sentences as for leave, with "time sheets" in place of "leave requests".

Tests: `api/src/modules/assistant/time-sheets-set-up-by-talking-as-each-reader-reads-it.spec.ts`, as Grace (admin), Fatuma (lead) and Kamau (member). No existing test changed; the leave spec added two commits ago follows the "it waits for them" wording.

## Setting up performance reviews by talking to Ask Groundwork (3 October)

**Decision 85: "Set up performance reviews" (or "our review process", "our appraisals") now works like the other three. On the yes it is written through `SuitesService.switch`, as the admin** (this commit).

- **The questions, each only when it is not known yet:** "How often is each person reviewed, every 6 months or every 12 months?" (not asked when the opening already says, for example "annual performance reviews"), and "Who writes each review with the person, their manager or an admin?". Any other answer, such as "HR", is asked again: "A review can be written with the person by their manager or by an admin. Which should it be?"
- **The said-back:** "Here is how performance reviews will work. Performance reviews will be switched on. Each person is reviewed every 6 months. The person’s manager writes each review with them. If the person has no manager in Groundwork, an admin writes it instead. Shall I set it up like this? Nothing changes until you say yes." With "An admin": "An admin writes each review with the person."
- **One review is not the process.** "Set up a review" and "set up a review for Aisha" are not taken by this; the singular needs a word such as "process" after it.
- **After the yes, a no, a change and somebody who is not an admin** read the same sentences as for leave, with "performance reviews" in place of "leave requests".

Tests: `api/src/modules/assistant/reviews-set-up-by-talking-as-each-reader-reads-it.spec.ts`, as Grace (admin), Wairimu (lead) and Miriam (member). No existing test changed.

## Leave by length (3 October)

**Decision 85, Hafsah's own example: "If it's more than 10 working days, department head also approves." Leave now has thresholds by working days, the way spending has thresholds by amount. Each threshold has its own approval steps, through the same steps and the one resolver (`theStepsFor('leave', answers, workingDays)` in `who-may-decide.ts`). Longer than two thresholds, the higher one's steps** (this commit).

- **Kept in the leave rules** (`GET/PUT /suites/leave/rules`), as a new part `thresholds: [{ above: 10, steps: [["manager","admin"],["departmentHead","admin"]] }]`, where `above` is a whole number of working days from 1 to 365, up to five thresholds. Given as null, or an empty list, it is cleared. A threshold that does not make sense is refused: "Give up to 5 lengths of leave, each a whole number of working days from 1 to 365 that no other length has, and between one and 5 steps chosen from the person's manager, the head of their team, whoever holds their team's budget, finance, HR, the chief executive and an admin."
- **The leave rules said back** (`said`) gain, for each threshold: "Leave of more than ten working days goes first to the person’s manager, or else an admin, and then to whoever heads their team, or else an admin." and then "Shorter leave follows the approval steps as they are." (with two or more thresholds: "If leave is longer than two of these lengths, the longest one counts. Leave that is not longer than any of them follows the approval steps as they are."). The rules history reads "This was added. Leave of more than ten working days goes first to ..."
- **The person, in their say-back,** when the request is longer than a threshold with more than one step: "You asked for leave from Monday 12 October to Tuesday 27 October, which is 12 working days. You have 21 days of leave left this year, and nobody else in Sales is off then. This is more than ten working days, so Wairimu approves it first, and then Joseph, who heads Sales. Shall I send it to Wairimu to approve?" Exactly ten days is not more than ten, and reads as before.
- **Whoever decides, and everybody who reads where it is,** read the new step through the fields they already have: Joseph's board `where` reads "Wairimu has approved it, and it is now waiting for you." with `mayDecide: true`; an admin reads "Wairimu has approved it, and it is now waiting for Joseph, who heads Sales."; Aisha's own leave reads "Your leave from Monday 12 October to Tuesday 27 October is approved by Wairimu and is now waiting for Joseph, who heads Sales." No new field.
- **A member named in a threshold's steps** (for example a member who heads a team) opens the leave board as an approver, as a member named in the approval steps already does.

**Setting up leave by talking now takes leave by length.** The reply "I cannot yet set a different approver only for longer leave. ..." is gone.

- **Said to "Does anybody approve it after the manager ...?"**: "If it's more than 10 working days, the department head also approves" is kept as that threshold, after every request's own steps. With the length but nobody named, Grace is asked "Who approves leave of more than ten working days after the manager?". With somebody named but no length ("The head of their team also approves longer leave"): "How long does leave need to be for that? For example, more than 10 working days."
- **Said to "Who approves annual leave?"**: "Leave of more than 10 days is approved by the head of their team" is kept as that threshold's whole steps, and then "Who approves leave of up to ten working days?" is asked.
- **The said-back, for Hafsah's example:** "Each person has 21 days of leave a year. A leave request of up to ten working days goes to the person’s manager. If the person has no manager in Groundwork, it goes to an admin instead. A leave request of more than ten working days goes to the person’s manager first. When the manager has approved it, it goes to the head of the person’s team to approve as well. It is approved only when the head of the team approves it, and a no from anybody on the way ends it. If nobody is named as the head of the person’s team, it goes to an admin instead. ..." With no length said, the said-back is exactly as before.
- **A change before the yes**: "If it's more than 10 working days, the chief executive also approves", "make it 15 working days for longer leave" and "drop the rule for longer leave" are each said back again before anything is written. Setting leave up again without a length clears the length, because the said-back no longer has it.

**With no thresholds set, every reader reads exactly what they read before.** The table, in `api/src/modules/suites/leave-by-length-as-each-reader-reads-it.spec.ts`, checks that for 1, 2, 5, 10, 11, 15 and 30 working days, with no rules row, an empty rules row, rules with no thresholds, and approval steps set, the steps are the same as the call made before this change:

| Leave rules set | 1 to 10 working days | 11 or more working days |
| --- | --- | --- |
| None (before and after) | the approval steps (the manager, else an admin) | the same |
| `thresholds: [{ above: 10, steps: manager, then head of team }]` | the approval steps | the manager, else an admin, then the head of the team, else an admin |

Tests: `api/src/modules/suites/leave-by-length-as-each-reader-reads-it.spec.ts` (Aisha, Wairimu, Joseph, Grace, Miriam) and `api/src/modules/assistant/leave-set-up-by-talking-as-each-reader-reads-it.spec.ts`. One existing test changed: "a different approver only for longer leave is said plainly to be something it cannot set yet" is replaced by tests of the real question, because that reply was the old limit this change removes.

## Whoever looks after HR or finance sets up their suites (3 October)

**Decision 85: "The company/admin/HR/finance lead sets up the rules once." Whoever holds the HR duty may now set up leave and performance reviews; whoever holds the finance duty may set up spending and time sheets. An admin sets up all of them, as before. Who holds each duty is still set by an admin only. The rules history records the duty holder's change ("Joy switched on performance reviews on 5 October.")** (this commit).

- **`PUT /suites/:key`** (switch a suite on or off) now accepts whoever holds the duty for that suite. Its reply is what `GET /suites` serves that reader. Refusals: "Only an admin or whoever looks after HR can switch leave requests or performance reviews on or off." and "Only an admin or whoever looks after finance can switch spending requests or time sheets on or off." Other suites keep "Only an admin can switch a suite on or off."
- **`GET /suites`** for a member who holds the HR or finance duty: no longer refused. It serves `{ reader: "duty", youSetUp: [{ key, name, line, on, questions, answers }], people }`, with only the suites that duty sets up. For a lead who holds one, the lead's page gains the same `youSetUp` and `people`. Everybody else reads exactly what they read before.
- **`GET/PUT /suites/leave/rules`**: an admin or whoever looks after HR. **`GET/PUT /suites/spend/rules`** and **`/suites/time/rules`**: an admin or whoever looks after finance. The refusals now read "Only an admin or whoever looks after HR can set the leave rules.", "Only an admin or whoever looks after finance can set the spending rules." and "Only an admin or whoever looks after finance can set the time sheet rules."
- **`GET/PUT /suites/workflows`** (approval steps): an admin reads and sets all three; whoever looks after HR reads and sets only leave; whoever looks after finance only time sheets and spending (`suites` lists only those). Setting another suite's steps is refused: "Whoever looks after HR sets the approval steps for leave, and whoever looks after finance sets them for time sheets and spending. An admin sets them all." Anybody else: "Only an admin, or whoever looks after HR or finance, can set the approval steps."
- **`GET /suites/duties`** (who holds each duty) may now be read by whoever looks after HR or finance, so they can set up their suites; `PUT` stays admin-only. **`GET /suites/rules/history`** stays admin-only.

**In Ask Groundwork:**

- **Whoever looks after HR or finance** is asked the same questions as an admin, except who holds a job: only an admin names that, so "Who heads Sales?" is not asked, and the said-back adds "Only an admin can name who holds each job." when a job is not held. Naming a person who holds no job reads: "I set who approves by their job, not by name, so it keeps working when people change jobs. Kamau holds no job in Groundwork yet, and only an admin can say who holds each job. Who should approve it instead? For example, “the person’s manager”, “the head of their team”, “HR”, “finance” or “an admin”."
- **Anybody else** now reads who may, by name: "Only an admin or Joy, who looks after HR, can set up how leave requests work in your organisation, so I have not changed anything. If you would like it set up or changed, you could ask Joy, or Grace, who is an admin here." With nobody named for the duty: "Only an admin or whoever looks after HR can set up how leave requests work in your organisation, so I have not changed anything. If you would like it set up or changed, you could ask Grace, who is an admin here." The same for spending and time sheets with "whoever looks after finance".

Tests: `api/src/modules/suites/whoever-holds-hr-or-finance-sets-up-their-suites-as-each-reader-reads-it.spec.ts` (Joy, Kamau, Wairimu, Aisha, Grace) and `api/src/modules/assistant/a-suite-set-up-by-whoever-holds-hr-or-finance-as-each-reader-reads-it.spec.ts` (Miriam, Omar, Wairimu). Existing tests changed, because the rule they pinned is what decision 85 changes: the leave rules spec (Joy, who looks after HR, may now read and set them), the spending rules spec (Omar, who looks after finance, may now), the time sheet rules spec (Omar may now), the four set-up-by-talking specs (the refusal now names whoever looks after HR or finance), and the suites page spec (an admin's `switch` reply is typed as the admin's page, because the reply type now covers every reader).

## The same approver twice (3 October)

**When a request has already been approved by a person, and a later step, or a passing-on, names the same person, that step is passed for them and the request moves on. If it was the last step, the request is approved. Every suite does this through the one resolver (`passWhatTheyAlreadyApproved` in `who-may-decide.ts`): leave, spending and time sheets. Reviews have one step, so nothing is passed there. "Any admin" is never the same person, because another admin may decide. This is a choice for Hafsah to confirm** (this commit).

- **A new kind in the record of who did what** (`suite_events.kind = "passed"`, `toUserId` the person who had approved, `basis.alreadyApproved: true`). Each request's history (`GET /suites/leave/requests/:id/history`, `/suites/spend/requests/:id/history`, `/suites/time/weeks/:weekOf/people/:personId/history`) says it:
  - Aisha reads: "Wairimu approved it on 5 October." then "Wairimu had already approved it, so this step was passed."
  - Wairimu reads: "You approved it on 5 October." then "You had already approved it, so this step was passed."
  - For hours: "Wairimu had already approved these hours, so this step was passed."
  - After a passing-on: "Groundwork passed it to Wairimu on 5 October, because Joseph had not answered for 2 working days." then "Wairimu had already approved it, so this step was passed."
- **Where it stands** reads through the fields it already has: a request whose last step was passed reads "Your leave from Monday 12 October to Tuesday 27 October is approved by Wairimu."; one with a step after it reads "... is approved by Wairimu and is now waiting for Joy in HR." The person is told on WhatsApp as for any approval. No new field.
- **Nothing changes when nobody repeats**: a request whose next approver has not approved it before moves exactly as before.

Tests: `api/src/modules/suites/the-same-approver-twice-as-each-reader-reads-it.spec.ts` (leave as Aisha, Wairimu and Joy, with a passing-on; spending as Kamau; time sheets as Aisha). No existing test changed.

## The leave rules history names whoever looks after HR (3 October)

**`GET /suites/rules/history`: a change of the leave rules that tells HR always read "HR is to be told of each approved request, but nobody is named for HR yet. Name somebody under who holds each duty.", even when somebody looked after HR, because the history passed no name. It now names whoever looked after HR when the rules changed** (this commit).

- **Grace now reads:** "This was added. Joy Mutua, who looks after HR, is told of each approved request, on the leave board."
- **Who looked after HR then**, not now: read from the last change of who holds each duty at or before the leave rules changed, or else from the first change after it, as it was before that change, or else who looks after HR now. So when Aisha takes over HR later, Grace still reads Joy on the earlier change.
- **With nobody named for HR**, the sentence is as before.

Tests: `api/src/modules/suites/the-leave-rules-history-names-hr-as-each-reader-reads-it.spec.ts`, as Grace. No existing test changed.

## Setting up a suite by talking says "you" to the person reading (3 October)

**In Ask Groundwork, the said-back and the reply after the yes named the person reading in the third person: Grace, who looks after HR, read "Grace, who looks after HR, sees every leave request on the leave board". Wherever a sentence names the person reading, it now says "you". Everybody else is still named. No field changed; only the text of the reply** (this commit).

- **HR on the leave board, said to whoever looks after HR:** "You look after HR, so you see every leave request on the leave board, when it is asked for and when it is decided." and "You look after HR, so you see each approved leave request on the leave board." Said to anybody else, as before: "Miriam, who looks after HR, sees every leave request on the leave board, when it is asked for and when it is decided."
- **A step that comes to the person reading:** "When the head of the team has approved it, it goes to you to approve as well. It is approved only when you approve it, and a no from anybody on the way ends it." (was "it goes to Grace, the chief executive, to approve as well. It is approved only when Grace approves it"). With it, why: "You are the chief executive, so that part comes to you.", "You look after finance, so that part comes to you." or "You look after HR, so that part comes to you."
- **Passing on:** "If you have not answered after three working days, or are on leave that day, it goes to an admin." (was "If Grace has not answered ..., or is on leave that day").
- **Who heads each team:** "You head Finance, Fatuma heads Operations, and Wairimu heads Sales." (was "Omar heads Finance, ..." when Omar reads it).
- **The questions:** "Does anybody approve it after you, ...?", "What happens if you don't respond within two working days?", "What is the most you may approve on your own?", and, naming yourself with no job or several: "Which job do you do here? For example, do you head a team, hold a team’s budget, look after HR, look after finance, or are you the chief executive?" and "You look after HR and head Sales. Which of these are you approving it as? ..."

Tests: the four set-up-by-talking specs in `api/src/modules/assistant/` now pin the "you" text, because the text they pinned named the reader to herself (Grace in the leave and spending specs, Miriam in the HR-or-finance spec). New tests read the same set-up as two people: Grace and Omar for spending, Miriam and Grace for leave, and Grace naming herself as the approver.

## The question after the first approver no longer offers the same job (3 October)

**In Ask Groundwork, setting up a suite by talking asked "Does anybody approve it after the head of the team, for example the head of the person’s team?" when the head of the team already approved first. The example is now the first job, in the suite's own order, that does not already approve it; when none is left, there is no example. No field changed; only the text of the question** (this commit).

- **Leave** (head of the team, then HR): after the manager, "Does anybody approve it after the manager, for example the head of the person’s team? You can say no." (as before); after the head of the team, "Does anybody approve it after the head of the team, for example HR? You can say no."; when the head of the team and HR both already approve it, "Does anybody approve it after the head of the team? You can say no."
- **Spending** (finance, then the head of the team): after the manager, "... for example finance?" (as before); after finance, "Does anybody approve it after finance, for example the head of the person’s team? You can say no."
- **Time sheets** (the same order): after finance, "Does anybody approve the hours after finance, for example the head of the person’s team? You can say no."

Tests: one new test in each of the leave, spending and time-sheets set-up specs. One existing test changed, in the HR-or-finance set-up spec, because it pinned the odd question itself ("after the head of the team, for example the head of the person’s team").

## The fallback for a job is said only when nobody holds it (3 October)

**In Ask Groundwork, setting up a suite by talking said "If nobody is named to look after HR, it goes to an admin instead." even when somebody looked after HR, and the same for finance and the chief executive. That sentence is now said only when nobody holds that job. The stored steps are unchanged (an admin still takes it if the job is ever left empty). No field changed; only the text of the said-back** (this commit).

- **With Miriam looking after HR**, Grace reads: "A leave request goes to Miriam, who looks after HR." and no "If nobody is named to look after HR" sentence.
- **With nobody looking after HR**, Grace reads, as before: "If nobody is named to look after HR, it goes to an admin instead."
- **Spending, with Omar looking after finance and Grace the chief executive**, Grace no longer reads "If nobody is named to look after finance, it goes to an admin instead." or "If nobody is named as the chief executive, it goes to an admin instead."

Tests: a new test in `api/src/modules/assistant/leave-set-up-by-talking-as-each-reader-reads-it.spec.ts`. Existing tests changed, because they pinned the untrue sentence: two in the leave set-up spec (Omar looking after finance, Grace looking after HR) and the spending set-up spec's said-back (Omar for finance, Grace the chief executive).

## Item 21: what the other kinds of work's boards still need from the engine (3 October, in progress)

Each kind was served from the engine, read only (the database connection refuses every write), from the local test database, through `BoardService.get`, as the lead, a participant and an admin who is not in the check-in. The screens handover's test check-ins are on the screens workspace's database, not this Mac's, so each kind is served from a stored check-in of that kind here: founder "A second founder joining, and what each of us owns" (`9a904212`, Ada Nwosu runs it, Tunde Bakare checks in), and the others listed under each change below.

- **The Blockers tile never says nobody waits while somebody does** (this commit). `quickRead[label = "Blockers"].sub` on the board, and the same tile in the session report (`atAGlance`). Ada read "You said, "We haven't actually gotten to that part yet, specifically." There is 1 more worry on record, and nobody is waiting on anybody." while Tunde had been waiting on her for three things since session 4. The tile counts what this session raised, and it still does; where waits raised in an earlier session are still open, it now ends "There is 1 more worry on record. Nobody named a new wait this session, and 3 waits from earlier sessions are still open." With no worry this session it reads "Nobody named anything new holding work up this session, and 1 wait from an earlier session is still open." With nothing open anywhere it reads exactly as before. The earlier waits are counted by the same rules as the tile's own (a wait on oneself is not a wait; a reader who reads only their own waits counts only theirs). No field added or moved; `value` is unchanged.
- **A check-in that ran past its plan counts every session** (this commit). `phaseSpine.currentSession` on the board, the check-in page's session header (`theSessionClock`, "Session 3 of 3, finished."), and `coaching.yours.whyItMatters`. The founder check-in was planned for three sessions and six ran; every reader was served `currentSession` 3 beside six finished sessions in `phaseSpine.sessions`, and Ada read "This is session 3 of 3 of founder or CEO work. Nothing has come up often enough yet to be called a pattern." The count is still capped at the planned number, except where somebody has already checked in past it. Ada now reads "This is session 6 of founder or CEO work. ...", every reader is served `currentSession` 6 with `plannedSessions` 3, and the header reads "Session 6, finished." (a session past the plan is never said "6 of 3"). The screen's header should draw "Session N." when `currentSession` is above `plannedSessions`, as `theHeaderSays` does.
- **Two goals not told yet are one sentence** (this commit). `eachPersonToday[].conversationPoints`, the lead only. Ada read "Tunde Bakare has not been told about this goal yet. Talk it through together before reading anything into it." twice in a row, once for each goal she had not told him. A person with several such goals now has one point: "Tunde Bakare has not been told about 2 goals yet. Talk them through together before reading anything into them." One goal reads exactly as before. Still an array, now of at most one per person.
- **A wait on the reader is theirs to answer** (this commit). `coaching.eachPerson[].probe` (whoever runs the check-in only) and the report's `probes[].probe`. Ada read "Tunde Bakare has been waiting on you for the formalized agreement, the co-founder agreement and an explicit handoff of decisions and processes since 30 September, and nothing on record says it was raised higher. Ask what has stopped Tunde Bakare raising it." She now reads "Tunde Bakare has been waiting on you for the formalized agreement, the co-founder agreement and an explicit handoff of decisions and processes since 30 September. Give Tunde Bakare an answer, or say when you will." (the words the board's own `eachPerson[].ask` uses). A wait on anybody else reads as before; a person with both gets one sentence for each. Existing test changed: `request-102-a-closed-session-keeps-its-own-coaching.spec.ts` pinned "... and nothing on record says it was raised higher. This early, that is worth showing Baraka Mwangi rather than asking about." for a wait on Rukia, the reader, which is this fault.
- **A wait that has been cleared is said in the past** (this commit). `dependencies[].waitingSays`, for every reader served the section. Ada read "You are waiting on their lawyer." on a wait whose `status` was `CLEARED`. A cleared wait now reads "You were waiting on their lawyer, and that has been cleared." to the person who waited, and "Ada Nwosu was waiting on their lawyer, and that has been cleared." to the lead and an admin. Open waits read as before. ("their lawyer" is the holder as the stored row has it; see the notes at the end of item 21.)
- **"Help nobody mentioned" says "you" to the person it is about** (this commit). `helpNobodyMentioned.lines`, served to whoever runs the check-in only. Ada, who runs it and checks in too, read "A colleague said Ada Nwosu helped them. Ada Nwosu did not mention it in their own check-ins." She now reads "A colleague said you helped them. You did not mention it in your own check-ins." Everybody else's line is as before.
- **An aim set as an instruction is said as it was set, and "you" takes its verb when it is said short** (this commit). `objectives[].name` for every reader, and every text that goes through the name wrapper. Every reader read Ada's aims glued onto the team's: "The team is working on provide the final details for the paperwork to my lawyer.", "The team is working on let go of control and delegate the engineering function to Tunde.", "The team is working on prioritize having a specific conversation about how to handle disagreements." and "The team is aiming for 25 draft the formal co-founder agreement for Tunde, ...". An aim that is a whole sentence starting with one of these instructions (provide, draft, let, prioritise, schedule, share, delegate, and so on, listed in `an-aim-is-a-sentence-about-somebody.ts`) is now said as it was set: Ada reads "Provide the final details for the paperwork to your lawyer." and everybody else "Provide the final details for the paperwork to Ada Nwosu's lawyer."; "Draft the formal co-founder agreement for Tunde, including the equity offer of 25% vesting over four years." A short name with no full stop ("Share of wallet", "Contracts signed") reads as before. And Ada read "You will know the engineering side is running smoothly when you doesn't have to think about it anymore."; "you doesn't", "you isn't", "you hasn't" and "you wasn't" are now "you don't", "you aren't", "you haven't" and "you weren't", except after a word like "for" ("A worry for you isn't new." stays).
- **A commitment said another way is still said** (this commit). Every sentence built from a commitment's text (`timeline[].says`, `risks[]`, `workPlan[].says`, `overTime.commitments[].say` and the report's same sentences). Only "I will", "I'll", "I'm going to" and "I plan to" were taken off a commitment, so "I am continuing to assess the documentation and codebases" and "I just need to schedule a dedicated call for that exact topic." kept their "I", and Tunde read "On 30 September, you made a commitment, which is in the record." Now "I need to", "I have to", "I must", "I want to", "I intend to", "I'd like to", "we are going to" and the same with a small word between ("I just need to", "I will definitely") are taken off too, and "I am continuing to ..." is "continue to ...". Tunde reads "On 30 September, you committed to continue to assess the documentation and codebases."; Ada and an admin read "Tunde Bakare committed to ...". A commitment with "I" or "we" left in it after that still falls back as before.
- **A short role that says what it covers is not read as a title alone** (this commit). `overTime.gaps[].say` (the lead only), written with the next report; the rows already stored keep their sentence until then. On "Rebuilding the payments integration" (`c6e70dcb`, Ifeoma Chukwu runs it; the engineering kind), Ifeoma read "Rita Adeleke is down as "Finance operations. Owns daily reconciliation", and nothing on record says what that role covers." and the same for "Senior engineer, doing the build": any description of five words or fewer was taken for a job title alone. A description is now a title alone only when it is one short piece with no comma or second sentence. Ifeoma will read "Rita Adeleke works in finance operations. Rita owns daily reconciliation. Since then, ..." and "Samuel Otieno is a senior engineer, doing the build. Since then, ...". "Government Liaison Consultant" still reads "... is down as "Government Liaison Consultant", and nothing on record says what that role covers." A role that is a field of work (operations, logistics, communications, relations, analytics, partnerships, payments, admissions) is said "works in ...", never "is a finance operations".
- **A field name the model wrote into a line of evidence is not served** (this commit). `divergence.items[].evidence` on the board, and `divergences[].evidence` and `.topic` on every report read. Ifeoma read, as the first line of evidence under the difference about what the project is for, "atStake: If this holds, the project could be delivered on time according to your definition, but fail to solve the underlying business problem Rita Adeleke expects it to address." The field name is now taken off ("If this holds, ..."); where a difference has no `atStake` of its own, the line is moved there instead. The clean-up of the topic, which ran only when a report was written, now runs at every read too, so reports already stored are served clean.
- **A word that only points at something else is not a record** (this commit). `workRecords[].rows` for every kind of work, for every reader, and the records read from a check-in when it completes. Ifeoma's "releases and tasks" held rows named "it" (from "I expect it to take about five weeks.") and "that migration" (from "The focus is purely on that migration."). A row whose name is only a pronoun ("it", "this", "them" and so on), or "this", "that", "these" or "those" before one or two ordinary words, is no longer kept or served. A name like "This Way Foods" or "this quarter's pipeline" is kept. Rows already stored stay in the database and are left out at the read.
- **Only a decision needs deciding** (this commit). `decisions[]` where `source` is `"blocker"` (the lead's list; an admin's too). Ifeoma read "Samuel Otieno is waiting on the sandbox credentials, so it needs deciding." with "Samuel Otieno cannot move until this is decided.", and Ada "Tunde Bakare is waiting on the co-founder agreement, so it needs deciding." A wait the record calls a decision (`blockerKind` DECISION), or whose words say one ("decision", "approval", "sign-off", "go-ahead", "answer"), reads as before. Any other wait now says who it waits on: "Samuel Otieno is waiting on the new provider for the sandbox credentials." with `why` "Samuel Otieno cannot move until it comes."; on the reader, "Tunde Bakare is waiting on you for the co-founder agreement."; with nobody named, "Rukia Mwangi is waiting for the pipeline fix, and nobody has been named to provide it." and `owner` "Nobody has been named to provide it." (was "Nobody has been named to decide this."). Existing tests changed: `request-107-b-every-sentence-for-its-reader.spec.ts` pinned "Rukia Mwangi is waiting on the pipeline fix, so it needs deciding.", which is this fault, and `request-112-b-what-needs-you-and-what-to-do.spec.ts` found two decisions by the old start of their question ("Femi Okonkwo is waiting on the bank statements", "Ngozi Eze is waiting on the signed forms"); it now finds them by the new one. Their actions are unchanged.
- **A person's own wait, in their own read, says "you"** (this commit). `contribution[].reason` and `coverage.reads[]` on the reader's own row only. Samuel read about himself "What they say is in the way sits outside this check-in, with the new provider, and nothing on record says anybody has chased it." He now reads "What you say is in the way ...". The same for "naming them as the reason things moved" and "nothing is blocking them". Nobody else's row changes.
- **"Who arranged the meetings" only where a meeting is on record** (this commit). `overTime.cannotTellYou` (the lead and the people in it) and `overTime.toSettleFirst` (the lead), written with the next report; stored rows keep theirs until then. On "The outage, and what we each thought was happening" (`5dcde4bf`, Elena Rossi runs it; the engineering kind), every reader read "Nobody on record has said who arranged the meetings that happened, so this cannot tell you who secured them." and Elena "Ask who secured each one before crediting anybody with them." Nobody had spoken of a meeting. Both are now said only where a line speaks of a meeting, a visit, an appointment or an introduction.
- **A stored question built from a pattern about the lead is not served either** (this commit). `overTime.toSettleFirst` (the lead only). On "First ninety days managing the team he was on" (`f46133fb`, Maria Santos runs it; the support desk kind), Maria read "The record names another person positively with specific evidence of their contribution. Seen in 1 sessions. Your own account of this is not in this check-in." The questions built from a pattern are kept out of this list (patterns are served in their own section, under their own rules), but one about the lead herself had already been turned into "Your own account ..." before it was checked, so it slipped through. It is now left out by its count too. Nothing else in the list changes.
- **A small word between "I" and the verb stays as it is** (this commit). `objectives[].name`, and every aim said about the person who set it. Every reader read Daniel's own aim as "Daniel Park stills do about 30 of those a week myself. Daniel Park set this aim." It now reads "Daniel Park still does about 30 of those a week. Daniel Park set this aim." ("still", "also", "just", "always", "never" and the like are kept, and the verb after them agrees; "myself" in a sentence about somebody else is left out). Daniel reads "You still do about 30 of those a week. ..." The row itself is a sentence the model stored as Daniel's aim; whether it is an aim at all is the model's reading, not changed here.
- **"going to" is taken off a commitment too** (this commit). The same sentences as above. Maria read "You committed to going to continue with that, and no time was given for it, ..." in `risks[]`; she now reads "You committed to continue with that, ...".
- **"which tickets" and "30 of those" are not records either** (this commit). The same rule as above, for `workRecords[].rows`. On the support desk board Maria's ticket list held "which tickets" (from "It's not my decision who gets which tickets.") and "30 of those". "which" or "what" before one or two ordinary words, and a number or "some", "all", "most" before "of those", "of these", "of them" or "of it", are now left out too.
- **Every line has its person in it** (this commit). On "Whether to renew the logistics contract" (`a5168f94`, Kwabena Asante runs it; the distribution operations kind). `busyOrMoving.eachPerson[].says` (whoever runs it): Kwabena read "Blessing Okafor also named 1 thing the work was waiting on." with nothing before the "also"; with no commitment it now reads "Blessing Okafor named 1 thing the work was waiting on, across 1 answered session." `coaching.eachPerson[].encourage` (whoever runs it): "Named a problem out loud rather than reporting everything as fine." is now "Blessing Okafor named a problem out loud rather than reporting everything as fine.", and "Attached a document, so their side can be checked ..." is "Blessing Okafor attached a document, ...".
- **A name and its verb is a sentence, not a thing the team works on** (this commit). `objectives[].name` for every reader. On "Engagement Director, first 90 days" (`d4b862f4`, Dr Amina Bello runs it; the trader training programme kind), every reader read "The team is working on david takes ownership of the top client relationships." More verbs now make an aim a sentence ("takes", "gives", "sends", "holds", "reports", "handles", "approves" and others, listed in `an-aim-is-a-sentence-about-somebody.ts`), so it reads "David takes ownership of the top client relationships." A short thing counted ("Contracts signed") still reads "The team is working on contracts signed."
- **The Differences tile says how many, where it cannot name one** (this commit). `quickRead[label = "Differences"].sub` on the board and the session report. Amina read "2" over "The written report reads this as still open.": the first difference was too long for a tile, so it was not named, and "this" pointed at nothing. With more than one it now reads "The written report reads 2 differences as still open." One reads as before.
- **A difference that is a whole sentence is said as one** (this commit). `quickRead[label = "Differences"].sub`, `decisions[].question` (where `source` is `"divergence"`), and the session report's same sentences. On "The rollout across four branches" (`927dc43a`, Stephen Nwachukwu runs it; the government programme kind), Stephen read "People said different things about Your reporting shows full system adoption, but both branch leads describe that their teams still rely on the old system for certain tasks." and the same after "about ..., so it needs settling." Verbs of saying and seeing ("shows", "describe", "rely", "believes", "thinks", "expects", "suggests" and others) now make a topic a sentence, so it reads "People said different things. Your reporting shows full system adoption, ...", and "People in this check-in said different things. Your reporting shows ... This needs settling." A noun phrase ("the sales reports") still follows "about".
- **A count of hard blockers names a hard blocker** (this commit). `quickRead[label = "Blockers"].sub`, for every reader served the tile. Stephen read "Blockers 1. Work is held up by an update on a fix." The one hard blocker was Musa's "a fix for the printer connection"; the tile took its name from the top line (request 88), whose oldest wait was Ngozi's "an update on a fix", which nobody called blocking. Where the top line's wait is not a hard one, a tile counting hard blockers now keeps its own: "Work is held up by a fix for the printer connection, which waits on the vendor." Where both are the same kind, the tile names the top line's, as before. Existing test changed: `the-blockers-tile-is-the-readers-own-where-people-see-only-themselves.spec.ts` pinned Bisi's tile as "1" over "Work is held up by a date for the credit decision.", Ngozi's wait, which is not blocking, while the one blocking was Femi's bank statements; it now reads "Work is held up by the bank statements."
- **"What each level understood" has one level a person, and "You" for the reader** (this commit). `whatEachLevelUnderstood.levels`, for whoever runs it and an admin. Stephen runs the check-in and checks in too, and read his aims under `who` "You" and then his own words again as another level under "Stephen Nwachukwu" ("You said, "My responsibility is ..."" under his own name). The lead's own words now follow the aims in the same level, and the reader's level is always "You". An admin reads that level as "Stephen Nwachukwu", once.
- **Two sides set against each other are a sentence, not a thing people disagree about** (this commit). `howItIsGoing.latestSummary` and the report's opening (where the model kept "People disagree on 1: ..."), the Differences tile, and what needs deciding. On "Asset loan cohort, first repayment cycle" (`65e21dbe`, Amaka Nwachukwu runs it; the asset loans kind), Amaka read "People disagree about you attribute repayment issues to poor borrower selection, while several participants attribute them to a slow start in generating revenue without initial support." and an admin "People disagree about Amaka attributes ...". "attributes" and "blames" now count as verbs, and a topic with ", while" or ", whereas" between two clauses is a sentence: "People disagree. You attribute repayment issues to poor borrower selection, while several participants attribute them to a slow start ..."
- **What a person waits for is said from the reader's side** (this commit). Every wait on the board (`dependencies[].what`, `risks[]`, `blockerCheck[]`, `blockers[]`, `obligations[]`, `whoWaitedOnWhom[]`, `howItIsGoing.glance.inTheWay.oldest`, the probes). Musa read "You cannot move on the grinding machine I was approved for until it comes from the field officer." and "You are waiting on your organization for this loan cleared from my name."; Amaka read "Musa Danjuma is waiting on the field officer for the grinding machine I was approved for". The first-person words of what was waited for are now said from the reader's side: Musa reads "the grinding machine you were approved for" and "this loan cleared from your name"; everybody else "the grinding machine they were approved for" and "from their name". Only "I", "my", "me" and their forms change. The stored row keeps the person's own words.
- **"something I don't have" is not a record either** (this commit). The same rule, for `workRecords[].rows`. Musa's loans held a row named "something I don't have", marked Late, beside "The grinding machine". A name that starts with "something", "anything", "nothing" or "everything" is now left out. (For one commit a name with "I" in it was left out too; that took away founders' own decisions, such as "I would make the final call to keep us on track", so it was undone in the next commit.)
- **A thing with a clause about it is a thing held up, not a sentence** (this commit). `quickRead[label = "Blockers"].sub`, on the board and the session report. Amaka read "The grinding machine I was approved for. 1 more is holding work up.", a thing said as if it were a sentence. A wait that opens with "the", "a", "their" and the like, and whose only verb follows "I", "you" or "they", now reads "Work is held up by the grinding machine they were approved for, ..." ("you were" to the person waiting).
- **The law firm matter's own sections do not contradict the board** (this commit). `whatYouNeedToDecide`, `whereTheMatterStands.says` and `whatChangedThisWeek`, for whoever runs it and an admin. On "What we think we signed up to" (`595d8fa6`, Adaeze Obi runs it; the law firm matter kind, a contract review planned for one round), Adaeze read "Nothing is waiting for a decision yet." above a difference still open, and "Nothing has been said about the matter yet." after both people had answered. A board of one round has no list of decisions and does not list each person's lines, and both sections read that absence as "nothing". Now, where the board has no list of decisions, each difference still open is one: `items` `[{ question: "People said different things. They are using different standards to define what successful performance looks like. This needs settling.", why: "What people said about this does not match, so nobody can assume it is agreed.", owner: "You" }]` (an admin reads the lead's name as `owner`), and "Where the matter stands" counts it ("1 thing is waiting for a decision."). And where the board does not list each person's lines but somebody has answered, `whatChangedThisWeek` is `{ state: "not-known", why: "This board does not list what each person said, so what changed this week is not shown here. It is in the report." }`; please draw `why` for `not-known` here as in the other sections.
- **One thing under two articles is one record** (this commit). `workRecords[].rows` for every kind, for every reader, and the records read from a check-in. Adaeze's deadlines held "a four-hour acknowledgement" and "the four-hour acknowledgement" as two rows. Names are now compared without a leading "a", "an" or "the" and without case: the first row is served and the second is not; a record read later under the other article moves the first one on instead of being written again. ("acknowledge tickets within four hours" and "The four-hour acknowledgement period" are still separate rows: they are worded differently, and telling them apart would be a guess.)
- **A lead who checks in too is counted among the people asked** (this commit). `byWhoTheyAre.says`, for whoever runs it and an admin. On "Three people, three different versions of the priority" (`52d4fd15`, Omar runs it and checks in too; the MarketView where next kind), Omar read "3 of 3 people have answered." under a summary saying "All four people have answered." It now reads "4 of 4 people have answered." A lead who only runs the check-in is still not counted.
- **A theme said with "to" before it is the same theme** (this commit). The same rule, for `workRecords[].rows`. Omar's themes on the where-next board held "improve our customer retention" and "to improve our customer retention". A leading "to" is now left out when names are compared, like "a", "an" and "the". ("retention", "improving retention" and "impact retention" are still separate rows.)
- **The reader's own wait is asked as theirs** (this commit). `questionsForTheLead[]`. On "The quarter workplan and what it costs" (`472bb15a`; the MarketView Q4 kind), the lead read "What has been tried to get the full, detailed breakdowns of their proposed spending from Marketing and Product Development, which you are waiting for?" with "Nothing on record says anybody has chased it, so only you can find out what was done outside the check-in." It was the lead's own wait. Now: "What have you tried to get the full, detailed breakdowns of their proposed spending from Marketing and Product Development?" with "Nothing on record says you have chased it. If you did, outside the check-in, say so in your check-in.", and for a wait on somebody in the check-in "Have you gone back to Kwame Mensah about the signed forms?" with "Nothing on record says you have. If you raised it outside the check-in, say so in your check-in." An admin still reads the lead named, as before.
- **Two people's records under the same name are two records** (this commit). Correcting the two commits above. Comparing names without "a", "an", "the" or "to" had joined records of different people: on the loans board Chinedu's "the tricycle" and Yakubu's "a tricycle" became one loan, and "Where the cohort stands" read "The loan records show 2 loans being repaid." and "3 loans behind" instead of 3 and 4. Names are now compared that way only for the same person's records; a priority on the where-next board's themes is still one theme whoever named it. A name with "I" in it is kept again (the founder's work plan lost "I would make the final call to keep us on track" and others); one starting with "something" is still left out.

**Item 21: notes for the screens workspace, and what the engine has not changed yet.**
- **Which test check-ins.** The screens handover's test check-ins are on the screens workspace's database, not this Mac's. Each kind was served from a stored check-in of that kind here: founder `9a904212`, engineering `c6e70dcb` and `5dcde4bf`, support desk `f46133fb`, distribution operations `a5168f94`, trader training programme `d4b862f4`, government programme `927dc43a`, asset loans `65e21dbe`, law firm matter `595d8fa6`, where next `52d4fd15`, MarketView Q4 `472bb15a`. On the two evaluation check-ins (`a5168f94` contract renewal, `d4b862f4` new hire) an admin who is not given access is refused the board, as decision 5 says.
- **`eachPerson[].reason`, `whereThisIsHeading.outcomes[].value`, `managerAlignment[].pattern` and `.pole` are codes** ("nothing to do", "waiting on someone", "ALIGNED", "SETUP_NEVER_SAID", "NEITHER"). Never print them; print the sentence beside each (`says`, `label`, `gap`).
- **`workRecords[].section` is "Deal grid" on every kind** (tasks, tickets, incidents, loans, subscriptions). It is the section's key, not its heading; take the heading from the prototype (for engineering, "Every task, and what shows it").
- **`whereTheyDisagree` on the where-next board holds the same items as `divergence.items`.** Draw one of them.
- **`dependencies[].then`** is the person's own words for what the wait holds up ("I can start", "then I can start"). Draw `blockers[].holdingUp` ("Once it is cleared, you can start testing the integration.") instead.
- **`whatChangedThisWeek` can now be `state: "not-known"` with `why`.**
- **Not changed, stored rows written before today's rules** (the next report or check-in writes them again; `journey/bring-a-check-in-up-to-date.ts` covers some):
  - the founder's two "Met" targets ("Tunde will have 25% equity vesting over four years.", count and target both 25), stored before `10e3fe89`;
  - the government programme's "It is 4 so far." on "The team is aiming to understand how the new system rollout is progressing across the four branches.", a count read from "four branches";
  - `overTime.gaps` role sentences joined with a semicolon ("The role written down for Priya Raman is Backend engineer; Believed to have been on call."), `overTime.cannotTellYou` "who arranged the meetings" on check-ins with no meeting, and pattern lines in `overTime.toSettleFirst`, all in reports stored before these rules; the code that writes them now says them properly;
  - the support desk's "I still do about 30 of those a week myself." stored as Daniel's aim, and the mvq4 "subscriptions" that are survey tools: the model's reading.
- **Not changed, wording the model wrote:** findings that repeat a name ("Tunde says Tunde has not had a conversation ...", which follows the rule that no pronoun is guessed), "They have a different understanding ..." in a difference the reader is part of, "You would need to be asked why they have not scheduled this conversation." in the judgement, and some worded coaching lines with semicolons ("You are on session 4 of 6 for this product work and something you read once is an incident; ..."). The loans board's "whatNobodySaid" lists market questions ("Nobody named a state or a region where they want to grow their business.") that do not fit a loan cohort; that list comes from the network read's prompt, which is not changed here.

**Decision 86, item 1: what keeps coming up is in the lead's "what to settle first" again** (this commit). `overTime.toSettleFirst` on the board, served to whoever runs the check-in only, as before (a participant, the admin who set it up and an admin who only reads get no `overTime`, unchanged). After the lines that were there, up to two questions built from the patterns the lead is served, on the same timing: once the person has answered, or three days after they were shown it, or seven days after it was ready. A pattern about the lead, one seen in fewer than three check-ins and one the lead has marked as talked through are not in it. Each is one string, for example:
- with the person's answer: "“Steps in to stop things failing” keeps coming up in Rukia Mwangi’s check-ins. This came up in 3 check-ins, in sessions 1, 2 and 3. Rukia Mwangi said, “Nobody else was on call that week.” Ask Rukia Mwangi what has changed since then."
- without one: "“The work stops until there is another call” keeps coming up in Baraka Otieno’s check-ins. This came up in 3 check-ins, in sessions 1, 2 and 3. Baraka Otieno has not answered it yet. Ask Baraka Otieno what is behind it."
Never the engine's own sentence about the work, and never how the pattern was put to the person. Before, the lead read only the lines not built from a pattern. The report's own `overTime.toSettleFirst` is unchanged (its stored pattern lines are still left out).

**Item 21: a record is whose the speaker says it is** (this commit). `workRecords[].rows[].owner` and `ownerParticipantId`, for records read from a check-in from now on (stored rows stay as they are until the check-in is read again). Every record was given to whoever said the line. On the founders' check-in (`9a904212`), Ada read on the work plan "taking on everything engineering", owner "Ada Nwosu", from her own line "Tunde, as co-founder, is definitely taking on everything engineering. ...", and "covering the operational and business development aspects", owner "Tunde Bakare", from Tunde's "Ada, I believe, will be covering the operational and business development aspects. And funding, of course." Now the owner is the person the speaker clearly names in the check-in: Ada reads "taking on everything engineering" with `owner` "Tunde Bakare" and `saidBy` "Ada", and "covering the operational and business development aspects" with `owner` "Ada Nwosu" and `saidBy` "Tunde". Tunde now reads the engineering row on his own board (his own records only, as before), said by Ada; he no longer reads the business row, which is Ada's. Where the line names nobody, names somebody not in the check-in, or a name two people share, the record stays the speaker's, as before. A record somebody says is a colleague's is never put to the lead as the colleague's claim (`ownerClaim`); only the speaker's own claim is. No field is new.

**Run-26 fix: the loans privacy rule** (this commit). `sharedPicture`, `sharedPictureLines`, `agreements`, `networkPicture`, `divergences`, `postReportGuide` and the board's `whatTheAnswersSay`, `divergence` and `latestSummary`, for a participant in a check-in where people do not see each other. They keep only what is about the reader, what is clearly about several people, and the lead's own aim or the shared purpose. Before, Sunday read "The pump was installed in the second month after a delay, and the business has been operating since the third month.", "The supplier never delivered the machine." and "The tricycle was stolen in the fourth month." Now none of them are served to him; he still reads "All nine people have answered." and "Most of the businesses are now operational, and several are running successfully." The lead, admins, and any check-in where people see each other, are unchanged. A row with `said` (who said it and how many) is kept when the reader or the lead said it, or several people did.

**Run-26 fix: a record is always owned by the person who said it** (this commit). `workRecords[].rows[].owner` and `ownerParticipantId`, on every board. Before, the model could give another owner: on the loans board Musa's "I signed for the loan" became Sunday's record and reached Sunday's board, and on the implementation and shock boards the owner was a person who had not said the line. Now the owner is whoever said the line, both when a record is stored and when it is served (so rows stored earlier are served the same way). Sunday no longer reads Musa's record; Musa reads it as his, and Amaka and an admin read it as Musa's. This replaces item 21's rule that "Tunde ... is taking on everything engineering", said by Ada, was Tunde's: it is now Ada's, said by Ada. A record added on the board by the lead, with no line behind it, keeps the owner the lead gave.

**Run-26 fix: a participant never reads the lead's judgement on the Blockers tile** (this commit). `quickRead[]` "Blockers" `sub`. Before, Sunday, a borrower where people do not see each other, read: Amaka Nwachukwu said, "I need to understand if this is an issue with our selection process for who qualifies for the loans." There are 20 more worries on record, and nobody is waiting on anybody. Now he reads: You said, "I missed the first three repayments." There are 2 more worries on record, and nobody is waiting on anybody. (with only the lead's and another borrower's worries on record, he reads the count alone: "2 worries are on record, and nobody is waiting on anybody."). The value ("3 worries") is a count across people and stays. Anybody who checks in without running it, whether or not people see each other, is never shown the lead's worry as the example. Amaka still reads her own as "You said, ...", and an admin outside the check-in reads it after her name, as before.

**Run-26 review fix: the check-in page and the list no longer give a borrower the lead's doubt** (this commit). `GET /grounds/:id` (`report.sharedPicture`, `report.theOpening`) and the list (`latestSummary`, `latestFinding`), and the board and the blocker trace, now ask the report's door with the people in the check-in and the lead's names, as the report does. Before, the check-in page left them out, so Sunday, a borrower where people do not see each other, read "Amaka wants to understand if there is an issue with the selection process for loan qualification." Now he does not. He still reads "Amaka wants every borrower to be earning by the fourth month." (the lead's aim), "All nine people have answered." and "Most borrowers started repaying before their asset was earning." The wall no longer guesses that a sentence which opens with two capitalised words is the lead's: "Mr Danjuma's machine never arrived.", "Kaduna Grinding Works never delivered the machine." and "Emeka Okafor logged eleven calls about the machine." are not served to Sunday. Amaka, admins and check-ins where people see each other read everything as before. No field is new.

**Run-26 review fix: the lead's own record rows go through the same wall as the shared picture, for a participant where people do not see each other** (this commit). `workRecords[].rows[]` (`name`, `said`). Because every record is owned by the person who said it, a line the lead said about one borrower became the lead's row. A participant's board already carries only their own rows (request 105), so a borrower does not read these rows today; the wall now also holds before that step, for any reader of a check-in where people do not see each other who is not the lead or an admin (not on an evaluation check-in, which has its own rule). The lead's line "Baraka's tricycle was stolen in the fourth month." and "The tricycle was stolen in the fourth month." are dropped, and the row with them when nothing is left. "Most borrowers started repaying before their asset was earning.", "I want twelve shops signed by June." and "We want every borrower earning by the fourth month." stay, word for word. A row whose name is one other person's is dropped. The lead and admins read every row as before. No field is new.

**Run-26 review fix: the next step on a record follows the person who said it** (this commit). `workRecords[].rows[].next`, `nextKnown`, `nextSays`. The row matched a colleague's commitments by the owner an older row had stored, while the rest of the row uses the person who said the line. It now uses the person who said the line. Baraka, who said "I will send Eastside Foods the quote with a photo on Friday.", reads "You committed to send Eastside Foods the quote with a photo on Friday." as the next step on his row, and never Rukia's "I will phone Eastside Foods on Monday." No field is new.

**Run-26 review fix: the Blockers tile hides the lead's words only where people do not see each other** (this commit). `quickRead[]` "Blockers" `sub`, and the same tile in the session report. The earlier fix hid the lead's worry from everybody who checks in. It now hides it only where people do not see each other, as the decisions say (decisions 4, 86 and 88). Where they do see each other, Sunday, or a new hire, reads: Amaka Nwachukwu said, "I need to understand if this is an issue with our selection process for who qualifies for the loans." There are 2 more worries on record, and nobody is waiting on anybody. His own worry is still "You said, ...". Where people do not see each other, he still reads only his own worry and the count, as in the previous entry.

**Run-26 review fix: a record you said is "In your words", never your own first name** (this commit). `workRecords[].rows[]` has a new field, `saidByLine`, the whole opening line for the quoted words, and `saidBy` is now "You" on a line the reader said. Before, Musa read "In Musa's words," above his own line. Now each reader reads: on their own line, "In your words,"; on a line a person they may name said, "In Baraka's words,"; on a line from a person they may not name, "In a colleague's words,"; and `saidByLine` is null on a record the lead added. `saidBy` is unchanged for everybody else ("Baraka", "a colleague"). **Please change in `client/`, which I have not touched:** `WhatShowsIt` in `client/src/pages/board/WorkRecords.tsx` (line 320) builds "In ${saidBy}'s words," itself, so it would print "In You's words,". It should print `row.saidByLine` when it is there, and keep its old line only when an older server sends none. Add `saidByLine?: string | null` to `AServedWorkRow` in `client/src/api/board.ts`.

## Request 121: the twelfth review of the sales board (3 October)

- **"To close the gap" says the day the aim is due** (this commit). `toCloseTheGap.says`, to whoever runs the check-in and the admin who set it up. Rukia read "12 more are needed by 13 December." while the headline, the target and "Where each target stands" said 20 December. 13 December was the day the check-in ends; 20 December is the day the aim itself is due. The gap now uses the aim's own day when it has one, the same day the headline uses, and the check-in's end only when the aim has none. Rukia now reads "12 more are needed by 20 December, and no deal on record is still open before then. Each open deal is counted as one toward the aim of 12." No field is new.
- **The lead's own aim, said again with no number, is taken off by `bring-a-check-in-up-to-date.ts`** (this commit). `objectives[].name` and the counts "7 targets are set, and 6 of them have a number", for every reader, on a check-in whose rows were stored before the fixes. After the script, "You want to get 12 shops onboarded." (Amani read "Rukia Otieno wants to get 12 shops onboarded.", with "No number is set yet.") was still stored. It was Rukia's own aim with no number, and the script only compared aims that had a number. The script now reads the figure in the name of an aim with no number ("get 12 shops onboarded" holds 12) when it is the team's or the lead's own, and takes it off when it is the team's aim said again. Somebody else's own aim with no number is theirs and stays. The dry run now says: "Sales team, Q3: the target "get 12 shops onboarded" is the team's aim "Sign 12 shops for kitchen appliances in Nairobi" said again. It would be taken off." Run it again on the screens workspace's database. No field is new.
- **A target no longer points to a place to write what it assumes** (this commit). `objectives[].assumesSays`, to whoever runs the check-in and the admin who set it up. There is no place on the board to write it, so the lead read "Nothing on record says what this target assumes yet. You can write down what it assumes here." She now reads "Nothing on record says what this target assumes yet." Everybody else reads "Nobody has written down what this target assumes yet.", as before. (`PATCH .../objectives/:id` with `assumes` still writes them.) The earlier spec for request 115 (c) expected the old second sentence; it now expects the new one.
- **Somebody waiting to be let in is not chased in "The team today"** (this commit). `eachPerson[]` (`reason`, `says`, `ask`, `notLetIn`) and `eachPersonToday[]`, to whoever runs the check-in and the admin who set it up. Faraji Odhiambo was waiting to be let in, yet his row said `notLetIn: false`, so Rukia read "Faraji Odhiambo has not checked in for this round yet." and "Ask Faraji Odhiambo to check in." under "Has not answered". The row only knew a person an admin had declined; it now asks the same question as the header's count (decision 77), so a person who is still waiting is marked `notLetIn: true` too. Rukia now reads "Faraji Odhiambo is waiting to be let in, so there is nobody to ask yet." with no ask. A person an admin declined still reads "Faraji Odhiambo was not let in by Grace Njeri, so there is nobody to ask." (with the admin's name when it is known). `notLetInBy` and `notLetInAt` are null for a person who is only waiting.
- **The report's "what this cannot tell you" does not count somebody who is not let in** (this commit). `overTime.cannotTellYou`, to the lead and the people in the check-in, written with the next report (a stored report keeps its sentence until then). It read "2 of 6 people have not answered yet, so anything about them is missing rather than absent." beside a headline of "4 of 5", because it counted Faraji Odhiambo, who is waiting to be let in and cannot answer. It now leaves him out, as the headline does, and reads for example "1 of 4 people has not answered yet, so anything about them is missing rather than absent." This is one small change in `reports.service.ts` (`readTheRecordOverTime`), because that is where the count is made.

## Request 122: Rukia's Today (3 October)

- **Today's "Coming up" gives the day the board gives** (this commit). `comingUp[].at` and `comingUp[].what`, to whoever runs the check-in and an admin who reads it as the lead. Today said "The second check-in for Sales team, Q3 opens." on 4 October, while the board said "Session 2 opened on 30 September." and "Session 3 opens on 7 October." One person's later row for session 2 (somebody added later, or somebody not let in yet) was read as the team's next check-in, though session 2 had already opened for the others. The team's next check-in is now the first session after the open round that has not opened for anybody, on the earliest day it opens, and a person not let in yet is left out of that clock (decision 77). Rukia now reads "The third check-in for Sales team, Q3 opens." on 7 October. A person who only checks in reads their own next check-in, as before ("Your third check-in for Sales team, Q3 opens.").
- **Today says what the board says needs the lead** (this commit). `needs[]` and `count`, to whoever runs the check-in and checks in or reads it as the lead; nobody else. Rukia's Today sent `needs: []`, so she read "Nothing needs you right now.", while her board's "What needs you in this check-in" listed Baraka Mwangi and Amani Wekesa waiting on her and a commitment of hers still open. Today now takes those items from the board itself (its `leadActions` and `decisions`, read as Rukia), so the two cannot disagree. Rukia now reads, as three things on Today: "You need to get back to Baraka Mwangi, who is waiting on you for the discount." (under it "It was first said on 27 September. Nobody has said what has been tried. No time has been given for it."), "You need to get back to Amani Wekesa, who is waiting on you for the price list." (under it "It was first said on 28 September. Nobody has said what has been tried. No time has been given for it."), and "In session 2, you said, "I will visit Naivas Karen on Monday to show them the cookers." Nobody has said yet whether it happened." A decision on the board (for example "Decide whether a price range counts as a budget") is a `decide` item, the lead's actions are `look` items. Each goes to `/grounds/<id>` with the button "Open it". A participant or an admin who does not run the check-in is given none of them, and the board is not read for them. **New field, please use it in `client/`:** each of these items carries `onTheBoardToo: true`. The board page draws Today's items for its own check-in above its own lists (`needsHere` in `BoardPage.tsx`), so please leave out the items with `onTheBoardToo`, or the lead will read each one twice.

## Request 124: the onboarding board (3 October)

- **No decision is said to be below when none has been made** (this commit). `divergence.items[].positions[].view` on the board, `whoOwnsWhat[].items[].text`, and the session report's `whatEachPersonSaid[].saying`, to the person an evaluation check-in is about. Where a side's words are not shown, the sentence that takes their place always said "What was found, and the decision with its reasons, are below.", though no decision had been made and none was below. It now says that only once a decision has been made (the check-in has an end state, or has been resolved). Before a decision the person reads "The words your lead used are not shown to you here. What was found is below." or "A colleague's own words are not shown to you here. What was found is below." After a decision they read the earlier sentences, unchanged. The earlier spec for the person reviewed expected the old sentence on a record with no decision; it now expects the new one.
- **On an onboarding check-in, the new hire reads their lead's own words and row** (this commit; Hafsah's answer of 3 October, decision 88, decisions 3 and 4). Only for the person a new hire's check-in (NEW_HIRE, the first 90 days) is about. `divergence.items[].positions[]`, `divergence.items[].evidence[]`, `whoOwnsWhat[]`, `checkInGrid.rows[]`, `whyYouOnlySeeYourself`, the session report's prose (`sharedPicture`, `theOpening`, `findings[].text`, `agreements`) and `whatEachPersonSaid[]`. Tobi read, under "Where you both see it differently", "The words your lead used are not shown to you here. What was found, and the decision with its reasons, are below.", and was shown only himself in "Who checked in". He now reads Amina's side word for word, for example "We agreed 98% on-time delivery." under her name, her quotes in the evidence and in the report's sentences, her row in "Who checked in" beside his own, and her row in "Who owns what" with her words. A colleague's words still come out for him ("A colleague's own words are not shown to you here. What was found is below."), as decision 17 says. The lead's private notes and own report are still never served to him. `whyYouOnlySeeYourself` is now sent only when a colleague is left out, and then reads "On this check-in people give their views without seeing what each other said, so the person-by-person part of this board shows you and your lead. Everything above it is built from everybody and is the same for all of you. That covers where people said the same thing, where they said different things, and the question it turns on." With nobody else but the lead, it is not sent. A plan, a promotion, a renewal, an admin with no access to the check-in, and a colleague who gave a view read exactly what they read before. `participants` already held the lead's row.

## Request 123: the onboarding board's new-hire sections (4 October, in progress)

For a first 90 days, a new manager and a new advisor (`family: 'ONBOARDING'`). Built from the record, with no model, and nothing is stored: opening the board changes nothing.

### `startingState`, "What was agreed at the start"

On the onboarding board `startingState` is an object, or null when nothing was agreed yet. (On every other board it is still the sentence stored at creation, or null.)

- `heading`: "What was agreed at the start".
- `rows[]`, ordered Day 1, By day 30, By day 60, By day 90, After day 90:
  - `when`: the step, one of "Day 1", "By day 30", "By day 60", "By day 90", "After day 90". A goal with a date is put in the step its date falls in, counting day 1 as the check-in's start date (else the day the first session was finished). A goal with no date, but "day 30", "day 60" or "day 90" in the words the time was given in, goes in that step. Any other goal is under "Day 1", and its sentence quotes the time that was given.
  - `whose`: "You" to the person it is about, otherwise their name.
  - `says`: one full sentence. A goal reads "A goal was agreed for Tobi Adewale, to be met by day 90." (Tobi reads "for you"). A goal with a time given in other words reads "A goal was agreed for Tobi Adewale, and the time given for it was "in the first week"." A commitment from session 1 reads as the work plan writes it, for example "In session 1, you said, "I will read the contract for each of the five clients."".
  - `what`: the goal as it was written down, for the screen to draw under the step. Null for a commitment.
  - `kind`: "goal" or "commitment".
- Sources: the goals set for each person (`PersonObjective`, not a reference or a commitment) and the commitments stated in session 1.
- Left out for every reader: a goal the lead has not told the person (or has not asked about), which is the lead's own note (decision 56); and the role the lead described the person by (decision 30). Rows go through `personMayBeRead` and `commitmentMayBeRead`, so a reader who may not read a person reads nothing of them. An admin with no access to the evaluation check-in is not let in at all.
- Read by: the lead, the person it is about (their own and the goals told to them), and an admin who set the check-in up. Test: `request-123-what-was-agreed-at-the-start-as-each-reader-reads-it.spec.ts`.

### `changeSinceLast`, "Change since last check-in"

On the onboarding board only. Absent until two sessions are finished (there is no "last check-in" before that), and absent when the reader may read nothing in it.

- `heading`: "Change since last check-in". `between`: "Between session 5 and session 6." (the last two finished sessions).
- `rows[]`, one per area:
  - `area`: "Commitments", "Waits", or the goal itself for each goal told to a person (the goal's words).
  - `state`: "moved", "held" or "late". Moved means something was said or settled since the previous session (a commitment made in the latest session or marked done or not done since; a wait raised or cleared since; a goal marked met, dropped or changed since). Late means something is still open from before the previous session (a commitment said before it, a wait raised before it) or a goal's date has passed and it is still open. Held means neither. Late wins over moved.
  - `says`: full sentences, for example "Tobi Adewale made 1 commitment in session 3. Of Tobi Adewale's commitments, 1 was marked done since session 2. Tobi Adewale still has 1 commitment open from before session 2." Tobi reads "You made 1 commitment in session 3." and "You still have 1 commitment open from before session 2." A wait reads "Tobi Adewale is waiting on you for the commercial terms for each client, and has been since 2 September." and a cleared one "The wait for access to the client folders was cleared on 15 September." A goal reads "This goal was due on 10 September and is still open." or "This goal was marked met between session 2 and session 3." or "Nothing has changed on this goal between session 2 and session 3."
  - `kind`: "commitments", "waits" or "goal".
- Nothing here says what a person is. Each row goes through the wall of the other rows (`personMayBeRead`, `commitmentMayBeRead`, `handoffMayBeRead`); a goal not told to the person is not sent. Test: `request-123-change-since-the-last-check-in-as-each-reader-reads-it.spec.ts`.

## Handover to the screens workspace: the onboarding and project boards (4 October)

Hafsah has given the onboarding and project boards back to the screens workspace. What the engine workspace did on them while you were away:

- **Client fixes, committed and pushed:**
  - `4c7d8b73`: BoardPage.tsx reads `b.divergence.whyNothingYet`, so `why-nothing-is-cross-referenced.spec.ts` passes.
  - `61911c52`: WorkRecords.tsx prints the engine's `saidByLine` ("In your words,").
  - `a237a60f` and `64b19e2e`: Today's items with `onTheBoardToo` are left out of the board's `needsHere`.
  - Your "1 of 1 checked in" fix (`39bee66f`) was read and is right.
- **The onboarding review was only half done.** Your check-in e2cfd3d8 is not in this computer's databases, so the review used local check-in `4aea148f-7e87-41c4-9f24-4cd41c02229d` ("Engagement Director, first 90 days", Dr Amina Bello and Tobi Adewale, 6 sessions). Its board JSON for both readers is in the engine workspace's old scratchpad: `pictures/review-onboard-4/board-lead.json` and `board-newhire.json`.
  - **The screens were not checked.** `client/node_modules` here lacks `@fontsource/atkinson-hyperlegible` and `@fontsource/literata`, so vite stops at `main.tsx` line 6. Installing them needs Hafsah's yes.
  - **Privacy:** no fault. Tobi gets Amina's side, her row and her own words (decision 88), never her judgement or private notes.
  - **Engine wording faults found:**
    - "you will questions about client needs…";
    - "2 waiting" against 4 waits listed;
    - "Tobi says that Tobi does not know…";
    - Tobi named where "you" belongs ("initiative from Tobi on renewals");
    - "0 days in all".
    These are with the engine; a builder started them and was stopped by the spending limit. The unfinished work is saved in `docs/unfinished/` and is not in the code.
- **Request 123:** `startingState` ("What was agreed at the start", by day 1, 30, 60 and 90) is done (`07425436`). "Change since last check-in" is not done: it is in the same unfinished patch. The engine finishes it.
- **The project board:** not started by the engine workspace.

From here the engine workspace leaves both boards to you, and answers here as before.

## The smaller wording faults of run 26 and the onboarding review (3 October 2026)

What a person now reads, in place of what they read before. Nothing is hidden on screen only; every change is made where the sentence is built.

- **A wait on "Everyone involved in the project".** Before: "You are waiting on Everyone involved in the project for ...". Now: "You are waiting on everyone involved in the project for ...". A single word on its own ("Everyone") is left as it is.
- **A held-up thing that is not something to do.** Before: "Once it is cleared, Samuel Otieno will testing and deployment." and "Once it is cleared, you will people can write code." Now: "Once it is cleared, testing and deployment can go ahead." and "Once it is cleared, people can write code." A line that already holds its own verb, such as "questions about client needs would go to Tobi", is said as it is, with no "you will" in front.
- **The holder said twice.** Before: "Samuel Otieno is waiting on the provider for the sandbox credentials from the provider." Now: "Samuel Otieno is waiting on the provider for the sandbox credentials." This is only done in the sentences that say the holder too (the Blockers, the work plan, the timeline, who waited on whom, the obligations, and the coaching note); a sentence that does not say the holder keeps "from Lakeside".
- **"My" outside quotation marks, in the coaching and the questions.** Before: "He has been waiting for my loan cleared". Now: "He has been waiting for their loan cleared." The coaching note read by the person waiting says "your". Words inside quotation marks are never changed.
- **The reader's own name where "you" belongs.** Before: "Tunde Bakare committed to clarify this with Ada directly." read by Ada. Now: "Tunde Bakare committed to clarify this with you directly." Her name with 's becomes "your". A longer name that holds hers ("Adaeze") is not touched. "It falls to her" and "That would go to him" read by that person now say "to you".
- **Things people disagree on.** Before: "They disagree on three things: The schedule is wrong.; The scope is not agreed.; ..." Now each is a sentence: "They disagree on three things. The schedule is wrong. The scope is not agreed." This is also done in the stored text of an older report when it is served.
- **A line with no words.** A line of the shared picture that is empty after the privacy rules have run is no longer served.
- **A borrower with no role.** Before: "you are in session 1 of 1 of your founder or CEO work." Now, where nobody gave the person a role: "No role was given, so this is about where you are in the check-in rather than about a kind of work." What the engine detects is unchanged and stored as before.
- **A wait cleared on the day it began.** Before: "... until it was cleared on 2 September, 0 days in all." Now: "Ngozi Eze waited on the Head of Credit for the reply on 2 September, and it was cleared the same day."

Tests: `board/run-26-wording-faults.spec.ts`, `board/onboarding-wording-faults.spec.ts`. Not done in this change: "2 waiting" against four waits and "Tobi says that Tobi ..." in the onboarding board were not found in the saved work and are still open.

## Request 119: the client's wording guard (3 October 2026)

The guard counted 65 lines in the shape it forbids against a ceiling of 60. It counts 60 now. Five lines in the engine's files were reworded; the guard itself is untouched. What a person now reads:

- The deal stages with no rules: "Nothing on record says what a deal must show at each stage. The board counts what people reported, and how much of it has a document behind it. It cannot count how many meet the rules."
- An objective with nothing above it: "Nothing above this has been named yet. These objectives stand on their own, and there is nothing to check them against. Say what they serve, if it is something wider, and they can be checked."
- Support work, in the role map: "Support work goes unseen when it goes well. When a problem is solved cleanly, nobody hears about it. People who count outputs may read this person as low-value. The escalations that never happened leave no record unless somebody asks for them."
- Coaching with no kind of work read yet: "Nothing here says what kind of work this is, because it has not been read from the record yet. This is about where you are, not about the role."
- The instruction that tells the model whether a person confirmed their role: "Says whether the person confirmed or corrected a plain question about their own role. Judge it from their reply alone."

Two fixture files (`board/__fixtures__/sales-board-review-5.ts`, `a-page-that-contradicts-itself.ts`) hold what the reviews saw word for word, and still add three lines to the count; they are left as they are, so the other lines were reworded to make room.

## A person with no role is still coached (3 October 2026)

Coaching, role behaviour, patterns and probes are protected (decision 55). The run-26 fix for a borrower coached as "Founder or CEO" had given a person with no role no role block at all. That is put right in place. Where nobody gave the person a role, `whatToWorkOnNext.role` is now a block that names no kind of job (`label` is "What you said"), and `whyNoRoleMap` still says "No role was given, so this is about where you are in the check-in rather than about a kind of work." What the person reads under "Where this kind of work gets misread" is now: "A short account is not a weak one. If you said little, little may have happened yet, or nobody may have asked the right question. Nothing here is read against a kind of job." The block's `onTrack` is "What you said can be checked later: it has a date, a number or a name on it, and you say what you did about anything that stalled." and `goingWrong` is "What you said is hard to check later: it has no dates, numbers or names, or things were named and not carried through." `noticed` and `lookingLike` stay null, as for everyone. A person who did give a role is coached from the role map, as before. Test: `reports/a-person-with-no-role-is-still-coached.spec.ts`.

## Two onboarding faults still open (3 October 2026)

- **One count of waits.** Before: the lead's quick read said "2 waiting" while the same board listed four waits on Tobi and its top line said four. Now the Blockers tile says the number the top line says ("4 waiting"), which is already cut to what the reader may read, so a person who reads only their own waits reads their own count. The tile's sentence is unchanged ("Work is held up by ... Nothing is hard-blocked."). A tile that counts hard blockers, worries or nothing is left as it was. Test: `board/the-quick-read-counts-the-waits-the-board-counts.spec.ts`.
- **A name after "says that".** Before: "Tobi says that Tobi does not know the names of the clients." Now: "Tobi says that they do not know the names of the clients." The verb agrees with "they" ("does" is "do", "needs" is "need"), and no he or she is guessed. Somebody else's name after "says that" is left alone. Test: `reports/a-name-after-says-that-is-said-once.spec.ts`.

## Two onboarding faults still open (3 October 2026)

- **One count of waits.** Before: the lead's quick read said "2 waiting" while the same board listed four waits on Tobi and its top line said four. Now the Blockers tile says the number the top line says ("4 waiting"), which is already cut to what the reader may read, so a person who reads only their own waits reads their own count. The tile's sentence is unchanged ("Work is held up by ... Nothing is hard-blocked."). A tile that counts hard blockers, worries or nothing is left as it was. Test: `board/the-quick-read-counts-the-waits-the-board-counts.spec.ts`.
- **A name after "says that".** Before: "Tobi says that Tobi does not know the names of the clients." Now: "Tobi says that they do not know the names of the clients." The verb agrees with "they" ("does" is "do", "needs" is "need"), and no he or she is guessed. Somebody else's name after "says that" is left alone. Test: `reports/a-name-after-says-that-is-said-once.spec.ts`.

## Request 123, the rest: the 90 days in three steps, and patterns (3 October 2026)

**New field `ninetyDays` on a first 90 days board** (`{ heading: 'The 90 days, in three steps', steps: [{ step, day, question, says, reached }] }`), built from the goals told to the person, what they committed to, and what they wait for. Nothing is written when it is opened. The questions are the prototype's. Tobi, whom Amina leads, reads: "Are you settled in?", "Are you doing the job?" and "What Amina needs to decide". Amina reads "Is Tobi Adewale settled in?", "Is Tobi Adewale doing the job?" and "What you need to decide". The sentences say what happened and never what a person is. For example, to Tobi on day 32: "2 goals were agreed for you to be met by day 30. 1 is marked met and 1 is still open. You have made 2 commitments so far, and 1 is marked done." A step that has not come says so first: "This step comes on 30 October. 1 goal was agreed for Tobi Adewale to be met by day 60. It is still open." After day 60 the second step adds "Tobi Adewale is waiting on you for the commercial terms for each client." After day 90 the third adds what is still open ("1 goal and 2 waits are still open.") and "It is yours to decide how this ends." (to the lead) or "Amina decides how this ends." (to the new hire). A goal not yet told to the person is left out, and a person the reader may not read is not in it. Test: `board/request-123-the-ninety-days-as-each-reader-reads-them.spec.ts`.

**Patterns on a first 90 days board.** `patterns` is now served on this board, on decision 86's timing and under the rules every other board already follows: the person reads their own first; the lead reads a pattern after the person's answer, or 3 days after it was shown or 7 days after it was ready; a pattern nobody has shown the person yet is the person's alone. Detection is unchanged. Test: `board/request-123-patterns-on-the-new-hires-board-as-each-reader-reads-them.spec.ts`.

**`whereThisIsHeading` is not built for evaluation check-ins** (decision 6). It is served only where the board is not an evaluation check-in, as before.

## Request for the screens workspace: the kind-of-work list on the board (4 October 2026)

The release offers a new check-in only some of the eleven kinds of work. The board now carries a new field `kindsOffered`, the list of kinds a new check-in may be given (at release, only "sales org"). The kind-of-work dialog in `client/src/pages/board/WorkRecords.tsx` still lists all eleven from `KIND_OF_WORK_OPTIONS`, and the server now refuses the rest with a plain sentence. Please list only `kindsOffered` in that dialog, and also the kind the check-in already holds (`kindOfWork`), so a check-in that holds another kind can still be saved. The engine workspace did not edit `pages/board/*`.

## Request 125: a goal not told stays with the lead on every path, a title is not a first name, one count of goals not told (4 October 2026)

**A goal the lead has not told a person about now stays with the lead on every path that serves goals** (decisions 48 and 56). One rule, `grounds/a-goal-not-told-stays-with-the-lead.ts` (the goal's own words), with `board/an-untold-goal-is-not-a-board-objective.ts` for the objectives the engine wrote from it in its own words. Before, `GET /grounds/:id` sent Tobi `objectives[7]`, "Manage the renewal process for at least one of the clients.", in full while the board hid it. Now it is not in `objectives` for Tobi, for a colleague or for an admin who only reads, and Amina still reads it. The same rule now runs on:
- `GET /grounds/:id` (`objectives`, and every sentence on the page),
- the board (its sentences, as well as its objectives),
- the report, which is also what WhatsApp's "your report" message and the API's report routes serve (`reports.get` and `sessionReport` both end in the same wall),
- Today's "Since the last round" (the counts that moved),
- the Movement tile ("targets changed") in the session report,
- the You board's `ownedTargets`,
- Ask Groundwork's "what came of it" recall.
The other WhatsApp and API routes that name a goal read a person's own commitments only, or the lead's own list, so they needed no change. Tests: `grounds/a-goal-not-told-stays-with-the-lead-on-the-check-in-page.spec.ts`, read as Amina, Tobi and an admin on each path.

**A title is not a first name.** Tobi read "Dr has set a goal about this part of the work, and will talk it through with you." He now reads "Amina has set a goal about this part of the work, and will talk it through with you." `leadFirstName` on `GET /grounds/:id` is "Amina", not "Dr". One helper, `theFirstNameOfAParticipant` (`reports/a-title-is-not-a-first-name.ts`), is used where a first name was taken from a full name: the check-in page, the board's goal sentence and its 90 days steps, the You board, Today, the check-ins that wait on this one, the lead's daily WhatsApp summary of who has not answered, and the question drafted for the lead. Places outside the engine's files that still take a first word (`suites/the-todos.service.ts`, `reports.service.ts`'s name list for the walls, `conversation` for waits) are listed in the report to Hafsah.

**One count of the goals not told.** Amina read "You need to talk Tobi Adewale through a goal you set for this work" under "What needs you" and "Tobi Adewale has not been told about 2 goals yet" under the team today. Both are built from `howManyGoalsAreNotTold`. With two goals she reads "You need to talk Tobi Adewale through the 2 goals you set for this work, because Tobi Adewale has not been told about them yet." and "Tobi Adewale has not been told about 2 goals yet. Talk them through together before reading anything into them." With one, "through a goal you set" and "has not been told about this goal yet". Test: `board/request-125-one-count-of-the-goals-not-told.spec.ts`.

**After the privacy review of request 125.** One rule, `isThisTheUntoldGoal` and the helpers around it in `board/an-untold-goal-is-not-a-board-objective.ts`, now answers every "is this the goal the lead has not told them about" question.
- **Only the goal itself is left out.** The board, `GET /grounds/:id`, the You board, Today and the Movement tile left out every objective a person owned when the lead had one goal not told. Tobi lost "Lead the client conversations fully." and Chidi, who sees everybody's targets, lost it too. Now Tobi, Chidi and an admin who only reads all read "Lead the client conversations fully.", and none of them reads "Tobi to close 8 renewals per quarter.". Amina reads both. The match is by the goal's id where there is one, then its words, then its number beside words about the same work.
- **Whoever runs the check-in reads the goal not told.** The rule treated only the lead who started the check-in as the lead, so the admin who set it up for a lead read no objectives at all (the list was empty) and no sentence that carried the goal. Now the lead and the admin who set the check-in up read it, on `GET /grounds/:id`, the board and its sentences, the report, Today's "Since the last round", the Movement tile, the You board and Ask Groundwork's "what came of it". An admin who only reads, a lead of the same department, a colleague and the person it is about still do not. One question, `theyRunThisCheckIn`, answers it everywhere. It reads the check-in's lead and the admin who created it (the same two as `runsOrSetItUp`), not every admin of the organisation.
- **The weekly report** (`GET` of the weekly report, the one WhatsApp and the API serve too) gave Tobi, Chidi and an admin who only reads the goal Amina had not told Tobi about. Tobi read "You need to close 8 renewals per quarter. Your count went from 1 to 2 this week." Chidi and the admin read "Tobi to close 8 renewals per quarter. Tobi Adewale's count went from 1 to 2 this week." Now none of the three reads that goal, in the numbers, in what changed or in any other sentence of the report. They still read the goal Amina did tell Tobi about. Amina and the admin who set the check-in up read it.
- **A broken sentence for a goal that was told.** The engine stores some goals as a note, "Tobi to close 8 renewals per quarter." Tobi read "You to close 8 renewals per quarter." and Amina read "Tobi to close 8 renewals per quarter. Tobi Adewale's count went from 1 to 2 this week." Now Tobi reads "You need to close 8 renewals per quarter. Your count went from 1 to 2 this week." and Amina reads "Tobi needs to close 8 renewals per quarter. Tobi Adewale's count went from 1 to 2 this week." The tile's label reads "close 8 renewals per quarter, your own number", not "tobi to close 8 renewals per quarter, your own number". This is fixed in `anAimAsASentence`, so the board and every other report that says an aim read the same way.
- **The review's record.** The record read for a review copied Aisha's goal "New supermarket accounts" into the stored record when the review started, and then gave it to Aisha even while Wairimu had not told her about it. Now Aisha reads no line about that goal. Wairimu, who runs the check-in, reads "Aisha owns the goal “New supermarket accounts” in “Sales team, Q3”. On 28 September 2026, it stood at 5, against a target of 4." The record is still stored whole; who reads a goal line is decided when it is served, from what the lead has said now, so the lines already stored are covered, and Aisha reads "You own the goal “New supermarket accounts” in “Sales team, Q3”. On 28 September 2026, it stood at 5, against a target of 4." as soon as Wairimu has told her.
- **A commitment the lead set and has not told the person about.** When Amina said Tobi is to "Close eight renewals a quarter", the conversation copied it at once to the organisation's commitments, and Tobi read it under what he owes in Ask Groundwork ("what you owe", "what did I commit to", "what next", ticking something off), in the panel's opening line ("Last time you said you would close eight renewals a quarter. How did that go?"), in what the panel can see, and in his own record. The copy is now made only once she says she has told him, in the same save that records it. Rows already copied are left out of those reads while the goal is still not told: Tobi now reads "Last time you said you would send the Westgate quote by Friday. How did that go?" and his own record lists "Send the Westgate quote" and "Call Mama Fresh" only. Amina's own lists, the handover, and the developer API's commitments route (a machine reading for the organisation, not for the person) are unchanged.
- **Leave: what the person owns while away.** The manager's leave request lists what falls in the days asked for. An admin who only reads, and a lead of the same department, were told "Tobi’s target “Tobi to close 8 renewals per quarter” on Engagement Director, first 90 days is due on ..." about a goal Amina had not told Tobi about. Now they read only "Tobi’s target “Lead the client conversations fully” on Engagement Director, first 90 days is due on ...". Amina, and the admin who set the check-in up, read both. The same goes for a commitment copied from such a goal. Nothing is said about what was left out.
- **The invitation page.** Read with the link, before any sign-in. For Tobi, whose only share of the target is the goal Amina has not told him about, `yourNumberIsSeenBy` was "you-and-lead", which the page shows as "Only you and Amina see your share of the target." It is now empty, so the page says nothing about a share; where he also has a share he was told about, it still says it. `leadFirstName` was "Dr" for an account called "Dr Amina Bello", on the page, the expired-link page and the sentence about how often it asks; all three now say "Amina".
- **A wait on somebody's own manager is not a wait on the lead.** The change to request 123 below also read "my manager", "the boss" and "my supervisor" as the check-in's lead, so a wait on Kwame's own manager was put on Bisi by name. Only "the lead", "your lead", "my lead", "our lead" and "the team lead" mean the person who runs the check-in. For a wait on "my manager", Bisi now reads "Kwame Mensah is waiting on their own manager for the signed agreement." (not "waiting on you"), and Kwame reads "You are waiting on your manager for the signed agreement." (not "waiting on Bisi Adeyemi"). A wait on "the lead" still reads "Kwame Mensah is waiting on you for ..." to Bisi and "You are waiting on Bisi Adeyemi for ..." to Kwame. In the request 123 text below, "my manager" and "the boss" no longer count as the lead.
- **The developer API's "my commitments" and the handover brief (second privacy review, finding 1).** `GET /api/v1/commitments/mine`, and the machine read of one person's commitments, listed every row, so a commitment copied before the rule from a goal Amina has not told Tobi about still reached him. Tobi's list read "Close eight renewals a quarter", "Send the Westgate quote" and "Call Mama Fresh"; it now reads "Send the Westgate quote" and "Call Mama Fresh". The successor's handover brief listed the leaver's copy of such a goal too; it now lists only what the leaver promised or was told. This replaces the line above that said the handover and the developer API's route were unchanged. Tests: `public-api/a-copied-goal-not-told-is-not-listed-by-the-api.spec.ts` and `grounds/handover.service.spec.ts`.
- **Which objective an untold goal hides (second privacy review, findings 2, 3 and 4).** Three faults in the match, now one rule in `theObjectiveSaysTheWorkOf`. (2) When the untold goal has a number and no word of work, as in "Sell 200 bags a week.", it was matched against nothing, so Tobi, Chidi and an admin who only reads were served "Tobi needs to sell 200 bags every week."; the number alone now matches it among the objectives Amina set for Tobi, and none of the three reads that sentence. (3) When the untold goal has no number and no word of work, as in "Do more." or "Tobi to take over from Amina.", every objective Amina set for Tobi was hidden, the ones he was told about too; now it hides nothing beyond its own words, and Tobi still reads "Lead the client conversations fully." (4) One shared word was enough to hide a goal: an untold "Own the client renewals." hid Tobi's told "Lead the client conversations fully." Without a number, the objective must now share more than one meaningful word with the untold goal (all of them where it has only one), and an objective that matches a goal he was told about is never hidden. Test: `board/request-125-an-untold-goal-hides-only-its-own-objective.spec.ts`.
- **Who reads a goal the lead has not told the person about (second privacy review, finding 5).** The goal was read only by the lead and the admin who set the check-in up. Decision 5 lets admins see every board and report, decision 86 point 3 gives them the aims and limits, decision 3 gives access by role, and decisions 48 and 56 hide the goal only from "that person". So now every admin of the organisation reads it, and the line "not an admin who only reads" is gone. This replaces the sentence above that said it reads the check-in's lead and the admin who created it, "not every admin of the organisation". One question, `theyRunThisCheckIn`, still answers it everywhere, and now takes the reader's user id, role and organisation. It lets in the lead, the admin who set it up and any admin of the organisation; it keeps out the person it is about, a colleague, a lead of the same department, an admin of another organisation, and an admin who takes part in the check-in as a person (the goal is hidden from that person). On a performance plan, a promotion, a renewal or a probation, an admin reads the goal only if they ran it, set it up or were asked to approve it, as they read the rest of that check-in (decision 5). What an admin who only reads now reads, where the board, the check-in page, the report, the weekly report, Today's "Since the last round" and the leave request used to leave it out: on the board, "Rukia to close 8 renewals per quarter" and "Lead the client conversations fully"; in the weekly report, "Rukia to close 8 renewals per quarter. Rukia Mwangi's count went from 1 to 2 this week."; in the leave request, "Tobi’s target “Tobi to close 8 renewals per quarter” on Engagement Director, first 90 days is due on ...". Tobi, and Chidi as his colleague, read what they read before. The You board (which lists only a person's own goals) and Ask Groundwork's "what came of it" (which the code says is deliberately narrower than the report page) keep the narrower reading: only the lead and the admin who set the check-in up. Tests: `board/request-125-every-admin-reads-the-goal-not-told.spec.ts`; the tests that pinned the narrower reading are changed (`request-125-whoever-runs-it-reads-the-goal-not-told.spec.ts`, `request-125-only-the-untold-goal-itself-is-left-out.spec.ts`, `request-125-only-the-untold-goal-itself-is-left-out-on-the-page.spec.ts`, `a-goal-not-told-stays-with-the-lead.spec.ts`, `a-goal-not-told-stays-with-the-lead-on-the-check-in-page.spec.ts`, `request-125-the-weekly-report-and-a-goal-not-told.spec.ts`, `request-125-what-they-own-while-away-and-a-goal-not-told.spec.ts`). Hiding the goal from the person's colleagues is not in any decision; it is unchanged and listed as row 24 of `docs/privacy-restrictions-for-hafsah.md` for your yes or no.

## Request 123, items 4 and 5: a wait on "the lead", and one wait said once (4 October 2026)

- **A wait on "the lead" is a wait on the lead.** The stored person waited on can be the words "the lead". Amina read "Tobi Adewale is waiting on the lead for ..." and Tobi read "You are waiting on the lead for ..." and "Waiting on: the lead". At the start of every board read, a wait whose person is "the lead" (also "your lead", "my manager", "the boss" and the like, with nobody named) is read as a wait on the check-in's lead. Amina now reads "Tobi Adewale is waiting on you for the commercial terms for each client." and Tobi reads "You are waiting on Amina Bello for the commercial terms for each client." The write side (`conversation.service.ts`) still stores the words; this is fixed where it is read, so rows already stored are covered too.
- **One wait said four ways is one wait.** Open waits by the same person on the same person for things that share at least two words that carry meaning, and at least half of the shorter one's, are one wait: each is said in the fullest words of them, so the board groups them as it groups any wait raised again, and it is blocking if any was. "the commercial terms for each client, including pricing structures and renewal processes", "any historical data related to these aspects", "the commercial terms and historical data" and "the commercial and historical data" are now one item under "What needs you", one blocker (raised four times, from the first date to the last), and one count of how often and how long. Cleared waits are left alone.
Tests: `board/request-123-a-wait-on-the-lead-said-once.spec.ts`.

## Request 123, items 9, 10 and 11: a commitment with its words, the quick read, and the coaching note (4 October 2026)

- **A commitment is never "made a commitment, which is in the record" when its words are known.** Tobi's stored words were "ask Amina to provide me with the commercial terms for each client". They are not his typed words, so no quotation marks are used, and the first-person "me", "my" and "myself" are said about him. Amina reads "In session 2, Tobi Adewale committed to ask Amina to provide them with the commercial terms for each client." and Tobi reads "In session 2, you committed to ask Amina to provide you with the commercial terms for each client." This is in the work plan, the timeline, the risks, the obligations, the blockers and "what happens next". A line with "I" or "we" in it, which cannot be turned safely, is said as before. Test: `board/request-123-a-commitment-is-never-just-in-the-record.spec.ts`.
- **The quick read.** The Blockers tile read "One person is waiting on somebody else, work is held up by the commercial terms ..., including pricing structures and renewal processes. Nothing is hard-blocked.." It now reads "Work is held up by the commercial terms for each client, including pricing structures and renewal processes. Nothing has stopped the work completely." Where nothing is named: "Work is waiting on someone else, and nothing has stopped it completely." One full stop at the end, never two. The existing spec `the-quick-read-counts-the-waits-the-board-counts.spec.ts` checked the old words and is changed to the new ones. Test: `board/request-123-the-quick-read-is-one-sentence.spec.ts`.
- **Jargon in the new hire's coaching.** "Your record looks like management, but not clearly enough to coach against. Nothing below reads you against that; a few more sessions will settle it." is now "What you have said so far fits management, but it is not clear enough yet to coach you on that kind of work. Nothing below reads you against it, and a few more check-ins will settle it." `the-role-map-decides-the-coaching.spec.ts` checked the old words and is changed to the new ones.

**Not done, and why.** (8) "Tobi Adewale is not yet equipped to manage commercial negotiations or renewals. Everybody agrees on this." is a sentence the model writes into the report's agreements. The engine cannot know, from the sentence alone, what is missing, so it cannot turn it into "Tobi does not yet have the commercial terms or the authority to negotiate renewals" without inventing it; the right place is the report prompt (engine prompts, a change needing a re-run) and it is left for Hafsah. The outcome "The new person leaves the role." comes from `resolution/end-states.ts` (not in this change's files) as a fixed label per kind of check-in; naming him there needs a per-person label and the prototype's "Part ways" wording, so it is left for the screens and Hafsah. "Where this is heading" stays off evaluation check-ins (decision 6). Item 12 (the sentence saying the lead's words are hidden) was not asked for in this round.

## Decision 91, wording of the over-time lines on existing check-ins (4 October 2026)

The comparison of the old code against the new on existing check-ins found two faults in sentences stored before the wording rules, which cannot be rewritten because opening a report never rebuilds it. Both are put right where the sentence is served, for every reader.

- **A sentence no longer starts in lower case after a job title.** Rows stored with a job title as the person's label read "Support manager. is waiting on the team responsible for the fix for "a fix for the broken export"; nothing on record about escalating it." and "Account manager for Meridian. is down as ...". The title's full stop is taken out, outside quotation marks only. The lead now reads "Support manager is waiting on the team responsible for the fix for "a fix for the broken export". Nothing on record says anybody has chased it since." and "Account manager for Meridian is down as "Account manager for Meridian" and nothing on record says what that covers." The fix is in `reports/a-stored-sentence-reads-right.ts`, called from the last touch every served report and board sentence passes after the names are put in (`withoutDashes`). Where a name is known, the name is put in first, as before. On the 192 sampled check-ins, a sentence starting in lower case went from 146 served to the number in `docs/existing-users.md` section 7.
- **"Escalating" and its family are said as what happened.** "nothing on record about escalating it" is now "Nothing on record says anybody has chased it since." (the board's "Still open", the report's "Over time", the lead's list of what to settle first, and the person's own waits). The lead's list read "1 thing is waiting on somebody outside this check-in, unescalated." and now reads "1 thing is waiting on somebody outside this check-in, and nothing on record says anybody has chased it." What a person tried about a wait, under the probes, read "Asked, and the record shows no escalation." and "Escalated it."; it now reads "It was asked for, and nothing on record shows it was taken any further." and "It was taken above the person it was with." (and, for several, "All 2 were taken above the person they were with." or "1 of 3 was taken above the person it was with. The others were asked for, and nothing more is on record."). New reports write these words themselves (`what-to-probe.ts`); stored ones are put right when served (`oldWordingPutPlain`, also called by `overTimeAsServed` and `overTimeForThisReader`). The spec `coaching-and-probing-agree.spec.ts` checked the old words "no escalation" and is changed to the new ones. Test: `reports/a-stored-sentence-reads-right.spec.ts`, from the stored sentences of check-in 133ac1 and its neighbours, as the lead and as the person waiting.

## Ask Groundwork: your own leave, requests and what is due (4 October 2026 review, items A2 and A3)

Five questions used to get "I cannot answer that one yet. Here is what I can do with ..." and one got nonsense. Each is now read by the router and answered from the record, in plain sentences, to the person who asked and nobody else. Nothing is written. Four new lanes: `your_requests`, `who_approves`, `what_is_due` and `who_is_away` (`assistant/your-own-requests-asked-about.ts`, `the-router-is-deterministic.ts`, `what-the-assistant-can-do.ts`).

- **"How many days of leave do I have left?"** now reads "You have 17 days of leave left this year, out of 20." With kinds of leave set it reads "This year you have 14 days of annual leave and 10 days of sick leave left." With no number of days set it reads "Your organisation has not set how many days of leave each person has in a year, so I cannot say how many you have left." A guest reads the suite's own sentence, "Only people in this organisation can ask for leave here."
- **"Where is my request to spend?"** now reads "Your request to spend KES 12,000 for fuel is approved by Wairimu and is now waiting for Omar in finance." Asked without saying leave or spending ("Where is my request?"), it lists what still waits first and then what was decided, using the sentences the suites already serve the person. With none, it reads "You have not asked for any leave or to spend anything, so there is no request of yours to look at. Tell me what you need and I will ask the person who decides."
- **"What is waiting for me to approve?"** now reads "One request is waiting for you to approve or decline." and then one line for each, for example "Omar's request to spend KES 12,000 for fuel is waiting for you.", and "Say "approve" or "decline" and I will say back what you are deciding before anything happens." It is only what waits for this reader, taken from the boards' own rule for who decides. With nothing: "Nothing is waiting for you to approve or decline."
- **"Who approves expenses?"** now reads "Your requests to spend go to Wairimu to approve. Anything over KES 50,000 goes to Grace to approve, and then to Omar in finance." For leave: "Your leave requests go to Wairimu to approve." When no manager is set: "Your hours go to an admin to approve, because nobody is set as the person who approves them for you." (and ", and you are an admin yourself" for an admin). It uses the same approval rule that routes the request.
- **"What is due?"** now lists the person's own dated commitments and to-dos, soonest first: "You said you would do “send the price list to Carrefour” by 28 September, and that date has passed." and "Your to-do “book the venue” is on your list by 5 October.", then how many requests wait for their decision, then "One more thing on your list has no date. Ask me what is on your list to see it." With none: "Nothing is due. You have no open commitments or to-dos with a date, and nothing is waiting for you to decide."
- **"Who is off next week?"** used to read "I do not have anybody called "off next week"." It is now read as a question about who is away. An admin reads everyone's approved leave, a lead reads their own team's (both exactly as the leave board serves them): "One person is off next week, from approved leave." and "Baraka Mutua is off from Thursday 8 October to Friday 9 October." Nobody: "Nobody is off next week, as far as approved leave goes." A member or a guest reads only their own leave and "I can only tell you about other people’s leave if you are an admin or a lead." (decision 75, item 28). Dates only, never a reason or a kind of leave.

Tests: `assistant/your-own-requests-through-ask-groundwork.spec.ts`, read as a member, a lead, an admin and a guest.

## Ask Groundwork: leave, spending and hours are read in the ways people say them (4 October 2026 review, item S8)

The same rules, widened, with the rule that nothing is guessed. Five or more phrasings each are tested.

- **Spending.** "Can I buy a new laptop for 95,000?" used to read "I cannot answer that one yet. Here is what I can do with ...". It now reads "You asked to spend KES 95,000 on a new laptop. That is over the Operations budget left for October, which is KES 38,000. Shall I still send it to Wairimu to approve?" (with enough budget: "... Operations has KES 38,000 left for October, so that fits. Shall I send it to Wairimu to approve?"). Also read now: "I need 5000 for airtime", "I’d like to buy a projector for KES 60,000", "Please can I get 15,000 for the team lunch?", "Could I claim 3,500 for taxi fares?", "I want to pay 20k for the venue deposit" and "Can we order 12 chairs for 30,000?" (the 12 is a quantity, the 30,000 is the money). A plain quantity is not read as money: "I need 10 chairs for the office" is not a request to spend.
- **Leave.** "I want to take a week off from 19 October" was read as the one day, 19 October; it is now Monday 19 October to Sunday 25 October, and the say-back shows the exact days before anything is sent. "Could I have the 23rd off?" was not read; it is now read as the next 23rd.
- **Hours.** "Spent 2 hours on Lakeside this morning" (no "I") and "Add 3 hours to Atlas for yesterday" were not read. They are now, and "this morning", "this afternoon", "just now" and "earlier" mean today. "I just worked 4 hours on Lakeside today" is read as well.

Tests: `assistant/ways-people-really-ask-for-leave-spending-and-hours.spec.ts`.

## The Company page: questions that read as sentences, one row for each thing (4 October 2026 review, items C1, C2, C3, C6 and C7)

Found on the Groundwork organisation's own data. Rows already stored are put right as they are served, because opening the page never writes the picture again; a new picture is written the same way (`grounds/the-company-picture.ts`, `the-company-page.ts`).

- **A priority whose owner nobody here matches.** Priority 3 named an owner, "james", who is not one of the people in the organisation. It read "Priority 3 has an owner, but nothing is underneath it and no check-in feeds it." and "For the person who owns it". It now reads "Priority 3 names an owner who is not one of the people in your organisation, and nothing is underneath it and no check-in feeds it." with the question "Who should own priority 3, “The product supports what these ten want to do”?", for leadership ("For you" for the admin). A priority with an owner who is a person in the organisation still reads "has an owner, but nothing is underneath it ...".
- **Titles in questions.** "Which team should take on priority 6, : three customers live on the API?" is now "Which team should take on priority 6, “three customers live on the API”?" and "Should Ten companies lined up for the sprint — Companies attached to the September sprint get a new date, or be closed?" is now "Should priority 1 get a new date, or be closed?" for a priority, or "Should “the old portal” get a new date, or be closed?" for another aim. The leading colon and the dash join are taken off, only the name before a dash is kept, a very long one is cut at a word, and the name goes in quotation marks so it keeps its capitals. The priority card's own title loses a leading colon ("three customers live on the API"), and "What you say" uses the same tidied title.
- **One row for each thing.** There were 11 rows for 6 priorities, each priority twice. A priority that is both without a team underneath it and past its date is now one row: "Priority 1 has an owner, but nothing is underneath it and no check-in feeds it. Its date has passed, and it is not marked as done." The same holds for an aim that sits under no priority and is past its date.
- **"Named by more than one team" and "What you say, and where the time goes" are empty in every local organisation, and that is right, not a fault.** Checked on the local data without writing anything: the Groundwork organisation has 4 check-ins, none tied to a priority, one open handoff and no team set on any member; Meridian is the same. "Named by more than one team" needs the same thing raised in two teams. "What you say" needs check-ins that feed a priority and at least three finished in the last 30 days. Both appear as soon as that data exists (tested in `the-company-picture.spec.ts`).

Tests: `grounds/the-company-page-questions-read-as-sentences.spec.ts`, read as an admin and as a member. Changed tests: `the-company-picture.spec.ts` and `the-company-wide-picture-as-each-reader-reads-it.spec.ts` expected the old raw titles inside questions, so they now expect the quoted titles.

## Requests from the screens builder (4 October 2026, suites, Ask Groundwork and Company page)

Drawn today from what the server already sends: finance's view, the duty holder's Suites page, the reviews board's "not-yet" row, the review's record, correction, briefing and recognise card, the person's own review list, the leave and spending lines (`where`, `owns`, `needs`, `questions`, `said`, kind of leave), the HR list, and each priority's measure, target and levels. Two things the screens cannot draw without the engine:

1. **Ask Groundwork's three suggested questions.** The prototype shows "Why is Green Mart next quarter?", "What should I do next?" and "Will we reach 25?", which name one example deal and one example target. The screen draws three general questions ("What should I do next?", "What is due?", "Will we reach our target?") until the engine serves real ones for the check-in being read, for example `suggestedQuestions: string[]` on `GET /ask`. Say which, and the screen will draw them instead.
2. **The example chats under "How people ask" and "How people use it".** The pages say where requests are made ("In their check-in, in chat, or on WhatsApp. Nobody fills in a form.") but do not draw the prototype's example chat, because its days, names and amounts are made up. If the engine can serve a real example for the organisation (its own approver and balance), the screen will draw it.

Not drawn, and why: a person's own leave and spending requests with an answer box (`GET /suites/leave/mine`, `GET /suites/spend/mine`, with `questionWaiting`) have no screen yet, so a question to a person can be answered on WhatsApp or in Ask Groundwork but not on a page. The Company page's `whatWeKeep` and `owner` are served and not drawn. The Teams and History tabs and "What new people keep asking" wait for Hafsah.


## Dumps and documents: what a lead's long paste or document now does (4 October 2026)

Nothing in `client/` is changed. These are the changes to what is served. Results of the four test dumps are in `docs/existing-users.md`, section 8.

**1. The yes writes the list the lead was shown.** `POST /grounds/:id/context-chat` and Ask Groundwork's add-context lane say back what was found in a paste. The yes used to read the pasted words again, and the second reading is never the same list. The reading the lead was shown is kept for six hours and the yes writes that. No new field.

**2. A number given to a person is theirs only.** `proposal.say` no longer lists a priority's number under "These are for the whole check-in" when it is also listed for its owner. A name in the paste who is not on the check-in is said, with what the paste said for them, and nothing is saved for them. The sentence is now (singular, then plural):

    One name is not on this check-in, so nothing is saved for them yet. If you add them and send this again, I will put their part on too.
    - Hannah Cole (Hires: 6; Turnover: 4)

    2 names are not on this check-in, so nothing is saved for them yet. If you add them and send this again, I will put their part on too.

Sending the same paste again after adding the person now works (it is matched on its words and on who is on the check-in).

**3. Dates are kept.** The line "These are the dates you named. They stay in this conversation and are not put on the record." is now "These are the dates you named. Everyone on this check-in will see these." followed by one plain sentence each ("Quarter ends on 31 December.", "Kemi starts on the 13th.", "Price letter to customers by 10 November."). A yes keeps each as a note (kind `NOTE`, for everyone). A date that a job already carries is not listed twice.

**4. A job has no full stop of its own.** "Call every butchery in Ikeja (by Friday 10 October)", not "Call every butchery in Ikeja. (by Friday 10 October)". A job that belongs to a person who is not on the check-in is no longer listed under "has no owner"; it is listed under that person's name above.

**5. A percentage the model wrote as a fraction.** "Under 5%" is kept as 5, only where the paste or the document says 5%. Otherwise no number is kept and the line reads "tracked rather than counted". It was stored as a limit of 0.

**6. A document the lead adds, in Ask Groundwork.** When a lead who runs the check-in says they have just added a document, and the document has 400 characters or more, Ask Groundwork now says back the whole document as it would a paste (the same `proposal` block, parked as `context`) and the yes writes it. The document's own numbers are then marked taken (`holds.takenAt` and `holds.wholeAt`) so they are not offered again. For anybody else's own document, nothing changes.

**7. A paste is for the check-in it was pasted on.** If a setup conversation was left open on one check-in and the lead pastes from another check-in's page (`groundId` is sent), the old turn is let go and the paste is read for the check-in named. No new field.

**8. In the lead's own session**, a message from the lead of 400 characters or more is answered as before, and the reply now begins with: "That is a lot to read. To put the numbers, dates, decisions and questions in it on this check-in, paste it into Ask Groundwork. It will say back what it found, and nothing is saved until you say yes." (When Ask Groundwork does not take context: "...paste it into the chat on this check-in's Context and resources page. It will say back...") This is in `reply`, before the model's words. Nothing is read or written.

**9. In a plan** (`POST /grounds/:id/plan/proposals`): a goal whose only number is the day of its date ("racking installed by 24 October") is now a commitment with that date, with no number and no `whichWay`. The day of a date is never the number. The prompt also asks for the owner named beside a priority to be the `personName` of each goal under it, and for a number the whole team is held to to be a goal with no person.

**10. What people are told about a check-in** no longer carries a sentence that promises a combined report ("You will receive a consolidated report each time.").

**11. A document's numbers** (`holds.waiting`, `forEverybody`, `forOnePerson`): a number given to a person is no longer also waiting for everyone, and a percentage is kept only as the document writes it.

Prompts for the dump reader (`A_DUMP_PROMPT`), the plan reader (`A_PLAN_PROMPT`) and the document reader (`WHAT_A_DOCUMENT_HOLDS_PROMPT`) are passed straight from the code; the prompt store does not override them, so the file is what runs.

## WhatsApp journeys driven through the signed webhook (4 October, Phase B item 3)

What a person reads on WhatsApp (and, for the first item, in the app) that changed because a journey was driven end to end. Nothing in the board, reports or Today page changed unless it says so.

**1. A photo sent on WhatsApp is called "Your photo".** The person used to read `"image-wamid.HBgM....png" is on your check-in` (a name made from WhatsApp's message number). They now read: "Your photo is on your check-in with your note: The signed order from Green Mart. Only you can see this, and nobody else can open it. Anything it backs up is read against what you said." A document keeps the name its sender gave it (`"renewals-notes.txt" is on your check-in.`). The same sentence about who can see a private document (`whoCanSeeIt` on the upload response, so also in the app) no longer says "It supports your own account": it is "Only you can see this, and nobody else can open it."

**2. The morning reminders, the reminder before a session opens and the lead's summary reach everyone.** They each read the first 500, 200 or 2,000 rows and stopped, so once more check-ins were waiting than that (across all organisations), the same people were read every day and the rest were never written to. They now read every page. Nothing a person reads changed; people who should have had a message now do.

**3. The lead's daily summary on WhatsApp calls the lead "you".** When the lead has a check-in of her own on the check-in, she used to read her own name in the third person: "In "Sales team, Q4", 1 of 4 people have checked in, and Wairimu, Amani and Baraka have not yet." She now reads: "In "Sales team, Q4", 1 of 4 people have checked in, and you, Amani and Baraka have not yet." (and "...2 of 3 people have checked in, and you have not yet." when she is the only one left).

**4. Ask Groundwork no longer takes a question about leave for a request for leave.** "What leave have I asked for, and what was decided?" was answered "I could not tell exactly which days you mean, so I have not sent anything. Tell me the first day and the last day, ...", because a month was found inside a word ("decided" holds "dec"). A month or a weekday now counts only as a whole word. This is the same in the app and on WhatsApp; the question now goes to the usual answer.

**5. "back" with no check-in open on WhatsApp.** The person used to be handed to Ask Groundwork and read "I cannot answer that one yet. Here is what I can do with "back"." and a list. They now read: "You have no check-in open right now, so there is nothing to go back to. Ask Groundwork is still here."

**6. Nothing Groundwork starts reaches an organisation that has not turned WhatsApp on.** The opening notice ("Hi Otto, your check-in for Sales, Plain Goods is open. ...") used to go to the people of an organisation that never turned the WhatsApp add-on on, and so did an approval waiting, a decision told, a question and a review notice, because only the morning reminder, the reminder before a session and the lead's summary asked first. The sender now asks once for all of them. They are not sent and nothing is recorded. The report after a session closes is not held (it went before this release), an organisation that already had a number of its own connected keeps what it had, and a reply to something a person wrote always goes. Nobody is left in silence: a person who writes is answered.

**7. The report that arrives on a phone is sentences, not labels.** A person used to read: "Differences: Nothing to compare yet (3 people have still to answer.)  Movement: Not tracked (Somebody named a number, and nothing is tracking it.) ... Worth having: Which of those conversations ...". They now read the reads as one paragraph of full sentences ("3 people have still to answer. Somebody named a number, and nothing is tracking it. 4 worries are on record, and nobody is waiting on anybody. Nothing said this session has a document behind it.") and the question as "Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?". The report served in the app is unchanged; only the text sent to WhatsApp (`reportAsText`) changed.

**8. "finish" too early, on WhatsApp.** The person used to read the app's refusal: "A few more exchanges are needed before this check-in can close - the record is still thin. Answer one or two more questions, then complete." They now read: "I need a little more from you before this check-in can close. Please answer one or two more questions, then write "finish" again." The app still gets the old sentence from the server (`POST .../complete`, with `canContinue: true`); the screens workspace may want the same plain wording there.

**9. A reminder that reached nobody is still owed.** When the morning job tried to write "your check-in is overdue" and was refused (the person had said STOP, or Meta had not yet approved the template), the refusal was written down and then counted as "the person has had it", so the overdue and due-tomorrow messages were never sent, even after the person wrote START or the template was approved. Only a message that went, or one held by the add-on or the monthly limit, counts now. Nothing a person reads changed; people who should have had a reminder now do.

## Run-29 fixes (4 October 2026)

**1. The guide to the next conversation goes through the same wall as the shared picture.** In the loans check-in, Sunday used to read in his own guide: "Take seriously that your own problem was about timing, but for others, the problem is that they do not have the asset at all, either because it never arrived or because it was stolen." The second half is what happened to the other borrowers. He now reads: "Take seriously that your own problem was about timing." The lead, who may read it all, reads the guide as before.

**2. A name after "says" is the same person, said once.** The lead and the people in the check-in used to read: "Hauwa Ibrahim says Hauwa told the field officer about an income problem", "Jide Sanusi says Jide has not been told about anything that is not written down", "Daniel Park says Daniel has not focused on the social side of the team yet", "Joseph says Joseph assumed someone had told the project manager", "Laura Whitfield says Laura was responsible for the overall success of the launch", "Victor Almeida says Victor has not gotten an update from the team", "Dr Amina Bello says Amina told you this in the interview" and "Musa Danjuma states that Musa never received it". They now read "Hauwa Ibrahim says they told the field officer about an income problem", "Jide Sanusi says they have not been told about anything that is not written down", and so on, with "they" and its verb ("they have", "they were"). No "he" or "she" is guessed. It holds wherever the sentence stands in the report or the board, with or without the word "that", for the lead, an admin and a participant. Somebody else's name after "says" is left alone.

**3. A board never serves an empty line.** Three kinds of line came out with nothing in them. (a) On every board where Groundwork does not yet know what kind of work the check-in is about, each of the six sections ("Deal grid", "Forecast", "Themes", "Work plan", "Timeline", "Obligations") was sent with an empty "holds". The word is now not sent for those sections; each still says, in its own sentence, "Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind." (b) On the sales board, a participant read a difference with four people, two of whom had a name, a mark ("Only someone's word") and no sentence. A side with no words is no longer a side, so that difference now shows Bisi Adeyemi and "You", and the line "who sees it differently" still names everyone who does. (c) On the senior hire board, the goals set by the lead had an empty step, so the screen did not draw them. Such a row is now under "Day 1", the step a goal with no day is given.

**4. The board asks the question the report asks.** On the loans check-in, Sunday's board read "That call has been open a while - what is the decision, and when?", a question written for a founder, while his report asked "For a new loan recipient, what should the period be between receiving their asset and their first repayment being due, and what makes that period the right one?". The lead's board read a third question made from the difference. The board now asks the report's question, for the lead, a participant and an admin. Only a report that has no question yet gets one made from the difference. The three questions written for roles that joined two parts with a hyphen are now two sentences: "That call has been open a while. What is the decision, and when?", "What did that turn into? Was it pipeline, conversion or sign-ups?" and "Last period they committed to something. Did that happen?".

## Gaps closed after the WhatsApp journeys (4 October 2026)

**1. "What can you help me with?" is answered.** "What can you help me with?", "help", "what can you do", "What can I ask you?", "How can you help" and "how do I use this" used to read "I cannot answer that one yet. Here is what I can do with "help"." Whole messages like these now read, for a member in one check-in with leave, spending and hours switched on: "Here is what you can ask me. You are in 1 check-in right now, so you can ask me what you have said in them, what to do next, and how you are doing. Leave, spending and hours are switched on for you, so you can ask for them by saying what you need, ask where a request of yours stands, and ask who approves it. You can also ask me what is due, who is off next week, and how we do things here, and you can tell me to add something to your to-do list. Whatever you ask me stays between you and me." A lead who runs check-ins also reads "You run 2 check-ins, so you can also ask who needs you this week, what is stuck, what people said, and what to talk about next." Anybody with something waiting reads "1 request waits for you to approve. Ask me what is waiting for you to approve, or tell me to approve or decline one." A suite that is off is not offered ("Leave, spending and hours are not switched on for you, so there is nothing to ask for there yet."), and a person in no check-in reads "You are not in a check-in right now, so for the moment you can ask me about your own list and how things work here." The lane is `what_can_you_do`, the same in the app and on WhatsApp. "Help me think through the Q4 target" still goes to its own lane.

**2. An approver can ask a question about a request by replying (on WhatsApp or in Ask Groundwork).** The notice says "Reply here to approve or decline it", but a question could only be asked in the app. Wairimu can now write "question for Amani about her leave: Who will cover the Renewals calls?" (or "ask Omar about spending: is there a cheaper supplier?", or "question: ..." when one request waits). She reads: "You are asking Amani, “Who will cover the Renewals calls?” It is about Amani's leave from Tuesday 3 November to Wednesday 4 November. I will send it as you wrote it, and the request stays waiting for you. Shall I send it?" After her yes she reads: "I have sent your question to Amani. The request is still waiting for you to decide." After her no: "I have not sent it. Amani has not been asked anything, and the request is still waiting for you." Amani is told as she is when the question is asked in the app. It goes through the same `askAQuestion` the app's box uses, which checks again that Wairimu decides the request. With more than one request waiting and no name she reads: "More than one request is waiting for you. One is ..., and the other is ... Which one is your question about? You can write, for example, "question for Amani about leave: ..." with your question after the colon." A question about hours reads: "Groundwork cannot send a question about hours. If something in Amani's hours needs explaining, please ask Amani directly." With nothing waiting: "Nothing is waiting for you to decide right now, so there is no request to ask a question about." Only those two exact shapes are read, and only for a name with a request waiting for the reader, so a question to somebody in a check-in is not taken for this. During her own open check-in on WhatsApp it goes to Ask Groundwork, as "approve" does. Proved through the signed local journey (journey 5, 107 of 107 checks).

**3. "Answer it" on Today opens a page the person can open.** A person with a question waiting on their leave or spending read "Answer it" on Today, which opened the leave or spending board, and a member cannot open a board. It now opens "Your requests" (`/suite/mine`). That page reads `GET /suites/leave/mine` and `GET /suites/spend/mine`. The leave list now also carries `daysLeftSaid`, the sentence Ask Groundwork says ("You have 17 days of leave left this year, out of 20."). Each request shows the server's `where`, its `questions` (the approver's question and the answer), `declinedBecause` ("Wairimu said, “Sales is two short that week.”") and, when a question waits, an answer box that posts to `/suites/leave/requests/:id/answer` or `/suites/spend/requests/:id/answer`. The page is linked from the Suites page (for every reader, including a member, whom that page otherwise refuses) and from Today.

**4. The app and WhatsApp say the same plain sentence when "finish" is too early.** In the app the person never read the server's old sentence ("A few more exchanges are needed before this check-in can close - the record is still thin ... then complete."), but read a different one of the app's own: "Groundwork needs one or two more answers before this can finish. Say a little more and then finish again." They now read, in the conversation, the sentence WhatsApp reads: "I need a little more from you before this check-in can close. Please answer one or two more questions, then finish again." (On WhatsApp the last words are `write "finish" again`.) The server's own sentence on `POST /check-ins/:id/complete` is in `api/src/modules/conversation/conversation.service.ts`, which belongs to the other builder; it is still the old one, and the app does not show it. Whoever next works there should change it to the plain sentence and keep `canContinue: true`.

**5. The example chats under "How people ask" and "How people use it" (a gap, nothing built).** The prototype draws one example chat on the leave, spending, time, to-do and equipment screens, with made-up names and days. The engine cannot send one real recent example from the organisation's own record without breaking a rule Hafsah has decided. What a person asks Ask Groundwork is private to that person, always. What a person says in a check-in may be shown word for word only to the people in that check-in, and a leave or spending request said in a check-in is one of those words. A suite page is read by an admin or a lead who is in neither. The one other place a request is written in the person's words is the request itself (for example "I need next Thursday and Friday off"), and the product does not keep those words: it keeps the days. There is also no place where a person says "you may show this as an example", so the consent the task asks for does not exist yet. Until Hafsah decides what a person may agree to (and whether the example should be written from the days and amounts, not the words), the screens keep the one sentence: "In their check-in, in chat, or on WhatsApp. Nobody fills in a form." Nothing the client shows changed.

## The user journeys walked through the API (4 October 2026, Phase B item 5)

**1. An invitation to a team names the organisation that sent it.** The invitation email to a new colleague read "You've been added to Groundwork on Groundwork", because the name it was given was one the signed-in user does not carry, so it always fell back to "Groundwork". It now reads the organisation's own name from the record. Grace, the admin of Kito Foods, inviting Wairimu now sends Wairimu "You've been added to Kito Foods on Groundwork", and the email's first paragraph begins "Kito Foods added you to their Groundwork workspace." Nothing else in the email changes. (`auth.service.ts`, `teamInvite`; the test is in `team-invite-member-cap.spec.ts`.)

**2. A plan that says "Amani" finds Amani Wekesa on the check-in, before she has opened her invitation.** A lead adds a colleague from the colleague list, who is then on the check-in under the name they have. When the lead pastes a plan that says "Amani, have you sent the Green Mart proposal?", the plan page read back "One name in it, Amani, is not on this check-in", and refused to confirm Amani's goal ("Amani is not on this check-in yet. Add them first, then confirm this."), although the full name "Amani Wekesa" was found. A first name now finds the person by the first word of the name they were added under, and two people who share a first name still match neither. Amani's goal of KES 4.5m and her commitment to send the Green Mart proposal now go on Amani. (`documents/what-a-document-holds.ts`, `whoThisNameIs`; the test is in `what-a-document-holds.spec.ts`.)

**3. Faults found by the journeys that sit in the other builder's part of the code, reported to them and not changed here.** (a) The team report says "Only Amani has contributed to this check-in round; you and Baraka Mutua have not" and, in the same report, "Two of the three people have answered so far", after all three people finished their check-ins (reports, synthesis). (b) The sentence a lead reads when the report is not ready begins a sentence in small letters and is joined with a dash: "The report is written once everybody has answered. one person has not finished yet - you will be emailed when it is ready." (`reports/why-there-is-no-report-yet.ts`). (c) Sharing the team's picture is refused for the person who runs the check-in when their role is "Can open check-ins", with "This action requires one of the following roles: ADMIN" (`reports.controller.ts`, `release`). (d) A goal said as "Credit must stay under 35% of sales" is suggested as "a share to keep at 35% or more", so the board asks "Will we keep credit as a percentage of sales at 35% or more by 27 December?" (`board/an-aim-or-a-limit.ts`, `whatTheWordsSuggest`: a share is tested before a limit). (e) In a check-in, the opening and the replies sometimes read oddly ("What you are trying to achieve this quarter?", "Nothing until the review is a real answer.", "Who owns the numbers for the deliveries?" asked of the person who just said he owns them), and the app still refuses a finish with the old server sentence "A few more exchanges are needed before this check-in can close - the record is still thin." (conversation).

## Fixes after the user journeys (4 October 2026)

**1. A team report written after all three people finished counts all three.** Wairimu, Amani and Baraka had all finished, and the team report still opened "Two of the three people have answered so far." and said "Only Participant A has checked in", which Wairimu read as "Only Amani has contributed to this check-in round; you and Baraka Mutua have not". Two causes. The round was taken from the highest session number of any check-in row, including the next session that is only waiting to be started, so it counted a round nobody had answered. And the report takes minutes to write from the record as it stood when it began, so somebody who finished while it was being written was left out of the report stored after they finished. The round is now the highest session somebody has finished, and when the number of people who have finished is different at the end of a run from the start, the report is written again from the record as it stands (up to three times). The lead, Amani and Baraka now read "All three people have answered." (`reports.service.ts`; the test is `the-count-is-of-the-round-people-finished.spec.ts`).

**2. Whoever runs the check-in can share its team picture.** Wairimu runs the check-in and has the role "Can open check-ins" (a member of the organisation, not an admin). When she pressed "Share the team's picture" she was refused with "This action requires one of the following roles: ADMIN". The route was limited to the admin role before the service could ask who runs the check-in. That limit is taken off the route (`reports.controller.ts`, `release`). The service still decides who may share: the person who runs the check-in, or an organisation admin where that person has left. Amani, who takes part, still reads "Only the person who runs this check-in can share its report. Ask them to share it when they are ready." as before. The test is `whoever-runs-the-check-in-may-share-its-picture.spec.ts`.

**3. A goal said as "stay under 35% of sales" is suggested as a limit.** The board suggested "Credit must stay under 35% of sales" as "a share to keep at 35% or more", and asked "Will we keep credit as a percentage of sales at 35% or more by 27 December?", the opposite of the goal. A limit word is now read before a share. "Under", "below" and "less than" before a number, and "no more than" and "at most", make it a limit. The say-back to the lead now reads: "Credit must stay under 35% of sales" is a limit of 35% not to go over. A name that says a share and no limit ("Credit is 35% of sales") is still a share to keep at 35% or more, and "Pumps sold under the new scheme" is still an aim. (`board/an-aim-or-a-limit.ts` and `board/a-measure-that-goes-down-is-still-going-well.ts`; the test is `a-goal-said-as-under-a-share-is-a-limit.spec.ts`.)

**4. The sentences a lead reads when the report is not ready are plain full sentences.** Before: "The report is written once everybody has answered. one person has not finished yet - you will be emailed when it is ready." Now, with one person left: "The report is written once everybody has answered. One person has not finished yet. You will be emailed when it is ready." With two: "The report is written once everybody has answered. Two people have not finished yet. You will be emailed when it is ready." When nobody has finished: "There is no report yet. Nobody has completed their check-in." When everybody has: "Everybody has answered, and the report is being written. This takes up to a minute. You will be emailed when it is ready." (`reports/why-there-is-no-report-yet.ts`. The existing spec checked the old "2 people have not finished" and "one person has not finished"; it now checks the new sentences, because the old wording is what was wrong.)

**5. "How is the team doing?" is answered for a lead.** Wairimu, who runs "Sales team, last quarter", asked "How is the team doing?" and read "I cannot answer that one yet", with options. "How is the team doing", "how is my team getting on", "how's the team", "how is everyone doing" and "where are we on the quarter" now go to their own lane, `how_is_the_team`. It reads what the board and the latest report of each check-in she runs already say, as she is served them (nothing is rebuilt, and nothing is read that she may not read). She now reads: "Amani says the Green Mart proposal has not gone out yet, and Baraka says nobody told the warehouse about the sales promises. All three people have answered. One thing is in the way. The one that has waited longest is "The Green Mart proposal", since 2 October." and then "This is what your board and your latest report say, and only you can read it here." With more than one check-in each starts "This is about Sales team, last quarter." Somebody who runs no check-in, such as Amani, reads "You do not run a check-in yet, so there is no team for me to tell you about. You can ask me how you are doing, or what you are waiting on." and the board is not read for her. A lead whose check-ins have no answers yet reads "Nobody has answered in the check-ins you run yet, so there is nothing to tell you about the team so far. I will have more once people have finished." The question and the answer stay between the asker and Ask Groundwork. (`assistant/assistant.service.ts`, `howIsTheTeam`; `the-router-is-deterministic.ts`; `what-the-assistant-can-do.ts`; the test is `how-is-the-team-as-each-reader-reads-it.spec.ts`.)

**6. A report never serves an empty line.** In the advisor check-in, Peter, who takes part, was served a report with an empty central question, a finding with an empty headline, and a guide to his next conversation made of three empty lines ("A way to open", "What to acknowledge" and "A question to carry" with nothing under them). The wall that keeps a sentence about somebody else from him took the words out and left nothing behind. At the one door every report read goes through, a blank line is now not a line: a blank item in a list is left out, a blank field is not sent, a block whose every field was blank is not sent (so Peter's guide is not sent, and his screen draws no guide), and the central question is null, which the screen reads as no question. Where the wall emptied the central question, Peter is served none: what the wall took out is never put back to fill the gap. A line that has words is exactly as it was, for the lead, an admin and a participant. (`reports/a-report-has-no-empty-line.ts`, applied in `asItWasShared`; the test is `a-report-has-no-empty-line.spec.ts`.)

**7. The server's sentence for a finish that comes too early is the same plain sentence the app and WhatsApp say.** `POST /check-ins/:id/complete` used to answer "A few more exchanges are needed before this check-in can close - the record is still thin. Answer one or two more questions, then complete." It now answers "I need a little more from you before this check-in can close. Please answer one or two more questions, then finish again." and still says `canContinue: true`. (`conversation/conversation.service.ts`. `a-refusal-that-asks-must-be-answerable.spec.ts` found this refusal by the old words "the record is still thin" and now finds it by the new sentence; the new case is in `the-close-and-the-server-agree.spec.ts`.)

## Requests 127 to 138 (5 October 2026)

### Request 138: answered

**Nothing served changed.** `reports/the-judgement-reaches-a-screen.spec.ts` now checks that `BoardPage.tsx` draws `<TheJudgement it={(b as any).theJudgement}` and that it comes above what people said. It no longer pins the closing `/>`, so a prop such as `hideWhatThisCannotTellYou` does not fail it. The journey and board specs you named (`existing-clients-*`, `pattern-steadiness`, `board/the-board-serves-patterns-under-the-rules`) pass on their own on this side (23 and 26 tests, a few seconds each); the memory failure only shows in one full run of the whole folder, so run them by name, or with `--maxWorkers=3`.

### Request 137: answered

Done in commit 821b0854. The paste-reading prompt now says who owns the numbers in short sentences, so the client's wording guard is back at 60.

## Decision 92 (5 October): approvals go straight away, the plan page takes questions, decisions and dates, and only the person who added a document shares it

**1. An approval is told straight away, whatever else the person has had today.** A person who approves things used to be told "Hi Wairimu, Amani has asked for leave from Tuesday 20 October to Thursday 22 October, and it is waiting for you. Reply here to approve or decline it, or open Groundwork to read it first." only if Groundwork had not already written to them first that day. If it had (a check-in opening, a reminder, the morning summary), the message was held and the request waited for the next morning's summary. It now goes at once, on WhatsApp and in the app. That holds for a request waiting, for a request passed on to the next approver, and for an answer to the approver's question ("Hi Wairimu, Amani has answered your question about ..."). What the person is told about the decision, and the question put to them, were never held, and still are not. An approval does not use up the person's one message of the day either, so a check-in notice or the morning summary still goes after it. Every other message keeps decision 83's limit (one a day, two on a day a check-in opens or closes). "Not now" still holds an approval, because that is the person's own word, and so does "stop". Code: `APPROVALS` in `api/src/modules/whatsapp/a-message-outside-the-window.ts` and `howOftenToday` in `whatsapp.service.ts`.

### One fault in eight requests: "Nobody on record has said who arranged the meetings that happened" (127 item 10, 129 item 4, 130 c, 131 item 2, 132 g, 134 item 2, 135 item 4, 136 item 5)

**What was wrong.** The sentence is only written now where somebody spoke of a meeting, but every check-in you reviewed held a report stored before that rule, and a stored report is not rewritten when a board is opened. `bring-a-check-in-up-to-date.ts` could not fix it, because the sentence is not a row it reads.

**What changed (served).** The sentence is left out when the record, read now, has no meeting in it. This is done when the line is served, not when it is stored, so no script has to be run and no report is rebuilt. It applies to `overTime.toSettleFirst` (the lead's board: "What to settle together") and to `overTime.cannotTellYou` (the lead's board, and a participant's report). Where a meeting is on the record the two sentences are served exactly as before: "Nobody on record has said who arranged the meetings that happened. Ask who secured each one before crediting anybody with them." and "Nobody on record has said who arranged the meetings that happened, so this cannot tell you who secured them." Screens: nothing to change; if the screen kept its own copy of either sentence, remove it. The dry run of the update script saying "Nothing would change" is therefore right; it does not need to.

**2. The plan page takes questions, decisions and dates, as well as goals, roles, commitments and rules.** `POST /grounds/:id/plan/proposals` now reads seven kinds, and the lead still confirms each card on its own, so nothing is stored until a yes. Each card carries `kind` ("question", "decision" or "date"), `says`, `heading`, `landsIn`, `fromThePlan` and, where it applies, `note`. What the lead reads:

- A question for a named person: "Groundwork will ask Aisha: "Which accounts actually have a buying process?"" under the heading "A question, from Q4 notes.pdf. It would go in questions you want asked." with the note "This question is not asked until you confirm it. You can confirm it, change it or leave it out." These are the same sentences the setup chat's paste reader uses. The question is the lead's own words with only a capital letter and a question mark added, and it must be in the plan. A question for nobody in particular is not taken. On a yes it is stored on that person as a question only the lead sees, with its exact sentence, and it is still not asked until the lead confirms that sentence on its own.
- A decision still to be made: "It is not decided yet whether the Lagos target stays at 12m." under "A decision, from Q4 notes.pdf. It would go in still to decide." On a yes it is a line under "Still to decide" that everyone on the check-in can read.
- A date that belongs to nobody and to no measure: "The quarter ends on 31 December." under "A date, from Q4 notes.pdf. It would go in notes." The date is kept exactly as the plan wrote it. On a yes it is a note everyone on the check-in can read.

A name that is not on the check-in is said ("One name in it, Kemi, is not on this check-in. Add them, and this will go on too.") and a question for that name is not stored on anybody else; the yes is refused with "Kemi is not on this check-in yet. Add them first, then confirm this." A date given without being written in the plan, or a question whose words are not in the plan, is dropped, never repaired. When nothing is found the lead reads: "Groundwork found no goals, roles, commitments, rules, questions, decisions or dates in that plan that it could quote back to you." Only the person who runs the check-in reads or confirms any of it, as before. Code: `a-plan-is-many-proposals.ts` and `.service.ts`.

### The headline question on more boards (127 item 1, 129 item 1, 133 item 4, 130 d, 131 item 6)

**What changed (served, `headline` on `GET /board/:groundId`).** Three more kinds of aim are asked, all from the lead's own aim and nothing invented. (1) An aim stored as a finished state, "All 100 tasks for the release are deployed to production.", is asked as "Will all 100 tasks for the release be deployed to production by 30 September?", with its answer and bar. (2) An aim with no number and no deadline is asked without a day, for example "Will we resolve customer issues within a day, without reopening them?" (a support desk or a depot has no deadline). Before, nothing was asked unless the check-in had a deadline; the prototype's support, depot and engineering boards open on a question without one. (3) An aim the lead already put as a question, for example "Is the cohort repaying, and why not where it isn't?", is the question as it is, with no answer and no bars. Where the check-in has no aim at all, `headline` is still not sent. Not done: the founder's aim has no number stored (136 item 1) and the numbers a person says ("11 paying customers") are not counted into it; that is the conversation's count and needs Hafsah's word. The count answer for loans (71 percent repaid) needs the repayment numbers in the record and is not built.

### Request 130 (a): the first count of a number is not a rise

**What changed (served, `objectives[]` on the board, both readers).** Where a number has been counted once and the only count before it is the starting 0 nobody counted, `prevCount` is now null, `delta` is 0 and `journey.start` is null. So `journey.say` reads "It is 81 now, and the aim is 95." and not "It was 0 at the start and is 81 now". The screen should draw no "up from" and no "up 81 this session" when `prevCount` is null or `delta` is 0. From the second count on, nothing changes: it is a rise from the count before.

### The check-in list's latest finding, and the number in the objective line (127 item 8, 129 item 8, 135 item 5, 136 item 8)

**What changed (served, `latestFinding` on `GET /grounds`, every reader).** "The objective is 100 All 100 tasks for the release are deployed to production., and nobody in this check-in..." now reads: The objective, in the lead's own words, is "All 100 tasks for the release are deployed to production", and nobody in this check-in has a number of their own against it. A last sentence with no full stop gets one: The objective, in the lead's own words, is "All 40 traders are fully up to date". It is done when the list is served, so stored reports are right at once; new reports are written with the same wording. Where the objective's name does not hold its number (for example "approved facilities"), nothing changes: "The objective is 40 approved facilities, and nobody...". Not changed here: "You and You are waiting for the signed witness statement" (135 item 5, participant), which is a name pass on a model-written finding and is listed below as open.

**3. A private document becomes shared notes only by a yes from the person who added it.** When somebody says yes to what a document holds (in the setup chat, in a check-in, or in Ask Groundwork), the numbers go on the board and a note goes up for the whole check-in. That write now checks, in one place (`writeADocumentsNumbers`), that the person saying yes is the person who added the document. If not, nothing is written, the document keeps waiting, and the person reads: "Only the person who added this document can share what is in it, so nothing was shared." A document nobody is recorded as having added is shared by nobody. The plan page says the same, as a refusal, when the person who runs the check-in asks it to read a document that is not open to everyone and was added by somebody else. A document opened to everyone on the check-in can still be read there by the lead.

### The question about a call nobody had mentioned (135 item 1, 136 item 4)

**What changed (served, any question on the board).** "That call has been open a while - what is the decision, and when?" (and the same with a full stop) now reads: What is the decision, and when will it be made? It no longer says a call "has been open a while", and no dash joins two pieces. It is done where the text is served, so stored questions are right too, and the founder's coaching question in the role map is worded the same way for new ones. The detection that picks the question is not touched. This is still the founder's question, so on a check-in that is not about a founder's call (loans, request 133 item 1) the question should come from the report; see request 133 below.

### "They" and "their" for the person reading (127 item 5, 129 item 3, 131 item 1; 132 e in part)

**What changed (served, any sentence on the board).** A sentence that begins with "You" or "Your" and names nobody else before the word is now said to you all the way through. "Your goal is not being met, and their own open task is part of the problem." reads "Your goal is not being met, and your own open task is part of the problem." "You have not yet made the visit to Kisumu they said they would." reads "You have not yet made the visit to Kisumu you said you would." On the reader's own row of "Contribution against role" and "Where work is landing", "most of their time" reads "most of your time". Words inside quotation marks are never changed. Not changed: "You said they would write to them" (132 e) and "while you have been working on a different task at their own request" (127 item 5), where "they" may be somebody else; the writer has to say who. That is open.

### Waits that said the holder and the thing as one, and one wait sent twice (127 items 2 and 3, 134 item 1)

**What changed (served, every sentence about a wait: `blockers[].says`, `risks[].says`, `whoWaitedOnWhom[].says`, `dependencies[].waitingSays`, `eachPerson[].says`, `timeline[].says`, `questionsForTheLead[].question`, `obligations`).** Where the holder is only the thing waited for, it is said once. Lead: "Amani Wekesa is waiting for the tax view, and nobody has been named to provide it." The person waiting: "You are waiting for the tax view, and nobody has been named to provide it." "waiting on the pipeline for a fix for the pipeline" reads "waiting for a fix for the pipeline". A holder that is itself a decision ("a decision on who owns them") is waited for beside the thing: "You are waiting for a decision on who owns them, and for owners with dates for the API format and the data structure." The question to the lead reads "What has been tried to get the tax view, which Amani Wekesa is waiting for?" A real holder is unchanged ("waiting on the warehouse for the delivery notes"). Two waits by one person that differ only in a holder that is the thing ("for a fix for the pipeline" and "for the pipeline fix") are now one wait. Stored sentences are put right where they are served. Screens: for `dependencies[].waitingSays` the "on" in "Waiting on" may now be "for"; draw the sentence as it is sent.

### A name said twice in "The team today" and "What the numbers say" (129 item 6, 133 item 3, 135 item 2)

**What changed (served, every sentence on the board).** The rule the reports already follow now runs on the board too, and also handles a few words between "says that" and the second name. "Amani Wekesa says Amani paid 1,200 shillings on Tuesday by M-Pesa." reads "Amani Wekesa says they paid 1,200 shillings on Tuesday by M-Pesa." "Amani Wekesa says Amani is growing maize and soya in Kaduna and Kano." reads "...says they are growing maize and soya in Kaduna and Kano." "Aisha says that for refunds, Aisha closes the ticket..." reads "Aisha says that for refunds, they close the ticket...". No he or she is guessed, so the house style is "they", not the passive form the requests suggested (decided for Hafsah to confirm). Names inside quotation marks, and a sentence that names two people, are not changed.

**Decided for Hafsah to confirm:** "they" for one named person, as the reports already do, instead of rewriting to the passive.

### "Different things about 1 thing" names the thing (129 item 7)

**What changed (served, `whereThisIsHeading.signals[].says`, lead).** With one difference, the line names it from the topic of that difference: "People in this check-in said different things about the refund rule." Where the topic is empty or a whole sentence it reads "People in this check-in said different things about one thing." With several it still counts: "about 2 things."

### The glance counts what the Blockers list holds (132 a and b, 129 item 2 in part)

**What changed (served, `howItIsGoing.glance.inTheWay` on the board, lead and participant).** The one-line header was counted by its own rule, with a bar the Blockers list does not use. So the lead read "1 thing is in the way" over a list of 2, and the person waiting read "Nothing is in the way" over her own blocking wait. For the same reader, `inTheWay.count` is now the number of items in `blockers`, and `oldest` is the oldest one on it when the header had none. With no blockers the count is 0 and `oldest` and `sinceSays` are null. Screens: nothing to change if the header draws `count` and `oldest` as sent. Not covered: request 129 item 2 where `blockers` itself is empty although the board says someone is waiting for a macro Aisha is preparing; the wait is not stored as a wait, and that comes from the conversation, which is not changed here (open).

### Two readings of one fact (132 c)

**What changed (served, `quickRead[]` "Differences" tile, both readers).** The tile already took a difference from the report's opening when the opening said people "disagree" or "differ". It now also takes one said as "They give different numbers for the total plan" (also "different figures", "dates", "amounts", "answers", "views", "costs", "estimates"). The tile then reads "1", with "People said different things about the total plan." instead of "Nobody sees anything differently. The written report finds no disagreement." Where the opening names no difference, the tile is as before.

### The county is not counted as work in itself (132 d)

**What changed (served, `byArea.areas[].says`, lead).** A county's own row is no longer counted as work in the county. "Kiambu County has 1 county on record." reads "Kiambu County is on record, and no piece of work in it is on record yet." Where there are projects, they are counted in their own word: "Kiambu County has 1 project on record." `records` is the count of work in the area, and is 0 for the first sentence.

### "No standard is set" while the lead had set a target (132 g, first part)

**What changed (served, `againstSuccess.saying`, lead only).** When the lead has set a team target and has not written down what success looks like, the target is read as the standard, so "No standard is set. You have not said what success looks like, so nobody is being measured against anything yet." is not sent. Nobody else's report changes (a hidden target is not read for anyone but the lead). Still open in 132 g: "Nobody on record has said who arranged the meetings" is fixed above; "nothing on record says anybody has chased it" said about two things ("them") has no change yet.

### "Chased it" about several things (132 g, second part)

**What changed (served, `overTime.toSettleFirst`, lead).** With more than one thing waiting, the sentence says "them": "2 things are waiting on somebody outside this check-in, and nothing on record says anybody has chased them. Ask what has been tried beyond writing to those people." (and "gone back about them. Ask whether they were raised outside the sessions"). With one thing it is as before. Stored sentences are put right as they are served.

### A colon in the note on an updated round (131 item 3)

**What changed (served, `amendedNote` on the report, every reader).** "Updated after somebody added to or corrected their own check-in. What changed: the shared picture, what was agreed and the question it left open." now reads: Updated after somebody added to or corrected their own check-in. The parts that changed were the shared picture, what was agreed and the question it left open. With one part: The part that changed was the shared picture. Notes already stored are put right as they are served.

### Counts as words in "What you have done" (131 item 4)

**What changed (served, `personHistory[].says`, the person's own row only; the lead never reads the tally).** Only what there is gets a number. "You have answered 2 sessions and made 1 commitment. 0 are done, 0 are not done or dropped, and 1 is still open." reads "...made 1 commitment. None is done yet, and 1 is still open." Other examples: "1 is done." and "2 are done, and 1 is not done or dropped."

### The header says who waits (134 item 6)

**New field (served, `howItIsGoing.glance.inTheWay.says`, every reader of a board).** One finished sentence for the header, from the Blockers list that reader is served. The person waiting reads: One thing is in the way. You have been waiting for the tax view since 29 September. The lead reads: One thing is in the way. Amani Wekesa has been waiting for the tax view since 29 September. With several: 2 things are in the way. The one waiting longest is the tax view, since 29 September. With none: Nothing is in the way. Screens: draw `says` in place of "N things are in the way, the oldest being ...", which said "the oldest" of one thing; `count`, `oldest` and `sinceSays` are unchanged.

### "Your own account" for somebody else's (133 item 2)

**What changed (served, `theJudgement.whatThisCannotTellYou[].toKnow`, lead only).** Under "Who the other trader with the broken freezer is." the line reads "That trader's own account is not in this check-in." and not "Your own account of this is not in this check-in." Under a thing that is the lead's own to say, it is unchanged. Only the one stock sentence is changed, and only where the unknown is who somebody else is.

### Request 128: answered

**1. The 90 days are about the new person, not about the lead (served, `ninetyDays`, both readers).** When whoever runs the check-in also takes part, her own goals are no longer counted. Amina reads "Is Tobi Adewale settled in?", "Is Tobi Adewale doing the job?" and "1 goal was agreed for Tobi Adewale to be met by day 30. It is still open." Tobi reads "Are you settled in?" and "1 goal was agreed for you to be met by day 30. It is still open." Nothing reads "you and Tobi Adewale".

**2. A promise stored as a goal is a commitment (served, `startingState.rows[]`).** "If the information is incomplete, I will follow up with her for the missing details." no longer reads "A goal was agreed for Tobi Adewale." The row has `kind: "commitment"`, `what: null`, and `says` reads (to Amina) Tobi Adewale said, "If the information is incomplete, I will follow up with her for the missing details." and (to Tobi) You said, "If the information is incomplete, I will follow up with her for the missing details." Such a promise is also not counted among the goals in `ninetyDays`. A first-person promise means a sentence that begins with I will, I'll, we will, I am going to, or one of those after "if ...,".

### A line that intends nothing is not typed as an intention (127 item 4, 129 item 5)

**What changed (served, `whoOwnsWhat[].items[].type`, lead and participant).** A line typed INTENT is sent with `type: null` unless its words say something is intended (will, going to, want to, aim, plan, hope, intend, need to, should, next week, by a named day, and the like). So "I close refunds when I send the instruction, because the old rule said so.", "Zainab Suleiman, partnerships." and "I believed Zainab was driving this forward." no longer carry INTENT, and the screen must not say "This is something Aisha Wanjiku intends to do." when `type` is null (say nothing about its kind). The words themselves are not changed. The stored kind (what the conversation wrote) is not changed either; whether the conversation should have typed them so is open, because that is the record reader's work.

### A surname field holding "Lead" (127 item 9)

**What changed (served, every name on the board and in reports).** A last name that is only a role or placeholder word (Lead, Leader, Participant, Member, Admin, Administrator, User, Manager, Owner, Test, Tester, Demo, Staff, Team) is left off, so "Wanjiru Lead has not said it" reads "Wanjiru has not said it". Decided for Hafsah to confirm: this list is a guess at placeholder words; the fix for the account itself is to give Wanjiru her real surname.

**Decided for Hafsah to confirm:** the list of placeholder surnames above.

### The outcomes on a team-goals check-in (130 f)

**What changed (served, `whereThisIsHeading.outcomes` on the board, and `options` on the resolution panel, for check-ins that are about setting goals and keeping the team on track).** The three outcomes follow the prototype's "On course", "Reach it with a change" and "Change the target", said as full sentences: The team is on course. The team can reach it, with a change in how the work is done. The target needs to change. The values are `ALIGNED`, `REACH_WITH_A_CHANGE` (new) and `GAPS_IDENTIFIED`; "It is not settled yet, and more sessions are needed." (`NOT_YET`) stays. Screens: `client/src/lib/end-states.ts` holds its own copy of this list for the resolution panel; update it to match. The prototype's other boards show other outcome names (for example "Start as planned", "Look closer at named areas", "Support named traders"); those belong to other kinds of check-in and are not changed here.

**Decided for Hafsah to confirm:** sentences instead of the prototype's short labels (decision 75, item 48), and a new ending `REACH_WITH_A_CHANGE`. Already-recorded endings keep their value; only the words changed.

### Coaching under "Worth asking" no longer says not to ask (130 e, 134 item 3)

**What changed (served, the coaching probes in a person's report and on the lead's board).** "This early, that is worth showing Amani Wekesa rather than asking about." reads: It is early, so ask Amani Wekesa what is being held up and whether help raising it would be useful. To the person themself: It is early. What is being held up, and would help raising it be useful? The finding that triggers it (a wait with nothing on record about raising it) is not changed. Stored sentences are put right as they are served.

### Clipped quotes in a commitment (136 item 3)

**What changed (served, `workPlan[].says`, `obligations`, `timeline` and wherever a commitment is said; lead and the person).** Where what a person said is only a piece of a sentence, with no full stop, in lower case and with no "I", it is no longer put in quotation marks beside a second quoted time. `In session 1, you said, "send the data room". The time you gave for it was "on Wednesday".` reads: In session 1, you said you would send the data room on Wednesday. Nobody has said yet whether it happened. The lead reads: In session 1, Wanjiru Kamau said they would send the data room on Wednesday. When a whole sentence of theirs is held ("I will send the data room."), it is quoted as before.

### "Nobody answering this check-in" on a check-in of one person, and an aim without a number as the standard (136 item 6; 132 g widened)

**What changed (served, `againstSuccess.saying`, lead).** In a check-in where the lead is the only person, the line reads: You have not said what success looks like yet. It appears here as soon as you do. Until then, the report can say what you have said, but not whether things are going well. It no longer says "nobody answering this check-in has said it either". Also, any team aim the lead set (with or without a number) now counts as what success looks like, so Wanjiru's "Get to 20 paying customers by December." is read as the standard (earlier I read only aims with a number).

### The founder's Work plan holds the commitments from the check-in (136 item 2)

**What changed (served, `workRecords[]` section "Work plan", on the founder's own check-in only).** The table holds the commitments on record as well as the rows added on the board. Each is a row with `kind: "commitment"`, `name` the commitment's own words without "I will" (for example "send the data room"), `owner` ("You" to the founder), `fields["Time given"]` where they gave a time, `fields.Status` (Open, Done, Not done or Dropped), `from: "said"` and `mark: "said"`. A commitment that has the same name as a row already there is not added twice. A lead reads those of the people they may read; a participant reads their own.

### The matter board: `whereTheMatterStands.state` (134 item 7, part)

**New field (served, `whereTheMatterStands.state`, both readers of a law firm matter).** `"filled"` once a deadline, a wait or a decision is on record, and `"none-yet"` otherwise, like the board's other sections. **Not built:** the matter line from the prototype ("Breach of a maize supply contract. High Court, Commercial Division, Nairobi. Stage: pleadings."). The court, the stage and the nature of the matter are not on record anywhere the board reads; only the reply deadline is, and it is already sent in `says` ("The reply to the supplier is due on 2 October."). Needs Hafsah: whether setup should ask for the court and the stage. **The "52 rounds":** the count comes from the length the check-in was set up with (a weekly check-in with no end date plans 52 rounds), not from the reply date; the lead should set the check-in's end date to the reply date if the plan should stop there.

### "Reported against the rules, stage by stage" on every kind with stages (127 item 11)

**New on other boards (served, `reportedAgainstCriteria`).** It was sent only on the sales board. It is now sent on any board whose records have stages (engineering releases and tasks, depot incidents, loans, trader groups), with the kind's own word: "2 tasks were reported at Merged, and none of them has a document behind it." and "1 task was reported at Deployed, and it has a document behind it." `why` reads: Nothing on record says what each piece of work must show at each stage. The board counts what people reported, and how much of it has a document behind it. It cannot count how many meet the rules. With nothing at any stage, `says` is "Nobody has reported a task at any stage yet." (or the kind's word). The sales board is unchanged. Not built: the prototype's stage-by-stage compare with evidence needs rules per stage, which are not on record.

(Also in this commit: the line for one difference on "Where this is heading" names the topic only when the topic is a thing, so a clause such as "There is no agreed owner" is not put after "about"; the first version of that fix, in 129 item 7 above, did so.)

### Corrections after the full run (5 October)

- **"You and You are waiting" (135 item 5, participant).** `latestFinding` on `GET /grounds` now names the reader once: You are waiting for the signed witness statement, and nothing on record says anybody has chased it. (The finding also goes through the same repairs as every other stored sentence.)
- **The first count is a rise-free count only while it is the newest session's (130 a).** The rule applies where the only snapshot is a 0 closed on the newest session and the count is above 0 now. A 0 that an earlier session closed on, followed by a later session, is a real start, and still reads "It was 0 at the start and is 81 now".
- **The kind of a line is changed last (127 item 4, 129 item 5).** `whoOwnsWhat[].items[].type` is set to null at the end of the board, so the kind boards that read it (what each level understood) still see INTENT. "My responsibility is to ensure the system is deployed" and "is to / are to" count as an intention.
- **The placeholder surnames are Lead, Leader, Participant, Member, Admin, Administrator, User, Manager, Owner, Staff and Team** (Test, Tester and Demo are not: they are the surnames of the test fixtures).
- Fixed from the run: a sentence repair that joined paragraphs into one line; one test that pinned the exact source line that serves the finding.

### Headings under "What this cannot tell you" are sentences (131 item 5), and "By site" reads more field names (130 d, part)

**What changed (served, `theJudgement.whatThisCannotTellYou[].about`, lead only).** A piece of a sentence is now a sentence: "the work in Kisumu" reads This check-in cannot tell you about the work in Kisumu. "what is blocking the work" reads This check-in cannot tell you what is blocking the work. A line that is already a sentence is left as it is ("Nobody has said who arranged the visits."). `byArea` now also groups on a record's depot, warehouse, hub or town field as "By site". **Not built (130 d):** the prototype's Themes for depots (incidents by site and type, last 8 weeks) and stages for incidents; neither the type nor the site of an incident is a field the conversation reliably records, so there is nothing to build them from. Needs Hafsah: whether the record reader should be asked to write a site and a type on each incident.

### Status of requests 127 to 138 (5 October 2026)

All served-text fixes are made where the line is served, so rows already stored read right at once; `journey/bring-a-check-in-up-to-date.ts` needed no new rule, and the screens workspace does not need to run it again for these. (It still should be run for the earlier rules in requests 111 and 117.)

| Request | State | Commits |
| --- | --- | --- |
| 127 | Answered, with open parts below | 8b0fc6fe, 7b780610, 0c53cfd2, 134d8030, c4a48fdd, 1ad52a5a, 8a768060, 940995c5, 615fb75f |
| 128 | Answered | 988a77fc |
| 129 | Answered, with open parts below | 8b0fc6fe, 7b780610, 0c53cfd2, 134d8030, 49756eb0, 3c2417d1, 1ad52a5a, 49c2bbfc |
| 130 | Answered, with open parts below | 8b0fc6fe, 89dd6551, 5dd03174, 8c6ab576, 289ce991, 615fb75f |
| 131 | Answered, with open parts below | 8b0fc6fe, 134d8030, 3376bc4c, e15b88fd, 289ce991 |
| 132 | Answered, with open parts below | 8b0fc6fe, 49c2bbfc, f7e24c9b, 89b4d804, 32b74b9e, 4cc8247f |
| 133 | Answered, with open parts below | 7b780610, 49756eb0, b6d409f6 |
| 134 | Answered, with open parts below | c4a48fdd, 5dd03174, 11930784, 7d697ae6 |
| 135 | Answered, with open parts below | 8b0fc6fe, ded89222, 49756eb0, 615fb75f |
| 136 | Answered, with open parts below | 8b0fc6fe, ded89222, 3376bc4c, 4c0c2679, 7e865347, 37a25ce7, 0c53cfd2 |
| 137 | Answered (done earlier) | 821b0854 |
| 138 | Answered | a16f5fba |

**Not changed, and why (open).** 127 item 1: `startingState` on a project board and a headline where the check-in has no aim: nothing on record to build it from, and no screen in the prototype for it. 127 item 5 (participant) "at their own request" and 132 e "You said they would write to them": "they" may be somebody else, so the writer must say who. 127 item 6 "founder or CEO work": it comes from the detected function, which is not changed. 129 item 2: a wait that is only said in a report finding is not a stored wait. 130 b (Aisha's empty `whoOwnsWhat`) and 130 d (Themes, sites and stages for incidents): not reproducible without the screens workspace's data, and no field to build from. 131 item 6: no "Women" share target or county for groups on record. 133 item 1 (a sales question on a loans check-in) and 134 item 4, 135 item 3, 136 item 7 (the model-written judgement miscounts and contradicts itself): these are in the judgement's prompt and the question choice, and need the prompt and a stored prompt version changed together; not touched here. 134 item 5 ("Ask Amani Wekesa to find out who owns this by name"): left, because the existing tests and `reports.service` call it the right first move; Hafsah to decide who should be asked. 136 item 1 numbers (11 of 20) are not counted into the founder's aim.

**Decided for Hafsah to confirm (taken closest to the prototype and her decisions).** (1) "They" for one named person, as the reports already do, instead of the passive. (2) Outcomes for a goals check-in as sentences, with a new ending `REACH_WITH_A_CHANGE`. (3) The list of placeholder surnames. (4) A headline asked without a day where the check-in has no deadline.

## Decision 93: privacy restrictions removed

Hafsah's answers of 5 October to `docs/privacy-restrictions-for-hafsah.md`. Each row below is one commit. What changes is stated per reader, with the fields and the exact sentences.

**Row 1: an admin reads the name of the person waiting.** In "where am I needed", "who is waiting on me" and "what should I do next" (Ask Groundwork, app and WhatsApp), the name of the person waiting is now read by an admin of the organisation wherever the wait was said, even in a check-in the lead set so that people are not named to each other. Before, an admin who was not the lead read "Somebody in Stock review has been waiting on you for the signed budget since 10 September." Now the admin reads "Femi Ade has been waiting on you for the signed budget since 10 September." A participant still reads "Somebody in Stock review ..." where the lead set people not to be named. An admin who is the person an evaluation check-in is about is still never told a colleague's name there (decision 17). Board field `needs[].who` and `needs[].sentence` of `whoNeedsYouThisWeek` carry the same change. No field was added.

**Row 2: waits that Groundwork raised after 14 days.** The group "This has been taken further and is still open" in "where am I needed" (app and WhatsApp), `whoNeedsYouThisWeek` bucket `STUCK_AND_RAISED`, is now read by anybody who asks, not only by whoever runs the check-in. Before, a colleague, an admin and the person a plan was about read nothing of it. Now Grace, an admin, reads "Femi Ade says they cannot go on without the signed delivery schedule for Westgate, and has been waiting on Miriam Njeri for it since 10 September, in the check-in Sales team, Q3. It was still open after 14 days, so Groundwork raised it on 24 September." A reader who may not read names reads "Somebody in Sales team, Q3 says they cannot go on without the signed delivery schedule for Westgate, and has been waiting for it since 10 September. It was still open after 14 days, so Groundwork raised it on 24 September." (the person it waits on is named only when the person waiting is). A person's own wait is never listed to them as somebody needing them. Two things changed for the screens. First, `bucket.asks` now depends on the reader: whoever runs every check-in in the group reads "This has been taken further and is still open, in a check-in you run. Either clear it, or tell the person it is not being cleared."; a reader who runs none reads "This has been taken further and is still open. Whoever runs that check-in can clear it, or tell the person it is not being cleared."; a reader who runs some reads "This has been taken further and is still open. Where it is in a check-in you run, either clear it, or tell the person it is not being cleared." Second, each need in that group carries `youRunIt` (true or false). One thing was kept on purpose: a wait in a performance plan, promotion, renewal or probation check-in is not listed to a reader who is not in it, nor to the person it is about (row 23 is kept, and listing it would say what the Company page refuses to say).

**4. A first name finds a person who was invited by address alone.** The lead's plan said "Amani", Amani Wekesa was on the check-in as an invitation not yet opened (known only by her address, amani.wekesa@...), and the lead read "One name is not on this check-in, so nothing is saved for them yet. If you add them and send this again, I will put their part on too. - Amani (Sales for the quarter: 4,500,000)". She now reads the number on Amani Wekesa. Two people with the same first name still match neither, and the name is said as before. Found in the browser journeys; code in `whoThisNameIs` (`api/src/modules/documents/what-a-document-holds.ts`), used by the paste reader, the plan page and the document reader.

**Row 4: the "waiting to be let in" line, for participants.** The field `waitingToBeLetIn` is now sent to a person who checks in, on all four places it is served: the check-ins list row (`GET /grounds`), the check-in page (`GET /grounds/:id`), the board (`GET /board/:id`, also kept in the participant's own board) and the session report. Before it was null for every participant. Now Amani, who checks in, reads "Faraji Odhiambo is waiting to be let in." where people are named to each other, and "1 person is waiting to be let in." (or "2 people are waiting to be let in.") where they are not; the name is never sent in that case. Kept on purpose: a participant is never told that somebody "was not let in" (a decline), never reads who decided (`notLetInBy`, `notLetInAt` stay for the lead and admins), is never told about their own row, and a guest from another organisation reads null. The lead, the admin who set it up and admins read what they read before.

**Row 8: the full contribution and coverage reads, for an admin.** On the board (`GET /board/:id`), `contribution` and `coverage.reads` are now served in full to an admin of the organisation who has access to the check-in, the same rows the lead reads, with no rating of anyone's answers (a row still reads "Nothing checkable" with what to ask next, never a number). Before, an admin who only read got an empty `contribution` and `coverage.reads` unless they had a row of their own. A performance plan, promotion, renewal or probation is still not opened by an admin who was not given access to it (the board refuses them). A participant still gets only their own row.

**Row 10: "Help nobody mentioned", for an admin.** The board field `helpNobodyMentioned` (`{ lines, why }`) is now sent to an admin who has access to the check-in, as well as to the lead. The admin reads every name, with no "you". For example Juma, an admin, reads "A colleague said Bisi Adeyemi helped them. Bisi Adeyemi did not mention it in their own check-ins." where Bisi, who runs it, reads "A colleague said you helped them. You did not mention it in your own check-ins." Who said it is still never sent. A person who checks in still reads nothing of it.

**Row 9: the lead's sections, for an admin.** Three fields were the lead's alone and are now also sent to an admin who has access to the check-in. (1) `toLookAt`, "What has stayed the same for three check-ins", on the board and on the latest report (`GET /grounds/:id/report`): the same sentences the lead reads, for example "Samuel Kariuki has had the same thing in the way for 3 check-ins." (2) `eachPersonToday` on the board, with `keepsComingUp` under each person. The lead's own `conversationPoints` (the goal not yet told) are not sent to the admin, because that point is the lead's own (decision 56, item 3). (3) `coaching.eachPerson`, "what to ask each person" on the board: the same list for the same people, written with names, for example "Amani Wekesa has been waiting on Rukia Otieno for the price list since 29 September, and nothing on record says it was raised higher.", where Rukia, who runs it, reads "has been waiting on you". `coaching.yours` is still only for a person who takes part. A participant still reads none of the three. The session report's own "what to ask" list is not changed.

**Row 16: "Groundwork suggests recognising", for admins and other leads.** On a review (`GET /suites/reviews/:id`), the field `recognise` is now sent to an admin and to a lead of the person's team who does not write the review, as well as to the writer. It stays behind the same setting (`reviews.recognise`, off unless switched on), the same line (at least nine in ten kept, at least eight settled) and the same timing (once the person has written their view, or three days after the review started). The sentences, for Grace, an admin, and for Leila, a lead who does not write it: headline "Groundwork suggests recognising Aisha’s work", why "Aisha kept nine of the ten commitments made in Wairimu’s check-ins with them in the four weeks before this review started. When at least nine in ten are kept, Groundwork suggests recognising the work.", what would change it "If Aisha keeps fewer than nine in ten of them from now on.", and "This is only a suggestion. Wairimu decides, and Aisha sees the reasons." Wairimu, who writes it, still reads "made in your check-ins together" and "You decide". A lead of another team, a colleague and a guest still cannot open the review. The person's own `recognise` is unchanged.

**Row 17: Groundwork's suggestion about the person, on a review, for admins.** On a review (`GET /suites/reviews/:id`), the field `suggestion` is now sent to an admin who has access to the check-in it was reached on, as well as to the writer. It is the suggestion as the lead reads it, for example headline "Groundwork suggests extra support for Tobi Okafor" and why "In the last four weeks, Tobi Okafor kept two of the six commitments made in this check-in. That is 33%. When fewer than half are kept, Groundwork suggests extra support.", and Tobi's own side beside it, after Tobi has had his turn (or three days). The admin does not get the lead's choices: `ifYouAgree` is null, `otherChoices` is an empty list and `mayChangeTheDecision` is false, because the decision stays with whoever runs the check-in. An admin who was not given access to a performance plan (decision 5), a lead who does not write the review, a colleague and the person themselves read none of it. This also means `latestForTheLeadAbout` now selects `createdByUserId`, `status` and `approvedById` of the check-in.

**Row 15: the manager's words, for the person reviewed.** On the person's own review (`GET /suites/reviews/:id` when the reader is the person it is about), three fields are new. `managersWords` is what the writer wrote, word for word, once they have written it (null until then). `managersWordsHeading` is the prototype's "What Wairimu writes" (null until the words exist). `whereYouDiffer` is null until the writer and the person have each written their view, and then holds `says`: "Wairimu and you have each written your own view of your work. Here they are side by side, so you can see where they differ before you meet.", with `managersWords` and `yourView`, both word for word. Groundwork does not work out which line differs or which view is right; the two are shown side by side, as the prototype's "where she and Wairimu see things differently" does. The list the person finds their reviews in (`GET /suites/reviews/mine`) is unchanged and still says only that a review waits for them. The writer, an admin and a lead of the team read what they read before.

**Row 20: "After a check-in about Kwame is decided."** On the performance reviews board (`GET /suites/reviews`), the sentence `standsSays` for a review that cannot start yet, read by an admin or a lead who does not take part in that check-in, no longer says "After a check-in about Kwame is decided." It names the kind of check-in in its own words, with the person's name and no he or she: "After Kwame’s 90 days are decided." (first 90 days or probation), "After Kwame’s performance plan is decided.", "After Kwame’s contract renewal is decided.", "After the recognition round for Kwame is decided.", and "After the check-in about Kwame is decided." for any other kind. A person who takes part in that check-in still reads its own title ("After “Kwame, first 90 days” is decided."). The title itself is still not sent to the readers who do not take part.

**Row 21: what each client agreed, on the time-sheets board, for leads.** On the board (`GET /suites/time`), the field `agreements` is now sent to a lead as well as to an admin. Before it was null for a lead. Now Wairimu, who leads Sales and approves her team's hours, reads the same list an admin reads, for example `{ client: 'Naivas', work: 'installing 12 freezers', hours: 40, span: 'whole', usedMinutes: 3420 }`, the hours counted against it being the company's, not a person's. She still reads only her own team's hours, still cannot say what a client agreed (only an admin can), and a member who opens the board only because the rules name them to approve still reads `agreements: null`.

**Row 25: "Who is off next week?" in Ask Groundwork, for members.** A member now reads the approved leave of the people in their own team, by first name and dates only, never the kind of leave and never a reason. "Their team" is the staff directory's department; a blank department is nobody's team. Before, Baraka's leave was never said to a member: they read "You are not on approved leave next week. I can only tell you about other people’s leave if you are an admin or a lead." Now Aisha, a member in Sales, asking "Who is off next week?" reads, for example: "One person is off next week, from approved leave." then "Baraka is off from Thursday 8 October to Friday 9 October." Her own leave is listed with the others, in the order the days fall, as "You are off from ...". Where nobody in her team is off: "Nobody in your team is off next week, as far as approved leave goes." A member with no department in the directory, and a guest, read what they read before, including the closing sentence about admins and leads. Waiting and declined requests are never said. Leads and admins are unchanged. There is one new server method, `LeaveBoardService.teammatesOff`, used only by Ask Groundwork; the leave board itself still refuses a member, so no screen field changes.

**Row 14: the forecast and "Where this is heading", for admins.** The forecast (`forecast`), the headline and where each target stands were already sent to an admin of the organisation (decision 86), and still are. What was still held back was `whereThisIsHeading` on the board (`GET /board/:id`): it went only to the lead and the admin who set the check-in up. It now goes to any admin of the organisation who has access to the check-in, for example Juma, who reads "Bisi Adeyemi decides." and "Bisi Adeyemi wrote this down as still to decide.", the same signals the lead reads, and `recordTheDecision` null (only the lead records it). On an evaluation check-in (a performance plan, promotion, renewal or probation) none of it is sent to anyone, as before, and an admin who was not given access to the plan is still not let in to that board. A colleague who checks in still reads none of it.

**Row 23: a performance plan, promotion, renewal or probation on the Company page, for admins with access to it.** On the Company page (`GET /company`), `priorities[].reading` is the sentence on how a priority is moving. It was built with these check-ins left out for everybody. For a priority one of them feeds, a second plain reading is now stored beside it, built from the counts alone and counting that check-in in, and it rests on that check-in too, so it is served only to a reader who may open the check-in: an admin who was given access to it, and the lead who runs it. For example, with a performance plan "Tobi, the next six weeks" feeding priority 1, the admin with access reads the tag "At risk" and "2 check-ins feed this priority, and 5 were finished in the last 30 days. 1 handoff is stopping work on it.", and everybody else still reads the tag "Moving, but not enough of it" and "1 check-in feeds this priority, and 2 were finished in the last 30 days. 1 handoff is waiting on other work." The check-in's name was already shown on the page ("Fed by Sales team, Q3 and Tobi, the next six weeks") to a reader who may open it, and still is. Nothing about the plan reaches the model, the stored row holds no name and no word from the plan, and a person who only takes part in a check-in still reads none of the picture. The other parts of the picture (what more than one team named, where the strategy is not reaching the work, what is said against what is shown) still leave these check-ins out for everyone.


## The anchor scenario: which screens are yours (decision 94, 5 October)

Copied from `docs/anchor-scenario-plan.md` section 5. Everything here stays behind `release.anchorScenario`, off, until Hafsah turns it on. Items blocked by a "Needs Hafsah" question are marked in the plan.


Ready to copy into `docs/answers-from-engine.md`. These are the screens that are theirs. The engine workspace builds none of the `client/` parts, and writes what it changes in the served data in the same commit (decision 84).

| # | Screen | Prototype screen to start from | What is new | Piece |
| --- | --- | --- | --- | --- |
| 1 | The anchor landing page | none; nearest `F3-public-site/home` and `B1-starting-a-check-in/start` | Hafsah's hook words ("Help your team see the bigger picture."), the button, entering the conversation | 2 |
| 2 | The conversation and "Fills in as you talk" | `B1/start-chat` | seven items from section 7 instead of the usual list | 3 |
| 3 | The lead's reveal board, "Help my team understand" | none; nearest `B1/setup` and `B5/board-as-lead` | six parts and "How I'll work with your team" | 9 |
| 4 | Add people, and "Start my Groundwork" | `B1/setup` ("Who's in it") | Hafsah's wording; a limit of 20 with a plain sentence | 11 |
| 5 | The invitation page | `A3/join-invite` | the scenario's invitation words; the privacy sentence waits for Needs Hafsah 1 | 11 |
| 6 | The lead's month board, "Are we moving together?" | `B5/board-as-lead` | the four lenses and the six parts, in sentences | 20 |
| 7 | "Ideas from your team" on the board, and the yes in the check-in | none; reuse a board section's row | new part | 20, 21 |
| 8 | "People helping the team move" | `B5/board-as-lead` ("Help nobody mentioned") | the sentences for each person | 23 |
| 9 | "Groundwork recommends" and "Your team also needed" | `E-suites/suites-lead` for suite names; none for recommendations | new parts, opening a prefilled new check-in | 25, 27 |
| 10 | The two chat buttons ("Request leave", "Create request") | none; the prototype's suites pages are the destinations | buttons inside the conversation | 27 |
| 11 | The person's own Done page line | `B3/done` | one line, only after Needs Hafsah 9 | 18 |
| 12 | The "active" line | `B5/board-as-lead` ("The team today") | one line | 31 |
| 13 | The end-of-month page and the four continue options | `B6/ending-and-probation-review`, `B6/day-30-and-60`, `F2/upgrade` | eight parts, the reveal counts, four buttons | 33 |

Three notes for them. Everything on the page is served by the engine: no screen computes a lens, a count or a recommendation. Everything is hidden when `anchorScenarioOn` is not served as true, so a screen draws nothing for it unless told. No label, score or ranking is ever drawn beside a person, and every sentence is copied from Hafsah's `docs/anchor-scenario.md` or from the prototype's `.txt` files, never from the prototype's code.

## A MarketView Q4 test check-in

Made on 4 October with the engine's scripts, on the local test database `gw_pw9_1786222102` only, so the board can be matched against `docs/prototype/screens/G1-example-check-ins/mvq4.txt`.

**Its id:** `6e84ca43-31d4-4e33-bf38-91defee0543a`. **Its title:** "MarketView, Q4". Its kind of work is MarketView Q4, its situation is "Set goals and keep the team on track", and it runs daily on weekdays.

**Who leads and who takes part.** All three finished their first check-in, with real conversations through the streamed route, and the report was released.

| Role | Name | Sign-in email |
| --- | --- | --- |
| Leads (head of sales) | Wairimu Kamau | `wairimu.mvq4@example.test` |
| Takes part (sales) | Otieno Mwangi | `otieno.mvq4@example.test` |
| Takes part (product) | Naliaka Wekesa | `naliaka.mvq4@example.test` |

**How to sign in as them.** The handover's way: only by emailed link, caught on 127.0.0.1:1025, one catcher at a time, at most 5 sign-in links a minute. There is no password to give out.

**How the system figures got in.** Through the road a connected system uses, never written into a table. The organisation asked for access and it was approved. A credential was issued, a token was taken from `/api/org/v1/oauth/token`, the objective was pushed with `POST /subjects`, the check-in was linked to it with `POST /checkins`, and the figures were sent with `PUT /metrics`. Paystack sent 31 paid subscriptions and 7 renewals paid. MarketView sent weekly users of 148 a week ago and 162 now, and 418 reports downloaded.

**How to make it again on that database.** The API must be running on port 3009 with the same `DATABASE_URL`, `EMAIL_SENDS_FOR_REAL=false` and `GEMINI_LOCATION=global`. Then, from `api/`: `DATABASE_URL=postgresql://<you>@localhost:5432/gw_pw9_1786222102 EMAIL_SENDS_FOR_REAL=false GEMINI_LOCATION=global npx ts-node -T journey/make-a-marketview-q4-check-in.ts`. It takes about ten minutes, refuses any other database, makes a new organisation each time, and prints the new id and emails. Where the emails above exist, the new people get a number added to theirs. Boards are kept in `api/journey/out/mvq4/` (not committed).

**Why the kind needs a step.** MarketView Q4 is hidden at release, so the lead's own control refuses it on this database ("Choose one of these: sales org, engineering release."). The script gives the kind the way `give-each-check-in-its-kind-of-work.ts` does, after the setup reading has finished, because that background reading can finish late and clear the kind. That clearing is a fault in the engine: a slow reading can overwrite a kind the lead has just chosen. I have not fixed it here.

**What the board sends, against mvq4.txt.**

For the lead, `whatTheSystemsShow` is filled with five numbers, each with its source, value, unit, date and a sentence, for example "Paystack shows 31 subscriptions for paid subscriptions this quarter, against a goal of 40, as of 4 October." It also sends the three sentences that say what a number is not. `whereThisIsHeading` is sent with the four outcomes and signals. The ground's goal and the unpaid invoice Sahel Agro (waiting on payment) come through the objective and the signals.

Missing, and why:
- **The table's columns "Target", "Now" and "Against goal"** are not sent as separate fields. The goal ("40", "200") is only inside each number's sentence, because a figure carries no target of its own. The screen would have to read the sentence, which it must not. A target on each figure needs the engine.
- **"Up 12%" and "up from 148 to 162".** The two weekly-user figures are both sent, a week apart, so the change can be shown. The 12 percent is only in the sentence for reports downloaded.
- **"Where what people said and the systems differ"** is sent as "none-yet". The engine only compares what people said with documents on the check-in, never with the figures, so "Paystack shows: two paid, one invoice open" cannot appear. A document on the check-in saying so would fill it. This check-in has none.
- **"What needs you"** is empty (`toLookAt` is `[]`). "One sale named but not paid", "9 subscriptions to go" and "2 renewals not paid" are not built, because the board's deal grid has no subscription rows (no "Said" and "Paid" rows were taken from the conversations) and the forecast says "Groundwork does not keep this yet."
- **"Updated this morning"** is not sent as a field.

For a participant (Otieno), none of `whatTheSystemsShow`, `whereWhatWasSaidAndTheSystemsDiffer` or `whereThisIsHeading` is sent. The engine sends the numbers only to whoever runs the check-in, as the prototype's example is the lead's. His board holds his own deal grid ("Only yours.") and the shared parts.

## 4 October: the reading of the kind of work can no longer undo a lead's choice

Nothing new is served and no field changed. A fault found while making the MarketView Q4 test check-in: the reading of the kind of work at setup checks, before it asks the model, that the lead has not chosen a kind, and then writes its answer after the model replies. If the lead (or a script) chose a kind in those few seconds, the reading wrote over it and cleared or replaced it. The write now says in one statement "only if nobody else has chosen" (`kindOfWorkSetBy` empty or `read`), and the reading leaves alone any kind marked by anyone other than itself. Files: `api/src/modules/grounds/grounds.service.ts` (`readTheKindOfWork`). Test: `the-kind-of-work-is-read-at-setup.spec.ts`. The mocks in that spec, `request-106-the-kind-of-work-can-be-cleared.spec.ts` and `hidden-at-release.spec.ts` gained an `updateMany`, because the write is now one conditional statement.

## 4 October: the anchor scenario's switch (piece 0)

The board now carries `anchorScenarioOn`, a true or false, sent only to whoever runs the check-in (the lead and an admin who set it up), like `kindsOffered`. It is false unless the setting `release.anchorScenario` says `{"on": true}`, and a person in the check-in is not sent it. Nothing else on any board changes with it on or off; a test compares every reader's board both ways. Please read it from the board; the landing and the anchor sections can hide on it. Files: `api/src/modules/admin/what-is-hidden-at-release.ts` (`theAnchorScenarioIsOn`), `api/src/modules/board/board.service.ts`, `docs/deploy.md`.

## 4 October: the anchor lead's conversation (pieces 5, 6 and 7)

Nothing new is served to a screen and no field changed. With the setting `release.anchorScenario` on and the entry conversation started with the situation `HELP_TEAM_UNDERSTAND`, the lead's chat now follows the anchor scenario's words: it finds out by asking how the organisation keeps going (never assuming revenue means sales), challenges the lead once and kindly, and asks the hope question. The chat answer also carries `promptVersionId`, the stored version of those words that ran, for the anchor conversation only. With the setting off, or for any other situation, the prompt is exactly what it was (a test checks every situation).

The words are the stored prompt `anchor_lead_conversation`. Three real conversations were run on a copy of the local database, with the setting on, on port 3010. The leads ran a sales team, a literacy programme funded by grants, and a ministry's programme office. In all three Groundwork asked how the money comes in before saying anything that depended on it, asked one question a turn, and challenged the lead once.

One turn from each, as the lead read it:

- A sales team, after the lead said it was a monthly fee for companies won. "Customers pay a monthly subscription once won. And your team does the prospecting, calls, and demos. What does your group do that keeps that monthly subscription money coming in?"
- An NGO funded by grants, after the lead said the donors read the test scores. "They think it's paperwork, but it's the donors who read those scores and decide on renewal from them. Have you actually told them this?"
- A government programme, after the lead said the sections would arrive in the right shape. "Sections arriving in the right shape and someone flagging problems proactively are what you would notice. Imagine a month from now and this is meaningfully better. What would you notice people doing without you having to ask?"

What is not good enough yet, honestly: the model sometimes asks the hope question again after the lead has already answered it, and the general closing question from the engine's base rules ("what will you do about this, and by when?") still slipped in once in an earlier run; the short reminder read last now says not to, and it has not come back in the last run. The three transcripts are in the session's scratchpad (`anchor-transcript-sales.txt`, `anchor-transcript-ngo.txt`, `anchor-transcript-gov.txt`).

No scenario in `api/journey/all-24` uses the entry conversation (all 24 run signed-in check-ins), so the 24-scenario run and the scorer were not repeated: nothing they read changed.

## 5 October: a person invited by address is named on the board (browser journeys, item 2)

**What was wrong.** The Context tab named two people invited by address "Amani Wekesa" and "Baraka Mutua", and the board called the same two "One colleague" and "Another colleague".

**What changed (served, the board and every report name).** A person with no sign-in name and no name given when invited is now named by the first and last name in their address, the same read the Context tab makes: "amani.wekesa@kito.test" is Amani Wekesa. The order is the person's own name, then the name given when they were invited, then the name in the address. A handle with one word ("sam@"), a desk ("accounts@"), an address with digits ("zawadi.u8@") or a placeholder address still gives "a colleague", "one colleague", "another colleague", because no name is made up. Where the lead set people not to be named to each other, a participant still reads "a colleague" for everybody but themselves and the lead. Code: `reports/the-name-in-an-address.ts`, used by `displayName` in `reports/party-labels.ts` and by `nameOf` in `board/board.service.ts`.

## 5 October: a month, a quarter or a vague time is not a day (browser journeys, item 4)

**What was wrong.** "Tunde Afolabi is joining on November." A month with no day was joined with "on", as if it were a day.

**What changed (served, the dates kept as notes, in the paste reader and on the plan page).** The date is still kept in the words the plan used; only the small word before it is chosen better. A day takes "on": "Tunde Afolabi is joining on 5 November." A month, a year or a quarter takes "in": "Tunde Afolabi is joining in November.", "in November 2026", "in Q4", "in the fourth quarter", "in mid-November", "in early November". The end of a period takes "at the end of": "Tunde Afolabi is joining at the end of the month." Words that already lead stay as they are: "by Friday 16 October", "next week", "this Friday", "in November". "Tomorrow" and "today" stand on their own. A timing with no pattern here (for example "soon") is still joined with a comma, as before. One earlier test read "Hires end of November."; it now reads "Hires at the end of November." Code: `aDateSaid` in `grounds/a-dump-is-many-things.ts`.

## 5 October: a question the lead writes to themselves (browser journeys, item 5)

**What changed (served, the paste reader's say-back and the lead's questions list).** A question the lead puts to themselves in a paste, for example "I need to decide whether we keep the Kisumu contract past March", used to be dropped, because only a question written for a named person was taken. It is now kept on the lead's own row, as a question only the lead sees, and the lead reads in the say-back: You put this question to yourself, so it stays open for you and nobody else is asked it: "I need to decide whether we keep the Kisumu contract past March?" It is the lead's own words, with a capital letter and a question mark added, and no model rewrites it into a question for somebody else. A question for a named person is said as before: Groundwork will ask Amani Wekesa: "Which accounts actually have a buying process?" The instruction to the reader is in the paste prompt `A_DUMP_PROMPT` (in the file; it is not stored as a prompt version). Code: `whatAPasteGives` in `grounds/grounds.service.ts` and `whatWeTookFromThat`.

## 5 October: three lines reworded into plain order (the join's Yoda ceiling)

**What changed (served).** Same meaning, plainer order, no change to who sees what.
- When somebody other than the person who added a document tries to share it, they now read: "Nothing was shared, because only the person who added this document can share what is in it."
- When a week cannot be drafted, the person now reads: "I cannot draft the hours. The record does not say how long anything took, and your organisation has not set the hours asked a week."
- The line under a spending suite now reads: "Spending over what a manager may approve alone goes to three people in order. It goes first to whoever holds that team’s budget, then to whoever looks after finance, and last to the person named on the spending suite."

## 5 October: anchor pieces 15 and 17, the weekly check-in and giving the person agency (behind the anchor switch)

**Nothing changes with the switch off.** The weekly words are used only for a person who is not the lead, in session 2 or later, of a check-in started from the anchor link (`grounds.started_from`, one new empty column, written only when the anchor conversation is saved with the switch on). The assembled prompt of every situation is tested byte for byte the same with the switch off or on.

**What the engine now does for such a person.** It asks what moved since they last spoke, or about something they said they would do, in their own words; it lightly connects what they describe to what they have been told the check-in is for; it asks what they think could happen next; and when what they say is something they could do themselves, it offers their own words back as a commitment. It writes the commitment only after a plain yes, the sentence "I have written that down as something you will do." is written by the product and never by the model, and nothing praises. The words are the stored prompt `anchor_participant_conversation`, and the version that ran is returned with each reply as `promptVersionId`.

**Read in a real run** (port 3011, a local copy of the database, a lead and two people, sessions 2 and 3 for each; transcripts kept in the engine workspace's scratchpad under `weekly/`). Prompt versions: the lead's conversation ran `3c875f3a-6551-4d28-866c-2cf29b0ec633`, the weekly check-ins ran `611c292d-753a-4153-bab9-2dde5fc5b2e8`.
- Opening of the second session (Tunde): "Last time you said "I will ask Ngozi to help me chase the Kano sheets this week." What happened with that?"
- A light connection, then the question that gives him the lead: "That is the kind of situation an early warning is for. What do you think could happen next to get those sheets in?"
- The offer, after he gave his own idea (Ngozi): "You have said you could ask Tunde to forward you the Kano photos the moment they arrive so you can start the Kano tables on Thursday. Would you like me to write that down as something you will do?" After her "Yes": "I have written that down as something you will do." and then "What is the first thing you will do to make that happen?" The row written was her own sentence, exactly as she typed it: "I could also ask Tunde to forward me the Kano photos the moment they arrive, so I can start the Kano tables on Thursday."

**What is not good enough yet, honestly.** The model does not always follow the words read last. In some turns it still asks the engine's own "what will you do, and by when" question first, and in two of the six weekly turns it did not make the offer when the person had named a step of their own. It sometimes grades an event ("That is progress", "is a good sign"); the guidance forbids it, and the carrot principle (Needs Hafsah 5 and 6) is still open. The engine's other guards also sometimes swap a model question for a stock one when a question was asked in an earlier session. An offer that quotes the person's words is now exempt from the guard that cuts a reply for "saying it back", and the product removes a second telling of "written down" from the model's reply.

**For the screens workspace.** Nothing to draw. No served field changed except that a check-in's opening and message replies may carry `promptVersionId` when the anchor's weekly words ran.

## 5 October: anchor piece 24, recommended check-ins (behind the anchor switch)

**Nothing changes with the switch off.** Nothing is looked for, the two routes below answer with an empty list, and the public API's list of recommendations is unchanged for every row it listed before (the new kinds are left out of it, and out of its accept and decline).

**What it does.** When a person completes a check-in started from the anchor link, Groundwork looks once at that one check-in's own record (never another check-in the same people are in) and writes an offer for the lead where the record shows it. Three kinds, stored as `Recommendation` rows with the kinds `anchor_pair_check_in`, `anchor_project_check_in` and `anchor_aim_check_in`, kept under the subject `check-in:<id>`. An offer is made once; a "not now" is never asked again.

**What the lead reads** (only the lead; anyone else is refused):
- Two people with at least two open handoffs between them: "You and Kennedy seem to have different expectations about how work is handed over between you. Two handoffs between you are still waiting." Then: "Would a separate check-in help you align on this?" (Between two colleagues it names both, and says "between them".)
- Four or more people in at least three open handoffs: "Five people are waiting on each other, and several handoffs keep appearing." Then: "Set up a project check-in?"
- An aim nobody owns while at least three people each carry something open: "Nobody has been named as the owner of "Win the Nairobi tender", and three people are each carrying something open. Their responsibilities may not be completely clear." Then: "Set up a check-in for this aim?"
- The two answers are "Yes, set it up" and "Not now".

**Words that differ from the scenario, on purpose.** The scenario says "Ground" and "OKR Ground"; the product says check-in. The scenario's "depends on three people whose responsibilities aren't completely clear" claims a link the record does not hold (a commitment is not tied to an aim), so the sentence says only what is known.

**For the screens workspace (piece 25).** `GET /grounds/:groundId/recommended-check-ins` returns `{ offers: [{ id, kind, says, question, yes, no }] }`. `POST /grounds/:groundId/recommended-check-ins/:offerId/yes` returns `{ state: "ACCEPTED", setUp: { kind, about, aim, people: [{ name, email }] } }`: what the prefilled new check-in starts from, without the lead herself. It creates no check-in and invites nobody; the lead finishes that on the set-up screen. `POST .../:offerId/not-now` returns `{ state: "DECLINED" }`. Code: `detectors/the-anchor-recommendations.ts`, `grounds/recommended-check-ins.service.ts`.

## 5 October: anchor piece 29, the lead's weekly letter by email (behind the anchor switch)

**Nothing changes with the switch off.** The Friday job returns at once and sends nothing. No other email changes.

**What the lead reads.** One email each Friday at three in the afternoon in Lagos, to the lead only, built from the past seven days of the check-ins they started from the anchor link that are still going. It is the prototype's "one weekly letter" (C1, every email and message), in the scenario's words (section 23). Subject: "Your team's week". Body, for a lead with one check-in, when eight of ten people checked in, four said what they will do next, two things were done, three handoffs wait and Omar and Juma did not check in:
- Your team is starting to move.
- This week, 8 of 10 people checked in. Four people said what they will do next. Two things people said they would do were done. Three handoffs are still waiting on someone. Omar and Juma did not check in.
- The link reads "See this week's picture" and opens that check-in's board.

In a quiet week it opens "Here is your team's week." and says "Nobody has checked in this week." With more than one anchor check-in, each is counted on its own under its name in quotation marks, and the link opens the list of check-ins.

**What it never holds.** Nothing anybody said, nothing from Ask Groundwork, no one person's load across check-ins (every check-in is counted on its own, never added to another). It names only the people who did not check in, as the lead's morning WhatsApp already does, and the lead herself as "you". No label and no score. The scenario's lines about ideas, a person who raised a risk and a pattern "Groundwork is working on" are left out until the record can say them (pieces 16, 19 and 22).

**The way to stop it.** It is a mail Groundwork decides to send, so the unsubscribe footer every such mail carries stops it, along with the other mail of that kind. A separate "stop these letters" switch would need a new column and is not built. The weekly WhatsApp insight is not built (Needs Hafsah, item 2). Code: `email/the-leads-weekly-letter.ts`, `EmailService.sendTheLeadsWeeklyLetter`, `GroundsCron.sendTheLeadsWeeklyLetters`.

## Request 146: the client's wording guard

Done. `the-anchor-lead-conversation.ts` now reads, "You need to have been told, in the lead's own words, how the money comes in, before you say anything that depends on it." `the-anchor-weekly-check-in.ts` now reads, "What the group is trying to change: this person has not been told yet. Do not connect their work to a wider aim." The meaning and the quoted words are the same. The guard, its ceiling of 60 and the quoted words are untouched, and the guard passes. The weekly line is built when the conversation runs, so it changes at once. The lead's line is a stored prompt: on next start the library adds the new words as a new version, and a version somebody activated by hand stays active and keeps its own words. The running lead version therefore changes on next start only where nobody activated one by hand. One conversation spec that pinned the old wording of the weekly line was updated to the new capital letter.

## Request 144 (1): a public signal that the anchor scenario is open

**Done.** `GET /entry/anchor-available`, open to a visitor who is not signed in. It answers exactly one field and nothing else:

```
{ "available": true }
```

or `{ "available": false }`. It is `false` whenever the anchor switch (`release.anchorScenario`) is off, missing, or cannot be read, which is today's state. The answer is kept for 30 seconds on the server, so a busy landing page costs one read. It is limited to 60 reads a minute for each address. Nothing else is revealed: no organisation, no counts, no switch name.

What the landing page does with it: when `available` is `false`, send the visitor to `/start` as it does now. Code: `entry/the-anchor-door.ts`, `entry/entry.controller.ts`.

## Request 144 (2) and (3): the anchor entry route, how an anchor draft is marked, and the seven field names

**The route (done).** `GET /entry/anchor-start?source=<mark>`, open to a visitor who is not signed in, 30 a minute for each address. The screen's address `/start/team` (with `?source=founders-whatsapp`) calls it once on arrival. With the anchor switch on it answers:

```
{ "available": true, "scenario": "HELP_TEAM_UNDERSTAND", "startedFrom": "anchor",
  "groundLabel": "Help my team understand", "source": "founders-whatsapp" }
```

`source` is a short mark of letters, digits, dashes and underscores (up to 40, lower-cased), or `null` when none was given or it was not plain. With the switch off it answers 404 with "This way in is not open yet." and nothing is created. It creates nothing in either case: the entry conversation lives in the visitor's browser until she saves it by email, as every entry conversation does, so there is no organisation and no row for a stranger.

**What marks a draft as an anchor one.** The situation key `HELP_TEAM_UNDERSTAND`, which this route hands back as `scenario`. The screen keeps it as the draft's `scenario` and sends it on every entry call (`/entry/onboard`, `/entry/onboard/stream`, `/entry/chat/stream`) and on commit. That key alone makes the conversation run the anchor words (the switch must still be on). When the lead saves, `grounds.started_from` is written as `"anchor"`; this already works (`a-check-in-saved-from-the-anchor-remembers-it.spec.ts`). So the caller in `EntryChatPage.tsx` passes `anchorItems` whenever the draft's `scenario` is `HELP_TEAM_UNDERSTAND`. The source mark travels as `anchorSource` in the draft's payload (`PATCH /entry/draft`) and the engine writes a line to its log when the link is opened from a source. It is not stored on the check-in: that would need a new column, and I have not added one.

**The seven field names.** The screens' names are confirmed except one, which had a stray letter: `whatTheydDoDifferently` is `whatTheyWouldDoDifferently`. The seven keys are `responsibleFor`, `tryingToMove`, `howItContributes`, `seeingToday`, `whyItBothersYou`, `whatTheyDontUnderstand` and `whatTheyWouldDoDifferently`, each a plain string once the conversation has heard it, in the lead's own words. **They are not served yet.** The set-up conversation does not return them, so `anchorItems` stays empty until a later piece extracts them. The type is `TheSevenThingsTheLeadHasSaid` in `entry/the-anchor-served-shapes.ts`. One wording point for the screens: the heading for `howItContributes` must not say "economic engine". The conversation is told never to say it to the lead, and nobody should read it on a screen either. Please use "How this group helps the organisation keep going".

## Request 147: the anchor's served shapes, ahead of the data

Every shape below is a TypeScript type in `api/src/modules/entry/the-anchor-served-shapes.ts`, with its keys pinned by `the-anchor-served-shapes.spec.ts`, so whoever builds a piece serves exactly this. The example sentences are Hafsah's, from `docs/anchor-scenario.md`. **Nothing here is served yet** except what is marked "served already". Where a part is for the lead alone, the field is `null` for anybody else, never filled and hidden on screen.

**Piece 8, the lead's reveal (`TheLeadsReveal`). Shape only.**
Fields: `title` ("Help my team understand"), `subtitle` ("One-month Groundwork"), `carrying`, `whatTheTeamNeedsToUnderstand`, `sharedWithTheTeam` (boolean), `whoYouAreTryingToMove`, `seeingToday`, `whatMeaningfulChangeWouldLookLike` (list of sentences), `whatGroundworkWillExplore` (list of sentences), `howIWillWorkWithYourTeam` (eight items, each `{ key, heading, sentence }`). `carrying` and `seeingToday` are `null` for anyone but the lead. `whatTheTeamNeedsToUnderstand` is `null` for the team until the lead has shared it (decision 96, item 8). The eight items are fixed words, already in the file as `HOW_I_WILL_WORK_WITH_YOUR_TEAM`. Example: `{ key: "followThrough", heading: "Follow through", sentence: "Remember commitments and return to them." }`. The eighth reads: "Show the lead what's happening across the group without turning private check-ins into employee surveillance."

**Piece 10, up to 20 people and the invitation. Partly served.**
- *Served already:* the people step sends `{ contributors: [{ email, colleagueId?, context?, note? }] }` on commit. `context` is the optional "What do they do / why are they part of this?"; `note` is the lead's own note and is never shown to the person.
- *Shape only, `ThePeopleStepRules`:* `limit: 20`, `theLeadCounts: true`, `mayAdd: 19` (the lead plus 19, decision 96, item 3), `heading` "Who needs to be part of this?", `intro` "Add up to 20 people. They don't need to report directly to you—they simply need to be part of the work you're trying to move.", `contextLabel` "What do they do / why are they part of this?", `button` "Start my Groundwork." The limit sentence is `limitSentence`; I propose: "This one-month Groundwork holds 20 people, and you are one of them, so you can add 19 more." Today the check-in limit is 200 and is not yet changed for the anchor.
- *Shape only, `TheAnchorInvitation`:* `subject`, `heading`, `lines` (plain sentences, in order), `leadHasSharedWhatTheyAreSeeing` (boolean), `button`. Example, for Hafsah: heading "Hafsah is trying a different way to help the team get on the same page."; line one "For the next month, Groundwork will check in with each person one to one about the work you're doing, what you're seeing, what's getting in the way and how it connects to the bigger picture." (decision 96, item 1: "one to one", not "privately"); line two, only when the lead has shared what she is trying to get across: "Hafsah has shared what she's trying to get across. Groundwork now wants to understand your side too."; otherwise: "Hafsah wants to hear your side."; line three "There aren't right answers. The point is to help the team understand one another better and make the work move."; `button` "Start your first check-in". The page keeps the prototype's sentence about who can see what.

**Pieces 12 and 13, the month board (`TheMonthBoard`). Shape only.**
`question` ("Are we moving together?"), `weekOfTheMonth` (1 to 4), `lenses` (four items `{ key, heading, question, reading }`), then six lists of plain sentences: `whatIsMoving`, `whatTheTeamIsContributing`, `peopleHelpingThingsMove` (each `{ name, sentence }`), `wherePerspectivesDiffer`, `whatIsStillGettingInTheWay`, `whatGroundworkIsWorkingOnNext`. The four lenses are `understanding` ("Do people see the bigger picture?"), `ownership` ("Are they carrying outcomes rather than only assigned tasks?"), `contribution` ("Are they bringing ideas, insights and help?") and `action` ("Is understanding translating into actual movement?"). `reading` is one plain sentence about what the record shows, never a score or a number out of ten. In weeks one and two, `whatIsStillGettingInTheWay` uses blockers and differences from the record; patterns appear from week three (decision 96, item 14). Example of an entry under people helping things move: `{ name: "Omar", sentence: "Connected a project delay to a renewal risk and raised it before it became a customer issue." }`.

**Piece 30, the "active" line (`TheActiveLine`). Shape only.**
`{ active: 18, total: 20, nudged: 2, line: "18/20 active · Groundwork has nudged the remaining 2." }`. This is Hafsah's own line from the spec. It is a status line, so her wording overrides the house wording rule here (her answer, 5 October). The engine serves exactly that text in `line`, and the screens workspace draws exactly that line. `total` includes the lead and is never more than 20.

**Piece 32, the end-of-month read (`TheEndOfMonthRead`). Shape only.**
`yourOwnWords` (the lead's own words, quoted, under "You wanted your team to understand..."), then the eight parts as lists of sentences: `whatWeFound`, `whatTheyNowUnderstandDifferently`, `whatTheyAreDoingDifferently`, `whatYourTeamContributed`, `peopleWhoHelpedMoveTheThinking` (each `{ name, sentence }`), `whatYouChangedAsALead`, `whatIsStillStuck`, `whatShouldHappenNext`. Then `reveal` with six counts and `continueOptions` with four items `{ key, label }`. The counts are `projectsThatCouldHaveTheirOwnGround`, `sharedObjectivesWorthTracking`, `workingRelationshipsNeedingAlignment`, `activeCommitments`, `teamGeneratedIdeas`, `suitesRelevantToWorkAlreadyBeingDone`. Example: `{ projectsThatCouldHaveTheirOwnGround: 3, sharedObjectivesWorthTracking: 2, workingRelationshipsNeedingAlignment: 4, activeCommitments: 17, teamGeneratedIdeas: 7, suitesRelevantToWorkAlreadyBeingDone: 3 }`, which the screen sets under "This started as one Ground." and closes with "Your team has already started building its Groundwork." The four options are `keepThisGroundRunning` ("Keep this Ground running"), `startRecommendedGrounds` ("Start recommended Grounds"), `turnOnRelevantSuites` ("Turn on relevant suites") and `continueGroundworkForTheTeam` ("Continue Groundwork for the team"); decision 96, item 4: they lead to the existing plan choice, Stripe in test mode only. It is built once from the record and never rebuilt on opening.

## Request 148 (1): a new check-in can start from a recommendation

**Done.** `POST /entry/draft-from-set-up`, for the signed-in lead (20 a minute). The screen sends back exactly the `setUp` that "Yes, set it up" gave it:

```
{ "setUp": { "kind": "anchor_project_check_in",
             "about": "The Nairobi project keeps moving between four people.",
             "aim": "The Nairobi launch",
             "people": [ { "name": "Omar", "email": "omar@acme.org" } ] } }
```

It answers the draft the set-up screen opens with, and creates nothing and invites nobody:

```
{ "initial": "The Nairobi project keeps moving between four people.",
  "aim": "The Nairobi launch",
  "contributors": [ { "email": "omar@acme.org", "displayName": "Omar" } ],
  "leftOut": [ { "email": "zed@elsewhere.com", "why": "Groundwork has no record of Zed in your organisation, so Zed is not added. You can add them yourself on the next step." } ] }
```

**How the screen passes it.** Open the set-up screen with `initial` as the first thing said, keep `aim` as the aim, and put `contributors` in the people step exactly as `commit` takes them (`{ email }`, with `displayName` only for showing the name). Show each `leftOut.why` to the lead as it is. The lead herself is never in `contributors`, and the same address is never listed twice. People are checked against the lead's own organisation (a person with an account in it, or already a guest on one of its check-ins), so the route cannot be used to put a stranger's address into a draft. Anything that is not one of the three recommended kinds is refused with 400. Code: `entry/a-set-up-can-start-from-a-recommendation.ts`.

## Request 148 (2): the check-in page's buttons

**Done in the client, and checked here by counting, not by the live test.** I could not run `e2e/the-prototype-count-of-buttons.spec.ts` (it needs the running app), so please run it. I counted the prototype's Context screen for the lead with the test's own rule by opening it: it has 16 buttons ("Your check-in", "Upload a plan", "Send", "Confirm", "Edit" and "Not now" twice, "Rewrite", "Change", "Decide" twice, "Change who sees them", "Notes on 5 others", and one unnamed one). The product's Context tab for the lead had these that the prototype does not: "Paste a plan instead", "Close", "Say what it assumes", "Something agreed on a call", and a row of five kinds of line to choose from (The strategy, How we work, Still to decide, Not settled, Notes).

Following Hafsah's rule of 30 September (something that sends or changes something stays a button; something that only opens a form, hides one or hands a sentence to the chat is a quiet text link), those five are now quiet text links, `gwui-plain-link`, which the test does not count. The five kinds of line now sit behind one link, "Add a line". Every action is still on the page. Kept as buttons because they send a file or change something: "Upload a plan", "Send", the paperclip, "Delete", "Attach it", "Attach something", "Confirm", "Edit", "Not now", "Rewrite", "Change this". Files: `ThePlanPage.tsx`, `ContextChat.tsx`, `TargetsBand.tsx`, `ContextPage.tsx`. The new spec `the-lead-context-tab-button-count.spec.tsx` renders the lead's tab and keeps it at 14 or fewer, two under the prototype's 16, because the live page adds "Attach it" and "Attach something" for a lead who has promised something. Before the change the same render counted 18.

## Request 142: the MarketView Q4 check-in, as a seed you can load

**Done.** It is a small seed with no model call, exported read only from the check-in `6e84ca43-31d4-4e33-bf38-91defee0543a`, "MarketView, Q4". It holds the organisation, the three people with their memberships, the check-in with its kind of work (MarketView Q4), participants, check-ins, conversation turns, the report and its round, subjects, objectives, the system figures (Paystack and MarketView) and the board's records. Passwords, tokens, invite tokens and credential secrets are left empty, so nobody signs in with a password.

**Who leads and who checks in.** Sign-in is by emailed link, as the handover says.

| Role | Name | Sign-in email |
| --- | --- | --- |
| Leads | Wairimu Kamau | `wairimu.mvq4@example.test` |
| Checks in | Otieno Mwangi | `otieno.mvq4@example.test` |
| Checks in | Naliaka Wekesa | `naliaka.mvq4@example.test` |

**The one command.** From `api/`, with the screens workspace's own database (the migrations must already be applied):

`npx ts-node -T journey/seed-a-marketview-q4-check-in.ts postgresql://localhost:5432/groundwork_dev`

Add your own user name in front of `localhost` if your database needs one. With no argument it reads this computer's own `DATABASE_URL`. It prints how many rows it loaded and the check-in's id. Running it twice changes nothing the second time. The files are `api/journey/seed-a-marketview-q4-check-in.ts` and the JSON beside it; `export-a-marketview-q4-check-in.ts` made the JSON.

**What it refuses.** Any connection string whose host is not exactly `localhost` or `127.0.0.1`. It then says so and reads and writes nothing.

**Checked here.** It loaded cleanly into a new empty database, `gw_seed_empty`, with the migrations applied: 153 rows, one check-in, three people, 51 conversation turns, one report, five system figures. A second load added 0 rows. The database is left in place. I did not make the `gw_seed_test` copy.

**One gap.** The three people have no roster entries (`people` rows) on the source database, so the seed carries none. The memberships and the people's accounts are there.

Hafsah's answer, 5 October: only a database on this computer.

## Privacy sweep, 5 October: fixes, one at a time

### 1. Where people do not see each other, every report read now has the wall of decision 75 item 14

**What changed for a reader.** In a check-in where people do not see each other (a cohort, for example), a colleague used to read the other people's circumstances in the session report, in the rounds and in the read of where things stand against success, and on the phone report that is built from the session report. They read, for example, under what each person said, the lead's lines "Lola is behind on outbound and I keep hearing about the list quality rather than calls made." and "Seyi tells me partnerships are close but nothing has signed.", and in a section, from "One colleague": "I am two instalments behind and I lost 220 birds in month two." They now read none of those sentences. They keep their own words exactly as said, the lead's lines about the plan (for example "I want twelve shops signed by June."), and the counts and patterns across people, as `GET /report` already gave them.

**Who is not changed.** The lead, an admin who reads the check-in, and everyone in a check-in where people do see each other, read exactly what they read before. An evaluation check-in keeps its own rule (decision 17).

**How.** The last read every one of these four goes through (`whatTheLeadHasNotShared` in `reports.service.ts`) now ends in `wherePeopleDoNotSeeEachOther`, which calls the same `askTheReportsDoor` as the board and the check-in page, with the people and the lead's names. The people's own words are held aside while the door runs, so it never rewrites them. Each round is walled on its own, so a round with one sentence about a colleague loses that sentence and is not dropped whole. A report sent without names is scrubbed here too, as it is on the report.

**Tests.** `the-wall-holds-on-every-report-read.spec.ts`. One existing test, `no-internal-label-reaches-anyone.spec.ts`, matched the exact shape of the source (`return withoutLinesWithNoWords(`); the source now stores that result in `const walled` first, so its pattern was updated. It still checks the same thing: labels come off everything served.

### 4. The admin who runs a check-in reads each person's goals on the check-in page

**What changed for a reader.** On a check-in where each person reads only their own numbers (the default), the admin who set it up read, for Tobi, "Nobody has said what success looks like for this person.", though the lead had set goals for him and the admin's own board showed them. They now read his goals, and the one the lead has not told him yet is marked "Not told yet", as the lead reads it. Tobi still never reads the one not told, and a colleague reads none of Tobi's goals.

**Cause.** The page asked whether the reader is the lead when it decided whose goals to hold back (`peersKeepTheirNumbers`), and everywhere else asks whether the reader runs the check-in. It now asks the same question (`viewerRunsIt`, which is `theyRunThisCheckIn`).

**Numbers in a goal's sentence.** The page takes out of a sentence the number of a target its reader may not read. The admin who set the check-in up set those targets, so they now read the sentence whole, as the lead does (for Tobi, "Bring in about $400,000 in new business in his first year."). An admin who only reads still reads it with the number's sentence left out, and a goal whose whole sentence was taken out is no longer served as an empty goal; that person's row reads "What this person is aiming for is set, and it carries a number you are not given on this page."

**Left as it was, and a question for Hafsah.** The table of target numbers on the same page (`objectives`) still shows an admin who only reads the team target and not each person's share. The existing tests (`one-rule-for-whose-share-is-shown.spec.ts` and `a-decision-about-a-person-is-the-leads.spec.ts`) pin that, and say it is waiting on you. Decision 86.3 says admins see the figures on boards. Should the check-in page show an admin every person's share too, never the lead's decision about a person?

**Tests.** `an-admin-who-runs-a-check-in-reads-its-goals-on-the-page.spec.ts`. One existing test, `one-answer-about-whose-numbers-somebody-reads.spec.ts`, pinned the source text `!viewerIsInitiator`; it now pins `!viewerRunsIt` and checks that `viewerRunsIt` is `theyRunThisCheckIn`.

### 2. The check-in page serves what the room is about the way the board does

**What changed for a reader.** `GET /grounds/:id` served the room's read as stored, with every person's full name. A cohort colleague read, beside each aim, who else held it, for example `Pay the loan` held by Halima Sule, Grace Danjuma, Yusuf Garba and Aisha Bello, and what each person named (`bird`, Halima Sule). The person on a first-90-days check-in read `Know how a team member is doing`, held by Hafsah Lead and Priya Nair, which names the colleague giving views. They now read:
- A cohort colleague, Yusuf: `Pay the loan`, held by `You` and 3 others, `clutch`, named by `You`. Nothing that only one other borrower holds or named.
- Tobi on his first 90 days: `Know how a team member is doing`, held by `Hafsah Lead`, and `Get clear information to do my job`, held by `You`. Not Priya.
- The lead and an admin who reads the check-in read every name, as before.

**How.** One function, `theRoomForThisReader` (`board/the-room-for-this-reader.ts`), now serves the board and the page. The board's own code was moved into it without changing what the board serves. On an evaluation check-in only the colleague's name is kept from the person reviewed (decision 17), so the lead's aim stays.

**Tests.** `what-the-room-is-about-on-the-check-in-page.spec.ts`; the board's existing room tests still pass.

### 3. Someone held for a seat reads nothing of the check-in

**What changed for a reader.** A person held for a seat, who had a sign-in, read the board, the reports and the other people's words, for example on "Is the advisor worth the equity", "They stopped inviting me to the monthly call in August.", and on "Tobi in his first 90 days", "I have not sat with him since week two, we had the outage." Only the invitation page and the people waiting for the organisation's approval were turned away. Now every one of these reads answers them with the one sentence the invitation page gives, and nothing else: the board, the check-in page, the report, each session report, the rounds, where things stand against success, the weekly report, and the phone report and Ask Groundwork's report recall, which are built from the session report.

> This check-in cannot start for you yet, because there is no seat for you on the plan. You will get your invitation as soon as there is one.

Everyone else reads exactly what they read before, and a person who is not held is never told this sentence.

**How.** `refuseSomeoneHeldForASeat` (`participants/held-for-a-seat.ts`), asked first by each read, before anything about the check-in is looked up. A lookup that fails refuses, the more private answer. The sentence moved to that file; `participants.service.ts` still exports it.

**Tests.** `nobody-held-for-a-seat-reads-the-check-in.spec.ts`. One existing test, `no-board-is-not-a-permission-problem.spec.ts`, looks at the first 4,000 characters of the board's `get`; the new check made that read longer, so its window is 4,400. What it checks is unchanged.

### 7. An admin without access to a review is told "Check-in not found"

**What changed for a reader.** An admin who was not given access to a performance plan or a first-90-days check-in, and a person who has no part in a check-in at all, read "You are not a participant in this check-in" on its board and report, which told them the check-in exists. They now read "Check-in not found" on both, as on every other route. An admin who was given access, and everyone who takes part, read what they read before.

**Tests.** `an-admin-without-access-is-told-the-check-in-is-not-found.spec.ts`. Four existing tests pinned the old sentence for the board (`an-admin-does-not-read-an-evaluation-check-in-in-grounds-or-on-the-board.spec.ts`, `the-admin-asked-to-approve-reads-what-they-approve.spec.ts`, and two checks in `no-board-is-not-a-permission-problem.spec.ts`, which now find the gate by its condition); they now expect the new sentence. The other routes that still say "You are not a participant in this check-in" (for example the person's own report and rating) are about the person's own record and were not part of this finding.

### 8. The reader is "You" under their own lines in their session report

**What changed for a reader.** In a person's own session report, the lines under "Progress and priorities", "Commitments", "Risks and concerns", "Asks" and "What success looks like" carried their own name as the one who said them (for Yusuf, `"who": "Yusuf Garba"` beside "Sometimes the roads are bad. And the weather."). They now carry `"You"`, so the line under the quote reads "You said this." Other people's lines are unchanged, and the lead reads a participant's lines under the participant's name, as before.

**Tests.** `the-reader-is-you-on-their-own-lines.spec.ts`. The cohort fixture used by the first fix's tests moved to `reports/__fixtures__/a-cohort-for-the-session-report.ts` so the two specs share it.

### 6. Ask Groundwork tells a member with no department that they have no team

**What changed for a reader.** A member with no department in the staff directory, asking "Who is off next week?", read "You are not on approved leave next week. I can only tell you about other people’s leave if you are an admin or a lead." That is wrong for a member (members read their team's leave, decision 93 row 25); there is simply no team to read from. They now read:

> You are not on approved leave next week. You are not in a department yet, so you have no team, and there is no one else’s leave for me to show you.

If they are off themselves, the same sentence follows their own dates. In an organisation that has switched leave off, a member reads what a lead reads ("Leave requests are not switched on in your organisation, so there are no leave days to count."). A guest still reads the old sentence, because a guest is only ever told their own leave (decision 75 item 28).

**Tests.** `your-own-requests-through-ask-groundwork.spec.ts`; the old test of the member with no team pinned the old sentence (a choice, not a decision), so it now pins the new one.

### 5. A name inside a quote is a name, for a reader who may not read it

**What changed for a reader.** A stored report keeps what a person said inside quotation marks word for word, name included (Hafsah's ruling of 27 September: a quote is the person's original words), and the read never rewrote the inside of a quote. So a reader who may not read a colleague's name, for example Tobi on his first 90 days, still read it inside a quote, such as `Priya told me "Tobi has not sat with Priya since week two."`. For that reader the name inside the quote is now swapped for the same plain words the rest of the report uses for that person, and nothing else in the quote changes:

> Priya told me "Tobi has not sat with a colleague since week two." (as Tobi reads it, with "Priya" outside the quotes already turned into "a colleague" by the usual rule)

The lead, an admin who reads the check-in, a reader who may read the colleagues' names where the lead switched that on, and a person reading their own name in a quote, read the quote exactly as it was said. In a check-in where people do not see each other, the whole sentence is already left out by the wall of decision 75 item 14, which now also counts a name inside a quote.

**Storage, and a decision I did not change.** I did not change what is stored. The stored quote keeps the name on purpose (`a-quote-is-what-they-said.ts`: every quote is the person's original words, taken from the record, and the first attempt to rewrite names inside quotes at the read was rejected). Taking names out of quotes at storage would put labels inside what people said, which that ruling forbids, and every read would have to put them back. Because the swap is done on every read of every stored row, no rewrite of stored rows is needed, and `api/journey/bring-a-check-in-up-to-date.ts` is not changed. If you want names taken out of quotes when the report is stored, that reverses the 27 September ruling, so it is your call.

**Tests.** `a-name-inside-a-quote-is-a-name-for-a-reader-who-may-not-read-it.spec.ts`. Also `privacy-isolation.spec.ts` (GW-PRI-01) now expects "Check-in not found" instead of a 403, for finding 7.

### 9. Someone waiting for the organisation's approval reads neither the check-in page nor the weekly report (row 5, kept by decision 93)

**What changed for a reader.** The board and the reports already turned away a person waiting for an admin to let them into the organisation. The check-in page (`GET /grounds/:id`) and the weekly report did not, so that person still read them. They are now refused first, before anything about the check-in is looked up, the same way a person held for a seat is. On the check-in page they read:

> This check-in cannot start until an admin at the organisation that invited you approves you joining it.

On the weekly report they read:

> You can read this check-in's report once an admin at the organisation that invited you approves you joining it.

Everyone who has been let in is unchanged.

**Tests.** `nobody-waiting-for-the-organisation-reads-the-check-in.spec.ts`, which reads the board, the check-in page, the report and the weekly report through the real services as a person waiting and as a person let in.

### 10. An admin who only reads sees the figures on the check-in page, as on the board (decision 86 item 3, decision 93)

**Decided for Hafsah to confirm.** Hafsah was asked on 3 October whether admins, the chief executive included, see the figures on the check-in page as well as on the board and the weekly report, and had not answered. I followed decision 86 item 3 and the admin rows of decision 93, so tell me if you want the narrower reading back.

**What changed for a reader.** On the check-in page (`GET /grounds/:id`) and on the list of check-ins, an admin with access to the check-in now reads the targets table, with every person's share, and the report sentences that carry a colleague's target number, for example "Kwame is aiming for seventeen approved facilities." Before, only the lead and the admin who set the check-in up read them, and an admin who only reads had those sentences taken out.

**What did not change.** A colleague and the person themselves read only what they read before. An admin without access to a review, a first 90 days, a renewal or a promotion is still told "Check-in not found". A decision the lead has to make about a person (Aisha's confirmation, for example) stays the lead's alone, on the page as on the board. The session report is unchanged.

**Tests.** Five existing test files pinned the narrower reading and now pin this one, because the reading was a choice, not one of Hafsah's decisions: `an-admin-who-runs-a-check-in-reads-its-goals-on-the-page`, `a-hidden-target-cannot-slip-through`, `a-target-in-the-leads-words-stays-hidden`, `one-rule-for-whose-share-is-shown`, `a-number-with-a-name-on-it-goes-through-one-rule`.

### 11. Where people do not see each other, a person named by role or not named at all is still one person (decision 75 item 14, second review, finding 1)

**What changed for a reader.** The wall that keeps one person's circumstances from another already held on the latest report. On earlier sessions' reports and on the rounds it found a person only by name, so a cohort colleague still read other people's circumstances written by role ("Outbound Hire: 'I made forty calls this week and got four conversations.'", "One hire (inbound) is closing deals, has proactively shared a demo script...") or as a borrower's own words with no name on them ("I took a loan for battery cages to raise layers in Kaduna..."). A participant there now keeps a sentence only if it is about them, is plainly about several people ("Most people want a later due date.", "3 of 3 people have given an account."), or is the lead's aim or the shared purpose. A sentence about one hire by role, a quote with a role in front of it, and a first-person quote that is not theirs are left out. The session report's written picture, what each settled line and each open question rests on, and the settled list now go through the same wall, on every session and on the rounds. The lead and an admin who runs the check-in read everything whole. Where people can see each other nothing changes.

**Tests.** `a-colleague-by-role-is-still-a-colleague.spec.ts`, which reads session 1's report and the rounds through the real service as Kwame, and the same report as the lead.

## Request 149 (1 of 6): the lead's reveal is served on `/entry/report`

**Done.** `EntryReport.leadsReveal`, only when the situation is `HELP_TEAM_UNDERSTAND` and `release.anchorScenario` is on. With the switch off, or for any other situation, the key is not there at all. Built with no model call, from the lead's own turns and the people she named (`entry/the-anchor-reveal.ts`).

**What the lead reads now.**
- Title "Help my team understand", subtitle "One-month Groundwork", and the eight fixed "How I'll work with your team" lines, as in section 12.
- Who you're trying to move: "You are trying to move Amani Wekesa and Juma Otieno with you." (more than six: the first six and "2 other people"). With nobody named: "Groundwork has not yet heard who you are trying to move with you."
- What meaningful change would look like: her own answer to the hope question, cut into the separate things she said, each as she wrote it. With no answer yet: "Groundwork has not yet heard what you would notice people doing without you having to ask."
- What Groundwork will explore: "Groundwork will start by learning how each person currently sees their work and the wider outcome, and then set what they say beside what you have said."

**What stays empty, and what will fill it.** "What you're carrying", "What you need the team to understand" and "What you're seeing today" read "Groundwork has not yet written down what you are carrying." (and the same for the other two). They need the seven things pulled out of the lead's words, which is a model step (answer 2 below), not built. `sharedWithTheTeam` is always false because nothing records that she has shared anything yet. For any reader who is not the lead, `carrying` and `seeingToday` are `null`, and `whatTheTeamNeedsToUnderstand` is `null` until shared (decision 96, item 8).

**One fix beside it.** `EntryReportSummaryDto` did not declare `leadsReveal`, so saving the report the lead read would have been refused as an unknown field. It is declared now. This also fixes `the-report-you-read-is-kept.spec.ts`, which was already failing because the client's `EntryReport` had the key.

**Tests.** `entry/the-anchor-reveal.spec.ts`: the served text through the real `EntryService.report` for the lead with the switch on and off and for another situation, and the builder as the lead and as the team (a participant or an admin).

## Request 149 (2 of 6): the people step's rules are served when the anchor draft is started

**Done.** `ThePeopleStepRules` is served as `thePeopleStep` on the answer of `GET /entry/anchor-start`, the one call that starts an anchor draft, so it exists only with `release.anchorScenario` on (with it off the call answers 404 and nothing else changes). Code: `entry/the-anchor-people-step.ts`, `entry/the-anchor-door.ts`. The screen can read it from the draft start instead of its own constant.

**What the lead reads now.**
- Heading: "Who needs to be part of this?"
- "Add up to 20 people. They don’t need to report directly to you—they simply need to be part of the work you’re trying to move."
- Label: "What do they do / why are they part of this?"
- Button: "Start my Groundwork."
- When she tries to add a twentieth other person: "This one-month Groundwork holds 20 people, and you are one of them, so you can add 19 more."

**Not done, said plainly.** The server still holds 200 people per check-in (`how-many-people-one-check-in-holds.ts`). The 19-person limit for an anchor check-in is not enforced on commit yet; the screen enforces it. I did not change the commit in this step.

**Test changed.** `the-anchor-door.spec.ts` compared the whole start answer with `toEqual`; it now includes `thePeopleStep`, because the answer has one more key. Tests: `entry/the-anchor-people-step.spec.ts`.

## Request 149 (3 of 6): the anchor's invitation is served on the invitation preview

**Done.** `InvitePreview.anchorInvitation`, on `GET /participants/preview`, only for a check-in with `started_from` "anchor" and only while `release.anchorScenario` is on. Otherwise the key is not there and the answer is exactly what it was. Code: `participants/participants.service.ts` (one block), words in `entry/the-anchor-people-step.ts`. The invitation email's own wording is not changed by this step.

**What the invited person reads now** (for a lead called Hafsah; the first name is the lead's, never a title):
- Heading: "Hafsah is trying a different way to help the team get on the same page."
- "For the next month, Groundwork will check in with each person one to one about the work you’re doing, what you’re seeing, what’s getting in the way and how it connects to the bigger picture."
- Fourth sentence, one of two. Today it is always: "Hafsah wants to hear your side." Once something records that the lead has shared what she is trying to get across, it is: "Hafsah has shared what they are trying to get across. Groundwork now wants to understand your side too." (`leadHasSharedWhatTheyAreSeeing` is false until then.)
- "There aren’t right answers. The point is to help the team understand one another better and make the work move."
- Button: "Start your first check-in"

**What it never holds.** Nothing from the lead's private description of the person (`roleAsDescribed`, `remitAsGiven`), and never the word "privately" (decision 96, item 1). The page keeps the prototype's sentence about who can see what.

**Tests.** `participants/the-anchor-invitation.spec.ts`: the text for an invited person and for an admin invited as a participant, the shared and not shared sentences, and the switch off and not-an-anchor cases. The whole participants folder passes.

### 12. Someone held for a seat reads nothing of the check-in on Today, on You or on the list (privacy row 5, kept by decision 93; second review, new leak A)

**What changed for a reader.** Today checked only whether a person was waiting for the organisation's approval, so a person held for a seat on "Sahar handing finance to Amina" still read the card "The report for Sahar handing finance to Amina is ready", the sentence "All three people agree that the finance role is being handed over from Sahar Bello to you, who is new to the work." and a "Read it" link that the report then refused. You listed the same check-in with its goals. The check-in list, Today and You now leave out, whole, every check-in the reader is held for a seat on. They read no card, no report sentence and no goal from it. They read the one sentence the invitation page gives, if they open the link:

> This check-in cannot start for you yet, because there is no seat for you on the plan. You will get your invitation as soon as there is one.

A person who has a seat reads Today and You as before.

**Tests.** `nobody-held-for-a-seat-reads-the-check-in-on-today-or-you.spec.ts`, which reads the list, Today and You through the real services, as the person held and as a person with a seat.

### 13. A member with no part in a check-in is told "Check-in not found" before its report exists too (GW-PRI-04, second review, new leak B)

**What changed for a reader.** Before a check-in had a report, the report read counted any member of the organisation as having a part in it, so a member with no access read "There is no report yet." and how many people had not finished. Now anyone who may not read the check-in reads the same sentence every other route gives:

> Check-in not found

A person in the check-in, its lead, and an admin who may read it read what they read before. An admin without access to a first 90 days, a review, a renewal or a promotion reads "Check-in not found", as on every other route.

**Tests.** `a-member-with-no-part-is-told-the-check-in-is-not-found.spec.ts`.

## Request 149 (4 of 6): the active line is served on the board

**Done.** `BoardPresent.activeLine`, on the board read, only for a check-in with `started_from` "anchor", only while `release.anchorScenario` is on, and only to whoever runs the check-in (the lead, the admin who set it up, an admin with access). A participant is served no `activeLine` key. With the switch off, or for any other check-in, the board is exactly what it was. Code: `board/the-anchor-active-line.ts`, `board/the-anchor-board-parts.ts` (the one door the anchor's board parts go through), and one call at the end of `board.service.ts` after every wall.

**What the lead reads now.** For five people where three have answered and Groundwork has nudged the other two: "3/5 active · Groundwork has nudged the remaining 2." Hafsah's wording from the spec, as decision 98 says. The same counts are read by an admin, and they hold no name. The other two sentences, said plainly: "3/5 active · Groundwork has nudged 1 of the remaining 2." and "3/5 active · Groundwork has not nudged the remaining 2 yet." With everybody active: "4/4 active."

**Where the numbers come from.** Active is the people who have answered the round that is open, counted exactly as "N of M have answered" counts them (nobody an admin has not let in, nobody away). Total is those same people, the lead included, never more than 20. Nudged is, of those who have not answered, the people whose last nudge (`last_nudged_at`) is since the round opened. It reads the record and writes nothing.

**Tests.** `board/the-anchor-active-line.spec.ts`, through the real `BoardService.get`: the line as the lead and as an admin, no key for a participant, the partial and none cases, and switch off and not-an-anchor. I added two optional fields to the board test harness (`prismaExtras` and `groundRow`) so a spec can give the board a ground started from the anchor; no existing spec uses them.

### 14. Nobody held for a seat is sent a reminder, a session-open message or a nudge (privacy row 5, kept by decision 93; second review, new leak C)

**What changed for a reader.** The morning WhatsApp reminder, the "opens soon" message, the "your session is open" mail and message, the announcement that a round has opened and the reminder that a report is ready to open were sent to people who had not been given a seat yet, and their check-in then refused them. They are now left out of all five. Somebody held for a seat no longer reads, for example:

> Hi there, your check-in for What are your three priorities this is overdue. It's still open, so you can answer here now.

They are sent their invitation as soon as there is a seat for them, as before. People who have a seat read the same messages as before.

**Tests.** `nobody-held-for-a-seat-is-reminded-on-whatsapp.spec.ts`, which runs the morning reminder over four people waiting, two of them held for a seat.

## Request 149 (5 of 6): the month board is served on the board

**Done.** `BoardPresent.theMonthBoard`, only for a check-in with `started_from` "anchor", only while `release.anchorScenario` is on, and **to the lead alone**, as the screens' contract says ("Lead only"). An admin who runs the check-in is served the active line but not this; a participant is served neither. If Hafsah wants an admin with access to read the month board too, it is one word in `board/the-anchor-board-parts.ts` (`readerIsTheLead`). Built from the record, no model call (`board/the-anchor-month-record.ts`, `board/the-anchor-month-board.ts`). The week of the month is read from the record's own clock (when the board last changed), never from the moment it is opened, so two reads of the same record are the same bytes.

**What the lead reads now**, for five people where three have answered:
- Week 1 of the month. "Are we moving together?"
- Understanding: "Groundwork has heard from three of five people." Ownership: "Two of five people have said what they will do themselves." Contribution: "No idea from your team has been captured yet." Action: "One of the things people said they would do is done and one is still open. One handoff is still waiting on someone."
- What's moving: "One of the things people said they would do is done." "One handoff that was waiting on someone has been cleared." "Two people have said what they will do themselves." With nothing: "Nothing has moved yet that the record can show."
- What the team is contributing: "No idea from your team has been captured yet."
- Where perspectives differ: each difference the board already holds, said as `You and Rukia Mwangi see "The renewals target" differently.` With none: "No two people have described the same thing differently so far." With fewer than two accounts: "Groundwork needs at least two accounts before it can show where they differ."
- What's still getting in the way: "Baraka is waiting on Rukia for the sales deck." With none: "Nobody has said that anything is in their way." From week three it also holds what keeps coming up, in the words the board already serves the lead. In weeks one and two it never does (decision 96, item 14).
- What Groundwork is working on next: "Groundwork is checking in with the two people who have not yet answered this round." "Groundwork will ask about the one thing people said they would do that is still open." "Groundwork will ask about the one handoff still waiting on someone." With nothing: "Groundwork is waiting for the first check-ins to come in."

**What stays empty, and which piece fills it.** `peopleHelpingThingsMove` is `[]` until hidden contributors are built (piece 22). "What the team is contributing" says no idea has been captured until ideas are built (piece 19); the shape for them is pinned below. The four lenses are counts said as sentences, never a score; understanding is only "heard from N of M" because nothing yet records whether a person connected their work to the bigger picture (that needs the weekly check-in's own reading).

**Tests.** `board/the-anchor-month-board.spec.ts`, through the real `BoardService.get`: the whole served text as the lead, nothing for a participant or an admin, the same bytes on two reads, week three at sixteen days, and switch off and not-an-anchor; plus the weeks, the patterns rule and the difference sentence on the builder.

## Request 149 (6 of 6): the end of the month is served on the board; the four continue options

**Done.** `BoardPresent.theEndOfMonthRead`, only for a check-in with `started_from` "anchor", only while `release.anchorScenario` is on, to the lead alone, and only once the month has run: twenty-eight days of the record's own clock, or the check-in has ended. Before that, the key is not there. It also needs the lead's own first words to begin with; with none, it is not served. Built from the record with no model call and read at the record's own clock, so opening it never rebuilds it and two reads of the same record are the same bytes (`board/the-anchor-end-of-month.ts`).

**What the lead reads now**, for five people where three answered:
- `yourOwnWords`: her first words to Groundwork, exactly as she wrote them (cut at a sentence end past 400 characters). These are her words alone, with no quotation marks and no lead-in: the screen already sets "You wanted your team to understand..." above them and quotes them, so the pinned comment on `yourOwnWords` in the shapes file, which says the lead-in is part of the field, is not what the screen reads. I followed the screen.
- What we found: "Groundwork heard from three of five people over the month." (and, where there are some, "Two things are seen differently by different people.")
- What they now understand differently: "Groundwork does not yet keep how each person saw things at the start, so it cannot say what changed in what they understand."
- What they're doing differently: "Two people said what they would do themselves." "One of the things people said they would do was done." "One handoff that was waiting on someone was cleared." With nothing: "Nothing has been recorded yet that people are doing differently."
- What your team contributed: "No idea from your team has been captured yet."
- People who helped move the thinking: empty.
- What you changed as a lead: "Groundwork does not yet keep what changed in how you lead, so it has nothing to say here."
- What's still stuck: open handoffs and what keeps coming up, as in the month board. With none: "Nobody has said that anything is still in their way."
- What should happen next: "Groundwork found one piece of work that could have a check-in of its own." and "One of the things people said they would do is still open." With neither: "Keep checking in each week, so the record carries on from here."
- This started as one Ground: the counts come from the record. Projects, shared objectives and working relationships are the check-in offers Groundwork made (piece 24: a piece of work four people are tangled in, an aim nobody owns, two people who keep waiting on each other), the active commitments are the things people said they would do that are still open. Ideas and suites are 0 for now.
- The four options, as written: "Keep this Ground running", "Start recommended Grounds", "Turn on relevant suites", "Continue Groundwork for the team".

**What stays empty, and which piece fills it.** Ideas (piece 19) fill the idea count and "What your team contributed". Hidden contributors (piece 22) fill "People who helped move the thinking". A stored "before" at the start of the month (piece 25) fills "What they now understand differently", and the setup reading at the end (decision 64) fills "What you changed as a lead". The suites count waits for pieces 26 and 27.

**Answer (3): where the four continue options should open, using routes that exist.**
- "Keep this Ground running" opens the plan choice, `/settings/billing` (`BillingPage`, with `/billing/checkout` after it; Stripe in test mode only, decision 96 item 4).
- "Continue Groundwork for the team" opens the same plan choice, `/settings/billing`. The two options are the same page today; that is honest until Hafsah says what "keep this Ground running" should do differently.
- "Start recommended Grounds" opens the board `/grounds/:id/board`, where "Groundwork recommends" lists the offers (`GET /grounds/:id/recommended-check-ins`), and the lead's yes there goes to `/new/setup` through `POST /entry/draft-from-set-up`.
- "Turn on relevant suites" opens the Suites page, `/settings/suites`.

**Tests.** `board/the-anchor-end-of-month.spec.ts`, through the real `BoardService.get`: the whole served text as the lead, none for a participant or an admin, not served before the month has run, served early when the check-in has ended, and switch off, not-an-anchor and no words of hers.

## Request 149, missing (1): the pinned shapes for "Ideas from your team" and the yes in the person's check-in. Shapes only

**Shapes only. Nothing is stored or served.** Both are types in `api/src/modules/entry/the-anchor-served-shapes.ts`, with their keys pinned in `the-anchor-served-shapes.spec.ts`. Ideas need their own record (piece 19), so there is nothing to serve yet. Following decision 96, item 10: a captured idea is seen by everyone in that check-in, with "Raised by <name>", and only after the person says yes. Before the yes, nothing exists for anybody to read.

**"Ideas from your team" (`TheIdeasFromYourTeam`), to be served as `BoardPresent.ideasFromYourTeam`.** `heading` "Ideas from your team"; `ideas`, each `{ id, title, raisedBy, similarNeedsSentence }`; `whenThereAreNone`. Example from the scenario: title "Client review one month before project close", `raisedBy` "Raised by Lucy.", `similarNeedsSentence` "Similar needs have appeared across three check-ins." (null when it has appeared once; it never names anybody). `whenThereAreNone` is "No idea from your team has been captured yet.", the same sentence the month board already uses.

**The yes in the person's check-in (`TheIdeaOfferInTheCheckIn`), to be attached to the reply that offers it.** `{ idea, question, whoWillSeeIt, yes, no }`. `idea` is the person's own words, so they see exactly what would be captured. `question` is the scenario's: "That sounds like a concrete idea. Want me to capture it for the team?" `whoWillSeeIt` is a proposal: "Everyone in this check-in will see it, with your name on it." `yes` is a proposal: "Yes, capture it"; `no`: "Not now". It is served to that person alone, in their own check-in. A "Not now" leaves nothing behind. Please tell me if you want different button words.

## Request 149, missing (2): the seven fields in the set-up conversation

**Serving them needs the model, so I have left them for after the scenario run.** The seven things (`responsibleFor`, `tryingToMove`, `howItContributes`, `seeingToday`, `whyItBothersYou`, `whatTheyDontUnderstand`, `whatTheyWouldDoDifferently`) are the lead's words pulled apart by sense, which code alone cannot do without guessing (decision 12 and the rule that the conversation stays model-led). Until they are extracted, the reveal's "What you're carrying", "What you need the team to understand" and "What you're seeing today" say they are not written down yet, and `anchorItems` stays empty. Nothing is invented in their place. When they are built, the reveal's three parts fill from them with no change to the shape.

## Privacy row 5 (kept by decision 93): someone waiting for the organisation's approval is held like someone held for a seat, on every list

Someone waiting for an admin to let them into the organisation (`awaitingOrgApproval`) was still shown their check-ins on You ("You have not finished a check-in yet.") and on the check-in list. `theCheckInsHeldForASeat` in `participants/held-for-a-seat.ts` now holds back every check-in for such a person, as it does for someone held for a seat. The check-in list, Today and You all read through it, so none of them shows a title, goal or name. Ask Groundwork's "what is due" says the same one sentence instead of listing commitments. The WhatsApp reminder sweeps already skip people held for a seat. They do not yet skip people waiting for the organisation, which I have not changed here and flag for a separate task.

**What the person reads.** On You, in a new field `waitingToBeLetIn`: "Your sign-in is ready, and one thing has to happen before you can start: an admin at the organisation that invited you has to approve you joining it. They have been asked. Nothing you do here is lost in the meantime, and you will be able to check in as soon as they answer." The screens can show it where the empty list would be. Ask Groundwork's "what is due" says the same sentence.

**Tests.** `grounds/nobody-held-for-a-seat-reads-the-check-in-on-today-or-you.spec.ts`, through the real `GroundsService.list` and `YourBoardService`: the list is empty for the waiting person, You carries no name, title or summary, and the person who is in still reads everything.

## Requests 151 and 152 (5 October)

**152 (1), an action with an empty label: done.** I could not make the engine's own builders return an empty label (every branch of `whatToDoAboutALeadAction` and `whatToDoAboutADecision` sets one), so the fix is at the last step of the board: `everyActionHasALabel` (`board/what-needs-you-and-what-to-do.ts`) runs after every other pass on the served board, and any `leadActions[].action` or `decisions[].action` whose `label` is empty or only spaces now reads "Open your check-in" (goesTo `check-in`), "Open the Context page" (goesTo `context`) or "Decide it" (when it carries choices). If you still see an empty label after this, send me the raw payload.

**152 (2), the check-in's label on each row: done.** Each Today row (`needs[]`) now carries `checkInLabel`, for example "Sales team, Q3", on your turn, the ready report, your own report, the decision to end, the approval waiting for an admin, and the lead's items taken from the board (the "Baraka Mwangi is waiting on the discount decision" rows). It is absent on rows that are not about one check-in (leave, spend, finance, hours).

**151 S1, "Read it" for a participant: done.** For someone who does not run the check-in, the ready-report row's `action.to` is `/checkin/<their latest finished check-in>/report`. Whoever runs it, and an admin, keep `/grounds/<id>/report`. Where a participant has finished none, it stays `/grounds/<id>/report`.

**151 S2, a view that starts with the name: done.** On the board's `divergence.items[].positions[]` and `perspectives[]`, a `view` that starts with the speaker's own name (full or first name), and the verb of speaking after it (said, stated, and the like), is served without them. "amani Wekesa stated an aim of 12 shops onboarded." is served as "an aim of 12 shops onboarded.", so the screen reads "Amani Wekesa said an aim of 12 shops onboarded." The stored text is unchanged. A view where taking the name off would leave almost nothing is left as it is.

**151 E1, the team report's "what changed": done.** Each topic is now a whole sentence on its own, followed by one sentence about what became of it. For example: "This is what changed since the last round. The main obstacle to signing new shops is seen differently. This is still open from last time. People disagree about the deadline. That was a difference last time, and it is no longer showing as one. There are different descriptions of the allocation. This is new this round. 3 people answered this round, against 2 last time." Several topics read "These are still open from last time", "Those were a difference last time, and they are no longer showing as one", and "These are new this round". A topic with no full stop gets one, and starts with a capital. The existing test only checked the old pieces joined together, so I updated it (`reports/what-changed-since-last-time.spec.ts`).

**151 E6, a thing listed twice: done for the engine's lists.** The lead's board (`leadActions` then `decisions`) and Today's rows from the board list each thing once, compared by text with case and punctuation ignored; a decision that a lead action already says is left to the action. Not done: "them" with no referent, the lower-case "I will chase the warehouse…" under other people's names, and "who can provide who signs off…". Those are written by the model from what people said, so they need a wording change and a scenario run.

**151 E8, "has none of their 4 shops": not done.** I could not find a sentence in the engine's code that builds it; it is not in `board/`, `reports/` or `grounds/`, so it is most likely written by the model, or built where the screens work. Please send me where it appears (which field) if it is in the payload.

**151 E12, `/entry/commit` with no draft: noted only.** `EntryCommitDto` requires `groundLabel` (a string) and `history`, so a body with no setup in it is refused with 400 before the service runs. Stopping the call from the screen is right.

**Not done, and why.** E2 (who waits on whom, in the model's wording), E3 (target wording and duplicates, from the model), E4 (the model's wording of the numbers), E5 (own report wording and the shared-picture line: model wording and a report change that need a scenario run), E7 (the model's wording of the admin's and Amani's Today lines), E9 (model wording on the team report), E10 (session counts across pages: these come from different counters in the list, the check-in page and the report, and need one clock agreed first), E11 (the seatless person's names: that is in `assistant/`, `entry/` and `conversation/`, which another builder is working in).

---

# Request 153, done: everything the screens need for "Ask <organisation name>"

Decision 100, 5 October. Everything below is served on **`GET /ask`** (and `GET /ask/:userId`,
which is the same shape). Nothing here needs the screens to word anything.

## The name

**The field is `askName`,** and it is the whole string, not a fragment: `"Ask Baridi"`,
`"Ask Coamana"`. Print it as it arrives. Where the organisation has no name yet, or the reader has
no organisation, it arrives as `"Ask Groundwork"` — so there is no case where the screen has to
choose, and no case where it has to concatenate.

It comes from the organisation's **display name** (`Organization.name`). There is no short name, so
there is nothing to choose between.

Every sentence the engine writes that names Ask uses the same string, so the name a person reads in
the panel is the name they read on WhatsApp, in an email, and inside a refusal:

> "You are a guest here from another organisation, so **Ask Baridi** can only answer questions
> about your own check-in..."
>
> "Your own report and your questions to **Ask Baridi** stay private."

A guest from another organisation reads the **host** organisation's name, because they are a guest
in that organisation's Groundwork.

## The caption and the line under it

Both served, both fixed:

| Field | Words |
| --- | --- |
| `caption` | Ask about the company, your work or your check-ins. |
| `addLine` | You can also add context or documents to your check-ins here. |

`addLine` is the one line request 153 asks for, word for word.

## The greeting

**`welcome` is served, and it is served once.** It carries the full sentence the first time
somebody opens Ask — that is, when they can ask and have no kept questions yet. After their first
question it arrives as `null`, so the screen does not need to remember anything or decide when to
stop showing it.

> This is Ask Baridi. You can ask me about the company, your work or your check-ins, at any time.
> You can also add context or a document to one of your check-ins, and ask for leave or to spend
> money. What you ask here stays private. If you add something to a check-in, I will say it back to
> you first, and it only goes in once you say yes.

## The starter questions

**Now served, as `starters`: an array of three strings.** This also answers request 154 item 3,
where you reported that every kind of check-in was offered the sales words — "Ask me about Get a
project back on track: a deal, a target, or what to do next." A law firm matter and a government
programme were being offered a deal.

**Hafsah decided these on 5 October (decision 101): general, never one set per situation.** Five,
in this order, in her words:

1. What did I say I would do?
2. What is my check-in for, and who reads it?
3. When is my next check-in?
4. What are the company's priorities right now?
5. Add a document or some context to my check-in.

**A reader with no check-in gets the fourth on its own.** The other four need a check-in to be
about, and her decision was to leave those out rather than invent replacements. So `starters` is a
one-item array for that reader, not an empty one and not a different set — please draw one.

Per-situation starters are not being written. One set goes to every kind of check-in, a law firm
matter and a government programme included; four of the five are about the reader's own record
rather than the kind of work, which is what lets one set serve every situation.

## The empty states

There is no separate empty-state field, and you should not need one:

- **Nothing to ask about:** `about` is `[]` and `starters` carries the organisation set above.
- **Not allowed to ask:** `canAsk` is `false` and **`why`** carries one plain sentence already
  naming Ask correctly — for example "Ask Baridi is switched off for your organisation" or the
  confirm-your-email sentence. Print `why`.
- **No history:** `turns` is `[]`, and `welcome` is the thing to show in its place.

## What has not changed

`canAsk`, `about`, `turns`, `why` are all as they were. The four new fields are `askName`,
`caption`, `addLine`, `welcome`, and now `starters`.

**Still open on Ask, from request 154 and not part of 153:** the ordering of `GET /ask` turns
(answer before question on a shared timestamp), replies saved without their options, and the
Company page needing an organisation-wide choice to open. Those are next after 154 and 155.

---

# Request 154 item 1, done: a local organisation with every suite switched on

Run this from `api/`, with your own connection string:

```
npx ts-node -T journey/seed-the-suites-for-the-screens.ts postgresql://localhost:5432/<your database>
```

It refuses anything that is not on the computer it runs on — the host must be exactly `localhost`
or `127.0.0.1` — and nothing is read or written before that check. That is the same rule as the
MarketView Q4 seed (decision 98, item 2), now shared between the two in
`journey/a-database-on-this-computer.ts` rather than written twice.

**Run it twice and nothing stacks up.** Proved here: four leave requests and four spending requests
after two runs, in the four states, not eight.

## Who signs in

One password for all five, local only: **`suites-local-only`**

| Email | Role | What they are for |
| --- | --- | --- |
| `amina@suites.test` | admin | The approver for leave and for spending |
| `daniel@suites.test` | lead | Asks for leave and spending, and writes the reviews |
| `grace@suites.test` | team | Has a request in most states, and a review of her own |
| `peter@suites.test` | team | The declined ones, both with a reason |
| `sara@suites.test` | team | **Has asked for nothing** — she is the empty states |

The organisation is "Suites Test Company", slug `suites-for-the-screens`.

## What is there to draw

**Leave, spending and reviews are on** (`organization_suites`, `is_on`), with Amina as the
approver, a 50,000 limit on spending and three categories.

| Suite | What is waiting for you |
| --- | --- |
| Leave | 2 waiting — **one of them nine days old**, for the "waited too long" line — 1 approved, 1 declined with a reason in the decider's words |
| Spending | 2 waiting — **one over the 50,000 limit**, so it takes the second step, and one eleven days old — 1 approved, 1 declined with a reason |
| Reviews | 4, one at each stage: just started, the manager's words written, the person's answer given, and decided |

The declined ones carry a real sentence rather than a blank, because a decline with no reason is
its own screen and this seed is for the ordinary one.

## What it does not do

It does not switch on time sheets, customers or the other suites — request 154 asked for leave,
finance requests and performance reviews. Say the word and the other suites go in the same way.

**Item 8 of request 154** (the "not switched on" message giving an admin no next step) is not
covered by a seed: that is wording, and it is still open.

**A local database to drop when you like:** `gw_suites_check_b` on this computer, which is where
the proof above was run.

---

# Request 153, part two: Ask's scope, and the two things that change on your side

Hafsah, 5 October. **Ask covers the whole organisation and the person's own work by default. One
check-in is an optional focus they may pick; it is never what Ask is about.** This is the answer to
request 154 item 4 as well, where the Company page's "Ask about the whole organisation" and "Ask
about the strategy" were opening a chat about a check-in.

## There is nothing new to call. It already works this way

`POST /ask` takes `groundId` as **optional**, and has throughout: with no `groundId` the question is
answered across the organisation and the person's own work. The Company page's two buttons should
simply post **without** `groundId`. Nothing needs adding on our side for that.

So `about` on `GET /ask` is a list of **optional focuses**, not a list of things one must be chosen
from. Reading it as required is what produced the behaviour in 154 item 4. A reader with `about: []`
can still ask.

## The opening message has changed, and says the scope first

> This is Ask Baridi. I answer about the whole organisation and about your own work, and you can
> point me at one of your check-ins whenever you want to. Ask me about the company, about your
> work, or about your check-ins. You can add context or a document to one of your check-ins here,
> and ask for leave or to spend money. What you ask me stays private. Anything you choose to add to
> a check-in works differently. I say it back to you first, it goes in only once you say yes, and
> from then on it is part of that check-in.

Still served as `welcome`, still only the first time, still `null` afterwards.

**The privacy line is deliberately two promises and not one**, because they are different: a
question is private, full stop; something they choose to add is said back, confirmed, and then is
part of that check-in and readable by the people in it. Please keep them as two sentences if you
ever need to shorten this.

## The suggestions are six now, not five

| # | Suggestion | Needs a check-in |
| --- | --- | --- |
| 1 | What did I say I would do? | yes |
| 2 | What is my check-in for, and who reads it? | yes |
| 3 | When is my next check-in? | yes |
| 4 | What are the company's priorities right now? | no |
| 5 | Add a document or some context to my check-in. | yes |
| 6 | Ask for leave, or to spend money. | no |

**A reader with no check-in now gets two** — 4 and 6 — where the earlier answer said one. That
replaces what I sent you before.

The sixth is an addition to decision 101 rather than part of it: Hafsah's five were decided before
she said the suggestions must also cover leave or spending. Her five keep her order and her words,
and the sixth is mine, so it is the one to overrule if the wording is wrong.

---

# A whole company to review the screens against: Kijani Foods

Hafsah asked for this on 5 October: a proper company, a plan with priorities, at least eight
check-ins of different kinds with people who have answered, and the suites on, so the Company page,
the boards, Today and the suites all have something real in them.

```
npx ts-node -T journey/seed-a-company-for-review.ts postgresql://localhost:5432/<your database>
```

Same rule as the other seeds: **localhost or 127.0.0.1 only**, refused before anything is read or
written. Running it twice leaves one company — proved here, the counts below are after two runs.

## What is in it

| | |
| --- | --- |
| Company | **Kijani Foods**, slug `kijani-foods` |
| People | 8, with real titles: a managing director, two heads, two account managers, a depot supervisor, an engineer, a finance officer |
| The plan | 4 priorities, each with a measure and a number — shops ordering weekly, days to deliver, cost per delivery, depots on the new system |
| Check-ins | **9, in 9 different situations**: sales alignment, a new hire's first ninety days, a project across four depots, a contract renewal, drift, a workplan and budget, a pulse check, a recognition, a handover |
| Answered | 13 completed check-ins carrying 29 things people actually said, in their own words |
| Reports | 9, one per check-in, so the boards and Today are not empty |
| Suites | leave, spending and reviews on, Naomi Kariuki approving, with requests waiting, approved and declined |

## Who signs in

One password, local only: **`review-local-only`**

| Email | Who |
| --- | --- |
| `naomi@kijani.test` | Managing director — admin, and the approver |
| `tendai@kijani.test` | Head of sales — runs three check-ins |
| `bilal@kijani.test` | Head of operations — runs four |
| `esther@kijani.test` · `kwesi@kijani.test` | Account managers |
| `lindiwe@kijani.test` | Depot supervisor |
| `arjun@kijani.test` | Engineer — the new hire |
| `fatou@kijani.test` | Finance officer — the one handing over |

## One thing to know before you judge anything by it

**The sentences in it are mine, not the engine's.** No model is called: every line people "said"
and every shared picture is written in the seed, so it loads in seconds and reads the same every
time, which is what walking screens needs. It is good for layout, empty states, counts, long names
and what a board does with nine different situations. It is **not** evidence about how the engine
writes — the twenty-four scenario run is what judges that.

Three of the check-ins deliberately carry a disagreement worth drawing: the two account managers
count a signed shop differently, two plans both include the same 300,000 agency, and two people are
waiting on the same approver who is on leave.

---

# Request 155, done: an anchor check-in with the switch on

```
npx ts-node -T journey/seed-an-anchor-check-in.ts postgresql://localhost:5432/<your database>
```

Localhost or 127.0.0.1 only, refused before anything is read or written. Running it twice leaves
two check-ins, not four — the counts below are after two runs.

**It turns `release.anchorScenario` on for the database you point it at.** That is the one thing it
changes beyond its own rows, and it is why the local-only rule matters more here than in the other
seeds.

## What it loads

Organisation **Sokoni Fresh**, slug `anchor-for-the-screens`, and **two** anchor check-ins, because
the month board and the end-of-month page need different ones:

| | |
| --- | --- |
| **Live** | "Everyone pulling the same way", started nine days ago, in its second week. A lead and four people, all four answered, 20 things said, 3 commitments (one done), a dependency, and `started_from = anchor`. |
| **Ended** | The same shape, started five weeks ago and closed, so the end-of-month read has a month that is actually over. |

Both carry the lead's own first words, which the end-of-month read begins from:

> I want everyone to understand that we win or lose on whether a shop can reorder the same week,
> and right now nobody owns that end to end.

**"Groundwork recommends" and an idea:** two recommendations — one still offered, and one accepted,
which is the idea captured after its yes.

## Who signs in

Password **`anchor-local-only`**, local only.

| Email | Who |
| --- | --- |
| `rukia@anchor.test` | Founder — runs it, and the only reader of the month board and the end-of-month read |
| `amani@anchor.test` · `baraka@anchor.test` · `neema@anchor.test` · `juma@anchor.test` | The four who answered |

The month board and the end-of-month read are served to the lead alone, so sign in as Rukia for
those; the others are for the participant side and the invitation.

## Two things that caught me, in case they catch you

**`started_from` is the only thing that makes a check-in an anchor one**, and the first run wrote it
as null on both — the constant was imported from a module that imports it without re-exporting it,
so it arrived `undefined` and Prisma wrote null without complaint. The seed looked like it had
worked. If an anchor screen ever shows nothing, check that column first.

**Not every row cascades.** The lead's first words are a record entry hanging off a participant with
no check-in, and that key has no cascade, so a second run could not clear the old rows. The seed
clears children before parents now.

---

# Request 156, done, and you were right to raise it

**The three seeds were never in any branch.** I wrote them, committed, pushed, and told you all
three requests were done. `.gitignore` ignores `api/journey/*` and lets through only the files
listed after it; `git add -A api/journey` on an ignored path does nothing and says nothing, so
every one of those commits carried the instructions and none of them carried the file.

All four are in the allow-list now and committed:

- `journey/a-database-on-this-computer.ts` — the shared localhost-only rule
- `journey/seed-the-suites-for-the-screens.ts` — request 154
- `journey/seed-a-company-for-review.ts` — Kijani Foods
- `journey/seed-an-anchor-check-in.ts` — request 155

No JSON goes with any of them; every row is written in the script.

The commands in the answers above are unchanged and now actually work on your branch. Please pull
and run them — and if a seed ever prints its cheerful summary and a screen is still empty, tell me,
because that is the other way this has bitten today.

---

# Request 152, both items: already done, nothing for you to wait on

**Item 1, an action with an empty label.** `everyActionHasALabel` now wraps the board as it is
served, so `action.label` is never empty on any reader's board. Your fallbacks ("Open your
check-in", "Open the Context page") can go whenever you are next in that file.

**Item 2, Today's rows when a reader is in several check-ins.** Every Today item carries
**`checkInLabel`** — the check-in's own label, in its own words — on both builders, the one that
makes items from a check-in and the one that makes them from the lead's board. It is optional on
the type and absent only where an item is not about one check-in, so draw it when it is there.

Both went in with the work that closed requests 151 and 152 on the engine side. I am noting them
here because they were still marked Open on your list and you may have been waiting.

---

# Request 154 item 2, first part: the history reads in order now

**"Each answer comes before its question, because both share one timestamp."** You were right about
the cause. A question and its answer are written in the same moment, so `created_at` is equal on
both rows, and the read was newest-first then reversed — within one timestamp the database is free
to hand them back either way, so the pair came out backwards about half the time.

There is no sequence column to fall back on; the id is a uuid and sorts randomly. The tie is broken
on what the rows mean instead: **inside one instant, the person asked and Groundwork answered.**
Real time still comes first, so an older answer still precedes a newer question.

Nothing changes in the shape you receive — `turns` is still oldest first.

**The other two parts of item 2 are not done yet** and are next: replies saved without their
options (the "Here is what I can do with ..." turns that end with nothing after them), and the two
wrong answers Juma and Rukia read. Those are about what is written at the time, not about reading
it back, so they need the scenario run to finish before I touch that path.

---

# Request 154 items 5 and 6: what is fixed, and one thing left on purpose

## Item 5, goals not written to the reader — half fixed, half a decision for Hafsah

**Fixed:** a goal written *about* somebody — by their lead, or by Groundwork — is now written to
the reader, as the goals beside it already were. That is the defect.

**Left exactly as written:** a goal the person wrote themselves. Hafsah's standing decision of 26
September is that people's own words stay exactly as they said them and only what Groundwork writes
is fixed, and a test has pinned "I want it at 162,000 by December." unchanged since before your
request. When I first applied the rewrite to everything, that test went red, which is it doing its
job.

So **the page can still read "I ..." beside "You ..."**, and that is now a wording decision rather
than a defect — recorded as PROVISIONAL decision 102 for Hafsah to confirm or overrule. If she
wants one voice throughout, one line in `your-board.ts` changes it and the pinned test goes with it.

## Item 6, the same promise twice — fixed

You saw:

> Ask the warehouse to load my van by 7am
> Ask the warehouse on Tuesday 29 September to load my van by 7am.

Request 96's rule folds a short promise into a fuller one when the short one's words sit **whole**
inside it. A date pushed into the middle breaks that, however alike the two are. The containment is
now tested with dates taken out of both, and only the containment: two promises naming two
different dates are still two promises, and the merged row still keeps whichever date was given.

**"Plan shorter routes" twice is probably not the same bug.** Two identical promises are already
folded together within one check-in; across two check-ins they are two promises, and now that every
row carries `checkInLabel` you should be able to see which is which. If you still see it twice
inside one check-in, send me the check-in and I will look again.

**Item 6's other half, when-words that are not dates** ("if it happens again", "the same day"), is
not done. Those are what the person said, so the fix is not to rewrite them but to stop showing
them where a date belongs, and that needs to know what the screen does with the field.

---

# Request 154 item 8, done: a suite that is off says what to do about it

Eleven suites refused with a bare statement and nothing a reader could act on — "The spending
suite is not switched on." — which is why you were adding a next step yourselves. Two of them
already said one in chat. They all say the same thing now:

> The spending suite is not switched on. An admin switches it on under Suites.

**One sentence for both readers.** An admin and somebody who is not an admin get the same words,
because they are true for both: it tells an admin exactly where to go and tells everybody else who
to ask. Making it reader-aware would mean threading who is reading through eleven services that do
not know, for a sentence that would say nearly the same thing either way.

You can drop the next step the screens add. If "under Suites" is not where it actually sits on your
side, tell me the real path and I will change the one sentence.

**A note on how the last one was found.** I listed the services by hand, changed ten, and wrote a
test that reads the folder rather than my list — it immediately found an eleventh,
`the-spending-for-finance.service.ts`, still saying the bare sentence. The test stays, so a new
suite copying the old wording is caught rather than shipped.

---

# Request 154 item 7: one half fixed here, the other half is yours

## "One kind of item worded two ways" — fixed

> Your first check-in for Help a new hire get started
> Your own check-in for Check how the same role is going

You were right that these read as two kinds of thing. They were two different distinctions in one
list: first-or-not, and own-or-somebody-else's. Both rows are the same thing — your own check-in,
waiting for you — so they say so now and differ only on where in the run it is:

> Your first check-in for ... · **Your next check-in for ...**

## "Everything asked of you this week holds requests from 27 and 28 September" — the rows are right

The engine sends **everything still open**, with no time window, and that is deliberate: a thing
somebody asked of you a fortnight ago and is still waiting on matters more than this week's, not
less. Dropping it after seven days would quietly hide the oldest wait on the page.

So the heading is the thing to change, not the list. **"Everything asked of you"** is what the
field actually holds.

If you would rather the engine cut it to a window, say which one and I will add it — but I would
not choose it, and whoever is still waiting would not either.

---

# Request 154 item 2, third part: the history keeps what you actually read

You saw saved turns ending at

> I cannot answer that one yet. Here is what I can do with "It should run for 13 weeks."

and nothing after them. The person saw four choices under that line; the record kept only the first
text block, so the history held a sentence that introduces something and then stops.

**What is kept is now what was read**: every text block, and the choices written out as a sentence
in the labels the person was shown —

> ... You could Tell me what you can see, What am I on?, What is on my list? or Hold this against
> my next check-in.

Nothing is invented and the live reply is untouched: you still get the blocks and still draw
buttons. This is only what goes into the record of the conversation, at all three places a turn is
saved. A test reads those three places, so none of them can go back to keeping the first block
alone.

**Item 2 is now fully answered**, except Juma's `'I do not have anybody called "looking after them
while the road is closed. ..."'` — a request to add notes being read as a name. That one is the
router mistaking a long sentence for a person, and it is next.

---

# Request 154 item 2, last part: a sentence is no longer read back as a colleague

Juma read:

> I do not have anybody called "looking after them while the road is closed. ...". I only know the
> people your organisation has sent us.

A request to add some notes, read back to him as a missing colleague. The "who is" answer echoed
whatever it was handed.

**A name has to look like a name before it is called one**: four words at most, and no sentence
punctuation inside it. Anything else is not somebody we failed to find, it is something we did not
understand, so it gets the honest answer and the list of what Ask can do instead.

The router putting a long sentence into "who is" in the first place is worth fixing too, and it is
not fixed here. **I held it at the echo on purpose**, because that is where the damage is done and
it holds however the router is changed later. If you still see a sentence routed oddly, the reply
will now be "I cannot answer that one yet" with choices, which is wrong-but-harmless rather than
wrong-and-insulting.

**That closes every part of request 154 item 2.**

---

# Request 151 E10, the session counts that disagree: what the engine serves, and a provisional call

You saw, on one screen or across two:

> the list says "Session 2 of 12" while the check-in page says "Session 1 of 12"
> "Get a project back on track" reads "Session 2 of 10" and "0 of 10 sessions done" in one row

**These are two different true things wearing the same words.** "Where the team is" and "which of
yours this is" are not the same number and never will be: the team can be on its second round while
a person has not started theirs, and that is the state, not a fault.

The engine already serves them as **two different sentences**, so they cannot be read as one
contradiction:

| Field | What it says | Where |
| --- | --- | --- |
| `whereItIs` | "It is on the second check-in of 12." | the glance / the list |
| `howManyAreDone` | "Two of the 12 check-ins are done." | the line under it |
| `yourCheckIn(n)` | "Your first check-in" | a person's own |

`howManyAreDone` returns **null** when none are done and when all are, so "0 of 10 sessions done"
cannot come from it, and "All three check-ins are finished." replaces the pair at the end.

**The provisional call (mine, recorded as decision 103): the screens should print these sentences
rather than compose "Session N of M" from the numbers.** My reasoning: the clash is caused by two
different counts being given one shape, so agreeing a single clock would mean throwing away one of
two true facts. Wording them apart keeps both and makes the difference legible.

If any of the three sentences is not reaching a screen that needs it, tell me which screen and I
will serve it there — that part is a gap worth fixing, and I could not tell from the walkthrough
which page composed its own.

---

# Request 151 E11, one person with three names: all three are yours, and here is what we send

The same seatless person reads as "A colleague… Has not given a name" on the board, "Zawadi U8" on
the lead's Every session page, and "Somebody invited by email" on People and setup.

**All three strings are composed in the client,** which is why this did not move when I looked for
it in the engine:

| String | Where |
| --- | --- |
| "Somebody invited by email" | `client/src/components/gw/RolesInThisCheckIn.tsx:69` and `client/src/lib/utils.ts` |
| "Has not given a name" | `client/src/components/gw/where-each-person-is.tsx:211` |
| "Zawadi U8" | the raw `who` printed as-is |

## What the engine sends, so you can pick one

- **`who`** — the name this reader may read. Where there is no name it is already **"A colleague"**,
  never a made-up one, and for the reader themselves it is **"You"**.
- **`nameIsTheirRole`** — true when `who` is a role or an identifier rather than a name somebody
  gave. That is the flag behind "Zawadi U8": it is set, and the screen is printing `who` anyway.
- **`subjectFor(row)`** — the engine's own sentence for exactly this case: **"the person listed as
  Zawadi U8"**. It exists because a bare identifier reads as a name and is not one.

So the engine already distinguishes the three situations and already has a sentence for the hard
one. **My suggestion: use `who`, and where `nameIsTheirRole` is true use `subjectFor`'s phrasing
rather than the raw value.** That gives one wording everywhere and keeps "A colleague" for the
privacy case, where it means something different and must not be merged with the other two.

I have not changed anything in `client/`, because those files are yours and I would only conflict
with the work you are doing in them. Say the word if you would rather the engine sent one
pre-composed string for the seatless case and I will add it.

---

# Request 157, done: an organisation with a hundred check-ins

```
npx ts-node -T journey/seed-a-hundred-check-ins.ts postgresql://localhost:5432/<your database>
```

Localhost only, refused before anything is read or written, and **on the allow-list** so it is
actually in the branch this time — checked with `git ls-files`, not assumed.

**Harambee Logistics**, slug `a-hundred-check-ins`: 30 people, **100 check-ins** across 16
situations, 340 people-in-check-ins, 75 reports, 25 closed. Counts are after two runs, so a second
run replaces rather than doubles.

| Email | Who, and why they are there |
| --- | --- |
| `zuri@harambee.test` | Admin — sees all 100, which is the worst case for any list |
| `kofi@harambee.test` | The busy lead — **20 are waiting on him**, and **20 he is not in at all** |
| `imani@harambee.test` | A participant in **15** — the case where "all check-ins" is mostly not yours |

Password **`hundred-local-only`**, local only.

**The states are mixed on purpose**, because that is what the sidebar has to tell apart: a quarter
closed, a third not started (so they are waiting on whoever reads them), the rest answered with a
report. A fifth leave the busy lead out entirely — a person who is in everything tests nothing
about which ones are theirs.

**The words in it are mine, not the engine's.** No model is called. It is for what a list does at a
hundred, what search has to cope with, and which check-ins should come first. It says nothing about
how the engine writes.

---

# From run 32, not from a request: nobody reading a report is called a participant

The review of run 32 shows, in several scenarios:

> the other two **participants** report... · both branch **participants** · two other
> **participants** report that the company's CEO...

**Participant is our word for a row in a database.** Nobody says it about a colleague. It was in
none of the wording rules, and the scorer's label check only catches "Participant A", so the bare
noun passed everything and reached readers.

The rulebook now says to name them or say "people", with the sentence both ways, and covers the
other three words of ours that mean a row: "party", "the initiator" and "the respondent".

If any screen composes a sentence with "participant" in it, that one is yours — the engine will
stop sending them.

## A new staff page in `client/`: Groundwork's WhatsApp number (5 October, late)

Hafsah asked for this page herself, so the engine workspace added it, as new files wherever it could. Please keep it when you merge, and restyle it freely.

What was added in `client/`:

- **New page:** `client/src/pages/admin/WhatsAppSettingsPage.tsx`. It is staff only. Staff type in Groundwork's own WhatsApp number, its phone number ID and its business account ID. They type in the three secrets (access token, app secret, verify token), which never come back; each one reads "Set" or "Not set". The page also shows whether WhatsApp is switched on, whether Meta accepts the keys ("Connected" or "Not connected", with a "Check again" button), the webhook address to give Meta with a copy button, and a "Send a test message" box for one typed number.
- **New API file:** `client/src/api/whatsapp-settings.ts` (`whatsAppSettingsApi.get`, `.save`, `.connection`, `.sendTest`).
- **New test:** `client/src/pages/admin/groundworks-whatsapp-number-as-staff-read-it.spec.tsx`.
- **One route in `client/src/App.tsx`:** `/admin/whatsapp`, inside `RequirePlatformAdmin`, next to `/admin/api-access`.
- **One link in `client/src/pages/admin/AdminPage.tsx`:** under the WhatsApp switch on the System tab, "Set Groundwork's WhatsApp number, its keys and the webhook". It also adds `Link` to that file's `react-router-dom` import.

After review, each secret saved in the back office has a button beside it: "Remove the saved access token", "Remove the saved app secret" or "Remove the saved verify token". It sends `remove: ['accessToken']` (and so on) and then shows "The saved access token is removed.", followed by the API's own sentence about what the server uses instead. The button shows only when the API says the secret's `from` is `'here'`. `from` is a new field on each secret, and it never carries the secret itself.

The API behind it is `GET` and `PUT /admin/whatsapp/settings`, `GET /admin/whatsapp/settings/connection` and `POST /admin/whatsapp/settings/test`. All four are behind `PlatformAdminGuard`. `GET /admin/whatsapp` now also returns `displayNumber`, which is the number people read, not a secret.

## "Connect WhatsApp" for the screens (decision 106, 5 October, night)

The engine now serves a one-tap link that opens WhatsApp with "Hi" already typed to Groundwork's number. Showing it is up to the screens; nothing is drawn yet.

**What the screens receive:** `connectWhatsApp: { link, number, says } | null`, for example `{ "link": "https://wa.me/447700900123?text=Hi", "number": "+44 7700 900123", "says": "Connect WhatsApp" }`. Use `says` as the button label, `link` as its address (it opens WhatsApp), and `number` if you want to show the number.

**On which reads:**
- `GET /auth/me` (the signed-in person's own profile, for their Settings), as `connectWhatsApp`.
- `GET /check-ins/:id/transcript` (the person's own check-in; the server refuses this read to anybody else, the lead and admins included), as `connectWhatsApp`.

No other read carries it, and nobody else's read ever does.

**When it is null:** it is null unless all of these hold:
- WhatsApp is on: the platform switch on `/admin/whatsapp`, and the organisation's add-on.
- The organisation has no WhatsApp number of its own connected.
- A display number is saved for Groundwork's number.
- On the check-in read, the check-in is not kept in the app.
- The person has never written to Groundwork from their number, or has no number saved.

Once they write, for example by tapping it and sending "Hi", it is null on both reads.

**The invitation email** carries the same link, labelled "Connect WhatsApp", after the sentence "You can also answer on WhatsApp: send Hi to +44 7700 900123." It appears only when WhatsApp is on for that organisation, the check-in is not kept in the app, and a display number is saved. Otherwise there is no line.

# From the screens workspace, 6 October: Screens ready for the release branch.

Screens ready for the release branch.

At bce7f21d on `wip/prototype-ui`, these pass:
- the client tests, 4,283 of 4,283;
- the type check;
- the browser tests, 57 of 57.

Everything in the screens' list is built and has been walked live: every board, the anchor screens, the suites, the Company page, the lists at a hundred check-ins, the small states and the in-between widths. What remains is yours or Hafsah's:
- requests 159 to 163, which come from the live walks with your four seeds;
- context and resources moving into Ask, when you say it is ready;
- the one-off style clean-up, which waits until after the release.

The screens' own sentences no longer say "participant", except the prototype's own "You see these boards as a participant".

# From the screens workspace, 6 October: Screens ready for release.

Screens ready for release.

At the commit carrying this note on `wip/prototype-ui`, the client tests pass, 4,342 of 4,342, and the type check is clean.

Since the last note, the screens draw:
- the request offered in the check-in and its form pages;
- a person's own recognition sentence;
- the nudge;
- the Admin switches for both trials;
- "1 month" everywhere.

The last live walk of the whole anchor scenario found faults that were not fixed before the pull request (Hafsah asked to stop there):

**The screens' own**
- The entry chat's background classifier overwrites the anchor key, and the save puts `mode` ahead of it (`EntryChatPage.tsx`, `classifyIntent` about line 2113, and `buildCommitPayload` about line 2336). So a lead coming through /start/team gets an ordinary check-in, not an anchor one.
- "Fills in as you talk" shows the ordinary four items, not section 7's seven.
- The people step comes after the confirmation email, and has no name field.
- A member's "Ideas from your team" sits in a closed fold.
- The signed-out header at 375 has no side gutter.

**Yours**
- The invitation email still says "Nobody on your team sees what you write … it never quotes you". This is a privacy wording fault.
- A member's first turn quotes the lead's setup and asks "are you the person this check-in is about".
- After an idea's yes, the reply asks "Capture what, specifically?", and the idea's title is served raw.
- `looksLikeARequest` misses "Can I take Thursday and Friday off next week?" and "I need $4,000 approved". The model also argues with the offer around it, and the suite-off offer is shown to a member.
- Month-board counts and "you" (request 163).
- The billing page names the Starter plan for an organisation on the free plan.
- Request 165, the routes and the fill-in values.

**The seed's**
- Recommendation kinds, commitments as PASTE, and no turns or brief, so there is no end-of-month read and no open session for members.

**Build**
- `npm run build` in `api/` now writes `dist/src/main.js` and no `dist/main.js`. That is because `src/modules/board/the-anchor-as-each-of-its-readers.spec.ts` imports from `journey/anchor/`. The production start command, `node dist/main`, therefore fails. Please keep `src/` imports inside `src/`.

# From the screens workspace, 6 October: Anchor fixes pushed, ready for the anchor re-run.

Anchor fixes pushed, ready for the anchor re-run.

At e027d021 on `wip/prototype-ui`, the client tests pass, 4,345 of 4,345, and the type check is clean. The walk checked each fix live:

- **/start/team creates an anchor check-in.** The entry chat no longer guesses over the anchor situation. "This sounds like …" is gone. Every entry call and the commit send `scenario: "HELP_TEAM_UNDERSTAND"`. The saved check-in has `started_from = anchor`; its `scenario` is NEW_PROJECT because of the enum (request 166).
- **The side panel** shows section 7's seven items, "N of 7 set" and "Help my team understand". It is hidden below 1000px wide, as the panel is for every situation. The items stay unticked until you serve them in `extracted` (request 166).
- **The people step** comes before the confirmation email, and "Start my Groundwork." saves, emails and commits with those people. There is no plan-size banner, and the page says "The people you added get their invitation".
- **A member's "Ideas from your team"** is open. The walk found it still folded for members, because `anchorScenarioOn` reaches the lead only. It now opens whenever `ideasFromYourTeam` is served. This last fix is checked by tests and was not walked again.
- **The phone header** has its side gutter.

What the walk found on your side is request 166.

# From the engine workspace, 6 October: request 166, the anchor lead's conversation, the reveal and the invitation

Everything below is behind `release.anchorScenario`. With it off, nothing here changes for anybody.

**1. The saved check-in keeps its situation.** `HELP_TEAM_UNDERSTAND` is now a situation of its own (a migration that only adds the value, row 85 in `docs/deploy.md`). A check-in saved from the anchor link has `scenario = HELP_TEAM_UNDERSTAND` and `started_from = anchor`. With the switch off, the key is read as a project exactly as before.

**2. The lead's conversation is the onboard conversation, and `ready` now means it is complete.** `POST /entry/onboard` and `/entry/onboard/stream`, sent `scenario: "HELP_TEAM_UNDERSTAND"`, run the anchor's own conversation, not the ordinary setup. Every reply carries, flat under `extracted`, whichever of the seven the lead has said, in her own words and in the second person: `responsibleFor`, `tryingToMove`, `howItContributes`, `seeingToday`, `whyItBothersYou`, `whatTheyDontUnderstand`, `whatTheyWouldDoDifferently`. Once an item is heard it is served on every later reply, so your merge never loses one. `extracted` also holds what the summary card and `composeLeadBrief` already read (`initial`, `whoInvolved`, `decision`, `goals`, `brief`, `peopleNamed`), filled from the seven. `ready` is true only when all seven are heard, she has answered what better would look like, and the reply has stopped asking: that reply is a two-sentence close. The reply also carries `promptVersionId`.

**What this means for the screens (please decide).** Because the anchor conversation now ends at `ready`, the ordinary fork that follows it ("I set this up and check in myself" / "I check in once to set the context, then only they check in") and the second conversation (`startCheckin`, which asks a generic first check-in question) are not part of the anchor in the spec: section 11 goes from the conversation straight to the reveal, and section 13 to the people step. What the engine can serve for that: after `ready`, call `POST /entry/report` with the onboarding turns, `scenario: "HELP_TEAM_UNDERSTAND"` and, new, `anchorItems` (the seven, as you hold them). `leadsReveal` comes back. If you keep the second conversation, the reveal still reads what she said, because the check-in's first message carries her words.

**3. The reveal says what she said.** `leadsReveal` is now built from the seven, so "What you're carrying" is what she is responsible for and why it bothers her, "What you need the team to understand" is what she said the group does not understand, "What you're seeing today" is what she is seeing, "Who you're trying to move" is who she said, and "What meaningful change would look like" is her answer about what better looks like, one sentence for each thing. Where she has not said something, it keeps its plain sentence ("Groundwork has not yet written down what you are carrying."). The route takes the new optional `anchorItems`, and falls back to reading her words in the turns.

**4. The second question no longer repeats the first.** Every turn, the model is told what it has already heard (in her words), that the opening question has been asked and answered, and what it has not yet heard.

**5. The invitation email is the anchor's own.** For a check-in started from the anchor link, with the switch on, the email is `TheAnchorInvitation`'s words ("Rukia is trying a different way to help the team get on the same page.", the three lines, "Start your first check-in →"), plus the one true sentence every invitation carries about who can read what is said in a check-in. No email, anchor or not, carries an HTML comment any more.

**6. The people step accepts a name.** Each entry in `contributors` takes `displayName` (up to 120 characters) beside `email`, and it is kept as the name the lead gave that person.

# From the engine workspace, 6 October: request 165, the forms for leave and spending, and the rest of the anchor's walk

**Request 165, the routes.** Both are for the signed-in person only. There is no field for whose request it is.
- `POST /suites/leave/requests` with `{ startsOn, endsOn, kind?, standInUserId? }`. The days are plain days, "2026-10-16". It answers `{ id, says }`, and `says` is the chat's own sentence, for example "I have sent your leave request on Friday 16 October to an admin. It is not approved until they decide, and you will see it under your leave." It refuses in the chat's own words: "Give a first and a last day, with the last day on or after the first.", "The stand-in has to be somebody else in this organisation.", "That kind of leave is not one your organisation has set.", "Only people in this organisation can ask for leave here." With the suite off: "The leave suite is not switched on. ..."
- `POST /suites/spend/requests` with `{ amount, what, category? }`. It answers `{ id, says }`, for example "I have sent your request to spend KES 15,000 on fuel for the van this week to an admin. It is not approved until they decide, and nothing is spent until then." Refusals: "Give an amount of more than nothing.", "Say what the money is for.", "Choose one of the categories your organisation has set.", "Only people in this organisation can ask to spend here."
- Both go through the writers the chat uses, so the approver, the checks, the record of who did what and the message to whoever decides are the same.

**What the forms may read, by a member.** `GET /suites/leave/rules` and `GET /suites/spend/rules` are for an admin only and stay so. For the form there are two new reads, open to anybody in the organisation who is not a guest:
- `GET /suites/leave/form` answers `{ kinds: [{ key, name }], standIns: [{ userId, name }] }`. The stand-ins are the colleagues who are not guests and not the person, by name and id, never an address. No rules, no notice days, nobody's days left.
- `GET /suites/spend/form` answers `{ currency, categoryCalled, categories: [name] }`. `categoryCalled` is what the organisation calls one ("project", "category"). No limits, thresholds, budgets or who approves.
With the suite off, both answer with the sentence the board uses ("The leave suite is not switched on. ...").

**What to fill in.** `openTheRequest` now carries `prefill` where something was read from the person's own words, and leaves it out otherwise. Leave: `prefill: { startsOn, endsOn }`. Spending: `prefill: { amount?, what?, currency? }`. It is read by the chat's own rules, never by a model, and never guessed. "Can I take Friday off next week?" gives next week's Friday. Two days that are not side by side, or "Monday and Wednesday", give nothing. A sum with no reason gives only `amount`. `currency` is there only when the person wrote its code or sign, never from "shillings" alone. `prefill` is not served when the suite is off, because there is no form.

**The offer in the check-in is on.** `release.requestOfferInTheCheckIn` now reads as on when there is no row (`{"on": false}` takes it away). It is made only in a check-in started from the anchor link, with the anchor switch on. Leave said the way people say it ("Can I take Friday off next week?", "I need Monday off") is now offered; what somebody tells their check-in ("I was on leave on Monday") never is.

**What the screens need to change for the anchor.**
1. After the lead's conversation is `ready`, go straight to the reveal and the people step. The fork ("I set this up and check in myself") and the second conversation are not in the spec (see the first section of this day).
2. The end of month: `theEndOfMonthRead.revealSaid` is `{ heading, intro, lines, closing }` in plain sentences. `TheEndOfMonthRead.tsx` now draws it, and the four labels are served ("Keep this check-in running" ...). `theMonthBoard.weekSaid` is the line under the question, and says "This check-in has ended." once it has. `TheMonthBoard.tsx` draws it. An ended check-in is served no `activeLine`. These two components and their specs were changed in the same commit, with the engine.
3. `GroundScenario` has a new value, `HELP_TEAM_UNDERSTAND`, and an anchor check-in is served with it. The client mirrors of the end states and of the rhythm tables carry it (an anchor check-in ends as a project does), and the rhythm check ignores its row, because it has no card to pick. Where a page prints a situation's name from `SCENARIO_LABELS` with `?? ground.scenario` as the fallback (`CheckInPeopleAndSetup.tsx`, the "Situation" row), an anchor check-in reads the raw key. Please give that row a label ("Help my team understand").
4. `GET /entry/anchor-start` serves `firstQuestion`, so the screen does not write the opening line.
5. `POST /entry/report` takes `anchorItems` (the seven, as the screen holds them) and the people step's `contributors` take `displayName`. Both are in the first section of this day.

**The baseline, what a person on the team reads (piece 14).** The first session for somebody on the lead's team opens on "Hi Linet, this is a short conversation to hear how your work looks from where you sit. There are no right answers. What are you working on right now?", asks the nine one at a time, in the order that follows what they say, and closes with two sentences when all nine are learned. It is read on its own words, not under the project pack, plan and intake. It offers no suggested answers, never gives "for instance", never asks for proof, a date or a number, and is never held at its close for "what will you do, and by when". It does not tell the person what the lead said: `brief.says` is `null` and `objectives` is `[]` for anybody who is not the lead in a check-in the anchor link started.

**Ideas (piece 19).** The title on "Ideas from your team" starts with a capital letter, the words kept are unchanged, and the row carries `promptVersionId`. An idea in the last answer of the baseline is offered before the goodbye, so there is a turn in which to say yes.

# From the engine workspace, 6 October: what the screens still need to change (review of request 165 and 166)

1. **The request forms read the wrong field.** `SpendRequestNewPage.tsx` (and the leave form) read `res?.message`. The server answers `{ id, says }`. Show `says`.
2. **The leave form reads the kinds of leave from `/suites/leave/rules`, which is for an admin only.** Use `GET /suites/leave/form` (kinds and colleagues who could stand in), and `GET /suites/spend/form` for the payment form.
3. **After the lead's conversation is `ready`, go straight to the reveal and the people step.** Do not show the ordinary fork ("I set this up and check in myself") and do not start a second conversation.
4. **Give `HELP_TEAM_UNDERSTAND` a label in `SCENARIO_LABELS`** ("Help my team understand"), so an anchor check-in never prints the raw key.
5. **The end-of-month read no longer offers "Turn on the suites that fit" until suites are really counted.** `continueOptions` has three entries until then, and `revealSaid.lines` has five.
