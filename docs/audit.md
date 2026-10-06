# Groundwork prototype: the audit

Sep 25, 2026 · @Hafsah

## How the audit was done

Six steps, each with evidence. Nothing here is a guess.

1. **Every screen, as every person.** 146 screens, opened as all 7 people: Wairimu, Miriam, Grace, Amani, Daniel, Kwame and Groundwork staff. For each one it looked for crashes, buttons that do nothing, broken links, repeated page markers, unlabelled boxes, and words like “undefined”.
2. **Who can reach what.** Each person trying pages they should not see, and features that mix up whose data is whose.
3. **Data that disagrees.** Every person’s name, every date and every key number, compared across all screens.
4. **Wording.** Every screen checked for banned words, work jargon, and clipped lines joined with dots or arrows.
5. **The code.** How it is built, measured by counting: patches, repeated definitions, text swapped in while drawing, and names fixed into the code.
6. **Fit with the backend.** Every place the prototype assumes something the backend contract says is different or missing.

**What the audit found:** 141 issues. They are all below. The audit found no crashes, no broken links, and no buttons pointing at actions that do not exist, because the earlier tests had already caught those.

**How to read each row:**

- **Size:** **Big** means it breaks a promise or would cause real harm in the live product. **Medium** means it is wrong or confusing. **Small** means it is untidy.
- **Fix where:** **Here** means fix it in the prototype before Claude Code. **Real product** means it only makes sense to fix while building the real thing. **Backend** means the backend must change first.

**The ten to fix first,** before anything goes to Claude Code: A1, A2, A3, B1, B2, B7, B8, C1, C2 and F1. They are marked in the tables.

## Status after the fixes (25 September)

**Fixed in the prototype: 58.** A1 to A6, A8 to A15, A18 to A20, A22 to A26, A29, A30. B1, B7, B10 to B13. C1 to C3, C7 to C9, C11, C12. D1 to D9, D13, D14. E1, E4, E5, E7, E8, E11 to E13. F3. Each has its own test, and every earlier test still passes.

**Resolved by your two decisions: 8.** Exact words from check-ins can be shown, so A16, B2 to B6 and D11 are no longer problems. The “Share my words” switch has been removed, and the invitation now says plainly that people in the check-in see what you say. Reports and boards only update when something new comes in, never just because someone opened them. That settles G7, and the backend already works this way. Each report and board now says when it last updated.

**The audit was wrong about 4.** E10 and E18: the demo bar already had “Hide” and “Reset”. E17: the grey text passes the usual readability standard. A28: the walk-through’s failure was the test mistaking an example error message for a real one. C10 was partly wrong: the “teams under 20” wording is no longer in the code, but prices are still written into the page.

**New problems found while fixing, all fixed:**

- Pop-up windows sat under the Ask panel, so their buttons could not be pressed.
- Writing the plain wording into the code broke three places that searched for the old wording. A new hire’s setup showed the sales team’s conversation. All three now accept the new wording.
- A price range read “between 80,000 and KES 120,000”. Both numbers now carry the currency.

**Still open in the prototype: 29.** These are mostly the tidy-up, which is its own step before the package: A17, C5 and C6 (one source for people and numbers); D10 (what “check-in” means needs a decision); E2, E6, E9 and E15; F1, F2, F4, F5, F6, F8, F11, F12 and F15; G1 to G6 (the connection to the backend); and H1 to H4, H8 and H9.

**For the real product or the backend: 40,** unchanged. They go into the modules doc and the backend map.

## A. Bugs

