<!--
This is docs/decisions.md with Hafsah's missing decisions added.
docs/decisions.md is a protected file, so this is written alongside it for Hafsah to put in place.
Decisions 1 to 16 were exactly as they are in docs/decisions.md. On 29 September Hafsah had decisions 4, 5, 6, 9, 12, 17, 21 and 27 clarified here, where the old and new decisions disagreed; each clarification says so. Decisions 17 onward are added.
Her own list's items 1 to 16 are all already in 1 to 16 here (her 1 is here as 1 and 2; her 3 and 4 are here as 4).
-->
# Decisions already made

These are settled. Do not change them. If one seems to block the work, stop and ask Hafsah.

1. **The prototype is the gold standard.** The current product is brought up to it, without losing anything valuable it already does.
2. **Plain words everywhere.** Full sentences that people with basic English understand. No clipped or "Yoda-like" phrasing, no jargon. Explain with context and examples that explain themselves.
3. **Nobody is special because of their title.** Access comes from a person's role in the organisation plus their access to each check-in.
4. **What people say in check-ins can be shown word for word** to the people in that check-in. There is no "Share my words" switch. Still private: questions to Ask Groundwork, each person's own report, a lead's private notes, a lead's private description of a person (decision 30), and each person's load across check-ins unless they share it. *One exception, clarified 29 September: in an evaluation check-in (decision 17), colleagues' exact words go only to the manager. The person being reviewed sees the facts, and the decision with its reasons.*
5. **Admins** see every board and report, including what people said in them. They never see anyone's questions to Ask Groundwork, anyone's own report, or a lead's private notes, and never a performance plan unless given access to that check-in. *Clarified 29 September: nor a lead's private description of a person (decision 30), which only the person who runs the check-in reads.*
6. **A verdict, told like a signal.** The engine may reach a verdict (keep, reward, support, plan, exit). *Clarified 29 September: the check-ins where a verdict is reached are the evaluation check-ins of decision 17, and keep, reward, support, plan and exit are the possible verdicts.* People never see it as a label. The manager sees a suggestion, with why, what would change it, and the person's own answer, and decides, giving a reason. The person sees the facts and the decision with its reasons, and can add their side or appeal. An admin decides appeals. Good suggestions work the same way.
7. **Reports and boards update only when something new comes in:** a check-in, a document, a number from another system, or a decision. Opening them never rebuilds them. Both are built from the record; the board also shows the latest report's story, so nothing is lost between reports.
8. **Patterns show only after three periods,** whether or not they are in a row.
9. **Starting in a new job is kept apart from work.** Onboarding problems never count against a new person. *Clarified 29 September: this is about starting in a new job. "Setup" means setting up a check-in (decision 28).*
10. **Hours on time sheets are for billing only,** never evidence about how well someone works.
11. **No scores and no ranking** of people, teams or counties. Differences always come with a reason.
12. **Requests are said back and confirmed before anything happens.** Claims about work are checked like a check-in answer: systems first, then proof, and until then they are the person's word, followed up in the next check-in. *Clarified 29 September: "the person's word" here means a claim not yet checked. It is not the same as "people's own words" in decision 18, which means the text they wrote.*
13. **The engine pushes, but never decides.** It tells the person first. It can be told "not now". It writes first on its own at most once a day.
14. **Team chat is a connection, not a suite and not a new chat app.** Groundwork joins the chat a team already uses. Nothing private is posted in a group.
15. **Citizens or service users are never asked anything.** Their experience reaches Groundwork through the people doing the work and through the service's own numbers.
16. **The suites are furniture.** The comparison of accounts, and what the proof says, always come first on screen.
17. **In evaluation check-ins, colleagues who give views are not named to the person being reviewed.** This covers a performance plan, a promotion and a renewal. With one such colleague, they are "a colleague". With two or more, they are "one colleague", "another colleague" and "a third colleague". A later mention of the same person makes clear it is the same person, for example "the same colleague". Never a job title or detail that would give them away. *Clarified 29 September: the person being reviewed sees the facts, and the decision with its reasons, not colleagues' exact words. Those go only to the manager. The check-ins where a verdict is reached (decision 6) are the evaluation check-ins.*
18. **People's own words are never changed to improve a score.** Only what Groundwork itself writes gets fixed.
19. **Pattern names.** The internal names stay as they are. Each of the 49 patterns gets a plain name for screens, written in `docs/pattern-names.md` for Hafsah to approve.
20. **The 50 scenario packs.** They are copied into files. Improved versions are written, switched off, with a before-and-after document. Hafsah switches them on after reading.
21. **The free trial.**
    - Teams of fewer than 20 people get 3 months free. Teams of 20 or more pay. There are no free check-ins. *Clarified 29 September: that is true once the trial setting is switched on. While it is off, which is the case today, billing works as it does today, including the free first session.*
    - Prices and limits live in the database, never in screens.
    - The sentence about the trial stays off until billing really gives the trial.
    - The published prices are: Starter, $25 a month for up to 5 people. Small Team, $90 a month for up to 20. Growth, $400 a month for up to 100. Business, $900 a month for up to 250. Scale, $1,650 a month for up to 500.
    - While the trial setting is off, billing works exactly as it does today. Switching it on starts the trial, and removes the free first session and the free plan together.
    - Organisations that are free today keep what they have until Hafsah decides.
