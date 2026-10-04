# The anchor scenario: what exists, what is missing, who builds it

Written on 5 October 2026 on `wip/plain-reports`, for decision 94. This is a plan only. No code was changed.

It is read against `docs/anchor-scenario.md` (Hafsah's 30 sections), `docs/decisions-merged.md` (decisions 1 to 94), the prototype's screens in `docs/prototype/screens/`, and the code as it is today. Every file named below was found by searching the code, not guessed.

**How to read the sizes.** Small is under half a day of one builder. Medium is about a day. Large is several days.

**The size of the whole build.** Large. About 32 builder-days in the engine workspace and about 17 in the screens workspace, in 36 pieces, numbered 0 to 35 (section 4). The engine part is the bigger risk, because the conversation prompts are shared by every check-in, and `api/src/modules/entry/a-check-in-with-no-aim-has-nothing-to-read-against.ts` records what happened the last time weight was added to the setup prompt: it made other things worse. Every prompt piece below is therefore proved on the scenario run and the scorer before it is kept.

**Where this sits in the order.** Decision 94 says this starts after the release checklist items, and decision 87 freezes engine features until release. Nothing here should start before then.

**What the anchor scenario is, in one paragraph.** A lead arrives from a shared link and is in a conversation straight away. Groundwork listens before it structures anything, finds out how this lead's business really earns its money, and challenges the lead kindly. The lead then sees a board that says back what they are carrying and how Groundwork will help. They add up to 20 people, who each have their own conversation. For a month the lead watches whether the team is moving together, and Groundwork does the chasing. At the end the lead sees what changed and chooses whether to continue.

---

## 1. The 30 sections

For each section: what it asks for, what already exists, what is missing, who builds it, and the size. "Prototype" says whether the prototype has a screen or part for it. "Needs Hafsah" numbers point to section 2.

### Section 1. What this scenario is

- **Asks for:** a lead of any kind, with no formal department, can bring up to 20 people whose behaviour affects an outcome they carry. The experience lasts one month, and it starts from a shareable link straight into a conversation, with no organisation to create, no tour.
- **Exists:** a signed-out setup conversation at `/start` (`client/src/pages/enter/EntryChatPage.tsx`, `TheDoor.tsx`, route in `client/src/App.tsx` line 449), backed by `api/src/modules/entry/entry.controller.ts` (`entry/onboard`, `entry/chat`, `entry/report`, `entry/commit`) and the `EntryDraft` table (`api/prisma/schema.prisma` line 812). A person can already start without an account and save by email afterwards (`client/src/pages/home/SaveCard.tsx`). The product already creates an organisation for a new sign-up automatically (decision 22). A check-in already holds up to 200 people (`api/src/modules/entry/how-many-people-one-check-in-holds.ts`).
- **Missing:** a link that names this scenario, so the visitor lands in it without choosing a situation; the scenario itself (see sections 6 to 10); a limit of 20 people for the month; a one-month trial for it.
- **Who builds it:** engine for the switch, the link and the scenario; screens for the landing.
- **Prototype:** yes for the chat (`B1-starting-a-check-in/start-chat`), no for the scenario's own landing.
- **Size:** medium for the link and switch together (pieces 0 and 1).

### Section 2. The human problem

- **Asks for:** nothing is built from this section. It is the reason the product exists, and it sets the tone: never a lecture, fear, "tell everyone to sell" or a revenue dashboard.
- **Exists:** the tone rules already in the engine: `api/src/modules/conversation/nothing-here-is-pleased-with-you.ts`, `this-is-not-a-court` (`api/src/modules/entry/this-is-not-a-court.spec.ts`) and decision 11.
- **Missing:** the section's own sentences in the conversation pack (piece 4).
- **Who builds it:** engine, as part of the pack.
- **Prototype:** no.
- **Size:** none of its own.

### Section 3. The central behavioural shift

- **Asks for:** movement from "I do my job" to "I understand what we are trying to make happen and where I can contribute", from "revenue belongs to Sales" to "different people contribute differently", and from "I completed my part" to "did the thing we are trying to achieve move?". It says this is not about making people commercially aggressive.
- **Exists:** the engine already reads each person against the shared aim of a check-in (the board's "Will we reach 25 sales by 30 September?" in `B5-the-board/board-as-lead.txt`; `api/src/modules/board/board.service.ts`).
- **Missing:** nothing separate. These three shifts are what the conversation pack (pieces 4 to 7) and the lenses (piece 13) are written to move and to notice.
- **Who builds it:** engine, inside those pieces.
- **Prototype:** no.
- **Size:** none of its own.

### Section 4. Revenue is different in different organisations

- **Asks for:** Groundwork must never assume "revenue" means sales. It discovers the lead's economic engine (sales-led, project, credit, subscription, services, marketplace, grant-funded) by asking.
- **Exists:** nothing that does this. Today's setup extracts an aim, a target and who is on it. The 11 kinds of work a board can keep records for (`api/src/modules/board/the-kind-of-work.ts`) are a different idea: they decide a board's records, not how a business earns.
- **Missing:** a way of asking that finds the economic engine in the lead's own words and keeps it as a plain sentence, with the seven chains in the section used as examples to listen for, never as a menu.
- **Who builds it:** engine (piece 5).
- **Prototype:** no.
- **Size:** medium.

### Section 5. The entry hook

- **Asks for:** a link that opens straight into the conversation. The front-door words are "Help your team see the bigger picture." and the WhatsApp version "What would change if more of your team understood what it actually takes to keep the company growing? Try Groundwork with up to 20 people for a month." The closing paragraph of the document gives a simpler version ("Start with my team"). The landing page enters the scenario at once.
- **Exists:** the public site (`marketing/src`, `client/src/pages/` for the F3 pages) and the signed-out `/start` door (`TheDoor.tsx`, words in `client/src/pages/enter/the-way-in.ts`, copied from the prototype's `start.txt`). Join links already exist (`/j/:code`, `client/src/pages/join/JoinByLinkPage.tsx`).
- **Missing:** the anchor landing page with Hafsah's words; a link address that carries the scenario (for example `/start/team`, so `release.anchorScenario` can switch it); a source mark on the link so Hafsah can tell which WhatsApp group or post it came from.
- **Who builds it:** engine for the route and the source mark (piece 1); screens for the landing (piece 2).
- **Prototype:** no. The closest is the public home (`F3-public-site/home`) and `B1/start`. The prototype's own home still says "3 months free" (see Needs Hafsah 3).
- **Size:** small for the engine, medium for the screens.

### Section 6. The first psychological trigger: recognition

- **Asks for:** the first question is "What's happening right now that makes you wish your team saw more of what you see?" and the lead is heard before anything is structured. Six probes are given.
- **Exists:** the setup chat reads the person first (`api/src/modules/entry/the-setup-conversation-reads-you-first.spec.ts`), the first question is chosen per situation (`the-first-question-for-this-situation.ts`), and what they came for comes first (`what-they-came-for-comes-first.spec.ts`).
- **Missing:** this scenario's first question and its probes; the rule that nothing is asked about a target, a number or the people until the lead has been heard.
- **Who builds it:** engine (piece 4). Screens: the opening line shown on the chat page comes from the server, so none.
- **Prototype:** the chat screen yes; the wording no.
- **Size:** medium.

### Section 7. Understand the lead's world

- **Asks for:** seven things, in the lead's words: what they are responsible for, who they are trying to move, how the group contributes to the economic engine, what they are seeing today, why it bothers them, what they think the group does not understand, and what the group would do differently if they did.
- **Exists:** setup already extracts an aim, a reason, people named, a cadence and a brief (`entry.service.ts`, `report()` and `onboard()`), and "Fills in as you talk" shows what has been caught (`client/src/pages/enter/FillsInAsYouTalk.tsx`, prototype `start-chat.txt`: "2 of 4 set").
- **Missing:** the seven fields as things the extraction holds and the card shows; the knowledge of who the lead is trying to move that may not be their reports (people across departments).
- **Who builds it:** engine for the fields (piece 4); screens for the card's seven lines (piece 3).
- **Prototype:** yes, "Fills in as you talk" is the part. The wording for the seven items is Hafsah's, from section 7.
- **Size:** medium for the engine, small for the screens.

### Section 8. Different lead scenarios

- **Asks for:** six lead types (chief executive, sales, project, delivery, product, finance), each with a typical complaint and the movement wanted. Groundwork adapts.
- **Exists:** the 17 situations and their packs (`api/src/modules/conversation/the-scenario-table.ts`, `docs/THE-SCENARIO-TABLE.md`, `docs/scenario-packs/`). The role map (`api/src/modules/suites/the-role-map.service.ts`).
- **Missing:** the six lead types as examples the pack listens for, not as separate packs.
- **Who builds it:** engine (piece 4).
- **Prototype:** no.
- **Size:** small, once piece 4 exists.

### Section 9. Groundwork should challenge the lead

- **Asks for:** six questions that test the lead's complaint (have you told them, how much context, is it expected from their role, do they know why now, could they do their job well and still fail this, are you asking for ownership while keeping every decision). Sometimes Groundwork tells the lead the problem may be missing context rather than missing ownership.
- **Exists:** "How the leading is landing" (decision 64): a reading of the lead's own setup, shown without the three-period rule (`api/src/modules/board/how-the-leading-is-landing-is-served-as-a-pattern.spec.ts`, `board.service.ts`). The "a goal the lead has not told" rules (decision 56). The standing rule that setup does not scold (`this-is-not-a-court`).
- **Missing:** the challenge inside the conversation itself, as a few well-placed questions and one honest sentence at the end, never a verdict.
- **Who builds it:** engine (piece 6).
- **Prototype:** no screen. The closest wording is "have you told Daniel about this worry yet?" in `start-chat.txt`, which is the same kind of question.
- **Size:** medium.

### Section 10. The third psychological trigger: hope

- **Asks for:** "Imagine a month from now and this is meaningfully better. What would you notice people doing without you having to ask?" The answers become the behavioural outcomes Groundwork watches for. Eleven examples are given.
- **Exists:** the lead's aim and what success looks like are kept (`GroundBaseline`, `successLooksLike`, schema line 1288), and the board can show them.
- **Missing:** this question, and keeping the answers as a short list of observable behaviours that the weekly work and the board look for.
- **Who builds it:** engine (piece 7).
- **Prototype:** no.
- **Size:** small to medium.

### Section 11. The lead's Groundwork is created

- **Asks for:** after the conversation the lead leaves chat and sees a board called "Help my team understand", "One-month Groundwork", with six parts: what you are carrying, what you need the team to understand, who you are trying to move, what you are seeing today, what meaningful change would look like, what Groundwork will explore.
- **Exists:** the step after the setup chat is a review page, "Set up from your conversation. Change anything before it starts" (`#/new/setup`, `client/src/pages/enter/TheSetup.tsx`), then the lead's first check-in (`#/new/first`). The board shell exists (`client/src/pages/board/BoardPage.tsx`).
- **Missing:** the personalised reveal built from section 7's seven fields; the six parts as served fields; the rule that "what you are carrying" and "what you are seeing today" are the lead's alone (Needs Hafsah 8).
- **Who builds it:** engine for the served parts (piece 8); screens for the reveal page (piece 9).
- **Prototype:** no exact screen. `new/setup` is the nearest. The reveal is a new screen using the prototype's board parts.
- **Size:** medium engine, medium screens.

### Section 12. Show exactly how Groundwork will help

- **Asks for:** on the board, "How I'll work with your team": eight verbs (understand, connect, encourage, challenge, act, follow through, cross-reference, surface patterns), each with a sentence.
- **Exists:** the engine already does most of it: asks for proof, brings back earlier words, remembers commitments, finds differences, finds patterns (`docs/engine-value.md`).
- **Missing:** the eight sentences as plain text on the board. "Surface patterns" has to agree with decision 8 (three periods) and decision 39 (the person answers first); see Needs Hafsah 14.
- **Who builds it:** engine for fixed words (piece 8); screens draw them (piece 9).
- **Prototype:** no.
- **Size:** small.

### Section 13. Add up to 20 people

- **Asks for:** "Who needs to be part of this?" and "Add up to 20 people. They don't need to report directly to you...". Name and email, an optional "What do they do / why are they part of this?", then "Start my Groundwork."
- **Exists:** the people step already takes names and emails, pasted lists, a link, a QR code, and guests (`#/new/setup`, `TheSetup.tsx`; `entry.service.ts`, `commit()`); a per-person note exists (`remitAsGiven`, the lead's invite note, never shown to the person: decision 30); seat counting (`api/src/common/seats.ts`). The check-in limit is 200, not 20.
- **Missing:** a 20-person limit for this scenario's month, with a plain sentence when it is reached; the section's wording on the page; "Start my Groundwork" as the button; whether the 20 includes the lead (Needs Hafsah 3).
- **Who builds it:** engine for the limit (piece 10); screens for the wording (piece 11).
- **Prototype:** yes, `A3`/`B1-starting-a-check-in/setup.txt` ("Who's in it", "Start it and invite 4 people"). Use its design with Hafsah's words.
- **Size:** small engine, small screens.

### Section 14. The team invitation psychology

- **Asks for:** an email "Hafsah is trying a different way to help the team get on the same page", with a button "Start your first check-in".
- **Exists:** the invitation email (`api/src/modules/email/email.service.ts`), its page (`client/src/pages/invite/InvitePage.tsx`, `client/src/pages/join/`), the WhatsApp invitation template (`docs/whatsapp-templates.md`). The prototype's invitation page (`A3/join-invite.txt`) and the invitation email (`C1/every-email-and-message.txt`).
- **Missing:** the scenario's own invitation, with Hafsah's words. It says Groundwork will "privately" check in and that the lead "has shared what she's seeing". Both need Hafsah before they are written (Needs Hafsah 1 and 8).
- **Who builds it:** engine for the email and WhatsApp wording (piece 10); screens for the invitation page (piece 11).
- **Prototype:** yes for the page and the email. The page's current sentence is "The people in this check-in, including your manager, can see what you say in it."
- **Size:** small.

### Section 15. Team baseline

- **Asks for:** before any coaching, each person is asked, naturally, what they are working on, what matters most, what they are responsible for, what success looks like, what they think the lead is most concerned about, what makes work difficult, who they depend on, who depends on them, and what the team could do better. Groundwork then compares lead reality with team reality.
- **Exists:** a first session that establishes a person's picture (the "first" cell of each situation in `the-scenario-table.ts`); the list of who depends on whom (`GroundDependency`, `api/src/modules/board/` handoffs); "Where you both see it differently" (`api/src/modules/board/who-sees-this-differently.ts`; `B5/board-as-lead.txt`).
- **Missing:** this scenario's first-session questions (nine of them) and the rule that the lead's setup sentences are never quoted to the participant (decision 75 item 13). The comparison already exists as the board's "differences" idea; it needs the lead's seven setup fields as the lead's side.
- **Who builds it:** engine (pieces 14 and 15). Screens: none beyond the board part in piece 20.
- **Prototype:** the check-in screens yes (`B3-the-check-in/check-in-start`); no wording for the nine questions.
- **Size:** large (two pieces of medium).

### Section 16. The psychological journey for team members

- **Asks for:** seven deliberate steps: hear me, help me see, value me, give me agency, help me act, remember me, show that I matter.
- **Exists:** hear and remember are built (the record, `what-you-told-me-before.ts`, brought-back words in the engine-value list). Act is built as commitments (`Commitment`, `GroundCommitment`). Show that I matter exists only as the participant's own board and report (`B5/board-as-participant`, `B3/done`).
- **Missing:** "help me see" (context the person had not connected, given as part of the session), "value me" (piece 17), "give me agency" (asking what they think could happen), "show that I matter" (their contribution made visible; Needs Hafsah 9).
- **Who builds it:** engine (pieces 15, 16, 17); screens only where the person's own Done page gets a line (piece 18).
- **Prototype:** `B3/done` is the nearest.
- **Size:** large, spread across the pieces named.

### Section 17. The carrot principle

- **Asks for:** reinforce movement and agency disproportionately. Four plain sentences are given: for a useful connection, for ownership beyond the job, for an idea ("That sounds worth capturing. Would you like to put it forward?") and for evidence ("Is there anything from the conversation ... that would help Groundwork understand where this now stands?").
- **Exists:** a standing rule against praise (`api/src/modules/conversation/nothing-here-is-pleased-with-you.ts`). The prototype's session says "Good news first: ..." (`B3/check-in-start.txt`), which reports a fact rather than praising. Proof is asked for in a way the scorer measures ("proof asked for (turns)", `docs/engine-value.md`).
- **Missing:** a rule for this scenario that allows one plain sentence naming what the person did and what it affected, while keeping the ban on grading plans and on enthusiasm. The softer evidence question, with the order unchanged (systems first, then proof, decision 12).
- **Who builds it:** engine (piece 16). This is Needs Hafsah 5 and 6.
- **Prototype:** no.
- **Size:** medium.

### Section 18. Ideas become visible contributions

- **Asks for:** Groundwork recognises an idea inside the conversation, offers to capture it ("Want me to capture it for the team?"), and on a yes the lead sees "Ideas from your team", each with a title, who raised it, and "Similar needs have appeared across three check-ins."
- **Exists:** nothing. A search for "idea" in the engine finds only words inside prompts and pattern names. The nearest records are suggestions (`Suggestion`, schema line 2967, which are about a person's outcome and are not the same thing) and the lead's to-dos (`Todo`).
- **Missing:** a record of an idea (the words, who raised it, the check-in and session, the yes); recognising an idea in the model's reading of a session; the say-back and the yes (decision 12); grouping similar ideas across sessions; the board section; what other people see (Needs Hafsah 10).
- **Who builds it:** engine (piece 19); screens for the yes button on the person's side and the board section (pieces 20 and 21).
- **Prototype:** no screen or part. The row layout of a board section can be reused.
- **Size:** large (medium engine plus medium screens).

### Section 19. Hidden contributors surface

- **Asks for:** a board section "People helping the team move" with a sentence for each person, such as "Connected a project delay to a renewal risk and raised it before it became a customer issue."
- **Exists:** "Help nobody mentioned" on the lead's board (`api/src/modules/board/help-nobody-mentioned.ts`; prototype `B5/board-as-lead.txt`), built from colleagues naming a person (`WorkMention`, schema line 2176); a contribution and coverage read (`api/src/modules/board/coverage.ts`); "somebody carrying work with no account" (`api/src/modules/board/somebody-carrying-work-with-no-account.ts`). Decision 93 removed the admin-only hiding of that section.
- **Missing:** the sentence the scenario shows for each person in the person's own work rather than only a count of colleagues' mentions; the kinds listed in the section (connect information, unblock others, spot opportunities, and so on) as things the reading listens for; whether the person is ever told (Needs Hafsah 8 and 9).
- **Who builds it:** engine (piece 22); screens (piece 23).
- **Prototype:** yes. "Help nobody mentioned" is the part, with this section's words.
- **Size:** medium engine, small screens.

### Section 20. Weekly employee check-ins

- **Asks for:** grounded in real work, not a curriculum. Groundwork knows what the person was doing, committed to, the larger aim, relevant people, objectives, projects and open issues, and asks "What moved since we last spoke?" or "You were going to speak to James. What happened?"
- **Exists:** this is how check-ins already work after the first session. Last time's words come back (`what-you-told-me-before.ts`), commitments are read back (`a-commitment-is-read-back-from-a-commitment.ts`), and the "second" cell of each situation asks what changed since last time. The prototype shows the same (`B3/check-in-start.txt`).
- **Missing:** a light connection back to the wider context at the end of a person's answer ("lightly connects that work back"), which is the "help me see" step.
- **Who builds it:** engine (piece 15).
- **Prototype:** yes.
- **Size:** small to medium.

### Section 21. Groundwork discovers the work graph

- **Asks for:** from what people say, Groundwork notices people, projects, objectives, dependencies, commitments, customers, decisions, recurring blockers and ideas, and recommends further Grounds when it understands the work: a separate Ground for two people who expect different things, a Project Ground, an Objective (OKR) Ground.
- **Exists:** dependencies and blockers on the board (`GroundDependency`), commitments (`Commitment`), objectives (`Subject`, `GroundObjective`), people (`Person`), the role map, and the engine's own `Recommendation` table (schema line 3814, kinds todo, objective draft, owner needed, dependency record, conversation needed), written by `api/src/modules/detectors/detectors.service.ts`. No client file shows a `Recommendation`.
- **Missing:** three recommendation kinds (a Ground for a pair, a project Ground, an objective Ground) with their wording; a rule that a recommendation uses only this one Ground's check-ins; a screen that shows them; and the lead's yes before anything is created or anyone is invited (decision 12). Nothing is a product advertisement.
- **Who builds it:** engine (piece 24); screens (piece 25).
- **Prototype:** no screen. The nearest is the board's "What needs you" cards (`B5/board-as-lead.txt`).
- **Size:** large.

### Section 22. Suites reveal themselves contextually

- **Asks for:** when a person says "I'm taking Friday off" or "I need $4,000 approved", Groundwork offers the right suite in the conversation (Leave, Payment Requests), and for a recurring people issue offers Performance as a separate structured place.
- **Exists:** leave, hours and spending said in chat and said back before anything happens (`api/src/modules/suites/leave-said-in-chat.ts`, `spend-said-in-chat.ts`, `hours-said-in-chat.ts`); in a check-in, the single question "Shall I treat this as a leave request?" (decision 82 item 2); the ten suites and their switches (`the-ten-suites.ts`, `OrganizationSuite`); approvals on WhatsApp (decision 82 item 1).
- **Missing:** the offer when the suite is switched off, worded for the right reader; the offer for a recurring people issue (Needs Hafsah 11); the buttons "Request leave" and "Create request" in this scenario's words.
- **Who builds it:** engine (piece 26); screens for the two buttons in the chat (piece 27).
- **Prototype:** yes for the suites (`E-suites/*`); no for an offer inside the chat.
- **Size:** medium.

### Section 23. Weekly lead WhatsApp

- **Asks for:** every week a useful insight on WhatsApp, not a notification: how many people connected their work to the wider outcome, how many contributed ideas, a named person who surfaced a risk, one pattern that still needs attention, what Groundwork is doing, and a link "See this week's picture". It must be valuable even if the lead does not click. Email carries the fuller summary.
- **Exists:** the lead's daily summary on WhatsApp (`api/src/modules/whatsapp/the-leads-daily-summary.ts`, scheduled in `api/src/modules/grounds/grounds.cron.ts` at seven in the morning in Lagos). It says how many have checked in and who has not, and it never says what anybody said. The eight approved-wording templates are in `docs/whatsapp-templates.md`. The prototype shows "One weekly letter, written for each person" by email (`C1/every-email-and-message.txt`); a search of the engine finds no weekly letter, so that is missing too.
- **Missing:** the weekly insight as a ninth template; its builder from the month's record; the weekly lead email; and a decision on how it fits decisions 13, 82 and 83 (Needs Hafsah 2).
- **Who builds it:** engine only (pieces 28 and 29). The link opens the board, which already exists.
- **Prototype:** the weekly email yes, the WhatsApp insight no.
- **Size:** large (two mediums, plus Meta's approval of the template, which is outside the code).

### Section 24. Lead board during the month

- **Asks for:** the top question "Are we moving together?"; four lenses (Understanding, Ownership, Contribution, Action) each a question; then six parts: what's moving, what the team is contributing, people helping things move, where perspectives differ, what's still getting in the way, what Groundwork is working on next.
- **Exists:** the board with its judgement, "What needs you", the team today, blockers, "What keeps coming up" (patterns), "Where you both see it differently", "Where this is heading" (`board.service.ts`, `BoardPage.tsx`, `TheSwitchboardsSections.tsx`). The board only changes when something new comes in (decision 7). Board families decide the shape (`board-families.ts`).
- **Missing:** a board family for this scenario; the four lenses as plain sentences, never scores (decision 11 and decision 94); "what's moving" as positive evidence; "what Groundwork is working on next" as a served part; the rule for weeks 1 and 2 when no pattern has reached three periods (Needs Hafsah 14).
- **Who builds it:** engine (pieces 12 and 13); screens (pieces 20 and 21).
- **Prototype:** the board yes, the lenses no. The board's parts are reused.
- **Size:** large.

### Section 25. The month-long emotional arc

- **Asks for:** four weeks with a lead reaction and an employee reaction each: perspectives, understanding, ownership, and a before-and-after.
- **Exists:** nothing as a plan, but each week is what the weekly sessions already produce.
- **Missing:** the engine knowing which week of the month it is, so its focus changes (week one listens, week two connects, week three asks for ideas and commitments, week four gathers before and after), and a stored "before" to compare with at week four.
- **Who builds it:** engine (inside pieces 14, 15 and 31). Screens: none.
- **Prototype:** no.
- **Size:** small to medium.

### Section 26. Groundwork manages engagement itself

- **Asks for:** nudges that sound like Groundwork remembering ("You mentioned you'd try something with the client this week. I'd love to hear how it went."), and the lead sees "18/20 active · Groundwork has nudged the remaining 2."
- **Exists:** reminders and nudges by email and WhatsApp (`api/src/modules/conversation/remind.service.ts`, `chasing-belongs-to-the-lead.ts`, `who-is-worth-nudging.ts`; WhatsApp reminders in `grounds.cron.ts`); the "N of M have answered" count that leaves out anyone not yet let in (decision 77, `api/src/modules/grounds/who-an-admin-did-not-let-in.ts`); the stale-session warning.
- **Missing:** nudges worded from the person's own last commitment; the "active" count and the nudged count as a served line. Whether a message outside the app may repeat a person's own words (Needs Hafsah 7).
- **Who builds it:** engine (piece 30); screens draw one line (piece 31).
- **Prototype:** "Waiting on Omar" and "Hasn't checked in today" yes (`B5/board-as-lead.txt`); the nudge wording no.
- **Size:** medium.

### Section 27. Show the lead the rest of Groundwork during the trial

- **Asks for:** on the board, "Groundwork recommends" (for example "Nairobi Project Ground, 5 people, recurring dependencies") and "Your team also needed" (Leave, Payment Requests, Performance, each with a count).
- **Exists:** the recommendation records (section 21) and the suites list (section 22). The Suites page (`E-suites/suites-lead`).
- **Missing:** the counts of needs that came up where the suite is not on; the two board sections.
- **Who builds it:** engine (piece 27's counts and piece 24); screens (pieces 25 and 27).
- **Prototype:** `E-suites/suites-admin` and `suites-lead` for the suite names; no part for the recommendation.
- **Size:** medium.

### Section 28. End-of-month conversion

- **Asks for:** a final page that begins with the lead's own first words ("You wanted your team to understand ...") and then eight parts: what we found, what they now understand differently, what they're doing differently, what your team contributed, people who helped move the thinking, what you changed as a lead, what's still stuck, what should happen next.
- **Exists:** an ending flow and a final report: `client/src/pages/grounds/EndingPage.tsx`, `/grounds/:id/end`, "How does this end?" (`B6-ending-a-check-in/ending-and-probation-review`), the closing synthesis and "against success" read (`api/src/modules/reports/reports.service.ts`, `the-four-reports.ts`), the 30/60-day prototype pictures (`B6/day-30-and-60`). The lead's own first words are kept (the brief; `GroundBaseline.successLooksLike`).
- **Missing:** this scenario's month-in-review read, built from the record and not rebuilt when opened (decision 7), with before-and-after evidence; "what you changed as a lead", which is the setup reading (decision 64) at the end of the month; the page itself.
- **Who builds it:** engine (piece 32); screens (piece 33).
- **Prototype:** `B6` is the nearest.
- **Size:** large.

### Section 29. Then reveal what they've already built

- **Asks for:** "This started as one Ground." Counts of projects that could have their own Ground, shared objectives, working relationships needing alignment, active commitments, team ideas and relevant suites; then four continue options.
- **Exists:** the counts' sources: `GroundDependency`, `Commitment`, `Recommendation`, `OrganizationSuite`. The upgrade page for the end of a trial (`F2-billing/upgrade.txt`, "When the free 3 months end", `client/src/pages/billing/`).
- **Missing:** the counts assembled for one Ground; the four options wired to what they do ("Keep this Ground running" and "Continue Groundwork for the team" to the plan choice; "Start recommended Grounds" to piece 24; "Turn on relevant suites" to the suites page). Payment is a test-mode flow only (Needs Hafsah 4).
- **Who builds it:** engine (piece 32); screens (piece 33).
- **Prototype:** `F2/upgrade` for the plan choice only.
- **Size:** medium.

### Section 30. The ultimate conversion logic

- **Asks for:** nothing to build. It says what the lead and the employee must have felt for the product to earn a subscription, and that it must never feel like monitoring.
- **Exists:** the product's privacy rules.
- **Missing:** a check, after the first real lead has used it, that the board reads as the section says. This is the reviewer's check, not a build.
- **Who builds it:** nobody. It is the reviewer's test of every piece.
- **Prototype:** no.
- **Size:** none.

---

## 2. Needs Hafsah

Nothing below has been decided by this plan. Each one has the scenario's words, the decision's or prototype's words, and a recommendation. The numbers are used above.

**1. "Privately" in the hook and the invitation.**
- *Scenario (sections 5, 14):* "For one month, Groundwork will work privately with you and your team" and the invitation "Groundwork will privately check in with everyone".
- *Decision 4 and the prototype:* what people say in check-ins can be shown word for word to the people in that check-in, and there is no switch for it. The invitation page says: "The people in this check-in, including your manager, can see what you say in it. Your questions to Ask Groundwork stay private."
- *Recommendation:* use "one to one" instead of "privately" in the hook and email ("Groundwork will check in with each person one to one"), and keep the prototype's sentence on the invitation page. The promise "privately" is one the product would not keep for the lead's reading. Decision 86 forbids adding a restriction that is not Hafsah's, so the other way, hiding the words from the lead, is not recommended unless Hafsah says so.

**2. The weekly lead WhatsApp insight next to the daily summary.**
- *Scenario (section 23):* once a week, a WhatsApp that names what people did ("Lucy surfaced a customer risk nobody else had raised") and counts people ("8 people connected their work ...").
- *Decisions 13, 82 item 9, 83:* Groundwork writes first on its own at most once a day. The daily summary is "Groundwork's one message of the day for that lead" and carries only what the lead can see in the app, saying "nothing anybody said". Decision 83 fixes eight templates and at most one message a day, two on opening or closing days. Decision 78: WhatsApp is a paid add-on. Meta has not approved any template yet.
- *Recommendation:* make the weekly insight the one message on one chosen day each week for an anchor lead (replacing that day's daily summary, so the limit is kept). A ninth template, sent only on the lead's WhatsApp opt-in, included in the trial without the add-on's charge. In the WhatsApp itself, counts and one sentence about what Groundwork is working on, with names on the board only. If Hafsah wants names in the WhatsApp, she should say so, because it breaks "nothing anybody said" for that message. The fuller version goes by email, as the prototype's weekly letter.

**3. The one-month free trial for "up to 20 people".**
- *Scenario (sections 1, 5, 13):* free for one month, with up to 20 people.
- *Decisions 21, 78 and the prototype:* the trial is for teams of fewer than 20 people (`pricing.freeTrial`, `teamsUnder: 20`, `months: 1`, off until Hafsah switches it on). Small Team is "up to 20" for $90 a month. The prototype's pricing page still says "3 months" (`F2-billing/pricing.txt`). The trial's sentence stays off until billing really gives the trial.
- *Recommendation:* decide whether 20 includes the lead. If the lead plus 20 people is 21 seats, the team does not fit Small Team after the month and would need Growth at $400. Count 20 as including the lead (the lead plus 19), so the same Small Team plan covers it. Give the anchor trial from its own setting (for example `pricing.anchorTrial`, off), so `pricing.freeTrial` and the paid client are untouched, and say "for a month" on any screen only while that setting is on.

**4. Continue options at the end, and real payment.**
- *Scenario (section 29):* four options, ending in "Continue Groundwork for the team".
- *Decision 78 item 4:* Stripe in test mode only. Nothing about real billing changes until the trial setting is switched on. Billing's live wiring is Abubakar's.
- *Recommendation:* build the four options to the existing plan choice (`F2-billing/upgrade.txt`) and test mode. Real charging waits for Abubakar and for Hafsah to switch the trial on. Piece 33 is not blocked from being built, only from being turned on.

**5. The carrot principle against the rule that Groundwork never praises.**
- *Scenario (section 17):* "That's useful—you've connected something happening in delivery to a wider customer consequence." and "That's useful ownership."
- *Existing rule:* `NOTHING_HERE_IS_PLEASED_WITH_YOU`: never call a plan good, great or smart, never "enthusiasm you do not have", recognise what someone is carrying but never rate what they have done.
- *Recommendation:* allow, in this scenario's participant sessions only, one plain sentence that says what the person did and what it affected, with no grading adjective ("That connects the delay in delivery to the customer's renewal."). Keep the ban on praising plans and on enthusiasm everywhere else. The scenario's own wording uses "useful", which is closer to a grade than to a fact, so Hafsah should say whether "useful" is allowed.

**6. The softer evidence question against decision 12.**
- *Scenario (section 17):* "Is there anything from the conversation ... that would help Groundwork understand where this now stands?"
- *Decision 12 and the scorer:* claims are checked systems first, then proof, and until then they are the person's word, followed up. "Asks for proof" is a measured number in `docs/engine-value.md`.
- *Recommendation:* use the scenario's words for the ask in this scenario, keep the order (systems, then proof, then the person's word), and prove on the scorer that the number does not drop.

**7. Nudges and messages that repeat a person's own words.**
- *Scenario (section 26):* "You mentioned you'd try something with the client this week."
- *Prototype:* "Every email and WhatsApp message says what it's for, never includes what anyone said" (`C1/every-email-and-message.txt`). The same screen shows a weekly letter that tells a person what they themselves did.
- *Recommendation:* a nudge inside the app, or in the person's own weekly letter, may repeat that person's own commitment to them and to nobody else. A WhatsApp template carries no one's words and says only that the check-in is open and starts from last time, as `checkin_open` does today.

**8. What the lead has shared, and the invitation's "Hafsah has shared what she's seeing".**
- *Scenario (sections 11, 14, 16):* the board holds "What you're carrying" and "What you're seeing today"; the invitation says the lead has shared what she's seeing; "Help me see" gives participants context.
- *Decisions 30, 75 item 13, 56 and CLAUDE.md:* a participant never reads the lead's judgement, a lead's private description of a person never reaches that person, the lead's setup brief is never quoted into a participant's check-in, a goal the lead has not told stays hidden.
- *Recommendation:* "What you're carrying" and "What you're seeing today" stay the lead's alone. "What you need the team to understand" is said back to the lead, and reaches the team's sessions only once the lead says so (like telling a goal). The invitation says "Hafsah has shared what she is trying to get across" only when that has happened; otherwise it says the lead wants to hear their side.

**9. Hidden contributors and being told "your contribution was noticed".**
- *Scenario (sections 16, 19):* people named on the board for what they did; the person's contribution "becomes visible ... through recognition".
- *Existing rule and decision 11:* what a colleague said about a person (`WorkMention`) is "never shown to the person it is about", and "You see the help, not who said it". No scores, no ranking, no labels on a person (decision 11, CLAUDE.md).
- *Recommendation:* name a person on the board only for something specific they did, in a sentence, never as a category and never ordered or counted per person. Tell a person only what they said or did in their own check-in, never that a colleague named them, unless that colleague agrees. The headings "People helping the team move" and "People who helped move the thinking" can stay.

**10. Who sees an idea.**
- *Scenario (section 18):* "Want me to capture it for the team?" and "Raised by Lucy."
- *Decision 4, decision 75 item 14, and the check-in's "who sees" setting:* people see each other only where the check-in lets them.
- *Recommendation:* after the yes, the lead sees the idea with the name. Other participants see it only where the check-in already lets people see each other. "Similar needs have appeared across three check-ins" is always shown without names.

**11. The offer of Performance.**
- *Scenario (section 22, 27):* "This sounds like an ongoing performance matter ..." and "Performance — 1 recurring management issue" on the board.
- *Decisions 6, 17, 85, and "no labels on people":* a verdict is reached only in evaluation check-ins, people never see it as a label, and a "patterns observed" line about one person was already marked for Hafsah to confirm.
- *Recommendation:* in the chat, never call what someone raised a "performance matter" about anybody. Say that the Performance reviews suite is where a recurring people issue can be handled, and offer it to the person only if they are the lead. On the board, show a count and the suite, with no name. A suite that is off is offered to the lead or admin, not to a participant ("your organisation also has the option ..." is said to the lead).

**12. The anchor as a new situation.**
- *Scenario:* a main entry scenario of its own.
- *CLAUDE.md and `docs/THE-SCENARIO-TABLE.md`:* the 17 situations keep working exactly as now, and the switchboard decides a board for every situation.
- *Recommendation:* add one new situation key (for example `HELP_TEAM_UNDERSTAND`), with its own row in the table and its own board family, offered only from the anchor link and never by the classifier or the "all situations" list until Hafsah says. The 17 are untouched, and the 24-scenario run and its baseline are not changed. The anchor gets its own journey run instead.

**13. "No need to create an organisation first" against the prototype's "Where do you work?"**
- *Scenario (section 1):* no organisation first.
- *Prototype (`A3/welcome.txt`) and decision 22:* "Where do you work? ... Create a new organisation", with the name suggested from the email domain.
- *Recommendation:* for the anchor link, skip that page. After the email link, the organisation is made automatically, named from the domain (or from the lead's name if the email is a public provider), and the name can be changed in Settings. The "join an organisation you belong to" offer for a work domain stays.

**14. Patterns in the first weeks.**
- *Scenario (sections 12, 24, 25):* the board names "patterns requiring intervention" and the first week reaches "They see things I didn't know".
- *Decisions 8, 39, 57, 86:* patterns show only after three periods, and a period is at least a week; the person sees theirs first.
- *Recommendation:* keep the rule. In weeks one and two, "what's still getting in the way" uses blockers and differences from the record, not patterns, and the patterns appear from week three. This is how the product works today.

**15. The lead's own first check-in.**
- *Scenario (section 13):* "Start my Groundwork" invites the team straight away.
- *Decision 28 and the prototype (`B1/first-check-in.txt`):* the setup is not the lead's first check-in, and the lead's own account is the first one in, so the others are read against it.
- *Recommendation:* the invitations go out at "Start my Groundwork". The lead's setup conversation is the lead's side for the comparison, and the lead is still offered their own check-in right after (decision 28), but it is not required first.

---

## 3. The switch

**The setting.** `release.anchorScenario`, stored as `{ "on": false }` in `platform_settings`, exactly like `release.contextInAskGroundwork` and `release.planAndBillingNewParts`. It is read in one place, `api/src/modules/admin/what-is-hidden-at-release.ts` (the same helper `aSwitch`), as a new exported function `theAnchorScenarioIsOn(prisma)`. It is off unless the row says `{ "on": true }`, and a bad or missing row reads as off. It is listed in `docs/deploy.md`'s "Hidden at release" list and in `docs/release-checklist.md`.

**What it decides.** Whether a new anchor Ground can be started. A Ground already started from the anchor link keeps behaving as an anchor Ground even if the setting is later turned off, the same rule `aKindMayBeGiven` uses for a kind a check-in already holds. A Ground is an anchor Ground because it has the new situation key (Needs Hafsah 12), so no other flag is stored.

**What it never changes.** Existing check-ins, the paid client's release, the 17 situations, `release.boardKindsOffered`, billing, `pricing.freeTrial` (anchor has its own setting, Needs Hafsah 3) and WhatsApp's existing templates and limits.

**Every place the switch must be checked** (each gets a test that says "with the setting off, this is exactly as before"):

1. **The entry link** (`entry.controller.ts`, the new anchor route). Off: the route answers "not available" and the client redirects to `/start`.
2. **The situation lists.** The classifier prompt (`api/src/modules/entry/which-situation-this-is.ts`, `SCENARIO_KEYS`), the "all situations" list on the client (`client/src/pages/enter/EverySituation.tsx`), and `scenario-catalog.ts`: the new key is in none of them while off, and is never returned by the classifier at any time until Hafsah decides.
3. **The conversation pack selection** (`api/src/modules/conversation/the-scenario-table.ts`, `prompt-library.ts`, `conversation.service.ts`): the anchor pack and the carrot rule are used only for a Ground with the anchor key.
4. **The prompt version.** The anchor prompts live under their own key in the prompt service (`api/src/modules/prompts/prompts.service.ts`), so a stored `PromptVersion` can override them, and every anchor report records `promptVersionId`. A test proves the running version is the new one.
5. **Commit and the 20-person limit** (`entry.service.ts`, `commit()`, `how-many-people-one-check-in-holds.ts`): the limit of 20 applies only to an anchor Ground.
6. **The board** (`board-families.ts`, `board.service.ts`): the new family and the new sections exist only for the anchor key, so every other board is served the same bytes.
7. **The invitation** (`email.service.ts`, `docs/whatsapp-templates.md`'s invitation, `client/src/pages/invite/InvitePage.tsx`): the anchor wording only for an anchor Ground.
8. **Ideas, hidden contributors, recommendations, suites offered**: written and served only for anchor Grounds (their detectors in `api/src/modules/detectors/`, `api/src/modules/board/`, `api/src/modules/suites/`).
9. **The weekly WhatsApp insight and the weekly lead email** (`api/src/modules/grounds/grounds.cron.ts` or a new cron): the job loops over anchor Grounds only, only where the organisation has turned WhatsApp on (`only-where-whatsapp-is-turned-on.ts`), and it counts toward the one message of the day (`howOftenToday`).
10. **Nudges and the "active" line** (`api/src/modules/conversation/remind.service.ts`): the new wording and count only for anchor Grounds.
11. **The end-of-month read and page** (`api/src/modules/reports/`, `client/src/pages/grounds/EndingPage.tsx`): the month-in-review read exists only for anchor Grounds.
12. **The anchor trial** (`api/src/modules/billing/the-free-trial.service.ts` or a sibling): grants only when both the anchor switch and `pricing.anchorTrial` are on.
13. **What the client is told.** The board and the entry read serve `anchorScenarioOn` (like `kindsOffered` at `board.service.ts` line 775), so screens hide the landing and the sections without guessing.
14. **The scorer and the 24-scenario run.** Neither is changed. The anchor's journeys run separately, under `api/journey/`, so the baseline is never touched.

---

## 4. The build order

The order follows decision 94's list. Each piece is small enough for one builder. E is engine (`api/`), S is screens (`client/`). "Blocked" names the Needs Hafsah number that must be answered first. Every prompt piece ends with a scenario run and the scorer (`tools/score_run.py --against docs/baseline.json`), and the number may not drop.

| # | Piece | Who | Files it touches | Size | Blocked |
| --- | --- | --- | --- | --- | --- |
| 0 (done, 4 October) | The switch `release.anchorScenario`, and `anchorScenarioOn` served to the client | E | `modules/admin/what-is-hidden-at-release.ts`, `modules/board/board.service.ts`, `modules/entry/entry.controller.ts`, `docs/deploy.md` | small | no |
| 1 | The entry link: a route that starts an anchor draft with a source mark, no organisation first | E | `modules/entry/entry.controller.ts`, `entry.service.ts`, `prisma/schema.prisma` (a source mark on `EntryDraft` plus migration), `modules/auth/` (automatic organisation naming) | medium | 12, 13 |
| 2 | The landing page, with Hafsah's words, entering the conversation | S | `client/src/App.tsx`, `client/src/pages/enter/`, `client/src/pages/enter/the-way-in.ts` | medium | 3 (the words "for a month") |
| 3 | "Fills in as you talk" holds the seven items of section 7 | S | `client/src/pages/enter/FillsInAsYouTalk.tsx` | small | no |
| 4 | The anchor situation, its first question, its probes and the seven extracted fields | E | `modules/conversation/the-scenario-table.ts`, `prompt-library.ts`, `modules/entry/entry.service.ts`, `prisma/schema.prisma` (the new key), `modules/prompts/`, `docs/THE-SCENARIO-TABLE.md` | large | 12 |
| 5 (done, 4 October) | Discovering the economic engine, never assuming revenue means sales | E | `modules/conversation/` (new file), `modules/entry/entry.service.ts` | medium | no |
| 6 (done, 4 October) | Challenging the lead, and the honest "missing context" sentence | E | `modules/conversation/` (new file) | medium | no |
| 7 (done, 4 October) | The hope question and the list of behaviours to watch for | E | `modules/conversation/`, `modules/entry/entry.service.ts` | small | no |
| 8 | The lead's reveal, served: the six parts and the eight "How I'll work" lines | E | `modules/board/board-families.ts`, `board.service.ts` | medium | 8, 14 |
| 9 | The reveal page | S | `client/src/pages/enter/TheSetup.tsx`, `client/src/pages/board/` | medium | no |
| 10 | Up to 20 people, and the invitation's wording (email and WhatsApp) | E | `modules/entry/entry.service.ts`, `how-many-people-one-check-in-holds.ts`, `modules/email/email.service.ts`, `docs/whatsapp-templates.md` | medium | 1, 3, 8, 15 |
| 11 | The people step and invitation page, in Hafsah's words | S | `client/src/pages/enter/TheSetup.tsx`, `client/src/pages/invite/InvitePage.tsx` | small | 1, 8 |
| 12 | The month board, part one: "Are we moving together?" and the four lenses, in sentences | E | `modules/board/board-families.ts`, `board.service.ts` | large | 14 |
| 13 | The month board, part two: what's moving, contributing, where perspectives differ, still in the way, working on next | E | `modules/board/board.service.ts`, `who-sees-this-differently.ts` | medium | 14 |
| 14 | The team baseline: the nine first-session questions, and the lead's side for the comparison | E | `modules/conversation/the-scenario-table.ts`, `prompt-library.ts`, `modules/board/who-sees-this-differently.ts` | large | 8 |
| 15 (done, 4 October) | The weekly employee check-in: what moved, the commitments back, a light connection to the wider context. Stored as the prompt `anchor_participant_conversation`; used for a person who is not the lead, in session 2 or later, of a check-in started from the anchor link (`grounds.started_from`, written when the anchor conversation is saved with the switch on). | E | `modules/conversation/the-anchor-weekly-check-in.ts`, `conversation.service.ts`, `entry.service.ts`, `prisma/schema.prisma` (one empty column plus migration 82) | medium | no |
| 16 | The carrot principle: the sentence for a connection, for ownership, and the softer evidence ask | E | `modules/conversation/nothing-here-is-pleased-with-you.ts` (an exception, not a removal), `prompt-library.ts` | medium | 5, 6 |
| 17 (done, 4 October) | Giving agency: asking what the person thinks could happen, and turning it into a commitment only after their yes. The words are part of the stored prompt `anchor_participant_conversation`. The yes is read from the record, and their own words are written the way the check-in writes everything a person says they will do (`GroundCommitment`, read back next session). The carrot principle (piece 16, Needs Hafsah 5 and 6) is still open: nothing here praises. | E | `modules/conversation/giving-the-person-agency.ts`, `conversation.service.ts` | medium | no |
| 18 | The person's own Done page line | S | `client/src/pages/chat/`, `B3/done` | small | 9 |
| 19 | Ideas: the record, spotting an idea, the say-back and the yes, grouping similar ones | E | `prisma/schema.prisma` (a new table plus migration), `modules/assistant/`, `modules/conversation/` | large | 10 |
| 20 | The board parts for ideas and the lenses on the lead's board | S | `client/src/pages/board/` | large | 10, 14 |
| 21 | The yes button for an idea in the person's check-in | S | `client/src/pages/chat/ChatPage.tsx` | small | 10 |
| 22 | Hidden contributors: a sentence for each person from their own work | E | `modules/board/help-nobody-mentioned.ts`, `coverage.ts` | medium | 9 |
| 23 | The "People helping the team move" part | S | `client/src/pages/board/` | small | 9 |
| 24 | Recommended check-ins: three kinds, from this Ground only, with the lead's yes | E | `modules/detectors/detectors.service.ts`, `Recommendation` (new kinds), `modules/entry/entry.service.ts` | large | no |
| 25 | "Groundwork recommends" on the board, opening a prefilled new check-in | S | `client/src/pages/board/`, `client/src/pages/enter/TheSetup.tsx` | medium | no |
| 26 | Suites offered when needed: the offer, when the suite is off, and the recurring-issue wording | E | `modules/suites/`, `modules/assistant/what-the-assistant-can-do.ts`, `modules/assistant/` | medium | 11 |
| 27 | "Your team also needed": counts of needs surfaced, and the two chat buttons | E and S | `modules/suites/`, `client/src/pages/chat/`, `client/src/pages/suites/` | medium | 11 |
| 28 | The weekly lead WhatsApp insight: the template, its builder and its cron | E | `modules/whatsapp/` (new file beside `the-leads-daily-summary.ts`), `a-message-outside-the-window.ts`, `modules/grounds/grounds.cron.ts`, `docs/whatsapp-templates.md` | large | 2 |
| 29 | The weekly lead email, the prototype's "one weekly letter" | E | `modules/email/email.service.ts`, `modules/reports/` | medium | no |
| 30 | Nudges from the person's last commitment, and the "18/20 active" line served | E | `modules/conversation/remind.service.ts`, `modules/board/board.service.ts` | medium | 7 |
| 31 | The "active" line on the board | S | `client/src/pages/board/BoardPage.tsx` | small | no |
| 32 | The end-of-month read and the reveal counts, built once from the record | E | `modules/reports/reports.service.ts`, `the-four-reports.ts`, `modules/board/` | large | 4, 9 |
| 33 | The end-of-month page and the four continue options | S | `client/src/pages/grounds/EndingPage.tsx`, `client/src/pages/billing/` | large | 4 |
| 34 | The anchor's one-month trial for the team | E | `modules/billing/the-free-trial.service.ts`, `pricing.service.ts` (a new setting), `common/subscription.ts`, `client/src/lib/the-free-trial.ts` | medium | 3 |
| 35 | The anchor journeys and the cross-reader tests: lead, participant, admin, an admin who only reads | E | `api/journey/` (new runner), `docs/scenario-tests.md`, a spec per reader | medium | no |

Pieces 2 and 3, 9, 11, 18, 21, 23, 25, 27 (screens half), 31 and 33 are the screens workspace's. Pieces 35 and the rest are the engine's. The build order is 0, 1 and 2, then 3 to 7 (the conversation), then 8 and 9, then 12, 13 and 20, then 10 and 11, then 14 and 15, then 16 to 18, then 19, 21, 22 and 23, then 24 and 25, then 26 and 27, then 28 and 29, then 30 and 31, then 32 and 33, then 34, with 35 beside every piece. Pieces 12 and 13 come before 10 and 11 because the lead sees the board before adding people.

**Blocked by Needs Hafsah, in short** (piece number first, then the "Needs Hafsah" numbers from section 2 that must be answered before it is built):

- Piece 1: 12 and 13. Piece 2: 3. Piece 4: 12.
- Piece 8: 8 and 14. Pieces 10 and 11: 1, 3 and 8 (piece 10 also 15).
- Pieces 12, 13 and 20: 14. Piece 14: 8.
- Piece 16: 5 and 6.
- Pieces 18, 22, 23 and 32: 9 (piece 32 also 4).
- Pieces 19, 20 and 21: 10.
- Pieces 26 and 27: 11. Piece 28: 2. Piece 30: 7. Piece 33: 4. Piece 34: 3.
- Not blocked: pieces 0, 3, 5, 6, 7, 9, 15, 17, 24, 25, 29, 31 and 35.

---

## 5. For the screens workspace

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
