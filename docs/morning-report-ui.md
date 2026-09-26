# Morning report: the screens workspace

This is the report from the screens workspace, on the branch `wip/prototype-ui`. The engine
workspace writes its own report in `docs/morning-report.md`, so the two computers never edit the
same file.

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

**Two of these conflict with something already written, so, as you asked, I have not chosen. Both
parts are held back; everything else is being built.**

- **The invitation (answer 1).** You said never to suggest the words are private, because people in
  the check-in and admins can read them. The prototype's own invitation, which you asked me to use,
  says both "The people in this check-in, including your manager, can see what you say in it." and,
  further down, "Nobody else reads your answers." and "Wairimu reads the report, not your words." The
  last two do suggest privacy. Also, the A4 rule in `docs/modules.md` says "Admins see boards and
  reports, never exact words and never performance plans, unless given access to that check-in."
  That differs from "admins can read them". **Held:** those two sentences. The rest of the prototype's
  invitation is being built. **My suggestion:** drop the two sentences, and state who can read the
  words from the check-in's real sharing settings. Also tell me whether admins can read exact words
  without access to the check-in, because that decides the A4 privacy rule too.
- **The welcome card (answer 7).** Its first line, "You can see every board and report.", tells an
  admin they can see everything. The same A4 rule says admins never see performance plans or exact
  words unless given access to that check-in. **Held:** that one sentence. The rest of the card is
  being built. **My suggestion:** "You can see the boards and reports of every check-in, except
  performance plans and anyone's exact words, unless you are given access to that check-in." Or
  change the A4 rule instead, if admins should see everything.


I will build what does not depend on these first, and leave each of these as the product does it
today until you decide.

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

### How this workspace runs now, since 26 September (your rule, because the Mac froze)

- One helper at a time: builder, tester or reviewer, never several together.
- While working, only the tests for the files that changed.
- The full API and screen suites once at the end of each module, one after the other, with at most
  2 test workers (`--maxWorkers=2`).
- The local API and screens servers only while a screen is being checked, then stopped.

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

### U.3 Organisations and joining: in progress

What you have decided already shapes it: the organisation is named at sign-up, with a name suggested
from the email address (built in U.2); someone who later signs up with the same email domain is
offered to join (this waits for the safeguards question, item 11.2); the organisation's own web
address comes later.

Being built now, without needing any open answer: creating another organisation ("Create an
organisation"), "Choose an organisation", the facts on an invitation (the organisation, the end date,
how often it asks), a fresh link for an expired invitation, "Almost in" while an admin lets someone
in (with a reminder allowed once a day), turning reminders back on or stopping all email from an
email's link, asking the lead for more time when a check-in has ended, and the new admin's welcome
card with "Get … going".

Waiting for you (item 11): what the invitation says about who reads your words; the safeguards for
joining by email domain; how the organisation's invite link behaves; whether to name the admin who is
asked; 14 or 90 days for an invitation; more than one organisation of your own; and the welcome
card's sentence.

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
- **The judgement card joins pieces with a colon** (found by the engine workspace). In
  `client/src/components/gw/TheJudgement.tsx`, lines 102 and 121, "What this cannot tell you" reads
  "**The renewals target**: nobody said who set it.", and "What the check-ins did not get to" joins
  "…: 2 conversations never reached it" the same way. The engine will make each part a full sentence;
  the screen must then show them as sentences, not joined by a colon. The "See the counts behind
  this" part is now dead, because the engine no longer sends the table to anyone. To fix in U.9 and
  U.10.
- **What the engine no longer sends to a participant** (from `docs/answers-from-engine.md`): a
  participant's report and board no longer carry the judgement, the table, the differences between
  people, or the raw direction, and a participant sees only their own finding. Screens must not
  print `.label` or `.participantLabel` ("Participant A"); they print `who`, which holds the name or
  "a colleague". There is a new `theOpening` on each report, which the board's summary should read.
- **For U.19 (billing): the free trial.** You decided teams under 20 people get Groundwork free for 3
  months. The limit and length live in the database, never in the screens. Billing must really grant
  it before the sign-up's sentence is switched on. Every screen that mentions the free offer uses the
  one shared sentence.
