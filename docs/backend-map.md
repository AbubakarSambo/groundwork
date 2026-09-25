# Groundwork: the backend map

Sep 25, 2026 · @Hafsah

## The short version

The contract describes the live Groundwork code on the branch called “product-only”. It is large and careful: 165 kinds of record, 558 routes, 31 scheduled jobs, and one very long set of rules for the conversation engine.

**The good news.** The backend already does most of what the prototype shows, and it keeps the same promises, often more strictly:

- Nobody can read another person’s exact words. Not an admin, not a lead, not even Groundwork’s own staff.
- Reports are stored without names. Names are only added back for people who are allowed to see them.
- A pattern only appears after 3 periods, the same rule as the prototype.
- Every line in the record says how it is known: how specific it is, whether it is from memory, and whether a document backs it.
- Handover, organisation memory, the staff handbook, onboarding, patterns and boards all exist.

**The surprise.** This backend is the check-in and report system. It does **not** contain the modules in the structure document: no leave, no verdict engine, no team chat, no time sheets, and no “You board”. Section 2 explains what that means.

**Other things to know straight away:**

- The AI model is **Google Gemini**, not Claude. The code calls that part “Anthropic”, but it only talks to Gemini.
- Only **two channels** reach people today: the web and email. WhatsApp is built, but Meta has not approved the message templates, so Groundwork cannot send the first message.
- **Paystack, M-Pesa, Slack, SMS, CRMs and calendars do not exist** in this code. Numbers from other systems arrive only by importing them, or from a document.

## The big finding: two different systems

The structure document and this contract describe two different systems.

|  | The structure document says | This contract (branch “product-only”) says |
| --- | --- | --- |
| The main object | A person, with their board, standing and verdict | A “ground”: one check-in, with its people, sessions, record, report and board |
| Leave | A leave module: ask, a stand-in, approval | **Not there.** No leave records at all |
| Verdicts | A verdict engine: keep, reward, support, plan, exit, by “worst true thing wins” | **Not there.** The engine’s rules forbid the word “verdict”. The board never gives a person a position or rating |
| Team chat | The front door: channels, with the coach inside | **Not there.** No channels, no Slack |
| A person’s own page | “MyStanding” on the You board | **Not there.** A person gets their own record and their own report |
| Commitments kept, as a percentage | The main number the verdict reads | Commitments are recorded, but no percentage and no thresholds |
| Role interview and role map | Built | **Not there** |

**Groundwork’s own back office** (the part at “/ops”, 129 routes, not for customers) does have to-dos, spending, commitments, goals, people, resources and a sales pipeline with payments. That looks like Groundwork running itself, which the structure document calls “prove it on our own organisation”. But it still has no leave, verdicts or team chat.

**What this probably means:** the structure document’s system lives somewhere else. That could be another branch of the same code, another code base, or a plan partly built elsewhere.

**Why it matters:** under our plan, every one of these gets built into the current product. If some of it already exists in another branch or code base, we can reuse it instead of building it twice. So it is worth finding out where the structure document’s system lives.

## Feature by feature

**Ready** means the backend does it and it is in use. **Partly** means some of it works. **Missing** means it is not there. **Built, not on** means the code exists but is switched off.

**Signing in and organisations**

| Prototype feature | Backend | Notes |
| --- | --- | --- |
| Sign up with an email link, or Google | Ready | Two steps: the organisation is only created after the email is confirmed |
| Several organisations, switching between them | Partly | Works, but joining a second organisation makes you a guest there |
| Invite link, and joining by email domain | Partly | Links and QR codes work. Joining by email domain is missing |
| Guests from another organisation, one check-in only | Ready | Outsiders wait for approval before they count as a seat |
| Roles: owner, admin, can open check-ins, takes part | Partly | Admin, lead and member exist. “Owner” is one field, not a role. “Who may open check-ins” is a setting: named leads, or everyone |
| Access given for one check-in | Ready | Three levels: your own, the shared report, and the lead’s |
| Your own web address and logo | Missing |  |

**Starting and running a check-in**