22. **Naming the organisation at sign-up works like a Slack workspace.** The name is suggested from the email domain, and the person can change it. Later sign-ups from the same domain are offered to join it. This never happens for public email providers.
23. **Signing up is by an email link, or by a password if the person prefers.** A password is optional.
24. **Sign-in wording.**
    - Say "Email", not "Work email".
    - Passwords follow the prototype's rules: at least 8 characters, with a number or a symbol, and not the person's email address. Existing passwords keep working.
    - The reset link "lasts an hour".
    - An expired sign-up link says "your new link is on its way".
    - Never say "anything you'd started is saved" or "nothing was created or changed".
    - Never show the email address on the reset page.
25. **There is no guided tour.** A new organisation's Today page shows a welcome card and a checklist.
26. **Security.** An older password-reset link stops working as soon as a newer one is sent. Sign-in and sign-up never reveal whether an email address has an account.
27. **Who sees colleagues.** A member sees colleagues' names, roles and teams. *Clarified 29 September: "role" means the person's role in the organisation, as in decision 3, never the sentence a lead typed about them, which decision 30 keeps private.* A guest from another organisation sees only the people in their own check-in. Nobody sees anything more.
28. **The setup is not the lead's first check-in** (decided 15 September). The lead always does a first check-in.
29. **Check-ins are named by their topic, in plain words.** Never by the person, and never by a type name. The name is the subject of the invitation email.
30. **A lead's private description of a person never reaches that person or anyone else.** Not in any label, board, session, invitation or message.
31. **The engine may know the dates of someone's approved leave.** Dates only, and never a reason.
32. **A lead's private notes about a person never reach the model in that person's own session.** They are left out of what that session is given, not kept back by an instruction to the model.
33. **Decided later, when that work starts:** whether the person who runs a check-in counts as a person's lead for approvals, and the thresholds for verdicts.
34. **A question the lead wants asked of a person may reach that person's session.** Before it goes, the lead sees the exact question as Groundwork will ask it, and confirms it, as decision 12 says.
35. **Bank and card numbers a person types into a check-in message or the setup chat are hidden too.** The same code as for documents hides them, before anything is stored and before any model call. Where a quote shows the message, it says a number was hidden. This is protection, not changing someone's words.
36. **Members who use Ask Groundwork may appear on their organisation's list of people.** A guest from another organisation is never added to the list. If a guest uses Ask Groundwork, it works only within their own check-in.
37. **Deploy soon with what works, then improve the product every week.**
38. **Leads and admins are never sent how anyone's answers were rated** (decided 28 September). Ratings may be used inside the engine to build reports, but they are never served to any reader. A person may still see the read of their own answers, as the Done page shows it ("This is about the check-in. Only you see it.").
39. **A lead sees a person's pattern only after the person has had the chance to answer it first** (approved 28 September). The lead sees it three days after the person was first shown it, if they have not answered. If the person never opened a page that shows it, the lead sees it seven days after it reached three periods. When the lead sees a pattern the person has not answered, it says plainly that they have not answered yet.
40. **The rating of how specific and checkable a person's answers are in a check-in is needed** (Hafsah's correction, 28 September). It rates the answers, not the person or their work, so decision 11 (no scores of people) does not cover it. The lead's board shows it as the prototype does, "Nothing checkable", with what to ask next. This is the one exception to decision 38 so far: the other per-person ratings in a report are still never sent to the lead or an admin.
41. **Jargon that is the person's own word, used back to them, does not count as jargon** (decided 28 September). Groundwork must never bring in jargon nobody used.
42. **Until Hafsah decides from the list in the morning report, decision 38 stays as it is:** the per-person ratings in a report are not sent to the lead or an admin, with the one exception in decision 40.
43. **Decision 38 stays, and the prototype decides the form** (decided 28 September). The lead and admins never get a rating as a rating. They get only the prototype's plain forms: the sentence in the weekly report, the pattern once it keeps coming up, one level for how much the whole report can rely on, the mark on each line, the suggestion with its counts, and "Nothing checkable" beside the name. The person's own score goes only to them.
44. **The step that words reports ahead of time runs once for each new thing, never several times** (decided 29 September). It was running up to 9 times for the reports and 18 times for the board after one session, which multiplied model calls and hit the model's limits. It is fixed and proved on a short run before other work.
45. **The goodbye's commitment is saved as a commitment, in full sentences** (decided 29 September). The step that reads a check-in into the record saves the commitment the closing reply states as a commitment, written as a full sentence. It is checked with two re-runs of the scenarios it affects, and kept only if nothing drops.
46. **The lead says plainly when a target is a decision about a person** (decided 29 September). There is a field for it, set by the lead. It is never inferred from the target's wording. Such a target is the lead's alone.
47. **An admin is never told "nothing here needs you this week" when there are things they cannot see** (decided 29 September). In that case they read "Nothing you have access to needs you this week."
48. **A goal the lead has not told the person about stays hidden from that person, and it does not count** (decided 29 September). It is not used in that person's report, or in any judgement about them, until the lead shares it. *Replaced later the same day by decision 56.*
49. **Week 10, the first suggestion to a manager:** decided later the same day, in decision 53. The person sees the suggestion first, and the manager gets a plain line with no count behind it.
50. **There is no separate context chat. Ask Groundwork is the one chat for everything** (decided 29 September). Nothing the context chat does today may be lost. Everything it does is listed first in `docs/context-chat-inventory.md`, then moved into Ask Groundwork with the same rules:
    - what is pulled out is said back and confirmed before it is saved;
    - a target set for one person stays hidden from everyone else;
    - a document private to the lead stays private;
    - only the people who can add context today can add it through Ask Groundwork;
    - questions someone asks Ask Groundwork stay private, as always.

    Each item is proven by putting the same documents and messages through both and comparing what is saved. The old context chat keeps working until every item is proven, and only then is it switched off.
