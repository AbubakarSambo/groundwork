# The final evaluation

Hafsah's brief, as she wrote it, then how it is run.

## The brief

The final evaluation, run on `wip/release`'s code, changing no code while it runs. Real model calls, complete sessions only, never half conversations or half sessions. For every person, one month: four weekly check-ins, with the time moved forward properly between them, and the lead's and admin's experience alongside.

**Test 1: lazy staff.** At least six different lazy profiles across different roles and kinds of check-in (sales, project, onboarding): the one who avoids specifics; the busy talker with no output; the over-promiser who never delivers; the quiet coaster; the excuse-maker who blames others; the one who disengaged after a setback. Each is realistically lazy: they do not suddenly become perfect, but they can respond to good questions and coaching the way a real person might. For each: did Groundwork make them better over the month (more specific, commitments kept, proof given)? If not, did it fairly surface what would put them on a performance plan or towards exit, with evidence, through the right process (the person sees the facts first and can answer, no labels on people, the manager decides)?

**Test 2: busy managers with blind spots.** At least six: the firefighter who is never available; the one who avoids bad news; the one who favours a star; the one who keeps changing direction; the one who never acts on problems the team raises; the new manager out of their depth. Each runs a team of four to six for a month. For each: did Groundwork keep the team moving in the right direction while the manager was too busy? Did it surface clearly where the manager had to step in? Did it coach the manager, not only the team? Was the daily nudge useful and short?

**Test 3: admin, finance and HR.** In the Client and Big organisations over a month, with the suites on and real-looking leave, spending and timesheets. How well does Groundwork help with: planning spending against budgets; seeing who is on leave and what happens during that window (commitments at risk, cover, things waiting); spotting spending that is not leading to outcomes; comparing time allocated to a project with what is actually spent and logged; making approvals easy. Separate what works today from what is missing, and add the missing pieces to `docs/roadmap.md`.

**For every person and month**, one readable file per profile here: the full conversation of every session, word for word; every report and board as each reader sees it (the person, the lead, a colleague, the admin); every email and WhatsApp message they received; and a score from 1 to 5, with two or three sentences of reasons, for: conversation quality; whether the person improved; fairness and evidence; usefulness to the lead; privacy; plain, human wording.

**Then `summary.md`**: a table of every profile and its scores, what Groundwork does well, where it fails, the ten most important problems (with the file and session where each shows), and which are bugs to fix before release and which are roadmap items. Nothing is fixed until Hafsah has read the summary.

One profile at a time, one helper at a time.

## How it is run

- **Code:** `wip/release` at `c8dba61bd`, built clean into `api/dist` after the control run's edit was undone. No product code is changed while it runs. The scripts that drive the people live in `api/journey/final-evaluation/` and are test tools only.
- **Where:** the test bed, copy a (`api/journey/sweep/bed.sh`): local database, mail to the local catcher, WhatsApp to the local recorder, the clock moved through the bed's own clock control so the scheduled jobs (reminders, nudges, reports, boards) run as they would.
- **The people:** each person's replies are written by a model playing that person from their profile, reading what Groundwork actually asked. They are not scripted lines, so they can answer a good question better than a poor one. Their ground truth (what they really did that week) is written down first, so the reads can be judged against it.
- **Complete sessions only:** a session that stops part-way is thrown away and run again from its start; it is never reported as a result.
- **Judging:** by reading what each person was actually served, as the person, the lead, a colleague and the admin.