| Prototype feature | Backend | Notes |
| --- | --- | --- |
| Start from a plain description, with a suggested situation | Ready | 17 situations, including new hire, performance plan, handover, recognition and board strategy |
| The check-in conversation on the web | Ready | Streamed as it is written |
| The check-in on WhatsApp | Built, not on | Meta has not approved the message templates |
| Proof against someone’s word, photos and documents | Ready | Every line records how specific it is, whether it is from memory, and which document backs it |
| The four marks: proven, confirmed, word, memory | Partly | The backend knows these things, but not as four marks. The front end must translate |
| Context: purpose, rules to confirm, documents | Ready | Includes the lead’s context chat |
| Private notes a lead keeps | Ready | Never used as evidence. People have their own private notes too |
| Ending a check-in with an outcome | Ready | Closed, resolved, stalled or paused, with the outcome and feedback |
| Handover when someone leaves | Ready | Including what the person leaving knew |

**Reports and boards**

| Prototype feature | Backend | Notes |
| --- | --- | --- |
| Team report, own report, weekly report | Ready | The report updates when someone finishes a check-in, and an hourly check catches up any report that is behind. Opening it never rebuilds it. This already matches the decision |
| Sharing: hold it, share it, share without names | Ready |  |
| “Share my words”, for each person | Missing | Words are never shared today. By decision, words from check-ins can be shown to the people in that check-in, with no switch. The backend must allow this |
| The board | Ready | Differences, dependencies, who has answered, contribution, patterns, decisions, coverage |
| Patterns after 3 periods | Ready | 49 kinds of pattern. Positive ones show straight away |
| “Help nobody mentioned” | Ready | Called “hidden contributors” on the board |
| Decisions with a reason | Partly | An agreed outcome can be recorded, but there is no general “decision with a reason” |
| Links between check-ins | Partly | The board notices one check-in waiting on another team, from the text. Check-ins are not linked as records |
| The Company page, across teams | Partly | Every board, organisation goals and organisation-wide scans exist, but there is no single company page |
| Numbers from other systems | Partly | A number keeps its source. But numbers arrive by import or from a document, never pulled live |

**Everything else in the prototype**

| Prototype feature | Backend | Notes |
| --- | --- | --- |
| Ask Groundwork | Partly | An organisation-wide assistant exists, with 20 things it can do. It is not tied to one check-in |
| Ask making changes after a yes | Partly | Depends on what those 20 things are |
| Organisation memory, learnings, the handbook | Ready | Including who may change the handbook |
| Onboarding | Built, not on | Onboarding steps per role exist but are not in use |
| Reviews | Partly | A daily job tells managers about reviews coming up. No review page |
| Leave, time sheets, spending, equipment, role map | Missing | Spending and to-dos exist only in Groundwork’s own back office |
| The You board | Missing | People get their own record and their own report |
| Suggestions from a verdict | Missing | See section 2 |
| Team chat in WhatsApp, Slack or Teams | Missing |  |
| Developer keys and embedding | Ready | Access is asked for, not bought |
| Billing | Ready | Stripe only. A free run of 3 months on Growth, 10 free check-ins, 5 people including you |

## Where they disagree

These need a decision, because either the prototype or the backend has to change.

| # | The prototype | The backend | My suggestion |
| --- | --- | --- | --- |
| 1 | People can choose to share their exact words with the team, one line at a time | Exact words are never shared, with anyone | **Change the backend.** Decided on 25 September: words from check-ins can be shown to the people in that check-in. The prototype’s switch has been removed |
| 2 | Verdicts told like signals: the manager gets a suggestion with reasons | The engine is told never to give a verdict. The board never ranks anyone | **This is a new feature to build,** not a change. It needs the verdict engine from the structure document, which is not in this backend |
| 3 | Four marks: proven, confirmed by the person who received it, someone’s word, memory only | Three levels of how specific a line is, plus “from memory” and “backed by a document” | **Translate in the front end.** A document means proven. Memory means memory only. The rest means someone’s word. “Confirmed by the person who received it” needs one new field |
| 4 | Roles: owner, admin, can open check-ins, takes part | Admin, lead, member, plus “who may open check-ins” as a setting | **Match the backend.** The words on screen can stay the same |
| 5 | Ask Groundwork belongs to one check-in | The assistant covers the whole organisation | **Keep both.** The screen picks a check-in; the backend answers with the whole organisation in view |
| 6 | Numbers from Paystack and other systems arrive live | Numbers are imported, or read from documents | **Import first.** A live Paystack link can come later |
| 7 | Check-ins on WhatsApp, and team chat | Web and email only, until Meta approves the templates | **Get the templates approved now.** It takes weeks and blocks everything on WhatsApp |
| 8 | A report looks finished when it appears | A report builds up as people answer | **Keep the backend’s way.** It only updates a report when something new comes in, which is what was decided on 25 September. The screen should say when it last updated |

