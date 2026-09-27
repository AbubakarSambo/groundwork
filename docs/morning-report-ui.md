# Morning report: the screens workspace

This is the report from the screens workspace, on the branch `wip/prototype-ui`. The engine
workspace writes its own report in `docs/morning-report.md`, so the two computers never edit the
same file.

## In short, for the morning

*Kept up to date as the night goes on. The details are further down.*

**Finished and ticked:** U.1 (the look, the sidebar, the phone bar, "Jump to", help), U.2 (signing
in, with every decision you made) and U.3 (organisations and joining, passed on its third review).

**Built and tested, but not ticked:** U.4 (people, roles and access),
U.5 (Today and the check-ins list), U.6 (starting a check-in), U.7 (context), U.8 (the check-in
screens), U.9 (reports and sharing), U.10 (the board), U.11 (ending a check-in), U.12 (the You
board), U.13 (suggestions from verdicts, and appeals), U.14 (Ask Groundwork), U.15 (the Company page),
U.16 (links between check-ins, and each person's load), U.17 (the Suites page and all ten suites:
onboarding, leave requests, time sheets, performance reviews, when someone leaves, the role map,
spending and budgets, to-dos, customers and deals, and equipment), U.18 (connections and
channels) and U.19 (billing). Each passed the full screen and API suites; the few failures each run found came from
that module and were fixed. The latest full run, after U.18, passed 3,006 screen tests and 9,647 API
tests apart from three failures from U.18 itself, all since fixed. U.19 has passed the tests for
every file it changed; its full run is next. **None
could be ticked, because the reviewer can no longer sign in as anyone** (item 14). That is the most
important thing for you to unblock.

**Three privacy leaks found and closed on the way:** members and guests could get everyone's email
addresses from the colleague list (U.4); the check-ins list sent every participant the join link,
others' email addresses and a report's findings before release (U.5); and every person's rating of
how checkable their answers were went to the lead and admins (U.8). The board still turned that
rating into "nothing checkable" for the lead; the engine workspace has now fixed it at the source (request 8,
done on 27 September): the board never reads the rating.

**One privacy question found in the engine's code, not closed:** the engine's pattern detectors read
everybody's questions to Ask Groundwork, which are meant to be private always. That is engine code, so
I have asked the engine workspace (request 16(g)) and put it to you as item 25.2.

**A security hole found during the U.3 review, being fixed:** since U.2 let people choose a password
at sign-up, someone could sign up with another person's email address and a password of their own; if
the real owner then opened the confirmation email, the account was made with the stranger's password.
The fix keeps your decision: a password chosen at sign-up is used only when the confirmation is opened
in the same browser that signed up. Anywhere else, the account is made without it and the person
chooses their own.

**A possible leak found in U.15, left alone on purpose:** the organisation's handbook and memory
(`GET /org/how-we-do-it`) seem to be readable by a guest from another organisation. Organisation
memory must keep working exactly as now, so I have not changed it without you (item 26.7).

**Two more found in U.16, left alone on purpose:** the engine's board names who is waiting on you even
in check-ins where people are not named to each other (asked of the engine, request 19; item 27.3);
and the developer API gives one person's handoffs across all their check-ins, which is their load, to
whoever holds the organisation's developer key. The developer API must keep working exactly as now, so
that one is yours to decide (item 27.4).

**What needs you most, in order:**
1. Item 14: let the reviewer sign in (my recommendation: allow reading the local test password).
2. Item 11, conflicts A and B: what the invitation and the new admin's card say about who reads what.
3. Item 20.1: should the lead hold the team's report until they share it? (a privacy question)
4. Item 15.1: should admins be kept out of performance plans unless given access, as rule 5 says?
5. Item 17.5: in a new check-in, do invitations go before or after the lead's own first check-in?
6. Item 21.1: should a participant read the board's read on each colleague? (a privacy question)
7. Item 22.1: the handover page, because the prototype's page and the product's handover are two
   different things (a privacy question).
8. Item 23.1: may anyone but the person read their You board? (a privacy question)
9. Item 24.1: which admins may read a suggestion about someone, and when? (a privacy question)
10. Item 25.2: questions to Ask Groundwork feed the pattern detectors (a privacy question), and
    25.1: most people cannot use Ask Groundwork yet.
11. Item 26.1: may the Company page show what new people keep asking, when it is built from their
    private questions to Ask Groundwork? (a privacy question), and 26.2: priorities can only come
    in from an organisation's own systems today.
12. Item 27.1 and 27.2: may somebody share their load with a lead, and may the team being asked
    read what another team asked of it? (both privacy questions)
13. Item 28.1: the questions an admin answers before a suite switches on, which I wrote, because no
    screen shows any; 28.3: who counts as a lead for the suites; and 28.9: onboarding's "Something
    nobody has shown them yet" is built from private questions (a privacy question); 28.18 and 28.19:
    nobody can ask for leave yet, and no screen shows a person their own; 28.25 to 28.27: the same for
    hours, and who says what each client agreed; 28.33: does a person read their manager's own words
    in their review? (a privacy question); 28.49: is one to-do list for each person their private
    load? (a privacy question)
14. Item 29.1: may an admin connect their own WhatsApp number while Groundwork's WhatsApp is off?
    and 29.4: should everyone's word-for-word check-ins be deleted after a time? (a privacy question)
15. Item 30.1: what happens to organisations already on the free plan when you turn on the one
    switch for the trial and the free plan (it is off, so nothing has changed yet); 30.2: one trial
    for each organisation, or for each person?
16. The rest of items 13, 15 to 30 are smaller, each with a recommendation.

**Just finished, not ticked:** U.19, billing. Stripe works exactly as before, in test mode only: the
same checkout, webhooks, invoices, care fee and portal. Plan and billing is the prototype's page, with
every plan, price and limit read from the database; only an admin is served the money, and a guest is
served nothing about billing. The five published plans are already the ones in the database. A seat
is now counted the same way on the People page, on Plan and billing and at the invite gate: everybody
who belongs to the organisation except guests from outside. The pricing page no longer tells a
visitor the free plan is theirs. And, as you decided, **one switch** (the free trial's setting, off)
now does two things when you turn it on: teams under 20 get 3 months free, really given by billing,
and new organisations stop getting the free plan and the free first session. While it is off,
nothing about today's billing has changed. Nobody already on the free plan is cut off (item 30.1).

**Next:** the waiting reviews, one at a time, oldest first: the 16 you named (U.3 to U.18), then U.19's.
U.20 (small states and errors) starts only when all have passed, as you asked.

## Every module since U.2, and its review

| Module | Built and tested | Reviewer |
| --- | --- | --- |
| U.3 Organisations and joining | Yes | **Passed** on 27 September, on the third round |
| U.4 People, roles and access | Yes | Sent back on 27 September; being fixed |
| U.5 Today and the check-ins list | Yes | Waiting |
| U.6 Starting a check-in | Yes, except the lead's first check-in card | Waiting |
| U.7 Context | Yes | Waiting |
| U.8 The check-in screens | Yes | Waiting |
| U.9 Reports and sharing | Yes | Waiting |
| U.10 The board | Yes | Waiting |
| U.11 Ending a check-in, probation review, handover | Yes | Waiting |
| U.12 The You board | Yes | Waiting |
| U.13 Suggestions from verdicts, and appeals | Yes | Waiting |
| U.14 Ask Groundwork | Yes | Waiting |
| U.15 The Company page | Yes | Waiting |
| U.16 Links between check-ins, and each person's load | Yes | Waiting |
| U.17 The Suites page and all ten suites | Yes | Waiting |
| U.18 Connections and channels | Yes | Waiting |
| U.19 Billing | Yes | Waiting |

**No module after U.2 has passed a review yet, because the reviewer could not sign in** (item 14). You have now chosen how it signs in, and the reviews are starting, oldest first. Since
26 September the auto-mode safety check refuses to let the reviewer read the local test password or
the invitation tokens it needs to sign in as each person, and you asked me never to work around a
block. So the reviews cannot be finished from here. **As you asked, I will not start U.20 while these
reviews are waiting.** When U.19 is built and tested, I will stop and wait for you to unblock item 14.
Then the reviews run one module at a time, oldest first, and U.20 starts after them.

## Last night's items

1. **Members and guests can no longer change the organisation through `/auth/me`.** Done in commit
   `9742b552` (U.3, step 3b). `orgName`, `orgEmail`, `orgSlug` and `companyStage` were removed from
   what `PATCH /auth/me` accepts, so it only changes the person's own profile. `PATCH
   /users/organization`, for admins only, stays the one way to change the organisation. Before
   removing them, every caller in `api/journey` and `client/` was checked: `orgName` and `orgEmail` were
   used only by the old setup page, `orgSlug` by nothing, and `companyStage` only by the seed, so it
   moved to the admin route. The test is `api/src/modules/auth/only-an-admin-changes-the-organisation.spec.ts`.
   It proves a member, a lead and a guest are refused, and that an admin can still change the name,
   email and stage through `/users/organization`. It passes, 11 of 11, today.
2. **The two conflicts with your U.3 answers** are in item 11, "Conflict A" and "Conflict B", each with
   the prototype's exact wording, the product's exact wording today, the admin rule quoted word for word
   from `docs/decisions.md`, and my suggestion. In short:
   - **Conflict A, the invitation.** The prototype says "The people in this check-in, including your
     manager, can see what you say in it." and also "Nobody else reads your answers." and "Wairimu reads
     the report, not your words." The product today says "Nobody you work with reads it. Not your
     manager, not whoever set this up, not an admin." Rule 5 says admins see what people said. Today's
     wording is kept until you decide.
   - **Conflict B, the new admin's card.** The prototype says "You can see every board and report. They
     never see anyone's questions to Ask Groundwork, anyone's own report, or a lead's private notes."
     Rule 5 adds "and never a performance plan unless given access to that check-in". The sentence is
     left out until you decide.
3. **The round "?" button is not in the prototype.** It is not on the "Create an organisation" screen
   (`org-new.jpg` and `org-new.txt`), and no prototype screen draws a floating "?". As you decided, it
   was removed everywhere the prototype lacks it, with nothing in its place (commit `57426e7c`). Help is
   in each person's own menu and on "More".

## Needs Hafsah

### 1. The API will not start when the email key is empty: fixed by the engine workspace

**Fixed on 26 September** by the engine workspace, in the way suggested below (`theResendClient()` in
`email.service.ts`, with the test `the-api-starts-with-an-empty-email-key.spec.ts`). The key can be
empty again; `re_test` still works too. Nothing is left for you to do here.

*Found on 26 September 2026, while setting up this computer. Moved here from `docs/morning-report.md`.*

The example settings file, `api/.env.example`, says to leave `RESEND_API_KEY` empty. When it is
empty, the API crashes as it starts, with the error "Missing API key". The cause is
`api/src/modules/email/email.service.ts`, line 34. The email service creates a Resend client as soon
as the API starts, and Resend refuses an empty key.

This contradicts the email service itself. Its own check, `keyIsAPlaceholder()`, already treats an
empty key as "no email leaves this computer, and every send is written to the log instead". Only the
line that creates the client was never told.

**What I did for now:** on this computer, you set `RESEND_API_KEY=re_test`. The code already treats
that value as fake and never sends with it, and `EMAIL_SENDS_FOR_REAL=false` also stops all sending.
The API now starts, and its log says that no email leaves this computer.

**My suggested fix, as its own small task:** create the Resend client only when real sending is
allowed, that is, when `canSendForReal()` is true. Otherwise leave it out, so an empty key behaves
exactly like a fake one. Add a test that the email service starts with an empty key and sends
nothing. When that is in, `re_test` is no longer needed and the key can stay empty, as the example
says.

### 2. I pushed once before doing the deploy check

`CLAUDE.md` says to read every workflow and deploy setting before the very first push. My first
push of `wip/prototype-ui`, earlier on 26 September, came before that check. I have now done it, and
nothing was at risk: see 0.2 below. I am writing it down because the rule was not followed in the
right order.

### 3. The 24 scenarios cannot run on this computer: the runner has now arrived

**Update, 26 September:** the engine workspace has added the runner to its branch, and I have
merged it. It was missing because a trailing slash in `.gitignore` meant none of the exceptions for
`api/journey/` had ever worked. From now on the 24 scenarios and the scorer run here too.

**Answered by you on 26 September:** screen tasks do not need the 24 scenarios scored. They check
the engine's words, which is the engine workspace's job, and screen changes cannot move them. The
run that had started is finishing only as sample data, so the screens have real check-ins to show.
It is not scored and will not be repeated for each task. The scenarios run again only if you ask,
or if the local sample data is lost. For screen tasks, the tester runs the product's own tests and
the reviewer compares every screen with the prototype.

Every task is meant to finish with the 24-scenario run and the scorer. The runner,
`api/journey/all-24`, is not on this computer. The whole `api/journey/` folder is in `.gitignore`,
so it only ever lived on the other computer. The tester searched every branch and the whole disk.

So far, my changes only touch the screens (`client/`), which cannot change what the engine writes.
I am running every test on each change. I am writing down, for each task, that its scenario score
could not be measured. I have asked the engine workspace to add the runner to its branch (request 1
in `docs/requests-to-engine.md`).

**What I need from you:** either the engine workspace adds it, or you copy `api/journey/all-24/`
to this computer. Until then, no task that changes the backend should be ticked, and I will say so
on each one.

### 4. The `#/system` page is made of sample data

The prototype's design system page (`#/system`) shows the colours, type, buttons and marks, using
sample people and check-ins. `docs/prototype/not-to-build.md` says not to build sample data.

**My suggestion:** do not build it as a page people see. The same parts are built into the real
screens as part of U.1. If you want it as a page for Groundwork staff only, say so and I will add it.

### 5. Two things the tester noticed, for later tasks

- **People added by an admin were still held for approval.** Sahar, an admin, started a check-in and
  added four people. All four were told "This check-in cannot start until an admin at the
  organisation that invited you approves you joining it." The rule's own comment says people added by
  an admin do not wait. I will look at this in U.4 (people, roles and access).
- **Accepting an invite timed out once.** One accept failed with "The database refused that
  request." The database step took 17.6 seconds, against a 5 second limit, while the computer was
  running both test suites. It worked the second time. It may only happen under heavy load.

### 6. Pinned check-ins are kept in the browser, for now

Pinning a check-in to the top of the sidebar works. The backend has no place for a person's own
preferences outside the engine, and I did not want to add a table without asking. So each person's
pins are kept in their browser, under their own name, and are cleared when they sign out.

**The cost:** pins do not follow a person to another computer or phone, and they are gone after
signing out. **My suggestion:** add a small list of pinned check-ins to each person's account, read
and saved through the same place as the rest of their account. Say yes and I will add it.

### 7. Where should the Groundwork logo take someone who is signed in?

The reviewer asked that the logo in the sidebar take a signed-in person to their home in the app.
Today it takes them to myground.work, out of the app. Your rule, written in the code and in a test,
says "the groundwork logo and icon are meant to always take you back to the marketing page." So I
have not changed it.

**My suggestion:** keep your rule for people who are signed out, and send people who are signed in to
their home in the app, since leaving the app by accident is easy and confusing. It is your call.

### 8. Wording no prototype screen shows, which I had to write

**Answered by you on 26 September: the tour must not have invented wording, and it should copy the
prototype's.** We could not find a tour for a new person anywhere in the prototype. The builder ran
the prototype and looked at a new organisation's Today page, and I searched its source. The only
tour is the demo bar's "Click-through" (`TOUR` in `docs/prototype/source/s28.js`). It walks a
reviewer through the sample screens: "Pick a journey. The guide switches person and state for you,
and says what to look at on each screen." Its steps describe the prototype itself, for example "The
home page. Try the 60-second check-in in the hero: three questions about your own week." That is
the demo bar and sample data, so `not-to-build.md` rules it out.

**So I took the tour out again** (commit `336b4f94`), with the wording we had written. No other test
changed. `docs/modules.md` does list "a short guided tour for someone new", so the two documents
disagree.

**What the prototype shows someone new instead** is on Today. A new admin gets a card reading
"You're an admin at Nyali Foods", then "You can see every board and report. They never see anyone's
questions to Ask Groundwork, anyone's own report, or a lead's private notes.", and "Got it". Below it
is a list headed "Get Nyali Foods going", marked "0 of 4 done": "Invite your team", "Add a second
admin", "Start your first check-in" and "Connect WhatsApp (optional)".

**You asked again on 26 September, so I checked again myself.** A new organisation's Today page in
the prototype shows the list "Get … going" and nothing else. Apart from the demo bar's
"Click-through", the word "tour" does not appear anywhere in `groundwork-prototype.html`. So there
is no wording to copy, and the tour stays out.

**Answered by you on 26 September: (a), no tour.** What you had seen was the demo bar's click-through.
A new organisation's Today page will show the welcome card and the checklist, exactly as in the
prototype, built in U.3 and U.5. Nothing more is needed in U.1.

*Your question was:* (a) no tour, with that card and list on Today as the welcome, built in U.3 and
U.5, word for word from the screen; or (b) a tour, with wording you give me. I suggest (a). Until
you answer, the tour is the one open part of U.1.

These two lines are still written by us, because no prototype screen shows them:

- "Jump to", when nothing matches: "Nothing matches that. Try part of a name."
- At the foot of the Help window: "Tell us what you need and somebody will come back to you within
  two working days." This is the sentence our own "Talk to us" page already opens with.

Someone counts as "new" when they have not finished a single session and lead no check-in. Whether
the tour was taken is kept in the browser, like the pins.

### 9. Should the floating "Feedback" button go?

"Send feedback" is now in each person's menu and on "More". The prototype does not draw a floating
Feedback button. I kept it, because it is the pilot's one-tap way to send feedback. Say if it should
go.

### 10. Signing in (U.2): ten places where the prototype and the product disagree (all decided)

**Answered by you on 26 September:**
- **Decision 10, a password at sign-up: follow the prototype.** The sign-up offers an email link, or a
  password if the person prefers, and never says "no password to choose" before asking for one. I
  read this as also answering **decision 4**: someone who chose the link is not forced to choose a
  password afterwards. Tell me if you meant otherwise.
- **Decision 6, naming the organisation: at sign-up, like a Slack workspace.** The name is suggested
  from the email domain ("Coamana" from hafsah@coamana.com), and the person can change it. Someone who
  later signs up with the same domain is offered to join that organisation; that is in U.3. The
  organisation's own web address comes later.
- **Decision 1, the free trial: teams under 20 people get Groundwork free for 3 months.** The limit
  and the length live in the database, never in the screens, and every screen says it the same way.
  Billing itself is U.19. Until billing really grants the trial, the sentence stays switched off, so
  no screen promises what billing does not do yet.
- **The reviewer's security points: yes.** An older reset link stops working as soon as a newer one
  is sent. Sign-in and sign-up never reveal whether an address has an account, and any test-only
  setting that would reveal it is off outside tests.

**And the rest, answered by you the same day:** choosing a password is optional, as I had read it.
Decision 2: "Email", not "Work email". Decision 3: the prototype's password rules (at least 8
characters, a number or a symbol, not your email address), checked the same way on the screen and in
the backend; existing passwords keep working. Decision 5: "an hour". Decision 7: an expired sign-up
link says the new link is on its way, without asking for the address again. Decision 8: leave out
"Anything you'd started is saved". Decision 9: leave out "Nothing was created or changed", and say
what to do next instead. Item 12: the reset page does not show the address.

Nothing about signing in is waiting for you any more.


The prototype's sign-in screens say some things the product does not do, or does differently on
purpose. I will build everything else in U.2 and leave these as they are until you decide.

1. **"Teams of fewer than 20 people get 3 months free. No card needed."** The prototype's sign-up
   says this. The product does not do it: its free plan is for up to 5 people, and three free months
   are only given by Groundwork staff, one address at a time. **My suggestion:** leave the line out
   until billing really does it.
2. **"Work email" or "Email".** The prototype says "Your work email". The product changed it to
   "Email" on purpose, because people who run a real business from a Gmail address read "work email"
   as "not for you". **My suggestion:** keep "Email".
3. **The password rules.** The product asks for at least 8 characters with a capital and a small
   letter. The prototype asks for at least 8 characters, a number or a symbol, and not your email
   address. **My suggestion:** the prototype's rules, which are easier to meet and just as strong,
   checked the same way on the screen and in the backend.
4. **Can someone skip choosing a password?** The prototype offers "Keep using email links instead".
   The product made choosing a password compulsory after a test run where people with no password
   could not get back in. The new sign-in screen will offer "Email me a sign-in link instead", which
   fixes that. **My suggestion:** allow the skip.
   *Found while building:* even today, someone with no password who opens a sign-in link with
   nothing to save is sent straight to their check-ins, without the password step. So the step is
   already skippable on that one path. Your decision settles both.
5. **How long a password reset link lasts.** The prototype says "It works for 30 minutes". The
   product's link lasts an hour. **My suggestion:** say "an hour", which is true, rather than change
   the link. Until you decide, the page says an hour.
6. **The organisation's name at sign-up.** The product's sign-up asks "Your organisation
   (optional)". The prototype's does not. **My suggestion:** move it into setting up the
   organisation (U.3), where the prototype asks it.
7. **An expired sign-up link.** For someone still signing up, the product already sends a fresh link
   on its own when the old one has expired. The prototype's card asks for the address again.
   **My suggestion:** for that case, say the new link is on its way, and use the prototype's card for
   every other expired link.
8. **"Anything you'd started is saved."** The prototype's sign-out page says this. Signing out
   clears drafts kept in the browser today, so it may not be true. **My suggestion:** leave the line
   out until it is checked, or keep drafts on the server.
9. **"Nothing was created or changed."** The prototype's "Google sign-in didn't finish" page says
   this. It is not always true: a first Google sign-in creates the account and its organisation, and
   links an existing account to Google, before steps that can still fail. **My suggestion:** leave the
   line out, as it is now, unless the Google sign-in is changed to undo those steps when it fails.
10. **A password at sign-up.** The prototype's sign-up asks for "Password" and "Type it again", with
    the rules. The product's sign-up asks for no password: you choose one after opening the link.
    **My suggestion:** follow the prototype only if you also allow skipping the password (decision 4);
    otherwise keep choosing it after the link, as now. Until you decide, the sign-up says so plainly:
    "We send you a link. Your account is made when you open it, and then you choose a password."

### 12. May the reset page say whose account it is? A privacy question (decided: no)

The prototype's reset page says "For wairimu@baridi.co.ke. Once it's saved, you're signed out
everywhere else." To show the address, the server would have to return the email of the account
behind a reset link. A privacy test in the product records that this very check once gave away the
address behind a link, and was fixed so it would not ("validateToken tells nobody whose link it
is"). Putting the address back would change a privacy rule and weaken that test, so I have not done
it. The page shows the address if the server ever sends it, and leaves it out otherwise.

**My suggestion:** leave the address out. The person already knows which account they asked to reset,
and the link could be forwarded to someone else.

### 11. Organisations and joining (U.3): nine decisions (answered, two parts held)

**Answered by you on 26 September, with the prototype's exact wording wherever it has it:**
1. The invitation uses the prototype's wording, says what the person will see, and never says or
   suggests that their words are private.
2. Joining by email domain: the prototype's admin switch "Anyone with an @<domain> email", joining as
   "Takes part", role changeable after, only after the email address is confirmed, never for public
   email providers. That list is kept in one place on the server.
3. One invite link per organisation, joining as "Takes part". Turning it off makes a new link.
4. The admin is named, as in the prototype ("We've asked Grace Achieng", "Remind Grace"), only after
   the person has accepted a real invitation.
5. Invitations last 14 days, with the prototype's expired-link wording.
6. A person can create more than one organisation, each with its own plan.
7. The welcome card uses the prototype's wording, the free-trial sentence stays off until billing
   gives it, and WhatsApp is not mentioned while it is not switched on.

**Two of these conflict with something already written, so I have held both parts back. You
decide.**

**The admin rule, word for word from `docs/decisions.md`.** `docs/decisions.md` has no rule labelled
"A4". Its rule about admins is rule 5, and it says:

> 5. **Admins** see every board and report, including what people said in them. They never see
> anyone's questions to Ask Groundwork, anyone's own report, or a lead's private notes, and never a
> performance plan unless given access to that check-in.

Rule 4 of the same file says: "What people say in check-ins can be shown word for word to the people
in that check-in. There is no "Share my words" switch."

This differs from the A4 rule in `docs/modules.md` ("Admins see boards and reports, never exact words
and never performance plans, unless given access to that check-in."), which I quoted below before I
had checked `decisions.md`. The two documents disagree about exact words. `decisions.md` says "These
are settled", and it agrees with your U.3 answer that admins can read what people said. As you asked,
both conflicts stay held with today's behaviour until you decide.

#### Conflict A: what the invitation says about who reads your words

**What you decided:** use the prototype's invitation wording, say what the person will see, and never
say or suggest that their words are private, because people in the check-in and admins can read them.

**The prototype's exact wording** (`docs/prototype/screens/A3-organisations-and-joining/join-invite.txt`):
- "The people in this check-in, including your manager, can see what you say in it. Your questions to
  Ask Groundwork stay private."
- Under "Who sees your answers": "You see your own report straight away. Wairimu shares a team report
  each evening. Nobody else reads your answers."
- Under the button: "About two minutes. You make your account afterwards. Wairimu reads the report,
  not your words."

**The product's exact wording today** (`client/src/pages/invite/InvitePage.tsx`, the panel "What
happens to what you write"):
- "Nobody you work with reads it"
- "Not your manager, not whoever set this up, not an admin. What they see is the shared report, which
  is built by comparing what everyone said. Your own words about your own work can appear in it.
  Anything you say about somebody else never does, and it never says who said what about whom."

**The rule in `docs/modules.md`, A4** (older; see rule 5 above): "Admins see boards and reports, never
exact words and never performance plans, unless given access to that check-in."

**The conflict:**
1. Inside the prototype itself, the first line says your manager can see what you say. But "Nobody
   else reads your answers." and "Wairimu reads the report, not your words." suggest your words are
   private, which you have ruled out.
2. The product today says the opposite of your decision: nobody you work with reads your words, not
   even an admin.
3. Your answer says admins can read the words. The A4 rule says admins never see exact words unless
   given access to that check-in.

**Checked against `docs/decisions.md` rules 4 and 5:** they agree with you. People in the check-in
and admins can read what people said. So the prototype's "Nobody else reads your answers." and
"Wairimu reads the report, not your words." contradict the settled rules, and so does today's
panel.

**Held, with today's behaviour, as you asked:** today's panel stays exactly as it is, and the two
prototype sentences "Nobody else reads your answers." and "Wairimu reads the report, not your words."
are left out. The rest of the prototype's invitation is being built.
**My suggestion:** keep the prototype's first line, drop the two held sentences, and have the page say
who can read the words from that check-in's real settings. Please also say whether an admin without
access to a check-in can read its exact words, because that decides the A4 privacy rule too.

#### Conflict B: the new admin's welcome card

**What you decided:** the welcome card uses the prototype's wording.

**The prototype's exact wording** (drawn on a new organisation's Today page; there is no `.txt` for it):
- "You're an admin at Nyali Foods"
- "You can see every board and report. They never see anyone's questions to Ask Groundwork, anyone's
  own report, or a lead's private notes."
- "Got it"

**The product's wording today:** none. The product has no welcome card.

**The rule in `docs/modules.md`, A4:** "Admins see boards and reports, never exact words and never
performance plans, unless given access to that check-in."

**The conflict:**
1. "You can see every board and report." tells an admin they can see every check-in's board and
   report, including performance plans. The A4 rule says they cannot, without access to that
   check-in.
2. A smaller wording problem: "They never see…" has nothing for "They" to point to. It probably means
   "Nobody else sees…" or "You never see…".

**Checked against `docs/decisions.md` rule 5:** the card's sentence is nearly rule 5 word for word.
The only part it leaves out is "and never a performance plan unless given access to that check-in".
So the real conflict is smaller than I first wrote: the card promises every board and report,
including performance plans, where rule 5 excludes them without access.

**Held:** the sentence "You can see every board and report. They never see anyone's questions to Ask
Groundwork, anyone's own report, or a lead's private notes." The rest of the card is being built.
**My suggestion:** use rule 5's own words, which match the prototype except for the one missing part:
"You can see every board and report, including what people said in them. You never see anyone's
questions to Ask Groundwork, anyone's own report, or a lead's private notes, and never a performance
plan unless given access to that check-in." That also fixes "They".

#### Also: the round "?" button

The prototype's "Create an organisation" screen has no round "?" button (checked against `org-new.jpg`
and `org-new.txt`); the product's floating Help button sat over the error message there. **Your
decision, 26 September:** remove the "?" wherever the prototype does not have it, and put nothing in
its place. That is being done in U.3.

**The nine questions as I first wrote them, for reference:**

1. **What the invitation promises about who reads your words. This is a privacy question.** The
   prototype's invitation page says three things that do not agree: "The people in this check-in,
   including your manager, can see what you say in it.", "Nobody else reads your answers." and
   "Wairimu reads the report, not your words." Today's page says "Nobody you work with reads it. Not
   your manager, not whoever set this up, not an admin." Your decision of 25 September allows words
   to be shown to the people in the check-in. **My suggestion:** the invitation should say exactly
   what the backend serves for that check-in, worked out from its real sharing settings, never a
   fixed sentence. Please tell me which sentence is true today.
2. **Joining by email domain changes a written safety rule.** The code says people join an
   organisation "only by an exact address, never a domain". The prototype lets anyone with an
   @baridi.co.ke address join Baridi. **My suggestion:** allow it only when an admin switches it on,
   for the admin's own verified domain, never for public mail such as gmail.com, one organisation per
   domain, joining as "Takes part" and using a seat. Should the domain also need a proof in its DNS
   settings, so one contractor's address cannot claim a whole company?
3. **The organisation's invite link.** The prototype shows `myground.work/j/baridi`, an address
   anyone can guess. **My suggestion:** a random link an admin can turn off or replace. Does joining
   through it let someone in at once, or wait for an admin when their email domain does not match?
4. **What someone outside may see before being let in.** The prototype says "We've asked Grace
   Achieng", but the backend asks every admin: name one, all, or none? "27 people there" on a public
   page gives away the head count. "We'll email and text you": there are no text messages yet, so I
   suggest leaving "and text" out.
5. **How long an invitation lasts.** The prototype says 14 days. The product was changed to 90 days on
   purpose. If 90, the page's sentence changes.
6. **More than one organisation of your own.** The prototype lets you create several. The product
   allows one on purpose. Lift the limit?
7. **Your own web address and logo.** This needs the hosting company's domain service, certificates
   and live keys, which this workspace must not touch. The logo's wording exists only in the
   prototype's code. **My suggestion:** leave it for F1 (connections), or build only the card that
   says it is not set up.
8. **"All 38 of your check-ins"** on the "out of time" page counts sessions as check-ins. That is the
   open question of what "check-in" means.
