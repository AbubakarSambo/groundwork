# The first experience: from sign-up to the first useful board and report

Hafsah, 30 October 2026: the first experience for a lead or an admin must score 8.5 out of 10 for "a normal person who has no patience, hates AI speak, and wants to move their organisation to success". She rates it 4 today. Nobody may be below 7.5.

## How it is measured

- The real product, on the round 16 bed, through a visible Chrome window, one person at a time. Some leads use it at phone width (390px), the rest at desktop width.
- Each person is played by the real model in character. They are impatient, hate AI speak and want results. They read only what each screen shows and press what they would press. Each writes their own description of what they are trying to achieve, fresh every round.
- The goal they are given:
  - **A lead:** sign up, say what they are trying to achieve, answer setup, add the team with phone numbers, and get to their board.
  - **An admin:** sign up, add the people with their phone numbers, get the first check-in going, and see what the admin sees.
  - **Then:** two of their team open the invitation and do their first check-in. The lead comes back to the board, the report and Ask.
- At the end each rates it from 1 to 10 in their own voice, with every problem tied to the screen and the words on it.
- The harness is in `api/journey/loop/first-experience.ts`. It is local and not committed. Every screen, screenshot and rating is in `~/Desktop/first-experience/round-N/`.
- **The scale.** These people are told to be impatient and to hate AI speak. In round 1 they scored the product near 2 where Hafsah scored it 4, so their scale runs lower than hers. The instructions stay the same in every round, so the rounds compare with each other. The target stays 8.5 on their scale, so their 8.5 is a higher bar than Hafsah's.

## Round 1 (30 and 31 October): average 1.75, lowest 1

| Who | Kind of organisation | Role | Width | Score | In their words |
|---|---|---|---|---|---|
| Aisha Abdi | Sales team (water filters) | Lead | Desktop | 2 | "This thing wasted my time with a long, chatty setup that felt like a robot trying to be my friend. Then, when I finally got to the board, it was just a wall of text and jargon." |
| Akinyi Okonjo | Small law firm | Lead | Phone | 1 | "It fights me on every simple task, asks me stupid questions, and uses irritating jargon instead of just doing the job." |
| Ngozi Okoro | Three family clinics | Admin | Desktop | 2 | "It asks the same questions over and over, uses ridiculous jargon, and makes simple tasks like adding my team incredibly difficult." |
| Akua Mensah | Farmer-training programme | Lead | Phone | 2 | "It can't count my team, it lies about what it just said, and it wastes my time with slow screens and chatbot nonsense." |
| Kato Mugisha | Startup (school-fees app) | Lead | Desktop | 3 | "It's a slow, robotic conversation when it should be a simple form." |
| Achieng Omondi | Family business (two shops, transport) | Admin | Phone | 2 | "It's slow, confusing, and full of nonsense words. Then it broke completely and I couldn't do anything." |
| Zawadi Mchunga | Mobile cinema on a truck (the wild one) | Lead | Phone | 1 | "It's like trying to give instructions to a slow, stupid machine that thinks it's a consultant." |
| Aisha Mutesi | Girls' education charity | Lead | Desktop | 1 | "It is slow, confusing, and full of pointless jargon. It feels like I am fighting a stupid machine to do my job. It wasted my time and gave me incorrect information." |

Across the first seven: 24 complaints that it felt like AI, 23 confusing moments, 19 places they would give up, 15 slow moments, 12 annoyances and 10 pointless steps.

### Why it scores low: the patterns, by root cause, worst first

1. **Setup interrogates the lead instead of helping them think.** Every lead (7 of 7) said this.
   - Evidence:
     - The law firm's lead was asked for the fee-note backlog and her plan to clear it, which she expected the tool to help her make. She was then asked what "specifically" she wanted three times.
     - "Anything else I should know?" came twice after a clear "No".
     - The sales lead was asked her part after saying she manages the team.
   - Cause: the setup addendum audited the lead's own plans like a delivery check-in. It carried evidence gates for preparation and delivery, influence methods, authorship, rollout friction, network claims, motion against progress and third-party assessments, each with a sentence to say word for word. This sat on top of the engine rules, which already ask for proof in every check-in.
   - Fix: done. The audit sections are removed, and the addendum is half its length. One section now says what setup is for: what success looks like, what is really in the way, what they need from each person, how they will know it is slipping, and what they would do then. It also says how to sound. Setup ends when they say they are done.
   - Expected gain: the largest single one, about +1.5.
