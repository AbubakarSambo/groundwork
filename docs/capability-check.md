# Capability check

**Written 27 September 2026, late evening, on branch `wip/plain-reports` at `1a7e2183`.** Hafsah asked for an honest check of every capability before the deploy document is finished. Nothing was fixed while checking. Each capability was tried live, with small tries against the local API and the local test database (`gw_pw9_1786222102`), and compared with the prototype's screens and Hafsah's decisions. There were no full scenario runs. Four helpers ran one after another, each on a few capabilities. Their full write-ups are below the summary, unshortened, so every try can be checked.

## The summary

| # | Capability | Rating | Work to reach the prototype |
| --- | --- | --- | --- |
| 1 | Converse: read any record, and create or move one, by talking | Partly works | 8 to 12 days |
| 2 | Brainstorm: think through options before anything is written | Partly works | 5 to 8 days |
| 3 | Seed: turn a chat, a document or a plan into real rows | Partly works | 7 to 10 days |
| 4 | Judge: verdicts, who is slipping, retention risk | Missing | 9 to 13 days, once Hafsah sets the thresholds |
| 5 | Surface: reports, patterns and alerts | Partly works | 6 to 9 days |
| 6 | Memory: the organisation, a person, a project | Partly works | 9 to 13 days |
| 7 | Roles, coaching and behavioural patterns | Partly works | 8 to 12 days |
| 8 | Documents | Partly works | 5 to 8 days |
| 9 | Photos | Partly works | 4 to 6 days |
| 10 | Requests through chat: leave, spending, time sheets | Missing | 7 to 9 days |
| 11 | Being away | Missing | 5 to 7 days, after one decision from Hafsah |

**None of the eleven works well enough yet to match the prototype.** Eight partly work and three are missing. Added up, the estimates come to roughly **73 to 107 days** of work. Much of it overlaps, so a realistic plan is shorter, but it is weeks, not days.

### What works well inside these, and can be deployed as it is

- **Reports and boards update only when something new comes in.** Opening them never rebuilds them, which was checked live. The participant never gets the lead's judgement.
- **Nothing is written without a yes** when a lead pastes a plan or dumps notes into the context chat. A pasted plan of about 700 characters became real targets, expectations, commitments and rules after one yes. The next session used two of the rules.
- **Documents are read accurately.** That includes Word, text PDFs and a scanned PDF. They reach the conversation, and the engine notices when a document's number disagrees with a target.
- **A photo is read and becomes proof on the record.** A receipt photo, even tilted, was read word for word, and the payment line was marked as backed by the photo.
- **The check-in itself follows up well** on what was said last time, and patterns are only counted after three periods in the database.

### What must be fixed before deploying: privacy and labels on people

These are not missing features. They break Hafsah's rules as the product stands today, so I would not deploy with them.

1. **Pattern names reach both boards as labels on people.** The lead's board and the participant's board show internal pattern names beside a person's name, such as "Blame Shifting", "Equity Without Contribution" and "Claimed Work Inflation". That breaks the rule of no labels on people, and decision 19, which says the internal names stay internal and plain names are used on screen.
2. **A participant can read a colleague's pattern.** It carries no name, but in a team of four it is easy to tell who it is about.
3. **The lead sees a pattern before the person it is about.** Patterns reach the lead's board after one session, while the rule is three periods. The person's own report leaves the pattern out, and they have no way to answer it.
4. **Bank details in a document are stored and sent to the model.** The prototype says bank account details are never kept.
5. **A lead's private remark about a person is fed into that person's own check-in.** In the test the remark was "Ngozi may leave after Q4". Only an instruction to the model keeps it from being said. That is a guard written as an instruction, not built into the structure, and it could not be tested because Ngozi had no session left. It needs a decision: should a lead's private notes about a person be given to the model in that person's own session at all?

### What needs work first, but does not break a rule

- **Ask Groundwork answers almost nobody.** Only 64 of the 3,162 users in the test database have the entry it needs. In any organisation that signed up through the product, it refuses. Even when it answers, it takes only a short fixed set of questions. It turns away "What should I do next?", which is the prototype's own example. **This is the single largest gap between the prototype and the product.** Capabilities 1, 2, 6 and 10 all depend on it.
- **Nothing ever creates a verdict or a suggestion.** The screens for suggestions and appeals are built, but the engine never calls them. The count a verdict needs, how many commitments a person kept, is never recorded: all 1,040 commitments in the test database have the status "unknown".
- **Requests through chat do nothing.** Leave, spending and hours all get "I cannot answer that one yet". "I will be on holiday next week" becomes a promise to check in again.
- **Being away is not known.** Someone on approved leave is still listed first as "has not checked in", still sent reminders, and still counted as missing. The rule that time on leave does not count exists in the code, but nothing fills in the dates.
- **Today is empty when it should not be.** One lead's Today said nothing needed him while his board showed two blockers and three people waiting.
- **Some wording is still wrong.** Examples: "Your report is ready now. Speak soon." followed by another question. A board line says "nothing here needs you" and then names a blocker. A receipt is called "a conversation". Confirmations say "I have recorded that" before anything is confirmed.

### Decisions only Hafsah can make

1. **May the engine know the dates of someone's approved leave,** dates only and never a reason? A test today forbids anything outside the suites from reading leave. Being away cannot work without this.
2. **Does the person who runs a check-in count as "their lead"** for approving leave and spending, and for adding company rules? Today only the organisation role counts. A lead who is a member of their organisation cannot approve anything, and all requests go to the admin.
3. **Should a lead's private notes about a person reach the model in that person's own check-in?** See item 5 above.
4. **The thresholds for verdicts.** Judge cannot be built without them.

### What the checkers left in the test database

Only in the local test database, and nothing in the repository:
- the password `test` on three test users;
- a few documents, a photo, context lines and to-dos in the "Atlas delivery" check-in;
- one completed and one open session;
- the leave suite switched on for one organisation, with one approved leave.

The SQL to undo the leave rows is in the fourth write-up.

---

## Evidence: the three capabilities I rated "missing": the evidence, for Hafsah to decide

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


---

# The full write-ups

## Three capabilities, checked live: converse, brainstorm, seed

Checked on 27 September 2026, branch `wip/plain-reports`, against the local API (`http://localhost:3000/api/v1`) and the local test database `gw_pw9_1786222102`. Nothing in the repository was changed.

### How the tries were run

- I used the check-in "Atlas delivery" (`6d34bb13-8d45-4b24-890c-c2d2692a9d0e`) in the Meridian test organisation. Tunde Bakare (`mgr-1.1790320811777@meridian.test`) is the lead. Ngozi Eke (`fin-1.1790320811777@meridian.test`) is a participant. The team also has Samuel, Kwabena, Yemi, Zainab and Ifeoma, with 9 commitments already recorded from check-ins.
- To sign them in, I set the password to `test` on three test users in the test database (Tunde, Ngozi, and `manager.1790515683618@sales.test`). This is the same thing `api/journey/drv.mjs` does. The small helper scripts are in this scratchpad folder (`call.sh`, `show.py`, `counts.sh`).
- I made about 30 API calls in total. Nothing was blocked. No email was sent.
- Rows I created in the test database: one to-do, one organisation objective (a `Subject`) and its draft, one lead expectation from the context chat, and the rows from the pasted plan (3 targets, 4 expectations, 2 commitments, 3 context items, 1 baseline). I also uploaded one small text document, `atlas-plan.txt`.

### The routes that exist today

- **Ask Groundwork.** `GET /ask`, `POST /ask` and `POST /ask/answer`, in `api/src/modules/ask/`. They call `AssistantService.respond` in `api/src/modules/assistant/assistant.service.ts`, unchanged.
  - The assistant uses a router that works by rules, not by the model (`the-router-is-deterministic.ts`). It has 19 lanes, listed in `what-the-assistant-can-do.ts`.
  - The model only rewords an answer that has already been worked out (`the-model-words-it-and-nothing-more.ts`).
  - Anything that writes is "said back" first, as a `PARKED` row in `assistant_proposals`, and is done only on a yes.
- **The context chat.** `POST /grounds/:id/context-chat` and `POST /grounds/:id/context-chat/confirm`. The code is in `api/src/modules/grounds/the-context-chat.ts`, `what-the-context-chat-heard.ts` and `a-dump-is-many-things.ts`. Only the lead or an admin can use it.
- **Documents.** `POST /grounds/:id/documents`. `what-a-document-holds.ts` reads the numbers out of a document. It keeps them on the document as `holds.waiting`, and writes them only when the lead says yes in their own check-in (`whatTheDocumentWaitsFor` in `conversation.service.ts`).
- **Objective drafts.** `api/org/v1/drafts`, including `/:id/seed`, on the developer API. The Ask lane `set_an_objective` uses the same draft.
- **The setup chat.** In `api/src/modules/entry/`, behind B1 `#/start/chat`. I did not try it live this time.

---

### 1. Converse: read any record, and create or move one, by talking

#### (a) What the prototype shows

- `D1-ask-groundwork/ask-panel-lead.txt`, `ask-panel-participant.txt` and `ask-on-a-phone.txt` show the panel.
  - It says "Your questions and the answers are private. Only you see them."
  - It opens with "Ask me about Sales team, Q3: a deal, a target, or what to do next."
  - It suggests three questions: "Why is Green Mart next quarter?", "What should I do next?" and "Will we reach 25?".
- `docs/modules.md` (D1) says what the panel does:
  - It answers questions about a check-in and says where each answer came from.
  - It "does things for you, after a yes", such as leave, a to-do, hours, a spending request or moving equipment. It says the request back and asks "Is that right?".
  - It checks claims, for example "Kariuki paid".
- Characteristic 1 in `modules.md`, "chat-native control", adds changing settings by chat ("move my check-in to 5pm") and starting a process by chat.
- Decision 12 says requests are said back and confirmed before anything happens.

#### (b) What the product does today, tried live as Tunde (the lead), with "Atlas delivery" chosen as the check-in

| What was sent (`POST /ask`) | What came back | Rows |
| --- | --- | --- |
| "What did Kwabena say last week?" | "I cannot answer that one yet. Here is what I can do with …", with four buttons: "Tell me what you can see", "What am I on?", "What is on my list?", "Hold this against my next check-in". Lane `unplaced`. | None |
| "What did Samuel say about the Finance request?" | The same "I cannot answer that one yet" reply. | None |
| "Move Yemi's deck review deadline to Friday." | The same "I cannot answer that one yet" reply. | None |
| "Add a commitment for Ngozi: send the revised budget by Thursday." | The same "I cannot answer that one yet" reply. | None |
| "Mark the lease as signed." | The same "I cannot answer that one yet" reply. | None |
| "What is stuck?" | "You said you are waiting on: - the document with the project scope (Atlas delivery) - waiting, 2 days" | Read only |
| "What did we agree?" | The last released round: "The question it came down to: …" and three lines starting "Agreed: …". | Read only |
| "Remind me to call Ngozi about the revised budget on Thursday" | "On your list: "call Ngozi about the revised budget on Thursday" (on Thursday). Yes to keep it, no to leave it." It also returned a proposal id. | A `PARKED` row in `assistant_proposals` |
| `POST /ask/answer` with a yes | "On your list: call Ngozi … Say "what is on my list" any time; "done: …" closes it." | A `todos` row, state `OPEN`. `due_said` is "on Thursday" and `due_at` is empty. |

Tried as Ngozi (a participant):

- "What should I do next?" and "Will we hit the target of 3 deliverables?" both got "I cannot answer that one yet". These are the kind of question the prototype itself suggests.
- "What did I commit to?" got "Nothing is open. Anything you say you will do in a check-in appears here." Yet `ground_commitments` holds two open commitments on her name: "send the revised budget to me" and the one from the paste.

Tried as a lead in an organisation that signed up through the product (`manager.1790515683618@sales.test`):

- `GET /ask` returned `canAsk: false` with "Ask Groundwork can answer you once your organisation has connected its list of people to Groundwork."
- `POST /ask` returned 403.
- In the test database, only **64 of 3,162 users** have the `Person` row that Ask needs. Only a sync with the organisation's staff directory (SCIM) creates those rows. This is also request 16(b) in `docs/requests-to-engine.md`.

