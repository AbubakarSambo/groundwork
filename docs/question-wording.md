# Where each check-in question's wording comes from

Hafsah's fix list, item 7 (14 October 2026): "for every fixed question the check-in asks, say where its wording comes from (the prototype, docs/decisions-merged.md, the pattern, role or coaching libraries, or written during the build), in docs/question-wording.md, one row each. Where the prototype has wording, use it exactly; where nothing approved exists, propose plain wording there and wait for Hafsah's yes."

## How to read this

- **Fixed** means the words are written in the code. A model writes every other question from what it knows.
- Most fixed questions are handed to the model as "ask this, or a close version of it". A few go to the person exactly as written. Those are marked **sent as written**.
- **Where it comes from** is one of these:
  - the prototype;
  - Hafsah's decisions;
  - Hafsah's own documents (the anchor spec, `docs/anchor-scenario.md`, and the "Part 3" opening-question tables the scenario packs quote);
  - Hafsah's approved wordings of 14 October (E8);
  - the pattern, role or coaching libraries;
  - written during the build.
- **What happens now**:
  - "Approved, kept" means the wording comes from the prototype, a decision, Hafsah's documents or the libraries, and nothing was changed.
  - "Changed to the prototype" means the prototype had wording, and the code now uses it exactly.
  - "Proposal, waiting for your yes" means nothing approved exists. A plain wording is proposed, and the code is not changed until Hafsah says yes. Where the current wording is already plain, the proposal is to keep it.
- **Can a stored prompt override it?** Some of these live in a prompt that a version stored in the database (`PromptVersion`) can replace. Those are marked "stored prompt". The others can only change in code.

Only one wording was changed in code: the first question of "Help someone get back on track", which now uses the prototype's words.

---

## 1. Setting up a check-in: the first question for each situation

From `api/src/modules/entry/the-first-question-for-this-situation.ts`. The setup tells the model to ask this question, or a close version of it. Code only, not a stored prompt.

| Situation | The question | Where it comes from | What happens now |
| --- | --- | --- | --- |
| Help someone get back on track (PIP) | Who is it, and what were they meant to be delivering? | The prototype (B1, start-chat.txt) | Changed to the prototype. It said "Who is this about, and what is not happening that should be?" |
| The anchor (HELP_TEAM_UNDERSTAND) | What's happening right now that makes you wish your team saw more of what you see? | Hafsah's anchor spec, section 6 (decision 114) | Approved, kept |
| Get updates from your team (TEAM_UPDATES) | What is the one thing you want to ask them? Your words - they will answer exactly this. | Written during the build | Proposal: "What is the one thing you want to ask them? They will answer exactly what you write." |
| OKR alignment | What are you trying to hit this period, and who is being pulled in to get there? | Hafsah's shape, quoted in the code ("what are you trying to hit, and who is being pulled in") | Approved, kept |
| New hire | Who is the new hire, and what did you bring them in to do? | Written during the build, after the Part 3 question for the check-in | Proposal: keep as it is |
| New cofounder | Who is joining you, and what is the arrangement? | Written during the build | Proposal: keep as it is |
| New advisor | Who is coming on, and what are they being brought in for? | Written during the build | Proposal: keep as it is |
| New project | What is the project, and who is on it? | Written during the build | Proposal: keep as it is |
| New manager | Who is taking over, and what are they taking over? | Written during the build | Proposal: keep as it is |
| Contract renewal | What is the agreement, and who is on the other side of it? | Written during the build | Proposal: keep as it is |
| Role handover | Who is handing over, and who is taking it on? | Written during the build | Proposal: keep as it is |
| Contract review | What are you about to sign, and who with? | Written during the build | Proposal: "What are you about to sign, and who is it with?" |
| Implementation tracking | What agreement is running, and who is on the other side of it? | Written during the build | Proposal: keep as it is |
| Recognition | What went well, and who did it? | Written during the build | Proposal: keep as it is |
| Drift | Which project has drifted, and what has changed since you agreed it? | Written during the build | Proposal: keep as it is |
| Crisis alignment | What is the decision, and when does it have to be made? | Written during the build | Proposal: keep as it is |
| Workplan and budget | What is the plan for, and what resources do you actually have? | Written during the build | Proposal: "What is the plan for, and what money and people do you actually have for it?" |
| Pulse check | Who is on the team, and what are they each working on? | Written during the build | Proposal: keep as it is |
| Realign the team | Who do you need to realign with, and what do you think you see differently? | Written during the build | Proposal: "Who do you need to get back in line with, and what do you think you each see differently?" |
| Board strategy | Who is on the leadership team, and what is the strategic question in front of you? | Written during the build | Proposal: "Who is on the leadership team, and what is the big question you have to decide?" |
| A group of people (COHORT_CHECK) | Who is in the group, and what are they all doing? | Written during the build | Proposal: keep as it is |
| A group of people starting (COHORT_CHECK, starting) | Who are you onboarding, and what are they all starting? | Written during the build | Proposal: "Who is starting, and what are they each starting on?" |
| Something sudden happened (ACUTE_SHOCK) | What happened, and when? | Written during the build | Proposal: keep as it is |
| A snapshot | Who do you want to hear from, and what do you want to ask them? | Written during the build | Proposal: keep as it is |
| Something else (OPEN_READ) | What is going on? Tell me in your own words - a couple of sentences is plenty. | Written during the build | Proposal: "What is going on? Tell me in your own words. A couple of sentences is enough." |
| Discovery | What are you trying to work out, and who are you asking? | Written during the build | Proposal: keep as it is |

