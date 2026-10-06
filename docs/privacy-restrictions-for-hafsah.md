# Privacy restrictions that came from Claude, for Hafsah's yes or no

**Answered by Hafsah on 5 October: decision 93 in `docs/decisions-merged.md`.** Removed: 2, 4, 8, 9, 10, 15, 16, 20, 21, 25. Removed for admins only: 1, 14, 17. Kept: 3, 5, 6, 7, 11, 12, 13, 18, 19, 22, 24. 23 kept, except for admins with access to that check-in.

Decision 86 (3 October 2026): no privacy restriction may stay unless it comes from Hafsah's own words or the prototype. These are the restrictions the product applies today that came from a choice by Claude. **The answers of decision 93 are built (5 October):** the commit for each row is in its last cell, and what each reader now reads is in `docs/answers-from-engine.md` under "Decision 93: privacy restrictions removed".

"Confirmed in bulk" means it was one of the items in a list Hafsah said yes to as a whole (decision 53's 29 items, or decision 75's 49 items). "Never confirmed" means she was never asked.

| # | What it holds back | From whom | Origin |
| --- | --- | --- | --- |
| 1 | In "where am I needed", the name of the person waiting; they read "somebody in <check-in>" | Anyone waited on who does not run that check-in, admins included, where people are not named to each other | Never confirmed **Removed for admins only, built in `1b7ec142`.** |
| 2 | Waits that Groundwork raised after 14 days | Everyone except whoever runs that check-in, admins included | Never confirmed **Removed, built in `be3aaa7c`.** |
| 3 | A colleague's leave or absence dates | A guest from another organisation | Confirmed in bulk (75, item 28) **Kept (decision 93).** |
| 4 | The "waiting to be let in" line | Participants | Never confirmed **Removed, built in `7ac70b6d`.** |
| 5 | Every report, board and name | Someone held for a seat, until an admin lets them in | Confirmed in bulk (53, items 2 and 5) **Kept (decision 93).** |
| 6 | A colleague's target number, even when that colleague said it aloud | Colleagues, where each sees only their own target | Confirmed in bulk (53, item 26); the basic rule is yours (decision 50) **Kept (decision 93).** |
| 7 | A sentence in the lead's note to everyone that gives a colleague's hidden target | Participants | Confirmed in bulk (53, item 1) **Kept (decision 93).** |
| 8 | The full contribution and coverage reads | Admins who only read | Confirmed in bulk (75, item 1) **Removed, built in `b306b3c1`.** |
| 9 | "What has stayed the same for three check-ins", "each person today" and "what to ask each person" | Admins who only read | Never confirmed **Removed, built in `d6f757ac`.** |
| 10 | "Help nobody mentioned" | Admins who only read | Never confirmed **Removed, built in `0c79bc50`.** |
| 11 | The team summary on the check-ins list | Participants where people are not named to each other | Confirmed in bulk (75, item 12) **Kept (decision 93).** |
| 12 | What the lead weighs at the close | Admins reading along, and colleagues | Confirmed in bulk (53, item 22) **Kept (decision 93).** |
| 13 | Who has shown their report | Groundwork staff who are not admins of that organisation | Confirmed in bulk (53, item 8) **Kept (decision 93).** |
| 14 | Any forecast and "Where this is heading" on an evaluation check-in; "Where this is heading" anywhere | Everyone on evaluation check-ins; admins who only read | Confirmed in bulk (75, items 26 and 48) **Removed for admins only, built in `d275f32e`.** |
| 15 | The manager's words in a review (the prototype shows where they differ) | The person reviewed | Never confirmed **Removed, built in `d3cb0617`.** |
| 16 | "Groundwork suggests recognising" (the prototype shows it to an admin) | Admins, and leads who do not write the review | Never confirmed **Removed, built in `bc93343f`.** |
| 17 | Groundwork's suggestion about the person on a review | Admins, and leads who do not write it | Never confirmed **Removed for admins only, built in `213c3823`.** |
| 18 | Anything about a review on WhatsApp beyond "it is waiting" | The person reviewed | Never confirmed **Kept (decision 93).** |
| 19 | A review Groundwork only proposed | The person it is about | Never confirmed **Kept (decision 93).** |
| 20 | The check-in's name in "After a check-in about Kwame is decided." (the prototype says "After his 90 days are decided.") | Admins and leads outside that check-in | Never confirmed **Removed, built in `d9afa995`.** |
| 21 | What each client agreed, on the time-sheets board | Leads who approve hours | Never confirmed **Removed, built in `916ba66a`.** |
| 22 | Whose requests make up the team's waiting spending total | The person asking | Never confirmed **Kept (decision 93).** |
| 23 | Every performance plan, promotion, renewal and probation check-in, on the Company page | Everyone, admins included | Never put to you on its own **Kept, except for admins with access to that check-in, built in `d5ab03cd`.** |
| 24 | A goal the lead has not told a person about is hidden from that person's colleagues, even where everybody sees everybody's targets | Colleagues | Claude's choice, never confirmed **Kept (decision 93).** |
| 25 | Other people's approved leave, when somebody asks Ask Groundwork "Who is off next week?" (they read only their own, and "I can only tell you about other people's leave if you are an admin or a lead."). The leave say-back does tell the person who else in their team is off then. | Members and guests | Claude's choice, following the leave board's own rule; never confirmed **Removed, built in `11f6fa05`.** |

Still in the code, and already reversed by decision 86 (being removed now): only the lead sees every person's target share; the forecast, headline and status words are withheld from an admin who only reads; the recognise suggestion shows the writer no number.

The sweep also removed many rows because they turned out to be your own decisions or the prototype's, for example the participant's narrower board (the prototype's B5), a goal not yet told (decisions 48 and 56), and who sees a blocker's whole chain (decision 75, item 5).