| # | What is wrong | Where | Size | Fix where |
| --- | --- | --- | --- | --- |
| **A1** | **A question with commas is treated as a messy list.** “What changed, who is blocked, and what do I need to decide?” is sorted into to-dos instead of answered | Ask Groundwork | Big | Here |
| **A2** | **Leave ignores the day you ask for.** “Book me Monday off” still asks for Thursday 1 and Friday 2 October | Ask Groundwork | Big | Here |
| **A3** | **The person’s side is never shown to the manager.** Daniel adds his side, and the screen says his manager will see it, but Wairimu’s suggestion panel does not show it | You board, Daniel’s board | Big | Here |
| A4 | Everyone has “16 days left” of leave, whoever asks | Ask Groundwork | Medium | Here |
| A5 | Every team has “90,000 shillings left”, even people in Operations or Product | Ask Groundwork | Medium | Here |
| A6 | Only 9 customer names are recognised as claims. “The invoice was paid” gets an unrelated answer | Ask Groundwork | Medium | Here |
| A7 | Only Kariuki Butchery can ever be “proven by Paystack”. The proof check is one fixed name | Ask Groundwork | Medium | Real product |
| A8 | Emptying your head drops any claim that does not name a known customer, without saying so | Ask Groundwork | Medium | Here |
| A9 | “Start a handover” for anyone except Leila or Tom says “Started” but opens nothing | Ask Groundwork | Medium | Here |
| A10 | “What should I do today?” gives fixed text. It still says “decide the price-range question” after it has been decided | Ask Groundwork | Medium | Here |
| A11 | Changing the check-in time to 5pm is saved, but the end of the check-in still says “opens tomorrow at 4pm” | Check-in | Medium | Here |
| A12 | “Remind me at 2pm” hides the message but never reminds | Today (Miriam) | Medium | Here |
| A13 | Appeals have no place to be decided. The screen says Grace decides, but Grace has nowhere to see or answer them | You board, admin | Big | Here |
| A14 | A manager’s decision on a suggestion cannot be changed after saving | Suggestions | Medium | Here |
| A15 | The price-range decision in the report cannot be undone or changed | Team report | Small | Here |
| A16 | “Share my words” remembers a line by its position. If the lines change order, the wrong line is shared | End of check-in | Big | Here |
| A17 | The “decision nobody owns” always says “4 check-ins”, whatever happens | Open issues | Small | Here |
| A18 | “Decided on 12 September. That was two weeks ago”, but the demo’s today is 23 September, 11 days later | Open issues | Small | Here |
| A19 | Kwame shows “Overdue” in Wairimu’s sidebar with no explanation. It means her decision is overdue, not his check-in | Sidebar | Medium | Here |
| A20 | About 60 buttons in the drawn board and report pages do nothing, such as “+6 more in the inbox” and the week buttons on the quarter board | Views | Medium | Here |
| A21 | “Upload a plan” does not open a file picker; the plan just appears | Context | Small | Real product |
| A22 | Approving a week of hours does not show what is being approved | Time sheets | Medium | Here |
| A23 | A leave request made in chat appears on the leave board with no Approve or Decline | Leave suite | Medium | Here |
| A24 | “Add my side” can be saved empty | You board | Small | Here |
| A25 | “Name who decides” can be saved with an empty date | Open issues | Small | Here |
| A26 | The co-owner list is 5 fixed names, not the organisation’s people | People and setup | Medium | Here |
| A27 | The onboarding board only works for Faith. A second new person cannot have one | Onboarding suite | Medium | Real product |
| A28 | One step of the guided walk-through fails every time (the small-states page) | Tour | Small | Here |
| A29 | Ask Groundwork lets a lead choose an example check-in, so they can ask about a team that is not theirs | Ask Groundwork | Small | Here |
| A30 | The screen list repeats six pages, such as “Forgot password” and “Create an organisation” | Demo list | Small | Here |

## B. Privacy and who sees what