51. **The Context tab and page are called "Context and resources"** (decided 29 September), because documents are there too.
52. **The plain pattern names are approved** (decided 29 September). They are the names in `docs/pattern-names.md`, with B5 as written there (the code's meaning), and these eight reworded:
    - B3: "Others describe doing work they described as theirs"
    - B8: "When delivery is questioned, the answer points elsewhere"
    - B11: "Problems are mostly put down to things outside the team"
    - E1: "Holds equity, and the record shows little delivered recently"
    - E3: "Present for the big moments, less so for the day-to-day work"
    - E5: "Asks for more than the record shows being given back"
    - F3: "Check-ins have become less specific while equity continues to vest"
    - F4: "Well regarded, and their areas haven't moved faster"

    E4 and F5 are never shown to either person. The names go in the one place the screens read, and patterns are switched on, with every rule kept: three periods (decision 8), the person first (decision 39), no internal names, and no colleague seeing another person's pattern.
53. **The provisional decisions of 29 September are confirmed** (the 29 items under "Decided for Hafsah to confirm" in the morning report), with these changes:
    - **If the lead has left the organisation, an admin can share the report,** and people are told who shared it. (This changes item 6.)
    - **An admin who cannot see a target reads only "has checked in".** "Nothing here needs you this week" is never said when it is not true. (This changes item 11, and goes with decision 47.)
    - **A decision about a person is a field the lead sets when the target is made,** never guessed from the wording. (This changes item 4, and is decision 46.)
    - **Week 10 is built the more private way:** the person sees the suggestion first, and the manager gets a plain line with no count behind it. (This changes item 28, and answers decision 49.)
    - **The model in a person's own check-in is no longer given a goal the lead has not told them about** (item 27's "recommended next"), checked by re-running the scenarios it affects. *Replaced later the same day by decision 56: the model is given the goal, but never states its number or target.*
