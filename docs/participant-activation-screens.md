# Participant activation: the screen half

Written 8 October 2026 on `wip/prototype-ui`, against `docs/participant-activation-spec.md`
(Hafsah), within her limits: Groundwork's own WhatsApp number is the main one; at most one
routine proactive message a person a day; no rankings or labels; existing users only get better.

This is the screen side only. The message content, timing and sending (who gets invited when, what
a reminder says, when a nudge fires) belongs to the engine workspace and is tracked in
`docs/engagement-spec-status.md`. What follows is: for each spec item, what a participant's screen
does today, checked live as Esther Adeyemi (`esther@kijani.test`, a member of Kijani Foods) and by
reading the code with its own citations of the prototype and decisions; then whether it was already
right, was built here, or needs something from the engine first.

## Proven on screen, as a newly invited person (8 October, second pass)

The first pass below was checked by reading the code and signing in as an existing participant.
Hafsah asked for A, D and F to be proven live as someone who had never been invited before, with
Playwright (not the in-app browser, so screenshots save to disk): `e2e/sweep/participant-activation.spec.ts`.
It runs against the already-running client and API, drives a fresh admin through setting up one
check-in, has her invite a brand-new `.test` address (a fresh address per width, since opening the
same invite twice is a *returning* participant, not a first landing), and drives that person through
landing, answering once, leaving, and coming back twice. All four tests pass at 1440 and 390.
Screenshots: `docs/bug-log-screens/activation-{invite-landing,first-question,resume-from-link,resumed-chat,today}-{1440,390}.png`,
`activation-{you,settings}-{1440,390}.png` for the existing-participant checks (step 6).

- **A, proven.** The invitation email (read from the mail catcher, decoded) says "Activation Admin
  would like to know what you are seeing in Activation Admin's check-in", "You are not being asked
  to be fair or balanced. You are being asked to be honest. What you share here is yours" - a
  reason, not an administrative notice. The landing page (`activation-invite-landing-1440.png`)
  has no password field anywhere, and one button, "Answer today's check-in now".