| # | What is wrong | Where | Size | Fix where |
| --- | --- | --- | --- | --- |
| **B1** | **Wairimu can read Miriam’s private questions to Ask Groundwork.** The history is saved for each check-in, not each person. Tested: Miriam asked something, Wairimu saw it | Ask Groundwork | Big | Here |
| **B2** | **Kwame’s board shows both Kwame’s and Wairimu’s exact words** under “Where you both see it differently”, with no sign either agreed | Kwame’s board, ending page | Big | Here |
| B3 | “Share my words” is saved for the whole check-in, not for one person. If Miriam turns it on for line 1, it is on for line 1 for everyone | End of check-in | Big | Here |
| B4 | Signals say “Miriam’s answer. She chose to share it”, but there is no way for her to choose. It is written in | Person page | Medium | Here |
| B5 | Daniel’s answer is quoted “He chose to share it”, again with no way to choose | Suggestions | Medium | Here |
| B6 | Several drawn pages quote people word for word, such as “Accounts side by side” and the sample reports | Views, building blocks | Medium | Here |
| **B7** | **“Ask about the whole organisation” tells Amani how many requests Wairimu has this week.** A person’s load is theirs unless they share it | Company page | Big | Here |
| **B8** | **Every privacy rule is decided in the browser.** 84 checks decide who sees what by hiding things. Anyone who opens the page’s data sees everything | The whole prototype | Big | Real product and backend |
| B9 | All people’s private things live in one saved state: private notes, sides, appeals, questions. Switching the person in the demo changes nothing about what is stored | The whole prototype | Medium | Real product |
| B10 | Every lead sees every person’s hours on the time sheets board, not only their own team’s | Time sheets | Medium | Here |
| B11 | Every lead sees every team’s to-dos and customers | To-dos, customers | Medium | Here |
| B12 | Daniel’s board says “Wairimu can see it from tomorrow”, but nothing makes that true. Wairimu has no view of it at all | You board | Small | Here |
| B13 | Any admin can tick a new person’s own to-dos, such as “Read the handbook”, as done for them | Onboarding suite | Small | Here |

## C. Data that disagrees with itself

| # | What is wrong | Where | Size | Fix where |
| --- | --- | --- | --- | --- |
| **C1** | **Amani’s surname is “Kariuki” on the Check-ins page, and “Njoroge” everywhere else** | Check-ins | Medium | Here |
| **C2** | **The sales forecast is 22 of 25 on the Check-ins page, and 23 of 25 everywhere else** | Check-ins | Medium | Here |
| C3 | The co-owner list names “Kamau Otieno”. Baridi’s operations lead is Kamau Njenga | People and setup | Small | Here |
| C4 | Every date is fixed text. The demo’s today is always Wednesday 23 September, whatever the real date | Everywhere | Medium | Real product |
| C5 | The same sales numbers (21 sold, 23 of 25, 27 if a range counts) are typed in dozens of places instead of coming from one place. One change means editing them all | Board, reports, Ask | Medium | Here |
| C6 | People are defined in at least five separate lists (the people list, levels, the You board, suggestions, and the drawn pages). This is what caused C1 and C3 | Code | Medium | Here |
| C7 | The setup chat calls it “a 6-person sales team”, but Baridi’s sales team has more people on the People page | Setup, People | Small | Here |
| C8 | Under “Examples” in Baridi’s sidebar sit a law firm and a ministry. They look like part of Baridi | Sidebar | Medium | Here |
| C9 | Money is written in three ways: “KES 240K”, “240,000 shillings” and “KES 18M” | Everywhere | Small | Here |
| C10 | The prototype’s plans and free offer (“3 months free, teams under 20”, seat prices) do not match the backend’s (10 free check-ins, 5 people including you, prices in the database) | Billing, pricing | Big | Here |
| C11 | “Leads see their team’s boards”, but the boards show the whole company, not the lead’s team | Suites | Medium | Here |
| C12 | The Kwame board says his last session is done, while the sidebar still says it is overdue | Kwame’s check-in | Small | Here |

## D. Wording