54. **Existing check-ins are not reopened by a migration** (decided 29 September). The data change is taken out of `20260923200000_reopen_every_check_in_that_ran_out_of_time`. The new rule applies from now on, and a lead can reopen a check-in themselves.
55. **Patterns, role behaviour, coaching strategies and the probe structure are protected** (decided 29 September). They are the most powerful part of the product. They are never switched off, hidden, simplified or removed to solve a problem.
    - If one breaks a rule, it is fixed in place.
    - If it cannot be fixed quickly, it is narrowed to the most private view, for example only the person it is about, rather than switched off, and Hafsah is told in the report.
    - Every place where any of them has been switched off, hidden, simplified or removed so far is listed in the report, and each is restored, fixed properly.
    - They also learn: what happens after each pattern, coaching strategy and probe is recorded, and used to improve them over time. Learning never changes people's own words and never breaks a privacy rule. Any change to how patterns are judged is proven on the scenario runs before it is adopted, and big changes go to Hafsah first.
56. **A goal the lead has not told the person about follows the prototype** (decided 29 September). This replaces items 25 and 27 of the list confirmed in decision 53, and decision 48.
    1. The lead sees the goal marked "Not told yet", flagged as needing their attention, and is nudged to tell the person.
    2. The model in the person's own check-in is given the goal, so it can ask about that work (the prototype's "Their check-in asks:"). It never states the number or the target until the lead has told them.
    3. An untold goal still counts. Wherever it counts against the person, in a judgement, a board line or a suggestion, the lead is also shown it as a conversation point: this person has not been told about this goal yet, so talk it through with them.
    4. If the lead has not told them after a week, the person is told plainly that their lead has set a goal about this work and will talk it through with them, and the lead is reminded.

    It is checked by re-running the scenarios it affects, and live, that the person is never told the number before the lead has told them.
57. **How patterns, coaching and probes work from now on** (decided 29 September, after reading how they work today). Built after the answers already sent. Patterns and coaching stay switched on.
    1. **A period is at least a week.** For a weekly check-in, each session is a period. For a daily check-in, each week is a period. The three-period rule counts periods, not sessions, everywhere, including in later check-ins.
    2. **After talking a pattern through, the lead marks it "right", "wrong" or "not sure".** The person's answer counts as evidence too. Both are stored with the pattern.
    3. **After a pattern reaches the lead, they are nudged once to have the conversation,** and can mark "we talked about it". Later check-ins record whether things changed.
    4. **The number-based rules are a second source of evidence** wherever they exist, alongside the model's reading. The scenario runs check that the same scenario gives the same patterns each time, and report how steady they are.
    5. **When a person's role is guessed with low confidence,** Groundwork asks them or the lead to confirm it before using it.
    6. **Coaching is on by default on every database,** including new ones.
    7. **The "setup never said" reading is restored,** so it can show under the period rule.
    8. **A pattern not yet confirmed may shape a sharper question in later check-ins,** never named, counting periods the same way as everywhere else.
    9. **Self-learning** (in `docs/weekly-plan.md`, early): three signals for every pattern, coaching step and probe — was it right, did the conversation happen, did things change — give more weight to what works and flag what is often wrong. People's words are never changed, privacy rules never bend, changes are proven on the scenario runs first, and big ones go to Hafsah.
58. **An admin who does not run a check-in is never sent anyone's pattern, or the person's answer to it** (decided 30 September, screens request 84), unless they have been given access to that check-in, the same as a performance plan (decision 5). Only the person it is about and the check-in's lead receive them. Enforced on the server, with a test that serves every board and report as that admin.
59. **Patterns may stay switched on in the work branches, for testing** (decided 30 September). Hafsah decides about switching them on at release, after reading the explanation of how patterns, role behaviour, coaching and probes work.
60. **The six disagreements found on 29 September are settled as proposed** (decided 30 September).
    1. An admin who cannot see a target reads "has checked in" beside the person's name (decision 53). Decision 47's sentence, "Nothing you have access to needs you this week.", is used only where a page sums up the whole check-in for that admin.
    2. A suggestion carries no count for the manager (decision 53 over decision 43).
    3. Week 10 cannot reach a suggestion unless a threshold is set (decision 61 sets the first one).
    4. In an evaluation check-in, an admin without access to that check-in does not read colleagues' exact words, following decision 58. An admin with access reads them as the manager does.
    5. The goodbye's commitment is checked with two re-runs, as decision 45 says, because the record reader is a model step.
    6. Decision 42 is out of date; decision 43 settled it.