### Other fixed questions in setup

From `api/src/modules/entry/entry.service.ts`, the setup's instructions. Code only.

| The question | Where it comes from | What happens now |
| --- | --- | --- |
| Is this a one-off check-in, or something that you will track over time? You can set context and change the settings on the Context and Setup tabs once this first conversation is done. | Hafsah's wording, 15 September 2026 | Approved, kept |
| What makes this the right time to set up a check-in on this? Is it a new quarter, a quarter that missed, a handover, or needing the team lined up on it? | Hafsah's wording, 17 September 2026 | Approved, kept |
| And what is your part in the migration, are you running it, doing some of it, or watching how it lands? (an example; asked last, with options from the lead's situation) | Hafsah, 17 September 2026 ("the your part question should come last") | Approved, kept |
| Who else is part of this - a person, a team, another department? | Written during the build | Proposal: "Who else is part of this? It can be a person, a team or another department." |
| Which of those is Sam's, and which is Samson's? Does each of them have their own number, or is it one shared target? (an example) | Written during the build, from a live setup | Proposal: keep as it is |
| How long should this run, and how often do you want to check in? | Written during the build | Proposal: keep, but ask it only when the situation does not already say. Today another instruction forbids it in that case, so the two disagree. |
| Who would you say is the author of that work? | Written during the build | Proposal: "Who did that work?" |
| I want to keep this session as what you shared - what would you say if you were putting your position directly on the table right now? | Written during the build | Proposal: "This record keeps what you say yourself. If you said your view directly now, what would you say?" |

### Setup openers sent as written

From `entry.service.ts`, `SCENARIO_OPENERS` and `DEFAULT_OPENER`. They are **sent as written** by `POST /entry/opener`, but the screens only call that route for the anchor, so these are not reached today.

| Opener | The question | Where it comes from | What happens now |
| --- | --- | --- | --- |
| The anchor's opening text | You know what it takes to keep the work, customers and company moving. Does your team? ... Tell me what you are trying to get across. Then the first question above. | Hafsah's anchor spec, sections 5 and 6 | Approved, kept |
| The default opener | Tell me what is on your mind. Who is involved, and what are you trying to get right? | Written during the build | Proposal: keep as it is |
| New hire | Tell me a little about it. Who is the new hire, and what do you want to get right from the start? | Written during the build | Proposal: remove. It is not reached, and it disagrees with the first question above. |
| New project | Who is involved, and what do you want to be clear about before you begin? | Written during the build | Proposal: remove, for the same reason |
| New board member | Who is coming on, and what do you most want to get right? | Written during the build | Proposal: remove, for the same reason |
| New partner | Who is the partner, and what matters most to get right from the start? | Written during the build | Proposal: remove, for the same reason |
| Contract renewal | What is the relationship, and what do you want this to show? | Written during the build | Proposal: remove, for the same reason |
| New direction | What is changing, and who needs to be on the same page? | Written during the build | Proposal: remove, for the same reason |
| Align OKRs | What period are you planning for, and which teams are involved? | Written during the build | Proposal: remove, for the same reason |
| Workplans and budgets | What period are you planning for, and who needs to submit a plan? | Written during the build | Proposal: remove, for the same reason |
| Alignment pulse check | Let's start. What is going well right now? | Written during the build | Proposal: remove, for the same reason |
| Realign team | What shifted, and what does the team need to agree on? | Written during the build | Proposal: remove, for the same reason |
| PIP | What is the concern, and what does success look like at the end of this period? | Written during the build | Proposal: remove, for the same reason |

---

## 2. The anchor (Help your team understand)

| The question | Where it lives | Where it comes from | What happens now |
| --- | --- | --- | --- |
| What's happening right now that makes you wish your team saw more of what you see? | `the-first-question-for-this-situation.ts`, also copied into the stored prompt `anchor_lead_conversation` and the screen's fallback in `TheSetup.tsx` | Hafsah's anchor spec, section 6 | Approved, kept. The stored prompt's copy could disagree with the question actually asked if someone edits it; the code reads it from one place. |
| What are you finding yourself constantly pushing? | stored prompt `anchor_lead_conversation` | Hafsah's anchor spec, sections 4 to 10 | Approved, kept |
| What feels like it only moves when you push it? | same | same | Approved, kept |
| What do you wish people worried about a little more? | same | same | Approved, kept |
| What are you carrying that you don't think they see? | same | same | Approved, kept |
| Where do people seem to be doing their jobs but missing what the company actually needs? | same | same | Approved, kept |
| If you stopped pushing for a month, what are you worried would stop moving? | same | same | Approved, kept |
| How does the money that pays for this work actually come in? What does the lead's group do that keeps that money coming? | same | Hafsah's anchor spec (guidance, said in the model's own words) | Approved, kept |
| Have you actually told them this? | same | Hafsah's anchor spec, section 9 | Approved, kept |
| How much context do they have? | same | same | Approved, kept |
| Would somebody know this was expected from their current role? | same | same | Approved, kept |
| Do they understand why this matters now? | same | same | Approved, kept |
| Could someone do their formal job extremely well and still fail the expectation you're describing? | same | same | Approved, kept |
| Are you asking them to take ownership while retaining all the decision-making yourself? | same | same | Approved, kept |
| Imagine a month from now and this is meaningfully better. What would you notice people doing without you having to ask? | same | Hafsah's anchor spec, section 10 | Approved, kept |
| Who needs to be part of this? | `entry/the-anchor-people-step.ts` | Hafsah's anchor spec, sections 13 and 14 (decision 96) | Approved, kept |
| What do they do, and why are they part of this? | `entry/the-anchor-people-step.ts`; the screen's fallback in `TheSetup.tsx` says "What do they do / why are they part of this?" | Hafsah's anchor spec writes it with a slash | Proposal: use the full sentence in both places, "What do they do, and why are they part of this?". The screen's fallback still has the slash. |
| What moved since we last spoke? | stored prompt `anchor_participant_conversation` | Hafsah's anchor spec, sections 16 and 20 | Approved, kept |
| You were going to speak to James. What happened? (an example) | same | same | Approved, kept |
| You mentioned the client wasn't clear about the next phase. Has that changed? (an example) | same | same | Approved, kept |
| What's taking most of your attention now? | same | same | Approved, kept |
| Would you like me to write down "their exact words" as something you will do? | same | Written during the build | Proposal: keep as it is |
| It's been a few days since we spoke. What's changed since then? (**sent as written**) | `conversation/the-anchor-nudge.ts` | Hafsah's anchor spec, section 26 (decision 105, item 3) | Approved, kept |

---

## 3. A check-in's opening questions, situation by situation

From `api/src/modules/conversation/prompt-library.ts`. These are the scenario packs, which can be replaced by a stored prompt (`scenario.<situation>.<party>`) for a check-in's first session. Its header says the questions are "exact Part 3 wording", from Hafsah's original tables. They are approved, and none was changed.

| Situation and reader | The first question | What happens now |
| --- | --- | --- |
| New hire, the lead | Who have you just hired and what did you bring them in to do? | Approved, kept |
| New hire, the person | What do you want to get out of this role - not what the organisation wants, what do you want personally. | Approved, kept |
| New hire, a senior person | What do you need to understand, learn, or have access to before you can deliver on your mandate - and by when do you need it? | Approved, kept |
| New hire, the person, on authority | If the people giving you this mandate disagree with each other, who has the final word? | Approved, kept |
| Role handover, the lead | You are handing this over. Start with what is genuinely fragile. | Approved, kept |
| Role handover, the person | What have you inherited that you do not yet understand? | Approved, kept |
| New cofounder, the lead | Who is joining and what is the arrangement? | Approved, kept |
| New cofounder, the person | What are you contributing to this founding team that nobody else here can contribute? | Approved, kept |
| New advisor, the lead | Who is joining and what are they being compensated? | Approved, kept |
| New advisor, the person | What does a relationship that is worth the equity or retainer look like from your side? | Approved, kept |
| New project, and the anchor, the lead | Name the project. Who owns it? | Approved, kept |
| New project, the person | What did you understand the brief to be when this project started? | Approved, kept |
| New manager, the lead | What are you bringing this person in to do, and for how long? | Approved, kept |
| New manager, the person | What do you understand the scope of this engagement to be - in your own words, before the contract language? | Approved, kept |
| Contract renewal, the lead | The contract period is ending. What was the original arrangement and what was it supposed to deliver? | Approved, kept |
| Contract renewal, the person | The contract period is ending. What was the original arrangement and what did you understand you were expected to deliver? | Approved, kept |
| Any starting situation, a person in it | What did you understand your role in this to be - in your own words, before anyone else's version? | Approved, kept |
| Somebody working alongside the person | From where you sit, what has this work looked like so far? | Approved, kept |
| Before anything else, to a person in session 1 (**sent as written**) | Before anything else, so this asks you the right things: are you the person this check-in is about, or somebody working alongside them? One line is enough. | Written during the build. Proposal: "Before anything else, so I ask you the right things: is this check-in about you, or do you work alongside the person it is about? One line is enough." |
| Drift and get back on track, the standard first | What was agreed that this is falling short of? Where is that written down, and has the person doing the work read it? | Written during the build, from a check-in Hafsah read back. Proposal: keep as it is |
| Drift, get back on track and realign, your own part | What did you do, or not do, that helped get it here? | Written during the build. Proposal: keep as it is |
| Drift, the opening | Name the person and the area they are supposed to own. What specifically are they not doing that you believe they agreed to do? | Approved, kept |
| Drift, worry and tension | What are you most worried will happen when this conversation finally occurs? And what tension do you predict - the thing you can already see coming? | Approved, kept |
| Crisis, the opening | What is the actual situation right now - revenue, runway, team, or relationship. Name it specifically. What needs to be true, and by when, for you to consider this stabilised? | Approved, kept. Note: the first sentence is a list joined to a question with a dash. If you want it plainer: "What is the situation right now? Is it about money coming in, the cash you have left, the team, or a relationship?" |
| Crisis, worry and tension | What are you most worried will happen if this is not resolved in the period you are working to? And what tension exists inside the team right now that this pressure is making harder to ignore? | Approved, kept |
| Recognition, the person | What have you been working on over this period? The things themselves, not how they went. | Approved, kept |
| Pulse check, the first session | What are you working to right now? The one or two things you would be judged on this period. | Approved, kept |
| Pulse check, later sessions | Last time you said you owned X. What moved on it since then? | Approved, kept |
| Get updates from your team | The lead's own line, word for word (Hafsah, 18 September 2026). Then "What is that at now? A number or a date is enough." | Approved, kept |
| A snapshot | What is going well right now? One thing is enough. What is stuck, or harder than it should be? One thing is enough. What has changed recently that the people you work with might not know about? | Approved, kept |
| Discovery | What are you trying to expand or grow over the next two to three years? (and the eight after it) | Hafsah, 20 and 21 September 2026. Approved, kept |
| Realign the team | For this to be working in a month, what would have to be true? Say it as something that could be checked. | Approved, kept |
| A group of people | What is each of these people working to this period? Something that could be checked. | Approved, kept |
| A group of people starting, the lead | What do these people have to achieve in this period? Say it as something that could be checked. | Approved, kept |
| Something sudden happened | What just happened, as you understand it? Walk me through what you actually saw or were told, not the version going around. (and the twelve after it) | Approved, kept |
| The final session | Before the report is prepared - is there anything in the record that is not fully captured yet that you want to name now? | Approved, kept |

The other packs (open read, contract review, implementation tracking, PIP, board strategy, OKR alignment, workplan and budget) give the model an instruction for its opening ("Ask what they are trying to achieve this period"), not a fixed question. They are not listed one by one.

---

## 4. Questions in every check-in

From `ENGINE_RULES` in `prompt-library.ts`, stored prompt key `system`.

| The question | Where it comes from | What happens now |
| --- | --- | --- |
| Is there anything you two agreed without ever saying it? | Hafsah's approved wording, E8, 14 October | Approved, kept |
| You said 90 days. Is that still the right time span for this, and are you ready to close this check-in? | Hafsah's approved wording, E8, 14 October | Approved, kept |
| Before we close: what will you do about this, and by when? | Written during the build | Proposal: "Before we finish, what will you do about this, and by when?" (no colon) |
| That is the outcome. What is the first thing you do towards it, and when? | Written during the build | Proposal: keep as it is |
| Over what timeframe - the next few weeks, this quarter, the year? | Written during the build | Proposal: "Over what time? The next few weeks, this quarter, or the year?" |
| Is there anything you need that's blocked on someone else right now? | Written during the build | Proposal: "Is anything you need waiting on someone else right now?" |
| Does that match what you have seen, or does it miss something? | Written during the build | Proposal: keep as it is |
| What would exist that does not exist today if this goal is genuinely delivered: something you could point to? Who else would know it exists? | Written during the build | Proposal: "If this goal is really delivered, what will exist that does not exist today? Who else would know it exists?" |
| Is there anything written down that captures what was agreed here - a message, a brief, a note, anything? (and the two after it) | Written during the build | Proposal: "Is what was agreed here written down anywhere, for example in a message, a brief or a note?" |
| Can you make that one level more concrete? Who would be in a position to confirm this happened? | Written during the build | Proposal: "Can you say exactly what that was? Who could confirm it happened?" |
| What makes it feel that way? | Written during the build | Proposal: keep as it is |
| The role openings: Sales "What is the most advanced conversation you have right now: the one closest to a decision?", Engineering, Founder, Product, People, Finance, Board, and all others | Written during the build | Proposal for Sales: "Which of your conversations is closest to a decision right now?" The others are already plain. |

---

## 5. Questions the product writes itself (sent as written)

These go to the person with no model in between. Code only.

| The question | Where it lives | Where it comes from | What happens now |
| --- | --- | --- | --- |
| That's all for today. Below is what I wrote down from your answers. Is anything wrong? | `conversation/the-close-says-what-comes-next.ts` | The prototype (B3, check-in-end-card.txt) | Approved, kept |
| That's all for today. Reply "finish" to close this check-in, and your report will come here. (WhatsApp) | same | Written during the build, after the prototype's close | Proposal: keep as it is |
| I have one more question before we finish. | `conversation/the-close-is-held-once.ts` | Written during the build | Proposal: keep as it is |
| From everything you have said, what have you decided? | same | Written during the build | Proposal: keep as it is |
| What will you do about this, and by when? / What will you do next, and by when? / By when will you (their step)? | `conversation/what-they-will-do-is-asked-before-the-end.ts` | Written during the build | Proposal: keep as it is |
| About 70 short questions for something still owed, for example "What is getting in the way now?" and "Which part of the plan is yours to do?" | `conversation/each-owed-thing-asked-plainly.ts` | Written during the build (1 October 2026) | Proposal: keep as they are; they were written plain on purpose |
| Where would you like to start? / What else should I know? | `conversation/nobody-is-left-looking-at-a-paragraph.ts` | Hafsah, 23 September 2026 | Approved, kept |
| What would you like to add about that? / What has happened for you since this began? / What matters most to you about this right now? / What is the next thing coming up for you? | same, and two neighbours | Written during the build | Proposal: keep as they are |
| That sounds like a concrete idea. Want me to capture it for the team? | `conversation/ideas-from-the-team.ts` | Hafsah's decision 105 | Approved, kept |
| When you say (a period), do you mean (a date)? | `conversation/a-period-is-not-a-day.ts` | Written during the build | Proposal: keep as it is |
| This check-in is aiming at (n). You have said (m) - is that your own part of it, or is the (n) something else? | `conversation/the-numbers-do-not-meet.ts` | Written during the build | Proposal: "This check-in is aiming at (n). You said (m). Is that your own part of it, or is the (n) something else?" |
| What have you done about it so far? / Have you spoken to anyone about it, rather than written? / Who is the person at the other end who can actually approve this? A team is not a person. (and two more) | `conversation/a-blocker-is-not-a-blocker-until-you-have-tried.ts` | Written during the build | Proposal: keep as they are |
| Is somebody running that, or is there a record already being kept? / Which of the two are you aiming at? / Whose records are those, and do you get to see them? | `conversation/what-a-claim-costs-to-prove.ts` | Written during the build | Proposal: keep as they are |
| You have more than one check-in open. Which is this for? (WhatsApp) | `public-api/whatsapp-for-an-organisation.service.ts` | Written during the build | Proposal: keep as it is |
| Shall I treat this as a leave request? (or spending, or hours) | `public-api/a-whatsapp-message-is-routed.ts` | Hafsah's decision 105 | Approved, kept |
| I could not open that file. Could you tell me what it shows? (WhatsApp) | `public-api/whatsapp-for-an-organisation.service.ts` | Written during the build | Proposal: keep as it is |

---

## 6. The role question and the role interview

| The question | Where it lives | Where it comes from | What happens now |
| --- | --- | --- | --- |
| In a first check-in, one question about what they are responsible for in their job and what doing well looks like | stored prompt `first_check_in_role` | Decision 129. No fixed wording: the model says it in its own words | Approved, kept |
| What do you own in your job as (role)? Tell me in your own words, for example "the sales target and the sales team". | `assistant/the-role-interview.ts` (**sent as written**) | Written during the build (request 25) | Proposal: keep as it is |
| What do you decide yourself, without asking anybody first? | same | same | Proposal: keep as it is |
| Who do you depend on to do your job? | same | same | Proposal: keep as it is |
| And who depends on you to do theirs? | same | same | Proposal: keep as it is |

---

## 7. The libraries

These come from the pattern library (`patterns/pattern-library.ts`, Part 4) and the role maps (`board/role-maps.ts`). The model is told to ask about them naturally. They are library content, approved as libraries, and none was changed. They are not listed one by one.

| Library | Examples | What happens now |
| --- | --- | --- |
| Role maps, neutral questions | Sales: "Which of those conversations was with someone who can actually decide, with the budget and the authority?" Ops: "What did you keep running since last time that nobody else saw?" (Hafsah's E8) | Approved, kept |
| Role maps, questions for every role | "Which ones specifically? By when, exactly?" / "Whose was that? What did you do that someone else should own?" | Approved, kept |
| Pattern library, one question per pattern | R3: "Somebody credited this person specifically. Does that show up anywhere they would see it?" / B9: "What are the three things the team is focused on right now?" | Approved, kept |

---

## 8. Questions not reached today

These are in the code but not used, so nobody is asked them. They are listed so nobody mistakes them for live wording.

- `ROLE_SPECIFIC_OPENERS`, `EVIDENCE_DEFINITION_STEP`, `CHECK_IN_TWO_OPENING` ("What has changed since then?") and `POST_CONVERSATION_CHECK_IN` in `prompt-library.ts`.
- `PATHWAY_QUESTIONS` 1 to 20 in `prompt-library.ts`, used only for a situation with no pack. Every situation has one.
- `TOPICS` in `grounds/an-interview-not-a-longer-setup.ts`.
- `client/src/pages/home/OnboardingChat.tsx` and `HomePage.tsx`, which no page opens.
- The setup openers in section 1, except the anchor's.

Proposal: remove them in a later tidy-up, once Hafsah agrees.