#### (c) What is missing or wrong

1. **For almost everyone, it does not answer at all.** Without a `Person` row, Ask refuses. Nobody in an organisation that signed up through the product has one.
2. **It cannot read the check-in's record by talking.** The router has fixed lanes, and none of them reads what someone said in a check-in, a named person's commitments, a target's progress, or "why". It answers only a small set of questions about your own record: your to-dos, your objectives, your commitments, what you said, what is stuck, what a round agreed, and who someone is on the list.
3. **It ignores the check-in chosen under "About".** `AskService.ask` checks the check-in and then drops it. `respond` has nowhere to put it (request 16(a)).
4. **It cannot create or move anyone's record except your own to-do.**
   - Nothing moves a deadline, adds a commitment for someone else, marks something as done or signed, changes a setting, or does leave, hours, spending or equipment.
   - The only writes are your own to-do, a document, starting a check-in, and an objective draft.
5. **Some writes skip the "Is that right?" step,** which breaks decision 12:
   - `tick_off_a_to_do` closes a to-do at once.
   - `set_an_objective` opens a draft and saves each answer without saying them back (request 16(f)).
   - Where there is a confirmation, the wording is not the prototype's. It says "Yes to keep it, no to leave it", not "Is that right?".
6. **A commitment the lead seeded from a plan does not show when the person asks "What did I commit to?".** That lane reads a different source.
7. **It does not check claims.** Nothing checks "Kariuki paid" against a payment system (request 16(c)).
8. **It gives no suggested questions,** and it has no opening line for each situation (request 16(e)).
9. **A to-do's day is kept only as words.** "Thursday" is never turned into a date, so nothing can remind anyone on the day.

Two points are to its credit.

- Privacy holds in the backend. Only the asker can read their questions (`ask-groundwork-as-each-reader-reads-it.spec.ts`), and a stale yes does nothing.
- The engine never decides alone (decision 13). A model cannot write anything.

#### (d) What would happen to a real person if we deployed without it

- Wairimu signs her company up and opens the Ask panel. It tells her it cannot answer until her company "has connected its list of people", which she has never heard of. She closes it.
- If she is in one of the few organisations with a staff-directory sync, she asks "What did Miriam say last week?". She gets "I cannot answer that one yet" and four unrelated buttons.
- She types "move the deadline to Friday". Nothing moves. She has to find the setting herself, or it stays wrong.
- Miriam asks "What should I do next?", the prototype's own suggestion, and is told it cannot answer.
- Both learn within a minute that the chat is not a way to get anything done. After that, they stop using it.

#### (e) Rating: **partly works**

The yes-first to-do and a few read-only lanes about your own record work. Reading the check-in record, creating or moving records for others, and answering at all for people with no `Person` row do not work.

#### (f) Rough work to reach the prototype: **8 to 12 days**

Reasons, in order:

- 1 to 2 days to let Ask answer for a signed-in account, not only for a `Person` row.
- 2 to 3 days to give `respond` the chosen check-in, and to let it answer from what that reader may already read in it, with privacy tests for lead, participant and admin.
- 3 to 5 days for a small set of said-back write actions, each with its own permission and privacy rules:
  - move a date,
  - add a commitment for a named person,
  - mark something as done,
  - change the check-in time.
- 1 to 2 days to bring the confirmation into the prototype's wording, fix the two lanes that skip it, read seeded commitments, and turn "Thursday" into a date.
- Claim checking against a payment system is extra. It needs connections that do not exist yet.

---

### 2. Brainstorm: think through options, targets and next moves before anything is written

#### (a) What the prototype shows

- `docs/modules.md` (D1) says Ask "thinks it through with you: options with what each assumes. Nothing is saved until you say so, twice."
- `B1-starting-a-check-in/start-chat.txt` shows a setup chat that thinks with the lead before anything is made.
  - It asks: "have you told Daniel about this worry yet?"
  - It proposes "This sounds like: Help someone get back on track", with "Confirmed" and "It's something else".
  - It fills in a plan as they talk: "2 of 4 set. Fills in as you talk."
- `B2-context/context-chat.txt` shows the lead talking freely. The page says "Talk normally", and nothing goes into Context until the lead confirms it.
- `ask-panel-lead.txt` shows the kind of thinking wanted on the board:
  - "What the target of 25 assumes",
  - "To close the gap, two of these three",
  - "The possible outcomes: On course, Reach it with a change, Change the target", ending "Groundwork lays out the outcomes and the proof. It doesn't choose."

#### (b) What the product does today

| Where | What was sent | What came back |
| --- | --- | --- |
| `POST /ask` | "Help me think it through: should we push the Atlas deadline by a week, or cut scope? What are the options?" | "I cannot answer that one yet." with the four buttons. Lane `unplaced`. |
| `POST /ask` | "Set an objective for the quarter" | "What is it about? A few words is enough to start - the title can change." |
| `POST /ask` | the answer, "Client sign-off on the Atlas market reports" | "I cannot answer that one yet." No draft had been opened, so the answer was lost. |
| `POST /ask` | "Help me write a goal for client sign-off on the Atlas market reports", then four answers | It opened a draft. Then it asked, one at a time: "What is being measured?", "What is the number, and by when?", "Why that number rather than a smaller one you would certainly hit, or a larger one? A target nobody argued for is one nobody can argue with when it is missed." and "How will it be moved?". Then it asked "Set … as an objective on your organisation's board, owned by you? Yes to set it, no to leave it as a draft." |
| `POST /grounds/:id/context-chat` | "I am not sure whether our target should be 3 or 5 signed-off deliverables. Help me think it through before we set anything." | "The current target is for 3 client deliverables to be signed off. The Atlas plan document mentions a goal of "the client signs off 5 market reports by 15 December." Do you want to change the target of "client deliverables signed off" to 5?" No proposal was made, and nothing was written. |

- The setup chat in `api/src/modules/entry/` (B1) is covered by existing tests, such as `the-setup-conversation-reads-you-first.spec.ts` and `the-setup-chat-speaks-plainly.spec.ts`. I did not try it live this time.

#### (c) What is missing or wrong

1. **Ask has no way to think something through.** Nothing lays out options with what each assumes. An open "help me think" question gets "I cannot answer that one yet" (request 16(d)).
2. **The objective draft is the closest thing, and it is a fixed set of questions.**
   - It asks four questions in a set order. It does not suggest a number, compare options, or say what a target assumes.
   - The "why that number" question is good. It pushes back on a number nobody argued for.
   - One bug: "Set an objective for the quarter" asks "What is it about?" but opens no draft, so the reply is lost.
3. **The context chat did connect a document to the question.** It noticed the plan says 5 while the target says 3. But it went straight to "Do you want to change it to 5?", with no options and no assumptions. For example, it did not say that 5 assumes all four markets load by 20 October. That falls short of "lays out the outcomes and the proof. It doesn't choose", which is decision 13.
4. **There is no rule of "saved only when you say so, twice".** The one yes is the only step.
5. **The board's "What the target assumes" and "possible outcomes" are not written by the engine yet.** See `modules.md` C, "Missing: … target assumptions".

#### (d) What would happen to a real person if we deployed without it

- A lead unsure whether to aim for 3 or 5 asks Groundwork to help her decide. Ask says it cannot answer. The context chat says the plan says 5 and asks if she wants 5. She says yes because it sounded like advice.
- The team is now held to a number nobody weighed, and the check-ins read everyone against it.
- A lead who types "set an objective for the quarter" answers the first question and is told "I cannot answer that one yet". She thinks the product is broken.

#### (e) Rating: **partly works**

Two things work:

- The setup chat asks before it makes anything, as its tests show.
- The objective draft challenges a number, and nothing is written without a yes.

But nothing lays out options with what each assumes, and Ask turns open thinking away.

#### (f) Rough work to reach the prototype: **5 to 8 days**

- 3 to 5 days for a "think it through" lane in Ask, run by the model. It would lay out two to four options, each with what it assumes and what would show which is right. It would be built only from what the reader may read, and would save nothing.
- 1 day to make the context chat offer options before a change, instead of steering to one answer.
- Half a day to fix the objective draft losing the first answer.
- 1 to 2 days to write "what the target assumes" beside each target. It shares work with request 6.

---

### 3. Seed: turn a chat, a document or a plan into real rows (objectives, roles, commitments)

#### (a) What the prototype shows

- `B2-context/context.txt`:
  - "From a plan. Nothing is added until you confirm it. Upload a plan, and Groundwork will propose the goals, roles and commitments in it for you to check one by one."
  - Under "Waiting for you to confirm" there is one card per item. Each card has the lead's words in quotes, where it would go, and **Confirm, Edit, Not now**.
- `B2-context/context-chat.txt` and `context-chat-engineering.txt` show cards such as "Picked up: Rule. It would go in How we work, Stall rule", or "Definition", "Plan", "Still to decide", "Resource" and "Coaching context". Each has Confirm, Edit and Not now. The screen ends "That's 6 things to confirm. Nothing goes into Context until you do."
- `B2-context/upload.txt` shows what a document gave, item by item with page numbers, and what it left out. It also shows a clash with an older document ("This list says … KES 76,000. The sales playbook … says KES 78,000. Which should the check-in use?").
- `docs/modules.md` (B2) says the backend is "Missing: a plan turned into proposals".

#### (b) What the product does today

**A short chat message**, sent to `POST /grounds/:id/context-chat`: "A piece of work is not done until the client has signed it off, not just when we send it. And Ngozi should have the revised budget to me every Thursday."

- It proposed **one** thing: "I will record that as what you expect of Ngozi Eke: "have the revised budget to me every Thursday". It goes down as YOUR expectation, not as agreed, and marked as not yet seen by them."
- It dropped the definition of "done" without a word.
- On confirm, it wrote one `person_objectives` row (authored by `lead-setup`, marked as not seen). The confirmation still said "I will record that", in the future tense.