61. **The first threshold for week 10** (decided 30 September). Extra support is suggested when a person has kept fewer than half of their commitments, with at least 6 commitments settled, kept or not. Keep, reward, a plan and exit stay empty until each has its own reading of the record, built and tested. On the admin page, "over periods" is called "at least this many settled commitments".
62. **Patterns that already exist at release start the person-first process on release day** (decided 30 September). The person is shown theirs first, and the lead sees it only after the usual 3 or 7 days. Migration `20260928090000_the_person_sees_their_pattern_first` is changed to do exactly that, and the release questions say so.
63. **Only the lead confirms setup changes and questions for people** (decided 30 September), unless the lead has left the organisation. Then an admin can, and the people on the check-in are told who did it. The same rule applies on the old context chat and in Ask Groundwork.
64. **"How the leading is landing": the part about setup shows to the lead without the three-period rule** (decided 30 September). It is about the lead's own setup, not a pattern about a person. It is restored properly.
65. **Ask Groundwork opened from inside a check-in knows which check-in it is** (decided 30 September). The screen tells it, so a setup conversation starts without the lead having to say the word "context". The screens workspace is told exactly what to send.
66. **A shared note on the Context and resources tab lifts the "nobody can be invited yet" block** (decided 30 September), the same as a private note, an expectation, a document or a long enough brief. The refusal's sentence stays as it is.
67. **"How what people say can run ahead of what happened" (screens request 82)** (decided 30 September). The section uses these patterns only: D1, D2, D3, D5, D8, B1, B2, B3 and E2. The manager (the lead) sees them framed as what to coach the person on. For every pattern the lead sees, in this section and every other, the lead reads:
    - its plain name and one sentence about what happened;
    - what to coach the person towards: the good behaviour, in one sentence, from the pattern and the person's role map;
    - one small, concrete step the person could take, in the same style as Groundwork's coaching steps;
    - the pattern's own question to open the conversation.

    It never reads as a verdict or a score, and nothing is decided from it. Every pattern rule still holds: only after three periods, the person sees their own first and can answer, and the lead sees the person's answer beside it. No participant or colleague ever sees another person's pattern; for them the section shows nothing about named people. A test serves the section as the lead, the person, a colleague and an admin who does not run the check-in.
68. **Pattern steadiness is measured on what people are actually shown** (decided 30 September). Scenarios run long enough for patterns to reach three periods (at least six sessions each), twice, and the patterns each person would be shown are compared between the two runs. The aim is that the same person is shown the same patterns at least 8 times in 10. Neighbouring patterns are not merged, and no pattern is weakened or removed to get there. If it falls short, the report says which patterns are least steady and why, with a fix suggested for those ones.
69. **Each target says whether it is an aim to reach or a limit not to go over** (decided 1 October, on the spending-limit fix). In Hafsah's words: "Instead of guessing, give each target a direction field, set when the target is made: an aim to reach, or a limit not to go over, as the prototype's targets carry a direction. The words in the name can suggest it, and the lead confirms it. Existing targets with no direction keep today's word-based guess until the lead sets one."
    1. The field is `direction` on each target, `AIM` or `LIMIT`. Empty means nobody has set it.
    2. Where a target is made, the say-back states which way each number goes, suggested from the words of its name, and the lead's yes confirms it. Where the lead has not confirmed it, nothing is stored, so the guess stays a guess.
    3. The board uses the lead's direction where there is one. Where there is none, it reads the words of the name as before, except that "under" counts as a limit word only before a number, so "Pumps sold under the new scheme" is read as an aim.
    4. The lead sets or changes it later through the board's own target update.