## What the new front end must know

From the contract’s own list, in plain words. The people building the front end should read these first.

1. **Everything is built around one thing: a “ground”, which is one check-in.** Its people, sessions, answers, record, report and board all belong to it. Almost every address starts with /grounds/.
2. **Every answer comes wrapped.** The useful part is always inside a field called “data”.
3. **The check-in conversation arrives as a stream,** a few words at a time, not as one reply.
4. **A report is never finished.** It is rebuilt as people answer, and every hour. The screen must always show how complete it is.
5. **Reports are stored without names.** People appear as “the initiator” or “Participant A”. Names are added back only for people allowed to see them. The screen must never show those labels as if they were names.
6. **Nobody except the person can read their own words.** No screen should suggest anyone else can.
7. **The backend gives less, not an error.** A lead asking for something private gets a smaller answer. A missing field means “not for you”, not “still loading”.
8. **Prices, seat limits and free limits live in the database.** Never write them into the screens.
9. **Three numbers matter:** 3 periods before a pattern shows; 10 free check-ins; 5 people on the free plan, including the person who signed up.
10. **Several features can be switched on or off** on the server, and the screens cannot tell which. Some change what a report contains. The backend team should add one read that tells the front end which are on.

**The current front end** is React, in the same code, in a folder called client. The new front end should follow the same tools unless there is a strong reason not to.

## The plan

The prototype is the gold standard. We get there in three stages:

1. **Bring the backend up to the prototype.** Every backend change the prototype needs is made in the current product first, without losing anything on the “must keep” list.
2. **Connect the prototype to that backend.** The prototype stops using its sample data and reads and writes through the real backend. At the same time, its code is tidied: the layers are merged into one clean file per page, the plain wording is written into the pages, and the demo parts (persona switcher, sample data, dev bar) are taken out. A pretend backend built from the contract comes first, so pages can switch over before the real changes are finished.
3. **Copy the prototype into the product,** as its front end. It replaces the current screens. The current product’s Stripe checkout and anything else it does well stay connected. Then all the prototype’s tests run against the live product.

**For each part of the prototype, stage 1 works through six steps:** what the prototype does; what the current product already has; what to change in the backend; what the screens will need; what must be kept; and how we test it.

**The order.** First the parts where the current product is closest, so the gap closes quickly and nothing breaks on the way. Then the parts that are partly built. Then the parts that are missing.

| # | Part | How close the current product is |
| --- | --- | --- |
| 1 | The check-in | Close |
| 2 | Reports and sharing | Close |
| 3 | The board | Close |
| 4 | People, roles and access | Close |
| 5 | Billing and plans | Close |
| 6 | Starting a check-in, and Context | Close |
| 7 | Ask Groundwork | Partly built |
| 8 | Decisions, links between check-ins, the Company page | Partly built |
| 9 | Numbers from other systems | Partly built |
| 10 | Onboarding, handover, organisation memory | Partly built |
| 11 | The You board, and suggestions from verdicts | Missing |
| 12 | Suites: leave, time sheets, spending, reviews and the rest | Missing |
| 13 | Team chat in WhatsApp, Slack or Teams | Missing |

## What must be kept from the current product

The prototype must not lose any of these. Each part below checks against this list.

| What | Why it matters |
| --- | --- |
| **Stripe billing** | Prices and seat limits in the database, the three-month free run, pausing and resuming, retrying failed payments |
| **Email through Resend** | Every email the product sends today |
| **Reports stored without names** | A stored report cannot leak a name, whoever reads it |
| **Only the person can open their own questions to Ask Groundwork, and their own report** | Not an admin, a lead, or Groundwork’s own staff |
| **Leads never see how a person’s answers were rated** | No grade on a person arrives through the back door |
| **Reports that only update when something new comes in** | And say how complete they are |
| **The engine’s care with evidence** | The exact passage quoted from a document, lines marked as memory, lead notes never used as evidence |
| **49 kinds of pattern** | Including positive ones, and 3 periods even when not in a row |
| **Handover** | Including what the person leaving knew |
| **Organisation memory** | Proposals to confirm, and who may change the handbook |
| **17 kinds of check-in** | All 17 are also in the prototype, which adds 8 more. The backend must add those 8, and keep its own 17 |
| **The developer API, embedding, and staff directory sync** | For customers who connect their own systems |
| **WhatsApp on a company’s own number** | Once Meta approves the templates |
| **Asking afterwards whether the outcome was right** | So the engine learns |