9. **The new admin's welcome card.** It says "You can see every board and report. They never see
   anyone's questions to Ask Groundwork…". "They" has nothing to point to; should it be "You never
   see"? And "every board and report" goes further than the rule in A4, where an admin sees a
   performance plan or exact words only with access to that check-in. Should the sentence be
   narrowed to match?

Two of the U.2 decisions matter here too: "3 months free" (decision 1), because "Create an
organisation" asks "How many people will use it?" with "Fewer than 20: 3 months free"; and where
the organisation's name is asked (decision 6).


### 14. The reviewer can no longer sign in as anyone, so U.3 cannot be reviewed

On the night of 26 September the auto-mode safety check stopped the reviewer from reading the local
test password (in `api/journey/seed.ts`) and the local invitation tokens it needed to sign in as
Sahar, Hafsah and the U.3 test people. It called this "Credential Materialization". Earlier reviews
had signed in the same way. It also treats a helper's request to create test accounts as needing
your own say-so. As you asked, I have not tried any way around it.

So U.3 is built and its tests are being run, but no screen could be checked as the lead, a
participant or the admin, and the server's refusals could not be tried for real. The only screen
the reviewer could check signed out, "Done. No more reminders for …", matches `stop.txt` word for
word. **U.3 is not ticked**, and no later module can be ticked either, because every review needs to
sign in.

**What I need from you, one of these:**
1. Allow reading the local journey test password and the local invitation tokens for local-only
   reviews (a permission rule, or saying so yourself in chat); or
2. Ask in chat for throwaway local test accounts, which the reviewer may then create and sign in as;
   or
3. Sign in yourself in the morning and look at the screens the report lists.

**My recommendation:** option 1. Those values only work on this computer's own test database.

Until then I keep building the next modules, with their tests, and leave each one "built, not
reviewed" in this report.

**What changed since U.2, found on 27 September (you asked).**

- **Nothing in the product and nothing in the kit's safety rules changed.** The last change under
  `.claude/` was your kit update 7, which came before the U.2 reviews, and those reviews signed in fine.
- **What refuses is Claude Code's own auto-mode safety check,** which judges each action a helper
  takes, separately from the kit's rules. During U.2, the reviewer read the journey's test password and
  typed it into the sign-in page in the browser. During the U.3 review, which ran in a new session
  after the Mac froze, the reviewer tried to copy that password into a scratch file so it could sign in
  from the command line. The check called that "Credential Materialization" and refused it. It then
  also refused the reviewer's follow-up commands, and opening the invitation page with a test token,
  as the same kind of action. So the difference is how the reviewer tried to use the password, judged
  afresh in a new session. The check applies only to my helpers' actions on this computer.
- **A real person is not blocked from signing in.** The check never runs for someone using the product.
  To be sure the product's sign-in still works after all the changes since U.2, I ran every sign-in
  test (241 of 241 pass, including the one proving existing passwords still sign in under the new
  rules). I also started the API briefly and sent a sign-in for a made-up address. It answered normally
  with the product's one answer at the door: "If that address has an account here, we have emailed you
  a way in, so check your inbox. If you have a password and it did not work, check it and try again."
  No real password was read or used for this.
- **I changed no safety setting,** and the helpers did not try to get round the refusal.

**What would let the reviews run:** the same three choices as above. Option 1, allowing a helper to
read the local test password for local reviews, can only be given by you. A simpler version of option
2 may also work: you ask in chat for the reviewer to make throwaway local accounts with an
`@example.test` address and sign in through the browser, as the U.2 reviews did.

**Answered by you on 27 September: the simpler way.** The reviewer creates its own throwaway
`@example.test` accounts on the local database (`groundwork_dev` only), by signing up with a password
through the browser, and signs in through the browser, as the U.2 reviews did. It never writes a
password into a file or passes one on the command line, and no safety setting changes. When U.19 is
built and tested, the 16 waiting reviews run one module at a time, oldest first, each followed by its
fixes, a commit, this report and a push. U.20 starts only when all 16 have passed.

### 15. People, roles and access (U.4): what needs you

1. **Admins and performance plans. A privacy question.** Today the backend lets every admin read and
   run every check-in, performance plans included. Rule 5 in `docs/decisions.md` says an admin never
   sees a performance plan unless given access to that check-in. I kept today's behaviour, so the
   People page's role line "Admin: Manages people and billing, and can read every check-in." is true
   today, but it goes against rule 5. **My recommendation:** change the backend so admins cannot open a
   performance-plan check-in unless given access, with a privacy test, and then say so on the page.
2. **"…and what someone writes in their own check-in stays theirs".** This is on the prototype's page
   for one person (`one-person.txt`, "What an admin can see"). It contradicts rule 5, which lets admins
   read what people said. **Left out**, as with the U.3 conflicts. **My recommendation:** drop it.
3. **"Remove from Baridi" and "Free this seat" are not built.** Today's removal deletes the person's
   whole account in every organisation, and it cannot be undone. The prototype promises "What they
   shared stays", with an undo. **My recommendation:** a new removal that only ends this
   organisation's membership, keeps the account, and can be undone.
4. **Colleagues no longer carry email addresses**, as you decided. So the picker can no longer spot a
   colleague who was invited but has not accepted yet. Picking them again simply re-sends their
   invitation. **My recommendation:** accept that.
5. **The People list still uses the organisation a person last switched to.** So someone who belongs
   here but is looking at another organisation drops off the list, and a guest looking at this one
   appears on it. Colleagues now read real memberships. **My recommendation:** do the same for the
   People list.
6. **"Team" and the staff record's "department" are two fields.** One access rule lets a lead read
   their department's check-ins, using the staff record's department. The new "Team" is read by no
   access rule. **My recommendation:** make them one field, but that changes an access rule, so it is
   yours to decide.
7. **Not built, waiting for other modules:** "Guest" as a choice when inviting (a guest is someone
   from another organisation added to one check-in); "Region", which has no field; "Across check-ins"
   on one person's page, because each person's load is private and it belongs to the You page (U.12);
   the check-in's "People and setup" tab (with B1 and B3); the read-only note on the board (U.10); and
   your own Settings page (`own-settings.txt`).
9. **Changing someone who is looking at another organisation fails.** An admin who changes the role
   or phone number of a person currently looking at a different organisation gets "User not found".
   And when a role is changed, it is written to the person's account as a whole, which is their role
   in whichever organisation they last looked at, not necessarily this one. **My recommendation:** find
   and change the person through this organisation's membership, and write the role only there, as
   the People list now does. That changes where roles are kept, so I have not done it without you.
8. **"Changes apply straight away."** The prototype adds "and are noted with your name", but nothing
   records who changed a role. **Left out.** **My recommendation:** record it, then add the words back.

### 16. Today and the check-ins list (U.5): what needs you

1. **The Connections door on the new admin's card promises "your numbers, your own address".**
   Neither exists yet; they come with connections (U.18). I kept the prototype's words, as you asked.
   **My recommendation:** keep them, since U.18 will make them true.
2. **The engine's short summary of how each check-in is going is no longer on the list,** because the
   prototype's table has no place for it. The board still shows it. **My recommendation:** leave it on
   the board only. Related, and worth checking: the list still sends each check-in's latest session
   picture to every reader, even before it has been shared.
3. **Finished check-ins show no tag for how they ended.** The prototype shows "Kept", but an ending can
   also be letting someone go, which would be a label on a person. **My recommendation:** show no tag.
4. **Not built, because nothing in the product holds these yet:** the message Groundwork writes first;
   "Since yesterday", "Your deals" and the chief executive's priorities (asked of the engine, request
   3); "The weekly report shares itself at 6:30pm" with "Hold it" (reports are not shared
   automatically); a lead's question to one person; and "Send it to him on WhatsApp".
5. **One old invite route no longer has a button.** Inviting now goes through the People page.
   **My recommendation:** retire the old route in a later clean-up.

### 17. Starting a check-in (U.6): what needs you

1. **The situations' names.** The new list shows the prototype's names in sentence case, but eight
   still differ in their words, for example "Support a raise, promotion, or recognition" where the
   prototype says "Support a raise or promotion", and "Check in before a contract or renewal" where it
   says "Check in before a renewal". The names are tied to the engine's own table, so I have asked the
   engine workspace (request 5). Two of the prototype's names are narrower than ours ("recognition"
   and "contract" drop out). **My recommendation:** take the prototype's names; the one line under
   each still says what it covers.
2. **Two one-line descriptions say a rhythm the product does not set.** "Set goals and keep the team on
   track" reads "Targets, and a daily read on what’s actually moving." and "Keep a read on live work"
   reads "…every week.", but those situations start every 2 weeks and monthly. I kept the prototype's
   words. **My recommendation:** either keep them, since the rhythm is changed in setup, or change the
   starting rhythm to match.
3. **"Onboarding several people at once" is a card the prototype does not have.** It is kept, last
   under "Something is starting", so nothing is lost. **My recommendation:** keep it.
4. **"Do you check in too?"** The prototype's setup asks "Yes, I’m part of this" or "No, I only run
   it", where "only run it" means no account of yours at all. Ours offers "I set this up and check in
   myself" or "I check in once to set the context, then only they check in", so the lead always
   checks in once. That is a product decision, so I kept ours. **My recommendation:** keep ours, since
   the lead's first account is what everyone else's is read against, and use the prototype's wording
   only when that is decided.
5. **The lead's first check-in card ("You’re up first").** The prototype shows it after invitations
   have gone ("Invitations have gone to 4 people."). In our flow the lead checks in before anyone is
   invited, so that sentence would be false, and "Do it later today" has nowhere to keep the check-in
   for someone signed out. I also found that the old card for this moment is never shown: nothing
   ever turns it on. I have not built the card. **My recommendation:** decide whether invitations go
   before or after the lead's first check-in; then I build the card with sentences that are true.
6. **Not built, as `not-to-build.md` or the modules say:** the switchboard page (a design table with
   sample data, part of B5), the template library's running examples (sample data), "What this turns
   on" and "Or start from a ready-made check-in in the template library." (both point at those pages),
   and the supplier review board (B5).
7. **Wording I used where no screen has any:** "Send" and the placeholder "For example: our sales
   targets this quarter" on the signed-in first screen (taken from the signed-out one), the same
   placeholder in the list's box (the prototype's own is cut off in its picture), the link "Rather
   pick from a list? See every situation." for someone signed in (so the list can be reached), and
   "Where you are" as the name of the "Check-ins / New check-in" line for screen readers. Under "For
   example" in the "You picked" panel, the examples are the product's own, not the prototype's.
   Also, in the setup: "Not set yet. This will run every 2 weeks unless you pick one." (today's
   sentence, reworded), "On which day?" and "On which day of the month?" with "Any day" (today's
   labels, kept so the day a check-in lands on can still be chosen), "Tomorrow, Wednesday 1 July."
   without "from 4pm", "The check-in opens on Wednesday 1 July." for a single check-in, "From 1 July"
   when only the start is set, "1 you mentioned: Daniel." before anyone is added, "Copied." after
   "Copy", and "Download the QR code" saves the picture as check-in-qr-code.png.