2. **The model reads quoted sentences back, and fills the gaps with chatbot words.**
   - Evidence:
     - Filler: "Got it", "Thanks.", "That sounds like a clear goal.", "My apologies…".
     - "Watching how it lands" from the prompt's example, and a "migration" asked of a trucking company.
     - "Stop telling me about tabs."
     - A garbled question with a helper line attached to the wrong question.
   - Cause: setup's instructions quoted the words to say, as the copied phrase did last week. The engine's acknowledgement rule quotes "Got it" and scripts praise lines.
   - Fix:
     - Done: the quoted lines in setup's instructions are now plain intent (eight lines). Hafsah's approved wording of 14 October for the who-else question stays, now asked on its own.
     - Not yet: the engine rules' "acknowledge before probe" hard rule and its scripted praise lines. These shape every check-in, so changing them needs a scorer run.
   - Expected gain: +1.
3. **The first board is the old light board, a wall of meta text.**
   - Evidence: the sales lead met "None of the 38 sessions is done yet", "The quick read", "How much was said… It is all from memory" and "Groundwork does not keep this yet", and found no pipeline.
   - Cause: the pictured sales board was drawn only once a deal was on record. Other kinds without a picture fall through to the light board.
   - Fix:
     - Done for a sales team: the pictured board shows from the first day.
     - Not yet for the other kinds. Drawing the general pictured board for them hid the coaching, contribution and coverage parts the old board carries, so it needs its own design.
   - Expected gain: +0.5 to +1.
4. **Adding a team is slow: people, numbers and roles one at a time.** Four of seven raised it.
   - Evidence: "I should be able to paste a list of names and numbers." Setting roles one by one. Names typed in the chat did not fill "Who's in it" ("0 of 4 set").
   - Fix:
     - Done: the invite box takes one person on each line, with name, email and phone number, and saves each number.
     - Not yet: names and numbers given in the setup conversation should fill "Who's in it" on the save card with their numbers.
   - Expected gain: +0.5.
5. **Screens contradict themselves and explain the product.**
   - Evidence:
     - "No check-in open right now" beside "Your next check-in is open".
     - "3 of 3 people have checked in" against "3 of 5".
     - "You have not checked in" after they had.
     - The long paragraph about what an admin can see, before anything else.
     - "3 need something before they can start."
     - Consultant report headings: "What we heard", "What we noticed", "Why it matters".
   - Fix:
     - Done: the next check-in, the session number and the reasons a person cannot start each come from one source. The admin paragraph is off Today. The report uses the prototype's headings. The two "Do it" buttons say what they do.
     - Being done: one count of who answered, for the check-in page, the board and Ask.
   - Expected gain: +1.
6. **Waiting.**
   - Evidence: "Getting your first question ready. This can take a minute or two." It was stuck for the family admin until nothing worked. Also "Still reading what you wrote".
   - Fix:
     - Done: the lines are short and make no excuses.
     - Not yet: the lead's own check-in right after setup is slow to open. It is a model call, and on one run it never opened.
   - Expected gain: +0.5.
7. **Ask gives wrong answers.**
   - Evidence: "all three people have checked in" with five on the team. "I did not find the number 'three'."
   - Cause: Ask counts on its own. Being fixed with pattern 5.


## Round 2 (31 October, 02:50 to 07:00): average 1.9, lowest 1

Fresh people for each kind. This round ran on the first fixes:
- setup no longer audits the lead;
- a team is invited with names, emails and phone numbers in one go;
- a new sales team sees the pictured board;
- the screens' jargon, waiting lines and contradictions are fixed;
- one count of who answered.

It did not yet have the fixes made during it.

| Kind | Role | Score | In their words |
|---|---|---|---|
| Sales team | Lead | 1 | "Asks me the same thing four times, and then shows me a useless report of my own words." |
| Law firm | Lead | 2 | "It took a simple problem, made it complicated, created a fake disagreement with my staff." |
| Clinic group | Admin | 3 | "The one good thing was the final report, which was surprisingly clear, but getting to it was too painful." |
| Field programme | Lead | 2 | "It got the number of people in my team wrong on every screen." |
| Startup | Lead | 2 | "Gets stuck in loops, and makes me enter the same information three times." |
| Family business | Admin | 2 | "It told me I agreed to things I never did." |
| Mobile cinema | Lead | 1 | "Reading useless reports that sound like a consultant telling me what I already know." |
| Charity | Lead | 2 | "It can't even answer a simple question about my own data." |