## Part 1: The check-in

**Step 1. What the prototype does.** A person opens their check-in on the web or WhatsApp. It shows how much time is left and closes at a set time. Then:

- **It opens with good news when there is some,** then asks about what they said last time: “Yesterday you said Green Mart wanted a quote. What happened?”
- **One question at a time, in full plain sentences,** with quick-reply buttons under each question.
- **They can add a photo or document at any point,** and it counts as proof.
- **They can pause:** “Ask me later”, or “Skip today, with nothing held against me”.
- **It tells them when the other side has answered, or not yet,** with a button to send a reminder.
- **It ends with three things:** what is now in their record (each line marked proven, their word, or memory), why answering matters, and what happens next.
- They can finish, or change something.
- **A “Done” page** gives them their own report and one thing for tomorrow.

**Step 2. What the current product already has.**

| The prototype | The current product |
| --- | --- |
| Asking about what they said last time | Yes. The engine carries what they are owed, their commitments and what they said before into each turn |
| One question at a time, never a fixed script | Yes. Each turn is built from what is still missing, and it asks about anything at most twice |
| Replies appearing as they are written | Yes, streamed |
| Photos and documents as proof | Yes. It reads images and PDFs, and quotes the exact passage that backs each line |
| Changing something | Yes, and more: a person can dispute any line taken from them, correct an earlier session, and add a clarification |
| Skipping a session | Yes, a person can decline |
| Opening and closing times | Yes. Each session has an opening time and a warning before it closes |
| Their own report after the session | Yes, only they can open it |
| Good news first | Partly. The engine has positive patterns and a block that opens with something they do not already have. To check in the code |
| “The other side has answered” | Partly. The engine has a block about what sits between people. To check in the code |
| Quick-reply buttons | **No.** The engine returns only its reply |
| Each line marked proven, word or memory | Partly. Every line knows how specific it is, whether it is from memory, and which document backs it. It is not shown as marks yet |
| “Share my words” for each line | **No.** Words are never shared |
| The three things at the end | **No.** That is new wording |
| WhatsApp | Built, but waiting for Meta to approve the templates |

**Step 3. What to change in the backend.**

1. **Quick replies.** After each reply, the engine also suggests two to four short answers the person might give. They arrive with the reply.
2. **People’s own words in the shared report. By decision, what people say in check-ins can be shown word for word to the people in that check-in. There is no switch**.
3. **The marks.** The end-of-session summary returns, for each line, one mark: proven (a document backs it), confirmed (the person who received the work confirmed it), their word, or memory. “Confirmed” needs one new field.
4. **Plain wording in the engine’s own rules.** The engine’s rules already ban some words. Add the prototype’s wording rules: full sentences, no clipped phrases, no work jargon, and self-explaining examples. Then check its replies against the scenario test document.
5. **“Nothing held against me”.** Check that declining a session never counts towards a pattern or a signal.

**Step 4. What to change in the screens.** Change the current check-in page to match the prototype:

- The header, with the time left and a Pause menu.
- Quick-reply buttons under each question.
- The + button for photos and documents.
- The end card with its three parts, and the marks.
- The Done page, with their own report and one thing for tomorrow.

Use the prototype’s wording exactly.

**Step 5. What must be kept.**

- Streaming.
- Disputing a line, correcting an earlier session, and clarifications.
- The engine’s evidence rules: the quoted passage, memory lines, and asking at most twice.
- Only the person can open their own questions to Ask Groundwork, and their own report.
- Declining a session.

**Step 6. How we test it.**

- **The prototype’s check-in tests,** rewritten to run against the real product. A person answers, adds a photo, pauses, finishes, and shares one line.
- **Privacy:** a lead and an admin both try to open another person’s words. Both must fail.
- **The engine’s wording:** run the sales team scenario from the test document and check each reply against the plain-wording rules.

**To check in the code before building:** what the engine’s “between” and “open with something they do not already have” blocks do, and the exact shape of the end-of-session report.