8. **The setup screen (#/new/setup): what is left out, and why.** "Opens at" and "Closes at":
   nothing on the server keeps an opening time. Guests from another organisation: not built (item
   15.7). "Do you check in too?": left out of the setup screen; the conversation already asks who
   checks in, and the lead checks in once (point 4). "Where people answer": it lives on the check-in's
   own Setup, and now shows only while WhatsApp is switched on as well as connected. "Or share a link"
   is also on the check-in's own Setup, because the link only exists once the check-in does.
   **My recommendation:** add an opening time to the check-in if the prototype's "from 4pm" matters.
9. **Two lines of "Or share a link" are left out.** "Turn the link off": nothing on the server turns
   the link off. "They don’t take a seat.": I did not check this against billing. **My
   recommendation:** add a way to turn the link off (a new link, as the organisation's invite link
   does), then put both lines back once billing confirms the second.
10. **The prototype's own count is sample data.** Its "65 in all" for weekdays from 1 July to 30
    September is 66 in 2026. The screen counts for real.
11. **"Each check-in takes about two minutes after the first."** This is under "How often" in the
    prototype. I left it out because nothing measures it. **My recommendation:** keep it out unless the
    engine workspace confirms it.
12. **The panel that fills in as you talk** has no "Change" buttons, and does not say "Add their
    emails in the chat", because addresses are added on the save card. **My recommendation:** keep it
    this way until adding people in the chat is built.

### 18. Context (U.7): what needs you

1. **A private document and everyone's questions.** Under "Only you", the prototype's "Add a
   document" says "The check-in still uses it for everyone’s questions, but only you can open it."
   Today that is not true: a private document shapes only its uploader's own questions, and a
   document everyone's check-in reads is one everyone can open. Making it true would change who a
   document reaches, which is a privacy rule, so I kept today's rule and used the product's own
   sentence: "Only you can see this. It supports your own account and nobody else can open it."
   **My recommendation:** allow it for the lead's documents only (the check-in may use them for
   everyone's questions, and nobody else can open them or be quoted them), with a privacy test, and
   then use the prototype's sentence.
2. **"You can remove it later; what was taken from it goes with it."** Only the first half is
   always true: numbers already confirmed into targets stay when the document is removed. I show
   "You can remove it later." **My recommendation:** keep it this way, or remove confirmed numbers
   with the document (a separate change, with a test).
3. **"From a plan" is not on the page yet.** Its sentence promises proposals "for you to check one
   by one". Today a pasted or attached plan becomes one proposal with one yes, in the context chat.
   I asked the engine workspace for separate proposals (request 6). **My recommendation:** keep it
   off until then, rather than show a promise the product does not keep.
4. **"Your notes on each person".** The prototype's Context page shows the lead's notes on each
   person ("Only you see these", "Shapes the questions his check-in asks. Never shown to him as your
   words."). On 22 September you said the lead's read of a person should not be on this page, so I
   kept it off. **My recommendation:** keep your decision, unless you now want it back as the
   prototype has it (it is private to the lead either way, enforced by the server).
5. **Not built yet, and why.** "Waiting for you to confirm" and the context chat's cards ("Picked up:
   Rule. It would go in How we work") need the engine's separate proposals (request 6). "What counts"
   (definitions such as Qualified, with "Confirmed 2 Sep") needs a kind of line the product does not
   keep yet. "Where this stood on day one" is the board's starting state, for U.10. "Each person's
   card" with "Their check-in asks" and "Told their number" needs the engine (request 6). The
   Company context page (#/company/kijani/context) needs organisation-wide priorities, versions and
   a handbook that do not exist yet; I suggest building it with the Company page in U.15.
6. **"Change who sees them" is one setting for the whole check-in.** The prototype's link sits over
   the targets, but the product decides who sees numbers for the whole check-in, not for each target.
   The link opens the check-in's settings, where "Show everyone each other’s numbers" lives.
   **My recommendation:** keep one setting.
7. **Wording no screen has, which I wrote with the fewest words.** Under the brief, for anyone but
   the lead: "Wairimu’s words, from setup. Everyone reads this before they answer." (the lead's first
   name in place of "Your"). Beside a target: "Seen by you and Wairimu" for the person whose share it
   is, and "Seen by Aisha and Wairimu" for an admin; "No number set" when a target has no number.
   Under a target: "Say what it assumes", "Change what it assumes", the box's hint "One thing on each
   line.", "Save" and "Cancel"; "What Sales assumes" when a target has no number. In "Add a
   document": "Reading it now." (the context chat's words), "Read just now. Here’s what the check-in
   will use." when the read gives no page count, and "Q3 price list.pdf is in Context." after "Add it
   to Context". In the first-time "Add a document" card, the old paragraph is now plain sentences:
   "The check-in reads it, and says where it does not match what you have told it. It can be proof
   of what has happened, such as meeting notes, a transcript from Gemini or another notetaker, or a
   photo of what was agreed. It can also be the brief, plan or scope this work was set against."

### 19. The check-in screens (U.8): what needs you

1. **"About two minutes" is not under the heading.** The prototype's check-in says "About two
   minutes" under its title. Nothing in the record says how long a check-in takes, and it would not
   be true of a probation review. The line is left empty while someone answers, and reads
   "That’s everything for today" once Groundwork has closed the conversation. **My recommendation:**
   show a time only when it comes from this person's own past check-ins.
2. **"Your team will see what you said today, and a short summary of what moved." is held.** It is
   the last line of the prototype's end card. Whether the team sees a person's own words is the open
   question in item 11 (conflict A), so I left it out rather than promise something the server may
   not do. **My recommendation:** decide conflict A, then show the sentence the server's sharing
   rules make true for that check-in.
3. **The team's report says "once everyone has answered", not "once Wairimu shares it, usually by
   7pm".** Today the team's report opens by itself when everyone in the round has answered
   (`reports.listener.ts`), and there is no set time. The Done page says "Everyone’s check-ins
   together. You’ll get it once everyone has answered." **My recommendation:** keep it until U.9
   (reports and sharing) decides whether a lead holds and shares the report.
4. **The heading says "Your check-in", not "Sales team check-in".** A check-in's name is often like
   "Sales team, Q3" or "Kwame, first 90 days", and adding "check-in" after it reads badly. The way
   back above the card carries the name, as the prototype does: "← Sales team, Q3". **My
   recommendation:** keep "Your check-in", or give each check-in a short name for its team.
5. **The "What you gave us" card no longer shows after finishing.** It gave a count ("3 of 5 things
   you said can be checked…") and "One detail would make these usable" lines. The prototype's Done
   page has "How checkable today’s check-in was" in that place, and that is what is shown now. The
   five things and the most useful one are still in your own report ("Read yours"). **My
   recommendation:** keep it this way. If you want the "one detail" lines back, I would add them to
   the "How checkable" card as plain sentences.
6. **The prototype's five checks are not the engine's five.** The Done page's list in the prototype
   is Who, What, When, Proof and Next. The engine reads five other things (what you did, one date or
   number or document, what you were waiting on, what went badly, what happens next). The screen
   shows the engine's five, in the product's words, so nothing is shown that was not measured.
   **My recommendation:** ask the engine workspace whether its five should become the prototype's.
7. **The board still tells a lead that someone said "nothing checkable".** While making "Only you
   see it" true on the Done page, I stopped the server sending anyone else how checkable a person's
   check-ins were (the lead, admins, and the organisation roster). The board's text, which the
   engine workspace owns, still reads the same measure to tell the lead "nothing checkable" about a
   person (`where-each-person-is-against-their-number.ts`). **My recommendation:** say what is
   missing from the record instead ("No date or number in this week's answers"), or drop that
   reason. That is for the engine workspace and U.10.
8. **Left out, and why.** The Done page's "3. Done" step label (it belongs to the answer-without-an-
   account steps). The typing box's "Type, or hold to speak" (there is no speaking yet), so it still
   says "Type your answer". The three fixed chips under the conversation ("What am I missing?", "Is
   there a document?", "What do I carry forward?"), because the prototype puts the engine's suggested
   answers there, and "What am I missing?" belongs between check-ins. The answer without an account,
   between check-ins, correcting the record, my record, WhatsApp and the lead taking part are other
   B3 screens that were not part of this task's list.
9. **Wording no screen shows, which I wrote with the fewest words.** Under Pause: "Stop for now",
   "Everything you have said is saved. You can come back to it any time.", "Skip this check-in" and
   "You can say no. You will see what that means before anything is recorded." The fallback offer to
   finish: "Finish my check-in now". The + menu: "Add a photo or a document" and "Paste text", with
   the prototype's "It starts private to you. You choose who can read it."; its button is read aloud
   as "Add a photo, a document or some text". After choosing a file: "What does it show? One line is
   enough; you can skip it.", then "You added “quote.jpg”. Only you can open it." A closing session's
   heading line: "Closing session 13. This is your final account." When the next one opens: "Your
   next check-in opens today at 8:30pm.", "…tomorrow at 4pm.", "…on Monday 28 September at 9am." or
   "Your next check-in is open now." On the Done page: "Done. Thank you." when there is no first
   name, "One thing for next time:" in place of "One thing for tomorrow:", "Read it" once the team's
   report is out, and "What changed" when the engine sends no title.

### 20. Reports and sharing (U.9): what needs you

1. **Does the lead hold the team's report until they share it? This decides who reads what, and
   when.** The prototype's team report says "Only you can see this until you share it", with "Share
   without names" and "Share with the team", and a participant reads "The team’s report isn’t shared
   yet" and "Wairimu usually shares it by 7pm. You’ll get an email when she does." Today the product
   does the opposite: a forming report can be read by everyone in the check-in while people answer,
   and the report goes out to everyone by itself when the last person answers
   (`reports.listener.ts`). Holding it would change when participants can read the team's report,
   which is a privacy rule, so I kept today's behaviour and left the prototype's sharing lines out.
   The existing "Send the report to everyone who asked for it" (named or anonymised, for open links)
   is unchanged. **My recommendation:** build the prototype's way, enforced on the server: the team's
   report is the lead's alone until they share it, named or without names, with a setting to share
   it automatically at a set time, and a privacy test for the participant and the admin. This also
   answers item 19.3.
2. **"Why the numbers don’t match" and "One question to answer", with "Yes, it counts" and "No, it
   doesn’t".** The prototype says "Your answer updates the board, and everyone counts the same way
   from now on." The text is the engine's (request 9), but the answer needs somewhere to be kept and
   a rule for who may answer. On the participant's screen the prototype shows the same two buttons.
   **My recommendation:** only the lead answers, and the answer is kept as a decision with its
   reason on the check-in's record, which the board then reads. A participant reads the question but
   gets no buttons.
3. **The weekly report does not exist.** `docs/backend-map.md` calls it "Ready", but no weekly
   report is built or served anywhere. I asked the engine workspace for it (request 9, part d).
   **My recommendation:** build it after the engine's text arrives, only from what the record
   already holds.
4. **"Session 38 of 65" and the date on each session.** A session's report now opens with "Session
   37 of 65. 6 of 6 people checked in." when the check-in has a planned number of sessions. Each row
   on "Every session" shows the day the session opened ("Wed, 23 Sept"), or its first answer when no
   opening time was kept. **My recommendation:** keep it.
5. **The list of sessions is no longer folded under the board.** On 21 September you asked to
   "keep the team board on this page and minimize the other things". The prototype shows every
   session open under the board, so I followed the prototype. **My recommendation:** keep the
   prototype's way; fold it again if the list feels long.
6. **Still held, from items 11 and 19:** the session page still says "What each person said about
   their own work can appear here. What anyone said about somebody else never does." That is
   today's rule on who reads a person's own words, and it stays until you decide conflict A.
7. **Not built, and why.** The report's "In short", "What moved" with its stages, "What each person
   did" with "Will do", "Where people see it differently" with "The rule you set", "What this report
   can’t tell you", "How much this report can rely on", and the own report's "What you did well",
   "What you told us" and "One thing to think about": all are the engine's text (requests 2 and 9).
   The daily digest for a large team and the head of sales' quarter view are not built. "Yesterday"
   and "This week" beside the report wait for the weekly report.
8. **Wording no screen shows, which I wrote with the fewest words.** On "Every session", who a
   session is still waiting for: "Omar has not checked in yet.", "Omar and Brian have not checked in
   yet.", "Omar, Brian and David have not checked in yet." and "Omar, Brian and 2 others have not
   checked in yet." On a session's report, each person: "You have checked in.", "You have not checked
   in yet.", "Aisha has checked in." and "Omar has not checked in yet." In the lead's judgement on
   the board: "2 conversations never reached this.", "One conversation never reached this." and
   "Start with Brian and Miriam." The way back from a session: "← Every session". Under a session's
   heading: "Everything about this session, on 23 September. Your report first, then the team’s
   report."

### 21. The board (U.10): what needs you

1. **A participant reads the board's read on each colleague. This is a privacy question.** Where
   people in a check-in can see each other, a participant's board still carries "Contribution against
   role" (a read of what the record holds about each colleague's work, with why) and "Where work is
   landing" (for example "Landing with others" beside a colleague's name). The prototype's
   participant board shows only the team's picture once it is shared and the person's own part in
   full. Taking these away from participants would change who reads what, so I have not done it.
   **My recommendation:** serve both only to whoever runs the check-in, and to each person their own
   row, enforced on the server, with a privacy test for the participant.
2. **"Today’s team picture isn’t shared yet" and "Today’s report shares itself at 6:30pm" are held.**
   Both wait for item 20.1 (does the lead hold the team's report until they share it). Today a
   participant's board shows the team's differences and quick read from the report as it forms.
   **My recommendation:** decide 20.1; the board then follows the same rule as the report.
3. **The check-in's own header and tabs are not built.** The prototype's board sits under the
   check-in's name, "Daily on weekdays, from 4pm. Session 38 of 65. Runs until 30 September.", and
   the tabs "Your check-in", "Ask", "Board", "Check-in", "Context", "My work", "People and setup" and
   "Views". The product has no shared tab bar for a check-in; each page stands alone. **My
   recommendation:** build it once, as its own task, for every page of a check-in, with the "Views"
   menu only for the person who runs it. The board's look is also not yet the prototype's: it is
   still grey-blue with a dark header, not cream. I left the look alone so this change stays small.
4. **The switchboard is not yet the prototype's table.** The server chooses the board's sections by
   the kind of check-in (five families in `board-families.ts`), not by the 30 sections for each of
   the 24 situations in `docs/modules.md` (G2). Mapping them changes what every board shows. **My
   recommendation:** write the G2 table as a test first, matching each of its sections to the
   backend's section with the same purpose, then switch sections on and off by situation, and build
   the missing sections one at a time, starting with "What the target assumes" (done now) and
   "Blockers".
5. **"Where this is heading" and "Record the decision" need somewhere to keep a decision with its
   reason.** Nothing in the product holds one yet (`docs/modules.md`, B5: "Missing: a decision with a
   reason"). **My recommendation:** build it with U.11 (ending a check-in), lead only, kept on the
   check-in's record so the board reads it.
6. **Not built, and why.** "Will we reach 25 sales…", "To close the gap", "The team today", the
   blockers' history, "What keeps coming up" in two halves, "Help nobody mentioned" as the prototype
   means it, and "Open issues" with the path from unclear to checked: all are the engine's text
   (request 11). "Every deal, day by day", "Reported vs criteria met" and "Your deals" need deals as
   records (U.17, customers and deals) and each line's mark (request 2). "Waiting on other teams" and
   "Where the blocker started" need check-ins linked as records (U.16). One person's page
   (#/c/sales/person/miriam) with "Ask her something" and the lead's notes is not built yet. "Your
   share" on the participant's board needs how many of their sales are paid, which only proof can
   say.
7. **Wording no screen shows, which I wrote with the fewest words.** When the record holds no time
   yet, the board says only "The board only changes when something new comes in, such as a check-in,
   a report, a decision or a number from another system." When nobody can be named as running the
   check-in, an admin reads only "You can read this check-in’s board and reports." A target with no
   number reads "What Sales assumes" (the target's name). A side of a difference whose label nobody
   could resolve reads "A colleague".

### 22. Ending a check-in (U.11): what needs you

1. **The handover page is not built, because the prototype and the product mean different things by
   it. This is partly a privacy question.** The prototype's page belongs to one check-in: Leila moves
   to another matter, and the page gives Amos "The strategy", "The key fact", "Still open", "The client
   expects", and the dates, promises and decisions, then "Leila checks this page before she moves.
   Amos confirms he has read it." The product's handover belongs to the organisation: when a role
   ends through the developer API, the successor gets a brief of what is outstanding (open
   commitments, what each side is waiting on, and subjects that were live), and it never carries what
   the person leaving said, on purpose, so that nobody's honest answers travel because they left. No
   screen shows that brief today. **My recommendation:** a handover page on the check-in where the
   person leaving writes the handover in their own words, sees it before it goes, and the person
   taking over confirms they have read it, with the product's brief of what is outstanding beside it.
   Nothing the leaver said in check-ins should be copied into it without them.
2. **Who reads the lead's reason.** I served it, once the check-in has ended, to everyone in the
   check-in and to an admin, and to nobody else. On a team check-in that means every participant
   reads the lead's reason. **My recommendation:** keep it that way. It follows rule 6 (the person
   sees the decision with its reasons) and an admin needs it to decide an appeal.
3. **"Where this is heading" is held.** The prototype's board shows the possible outcomes, "wairimu
   decides." and "Groundwork lays out the outcomes and the proof. It doesn't choose." from the start.
   The product has an earlier rule of yours that the outcomes appear only near the last session, so
   nobody sees "Stop the project" on a check-in that started yesterday. I kept your rule. **My
   recommendation:** show "Where this is heading" to the lead only, from the start, as a list with no
   buttons, and keep the person's view of the outcomes for near the end.
4. **"Send the final report to everyone" is not built, and the closing email is unchanged.** The
   prototype lets the lead add readers such as HR, and says the person "gets an email and his final
   report". Today everyone in the check-in gets the same closing email, which does not include the
   reason. You asked for emails to keep working exactly as now. **My recommendation:** add the reason
   to the closing email for the people in the check-in, and leave adding outside readers until the
   suites decide who HR is (U.17).
5. **The second press stays.** The prototype ends a check-in on one press of "Save the outcome and
   end it". The product has a rule that nothing irreversible happens on one press, so a second press
   asks "End it as "Keep the hire"? As the lead, your answer closes this check-in. Nobody can add to
   it after that." with "Yes, end it" and "Not yet". **My recommendation:** keep it.
6. **The outcome's words for a new hire are the engine's.** The person reads the outcome, for
   example "Let them go", because rule 6 says they see the decision. The prototype's words are
   gentler ("Keep Kwame on", "Extend the settling-in period", "Change the role", "Part ways"). The
   label is stored and read by the prompts, so I asked the engine workspace (request 13, part d).
   **My recommendation:** agree to the prototype's words.
7. **Not built, and why.** Groundwork's suggestion ("Groundwork suggests keeping Kwame on", with why,
   what would change it, and the person's own answer), the probation review's parts (where things
   stand, signals, week by week, why things went wrong and what went well, what colleagues saw,
   support given, questions to help decide), and the day 30 and day 60 pictures are the engine's
   text (request 13, parts a to c). The suggestion's screens, "add their side" and appeals are U.13.
   Pausing, restarting, cancelling and giving more time are not built in this pass. The check-in's
   own header and tabs wait for item 21.3.
8. **Wording no screen shows, which I wrote with the fewest words.** "How this ended" (kept from
   before). "You decided this on 30 September." and "Wairimu decided this on 30 September." "Your
   reason" and "Wairimu’s reason". "Your account is kept, and you can still correct it." (for the
   person, after it has ended). For an admin who only reads: "These are the outcomes this check-in
   can reach. Wairimu decides which one it is." Where there are several other people: "Everyone in
   the check-in reads this with the outcome.", "What everyone else sees now" and "Ending means nobody
   can add to it. Everyone keeps their own history, and can still correct their own account." The
   prototype's "his account" reads "their account". "Back to the board" on the ending page. The
   second press, in item 5. When saving fails: "That did not save. Your outcome and reason are still
   here, so you can try again." When the server is asked to end a check-in with no reason: "Say why,
   in a sentence or two. The people in this check-in read it with the outcome." After it ends: "This
   check-in has ended. Everyone in it can read the outcome and your reason."

### 23. The You board (U.12): what needs you

1. **Who may read someone's You board. This is a privacy question.** The prototype's page says both
   "Only you see this page." and, under "Your board", "Only you, and the people who run your
   check-ins, see it."; `docs/modules.md` says the second. I built the first: the server serves the
   board to the person alone and refuses a lead, an admin and a colleague. The page leaves out the
   second sentence, because it would not be true (your to-dos, for one, are never seen by anyone
   else). **My recommendation:** keep it yours alone. Whoever runs a check-in already reads your part
   in it on that check-in's own pages, and your load across check-ins stays private unless you share it.
2. **"Where you stand" is not shown.** The prototype says "14 of 16 kept, in the last 4 weeks." The
   product keeps promises in three places, and nothing says what "kept in the last 4 weeks" counts:
   what was marked done, what fell due, or what was said in those weeks. I did not invent a rule, and
   asked the engine to write this part (request 14). For Daniel and Kwame it is Groundwork's
   suggestion, which is U.13. **My recommendation:** count what the person themselves marked done,
   out of the promises that fell due in the last 4 weeks, and say so on the page.
3. **"Everything asked of you this week" and "Share with your lead" are not built.** That list is
   your load across check-ins, which is private unless you share it. Nothing in the product holds
   requests from one person to another, or a choice to share them. **My recommendation:** build it
   with each person's load (D3, U.16), with sharing that you switch on for one lead at a time.
4. **"Add my side", "Say what’s behind it" and "Stop sharing automatically" are not built.** They
   need somewhere to keep your side and a way for the lead to read it (C3, U.13).
5. **"Your work in each" says sessions, not check-ins.** The prototype says "Sales team, Q3" and "38
   check-ins". That counts sessions as check-ins, which is the open question in item 11.8. The page
   says "You have finished 38 sessions.", and "You run this check-in." for one you run.
   **My recommendation:** decide item 11.8, and I will use the word you choose.
6. **"One thing for this week:" is the prototype's wording,** before the coaching step. A check-in
   that meets every month still says "this week". **My recommendation:** keep it for now, and say
   "for now" or "before your next check-in" if monthly check-ins are common.
7. **Promises made to Ask Groundwork or through the developer API are not on the board.** "What you
   said you’d do" says "From every check-in", so it lists only what is in your check-ins. **My
   recommendation:** add the others later, each saying where it was said.
8. **The heading line is the shorter one.** Miriam's and Wairimu's pages say "...what you said you’d
   do, your own reports, and what keeps coming up about your part."; Daniel's and Kwame's say
   "What’s yours, across your check-ins. Only you see this page." I used the shorter one, because
   "what keeps coming up" is not on the page until the engine writes it.
9. **One person's page still leaves out "Across check-ins"** (item 15.7). Its sentence says "they
   choose who else sees it" of the You page, and nothing lets anybody share it yet.
10. **Wording no screen shows, which I wrote with the fewest words.** "You are not in any check-in
    yet." "Loading…" "Your board did not load. Nothing you have written is affected." with "Try
    again". "Your file did not download. Try again." "You have not finished a session yet.", "You
    have finished 1 session.", "You have finished 38 sessions." and "You run this check-in." A target
    with your name on it: "Sales closed. You have 3 of 4." The tag "Not done", for something you
    marked not done. When anybody asks for someone else's board, the server says "Only the person
    whose page this is can read it."

### 24. Suggestions from verdicts, and appeals (U.13): what needs you

1. **Which admins may read a suggestion about someone, and when. This is a privacy question.** Rule
   5 says admins see every board, and rule 6 says an admin decides appeals. Item 15.1 (should admins
   be kept out of performance plans unless given access) is still open. I built the narrower answer:
   an admin reads a suggestion only once the person has appealed it, and then only what they need to
   decide it (the suggestion as the lead read it, the decision and its reasons, the person's side and
   the appeal). Before an appeal, an admin who is not in the check-in reads nothing of it. **My
   recommendation:** keep it this way, whatever you decide for item 15.1.
2. **Who may decide an appeal.** Any admin of the organisation, except the admin who made the
   decision (a lead who is also an admin cannot decide an appeal against their own decision). If the
   only admin is the person who decided, the appeal waits, and nothing tells the person why. **My
   recommendation:** when no other admin exists, tell the person so on their You board, and let the
   chief executive decide it (U.15 knows who that is).
3. **What "Change the decision" does.** The admin's answer and reasons are stored, and both the
   person and the lead read them ("Grace decided the appeal. The decision is changed.", with Grace's
   reasons). Nothing else changes by itself: the lead's decision stays on the record as it was, and no
   plan starts or ends. **My recommendation:** after "The decision is changed", let the lead record a
   new decision, with the admin's reasons shown beside it.
4. **On the ending page, the suggestion and the outcome are saved separately,** as the prototype
   draws them: "Agree" or "Choose something else" with reasons, and then the outcome with "Why, in a
   sentence or two". **My recommendation:** when the lead agrees with a suggestion about how it ends,
   choose that outcome for them and carry the reasons over, so they say it once.
5. **Nobody is told by email,** and nothing is added to "What needs you". A decision, a side, an
   appeal and an appeal's answer are saved and shown on the pages, but no email goes, because you
   asked for emails to keep working exactly as now. An admin sees appeals at the top of Today. **My
   recommendation:** add "Daniel appealed your decision" and "Wairimu decided" to "What needs you"
   for the lead and the person, and an email for an appeal and its answer.
6. **The lead may change their decision until it is appealed; the person may change their side at
   any time, and may appeal once.** After an appeal the decision is the admin's to answer. **My
   recommendation:** keep it.
7. **A colleague never learns about a suggestion about someone else,** even on a team check-in, and
   the board's "Last updated" time does not count these decisions, because on a team check-in that
   time would tell everyone that something was decided about somebody. **My recommendation:** keep
   it.
8. **Not built, and why.** The text of every suggestion is the engine's (request 15, which replaces
   request 13(a)); until the engine writes one, no suggestion appears anywhere. "Daniel was also told,
   on his own board: …" waits for what Groundwork noticed (request 14(c)). "The full case, stage by
   stage, with both accounts, the blocker check and the requirements review." and "Open Daniel’s
   case" need a case page the product does not have. "Where this is heading" is held (item 22.3).
   "Groundwork suggests recognising Aisha’s work" is on the reviews suite, which is U.17. "Say what’s
   behind it" and "Stop sharing automatically" on the You board still wait for what Groundwork
   noticed (request 14(c)).
9. **The prototype's "her decision and her reasons" reads "the decision and the reasons".** The
   product does not know anyone's pronouns, so Daniel reads "Wairimu has not decided anything yet.
   You will see the decision and the reasons here."
10. **Wording no screen shows, which I wrote with the fewest words.** Some of these are the same as
    the words in the prototype's code for the same forms; none is on a prototype screen. **For the
    lead:** after deciding, "Your decision", "Your reasons" and "Daniel sees your decision and your
    reasons, and can appeal.", with "Change my decision". In the form: "Your decision", "Your reasons,
    in a sentence or two", "Save my decision", "Not yet", and when choosing something else, the
    choices, "Something else" and "What you decided". "Daniel’s side". "Daniel has appealed" with "An
    admin decides the appeal." "Grace decided the appeal. The decision stays." or "Grace decided the
    appeal. The decision is changed.", then "Grace’s reasons". **For the person:** "About your work in
    Daniel, the next six weeks.", "Wairimu’s decision", "Wairimu’s reasons", "Your side", "Change my
    side", "Appeal this decision", "Wairimu sees this next to the facts.", "An admin looks at the
    decision, the facts and your reasons, and decides. Wairimu sees that you appealed.", "Why do you
    disagree?", "Send my appeal", "Save", "You appealed. An admin decides. You will see the answer
    here." and "Grace decided your appeal. The decision stays." **For an admin, on Today:** "Appeals to
    decide", "Daniel appealed Wairimu’s decision", "In Daniel, the next six weeks.", "Daniel’s appeal",
    "Keep the decision", "Change the decision", "Daniel and Wairimu both read your reasons.", "Your
    reasons", and "You made this decision, so another admin decides the appeal." **Everywhere:**
    "Saving…" and "That did not save. What you wrote is still here, so you can try again." **What the
    server says when it refuses:** "Only the person who runs this check-in decides.", "Only the person
    this is about can do this.", "Only an admin of this organisation decides an appeal.", "You made
    this decision, so another admin decides the appeal.", "Say what you decided.", "Say why, in a
    sentence or two. The person this is about reads your reasons.", "This decision has been appealed,
    so an admin decides it now.", "Write your side first.", "There is no decision to appeal yet.",
    "You have already appealed this decision.", "Say why you disagree.", "There is no appeal to
    decide.", "This appeal has already been decided.", "Choose whether the decision stays or is
    changed.", "Say why. Both of them read your reasons.", "You are not part of this check-in." and
    "That suggestion was not found." Where somebody has no first name, the page says "This person",
    "Your lead" or "An admin".
11. Suggestions and appeals are not offered through Ask Groundwork. Recommendation: keep it that way,
    because they are private to the people involved.

### 25. Ask Groundwork (U.14): what needs you

1. **Most people cannot use Ask Groundwork yet.** The assistant answers one person on the
   organisation's own list of people, and only a connected directory (SCIM) puts anyone on that
   list. In an organisation that signed up through the product, nobody is on it, so the panel says
   "Ask Groundwork can answer you once your organisation has connected its list of people to
   Groundwork." and offers no box to type in. I did not add people to the list myself, because the
   pattern detectors read that list (for example "nobody leads this person"), and new entries would
   change what they find. **My recommendation:** ask the engine to let the assistant answer for a
   signed-in account as well (request 16(b)).
2. **Questions to Ask Groundwork feed the pattern detectors. This is a privacy question.** The rule
   is that your questions are private and never part of your check-in or a report. But
   `DetectorsService.run` reads everybody's questions to the assistant, alongside what they said in
   check-ins, as material for the detectors. I could not tell from the code alone whether anything
   built from them reaches another person, so I asked the engine to say, and to stop (request
   16(g)). **My recommendation:** questions to Ask Groundwork are read for nothing that anybody else
   reads, and a test says so.
3. **"The next check-in follows it up."** The prototype says a claim made to Ask Groundwork with no
   proof "stays the person's word, and the next check-in follows it up". That carries something
   from the private chat into the check-in. **My recommendation:** the check-in may ask about the
   claim (for example "Did Kariuki pay?"), but never says it came from Ask Groundwork, and never
   quotes the question.
4. **Two things Ask Groundwork does without a yes.** "Done: …" closes a to-do at once, and asking
   to set an objective starts a draft at once. Everything else it offers to do is said back and
   waits for a yes, which the server now holds to for the person who asked (a yes from anyone else,
   or for an older request, does nothing). They also run on the developer API, which must keep
   working exactly as now, so I left them. **My recommendation:** both should ask first; it is the
   engine's to change (request 16(f)).
5. **"Ask me about Sales team, Q3: a deal, a target, or what to do next."** This is the prototype's
   opening line, with the check-in's real name. "A deal, a target" suits a sales check-in, and the
   panel says it for every check-in. **My recommendation:** keep it until the engine writes an
   opening line for each situation (request 16(e)).
6. **Which check-ins "About" lists.** The ones you run or take part in, not those that have ended.
   An admin who is in none of them sees none, even though an admin may open every check-in. **My
   recommendation:** keep it, because your questions are about your own work.
7. **Your questions are not in your own data file.** "Download it" on the You board gives your
   check-ins and your side of things, but not your questions to Ask Groundwork. **My
   recommendation:** add them, since they are yours.
8. **Not built, and why.** The suggested questions under the opening line are about the sample data;
   they wait for the engine (request 16(e)). Checking claims, "thinking it through", and answering
   about the chosen check-in are the engine's (request 16(a), (c), (d)). Attaching a file (the
   paperclip), and asking for leave, hours, spending and equipment, wait for the engine and the
   suites (U.17). The lead's "Ask" button in a check-in's header is left out, because the speech
   bubble opens the same panel on every page. The line "answered from your records", which the
   developer API's panel shows under a reply, is not shown, because no prototype screen has it.
   Suggestions are still not offered through Ask Groundwork (item 24.11).
9. **Wording no screen shows, which I wrote with the fewest words.** "Yes" and "No" under a request
   Ask Groundwork says back; "Close" (the name of the × button, read aloud); "Ask a question" in the
   box when you are in no check-in; "That did not send. What you wrote is still here, so you can try
   again."; and the name "Ask Groundwork" read aloud for the speech bubble. **What the server says
   when it refuses:** "Only the person who asked these questions can read them.", "You are not part
   of this check-in.", "Ask Groundwork can answer you once your organisation has connected its list
   of people to Groundwork." and "There is nothing waiting for your yes. Ask again if you still want
   it done."
10. **The phone's bottom bar now has five words**, as the prototype's does: Today, Check-ins, Start,
    Chat and More. On screens 360px wide or less the words are a little smaller, so "Check-ins" still
    fits. The prototype's phone shows "Company" in place of "Start" for somebody who may not start a
    check-in; that waits for the Company page (U.15).

### 26. The Company page (U.15): what needs you

1. **"What new people keep asking" is built from private questions. This is a privacy question.**
   The prototype's Company page lists questions several new people asked Groundwork, such as "How
   do I send an order for stock?", with "Asked by 3 new people since July", and says "Only the
   question is shown. Nothing else from anyone’s private chats with Groundwork, and never who
   asked." But questions to Ask Groundwork are private always, and this shows them, even without
   names, to whoever reads the Company page. I left it out. **My recommendation:** allow it only
   when at least three new people asked the same thing, show only the question as the engine
   words it (never anybody's own words), never who asked or how many times each person asked, and
   only to admins. Until you decide, it stays out, and I asked the engine not to build it (request
   17(g)).
2. **Priorities can only come in from an organisation's own systems.** The page's priorities are
   the organisation's objectives sent through the developer API (a subject of type "objective"
   that hangs under nothing). An organisation that signed up through the product has none, so its
   page says "No priorities have come in from your organisation’s own systems yet." The prototype
   has "Change this" and "Say who owns this" in company context, and picks priorities up from the
   chief executive's check-in. **My recommendation:** let an admin write and change the
   priorities in company context, kept as Groundwork's own record beside the imported ones, with
   every change kept as a new version; picking them up from a check-in is the engine's (request
   17(e)).
3. **Who reads "What success looks like".** The prototype says "Everyone reads the priorities.
   Targets and numbers are leadership only." Nothing in the product says who "leadership" is, so
   the server gives the measure and the target to admins only. **My recommendation:** keep it to
   admins until people have levels (item 15), then give it to the top level too.
4. **The count of check-ins this week goes to admins only.** An admin reads every check-in, so
   their count is the organisation's. A lead or a member reads only the check-ins they are in, so
   the organisation's count would tell them about check-ins they may not open, and a count of
   their own would read as the company's. So they read "2 teams, 5 people." without it. **My
   recommendation:** keep it.
5. **A check-in that feeds a priority is named only to somebody who may open it.** Somebody who
   may open none of the check-ins under a priority reads neither "Fed by …" nor "No team feeds
   it" on it. **My recommendation:** keep it.
6. **Linked organisations are not built.** "What each level understood" (from the ministry down to
   the officers, marking where the meaning changed) and "Questions for the ministry" need
   organisations linked to each other, such as a ministry and its counties, where "Each county is
   its own organisation. You see summaries, never officers’ own words." Nothing links two
   organisations today, and deciding what one may read of the other is a privacy rule. **My
   recommendation:** decide it as its own piece of work, with the engine writing the summaries
   (request 17(f)).
7. **A guest may be able to read an organisation's handbook.** A guest from another company holds
   a membership, so that the check-in they were invited to is reachable. The existing read of how
   the company does things (`GET /org/how-we-do-it`) is given to anybody whose current
   organisation it is, and I could not find anything that keeps a guest out. The Company page and
   company context refuse a guest, and company context never asks for the handbook for one, but
   the read itself is unchanged, because organisation memory must keep working exactly as now.
   **My recommendation:** refuse that read to a guest, with a test.
8. **One Company page, not two.** The prototype has an older "Company board"
   (`#/company/kijani/board`) and the newer Company page (`#/company`), saying much the same. I
   built the newer one only. Its "Teams" and "History" tabs are left out, because no screen shows
   what is in them and nothing keeps the strategy's history, and so is "Strategy v2, since 1
   September." "Is the strategy moving?" is the page's heading instead of a tab. **My
   recommendation:** keep one page.
9. **Buttons left out until there is something to do.** "Decide", "Ask", "Make someone
   responsible", "Read what each team said" and "Open" act on the engine's parts, which are not
   written yet (request 17). "Ask about the whole organisation" and "Ask about the strategy" both
   open Ask Groundwork, which cannot yet answer about the whole organisation, and still answers only
   people on the organisation's list of people (item 25.1). Today does not show the chief
   executive's priorities yet (U.5); it can, now the server serves them.
10. **Wording no screen shows, which I wrote with the fewest words:** "No priorities have come in
    from your organisation’s own systems yet.", "This was last updated on 28 August." (on a
    priority not refreshed for two weeks), "Fed by Sales team, Q3" (the prototype names a team,
    and the product has check-ins, so it names the check-in), "The company page did not load.",
    "The company context did not load.", "Try again", "Nothing about how Baridi Appliances does
    things has been added yet.", "Resources" as a heading on its own, and "Company" and "Where
    you are" (read aloud for the way back from company context). **What the server says when it
    refuses:** "Only people in this organisation can read its company page."

### 27. Links between check-ins, and each person's load (U.16): what needs you

1. **"Share with your lead" is not built. This is a privacy question.** Your load across check-ins is
   yours alone (decisions rule 4 says "unless they share it"). Nobody has said who "your lead" is when
   you are in several check-ins, what they would read, or for how long. So nothing shares it, and the
   page says only "Only you see this." **My recommendation:** let the person choose one lead at a
   time, show them exactly what that lead will read, and let them stop sharing at any moment, with
   the server refusing the lead the moment they do.
2. **Should the team being asked see the request? This is a privacy question.** The prototype says
   "These show on their boards too", so Operations would read what Sales asked of it. I kept the rule
   you gave: a request from Sales shows on the Operations board only to somebody who may open the
   Sales check-in too (Wairimu, who is in both, or an admin). Fatuma, who runs Operations, reads
   nothing of it. So the sentence "These show on their boards too" is left out. **My recommendation:**
   let the lead of the check-in being asked read the request's words and the name of the check-in that
   asked, without who asked, because the request was made to their team.
3. **The board names who is waiting on you, even where people do not see each other.** On a check-in
   where people give their accounts without seeing each other, the board still shows you each handoff
   on you with the name of the person waiting (`onlyHandoffsTheyAreIn` in
   `api/src/modules/board/the-board-keeps-the-same-wall.ts`). The You page leaves the name out there.
   The board is the engine workspace's, so I did not change it. **My recommendation:** leave the name
   out on the board too, in that kind of check-in.
4. **The developer API reads each person's handoffs across check-ins.** `grounds-by-api.service.ts`
   serves both sides of one person's handoffs, across every check-in, to whoever holds the
   organisation's developer key. That is each person's load across check-ins. The developer API must
   keep working exactly as now, so I did not change it. **My recommendation:** decide whether an
   organisation's key may read it, and say so in the API's own documentation either way.
5. **"This week" is the prototype's heading, but the list holds every request still open.** A request
   from three weeks ago that nobody has answered is still on you, so it stays. **My recommendation:**
   keep the heading, or say "Everything asked of you now".
6. **Nothing is linked yet.** Which check-in a handoff waits on can only be told from what was said,
   which is the engine's work (request 18). Until the engine writes it, "Waiting on other teams" and
   "Asked of ... by other teams" never appear. "Where the blocker started" and "See where it started"
   are not built, and the line after "Asked", such as "Not decided.", is the engine's too.
7. **Prototype lines I shortened, because the rest would not be true yet.** "Only you see this unless
   you share it" is "Only you see this."; one person's page says "1 check-in. What’s asked of them is
   on their own You page." without "they choose who else sees it" (and "1 check-in", not the
   prototype's "1 check-ins"). "These show on their boards too" is left out (point 2).
8. **Wording no screen shows, which I wrote with the fewest words.** On the You page, each request
   says "Asked 16 Sept.", the board's own words. Where you may not see who asked, the row shows only
   the check-in. When a check-in has no name, its part says "Asked of this check-in by other teams".
   "1 request from 1 person across 1 check-in." and "0 check-ins." follow the prototype's sentences.
9. **One new column, on your computer only.** `ground_dependencies.waiting_on_ground_id`, empty and
   nullable, in the migration `20260927070000_links_between_check_ins`. Nothing existing changes. It
   has not been run against any database here.

### 28. The Suites page (U.17): what needs you

1. **The first questions are mine. No prototype screen shows any.** `docs/modules.md` says an admin
   answers "two or three questions" before a suite switches on. I asked only for what each suite's
   board, as the prototype draws it, cannot work without, in the fewest words. They live in one place
   on the server (`api/src/modules/suites/the-ten-suites.ts`), and nothing uses the answers until each
   board is built. **My recommendation:** read them, and change any you want before the boards come.
   - Onboarding: "Who sets up a new person’s pay and papers?" and "Who gives a new person their laptop
     and phone?" (each a person).
   - Leave requests: "How many days of leave does each person have in a year?" and "Who approves a
     request for time off?" ("Their manager" or "An admin").
   - Time sheets: "Which clients or projects do people give their hours for? Write one on each line."
     and "Who approves each week’s hours?" ("Their manager" or "An admin").
   - Performance reviews: "How often is each person reviewed?" ("Every 6 months" or "Every 12
     months") and "Who writes each review with the person?" ("Their manager" or "An admin").
   - When someone leaves: "Who removes a person’s access on their last day?" and "Who works out their
     final pay?" (each a person).
   - Spending and budgets: "Which currency do people spend in?" (a choice, added with its board, item
     45), "What is the most a manager may approve on their own?" (a number) and "Who approves anything
     above that?" (a person).
   - Equipment: "Who looks after equipment and repairs?" (a person).
   - Role map, To-dos, and Customers and deals ask nothing, and switch on at one press.
2. **"Open its board" is left out** until each suite's board exists, so no door leads nowhere. Each
   suite's board will bring it back.
3. **Who counts as a lead here?** The server gives the lead's page to people whose role is "Lead",
   the same rule as the Boards page. In the prototype, Wairimu's card says "Member", yet she has
   Suites, because she runs check-ins. **My recommendation:** keep the role "Lead", because the boards
   behind the suites will hold other people's leave, hours and spending. If you want anybody who runs
   a check-in to have it, say so, and it is one line on the server.
4. **"Only admins see this page."** is the prototype's sentence for the admin, though a lead has her
   own version of the page. I kept it, because only admins see the switches. **My recommendation:**
   keep it.
5. **Wording no screen shows, which I wrote with the fewest words:** "Off"; "Answer these first, and
   it switches on."; "Choose somebody"; "Choose one"; "Switch it on"; "Cancel"; "None are switched on
   yet."; "The suites did not load."; and the server's refusals: "Only an admin or a lead can open the
   suites.", "Only an admin can switch a suite on or off.", "There is no suite with that name." and
   "Answer every question before you switch it on." A switch that fails says the product's own "That
   did not go through, and nothing has changed. Try again."
6. **The welcome card's Suites door** says "Leave, spending and onboarding, switched on as needed", the
   prototype's words, as you decided for the welcome card. No screen shows it, and it is a clipped
   phrase, like the other doors. **My recommendation:** keep it with the others, or change all four
   together.
7. **"On" is a plain tag, not green.** The design system keeps green for what is proven, and a suite
   being on is not proof.
8. **Switching a suite off keeps the admin's answers,** so switching it on again starts from them.
   Nothing is deleted.
9. **For later, a privacy question: onboarding's "Something nobody has shown them yet".** The
   prototype builds it from what a new person asked Groundwork, and those questions are private always.
   **My recommendation:** decide before the onboarding board is built. For example, the new person
   could be asked first whether their question may go to the person whose job it is.
10. **One new table, on your computer only** (`organization_suites`, migration
    `20260927080000_the_suites_an_organisation_has_on`). It has not been run against any database.
11. Switching suites on or off is not offered through Ask Groundwork; only an admin does it on the
    Suites page. Recommendation: keep it that way.
12. **"Who helps set ... up" is not built.** Nothing records who helps with which step, so each
    helper's own list cannot be made from what exists. **My recommendation:** let each step name who
    helps with it, when the steps for a role are set up. The two onboarding questions (who sets up pay
    and papers, who gives out the laptop and phone) could fill that in for the matching steps.
13. **"Her work is in her own check-in, Faith, first 90 days." is left out,** because nothing links a
    new person to their work check-in yet. **My recommendation:** link them when a check-in about a new
    person is started, and then show the sentence with its link on both.
14. **Steps are marked where they always were,** through the developer API, and not on the board. The
    board is read-only, so no admin can tick off a new person's own to-do for them (audit B13). Request
    20 asks the engine to let the person say a step is done in their own check-in or chat, said back
    and confirmed first. "2 of 4 done" counts a step that was let through ("Not needed") as done.
15. **The prototype's board is one person's; this one has a part for each new person** (audit A27),
    under the heading "Onboarding". Each part is headed with the prototype's sentence, "Faith Kerubo is
    getting set up". The prototype's "her" is the person's first name, because the product does not
    know anyone's pronouns: "It is never used to judge Faith’s work." The prototype's "papers,
    equipment, training and meeting people" is left out, because each organisation sets its own steps.
16. **Wording no screen shows, on the board:** "Onboarding" as its heading, "Done", "Not needed",
    "Optional", "Nobody is being set up right now.", "The board did not load.", and the server's
    "The onboarding suite is not switched on." and "Only an admin or a lead can open this board."
17. **Who is a lead's team, for this board:** a new person whose directory entry names the lead as
    their manager, or shares the lead's department. That is the product's own rule for what a lead may
    read (their department), with the manager added. **My recommendation:** keep it.
18. **Nobody can ask for leave yet.** No prototype screen has a way to ask on a screen, because
    "nobody fills in a form". Until the engine takes requests (request 21), the board fills only from
    there. "How people ask", with its example chat, is left out: the chat is sample data, and it
    would promise something that does not work yet. **My recommendation:** keep it out until the
    engine can take a request.
19. **Where does a person read their own leave?** The server gives each person their own requests
    and days left, but no prototype screen shows them. **My recommendation:** a short part on their
    own You page, or answered in chat when they ask.
20. **Who approves.** When the organisation said "Their manager", it is the manager in the staff
    directory, if that manager is a lead or an admin here. Otherwise an admin approves. A lead who is
    in the same department but is not the manager reads the request and does not decide it.
    **My recommendation:** keep it.
21. **Days left are simple.** Monday to Friday counts; public holidays and part days are not known;
    everybody has the same number of days a year; unused days do not carry over. "Who else is off"
    counts only approved leave in the same department. **My recommendation:** keep it simple until an
    organisation needs more.
22. **Approve and Decline are one press each, with no undo,** as the prototype has them (audit E4).
    Declining asks for no reason. **My recommendation:** keep one press, and add an undo for a few
    seconds later.
23. **Wording no screen shows, on the leave board:** "Nothing is waiting for approval.", "Nobody is
    off in the next two weeks.", "… stands in.", the days left on every request (the prototype shows
    them on Aisha's only), "The board did not load.", and the server's "The leave suite is not
    switched on.", "Only the person who approves this request can decide it." and "This request has
    already been decided." "Aisha Otieno: Thursday 1 and Friday 2 October" keeps the prototype's
    colon, because it is the prototype's own line.
24. **Only annual leave.** It is the only kind the prototype shows. Sick leave would need its own
    privacy rules. **My recommendation:** decide those before adding any other kind.
25. **Nobody can give hours yet.** No screen has a way to, because "there is no grid to fill in".
    Until the engine takes them (request 22), the board fills only from there. "How people use it",
    with its example chat, is left out, because the chat is sample data.
26. **Where does a person read their own hours?** The server gives each person their own, week by
    week, but no prototype screen shows them. **My recommendation:** the same place as their own leave
    (item 28.19).
27. **Who says what each client agreed?** The prototype shows the agreements, but no screen for
    entering them. An admin can set them on the server (`PUT /suites/time/agreements`), and the part
    shows once there are some. "(whole trial)" cannot be said: an agreement is for the whole job or for
    each month. **My recommendation:** a short form on the board, for admins only.
28. **Which weeks show.** This week always, and any of the last 8 weeks with hours still waiting,
    headed "Hours still waiting for approval" (my words), so a week is not lost on Monday.
29. **Only an admin reads the hours against what each client agreed,** because they are the whole
    organisation's hours for that client. The prototype shows them to an admin only.
    **My recommendation:** keep it.
30. **Approve is one press, and "Approved" is a plain tag, not green,** since green means proven.
    There is no way to send hours back. **My recommendation:** add "Ask about these hours" later,
    which would go to the person in their next check-in.
31. **Wording no screen shows, on this board:** "Hours still waiting for approval", "No hours have come
    in this week.", "The board did not load.", "Approval" (read aloud as the last column's heading), and
    the server's "The time sheets suite is not switched on.", "Only the person who approves these hours
    can approve them.", "There are no hours to approve for that week.", "Only an admin can say what
    each client agreed.", "That is not one of the clients or projects on the list.", "Give a day and
    between a quarter of an hour and 24 hours for it." and "Each agreement needs a client on the list,
    the work, the hours, and whether they are for the whole job or each month."
32. **Which reviews show.** Only the ones the organisation's own system has said fall due (the same
    dates the daily reminder emails about), from 90 days ago to a year ahead. Nothing works out "every
    6 months" on its own, because nothing knows when each person's cycle started. A date for a
    probation end shows here too, because the table does not say which kind is which in a fixed way.
    **My recommendation:** let an admin add a review date on the board, and show only the kinds they
    name as performance reviews.
33. **Does the person read their manager's own words? This is a privacy question.** The prototype says
    "Aisha sees it before the meeting", and shows "What Wairimu writes" on the review. The rules say a
    participant never reads the lead's judgement. So Aisha reads the facts, her own view and the
    decision with its reasons, and not Wairimu's words. **My recommendation:** let the manager choose
    to share their words with the person before the meeting, with a clear note that they will.
34. **Nothing links the person to their own review yet,** because no prototype screen shows where they
    find it. **My recommendation:** a line on their own You page, "Your review with Wairimu is ready.",
    and the existing reminder email to the manager unchanged.
35. **Groundwork's suggestion for a review is not shown,** because a suggestion belongs to a check-in
    today. Request 23 asks the engine where it should belong. **My recommendation:** an optional link
    from a suggestion to a review, so the U.13 part is used as it is, with the person's side and appeal.
36. **There is no appeal on a review's decision yet.** The person reads the decision with its reasons
    and writes their own view. **My recommendation:** the same appeal as the U.13 suggestions, decided
    by an admin.
37. **Wording no screen shows, on reviews:** "Started.", "Decided.", "Open it" (the prototype's own
    words elsewhere), "No reviews are due yet.", "Your review, March", "What you write", "Your own
    view", "Groundwork has not written this part yet.", "… has not written anything yet.", "… has not
    written their view yet.", "The decision", "The reasons", "… sees your decision and your reasons.",
    "Save", "What you can do" (read aloud as the last column's heading), "The board did not load.",
    "The review did not load.", and the server's refusals ("You cannot open this review.", "Only the
    person who writes this review with them can do this.", "Only the person this review is about can
    write their own view.", "This review has already been started.", "Write something first." and
    "Say what you decided, and why, in a sentence or two."). The decision's own words are the U.13
    suggestions part's.
38. **Two prototype lines are left out, because they would not be true.** "Tom keeps his own history of
    his check-ins." (a person's words go after the organisation's window once they leave) and "The
    handover page gives Aisha what she needs about his customers." (there is no handover page yet; item
    22.1). **My recommendation:** bring the second back with the handover page, when you decide 22.1.
39. **Only admins mark steps done.** The owner of a step, such as Kamau for equipment, may not be an
    admin and cannot open the board. **My recommendation:** let each owner see and tick their own steps
    only, in their own Today list.
40. **How a list starts.** From a departure the product already recorded (a role ended through the
    developer API), or by an admin choosing the person and their last day. Nothing starts one by itself,
    because opening a board never changes it. **My recommendation:** keep it.
41. **Wording no screen shows, on this board:** "… left on …", "Hand over …’s work" (the prototype's
    "Hand over his customers to Aisha" names customers, which the product does not know), "Who does this"
    (read aloud), "Nobody yet", "Undo", "… has the handover of …’s role, since …", "Already left, with no
    list yet", "Start a list", "Who is leaving", "Choose somebody", "Their last day", "Start the list",
    "Nobody is leaving.", "The board did not load.", and the server's refusals ("Only an admin can open
    this board.", "The suite for when someone leaves is not switched on.", "Choose somebody in your
    organisation.", "Give their last day.", "There is already a list for that person and that day.",
    "There is no step with that name." and "The owner has to be somebody in your organisation.").
