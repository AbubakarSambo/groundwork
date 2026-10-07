# The user journey test bed

This is what the journeys in `docs/user-journey-tests.md` run on. It makes the five test organisations
and Groundwork staff on a local database, starts the API with mail going to a local catcher and WhatsApp
going to a local recorder, and gives you the helpers to write as a person on WhatsApp, read their mail,
move the clock and read the API's warnings.

Everything here is a test value, on this computer. No live key is read, nothing is sent to anybody, and
no `.env` file is changed. There are two copies, so two testers can work at once without sharing anything:

| | Copy a | Copy b |
| --- | --- | --- |
| Database | `gw_sweep_a` | `gw_sweep_b` |
| API | port 3201 | port 3202 |
| Mail catcher (SMTP, then web) | 1025, 1080 | 1026, 1081 |
| WhatsApp recorder | 3996 | 3997 |
| Clock control | 3301 | 3302 |
| Browser app (to start yourself) | 5173 | 5174 |

Pick your copy with `SWEEP=a` or `SWEEP=b` in front of every command (a is the default). All commands
below are run from the repository root.

## 1. Make the five organisations

```
api/journey/sweep/reset.sh a
```

This makes `gw_sweep_a` if it is not there, applies every migration, and seeds the five organisations. If
`gw_sweep_a` already holds organisations it is not deleted: it is renamed to `gw_sweep_old_a_<date and
time>` and a new one is made, so a run that went wrong can still be looked at. Stop the copy's API first
(`bed.sh down`), because a database that is in use cannot be renamed. Remove the old ones yourself when
you no longer need them.

The sign-ins and numbers are in `api/journey/sweep/the-five-orgs.json`. Read it, do not guess. The
password for everybody is in it too (a test password). The same file, with the database ids, is written
for each copy as `the-five-orgs.a.json` and `the-five-orgs.b.json` (these two are not committed).

| In the file | What it is |
| --- | --- |
| `staff` | Groundwork staff. `ama.staff@groundwork.test` is a platform admin with a back-office pass. `ops.admin@groundwork.test` is an admin who is not staff, who must be refused. |
| `newOrg` | Fieldnote Studio: brand new, one admin, on the one-month trial, nothing set up. |
| `clientOrg` | Msingi Foods: fifteen people; Sales team, Q4 (weekly), Imani Hassan's first ninety days, and the new stock system project; leave, spending (limit 100,000 shillings), timesheets and reviews on; WhatsApp on; three people with no number. |
| `bigOrg` | Baobab Distribution: a hundred people in nine teams, thirty-six check-ins, and dozens of leave and spending requests waiting on each of several approvers. |
| `existingOrg` | Riverbank Trading: the shape of an existing client, fifteen check-ins made before the rebuild, five stalled, some people with no name and some with no number. All names and addresses are made up. |
| `secondOrg` | Lakeview Clinic: shares Neema Kamau with Client org (one sign-in, one number, two organisations). |

Every check-in has a `notes` line saying what state it is in on purpose. Every date in the data is counted
from the day the copy was made.

## 2. Start it

```
SWEEP=a api/journey/sweep/bed.sh up
```

This starts the mail catcher, the WhatsApp recorder and the API (from `api/dist`, so run `cd api && npx
nest build` first after any code change). It prints what is running. Run it again and it only starts what
is not running. `SWEEP=a api/journey/sweep/bed.sh status` shows it, and `... down` stops it. The database
is left as it is. `down --api-only` stops only the API and keeps the mail and WhatsApp records.

The API is started with test values for WhatsApp (see `the-test-bed.ts`), with `EMAIL_SENDS_FOR_REAL=false`,
and with `WHATSAPP_GRAPH_BASE_URL` pointing at the recorder, so nothing can reach a person. Its output goes
to `api/journey/sweep/logs/gw_sweep_a.log`.

To look at it in a browser, start the app against your copy's API, from `client/`:

```
VITE_PROXY_TARGET=http://127.0.0.1:3201 npm run dev -- --port 5173      # copy b: 3202 and 5174
```

Links in the emails point at that port, so a link in a mail opens your copy.

## 3. The helpers

`bed.sh` runs the commands below. The same functions are in `bed-lib.ts` for a Playwright test to import.

**Write on WhatsApp as a person.** Signed with the test app secret exactly as Meta signs. The webhook
answers at once and the work goes on after it, so this then waits for what comes back (the first message
to that number, then three quiet seconds, up to a minute) and prints it.

```
SWEEP=a api/journey/sweep/bed.sh whatsapp send +254700100006 "Hi, I want to do my check-in"
SWEEP=a api/journey/sweep/bed.sh whatsapp send +254700100006 --image photo.png --caption "The depot"
SWEEP=a api/journey/sweep/bed.sh whatsapp send +254700100006 "ok" --reply-to wamid.out.3
SWEEP=a api/journey/sweep/bed.sh whatsapp send +254700100006 "ok" --bad-signature     # must be refused
```

Add `--no-wait` to send without waiting. Any way of writing the number works, because the person is
matched the way the product matches them.