**A pasted plan of about 700 characters** (the goal, 2 team numbers, 4 people's jobs with dates, 2 rules and 1 open question), sent to the same route:

- It proposed **everything as one block of text**, with one question at the end: "Record all of this?".
- On confirm (`/context-chat/confirm`):
  - Team targets went from 1 to 4: "client deliverables signed off" 3, "spend" 40,000 not to be passed, and "markets loaded" 4, for Samuel.
  - `person_objectives` went from 14 to 18, one expectation for each named person.
  - `ground_commitments` went from 9 to 11, with source `PASTE`: Kwabena "agree the analysis period with the client (by Friday)", and Ngozi "send the revised budget to me (every Thursday)".
  - `ground_context_items` went from 0 to 3: two rules and one "still to decide".
  - `ground_baselines` went from 0 to 1: what doing well looks like.
- The reply said "Dates you named, which stay in this conversation rather than on the record", so the dates were not kept as dates.
- Yemi's "deck signed off by 30 October" and Samuel's "four markets loaded by 20 October" became expectations, but **not commitments**.
- No roles were made. "Samuel owns the data pipeline" and "Yemi owns the client deck" are kept only inside the expectation text.
- Ngozi's expectation is now on the record twice: once from the chat message and once from the paste.

**An uploaded plan document**, `atlas-plan.txt`, sent to `POST /grounds/:id/documents`. It held a goal, three roles, and three commitments with dates.

- It came back private ("Only you can see this"), with `numbersWaiting: 0` and "still reading".
- About 20 seconds later, the document's `holds` held two numbers waiting: "market reports" 5 for the team, and "markets" 4 for Samuel. It also held three dates.
- The roles, the commitments, and the spend ceiling of "under 40000 dollars" were not extracted as anything.
- Nothing was written. The numbers are written only if the lead later answers "yes" in her own check-in conversation. The Context page has no cards to confirm them.

**The objective draft in Ask**, the conversation in section 2.

- The yes wrote a `subjects` row: type `OBJECTIVE`, measure "market reports the client has signed off", target "5 by 15 December", owner the lead. The draft's state became `SEEDED`.
- The reply was: "Set. "client sign-off on the Atlas market reports" is on your organisation's board as an objective you own (subject chat-9dc5f324-f57e-4640-8472-b71fe6a9b689). Check-ins against it read your evidence from here on."
- That reply shows a raw internal id and the word "subject" to the person.
- This objective is for the whole organisation. It is not a target on the check-in.

#### (c) What is missing or wrong

1. **There are no cards to confirm one by one.** Each path gives one yes for everything. The prototype's Confirm, Edit, Not now for each item does not exist, so a lead cannot keep four items and drop one (request 6(a)).
2. **No roles are ever seeded,** from a chat, a paste or a document.
3. **Commitments are seeded unevenly.** From the paste, two of four people's dated jobs became commitments. A document gives none. What is seeded does not show when that person asks Ask "What did I commit to?".
4. **Dates are thrown away.** The paste keeps them "in this conversation rather than on the record".
5. **A document seeds only numbers,** and only through a "yes" typed in the lead's own check-in. Nothing on the Context page lets her take what a document holds. The upload screen's list of what it took and what it left out, and the clash with an older document, are not produced.
6. **A short chat seeds one thing at a time.** Anything outside the one open gap is dropped without a word, like the definition of "done" here. The prototype picks up definitions, rules, plans, still-to-decide items, resources and coaching context from normal talk.
7. **The same expectation can be written twice.**
8. **The wording falls short of the rules.**
   - "YOUR" is in capitals.
   - The confirmation says "I will record that" after it has already been recorded.
   - The paste proposal is one long block with items joined by colons and line breaks. "Nobody is marked as having done or not done any of it until they say" reads awkwardly.
   - The objective reply shows "subject chat-…".

What holds and is valuable, and must not be lost:

- Nothing is written without a yes (decision 12).
- The confirmation re-reads the lead's own words rather than trusting values from the screen.
- A name that matches nobody is said out loud.
- A lead's expectation is marked as hers and not yet seen by the person.
- A document starts private to the person who uploaded it.

#### (d) What would happen to a real person if we deployed without it

- Wairimu uploads her quarter plan, expecting the goals, roles and commitments to appear for her to check. She gets a private file and nothing to confirm. Two numbers wait silently until she happens to say "yes" in her own check-in.
- If she pastes the same plan into the chat instead, she gets one long block and one yes. If one line is wrong, she has to accept it all or none of it.
- After she accepts, half her people's dated jobs are commitments and half are not, the dates are gone, and nobody is recorded as owning the pipeline or the deck.
- The first check-ins then ask Yemi about a deadline that is not on the record, and cannot follow up Samuel's date at all.

#### (e) Rating: **partly works**

A pasted plan really does become rows (targets, expectations, some commitments, rules and a baseline) after a yes, and the objective draft seeds a real objective. But the prototype's cards to confirm one by one, roles, dates, and a plan document turned into proposals are all missing.

#### (f) Rough work to reach the prototype: **7 to 10 days**

- 3 to 4 days to return separate proposals (goal, role, commitment, rule, definition, still to decide, resource, coaching context), each with the lead's words, where it would go, and Confirm, Edit, Not now. The confirm step would stay re-derived from the lead's own words.
- 1 to 2 days to feed an uploaded plan document through the same reader as the paste, so a document proposes what a paste does, plus the "what it left out" list.
- 1 to 2 days to seed roles, which need the role-map tables from request 25, and to keep dates as dates.
- 1 day to pick up more than one thing from a short chat message, to stop duplicate expectations, and to make seeded commitments show when the person asks Ask.
- 1 day for the wording in the replies.

---

### The three ratings

| Capability | Rating | Rough work |
| --- | --- | --- |
| 1. Converse | Partly works | 8 to 12 days |
| 2. Brainstorm | Partly works | 5 to 8 days |
| 3. Seed | Partly works | 7 to 10 days |


---

## Three capabilities, checked live: judge, surface, and roles with coaching and patterns

I checked these on 27 September 2026, on branch `wip/plain-reports`. I used the local API (`http://localhost:3000/api/v1`) and the local test database `gw_pw9_1786222102`. I did not change anything in the repository.

### How the tries were run

- **Who I signed in as.** I used the same three test users and the same helper as the first check (`call.sh` in this scratchpad):
  - Tunde Bakare, who leads "Atlas delivery" (`6d34bb13-…`). He is a MEMBER.
  - Ngozi Eke, a participant in Atlas delivery. She is a MEMBER.
  - `manager.1790515683618@sales.test`, an ADMIN of the sales test organisation.
- **What I did.** About 20 read-only API calls, and read-only SQL counts. I wrote nothing, switched no suite on, and sent no email. Nothing was blocked.
- **Served output I read.** The captured lead and participant views of the last full run, in `api/journey/all-24/run-10/*.json`:
  - `sales.json` has 3 sessions, `seniorhire.json` has 4, and `pip.json` and the others have 1 each.
  - I also read the check-in turns for `seniorhire` in the database.

---

### 4. Judge: verdicts, who is slipping, and retention risk, told like a signal

#### (a) What the prototype shows

- **The lead's suggestion.** `C3-suggestions-and-appeals/suggestion-daniel.txt`, on Daniel's board, as Wairimu:
  - The headline is "Groundwork suggests a performance plan for Daniel".
  - It goes on: "Why: In the last 4 weeks, Daniel kept 11 of his 20 commitments. That is 55%. Below 6 in 10, Groundwork suggests a plan…"
  - Then "What would change this: Keeping 8 in 10…", then "Daniel's own answer", then "This is only a suggestion. You decide, and Daniel sees your reasons", with "Agree" and "Choose something else".
- **The ending suggestion.** `suggestion-kwame.txt` shows "Groundwork suggests keeping Kwame on" on the ending page. It comes with "Where things stand", "Signals… These only appear after three check-ins in a row", "Questions to help you decide", and the outcome with "Why, in a sentence or two. Kwame reads this with the outcome."
- **What the person sees.** `what-daniel-sees.txt`, on the You board: "Where you stand. In the last 4 weeks, you kept 11 of your 20 commitments. When fewer than 6 in 10 are kept, Groundwork suggests extra help to your manager… Wairimu has not decided anything yet… Add my side."
- **A good suggestion.** `suggestion-aisha-in-review.txt` and `E-suites/suite-reviews.txt` show "Groundwork suggests recognising Aisha's work", with "What Groundwork noticed. Proof first. Anything only said is marked", then the manager's words, the person's own view, and "No scores".
- **The decisions behind it.**
  - Decision 6: a suggestion, with why, what would change it and the person's own answer. The lead decides with a reason. The person sees the facts and can add their side or appeal. An admin decides appeals.
  - Decision 11: no scores.
  - Decision 17: colleagues are not named in evaluation check-ins.

#### (b) What the product does today

- **The plumbing is built, by the screens workspace.** It is in `api/src/modules/suggestions/`: `a-suggestion-told-like-a-signal.ts`, the service and the controller.
  - Each reader gets their own shape. The lead gets the headline, why, what would change it, their own answer and the choices. The person gets the facts and the decision. An admin gets it only once it is appealed.
  - The routes are:
    - `GET /grounds/:id/suggestions`,
    - `POST /suggestions/:id/decision`, `/side` and `/appeal`,
    - `GET /suggestions/appeals`,
    - `POST /suggestions/:id/appeal/decision`.
  - `verdict` is never served to anyone. Labels such as "PIP" and "at risk" are refused when the text is stored.
- **Nothing ever creates a suggestion.** The controller says "There is no route that creates a suggestion: only the engine does, through `SuggestionsService.record`". Nothing in the engine calls `record`.
  - Request 15 in `docs/requests-to-engine.md` still says **Open**.
  - The `suggestions` table has **0 rows**.
- **What I got when I tried it:**
  - As Tunde, `GET /grounds/6d34bb13…/suggestions` returned `{"suggestions":[]}`.
  - As Ngozi, the same route returned the same empty list.
  - As Tunde, `GET /suggestions/appeals` returned 403 with "Only an admin of this organisation decides an appeal." That is correct.
  - As the sales admin, it returned `{"appeals":[]}`.
  - As Ngozi, `GET /you` returned no "Where you stand" at all. There are goals, "What you said you'd do", reports and `coaching: null`.
- **The number the verdict would read does not exist.** All **1,040 of 1,040** `ground_commitments` rows have status `UNKNOWN`. Nothing ever marks a commitment as kept or missed, so "kept 11 of 20" cannot be counted for anybody.
  - The report says so itself: "open 2 sessions, nobody has said whether it happened".
- **Performance reviews (E4).** `api/src/modules/suites/the-reviews.service.ts` exists.
  - As the sales admin, `GET /suites/reviews/board` returned 404 with "The performance reviews suite is not switched on."
  - The review list comes from `evaluations_due`, which has 0 rows. Only an organisation's own system can fill it.
  - `performance_reviews` has 0 rows.
  - "What Groundwork noticed" is the engine's to write (request 23), and nothing writes it.
- **Who is slipping and retention risk.** Nothing in the product computes either. `retention.controller.ts` only sets how long a departed person's words are kept.
  - The nearest thing is each person's line on the board. On the live Atlas board, all six people read "… has checked in, and nothing here needs you this week."
  - Five of those same lines go on straight away: "Samuel Aryee has been waiting 2 days on the details for the analysis, and nobody has said yet what was tried. Ask Samuel Aryee to speak to Kwabena Mensah rather than write to them."
  - In `run-10/sales.json` it says "has been waiting 0 days".
- **What the engine does well instead: the lead's judgement.** `theJudgement` is served to the lead and is `null` for the participant, which is correct. For example, in `pip.json`:
  - "You are judging Nathan Owusu against a renewals target of eight and a standard of 'attitude' that were never shared…"
  - Then "whatToDo": "Set one, written target for renewals with you and Nathan Owusu in the same room…"
  - This reaches the scenario's right answer: the plan cannot start until the expectation is written down.
  - The wording slips, though. It says "State the specific behaviour **they** are concerned about", and "Ask **you** to give a specific, verbatim example".
- **The ending page works as a mechanism.**
  - As the lead, `GET /grounds/:id/resolution` gives the lead options, `leadDecides: true`, and a confirmation for each person.
  - The participant sees the others as "Participant A" to "Participant E". That is consistent with the no-names wrapper.
  - The PIP options are "Performance concern resolved", "Plan extended with named conditions", "Separation agreed" and "Not yet - plan still running".
  - There is no suggestion on it, no "Signals", no "Questions to help you decide", and the project options are clipped words such as "Descope".

#### (c) What is missing or wrong compared with the prototype

1. **No suggestion is ever made.** The verdict engine that the prototype assumes is not built:
   - nothing decides keep, reward, support, plan or exit;
   - there are no thresholds such as "below 6 in 10";
   - nothing writes the plain text for the lead or the person.
   The whole C3 flow exists but will always be empty.
2. **Commitments are never marked kept or missed.** Every commitment stays `UNKNOWN`, so the product has no "kept X of Y". The verdict, "Where you stand", "What would change this" and the reviews all rest on this missing count.
3. **There is no "who is slipping" read.** The board's line for each person says "nothing here needs you this week" even when the next line says the person is blocked. The prototype's "Samuel has chased the same 5 leads for 3 check-ins" kind of alert does not exist.
4. **Performance reviews cannot start.** The list of reviews due comes only from an outside system, so no organisation that signed up through the product will ever see a review. "What Groundwork noticed" is never written.
5. **The ending page has no suggestion, signals or questions.** Request 15 moved the ending suggestion into `record(forTheEnding)`, which nothing calls.
6. **Open questions only Hafsah or the engine workspace can answer:**
   - how "kept in the last 4 weeks" is counted,
   - when a suggestion is made and whether a new one replaces an undecided one,
   - the thresholds.
   These are listed in request 15 and are not answered.

#### (d) What would happen to a real person if we deployed without it

- Wairimu runs "Daniel, the next six weeks". After four weeks she opens the board. There is no suggestion, no "why", and nothing saying what would change it. She has to judge Daniel alone from long report text, which is exactly the unaided judgement the product promises to replace.
- Daniel opens his You board and sees no "Where you stand". He cannot know he is below the line until Wairimu tells him, and he has no "Add my side" to answer before she decides.
- If Wairimu starts a formal plan anyway, there is no record of a suggestion, a reason or an appeal. Nobody can later show the decision was fair.
- An HR admin who switches on Performance reviews finds an empty list, because nothing in the product creates reviews that fall due.

#### (e) Rating: **missing**

The way a suggestion is served, decided, answered and appealed is built and private in the right way. But nothing produces a suggestion, and the count it needs, commitments kept, is never recorded. A real lead or person sees nothing.

#### (f) Rough work to reach the prototype: **9 to 13 days**, after Hafsah sets the thresholds

- 2 to 3 days to mark commitments kept or missed from the next check-in and from proof, and to count "kept in the last 4 weeks".
- 3 to 4 days for the engine to reach a verdict and call `record` with the lead's text, the person's text and `promptVersionId`. That includes the ending case and the rule for replacing an old suggestion.
- 2 to 3 days for reviews:
  - let the product itself create the reviews that fall due,
  - write "What Groundwork noticed" (proven or only said),
  - give the reviews a suggestion of their own.
- 1 to 2 days to fix each person's line on the board ("nothing needs you" when something does, and "waiting 0 days"), and for privacy tests as the lead, the person and an admin.

---

### 5. Surface: reports, patterns and alerts reaching the right person at the right time, in plain words

#### (a) What the prototype shows

- **The lead's board.** `B5-the-board/board-as-lead.txt` has:
  - "Last updated on Wednesday 23 September at 6pm. The board only changes when something new comes in…";
  - one clear answer, "Will we reach 25 sales by 30 September? Not yet. 21 freezers are sold and 2 more are likely";
  - "What needs you in this check-in", with the item "Samuel has chased the same 5 leads for 3 check-ins… Ask him";
  - "The team today", with each person's line in plain words, such as "Qualified deals often lack a date".
- **The person page.** `B5-the-board/person-page.txt` has "Signals. In her last three check-ins, Miriam said the Westgate Deli sale was 'almost closed.' … A person decides what it means, not Groundwork", followed by Miriam's answer.
- **Reports.** `B4-reports-and-sharing/*` shows the report as a short story in names and full sentences, and "Today's report shares itself at 6:30pm".
- **Decision 7.** Reports and boards update only when something new comes in, and opening them never rebuilds them.

#### (b) What the product does today

- **Opening does not rebuild. This is verified live.**
  - The Atlas report `9d8fb225…` had `updated_at` 2026-09-25 07:44:53.94.
  - I opened `GET /grounds/:id/report` as Tunde and then as Ngozi. `updated_at` stayed the same.
  - `GET /grounds/:id/board` twice gave the same `lastChangedAt`, 2026-09-27T18:11:51Z. That comes from the record in `when-the-board-last-changed.ts`, not from opening.
- **The right reader gets the right thing. These parts are correct:**
  - the participant's report and board have no `theJudgement`;
  - the participant sees other people as "Participant A" and so on on the ending page;
  - there is a "report is ready" email (`Your report for "…" is ready to view`);
  - there are 1,843 `report_notices` rows, so notices are going out.
- **Alerts on Today are empty although the board has things for the lead.**
  - As Tunde, `GET /today` returned `"needs": [], "count": 0`, and under coming up only "Session 3 of Atlas delivery opens."
  - Yet his board shows "Blockers 2" and three people waiting 2 days on someone.
- **The report text is not plain.** This is the live `sharedPicture` of the Atlas report, which both the lead and the participant read:
  - "The record shows a gap for 1 of the 7 people who answered: Design and Communications Lead, Design: what they report has moved away from what this was for."
  - "Senior Associate, Delivery said this was for: A client-ready document with the completed analysis. Where they say they stand now: … What they say is in the way: …"
  - A quote is cut off mid-word: "I believe design is slow, and that c...."
  - People are named by job title, not by name. Pieces are joined with colons, and quotes are cut.
- **The coaching text has slips.**
  - In `pip.json` the lead reads "You are carrying 8 of a 8 objective…" and "…what you can point to, which shows that you own the work rather than just control it."
- **Patterns reach the lead's board too early, and under their internal names.** This is the live Atlas board as Tunde, after 2 sessions, under "What the record shows":
  - "Seen once or twice, not yet a pattern", with 14 lines, for example "You · Claimed Work Inflation · Seen in sessions…"
  - "Senior Associate, Delivery · Scope Rewriting · …"
  - "Finance Lead, Finance · Passive Finance Leadership · …"
  - In `run-10/cofounder.json`, after 1 session, the lead's board reads "Tunde Bakare · Equity Without Contribution" and "Tunde Bakare · Confidence Without Delivery".
  - `WhatTheRecordShows.tsx` draws each one as `{who} · {name} · {say}`.

#### (c) What is missing or wrong compared with the prototype

1. **"What needs you" does not reach the lead.** Today stays empty. The board's line for each person says "nothing here needs you this week" and then names a blocker. There is no prototype-style alert, such as "Samuel has chased the same 5 leads for 3 check-ins. Ask him."
2. **Reports are not in the prototype's words.**
   - People are named by job title ("Senior Associate, Delivery").
   - Pieces are joined with colons ("said this was for: … Where they say they stand now: …").
   - Quotes are cut mid-word.
   - The pronouns are wrong ("they" for "you", and "Ask you to give").
   This breaks the wording rule and the use of names.
3. **Pattern observations reach the lead before three periods, with a label on a named person.** The board lists patterns seen once as "not yet a pattern", but still next to the person's name and a name such as "Equity Without Contribution". This breaks decision 8 (three periods), decision 19 (plain names) and the rule of no labels on people. Details are in capability 7.
4. **The board's own answer lines are good,** for example `quickRead`: "Blockers 2, the competitive landscape, slides 16-19, and 1 more". But there is no single sentence like the prototype's "Will we reach 25? Not yet…", and "Movement: None, no target moved this session" is clipped.
5. **"Today's report shares itself at 6:30pm, Share now, Hold it"** is not something this check covered live. I did not test the release timing.

#### (d) What would happen to a real person if we deployed without it

- Tunde opens Today and is told nothing needs him. Three of his people have been waiting two days on Kwabena, and he learns it only if he scrolls the board. By then a week can be lost.
- Ngozi opens her team report and reads "Senior Associate, Delivery said this was for: … What they say is in the way: …". She cannot tell who said what, the sentences stop halfway, and she stops reading it.
- After one check-in, Tunde's board tells him his co-founder shows "Equity Without Contribution". He treats a one-off remark as a verdict on a person, which is exactly what the product promises not to do.

#### (e) Rating: **partly works**

The timing rule holds: nothing is rebuilt on opening, and the board's time comes from the record. Who reads what holds in the backend. What fails is what a person actually reads: alerts do not reach Today, the report text is not plain, and patterns reach the lead too early and under labels.

#### (f) Rough work to reach the prototype: **6 to 9 days**

- 2 to 3 days to fill Today's "needs" from what the board already knows, and to fix each person's line on the board.
- 3 to 4 days to rewrite the report's `sharedPicture` into full sentences with names, through the wrapper that puts in names. This is the engine workspace's job, and it must be proven on `promptVersionId` and the scorer.
- 1 to 2 days for patterns on the lead's board: stop showing the ones not yet repeated, or show them without a name and a label. This overlaps with capability 7.

---

### 7. Roles, coaching and behaviour patterns

#### (a) What the prototype shows

- **The role map.** `E-suites/suite-roles.txt`:
  - "Every role, what it owns, and who holds it. It is built from your teams and people, and it shows jobs that nobody owns."
  - "Stock planning. Booking freezers before customers need them. Nobody. Nobody owns stock planning. That is why Kwame waited three weeks for freezers."
  - "The role interview. Each person answers four questions about their job…"
- **Coaching.** `C2-the-you-board/you-board-miriam.txt` and `you-board-daniel.txt`:
  - "Coaching, followed over time. Last week we talked about asking for a buying date on the first visit. You did it at Lakeside."
  - "One thing for this week: Ask Westgate what would get the deposit paid this week."
- **A person's own pattern, told to them first.**
  - Miriam's board: "Something that keeps coming up. About your part in the work. Your qualified deals often don't have a buying date. 3 of 5, for three weeks running. Wairimu sees this pattern too. Say what's behind it."
  - Daniel's board: "You are seeing this first. Wairimu can see it too. Nothing is decided from it."
- **Signals at the ending.** `suggestion-kwame.txt`: "These only appear after three check-ins in a row. Kwame sees them too and can answer, and they never go anywhere on their own."
- **The decisions.**
  - Decision 8: patterns show only after three periods.
  - Decision 19: each of the 49 patterns gets a plain name for screens, written in `docs/pattern-names.md`.
  - Plus the rule of no labels on people.

#### (b) What the product does today

**Role map and roles**

- `api/src/modules/suites/the-role-map.service.ts` exists.
  - As the sales admin, `GET /suites/roles/board` returned 404 with "The role map suite is not switched on."
  - It reads only `roles`, `role_assignments` and `Person.title`, which only a staff-directory sync (SCIM) fills.
  - In the test database, `roles` = 0, `role_assignments` = 0, `role_interview_answers` = 0 and `role_gap_notes` = 0.
  - The role interview is the engine's (request 25), and it is not built.
- **The check-in itself reads people by their role, and that works.**
  - The board's contribution line reads a person against their kind of work, for example "Read against Sales and expansion: on track here means named buyers with budget and authority, real pipeline moving, dated next actions."
  - The coaching in the report carries `role.onTrack`, `goingWrong` and `protectAgainst`.

**Coaching**

- **In the check-in, following up works well.** In `seniorhire`, session 4, the product's turns include:
  - "Last time you hadn't explicitly said the word "renewals" to David yet, but you planned to in your one-on-one this past Tuesday. What happened in that conversation?"
  - "What conversation have you been putting off that would help David get there?"
- **The report carries a coaching block.** For example Femi, in `sales.json` session 3:
  - "showingUp": "Tasks described without connection to goals. This came up in 3 of your sessions, not once."
  - "beforeNextTime": "Which goal does this work serve, and how would someone know it had moved?"
- **The one-step coaching steps rarely produce anything, and when they do it is not a step.** This is in `coaching/one-step-at-a-time.ts`.
  - Only 194 of 2,873 `coaching_states` rows have a step.
  - The steps written today are often descriptions of a role, not an action. Examples: "Leaves every conversation with a dated next action somebody agreed to", and "Says the same direction until people can say it back".
  - The You board would show that as "One thing for this week: Leaves every conversation…".
- **Coaching reaches the check-in only when someone switches it on by hand.** It is behind `platform_settings.coaching_live`, and nothing writes that setting on its own. It is `true` in this test database. In a fresh database it is absent, which means off.
- **As Ngozi, `GET /you` returned `"coaching": null`.** There is no "Coaching, followed over time" on the You board.

**Behaviour patterns**

- **They are detected.** `pattern_detections` has 5,058 rows: 3,909 CANDIDATE and 1,149 SURFACED.
- **The three-period rule holds in the record.** Negative patterns become SURFACED only after three sessions, and not always in a row. For example, in `seniorhire` R2 surfaced from sessions [1, 2, 4]. Positive patterns surface at once (C1, C3, M2, M4), as `docs/backend-map.md` says.
- **The internal names are served, not plain names.**
  - On the live Atlas board as Tunde, the `patterns` section shows `"label": "Alignment Creator"` and `"label": "Named Collaborator"`.
  - In `run-10/sales.json` session 3, both the lead's and the participant's board carry `"label": "Blame Shifting"` and `"label": "Activity Without Outcome Logic"`.
  - `BoardPage.tsx` draws `{p.label}` as a pill, with "Ask them: What was within your control in this situation?".
  - `docs/pattern-names.md` says "Nothing here is switched on", and no code reads it.
- **A participant sees a colleague's patterns.** Femi's own board, in `sales.json` session 3, lists "Blame Shifting. The failure to secure approvals is attributed entirely to the credit committee not clearing submitted files." That observation is about Ngozi. It shows no name, but anyone in a team of four can tell who it is about.
- **Before three periods, with names, for the lead.** "What the record shows" lists every candidate with the person's name and internal label from session 1. See capability 5, for example "Tunde Bakare · Equity Without Contribution".
- **The person is not always told first.**
  - For Femi, the lead's board shows "Femi Okonkwo · Blame Shifting · Seen in sessions 1, 2, 3 of 3". Femi's own report has `overTime.patterns: []`, and its coaching mentions only the other pattern (K5).
  - There is no route for a person to answer a pattern ("Say what's behind it"). `patterns.controller.ts` only has `accuracy` and `rate`.
- **The coaching can contradict the record.** In `seniorhire` session 4, the lead's coaching says "Nothing has recurred often enough to call it a pattern". Yet R2 and A2 are SURFACED on the lead, and the board for that situation has no patterns section.

#### (c) What is missing or wrong compared with the prototype

1. **The role map is empty for everyone** without a staff-directory sync, and the role interview does not exist. "Jobs nobody owns", with its reason, is never written.
2. **Patterns are shown under their internal labels,** such as "Blame Shifting", "Equity Without Contribution" and "Claimed Work Inflation". They are shown next to a person's name to the lead, and as a pill on the participant's board. This breaks decision 19 and the rule of no labels on people. The plain names in `docs/pattern-names.md` are still waiting for Hafsah's approval.
3. **Patterns seen once reach the lead,** named and labelled. Decision 8 holds in the database but not on the screen.
4. **A participant's board shows colleagues' patterns.** That is a judgement about someone else, only thinly hidden.
5. **The person is not told first,** and cannot answer a pattern. The You board has no "Something that keeps coming up".
6. **Coaching is not followed over time on the You board,** and the one-step state machine rarely writes a step. When it does, the step is a description, not a thing to do.
7. **Coaching depends on a setting someone must switch on by hand** (`coaching_live`). A new database has it off.

#### (d) What would happen to a real person if we deployed without it

- Femi opens his team's board and sees a blue tag, "Blame Shifting", on a line he can tell is about Ngozi. It sits next to "Ask them: What was within your control in this situation?". Ngozi hears about it from him before Groundwork ever tells her.
- Tunde sees "Femi Okonkwo · Blame Shifting" on his board and raises it in a one-to-one. Femi has never been shown it, and has had no chance to say that the credit committee really is the hold-up.
- An admin switches on the role map to find the job nobody owns. It says there is nothing to show, because the company never connected a staff directory.
- Miriam looks for the coaching she was promised and finds nothing on her page. If a step does appear, it reads like a line from a job description.

#### (e) Rating: **partly works**

- Detection is strong, and the three-period rule is right in the record.
- Following up inside the check-in is good, and the check-in is aware of each person's role.
- What people actually read breaks the rules: labels, patterns shown early, a colleague's patterns, and nothing told to the person first.
- The role map and the coaching followed over time are effectively missing.

#### (f) Rough work to reach the prototype: **8 to 12 days**

- 1 to 2 days, once Hafsah approves `docs/pattern-names.md`, to serve plain names everywhere and stop serving `label` and `name`. Plus a test that a participant's board never shows another person's pattern.
- 1 day to keep patterns seen once or twice off the lead's board, or at least unnamed and unlabelled.
- 2 to 3 days for the person's own patterns on the You board, told first, with a "Say what's behind it" route and answers the lead can read.
- 2 to 3 days to make coaching steps real actions, keep the coaching block from contradicting the patterns, show "followed over time" on the You board, and decide how `coaching_live` gets set when the product is set up.
- 2 to 3 days to build the role map from roles the product already asks for at setup, and not only from a directory sync, plus the role interview (request 25).

---

### Summary

| Capability | Rating | Rough days |
| --- | --- | --- |
| 4. Judge (verdicts told like a signal, who is slipping, reviews) | Missing. The plumbing is built, but nothing makes a suggestion, and commitments are never marked kept. | 9 to 13 |
| 5. Surface (reports, patterns and alerts, at the right time, in plain words) | Partly works. The timing and who-reads-what are right. Today's alerts are empty, the reports are not plain, and patterns show early with labels. | 6 to 9 |
| 7. Roles, coaching and patterns | Partly works. Detection and follow-up in the check-in are strong. Labels reach screens, the person is not told first, and the role map and coaching over time are empty. | 8 to 12 |


---

## Three capabilities, checked live: memory, documents and photos

Checked on 27 September 2026, on branch `wip/plain-reports`, against the local API (`http://localhost:3000/api/v1`) and the local test database `gw_pw9_1786222102`. Nothing in the repository was changed, and nothing was committed.

### How the tries were run

- I used the same check-in as the previous checker, "Atlas delivery" (`6d34bb13-8d45-4b24-890c-c2d2692a9d0e`), in the Meridian test organisation.
  - Tunde Bakare (`mgr-1…@meridian.test`) runs it. His role in the organisation is MEMBER, not ADMIN.
  - Ngozi Eke (`fin-1…@meridian.test`) takes part in it.
  - I signed in with the tokens the previous checker saved. I did not change any password.
- I made about 30 API calls. Nothing was blocked. No email was sent. I did not run the scenario suite.
- I made the test files myself, in this scratchpad folder:
  - `harbor-receipt.jpg`, a slightly tilted photo of a payment receipt: "HARBOR FOODS LTD, PAYMENT RECEIPT No. 0447 … Amount paid: 12,000 US dollars".
  - `atlas-budget.docx`, a Word file that says the budget is 38,000 dollars. The check-in's own target says 40,000. The file also holds a made-up bank account number.
  - `atlas-status-text.pdf`, a PDF with a text layer.
  - `atlas-status-scan.pdf`, a PDF that is only an image, with no text layer.
  - `meridian-expenses.txt`, a short expenses rule.
- **Rows I created in the test database:**
  - Five documents uploaded as Tunde (the Word file, the two PDFs, the expenses rule, and the plan the previous checker left). One photo uploaded as Ngozi.
  - Ngozi's session 3 (`e3cb6ff6…`), which I answered and completed. It left 8 record lines.
  - Tunde's session (`c55bc097…`), which I opened and answered three times. It is still in progress.
  - Five context lines from the context chat: four "how this team works" lines that everyone reads, and one line about Ngozi that only the lead reads.
  - About six questions to Ask Groundwork.

---

### 6. Memory: what the organisation, a person and a check-in know, and whether a dump is used later

#### (a) What the prototype shows

- **`B2-context/context-chat.txt` and `context.txt` (Context for one check-in).**
  - The lead talks freely: "Say it in your own words. Anything that sounds like a rule comes back here for you to confirm."
  - Each item waits under "Waiting for you to confirm", one card each, with Confirm, Edit and Not now.
- **`B2-context/company-context.txt` (Company context, the same thing one level up).**
  - Items are "Picked up from your check-in on 22 Sep".
  - It holds the brief "In the CEO's words", the priorities, principles, definitions and "Still to decide".
  - It keeps a strategy history, where "Nothing is overwritten".
  - It has a short staff handbook ("Ask Groundwork answers from this, and says so").
  - It lists "What Baridi has learned, promised and has to hand": learnings, commitments, "Tried before" and resources, each "confirmed by Wairimu" before it is kept.
- **`D1-ask-groundwork/ask-panel-*.txt`.** Ask Groundwork answers from all of this and says where each answer came from.
- **`docs/modules.md`.** Characteristic 14, "Institutional memory", is marked "Shown". Characteristic 8, contextual suggestions from your own history, is marked "Partly".

#### (b) What the product does today, tried live

**1. A dump into the context chat.** As Tunde, I sent `POST /grounds/:id/context-chat` with one unstructured paragraph (`dump-body.json`). It said:
- Abena Mensah is Harbor Foods' finance head and approves invoices only on Tuesdays, so a Wednesday invoice waits a week.
- Harbor Foods wants every report as a PDF, never as slides.
- Kwabena is on leave from 6 to 17 October, and Yemi covers the deck while he is away.
- No report goes out until Samuel has checked the data.
- Sending drafts early was tried in Q2 and confused the client.
- A private remark: Ngozi may leave after Q4 because of the commute, "please do not raise it with anyone".

The reply was: "I have recorded that Harbor Foods is the client and Abena Mensah is their finance head. … I am not able to record private information about people's employment. Could you tell me what the main document is …?"

Three things are wrong with that reply:
- Nothing had been recorded yet.
- The proposal sent with the same reply *does* keep the remark about Ngozi leaving.
- It then asks for a document, which the lead had not been asked about.

**2. The confirmation.** `POST …/context-chat/confirm` wrote five rows to `ground_context_items`:

| Kind | Who reads it | Text |
| --- | --- | --- |
| WAY_OF_WORKING | Everyone | Send Harbor Foods invoices for Tuesday approval. |
| WAY_OF_WORKING | Everyone | Harbor Foods wants market reports as PDFs, not slides. |
| WAY_OF_WORKING | Everyone | Samuel checks data before market reports go to the client. |
| WAY_OF_WORKING | Everyone | Do not send draft numbers to the client. |
| ABOUT_A_PERSON (Ngozi) | The lead only | She may leave after Q4 because of the commute. |

Some of the dump was lost:
- Abena Mensah's name.
- The fact that a Wednesday invoice waits a week.
- Kwabena's leave. The reply says leave dates "stay in this conversation rather than on the record".
- The reason for the draft rule, which is what the prototype calls "Tried before".

The confirmation reply also contains clipped wording such as "Yemi Adeyinka: Cover the client deck (while Kwabena is on leave) - your words, not theirs".

**3. Used in the next check-in.** I opened Tunde's own session and wrote: "I will send the first Harbor Foods market report to the client as slides next Wednesday."

The reply was: "The plan your lead shared with everyone says … Samuel checks the data before they go to the client. It also says Harbor Foods wants market reports as PDFs, not slides."
- **The dump is used.** Two of the confirmed rules came back one check-in later, at the right moment.
- But it credits them to "the plan your lead shared". Tunde is the lead, and the rules came from a chat, not a plan.
- It did not raise the Tuesday rule, although the message said "next Wednesday".

**4. Ask Groundwork, as Tunde, with the check-in chosen.**

| Question | Reply |
| --- | --- |
| "What format does Harbor Foods want the market reports in?" | "I cannot answer that one yet." |
| "When is Kwabena on leave?" | "I cannot answer that one yet." |
| "How do we handle expenses here?" | "Your organisation has not written anything down about that here." |

- Meridian has **0** knowledge cards. The whole test database has 405.

**5. Organisation memory ("how we do it").**
- I uploaded `meridian-expenses.txt` and called `POST /org/how-we-do-it/propose` as Tunde. It returned 403: "Proposing how the company does something is for admins and people who run check-ins."
- Tunde runs this check-in. `mayPropose` in `api/src/modules/knowledge/who-may-say-how-we-do-it.ts` checks only for the organisation roles ADMIN or LEAD. So a MEMBER who runs a check-in is refused, while the message says he should be allowed.
- `GET /org/how-we-do-it` returned no cards and nothing waiting.

**6. The Company page.** `GET /company` returned the organisation's name, "11 people." and two priorities. Nothing else: no brief, principles, definitions, learnings, promises, "Tried before", handbook or versions.

**7. What is known about a person.** Ngozi's check-in opened with "Last time you said the project cannot proceed as planned. What has happened with that data purchase issue since then?". So her own earlier sessions carry forward. The lead's private note about her is also fed into her own session (see the privacy points in (c)).

#### (c) What is missing or wrong

1. **Memory is kept per check-in, never for the organisation.**
   - The Harbor Foods facts are true for every check-in about that client. They landed only on "Atlas delivery".
   - Nothing picks up learnings, promises or "Tried before" from check-ins for a lead to confirm.
   - Nothing builds the company context: brief, principles, definitions, versions. This is request 17(e), still open.
2. **A dump loses facts and dates.**
   - The reader keeps rules, numbers and notes about people. A plain fact (a name, a contact, a date of leave, a reason) is dropped.
   - The reply then says "Nothing else from it is kept". That is honest, but the lead has no way to keep the rest.
3. **Ask Groundwork cannot recall any of it.**
   - It does not read context lines, documents or record lines. It reads only knowledge cards, and this organisation has none.
   - So the prototype's "Ask Groundwork answers from this, and says so" does not happen.
4. **The only ways into organisation memory are narrow.**
   - One is the developer API (`api/org/v1/knowledge`).
   - The other is proposing a document and having an admin approve it. That proposal is refused for leads who are MEMBERs, which is most leads.
5. **The context chat says things that are not true.**
   - It says "I have recorded …" before the lead confirms anything.
   - It says it cannot record the private remark, while the proposal keeps it.
6. **Privacy: the lead's private remark reaches Ngozi's own interviewer.**
   - `aPlaceToLook` in `api/src/modules/conversation/what-the-context-already-holds.ts` puts "She may leave after Q4 because of the commute" into her session's instructions, telling the model it is "never quoted".
   - It is kept out of her reports and the board. But the protection is only an instruction to the model, and the lead had asked for it not to be raised with anyone.
   - I could not test whether it leaks, because Ngozi has no open session left.
   - Keeping a remark like this out of a person's own session would change a privacy rule, so it is for Hafsah.
7. **Two wording points.** The engine says "the plan your lead shared" to the lead himself. A dump is credited to "a plan".

#### (d) What would happen to a real person if we deployed without it

- Wairimu tells the context chat everything about her key customer: who approves payments, which day, and what went wrong last time. The chat says "I have recorded that", so she believes it.
- A week later she asks Ask Groundwork "who approves Green Mart's invoices?" and is told it cannot answer.
- In her second check-in about the same customer, nobody knows any of it.
- She asked for a remark about a colleague to stay private. It is now steering that colleague's own questions, and only an instruction to the model keeps it from being said.
- When she tries to write down "how we do it" for the company, she is told it is for "people who run check-ins", which she is.

#### (e) Rating: **partly works**

Within one check-in, a dump becomes confirmed rules, and those rules are used in the next conversation. That works well. Memory for the organisation, keeping plain facts, and recall through Ask Groundwork are missing.

#### (f) Rough work to reach the prototype: **9 to 13 days**

- 3 to 4 days to pick up learnings, promises and "Tried before" for the organisation, with the lead confirming each one, and to show them on the Company page.
- 1 to 2 days to keep plain facts and dates from a dump, not only rules and numbers.
- 2 to 3 days for Ask Groundwork to answer from context lines, documents and knowledge cards, and say where each answer came from. This depends on Ask first answering for everyone (capability 1).
- 2 to 3 days for company context picked up from check-ins, with versions.
- Half a day to let the person who runs a check-in propose "how we do it", and to fix the context chat saying "recorded" too early.
- Hafsah decides whether a lead's private remark about a person may reach that person's own session.

---

### 8. Documents: reading a document for context

#### (a) What the prototype shows

- **`B2-context/upload.txt` ("Add a document").**
  - It shows the file "4 pages, read just now".
  - It asks "What should it be used for? One line is enough".
  - It lists "What it took from the document", item by item with page numbers (such as "Lowest price you'll accept, KES 76,000 for the 600L, Page 2").
  - It lists "What it left out", for example "Bank account details, Page 4, Never kept, in any document."
  - It shows "One thing doesn't match what you've told it … Which should the check-in use?", with answers to choose from.
  - It asks "Who can read it". "Only you" still lets the check-in use it for everyone's questions.
  - It ends with "Add it to Context".
- **`B2-context/context.txt`.**
  - "From a plan. Nothing is added until you confirm it."
  - "Add a document. It starts private to you."
- **Decision 12.** A number from a document is confirmed before it is written.

#### (b) What the product does today, tried live as Tunde (`POST /grounds/:id/documents`)

**Every file type I tried was accepted and read.**

| File | How it was read | What was kept (`content`) | What it holds (`holds`) |
| --- | --- | --- | --- |
| `atlas-budget.docx` | Word reader | The whole text, **including the bank account number** | Two numbers waiting: "approved budget for Atlas: 38,000, not to be passed" and "second invoice: 12,000, by 10 November" |
| `atlas-status-text.pdf` | PDF text | The whole text | Nothing. "2 of 5 signed off" is progress, not a target, so nothing is taken |
| `atlas-status-scan.pdf` | Gemini reads the image (`origin: scan`, about 9 seconds) | A faithful copy of the text | The totals 5 and 4 |

- Each upload came back at once with `stillReading: true`. The summary (`assessment`) arrived about 20 seconds later.
  - Its "suggests" lines were accurate, for example "This shows over half the budget has been spent."
  - Its "willDo" lines speak for the product, for example "I will hold this document as the record …".
- Each document started as "Only you can see this."
- **What the lead reads, and decision 12.** When I opened Tunde's next session, the first message read out all three documents' holds, one after another:
  - "Here is the context we have from atlas-plan.txt - This is the Atlas project plan for Q4. For the whole check-in: - market reports: 5, by by 15 December … Is that right?"
  - The same again for the Word file and the scan, so three "Is that right?" questions in one message.
- **The clash was found.** After Tunde answered, the engine asked: "The Atlas plan your lead shared says Ngozi will keep spend under 40,000. Your budget document, which is your own, puts the approved budget at 38,000. Which of those is the current budget?" That matches the prototype.
- But Tunde had just said "the budget is still 40,000, not 38,000". When he replied "I already said that", it answered "You did say that. What will you do to make sure the budget document reflects that, and by when?".
- **A qualified yes wrote nothing.** Tunde replied "Yes, the plan and the status note are right. But …". No target was written, and every document's `takenAt` is still empty.
  - `whatTheDocumentWaitsFor` in `conversation.service.ts` accepts only a bare "yes" of 40 characters or fewer.
  - Even then, it takes only the newest document that has anything waiting.
  - The names do not always line up either. The scan's "markets" would sit beside the existing "markets loaded" as a second target.
- **Documents do reach the conversation and the record.**
  - A person's own documents, and the ones open to everyone, go into their session (`documentWhereFor`).
  - When a session is completed, each record line is matched against the documents (`anchorRecordToDocuments`), which marks the line as backed by a document and keeps the passage. Section 9 shows this working with a photo.
- **Ask Groundwork.** "What does the Atlas budget document say the approved budget is?" got "I cannot answer that one yet."

#### (c) What is missing or wrong

1. **Bank details are kept.** The account number sits in `ground_documents.content`, and it is sent to the model in every session. The prototype says "Never kept, in any document." (request 40(b)).
2. **There is no item-by-item read.** No page numbers and no "What it left out". There is only a list of what it "suggests" (request 6(c)).
3. **The confirmation is in the wrong place, and is fragile.**
   - The numbers wait for a bare "yes" in the lead's own check-in. Nothing on the Context page lets the lead take them.
   - Several documents are read out in one message, each asking "Is that right?".
   - A "yes, but …" writes nothing.
   - One yes takes only one document.
   - Decision 12 is kept in the letter: nothing was written without a yes. In practice, the numbers are hard to ever confirm.
4. **A clash is asked, but the answer is not kept.** It asked the question the lead had just answered, and nothing records that 40,000 won.
5. **Only targets are taken.** Progress in a document, such as "2 of 5 signed off", is not read as progress. It is only used later to back a record line.
6. **The wording is not plain.** For example "by by 15 December", "For the whole check-in: - market reports: 5" and "Here is the context we have from X - This is …" (request 40(a)).
7. **"Private to you, but used for everyone's questions" does not exist.** A lead's private document shapes only the lead's own session. Making it open lets everyone open it. Adding the prototype's middle option needs Hafsah, because it touches privacy.
8. **Ask Groundwork cannot read documents.**

#### (d) What would happen to a real person if we deployed without it

- Wairimu uploads her price list. It includes the company's bank details, which are now stored and sent to the model every session.
- Her next check-in opens with three blocks of dashes and colons, each ending "Is that right?".
- She answers "Yes, but the 600L is 78,000 now". Nothing is written, and her targets never appear.
- She is asked again which price is right, after she has just said it.
- She never sees what was taken from which page. When a number is wrong, she cannot tell where it came from.

#### (e) Rating: **partly works**

Reading works well for text, Word, PDF and scanned PDF. The document reaches the conversation, and it backs record lines. The prototype's upload screen, the kept answer to a clash, a confirmation a person can actually give, and never keeping bank details are missing.

#### (f) Rough work to reach the prototype: **5 to 8 days**

- 2 days for the item-by-item read, with pages, "What it left out", and bank details stripped before anything is stored.
- 1 to 2 days to confirm each item on the Context page, instead of a bare yes in the check-in.
- 1 to 2 days to keep the answer to a clash, and to accept a "yes, but".
- 1 day for full-sentence wording.
- 1 day, after Hafsah decides, for "only you can open it, but the check-in uses it".

---

### 9. Photos: a photo as proof in a check-in

#### (a) What the prototype shows

- **`B3-the-check-in/check-in-end-card.txt`.**
  - The check-in asks: "Can you add the quote? A photo of it is enough. Then the Green Mart sale counts as proven, not only as your word."
  - The end card lists "What is now in your record", with "Green Mart has a quote, From the photo you added".
  - Under what happens next: "If Green Mart sends a written order, add a photo of it."
- **`B3-the-check-in/done.txt`.** "Quote photo added" and "Proof: A photo, a quote or a message".
- **`B3-the-check-in/my-record.txt`.** "Add proof to a deal" and "Green Mart quote, Quote photo, 23 Sep".
- **`C2-the-you-board/you-board-miriam.txt`.** "Send a photo of Green Mart's written order."
- **`D1-ask-groundwork/ask-panel-lead.txt`.** "21 sold, 17 with proof of payment", "Contact with proof: a photo, a quote, a payment".
- **`docs/modules.md` and `backend-map.md`.** Photos as proof, and the four marks: proven, confirmed, someone's word, memory.

#### (b) What the product does today, tried live as Ngozi

1. She opened session 3 and got a good opening question.
2. I uploaded `harbor-receipt.jpg` through `POST /grounds/:id/documents`. This is the same route the check-in's "+" button uses (`ChatPage.tsx`, "Add a photo, a document or some text").
   - Gemini read the tilted photo **word for word**: "HARBOR FOODS LTD | PAYMENT RECEIPT No. 0447 | … Amount paid: 12,000 US dollars …".
   - The response then told her: **"This looks like a record of a conversation. It has been kept on your word that the people in it know their conversations may be used this way."**
   - The row was saved with `origin: conversation` and `is_conversation: true`.
   - The cause is `looksLikeAConversation`. It treats lines that start with a label and a colon ("Date:", "Paid to:", "For:") as people speaking, so any receipt or invoice photo will be called a conversation.
3. `POST /check-ins/:id/document-received` replied: "I see the attached document, "harbor-receipt.jpg." What does this document confirm about what you have described?"
   - It is correct, but generic. It does not say what the photo shows.
4. She answered, and the engine said: "That is a clear receipt showing the payment was made … That is movement. Last time you said The commercial assumptions were …". Note the capital "The" in the middle of the sentence.
5. On completion, `record_entries` held the line "Harbor Foods paid the second invoice, 12,000 dollars, on 24 September."
   - It has `recall_based = false`, `anchored_document_id` pointing to the photo, the passage "Date: 24 September 2026… Amount paid: 12,…", `anchored_origin = conversation`, and verifiability HIGH.
   - **So the photo really does become proof on the record.**
   - The completion reply named it as the strongest thing she said: "What a reader can stand on: "It is the receipt from Harbor Foods …"".
6. **What people actually see of it.**
   - No end card came back. `endCard` was null on the reply and on the transcript, so "From the photo you added" is never said (request 7(b), open).
   - Her own summary (`/artifact`) does not mention the payment at all.
   - On Tunde's board, the line appears under "who owns what" as plain text, with no mark or note that a photo backs it (request 2, open).
7. **The image itself is not stored.** `ground_documents` has no file column, only the text read from it, so nobody can open "Quote photo, 23 Sep" later.
8. **Elsewhere.**
   - The engine never asks for a photo when something is only someone's word, as the prototype does ("A photo of it is enough").
   - WhatsApp can fetch a photo sent in a message (`fetchMediaFor`), but I did not test it.
   - Ask Groundwork has no way to attach a file (request 16(h)).

#### (c) What is missing or wrong

1. **Receipts and invoices are called "a conversation".** The person is told something false about consent. Wherever the product names what kind of thing backs a line, it will say "a conversation", not "a photo". It still counts as proof.
2. **Nothing a person sees says a photo made something proven.** No end card, no mark on the board or report, and no mention in their own summary.
3. **The engine does not ask for proof.** The prototype's step "Can you add the quote? A photo of it is enough" is missing, and so is "add a photo of the written order" under what happens next.
4. **The photo is not kept.** Only its text survives, so "My record" cannot show the photo.
5. **The acknowledgement is generic.** It does not say what the photo shows or which claim it backs.

#### (d) What would happen to a real person if we deployed without it

- Miriam photographs the Green Mart quote and adds it. She is told it "looks like a record of a conversation" and that it was kept on her word that the people in it agreed. She has no idea what that means, and may delete it.
- The proof does count, but nobody tells her. The end of her check-in does not say "From the photo you added", and her lead's board shows the sale the same way as a claim with no proof.
- Next time, she sees no reason to add a photo. The proof on the record that the prototype is built around quietly dries up.

#### (e) Rating: **partly works**

Reading works well: the vision model reads the photo accurately. The photo becomes proof on the record: the line is anchored to it, with the passage. Saying so to the person and the lead, asking for proof, keeping the image, and labelling a receipt correctly are missing or wrong.

#### (f) Rough work to reach the prototype: **4 to 6 days**

- Half a day to stop calling a photo of a receipt or invoice a conversation.
- 1 to 2 days for the end card's "What is now in your record", with "From the photo you added" (request 7(b)).
- 1 to 2 days for the marks (proven, someone's word) on the board and reports, as part of request 2.
- 1 day for the engine to ask for a photo when a claim rests only on someone's word, with the prompt change proved from `promptVersionId`.
- 1 day to store the image, so "My record" can show it. Where images are kept is a storage decision for Hafsah.

---

### Summary

| Capability | Rating | Work |
| --- | --- | --- |
| 6. Memory | Partly works. A dump becomes confirmed rules for one check-in, and they are used in the next session. There is no memory for the organisation, plain facts are dropped, Ask Groundwork cannot recall any of it, and a lead's private remark about a person reaches that person's own session. | 9 to 13 days |
| 8. Documents | Partly works. Text, Word, PDF and scanned PDF are all read and reach the conversation and the record, and a clash is noticed. The confirmation is fragile, bank details are kept, there is no item-by-item read with pages, and the wording is clipped. | 5 to 8 days |
| 9. Photos | Partly works. The photo is read accurately and really becomes proof on the record. Nobody is told so, the engine never asks for proof, the image is not kept, and a receipt is mislabelled "a conversation". | 4 to 6 days |

Other defects I noticed in passing:
- In Ngozi's session, the engine said "Your report is ready now. Speak soon." and then asked "What else should I know?". Completing then failed with "the record is still thin" until she said she was finished.
- "Last time you said The commercial…" has a capital letter in the middle of a sentence.


---

## Two capabilities, checked live: requests through chat, and being away

Checked on 27 September 2026, on branch `wip/plain-reports` (at `1a7e2183`), against the local API (`http://localhost:3000/api/v1`) and the local test database `gw_pw9_1786222102`. Nothing in the repository was changed or committed.

### How the tries were run

- I used the check-in "Atlas delivery" (`6d34bb13-8d45-4b24-890c-c2d2692a9d0e`) in the Meridian test organisation, with the tokens the earlier checkers saved (`call.sh`, `show.py` in this folder).
  - Tunde Bakare runs the check-in. His role in the organisation is MEMBER.
  - Ngozi Eke takes part. Her role is MEMBER.
  - Olu (`dir-1…@meridian.test`) is the only ADMIN in Meridian. Everybody else is a MEMBER, and nobody is a LEAD.
- I made about 15 API calls and ran one small script (`leave-try.ts`) that calls the leave suite's own service. Nothing was blocked. No email was sent. I did not run any sweep or cron, and I did not run the scenario suite.
- **What I wrote to the test database:**
  - An `organization_suites` row that switches the leave suite on for Meridian (20 days a year, "An admin" approves). This is what an admin's `PUT /suites/leave` would write.
  - One `leave_requests` row: Yemi Adeyinka, 21 September to 2 October, approved by Olu. It covers today.
  - One `commitments` row for Ngozi, from Ask Groundwork: "be on holiday next week so I cannot check in" (see 10b).
  - One turn in Tunde's open session `c55bc097…` (see 10b).
  - To undo: `delete from leave_requests where id='05c1a151-038c-4beb-a306-2c84c353da61'; delete from organization_suites where suite='leave' and organization_id='e4aa6d6f-6b4a-4787-95b0-3dc0e151ac04'; delete from commitments where id='487e0139-1a6d-4fd8-838e-10d759dcc893';`

---

### 10. Requests through chat: leave, spending and hours, by talking

#### (a) What the prototype shows

- **`E-suites/suite-leave.txt`.** "People ask for time off in their check-in or chat. Groundwork checks their balance and who else is off, and sends it to the right approver."
  - The example chat: "I need next Thursday and Friday off." Groundwork answers: "You have 16 days left and nobody else in Sales is off then. Shall I send it to Wairimu?"
  - It ends: "In their check-in, in chat, or on WhatsApp. Nobody fills in a form."
  - Each waiting request says something useful to decide with, such as "Brian is also off that day, so Sales would be two short.", next to Approve and Decline.
- **`E-suites/suite-spend.txt`.** "People ask to spend by telling Groundwork. It checks the budget and the rules, then sends the request to the right person."
  - The example: "Can I spend KES 18,000 on fuel for the Kisumu deliveries?" Answer: "Operations has KES 38,000 left this month, so yes, that fits. I have sent it to your lead to approve."
  - Each request says who may approve it: "This is over KES 20,000, so Grace must approve it."
- **`E-suites/suite-time.txt`.** "People tell Groundwork their hours in their check-in or in chat. There is no grid to fill in." It also says "Hours are for billing only."
  - The example: "I spent 3 hours at Naivas Ngong Road today, and 1 hour on the Lakeside visit." Answer: "Written down: 3 hours on Naivas Ngong Road, 1 hour on Lakeside. Is that right?"
- **`docs/modules.md`, D1 Ask Groundwork.** It "does things for you, after a yes": leave, a to-do, hours, a spending request or moving equipment. It says the request back and asks "Is that right?".
- **Decision 12.** Requests are said back and confirmed before anything happens.
- **Decision 10.** Hours are for billing only.

Note that the prototype's example spending answer says "I have sent it" in the same breath as the check. That skips the confirmation that decision 12 asks for. The screens workspace's request 26 already corrects it to "I will send it to your lead to approve", after "Is that right?".

#### (b) What the product does today, tried live

**What exists.** The screens workspace has built the storage and the boards, but not the way in.

- The tables exist: `leave_requests`, `spend_requests` with `team_budgets`, and `time_entries` with `time_weeks` and `time_agreements`.
- The boards and routes exist, all under `api/src/modules/suites/`:
  - `GET /suites/leave/board`, `GET /suites/leave/mine`, and Approve or Decline on a request.
  - `GET /suites/spend/board`, Approve or Decline, and `PUT /suites/spend/budgets`.
  - `GET /suites/time/board`, `GET /suites/time/mine`, weekly approval, and `PUT /suites/time/agreements`.
- The functions that would record a request exist: `LeaveBoardService.ask`, `SpendingService.check` and `.ask`, and `TimeSheetsService.record`. **No route and no chat calls any of them.**
  - This is by design, because "nobody fills in a form". The screens workspace asked the engine to wire them in `docs/requests-to-engine.md`, requests 21 (leave), 22 (hours) and 26 (spending). All three are still marked **Open**.
- A search of `api/src` for `LeaveBoardService`, `SpendingService`, `TimeSheetsService`, `leaveRequest`, `spendRequest` and `timeEntry` outside `suites/` finds nothing.
- The Ask Groundwork router (`the-router-is-deterministic.ts`, `what-the-assistant-can-do.ts`) has no lane for leave, spending or hours.

**Ask Groundwork, as Ngozi, with "Atlas delivery" chosen (`POST /ask`):**

| What was sent | What came back | Rows written |
| --- | --- | --- |
| "I need leave from 12 to 16 October" | "I cannot answer that one yet. Here is what I can do with "I need leave from 12 to 16 October"." It showed four buttons: "Tell me what you can see", "What am I on?", "What is on my list?" and "Hold this against my next check-in". The lane was `unplaced`. | None |
| "Can I spend 45,000 on a laptop?" | The same "I cannot answer that one yet" reply. | None |
| "Log 6 hours on Atlas today" | The same "I cannot answer that one yet" reply. | None |
| "Book me off Monday" | The same "I cannot answer that one yet" reply. | None |
| "I will be on holiday next week so I cannot check in" | "Shall I note that down: "be on holiday next week so I cannot check in"?" The lane was `propose_commitment`, because the sentence starts with "I will". | A `PARKED` proposal |
| Yes to that (`POST /ask/answer`) | "Noted: be on holiday next week so I cannot check in. It will come back to you in your next check-in." | A `commitments` row, state OPEN, with `due_said` "next week". Nothing in `leave_requests`, and nothing on her `leave_periods`. |

The last one is the worst of these. Telling Groundwork you will be away is saved as a **promise to do something**. It will be followed up in her next check-in as if it were work she said she would do. The detectors, the handover and the developer API all read `commitments`.

**The check-in, as Tunde, in his open session 3 (`POST /check-ins/c55bc097…/messages`).** I sent: "Also, I need leave from 12 to 16 October, and can I spend 45,000 on a laptop? I did 6 hours on Atlas today."

The reply ignored all three requests. It read back a document he had uploaded earlier ("Here is the context we have from meridian-expenses.txt … Is that right?"). Then it asked a different question: "Understood. What have you personally done about the document with the project scope since our last conversation?" No row was written to any of the three tables.

**WhatsApp.** It is switched off and its templates are not approved (see memory). I read the code but did not try it. `a-whatsapp-message-is-routed.ts` sends an incoming message to the person's open check-in, so it would behave like the check-in above.

**The suites' own routes.** No suite was switched on in any organisation, and all three tables were empty.
- As Tunde, `GET /suites` gave "Only an admin or a lead can open the suites."
- `GET /suites/leave/board` gave "The leave suite is not switched on." The spending and time sheets boards said the same.
- After I switched the leave suite on and recorded Yemi's request through the service, the admin's board showed it waiting. Once Olu approved it, it showed under "off": `{"name":"Yemi Adeyinka","startsOn":"2026-09-21","endsOn":"2026-10-02","kind":"annual"}`.
- Yemi's own view (`mine`) read "perYear 20, daysLeft 10", worked out from the approved days. That is right, and it fixes audit A4, where every person had "16 days left".

**Who is asked to approve (`who-approves.ts`, and `approverOf` in `the-spending.service.ts`).**
- For leave and hours, the approver is "Their manager" when the directory names a manager who is a LEAD or ADMIN in the organisation. Otherwise, and for "An admin", it is any admin. Nobody approves their own.
- For spending, the person's manager (if LEAD or ADMIN) approves up to the admin's limit. Above it, the person the admin named approves, or failing that an admin.
- **Nobody is told a request is waiting.** Nothing sends an email or a WhatsApp message, and nothing puts it on Today (`what-needs-you.ts` has no suite items). The approver finds out only by opening the board.
- **The "lead" here is the organisation role LEAD, not the person who runs the check-in.** In Meridian nobody has that role. So Tunde, who runs Atlas delivery, cannot open the leave board at all, and every request would go to Olu.

**What the approver sees.** On the leave board, a waiting request shows:
- the name and the days, written out in full by the screen (`theDaysInFull` in `LeaveBoardPage.tsx`; I read the served data, not the rendered page);
- the days left, and the others in the same department who are off on those days;
- Approve and Decline, only for whoever may decide.

No reason is kept. The spending board shows the amount, what it is for, the team's budget and who may approve. The time sheets board shows each week's hours by client.

#### (c) What is missing or wrong

1. **No way in.** Nothing in chat, the check-in or WhatsApp records leave, spending or hours. Engine requests 21, 22 and 26 are all open. The boards can only ever be empty in real use.
2. **Being away is recorded as a promise.** "I will be on holiday next week" becomes an open commitment that will be followed up as work.
3. **The check-in does not notice a request at all.** The model moves on to its own next question.
4. **There is no confirmation wording for these requests,** because there are no lanes. Where Ask Groundwork does confirm something, it says "Shall I note that down" or "Yes to keep it, no to leave it", not the prototype's "Is that right?".
5. **Nobody is told a request is waiting,** so a request would sit until somebody happens to open the board.
6. **The approver depends on the organisation role LEAD,** which most organisations do not use. The person who actually runs the team's check-in cannot see or decide their team's leave unless they are also made LEAD.
7. **Dates are not worked out from what was said.** This is the prototype's audit A2 ("Book me Monday off" gave the wrong days). There is nothing yet that turns "12 to 16 October" or "next Thursday" into days, with the year and the working days shown back to the person.
8. **What works:** the storage, the boards, the privacy walls (tested for each reader), days left, who else is off, the approval rules, and keeping hours out of the engine.

#### (d) What would happen to a real person if we deployed without it

Ngozi types "I need leave from 12 to 16 October" and is told Groundwork "cannot answer that one yet". She has to email her manager instead, and the leave board never learns she is off.

If she writes "I will be on holiday next week", Groundwork notes it as something she promised to do. In her next check-in it asks her how that went.

A lead who switches on the spending suite sees an empty board forever, because nobody can ask to spend. If someone did get a request in through the database, the approver would not know it was waiting.

A lead like Tunde, who runs the check-in but whose organisation role is MEMBER, is told he cannot open the suites at all.

#### (e) Rating

**Missing.** The screens and storage are ready, but no request can be made by talking, which is the only way the prototype allows.

#### (f) Rough estimate to reach the prototype

**About 7 to 9 days.** Three new request lanes are needed, each shared by Ask Groundwork and the check-in (and so WhatsApp):
- turning what was said into exact days, amounts and clients;
- saying it back with days left, budget left, who is off and who approves, and waiting for "Is that right?";
- then calling the existing suite functions.

On top of that, the approver has to be told on Today and by email. There is also a product decision for Hafsah on whether the person who runs a check-in counts as "their lead" for approvals.

---

### 11. Being away: does Groundwork know, stop asking, and not hold it against them

#### (a) What the prototype shows

- **`E-suites/suite-leave.txt`.** The only place in the prototype where being away is shown. It has a "Who's off" list for "The next two weeks" (for example "Brian Mwangi, Mon 5 Oct, Annual leave"). A waiting request warns when a team would be short.
- **`F1-connections/connections.txt`.** The HR system brings in "Who works here and who they report to … Joiners, movers and leavers arrive too." It does not mention leave coming from the HR system.
- **No screen shows what happens to someone's check-in while they are away.** No prototype screen says, for example, "Yemi is on leave until 2 October". That includes C1 Today, B5 the board, C2 the You board, B3 the check-in and F4 small states.
  - The team report does say "Omar had not checked in by 6pm" and "Omar did not check in" (`B4-reports-and-sharing/team-report.txt`). A person on leave would read the same way there.
- **The decisions do cover it in spirit.**
  - Decision 13: "The engine pushes, but never decides. It tells the person first. It can be told "not now"."
  - Decision 9: getting set up never counts against a new person. The same idea of not counting time someone was not there applies.
  - Decision 8: patterns show only after three periods.
  - The "no labels" rule: a missed round should be told as what happened, not as a label on the person.

#### (b) What the product does today

**The engine was designed to know, but nothing ever tells it.**
- `api/src/modules/conversation/participation-timeline.ts` defines the rule clearly: "ON LEAVE: paused. The clock stops and resumes; the periods do not count and are never read as anything at all." It has `onLeaveAt`, `countableSessions`, `patternClockReached`, `mayCoach`, `mayFormNewRead` and `absorptionIsExplained`, tested in `absence-is-not-a-signal.spec.ts`.
- The dates live on `ground_participants.leave_periods` (dates only, never a reason).
- **Nothing writes `leave_periods`.** A search of `api/src` finds no writer. The column is empty for every participant, including Yemi after her leave was approved.
- **Only one thing reads it.** `observeForCoaching` in `conversation.service.ts` (about line 4845) calls `mayCoach` and does not offer a coaching step to someone on leave. The other functions in the file (countable sessions, the pattern clock and new reads) are only called from their own spec.

**An approved leave request does not reach the engine, on purpose.** `the-leave-board-as-each-reader-reads-it.spec.ts` has a test called "nothing outside the suites reads leave requests". It fails if any file outside `suites/` reads the `leaveRequest` table. So today leave cannot reach the board, the reminders or the reports. Any fix must either copy the dates across from inside `suites/` (onto `leave_periods`, dates only), or change that test. Changing the test is a privacy decision for Hafsah.

**The other ways Groundwork could know:**
- *From what the person said.* In Ask Groundwork, being away becomes a commitment (see 10b).
- *From the context chat.* The earlier checker found that Kwabena's leave (6 to 17 October) was dropped: the reply said leave dates "stay in this conversation rather than on the record" (`a-dump-is-many-things.ts`, line 236). Asked "When is Kwabena on leave?", Ask Groundwork said "I cannot answer that one yet".
- *From a connected HR system.* The `Person` model (SCIM) has `active` and `deactivatedAt` for leavers, but no leave or absence field.

**Tried live: I approved leave for Yemi, 21 September to 2 October, covering today.** Yemi had not checked in for the open round. I read the board and Today again as Tunde, the lead.

| Where | Before | After |
| --- | --- | --- |
| The lead's board, "each person" (`GET /grounds/:id/board`) | "Yemi Adeyinka has not checked in for this round yet.", reason `has not answered`, sorted first ("worst first") | Exactly the same. The board's `eachPerson` was identical, and nothing on the board mentions leave. |
| The lead's Today (`GET /today`) | "In Atlas delivery, 1 of 7 have checked in for session 2; 6 people haven't yet." | Exactly the same. Yemi still counts among the 6. |
| The leave board (admin) | Empty | "Yemi Adeyinka, 21 September to 2 October, annual leave" under who is off |
| Yemi's `leave_periods` | Empty | Still empty |

The board is stored and is rebuilt only when something new comes in, so it could not have changed on opening anyway. But the code that builds it cannot read leave either. `whyThisRow` in `where-each-person-is-against-their-number.ts` returns `has not answered` for anyone without an answer, and `howManyHaveAnswered` in `how-many-have-answered.ts` counts everyone with an account as expected. So a rebuilt board would say the same.

I could not sign in as Yemi to read her own Today, because she has no password set and I did not add one. Read from the code, her Today (`what-needs-you.ts`) and the sidebar would show her turn as waiting, and then late once it has waited a while ("lateTurns"). Neither of them reads leave.

**Reminders and nudges. I read the code; I did not run it.**
- `RemindService.sendScheduledNudges` (`remind.service.ts`, 08:00 daily) sends the day-3, day-7 and day-14 style reminders by email.
  - It skips a person only when they turned email off, or their account was deactivated or deleted. **It does not check leave.**
  - It also sends the lead one email per check-in listing "who has not started", by name. Someone on leave would be on that list.
  - It also sends the Slack or Teams notice (`workspace.tell`, a count only).
- `checkAndSendConsecutiveAbsenceReminder`, in the same file, emails the person once they have missed 3 rounds in a row. **It does not check leave.** Someone away for three weekly rounds gets told they have "missed" three check-ins.
- `sendSessionReadyNotifications` (`grounds.cron.ts`, every 15 minutes) emails "Your next check-in is open", and WhatsApp when it is on, to everyone. **It does not check leave.**
- The reveal reminder in `sendRemindersInner` does not check leave either.
- The stall sweep (`warnBeforeTimeRunsOut` and `stallOverdueGrounds`, `grounds.cron.ts`) works on the whole check-in's deadline, not on a person. When a check-in stalls, it emails every participant, including anyone on leave. A round that waits on someone who is away (see below) makes that more likely.
- `autoCloseStaleCheckIns` closes a session only once it has been started, so it does not affect someone who never opened it.

**Does a missed round while away count against them?**
- **On the board: yes, in effect.** They are shown first, as "has not checked in for this round yet", with nothing to say they are away.
- **In the round count: yes.** `howManyHaveAnswered` waits on them. The lead reads "6 people haven't yet", and the round is not ready for its report until they answer or the clock ends it.
- **In the team report: probably yes, as a plain fact.** The report prompt describes who has not checked in. A person on leave reads as "did not check in", like Omar in the prototype, with nothing to say why.
- **In patterns and the judgement: mostly no, but because they read what was said, not because they know about leave.**
  - The 49 patterns are read from what people said in check-ins, so a silent round adds nothing.
  - `patternClockReached`, which would pause the three-period clock during leave, is not used by the pattern code.
  - The developer API's "how it has gone" counts released reports since a commitment was stated. Its comment says leave must not count, but it does not check leave (`grounds-by-api.service.ts`, about line 961).
  - I found no pattern or judgement line built from missed rounds.
- **In coaching: no.** Coaching is the one path that respects leave, and only if `leave_periods` were ever filled in.

#### (c) What is missing or wrong

1. **Groundwork does not know when someone is away.** An approved leave request does not reach the engine, by a test that forbids it. Nothing writes `leave_periods`. The HR connection has no leave field. What people say about being away is either dropped (context chat) or turned into a promise (Ask Groundwork).
2. **It keeps asking them.** Emails for "your next check-in is open", the day-3, 7 and 14 reminders and the "you have missed 3 check-ins" email all still go out. The lead's "who has not started" email names them.
3. **It shows them as missing.** On the lead's board they are listed first as "has not checked in", and they count in "6 people haven't yet". Their own sidebar and Today will say their turn is waiting or late.
4. **The rules that would fix this are already written and tested** (`participation-timeline.ts`), but only coaching uses them.
5. **There is nothing to say instead.** No sentence exists such as "Yemi is on leave until Friday 2 October, so this round does not wait for her." The prototype does not draw one either, so the wording needs a decision.

#### (d) What would happen to a real person if we deployed without it

Yemi's two weeks of annual leave are approved on the leave board. While she is on the beach:
- she gets an email that her next check-in is open;
- she then gets reminders on day 3, day 7 and day 14;
- after three weekly rounds, she gets an email saying she has missed three check-ins in a row.

Tunde gets an email naming her among the people who have not started. His board lists her first, as someone who has not checked in. His Today says the round is still waiting for her, and the team report says she did not check in.

Nobody decided any of this. The product approved her leave with one hand and chased her with the other. For someone on medical or parental leave, the same thing happens, and it is exactly what `participation-timeline.ts` warns "ends trust in a product permanently".

#### (e) Rating

**Missing.** The rules exist in one file and one path uses them, but nothing ever tells the engine that someone is away. Every reminder, the board, Today and the round count ignore leave.

#### (f) Rough estimate to reach the prototype

**About 5 to 7 days, after one decision from Hafsah.**
- When leave is approved, copy only the dates onto each of that person's `leave_periods`, from inside `suites/`, so no reason and no request leaves the suite.
- Make the day-3, 7 and 14 reminders, the "missed three" email, "your check-in is open", the lead's "who has not started" email, the round count, the board's "has not answered" row, Today, the sidebar and the report read `onLeaveAt`. They should say plainly that the person is away and until when.
- Keep the context chat's leave dates, and take leave said in Ask Groundwork or a check-in as a leave request, not a commitment.
- The decision for Hafsah: may the engine know the dates of someone's approved leave (dates only, never a reason), given that today's test says nothing outside the suites may read leave?

