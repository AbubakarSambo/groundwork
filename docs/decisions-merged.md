<!--
This is docs/decisions.md with Hafsah's missing decisions added.
docs/decisions.md is a protected file, so this is written alongside it for Hafsah to put in place.
Decisions 1 to 16 are exactly as they are in docs/decisions.md, unchanged. Decisions 17 to 37 are added.
Her own list's items 1 to 16 are all already in 1 to 16 here (her 1 is here as 1 and 2; her 3 and 4 are here as 4).
-->
# Decisions already made

These are settled. Do not change them. If one seems to block the work, stop and ask Hafsah.

1. **The prototype is the gold standard.** The current product is brought up to it, without losing anything valuable it already does.
2. **Plain words everywhere.** Full sentences that people with basic English understand. No clipped or "Yoda-like" phrasing, no jargon. Explain with context and examples that explain themselves.
3. **Nobody is special because of their title.** Access comes from a person's role in the organisation plus their access to each check-in.
4. **What people say in check-ins can be shown word for word** to the people in that check-in. There is no "Share my words" switch. Still private: questions to Ask Groundwork, each person's own report, a lead's private notes, and each person's load across check-ins unless they share it.
5. **Admins** see every board and report, including what people said in them. They never see anyone's questions to Ask Groundwork, anyone's own report, or a lead's private notes, and never a performance plan unless given access to that check-in.
6. **A verdict, told like a signal.** The engine may reach a verdict (keep, reward, support, plan, exit). People never see it as a label. The manager sees a suggestion, with why, what would change it, and the person's own answer, and decides, giving a reason. The person sees the facts and the decision with its reasons, and can add their side or appeal. An admin decides appeals. Good suggestions work the same way.
7. **Reports and boards update only when something new comes in:** a check-in, a document, a number from another system, or a decision. Opening them never rebuilds them. Both are built from the record; the board also shows the latest report's story, so nothing is lost between reports.
8. **Patterns show only after three periods,** whether or not they are in a row.
9. **Getting set up is kept apart from work.** Onboarding problems never count against a new person.
10. **Hours on time sheets are for billing only,** never evidence about how well someone works.
11. **No scores and no ranking** of people, teams or counties. Differences always come with a reason.
12. **Requests are said back and confirmed before anything happens.** Claims about work are checked like a check-in answer: systems first, then proof, and until then they are the person's word, followed up in the next check-in.
13. **The engine pushes, but never decides.** It tells the person first. It can be told "not now". It writes first on its own at most once a day.
14. **Team chat is a connection, not a suite and not a new chat app.** Groundwork joins the chat a team already uses. Nothing private is posted in a group.
15. **Citizens or service users are never asked anything.** Their experience reaches Groundwork through the people doing the work and through the service's own numbers.
16. **The suites are furniture.** The comparison of accounts, and what the proof says, always come first on screen.
17. **In evaluation check-ins, colleagues who give views are not named to the person being reviewed.** This covers a performance plan, a promotion and a renewal. With one such colleague, they are "a colleague". With two or more, they are "one colleague", "another colleague" and "a third colleague". A later mention of the same person makes clear it is the same person, for example "the same colleague". Never a job title or detail that would give them away.
18. **People's own words are never changed to improve a score.** Only what Groundwork itself writes gets fixed.
19. **Pattern names.** The internal names stay as they are. Each of the 49 patterns gets a plain name for screens, written in `docs/pattern-names.md` for Hafsah to approve.
20. **The 50 scenario packs.** They are copied into files. Improved versions are written, switched off, with a before-and-after document. Hafsah switches them on after reading.
21. **The free trial.**
    - Teams of fewer than 20 people get 3 months free. Teams of 20 or more pay. There are no free check-ins.
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
27. **Who sees colleagues.** A member sees colleagues' names, roles and teams. A guest from another organisation sees only the people in their own check-in. Nobody sees anything more.
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
48. **A goal the lead has not told the person about stays hidden from that person, and it does not count** (decided 29 September). It is not used in that person's report, or in any judgement about them, until the lead shares it.
49. **Week 10, the first suggestion to a manager: not decided yet.** Hafsah's answer to this item was left as a placeholder on 29 September, so week 10 stays held until she fills it in.