**Read what Groundwork sent a number.** `whatsapp mark` gives a position, and `whatsapp sent <number>
--since <position>` lists what was sent after it. A template message is shown as its filled-in words.

```
SWEEP=a api/journey/sweep/bed.sh whatsapp mark
SWEEP=a api/journey/sweep/bed.sh whatsapp sent +254700100006 --since 12
```

**Read mail.** Everything the API sends goes to your copy's catcher, which keeps it.

```
SWEEP=a api/journey/sweep/bed.sh mail grace@msingi.test            # newest first, with the words
SWEEP=a api/journey/sweep/bed.sh mail grace@msingi.test --links    # without the words
SWEEP=a api/journey/sweep/bed.sh mail link grace@msingi.test --match verify-email
SWEEP=a api/journey/sweep/bed.sh mail clear
```

You can also look at the catcher's page in a browser: `http://127.0.0.1:1080` (copy b: 1081).

**Move the clock.** The scheduled jobs run the way the scheduler runs them: the same methods, found the
same way, called on the live API, and in each job's own time zone. This is not calling inner code. The
API's own `new Date()` is the moved time, so everything the jobs and the services read is moved with it.

```
SWEEP=a api/journey/sweep/bed.sh clock                        # what time the API thinks it is
SWEEP=a api/journey/sweep/bed.sh clock advance 1d --fast      # move on a day, run every job that falls in it, in time order
SWEEP=a api/journey/sweep/bed.sh clock advance 3h
SWEEP=a api/journey/sweep/bed.sh clock advance --to 2026-10-14T06:00:00Z
SWEEP=a api/journey/sweep/bed.sh clock jobs                   # every scheduled job and its time
SWEEP=a api/journey/sweep/bed.sh clock run GroundsCron.sendReminders     # one job, now
SWEEP=a api/journey/sweep/bed.sh clock set --by 2d            # move the clock only; no job runs
SWEEP=a api/journey/sweep/bed.sh clock set --reset            # back to the real time
```

Things to know:

- **The scheduler's own timers are held.** A job runs only when you say so (`advance` or `run`). If it also
  ran on real time, against a moved clock, jobs would fire at the wrong moments. `up --real-scheduler`
  turns them back on.
- **A day takes seconds with `--fast`, and many minutes without it.** The jobs `--fast` leaves out
  (`PatternsCron.sweep`, `ReportsService.*`, `GroundsCron.synthesisBackstop`, the company picture and role
  gap notes, and the minute-by-minute webhook delivery) write patterns and reports with the model for every
  check-in in every organisation, which is minutes each, and tens of minutes on the Big org. Leave `--fast`
  off when the journey is about those, and use `--only <pattern>` to run just one of them, for example
  `clock advance 1d --only PatternsCron`. `--skip <pattern>` leaves a job out, and `--only` and `--skip` can
  be repeated. `AnthropicService.probeTheEngine` (asks the model if it is up, every five minutes) is never
  run unless named.
- **The clock only moves forward with `advance`.** `clock set --to` can put it anywhere. The moved time is
  kept in a file, so restarting the API does not put the clock back, which would leave the database ahead
  of the API. `clock set --reset` does.
- **A job that has run for a day does not run again that day.** Many jobs are written to run once a day
  (`onceAcrossCopies`). Moving the clock back to a day that already ran and advancing again sends nothing
  new. That is the product, not the test bed.
- **Dates the database makes itself** (`now()` inside a query) are not moved. Nearly everything is.
- **Google sees the real time.** The model is reached with a signed token that Google checks against its
  own clock. The library that signs it is given the real time, and nothing else is.
- An advance takes a while and is asked how it is getting on every second or so, printing progress to the
  screen. The API keeps running it if you stop the command; `GET http://127.0.0.1:3301/advance` shows it.

**Read the API's warnings.** Mark the log, do the journey, list what was logged at warn or error level.

```
SWEEP=a api/journey/sweep/bed.sh log mark
... do the journey ...
SWEEP=a api/journey/sweep/bed.sh log warnings
```

It lists every line at warn or error level since the mark, with the process's own warnings and crashes.
The expected `[DEV EMAIL]` lines (one for every mail, because mail goes to the catcher and not out) are
counted and not listed, so they do not bury the rest; `--all` lists them. The whole log is the file
`api/journey/sweep/logs/gw_sweep_a.log`, and `--since <position>` starts from an earlier position.
The log is also very large, because the database client prints every query; search it, do not read it.
The browser's console is not here: read that from Playwright.

## 4. What is not covered

- WhatsApp for an organisation's own number (`/webhooks/whatsapp/<organisation id>`) can be written to
  (`--org <id>`), but no organisation is given its own connection, so it starts as "not connected".
- Stripe is whatever `api/.env` holds (test keys). No organisation has a Stripe customer, so the Plan and
  billing page's card steps (A5) start from nothing for the paid ones.
- The back office WhatsApp page (A7) saves its secrets sealed, which needs `SETTINGS_ENCRYPTION_KEY` in
  `api/.env`. The test bed gives the API the test values straight from its settings instead, so the
  messages work either way.
