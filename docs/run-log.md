# Run log

Newest first. One short entry per item. Written as the work happens, unattended.

## A plan names somebody who is not on the check-in, and the old chat takes a short question for a person (6 October, piece 5, parts F and G follow-ups)

**How it was run.** Build `991e5168`, local database `gw_wa_own`, port 3059, with the model. No email is really sent (`EMAIL_SENDS_FOR_REAL=false`).

| Part | Reader | What they read or what happened | Result |
| --- | --- | --- | --- |
| F, the plan is read | Wanjiru, the lead | The plan names Amina Yusuf, who is not on the check-in. Among the cards: "Add Amina Yusuf to this check-in?", from "Amina Yusuf will take over the Kisumu accounts", with "The plan gives no email address for Amina Yusuf, so you will be asked for one. Nobody is invited until you say yes." Reading adds nobody. Her commitment cannot be confirmed yet: "Amina Yusuf is not on this check-in yet. Add them first, then confirm this." | 14 of 14 |
| F, who may | Miriam (in the check-in); Grace (admin) | Both are refused with 403 and nobody is added. | proved |
| F, the yes | Wanjiru | With no address: "Type Amina Yusuf's email address, so Groundwork can invite them. Nobody is invited until you say yes." Before anything has been said about the check-in, the ordinary rule holds: "Nobody can be invited yet: nothing has been said about what this check-in is for..." and the card stays waiting. After she writes what the check-in is for, a yes with an address adds Amina as a person to take part (not yet signed in) and invites her through the ordinary way. A second yes does nothing more. The card is gone from the waiting list, and now her commitment can be confirmed. | proved |
| G follow-up, the old chat | Wanjiru | "Ask Miriam which accounts actually have a buying process" through the old chat is now said back first: "Groundwork will ask Miriam Test, word for word, "Which accounts have a buying process?" in Miriam's next check-in. Shall I send it?" and a yes keeps exactly that, about Miriam, for the lead alone, the same row as through Ask. The old chat used to ask what kind of thing it was, and a blind yes made it an expectation of Miriam. | proved |
| G follow-up, nothing else moved | Wanjiru | "Miriam should sign 12 shops" is answered as before ("Shall I keep "sign 12 shops" as a private note about Miriam that only you can see? ..."). The paste, the line, the note, the document and who-may parts of the side-by-side run are unchanged. | proved |

See `api/journey/a-plan-names-somebody-who-is-not-on-the-check-in.ts` and the side-by-side journey above.

## Context and resources through Ask Groundwork, side by side with the old context chat (6 October, piece 5, part G)

**How it was run.** The build at `cd6ddac9`, local database `gw_wa_own`, port 3059, with model access (the local `api/credentials` linked into the worktree). `release.contextInAskGroundwork` was written as `{"on": true}` in this local database only. The old chat was not switched off or changed. In each part the same words were said twice, on two check-ins that start identical, once through the old routes and once through Ask, and the rows each wrote were then read out of the database. The model reads a paste afresh each time, so one paste was also read through the old chat a second time as a control.

| Part | Reader | What was said, and what each wrote | Result |
| --- | --- | --- | --- |
| Switch off | Wanjiru, the lead | "decision: we will drop the pilot" through Ask got "I cannot answer that one yet. Here is what I can do with "decision: we will drop the pilot"." The old chat answered as before. | as it was |
| Opening the conversation (the setup door) | Wanjiru | Old chat and Ask from inside the check-in both open on "How long should this run? You can give an end date or a number of weeks. I need it to work out how many check-ins there will be." Neither writes anything. | same |
| A line of context | Wanjiru | Typed in: `DECISION, EVERYONE, "we will drop the pilot"`. Through Ask ("Shall I add "we will drop the pilot" to this check-in's context as a decision?", then yes, "I have added the line to this check-in."): the same row. | identical |
| A private note about a person | Wanjiru; Miriam | Old route: `NOTE, LEAD_ONLY, "keeps missing the Friday call", about Miriam`. Ask ("Shall I keep "keeps missing the Friday call" as a private note about Miriam that only you can see?", yes, "I have saved the note, and only you can read it."): the same row. Miriam, who is in the check-in, reads none of it. | identical |
| A paste of plan and notes | Wanjiru | Each yes writes the same kinds, for the same people, read by the same readers: a goal (12 qualified enterprise deals), a commitment (Miriam, send the price list), a decision, a note with the quarter's end date, a strategy line, a way of working, and a question for Miriam kept for the lead and not yet confirmed. The wording of a line varies a little, because the model reads it afresh each time ("Which of your accounts have a buying process?" against "Which accounts actually have a buying process?"). Across the two old runs, one kind (the baseline) came in one run and not the other, and Ask differed from the old chat in no kind but that one. | same kinds |
| A question for a person | Wanjiru | Said as one short sentence, "Ask Miriam which accounts actually have a buying process", Ask says "Groundwork will ask Miriam Test, word for word, "Which accounts actually have a buying process?" in Miriam's next check-in. Shall I send it?" and, after yes, writes the question about Miriam with its exact words. The old chat does not take a short sentence like that as a question: it asked "For example, is it a goal or a target?", and a blind yes made it an expectation of Miriam. The old chat takes questions only inside a longer paste (the row above). | Ask does more |
| A document | Wanjiru | The same file added to both check-ins. Through Ask ("I have just added the document"): "Here is the context we have from q3-plan.txt. It is a Q3 sales plan." and its numbers, then a yes writes the goals and a note everybody on the check-in can read. | works |
| Who may | Grace, an admin; Miriam | On a check-in whose lead is still here, Grace is refused by the old chat (403, "Only Wanjiru Test, who runs this check-in, can change how it is set up...") and Ask writes nothing for her. Once the lead has left, Grace may set it up in both. Miriam is refused by the old chat and Ask writes nothing for her. | same |

12 of 12 checks pass. See `api/journey/context-through-ask-side-by-side-with-the-old-chat.ts`. The existing specs pin the same thing at the code level: Ask's lane calls `GroundsService.contextChat` and `applyContextProposal`, the old chat's own two methods (99 tests in the four related suites pass).

**What would be needed to switch the old chat off.** Nothing in the engine reads or writes differently: the lanes call the old chat's own methods, so a switch changes only where a person types. (1) The screens: the Context and resources page's chat panel, and the buttons that open it, would open Ask with `openedFrom: "check_in_setup"` (supported now) and stop showing the old panel; that is the screens workspace's. (2) Hafsah turns `release.contextInAskGroundwork` on in the live database. (3) Request 92's five live checks run again against the live line, as the screens workspace asked before the old chat goes. (4) The old routes (`POST /grounds/:id/context-chat` and its confirm and decline) can stay in place, so an existing integration or an open page keeps working; switching the chat off means not showing it. Nothing was done to any of these.

## The role interview, and setting up from a plan (6 October, piece 5, parts E and F)

**How it was run.** The same build as above (`cd6ddac9`), local database `gw_wa_own`, port 3059. No model keys are on this computer. The role interview needs none (no model words it). Reading a pasted plan into proposals does need one, so the proposals a plan would give were written as the stored rows that reading leaves; the specs run the reading with a model double and check every quote. Everything after that is the real route.

| Part | Reader | What they read or what happened | Result |
| --- | --- | --- | --- |
| E Sending | Wanjiru (a lead, not an admin); Piet (a colleague) | Both are refused with 403. | proved |
| E | Grace, an admin | Sends it to Miriam for Sales rep. Sending again says "Miriam Test already has the role interview waiting for Sales rep." | proved |
| E Answering | Miriam, in Ask Groundwork | "What do you own in your job as Sales rep? Tell me in your own words, for example "the sales target and the sales team"." Then "What do you decide yourself, without asking anybody first?", "Who do you depend on to do your job?" and "And who depends on you to do theirs?" Then: You said you own "my own customers and their deals", you decide "what discount I give up to 10 percent", you depend on "the Sales lead and Operations for stock", and "the customers I sign, for their first delivery" depend on you. Shall I save this for the role map? Nothing is written before her yes. | proved |
| E | Miriam, after yes | "I have saved this for the role map. It shows what the Sales rep job owns. It is about the job and not about you." One row, her words as typed. | proved |
| E The map | Grace; Wanjiru and Piet; Miriam | Grace reads Sales rep owns "My own customers and their deals", held by Miriam Test and Piet Test. A lead who is not an admin and a colleague are refused (403). Miriam reads her own answers and Piet none. | proved |
| F Reading | Wanjiru, the lead | Six cards, each with the exact words of the plan: "The goal for qualified enterprise deals is 12 by 30 September.", "Miriam is responsible for the Westgate account.", "Miriam will send the price list by Friday.", "We review every quote over 1 million with finance.", "Groundwork will ask Miriam: which accounts have a buying process?" and "It is not decided yet whether to open Kisumu." Miriam, Grace and Piet are each refused (403) and cannot confirm. | proved |
| F Saying yes | Wanjiru | Each yes writes exactly one thing where it belongs: a target, a role on the check-in, a commitment, a rule, a question kept for the lead and not asked yet, a decision. A second yes is refused. A stored proposal whose number is not in its own quote is refused with "That is not in the plan as written, so nothing was added." Nothing is written before the yes. | 24 of 24 |

See `api/journey/the-role-interview-and-a-plan-as-each-reader-reads-them.ts`.

## Links between check-ins, and the strategy's history (6 October, piece 5, parts C and D)

**How it was run.** A worktree at `12d83677` built with `nest build`, the local database `gw_wa_own` with the new migration applied, the API on port 3059. For D, Tana's planning tool signs in with its own credential and pushes priorities. For C the rows a finished conversation leaves (a handoff that names the other check-in) are written directly, because there are no model keys here. The WhatsApp journey was rerun at `e05a8e2a` first: 32 of 32.

| Part | Reader | What they read or what happened | Result |
| --- | --- | --- | --- |
| C Waiting on another team | Wanjiru, leads Sales | Sales is waiting on Finance for "the Westgate credit terms", due "by Friday" (a Friday, `dueWord` "Fri"), and "The Westgate credit terms are due by Friday." | built before, proved |
| C Asked of this check-in | Fatuma, leads Finance, who cannot open Sales | Nothing of Sales: no team, no person, no words. This is the rule from request 18 (you read only what you may already open). | as designed |
| C | Grace, an admin who may open both | Finance's page reads that Sales team, Q3 asked for the Westgate credit terms, asked by Miriam, with a way to open Sales. | proved |
| C | Miriam (in Sales); Piet (a third check-in); Kofi (a guest from another company) | Miriam reads the Sales links and is refused Finance (404). Piet is refused Sales (404). Kofi reads nothing of Sales. | proved |
| D Before any change | Grace | The Company page carries `strategy: null`, as it read before. | proved |
| D After their system adds a third priority | Grace, Wanjiru, Miriam | All three read "Strategy v2, since 6 October." and, newest first, "This version added “Build a stronger organisation”." and "Strategy v1, since 1 September." (the earliest priority was set on 1 September). Only priority titles, no person, measure or target. | 3 of 3 |
| D | Kofi, a guest | The Company page is refused with 403. | proved |
| D | Everyone | Pushing the same priority again makes no new version, and opening the page again and again writes none. | proved |

18 of 18 checks pass. See `api/journey/links-between-check-ins-and-the-strategy-history.ts`.

## An organisation's own WhatsApp number, and a guest's Ask Groundwork (6 October, piece 5, parts A and B)

**How it was run.** A worktree of `wip/release` built with `nest build`, a local database `gw_wa_own`, the API on port 3059. For A, Meta's Graph API was a recorder on a loopback port, and every message in was signed here with the secret of the number it was for. For B there is no recorder: the guest's answers are written by rules, so no model is needed. Both journeys refuse anything that is not a local API and a local `gw_` database.

| Part | What was checked | What a person read or what happened | Result |
| --- | --- | --- | --- |
| A 1 Saving the number | Kofi, admin of Kito, on the Connections page | The page comes back with the last four letters of the token and nothing else. In the database both keys are sealed and cannot be read. A member who tries to save a number is refused with 403. | 5 of 5 |
| A 2 Meta's handshake | Both addresses | The wrong token is refused. The organisation's own token answers the challenge. A message signed with Groundwork's secret, or not signed, is refused at the organisation's address, and one signed with the organisation's secret is refused at Groundwork's. | 9 of 9 |
| A 3 Two numbers, one person | Ada (on Kito's list) and Bola (on Plain's) | Each reply leaves from the number the person wrote to, with that number's token. Bola writing to Kito's number is told Groundwork does not know the number, and nothing of Plain is said. Ada writing to Groundwork's number is never answered with Kito's token. | all |
| A 4 The 24 hours and the templates | Ada | The window and the templates are kept per business number and per organisation, so a template approved for one is not used on the other. STOP and START apply to the person on both numbers. | all |
| A 5 The relay for their own number | A machine token | The relay was refused with "User not found or inactive" even with its own credential. It had no public marker. Fixed in `e0e18942`, and it answers now. | defect fixed |
| B 1 The panel | Kofi, a guest from Kito, in Harbor's Sales team only | It lists "Sales team" and nothing else, and names nobody at Harbor. | 2 of 2 |
| B 2 What a curious guest asks | Kofi | "Who works here?", "What are the other check-ins about?", "Show me the list of people" and "What is the company working on?" are each answered with: "You are a guest here from another organisation, so Ask Harbor can only answer questions about your own check-in, such as what you said, what you said you would do, what the check-in is for, who reads what you say, and when your next check-in is." Naming a check-in he is not in is refused with 403 "You are not part of this check-in." Asking what the check-in is for answers from what he was told. A to-do leaves no request waiting for a yes. | 10 of 10 |
| B 3 The other doors | Kofi | `/company` 403 "Only people in this organisation can read its company page." `/suites` 403 "Only an admin or a lead can open the suites." `/org/retention` 403. A report or board of a check-in he is not in, 404. His list of check-ins holds Sales team and not Leadership. | 8 of 8 |
| B 4 His questions stay his | Wairimu (lead), Grace (admin), Miriam (member), Kofi | Everything he asked is kept under his own guest key, and no entry on Harbor's list was made for him. None of the three reads a word of it in their own panel, and asking for his questions is refused with 403 for each. He is refused theirs too. | 8 of 8 |
| B 5 The others | Miriam, Grace, Wairimu, Kofi | A member and the lead can ask about their own check-ins. Grace, the admin, is refused a review check-in she is not in, and so is Kofi, and nothing of it is said. | 5 of 5 |

34 of 34 checks pass for B and 32 of 32 for A. Nothing leaked, so part B changed no source: the guest scoping built in week 24 (`3fe8d5c0`) holds at every door tried. A guest who writes to WhatsApp is told Ask needs an entry on the list, so a guest cannot ask on WhatsApp at all. That is the safe way round and is left as it is.

## Piece 4: the judgement's last prompt fixes, pattern steadiness, and one cycle of prompt self-learning (6 October)