**What round 2 found, and the fixes made during it** (in round 3):
- **"What makes this the right time" asked four times.** The setup gate waited for a why-now the extraction would not accept. Why now no longer holds the gate, and the instructions ask it once.
- **"Thanks", "No problem".** The setup conversation's own no-apology rule now covers all filler.
- **The situation's name changed every turn.** It is now classified once.
- **"Created a fake disagreement".** A plan and one person's part in it were reported as a difference. The report now defines a difference as two accounts of the same fact that cannot both be true.
- **"The numbers are wrong".** "2 of 3" was said beside "Two more people are not counted". The second sentence now says "Two more were invited and have not joined yet."
- **The same people entered three times.** People named in the conversation with their address are added in one press, with the phone number typed beside their name.
- **A closer described a screen that is not there.** The wrap-up instructions no longer describe screens.
- **A number refused on an invite looked like lost data.** The row now says why.

**Found and not fixed yet:**
- **An untrue line about a team member's words.** Asked what would show a plan was done, Juma answered "A rollout schedule agreed with Aisha". The report then wrote "Juma also said that a rollout schedule was agreed with Aisha", as if it had happened.
- **Ask could not answer questions about the lead's own data.** It answered with "I cannot answer that one yet. Here is what I can do with…".
- **The first report repeats the lead's own words** ("What you told us"). Two leads called it pointless; one called it clear.
- **The lead's own check-in after setup is still slow to open.**
- **Empty sections on a new board** ("What keeps coming up", "Where this is heading") read as consultant talk.

**The engine's acknowledgement in check-ins is left as it is.** Hafsah's conversation standard keeps a short "Thank you" in its right-hand example, so the no-thanks rule stays in setup only.


## Round 3 (31 October, 07:10 to 10:20): average 1.1, lowest 1

This round ran on every fix up to round 2's: why now asked once, no filler in setup, the situation read once, a difference only where accounts conflict, and plainer counts.

Scores: sales 1, law firm 1, clinic group 1, field programme 1, startup 2, family business 1, mobile cinema 1, charity 1.

**What makes people give up, counted per round (rounds 1, 2 and 3):**
- **Adding the team:** 4, 15, 18. The startup's founder named his four people with their numbers in the conversation, then entered them three more times: on People, on the save card and in People and setup.
- **Setup stalling:** 4, 6, 9. "Saving…" and "Loading…" stayed on screen, the team step was out of sight below the report, and leaving setup halfway lost it.
- **The first board, report and Ask:** 5, 13, 16.
- **Being asked again:** 3, 3, 6.
- **The numbers:** 3, 3, 5.

The wording fixes did not move the score. Hafsah's call (31 October): adding the team is the top pattern for round 4, judged by how fast a lead gets the whole team in, with phone numbers, without repeating themselves.

**The harness, again:** the model invents the same phone numbers every round. A number someone on the bed already has is rightly refused, which read as lost data. Each run's numbers are unique from round 4.

## The plan to 8.5

1. **Round 2** on the fixes above, with fresh people for every kind of organisation and the harness's memory fix: each person now remembers everything they typed. In round 1 one admin accused Groundwork of inventing a roof she had typed twice.
2. **After round 2, in order of what it shows:**
   - setup's names and numbers into "Who's in it";
   - the engine's acknowledgement rule;
   - the general pictured board for every kind;
   - the slow opening of the lead's own check-in.
3. **Rounds until** the average is 8.5 and nobody is below 7.5, or usage runs low.

## Harness problems found and fixed in round 1 (not the product)

- Disabled buttons were hidden from the model, so it reported "no Send button".
- A button named the same as another (the two "Do it" buttons) was pressed by name and sent the lead to the wrong page.
- Invitations link to `/set-password`, which the harness did not open.
- Each person's description came out as a profile of them, not what they would type. Fixed for round 2.
- Each person remembered only their last eight screens.
- The bed's clock (February 2027) is beside today's real date on some screens ("Saturday 31 October"). Round 2 runs at the real date.
