# Existing users check

## E1 on realistic old data

Run on 8 October 2026 by the screens workspace's reviewer, journey E1 in `docs/user-journey-tests.md` ("After the release"), on the sweep test bed, copy b (`gw_sweep_b`, API 3202, mail catcher 1081, client 5174), with Riverbank Trading (`existingOrg`). Seven of its check-ins carry real-shaped old data put in by `api/journey/sweep/put-the-old-shape-in.ts` (Okr alignment, Renewal push, Group revenue 2027, Fola joining the ward team, Luis, performance, Night rota, the F2s, The Fleet Street lease). Five are stalled (Where next, parts 1 to 5). The running 3000 and 5173 and `groundwork_dev` were not touched.

"Before" is the live client read with `git show mine/wip/live-staging:<path>`. Running live's client against the bed was not possible here (the kit's safety rule blocks exporting that branch), so each page's old content was compared in its code. Today, the Company page and the suites are new and had no live page.

### Works when

| Works when | Result | Why |
| --- | --- | --- |
| Scheduled check-ins carry on unchanged | FAIL | Reminders, "Your next check-in is open" and the lead's digests carried on over eight moved days, and no WhatsApp was sent (Riverbank has no add-on). But on the first day `autoCloseStaleCheckIns` closed sessions open since July on five old check-ins and counted them as check-ins: a false "Everyone has checked in for session 2" mail, a report written from nothing, and a weekly letter saying "two of three people checked in" when nobody did (B-061). |
| Old check-ins show on the new boards and reports with nothing lost | FAIL | No information is lost. Every target, document, blocker, delivery and commitment in the old data appears on a board, report, Context card or the person's own page, and all but 14 of 100 old answers appear word for word, the rest in other words. The lead's note about Dov on Renewal push ("Dov has been carrying on-call solo since March.") is on no page, but live hid it too, with the same filter. What fails is how it reads: "Session 20 of 8" (B-057), names made from addresses (B-058), "said described" (B-059, worse than live), the old engine's raw wording (B-060), a quote given to the wrong person (B-063) and "went back a session" (B-064). |
| Stalled check-ins send no messages | PASS | Over nine moved days (one day, then seven), no mail and no WhatsApp mentioned any of "Where next, parts 1 to 5" or went to anybody because of them. The lead's digest lists only the check-ins that are running. |
| The Company page, suites and Ask work for them | FAIL | The Company page opens and says "12 people work here, and there were no check-ins this week." (true; the company picture job had not run). Suites open for the admin (leave on), and the member's own requests page and leave form open. Ask fails on their own old check-ins: it says it has nothing from Dov about the group target when the board quotes him, and cannot answer "What is my target?" or "What is holding up Renewal push?" (B-062). |
| Nothing is worse than before | FAIL | Worse than live: "Session 20 of 8." where live showed "Session 8 of 8" (B-057), and "Ines Barros said described success" where live showed "Ines Barros: Described success" (B-059). The false mails (B-061) come from the server. |

Privacy held. Mira (admin) does not see Luis, performance, Fola joining the ward team or the support plans (Ines runs them). Dov's board was closed until he answers, as on live. Participants see no "Only you" coaching, "What to ask each person" or a lead's private note. People is refused to a member ("Only an admin can open People."). No page at 390 scrolls sideways. The only console errors are the known 404s for suites that are off (B-002).

### Each role and page checked

| Page | Mira Costa (admin, and the lead of four old check-ins) | Ines Barros (lead of three old check-ins) | Dov Ellison (member) | fo4 (member, no name) |
| --- | --- | --- | --- | --- |
| Today | 1440, 390 | 1440 | 1440, 390 | 1440, 390 |
| Check-ins list | 1440, 390 | 1440 | 1440, 390 | 1440, 390 |
| Board, each old check-in | Renewal push, Okr alignment, Group revenue 2027, The Fleet Street lease (1440); Renewal push (390) | Fola, Luis, Night rota (1440) | Renewal push, Okr alignment, Group revenue 2027 (1440); Group revenue 2027 (390) | Fola (1440) |
| Reports, every session | Renewal push 1 to 4, Okr alignment 1, Group revenue 2027 1 and 2, The Fleet Street lease 1, and the Report tab of each (1440); Renewal push 4 (390) | Fola 1, Luis 1, Night rota 1 (1440) | Renewal push 1, Okr alignment 1, Group revenue 2027 1 (1440, and 390 for Group revenue) | Fola 1 (1440, 390) |
| My work and own record | all four (1440) | all three (1440) | Record tab of all three (1440); Group revenue 2027 (390) | Fola (1440) |
| People and setup | all four (1440); Renewal push (390) | all three (1440) | all three (1440) | |
| Context and resources | all four, with every person card opened on Renewal push (1440, 390) | all three (1440) | all three (1440) | Fola (1440) |
| People | 1440, 390 | | refused, correctly (1440) | |
| Company page | 1440, 390 | | 1440, 390 | |
| Suites | Suites settings, leave board, queue, own requests, spend, time sheets, reviews, onboarding (1440); Suites settings (390) | | own requests and the leave form (1440, 390) | |
| You | 1440, 390 | 1440 | 1440, 390 | 1440, 390 |
| Ask | three questions (API) | | two questions (API) | |
| Email | the lead's digest, weekly letter and "have not started" mail | the same | "Two of your reports are ready to read" | "Fola joining the ward team - session 2 is complete" |

### How the bed was run

- `api/journey/sweep/reset.sh b`, then `SWEEP=b api/journey/sweep/bed.sh up`. The mail catcher needs the Python library `aiosmtpd`, which no Python on this Mac has. A stand-in using the standard library's `smtpd` was put on `PYTHONPATH` from the scratchpad, so nothing in the repository changed.
- The client proxy always presents the origin `http://localhost:5173` (`client/vite.config.ts`), and copy b's API only allows 5174, so every call through a copy b client failed with "Origin http://localhost:5173 not allowed by CORS". The client was started with a temporary config beside it that only changed that origin to 5174, and the file was removed afterwards. The README should say this, or the bed should allow both.
- Clock: `clock advance 1d --fast`, then `clock advance 7d --fast`. All 4,818 jobs ran with no failure.