**How it was run.** A worktree of `wip/release` at `14759274`, `nest build`, a copy of the local database (`gw_oct6_judge`, migrated), the API on port 3071, its own runner processes, the model's global address, the settings key only in the start command. The stored prompt was also written in `gw_pw9_1786222102`.

**1. The judgement.** The room judgement prompt got four rules (`14759274`): say each thing as strongly as the block says it, an out-of-date thing is the finding, somebody credited who is not in the room, every piece and not the first one. The population prompt did not change, so it stays at version 1. Active in both databases: `the_judgement_room` version 2, `1d03ffef-4b94-4755-996c-f126db19a69b` (version 1 was `ae0c6fa4-76e5-4f20-a0cc-fd6fadb78217`). All 24 judgements of the full run carry `1d03ffef` as their `promptVersionId`.

| Scenario | Before (run-oct5b or oct5c) | Now (run-oct6a) | Against theDecision |
| --- | --- | --- | --- |
| crisis | "Priya was not on call" beside findings that said she was not paged; the rota never named | The gap says the on-call rota is out of date and nobody responded; "not on call" now agrees with the findings. It does not say the rota named somebody who had left (nobody's block held it) | Right |
| recognition | The contractor never named | "Victor's backend script", named by two people, in the gap, with a line of his own and what the check-in cannot tell about him | Right |
| shock | Only the support tickets | No timeline. The lead's own "I knew our champion had left" never reached the judgement, because the lead's finding dropped it: the judgement is written from each person's finding, not from their record | Still partly right; needs a change to what the judgement is given |
| project | Led with the missing credentials | Leads with the scope gap | Right |
| snapshot | Lead called "they" | "You" throughout; the lease waiting for the lead is the first move | Right |
| sales | Averaged | Separates Femi, Ngozi and Kwame | Mostly right |
| pip | Target never written down | Same, plus "put the expectations in writing" | Right |

A pronoun used for a person, found by the new finder: 21 in the seven scenarios before, 8 after, of which about 4 are real (singular "they" for Nathan in pip, for Priya in crisis); the rest are plural "they". Seven-scenario scorer comparison on the same seven scenarios: nothing worse; patterns found 53 to 38 (project 2 to 0 and snapshot 4 to 0: the detector found none in those fresh conversations, and it runs before the judgement exists).

**The full 24-scenario run (run-oct6f, scored against `docs/baseline.json`): "Nothing got worse than the baseline."** Every problem 0. Proof asked for 38 (42, inside the margin), past words 38 (25), specific detail 99 (88), blocker checked 59 (37), differences 37 (29), agreements 83 (56), findings 87 (81), patterns found 92 (100, inside the margin), commitments 53 (33), central question 29 (29), judgement present 29 (21). Jargon in Groundwork's turns 12 (42).

**2. Pattern steadiness (nothing changed in the product).** Defined plainly: of the patterns found in run A, the share also found for the same person in run B, averaged over every ordered pair (`journey/pattern-steadiness-share.ts`).

| Measure | Result |
| --- | --- |
| Three separate runs of sales, seniorhire, realign, drift (different conversations) | 53% weighted (sales 58, seniorhire 40, realign 78, drift 23). Of the patterns a person is actually shown: 58% (sales 62, seniorhire 50) |
| Before, from the earlier runs of sales and project | 61% sales; project 0% (1 to 2 patterns each) |
| One check-in read as the product reads it, twice (78 check-ins, four copies of five reads) | 83% of the codes one reading kept were kept by another |
| What each person is shown, the same conversations read twice | 79% (68 of 86 pairs), 92% of people exactly the same (the earlier measure was 72%) |

What makes it unsteady: separate runs differ mostly because the simulated people say different things. On the same conversations the flips are the codes whose evidence is ambiguous (E2, K5, B5, B11, B2, K4, D4: kept by 20 to 80% of reads). I tested one cause, that a code competes with others for a place in the model's list: a wavering code is kept alongside 2.5 other codes when kept and 2.7 when not, so no. No detector change was kept, because none was proven better; "patterns found" is unchanged. The one lever left is Hafsah's: counting close neighbours as one (decision 55).

**3. Self-learning, switched off.** What already existed: counts of whether each pattern, coaching step and probe worked, with a suggested weight, read by nothing (`a-suggested-weight.ts`). What was missing: learning about the engine's own words. Built (`e9c4ca54`, `c4ebadba`, `d19cf9ae`): `a-prompt-proposal.ts`, switch `PROPOSE_PROMPT_CHANGES = false`, nothing calls it; a person runs `journey/self-learning-one-cycle.ts`. From a run's faults it asks the model for up to three rules to add, stores a DRAFT version with the evidence in its summary, and the numbers keep or discard it. One cycle was run in the copy: 8 faults found in run-oct6a, draft `the_judgement_room` version 3 (`8cc99fda-e5d3-4ebd-83a9-be04e467651c`) made with three rules, switched on in the copy only, the seven scenarios run again (run-oct6b), and it was DISCARDED BY THE NUMBERS: proof asked for fell 12 to 10, differences 14 to 11, and the faults it was for rose from 8 to 10. Its summary says so. A weakness: engine numbers move with fresh conversations, so a draft can be discarded for noise. Version 2 was put back active; the draft was never put in `gw_pw9_1786222102`.

**What Hafsah would switch on, and what it can and cannot change.** Switch: change `PROPOSE_PROMPT_CHANGES` to true in the same commit, and decide who calls it. It can propose rules to ADD to `the_judgement_room`, `the_judgement_population` and `report_synthesis`, as a draft only. It cannot take anything out (the old text is inside the new text, checked in code), cannot reach the conversation's prompt, refuses a rule about privacy, patterns, who may read what or people's own words, and never activates anything: only a person does, through /prompts.

## The suites at a hundred people, rerun after the review's send-backs (6 October)

Same way as above: a new worktree at `7911334d`, a new database `gw_suites_e2e2`, the API on port 3057, the same seeds. Item 7's order is now tested: the clock passes requests on and tells the people they were passed to at once, then the morning sweep says nothing more of those (specs "clock, then the morning sweep" and "the morning sweep, then the clock", through the real sender). Specs: suites, grounds, WhatsApp, email, assistant, 4,479 passed.

| Item | Reader | What they read or what happened | Result |
| --- | --- | --- | --- |
| 1 The queue, no colon | Operations' manager | "Eight requests are waiting for you to approve or decline. Five are for leave and three are to spend money. Two of them have waited longer than your organisation allows before a request is passed on." | Pass |
| 1 | Finance; the head of Sales (standing in for Grace); the chief executive; HR; a plain member who stands in | "27 requests are waiting for you to approve or decline. Of them, 18 have waited longer ...", 10 to 12 queries and 7 to 33 ms a read; "Seven requests ... Three are for leave and four are to spend money." with "You are standing in for Grace, who is on leave until Friday 9 October."; the chief executive "Two requests are waiting for you ... One is for leave and one is to spend money." (two requests that wait for any admin, set up for the race); HR, the member who stands in (no right to decide), everybody else: "Nothing is waiting for you to approve or decline." | Pass |
| 2 Several at once | Finance, five in a row; two admins at once | 201 each, 152 to 196 ms; the queue falling 26 to 22. One admin 201, the other 409 "Amina approved this request a moment ago, so your answer was not kept." Hours: spec only (the same write-as-check), two cases. | Pass |
| 3 Stand-in | The head of Sales (a lead); the manager on leave | Standing in for the manager's step: 403 "Only the person who approves this request can decide it." for the manager, 201 for the head; "You approved it on 6 October, standing in for Grace." and "Daniel approved it on 6 October, standing in for you." The spending board serves `{"kind":"person","firstName":"Daniel","standingInFor":"Grace"}` and "It is waiting for you." A plain member who stands in is given nothing. | Pass |
| 4 Waiting too long | The clock | 45 requests passed on the first run (59 in the specs' world, with Procurement's manager), each once; a second run in the same minute passed 1, the next hop of a request whose first new approver was away too (Marketing's head). | Pass |
| 5 A clash | Operations' manager | "Imani, Kofi, Zainab and Zuri are also off on some of those days. On the busiest of them, Operations would be four short." | Pass |
| 6 Totals | Finance; four who may not | "In October 2026, 54 requests were asked for, adding up to KES 4,049,100. Across all teams, KES 138,000 was approved in October 2026, and KES 3,911,100 is still waiting for an answer." "Supplies has KES 27,200 approved in October 2026, and KES 420,900 still waiting for an answer." 7 queries, 137 ms. The others: 403. | Pass |
| 7 Told straight away, once for what arrives together | The clock, then the morning sweep | No WhatsApp is set up locally, so by email: the clock's passes told each person once, and the sweep after it sent 17 to people nothing had reached, and 0 on a second run. WhatsApp is proved by the specs. | Pass by email |
| Request 162 | Daniel; Amina | "Started on 2 October 2026. You have written the review, and Sara has added a view of their own. It now waits for your decision." (Daniel) and "Daniel has written the review, and Sara has added a view of their own. It now waits for Daniel to decide." (spec, for an admin); "Daniel has written the review, and Peter can read it and add a view of their own." | Pass |

## The suites at a hundred people, run end to end on a locally built API (6 October)

**How it was run.** A new worktree of `wip/release` at `564c2861` in the scratchpad, `nest build`, a new local database `gw_suites_e2e` migrated from the committed migrations, the API on port 3057 (its own; nobody else's process touched), `EMAIL_SENDS_FOR_REAL=false`, WhatsApp not configured. The hundred-person seed (100 people, 67 leave and 98 spending requests) and the suites seed were loaded, and the requests below were made as the people named, with the API's own query log counting the database questions. The clock's passing on and the morning summary were run from the same built code in an application context. The driver and every reply are kept in the scratchpad (`drive.mjs`, `drive2.mjs`, `e2e-record.jsonl`). Specs: 4,900 passed in the suites, grounds, WhatsApp, assistant, email and public API folders; the whole run is 17,336 passed and 3 failed, none from this work.

| Item | Reader | What they read or what happened | Result |
| --- | --- | --- | --- |
| 1 The queue | Finance (a member) | "27 requests are waiting for you to approve or decline. Of them, 18 have waited longer than your organisation allows before a request is passed on." First: "Ayana asked to spend KES 28,400 on pallet wrap for the cold room." "Thabo has approved it, and it is now waiting for you." Pages of 10, 10 and 7, the whole count on each. 9 to 11 queries and 8 to 27 ms a read; the chief executive's read, ten times running, was 9 queries and 7 to 14 ms. | Pass |
| 1 | Operations' manager; Customer Support's manager; Sales' manager on leave; HR; a member; the chief executive | "Eight requests are waiting for you to approve or decline: five for leave and three to spend." "Six ..." Sales' manager, HR, the member and the chief executive: "Nothing is waiting for you to approve or decline." (nothing has reached an admin) | Pass |
| 2 Deciding many | Finance | Five approvals in a row: 201 each, 164 to 200 ms, 76 to 80 queries each (the answer gives back the board), the queue falling 26, 25, 24, 23, 22. | Pass. Each answer costs what is left to read, not what has been answered. |
| 2 Two at once | Chief executive and the head of Operations (both admins) | 201 for one; for the other 409 "Amina approved this request a moment ago, so your answer was not kept." | Pass |
| 3 Stand-in | Head of Sales; the manager on leave | "You are standing in for Grace, who is on leave until Friday 9 October." The manager's approval: 403 "Only the person who approves this request can decide it." The head's: 201. The head reads "You approved it on 6 October, standing in for Grace." and the manager "Daniel approved it on 6 October, standing in for you." A plain member of Procurement reads "You are standing in for Kito, who is on leave until Wednesday 7 October." | Pass |
| 4 Waiting too long | The clock | 42 requests passed on, each once (42 distinct records); the second run passed none. | Pass |
| 5 A clash | Operations' manager | "Imani, Kofi, Zainab and Zuri are also off on some of those days, so Operations would be five short." (count 4) beside "Nia asked for leave from Wednesday 14 October to Monday 19 October, which is 4 working days." | Pass |
| 6 Totals | Finance and the chief executive; the head of Sales, HR, a member, a manager | 200 in 7 queries, 136 ms: "In October 2026, 54 requests were asked for, adding up to KES 4,049,100. All teams have KES 139,600 approved in October 2026, and KES 3,909,500 still waiting for an answer." and a line each for 9 teams and 5 categories ("Fuel has nothing approved in October 2026, and KES 995,600 still waiting for an answer."). The other four: 403 "Only whoever looks after finance, or an admin, can do this." | Pass |
| 7 One message | The morning sweep (superseded by the rerun below) | No WhatsApp is set up locally, so it went by email: 18 emails, one each (for example "Nine requests are waiting for you to approve or decline" for finance and "35 requests are waiting for you to approve or decline: six for leave and 29 to spend" for the head of Operations). Running it again sent none. | Pass by email. The WhatsApp path is proved by the specs through the real sender. |
| Request 162 | Daniel, Amina | Daniel: "Groundwork gives you the evidence and the patterns, and you decide. Sara sees your reasons." Amina: "... and Daniel decides." (mayWrite true for Daniel, false for Amina.) "Started on 2 October 2026. You have written and Sara has added a view of their own. It now waits for a decision." "Grace: KES 120,000 for two tablets for the field team". Grace: "You have 14 days of leave left this year, out of 21." | Pass |
| Request 160 | Seed | `ACTIVE` on the check-ins nobody answered; Imani is a MEMBER who runs none and is in 15. | Pass |

**Found and fixed in the run.** "on A second scanner" (the capital "A"), fixed in `ff3be0de`.

**Not done.** The hours board's per-request queries (not touched). The two failing files in the full run are the other builder's: `journey/existing-clients-carry-on.spec.ts` needs the new `simpler_words` migration on the local test database, and `the-engines-copy-does-not-sound-like-yoda.spec.ts` counts 36 where it allows 35 because of a line added in `person-style.ts`.

## The anchor walked with real conversations, start to finish (6 October, after the fixes of request 165 and 166)

**How it was run.** A new worktree of the branch in the scratchpad, `nest build`, a new local database `gw_anchor_walk` copied from `gw_pw9_1786222102` and migrated (the new migration, `HELP_TEAM_UNDERSTAND`, applied), the API on port 3031 with the settings key only in the start command, `EMAIL_SENDS_FOR_REAL=false` and nothing leaving the computer. Every conversation below ran on the real model. The leads and the people on their teams were typed by hand, answering what was asked, so the second question is a real second question. The lead's conversation and the baseline were driven through the same routes the screens call (`/entry/anchor-start`, `/entry/onboard`, `/entry/report`, `/auth/entry-save`, `/entry/commit`, `/participants/accept`, `/check-ins/:id/open`, `/check-ins/:id/messages`, `/suites/...`). The browser was not used, so the screens' own fork after the lead's conversation was not walked.

**Versions that ran** (the id comes back on the reply): lead conversation `a37f70ae-175e-4d3b-a078-4eedfc1a68d6`, team baseline `b6d21df6-081f-4369-9bc7-e0f5fe99c4cc`, idea reading `5d100cc3-e6e3-48f8-ad44-2af6d8769263`. All three are also stored, active, in `gw_pw9_1786222102`.

| Step | Reader | What they read (quoted) | Result |
| --- | --- | --- | --- |
| The landing link | Stranger | `GET /entry/anchor-start?source=founders-whatsapp` answers `scenario HELP_TEAM_UNDERSTAND`, `startedFrom anchor`, `groundLabel "Help my team understand"` and `firstQuestion "What's happening right now that makes you wish your team saw more of what you see?"`. | Pass |
| The lead's conversation, a delivery lead | Lead (Njeri) | After "My project managers finish their own deliverables and then stop. Nobody asks whether the client is actually happy. I keep getting the angry calls at the end." Groundwork asked "What is your role in these projects, and what outcome are you responsible for?" Then "How does the money that pays for this work actually come in?", then "What do you think the project managers, designers, and developers don't understand ...?". When she said she had never sat with them, it went to "Imagine a month from now and this is meaningfully better. What would you notice people doing without you having to ask?". | Pass, with one fault found and fixed: that first question was two in one sentence ("and"), so "one thing asked" is now in the prompt. |
| The lead's conversation, a guarded sales director | Lead (Ken) | "Fine. Honestly the ops people just do not care about the numbers. Revenue is sales' job, not theirs, and I am tired of explaining it." Groundwork: "Revenue is sales' job, not theirs, and you are tired of explaining it. What outcome sits with you?" Then, one thing at a time, who he is moving, what the group does not understand, how the money comes in ("Our money comes from the shops that buy from us each week"), and the hope question. | Pass. It first turned his words round ("You're tired of explaining that revenue isn't just sales' job"). The prompt now says to say back his own words and never a summary, and the next run quoted them. |
| The lead's conversation, a lender's chief executive | Lead | "I am the CEO. If the loan book goes bad the whole company goes with it. I carry the investors and the staff." The money question came after, and its answer ("Repayment is what pays the salaries") was said back. | Pass |
| The lead's conversation, a finance lead | Lead | After "Everyone treats collections as finance's problem. Sales closes the deal and walks away ...", Groundwork asked "Have you actually told them this directly ...?". She said "Not really, no. I have complained in the corridor but I never sat down and explained it." and it went on to the hope question. | Pass. The challenge was asked once. It had said "You're right that an unpaid invoice isn't a sale", so the prompt now says never to tell the lead she is right or wrong about the team. |
| The lead's conversation, one word answers | Lead | "yeah" was answered with '"Yeah" is a very concise answer.' | Fixed: "never remark on how short or long an answer is". |
| The lead's conversation is complete | Lead | The screen's `ready` is true only when all seven are heard, she has answered what better would look like, and the reply has stopped asking. The last reply, for the guarded director: "You would notice people telling you before a truck is late, not after, and dispatch phoning the shop themselves. This conversation will help your operations team connect their work to the company's growth. You can now add the people you want to move on the next step." | Pass, with a fault left: the second sentence promises something. The closing reminder now says not to say what Groundwork will achieve. |
| The reveal | Lead (Ken) | "carrying": "You are responsible for a sales target of forty percent growth this year. You are tired of explaining that revenue is sales' job, not theirs." "seeingToday": "You are seeing that the ops people do not care about the numbers." "whoYouAreTryingToMove": "You are trying to move the operations team, the fifteen people in warehouse and dispatch." "whatMeaningfulChangeWouldLookLike": "You would notice people telling you before a truck is late, not after." and "You would notice dispatch phoning the shop themselves." | Pass. Before, it said "Groundwork has not yet written down what you are carrying." |
| The people step, with names | Lead | `contributors` with `displayName` and `email` committed. The saved check-in has `scenario HELP_TEAM_UNDERSTAND` and `started_from anchor`. | Pass |
| The invitation | Person on the team (Mercy) | Subject "Wanjiru is trying a different way to help the team get on the same page." The lines: "For the next month, Groundwork will check in with each person one to one about the work you’re doing, what you’re seeing, what’s getting in the way and how it connects to the bigger picture." "Wanjiru wants to hear your side." "There aren’t right answers. The point is to help the team understand one another better and make the work move." Button "Start your first check-in". The invitation page carries her name, "Mercy Wafula". | Pass. The email has no HTML comment. |
| What the team is told | Person on the team | `brief.says` is `null`, `objectives` is `[]`. For a check-in made before the fix, `says` still held "This check-in is about how project managers work when they finish their deliverables ...", written from the lead's own conversation. | Pass for a new check-in. An older anchor check-in keeps what was written then (the rows can be rerun). |
| The baseline, opening | Person on the team (Linet) | "Hi Linet, this is a short conversation to hear how your work looks from where you sit. There are no right answers. What are you working on right now?" Before: "are you the person this check-in is about, or somebody working alongside them?" and, after it, "What did you understand your role in this to be". | Pass |
| The baseline, the nine | Person on the team (Linet, Mercy, Salma) | One question at a time, in this order: working on, matters most, responsible for, success, what Wanjiru is most concerned about, what makes the work difficult, who they depend on, who depends on them, what the team could do better. No suggested answers were served. Then: "Thank you for telling me how your work looks from where you sit. The others on the team are being asked the same, and Groundwork will then show where what people say matches and where it does not." | Pass, after six faults found and fixed one at a time (see the morning report). |
| The baseline, a defensive person | Person on the team (Peter) | "Why does she want to know all this? Is this about my numbers?" The first answer promised "It's about getting your view of the work, not about your numbers." | Fixed: it now says "it helps the team understand one another and get the work moving, and there are no right answers" and promises nothing else. |
| The baseline, "for instance" | Person on the team (Linet) | "What would success look like to you for these accounts, specifically? For instance, something like invoices paid within five days ..." | Fixed: a sentence that offers an example answer comes off, and the reminder read last forbids it. |
| The baseline, closing | Person on the team | After the nine, "I have one more question before we finish. What will you do about this, and by when?" | Fixed: the baseline is never held for a next step, a date or a number. |
| An idea in the last answer | Person on the team (Grace) | "Maybe we should hold a short review with every shop one month before the contract ends, so the next project is already half agreed." The offer: "That sounds like a concrete idea. Want me to capture it for the team?" "Yes, capture it" gave "I have captured it for the team. Everyone in this check-in will see it, with your name." Before, the session closed on that answer and the idea was lost. A statement of what success looks like ("That every shop is live and the manager signs it off") was wrongly offered as an idea, and no longer is. | Pass. The row carries `promptVersionId` `5d100cc3-...`. The lead reads "Ideas from your team", "Raised by Grace.", and the title starts with a capital letter. |
| Leave offered in the check-in, and filed | Person on the team (Peter) | "Can I take Friday off next week? My daughter has a school event." offered "Shall I treat this as a leave request?" and "Yes" gave "You can submit that through Leave here and it'll appear on your manager's board." with the button "Request leave" and `prefill {startsOn 2026-10-16, endsOn 2026-10-16}`. The form sent gave "I have sent your leave request on Friday 16 October to an admin. It is not approved until they decide, and you will see it under your leave." | Pass, after two faults found and fixed: it was neither offered nor read right ("Friday off next week" was read as this week's Friday). |
| Spending offered in the check-in, and filed | Person on the team (Peter) | "I need 15,000 shillings approved for fuel for the van this week." offered "Shall I treat this as a spending request?" and "Yes" gave "I can turn that into a payment request so it appears on the appropriate board." with "Create request". The form sent gave "I have sent your request to spend KES 15,000 on fuel for the van this week to an admin. It is not approved until they decide, and nothing is spent until then." An amount of nothing gave "Give an amount of more than nothing." | Pass. The prefill was empty at first, because a sum asked for without the word "spend" was not read. |
| The approver | Admin (Wanjiru) | The leave board: "It is waiting for you." and "Peter asked for leave on Friday 16 October, which is 1 working day." The spending board: "It is waiting for you." | Pass |
| The month board | Lead (Njeri) | "Are we moving together?", "Week 1 of the month", "One idea from your team has been captured." and "Groundwork is checking in with the five people who have not yet answered this round." | Pass |
| The walker | Lead, two people, an admin who only reads | `walk-the-anchor-as-each-reader.ts` against the seeded live and ended check-ins in the same database: "Every reader was served what they may read, and nothing else." | Pass, after its rule learned that an ended check-in has no active line |
| The end-of-month read, an ended check-in | Lead (Rukia) | "This check-in has ended." and "This check-in has ended, so Groundwork is not asking anyone for more." No active line. "This started as one check-in." "During the month, Groundwork also found this." "Groundwork did not find a project that could have a check-in of its own." ... "Your team has already started building its Groundwork." The four ways on: "Keep this check-in running", "Start the recommended check-ins", "Turn on the suites that fit", "Continue Groundwork for the team". | Pass. Before: "This started as one Ground.", "0 projects that could have their own Ground." and "Week 4 of the month". |

**Left over, not fixed here.** (1) After `ready`, the screens still go to the ordinary fork and a second, generic conversation (their work, request 166). (2) The free plan stops a lead adding a fifth person in this local database, because the anchor's own limit of 20 is behind `pricing.anchorTrial` (off). (3) Once a baseline reply asks nothing, the product's own "What else should I know?" can follow it. (4) After "Yes, capture it" the model once said "I'm glad you found this helpful, Grace." (5) The leave and payment pages are the screens' (request 165), so the forms themselves were not walked.

## Tester B's final check of 2bd25a9e, started the way the hosted server starts (6 October, early)

**What was run.** A new detached worktree of `2bd25a9e` in the scratchpad, `npm ci` in `api`, `client` and `e2e`, a new empty database `gw_final_b` with all 361 migrations (`prisma migrate deploy`, none failed), `nest build` (the server is at `dist/main.js`, there is no `dist/src`, and the embed's files are there), and the client built with `vite build`. The API ran with `npx prisma migrate deploy && node dist/main` on port 3020, with no `.env` file at all. It had the local database, a test JWT secret, `EMAIL_SENDS_FOR_REAL` unset, a settings key made with `openssl rand -base64 32` and held only by the start command, the model's credentials linked from the main tree, Stripe's placeholder test key, and `WHATSAPP_GRAPH_BASE_URL` pointed at a recorder on 127.0.0.1. The built client was served with `vite preview` on 5173. Nothing left the computer. `npm ci` skipped the packages' install scripts (npm's new allow-scripts warning), but Prisma's client was generated anyway, so nothing had to be done by hand.

**Verdict on the anchor: it should ship OFF.** The landing link works, but the lead's conversation does not make an anchor check-in. Signed out and signed in, `/start/team` led to `/start?scenario=HELP_TEAM_UNDERSTAND` and the anchor's first question. Then the page said "This sounds like Get a project back on track.", the summary said "Sessions One", and the setup went on as an ordinary check-in ("12 sessions planned"). There was no reveal and no people step. The later pieces work on the anchor seed: the baseline, an idea captured, the month board, the walker and the end-of-month read.

| Journey | Reader | What they saw (quoted) | Result |
| --- | --- | --- | --- |
| Browser journey 1: sign up, invite, suites, Ask, Company page | Admin (Grace) | As committed, it fails at "Ask Groundwork". The button now reads "Ask Kito Foods 1791234997337" (decision 100), and the box reads "Ask about the company, your work or your check-ins." With only those two names changed in a scratch copy, it passes. | Pass (the committed test is stale) |
| Browser journey 2: set up from a pasted plan, invite, yes to the read-back, board, Ask | Lead (Wairimu) | Passes in 2.2 minutes. | Pass |
| Browser journey 3: invitation, check-in, board, Ask, leave | Participant (Amani) | It passed on the second run. On the first run, "Your requests" read "You have not asked for any leave.", although the request had been saved 0.3 seconds earlier. The test opens the page straight after "Yes", so this is a race in the test, not a lost request. | Pass (one step is flaky) |
| Browser journey 4: approve leave, a review, the Company page | Admin, lead, participant | Passes. Amani then reads "Your leave from Tuesday 20 October to Thursday 22 October is approved by Grace Achieng." | Pass |
| Spending through Ask, then approved | Participant, then admin | "Can I spend KES 15,000 on fuel for the van this week?" was answered "Shall I send it to an admin to approve?". After Yes, she read "I have sent your request ... It is not approved until they decide." Grace pressed "Approve Amani's request" on the spending board. But "Can I spend 15,000 shillings on fuel for the van this week?" got "What is the KES 15,000 for? Tell me in a few words and I will ask again.", and the answer "Fuel for the van to deliver the Fresh Basket order." got "I cannot answer that one yet." When the amount is written "15,000 shillings", the purpose is never read, so the request cannot be made that way (`readSpending` in `spend-said-in-chat.ts`). | Pass with "KES 15,000". Fail with "15,000 shillings" |
| Plan and billing, before the release step | Admin | The WhatsApp section shows a switch with no label, above two rows, "What is charged" and "This month", that have nothing in them. The server sends `{on, sending, says}` while the switch is off, and `isWhatsAppBillingAdmin` treats any answer that has `on` as the admin's full answer. | Fail (an empty, unlabelled part on the page) |
| Plan and billing, after step 13a's check and both statements | Admin of a team made before the switch | The check returned no organisation. The page then said "Teams of fewer than 20 people get 1 month free. No card needed." After the switch was pressed, it said "WhatsApp is on for your organisation." and "Nothing is charged for WhatsApp while you are on the free plan." | Pass |
| A new team made after the switch, which was asked its size | Admin (Juma, "Fewer than 20") | "Small Team, free until 6 November 2026. 1 of 20 people." On the same page, "Your free trial lasts 1 month and ends on 5 November 2026." The page gives two different end dates. "WhatsApp costs $72 a month on your Small Team plan." | Pass, with the date fault |
| A new team made after the switch, which named itself on the sign-up form | Admin (Wanjiru) | The sign-up form says "Teams of fewer than 20 people get 1 month free. No card needed." but never asks the team's size. Plan and billing then says "No plan yet. Choose one below to open check-ins and add people." The API refuses a new check-in with "Your organisation has no plan yet. Choose one on Plan and billing to open a check-in." | Fail (it blocks new sign-ups once step 13a runs) |
| Back office, WhatsApp | Platform admin | After saving, the page said "Connected." and "The access token is set. It was saved here and is kept encrypted." The stored row holds no secret in plain text. The handshake answered 200 with the saved verify token and 403 with a wrong one. "The test message went to +447700900998." The System tab's switch turned WhatsApp on. One oddity: the System tab says "A Stripe key is set ... Live" for the placeholder key. | Pass |
| WhatsApp, a full check-in ending with "finish" | Participant (Chidi) | "I need a little more from you before this check-in can close. Please answer one or two more questions, then write "finish" again." Then "Your check-in is complete and on record. Your report follows in a moment." and "Your report for Sales team, Q4 is ready." | Pass |
| WhatsApp, reminders | Participants | `checkin_overdue` ("Hi {name}, your check-in for {check-in} is overdue. It's still open, so you can answer here now.") and `checkin_due_tomorrow` went once each, and never twice in one morning. | Pass |
| WhatsApp, leave with the approver replying | Participant, lead | "You asked for leave from Tuesday 20 October to Thursday 22 October, which is 3 working days. ... Shall I send it to Wairimu to approve?" Wairimu replied "approve" and read "Amani's leave from Tuesday 20 October to Thursday 22 October is approved now. I have let Amani know." Declining and asking a question also worked. | Pass |
| WhatsApp, the lead's daily summary | Lead (Wairimu) | "Good morning Wairimu. Here's today's summary of your check-ins: In "Sales team, Q4", 1 of 4 people have checked in, and you, Baraka and Amani have not yet. Amani's leave ... is waiting for you to approve or decline. Open the board for the full picture: ..." The script's check failed only because it expects "Amani and Baraka" in that order. It passed on the next run. | Pass (the check depends on the order of names) |
| WhatsApp, journeys 1 to 13 in all | Everyone | 157 of 159 passed on 2bd25a9e. The other failure is "Before anything is saved, nothing is set", because in this run the details were saved on the page first. | Pass |
| Anchor, the landing link | Stranger | "Help your team see the bigger picture." The button "Help my team understand →" leads to `/start?scenario=HELP_TEAM_UNDERSTAND`. | Pass |
| Anchor, the lead's conversation, the reveal and the people step | Lead, signed out and signed in | "This sounds like Get a project back on track." and "Sessions One", then the ordinary setup with "12 sessions planned". There was no reveal and no people step. | **Fail** |
| Anchor, a member's first check-in (on the seed, Wanjiku added by Rukia) | Participant | The invitation was right: "Rukia is trying a different way to help the team get on the same page." But Rukia could not add anyone until she wrote a brief, because the seed has none: "Nobody can be invited yet: nothing has been said about what this check-in is for." The baseline asked one question at a time. Its first question offered "I believe we are shipping the product." and "We are stuck on the ... problem." as answers. It never asked who she depends on, who depends on her, or what she is responsible for. | Fail (the same baseline gap as on 5 October) |
| Anchor, an idea | Participant, then the lead and a colleague | "That sounds like a concrete idea. Want me to capture it for the team?" After "Yes, capture it", the board showed it to Rukia and to Amani under "Ideas from your team", with "Raised by Wanjiku.". It starts with a small letter: "if the warehouse got a copy ...". The idea row has no `promptVersionId`. | Pass, with two small faults |
| Anchor, leave asked for inside the check-in, with `release.requestOfferInTheCheckIn` absent | Participant | "Can I take a day off on Friday?" got no offer. The reply was "Even a quick check-in helps - where did the idea for the team, with Juma picking orders earlier, land?", so her question was ignored. | Pass (the switch is off) |
| Anchor, the month board | Lead | "Are we moving together?", "One idea from your team has been captured." and "Baraka is waiting on Juma for the warehouse to load the van earlier than seven." | Pass |
| Anchor, the walker | Lead, two participants, an admin who only reads | "Every reader was served what they may read, and nothing else." 8 of 8 reads were right. | Pass |
| Anchor, the end-of-month read (`/grounds/:id/end`) | Lead | "You wanted your team to understand..." with her own words, then "What we found", "What's still stuck" and the other parts. But it also says "This started as one Ground." and "0 projects that could have their own Ground.", which uses the internal word "Ground". The ended check-in's board still says "Week 4 of the month" and "Groundwork is checking in with the one person who has not yet answered this round." | Pass, with wording faults |
| Hidden: `release.boardKindsOffered` absent | Lead | "Groundwork does not offer that kind of work yet. Choose one of these: sales org, engineering release." "sales org" was accepted. | Pass |
| Hidden: `release.contextInAskGroundwork` absent | Lead | "Add this to my Sales team check-in: ..." got "I cannot answer that one yet." (lane `unplaced`), and the old context chat answered 200. But Ask's welcome still says "You can also add context or documents to your check-ins here." | Fail (Ask promises what is hidden) |
| Hidden: `release.planAndBillingNewParts` absent | Lead, admin | The lead reads "Your organisation has not turned on WhatsApp, so Groundwork does not send you reminders or summaries on WhatsApp." The admin sees the empty part described above. | Fail (the admin's view) |
| Hidden: `release.anchorScenario` absent | Stranger, lead, participant | `/start/team` goes to `/start`. `anchor-available` answers `false`, and `anchor-start` answers "This way in is not open yet." (404). The board sends `anchorScenarioOn: false` to the lead, and nothing to a participant. | Pass |
| Hidden: `release.whatsappHalfwayMessages` absent | None | With 5 check-ins open, the halfway job returned `{sent: 0}`. No "carry-on" send was recorded in any run. | Pass |
| Hidden: `release.requestOfferInTheCheckIn` absent | Participant | See the anchor row above. No offer was made. | Pass |
| Hidden: "Use simpler words" | None | It is not in `client/src` or `api/src`, and it was on no page that was read. | Pass |

**ca89aa5c (the scheduled job's lock), checked separately.** The same worktree was checked out at `ca89aa5c`, and only the API was rebuilt (`dist/main.js`, no `dist/src`). It was restarted on 3020 against `gw_final_b`, and the WhatsApp journeys were run again. The reminders all passed (12 of 12), and so did the lead's daily summary (8 of 8, with the names this time in the order the check expects). The whole run passed 158 of 159, and the one failure was the "nothing saved yet" check explained above. With one API running, its log has no "held elsewhere - skipping" line, and debug lines do reach that log. One caveat: the script runs the reminder and summary jobs itself, from its own copy of the app. So this proves the jobs, but not the lock under the API's own schedule, which ran only its every-minute and every-15-minutes jobs in that time. On 2bd25a9e the log had no such line either, because the halfway jobs that logged it before are now off.

**What was changed in gw_final_b to run all this.**
- Step 13a's check and its two statements were run.
- `whatsapp_enabled` was switched on through the System tab.
- A week's back-office pass was written for the staff account, because the emailed code is not in the log.
- `pricing.freeTrial` was set off while the WhatsApp script ran, because otherwise its world cannot open check-ins (see the sign-up row). It was put back with the release statement afterwards.
- The WhatsApp script and the anchor seed each switch `release.anchorScenario` on.
- Sokoni Fresh (the seed's organisation) answered the team-size question through `/org-new?naming=1` to get a plan.

Nothing in the repository was changed. The browser journeys ran from a scratch copy of `e2e` with the two names changed. Both servers were stopped and the worktree removed afterwards. `gw_final_b` is left in place for Hafsah to drop.

## The anchor pieces, proved with real conversations (5 October, night)

I built 9b4b54e8 in a separate worktree and ran it on port 3000, with a test settings key held only in the start
command and the local database only. Two things are wrong at this head before any conversation starts.

**The build no longer starts as it is meant to.** Three spec files under `src` now import from `journey/anchor`
(added in 27c0e105, 38afffc0 and 1d9ef0a5). That pulls `journey` into the compile, so the server lands at
`dist/src/main.js` instead of `dist/main.js`, and `start:prod` (`node dist/main`) will not find it. Started from
`dist/src/main`, it then stopped at boot because `embed.js` was not where it looked. I copied the static files into
the build output so the test could go on, and changed no source. This needs fixing before anything is deployed.

**The baseline (piece 14).** I added a new person, Wanjiru, to the live anchor check-in and let the model answer as
her. Every turn ran on `ad402fbe-9dcf-4eb6-a6f2-e34ac6a706e6`, and every turn asked one question, never a list.
But the questions were not the baseline's. After a first question about what the team is trying to achieve, she was
asked "What did you do, or not do, that helped get the team to this point?" and "What specifically exists now that
shows that adjustment? For instance, a document, a system, or something else that reflects these changes." Who she
depends on, who depends on her and what she is responsible for were never asked. Then the session closed after six
questions.

**Ideas (piece 19).** This works as written. Her idea was offered with "That sounds like a concrete idea. Want me
to capture it for the team?". "Yes, I sent the deck to Naivas last week." captured nothing. "Yes, capture it" captured
it, and the idea row carries `fields.promptVersionId` `3294fbe3-d3ef-4911-8737-89090d1ffe64`. Rukia and Amani both
see it under "Ideas from your team", with "Raised by Wanjiru.". Grace, an admin who is not in the check-in, does not
see it, and Wanjiru's own board is withheld until she finishes her check-in. One fault: straight after the capture,
the summary told her "You said you will send the updated price list to every shop on Monday morning." She never
said that. It was her idea for the team, not her promise.

**Leave and spending (pieces 26 and 27).** "Can I take a day off on Friday?" was offered as "Shall I treat this as
a leave request?". Her yes was answered "Your organisation also has the option to manage leave through Groundwork.",
with no button, because Sokoni Fresh has no suites on. So the sentence and button for when a suite is on are not
proved here. Two faults. In the same reply as the offer, the model said "I can't directly approve time off. That's
a conversation you'd need to have with Rukia." And "I need 15,000 shillings approved for fuel for the van this week."
was not read as spending at all, because the reader only knows the word "spend". "Can I spend 15,000 shillings on
fuel for the van this week?" was offered, and its yes gave the spending sentence.

**The walker.** `walk-the-anchor-as-each-reader.ts` reads the sign-in token from the top of the reply, but the API
wraps it in `data`, so every board came back 401 and it tested nothing. A scratch copy that unwraps the reply found
seven of eight reads right. The eighth is that Rukia is not served the end-of-month read on the ended check-in. The
seed stores her first words as a record entry, but `herOwnWords` reads only her conversation or the check-in's
brief, so the read never begins.

**The shared conversation did not move.** No anchor prompt was used outside Wanjiru's check-in. On sales, pip and
project (run-oct5d against the same three in run-oct5b) every problem is still 0, and the engine numbers moved both
ways, as fresh conversations do. Specific detail went from 20 to 33, blocker checks from 11 to 18 and past words
from 12 to 17. Agreements went from 14 to 12, patterns from 42 to 38, commitments from 22 to 19 and proof from 4 to 3.
Three scenarios are too few to call any of these a change.

## Decision 106 and how a check-in ends, on WhatsApp end to end (5 to 6 October, night)

Run 6 was built from `a86c38e1` on a fresh copy, `gw_wa_oct5f`. The API and the script were started with dummy server settings that differ from the details saved on the page, and the first-contact template was approved in the copy. **205 of 212 checks passed.** The 7 failures:

- **2 were the script's own mistakes, now fixed** (`936b2b22`). The message "You also have "Store visits" open. Reply START when you are ready to begin it." was right, but the script counted next week's session as open. The leave decision for Imani, who had said STOP, did go by email: the API's log shows "Your request for leave from Monday 9 November to Tuesday 10 November was approved". The script looked for it in a table that a local run does not write to.
- **5 were the halfway messages.** The half-hour warning did not reach the phone for sales, cohort and the anchor: its job skipped, because its advisory lock was "held elsewhere". The reminder to carry on did not reach the phone for project and cohort. All three halfway messages are now off at release, behind `release.whatsappHalfwayMessages`, and next week's plan has the work.

| Journey | What the person received (quoted) | Result |
| --- | --- | --- |
| The first message to a new number | "This is Groundwork, writing for Kito Foods. Hi Hana, your check-in for Store visits is open. It takes about five minutes, and you can answer right here. Reply START to begin. Not you? Reply STOP." | Pass |
| The second message to the same number | "Hi Hana, your check-in for Pipeline review is open. It takes about five minutes, and you can answer right here. Reply START to begin." | Pass |
| Two check-ins open, writing in cold | "You have two check-ins open: "Store visits" and "Pipeline review". Let's start with "Store visits"." | Pass |
| A reply to the second notice | "Pipeline review, session 1. ..." | Pass |
| "switch" | "You have more than one check-in open. Which is this for? Reply with the number." | Pass |
| Finishing one | "Your check-in is complete and on record. Your report follows in a moment." then "You also have "Store visits" open. Reply START when you are ready to begin it." | Pass (the check is fixed) |
| Connect WhatsApp | Before Hana writes, her own profile and her check-in carry the link `https://wa.me/447700900123?text=Hi`, labelled "Connect WhatsApp". After she writes, both carry nothing. Her lead and an admin cannot read her check-in. | Pass |
| One number for one person | An admin changes Hana's number, and her roster entry follows. Chidi's number is refused: "This number is already used by another Groundwork sign-in, so it cannot be saved here. Check the number, or ask that person to remove it from their Settings first." | Pass |
| STOP, from a first-contact number | "Stopped. Nothing more comes to this number from Groundwork unless you reply START. Your check-ins are still in Groundwork. Leave and spending decisions still reach you by email." After that, nothing more is sent to the number. | Pass |
| A decision for a stopped number | By email: "Your request for leave from Monday 9 November to Tuesday 10 November was approved" | Pass (the check is fixed) |
| Spending without "spend" | "I need 15,000 shillings approved for fuel for the van this week." is answered "Shall I treat this as a spending request?" | Pass |
| An unknown number | "Groundwork does not know this number yet. If you use Groundwork, add this number under Settings, or ask your admin to add it, then write again." | Pass |

## How a check-in ends on WhatsApp

This is what decision 107 keeps. Groundwork says when it is done, and the person writes "finish". For each kind, the run recorded three endings: Groundwork saying it is done and then "finish"; "finish" written after one answer; and stopping halfway. The halfway messages are off at release; the run switched them on in its copy to read them.

What the lead received, "(nothing)", is about WhatsApp only. Emails could not be read here: a local run logs its emails rather than recording them. The API's own log shows no email to the lead at these moments.

### sales
- Groundwork says it is done, after 10 answers: "You'll be calling the Quickmart buyer on Monday and are waiting for the updated price list from finance before Thursday. / That’s all for today. Reply "finish" to close this check-in, and your report will come here."
- Lulu writes "finish" and reads: "Your check-in is complete and on record. Your report follows in a moment. / Your report for Ending: sales is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 3 people have still to answer. Nobody has set anything to measure this against. You said, "Quickmart is still waiting on their buyer." There are 2 more worries on record, and nobody is waiting on anybody. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- What Lulu receives on WhatsApp at the end: "You'll be calling the Quickmart buyer on Monday and are waiting for the updated price list from finance before Thursday. / That’s all for today. Reply "finish" to close this check-in, and your report will come here." then "Your check-in is complete and on record. Your report follows in a moment." then "Your report for Ending: sales is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 3 people have still to answer. Nobody has set anything to measure this against. You said, "Quickmart is still waiting on their buyer." There are 2 more worries on record, and nobody is waiting on anybody. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- Emails to Lulu: (nothing)
- What the lead, Wairimu, receives: on WhatsApp (nothing); by email (nothing)
- "finish" after one answer: Moraa reads "I need a little more from you before this check-in can close. Please answer one or two more questions, then write "finish" again."
- Three hours quiet: Nuru reads "Hi Nuru, your check-in for "Ending: sales" is still open, and everything you have said so far is kept. Reply here to carry on whenever you are ready."
- Eleven hours quiet: Nuru reads (nothing)
- Twelve hours quiet, the clock closes it: Nuru reads "Your check-in for "Ending: sales" has closed, because nothing was said for twelve hours. Everything you said is kept on the record, and your report follows in a moment." then "Your report for Ending: sales is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 2 people have still to answer. Nobody has set anything to measure this against. Work is held up by the updated price list, which waits on finance. Nothing has stopped the work completely. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- What the lead receives then: on WhatsApp (nothing); by email (nothing)

### onboarding
- Groundwork says it is done, after 6 answers: "Understood. You have named what you will do next to get the Quickmart date. / That’s all for today. Reply "finish" to close this check-in, and your report will come here."
- Akinyi writes "finish" and reads: "Your check-in is complete and on record. Your report follows in a moment. / Your report for Ending: onboarding is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 3 people have still to answer. Nobody has set anything to measure this against. You said, "Quickmart is still waiting on their buyer." There is 1 more worry on record, and nobody is waiting on anybody. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- What Akinyi receives on WhatsApp at the end: "Understood. You have named what you will do next to get the Quickmart date. / That’s all for today. Reply "finish" to close this check-in, and your report will come here." then "Your check-in is complete and on record. Your report follows in a moment." then "Your report for Ending: onboarding is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 3 people have still to answer. Nobody has set anything to measure this against. You said, "Quickmart is still waiting on their buyer." There is 1 more worry on record, and nobody is waiting on anybody. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- Emails to Akinyi: (nothing)
- What the lead, Wairimu, receives: on WhatsApp (nothing); by email (nothing)
- "finish" after one answer: Bahati reads "I need a little more from you before this check-in can close. Please answer one or two more questions, then write "finish" again."
- Three hours quiet: Chebet reads "Hi Chebet, your check-in for "Ending: onboarding" is still open, and everything you have said so far is kept. Reply here to carry on whenever you are ready."
- Eleven hours quiet: Chebet reads "Your check-in for "Ending: onboarding" closes in 30 minutes if nothing else is said. Add anything you still want on the record now."
- Twelve hours quiet, the clock closes it: Chebet reads "Your check-in for "Ending: onboarding" has closed, because nothing was said for twelve hours. Everything you said is kept on the record, and your report follows in a moment." then "Your report for Ending: onboarding is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 2 people have still to answer. Nobody has set anything to measure this against. You said, "Quickmart is still waiting on their buyer." There are 2 more worries on record, and nobody is waiting on anybody. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- What the lead receives then: on WhatsApp (nothing); by email (nothing)

### project
- Groundwork says it is done, after 11 answers: "You will call the Quickmart buyer on Monday to get a date for their order in writing. / That’s all for today. Reply "finish" to close this check-in, and your report will come here."
- Dalia writes "finish" and reads: "Your check-in is complete and on record. Your report follows in a moment. / Your report for Ending: project is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 3 people have still to answer. Nobody has set anything to measure this against. You said, "Quickmart is still waiting on their buyer." There are 2 more worries on record, and nobody is waiting on anybody. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- What Dalia receives on WhatsApp at the end: "You will call the Quickmart buyer on Monday to get a date for their order in writing. / That’s all for today. Reply "finish" to close this check-in, and your report will come here." then "Your check-in is complete and on record. Your report follows in a moment." then "Your report for Ending: project is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 3 people have still to answer. Nobody has set anything to measure this against. You said, "Quickmart is still waiting on their buyer." There are 2 more worries on record, and nobody is waiting on anybody. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- Emails to Dalia: (nothing)
- What the lead, Wairimu, receives: on WhatsApp (nothing); by email (nothing)
- "finish" after one answer: Eshe reads "I need a little more from you before this check-in can close. Please answer one or two more questions, then write "finish" again."
- Three hours quiet: Faraja reads (nothing)
- Eleven hours quiet: Faraja reads "Your check-in for "Ending: project" closes in 30 minutes if nothing else is said. Add anything you still want on the record now."
- Twelve hours quiet, the clock closes it: Faraja reads "Your check-in for "Ending: project" has closed, because nothing was said for twelve hours. Everything you said is kept on the record, and your report follows in a moment." then "Your report for Ending: project is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 2 people have still to answer. Nobody has set anything to measure this against. Work is held up by the updated price list, which waits on finance. Nothing has stopped the work completely. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- What the lead receives then: on WhatsApp (nothing); by email (nothing)

### performance plan
- Groundwork says it is done, after 10 answers: "You said you will call the Quickmart buyer on Monday to ask for a date in writing, and you are waiting on the updated price list from finance before Thursday. / That’s all for today. Reply "finish" to close this check-in, and your report will come here."
- Gathoni writes "finish" and reads: "Your check-in is complete and on record. Your report follows in a moment. / Your report for Ending: performance plan is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 3 people have still to answer. Nobody has set anything to measure this against. You said, "Quickmart is still waiting on their buyer." There are 2 more worries on record, and nobody is waiting on anybody. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- What Gathoni receives on WhatsApp at the end: "You said you will call the Quickmart buyer on Monday to ask for a date in writing, and you are waiting on the updated price list from finance before Thursday. / That’s all for today. Reply "finish" to close this check-in, and your report will come here." then "Your check-in is complete and on record. Your report follows in a moment." then "Your report for Ending: performance plan is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 3 people have still to answer. Nobody has set anything to measure this against. You said, "Quickmart is still waiting on their buyer." There are 2 more worries on record, and nobody is waiting on anybody. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- Emails to Gathoni: (nothing)
- What the lead, Wairimu, receives: on WhatsApp (nothing); by email (nothing)
- "finish" after one answer: Halima reads "I need a little more from you before this check-in can close. Please answer one or two more questions, then write "finish" again."
- Three hours quiet: Itai reads "Hi Itai, your check-in for "Ending: performance plan" is still open, and everything you have said so far is kept. Reply here to carry on whenever you are ready."
- Eleven hours quiet: Itai reads "Your check-in for "Ending: performance plan" closes in 30 minutes if nothing else is said. Add anything you still want on the record now."
- Twelve hours quiet, the clock closes it: Itai reads "Your check-in for "Ending: performance plan" has closed, because nothing was said for twelve hours. Everything you said is kept on the record, and your report follows in a moment." then "Your report for Ending: performance plan is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 2 people have still to answer. Nobody has set anything to measure this against. You said, "Quickmart is still waiting on their buyer." There are 3 more worries on record, and nobody is waiting on anybody. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- What the lead receives then: on WhatsApp (nothing); by email (nothing)

### cohort
- Groundwork says it is done, after 8 answers: "visit the three stores in Kilimani next week is a specific action. You will call the Quickmart buyer on Monday and ask for a date in writing. / That’s all for today. Reply "finish" to close this check-in, and your report will come here."
- Jabali writes "finish" and reads: "Your check-in is complete and on record. Your report follows in a moment. / Your report for Ending: cohort is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 3 people have still to answer. Nobody has set anything to measure this against. You said, "Quickmart is still waiting on their buyer." There is 1 more worry on record, and nobody is waiting on anybody. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- What Jabali receives on WhatsApp at the end: "Ending: cohort, session 1. You can write "ask" at any time to talk to Ask Kito Foods 1791231388707, "back" to come back to your check-in, and "switch" to choose another check-in. / What you name here is what Wairimu will read, and being specific in these check-ins is how it works in your favour over the period. What specific actions have you completed since you started?" then "visit the three stores in Kilimani next week is a specific action. You will call the Quickmart buyer on Monday and ask for a date in writing. / That’s all for today. Reply "finish" to close this check-in, and your report will come here." then "Your check-in is complete and on record. Your report follows in a moment." then "Your report for Ending: cohort is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 3 people have still to answer. Nobody has set anything to measure this against. You said, "Quickmart is still waiting on their buyer." There is 1 more worry on record, and nobody is waiting on anybody. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- Emails to Jabali: (nothing)
- What the lead, Wairimu, receives: on WhatsApp (nothing); by email (nothing)
- "finish" after one answer: Kamau reads "I need a little more from you before this check-in can close. Please answer one or two more questions, then write "finish" again."
- Three hours quiet: Laila reads (nothing)
- Eleven hours quiet: Laila reads (nothing)
- Twelve hours quiet, the clock closes it: Laila reads "Your check-in for "Ending: cohort" has closed, because nothing was said for twelve hours. Everything you said is kept on the record, and your report follows in a moment." then "Your report for Ending: cohort is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 2 people have still to answer. Nobody has set anything to measure this against. You said, "Quickmart is still waiting on their buyer." There are 2 more worries on record, and nobody is waiting on anybody. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- What the lead receives then: on WhatsApp (nothing); by email (nothing)

### anchor
- Groundwork says it is done, after 10 answers: "You said you want to visit the three stores in Kilimani next week, and you'll call the Quickmart buyer on Monday to ask for a date in writing. / That’s all for today. Reply "finish" to close this check-in, and your report will come here."
- Makena writes "finish" and reads: "Your check-in is complete and on record. Your report follows in a moment. / Your report for Ending: anchor is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 3 people have still to answer. Nobody has set anything to measure this against. You said, "Quickmart is still waiting on their buyer." There are 2 more worries on record, and nobody is waiting on anybody. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- What Makena receives on WhatsApp at the end: "You said you want to visit the three stores in Kilimani next week, and you'll call the Quickmart buyer on Monday to ask for a date in writing. / That’s all for today. Reply "finish" to close this check-in, and your report will come here." then "Your check-in is complete and on record. Your report follows in a moment." then "Your report for Ending: anchor is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 3 people have still to answer. Nobody has set anything to measure this against. You said, "Quickmart is still waiting on their buyer." There are 2 more worries on record, and nobody is waiting on anybody. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- Emails to Makena: (nothing)
- What the lead, Wairimu, receives: on WhatsApp (nothing); by email (nothing)
- "finish" after one answer: Neema reads "I need a little more from you before this check-in can close. Please answer one or two more questions, then write "finish" again."
- Three hours quiet: Okoth reads "Hi Okoth, your check-in for "Ending: anchor" is still open, and everything you have said so far is kept. Reply here to carry on whenever you are ready."
- Eleven hours quiet: Okoth reads (nothing)
- Twelve hours quiet, the clock closes it: Okoth reads "Your check-in for "Ending: anchor" has closed, because nothing was said for twelve hours. Everything you said is kept on the record, and your report follows in a moment." then "Your report for Ending: anchor is ready. / Not everyone has answered yet, so there is nothing to agree or differ with. / 2 people have still to answer. Nobody has set anything to measure this against. Work is held up by the updated price list, which waits on finance. Nothing has stopped the work completely. Nothing said this session has a document behind it. / Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?"
- What the lead receives then: on WhatsApp (nothing); by email (nothing)

### kept in the app
- Not recorded in run 6. The script asked for the check-in with `overWhatsApp` in the request, which the API refuses, so this kind was never made. That is fixed in the script, not yet run. What is proved for a check-in kept in the app is in journey 10: nothing about it reaches the phone, and a message to it is answered "Your check-in "Private notes" is kept in the Groundwork app, so I cannot take your answers to it here. Please open Groundwork and answer it there."

### With the lead's "Use simpler words" setting on (6 October, commits `4914e1d3` to `28c57edc`)

**How it was run.** A new worktree of `wip/release` in the scratchpad (the committed branch, with `node_modules` linked, `.env` copied and `credentials` linked), `nest build`, a new local database `gw_simpler_words` copied from `gw_wa_oct5f` and migrated (the new migration only adds `grounds.simpler_words`, false). The API ran on port 3047 with a recorder for Meta on 127.0.0.1:3996 and `EMAIL_SENDS_FOR_REAL=false`, so nothing left the computer. The model was the real one. The script is journey 16 from the committed branch, cut down to the "done, then finish" ending for two kinds, each made twice by the same lead (Wairimu) with the same twelve answers: once with the setting off, and once after she switched it on with `PATCH /grounds/:id/simpler-words`. In the scratch copy only, the three places in `whatsapp-for-an-organisation.service.ts` that say these sentences were made to pass the switch on, because that file belongs to another builder. That change is not committed here; it is written out in the morning report.

Everything is quoted, word for word.

#### sales

| | Setting off | Setting on |
| --- | --- | --- |
| Groundwork's closing turn (to the person) | "You said you will call the Quickmart buyer on Monday and ask for a date in writing. / That’s all for today. Reply "finish" to close this check-in, and your report will come here." | "You have said all you have for this week. / That is all for today. Write "finish" to end this check-in. Your report will come to this chat." |
| After "finish" | "Your check-in is complete and on record. Your report follows in a moment." | "Your check-in is finished, and your answers are saved. Your report will come in a moment." |
| The report on the phone, first line and the last | "Your report for Ending: sales (switch off) is ready." and "Here is a conversation worth having. Which of those conversations was with someone who can actually decide, with the budget and the authority?" | "Your report for Ending: sales (switch on) is ready." and "Here is one thing worth talking about. Which of those conversations was with someone who can actually decide, with the budget and the authority?" |
| The lead, Wairimu, on WhatsApp | (nothing) | (nothing) |
| Emails to the person | (nothing) | (nothing) |

#### onboarding

| | Setting off | Setting on |
| --- | --- | --- |
| Groundwork's closing turn | "You will call the Quickmart buyer on Monday to ask for a date in writing, and you want to visit the three stores in Kilimani next week. / That’s all for today. Reply "finish" to close this check-in, and your report will come here." | "You have said you will call the Quickmart buyer on Monday to ask for a date in writing. / That is all for today. Write "finish" to end this check-in. Your report will come to this chat." |
| After "finish" | "Your check-in is complete and on record. Your report follows in a moment." | "Your check-in is finished, and your answers are saved. Your report will come in a moment." |
| The report on the phone, last line | "Here is a conversation worth having. Which of those conversations ..." | "Here is one thing worth talking about. Which of those conversations ..." |

**Re-run after the rule was changed to say "simpler words never mean saying less" (`cfd5724b`), 6 October.** The sales and the new-hire (senior hire) scenarios of the 24-scenario runner, each run twice on the real model on two copies of the database, once with the switch off and once with it on (the on copy forces the switch on for every check-in the run makes; a first on run that did not do this was thrown away because its check-ins were off). Scored with `tools/score_run.py`:

| | Off | On |
| --- | --- | --- |
| proof asked for (turns) | 6 | 6 |
| past words brought back (turns) | 25 | 37 |
| specific detail asked for (turns) | 35 | 41 |
| blocker checked (turns) | 15 | 25 |
| commitments recorded | 22 | 27 |
| differences found / agreements found / per-person findings | 10 / 17 / 18 | 11 / 21 / 20 |
| patterns found | 33 | 47 |
| turns that ask more than one question | 0 | 0 |
| every problem in what people read | 0 | 0 |
| jargon in Groundwork's turns / in reports and boards | 19 / 22 | 13 / 45 |

Nothing in the engine value fell. The counts are for two scenarios and one run each, so differences of a few are the model's own variation, not an effect. One number is worse: jargon in reports and boards, 22 off and 45 on. Nothing in the rule asks for it, and these are word counts on two reports; it is not explained and should be looked at before this is shown to a customer.

**Why jargon in reports and boards read 22 off and 45 on, looked at word by word (6 October).** All 22 and all 45 are the scorer's own words in the reports and boards: off has "pipeline" 10, "escalated" 6, "bottleneck" 6; on has "pipeline" 16, "escalated" 10, "escalate" 12, "escalation" 4, "bottleneck" 3. Three things explain it, and none is the report block. (1) The on arm ran one more session, so it has 28 reports and boards against 24. (2) Each report sentence is counted again on the board and on the participant's board, so 8 different sentences in off became 23 in on, each counted about three times. (3) The people in the scenario say the words themselves: "escalate", "pipeline" and "bottleneck" were said 8 times by people in the off run and 12 to 14 times in the on runs. The report keeps what people said and committed to ("I will escalate again"), and the rule says to use their own words unchanged, so those hits cannot be removed without breaking that rule. I tried adding to the report block "do not use work words such as pipeline, bottleneck, escalate or escalation where you are not quoting", and re-ran the on arm: jargon in reports and boards was 60, not lower (and proof asked for was 4 against 6), so the sentence did nothing useful and I took it out again (a revert). **The number is not at or below off, and it is not explained by anything the switch does in the report.** Per session it is 3.7 off against 6.4 and 8.6 on; the scenario runs are one per arm, so a second off run is the way to see how much of that is the model's own variation, and I have not done it.

Closing turns, quoted. Off: "You said you will call the credit team directly this afternoon. / That’s all for today. Below is what I wrote down from your answers. Is anything wrong?" On: "You will follow up with all 22 customers by the end of today to push for missing documents. / That is all for today. Below is what I wrote down from what you said. Is anything wrong?" and, new hire, on: "Understood. By the end of the week, you will send follow-up emails to each client asking them to confirm their review of the QBRs. If you don't hear back, you will make a note of it. / That is all for today. ..." **Not every close says the commitment back, off or on.** Off has "Understood." alone twice; on has "That is the work you will do." and, for the senior hire's first session, a close with nothing before it. The earlier on-run finding (commitment say-back dropped) is therefore not fully gone; it is no worse than off here, but it is not fixed.

From the committed code (`cb561c20`) with the switch on, the sales check-in on WhatsApp: "You said you will call the Quickmart buyer on Monday to ask for a date in writing. / That is all for today. Write "finish" to end this check-in. Your report will come to this chat." then, after "finish", "Your check-in is finished, and your answers are saved. Your report will come in a moment." then "Your report for Ending: sales is ready. ... Here is one thing worth talking about. Which of those conversations was with someone who can actually decide, with the budget and the authority?" The reminder at three hours: "Hi Nuru, your check-in for "Ending: sales" is still open. Everything you have said is saved. Write here to carry on when you are ready." and at eleven hours: "Your check-in for "Ending: sales" will close in 30 minutes if you say nothing more. Add anything you still want saved now." The onboarding check-in was not reached in this WhatsApp run (the database ran out of connections while other runs were using it), so the WhatsApp side is read for sales only.

**What is plainer, and what is not yet.** The closing turn (the model's own sentence before the close, and the close), the reply to "finish", and the line that introduces the report's one question are plainer with the setting on. The report's own middle sentences are the same with it on and off, because they are fixed sentences in the report builder: "Not everyone has answered yet, so there is nothing to agree or differ with." and "Somebody named a number, and nothing is tracking it." and "There are 2 more worries on record, and nobody is waiting on anybody." They have no plain form yet. The report's model-written parts do get the plain-words rule, but a report was not written afresh in this run, so that is proved only in the prompt (a test), not in a live report. The reminders and the emails have their plain forms and tests, and are not sent from this run: the code that sends them is another builder's, and a reminder outside the 24 hours is sent as a template Meta has approved, so a plainer reminder there needs a plainer template approved first.

## WhatsApp end to end, from the settings saved in the back office (5 October, night)

Hafsah's item 3. I built `394e9ea8` and then `82f5a7ae` in a separate worktree, and started the API on port 3014 against fresh copies of `gw_pw9_1786222102` (`gw_wa_oct5b` to `gw_wa_oct5e`). Port 3000 and the tester's database were not touched. `WHATSAPP_GRAPH_BASE_URL` pointed at a recorder on 127.0.0.1:3996, so nothing left the computer, and the model was the real one.

A platform admin typed test values into `/admin/whatsapp/settings`, checked the connection, sent a test message and switched WhatsApp on. Every inbound message was signed with the app secret saved there. In the last run, the API and the script were also started with different dummy `WHATSAPP_*` server settings (`WHATSAPP_ENV_DIFFERS=1`), to prove that the saved details win. The script is `api/journey/whatsapp-journeys.ts`, with `whatsapp-journeys-steps.ts` and the new `whatsapp-journeys-more.ts` (onboarding, project and the anchor).

**Result: 165 of 165 checks passed (run 5, `gw_wa_oct5e`).** The first run had 154 of 158. Two of its failures were old expected sentences: Ask is now named after the organisation. Two were real bugs, and both are fixed:

- **Kesi's report reached her in Swahili** although she wrote only English. The language read had taken "Naivas" and "shillings" for Swahili. It is fixed in `8d4955fa` (`plainly-english.ts`).
- **"What leave have I asked for, and what was decided?" read "I cannot answer that one yet."** The check passed anyway, because it only checked that the question was not taken for a request. It is fixed in `394e9ea8`, and the journey now checks the answer itself.

| Journey | What the person received (quoted) | Result |
| --- | --- | --- |
| Staff save the number | "The access token is set. It was saved here and is kept encrypted." Then "Connected. Meta has this number as +44 7700 900123, under the name Groundwork." Then "WhatsApp is on for everyone. Messages go from this number." | Pass |
| The test message, to the typed number only | "This is a test message from Groundwork. If you can read it, Groundwork's WhatsApp number is working." | Pass |
| The saved details win over different server settings | Handshake with the saved verify token: 200. With the server's: 403. A post signed with the server's app secret: 401. With the saved one: accepted. All 134 sends carried the saved phone number ID and token, and none carried the server's. | Pass |
| A saved secret is removed | "The app secret is set in the server's settings. Anything you save here replaces it." After that, the server's secret is accepted and the removed one refused, and the same holds for the verify token. The test message then went with the server's token and the saved phone number ID. | Pass |
| The verify handshake and a bad signature | The challenge comes back bare. A wrong token gets 403. A wrong or missing signature gets 401, and nobody is written to. | Pass |
| The first session is announced | "Hi Amani, your check-in for Sales team, Q4 is open. It takes about five minutes, and you can answer right here. Reply START to begin." | Pass |
| Sales, in full | "Your check-in is complete and on record. Your report follows in a moment." Then "Your report for Sales team, Q4 is ready. ..." | Pass |
| Onboarding, in full (Zawadi) | "Your report for Zawadi joins Sales is ready. ... You said, "I still do not know who approves a discount above ten percent."" | Pass |
| Project, in full (Juma) | "Your report for Cold room project is ready. ... You said, "The electrician has not confirmed a date yet."" | Pass |
| A photo and a document | "Your photo is on your check-in with your note: The signed order from Green Mart. Only you can see this, and nobody else can open it." and ""renewals-notes.txt" is on your check-in." | Pass |
| Leave, with the approver on WhatsApp | "You are approving Amani's leave from Tuesday 20 October to Thursday 22 October. Is that right?" Then "Hi Amani, your request for leave from Tuesday 20 October to Thursday 22 October was approved by Wairimu. Open Groundwork to read it." | Pass |
| Spending, with the approver on WhatsApp | "You are approving Baraka's request to spend KES 12,000 for fuel for the delivery van. Is that right?" Then "Baraka's request to spend KES 12,000 for fuel for the delivery van is approved now. I have let Baraka know." | Pass |
| Reminders | "Hi Amani, your check-in for Renewals is overdue. It's still open, so you can answer here now." | Pass |
| The anchor's nudge | "Hi Kesi, last time you said you would send the corrected price list to Quickmart. I'd love to hear how it went. Your check-in for Sales team weekly is open, and you can answer here." | Pass |
| The lead's daily summary | "Good morning Wairimu. Here's today's summary of your check-ins: In "Sales team, Q4", 1 of 4 people have checked in, and you, Amani and Baraka have not yet. ..." | Pass |
| The anchor's weekly insight | "Hi Wairimu. Your team is starting to move. This week, one of two people checked in, and one has said what they will do themselves. This week's picture is on the board at ..." | Pass |
| Ask Groundwork | "Your leave from Tuesday 3 November to Wednesday 4 November is waiting for Wairimu. ..." (to both questions, after the fix) | Pass |
| "not now" and "stop" | "All right. I will not write to you first again today. ..." and "Stopped. Nothing more comes to this number from Groundwork unless you reply START. Your check-ins are still in Groundwork." | Pass |
| No add-on, the monthly limit, the switch off | "Your organisation has not turned on WhatsApp, so this check-in stays in the app. You can carry on in the Groundwork app." | Pass |

**Not fixed, for Hafsah or the engine:**

1. **The slowest webhook call took 42 to 108 seconds, and it was "START" every time.** Meta sends a message again when it does not get a quick answer. A repeated message is answered only once, so nothing is doubled, but the person waits. Answering Meta first and then doing the work would fix it, and that is a change to how the webhook works.
2. **Two kinds of check-in open with a question that does not suit them.** Zawadi's onboarding, Juma's project and Kesi's anchor check-in all open with "Before anything else, so this asks you the right things: are you the person this check-in is about, or somebody working alongside them?" For a check-in with one person in it, this is an odd first question.

## Crisis, snapshot and project again, with the judgement's stored prompt (5 October, evening)

I ran the three scenarios again on a build of 0e9157bd, made in a separate worktree so the builder's
tree was not touched, into run-oct5c. The first try failed, and nothing in it counts. The worktree had
no `credentials` folder, which is kept out of git, so every model call failed and every check-in was
refused. I linked the folder and ran it again. The failed try is kept as run-oct5c-nocreds.

All three judgements ran on the new stored prompt `the_judgement_room` version 1
(`ae0c6fa4-76e5-4f20-a0cc-fd6fadb78217`), and the reports on report_synthesis version 8. Every report
has one finding for each person who answered. The number check left nothing out in any of the three.

Two of the three faults are gone. Crisis no longer says "7 AM alerts", and snapshot no longer calls
the lead "they". The third is still there. Project still tells the lead "Your own account of this is
not in this check-in." about whether they saw Rita's requirements, and crisis now says it too, about
how Sarah knew, beside a broken sentence: "Sarah is not a person to this check-in".

Against theDecision, snapshot is still right. Crisis drops from right to partly right: it finds a
process that failed rather than a person, but never says the rota named somebody who had left. It
also says Priya was not on call, while its own findings say she was. Project drops from right to
partly right, because it leads with the missing credentials rather than the scope. These are fresh
conversations, so some of that is the people answering differently, and three scenarios are too few
to call a trend.

## The 24-scenario run, run-oct5b, scored (5 October)

Hafsah said the run could start again, and it ran from 15:50 to 17:36 in three shards against the
local API and the local database only. It measures the code at d59a8b17, built at 15:48. The
judgement work committed after that, from a0992885 onward, was not in the running API, so this run
says nothing about it.

All 24 scenarios finished and none failed. The runner printed "settled short" 24 times, but every
captured report has one finding for each person who answered, nobody is left behind, and the
database agrees for sales (4 findings) and seniorhire (2). So the warning fired while the report was
still being written, and the numbers can be trusted. Every report ran on report_synthesis version 8,
`dfce4b13-2929-4c58-ad2e-485bf60d08ff`, and all 58 active stored prompts match the file word for word.

The scorer says nothing got worse than the baseline. All eleven problems are at 0. Ten of the eleven
engine-value numbers are level or up. "Proof asked for" is 41 against 42, which is inside the
scorer's 10% margin, and 27 of those 41 count only the word "picture", as in "a clear picture of
what happened". That leaves about 14 real requests for proof, so the true number is well below the
baseline, and how to count it is still with Hafsah.

Against theDecision, judged strictly: 15 of 24 are clearly right, 7 are partly right and 2 miss
(recognition and shock).

## The judgement on a check-in of one, and a decision I did not make (5 October)

Request 136 item 7 is fixed: the founder, the only person in her own check-in, was
being told "Your own account of this is not in this check-in." about her own
commitments. It now says nobody else answers it, which is the true thing. The wording
is mine and marked PROVISIONAL — the prototype has no screen for a check-in of one.

Doing it meant adding an argument to a call whose exact source text one test pinned, so
that test now pins what matters (the judgement goes through the lead-only wrapper, with
isLead from isInitiator) rather than the line's formatting. That is the same change the
screens workspace asked for in request 138.

PROVISIONAL DECISION, logged rather than done: I have not restarted the 24-scenario
run. It is the next thing in the queue and the machine is quiet again, but Hafsah
stopped that exact run an hour ago because the computer was slow, and restarting it
unasked is the one thing that plainly contradicts "stop every one that isn't needed
right now". It takes hours and would block everything else. It is ready to start the
moment she says so.

## Two more fixed, and six of my "open" items were not open (5 October)

Fixed and pushed: the founder's aim "Get to 20 paying customers by December." now holds
its number, so her board has an answer and a bar instead of nothing (136 item 1); and
"who can provide the fuel allowance for October **that** Aisha Wanjiku is waiting for"
(132 f), which meant changing two test expectations that pinned the sentence without
the "that" — they were pinning the defect.

Then I had to correct myself. The open list I published listed six items that already
had fixes: 123 (3), 123 (4), 123 (10), 129 (2), 131 (5) and 132 (b). I had inferred
"open" from not finding a spec named after the request, which is not the same thing.
The list now says what it actually means — "I did not find a fix" — and the answer says
so to the screens workspace in those words.

Two items left undone on purpose, both decisions rather than defects: the words a
reader sees when somebody leaves a role (123 (8): their name, or the prototype's "Part
ways"), and who gets asked to find an owner (134 (5)). Needs Hafsah.

Next: 127 (4) (6) (7), 128 (2), 130 (b) (d) (f), 131 (6), 134 (4) (7), 135 (3), 136 (7),
and 133 (1), which needs a kind of work to pick its own role map.

## The full API suite is green on this computer (5 October)

1,707 suites and 16,609 tests passed, 2 suites skipped, 427 seconds with two workers,
exit 0. No memory trouble at all, which answers the screens workspace's request 138 and
Hafsah's third ask in 140: their failures are their machine. The two skipped suites are
the browser journeys and the WhatsApp journeys, which skip themselves without their
databases — so "all green" does not cover those, and I said so rather than letting the
number stand for more than it does. One worker had to be force-exited for a leaked
handle; nothing failed, but that is the shape of their out-of-memory and I have not
chased which suite it is.

Also written up: requests 121 to 140 item by item. About thirty of those items were
already fixed and tested here before today, including both of the ones Hafsah named
besides the meetings line. Roughly twenty-five are genuinely open and listed as such.

## The meetings line, and the one heavy task at a time (5 October)

`bring-a-check-in-up-to-date.ts` now has a rule 7: where no meeting is on the record it
takes the meetings line out of the stored report's row. The screens workspace asked for
this twice and my earlier answer pointed them at a script that had no such rule, which
was wrong of me. Proved on a local database loaded from the MarketView Q4 seed: two
lines before, none after, everything else in the row intact, second dry run clean.

That seed also answers Hafsah's second ask in request 140 — the Q4 check-in is
`6e84ca43-31d4-4e33-bf38-91defee0543a`, led by wairimu, with otieno and naliaka
checking in, the same ids on any computer.

While reading the rest of 121 to 140 I found two of the items Hafsah named — the
headline question (127, 129, 133) and the first count read as a rise (130 a) — already
fixed and tested at this head. So the next step is not to rebuild them but to check
every item of 121 to 140 against this code and say which still happen. One helper for
that, once the full API suite (her third ask) has finished, because that is the one
heavy thing running.

## Eight of the screens' open requests were already fixed (5 October)

Checked each one at `72a2f1a2` instead of assuming: 119, 120, 126, 137, 138, 141, 146
and 156 all pass now. The API typechecks (exit 0), builds, and starts — `node
dist/main` reaches "Nest application successfully started" and answers 401 to a wrong
password, with `dist/modules/embed/static/` copied, so 120 and 126 are closed at the
output, not from the code. The wording guard passes with the same spec file they have,
byte for byte, but at exactly 60 of 60: no room at all, which is why it keeps coming
back. I said so in the answer rather than quietly leaving it on the line.

Answered in `docs/answers-from-engine.md`. Next: the board reviews, 121 to 140, one at
a time, starting with the ones that name a specific wrong sentence.

## Request 158: my four seeds made nobody a member (5 October)

The screens workspace loaded all four seeds and found every person locked out. They
were right, and the cause is the kind I keep writing down and then doing: three seeds
used the compound key the wrong way round, and `.catch(() => undefined)` threw the
error away, so each seed printed its sign-in list and had written no membership. The
suites seed wrote none at all.

One writer now, `theyAreInThisOrganisation`, no catch on it, role set on create and
on update. Proving it found a second fault: the company seed could not be run twice.

Proved by signing in, not by reading the code: amina@suites.test, `/auth/me` 200 as
ADMIN of Suites Test Company, where before it was the 401 they reported. Counts
unchanged after three loads. Answered in `docs/answers-from-engine.md`, pushed at
80753092.

A scratch database `gw_seed_check_158` is left on this computer; dropping one is
blocked by the kit's rules, so it stays until Hafsah says otherwise.

Next: request 156 should now be closed too (the seeds are on the branch and
`git ls-files` shows all five). Then the open board reviews, 121 to 140.


## Everything heavy stopped, on Hafsah's word (5 October)

The computer was very slow. I stopped the whole scenario run `run-oct5` - the shell
that drove it and its three shards, six processes - and killed any jest or vitest
left over. It had reached 8 of 24 and will have to start again; nothing it had
written was scored, so nothing is lost but the time.

What is still running is one thing: the local API on 127.0.0.1:3000, one copy, no
client and no watcher. Load average was 4.45 at the moment I stopped them.

The decimal repair in `a-stored-sentence-reads-right.ts` is committed and pushed
(25c53e82). The title repair is not in it, and the file says why.

From here: one helper at a time, never two, and never more than one heavy task.


## 5 October, 14:45 - four more findings from run 32, and two of my fixes were caught by old tests

**Finding 5**, a Groundwork housekeeping question served as the next session's focus
("session2Focus: What else should I know?"). What goes in there is the last question asked before
somebody closed without answering, which is right when the question was about the work and useless
when it was our own catch-all. Filtered; anything naming something real is kept, including "What
else is on the Kano route?", which contains the catch-all's words and is not one.

**Finding 4**, the prospect's job, wish and worry written as Martin's own. Same fault as the
release-blocking "hire more analysts", one layer earlier - the judgement inherited it from the
paragraph, so fixing the judgement alone would have left the report still saying it.

**Finding 37**, "receiving 0. 5%" split into two lines by every sentence splitter in the product.

**Finding 6**, two facts joined into a cause nobody named.

**Two of these were stopped by tests I did not write.** The decimal rule was too wide and joined a
real sentence boundary - "The target is 40. 12 shops have ordered." It asks for a per cent sign
now, and "1. 5 million" is deliberately left alone because it cannot be told from a boundary. And
the causation rule used the shock run's own vocabulary, which `a-room-is-not-a-population` forbids:
the rules are about any room, and a scenario's words in the instruction prime the model. It also
duplicated a rule that was already there, and points at it now instead.

## 5 October, 14:35 - a decimal split in two, and my own test stopped me shipping a worse fix

Run 32's advisor report, both readers: "receiving 0. 5% for two years" - the model put a space
inside a decimal, and every sentence splitter in the product then did the only thing it could with
it. Two broken lines, the second starting lower case because it is the middle of a number.

**My first rule was "a digit, a full stop, a space, a digit", and the test for a real sentence
boundary went red**: "The target is 40. 12 shops have ordered." became "40.12 shops". A sentence
can end in a number and the next begin with one, and nothing in the digits tells them apart. The
rule now asks for a per cent sign on the far side and nothing else does; "1. 5 million" is left
alone and pinned by a test, because it genuinely cannot be told from a boundary.

Repaired where stored sentences are already repaired, before anything splits them, so it holds in
all twenty splitters at once.

**A known flake, named so nobody chases it.** `the-report-is-written-in-parallel` failed in the
full run and passes alone; it did the same this morning. It is timing-sensitive under load.

Scenario run: 5 of 24 at 14:35.

## 5 October, 14:30 - the run will not finish inside this session, and why

3 of 24 at 14:28, started 13:52. One scenario per shard in 36 minutes, against 24 scenarios in 33
minutes with six shards on 26 September. That is roughly ten times slower per scenario.

**It is not rate limiting.** Ten retries in the whole run: three 429s and seven timeouts. The rest
is genuine model latency on a system prompt that is now 119,185 characters, about thirty thousand
tokens on every turn, with four people answering ten questions each.

On this pace it lands around 18:40. I am not restarting it a third time to add shards - that would
throw away the 36 minutes already spent and the three scenarios done, for a gain I cannot be sure
of while the latency is what it is.

**What that means for the queue.** The journeys come after it and will not start inside this
session either. I am not starting the WhatsApp journeys alongside, because they drive the same
model and would make both slower.

**The honest reading when it lands:** if it is still part-finished, the problem counts are still
worth reading, because every one of them is a property of a single report. The engine-value
numbers are not, because they are totals over all 24 and a partial run undercounts them. I will
say which is which rather than scoring a partial run as though it were whole.

## 5 October, 14:35 - "participant" is out of the rulebook, and my caution about editing src was wrong

Run 32 had "the other two participants report...", "both branch participants", "two other
participants report that the company's CEO...". Participant is our word for a database row. It was
in none of the wording rules and the scorer only catches "Participant A", so the bare noun reached
readers. The rulebook now says to name them or say "people", and covers "party", "the initiator"
and "the respondent" with it.

**I had queued this behind the run for the wrong reason.** I thought editing `api/src` might change
what the run measures. It cannot: the shards load their modules once at start, and the conversation
itself goes to the compiled server, which nothing touches until I rebuild. Checked rather than
assumed, then done. The one thing that IS true is that a fix made now is not in this run, which is
already written down for the "does you own" one.

Engine-prompt ceiling moved a third time, by what the rulebook gained and no further.

## 5 October, 14:25 - the API suite found two faults of mine, and my first account of one was wrong

**The plain pattern names are wired up and a test holds the code and the document to each other.**
I changed A1 in `docs/pattern-names.md` for decision 104 and did not change
`plain-pattern-names.ts`, so the test went red. Fixed: the code carries her wording too.

**And my commit message for that overstated it.** It said I had told Hafsah the names were not
switched on. I said that on 26 September; the document was corrected on 29 September, by somebody
else, and has said since that the names live in the code and a spec checks the two match. So the
fault today was only that I changed one side of a pair - which the test caught - not that I had
misinformed her. Writing it down because a commit message that makes a mistake sound worse than it
was is still a wrong record.

**Two of my own specs were weak guards.** The meta-test "a source-assertion spec strips comments
before it matches" named two I wrote today: the kept history and the suite refusals. Both read a
source file and asserted on it without stripping comments first, so a comment could have satisfied
either. Both strip now. I have spent the day finding places where a claim was not re-earned, and
wrote two more.

API: 1,704 suites, 16,589 tests, all passing.

## 5 October, 14:13 - the client suite on the fully merged branch: 630 files, 4,223 tests, green

The second merge from the screens workspace brought the billing changes and the WhatsApp add-on
specs, and I had not run the client suite since. It passes, and both typechecks are clean.

That closes the gap of merged-but-untested code on this branch. The API suite was last run green at
16,542 before today's engine changes; it is re-run after the scenario run, with the journeys.

## 5 October, 14:20 - request 157 done, and the rule from this morning held

The screens filed 157 overnight: a hundred check-ins, to test Hafsah's fault 4 (the sidebar and the
People page listed every one, unusable at that size). **Harambee Logistics** gives them 30 people,
100 check-ins across 16 situations, 340 people-in-check-ins, 75 reports, 25 closed.

The states are mixed because that is what a list has to tell apart, and a fifth leave the busy lead
out entirely - somebody who is in everything tests nothing about which ones are theirs. Three
sign-ins: an admin who sees all 100, a lead with 20 waiting on him and 20 he is not in, a
participant in 15.

**This one went on the allow-list before the commit, and `git ls-files` confirmed it after.** That
is the rule I wrote this morning after shipping three seeds that never left this computer, and it
is the first time it has been applied rather than written down.

One real fault found by driving it: a person could be picked twice for the same check-in, and
(ground_id, email) is unique. Deduped over the whole list rather than in part.

Every request on the screens workspace's list is now answered: 146 to 157.

## 5 October, 14:12 - the exported scenario packs had gone stale, and I caught it before using them

I was about to start the before-and-after document Hafsah asked for on 26 September, and checked
the export first. **21 of the 50 no longer matched the database.** Each had been revised once
since, and the file still held the older words under a header reading "THIS IS THE VERSION THAT
RUNS TODAY". A folder whose entire purpose is to let somebody read what the product actually says
was telling them something else.

All 50 re-exported and verified byte for byte: 50 of 50. The README now says it drifted, how it
was caught, and that the next reader should check the same way before relying on a file.

This is the third time today that something was not what its own label said - the seeds that were
never pushed, the run measuring an old build, and now these. The common thread is that nothing
re-checks a claim once it is written down, so the only defence is to re-earn it each time before
acting on it.

The improved versions and the before-and-after document are still not started. They need the run
scored first, and they are a large piece of writing rather than a mechanical one.

## 5 October, 14:06 - the WhatsApp journey database is current, and a false alarm worth writing down

Migrated last night's `gw_whatsapp_journeys_d92` forward so the journeys can start the moment the
scenario run lands. It applied the newest migration cleanly.

**A count worth not panicking about.** That database shows 364 migration rows for 359 migrations,
and two with no finish time. Both are **rolled back** - one from 31 August, one from 10 September -
so they are history, not pending failures, and the duplicate rows are the same migrations
reapplied after. If anybody runs the same check on a database that has been through a few of these
rounds and sees "failed=2", that is what it is.

**The scenario run is slower than I first read.** Each shard is on its FIRST scenario at 14:05,
not its fifth - the runner takes the keys in its own order, so the header I saw was not the fifth
of eight. Four people times ten questions each, with real model calls, is most of the time. On
course to finish around 15:35. The settle rule is working: "REPORT SETTLED SHORT ... after 64s"
rather than the 300s it used to spend.

## 5 October, 14:10 - queued, not done: "participants" is leaking into what people read

Run 32 shows "the other two participants report...", "both branch participants", "two other
participants report that the company's CEO...". **"Participant" is our word for a database row, not
a word anybody uses about a colleague.** It is in none of the wording rules and the scorer's label
check only catches "Participant A", so the bare noun passes everything.

Not done now, on purpose: I promised not to touch `api/src` again until the run lands, so the run
stays a true measurement of one build. It is a one-line addition to the rulebook - never call a
person a participant; name them, or say "people" - and it goes in as soon as the run is scored.

## 5 October, 14:08 - the release items that are genuinely blocked, and the one I will not touch

**Item 2, a build on Node 20: blocked.** Only Node 26 is on this computer, there is no nvm or n,
and installing a runtime unattended is not a change I should make. Still Hafsah's.

**Item 3, the two existing-client checks: blocked.** Needs a copy of the live data.

**Item 4, the privacy question on evaluation check-ins: deliberately untouched.** Decision 86 and
decision 99 item 3 both say a privacy restriction is not mine to add, and that is exactly what
this would be. The fallback rule says make a provisional call, but her standing decisions say this
particular kind of call is hers. It stays a question.

## 5 October, 14:05 - three of the seven release items answered, two of them with measurements

**Item 1, the migrations on the live line's schema: done and passing** (359 applied, 0 failed, with
existing-client rows already in the database). She should still run it once on real data after the
backup, because real data has shapes a seed does not, and the document says so.

**Item 5, the two judgements that go against the right answer: addressed in the instruction**, and
explicitly not claimed as closed - whether the model obeys the two new rules is for the run.

**Item 6, "proof asked for" is 36 against 42: the counter is measuring the wrong thing.** The
scorer treats "picture" as asking for proof, and picture is this product's own word for shared
understanding. Run-1: 31 of 54 hits matched on it, 20 of those are "a clear picture of...".
Run-29: 22 of 37, and 18. Not one I read asks for a photograph. Both sides of the comparison are
inflated by different amounts; the real movement is roughly 34 against 19, a **bigger** fall than
the row shows. `tools/score_run.py` is on the never-edit list, so this is hers to decide.

**Item 7, the pattern name that reads as a broken sentence: reworded** as PROVISIONAL decision 104.
The other forty-eight were checked for the same fault; A1 was the only one with a clause hanging
off its object.

## 5 October, 13:58 - one small fix landed after the build, and is NOT in the run

The "does you own" fix was committed at about 13:57, after the 13:51 build the current run is
using. Everything else from today is in it, including the two judgement rules and the board's
sentence topics.

I am not restarting the run a third time for one narrow wording rule. **So: if run-oct5 still
shows "does you own" in the cofounder lead's report, that is expected and already fixed.** Nothing
else from today is missing from it.

From here until the run lands I am not touching `api/src` at all, so the run stays a true
measurement of a single build.

## 5 October, 13:52 - the run restarted again, because it was measuring yesterday's engine

Caught before it finished rather than after. The API server was built at 13:14 and I had made nine
engine changes since - the Ask history order, the You board goals, the suite refusals, the promise
dedup, the document path, the name guard, the kept history, the board's sentence topics and the two
judgement rules. None of them were in the running build, so the run would have measured a release
that no longer exists and I would have reported it as the release's run.

Rebuilt, restarted, relaunched at 13:52. Prompt versions active for this run: `system` v45,
`report_synthesis` v7.

**The two release-blocking findings of run 32 are now addressed in the instruction**, which is the
main reason the run had to be redone. Both were the same fault and both passed every rule the
judgement had, because every rule asked for a PERSON to be named and both of them named one:

- "Kwame Mensah is also blocked by the credit committee", when Kwame had said he had not checked
  with Credit at all. He is not blocked; he has not understood what is counted.
- "Make the decision about hiring more analysts", put to a lead whose check-in is about what a
  customer said. The customer's problem became an instruction to the reader.

A reason is only a reason if somebody said it, and a move has to come from a line in a block.
Whether that actually changes the two judgements is for this run to say, not for me.

Also fixed from the same review: a topic that is already a sentence is said as one rather than
pushed after "about", which was six scenarios.

## 5 October, 13:45 - the scenario run was my own fault, restarted; four more items answered

**The run was on course to take hours and the cause was my change this morning.** It waited up to
five minutes for one finding per person who checked in, and some scenarios genuinely produce fewer
because somebody said nothing the report could use. So it spent the full five minutes, session
after session, waiting for a finding that was never coming. The log said "3 finding(s) for 4
person/people after 300s" over and over, which was true and not a fault.

It stops on either now: one finding per person, or a minute with the count unmoved. Run stopped and
restarted at 13:40 on the fixed rule.

**Four request items answered without code**, because the right answer in each case was that the
engine already does it or that the string is the screens':

- **151 E1** (whole sentences used as nouns): already fixed.
- **151 E5**, the shared-picture half ("everyone reads the same report" on an unshared session):
  already fixed in the client, with the per-session read.
- **151 E10** (session counts disagree): two different true things. Recorded as PROVISIONAL
  decision 103 - word them apart rather than agree one clock, because one clock throws away one of
  two true facts.
- **151 E11** (one person, three names): all three strings are composed in the client. Sent them
  what the engine serves - `who` is already "A colleague", `nameIsTheirRole` flags the bare
  identifier, and `subjectFor` already has the sentence for it.

**151 E8 is still unlocated** - I cannot find a sentence in the engine that builds "has none of
their 4 shops", and have asked which field it arrives in.

Next while the run works: nothing heavy. The browser journeys (`e2e`, `npm run journeys`) and the
WhatsApp journeys (own API on port 3006, own database) both wait for it.

## 5 October, 14:05 - request 154 item 2 closed in full, and items 5, 6, 7, 8

All four parts of item 2:

- **The history read backwards.** A question and its answer share a timestamp; the tie is broken on
  meaning now, so the person asked and Groundwork answered.
- **"You have none open" to somebody running ten.** The sentence was right; what was counted was
  wrong. "Open" meant sessions open for her to ANSWER, and a lead who runs ten has none of those.
  The code already knew this and only applied it when the screen sent a check-in - which, now that
  Ask defaults to no check-in, was the uncommon path.
- **Replies saved without their options.** Only the first text block was kept, so the record held
  a sentence that introduces something and then nothing. It keeps every text block and the choices
  as a sentence now, at all three save sites, with a test that reads all three.
- **A sentence read back as a colleague.** Held at the echo rather than the router, because that is
  where the damage is done and it holds however the router changes later.

And items 5 (half, with PROVISIONAL decision 102), 6 (the duplicate promise), 7 (one kind of item
worded one way) and 8 (eleven suites now say what to do).

Scenario run: 2 of 24 at 13:36, slower than previous runs, no incomplete captures.

Next: the remaining 151 items that need the run, then the journeys.

## 5 October, 13:50 - three more request items closed while the run works

**154 item 6, the same promise twice: fixed.** "Ask the warehouse to load my van by 7am" sat beside
"Ask the warehouse on Tuesday 29 September to load my van by 7am." Request 96's rule folds a short
promise into a fuller one when the short one's words sit whole inside it, and a date pushed into
the middle breaks that. Containment is tested with dates taken out of both now - only the
containment: two different dates are still two promises.

**154 item 8, a suite that is off: fixed in eleven places.** They refused with a bare statement and
nothing to act on. The test I wrote reads the folder rather than my list and immediately found an
eleventh service I had missed by hand, which is the only reason it is eleven and not ten.

**154 item 6's other half, when-words that are not dates, is not done** and is written up as such:
those are what the person said, so the fix is to stop showing them where a date belongs rather than
to rewrite them, and that needs to know what the screen does with the field.

Scenario run: 1 of 24 at 13:27, no incomplete captures.

## 5 October, 13:35 - two open requests closed, one provisional call made

**Request 152, both items: already done**, and the screens' list still said Open. `checkInLabel`
is on every Today row from both builders, and `everyActionHasALabel` wraps the board as served.
Written up rather than rebuilt.

**Request 154 item 2, first part: Ask's history reads in order.** A question and its answer share a
timestamp, the read was newest-first then reversed, and within one timestamp the database may
return either order - so the pair came out backwards about half the time. No sequence column to
fall back on, so the tie is broken on meaning: inside one instant the person asked and Groundwork
answered.

**Request 154 item 5: half fixed, half declined, recorded as PROVISIONAL decision 102.** A goal
written about somebody by their lead is now written to the reader. A goal the person wrote
themselves is left exactly as written, because the standing decision of 26 September says people's
own words stay as they said them, and a test has pinned "I want it at 162,000 by December."
unchanged since before the request. The page can still read "I ..." beside "You ...", and whether
that is acceptable is a wording decision rather than a defect. One line changes it if Hafsah
disagrees.

Grounds module: 197 suites, 1,964 tests green.

Next: the scenario run is still going; the remaining parts of 154 item 2 wait for it.

## 5 October, 13:20 - the migrations check against the live line's schema: passes

The one thing `docs/staging-compatibility.md` had open. Built a local database from the live line's
290 migrations, **put existing-client rows in it first** so the "fails on existing data" question
was exercised and not argued, then applied our 69 on top.

**359 applied, 0 failed.** Every pre-existing row survived and still reads the same. The WhatsApp
add-on prices landed on the five plan rows that were already there. A drift check against the model
found only the known cosmetic index-name shortening.

An earlier attempt was refused by the safety guard for naming the live environment in the command.
The refusal was right; what was needed is a local database built from a branch's migration files,
which decision 97 item 3 asks for. Run on localhost only, no hosted database, no real data.

Next: the 24-scenario run.

## 5 October, 11:35 — starting the unattended queue

Queue, in order: the migrations check against staging's schema, the 24-scenario run, the
remaining journeys, then the next open requests.

Where the branch is: `wip/release`, screens merged twice, `mine/wip/live-base` fully inside it and
0 behind. API 16,542 tests green, client 4,217 green, both typechecks clean.

## 5 October, 11:30 — CORRECTION: three requests were reported done and were not pushed

Requests 153, 154 and 155 were answered with instructions pointing at seed scripts that existed on
this computer only. `.gitignore` ignores `api/journey/*`, so `git add -A api/journey` did nothing
and said nothing. The screens workspace found it (request 156). All four files are on the
allow-list now and `git ls-files` confirms them tracked.

Second time in two weeks the same rule has hidden a file somebody else needed. The standing check
from here: nothing under `api/journey` counts as pushed until `git ls-files` shows it.

## 5 October, 11:20 — two defects caught by the release tests, neither mine originally

A view was being served as a fragment: the request-151 fix made the verb of speaking optional, so
it stripped the subject from ordinary sentences — "Baraka Otieno is blocked" became "is blocked",
and for Baraka himself "You are blocked" became "are blocked". The verb is required now.

My own Ask welcome broke the no-colons rule and the client's ratchet caught it at 61 against 60.

## The halfway messages, run 7 (6 October): superseded, see the correction below

**Correction after review.** This run switched them on by default and said "42 of 42". It did not prove what it claimed: the close was called directly, not through the real sweep; turn times were set to one instant each, which hid that the injected warning restarts the 12-hour clock; and the line about leave was not a leave check. They are OFF by default again. Read the rest as what that run did see, not as proof.

Built from `1eb91691` with `release.whatsappHalfwayMessages` absent from the database (`gw_wa_oct6b`, a new copy). The API and the script ran on the local build in a scratch worktree, with the signed local webhook, the local recorder, and the number and secrets saved on /admin/whatsapp by the script. **42 of 42 checks passed** for sales, onboarding, project, a performance plan, a cohort, the anchor, and a check-in kept in the app. For each of the six kinds the person read the reminder, the half-hour warning and the close, and what they said was kept.

**The two faults from run 6.** (1) The warning job did skip with "held elsewhere", and that is fixed in `ca89aa5c` (the lock is now held on one connection); the warning reached the phone for all six kinds. (2) The reminder "not reaching the phone for project and cohort" was the script: it moved every turn of the session to one instant, so "the last turn" was left to chance, and the reminder is only for somebody whose last turn is Groundwork's question. The product was right. The script now keeps the turns in order (`ec510ae6`); cohort failed before the fix and passed after it, and every kind passed in run 7.

**What each person read, the same for all six kinds** (the label is the check-in's name):
- Three hours quiet: "Hi Nuru, your check-in for "Ending: sales" is still open, and everything you have said so far is kept. Reply here to carry on whenever you are ready."
- Eleven hours quiet: "Your check-in for "Ending: sales" closes in 30 minutes if nothing else is said. Add anything you still want on the record now."
- Twelve hours, the clock closes it: "Your check-in for "Ending: sales" has closed, because nothing was said for twelve hours. Everything you said is kept on the record, and your report follows in a moment." and then the report.
- The lead receives nothing on WhatsApp and no email at any of these moments.
- A check-in kept in the app: nothing about it reaches the phone. Pendo, writing to it, reads "Your check-in "Ending: kept in the app" is kept in the Groundwork app, so I cannot take your answers to it here. Please open Groundwork and answer it there."

**Fixed on the way.** The close was not held by "Not now" (it skipped that check); it is now (`b019d8eb`). A session that began before 5 October 2026 is never written to (`9e433c20`; decision 90 says nobody used WhatsApp before, so none could have qualified anyway; `release.time_running_out_warnings_from` is the same idea for the emails).

**Rules proved in specs, through the real sender** (`the-halfway-messages-keep-the-senders-rules.spec.ts`): STOP, "Not now" (the close too), one first message a day (the reminder counts, the warning is a closing and may be the day's second, the close counts for nothing), the organisation's add-on, and the 24 hours (these three have no template, so outside the window nothing is sent and the record says why; each is inside the window by construction, because the person wrote within the last twelve hours or so). Approved leave: the reminder and the warning go only for a session already open, and there is no leave check on the clock's close, because it answers their own session.

**Known limit.** The reminder is held by the one-message-a-day rule on a day Groundwork has already written first. A session opened by that day's opening notice and left halfway gets no reminder that day, and the quiet window is later, so it never comes. It reaches people whose session opened on an earlier day. This is decision 107 as written; Hafsah decides whether it should change.

**"Use simpler words" with it on** (sales and onboarding, `WHATSAPP_SIMPLER_WORDS=1`, same recorder). Off and on side by side:
- Finish: "Your check-in is complete and on record. Your report follows in a moment." / "Your check-in is finished, and your answers are saved. Your report will come in a moment."
- The report's line: "Here is a conversation worth having." / "Here is one thing worth talking about."
- Reminder: "...is still open, and everything you have said so far is kept. Reply here to carry on whenever you are ready." / "Hi Nuru, your check-in for "Ending: sales" is still open. Everything you have said is saved. Write here to carry on when you are ready."
- Warning: "...closes in 30 minutes if nothing else is said. Add anything you still want on the record now." / "Your check-in for "Ending: sales" will close in 30 minutes if you say nothing more. Add anything you still want saved now."
- Not yet read end to end with it on: the clock's close (the run lost its database connections to other runs on the same machine; the sentence is checked in a spec: "...has closed, because nothing was said for twelve hours. Everything you said is saved. Your report will come in a moment."), the opening and chasing reminders and the two emails (specs read each with the switch off, byte for byte, and on).
- Not changed: the sentence a person reads when they write "finish" too early still has one form: "I need a little more from you before this check-in can close. Please answer one or two more questions, then write "finish" again."

## The halfway messages, run 8: the real sweeps (6 October)

Built from `e69cb442` plus the script commit, on a new copy of the database (`gw_wa_oct6d`), the API on the local build in a scratch worktree, the signed local webhook, the local recorder, and the number and secrets saved on /admin/whatsapp by the script. This replaces run 7, which called the close directly and set every turn to one instant. Here the reminder runs through `remindThoseWhoStoppedHalfwayInner` (given a clock inside the Lagos day, because the reminder only speaks between seven and eight there), the warning through the real `fireSessionClosingWarnings`, and the close through the real `autoCloseStaleCheckIns`. The person's real turns are moved back to the quiet being tested; the injected warning turn stays at its own place on the line (about half an hour before the close). **88 of 88 checks passed** (33 for sales and cohort, 55 for onboarding, project, a performance plan and the anchor).

For each of the six kinds, with the person who stops halfway and another who is on approved leave:
- 3 hours quiet: the one reminder reaches the phone, once; nothing reaches the person on leave. "Hi Nuru, your check-in for "Ending: onboarding" is still open, and everything you have said so far is kept. Reply here to carry on whenever you are ready."
- 11 hours quiet, the real warning job: the warning reaches the phone, and the app's own warning turn is written once; nothing reaches the person on leave. "Your check-in for "Ending: sales" closes in 30 minutes if nothing else is said. Add anything you still want on the record now."
- After the warning, at 11.6 hours: nothing is sent, and the session is still open (before the fix it would have closed at about 23 hours, and the reminder could have followed the warning).
- 12 hours, the real close sweep: the session closes, the phone reads "Your check-in for "Ending: sales" has closed, because nothing was said for twelve hours. Everything you said is kept on the record, and your report follows in a moment." and then the report; the lead receives nothing on WhatsApp and no email.
- Not run live: the 48-hour close ("because it has been open for two days"). A session that old began before 5 October, the cut-off, so it is correctly sent nothing today. It is proved in `a-check-in-left-halfway.spec.ts`.
- Kept in the app: nothing reaches the phone (run 7 and the spec).

Also fixed: the script's start-up check ("nothing is set") failed on a reused copy; this run used a fresh one and it passed.