| # | What is wrong | Where | Size | Fix where |
| --- | --- | --- | --- | --- |
| D1 | **124 lines are still joined with dots** instead of written as sentences, such as “186 said · 154 met” and “Company board · Baridi Appliances · strategy v2 · sample data” | Boards, Company, Context | Medium | Here |
| D2 | Banned words still used: “tracked”, “measured” and “self-assessed” | Operations board, Context, founder’s board | Medium | Here |
| D3 | Four arrows remain, such as “Buying in December → Buying in January” | My record | Small | Here |
| D4 | Work jargon on the example boards: “claims”, “escalations”, “verified”, “workstream”, “pipeline” | Example boards | Medium | Here |
| D5 | “Usage unreported; ‘done’ undefined” reads like a software error | Engineering board view | Small | Here |
| D6 | Sidebar names are cut off: “Kwame, first 9…”, “Sales team, …” | Sidebar | Medium | Here |
| D7 | The badges “Overdue” and “Your turn” do not say what for | Sidebar | Medium | Here |
| D8 | The drawn pages still use a lot of the older, clipped wording. Only part of it was rewritten | Views | Medium | Here |
| D9 | About 240 plain sentences exist only on screen. The code still holds the old wording, which is swapped as the page draws | Code | Big | Here |
| D10 | “Check-in” means three things: the whole thing (a team’s check-in), one session (today’s check-in), and a tab. People will mix them up | Everywhere | Medium | Here |
| D11 | “Share my words” (one line) and “Share without names” (the whole report) sound alike but do different things | Check-in, report | Medium | Here |
| D12 | Everything is in English only. Your markets use Swahili, Hausa, Yoruba, Pidgin and French | Everywhere | Medium | Real product |
| D13 | The situations switchboard still uses the backend’s code names, such as NEW\_HIRE and PIP, next to the plain names | Switchboard | Small | Here |
| D14 | “Back on track” is the name of Daniel’s check-in. It sits oddly with the rule against the word “track”, and hints at a verdict | Daniel’s check-in | Small | Here |

## E. How it feels to use, and accessibility

| # | What is wrong | Where | Size | Fix where |
| --- | --- | --- | --- | --- |
| E1 | The Views menu opens drawings that look like pages but are pictures. People will click and nothing happens | Views | Medium | Here |
| E2 | There are several ways to reach the same thing: the Company page and the “Kijani” company pages, the board and its drawn versions. It is not clear which is real | Company, Views | Medium | Here |
| E3 | Most confirmations are a small message that disappears after a few seconds. There is nowhere to see what you just did | Everywhere | Medium | Real product |
| E4 | Most decisions have no undo: the report question, suggestions, plan proposals and ticking a suite item | Everywhere | Medium | Here |
| E5 | Some windows close without saying anything when a box is left empty, instead of saying what is missing | Several windows | Small | Here |
| E6 | Ask Groundwork’s answers are sometimes long paragraphs on a phone, with the buttons below the fold | Ask on a phone | Small | Here |
| E7 | The open-issue path (unclear, understood, options…) shows where an issue is, but not what to do to move it on | Open issues | Small | Here |
| E8 | Groundwork’s own message on Today looks like any other panel. It is easy to miss that Groundwork wrote it | Today | Small | Here |
| E9 | A new person’s check-in and their onboarding board are two places to look. Nothing brings them together for the new person themself | Onboarding | Small | Here |
| E10 | The demo’s dark bar and persona switcher sit over the top of every page and push content down on small screens | Demo bar | Small | Here |
| E11 | Nine text boxes have no label, so screen readers cannot say what they are for: on the guide, setup, tools, WhatsApp, billing, password and people pages | Several pages | Medium | Here |
| E12 | Many things in the drawn pages look clickable but cannot be reached with a keyboard | Views | Medium | Here |
| E13 | Some states are shown by colour alone, such as the steps on the open-issue path and some tags | Open issues, tags | Small | Here |
| E14 | After a window closes, the keyboard focus does not return to the button that opened it | Windows | Small | Real product |
| E15 | The switchboard uses sideways text for its 30 section names, which is hard to read | Switchboard | Small | Here |
| E16 | Short messages that appear and disappear are not announced to screen readers | Everywhere | Small | Real product |
| E17 | Some grey text is light against the page, especially small notes | Everywhere | Small | Here |
| E18 | There is no clear way to start again with fresh sample data, except through the demo bar | Demo | Small | Here |

## F. How the code is built

The prototype is 3,216 lines of code in 57 files, plus the drawings. It was built fast, and each new file patches the ones before it. That was right for trying ideas quickly, but it is the main thing to clean before handing over.

