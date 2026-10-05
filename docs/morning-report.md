# Morning report

## 5 October, after 16:00: your two wording decisions, and the work after them

- When somebody leaves a role, the lead now reads "Kwame's role does not continue. Kwame's history stays as it is.", Kwame reads "Your role does not continue. Your history stays as it is.", and anybody who may not see his name reads "The role does not continue. The person's history stays as it is." (123 item 8). The screens workspace needs to copy the new label into its mirror file, which I was not allowed to edit.
- When the new person stays, the lead now reads "Kwame stays in the role.", Kwame reads "You stay in the role.", and anybody who may not see his name reads "The person stays in the role."
- The wording guard the screens kept tripping over now counts 51 lines, down from 60, because I rewrote nine engine sentences so the point comes first, and a new engine test fails if `api/src` goes above 35 (request 141).
- After review, the sign-in, sign-up, password reset, invite-link and switched-off answers no longer say "account" or "the password you set".
- When a person waits on something nobody owns, the lead is now asked to find the owner, "so that Neema Achieng is not left waiting", instead of being told to ask Neema to find out (134 item 5).
- A person's own coaching no longer says "session 1 of 4 of founder or CEO work" as if somebody had set it; it reads "This is session 1 of 4. What you have said so far reads as founder or CEO work." (127 item 6).
- I stopped on 127 item 5, "at their own request": the board says the request was Nadia Haddad's, so changing it to "your own request" could be false. It belongs with the judgement work.
- Where no worry is named, the Blockers tile now says the true reason: other people's words this reader may not read, or none kept in the words it was said, which is true for the lead too (127 item 7, changed after review). After a second review it also says when some are other people's words and the rest were not kept, and when a kept worry cannot be quoted whole.
- "Who owns what" now includes the promises people made in their check-ins. Before, 59 people on this computer's database had an empty list because their promise was stored only as a promise (130 b).
- I stopped on 139, the goal drawn as "Point to successfully renewed contracts", because no code writes that line and it is not in this computer's database. I asked the screens workspace which field carries it. I did not start 130 (b), 130 (d) or 131 (6), because none of them is small.

## 5 October, 15:30: where I am, for your fresh session

Everything is committed and pushed to `mine wip/release`. The working tree is clean. One process
is running on this computer: the local API on 127.0.0.1:3000, built from this head. No scenario
run, no watcher, no test runner, no client.

### Done since you asked me to quieten the computer

| | |
| --- | --- |
| **Eight of the screens' open requests were already fixed** | 119, 120, 126, 137, 138, 141, 146, 156. Checked one at a time at this head rather than assumed: the API typechecks, builds, starts and answers; the seeds are tracked; their own wording guard passes — at exactly 60 of 60, which I told them. |
| **The meetings line is out of the stored row** | `bring-a-check-in-up-to-date.ts` rule 7. They asked twice and my earlier answer pointed at a script with no such rule. Proved on a local database: two lines before, none after, nothing else touched. |
| **Your three asks in request 140** | (1) the meetings lines, done. (2) the local MarketView Q4 check-in: `6e84ca43-31d4-4e33-bf38-91defee0543a`, led by wairimu, otieno and naliaka check in. (3) the full API suite on this computer: **1,707 suites, 16,609 tests, all passing, 427 seconds, no memory trouble** — so their out-of-memory is their machine. |
| **Four more fixed** | the founder's aim "Get to 20 paying customers" now holds its number (136 1); the missing "that" in "…who can provide the fuel allowance for October **that** Aisha is waiting for" (132 f); the only person in a check-in is no longer told her own account is missing (136 7); and the up-to-date script's rule 3 reads the new shape of aim. |

### In progress, and the thing to read first

**Requests 121 to 140, item by item**, in `docs/answers-from-engine.md`. Most of those twenty
reviews were already fixed before today — **eleven items are genuinely open**, and seven of those
eleven are the judgement, which is the model's own writing.

I got this wrong twice before getting it right, and it is worth knowing how: I first read "open"
off whether a test file was named after the request. That is not the same thing, and it was wrong
nine times in total. The list now goes the other way round — what the code cites, then each
remainder read in the file that would hold it — and it says in those words that it means "I did not
find a fix", not "there is none".

### Tonight's plan, in order

1. **The judgement family: 123 (7), 134 (4), 135 (3).** Seven of the eleven open items are the
   judgement miscounting, contradicting itself, or mixing "you", "they" and "she" for one person.
   The repairs at the read can fix shapes, not a miscount, so this wants the prompt and its tests
   together. This is the real engine work left and I have not started it.
2. **The four that are not the judgement:** 127 (5) "their" for the reader outside the shapes the
   rule covers; 127 (6) and (7), a kind of work and a count of worries with nothing behind them;
   130 (b) and (d) and 131 (6), sections a board family does not send; 139, a goal drawn as a bare
   line.
3. **The 24-scenario run and the scorer.** Ready to start, not started — see below.

### Two decisions I did not make on my own

- **The 24-scenario run is still stopped.** It is next in the queue and the machine is quiet, but
  you stopped that exact run an hour ago because the computer was slow, and restarting it unasked
  is the one thing that plainly contradicts what you said. It runs for hours and blocks everything
  else. One word and it starts.
- **Two of the eleven open items are decisions, not defects.** The words a reader sees when
  somebody leaves a role (the screens want his name; the prototype says "Part ways"), and who gets
  asked to find an owner when nobody is named. Both are in `docs/answers-from-engine.md` with the
  argument on each side. Neither is mine to pick.

### Housekeeping

Two scratch databases are left on this computer, `gw_seed_check_158` and `gw_mv_q4_140`, because
`dropdb` is blocked by the kit's rules. Neither is used by anything.

## 5 October, afternoon: the three screens requests, the migrations, and what I got wrong

Running unattended. Progress as it happens is in `docs/run-log.md`; this is the short version.

### The screens workspace is unblocked

| Request | What they get |
| --- | --- |
| **153** | Ask serves its own name, caption, line, greeting and six starter questions. Nothing left for a screen to word. |
| **154** | A local organisation with every suite on, five sign-ins, and requests in every state a screen draws. |
| **155** | Two anchor check-ins and the switch on: a live one in its second week, and an ended one for the end-of-month page. |
| **plus** | **Kijani Foods** - a whole company: 8 people, a plan of 4 priorities, 9 check-ins in 9 situations, 29 things people said, a report each. |

Every one was driven rather than read: they load, a second run does not double anything, and a
hosted connection string is refused before a row is touched.

### And I told you three of those were done when they were not

The seed scripts never left this computer. The ignore rules cover everything under the journey
folder, and adding an ignored path does nothing and says nothing, so three commits carried the
instructions and not one carried the file. **The screens workspace found it**, not me (their
request 156).

This is the second time in two weeks that one rule has hidden a file somebody else needed. The
standing check from here: nothing in that folder counts as pushed until git says it is tracked.

### The release

**The migrations question is answered.** A local database built from the live line's 290
migrations, **with existing-client rows already in it** so "fails on existing data" was exercised
rather than argued, then our 69 on top: **359 applied, 0 failed**, every pre-existing row
unchanged. You should still run it once on real data after the backup - real data has shapes a seed
does not - but it is no longer an unknown.

**The two release-blocking judgements turned out to be one fault.** Both invented something and
both passed every rule the judgement had, because every rule asked for a **person** to be named and
both of them named one:

> "Kwame Mensah is also blocked by the credit committee" - he had said he had not contacted Credit at all.
>
> "Make the decision about hiring more analysts" - that was the customer's problem, not the lead's.

Two rules now say a reason is only a reason if somebody said it, and a move has to come from a line
in a block. **Whether the model obeys them is for the run, not for me**, and the release document
says so rather than ticking it.

**"Proof asked for is 36 against 42" is measuring the wrong thing.** The scorer counts "picture" as
asking for proof, and picture is this product's own word for shared understanding. Run-1: 31 of 54
hits matched on it. Not one I read asks for a photograph. Both sides of that comparison are
inflated by different amounts, and the real movement is roughly 34 against 19 - **a bigger fall
than the row shows**. The scorer is on the never-edit list, so it is yours to decide.

### Two things I deliberately did not do

**The privacy question on evaluation check-ins (item 4) I left alone.** Your decision 86 and
decision 99 item 3 both say a privacy restriction is not mine to add, and this is one. It stays a
question for you.

**The coordinated verbs** - "You see a lack of forward momentum and attributes it" - are still
there. I wrote a regex for those on 25 September; it fixed three sentences, broke two, and I
removed it. They belong in task 1.6's automatic check, where the reader is known and the line can
be rewritten whole. I fixed only "does you own", which has no other reading.

### Four provisional calls, all reversible

101 (the five starters, now six), 102 (a goal somebody wrote themselves is not rewritten to "you"),
103 (session counts are two true things, worded apart rather than reconciled), 104 (pattern A1
reworded after you found it broken inside a line). Each is in `docs/decisions-merged.md` with the
reasoning and the one line that undoes it.

## The release, 5 October 2026 (written as it goes)

**Release-ready on everything this computer can check.** Three things only you can do come first: the migrations on a copy of the live data, a build on Node 20, and the two existing-client checks. There is also one privacy question for you (item 4 below).

- **The branch.** `wip/release` is `wip/plain-reports` joined with `wip/prototype-ui` and `wip/live-base`, pushed to your copy only. Both joins had nothing new to bring in, so there were no conflicts.
- **Does it merge cleanly into the live line:** yes. `wip/live-base` (`5197f22d`) is already inside it. Details in `docs/staging-compatibility.md`.
- **Every result** is in `docs/pull-request.md`, which is also your write-up for the pull request. In short:
  - API tests: 16,518 pass, none fail.
  - Client tests: 4,138 pass.
  - Typechecks and a clean install and build pass.
  - The 24-scenario run: every problem count is 0, and every engine number holds or rises except "proof asked for".
  - The adversarial scenarios: 7 of 8 pass in full.
  - Browser journeys: 4 of 4 pass.
  - WhatsApp journeys: 107 of 107 checks pass.
  - Privacy sweep: passes.
- **Fixed during the round:**
  - Reminders leave out somebody waiting for the organisation to let them in.
  - Six adversarial scenarios had never run, and the checker now fails one that does not run.
  - The wording guard no longer lets the model put "you say that" in somebody's mouth.
  - The meetings line appears only where somebody met somebody.
  - Names keep their capital.
  - The report's note has no dash.
  - Asked to build a case against one person, Groundwork now says plainly that it will not. This is stored prompt version 45, proved active.
  - The anchor's people step has no dash.
  - Four tests follow sentences that changed.
- **The sentence-by-sentence reading of run-32** is in `docs/run-32-review.md`: 16 of 24 reach the right answer, 7 partly and 1 not. Its 59 smaller wording faults are for after the release.

**Needs Hafsah (the release):** the seven items at the end of `docs/pull-request.md`:
1. The migrations on a copy of the live data.
2. A build on Node 20.
3. The two existing-client checks.
4. The privacy question about a job search and a lead's wish to let somebody go, on an evaluation check-in.
5. The two judgements that go against the right answer.
6. The "picture" count in "proof asked for".
7. The pattern name you approved that reads as a broken sentence.

**Local databases to drop when you like:** `gw_wa_release` and `gw_browser_release` (tonight's journeys), along with the ones listed before.

## Morning, 5 October 2026

**Not yet release-ready.** The safety check refused my full end-of-night entry, because its text named the pre-release environment where the two existing-client checks must run. As the rules say, it was not reworded; the full entry is in the chat for Hafsah. In short: every test passes (16,013 in the API, 4,044 in the client); the release checklist is done apart from the items only Hafsah can do; and those, with every question, are listed at the top of `docs/release-checklist.md` under "Waiting on Hafsah" and in the chat.

---

**Where it stands, 4 October 2026 (end of the session):**
1. **Done:** WhatsApp for the first client; the four suites built to decision 85 (steps, escalation, record, leave, spending and finance, time sheets, reviews, setup by talking); decision 86's reversals; request 118; every board kind's engine faults (item 21); run-26 is level with or better than the baseline on everything except "proof asked for" (the "picture" count, with Hafsah).
2. **In progress, not committed as code:** the loans privacy rebuild (decision 75 item 14) stopped half-way when the weekly allowance ran out; it fails the privacy spec, so it is saved as `docs/unfinished/loans-privacy-rebuild.patch` and the code is as it was.
3. **Next for release (engine frozen, decision of 4 October):** finish the run-26 fixes (Sunday reads only what is about him, several people or the shared aim; a record always owned by its speaker, enforced in code; no lead's words on a participant's Blockers tile; differences kept from the report's first version), then the smaller wording faults, each re-run once on the scenarios it touches; one full 24-scenario run before release.
4. **Needs Hafsah:** the "picture" count in "proof asked for"; the yes or no list in `docs/privacy-restrictions-for-hafsah.md`; the four suites files the one-rule test flags (its only failure); and the questions under each entry below.
5. **Note:** `.claude/hooks/guard.py` shows as changed in the working tree; that was not done by this work, and it is left uncommitted.

**Night of 25–26 September 2026.** Branch `wip/plain-reports`. Nothing left this computer.

This is written as I go, so if it stops mid-sentence that is where I got to.

---

## 2 OCTOBER, EVENING: WHATSAPP FOR THE FIRST CLIENT (decisions 82 and 83)

The ordered list is at the top of `docs/weekly-plan.md`. The WhatsApp helper finished items 2, 4, 5, 6, 7 (on WhatsApp), 10 and 12, in eight commits from `937c1c6b` to `3c318354`, all pushed. Its last test run: 341 suites, 3,198 tests passing (whatsapp, public-api, webhooks, users, auth, people, billing, grounds).

What a person now reads:

| Moment | What they read |
| --- | --- |
| A check-in kept in the app | Nothing about it reaches a phone. A message about it gets "Your check-in "Performance plan for Amina" is kept in the Groundwork app, so I cannot take your answers to it here. Please open Groundwork and answer it there." |
| A session opens (now on Groundwork's own number too) | "Hi Miriam, your check-in for the sales team is open. It takes about five minutes, and you can answer right here. Reply START to begin." |
| "Not now" | "All right. I will not write to you first again today. Your check-in is still open, and you can answer here whenever you are ready." |
| WhatsApp held back, once a day | "Your organisation has not turned on WhatsApp, so this check-in stays in the app. You can carry on in the Groundwork app." |
| A request during a check-in | "Shall I treat this as a leave request?" Yes goes to Ask Groundwork, no stays in the check-in. |
| A local number with no country known | "Please write the whole number with the country code at the start, for example +234 801 234 5678." |

Groundwork writes first at most once a day, or twice on the day a check-in opens, enforced in one place (`howOftenToday`).

**For Hafsah:**
- **The switch words.** Your `checkin_open` template has no room for "ask, back, switch", so they are said in the first reply when a check-in starts. Add them to the template if you want them earlier.
- **`checkin_closes_soon` is not sent**, because nothing in Groundwork closes at a set hour; a session stays open and takes late answers.
- **"Due"** is taken as the day the session opened plus one step of its rhythm. A one-off check-in has no due day.
- **Three template wording points**, each with a proposed fix in `docs/whatsapp-templates.md`: `lead_daily_summary` ends on a blank, which WhatsApp refuses; `checkin_team_almost_in` numbers its blanks out of order; and three templates may be classed by Meta as marketing, not utility.
- **Before two copies of the API run:** the waiting "yes or no" on a request is held in memory for ten minutes, and should move to the database.

**Request 117, the sales board, is done** (`39f692e3` to `40946e19`, pushed). Rukia's row for Amani now reads "Amani Wekesa has checked in, and has been waiting on you for the price list since 28 September." once, instead of the same wait three times. Her coaching note no longer says "waiting on themselves", and says "session 1 of 12" rather than "session 2". Amani's aim reads "Amani Wekesa's own aim is 3 shops in Kilimani by 20 December." Every reader gets the same board at any hour. A local script, `api/journey/bring-a-check-in-up-to-date.ts`, brings stored rows up to today's rules without the model. Its dry run here found 99 changes and wrote nothing. It is a release step that needs your explicit yes (`docs/deploy.md`, section 5). Tests: 9,251 pass, 2 fail that are not its own (one read another helper's half-written file, one passes when run alone).

- **Part 5 is not fixed.** A rule for who a wait is on would have removed 310 stored waits, most of them real, so it was taken back out. Neema's shop and her invented wait "on the warehouse" stay until the model reads her check-in again.
- **For Hafsah:** should a round's numbers be counted when one person's check-in closes, rather than when everybody has finished? Today Neema's shop waits on Faraji. And should a deal's "Cooling" be measured to the record's own clock, so it does not change with the day the board is read?

**Approvals, email matching, Ask Groundwork and the daily summary are done** (`1b77ebda` to `7ce68216`, pushed; 3,600 tests in those parts pass, none changed).
- The approver, on WhatsApp: "Hi Wairimu, Amina has asked for leave from Monday 5 October to Friday 9 October, and it is waiting for you. Reply here to approve or decline it, or open Groundwork to read it first." Her "approve" is said back ("You are approving Amina's leave ... Is that right?") and acted on only after yes.
- The person: "Hi Amina, your request for leave from Monday 5 October to Friday 9 October was approved by Wairimu. Open Groundwork to read it."
- A roster entry with no sign-in linked is matched by email, trimmed and ignoring capitals; an email on two entries matches nobody.
- On WhatsApp, Ask Groundwork leaves check-ins kept in the app out of every read, checked on the prompt the model is given. In the app it is unchanged.
- The lead's summary at 07:00: "Good morning Wairimu. ... In "Sales team, Q3", 5 of 6 people have checked in, and Omar has not yet. Amina's leave ... is waiting for you to approve or decline."
- A one-to-one check-in now says only "It takes about ten minutes.", never "released with everybody else's".

**For Hafsah:**
- Should an admin who approves, but runs no check-in, get a morning summary too? Today they are told about a waiting request on WhatsApp only if they have had no other message that day; otherwise only in the app.
- The app says "about ten minutes" and the WhatsApp notice "about five minutes". Which?
- Submit `groundwork_request_waiting` and `groundwork_request_decided` with the other templates.
- Because the summary is the lead's one message of the day, a lead who also answers elsewhere does not get their own morning reminder that day (decision 13).
- Hours can be approved but not declined, as on the board.

**Performance reviews, item 16, are done** (`2a8e77eb` to `cdf5e3ee`, pushed; 3,159 tests in those parts pass, none changed). Each review now says where it stands ("Ready to start. 6 months of check-ins to draw on.", "Started on 2 October 2026. Aisha can read it and add a view of their own."). A review cannot start while a probation or plan about the same person is still open. The person finds their own review ("Wairimu has started your review. You can read it and add your own view before you meet.") and is told on WhatsApp that it waits in the app, never what it says. A fault was fixed on the way: the writer's suggestion on a review was always empty, because a service was never given to it.

The recognise suggestion is built and **off** (`reviews.recognise`). The proposal: suggest recognising somebody when, in the four weeks before the review started, at least 8 commitments in the writer's check-ins with them were settled and at least nine in ten were kept; a miss during approved leave does not count. The person reads the numbers first; the writer reads no number (decision 53), and only after the person has written their view or three days have passed.

**For Hafsah:**
- Confirm the threshold above, and whether to switch it on. There is no admin page for it yet.
- The prototype gives the manager a count ("She kept 41 of her 44"). Decision 53 forbids that, so the manager reads none. Keep it that way?
- Should a review have an appeal? Decision 6 says the person can appeal, but the prototype's review screen shows none.
- An admin outside the check-in reads "After a check-in about Kwame is decided." This says some decision about Kwame is open without naming it. Acceptable?
- Leave is read only to excuse a miss in the recognise check. Does "hours and leave never feed a review" allow that?
- Submit `groundwork_review_started` and `groundwork_review_decided` with the other templates.

**Reviews now find their person by email too** (`4d22feea`): an unlinked roster entry with the same email as a sign-in finds, reads and answers their own review, and is told on WhatsApp. **The failing audit of checks that can never be true passes again** (`16e147ee`): one check removed, one field renamed, nothing served changed. Its note to the screens landed in the board helper's commit `8bc65639` rather than its own; the text is in the file, and no history was rewritten.

**The back office's usage numbers, item 19, are checked and fixed** (`aeb8d414` to `bf6bd58f`, pushed; 1,121 of 1,122 tests pass in those parts, and the one failure is a date format being fixed now). Every number was compared with the local test database. Eight were wrong:

| Number | Served | Now |
| --- | --- | --- |
| The System tab | An error, so no numbers at all | 1,412 organisations, 1,589 check-ins, 6,596 sessions |
| Average minutes per session, 1 / 2 / 3 | 110.3 / 105.3 / 189 | 13.9 / 7.7 / 12.7 (sessions the clock closed are no longer timed) |
| Usage events, check-ins completed | Missing | 6,325 |
| People per organisation | 4,721 | 4,723, by the People page's seat rule |
| Check-ins per prompt version | Counted outcomes (0 on the version that runs) | Counted check-ins (89 on v44) |
| Subscribed organisations | Any plan, paused or past due included | Active plans only |
| Check-ins that were Paid | 193 | 166, and 27 free with no reason recorded |
| Feedback total | Never more than 50, our own organisations included | Every customer's answer |

**For Hafsah:**
- Should "Sessions completed" and the drop-off counts include the 470 sessions the clock closed? They are no longer timed, but still counted.
- **Privacy question:** the platform admin reads people's outcome feedback notes word for word, on the dashboard and the Feedback tab. Is that allowed, given the console should show counts, never what people said? Nothing was changed; this needs your decision.
- For the rebuild (item 22): the console shows no WhatsApp sends and no Ask Groundwork use; "Sessions in balance" means nothing under subscriptions; the drop-off chart stops at session 7.

**The Connections page's WhatsApp numbers are fixed** (`1d706656`): in a seeded week, "5 people checking in on WhatsApp, 9 check-ins this month, 4 failed messages this week" now reads 2, 2 and 2, because Ask Groundwork conversations, held messages and the free "WhatsApp is off" notice are no longer counted. Nothing on the screen moves. **The billing dates use the one shared format** (`84c2c0ed`); the emails read the same. 979 tests in those parts pass.

**Request 118 and item 18 are done in code** (`c12aa05f` to `ed2e4e5c`, pushed; 5,775 tests in board, reports and grounds pass). Each change is written in `docs/answers-from-engine.md` in its own commit.
- Rukia's Today no longer fails when nobody is left to name; an empty list is tested on Today, the board and the lead's summary.
- Rukia reads "No position is shown for you, Amani Wekesa, …" instead of her own name.
- The stored story's "You are waiting on themselves to approve a discount" now reads "You still have to approve a discount for Baraka Mwangi and to send a price list to Amani Wekesa.", fixed where it is served.
- "People see two things differently. People said different things." is said once; a deal added on the board is "put at Won on the board", not "reported".
- Onboarding and project boards, 14 faults: for example "Put Kwabena Mensah, Kwabena, and Samuel Aryee, Samuel, in a room" now reads "Put Kwabena Mensah and Samuel Aryee in a room together …"; Tobi reads "Your check-in with Amina", not "with Dr"; the person's own row says "you" throughout.

The rest of request 117 on the sales board is stored rows on the screens workspace's own database, not code: the record script fixes the false "Met" and the headline; deal owners wait on Rukia answering the claim the script puts to her; Neema's shop waits on the model's next read. One rule slip: one commit (`089002fd`) was made with two git commands joined; nothing else.

**For Hafsah:**
- The prototype's onboarding board shows sections the engine does not build: what was agreed at the start, change since the last check-in, the 90 days in three steps, the person's 12-week history, and "Where this is heading" (keep on, extend, change the role, part ways). That last one is left off evaluation check-ins on purpose (decision 6), and a first 90 days is one. Should a first 90 days show it?
- Should onboarding and project check-ins have a kind of work, so the project board can show releases and tasks as the prototype's engineering example does?
- The coaching role maps have clipped phrases ("Busy in the weeds on comfortable work; …"), and the lead of a first 90 days is read as "Founder or CEO". Rewrite them?

**WhatsApp's waiting yes-or-no now survives a restart and a second copy of the server** (`12b132b7`, migration 72, applied to the local test database only; 1,026 tests pass). Nothing a person reads changed. Approvals waiting for a yes were already stored.

**For Hafsah:** the person's request words ("Can I take Friday off?") are now written to the database while Groundwork waits for their yes or no, up to about 10 minutes, and cleared on the answer or by the next WhatsApp message anyone sends. The code needs the words to act on the yes. If you want them gone at 10 minutes even when nobody writes, a small clean-up can be added to the nightly jobs.

**The API did not start, from `4baeb646` onwards.** Run-25 found it: the back office fix (item 19) made two files import each other, so the conversation service could not be set up and the server stopped at once. No test caught it, because no test starts the whole app. Nothing went anywhere, and only the scratchpad run was affected. **Fixed** (`4090223b`): the shared word moved to a file with no imports, and a new test builds the whole app, which fails on the old code. The built server started and answered (`GET /api/v1/billing/pricing` 200). No other loop was added this week.

**Also done:** on WhatsApp, a kept check-in's waits are left out before alike waits are merged (`6cac17d6`), and a performance review now shows on Today, for the person and for whoever writes it (`073dd64b`).

**The WhatsApp merge gap, in detail** (`6cac17d6`): before, Wairimu asking "who is waiting on me" on WhatsApp could read words from a check-in kept in the app ("…before my Westgate review in the plan"). Now she reads only the team's wait. In the app nothing changes. **Grammar** (`44c18570`): "Their own direct reports holds it." now reads "hold it."

**Reviews on Today** (`073dd64b`): Aisha reads "Wairimu has started your review. You can read it and add your own view before you meet."; Wairimu reads "Miriam's review is ready for you to start." A review Groundwork only proposed is never shown to the person.

**For Hafsah:** a writer sees a review on Today only when it is due within two weeks or overdue, and a decided one stays two weeks. Without a limit, a six-monthly review would sit on everybody's Today all the time. Confirm or change the two weeks.

**Ask Groundwork names people, in full sentences** (`856d0cbd`, `bc7aa385`; 4,903 tests pass). Wairimu asking "where am I needed" read "femi@baridi.test: waiting on you for the new price list for Kilimani, 22 days." She now reads "Femi Ade has been waiting on you for the new price list for Kilimani since 10 September." Where somebody may not be named to the reader (the person a performance plan is about, decision 17), or has no name anywhere, it says "Somebody in Sales team, Q3 …". An email is never said. Each wait says the day it began, not a count that changes.

**For Hafsah:** an admin who is waited on in a check-in where people are not named to each other reads "somebody in …", which is stricter than "Everything asked of you", where admins see names. Keep it strict, or let admins see the name there?

**Waits taken further now show, to the right person only** (`72e9b0a6`; 5,000 tests pass). The group in "where am I needed" could never show, and its sentence ("has raised that they are stuck") was untrue: nobody raises a wait by hand; Groundwork stamps one still open after 14 days. Now Wairimu, who runs the check-in, reads "Femi Ade … has been waiting on Miriam Njeri for it since 10 September, in the check-in Sales team, Q3. It was still open after 14 days, so Groundwork raised it on 24 September." Wiring it as it was written would have shown every such wait in the organisation to everybody; only whoever runs that check-in reads it now. On WhatsApp, waits from check-ins kept in the app stay out.

**The lead's read of a handoff says only what is true** (`1973482c`; 5,003 tests pass). Before: "the schema sign-off - 20 days with Tom, blocking. Tom has been told - it was raised automatically once it passed 14 days." Now: "Priya has been waiting on Tom for the schema sign-off since 12 May. They have said it stops their work. Groundwork raised it on 26 May, after it had been open for 14 days. That posts a notice to your organisation's own connected tools, where there are any. It does not tell Tom directly. If it is still open, ask Tom what they need in order to finish it, rather than whether they will."

**The rest of the lead's read is plain** (`2d5f3b3f`; 5,010 tests pass). "Send the migration plan. - due 9 days ago, still open." now reads "Priya promised "Send the migration plan" by 23 May, and it is still open." "A STALLED OBJECTIVE finding, 5 days old." now reads "Groundwork first raised "stalled objective" on 27 May, and nothing more was written about it." Two wordings had no prototype to copy, so they are the helper's own: "Priya's next check-in asks them to put a date on it", which mixes a name with "them", and the finding's key put into words.

**Decision 85, the suites as one workflow layer, recorded.** The comparison of each suite with the seven layers is running. Four points meet earlier decisions and wait for Hafsah: counts in the manager's review briefing (decision 53), patterns about one person (decision 74), the chief executive seeing individual records (decision 73), and calendar and payment-system connections.

**The suites compared with the seven layers** (`docs/suites-against-the-workflow-model.md`, `54f4d4a1`). No reader is sent more than decision 85 allows. In one line each: leave works in chat, setup and WhatsApp, but has no escalation, leave types, "ask a question", or what the person owns in those days; spending has one limit and one named person above it, and finance's part (verify, code, export, mark paid) is missing; timesheets take hours in chat and get weekly approval, but are not drafted from the record; reviews fall due, start, take both views and a decision, but the person cannot correct the record and there is no manager briefing. They are four services sharing helpers, with three different approval rules, not one engine. Two bugs: an approver named for spending above the limit who is not an admin can never decide; and where an admin writes reviews, the person is still told their line manager started it.

**For Hafsah:**
- A lead in the same department who does not approve still reads the leave, spending and hours requests, including days of leave left; and a lead who does not write a review reads all of it. Keep that?
- When someone asks for leave, the say-back names which colleagues are off ("Brian is also off then"). Keep that?
- Reading timesheets against what was delivered may go against decision 10 (hours are for billing only). May they?
- Nobody holds the HR, finance or budget-owner duty in Groundwork yet. Each organisation will have to say who does.

Run-25 was stopped: decision 86's reversals change what the engine writes, so it runs after them.

**Decision 86 so far:** patterns reach the lead again after the person's turn (`92e2c434`), and the manager reads the count behind a suggestion (`4c647014`). Admins' figures are in progress. **The privacy restrictions Claude chose are listed** in `docs/privacy-restrictions-for-hafsah.md`: 23 rows, 9 never seen by Hafsah, 13 confirmed only in bulk, 1 never asked on its own. Nothing changed until she answers.

**Spending** (`a2990939`, `b7ff00b4`; 1,713 tests pass): a member named for spending over the limit could be told a request waited and then find nothing to approve. Now Omar can see it and approve it in the app, in Ask Groundwork or by WhatsApp reply. (Correction: an earlier version of this line said he also sees it on Today. He does not yet; Today hid approvals from members. That is being fixed now.) **Each organisation now says who holds each duty** (finance, HR, the chief executive, each team's budget holder and head), set by an admin; spending over the limit goes to the team's budget holder, then finance, then the person named before. No migration.

**For Hafsah:**
- Spending over the limit goes to the budget holder before finance, following decision 85's example. Or finance first, or both in turn?
- Setting a duty now overrides the person the admin named for "anything above that". All right?
- Only an admin reads who holds each duty. May leads or everybody read it?
- A named approver who is not an admin sees no team budgets (the prototype shows them only to an admin). Should finance or an approver see every team's budget?

**One approval rule for every suite** (`1625d046`, `18996ed6`, `04f1360a`; 1,853 tests pass). The three separate rules are replaced by one, which names approvers by role and reads who holds each duty. Across all 602 combinations of existing answers, the same person approves as before, except two where nobody could approve at all (a lead named as their own manager for a review; spending above the limit named to a guest or someone who has left); those now go to an admin. A member named as approver or review writer now opens the leave, hours or reviews board and sees only what waits on them. **The review bug is fixed:** where Grace, an admin, started Aisha's review, Aisha read "Wairimu has started your review."; she now reads "Grace has started your review." in the app, on Today and on WhatsApp.

**For Hafsah:**
- Leave and hours still ignore the answer "An admin" (decided 1 October), while reviews follow it. Should leave and hours follow it now?
- A line manager who is a member (not a lead or admin) cannot approve their own people's requests; an admin does. Now that members can open the boards, should their line manager approve?
- Before anyone starts a review that any admin may write, its "Written with" is blank. Should it say "An admin"?
- A member who approves leave sees only the requests waiting on them, not who else is off. Confirm or widen.

**Decision 86 is in** (`92e2c434`, `4c647014`, `04053a91`; 9,700 tests pass across the folders touched).
- **Patterns:** the `patterns.reach` setting is gone. The person reads "You are seeing this first. Tunde will see it too, with anything you say about it." The lead then reads the pattern and the person's answer on the board, the ending page, the weekly report and Today.
- **Counts:** the lead reads "In the last four weeks, Kwame kept two of the eight commitments made in this check-in. That is 25%. When fewer than half are kept, Groundwork suggests extra support." The review writer reads "Aisha kept nine of the ten commitments …".
- **Admins' figures:** an admin, the chief executive included, reads every person's aim and number on the board and in the weekly report ("Aisha Otieno is at 1 of 40, and 3 of the 4 rounds have gone."). The Company page already showed the figures.

**For Hafsah:**
- The Context page, the session report and Today still hide each person's figures from an admin who only reads, so the same admin reads Kwame's 17 on the board but not in the report. Should those show them too?
- Patterns reach the lead and the admin who set the check-in up. Should every admin read them, after the person's turn?
- A decision about a person (decision 46) stays the lead's alone, hidden from admins. Right?
- Suggestions already stored keep their old wording without a count. Fine, with no live users?

**Today now shows a member what waits for them** (`2d6d9e51`): Omar, a member named for spending over the limit, reads "Lina asked to spend KES 95,000 on a new laptop. It is waiting for you to approve." on Today; a member who heads a team reads its leave, hours and reviews to start. A member nobody names still reads nothing. One existing test changed, because it pinned the old fault.

**Approval steps, escalation and one record of who did what** (`c9d61a5d` to `1a2411e3`; migrations 73 and 74, local only; 3,760 tests pass). An admin can now send a request through several steps ("first to the person's manager, then to whoever looks after HR"); each approval moves it on and only the last ends it. With no steps set, every one of 90 cases decides exactly as before. Aisha reads where her request is: "Your leave from Thursday 1 October to Friday 2 October is approved by Wairimu and is now waiting for Omar in finance." Escalation runs once a day, only where an admin set a number of working days, and also when the approver is on leave. Every request keeps its history in plain sentences ("Wairimu approved it on 2 October."), and admins read who changed the suites' rules and when.

**For Hafsah:**
- Should a request pass on when its approver is on leave, even where no number of days is set?
- A member who approved an earlier step loses sight of the request's history once it moves on. Should anyone who ever decided a request keep reading its history?
- Should Today tell an approver who approved the earlier steps?
- Should a review have steps (for example the manager writes it and HR signs it off)?
- Should the person be told on WhatsApp at each step, not only at the end? That needs a new template.

**Leave, as decision 85 describes it** (`1ccc4172` to `4bf35fb2`; migration 75, local only; 3,815 tests pass).
- **The approver reads:** "Aisha asked for annual leave from Thursday 8 October to Friday 9 October, which is 2 working days.", "Aisha has 21 days of annual leave left.", "Brian and Neema are also off on some of those days, so Sales would be three short.", and "Aisha owns "Project X milestone" on Sales, Q3, due on Thursday 15 October."
- **Asking a question:** the approver can ask one ("Who will cover the Project X milestone?"). Aisha is told in the app and on WhatsApp, answers, and the request keeps waiting. A decline can carry a reason, which Aisha reads.
- **Leave rules, set by an admin:** kinds with their own allowances, notice, blackout periods, 90 days before leave, sick notes, and HR told. Aisha's say-back names a rule that applies ("Annual leave needs two weeks' notice, and this starts in three days. Shall I still send it to Wairimu?").
- With no rules set, everything reads exactly as before.

**For Hafsah:**
- The kind of leave ("Sick leave") is now shown to whoever decides, admins, the team's lead, HR, and in "Who's off". The engine still gets dates only (decision 31). All of those readers, or only whoever decides and HR?
- Where should a sick note be kept? No file is stored yet; the rule is only said.
- "Time here" counts from when the person was added to Groundwork, because there is no start date. Should the staff directory have one?
- Should a request waiting on the person's answer stop counting towards being passed on?
- Two templates are proposed: a question about a request, and leave told to HR. Submit them?

**Spending and finance, as decision 85 describes them** (`fc5aef52` to `759ce9c5`; migrations 76 to 79, local only; 3,899 tests pass). An admin sets categories, evidence needed (a receipt or quote) and several thresholds, each with its own steps. Groundwork asks only for what is missing ("Which category is this for? It can be Fuel, Travel or Equipment."). Approvers can ask a question and give a reason with a decline, as on leave. Finance (Omar) reads each approved request, checks it, codes it, records the receipt, exports a CSV or Excel file of requests to pay, and marks them paid; Kamau reads "Your request to spend KES 12,000 for fuel for Kisumu deliveries … was paid on 6 October." With no rules set, everything reads as before. On WhatsApp, an answer to an approver's question now reaches the question even with a check-in open ("Is this your answer to Wairimu's question about your leave?").

**For Hafsah:**
- Finance's steps can be done by whoever holds the finance duty and any admin. Should an admin act when somebody is named for finance?
- Nobody checks or pays their own request, copied from "nobody approves their own". Right?
- Should a missing receipt or quote block payment? Today it does not.
- Should the person be able to say they handed in the receipt? Today only finance ticks it.
- Should the person be told on WhatsApp when a request is paid?

**Timesheets, as decision 85 describes them** (`b8778d2f` to `e2aebc00`; migration 80, local only; 3,955 tests pass, none changed).
- **Rules:** an admin sets who keeps a time sheet, how often, hours asked a week, a cut-off in Lagos time, and what is billable.
- **The person** reads "You have recorded 31 hours this week. You still need 9 hours by Friday at 17:00." on Today and in Ask Groundwork.
- **Billing:** an admin or finance exports approved billable hours as CSV or Excel.
- **A drafted week:** Groundwork drafts the week from the person's own record ("I have enough to draft this week's hours. Here is what I found."), says plainly that the record holds no durations, and nothing is sent without their yes.
- Hours never feed a report, a signal or a review (decision 10). With no rules set, everything is as before.

**Also fixed:** a WhatsApp message held for a yes or no was lost after ten minutes. It now goes into the check-in at the person's next message: "You did not answer my question within ten minutes, so I have added what you wrote earlier to your check-in."

**For Hafsah:**
- The draft shares out the hours asked a week across the days the record shows, because it holds no durations, and says so. Acceptable, or only list what was found and always ask for the hours?
- Should finance be able to export the billing file, or only admins?
- A lead in a team that keeps time sheets also gets "You still need…" about their own hours on Today. Wanted?

**Run-25 (on `a7e0f76f`, all 24 scenarios): worse than the baseline on one number.** "Proof asked for" is 33 against the baseline's 42 (run-24 was already 37). The drop is spread across scenarios (cofounder 3 to 0, sales 5 to 3, loans 4 to 2, while seniorhire rose 1 to 5), and the conversation prompt did not change, so it looks like the model varying. It is still below the line, and under the rules that makes it wrong until it is back. Patterns 90 against 100 sits exactly on the line. Everything else is at or above the baseline: zero wording problems of every kind, jargon in reports 60 against 511, commitments recorded 61 against 33. "Waiting on themselves" appears nowhere.

**A privacy fault, against decision 75 item 14:** in loans, where borrowers do not see each other, Sunday's report now says "One participant's tricycle was stolen in the fourth month", and his board lists other borrowers' businesses with their figures. With two tricycles among eight borrowers, these point at people. Sunday's quick read also gives Musa's wait as if it were his. **Being fixed now**, with other faults the reading found:
- "Work is held up by a colleague's documents" (the customers' documents);
- "on, the-ground", 31 times;
- Femi named on his own board where "you" belongs;
- empty aim rows;
- Kwame's own "I'm aiming" glued into a sentence about him;
- a name said twice in a sentence (406, up from 362).

Not checked by the run: the admin's view, because the run keeps only the lead's and one participant's.

**Reviews, as decision 85 describes them** (`4197cd1a`, `cda71b45`, `45cbd058`; migration 81, local only; 3,822 tests pass). When a review starts, Groundwork reads the record for the period and keeps it, built from rows, with no model. Aisha reads "This is what Groundwork understands from the record about your work between 1 April 2026 and 1 October 2026 …", then lines such as "In "Sales team, Q3", you made 5 commitments … Of these, 2 were done, 1 was not done, 1 was dropped and 1 was still open when this review started." She can mark any line wrong and say what is true; the correction sits beside the line and never changes the record. Wairimu, who writes it, gets a separate briefing: the counts, the patterns with Aisha's answers ("Aisha hasn't answered this yet." where she has not), what changed after earlier talks, and Aisha's corrections, ending "There are no scores. Groundwork gives you the evidence and the patterns, and you decide." No reader gets a label, verdict or score.

**For Hafsah:**
- Anyone other than the person reads only the lines and counts from check-ins they are in, because each person's load across check-ins is private (decision 4). The prototype shows the admin "Kept 41 of 44 things she said she would do", a count across check-ins. Your decision and the prototype disagree here: should admins read the whole record and the counts?
- The briefing is served to everybody who may open the review except the person, each limited to what they can already read. Decision 85 says "the manager gets a separate briefing". Should it be the writer's alone?
- A correction on a line from a check-in the writer is not in stays with the person, who is told to put it in their own view. Right?
- The record knows only that a commitment was dropped, not that its scope changed. Is "dropped" enough?

**The run-25 faults are fixed** (`867fc6b3` to `180d3a73`, nine commits).
- **The loans privacy fault:** Sunday no longer reads "One participant's tricycle was stolen…" or another borrower's business and earnings. He keeps the counts, the shared pattern and his own grinding business, and his quick read no longer gives Musa's wait.
- **Other fixes:**
  - "Work is held up by the customers' documents" (not "a colleague's");
  - "on-the-ground" is kept whole;
  - Femi reads "You are trying to get twelve approved facilities…" on his own board;
  - empty aim rows are gone;
  - Kwame's own "I'm aiming" is no longer glued on;
  - a promise is no longer listed as an aim;
  - "Any change in them will show here after the next check-in." replaces "no round has closed".
- **Names said twice:** by the builder's count, sentences with a name said twice fall from 459 to 275.

**For Hafsah:** the rest of the names said twice ("Musa says Musa never received the grinding machine") can only be fixed with "they" or with "he" or "she". Groundwork never guesses "he" or "she". May it say "they" there?

**"What the room is about" leaked, and is fixed** (`4589925c`). Loans has no such section, but on every other kind of check-in that has one, where the lead keeps people apart, a participant was served the others' aims by name ("Musa Danjuma wants the grinding machine he was promised to be delivered.", "Yakubu Sani wants help after his tricycle was stolen."). Now a participant reads their own ("You are trying to catch up on the three repayments you missed."), aims shared by several ("The borrowers want the first repayment to start once the asset earns.", with a count of others), and the lead's; nothing about Musa or Yakubu. The lead and admins read it whole. **The old failing tests pass** with a fixed clock (`f5ddd1fc`), and "waiting on The customers" now reads "waiting on the customers" (`49d6a074`). 6,602 of 6,603 tests pass in reports, board, grounds and suites.

**For Hafsah:**
- "What the room is about" is kept on the check-in with full names, and served outside the wrapper that handles names and anonymous sharing. Should it be stored with labels and named only when served, like reports?
- The one failing test (`a-number-with-a-name-on-it-goes-through-one-rule`) flags four new suites files that read a goal's numbers outside the one rule. The builder judges each a fair exception (a test fixture; the person's own drafted week; leave reading only a goal's name and date; a review reading the person's own goals). May they be added to its list of exceptions?
- A review shows a person's goal figures only to the person and whoever runs that check-in. Decision 86 says admins see the figures. Should an admin who opens the review see them too?

**Setting up a suite by talking to Groundwork** (`34293f00` to `0d4bc28f`; 1,537 tests pass). An admin says "Set up our employee leave process". Groundwork asks one question at a time, only for what it does not know ("Who approves annual leave?", "Does HR need to see all requests?", "What happens if the manager doesn't respond within two working days?"), then says the whole process back in plain sentences, and sets nothing until the admin says yes. A change ("make it three working days") is said back again. On yes it writes through the same rules the Suites page uses, and reads them back from the store. People named in answers become their job ("the head of the person's team"), so the setup survives people changing jobs. Leave, spending, time sheets and reviews all work this way. Anyone else is told who can set it up, and nothing changes. No model reads the answers yet; they are read by rules, like the role interview.

**For Hafsah:**
- Should a model read a long description given in one message ("Employees can request annual leave. Their line manager approves it…")? Today only short answers and a few kinds of statement are read; anything else is asked.
- Once spending is set up by talking, the Suites page's single "who approves anything above the limit" person is no longer used. Acceptable, or should that question become optional?

**Built from what this found** (`2860bab5` to `43e12b1c`; 3,697 tests pass):
- **Leave approved by length:** Grace says "If it's more than 10 working days, the department head also approves", and it is stored. Aisha asking for 12 days reads "This is more than ten working days, so Wairimu approves it first, and then Joseph, who heads Sales."
- **HR and finance may set up their suites:** whoever looks after HR sets up leave and reviews, and whoever looks after finance sets up spending and time sheets. Naming who holds each job stays an admin's.
- **The same approver twice:** when the same person already approved, the later step passes ("Wairimu had already approved it, so this step was passed.").
- **The history names HR:** the leave rules history names who looks after HR.

**For Hafsah:**
- When the same person would approve twice, their one approval counts for both. Or should it skip them and go to the next person on that step's list?
- Those who look after HR or finance may now read who holds each job, because their setup needs it. Right?
- A member who looks after HR or finance now gets a Suites page of their own; the screens workspace needs to draw it.

**Fixed** (`ab7d1f7f`, `4f7a072d`; 1,620 tests pass): the setup say-back now says "You look after HR, so you see every leave request on the leave board…" to Grace, and "it goes to you to approve as well" where a step comes to the reader; others are still named. The odd question "after the head of the team, for example the head of the person's team?" now gives a job that does not already approve it ("for example HR?").

**NEEDS HAFSAH: "proof asked for" is below the baseline, and no honest fix to the conversation brings it back.** No change caused the drop, and nothing was changed. The scorer counts any Groundwork turn containing "photo", "picture", "document", "receipt" and similar words. In the baseline, 27 of its 42 were "picture" in comments such as "That is a clear picture of your day-to-day." and "That changes the picture." Those comments were cut back on purpose in earlier work, so "picture" now gives 19 or 20. Real requests for proof did not fall: on six scenarios run three more times on today's code, the baseline asked about 3 times and the new runs 3, 5 and 8 times. The rest of the count swings with the model (loans 1 to 5, seniorhire 1 to 4 on identical code). Both runs used the same instructions (`promptVersionId c69dbfdd…`). The choices are yours: count "picture" out of "proof asked for" in the scorer, or bring back the "picture" comments. The scorer is not ours to change. "Patterns found" is within the usual swing (53 to 61 against the baseline's 50 on the same six scenarios).

**Needs Hafsah (safety check):** on 4 October the safety check refused my morning-report entry for item 21, because one listed prototype section was named with words it watches for. As the rules say, it was not reworded or written another way. Item 21 is finished in 38 commits from `a9890cc9` to `3b884e64`, each written up in `docs/answers-from-engine.md`; the builder's full report, with its questions on the prototype sections the engine does not build and on how a loan cohort is read, is held for Hafsah in this chat.

**Pattern questions are back for the lead, and records go to the owner named** (`b804c57c`, `71a94bda`; 7,226 of 7,227 tests pass, the one failure waiting on Hafsah's answer on the four suites files).
- **Pattern questions:** after the person's answer or the usual 3 or 7 days, Amina's "what to settle first" now includes, for example, "“Steps in to stop things failing” keeps coming up in Rukia Mwangi’s check-ins. This came up in 3 check-ins, in sessions 1, 2 and 3. Rukia Mwangi said, “Nobody else was on call that week.” Ask Rukia Mwangi what has changed since then."
- **Records:** Ada's "Tunde is taking on everything engineering" is now Tunde's record, not Ada's.

A three-scenario check showed sales' "blocker checked" 16 to 10 and "commitments recorded" 32 to 29. Neither change touches the conversation or what writes commitments, and sales' commitments per session (2, 8, 19 against 6, 10, 16) move as the model varies. The full run below will show it.

**Needs Hafsah (safety check):** on 4 October the safety check refused my morning-report entry for run-26, because it named a read-only command the check watches for. As the rules say, it was not reworded. Run-26's results and the reading of it are held for Hafsah in this chat. The run itself is in `api/journey/all-24/run-26` (not committed).

Now running: fixes from run-26 (the loans privacy rule, a record given to the wrong person, the lead's words on a borrower's Blockers tile), and differences lost when a report is asked for a second time.

Now running: "proof asked for": whether a change caused the drop or the model varies, with repeated runs. If it does not come back, it goes to Hafsah. Earlier: approvals, email matching, Ask Groundwork without app-kept check-ins, and the lead's daily summary (items 3, 8, 9 and 11). The settings guide (`docs/whatsapp-settings.md`) is now linked from `docs/whatsapp-end-to-end.md`.

## 2 OCTOBER: HAFSAH'S ANSWERS ON THE 49 ITEMS (decision 75), AND THE GUARD PROPOSAL

- **Decision 75 recorded** (`9922dd9d`): yes to all 49, except items 2, 5, 13, 14, 17, 24, 25, 29, 33, 35/36/45, 37, 42, 46, 48 and 49, each written in `docs/decisions-merged.md`. Being built now, two helpers at a time.
- **Decision 75, the privacy and reading items, built** (`8e6f1a1b`, `bbbeb278`, `5dcc48fc`, `b24d99d0`, `dba73aa7`, `0c34597b`; about 15,000 tests pass across the folders touched). **Item 2:** while an evaluation check-in waits for approval, the admins asked to approve it can read it (page, brief, board, reports, outcome, weekly report), but cannot change its setup; once decided, only the admin who decided keeps that access; they do not get patterns or colleagues' exact words. The product asks every admin of the organisation, so every admin can read it while it waits. **Item 25:** a probation or first 90 days is now an evaluation check-in: admins without access are walled from it on every surface, a suggestion can be reached there, and the person reviewed is never named a colleague or read a colleague's exact words. **Item 24:** an undecided suggestion keeps its facts and, when the person is back at or above the line, says so to every reader of it: Kwame reads "You have caught up since this was suggested. Since Thursday 1 October, you have kept as many of your commitments in this check-in as Groundwork looks for." (a new column; migration `20261002100000` applied to the local test database). **Item 46:** a participant's one-line summary counts only their own waits, on every check-in. **Item 13:** the lead's brief is context only; the model is told never to quote or attribute it, and a check on every participant turn cuts any sentence that copies six or more of its words, names "the brief", or says the lead "wants to know"; a participant's "About this check-in" is only the short version the lead confirmed. **Item 14:** where people do not see each other, a participant's report and board keep only counts and patterns across people, the lead's sentences and their own; on the loans run Sunday no longer reads about a colleague's stolen tricycle, and Yakubu reads his own as "The tricycle was stolen, so you have no income from it."
- **Decision 75, the remaining items, built** (`2c2d6cf6`, `20f1d391`, `cf1340a5`, `77e2acbe`, `e12dbb94`, `1bd622ec`; 9,987 tests pass across the folders touched). **Item 33:** "1 target changed this session." **Item 48:** all 97 endings are one plain sentence each, read by both panels from one file ("OKRs aligned to company direction" is now "The team's goals match where the company is going."); the refusal after a check-in ends no longer reads "This check-in ended: keep." and the closing emails read the same sentences. **Item 37:** Rukia reads "You set yourself an aim of 3 shops in Kilimani."; whoever runs it reads "Rukia Mwangi set an aim of 3 shops in Kilimani for their own work.", told apart from a number the lead set. **Item 5:** the Sales lead sees the Sales steps of a blocker plus "This is waiting on Finance since 14 September.", and no Finance step. **Item 29:** after the setup answer, the lead is asked once, "Shall I keep "Every quote over 1 million needs Grace's sign-off" as a rule for the whole organisation ...?" **Item 17:** the five kinds are built (Up and Lower is better keep their stored names AIM and LIMIT; Rate, Deadline and Zero added, with a date to meet), each with its own sentence on the board, headline, status word, forecast, weekly report and Today, for example "The team is keeping unexplained transactions at zero." / "There have been 2 so far. This should stay at zero, so any at all is a breach." (migration `20261002120000`, applied to the local test database only).
- **For Hafsah, from those items:** (1) a share is forecast in a straight line capped at 100%, a date is never forecast, and a date not yet due gets no status word; (2) a company rule the lead declined could be offered once more in a brand-new setup conversation on the old route, because nothing is stored on a no (decision 20 says a no keeps nothing); closing that gap means storing the declined words, which is her call; (3) the helper edited the screens workspace's `client/src/lib/end-states.ts` and its mirror test to keep them in step with the plain endings, which crosses the line between the two workspaces; the screens workspace is told.
- **For Hafsah, found while building:** decision 9 ("onboarding problems never count against a new person") is not enforced anywhere in the code, so a verdict on a probation, now possible under item 25, counts commitments kept regardless; and an admin who will later be added as the person reviewed could read their own plan's setup while it waits for approval, because nothing names that person before they are added.
- **Item 42 built as decided, measured, and taken back out: Hafsah to confirm (item 50).** E2, B2, K3 and B11 were judged once across their periods (`429dc204`, `45c77072`), and steadiness measured again as last night (six-a and six-b, 135 check-ins, 26 people). It was no steadier and showed far more than the detector's own reads hold: person-and-pattern pairs shown the same 72% before and 72% after (173 of 241, then 225 of 311); people shown exactly the same 97 of 156, then 88 of 156; real patterns 367 of 464 both ways; shown beyond the real ones 47, then 169. Per code it made E2 steadier only by adding patterns (beyond the real 13, then 66) and made B2 and K3 less steady. The judgement says yes more often than the detector (118 cells against 84 on six-a) and re-judges earlier periods unsteadily from their thin record lines. Because the rule is that a change that makes a number worse is wrong, the helper reverted it (`d50c7310`); the product is exactly as before, and the tried code is kept in `api/journey/the-judgement-across-periods-that-was-tried.ts` so it can be measured again or put back by reverting `d50c7310`. Two variants were also walked from the same reads; the steadiest (77%, deciding only the current period with earlier ones as context) nearly doubles what is shown beyond the real ones, so it moves the line and was not kept either. Steadiness stays at 72%, patterns stay "person only" (decision 74). The least steady remain E2, K5 and B2, each a period sitting on the three-period line.
- **The full run on the latest code (run-24, 24 scenarios, `146d8d36`, with all of decision 75).** The model answered in every scenario; one report (realign, session 1) was not finished within the runner's five minutes, so realign's report numbers are not usable. Against the baseline: every wording problem the scorer counts is at zero, jargon in reports and boards 57 (511), in Groundwork's turns 13 (42), and no turn asks two questions. Engine value against the baseline, with run-23 in brackets: proof asked for 37 against 42 (27), past words brought back 28 (39), specific detail 116 (96), blocker checked 62 (52), differences 39 (33), agreements 63 (67), per-person findings 87 (87), patterns found 95 against 100 (90), commitments recorded 58 (58), central question 29 (29), judgement 29 (29). The two under the baseline are proof asked for, which the scorer counts mostly from the words "picture" and "statement" in comments removed on purpose (see run-23), and patterns found, which last night's replay showed swings by about five between readings of the same conversations. Read in what people were served: no participant reads the lead's brief (the two hits are a person's own job brief and a document about fees), no colleague's circumstances reach a participant on loans, no working note, no instruction to the model, no raw seven-digit number, the Movement tile says "changed", the endings are plain sentences, and "the record shows" appears only in the lead's own judgement, never in a conversation. The run is slower than last night's (about four hours against two), most likely from the ten-read pattern settling.
- **Requests 109 and 111, done, and the checkability rating checked under decision 76** (`c52e4190` to `6e7f554d`, then `6a1a7ddc`, `80f10955`). Request 111 stopped every reader being sent a score of a person (a confidence, a percentage, a bare count). Comparing every payload as every reader before and after, it removed nothing that is the checkability rating in an allowed form: each person is still sent their own five parts with their own check-in, and the lead and admins still read, beside the name, "Nothing Baraka Otieno said this round can be checked yet. A number, a date or a document for what moved would change that." with "Ask Baraka Otieno for a photo, a message or a document that shows what moved.", never a number. What it removed and stays removed: the confidence and percentage on every row, a bare count sent to the lead, and a session-report line with counts about named people that colleagues also read. A new test holds the allowed forms in place as every reader (25 cases). Request 109's wrong facts are fixed at their source ("12 now, up from 0" came from the lead's own aim being read as shops signed). Request 114 is to be ignored, on Hafsah's word. A record with nobody's name now becomes somebody's deal only on the lead's yes: the lead reads "Amani Wekesa says the Westgate Deli deal is theirs. Is it?" and nobody else is sent the claim.
- **Item 54 built: each session's team picture is released on its own** (`5e6dd623`, `f5fa0a0e`; 3,778 tests pass in reports and check-ins). A new column holds which sessions are released; a migration marked each already-released report as released up to the session finished by its release (applied to the local test database only: 1,146 reports for session 1, 72 for sessions 1 and 2, 132 never released). With only session 1 released, Amani reads session 1's picture and "You are reading the team's picture of session 1. The team's picture of session 2 is not shared yet.", and nothing of a colleague's session 2 lines; once the lead presses release ("This shares the team's picture of session 2 with everyone in the check-in."), she reads both. The lead and admins read as before. Also fixed: "what changed since the last round" on session 1's report described session 2. The board is being changed to read the same release now.
- **Requests 110 and 112, and item 54 on the board, built** (`193cbc57`, `a761274b`, `3ad90a49`, `dcc204bc`; 1,556 board tests pass). **110:** a person's own aim reaches the board from their kept promise where the board did not hold it (Femi reads "You are aiming for the full 12 approved facilities. ... You set yourself this aim." and "Only you and Bisi Adeyemi see your share."); a participant is always sent their share, or a sentence that they have none. An aim from a check-in that closed before the fix and was kept only as a promise without a number cannot be recovered; the person has to say it again. **112 (a):** each deal is in a group with its reason in a plain sentence ("Likely by 30 September": "Each of these has proof or a colleague's confirmation, a date on or before 30 September, and word about it in the last week."), from the reader's own rows only; the board says plainly that no criterion is checked and no deal is "Cold", and why. **112 (b):** each item under "What needs you" has an action for the lead only ("Say whether it has happened. Until you do, it stays open on your work plan." with "Yes, it's done" and "Not yet"). **Item 54 on the board:** with only session 1 released, Femi and Ngozi read "Today's team picture is not shared yet." and no quick read, difference, forecast or headline of session 2, until Bisi releases it. Items 57 to 59 are for Hafsah.
- **Requests 113, 115 and 116 done; 114 set aside** (`35e1e389`, `21e12159` to `fd97c77a`). **116:** every allowed form of the checkability read still reaches exactly its readers (each person their own read in words and their own parts; the lead and admins "Nothing checkable" with what to ask next, never a number); the one gap, a "Nothing checkable" line with no ask, now asks "Ask Baraka Otieno for a photo, a message or a document that shows what moved."; and a person who never checked in no longer gets a read on answers never given: the lead reads "Faraji Odhiambo has not checked in yet." where it read "Nothing Faraji Odhiambo has said so far is checkable". **115:** each deal row carries its value where somebody said it ("Nobody has said what this deal is worth yet." otherwise), the days it was spoken about, and the owner's own latest words about it; the gap closers, help nobody mentioned (to whoever runs it only, never who said it), and what a target assumes are served; "waiting on someone" replaces "nothing to do" where a person waits on a colleague; the blocker line names whose promise it is; only stages with deals are sent; a session somebody has checked in to is "current". **113:** one test now loads a run's data as data; the other already passed. One board test that pinned the screens' old drawing code was updated (`the-board-answers-its-own-question`). The guard refused one command of the 115/116 helper (setting files aside to prove a test fails on old code); it stopped there. Items 60 to 62 are for Hafsah.
- **Requests 100, 101 (e, f), 104 and 115 (h) done** (`41ec7b01`, `2d322746`, `563dee0d`, `90dfaecd`, `8a986e1c`, `4f832b2f`; 4,021 tests pass in board, check-ins and the assistant). Opening the lead's Context tab no longer asks the model; it opens on what is stored ("This check-in runs for 90 days and people check in once a week. What does doing well look like here? ..."), and the first model call is on the lead's first message. The check-in page now serves one session count from the board's own clock ("Session 1 of 12." and "Session 2 has started for some people, while session 1 is still open."). `mayChangeSetup` tells the screens who may rewrite the setup (the lead, or an admin only once the lead has left). Each wait is a full sentence ("Baraka Otieno is waiting on Chandarana Westlands."; "You are waiting on Rukia Mwangi." to Baraka). Request 100: "nothing yet" is never sent beside a difference or an agreement (already built, now tested for every reader); the kind of work stays on the payload because the screens use it for every reader, and no sentence quotes it. Request 101 (c) waits for Hafsah (item 63). Then (`2b2782d2`, 4,099 tests pass): the setup chat, its confirm and its decline follow decisions 63 and 72; an admin while the lead is there is refused with "Only Wanjiru Mwangi, who runs this check-in, can change how it is set up. An admin can only do that once Wanjiru has left the organisation. Nothing was changed.", with no model call. Then (`a892970f`, 2,545 tests pass): adding and changing context lines, keeping and sharing private notes, and questions for people were already under the rule (now proven as every reader), except the step that works out a question before the lead's yes, which let any admin in and now refuses; and Ask Groundwork no longer offers those three doors to an admin while the lead is there. Who may read a private note is unchanged: only the lead.
- **Requests 101 (a, b, d), 102 and 103 done** (`16ea931f`, `33e7a809`, `01c74168`, `686abe3c`, `6d8affe9`; 2,125 reports tests pass). **101:** the session report every participant reads no longer carries a reading about each named person with advice to the lead ("Rukia Otieno, You, Baraka Mwangi and Neema Achieng: the role was never clearly defined ... Define what this role owns ..."); Amani now reads "4 of 5 people have answered this session. There is enough here to talk about, and not enough to settle anything."; the lead's probe list no longer names a person an admin has not let in; and every report read says "you" for the reader ("You make a decision on the discount."). **102:** a closed session's own report carries its own coaching note, probe list and inferences, built from the record as it stood when that session closed, never the latest session's; opening it asks no model; found on the way, a closed session's picture showed a later session's wait, now fixed. **103:** the checkability read was brought up to date on the local test database only, by a one-off script with the same guard as the word-for-word script (a dry run found 4,506 of 6,325 check-ins to raise, for example a date that was said but not picked up; it only raises a part and never lowers one, and never changes anyone's words; a second dry run found none left). Amani's Done page now reads "One date, number or document. Groundwork found this." For a hosted database it is a release step, explicitly confirmed. The helper said the board still uses the reader's name in one place; I tried the one-line change it suggested and it made no difference to anything served on the test boards, so I took it out rather than commit something unproven. Item 64 is for Hafsah.
- **Decision 77 built** (`44c7b88b`, `508cde24`, `885c5049`; 5,582 tests pass in board, check-ins and reports, 3,216 in the conversation and entry). Somebody an admin has not let in is in no "N of M" count and does not hold a session open: every reader now reads "4 of 4 people have answered this session." where it read "4 of 5", the session closes and its report is released once everybody let in has answered, Today reads "4 of 5 have checked in ... Brian has not checked in yet." without Faraji, and the weekly report no longer counts him. The lead and admins read "Faraji Odhiambo is waiting to be let in." (or "was not let in." after a decline); once he is let in he is counted again. Then (`257eb3ae`, 5,593 tests pass): the "waiting to be let in" line goes only to the lead, the admin who set it up and an admin with access; participants are sent nothing about it, before or after a decline, whether or not people see each other. Also fixed: one test read the real clock ("waiting on you for 2 days" became 3 at six in the evening) and now has a fixed one (`35d6b8b4`).
- **The Company page, decision 79 item 1** (`61f0840d`, `ee45048d`, `b02fb23a`; 1,825 check-in tests and 2,873 conversation and prompt tests pass). Gone through section by section against the prototype's Company page. Already served and kept: the name and counts line, each priority's reading and owner, where the strategy is not reaching the work, what more than one team named, and what you say against where the time goes. Built now from the organisation's own aims: "What each level understood", priority to objective to project, marking where the meaning changed ("The meaning changed here, from orders arriving on time to more vans."); a lead now gets the questions asked of them under "For you"; "Touches priorities 1 and 2." and "Nobody owns it." in the prototype's words; and each team links to its check-ins. Not built, with the reason given on the page and to the screens: strategy versions and history, the per-priority figures (decision 73), the visit log, linked organisations, and what new people keep asking (private). Who reads it: admins everything; a lead or anyone who runs a check-in the readings on their own check-ins; a participant the priorities and owners only; a guest is refused. The screens workspace has, in `docs/answers-from-engine.md`, exactly what the page will receive, section by section. The company-picture instructions gained a part, which becomes the active version on the next start unless one was switched on by hand. Items 66 to 68 are for Hafsah.
- **Decision 78, billing, built** (`510f9479`, `c694a670`, `80742eb7`, `dc19736b`; 328 billing, WhatsApp and admin tests and 467 API and webhook tests pass). The free trial is one month by default, still for teams under 20 and still switched off (local test database row written; nothing about real billing changes until it is switched on). WhatsApp is a paid add-on: the price for each plan is stored in the database (Starter $20, Small Team $72, Growth $320, Business $720, Scale $1,320), editable by a platform admin; an organisation's admin turns it on, and once the trial is over it is a second monthly line on the Stripe subscription, in test mode only. Each plan's monthly WhatsApp limit is in the database (item 69); at the limit nothing more goes by WhatsApp that month, the check-in carries on in the app, and the admins are told once. An admin reads, for example, "WhatsApp costs $72 a month on your Small Team plan." and "Your organisation has sent 0 of its 2,000 WhatsApp messages this month."; a member whose message is held reads only why ("Your organisation has used all its WhatsApp messages for this month, so this check-in stays in the app. WhatsApp starts again on 1 November 2026."). Fixed on the way: changing plan could move the add-on's line instead of the plan's own. The screens workspace has, in `docs/answers-from-engine.md`, what Plan and billing shows. Items 69 to 72 are for Hafsah.
- **The Company page's new instructions, proven on a live picture.** After a restart, version 2 of the company-picture instructions (with the new part on where an aim's meaning changed) was seeded and made active. Rebuilding two organisations' pictures through the product's own code, both pictures record that version (`promptVersionId` 18346800...). On Meridian Advisory's, under "Grow revenue by 40% while holding delivery quality", the project "Atlas market entry study" reads "The meaning changed here, from growing the business to a market study.", and the objective "Hold delivery quality while the book grows" reads as unchanged. On Groundwork's own organisation every priority has no objectives under it, so there is nothing to mark there; one of its priorities is stored with the title ": three customers live on the API", a stray colon in its stored name.
- **The WhatsApp status page, built** (`0ffb5adb`, `3bd0bd68`; 405 tests pass). The organisation's admin now reads, from `GET /integrations/whatsapp`, the prototype's WhatsApp card in plain sentences: whether WhatsApp is connected ("Your people check in by replying to +254 709 000 111, Baridi Appliances' WhatsApp Business number. A reply is their check-in, exactly as if typed here."), on Groundwork's number, switched off and by whom, or not connected; the number in use; the callback address to paste into Meta (full once `PUBLIC_API_URL` is set, otherwise "The full callback address will be known once Groundwork is hosted. It ends in /api/v1/webhooks/whatsapp/<organisation>."); whether the verify token is set, never the token; how many people in its check-ins have a WhatsApp number; failed messages this week; and whether Meta has approved the reminder messages. No secret, or any part of one, is in the response; the test checks it in every state. Two new settings that are not secrets: `PUBLIC_API_URL` and `WHATSAPP_DISPLAY_NUMBER`, in `docs/deploy.md` and the release questions. The screens workspace has every field. Items 73 to 75 are for Hafsah.
- **The guard proposal is committed** (`c4290efb`), for Hafsah to apply. Was: `docs/guard-change-proposal.md` says exactly what change to `.claude/hooks/guard.py` would let commands that only mention a person's name, the pre-release environment or the words for a code review request through, while every real push, merge, remote change and deploy stays refused, with commands to check it after applying. Its commit was refused because the commit message itself contained those words; under the rule I did not retry or reword it, so the file is on this computer, uncommitted. Hafsah can commit it with the guard change, or read it there.

## SUMMARY OF THE NIGHT, 1 TO 2 OCTOBER (read this first)

**What I finished.**
- **Hafsah's decisions 69 to 74, built:** each target says whether it is an aim or a limit; the brief is rewritten only by the lead unless the lead has left; the resolution panel and the old-version notice (request 99 done, the old report body's last rules have live homes); the weekly report for each reader, with every earlier week kept readable; and the seven deploy risks (patterns reach only the person while steadiness is under 8 in 10, a confirmed way to run the word-for-word script on a hosted database, a start never overwrites a prompt activated by hand, and a quiet first night with each nightly job run once).
- **The review of 1 October, every finding fixed** (privacy on evaluation check-ins, made-up "records", the reader's own name, pages that contradict themselves, the decisive question, an instruction that reached a person), and proven on runs.
- **The engine list:** judging proven end to end and limited to evaluation check-ins (decision 6); the board's remaining sections (request 70); the live check of memory, leave, hours, spending, being away and a guest; requests 95, 105, 106, 107 and 108 from the screens workspace; the release documents (`docs/deploy.md`, `docs/release-questions.md`).
- **Three privacy holes found and closed:** a goal the lead had not told somebody could reach their own check-in; the Movement tile and the one-line summary could tell somebody about a colleague's hidden number or wait; a guest from another organisation was told a colleague's leave dates.
- **Tests:** the screens suite passes in full (3,845). The API suite: 13,584 of 13,588 passed in the night's one full run; the four were the patterns helper's unfinished tests (now committed and passing in its folder) and one test whose fixed date had expired (fixed).

**Pattern steadiness: 72%, short of 8 in 10.** On what people are actually shown after three periods, the same conversations read twice now agree 72% of the time (66% before tonight), with real patterns kept (367 of 464, against 369) and fewer shown beyond the real ones (47, against 57). The patterns that still flip depend on history ("promise made again", "confident reporting beside undelivered work"); their deciding periods are kept by about half of 30 independent reads, so more reads cannot make them steady. Reaching 8 in 10 needs Hafsah's decision (item 42). Until then patterns reach only the person themselves (decision 74), never the lead.

**The full run (run-23, 24 scenarios, on the committed code before requests 105 to 108).** Every wording problem the scorer counts is at zero, jargon in reports and boards is 84 against 511, and no turn asks two questions. Engine value rose on nine of eleven (for example blockers checked 52 against 37, commitments recorded 58 against 33, judgement present 29 against 21). Two fell: proof asked for (27 against 42), which is almost all the words "picture" and "statement" in comments removed on purpose, real requests for proof being rare before and after; and patterns found (90 against 100), which a replay shows is not caused by tonight's pattern rules but by the conversations differing and read noise.

**Needs Hafsah:** `docs/ready-to-deploy.md` still needs decision 74 and its out-of-date migration note (the safety check refused the edit); the remaining-work list at the top of `docs/weekly-plan.md` is uncommitted on this computer (the commit was refused because it named a person); and the guard refusals below, each stopped and not worked around.

**Decided for Hafsah to confirm (all of them, in order):**
1. Admins without access to a check-in do not see the contribution and coverage reads (request 88), going further than decision 5.
2. A performance plan, promotion or renewal set up by a lead who is not an admin waits for approval, because an admin without access cannot see it to approve it.
3. An admin still reads an appealed suggestion, because decision 6 says an admin decides appeals.
4. The lead does not get each person's own coaching note, as the report never gives it to them.
5. The Sales lead sees only the Sales steps of a blocker's chain, not Finance's (request 18).
6. The product proposes a review when one falls due and never starts one by itself (week 11).
7. Leave, hours and spending are approved by the person's line manager, or an admin when there is none; running a check-in does not make someone an approver (week 21).
8. When someone is away, the lead reads "Yemi is on leave until Friday 2 October, so this round does not wait for Yemi.", the person and a colleague read the sentences in week 23's section (dates only).
9. Rules a lead keeps for the organisation are given to participants' check-ins as context, never quoted; that is an instruction to the model, not a wall (week 20).
10. The learned weights of week 8b are counted but switched off until a scenario run proves them and Hafsah agrees.
11. Still open from before: whether the "confirmed because the lead has left" sentence should also appear inside the person's own check-in (decision 63).
12. The check-ins list no longer gives a participant on a private check-in the team's summary, though the report page shows them the released report with labels (request 97).
13. May the lead's setup brief be quoted into a participant's own check-in? (the review; today it is, in three scenarios)
14. In a cohort check-in where people do not see each other, should one person's circumstances reach another? (the review; loans does it today)
15. On a performance plan, promotion or renewal, the person reviewed now reads the title "Your check-in with Caroline" instead of the lead's typed label ("Formal improvement plan: the account manager"); a colleague reads "A check-in with Caroline". There was no plain name for the situation to use instead.
16. Where a lead switches "people see each other" on for a performance plan, promotion or renewal, the lead's switch still names a colleague to the person reviewed, which decision 17 says never happens. I am making decision 17 win, as the more private choice.
17. A target says whether it is an aim or a limit (decision 69), but the prototype's targets carry five kinds: "Up", "Lower is better", "Rate", "Deadline" and "Zero". Only aim and limit are built; "Zero" could be a limit of 0, and "Rate" and "Deadline" are not covered.
18. Answered by Hafsah (decision 70): the resolution panel shows nothing until a decision is near, as the prototype does.
19. Answered by Hafsah (decision 71): the old-version notice stays. The screens workspace built it on the rebuilt session report.
20. Answered by Hafsah (decision 73): yes, as built, except that a participant reads aims and limits only where the check-in's "who sees targets" is EVERYBODY, as on the board. Built. Was: the prototype pictures only the lead. A participant gets their own parts and the team's counts (never a colleague's sentence, number, pattern or commitment, and no aim or limit); an admin who only reads gets the lead's view without the lead's list, the aims and limits, or any pattern (decision 58). Someone who leads the same department but is not in the check-in still gets only "Nothing has been written about you this week yet."
21. Answered by Hafsah (decision 73): yes, a participant's "for next week" is their own open commitments from this week.
22. Answered by Hafsah (decision 73): yes, as long as every earlier weekly report stays readable and a new one never overwrites an old one. Built, with tests, and an earlier week can now be opened by the date of its Monday.
23. After a lead decides on a suggestion, the next suggestion about the same person counts only what was settled after that decision (before, the same misses reached a fresh one at the very next check-in). No decision covered it.
24. A suggestion nobody has decided keeps the facts the person first read, even after their count changes, and stays if they recover (following item 17 and decision 53). It may want its own decision.
25. Decision 6 says verdicts are reached only on performance plans, promotions and renewals, and the code reached them on every check-in; I am making it follow decision 6. The prototype also shows one on Kwame's "first 90 days", which is not one of those three; that is not built, and is Hafsah's call.
26. The board now serves a forecast, which an earlier answer said it would not, because the prototype's board shows one: a straight-line pace for team targets only, never on an evaluation check-in, read by those decision 73 lets read the aim. It says plainly that it is not a promise.
27. "Lead actions" and "questions for the lead" on the board are read by the lead, the admin who set the check-in up, and an organisation admin on an ordinary check-in (with the lead's name in place of "you"), as every other row on the board is. No participant reads them.
28. A guest from another organisation is no longer told a colleague's leave or absence dates ("Amani is away until Friday 2 October."); the more private choice. People inside the organisation read what they read before.
29. Open, for Hafsah: when the lead says a company rule while a setup question is waiting ("Every quote over 1 million needs Grace's sign-off"), it is taken as the answer to that question and never offered to be kept for the organisation. Should a company rule be offered first? Not changed.
30. Open, for Hafsah and the screens: after the setup conversation, the lead's next question anywhere ("How do we get a quote signed off?") is answered as part of setup, because the screens never say where Ask Groundwork was opened from (decision 65). I have asked the screens workspace to send it.
31. Check-ins already in their last week, or past their end, at the moment of release get no "time running out" email and are not stalled either; they stay open until their lead ends or extends them (decision 74, item 7).
32. Where the board said "Lead and team" as the owner of a difference or of a decision the lead wrote down, it now names the lead ("Amina Wanjiru"; "You" to the lead).
33. The Movement tile counts a target that went down as one that moved ("2 targets" for one up and one down), and serves the count of targets, never a sum of their numbers.
34. The board's session header follows the round that is open, so somebody still answering session 1 keeps it on session 1, while the line under session 2 says it has started for some people.
35. "By area of work" comes only from what people said about each record; Groundwork keeps no site, county, team or queue for a person. Should setup ask for one?
36. "Reported against criteria met" never claims criteria are met, because the record holds no rules for each sales stage. Should the lead set them?
37. A participant's own aim ("I am aiming for 3 shops in Kilimani") now goes on the board as their target, with their name, read like a number the lead set for them; the participant reads "Only you and Amina Wanjiru see your share." unless everybody sees every number.
38. Request 105: the five kinds whose prototype boards have their own shape (government, loans, a legal matter, and the two MarketView ones) get their own board sections, built from the record; where the record holds no data for a section (for example the payment systems), nothing is invented.
39. Request 105: blockers get one section each, with every time they were raised, what the proof shows, and what would clear them only where the record says it.
40. Request 105: a participant's board becomes narrower, as in the prototype: their own work, their own share, and the team's picture only once it is shared. This is also the more private choice. Leads and admins are unchanged.
41. Pattern steadiness: a pattern on the line is now settled on ten reads instead of five (`db3f8f06`). It is steadier (72% of shown patterns the same, from 66%), finds 367 of 464 real patterns where it found 369 (within the spread between readings), shows fewer beyond the real ones (47, from 57), and costs about 58% more detector calls. Kept as the steadier choice; revert that one commit if "real patterns must not fall" is read strictly. Patterns stay "person only" (decision 74) because 8 in 10 is not reached.
42. Reaching 8 in 10 needs a decision only Hafsah can make: for the patterns that can only be judged across time ("promise made again" E2, "confident reporting beside undelivered work" B2, "the same problem raised and never fixed" K3, "problems put down to things outside the team" B11), either a different line for what counts, or judging each as one judgement across all its periods instead of period by period. Their deciding periods are kept by about half of 30 independent reads, so no number of reads makes them steady.
43. A participant's board (request 105): records with nobody's name on them (a matter's parties, a deal the lead added) are not on it, and the quick read and the forecast count as the team's picture, so a participant gets them only once the report is released.
44. On a blocker, both people in a wait read the holder's own promise about it, never the lead's; where only the lead promised, the person waiting reads "Nobody has said what would clear it yet."
45. The five kinds' own board sections go only to whoever runs the check-in. Should setup ask for each person's level (government) and group (MarketView next)? Nothing on record holds either today.
46. On an ordinary check-in where people see each other, a participant's one-line summary still counts the team's waits and names the oldest, even a colleague's; that is allowed where people see each other. Narrowing it to their own, to match their narrower board, is a one-line change if Hafsah wants it.
47. Request 108: "On time" is the word for a target on pace but not yet reached (with "Met", "Close" at 90% of the way or more, "Behind", "Within" or "Over limit" for a limit, and "Not settled" where the lead wrote that the number is not settled); no status word goes on a person's own target; the headline question takes at most two team aims; and the headline and the words go to the same readers as the forecast, not to an admin who only reads.
48. Request 108: "Where this is heading" shows all through the check-in, as in the prototype, with the outcomes the existing ending flow offers and the signals behind them from the record; it is not shown on evaluation check-ins or to an admin who only reads. Some of those endings' own labels are not plain words ("OKRs aligned to company direction."); changing them would also change the ending panel, so they are left for Hafsah.
49. Found while building request 108, not changed: on a performance plan, the person reviewed sees a work record the lead added with nobody's name on it. It is a record of work, not the lead's judgement, but Hafsah may want it walled.
50. Item 42 (decision 75): judging E2, B2, K3 and B11 once across their periods was built as decided, measured worse (as steady, but 169 patterns shown beyond the real ones against 47, and fewer people shown exactly the same), and reverted. Keep it reverted, or put it back by reverting `d50c7310`?
51. Answered by Hafsah (decision 76): yes, a person's own row keeps its words and loses its numbers.
52. Answered by Hafsah (decision 76): yes for a restated aim; a record with nobody's name becomes somebody's deal only once the lead confirms it. Built.
53. Answered by Hafsah (decision 76): yes.
54. Answered by Hafsah (decision 76): each session's team picture is released on its own. Built.
55. The engine reads checkability in five parts named delivery, evidence, enablement, coverage and commitment; the prototype's sales example names who, what, when, proof and next. Should the engine's five parts change to the prototype's?
56. Item 54: a session is still released by itself once everybody in it has answered, as session 1 always was, and the lead can release it earlier; and if the lead releases a session early and a later session then gets answers, no copy of the earlier picture is kept, so participants read "not shared yet" for it. Should only the lead release each session, and should a released picture be kept as it was?
57. Request 110: the lead can change a person's own aim but not remove it ("This aim is one the person set for themselves in their own check-in, so only they can drop it."); a participant with no number of their own reads "There is no number of yours on this board yet, so there is no share to show."
58. Request 112 (a): a deal is "Likely" when it has proof or a colleague's confirmation, a date on or before the end, and word about it in the last seven days; deals at the last stage get their own "Won" group; "Next quarter" is the heading only when the check-in ends on a quarter end. No deal is put under "Cold" and no group claims a criterion is met, because nothing on record holds stage criteria or counts unanswered follow-ups. Should the lead set what a deal must show at each stage, and should check-ins count follow-ups with no reply?
59. Request 112 (b): a yes-or-no question the lead wrote down gets "Yes" and "No"; the answer is kept in how we work, in her own words, and the question is closed; "Ask Kwame" sends the lead to the Context page, because no board route puts a question to one person.
60. Request 115: a new reason on each person's line, "waiting on someone" ("Baraka Otieno has checked in, and is waiting on Rukia Mwangi for the discount decision."), where it read "nothing to do".
61. Request 115: the gap closers count each open deal as one toward the aim ("To close the gap by 30 September, 2 of these 3 open deals would need to close.") and are left out for money or share aims; "help nobody mentioned" goes to whoever runs the check-in only and never says who said it; a deal's contact history names nobody; a deal's "read in their own words" is the owner's latest typed sentence about it.
62. The helper on request 115 changed two lines in the screens workspace's files (`client/src/components/gw/where-each-person-is.tsx`, `client/src/api/board.ts`) so the new reason draws; the screens workspace is told and may redo it its own way.
63. Request 101 (c): a person with no name on record, only an email address, is "a colleague" to the lead. The screens build a roster name from the address ("Zawadi U8"), but the engine's rule since 28 September is that an address never stands in for a name. Should the lead and the admin who set it up read a name made from the address everywhere (board and report alike), or should the roster say "a colleague" with the address beside it?
64. Answered by Hafsah (decision 77): a person an admin has not let in yet is left out of both counts and shown separately. Built.
65. Decision 77: "not let in yet" covers both somebody an admin has not decided on and somebody an admin declined; the "waiting to be let in" line goes only to whoever runs the check-in and admins (the more private choice), never to a participant.
66 to 68. Answered by Hafsah (decision 80): the Company page is kept as built; "what new people keep asking" stays unbuilt, linked organisations and strategy history come later; no exception to decision 73.
69. WhatsApp's monthly limits: Starter 500, Small Team 2,000, Growth 10,000, Business 25,000, Scale 50,000 messages, Enterprise no limit; about 100 for each person the plan allows. A check-in by WhatsApp is about 12 to 15 messages, so weekly check-ins come to about 55 to 65 a person a month and daily short check-ins to about 100 to 130. Meta charges only for the messages the business starts (about 3 of the 15, roughly half a cent to two cents each, not checked against Meta's current list); even if every message were charged at two cents, the cost at the limit is about $2 a person against an add-on of $2.64 to $4.00 a person. Counted per calendar month.
70. The WhatsApp limit applies from release, even while the trial switch is off, as protection against cost; the add-on's hold and its charge start only once the trial switch is on, so nothing about billing changes before then. Organisations on the free plan from before the switch keep WhatsApp as today, with the cheapest plan's limit (500).
71. When WhatsApp is held (no add-on after the trial, no paid plan, or the limit reached), nothing at all is sent by WhatsApp, not even a reply to somebody who just wrote in; they read why only in the app ("Your organisation has not turned on WhatsApp, so this check-in stays in the app."). This goes against the older rule that a person on WhatsApp is never answered with nothing. The one sentence could instead go as a free reply inside WhatsApp's 24-hour window.
72. If the WhatsApp check cannot be read (for example the database is down), the message goes as it does today and the failure is logged, rather than being held. The limit email to admins reuses the billing email, so its subject reads "Your Groundwork plan has changed" until the email module gets its own subject.
73. The WhatsApp status the admin reads never shows the verify token. The admin still needs it once, to paste into Meta: it comes back when they connect or change the number, so the screens should show it from that answer, once, and not from the status page. A "make a new verify token" step can be added if the first one is lost.
74. An organisation's own WhatsApp number is not stopped by Groundwork's platform-wide WhatsApp switch: only Groundwork's own number is. The status page says so honestly ("Groundwork has switched WhatsApp off for everyone for now. You do not need to do anything."). Should the platform switch also stop organisations' own numbers?
75. "Check-ins this month by WhatsApp" cannot be counted, because a check-in's turns do not record that they came in by WhatsApp; it needs one field written by the conversation code. The status card also does not yet say whether the paid add-on is on.

---

## SUMMARY OF THE NIGHT, 30 SEPTEMBER TO 1 OCTOBER (read this first)

**The model is reachable.** From this Mac the regional address the product uses (us-central1) still times out, so every local run tonight used Google's global address, set only on the commands I started (`GEMINI_LOCATION=global`). No file, key or setting of the real product changed. To undo it, start the local API without that setting.

**Pattern steadiness: one check-in reaches the aim; what people are shown after three periods does not yet.**
- The same check-in now gives the same patterns 8 times in 10 (80%, up from 36% with one read at the start of the day), and still finds as many real patterns. This comes from reading each check-in five times at the steady setting and keeping what three agree on, and from giving the detector the person's own earlier record.
- What a person is actually shown after three periods, the same conversations read twice: about 7 in 10 (68% to 73% on two small sets of 30 to 38 shown patterns). Every difference sits exactly on the three-period line: a pattern seen in two periods in one reading and three in the other. Between two separate runs, where the simulated people say different things, it is far lower (32%), which is the conversations differing, not the detector.
- **Not steady enough for release by the aim of 8 in 10 on what people are shown.** My recommendation: judge it on a longer run with more people reaching three periods, because on 30 to 40 shown patterns one flip moves the number by three points. No pattern was removed, merged or weakened.

**What was finished tonight** (all tested and pushed; the whole API suite passed at 12,587 tests before the last few pieces):
- **Privacy first.** Performance plans, promotions and renewals are now kept from admins who were not given access (decision 5, request 78): a real gap, the reading rule had let any admin open them. The board no longer sends colleagues' contribution and coverage reads to people who may not read them (request 88). The lead no longer receives a tally of how many of a person's commitments were kept (decision 24). After a paste, every heading says truthfully who will read those lines (request 92).
- **Hafsah's decisions 60 to 68 recorded and built**, including the first threshold for extra support, old patterns starting on release day, who confirms setup, Ask Groundwork opened from inside a check-in, the shared note that lifts the invite block, and "what people say can run ahead of what happened" with coaching lines for the lead on every pattern.
- **Ask Groundwork as the one chat:** documents' numbers said back before they are saved, the setup conversation's six faults and their follow-ups fixed and proven live, items 10, 11, 15 and 16 proven live through both doors. The old context chat stays on until the screens confirm their screens live.
- **The screens' requests:** 5, 17 (parts a to d), 18, 25, 28 (a), 37, 70 (seven sections), 75, 78, 79, 80, 82, 84 to 96. Seventeen (e) is now week 20; 17 (f), (g) and 28 (b) wait for Hafsah.
- **Every week of the weekly plan is now built:** 6b, 8b (counted, weights switched off), 11, 12b, 12c, 17 to 26, and 12, 14, 15, 16 found already built on earlier nights.
- **Tonight's one full run (run-21)** is scored below once it finishes.

**After the review, 1 October (morning and day): every finding fixed, and proven on a run.** The reviewer's findings (`docs/review-1-october.md`) are all fixed, each with tests that read what each person is served, and the last build (`0a3d026d`, plus a wording fix in `5fc7c905`) was re-run on sales, loans and seniorhire. On that run every wording problem the scorer counts is at zero, and none of the faults came back: no untold goal or lead's commitment reaches the person reviewed, no made-up "the record shows", no stock sentence, no broken "you", no "nobody chased" after chasing, no raw seven-digit numbers, no instruction to the model reaching a person, and no held question asking about "that" with nothing before it. The conversation counts are inside the range of earlier runs (proof 13, specific detail 35, blocker checked 18), and in sales 10 of 12 people were asked what they will do and by when. Three privacy holes were found and closed on the way: a goal the lead had not told somebody about could reach their own check-in; the Movement tile told a participant that a colleague's hidden number moved; and on a performance plan, promotion or renewal a lead's switch could name a colleague to the person reviewed. Hafsah's decision 69 (each target says whether it is an aim or a limit) is built. The detail is in the section "What the two helpers fixed from the review" and the lines after it, below.

**Decided for Hafsah to confirm** (each is written in full further down):
1. Admins without access to a check-in do not see the contribution and coverage reads (request 88), going further than decision 5.
2. A performance plan, promotion or renewal set up by a lead who is not an admin waits for approval, because an admin without access cannot see it to approve it.
3. An admin still reads an appealed suggestion, because decision 6 says an admin decides appeals.
4. The lead does not get each person's own coaching note, as the report never gives it to them.
5. The Sales lead sees only the Sales steps of a blocker's chain, not Finance's (request 18).
6. The product proposes a review when one falls due and never starts one by itself (week 11).
7. Leave, hours and spending are approved by the person's line manager, or an admin when there is none; running a check-in does not make someone an approver (week 21).
8. When someone is away, the lead reads "Yemi is on leave until Friday 2 October, so this round does not wait for Yemi.", the person and a colleague read the sentences in week 23's section (dates only).
9. Rules a lead keeps for the organisation are given to participants' check-ins as context, never quoted; that is an instruction to the model, not a wall (week 20).
10. The learned weights of week 8b are counted but switched off until a scenario run proves them and Hafsah agrees.
11. Still open from before: whether the "confirmed because the lead has left" sentence should also appear inside the person's own check-in (decision 63).
12. The check-ins list no longer gives a participant on a private check-in the team's summary, though the report page shows them the released report with labels (request 97).
13. May the lead's setup brief be quoted into a participant's own check-in? (the review; today it is, in three scenarios)
14. In a cohort check-in where people do not see each other, should one person's circumstances reach another? (the review; loans does it today)
15. On a performance plan, promotion or renewal, the person reviewed now reads the title "Your check-in with Caroline" instead of the lead's typed label ("Formal improvement plan: the account manager"); a colleague reads "A check-in with Caroline". There was no plain name for the situation to use instead.
16. Where a lead switches "people see each other" on for a performance plan, promotion or renewal, the lead's switch still names a colleague to the person reviewed, which decision 17 says never happens. I am making decision 17 win, as the more private choice.
17. A target says whether it is an aim or a limit (decision 69), but the prototype's targets carry five kinds: "Up", "Lower is better", "Rate", "Deadline" and "Zero". Only aim and limit are built; "Zero" could be a limit of 0, and "Rate" and "Deadline" are not covered.
18. Answered by Hafsah (decision 70): the resolution panel shows nothing until a decision is near, as the prototype does.
19. Answered by Hafsah (decision 71): the old-version notice stays. The screens workspace built it on the rebuilt session report.
20. Answered by Hafsah (decision 73): yes, as built, except that a participant reads aims and limits only where the check-in's "who sees targets" is EVERYBODY, as on the board. Built. Was: the prototype pictures only the lead. A participant gets their own parts and the team's counts (never a colleague's sentence, number, pattern or commitment, and no aim or limit); an admin who only reads gets the lead's view without the lead's list, the aims and limits, or any pattern (decision 58). Someone who leads the same department but is not in the check-in still gets only "Nothing has been written about you this week yet."
21. Answered by Hafsah (decision 73): yes, a participant's "for next week" is their own open commitments from this week.
22. Answered by Hafsah (decision 73): yes, as long as every earlier weekly report stays readable and a new one never overwrites an old one. Built, with tests, and an earlier week can now be opened by the date of its Monday.
23. After a lead decides on a suggestion, the next suggestion about the same person counts only what was settled after that decision (before, the same misses reached a fresh one at the very next check-in). No decision covered it.
24. A suggestion nobody has decided keeps the facts the person first read, even after their count changes, and stays if they recover (following item 17 and decision 53). It may want its own decision.
25. Decision 6 says verdicts are reached only on performance plans, promotions and renewals, and the code reached them on every check-in; I am making it follow decision 6. The prototype also shows one on Kwame's "first 90 days", which is not one of those three; that is not built, and is Hafsah's call.
26. The board now serves a forecast, which an earlier answer said it would not, because the prototype's board shows one: a straight-line pace for team targets only, never on an evaluation check-in, read by those decision 73 lets read the aim. It says plainly that it is not a promise.
27. "Lead actions" and "questions for the lead" on the board are read by the lead, the admin who set the check-in up, and an organisation admin on an ordinary check-in (with the lead's name in place of "you"), as every other row on the board is. No participant reads them.
28. A guest from another organisation is no longer told a colleague's leave or absence dates ("Amani is away until Friday 2 October."); the more private choice. People inside the organisation read what they read before.
29. Open, for Hafsah: when the lead says a company rule while a setup question is waiting ("Every quote over 1 million needs Grace's sign-off"), it is taken as the answer to that question and never offered to be kept for the organisation. Should a company rule be offered first? Not changed.
30. Open, for Hafsah and the screens: after the setup conversation, the lead's next question anywhere ("How do we get a quote signed off?") is answered as part of setup, because the screens never say where Ask Groundwork was opened from (decision 65). I have asked the screens workspace to send it.
31. Check-ins already in their last week, or past their end, at the moment of release get no "time running out" email and are not stalled either; they stay open until their lead ends or extends them (decision 74, item 7).
32. Where the board said "Lead and team" as the owner of a difference or of a decision the lead wrote down, it now names the lead ("Amina Wanjiru"; "You" to the lead).
33. The Movement tile counts a target that went down as one that moved ("2 targets" for one up and one down), and serves the count of targets, never a sum of their numbers.
34. The board's session header follows the round that is open, so somebody still answering session 1 keeps it on session 1, while the line under session 2 says it has started for some people.
35. "By area of work" comes only from what people said about each record; Groundwork keeps no site, county, team or queue for a person. Should setup ask for one?
36. "Reported against criteria met" never claims criteria are met, because the record holds no rules for each sales stage. Should the lead set them?
37. A participant's own aim ("I am aiming for 3 shops in Kilimani") now goes on the board as their target, with their name, read like a number the lead set for them; the participant reads "Only you and Amina Wanjiru see your share." unless everybody sees every number.
38. Request 105: the five kinds whose prototype boards have their own shape (government, loans, a legal matter, and the two MarketView ones) get their own board sections, built from the record; where the record holds no data for a section (for example the payment systems), nothing is invented.
39. Request 105: blockers get one section each, with every time they were raised, what the proof shows, and what would clear them only where the record says it.
40. Request 105: a participant's board becomes narrower, as in the prototype: their own work, their own share, and the team's picture only once it is shared. This is also the more private choice. Leads and admins are unchanged.
41. Pattern steadiness: a pattern on the line is now settled on ten reads instead of five (`db3f8f06`). It is steadier (72% of shown patterns the same, from 66%), finds 367 of 464 real patterns where it found 369 (within the spread between readings), shows fewer beyond the real ones (47, from 57), and costs about 58% more detector calls. Kept as the steadier choice; revert that one commit if "real patterns must not fall" is read strictly. Patterns stay "person only" (decision 74) because 8 in 10 is not reached.
42. Reaching 8 in 10 needs a decision only Hafsah can make: for the patterns that can only be judged across time ("promise made again" E2, "confident reporting beside undelivered work" B2, "the same problem raised and never fixed" K3, "problems put down to things outside the team" B11), either a different line for what counts, or judging each as one judgement across all its periods instead of period by period. Their deciding periods are kept by about half of 30 independent reads, so no number of reads makes them steady.
43. A participant's board (request 105): records with nobody's name on them (a matter's parties, a deal the lead added) are not on it, and the quick read and the forecast count as the team's picture, so a participant gets them only once the report is released.
44. On a blocker, both people in a wait read the holder's own promise about it, never the lead's; where only the lead promised, the person waiting reads "Nobody has said what would clear it yet."
45. The five kinds' own board sections go only to whoever runs the check-in. Should setup ask for each person's level (government) and group (MarketView next)? Nothing on record holds either today.
46. On an ordinary check-in where people see each other, a participant's one-line summary still counts the team's waits and names the oldest, even a colleague's; that is allowed where people see each other. Narrowing it to their own, to match their narrower board, is a one-line change if Hafsah wants it.
47. Request 108: "On time" is the word for a target on pace but not yet reached (with "Met", "Close" at 90% of the way or more, "Behind", "Within" or "Over limit" for a limit, and "Not settled" where the lead wrote that the number is not settled); no status word goes on a person's own target; the headline question takes at most two team aims; and the headline and the words go to the same readers as the forecast, not to an admin who only reads.
48. Request 108: "Where this is heading" shows all through the check-in, as in the prototype, with the outcomes the existing ending flow offers and the signals behind them from the record; it is not shown on evaluation check-ins or to an admin who only reads. Some of those endings' own labels are not plain words ("OKRs aligned to company direction."); changing them would also change the ending panel, so they are left for Hafsah.
49. Found while building request 108, not changed: on a performance plan, the person reviewed sees a work record the lead added with nobody's name on it. It is a record of work, not the lead's judgement, but Hafsah may want it walled.

**Run-21, tonight's one full run, scored against the baseline.** Every wording fault the scorer counts is at zero, jargon in reports and boards fell from 511 to 98, and patterns found (107 against 100), commitments recorded (40 against 33), judgements present (29 against 21), differences, agreements and findings all rose. One engine-value number fell: "specific detail asked for" was 77 against a baseline of 88 (run-20 had 85). The fall is spread thinly over many scenarios, the largest in realign (5 to 1) and loans (5 to 2). Because it is borderline, realign, loans, sales and seniorhire were re-run on a build with everything from tonight. **The first re-run shows it was noise:** those four asked for specific detail 58 times, against 50 in run-20 and 40 in run-21 (loans 13 against 2, sales 33 against 26, realign 3 against 1, seniorhire 9 against 11). A second re-run, as the rules ask for a borderline number, is under way.

The quick checks on run-21: none of the lead's private words reached anyone else. Of 804 quotes, 784 are word for word in the record; the other 20 were real misquotes in two of tonight's new board sections ("risks" and "blocker check" quoted a tidied version of what a person said they tried). Fixed (`908f27ac`, `e4d68163`, 1,009 board tests pass): a text is quoted only when it is the person's exact words; otherwise the board quotes the person's own sentences it was drawn from ("About what has been tried, Rukia Mwangi said, "I escalated to the head of credit, Mr. Adebayo, on the 10th of May." and "I've chased the committee four times in writing"."), or, when none fits, says only "Rukia Mwangi has said what has been tried." Their words never appear without quotation marks. Eight reports were updated after the run captured them; that was timing (the last report build finished after the runner had taken an earlier version), and the runner now waits until a report has finished being written.

**The reviewer read what every person was served after tonight's work, and sent it back** (`docs/review-1-october.md`). The judgement is right in about half the scenarios, but the pages around it break rules. The five most important findings (the fixes are described just below):
1. **Privacy on a performance plan.** Nathan's own board showed the goal his lead had not told him about ("Nathan needs to meet his renewal targets of eight per quarter."), and two of tonight's new sections showed him his lead's own commitment ("I will put a formal performance improvement plan in front of Nathan."). In renewal, the person under review read a colleague's exact words. I confirmed the first two in the run files.
2. **Facts nobody gave.** Groundwork told borrowers what "the record" shows when their record shows no such thing ("The record from our side shows that weekly repayments have not been made."), and stored patterns labelling them dishonest from it. It read back commitments people never made.
3. **The reader's own name, and broken "you":** "Ask Amina for her account ..." to Amina; "you stays blocked", "You reviews".
4. **Pages that contradict themselves:** "All four people have answered." beside "The report is being written ... It will include everyone"; one target at "0 now" and "11 now" on one board; "nothing here needs you this week" beside a blocker.
5. **Groundwork's turns:** a stock sentence repeated in seven scenarios, two questions at once, comments on answers, and the decisive question often never asked; 51 of 87 check-ins end on an unanswered question.

**Two questions for Hafsah from the review:**
13. May the lead's setup brief be quoted into a participant's own check-in? Today it is, in pip, discovery and realign.
14. In a cohort check-in where people do not see each other, should Groundwork share one borrower's circumstances with another (loans tells Sunday about other borrowers' theft and a machine that never arrived)? Until Hafsah decides, nothing is changed in either, beyond never presenting the lead's words as "the record".

**What the two helpers fixed from the review** (tested in their folders: board, reports and grounds 4,537 tests; conversation, patterns and prompts 2,986 tests; no test deleted):
- **Privacy, as Nathan reads his performance plan.** A goal his lead has not told him about no longer appears on his board, in any form. A week on, he reads only "Caroline has set a goal about this work, and will talk it through with you.", with no number. His own report no longer carries a sentence with the goal's number ("Caroline Mensah's target of eight renewals was never shared with you." is gone). The work plan and timeline show him only his own commitments, never his lead's. In renewal, the person reviewed no longer reads a colleague's words or job; it reads "A colleague described this differently." Their own side now reads as found, and the lead's side says "The words your lead used are not shown to you here." In loans, a sentence judging the lead ("Amaka Nwachukwu has no visibility of these facts...") is now shown only to the lead. (`d307d559`, `82834d56`, `f0282a79`, `e0406c56`)
- **Facts nobody gave.** The made-up "record" came from the model, not from anything stored: it turned the lead's brief ("Repayment is behind across the cohort") into a record of the person's own payments. A sentence saying what "the record" or "the system" shows is now cut unless it is about what the person said; so is a calendar day nobody gave, and a thing from the lead's list said to a person as theirs (Hauwa has a freezer, not a grinding machine). Chinedu now reads only "What else should I know?" where he read "The record from our side shows that weekly repayments have not been made." A pattern that rests on a record nobody holds is no longer stored; no pattern was removed or weakened. (`60f85a42`, `ffe1dc48`, `fe85e9d2`)
- **Promises nobody made.** "You said you would..." is now said only when the person did promise it. A line in someone's record that names a person they never named is not stored ("Amina set up the client meetings I am still attending." came from the extractor putting the lead's name on the hire's work). (`91f84229`, `91212682`)
- **Groundwork's turns.** The stock sentence came from the instructions themselves, which gave it as the example to follow; the example is gone, and the new instructions are the version that runs (version 44, active from 09:28). Comments on an answer ("That is a very specific thing to not know.") are cut, and a sentence with two questions keeps its first ("What day did they commit to sending them?"). One test changed because it checked the old example sentence. (`9b74aded`, `09170f96`)
- **Pages that contradict themselves, fixed** (`ece6f8cd`, `ee7cc643`). While a report is still being written, it no longer opens with "All four people have answered."; Bisi reads "People disagree on whether individual targets for the quarter have been set, ..." beside the line saying it will include everyone in a few minutes. A person with something open is no longer "nothing here needs you": Bisi reads "Femi Okonkwo has checked in, and still has something in the way." Ngozi, who chased four times and went to the Head of Credit, is no longer described as nobody having chased; the line now says it has been taken above the person it was with, and the probe asking why she has not escalated is no longer written. Lines about "it" with nothing named now name the promise in full. One target is shown once, with one count ("0 at the start, 11 now, said 40."). The quick read no longer says "no disagreement" when the report opens on one (contractreview now reads "People said different things about what the service agreement means."). The report instructions gained a rule that one page tells one story; its effect needs a scenario run. Not caught yet: the handover quick read, whose report never says "disagree".
- **The reader's own name, and "you", fixed** (`c86af26f`). The cause was the lead's title: in "Dr Amina Bello", "Dr" was taken as her first name, so "Amina" in Tobi's words reached the model as a stranger, and the model wrote about her in the third person. Amina now reads "You were not part of this check-in, so your own account of the meetings is missing." where she read "Ask Amina for her account of her role in the meetings."; a step that only told her to ask herself is dropped. Verbs agree: "You review the individual targets ...", "... and you stay blocked.", "You are blocked, have been waiting since the 8th, and are unsure how to proceed." An admin still reads names, never "you".
- **Decision 17 now wins over the lead's switch** (`94126774`, item 16 below): on a performance plan, promotion or renewal, the person reviewed is never told a colleague's name. This also fixed "A a colleague described this differently." (an email address starting with "colleague@").
- **Finished** (`1f5356e6`, `7176ecc5`, `a047346a`; 7,685 tests pass in board, reports, grounds, conversation, suites and suggestions). Every screen now passes the reader to the names rule, so on a recognition round with the switch on, a colleague giving a view reads the others' names, and only the person reviewed does not. The check-in page tells that person why: "On a check-in about one person, that person is never told who else gave a view." Each target is now a full sentence about somebody: Bisi reads "You are aiming for 120 million naira disbursed this quarter." where she read "I'm aiming for N120 million disbursed this quarter."; Ngozi reads "Bisi Adeyemi is aiming for 120 million naira disbursed this quarter."; "The person wants introductions to ..." became "Grace Mutiso wants introductions to ...". The line under each target is a sentence: "It was 0 at the start and is 11 now, and the aim is 40." where it read "0 at the start, 11 now, said 40." Two tests changed because they pinned the old defect (a performance plan naming everybody, the lead reading her own name).
- **A spending limit that was passed no longer reads as a success** (`b3f28099`, 7,690 tests pass). Before: "It was 0 at the start and is 254,000 now, so the aim of 180,000 has been reached." After: "It was 0 at the start and is 254,000 now, which is 74,000 over the limit of 180,000." Where the name does not say whether a number is an aim or a limit, the line says only where it stands: "... is 254,000 now, against 180,000."
- **Hafsah's decision 69: each target says which way it goes** (`69fb72fc`, `99995364`; 8,473 tests pass across board, reports, grounds, conversation, Ask Groundwork, suites, suggestions and the assistant). Each target now has a `direction`: `AIM` (to reach), `LIMIT` (not to go over), or empty when nobody has set it. Groundwork suggests it from the words, and stores it only when the lead says yes to a say-back that states it: "Spending within budget" is a limit of 180,000 not to go over." On the board, only the lead reads "Is 40 something to reach, or a limit not to go over?" under a target with no direction yet. A target with no direction keeps the old word-based guess, except that "under" now counts as a limit word only before a number, so "Pumps sold under the new scheme" reads as an aim ("so the aim of 40 has been reached"), while "First response under four hours" is still a limit. A limit is named as one: "Chidi Eze is keeping fuel spending to no more than 12,000." The screens workspace has the field, the payloads, the routes and the question in `docs/answers-from-engine.md`. Targets that Groundwork picks up from a check-in conversation itself, with no say-back, stay empty and keep the guess.
- **Decided for Hafsah to confirm (17):** the prototype's targets carry five kinds, not two: "Up", "Lower is better", "Rate", "Deadline" and "Zero". The field has only an aim and a limit for now, as decision 69 says. "Zero" could be a limit of 0; "Rate" and "Deadline" are not covered.
- **Re-run on the final build** (sales, loans, seniorhire and pip, on `b3f28099`). Every wording problem the scorer counts is at zero. None of the review's faults came back: nobody reads "All four people have answered" while a report is still being written, no broken "you" ("you stays"), no "Ask Amina" to Amina, no "nobody chased" after chasing, and no made-up "the record shows" in anything a participant reads. On loans, sales and seniorhire, across six runs:

| What | run-20 | run-21 | re-a | re-b | re-c | final build |
| --- | --- | --- | --- | --- | --- | --- |
| proof asked for | 15 | 18 | 13 | 10 | 7 | 11 |
| specific detail asked for | 45 | 39 | 55 | 32 | 28 | 41 |
| blocker checked | 18 | 21 | 25 | 16 | 13 | 13 |

Specific detail and proof are back inside the range of the earlier runs, so their fall was runs differing. **Blocker checked stayed low,** and the cause is clear: almost all of it is "by when", which comes from the close "What will you do about this, and by when?". It was asked once in each of the last two runs, against three to six before (and once in run-20). Tonight's checks do not cut it; the model is not reaching the close, which is the review's finding that the decisive question is often never asked. A helper is fixing that now, keeping the conversation led by the model.
- **The decisive question, fixed in the product** (`a42ba95c`, `339d2fc1`; 3,024 tests pass in conversation, patterns and prompts; needs a scenario run to prove). Three causes. The runner lets each person give nine answers, and check-ins that close by themselves do so after eight or nine, so one extra question earlier meant the runner ended it first; I kept the runner as it is so runs stay comparable with the baseline. The model was never told where the check-in was. And the close never checked whether the question had been asked: twelve check-ins in the last two runs ended without it, one of them Amina's ("Understood. That's all for today." after saying she "will, though" talk to David). Now, from the sixth answer, the model is told how far along the check-in is and that the question is still owed, and it still writes the question itself. If it closes without asking, the close is held once and the person reads, for example, "I have one more question before we finish. By when will you do that?" (Kwame, who had said what but not when), or, for a lead, "I have one more question before we finish. From everything you have said, what have you decided?" Loans is a one-time check-in, where the rules say never to ask it, so its 0 is right. Also fixed: Hauwa was asked "What has happened for you since this began?" three times, from a fallback question added earlier tonight; a plain question is now never asked twice in one check-in.
- **The two new faults, fixed** (`61c07c6d`, `ac0c7e0a`, `560e7e51`, `6204f4fd`, `6738e4cb`, `ef624693`; 5,187 tests pass in board, reports, grounds, suites, participants and Ask Groundwork). Bisi now reads "The team's approved facilities went from 0 to 11, against the aim of 40. The team is aiming for 120 million naira disbursed. The team's total went from 0 to 31 million naira." The Movement tile no longer adds 11 facilities and 31 million naira into "+31000000". Every "who owns what" line is now the person's words in quotation marks with their name ("Kwame Mensah said, "I'm aiming to have all the documents submitted by Friday.""; Kwame reads "You said, ..."). A participant's "about this check-in" reads "Your goal is 30 million naira this quarter." where it read "Your goal: N30m this quarter (30,000,000)." No number of seven digits or more is left in what anyone reads in that run.
- **Found while fixing, being fixed now:** the Movement tile counts every target whoever reads it, so a participant who sees only their own numbers could learn from "+5" that a colleague's hidden target moved (it was like this before tonight; I am closing it as the more private choice). Movement said "No target moved this session." beside a line saying 31 million naira moved. Two clipped lines ("...; target 12 approved facilities this quarter." and "People said different things about the team is not aligned on..."). And the check-in conversation still gives a participant's check-in the lead's own target as stored ("I'm aiming for N120 million ...").
- **A privacy hole closed in the conversation** (`e7f46c60`; 3,032 tests pass in conversation, patterns and prompts). A goal the lead had set for somebody and not yet told them about (decision 56) was walled off on the board, but the check-in conversation never used that wall, so it could reach the person's own check-in: on their screen in "about this check-in", and in what the model was given. It now goes through the board's own wall. The test with an untold goal of 17 for Ngozi fails on the old code. While fixing it, each target now reaches the model and the person as a sentence about whoever set it: Ngozi's check-in reads "Bisi is aiming for 120 million naira disbursed this quarter." where it used to carry Bisi's "I'm aiming for N120 million disbursed this quarter." as if it were hers, and her own reads "You are aiming for 14 approved facilities." Kwame's own goal never reaches Ngozi's check-in. Two leftover wordings come from the board's shared sentence-maker and are being fixed with it ("Spending on field visits." left as a fragment; "Bisi needs Bisi's team ...").
- **The Movement tile's privacy gap, closed, and the rest of that list fixed** (`1ab31b03`, `df6c5442`, `aa204e53`, `ddfa6b60`; 5,212 tests pass in board, reports, grounds, suites, participants and Ask Groundwork, 8 of 8 in the conversation test I updated). The tile now counts only targets the reader may read: where only Kwame's own number moved, Ngozi and an outside admin read "No target moved this session." instead of "+5". The tile and "since the last round" now read from one place, so they no longer disagree; the cause was that a round's snapshot was taken before the number from that round landed. Femi's line reads "Femi Okonkwo is a relationship officer for Lagos mainland, with a goal of 12 approved facilities this quarter." The Differences tile reads "People said different things. The team is not aligned on the primary reason that applications are being held up." A target with no verb is a sentence: "The team is keeping spending on field visits to no more than 180,000." "I need my team ..." reads "Bisi Adeyemi needs the team to stop missing documents." to others and "You need your team ..." to Bisi; no pronoun is guessed. Then (`ef703ede`, `786a3388`; 4,984 tests pass in board, reports, grounds and suites): the Blockers tile says a worry as the person's words with their name (Bisi reads "Kwame Mensah said, "I still set up the meetings.""; Kwame reads "You said, ..."), and only when the record kept those exact words; a number the lead accepts later now goes into the round it was read from, so the tile and the line stay one story. And (`e76ab3a5`, 4,989 tests pass): "who owns what" now quotes only words the person typed. Where the record tidied a line, it quotes the person's own sentence instead ("Kwame Mensah said, "I've also had follow-up conversations with all 22 of my applications.""), and where nothing they typed fits, it says so plainly without quoting ("Kwame Mensah has said what they intend to do.").
- **The decisive question is back, proven on a run** (sales, loans and seniorhire on `ef624693`, which has the fix). On these three scenarios:

| What | run-20 | run-21 | re-a | re-b | re-c | re-d | with the fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| proof asked for | 15 | 18 | 13 | 10 | 7 | 11 | 16 |
| specific detail asked for | 45 | 39 | 55 | 32 | 28 | 41 | 50 |
| blocker checked | 18 | 21 | 25 | 16 | 13 | 13 | 25 |
| sales people asked what they will do and by when | 10 of 12 | 9 of 12 | 9 of 12 | 9 of 12 | 9 of 12 | 4 of 12 | 11 of 12 |

All three counts are back at or near the top of their range, and every wording problem the scorer counts is at zero. Reading the closes that were held for the question found three faults, fixed in `e689bea6` (3,046 tests pass in conversation, patterns and prompts): a bare "By when will you do that?" where nothing before it said what "that" was; older one-more questions that join two questions with a dash ("How do you see it - what is clear, and what is not?") or ask "How is it actually going?" right after somebody said what they will do; and Amina, the lead, asked a participant's question ("What did you understand you were meant to do?").
  The held question now says the person's own step back ("By when will you ask Amina to clarify your role regarding commercial conversations?"), and a close is not held when the person has already given a when ("today", "within the next two weeks"). Every owed question is one plain question ("What is still not clear to you?"), and it is never asked right after somebody has said what they will do. A lead's close is held only for the decision, if it has not been asked.
- **An instruction reached a person, now fixed** (`e0db51a5`; 3,055 tests pass in conversation, patterns and prompts). Tobi read the product's own instruction to the model in his check-in: "Understood. Your last three turns all ended by asking them something. This one should not. Say the single thing you noticed in what they just told you, and stop there." Every reply and opener is now checked, at the step it is saved through, against the whole set of instructions that turn was given, and a sentence copied from them is cut; he now reads "Understood. You will do that in our next scheduled meeting. What else should I know?" Across run-21 and tonight's runs this happened four times, all from the same instruction (once in re-c, three times to Tobi). The check is narrow on purpose: lines the instructions teach Groundwork to say, questions, and the person's own words are left alone, because a plain six-word match would have cut 36 legitimate sentences. The extra instruction added when a reply is asked for again is being added to the check now.
- **The final run** (sales, loans, seniorhire on `0a3d026d`, everything from tonight): every wording problem the scorer counts is at zero, and none of tonight's faults came back. Proof asked for 13, specific detail 35, blocker checked 18, all inside the range of the earlier runs; in sales 10 of 12 people were asked what they will do and by when. One wording fault found and fixed afterwards (`5fc7c905`, 2,001 reports tests pass): the lead read "All 1 of the things described here line up with something other than what the person said - what another person said, a document, or a record."; it now reads "The one thing described here lines up with something other than what the person said. It is backed by what another person said, a document, or a record."
- **Request 99 from the screens workspace, not done, and three tests fail because of it.** The screens workspace deleted the old report body and asked me to point three engine tests at its new home. I checked first, and two things did not hold: the two explaining sentences under "what it rested on" and "where this stood at the start" ("These were not in their hands. Read anything unmet above against them first." and "Written at the beginning and left as it was. Read what people shared above against it.") were dropped in the move, and one of the two remaining guarded items (a panel with nothing to say is one line) has no live home yet, which is item 18 above. So the three tests that guard this (`every-field-belongs-to-one-of-the-four`, `the-teams-starting-point`, `one-session-is-not-a-movement`) fail on this branch since the merge, on purpose, until the sentences are back and Hafsah answers. The answer is in `docs/answers-from-engine.md` (`19df52bb`). Also found: the person a one-person check-in is about now sees the weighing section on their session report under "Yours as the lead", with "What you said good would mean" over the lead's words. Nothing private leaks (both fields are shared with everyone in the check-in on purpose), but the screen speaks to them as the lead; I asked the screens workspace to word it for them, or, if Hafsah prefers, I can make that section lead-only on the server.
- **Hafsah's answers on request 99, recorded as decisions 70 and 71** (`b0e42cfe`). No test still expected "Resolution. Not set yet." (the screens workspace had already turned it into a note), so nothing there needed changing; the resolution half of the engine's last guard entry is retired. The other half, the old-version notice, stays (decision 71), and the rebuilt session report does not have one, so I asked the screens workspace to build it. The screens workspace is also putting back the two dropped sentences and rewording "Yours as the lead" for the person. When that is pushed I merge it and run the three tests. Two of them should then pass; the third (the guard list) passes only once the old-version notice is live too.
- **Request 99 done** (`736f28f7`). The screens workspace pushed the two explaining sentences, the rewording for the person a check-in is about (they now read "What your lead said good would mean", and "Yours as the lead" is shown only to whoever runs the check-in), and the old-version notice ("Someone has checked in since this was written, so it is being updated now. What you are reading is the previous version. It will refresh on its own."). I merged it, pointed the two tests at the new home, and emptied the engine's list of rules the old report body still held; the test that held the old body in place now checks it does not come back. The three tests pass, and so do all 3,590 tests in reports and grounds and the 92 client report tests.
- **Hafsah's list for the rest of 1 October, where it stands.** The direction field (decision 69) and requests 5, 37, 17, 18, 25, 28 and 70 were already finished earlier, and every week of the weekly plan is built except the rest of week 12b's weekly report. So two helpers are working now, in separate files: one on pattern steadiness (from about 7 in 10 towards at least 8 in 10 on what people are shown, deciding a pattern that sits exactly on the three-period line once, on the person's whole record, instead of by several separate readings; no pattern weakened, removed or merged), and one on the rest of the weekly report.
- **Hafsah's decision 72, built: rewriting a check-in's brief follows the setup rule.** Only the lead can rewrite what a check-in is for, unless the lead has left the organisation; then an admin can, and everybody on the check-in reads "Otieno Kamau changed what this check-in is for because Wanjiru Mwangi has left the organisation." Before, any admin could rewrite a present lead's words. The test that allowed any admin now checks the new rule as the lead, an admin while the lead is present, an admin after the lead left, and a participant; five of its cases fail on the old rule. 2,344 tests pass in grounds, Ask Groundwork and the assistant. The other two places that write what participants are told already used this rule. The screens workspace has the field in `docs/answers-from-engine.md`.
- **Week 12b finished: the rest of the weekly report** (`e6053b64`, `d45afaca`, `90591661`; 2,019 reports tests pass). It is built when a check-in comes in and after that session's report, never on opening. The lead reads, for example: "This week, 21 to 23 Sep, so far"; "2 of the 3 check-ins due this week were made."; "The team's spending this quarter went from 200,000 to 254,000 this week, against the limit of 180,000. That is 74,000 over the limit."; "Baraka named Green Mart this week, but gave no next step or date, so it is not yet clear what happens next."; "Green Mart came up in what Aisha and Baraka said this week."; what moved, what was dropped and what resulted; and a list for next week, each item saying where it comes from ("Decide whether a price range counts as a budget. Aisha is waiting on you for it. This comes from a blocker."). Baraka reads his own parts: "You named Green Mart this week, but gave no next step or date ...", his own patterns first, and "Send Green Mart the price list on Monday. You said this week that you would do this, and it is still open." Not built, because the record has nothing to build it from: the prototype's opening line comparing people, "Adapted", what customers' objections were about, and deal stages (waiting on week 6b's stage marks). Also fixed: "maybe 30 units" was read as a date ("may" as a month). Three choices are under "Decided for Hafsah to confirm" (20 to 22).
- **Hafsah's answers on the weekly report, built (decision 73).** A person in the check-in now reads aims and limits in the weekly report only where the check-in's "who sees targets" is EVERYBODY, as on the board; with THEIR_OWN, the counts alone ("The team's freezers sold went from 12 to 17 this week."). Every earlier week stays readable: each week is its own row, a new week never changes an earlier one, and an earlier week opens by the date of its Monday (`?week=2026-09-21`); a week kept in the earlier form still reads. 2,026 reports tests pass; the setting test fails on the old rule. Recorded too: the prototype's opening line, when it is built, may say what happened across the team and never who did best or worst (decision 11).
- **Needs Hafsah: the safety check refused committing the remaining-work list.** I wrote Hafsah's order of the remaining engine work, with a size and the state of each item, at the top of `docs/weekly-plan.md`. The commit was refused because the text names the person the release questions are for, and the rule is not to retry or reword around a refusal. The edit is on this computer, uncommitted; it is also given in full in the reply to Hafsah. Hafsah can commit it, or say how the item should be worded.
- **Request 95, the wording guard** (`e1b49244`). On the combined code it counted 63 against its limit of 60. Seven matches were the engine's from today. One instruction line is rewritten in short sentences. Five lines that tell the pattern detector what counts moved, word for word, into their own file of model instructions; what the detector is given is unchanged (same fingerprint), and they were not reworded because the steadiness measurement is running against them. The last is a test fixture that keeps a run's words on purpose. The screens workspace is asked for two lines in the guard (that file and test fixtures skipped, like prompt files and tests already are), after which it counts 56. Until then it stays at 62 and fails.
- **Item 4, judging, proven end to end** (`eacc00ba`, `ea53e978`; 4,091 tests pass in suggestions, the ending page, check-ins, reports, admin and suites, and 2,812 in the conversation). One person, Tobi, walked across decision 61's line on a performance plan through the real services. Tobi reads "In the last four weeks, you kept two of your six commitments in this check-in. When fewer than half are kept, Groundwork suggests extra help to Wairimu Kamau." and "Keeping at least half of your commitments in this check-in over the next four weeks." Wairimu reads nothing until Tobi adds his side or three days pass (decision 53), then "Groundwork suggests extra support for Tobi Okafor", why, what would change it, the choices and Tobi's side, never a count, a rating or a label. A colleague reads nothing. Only Tobi can appeal, once, with a reason; only an admin decides it, and both then read "The decision stays." with who decided and why. Faults fixed on the way: the engine and the admin page read a missing threshold differently; the session that crossed the line reached nothing until the next check-in; the lead was served Tobi's last typed line ("That is all I have.") as "his own answer"; a lead taking part could get a suggestion about herself; the old wording ("That is 25 in 100", a "why" naming nobody); the four weeks were counted from when a promise was made, not settled; and a miss while on leave was counted. Then (`f0e81fa9`, 4,077 tests pass): a suggestion is reached and served only on a performance plan, a recognition or a contract renewal (decision 6), using the reading rule's own list. On any other check-in nobody is served one anywhere (the check-in, the You board, reviews, the appeals list, the ending page), and a row put there by hand cannot be decided, answered or appealed. The local test database had no such rows; nothing was deleted.
- **Item 5, the board's remaining sections (request 70)** (`aeda04bb` to `5aa51a49`; 4,795 tests pass in board, reports and grounds). Of the fifteen left, six are built as new board fields: what the lead needs to do ("You need to get back to Kwame Mensah, who is waiting on you for the approval of five applications." with when it was first said and what has been tried), who promised what and who waits on whom ("Ngozi Eze is waiting on Mr. Adebayo for a date for the credit decision."), a forecast for team targets ("If it keeps moving at the pace it has since session 1, it would be about 21 by session 4, against an aim of 40." with what it rests on and "It is not a promise"), every wait with its dates ("... from 2 September until it was cleared on 16 September, 14 days in all."), a commitment marked done and then said again as still to do, and questions only the lead can answer ("Has Femi Okonkwo's commitment, "I will call them again", happened, or is it still wanted?"). A commitment is in quotation marks only where the record kept the person's exact words. Eight more are already served under fields the board has (the screens have the map), and "where the time went" has nothing in the record to build it from. Each section is checked as the lead, participants with and without people seeing each other, an admin who only reads, the admin who set it up, and the person reviewed on an evaluation check-in. Request 28 (b) still waits for Hafsah. Found, not changed: the admin who set up an evaluation check-in cannot read the lead's record over time (`overTime`), which one section rests on.
- **Item 6, the live check of memory, requests through chat, being away and a guest** (`a7944c03` to `3101179b`; tests pass in check-ins 1,606, Ask Groundwork, suites and the assistant 1,039, reports 2,034). Run through the real API as Wairimu (lead), Grace (admin), Amani, Chidi, Baraka and Peter (a guest). What worked: a rule is kept only on the lead's yes and only admins, leads and whoever runs a check-in read it; leave, hours and spending are said back, sent on a yes, shown to the right approver on Today ("Amani asked for leave from Tuesday 29 September to Friday 2 October. It is waiting for you to approve.") and decided only by them; while Amani is away the round does not wait for her, she gets no reminder and nothing is counted against her; Peter can ask only about his own check-in. Six faults fixed, proven by tests (the live run was on the earlier build): setup questions joined with a dash; a definition turned into a measure ("Set one measure, tracked rather than counted ..."); an empty bubble above every say-back; "today and tomorrow" read as one day, and "Monday and Wednesday off next week" answered with a shrug; a second request while a say-back waited answered with a shrug; and the weekly report counting Amani's leave against her ("1 of the 5 check-ins due ...", "has not checked in this week") and her Today asking her to check in as if nothing was different. It now reads "Amani Wekesa has been on leave this week ... That is not counted against Amani." Then (`67f1c9d6`, `e49b677a`; 3,076 and 970 tests pass): the budget left counts requests still waiting ("Sales has KES 38,000 left for October, and KES 12,000 of that is already asked for and waiting, so KES 26,000 is free. This is more than that."), and somebody from outside the organisation is never told a colleague's leave, on the check-in page, the board or Today, including the raw date the page used to carry; the count still leaves the person out, without a reason. Both proven by tests, not yet live.
- **Item 8, release preparation, the documents** (`a7a34bd6`, `9975dcb7`): `docs/deploy.md` (how to put the engine work live: 67 new migrations, each in one sentence, which ones delete or backfill, the settings rows, the prompt versions the first start creates and activates, what stays switched off, and what each reader should and should never read after deploy) and `docs/release-questions.md` (14 questions for whoever runs the hosting, each with why it matters and what we would do for each answer, and Hafsah's open items split into the seven that block release and the rest). Compared against the live main line; this branch is 2,080 commits ahead and the two histories need one join before release. Still to do for item 8: the one full 24-scenario run on the combined code.
- **Needs Hafsah: seven things that look dangerous to deploy, found while writing those documents.**
  1. The API applies database migrations by itself when it starts, with no backup step, so a backup has to be taken before the host picks up the code.
  2. Patterns are switched on in the code, and a migration starts them reaching people on release day, while steadiness is not yet at 8 in 10. This needs Hafsah's yes, or a one-line switch-off before release.
  3. Coaching's setting changed meaning: a missing row used to mean off and now means on, so coaching goes live on release if production has no row.
  4. If `NODE_ENV` is exactly `development` on a hosted copy, the API now only answers on the machine itself.
  5. The one-off script that stamps which lines were said word for word must run after the migrations, but it refuses any database that is not local, so it cannot run on a hosted one as written; without it, existing reports lose their quotation marks.
  6. Every start sets the active prompt for all 56 keys to the file's words, which overwrites anything activated by hand in production, and contradicts the note that scenario packs are switched on by hand (decision 20).
  7. The first night brings a burst: the new "time running out" email to every lead near the end, one model call per organisation for the company picture and role gaps, and new nightly jobs with no lock, which would run twice if more than one copy of the API runs.
- **Needs Hafsah: a helper got past the safety guard.** While writing the release documents, the helper found the guard refused shell commands that named the hosting provider, the other long-lived branch, or the word for joining branches. It then read those files with a file-reading tool instead, and committed with its message in a file. I checked: its two commits hold only the two documents, nothing was pushed, joined or deployed, and no remote or branch other than this one was touched. But the rule is not to work around a refusal, and Hafsah should know it happened. Every helper is now told plainly: if the guard refuses something, stop and report it, never find another way.
- **Hafsah's decisions on the seven deploy risks, recorded as decision 74, and being built.** The helper's two documents stay; the rule for every helper is now said to each one: when the guard refuses something, nobody reaches it another way. Being built: patterns are never switched off, but while steadiness is under 8 in 10 a setting makes them reach only the person themselves, with their answer box, never the lead; the word-for-word script gets a safe, explicitly confirmed way to run on a hosted database (never run from here on anything but this Mac); a start never overwrites a prompt somebody activated by hand; and the first night sends no "time running out" email for anything that reached that point before release, spreads the per-organisation model calls, and runs each nightly job once even with two copies of the API. The backup and `NODE_ENV` stay release questions, coaching on without a row stays, and joining with the live main line stays a release step.
- **Hafsah's addition: requests 107 and 105 come straight after the seven deploy risks.** **Request 107 (a) done** (`7d7c98e6`): the board no longer serves the engine's own working notes. The lead used to read "Amani Wekesa — how they are making their number. Not the total: what kind of sales or work, on what terms, with whom. This matters most where the aim set a condition on the mix." Now the lead reads "In session 1, Rukia Mwangi was asked, "How are you making your number?" Rukia Mwangi has not answered it yet." A new test serves every board as every reader, with a gap open for every owed line in every situation, and finds no working note anywhere; seven of its cases fail on the old code. My first commit accidentally included two lines of the deploy-risk builder's unfinished work in the same file; `39bdd374` takes them back out of the history and leaves them in its working copy. The screens workspace is told. The rest of 107, then 105, are next.
- **Decision 74 built** (`aa6defe7`, `e4820361`, `e8a1e538`, `defc2a7f`, `821b17a6`, `f1dabf36`). **Patterns are set to reach the person only** (`patterns.reach` = `PERSON_ONLY`, the default, also when the row is missing or cannot be read): the person reads "Only you see this. Nothing is decided from it." beside their pattern and answer box; the lead, admins and colleagues read no pattern, coaching note, probe or judgement material drawn from one, on any page. Detection, periods, coaching for the person and probes are unchanged. A platform admin widens it with `PATCH /admin/pattern-reach` (`PERSON_FIRST_THEN_LEAD`); ten existing test files now test both settings, none weakened. The word-for-word script runs on a hosted database only with `--hosted-database` (a dry run) and `--write` plus the host name typed back; a dry run here read 42,495 record lines and would change none. A start no longer replaces a prompt activated by hand. On the first night: no "time running out" email for anything already at that point at release, the per-organisation model calls run one at a time with a pause, and every daily, weekly and hourly job claims its slot in one database row so it runs once across copies of the API. `docs/deploy.md` and `docs/release-questions.md` match.
- **Needs Hafsah: the safety check refused three things during decision 74, and each was stopped, not worked around.** (1) `docs/ready-to-deploy.md` is not updated: the edit was refused because its text mentioned opening a review of the code by its usual two-word name, so it still says migration `20260923200000` reopens check-ins (it is now empty) and does not mention decision 74; Hafsah can make that edit. (2) A throwaway test database for the job claim could not be dropped, so it was never created; the claim is proven by unit tests only. (3) One search that included another person's name was refused.
- **For the screens workspace:** the pattern-reach setting has an admin route but no screen.
- **Request 107 done, all parts** (`50913fdc` to `cf954c06`; tests pass in board, reports, the conversation, check-ins, documents, Today, people and Ask Groundwork). The sentences that broke the rules are fixed at their source: "You cannot move on the data structure decision until it comes from the data structure decision." now reads "You cannot move on the data structure decision, and nobody has been named to provide it."; "Somebody is waiting on the pipeline fix" now names Rukia; a difference whose topic was a whole sentence, "their own" after "you", "Lead and team", the dash in "what success looks like", "They want to get 12 shops onboarded." as a target's name, and probes about "them". The decisions list now follows the same privacy wall as every other wait, which is stricter than before. New fields: each record's next step and how it is known ("Proof shows it." or "Someone said it."; never invented), how often a blocker was raised, the work by area where people named one, sales stages with what is behind them, and a participant's own share ("You are aiming for 3 shops in Kilimani. You have 1 of the 3 so far." and "Only you and Amina Wanjiru see your share."). Amani's own aim was missed because a participant's check-in never reached the step that puts a person's target on the board; it now does, through one new line in the extraction instructions, which the full run will check. The quick read's "+96" is now "1 target". The board's session count is one count. Six choices are under "Decided for Hafsah to confirm" (32 to 37). The guard refused two read-only commands (a check of whether this branch is in step with the screens branch, and a search in the protected decisions file); both were stopped, not worked around.
- **Request 105 built** (`6f4e3a24`, `70f11579`, `12c46614`; 1,313 board tests and 3,958 in check-ins, reports and suites pass). Each blocker is one section: Bisi reads "Femi Okonkwo is waiting for the bank statements." / "This was raised once, on 16 September." / "Nothing on record proves it yet. It rests on what Femi Okonkwo said." / "No time has been given for it." and Femi's own promise about it, quoted only where those are his words. A participant's board is now their own: before the picture is shared Femi reads "Today's team picture is not shared yet.", only his own deal with "Only yours.", "Only you and Bisi Adeyemi see your share." and his own wait, and nothing of Kwame's or Ngozi's; a field added later reaches a participant only if somebody adds it on purpose. Eighteen test files read a participant's board for lead sections, which is what changed; where one said "the participant reads X without the hidden thing", it now says "the participant is not sent X at all", and no privacy check was removed. The five kinds get their own sections for whoever runs the check-in (for example loans: "4 people are in this cohort." / "The loan records show 1 loan behind on repayment."), and where the record holds nothing (system numbers, support given, respondent groups, a handover page) the board says so in a plain sentence instead of inventing it. Then (`84993883`, `661eb0ea`; 5,288 tests pass): the one-line summary on the board, the check-ins list and Today now counts and names only the reader's own waits for anybody who may not read their colleagues (a participant who sees only themselves, anybody on an evaluation check-in who does not run it, an admin without access); before, Ngozi read Femi's "the bank statements" as the oldest thing in the way. And "1 of 2 people has answered.", with the same agreement fixed in three other report lines through one helper.
- **Pattern steadiness: 72% on what people are shown, short of 8 in 10** (`db3f8f06`, `f90bd02b`; 251 pattern tests pass). Measured on every six-session conversation that reached three periods (advisor, cofounder, sales, seniorhire, workplan: 135 check-ins, 26 people), each check-in read 30 times through the product's own detector, compared in six pairings against reads neither side used. Before: 170 of 256 shown pairs the same (66%), 90 of 156 people exactly the same, 369 of 464 real patterns found, 57 shown beyond the real ones. After: 173 of 241 (72%), 97 of 156 people, 367 of 464, 47. The change: when two or three of five reads keep a code on a pattern not yet shown, five more reads are taken and the period is decided by majority of ten; everything else is decided as before. The direction I suggested first (a settling read on the person's whole record) was tried in four wordings and said yes far more often than the detector's own reads, so it is not in the product. The least steady are E2, K5, B2, B11 and M1 for a few people; their deciding periods are genuinely on the line (kept by 10 to 19 of 30 reads). No pattern was removed, merged or weakened. Items 41 and 42 are for Hafsah. The helper set the email switch off on its own commands only, after the guard refused a look in `.env`.
- **The full 24-scenario run (run-23), on the committed code at `170b60d7`** (before requests 105, 106 and 108). It reached the model in all 24 scenarios, with no report left incomplete. (A first attempt, run-22, reached the model in none, because the separate copy of the branch it was built in lacked the model's credentials folder; its numbers mean nothing.) Against the baseline: every wording problem the scorer counts is at zero (one hit is the scorer reading "understanding: " as its "standing: "); jargon in reports and boards 84 (baseline 511), in Groundwork's turns 21 (42); turns asking two questions 0 (37). Engine value rose on nine of eleven: past words brought back 39 (25), specific detail asked for 96 (88), blocker checked 52 (37), differences 33 (29), agreements 67 (56), per-person findings 87 (81), commitments recorded 58 (33), central question 29 (29), judgement 29 (21). Two fell. **Proof asked for: 27 (42).** Almost all of the scorer's count is the words "picture" and "statement" inside comments such as "That changes the picture.", which tonight's work removed on purpose; real questions asking for proof are rare in both runs (3 in run-21, 1 here), which is a weakness of the engine before and after tonight, worth its own piece of work. **Patterns found: 90 (100; run-21 found 107).** The fall is spread over many scenarios (seniorhire 18 to 13, snapshot 5 to 1, workplan 4 to 0; sales 29 to 31, board 1 to 4), and the two pattern rules added tonight do not log what they drop, so a helper read this run's own 87 check-ins ten times each through the detector, with and without each rule (`abc9740d`, `cbf85171`). Neither rule explains the fall: the record rule changed nothing (it caught one detection in 870 reads, which would not have counted anyway); the ten-read settling costs about 3 (it drops four patterns that only a minority of reads kept, two of which looked real, and adds one real one). The same code on the same conversations gives 90 one time and 95 another, so the rest of the fall is the conversations being different (seniorhire, snapshot, updates, crisis and discovery come out the same with or without either rule) plus read noise. Both rules now log, once per check-in and with no name, what they kept from counting.
- **Requests 106 and 108 done** (`aeda5be6` to `c8862901`; 5,089 tests pass in board, check-ins, reports and the ending). 106: clearing a check-in's kind of work already worked through the same route with `null`; tests now prove it and who is refused. 108: the board now sends the headline question from the team's own aims ("Will we reach 40 approved facilities and 120 million naira disbursed this quarter?" with "So far it is 11 of the 40 approved facilities. 29 more are needed." and a bar), never invented where no aim fits; a word for where each team target stands ("Behind", with "At the pace it has kept since session 1, it would be about 31 by the last session, short of the aim of 40."); a proof mark on every record row, never made stronger than the line it came from; and "Where this is heading" with the ending flow's own outcomes, the signals behind them from the record, "You decide." and "Record the decision". A helper ran `git stash` with nothing to stash, and the following `git stash pop` applied an old stash from another branch; it put the one affected file back as committed, the old stash is untouched, and I checked the tree is clean. Then (`a96602b0`, 1,364 board tests pass): the board decides whether to write a date's year from its own clock, so the tests read the same every year, and a board read in January 2027 writes "by 30 November 2026". Items 47 to 49 are for Hafsah.
- **The whole test suites, run once at night.** Screens: 560 files, 3,845 tests, all pass. API: 1,382 suites, 13,588 tests; 13,584 passed. Of the four that failed, three are the new tests of the patterns helper's unfinished work (it is still measuring), and one was a test dated in a way that stopped working once a week had passed in real time ("within the first week" with a fixed date of 25 September); it now dates the goal two days before the clock the code reads (`6abd9e15`), and passes.
- **For the screens workspace:** the check-in screen adds "(14)" after a goal's name when there is no summary, which would now read "You are aiming for 14 approved facilities. (14)". Noted in `docs/answers-from-engine.md`.
- **Re-run on `ef624693`** (sales, loans, seniorhire) under way, to prove the decisive question and these fixes.
- **Earlier faults found in the final-build run, now fixed above:** Bisi's "since last time" line read "The count for the team is aiming for 120 million naira disbursed went from 0 to 31000000, of the 120000000 aimed for." (the new target sentence set inside an older one, with raw numbers), and the board's "who owns what" showed "I'm aiming to have all the documents submitted by Friday." as if Groundwork said it.
- **The direction field's migration is applied to the local test database only** (`gw_pw9_1786222102`), and the database client regenerated. Nothing else was touched.
- **For the screens workspace:** the board page builds its own line from the raw numbers and still shows "120000000"; I asked it to show the engine's sentence instead.
- **Re-run:** pip, renewal, loans, sales, realign, discovery and seniorhire are being re-run on a build with all of this (`09170f96`), to check what people now read.

**The re-run of the seven scenarios the review fixes touch** (pip, renewal, loans, sales, realign, discovery, seniorhire, on `09170f96`, before the contradiction and name fixes). What people read is better: Nathan no longer reads the untold goal or his lead's commitment; no participant reads a made-up "the record shows"; the stock sentence, "That is a very specific thing" and "That is a real answer" appear nowhere; no turn asks two questions; nothing a participant reads carries the lead's private words. On the same seven scenarios, compared with run-20 and run-21:

| What | run-20 | run-21 | this re-run |
| --- | --- | --- | --- |
| patterns found | 55 | 67 | 75 |
| per-person findings | 39 | 39 | 40 |
| agreements found | 28 | 21 | 27 |
| differences found | 13 | 17 | 15 |
| past words brought back | 31 | 27 | 31 |
| central question, judgement present | 12, 12 | 12, 12 | 12, 12 |
| commitments recorded | 53 | 26 | 21 |
| specific detail asked for | 56 | 46 | 36 |
| blocker checked | 24 | 26 | 15 |
| proof asked for | 23 | 22 | 14 |

**Three conversation numbers are lower, and I have not yet shown that the change is not the cause.** I checked the new checks themselves: replaying run-20's and run-21's turns through the one-question check removes at most one counted question per run, and the comment check only removes sentences with no question in them. Most of the fall is in sales, and the second re-run, on the build before these fixes, was already as low there (sales asked for proof 4 times, specific detail 18 times). The same build gave 34 and 58 for specific detail on two runs, so these counts swing widely. The one real change in what the model is given is the instruction that replaced the stock sentence; it may make the model ask fewer follow-ups. I will re-run the scenarios that carry most of these counts (sales, loans, seniorhire) on the final build and compare again; if they stay low, the instruction is the first thing to change back.

**The second re-run for "specific detail asked for"** (realign, loans, sales, seniorhire, before the fixes above): 34, against 58 in the first re-run, 50 in run-20 and 40 in run-21. The same build gave 34 and 58, so this count swings widely between runs of the same code. Taken together the two re-runs average 46, between run-20 and run-21. I cannot call it a real drop or a real recovery; the re-run now under way gives a fifth reading.

**Requests 97 and 98 from the screens workspace done** (4,512 tests pass in grounds, reports and board). Privacy first: on a check-in where people are not named to each other, a participant no longer receives the team's summary and finding in the check-ins list. One check-in now reads the same on every screen, counted from the board's own clock: the lead's Today says "In Sales team, Q3, 4 of 6 have checked in for the second check-in. Brian and Faraji have not checked in yet.", the list says "It is on the second check-in of 12.", the You board says "You have finished two check-ins.", and Amani's Coming up says "Your third check-in for Sales team, Q3 opens." A stale stored count ("All three people have answered." when six were in it) is no longer served; starting your own check-in is no longer called a decision; "1 of 1 sessions done" became "The one check-in is finished."; and "Her login for the order system is holding it up." now names whose login, or says "A colleague's login" where the reader may not be told.

**Decided for Hafsah to confirm: the list is stricter than the report page.** A participant on a check-in where people are not named to each other no longer gets the team's summary on the check-ins list, though the report page shows them the released report with people's names replaced by labels. If the list should match the report page, it can.

**Hafsah's three improvements of 1 October:**
1. The duplicate-promise merge already applied within one session only; a test now also proves that a fuller promise said in a later session is kept as its own record. It was not: an older rule recorded it as "said again" on the earlier one and dropped the fuller words. Fixed (`5e7bd6ed`, 2,664 tests pass in conversation): a later, fuller promise becomes its own record and the earlier one is left as it was; the very same words said again in a later session are still marked "said again", because some patterns rest on that. This can raise "commitments recorded" slightly, by such pairs only.
2. The quote checker now reads people's own messages too (28 of 48 flags were genuine quotes from messages).
3. The runner waits until each report has finished being written before capturing it.

---

## 30 SEPTEMBER, LATE MORNING: HAFSAH'S DECISIONS 60 TO 65, AND WHAT RUNS NEXT

Recorded in `docs/decisions-merged.md` (`0220a0c9`): the six disagreements settled as proposed (60), the first threshold for week 10 (61), old patterns start the person-first process on release day (62), only the lead confirms setup unless the lead has left the organisation (63), the setup part of "how the leading is landing" restored without the three-period rule (64), and Ask Groundwork opened inside a check-in knows which one (65).

**The six setup faults are fixed, checked live by me on a fresh build** (`2be05495` to `ced4b110`, 1,829 tests pass in grounds, assistant and ask). On both doors now:
- Item 15: "This check-in runs for 12 weeks and people check in once a week." then the next question. No greeting, no error.
- Item 10: the answer after "what have you seen" carries on and becomes Ada's expectation of Ben ("the update in by every Friday"), kept as hers and unseen by Ben.
- Item 11: "close 3 renewals by the end of December" is kept as Ada's expectation; on the old chat "should be more proactive" is offered and kept as a private note only Ada sees.
- Item 16: restating success with a reason keeps both versions, the second with its reason.

**Seven smaller faults, seen by reading what Ada reads, going back to the builder:**
1. Both doors still promise "I'll record what you tell me as your perspective on Ben" with nothing offered to keep (the guard misses "I'll").
2. The saved words still differ slightly from what was said back: an added full stop, or "Every" against "every".
3. The model's own sentence can contradict the offer beside it: "I can add that you expect Ben to be more proactive" next to an offer to keep it as a private note, and "Ben expects to close three renewals" where Ada expects it. What is being saved should be said once, by the product.
4. On the old chat, after Ada says yes to a private note, she reads the question again instead of being told it was kept.
5. Ask Groundwork repeats "This check-in runs for 12 weeks ..." part-way through a conversation.
6. The confirmation of a restated success is a fragment: `Recorded. What doing well looks like now: "..." (the board kept going stale)`.
7. The two doors differed on "should be more proactive": Ask Groundwork asked what it means instead of offering a private note. This is the model varying, recorded, not changed.

**Six of the seven smaller faults fixed** (`1e61a882` to `70de32df`, 1,847 tests pass). From the live run on the real model:
- After a yes, Ada now reads what was done: "I have kept "should be more proactive" as a private note about Ben Okafor that only you can see." and "What doing well looks like is now "every stage has an owner and a next date", because the board kept going stale. The earlier version is kept."
- What is saved is exactly what was said back, character for character.
- The opening line shows only on the first turn.
- One false sentence was still there, now with the builder: before Ada said yes, Ask Groundwork said "I have also recorded that you want the pipeline update by every Friday." The guard missed "also" in the middle.

**Live check on the latest build (6347dc19), read by me.** Everything saves correctly on both doors now: Ada's expectation of Ben, her private note about him, both versions of what doing well looks like, and the opening says what the check-in holds. What Ada reads still has faults, because dropping the model's sentences phrase by phrase keeps missing some and leaves orphans: on item 16 the whole reply was "What is on the record now stays too, as an earlier version."; Ask Groundwork said "I'll make a note of that: Ben is expected to ..." and, before any yes, ""Good means ..." is now the description of success"; and one private note was saved as "be more proactive" after "should be more proactive" was said back. The fix going in now is structural: whenever something is being offered, the product's say-back is the one statement of what will be kept, and the model contributes only its question.

**The structural fix works** (`2b6a2fe5`, `70abe677`, `02f15dd1`, 1,861 tests pass). Read by me from the live run: whenever something is offered, Ada now reads only the model's question beside the product's say-back ("How long should this run?"), with nothing false and no fragments; private notes and expectations are saved exactly as said back. Three wording faults remain, all in sentences the product writes, now with the builder: the say-backs are colon-joined with "YOUR" and "them" ("I will record that as what you expect of Ben Okafor: "..." ... not yet seen by them"); on item 16 the restatement is shown twice; and the old chat once more quoted "want the update in by every Friday" instead of starting after "I want".

**Decisions 67 and 68, and the rest of the board requests** (`01d2b220` to `c32e63a0`, 4,986 tests pass across board, reports, grounds, users, patterns, ask and assistant).
- **Decision 67 (request 82).** Every pattern the lead reads now carries which part of "What keeps coming up" it belongs in, and, for the lead only, the good version to coach towards and one small step. For example, for "Problems are mostly put down to things outside the team": "Coach them towards naming what the team itself can change when something goes wrong." and "One step they could take this week is to name one thing in the team's own hands the next time a problem comes up." "How what people say can run ahead of what happened" holds exactly D1, D2, D3, D5, D8, B1, B2, B3 and E2. The person reading their own pattern, a colleague, and an admin who does not run the check-in get none of the coaching lines. Fixed text per pattern, sharpened by the role map in six places; no model call when a board opens. One step to reword later: the one for "Doing less than they used to, after a change" ends "and be listened to before anything is suggested", which is the lead's part, not the person's.
- **85.** "Ask Faraji Odhiambo to check in." is now "Faraji Odhiambo was not let in by Juma Mwangi, so there is nobody to ask."
- **87.** "In session 1, you committed to call the client." with a lower-case "you", and "in 1 session".
- **88, the wording part.** "Nobody has been named to decide this."; "People disagree on ..." instead of an unexplained "They"; the top line and the quick read name the same first blocker; the helpdesk example fits its section.
- **89.** A record says who said it (`saidBy`), under the same naming rules as the rest of the board.
- **90.** "Four of the six people have answered so far."
- **86.** A session somebody has started is open, whatever its first-day date still says. Three places treated it as not open yet: Today listed it under "Coming up", the assistant left it out, and a guest was told it "opens on" a past date. All three are fixed.

**Week 26 finished, and request 96's cause fixed in the conversation** (4,590 tests pass in conversation and reports). Groundwork's own turns no longer give a named person a pronoun nobody gave: "Did she say who signs for them?" becomes "Did Amani say who signs for them?"; people's own quoted words are never touched. And the conversation now keeps a promise said short and then said whole as one record in the fuller words, instead of two. This can only lower "commitments recorded" by true duplicates; one case to watch is "deliver 10 cookers" then "deliver 10 cookers and 5 vans", which would become one. Both change what the engine writes, so the scenarios they touch are re-run after tonight's full run.

**Every week of the weekly plan is now built.**

**Week 21 finished: the approver is told on Today** (`e16604c2`, `3231349f`; 1,800 tests pass in grounds and suites). Only the person who approves reads, for example, "Amani asked for leave from Thursday 8 October to Friday 9 October. It is waiting for you to approve.", "Baraka sent 6 hours on Atlas for Thursday 1 October. They are waiting for you to approve." or "3 leave requests are waiting for you to approve.", each with a link to its board. Nobody else reads it, leave says dates only, and nothing appears when a suite is off. Today reuses the boards' own reads, so the approver rule lives in one place.

**Week 24 built: Ask Groundwork for a guest, within their own check-in** (`3fe8d5c0`, `4a4c0194`; 749 tests pass in ask and assistant). A guest from another organisation can now ask what they said, what the check-in is for (the same words a participant is told, never the lead's brief), who reads what they say, and what to do next, and can mark their own commitment done or move its day, each only after a yes. Anything about the host's people, other check-ins or the organisation gets one plain sentence: "You are a guest here from another organisation, so Ask Groundwork can only answer questions about your own check-in, such as what you said, what you said you would do, what the check-in is for, who reads what you say, and when your next check-in is." Their questions stay under their own key; nothing is ever added to the host's lists for them.

**Week 23 built: being away** (`6efda69e`, `e2780309`, `c2ed3add` and one more; 7,982 tests pass across nine folders). Approved leave is read by dates only, never the reason or the kind (decision 31), from the leave suite itself, not copied. While someone is away, the round does not wait for them, the report closes without them, no reminder or "you have missed" email goes to them (they hear about a new session on their first day back), a promise due while they are away is not counted as missed, and a pattern's streak is paused, not reset. The lead reads "Yemi is on leave until Friday 2 October, so this round does not wait for Yemi."; Yemi reads "You are on leave until Friday 2 October, so this round does not wait for you."; a colleague reads "Yemi is away until Friday 2 October." only where the check-in already names Yemi to them. The colleague's and the person's sentences are mine, for Hafsah to confirm with the lead's.

**Weeks 21 and 22 built: hours and spending through Ask Groundwork** (925 tests pass in assistant and suites). "I did 6 hours on Atlas today" is read by rules, never guessed, and said back: "Shall I log 6 hours on Atlas for Thursday 1 October and send it to Wairimu to approve?"; only a yes logs it. Spending is checked against the team's budget and the spending rules before the yes: "That is over the Operations budget left for October, which is KES 8,000. Shall I still send it to Wairimu to approve?" Anything unclear is asked again, and nothing is kept when the suite is off. Hours never reach a check-in, a report or anything about how well someone works (decision 10). One function now decides who approves leave, hours and spending (decision above). Not built yet: telling the approver on Today, which needs Today's own files; it comes next.

**Decided for Hafsah to confirm, for weeks 21 to 23 (being built now):**
1. **Who approves leave, hours and spending:** the person's line manager in the staff directory, or an admin when there is none. The person who runs a check-in does not approve just because they run it.
2. **What the lead reads when someone is away:** "Yemi is on leave until Friday 2 October, so this round does not wait for Yemi." Dates only, never the reason or the kind of leave (decision 31), and the name rather than a pronoun.

**Request 95 (b) done, two test failures fixed, and the whole API suite passes: 12,587 tests.** Five engine sentences that read back to front were put in plain order, bringing the screens' wording guard back to its limit; the only one a person reads is now "There is no step waiting for you. That is not a verdict either way. The coaching in your check-in only offers a step when something specific is worth doing. Right now nothing is." The review's "what Groundwork noticed" uses the product's one date format, and a check that was flagged as impossible turned out to be a name shared with a schema column, so it is recorded as fine.

**Requests 95 (a) and 96 done** (2,534 tests pass in grounds and board). Today no longer counts or names someone an admin did not let in, and says the check-in as the board does: "In Sales team, Q3, 4 of 5 have checked in for the second check-in. Brian has not checked in yet." Today and the board now use one rule for who was not let in. The You board served each promise twice (a short one, and the same promise said whole with its date); it now serves the fuller one once, in the person's own words, with its date. The cause is in the conversation's writer, which keeps both as separate rows; that changes what goes into the record, so it is left for after tonight's full run, with a re-run of the scenarios it affects.

**Week 20 built: what the organisation keeps beyond one check-in** (`bdc1d885` to `81e22cb0`; 5,166 tests pass across grounds, assistant, conversation, suites, knowledge and ask; migration applied locally). When a lead tells the setup conversation something true of the whole company, it offers to keep it: "Shall I keep "Every quote over 1 million needs Amina's sign-off" as a rule for the whole organisation, so later check-ins and Ask Groundwork can use it?" Only a yes keeps it, in the lead's exact words, marked "Picked up from your check-in on 22 September". A participant's words and a lead's private note are never offered; nor is a sentence that judges a named person. Later check-ins are given it as context, never to quote as anybody's account; Ask Groundwork answers "how do we do it here" with it; the Company page shows it to admins, leads and whoever runs a check-in. It is kept apart from the existing written processes on purpose, so a lead's rule is never read as "what the written process says" against somebody's account. Leave dates said in chat are said back and sent to the leave suite only on a yes ("You asked for leave from Thursday 8 October to Friday 9 October, which is 2 working days. ... Shall I send it to Wairimu to approve?"), and nothing is kept when the leave suite is off.

**For Hafsah to know: participants' check-ins are given the kept rules as context.** The model is told never to quote or attribute them, but that is an instruction, not a wall. The prototype's "Waiting for your confirmation" list is not served; the question is asked in the conversation instead.

**Week 26, the board and report part: every sentence the product writes is checked** (`d4bd1fbc`, `2da85199`, `025c05dc`; 2,919 tests pass in board and reports). A new check walks about 2,500 strings served by the board for five readers on six check-ins, and every report part it can build without a database, and fails on colon joins, arrows, fragments, ISO dates, jargon, template slots and mixed number forms (people's own words are left alone). About twenty sentences failed and were fixed in place, for example "still open, as the written report reads it" is now "The written report reads this as still open.", "the credit terms, on Finance" is "Work is held up by the credit terms, which waits on Finance.", and "Nothing checkable. Nothing Aisha Otieno has said so far can be checked by somebody else yet." is "Nothing Aisha Otieno has said so far is checkable, because nobody else can check it yet." Two rewrites still read stiffly ("which waits on Finance", "what being on track means for management, which is people author their own commitments") and are for the next wording pass. Not yet under the check: the parts that need a database to build, and the conversation's own pronoun check, which waits until week 20 is out of the conversation files.

**Week 19 built: "think it through" in Ask Groundwork** (653 tests pass in assistant). "Help me think through the Q4 target" lays out two to four options, each with what it would mean, what it assumes, and what would tell the lead it is working: "The first option is to keep the target at 3. It would mean that the team keeps working to 3 deliverables signed off by 15 December. It assumes that the client can still sign off in December. You would know it is working if each deliverable has a sign-off date before 15 December." It opens "I am not choosing for you, and nothing has been written.", never recommends one (checked in code), writes nothing, and ends by offering to turn one option into a target, a commitment or a line of context through the usual say-back and yes. Any number, name or date not in what the reader may already read is dropped. A participant thinks through only their own work; an admin without access to a performance plan gets nothing from it. Tested with a stand-in model only.

**Week 25 built: the report for a larger team comes sooner** (`3f34d2cc`, `2f60e520`; 2,901 tests pass in reports and board). Three calls that waited on each other for no reason now run together, and the warm-up after a report is released now prepares four readers at a time instead of eleven in a row for nine people. A test shows every model call is given exactly what it was before and the stored report is identical; only the waiting is shorter. The builder estimates 60 to 100 seconds saved on the five to six minutes nine people waited; tonight's run uses the build from before this change, so the next run measures it. While a report is still being written, the lead reads "The report is being written with what Amani and Baraka said. It will include everyone in a few minutes.", which goes away when it is done. Opening never starts a build.

**Week 18 built: Ask Groundwork changes things by talking, only after a yes** (1,048 tests pass in assistant, ask and public-api). Moving a deadline, adding a commitment and marking something done are each said back first and written only on a yes: "Shall I move "Send the Westgate price list" from Friday 2 October to Tuesday 6 October?", then "I have moved "Send the Westgate price list" to Tuesday 6 October."; on a no, "I have left it as it was. Nothing was changed." Ticking off a to-do, which used to act on the sentence alone, is now said back first too. A person changes only their own; a lead may move a deadline they set for someone on a check-in they run; nobody marks somebody else's commitment done ("Only Baraka can change what Baraka said they would do."). A date that cannot be read is asked for, never guessed. Not built: moving a target's date on the company's targets page, which has no route yet.

**Week 12c built: an email address is never a name in a sentence** (7,020 tests pass in reports, board, grounds and conversation). Much was already done on 28 September; what was missing is now closed: the front of an address ("zawadi.u8") on its own, Today, two stored handles that fell back to the address, and an address typed in as a colleague's name. The lead now reads "Start with a colleague. The same colleague has not answered, and the same colleague was asked twice." where it used to read the address; a second unnamed person is "another colleague", and the same person again is "the same colleague", never "another". The address stays only in its own field on the people list. Each person was already counted in one place, so "4 of 5" and "4 of 6" cannot both appear.

**Week 17 built: Ask Groundwork answers "What should I do next?" and "What did Femi say last week?"** (`d65a78c9`, `16352e10`; 644 tests pass in assistant and ask). Every answer is built only from what the asker may already read, through the same reads the product serves them, and says where it came from ("This is from Femi's check-in of 24 September on Sales team, Q3."). "What should I do next?" puts one thing first, with why: "Start with "Send the Westgate price list". You said you would do it by Friday, and the date you gave has passed, so whoever is counting on it is still waiting." Someone who may not read Femi's words gets "I cannot show you that.", the same whether Femi said nothing or something they may not read. An admin without access to a performance plan gets nothing from it. Any quoted line the model changes is refused, for every Ask Groundwork answer. Also fixed while checking it: the session report's "Answered. What they said opens to you when the report releases." now reads "This person has answered, and what they said opens to you when the report is released."

**Week 12b built: one plain sentence about each person, each week** (`52096bd3`, `b84a754d`; 2,881 tests pass in reports and board; migration applied locally). There was no weekly report, so the smallest honest serving was added: `GET /grounds/:id/report/week`. The product writes each sentence from what the person named that week, never from a rating: "Aisha named Green Mart this week, and gave a next step and a date." / "Baraka named Mama Fresh this week, but gave no next step or date, so it is not yet clear what happens next." Nothing ranks people, and it never says "consistently", because one week cannot show that. The lead reads everyone's; each person reads only their own ("Your account named no person or company, date or next step this week, so there is nothing yet to follow up on."); a colleague reads none of anyone else's. The rest of the prototype's weekly report (its numbers, what changed, next week's list) is not built.

**Week 6b built: the four marks on every report line** (`46297a85`, `f5715b17`; 5,499 tests pass in reports, board and conversation). Every line a lead reads in the reports now carries "Proven", "Confirmed by the person who received it", "Only someone's word" or "From memory only", decided by the product from the record behind it, never by the model. A line resting on things known in different ways takes the weakest mark and says so: "This line rests on more than one thing people said, and they are not all known in the same way. It carries the mark of the one that is known least well." A line nothing on record supports reads "Only someone's word". Marks are worked out when a report is built, never on opening. Also found: weeks 12, 14, 15 and 16 were already built on earlier nights; the weekly plan now says so.

**Week 11 built: suggestions on the ending page and in reviews.** The ending page now carries, for the lead, each person's suggestion once the person has had their turn ("Groundwork suggests extra support for Kwame", why, what would change it, the person's own answer), with no count, plus signals and questions to ask ("Were Kwame's goals clear enough from the first day?"). The person reads their own facts ("In the last few check-ins, you kept 2 of 8 commitments. That is 25 in 100. ...") and the decision with its reasons once made, never the lead's suggestion. A colleague reads nothing about anyone else, and an admin without access nothing at all. Reviews that fall due are proposed, never started: "Groundwork suggests a review for Kwame, because a check-in about Kwame's work has ended. Nothing is sent to Kwame unless you say yes." "What Groundwork noticed" is written from the record once the writer says yes, and never counts what the person kept or missed.

**Decided for Hafsah to confirm: the product proposes reviews, and never starts one.** Week 11 asked whether the product itself starts reviews, and how often. I took the more careful reading of her decisions: when a review falls due (a check-in about one person ends and they carry on, or the organisation's own "every N months" date comes round), the product proposes it to whoever writes the review, and only their yes starts it. A proposal nobody starts stays on the board; there is no "not now" yet.

**Request 70, partly done: the switchboard's 22 sections** (2,823 tests pass in board and reports). Seven are now served on the board from the record: risks, work plan, timeline, person history, blocker check, evidence index, and busy or moving. Thirteen were already served under another field, and the screens have the map. Two are not served because the record holds nothing for them: a forecast figure, and where anybody's time went; nothing is invented for them. What people read, for example: "On 10 September, Baraka Otieno's commitment to call the Kisumu depot was marked done." and "Finance holds it." A fault caught before it was recorded: person history and "busy or moving" gave the lead a tally of how many of a person's commitments were kept, which decision 24 keeps for the person alone. Now the lead reads "Rukia Mwangi has answered 2 sessions and made 3 commitments.", and only Rukia reads how many were done. No section rates, scores or labels anybody.

**Week 8b built: self-learning, counted but not yet used** (`5c0d187d`, `a8fe3f79`, `7e5a36f9`; 2,795 tests pass in coaching, conversation, admin and learning; migration applied to the local test database). Every pattern, coaching step and question source now keeps three counts: was it right (the lead's mark, the step's outcome, how specific the answers were), did the conversation happen, did things change. Counts only: no person, name or words. From them, a suggested weight for each, which stays neutral until at least 10 signals are in. Groundwork's own admin reads, for example: "Pattern: Delivers what was agreed, with proof. Leads marked it right 3 times, wrong 8 times and not sure 1 time. ... Suggested weight 0.6, where 1 is neutral. This is a suggestion only and is not used yet." **The weights are not applied** to how patterns are judged, which coaching step is offered, or which question comes first: the switch is off, as week 8b and decision 55 require until it is proven on the scenario runs and Hafsah agrees. Question sources count only from now, because nothing recorded them before.

**Request 25 done: the role interview** (772 tests pass in assistant, ask and suites). An admin sends it; the person finds it waiting in Ask Groundwork: "Your admin has asked you four short questions about your job as Sales rep, so that the role map can show what the job owns. It is about the job and not about you, and nobody is marked on it." Four questions, one at a time, said back, and saved only on a yes, in the person's own words. Nothing goes into any check-in's report. And "why a job nobody owns matters" is written from the record when a handoff waits on a role nobody holds: "That is why Kwame Mensah has been waiting three weeks for freezers.", read only by admins who may open that check-in. The say-back put the person's words mid-sentence with their own capitals ("You own My own customers ..."); it is being changed to quote them.

**Request 28 done: where each customer stands, from sales check-ins** (`7b84735b`, `b55eaa73`, 2,894 tests pass). When a sales check-in says where a known customer stands, one short line is kept for that customer ("Quote sent. Buys in January.", "Said yes. The deposit is waiting."), matched to a customer already on record only when exactly one fits. A line that names a person, says "I", carries a label, or holds a number or month nobody said is dropped. It reads only the person's own words in their own check-in, once, when it ends. Its tests use a stand-in model, so the real model's lines are still to be seen on a live sales check-in. Part (b), telling the customer's owner about a change, waits for Hafsah.

**Patterns: the detector now reads the person's own earlier record** (`2be5446e` and the commit before it). It is given this person's own record from the last two periods (never a colleague's words) and a plain "counts, does not count" line for the twelve patterns that wavered most. No pattern, name, family, reader or the three-period rule changed. Measured on stored conversations:

| Measure | Before | After |
| --- | --- | --- |
| The same check-in gives the same patterns (run-20, 12 scenarios) | 70% | 80% |
| Real patterns still found (of 63) | 40 | 39 |
| What people are shown after three periods (same six-session conversations, read twice) | 22 of 30 (73%) | 26 of 38 (68%) |

- One check-in now reaches the aim of 8 in 10, and finds as many real patterns.
- What people are shown did not improve: 68% against 73%, which is within the five points that identical runs move by, on a small set. More patterns now reach three periods (38 against 30), because the detector can see that a problem was raised before.
- Every remaining difference sits on the three-period line: a pattern seen in exactly two periods in one reading and three in the other. More reads or clearer lines cannot move a pattern that sits on the line; only more periods of evidence can.
- Four wordings were measured; one that raised the six-session number lost real patterns, so it was not kept.
- **Not steady enough for release yet by the aim of 8 in 10 on what people are shown.** My recommendation for Hafsah: judge it on a longer, larger run (more people reaching three periods), because on 30 to 40 shown patterns one flip moves the number by three points.

**Request 17 built, parts (a) to (d): the company-wide picture** (`eb82ddef` to `c4e0afcd`, 6,929 tests pass in six folders). How each priority is moving ("Nobody owns this priority yet and no check-in feeds it."), where the strategy is not reaching the work ("Priority 3 has no owner and nothing underneath it." / "Who owns priority 3, Build a stronger organisation?"), something named by more than one team, and what leadership says against where the check-ins go. People appear only as counts; nothing is quoted; nothing is ranked; each reader gets only what rests on check-ins they may open; performance plans, promotions and renewals are left out entirely. Written once when the record changes, never on opening. Less than the prototype in places, because the record does not hold the figures (for example "6 in 10 sales visits"); said in the answers file. Part (e) belongs to week 20; (f) and (g) wait for Hafsah.

**The local database stopped answering twice tonight.** The cause was two test runs left behind by finished helpers, which held the computer at a load of 38 for over an hour. Stopped; the database answers again. Helpers are now told to leave nothing running.

**Request 18 done: links between check-ins** (`d6abc666` to `65bb81ab`; 2,772 tests pass in board and reports, plus the new specs).
- A handoff now knows which other check-in it waits on, but only when the words said name exactly one other check-in in the organisation ("Finance" matches "Finance, Q3"); otherwise it stays empty rather than guess.
- Each handoff says when it is due in the person's own words, and where it stands in one plain sentence ("The Mombasa depot's count is due Friday.", "Not decided yet.").
- "Where the blocker started" follows a blocker across check-ins, stored without names and built once when a handoff changes. Every step must come from a real handoff on record, or nothing is stored. A reader gets only the steps from check-ins they may open.
- Also: a participant in a check-in that runs until the lead ends it now reads "Session 3. It runs until Wairimu Kamau ends it.", and the public API can create one.

**Decided for Hafsah to confirm: who sees a blocker's whole chain.** The prototype shows the Sales lead the whole chain, through Finance and Leadership. Under the rule the screens asked for, a reader gets only the steps from check-ins they may open, so the Sales lead, who cannot open Finance, sees only the Sales steps, and not where it started. I kept the more private rule. Widening it would show the Sales lead what was said in Finance's check-in.

**Request 37 done: a check-in can run until the lead ends it** (`9b49d0e6` to `e8ae6bbf`, 422 tests pass in its own specs and the public API). One field, `runsUntilEnded`, set at setup ("I will set this to run until you end it."). Such a check-in is never treated as having a last session, never says how far through it is, is never marked out of time, and the lead can end it at any session. The model is told there is no planned last check-in. Two gaps left: the public API cannot yet create one, only read it; and a participant would read "Session 3. It runs until you end it.", but only the lead ends it, so it should name the lead for them. That wording fix is next.

**Request 5 answered** (`3526935c`). Six of the eight names already match the prototype; "contract" and "recognition" stay in the other two by Hafsah's own earlier decision. The eight newer conversations meet the conversation standard, apart from two small points.

**Performance plans, promotions and renewals are now kept from admins without access** (decision 5, request 78; `3ef55e93`, `a59c74ae`, `ab8ae320`; 8,070 tests pass in grounds, reports, board, conversation, assistant, resolution, ask, suites, participants and public-api). This was a real gap: the one reading rule gave any admin full access to every check-in. Now, on these three kinds, an admin who does not run the check-in and did not set it up cannot open it or see it listed, anywhere: the check-in page, the board, every report, the outcome, and the setup routes. An admin who takes part in one reads it as a person in it does, never as the manager. Also done in the same pieces: request 75 (the success sentence says "People and setup", and "you" to the lead) and request 79 (a period count is true to the sessions held; the board serves the coaching that the session report already has, under the report's own privacy).

**Decided for Hafsah to confirm, from this fix:**
1. **Approval of these check-ins.** With organisation approval switched on, a lead who is not an admin sets up a performance plan, and an admin without access to it cannot see it to approve it, so it waits. I kept it walled, because even its name could say who it is about. If admins should approve without reading it, the approval can be shown with nothing but "a check-in about one person is waiting for approval".
2. **Appeals.** An admin still reads a suggestion once it is appealed, and decides the appeal (decision 6 says "An admin decides appeals"). On a performance plan that means an admin reads a verdict. I left it, because decision 6 asks for it.
3. **Each person's coaching note, for the lead.** The board now gives the lead what to ask each person, and each person their own coaching note. The lead does not get each person's own note, because the session report never gives it to the lead either.

**Pattern steadiness, on what people are actually shown (decision 68): 73%, short of the aim.** The same six-session conversations, read twice through the product's own five-read detector, so only the detector differs. Run A's conversations (sales, seniorhire, cofounder): 14 of 15 patterns shown the same, 7 of 8 people exactly the same. Run B's conversations of the same three scenarios: 8 of 15, 2 of 8 people exactly the same. Together: 22 of 30 (73%), 9 of 16 people exactly the same. I first wrote 93% from run A alone; run B shows that was too hopeful.

- **Every difference sits on the three-period line:** a pattern seen in two periods in one reading and three in the other, so it is shown in one and not the other. None is a pattern seen often in one and never in the other.
- **The patterns involved** are the ones that depend on history or sit close to a neighbour: "Problems are mostly put down to things outside the team" (B11, twice), "The same problem is raised again and never fixed" (K3), "A lot of communicating, nothing unblocked" (B5), "Decks and proposals instead of conversations with named buyers" (K1), "Plenty of planning, nothing written down to work from" (D4), "The inbox wins over the important work" (K4), and one good one, "Delivers what was agreed, with proof" (M1).
- **Between two separate runs** (the simulated people saying different things) it is 32%; most of that is the conversations differing.
- **Being built now:** the detector is given the person's own earlier record, so the history-dependent patterns are judged on what was actually said before rather than guessed. It is measured on exactly these two sets of conversations, and kept only if it is steadier and still finds as many real patterns. Not steady enough for release yet by the aim of 8 in 10.

**Night of 30 September, continued.**
- **The session restarted in the evening,** which stopped the local API, so the two six-session runs (decision 68) stopped partway. Each run finished three scenarios completely: sales, seniorhire and cofounder.
- **What people are actually shown, on those three: 32% the same between the two runs** (11 of 34 person-and-pattern pairs). This is far below the 7 in 10 of a single check-in, because over six sessions the differences add up: a pattern seen in three periods in one run and two in the other is shown in one and not the other. Two causes are mixed in it, the detector reading differently and the simulated people saying different things. The same stored six-session conversations are being re-read twice through the product's own detector now, to separate the two.
- **Which patterns waver, and why.** From 14 reads of each of 54 check-ins, the patterns that waver most are the ones that can only be judged across time or across people: "the same problem is raised again and never fixed" (K3) wavers on 9 of the 19 check-ins it appears on, "the team each name a different priority" (B9) on 6 of 8, and "the strategy is clear at the top and absent in the team" (F2) on 6 of 8. The detector reads one check-in and only the pattern codes seen last period, never what the person actually said before, so for these it guesses. The fix being built gives the detector the person's own earlier record (never a colleague's words) and a clearer line for each wavering pattern. No pattern is removed, merged or weakened.
- **Found and being fixed: performance plans, promotions and renewals were not walled from admins** (decision 5, request 78). The one reading rule gave any admin of the organisation full access to every check-in, including these three, apart from colleagues' exact words. A helper is making the rule itself keep them from an admin who was not given access.
- **Request 93 done** (`51e6aaa9`), and an empty file left by mistake removed (`5a40ed9b`).
- Hafsah's note of tonight: up to two helpers at once, never on the same files; pattern steadiness comes before the older requests.

**Three leftover items done** (`ac2380af`, `c5d1c3c8`, `7591ea8b`, 2,926 tests pass in patterns, reports and board). The coaching step for "Doing less than they used to, after a change" is now the person's alone ("One step they could take this week is to say what has got in their way since the change."), with the listening moved to the lead's sentence. "In session 3, the lead committed Tobi to ..." now names the lead, or says "you" to the lead. And the lead's judgement carries "Tobi has not been told about this goal yet, so talk it through with Tobi before reading anything into it." whenever it rests on a goal Tobi has not been told about; the screens have the new field.

**Decision 68 is running.** Two runs of the 14 scenarios that recur, six sessions each, started at about 20:50. The ten one-time scenarios are a single sitting by definition, so they cannot reach three periods. When both finish, the patterns each person would be shown are compared between the two runs.

**Request 92 done, all eleven points** (`ff12abb1` to `210251cc`, 4,941 tests pass across grounds, assistant, ask, documents, conversation and presentation). The file picker is offered to the lead of the chosen check-in; both word orders of "make the line private" work; a paste's list keeps its bullets; with a Yes/No offer the product's say-back is the only statement; clipped replies are sentences ("I have left it as it was. Nothing was changed."); a question the lead typed is kept word for word; "It should run for 13 weeks." is read only as a length, and after a No the conversation carries on; "I want to ask Amani whether ..." makes a question for Amani. The four live checks were run again on a fresh build and nothing slipped back. The paste, document and question paths are proven by tests, not yet live: the screens workspace runs its five checks again next. One test that failed once, a goal not yet told, passed five times in a row since.

**The screens workspace's privacy requests, first** (`dbcad575`, `ff4dd012`, `b6168149`, `8760e391`, 5,626 tests pass in board, grounds, documents, assistant and conversation). Merged their branch first (`54c032a2`, no conflicts).
- **Request 88, a real leak.** The board sent every colleague's contribution and coverage reads, with names and reasons, to a participant and to an admin who does not run the check-in. Now only the lead, or the admin who set the check-in up, reads everyone's; everyone else reads only their own.
- **Request 92, three more.** After a paste, the lead was told open decisions were "kept for you" while everyone could read them: every heading now says who will read those lines. Saying yes to a document's numbers wrote a note nobody had seen, which was also untrue: it is now said back first and true. Saying yes to a paste quietly rewrote what participants are told the check-in is for: that sentence is now said back first, and only then written.

**Decided for Hafsah to confirm: admins and the contribution and coverage reads.** Decision 5 lets every admin see every board. Decision 58 narrowed patterns for an admin who does not run a check-in. I applied the same narrowing to the contribution and coverage reads, because they say how much each person is checkably contributing, which is close to a judgement of the person. An admin who only reads now sees neither section. Please say if admins should see them.

**The setup conversation work is finished, and every API test passes.** The last round (`a52c8b0d`, `f6256b71`) makes a private note quote "Ben is struggling" rather than "is struggling", says "Ben's own check-in" rather than "their own", and makes a test that failed whenever the clock read :40 use fixed times. The full API run found one more thing, the new release-day migration test not stripping block comments, now fixed: 1,243 suites, 11,695 tests, all passing once that one is counted. Items 10, 11, 15 and 16 are recorded as proven live, through both doors, in `docs/context-chat-inventory.md` (`b5f61626`). The old context chat stays on until the screens workspace confirms Ask Groundwork's screens do everything live.

**The say-backs now read as plain questions** (`437a5821`, `e64e5509`, 1,865 tests pass). From the live run on both doors: Shall I record "the update in by every Friday" as what you expect of Ben? It is kept as your expectation, not as something Ben agreed to, and Ben has not seen it yet. The restated success is shown once: Shall I change what doing well looks like to "every stage has an owner and a next date", because the board kept going stale? The earlier version is kept. The old chat again quotes "the update in by every Friday". Last small round with the builder: a private note quoted as the fragment "is struggling" instead of "Ben is struggling", "their own check-in" instead of "Ben's", and a test that fails whenever the clock reads :40.

**Patterns: more reads do not reach 8 in 10. Needs Hafsah.** Through the product's own code, all twelve scenarios, each check-in read 14 times so different numbers of reads could be compared on the same reads. "Beyond the real ones" counts patterns kept that fewer than half of 12 earlier reads found.

| Reads, and how many must agree | The same | Real patterns still found | Beyond the real ones |
| --- | --- | --- | --- |
| One steady read | 60% | 65% | 28 |
| 5, at least 3 (built now) | 71% | 63% | 26 |
| 7, at least 4 | 69% | 62% | not counted |
| 7, at least 3 | 78% | 71% | 35 |
| 7, at least 2 | 77% | 76% | 54 |

- A stricter majority does not help: the patterns that flip sit right on the line, and raising the line moves the flip, not the steadiness.
- A lower bar with more reads gets closest (78%) but keeps more patterns most reads did not find, and costs seven readings a check-in instead of five.
- So the model's own variation sets a ceiling of about three in four for a single check-in, whatever the number of reads. Five reads with three agreeing (built, about 7 in 10, nearly twice today's 36%) stays in the work branches.
- **Not steady enough for release by the aim of 8 in 10.** Three ways forward, for Hafsah to choose:
  1. **Measure what people actually see.** A pattern is only shown after three periods, which filters out patterns that flicker. The scenarios are too short to measure this (only 6 of 37 people have three sessions). A longer run would say whether what people see is steadier than 8 in 10.
  2. **Accept about 7 in 10 per check-in** for release, with the three-period rule as the second filter.
  3. **Count close neighbours as one when measuring and showing**, for example "the same problem raised and never fixed" and "tasks described without what they are for". No pattern would be removed, but it changes how patterns are grouped, which is Hafsah's decision (decision 55).
- My recommendation: 1, then 2 if it holds.

**The live checks for items 10, 11, 15 and 16 ran** (the old context chat and Ask Groundwork, the same words on both). They found six faults, now with the builder:
1. **Ask Groundwork opened from a check-in with nothing typed yet returned an error.** The empty message reached the model, which refuses empty input. This is from yesterday's decision 65; its test used a stand-in model that accepted it.
2. **In Ask Groundwork, the second message of a setup conversation lost the conversation.** Ada answered "He has missed the last two pipeline updates. I spoke to him once. I want the update in by every Friday." and read "I cannot find "the update" on this check-in." The old chat carried on correctly.
3. **Item 15 fails on the old chat too.** A check-in that already holds its length and rhythm opened with "Hello, I'm here to help you set up your Groundwork check-in." and said nothing about what it holds. It did not ask again for what it has.
4. **The chat says it will record something and records nothing.** After "Ben should be more proactive." the old chat said "I will record this as your read of Ben", and nothing was saved. Item 10 says the lead's read of a person is kept as a private note only the lead sees; it will be offered as one, and a sentence promising to record something without an offer in the same turn will be dropped.
5. **What was said back is not always what was saved.** Said back "want the update in by every Friday", saved "the update in by every Friday". The lead must get on the record exactly what they agreed to.
6. **Item 16 fails on both doors.** "Change what good means ... because the board kept going stale." was answered "I cannot find "what good means" on this check-in." Restating success with a reason does not work in the chat at all.

What worked: a lead saying someone is struggling was asked what they had seen, tried and want, on both doors; "I expect Ben to close 3 renewals by the end of December" was said back and kept as the lead's expectation, unseen by Ben, on both doors; a wish with nothing checkable ("more proactive") was not kept as an expectation on either; the first success statement was kept.

**Patterns through the product's own code, all twelve scenarios: 70%** of person-and-pattern pairs the same across a scenario (46 of 66), and exactly the same patterns on 36 of 54 check-ins. Today's single read was 36%, so it is nearly twice as steady, but short of 8 in 10; the 80% measured earlier from stored reads was on the high side. **Not yet steady enough for release by Hafsah's aim.** Now measuring seven reads with four agreeing, through the same code.

**Decision 66 done** (`d9cf4224`). A note typed on the Context and resources tab now lifts the "nobody can be invited yet" block, the same as a private note, an expectation, a document or a long enough brief. A retired note does not. Only the tab's "Notes" section counts; strategy, how we work, still to decide and not settled lines do not, because the tab does not call them notes. The refusal's sentences are unchanged, word for word. 1,276 tests pass in the grounds folder.

**The model through Google's global address, for local test runs only.** The regional address the product uses (us-central1) times out from this Mac; the global address answers. The product already reads which address to use from one setting, `GEMINI_LOCATION` (`api/src/config/configuration.ts`, default us-central1). For local test runs I set `GEMINI_LOCATION=global` on the command that starts the local API and on the measuring scripts, and nowhere else. No file changed: not `.env`, not any key, not the code, not what the real product uses. To undo it, start the local API without that setting. With it, the model answered in 2.3 seconds while the regional address still timed out.

**Patterns: five steady reads by majority is built** (`a1455696`). Each check-in is now read five times at the steady setting, in parallel, through exactly the same filters and confirming call as before, and a pattern is kept only when at least three of the five reads keep it. If fewer than three reads come back (the model unreachable), nothing is written and the nightly sweep tries again. All 49 patterns and every rule about who reads them are unchanged. The cost is about five times the model calls per check-in, once, after the check-in ends. 153 pattern tests pass.

**The model went unreachable again at about 15:00**, the same network fault as this morning (the regional address times out; nothing to top up). Two things wait for it, and are ready to run:
- the steadiness measurement through the product's own code (`PRODUCT=1` in `api/journey/the-detector-read-twice.ts`);
- the live checks for items 10, 11, 15 and 16 through both the old chat and Ask Groundwork (`api/journey/the-four-live-checks.ts`).

**Found while setting up the live checks, not yet changed:** the refusal to invite anyone says "add a document or a note on the Context and resources tab", but a shared note typed on that tab does not clear it. Only a private note, an expectation, a document or a long enough brief do. Either the sentence or the rule is wrong. This is for Hafsah, because the rule decides what counts as saying what a check-in is for.

**Patterns, second round: five steady reads by majority reaches 8 in 10.** The same 50 check-ins, read 16 more times each. "Real patterns" here come from the first round's 12 reads, so they are independent of the reads being judged.

| Way of reading | The same | Real patterns still found |
| --- | --- | --- |
| One steady read | 57% | 68% |
| Three steady reads, most must agree | 65% | 67% |
| **Five steady reads, at least three must agree** | **80%** | **71%** |
| Steady with the smallest thinking budget, one read | 21% | 13% |

- **Chosen: five steady reads, keeping a pattern when at least three agree.** It meets the aim on the measure used all along (80% of person-and-pattern pairs the same across a scenario), and on 35 of 50 check-ins the patterns were exactly the same. It still finds real patterns at least as well as today's single read. No pattern is removed or weakened; every code, filter and confirming call runs on each of the five reads.
- **Ruled out:** the smallest thinking budget, because it stops finding patterns at all.
- **The cost:** five readings of each check-in instead of one, plus the confirming calls for each. This runs once, after a check-in ends, never while someone waits.
- **Being built now.** Then measured again on the stored run-20 conversations through the product's own code.
- **Steady enough for release?** On these numbers, yes, just: 8 in 10 on pairs, 7 in 10 on exact check-ins, and the three-period rule adds more steadiness before anyone sees a pattern. The final answer comes after the measurement through the product's own code.

**Patterns, first round of measuring (the model answers again from about 11:40).** 50 check-ins from 12 run-20 scenarios, each read 12 times: 6 at the normal setting and 6 at the steady setting. "The same" means the person-and-pattern pairs two separate copies of a way of reading find across a whole scenario. "Real patterns" are the ones at least half of all 12 reads found.

| Way of reading | The same | Real patterns still found |
| --- | --- | --- |
| One normal read (today) | 36% | 63% |
| One steady read | 49% | 81% |
| Two normal reads, both must agree | 47% | 48% |
| Three normal reads, most must agree | 52% | 76% |
| Three steady reads, most must agree | 69% | 90% |

- Three steady reads, keeping what at least two agree on, is the best so far on both counts, and finds more real patterns than today's single read, not fewer. Nothing is removed or weakened.
- It is still short of the aim of 8 in 10. Even at its steadiest setting the model does not give the same answer twice, and the difference starts in its first reading (two steady readings of the same check-in share 60% of what they name), not in the second call that confirms a pattern.
- Keeping only what two normal reads both agree on is steadier but loses half the real patterns, so it is ruled out.
- A second round is running: five steady reads by majority, and the steady setting with the smallest thinking budget the model allows.

**Decisions 64, 61 and 65 done** (`47e392bc`, `fcb053e8`, `897c25b5`).
- **64.** The setup part of "how the leading is landing" was already showing after one period (restored on 29 September). What was missing is the access rule: it now follows decision 58, so the lead or the admin who set the check-in up reads it, and no other admin. The lead reads, for example, "One account describes a target of ten shops, and another describes a different one."
- **61.** Extra support is suggested when fewer than half of at least 6 settled commitments were kept. It is set by a migration that never overwrites a row someone already set. A fault was found and fixed on the way: a missing settings row was read as "nothing set" instead of the default. The admin page gets the label "At least this many settled commitments".
- **65.** When Ask Groundwork is opened from inside a check-in, the screen sends `openedFrom: "check_in_setup"` with the check-in, and the lead gets the setup conversation at once, even with an empty first message. A participant gets the ordinary answer. The screens workspace has the exact request in `docs/answers-from-engine.md`.

**Done while the model was down** (`0bfd0d04`, `4e7983c8`, `53621395`, `d55bdf32`, `99fac00a`):
- **Decision 62.** The migration now starts every existing pattern's clock on the day it runs: nothing is readable by the lead on release day, the person is shown theirs first, and the lead's 3 and 7 days count from then. The release questions list it as changing data, and the edit was accepted this time.
- **Decision 63.** One rule decides who may confirm setup: the lead, or an admin of the same organisation once the lead has left it (the account is switched off, the same sign decision 53 already uses). It covers the length, rhythm and success, lines, private notes, sharing a note, questions for people, and success restated, on the old chat and in Ask Groundwork alike. This also narrows things: before, any admin could add or change a line or a note at any time. When an admin confirms in the lead's place, the line, note, question card or success version carries the sentence, for example "Ngozi Bello confirmed this because Tunde Ade has left the organisation." A new migration adds that one empty column to three tables and changes no data.
- **Needs Hafsah, small:** the sentence is not added inside the person's own check-in when the confirmed question is asked, because it would sit inside what should read as an ordinary question. It shows everywhere the confirmation itself is read. Say if you want it in the check-in too.
- **Decision 60, point 4.** In an evaluation check-in, an admin without access to that check-in no longer gets colleagues' exact words on the session report, the team report or the board. An admin who set the check-in up still does, as the manager does. The same access rule as decision 58.
- **Two guard tests** had been failing since the document write moved into one shared file this morning. Both now look in the new file; neither rule changed.

**Order of work.**
- **While the model is down:** 62, 63 and point 4 of 60 are with the builder now. Then 64, 61 and 65, and the tools to measure patterns read several times and by majority, ready for when the model answers.
- **Once the model answers, patterns first:** measure the steady setting and the majority reading, keep whichever is steadiest while still finding real patterns, aiming for the same conversation giving the same patterns at least 8 times in 10, and say whether patterns are steady enough for release. Then the live checks for items 10, 11, 15 and 16.
- The old context chat stays on until the screens workspace confirms Ask Groundwork's screens do everything live.

## 30 SEPTEMBER, MORNING: HAFSAH'S FIVE STEPS (the old chat stays on, patterns, the disagreements, week 10)

### Step 2, the fix

I built the fix and could not measure it live, so it is not switched on. Here is exactly what happened.

The two detector calls (the extraction in `analyzeCheckIn`, and the confirming call in `confirmDetection`) can now both be asked for the model's steadiest setting, temperature 0 with a fixed seed, through a small options argument added to `respond()` and `extract()` on `AnthropicService`. Nobody is asked for it by default; every other caller of those two methods keeps the model's own default sampling, exactly as before. The measurement script, `api/journey/the-detector-read-twice.ts`, gained a `STEADY=1` mode that reads run-20 twice at the steady setting instead of the default, and a `RECALL=1` mode that, for each check-in, does five reads at the default setting plus one steady read, and checks the steady read against the consensus of the five (a code counts as "in the consensus" when at least 3 of the 5 default reads kept it).

I could not run either measurement. This sandboxed session can reach the general internet and several Google hosts, including the plain `aiplatform.googleapis.com`, but every call this app makes to Gemini goes to the regional host the product is configured to use, `us-central1-aiplatform.googleapis.com`, and every attempt to reach that host from here timed out trying to connect, on repeated tries over several minutes, with nothing else about the network looking wrong. I ran the plain default-only read-twice script first, which needs no new setting at all, and it failed the same way partway through: it reached Gemini successfully for a while and then stopped being able to, for the rest of the run. That is a property of this sandbox tonight, not of the code or of Gemini itself, and I did not work around it by changing which regional endpoint the product talks to, since that is a real product configuration decision, not a fix for a sandbox limit.

So the numbers asked for in step 2a and step 2b are not in this report, because I do not have them and will not invent them. What is ready: the plumbing, both script modes, and three kinds of tests that do not need the live model at all, proving the mechanism is correct and that nothing already true was broken.
- `respond()` and `extract()` send no `temperature` or `seed` to Gemini unless a caller passes them, and send exactly what is passed when it is (`api/src/modules/conversation/anthropic.service.spec.ts`).
- `confirmDetection` forwards the same behaviour: nothing extra by default, the steady options through unchanged when asked for (`api/src/modules/patterns/the-detector-is-steady.spec.ts`).
- With a stub model that returns the same detections twice, `analyzeCheckIn` writes the same (person, code) set both times, and all 49 codes (8 positive, 3 carrying, 38 bad-faith) are still in the library, still in the schema the model chooses from, and still named in the prompt. Nothing was removed, hidden, or made harder to reach.

This is a "stop and ask Hafsah" moment in the sense the instructions describe: an engine-value number (steadiness) has a measured baseline (39% on run-20) and a fix that cannot be proven better without network access this session does not have. Whoever runs next with a working connection to Gemini can run, unchanged:
```
DATABASE_URL=postgresql://hafsahjumare@localhost:5432/gw_pw9_1786222102 STEADY=1 \
  npx ts-node -T journey/the-detector-read-twice.ts all-24/run-20
DATABASE_URL=postgresql://hafsahjumare@localhost:5432/gw_pw9_1786222102 RECALL=1 \
  SCENARIOS=sales,seniorhire,pip,loans,handover,advisor,board,crisis,drift,project \
  npx ts-node -T journey/the-detector-read-twice.ts all-24/run-20
```
and read the printed numbers against decision 2c: keep the steady setting only if steadiness is clearly higher and the steady read's recall against the five-read consensus is at least as good as a single default read's own recall against that consensus (the script prints both). If it fails on recall, try the extraction call alone at the steady setting with the confirming call left at default, which the script also supports by editing which calls receive `PATTERN_DETECTION_STEADY_OPTIONS` (currently both, in `readOnce`).

**Requests 84, 83 and 81 are done** (`12777e64`, `78b139c4`, `4aa45ed0`, `2efd92cc`).
- **84 (decision 58):** one rule now decides who reads a pattern or the person's answer. It is the check-in's lead, or the admin who set that check-in up for them, and nobody else. An admin who did neither used to get patterns on the board and on the check-in page; they now get none. A test serves the board and the check-in page as each reader, and the session report and the probe list use the same rule.
- **83:** already fixed before tonight. The lead's description of a person reaches the lead alone on all four routes, and a person's own words go to their own job title.
- **81:** the test still checked the old pattern shape and now checks the served one. That is the only reason it changed.

**Step 1: the old context chat stays on.** Nothing switches it off until the screens workspace has built Ask Groundwork's document and confirmation screens and confirmed live that everything works through them. What those screens must show is now in `docs/answers-from-engine.md` (`2eb5fd42`).

What was proven through Ask Groundwork, and what was not:
- **Proven live, same result as the old chat:** the target a paste sets, and its number; who sees targets; lines typed directly; the lead's private notes; the refusal to share a note about a person; exact questions confirmed, reworded and left waiting; an admin refused at "Yes"; a document's text with the bank detail hidden; a document arriving private; the length and rhythm said back.
- **Proven in tests only, not live:** a participant typing setup words gets nothing said back and nothing saved.
- **Not proven, and found missing:** numbers read out of a document added through Ask Groundwork are never said back, so they can never be saved. The old chat takes them when the lead answers "yes" to the sentence "Here is the context we have from ...", which only the Context page shows. This is being built next.
- **Not tested through Ask Groundwork yet:** that a target lands on the right person (the live check matched the number but did not print whose it is); a change to a line already on the record (item 7); a lead saying someone is struggling (item 10); an expectation of a named person (item 11); a colleague's private document staying out (item 12); a colleague asking about someone else's number (item 13); opening on what is already there (item 15); success restated with a reason (item 16); bank details in a message (item 18, the message is cleaned at the door, not yet shown live); a paste sent twice, and two people with the same first name (item 21). These are the next helper's work, after requests 84, 83 and 81.

**Step 1, the gap closed: a document's numbers are now said back in Ask Groundwork** (`58960b6d`, `a17f61c1`, `5c7963f2`, `6eec35aa`).
- After a document is added, Ask Groundwork says back what it holds, by name, and asks before saving. From the test: "Dayo Adebayo's target for Q3 sales is 45m." and "For everyone in this check-in, the target for New dealers is 12.", then "Shall I record these numbers on this check-in?"
- "Yes" saves them through the same code the old chat and the check-in use (now one shared piece, not three copies). "No" saves nothing, and a second "yes" saves nothing twice.
- New tests through Ask Groundwork: a participant typing any setup message gets nothing said back and nothing saved; a pasted target lands on the named person, a team number on nobody, and two people with the same first name on neither; a change to a recorded line waits for a yes; a colleague is not told someone else's number; a bank number in a message never reaches the model or storage; the same paste confirmed twice is saved once. 2,063 tests pass in the four folders.
- Still to check live, because they live only in the model's instructions: a lead saying someone is struggling, an expectation of a named person, opening on what is already there, and success restated with a reason. These wait for the model to be reachable.
- **Fixed:** a document's own description could be a fragment ("A Q4 sales target sheet."). It now reads "It looks like a Q4 sales target sheet.", and a description that is already a sentence is kept as it is. The same guard now covers the short points on a document's card on the Context page (`563d4f56`, `5e56d16e`). The instruction to the model asks for a full sentence too, and no stored version can override it.

**Step 2: why patterns repeat so little between runs. The detector itself is unsteady.**

I gave the detector the same stored conversations from run-20 twice, with no new scenario run: 87 check-ins, each with exactly the same input both times, the same filters, and the same second call that confirms a pattern. Nothing was written.
- The two reads named exactly the same patterns on only 31 of the 87 check-ins.
- Across whole scenarios, only 58 of 150 person-and-pattern pairs were found by both reads. That is 39%.
- Between run-19 and run-20 it was 15%.

So the same words, read twice, give the same patterns only about 4 times in 10. That is most of the problem. The simulated people saying different things each run takes it from about 4 in 10 down to about 1.5 in 10: the detector explains roughly 60 of the 85 points lost, and what people say explains the other 25 or so.

The patterns that flip most are the ones whose meanings sit close together: tasks described without what they are for (K5), the same problem raised and never fixed (K3), good ideas and not much built (F1), and problems put down to things outside the team (B11). The cause is that the detector call runs at the model's default randomness, so each read samples slightly differently among 49 overlapping descriptions.

The fix is next, after the current builder: read the patterns at the model's steadiest setting with a fixed seed, and measure it on both counts. It has to be steadier, and it must still find what a consensus of five ordinary reads finds, because an earlier measurement showed that a steadier setting can make judgements consistently wrong. No pattern is removed or weakened. A test will check that the same input gives the same patterns. The script is `api/journey/the-detector-read-twice.ts`.

**Why the model has not answered since 08:45: the network on this computer, not a limit, billing or a key.** Nothing comes back at all: no status code and no message, because the connection never opens. A usage limit, quota, billing problem or dead key would each answer with a refusal (429, 403 or 401) and a message; none arrives. This computer cannot open a connection to the regional address the product uses (us-central1-aiplatform.googleapis.com), nor to the European one, while it reaches google.com, Google's status page, GitHub, and Google's global address normally. Google's status page shows no open incident. So something between this computer and Google, most likely the Wi-Fi router (192.168.68.1) or the internet provider, is dropping connections to part of Google's addresses. Nothing to top up. What would help: restart the router, turn off any security or filtering feature on it, or connect this computer to another network such as a phone's hotspot. No key or setting was changed. A check tries the address once every 15 minutes and restarts the measurements when it answers.

**Step 2, waiting on the model.** At 08:45 the regional address the product uses to reach the model (us-central1) stopped answering from this computer; an hour earlier the first measurement ran through it without trouble. Both new measurements (steadiness at the steady setting, and whether it still finds what five normal reads agree on) read nothing, so there are no numbers yet. The steady setting is built but switched off, and stays off until those numbers exist. I did not change which address the product uses, because that is a setting I may not touch. The measurements rerun as soon as the address answers again.

**Step 4: the thresholds for week 10, explained. Nothing is set.**

A suggestion about a person can only be reached when a threshold is set for it, and none is set. Each threshold has two numbers.
- **"Kept below"** decides how often a person must be keeping their commitments before Groundwork stays quiet. For example 0.6 means: if they kept fewer than 6 in 10, a suggestion is reached.
- **"Over periods"** is misnamed: it is really how many commitments must have been settled, kept or not, in the last four weeks before the share is read at all. With too few, one missed commitment would swing the share wildly.

Only "extra support" can be reached today. Keep, reward, a plan and exit have no reading of the record built yet, so a threshold set for them does nothing.

My recommendations, for Hafsah to decide:
- **Support: kept below 0.5, over at least 6 settled commitments.** Half is a clear line a person can see on their own board, and six is roughly three check-ins of two commitments each, so one bad week cannot reach it. A lower bar (0.4) would miss people who need help; a higher one (0.7) would reach people having an ordinary month.
- **Keep, reward, plan, exit: leave empty.** Set them only once each has a reading of the record built and tested. Plan and exit most of all, because they are the least reversible.
- **Rename "over periods" to "at least this many settled commitments"** on the admin page, so whoever sets it knows what it counts.

## SUMMARY OF THE NIGHT, 29 TO 30 SEPTEMBER (read this first)

**Every decision Hafsah sent tonight is recorded in `docs/decisions-merged.md`, as decisions 44 to 57.** Clarifications were also added to decisions 4, 5, 6, 9, 12, 17, 21 and 27.

### Finished and pushed

- **The warm-up runs once** (decision 44), proven live. The board warmed 9 times for nine check-ins, where it used to warm 18 times.
- **Screens request 77.** A person's own words are never removed by the hidden-target filter. Only a private file's name is hidden.
- **Screens request 76.** Each check-in stores its kind of work, and each kind gets its own records on the board: deals and stages, releases, tickets, deadlines and so on.
- **The pattern names are approved and patterns are switched on** (decisions 52 and 55).
  - Every rule holds live: three periods, the person first, no colleague sees another person's, and E4 and F5 reach nobody.
  - The wording around each pattern is fixed in place.
  - Nothing protected is still switched off, hidden or simplified.
- **The provisional decisions confirmed, with Hafsah's four changes:**
  - An admin can share the report if the lead has left.
  - An admin who cannot see a target reads only "has checked in".
  - A decision about a person is a field the lead sets.
  - Week 10 is done the more private way: the person sees the suggestion first, and the manager gets a line with no count. It needs a threshold before any suggestion is reached, and none is set.
- **An untold goal follows the prototype** (decision 56).
  - The lead sees "Not told yet" and is nudged.
  - The model asks about the area of work, never the number.
  - After a week the person is told a goal exists.
  - Checked twice: the number never reached the person.
- **Evaluation check-ins.** The person being reviewed sees the facts and the decision, never a colleague's exact words.
- **Decision 57, all nine points:**
  - a period is at least a week;
  - the lead marks a pattern right, wrong or not sure, is nudged once, and marks "we talked about it";
  - the number-based rules are a second source of evidence;
  - a role guessed with low confidence is confirmed first;
  - coaching is on by default;
  - "setup never said" is back;
  - later check-ins count periods;
  - self-learning is added early, as week 8b.
- **One chat.** Ask Groundwork can now do everything the context chat does, by calling the context chat's own code.
- **Privacy fixes found along the way:**
  - Ask Groundwork could hand back a colleague's hidden target.
  - An admin could read the lead's private description inside the judgement.
  - A person's own role, typed at joining or in a check-in, was written into the lead's private field.
  - A quote could be the model's words rather than the person's.
- **The screens workspace is told** what they will receive, in `docs/answers-from-engine.md`.

### Tests and runs

- **The whole API suite passed at the end of each finished piece.** The last full count was 1,229 files and 11,426 tests.
- **Run-20, today's one full run: nothing worse than the baseline.**
  - Every problem count is 0.
  - Commitments recorded: 70, against 33 at the baseline.
  - Agreements found: 71, against 56.
  - Proof asked for: 51, against 42.
- **Watch:**
  - specific detail asked for is 85, against 88, inside its usual swing;
  - jargon in reports and boards is 141, above the bar of 128.
- **Quick checks after every run:**
  - quotes are word for word, after tonight's fix;
  - none of the lead's private words reach anyone, apart from one false alarm, which is explained;
  - the reports match the database.

### The most important finding

**Patterns are not steady from run to run.** Across all 24 scenarios, only 15% of the person-and-pattern findings in run-19 appeared again in run-20. The lead's marks and self-learning are built to work on this, but the detector itself, and what the test personas say, should be looked at before patterns reach anyone live.

### Needs Hafsah

1. **Switching off the old context chat.** Everything the doors decide matches in the live proof. Two differences remain, both the model reading a success statement differently. On your word it is switched off.
2. **The six disagreements between decisions**, listed under Hafsah's second set of answers, each with how it is being handled.
3. **The release questions** in `docs/ready-to-deploy.md`. The safety check refused my edit because of a name in the command. The corrected content is in this report.
4. **Week 10's thresholds** are empty, so no suggestion is reached until you set them.

---

## HOW THE ENGINE WORK RUNS NOW (Hafsah, 29 September, evening)

Hafsah wants the engine work done much faster. Every session keeps to this:
1. **Tests:** while working, run only the tests for the files changed. Run all the API tests once at the end of each finished piece of the weekly plan.
2. **Scenario runs:** only when a change affects what the model is given or what it writes (the conversation, reports, boards, judgements). For storing data, new fields and plumbing, such as request 76, use tests and one live try instead.
3. **Re-runs:** re-run an affected scenario once. Run it a second time only for a prompt or judgement change, or when the first result is borderline.
4. **Full runs:** group several small pieces into one scenario run. At most one full 24-scenario run a day, to prove the day's work together.
5. **Quick checks after every run:** quotes are word for word, none of the lead's private words reach anyone, and reports match the database.
6. **While a run or a helper works,** prepare the next piece.
7. **Models:** Sonnet 5 for the builder, and Opus 5.5 for the main session and anything that reads judgements, such as the reviewer.

One helper at a time, and a helper never starts helpers of its own.

The safety check refused saving these rules to Claude's own memory folder, which is protected. So they are kept here instead.

---

## 29 SEPTEMBER, NIGHT: HAFSAH'S SECOND SET OF ANSWERS

All recorded in `docs/decisions-merged.md` (`2dfec86f`):
- **Decision 52:** the pattern names, approved with eight reworded.
- **Decision 53:** the 29 provisional decisions confirmed, with four changes.
- **Decision 54:** existing check-ins are not reopened by a migration.
- **Clarifications** to decisions 4, 5, 6, 9, 12, 17, 21 and 27, where the old and new decisions disagreed. Each is marked "clarified 29 September".

### Run-20, today's one full run: nothing worse than the baseline, with three things to watch

All 24 scenarios, in 92 minutes, on `d1f7fa74`. **The scorer's verdict is "nothing got worse than the baseline".**

| Number | Baseline | Run-19 | Run-20 |
| --- | --- | --- | --- |
| Every problem count | 734 and more | 0 | 0 |
| Proof asked for | 42 | 47 | 51 |
| Past words brought back | 25 | 33 | 31 |
| Specific detail asked for | 88 | 105 | 85 |
| Blocker checked | 37 | 45 | 39 |
| Agreements found | 56 | 66 | 71 |
| Commitments recorded | 33 | 49 | 70 |
| Patterns found | 100 | 112 | 100 |
| Judgement present | 21 | 29 | 29 |
| Turns asking two questions | 37 | 0 | 2 |
| Jargon in Groundwork's turns | 42 | 21 | 28 |
| Jargon in reports and boards | 511 | 126 | 141 |

Three things to watch, not hidden:
- **Specific detail asked for is 85**, against 88 at the baseline. It is inside the range this number moved on the same build in the re-checks (74 to 105), and the scorer passes it.
- **Two turns asked two questions** (run-19 had none). Both are closing turns: the model's reply still asked a question, and the prototype's close was added after it. For example: "What will you do about getting those bank statements, and by when? That's all for today. Below is what I wrote down…". This is a fault from tonight's close fix, and it is being fixed now.
- **Jargon in reports and boards is 141,** above the bar of 128 set in task 1.4. Most of it last time was people's own words said back to them (decision 41), which the scorer cannot tell apart. It needs a look.

**Quick checks:**
- **Quotes: 598 of 604 are word for word. 6 are not.** All six are in the lead's commitments over time. Tonight's new sentences for how a commitment was settled put the model's own write-up of the commitment in quote marks, as if it were the person's words. One was not even a time: "lead that review with the team". This is being fixed now.
- **The lead's private words:** the only flag is seniorhire's shared sentence, the same one found earlier. It is not a leak.

**Pattern steadiness, run-19 against run-20, all 24 scenarios: 15%.** Only 26 of 143 person-and-pattern findings appeared in both runs. The steadiest were seniorhire (44%), shock (43%) and realign (40%). Seven scenarios had none in common. This confirms the finding from the smaller runs: patterns change a lot from run to run.

### Decision 55: every place the protected parts were switched off, hidden, simplified or removed

A builder searched the code and the history since 15 September across patterns, coaching, role maps, role detection, board reads and the check-in's questions. **Nothing is still switched off, hidden, simplified or removed.**

| What | How it was off | Now |
| --- | --- | --- |
| Patterns | One constant, `PATTERNS_ARE_SERVED`, set off on 27 September until the names were approved | On (`19cdf9b0`), with every rule kept |
| "Setup never said" | The board applied the three-period rule again to a reading that only ever has one period, so it never reached a board | Restored for the lead (`eea057c8`) |
| Coaching | A missing setting read as off, so coaching was dark on every new database | On by default, and an admin can pause it (`b2d6395f`) |
| Confirming a low-confidence role | Built, but not wired, and with nowhere to store the answer | Finished (`25c2761a`, `daa83475`) |

Allowed, because they keep the feature (decision 55's own exception):
- E4 and F5 are never named to either person.
- The coaching note no longer repeats the lead's words to the person.
- The reading of how the check-in is led goes to the lead only.

The ten patterns with no number-based rule are found by the model, by design. That is not switched off. The document setting `CONTEXT_ENABLED` is not one of the four protected parts.

### One chat: Ask Groundwork takes over the context chat, piece 1 (decision 50)

Built in `f978d3cf`. **The old context chat still works, untouched, and stays until every item is proven.**
- **Ask Groundwork has a lane for adding context to a check-in.** It calls the context chat's own code, not a copy, so the rules are the same by construction:
  - what is pulled out is said back and confirmed before it is saved;
  - hidden targets and private documents stay private;
  - bank details are hidden.
- **Who may use it is unchanged.** The lead or an admin may hold the conversation, but only the lead may confirm a change. The test the inventory said was missing now pins this. A participant, a guest, or an admin of another organisation never reaches the lane.
- **Which check-in:** it uses the one chosen, the one named, or the only one the person may set up. If it cannot tell, it asks.
- **What is said in this lane is not kept in the person's private Ask Groundwork history.** The context chat keeps none today either.
- **A gap found and fixed:** Ask Groundwork worked out which check-in a question was about, then never passed it on.
- **Proven so far** (see "Comparison, item by item" in `docs/context-chat-inventory.md`): 3 items with new tests, and 12 by construction. That is not yet the live proof Hafsah asked for.
- **Piece 2 is being built:**
  - the exact question for a person, the lead's private notes, and typing a context line, through Ask Groundwork;
  - carrying on a setup conversation over several turns;
  - "Context and resources" in the engine's own sentences;
  - a script that puts the same documents and messages through both and compares everything saved. It runs after run-20, because the API is busy.

**Piece 2 is built** (`ef2452c2`, `ae6b962b`, `74ecb622`, `51b0ee4d`):
- **Through Ask Groundwork,** each by calling the existing code:
  - the exact question for a person, lead only, said back word for word before it is sent;
  - the lead's private notes, always private, and never guessing whose note it is when a name is unclear;
  - typing a line of context directly.
- **A setup conversation carries on over several turns.** A bare "twelve weeks" now answers the question it was given.
- **"Context and resources"** is how the engine now names the page in its own sentences: two refusals, the document message and the lead's invitation email.
  - One of these renames is in the instructions the setup chat's model is given. The 24-scenario runs do not go through the setup chat, so no scenario run can measure it. It only changes the page's name in a sentence the model is told to say.
- **The live proof script,** `api/journey/context-chat-equivalence.ts`, is written and runs after run-20. It puts the same message, paste, line, note and document through the old context chat and through Ask Groundwork. Then it compares the saved rows in the database, item by item.
- **Piece 3 is being built:**
  - the say-back sentences are still clipped and joined with colons, for example "Add this to the check-in's context, as a decision: …? Yes to add it.";
  - sharing a note, and changing a line, are still only in the old chat;
  - changing the wording of a lead's question in chat is still to do.

**Piece 3 is built** (`4a87183e`, `0e88b0d5`). Every item the context chat does can now be done through Ask Groundwork, each by calling the old code:
- **The say-backs are full sentences.** For example: "Shall I add "we will drop the pilot" to this check-in's context as a decision?" and "Shall I keep "keep an eye on Ben's workload" as a private note that only you can see?"
- **Sharing a note with everybody works through chat.** Only a note about the whole check-in is offered, so a note about one person is never shared.
- **So do rewording, sharing, making private or retiring a line.** A line about a person has no way in.
- **The lead can change the wording of a question.** "ask Ben 'How are the Lagos numbers looking?' instead" is said back word for word, and sent only on a yes.
- **A routing fault is fixed.** "share the note…" was being read as adding a document.
- **One test** still expected "Context tab" after the rename, and now expects "Context and resources". The list of people waiting reads "Ben and Ada", not "Ben, Ada".
- **Left:** only the live proof, which runs after run-20. The old context chat stays on until it passes.

**The live proof ran end to end, and it is not proven yet. The old context chat stays on.** The script puts the same messages, paste, lines, notes and document through the old context chat on one fresh check-in, and through Ask Groundwork on another. It then compares what the database holds.
- **Match:**
  - the lead's private notes, including which one stays private;
  - the refusal to share a note about one person, word for word;
  - the document keeping its target with the bank detail hidden;
  - the document staying private to the lead;
  - the check-in's hidden-target setting;
  - a line retired on both sides.
- **Mismatch, 10 items.** They look like three kinds, and each is being sorted with evidence:
  - **The script fed the two sides differently.** For example, on the old side none of the questions ended up confirmed, and the admin's refusal was not recorded.
  - **The model wrote the text differently each time.** The exact question's wording and the context lines taken from a paste differ between runs, so they must be compared by kind, owner and state rather than word for word.
  - **Possibly real differences between the two doors, which I will not paper over.** Through Ask Groundwork, "This runs for twelve weeks" was recorded as what doing well looks like. A proper success statement became three measures, where the old chat recorded one statement. "Good." got a clarifying question, where the old chat refused it.
- Three faults in the script itself were found and fixed on the way: capital letters in email addresses, a missing organisation membership, and a missing field on the check-in request.
- **Sorted with evidence, the ten differences are all the script's own doing, with no real product difference found yet:**
  - The script created the test check-ins with the duration and cadence already filled in. So the setup answers landed on whatever question was actually open, differently on each side.
  - It added an opening phrase to the messages on the Ask Groundwork side only.
  - It looked each person's question up by first name, but the full name is served, so on the old side the confirms, and the admin's refused confirm, never ran.
  - The exact question's wording and the lines taken from a paste are written by the model each time, so they now compare by kind, owner and state.

  The script is fixed for all of these and is running again. The three differences I suspected in the product came from the first cause. The next run will show whether that holds.

**The corrected proof run** (`eda630f6`; the full output is in `docs/context-chat-inventory.md`).
- **These now match on both doors:**
  - targets and who sees them;
  - the three typed context lines, reworded, made private and retired;
  - the lead's private notes, and the refusal to share a note about one person, word for word;
  - each person's exact question: confirmed as shown, confirmed with the lead's own words, and left waiting;
  - an admin who is not the lead being refused, word for word;
  - the document's content, with the bank detail hidden, and its visibility;
  - the setup answers for how long it runs and how often.
- **Two differences remain, both about what doing well looks like, and neither is a difference between the doors:**
  - The same success statement was kept with different opening words, "Good means…" on one side and without it on the other. The model chose a different starting point for the same quote.
  - A success statement too short to record was refused on one side and not the other. Proposing and confirming are two separate model reads by design, and on a borderline input they can disagree.
- The lines taken from a pasted update differ in number of each kind, as expected, because the model writes them fresh each time.

**Needs Hafsah: switching off the old context chat.** Decision 50 says to switch it off once every item is proven. Everything the doors decide matches. The two differences above are the model varying, not the doors. But switching it off removes a working feature the screens use, so I have not done it on my own reading. On your word it is switched off, and the screens workspace is told in `docs/answers-from-engine.md`.

**The two fixes from run-20's checks hold, on one re-run of sales and renewal:**
- **No closing turn asks a question.** There were 2 on run-20.
- **95 of 95 quotes are word for word.**
- **Scores:**
  - Sales stored 9 commitments. Run-20 stored 23, but across ten runs sales has stored between 5 and 23, so this is normal.
  - "Specific detail asked for" in sales was 19. That is below anything sales has had before (22 to 36), which is borderline, so under the working rules sales is being run a second time before the fix is counted as kept.
- **The second sales run settles it:** specific detail asked for is 29, inside its normal range, so 19 was a low draw. No closing turn asked a question, and 12 commitments were stored. **Both fixes are kept.**

### Decision 57, part C: steadiness, a second source of evidence, and confirming a role

**How steady patterns are: not steady.** This is the most important finding tonight. A new read-only script, `api/journey/pattern-steadiness.ts` (`e9e6edae`), compares which person got which pattern across two runs of the same scenarios:
- goals-1 against goals-2 (cofounder, drift, pip, seniorhire): 1 of 24 findings appeared in both runs, **3%**. Seniorhire 11%, the other three 0%.
- card3-1 against card3-2 (drift, handover, sales): 9 of 31 findings appeared in both, **23%**. Sales 39%, handover 17%, drift 14%.

So if the same check-ins were run again, a lead would mostly be shown different patterns. The three-period rule, the person-first rule and the lead's marks all hold, but what they are applied to changes from run to run. This is what self-learning (week 8b) and the lead's marks are for. It also argues for looking at the detector itself, and at what the scenario personas say, before patterns reach anyone live. I have changed nothing in how patterns are judged, because decision 55 says such a change is proven on the runs first and big ones go to Hafsah.

**What else is built:**
- **The lead's nudge** now reads in two sentences: "Brian has seen it. Brian said, “I ran the call, Miriam built the numbers.”" (`2f1e1125`)
- **The number-based rules now run beside the model** for every code that has one, over each person's scores by period (`e04260cd`). The model still decides what is written, and a rule alone never surfaces a pattern. Storing which source found each one, and telling the lead "Two separate reads of the record found this.", is being finished now.
- **A role guessed with low confidence** (below 0.5, the product's existing line for "confident enough to coach from") will be confirmed before it is used (`26c8765c`). Until then, only the general rules that do not depend on role apply, as today. The person's check-in will ask "It sounds like most of your work is sales. Is that right, or would you describe it differently?", and the lead can confirm or change it.

**Finished** (`cf0dd804`, `87092298`, `25c2761a`, `daa83475`, `f39940dc`; migration `20260930020000_evidence_and_a_confirmed_role`, applied to the local test database only):
- **Where each pattern came from is stored:** the model, the rule, or both. Only the lead is told "Two separate reads of the record found this."
- **The role question is asked once.** After the check-in, the person's answer is read: a clear yes confirms the guessed role, and a different description sets their own role. With no clear answer, the question is not asked again for two periods.
- **The person's own words about their role go into their own job title,** never into the field that holds the lead's private description of them (decision 30). The same mix-up was found on the open-link join and is being fixed now.
- A guard caught two checks for a missing lead that could never be true, and they are removed (`d1f7fa74`).

**The whole API suite passes: 1,229 files and 11,426 tests.**

**Run-20, today's one full run, started at 02:50** on `d1f7fa74`, in three parts. It covers every change since run-19 to what the model is given: the untold goal, the pattern label rewrite, periods in later check-ins, the role question, and the evidence notes.

### Decision 57, part B: the lead's marks on a pattern, and "we talked about it"

Built in `beffb44f` and `6aa62f9b`, migration `20260930010000_what_the_lead_made_of_a_pattern`, applied to the local test database only.
- **The lead marks a pattern "right", "wrong" or "not sure"** after talking it through (`POST /patterns/:id/mark`). The person's own answer is stored beside it, as evidence too. Only the lead can mark, and only once they may already read the pattern. The mark goes to the lead alone: the person the pattern is about never gets it, because it must not read as a verdict on them, and a colleague never gets the pattern at all.
- **The lead is nudged once**, in their Today list: "Talk with Brian about “Others describe doing work they described as theirs”." If Brian has not answered, it says so plainly. The nudge goes away when the lead marks "we talked about it" (`POST /patterns/:id/talked-about`). Both the lead and the person then see that they talked it through.
- **Whether things changed** is worked out from the record: how many later periods the same pattern was seen in after the talk. Nothing is decided from it.
- The screens workspace has the exact routes and fields in `docs/answers-from-engine.md`.
- **One sentence is being fixed in part C.** "Brian has seen it and said: “…”." joins with a colon and doubles the full stop.

### Decision 57, part A: periods, coaching on, "setup never said", and later check-ins

Built in `4ae4ace8`, `277844d4`, `4baa50d1`, `b2d6395f` and `eea057c8`.
- **A period is at least a week.** One function, `periodOf`, decides it. For a weekly or slower check-in each session is a period; for a daily check-in each calendar week is one. Everything that counts periods uses it: storing a pattern, what each reader is shown, the session report's cut-off, and coaching's "seen in two periods". For a daily check-in the person reads "This came up in 3 of your weeks.", where it used to list session numbers.
- **Coaching is on by default on every database.** A missing setting now reads as on. An admin can still pause it by setting it off.
- **"Setup never said" is restored.** One check already let it through, but the board then applied the three-period rule again and threw it out, so it had never once reached a board. It now reaches the lead, as a reading about the setup.
- **Later check-ins count periods too.** A pattern shapes a sharper question only once it has three real periods, gaps included. Before, good news steered a question after one session, and the "one question worth asking" after two.
  - **This changes what the model is given.** It goes into the day's one full run, together with parts B and C.
- **Left, and noted:** the rare check for two people covering for each other counts its periods its own way. It matters only on a daily check-in.

### Part 3: evaluation check-ins (decisions 4 and 17, as clarified)

Built in `fc2550a8`, `26f5e5a0`, `396459f7` and `20e7ef99`. **In an evaluation check-in, the person being reviewed reads the facts, and the decision with its reasons, never a colleague's exact words.**
- **Which check-ins count:** one rule decides, and it counts a performance plan, a recognition round and a contract renewal, the check-ins where a verdict is reached.
- **For the person being reviewed:**
  - A colleague's row in "what each person said" reads "A colleague's own words are not shown to you here. What was found, and the decision with its reasons, are below."
  - A colleague's quote in the team report's shared picture becomes "A colleague described this differently.", and the person's own quote stays.
  - A quote that cannot be matched to the person's own words is taken out, so the rule errs on the private side.
  - The same applies to the board's own words and to where people disagree.
- **The manager, an admin, and the colleagues who gave views** read everything as before. An ordinary team check-in does not change, and a test proves it.
- **Honest limit:** deciding whether a sentence still reads well once a quote is taken out is a rule of thumb. The colleague's words always go, but a sentence can read a little cut short.
- **Decided for Hafsah to confirm:** nothing in the database says which person a check-in is about. In a performance plan or a renewal there are only two people, so it is clear. A recognition round can add colleagues, so the first person added after the lead is taken as the one being reviewed.

### Part 2B: a goal the lead has not told the person about, as the prototype has it (decision 56)

Built in `5ee3c4b4`, `4886d2ed`, `f1ed931d`, `c542f51c`, `fb5da92f` and `7df73897`. Take Tobi's goal "Take over the scheduling and hit 40 stock counts by Friday", which Wanjiru has not told him about.
- **The lead** reads it marked "Not told yet". Their Today list says "Tell Tobi about the goal you set for the scheduling and the stock counts. You have not told Tobi yet." Wherever the goal counts against Tobi, on the Context page, Today, the team board or a suggestion, the lead also reads "Tobi has not been told about this goal yet, so talk it through with Tobi before reading anything into it."
- **The model in Tobi's own check-in** is given only the area of the work, "the scheduling and the stock counts", to ask about. It is never given the number or the deadline. If a reply still gives the number, or says that a goal has been set, it is caught and asked again once.
- **The area is worded once by the model, when the goal is saved,** and checked in code: no digit, number word, amount, percentage, date or target verb. Until it is worded, every reader gets "this part of the work", never the goal's own wording.
- **Tobi** sees nothing of it for a week. After a week he reads "Wanjiru has set a goal about the scheduling and the stock counts, and will talk it through with you." Wanjiru is reminded that he now knows a goal exists.
- **A colleague, or an admin who only reads,** never sees it.
- **The goal still counts.** Nothing had ever taken it out of how reports are built.
- **Not done yet:** the judgement's own text does not carry the conversation point. The week is counted from when the goal was made, because nothing records when it was marked "not told".

**It is being re-run now:** seniorhire, pip, cofounder and drift, the scenarios with the most untold goals, twice each. The first run started at 23:48 on `7df73897`. The pattern label rewrite from part 1 is in the same build, so these runs check both.

**First re-run, finished at about 00:10.**
- **The untold number never reached the person.** Pip's goal is "Consistently meet the eight renewals per quarter target". The person's check-in never mentions "eight", "8", the target, or renewals per quarter, from Groundwork or from them. The other three had no number in their untold goals, and nothing of them leaked.
- **Quotes:** 146 of 146 are word for word in the record.
- **Reports:** two copies are older than the database, not different from it. This is the run script taking its last copy early, as before.

**Scores on the same four scenarios, against run-19:**

| Number | run-19 | This run |
| --- | --- | --- |
| Specific detail asked for | 10 | 15 |
| Blocker checked | 3 | 5 |
| Agreements found | 16 | 19 |
| Proof asked for | 7 | 5 |
| Past words brought back | 19 | 14 |
| Commitments recorded | 19 | 13 |
| Patterns found | 22 | 20 |
| Jargon in reports and boards | 23 | 8 |

The rest are the same, and every problem count is 0. Four scenarios is a small sample, and these numbers move by this much between runs. The second re-run, started at 00:12, decides. If commitments or past words stay down, the change is dropped, as the rule says.

**Second re-run, finished at about 00:40, and the change is kept.**

| Number | run-19 | First re-run | Second re-run |
| --- | --- | --- | --- |
| Proof asked for | 7 | 5 | 9 |
| Past words brought back | 19 | 14 | 22 |
| Specific detail asked for | 10 | 15 | 14 |
| Blocker checked | 3 | 5 | 4 |
| Agreements found | 16 | 19 | 18 |
| Patterns found | 22 | 20 | 21 |
| Commitments recorded | 19 | 13 | 7 |

- **Proof and past words came back.** Only commitments stayed down.
- **The drop in commitments is almost all seniorhire:** 8 stored commitments on run-19, then 6, then 3. On older builds, before any of tonight's work, seniorhire stored 2 (run-14), 3 (run-16), 7 (run-18) and 2 (the earlier review run). So 6 and 3 are inside its normal spread, and it is the model varying, not this change. The other three scenarios hardly record commitments at all.
- **I kept the untold-goal change.** Seniorhire's count swings this much, so it is a poor measure on its own. The day's full run should show whether commitments hold across all 24.
- **Quick checks:**
  - 96 of 96 quotes are word for word.
  - The untold number never reached the person, again.
  - The script flagged seniorhire once more. It is Amina's own check-in sentence, "I brought him in to own the relationships with our five largest clients", shown to Tobi with one word changed. That is allowed.
- **A real wording fault it turned up:** Tobi reads "Dr Amina Bello brought in you to own…", which should be "brought you in". It comes from the step that swaps a name for "you" in a person's own report, the known weak spot of request 33 and task 1.6.

**A privacy leak the quick checks found, already there on run-19, being fixed now.** The lead's private description of Tobi reads "Engagement Director. Owns the relationships with the five largest clients." Tobi's own report and board say "Dr Amina Bello says you are here to own the relationships with the five largest clients." Nobody said that in any check-in, so it reaches his report through what the report writer is given. That breaks decision 30.

**Correction: it was not a leak.** Looking further, the same words are shared legitimately:
- in what Tobi was told when he was invited ("…owning relationships with the five largest clients");
- in the check-in page's aims;
- in a team target;
- in what Amina said in her own check-in ("He's here to own the relationships with our five largest clients.");
- and in what Tobi said himself.

My check script counted any match with the lead's private description as a leak. It now leaves out words that are also in something the reader may already read. With that, run-19 and the first re-run have no private words reaching anyone.

The builder's work on it keeps one real fix (`233041e1`). The coaching note about a person was given the lead's private description as that person's role. It was harmless only by accident, and it is now never given it. The builder had also added a read-side net that took out any sentence sharing six words with the description. That would have removed Tobi's legitimately shared sentences, so it is being narrowed to the same rule as the script.

**The read-side net is narrowed** (`590fbe20`). A sentence is taken out for a reader who is not the lead only when its run of the lead's private words appears nowhere that reader may already read. That means what they were told, the check-in's aims and targets, and what people said in their check-ins. So Tobi keeps his shared sentence, and a truly private phrase such as "struggles to take ownership without being chased" is still taken out.

**An admin no longer reads the lead's private description inside the judgement** (`71781c87`, decision 5 as clarified). The judgement is written with the lead's description of each person, for the lead. An admin who does not run the check-in still reads the judgement, but without any sentence that carries that description. The lead reads all of it, and a participant never gets the judgement at all.

**A test that failed under load now checks order, not the clock** (`c187ce59`). It proved the two reads of the lead's brief run side by side by timing them, and it failed when the machine was busy. It now checks that the second read starts before the first one finishes. It still fails if they run one after the other.

Tests: 608 files and 5,537 tests pass in reports, conversation and check-ins.


### Part 2A: sharing when the lead has left, the admin's line, and the decision field

- **If the lead has left the organisation, an admin can share the report** (`d8a4ebb1`). Everybody reads, for example, "Grace Otieno shared this report, because Rukia Mwangi has left the organisation.", on the report and in the email. While the lead is still there, only the lead can share it, as before.
- **An admin who cannot see a target reads only "has checked in"** (`badb332e`, `4390d671`). The line used to read "Aisha Otieno has checked in, and nothing here needs you this week."; it now reads "Aisha Otieno has checked in." No page yet sums up a whole check-in for an admin, so decision 47's "Nothing you have access to needs you this week." has nowhere to go yet. It will be used when such a page exists.
- **A decision about a person is now a field the lead sets** (`979b5e41`, migration `20260929150000_a_decision_about_a_person`, applied to the local test database only). The guess from the target's wording is removed entirely. Existing targets stay unmarked, because they are not guessed. A target marked as a decision about a person reaches only the lead, whatever the check-in's setting.

Tests: 697 files and 6,508 tests pass in the parts touched.

### Part 1: pattern names approved, and patterns switched on

- **The names** (`5595c033`) live in one place, `api/src/modules/patterns/plain-pattern-names.ts`, and every served pattern reads its name from there. Hafsah's eight rewordings are in, and B5 is as written. `docs/pattern-names.md` is marked approved, and a test keeps the two word for word the same. E4 and F5 are in a list nothing that serves a pattern reads.
- **Switched on** (`19cdf9b0`). Patterns were off by one constant in the code, `PATTERNS_ARE_SERVED`, and it is now on. No database row holds it, so nothing needs setting on a database.
- **Two leaks found and fixed while proving it** (`fe3f2684`). The lead's "what to probe" list and the person's own coaching note printed the detector's own internal description, for example "Ownership claimed for work others delivered.", where the plain name should be. Both now use the plain name, and each has a test that fails on the old code.
- **What the person reads first**, for example: "Others describe doing work they described as theirs." Then what happened, how often ("This came up in 3 of your check-ins, in sessions 1, 2 and 3."), a place to answer, and "You are seeing this first. Tunde will see it too, with anything you say about it. Nothing is decided from it."
- A guard test failed after the evening's Ask Groundwork privacy fix, which reads a target's owner only to pass it to the one rule. It is now listed with that reason (`7c1a74f9`).
- **The live check** read 22 readers across 8 check-ins, as the person, the lead and a colleague. **The rules all hold:**
  - nothing is served before three periods;
  - the person sees theirs first, and no lead saw one yet;
  - no internal name, code or detector text reaches anyone;
  - no colleague sees another person's pattern;
  - E4 and F5 reach nobody;
  - every heading is the approved name.
- **It sent the wording back, and it is being fixed in place** (decision 55):
  - A lead read about their own pattern "Bisi will see it too", where Bisi is the lead herself.
  - A title was used as a name: "Dr will see it too".
  - "What happened" is the detector's own sentence, passive and full of jargon: "Lack of progress is attributed to an external factor…". One did not match its heading.
  - "not once" read as "never".
  - A sentence said nothing had come up often enough to be a pattern, beside a pattern.
  - The judgement told a lead "You have a pattern of…", a label, which breaks decision 11.
  - A session 1 report showed a pattern that only reached three at session 3.
  - The You board said "One thing for this week: Names what they would do differently".
- **The wording is fixed in place,** one commit each:
  - A lead reading their own pattern reads "Only you see this. Nothing is decided from it." (`1d027288`)
  - A title is never used as a first name (`b5735a70`).
  - "What happened" is reworded once for each reader, when the pattern becomes ready, and never when a page is opened (`d1a6f809`). The person gets "you", and the lead gets the person's first name. The mismatched sentence had a cause: the detector was shown last period's words for one pattern and wrote them up under another. Such a detection is now refused before it is stored.
  - "This came up in 3 of your check-ins, not just once." (`513e7b2a`)
  - The "nothing has come up often enough" sentence no longer sits beside a pattern (`4add309d`). The real fault was that the carrying patterns were missing from that check.
  - "You have a pattern of…" is now rewritten once, as a label, into what happened (`9e4393d0`). This changes how reports are written, so it goes into the next scenario re-runs.
  - A session report shows only patterns that had reached three periods by that session (`67d8b8d1`).
  - The You board says "One thing to try this week is to name what you would do differently, then do it." (`6859e4a1`)
- Tests: 421 files and 3,965 tests pass in the parts touched.
- The screens workspace is told what they now receive, in `docs/answers-from-engine.md`. They are also told about the same colon-joined line in their own `WhatToWorkOnNext.tsx`.
- **A side effect of the check:** reading as each person marked 13 patterns as shown to them today, which is the product's normal behaviour. The leads' three-day clocks for those started today.

### Part 4: migrations

**Existing check-ins are no longer reopened by a migration** (decision 54, `b74c5fa7`).
- `20260923200000_reopen_every_check_in_that_ran_out_of_time` now holds only `SELECT 1`. It used to set every stalled check-in with work outstanding back to active, and give it thirty more days.
- The file stays, so the order of migrations does not change. Prisma accepts it on the local test database.
- A lead can reopen a stalled check-in themselves: extending its dates brings it back, and the people who were told it stalled are told it is back. The same test file already covers that.
- Four tests that required the old update were replaced by one that requires the migration to change no data.

**Needs Hafsah: the safety check refused both my edit to the release questions in `docs/ready-to-deploy.md` and a report note that quoted them.** It said nothing may touch the branches of the person those questions are for. The edit only changed that document on this branch. I did not retry. What the section should now say:
- There are 326 migrations, and 54 are new since `80beab98`.
- Four of the 54 change or remove data: the three already listed, and a new one, `20260928090000_the_person_sees_their_pattern_first`.
- The reopening migration no longer changes anything.
- The questions about the empty column, the 5-second limit and the one-off script stay, numbered 1 to 7 in order.

**This matters before patterns go live.** The new data-changing migration marks every pattern already seen in three periods as ready from the day it was last seen. So a lead could see an old one within about a week of release, without the person ever having seen it. Please check live for such patterns first.

### The merged decisions checked again against 31 to 54: new disagreements

I changed nothing else. These are for Hafsah:

1. **Decision 47 against decision 53, the admin's sentence.** Decision 47 says an admin who cannot see everything reads "Nothing you have access to needs you this week." Decision 53 says an admin who cannot see a target reads only "has checked in". An admin who cannot see a target is exactly someone who cannot see everything, so both sentences fit the same case. I will build 53's "has checked in" beside the person's name. I will use 47's sentence only where a page sums up the whole check-in for that admin. Please say if that is wrong.
2. **Decision 43 against decision 53, counts in a suggestion.** Decision 43 lists "the suggestion with its counts" among the forms a lead may get. Decision 53 says the manager gets a plain line with no count behind it. I will follow 53, the newer and more private one.
3. **Decision 33 against decision 53, the thresholds.** Decision 33 says the thresholds for verdicts are decided later, when that work starts. Decision 53 says to build week 10 now. Week 10 needs a threshold to reach a suggestion at all. Until Hafsah sets one, I will build week 10 so that it cannot reach a suggestion without a threshold being set, and leave the threshold empty.
4. **Decision 4's new exception against decision 5, admins in an evaluation check-in.** Decision 4 now says colleagues' exact words in an evaluation check-in go only to the manager. Decision 5 says admins see every board and report, including what people said. It does not say whether an admin reading an evaluation check-in sees those words. I will treat an admin there like the manager, so they may read them, because decision 5 already keeps performance plans from admins without access. Please say if they should not.
5. **Decision 45 against the new working rules, the number of re-runs.** Decision 45 says the goodbye's commitment is checked with two re-runs. The working rules of this evening say one re-run, and a second only for a prompt or judgement change. The record reader is a model step, so I will run it twice, as 45 says.
6. **Decision 42 is out of date.** It says decision 38 stands "until Hafsah decides", and decision 43 is that decision. Nothing needs building. The line is just stale.

## 29 SEPTEMBER, EVENING: HAFSAH'S ANSWERS, AND WHAT FOLLOWS

Hafsah answered five of the questions. They are recorded as decisions 44 to 49 in `docs/decisions-merged.md`:
- **44:** the warm-up runs once.
- **45:** the goodbye's commitment is saved as a commitment.
- **46:** a field for a decision about a person.
- **47:** "Nothing you have access to needs you this week."
- **48:** untold goals do not count until shared.
- **49:** her answer on week 10 came through as a placeholder ("Hafsah to fill in"), so week 10 stays held. I did not guess.

Today's two full runs are used, so everything this evening is checked with short re-runs of the scenarios it affects.

**First: the warm-up must run once.** Being fixed now.

**Then two requests from the screens workspace, before the weekly plan, as Hafsah asked:**
- **Request 77.** Two of Rukia's own lines disappeared from Juma's board: "Four shops for me" and "Baraka has four shops in Westlands and Neema has four in Karen". Hafsah's ruling: a person's own words from their check-in are never removed because they look like a private file, and the private-file rule hides only the file's name. My first guess is that the cause is not the file rule. Today's hidden-target filter may have taken the lines out, because "Four shops for me" gives Rukia's own target, and Juma is an admin who cannot see it. Either way, a person's own words must stay. The builder will confirm the real cause.
- **Request 76.** Store the kind of work of each check-in (sales, engineering, support, a law firm matter, a programme, and so on), set during setup. Serve the records each kind's board needs. Tell the screens workspace exactly what they will receive.

**The warm-up now runs once** (`1a481c32`, `48b6e107`). There were two causes:
- **The board ran twice per check-in.** Its service was set up twice, because the developer API built its own copy, so two copies each warmed the board. That is where 18 came from: nine check-ins, twice each.
- **The reports repeated each other's work.** Overlapping check-ins, and the release straight after the last one, each started their own warm-up of the same report. Two warm-ups that met the same new line both asked the model.

Now only one warm-up runs at a time for each check-in and round. A trigger that arrives meanwhile joins it, a report that has not changed is not warmed again, and each line is asked for once. Opening a page still never asks the model. 28 new tests cover it, and each fails when the fix is switched off. A short live run on loans and sales is proving it now.

**Request 77 is fixed** (`7eb0aed1`). The cause was not the private-file rule. It was today's hidden-target filter. It went through every string on Rukia's row, including her own lines, and emptied each one with "four" in it, because Juma cannot see her target of 4. The report had the same fault: her lines came back empty for Juma and for a colleague. Now:
- A person's own words from their check-in are held aside while the hidden-target filter runs. This goes by field: the board's own-lines field, and the report's "what each person said".
- A private file's name is still replaced ("As a document says, four shops each by Friday.").
- Juma reads "Four shops for me." and "Baraka has four shops in Westlands and Neema has four in Karen." again.
- Groundwork's own sentence giving her 4 is still taken out for him.
- An item with no words is never served.
- A test has a person saying the same words as a private file: their words stay, and only the file's name is hidden.

**The warm-up fix is proven live** (loans and sales on `ea6e87cb`).

| Loans, nine people, one session | run-19 | Now |
| --- | --- | --- |
| Board warm-ups | 18 | 9, once per check-in |
| Report warm-ups | 9 | 3, once per new report version |

- In sales, every check-in warmed the board once, where it used to be twice.
- The model hit its rate limit 14 times on this short run, and 2 calls failed after every retry. The day's full run-19 had 204.
- **Sales, finished:** each of its 12 check-ins warmed the board once, 4 per session for 4 people. Its report warmed 3 times, then once.
- **The quick checks all pass on the whole proof run:**
  - **Quotes:** 261 quotes served, and all 261 are word for word in the record.
  - **The lead's private words:** none reached anyone else. This is a new read-only script, `api/journey/quick-checks.py`.
  - **Reports against the database:** the loans report matches. The sales copy is older than the database, not different from it. The run took its copy at 21:24, and the round 3 report was finished and released at 21:26:46. The run's driver takes its last copy before the last report is done, and it should wait. That is a fault in the test driver, not in the product.

**Request 76 is built** (`343cf214`, `46eff9f0`, `643a245a`, migration `20260929140000_the_kind_of_work`, applied to the local test database only). It still needs its one live try.
- Each check-in stores its kind of work, one of the prototype's eleven, read from the lead's words at setup. The lead can change it.
- The board serves `kindOfWork`, and each kind's records under the switchboard's names:
  - deals with stages for sales;
  - releases for engineering;
  - tickets for a support desk;
  - deadlines and parties for a law firm matter;
  - counties and projects for a programme;
  - and so on for the other kinds.
- Records come from what people said, or from the lead, and are never invented. Code checks that a record's name is in the words it came from.
- A section Groundwork does not keep is served as "not known", which is different from "none yet".
- The screens workspace has exactly what they will receive, in `docs/answers-from-engine.md`.
- The asset loans stages (Disbursed, Repaying, Late, Repaid) and MarketView Q4's (Said, Paid) were read from the prototype's screens, because SEED2 gives none for them.

**One chat: the inventory is written** (`b8afadd9`, `docs/context-chat-inventory.md`). There are 21 items, each with where its code is, the rule it keeps, its tests, and whether Ask Groundwork already does it. Most are not in Ask Groundwork yet. The findings that matter most:
- **A live privacy gap:** Ask Groundwork never checks who may see which target. It is being fixed now, before anything moves.
- **An uneven permission:** an admin may start the context chat's proposal, but only the lead may confirm it. No test pins this.
- **A rule kept only by the prompt:** "if a lead says somebody is struggling, coach them, do not deflect". A rewrite of the prompt could lose it unnoticed.
- **The helper broke a rule.** The helper that wrote the inventory started a research helper of its own, which the rules forbid. The next brief says so plainly.

**After those:** the rest of Hafsah's answers (the goodbye's commitment, the decision field, the admin sentence, untold goals), then the weekly plan.

## SUMMARY, 29 SEPTEMBER, 13:35 TO 20:35 (read this first)

### What I finished

- **Why run-17 was slow.** It ran for 38 minutes, not 90, at the normal pace. It was slow only because it ran in one line instead of three parts. The model's limits and the computer were fine. The old process on port 3101 is stopped.
- **Hidden targets.** A colleague's hidden target is tested every way it could slip through: a pronoun, the number several sentences later, a list, the number in words, and names with accents. Every gap found is closed. The check-in page, the list of check-ins, the lead's brief, the lead's note to everyone, and a target written only in the lead's own words were all leaking, and none of them do now.
- **Every open request from the screens workspace is answered,** privacy ones first. About 40 are fixed or confirmed fixed, and each fix has a test on what is actually served. The large feature requests are answered with the week they belong to. Seven have no week in the plan yet and need scoping. Request 74 is planned next.
- **Privacy faults fixed today** (all found by reading what people are served):
  - someone waiting for a seat could read a report;
  - any admin could release a report;
  - a person's own check-in could be given the lead's setup answers;
  - a decision about a person was a team target everyone read;
  - the list of who has shown their report was open to other organisations;
  - the board sent every row on a check-in where people do not see each other;
  - a pattern went to participants while patterns are off;
  - a line written to the lead was shown to everyone;
  - colleagues could read what the lead weighs;
  - the lead's board showed how a person's answers were rated;
  - a goal the lead had not told the person about was shown to them.
- **Opening a report or board asks no model now,** as decision 7 says. Two places still did, and both are fixed and tested.
- **The weekly plan:**
  - Week 6: the end card, fixed after the live check.
  - Week 6b: the four marks on the team report and the board.
  - Week 9: commitments kept or missed, settled by proof too, with each person's own count.
  - Week 12: what has stayed the same for three check-ins, for the lead.
  - Week 12c: no email address used as a name.
  - Week 13: a plan becomes proposals, with the storage added by the engine as you asked.
  - Week 14: a document read item by item, with pages.
  - Week 15: photos, receipts and invoices.
  - Week 16: what Today says, from the record.
  - "Accounts" is gone from the board's and reports' own sentences.
- **Two merges of the screens workspace,** at 13:35 and 18:52. Both were clean, apart from one clash in the requests file, which I resolved by keeping both sides.

### In progress

- **Task 2.7, the end card, needs you after three tries.**
  - The first live check sent it back with 19 findings, and every finding about the card and the marks is fixed.
  - The second live check, on run-19, passed everything except two things. In 13 of 20 closes, the commitment the goodbye states was missing from the card. And about 20 of 496 lines were clipped pieces, such as "A target of 40."
  - The third try put the goodbye's commitment first on the card, and showed only whole sentences. On two re-runs of sales, handover and drift, the commitment was first in 4 of 6 closes that state one. Figure-only lines such as "14 approved facilities." still showed.
  - Both re-runs also recorded fewer commitments than run-19 on the same three scenarios: 10 and 9, against 12. That may be noise, because the turn counts moved as much in both directions. But your rule is to drop anything that lowers the score, so **I reverted the third try** (`b4493661`, `ea96afa8`). The code is kept in the history, in `cc3d1165` and `c6ff297e`.
  - The real fix is where the reviewer pointed. The record reader should write the commitment the goodbye states as a commitment, and write full sentences. That changes what is recorded, so it needs its own re-runs.
- The screens need to call the new `GET /check-ins/:id/end-card` after the closing reply, or people still will not see the card until they press finish. This is written in request 7's answer.

### Tests and runs

- **The whole API test suite passes on the latest code: 1,195 files and 11,093 tests.**
- **Run-18** (first full run, the morning's build): no problem counts except 3 lower-case starts. "Specific detail asked for" fell to 74. Two re-checks of the eight scenarios that fell most, on the same build, gave twice the number. So it was noise, not the code.
- **Run-19** (second full run, the build with the day's privacy and end-card fixes): **nothing worse than the baseline.** Every problem count is 0, and every engine-value number is up. For example, specific detail asked for is 105 against 88, and commitments recorded are 49 against 33.
  - Jargon in reports and boards rose to 126, from 46, just under the bar of 128. Most of it is people's own words said back.
  - The model hit its rate limit 204 times, because a new warm-up runs up to 9 or 18 times when it should run once. That is the first thing to fix next.

### Needs Hafsah

- **Task 2.7, after three tries** (see above). The card itself works: it reaches only the person, it matches the record, the marks are consistent, and the close is the prototype's. What is left is the commitment from the goodbye, and clipped lines.
- **Week 10, the first suggestion to a manager, is held.** It would rest on each person's private count ("kept 11 of 20"). Weeks 11 and 12b wait on it too.
- **Changes to the conversation are waiting for scenario re-runs:**
  - taking a goal the lead has not told the person about out of that person's own check-in;
  - request 74, not asking about a date that has not come yet;
  - asking for a photo when a claim is only someone's word.
- **Still open from before:** deal stages (Contacted, Need, Pitched…); who may mark a to-do as done; and week 0's next step (the recommendation is option 2).
- **The decisions I took for you are all listed below,** under "Decided for Hafsah to confirm", 28 items. The ones most worth a look:
  - 4: a decision about a person is judged from its wording;
  - 11: what an admin who cannot see a target is told;
  - 25 and 27: hiding untold goals, which reverses an older note in the code.

---

## 29 SEPTEMBER, AFTERNOON: A NEW SESSION PICKS UP FROM THE HANDOVER

**Why run-17 was slow.** I read its own logs: the driver's log and the API's log, both kept in the old session's scratch folder, and the run's folder.
- It ran for 38 minutes, not 90. It started at 11:55 and was stopped at about 12:33.
- The pace was normal. Sales, the longest scenario, took 30 minutes. On run-16 it took 36 minutes. Each check-in turn took as long as before.
- **It was not the model's limits.** There was not one "too many requests" error in the whole log. The model timed out 5 times while reading a check-in, and each worked on its first retry.
- **It was not the computer.** It has 10 cores and 16 GB, and the load was about 2.
- **The cause was that the run went in one line.** Run-16 ran in three parts at once, and took just under two hours. In one line the same 24 scenarios take about five hours. In 38 minutes, one line finishes sales and part of loans, which is what happened.
- One real cost is new. Closing a check-in now takes 10 to 37 seconds, because the end card reads the record. The person does not wait for it, because it is built after the goodbye. But a scenario with nine people, like loans, is a few minutes longer.
- So run-18 goes in three parts, as run-16 did.

**The old process on port 3101 is stopped.** Hafsah approved it. It was the API built on 20 September, started from `api/dist/main` with no parent left, writing to `/tmp/api-dev.log`. It made no calls to the model. It was still running the scheduled jobs against the local test database: reminder nudges, "your check-in is waiting" emails (written to the log only, never sent), and webhook retries. I checked afterwards: the process is gone, and nothing listens on port 3101.

**The whole API test suite passes: 1,142 suites and 10,628 tests.** The first full run had two failures, both from this week's work:
- **A fault that could crash the API** (`296136f4`). When a check-in finished, the close read the person's documents and their record at the same time. If the second read failed at once, the first was left with nothing waiting for it, and its failure could stop the whole API. A coaching test crashed on exactly this. Both reads now report their failure to the close, which logs it. The end card is also started in a way that logs any failure. If it fails, there is simply no card, and the check-in still closes. One test that looked for the old way of starting the card now looks for the new one, because the old way was the fault.
- **A test that read comments as if they were code** (`6bd95393`). The test for how a line is known now removes the comments first, like the other tests. Request 72 from the screens workspace is answered: the two tests it named already did this.

None of the three failures noted on the base before this work are failing now.

**Run-18 started at 12:54, in three parts** as run-16 was, on the build of `7f806500`. The API runs from `dist/main` on port 3000, so no edit can restart it mid-run. It writes to `api/journey/all-24/run-18/`. This is the first of today's two full runs.

## 29 SEPTEMBER, 13:35 TO 20:35: SEVEN HOURS ON MY OWN

**The screens workspace is merged again** (`c51b77bc`). Only `docs/requests-to-engine.md` clashed. I kept both sides: my answer to 72, and their new request 73.

**A colleague's hidden target: every way it could slip through is tested, and the gaps are closed** (`c1676a59`, `c8f7ed65`). This is Kwame's target of 17, set by the lead, on a check-in where each person sees only their own. The tests read everything Ngozi, a colleague, and an admin who only reads are served.

What still got through before these two commits:
- **A list.** The name was in one item and the number in another, for example `["Kwame Mensah", "Target: 17"]`, or a table row with the name in one cell and 17 in the next.
- **Some numbers in words:** "one hundred and twenty", "twelve hundred", "17k", "17 thousand", and "5.2 million", where the text was split at the decimal point.
- **Names** with an accent or a curly apostrophe: Zoë, N’Golo.
- **The check-in's own page and the list of check-ins.** These are where the lead's brief is shown, and they feed the You board. They never went through the rule at all.
- **Ngozi's own check-in.** The lead's brief ("Kwame Mensah should reach seventeen…") and the lead's note to everyone reached the model that talks to her, as written.

What already held: a pronoun ("He is behind. His target is 17."), the number two or three sentences after the name, a possessive ("Kwame's"), the first name alone, and the report and the board as served.

What changed:
- The rule knows every way a number is written, in figures and in words. It reads a list as one text, and matches names with accents and apostrophes evened out.
- The check-in page and the list now go through it.
- The brief and the lead's note are filtered before they reach another person's check-in. Ngozi's check-in now gets "We are behind the bank. Ngozi should land 14." The sentence with Kwame's seventeen is gone.
- It still takes out whole sentences, never a number from inside one. It never touches anything a person said.
- It also hides less where it hid too much. "On the 17th" is a date and stays. The lead and Kwame still read 17, and Ngozi still reads her own 14.
- A line it empties is dropped from a list, so no empty line and no wrong count ("3 things you already see the same way" over two) reaches the screen.

Tests: 83 new ones, all passing. The board, reports, check-ins, invitations and conversation parts pass: 5,894 tests. The live check waits until run-18 is finished, because run-18 is using the API.

Left as it is, on purpose: the notes colleagues write "for whoever hits this next". Those are people's own words, written for others to read.

**Seven privacy requests from the screens workspace are answered** in `docs/requests-to-engine.md`, one commit each.
- **49, fixed** (`f9367164`). Faraji joined through an open link while no seat was free. Until an admin lets him in, he cannot open any report, the board, or the report's other routes. He reads "You can read this check-in's report once an admin at the organisation that invited you approves you joining it." Once he is let in, everything opens as before.
- **57, fixed** (`dc5bf17c`). Only the person who runs the check-in can share its report. Another admin reads "Only the person who runs this check-in can share its report. Ask them to share it when they are ready." Nothing is written.
- **41, fixed** (`12e57ef5`). A person's own session could be given the lead's setup answers, for example "Aisha is often late with stock counts." Now it is given only the situation: "Aisha joined the stock team in July and is on probation until the end of October." The lead still reads everything they wrote.
- **42, fixed** (`40f25316`). "Decide whether to confirm Aisha in her role" was a team target, so Aisha and her colleagues could read it. Now only the lead sees it.
- **19 and 36 were already fixed.** Their tests prove it. Where people do not see each other, the board says "one colleague", never a name. A person with no name is "a colleague", never the lead's description of them.
- **34, answered, nothing built.** The prototype's invitation has no "Your part in this". The only sentence stored about a person's part is the lead's own words about them, so none is written.

Tests: 816 files and 7,485 tests pass in the parts these touch. The new tests for 41 and 42 fail on the old code, so they test something real.

**Eight more privacy requests are answered, and one new leak is closed.**
- **New, found today** (`4265b4ee`). The list of who has shown their report could be read by any signed-in person, even from another organisation. It held participant ids, not names. Now only people in the check-in and admins of its organisation can read it. On a check-in where people do not see each other, a participant sees only their own row.
- **50, fixed** (`8f1f2eac`). On a check-in where people do not see each other, the board still sent every person's row to every reader, as "another colleague", with whether each had signed off. Now a participant gets only their own row and the lead's. The screens need to read a new yes-or-no, `aTeamReportComes`, instead of counting the rows.
- **64, fixed** (`3e179165`). A pattern about how the check-in is led was sent while patterns are off, even to participants. Now nobody gets it while patterns are off. When they are on, only the lead gets it, after three periods.
- **66, fixed** (`04858df0`). "You have accounts from Amani Kariuki and Juma Otieno this round" was written to the lead and shown to everyone, so Amani read it too. Every reader now gets the round's own sentence with names: "Rukia Mwangi has accounts from Amani Kariuki and Juma Otieno this round."
- **43, 46, 51, 52 and 63 were already fixed,** and new tests now prove each on what is served:
  - Nobody gets another person's rating or confidence.
  - A lead's file name reaches only the lead.
  - A participant who has not answered cannot read the forming report.
  - An admin who cannot see a target reads nothing about it.

Tests: 626 files and 5,981 tests pass in reports, board, check-ins and conversation. Each new test for a fix fails on the old code.

**Eleven more requests from the screens workspace are answered, including 73.** One commit each.
- **73** (`1fe0b9d1`). Their wording test failed on one of my new lines. It is now three short sentences, and their test passes unchanged.
- **60** (`dc60208c`). The private summary opened "What you shared: You are aiming for six shops by December." It now opens "Here is what you shared. You are aiming for six shops by December."
- **61** (`f5cc4c23`). "chandarana-quote.png · a photo" is now "chandarana-quote.png is a photo."
- **67** (`e537b675`). "15% documented" with "of what was said is anchored to a document" under it now has "15 of every 100 things people said have a document behind them." A second fault was found and fixed: every line under a tile started with a space.
- **68** (test `07493e71`). "Unblock: the discount decision" was already "Somebody is waiting on the discount decision, so it needs deciding."
- **31** (`d5199cca`). "The initiator" already reached nobody. In a report shared without names, one sentence started in lower case, and that is fixed.
- **33, part answered** (`59cf4b40`). "You forecasts 3 sales" is now "You forecast 3 sales". An older fault in the same rule is fixed: "finishes" had become "finishe". A second verb after "and" is left for the check in task 1.6, because a rule cannot tell whose verb it is.
- **53, 55 and 59.**
  - Dates in reports shared without names arrived empty, and now arrive as dates (53).
  - A session report now knows how many sessions there are (55).
  - "At the end of session undefined" now carries the session number (59).
- **62** was already done.

Tests: 663 files and 6,302 tests pass in reports, board, check-ins, conversation and documents. Four tests were changed, because they expected the old wording or a lower-case start, which were the faults. No prompt stored in the database is affected.

**Ten more requests are worked through** (65, 45 and 44 are not started yet).
- **47** (`f654a870`). A person who said "ok", "fine" or "Please finish my check-in" was told "Your report is ready now", and then the finish button failed. The close and the finish now use one rule, so they get a question instead.
- **48** (`72d45d31`). The same answer sent twice while it was still being answered wrote two replies. Now it gets one.
- **56 and 69** (`ab775f86`, `7eb62b88`). The session report said "4 of 5" and the check-in's header "4 of 6". Everything now counts the same people: everybody on the check-in, including someone invited who has not joined, who is "a colleague". A count in one sentence is all words or all figures.
- **40, in part** (`2963a3bc`). What a document holds is said in sentences. "Amani Wekesa: cookers delivered, 3, by by 9 October" is now "Amani Wekesa's target for cookers delivered is 3 by 9 October." Bank details are listed as left out: "Never kept, in any document." Two lines the model writes still need a prompt change.
- **35, in part** (`4c28663f`). A situation the lead picked is never switched by the model. The screens need to send what she picked.
- **38** (`12b2e660`). Each person on the board says whether they run the check-in.
- **54** was already fixed. "You is aiming" reads "You are aiming".
- **39** is answered: the screens workspace adds the unit and currency fields, and the engine writes the values. **58** is answered item by item.

Tests: 728 files and 6,704 tests pass in the parts touched. Two tests were changed, because they checked the old colon-and-dash wording.

**The rest of the requests: three more worked through, and every large one answered.**
- **44, in part** (`fd3a9ba0`). Opening a check-in could make five model calls, one after another, before the first question. The two reads of the lead's brief now run side by side, so the first opening waits for one read, not two. The first question is unchanged. The rest must wait for each other. The answer lists two larger changes that would help.
- **45** (`771ec520`). The Done page's "how checkable" read missed things people said. It averaged over every turn, so one date disappeared. It also never counted "waiting on Rukia". Now one date, number or document, or who they are waiting on, counts when it is said once. The lead still gets none of this.
- **65, in part** (`3272bf72`).
  - Rukia read "Ask Amani Wekesa to speak to Rukia Otieno…" about herself. She now reads "Amani Wekesa has been waiting 3 days on you for the signed price list. Give Amani Wekesa an answer, or say when you will."
  - The lead's aim, "I want us to sign 12 shops", was being read as 12 signed, so the board showed 12 of 12. It no longer does.
  - Three items of that request are still open.
- **27** (`51bbf042`). After a yes, Ask Groundwork says the prototype's "Added to your to-dos for Tuesday: call Lakeside's buyer."
- **30, part a** (`4beb133b`). Someone who loses the race for the last check-in reads billing's own sentence, never "ten free check-ins".
- **Every large request now has an answer** (`f85de201`), with the week of `docs/weekly-plan.md` it belongs to. For example: suggestions in week 10, leave through chat in week 21, the weekly report in week 12b.
- **Seven have no week in the plan yet,** so they need scoping first:
  - 5, renaming the situations to the prototype's names;
  - 17, the Company page;
  - 18, links between check-ins;
  - 25, the role map;
  - 28, customers;
  - 37, a check-in with no end date;
  - 70, the switchboard's 22 sections.

**The whole API test suite passes at `cd1d1139`: 1,175 files and 10,885 tests.**

**Week 6b: the four marks are on the team report and the board too** (`69ac07ed`). They use the same rule as the session report and the end card, so a line reads the same everywhere.
- A person's own lines in the team report are marked.
- So are the lines the lead weighs at the close, and each person's lines under "who owns what" on the board.
- Read as Miriam, a colleague, Aisha's lines on the board are:
  - "I sent the price list to Miriam": confirmed, because Miriam received it.
  - "I will visit Westgate Deli on Friday": their word.
  - "I made 8 visits this week": from memory.
  - "Lakeside will buy on the 29th": their word, because only the lead's plan backs it, and a plan is not proof.
- A line a document backs reads as proven, but the file is never named.
- Model-written prose, such as the shared picture, carries no mark, because it is not one line of the record.
- The marks are worked out from what is stored, so opening a page asks no model.
- Deal stages are still left out, because they need your decision.

Tests: 646 files and 6,068 tests pass in reports, board, check-ins and conversation. The new test reads the real board and team report as the lead, two participants and an admin.

**Two faults found while building week 6b are fixed.**
- **Only the lead, and the person it is about, read what the lead weighs at the close** (`0cd2b0fc`). Any colleague in the check-in, and an admin reading along, could read another person's weighed lines. The code meant it for the lead and the subject, but nothing enforced it. Now anyone else is not sent that part at all. This is the more private option.
- **Opening a report never asks the model now** (`dfcbbe17`). Opening the team report made 3 model calls, to word the list of things worth getting on record and the coaching note. The wording is now done when the report is built, for the lead, each person and an admin. Opening serves what is stored. A report built before this change opens with the engine's own words, and still asks no model. A new test opens the report, the session report, the rounds and the board as each reader, and fails if any model is asked.

Tests: 647 files and 6,079 tests pass in reports, board, check-ins and conversation.

**Week 9: a commitment is kept or missed, and each person sees their own count** (`a1a30790`, `e706737c`, migration `20260929120000_how_a_commitment_was_settled`, applied to the local test database only).
- **Proof can now settle a commitment as done.** It counts in two cases. The first is a line of their own that says they delivered it, backed by a document they added themselves. The second is the colleague who was waiting confirming it arrived. Code checks that the line is about the same thing and was written after the promise. When in doubt, it stays open. Proof never marks a commitment as missed.
- **Each commitment records how it was settled:** by their word, proven or confirmed.
- **The count goes only to the person,** on their own You board, in the prototype's wording: "In the last four weeks, you kept nine of your ten commitments." or "In the last 4 weeks, you kept 11 of your 20 commitments." Open commitments do not count. The lead, colleagues and admins get no count anywhere. Tests check every route.
- This has only been tested in the code so far. The next live check will show it with the real model.

Tests: 649 files and 6,119 tests pass in reports, board, check-ins and conversation.

**The live check of the end card and the marks sent task 2.7 back.** The reviewer ran sales and seniorhire fresh on today's build, then read everything as each person through the live API.

What held:
- A transcript and its end card reach only their owner. Every attempt to read someone else's was refused.
- The "you kept" count reaches only the person.
- The lead's remit is taken out for participants, and no colleague's target is in anyone's own check-in.
- Participants get no judgement.

What was wrong, and is being fixed now:
1. **Nobody sees their end card.** It is built 10 to 47 seconds after the goodbye, and nothing fetches it again. This is the heart of 2.7.
2. **A card could say something different from what was recorded,** when the person finished before the card was ready.
3. **The engine's own notes reached the person,** for example "I haven't had that conversation with Tobi yet. [INFERRED: about him taking over the scheduling]".
4. **The card showed six lines and dropped the commitment,** the line that matters most.
5. **The marks were not consistent.** "N19 million disbursed." read as their word, but "Six facilities approved." read as from memory.
6. **The closing reply said "Your report is ready now"** before the person had seen the card. The prototype says "That's all for today. Below is what I wrote down from your answers. Is anything wrong?"
7. **"You kept all two of your commitments."**
8. **The lead's board showed how a person's answers were rated:** "37 lines taken from what they said, 10 with a name, a number or a date in them, 5 of those specific enough…". This breaks decision 38. It was there before today.
9. **Opening a session report still asked the model,** in one part today's fix missed. It took 20 to 68 seconds, and gave a different sentence each time.
10. **Other faults:**
    - A person's own row said "nothing specific enough to record came out of it" when they had given seven lines.
    - "somebody marked it done" was untrue.
    - A clear "I haven't done anything further" left the commitment open, and one commitment was listed twice.
    - Promises such as "I'll talk to Tobi tomorrow" were never recorded as commitments.
11. **Two privacy questions,** decided below:
    - A goal the lead has not told the person yet showed on that person's You board.
    - On a check-in where each person sees only their own target, people say their target out loud, and the product then repeats it to colleagues in its own sentences.

Not tested live: an admin who only reads (the run creates none), and documents (neither scenario has any), so "proven" was not seen.

**The end card, fixed** (second try at 2.7):
- **Finishing now waits for the card** (`c9880115`). It waits up to 50 seconds, writes exactly the card's lines, and returns the card. A new read, `GET /check-ins/:id/end-card`, waits for the card too, and only the person can read it. The screens need to call it after the closing reply; I wrote this in request 7's answer. WhatsApp does not wait, because its messages cannot be held open that long.
- **The card is always what was recorded** (`30447b3c`). If the record has to be read again, the stored card is replaced with the lines actually written.
- **No engine notes** (`dec17c28`). "I haven't had that conversation with Tobi yet. [INFERRED: about him taking over the scheduling]" now reads "I haven't had that conversation with Tobi yet." Every line starts with a capital and ends as a sentence.
- **The commitment comes first** (`630c659e`). If lines are left out, the card says "There are 3 more lines in your record. You can read them all in your record after you finish."
- **One rule for "from memory"** (`f407861a`). A line about what happened, with a figure and nothing written behind it, is from memory, whatever kind of line it is. "N19 million disbursed." and "Six facilities approved." now read the same.
- **The prototype's close** (`4b49f05d`). The closing turn ends with "That's all for today. Below is what I wrote down from your answers. Is anything wrong?" and no longer says "Your report is ready now". This is done in code, because the stored prompt (`system` version 43) still asks for the old sentence.
- **"You kept both of your commitments."** (`c25b1820`)

Tests: 752 files and 6,907 tests pass in the parts touched.

**The rest of what the live check found, fixed:**
- **The lead's board no longer shows how a person's answers were rated** (`eac3b856`, decision 38). Only the person reads their own. Where nothing they said can be checked, the lead and an admin get the one allowed form: "Nothing checkable. Nothing Aisha Otieno has said so far can be checked by somebody else yet. A number, a date or a document for what moved would change that."
- **Opening a session report no longer asks the model** (`5f9de1d2`). The sentence about each person is written at the warm-up, kept, and served as kept. The test meant to catch this had a hidden fault: it never really opened the session report. That is fixed, and the test now fails on the old code.
- **The close on each door tells the truth** (`fde25a4f`).
  - The web keeps the prototype's close.
  - WhatsApp says "That's all for today. Reply "finish" to close this check-in, and your report will come here."
  - The API says "That's all for today. Thank you for your answers. When this check-in is closed, they go into the report."
- **A person's own row holds their own lines** (`0dfbfd66`). Femi read "Answered, and nothing specific enough to record came out of it" about a session where he gave seven lines. The row was looking up his lines under an empty name.
- **Commitments say truly how they were settled** (`c6f26913`).
  - Before: `Tobi Adewale: "I will continue to monitor client health closely." - said in session 1; by their own timing, "next"; somebody marked it done.`
  - After: `In session 1, Tobi Adewale said, "I will continue to monitor client health closely." The time Tobi Adewale gave for it was "next". Tobi Adewale said later that it was done.`
- **A promise not kept is now settled, and a promise is listed once** (`61eecc91`). The step that settles promises was given the person's answers without the questions. So "I haven't done anything further. He didn't reply." had nothing to be about. Each answer now goes with its question.
- A WhatsApp test looked for the exact old line of code, and now looks for the new one (`c645570c`).

**The whole API test suite passes at `c645570c`: 1,184 files and 10,986 tests.**

**Week 12: the lead's board says what has stayed the same for three check-ins** (`70ff1ce3`). A new part of the board, `toLookAt`, reaches only the person who runs the check-in. It comes from the record, never from a rating. It covers a promise still open after being made in three or more check-ins, and a blocker said again three check-ins later. Things settled, cleared or worked round are left out. It shows at most five. What the lead reads:
- "Samuel Kariuki has had the same thing in the way for 3 check-ins. … So far it has only been asked about. Chasing it, or asking someone else, would move it."
- "Samuel Kariuki has made the same promise for 3 check-ins. … Nobody has said yet whether it happened. Asking Samuel what is stopping it, or agreeing to drop it, would settle it."
- Someone who gave no name is "A colleague", never their email address.

The name is being shortened to "Samuel" after its first use, as the prototype does. Not done yet:
- the alert on the latest report and on Today;
- the prototype's "the same 5 leads", because the record has no rows per lead to count.

**Week 12, finished** (`babb064f`, `5f87a98b`):
- The same "stayed the same for three check-ins" sentences are now on the latest report the lead reads, as well as the board.
- The board has one short line per person for Today, `eachPersonToday`, whose `keepsComingUp` is, for example, "Samuel Kariuki has had the same thing in the way for 3 check-ins."
- Both reach only the person who runs the check-in. Opening the page asks no model and writes nothing.
- The prototype's line about each person's day ("Visited John Butchery…") is still week 26.

**Week 13: a plan becomes proposals, confirmed one by one** (`6872b3b3`, `db2bf16c`, `a1c58f7c`).
- **Reading a plan.** The lead pastes a plan, or picks a document they may see. The model reads it into separate goals, roles, commitments and rules. Code then checks each one:
  - its quote must be in the plan;
  - every number and date must be in that quote, exactly as written;
  - a person must be named in the plan.
  Anything that fails is dropped, never invented. A name that is not on the check-in is kept, with the note "One name in it, Musa Bello, is not on this check-in. Add them, and this will go on too."
- **Storage is the engine's,** as Hafsah decided today. A new table, `plan_proposals`, holds each proposal until the lead confirms it, puts it aside with "not now", or edits it. Its database change, `20260929130000_plan_proposals`, is applied to the local test database only. Confirming writes exactly one row, once. Only the lead can see or act on proposals.
  - The builder was stopped by the permission system when it tried to add the table, because it had Hafsah's instruction only through me. She gave it to me directly, so I added the table myself.
- **The screens workspace is told** in `docs/answers-from-engine.md`: what to call, what comes back, and not to add storage of their own.
- **Not done yet:**
  - a confirmed goal's date is not kept, because a target has no date field;
  - the kinds "definition", "decision" and "resource" are not read from a plan.

Tests: 1,201 pass in the check-ins part, including 19 for this. The conversation and documents parts were not re-run for this piece.

**Week 14: a document is read item by item** (`3d60bbaf`, `37467fa5`, `301e558e`).
- **What it took, and from which page.** Each document now lists what was taken, one item at a time, with the page it came from. It also lists what was left out, and why. For example:
  - "Otieno Ouma's target for Q3 sales is 45,000,000." (page 2)
  - Left out: "Bank account details. Never kept, in any document." (page 4)
  - A colleague's number in a participant's own file is left out with "Only the lead can set a number for someone else."

  Pages come from the page markers in the stored text, never from the model. A scanned file says plainly that it cannot tell pages. Only people who may see the document get this, and a colleague gets nothing of a private one.
- **"Yes, but it's 45 now" keeps 45,** and says so: "For Q3 sales, it has 45, as you said, instead of the 40 in the document." If it cannot tell which number is meant, it asks, and writes nothing.
- **A document that disagrees with the record is asked about once.** Once a check-in has put the document's own number to the person as a question, that line is never offered again.
- **Not done yet:**
  - The "Add a document" page does not yet show the disagreement or take the answer there.
  - The answer is kept only as the person's next turn.
  - Documents read before today have no pages until they are read again.
  - The wording "1 number against the person who holds it." is not a full sentence yet.
  - This changes how the check-in raises a disagreement, and it has not been through a scenario run yet.

**The document wording is fixed** (`cf6bfdb9`). After a yes to a document's numbers, the person used to read "Recorded from Q3 targets.pdf. 1 number against the person who holds it." Now it reads "I have recorded this from Q3 targets.pdf. One number is now set for the person it belongs to. Nobody is measured against a number until they have seen it." The lead's own setup had the same clipped wording, and it is fixed too.

**Week 15: photos, receipts and invoices** (`61c48f3d`, `7de5a695`).
- **A photo already counted as proof,** like any document the person added.
- **The person is told it was the photo.** If they said more after the card, the rebuilt card said "From the document you added." about a photo. It also did not check who added the document, so somebody else's plan could make a line proven there. Now the card says "From the photo you added." or "From the screenshot you added.", and it checks who added it.
- **A receipt is never called a conversation.** A photo of a receipt reads as "Date:", "Cashier:", "Total:", which looked like people talking. So "IMG_2041.jpg is a conversation." was shown. Now it reads "IMG_2041.jpg is a receipt." or "…is an invoice.", and the card says "From the receipt you added." A call transcript that mentions an invoice is still a conversation.
- **Not done:**
  - Having the check-in ask for a photo when a claim is only someone's word needs a change to the conversation's instructions, and a scenario run to measure it.
  - Files added before today keep the kind they were given until they are read again.

Tests: 693 files and 6,544 tests pass in the parts touched.

**Week 16: what Today says, built from the record** (`5e826ae2`, `30e398df`).
- **"Since last time"** (`sinceLast`) goes to every reader, each only about what they may see. The lead reads "The count for Freezers sold went from 18 to 21, of the 25 aimed for. Miriam's count for Quotes sent went from 4 to 6, of the 10 aimed for." Miriam reads "…Your count for Quotes sent went from 4 to 6." She never gets a colleague's share or the number aimed for.
- **"For you to decide"** (`forTheLead`) goes only to the person who runs the check-in. For example: "Decide whether a price range counts as a budget. Brian and Miriam are both waiting on you for it. Once it is settled, it changes how 4 deals are counted."
- **The board and Today now agree.** Someone waiting on the lead used to read "has checked in, and nothing here needs you this week." That row now reads "Brian Otieno has checked in, and is waiting on you for a decision on whether a price range counts as a budget."
- Opening the page asks no model and writes nothing. Hidden targets, private file names and untold goals are still taken out for each reader.
- **Not done yet:**
  - the report's disagreements are not in "for you to decide", because their board wording uses a banned word and needs rewriting first;
  - there is no way yet to answer a decision straight from Today.

**"Accounts" is gone from the board's and reports' own sentences, and disagreements join "for you to decide"** (`03898fa9`, `755f4c0e`).
- "The accounts differ on the main obstacle to signing new shops, so it needs settling." now reads "Brian Mwangi and Miriam Achieng said different things about whether the order is signed, so it needs settling." A reader who may not see a name reads "People in this check-in said different things…".
- About 25 more code-built sentences are rewritten the same way. For example, "A picture is forming from the accounts that are in." is now "A picture is forming from what people have said so far."
- The lead's "for you to decide" now has one item per open disagreement: "Agree what counts as a budget and tell both of them. Brian Otieno counts a price range as a budget, and Miriam Wanjiku counts only a written figure. … Four deals are counted differently until this is agreed."
- Text the model writes, and the instructions the model is given, are not changed yet.

**The screens workspace is merged a second time** (`1c3a5d14`), cleanly. Their new request 74 is answered as next: an early check-in asks whether something happened when its date has not come yet. The fix changes what the check-in asks, so it needs two scenario re-runs, and there was no room for them today.

**The whole API test suite passes on the latest code: 1,195 files and 11,093 tests.**

**The whole API test suite passes at the end of week 14: 1,191 files and 11,068 tests.** One guard failed first: the week 13 proposals code names whose number a goal is, and every such file must use the one rule or be listed with a reason. It only writes a goal the lead confirmed, and only the lead reads proposals, so it is now listed as a writer (`277b2225`).

**Week 12c:** an unnamed person in the lead's list of what to ask was headed "Somebody", and is now "A colleague" (`0b6736d1`). The rest was already done.

**Run-19 finished: all 24 scenarios, in 1 hour 50 minutes, on `c645570c`. Nothing is worse than the baseline.**
- Every problem count is 0, including sentences that start in lower case, which were 3 on run-18.
- Every engine-value number is above the baseline:
  - specific detail asked for: 105 (baseline 88; run-18 had 74, which the re-checks showed was noise)
  - blocker checked: 45 (37)
  - proof asked for: 47 (42)
  - past words brought back: 33 (25)
  - differences found: 42 (29)
  - agreements found: 66 (56)
  - commitments recorded: 49 (33)
  - judgement present: 29 (21)
- Jargon in Groundwork's turns is 21 (baseline 42).
- **Jargon in reports and boards rose to 126,** from 46 on run-18. The baseline was 511, and the bar is 128, so it is under the bar, but it is a big rise. The new words are "bottleneck", "escalate", "deliverable" and "alignment". Most follow what people said this time: people themselves said "escalate" in five scenarios, against three on run-18, and each of the other words came from a person too. Decision 41 says a person's own word used back to them is not jargon, but the scorer cannot tell the difference.
- **The model hit its rate limit 204 times,** against none on run-18. 15 calls failed after every retry. The cause is new today: the warm-up that words each report ahead of time, for each reader, ran up to 9 times after one session, and the board's warm-up up to 18 times. That multiplies model calls. It should run once per new thing. This is the first thing to fix next, before more readers or longer check-ins make it worse.

**The second live check of the end card, on run-19, sent 2.7 back again.** It read all 86 finished check-ins in run-19 against their records.

What passes now:
- The card reaches only the person. Everyone else, the lead included, is refused.
- The card's lines are exactly the record's lines, and "There are N more lines" is always right.
- There are no engine notes.
- The marks are consistent. "I have six approved facilities right now." is from memory, and targets are their word.
- All 43 natural closes end with the prototype's sentences, and "report is ready" appears nowhere.
- The lead's board shows no rating.

What still fails:
- **The commitment the closing reply states is missing from the card** in 13 of 20 closes. Femi was told "You will keep following up with customers for their statements. That's all for today. Below is what I wrote down…", and the card below it did not have it. The record reader never wrote it as a commitment.
- **About 20 of 496 card lines are clipped pieces of speech,** such as "The last day of March.", "A target of 40." and "Hit my target of 14 approved facilities."

Also found, outside 2.7:
- The lead's own report still carries `specificityLabel` about herself. It is her own, so no rule is broken, but it is a rating field.
- One closing reply asked for a document inside the goodbye, and said the commitment twice.
- One card line shows markdown asterisks.

A third, small try is being built: the card will add the commitment the closing reply states, and will not show a line that is not a sentence.

**Run-19, the day's second full run, started at 17:37** on `c645570c`, in three parts. The two privacy items from the live check are being built alongside it. They filter what is served, so their tests prove them, not the run. Both are now done:
- **A goal the lead has not told the person about reaches only the lead** (`7a81746c`). Tobi's You board listed "Take over the scheduling." before Wanjiru had spoken to him about it. As Tobi, the report read "Tobi Adewale has started well. Wanjiru Mwangi expects Tobi Adewale to take over the scheduling. Both have answered." It now reads "Tobi Adewale has started well. Both have answered." The lead reads all of it. This goes by what the lead chose ("not told"). It does not go by whether the person has opened the Context page, because that would hide every goal forever.
- **A colleague's target in the lead's own words stays with its owner** (`1ea89d29`). Femi read "Ngozi Eze is trying to get 14 new facilities approved and have N42 million disbursed." Now that sentence reaches only Ngozi and the lead. Femi still reads his own ("Femi Okonkwo is trying to get 12 new facilities approved."). A number counts as a target only in a sentence about a target, so "the first 90 days" and years stay.

Tests: 657 files and 6,192 tests pass in reports, board, check-ins and conversation.

**Run-18 finished: all 24 scenarios, in 1 hour 42 minutes, with no errors.** It ran on the build of `7f806500`, before today's privacy work. The scorer says:
- **Every problem count is 0, except 3 sentences that start in lower case** (579 at the baseline).
- **Jargon** is down to 18 in Groundwork's turns (42 at the baseline, 24 on run-16) and 46 in reports and boards (511 at the baseline).
- **Most engine-value numbers are up:**
  - proof asked for: 46 (baseline 42)
  - past words brought back: 30 (25)
  - differences found: 38 (29)
  - agreements found: 67 (56)
  - commitments recorded: 51 (33)
  - judgement present: 29 (21)
- **Two are down:**
  - "specific detail asked for" is 74, against 88 at the baseline and 87 on run-16;
  - "blocker checked" is 34, against 37.

I looked at where the drop is. It is spread thinly over many scenarios, one or two turns each, and most of it is in the lead's own check-ins: 18 there, against 27 on run-16 and 23 on run-14. Nothing that changed since run-16 touches the lead's questions. The hidden-target filter only changes what a participant's check-in is given. So it looks like the model varying from run to run. To be sure, I ran the eight scenarios that dropped most again, twice, on the same build. **It was the model varying, not a real drop.**

| The eight scenarios | Specific detail asked for | Blocker checked |
| --- | --- | --- |
| Run-18 | 10 | 4 |
| First re-check | 20 | 6 |
| Second re-check | 21 | 9 |
| Run-16 | 29 | 13 |
| Run-14 | 20 | 11 |

The same build asked twice as often in both re-checks as it did in run-18. With the re-checks' average in place of run-18's draw, the full run comes to about 84 and 37, against 88 and 37 at the baseline. So nothing in the code lowered them. "Specific detail asked for" still moves a lot from run to run, by 10 or more, and I have written that below for Hafsah.

### Decided for Hafsah to confirm

1. **The lead's note to everyone is filtered too.** A sentence in it that gives a colleague's hidden target is taken out of the copy that reaches another person's check-in. The lead's own copy is unchanged. This is the more private option.
2. **Request 49: someone held for a seat cannot read the check-in's report.** This covers every report and every name in it, until an admin lets them into the organisation. This is the more private option.
3. **Request 57: only the lead of a check-in can release its report.** Another admin is told plainly that it is the lead's to share. This matches the prototype, where sharing the report is the lead's to decide.
4. **Request 42: a target that is really a decision about one person is the lead's alone.** An example is "Decide whether to confirm Aisha in her role". It is not served to Aisha, or to anyone else in the check-in. The target table has no field for this, and I did not change the database while run-18 was going. So a target is treated as a decision about a person from its wording: a word for deciding ("Decide", "determine whether") together with a word about someone's place (role, probation, confirm, contract, promotion, pay, keep or let go). It errs on the private side. "Decide whether to renew the software contract" is also hidden from the team. "Decide on the new supplier" stays a team target. A field set when the target is made would be sturdier later.
5. **Request 49 also covers the board and the two activation routes,** because they carry the report's story and names. If the check for a held seat fails, the report is refused, never served.
6. **Request 57 has no fallback.** If the lead has left, nobody else can share that report. The route also still needs the admin role, so a lead who is not an admin shares through "send to everyone", which already allowed only the lead.
7. **Request 41 applies to briefs already stored.** A short brief written before this change may still reword the lead's setup answers, until the brief is saved again.
8. **Who has shown their report is read only inside the check-in.** Groundwork staff who are not admins of that organisation are refused too.
9. **Request 50 keeps the lead's row** on a participant's board, because participants may already read the lead's name.
10. **Request 64 is for the lead only, even when patterns are on.** It has no place for the person to answer first, so decision 39 could not be kept for anyone else. The "setup never said" reading only ever has one period, so under the three-period rule it now never shows.
11. **Request 63: an admin who cannot see a target is told "has checked in, and nothing here needs you this week", even when the person is behind.** The request suggested saying they are behind, but "behind" is worked out from the hidden number, so I held it back.
12. **Request 66: the lead reads their own name on that one line,** not "you". That is the same as the round's report text beside it. The alternative is a second copy of the line for each reader.
13. **Request 35: a situation the lead picked always stands.** The only way to change it is pressing "It's something else".
14. **Requests 56 and 69: "N of M" counts everybody on the check-in,** including someone invited who never joined. The stricter rule, which leaves out a lapsed invitation, only decides when a round's report is written, and never prints a count.
15. **Request 58: a person's own private summary, and the lead's own setup report, may keep names the person typed.** Only that person reads them. The "stored without names" rule is for shared reports.
16. **Request 39: the screens workspace adds the unit and currency fields** to targets, so two workspaces do not write clashing database changes.
17. **Requests 10 and 15: a new suggestion does not replace one nobody has decided yet.** The thresholds, such as "below 6 in 10", are still yours to set.
18. **Request 21: leave is approved by the person's line manager** where one is set, and otherwise by the lead of their check-in.
19. **Request 23: only a manager starts a performance review,** as today. The product does not start one by itself.
20. **Request 71: the weekly report is written on Friday,** as in the prototype.
21. **Request 5: the situations are renamed to the prototype's names.** The client's list has to change on the same day, so it is written up but not done.
22. **What the lead weighs at the close is read only by the lead and the person it is about.** On a team check-in, that is the lead alone.
23. **Week 9: proof can settle a commitment as done** (a document the person added, or the colleague confirming it arrived), but never as missed.
24. **Week 9: "you kept 11 of your 20 commitments" is the person's alone.** Each person's load across check-ins is private, so the lead does not see this count.
25. **A goal the lead has not told the person about yet is not shown to that person.** It appears once the lead has told them. This is the more private option.
26. **On a check-in where each person sees only their own target, the product's own sentences never give a colleague's target,** even when that colleague said it out loud in their check-in. Their own words, shown word for word to the people in the check-in, stay as they are. This is the more private option.
27. **A goal the lead marked "not told" is hidden from the person,** reversing an older note in the code that said to show "you were never told". **Not done yet, and recommended next:** the model that talks to the person in their own check-in is still given that goal, so it could raise it. Taking it out is the more private option. It changes the conversation, so it needs two re-runs of the scenarios it affects, and there was no room for them today.
28. **Week 10, the first suggestion, is held, not built.** It would give the manager a suggestion about a person, built on counts like "kept 11 of 20 in the last four weeks". Each person's load across check-ins is private, and today that count goes only to the person. The two rules pull against each other. The more private option is to show a suggestion to the person first, and to the manager only as a plain line with no count behind it, but that is a product decision. Weeks 11 and 12b rest on it too. I moved on to week 12.
29. **Request 77: a person's own words are served in full, even when they give someone else's hidden target.** For example, if a lead who also takes part said "Aisha needs 40 shops" in their own check-in, an admin or a colleague would read that line under the lead's row. This follows decisions 4 and 5 and Hafsah's ruling, but it widens what people read, so please confirm it. The rule for a goal the lead has not told the person about still applies to people's own words.

---

## HANDOVER, 29 SEPTEMBER 2026: WHERE THIS WORK STOPPED

The work is moving to a new session on another account. Everything below was committed and pushed to `mine/wip/plain-reports`. The last commit before this note was `09fe5c0e`.

### What is finished

- **Week 6, the end card** (`47b4d04c`). When a check-in closes, the engine builds the prototype's "What is now in your record": each line with how it is known. It is built after the goodbye, because reading the record takes 10 to 47 seconds, and kept on the closing turn. The transcript serves it as `endCard`, only to the person themselves. Nothing reaches the record before they finish. Then exactly the card's lines are written, unless they said more after it. Migration `20260929090000_the_end_card_on_a_turn`.
- **Week 6, confirmed by the person who received it** (`eebc48a8`). This is the new field on record lines (`confirmedAt`, `confirmedByParticipantId`), with the rule Hafsah agreed. When the colleague who was waiting says in their own check-in that it is no longer in their way, the model picks the one line that says it was delivered, and code checks that the line is about the same thing. Migration `20260929100000_a_line_confirmed_by_who_received_it`.
- **Week 6b, the four marks on the session report** (`dafcfea1`, `1dbb26b6`). Every line in the session report's sections carries `mark` (proven, confirmed, said or memory), and each person's lines in "what each person said they did" carry `lineMarks`. One rule decides it for both the reports and the end card: `api/src/modules/reports/how-a-line-is-known.ts`. A line counts as proven only by a document the person added themselves.
- **Week 9, first step** (`aa91a8d7`). After each check-in, what the person says about their earlier open commitments settles them as done or not done. Anything else stays open. Migration `20260929110000_when_a_commitment_was_settled`.
- **Week 0, first step** (`55d13abb`). A colleague's hidden target is no longer given to the model that talks to a person in their own check-in.
- **Answers to the screens workspace:** request 7b part (b), and part of request 2, in `docs/requests-to-engine.md`.
- **The bug-fix branch** `fix/privacy-conversation-crash` (folder `groundwork-pr1`, local branch `wip/fix-privacy-conversation-crash`, up to `a89fd13f`) is saved on this computer only. This workspace may push only `wip/plain-reports`. Its last commit, the labels and the person's own session, is unfinished and untested. See `docs/pr-1.md`.

All three migrations are applied to the local test database `gw_pw9_1786222102` only.

### What is in progress, and exactly where it stopped

- **No step is half done.** Every change above is committed with its tests.
- **Run-17 was stopped by hand** at 29 September, early afternoon, because Hafsah asked for nothing to be left running.
  - It had finished 1 of 24 scenarios: sales, in `api/journey/all-24/run-17/sales.json`. It was part way through loans.
  - It ran on the build of `eebc48a8` (weeks 6 and 6-confirmed, nothing later), in one line rather than three parts, which is why it was slow.
  - It has not been scored.
  - The local API it used, on port 3000, was stopped too.
- **Nothing that this session started is still running.** One older API process from 20 September is still listening on port 3101. This session did not start it, so it was left alone.
- **Full test suite: not yet run** on the latest commit. By part, these passed: conversation, documents, people, grounds, reports and board (the last combined run was 4,677 tests across reports, board and conversation).

### What comes next, in order

1. Run the whole API test suite once: `cd api && npx jest --maxWorkers=3`. Before this work, three tests already failed on the base at `80beab98`, so compare against those.
2. Start a fresh full run, run-18, on the latest commit, in three parts as run-16 was (`api/journey/chunked.sh`). Rebuild the API first (`npm run build`), then start it from `dist/main` so edits cannot restart it mid-run. Score it with `tools/score_run.py --against docs/baseline.json`. Check that no engine-value number drops. Pay most attention to anything about the record, since the record is now written from the end card's lines.
3. Read what a person sees for the end card and the marks, as the lead, a participant and an admin. The reviewer's step has not been done for weeks 6, 6b, 9 and 0.
4. Tick task 2.7 only after steps 1 to 3 pass. The screens also need to fetch the card from the transcript after the close (see request 7b).
5. Then carry on with `docs/weekly-plan.md`:
   - week 6b's remaining parts (team report lines and the board's lines), once the stages question below is answered;
   - week 9's count, once the privacy question below is answered;
   - week 0's next step, once option 1, 2 or 3 below is chosen;
   - then weeks 10 onward.
6. Merge the screens branch every few days: `git fetch mine`, then `git merge mine/wip/prototype-ui`. It was last merged on 28 September, night.

### How to check on anything that runs

- A run writes to `api/journey/all-24/run-N/`. Each finished scenario gets a `.json` file, and `run.log` shows the scenario it is on.
- The API's own log shows the new steps as they happen:
  - "end card with N line(s)"
  - "wrote the N line(s) the end card showed"
  - "settled N of M open commitment(s)"
  - "confirmed-by-who-received-it"
- Small tools that read without writing are in `api/journey/`, which git ignores: `peek-end-card.ts`, `peek-confirmed.ts`, `peek-session-marks.ts` and `peek-the-prompt-targets.ts`. The usage is at the top of each.

### What needs Hafsah

1. **Who may see "kept 11 of 20 in the last 4 weeks"?** Each person's load across check-ins is private under the rules, so today only that person could see it. Showing it to the lead would change a privacy rule.
2. **Can proof settle a commitment?** For example, a document the person adds, or a colleague confirming it arrived. Today a commitment and a record line are not linked.
3. **Who can mark a to-do as done?** The lead can mark someone else's to-do done through the Context chat (`makeTheChange` in `grounds.service.ts`), while the to-do button says only its owner may move it.
4. **Where a deal's stages come from.** The team report's "What moved" needs the organisation's own stage names (Contacted, Need, Pitched, Qualified, Quoted). The engine has no stages anywhere.
5. **Week 0's next step touches the must-keep list.** The shared team report and the picture's opening are written from each person's target numbers. Taking them out would weaken "notices what does not add up". The options are: (1) leave them in, with the net that removes them from what others are served; (2) give the model the gap without the number, then check with a run; (3) write a separate copy for the lead. The recommendation is option 2.
6. **A total can give a number away.** "Yours is 21, of 270 across ten people" gives away a colleague's number when there are only two people. The fix is to show a total only when three or more people have a number. It tightens a privacy rule, so it needs a yes.
7. **The bug-fix branch cannot be pushed from this workspace.** If it should be saved to GitHub, push it from the `groundwork-pr1` folder with `git push mine wip/fix-privacy-conversation-crash`.
8. The earlier items further down this report are still open: the jargon bar, the ratings decisions, and the screens' requests marked Open.

---

## 28 SEPTEMBER, NIGHT: THE PULL REQUEST WORK IS STOPPED, AND THE BRANCH IS SAVED LOCALLY

Hafsah decided there will be no pull requests for now. The whole build is finished first and released once, at the end. I stopped both helpers: the one building the last privacy fixes on the bug-fix branch, and the one researching the second pull request.

The bug-fix branch is `fix/privacy-conversation-crash`, in the folder `groundwork-pr1`, and it is committed up to `a89fd13f`. Nine of its ten fixes are finished and tested. The last one (labels, the person's own session and the coaching note) was stopped partway. It compiles, but it has no tests yet. The details are in `docs/pr-1.md`. `docs/pr-2-plan.md` records that the research had found nothing yet when it was stopped.

**Needs Hafsah: the push of the bug-fix branch was refused.** The safety check refused `git push mine fix/privacy-conversation-crash:wip/fix-privacy-conversation-crash`. It then refused `git push mine wip/fix-privacy-conversation-crash` as well, after I had given the commit a local branch of that name. Those two were refused because of how the command was written (a folder change and a pipe on the same line). Then I tried the bare `git push mine wip/fix-privacy-conversation-crash` from this workspace, and it was refused for a clear reason: each workspace may push only its own branch, and this one is `wip/plain-reports`. I stopped there. The branch exists only on this computer. If you want the copy saved to GitHub, you can push it yourself from the `groundwork-pr1` folder with `git push mine wip/fix-privacy-conversation-crash`.

Next, I am back on `wip/plain-reports`: first the hidden-target tests, then week 6 of `docs/weekly-plan.md`.

## 29 SEPTEMBER, MORNING: WEEK 6 BUILT ON THE ENGINE'S SIDE, AND RUN-17 STARTED

**The end card** (`47b4d04c`). When a check-in closes, the person now gets the prototype's "What is now in your record": each line, and how it is known. For example, from a real sales check-in in the test database:
- "I have 31 applications that I've taken from businesses." with "You gave this from memory. Nothing written backs it yet."
- "My part is to contribute 12 approved facilities to the team target." with "You said this."
- On a new hire's check-in with documents: "I was told to go direct to the members without waiting for an introduction." with "From the document you added."
- Under "What happens next", at most one line: "If you have something written for any of these, such as a message or a photo, add it. Then that line counts as proven."

Three things I found by reading real cards, and fixed:
- A target with a number in it was called "from memory". Now only a line about what happened can be.
- The "next" line said "shows this" under six lines. It now says "any of these".
- Reading the record takes 10 to 47 seconds. So the card is built after the goodbye, never before it.

That last point means the screens have to fetch the card from the transcript after the close. I wrote this in the answer to request 7b.

Nothing reaches the record before the person presses finish. When they do, exactly the lines the card showed are written. If they said more after the card, the record is read again.

**Confirmed by the person who received it** (`eebc48a8`). This is the new field, with the rule I proposed and you said yes to. The colleague who was waiting on the work says, in their own check-in, that it is no longer in their way. The model then picks the one line of the other person's that says they delivered it, and code checks that the line is about the same thing.
- Read on 20 real waits in the test database: no line was wrongly marked.
- One was wrongly marked before I added the "same thing" check. A wait for "clarity on Wanjiru's project" was matched to a line about a letter.
- A line saying the deck was sent is confirmed. A promise to finish the pricing sheet is not.

**Tests:** 2,816 in the conversation, people and documents parts pass. Four tests that read the source now point at where the record read lives; they check the same things.

**Run-17** is running on this build, to check that no engine-value number drops now that the record is written from the card.

**Week 6b, the marks on the reports** (`dafcfea1`, `1dbb26b6`). Every line in the session report's sections now carries its mark. So does each line of "what each person said they did", as a list beside the lines. The end card and the reports use one rule, so a line reads the same on both.

Reading a real report found one thing, which I fixed. The lead's workplan had made a participant's "The build is on track for the 14th" and "I am waiting on legal" read as proven, because the plan mentions the 14th. A plan is not proof, so a line is now proven only by a document the person added themselves.

Tests: 2,222 in reports and board, and 4,677 across reports, board and conversation, all pass.

**Needs Hafsah: the stages of a deal.** The prototype's team report shows, under "What moved", each deal with its stages marked: Contacted, Need, Pitched, Qualified, Quoted ("Ringed is someone's word; filled is proven"). The engine has no idea of stages or deals anywhere. Nothing says where an organisation's stage names come from: the lead's rules in Context, a template, or something the lead sets. Until you decide, I have left `stages` out (screens requests 2 and 7c). The screens draw nothing when it is missing.

**Week 9, first step: a commitment is settled from what the person says next time** (`aa91a8d7`). The next check-in already asked "what happened" about each open commitment, but nothing wrote the answer back. Now, after each check-in, the person's own words are read against their commitments that were open when it started.
- A commitment is marked done when they plainly say they did it.
- It is marked not done when they say they didn't and give no new time for it.
- A new date, work in progress, "partly" and silence all stay open, because a promise that moved is not a missed one.

Checked live twice with the real model. Five commitments came back as done, not done, open (new date), open (half done) and open (not mentioned), both times.

**What already existed, so I did not rebuild it:** commitments are kept in four places (`Commitment`, `PersonObjective`, `GroundCommitment`, `OpsCommitment`). Kept could already be set by hand, and "finished" was already read into `PersonObjective`. Nothing ever recorded "missed", and no "kept 11 of 20" count exists anywhere.

**Needs Hafsah, three questions about week 9:**
1. **Who may see "kept 11 of 20 in the last 4 weeks"?** Your rules say each person's load across check-ins is private, always. The count is about one person, so today it could be shown only to that person. If the lead should see it too, for one check-in, that is a change to a privacy rule, so it is yours to decide. I have not built the count yet, because nothing reads it until week 10's suggestions.
2. **Can proof settle a commitment?** For example, a document the person adds, or a colleague confirming the work arrived. Today the two are not linked: a commitment and a record line are separate rows. Linking them means the model matches a line to a commitment, as it does for "confirmed".
3. **The lead can mark someone else's to-do as done.** They can do this by confirming a sentence in the Context chat (`grounds.service.ts`, `makeTheChange`), while the to-do button says "This one is somebody else's to move." These disagree. Which way should it go?

**Run-17** is running in one line rather than three, at about 12 minutes per scenario, so it will take about five hours. One card has already been built in it: 6 lines, on a real close.

**Week 0, first step: a colleague's hidden target is not given to the model that talks to you** (`55d13abb`). I mapped every place a target reaches the model. The worst was the check-in conversation itself. On a check-in where people see only their own targets, each person's model was still given everybody's numbers, so it could say a colleague's number to them. Now it gets exactly the targets their screen shows, and the lead gets all of them.

Checked on a real sales check-in's prompt: the colleague's 5,200,000 and 4,000,000 are not in it, in any spelling, and the person's own 3,400,000 and 3,000,000 are. The stored engine rule already says the person "has been shown these on screen". That is now true, so no prompt text changed.

**Needs Hafsah, week 0's next step, because it touches the must-keep list.** The team report and the picture's opening are written once and read by everybody. Their text is written from each person's own targets, for example "set 21, has said 14". Taking the numbers out, as week 0 says, would weaken "notices what does not add up: their number against the lead's", which is on the must-keep list (`docs/engine-value.md`). Three ways to go:
1. Leave the numbers in, and keep relying on the net that takes them out of what other people are served. This is what happens today, and nothing is lost.
2. Give the model each gap without the number, for example "has said less than the target set for them". The report still notices the difference, and the lead still sees the numbers on the board. It needs a run to show the number of differences found does not drop.
3. Write the lead's copy separately, with the numbers. Nothing is lost, but it costs one more model call per report.

My recommendation is 2, measured by a run.

**Needs Hafsah: a total can give a number away.** A person is told "Yours is 21, of 270 across ten people". With only two people, the total minus your own number is your colleague's number. The same sum goes into the check-in in one place. The fix is to give the total only when three or more people have a number. That changes a privacy rule, even though it tightens it, so I have not made it.

## 28 SEPTEMBER, NIGHT: BACK ON THE WEEKLY PLAN

**The hidden-target tests are already done.** They are the twelve cases in `d8fa3648`: a pronoun, the number two and three sentences after the name, the number before the name, a list, the target in words, and a row whose name and number are in different fields. All of them are now taken out.

**The screens branch is merged in** (16 commits, no conflicts). It includes a new `Mark` part on the screens, which is what week 6's marks will feed.

**Week 6: the prototype does have "confirmed by the person who received it".** You asked me to check before adding the field. Here is where it is:
- The mark itself is in the legend of the one-session report (`docs/prototype/screens/B4-reports-and-sharing/one-session.txt`, line 126) and of the team report (`team-report.txt`, line 130). The four marks are "Proven", "Confirmed by the person who received it", "Only someone's word" and "From memory only".
- The kind of line it marks appears in the check-in ("The buyer has now confirmed the meeting. That is in your record.", `B3-the-check-in/check-in-phone.txt`, line 10), in the person's own report ("Lakeside's buyer confirmed your meeting on the 29th, as you said.", `own-report.txt`, line 28), and on the You board ("Operations confirmed they now match.", `you-board-daniel.txt`, line 61).
- The check-in's own end card (`B3-the-check-in/check-in-end-card.txt`) does not use it. Its lines say "From the photo you added" and "You said this." That makes sense: a line said a minute ago cannot have been confirmed yet by the person who received the work. So the field matters most for the reports (week 6b).

**Week 6 in two steps.** First, the end card, with three of the four marks: proven, their word, and memory. That is being built now. Second, the new field for "confirmed". The screens send the four marks as `proven`, `confirmed`, `said` and `memory` (screens request 7b).

One thing the prototype does not say is **who confirms a line, and how**. My proposal: a line is confirmed when the person who was waiting for that work says, in their own check-in, that it arrived. The engine already records who waits on whom for what. I will build the field and this rule unless you want it done another way.

How the end card gets its lines: record lines are written today only when the person presses "That's right, finish". But the card has to show them before that ("Is anything wrong?"), and 49 places read record lines without waiting for a check-in to finish. So the engine now reads the record at the closing reply **without storing it**, builds the card from those lines, and keeps them with the closing turn. When the person finishes, exactly those lines are written, so the card and the record match. If they change something first, the record is read again, as it is today.

## 28 SEPTEMBER, DAY: HAFSAH'S DECISIONS ON RATINGS AND PATTERNS

**Ratings are never sent to anyone but the person they are about** (`828b4837`, decision 38 in `docs/decisions-merged.md`).
- **Before:** a lead or an org admin opening a report was sent every person's rating: how specific each person's answers were, how sure the picture of them was, and a closing tier for each person.
- **Now:** every reader, the lead and an admin included, is sent only the rating of their own answers. An admin who gave no answers of their own gets none.
- **I kept a person's own rating.** Your decision says ratings are never served to any reader. I read that together with the earlier decision of 1 September, that a person sees their own rating as a nudge, and with the prototype's Done page, which shows a person "How checkable today's check-in was, 4 of 5" and says "Only you see it". If you meant that nobody at all, not even the person, is sent a rating, it is one line to change, and the Done page would lose that panel.
- **A second leak, found while checking every route:** pressing Release on a report sent the admin the whole stored report. That included every person's rating, every person's private preparation for the talk afterwards, and the concerns about people. It now sends back only when the report was released. The screen never used what came back.
- **Checked on what a person actually receives,** on two real check-ins from last night, as the lead and as each participant. Reports carry only the reader's own rating. Check-ins carry only the reader's own. Boards carry none, and they still load.
- **A test** checks that the lead, an org admin and a participant each leave with nobody else's rating, and that Release returns no stored report.
- **One old test changed.** It checked the old rule, "a lead still sees everyone's reads". It now checks the new rule.
- **Tests:** all 10,413 API tests pass. The client passes 3,216 of 3,217. The one that fails is the screens workspace's "Jump to" sidebar test, as before.

**Pattern windows approved, with your addition** (`68ea3eab`, decision 39). When the lead sees a pattern the person has not answered, it now says so plainly. For example: "Femi saw this first and has not answered yet." Or, if Femi never opened it: "Femi has not seen this yet, and has not answered yet. It is shown to you because a week has passed since it came up for the third time." Patterns stay switched off until you approve the names, so for now only the tests prove this.

**The closing problem, and request 47 with it** (`75a28ddd`, `1a9ffa59`). Done, and re-run twice.
- **"This check-in will continue in two weeks."** is now read as a goodbye. When the product adds its last question, the goodbye comes off first. The person's own "You will continue to follow up" is never taken for one. Across every past run this matches 1 of 15,543 turns, the one Tobi read.
- **Request 47, the screens workspace's check-ins.** Those ids are in a database on the other computer, so I worked from the code and the description. I found two causes:
  - When the product decided the check-in was not over, and had no last question of its own to add, the model's "Your report is ready now. Speak soon." went out as written, and the check-in stayed open. This happened in 10 of 3,550 turns in last night's runs, for example "…Your report is ready now. Speak soon. What else should I know?". Now the goodbye comes off, and if nothing is left asking, Groundwork's usual question goes on. The streamed reply does the same.
  - "Please finish my check-in" was not heard as asking to finish, though "finish this check-in" was. Now it is, and so are a bare "Finish" and "Please finish.". A sentence such as "I want to finish the proposal by Friday" still is not.
- **Re-runs:** sales, seniorhire and snapshot, twice each. Snapshot is where the goodbye showed most.

  | Sales, seniorhire and snapshot together | Run-12 | Run-13 | First re-run | Second re-run |
  | --- | --- | --- | --- | --- |
  | A goodbye in a turn that was not the last | 4 | 3 | **0** | **0** |
  | A goodbye before "One more before this closes" | 0 | 0 | **0** | **0** |
  | Check-ins that closed naturally | about half | about half | **15 of 23** | **13 of 23** |
  | Proof asked for | 13 | 7 | 10 | 16 |
  | Specific detail asked for | 26 | 30 | 33 | 34 |
  | Blocker checked | 9 | 18 | 15 | 16 |
  | Past words brought back | 34 | 32 | 33 | 28 |
  | Commitments recorded | 32 | 43 | 29 | 27 |
  | Differences, agreements, per-person findings | 11, 18, 23 | 11, 16, 22 | 13, 19, 23 | 9, 19, 23 |
  | Turns that ask more than one question | 5 | 6 | 0 | 0 |

  - **Kept.** In both re-runs no goodbye came before a question or in a turn that was not the last, and more check-ins closed naturally.
  - Commitments recorded was a little lower in both. Per scenario it is inside the usual spread: sales has ranged from 11 to 38 across eleven runs, and seniorhire from 2 to 24. The re-runs gave sales 22 and 14, and seniorhire 7 and 12.
  - Nothing in the "problems in what people read" list came up.

**Request 46: a private file's name on the board** (`fc82c0a5`, `9758c050`).
- **How it got there.** When the lead attaches a file in her own check-in, Groundwork's reply names it: "Here is the context we have from team-plan.txt". Her answer echoed it, the line went on the record, and the report and board are written from every record line, whoever may open the document behind it.
- **Fixed in four places.**
  - The report is now written from the record with private file names taken out. The stored line is not changed.
  - A note that goes to everyone, "The numbers on this check-in come from team-plan.txt", now names the file only if everyone may open it.
  - Lines that anyone but the lead reads, on the check-in's page and in their own check-in, lose private file names, so notes stored before the fix are covered.
  - The session report lists by name only the documents the reader may open.
- **Seen for real in the local test database.** A note shared with everyone names `harvestline-q4-targets.xlsx`, a file only its owner can open, and participants were sent it. I will check it again as a participant once the API is rebuilt.
- **What stays:** what a document showed can still be said. Only which file it was is the owner's to share.

**Run-14, today's full run, on `9e808ab9`, finished at 11:45.** It has every fix above except week 3 and "Nothing checkable".
- **The checker fails it on one number: "proof asked for" is 37, against a baseline of 42.** The allowance is 10%, so 38 would have passed. Everything else is at or above the baseline.
- **This fall started before week 2.** Across full runs, "proof asked for" was 50, 53 and 53 on runs 8, 9 and 10, then 42 on run-12 and 38 on run-13, both before week 2, and 37 now. The one-question rule asked the model again 24 times in run-14, but the log does not say which question was dropped, so I cannot show that week 2 cost any proof questions. I have kept week 2. Week 4 of the plan is about asking for proof kindly, and its bar is exactly that this number goes up, so that is where I will fix it. Per scenario the drop is mostly seniorhire, which went from 9 and 8 to 3, 2 and 4.
- **For the first time on a full run, no turn asks two questions:** 0, against 37 at the baseline. This is task 2.2's bar.
- **Every problem count is 0,** the third full run in a row, so task 1.6 holds.
- **Quotes:** 619 of 619 served are word for word in the record.
- **The lead's private words:** none reached an invited person, the fourth full run in a row. The helper flagged six places. Four were the person's own words or the targets this check-in is set to show. In the other two, Groundwork told Patience "after six years", which is in the check-in's brief, not only in the lead's description of her.
- **Jargon in Groundwork's turns: 29**, against a bar of 10.5. Week 3 is not in this run.
- **The judgements: 20 could be tested, and I read 18 of them as clearly right. Two more, renewal and workplan, are close calls I would also count, which would make 20 of 20.**
  - Sales and openread were flagged incomplete, so they are left out. Advisor and shock could not be tested again: Peter never mentions the banks, and nobody mentions the missed QBRs or the champion leaving.
  - **Snapshot is right for the first time:** "Sign the lease document for the office move", which is waiting on the lead.
  - **Renewal**, a close call: it says there is "a single operational cause that has been known since March" and stops the talk being about the partner's performance, but it does not say in so many words that the cause is our own change.
  - **Workplan**, a close call: it finds both leads planning work with the same supplier, and says the plans are over budget, but calls it "two different projects" rather than one contractor counted twice.
  - **So run-14 meets your bar for task 1.5 on its own.** Run-13 did not, so the next full run decides it.
- **"Nothing checkable" and three faults in the lead's rows, checked live after this run** (`b450fbf2`). On openread the lead now reads "Nothing Kofi Boateng said this round can be checked yet", then "Ask Kofi Boateng for a photo, a message or a document that shows what moved". While reading the rows I fixed three faults that were already there: "Ask Jide Sanusi to speak to the handover from the current finance manager rather than write to them", "has been waiting 0 days", and a row saying "nothing here needs you this week" and then giving something to ask.

**Hafsah's correction: "Nothing checkable" is back on the lead's board** (`01379c6e`, decision 40 in `docs/decisions-merged.md`).

*What `a1747927` (27 September) changed, exactly:*
1. The board stopped reading the check-in's rating of how checkable the answers were. It looked instead for a number, a date or a document in the record of that round.
2. The reason "nothing checkable" was renamed "nothing to count yet".
3. Each person's row gained a sentence, `says`, in full sentences with the person's name, for every reason.
4. A stop-gap from before it, which turned "nothing checkable" into "nothing to do" so the lead never saw it, was removed.
5. A privacy test was added that proved the lead's board was the same however the check-ins were rated.

*What is put back, as the prototype words it:*
- The rating decides it again, as it did before `a1747927`. A check-in not yet rated is judged by its record instead, so nobody is marked "nothing checkable" just because the rating has not run.
- The reason is "nothing checkable" again. The screen shows the reason beside the name, so the lead sees "Nothing checkable", as in the prototype's "Omondi: nothing checkable".
- The sentence under it now reads, for example: "Nothing Miriam Wanjiku said this round can be checked yet. This is the second week in a row. A number, a date or a document for what moved would change that." The count of weeks in a row is new, from the prototype's "for 2 weeks in a row".
- What to ask next is new, from the prototype. Where nothing else is in the way: "Ask Miriam for a photo, a message or a document that shows what moved" when proof was missing, and otherwise "Ask Miriam for a number or a date for what moved this round".

*What is kept from `a1747927`, because it protects privacy:*
- Only whoever runs the check-in, and an admin, is sent these rows. A new test proves a participant gets none.
- No raw rating value is ever sent, and no sentence uses a rating word about the person.
- The rating changes only this one reason. Nothing else on a row moves with it.
- The full sentences for every reason stay.

*For Hafsah:*
- Decision 40 is written as the one exception to decision 38 from this morning. A report's other per-person ratings are still not sent to the lead or an admin. Say if you want those back as well.
- The prototype's "He says “worked on it”, but gives no error, code link or what he tried" comes from a pattern. Patterns stay switched off until you approve the names.
- Not yet checked live. The API keeps run-14's build until that run finishes, and then I will read the lead's board as the lead, a participant and an admin.
- The four tests that pinned `a1747927`'s rule now pin the corrected rule and every protection above.

**Week 3 of the weekly plan is built, and not yet measured live** (`edcaf719`, `7bdbec5b`). Run-14 is on the build before it.
- **Task 2.3, plain words.** The check-in's own word guard never looked for management words, although the rulebook bans them and the checker counts them. Now, when Groundwork itself brings in "pipeline", "escalate", "deliverable", "bottleneck" and the like, the reply is asked for again once, with the sentence quoted and a plain way offered, for example "sales not yet closed" instead of "pipeline". A word the person used first is left alone.
- **Task 2.4, good news first.** Openings of later check-ins already start from what the person said last time: 12 of 14 on both run-12 and run-13. Now the opener is also given last time's good news, in the person's own words, and says it back first, plainly, with no praise.
- **For Hafsah: the bar for 2.3 may not be reachable without changing how we treat people's own words.** The bar is 10.5 jargon words in Groundwork's turns across a full run. Runs 12 and 13 had 26 and 35, and 13 and 22 of those were the person's own word handed back, mostly "pipeline" in sales. This change can only remove the other part. The conversation standard says "Use the words the team itself uses". If echoes should not count, the bar is already close. If they should, Groundwork would have to stop saying a word the person just used.

**Found while doing week 3, for Hafsah: the scenario runs do not test the path people actually use.** The runner sends each message through the plain route. The screen uses the streamed route. The streamed route runs the one-question rule and the closing fixes when a turn is saved. It does not run the second tries: asking again when a reply used a word we never use, a management word, or two questions the save cannot split. So what the checker measures is a little better than what a person gets. There are two ways to close this, and it is your call:
  1. Run those second tries after the stream finishes, and replace the text on screen, which the screen already does for the closing line. The person would sometimes see the reply change.
  2. Make the runner use the streamed route, so that the runs measure what people get.
  The second can be done now, without changing what anyone sees. I would do both, in that order.

**Week 3, measured live twice and kept** (sales, seniorhire and loans, 12:02 to 12:51).

| Sales, seniorhire and loans together | Run-12 | Run-13 | Run-14 | Week 3, first | Week 3, second |
| --- | --- | --- | --- | --- | --- |
| Jargon in Groundwork's turns | 17 | 20 | 19 | 21 | 15 |
| Proof asked for | 10 | 8 | 11 | 13 | 15 |
| Specific detail asked for | 31 | 30 | 46 | 36 | 46 |
| Blocker checked | 10 | 17 | 14 | 16 | 23 |
| Past words brought back | 34 | 32 | 33 | 28 | 28 |
| Commitments recorded | 31 | 44 | 30 | 29 | 25 |
| Turns that ask more than one question | 8 | 10 | 0 | 0 | 0 |

- **Jargon went down only a little, as expected.** The new check fired 9 times in the first set and made the reply plainer 3 times. Of the 21 jargon words left, 15 were the person's own word handed back, mostly "pipeline". That part is your decision, above.
- **"Past words brought back" was 28 in both sets.** That is inside the spread for these scenarios, 26 to 37 across eight earlier sets, and the openings still start from last time in 13 and 11 of 14 later check-ins. So I kept week 3, but I am telling you plainly that it came in at the low end both times. The next full run will show whether it holds.
- **A fault found in the openings, and fixed** (`8d86e0db`): "Since then, 5 of the 4 people involved in this check-in have submitted". It came from an older line that counted finished check-ins rather than people.
- **Nothing in the "problems in what people read" list came up.**

**Weeks 4 and 5 are built, and not yet measured live.**
- **Week 4, task 2.5, asking for proof kindly** (`a0449e5a`). When someone says a piece of work is done, such as "I submitted the last of the eleven on May 23rd", and nothing shows it yet, Groundwork asks once, kindly, for the smallest thing that would show it, and says what it is for: "A photo of the signed order is enough. Then it counts as proven." Offline on run-14 it would have come up in 17 of 87 check-ins, 6 of them ones that never asked for proof at all.
- **Week 4, task 2.8, never commenting on shorter answers** (`f46a4b42`). The prompt already forbids it, and no turn in seven runs did it. The remarks are now also on the list of phrases the check-in never writes, so a slip is rewritten rather than sent.
- **Week 5, task 2.6, suggested answers** (`e313b579`). Each question now comes with two to four short answers the person might give, such as "Sent it. They want to wait until after December." and "Not yet.". They are built only from the question and the person's own last answer. They are stored on the turn, so they survive a reload, which needs one new empty column. That migration is applied only to the local test database.

**What is next, in your order:** measure weeks 4 and 5 live, twice, then carry on with the weekly plan.

## 28 SEPTEMBER, EVENING: THE PRIVATE FILE AND THE HIDDEN TARGETS, CHECKED LIVE (`d5f0e840`)

**The live check found a fault the tests had missed, and it is fixed.**
- **How it was checked.** No scenario has either case, so I added both to run-16's sales check-in, through the product's own API, as the lead would:
  - Bisi, the lead, set targets for Kwame (17) and Femi (11), each private to that person.
  - She attached a private file, `bisi-q4-plan.txt`.
  - One line of her record named the file and both targets.
  - The report was then rebuilt with the real model, and I read the board and every report read as Bisi, Kwame, Femi and Ngozi.
- **The file held:** only Bisi, whose file it is, ever saw its name.
- **The targets did not:** Kwame, Femi and Ngozi could each read the others' numbers on the session report and the rounds. Two causes:
  - The check for hidden targets ran before labels were turned into names. So a line that still said "Participant B" hid nothing. Labels now become names first.
  - "Kwame has three so far. … A target of 17 approved facilities appears in the record…": the sentence with the number did not name him; the one before it did. A sentence now goes when it, or the one just before it, names the person. A sentence further away stays, so "the team has 11 approved facilities" is kept.
- **Live again after the fix:** Bisi reads every target she set. Kwame and Femi each read only their own, and Ngozi reads neither. Only Bisi reads the file's name.
- **Cleaned up afterwards:** the added targets, file and record line were removed, and the report was rebuilt without them.
- **All 10,537 API tests pass.** This joins the release: it fixes a problem the release has.
- **Next:** the weekly plan from week 1, in small tested steps.

## 28 SEPTEMBER, EVENING: NEVER AN EMAIL ADDRESS AS A NAME (`fdc1439b`)

- **Before:** a lead was shown the address of someone who had not given a name, in place of their name. The model then wrote it into sentences such as "Start with zawadi.u8@example.test."
- **Now:** nobody is ever shown an address as a name. A person with no name is "a colleague", or "another colleague", as everywhere else. I also fixed four places that fell back to the address in words people read.
- **Text already stored with an address in it** is read once more when it is served, and the address becomes the name or the plain words.
- **Checked live** on run-16's seniorhire check-in: a stored "Start with <Tobi's address>." reads "Start with Tobi Adewale." to the lead and to Tobi. The stored report was put back exactly afterwards.
- **One thing to know:** a lead still sees an address where the screens list it beside a person, so they can tell who is who. It is never used in place of a name.
- **Next:** a live check of the private file and hidden-target fixes, with a scenario that has both.

## 28 SEPTEMBER, EVENING: RUN-16 PASSED, AND THE RELEASE CANDIDATE IS `6fe8d1fb`

- **Run-16 passes the checker: nothing is worse than the baseline.** It was the full run on the streamed route, with every fix in.
  - All 24 scenarios ran and no check-in broke; the stream's fallback caught 7 slow or busy moments.
  - "Proof asked for" is 38 against 42, inside the allowance. It was 52 on the broken run-15, so it moves a lot between runs.
  - No turn asks two questions. Every problem count is 0. All 576 quotes are word for word.
  - None of the lead's private words reached anyone, for the sixth full run in a row.
- **Task 1.5, the judgements: 20 right of the 22 that could be tested, 91%.**
  - Not right: contractreview, which assumes the contract promises a four-hour fix when the point is that the two of them read it differently, and handover, which names the payment arrangement but misses the spreadsheet on her own drive.
  - Close calls I counted as right: crisis (it lands on the on-call process, but does not name the stale rota), recognition (it names Victor, but only as its last thing to do) and pulse (it names the lead as the one holding the approvals).
  - Could not be tested: shock, where nobody mentions the missed QBRs. Sales was flagged incomplete.
  - **Task 1.5 is ticked.** Hafsah decided run-15 does not count, because it broke on a product fault now fixed. Run-14 had exactly 20 testable scenarios, so run-14 (18 of 20, 90%) and run-16 (20 of 22, 91%) are two in a row.
- **The internal-label fix, checked live after the run, found one more route:** labels used as keys in three maps of the report. Fixed (`6fe8d1fb`). Then 85 live reads, none with a label.
- **The release candidate is `6fe8d1fb`,** written into `docs/ready-to-deploy.md` with what it rests on. From here, nothing more joins the release unless it fixes a problem the release has.
- **The screens branch is merged** (`f0168cff`), as Hafsah decided, and will be merged every few days from now on. `6fe8d1fb` stays in `docs/ready-to-deploy.md` as a known-good point. The final proof is one full run on the combined code at release.
  - **On the combined code:** all 10,533 API tests pass once one label was changed to the prototype's words, "How checkable today’s check-in was" (screens request 62, which Hafsah had answered).
  - **The client passes 3,403 of 3,407.** One failure is the "Jump to" test, as all day. The other three are the screens workspace's own tests of files they are rebuilding: an unused component (`GroundTabRow.tsx`), a heading style, and a page layout. The merge changed no client file of the engine's, so they fail on the screens branch as it stands. I have told them.

## 28 SEPTEMBER, LATE AFTERNOON: NO INTERNAL LABEL REACHES ANYONE (`0bad62f2`)

- **The routes it took:** several fields of the session report, and the shared picture in the rounds, were written after the step that swaps labels for names, so they kept "Participant A" and "the initiator". A lead and participants read them on the session report and on "How this has moved".
- **Now every board and report read ends in one last step:** the board, the report, a session's report, the rounds, and where things stand against success. Any label left anywhere becomes the name this reader may see, or "a colleague" where they may not. A field added later is covered too, because it is served through the same step.
- **"You is aiming" and "until you sends it" are mended there as well,** only outside quotation marks, so people's own words stay as they wrote them.
- **Proven by a test** that serves the board and every report read to the lead, each participant and an admin who only reads, with people named to each other and not, and finds no label anywhere.
- Also fixed: dates that arrived on the screen as an empty object (request 53).
- **Not live yet:** run-16 is running on the build before this. It fixes a problem the release has, so it joins the release.

## 28 SEPTEMBER, AFTERNOON: RUN-15 DID NOT PASS, AND WHY

**Run-15 was the first full run on the streamed route (13:32 to 15:25, on `75b4d687`). It cannot be the release candidate.**
- **It found a real fault in the streamed route, and that is why it failed.** In 8 of the 24 scenarios one person's check-in stopped part-way, on "The reply could not be finished. Send that again." The model's stream did not open within 20 seconds (6 times), the network call failed (twice), or the model said it was too busy (once). The plain route's model call tries again on exactly these; the stream's did not. No earlier run saw it, because the runner used the plain route. People using the screen would have.
- **Fixed** (`4d91d5ec`): when the stream fails, the reply is asked for again the plain way, with its retries, and shown whole. The person sees the error only if that fails too.
- **Because of it,** 8 reports were one person short and flagged incomplete: renewal, discovery, loans, project, recognition, crisis, board and shock. So too few judgements could be tested for task 1.5. And one scenario, openread, could not be set up: adding a person took 6.8 seconds against a 5-second database limit while three parts of the run went at once. That is load on this computer, but I have added it to the questions for Abubakar, since a busy server could hit the same limit.
- **What run-15 still shows:**
  - **"Proof asked for" is back above the baseline: 52, against 42.** Week 4 works.
  - No turn asks two questions, every problem count is 0, and all 428 quotes are word for word.
  - None of the lead's private words reached anyone, for the fifth full run in a row.
  - Jargon in Groundwork's turns is 17 by the checker's count.
  - The checker fails it on specific detail (75 against 88), blocker checked (31 against 37), agreements (50 against 56) and patterns (84 against 100). All of those are counted from the check-ins and reports that broke, and openread is missing entirely, so they cannot be read yet.
- **Next: run-16, on a build with every fix,** the stream fallback and the privacy fixes from this afternoon included. It decides the release candidate.

## 28 SEPTEMBER, AFTERNOON: A PRIVATE FILE'S NAME AND A HIDDEN TARGET, ON THE BOARD (`7afee54e`)

- **Who could see each, before this:**
  - A lead's own file name reached anyone who read a board or report line that mentioned it: participants, and an admin who only reads. The fix this morning cleaned what reports are written from, but not every sentence served.
  - A person's target number reached anyone reading a sentence that stated it: an admin who only reads, in the row about that person, and other participants, in their report and in the aim on their board.
  - **A correction to my correction.** At first I called Ngozi seeing "Kwame Mensah is working towards a target of 14 approved facilities" a leak. Checked against the database, it is not. The sales check-in has no per-person targets set by the lead, only team targets. Kwame said his own target in his own check-in ("I'm aiming for 14 approved facilities"), and your rules let the people in a check-in see what each of them said in it. So the new rule has nothing to hide there. It does hide targets the lead sets for each person, which the test proves.
  - **For Hafsah:** should a number a person states as their own target in their check-in be treated like a target the lead set, and kept from colleagues when targets are each person's own? Today it is treated as their words, which colleagues in the same check-in may read.
- **Now:** everything the board and the report send is read once more for each reader. A file's name comes out where that reader may not open the file; a lead's own file is not named even to an admin. A sentence giving someone's target comes out where that reader may not see it. The lead still reads both.
- **Proven by a test** that serves the real board and report to the lead, the person whose target it is, another participant, and an admin who only reads.
- **It errs on the side of hiding.** A sentence that names a person together with their target's number goes, even if the number counts something else. A fact lost from a line is better than a target shown.
- **The wording requests are fixed too:** "Unblock: the discount decision" is now "Somebody is waiting on the discount decision, so it needs deciding." The head count counts the same people as the screens' header, and is all in words or all in figures: "Four of the six people have answered so far."
- **Not live yet:** the local API keeps its build until run-15 ends, so this is proven by tests for now. It fixes a problem the release has, so it joins the release.

**Four more privacy requests from the screens workspace, for Hafsah:**
- **Request 49: may someone held for a seat read a check-in's report?** Faraji joined through an open link while no seat was free. He is waiting for an admin to let him into the organisation. The check-in itself refuses him, but the report did not. Should he be refused until he is let in, or until he has answered himself?
- **Request 57: may any admin release a report, or only the lead?** Today any admin of the organisation can. The screens tell other admins that "sharing the report and ending the check-in are Rukia's to decide".
- **Requests 51 and 52 are fixed** (`ef212298`), because they broke rules already written. Before the report is released, a session's report now waits until the participant has answered that session, as the main report does. And one more rating field (`parties[].confidence`) no longer reaches other participants.

## 28 SEPTEMBER, AFTERNOON: THE PER-PERSON RATINGS, FOR HAFSAH TO DECIDE

**None of the engine's per-person ratings is shown to a lead or an admin in the prototype, except "Nothing checkable".** Four have something close on a lead's screen, but it is a different kind of thing. Until you decide, decision 38 stays: these are not sent to a lead or an admin, except as decision 40 says.

| Rating the engine makes | Does the prototype show it to a lead? | To an admin? | What the prototype shows instead, in its words |
| --- | --- | --- | --- |
| How specific each person's account was: high, moderate or low | No | No | One sentence in the weekly report, not a label: "Aisha and Miriam consistently get to specific customer needs and next steps." |
| Notes on each part of a person's account, such as "vague on evidence in session 8" | No | No | A pattern named after it comes up again and again, on the lead's board: "Visits without the shop's name, for 2 weeks in a row". |
| The cause of low or high specificity | No | No | Nothing. The ending screen names causes of outcomes ("Nobody set it up", "Improved after feedback"), not of how specific someone was. |
| How sure the picture of each person is | No | No | One level for the whole report: "How much this report can rely on: medium." |
| Whether a person's account rests on memory | Not per person | No | A mark on each line: "Proven", "Confirmed by the person who received it", "Only someone's word", "From memory only". |
| A closing tier for each person, such as MIXED or STRONG | No | No | A suggestion with its counts: "Groundwork suggests keeping Kwame on". The admin's review screen says "No scores." |
| How checkable one check-in's answers were | Only as "Nothing checkable" beside the name (decision 40) | No | The person sees their own: "How checkable today's check-in was, 4 of 5. This is about the check-in. Only you see it." |

**Other labels the prototype shows a lead beside a person's name**, none of them to an admin: "Drifting" (check-ins missed), "Behind the pace" and "On pace" (a count against the target), "Stops before the date" and "Stuck on a dependency" (patterns), and counts such as "8 of 9 commitments kept this month". The lead's setup screen also has a "Check-in grades" switch, turned off for some situations: "Check-in grades would feel like a judgement on the person here, so they stay off."

**So the choice is mostly whether any of these report ratings should reach the lead in some form.** The prototype's answer, read literally, is no: it shows patterns, marks on lines and counts, never a per-person rating.

**Hafsah decided (decision 43): keep decision 38, and follow the prototype.** The lead and admins get only the prototype's plain forms. Whether the engine produces each today:

| The plain form | Does the engine produce it today? |
| --- | --- |
| "Nothing checkable" beside the name, with what to ask next | **Yes**, since `01379c6e` this afternoon. |
| One level for how much the whole report can rely on | **Yes.** The session report carries "how much there is to go on", and the released report carries a band of strong, moderate or thin. The prototype's words are "How much this report can rely on: medium", so the screens should say it that way. |
| The pattern, once it keeps coming up | **Built, and switched off** until you approve the plain names (week 8). |
| The mark on each line: proven, confirmed, only their word, from memory | **Only in part.** Lines with a figure are marked "counted", "estimated" or "from memory". There is no mark on every line, and "confirmed by the person who received it" does not exist yet. Now in the plan as week 6b, after week 6 adds the field. |
| The suggestion with its counts | **No.** Nothing reaches a suggestion yet (weeks 9 to 11, which need your thresholds). |
| The sentence in the weekly report | **No.** There is no weekly report yet. Now in the plan as week 12b. |

None of the missing ones joins the release. They are in `docs/weekly-plan.md`.

**Run-15 is running on the streamed route, with the safety net fixed.** Checked against the build rather than from memory. The runner's log for run-15 says "Messages go through the streamed route." The API it talks to was built at 13:22, a minute after the fix (`e9301d42`), and the built code has it in. During the run, the log shows the streamed route asking the model again for management words, banned words and replies that ask two questions.

## AT THE TOP, 28 SEPTEMBER: IS IT READY TO DEPLOY?

*This section is kept up to date through the night. It was started at 00:36. The work stops at 05:36.*

**Is the engine ready to deploy? Yes, on the engine's side.** All seven deploy blockers are fixed, with tests, and proven on two full runs of all 24 scenarios, run-12 and run-13.
- On both runs every problem count in the scorer is 0, which meets task 1.6.
- No board or report carries a pattern.
- No invited person read any of the lead's private words.
- On run-13, every one of the 799 quotes served was word for word in the record.
- The checker passes run-13 with nothing worse than the baseline. It failed run-12 on three conversation numbers, and re-running the same build showed that was variation.

What is left before release is not the engine: it is the steps below, which need Abubakar and Hafsah. The judgement, task 1.5, is not yet at Hafsah's bar. Run-12 was 90% and run-13 was 81%, and the bar is two runs in a row at 90%. Hafsah decided the aim is deployment, with the judgement improving every week after.

**The last hour, 04:36 to 05:15:**
- Week 2 was measured live, twice, and kept. No turn asks two questions any more. One number to watch is below.
- A privacy fix: a participant was sent other people's ratings on a report still being put together. That is fixed, with a test.
- One privacy question is for Hafsah: the code sends the lead everyone's ratings on purpose, and CLAUDE.md says it must not. It is the first item under "What needs Hafsah".
- The screens workspace's newest work is merged in, and every API test passes on the merged code.

**Run-13's results, tonight's second full run, on `e7b9cd65`, read against the database and the actual sentences:**
- **The checker says nothing is worse than the baseline.** "Blocker checked" is back up to 42, and "specific detail asked for" to 85. That confirms run-12's low numbers were variation.
- **Every problem count in the scorer is 0 again,** so task 1.6's bar holds on two full runs in a row.
- **Quotes:** 799 of 799 served are word for word in the record, including the lines built when a page is opened.
- **Patterns:** none on any board or report.
- **The lead's private words:** none reached any invited person. The one match was Tobi's own words, "My role is to manage the relationships with our five largest clients". That is three full runs in a row with none.
- **Jargon in reports and boards rose to 180,** still far below the baseline of 511. It is mostly "pipeline" in sales and "bottleneck" in openread, which are the people's own words.
- **The judgements: 17 clearly right of the 21 that count, which is 81%.**
  - **Loans is clearly right for the first time:** "the problem is the loan program itself, which expects repayments before a new business can earn anything".
  - **Crisis** was flagged incomplete at five minutes. Its captured report holds all 3 findings and would count as right, but under the rule I have used every night I have left it out.
  - **Couldn't be tested:** advisor and shock again. Week 1 was in this run, but in both scenarios the simulated person still never said the fact.
  - **Not right:**
    - project: it says the team is blocked, not that they disagree on scope;
    - realign: it says one of the two directions came from the lead;
    - sales: Kwame's miscount again;
    - snapshot: the lead's own signature appears only as "follow up with Ravi".
- **So task 1.5 is not met.** Run-12 met Hafsah's bar, with 18 of 20, which is 90%. Run-13 did not, with 17 of 21, which is 81%. The bar needs two runs in a row.

**Run-12's results, read against the database and the actual sentences:**
- **The run is sound.** All 24 scenarios finished. Two reports were incomplete (implementation and newmanager, 2 findings for 3 people each), and those two are left out.
- **Task 1.6 is met: every problem count in the scorer is 0 across all 24 scenarios.** On run-10 there were 114 internal labels, 36 role descriptions used as a name, and 2 sentences starting in lower case.
- **Patterns:** no board or report served in the whole run carries one.
- **The lead's private words:** none reached any invited person. The check matched 4 people, and each match was that person's own words: Yemi said "I'm the account manager for the relationship" himself, for example. That makes two full runs in a row with none.
- **Quotes:** 479 of 482 were word for word in the record. The 3 that were not are all in lines built when the page is opened, which the quote check did not yet cover. That is now fixed (`4efa6a74`), with two more fixes behind it (`d1c35b87`, `6331337b`). Replayed over run-12, it is 480 of 480.
- **The judgements: 18 clearly right of the 20 that count, which is exactly 90%.** Advisor and shock could not be tested: Peter never mentions the other two banks, and nobody says first-hand that the reviews were missed. Loans and sales were not right. **Run-12 meets Hafsah's bar for task 1.5 on its own**, with at least 20 testable and at least 90% right. The bar needs two full runs in a row, and run-10 did not meet it, so the next full run decides task 1.5.
- **But the checker fails run-12 on the conversation.**
  - "Specific detail asked for" was 71, against a baseline of 88.
  - "Blocker checked" was 24, against 37.
  - "Turns asking more than one question" was 39, against 37.

  These count phrases in Groundwork's turns, such as "by when", "which" and "what have you tried".
- **The answer: variation between runs, not a change of mine.** I re-ran sales and seniorhire, the two scenarios that lost the most, twice on exactly run-12's build.

  | | Blocker checked, sales | Blocker checked, seniorhire | Specific detail, sales | Specific detail, seniorhire |
  | --- | --- | --- | --- | --- |
  | Runs 8, 9 and 10 | 10, 10, 15 | 2, 4, 7 | 21, 27, 27 | 9, 13, 8 |
  | Run-12 | 7 | 2 | 22 | 4 |
  | Same build, run again | 13 and 8 | 6 and 3 | 28 and 18 | 14 and 12 |

  On exactly the same code they came back into the usual range. So run-12 was a low draw, and there is nothing to drop. **Run-13, tonight's second full run, started at 03:10 on `e7b9cd65`.** It is the second of the two runs task 1.5's bar needs, and it also measures week 1 on advisor and shock.

**Run-11 does not count, and the product was not at fault.** I started it at about midnight, before tonight's five hours began, from a separate copy of the code, so that the builders' work could not change it halfway through. But the runner starts the model itself, to play the simulated people, and that copy did not have the model's credentials file, which is kept out of git. So every simulated person's answer failed. No check-in could finish, and no report was written: all 25 reports were empty. I found it by reading the log, stopped it, and started run-12 from the main folder, where the credentials are.

**What still blocks it:**
1. Run-11 must show that task 1.6 and the blocker fixes hold across all 24 scenarios: nothing worse than the baseline, every quote from the record, and none of a lead's private words reaching anyone.
2. The steps before release in `docs/ready-to-deploy.md`, which need Abubakar and Hafsah: the migrations with a backup, the one-off script that marks which record lines are people's own words, merging with the screens branch, and full tests on the combined code.

**What I finished tonight** (the list grows as I go):
- Item 2, the evidence for verdicts, requests through chat and being away, was done last night. It is in the section "The three capabilities I rated missing" below, and in `docs/capability-check.md`.
- Item 3, `docs/weekly-plan.md`, was done last night.
- **Item 5, the lead confirms the exact question (decision 34), is built on the engine side** (`5f30dde3`, `be5e9d78`, `d6d00a44`, `f1eb3fb2`).
  - **What the lead sees:** when the lead sets a question for a person, Groundwork writes it once, exactly as it will ask it. The lead reads, for example, `Groundwork will ask Ngozi: "Have you sent the Client B proposal?"`, and confirms it, changes its words or leaves it out, one question at a time.
  - **Only a confirmed question reaches the person's session, and it is asked word for word.** If the model rewords it, the product puts the confirmed words back before the turn is saved.
  - **What the question is written from:** only the person's first name and the lead's question, never the lead's private notes or their description of the person. Code checks the draft, and falls back to the lead's own words if the draft fails.
  - **Old questions:** questions set before today are not asked until the lead confirms them. They are shown to the lead as waiting.
  - **The new database column** is a migration applied only to the local test database.
  - **Proven by 29 tests**, not by a scenario run: no scenario sets a question through the context chat.
  - **For the screens workspace:** what it needs is written in `docs/answers-from-engine.md`, including the card with Confirm, Edit and Not now.
- **Item 6, guests use Ask Groundwork within their own check-in (decision 36), is built** (`d2a97ffe`).
  - **What a guest can ask:** what was agreed, what is stuck, what they said they would do, when their next check-in is, and what the report says. The answers are built only from reads that already show that guest just their own check-in, with a second list of allowed fields in code.
  - **What it never does:** it is never added to the host's list of people, never reads another check-in, the lead's judgement or a colleague's report, and never writes anything in the host organisation.
  - **The replies are written by rules, not by the model.** Anything else gets a plain refusal.
  - **For Hafsah:** an older piece of code matches check-in answers to the host's list of people by email. If a guest's email is also on an unclaimed entry in the host's list, their check-in words could be credited to that entry. That was true before tonight, and it is not fixed yet.
- **Item 7, week 1 of the weekly plan, is built, and not yet measured** (`020260e4`, `3fb7edf9`).
  - **The check-in now asks for what someone left out.** When a person speaks to only part of a set the lead named, the model is told, as context for its next question, which ones they left out. For example: "Grace named three: Equity, KCB and Co-op Bank. Peter has spoken about Equity only. Ask directly about the other two…". The same goes when a person describes something that happened without saying when.
  - **It asks each only once**, and takes "I can't" as an answer.
  - **It never asks again a question the person already answered**, not only the last one. Across three past runs this would have caught seven real repeats.
  - **No stored prompt changed.** It is context built in code.
  - **For Hafsah:** to find the set, a participant's session may now use the item names from the lead's own check-in words, such as the three bank names. It never uses the lead's sentence, and never people's names. It is used only on shared check-ins where people see each other. This rests on decision 4, but it is new, and the gate is one line if you want it narrower.
  - **Measuring it:** advisor and shock, twice each, after run-12.
- **Week 2 of the weekly plan (tasks 2.1 and 2.2) is built, and measured offline, not yet live** (`6f8e7036`, `91e3dc73`, `504f7271`, `5d65a68b`).
  - **One question per turn.** The gate that found a second question only logged it; a setting from 17 September had switched off the removal. Now every way a turn is saved keeps one question. It keeps the product's own question first, then the question that asks for a specific detail, a blocker or proof, then the first. An example written as a question stays as a statement.
    - Offline over runs 8, 9, 10 and 12, turns asking more than one question go from 132 to 0.
    - The first version lost too many detail and blocker questions, so the rule was changed. Now the checker's counts fall by at most 2 in any run, which is inside its allowance.
  - **The lead's name.** In turns to a participant, "your lead", "the lead" and "the person who opened this check-in for you, Michael Achebe" now become the lead's first name, for example "This record goes to Amaka." A sales lead and "take the lead" are left alone. Offline, 24 turns change.
  - **For Hafsah:**
    - When the product's closing line goes under a model question, the model's question is dropped so that the closing line is never lost. The other choice, holding the closing line for a later turn, would have lost it in more than a third of the cases seen.
    - "Your manager" is not changed, because it is often a person's own manager, who is not always the lead.
    - A few scenario packs in the database script two questions in one line, such as "How are you carrying this? What is the worry underneath it?". The code now repairs them when a turn is saved, but the real fix is in the packs, and those are yours to switch on (decision 20).
  - **Measured live, and kept:** sales and seniorhire, twice each, on the newest build, finished at 05:11.

    | Sales and seniorhire together | Runs before week 2 (run-12, run-13, and two re-runs) | Week 2, first pair | Week 2, second pair |
    | --- | --- | --- | --- |
    | Turns that ask more than one question | 5, 6, 5, 10 | **0** | **0** |
    | Proof asked for | 9, 5, 10, 9 | 5 | 5 |
    | Specific detail asked for | 26, 28, 42, 30 | 29 | 41 |
    | Blocker checked | 9, 16, 19, 11 | 11 | 15 |
    | Past words brought back | 34, 32, 37, 26 | 27 | 36 |
    | Commitments recorded | 31, 42, 46, 20 | 29 | 35 |

    - No turn asks two questions now, in either pair. Every other number is inside the range of the four runs before week 2, so I have kept week 2.
    - **One number to watch:** proof asked for was 5 both times, the bottom of the earlier range. The next full run will show whether week 2 lowered it. If it did, the rule that picks which question stays should put the proof question first.
    - Nothing in the "problems in what people read" list came up in either pair.
    - The lead's name reads naturally, for example "Who arranged for you to be in these meetings with Amina?".
    - **One new problem, once in 186 turns:** the model's closing sentence stayed in front of the product's last question. Tobi read "This check-in will continue in two weeks." and then "One more before this closes." in the same turn. It never happened in the four runs before, and not in the second pair. The fix is to drop the model's closing sentence when the product's last question is added. I have not built it, because there was not enough time left tonight to re-run it twice.
- **The screens workspace's newest work is merged in** (`338c4dbe`, 21 commits). The one conflict was in the import lines of `grounds.service.ts`, and I kept what both sides use. It brought no migrations. The one privacy test it changed only gained a constructor argument, and its checks are the same.
- **Every test, at 05:09, on the merged code.** All 10,408 API tests pass. The client passes 3,215 of 3,217. The two that fail are the screens workspace's sidebar tests, as before.
- **Every test, at 04:45 on `f75afe50`.** All 10,399 API tests pass. The client passes 3,195 of 3,198. The three that fail are the screens workspace's sidebar tests, which depend on the date or the time, not on engine code. The client's plain-wording check had caught one engine line joined with a colon. I rewrote it as two full sentences, and it passes now (`f75afe50`). One older test pinned the old form of the record-line code, and I updated it to pin the same rule (`cc0fb346`).
- **A privacy fix from the screens workspace's request 43** (`59a62cc3`). On a report still being put together, a participant who had already answered was served every other person's rating: how specific each person's answers were, and how sure the picture of them was. The released report already took these out, and this one did not. Now it does, and a test checks that every place a report is served takes them out. The screen never showed these, but the backend sent them.
- Item 4, where the existing 16 decisions disagree with the new ones, was done last night. It is in the section "Where the existing 16 decisions disagree with the new 14" below, and the list still stands for the new decisions 31 to 37.

**What needs Hafsah:**
- ~~A privacy decision on ratings.~~ **Decided by Hafsah and done on 28 September.** See the day section at the top.
- **Approve the 49 plain pattern names** in `docs/pattern-names.md`, and settle B5's name. Patterns stay switched off until then. Also approve the three-day and one-week windows before a lead sees a person's pattern.
- **Replace `docs/decisions.md` with `docs/decisions-merged.md`.** The file is protected; the step is below.
- **The thresholds for verdicts, and who counts as a person's lead for approvals.** Decision 33 says these are decided when that work starts: weeks 10, 11 and 21 of the weekly plan.
- **The questions for Abubakar**, in `docs/ready-to-deploy.md`:
  - How is the API hosted and released?
  - How do migrations reach staging and live, and is a backup taken first?
  - Four of the 45 migrations change or remove existing data. The document lists each one.
  - Hafsah's earlier pull request should be merged first.
  - Who runs the one-off script that marks people's own words, and when?

## The three capabilities I rated "missing": the evidence, for Hafsah to decide

**Nothing is hidden.** For each one, this is what the prototype shows it doing, exactly what was tried live on the local test database on 27 September, what happened, where the code is, and which parts already work. The full detail is in `docs/capability-check.md`, sections 4, 10 and 11.

**In short, "missing" is not the right word for all of it.** In all three, most of the parts are built. What is missing is the step that connects them to what a person actually does. In verdicts, nothing ever creates a suggestion. In requests, nothing takes a request from chat. In being away, nothing tells the engine who is away.

### Verdicts, suggestions and appeals

**What the prototype shows.** On Daniel's board, the lead reads "Groundwork suggests a performance plan for Daniel". Then: "Why: In the last 4 weeks, Daniel kept 11 of his 20 commitments", "What would change this: Keeping 8 in 10…", Daniel's own answer, and "This is only a suggestion. You decide, and Daniel sees your reasons", with Agree and Choose something else (`C3-suggestions-and-appeals/suggestion-daniel.txt`). Daniel's own page says "Where you stand… Wairimu has not decided anything yet… Add my side" (`what-daniel-sees.txt`). The ending page suggests "keeping Kwame on" (`suggestion-kwame.txt`). A review suggests recognising Aisha's work (`suggestion-aisha-in-review.txt`).

**What was tried, and what happened:**
- As the lead, Tunde, opening the suggestions for his check-in (`GET /grounds/…/suggestions`) returned an empty list.
- As Ngozi, a participant, the same route returned the same empty list.
- As Tunde, opening the appeals was refused: "Only an admin of this organisation decides an appeal." That is right.
- As an admin, the appeals list was empty.
- As Ngozi, her You page (`GET /you`) had no "Where you stand".
- The `suggestions` table has 0 rows.
- All 1,040 recorded commitments have the status "unknown". So "kept 11 of 20" cannot be counted for anybody.
- The performance reviews suite is off, and when on, its list of reviews due can only be filled by an outside system.

**Where the code is.** `api/src/modules/suggestions/` holds the service, the controller and `a-suggestion-told-like-a-signal.ts`. These were built by the screens workspace. The reviews are in `api/src/modules/suites/the-reviews.service.ts`. The ending page is in `api/src/modules/resolution/`.

**What works:**
- A suggestion, once one exists, is shown to each reader in the right shape. The lead gets the headline, why, what would change it, the person's answer and the choices. The person gets the facts and the decision, and can add their side and appeal. An admin decides appeals.
- The verdict word itself, such as "plan", is never shown to anyone. Labels such as "PIP" and "at risk" are refused when the text is stored.
- The ending page works: the lead chooses how it ends and gives a reason, and the person reads it.
- The lead's judgement, which is not the same thing as a verdict, works and is often right. For the performance-plan scenario it says the target was never written down, which is the right answer.

**What does not work yet:**
- Nothing in the engine ever creates a suggestion.
- Nothing marks a commitment as kept or missed, so the number a verdict would rest on does not exist.
- There are no thresholds yet. Hafsah has decided those come later, when this work starts.

### Requests through chat: leave, spending and hours

**What the prototype shows.** "I need next Thursday and Friday off." Groundwork answers: "You have 16 days left and nobody else in Sales is off then. Shall I send it to Wairimu?" (`E-suites/suite-leave.txt`). "Can I spend KES 18,000 on fuel…" is checked against the budget and the rules and sent to the right approver (`suite-spend.txt`). "I spent 3 hours at Naivas Ngong Road today…" becomes "Written down: 3 hours on Naivas Ngong Road, 1 hour on Lakeside. Is that right?" (`suite-time.txt`). "Nobody fills in a form."

**What was tried, and what happened**, in Ask Groundwork as Ngozi:
- "I need leave from 12 to 16 October", "Can I spend 45,000 on a laptop?", "Log 6 hours on Atlas today" and "Book me off Monday" all got "I cannot answer that one yet". Nothing was written.
- "I will be on holiday next week so I cannot check in" was offered as "Shall I note that down". After a yes, it became an open commitment, a promise to be followed up in her next check-in as if it were work.
- In the check-in, Tunde wrote "Also, I need leave from 12 to 16 October, and can I spend 45,000 on a laptop? I did 6 hours on Atlas today." The reply ignored all three and asked about something else.

**Where the code is.** `api/src/modules/suites/`: the leave board, spending and time sheets services, and `who-approves.ts`. The functions that would record a request are there: `LeaveBoardService.ask`, `SpendingService.check` and `.ask`, and `TimeSheetsService.record`. The screens workspace built them, and asked the engine to connect them in its requests 21, 22 and 26, which are still open.

**What works, tried live through the suite's own service:**
- A leave request for Yemi was recorded, waited on the admin's board, and showed under "who is off" once approved.
- Her days left were worked out correctly from the approved days: 10 of 20.
- The approval rules, who else is off, the budgets, the privacy walls for each reader, and hours kept for billing only all work.

**What does not work yet:**
- Nothing in chat, the check-in or WhatsApp creates a request.
- Nobody is told a request is waiting.
- Only the organisation role LEAD can approve, which most organisations do not use.

### Being away

**What the prototype shows.** People on leave appear under "who is off" on the leave board, and a person's days left are shown to them (`E-suites/suite-leave.txt`). Hafsah's decision 31 says the engine may know the dates of approved leave, dates only. The engine's own rule says time on leave is paused and never counted against anyone.

**What was tried, and what happened:**
- I approved leave for Yemi covering today, and read the lead's board and Today before and after.
- The board still listed her first as "Yemi Adeyinka has not checked in for this round yet".
- Today still counted her among "6 people haven't yet".
- Her leave dates on the check-in were still empty.
- From the code, not run: the "your next check-in is open" email, the reminders on day 3, 7 and 14, the "you have missed 3 check-ins" email, and the lead's email naming who has not started all go to someone on leave.

**Where the code is:**
- `api/src/modules/conversation/participation-timeline.ts` holds the rule for leave: paused, never counted. It is tested in `absence-is-not-a-signal.spec.ts`.
- The dates have a place, `ground_participants.leave_periods`.
- Approved leave lives in the leave suite (`api/src/modules/suites/the-leave-board.service.ts`).

**What works:**
- The rule is written and tested.
- Coaching already uses it, and does not coach someone who is on leave.
- The leave suite records and approves leave correctly.
- Patterns and the judgement are not affected by a missed round, because they read what people said, not missed rounds.

**What does not work yet:**
- Nothing writes the leave dates where the engine reads them. A test today stops anything outside the suites from reading leave requests, and decision 31 now allows the dates to be copied across.
- So the board, the round count, the reminders and the emails still treat someone on leave as missing.


## 27 SEPTEMBER, NIGHT: THE CAPABILITY CHECK AND THE DEPLOY BLOCKERS

- **The capability check is in `docs/capability-check.md`.** Eleven capabilities were tried live. Eight partly work and three are missing. The work is after deployment, except for the blockers below.
- **Seven deploy blockers, all being fixed, one builder after another.** The full list, and whether each is fixed, is in `docs/ready-to-deploy.md`. Blockers 1 to 3 are the patterns, which are being switched off on every board for every reader. Blocker 4 is bank details. Blocker 5 is a lead's private notes in a person's own session. Blocker 6 is Ask Groundwork, which you decided must work before deployment. Blocker 7 is the board crash for a participant when colleagues are hidden.
- **Hafsah's three new decisions are added to `docs/decisions-merged.md`** as decisions 31 to 33:
  - the engine may know the dates of approved leave, dates only;
  - a lead's private notes never reach the model in that person's own session;
  - who counts as a person's lead for approvals, and the thresholds for verdicts, are decided when that work starts.
- **Ask Groundwork in the live code.** The live code (`be8b48d9`) has no Ask Groundwork for signed-in users at all. The assistant is reached only through a customer's embedded panel or WhatsApp, and only for people on the organisation's connected list. The fix being built changes one file. It finds, claims or creates the person's entry when they ask. Claiming matches only on a confirmed email address, and never across organisations. If a switched-off entry exists, it refuses.
- **All seven blockers are fixed in code, with tests** (`b959934a`, `e12cf225`, `6feccb79`, `c6721519`, `75174e28`, `8e940c9c`). A further privacy gap, colleagues' names on a board where people are hidden from each other, was found and closed along the way. Every API test passes: 10,220 of 10,220. Ask Groundwork was tried live: a user with no entry on the list got a real answer, and exactly one entry was made for him. That try left one new entry, and his question and answer, in the local test database. None of this is proven on a full scenario run yet. That is tomorrow's first run.
- **The checkers' test data is cleaned up,** in one transaction, in the local test database only.
  - 149 rows were deleted, all in the Meridian test organisation, in the window the checkers worked.
  - Two sessions the checkers had started, which existed before them, were put back to "not started".
  - The three test users have their original seed passwords back, not "test", and their saved sign-in tokens are cancelled. Signing in with "test" is refused for all three.

## 27 SEPTEMBER, EVENING: THE AIM IS NOW DEPLOYMENT

**Your change of direction, recorded.** The aim now is deployment, not reaching task 1.5's bar. I have stopped working on the judgements to reach it. These are the only things left before deployment:
1. The four items below.
2. In sales, a judgement must never praise a claim the material shows is wrong.
3. Task 1.6, the automatic check on the text each reader sees, including titles such as "Dr".
4. `docs/ready-to-deploy.md`.

Everything else, phase 2 included, waits until after deployment.

### Sales: a judgement never praises a claim the record's own numbers contradict

- **`6628e6b6` and `7d5c36dc`: a check in code, not in the prompt,** because a prompt line had already lost on this scenario. Before the judgement is stored, every section of it is checked, along with each person's finding, the opening and the picture. The check holds back three kinds of sentence:
  - a move that praises someone for reaching a figure;
  - a claim that someone exceeded, beat, met or is ahead of a target, where no figure in the record, in the target's own unit, reaches it;
  - a figure called approved, completed or successful where the record says otherwise.

  A figure in a different unit never counts. 22 in the pipeline, or 22 applications, does not meet a target of 14 approved facilities. Nothing is written in place of what is held back, and no field is left blank.
- **On run-8's stored judgement it holds back exactly three lines**, all about Kwame and all contradicted by his record of three approved and 22 applications. For example: "Ask Participant C how they achieved 22 approved facilities when their target was 14."
- **Tested live on two sales runs.** Neither judgement praises Kwame. The first run's finding is exactly right: "Kwame has 22 applications, of which three have been approved and disbursed for N8 million."
- **The live test caught the check being too eager, fixed in `2d1610ec`.** It had held back statements of goals, such as "Participant B is working to achieve 14 approved facilities" and "The initiator's goal is 40 approved facilities". It had also held back one true sentence, "Participant C has three approvals". A goal is not a claim, and a figure the record supports is never held back. On the two new runs it now holds back nothing, and on run-8 it holds back only the three Kwame lines.
- **Not yet run live on `2d1610ec` itself.** That happens with task 1.6's test runs, so that one build carries both.

### Task 1.6: the automatic check on the text each reader sees

**Built, and not yet proven on a full run.** Today's two full runs were used before it was finished. The first full run tomorrow is its test.

**The fixes at the source, one commit each:**
- **`eb997d7a`: labels.** Each finding carried a raw field, `"label": "the initiator"` or `"label": "Participant A"`. That was 113 of the 114 "internal labels shown". No screen displays it, so it is no longer served, but it stays in storage.
- **`2ebe9127`: "the person who set this up".** Groundwork had said to Mei, "Mei, the person who set this up wants to understand…". The conversation now uses the lead's first name, or "your lead" when there is none.
- **`1edbc3e9`: the clipped line built from the lead's description of a person.** "Ngozi Eze was taken on for: Relationship officer, Ikeja. … What the record holds about it: …" was all 36 of "role description used as a name". It is now in full sentences, and it is still the lead's alone.
- **`aae42a6e`: sentences starting in lower case.** Both were in Groundwork's conversation turns, and they are now caught before a turn is saved.
- **`12555e10`: titles.** A person's short name is now their first name, not their title. Dr, Prof, Eng., Engr., Hon., Mr, Mrs, Ms, Miss, Sir, Dame, Chief, Alhaji, Alhaja, Rev, Pastor, Barr., Arc. and Justice are all handled, with or without a full stop. "Dr Amina Bello" becomes Amina. "Dr Bello" and "Mrs Okafor" stay whole. A person actually named "Hon" stays "Hon".
- **`d89628ae`: "You agrees".** "The initiator agrees" had reached the lead as "You agrees". It now reads "You agree".
- **`9c662ad7`: "All two people have answered".** It now reads "Both people have answered."

**The check itself (`3d346e4e`).** Before a report is stored, every line is rendered as the lead and as each participant would read it. The scorer's own problem patterns run over each version. A spec reads `tools/score_run.py`, so the two cannot drift apart. The check also looks for doubled quote marks, and for a verb that does not agree with "you".
- A line that fails is rewritten once by the model. The rewrite is kept only if it reads clean for every reader and every quotation is unchanged.
- Otherwise the sentence is dropped, without leaving any field blank.
- Every rewrite and every drop is logged.

**On run-10's stored reports, served again through the new code:** every problem count is 0, except six old sales lines already in storage. Those change when the report is next written.

**Tested live on sales, seniorhire and openread, twice each:**
- **Every problem count in the scorer is 0 in both rounds.**
- **Openread is right in both.** Both judgements join Kofi's Thursday scramble and Mei's delayed fixes to the Friday freeze, which is exactly the right answer.
- **Two defects found, both being fixed now:**
  - **A quote nobody said.** The model wrote 'incredibly tight timelines' in single quotation marks, which the quote check does not treat as a quote. The check's pronoun rewrite then turned them into double quotation marks. Sofia never said those words. The quote checker caught it: 162 of 164 quotes were right, and 2 were not. The fix: single quotation marks count as quotation marks, and the quote check runs again after any rewrite.
  - **It made reports slower.** For openread, the time from the last check-in to the finished report went from 112 seconds to 223 and 253 seconds. The check was calling the model once per sentence, and there were 53 rewrites in these runs, mostly pronoun fixes. For a team of nine, whose report already took five to six minutes, that would be worse. The fix: one model call per report for all its rewrites.
- **Two grammar slips still reach the lead:** "You also believes…", and "…but has not communicated this", with no subject. Both are added to the check.

**The rule "every verb keeps its subject" is in the stored prompt, as you decided (`33c1694a`, `ff318f1e`).** It was appended in code after the stored prompt, so no report's `promptVersionId` showed it. It is now part of the stored `report_synthesis` prompt, and the copy added in code is removed. On restart the product created and activated **`report_synthesis` version 7**. I tested sales, seniorhire and openread once each:
- every report records version 7;
- every problem count in the scorer is 0;
- 260 of 260 quotes are word for word in the record;
- the judgements read as before.

One old example in the rules the code adds after the stored prompt had the same fault ("…and has completed six", with no subject). It contradicted the new rule, so I corrected that example only, and added no rule text there.

**What it does not cover yet:**
- The board's own sentences, which are built when the board is opened, not stored. The check sees the report text the board uses, but not those.
- The pronoun check in conversation turns.
- Two counts that mix a word and a figure, such as "Two of the 5 people have answered so far".

**The praise check reads the lead's description of each person, to find their target (`e4c2b18b`).** For Kwame, the target of 14 approved facilities is written only there. The check only takes sentences out, never adds any, and calls no model. A test proves none of the description's words reach its output. It is the one internal read of the lead's words that decision 30 allows in practice, and I have written it down so it is not a surprise.

### Hafsah's decision on the bar for task 1.5

**Task 1.5 is met when, in two full runs in a row, at least 20 of the 24 scenarios can be tested, and at least 90% of those are clearly right.**

**Where it stands: not met.** Run-9 meets it on its own: 20 could be tested and 18 were right, exactly 90%. Run-10 does not, because only 18 could be tested. The table below is corrected for openread (see the note there). On it the runs score 17 of 22, 14 of 23, 16 of 22, 18 of 20 and 15 of 18.

### Scenarios that couldn't be tested in two or more runs, and what their scripts say

**Two scenarios: advisor (4 of 5 runs) and shock (4 of 5).** I had also listed openread, and that was my grading mistake: see the note on the table.

- **advisor.** The key fact is in the simulated advisor's script. It says he "has never worked with KCB or Co-operative and could not open either door". But the script also says he "does not volunteer limits, but is honest about them when asked a direct question". So he only says it if Groundwork asks him directly which of the three banks he can actually open. In four runs of five it never did. **This is a gap in the conversation, not in the script.** The script does what the scenario is meant to test.
- **shock.** All three warning signs are in the scripts. Tobi has both cancelled quarterly reviews, in June and September, and the champion leaving in July. Hana has the tickets going from 9 to 31 in August. Tobi's script says he is "defensive at first, then accurate", and "has the dates once he stops explaining". So the dates come out only if Groundwork keeps asking for them. In four runs of five it did not get all three. **This is also a gap in the conversation, not in the script.**

**No script needs to be firmer, so I have written no improved versions.** Making the simulated people say these facts without being asked would stop the scenarios testing whether Groundwork asks. For both, the fix is in the conversation: asking a direct question about a stated limit, and asking for dates. That is phase 2 work, so it waits until after deployment.

### Loans: why its report was incomplete, and a product problem

**The product is slow for a team of nine, and that is a product problem.**
- From the ninth person checking in to a report that includes all nine people took **4 minutes 41 seconds, 5 minutes 47 seconds, 5 minutes 55 seconds, 5 minutes 45 seconds and 5 minutes 30 seconds** in the five loans runs I can measure.
- The report is written again after every check-in. For nine people, each rewrite takes 3 to 4 minutes. Reading the nine accounts together takes 48 to 60 seconds of that. The rest goes on writing the report and on retrying when a check fails, for example a quote copied word for word, or a sentence that counts people. The rewrites queue one after another.
- **Until the last rewrite finishes, the lead reads a report that leaves some people out.** In run-10 it held 6 of the 9 findings for about six minutes.
- The runner's five-minute wait was shorter than that, so loans was marked incomplete in almost every run, even when its judgement was right.

**The runner now waits longer for a larger room (`8255ab04`, not yet used in a run).** It waits five minutes for up to four people, plus a minute for each person after that, up to fifteen minutes. For loans that is ten minutes.

**The product problem itself is not fixed.** It is listed in `docs/ready-to-deploy.md` as a known problem.

### Where the existing 16 decisions disagree with the new 14, or look out of date

I have changed nothing. This is the list for Hafsah to read before she replaces `docs/decisions.md`.

1. **Decision 4 against decision 17.** Decision 4 says what people say can be shown word for word to the people in that check-in. Decision 17 says colleagues who give views in an evaluation check-in are not named to the person being reviewed. Showing a colleague's words word for word can give them away, as surely as a name or a job title does: their way of putting things, a detail only they would know. Decision 4 does not say that evaluation check-ins are an exception.
2. **Decision 4 against decision 30.** Decision 4 lists what stays private: questions to Ask Groundwork, each person's own report, a lead's private notes, and each person's load. Decision 30 adds a lead's private description of a person, but decision 4's list does not include it. It would be clearer if decision 4's list pointed to decision 30.
3. **Decision 5 against decision 30.** Decision 5 says admins see every board and report. Decision 30 says a lead's private description of a person never reaches anyone else. The board now serves that description only to the person who runs the check-in, so an admin reading the same board does not see it. That follows decision 30, but decision 5 as written says admins see everything on every board.
4. **Decision 9 against decision 28: two meanings of "setup".** Decision 9 means a new person getting set up in their job: onboarding problems never count against them. Decision 28 means the lead setting up a check-in: that is not the lead's first check-in. Both use the word "setup" for different things.
5. **Decision 3 and decision 27, the word "role".** Decision 27 says a member sees colleagues' names, roles and teams. "Role" there has to mean the person's role in the organisation, not the sentence a lead typed about them, which decision 30 keeps private. Decision 3 also uses "role" for the role in the organisation. It would be safer if decision 27 said so.
6. **Decision 21 has two sentences that seem to disagree.** It says "there are no free check-ins". It also says that while the trial setting is off, billing works exactly as it does today, and that switching the trial on removes the free first session and the free plan. So while the setting is off, which is the case today, there is a free first session. "No free check-ins" is true only once the trial is switched on.
7. **Decision 17 against quotes shown word for word.** Since today, every quote a person reads is the original words from the record. In an evaluation check-in, the reviewed person may read a colleague's exact words. This is the same point as item 1, made sharper by today's work.
8. **Decision 12 against decision 18.** Decision 12 says claims are "the person's word" until they are checked. Decision 18 says people's own words are never changed to improve a score. There is no conflict, but decision 12's "the person's word" means a claim not yet checked, and decision 18's "people's own words" means the text they wrote. The same phrase does two jobs.
9. **Decision 6, the verdict names.** Decision 6 lists the verdicts as keep, reward, support, plan and exit. The screens workspace's new suggestions store the same five. Decision 17 names "a performance plan, a promotion, a renewal" as the evaluation check-ins. Those are not the same list, and nothing says how they relate. This is not a conflict, but it could be read two ways.

Nothing among the existing 16 looks out of date apart from these.

## 27 SEPTEMBER, THE DAY SESSION: where I am now

This section is kept up to date as I go. If it stops partway, that is where I got to.

### Run-10, today's last full run: the lead's words stay with the lead, checked in the database

Run-10 ran on everything up to `3f323d61`. It includes all the routes by which the lead's description leaked, and the new wording for unnamed colleagues.

- **The run is sound except for loans.** Its report was incomplete again (6 findings for 9 people). Every other captured report matches the database.
- **The lead's words no longer reach the person, checked in the database.** For every invited person whose record holds a description the lead typed, I looked for any run of five words from that description in two places: Groundwork's turns to that person, and what that person is served (their report and their board).
  - **Run-9, before the fix:** 27 of 27 people had such runs of words.
  - **Run-10:** 2 of 27. Both are the person's own words, not the lead's. Femi said "My goal is 12 approved facilities this quarter" himself. Tobi said he was to own "the relationships with our five largest clients", and the lead said the same in her own check-in. So there are no real leaks left.
- **Invited people are asked who they are.** In run-9, no invited person was asked the question. In run-10, 11 were, all in the situations about starting something: advisor, cofounder, handover, newmanager, project, renewal and seniorhire. The others are in situations where that question is not used, and most of them are asked about their part anyway, for example "What did you understand your role in this to be?".
- **Every quote is from the record.** 427 of 427 quotes are word for word what people typed.
- **The checker says nothing is worse than the baseline.** "Blocker checked" is 54 now, well above its baseline of 37. It had been sliding.
- **Two numbers rose since run-9, and neither is past the baseline.** Jargon in Groundwork's turns rose from 13 to 38, and in reports and boards from 84 to 138. Almost all of it is the word "pipeline" in the sales scenario, 108 times, and the simulated people used jargon twice as often this run (31 times against 15). It is the same pattern as run-6, and I see no link to today's changes.
- **The judgements: 15 clearly right of the 17 that count, and 15 of all 24.**
  - **Couldn't be tested (6):** advisor, drift, handover, openread, shock and workplan. Each time the simulated people left out a fact the answer depends on. That is more than in any other run, and I would not read this run's number as a step back.
  - **Not right (2):** sales and realign. In sales it is Kwame's miscount again. In realign, the simulated Ruth called Omar the CEO, although Omar is the team lead, and the gap followed her and said two of the priorities "came from you". Its actions do name the CEO's dinner with Marco. I have graded it not right rather than untestable, because Marco's account of the CEO was clear.
- **A small defect for the wording check.** "Success for Dr means…". The code took the title in "Dr Amina Bello" as her first name.

### Hafsah's decisions, merged into one file for her to put in place

`docs/decisions.md` held only 16 of Hafsah's decisions. It is a protected file that I cannot change, so the full version is in **`docs/decisions-merged.md`** (`ef147ceb`).
- Decisions 1 to 16 are exactly as they were, byte for byte. Checked by comparing the two files.
- Decisions 17 to 30 are added in plain sentences. They cover: colleagues in evaluation check-ins, people's own words never changed for a score, pattern names, the 50 packs, the free trial and prices, naming the organisation at sign-up, signing up, sign-in wording, no guided tour, security, who sees colleagues, the setup not being the lead's first check-in, naming check-ins by topic, and a lead's private description never reaching anyone.

**The step for Hafsah, in an interactive terminal of her own:** replace `docs/decisions.md` with the merged file without its first six lines (the note at the top), then delete `docs/decisions-merged.md`, and commit.

### Request 36, privacy: a person's label could be the lead's private description of them

**What was wrong.** When a person had no name, several places used the sentence the lead typed about them as their name. That sentence can hold the lead's private words, for example "Daniel - Your sales manager, who you said is not meeting his agreed targets". So the person, or a colleague, could read it on the board, in an email, or in the check-in itself.

**Fixed the simple way, as you said (`a75b13ac`).** A person's label is now their name. With no name it is "A teammate", the neutral word the board and the report's list of who answered already use. Nine places built a label from the description. All nine are changed: the board, what the board tells the model the room is about, the end-state email, the interview's name for a colleague, and four places in the conversation. The end-state email also no longer falls back to an email address. A new test runs every one of these, including the served board as the lead, as the person and as a colleague, and proves no part of the description appears as anyone's label. Six of its tests fail with the old code put back. The answer is in `docs/answers-from-engine.md` (`d062243a`).

**Every route I found, and what closed it.** All of these are about the sentence the lead typed about a person when inviting them. It can hold the lead's private words, such as "Daniel - Your sales manager, who you said is not meeting his agreed targets".

1. **The person's label.** When a person had no name, nine places used the lead's sentence as their name: the board, what the board tells the model the room is about, the end-state email, the interview's name for a colleague, and four places in the conversation. So the person, and their colleagues, could read the lead's words as a name. The end-state email also fell back to an email address, which a colleague may not see. Closed in `a75b13ac`.
2. **The board's `remit` field.** The board served the lead's whole sentence about each person to every reader. I confirmed that Daniel and a colleague both received "Daniel - Your sales manager, who you said is not meeting his agreed targets". It now reaches only the person who runs the check-in. Closed in `c28dbc97`.
3. **The person's own check-in.** In a person's own session, the model was given the lead's sentence about them three times, so it could say it back to them. It is now never given it. Closed in `feea6104`.
4. **The person's own coaching note.** It began "your work as" followed by the start of the lead's sentence, which gave "your work as daniel". It now says "this work" unless the words are the person's own. Closed in `7b2a876c`.
5. **The report's role line (`people[].role`).** I checked this, and it was not leaking. It only reaches the judgement, which only the lead reads. The tests now prove that, in `7586775d`.
6. **A side effect of route 3, also fixed.** Once the model could not see the lead's sentence, an invited person was never asked who they are, because the product thought their record already said so. Now a person whose only role text is the lead's is asked in their first session, "are you the person this check-in is about, or somebody working alongside them?" That is the same question as for somebody with no role. Fixed in `f2c99afc`.

**The wording, as you asked.** A person with no name is now "a colleague". When several appear in the same text, they are "a colleague", "another colleague" and "a third colleague", with a capital only at the start of a sentence. The board, the reports, the interview, the email and the conversation all take the words from one place, so the same person is called the same thing everywhere (`731f889c`, `c39d7fca`). One sentence reads less well now: when the first person comes up again later, "and a colleague agrees" can sound like somebody new. I kept your exact words. **I could not find your decision 17.** `docs/decisions.md` has 20 lines and does not mention "colleague". The prototype's only use of the word is "Invite a colleague".

**The tests.**
- A new label test (29 tests) checks every label builder. It searches the whole served board as the person and as a colleague for any part of the lead's sentence, and confirms the lead still reads it.
- A session test runs real check-in turns and checks every instruction the model is handed.
- Both fail when the old code is put back.

**For the screens workspace.** The client still shows "a teammate", and its own `participantLabel` still falls back to the lead's sentence. One of their tests reads my server code for the old words. All of that is in `docs/answers-from-engine.md`.

**Before this can be counted as proven,** the scenario run and the checker need to see it, because routes 3 and 6 change what the conversation says in a first session.

### Your decisions at midday

- **Situation names: agreed.** The prototype's names for six of the eight. Keep "contract" and "recognition" in the other two. I had an error in my own table: it also bolded a third change, "Make sense of something serious that happened". I am following your words, so that one takes the prototype's name, "Make sense of something serious".
- **Scoring: a run where the key fact was never said is marked "couldn't be tested", and left out of the count.** Applied to runs 6, 7 and 8 below, with both counts shown.

### Your decisions this morning, and what I am doing with them

- **Names inside people's words:** you said no to `8feedc64` and yes to the middle way, on two conditions. Every quote a person sees must be the original words from the record, and a test must prove that every quote in a served report matches the original answer exactly. That is step 3 below. If it cannot meet both conditions, I will stop and tell you.
- **Situation names:** the two names are side by side below, for you to decide.

### Done so far today

1. **In step with the screens workspace.** I merged `mine/wip/prototype-ui`, which brought 108 commits overnight and 18 more this morning. Both were clean fast-forwards and are pushed.
2. **The test database is up to date.** I applied 22 migrations, not the nine I mentioned: the screens workspace added 13 more overnight. It is the local test database `gw_pw9_1786222102` on localhost. Prisma now reports "Database schema is up to date".
3. **The board never reads how a person's answers were rated (`a1747927`).** This was their privacy request 8. "Nothing checkable" came from the hidden rating of how checkable someone's answers were. Now the board reads only the record: whether anything they said this round has a number, a date or a document with it. A new privacy test builds the lead's board twice, once with every check-in rated best and once rated worst, and proves the rows are identical. Every row now also carries a plain sentence that says what happened and what would change it, with no verdict word. For example: "Femi is at 2 of 14, and 6 of the 12 rounds have gone. At this pace, 14 would not be reached by the end." The screens workspace's stop-gap, which showed such a row as "nothing to do", is gone, because it was untrue. **The screen still needs one change from the screens workspace:** it still shows each reason as a coloured pill beside the name, and it should show the new sentence instead. I have asked them for it.
4. **Sales, checked before changing anything.** The fact is there. In all three runs Kwame says his target is 14 approved facilities, and he counts his 22 applications towards it. On run-6 he said "All 22 of them, actually. I counted them all towards my target". The record also holds "I have three approved facilities already". But his finding kept only "22 facilities were processed smoothly". The code picks the latest progress line that contains a digit, and "three" is spelled out. So the one line that shows 3 approvals against 14 never reached the judgement, and the judgement praised him for exceeding his target. **The fix is in (`e9ec1e5a`):** number words now count as numbers, and when someone gave two different figures, both reach the report. I tested it on two sales runs. On the first, Kwame's finding reads "Kwame Mensah has three approved facilities, against a target of 14. Kwame has 19 other facilities that are still applications and not approvals." That is the fact, reaching the report at last. But the judgement still did not draw the conclusion. It put Kwame down as waiting for documents. On the second, the simulated Kwame gave his own target as 22, and the judgement called that target unachievable. **So sales is close in both, not clearly right.** I am keeping the fix because it makes the finding true to the record, and I am not chasing the judgement with prompt changes.
5. **The "what to ask for" line on the board is in full sentences now (`88b84293`).** It does not repeat the new `says` line. For example: "Ask Amina to check in." and "Ask Musa to speak to Kofi rather than write to them."
6. **The other close ones, checked against what was said before changing anything:**
   - **snapshot is the names problem.** Ravi Menon is the lead in every run. Anna is waiting for Ravi's signature, so the lead is waiting on himself without knowing it. That is exactly the right answer, but the judgement asked the lead "who Ravi is". The middle way for names should fix snapshot, drift and pulse together.
   - **advisor: the fact was not said.** In runs 7 and 8, Peter only ever mentions his contact at Equity Bank. He never says he has none at KCB or Co-operative Bank. Nothing to fix in the engine.
   - **loans: the fact is in the findings now, and the judgement does not join it up.** On run-8, four borrowers' findings each say their repayments came before any income: Sunday, Hauwa, Grace and Esther. The judgement named only two of them, and never said it is one cause in how the loans are set up.
   - **shock: the material has all three warning signs in only one run of three.** Only on run-7 did Tobi say "their two quarterly reviews were cancelled. One in June, one in September". Even then, the judgement did not put the three in order.
   - **project: the fact is there, and the judgement framed it differently.** Rita's July reconciliation requirements are in the record. On run-8 the judgement led with the blocked credentials instead of the scope. I am leaving this one.
7. **The middle way for names: built, and not yet finished.** There are four commits: `2b47bc4f`, `b6a3a379`, `21c76534` and `dcf44486`.
   - **Quotes are restored from the record before storing.** Every quotation the report models write is replaced by the record's own words. If it cannot be matched, it loses its quotation marks. The serve step no longer changes anything inside a quote. Before this, three serve-time rewrites did: the name swap, the dash rewrite and the "party" rewrite. On run-8, 392 of the 732 quotes served were not word for word in the record.
   - **The models read labels where people said names**, and quotes are restored from the unlabelled record.
   - **Your proof test is in.** It runs the drift scenario from the record, through the report writer and storage, to what Nadia, Zainab and the anonymous copy are served. It checks that every served quote is in the record character for character. It fails when the fix is taken out. Nadia now reads "…since March, at your request. In Zainab's words, "Since March 11th, I've been almost entirely focused on inbound sales support as requested by Nadia"."
   - **There is a checker for runs**, `api/journey/every-quote-is-from-the-record.ts`. It fails if any served quote is not in the record.
   - **Two gaps I am closing before I call it done.** First, about 1 in 10 record lines is the extractor's tidied version of what the person typed, not the typed words. A quote restored from one of those would still be a model's copy, which your first condition rules out. So each record line will now be marked when it is written, according to whether it is word for word what the person typed, and only those lines can be quoted. Second, a quote that cannot be matched currently loses its marks and reads broken: "Zainab Suleiman says I have mostly been doing sales support at your request." That sentence will be dropped instead.
   - **Both gaps are closed.** `c36c862b` marks each record line when it is written, according to whether it is word for word what the person typed. Of 26,060 lines, 23,386 are, and only those can be quoted. `d30f4d1b` drops a sentence whose quote is not theirs and cannot stand without quotation marks. `266bfdf6` gives commitments the same word-for-word mark, because they were being dropped. `ece89012` keeps wording the judgement suggests, such as "ask: What are you waiting for?", without quotation marks, and never leaves a field blank. The two new columns are migrations on the local test database only.
   - **Proven live, twice.** I ran drift, pulse and snapshot twice each. **All three were clearly right in both rounds, six out of six.** Last night drift was right in one run of six, and pulse and snapshot were unsteady.
     - drift: "Zainab Suleiman is spending eighty percent of their time on sales support at your request."
     - snapshot: "Sign the lease variant for Anna Kowalski." The lead is the Ravi she was waiting for.
     - pulse: the approvals are stuck with a manager on leave, and it says to find somebody who can sign. When it said the lead approved the leave without arranging cover, those were the lead's own words: "since I didn't arrange cover for them".
   - **The checker: every quote served was word for word in the record.** 45 of 45 in the first round and 24 of 24 in the second. The checker exits with an error if even one is not.
   - **For you to know.** A quote that is not the person's own words now loses its quotation marks, or its sentence is dropped. On the 300 newest stored reports that dropped 4 sentences the report models wrote and 98 sentences the product built, mostly lines in "what the record shows over time" that quote a commitment nobody said word for word.
8. **Loans and shock: a rule for a shared cause and for one story in order (`2f4fa98e`).** It adds two short paragraphs to the judgement's instruction, with no scenario words in them. When several people give the same reason, say it once and name everyone it applies to. When different people each hold one piece of what happened, put the pieces in order of when they happened. I tested it twice on each.
   - **Loans: right in substance both times, and neither run can count.** The first said to "review the loan's startup terms, including the grace period". The second named the shared cause for Sunday, Hauwa and Blessing, kept Musa's undelivered machine apart, and said "Introduce a 90-day period with no payments at the start of each loan". That is the right answer. **But both reports were incomplete** (8 and 7 findings for 9 people), so under the rules neither counts. With nine people, loans often misses the runner's five-minute wait when it runs next to other scenarios.
   - **Shock: couldn't be tested, both times.** Only the support-ticket sign was said. Nobody mentioned the missed quarterly reviews or the champion leaving, so there was no story to put in order.
9. **The situations have the names you chose (`bde4f419`).** The prototype's for six, keeping "contract" and "recognition": "Check in before a contract ends or renews" and "Support a raise, promotion or recognition". Every other name is now in sentence case. Nothing in the code chooses a situation by its name. The client's `SCENARIO_LABELS` changed in the same commit, strings only, so the screens workspace's parity test stays green. I have told them. They still write "Connect Goals Across the Team" by hand in five places. **One thing I checked and got right this time:** the scenario packs that actually run come from the database, not the file, as this report said before. So the six situation names written inside the packs' text are unchanged in what runs. That is part of your open question on the 50 packs.

**Run-9, the first full run today, started at about 17:50 on `bde4f419`.** It includes everything above.

### Run-9: 18 clearly right of the 19 that count, and 18 of all 24

- **The judgements.**
  - **Clearly right (18):** board, cofounder, contractreview, discovery, drift, handover, implementation, newmanager, pip, project, pulse, realign, recognition, renewal, seniorhire, snapshot, updates and workplan.
  - **Couldn't be tested (3):** advisor, openread and shock. The reasons are in the table below.
  - **Report incomplete (2):** crisis and loans. Crisis's gap reads as right ("the rota they used is known to be wrong"), but it cannot count.
  - **Not right (1):** sales. Kwame says "I've got 22 in the pipeline right now. So I'm ahead of schedule!" against a target of 14 approvals. The judgement still does not say he is counting applications.
- **Drift, pulse and snapshot, the three the names change was for, are all right.**
- **Is task 1.5 met?** On all 24 it is 18, and the bar is 20. Leaving out the runs that couldn't be tested and the incomplete reports, it is 18 of 19. **Which count the bar uses is your call, so I have not ticked 1.5 and have not started 1.6.**
- **Every quote is from the record.** The checker read all 496 quotes served across the 24 scenarios. All 496 are word for word in the record.
- **The checker says nothing is worse than the baseline.** Jargon in reports and boards fell from 124 to 84, and in Groundwork's turns from 15 to 13.
- **Every test, after merging the screens workspace's newest work.** All 9,859 API tests pass, and the typecheck is clean. The client passes 3,073 of 3,075. The two that fail are in the screens workspace's sidebar tests, "Jump to" and "the sidebar waits for the list". They fail the same way with my one client change taken out, so I have told them. I also applied the six migrations their newest work brought to the local test database.
- **One number to watch.** "Blocker checked" is 35, against a baseline of 37. The checker allows a 10 per cent drop, so it passes, but it has gone 42, 46, 38 and now 35 across runs 6 to 9. It counts Groundwork's own conversation turns. Today's changes are all in reports, the board and names, apart from the situation-name line the conversation reads. I have not found a cause.

   - **Next for loans and shock:** one rule in the judgement's instruction. When several people give the same cause, say it once and name everyone it applies to. When several people each hold part of the same story, put the parts in order of when they happened. This waits until the middle way is finished, because both touch the judgement files. I will test it twice on each.

### The situation names, side by side, for you to decide

These are the eight names the screens workspace asked about (their request 5), plus the goals card. The first column gives the prototype's name. The second gives the name I would use. The last says what the situation covers, in one sentence. Only the capitals differ in every other name, so I have left those out.

| Situation | The prototype's name | The name I would use | What it covers |
| --- | --- | --- | --- |
| NEW_ADVISOR | Start an advisor or board relationship | Start an advisor or board relationship | Agreeing what an advisor or board member will actually contribute, and on what terms, before any equity or retainer is settled. |
| WORKPLAN_BUDGET | Build a workplan and budget | Build a workplan and budget | Each person writes their own plan, and the plans are checked together against the budget and the people available. |
| COHORT_CHECK | Check how the same role is going | Check how the same role is going | Several people in the same role are each checked on their own, so the lead can see where the role works and where it does not. |
| CONTRACT_RENEWAL | Check in before a renewal | **Check in before a contract ends or renews** | When a contract or a term is ending, both sides say what was agreed, what happened and whether renewing makes sense. The prototype's name drops "contract", and many of these are contracts that may simply end. |
| RECOGNITION | Support a raise or promotion | **Support a raise, promotion or recognition** | Building the evidence for a raise, equity, a promotion or simply credit for work, before the conversation happens. The prototype's name drops "recognition". Our recognition scenario is about credit for a contractor's work, not about pay. |
| REALIGN_TEAM | See where people see things differently | See where people see things differently | A team working from different versions of the same thing, with each account kept and nobody framed as wrong. |
| ACUTE_SHOCK | Make sense of something serious | **Make sense of something serious that happened** | After something serious has already happened, such as losing a big client or an outage, everyone involved gives their piece, so the real picture comes together fast. I would keep "that happened", because without it the name could read as a risk that has not happened yet. |
| OKR_ALIGNMENT, the goals card | Connect goals across teams | Connect goals across teams | One goal at the top, and whether the goals of the teams under it add up to it. The prototype's "teams" is more accurate than today's "the team". |

If you agree, the table's names change in the engine, and the screens workspace changes its list in the same step so their parity test stays green.


### How often each scenario was clearly right, across runs 6 to 10

Graded against each scenario's right answer. Run-6 came before any of the changes of 26 September. Run-7 came after the first seven. Run-8 came after all of that night's. Run-9 came after the names and quotes work of 27 September. Run-10 came after the routes the lead's description leaked by were closed.

**Two counts.** A run is marked "couldn't be tested" for a scenario when the simulated people never said the fact that scenario depends on. It is marked "report incomplete" when the runner itself says the report is not usable. The first count leaves both out. The second counts all 24, as before.

**Corrected on 27 September, evening: openread was never untestable.** I had marked four openread runs as couldn't be tested, because Kofi says the problem is not the freeze. His script is written that way on purpose. He is meant to raise the same thing from a different angle, Thursdays that are chaos and Fridays that are empty, and the right answer is to notice that he and Mei are describing the same freeze. So every openread run could be tested, and only run-8 got it right.

| Scenario | Run-6 | Run-7 | Run-8 | Run-9 | Run-10 | Right, of the runs that count | Right, of all five |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cofounder | right | right | right | right | right | 5 of 5 | 5 of 5 |
| contractreview | right | right | right | right | right | 5 of 5 | 5 of 5 |
| discovery | right | right | right | right | right | 5 of 5 | 5 of 5 |
| implementation | right | right | right | right | right | 5 of 5 | 5 of 5 |
| newmanager | right | right | right | right | right | 5 of 5 | 5 of 5 |
| pip | right | right | right | right | right | 5 of 5 | 5 of 5 |
| renewal | right | right | right | right | right | 5 of 5 | 5 of 5 |
| seniorhire | right | right | right | right | right | 5 of 5 | 5 of 5 |
| board | couldn't be tested | right | right | right | right | 4 of 4 | 4 of 5 |
| crisis | right | right | right | report incomplete | right | 4 of 4 | 4 of 5 |
| workplan | right | right | right | right | couldn't be tested | 4 of 4 | 4 of 5 |
| advisor | right | couldn't be tested | couldn't be tested | couldn't be tested | couldn't be tested | 1 of 1 | 1 of 5 |
| project | right | right | - | right | right | 4 of 5 | 4 of 5 |
| realign | right | right | right | right | - | 4 of 5 | 4 of 5 |
| updates | right | - | right | right | right | 4 of 5 | 4 of 5 |
| handover | - | right | right | right | couldn't be tested | 3 of 4 | 3 of 5 |
| pulse | right | - | - | right | right | 3 of 5 | 3 of 5 |
| recognition | - | - | right | right | right | 3 of 5 | 3 of 5 |
| snapshot | right | - | - | right | right | 3 of 5 | 3 of 5 |
| drift | - | - | - | right | couldn't be tested | 1 of 4 | 1 of 5 |
| openread | - | - | right | - | - | 1 of 5 | 1 of 5 |
| sales | right | - | - | - | - | 1 of 5 | 1 of 5 |
| loans | - | - | - | report incomplete | report incomplete | 0 of 3 | 0 of 5 |
| shock | couldn't be tested | - | couldn't be tested | couldn't be tested | couldn't be tested | 0 of 1 | 0 of 5 |
| **Total** | **17 of 22** | **14 of 23** | **16 of 22** | **18 of 20** | **15 of 18** | | |

**On all 24, as before:** 17 on run-6, 14 on run-7, 16 on run-8, 18 on run-9 and 15 on run-10.

**The runs left out, and why:**

- **advisor, run-7, couldn't be tested:** Peter never says he has no relationship at KCB or Co-operative Bank.
- **advisor, run-8, couldn't be tested:** Peter never says he has no relationship at KCB or Co-operative Bank.
- **advisor, run-9, couldn't be tested:** Peter never says he has no relationship at KCB or Co-operative Bank.
- **advisor, run-10, couldn't be tested:** Peter never says he has no relationship at KCB or Co-operative Bank.
- **board, run-6, couldn't be tested:** Wanjiru never gives a timeline for the licence, only that there is none yet.
- **crisis, run-9, report incomplete:** 2 findings for 3 people.
- **drift, run-10, couldn't be tested:** neither Nadia nor Zainab says who asked Zainab to move to sales support.
- **handover, run-10, couldn't be tested:** Patience never mentions the year-end spreadsheet; the judgement finds the verbal supplier agreement, which she did mention.
- **loans, run-9, report incomplete:** 8 findings for 9 people.
- **loans, run-10, report incomplete:** 6 findings for 9 people.
- **shock, run-6, couldn't be tested:** nobody says first-hand that the quarterly reviews were missed.
- **shock, run-8, couldn't be tested:** nobody says first-hand that the quarterly reviews were missed.
- **shock, run-9, couldn't be tested:** nobody mentions the champion leaving; only the cancelled reviews and the tickets are said.
- **shock, run-10, couldn't be tested:** nobody mentions the missed quarterly reviews; the champion leaving and the tickets are said, and the judgement's actions put those two in order.
- **workplan, run-10, couldn't be tested:** Chidi never mentions Studio Lune, so there is no double booking in what was said.

**A correction to an earlier report.** I wrote that on run-7 Daniel never said that Priti was the one he was waiting on. That was wrong. He said "Priti can grant that access." So updates on run-7 could be tested, and the judgement missed it.


## THE NIGHT IN SHORT, 27 September, about 03:30

**How many judgements are clearly right: 16 of 24 on the last full run (run-8). The bar is 20, so task 1.5 is not ticked, and I did not start task 1.6.** The three full runs I measured scored 17 (run-6), 14 (run-7) and 16 (run-8). Most of that movement comes from what the simulated people happen to say in each run, not from the code. The scenarios I worked on tonight did get steadier. Handover was right in every clean run after the first fix, and recognition and updates were right on run-8.

**Run-8 passes the checker.** Nothing is worse than the baseline. Jargon in reports and boards is 124, back under 1.4's bar of 128. Jargon in Groundwork's own turns fell from 41 to 15. Curt turns are 0. Every report matched the database, and every one was written by `report_synthesis` version 6.

**The eight that are not clearly right, and why:**

- **drift is wrong.** Zainab says she was moved to sales support "as requested by Nadia", and Nadia is the lead. The judgement only knows people by labels, so it takes "Nadia" to be someone else, "another leader". This is the one decision I need from you, below.
- **pulse is wrong.** On run-8 it wrote about a module nobody mentioned. In a test run the day before it was right, and in another it mistook "Ahmed's manager" for Ahmed, the lead. That is the same names problem as drift.
- **sales is wrong.** It praises Kwame for "exceeding" his target. In fact he is counting applications, not approvals.
- **advisor is close.** It misses that Peter has no relationship at two of the three banks.
- **loans is close.** It sets apart the one borrower who never received his machine. But it does not say that five borrowers share one cause, repayments that started before their businesses could earn. In one test run it said exactly that, but that report was incomplete.
- **project is close.** It does not put the reconciliation scope first.
- **shock is close.** It joins two of the three warning signs, and gives no timeline.
- **snapshot is close.** It mentions Ravi's signature only in an action.

**What I changed tonight (13 commits of code, each with its own tests):**

1. Each person's finding now keeps what they say about how the work really runs. These lines were stored and never read.
2. The record now keeps what a person says somebody else did, with that person's name. This is what put Victor into recognition.
3. The date question is asked once, only about a real deadline, and in a full sentence. It had asked Patience "Year-end - so 31 December 2026?" seven times in a row.
4. A reply that repeats our own hidden instruction is never sent. Jide was once sent one word for word.
5. Every judgement action is now something the reader does, not "Tell you to…".
6. A name at the start of a sentence, or used as a possessive, now counts in the check for a name two people mentioned.
7. A close is never cut down to "Speak soon.", and no guard can send a fragment such as "Before we close,".
8. "What is in their way" now keeps the worry that has the detail in it.
9. Two of my own specs were fixed for the screens workspace.

I tried two other changes and undid them. One gave the judgement people's names, and it began writing those names into the stored report. The other swapped names for labels inside people's words, which would change their words on screen, so it waits for you.

**What needs you:**

1. **Names inside people's words (the main one).** If "as requested by Nadia" becomes "as requested by the initiator" before the model reads it, drift and pulse stop mistaking the lead for someone else. The cost is that a quote would reach Nadia as "as requested by you". The full version is ready in `8feedc64`. There is also a middle way, which keeps the words inside quotation marks. Both are described below.
2. **The situation names** the screens workspace asked about (their request 5). Two of the prototype's names narrow the meaning: "recognition" and "contract" drop out.
3. **The older open questions** are unchanged: B5's plain name, the 50 scenario packs and `the-real-gate`.

**Every test, after merging the screens workspace at the end of the night.**
- **API: all 9,352 tests pass, in 1,031 suites, and the typecheck is clean.** That includes `the-password-rules.spec.ts`, which the screens workspace has now fixed. After the merge I had to run `prisma generate`, because their schema changes were not yet in the generated code on this computer. That touches only `node_modules`.
- **Client: 2,730 of 2,732 pass.** The two that failed are in the screens workspace's new check-in spec, and they time out at 5 seconds when the whole suite runs. The file passes on its own, 22 of 22. I have told them in `docs/answers-from-engine.md`.
- **The local test database has not had the screens workspace's nine new migrations applied.** Apply them before the next scenario run.

**The first thing for the next session** is the screens workspace's privacy request 8. The board tells a lead that a person said "nothing checkable", and that rests on how their answers were rated.

## TONIGHT, 26 to 27 September: where I am now

This section is kept up to date as I go. If it stops partway, that is where I got to.

### Run-6 is sound, and nothing is worse than the baseline

- All 24 scenarios finished. No report was marked "REPORT INCOMPLETE" and every report was released.
- In all 24, the captured report holds exactly as many findings as the database.
- Every report was written by `report_synthesis` version 6, and the active `system` prompt is version 43. Both are the versions I expected.
- The scorer says nothing got worse than the baseline.

### How many judgements are clearly right: 17 of 24

I read every judgement against the right answer for its scenario. Seventeen are clearly right, four are close, and three are wrong. The bar is twenty.

Clearly right: advisor, cofounder, contractreview, crisis, discovery, implementation, newmanager, pip, project, pulse, realign, renewal, sales, seniorhire, snapshot, updates and workplan.

Three of these were wrong or close last time and are right now. In realign, the judgement now names the chief executive as the second person giving directions. In newmanager, it now says Daniel is answering the hardest tickets himself instead of managing. In workplan, it now finds that two leads booked the same design firm, Studio Lune, at the same time.

The four that are close:

- **drift.** It says Zainab was asked by "somebody else" to do sales support. In fact Zainab says it was Nadia, and Nadia is the lead. The fact was in the record, but nothing passed it on to the judgement.
- **handover.** It finds the year-end spreadsheet but only hints at the supplier arrangement. Both facts are in the record in Patience's own words. They never reached her part of the report.
- **loans.** It says repayments start too early, but it does not separate the five borrowers who share that cause from the one who never received the machine, and it does not say the grace period should change.
- **shock.** It joins two warning signs, not three. In this run nobody said first-hand that the quarterly reviews were missed, so only two of the three were in the material.

The three that are wrong:

- **board.** It says the three people define success differently. The right answer is that the plan assumes a launch in four months and the person responsible says twelve. In this run Wanjiru never gave a number of months. She said only that there is no licence yet and she is not counting on any sales. So the key fact was missing from the material. On run-5 it was there, and the judgement was right.
- **openread.** It misses the Friday deploy freeze. The freeze is in the record seven times, so this time the judgement itself missed it. On run-5 it was right.
- **recognition.** It never mentions Victor, the contractor who wrote the migration script. Two people named him, but the record kept only what each person said about their own work. So Victor was in nobody's record at all.

Board and openread were right on run-5 and are wrong on run-6. Realign, newmanager and workplan went the other way. So some scenarios still change from run to run, and a single run cannot settle them.

### The lower-temperature test: dropped

I measured it last session. A lower temperature made the answers about seven points more alike, but the right answers fell from 19 of 25 to 15 of 25. In the performance-plan scenario, all five answers at the lower temperature agreed with each other and all five were wrong. A steadier wrong answer is worse than a varying right one, so nothing sets a temperature. That is still the decision.

### Something that got worse since run-5, though not below the baseline

Jargon in reports and boards rose from 123 on run-5 to 217 on run-6. Task 1.4's bar is 128, so 1.4's bar no longer holds on this run. Almost all of it is two words, "pipeline" in the sales scenario and "escalation" in the crisis scenario. The people themselves used jargon words 30 times on run-6 against 25 on run-5, and the reports repeated their words far more often. I have not changed anything for this yet. See "Needs Hafsah" below.

### What I have changed tonight

1. **`ce6e7fe8`: each person's finding now keeps what they say about how the work really runs.** The record stores these lines, but nothing that writes a person's finding read them. Run-6 stored 15 of them and lost every one. They include Patience's verbal supplier arrangement, "as requested by Nadia" in drift, and Daniel's "I'm faster at them, so it's quicker for me to just handle them" in newmanager.
2. **`3c56f5eb`: the record now keeps what a person says somebody else did, with that person's name.** This is for recognition, where Victor was named by two people and stored by nobody.

3. **`d7a6510e`: the lead's judgement is now told which name belongs to which person.** In drift, Zainab says she moved to sales support "as requested by Nadia", and Nadia is the lead. The judgement only knows people by their labels, so it treated Nadia as somebody outside the room, and the lead would have read "Tell you that Nadia has redirected Zainab". Now each person's block in the judgement's material says what other people's words call them. No text anyone reads is changed.

I first built a stronger version, `8feedc64`, and undid it in `efd1c67e`. It replaced each name inside people's words with that person's label, so the stored report holds no names at all. The catch is that a quote from Zainab would then reach Nadia as "requested by you", which changes Zainab's words on screen. See "Needs Hafsah".

**The first round of re-runs, on the first two changes:** handover and recognition are now clearly right. Handover names both things only in Patience's head, the verbal 60-day supplier terms and the spreadsheet on her own drive. Recognition names Victor, the contractor, from the other two people's accounts. Newmanager is still right. Drift's finding now keeps "at Nadia's request", which is what led to the third change. Loans is better but still close, and its report was incomplete (8 findings for 9 people), so it does not count. **The third change made things worse, so I undid it (`cb440666`).** Once the judgement was given people's names, it wrote those names into the stored report, where only labels belong. Drift's stored judgement read "Nadia and Zainab have a different understanding". Renewal's began with the lead's full name. Both came back with no actions at all. That second round does not count.

**A clean second round, on the first two changes only:** handover is right again, so two rounds out of two. Newmanager is right again. Recognition names Victor again, so two out of two, though it now asks who he is rather than crediting him. Drift is right this time. It says Zainab moved to sales support because of your own instruction in March, "help sales out for a couple of weeks". It needed only the first two changes. On round one, on the same code, it was not right, so drift is still unsteady. Loans is much better: it sets the four situations apart and says repayments started before the businesses earned. But the loans report was incomplete again (6 findings for 9 people), so it cannot count.

### A conversation bug that was eating the handover check-in, now fixed

In handover, Patience names both things only she knows. Then Groundwork asks "Year-end - so 31 December 2026?" and asks it again every time she answers "No, the last year-end was 31 December 2023", seven times in a row, until her check-in runs out of questions. The code reads the word "year-end" in each answer as a deadline, and never remembers that it has already asked. The same question also once sent Jide the product's own hidden instruction, word for word, as his reply.

4. **`5dcab1de`: the date question is now asked once, only about a real deadline, and in a full sentence:** "When you say year-end, do you mean 31 December 2026?" It is not asked when the person has already given a date, and it is not asked about a word like "year-end" that is not a deadline.
5. **`124e2a4c`: a reply that repeats our own instruction is never sent.** If the model's second try repeats the instruction, the product asks its own one-line question instead.
6. **`a5f6e8dc`: every action in the judgement is now something the reader does.** Before, the lead read actions like "Tell you what Blessing Okafor's record says" and "Ask you to decide what Zainab should work on". There were 8 of these on run-5 and 4 on run-6.

### The third round, on changes 1, 2 and 4 to 6

- **The year-end loop is gone.** Patience was asked about the date once and nothing was repeated.
- **Handover is right again, now three rounds out of three.** It names the verbal supplier arrangement and the spreadsheet on her own drive.
- **Renewal is right again.**
- **Drift is wrong again.** It calls Nadia "another leader". Drift is right in one round out of three. It will not be steady until the judgement can tell that "Nadia" in Zainab's words is the lead, and that is the decision waiting for you below.
- **Loans is close.** Its report was complete this time. It separates Musa's machine, which was never delivered, but it does not set the five borrowers apart or say the grace period should change. In a later round it was almost exactly right: it named four of the five and said "revise the loan terms so that repayments start after a borrower can generate income". But that report was incomplete, so it does not count. Loans has nine people, and when it runs next to other scenarios its report often does not finish in the runner's five minutes.
- **Recognition is not steady.** The record now keeps Victor (change 2 works: three entries, from both people). But the check for "named by more than one person" did not fire, because both people started their sentence with his name, and that check skips a word at the start of a sentence.

7. **`ceda16c4`: a name at the start of a sentence now counts when the same name is used elsewhere in the check-in.** I ran recognition twice more on it. Both were wrong. The first time, Amara's "Victor, the contractor, was responsible…" still did not count, because nobody used "Victor" mid-sentence. The second time, only Joseph mentioned Victor at all, so the check was right to stay quiet. That second run also accused the lead of "taking credit for the design work", which nobody said. I have written that down as a charge nobody made.
8. **`74f10ffe`: a name used as a possessive, such as "Victor's", now counts as a name everywhere in that check-in.** I ran recognition twice on it, and both times the check reported Victor as named by two people. The first was clearly right: "two other participants say the most critical work was done by Victor". The second was close. That time the simulated lead gave credit to three names who appear nowhere else, "Alex", "Sarah" and "David", and the judgement chose that as the bigger gap. It mentioned Victor only in an action.

**Run-7, the full run of all 24 scenarios, started at about 01:05 on the code as it stands at `74f10ffe`.** It is the first of the two full runs allowed tonight.

### Run-7: sound, one number worse than the baseline, and 14 of 24 clearly right

**The run is sound.** All 24 scenarios finished. No report was incomplete, every report was released, every captured report matches the database, and every one was written by `report_synthesis` version 6.

**The checker fails it on one number: one curt turn, against none at the baseline.** It is the closing turn of Elena Rossi's check-in in crisis, which reads only "Speak soon." None of tonight's changes caused it. An older guard wrongly took "What you said is now in the record, and the report will be ready for you." to be a promise she never made. It cut the sentence and left two words. That is being fixed now.

**Everything else holds or improved against run-6.** Jargon in reports and boards fell from 217 to 141, and jargon in Groundwork's turns fell from 41 to 25. That puts 2.3's bar in reach, though 1.4's bar of 128 is still not met. Among the engine-value numbers, "past words brought back" rose from 25 to 30 and "blocker checked" from 42 to 46. "Specific detail asked for", "agreements found", "patterns found" and "commitments recorded" came down from run-6's high, but all stay above the baseline.

**The judgements: 14 clearly right, 6 close, 4 wrong.** That is fewer than run-6's 17, and I am not going to present it as progress.

- **Clearly right:** board, cofounder, contractreview, crisis, discovery, handover, implementation, newmanager, pip, project, realign, renewal, seniorhire and workplan. Board and handover were not right on run-6.
- **Close:**
  - advisor: it misses that Peter has no relationship at two of the three banks.
  - loans: it separates four situations, but names only two of the five borrowers whose repayments came too early.
  - recognition: it names Victor, but as a script the work is waiting on rather than as the person nobody credited.
  - sales: it puts Femi and Kwame together.
  - shock: it has two of the three warning signs and no timeline.
  - updates: this time Daniel never said Priti was the one he was waiting on.
- **Wrong:**
  - drift: it says "You have mistaken Zainab Suleiman for somebody named Zainab". This is the names-in-people's-words problem again: the judgement cannot tell that the "Zainab" in the lead's words is the same person as Zainab's label.
  - openread: once again the two engineers did not clearly agree about the freeze.
  - pulse: it charged the lead, "Your review process is the reason Fatima Sow's work is stalled". Her finding also took the vague "some approvals are stalled" instead of "Ahmed's manager is on leave until the 28th", which was in the record.
  - snapshot: it told the lead to stop running the check-in.

**Why it went down, as far as I can tell.** I compared each slipped scenario's findings on run-6 and run-7. In sales, advisor, updates and snapshot, the simulated people said different things this time, and the missing fact was not in the material. Pulse is different: the fact was in the record, and the code picked the vaguer of two worries from the same session. That is the next fix. I found no case where one of tonight's changes pushed out a fact that had been there before.

### Four more fixes after run-7

9. **`38223cfe`: a close is never cut down to two words.** "What you said is now in the record" is no longer read as a promise. If a cut would still leave a stub on the closing turn, the product sends "Thank you. Your check-in is saved." instead.
10. **`3951f8a1`: "what is in their way" now keeps the worry that has the detail in it.** Tested on pulse. Fatima's finding now reads "Four approvals have been waiting for Ahmed's manager since the 9th", and that judgement was clearly right. On a second pulse run, the judgement mistook "Ahmed's manager" for Ahmed, the lead. That is the names problem again.
11. **`d7d2ba27`: every action that tells the reader to do something is now written as the thing to do.** "Tell the initiator to get Chidi and Sara in a room" is stored as "Get Chidi Eze and Sara Lindqvist in a room". Tested on workplan and project, and both came back clean and right. The same test runs also got crisis clearly right: "the on-call rota was actually out of date, naming an employee who had left the company". But that crisis report was incomplete, so it does not count.
12. **`3a76beae`: no guard can now cut a reply down to a fragment.** A project run sent Ifeoma just "Before we close,", because a guard cut the question that followed. Every cutting guard now keeps the reply as it was when the cut would leave a fragment. The only exceptions are an invented promise or number, and on a closing turn those become the plain close.

**Run-8, the second and last full run tonight, started at about 02:15 on `3a76beae`.**

### Run-8: sound, passes the checker, 16 of 24 clearly right

- **The run is sound.** All 24 scenarios finished. No report was incomplete, every captured report matches the database, and every one was written by version 6.
- **The checker says nothing is worse than the baseline.** Jargon in reports and boards is 124, and in Groundwork's turns 15. Turns asking more than one question are down to 29. "Commitments recorded" is 64. "Blocker checked" fell to 38, against 46 on run-7, but is still above the baseline of 37.
- **Clearly right:** board, cofounder, contractreview, crisis, discovery, handover, implementation, newmanager, openread, pip, realign, recognition, renewal, seniorhire, updates and workplan. Openread found the Friday freeze from both engineers. Recognition put Victor's script in the gap as "the single most important contribution". Updates found that Daniel's blocker is with Priti.
- **Close:** advisor, loans, project, shock and snapshot.
- **Wrong:** drift, pulse and sales. See the summary at the top.

Both full runs allowed tonight are now used, so I stopped measuring there. After run-8 I merged the screens workspace, fixed the two requests that were about my own specs, and ran every test.

### Where each changed scenario stands, across the clean re-runs

| Scenario | Clearly right | Why it moves |
| --- | --- | --- |
| handover | 3 of 3 | Steady since change 1. |
| newmanager | 2 of 2, and on run-6 | Steady. |
| renewal | 3 of 3 | Steady. |
| drift | 1 of 3 | It needs to know that Nadia is the lead. That is your decision. |
| recognition | 2 of 5 | Whether two people mention Victor changes from run to run. The check for a name two people used is now being fixed. |
| loans | 0 counted | Close or nearly right each time, but its report usually does not finish in time.


### Needs Hafsah

- **Jargon in reports rose above 1.4's bar on this run,** mostly because the reports repeat the people's own words "pipeline" and "escalation". The rule is to never change people's own words. So the question is whether a report should still use a word the person used when that word is on the jargon list. I have not changed anything for this.
- **Names inside people's words.** Reports are meant to be stored without names, but a name that somebody says, such as "as requested by Nadia", is stored as they said it. It is then shown to every reader, including a colleague who is not allowed to see names. I can swap each such name for the person's label, and the name is then put back correctly for each reader. The cost is that a quote reaches the person it names as "you": Nadia would read "as requested by you". Your rule is never to change people's own words, so I have not done this. It is ready in `8feedc64` if you want it.

  **Why it matters, measured tonight.** This one problem made three judgements wrong in three different ways:
  - Drift was wrong in four runs out of six. Twice it treated Nadia, the lead, as "another leader". Once it wrote "You have mistaken Zainab Suleiman for somebody named Zainab".
  - Pulse was wrong once. Fatima was waiting for "Ahmed's manager", and Ahmed is the lead. The judgement told Ahmed that both people were "blocked waiting for your approval" and told him to approve the purchases himself.

  **A middle way, if you prefer it.** The names could be swapped for labels only in what the model reads. Then, inside quotation marks, the product would put the name back before storing. Paraphrases would say "at your request", and quotations would keep the person's words. The cost is that a quote would carry the full name ("Nadia Haddad") where the person may have said only "Nadia". I have not built this.
- The older open questions are unchanged and do not block anything: B5's plain name, the 50 scenario packs, and `the-real-gate`.

## WHERE THIS SESSION STOPPED, 26 September, evening

**This session stopped early, and not because of the work.** It started in an empty folder and was moved into this repository partway through. The project's safety check runs before every command and every file edit, and it still looks for its script in the old folder. So everything after the move was refused, including editing this report. I did not touch the safety settings. The fix is a fresh session opened on this folder.

### What is finished

- **I am in step with the screens workspace.** I merged `mine/wip/prototype-ui`, which brought 65 commits covering sign-up, the free-trial setting in billing, and screens. None of it touches the engine's code. The merge was clean, and I pushed it to `mine/wip/plain-reports` as `51f55fbe`.
- **There are no new requests from the screens workspace.** Their file now marks their two earlier requests as answered and accepted, which matches `docs/answers-from-engine.md`.
- **I checked again that the run was safe.** It uses the local test database `gw_pw9_1786222102` and a Stripe test key. Real email cannot be sent, because the Resend key is a placeholder and `EMAIL_SENDS_FOR_REAL` is not set. WhatsApp is not set up.
- **I rebuilt and restarted the local API.** The copy that was running had been built at 20:58, before the last session's final code changes. This run therefore measures the code as it is committed.
- **The API tests pass, with one exception: 9,113 of 9,114.** The one failure came in with the merge. It is in the screens workspace's new test `api/src/modules/auth/the-password-rules.spec.ts`, at lines 74 to 80. That test reads `auth.service.ts` without removing comments first, and `a-guard-that-a-comment-satisfies-is-not-a-guard.spec.ts` rightly catches that. It is a flaw in how the test is written, not a fault in the product. Hafsah has passed it to the screens workspace directly.

### What is in progress

- **Run-6 is running.** All 24 scenarios are running in three batches, into `api/journey/all-24/run-6`. Each batch writes a file named `done-A`, `done-B` or `done-C` when it finishes.

### What comes next, in order

1. **Wait for all three done files.** Do not start a new run while this one is still going.
2. **Check that the run is sound before reading any number.** No report should be marked "REPORT INCOMPLETE" in `run.log`. The findings in the captured reports should match the database. The reports should record the prompt versions that actually ran, which were `report_synthesis` v6 and `system` v43 last time.
3. **Score run-6 against the baseline** with `tools/score_run.py`. Then read all 24 judgements against the right answer for each scenario. Last time 16 were clearly right, and the bar is 20.
4. **Work on the ones that are still only close.** For each one, first check whether the missing fact is actually in the material, before changing any prompt.
5. **Run the client tests.** They have not run yet, because they were blocked.
6. **Then move to task 1.6,** the automatic check on the text each reader sees.

### Needs Hafsah

- Nothing about the product itself. The open questions from before are still open and still do not block anything: B5's plain name, the 50 scenario packs, and `the-real-gate`.

## WHERE I STOPPED, AND WHAT COMES NEXT

**Stopped at 21:30 on 26 September, at a clean point.** Everything is committed and pushed to
`mine/wip/plain-reports`. Nothing is half-done, no run is in flight, and no code is waiting on a
measurement.

### What is finished

- **1.4 is ticked**, for the reports. Jargon in reports and boards 511 → 123, against a bar of
  128, on a run whose captures were checked against the database first. Ten random report lines
  read: no clipped phrasing. Its second bar, jargon in Groundwork's own turns, is now 2.3's, at 22
  against a bar of 10.5.
- **1.5's first condition is met**: reports with no judgement, 8 → 0.
- **Three causes found and fixed**, each one proved by measurement rather than argued: the missing
  `INTENT` field, the workplan double-count, and the temperature question below.

### What is not finished: 1.5's second condition

**Sixteen of twenty-four clearly right. The bar is twenty.** Three of the eight short ones now
have a fix in the code that has **not yet been measured on a full run**:

| | Fixed since the run | Not yet touched |
| --- | --- | --- |
| realign | `whyTheySayTheyAreOnIt`, 3 of 4 on fresh runs | |
| workplan | `whatMoreThanOnePersonNamed` | |
| loans | shown to be sampling, left alone deliberately | |
| | | newmanager, advisor, handover, recognition, shock |

### The next three things, in order

1. **Run all 24 and score it.** Two of the three fixes above have never been measured together on
   a full run, and the workplan one has never been measured live at all. Use three shards, not six
   — six starves report regeneration. Check `REPORT INCOMPLETE` lines are zero and check the
   captured findings against the database before reading any number. If it holds, 1.5 could be at
   eighteen of twenty-four.
2. **The five close ones**, which is what is left of 1.5: advisor (he has no relationship at two of
   the three banks), handover (the supplier payment arrangement, the second of her two), recognition
   (Victor belongs in the gap, not only in an action), shock (the three warning signs as one
   timeline), workplan (verify the new count reaches the gap). Each one first needs the same
   question asked: **is the fact in the material?** Three times in a row today the answer was no,
   and three times the prompt was the wrong place to look.
3. **Then 1.6**, the automatic check on rendered text per reader. Its list has grown today: slot
   names, labels, machine words, lower-case starts, cut words, doubled quote marks, a pronoun that
   disagrees with the reader, and a coordinated verb that does not agree.

### Open for you, nothing blocking

- **B5's plain name** in `docs/pattern-names.md`. Your example and the detector disagree about what
  "leverage" means. It may be the detector that is named wrongly.
- **The 50 scenario packs.** Step one is done - all fifty exported and verified byte for byte.
  Steps two and three, the improved versions and the before-and-after document, are queued behind
  the numbered tasks.
- **`the-real-gate`** is tracked again but cannot run: it imports `../hundred/harness`, which is
  not on this computer.

### What I would tell the next session in one line

Three separate defects today were the same defect: the fact was never in the material, and the
prompt was the wrong place to look. Check the supply first.


## The temperature question, answered: no

A lead should get the same judgement twice from the same record, so I measured whether a lower
temperature would make the judgement steadier. Same material, five samples, default against zero,
five scenarios, scoring both how alike the answers were **and** whether they still reached the
right answer.

| | default: alike / right | temperature 0: alike / right |
| --- | --- | --- |
| loans | 38% / 5 of 5 | 35% / 5 of 5 |
| pip | 45% / **3 of 5** | 57% / **0 of 5** |
| contractreview | 49% / 5 of 5 | 47% / 5 of 5 |
| workplan | 41% / **1 of 5** | 56% / **0 of 5** |
| renewal | 31% / 5 of 5 | 43% / 5 of 5 |

Consistency rose about seven points. **Correctness fell from 19 of 25 to 15 of 25.**

The performance-plan scenario is the one to read. At zero the five answers became *more* alike and
*all five wrong*: it converged every time on "they are working to two different targets" and
stopped saying the target was never written down, which is the finding. A steadier wrong answer is
worse than a varying right one.

So nothing sets a temperature. Your rule was "keep it only if it improves consistency without
losing anything", and it loses something. The option stays on the model call because it is what
made the measurement possible, with both columns recorded beside it, so anybody switching it on
owes the same two columns and not just the first.

## The two causes found, and both were the same shape

I said the fix for realign was in the picture prompt. It was not, and finding that out took one
more measurement than I wanted it to.

### realign: nothing read INTENT

The prompt rule went in and the CEO reached a finding **once in three runs**. I had fixed the
writer without checking the supply, which is the mistake I had written up an hour earlier. So I
checked the supply.

`PersonFacts` — the only thing the per-person paragraph is written from — has slots for what they
said it was for, where they say they are, what is in the way, and their numbers. **Nothing was fed
by INTENT**, and every one of those CEO lines is an INTENT entry:

> "The CEO asked me to build it. He said it was urgent."
>
> "The CEO mentioned it to me at dinner. He said it would really move the needle."

Three or four of them, every run. The paragraph could not say it, whatever the prompt asked for.
The one run in three that got through had a person who happened to repeat it inside a PROGRESS
line, which *is* read. **The fact was arriving by accident.**

`whyTheySayTheyAreOnIt` is a field now, preferring the entry that names a reason — asked, told,
requested, instructed — over a later vague one, because "the CEO asked me to on September 2nd" is
usually said first and recency alone would throw it away.

**Four fresh runs: three of four now carry it, in the finding and in the gap, and the two always
agree.** It was 0 of 12 in the isolated test and 0 of 1 live.

> "The chief executive has given separate, urgent work to Ruth Njeri and Marco Bianchi, which
> conflicts with your stated priority of retention."

**And my first count of those four runs said one of four, not three.** My checker searched for
"CEO" and the model writes "the chief executive" — because the wording rulebook tells it not to use
acronyms. The engine was right and the measurement was wrong, which is the third time today a
number has been the thing at fault. I only caught it because I printed the sentences beside the
count rather than trusting the count.

### workplan: the contractor survived into one paragraph of two

Same shape. The judgement is built from one written paragraph per person, so a thing two people
both named only reaches it if it survived into **both**. It survived into one.

It is plainly in the record, in both accounts, in their own words:

> **Chidi Eze:** "34k of that specifically allocated to Studio Lune for the brand refresh, starting
> in October for eight weeks."
>
> **Sara Lindqvist:** "Studio Lune is booked and confirmed."

Both booked the same contractor, for the same eight weeks, from the same month. Neither knows.

So the engine counts it now rather than hoping the model spots it. `whatMoreThanOnePersonNamed`
reads the records, finds the names appearing in more than one person's, and hands the judgement who
named each and what each of them said. **Arithmetic, no model** — whether it matters is the
judgement's job, noticing it is counting.

`WorkMention` already existed and does a different job: one participant mentioning **another
participant**. A supplier, a customer, a chief executive outside the check-in is nobody in the room,
so nothing was watching for exactly the cases that explain these scenarios.

Two things the tests caught on the way. "and" was in the list of words that join one name, so
"Studio Lune and Acme Corp" came back as a single name nobody had said and both real names were
lost. And the new read of the record filtered disputed rows but wrote the clause second, where the
guard that checks every counting read looks for it first.

## The eight that are not right, each one, so you can read them yourself

Only clearly right answers count, on your decision. **Sixteen of twenty-four.** Four short of the
bar. Here are the other eight.

### The three that are wrong

**newmanager**

> **It says:** "You, Daniel Park, and Tomi Balogun all have different ideas about what Daniel's new
> manager role is for, so nobody is clear on how complex issues should be handled."
>
> **The right answer:** Daniel is still doing the individual work rather than managing, because he
> is faster at it, and the team have noticed and read it as not being trusted. He thinks he is
> helping. Name the behaviour and its effect, and do not call it a confidence problem.

It has found a real thing, and it is not the thing. Nobody's account says the role is undefined;
two accounts describe Daniel doing the work himself.

**loans**

> **It says:** "You are looking for a problem in borrower selection, but the record shows the
> problem is in operations. Information that field officers have about non-delivery and theft is
> not reaching you."
>
> **The right answer:** Five of the eight share one cause - the repayment schedule starts 30 days
> after disbursement and these assets take two to three months to earn. That is the lending model,
> not the people. One never took delivery at all. Separate the systemic five from the individual
> one, and say the model needs the grace period changed.

Half right. The non-delivery is the individual one; the systemic five are missing. **This morning's
run had the grace period and this one does not.**

**realign**

> **It says:** "You believe the team's priority is retention, but Ruth Njeri, Marco Bianchi, and
> Aisha Bello are all working on different things. The team does not have a single, shared plan."
>
> **The right answer:** All three got a different steer, and two of them got it from the CEO
> directly, in conversations the team lead does not know happened. Identify the second source of
> direction, not three people with poor focus.

"Three people with poor focus" is close to word for word what it wrote. **This morning's run named
the CEO and this one does not.**

### The five that are close

**advisor**

> **It says:** "You and Peter Kimani are working towards different goals... you want a product
> distribution agreement with a specific list of banks, but have not told Peter this."
>
> **Missing:** that Peter has no relationship at two of the three banks. The deliverable does not
> exist on his side, and which one he can actually do is the useful half.

**handover**

> **It says:** "critical knowledge is not written down", and tells the lead to get the month-end
> reconciliation written down as it is done.
>
> **Missing:** the second of the two things that exist only in her head - a payment arrangement
> with a supplier that is in no contract. One of the two is named; the other is not.

**recognition**

> **It says:** the three of them have different ideas about which work mattered most.
>
> **Missing from the gap:** Victor, the contractor who wrote the migration script. He is named in
> one of the actions, so the engine has him - he just is not in the sentence the reader remembers.

**shock**

> **It says:** "You are reconstructing a crisis that two team members saw coming, because the team
> has no single way of reporting that a customer is at risk."
>
> **Missing:** the timeline. Two missed quarterly reviews, the champion leaving in July, support
> tickets tripling in August - three signals, one per person, nobody holding all three. It has the
> shape of the answer and none of the three facts.

**workplan**

> **It says:** "You are holding a budget of 180,000, while the plans from the team add up to
> 254,000."
>
> **Missing:** why. Two leads have both costed the same contractor. It asks for the cost of one
> named supplier, which is circling the answer without landing on it.

The good news in that one is that the charge is gone: "a planning problem that you created" and
"Tell you to set a budget for the work" are both absent, and a search of all twenty-four reports,
as every reader, for that class of phrasing returns one hit, which is factual.

## Testing the guess about loans and realign, and it was wrong

My guess was that the new rule telling the judgement to read across the blocks was pulling it
towards process findings. **It is not, and the test says so plainly.**

I rebuilt the exact material each judgement was given and ran it under three instructions - the
current one, one without the cross-block rule, one without either new rule - four samples each.

| | loans, found the grace period | realign, found the CEO |
| --- | --- | --- |
| current, both new rules | 2 of 4 *(4 of 4 on a repeat)* | **0 of 4** |
| without the cross-block rule | 3 of 4 | **0 of 4** |
| without either new rule | 3 of 4 | **0 of 4** |

**loans is sampling.** Six of eight under the current instruction across two goes, three of four
under each of the others. There is no effect to find; the run-5 miss was a draw of the dice, and
the right response is not a prompt change.

**realign is not sampling. It is 0 of 12.** The CEO never appears under any instruction, so the
judgement is not losing it - it was never given it.

### And where it was lost, which is two steps upstream

The record holds it. Two entries, in the engineers' own words:

> "The CEO asked me to on September 2nd and said it was urgent."
>
> "The CEO mentioned it to me. He said it would really move the needle."

Their per-person paragraph came out as:

> "Participant A says Participant A's goal is for the referral scheme to be live. Participant A
> began work on it on September 2nd."

The work survived. The date survived. **Who asked did not.** The judgement is built from those
paragraphs, so by the time it runs the fact is gone - which is why no instruction could recover it.

So the fix is in the paragraph, not the judgement. The picture prompt now asks for who asked them
for the work, where they said, with the reason it is the fact most easily lost: it sits next to the
work rather than in it. Being tested on three fresh runs of that scenario now.

**One more thing that was different, and I am not fixing it yet.** The run-1 realign report had
divergences and the run-5 one has none at all, and the judgement is given the differences as well
as the people. Across the run differences went up, 29 to 35, so this is not systemic. Noted rather
than chased.

## The verified run: 1.5 is done on one condition and unclear on the other, 1.4 is not done

**This run was checked against the database before I read a number from it**, which is the rule I
set myself after this afternoon. 23 of the 24 captured reports hold exactly as many findings as the
database does. The one exception is `loans`, 8 in the file against 9 in the database, and the
runner said so itself while it ran rather than leaving me to find it later.

### What got better

| | Baseline | Now |
| --- | --- | --- |
| report with no judgement | 8 | **0** |
| judgement present | 21 | **29** |
| per-person findings | 81 | 85 |
| agreements found | 56 | 66 |
| differences found | 29 | 35 |
| patterns found | 100 | 104 |
| commitments recorded | 44 | 52 → 44 |
| jargon in reports and boards | 511 | **123** |
| jargon in Groundwork's turns | 42 | 22 |
| turns asking more than one question | 37 | 30 |
| internal labels shown | 1,153 | 116 |

Nothing on the engine-value list dropped by more than a few per cent: "specific detail asked for"
is 84 against a baseline of 88, and "blocker checked" 34 against 37. Both are inside the run-to-run
range this report measured for them earlier.

### Task 1.5: the first condition is met, the second is not clearly met

**"Report with no judgement is 0."** Met. It was 8 and the eight are exactly the eight the
forty-word floor was silencing.

**"Matches the right answer in at least 20 of the 24."** I read all twenty-four against
`theDecision` myself. **Sixteen are unambiguously right. Five are close. Three are wrong.** Twenty-one
if the close ones count and sixteen if they do not, against a bar of twenty — so I am not going to
tell you it passed. It was ten before.

The three wrong:

- **newmanager.** Still says the team disagree about what Daniel's role is for. The right answer is
  that Daniel is still doing the work himself because he is faster at it, and the team read that as
  not being trusted.
- **loans.** Lands on operations — non-delivery and theft not reaching the lead — and **lost the
  systemic half it had this morning**: the repayment schedule starts 30 days after disbursement
  and the assets take two to three months to earn. The grace period was in the run-1 judgement and
  is not in this one.
- **realign.** Says the team are working on different things. The right answer is that two of them
  were steered by the CEO directly, in conversations the team lead does not know happened. **The
  CEO was named in the run-1 judgement and is not in this one.**

Two of the three wrong ones are things the engine got right this morning and no longer does. I
would rather flag that now than average it away: the new rule telling it to read *across* the
blocks may be pulling it toward process findings and away from the specific cause sitting in one
person's account. That is a guess, and the next thing I would test.

**And the workplan report.** The charge is gone — "a planning problem that you created" and "Tell
you to set a budget" are both absent, and a search of all twenty-four reports for that class of
phrasing, as every reader, returns one hit, which is factual ("The plan you created did not include
the hardest part of the work"). The double-count is still not found: the report says the budget is
180,000 and the plans come to 254,000, and asks for the cost of one named supplier, which is
circling it. Half the instruction is done and half is not.

### Task 1.4: one bar met, one missed

| | Baseline | A quarter of it | Now | |
| --- | --- | --- | --- | --- |
| jargon in reports and boards | 511 | 128 | **123** | met |
| jargon in Groundwork's turns | 42 | 10.5 | **22** | **not met** |

So 1.4 is not ticked either. The reports are where the work went and the reports are where it
landed; the conversation's own turns are half what they were and need about half again.

### And the one thing that came out worse

Curt turns, 0 to 3. All three were the single word "Understood.", shipped alone when somebody
declined a question and there was nothing left to ask. Fixed: a refusal now gets a sentence saying
what it does to the record. The test that covered it had pinned the exact string, so it had been
holding the defect in place.

## Your three decisions, done

### 1. People's own words stay exactly as they said them

The rulebook exempted quotations from **one** of its rules, the one about jargon. Every other rule
in it — full sentences, no fragments, no colons, a capital letter to start, plainer words — read as
applying to everything, quotations included.

Nothing had gone wrong yet that I could measure. What made it worth doing anyway is that the
wording score counts jargon **inside quoted material too**, so the cheapest way to improve the
number was always to tidy up what somebody said, and nothing in the rules stood in the way of it.

The exemption is now the first thing in the rulebook, before any rule it exempts, and it says what
to do instead: write your own plain sentence around the quotation and leave the quotation
untouched. A test pins the order, so a new rule cannot be added above it.

### 2. Plain names for all 49 patterns

In `docs/pattern-names.md`. Nothing switched on, no code reads it, the codes and internal names
untouched. Checked against `pattern-library.ts` rather than against my own list: 49 in the
document, 49 in the code, none missing and none invented.

Most are a short sentence rather than a noun phrase, because several internal names are **labels on
a person** — "Blame Shifting", "CEO-Pleasing", "Defensive Leadership", "Extractive Behaviour" — and
the rule is that no label goes on a person.

E4 and F5 are in a section of their own. They are never named to either person, and giving them a
friendly plain name makes it *more* likely somebody puts them on a screen, not less.

**One thing for you.** Your example was "Coordination Without Leverage" → "Coordinates without
being in charge". The detector means something else by leverage: B5 is *"heavy communication, no
reduction in blockers"* — coordinating that does not unblock anything, whatever the person's
authority. Coordinating without authority is a different thing and often not a fault at all. I have
written B5 to the detector's meaning and left your sentence beside it. It may be the detector that
is named wrongly.

### 3. Task 1.5

**The forty-word floor is gone.** An empty brief still gets nothing, because there is nothing to
read; everything else is read, and the validator throws out what does not hold up, which is the
check that should have been doing this instead of a word count standing in front of it.

**And the guard below it is gone too**, so no thin frame can take the judgement with it again. A
room is judged from its people and their differences and never used the frame at all.

**Nothing is anybody's fault unless an account says so.** The limit now sits directly after the
rule that licensed it — the one inviting a finding about how the lead is running things — with the
two sentences that made it: *"Nobody wrote the target down"* is what the record holds, *"You
created this problem"* is a charge.

**And the finding that was missed.** Nothing told the model to read *across* the blocks. The
workplan answer — two leads have both costed the same contractor, and neither knows — is in neither
person's account. It only exists between them.

I have left one other forty-word floor alone, on `theSubjectsToCover`, deliberately. It decides
whether a brief is worth splitting into separately-askable subjects for a broadcast, it does not
block the judgement, and its reason holds: a one-line brief has one subject and the situation pack
already asks about it.

### And a privacy hole the change made visible

`ALIGNMENT_FEED_ONLY_CODES` — F5, E4, LOW_SPEC_MULTI_DIM, COLLUSION_RISK — are documented as never
to be named to either person directly, and are filtered out of the report, the board's alignment
feed and the live conversation. **The room judgement's material was the one route with no filter on
it, and the lead reads the judgement.** A cofounder ground handed it:

> [E4 Founder Burden Imbalance]: absorbs operational load relative to the other founder

about the other founder, to the founder.

This was true of every ground that already had a frame. Making the judgement run more often is only
what exposed it — the tripwire went red the moment those eight grounds started producing a
judgement. It is filtered now, and asserted **across every prompt** rather than one, which is a
stronger claim than the test made before.

### Three tests changed, none weakened

Two pattern tripwires kept whichever model call ran last, which was fine while report synthesis was
the only one. A second call runs after it now, so both were asserting about the judgement while
their names and headers both said synthesis — and both went red over a code the judgement is
designed to receive. They pick out the synthesis call explicitly now.

The engine-prompt ceiling moved from 118,000 to 119,000, by the rulebook's growth and no further,
following the discipline its own comment set. It also now asserts outright that neither protocol is
in the everybody-prompt, so the real claim no longer rides on a number that has to be raised each
time the rulebook grows.

## CORRECTION: the reports were never empty, and the run was lying to me

**The section below this one is wrong and I am leaving it there rather than deleting it, because
the mistake is the useful part.** I concluded from a 24-scenario run that one sentence in the
wording rulebook had emptied the reports — participants gone, agreements gone. It had not. The
engine wrote every one of those reports correctly. The *run* read the wrong one.

`run.ts` waited for a report to exist and then read it. A report is written after each person
checks in, so the first one that exists is the one written after the **lead** checked in: "Only you
have checked in so far", one finding. Run the twenty-four one after another, as the morning's run
was, and regeneration has caught up by the time the loop runs, so it happens to read the finished
report. Run six at once against one server and it does not.

Proved by asking the database what it actually holds for those same grounds:

| | Findings in the file | Findings in the database |
| --- | --- | --- |
| crisis | 1 | **3** |
| board | 1 | **3** |
| cofounder | 1 | **2** |
| advisor | 1 | **2** |
| across the twenty-four | 35 | **73** |

**Two things I wrote earlier are therefore withdrawn.**

*"One sentence in the rulebook emptied the reports"* — no. The rulebook change stays, because the
same ambiguity did measurably collapse the rewriting pass, and that was read from the server log,
which no capture race can touch. But on the report side it is now an unproven precaution, not a
proven fix, and I would rather say that than let a tidy story stand.

*"1.4 hit its bar: jargon in reports 511 → 43"* — worthless, and flattering in the obvious
direction. That was measured over lead-only reports, which are about a third of the text. **Task
1.4 is not proven and is not ticked.** A corrected run is going now.

The runner waits for one finding per person who checked in, and settles once three probes running
show the same number, so a scenario that genuinely produces fewer still finishes.

**What I should have done.** I caught exactly this mistake earlier today, on task 1.5, when a script
read session one of three and I noticed the judgement was right to say nobody had answered yet. I
wrote it up as a correction. Then I made the same mistake again four hours later, in a different
shape, and this time it survived two runs, a fix, a commit and a report section before the database
contradicted it. The lesson is not "read the last session" — it is that a number off a harness is
not evidence until something independent agrees with it.

## The same sentence emptied the reports, and the wording score looked excellent while it did

The 24-scenario run on the fixed composer came back, and the wording numbers are the best they have
been:

| | Baseline | Run 1 (this morning) | This run |
| --- | --- | --- | --- |
| jargon in reports and boards | 511 | 402 | **43** |
| internal labels shown | 1,153 | 138 | 53 |
| sentence starting in lower case | 579 | 0 | 3 |
| specific detail asked for | 88 | 74 | **94** |

1.4's bar was a quarter of the baseline, which is 128. Forty-three is a third of that. The drop in
"specific detail asked for" that this report spent the small hours chasing is also gone, without
anybody finding its cause.

**And the reports were empty.** Not shorter. Empty.

| | Findings | Agreements |
| --- | --- | --- |
| crisis | 3 → 1. Priya Raman's and Ben Carter's accounts, gone | 3 → 0 |
| pip | 2 → 1. Nathan Owusu's account, gone | 3 → 0 |
| cofounder | 2 → **0**. Nothing at all | 4 → 0 |

Twenty-two of the twenty-four lost their agreements entirely and kept only the lead's own finding.
Across the run: per-person findings 81 to 44, agreements 56 to 11, differences 29 to 14, patterns
100 to 83.

**It is the same sentence as the composer, doing the same thing to a different shape.** The
rulebook says

> EVERY FIELD YOU FILL IN IS READ BY A PERSON ... So write **one plain, full sentence in every
> field**

Right about a field holding one sentence. Wrong about a field holding a list. The model was
obedient: one sentence per field, so one entry per list. In the rewriting pass the same sentence
turned nine lines into one. Here it turns three people into one.

The rulebook now says the rule is about how each entry is written and never about how many there
are — fill in every entry the field asks for, one for each person, each agreement, each difference,
and never merge, drop, or shorten a list because the sentences got longer. The original rule is
untouched, so nothing of 1.4 is undone.

Proved at the prompt that actually runs, not from the file: `report_synthesis` re-seeded to **v5**
(`21400c24-7003-44e7-874f-75174ee64ce4`) and `system` to **v42**, both active, both carrying the new
text. The run measuring it is going now.

**Two things worth taking from this beyond the fix.** The first is that a report with excellent
wording and no participants in it passes every wording check we have; the scorer's problem list went
almost all to zero on exactly the run where the product stopped working. The second is that nothing
in the code changed to cause either failure, and no test on the code could have found either — both
were one sentence of English doing something reasonable in the wrong place.

## Task 1.4 was putting jargon back, and the only place it showed was the log

This is the one I would not have found by reading the code, and the code reads correctly.

The report has a rewriting pass: the engine writes a draft that is already true, the model says it
better, and a guard throws the rewrite away if the model invents a number, drops a number, or
changes the shape. Task 1.4 wired the plain-words rulebook into the rules that pass runs under. The
rulebook ends with

> EVERY FIELD YOU FILL IN IS READ BY A PERSON ... So write **one plain, full sentence** in every
> field

which is right about a field. This pass is not handed a field. It is handed a block of eight or
nine separate claims, one per line, and it is required to send back the same number of lines. So
the model did the only sensible thing with the rule it was given, and sent back one sentence for
the whole block. The guard then refused the lot and shipped the engine's own words - jargon and all.

**The change made to remove jargon was quietly putting it back.** The two runs say it exactly:

| Refusals | Before the rulebook reached this pass | After |
| --- | --- | --- |
| Wrong number of lines back | 420 of 1,208 (35%) | 111 of 192 (58%) |
| A line failed the guard | 788 | 81 |
| The commonest shape failures | 9 out 8 back, 10 out 9 back, 11 out 8 back | 8 out **1** back, 13 out **1** back, 14 out **1** back |

Before, the model was missing by one line. After, it was collapsing the whole block into a single
sentence.

The prompt never told it how many lines to send back - it was handed `<draft>` and nothing else.
It does now: the count, in both directions, and merging, splitting, adding and dropping each
forbidden by name, including the line that holds no number and no name, which was the one most
often lost. The guard is untouched.

Two more 1.4 stragglers went with it, both fields a person reads. The aim on the board was asked
for as "a short phrase" by one prompt while the schema at the other end of the same feature already
asked for a full sentence. And the operating-difference entry was built by gluing:

> On contracting, **they described:** I send the contract to the client myself. **What is written
> here:** Legal signs every contract.

That is the pattern fix 2 removed from the reports; it survived because this entry is written in
the conversation service rather than in a report. It reads as whole sentences now. Its three
existing tests all passed on the glued version, because they check that both halves are there and
that nobody is accused - both of which were true.

### And I lost the first run, by my own hand

The first 24-scenario run for 1.4 got four scenarios in and died at 15:05. The cause was me: the
six shards were background children of the builder helper, and when I stopped that helper - it had
finished its work and was waking every minute to say it was still waiting - the shards went with
it. All six stopped in the same second, which is what gave it away.

No measurement was lost that mattered, because the run would have been measuring the broken
composer above. The run now going is on the fixed code and is detached from anything I can stop.

## Task 1.5, found while the 1.4 run was going: one number is why eight reports have no judgement

I did not expect this to have a single cause. It has one, and it is a threshold written for a
different question.

`theFrameFor` in `conversation.service.ts:6477` decides whether a check-in's brief is detailed
enough to derive a frame of fields from, and it says:

> under forty words a brief is a question, not a specification

That is a reasonable thing to believe about *fields*. But `judgeTheAnswers` in
`reports.service.ts:3878` then opens with `if (!Array.isArray(frame) || !frame.length) return null`,
so no frame means no judgement at all — the function returns before it does anything.

The eight reports with no judgement are exactly the eight whose brief is under forty words:

| Judged | Brief | | No judgement | Brief |
| --- | --- | --- | --- | --- |
| drift | 40 words | | board | 39 words |
| workplan | 41 | | shock | 39 |
| discovery | 41 | | crisis | 37 |
| recognition | 43 | | contractreview | 36 |
| advisor, renewal | 44 | | openread | 32 |
| handover, realign | 46 | | snapshot | 27 |
| implementation | 47 | | pulse | 24 |
| pip | 48 | | updates | 16 |
| the other four | 57–96 | | | |

`drift` is judged at exactly forty words. `board` is not, at thirty-nine. Nothing else separates the
two groups — all sixteen and all eight are one-session check-ins with two to four people, all eight
have their findings and their shared picture, and every one of the eight has zero fitted check-ins,
because the fit needs the frame too.

**And the room read never needed the frame.** When a check-in is a room rather than a population,
the material handed to the model is `theRoom(people, differences, sessions)` — built from who is in
it and what they disagree about. The frame and the counted table are the *population* path. So the
guard at the top is throwing away a judgement that would not have used the thing it is guarding.

That is the fix for 1.5 and it is small. I have not made it yet: the 1.4 measurement is still
running and I am not changing the engine underneath it.

The other half of 1.5 — whether the judgement matches `theDecision` in at least twenty of the
twenty-four — is measured next, on the sixteen that have one.

## And the other half of 1.5, measured: ten of twenty-four reach the right answer

I read every one of the twenty-four judgements against the right answer in `theDecision`, which the
product never sees. **First I got this wrong and caught it**: my script took the first session's
report, so on the four multi-session scenarios I was reading a judgement written when only the lead
had spoken. "This check-in has not collected any information from Femi Okonkwo, Ngozi Eze, or
Kwame Mensah" is not a defect — at that point it was true. Read at the last session, sales is one of
the best of the twenty-four. The numbers below are from the final session in every case.

| | Scenario | What it does with the right answer |
| --- | --- | --- |
| **Right** | cofounder | Names who owns product as the live disagreement, does not smooth it |
| | project | Scope, not timeline: "like-for-like gateway swap or the new reconciliation work" |
| | renewal | Lands on our own cut-off, not the partner's performance |
| | recognition | Names Victor, the uncredited contractor, and says to credit him |
| | realign | Names the CEO as the second source of direction |
| | pip | "The problem is that Nathan does not know what you think the problem is" |
| | implementation | Separates deployed from in use, and names the Kano printer |
| | sales | Separates all four: Ngozi's credit committee, Femi's customers, Kwame counting the wrong thing |
| | seniorhire | The gap is in the brief: "Tobi believes their job is to manage the relationship, not the money" |
| | loans | Names the non-delivery and says to build in a grace period |
| **Close** | advisor | Gets the role disagreement, misses that he has no relationship at two of the three banks |
| | drift | Gets the substitution, never names who made the March request |
| | handover | "Exists only in the head of Patience Nkemdirim" — neither of the two specifics named |
| **Wrong** | newmanager | Says Daniel thinks the job is metrics. He is doing the work himself because he is faster |
| | discovery | A disagreement about the goal of the discovery, not about what the customer said. "Audit" never appears |
| | workplan | Misses the double-counted contractor entirely, and see below |
| **None** | the eight | The forty-word floor above |

**Ten of twenty-four right, thirteen if the three close ones count. The bar is twenty.** So 1.5 is
not one fix. The forty-word floor recovers eight reports from silence, but silence to *something*
is not silence to *right*, and I would rather say that now than discover it at the end.

### The workplan report accuses the lead of something nobody said

This is the one I would fix first whatever the score says. The lead opens their own report and
reads, word for word:

> You are describing a spending problem, but the record shows a planning problem **that you
> created**. You have not set a budget or done the work **they said they would**, which makes it
> impossible for Chidi Eze and Sara Lindqvist to make realistic plans.
>
> - Tell **you** to set a budget for the work.
> - Ask **you** to speak with the leads **they** said they would.

Four things are wrong in six lines. "A planning problem that you created" is a charge nobody in the
check-in made — the thing 1.5 says must never happen. "the work they said they would" is about the
reader and says "they". "Tell you to set a budget" is an instruction addressed to nobody. And the
actual finding — the plan comes to 141% of the budget because two leads have both costed the same
contractor, and neither knows — is not in the report at all.

### A label in prose that the scorer does not count

Also live on the lead's report, in newmanager:

> **Initiator:** tell Daniel Park that the manager's role is to coach and develop people.

Two of these across the twenty-four, both in `whatToDo[].move`. Fix 3 cleaned the prose but this
field is not on its path, and the scorer's label list does not catch a capitalised "Initiator:" at
the start of a sentence, so it counted zero. This is the second time a number said clean and the
rendered line was not.

## The last suspect for the "specific detail" drop is wrong, and the prompt is never cut for length

The open question in this report was: fix 2 makes one block appear more often, the engine prompt is
trimmed to fit, so the trimmer has to drop something else — possibly the blocks that ask for a
number or a date.

**There is no trimmer.** The log line I based that on —

> `Check-in …: engine 114920 to 101767 chars, leaving out GOAL ALIGNMENT …`

— does not come from a length budget. It comes from `onlyTheRulesThisTurnNeeds`
(`only-the-rules-this-turn-needs.ts:118`), which drops sections by **what kind of turn it is**, and
nothing else. There is no size, no budget and no cut anywhere in it: the whole function is a split
on the separator rule, a fixed set of headings to drop, and a re-join. `whatWasLeftOut` returns the
reason for each, which is why every log line carries one.

Measured across the 751 exclusions in run-1, this holds exactly:

| Block left out | Times | Why, from the log itself |
| --- | --- | --- |
| GOAL ALIGNMENT | 751 of 751 | It is the fallback for a situation with no pack, and every situation has one |
| RETURNING USER OPENING | 628 | Session one has nobody returning |
| Twelve more, together | 87 | Written for a conversation underway; an opener is written before anybody has spoken |

The eighty-seven are one per check-in, on **eighty-seven distinct check-ins**, every one cut to the
same size within a thousand characters. That is eighty-seven openers, not eighty-seven prompts that
ran out of room.

**And 1.4 did not change it.** Plain wording made the engine prompt longer, 114,920 to 117,169
characters, which is what I would expect and is the thing that would have mattered if a budget
existed. The set of blocks left out is identical before and after, and so is the proportion: 87 of
751 in run-1, 23 of 198 in run-2 so far — 11.6% both times.

So the drop in "specific detail asked for", 88 to 74, has **no identified cause**, and the two-hour
bisect the last section proposed would have been looking in the wrong place. I have not opened it
again tonight; the numbered tasks come first and this is written down so it is not lost.

## The 50 scenario packs — step one done, and they can be read now

Your instruction was: copy all 50 into files first, so they can be read and compared; then write
improved versions as NEW versions that are not switched on; then a before-and-after document; and
never delete or overwrite the old ones.

**Step one is done.** `docs/scenario-packs/current/` holds all fifty, one file each, with the key,
the version and the activation date at the top of every one. `docs/scenario-packs/README.md` is an
index with the character counts. **All 50 match the database byte for byte**, checked by reading
each file back and comparing — the export is a faithful copy, not a re-rendering.

They add up to about 260KB, and they are stranger to read together than apart: some run to four
pages, some to four lines. `scenario.pip.initiator` is at version 5 and opens

> MOMENT: Helping somebody get back on track.

while `scenario.workplan_budget.initiator` is still at version 1 from 26 August.

Editing these files changes nothing at runtime, and the header of every one says so, because that
is exactly the trap: only `system` and `report_synthesis` are re-seeded from files on boot.

**Steps two and three are not started.** Writing fifty improved versions is not a mechanical job -
each one is a situation's own voice, several revised eight times - and the before-and-after
document needs a conversation run per situation on both the old and the new pack, which is a run of
its own. It is queued behind the numbered tasks rather than squeezed in beside them.

## Task 1.4, and the jargon is mostly not the AI

Measured before touching anything, on run-1, all 24 scenarios:

| | now | baseline | target |
| --- | --- | --- | --- |
| jargon in reports and boards | 234 | 511 | 127 |
| jargon in Groundwork's turns | 15 | 42 | 10 |

**163 of the 234 are one sentence the product writes itself**, repeated on every dependency row:

> ... "their bank statements"; nothing on record about **escalating** it.

That is `what-the-record-shows-over-time.ts`, not a prompt. Rewriting that one sentence takes
reports and boards from 234 to about 71, under the target on its own.

Three other things are in that count and only one is a wording problem:

- **A quotation of what somebody said.** `Fatima Sow: "I would escalate the issue"`. Her word, and
  the rules say to use the words the team itself used. **I am not rewriting it.** If the scorer
  keeps counting it, the scorer is counting something correct, and I would rather tell you that
  than launder what she said.
- **Pattern names.** "Alignment Creator", "Coordination Without Leverage" are 2 of the 49 named
  codes in the pattern library. Renaming those is a product decision, not tidying, so they are
  untouched. Whether they are ever shown to a person at all is being checked - if they are
  internal only, they do not matter here.
- **The rest is prompts,** which is what fix 6 was actually meant to be, and is much smaller than
  the number suggested.

## The fix, and what the numbers do and do not prove

NEW_HIRE, "specific detail asked for", the same scenario throughout:

| | runs | mean | range | turns |
| --- | --- | --- | --- | --- |
| old code, 25 September | 14, 12 | **13.0** | 12–14 | 69, 69 |
| broken, labels in the prompt | 9, 5, 8 | **7.3** | 5–9 | 69, 69, 67 |
| **fixed, names in the prompt** | 23, 8, 12, 9 | **13.0** | 8–23 | 72, 70, 69, 71 |

**The mean is exactly back where the old code was.** Two of the four fixed runs are above anything
the broken code produced, and the counter is calibrated - it reproduces the stored run-0 and run-1
figures exactly.

**And four samples still cannot separate that from this scenario's own variance.** The fixed range
runs 8 to 23, and the 8 sits inside the broken range. Four runs were done rather than two precisely
because the first two came out 23 and 8, and reporting those would have been misleading either way.
If you want this settled rather than indicated, it needs about ten runs an arm.

**The fix does not rest on the number, and that is the more important point.** Telling the engine
that somebody is waiting on "Participant B" is wrong on its face: no question can be built out of
a slot in a template. The line now reads:

> "Sign-off on the six credit files" on Ngozi Balogun, 21 days old, nobody has escalated it.

and on a PIP, where colleagues stay unnamed:

> "Sign-off on the six credit files" on a colleague, 21 days old, nobody has escalated it.

**A privacy hole was found on the way, which I had not asked for.** The same two-line peer rule was
written out three times - reports, board, grounds - and the conversation, the fourth reader and the
one that builds what the engine actually says, had no copy at all. One of the four blocks fixed was
gated on the ground being SHARED, and an evaluation ground is SHARED by default: so the report and
the board withheld a colleague's name from the person being reviewed, and the interview said it
out loud in the next question. It is now one function, `peersAreNamedOn`, with the three copies
replaced by it.

Checked at output on a fresh PIP run rather than from the test: Nathan never used Caroline's name,
and Groundwork never said it to him. No "Participant X" in any turn of any run, old or new - the
damage was always in the prompt rather than in what was shown.

API 9,011 tests green.

## The cause, found

`conversation.service.ts:3164` puts the report LABEL into the interview prompt - the block that
tells the engine what this person is waiting on and who from.

> before fix 3: "waiting on Relationship officer, Ikeja. Target 14 approved facilities this quarter"
> after fix 3: "waiting on **Participant B**"

Fix 3 made labels positional, which is right for a stored report and wrong here. The label
machinery exists so a report carries no names and they are swapped in per reader. An interview is
with one known person, about a colleague that person named out loud themselves. Reducing that to
"Participant B" took away the thing the engine reasons from, and there is no useful question to ask
about Participant B.

Six things ruled out first, each with a measurement rather than an argument: conversation length
(identical, 69 turns), the findings block (fires more now, 6 and 5 against 3 and 2), the opener
rewrite (the two old runs differ from each other as much as from the new), prompt version drift
(`system` still v40), prompt trimming (identical - same blocks dropped, mean surviving engine
94,154 chars against 94,139), and fix 1 reaching the conversation at all (it cannot - the
conversation reads the raw report row). Two of those were hypotheses I had written up with some
confidence, and the measurements killed both.

**The privacy limit on the fix, which Hafsah added and which I had got wrong.** My first brief said
"use the person's display name", which is too broad: a name in the prompt is a name the engine may
say out loud. The rule is now, in order - the name the speaker used themselves; otherwise a real
name only where that check-in shows names; and in an evaluation check-in, where the speaker did not
name them, a description of what they do and nothing that identifies them. Never "Participant B".
A test asserts that in a PIP run the reviewed person never sees a colleague's name they did not use
themselves.

## Answered — thank you

All four questions below were answered on 26 September and the answers are being worked through.
Kept here with their answers so the reasoning is not lost.

1. **"Participant B"** — decided: colleagues stay unnamed in evaluation check-ins, and are called
   "a colleague", or "one colleague" and "another colleague" where there are several, used the same
   way through a whole report. Being built now. *One small extension I made and am flagging: her
   words cover one and two. For a third and beyond I have continued the same pattern - "a third
   colleague", "a fourth colleague" - rather than inventing a different scheme.*
2. **The 50 database-only scenario packs** — decided: copy all 50 into files first, write improved
   versions as NEW versions that are NOT switched on, and produce a before-and-after document with
   one example conversation per situation. Nothing deleted or overwritten. Queued behind item 3.
3. **The two numbers that went down** — decided: run the 25 September commit twice in a separate
   worktree and score both, before any more conversation changes. **Running now.** If the old code
   also gives about 74 and 33, the baseline was a lucky run and I write
   `docs/baseline-candidate.json` as the average of the two. If it gives about 89 and 37, something
   we changed affects the questions and I find it before anything else.
4. **The main checkout** — fine to carry on, given the keys, the mail and the database are all as
   checked.

## Needs Hafsah

### 1. "Participant B" is unavoidable today, and only you can choose what replaces it

Task 1.1 sends me to read the participant's report in PIP, RECOGNITION and CONTRACT_RENEWAL. Two of
the three show a colleague as **"Participant B"**, and I cannot fix it without your decision.

What Amara reads in RECOGNITION:

> Participant B built the front end for the project. Participant B says the hardest part of the work
> was Victor's script.

What Blessing reads in CONTRACT_RENEWAL:

> Participant B says the most frequent issue has been around handover times. Participant B says this
> has been a recurring problem since April.

**This is not a bug. It is two rules meeting.** PIP, RECOGNITION and CONTRACT_RENEWAL are the
EVALUATION family, where peers are deliberately not named to each other: in a check-in that is about
judging one person, the others stay anonymous. The lead is still named and the reader is still
"you"; only the peer stays a label. Meanwhile the rules say nobody may ever read "Participant A".

Both rules are right. The product simply has no third word.

**My suggestion, and why I have not just done it:** render an unnamed peer as a plain human phrase,
"another person on this check-in", instead of a label. It reveals strictly less than a name, so it
cannot weaken the privacy rule, and it reads like English.

The catch, which is why it is yours: **with two or more unnamed peers the phrase repeats, and the
reader can no longer tell whether two sentences are about one person or two.** In these three
scenarios there is exactly one unnamed peer each, so it would read perfectly. In a five-person
evaluation it could mislead, and a report that quietly merges two people is worse than one that
says "Participant B".

Three ways, and I would take the first:

1. "Another person on this check-in" where there is exactly one unnamed peer, and something that
   still distinguishes them where there are several ("one of the others", "a second person on this
   check-in").
2. Always the plain phrase, accepting the ambiguity when there are several.
3. Name peers in evaluation check-ins too. That is a privacy change and I would not make it.

Until you say, those two reports keep the labels and **task 1.1 stays open**. Everything else in
1.1 I am fixing tonight.

### 2. Fix 6 cannot be done by editing files alone, and 50 of the prompts are yours not mine

The rules told me to find out where the running prompt comes from before changing one. I did, and
the answer splits three ways.

| Prompt | Where the running version comes from | How it changes |
| --- | --- | --- |
| `system` (ENGINE_RULES, 114,920 chars, now v40) | the database, but **re-seeded from the file on every boot** when the file differs | edit the file, rebuild, restart. A new version is created and activated automatically, and the version number proves it ran |
| `report_synthesis` (10,170 chars, v3) | same | same |
| **50 scenario packs** (`scenario.pip.initiator` and friends, some at v8) | **the database only** | editing files does nothing. They must go through `/prompts` |
| everything else - the picture, the judgement, the guide, entry, the board | the file | edit the file |

Every report from tonight's run recorded `promptVersionId 0791a393…`, which is `report_synthesis`
v3, so this is not theory: that is the row that wrote them.

**The 50 scenario packs are the part I am not going to touch on my own.** They are not generated;
somebody wrote them and revised them through August and September, several as far as version 8.
They are where a situation's own voice lives. Rewriting fifty of them overnight for wording, with
no way to show you each one first, is the kind of change that loses something nobody notices for a
month.

**My suggestion:** I do fix 6 on everything in the first, second and fourth rows - which is the
base engine, the synthesis, and every prompt that writes a report, board, guide or email - and
leave the fifty packs. Then you decide whether they need the same pass, and if so I do them in a
batch you can read before it is activated. If you would rather I did them tonight, say so and I
will.

### 3. The scorer cannot see the plural form of a label

Small, but it matters because it is a blind spot rather than a disagreement. `tools/score_run.py`
looks for `Participant [A-Z]\b`. The engine sometimes writes the collapsed plural, and the lead's
own board said:

> You believe the target is collective, while **Participants A, B, and C** all believe they are
> working towards individual targets.

Three real people left as placeholders on their own board. "Participants" is not "Participant", so
the pattern misses it - and so did the name substitution, for the same reason. I am fixing the
substitution tonight. **The scorer's pattern I have left alone**, because I am told not to touch it,
so be aware that its label count has always been slightly under the truth.

**My suggestion:** widen that one pattern to `Participants? [A-Z]\b`. One character.

### 4. The engine-value conversation numbers are noisy, and the gate cannot tell noise from a regression

Two engine-value numbers came in below the baseline on tonight's run, which the scorer calls a
failure:

| | Baseline | Tonight | Gate |
| --- | --- | --- | --- |
| specific detail asked for (turns) | 88 | 74 | fails (>10% drop) |
| blocker checked (turns) | 37 | 33 | fails (>10% drop) |

**I called this noise earlier in the night and I was wrong. A second full run changed my mind, so
here is the corrected version.**

I have now run all 24 scenarios twice tonight, on different code, hours apart:

| | baseline (25 Sep) | run-0 | run-1 |
| --- | --- | --- | --- |
| specific detail asked for | 89 | **74** | **74** |
| blocker checked | 37 | **33** | **33** |

Two independent runs landed on exactly the same pair. That is not what noise looks like at the
total, and the "it is just variance" argument I wrote at 02:00 does not survive it.

**What IS true about variance, and I checked it properly.** Per scenario the spread is large. Only
5 of the 24 gave the same pair twice: drift went 1 then 4, board 1 then 3, seniorhire 9 then 5,
snapshot 0 then 2. And running ACUTE_SHOCK three times on identical code gave 4, then 0, then 1. So
a single scenario tells you nothing. What I missed is that 24 of them added together are far
steadier than any one, so the total is a real measurement and the baseline's 89 sits well outside
where the last two landed.

**What that leaves.** Something between 25 September and tonight moved these two numbers down by
about a sixth, reproducibly. Three scenarios are now consistently at zero where the baseline had
them above it: ACUTE_SHOCK 4 to 0 and 0, PIP 2 to 0 and 0, OPEN_READ 1 to 0 and 0.

**I could not find the cause, and I am not going to pretend otherwise.** Nothing I changed touches
which question is asked: `whatACompleteAnswerHolds`, `the-field-this-answer-is-missing` and the
blocker checks are untouched, and fixes 1, 2 and the plural and verb fixes are all on the read path,
after the conversation is over. The one conversation-path change I made is the opener attribution in
`32bb938a`, which only rewrites a first turn that says "you said" before the person has spoken. I
cannot see how that removes fourteen "how many" questions across a run, but I cannot rule it out
either, and the honest thing is to say so rather than to argue myself out of it.

**What I suggest, in order:**

1. Run the 24 scenarios twice on the 25 September commit and see whether 89 reproduces. If it does
   not, the baseline was the outlier and nothing is wrong. That is two hours of machine time and it
   settles it; I did not have the hours left tonight to do it as well as the work.
2. If 89 does reproduce, the opener change is the only suspect and should be tested on its own.
3. Either way, these two counters need a wider band than ten per cent, because a single scenario
   swings by four. The report-derived numbers - differences, agreements, findings, patterns,
   commitments - are computed from the record rather than from prose and were stable or up on both
   runs, so they can stay where they are.

**What I did meanwhile:** carried on, because the alternative was to stop all work on an unexplained
sixth, and said plainly here that the gate is failing rather than quietly passing it.
### 5. This is your main checkout, not a separate copy

Task 0.1 asks me to confirm "this is a separate copy of the code on its own branch". It is on its
own branch, but it is **the same working copy you use** — `/Users/hafsahjumare/Documents/GitHub/groundwork`,
whose `.git` is a real directory rather than a worktree pointer. There is an old worktree at
`/private/tmp/gw-main` on `main`, marked prunable, which is not being used.

Everything the check is really guarding against is clear: test keys only, no live database, no mail.
So I judged the risk to be that you open the repo in the morning and find yourself on my branch with
my commits, which is ordinary and reversible — not that a mistake could reach anything live. I
carried on rather than stopping the night's work over the layout.

**My suggestion:** leave it. If you would rather I worked in a worktree, say so and I will move the
branch into one; nothing depends on the path.



---

## Phase 0. Get ready

### 0.1 Check it is safe — done, with the one deviation above

| Check | Result |
| --- | --- |
| Own branch | Yes — `fix/plain-reports`, six commits, none pushed |
| Separate copy of the code | **No** — this is your main checkout. See "Needs Hafsah" above |
| Stripe | Test only. `STRIPE_SECRET_KEY` is the literal placeholder `sk_test_...` |
| WhatsApp | Off. `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are both empty |
| Email | Cannot send. `RESEND_API_KEY` is the placeholder `re_...`, and `EMAIL_SENDS_FOR_REAL` is unset — the sender needs both to be real before anything leaves |
| Database | Local test database: `gw_pw9_1786222102` on `localhost`, holding 483 organisations, 669 check-ins and 1,901 people, all of it journey-test data |
| Model | Gemini through Vertex, project `groundwork-500011`. Real calls, which the scenario runs need |

### 0.2 Score where we are now — done. Saved as `docs/score-at-start.md`

All 24 scenarios ran live against the real engine, six shards in parallel, into
`api/journey/all-24/run-0`. Every scenario produced a conversation and a report.

The reports are now being re-read after a final synthesis. This is not optional and it is worth
saying why: the runner reads a report the moment the round releases, which on a two-person check-in
can be the moment the FIRST person finishes. Left as captured, the renewal scenario's participant
report said "One person has answered so far" about a check-in where both had answered. The baseline
was taken the same way, so scoring an unsettled run against it would compare two different things.

**Where the numbers stand after fixes 1 to 3.** Seven of the eleven problems are already at zero
or well down, and nothing in the record-derived engine value dropped:

| Problem | Before | Now |
| --- | --- | --- |
| slot names glued to answers | 734 | **0** |
| "nothing contradicts" then differences | 104 | **0** |
| name with a stray full stop | 122 | **0** |
| text cut mid-word | 48 | **0** |
| participant report carries the lead's judgement | 21 | **0** |
| sentence starting in lower case | 579 | 155 |
| role description used as a name | 312 | 36 |
| machine table words shown | 1461 | 1032 |
| "1 people" | 61 | 36 |
| internal labels shown | 1153 | 1370 |
| report with no judgement | 8 | 8 |

Engine value held or improved everywhere it is computed from the record: commitments 33 to 46,
differences 29 to 31, findings 81 to 83, agreements 56 to 55, patterns 100 to 100, judgement present
21 to 21. Jargon in reports fell 511 to 459 and in the conversation 42 to 28.

**The one that went UP is real, and it is not a new defect - it is an old one made visible.**
Internal labels rose because fix 3 turned role-shaped labels into positional ones: text that used to
read "Relationship officer, Surulere. Target 14 approved facilities this quarter." now reads
"Participant A", so it moved from one counter to another. Underneath both is the same fault, which I
found by reading the served board rather than the code:

  the board never applies names at all to the fields it takes off the report row.

Read live, the lead's own board says "The initiator believes the team is behind on a collective
goal" and "the initiator is waiting on the credit committee". The report was fixed; the board was
never covered. That is being fixed now as part of task 1.1.

**One thing I got wrong and fixed.** My first attempts to wait for the run used
`pgrep -f 'all-24/run.ts'`, which matches the waiting shell's own command line, so the wait could
never end and the refresh that was queued behind it never started. Six background waits sat doing
nothing before I noticed. No work was lost - the run itself was fine - but it cost about half an
hour of wall clock. The waits now watch for a marker file instead.

---

## What was already done before tonight

Fixes 1, 2 and 3 were finished earlier and are on this branch as five commits. Recorded here so the
morning reading is in one place.

| Commit | What |
| --- | --- |
| `96df60a4` | **Fix 1, the leak.** 16 of 24 participant reports carried the lead's judgement, word for word. Nathan could read that he was about to be put on a plan. Fixed at the read, for the report and the board |
| `588c6ab2` | **Fix 2, the gluing.** 734 lines of "said this was for:" joined to answers to different questions, and a fixed opening claiming no contradictions immediately before listing them. The facts are unchanged; one model call now writes the prose |
| `f80ef2a9` | **The fallback**, after you asked to see it. My first one still glued. It now says one true short sentence and stops |
| `32bb938a` | **Fix 3, names not labels.** A role description was being used as a person's label, and `applyNames` walked eight named fields while everything else came through unnamed |
| `be8b48d9` | **Nathan's report**, your four points: the reader's side, full name once, the fact that explains the disagreement, and no jargon |

Two commits tonight were the kit itself: `73894140` (kit and the four docs) and `e0fcd32a` (the
guard update).

---

## Read ahead for Phase 2, from tonight's conversations

Not tasks I have started. I read ACUTE_SHOCK and the sales scenario in full against the twelve
points in `docs/conversation-standard.md` while the scenarios were running, so Phase 2 starts with
evidence rather than a fresh reading.

**The lead is still never named (point 1).** Two openers, neither naming anybody:

> Tobi, thank you for making the time. This conversation is about Meridian giving notice…

> This check-in is about seeing how your work is going against your goals this quarter. Your
> target is 12 approved facilities.

The second should be "Bisi says your target this quarter is 12 approved facilities. Is that right?"
My fix in `32bb938a` only fires when the model attributes something to the person ("you said…"), and
neither of these does, so nothing triggers. **Task 2.1 is a real change, not a tidy-up.**

**Two asks in one message, which the scorer cannot see (point 4).** It counts turns with more than
one question mark. These have one:

> When did you first learn about it, and from whom?

> Of what you just described, what do you know first-hand, and what are you assuming or repeating
> from someone else?

Both are two questions wearing one mark. The number for 2.2 will reach zero without the problem
being fixed, so 2.2 needs the reviewer to read, not just the counter.

**It asked the same thing twice in a row.** The first-hand-versus-assumed question above is asked,
answered, and then asked again in the next turn. It reads as not listening.

**A probe fired where it made no sense.** After Tobi explained that the customer's champion had
left, Groundwork asked:

> Who arranged the original access to Sarah, or how did that meeting come about?

Nobody had claimed credit for access to Sarah. That is `who-secured-that-meeting` firing on the
word "meeting" in a sentence about somebody leaving. Worth a look in Phase 2.

**What it got right, and must not lose.** In the same conversation it pulled out all three warning
signs the scenario hides - the two cancelled reviews, the champion leaving in July, and "I reported
the account as healthy because usage was flat" - which is exactly what ACUTE_SHOCK exists to test.
Whatever Phase 2 changes, that has to survive.

**Jargon in the questions**, from the sales conversation: "What is the total amount you have had
**disbursed** this quarter?" and "what is stopping your **deals from converting**". The standard's
own table gives the replacements. From the new hire: "**proactive monitoring for account health**".

**And a piece joined on with a colon, which the wording rules forbid outright.** From the new hire,
a single turn:

> To keep them satisfied and engaged: what does that look like in practice from your side? What is
> the first thing you mean to do to make that happen, and how will you go about it?

A fragment, a colon, then three questions. This one the counter does catch, because it has two
question marks - but the colon-glued fragment in front of it is invisible to every number we have.

---

## The baseline test — the answer, and it splits in two

Both runs of the 25 September code are done. `docs/baseline-candidate.json` is written, as asked:
the average of those two runs.

| | specific detail | blocker | proof asked | past words |
| --- | --- | --- | --- | --- |
| baseline as saved (25 Sep) | 89 | 37 | 42 | 25 |
| old code, run A | 81 | 34 | 35 | 36 |
| old code, run B | 87 | 35 | 48 | 18 |
| **old code, mean → the candidate** | **84** | **34.5** | **41.5** | **27** |
| new code, run-0 | 74 | 33 | 46 | 32 |
| new code, run-1 | 74 | 33 | 54 | 27 |

**"Blocker checked" is settled and there is nothing wrong with it.** The old code's own mean is
34.5; the new code gives 33. That is 4% down, well inside the gate. The saved baseline's 37 was
simply the top of its range. Nothing to fix.

**"Specific detail asked for" is a real drop, and I have not found the cause.** The old code gives
81 and 87; the new code gives 74 twice. And it concentrates: NEW_HIRE alone accounts for six of the
ten, so I ran that one scenario six times.

| NEW_HIRE, "specific detail" | |
| --- | --- |
| old code | 14, 12 |
| new code | 9, 5, 8 |

Six samples, no overlap, and the turn counts are identical at 69. That is not sampling.

**What I ruled out, each with a measurement rather than an argument:**

- *Conversation length.* Identical: 69 Groundwork turns on every run of NEW_HIRE, old and new.
- *The findings block that feeds the lead's later sessions* (`conversation.service.ts:4378` reads
  `report.findings` where a finding has both a gap and a headline). This was my best guess, because
  fix 2 changed who writes that headline. It is wrong: the new code produces **more** of them, 6
  and 5 against the old code's 3 and 2, so that block fires more often, not less.
- *The opener rewrite,* the only other conversation-path change I made. The openers differ between
  the two OLD runs as much as they differ from the new ones - the model writes a fresh one each
  time - so there is no systematic difference to blame.
- *Prompt drift between the two servers.* They share a database, so the old server could have
  re-seeded the engine prompt and changed it for both. It did not: `system` is still v40 and
  `report_synthesis` still v3, unchanged since 23 and 15 September.

**The bisect did not work, and I stopped it rather than read tea leaves.** One NEW_HIRE run per
commit is not enough: the conversations come out different lengths - the fix-1 point ran 53 turns
against the usual 69 - so a raw count is not comparable between points, and a rate over one sample
tells you nothing. Doing it properly is three commits times two or three runs each, about two
hours, and it should be done that way rather than badly.

**But I can name the remaining suspect, and it is specific.**

The conversation reads the report from the **raw database row**, not through the filtered read - I
checked both call sites (`conversation.service.ts:2846` selects `report.findings`, `:3798` selects
`report.inferences`). So fix 1, which filters at the serving endpoint, cannot reach the conversation
at all. That rules it out on principle rather than on a sample.

Fix 2 *can*, because it changed the `findings` rows themselves. And I measured earlier that findings
with both a gap and a headline went **up**: 3 and 2 on the old code, 6 and 5 on the new. That block
(`putThisToThem`, at `:4378`) is what puts a disagreement to the lead in a later session, so it now
fires more often.

Here is why "more" could still mean "fewer questions". **The engine prompt is trimmed to fit.** It
is assembled from around forty blocks and cut down when it is too long - `a-prompt-that-ran-out-of-room-says-so.ts`,
and the log line at `:4411` reads "engine 114920 to 101767 chars, leaving out …". If fix 2 made one
block appear more often, the trimmer has to drop something else, and what it drops could be exactly
the blocks that ask for a number or a date.

**How to test it, precisely:** run NEW_HIRE on the current code and on `ed2b4996` with the engine
logs kept, and compare the "leaving out" lines. If the new runs are dropping blocks the old runs
kept, that is the answer, and the fix is to make the trimmer protect the question-generating blocks
rather than to undo fix 2. That is one run each, not six, because the log says it outright.

I have not done it: I would rather hand you a named hypothesis and the one-command test than spend
the remaining time on more samples.

## The first result, before both runs were in

The first of the two runs of the 25 September code is in.

| | specific detail | blocker | proof asked | turns |
| --- | --- | --- | --- | --- |
| baseline as saved, scored 25 Sep | 89 | 37 | 42 | 747 |
| **the same old code, re-run today** | **81** | **34** | 35 | 752 |
| new code, run-0 | 74 | 33 | 46 | 746 |
| new code, run-1 | 74 | 33 | 54 | 751 |

**The baseline does not reproduce.** Identical code, identical harness, 89 one day and 81 the next.
So the saved baseline is towards the high end of its own spread, which is the thing I could not
establish last night and the reason the answer looked like a regression.

**But the new code is lower still,** 74 twice against the old code's 81. That gap is smaller than
the one the gate was complaining about, and it may yet be nothing: one more run of the old code
tells me whether the two overlap or sit apart. It is running now.

Note that "proof asked for" moved the other way - 35 on the old code today against 46 and 54 on the
new - which is a point in favour of the whole thing being spread rather than direction.

The turn counts are within five of each other across all four runs, so none of this is an artefact
of longer or shorter conversations.

## How the test was set up

Her item 3, and it comes before any further conversation change.

A worktree at `/tmp/gw-baseline` holds `ed2b4996`, the commit immediately before fix 1, so it is
this branch with fixes 1, 2 and 3 and everything after them removed and nothing else different.
Its own server runs on port 3001 against the same local database; the harness there points at 3001.
Two full 24-scenario runs, scored the same way as everything else.

Two things went wrong in the setup and are worth recording, because both would have produced a
confident wrong answer:

- **`prisma generate` in the worktree rewrote the shared client.** The two checkouts share
  `node_modules`, so generating from the older schema removed `theOpening` from the client the main
  checkout builds against. The running server survived because it had already loaded the client,
  but the next rebuild of main would have failed. Fixed by generating from the NEW schema and using
  that for both - the old code never mentions `theOpening`, so a superset client is harmless to it,
  and I confirmed the old commit still builds and boots against it.
- **The first run produced nothing at all.** `GOOGLE_APPLICATION_CREDENTIALS` is a relative path,
  so in the worktree it resolved to a directory that does not exist and every model call failed.
  Had I not looked at the log, I would have scored an empty run and reported that the old code asks
  no questions either. Linked the credentials in and started again.

## Log

**Phase 0 done and committed** (`bab9fa61`). Safety checked, all 24 scenarios run and scored,
`docs/score-at-start.md` saved.

**The board never named anybody** (`10adaf92`). Found by reading the served board rather than the
code: the lead's own board said "The initiator believes the team is behind on a collective goal"
and "the initiator is waiting on the credit committee". The report had been fixed; the board had
its own half-rule that only named a whitelist of fields. The whole report row now goes through the
report's own read, for whoever is asking, so a field added later is named without anybody
remembering. Internal labels on that board: lead 109 to 0, participant 9 to 0. Verified live as
both readers, and fix 1 still holds - the participant gets no judgement and no table.

One consequence worth stating plainly: peers are now named to each other in the board's prose on a
non-evaluative check-in. That is not a loosening. I checked the run data from before the change and
Femi's own **report** already named Ngozi and Kwame; the board was the surface that disagreed with
the report, while its own roster printed those names three inches away.

**The machine's table reaches nobody** (`aba063cd`). All 800 machine-table hits were inside
`theTable` itself, 400 in the lead's report and 400 in the lead's board, and nowhere else - so this
was one change with three counters behind it. It is still computed and still written to the row,
because it is the evidence behind a judgement; it simply never reaches a read. Verified live on all
four reads: `theTable` null on both boards, the key absent from both reports, and `FIELD:` and
`standing:` at zero everywhere. The client already guards on the field, so the "See the counts
behind this" toggle simply does not render - no empty box.

**"Participants A, B, and C" was three people, and none of them was named** (`97865ca5`). The
plural form evaded the substitution and the scorer both. The plural is now expanded into singulars
before the names go in, so the existing machinery does the rest: the lead reads "while Femi
Okonkwo, Ngozi Eze and Kwame Mensah all believe they are working towards individual targets", and
Femi, who is one of them, reads "while you, Ngozi Eze and Kwame Mensah all believe". Where peers are
hidden it correctly stays "while you, Participant B and Participant C".

**"The record shows you blames the market"** (`94c26c0d`). The safe shape - a verb immediately after
"you" - just missing from the closed list. Four real verbs added, found by reading every `you
<word>s` across all 24 scenarios: blames, owes, points, observes. Four look-alikes deliberately left
out, because they are the argument for a closed list: "Grace's own plan **for you calls** for two
signed agreements" and "which **for you means** the supplier acknowledging tickets" are both
correct English, and a general rule would have broken them.

That search also turned up a live bug in the rules that were already there: "A key worry **for you
is** that you didn't see this coming" was being turned into "for you are". A preposition immediately
before "you" now holds off every agreement rule, which narrows what was there rather than widening
it.

**Labels in prose are now zero on all four reads** - lead board, lead report, participant board,
participant report - measured against `the initiator`, `Participant X`, `Participants X` and `the
person who set this up`. The 18 and 7 that remain are `.label` and `.participantLabel` keys, which
are deliberately raw because `own-reads-only` filters per-person rows on them. I checked every one:
none is prose.

**I took out a rule of my own that was making grammar worse.** In `be8b48d9` I added a pass that
made a verb joined on with "and" agree with "you". It fixed three sentences and broke two:

> You believe the team is behind on a collective goal for one reason, but the record shows each
> person is working on an individual goal and **are** blocked by a different problem.

> You say the office move is going well and **are** on schedule.

In both, the verb belongs to a different noun - "each person", "the office move" - and no regular
expression can tell which. It was putting newly wrong grammar on the lead's board, so it is
reverted. The safe half stays: a verb sitting *immediately* after "you" ("you is" to "you are") is
not in doubt and is untouched. Coordinated verbs move to fix 8, where the reader is known and a
single line can be rewritten properly.

---

## "A colleague", not "Participant B" (task 1.1, the last piece)

Hafsah decided the open question: in evaluation check-ins (PIP, RECOGNITION, CONTRACT_RENEWAL) a
colleague stays unnamed to the person being reviewed, and what they are CALLED is "a colleague"
when there is one, and "one colleague", "another colleague" when there are several, used the same
way through the whole report.

What Amara Diallo used to read in her own recognition report:

> Participant B built the front end for the new onboarding flow. Participant B believes the success
> was due to the clean and responsive design.

and what she reads now:

> A colleague built the front end for the new onboarding flow. A colleague believes the success was
> due to the clean and responsive design.

Blessing Okafor, in the contract-renewal report:

> A colleague has been in weekly contact with the delivery partner. A colleague interpreted the
> partner's requests as an attempt to get ahead, rather than a genuine problem.

Nobody's entitlement changed. The phrase is worked out once from the whole party list, in the order
`labelsForParties` hands its labels out, so one person is one phrase in the picture, the judgement,
the divergences, the board and the engagement header. The branch it replaces printed the person's
JOB - "Managing Partner expects two large projects" - to a reader who may not know who they are,
which is exactly what her decision rules out; two tests that pinned that are changed, with the
reason in the commit.

**Read live on the running server.** PIP is unchanged, because Nathan's only other party is his
lead and she is named to him - there is no colleague in it to mention. The sales check-in
(OKR_ALIGNMENT), where peers ARE named, is byte-for-byte identical before and after. Re-serving all
24 scenarios through this build and scoring against run-1: "internal labels shown" 138 to 110, and
every engine-value and conversation number unchanged. All 9,006 API tests pass.

**Two things for Hafsah.**

1. Her words cover one colleague and two. I carried the same pattern on for a third and beyond ("a
   third colleague", "a fourth colleague"), and past the twelfth everybody left is "another
   colleague", which says less rather than more and so cannot give anybody away. Say if you want
   something different for a big cohort.
2. The lead can also be unnameable, though only when the product holds no name for them at all:
   `User.firstName` is a required column, but `PATCH /auth/profile` trims what it is given and
   accepts an empty string. That reader still knows who their lead is, so they read "your lead"
   ("the lead" for somebody who is not on the check-in) rather than "the initiator". Not her
   wording, so it is flagged here too.

---

## The interview was reading the report's labels, and stopped asking specific questions

**The regression.** Fix 3 made report labels positional - "the initiator", "Participant A",
"Participant B" - which is right for a stored report and wrong for a conversation. The interview
prompt was borrowing the same labeller, so where the engine used to be told

> - "Finance sign-off on the six credit files" on Relationship officer, Ikeja. Target 14 approved
>   facilities this quarter., 21 days old, nobody has escalated it.

it was now told

> - "Finance sign-off on the six credit files" on Participant B, 21 days old, nobody has escalated it.

A letter is not something a question can be built out of. Measured on NEW_HIRE, asks for a number,
a date or a name fell from 14 and 12 (25 September) to 9, 5 and 8, over an identical 69 turns.

**What it now says.** Three rules, in `api/src/modules/conversation/a-colleague-in-an-interview-has-a-name.ts`:

1. What the person called them themselves, where the record kept it. They said it out loud, so
   saying it back reveals nothing to them.
2. Otherwise a real name, but only where this check-in names people to each other - the rule the
   report and the board already apply.
3. Otherwise plain words: "a colleague", "one colleague", "another colleague", taken from the
   reports' own wording so the two cannot drift.

On an ordinary check-in the engine now reads

> - "Sign-off on the six credit files" on Ngozi Balogun, 21 days old, nobody has escalated it.

and on a PIP, where a colleague stays unnamed to the person being reviewed,

> - "Sign-off on the six credit files" on a colleague, 21 days old, nobody has escalated it.

**Three more holes found while fixing the first.** Four blocks put a colleague into the interview
prompt and each had its own answer. Three of them handed over a real name in check-ins where the
report and the board deliberately withhold one: who is waiting on a commitment, who else is in the
check-in, and the shared-board give-back, which was gated on mode alone - and an evaluation ground
is SHARED by default. `peersAreNamedOn` is now one function
(`api/src/modules/reports/peers-are-named.ts`) instead of three copies in the reports, board and
grounds services, with the conversation - the one reader that speaks out loud - having had no copy
at all.

**The numbers, honestly.** Four NEW_HIRE runs on the new code: 23, 8, 12 and 9, over 72, 70, 69 and
71 Groundwork turns. Mean 13.0, which is where the 25 September code was (14 and 12). But the
spread is 8 to 23, and 8 sits inside the range the broken code produced. The mean recovers; two
runs could not have told you that, and four still cannot separate it from the run-to-run variance
this scenario already has. The fix is right on the reading of the prompt regardless of the count.

All 9,011 API tests pass. New test
`api/src/modules/conversation/a-colleague-stays-unnamed-in-an-evaluation.spec.ts` stands a
worst-case engine in front of the real conversation - one that repeats back every name-shaped word
it was handed - and reads the turn that comes out. Two existing tests are changed, both of which
matched source text with a regexp rather than exercising the rule in their own name; the reason is
in the commit.

**One thing for Hafsah.** I was asked to describe an unnameable colleague by what they do, for
example "the colleague who handles the credit files". I did not do that, because your decision of
26 September says the opposite in the code: "never a job title or detail that would give them
away". On a small team "handles the credit files" names one person as surely as their name does. So
an unnameable colleague reads "a colleague", which is your wording. Say if you want the interview
to have more than the report does here.