42. **"Give it an owner" is left out.** Roles and who holds them come only from the organisation's own
    systems (through the developer API), and a new holder starts the product's onboarding window and,
    when somebody hands over, its handover brief. A second place to change them would soon disagree
    with the first. **My recommendation:** let "Give it an owner" start a to-do for an admin to change
    it in their own system, or decide that Groundwork may hold roles itself, and say which wins.
43. **What the role map is built from.** A role is one of the organisation's roles, a role somebody holds
    now, or a job title in the directory; the same name with different capitals is one role. So a job
    title nobody described shows with "What it owns" empty. **My recommendation:** keep this; the role
    interview (request 25) fills them in.
44. **Wording no screen shows, on the role map:** "No roles are known yet.", "The board did not load.",
    and the server's refusals ("Only an admin can open this board." and "The role map suite is not
    switched on."). The role interview's part of the page is left out until the engine can run it.
45. **I added a first question to spending: "Which currency do people spend in?"** The prototype writes
    "KES 18,000", and nothing in the product says which currency an organisation uses. The choices are
    KES, UGX, TZS, RWF, ETB, NGN, GHS, ZAR, USD, EUR and GBP. **My recommendation:** keep the question,
    and add any currency you need to the list in `the-ten-suites.ts`.
46. **Two prototype lines on spending are left out, because they are not true yet.** "Once your
    accounting tool is connected under Connections, the real figures are shown instead." (no accounting
    tool can be connected) and "How people use it" (asking in chat is the engine's, request 26). **My
    recommendation:** bring each back when it works.
47. **What "spent so far" counts.** Requests approved this month, by the team of the person when they
    asked. A declined request counts for nothing. Budgets are set for one month at a time, by an admin.
    **My recommendation:** keep it; later, let an admin carry a budget into the next month in one step.
48. **Wording no screen shows, on spending:** "An admin can approve this.", "… so an admin must approve
    it.", "… is … over its budget this month.", "… over" in the table, "Nothing is waiting for a yes or
    no.", "No budget is set for this month.", "Set a team’s budget for this month", "Choose a team",
    "Save", "The board did not load.", and the server's refusals ("The spending suite is not switched
    on.", "Only an admin or a lead can open this board.", "Only an admin can set a budget.", "Only the
    person who approves this request can decide it.", "This request has already been decided.",
    "Choose a team from your staff directory.", "Give a budget of nothing or more.", and, for the
    engine, "Only people in this organisation can ask to spend here.", "Give an amount of more than
    nothing." and "Say what the money is for.").
49. **Is one list for each person, across check-ins, that person's "load"? This is a privacy
    question.** Decisions rule 4 keeps each person's load across check-ins private unless they share it.
    The to-dos board serves each line only to somebody who may already read it in its check-in, so it
    shows nothing new line by line; but it puts them together for each person, as the prototype draws
    it. **My recommendation:** decide that what somebody said they will do is not their load (their load
    is what others ask of them, as the You page has it), and keep the board. If you decide otherwise, the
    server can serve it one check-in at a time instead.
50. **To-dos from chat are not on the board.** The prototype says "from every check-in and chat" and
    shows "Remind me to call Lakeside’s buyer on Tuesday." adding to the list. The product keeps those
    as a note to yourself that nobody else reads, and says so in its own rules. I kept that, and the
    board's sentence says "in their check-ins" instead. **My recommendation:** keep chat to-dos private,
    or let the person choose to share one when they add it.
51. **"Done" is left out on the to-dos board.** Whether somebody did what they said is asked in their
    next check-in and counts in that check-in's record, so an admin or a lead ticking it on a board would
    change the record from outside the check-in. "How people use it" is left out too (request 27).
    **My recommendation:** keep it read-only; the person marks it done in their check-in.
52. **"From her check-in" reads "From a check-in",** because the product does not know anybody's
    pronouns. Lines the lead added from pasted notes read the same. **My recommendation:** keep it.
53. **Wording no screen shows, on to-dos:** "Nobody has anything on their list yet.", "The board did not
    load.", and the server's refusals ("The to-dos suite is not switched on." and "Only an admin or a
    lead can open this board.").
54. **Where "customers and deals" come from.** Only from the organisation's own system, as today (the
    developer API's subjects). An organisation with no system connected has an empty list, whatever its
    sales check-ins say, because the product's rule is that Groundwork does not make up a customer
    record. **My recommendation:** decide whether the engine may add a customer it hears about in a
    sales check-in, once the person confirms it.
55. **Nothing can be changed on the customers board,** so "Changing something here tells the person who
    owns the customer, in their next check-in." is left out. A customer is the organisation's own record,
    never edited here. **My recommendation:** keep it read-only until you decide 28.54.
56. **A lead reads only the customers their team owns.** The prototype says "for the whole company".
    I followed the rule that a lead reads only their own team. **My recommendation:** keep it, or let
    every lead read the whole list, because a customer is not a person's work.
57. **Wording no screen shows, on customers:** "No customers are known yet.", "The board did not load.",
    and the server's refusals ("The customers and deals suite is not switched on." and "Only an admin or
    a lead can open this board."). A blank cell where nothing says where a customer stands, who owns it
    or when they were last contacted.
58. **"Book a repair" is left out.** Nothing yet tells anybody about a repair (no email, no to-do for the
    person who looks after equipment), and a button that seems to book one and does not would be worse
    than none. **My recommendation:** let it add a line to the equipment keeper's Today list ("Laptop 03
    needs a repair."), which the Today page can show without any new message being sent.
59. **Equipment and "when someone leaves" are not linked yet.** "Collect Tom’s laptop and phone" does not
    list the items Tom has. **My recommendation:** list them under that step, from this board, for
    admins only.
60. **Wording no screen shows, on equipment:** "Change", "Save", "Cancel", "Nobody", "Add an item",
    "Item", "Add it", "No equipment is listed yet.", "The board did not load.", and the server's refusals
    ("The equipment suite is not switched on.", "Only an admin can open this board.", "That item was not
    found.", "Give the item a name.", "There is already an item with that name.", "Choose somebody in
    your staff directory, or nobody.", and, for the engine, "Only people in this organisation can update
    equipment here.").

### 29. Connections (U.18): what needs you

1. **WhatsApp is mentioned only while it is switched on, as you decided.** On Connections, the
   WhatsApp section shows only while WhatsApp is on in Groundwork, or while the organisation has a
   number of its own (so an admin who switched their own number off can still switch it back on).
   That means an admin cannot find the way to connect their own number while Groundwork's WhatsApp is
   off. The page `#/settings/whatsapp` still works if they type its address, as the old Connect page
   always offered it, but nothing links to it. **My recommendation:** decide whether an admin may
   connect their own number while Groundwork's WhatsApp is off. If yes, always show admins the
   WhatsApp section, with "Not set up" and "Set it up".
2. **"Your own address" shows only that it is not set up,** because you decided it comes later. It
   reads "Your own address", "Not set up", and "Put Groundwork at an address on your own domain.
   Invitations, reminders and sign-in links then use it.", with nothing to press. I took out the
   prototype's example address (checkins.baridi.co.ke), which is sample data. The welcome card's door
   still says "Your numbers, your own address" (item 16.1). **My recommendation:** keep both until the
   address is built, or take the section out and change the door to "Your numbers".
3. **Left out, because nothing real stands behind them** (not-to-build.md rules out pretend ones):
   - "Paystack, Flutterwave or M-Pesa" and "A weekly spreadsheet". There is no such connection.
   - The line under "Your numbers": "Totals only: no customer’s personal details come into
     Groundwork. Each number is matched once to a target, in Context." Nothing enforces it: the
     figures the developer API takes may carry a short label, such as a customer's name.
   - "Hand it to your developer, or to Claude Code", with a link that expires in 7 days and
     instructions for Claude Code. No such link exists.
   - On the tools page, "Add your own" (a field, a board or a suite added by an admin). Nothing like
     it exists.
   - On the tools page, "Build your own screens". Its sentence "It starts with reading and chat;
     changing things comes later." is not true: the developer API can already change things.
   - The end of the tools page's first sentence, "unless you choose an event that carries it". No
     event carries what anyone said, so the page now says "nothing sends what anyone said in a
     check-in."
   **My recommendation:** build Paystack and the spreadsheet as real connections when you want
   them, and decide whether figures should be totals only; the rest can wait.
4. **"How long conversations are kept" is a different rule from the product's.** The prototype says
   "Word-for-word check-ins. Kept for [n] days, then deleted. The history and the reports built from
   it stay." The product deletes a person's own words only after they leave, after a number of days
   the admin sets ("When somebody leaves"). I kept the product's section as it is. **My
   recommendation:** decide whether everyone's words should be deleted after a time, not only a
   leaver's. This is a privacy question.
5. **The tools page keeps the product's keys and calls, not the prototype's examples.** The
   prototype shows "Create a key", keys described as "Can send figures", "API access approved on 12
   September, for … Terms accepted by Grace Achieng.", and an example request to
   `POST /v1/figures`. The product names each key, lets the admin tick what it may do, and sends
   figures to `PUT /api/org/v1/evidence` and `PUT /api/org/v1/metrics`. The developer API must keep
   working exactly as now, so I renamed only the sections. **My recommendation:** leave the API as it
   is, and later show who accepted the terms and when, if the server records it.
6. **Notices in Slack or Teams no longer ask for a channel name,** because the prototype has only the
   address. Whether it is Slack or Teams is read from the address (Slack's all start
   `https://hooks.slack.com/`). A name already saved is still shown. The buttons on a connected
   channel keep today's words: "Post a test", "Switch on" or "Switch off", and "Remove".
7. **"What these look like" shows the product's own pictures,** not the prototype's drawn Baridi
   samples: "On WhatsApp" (only while WhatsApp is on) and "Inside your own tool".
8. **The three WhatsApp counts, as the server counts them.** "People checking in on WhatsApp" is each
   number that has been put through to a check-in; "check-ins this month" is each check-in a message
   was sent for on the organisation's own number since the first of the month; "failed messages this
   week" is messages on its own number that did not go, in the last seven days. Counts only, for
   admins only. **My recommendation:** say if you meant something else by any of them.
9. **Team chat is not built.** `docs/modules.md` lists it as planned: Groundwork inside a WhatsApp
   group, Slack or Teams, answering questions and posting the shared report. It needs your decision
   first (what it may post, and to whom), and then the engine. **My recommendation:** decide it with
   the rule that nothing private is ever posted in a group.
10. **Wording no screen shows, which I wrote with the fewest words:** "Switched off" (a WhatsApp
    number or a channel that is off); "Needs a key" on "Accounting or sales tools"; "Usage numbers,
    sent by your own product." (the prototype's "Usage, sent every morning. For example, MarketView’s
    weekly users." promises a time and uses sample data); "Approved" and "Waiting for an answer" beside
    "Figures from your other systems"; the singular counts ("person checking in on WhatsApp", "check-in
    this month", "failed message this week"); "Connections did not load."; on the WhatsApp page, "The
    number, as people will see it (optional)" and "WhatsApp Business Account id (optional)" (today's
    words), "Connect" or "Save", "Send a test message", "Save what Meta approved", "Switch on" or
    "Switch off", and "Whoever sets up a check-in chooses whether people answer it here or on
    WhatsApp."; and for anybody but an admin, today's "Only an admin in your organisation can set this
    up. Ask whoever manages Groundwork for your organisation." The organisation's name is written with
    "’s", so "Baridi Appliances’s WhatsApp Business number".






### 30. Billing (U.19): what needs you

1. **What happens when you turn on the one switch.** You decided that the free trial's setting
   (`pricing.freeTrial`) is one switch for the trial and the free plan. It is **off**, and while it is
   off billing is exactly as today. Nothing has been switched on. When you turn it on, the server
   writes down the moment, and this is what happens:
   - **Organisations that already exist keep everything they have on the free plan.** That is: up to
     10 free check-ins (the ones they have already opened count), unlimited sessions and reports in
     each free check-in, up to 5 people including the person who created the account, the one free
     extension, and the one session in hand that every check-in starts with. Nobody is removed and no
     check-in stops.
   - **At their limits they read exactly what they read today.** The eleventh check-in is refused with
     "Your free plan includes 10 check-ins. Subscribe to open more.", and the sixth person with "The
     free plan covers 5 people, including you, so you can invite 4 others. Subscribe to add more
     people."
   - **A new organisation that says it has fewer than 20 people** gets 3 months on Small Team (up to
     20 people, unlimited check-ins), with no card and no charge. Past 19 people, the trial carries on
     to its end date, as the prototype says; the twenty-first person is refused, because Small Team
     holds 20.
   - **A new organisation of 20 or more** gets no trial and no free plan. It cannot open a check-in
     or add anybody until an admin chooses a plan. It reads "Your organisation has no plan yet.
     Choose one on Plan and billing to open a check-in." (or "... to add people.").
   - **When a new organisation's trial ends,** it has no plan. Nothing is charged until an admin
     chooses one. Its check-ins pause, and the people in them read "This check-in is paused until your
     team subscribes. Only an admin can do that, and your answers so far are kept." Reports and boards
     stay readable. Check-ins opened during the trial start with no free session, so there is nothing
     free left to run.
   - **Anything the server cannot be sure of keeps the free plan:** a switch turned on with no record
     of when, or an organisation with no creation date.
   **My recommendation:** keep existing free organisations as they are when you switch on, then decide
   separately whether to give them a date by which they choose a plan, and tell them first.
2. **One trial for each organisation, or for each person?** The trial is given once to each
   organisation. You decided a person can create more than one organisation, so one person could
   start several trials. **My recommendation:** one trial for each person who creates an organisation.
3. **There is no screen to turn the switch on.** Groundwork's staff can turn it on with
   `PATCH /admin/pricing/free-trial` (`{ "on": true }`), which is staff only. **My recommendation:**
   put the switch in Groundwork's own console (U.21), with a sentence saying what it changes.
4. **The five published plans are already the ones in the database.** Starter $25 a month for up to
   5 people, Small Team $90 for up to 20, Growth $400 for up to 100, Business $900 for up to 250,
   Scale $1,650 for up to 500. The existing migrations already leave exactly these, so I added no
   migration (which would also have thrown away the Stripe prices already made), only a test that
   replays the migrations and checks. Enterprise stays as "Contact us", with no price. No screen types
   a price: every one reads `GET /billing/pricing`, with the shipped numbers only while it loads.
5. **What counts as a seat.** Seats were counted by the organisation a person last switched to. They
   are now counted from the memberships: everybody who belongs to the organisation as an admin, a lead
   or somebody who takes part, and not guests from outside. Deactivated people and people still
   waiting to be let in do not count, as before. So a member who was looking at another company is
   counted again, and a guest who had switched in is not. The People page says "Guests from outside
   don't count toward the plan." when the list has guests. Groundwork's own console still counts the
   old way (for U.21), and so does one engine list (request 30(c)).
6. **"Guests from outside don't."** The prototype says "Guests with no account don't", but in the
   product a guest has an account and still does not count. So Plan and billing says "Every person
   with a Groundwork account at Baridi Appliances. Guests from outside don’t."
7. **Invoices.** Each paid invoice reads, for example, "1 September" and "$400, paid." The prototype
   adds "by card ending 4417", but the card used for an old invoice is not stored, so I left it out.
   There is no "Download" beside each one; "Invoices and payment method" opens Stripe's own page,
   where each invoice can be downloaded.
8. **After Stripe's checkout.** The paid page says "Done. Baridi Appliances is on Growth." and "All 27
   people can check in.", without "A receipt is on its way to ...", because whether Stripe sends one
   is Stripe's setting. When somebody comes back without paying, it says "The payment didn’t go
   through" and "You haven’t been charged, and your plan hasn’t changed.", without "Your bank
   declined it": Stripe refuses a declined card on its own page, so coming back means only that
   nothing was paid.
9. **Left out, because nothing real stands behind them yet:** the prototype's in-page card form (the
   product uses Stripe's checkout page, which is safer and already works); "Share Groundwork with
   another organisation" with "Make a new code" (only Groundwork's staff can make codes; the page
   keeps "Access codes"); the pricing page's "Run it yourself, or with support" with $700, $500 and
   $3,500, which are not in the database; the common questions, because the prototype's text has no
   answers; "Baridi started with 27, so it began on a plan." and the link to the free months ending;
   and, from the page about the free months ending, the card for everybody else with "Remind them",
   the access code card, and an email to the admin 7 days before. The admin sees the 7-day notice on
   Plan and billing only. **My recommendation:** the email 7 days before, when you switch the trial on.
10. **Wording no screen shows, which I wrote with the fewest words:** "The free plan, for up to 10
    check-ins. 3 of 5 people, including you."; "Small Team, free until 27 December 2026. 12 of 20
    people."; "No plan yet. Choose one below to open check-ins and add people."; "Nothing is charged
    until you choose a plan."; "None while it is paused. Nothing is charged until you resume."; "No
    more payments. Your plan ends on 30 September 2026."; "It renews on its own each month."; "So
    far" with "38 check-ins, 12 reports shared, and 25 people taking part."; "No plan yet" as a
    heading when starting a check-in; "Choose Small Team"; "You can check in." (for one person); and
    "Guests from outside don’t count toward the plan."
11. **Removed, because they were not true:** on the pricing page, "Why we price this way" ("no trial
    that expires" becomes false once the trial is on, and "No proration surprises" is false, because
    changing plan is prorated) and its closing quote; on Plan and billing, the "Billing" list that
    said you can "choose between buying sessions or subscribing" (sessions are not sold).
12. **Two engine sentences.** The engine passes billing's refusal through, so a paused check-in reads
    billing's words. But in one rare race it still says "beyond your ten free check-ins", and the
    emails about the free plan still say "ten free check-ins". Neither is reached while the switch is
    off. I asked the engine about its sentence (request 30(a)). The emails are for later.
13. **The scenario runner and the switch.** The 24-scenario runner creates new organisations and
    relies on the free plan. While the switch is off nothing changes. If it were turned on in the
    database the runner uses, every scenario would be refused, so I asked the engine workspace to
    cover its organisations (request 30(b)). **Please keep the switch off wherever the scorer runs.**


### How this workspace runs now, since 26 September (your rule, because the Mac froze)

- One helper at a time: builder, tester or reviewer, never several together.
- While working, only the tests for the files that changed.
- The full API and screen suites once at the end of each module, one after the other, with at most
  2 test workers (`--maxWorkers=2`).
- The local API and screens servers only while a screen is being checked, then stopped.
- **Broken once, on 27 September:** while building U.15, a command meant to run a few screen tests
  ran the whole screen suite by mistake (a search pattern in the shell came out empty). It passed, and
  nothing else was running at the time.

### 13. U.3: wording the prototype does not have, and one line changed

`docs/prototype/screens` shows no wording for these moments, so the builder wrote the fewest words it
could. Please read them. **My recommendation:** keep them unless you want different words.
- After "Turn them back on": "Your reminders for … are back on." After "Stop all email from Groundwork
  instead": "Done. No more email from Groundwork." with "Only what you ask for yourself still comes,
  such as a sign-in link."
- On the People page, under the organisation's invite link: "Anyone with this link can join as
  "Takes part". Turning it off closes it at once." and "The link is off. Turning it on makes a new
  link, so any old one stays closed."
- A closed invite link: "This invite link is not open any more" and "Ask whoever sent it for the new
  one."
- After asking for more time: "Hafsah has your request."

**One prototype line was changed.** The invitation's "Wairimu shares a team report each evening." now
reads "Hafsah shares a team report with everyone in it.", because not every check-in shares a report
each evening. **My recommendation:** say "each evening" (or the real schedule) only where it is true,
from the check-in's own settings.

**One line may clash with your answer 4.** The organisation's invite link page says "Sahar Ali invited
you to Coamana", as the prototype does ("Wairimu Kamau invited you to Baridi Appliances"). It names
the admin who shared the link before the person has accepted a real invitation. **My recommendation:**
keep it, because the person who shared the link chose to be named on it. But it is your call, since
you said an admin is named only after a real invitation.

**Still to confirm:** the invitation's "You see your own report straight away." and "About two
minutes." come from the prototype, and the builder could not check that they are always true.

**Found in the U.3 review, left as you decided, for you to look at.** The new admin's welcome card
uses the prototype's wording, as you decided, so its door descriptions stay as the prototype's code
has them: "Invite people, set roles and teams, let guests in", "Your numbers, your own address" and
"Seats, the card and invoices". They are clipped phrases, not sentences, and "your own address"
promises something that is not built (item 16, point 1). **My recommendation:** full sentences, for
example "Invite people, choose what each can do, and let guests in." Tell me if you want them changed.

**Wording written in the U.3 review fixes, where no screen has any:**
- The invitation, with no end date: "A check-in at Coamana."; with no organisation: "It runs until 30
  September."
- "Your name is optional. If you add it, the others will see it on the shared report." and "You never
  have to take part. If you would rather not, you can close this page. Nothing is shared, and saying
  no is never held against you."
- The sidebar's reason: "You are in Coamana because anyone with an @coamana.com email can join it."
  and "You are in Coamana because you joined through its invite link."
- "An admin has let you in. You can open your check-ins now."
- "You are in. You have no check-ins yet. When someone adds you to one, you will see it here." and
  "Open one to take part." (was "Open one to start contributing.").
- "That invite link is not open any more. Ask whoever sent it for the new one." on "Where do you
  work?" when the link someone signed up from was turned off before they confirmed their email.

### Decisions I made on my own

- **The fonts are hosted inside the app,** not loaded from Google each time a page opens. That way
  no one's browser tells Google which pages they open. It needs one small package, `@fontsource`.
- **The full API test suite takes about 49 minutes here.** For changes that only touch the screens,
  I run the screens' tests, type check and build on every change, and the full API suite at the end
  of each task. For any change to `api/`, I run the full API suite on the change itself.

## Phase 0. Get ready

### 0.1 Check it is safe: done

- The branch is `wip/prototype-ui`.
- There are no live keys on this computer. Stripe, Google sign-in and WhatsApp are empty in
  `api/.env`, and the email key is the fake value `re_test`.
- Emails do not really send. `EMAIL_SENDS_FOR_REAL=false`, and the API's log says "No mail leaves
  this deployment".
- The database is `groundwork_dev`, a PostgreSQL database on this computer only. It is not shared
  with the other computer.

### 0.2 Stay in step: done

- I fetched from `mine` and merged `mine/wip/plain-reports`. It was already up to date.
- The deploy check: I read all six workflows in `.github/workflows/`. None of them runs when a
  `wip/` branch is pushed. They run on pull requests, on pushes to `main` or `staging`, or only when
  started by hand. The one deploy setting, `api/railway.toml`, belongs to Abubakar's repository.
  `mine` is a separate private copy, so a push there cannot deploy anything.
- `docs/morning-report.md` is back exactly as it is on `wip/plain-reports`. The one item I had added
  to it is now item 1 above.

### 0.3 Read the answers: nothing to read yet

The engine workspace's file `docs/answers-from-engine.md` does not exist on `wip/plain-reports` yet,
and its copy of `docs/requests-to-engine.md` has no answers in it.

## Phase U. The prototype's screens and the suites

### U.1 Look and layout: done

The builder split U.1 into 13 small changes. Done so far:

1. **The page is cream, not grey, and the app always opens in light mode** (commit `c337df62`).
   Every page now sits on the prototype's cream colour, and lines are warm instead of grey. Even
   with the phone or computer set to dark mode, the app opens light. One test changed: the test
   that checks every text colour is readable used to have the old grey typed in, so it now reads
   the colours from the stylesheet. Nothing was loosened: every text colour must still reach
   4.5 to 1. All tests pass, apart from the email key bug in item 1 above.

2. **Cream fills inside cards, and warm brown secondary text** (commit `10953c64`). The prototype's
   fainter text colour, `#85705A`, is not readable enough on its own cream fill (4.18 to 1, where
   4.5 is needed). So I used `#7D6A55`, the same brown made only as dark as it needs to be to pass.
3. **The two typefaces** (commit `8b57a773`). Everything is in Atkinson Hyperlegible, and body text
   is 16 instead of 13. Names and big numbers are in Literata. Both come from the app itself, not
   from Google. Nothing scrolls sideways at a phone's width.
4. **The buttons, tags and "What needs you" rows** (commit `a2b6cddc`). They are built and tested,
   and they appear on the page as the sidebar and Today are built.
5. **The four marks and the stage ladder** (commit `4a9763a1`). A mark shows only when the record
   has one. With no mark, or with a value the screen does not know, nothing is drawn, so nobody sees
   a proof that was never checked. The engine does not send marks yet, so I asked for them
   (request 2 in `docs/requests-to-engine.md`).

6. **The light sidebar** (commit `84298e9a`). It has the organisation card and menu, "+ Start a
   check-in", the check-ins with a dot and a badge each, "Closed" folding out, and your name at the
   bottom with "Settings, help, sign out". Nothing was lost. Every page the old dark rail gave
   someone is still there for them: Boards under the check-ins; People, Connections and Plan and
   billing under the organisation's name, for admins; your settings, help, feedback, and Platform
   ops for staff, in your own menu.
7. **A folded sidebar stays folded** the next time you open the app (commit `4286316f`).
8. **Pinning a check-in** to the top of the sidebar (commit `3ace4c34`). See item 6 above.

**The first review sent it back.** The reviewer signed in as Sahar, Hafsah and Abubakar, at a
computer's width and a phone's. A lead or admin could not pin, because the rename pencil's tap area
covered the pin. The hover text on each check-in read in clipped pieces ("2 of 12 sessions done. 1
open."), and its count did not match the card beside it. Pinning your only check-in left an empty
heading. All three are fixed (commits `f56ece5e`, `c7f8f1b6`, `e9dbf0d5`). The hover text now reads,
for example, "Coamana growth, Q3 paying customers. Session 2 of 12 is ready for you, and one thing is
still open." While fixing the count, the builder found that the admin's "waiting" count looked at a
session that had not opened yet, and fixed that too.

9. **The phone's bottom bar and the "More" page** (commit `cf8164e8`). The bar has Check-ins, Start
   (only for people who may start a check-in) and More. Today and Chat wait until those pages exist.
   "More" gives everything the old phone bar gave each person, plus two things phones never had:
   switching organisation and signing out.
10. **"Jump to", with Ctrl K** (commit `901ed626`). It finds a check-in, a person or a page. It only
    offers what the reader can already see. People are offered only from the reader's own check-ins,
    because the backend has no list of people limited by what each reader may see.
11. **Help and "Talk to us" from anywhere** (commit `a355300f`), in your own menu and on "More". The
    floating "?" button is gone where the sidebar is, because the menu now does the same job.
12. **A short guided tour** (commit `41b999b5`), **taken out again** (commit `336b4f94`). Its
    wording was ours, and the prototype has no tour to copy from. See item 8 above: this waits for
    you.

**The final review sent it back twice more, for small things, and both are fixed.**
- At a computer's width, the lead's check-in name broke in the middle of words ("Coaman / a /
  growth"), because the pin, the pencil and the "Your turn" tag left it too little room. Now the pin
  and pencil only appear when the mouse is on the row, and they take the tag's place, so the name
  reads in whole words ("Coamana growth, / Q3 paying / customers") and never moves (commits
  `13084c6c`, `25611349`).
- The sidebar said "Nothing in progress yet." for a moment while the list was still loading. Now it
  waits. If the list fails to load, it says "Your check-ins did not load. Reload the page to try
  again." (commit `a64e7164`).
- On a phone, the feedback panel was cut off on the left, including its "Cancel" button. An old,
  unused style rule from an earlier feedback widget was still pushing it (commit `94f26553`). The
  floating Feedback button no longer covers the "More" page (commit `a460fd1c`).

**U.1 is ticked.** The tester passed it: all 2411 screen tests and the build, and the full API
suite, apart from the known email key failure and two slow tests that pass on their own. Each fix
after that passed the screen tests again. The reviewer passed it as Sahar, Hafsah, Adam and Kavon,
at a computer's width and a phone's. The 24 scenarios could not be run (item 3).

**Still open in U.1:** nothing of U.1's own. You chose no tour (item 8). The sidebar links to Today,
Company, You and Suites come with those pages, in U.5, U.12, U.15 and U.17.

### U.2 Accounts and signing in: done

Nine things here wait for your decision (item 10 above). Until you decide, each keeps what the
product does today. Done so far, on the screens only:

1. **The parts every account screen is built from** (commit `1679086b`): the white card on the cream
   page, the password box with "Show", and the password rules, ticked as each is met.
2. **A real bug fixed: "Send another link" never worked** (commit `be63e930`). For someone who
   already had an account, every resend said "That link did not send". For someone still signing
   up, it replaced the name they had typed with one guessed from their email address, and wiped the
   organisation they had typed. Now it sends again the same way as the first link.
3. **The sign-in screen**, as in the prototype (commit `c1b9d61f`): "Use your password, or we'll email
   you a link that signs you in.", with the dark panel "Short check-ins, and proof of what actually
   moved." It now has "Email me a sign-in link instead". Before, a person with no password had no
   visible way to ask for a link.
4. **"Check your email"** (commit `988bdc33`): "We sent a sign-in link to … Open it on any device."
   and "Send it again". The list that promised a password step is gone.
5. **"Forgot your password?"** (commit `5582d25e`). The page used to be headed "Sign in". It says the
   link works for an hour, which is true, until you decide (decision 5).
6. **"Google sign-in didn't finish"** (commit `8ac050cd`), one page for both ways a Google sign-in can
   fail.
7. **"You're signed out"** (commit `fc5700e2`). Every sign-out button now goes there. On the way, the
   builder found that signing out from "More" on a phone could sign the person straight back out
   after they signed in again. That is fixed.

8. **The reset page** (commit `03c7288f`): "Choose a new password", "Once it's saved, you're signed out
   everywhere else.", with the rules ticked as you type.
9. **"Choose a password"** (commit `ae23b026`), with a bar made only of the rules the server really
   checks, and "Strong enough" once every rule is met. No score is invented.
10. **"That link has expired"** (commit `d793ff7e`), with "Send me a fresh link". An old reset link is
    replaced by a reset link, so nobody is let in without choosing a password.
11. **"Your email is confirmed"** (commit `46b92a91`), shown once, when a link has just made the
    account.

12. **An old link says so as the page opens** (commits `b12c31fa`, `9c1edde0`). A reset or "choose a
    password" link that has run out now opens straight on "That link has expired", before anything
    is typed. Also, opening "You're signed out" after a session had already lapsed no longer shows the
    "you had been away" message instead.
13. **The server says when a link has just made the account** (commit `3aa13097`), so "Your email is
    confirmed" appears exactly then. Checked with a real new sign-up: "Your email is confirmed", the
    address, then "Continue", which led to "Choose a password".
14. **Every way back from Google lands on "Google sign-in didn't finish"** (commit `b558eac9`). Before,
    pressing Cancel at Google left the person on a bare page from our server reading "Unauthorized".
    One API test had been failing unseen since step 6, because only the screens' tests had been run on
    that step. It is fixed. From now on, the full API suite runs at the end of every task.

**The first review sent it back**, for four things a person read wrongly: the sign-up said "No
password to choose" and then asked for one; "You're signed out" was followed by the fragment "On this
device."; the wrong-password answer joined two pieces with a dash; and used or unknown links still got
the old error page. All four are fixed (commits `84e7a04a`, `f0949752`, `7b5e83d1`, `7e5711d3`), with
three smaller ones and a server error when a link had no token (`4e09a0f6`). Two security fixes came
out of the same review: forgot-password now answers every address exactly the same (`2ce55140`), and a
new reset link stops the older ones working (`b06907aa`).

**Then your decisions were built:** the Google failure page in full sentences, saying what to do next
(`bb777d97`); the prototype's password rules on the screen and on the server (`94cc837d`); sign-up
with an email link or a password, and no forced password step after a link (`70a561d9`); the
organisation's name suggested from the email address (`90431cea`); and the free trial as a setting in
the database, switched off until billing gives it (`bacdb6cf`).

**The second review passed every earlier finding and every decision of yours**, checked with two real
sign-ups: one choosing a password, one choosing the email link. The link one was offered "Choose a
password" with "Keep using email links instead", and was never forced. "hafsah@coamana.com" suggested
"Coamana", and gmail.com suggested nothing. The server refuses a password equal to the address, even in
capital letters. The free-trial sentence appears nowhere.

**It found one leak, older than U.2, and it is being fixed.** The sign-up form now uses a route whose
reply carried an extra item, a draft token, only for addresses with no account. The screen looked the
same either way, but the reply itself told an outsider which addresses have accounts. That breaks your
rule that the door gives one answer, so the reply is being made the same for every address.

**Fixed** (commit `363ee431`): every address now gets the same fields back. The draft route also answers
a made-up token the same as a real one, so the tell cannot move there. Nothing is ever written to an
existing account. This touched `api/src/modules/entry/entry.service.ts`, the draft storage for the
entry chat. It is not engine code, but the engine workspace changed the same file recently, so I will
watch it at the next merge. Three small fixes came with it: "Confirming your email…" instead of
"Setting up your check-in…" when no check-in is being set up (`00ca8ebe`); a replaced reset link says
so as the page opens (`b48f5d1c`); and a refused password reads as one plain sentence, "Your password
needs a number or a symbol." (`4a075e94`). That last one changed the shared error filter, narrowly:
messages already written as full sentences are passed on as they are.

The tester had also found a failing test that one of the new tests caused, by reading the code's text
with its comments. It now signs in for real instead (`f5c36f39`). Both full suites pass: 9,097 API
tests and 2,524 screen tests.

**U.2 is ticked.** The final review passed: every address gets the same answer from the server, a
replaced reset link says so as it opens, and both kinds of sign-up work from start to finish. With a
password, the person goes straight in. With the link, they are offered "Choose a password" and can
choose "Keep using email links instead".

### U.3 Organisations and joining: built and tested, not yet reviewed

All of U.3 is built, in 20 commits, apart from the two held parts (item 11, conflicts A and B), which
keep today's behaviour. What each person now reads:

- **"Create an organisation"**, word for word from the prototype, on the white card. You can now own
  more than one organisation, each with its own plan. The size question ("How many people will use
  it?") only appears while the free-trial setting is on, because nothing uses the answer yet.
- **"Choose an organisation"**: "You're in 2. You can switch at any time from the top of the sidebar."
  It opens once after signing in for anyone in two or more. Only a row on this page switches, so a
  stray click in the menu never does. The sidebar now says "You are in Coamana because your email
  address was on its list of people."
- **Only admins can change the organisation.** A member or a guest could rename it through their own
  profile before. Now only the admin route can, and a test proves a member, a lead and a guest are
  refused.
- **The round "?" button is gone everywhere**, with nothing in its place. Help is in each person's own
  menu and on "More".
- **Invitations last 14 days.** An expired one reads "This link has expired", "Invitation links last
  14 days. You don't need a new invitation, just a fresh link.", with "Send me a fresh link". The same
  answer is given for an address that was never invited, and nothing is sent to it.
- **The invitation page** follows the prototype, except the held sentences, and keeps today's panel.
- **"Almost in"**: "You're from outside Coamana, so an admin there has to let you in. We've asked Sahar
  Ali." with "Remind Sahar", once a day, enforced on the server. A name appears only after a real
  invitation. Left out of the prototype's wording: "and text", because there are no text messages,
  and "Usually within a day", because nothing knows how fast admins answer.
- **Stopping reminders from an email**: "Done. No more reminders for …", with "Turn them back on" and
  "Stop all email from Groundwork instead".
- **"This check-in reached its end date"**, with "Ask Hafsah for more time", once a day. The lead gets
  one button to extend it.
- **The new admin's welcome card and "Get … going"**, with "Connect WhatsApp (optional)" only while
  WhatsApp is on. Nothing else mentions WhatsApp while it is off.
- **Joining by email domain**: the admin switch "Anyone with an @coamana.com email" on the People page,
  and "Where do you work?" after sign-in. It only works for a confirmed address, never for public
  mail, and never for a domain another organisation already uses. People join as "Takes part".
- **The organisation's invite link**, for example `/j/coamana-6rr7`, joining as "Takes part". Turning
  it off closes it, and turning it on makes a new one.

**Tested:** the first full run found three failures from U.3, all fixed. The "Got it" button on the
welcome card now says when saving failed: "That did not go through, and nothing has changed. Try
again." Three new pages now use the shared date format. The waiting-for-an-admin check was moved to
the new "Almost in" page. While fixing that, the builder closed an older gap: someone still waiting
who reopened their invitation was sent into a check-in that then refused them, and now they land on
"Almost in". The second full run passed everything: 2,589 screen tests, 9,234 API tests, and the build.

**Not reviewed:** the reviewer could not sign in as anyone (item 14), so U.3 is not ticked. When a
review can run, it should also confirm that the rewritten waiting check really proves a person who is
still waiting never reaches the check-in. Two older copies of the dashed sentence "That did not go
through. Nothing has changed - try again." remain, on the People page (fixed in U.4) and in "What you
are carrying forward".

**The first real review, on 27 September, sent U.3 back.** The reviewer signed up its own
`@example.test` accounts through the browser, as you decided, and nothing was refused. It found:
joining by email domain or by the organisation's invite link also made the person admin of a new,
empty organisation, named from their email address; the invite link lost its place once the person
confirmed their email; the sidebar called people "Member" where the People page says "Takes part";
the sentence "because your email address was on its list of people" was false for people who joined
by domain or link; and the invitation page had a fragment ("Coamana.") and two sentences joined by
dashes. The server's privacy rules all held: a member was refused every change to the organisation,
the fresh-link reply was the same for every address, and outsiders saw no head count. These are being
fixed now, then the review runs again.

**The second review sent it back again, for one real crash,** which is exactly why the live review
matters: every test had passed, but joining an organisation when you confirm your email crashed each
time against the real database. The database already adds a person's membership whenever their
account is made, and the new code added a second one. Everything else passed live, including the
security fix: a password chosen at sign-up worked in the same browser, and was refused when the
confirmation was opened elsewhere, with the person offered "Choose a password" and nothing saying a
password had been chosen. The crash is being fixed now, with a test that includes the database's own
behaviour.

**The third review passed U.3**, checked live against the real database with fresh accounts: from an
invite link, the person lands in the organisation as "Takes part", with "You are in Kisima Test Works
because you joined through its invite link."; by email domain, "Join" puts them in with "…because
anyone with an @example.test email can join it."; "Create" lands them on Today as admin of their own
new workspace; and a plain sign-up still makes their own organisation. **U.3 is ticked.** Not seen live,
because they need a running check-in: "Almost in", "Out of time", and the expired invitation card. They
are covered by tests. Two small notes go to U.20 (small states and errors): a workspace name made from
a first name uses a straight apostrophe ("Faith Domainfour's workspace") where the rest of the page uses
a curly one, and when the invite link page cannot load it says "This invite link is not open any more",
which looks like a closed link to someone on a bad connection.

#### U.3 review fixes (27 September)

One commit for each finding, with tests of what a person reads and what the server does. Only the
tests for the files changed were run, with the type check; the full run is the tester's.

1. **Joining by invite link or by email domain makes no organisation** (`214ec5ff`). On the server,
   when the email is confirmed:
   - From an organisation's invite link that is still open and has a seat: they join it as "Takes
     part" and go to Today. No organisation of their own is made, even if a name was typed.
   - With an address whose domain an organisation lets join, or from a link that has since been
     turned off or is full: nothing is made yet. The confirmation shows "Where do you work?", the
     same card as `/welcome`, with "Join" for the organisation that was offered and "Create a new
     organisation". The server only lets them join an organisation it offered.
   - **Left empty, with no link and no domain match (today's behaviour, kept):** the person gets
     their own organisation named "<first name>'s workspace", for example "Ama's workspace", and is
     its admin. With a name typed, it is called that. "Create a new organisation" on "Where do you
     work?" does the same, with the name they typed at sign-up if they typed one.
   - The sign-up reached from `/j/…` no longer shows "Your organisation (optional)" or suggests a
     name, and sends none.
   - **Google now does the same** (`d150c898`). The invite link rides to Google and back, and only a
     path inside the app is kept. From an invite link, or with a matching domain, nothing is made:
     the person lands on the same confirmation page, which joins an open link or asks "Where do you
     work?". Their account signs in with Google and never asks for a password. A plain Google sign-up
     is as before. Anything an earlier, unconfirmed sign-up for the same address left behind (a
     password, a draft, a name) is not kept.
   - **The cards are in the natural order** (`ea021ecd`): "Your email is confirmed" first, then "Where
     do you work?", and it is never said twice. Someone who came from Google skips the first card,
     because they confirmed no email.
   - **A security fix that keeps your decision** (`0bb3fe7d`). Before, someone could sign up with
     another person's email address and a password of their own. When the owner opened the
     confirmation email, the account was made with the stranger's password. This was so before U.3
     too. You decided that a password may be chosen at sign-up, and that still holds: the password
     now works only when the confirmation is opened in the same browser that signed up. That browser
     keeps a secret key, and only a hash of it is kept on the server. Opened anywhere else, the
     password is thrown away, the account is made without it, and the person chooses a password
     afterwards, exactly as after a sign-up by link. Nothing on screen or in any answer says a
     password had been chosen. The sign-up still gives the same answer for every address. Someone
     who signed up with a password before this change and has not yet confirmed will be asked to
     choose one after confirming.
2. **The invite link keeps its place after the email is confirmed** (`f72c41f0`, `5920f2a3`). The
   place they were going is kept on the server with the waiting sign-up or the sign-in link, and comes
   back when the link opens. Only a path inside the app is ever kept or followed. The second commit
   only renames what an old code test looks for.
3. **The sidebar and "More" use the People page's words** (`37fb91f3`): "Admin", "Can open
   check-ins", "Takes part", "Guest". "Member" and "Lead" are gone.
4. **"You are in … because …" only when the server knows** (`b9b1e582`): "…because your email
   address was on its list of people." (their staff record there is linked to them), "…because anyone
   with an @coamana.com email can join it.", "…because you joined through its invite link." With no
   known reason there is no sentence. Invitations are not recorded yet, so someone an admin invited
   gets no sentence.
5. **The invitation page** (`a2440dbb`): the full sentences above; "By joining, you agree that your
   contribution record belongs to you." is removed, because it is not on the prototype and nothing
   records it as a consent; and the prototype's look (the cream page, the small mark, one narrow
   column, the serif heading, the beige note, no "GROUNDWORK" band). The held parts of conflict A are
   untouched.
6. **Smaller** (`259707bb`, `983bbfd6`, `df79cb51`): "The invite link for Pwani Test Foods";
   `/join/waiting` sends someone who never waited to Today, and tells someone who was let in "An
   admin has let you in. You can open your check-ins now."; "You are in." says only what is true;
   each row on "Choose an organisation" has a full-sentence name, such as "Open Kilimo Traders’
   Association. You are a guest there. 1 new thing needs you." On "Create an organisation" the boxes
   were already tied to their labels in the code; a new test proves a screen reader says
   "Organisation name", not the placeholder.
7. **The welcome card's door descriptions** are left as the prototype has them, as you decided, and
   listed for you in item 13.

**The re-review (27 September) sent U.3 back for one real crash, now fixed.** The security fix passed
live, in the same browser and in another one.
- **Joining on confirm failed every time against the real database** (`4a4f366c`), both from the
  invite link and from "Where do you work?" then "Join". The database client already adds a
  membership to every new account, and the join then added a second one for the same organisation,
  which the database refused. Now the join brings its own single membership, as "Takes part" and
  with how the person joined, and the automatic one steps aside. Google's sign-up uses the same path,
  so it is fixed with it. Every test had passed because none of them ran the database client's
  automatic step. A new test runs every new account through that real step and refuses a second
  membership the way the database does; it fails on the old code and passes now. It is not a
  real-database test, because there is no safe way here to run one against the local database
  without changing its rows.
- **"Create" on "Where do you work?" now finishes** (`5b71bf49`). Before, it sent the person back to
  "Where do you work?". Now they land on their new organisation's Today, as its admin. It is named
  from what they typed at sign-up if they typed a name. A name they only left as we suggested it
  from their email address is not used here, because that suggestion is the name of the
  organisation they have just chosen not to join. They get "<first name>'s workspace", for example
  "Ama's workspace", which they can rename. A plain sign-up still takes the suggested name, as you
  decided.
- **For U.20 (small states and errors), not changed here:** when the database refuses a duplicate,
  every page says "Something with that name or key already exists.", which is jargon. It comes from
  one shared filter (`api/src/common/filters/a-database-error-is-not-a-message.ts`), so I have left
  it for U.20. The crash that showed it here is fixed.

**For U.2, not changed here:** the greeting, as asked.

**Two new database columns**, both empty for existing rows: where someone was going when they asked
for a link (`next_path`, on waiting sign-ups and sign-in links), and how someone joined an
organisation (`joined_how`). A third came with the Google fix: the Google id on a waiting sign-up
(`google_id`), and a fourth with the security fix: the hash of the browser's key for a password
chosen at sign-up (`password_key_hash`). All four are applied to the local database only.

### U.4 People, roles and access: built and tested, not yet reviewed

Seven commits so far, with the tests for each change:
- **People an admin adds no longer wait for an admin.** Before, when Sahar set up a check-in for a
  lead, everyone she added waited for her own approval, because the server asked whether the lead was
  an admin. Each person now records who added them.
- **Level, team and who someone reports to**, set by an admin for each organisation, with plain
  refusals such as "Someone cannot report to themselves." These only describe the organisation. No
  access rule reads them.
- **Colleagues, as you decided:** a member sees each colleague's name, role and team, and nothing else.
  A guest sees only the people on their own check-ins. Before, every member, and a guest, could get
  everyone's email address. The People list also no longer counts a person's check-ins in other
  organisations, which gave away their load elsewhere.
- **Letting someone in now also tells whoever invited them**, as the prototype says.
- **Inviting gives the role chosen**, and keeps a name typed beside an address.
- **The People page and a page for one person**, from the prototype: "Waiting to be let in" with the
  seats left, "Who reports to whom", "Everyone at …" with filters, "Invite people", "Who can open a
  check-in", and "Help your team get started". The retry sentence there now reads "That did not go
  through, and nothing has changed. Try again."

The wording the builder had to write, where no screen has any, is listed in its commit notes. It is
mostly small states such as "Nobody here matches that." and "Not set". No screen could be checked
signed in (item 14). Item 15 lists what needs you.

Two more fixes came after: the People list now reads real memberships, so someone who belongs here
but is looking at another organisation still appears, with their role here; and the line after
pasting a list is now full sentences, such as "2 people will be invited. 1 address was listed twice,
so it is left out." The full run found one missing style for the People pages, now added. **Tested:**
every screen test and every API test passed (2,612 and 9,264), and the build is clean. After merging
the engine workspace's latest, its conversation and report tests passed again (3,532). **Not ticked,**
because no review can sign in (item 14).

#### U.4 review fixes (27 September)

The reviewer checked U.4 live, with its own `@example.test` accounts. The privacy rules held:
colleagues gave only id, name, role and team; a person waiting to be let in got only the people on
their own check-in; and People was refused to a lead and to a member. It sent U.4 back for five
things. There is one commit for each, with tests of what a person reads. Only the tests for the
files changed were run, with the type checks; the full run is the tester's.

1. **Someone added by name now reads as invited to that check-in** (`6a09be4f`). Before, they read
   "Signed in, not on a check-in", and the check-in was missing. People now also finds check-ins by
   the address the invitation went to, until it is accepted, so the row reads "Invited, not opened"
   and "Sales team, Q3". **Done differently from the suggestion, on purpose:** the row is not linked
   to the account when someone is added. Accepting treats a linked row as already accepted, so the
   first click on the invitation would stop signing the person in and send a second email instead.
2. **Someone from another organisation is a guest from the moment they are added** (`e4cd7a3a`).
   Before, the guest membership was written only when they clicked the invitation. So they were on
   no row, "Guests" showed nobody, and switching to the host organisation was refused. Now adding
   them writes the same "Guest" membership, after every refusal, both when a lead adds them and when
   an admin sets a check-in up for a lead. The rule that nobody joins your company by being invited
   to a check-in is kept, because a guest is not a member:
   - they are "Guest", never "Takes part";
   - they hold no keys and no seat;
   - no account is created;
   - they see only the people on their own check-in.

   A guest calling from inside the host before accepting sees only those people (tested).
3. **The people count keeps up** (`68457e1e`). "27 people, on the Growth plan, which is for up to
   100." is read again after "Send their invitations", "Let them in" or sending held invitations.
4. **Plain words** (`c5084105`):
   - A lead or member opening People reads "Only an admin can open People." and "Your role here is
     not an admin’s. An admin can change it."
   - Changing a role says "Amina’s role has changed."
   - The admin's email subject reads "Peter Ouma is waiting to be let into Baridi Appliances.", or
     the address when the person gave no name.
   - **Kept, and why:** someone waiting to be let in shows "Takes part", not the prototype's
     "Guest". Here they are a new account being made one of the organisation's people. Once let in,
     they hold a seat and see their colleagues, which a guest does not. Their status says "Waiting
     to be let in".
5. **An invited person goes where the invitation leads** (`61dbd3da`). Before, after setting their
   password, they landed on "Where do you work?", offered another organisation by their email
   domain. That page now opens by itself only for someone who belongs nowhere yet: every
   organisation they are in was just made for them, has nobody else in it and has no check-in.
   Anyone invited lands on Today in the organisation that invited them. Joining by link or domain
   still makes no organisation.

**For U.5's review (noted, not fixed):** on Today, "Look at it" for a check-in waiting for approval
opens a page with no Approve button, and shows the lead's own words to the admin.

**Still open from U.4, for later:**
- Changing the role or number of someone currently looking at another organisation says "User not
  found".
- The seat count counts a guest who has switched in, in the organisation they switched to. This
  belongs to billing.

### U.5 Today and the check-ins list: built and tested, not yet reviewed

- **A privacy leak closed.** The check-ins list used to send every participant the whole record for
  each check-in: the join link, other people's email addresses when the lead keeps them private, and
  the report's findings before it was released. Now each reader gets only what the check-in's own page
  would give them.
- **Today**, from the prototype: "Morning, Wairimu", the date and one line on how things stand (for
  example "In Sales team, Q3, 2 of 3 have checked in for session 2; Omar hasn't yet."), then "What
  needs you", most important first, each with one button, and "Coming up". A name such as Omar's is
  shown only to whoever runs the check-in, or an admin. It is built by the server from what that
  reader may already open.
- **The new admin's welcome card and "Get … going" are on Today**, with the doors People, Connections,
  and Plan and billing. The held sentence stays out (item 11, conflict B).
- **Today is in the sidebar with its count**, first on the phone bar, and in "Jump to". Signing in now
  lands on Today. "Choose an organisation" shows "3 new" beside each organisation.
- **The check-ins list, rebuilt** in full sentences from the reader's side: "You run 2 open", "You're
  in 2 open", "Finished". A row reads, for example, "6 people. Daily, weekdays. Session 6 of 12." and
  "Waiting on Omar". The capitals, tiles and clipped pieces are gone, and the lead is "you", never
  their own name.

Wording the builder had to write, where no screen has any, includes "Nothing needs you right now." and
"What needs you did not load. Nothing you have written is affected." Item 16 lists what needs you.

**Tested:** every screen test (2,643) and the build passed. In the API suite, one test looked for a
button's style in its old place and now follows it to the stylesheet, checking the same promise (a
plain underlined line, not a second button). The only other failure is in two of the engine
workspace's own new tests, which I have asked them to fix (request 4). After merging the engine's
latest, its report tests passed again (1,258). **Not ticked,** because no review can sign in (item
14).

### U.6 Starting a check-in: built and tested except one card, not yet reviewed

- **The first screen, from the prototype.** Signed out: "What do you need updates on, or want to
  track?", "A goal, a new hire, a decision. Describe it and we’ll set it up in about two minutes.",
  five examples that fill the box ("Track the team’s targets for the quarter", "Sales are behind and I
  don’t know why", "A new hire starts on Monday", "Someone isn’t delivering", "We have to choose a
  supplier"), "Continue", and "Rather pick from a list? See every situation." Signed in: "Check-ins /
  New check-in", "Set up a check-in", "Describe it in your own words. Nothing is sent to anyone until
  you press send.", "What do you want your team to check in about?" and "Send". The name, the planned
  sessions and the step bar no longer show before anything has been said.
- **Every situation in one list:** "What do you want people to check in about?", under "Something is
  starting", "Goals and plans", "Keeping a read", "About one person" and "Something has gone off",
  each with the prototype's one line, then "Something else" with "Describe it". Picking a card now
  only picks it. The "You picked" panel says "It starts the conversation with: “…” You can change
  every word." and "Start with this", and, for someone signed out, "You don’t need an account to
  start. We ask for your email when there’s something worth keeping."
- **A bug fixed on the way:** choosing a card used to send its first message without its situation,
  so the setup did not open with that situation's own first question. It now does.
- **All 25 situations are already offered.** The modules doc says the backend lacks eight; it has
  them. I asked the engine workspace to check their conversations and to rename the names (request 5).

**Tested:** the new test reads the rendered first screen and list as someone signed out and someone
signed in, word for word. One test changed: `describe-own-is-a-real-choice.spec.ts` read the old
"describe your own" card from the page's source; that card is gone because the whole first screen is
now the describe route, so it checks the same rule on the rendered screen. The entry, grounds,
components and sign-in tests (1,630) and the type check pass. The screen was checked in the browser
signed out; nothing signed in could be checked (item 14).

**Then, the same day:**
- **The setup, before saving, in the prototype's words**, for signed-in and signed-out leads: "When it
  starts" (Now, Tomorrow, On a date; "The first check-in opens at the start time." and "Adding
  someone sends their invitation when it starts."), "How often" (Once, Every day, Every week, Every 2
  weeks, Every month, When I choose), "On which days" (Mon to Sun, "Weekdays only", "Any day is
  fine"), the dates ("Check-ins open on Wed 1 July, Thu 2, Fri 3, Mon 6, Tue 7 and on from there, until
  30 September: 66 in all.") and "When it ends" (On a date, When I end it; "You can give it more time
  later."). Each choice sets a field the server already keeps. The old schedule after the email step is
  gone, so nothing is asked twice.
- **"Or share a link"** on the check-in's Setup, in the prototype's words, with "Download the QR
  code". "Where people answer this" now needs WhatsApp switched on, as well as connected.
- **The panel that fills in as you talk**, beside the setup conversation on a wide screen: the name,
  the situation, "2 of 4 set", "Fills in as you talk. You can start without all of it.", and "A
  name", "How often", "When it runs", "Who’s in it" ("4 of 6 added", who is added, and "2 more you
  mentioned: Samuel and Omar."), all from what the conversation already holds.

Tests changed, each for old wording or an old place: `EntryChatPage.cadenceNotChosen.spec.tsx` (the
schedule is before the save now, and the rhythms have the prototype's names),
`the-invites-wait-if-you-say-so.spec.ts` and `what-the-setup-screen-owes-you.spec.ts` (they read the old
"When should the invites go out?" choice; they now read the new one and its wiring to the start date).
The entry, grounds and related tests (885) and the type check pass. The panel was checked in the
browser with a saved conversation; the setup could not be, because it needs a finished conversation
with the engine. **Still to build in U.6:** the lead's first check-in card, which waits on you (item
17, point 5).

**The full run** found two failures from U.6, both fixed without changing either test: one new screen
scrolled itself instead of using the shared scroll helper, and the setup had brought in a second day
picker. The product is meant to have exactly one, so the two can never disagree. The setup and the
check-in's own settings now share one picker, with the prototype's words ("On which days", "Weekdays
only", "Any day is fine"). Apart from those, every screen test (2,659) and API test passed, and the
build is clean; the only other failure is the engine workspace's own (request 4). **Not ticked:** the
lead's first check-in card waits on you, and no review can sign in (item 14).

### U.7 Context: built and tested, not yet reviewed

- **Targets, in the prototype's table.** Context now has a "Targets" band: each target's name, its
  number, whose it is ("The whole team", or the person), and who sees it. The lead reads "Seen by
  everyone" and "Seen by Aisha and you", with "Change who sees them" and "Each person sees their own
  share and the team’s totals, never someone else’s share." Aisha reads the team target and her own
  share, "Seen by you and Wairimu", and nothing about anyone else's share: the server sends her only
  those rows, as it already did.
- **What a target assumes.** Under each target: "What the target of 25 assumes", the lines, and "If
  one of these stops being true, the target needs a second look." (the prototype's board words). The
  lead writes them with "Say what it assumes". This is new storage (`assumes` on each target, one
  migration), written only by the lead and read only by whoever may read the target.
- **What this check-in is for.** The brief in quotes, then "Your words, from setup. Everyone reads
  this before they answer." and "Rewrite". Anyone else reads "Wairimu’s words, from setup."
- **Documents, as cards.** Shared ones first. Each card shows what it is for ("Checks price
  objections"), which the server now sends to the person who uploaded it and to nobody else. "Add a
  document" is the last card: "It starts private to you. You choose who can read it."
- **Add a document.** Choosing a file uploads it, private as always, and opens the prototype's step:
  the file's name, "Choose a different file", "What should it be used for? One line is enough; you
  can skip it.", "What it took from the document", "Who can read it" ("Only you", "Everyone in this
  check-in", "They can open it from Context."), "Add it to Context" and "Cancel", which removes the
  file. What it is for can now be said after the file is read (a new route, uploader only).
- **Asked of the engine (request 6):** a plan turned into proposals confirmed one by one, what a
  target assumes when it is said in a check-in, a document read item by item with pages and what was
  left out, and two lines for the lead's card on each person. Decisions for you are in item 18.

**Tested:** new tests read what each person sees, rendered: the targets as the lead, Aisha and an
admin (`targets-as-each-reader-sees-them.spec.tsx`), the Context page as each of them
(`the-context-page-as-each-reader-sees-it.spec.tsx`), and "Add a document" (`adding-a-document.spec.tsx`).
On the server: `what-a-target-assumes.spec.ts` (who reads it, and only the lead writes it) and
`what-a-document-is-for.spec.ts` (the line goes to its uploader only). Five tests changed, each for
old wording or because the targets table moved to its own file: `a-line-is-changed-by-talking-about-it`,
`the-brief-answers-this-bands-question`, `the-lead-is-not-a-third-person`, `the-brief-is-editable`
and `what-the-upload-box-promises-is-true` (the privacy sentence is now the prototype's, still chosen
by the setting and still shown before any upload). Only the tests for the changed files and the type
checks were run, as you asked; the full suites wait for the end of the module. No screen could be
checked signed in (item 14).

**The full run:** every screen test (2,681) and the build passed. In the API suite, U.7's own new test
read a source file without removing comments first, and the comment guard caught it; that is fixed.
After merging the engine workspace's latest, the only failure left is that same guard naming four of
the engine's own test files, which I have asked them to fix (request 4). **Not ticked,** because no
review can sign in (item 14).

### U.8 The check-in screens: built and tested, not yet reviewed

- **The header.** The check-in sits in the prototype's card. Above it, the way back names the
  check-in: "← Sales team, Q3". The heading is "Your check-in", and "Pause" is on the right. Once
  Groundwork closes the conversation, the line under the heading reads "That’s everything for
  today". A correction still says "Correcting session 2".
- **Pause.** It offers "Stop for now" (leave; every answer is already saved) and "Skip this
  check-in", which opens the existing confirmation that says what declining means. The underlined
  "I do not want to take part in this session" is gone from under the conversation.
- **Suggested answers.** The engine's suggested answers show as buttons under the latest question,
  and pressing one sends it as the answer. The engine does not send them yet (request 7), so today
  nothing is drawn. The three fixed chips are gone.
- **The + button.** It offers "Add a photo or a document" and "Paste text", and says "It starts
  private to you. You choose who can read it." The upload is the real one, and the server keeps the
  file private to whoever added it (`who-can-see-a-document.ts`). Two fixes on the way: iPhone photos
  (HEIC) and WebP can now be chosen, and what the person types about the file now reaches the server
  instead of being dropped.
- **The end card.** Under Groundwork's last message: "What is now in your record" (when the engine
  sends the lines, with their marks), "Why answering matters" (when the lead also answers, and never
  to the lead), and "What happens next". Then "That’s right, finish" and "Change something". It
  replaces "Complete session" and its confirm panel.
- **The Done page.** "Done. Thanks, Miriam.", "Your check-in is saved." with when the next one
  opens, "Two reports come from this" (your own with "Read yours", and the team's), what moved on
  deals when the engine sends it, "That’s saved" with why answering matters and one thing for next
  time, and "How checkable today’s check-in was", with "This is about the check-in. Only you see
  it."
- **Privacy, in the server.** "Only you see it" was not true: every check-in's read of how checkable
  it was went to everyone who could open the check-in, and the organisation roster sent each
  member's latest read to admins. Now each reader gets only their own
  (`how-checkable-is-yours-alone.ts`, with its test).
- **Asked of the engine (request 7):** suggested answers, the end card's lines with their marks,
  and what moved through stages for the Done page. Decisions for you are in item 19.

**Tested:** `the-check-in-as-a-person-reads-it.spec.tsx` renders the check-in as Miriam and as
Wairimu, the lead, and checks the words each reads: the header, Pause, suggested answers, the +
button and a real upload call, the end card with and without the engine's lines, and the Done page
with and without the team's report, the carry sentence, the stages and the read of how checkable it
was. `what-the-end-of-a-check-in-can-say.spec.ts` checks the next-opening sentence and who else
answers. On the server, `how-checkable-is-yours-alone.spec.ts` checks what the lead, a participant
and an admin each receive. Five tests changed, each because the old confirm step, its wording or the
old header are gone, while checking the same rule: `one-arrival`, `ChatPage.endConfirm`,
`ChatPage.alreadyComplete`, `ChatPage.offerOnlyWhatTheServerAccepts` and
`two-things-called-check-ins`. Only the tests for the changed files, the tests that scan whole
folders, and both type checks were run, as you asked. The API comment guard still names the engine
workspace's four files (request 4); nothing of mine. **No screen could be checked signed in** (item
14), so the screens were checked only by rendering them in tests. **Not ticked,** because no review
can sign in.

**The full run passed:** every screen test (2,714) and the build, and every API test apart from the
engine workspace's own four (request 4). After merging the engine's latest, its conversation tests
passed again (2,292). The privacy leak U.8 closed has a second half in the engine's board code, which
still tells a lead a person said "nothing checkable" from the same rating. That is engine code, so it
is request 8 to the engine workspace. **Not ticked,** because no review can sign in (item 14).

### U.9 Reports and sharing: built and tested, not yet reviewed

- **The lead's judgement on the board reads as sentences.** "What this cannot tell you" and "What
  the check-ins did not get to" no longer join two pieces with a colon. Each piece is its own line,
  and the count is a sentence: "2 conversations never reached this." "Start with: Aisha" now reads
  "Start with Aisha." The dead "See the counts behind this" is gone, because the server no longer
  sends the table to anybody. A participant's board has no judgement, and the card draws nothing.
- **Every session, in the prototype's words.** The lead's Report tab reads "Every session", then
  "Below is the board, then one line for each session, newest first. Open a session to see its
  report.", then "The board" with "Everything so far", then one row for each session: "Session 37",
  "Tue, 22 Sept", "6 of 6 checked in", and "Shared" or "Not shared". Who a session is still waiting
  for is kept, as a sentence: "Omar has not checked in yet." It replaces "Session reports · 12, 11
  released", "3 of 5 answered · waiting on Omar, Brian", and "Released", "Ready to release" or
  "Forming".
- **One session's report opens with the prototype's sentence.** "Session 37 of 65. 6 of 6 people
  checked in.", then "Shared with the team." once the round is out. Each person is a sentence: "You
  have checked in.", "Aisha has checked in.", "Omar has not checked in yet." It replaces "4 PEOPLE ·
  CHECK-IN 3 OF 12 · STILL FORMING · 2 OF 4 ANSWERED" and "Miriam (you) · Answered". The round page
  no longer says "It never quotes anyone.", which is not true (decisions, rule 4).
- **While a report is forming, it says when it last changed:** "Last updated on Wednesday 23
  September at 6pm. It only changes when something new comes in, such as a check-in, a document or a
  number from another system." The time is the report's own, and opening the page rebuilds nothing.
- **Your report and the team's report.** On a session's page, the private half is "Your report" with
  "Only you", the shared half is "The team’s report", and the correction reads "Something here isn’t
  right", as in the prototype. The server opens this page only for the person who wrote the check-in.
- **Asked of the engine (request 9):** the report's own parts ("In short", what each person did,
  where people see it differently, what it cannot tell you, why the numbers don't match, one
  question to answer, how much it can rely on), what last changed it, the own report's three parts,
  and the weekly report. Decisions for you are in item 20.

**Tested:** `the-judgement-reads-as-sentences` (the lead's judgement, and nothing for a
participant), `every-session-as-the-lead-reads-it` (every line of the list),
`one-session-as-each-reader-reads-it` (the top of a session's report as the lead and as a
participant receive it, and the "Last updated" line only while it forms) and
`your-report-as-each-reader-reads-it` (the session page as its owner). Ten tests changed, each
because it checked the old words while guarding the same rule: `a-round-everybody-answered-is-not-forming`,
`the-report-tab-shows-the-reports`, `a-forming-report-does-not-claim-to-be-finished`,
`one-door-per-place`, `GroundAdminPage.boardTab`, `the-reveal-row-names-who-you-are-waiting-on`,
`two-reports-two-names`, `a-panel-with-nothing-to-say-is-a-line`,
`the-report-you-saw-is-the-one-that-opens` and `a-report-you-cannot-argue-with`. No server code
changed; no privacy rule changed. Only the tests for the changed files, the tests that scan whole
folders, and the screens' type check were run, as you asked. **No screen could be checked signed in**
(item 14), so the screens were checked only by rendering them in tests. **Not ticked,** because no
review can sign in.

**The full run:** every screen test (2,732) and the build passed. Two API failures came from U.9. The
server's date formatter lacked the new short date the screens use; it is added, so the two match again.
The other is a test in the engine workspace's own report module that still expects the "counts behind
this" part, which the engine workspace itself asked us to remove. It is theirs to update (request 10).
The only other failure is the engine's own comment guard (request 4). **Not ticked,** because no
review can sign in (item 14).

### U.10 The board: built and tested, not yet reviewed

**What was missing, against the prototype's board (the gap list):** the line saying when the board
last changed; the note telling an admin who only reads who runs the check-in; what each target
assumes; "What needs you in this check-in"; and, found on the way, three things that were wrong
rather than missing. Opening the board could ask the model to word lines; the lead still read, as
"nothing checkable", the rating of how checkable a person's answers were; and "Where people differ"
printed the engine's own label for a person where it could not resolve a name. The footer said
"Everyone on this check-in sees the same board. It regenerates as people check in each session.",
and neither is true. Everything else on the prototype's board is the engine's text, or waits for
another module, and is listed in item 21.

**What each person now reads:**
- **Everyone** (Wairimu, Miriam, Grace), under the board's heading: "Last updated on Wednesday 23
  September at 6pm. The board only changes when something new comes in, such as a check-in, a
  report, a decision or a number from another system." The time is the newest thing in the record
  the board is built from: a finished check-in, the report being rewritten, a target, something
  someone is waiting on, or a document everyone may read. A private document is left out, because
  its time would tell others something they cannot see. Opening the board does not move it.
- **Grace, an admin who neither runs nor takes part:** "You can read this check-in’s board and
  reports. Wairimu Kamau runs it." Wairimu and Miriam read no note. The old "Generated from the
  check-in. Only the meeting poll is editable." is gone.
- **Under each target, for whoever may read it:** "What the target of 25 assumes", the lead's lines,
  and "If one of these stops being true, the target needs a second look." Miriam reads the team
  target's lines and nothing about Aisha's number; the server sends her only what she may read.
- **Wairimu only:** "What needs you in this check-in", with Today's items for this check-in, from
  the same server read as Today, so the two cannot disagree.
- **Wairimu no longer reads a rating.** A row that said "nothing checkable" now reads as "nothing
  to do", in the place it would have had without that reason, so the order cannot give it away.
  This is done on the server. The rule itself is the engine's (requests 8 and 11).
- **Each side of a difference** is printed by who it is, or "A colleague", never "Participant A".

**Opening the board rebuilds nothing.** Only the warm-up that runs when a check-in comes in may ask
the model to word a line. Every open serves the lines already worded and writes nothing. A new test
checks that opening the board, as the lead or a participant, writes nothing to the record, writes
no report, and asks the model for nothing.

**Commits:** `780629fb` (the server: when it last changed, the read-only note, what targets assume,
no rating, opening rebuilds nothing), `9041f46a` (the screen: the line, the note, the assumptions,
the footer removed), `2980d251` ("What needs you in this check-in"), `8d572c80` (who each side of a
difference is), `bea6c34c` (request 11 to the engine).

**Tested:** new tests read what each person is served and what each person sees:
`api/src/modules/board/the-board-as-each-reader-reads-it.spec.ts` and
`client/src/pages/board/the-board-as-each-reader-reads-it.spec.tsx`, as Wairimu, Miriam and Grace.
**One test changed:** `the-board-answers-its-own-question.spec.ts` asked the board to print
`pos.participantLabel`, which must never be printed; it now asks for `pos.who`. Only the tests for
the changed files and both type checks were run, as you asked. The only failures in those runs are
in the engine workspace's own files (requests 4 and 10). No screen could be checked signed in (item
14), so the screens were checked by rendering tests only. Item 21 lists what needs you.

**The full run passed:** every screen test (2,737) and the build, and every API test apart from the
engine workspace's own two failures (requests 4 and 10). Two of U.10's fixes changed how the board
module serves the board, though no engine text was touched: opening the board never words or writes
anything now, and a lead is never shown the checkability rating. Because the board module is shared
ground, I have told the engine workspace exactly what changed (request 12), so it can take them over.
**Not ticked,** because no review can sign in (item 14).

### U.11 Ending a check-in, the probation review, handover: built and tested, not yet reviewed

**What was missing, against the prototype (the gap list):** a decision with its reason (the lead
could end a check-in on an outcome alone, and nobody could read why); the ending page, "How does this
end?", with the prototype's words; the board's "The last session is done" and how it ended at the top;
the closed panel said "Everyone in this check-in chose the same outcome.", which is false now that the
lead decides; the report printed "Closed: KEEP"; and the check-in's own read passed the whole
resolution row to every reader. Groundwork's suggestion, the probation review's parts, and the day 30
and day 60 pictures are the engine's text (request 13). The handover page needs a decision (item 22.1).

**What each person now reads** (Wairimu runs "Kwame, first 90 days", Kwame is in it, Grace is an admin
who is not):
- **Wairimu, on the board near the end:** "The last session is done" (only once it is), "It’s yours
  to decide how this ends." and the button "Decide how it ends".
- **Wairimu, on the ending page:** "How does this end?", "This one is yours to decide. Kwame can see
  the possible outcomes and where things stand, and what each of you shared stays whichever way you
  go.", "The outcome" with the outcomes to choose from, "Why, in a sentence or two", "Kwame reads this
  with the outcome.", "Save the outcome and end it", "Ending means nobody can add to it. Both of you
  keep your own history, and Kwame can still correct their account.", and "What Kwame sees now" with
  what Kwame reads, word for word. The button waits until there is an outcome and a reason, and the
  server refuses an ending without a reason too.
- **Kwame, while it is open:** "These are the outcomes this check-in can reach. Wairimu decides which
  one it is. Your account is kept either way, and you can still correct or add to it.", and the
  outcomes as a list, never as buttons.
- **Grace, while it is open:** "These are the outcomes this check-in can reach. Wairimu decides which
  one it is." She is not told about an account she does not have.
- **Everyone, once it has ended, at the top of the board and on the ending page:** "How this ended",
  the outcome, "Wairimu decided this on 30 September." (Wairimu reads "You decided this on 30
  September."), "Wairimu’s reason" (or "Your reason") and the reason. Kwame also reads "Your account is
  kept, and you can still correct it." On the report, the outcome by its name, "Decided by the lead.
  Every account stays on the record." and the reason.

**Privacy, on the server:** the reason is served only once the check-in has ended, only through the
resolution read, and only to the people in the check-in and an admin; anyone else is refused. The
check-in's own read no longer carries the whole resolution row, so the reason cannot leave that way.
The board's "Last updated" time now counts the decision as something new coming in. No label is shown
on a person anywhere; the screen tests for Wairimu and Kwame check the page for "PIP", "at risk" and "exit".

**Commits:** `dc6dbe93` (the server: the reason, who reads it, the narrower check-in read, the board's
time), `942ad34e` (the ending page, the panel's words, the board's top and foot), `68d958f5` (the
report's line), `bdd2f61a` (request 13 to the engine).

**Tested:** new tests read what each person is served and sees, as Wairimu, Kwame and Grace:
`api/src/modules/resolution/the-decision-and-its-reason-as-each-reader-reads-it.spec.ts`,
`client/src/components/gw/the-ending-as-each-reader-reads-it.spec.tsx` and
`client/src/pages/report/how-it-ended-on-the-report.spec.tsx`. **Tests changed, and why:**
`resolution.service.spec.ts` ended check-ins with no reason, and now gives one because the server
requires it; `ResolutionPanel.spec.tsx` and `ResolutionPanel.leadDecides.spec.tsx` checked the old
words ("This is my answer", "Whoever runs it decides which one it is", "what each person shared") and
now check the prototype's. What they protect is unchanged: the person is never asked to choose, the
second press, and the tally only where everyone answers. Only the tests for the changed files, the
guards that read those files, and both type checks were run, as you asked. No screen could be checked
signed in (item 14), so the screens were checked by rendering tests only. The migration
(`20260927050000_the_reason_for_a_decision`) adds one empty column and was not applied to any database.

**The full run:** every screen test and the build passed apart from two failures from U.11, both fixed.
One test looked for the end-of-check-in logic in its old place; the protection was intact, and the test
now reads its new place with every check kept (the builder proved it can still fail by breaking the
logic on purpose). The ending's date now uses the shared date format. Nothing that ends a check-in
does so without a reason, so handover, disputes and the developer API are unaffected. After merging
the engine workspace's latest, all the engine and guard tests passed (3,562): the engine workspace
fixed its comment-guard specs and the judgement spec (requests 4 and 10), so those known failures are
gone. **Not ticked,** because no review can sign in (item 14).

### U.12 The You board: built and tested, not yet reviewed

**What was missing, against the prototype (the gap list):** there was no You page, no server read
for it, and no "You" in the sidebar, on the phone's More page or in "Jump to". The pieces existed
apart: what is expected of each person (Context), what they are down as doing (the check-in's page),
their coaching step (Ask Groundwork), their own reports (one per session), their to-do list, and the
download of their data (Settings). The engine's own parts (where you stand, worth knowing now, what
Groundwork noticed, coaching followed over time, what you contributed, what keeps coming up) have no
text yet (request 14). "Everything asked of you this week" and its sharing, and "Add my side", need
other modules (item 23).

**What each person now reads** on `#/you`, their own only:
- **Everyone:** "You", "What’s yours, across your check-ins. Only you see this page.", "Your board",
  and at the foot "Everything you’ve written, in every check-in, as one file." with "Download it"
  (the same file as "Download all of it" in Settings).
- **Miriam, who takes part in "Sales team, Q3":** "Your goals" ("Close Westgate Deli and Lakeside
  Supermarket this quarter.", and a target with her name on it as "Sales closed. You have 3 of 4."),
  "Your to-dos", "Coaching" with "One thing for this week: Ask Westgate what would get the deposit paid
  this week.", her turn ("Your own check-in for Sales team, Q3" with "Start it"), "What you said you’d
  do" with "From every check-in" (each line with its check-in, when she said, and "Open", "Kept" or
  "Not done"), "Your own reports" with "Read", and "Your work in each" ("Sales team, Q3", "You have
  finished 38 sessions.", "Open").
- **Wairimu, who runs "Sales team, Q3" and takes part in "Leadership, Q3":** the same parts, for her
  own work only. The check-in she runs says "You run this check-in. You have finished 38 sessions."
  Nothing of Miriam's reaches her board, though Wairimu's check-in list carries Miriam's place in it.
- **Grace, an admin in no check-in:** "You are not in any check-in yet." and the download. An admin's
  list carries every check-in in the organisation, but only the ones she is in are hers.

**Privacy, on the server:** `GET /you` reads the signed-in person and nobody else. Naming anyone else,
at `/you/:userId` or with `?userId=`, is refused with "Only the person whose page this is can read
it." before anything is read, whoever asks: a lead, an admin or a colleague. The board is built only
from what the person may already read, a target with a name on it goes through the one rule for whose
number is whose, and nothing on it says how anybody's answers were rated or puts a label on anybody.

**Commits:** `f102231b` (the server read and its refusals), `c3a6477a` (the page, and You in the
sidebar, on More and in "Jump to"), `eb8dfba3` (request 14 to the engine).

**Tested:** new tests read what each person is served and sees:
`api/src/modules/grounds/the-you-board-as-each-reader-reads-it.spec.ts` (Miriam's board, and Wairimu,
Grace and Brian each refused hers and given only their own) and
`client/src/pages/you/the-you-board-as-each-reader-sees-it.spec.tsx` (the page as Miriam, Wairimu and
Grace, the engine's parts once served, and the page when it fails to load). The sidebar and More tests
gained a test each for "You". **Tests changed, and why:** `the-org-is-not-a-ground.spec.ts` and
`jump-to.spec.tsx` list every door a person is offered, and now include "You" after "Today" because the
page exists; what they guard is unchanged. Only the tests for the changed files, every test that scans
whole folders on both sides, and both type checks were run, as you asked. No screen could be checked
signed in (item 14), so the page was checked by rendering tests only. No migration. **Not ticked,**
because no review can sign in (item 14).

**The full run passed with no failures at all:** 2,765 screen tests, 9,391 API tests, and the build.
That run also confirmed U.11's fixes, the faster check-in test, and the engine workspace's fixes to its
own files. **Not ticked,** because no review can sign in (item 14).

### U.13 Suggestions from verdicts, and appeals: built and tested, not yet reviewed

**What was missing, against the prototype (the gap list):** the product had no verdict engine and
nowhere to keep a suggestion; no decision with reasons outside ending a check-in; nowhere for the
person to add their side; no appeal and nobody to decide one; nothing about it on the board, the
ending page, the You board or Today; and nothing in the person's data file. The existing disputes
("That is not what I said", on a line of the record, a term or a record from another system) and
clarifications are about whether something was said or read rightly, not about a decision, so they
are left exactly as they were: an appeal is a new thing beside them, and neither changes the other.
The suggestion's text is the engine's (request 15).

**What each person now reads** (Wairimu runs "Daniel, the next six weeks" and "Kwame, first 90 days";
Daniel and Kwame are in them; Grace is an admin who is in neither), once the engine has written a
suggestion:
- **Wairimu, on Daniel's board:** "Groundwork suggests a performance plan for Daniel", "Why: In the
  last 4 weeks, Daniel kept 11 of his 20 commitments. …", "What would change this: Keeping 8 in 10 of
  his commitments for the next 4 weeks.", "Daniel’s own answer." with his words, "Your decision",
  "This is only a suggestion. You decide, and Daniel sees your reasons.", "Agree" and "Choose something
  else". Agreeing offers the suggested decision to change, and "Your reasons, in a sentence or two";
  nothing saves without reasons. Afterwards she reads her decision and reasons, "Daniel sees your
  decision and your reasons, and can appeal.", Daniel's side, his appeal ("Daniel has appealed", "An
  admin decides the appeal."), and then Grace's answer and reasons.
- **Wairimu, on Kwame's ending page:** "Groundwork suggests keeping Kwame on", in the same parts, above
  "How does this end?".
- **Daniel, on his You board:** "Where you stand", "About your work in Daniel, the next six weeks.",
  "In the last 4 weeks, you kept 11 of your 20 commitments. When fewer than 6 in 10 are kept,
  Groundwork suggests extra help to your manager.", "What would change this: Keeping 8 in 10 for the
  next 4 weeks.", then either "Wairimu has not decided anything yet. You will see the decision and the
  reasons here." or "Wairimu’s decision" and "Wairimu’s reasons". "Add my side", and "Appeal this
  decision" once there is a decision. He never reads the headline, Wairimu's "why" or the verdict.
- **Grace, on Today:** "Appeals to decide", "Daniel appealed Wairimu’s decision", the suggestion, the
  decision and reasons, Daniel's side and appeal, and "Keep the decision" or "Change the decision"
  with "Your reasons". Before an appeal, she reads nothing of it.
- **Miriam, Daniel's colleague on the team check-in:** nothing about a suggestion about Daniel.

**Privacy, on the server:** each reader's shape is built field by field in
`a-suggestion-told-like-a-signal.ts`, never by passing the row through. The verdict is served to
nobody. The person is never served the headline, the lead's "why", the choices or the verdict. An
admin is served a suggestion only once it is appealed. A colleague gets nothing, and somebody outside
the check-in is refused. Only the lead decides; only the person adds their side or appeals, once and
after a decision; only an admin decides an appeal, never the one who made the decision. The engine's
door in refuses text with a label on a person. A test scans everything each reader is served, at
every step, for labels, the verdict and ratings. The person's side and appeal are in their own data
file, and nothing the lead wrote is.

**Commits:** `bca337b3` (the table, the server's rules and routes), `66ba7345` (the You board's part,
and the data file), `31c54f12` (an admin is not served the person's facts), `3920a56d` (the screens),
`929b2bf4` (request 15 to the engine).

**Tested:** new tests read what each person is served and sees:
`api/src/modules/suggestions/suggestions-as-each-reader-reads-them.spec.ts` (Wairimu, Daniel, Grace,
Omar, Miriam and Kofi, each served or refused), `api/src/modules/users/your-data-holds-your-side-and-your-appeal.spec.ts`,
two new tests in `the-you-board-as-each-reader-reads-it.spec.ts`,
`client/src/components/gw/suggestions-as-each-reader-sees-them.spec.tsx`, and new tests in the You
board and Today page specs. **No existing test was changed.** One guard (every mutation says what
happened when it failed) caught that the new forms had no failure handling; they now say "That did
not save. What you wrote is still here, so you can try again." Only the tests for the changed files,
the guards that read whole folders on both sides, the board and ending page specs, and both type
checks were run, as you asked. No screen could be checked signed in (item 14), so the screens were
checked by rendering tests only. The migration (`20260927060000_suggestions_and_appeals`) adds one
empty table, alters nothing, and was not applied to any database. **Not ticked,** because no review
can sign in (item 14), and the full run is still to do.

**The full run:** every screen test (2,785) and the build passed, and every API test apart from one that
is meant to fail whenever a new area appears: it asks whether the area can be reached through Ask
Groundwork. Suggestions are now written down as not offered in chat, with the reason, which keeps
today's behaviour (item 24.11). **Not ticked,** because no review can sign in (item 14).

### U.14 Ask Groundwork: built and tested, not yet reviewed

**What was missing, against the prototype (the gap list):** the assistant existed, but only for the
developer API's panel, for one person on the organisation's own list of people. Nobody signed in to
the product could reach it: there was no route, no panel, no speech bubble beside the Groundwork mark,
no `#/chat` page and no Chat on the phone's bar. Its questions were already kept against the person
who asked, and no screen or console read them to anyone else, but nothing tested that for a lead, an
admin or Groundwork staff. Requests were already said back and waited for a yes, except two (item
25.4). Answering about one check-in, checking claims, thinking it through, and the suggested
questions are the engine's (request 16). The assistant's own words are unchanged.

**What each person now reads.** On a computer, the speech bubble beside the Groundwork mark opens the
panel beside the page, on the check-in whose page you are on:
- **Everyone who can ask:** "Ask Groundwork", "About" with the check-ins you run or take part in,
  "Your questions and the answers are private. Only you see them. They are never part of your
  check-in or a report.", "Ask me about Sales team, Q3: a deal, a target, or what to do next." (with
  the chosen check-in's name), your own earlier questions and answers, then the box "Ask about this
  check-in" and "Send". Answers are the assistant's own words. A request it says back has "Yes" and
  "No", and only that request is answered.
- **Miriam** sees "Sales team, Q3" under "About". **Wairimu** sees each check-in she runs or is in.
  **Grace**, an admin in no check-in, sees none, and the panel opens without "About".
- **Somebody not on the organisation's list of people** reads the privacy line and "Ask Groundwork
  can answer you once your organisation has connected its list of people to Groundwork.", with no
  box to type in (item 25.1).
- **On a phone,** "Chat" in the bottom bar opens `#/chat`: the heading "Chat" and the same panel.

**Privacy, on the server** (`api/src/modules/ask/`): your questions are read only by you. A lead, an
admin and Groundwork staff who name somebody else are refused ("Only the person who asked these
questions can read them.") before anything is read, and none of them reads anybody's questions on
their own page. A question can be about a check-in only if you run it or take part, and it has not
ended. A yes is taken only for your own request that is still waiting; somebody else's yes, a yes to
an older request, and a second yes do nothing. A test checks that nothing in the staff consoles reads
anybody's questions. One thing is not yet safe, and is for the engine and you: the pattern detectors
read everybody's questions (item 25.2).

**Commits:** `56bdb487` (the route, and who may read and confirm), `66d8e78c` (the reason it cannot
answer is the server's sentence), `b6e5752b` (the panel, `#/chat`, and Chat on the phone's bar),
`93325584` (request 16 to the engine).

**Tested:** `api/src/modules/ask/ask-groundwork-as-each-reader-reads-it.spec.ts` runs the real
assistant with a pretend database: Miriam reads her own; Wairimu (her lead), Grace (an admin) and Sam
(Groundwork staff) are refused and read none of hers; a request creates nothing until Miriam's own
yes; and the staff consoles read no questions. `client/src/components/gw/ask-groundwork-as-each-reader-sees-it.spec.tsx`
reads what Miriam, Wairimu and somebody not on the list see, that the yes names its request, that a
refusal shows the server's words, and that no label or rating appears. **Two tests were changed,
because Chat now exists:** `more-on-a-phone.spec.tsx` checked that Chat was left out of the phone's
bar; `a-label-that-loses-its-start.spec.ts` checked four words each fitting a third of a 320px
screen, and now checks the prototype's five, each fitting a fifth. The areas test asked whether the
new area can be reached through Ask Groundwork; it is Ask Groundwork's own door, and is written down
so. Only the tests for the changed files, the guards that read whole folders, and both type checks
were run, as you asked. No screen could be checked signed in (item 14), so the screens were checked
by rendering tests only. No database change. **Not ticked,** because no review can sign in (item 14),
and the full run is still to do.

**The full run:** all 9,427 API tests and the build passed, and every screen test but one: a style used
by the speech-bubble button had no definition. It now gives the button a pressed look while the panel
is open. **Not ticked,** because no review can sign in (item 14).

### U.15 The Company page: built and tested, not yet reviewed

**What was missing, against the prototype (the gap list):** there was no Company page, no route, and
no "Company" in the sidebar, "Jump to", More or the phone's bar. The pieces existed apart: the
organisation's own objectives (subjects sent through the developer API, with owners and what they
hang under), the link from a check-in to one of them, every check-in's board, and how the company
does things (organisation memory and the handbook, readable by everybody in it, with no screen).
Nothing kept the strategy's versions, a brief, principles or definitions at the organisation's
level, nothing linked two organisations, and nothing wrote a company-wide picture: how each
priority is moving, where the strategy is not reaching the work, what more than one team named,
or what leadership says next to what the check-ins show. Those are the engine's (request 17).

**What each person now reads** on `#/company`, in Baridi, where the organisation's own system has
given three priorities ("Sales team, Q3" feeds the first, "Operations, Q3" feeds the second):
- **Everyone in the organisation:** the organisation's name as the heading, "Ask about the whole
  organisation", "Company context", "Ask about the strategy" (both ask buttons open Ask Groundwork),
  "Is the strategy moving?", and a card for each priority: "Priority 1", "Grow revenue 50%,
  enterprise first", "Fed by Sales team, Q3"; "Priority 3", "Nobody owns it yet", "Build a stronger
  organisation", "No team feeds it". A priority not refreshed for two weeks also says "This was
  last updated on 28 August."
- **Grace, an admin:** "2 teams, 5 people, 3 check-ins this week.", and every check-in that feeds a
  priority by name.
- **Wairimu, a lead, and Miriam, a member:** "2 teams, 5 people." without a count of check-ins, and
  "Fed by …" only for a check-in they may open: "Operations, Q3" is never named to them.
- **Amani, the chief executive, who is a member:** what a member reads. Her title gives her nothing.
- **Kofi, a guest from another company:** "Only people in this organisation can read its company
  page.", and no Company in his sidebar.

On `#/company/context`: "Company / Baridi Appliances" as the way back, "What the company is trying
to do, and how it reaches every team", "Priorities", "Everyone reads the priorities. Targets and
numbers are leadership only.", each priority with "Owner: Wairimu Kamau" or "Owner: No owner yet",
and, for an admin only, "What success looks like" with "Leadership only" and the measure and target.
Then how the company does things, which everybody in it already reads: "The staff handbook, short
and simple" with "Ask Groundwork answers from this, and says so", "Resources", and "What Baridi
Appliances has learned, promised and has to hand".

**Privacy, on the server:** `GET /company` (`api/src/modules/grounds/company.service.ts` and
`the-company-page.ts`) is built field by field, never by passing a row through. What a reader gets
comes from their role and the check-ins they may open (through `GroundsService.list`, the one rule),
never a title. It carries nobody's words, reports, questions to Ask Groundwork, private notes, load
across check-ins, ratings or labels. The measure and target go to admins only. A guest is refused
before anything is read. Organisation memory is read exactly as before (item 26.7).

**Commits:** `f6f3e0a9` (the server read and its refusals), `c28e07da` (the two pages, and Company in
the sidebar, "Jump to", More and the phone's bar), `216533c8` (request 17 to the engine).

**Tested:** `api/src/modules/grounds/the-company-page-as-each-reader-reads-it.spec.ts` reads the page
as Grace, Wairimu, Miriam, Amani and Kofi, and checks that nobody is served another company's
check-in, anybody's words, ratings or labels. `client/src/pages/company/the-company-page-as-each-reader-sees-it.spec.tsx`
reads both pages as Grace, Miriam and Kofi, the engine's parts once served, the empty pages, and the
page when it fails to load. **Tests changed, and why:** `the-org-is-not-a-ground.spec.ts` and
`jump-to.spec.tsx` list every door a person is offered, and now include Company after Today, because
the page exists; the sidebar test finds You third, after Company; `more-on-a-phone.spec.tsx` expected
nothing in Start's place for somebody who may not start a check-in, and the prototype puts Company
there; `a-label-that-loses-its-start.spec.ts` reads the bar's words from the source, where Start and
Company now both appear, though only one is ever drawn. What each guards is unchanged. The API tests
for the changed files and every API test that reads whole folders passed, and so did both type
checks. On the screens side, a mistake in my command ran the whole screen suite once instead of only
the guards: all 2,818 tests passed. No screen could be checked signed in (item 14), so the pages were
checked by rendering tests only. No database change. **Not ticked,** because no review can sign in
(item 14), and the full API run is still to do.

**The full run passed with no failures:** 2,818 screen tests, 9,438 API tests, and the build. **Not
ticked,** because no review can sign in (item 14).

### U.16 Links between check-ins, and each person's load: built and tested, not yet reviewed

**What was missing, against the prototype (the gap list):**
- "Everything asked of you this week" on the You page, with its count ("3 requests from 2 people
  across 2 check-ins."), and "Share with your lead". The product held handoffs (somebody waiting on
  somebody) in each check-in, but nothing put the ones on you together.
- "Across check-ins" on one person's page, for an admin: how many check-ins they are in, and nothing
  more.
- Check-ins linked to each other as records. A handoff could say "Finance" in words, but not which
  check-in. So "Waiting on other teams" on the Sales board, "Asked of Operations by other teams" on
  the Operations board, and "Where the blocker started" had nothing to be built from.
- The engine's parts: spotting which check-in a handoff waits on, the line after "Asked", the due
  word, and the whole "Where the blocker started" (request 18).

**What each person now reads:**
- **Miriam, on her own You page,** after her turn and before "What you said you’d do": "Everything
  asked of you this week", "From every check-in you’re in. Only you see this.", then one row for each
  request still open on her, such as "Wairimu Kamau", "Sales team, Q3", "What would get Westgate’s
  deposit", "Asked 16 Sept.", and under them "3 requests from 3 people across 3 check-ins." In Kwame's
  check-in, where people do not see each other, the row says only "Kwame, first 90 days", the request
  and the date, not who asked.
- **Wairimu, on her own You page,** only what is asked of her. Nothing of Miriam's.
- **Grace, an admin, on Miriam's page:** "Across check-ins" and "1 check-in. What’s asked of them is on
  their own You page." Never the requests themselves.
- **Wairimu, on the Sales board, once the engine links a handoff:** "Waiting on other teams", then
  "Distribution operations: stock for Green Mart’s January order", "Asked 16 Sept." and "Open in
  Distribution operations" (she is in it), and "Finance: credit terms for Westgate Deli", "Asked 14
  Sept.", with no way in, because she is not in Finance. Brian reads the same lines with the team only
  as it was said in Sales ("Operations: ...") and no way in to either.
- **Wairimu, on the Operations board:** "Asked of Distribution operations by other teams", then "Sales
  team, Q3: stock for Green Mart’s January order", "Asked by Wairimu, 16 Sept." and "Open in Sales team,
  Q3". Fatuma, who runs Operations but is in no asking check-in, reads nothing of it (item 27.2).
- **Anybody with nothing linked** sees no heading and no empty sentence.

**Privacy, on the server:** each person's load is served only on `GET /you`, which refuses anybody
else before anything is read; a lead, an admin and colleagues are each refused, with a test for each.
`GET /grounds/:id/links` works out which check-ins the reader may open from the one rule
(`GroundsService.list()`); a check-in they may not open is "Check-in not found", and a link to or from
one gives them nothing of it: not its name, its people or its words. Who asked is named only where
that check-in lets its people see each other, or the reader runs it. No ratings, no labels.

**Commits:** `cb5d26e1` (everything asked of you, on the server), `29682dba` (on the You page),
`9b181672` (Across check-ins on one person's page), `62b41f81` (the link column and
`GET /grounds/:id/links`), `76d39488` (the two parts of the board), `5a347cf1` (request 18 to the
engine).

**Tested:** new tests read what each person is served and sees:
`api/src/modules/grounds/everything-asked-of-you-as-each-reader-reads-it.spec.ts` (Miriam served her
load; Wairimu, Grace, Brian and Kwame each refused hers and given only their own),
`api/src/modules/grounds/links-between-check-ins-as-each-reader-reads-them.spec.ts` (Wairimu, Miriam,
Brian, Fatuma, Grace, and Omar from another company),
`client/src/pages/board/links-between-check-ins-as-each-reader-sees-them.spec.tsx`, and new tests in
`the-you-board-as-each-reader-sees-it.spec.tsx` and `OnePersonPage.spec.tsx`. **Tests changed, and
why:** `the-you-board-as-each-reader-reads-it.spec.ts` gained an empty table in its fake database,
because the You board now reads handoffs; one comment in `the-you-board-as-each-reader-sees-it.spec.tsx`
now gives the right reason its check holds. No assertion changed. Only the tests for the changed files,
the tests that read whole folders (the schema and migration guards among them) and both type checks
were run, as you asked. No screen could be checked signed in (item 14), so the pages were checked by
rendering tests only. **Not ticked,** because no review can sign in (item 14), and the full run is
still to do.

**The full run passed with no failures:** 2,831 screen tests, 9,465 API tests, and the build. **Not
ticked,** because no review can sign in (item 14).

### U.17 The Suites page and all ten suites: built and tested, not yet reviewed

This run built only the Suites page itself, as you asked: the list, switching a suite on or off, the
questions an admin answers first, "Already part of Groundwork", and the sidebar's "Suites". No suite's
board is built yet.

**What was missing, against the prototype (the gap list):**
- Nowhere to keep which suites an organisation has switched on, or the admin's answers.
- No way for the server to say who may read the suites and who may switch them.
- No Suites page at `#/settings/suites`, for an admin or for a lead.
- No "Suites" in the sidebar, and no Suites door on the new admin's welcome card (U.1 and U.3 left
  both out until the page existed).
- The questions an admin answers before a suite switches on. `docs/modules.md` says there are "two or
  three", but no prototype screen shows them (item 28.1).

**What each person now reads:**
- **Grace, an admin,** in the sidebar under "Baridi Appliances": "People", "Connections", "Suites",
  "Plan and billing". On the page: "Baridi Appliances", "Suites", and "Ready-made tools for other kinds
  of team work. Switch on only what you need. Each one adds a single board, and people use it by
  talking to Groundwork, not by filling in forms. Only admins see this page." Then "People",
  "Money" and "Work", with each suite's name and line in the prototype's words, "On" or "Off", and a
  switch. For example: "Leave requests", "People ask for time off in a check-in or chat. Groundwork
  checks their days left and who else is off.", "Off". Pressing the switch on a suite with questions
  shows "Answer these first, and it switches on.", the questions, "Switch it on" and "Cancel". "Switch
  it on" works only once each question is answered. Then "Already part of Groundwork", "These don’t
  need switching on. Here is where each one lives.", and seven rows, each with its link: "Goals and
  targets" and "Commitments" to "Each check-in" (the check-ins list), "Teams and who reports to whom"
  and "Roles and permissions" to "People", "Company documents" to "Company context", and "Numbers from
  other systems" and "Slack or Teams" to "Connections".
- **Grace, on her welcome card,** a fourth door: "Suites", "Leave, spending and onboarding, switched on
  as needed", in the prototype's place between Connections and Plan and billing.
- **Wairimu, a lead,** "Suites" straight after "You" in the sidebar. On the page: "The team tools your
  organisation has switched on. An admin switches them on or off.", then only the suites that are on,
  each with its name and line, and no switches. While none is on: "None are switched on yet." She never
  reads the three suites that are for admins only, or the admin's answers.
- **Miriam, a member, and a guest from another company:** no "Suites" in the sidebar. If they type the
  address, they read "Only an admin or a lead can open the suites."
- **Nobody** reads "Open its board" yet, because no board exists (item 28.2).

**Privacy and access, on the server:** `GET /suites` gives an admin every suite, with its questions,
their answers, and the organisation's own people by name only (no addresses, no guests), for the
questions that ask for a person. It gives a lead only the suites that are on, of the seven for leads,
with nothing else. It refuses a member and a guest. `PUT /suites/:key` is for admins only: a lead, a
member, a guest and somebody from another organisation are each refused, and nothing changes. A suite
switches on only when every answer is one its question allows; a question that asks for a person can
only name somebody in the organisation. Access comes from the role only, never a title. No labels on
people, and no scores.

**New storage, on your computer only:** the table `organization_suites`, in the migration
`20260927080000_the_suites_an_organisation_has_on`: one row per suite an admin has switched, with
their answers. No row means off. Nothing existing changes. It has not been run against any database
here.

**Commits:** `1288237e` (the server), `00571b94` (the page), `906be170` (the sidebar and the welcome
card door).

**Tested:** `api/src/modules/suites/the-suites-as-each-reader-reads-them.spec.ts` (Grace switches and
reads everything; Wairimu, Miriam, a guest and somebody from another organisation are each refused a
switch; Wairimu reads only what is on and for leads; Miriam and the guest are refused the page; a
person question never names a guest), and
`client/src/pages/suites/the-suites-page-as-each-reader-sees-it.spec.tsx` (what Grace, Wairimu and
Miriam each read, word for word). **Tests changed, and why:** `the-org-is-not-a-ground.spec.ts` and
`get-your-organisation-going.spec.tsx` listed the doors without Suites, because Suites was left out
until its page existed. They now expect it where the prototype has it. `the-sidebar-as-each-reader-
sees-it.spec.tsx` gained checks for the new door. Only the tests for the changed files, the tests that
read whole folders, and both type checks were run, as you asked. No screen could be checked signed in
(item 14), so the page was checked by rendering tests only. **Not ticked:** no review can sign in
(item 14), the full run is still to do, and the ten suites are still to build.

#### The onboarding board: built and tested, not yet reviewed

**What was missing (the gap list):** a board at `#/suite/onboard`, and the rule on the server for who
reads it. What the product already kept, and nothing more, is what it is built from: the steps for
each role, who holds which role and since when, and where each person has got to on each step. It did
not keep who helps with which step, which check-in is a new person's work check-in, or who marked a
step done. Those parts of the prototype are left out (item 28.12 to 28.14).

**What each person now reads:**
- **Grace, an admin,** on the Suites page, once onboarding is on: "Open its board" on the Onboarding
  card. On the board: "Suites / Onboarding" (the way back), "Onboarding", and a part for each new
  person still being set up. For Faith: "Faith Kerubo is getting set up", "Faith started on 21
  September. This board is only about getting Faith set up. It is never used to judge Faith’s work.",
  then "Faith’s to-do list", "2 of 4 done", and each step for her role, such as "Send your ID and tax
  PIN to Grace" with "Done", "Collect your laptop and phone from Kamau" with "Not needed", "Finish the
  security training" with "About 30 minutes" under it, and "Meet Wairimu about your first 90 days"
  with "Optional". With nobody being set up: "Nobody is being set up right now."
- **Wairimu, a lead,** "Open its board" on Onboarding on her Suites page, and on the board only the new
  people in her own team: those whose directory entry names her as their manager, or who share her
  department. She never reads a new person in another team.
- **Faith herself, Miriam (a colleague) and a guest** are refused by the server: "Only an admin or a
  lead can open this board."
- **Everybody, while the suite is off:** "The onboarding suite is not switched on."
- **Nobody** reads "Something nobody has shown them yet" or "Who helps set ... up" (item 28.9 and
  28.12), and nothing on the board can be ticked.

**Privacy and access, on the server:** `GET /suites/onboard/board` refuses everybody while the suite is
off, and refuses anybody but an admin or a lead. A lead is given only the new people in their own team.
Nothing about anybody's work, no rating and no label is served, and no email address. The board is
read-only, so nobody can tick off a new person's own to-do for them (audit B13). Getting set up stays
apart from work (decisions rule 9). Nothing new is stored.

**Commits:** `388ec7da` (the server), `487039b0` (the board and "Open its board"), `d9bd60e3`
(request 20 to the engine: a new person says a step is done, it is said back and confirmed, then
marked).

**Tested:** `api/src/modules/suites/the-onboarding-board-as-each-reader-reads-it.spec.ts` (Grace reads
everybody still being set up, with each step; Wairimu only Faith, whose manager she is; Kamau only his
own department; a lead with no team nobody; Faith, Miriam, a guest and an outsider refused; nobody
while the suite is off) and `client/src/pages/suites/the-onboarding-board-as-each-reader-sees-it.spec.tsx`
(what Grace, Wairimu and Faith each read, word for word), with new tests in
`the-suites-page-as-each-reader-sees-it.spec.tsx` for "Open its board". **No existing test was
changed.** Only the tests for the changed files, the tests that read whole folders, and both type
checks were run. No screen could be checked signed in (item 14).

#### Leave requests: built and tested, not yet reviewed

**What was missing (the gap list):** the product kept no leave at all (`docs/backend-map.md`). There
was nowhere to keep a request, its days, a stand-in or the decision, no rule for who reads or decides
it, and no board at `#/suite/leave`. No screen shows a way to ask for leave: people ask by talking to
Groundwork, which is the engine's part (request 21). So the board shows and decides, and nothing more.

**New storage, on your computer only:** the table `leave_requests`, in the migration
`20260927090000_leave_requests`: who is off, the first and last day, who stands in, and whether it was
approved or declined, by whom and when. No reason is kept, because the prototype never asks for one.
The days each person has come from the admin's answer when the suite was switched on ("How many days
of leave does each person have in a year?"). Days left are that number, less the working days already
approved that year. It has not been run against any database.

**What each person now reads:**
- **Wairimu, the Sales lead who approves for her team,** on the Suites page, "Open its board" on Leave
  requests. On the board: "Suites / Leave requests", "Leave requests", "People ask for time off in
  their check-in or chat. Groundwork checks their balance and who else is off, and sends it to the
  right approver." Then "Waiting for approval", with a row for each request from her team, such as
  "Aisha Otieno: Thursday 1 and Friday 2 October" and "16 days left. Nobody else in Sales is off those
  days.", or "Samuel Njoroge: Monday 5 October" and "Brian is also off that day, so Sales would be two
  short.", each with "Approve" and "Decline". A stand-in is named as "Miriam Wanjiku stands in." Then
  "Who’s off", "The next two weeks", with rows such as "Brian Mwangi", "Mon 5 Oct", "Annual leave".
  With nothing to show: "Nothing is waiting for approval." and "Nobody is off in the next two weeks."
- **Grace, an admin,** the same for the whole organisation. She approves only where the person has no
  manager who can, or where the organisation said "An admin" approves.
- **Kamau, a lead in the same department but not the person's manager,** reads the request with no
  Approve or Decline.
- **Aisha herself** is served her own requests and days left (`GET /suites/leave/mine`), and nobody
  else's. No screen shows them yet (item 28.19).
- **A colleague and a guest** are refused the board by the server: "Only an admin or a lead can open
  this board." Nobody reads a reason, because none is kept.
- **Everybody, while the suite is off:** "The leave suite is not switched on."

**Privacy and access, on the server:** a lead is given only their own team's requests (the same team
rule as the onboarding board, now shared in `a-leads-team.ts`) and, for each, only what is needed to
decide: the days left and the first names of others in that team already off those days. Only the
approver may decide, and nobody decides their own. A decision is kept with who made it and when, and
cannot be made twice. A test scans the server's code and fails if anything outside the suites reads
leave, so leave never reaches a check-in or its report. No labels on people.

**Commits:** `45102e25` (the server), `b87c9cbd` (the board), `4877736d` (the server's date formatter
gains the same three parts as the screens', because the two must match), `5960ea91` (request 21).

**Tested:** `api/src/modules/suites/the-leave-board-as-each-reader-reads-it.spec.ts` (Grace, Wairimu,
Kamau, Aisha, Miriam, a guest and another organisation, each read from what the server hands them;
deciding; asking; the scan) and `client/src/pages/suites/the-leave-board-as-each-reader-sees-it.spec.tsx`
(what Wairimu, Kamau and Aisha each read, word for word, and the days as the prototype writes them),
with a new test in `the-suites-page-as-each-reader-sees-it.spec.tsx`. **No existing test was changed.**
Only the tests for the changed files, the tests that read whole folders, and both type checks were
run. No screen could be checked signed in (item 14).

#### Time sheets: built and tested, not yet reviewed

**What was missing (the gap list):** the product kept no hours at all (`docs/backend-map.md`). There
was nowhere to keep hours by client or project, a week's approval, or what each client agreed, no rule
for who reads or approves them, and no board at `#/suite/time`. No screen shows a way to give hours
("There is no grid to fill in."): people give them by talking to Groundwork, which is the engine's part
(request 22).

**New storage, on your computer only,** in the migration `20260927100000_time_sheets`: `time_entries`
(who, which client or project, which day, how many minutes), `time_weeks` (one person's week approved,
by whom, when, and the total they saw), and `time_agreements` (what a client agreed: the work, the
hours, and whether they are for the whole job or each month). The clients are the list the admin gave
when switching the suite on. It has not been run against any database.

**What each person now reads:**
- **Grace, an admin,** on the Suites page, "Open its board" on Time sheets. On the board: "Suites /
  Time sheets", "Time sheets", "Hours spent on each client or project, ready for billing. People tell
  Groundwork their hours in their check-in or in chat. There is no grid to fill in.", then a box: "Hours
  are for billing only." and "They never appear in anyone’s check-in report, their signals or a review.
  Being busy is not the same as making progress." Then "This week’s hours, waiting for approval", "Week
  of 21 September", and a table: "Person", each client, "Total", with rows such as "Aisha Otieno", "14
  h", "6 h", "2 h", "22 h" and "Approve", or "Approved". An earlier week that still waits comes after,
  headed "Hours still waiting for approval". Then "Hours against what each client agreed", with rows
  such as "Naivas Ngong Road: installing 12 freezers (whole job)" and "47 of 40 hours, over", and
  "Naivas Ngong Road is 7 hours over the 40 the client agreed. Somebody should talk to them before more
  work is done." With no hours yet: "No hours have come in this week."
- **Wairimu, a lead,** the same for her own team only, with Approve on the weeks of the people she
  manages, and nothing of what the clients agreed.
- **Each person** is served their own hours, week by week (`GET /suites/time/mine`), and nobody else's.
  No screen shows them yet (item 28.26).
- **A colleague and a guest** are refused by the server: "Only an admin or a lead can open this board."
- **Everybody, while the suite is off:** "The time sheets suite is not switched on."

**Privacy and access, on the server:** a lead is given only their own team's hours, which is what they
need to approve. Only the approver approves (the same rule as leave, now shared in `who-approves.ts`),
and nobody approves their own. A week is approved with the total the approver saw; hours added later
make it wait again. Only an admin says what each client agreed, and only an admin reads the hours
against it. **Hours are for billing only (decisions rule 10):** a test scans the server's code and fails
if anything outside the suites reads hours, so they can never reach a check-in, its record or its
report. Nothing served ranks, averages or compares how much anybody works. No labels on people.

**Commits:** `c3b2c46e` (the server), `f851915a` (the board), `60acea5d` (request 22).

**Tested:** `api/src/modules/suites/the-time-sheets-as-each-reader-reads-them.spec.ts` (Grace, Wairimu,
Aisha, Miriam and a guest, each read from what the server hands them; approving, and a week waiting
again; recording hours; the scan) and `client/src/pages/suites/the-time-sheets-as-each-reader-see-them.spec.tsx`
(what Grace, Wairimu and Miriam each read, word for word). **One test changed, and why:**
`the-suites-page-as-each-reader-sees-it.spec.tsx` expected no "Open its board" on a lead's Time sheets
card, because the board did not exist. It now expects the door there, and still none on To-dos. Only
the tests for the changed files, the tests that read whole folders, and both type checks were run. No
screen could be checked signed in (item 14).

#### Performance reviews: built and tested, not yet reviewed

**What was missing (the gap list):** the product knew when a review falls due (`evaluations_due`, set
by the organisation's own system through the developer API) and the daily reminder emails each manager
about them (`reviews-coming-up.cron.ts`). That is reused as it is, and the emails are unchanged. There
was no review page, nowhere to keep the manager's words, the person's own view or the decision, and
no rule for who reads a review. "What Groundwork noticed" and a suggestion for a review are the
engine's (request 23).

**New storage, on your computer only:** the table `performance_reviews`, in the migration
`20260927110000_performance_reviews`: one row for each review started, with the manager's own words,
the person's own view, the decision with its reasons and who made it when, and, once the engine writes
it, what Groundwork noticed (each line proven or only said) with the prompt version that ran. No score
and no verdict. It has not been run against any database.

**What each person now reads:**
- **Wairimu, the lead who writes her team's reviews,** on the board: "Suites / Performance reviews",
  "Performance reviews", "A review every 6 months. It is built from what each person did and proved in
  their check-ins, with their own view beside it. There are no scores." (the 6 follows the admin's
  answer), then a box: "How a review is built" and "From proof in each person’s check-ins, their own
  view of their work, and their manager’s view. A person decides, not Groundwork." Then "The next
  reviews", "March 2027", and a table: "Person", "Written with", "Where it stands", with rows such as
  "Aisha Otieno", "Wairimu Kamau", "Started." and "Open it", or "Miriam Wanjiku", "Wairimu Kamau",
  "Ready to start." and "Start it". With none due: "No reviews are due yet."
- **Wairimu, on Aisha's review:** "Aisha’s review, March", then three parts side by side: "What
  Groundwork noticed", "Proof first. Anything only said is marked.", with each line and its mark;
  "What you write", where she writes and saves her words; and "Aisha’s own view". Then "Your decision",
  with "Your decision", "Your reasons, in a sentence or two" and "Save my decision"; once saved, "Your
  decision", "Your reasons" and "Aisha sees your decision and your reasons." At the end: "No scores. You
  and Aisha talk it through, and you decide."
- **Grace, an admin, or a lead of the team who does not write it,** reads the same with "What Wairimu
  writes" and quotes, and nothing to write. "No scores. Wairimu and Aisha talk it through, and Wairimu
  decides."
- **Aisha herself:** "Your review, March", "What Groundwork noticed" with its lines, "Your own view",
  where she writes and saves hers, "The decision" and "The reasons" once Wairimu has decided, and "No
  scores. You and Wairimu talk it through, and Wairimu decides." She does not read Wairimu's own words
  (item 28.33). Nothing links her to the page yet (item 28.34).
- **A colleague, a lead of another team and a guest** are refused: "You cannot open this review." The
  board refuses members and guests: "Only an admin or a lead can open this board."
- **Before the engine writes its part:** "Groundwork has not written this part yet."

**Privacy and access, on the server (decisions rule 6):** an admin reads every review; a lead only
their own team's; the person who writes it with them (the manager, or an admin, as the organisation
answered) starts it, writes their words and decides with reasons; the person reads the facts, their
own view and the decision with its reasons, and writes their own view. The engine's lines are served
only with the two marks a person may read (proven, or only said); any other mark is dropped. A test
scans what every reader is served, and fails on a label ("PIP", "exit", "at risk", "low performer"), a
verdict, a score or a rating. Another checks the review code reads no hours and no leave (decisions
rule 10), and the scans from leave and time sheets still pass.

**Commits:** `30598a29` (the server), `6cab8a6c` (the board and each review), `055192aa` (request
23).

**Tested:** `api/src/modules/suites/the-reviews-as-each-reader-reads-them.spec.ts` (Grace, Wairimu,
Kamau, Aisha, Miriam, a guest and another organisation, each read from what the server hands them;
starting, writing, deciding; the scans) and `client/src/pages/suites/the-reviews-as-each-reader-see-them.spec.tsx`
(what Grace, Wairimu and Aisha each read, word for word, and no label on any screen). **No existing
test was changed.** Only the tests for the changed files, the tests that read whole folders, and both
type checks were run. No screen could be checked signed in (item 14).

#### When someone leaves: built and tested, not yet reviewed

**What was missing (the gap list):** the product already records a departure (`departure_records`,
when a role ends through the developer API) and a handover (the successor's role gets a brief of what
is outstanding, which never carries what the leaver said). Both must keep working exactly as now, and
they do: nothing about them changed. There was no checklist of what has to happen when somebody leaves,
no owner for each step, and no board at `#/suite/leaving`. "Signs a team is under strain" is the
engine's (request 24).

**New storage, on your computer only,** in the migration `20260927120000_when_someone_leaves`:
`leaving_checklists` (one list for one person's last day), `leaving_steps` (handover, equipment, access
and final pay, each with an owner, and when it was done and by whom), and `team_strain_signs` (empty
until the engine writes one). It has not been run against any database.

**What Grace, an admin, now reads:** "Suites / When someone leaves", "When someone leaves", "Everything
that has to happen when someone leaves, each with an owner, so nothing is forgotten." Then, for each
list, "Tom Odhiambo leaves on 9 October" (or "left on", once the day has passed) and "0 of 4 done", with
four steps: "Hand over Tom’s work" (or "… to Aisha" once the product's handover names who took over),
"Collect Tom’s laptop and phone", "Remove Tom’s access on their last day" and "Work out Tom’s final
pay", each with its owner to choose ("Nobody yet" when there is none) and "Mark done", or "Done" and
"Undo". Each step starts with the owner the organisation named: the person's manager for the handover,
whoever looks after equipment, and the admin's two answers for access and pay. Where the product's own
handover happened: "Aisha Otieno has the handover of Samuel’s role, since 15 September.", and nothing of
what was in it. Then "Already left, with no list yet" for departures the product already recorded, such
as "Samuel Njoroge left on 15 September." with "Start the list", and "Start a list", with "Who is
leaving", "Their last day" and "Start the list". With none: "Nobody is leaving." Once the engine writes
one, "Signs a team is under strain", the sign, and "This is shown for the team, never for one named
person, and nobody is scored."

**Everybody else,** a lead, the person leaving, a colleague and a guest, is refused by the server:
"Only an admin can open this board." The Suites page shows the suite, and its door, only to admins,
because it is for admins only.

**Privacy and access, on the server:** admins only, for reading and for every change, with a test for
the lead, the leaver, a colleague, a guest and somebody outside. The owner of a step is somebody in the
organisation, never the person leaving and never a guest. The board reads who took over and when from
the product's own role records, and never reads the handover brief; a test checks that. A sign of strain
that names anybody in the directory is never served. A scan fails if anything outside the suites reads
a leaving list, so nothing on this board reaches a check-in or a report about anybody. No labels on
people.

**Commits:** `f5e683bc` (the server), `588f05e4` (the board), `d9a166ec` (request 24).

**Tested:** `api/src/modules/suites/the-leaving-board-as-each-reader-reads-it.spec.ts` (13 tests: every
refusal, starting a list with its owners, marking and undoing, owners never the leaver or a guest, the
handover linked without its brief, a sign that names a person dropped, and the scans) and
`client/src/pages/suites/when-someone-leaves-as-an-admin-sees-it.spec.tsx` (9 tests, word for word).
The handover and departure tests pass unchanged. **No existing test was changed.** No screen could be
checked signed in (item 14).

#### The role map: built and tested, not yet reviewed

**What was missing (the gap list):** the product already knew the roles the organisation's own systems
gave (`roles`, with a description), who holds each one now (`role_assignments`) and each person's job
title in the staff directory. Nothing put them together, nothing showed a role that nobody holds, and
there was no board at `#/suite/roles`. There was no role interview, which is the engine's (request 25).
Nothing about roles or who holds them changed: they still come only from the organisation's own
systems, and they still feed the handover and the onboarding window.

**New storage, on your computer only,** in the migration `20260927130000_the_role_map`, both empty until
the engine writes them: `role_interview_answers` (what each person says they own, decide, depend on and
who depends on them) and `role_gap_notes` (why a job nobody owns matters, in one sentence). It has not
been run against any database.

**What Grace, an admin, now reads:** "Open its board" on the Role map card, then "Suites / Role map",
"Role map", "Every role, what it owns, and who holds it. It is built from your teams and people, and it
shows jobs that nobody owns." Then a table, "Role", "What it owns", "Who holds it", with rows such as
"Sales lead", "The sales team", "Wairimu Kamau"; "Sales rep", "Their own customers and deals", "6 people";
and "Stock planning", "Booking freezers before customers need them", "Nobody" (in red, as the prototype
has it). "What it owns" is the organisation's own description until the role interview says more; a job
title nobody described has it empty. Under the table, for each role nobody holds: "Nobody owns stock
planning.", followed by the engine's sentence once written, such as "That is why Kwame waited three
weeks for freezers." With no roles: "No roles are known yet."

**Everybody else,** a lead, a member and a guest, is refused by the server: "Only an admin can open this
board." While the suite is off: "The role map suite is not switched on."

**Privacy and access, on the server:** admins only. The map reads names and roles, never an address,
never a handover brief, and nothing about how anybody works; a test checks it writes nothing at all. No
labels on people.

**Commits:** `7ac3f7f2` (the server), `322a6a90` (the board), `968a6936` (request 25).

**Tested:** `api/src/modules/suites/the-role-map-as-each-reader-reads-it.spec.ts` (9 tests: off,
every refusal, one row for a role however it is capitalised, an ended role not held, job titles, the
engine's answers, no label, nothing written) and
`client/src/pages/suites/the-role-map-as-an-admin-sees-it.spec.tsx` (10 tests, word for word). **No
existing test was changed.** No screen could be checked signed in (item 14).

#### Spending and budgets: built and tested, not yet reviewed

**What was missing (the gap list):** the product kept no spending for customers at all. Groundwork's own
back office has spending (`ops_expenses`), but it is Groundwork's own books: no row says which
organisation it belongs to, so a customer's request could never be kept apart from ours. It is not
reused; its rule that nobody approves their own spend is kept. There was nowhere to keep a request, its
decision or a team's budget, no approval rule, and no board at `#/suite/spend`. Taking a request in chat
and checking the budget first is the engine's (request 26).

**New storage, on your computer only,** in the migration `20260927140000_spending_and_budgets`:
`spend_requests` (who, how much, for what, the team it counts against, and the yes or no with who
decided and when) and `team_budgets` (one team's budget for one month, set by an admin). It has not been
run against any database. **One question was added** to the suite's first questions: "Which currency do
people spend in?" (item 28.45).

**What each person now reads:**
- **Grace, an admin,** "Open its board" on the Spending and budgets card, then "Suites / Spending and
  budgets", "Spending and budgets", "People ask to spend by telling Groundwork. It checks the budget and
  the rules, then sends the request to the right person." Then "Waiting for a yes or no", with each
  request as the prototype writes it: "Kamau: KES 18,000 for fuel for Kisumu deliveries" and "Operations
  has KES 38,000 left this month. Kamau’s lead can approve this."; "Lina: KES 95,000 for a new laptop"
  and "This is over KES 20,000, so Grace must approve it. Product has KES 60,000 left this month.", with
  "Approve" and "Decline" only on the requests she approves. Then "Each team’s budget this month", a
  table of "Team", "Budget", "Spent so far" and "Left", such as "Operations", "250,000", "212,000",
  "38,000", and "Spending comes from the requests people make here." Then "Set a team’s budget for this
  month", with "Team" ("Choose a team"), "Budget" and "Save". With nothing: "Nothing is waiting for a
  yes or no." and "No budget is set for this month."
- **Fatuma, a lead,** the same for her own team only: its requests, with Approve and Decline on those
  she approves, and its budget. No way to set a budget.
- **A member and a guest** are refused by the server: "Only an admin or a lead can open this board."
- **Everybody, while the suite is off:** "The spending suite is not switched on."

**Privacy and access, on the server:** a lead reads only their own team's requests and budgets. Up to
the limit the person's lead approves (when that lead is a lead or an admin here), otherwise an admin;
above it, the person the admin named. Nobody approves their own, and nobody reads their own request as
waiting. A decision is made once. Only an admin sets a budget, and only for a team in the directory. A
scan fails if anything outside the suites reads a request or a budget, so spending never reaches a
check-in or its report. No labels on people, no addresses.

**Commits:** `1ec7e2a8` (the server), `5e1c7439` (the board), `5187daeb` (request 26).

**Tested:** `api/src/modules/suites/the-spending-as-each-reader-reads-it.spec.ts` (15 tests: off, every
refusal, what Grace, Fatuma and Wairimu are each served, who approves, never your own, deciding once,
setting a budget, the engine's check and ask, no label, the scan) and
`client/src/pages/suites/spending-as-each-reader-sees-it.spec.tsx` (11 tests, word for word, for Grace,
Fatuma and a member). **No existing test was changed.** No screen could be checked signed in (item 14).

#### To-dos: built and tested, not yet reviewed

**What was missing (the gap list):** each check-in already keeps what each person said they will do
(`ground_commitments`), and each person reads their own on their You board, but nothing put them in one
list for each person for an admin or a lead, and there was no board at `#/suite/todos`. Groundwork's own
back office has to-dos (`ops_todos`), but they are Groundwork's own, with no organisation on a row, so
they are not reused. A person's own to-dos from chat (`todos`, from "remind me to …" in Ask Groundwork)
already exist and are a note to themselves that nobody else reads, by the product's own rule; they stay
so, and are not on the board (item 28.50).

**Nothing new is stored,** and the board writes nothing.

**What each person now reads:**
- **Grace, an admin,** "Open its board" on the To-dos card, then "Suites / To-dos", "To-dos",
  "Everything people said they will do in their check-ins, in one list for each person. Nobody has to
  write it down twice." Then each person's name, such as "Miriam Wanjiku", with each line not yet done
  or dropped, newest first: "Visit Westgate Deli on Friday" and "From a check-in, 24 September". With
  none: "Nobody has anything on their list yet."
- **Wairimu, a lead,** the same, but only for the people in her own team and herself, and only lines
  from check-ins she runs, set up or takes part in; where she only takes part, only if people there are
  named to each other. Not the check-ins she reads only because they are run from her department.
- **A member and a guest** are refused by the server: "Only an admin or a lead can open this board."
- **Everybody, while the suite is off:** "The to-dos suite is not switched on."
- **Nobody** reads "Done" on a line, or "How people use it" (item 28.51).

**Privacy and access, on the server:** a line is served only to somebody who may already read it in its
check-in, by the product's one rule (`who-may-read-this-check-in.ts`), and never wider: an admin every
check-in (decisions rule 5); a lead only at the "lead" level or as somebody taking part where people are
named to each other, never at the "shared" level, which never includes another person's exact words. A
lead reads only their own team and themselves. A to-do from chat is never read. No labels on people, no
addresses. **Whether one list for each person across check-ins is that person's load, which is private
unless they share it, is a privacy question for you (item 28.49).**

**Commits:** `c5677216` (the server), `f1f88dd4` (the board), `e869645c` (request 27).

**Tested:** `api/src/modules/suites/the-todos-as-each-reader-reads-them.spec.ts` (9 tests: off, every
refusal, what Grace, Wairimu, Kamau and Brian are each served, a hidden-peers check-in, a department
check-in, done lines and chat to-dos left out, nothing written) and
`client/src/pages/suites/the-todos-as-each-reader-see-them.spec.tsx` (8 tests, word for word). **One
test changed, and why:** `the-suites-page-as-each-reader-sees-it.spec.tsx` used To-dos as the suite with
no board yet, and counted two doors for a lead. To-dos now has its board, so the "no door yet" check
moved to Customers and deals, the lead's To-dos card expects its door, and the lead counts three doors.
No screen could be checked signed in (item 14).

#### Customers and deals: built and tested, not yet reviewed

**What was missing (the gap list):** the product already keeps each customer the organisation's own
system gives (a `subjects` row of type COUNTERPARTY: a name, an id, an owner and that system's own word
for where it stands) and each visit or call with them (`interactions`, from their systems or told to a
check-in). Its own rule is that a customer is not a CRM record: no stage, no pipeline, nothing edited
here. Nothing put them in one list, and there was no board at `#/suite/customers`. Groundwork's own back
office has a sales pipeline (`ops_commercial_opportunities`), but it is Groundwork's own sales, with no
organisation on a row, so it is not reused. Keeping where each customer stands up to date from the sales
check-ins is the engine's (request 28).

**New storage, on your computer only,** in the migration `20260927150000_customers_and_deals`, empty until
the engine writes it: `customer_standings` (where one customer stands, in a few words, with the prompt
version that ran). It has not been run against any database.

**What each person now reads:**
- **Grace, an admin,** "Open its board" on the Customers and deals card, then "Suites / Customers and
  deals", "Customers and deals", "One list of customers and deals for the whole company. The sales
  check-ins keep it up to date, so nobody has to update it by hand." Then a table: "Customer", "Where it
  stands", "Who owns it", "Last contact", with rows such as "Green Mart", "Quote sent. Buys in January",
  "Miriam Wanjiku", "23 September". "Where it stands" is the engine's words once written, else the word
  their own system gives, such as "Paid"; a blank where neither says. With none: "No customers are known
  yet."
- **Wairimu, a lead,** the same, only for the customers her own team owns, and her own.
- **A member and a guest** are refused by the server: "Only an admin or a lead can open this board."
- **Everybody, while the suite is off:** "The customers and deals suite is not switched on."

**Privacy and access, on the server:** a lead reads only the customers owned by their team and
themselves. "Last contact" is only the day of the latest contact nobody disputed; what anybody said
about it is never read, and a test checks that. The board writes nothing. No labels on people, no
addresses.

**Commits:** `42408c4a` (the server), `765347a6` (the board), `efa64b40` (request 28).

**Tested:** `api/src/modules/suites/the-customers-as-each-reader-reads-them.spec.ts` (9 tests: off, every
refusal, what Grace, Wairimu and Kamau are each served, the engine's words over their system's, a
deleted customer and a disputed contact left out, never a note, nothing written) and
`client/src/pages/suites/customers-as-each-reader-sees-them.spec.tsx` (8 tests, word for word). **One
test changed, and why:** `the-suites-page-as-each-reader-sees-it.spec.tsx` used Customers and deals as
the suite with no board yet; it now has one, so that check moved to Equipment. No screen could be
checked signed in (item 14).

#### Equipment: built and tested, not yet reviewed

**What was missing (the gap list):** the product kept no equipment at all. There was nowhere to keep an
item, who has it or how it is, no rule for who reads or changes it, and no board at `#/suite/equipment`.
Updates people give by telling Groundwork are the engine's (request 29).

**New storage, on your computer only,** in the migration `20260927160000_equipment`: `equipment_items`
(an item's name, who has it, a person in the staff directory or nobody, and how it is, in their own
words). It has not been run against any database.

**What Grace, an admin, now reads:** "Open its board" on the Equipment card, then "Suites / Equipment",
"Equipment", "Laptops, phones and demo freezers: who has what, and what needs fixing. People update it
by telling Groundwork." Then a table: "Item", "Who has it", "How it is", with rows such as "Laptop 03",
"Kamau Njenga", "Broken screen.", or "Spare phone", "Nobody", and "Change" on each row, which opens "Who
has it" and "How it is" with "Save" and "Cancel". Then "Add an item", with "Item", "Who has it"
("Nobody" to start), "How it is" and "Add it". With nothing listed: "No equipment is listed yet."

**Everybody else,** a lead, a member and a guest, is refused by the server: "Only an admin can open this
board." While the suite is off: "The equipment suite is not switched on."

**Privacy and access, on the server:** admins only, for reading and every change, with a test for a
lead, a member, a guest and somebody outside, and that nothing changes. Who has an item is somebody in
the directory, or nobody. An item's name is used once. A scan fails if anything outside the suites reads
equipment, so it never reaches a check-in or its report. No labels on people, no addresses.

**Commits:** `d3ab0f8a` (the server), `915a570b` (the board, and the last door on the Suites page),
`a3b5fc2f` (request 29).

**Tested:** `api/src/modules/suites/the-equipment-as-each-reader-reads-it.spec.ts` (13 tests: off, every
refusal with nothing changed, adding and changing, a name used twice, somebody outside the directory,
the engine's record, a guest refused, no label, the scan) and
`client/src/pages/suites/equipment-as-an-admin-sees-it.spec.tsx` (8 tests, word for word). **One test
changed, and why:** `the-suites-page-as-each-reader-sees-it.spec.tsx` checked that a suite with no board
yet has no door, using Equipment. Every suite has a board now, so it checks instead that each of the
ten, once on, has the door to its own board; "and not while it is off" still checks the other side. No
screen could be checked signed in (item 14).

**Each suite, in the order of the task.** Each one adds its own board at
`#/suite/<name>`, its "Open its board" door, and its own tests.
1. **Onboarding** (`#/suite/onboard`, admins and leads). **Built** (above), from what exists. Still
   missing: each helper's list, the link to the new person's work check-in, and "Something nobody has
   shown them yet" (item 28.9, 28.12 and 28.13). The engine's part: a new person saying a step is done
   (request 20).
2. **Leave requests** (`#/suite/leave`, admins and leads). **Built** (above). Still missing: a screen
   where a person reads their own requests, and "How people ask". The engine's part: taking a request
   by talking to Groundwork, said back and confirmed first (request 21).
3. **Time sheets** (`#/suite/time`, admins and leads). **Built** (above). Still missing: a screen
   where a person reads their own hours, a screen to say what each client agreed, and "How people use
   it". The engine's part: taking hours by talking to Groundwork, said back and confirmed first
   (request 22). Hours are for billing only and never reach a report (decisions rule 10).
4. **Performance reviews** (`#/suite/reviews`, admins and leads). **Built** (above), on the dates the
   daily reminder already reads. Still missing: "What Groundwork noticed", a suggestion for a review,
   and "What Aisha’s review will show", which are the engine's (request 23); and a way in for the
   person (item 28.34).
5. **When someone leaves** (`#/suite/leaving`, admins only). **Built** (above), beside the handover and
   departures, which are unchanged. The engine's part: "Signs a team is under strain", for a team,
   never a named person (request 24).
6. **Role map** (`#/suite/roles`, admins only). **Built** (above), from the roles, who holds them and
   the directory's job titles, which it never changes. Still missing: "Give it an owner" (item 28.42).
   The engine's part: the role interview, and why a job nobody owns matters (request 25).
7. **Spending and budgets** (`#/suite/spend`, admins and leads). **Built** (above), with its own
   tables; the back office's spending is Groundwork's own books, so it is not reused. Still missing:
   "How people use it", and real figures from an accounting tool (item 28.46). The engine's part: taking
   a request in chat and checking the budget, said back and confirmed first (request 26).
8. **To-dos** (`#/suite/todos`, admins and leads). **Built** (above), from the commitments each
   check-in keeps; nothing new is stored, and the back office's to-dos are not reused. Still missing:
   "Done", and to-dos from chat (items 28.50 and 28.51). The engine's part: "Remind me" in chat, in the
   prototype's words (request 27).
9. **Customers and deals** (`#/suite/customers`, admins and leads). **Built** (above), from the
   customers and contacts the product already keeps; the back office's pipeline is not reused. Still
   missing: changing a customer here (item 28.55). The engine's part: the sales check-ins keeping where
   each customer stands up to date (request 28).
10. **Equipment** (`#/suite/equipment`, admins only). **Built** (above). Still missing: "Book a
    repair" (item 28.58). The engine's part: updates people give by telling Groundwork, said back and
    confirmed first (request 29).

**The full run at the end of U.17 passed with no failures:** 2,973 screen tests, 9,608 API tests, and
the build. **Not ticked,** because no review can sign in (item 14).

### U.18 Connections and channels: built and tested, not yet reviewed

**The gap list, before I started:**
- There was one long page, "Connect your systems", at `/org/integrations`. The prototype has three:
  Connections (`#/settings/connections`), Connect WhatsApp (`#/settings/whatsapp`) and Connect your
  own tools (`#/settings/tools`).
- WhatsApp's three counts had no source, and step 3 of connecting WhatsApp ("Not proven yet") could
  not be told, because nothing recorded Meta checking the address.
- Payments (Paystack, Flutterwave, M-Pesa), the weekly spreadsheet, your own address, the setup link
  for a developer, "Add your own" and team chat do not exist.
- Keys, imports, webhooks, deliveries, the panel inside your own tool, how long a leaver's words are
  kept, Slack or Teams notices and the WhatsApp connection all worked, and had to keep working.

**What I built, in three commits:**
1. `23b1337a` (the server). `GET /integrations/connections`, for admins only, gives the three counts
   and whether numbers from the organisation's own product have arrived. Counts only: no phone
   number, no name, nothing anybody said. Meta's check of the address, with the right token, is now
   remembered (one new empty column, `webhook_verified_at`), and the admin is told when the address
   was proven. New API test: every Connections route as an admin, a lead, a member and a guest (only
   the admin gets in), the counts, and the proof.
2. `bf4c6613` (the two new pages). The sidebar's Connections door goes to `#/settings/connections`
   and stays lit on the two pages under it. The old address opens the tools page, because emails still
   carry it.
3. `94b902d9` (the tools page). The old Connect page, with the prototype's heading and section names,
   and without WhatsApp and Slack or Teams, which moved.

**What each person now reads:**
- **Grace, an admin, on Connections:** "Settings", "Baridi Appliances". Then, while WhatsApp is on:
  "WhatsApp", "Connected", "Your people check in by replying to +254 709 000 111, Baridi Appliances’s
  WhatsApp Business number. A reply is their check-in, exactly as if typed here.", "6 people checking
  in on WhatsApp", "212 check-ins this month", "0 failed messages this week", and "Send a test
  message", "Reminder messages", "Change the number", "Disconnect" (which asks first: "Remove the
  WhatsApp connection? Nothing sent or received is deleted."). With no number of her own: "Not set
  up", "People check in by replying to your organisation’s WhatsApp number.", "Set it up". Then "Your
  numbers", "So what people say is checked against where the work shows up", with "Your own product
  sends its numbers" ("Connected" or "Not set up", "Set it up") and "Accounting or sales tools",
  "Invoices paid, deals won." ("Needs a key" until a key may send figures, "Connect"). Then "Your own
  address", "Not set up" (item 29.2). Then "Notices in Slack or Teams" with the prototype's sentence,
  "Paste the channel’s incoming-webhook address", "Add it, switched off" and "It arrives switched off.
  Send one test notice, see it land, then turn it on." Then "Figures from your other systems" with
  the prototype's sentence, "Ask for API access", "Read how it works", and "For whoever runs your
  systems. Say what it’s for and accept the terms; keys, webhooks and delivery logs open once access
  is approved." Then "More you can connect", "Each one means one less list to keep in two places",
  with the six cards in the prototype's words, each "Connected" or "Needs a key", and "Set up". Last,
  "What these look like", with "On WhatsApp" and "Inside your own tool".
- **Grace, on Connect WhatsApp:** "Connections" (the way back), "Connect WhatsApp", and "People check
  in by replying to your organisation’s WhatsApp number. Most of it happens in Meta’s settings. You
  can stop at any step; what you’ve entered is kept." Then the six steps in the prototype's words:
  "What you need first" (with "How to get these"), "Paste three things from Meta" (Phone number ID,
  Access token, App secret, each with the prototype's hint), "Tell Meta where to send replies" (the
  callback address and verify token, each with "Copy", and "Waiting for Meta to check the address.
  This page updates on its own." with "Not proven yet" until Meta has checked it), "Send yourself a
  test", "Approve the reminder messages" and "Turn it on, and choose who uses it". Each step says
  "Done" only when the server says it happened. The token and the app secret are never shown back.
  Last, "Keep your number on your own system instead", with the prototype's sentence and "Read how
  the relay works".
- **Grace, on Connect your own tools:** "Settings", "Baridi Appliances", "Connections", "Connect your
  own tools", and "For whoever runs Baridi Appliances’s systems. Everything here is off until you turn
  it on, and nothing sends what anyone said in a check-in." Then, as before, the request for API
  access and, once approved, "Setting it up", "Keys", "Be told when something happens", "Recent
  deliveries", "How it looks inside your tool", "Show Groundwork inside your own tool", "When somebody
  leaves" and the calls for your engineer.
- **Wairimu, a lead; Miriam, a member; Tomas, a guest:** no Connections in the sidebar. On any of the
  three addresses, only "Only an admin in your organisation can set this up. Ask whoever manages
  Groundwork for your organisation." Nothing is fetched for them, and the server refuses every
  Connections route to them.

**Tests changed, and why:** the sidebar, More, the welcome card, the Suites page and the route checks
expected the old address `/org/integrations`; the console's setup test looked for "What it does" and
"What it looks like", which the prototype's names replaced; and the failure test followed the WhatsApp
switch and disconnect, which moved to the new pages and still say when they fail. New: the
Connections and WhatsApp pages as each reader sees them (23 tests), the tools page as each reader sees
it (6 tests), and the API test above (40 tests).

**Checked:** the tests for every file I changed, and both type checks, pass. **Not checked in the
browser,** because no review can sign in (item 14). Nothing was sent: every test uses mocks, and no
real WhatsApp, Slack, Teams or Meta was reached.

**Requests to the engine:** none. The conversation on WhatsApp is unchanged; team chat waits for your
decision first (item 29.9).

**The full run** found three failures from U.18, all fixed: an unused helper in a new test broke the
build; `/org/integrations`, now a redirect kept for links in emails already sent, was not written
down as reached from outside; and the Slack or Teams test still read the page the console had left. That
test keeps its privacy check in the new words, and the builder confirmed in the server code that a
channel notice carries only one sentence and a link. Apart from those three, every screen test (3,006)
and API test (9,647) passed. **Not ticked,** because no review can sign in (item 14).

### U.19 Billing: built and tested, not yet reviewed

**The gap list, before I started:**
- Billing had no way to give the free trial, so its sentence had to stay switched off.
- The People page and Plan and billing counted seats by the organisation a person last switched to,
  while the People list counts memberships, guests included, so the two numbers could differ.
- `GET /billing/status` served every signed-in person the card's last four digits, the renewal date
  and each check-in's balance. Every billing action was already admin only on the server.
- The billing page was not the prototype's page, and said a few things that were not true (you can
  "choose between buying sessions or subscribing").
- The pricing page told a visitor who was not signed in that the free plan was "Your current plan".
- There were no invoices on the page, and the pages after Stripe's checkout were not the prototype's.
- Stripe itself (checkout, webhooks, invoices, the care fee, the portal, pausing, resuming,
  cancelling, retrying failed events) worked and had to keep working exactly as it does.

**Then you decided two more things (27 September):** the plans are the five published ones, and "no
free check-ins" is tied to the same switch as the trial, so there is one switch, off by default,
and nobody already on the free plan is cut off.

**What I built, in ten commits:**
1. `11d4c428` A seat is counted from the memberships (`seatsIn` in `common/seats.ts`), the same way
   for the invite gate, the seats left, Plan and billing and a check-in's seat check.
2. `5a4d389e` Billing gives the free trial for real, behind the setting: when "Create an
   organisation" is answered "Fewer than 20", 3 months on Small Team, with nothing sent to Stripe.
   One new empty column, `free_trial_started_at`, so an organisation gets it once.
3. `f6fad80e` Only an admin is served the money on `GET /billing/status`; a lead or a member only
   the plan and the seat count; a guest nothing. Every billing route is now listed by who may use it.
4. `b7781041` An admin's billing status carries the paid invoices.
5. `46c7ab62` Plan and billing is the prototype's page.
6. `97c9dfd1` The pricing page never tells a visitor the free plan is theirs.
7. `fa14a972` The People page's head count is billing's seat count, and says guests do not count.
8. `981d86ce` The prototype's pages after Stripe's checkout.
9. `463637ac` and `fc576323` One switch for the trial and the free plan, on the server and on the
   screens (item 30.1).
10. `e5f10b6c` A test that a fresh database holds exactly the five published plans.

**What each person now reads:**
- **Grace, an admin, on Growth, on Plan and billing:** "Baridi Appliances", "Plan and billing", then
  "Your plan": "Plan" with "Growth, $400 a month. 27 of 100 people." and "Change"; "Next payment"
  with "1 October, $400, by card ending 4417." and "Change card"; "Everyone counts" with "Every
  person with a Groundwork account at Baridi Appliances. Guests from outside don’t."; and "So far"
  with "38 check-ins, 12 reports shared, and 25 people taking part." Then "Plans", "One flat monthly
  rate, unlimited check-ins, sessions and reports", the five plans from the table ("$400/mo", "Up to
  100 people", "Your plan" on hers and "Move to this" on the others) and "Enterprise" with "Custom
  needs, volume pricing or dedicated support." and "Contact us". Then "Invoices" ("1 September",
  "$400, paid.", and "Invoices and payment method"), and "Stopping" with "Pause, or cancel at the end
  of this period. Either way, everything stays readable.", "Pause" and "Cancel", each asking first
  exactly as before. Then her check-ins, the access codes and "Things our team does by hand", as
  before.
- **Grace, on the free plan:** "The free plan, for up to 10 check-ins. 3 of 5 people, including
  you.", "Nothing is charged until you choose a plan.", "Your first 10 check-ins are free." and "Move
  to this" on every plan.
- **Grace, inside the free trial (only once the switch is on):** "Small Team, free until 27 December
  2026. 12 of 20 people." and "Free trial" with "Teams of fewer than 20 people get 3 months free. No
  card needed." Seven days before the end: "Your free 3 months end on 27 December", "Your team has 12
  people, so Small Team, $90 a month, keeps everything running. Nothing is charged until you
  choose.", "Choose Small Team" and "See every plan". At 20 people: "You now have 20 people" and "The
  free 3 months are for teams of fewer than 20. Your trial carries on until its end date; after that
  you’ll need Small Team, $90 a month."
- **A new organisation once the switch is on, with no plan:** "No plan yet. Choose one below to open
  check-ins and add people." On starting a check-in: "No plan yet" and "Your organisation has no plan
  yet. Choose one on Plan and billing to open a check-in."
- **After Stripe's checkout:** "Done. Baridi Appliances is on Growth.", "All 27 people can check in."
  and "Back to Plan and billing". Coming back without paying: "The payment didn’t go through", "You
  haven’t been charged, and your plan hasn’t changed.", "Try another card" and "Talk to us".
- **A visitor on /pricing:** "Pricing", then, while the switch is off, "Start free with 10 check-ins,
  for teams of 5 or fewer, including you. Subscribe as your team grows. Unlimited sessions and reports
  on every plan." and the free plan's card with no "Your current plan"; the five plans from the table
  with the prototype's descriptions ("For small teams getting each person’s own account written
  down." and so on) and "Subscribe"; and Enterprise. Once the switch is on, the free plan's card is
  gone, the first sentence is the trial's, and the trial's card reads "3 months free", "Teams of
  fewer than 20 people", the trial's sentence with "After 3 months, subscribe to keep going.", "$0 for
  3 months" and "Start your free 3 months".
- **Anybody signed in on /pricing:** "Your current plan" only when the server says the free plan is
  what covers their organisation.
- **The People page:** "27 people, on the Growth plan, which is for up to 100." and, when the list
  has guests, "Guests from outside don’t count toward the plan." Inside a free run it names that plan.
- **Wairimu, a lead; Miriam, who takes part; Tomas, a guest:** no "Plan and billing" door. At its
  address, only "You need admin access to manage billing for your organisation.", and nothing is
  fetched. The server refuses every billing action to them, and serves a guest nothing about billing.

**Tests changed, and why:**
- `a-seat-is-a-seat-on-both-screens.spec.ts` (API): its fake table had no memberships, so it could
  not count a seat the new way. It now models memberships, and has three new cases: a guest holds no
  seat, somebody looking at another organisation keeps theirs, and an account with no membership row
  is still counted. Its source check also accepts the new shared reader, `seatsIn`.
- `the-subscription-belongs-to-the-org.spec.ts` (API): it pinned the old where clause, and then the
  direct call for the free people limit. It now pins the one shared reader that both the invite gate
  and Plan and billing use, so the two still cannot say different numbers.
- `stopping-early-is-a-pause-not-a-refund.spec.tsx` (screens): it looked for the buttons "Cancel
  subscription" and "Pause subscription". They now read "Pause" and "Cancel", as the prototype has
  them. What they do, and every check on what they say, is unchanged.
- `the-numbers-that-decide-it.spec.ts` (screens): it pinned the old stat tiles. It now pins the
  prototype's rows, still checking that the plan line is not hidden behind having a subscription and
  that what the account has done is shown. That the free plan's people against its cap are shown to
  an organisation with no subscription ("3 of 5 people, including you.") is now checked on the
  rendered page, in `plan-and-billing-as-each-reader-sees-it.spec.tsx`, and inside the trial ("12
  of 20 people.").
- `one-vocabulary.spec.ts` (screens): it pinned the stat tiles too. It now checks the prototype's
  rows, and that the plan line is said once.
- `the-thank-you-page-does-not-promise-what-it-has-not-read.spec.tsx` (screens): it looked for "You
  are on the … plan." It now reads the prototype's "Done. Baridi Appliances is on Growth.", still only
  after the server reports the plan active, and has a new case for coming back without paying.
- `OrgMembersPage.spec.tsx` (screens): its helper now takes the billing answer as an argument, for
  one new case (a free run's plan is named).

New: the trial granted only while on (10 tests), billing as each reader is served it (13), the
switch for the free plan (14), the published plans (1, reading the migrations with their comments
stripped), Plan and billing as each reader sees it (15), and the pricing page as each reader sees it
(8).

**Checked:** the tests for every file I changed, both type checks, and the existing Stripe tests
(checkout, webhooks, invoices, the care fee, pausing, cancelling, the paywall), which all pass. **Not
checked in the browser,** because no review can sign in (item 14). No live key was used and no
charge was made: every test uses mocks, and nothing reached Stripe.

**Requests to the engine:** request 30 (one sentence in the conversation, the scenario runner and
the switch, and one seat count).

**The full run** passed every screen test (3,030), the build, and every API test but one: U.19's own new
test read the migration files without removing comments first, and the comment guard caught it. It now
removes both kinds of SQL comment. The existing Stripe, care-fee, webhook and paywall tests all passed,
none of them changed. **Not ticked,** until its review.

## Found on the way, for later tasks

- **The check-ins list (U.5)** shows clipped pieces to every reader, for example "Progress 6 of 12
  rounds · 2 of 5 answered this round", "In the way 1 · the sales deck", and "IN PROGRESS" in capital
  letters. The progress number shows 0 first, then the real figure.
- **The board (U.10)** is still grey-blue with dark cards, not cream.
- **Any member can list everyone in the organisation.** `/users/colleagues` returns every person
  in the organisation to any member. "Jump to" does not use it for that reason. **Answered by you on
  26 September, to do in U.4:** a member may see colleagues' names, roles and teams, as the
  prototype's People page shows. A guest from another organisation may only see the people in
  their own check-in. Nobody may see anyone's load, private notes, or anything beyond name, role and
  team. This will be enforced in the backend, with a test for the guest case.
- **"Talk to us" asks a signed-in person for what we already know.** It opens a page headed "Request
  a call", with "A coach in the room" already chosen, and asks for the name, organisation and email
  address we already hold. To look at with help and small states (U.20).
- **The organisation card's sentence is vague.** "You are in Coamana because your address was on
  their list." does not say which address or whose list. Something like "You are in Coamana because
  your email address was on its list of people." To look at in U.3.
- **The check-ins card calls the lead by name.** Hafsah reads "Led by Hafsah Jumare · 5
  participants" about her own check-in, where it should say "you". To fix in U.5.
- **The feedback panel's middle tab says "Build request".** That is work jargon. Something like
  "Something you would like" reads better. To look at in U.20 (small states).
- **The sidebar's touch-screen layout was not seen in the running app.** On a touch screen the pin
  and pencil sit in the row and the badge moves under the name. The browser's phone mode hides the
  sidebar below 768px wide, so only the tests check this layout.
- **The judgement card joined pieces with a colon** (found by the engine workspace). Fixed in U.9,
  and the dead "See the counts behind this" part is removed.
- **What the engine no longer sends to a participant** (from `docs/answers-from-engine.md`): a
  participant's report and board no longer carry the judgement, the table, the differences between
  people, or the raw direction, and a participant sees only their own finding. Screens must not
  print `.label` or `.participantLabel` ("Participant A"); they print `who`, which holds the name or
  "a colleague". There is a new `theOpening` on each report, which the board's summary should read.
- **For U.19 (billing): the free trial.** You decided teams under 20 people get Groundwork free for 3
  months. The limit and length live in the database, never in the screens. Billing must really grant
  it before the sign-up's sentence is switched on. Every screen that mentions the free offer uses the
  one shared sentence. **Done in U.19**, behind the same switch (item 30.1).
- **For U.19 (billing): the head count on the People page.** **Done in U.19** (item 30.5). "27 people, on the Growth plan…" comes
  from billing's seat count, which still counts accounts by the organisation they last looked at. The
  People list now counts real memberships, including guests, so the two numbers can differ.