| # | What is wrong | Numbers | Size | Fix where |
| --- | --- | --- | --- | --- |
| **F1** | **Layers of patches.** Each file wraps the one before. The page router is wrapped 72 times, the tidy-up step 32 times, the board 23 times, Ask’s answers 6 times | 57 files | Big | Here |
| F2 | 24 actions are defined more than once. The last one silently wins, so an earlier fix can be undone without anyone noticing | 24 | Medium | Here |
| F3 | About 240 wording rewrites are applied as each page draws, instead of written into the code (same as D9) | 240 | Big | Here |
| F4 | 20 places decide where to add something by searching the page’s text. Change a heading’s wording and the feature disappears | 20 | Medium | Here |
| F5 | 44 places name a specific check-in, such as “sales” or “kwame”, and 57 name “baridi”. The features only work for the sample data | 101 | Big | Here |
| F6 | 36 places change behaviour based on which demo person is chosen, instead of on the person’s real role and access | 36 | Medium | Here |
| F7 | 91 places write raw HTML. Once real people’s words flow in, a missed safety step could let someone insert harmful code | 91 | Big | Real product |
| F8 | 26 timers are used to make things happen in the right order. This breaks easily on slower phones | 26 | Medium | Here |
| F9 | One global state object with 89 parts, saved 210 times, holds every person’s data together | 89 | Medium | Real product |
| F10 | Everything is in one 4 MB file, including all the drawings as text. It is slow to load on a phone connection | 4 MB | Medium | Real product |
| F11 | Every name is shared across all 57 files. One clash (a name used twice) already stopped the whole demo from loading once | 1 so far | Medium | Here |
| F12 | Sample answers are written into the logic, such as Ask’s replies naming Grace and Kamau | Many | Medium | Here |
| F13 | Understanding what people type is done by matching fixed phrases. It is fine for a demo, but the real engine must do it | Ask | Medium | Real product |
| F14 | The same pieces of screen, such as a row, a table or a panel, are written out again and again instead of once | Many | Small | Real product |
| F15 | Page addresses are not checked. A mistyped check-in address shows “gone” instead of “not found” | Router | Small | Here |
| F16 | The tests reach inside the prototype’s own workings, so they cannot be pointed at the real product without being rewritten | 17 test files | Medium | Real product |

## G. Where the prototype will not fit the backend

Each of these comes from the backend contract. “Here” means the prototype should change to fit the backend. “Backend” means the backend must change to fit the prototype.

| # | The prototype | The backend | Size | Fix where |
| --- | --- | --- | --- | --- |
| G1 | Check-ins have short names such as “sales” | Check-ins are “grounds”, each with a long unique code | Medium | Here |
| G2 | Reports hold people’s names | Reports are stored without names (“the initiator”, “Participant A”). Names are added only for people allowed to see them | Big | Here |
| G3 | The check-in is a fixed script | The engine leads the conversation, and replies arrive a few words at a time | Big | Here |
| G4 | There is no layer for talking to a server | Every answer comes wrapped, with the useful part inside “data”, and a missing part means “not for you” | Big | Here |
| G5 | Roles: owner, admin, can open check-ins, takes part | Roles: admin, lead, member, plus a setting for who may open check-ins. “Owner” is one field | Medium | Here |
| G6 | Access to a check-in: runs it, takes part, can read | Three levels: their own, the shared picture, and the lead’s | Medium | Here |
| G7 | A report looks finished when it appears | A report builds up as people answer. The screen must say how complete it is | Big | Here |
| G8 | Quick-reply buttons under each question | The engine returns only its reply | Medium | Backend |
| G9 | “Share my words” on each line | Words are never shared. Only a whole report can be named or anonymous | Big | Backend |
| G10 | Four marks: proven, confirmed, someone’s word, memory | How specific a line is, whether it is memory, and which document backs it. No “confirmed by the receiver” | Medium | Both |
| G11 | Ask Groundwork belongs to one check-in, and does things after a yes | An organisation-wide assistant with 20 abilities | Big | Backend |
| G12 | Decisions with a reason, on any check-in | Only an agreed outcome at the end | Medium | Backend |
| G13 | Check-ins linked to each other | Only noticed from the text, not linked as records | Medium | Backend |
| G14 | Ten suites | None for customers. Spending and to-dos exist only in Groundwork’s own back office | Big | Backend |
| G15 | Suggestions from verdicts, and appeals | No verdict engine in this backend | Big | Backend |
| G16 | One Company page | Organisation goals, boards and scans, but no single page | Medium | Backend |
| G17 | The You board | The pieces exist, but not as one read | Medium | Backend |
| G18 | Paystack numbers, live | Numbers arrive by import or from a document only | Medium | Backend |
| G19 | Team chat in WhatsApp, Slack or Teams | Web and email only. No Slack. WhatsApp waits for Meta | Big | Backend |
| G20 | 25 situations | 17. Eight are missing | Medium | Backend |
| G21 | The switchboard’s 30 sections | The backend’s board has its own sections. Nobody has matched them one to one | Medium | Both |
| G22 | Onboarding is a to-do board | Onboarding is “learn, then answer questions”, per role, and not switched on | Medium | Both |
| G23 | Levels and reporting lines on every person | Only on people imported from another system | Medium | Backend |
| G24 | Joining by email domain, and your own web address and logo | Neither exists | Medium | Backend |
| G25 | Switching between organisations freely | Joining a second organisation makes you a guest there | Medium | Both |
| G26 | Groundwork writes first on WhatsApp when something needs you | Needs Meta-approved templates, and Meta’s 24-hour rule applies | Big | Backend |
| G27 | Changing settings and starting processes by chat | The assistant has no abilities for settings or processes | Medium | Backend |
| G28 | The screens cannot tell which features are switched on | Several features can be switched off on the server, and some change what a report contains | Medium | Backend |