- **F, proven.** Clicking it lands straight on `/checkin/:id`, with the real first question from
  the model once it streams in ("Getting your first question ready. This can take a minute or
  two." while the box is disabled, then the question itself) - nothing else between the invite
  card and the conversation.
- **D, proven, both ways.** Leaving after one answer and clicking the same emailed link again
  reads "You've already joined. Pick up your check-in, '...'" with "Pick up where I left off" as
  the one primary button (`activation-resume-from-link-1440.png`); clicking it reopens the exact
  conversation with her own earlier answer still there, word for word
  (`activation-resumed-chat-1440.png`: "This week I am mostly focused on getting the Mombasa depot
  stock count finished."), followed by the next question - nothing re-asked. Coming back through
  Today instead of the link reads "Your first check-in for Activation Admin's check-in... Start
  it" (1440: a named sidebar link; 390: the "What needs you" card's "Start it", since the sidebar
  collapses to plain nav at that width) and opens the same resumed conversation with the same
  answer kept.
- **G, H, J, re-checked live as Esther.** Her You page and Settings read exactly as the first pass
  described (see the Settings screenshot: one switch, "Emails from Groundwork that we decide to
  send", nothing else). No change from the first pass.
- **One thing logged, not a screen fault.** Every run shows one console 404,
  `GET /api/v1/suites/queue?pageSize=1`, right after the first answer. It is not a bug: the call is
  made with `skipNotFoundToast: true` (`client/src/api/suites.ts`) because it is the approvals-queue
  badge, asked for on every sign-in including a brand-new participant who approves nothing yet, and
  a 404 there is the server's ordinary answer for "nothing to show", deliberately swallowed rather
  than surfaced. Nothing a person sees is affected. Not added to `docs/bug-log-screens.md` for that
  reason; recorded here so it is not mistaken for something missed.

## The ten strategies, A to J

| Item | What the spec asks | What the screen does today | Verdict |
| --- | --- | --- | --- |
| A. One-tap verification | The invite link signs a person in with no password and no extra screens, and says why it matters to them. | `client/src/pages/invite/InvitePage.tsx` is the one path: `accept()` on the token verifies, links the account and lands the person on their session 1 check-in directly, no password screen, no separate "finish your profile" step. The card's own text is the per-check-in "what it asks / who sees your answers / your number" from `docs/prototype/screens/A3-organisations-and-joining/join-invite.txt`, read live from `GET /participants/invite/:token`. An expired link, a seat held for approval, and a returning click on the same link (resume, a fresh link mailed to a different browser) each have their own screen, matching `join-expired`, `join-waiting`. | Already built, matches the prototype. **Proven live as a newly invited person, see below.** |
| B. Activate existing phone numbers when WhatsApp goes live | Nobody should need a screen for this; it is the server noticing a number was never reached. | No screen. A person's own WhatsApp row in Settings (`SettingsPage.tsx`, gated on `useWhatsAppIsOn()`) shows "You can check in by replying on WhatsApp" and, where the server offers it, "Optional. Tap to say hello to Groundwork on WhatsApp" with the server's own link and words (`user.connectWhatsApp`). | No screen needed beyond what exists. WhatsApp/email only. |
| C. A reason to check in, not a chase | Message wording ("what's one thing that would make your work easier"), not a screen. | The invite card already states the real question and the real stakes for the first check-in, rather than "you have a pending check-in" (see A). | Message content; no separate screen item. |
| D. Resume an unfinished check-in exactly where it stopped | The check-in page (or Ask) offers to pick up where a person left off, with answers kept. | Built: `preview.alreadyAccepted` on the invite page renders "Pick up where I left off" as the one primary button on that render (see the file's own `PRIMARY-BUTTONS-NEVER-TOGETHER` note); `resumed` on `accept()` carries the browser straight back into the same session with nothing re-asked. This is also the ordinary chat page's behaviour for anyone who returns to `/checkin/:id` directly: the conversation continues from its own stored turns, never restarted. | Already built, matches the spec's own example wording ("you started sharing your thoughts... we saved your progress"). **Proven live, both by the emailed link and by Today, see below.** |
| E. Personal ownership (commitments, prep, follow-up, coaching) | The person experiences Groundwork as helping their own job. | `client/src/pages/you/YouPage.tsx`: "Your goals", "Your commitments" / "Your to-dos", "Coaching" and "Coaching, followed over time" panels, drawn only when the server serves them (`b.goals`, `b.todos`, `b.coaching`, `b.coachingOverTime`). | Already built. |
| F. The first check-in is extremely easy | It opens straight on the first question from the invite, not a tour. | Built: `the-link-opens-on-the-question.ts`'s `opensStraightOnTheQuestion`/`whereTheLinkGoes` send a first-time accept straight into `/checkin/:id` with no interstitial. No product-tour screen exists on this path. | Already built. **Proven live, see below.** |
| G. Visible evidence that contributing mattered | The participant sees what came of what they said. | `YouPage.tsx`'s "What you contributed" (`b.contributed`, a plain list of facts, e.g. "Cleaned 480 customer records. Operations confirmed they now match.") and "Worth knowing now" (`b.worthKnowing`, things the person said earlier that are still live) are drawn whenever the server serves them. Checked live as Esther: her board shows neither panel today because her only check-in has one finished session and no contributed facts yet on the server (the boards update only when something new comes in - decision 7 - so an empty board here is correct, not a bug). | Already built; nothing to change on screen. |
| H. Recognition without rankings | Specific, evidence-based recognition, not points or a leaderboard. | `WhereYouStandFromSuggestions` on `YouPage.tsx` renders `b.suggestionsAboutYou`, the same `Suggestion` record (request 15) that carries a lead's positive decisions ("keep", "reward") as plain sentences with why, never a score. No leaderboard or badge screen exists anywhere in the client (checked: no "points", "rank" or "leaderboard" UI). | Already built, and already keeps the "no labels on people" rule. |
| I. Context-aware nudges, not calendar-driven | Entirely server-side timing logic. | No screen. | Engine only. |
| J. Learn what motivates each person; let them change how often and by which channel they hear from Groundwork | Settings should offer a choice of frequency and of channel, alongside the existing opt-out. | `SettingsPage.tsx`'s "What we send you" has exactly one switch, `emailNotifications` (decision 109 item 5's opt-out, on/off only, with the confirmation flow in `StopMailPage.tsx`). Checked live as Esther: the row reads "Emails from Groundwork that we decide to send" with the one switch and no other control. There is no field for "how often" or "which channel" anywhere in `GET/PATCH /me` (checked by reading `api/src/modules/users` and grepping the codebase for `emailFrequency`, `notificationChannel` - neither exists). | **Gap. The server has nothing to read or write for a frequency or channel choice, so nothing can be built on screen yet.** Logged as request 199. |

## Section 7: WhatsApp as the natural entry point

> Once WhatsApp is live, a participant should be able to reply directly to the welcome message and
> start using Groundwork... Verification should happen seamlessly within that flow.

This is a WhatsApp conversation, not a screen: `engagement-spec-status.md` already lists the
WhatsApp pieces that are built (the shared daily count, the widened follow-up template, the lead's
daily summary) and the ones that are not (no Meta template approved yet for the first-insight or
weekly-letter wording). Connecting a number stays optional and is the one row already on Settings
(item B above). No screen work follows from section 7; it is called out here so it is not silently
missing from this map.

## Section 8: what to build first

Checked against what already exists, screen by screen:

1. Automatic activation of unreached participants (including existing phone numbers) - engine only, no screen.
2. Verification recovery - built (item A, D: a stuck link always has a next step: a fresh link, "Almost in", or resume).
3. First-check-in conversion - built (items A, F).
4. Abandoned-check-in recovery - built (item D).
5. Evidence-of-value nudges - the screen side is built (item G); the engine's own nudge wording is tracked separately in `docs/engagement-spec-status.md` (spec section 12, 17).
6. Adaptive engagement and fatigue controls - engine only; the one screen-reachable piece, preferences (item J), is the logged gap above.

## What was built in this pull request

No participant-facing screen code changed: every spec item the screens could check against a real,
already-served field was already built, in the prototype's own wording, by earlier work on this
branch (see citations above). The one real gap found - item J, a frequency or channel choice beyond
the single on/off switch - has no field on the server to build against, so it is request 199 in
`docs/requests-to-engine.md`, not a screen change.

## Update, 8 October (night): the back office can now see people, not only check-ins

The engine's answer of 8 October (night) added `participants` to `GET /prompts/platform-funnel`'s
`activation` field: `reached` (how many people got as far as each step - added, invited, the
invitation arrived, opened it and signed in, started, in a habit) and `stuck` (where the people who
stopped are standing now, the six buckets never overlapping). Counts only, no name and no address,
for the Groundwork team, not a customer. This is the staff side of the spec items above, not a
participant-facing screen: it lets Hafsah's team see, across every organisation, how far the
activation work above (items A, B, D, F) is actually landing - how many people never got an
invitation at all, how many signed in and never started, how many answered once and went quiet.

Built on the back office's Drop-offs/Usage tab (`AdminPage.tsx`), beside the check-in funnel built
in 5bdfc442: "How far people get" as a funnel (`ParticipantsSection`, `PARTICIPANT_REACHED_LABELS`)
and "Where the people who stopped are standing" as counts (`PARTICIPANT_STUCK_LABELS`), both using
the engine's own suggested wording for each row. The whole section draws nothing when `participants`
is missing (a server that has not shipped it yet), so nothing else on the tab is affected - checked
with a served payload in `activation-funnel-on-the-usage-tab.spec.tsx`.

The same answer also gave Today, for a lead only, `GET /today/outstanding` - the page the lead's
daily nudge's "to see everything" link opens, with three more lists: "Needs you", "Overdue on your
team" and "Risks". Not a participant screen (a member reads `null` and sees nothing new), so it is
not one of the ten strategies above, but noted here since it shares this build. A sentence "Needs
you" would otherwise say twice, because "What needs you" already says it, is left out
(`outstanding-not-already-shown.ts`). Built in `TodayPage.tsx`, checked in `TodayPage.spec.tsx`.

## For Hafsah

Nothing here needs a decision from you yet: the one gap found (item J) is a request to the engine
workspace, not a product question. If the engine's answer to request 199 proposes specific choices
(for example, daily vs weekly, email vs WhatsApp), that proposal should come back through
`docs/decisions-merged.md` before screens are built against it, since "what notification choices
exist" is a product decision nobody has made yet.

## Deferred by Hafsah, 8 October

Request 199, letting people choose how often and by which channel Groundwork writes to them, is deferred. Hafsah wants no choices for now. Settings keeps its single switch for the email Groundwork decides to send (decision 109), and stopping on WhatsApp stays by replying "stop" or "not now". The screens will build nothing for item J until she says otherwise.