70. **The resolution panel shows nothing until a decision is near** (decided 1 October, request 99). In Hafsah's words: "The resolution panel shows nothing until a decision is near, as the prototype does, so change the test that expects 'Resolution. Not set yet.' to match." The old report's single line ("Resolution. Not set yet.") is not brought back.
71. **The old-version notice stays** (decided 1 October, request 99). In Hafsah's words: "Keep the old-version notice." A person reading a report that has been changed since they opened it is told that what is on screen is an older version. The rebuilt session report has to carry it, as the old report body did.
72. **Rewriting a check-in's brief follows the same rule as other setup changes** (decided 1 October). In Hafsah's words: "Rewriting a check-in's brief follows the same rule as other setup changes. Only the lead can, unless the lead has left the organisation; then an admin can, and people are told who did it."
    1. The server refuses anybody but the lead, with the same message as decision 63, unless the lead's account shows they have left the organisation; then an admin of that organisation may rewrite it.
    2. When an admin rewrote it because the lead has left, everybody on the check-in, participants included, is told who did it in one plain sentence, for example "Otieno Kamau changed what this check-in is for because Wanjiru Mwangi has left the organisation." The check-in read serves it as `briefChangedByAnAdmin`.
    3. A rewrite by the lead names nobody to participants, as before.