## H. Demo leftovers and gaps in the tests

| # | What is wrong | Size | Fix where |
| --- | --- | --- | --- |
| H1 | The persona switcher, the “Go to” list and the dark bar are mixed into the product code, not kept apart | Medium | Here |
| H2 | The board scenario switcher and the “Day one” and “Report shared” switches change real screens | Small | Here |
| H3 | Sample organisations (Baridi, Kijani, the law firm, the ministry) are woven into the logic, not loaded as sample data | Big | Here |
| H4 | The drawn pages are shipped inside the prototype as large blocks of text | Medium | Here |
| H5 | Paying, uploading files and connecting WhatsApp are pretend, with no sign they are pretend | Small | Real product |
| H6 | No test checks what the engine writes. Only the screens are tested | Big | Real product |
| H7 | No test checks privacy from the outside, as someone who opens the page’s data would | Big | Real product |
| H8 | Tests only use the sample data, so they would pass even if the features only work for Baridi | Medium | Here |
| H9 | The phone check only looks at whether pages scroll sideways, not whether text is too small or buttons too close | Small | Here |
| H10 | Nothing tests the prototype on a slow connection, which matters for a 4 MB file in your markets | Medium | Real product |

## The order to fix everything

**Total: 141 issues.** 101 are “Here”, fixed in the prototype before Claude Code. The other 40 are for the real product or the backend, and go into the modules doc and the backend map.

**Step 1. The ten first,** because they break a promise or will mislead Claude Code:

1. **B1** Ask history shared between people.
2. **B2** Kwame’s and Wairimu’s exact words shown.
3. **B7** Wairimu’s load shown to Amani.
4. **A1** Questions with commas treated as a list.
5. **A2** Leave ignoring the day asked for.
6. **A3** The person’s side never reaching the manager.
7. **B8** A note in the code, on every privacy check, that the backend must enforce it.
8. **C1** and **C2** The wrong surname and the wrong forecast on the Check-ins page.
9. **F1** Merge the patch layers, as part of the tidy-up before the package.

**Step 2. Write the wording into the code** (D9 and F3). Then fix the remaining wording: D1 to D8, D10, D11, D13 and D14.

**Step 3. One source for people and numbers** (C5 and C6), which removes a whole class of bugs, then the other data issues.

**Step 4. The remaining bugs and privacy issues** in sections A and B.

**Step 5. The tidy-up** in sections F and H: take out names fixed in the code, persona checks, text-matching, timers and repeated actions, and separate the demo parts from the product.

**Step 6. Add every “Backend” and “Real product” item** to the backend map and the modules doc, so Claude Code sees them as work to do.

**After the fixes,** run the full audit again. It is saved as a script, so it can be run in the same way each time.