73. **The weekly report, for each reader** (decided 1 October, Hafsah's answers to 20, 21 and 22 of the morning report).
    1. As built: whoever runs the check-in reads the whole week; a person in it reads their own parts and the team's counts, never a colleague's sentence, number, pattern or commitment; an admin who only reads gets the lead's view without the lead's list, the aims and limits, or any pattern (decision 58). One change, in Hafsah's words: "what a participant sees of aims and limits follows the check-in's 'who sees targets' setting, the same as the board. With THEIR_OWN, only the counts; with EVERYBODY, the aims and limits too."
    2. A participant's "for next week" is their own open commitments from this week.
    3. The week's facts are kept in the existing weekly report column, without a migration, "as long as every earlier weekly report stays readable and a new one never overwrites an old one." Each week is its own row; building a new week never changes an earlier one; an earlier week is read by the date of its Monday (`GET /grounds/:id/report/week?week=2026-09-21`), and a week kept in the earlier form (only the sentences about each person) still reads.
    4. When the prototype's opening line comparing people is built later, it must never rank people against each other (decision 11): it may say what happened across the team, never who did best or worst.
74. **The seven deploy risks** (decided 1 October, night, on `docs/deploy.md`).
    1. **Backup:** stays a release question for whoever runs the hosting. A backup is taken before release.
    2. **Patterns are never switched off.** If steadiness is not at least 8 in 10 by release, patterns reach only the person themselves, with their answer box, and not the lead, until they are. Built as a setting, and the report says which way it is set.
    3. **Coaching is on when there is no row.** That is correct, and stays.
    4. **`NODE_ENV`:** stays a release question.
    5. **The word-for-word script** gets a safe way to run on a hosted database, only with an explicit confirmation given by whoever runs the release. It is never run on anything but this Mac by the engine work.
    6. **A start never overwrites a prompt somebody activated by hand.** It only adds new versions. Tested.
    7. **The first night:** no "time running out" email for anything that reached that point before release; only check-ins reaching it after release get one. The per-organisation model calls are spread out. Nightly jobs run once even if two copies of the API run. Tested.
    Joining this branch with the live main line stays a release step, and `docs/ready-to-deploy.md` is brought in line with all of this.
75. **The 49 items decided for Hafsah to confirm, 1 to 2 October** (decided 2 October). Yes to all 49 as written in the morning report, except these:
    - **Item 2.** The admin asked to approve an evaluation check-in gets access to that check-in, so they can see what they are approving.
    - **Item 5.** The lead sees only their own team's steps of a blocker, but always sees which team it is waiting on and since when.
    - **Item 13.** The lead's setup brief is never quoted into a participant's check-in. It may guide the conversation as context, like the organisation's rules.
    - **Item 14.** In a check-in where people do not see each other, one person's circumstances never reach another.
    - **Item 17.** All five target kinds from the prototype are built: Up, Lower is better, Rate, Deadline and Zero.
    - **Item 24.** An undecided suggestion keeps its original facts, but if the person recovers before anyone decides, it is clearly marked that they have recovered since.
    - **Item 25.** A probation or first-90-days check-in is an evaluation check-in, so a verdict can be reached there, as the prototype shows for Kwame.
    - **Item 29.** When the lead says a company rule during setup, Groundwork offers once to keep it for the whole organisation.
    - **Item 33.** The Movement tile says "changed", not "moved".
    - **Items 35, 36 and 45.** No new setup questions for now.
    - **Item 37.** A participant's own aim shows on the board as their own aim, not as a number the lead set.
    - **Item 42.** E2, B2, K3 and B11 are judged once across all their periods, not period by period. Then steadiness is measured again.
    - **Item 46.** A participant's one-line summary is narrowed to their own waits.
    - **Item 48.** The ending labels are changed to plain words, on both panels.
    - **Item 49.** The work record stays visible to the person reviewed.
76. **Requests 109 and 111, Hafsah's answers** (decided 2 October).
    1. **The checkability rating stays, as decisions 40 and 43 allow.** Request 111 removed ratings from what readers are sent; anything that is the rating of how specific and checkable a person's answers are goes back, in the prototype's form, for exactly the readers decisions 40 and 43 allow: the person's own "How checkable today's check-in was" (for example "4 of 5", with who, what, when, proof and next) to the person alone, and "Nothing checkable" beside the name, with what to ask next, to the lead and admins, never as a number. Scores of a person's contribution or performance stay removed. Tested.
    2. **Item 51:** yes. **Item 53:** yes.
    3. **Item 52:** yes for a restated aim (the team's one aim). But a record added on the board with nobody's name becomes somebody's deal only once the lead confirms it, because a claim is checked first.
    4. **Item 54:** build the more private option: each session's team picture is released on its own, with the change to what is stored, so a participant never reads a later session's picture before it is released.
77. **A person an admin has not let in yet is not counted** (decided 2 October, item 64). In Hafsah's words: "A person an admin hasn't let in yet is left out of both the 'N of M have answered' count and the count that decides when a session closes. They are shown separately as waiting to be let in." Tested.
78. **Billing: a one-month trial, and WhatsApp as a paid add-on** (decided 2 October).
    1. **The free trial is one month**, still for teams under 20 people. Its length is a database setting (`pricing.freeTrial`, which already holds the months), set to one month. It stays switched off until Hafsah switches it on.
    2. **WhatsApp is a paid add-on**, charged monthly once the free trial ends, at about 80% of the organisation's plan price: Starter +$20, Small Team +$72, Growth +$320, Business +$720, Scale +$1,320. The add-on prices (or the 80% figure) are stored in the database, never in code or on screens.
    3. **WhatsApp use is limited per plan**, with the limit in the database. A proposed monthly limit for each plan is written under "Decided for Hafsah to confirm" and used until she answers.
    4. **Stripe in test mode only.** Nothing about real billing changes until the trial setting is switched on.
79. **The new order of the engine work** (decided 2 October, replacing the order of 1 October): (1) the company-wide picture (request 17), as the prototype's Company page shows it, with the screens workspace told exactly what it will receive; (2) WhatsApp billing, decision 78; (3) everything the boards for all eleven kinds of work still need from the engine, requests 110, 112 and 113; (4) then the rest of the list as before, the back office last. When the screens workspace stops, this workspace continues its board work from `docs/screens-handover.md`, merging `wip/prototype-ui` first.
80. **The Company page, Hafsah's answers** (decided 2 October). **Item 66:** kept as built; participants see the priorities and their owners on the Company page. **Item 67:** "What new people keep asking" stays unbuilt, because it would draw on private Ask Groundwork questions; linked organisations come later. **Item 68:** no exception to decision 73; strategy history goes on the weekly plan for later.
81. **The release is set by the first client's use** (decided 2 October). The client will use Groundwork for: WhatsApp check-ins for their sales team, company planning, onboarding, leave and finance requests, performance management, and project checking and updates, plus Ask Groundwork to help the team find their way around. The order of the work, replacing decision 79's:
    1. WhatsApp end to end: receiving and sending check-ins and Ask Groundwork over WhatsApp, for these kinds of check-in, with what works, what is missing, and what can only be tested once hosted.
    2. Leave and finance requests through chat, including over WhatsApp: said back and confirmed before anything happens, approved by the line manager or an admin.
    3. Performance management: judging, suggestions and appeals on evaluation check-ins, including probation, working end to end.
    4. Request 117 and what the four needed boards still need from the engine: sales, onboarding, performance and project.
    5. The company-wide picture's live check.
    6. WhatsApp billing, if not done.
    7. The existing back office stays for Groundwork's staff only, unchanged; its usage numbers are checked after this work and anything broken is fixed. Its rebuild comes last.
    The other seven boards and everything else come after. When the screens workspace stops, this workspace takes over its board work in the same order: sales, onboarding, performance, then project.
    **Corrected the same day:** the client uses performance reviews through the suites, not a performance board. So the boards needed for this release are three: sales, onboarding and project; the performance board is not needed. Item 3 becomes: the performance reviews suite, as the prototype shows it, working end to end, built on evaluation check-ins and judging if the prototype's suite uses them. Item 2, leave and finance requests, is in the suites too, including over WhatsApp. The screens takeover order is sales, onboarding, then project.
82. **WhatsApp for the first client** (decided 2 October, from `docs/whatsapp-end-to-end.md`). The first client starts on Groundwork's own number, so the issues of an organisation's own number wait.
    1. **Approvals:** when a leave, hours or spending request is made, the approver is told on WhatsApp and in the app. The approver can approve or decline by replying on WhatsApp, said back and confirmed before anything happens. The person is told the decision.
    2. **A request during a check-in:** when a message during an open check-in looks like a leave, hours or spending request, Groundwork asks once, "Shall I treat this as a leave request?" (or spending, or hours). A simple word switches from a check-in to Ask Groundwork, and the opening notice says it.
    3. **Announcing:** on Groundwork's own number, the first session is announced on WhatsApp, with WhatsApp reminders and nudges, using approved templates. The wording of every template the product needs is written in plain words, within WhatsApp's limits, in `docs/whatsapp-templates.md`, for Hafsah to submit.
    4. **Never silence:** when WhatsApp is held by the add-on or the monthly limit, the person is told plainly, never left in silence (this answers item 71).
    5. **The opening notice** never says words are "released with everybody else's" on a one-to-one check-in.
    6. **Leave, hours and spending** work for people matched to their sign-in by email, not only linked ones.
    7. **Ask Groundwork on WhatsApp** never answers from a check-in kept in the app.
    8. **The roster import** tidies numbers the same way (`tidyANumberFor`).
    9. **The lead's daily summary on WhatsApp.** The lead receives a daily summary of their check-ins' boards on WhatsApp: plain sentences, only what the lead can see in the app, nothing from a check-in kept in the app, and a link to the full board. It is Groundwork's one message of the day for that lead (decision 13), so it carries anything else waiting for them that day, such as approvals or reminders, rather than sending separate messages. The lead chooses the time (default: morning in their own time zone) and can reply "not now" or stop it. Its template is in `docs/whatsapp-templates.md`.
    `docs/whatsapp-end-to-end.md` also says plainly the exact name of every server setting WhatsApp needs, what each holds, and where it is found in Meta's tools, never a value.
83. **WhatsApp templates and how often Groundwork writes first** (decided 2 October, alongside decision 13). Hafsah's eight templates go into `docs/whatsapp-templates.md` word for word and are wired up: `checkin_open`, `checkin_due_tomorrow`, `checkin_opens_soon`, `checkin_closes_soon`, `checkin_overdue`, `checkin_team_almost_in`, `checkin_your_view_matters` and `lead_daily_summary`. The rules:
    1. **Up to two messages on the day a check-in opens or closes, and at most one on every other day**, for each person.
    2. **"Not now" and "stop" always work.**
    3. **Nothing about a check-in kept in the app.**
    4. **Counts like "3 of 5" leave out anyone not yet let in** (decision 77).
    5. `checkin_overdue` is sent only while the check-in really is still open; if late answers are not accepted, Hafsah is told and wording is proposed.
    6. `checkin_team_almost_in` only when at least half the people have checked in; `checkin_your_view_matters` when fewer than half have; the report's contents are never sent to somebody who has not answered.
    7. `lead_daily_summary`'s second blank is one paragraph with no line breaks.
    Every template is checked against WhatsApp's rules (length, no line break inside a blank, the utility category), and any that would be refused is said.
